'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
  MessageCircle,
  Trash2,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveMessage } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface AIAssistantProps {
  onSuggestionApply?: (suggestion: string) => void;
  context?: {
    currentStep?: string;
    totalSteps?: number;
    selectedElement?: string;
  };
  className?: string;
}

const EXAMPLE_PROMPTS = [
  'この画面の重要な部分をハイライトして',
  'アクセシビリティを改善する注釈を追加',
  'ユーザーの注意を引く効果的なCTAを提案',
  '手順説明のための注釈を最適化',
];

type LiveMessagePayload = Partial<LiveMessage> & {
  timestamp?: string | number | Date;
  type?: LiveMessage['type'];
};

const SESSION_STORAGE_KEY = 'plainer_live_session_id';

export function AIAssistant({
  onSuggestionApply,
  context,
  className,
}: AIAssistantProps) {
  const ENABLE_STREAMING = true;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clientIdRef = useRef<string | null>(null);
  const startSessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const sessionRetryAtRef = useRef<number>(0);

  const ensureClientId = useCallback(() => {
    if (clientIdRef.current) return clientIdRef.current;
    if (typeof window === 'undefined') return null;

    const storageKey = 'plainer_client_id';
    try {
      let stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        if (typeof window.crypto?.randomUUID === 'function') {
          stored = window.crypto.randomUUID();
        } else {
          stored = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
        window.localStorage.setItem(storageKey, stored);
      }

      document.cookie = `plainer_client_id=${stored}; path=/; max-age=31536000; SameSite=Lax`;
      clientIdRef.current = stored;
      return stored;
    } catch (error) {
      console.warn('Failed to resolve client identifier', error);
      return null;
    }
  }, []);

  useEffect(() => {
    ensureClientId();
  }, [ensureClientId]);

  const transformLiveMessage = useCallback((live?: LiveMessagePayload): Message => {
    const role: Message['role'] = live?.type === 'user' ? 'user' : 'assistant';
    return {
      id: live?.id ?? `msg-${Date.now()}`,
      role,
      content: live?.content ?? '',
      timestamp:
        live?.timestamp instanceof Date
          ? live.timestamp
          : new Date(live?.timestamp ?? Date.now()),
      status: live?.type === 'error' ? 'error' : 'sent',
    };
  }, []);

  const restoreSession = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const storedSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedSessionId) return null;

    const clientId = ensureClientId();
    try {
      const response = await fetch(`/api/ai/live/session/${storedSessionId}`, {
        method: 'GET',
        headers: {
          ...(clientId ? { 'x-plainer-client-id': clientId } : {}),
          'x-plainer-session-id': storedSessionId,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
        return null;
      }

      const data = await response.json();
      const sessionMessages = Array.isArray(data?.session?.messages)
        ? (data.session.messages as LiveMessagePayload[])
        : [];

      setSessionId(storedSessionId);
      if (sessionMessages.length) {
        setMessages(sessionMessages.map(transformLiveMessage));
      }
      sessionRetryAtRef.current = 0;
      return storedSessionId;
    } catch (error) {
      console.error('Failed to restore AI session:', error);
      return null;
    }
  }, [ensureClientId, transformLiveMessage]);

  // スクロールを最下部に移動
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // セッション開始
  const startSession = useCallback(async () => {
    if (sessionId) return sessionId;
    if (startSessionPromiseRef.current) {
      return startSessionPromiseRef.current;
    }

    const now = Date.now();
    if (sessionRetryAtRef.current > now) {
      return null;
    }

    const promise = (async (): Promise<string | null> => {
      try {
        const restored = await restoreSession();
        if (restored) {
          return restored;
        }

        const clientId = ensureClientId();
        const candidateSessionId =
          typeof window === 'undefined'
            ? undefined
            : window.localStorage.getItem(SESSION_STORAGE_KEY) ?? undefined;

        const response = await fetch('/api/ai/live/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(clientId ? { 'x-plainer-client-id': clientId } : {}),
            ...(candidateSessionId
              ? { 'x-plainer-session-id': candidateSessionId }
              : {}),
          },
          body: JSON.stringify({
            clientInfo: 'web-client',
            metadata: {
              currentStep: context?.currentStep,
              totalSteps: context?.totalSteps,
              selectedElement: context?.selectedElement,
            },
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfterSeconds = retryAfterHeader
              ? Number.parseInt(retryAfterHeader, 10)
              : undefined;
            if (retryAfterSeconds && Number.isFinite(retryAfterSeconds)) {
              sessionRetryAtRef.current = Date.now() + retryAfterSeconds * 1000;
            } else {
              sessionRetryAtRef.current = Date.now() + 10_000;
            }
          }
          throw new Error(`Failed to start session: ${response.status}`);
        }

        const data = await response.json();
        const newSessionId = data?.session?.id as string | undefined;
        if (!newSessionId) {
          throw new Error('Session ID missing in response');
        }

        setSessionId(newSessionId);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
        }

        const initialMessages = Array.isArray(data?.session?.messages)
          ? (data.session.messages as LiveMessagePayload[])
          : data?.welcomeMessage
          ? [data.welcomeMessage]
          : [];

        if (initialMessages?.length) {
          setMessages(initialMessages.map(transformLiveMessage));
        }

        sessionRetryAtRef.current = 0;
        return newSessionId;
      } catch (error) {
        console.error('Failed to start AI session:', error);
        setMessages((prev) => {
          const alreadyErrored = prev.some((message) =>
            message.content?.includes('セッションの開始に失敗しました')
          );
          if (alreadyErrored) {
            return prev;
          }
          return [
            {
              id: `msg-${Date.now()}-error`,
              role: 'assistant',
              content:
                'セッションの開始に失敗しました。ページを再読み込みするか、しばらく待ってから再度お試しください。',
              timestamp: new Date(),
              status: 'error',
            },
          ];
        });
        return null;
      }
    })();

    startSessionPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      startSessionPromiseRef.current = null;
    }
  }, [
    context?.currentStep,
    context?.selectedElement,
    context?.totalSteps,
    ensureClientId,
    restoreSession,
    sessionId,
    transformLiveMessage,
  ]);

  // セッション終了
  const endSession = useCallback(async () => {
    try {
      if (!sessionId) return;
      const clientId = ensureClientId();
      await fetch(`/api/ai/live/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
          ...(clientId ? { 'x-plainer-client-id': clientId } : {}),
          'x-plainer-session-id': sessionId,
        },
      });
      setSessionId(null);
      setMessages([]);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      sessionRetryAtRef.current = 0;
      startSessionPromiseRef.current = null;
    } catch (error) {
      console.error('Failed to end AI session:', error);
    }
  }, [ensureClientId, sessionId]);

  // メッセージ送信
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const ensureSession = async () => {
        if (sessionId) return sessionId;
        return await startSession();
      };

      const activeSession = await ensureSession();
      if (!activeSession) {
        return;
      }

      const userMessageId = `msg-${Date.now()}`;
      const assistantMessageId = `${userMessageId}-assistant`;

      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        status: 'sent',
      };

      const assistantPlaceholder: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setInputValue('');
      setIsLoading(true);

      const updateMessage = (id: string, updater: (message: Message) => Message) => {
        setMessages((prev) =>
          prev.map((message) => (message.id === id ? updater(message) : message))
        );
      };

      const handleStreaming = async () => {
        const clientId = ensureClientId();
        const response = await fetch(
          `/api/ai/live/session/${activeSession}/messages/stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(clientId ? { 'x-plainer-client-id': clientId } : {}),
              'x-plainer-session-id': activeSession,
            },
            body: JSON.stringify({
              content: content.trim(),
              context: {
                currentStep: context?.currentStep,
                totalSteps: context?.totalSteps,
                selectedElement: context?.selectedElement,
              },
            }),
          }
        );

        if (!response.ok || !response.body) {
          throw new Error(`Live API streaming failed with ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let aggregated = '';
        let resolved = false;

        const handleDelta = (delta: string) => {
          aggregated += delta;
          updateMessage(assistantMessageId, (message) => ({
            ...message,
            content: aggregated,
          }));
        };

        const handleComplete = (payload: unknown) => {
          const finalMessage = transformLiveMessage(
            (payload as { assistantMessage?: LiveMessagePayload })?.assistantMessage
          );
          updateMessage(assistantMessageId, () => ({
            ...finalMessage,
            content:
              finalMessage.content && finalMessage.content.length > 0
                ? finalMessage.content
                : aggregated,
            status: finalMessage.status ?? 'sent',
          }));
          resolved = true;
          setIsLoading(false);
        };

        const handleError = (payload: unknown) => {
          const errorMessage = transformLiveMessage(
            (payload as { assistantMessage?: LiveMessagePayload })?.assistantMessage
          );
          updateMessage(assistantMessageId, (message) => ({
            ...message,
            content:
              errorMessage.content ||
              aggregated ||
              'すみません、エラーが発生しました。しばらく待ってから再度お試しください。',
            status: 'error',
          }));
          resolved = true;
          setIsLoading(false);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const separatorIndex = buffer.indexOf('\n\n');
            if (separatorIndex === -1) break;

            const rawEvent = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);

            if (!rawEvent.trim()) continue;

            const lines = rawEvent.split('\n');
            let eventName = 'message';
            const dataLines: string[] = [];

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice('event:'.length).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice('data:'.length).trim());
              }
            }

            const dataString = dataLines.join('\n');
            const payload = dataString ? JSON.parse(dataString) : null;

            switch (eventName) {
              case 'delta':
                if (payload?.content) {
                  handleDelta(String(payload.content));
                }
                break;
              case 'complete':
                handleComplete(payload);
                break;
              case 'error':
                handleError(payload);
                break;
              default:
                break;
            }
          }
        }

        if (!resolved) {
          updateMessage(assistantMessageId, (message) => ({
            ...message,
            status: 'error',
            content:
              message.content ||
              'すみません、応答が途中で終了しました。もう一度お試しください。',
          }));
          setIsLoading(false);
        }
      };

      const handleNonStreaming = async () => {
        const clientId = ensureClientId();
        const response = await fetch(
          `/api/ai/live/session/${activeSession}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(clientId ? { 'x-plainer-client-id': clientId } : {}),
              'x-plainer-session-id': activeSession,
            },
            body: JSON.stringify({
              content: content.trim(),
              context: {
                currentStep: context?.currentStep,
                totalSteps: context?.totalSteps,
                selectedElement: context?.selectedElement,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Live API responded with ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = transformLiveMessage(data?.assistantMessage);

        updateMessage(assistantMessageId, () => ({
          ...assistantMessage,
          status: assistantMessage.status ?? 'sent',
        }));
        setIsLoading(false);
      };

      try {
        if (ENABLE_STREAMING) {
          await handleStreaming();
        } else {
          await handleNonStreaming();
        }
      } catch (error) {
        console.error('Failed to send message:', error);

        if (ENABLE_STREAMING) {
          try {
            await handleNonStreaming();
            return;
          } catch (fallbackError) {
            console.error('Fallback send failed:', fallbackError);
          }
        }

        updateMessage(userMessageId, (message) => ({
          ...message,
          status: 'error',
        }));

        updateMessage(assistantMessageId, (message) => ({
          ...message,
          content:
            message.content ||
            'すみません、エラーが発生しました。しばらく待ってから再度お試しください。',
          status: 'error',
        }));
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
    },
    [
      ENABLE_STREAMING,
      context,
      ensureClientId,
      isLoading,
      sessionId,
      startSession,
      transformLiveMessage,
    ]
  );

  // フォーム送信
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  // サンプルプロンプト選択
  const handleExamplePrompt = useCallback((prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  }, []);

  // メッセージクリア
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // メッセージコピー
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // 初期化
  useEffect(() => {
    if (!sessionId) {
      void startSession();
    }
  }, [sessionId, startSession]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AIアシスタント
            {sessionId && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Live
              </Badge>
            )}
          </CardTitle>
          {context && (
            <div className="text-sm text-muted-foreground">
              {context.currentStep && `ステップ: ${context.currentStep}`}
              {context.selectedElement && ` • 選択: ${context.selectedElement}`}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4 p-4">
          {/* メッセージエリア */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 && !sessionId && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>AIアシスタントを開始しています...</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'group max-w-[80%] rounded-lg px-3 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                      message.status === 'error' &&
                        'bg-destructive/10 border border-destructive/20'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => copyMessage(message.content)}
                            aria-label="メッセージをコピー"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {onSuggestionApply && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => onSuggestionApply(message.content)}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              適用
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      回答を生成中...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* サンプルプロンプト */}
          {messages.length <= 1 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">サンプル:</div>
              <div className="grid grid-cols-1 gap-1">
                {EXAMPLE_PROMPTS.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-auto py-2 text-left whitespace-normal"
                    onClick={() => handleExamplePrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* 入力エリア */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="質問や指示を入力してください..."
              disabled={isLoading || !sessionId}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputValue.trim() || isLoading || !sessionId}
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* 操作ボタン */}
          {messages.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                チャットをクリア
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                再接続
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
