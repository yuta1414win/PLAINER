import { io, Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';
import type {
  User,
  CursorPosition,
  UserCursor,
  ContentChange,
  CollaborationState,
  CollaborationOptions,
  CollaborationEventHandlers,
  ServerToClientEvents,
  ClientToServerEvents,
  USER_COLORS,
  UserColor,
  StepComment,
  ChatAttachment,
} from './types';

export class WebSocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private isManuallyDisconnected = false;

  public state: CollaborationState = {
    currentUser: null,
    room: null,
    users: new Map(),
    cursors: new Map(),
    commentsByStep: new Map(),
    // locks are kept separately in this client
    // not in CollaborationState type: extend via module field on client
    // chatMessages is kept locally in this client class
    isConnected: false,
    isReconnecting: false,
    connectionStatus: 'disconnected',
    lastError: null,
  };

  // Chat messages for current room
  private chatMessages: import('./types').ChatMessage[] = [];
  // Locks for current room
  private locks: Map<string, import('./types').LockInfo> = new Map();
  private currentRole: import('./types').Role | undefined;
  private blockedUsers: Set<string> = new Set();

  private eventHandlers: CollaborationEventHandlers = {};
  private options: CollaborationOptions | null = null;

  constructor(
    private baseUrl: string = process.env.NEXT_PUBLIC_WS_URL ||
      'http://localhost:3000'
  ) {}

  /**
   * Connect to the WebSocket server and join a collaboration room
   */
  async connect(
    options: CollaborationOptions,
    handlers: CollaborationEventHandlers = {}
  ): Promise<void> {
    this.options = options;
    this.eventHandlers = handlers;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.isManuallyDisconnected = false;

    try {
      this.state.connectionStatus = 'connecting';
      this.notifyStateChange();

      // Create user with assigned color
      const userColor = options.userColor || this.assignUserColor();
      const user: Omit<User, 'isOnline' | 'lastSeen'> = {
        id: options.userId,
        name: options.userName,
        color: userColor,
      };

      this.state.currentUser = {
        ...user,
        isOnline: true,
        lastSeen: new Date(),
      };

      await this.initializeSocket();
      await this.joinRoom(options.roomId, user, options.password, options.inviteToken);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Initialize Socket.io connection with event handlers
   */
  private async initializeSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Best-effort: warm up Socket.IO server on Next.js via API route
      try {
        const url = new URL(this.baseUrl);
        // Trigger server-side socket setup if running on the same origin
        fetch(`${url.origin}/api/socket`).catch(() => undefined);
      } catch {
        // ignore
      }

      this.socket = io(this.baseUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false, // We handle reconnection manually
        forceNew: true,
        withCredentials: true,
        transportOptions: {
          polling: { withCredentials: true },
        },
      } as any);

      // Connection events
      this.socket.on('connect', () => {
        this.state.isConnected = true;
        this.state.connectionStatus = 'connected';
        this.state.isReconnecting = false;
        this.state.lastError = null;
        this.reconnectAttempts = 0;

        this.startHeartbeat();
        this.notifyStateChange();
        this.eventHandlers.onConnect?.();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.state.isConnected = false;
        this.state.connectionStatus = 'disconnected';
        this.stopHeartbeat();
        this.notifyStateChange();

        if (
          !this.isManuallyDisconnected &&
          this.options?.autoReconnect !== false
        ) {
          this.scheduleReconnect();
        }

        this.eventHandlers.onDisconnect?.();
      });

      this.socket.on('connect_error', (error) => {
        this.handleError(new Error(`Connection failed: ${error.message}`));
        reject(error);
      });

      // Collaboration events
      this.setupCollaborationEventHandlers();
    });
  }

  /**
   * Setup event handlers for collaboration features
   */
  private setupCollaborationEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('user_joined', (user: User) => {
      this.state.users.set(user.id, user);
      this.notifyStateChange();
      this.eventHandlers.onUserJoin?.(user);
    });

    this.socket.on('user_left', (userId: string) => {
      this.state.users.delete(userId);
      this.state.cursors.delete(userId);
      this.notifyStateChange();
      this.eventHandlers.onUserLeave?.(userId);
    });

      this.socket.on('cursor_moved', (cursor: UserCursor) => {
      if (cursor.userId !== this.state.currentUser?.id) {
        this.state.cursors.set(cursor.userId, cursor);
        this.notifyStateChange();
        this.eventHandlers.onCursorMove?.(cursor);
      }
    });

      this.socket.on('content_changed', (change: ContentChange) => {
      if (change.userId !== this.state.currentUser?.id) {
        this.eventHandlers.onContentChange?.(change);
      }
    });

    // --- Comment events ---
    this.socket.on('comment_added', (comment: StepComment) => {
      const map = this.state.commentsByStep || new Map<string, StepComment[]>();
      const list = map.get(comment.stepId) || [];
      map.set(comment.stepId, [...list, comment]);
      this.state.commentsByStep = map;
      this.notifyStateChange();
      this.eventHandlers.onCommentAdded?.(comment);
    });

    // --- Chat events ---
    this.socket.on('chat_history', (messages) => {
      // Ensure Date objects
      this.chatMessages = (messages || []).map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      }));
      this.notifyStateChange();
      this.eventHandlers.onChatHistory?.(this.chatMessages.slice());
    });

    this.socket.on('chat_message', (message) => {
      const normalized = { ...message, createdAt: new Date(message.createdAt) };
      this.chatMessages.push(normalized);
      if (this.chatMessages.length > 500) this.chatMessages.shift();
      this.notifyStateChange();
      this.eventHandlers.onChatMessage?.(normalized);
    });

    // Chat file event (optional server support)
    // If server emits 'chat_file', normalize and append as message with attachments
    // Expected payload shape is similar to ChatMessage but with attachments
    // Fallback is a synthetic message with a paperclip prefix
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.socket as any).on?.('chat_file', (payload: any) => {
      try {
        const msg = {
          id: payload?.id || nanoid(),
          roomId: payload?.roomId || this.options?.roomId || '',
          userId: payload?.userId || 'unknown',
          userName: payload?.userName || 'unknown',
          userColor: payload?.userColor,
          content:
            payload?.content ||
            (payload?.attachments?.length
              ? `📎 ${payload.attachments.map((a: ChatAttachment) => a.fileName).join(', ')}`
              : ''),
          createdAt: new Date(payload?.createdAt || Date.now()),
          reactions: payload?.reactions || {},
          attachments: payload?.attachments || [],
        } as import('./types').ChatMessage;
        this.chatMessages.push(msg);
        if (this.chatMessages.length > 500) this.chatMessages.shift();
        this.notifyStateChange();
        this.eventHandlers.onChatMessage?.(msg);
      } catch (e) {
        // no-op
      }
    });

    this.socket.on('chat_reaction', ({ messageId, emoji, userId }) => {
      const msg = this.chatMessages.find((m) => m.id === messageId);
      if (!msg) return;
      if (!msg.reactions) msg.reactions = {};
      const set = new Set(msg.reactions[emoji] || []);
      if (set.has(userId)) set.delete(userId);
      else set.add(userId);
      msg.reactions[emoji] = Array.from(set);
      this.notifyStateChange();
      this.eventHandlers.onChatReaction?.({ messageId, emoji, userId });
    });

    this.socket.on('comment_updated', (comment: StepComment) => {
      const map = this.state.commentsByStep || new Map<string, StepComment[]>();
      const list = map.get(comment.stepId) || [];
      const idx = list.findIndex((c) => c.id === comment.id);
      if (idx !== -1) {
        const copy = list.slice();
        copy[idx] = comment;
        map.set(comment.stepId, copy);
        this.state.commentsByStep = map;
        this.notifyStateChange();
      }
      this.eventHandlers.onCommentUpdated?.(comment);
    });

    this.socket.on('comment_deleted', ({ id, stepId }) => {
      const map = this.state.commentsByStep || new Map<string, StepComment[]>();
      const list = map.get(stepId) || [];
      map.set(stepId, list.filter((c) => c.id !== id));
      this.state.commentsByStep = map;
      this.notifyStateChange();
      this.eventHandlers.onCommentDeleted?.({ id, stepId });
    });

    this.socket.on('comment_resolved', ({ id, stepId, resolved }) => {
      const map = this.state.commentsByStep || new Map<string, StepComment[]>();
      const list = map.get(stepId) || [];
      const idx = list.findIndex((c) => c.id === id);
      if (idx !== -1) {
        const copy = list.slice();
        copy[idx] = { ...copy[idx], resolved };
        map.set(stepId, copy);
        this.state.commentsByStep = map;
        this.notifyStateChange();
      }
      this.eventHandlers.onCommentResolved?.({ id, stepId, resolved });
    });

    this.socket.on('presence_updated', (users: User[]) => {
      this.state.users.clear();
      users.forEach((user) => {
        this.state.users.set(user.id, user);
      });
      this.notifyStateChange();
      this.eventHandlers.onPresenceUpdate?.(users);
    });

    this.socket.on('room_state', (room) => {
      // Convert plain object to Map for users
      const usersMap = new Map<string, User>();
      if (room.users) {
        Object.entries(room.users).forEach(([id, user]) => {
          usersMap.set(id, user as User);
        });
      }

      this.state.room = {
        ...room,
        users: usersMap,
      };
      // Derive current role from presence
      const me = this.state.currentUser?.id
        ? usersMap.get(this.state.currentUser.id)
        : undefined;
      this.currentRole = me?.role;
      this.notifyStateChange();
    });

    this.socket.on('error', (error) => {
      this.handleError(new Error(error.message));
    });

    this.socket.on('reconnect_success', () => {
      this.state.isReconnecting = false;
      this.state.connectionStatus = 'connected';
      this.notifyStateChange();
      this.eventHandlers.onReconnect?.();
    });

    // Heartbeat response
    this.socket.on('pong', () => {
      if (this.pingTimeout) {
        clearTimeout(this.pingTimeout);
        this.pingTimeout = null;
      }
    });

    // --- Locks events ---
    this.socket.on('lock_acquired', (lock) => {
      this.locks.set(lock.resourceId, lock);
      this.notifyStateChange();
      this.eventHandlers.onLockAcquired?.(lock);
    });

    this.socket.on('lock_released', ({ resourceId }) => {
      this.locks.delete(resourceId);
      this.notifyStateChange();
      this.eventHandlers.onLockReleased?.({ resourceId });
    });

    this.socket.on('lock_denied', (payload) => {
      this.eventHandlers.onLockDenied?.(payload);
    });

    // --- Roles ---
    this.socket.on('role_changed', ({ userId, role }) => {
      const user = this.state.users.get(userId);
      if (user) {
        user.role = role as any;
        this.state.users.set(userId, user);
      }
      if (this.state.currentUser?.id === userId) {
        this.currentRole = role;
      }
      this.notifyStateChange();
      this.eventHandlers.onRoleChanged?.({ userId, role: role as any });
    });
  }

  /**
   * Join a collaboration room
   */
  private async joinRoom(
    roomId: string,
    user: Omit<User, 'isOnline' | 'lastSeen'>,
    password?: string,
    inviteToken?: string
  ): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 10000);

      this.socket!.emit('join_room', { roomId, user, password, inviteToken });

      // Wait for room state or user joined confirmation
      const onRoomState = () => {
        clearTimeout(timeout);
        this.socket!.off('room_state', onRoomState);
        this.socket!.off('error', onError);
        resolve();
      };

      const onError = (error: { message: string }) => {
        clearTimeout(timeout);
        this.socket!.off('room_state', onRoomState);
        this.socket!.off('error', onError);
        reject(new Error(error.message));
      };

      this.socket!.once('room_state', onRoomState);
      this.socket!.once('error', onError);
    });
  }

  /**
   * Send cursor position to other users
   */
  sendCursorPosition(position: CursorPosition): void {
    if (!this.socket?.connected || !this.options) return;

    this.socket.emit('cursor_move', {
      roomId: this.options.roomId,
      position,
    });

    // Update local state
    if (this.state.currentUser) {
      const cursor: UserCursor = {
        userId: this.state.currentUser.id,
        position,
        user: this.state.currentUser,
        timestamp: new Date(),
      };
      this.state.cursors.set(this.state.currentUser.id, cursor);
    }
  }

  /**
   * Send content change to other users
   */
  sendContentChange(change: Omit<ContentChange, 'userId' | 'timestamp'>): void {
    if (!this.socket?.connected || !this.options) return;

    this.socket.emit('content_change', {
      roomId: this.options.roomId,
      change,
    });
  }

  /**
   * Request current presence information
   */
  requestPresence(): void {
    if (!this.socket?.connected || !this.options) return;

    this.socket.emit('request_presence', this.options.roomId);
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.stopHeartbeat();

    if (this.socket?.connected && this.options) {
      this.socket.emit('leave_room', this.options.roomId);
    }

    this.socket?.disconnect();
    this.socket = null;

    this.state.isConnected = false;
    this.state.connectionStatus = 'disconnected';
    this.state.users.clear();
    this.state.cursors.clear();
    this.notifyStateChange();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handleError(new Error('Max reconnection attempts reached'));
      return;
    }

    this.state.isReconnecting = true;
    this.state.connectionStatus = 'reconnecting';
    this.notifyStateChange();

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    this.reconnectAttempts++;

    setTimeout(async () => {
      if (!this.isManuallyDisconnected && this.options) {
        try {
          await this.initializeSocket();
          await this.joinRoom(this.options.roomId, {
            id: this.options.userId,
            name: this.options.userName,
            color: this.options.userColor || this.assignUserColor(),
          });
        } catch (error) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', Date.now());

        // Set timeout for pong response
        this.pingTimeout = setTimeout(() => {
          this.socket?.disconnect();
        }, 5000);
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.state.lastError = error.message;
    this.notifyStateChange();
    this.eventHandlers.onError?.(error);
    console.error('[WebSocketClient]', error);
  }

  /**
   * Notify state change (for React hooks integration)
   */
  private notifyStateChange(): void {
    // This will be used by React hooks to trigger re-renders
  }

  /**
   * Assign a random color to the user
   */
  private assignUserColor(): UserColor {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#F9CA24',
      '#F0932B',
      '#EB4D4B',
      '#6C5CE7',
      '#A29BFE',
      '#2D3436',
      '#00B894',
      '#FDCB6E',
      '#E17055',
    ] as const;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Get current users in the room
   */
  get users(): User[] {
    return Array.from(this.state.users.values());
  }

  /**
   * Get current cursors
   */
  get cursors(): UserCursor[] {
    return Array.from(this.state.cursors.values());
  }

  /**
   * Change a user's role (owner only)
   */
  setUserRole(targetUserId: string, role: import('./types').Role): void {
    if (!this.socket?.connected || !this.options) return;
    // Emit standard role_set event supported by server
    this.socket.emit('role_set', {
      roomId: this.options.roomId,
      targetUserId,
      role,
    });
  }

  /**
   * Kick a user from the room (owner only)
   * Uses a best-effort event name; server may ignore if unsupported.
   */
  kickUser(targetUserId: string): void {
    if (!this.socket?.connected || !this.options) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.socket as any)?.emit?.('user_kick', {
      roomId: this.options.roomId,
      userId: targetUserId,
    });
  }

  /**
   * Get comments for a given step
   */
  getComments(stepId: string): StepComment[] {
    return Array.from(this.state.commentsByStep?.get(stepId) || []);
  }

  /**
   * Get chat messages for current room
   */
  getChatMessages(): import('./types').ChatMessage[] {
    return this.chatMessages.slice();
  }

  /** Locks API */
  acquireLock(resourceId: string): void {
    if (!this.socket?.connected || !this.options) return;
    this.socket.emit('lock_acquire', { roomId: this.options.roomId, resourceId });
  }

  releaseLock(resourceId: string): void {
    if (!this.socket?.connected || !this.options) return;
    this.socket.emit('lock_release', { roomId: this.options.roomId, resourceId });
  }

  getLocks(): import('./types').LockInfo[] {
    return Array.from(this.locks.values());
  }

  getRole(): import('./types').Role | undefined {
    return this.currentRole;
  }

  /** Permissions: block/unblock (client-side + optional server event) */
  blockUser(userId: string): void {
    this.blockedUsers.add(userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.socket as any)?.emit?.('user_block', { roomId: this.options?.roomId, userId });
  }

  unblockUser(userId: string): void {
    this.blockedUsers.delete(userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.socket as any)?.emit?.('user_unblock', { roomId: this.options?.roomId, userId });
  }

  isBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId);
  }

  /**
   * Send a comment add event
   */
  addComment(comment: {
    stepId: string;
    content: string;
    mentions?: string[];
    parentId?: string;
  }): void {
    if (!this.socket?.connected || !this.options) return;
    this.socket.emit('comment_add', {
      roomId: this.options.roomId,
      comment,
    });
  }

  /**
   * Update an existing comment
   */
  updateComment(comment: { id: string; stepId: string; content: string; mentions?: string[] }): void {
    if (!this.socket?.connected || !this.options) return;
    this.socket.emit('comment_update', {
      roomId: this.options.roomId,
      comment,
    });
  }

  /**
   * Delete a comment
   */
  deleteComment(id: string, stepId: string): void {
    if (!this.socket?.connected || !this.options) return;
    this.socket.emit('comment_delete', {
      roomId: this.options.roomId,
      id,
      stepId,
    });
  }

  /**
   * Resolve or unresolve a comment
   */
  resolveComment(id: string, stepId: string, resolved: boolean): void {
    if (!this.socket?.connected || !this.options) return;
    this.socket.emit('comment_resolve', {
      roomId: this.options.roomId,
      id,
      stepId,
      resolved,
    });
  }

  /**
   * Send a chat message
   */
  sendChatMessage(content: string): void {
    if (!this.socket?.connected || !this.options) return;
    const text = String(content || '').trim();
    if (!text) return;
    this.socket.emit('chat_send', { roomId: this.options.roomId, content: text });
  }

  /**
   * Toggle a reaction on a chat message
   */
  reactToMessage(messageId: string, emoji: string): void {
    if (!this.socket?.connected || !this.options) return;
    this.socket.emit('chat_reaction', {
      roomId: this.options.roomId,
      messageId,
      emoji,
    });
  }

  /**
   * Send chat message with file attachments.
   * If server doesn't support file events, falls back to posting a normal message with an inline attachment preview.
   */
  async sendChatFiles(files: { file: File; dataUrl?: string }[], message?: string): Promise<void> {
    if (!this.options) return;
    const roomId = this.options.roomId;

    // Prepare attachment metadata
    const attachments: ChatAttachment[] = files.map((f) => ({
      id: nanoid(),
      fileName: f.file.name,
      mimeType: f.file.type || 'application/octet-stream',
      size: f.file.size || 0,
      dataUrl: f.dataUrl,
    }));

    // Try server-side event first
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.socket as any)?.emit?.('chat_file_send', { roomId, attachments, content: message || '' });
      return;
    } catch {
      // Fallback to local-only message append
      const content =
        (message && message.trim()) ||
        `📎 ${attachments.map((a) => a.fileName).join(', ')}`;
      const localMsg = {
        id: nanoid(),
        roomId,
        userId: this.state.currentUser?.id || 'me',
        userName: this.state.currentUser?.name || 'Me',
        userColor: this.state.currentUser?.color,
        content,
        createdAt: new Date(),
        attachments,
      } as import('./types').ChatMessage;
      this.chatMessages.push(localMsg);
      if (this.chatMessages.length > 500) this.chatMessages.shift();
      this.notifyStateChange();
      this.eventHandlers.onChatMessage?.(localMsg);
    }
  }
}
