'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import type { User } from '@/lib/collaboration/types';

interface PresenceIndicatorProps {
  users: User[];
  currentUserId?: string;
  isConnected: boolean;
  isReconnecting?: boolean;
  onReconnect?: () => void;
  maxVisibleUsers?: number;
  className?: string;
}

interface UserAvatarProps {
  user: User;
  isCurrentUser?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  isCurrentUser = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white shadow-sm ring-2 ring-white`}
      style={{ backgroundColor: user.color }}
      title={`${user.name}${isCurrentUser ? ' (you)' : ''}`}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{getInitials(user.name)}</span>
      )}

      {/* Online status indicator */}
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
          user.isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />

      {/* Current user indicator */}
      {isCurrentUser && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white" />
      )}
    </motion.div>
  );
};

const ConnectionStatus: React.FC<{
  isConnected: boolean;
  isReconnecting?: boolean;
  onReconnect?: () => void;
}> = ({ isConnected, isReconnecting, onReconnect }) => {
  if (isConnected) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <Wifi className="w-4 h-4" />
        <span className="text-xs font-medium">Connected</span>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className="flex items-center gap-1 text-yellow-600">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RotateCcw className="w-4 h-4" />
        </motion.div>
        <span className="text-xs font-medium">Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-red-600">
      <WifiOff className="w-4 h-4" />
      <span className="text-xs font-medium">Disconnected</span>
      {onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  currentUserId,
  isConnected,
  isReconnecting = false,
  onReconnect,
  maxVisibleUsers = 5,
  className = '',
}) => {
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Separate current user from others
  const currentUser = users.find((user) => user.id === currentUserId);
  const otherUsers = users.filter((user) => user.id !== currentUserId);

  // Sort users by online status and name
  const sortedUsers = [...otherUsers].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.name.localeCompare(b.name);
  });

  const visibleUsers = showAllUsers
    ? sortedUsers
    : sortedUsers.slice(0, maxVisibleUsers);
  const hiddenUserCount = sortedUsers.length - maxVisibleUsers;

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm ${className}`}
    >
      {/* Connection Status */}
      <ConnectionStatus
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        onReconnect={onReconnect}
      />

      {/* Users Count */}
      <div className="flex items-center gap-1 text-gray-600">
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      {/* User Avatars */}
      <div className="flex items-center">
        {/* Current User */}
        {currentUser && (
          <div className="mr-2">
            <UserAvatar user={currentUser} isCurrentUser={true} />
          </div>
        )}

        {/* Other Users */}
        <div className="flex items-center -space-x-2">
          <AnimatePresence>
            {visibleUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ scale: 0, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                style={{ zIndex: 10 - index }}
              >
                <UserAvatar user={user} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Show more button */}
          {hiddenUserCount > 0 && !showAllUsers && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setShowAllUsers(true)}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600 transition-colors ring-2 ring-white"
              style={{ zIndex: 1 }}
            >
              +{hiddenUserCount}
            </motion.button>
          )}

          {/* Show less button */}
          {showAllUsers && hiddenUserCount > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setShowAllUsers(false)}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600 transition-colors ring-2 ring-white ml-2"
            >
              ···
            </motion.button>
          )}
        </div>
      </div>

      {/* Detailed User List (when expanded) */}
      <AnimatePresence>
        {showAllUsers && sortedUsers.length > maxVisibleUsers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50"
          >
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              All Users
            </h4>
            <div className="space-y-2">
              {sortedUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <UserAvatar user={user} size="sm" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      user.isOnline
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {user.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAllUsers(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Show less
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Compact version for smaller spaces
export const CompactPresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  currentUserId,
  isConnected,
  isReconnecting = false,
  maxVisibleUsers = 3,
  className = '',
}) => {
  const otherUsers = users.filter((user) => user.id !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxVisibleUsers);
  const hiddenUserCount = otherUsers.length - maxVisibleUsers;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection indicator */}
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected
            ? 'bg-green-500'
            : isReconnecting
              ? 'bg-yellow-500'
              : 'bg-red-500'
        }`}
      />

      {/* User count */}
      <span className="text-xs text-gray-600">{users.length}</span>

      {/* User avatars */}
      <div className="flex -space-x-1">
        {visibleUsers.map((user) => (
          <UserAvatar key={user.id} user={user} size="sm" />
        ))}
        {hiddenUserCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 ring-2 ring-white">
            +{hiddenUserCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenceIndicator;
