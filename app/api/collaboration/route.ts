import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import type {
  User,
  Room,
  UserCursor,
  ContentChange,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  StepComment,
  ChatMessage,
  Role,
  LockInfo,
} from '@/lib/collaboration/types';
import crypto from 'crypto';
import { translateLocal } from '@/lib/ai/translator';
import { parseCookies, getSessionUserFromToken } from '@/lib/auth/jwt';

// Global socket server instance
let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
> | null = null;

// In-memory storage for rooms and users (in production, use Redis or a database)
const rooms = new Map<string, Room>();
const userSockets = new Map<string, string>(); // userId -> socketId
// In-memory comments: roomId -> stepId -> StepComment[]
const roomComments = new Map<string, Map<string, StepComment[]>>();
// In-memory chat messages: roomId -> ChatMessage[]
const roomChats = new Map<string, ChatMessage[]>();
// In-memory room locks: roomId -> resourceId -> LockInfo
const roomLocks = new Map<string, Map<string, LockInfo>>();
// In-memory invites: roomId -> token -> { role, expiresAt }
const roomInvites = new Map<string, Map<string, { role: Role; expiresAt: Date }>>();

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
function isExpired(date?: Date) {
  return !!date && date.getTime() < Date.now();
}

// Initialize Socket.IO server
function initializeSocketIO() {
  if (io) return io;

  // Create HTTP server
  const httpServer = createServer();

  // Initialize Socket.IO
  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.NEXTAUTH_URL
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Try to authenticate via cookie (JWT in 'plainer_session')
    const cookies = parseCookies(socket.handshake?.headers?.cookie as string | undefined);
    const sessionUser = getSessionUserFromToken(cookies['plainer_session']);

    // Handle room joining
    socket.on('join_room', async ({ roomId, user, password, inviteToken }) => {
      try {
        // If sessionUser exists, override client-provided identity
        const effectiveUser = sessionUser
          ? { ...user, id: sessionUser.id, name: sessionUser.name }
          : user;
        // Store socket data
        socket.data = {
          userId: effectiveUser.id,
          roomId,
          user: {
            ...effectiveUser,
            isOnline: true,
            lastSeen: new Date(),
          },
        };

        // Join the socket room
        await socket.join(roomId);

        // Get or create room
        let room = rooms.get(roomId);
        if (!room) {
          room = {
            id: roomId,
            name: `Room ${roomId}`,
            users: new Map(),
            lastActivity: new Date(),
          };
          rooms.set(roomId, room);
        }

        // If room already exists and has password protection, enforce it
        const pwdHash = (room.metadata as any)?.passwordHash as string | undefined;
        if (pwdHash) {
          let allowedByInvite = false;
          if (inviteToken) {
            const invites = roomInvites.get(roomId);
            const meta = invites?.get(inviteToken);
            if (meta && !isExpired(meta.expiresAt)) {
              allowedByInvite = true;
              // Single-use token: consume
              invites?.delete(inviteToken);
              // Assign role from invite below
              (socket.data as any)._invitedRole = meta.role;
            }
          }
          if (!allowedByInvite) {
            if (!password || sha256(password) !== pwdHash) {
              socket.emit('error', { message: 'Room is password protected' });
              return;
            }
          }
        }

        // Add user to room
        const fullUser: User = {
          ...effectiveUser,
          isOnline: true,
          lastSeen: new Date(),
        };

        // Assign role: first user becomes owner; invited role overrides default
        const invitedRole = (socket.data as any)?._invitedRole as Role | undefined;
        if (room.users.size === 0) fullUser.role = 'owner';
        else fullUser.role = invitedRole || 'editor';

        room.users.set(effectiveUser.id, fullUser);
        room.lastActivity = new Date();

        // Store user socket mapping
        userSockets.set(effectiveUser.id, socket.id);

        // Send room state to the joining user
        socket.emit('room_state', {
          ...room,
          users: Object.fromEntries(room.users) as any,
        });

        // Send recent chat history (latest 100 messages)
        const history = (roomChats.get(roomId) || []).slice(-100);
        socket.emit('chat_history', history);

        // Notify other users in the room
        socket.to(roomId).emit('user_joined', fullUser);

        // Send updated presence to all users in room
        const roomUsers = Array.from(room.users.values());
        io!.to(roomId).emit('presence_updated', roomUsers);

        console.log(`👤 User ${fullUser.name} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', {
          message: 'Failed to join room',
          code: 'JOIN_ROOM_ERROR',
        });
      }
    });

    // Handle room leaving
    socket.on('leave_room', (roomId) => {
      handleUserLeave(socket, roomId);
    });

    // Handle cursor movement
    socket.on('cursor_move', ({ roomId, position }) => {
      if (!socket.data?.user) return;

      const cursor: UserCursor = {
        userId: socket.data.user.id,
        position,
        user: socket.data.user,
        timestamp: new Date(),
      };

      // Broadcast cursor position to other users in the room
      socket.to(roomId).emit('cursor_moved', cursor);
    });

    // Handle content changes
    socket.on('content_change', ({ roomId, change }) => {
      if (!socket.data?.user) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const me = room.users.get(socket.data.user.id);
      if (!me) return;
      // Permission: only editor/owner can change content
      if (me.role === 'viewer') return;

      // Lock enforcement if elementId present
      const lockMap = roomLocks.get(roomId);
      const lock = change.elementId && lockMap?.get(change.elementId);
      if (lock && lock.ownerId !== me.id && !isExpired(lock.expiresAt)) {
        socket.emit('lock_denied', { resourceId: change.elementId!, ownerId: lock.ownerId });
        return;
      }
      const fullChange: ContentChange = {
        ...change,
        userId: socket.data.user.id,
        timestamp: new Date(),
      };

      // Broadcast content change to other users in the room
      socket.to(roomId).emit('content_changed', fullChange);

      // Update room activity
      room.lastActivity = new Date();
    });

    // --- Comments ---
    socket.on('comment_add', ({ roomId, comment }) => {
      if (!socket.data?.user) return;

      const now = new Date();
      const fullComment: StepComment = {
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        stepId: comment.stepId,
        content: comment.content,
        mentions: comment.mentions || [],
        authorId: socket.data.user.id,
        authorName: socket.data.user.name,
        resolved: false,
        createdAt: now,
        updatedAt: now,
      };
      if (comment.parentId) (fullComment as any).parentId = comment.parentId;

      if (!roomComments.has(roomId)) roomComments.set(roomId, new Map());
      const byStep = roomComments.get(roomId)!;
      if (!byStep.has(fullComment.stepId)) byStep.set(fullComment.stepId, []);
      byStep.get(fullComment.stepId)!.push(fullComment);

      io!.to(roomId).emit('comment_added', fullComment);

      const room = rooms.get(roomId);
      if (room) room.lastActivity = new Date();
    });

    // --- Chat ---
    socket.on('chat_send', ({ roomId, content }) => {
      if (!socket.data?.user) return;
      const now = new Date();
      const message: ChatMessage = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        roomId,
        userId: socket.data.user.id,
        userName: socket.data.user.name,
        userColor: socket.data.user.color,
        content: String(content || '').slice(0, 2000),
        createdAt: now,
        reactions: {},
      };
      if (!roomChats.has(roomId)) roomChats.set(roomId, []);
      const list = roomChats.get(roomId)!;
      list.push(message);
      // Trim to last 500 messages to bound memory
      if (list.length > 500) list.splice(0, list.length - 500);
      io!.to(roomId).emit('chat_message', message);

      // Simple command parser for assistant (offline deterministic)
      const text = message.content.trim();
      if (text.startsWith('/')) {
        const bot = (content: string): ChatMessage => ({
          id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          roomId,
          userId: 'bot-assistant',
          userName: 'Assistant',
          userColor: '#6C5CE7',
          content,
          createdAt: new Date(),
          reactions: {},
        });

        const help = () =>
          'コマンド一覧:\n' +
          '/help - このヘルプ\n' +
          '/tips - 編集のヒント\n' +
          "/translate to:en|ja <text> - 簡易翻訳 (ローカル辞書)\n" +
          '/hotspots - 画像からホットスポット候補の操作案内';

        let reply: string | null = null;
        if (text === '/help') {
          reply = help();
        } else if (text === '/tips') {
          reply =
            'ヒント: 画像右上の「候補を提案」を押すとボタン/入力欄の候補が追加されます。' +
            '\nアクセシビリティ: ホットスポットの最小サイズは44px四方を推奨。';
        } else if (text.startsWith('/translate')) {
          const m = text.match(/to:(ja|en)\s+(.+)/i);
          if (m) {
            const lang = (m[1]!.toLowerCase() as 'ja' | 'en');
            const src = m[2]!;
            const out = translateLocal(src, lang);
            reply = out;
          } else {
            reply = '使い方: /translate to:en こんにちは';
          }
        } else if (text === '/hotspots') {
          reply =
            'エディタのキャンバスで右上の「候補を提案」をクリックすると、画像からUI候補を検出してホットスポットを追加します。';
        }

        if (reply) {
          const botMsg = bot(reply);
          list.push(botMsg);
          if (list.length > 500) list.splice(0, list.length - 500);
          io!.to(roomId).emit('chat_message', botMsg);
        }
      }
    });

    socket.on('chat_reaction', ({ roomId, messageId, emoji }) => {
      const list = roomChats.get(roomId);
      if (!list || !socket.data?.user) return;
      const msg = list.find((m) => m.id === messageId);
      if (!msg) return;
      const e = String(emoji || '').slice(0, 8);
      if (!msg.reactions) msg.reactions = {};
      const users = new Set(msg.reactions[e] || []);
      if (users.has(socket.data.user.id)) {
        users.delete(socket.data.user.id);
      } else {
        users.add(socket.data.user.id);
      }
      msg.reactions[e] = Array.from(users);
      io!.to(roomId).emit('chat_reaction', {
        messageId,
        emoji: e,
        userId: socket.data.user.id,
      });
    });

    socket.on('comment_update', ({ roomId, comment }) => {
      if (!socket.data?.user) return;
      const byStep = roomComments.get(roomId);
      if (!byStep) return;
      const list = byStep.get(comment.stepId);
      if (!list) return;
      const idx = list.findIndex((c) => c.id === comment.id);
      if (idx === -1) return;
      const existing = list[idx]!;
      // Only author can edit for now
      if (existing.authorId !== socket.data.user.id) return;
      const updated: StepComment = {
        ...existing,
        content: comment.content,
        updatedAt: new Date(),
      };
      if (comment.mentions) (updated as any).mentions = comment.mentions;
      list[idx] = updated;
      io!.to(roomId).emit('comment_updated', updated);
    });

    socket.on('comment_delete', ({ roomId, id, stepId }) => {
      if (!socket.data?.user) return;
      const byStep = roomComments.get(roomId);
      if (!byStep) return;
      const list = byStep.get(stepId);
      if (!list) return;
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const existing = list[idx]!;
      // Only author can delete for now
      if (existing.authorId !== socket.data.user.id) return;
      list.splice(idx, 1);
      io!.to(roomId).emit('comment_deleted', { id, stepId });
    });

    socket.on('comment_resolve', ({ roomId, id, stepId, resolved }) => {
      const byStep = roomComments.get(roomId);
      if (!byStep) return;
      const list = byStep.get(stepId);
      if (!list) return;
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const updated: StepComment = { ...list[idx]!, resolved, updatedAt: new Date() } as StepComment;
      list[idx] = updated;
      io!.to(roomId).emit('comment_resolved', { id, stepId, resolved });
    });

    // Handle presence requests
    socket.on('request_presence', (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        const roomUsers = Array.from(room.users.values());
        socket.emit('presence_updated', roomUsers);
      }
    });

    // --- Locks ---
    socket.on('lock_acquire', ({ roomId, resourceId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const me = room.users.get(socket.data?.user?.id || '');
      if (!me) return;
      if (me.role === 'viewer') return; // viewers can’t lock

      if (!roomLocks.has(roomId)) roomLocks.set(roomId, new Map());
      const locks = roomLocks.get(roomId)!;
      const existing = locks.get(resourceId);
      const now = new Date();
      const ttlMs = 2 * 60 * 1000; // 2 minutes
      if (!existing || existing.ownerId === me.id || isExpired(existing.expiresAt)) {
        const lock: LockInfo = {
          resourceId,
          ownerId: me.id,
          ownerName: me.name,
          acquiredAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        };
        locks.set(resourceId, lock);
        io!.to(roomId).emit('lock_acquired', lock);
      } else {
        socket.emit('lock_denied', { resourceId, ownerId: existing.ownerId });
      }
    });

    socket.on('lock_release', ({ roomId, resourceId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const me = room.users.get(socket.data?.user?.id || '');
      if (!me) return;
      const locks = roomLocks.get(roomId);
      if (!locks) return;
      const existing = locks.get(resourceId);
      if (!existing) return;
      // Only owner or room owner can release
      if (existing.ownerId !== me.id && me.role !== 'owner') return;
      locks.delete(resourceId);
      io!.to(roomId).emit('lock_released', { resourceId });
    });

    // --- Roles ---
    socket.on('role_set', ({ roomId, targetUserId, role }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const me = room.users.get(socket.data?.user?.id || '');
      if (!me || me.role !== 'owner') return; // only owner can change roles
      const target = room.users.get(targetUserId);
      if (!target) return;
      target.role = role;
      io!.to(roomId).emit('role_changed', { userId: targetUserId, role });
      const roomUsers = Array.from(room.users.values());
      io!.to(roomId).emit('presence_updated', roomUsers);
    });

    // Handle ping for heartbeat
    socket.on('ping', (timestamp) => {
      socket.emit('pong', timestamp);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);

      if (socket.data?.roomId) {
        handleUserLeave(socket, socket.data.roomId);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Start the HTTP server on a different port for WebSocket
  const port = process.env.WS_PORT || 3001;
  httpServer.listen(port, () => {
    console.log(`🚀 WebSocket server running on port ${port}`);
  });

  return io;
}

// Handle user leaving a room
function handleUserLeave(socket: any, roomId: string) {
  if (!socket.data?.user) return;

  const { user } = socket.data;
  const room = rooms.get(roomId);

  if (room && room.users.has(user.id)) {
    // Mark user as offline
    const offlineUser = { ...user, isOnline: false, lastSeen: new Date() };
    room.users.set(user.id, offlineUser);

    // Remove user socket mapping
    userSockets.delete(user.id);

    // Leave the socket room
    socket.leave(roomId);

    // Notify other users
    socket.to(roomId).emit('user_left', user.id);

    // Send updated presence
    const roomUsers = Array.from(room.users.values());
    socket.to(roomId).emit('presence_updated', roomUsers);

    console.log(`👤 User ${user.name} left room ${roomId}`);

    // Cleanup empty rooms after a delay
    setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom) {
        const onlineUsers = Array.from(currentRoom.users.values()).filter(
          (u) => u.isOnline
        );
        if (onlineUsers.length === 0) {
          rooms.delete(roomId);
          console.log(`🧹 Cleaned up empty room ${roomId}`);
        }
      }
    }, 60000); // Clean up after 1 minute
  }
}

// Cleanup old users and rooms periodically
setInterval(() => {
  const now = new Date();
  let cleanedUsers = 0;
  let cleanedRooms = 0;

  for (const [roomId, room] of rooms.entries()) {
    // Remove users who have been offline for more than 1 hour
    for (const [userId, user] of room.users.entries()) {
      if (!user.isOnline && now.getTime() - user.lastSeen.getTime() > 3600000) {
        room.users.delete(userId);
        cleanedUsers++;
      }
    }

    // Remove rooms with no users
    if (room.users.size === 0) {
      rooms.delete(roomId);
      cleanedRooms++;
    }
  }

  if (cleanedUsers > 0 || cleanedRooms > 0) {
    console.log(
      `🧹 Cleanup: removed ${cleanedUsers} old users and ${cleanedRooms} empty rooms`
    );
  }
}, 300000); // Run every 5 minutes

// API route handlers
export async function GET(request: NextRequest) {
  try {
    // Initialize Socket.IO if not already done
    initializeSocketIO();

    // Get room information
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const comments = Array.from(
          (roomComments.get(roomId) || new Map()).entries()
        ).map(([stepId, list]) => ({ stepId, comments: list }));
        return Response.json({
          room: {
            ...room,
            users: Array.from(room.users.values()),
          },
          comments,
        });
      } else {
        return Response.json({ error: 'Room not found' }, { status: 404 });
      }
    }

    // Return all rooms
    const allRooms = Array.from(rooms.values()).map((room) => ({
      ...room,
      users: Array.from(room.users.values()),
      userCount: room.users.size,
    }));

    return Response.json({ rooms: allRooms });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomId, userId, data } = body;

    // Initialize Socket.IO if not already done
    if (!io) {
      initializeSocketIO();
    }

    // Resolve session user from cookie
    const cookieHeader = request.headers.get('cookie') || undefined;
    const session = getSessionUserFromToken(parseCookies(cookieHeader)['plainer_session']);

    // Optional signed action headers
    const sig = request.headers.get('x-action-signature') || '';
    const ts = request.headers.get('x-action-timestamp') || '';
    const requireSig = String(process.env.ENFORCE_ACTION_SIGNATURE || '').toLowerCase() === 'true';

    const verifySignature = (): boolean => {
      try {
        if (!sig || !ts) return false;
        const tsNum = Number(ts);
        if (!Number.isFinite(tsNum)) return false;
        if (Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) return false; // 5 min skew
        const secret = process.env.ACTION_SECRET || '';
        if (!secret) return false;
        const h = crypto.createHmac('sha256', secret).update(`${action}:${roomId}:${ts}`).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(h));
      } catch {
        return false;
      }
    };

    // Helper: require authenticated owner for a room
    const requireOwner = (rid: string): { ok: true; room: Room } | { ok: false; res: Response } => {
      if (!session) return { ok: false, res: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
      const room = rooms.get(rid);
      if (!room) return { ok: false, res: Response.json({ error: 'Room not found' }, { status: 404 }) };
      const me = room.users.get(session.id);
      if (!me || me.role !== 'owner')
        return { ok: false, res: Response.json({ error: 'Forbidden' }, { status: 403 }) };
      return { ok: true, room };
    };

    switch (action) {
      case 'create_room':
        const newRoom: Room = {
          id: roomId || `room_${Date.now()}`,
          name: data?.name || `Room ${roomId}`,
          users: new Map(),
          lastActivity: new Date(),
          metadata: data?.metadata,
        };
        rooms.set(newRoom.id, newRoom);
        return Response.json({ room: newRoom });

      case 'delete_room': {
        if (requireSig && !verifySignature()) return Response.json({ error: 'Invalid signature' }, { status: 401 });
        const check = requireOwner(roomId);
        if (!check.ok) return check.res;
        if (rooms.has(roomId) && io) {
          // Notify all users in the room
          io.to(roomId).emit('error', {
            message: 'Room has been deleted',
            code: 'ROOM_DELETED',
          });

          // Remove all sockets from the room
          const roomSockets = await io.in(roomId).fetchSockets();
          for (const socket of roomSockets) {
            socket.leave(roomId);
          }

          rooms.delete(roomId);
          return Response.json({ success: true });
        }
        return Response.json({ error: 'Room not found' }, { status: 404 });
      }

      case 'kick_user': {
        if (requireSig && !verifySignature()) return Response.json({ error: 'Invalid signature' }, { status: 401 });
        const check = requireOwner(roomId);
        if (!check.ok) return check.res;
        const room = rooms.get(roomId);
        if (room && room.users.has(userId) && io) {
          const socketId = userSockets.get(userId);
          if (socketId) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit('error', {
                message: 'You have been removed from the room',
                code: 'USER_KICKED',
              });
              socket.leave(roomId);
            }
          }

          room.users.delete(userId);
          userSockets.delete(userId);

          // Notify other users
          io.to(roomId).emit('user_left', userId);
          const roomUsers = Array.from(room.users.values());
          io.to(roomId).emit('presence_updated', roomUsers);

          return Response.json({ success: true });
        }
        return Response.json(
          { error: 'User not found in room' },
          { status: 404 }
        );
      }

      case 'set_room_password': {
        if (requireSig && !verifySignature()) return Response.json({ error: 'Invalid signature' }, { status: 401 });
        const check = requireOwner(roomId);
        if (!check.ok) return check.res;
        const room = check.room;
        const pwd = String(data?.password || '');
        if (!pwd) return Response.json({ error: 'Password required' }, { status: 400 });
        room.metadata = { ...(room.metadata || {}), passwordHash: sha256(pwd) } as any;
        return Response.json({ success: true });
      }

      case 'create_invite': {
        if (requireSig && !verifySignature()) return Response.json({ error: 'Invalid signature' }, { status: 401 });
        const check = requireOwner(roomId);
        if (!check.ok) return check.res;
        const role: Role = ['owner', 'editor', 'viewer'].includes(data?.role)
          ? data.role
          : 'viewer';
        const expiresIn = Math.max(60, Math.min(60 * 60 * 24 * 30, Number(data?.expiresInSeconds) || 3600));
        const token = crypto.randomBytes(16).toString('hex');
        if (!roomInvites.has(roomId)) roomInvites.set(roomId, new Map());
        roomInvites.get(roomId)!.set(token, {
          role,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        });
        const urlBase = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const url = `${urlBase}/collaboration-demo?roomId=${encodeURIComponent(roomId)}&invite=${token}`;
        return Response.json({ token, role, expiresInSeconds: expiresIn, url });
      }

      case 'revoke_invite': {
        if (requireSig && !verifySignature()) return Response.json({ error: 'Invalid signature' }, { status: 401 });
        const check = requireOwner(roomId);
        if (!check.ok) return check.res;
        const invites = roomInvites.get(roomId);
        if (!invites) return Response.json({ success: true });
        const token = String(data?.token || '');
        invites.delete(token);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Initialize on module load in development
if (process.env.NODE_ENV === 'development') {
  initializeSocketIO();
}
