// Core classes
export { WebSocketClient } from './websocket-client';
export { CollaborationManager } from './collaboration-manager';

// Types
export type {
  User,
  UserCursor,
  CursorPosition,
  ContentChange,
  CollaborationEvent,
  Room,
  CollaborationState,
  CollaborationOptions,
  CollaborationEventHandlers,
  ConflictResolution,
  WebSocketConfig,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  UserColor,
} from './types';

export { USER_COLORS } from './types';
