"use client";

import React, { useEffect } from 'react';
import type { User } from '@/lib/collaboration/types';
import { cn } from '@/lib/utils';

export function filterUsers(users: User[], query: string): User[] {
  const q = query.trim().toLowerCase();
  if (!q) return users.slice(0, 8);
  return users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 8);
}

export function extractMentions(content: string, users: User[]): string[] {
  const nameToId = new Map<string, string>();
  for (const u of users) nameToId.set(u.name.toLowerCase(), u.id);
  const ids = new Set<string>();
  const regex = /(^|\s)@([^\s@]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    const name = (m[2] || '').toLowerCase();
    const id = nameToId.get(name);
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

export function renderContentWithMentions(
  content: string,
  users: User[]
) {
  const names = new Set(users.map((u) => u.name));
  const parts: React.ReactNode[] = [];
  const regex = /(@[^\s@]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    if (start > lastIndex) parts.push(content.slice(lastIndex, start));
    const token = match[1];
    const name = token.slice(1);
    if (names.has(name)) {
      parts.push(
        <span key={start} className="text-primary font-medium">
          {token}
        </span>
      );
    } else {
      parts.push(token);
    }
    lastIndex = start + token.length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return <>{parts}</>;
}

export function MentionDropdown({
  users,
  activeIndex,
  onSelect,
  onClose,
}: {
  users: User[];
  activeIndex: number;
  onSelect: (user: User) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!users || users.length === 0) return null;

  return (
    <div className="absolute left-2 top-full mt-1 z-50 w-64 max-h-60 overflow-auto rounded-md border bg-background shadow">
      {users.map((u, i) => (
        <div
          key={u.id}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent',
            i === activeIndex && 'bg-accent'
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u);
          }}
        >
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: u.color }}
          />
          <span className="truncate">{u.name}</span>
        </div>
      ))}
    </div>
  );
}

export function handleMentionDetect(
  el: HTMLInputElement | HTMLTextAreaElement,
  setOpen: (v: boolean) => void,
  setQuery: (v: string) => void,
  setIndex: (v: number) => void
) {
  const value = el.value;
  const caret = el.selectionStart ?? value.length;
  const before = value.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at === -1) {
    setOpen(false);
    setQuery('');
    return;
  }
  if (at > 0 && !/\s/.test(before[at - 1])) {
    setOpen(false);
    setQuery('');
    return;
  }
  const query = before.slice(at + 1);
  if (/\s/.test(query)) {
    setOpen(false);
    setQuery('');
    return;
  }
  setOpen(true);
  setQuery(query);
  setIndex(0);
}

export function handleMentionKeys(
  e: React.KeyboardEvent,
  users: User[],
  open: boolean,
  index: number,
  setIndex: (v: number) => void,
  onPick: (u: User) => void,
  onClose?: () => void
): boolean {
  if (!open) return false;
  if (e.key === 'ArrowDown') {
    const max = Math.max(0, Math.min(8, users.length) - 1);
    setIndex(Math.min(max, index + 1));
    return true;
  }
  if (e.key === 'ArrowUp') {
    setIndex(Math.max(0, index - 1));
    return true;
  }
  if (e.key === 'Enter') {
    const list = users.slice(0, 8);
    const u = list[index] || list[0];
    if (u) onPick(u);
    return true;
  }
  if (e.key === 'Escape') {
    onClose?.();
    return true;
  }
  return false;
}

export function insertMentionAtCaret(
  ref:
    | React.RefObject<HTMLInputElement | null>
    | React.RefObject<HTMLTextAreaElement | null>,
  setValue: (v: string) => void,
  user: User
) {
  const el = ref.current;
  if (!el) return;
  const value = el.value;
  const caret = el.selectionStart ?? value.length;
  const before = value.slice(0, caret);
  const after = value.slice(el.selectionEnd ?? caret);
  const at = before.lastIndexOf('@');
  if (at === -1) return;
  const newBefore = before.slice(0, at) + `@${user.name} `;
  const next = newBefore + after;
  setValue(next);
  const pos = newBefore.length;
  requestAnimationFrame(() => {
    el.setSelectionRange(pos, pos);
    el.focus();
  });
}
