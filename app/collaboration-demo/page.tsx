'use client';

import React, { useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCollaboration } from '@/hooks/use-collaboration';
import { UserCursors } from '@/components/collaboration/user-cursors';
import { PresenceIndicator } from '@/components/collaboration/presence-indicator';
import { ChatPanel } from '@/components/collaboration/chat-panel';
import { Users, Copy, Wifi, WifiOff } from 'lucide-react';

const DEMO_ROOM_ID = 'demo-room-123';

export default function CollaborationDemo() {
  const [userId] = useState(() => `user_${nanoid(8)}`);
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState(DEMO_ROOM_ID);
  const [isJoined, setIsJoined] = useState(false);
  const [password, setPassword] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [sharedText, setSharedText] = useState(
    'Start typing here to see real-time collaboration...'
  );
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [inviteExpiry, setInviteExpiry] = useState<number>(3600);
  const [roomPassword, setRoomPassword] = useState('');

  // Refs for tracking elements
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const collaboration = useCollaboration(
    {
      enabled: isJoined,
      enableCursors: true,
      enablePresence: true,
      enableContentSync: true,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
    },
    {
      onConnect: () => {
        console.log('Connected to collaboration!');
      },
      onDisconnect: () => {
        console.log('Disconnected from collaboration');
      },
      onUserJoin: (user) => {
        console.log(`User joined: ${user.name}`);
      },
      onUserLeave: (userId) => {
        console.log(`User left: ${userId}`);
      },
      onContentChange: (change) => {
        console.log('Content changed:', change);
        // Apply changes to shared text
        if (change.elementId === 'shared-textarea') {
          applyContentChange(change);
        }
      },
      onError: (error) => {
        console.error('Collaboration error:', error);
      },
    }
  );

  // Set up cursor and text tracking
  useEffect(() => {
    if (!collaboration.manager || !isJoined) return;

    const cleanupFunctions: Array<() => void> = [];

    // Track cursor on container
    if (containerRef.current) {
      const cleanup = collaboration.trackCursor(containerRef.current);
      cleanupFunctions.push(cleanup);
    }

    // Track text input changes
    if (textareaRef.current) {
      const cleanup = collaboration.trackTextInput(textareaRef.current);
      cleanupFunctions.push(cleanup);
    }

    if (inputRef.current) {
      const cleanup = collaboration.trackTextInput(inputRef.current);
      cleanupFunctions.push(cleanup);
    }

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [collaboration.manager, isJoined]);

  const applyContentChange = (change: any) => {
    // Simple content change application
    // In a real app, you'd want more sophisticated operational transform
    if (change.type === 'insert') {
      setSharedText(
        (prev) =>
          prev.slice(0, change.position) +
          change.content +
          prev.slice(change.position)
      );
    } else if (change.type === 'delete') {
      setSharedText(
        (prev) =>
          prev.slice(0, change.position) +
          prev.slice(change.position + change.content.length)
      );
    } else if (change.type === 'replace') {
      setSharedText(
        (prev) =>
          prev.slice(0, change.position) +
          change.content +
          prev.slice(change.position + change.content.length)
      );
    }
  };

  const handleJoin = async () => {
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      const opts: { password?: string; inviteToken?: string } = {};
      if (password) opts.password = password;
      if (inviteToken) opts.inviteToken = inviteToken;
      await collaboration.connect(roomId, userId, userName, opts);
      setIsJoined(true);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room. Please try again.');
    }
  };

  const handleLeave = () => {
    collaboration.disconnect();
    setIsJoined(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
  };

  const generateNewRoom = () => {
    const newRoomId = `room_${nanoid(12)}`;
    setRoomId(newRoomId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Real-time Collaboration Demo
          </h1>
          <p className="text-gray-600">
            Experience live cursor tracking, user presence, and collaborative
            editing
          </p>
        </div>

        {/* Connection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {isJoined ? 'Connected' : 'Join Collaboration Room'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isJoined ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room ID
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="Room ID"
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm" onClick={copyRoomId}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (optional)
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Room password"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invite Token (optional)
                    </label>
                    <Input
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      placeholder="Paste invite token"
                      className="w-full"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <Button onClick={handleJoin} className="w-full">
                      Join Room
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={generateNewRoom}>
                    Generate New Room
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {collaboration.isConnected ? (
                      <Wifi className="w-3 h-3 text-green-600" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-red-600" />
                    )}
                    {collaboration.connectionStatus}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Room:{' '}
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {roomId}
                    </code>
                  </span>
                  <span className="text-sm text-gray-600">
                    You: <strong>{userName}</strong>
                  </span>
                </div>
                <div className="flex gap-2">
                  {!collaboration.isConnected && (
                    <Button variant="outline" onClick={collaboration.retry}>
                      Retry Connection
                    </Button>
                  )}
                  <Button variant="destructive" onClick={handleLeave}>
                    Leave Room
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Presence Indicator */}
        {isJoined && (
          <PresenceIndicator
            users={collaboration.users}
            currentUserId={userId}
            isConnected={collaboration.isConnected}
            isReconnecting={collaboration.isReconnecting}
            onReconnect={collaboration.retry}
          />
        )}

        {/* Collaboration Area */}
        {isJoined && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shared Text Editor */}
            <Card className="relative">
              <CardHeader>
                <CardTitle>Collaborative Text Editor</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3" ref={containerRef}>
                <div className="flex gap-2 items-center text-sm text-gray-600">
                  <span>
                    Role: <strong>{collaboration.currentRole || 'unknown'}</strong>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => collaboration.acquireLock('shared-textarea')}
                  >
                    Acquire lock (textarea)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => collaboration.releaseLock('shared-textarea')}
                  >
                    Release lock
                  </Button>
                </div>
                <Textarea
                  ref={textareaRef}
                  id="shared-textarea"
                  value={sharedText}
                  onChange={(e) => setSharedText(e.target.value)}
                  className="min-h-[300px] w-full"
                  placeholder="Start typing to see real-time collaboration..."
                />

                {/* User Cursors Overlay */}
                <UserCursors
                  cursors={collaboration.cursors}
                  showLabels={true}
                />
              </CardContent>
            </Card>

            {/* Interactive Elements */}
            <Card className="relative">
              <CardHeader>
                <CardTitle>Interactive Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4" ref={containerRef}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shared Input Field
                  </label>
                  <Input
                    ref={inputRef}
                    placeholder="Type here and see cursors move..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Move your cursor around this area
                  </label>
                  <div className="h-40 bg-gray-100 rounded-lg p-4 relative">
                    <p className="text-gray-600">
                      Hover and move your mouse around this box to see real-time
                      cursor tracking. Other users will see your cursor position
                      with your name.
                    </p>
                  </div>
                </div>

                {/* User Cursors Overlay for this section */}
                <UserCursors
                  cursors={collaboration.cursors}
                  showLabels={true}
                />
              </CardContent>
            </Card>

            {/* Real-time Chat */}
            <ChatPanel
              className="lg:col-span-1"
              messages={collaboration.chatMessages}
              currentUser={collaboration.currentUser}
              onSend={(t) => collaboration.sendChatMessage(t)}
              onUploadFiles={(files, msg) => collaboration.sendChatFiles(files, msg)}
              onReact={(id, e) => collaboration.reactToMessage(id, e)}
            />

            {/* Room Management (owner only) */}
            <Card>
              <CardHeader>
                <CardTitle>Room Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  Owner-only actions (requires Sign in and owner role)
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Create Invite</div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                    </select>
                    <Input
                      type="number"
                      className="w-36"
                      value={inviteExpiry}
                      onChange={(e) => setInviteExpiry(Number(e.target.value) || 3600)}
                      placeholder="expires (sec)"
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/collaboration', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'create_invite',
                              roomId,
                              data: { role: inviteRole, expiresInSeconds: inviteExpiry },
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error || 'failed');
                          setInviteUrl(data.url);
                        } catch (e) {
                          alert('Failed to create invite (need owner role).');
                        }
                      }}
                    >
                      Generate
                    </Button>
                  </div>
                  {inviteUrl && (
                    <div className="text-sm break-all">
                      Invite URL: <a className="underline" href={inviteUrl}>{inviteUrl}</a>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Set Room Password</div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="password"
                      className="w-60"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="new password"
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/collaboration', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'set_room_password',
                              roomId,
                              data: { password: roomPassword },
                            }),
                          });
                          if (!res.ok) throw new Error('failed');
                          alert('Password updated');
                        } catch {
                          alert('Failed to set password (need owner role).');
                        }
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Debug Info */}
        {isJoined && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Connection Status
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>
                      Status:{' '}
                      <Badge
                        variant={
                          collaboration.isConnected ? 'default' : 'destructive'
                        }
                      >
                        {collaboration.connectionStatus}
                      </Badge>
                    </li>
                    <li>
                      Reconnecting:{' '}
                      {collaboration.isReconnecting ? 'Yes' : 'No'}
                    </li>
                    <li>Error: {collaboration.error || 'None'}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Users ({collaboration.users.length})
                  </h4>
                  <ul className="text-sm space-y-2">
                    {collaboration.users.map((user) => {
                      const isSelf = user.id === userId;
                      const isBlocked = collaboration.isUserBlocked(user.id);
                      const canManage = collaboration.currentRole === 'owner';
                      return (
                        <li key={user.id} className="flex items-center gap-2 flex-wrap">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: user.color }}
                          />
                          <span>
                            {user.name} {isSelf && '(you)'}
                            {user.role ? ` · role: ${user.role}` : ''}
                          </span>
                          {!isSelf && (
                            <>
                              <Button
                                variant={isBlocked ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() =>
                                  isBlocked
                                    ? collaboration.unblockUser(user.id)
                                    : collaboration.blockUser(user.id)
                                }
                              >
                                {isBlocked ? 'Unblock' : 'Block'}
                              </Button>
                              {canManage && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => collaboration.setUserRole(user.id, 'viewer')}
                                  >
                                    Set Viewer
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => collaboration.setUserRole(user.id, 'editor')}
                                  >
                                    Set Editor
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => collaboration.kickUser(user.id)}
                                  >
                                    Kick
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Active Cursors ({collaboration.cursors.length})
                  </h4>
                  <ul className="text-sm space-y-1">
                    {collaboration.cursors.map((cursor) => (
                      <li key={cursor.userId}>
                        {cursor.user.name}: ({Math.round(cursor.position.x)},{' '}
                        {Math.round(cursor.position.y)})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Open this page in multiple browser tabs or share the URL with
                others
              </li>
              <li>
                Use the same Room ID to join the same collaboration session
              </li>
              <li>Enter different names for each user</li>
              <li>Move your cursor around and see real-time cursor tracking</li>
              <li>
                Type in the text areas to see collaborative editing (basic
                implementation)
              </li>
              <li>Watch the presence indicator to see who's online</li>
              <li>
                Try disconnecting your internet to test reconnection logic
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
