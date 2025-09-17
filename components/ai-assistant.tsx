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

export function AIAssistant({
  onSuggestionApply,
  context,
  className,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    try {
      // TODO: Live APIセッション開始実装
      const newSessionId = `session-${Date.now()}`;
      setSessionId(newSessionId);

      // 歓迎メッセージ
      const welcomeMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content:
          'こんにちは！ガイド作成をお手伝いします。画像の説明、注釈の追加、CTAの最適化など、お気軽にお尋ねください。',
        timestamp: new Date(),
        status: 'sent',
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to start AI session:', error);
    }
  }, []);

  // セッション終了
  const endSession = useCallback(async () => {
    try {
      // TODO: Live APIセッション終了実装
      setSessionId(null);
      setMessages([]);
    } catch (error) {
      console.error('Failed to end AI session:', error);
    }
  }, []);

  // メッセージ送信
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        status: 'sent',
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      try {
        // TODO: Live API実装
        // 仮の応答をシミュレート
        setTimeout(() => {
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: `「${content}」について理解しました。Live APIが実装されると、より詳細な回答を提供できます。現在はデモンストレーション用の応答です。`,
            timestamp: new Date(),
            status: 'sent',
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Failed to send message:', error);

        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: 'すみません、エラーが発生しました。もう一度お試しください。',
          timestamp: new Date(),
          status: 'error',
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
      }
    },
    [isLoading]
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
      startSession();
    }
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
