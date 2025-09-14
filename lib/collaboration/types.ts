export type Role = 'owner' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  lastSeen: Date;
  role?: Role; // optional; assigned by server when available
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

export interface UserCursor {
  userId: string;
  position: CursorPosition;
  user: User;
  timestamp: Date;
}

export interface CollaborationEvent {
  type:
    | 'cursor_move'
    | 'user_join'
    | 'user_leave'
    | 'content_change'
    | 'presence_update'
    | 'comment_add'
    | 'comment_update'
    | 'comment_delete'
    | 'comment_resolve';
  userId: string;
  data: any;
  timestamp: Date;
  roomId: string;
}

export interface ContentChange {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  userId: string;
  timestamp: Date;
  elementId?: string;
}

export interface Room {
  id: string;
  name: string;
  users: Map<string, User>;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface CollaborationState {
  currentUser: User | null;
  room: Room | null;
  users: Map<string, User>;
  cursors: Map<string, UserCursor>;
  commentsByStep?: Map<string, StepComment[]>;
  isConnected: boolean;
  isReconnecting: boolean;
  connectionStatus:
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'reconnecting';
  lastError: string | null;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  timeout: number;
}

export interface CollaborationOptions {
  roomId: string;
  userId: string;
  userName: string;
  userColor?: string;
  enableCursors?: boolean;
  enablePresence?: boolean;
  enableContentSync?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  password?: string;
  inviteToken?: string;
}

export interface ConflictResolution {
  strategy: 'last_write_wins' | 'operational_transform' | 'merge' | 'crdt';
  resolver?: (local: ContentChange, remote: ContentChange) => ContentChange;
}

export interface CollaborationEventHandlers {
  onUserJoin?: (user: User) => void;
  onUserLeave?: (userId: string) => void;
  onCursorMove?: (cursor: UserCursor) => void;
  onContentChange?: (change: ContentChange) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onError?: (error: Error) => void;
  onPresenceUpdate?: (users: User[]) => void;
  onCommentAdded?: (comment: StepComment) => void;
  onCommentUpdated?: (comment: StepComment) => void;
  onCommentDeleted?: (payload: { id: string; stepId: string }) => void;
  onCommentResolved?: (payload: { id: string; stepId: string; resolved: boolean }) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onChatHistory?: (messages: ChatMessage[]) => void;
  onChatReaction?: (payload: { messageId: string; emoji: string; userId: string }) => void;
  onLockAcquired?: (lock: LockInfo) => void;
  onLockReleased?: (payload: { resourceId: string }) => void;
  onLockDenied?: (payload: { resourceId: string; ownerId: string }) => void;
  onRoleChanged?: (payload: { userId: string; role: Role }) => void;
}

export interface ServerToClientEvents {
  user_joined: (user: User) => void;
  user_left: (userId: string) => void;
  cursor_moved: (cursor: UserCursor) => void;
  content_changed: (change: ContentChange) => void;
  presence_updated: (users: User[]) => void;
  room_state: (room: Room) => void;
  error: (error: { message: string; code?: string }) => void;
  reconnect_success: () => void;
  pong: (timestamp: number) => void;
  comment_added: (comment: StepComment) => void;
  comment_updated: (comment: StepComment) => void;
  comment_deleted: (payload: { id: string; stepId: string }) => void;
  comment_resolved: (payload: { id: string; stepId: string; resolved: boolean }) => void;
  chat_message: (message: ChatMessage) => void;
  chat_history: (messages: ChatMessage[]) => void;
  chat_reaction: (payload: { messageId: string; emoji: string; userId: string }) => void;
  lock_acquired: (lock: LockInfo) => void;
  lock_released: (payload: { resourceId: string }) => void;
  lock_denied: (payload: { resourceId: string; ownerId: string }) => void;
  role_changed: (payload: { userId: string; role: Role }) => void;
}

export interface ClientToServerEvents {
  join_room: (data: {
    roomId: string;
    user: Omit<User, 'isOnline' | 'lastSeen'>;
    password?: string;
    inviteToken?: string;
  }) => void;
  leave_room: (roomId: string) => void;
  cursor_move: (data: { roomId: string; position: CursorPosition }) => void;
  content_change: (data: {
    roomId: string;
    change: Omit<ContentChange, 'userId' | 'timestamp'>;
  }) => void;
  request_presence: (roomId: string) => void;
  ping: (timestamp: number) => void;
  comment_add: (data: {
    roomId: string;
    comment: Omit<StepComment, 'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'authorName' | 'resolved'> & {
      tempId?: string;
    };
  }) => void;
  comment_update: (data: {
    roomId: string;
    comment: Pick<StepComment, 'id' | 'stepId' | 'content' | 'mentions'>;
  }) => void;
  comment_delete: (data: { roomId: string; id: string; stepId: string }) => void;
  comment_resolve: (data: { roomId: string; id: string; stepId: string; resolved: boolean }) => void;
  chat_send: (data: { roomId: string; content: string }) => void;
  chat_reaction: (data: { roomId: string; messageId: string; emoji: string }) => void;
  lock_acquire: (data: { roomId: string; resourceId: string }) => void;
  lock_release: (data: { roomId: string; resourceId: string }) => void;
  role_set: (data: { roomId: string; targetUserId: string; role: Role }) => void;
}

export interface SocketData {
  userId: string;
  roomId: string;
  user: User;
}

// Color palette for user assignment
export const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#F9CA24', // Yellow
  '#F0932B', // Orange
  '#EB4D4B', // Dark Red
  '#6C5CE7', // Purple
  '#A29BFE', // Light Purple
  '#2D3436', // Dark Gray
  '#00B894', // Green
  '#FDCB6E', // Light Orange
  '#E17055', // Coral
] as const;

export type UserColor = (typeof USER_COLORS)[number];

// --- Comments ---
export interface StepComment {
  id: string;
  stepId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions?: string[]; // userIds
  parentId?: string; // for threads
  resolved?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentThread {
  id: string; // root comment id
  stepId: string;
  comments: StepComment[]; // first is root
  resolved?: boolean;
}

// --- Chat ---
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userColor?: string;
  content: string;
  createdAt: Date;
  reactions?: Record<string, string[]>; // emoji -> userIds
  attachments?: ChatAttachment[];
}

// --- Locks ---
export interface LockInfo {
  resourceId: string; // e.g., elementId, stepId, etc.
  ownerId: string;
  ownerName?: string;
  acquiredAt: Date;
  expiresAt?: Date; // optional TTL
}

// --- Chat attachments ---
export interface ChatAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number; // bytes
  dataUrl?: string; // inline base64 data URL (optional; use with caution)
  url?: string; // server-hosted URL if available
}
