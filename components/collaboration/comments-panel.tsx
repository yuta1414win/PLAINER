'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { StepComment, User } from '@/lib/collaboration/types';
import { cn } from '@/lib/utils';
import {
  MentionDropdown,
  extractMentions,
  filterUsers,
  handleMentionDetect,
  handleMentionKeys,
  insertMentionAtCaret,
  renderContentWithMentions,
} from '@/components/collaboration/mentions';

interface CommentsPanelProps {
  stepId: string;
  users: User[];
  currentUser: User | null;
  getComments: (stepId: string) => StepComment[];
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
  className?: string;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  stepId,
  users,
  currentUser,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  resolveComment,
  className,
}) => {
  const comments = getComments(stepId);
  const [content, setContent] = useState('');
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  // Mention state for new comment
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    const repliesMap = new Map<string, StepComment[]>();
    for (const c of comments) {
      if (c.parentId) {
        const list = repliesMap.get(c.parentId) || [];
        list.push(c);
        repliesMap.set(c.parentId, list);
      }
    }
    return roots.map((root) => ({
      root,
      replies: (repliesMap.get(root.id) || []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }));
  }, [comments]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const mentions = extractMentions(trimmed, users);
    addComment({ stepId, content: trimmed, mentions });
    setContent('');
    setMentionOpen(false);
    setMentionQuery('');
  };


  const addReply = (rootId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const mentions = extractMentions(trimmed, users);
    addComment({ stepId, content: trimmed, parentId: rootId, mentions });
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-base">コメント</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment */}
        <div className="space-y-2 relative">
          <Textarea
            ref={contentRef}
            placeholder="コメントを追加…（@でユーザーをメンション）"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleMentionDetect(e.target, setMentionOpen, setMentionQuery, setMentionIndex);
            }}
            onKeyDown={(e) => {
              const filtered = filterUsers(users, mentionQuery);
              if (handleMentionKeys(e, filtered, mentionOpen, mentionIndex, setMentionIndex, (u) => {
                insertMentionAtCaret(contentRef, setContent, u);
                setMentionOpen(false);
                setMentionQuery('');
              }, () => setMentionOpen(false))) {
                e.preventDefault();
              }
            }}
            rows={3}
          />
          {mentionOpen && (
            <MentionDropdown
              users={filterUsers(users, mentionQuery)}
              activeIndex={mentionIndex}
              onSelect={(u) => {
                insertMentionAtCaret(contentRef, setContent, u);
                setMentionOpen(false);
                setMentionQuery('');
                setMentionIndex(0);
              }}
              onClose={() => setMentionOpen(false)}
            />
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmit} disabled={!content.trim()}>
              追加
            </Button>
          </div>
        </div>

        <Separator />

        {/* Comments list */}
        <div className="space-y-4">
          {threads.length === 0 && (
            <div className="text-sm text-muted-foreground">コメントはありません。</div>
          )}
          {threads.map(({ root, replies }) => (
            <ThreadItem
              key={root.id}
              root={root}
              replies={replies}
              canEdit={currentUser?.id === root.authorId}
              users={users}
              onUpdate={(id, newText) =>
                updateComment({
                  id,
                  stepId,
                  content: newText,
                  mentions: extractMentions(newText, users),
                })
              }
              onDelete={(id) => deleteComment(id, stepId)}
              onResolve={(id, resolved) => resolveComment(id, stepId, resolved)}
              onReply={(text) => addReply(root.id, text)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ThreadItem: React.FC<{
  root: StepComment;
  replies: StepComment[];
  canEdit: boolean;
  users: User[];
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onReply: (text: string) => void;
}> = ({ root, replies, canEdit, users, onUpdate, onDelete, onResolve, onReply }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(root.content);
  const [replyText, setReplyText] = useState('');
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const replyRef = useRef<HTMLInputElement | null>(null);
  // Mention states for edit
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionQuery, setEditMentionQuery] = useState('');
  const [editMentionIndex, setEditMentionIndex] = useState(0);
  // Mention states for reply
  const [replyMentionOpen, setReplyMentionOpen] = useState(false);
  const [replyMentionQuery, setReplyMentionQuery] = useState('');
  const [replyMentionIndex, setReplyMentionIndex] = useState(0);

  const save = () => {
    const trimmed = text.trim();
    if (trimmed) onUpdate(root.id, trimmed);
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className={cn('rounded-md border p-2', root.resolved && 'opacity-60')}> 
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{root.authorName}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(root.createdAt).toLocaleString()}
          </div>
        </div>
        {isEditing ? (
          <div className="space-y-2 mt-2 relative">
            <Textarea
              ref={editRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleMentionDetect(e.target, setEditMentionOpen, setEditMentionQuery, setEditMentionIndex);
              }}
              onKeyDown={(e) => {
                const filtered = filterUsers(users, editMentionQuery);
                if (
                  handleMentionKeys(
                    e,
                    filtered,
                    editMentionOpen,
                    editMentionIndex,
                    setEditMentionIndex,
                    (u) => {
                      insertMentionAtCaret(editRef, setText, u);
                      setEditMentionOpen(false);
                      setEditMentionQuery('');
                    },
                    () => setEditMentionOpen(false)
                  )
                ) {
                  e.preventDefault();
                }
              }}
              rows={3}
            />
            {editMentionOpen && (
              <MentionDropdown
                users={filterUsers(users, editMentionQuery)}
                activeIndex={editMentionIndex}
                onSelect={(u) => {
                  insertMentionAtCaret(editRef, setText, u);
                  setEditMentionOpen(false);
                  setEditMentionQuery('');
                  setEditMentionIndex(0);
                }}
                onClose={() => setEditMentionOpen(false)}
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button size="sm" onClick={save}>
                保存
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm mt-2 whitespace-pre-wrap">{renderContentWithMentions(root.content, users)}</div>
        )}
        <div className="flex gap-2 mt-2 justify-end">
          {!root.resolved && (
            <Button size="sm" variant="secondary" onClick={() => onResolve(root.id, true)}>
              解決済みにする
            </Button>
          )}
          {root.resolved && (
            <Button size="sm" variant="secondary" onClick={() => onResolve(root.id, false)}>
              再オープン
            </Button>
          )}
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditing((v) => !v)}>
                編集
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(root.id)}>
                削除
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Replies */}
      <div className="ml-4 space-y-2">
        {replies.map((r) => (
          <div key={r.id} className="rounded-md border p-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{r.authorName}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-sm mt-2 whitespace-pre-wrap">{renderContentWithMentions(r.content, users)}</div>
          </div>
        ))}

        <div className="flex gap-2 items-start relative">
          <Input
            ref={replyRef}
            placeholder="返信を追加…（@でメンション）"
            value={replyText}
            onChange={(e) => {
              setReplyText(e.target.value);
              handleMentionDetect(e.target, setReplyMentionOpen, setReplyMentionQuery, setReplyMentionIndex);
            }}
            onKeyDown={(e) => {
              const filtered = filterUsers(users, replyMentionQuery);
              if (
                handleMentionKeys(
                  e,
                  filtered,
                  replyMentionOpen,
                  replyMentionIndex,
                  setReplyMentionIndex,
                  (u) => {
                    insertMentionAtCaret(replyRef, setReplyText, u);
                    setReplyMentionOpen(false);
                    setReplyMentionQuery('');
                  },
                  () => setReplyMentionOpen(false)
                )
              ) {
                e.preventDefault();
              }
            }}
            className="flex-1"
          />
          {replyMentionOpen && (
            <MentionDropdown
              users={filterUsers(users, replyMentionQuery)}
              activeIndex={replyMentionIndex}
              onSelect={(u) => {
                insertMentionAtCaret(replyRef, setReplyText, u);
                setReplyMentionOpen(false);
                setReplyMentionQuery('');
                setReplyMentionIndex(0);
              }}
              onClose={() => setReplyMentionOpen(false)}
            />
          )}
          <Button
            size="sm"
            onClick={() => {
              const t = replyText.trim();
              if (t) {
                onReply(t);
                setReplyText('');
              }
            }}
          >
            返信
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;
