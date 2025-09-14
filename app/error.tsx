'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            予期しないエラーが発生しました
          </h1>
          <p className="text-muted-foreground">
            申し訳ございません。サーバーエラーが発生しました。
            しばらくしてからもう一度お試しいただくか、ホームページに戻ってください。
          </p>
          {process.env.NODE_ENV === 'development' && (
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
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              ホームに戻る
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
