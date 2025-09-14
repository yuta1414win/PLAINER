'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                システムエラーが発生しました
              </h1>
              <p className="text-muted-foreground">
                申し訳ございません。重大なシステムエラーが発生しました。
                ページを再読み込みするか、しばらくしてからもう一度お試しください。
              </p>
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4 p-4 bg-muted rounded-lg text-left">
                  <summary className="cursor-pointer font-semibold mb-2">
                    エラー詳細 (開発環境のみ)
                  </summary>
                  <div className="space-y-2">
                    <p>
                      <strong>メッセージ:</strong> {error.message}
                    </p>
                    {error.digest && (
                      <p>
                        <strong>ID:</strong> {error.digest}
                      </p>
                    )}
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={reset}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                再試行
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
              >
                ホームに戻る
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
