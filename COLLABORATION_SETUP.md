# Real-time Collaboration System Setup

This document provides setup instructions for the real-time collaboration system implemented in PLAINER.

## Overview

The collaboration system includes:

- **WebSocket client** with automatic reconnection
- **Real-time cursor tracking** across users
- **User presence management** (online/offline status)
- **Collaborative editing** with conflict resolution
- **Visual components** for cursors and presence indicators

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   React Client  │ ←──────────────→ │  Socket.IO      │
│                 │                 │  Server         │
│ - UserCursors   │                 │                 │
│ - PresenceUI    │                 │ - Room Mgmt     │
│ - Collaboration │                 │ - User Tracking │
│   Manager       │                 │ - Event Routing │
└─────────────────┘                 └─────────────────┘
```

## Environment Configuration

Add these environment variables to your `.env.local` file:

```bash
# WebSocket Configuration
NEXT_PUBLIC_WS_URL=http://localhost:3001
WS_PORT=3001

# Production WebSocket URL (set in production)
# NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

## File Structure

```
lib/collaboration/
├── types.ts                    # TypeScript type definitions
├── websocket-client.ts         # WebSocket client with reconnection
├── collaboration-manager.ts    # Main collaboration manager

components/collaboration/
├── user-cursors.tsx           # Real-time cursor display
├── presence-indicator.tsx     # User presence UI

hooks/
├── use-collaboration.ts       # React hooks for collaboration

app/api/collaboration/
├── route.ts                   # WebSocket server endpoint

app/collaboration-demo/
├── page.tsx                   # Demo page
```

## Quick Start

### 1. Install Dependencies

The necessary dependencies are already installed:

- `socket.io` - WebSocket server
- `socket.io-client` - WebSocket client
- `nanoid` - Unique ID generation

### 2. Start the Development Server

```bash
npm run dev
# or
pnpm dev
```

The WebSocket server will automatically start on port 3001.

### 3. Test the Demo

Navigate to `/collaboration-demo` to see the collaboration system in action.

## Usage Examples

### Basic Collaboration Hook

```tsx
import { useCollaboration } from '@/hooks/use-collaboration';

function MyComponent() {
  const collaboration = useCollaboration(
    {
      enabled: true,
      enableCursors: true,
      enablePresence: true,
      autoReconnect: true,
    },
    {
      onUserJoin: (user) => console.log('User joined:', user.name),
      onUserLeave: (userId) => console.log('User left:', userId),
      onCursorMove: (cursor) => console.log('Cursor moved:', cursor),
    }
  );

  const joinRoom = async () => {
    await collaboration.connect('room-123', 'user-456', 'John Doe');
  };

  return (
    <div>
      <button onClick={joinRoom}>Join Room</button>
      {collaboration.isConnected && (
        <p>Connected with {collaboration.users.length} users</p>
      )}
    </div>
  );
}
```

### Cursor Tracking

```tsx
import { UserCursors } from '@/components/collaboration/user-cursors';
import { useRef, useEffect } from 'react';

function TrackableArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const collaboration = useCollaboration();

  useEffect(() => {
    if (!containerRef.current || !collaboration.manager) return;
    return collaboration.trackCursor(containerRef.current);
  }, [collaboration.manager]);

  return (
    <div ref={containerRef} className="relative">
      <p>Move your cursor here</p>
      <UserCursors
        cursors={collaboration.cursors}
        containerRef={containerRef}
        showLabels={true}
      />
    </div>
  );
}
```

### Presence Indicator

```tsx
import { PresenceIndicator } from '@/components/collaboration/presence-indicator';

function CollaborationHeader() {
  const collaboration = useCollaboration();

  return (
    <PresenceIndicator
      users={collaboration.users}
      currentUserId={collaboration.currentUser?.id}
      isConnected={collaboration.isConnected}
      isReconnecting={collaboration.isReconnecting}
      onReconnect={collaboration.retry}
    />
  );
}
```

### Text Input Collaboration

```tsx
import { useRef, useEffect } from 'react';

function CollaborativeTextarea() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const collaboration = useCollaboration();

  useEffect(() => {
    if (!textareaRef.current || !collaboration.manager) return;
    return collaboration.trackTextInput(textareaRef.current);
  }, [collaboration.manager]);

  return (
    <textarea
      ref={textareaRef}
      placeholder="Start typing..."
      className="w-full h-32"
    />
  );
}
```

## API Reference

### CollaborationManager

Main class for managing collaboration features.

```typescript
class CollaborationManager {
  // Connect to a room
  async initialize(
    options: CollaborationOptions,
    handlers?: CollaborationEventHandlers
  ): Promise<void>;

  // Track cursor movement on an element
  trackCursor(element: HTMLElement): () => void;

  // Track text input changes
  trackTextInput(element: HTMLInputElement | HTMLTextAreaElement): () => void;

  // Send content changes
  sendContentChange(change: ContentChange): void;

  // Get current users and cursors
  getUsers(): User[];
  getCursors(): UserCursor[];

  // Connection management
  get isConnected(): boolean;
  disconnect(): void;
}
```

### Types

Key TypeScript interfaces:

```typescript
interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface UserCursor {
  userId: string;
  position: CursorPosition;
  user: User;
  timestamp: Date;
}

interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

interface ContentChange {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  userId: string;
  timestamp: Date;
  elementId?: string;
}
```

## Production Deployment

### Environment Variables

Set these for production:

```bash
NEXT_PUBLIC_WS_URL=wss://your-domain.com
WS_PORT=3001
NEXTAUTH_URL=https://your-domain.com
```

### WebSocket Server

The WebSocket server can be deployed separately or alongside Next.js:

1. **Separate deployment**: Deploy the WebSocket server as a standalone service
2. **Next.js integration**: The current implementation runs alongside Next.js

### Scaling Considerations

For production scale:

1. **Redis adapter**: Use Redis for Socket.IO scaling across multiple instances
2. **Database persistence**: Store room and user data in a database instead of memory
3. **Rate limiting**: Implement rate limiting for WebSocket events
4. **Authentication**: Add proper user authentication
5. **SSL/TLS**: Use secure WebSocket connections (wss://)

## Troubleshooting

### Connection Issues

1. Check if the WebSocket port (3001) is accessible
2. Verify CORS settings in the Socket.IO server
3. Check browser console for WebSocket errors

### Cursor Not Showing

1. Ensure the container element has `position: relative`
2. Check if cursor tracking is enabled
3. Verify the user has joined a room

### Reconnection Problems

1. Check network connectivity
2. Verify the `autoReconnect` option is enabled
3. Check the `maxReconnectAttempts` setting

## Security Considerations

1. **Input validation**: Validate all incoming WebSocket data
2. **Rate limiting**: Prevent spam by limiting event frequency
3. **Authentication**: Verify user identity before joining rooms
4. **Content filtering**: Filter or sanitize shared content
5. **Room access control**: Implement proper room permissions

## Browser Compatibility

The collaboration system supports:

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

WebSocket and modern JavaScript features are required.

## Performance

- **Cursor updates**: Debounced to 50ms intervals
- **Memory cleanup**: Automatic cleanup of old users and rooms
- **Connection pooling**: Efficient WebSocket connection management
- **Event batching**: Optimized event handling for better performance
