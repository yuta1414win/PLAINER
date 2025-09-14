import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as IOServer, type Socket } from 'socket.io';

type Role = 'owner' | 'editor' | 'viewer';

type RoomUser = {
  id: string;
  name: string;
  color: string;
  isOnline: boolean;
  lastSeen: Date;
  role?: Role;
};

type RoomState = {
  id: string;
  users: Map<string, RoomUser>;
  socketsByUser: Map<string, Set<string>>;
  chat: any[];
  locks: Map<string, { resourceId: string; ownerId: string; ownerName?: string; acquiredAt: Date }>;
};

const rooms: Map<string, RoomState> = new Map();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      users: new Map(),
      socketsByUser: new Map(),
      chat: [],
      locks: new Map(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

function toPlainUsersMap(users: Map<string, RoomUser>) {
  const out: Record<string, RoomUser> = {} as any;
  users.forEach((u, id) => (out[id] = u));
  return out;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // @ts-expect-error attach io to server once
  if (!res.socket.server.io) {
    // @ts-expect-error Node server instance
    const httpServer = res.socket.server;
    const io = new IOServer(httpServer, {
      // default path '/socket.io'
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    // @ts-expect-error store io
    res.socket.server.io = io;

    io.on('connection', (socket: Socket) => {
      let currentRoomId: string | null = null;
      let currentUserId: string | null = null;
      let currentUserName: string | null = null;

      const emitRoomState = (room: RoomState) => {
        io.to(room.id).emit('room_state', {
          id: room.id,
          name: room.id,
          users: toPlainUsersMap(room.users),
          lastActivity: new Date(),
        });
        io.to(room.id).emit('presence_updated', Array.from(room.users.values()));
      };

      socket.on('join_room', ({ roomId, user, password, inviteToken }) => {
        currentRoomId = roomId;
        currentUserId = user.id;
        currentUserName = user.name;
        const room = getOrCreateRoom(roomId);
        socket.join(roomId);
        const isFirst = room.users.size === 0;
        const role: Role = isFirst ? 'owner' : 'editor';
        const joined: RoomUser = {
          id: user.id,
          name: user.name,
          color: user.color,
          isOnline: true,
          lastSeen: new Date(),
          role,
        };
        room.users.set(user.id, joined);
        const s = room.socketsByUser.get(user.id) || new Set();
        s.add(socket.id);
        room.socketsByUser.set(user.id, s);
        // initial presence
        io.to(roomId).emit('user_joined', joined);
        // send recent chat history
        socket.emit('chat_history', room.chat.slice(-200));
        // room state
        emitRoomState(room);
      });

      socket.on('leave_room', (roomId: string) => {
        const room = rooms.get(roomId);
        if (room && currentUserId) {
          const sockets = room.socketsByUser.get(currentUserId);
          sockets?.delete(socket.id);
          if (!sockets || sockets.size === 0) {
            const u = room.users.get(currentUserId);
            if (u) {
              u.isOnline = false;
              u.lastSeen = new Date();
              room.users.set(currentUserId, u);
              io.to(roomId).emit('user_left', currentUserId);
              emitRoomState(room);
            }
          }
        }
        socket.leave(roomId);
      });

      socket.on('cursor_move', ({ roomId, position }) => {
        if (!currentUserId) return;
        const room = rooms.get(roomId);
        const user = room?.users.get(currentUserId);
        if (!room || !user) return;
        const cursor = {
          userId: currentUserId,
          position,
          user,
          timestamp: new Date(),
        };
        socket.to(roomId).emit('cursor_moved', cursor);
      });

      socket.on('content_change', ({ roomId, change }) => {
        if (!currentUserId) return;
        const withMeta = {
          ...change,
          userId: currentUserId,
          timestamp: new Date(),
        };
        socket.to(roomId).emit('content_changed', withMeta);
      });

      socket.on('request_presence', (roomId: string) => {
        const room = rooms.get(roomId);
        if (room) {
          emitRoomState(room);
        }
      });

      socket.on('chat_send', ({ roomId, content }) => {
        if (!currentUserId || !currentUserName) return;
        const room = rooms.get(roomId);
        if (!room) return;
        const msg = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          roomId,
          userId: currentUserId,
          userName: currentUserName,
          userColor: room.users.get(currentUserId)?.color,
          content: String(content || ''),
          createdAt: new Date(),
          reactions: {},
        };
        room.chat.push(msg);
        io.to(roomId).emit('chat_message', msg);
      });

      socket.on('chat_reaction', ({ roomId, messageId, emoji }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        const msg = room.chat.find((m) => m.id === messageId);
        if (!msg) return;
        msg.reactions = msg.reactions || {};
        const set = new Set<string>(msg.reactions[emoji] || []);
        if (currentUserId) {
          if (set.has(currentUserId)) set.delete(currentUserId);
          else set.add(currentUserId);
          msg.reactions[emoji] = Array.from(set);
          io.to(roomId).emit('chat_reaction', { messageId, emoji, userId: currentUserId });
        }
      });

      socket.on('lock_acquire', ({ roomId, resourceId }) => {
        const room = rooms.get(roomId);
        if (!room || !currentUserId) return;
        const existing = room.locks.get(resourceId);
        if (existing && existing.ownerId !== currentUserId) {
          socket.emit('lock_denied', { resourceId, ownerId: existing.ownerId });
          return;
        }
        const lock = {
          resourceId,
          ownerId: currentUserId,
          ownerName: currentUserName || undefined,
          acquiredAt: new Date(),
        };
        room.locks.set(resourceId, lock);
        io.to(roomId).emit('lock_acquired', lock);
      });

      socket.on('lock_release', ({ roomId, resourceId }) => {
        const room = rooms.get(roomId);
        if (!room || !currentUserId) return;
        const existing = room.locks.get(resourceId);
        if (!existing || existing.ownerId !== currentUserId) return;
        room.locks.delete(resourceId);
        io.to(roomId).emit('lock_released', { resourceId });
      });

      socket.on('role_set', ({ roomId, targetUserId, role }) => {
        const room = rooms.get(roomId);
        if (!room || !currentUserId) return;
        const actor = room.users.get(currentUserId);
        if (actor?.role !== 'owner') {
          socket.emit('error', { message: 'Only owner can change roles', code: 'FORBIDDEN' });
          return;
        }
        const target = room.users.get(targetUserId);
        if (!target) return;
        target.role = role as Role;
        room.users.set(targetUserId, target);
        io.to(roomId).emit('role_changed', { userId: targetUserId, role });
        emitRoomState(room);
      });

      // Best-effort kick: disconnect all sockets of the target
      socket.on('user_kick', ({ roomId, userId }) => {
        const room = rooms.get(roomId);
        if (!room || !currentUserId) return;
        const actor = room.users.get(currentUserId);
        if (actor?.role !== 'owner') {
          socket.emit('error', { message: 'Only owner can kick users', code: 'FORBIDDEN' });
          return;
        }
        const sockets = room.socketsByUser.get(userId);
        sockets?.forEach((sid) => {
          // @ts-expect-error access server io
          const s = res.socket.server.io.sockets.sockets.get(sid);
          s?.leave(roomId);
          s?.disconnect(true);
        });
      });

      socket.on('ping', () => {
        socket.emit('pong', Date.now());
      });

      socket.on('disconnect', () => {
        if (currentRoomId && currentUserId) {
          const room = rooms.get(currentRoomId);
          if (room) {
            const sockets = room.socketsByUser.get(currentUserId);
            sockets?.delete(socket.id);
            if (!sockets || sockets.size === 0) {
              const u = room.users.get(currentUserId);
              if (u) {
                u.isOnline = false;
                u.lastSeen = new Date();
                room.users.set(currentUserId, u);
                io.to(currentRoomId).emit('user_left', currentUserId);
                emitRoomState(room);
              }
            }
          }
        }
      });
    });
  }

  res.end();
}

