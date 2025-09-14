'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { StepPlayer } from '@/components/step-player';
import { useEditorStore, defaultTheme } from '@/lib/store';
import type { Project, Step } from '@/lib/types';

// サンプルデータ
const createSampleProject = (): Project => ({
  id: 'sample-project',
  name: 'サンプルガイド - PLAINERの使い方',
  steps: [
    {
      id: 'step-1',
      title: 'ようこそPLAINERへ',
      description:
        'PLAINERを使って、スクリーンショットからインタラクティブなガイドを作成しましょう。',
      image:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9IjEwMCIgeT0iMTAwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzMzOTNmZiIgcng9IjEwIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iMzIwIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSI0OCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPldlbGNvbWUgdG8gUExBSU5FUjwvdGV4dD4KPC9zdmc+',
      thumbnail:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjExMCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzMzOTNmZiIgcng9IjQiLz4KPHR4dCB4PSI3NSIgeT0iNTYiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5XZWxjb21lPC90ZXh0Pgo8L3N2Zz4=',
      hotspots: [
        {
          id: 'hotspot-1',
          shape: 'rect',
          x: 0.2,
          y: 0.3,
          w: 0.6,
          h: 0.4,
          label: 'メインエリア',
          tooltipText: 'ここがPLAINERのメイン画面です',
        },
      ],
      annotations: [
        {
          id: 'annotation-1',
          text: '👋 はじめまして！',
          x: 0.1,
          y: 0.1,
          style: { fontSize: 18, fontWeight: 'bold', color: '#3393ff' },
        },
      ],
      masks: [],
      order: 0,
    },
    {
      id: 'step-2',
      title: '画像をアップロード',
      description:
        'ドラッグ&ドロップまたはクリックして、スクリーンショットをアップロードします。',
      image:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9IjE1MCIgeT0iMTUwIiB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTNhM2EzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjEwLDEwIiByeD0iMTAiLz4KPGNpcmNsZSBjeD0iNDAwIiBjeT0iMjcwIiByPSI0MCIgZmlsbD0iI2EzYTNhMyIvPgo8cGF0aCBkPSJNMzgwIDI1Mkw0MDAgMjMybDIwIDIwTTQwMCAyMzJ2NTYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNCIvPgo8dGV4dCB4PSI0MDAiIHk9IjM0MCIgZmlsbD0iIzY2NjY2NiIgZm9udC1zaXplPSIxOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+6Ieq5YOP44KS44OJ44Op44OD44Kw77yG44OJ44Ot44OD44OX44GB44Gv44Kv44Oq44OD44Kv44GX44Gm44Ki44OD44OX44Ot44O844OEPC90ZXh0Pgo8L3N2Zz4=',
      thumbnail:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjExMCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTNhM2EzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUsNSIgcng9IjQiLz4KPGNpcmNsZSBjeD0iNzUiIGN5PSI1MCIgcj0iMTIiIGZpbGw9IiNhM2EzYTMiLz4KPHBhdGggZD0iTTY5IDQ0TDc1IDM4bDYgNk03NSAzOHYyNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+CjwvU3ZnPg==',
      hotspots: [
        {
          id: 'hotspot-2',
          shape: 'rect',
          x: 0.19,
          y: 0.25,
          w: 0.62,
          h: 0.5,
          label: 'アップロードエリア',
          tooltipText: 'ここに画像をドロップします',
        },
      ],
      annotations: [
        {
          id: 'annotation-2',
          text: '📁 ファイルをここにドロップ',
          x: 0.5,
          y: 0.15,
          style: { fontSize: 16, color: '#666666' },
        },
      ],
      masks: [],
      order: 1,
    },
    {
      id: 'step-3',
      title: 'ホットスポットを追加',
      description:
        'クリック可能なエリアを画像上に配置して、インタラクティブな要素を作成します。',
      image:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9IjEwMCIgeT0iMTAwIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y5ZjlmOSIgc3Ryb2tlPSIjZTJlOGYwIiByeD0iOCIvPgo8cmVjdCB4PSIyMDAiIHk9IjE4MCIgd2lkdGg9IjE1MCIgaGVpZ2h0PSI2MCIgZmlsbD0iI2VmNDQ0NCIgZmlsbC1vcGFjaXR5PSIwLjIiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iNCIvPgo8cmVjdCB4PSI0NTAiIHk9IjMwMCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI4MCIgZmlsbD0iI2VmNDQ0NCIgZmlsbC1vcGFjaXR5PSIwLjIiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iNCIvPgo8dGV4dCB4PSI0MDAiIHk9IjU0MCIgZmlsbD0iIzMzOTNmZiIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkhvdHNwb3RzIEFkZGVkITwvdGV4dD4KPC9zdmc+',
      thumbnail:
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjhmOWZhIi8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjExMCIgaGVpZ2h0PSI2MCIgZmlsbD0iI2Y5ZjlmOSIgc3Ryb2tlPSIjZTJlOGYwIiByeD0iNCIvPgo8cmVjdCB4PSIzMCIgeT0iMzUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIxNSIgZmlsbD0iI2VmNDQ0NCIgZmlsbC1vcGFjaXR5PSIwLjIiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIxIiByeD0iMiIvPgo8cmVjdCB4PSI5MCIgeT0iNDUiIHdpZHRoPSIyNSIgaGVpZ2h0PSIyMCIgZmlsbD0iI2VmNDQ0NCIgZmlsbC1vcGFjaXR5PSIwLjIiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIxIiByeD0iMiIvPgo8L3N2Zz4=',
      hotspots: [
        {
          id: 'hotspot-3-1',
          shape: 'rect',
          x: 0.25,
          y: 0.3,
          w: 0.19,
          h: 0.1,
          label: 'ボタン1',
          tooltipText: 'このボタンをクリックしてください',
        },
        {
          id: 'hotspot-3-2',
          shape: 'rect',
          x: 0.56,
          y: 0.5,
          w: 0.15,
          h: 0.13,
          label: 'ボタン2',
          tooltipText: '次の操作に進みます',
        },
      ],
      annotations: [],
      masks: [],
      order: 2,
    },
  ],
  chapters: [],
  theme: defaultTheme,
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublic: true,
});

export default function PlayerPage() {
  // 外部サンプルページへリダイレクト
  useEffect(() => {
    const url = 'https://service.plainer.co.jp/case?utm_term=&utm_campaign=202508_PMax%E5%BA%83%E5%91%8A&utm_source=adwords&utm_medium=ppc&hsa_acc=2158139799&hsa_cam=22945413560&hsa_grp=&hsa_ad=&hsa_src=x&hsa_tgt=&hsa_kw=&hsa_mt=&hsa_net=adwords&hsa_ver=3&gad_source=1&gad_campaignid=22939401729&gbraid=0AAAAAqrmUizuhCLiH0whwSpj9dT1Ftfds&gclid=Cj0KCQjww4TGBhCKARIsAFLXndSY8VCN0uIoFChAoPGwlKFUfNDWrtgsrMIoZj_53L4R4FHtZj1K12QaAtsmEALw_wcB';
    try {
      window.location.href = url;
    } catch {
      // no-op
    }
  }, []);
  const { project, loadFromLocalStorage } = useEditorStore();
  const [displayProject, setDisplayProject] = useState<Project | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // ローカルストレージからプロジェクトを読み込み
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    // プロジェクトがある場合はそれを使用、なければサンプルを表示
    if (project && project.steps.length > 0) {
      setDisplayProject(project);
    } else {
      setDisplayProject(createSampleProject());
    }
  }, [project]);

  const handleStepChange = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
  };

  const handleComplete = () => {
    // ガイド完了時の処理
    console.log('ガイドが完了しました！');
  };

  if (!displayProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">読み込み中...</h2>
          <p className="text-muted-foreground">
            プロジェクトを読み込んでいます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        {/* ヘッダー */}
        <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  ホームに戻る
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="font-semibold">{displayProject.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {displayProject.steps.length} ステップ
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {project && project.steps.length > 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/editor">編集モードに戻る</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href="/editor">自分のガイドを作成</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-4">
            <div className="max-w-6xl mx-auto h-full">
              <StepPlayer
                project={displayProject}
                initialStepIndex={0}
                autoPlay={false}
                showNavigation={true}
                showProgress={true}
                onStepChange={handleStepChange}
                onComplete={handleComplete}
                className="h-full"
              />
            </div>
          </div>
        </main>

        {/* フッター情報 */}
        {displayProject.id === 'sample-project' && (
          <footer className="border-t bg-muted/30 p-4">
            <div className="max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    このサンプルについて
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    これはPLAINERの機能をデモンストレーションするためのサンプルガイドです。
                    実際の画像をアップロードして、あなた独自のインタラクティブガイドを作成することができます。
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-xs">
                      💡 キーボードショートカット:
                      矢印キー（←→）、スペースキー、Home/End
                    </span>
                    <span className="text-xs">🔍 フルスクリーン: F キー</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
