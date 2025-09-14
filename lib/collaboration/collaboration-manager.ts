import { WebSocketClient } from './websocket-client';
import { transformCRDT } from './crdt';
import { nanoid } from 'nanoid';
import type {
  User,
  CursorPosition,
  UserCursor,
  ContentChange,
  CollaborationOptions,
  CollaborationEventHandlers,
  ConflictResolution,
} from './types';

export class CollaborationManager {
  private client: WebSocketClient;
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private isInitialized = false;
  private handlers?: CollaborationEventHandlers;

  // Operational Transform for conflict resolution
  private pendingChanges: Map<string, ContentChange> = new Map();
  private lastKnownState: string = '';

  // Cursor tracking
  private cursorDebounceTimeout: NodeJS.Timeout | null = null;
  private readonly CURSOR_DEBOUNCE_MS = 50;

  // Content sync
  private contentSyncEnabled = true;
  private conflictResolution: ConflictResolution = {
    strategy: 'last_write_wins',
  };

  constructor(baseUrl?: string) {
    this.client = new WebSocketClient(baseUrl);
  }

  /**
   * Initialize collaboration for a room
   */
  async initialize(
    options: CollaborationOptions,
    handlers?: CollaborationEventHandlers
  ): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Collaboration manager already initialized');
    }

    this.currentRoomId = options.roomId;
    this.currentUserId = options.userId;
    this.contentSyncEnabled = options.enableContentSync !== false;

    // Enhanced event handlers with conflict resolution
    this.handlers = handlers;
    const enhancedHandlers: CollaborationEventHandlers = {
      ...handlers,
      onContentChange: (change: ContentChange) => {
        if (this.contentSyncEnabled) {
          this.handleContentChange(change);
        }
        handlers?.onContentChange?.(change);
      },
      onCommentAdded: (comment) => {
        handlers?.onCommentAdded?.(comment);
      },
      onCommentUpdated: (comment) => {
        handlers?.onCommentUpdated?.(comment);
      },
      onCommentDeleted: (payload) => {
        handlers?.onCommentDeleted?.(payload);
      },
      onCommentResolved: (payload) => {
        handlers?.onCommentResolved?.(payload);
      },
      onConnect: () => {
        console.log('✅ Connected to collaboration server');
        handlers?.onConnect?.();
      },
      onDisconnect: () => {
        console.log('❌ Disconnected from collaboration server');
        handlers?.onDisconnect?.();
      },
      onReconnect: () => {
        console.log('🔄 Reconnected to collaboration server');
        this.requestSync();
        handlers?.onReconnect?.();
      },
      onError: (error: Error) => {
        console.error('🚨 Collaboration error:', error);
        handlers?.onError?.(error);
      },
    };

    await this.client.connect(options, enhancedHandlers);
    this.isInitialized = true;
  }

  /** Permissions */
  getRole(): import('./types').Role | undefined {
    return this.client.getRole();
  }

  /** Locks */
  acquireLock(resourceId: string): void {
    if (!this.canEdit()) {
      this.reportPermissionError('acquire lock');
      return;
    }
    this.client.acquireLock(resourceId);
  }

  releaseLock(resourceId: string): void {
    if (!this.canEdit()) {
      this.reportPermissionError('release lock');
      return;
    }
    this.client.releaseLock(resourceId);
  }

  getLocks(): import('./types').LockInfo[] {
    return this.client.getLocks();
  }

  /**
   * Track user cursor position with debouncing
   */
  trackCursor(element: HTMLElement): () => void {
    const handleMouseMove = (event: MouseEvent) => {
      if (this.cursorDebounceTimeout) {
        clearTimeout(this.cursorDebounceTimeout);
      }

      this.cursorDebounceTimeout = setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const position: CursorPosition = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          elementId: element.id || element.tagName.toLowerCase(),
        };

        this.client.sendCursorPosition(position);
      }, this.CURSOR_DEBOUNCE_MS);
    };

    const handleMouseLeave = () => {
      if (this.cursorDebounceTimeout) {
        clearTimeout(this.cursorDebounceTimeout);
      }
      // Send cursor position outside the element bounds
      this.client.sendCursorPosition({ x: -1, y: -1 });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    // Return cleanup function
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (this.cursorDebounceTimeout) {
        clearTimeout(this.cursorDebounceTimeout);
      }
    };
  }

  /**
   * Track text input changes for collaborative editing
   */
  trackTextInput(element: HTMLInputElement | HTMLTextAreaElement): () => void {
    let lastValue = element.value;
    let lastSelectionStart = element.selectionStart || 0;

    const handleInput = (event: Event) => {
      if (!this.contentSyncEnabled) return;

      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      const currentValue = target.value;
      const currentSelectionStart = target.selectionStart || 0;

      // Calculate the change
      const change = this.calculateTextChange(
        lastValue,
        currentValue,
        lastSelectionStart,
        currentSelectionStart
      );

      if (change) {
        // 添付する要素ID（フィールド識別用）
        const elementId = element.id || element.getAttribute('name') || undefined;
        const changeWithElement: Omit<ContentChange, 'userId' | 'timestamp'> = {
          ...change,
          ...(elementId ? { elementId } : {}),
        };
        this.sendContentChange(changeWithElement);
      }

      lastValue = currentValue;
      lastSelectionStart = currentSelectionStart;
    };

    const handleSelectionChange = () => {
      if (element.selectionStart !== null) {
        lastSelectionStart = element.selectionStart;
      }
    };

    element.addEventListener('input', handleInput);
    element.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      element.removeEventListener('input', handleInput);
      element.removeEventListener('selectionchange', handleSelectionChange);
    };
  }

  /**
   * Calculate text change between two states
   */
  private calculateTextChange(
    oldValue: string,
    newValue: string,
    oldPosition: number,
    newPosition: number
  ): Omit<ContentChange, 'userId' | 'timestamp'> | null {
    if (oldValue === newValue) return null;

    // Simple diff algorithm
    let i = 0;
    while (
      i < Math.min(oldValue.length, newValue.length) &&
      oldValue[i] === newValue[i]
    ) {
      i++;
    }

    let j = 0;
    while (
      j < Math.min(oldValue.length - i, newValue.length - i) &&
      oldValue[oldValue.length - 1 - j] === newValue[newValue.length - 1 - j]
    ) {
      j++;
    }

    const deleteLength = oldValue.length - i - j;
    const insertedText = newValue.slice(i, newValue.length - j);

    if (deleteLength > 0 && insertedText.length > 0) {
      // Replace operation
      return {
        id: nanoid(),
        type: 'replace',
        position: i,
        content: insertedText,
      };
    } else if (deleteLength > 0) {
      // Delete operation
      return {
        id: nanoid(),
        type: 'delete',
        position: i,
        content: oldValue.slice(i, i + deleteLength),
      };
    } else if (insertedText.length > 0) {
      // Insert operation
      return {
        id: nanoid(),
        type: 'insert',
        position: i,
        content: insertedText,
      };
    }

    return null;
  }

  /**
   * Send content change to other users
   */
  sendContentChange(change: Omit<ContentChange, 'userId' | 'timestamp'>): void {
    if (!this.contentSyncEnabled) return;
    if (!this.canEdit()) {
      this.reportPermissionError('edit content');
      return;
    }

    // Store the change for conflict resolution
    this.pendingChanges.set(change.id, {
      ...change,
      userId: this.currentUserId!,
      timestamp: new Date(),
    });

    this.client.sendContentChange(change);
  }

  /**
   * Handle incoming content changes with conflict resolution
   */
  private handleContentChange(change: ContentChange): void {
    // Check if this is our own change coming back
    if (change.userId === this.currentUserId) {
      this.pendingChanges.delete(change.id);
      return;
    }

    // Apply conflict resolution if needed
    const conflictingChange = this.findConflictingChange(change);
    if (conflictingChange) {
      const resolvedChange = this.resolveConflict(conflictingChange, change);
      this.applyContentChange(resolvedChange);
    } else {
      this.applyContentChange(change);
    }
  }

  /**
   * Find conflicting changes in pending changes
   */
  private findConflictingChange(
    remoteChange: ContentChange
  ): ContentChange | null {
    for (const [id, pendingChange] of this.pendingChanges) {
      if (this.changesConflict(pendingChange, remoteChange)) {
        return pendingChange;
      }
    }
    return null;
  }

  /**
   * Check if two changes conflict
   */
  private changesConflict(
    change1: ContentChange,
    change2: ContentChange
  ): boolean {
    // Simple conflict detection based on position overlap
    const change1End = change1.position + change1.content.length;
    const change2End = change2.position + change2.content.length;

    return !(change1End <= change2.position || change2End <= change1.position);
  }

  /**
   * Resolve conflict between two changes
   */
  private resolveConflict(
    localChange: ContentChange,
    remoteChange: ContentChange
  ): ContentChange {
    switch (this.conflictResolution.strategy) {
      case 'last_write_wins':
        return remoteChange.timestamp > localChange.timestamp
          ? remoteChange
          : localChange;

      case 'operational_transform':
        // Simplified operational transform
        return this.transformChange(localChange, remoteChange);

      case 'crdt': {
        // Lightweight CRDT-like position transform with deterministic tie-breaking
        const adjusted = transformCRDT(localChange, remoteChange, {
          localActorId: this.currentUserId || 'local',
        });
        // Prefer remote content on hard overlap; otherwise return adjusted local
        const overlaps = (a: ContentChange, b: ContentChange) => {
          const aEnd = a.position + a.content.length;
          const bEnd = b.position + b.content.length;
          return !(aEnd <= b.position || bEnd <= a.position);
        };
        return overlaps(localChange, remoteChange) ? remoteChange : adjusted;
      }

      case 'merge':
        if (this.conflictResolution.resolver) {
          return this.conflictResolution.resolver(localChange, remoteChange);
        }
        return remoteChange;

      default:
        return remoteChange;
    }
  }

  /**
   * Transform change using operational transform
   */
  private transformChange(
    localChange: ContentChange,
    remoteChange: ContentChange
  ): ContentChange {
    // Simplified operational transform implementation
    // In a real implementation, you'd want a more sophisticated OT algorithm

    if (remoteChange.position <= localChange.position) {
      // Remote change comes before local change
      if (remoteChange.type === 'insert') {
        return {
          ...localChange,
          position: localChange.position + remoteChange.content.length,
        };
      } else if (remoteChange.type === 'delete') {
        return {
          ...localChange,
          position: Math.max(
            remoteChange.position,
            localChange.position - remoteChange.content.length
          ),
        };
      }
    }

    return localChange;
  }

  /**
   * Apply content change to the document
   */
  private applyContentChange(change: ContentChange): void {
    // This is where you'd apply the change to your document
    // Implementation depends on your document model

    const event = new CustomEvent('collaboration:content-change', {
      detail: change,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  /**
   * Request full synchronization with server
   */
  requestSync(): void {
    this.client.requestPresence();
  }

  /**
   * Comments API
   */
  addComment(input: { stepId: string; content: string; mentions?: string[]; parentId?: string }) {
    this.client.addComment(input);
  }

  updateComment(input: { id: string; stepId: string; content: string; mentions?: string[] }) {
    this.client.updateComment(input);
  }

  deleteComment(id: string, stepId: string) {
    this.client.deleteComment(id, stepId);
  }

  resolveComment(id: string, stepId: string, resolved: boolean) {
    this.client.resolveComment(id, stepId, resolved);
  }

  /**
   * Chat API
   */
  sendChatMessage(content: string) {
    this.client.sendChatMessage(content);
  }

  reactToMessage(messageId: string, emoji: string) {
    this.client.reactToMessage(messageId, emoji);
  }

  getChatMessages() {
    return this.client.getChatMessages();
  }

  async sendChatFiles(files: { file: File; dataUrl?: string }[], message?: string) {
    await this.client.sendChatFiles(files, message);
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolution(resolution: ConflictResolution): void {
    this.conflictResolution = resolution;
  }

  /**
   * Role and Permissions
   */
  private canEdit(): boolean {
    const role = this.getRole();
    return role === 'owner' || role === 'editor' || role === undefined; // undefined => permissive fallback
  }

  private canManageMembers(): boolean {
    return this.getRole() === 'owner';
  }

  private reportPermissionError(action: string) {
    const error = new Error(`Permission denied: cannot ${action} as current role`);
    try {
      this.handlers?.onError?.(error);
    } catch {}
    if (typeof console !== 'undefined') console.warn('[Collaboration] ', error.message);
  }

  setUserRole(targetUserId: string, role: import('./types').Role): void {
    if (!this.canManageMembers()) {
      this.reportPermissionError('change roles');
      return;
    }
    this.client.setUserRole(targetUserId, role);
  }

  kickUser(userId: string): void {
    if (!this.canManageMembers()) {
      this.reportPermissionError('kick members');
      return;
    }
    this.client.kickUser(userId);
  }

  /**
   * Enable or disable content synchronization
   */
  setContentSync(enabled: boolean): void {
    this.contentSyncEnabled = enabled;
  }

  /**
   * Get current users in the room
   */
  getUsers(): User[] {
    return this.client.users;
  }

  /**
   * Get current user cursors
   */
  getCursors(): UserCursor[] {
    return this.client.cursors.filter(
      (cursor) => cursor.userId !== this.currentUserId
    );
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.client.isConnected;
  }

  /**
   * Get current room ID
   */
  get roomId(): string | null {
    return this.currentRoomId;
  }

  /**
   * Get current user ID
   */
  get userId(): string | null {
    return this.currentUserId;
  }

  /**
   * Disconnect from collaboration
   */
  disconnect(): void {
    this.client.disconnect();
    this.isInitialized = false;
    this.currentRoomId = null;
    this.currentUserId = null;
    this.pendingChanges.clear();

    if (this.cursorDebounceTimeout) {
      clearTimeout(this.cursorDebounceTimeout);
    }
  }

  /**
   * Generate a unique room ID
   */
  static generateRoomId(): string {
    return `room_${nanoid(12)}`;
  }

  /**
   * Generate a unique user ID
   */
  static generateUserId(): string {
    return `user_${nanoid(8)}`;
  }

  /** Permissions: block/unblock helpers */
  blockUser(userId: string): void {
    this.client.blockUser(userId);
  }

  unblockUser(userId: string): void {
    this.client.unblockUser(userId);
  }

  isUserBlocked(userId: string): boolean {
    return this.client.isBlocked(userId);
  }
}
