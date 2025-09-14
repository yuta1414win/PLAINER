import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">読み込み中...</p>
          <p className="text-sm text-muted-foreground">
            しばらくお待ちください
          </p>
        </div>
      </div>
    </div>
  );
}
