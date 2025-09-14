'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CollaborationManager } from '@/lib/collaboration/collaboration-manager';
import type {
  User,
  UserCursor,
  ContentChange,
  CollaborationOptions,
  CollaborationEventHandlers,
  CollaborationState,
} from '@/lib/collaboration/types';

interface UseCollaborationOptions
  extends Omit<CollaborationOptions, 'roomId' | 'userId' | 'userName'> {
  enabled?: boolean;
  wsUrl?: string;
}

interface UseCollaborationReturn {
  // Core state
  isConnected: boolean;
  isReconnecting: boolean;
  connectionStatus:
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'reconnecting';
  error: string | null;

  // Users and cursors
  users: User[];
  cursors: UserCursor[];
  currentUser: User | null;
  currentRole?: import('@/lib/collaboration/types').Role;
  commentsByStep: Map<string, import('@/lib/collaboration/types').StepComment[]>;
  getComments: (stepId: string) => import('@/lib/collaboration/types').StepComment[];
  chatMessages: import('@/lib/collaboration/types').ChatMessage[];
  sendChatMessage: (content: string) => void;
  sendChatFiles: (files: { file: File; dataUrl?: string }[], message?: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => void;
  acquireLock: (resourceId: string) => void;
  releaseLock: (resourceId: string) => void;
  locks: import('@/lib/collaboration/types').LockInfo[];
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  setUserRole: (targetUserId: string, role: import('@/lib/collaboration/types').Role) => void;
  kickUser: (targetUserId: string) => void;

  // Actions
  connect: (
    roomId: string,
    userId: string,
    userName: string,
    extra?: { password?: string; inviteToken?: string }
  ) => Promise<void>;
  disconnect: () => void;
  retry: () => void;
  addComment: (input: {
    stepId: string;
    content: string;
    mentions?: string[];
    parentId?: string;
  }) => void;
  updateComment: (input: {
    id: string;
    stepId: string;
    content: string;
    mentions?: string[];
  }) => void;
  deleteComment: (id: string, stepId: string) => void;
  resolveComment: (id: string, stepId: string, resolved: boolean) => void;

  // Cursor tracking
  trackCursor: (element: HTMLElement | null) => () => void;
  trackTextInput: (
    element: HTMLInputElement | HTMLTextAreaElement | null
  ) => () => void;

  // Manager instance (for advanced usage)
  manager: CollaborationManager | null;
}

export function useCollaboration(
  options: UseCollaborationOptions = {},
  handlers: CollaborationEventHandlers = {}
): UseCollaborationReturn {
  const [state, setState] = useState<CollaborationState>({
    currentUser: null,
    room: null,
    users: new Map(),
    cursors: new Map(),
    isConnected: false,
    isReconnecting: false,
    connectionStatus: 'disconnected',
    lastError: null,
  });

  const managerRef = useRef<CollaborationManager | null>(null);
  const lastOptionsRef = useRef<CollaborationOptions | null>(null);
  const cleanupFunctionsRef = useRef<Set<() => void>>(new Set());

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new CollaborationManager(options.wsUrl);
    }
  }, [options.wsUrl]);

  // Update state from manager
  const updateState = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    setState((prevState) => ({
      ...prevState,
      isConnected: manager.isConnected,
      isReconnecting: manager.client?.state.isReconnecting || false,
      connectionStatus:
        manager.client?.state.connectionStatus || 'disconnected',
      lastError: manager.client?.state.lastError || null,
      currentUser: manager.client?.state.currentUser || null,
      // other fields updated below
      users: new Map(manager.getUsers().map((user) => [user.id, user])),
      cursors: new Map(
        manager.getCursors().map((cursor) => [cursor.userId, cursor])
      ),
      commentsByStep:
        manager.client?.state.commentsByStep instanceof Map
          ? new Map(manager.client.state.commentsByStep)
          : new Map(),
      // Chat messages are kept in client; mirror here for convenience
    }));
  }, []);

  // Connect to collaboration room
  const connect = useCallback(
    async (
      roomId: string,
      userId: string,
      userName: string,
      extra?: { password?: string; inviteToken?: string }
    ) => {
      const manager = managerRef.current;
      if (!manager || !options.enabled) return;

      try {
        const collaborationOptions: CollaborationOptions = {
          roomId,
          userId,
          userName,
          userColor: options.userColor,
          enableCursors: options.enableCursors,
          enablePresence: options.enablePresence,
          enableContentSync: options.enableContentSync,
          autoReconnect: options.autoReconnect,
          maxReconnectAttempts: options.maxReconnectAttempts,
          reconnectDelay: options.reconnectDelay,
          password: extra?.password,
          inviteToken: extra?.inviteToken,
        };

        const enhancedHandlers: CollaborationEventHandlers = {
          ...handlers,
          onConnect: () => {
            updateState();
            handlers.onConnect?.();
          },
          onDisconnect: () => {
            updateState();
            handlers.onDisconnect?.();
          },
          onReconnect: () => {
            updateState();
            handlers.onReconnect?.();
          },
          onError: (error) => {
            updateState();
            handlers.onError?.(error);
          },
          onUserJoin: (user) => {
            updateState();
            handlers.onUserJoin?.(user);
          },
          onUserLeave: (userId) => {
            updateState();
            handlers.onUserLeave?.(userId);
          },
          onCursorMove: (cursor) => {
            updateState();
            handlers.onCursorMove?.(cursor);
          },
          onContentChange: (change) => {
            updateState();
            handlers.onContentChange?.(change);
          },
          onPresenceUpdate: (users) => {
            updateState();
            handlers.onPresenceUpdate?.(users);
          },
          onChatHistory: () => {
            updateState();
          },
          onChatMessage: () => {
            updateState();
          },
          onChatReaction: () => {
            updateState();
          },
          onRoleChanged: () => {
            updateState();
          },
          onLockAcquired: () => {
            updateState();
          },
          onLockReleased: () => {
            updateState();
          },
          onLockDenied: () => {
            // no-op
          },
        };

        lastOptionsRef.current = collaborationOptions;
        await manager.initialize(collaborationOptions, enhancedHandlers);
        updateState();
      } catch (error) {
        console.error('Failed to connect to collaboration:', error);
        updateState();
      }
    },
    [options, handlers, updateState]
  );

  // Disconnect from collaboration
  const disconnect = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    // Clean up all tracking functions
    cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
    cleanupFunctionsRef.current.clear();

    manager.disconnect();
    lastOptionsRef.current = null;
    updateState();
  }, [updateState]);

  // Retry connection
  const retry = useCallback(async () => {
    const manager = managerRef.current;
    const lastOptions = lastOptionsRef.current;

    if (!manager || !lastOptions) return;

    try {
      await manager.client.connect(lastOptions, {});
      updateState();
    } catch (error) {
      console.error('Failed to retry connection:', error);
      updateState();
    }
  }, [updateState]);

  // Track cursor movement
  const trackCursor = useCallback((element: HTMLElement | null) => {
    const manager = managerRef.current;
    if (!manager || !element) return () => {};

    const cleanup = manager.trackCursor(element);
    cleanupFunctionsRef.current.add(cleanup);

    return () => {
      cleanup();
      cleanupFunctionsRef.current.delete(cleanup);
    };
  }, []);

  // Track text input changes
  const trackTextInput = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      const manager = managerRef.current;
      if (!manager || !element) return () => {};

      const cleanup = manager.trackTextInput(element);
      cleanupFunctionsRef.current.add(cleanup);

      return () => {
        cleanup();
        cleanupFunctionsRef.current.delete(cleanup);
      };
    },
    []
  );

  // Comment actions
  const addComment = useCallback(
    (input: { stepId: string; content: string; mentions?: string[]; parentId?: string }) => {
      managerRef.current?.addComment(input);
    },
    []
  );

  const updateComment = useCallback(
    (input: { id: string; stepId: string; content: string; mentions?: string[] }) => {
      managerRef.current?.updateComment(input);
    },
    []
  );

  const deleteComment = useCallback((id: string, stepId: string) => {
    managerRef.current?.deleteComment(id, stepId);
  }, []);

  const resolveComment = useCallback(
    (id: string, stepId: string, resolved: boolean) => {
      managerRef.current?.resolveComment(id, stepId, resolved);
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Enable/disable based on options
  useEffect(() => {
    if (!options.enabled && state.isConnected) {
      disconnect();
    }
  }, [options.enabled, state.isConnected, disconnect]);

  return {
    // Core state
    isConnected: state.isConnected,
    isReconnecting: state.isReconnecting,
    connectionStatus: state.connectionStatus,
    error: state.lastError,

    // Users and cursors
    users: Array.from(state.users.values()),
    cursors: Array.from(state.cursors.values()),
    currentUser: state.currentUser,
    currentRole: managerRef.current?.getRole(),
    commentsByStep: state.commentsByStep || new Map(),
    getComments: (stepId: string) =>
      Array.from(state.commentsByStep?.get(stepId) || []),
    chatMessages: managerRef.current?.getChatMessages() || [],

    // Actions
    connect,
    disconnect,
    retry,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    sendChatMessage: (content: string) => managerRef.current?.sendChatMessage(content),
    sendChatFiles: async (files: { file: File; dataUrl?: string }[], message?: string) =>
      await managerRef.current?.sendChatFiles(files, message),
    reactToMessage: (messageId: string, emoji: string) =>
      managerRef.current?.reactToMessage(messageId, emoji),
    acquireLock: (resourceId: string) => managerRef.current?.acquireLock(resourceId),
    releaseLock: (resourceId: string) => managerRef.current?.releaseLock(resourceId),
    locks: managerRef.current?.getLocks() || [],
    blockUser: (userId: string) => managerRef.current?.blockUser(userId),
    unblockUser: (userId: string) => managerRef.current?.unblockUser(userId),
    isUserBlocked: (userId: string) => !!managerRef.current?.isUserBlocked(userId),
    setUserRole: (targetUserId: string, role: import('@/lib/collaboration/types').Role) =>
      managerRef.current?.setUserRole(targetUserId, role),
    kickUser: (targetUserId: string) => managerRef.current?.kickUser(targetUserId),

    // Tracking
    trackCursor,
    trackTextInput,

    // Manager instance
    manager: managerRef.current,
  };
}

// Hook for tracking cursor on a specific element
export function useCursorTracker(
  manager: CollaborationManager | null,
  elementRef: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    const element = elementRef.current;
    if (!manager || !element) return;

    return manager.trackCursor(element);
  }, [manager, elementRef]);
}

// Hook for tracking text input changes
export function useTextInputTracker(
  manager: CollaborationManager | null,
  elementRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
) {
  useEffect(() => {
    const element = elementRef.current;
    if (!manager || !element) return;

    return manager.trackTextInput(element);
  }, [manager, elementRef]);
}

// Hook for managing a collaboration room
export function useCollaborationRoom(
  roomId: string,
  options?: UseCollaborationOptions
) {
  const [isJoined, setIsJoined] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const collaboration = useCollaboration(options, {
    onUserJoin: (user) => {
      setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    },
    onUserLeave: (userId) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    },
    onPresenceUpdate: (updatedUsers) => {
      setUsers(updatedUsers);
    },
    onConnect: () => {
      setIsJoined(true);
    },
    onDisconnect: () => {
      setIsJoined(false);
      setUsers([]);
    },
  });

  const joinRoom = useCallback(
    async (userId: string, userName: string) => {
      await collaboration.connect(roomId, userId, userName);
    },
    [collaboration, roomId]
  );

  const leaveRoom = useCallback(() => {
    collaboration.disconnect();
  }, [collaboration]);

  return {
    ...collaboration,
    isJoined,
    joinRoom,
    leaveRoom,
    users: users.length > 0 ? users : collaboration.users,
  };
}
