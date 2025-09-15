'use client';

import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-bold text-foreground">
            ページが見つかりません
          </h2>
          <p className="text-muted-foreground">
            お探しのページは存在しないか、移動または削除された可能性があります。
            URLをご確認いただくか、ホームページに戻ってください。
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="default" className="flex items-center gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              ホームに戻る
            </Link>
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            前のページに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
