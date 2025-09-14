'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LockInfo } from '@/lib/collaboration/types';
import { Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockIndicatorProps {
  resourceId: string;
  locks: LockInfo[];
  currentUserId?: string;
  onAcquire: (resourceId: string) => void;
  onRelease: (resourceId: string) => void;
  className?: string;
  compact?: boolean;
}

export const LockIndicator: React.FC<LockIndicatorProps> = ({
  resourceId,
  locks,
  currentUserId,
  onAcquire,
  onRelease,
  className,
  compact = true,
}) => {
  const lock = locks.find((l) => l.resourceId === resourceId);
  const owned = lock && lock.ownerId === currentUserId;
  const lockedByOther = lock && lock.ownerId !== currentUserId;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!lock && (
        <>
          {!compact && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <LockOpen className="w-3 h-3" />
              Unlocked
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAcquire(resourceId)}
          >
            <Lock className="w-3 h-3 mr-1" />
            Lock
          </Button>
        </>
      )}
      {owned && (
        <>
          <Badge className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            You
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRelease(resourceId)}
          >
            Release
          </Button>
        </>
      )}
      {lockedByOther && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          {lock?.ownerName || lock?.ownerId || 'Locked'}
        </Badge>
      )}
    </div>
  );
};

export default LockIndicator;

