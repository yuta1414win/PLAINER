'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserCursor } from '@/lib/collaboration/types';

interface UserCursorsProps {
  cursors: UserCursor[];
  containerRef?: React.RefObject<HTMLElement>;
  showLabels?: boolean;
  className?: string;
}

interface CursorComponentProps {
  cursor: UserCursor;
  showLabel?: boolean;
}

const CursorComponent: React.FC<CursorComponentProps> = ({
  cursor,
  showLabel = true,
}) => {
  const { position, user } = cursor;
  const [isVisible, setIsVisible] = useState(true);

  // Hide cursor if it's outside bounds
  useEffect(() => {
    setIsVisible(position.x >= 0 && position.y >= 0);
  }, [position.x, position.y]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="pointer-events-none absolute z-50"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: position.x,
        y: position.y,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        duration: 0.1,
        ease: 'easeOut',
      }}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      {/* Cursor Arrow */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className="drop-shadow-sm"
        style={{ color: user.color }}
      >
        <path
          d="M0 0L20 12L8 16L0 0Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* User Label */}
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-5 top-0 z-10"
        >
          <div
            className="px-2 py-1 text-xs font-medium text-white rounded-md whitespace-nowrap shadow-lg"
            style={{ backgroundColor: user.color }}
          >
            {user.name}
          </div>
          {/* Speech bubble tail */}
          <div
            className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-0 h-0"
            style={{
              borderRight: `4px solid ${user.color}`,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
            }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export const UserCursors: React.FC<UserCursorsProps> = ({
  cursors,
  containerRef,
  showLabels = true,
  className = '',
}) => {
  const [activeCursors, setActiveCursors] = useState<UserCursor[]>([]);

  useEffect(() => {
    // Filter out old cursors (older than 30 seconds)
    const now = new Date();
    const recentCursors = cursors.filter((cursor) => {
      const age = now.getTime() - cursor.timestamp.getTime();
      return age < 30000; // 30 seconds
    });

    setActiveCursors(recentCursors);

    // Cleanup interval to remove old cursors
    const interval = setInterval(() => {
      const currentTime = new Date();
      setActiveCursors((prev) =>
        prev.filter((cursor) => {
          const age = currentTime.getTime() - cursor.timestamp.getTime();
          return age < 30000;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [cursors]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <AnimatePresence>
        {activeCursors.map((cursor) => (
          <CursorComponent
            key={cursor.userId}
            cursor={cursor}
            showLabel={showLabels}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook for cursor tracking
export const useCursorTracking = (
  element: HTMLElement | null,
  onCursorMove?: (position: { x: number; y: number }) => void
) => {
  useEffect(() => {
    if (!element || !onCursorMove) return;

    let animationFrame: number | null = null;

    const handleMouseMove = (event: MouseEvent) => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const position = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        onCursorMove(position);
      });
    };

    const handleMouseLeave = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      onCursorMove({ x: -1, y: -1 });
    };

    element.addEventListener('mousemove', handleMouseMove, { passive: true });
    element.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [element, onCursorMove]);
};

export default UserCursors;
