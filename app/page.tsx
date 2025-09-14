import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Upload, Edit, Play } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              PLAINER
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              スクリーンショットから
              <br />
              インタラクティブなガイドを作成
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-4">
              <Link href="/editor" className="flex items-center gap-2">
                新しいガイドを作成
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-4"
            >
              <Link href="https://service.plainer.co.jp/case?utm_term=&utm_campaign=202508_PMax%E5%BA%83%E5%91%8A&utm_source=adwords&utm_medium=ppc&hsa_acc=2158139799&hsa_cam=22945413560&hsa_grp=&hsa_ad=&hsa_src=x&hsa_tgt=&hsa_kw=&hsa_mt=&hsa_net=adwords&hsa_ver=3&gad_source=1&gad_campaignid=22939401729&gbraid=0AAAAAqrmUizuhCLiH0whwSpj9dT1Ftfds&gclid=Cj0KCQjww4TGBhCKARIsAFLXndSY8VCN0uIoFChAoPGwlKFUfNDWrtgsrMIoZj_53L4R4FHtZj1K12QaAtsmEALw_wcB">サンプルを見る</Link>
            </Button>
          </div>
        </div>

        {/* 機能紹介 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>簡単アップロード</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                スクリーンショットをドラッグ&ドロップするだけで、
                自動的に最適化・処理されます
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Edit className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>直感的な編集</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                ホットスポット、注釈、マスクを使って、
                わかりやすいインタラクティブなガイドを作成
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Play className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>瞬時に共有</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                作成したガイドをURLで共有したり、
                埋め込みコードでWebサイトに組み込み
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ステータス */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">開発状況</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Phase 1: 基盤構築</span>
                <span className="text-sm text-green-600 font-medium">
                  ✓ 完了
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Phase 2: コア機能実装</span>
                <span className="text-sm text-blue-600 font-medium">
                  🔄 進行中
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Phase 3: エディタ機能</span>
                <span className="text-sm text-muted-foreground">予定</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Phase 4: 高度機能</span>
                <span className="text-sm text-muted-foreground">予定</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
