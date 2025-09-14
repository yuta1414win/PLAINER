"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage, User } from '@/lib/collaboration/types';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: User | null;
  onSend: (text: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onUploadFiles?: (files: { file: File; dataUrl?: string }[], message?: string) => void | Promise<void>;
  className?: string;
}

const DEFAULT_REACTIONS = ['👍', '❤️', '🎉', '😄', '👀', '❗️'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUser,
  onSend,
  onReact,
  onUploadFiles,
  className,
}) => {
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<{ file: File; dataUrl?: string }[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const t = text.trim();
    if (!t && pendingFiles.length === 0) return;
    if (pendingFiles.length > 0 && onUploadFiles) {
      onUploadFiles(pendingFiles, t || undefined);
      setPendingFiles([]);
      setText('');
    } else if (t) {
      onSend(t);
      setText('');
    }
  };

  const handleFileChoose = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list: { file: File; dataUrl?: string }[] = [];
    for (const f of Array.from(files)) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(f);
        });
        list.push({ file: f, dataUrl });
      } catch {
        list.push({ file: f });
      }
    }
    setPendingFiles((prev) => [...prev, ...list]);
  };

  return (
    <Card className={cn('w-full h-[420px] flex flex-col', className)}>
      <CardHeader>
        <CardTitle className="text-base">リアルタイムチャット</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-2">
            {messages.map((m) => (
              <ChatMessageItem
                key={m.id}
                message={m}
                isSelf={m.userId === currentUser?.id}
                onReact={onReact}
              />)
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="メッセージを入力してEnterで送信"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <label className="px-3 py-2 border rounded cursor-pointer text-sm bg-background hover:bg-muted" title="ファイルを添付">
            📎 添付
            <input
              type="file"
              className="hidden"
              multiple
              onChange={(e) => handleFileChoose(e.target.files)}
            />
          </label>
          <Button onClick={handleSend} disabled={!text.trim()}>
            送信
          </Button>
        </div>

        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            追加する添付ファイル:
            {pendingFiles.map(({ file }, idx) => (
              <span key={idx} className="px-1.5 py-0.5 border rounded select-none bg-muted">
                {file.name} ({Math.round(file.size / 1024)} KB)
              </span>
            ))}
            <button
              className="ml-auto text-foreground/70 hover:text-foreground"
              onClick={() => setPendingFiles([])}
            >
              クリア
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          クイックリアクション:
          {DEFAULT_REACTIONS.map((e) => (
            <span key={e} className="px-1.5 py-0.5 border rounded select-none">
              {e}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ChatMessageItem: React.FC<{
  message: ChatMessage;
  isSelf?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
}> = ({ message, isSelf, onReact }) => {
  const time = useMemo(() => {
    try {
      return new Date(message.createdAt).toLocaleTimeString();
    } catch {
      return '';
    }
  }, [message.createdAt]);

  const reactions = message.reactions || {};

  return (
    <div className={cn('flex items-start gap-2', isSelf ? 'justify-end' : 'justify-start')}>
      {!isSelf && (
        <div
          className="w-2.5 h-2.5 mt-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: message.userColor || '#999' }}
        />
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm shadow',
          isSelf ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        )}
      >
        <div className="flex items-center gap-2 mb-0.5">
          {!isSelf && (
            <span className="text-xs font-medium opacity-80">
              {message.userName}
            </span>
          )}
          <span className={cn('text-[10px] opacity-70', isSelf ? 'text-white' : 'text-gray-500')}>
            {time}
          </span>
        </div>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.attachments.map((a) => (
              <a
                key={a.id}
                href={a.url || a.dataUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'block text-xs underline break-all',
                  isSelf ? 'text-white/90' : 'text-blue-700'
                )}
                download={a.fileName}
              >
                📎 {a.fileName} ({Math.round(a.size / 1024)} KB)
              </a>
            ))}
          </div>
        )}
        {/* Reactions */}
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(reactions).map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => onReact?.(message.id, emoji)}
              className={cn(
                'px-1.5 py-0.5 text-xs rounded border',
                'bg-white/70 hover:bg-white'
              )}
              title={`${emoji} x${users.length}`}
            >
              {emoji} {users.length}
            </button>
          ))}
        </div>
        {/* Actions */}
        {onReact && (
          <div className="mt-1 flex gap-1 opacity-80">
            {DEFAULT_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(message.id, e)}
                className={cn(
                  'px-1.5 py-0.5 text-xs rounded border',
                  'bg-white/60 hover:bg-white'
                )}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
