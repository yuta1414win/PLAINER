PLAINER — Local Development Guide

現状の仕様（日本語）

概要

- 画像やスクリーンショットから手順ガイドを作成・編集・再生できる Next.js 15 + React 19 アプリ。
- リアルタイムコラボレーション（Socket.IO）対応。開発時は自動でポート3001にWSサーバを起動。
- AI（Gemini）による最適化/文面生成/フロー分析をサポート（未設定でもコア機能は利用可能）。

機能サマリー（主要）

- エディタ: 画像アップロード、ホットスポット/注釈/マスク、ステップ管理、Undo/Redo、ショートカット、HTML/差分プレビュー。
- ストレージ: IndexedDB でプロジェクト保存、オートセーブ、インポート/エクスポート、一覧/複製/削除。
- プレイヤー: ステップ再生、ズーム、字幕/ナレーション（Web Speech API）。
- テンプレート: ギャラリー/検索/適用、メタデータ管理。
- アナリティクス: イベント収集/ダッシュボード/インサイト、同意管理（GDPR/CCPAの基本対応）。
- リアルタイムコラボ: ルーム/プレゼンス/カーソル/テキスト同期、ロック/役割/招待（MVP）。
- AI連携（Gemini）: ステップ最適化、文面生成、フロー分析、SSE/レート制限。

主要ページ/ルート

- `/` トップ
- `/editor` エディタ（多機能を集約。プレゼンス/コラボUIあり）
- `/player` プレイヤー（作成した手順の再生）
- `/collaboration-demo` コラボデモ（プレゼンス/カーソル/チャット）
- API: `/api/health`, `/api/collaboration`（WS含む）, `/api/ai/optimize`

データ保存と同期

- ブラウザの IndexedDB を既定ストレージとして採用。プロジェクト単位で自動保存・復元。
- インポート/エクスポートはJSON形式。サーバ保存は将来対応（現状はローカル優先）。
- コラボはメモリ保持の簡易WSサーバ（開発向け）。本番は Redis/DB + 認証/認可/WSS を推奨。

AI 機能（任意）

- `GEMINI_API_KEY` 未設定時はモック/エラーハンドリングでコア機能は継続動作。
- プロンプト/安全設定は `lib/ai/*`, `lib/gemini.ts` に実装。モデル指定/モック切り替え可。

キーボードショートカット（例）

- Undo/Redo、ツール切替、ズーム、選択/移動などをサポート（`hooks/use-keyboard-shortcuts.ts`）。

既知の制約/注意点（抜粋）

- 本番ビルド時は ESLint エラーで失敗する場合あり。ビルドを優先する場合は `next.config.js` の `eslint.ignoreDuringBuilds` を一時的に有効化。
- コラボWSは開発用途の簡易実装。永続化/認証/レート制限は本番構成で追加が必要。
- AIは外部APIを利用。コスト/レイテンシ/安全設定に留意。

関連ファイル（参考）

- エディタ: `app/editor/page.tsx`, `components/canvas/*`, `components/*tool*.tsx`
- コラボ: `app/api/collaboration/route.ts`, `lib/collaboration/*`, `hooks/use-collaboration.ts`, `components/collaboration/*`
- AI: `app/api/ai/optimize/route.ts`, `lib/ai/*`, `lib/gemini.ts`, `components/ai/*`
- ストレージ: `lib/storage/indexed-db.ts`, `components/project-manager.tsx`, `hooks/use-auto-save.ts`
- アナリティクス: `lib/analytics/*`, `components/analytics-dashboard.tsx`


Overview

- Next.js 15 + React 19 app for creating interactive guides from screenshots.
- Real‑time collaboration (Socket.IO) starts automatically in dev on port 3001.
- AI features (Gemini) are optional for core usage; they return errors if no API key is set but won’t block the editor.

Requirements

- Node 20.x (use `nvm use` with `.nvmrc` or Volta)
- pnpm 9.x (`corepack enable` recommended)

Quick Start

1) Install dependencies

- From this folder: `pnpm install` (already present in most setups)

2) Environment variables

- Copy defaults: `cp .env.example .env.local`
- For collaboration in dev (recommended):
  - `NEXT_PUBLIC_WS_URL=http://localhost:3001`
  - `WS_PORT=3001`
- Optional (AI):
  - `GEMINI_API_KEY=...` (set your key to use AI endpoints)
  - `GEMINI_MODEL=gemini-2.0-flash-exp` (or preferred model)
  - `MOCK_AI=true` to force offline, deterministic AI responses (also auto‑enabled if no key is set)
- API exposure:
  - `API_ALLOWED_ORIGINS=https://app.example.com` (comma-separated origins allowed to call the AI API; defaults to `*` for local dev)

3) Run in development

- `pnpm dev`
- App: http://localhost:3000
- WebSocket server: http://localhost:3001 (started by `app/api/collaboration/route.ts`)

Useful Pages

- Editor: `/editor` — upload screenshots, add hotspots/annotations/masks
- Player: `/player` — simple playback for created steps
- Collaboration demo: `/collaboration-demo` — presence, cursors, chat

Tests

- `pnpm test` (Vitest). Tests mock AI calls and run offline.

Production Build Notes

- `pnpm build` performs type‑check + ESLint. The project currently has several lint warnings/errors during active development which fail production builds.
- If you need to produce a build quickly, either:
  - Fix lint errors (preferred), or
  - Temporarily allow builds to pass even with lint errors by setting in `next.config.js`:
    
    ```js
    eslint: {
      ignoreDuringBuilds: true,
    },
    ```

Troubleshooting

- Node version warning: ensure `node -v` is 20.x (`nvm use` in `plainer/`).
- WebSocket connection errors: confirm port 3001 is free and `NEXT_PUBLIC_WS_URL` matches.
- AI requests failing: set `GEMINI_API_KEY` or avoid AI endpoints; the editor and collaboration features run without it.

## TypeScript エラー一覧

`pnpm type-check` 実行時点 (最新検証) のエラーログを以下に記載します。型エラーを解消する際の参考にしてください。

```
 WARN  Unsupported engine: wanted: {"node":"20.x"} (current: {"node":"v24.4.0","pnpm":"9.0.0"})

> plainer@0.1.0 type-check /Users/yamanouchiyuuta/Desktop/PLAINER/plainer
> tsc --noEmit

app/api/ai/optimize/route-helpers.ts(187,13): error TS2339: Property 'ip' does not exist on type 'NextRequest'.
components/canvas-editor.tsx(303,33): error TS2339: Property 'blurIntensity' does not exist on type 'Mask'.
components/canvas-editor.tsx(355,13): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(357,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(358,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(359,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(360,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(371,13): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(373,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(374,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(375,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(386,13): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(388,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(389,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(400,13): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(402,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(403,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(404,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(405,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas-editor.tsx(448,36): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(459,36): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(464,31): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(512,40): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(515,43): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas-editor.tsx(518,37): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/canvas/canvas-drawing.tsx(97,16): error TS2532: Object is possibly 'undefined'.
components/canvas/canvas-drawing.tsx(98,16): error TS2532: Object is possibly 'undefined'.
components/canvas/canvas-editor.tsx(51,7): error TS2322: Type 'RefObject<HTMLCanvasElement | null>' is not assignable to type 'RefObject<HTMLCanvasElement>'.
  Type 'HTMLCanvasElement | null' is not assignable to type 'HTMLCanvasElement'.
    Type 'null' is not assignable to type 'HTMLCanvasElement'.
components/canvas/canvas-editor.tsx(226,15): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas/canvas-editor.tsx(227,15): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas/canvas-editor.tsx(242,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas/canvas-editor.tsx(243,13): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/canvas/index.ts(4,10): error TS2724: '"./canvas-drawing"' has no exported member named 'CanvasDrawing'. Did you mean 'useCanvasDrawing'?
components/canvas/index.ts(5,10): error TS2724: '"./canvas-viewport"' has no exported member named 'CanvasViewport'. Did you mean 'useCanvasViewport'?
components/collaboration/chat-panel.tsx(79,16): error TS2375: Type '{ key: string; message: ChatMessage; isSelf: boolean; onReact: ((messageId: string, emoji: string) => void) | undefined; }' is not assignable to type '{ message: ChatMessage; isSelf?: boolean; onReact?: (messageId: string, emoji: string) => void; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'onReact' are incompatible.
    Type '((messageId: string, emoji: string) => void) | undefined' is not assignable to type '(messageId: string, emoji: string) => void'.
      Type 'undefined' is not assignable to type '(messageId: string, emoji: string) => void'.
components/collaboration/mentions.tsx(40,18): error TS18048: 'token' is possibly 'undefined'.
components/collaboration/mentions.tsx(50,25): error TS18048: 'token' is possibly 'undefined'.
components/collaboration/mentions.tsx(117,28): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
components/collaboration/presence-indicator.tsx(155,8): error TS2375: Type '{ isConnected: boolean; isReconnecting: boolean; onReconnect: (() => void) | undefined; }' is not assignable to type '{ isConnected: boolean; isReconnecting?: boolean; onReconnect?: () => void; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'onReconnect' are incompatible.
    Type '(() => void) | undefined' is not assignable to type '() => void'.
      Type 'undefined' is not assignable to type '() => void'.
components/cta-settings.tsx(78,5): error TS2345: Argument of type 'LinkTarget' is not assignable to parameter of type '"_blank" | "_self" | (() => "_blank" | "_self")'.
  Type '"_parent"' is not assignable to type '"_blank" | "_self" | (() => "_blank" | "_self")'.
components/cta-settings.tsx(110,7): error TS2322: Type 'string' is not assignable to type 'URLString'.
  Type 'string' is not assignable to type '{ readonly __brand: "URLString"; }'.
components/cta-settings.tsx(129,17): error TS2345: Argument of type 'LinkTarget' is not assignable to parameter of type 'SetStateAction<"_blank" | "_self">'.
  Type '"_parent"' is not assignable to type 'SetStateAction<"_blank" | "_self">'.
components/diff-preview.tsx(87,11): error TS2322: Type 'Step | undefined' is not assignable to type 'Step | null'.
  Type 'undefined' is not assignable to type 'Step | null'.
components/diff-preview.tsx(88,30): error TS18047: 'compare' is possibly 'null'.
components/diff-preview.tsx(139,21): error TS2339: Property 'imageUrl' does not exist on type 'Step'.
components/diff-preview.tsx(139,46): error TS2339: Property 'imageUrl' does not exist on type 'Step'.
components/diff-preview.tsx(143,31): error TS2339: Property 'imageUrl' does not exist on type 'Step'.
components/diff-preview.tsx(144,31): error TS2339: Property 'imageUrl' does not exist on type 'Step'.
components/diff-preview.tsx(160,43): error TS2339: Property 'action' does not exist on type 'Hotspot'.
  Property 'action' does not exist on type 'RectHotspot'.
components/diff-preview.tsx(172,43): error TS2339: Property 'action' does not exist on type 'Hotspot'.
  Property 'action' does not exist on type 'RectHotspot'.
components/diff-preview.tsx(186,43): error TS2339: Property 'action' does not exist on type 'Hotspot'.
  Property 'action' does not exist on type 'RectHotspot'.
components/dom-clone.tsx(134,17): error TS2345: Argument of type '{ id: string; title: string; image: string; hotspots: { id: string; shape: "rect"; x: number; y: number; w: number; h: number; label: string | undefined; tooltipText: string | undefined; }[]; annotations: never[]; masks: never[]; order: number; description: string | undefined; }' is not assignable to parameter of type 'CreateStepInput'.
  Property 'thumbnail' is missing in type '{ id: string; title: string; image: string; hotspots: { id: string; shape: "rect"; x: number; y: number; w: number; h: number; label: string | undefined; tooltipText: string | undefined; }[]; annotations: never[]; masks: never[]; order: number; description: string | undefined; }' but required in type 'Omit<Step, "id" | "order">'.
components/empty-state.tsx(167,6): error TS2375: Type '{ variant: "no-project"; actions: ({ label: string; onClick: () => void; variant: "default"; } | { label: string; onClick: () => void; variant: "outline"; })[]; className: string | undefined; }' is not assignable to type 'EmptyStateProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'className' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/empty-state.tsx(201,6): error TS2375: Type '{ variant: "no-steps"; icon: Element; actions: ({ label: string; onClick: () => void; variant: "default"; } | { label: string; onClick: () => void; variant: "outline"; })[]; className: string | undefined; }' is not assignable to type 'EmptyStateProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'className' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/empty-state.tsx(244,6): error TS2375: Type '{ variant: "error"; description: string; actions: ({ label: string; onClick: () => void; variant: "default"; } | { label: string; onClick: () => void; variant: "outline"; })[]; className: string | undefined; }' is not assignable to type 'EmptyStateProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'className' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/empty-state.tsx(269,5): error TS2322: Type '`${string}...`' is not assignable to type '"AIがコンテンツを生成しています。しばらくお待ちください。"'.
components/empty-state.tsx(287,6): error TS2375: Type '{ variant: "generating"; description: string; actions: { label: string; onClick: () => void; variant: "outline"; }[]; className: string | undefined; }' is not assignable to type 'EmptyStateProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'className' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/empty-state.tsx(313,6): error TS2375: Type '{ variant: "offline"; actions: { label: string; onClick: () => void; variant: "default"; }[]; className: string | undefined; }' is not assignable to type 'EmptyStateProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'className' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/empty-state.tsx(347,6): error TS2375: Type '{ variant: "no-suggestions"; actions: ({ label: string; onClick: () => void; variant: "default"; } | { label: string; onClick: () => void; variant: "outline"; })[]; className: string | undefined; }' is not assignable to type 'EmptyStateProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'className' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/export-import-dialog.tsx(234,27): error TS2345: Argument of type '{ isValid: boolean; errors: string[]; warnings: string[]; projectPreview: Partial<Project> | undefined; }' is not assignable to parameter of type 'SetStateAction<{ isValid: boolean; errors: string[]; warnings: string[]; projectPreview?: Partial<Project>; } | null>'.
  Type '{ isValid: boolean; errors: string[]; warnings: string[]; projectPreview: Partial<Project> | undefined; }' is not assignable to type '{ isValid: boolean; errors: string[]; warnings: string[]; projectPreview?: Partial<Project>; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Types of property 'projectPreview' are incompatible.
      Type 'Partial<Project> | undefined' is not assignable to type 'Partial<Project>'.
        Type 'undefined' is not assignable to type 'Partial<Project>'.
components/export-import-dialog.tsx(260,9): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/html-preview.tsx(275,27): error TS2339: Property 'imageUrl' does not exist on type 'Step'.
components/html-preview.tsx(278,45): error TS2339: Property 'imageUrl' does not exist on type 'Step'.
components/html-preview.tsx(284,107): error TS2339: Property 'width' does not exist on type 'Hotspot'.
  Property 'width' does not exist on type 'RectHotspot'.
components/html-preview.tsx(284,140): error TS2339: Property 'height' does not exist on type 'Hotspot'.
  Property 'height' does not exist on type 'RectHotspot'.
components/html-preview.tsx(285,47): error TS2339: Property 'action' does not exist on type 'Hotspot'.
  Property 'action' does not exist on type 'RectHotspot'.
components/html-preview.tsx(285,84): error TS2339: Property 'action' does not exist on type 'Hotspot'.
  Property 'action' does not exist on type 'RectHotspot'.
components/html-preview.tsx(295,116): error TS2339: Property 'textColor' does not exist on type 'Annotation'.
components/html-preview.tsx(295,159): error TS2339: Property 'backgroundColor' does not exist on type 'Annotation'.
components/html-preview.tsx(306,98): error TS2339: Property 'width' does not exist on type 'Mask'.
components/html-preview.tsx(306,128): error TS2339: Property 'height' does not exist on type 'Mask'.
components/html-preview.tsx(306,173): error TS2339: Property 'intensity' does not exist on type 'Mask'.
components/html-preview.tsx(317,32): error TS2339: Property 'enabled' does not exist on type 'CTA'.
components/html-preview.tsx(318,31): error TS2339: Property 'text' does not exist on type 'CTA'.
components/html-preview.tsx(323,43): error TS2339: Property 'text' does not exist on type 'CTA'.
components/html-preview.tsx(371,30): error TS2339: Property 'title' does not exist on type 'Project'.
components/keyboard-shortcuts-dialog.tsx(101,14): error TS2375: Type '{ children: (Element | Element[])[]; defaultValue: string | undefined; className: string; }' is not assignable to type 'TabsProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'defaultValue' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/keyboard-shortcuts-dialog.tsx(118,24): error TS2532: Object is possibly 'undefined'.
components/language-switcher.tsx(92,38): error TS18048: 'currentLangData' is possibly 'undefined'.
components/language-switcher.tsx(134,45): error TS18048: 'currentLangData' is possibly 'undefined'.
components/language-switcher.tsx(135,38): error TS18048: 'currentLangData' is possibly 'undefined'.
components/mask-tool.tsx(59,7): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/mask-tool.tsx(60,7): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/mask-tool.tsx(61,7): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/mask-tool.tsx(62,7): error TS2322: Type 'number' is not assignable to type 'NormalizedCoordinate'.
  Type 'number' is not assignable to type '{ readonly __brand: "NormalizedCoordinate"; }'.
components/mask-tool.tsx(72,41): error TS2353: Object literal may only specify known properties, and 'blurIntensity' does not exist in type 'Partial<Mask>'.
components/mask-tool.tsx(81,41): error TS2353: Object literal may only specify known properties, and 'blurIntensity' does not exist in type 'Partial<Mask>'.
components/mask-tool.tsx(150,35): error TS2339: Property 'blurIntensity' does not exist on type 'Mask'.
components/mask-tool.tsx(179,44): error TS2339: Property 'blurIntensity' does not exist on type 'Mask'.
components/mask-tool.tsx(181,51): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
components/mask-tool.tsx(191,39): error TS2339: Property 'blurIntensity' does not exist on type 'Mask'.
components/mask-tool.tsx(206,40): error TS2339: Property 'blurIntensity' does not exist on type 'Mask'.
components/prompt-template-selector.tsx(140,12): error TS2375: Type '{ children: Element[]; value: string | undefined; onValueChange: (templateId: string) => void; }' is not assignable to type '{ value?: string; defaultValue?: string; onValueChange?(value: string): void; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'value' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/prompt-template-selector.tsx(212,22): error TS2375: Type '{ children: Element[]; value: PromptTemplateCategory | undefined; onValueChange: (value: string) => void; }' is not assignable to type '{ value?: string; defaultValue?: string; onValueChange?(value: string): void; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'value' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/share-dialog.tsx(551,47): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
components/share-dialog.tsx(572,47): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
components/share-dialog.tsx(593,47): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
components/share-dialog.tsx(615,33): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
components/step-list.tsx(184,40): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/step-list.tsx(185,40): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
components/step-player.tsx(154,7): error TS2448: Block-scoped variable 'handleNext' used before its declaration.
components/step-player.tsx(154,7): error TS2454: Variable 'handleNext' is used before being assigned.
components/step-player.tsx(154,19): error TS2448: Block-scoped variable 'handlePrevious' used before its declaration.
components/step-player.tsx(154,19): error TS2454: Variable 'handlePrevious' is used before being assigned.
components/step-player.tsx(154,35): error TS2448: Block-scoped variable 'handleGoToStep' used before its declaration.
components/step-player.tsx(154,35): error TS2454: Variable 'handleGoToStep' is used before being assigned.
components/step-player.tsx(154,51): error TS2448: Block-scoped variable 'handleToggleFullscreen' used before its declaration.
components/step-player.tsx(154,51): error TS2454: Variable 'handleToggleFullscreen' is used before being assigned.
components/step-player.tsx(367,5): error TS2304: Cannot find name 'memo'.
components/step-player.tsx(459,5): error TS2304: Cannot find name 'memo'.
components/step-player.tsx(544,5): error TS2304: Cannot find name 'memo'.
components/step/index.ts(2,26): error TS2307: Cannot find module './step-list' or its corresponding type declarations.
components/step/index.ts(4,28): error TS2307: Cannot find module './step-player' or its corresponding type declarations.
components/step/index.ts(5,30): error TS2307: Cannot find module './step-controls' or its corresponding type declarations.
components/step/index.ts(6,32): error TS2307: Cannot find module './step-navigation' or its corresponding type declarations.
components/suggestion-manager.tsx(31,10): error TS2305: Module '"@/lib/types"' has no exported member 'Suggestion'.
components/theme-settings.tsx(134,21): error TS2345: Argument of type 'Theme | { readonly primaryColor: "#6366f1"; readonly secondaryColor: "#8b5cf6"; readonly backgroundColor: "#ffffff"; readonly textColor: "#111827"; readonly fontFamily: "Inter, system-ui, sans-serif"; ... 4 more ...; readonly spacing: number; } | { ...; } | { ...; } | { ...; }' is not assignable to parameter of type 'SetStateAction<Theme>'.
  Type '{ readonly primaryColor: "#6366f1"; readonly secondaryColor: "#8b5cf6"; readonly backgroundColor: "#ffffff"; readonly textColor: "#111827"; readonly fontFamily: "Inter, system-ui, sans-serif"; ... 4 more ...; readonly spacing: number; }' is not assignable to type 'SetStateAction<Theme>'.
    Type '{ readonly primaryColor: "#6366f1"; readonly secondaryColor: "#8b5cf6"; readonly backgroundColor: "#ffffff"; readonly textColor: "#111827"; readonly fontFamily: "Inter, system-ui, sans-serif"; ... 4 more ...; readonly spacing: number; }' is not assignable to type 'Theme'.
      Types of property 'primaryColor' are incompatible.
        Type 'string' is not assignable to type 'HexColor'.
          Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
components/theme-settings.tsx(266,42): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
components/theme-settings.tsx(276,42): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
components/theme-settings.tsx(286,42): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
components/theme-settings.tsx(295,61): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
components/theme-settings.tsx(303,20): error TS2375: Type '{ children: Element[]; value: string | undefined; onValueChange: (font: string) => void; }' is not assignable to type '{ value?: string; defaultValue?: string; onValueChange?(value: string): void; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'value' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/theme-settings.tsx(327,39): error TS2339: Property 'logoText' does not exist on type 'Theme'.
components/theme-settings.tsx(329,42): error TS2353: Object literal may only specify known properties, and 'logoText' does not exist in type 'Partial<Theme>'.
components/theme-settings.tsx(338,39): error TS2339: Property 'logoUrl' does not exist on type 'Theme'.
components/theme-settings.tsx(340,42): error TS2353: Object literal may only specify known properties, and 'logoUrl' does not exist in type 'Partial<Theme>'.
components/theme-settings.tsx(354,40): error TS2379: Argument of type '{ borderRadius: number | undefined; }' is not assignable to parameter of type 'Partial<Theme>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'borderRadius' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
components/theme-settings.tsx(392,33): error TS2339: Property 'logoText' does not exist on type 'Theme'.
components/theme-settings.tsx(397,37): error TS2339: Property 'logoText' does not exist on type 'Theme'.
components/theme-settings.tsx(399,36): error TS2339: Property 'logoUrl' does not exist on type 'Theme'.
components/theme-settings.tsx(401,41): error TS2339: Property 'logoUrl' does not exist on type 'Theme'.
components/ui/checkbox.tsx(4,36): error TS2307: Cannot find module '@radix-ui/react-checkbox' or its corresponding type declarations.
components/ui/collapsible.tsx(83,25): error TS2339: Property 'onClick' does not exist on type '{}'.
components/ui/color-picker.tsx(6,57): error TS2307: Cannot find module './popover' or its corresponding type declarations.
components/ui/context-menu.tsx(95,4): error TS2375: Type '{ children: (Element | ReactNode)[]; id?: string | undefined; title?: string | undefined; key?: Key | null | undefined; content?: string | undefined; color?: string | undefined; ... 279 more ...; checked: CheckedState | undefined; }' is not assignable to type 'ContextMenuCheckboxItemProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'checked' are incompatible.
    Type 'CheckedState | undefined' is not assignable to type 'CheckedState'.
      Type 'undefined' is not assignable to type 'CheckedState'.
components/ui/dropdown-menu.tsx(104,4): error TS2375: Type '{ children: (Element | ReactNode)[]; id?: string | undefined; title?: string | undefined; key?: Key | null | undefined; content?: string | undefined; color?: string | undefined; ... 279 more ...; checked: CheckedState | undefined; }' is not assignable to type 'DropdownMenuCheckboxItemProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'checked' are incompatible.
    Type 'CheckedState | undefined' is not assignable to type 'CheckedState'.
      Type 'undefined' is not assignable to type 'CheckedState'.
components/ui/sonner.tsx(12,6): error TS2375: Type '{ id?: string; invert?: boolean; theme: "system" | "light" | "dark" | undefined; position?: Position; hotkey?: string[]; richColors?: boolean; expand?: boolean; duration?: number; gap?: number; ... 12 more ...; key?: Key | ... 1 more ... | undefined; }' is not assignable to type 'ToasterProps' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'theme' are incompatible.
    Type '"system" | "light" | "dark" | undefined' is not assignable to type '"system" | "light" | "dark"'.
      Type 'undefined' is not assignable to type '"system" | "light" | "dark"'.
components/variable-manager/index.tsx(154,29): error TS2554: Expected 2-4 arguments, but got 1.
components/variable-manager/index.tsx(163,42): error TS2353: Object literal may only specify known properties, and 'variableName' does not exist in type 'ErrorContext'.
components/variable-manager/index.tsx(185,42): error TS2353: Object literal may only specify known properties, and 'variableId' does not exist in type 'ErrorContext'.
components/variable-manager/index.tsx(217,42): error TS2353: Object literal may only specify known properties, and 'variableId' does not exist in type 'ErrorContext'.
components/variable-manager/index.tsx(245,44): error TS2353: Object literal may only specify known properties, and 'variableName' does not exist in type 'ErrorContext'.
components/variable-manager/variable-form-dialog.tsx(129,7): error TS2412: Type 'string | undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'string'.
components/variable-manager/variable-form-dialog.tsx(159,9): error TS2412: Type 'string | undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'string'.
components/variable-manager/variable-form-dialog.tsx(170,9): error TS2412: Type 'string | undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'string'.
components/variable-manager/variable-form-dialog.tsx(197,13): error TS2375: Type '{ name: string; type: VariableType; defaultValue: string | undefined; description: string | undefined; }' is not assignable to type 'Omit<Variable, "id">' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'description' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
components/variable-manager/variable-form-dialog.tsx(217,13): error TS2353: Object literal may only specify known properties, and 'variableName' does not exist in type 'ErrorContext'.
components/variable-manager/variable-form-dialog.tsx(356,13): error TS2322: Type '{ children: string; onClick: () => Promise<void>; disabled: boolean; loading: boolean; }' is not assignable to type 'IntrinsicAttributes & ButtonProps & RefAttributes<HTMLButtonElement>'.
  Property 'loading' does not exist on type 'IntrinsicAttributes & ButtonProps & RefAttributes<HTMLButtonElement>'.
components/video-editor.tsx(118,20): error TS2345: Argument of type '(prev: TrimRange) => { start: number | undefined; end: number; }' is not assignable to parameter of type 'SetStateAction<TrimRange>'.
  Type '(prev: TrimRange) => { start: number | undefined; end: number; }' is not assignable to type '(prevState: TrimRange) => TrimRange'.
    Call signature return types '{ start: number | undefined; end: number; }' and 'TrimRange' are incompatible.
      The types of 'start' are incompatible between these types.
        Type 'number | undefined' is not assignable to type 'number'.
          Type 'undefined' is not assignable to type 'number'.
components/video-editor.tsx(119,18): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
components/video-editor.tsx(126,20): error TS2345: Argument of type '(prev: TrimRange) => { end: number | undefined; start: number; }' is not assignable to parameter of type 'SetStateAction<TrimRange>'.
  Type '(prev: TrimRange) => { end: number | undefined; start: number; }' is not assignable to type '(prevState: TrimRange) => TrimRange'.
    Call signature return types '{ end: number | undefined; start: number; }' and 'TrimRange' are incompatible.
      The types of 'end' are incompatible between these types.
        Type 'number | undefined' is not assignable to type 'number'.
          Type 'undefined' is not assignable to type 'number'.
components/video-editor.tsx(127,18): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
components/video-editor.tsx(331,56): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
components/video-editor.tsx(560,34): error TS2345: Argument of type '(prev: { startTime: number; duration: number; fps: number; width: number; }) => { fps: number | undefined; startTime: number; duration: number; width: number; }' is not assignable to parameter of type 'SetStateAction<{ startTime: number; duration: number; fps: number; width: number; }>'.
  Type '(prev: { startTime: number; duration: number; fps: number; width: number; }) => { fps: number | undefined; startTime: number; duration: number; width: number; }' is not assignable to type '(prevState: { startTime: number; duration: number; fps: number; width: number; }) => { startTime: number; duration: number; fps: number; width: number; }'.
    Call signature return types '{ fps: number | undefined; startTime: number; duration: number; width: number; }' and '{ startTime: number; duration: number; fps: number; width: number; }' are incompatible.
      The types of 'fps' are incompatible between these types.
        Type 'number | undefined' is not assignable to type 'number'.
          Type 'undefined' is not assignable to type 'number'.
components/video-editor.tsx(579,34): error TS2345: Argument of type '(prev: { startTime: number; duration: number; fps: number; width: number; }) => { width: number | undefined; startTime: number; duration: number; fps: number; }' is not assignable to parameter of type 'SetStateAction<{ startTime: number; duration: number; fps: number; width: number; }>'.
  Type '(prev: { startTime: number; duration: number; fps: number; width: number; }) => { width: number | undefined; startTime: number; duration: number; fps: number; }' is not assignable to type '(prevState: { startTime: number; duration: number; fps: number; width: number; }) => { startTime: number; duration: number; fps: number; width: number; }'.
    Call signature return types '{ width: number | undefined; startTime: number; duration: number; fps: number; }' and '{ startTime: number; duration: number; fps: number; width: number; }' are incompatible.
      The types of 'width' are incompatible between these types.
        Type 'number | undefined' is not assignable to type 'number'.
          Type 'undefined' is not assignable to type 'number'.
components/video-player.tsx(194,23): error TS2532: Object is possibly 'undefined'.
components/video-upload.tsx(128,18): error TS2345: Argument of type '{ status: "success"; progress: number; file: File; metadata: VideoMetadata; thumbnail: string | undefined; }' is not assignable to parameter of type 'SetStateAction<UploadState>'.
  Type '{ status: "success"; progress: number; file: File; metadata: VideoMetadata; thumbnail: string | undefined; }' is not assignable to type 'UploadState' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Types of property 'thumbnail' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
components/voice-narration.tsx(28,8): error TS2307: Cannot find module '@/components/ui/popover' or its corresponding type declarations.
components/voice-to-steps.tsx(28,15): error TS2379: Argument of type '{ id: undefined; title: string; description: string; image: any; thumbnail: any; hotspots: never[]; annotations: never[]; masks: never[]; order: number; }' is not assignable to parameter of type 'CreateStepInput' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '{ id: undefined; title: string; description: string; image: any; thumbnail: any; hotspots: never[]; annotations: never[]; masks: never[]; order: number; }' is not assignable to type '{ id?: UUID; order?: number; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Types of property 'id' are incompatible.
      Type 'undefined' is not assignable to type 'UUID'.
        Type 'undefined' is not assignable to type 'string'.
hooks/use-collaboration.ts(119,31): error TS2341: Property 'client' is private and only accessible within class 'CollaborationManager'.
hooks/use-collaboration.ts(121,17): error TS2341: Property 'client' is private and only accessible within class 'CollaborationManager'.
hooks/use-collaboration.ts(122,26): error TS2341: Property 'client' is private and only accessible within class 'CollaborationManager'.
hooks/use-collaboration.ts(123,28): error TS2341: Property 'client' is private and only accessible within class 'CollaborationManager'.
hooks/use-collaboration.ts(130,17): error TS2341: Property 'client' is private and only accessible within class 'CollaborationManager'.
hooks/use-collaboration.ts(131,29): error TS2341: Property 'client' is private and only accessible within class 'CollaborationManager'.
hooks/use-collaboration.ts(149,15): error TS2375: Type '{ roomId: string; userId: string; userName: string; userColor: string | undefined; enableCursors: boolean | undefined; enablePresence: boolean | undefined; enableContentSync: boolean | undefined; ... 4 more ...; inviteToken: string | undefined; }' is not assignable to type 'CollaborationOptions' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'userColor' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
hooks/use-collaboration.ts(258,21): error TS2341: Property 'client' is private and only accessible within class 'CollaborationManager'.
hooks/use-collaboration.ts(337,3): error TS2375: Type '{ isConnected: boolean; isReconnecting: boolean; connectionStatus: "connecting" | "connected" | "disconnected" | "reconnecting"; error: string | null; users: User[]; cursors: UserCursor[]; ... 25 more ...; manager: CollaborationManager | null; }' is not assignable to type 'UseCollaborationReturn' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'currentRole' are incompatible.
    Type 'Role | undefined' is not assignable to type 'Role'.
      Type 'undefined' is not assignable to type 'Role'.
hooks/use-keyboard-focus 2.ts(120,32): error TS2538: Type 'undefined' cannot be used as an index type.
hooks/use-keyboard-focus 2.ts(132,19): error TS2345: Argument of type 'FocusZone | undefined' is not assignable to parameter of type 'FocusZone'.
  Type 'undefined' is not assignable to type 'FocusZone'.
hooks/use-keyboard-focus 2.ts(283,15): error TS2484: Export declaration conflicts with exported declaration of 'FocusZone'.
hooks/use-keyboard-focus.ts(120,32): error TS2538: Type 'undefined' cannot be used as an index type.
hooks/use-keyboard-focus.ts(132,19): error TS2345: Argument of type 'FocusZone | undefined' is not assignable to parameter of type 'FocusZone'.
  Type 'undefined' is not assignable to type 'FocusZone'.
hooks/use-keyboard-focus.ts(283,15): error TS2484: Export declaration conflicts with exported declaration of 'FocusZone'.
hooks/use-keyboard-shortcuts.ts(107,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(128,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(141,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(151,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(162,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(263,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(274,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(299,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(302,44): error TS7006: Parameter 's' implicitly has an 'any' type.
hooks/use-keyboard-shortcuts.ts(312,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(315,44): error TS7006: Parameter 's' implicitly has an 'any' type.
hooks/use-keyboard-shortcuts.ts(325,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(336,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(358,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(368,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(378,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(388,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-keyboard-shortcuts.ts(398,36): error TS2339: Property 'getState' does not exist on type '() => { currentStepId: UUID | null; selectedHotspotId: UUID | null; selectedAnnotationId: UUID | null; selectedMaskId: UUID | null; editorMode: EditorMode; ... 111 more ...; clearLocalStorage: () => void; }'.
hooks/use-multi-select.ts(93,28): error TS2532: Object is possibly 'undefined'.
hooks/use-performance.ts(18,22): error TS2554: Expected 1 arguments, but got 0.
hooks/use-performance.ts(78,27): error TS2554: Expected 1 arguments, but got 0.
hooks/use-performance.ts(79,21): error TS2554: Expected 1 arguments, but got 0.
hooks/use-performance.ts(171,29): error TS18048: 'entry' is possibly 'undefined'.
hooks/use-performance.ts(172,20): error TS2345: Argument of type 'IntersectionObserverEntry | undefined' is not assignable to parameter of type 'SetStateAction<IntersectionObserverEntry | null>'.
  Type 'undefined' is not assignable to type 'SetStateAction<IntersectionObserverEntry | null>'.
hooks/use-performance.ts(419,22): error TS2345: Argument of type 'K | undefined' is not assignable to parameter of type 'K'.
  'K' could be instantiated with an arbitrary type which could be unrelated to 'K | undefined'.
hooks/use-smart-guides.ts(248,13): error TS18048: 'last' is possibly 'undefined'.
hooks/use-smart-guides.ts(248,22): error TS18048: 'last' is possibly 'undefined'.
hooks/use-smart-guides.ts(248,35): error TS18048: 'first' is possibly 'undefined'.
hooks/use-smart-guides.ts(249,13): error TS18048: 'last' is possibly 'undefined'.
hooks/use-smart-guides.ts(249,22): error TS18048: 'last' is possibly 'undefined'.
hooks/use-smart-guides.ts(249,36): error TS18048: 'first' is possibly 'undefined'.
hooks/use-smart-guides.ts(260,13): error TS18048: 'first' is possibly 'undefined'.
hooks/use-smart-guides.ts(260,23): error TS18048: 'first' is possibly 'undefined'.
hooks/use-smart-guides.ts(261,13): error TS18048: 'first' is possibly 'undefined'.
hooks/use-smart-guides.ts(261,23): error TS18048: 'first' is possibly 'undefined'.
hooks/use-smart-guides.ts(284,15): error TS2532: Object is possibly 'undefined'.
hooks/use-smart-guides.ts(285,15): error TS2532: Object is possibly 'undefined'.
hooks/use-speech-to-steps.ts(50,23): error TS18048: 'firstLine' is possibly 'undefined'.
hooks/use-speech-to-steps.ts(51,20): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
hooks/use-speech-to-steps.ts(76,23): error TS2304: Cannot find name 'prev'.
lib/ai/accessibility.ts(22,19): error TS2532: Object is possibly 'undefined'.
lib/ai/accessibility.ts(22,35): error TS2532: Object is possibly 'undefined'.
lib/ai/accessibility.ts(22,51): error TS2532: Object is possibly 'undefined'.
lib/ai/content-generator.ts(442,16): error TS7006: Parameter 'line' implicitly has an 'any' type.
lib/ai/content-generator.ts(461,13): error TS7006: Parameter 's' implicitly has an 'any' type.
lib/ai/content-generator.ts(462,16): error TS7006: Parameter 's' implicitly has an 'any' type.
lib/ai/content-generator.ts(481,16): error TS7006: Parameter 'line' implicitly has an 'any' type.
lib/ai/content-generator.ts(553,16): error TS2339: Property 'accessibility' does not exist on type 'ContentPreferences'.
lib/ai/content-generator.ts(708,30): error TS2339: Property 'accessibility' does not exist on type 'ContentPreferences'.
lib/ai/content-generator.ts(735,5): error TS2375: Type '{ isValid: boolean; issues: ValidationIssue[] | undefined; score: number; recommendations: string[]; }' is not assignable to type 'ContentValidation' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'issues' are incompatible.
    Type 'ValidationIssue[] | undefined' is not assignable to type 'readonly ValidationIssue[]'.
      Type 'undefined' is not assignable to type 'readonly ValidationIssue[]'.
lib/ai/flow-analyzer.ts(326,65): error TS2345: Argument of type 'Step | undefined' is not assignable to parameter of type 'Step'.
  Type 'undefined' is not assignable to type 'Step'.
lib/ai/flow-analyzer.ts(672,55): error TS2345: Argument of type 'Step | undefined' is not assignable to parameter of type 'Step'.
  Type 'undefined' is not assignable to type 'Step'.
lib/ai/flow-analyzer.ts(678,33): error TS18048: 'step' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(679,27): error TS18048: 'step' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(703,31): error TS18048: 'previousStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(704,30): error TS18048: 'currentStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(705,31): error TS18048: 'currentStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(706,30): error TS18048: 'previousStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(711,11): error TS2345: Argument of type 'Step | undefined' is not assignable to parameter of type 'Step'.
  Type 'undefined' is not assignable to type 'Step'.
lib/ai/flow-analyzer.ts(719,57): error TS18048: 'previousStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(719,85): error TS18048: 'currentStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(720,29): error TS18048: 'previousStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(720,46): error TS18048: 'currentStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(740,57): error TS2345: Argument of type 'Step | undefined' is not assignable to parameter of type 'Step'.
  Type 'undefined' is not assignable to type 'Step'.
lib/ai/flow-analyzer.ts(746,36): error TS18048: 'stepA' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(746,57): error TS18048: 'stepB' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(747,29): error TS18048: 'stepA' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(747,39): error TS18048: 'stepB' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1059,11): error TS2532: Object is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1059,23): error TS2532: Object is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1068,11): error TS2532: Object is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1068,29): error TS2532: Object is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1114,30): error TS18048: 'currentStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1114,65): error TS18048: 'nextStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1160,31): error TS18048: 'currentStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1160,66): error TS18048: 'nextStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1161,31): error TS18048: 'nextStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1161,63): error TS18048: 'currentStep' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1166,11): error TS2345: Argument of type 'Step | undefined' is not assignable to parameter of type 'Step'.
  Type 'undefined' is not assignable to type 'Step'.
lib/ai/flow-analyzer.ts(1182,57): error TS2345: Argument of type 'Step | undefined' is not assignable to parameter of type 'Step'.
  Type 'undefined' is not assignable to type 'Step'.
lib/ai/flow-analyzer.ts(1419,47): error TS2345: Argument of type 'UUID | undefined' is not assignable to parameter of type 'UUID'.
  Type 'undefined' is not assignable to type 'UUID'.
    Type 'undefined' is not assignable to type 'string'.
lib/ai/flow-analyzer.ts(1429,29): error TS2322: Type 'UUID | undefined' is not assignable to type 'UUID'.
  Type 'undefined' is not assignable to type 'UUID'.
    Type 'undefined' is not assignable to type 'string'.
lib/ai/flow-analyzer.ts(1450,55): error TS2345: Argument of type 'Step | undefined' is not assignable to parameter of type 'Step'.
  Type 'undefined' is not assignable to type 'Step'.
lib/ai/flow-analyzer.ts(1454,9): error TS18048: 'stepA' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1455,9): error TS18048: 'stepB' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1459,45): error TS18048: 'stepA' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1459,66): error TS18048: 'stepB' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1462,27): error TS18048: 'stepA' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1462,37): error TS18048: 'stepB' is possibly 'undefined'.
lib/ai/flow-analyzer.ts(1802,9): error TS2375: Type '{ steps: readonly Step[]; userBehavior: UserBehaviorData | undefined; goals: readonly FlowGoal[] | undefined; }' is not assignable to type 'FlowAnalysisRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'userBehavior' are incompatible.
    Type 'UserBehaviorData | undefined' is not assignable to type 'UserBehaviorData'.
      Type 'undefined' is not assignable to type 'UserBehaviorData'.
lib/ai/image-element-detector.ts(41,25): error TS18048: 'r' is possibly 'undefined'.
lib/ai/image-element-detector.ts(41,38): error TS18048: 'g' is possibly 'undefined'.
lib/ai/image-element-detector.ts(41,51): error TS18048: 'b' is possibly 'undefined'.
lib/ai/image-element-detector.ts(57,21): error TS2532: Object is possibly 'undefined'.
lib/ai/image-element-detector.ts(58,21): error TS2532: Object is possibly 'undefined'.
lib/ai/image-element-detector.ts(68,47): error TS2532: Object is possibly 'undefined'.
lib/ai/image-element-detector.ts(72,49): error TS2532: Object is possibly 'undefined'.
lib/ai/image-element-detector.ts(100,13): error TS18048: 'cx' is possibly 'undefined'.
lib/ai/image-element-detector.ts(100,22): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
lib/ai/image-element-detector.ts(101,13): error TS18048: 'cy' is possibly 'undefined'.
lib/ai/image-element-detector.ts(101,22): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
lib/ai/image-element-detector.ts(102,13): error TS18048: 'cx' is possibly 'undefined'.
lib/ai/image-element-detector.ts(102,22): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
lib/ai/image-element-detector.ts(103,13): error TS18048: 'cy' is possibly 'undefined'.
lib/ai/image-element-detector.ts(103,22): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
lib/ai/image-element-detector.ts(107,24): error TS18048: 'cx' is possibly 'undefined'.
lib/ai/image-element-detector.ts(108,20): error TS18048: 'cy' is possibly 'undefined'.
lib/ai/prompt-engineering.ts(1244,3): error TS2375: Type '{ domain: string; userExpertise: "novice" | "intermediate" | "expert"; taskComplexity: "simple" | "moderate"; culturalContext: { language: string; communicationStyle: "formal" | "casual"; } | undefined; technicalContext: { ...; } | undefined; }' is not assignable to type 'PromptContext' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'culturalContext' are incompatible.
    Type '{ language: string; communicationStyle: "formal" | "casual"; } | undefined' is not assignable to type 'CulturalContext'.
      Type 'undefined' is not assignable to type 'CulturalContext'.
lib/ai/step-optimizer.ts(359,8): error TS2345: Argument of type '{ chainOfThought: true; fewShotLearning: true; responseFormat: "structured"; }' is not assignable to parameter of type 'PromptGenerationOptions'.
  Property 'optimizationType' is missing in type '{ chainOfThought: true; fewShotLearning: true; responseFormat: "structured"; }' but required in type 'PromptGenerationOptions'.
lib/ai/step-optimizer.ts(366,5): error TS2375: Type '{ type: "flow_optimization"; confidence: number; suggestions: OptimizationSuggestion[]; reorderedSteps: readonly Step[] | undefined; predictedImprovement: PredictedImprovement; implementationDifficulty: "low" | ... 1 more ... | "high"; estimatedEffort: string; metadata: { ...; }; }' is not assignable to type 'OptimizationResult' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'reorderedSteps' are incompatible.
    Type 'readonly Step[] | undefined' is not assignable to type 'readonly Step[]'.
      Type 'undefined' is not assignable to type 'readonly Step[]'.
lib/ai/step-optimizer.ts(396,8): error TS2345: Argument of type '{ fewShotLearning: true; responseFormat: "structured"; }' is not assignable to parameter of type 'PromptGenerationOptions'.
  Property 'optimizationType' is missing in type '{ fewShotLearning: true; responseFormat: "structured"; }' but required in type 'PromptGenerationOptions'.
lib/ai/step-optimizer.ts(434,8): error TS2345: Argument of type '{ chainOfThought: true; fewShotLearning: true; responseFormat: "structured"; }' is not assignable to parameter of type 'PromptGenerationOptions'.
  Property 'optimizationType' is missing in type '{ chainOfThought: true; fewShotLearning: true; responseFormat: "structured"; }' but required in type 'PromptGenerationOptions'.
lib/ai/step-optimizer.ts(441,5): error TS2375: Type '{ type: "user_journey"; confidence: number; suggestions: OptimizationSuggestion[]; reorderedSteps: readonly Step[] | undefined; predictedImprovement: PredictedImprovement; implementationDifficulty: "low" | ... 1 more ... | "high"; estimatedEffort: string; metadata: { ...; }; }' is not assignable to type 'OptimizationResult' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'reorderedSteps' are incompatible.
    Type 'readonly Step[] | undefined' is not assignable to type 'readonly Step[]'.
      Type 'undefined' is not assignable to type 'readonly Step[]'.
lib/ai/step-optimizer.ts(464,8): error TS2345: Argument of type '{ responseFormat: "structured"; }' is not assignable to parameter of type 'PromptGenerationOptions'.
  Property 'optimizationType' is missing in type '{ responseFormat: "structured"; }' but required in type 'PromptGenerationOptions'.
lib/ai/step-optimizer.ts(494,8): error TS2345: Argument of type '{ responseFormat: "structured"; }' is not assignable to parameter of type 'PromptGenerationOptions'.
  Property 'optimizationType' is missing in type '{ responseFormat: "structured"; }' but required in type 'PromptGenerationOptions'.
lib/ai/step-optimizer.ts(524,8): error TS2345: Argument of type '{ responseFormat: "structured"; }' is not assignable to parameter of type 'PromptGenerationOptions'.
  Property 'optimizationType' is missing in type '{ responseFormat: "structured"; }' but required in type 'PromptGenerationOptions'.
lib/ai/step-optimizer.ts(572,5): error TS2375: Type '{ type: "comprehensive"; confidence: number; suggestions: OptimizationSuggestion[]; reorderedSteps: readonly Step[] | undefined; predictedImprovement: PredictedImprovement; implementationDifficulty: "low" | ... 1 more ... | "high"; estimatedEffort: string; metadata: { ...; }; }' is not assignable to type 'OptimizationResult' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'reorderedSteps' are incompatible.
    Type 'readonly Step[] | undefined' is not assignable to type 'readonly Step[]'.
      Type 'undefined' is not assignable to type 'readonly Step[]'.
lib/ai/step-optimizer.ts(643,38): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/ai/step-optimizer.ts(644,34): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/ai/step-optimizer.ts(645,34): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/ai/step-optimizer.ts(735,5): error TS2375: Type '{ conversionRate: { current: number; predicted: number; } | undefined; completionRate: { current: number; predicted: number; } | undefined; userSatisfaction: { current: number; predicted: number; }; confidence: number; methodology: string; }' is not assignable to type 'PredictedImprovement' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'conversionRate' are incompatible.
    Type '{ current: number; predicted: number; } | undefined' is not assignable to type '{ current: number; predicted: number; }'.
      Type 'undefined' is not assignable to type '{ current: number; predicted: number; }'.
lib/ai/step-optimizer.ts(759,9): error TS18048: 'effortCounts.high' is possibly 'undefined'.
lib/ai/step-optimizer.ts(760,9): error TS18048: 'effortCounts.medium' is possibly 'undefined'.
lib/analytics/consent.ts(30,7): error TS2375: Type '{ status: ConsentStatus; updatedAt: string; policyVersion: string | undefined; categories: { analytics?: boolean; } | undefined; }' is not assignable to type 'ConsentRecord' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'policyVersion' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/analytics/consent.ts(50,13): error TS2375: Type '{ status: ConsentStatus; updatedAt: string; policyVersion: string | undefined; categories: { analytics?: boolean; }; }' is not assignable to type 'ConsentRecord' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'policyVersion' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/analytics/insights.ts(188,9): error TS18048: 'prev' is possibly 'undefined'.
lib/analytics/insights.ts(188,28): error TS18048: 'cur' is possibly 'undefined'.
lib/analytics/insights.ts(189,26): error TS18048: 'prev' is possibly 'undefined'.
lib/analytics/insights.ts(189,45): error TS18048: 'prev' is possibly 'undefined'.
lib/analytics/insights.ts(190,25): error TS18048: 'cur' is possibly 'undefined'.
lib/analytics/insights.ts(190,43): error TS18048: 'cur' is possibly 'undefined'.
lib/analytics/tracker.ts(100,5): error TS2412: Type 'string | undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'string'.
lib/analytics/tracker.ts(194,11): error TS2375: Type '{ id: string; timestamp: Date; sessionId: string; userId: string | undefined; projectId: string; type: EventType; data: EventData; metadata: Record<string, any> | undefined; }' is not assignable to type 'AnalyticsEvent' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'userId' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/analytics/tracker.ts(288,11): error TS2375: Type '{ id: string; userId: string | undefined; projectId: string; startTime: Date; endTime: Date; duration: number; events: AnalyticsEvent[]; completed: true; device: DeviceInfo; }' is not assignable to type 'AnalyticsSession' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'userId' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/analytics/tracker.ts(404,5): error TS2375: Type '{ exportedAt: string; projectId: string | undefined; events: AnalyticsEvent[]; sessions: AnalyticsSession[]; }' is not assignable to type '{ exportedAt: string; projectId?: string; events: AnalyticsEvent[]; sessions: AnalyticsSession[]; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'projectId' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/analytics/tracker.ts(721,32): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/analytics/tracker.ts(722,24): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type 'string | undefined' is not assignable to parameter of type 'string | number | Date'.
      Type 'undefined' is not assignable to type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type 'string | undefined' is not assignable to parameter of type 'string | number'.
      Type 'undefined' is not assignable to type 'string | number'.
lib/analytics/tracker.ts(736,19): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/analytics/tracker.ts(744,34): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/analytics/tracker.ts(745,26): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type 'string | undefined' is not assignable to parameter of type 'string | number | Date'.
      Type 'undefined' is not assignable to type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type 'string | undefined' is not assignable to parameter of type 'string | number'.
      Type 'undefined' is not assignable to type 'string | number'.
lib/analytics/tracker.ts(753,21): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/collaboration/collaboration-manager.ts(55,5): error TS2412: Type 'CollaborationEventHandlers | undefined' is not assignable to type 'CollaborationEventHandlers' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'CollaborationEventHandlers'.
lib/collaboration/websocket-client.ts(297,9): error TS2375: Type '{ resolved: boolean; id?: string; stepId?: string; content?: string; authorId?: string; authorName?: string; mentions?: string[]; parentId?: string; createdAt?: Date; updatedAt?: Date; }' is not assignable to type 'StepComment' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Property 'id' is optional in type '{ resolved: boolean; id?: string; stepId?: string; content?: string; authorId?: string; authorName?: string; mentions?: string[]; parentId?: string; createdAt?: Date; updatedAt?: Date; }' but required in type 'StepComment'.
lib/collaboration/websocket-client.ts(404,38): error TS2379: Argument of type '{ roomId: string; user: Omit<User, "isOnline" | "lastSeen">; password: string | undefined; inviteToken: string | undefined; }' is not assignable to parameter of type '{ roomId: string; user: Omit<User, "isOnline" | "lastSeen">; password?: string; inviteToken?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'password' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/collaboration/websocket-client.ts(591,5): error TS2322: Type '"#FF6B6B" | "#4ECDC4" | "#45B7D1" | "#F9CA24" | "#F0932B" | "#EB4D4B" | "#6C5CE7" | "#A29BFE" | "#2D3436" | "#00B894" | "#FDCB6E" | "#E17055" | undefined' is not assignable to type '"#FF6B6B" | "#4ECDC4" | "#45B7D1" | "#F9CA24" | "#F0932B" | "#EB4D4B" | "#6C5CE7" | "#A29BFE" | "#2D3436" | "#00B894" | "#FDCB6E" | "#E17055"'.
  Type 'undefined' is not assignable to type '"#FF6B6B" | "#4ECDC4" | "#45B7D1" | "#F9CA24" | "#F0932B" | "#EB4D4B" | "#6C5CE7" | "#A29BFE" | "#2D3436" | "#00B894" | "#FDCB6E" | "#E17055"'.
lib/collaboration/websocket-client.ts(774,11): error TS2322: Type '{ id: string; fileName: string; mimeType: string; size: number; dataUrl: string | undefined; }[]' is not assignable to type 'ChatAttachment[]'.
  Type '{ id: string; fileName: string; mimeType: string; size: number; dataUrl: string | undefined; }' is not assignable to type 'ChatAttachment' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Types of property 'dataUrl' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
lib/dom-clone.ts(369,18): error TS18048: 'attr' is possibly 'undefined'.
lib/dom-clone.ts(369,31): error TS18048: 'attr' is possibly 'undefined'.
lib/dom-clone.ts(405,5): error TS2322: Type 'number | boolean' is not assignable to type 'boolean'.
  Type 'number' is not assignable to type 'boolean'.
lib/dom-clone.ts(489,5): error TS2375: Type '{ title: string; description: string | undefined; charset: string; language: string; }' is not assignable to type '{ title: string; description?: string; charset: string; language: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'description' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/dom-clone.ts(554,32): error TS2345: Argument of type '{ id: string; shape: "rect"; x: number; y: number; w: number; h: number; label: string; tooltipText: string; }' is not assignable to parameter of type 'never'.
lib/error-handler 2.ts(32,5): error TS2412: Type 'string | undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'string'.
lib/error-handler 2.ts(33,5): error TS2412: Type 'Record<string, unknown> | undefined' is not assignable to type 'Record<string, unknown>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'Record<string, unknown>'.
lib/error-handler.ts(32,5): error TS2412: Type 'string | undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'string'.
lib/error-handler.ts(33,5): error TS2412: Type 'Record<string, unknown> | undefined' is not assignable to type 'Record<string, unknown>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'Record<string, unknown>'.
lib/error-handling.ts(165,7): error TS2379: Argument of type '{ userMessage: string; context?: ErrorContext; originalError: Error | undefined; }' is not assignable to parameter of type '{ originalError?: Error; context?: ErrorContext; userMessage?: string; recoveryAction?: string; documentationUrl?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'originalError' are incompatible.
    Type 'Error | undefined' is not assignable to type 'Error'.
      Type 'undefined' is not assignable to type 'Error'.
lib/error-handling.ts(186,7): error TS2379: Argument of type '{ userMessage: string; context?: ErrorContext; originalError: Error | undefined; }' is not assignable to parameter of type '{ originalError?: Error; context?: ErrorContext; userMessage?: string; recoveryAction?: string; documentationUrl?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'originalError' are incompatible.
    Type 'Error | undefined' is not assignable to type 'Error'.
      Type 'undefined' is not assignable to type 'Error'.
lib/error-handling.ts(207,7): error TS2379: Argument of type '{ userMessage: string; context?: ErrorContext; originalError: Error | undefined; }' is not assignable to parameter of type '{ originalError?: Error; context?: ErrorContext; userMessage?: string; recoveryAction?: string; documentationUrl?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'originalError' are incompatible.
    Type 'Error | undefined' is not assignable to type 'Error'.
      Type 'undefined' is not assignable to type 'Error'.
lib/error-handling.ts(227,7): error TS2379: Argument of type '{ userMessage: string; context?: ErrorContext; originalError: Error | undefined; }' is not assignable to parameter of type '{ originalError?: Error; context?: ErrorContext; userMessage?: string; recoveryAction?: string; documentationUrl?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'originalError' are incompatible.
    Type 'Error | undefined' is not assignable to type 'Error'.
      Type 'undefined' is not assignable to type 'Error'.
lib/error-handling.ts(248,7): error TS2379: Argument of type '{ userMessage: string; context?: ErrorContext; originalError: Error | undefined; }' is not assignable to parameter of type '{ originalError?: Error; context?: ErrorContext; userMessage?: string; recoveryAction?: string; documentationUrl?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'originalError' are incompatible.
    Type 'Error | undefined' is not assignable to type 'Error'.
      Type 'undefined' is not assignable to type 'Error'.
lib/error-handling.ts(389,7): error TS2379: Argument of type '{ context: ErrorContext | undefined; }' is not assignable to parameter of type '{ context?: ErrorContext; userMessage?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'context' are incompatible.
    Type 'ErrorContext | undefined' is not assignable to type 'ErrorContext'.
      Type 'undefined' is not assignable to type 'ErrorContext'.
lib/error-handling.ts(411,7): error TS2379: Argument of type '{ context: ErrorContext | undefined; }' is not assignable to parameter of type '{ context?: ErrorContext; userMessage?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'context' are incompatible.
    Type 'ErrorContext | undefined' is not assignable to type 'ErrorContext'.
      Type 'undefined' is not assignable to type 'ErrorContext'.
lib/error-handling.ts(427,12): error TS2352: Conversion of type 'Error & Record<"category", unknown> & Record<"severity", unknown>' to type 'PLAINERError' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type 'Error & Record<"category", unknown> & Record<"severity", unknown>' is missing the following properties from type 'PLAINERError': id, code, timestamp
lib/error-handling.ts(434,5): error TS2379: Argument of type '{ context: ErrorContext | undefined; }' is not assignable to parameter of type '{ context?: ErrorContext; userMessage?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'context' are incompatible.
    Type 'ErrorContext | undefined' is not assignable to type 'ErrorContext'.
      Type 'undefined' is not assignable to type 'ErrorContext'.
lib/performance 2.ts(18,22): error TS2554: Expected 1 arguments, but got 0.
lib/performance 2.ts(52,22): error TS2554: Expected 1 arguments, but got 0.
lib/performance 2.ts(95,15): error TS2554: Expected 1 arguments, but got 0.
lib/performance 2.ts(150,37): error TS2304: Cannot find name 'useState'.
lib/performance 2.ts(187,21): error TS2554: Expected 1 arguments, but got 0.
lib/performance 2.ts(206,7): error TS2322: Type 'Record<string, any> | undefined' is not assignable to type 'Record<string, any>'.
  Type 'undefined' is not assignable to type 'Record<string, any>'.
lib/performance 2.ts(218,10): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance 2.ts(308,25): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance 2.ts(311,21): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance 2.ts(312,7): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance 2.ts(313,9): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance 2.ts(314,21): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance 2.ts(315,9): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance.ts(18,22): error TS2554: Expected 1 arguments, but got 0.
lib/performance.ts(52,22): error TS2554: Expected 1 arguments, but got 0.
lib/performance.ts(95,15): error TS2554: Expected 1 arguments, but got 0.
lib/performance.ts(150,37): error TS2304: Cannot find name 'useState'.
lib/performance.ts(187,21): error TS2554: Expected 1 arguments, but got 0.
lib/performance.ts(206,7): error TS2322: Type 'Record<string, any> | undefined' is not assignable to type 'Record<string, any>'.
  Type 'undefined' is not assignable to type 'Record<string, any>'.
lib/performance.ts(218,10): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance.ts(308,25): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance.ts(311,21): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance.ts(312,7): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance.ts(313,9): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance.ts(314,21): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/performance.ts(315,9): error TS2686: 'React' refers to a UMD global, but the current file is a module. Consider adding an import instead.
lib/prompt-templates.ts(6,5): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(23,5): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(41,5): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(59,5): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(78,5): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(97,5): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(171,7): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(190,9): error TS18048: 'template' is possibly 'undefined'.
lib/prompt-templates.ts(192,56): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/prompt-templates.ts(194,5): error TS2322: Type 'PromptTemplate | undefined' is not assignable to type 'PromptTemplate | null'.
  Type 'undefined' is not assignable to type 'PromptTemplate | null'.
lib/prompt-templates.ts(204,9): error TS18048: 'template' is possibly 'undefined'.
lib/prompt-templates.ts(234,31): error TS2532: Object is possibly 'undefined'.
lib/prompt-templates.ts(235,24): error TS2532: Object is possibly 'undefined'.
lib/storage/indexed-db.ts(128,11): error TS2375: Type '{ id: string; name: string; thumbnail: URLString | undefined; size: number; createdAt: Date; updatedAt: Date; lastAccessedAt: Date; version: string; }' is not assignable to type 'StorageMetadata' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'thumbnail' are incompatible.
    Type 'URLString | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/storage/indexed-db.ts(247,7): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/storage/indexed-db.ts(400,5): error TS2375: Type '{ id: string; name: string; thumbnail: URLString | undefined; size: number; createdAt: Date; updatedAt: Date; lastAccessedAt: Date; version: string; }' is not assignable to type 'StorageMetadata' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'thumbnail' are incompatible.
    Type 'URLString | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/stores/project-store.ts(181,3): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
lib/stores/project-store.ts(182,3): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
lib/stores/project-store.ts(183,3): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
lib/stores/project-store.ts(184,3): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
lib/stores/project-store.ts(185,3): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
lib/stores/project-store.ts(186,3): error TS2322: Type 'string' is not assignable to type 'HexColor'.
  Type 'string' is not assignable to type '{ readonly __brand: "HexColor"; }'.
lib/stores/project-store.ts(396,38): error TS2322: Type '(RectHotspot | CircleHotspot | FreeHotspot | { shape: "rect" | "circle"; r?: NormalizedCoordinate; id: UUID; ... 8 more ...; h: NormalizedCoordinate; } | ... 4 more ... | { ...; })[]' is not assignable to type 'readonly Hotspot[]'.
  Type 'RectHotspot | CircleHotspot | FreeHotspot | { shape: "rect" | "circle"; r?: NormalizedCoordinate; id: UUID; ... 8 more ...; h: NormalizedCoordinate; } | ... 4 more ... | { ...; }' is not assignable to type 'Hotspot' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Type '{ shape: "rect" | "circle"; r?: NormalizedCoordinate; id: UUID; x: NormalizedCoordinate; ... 7 more ...; h: NormalizedCoordinate; }' is not assignable to type 'Hotspot' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
      Type '{ shape: "rect" | "circle"; r?: NormalizedCoordinate; id: UUID; x: NormalizedCoordinate; ... 7 more ...; h: NormalizedCoordinate; }' is not assignable to type 'RectHotspot | CircleHotspot' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
        Type '{ shape: "rect" | "circle"; r?: NormalizedCoordinate; id: UUID; x: NormalizedCoordinate; ... 7 more ...; h: NormalizedCoordinate; }' is not assignable to type 'RectHotspot' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
          Types of property 'shape' are incompatible.
            Type '"rect" | "circle"' is not assignable to type '"rect"'.
              Type '"circle"' is not assignable to type '"rect"'.
lib/stores/ui-store.ts(426,31): error TS2379: Argument of type '{ type: "success"; title: string; message: string | undefined; duration: number; }' is not assignable to parameter of type 'Omit<Notification, "id" | "timestamp">' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'message' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/stores/ui-store.ts(435,31): error TS2379: Argument of type '{ type: "error"; title: string; message: string | undefined; duration: number; }' is not assignable to parameter of type 'Omit<Notification, "id" | "timestamp">' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'message' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/stores/ui-store.ts(444,31): error TS2379: Argument of type '{ type: "warning"; title: string; message: string | undefined; duration: number; }' is not assignable to parameter of type 'Omit<Notification, "id" | "timestamp">' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'message' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/stores/ui-store.ts(453,31): error TS2379: Argument of type '{ type: "info"; title: string; message: string | undefined; duration: number; }' is not assignable to parameter of type 'Omit<Notification, "id" | "timestamp">' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'message' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/templates/template-manager.ts(207,5): error TS2322: Type '{ title: string; description: string; narrationText: string | undefined; id: string; imageUrl?: string; hotspots?: TemplateHotspot[]; videoUrl?: string; duration?: number; }[]' is not assignable to type 'TemplateStep[]'.
  Type '{ title: string; description: string; narrationText: string | undefined; id: string; imageUrl?: string; hotspots?: TemplateHotspot[]; videoUrl?: string; duration?: number; }' is not assignable to type 'TemplateStep' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Types of property 'narrationText' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
lib/types/ai.ts(32,18): error TS2320: Interface 'LiveSession' cannot simultaneously extend types 'BaseEntity' and 'TimestampedEntity'.
  Named property 'createdAt' of types 'BaseEntity' and 'TimestampedEntity' are not identical.
lib/types/ai.ts(84,18): error TS2320: Interface 'Suggestion' cannot simultaneously extend types 'BaseEntity' and 'TimestampedEntity'.
  Named property 'createdAt' of types 'BaseEntity' and 'TimestampedEntity' are not identical.
lib/types/project.ts(110,18): error TS2320: Interface 'Step' cannot simultaneously extend types 'NamedEntity' and 'TimestampedEntity'.
  Named property 'createdAt' of types 'NamedEntity' and 'TimestampedEntity' are not identical.
lib/types/project.ts(169,18): error TS2320: Interface 'Project' cannot simultaneously extend types 'NamedEntity' and 'TimestampedEntity'.
  Named property 'createdAt' of types 'NamedEntity' and 'TimestampedEntity' are not identical.
lib/url-compression.ts(41,19): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/url-compression.ts(61,40): error TS18048: 'distance' is possibly 'undefined'.
lib/url-compression.ts(62,27): error TS18048: 'length' is possibly 'undefined'.
lib/url-compression.ts(63,21): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/url-compression.ts(69,19): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/url-compression.ts(190,16): error TS2339: Property 'w' does not exist on type 'Hotspot'.
  Property 'w' does not exist on type 'CircleHotspot'.
lib/url-compression.ts(191,16): error TS2339: Property 'h' does not exist on type 'Hotspot'.
  Property 'h' does not exist on type 'CircleHotspot'.
lib/url-compression.ts(192,16): error TS2339: Property 'r' does not exist on type 'Hotspot'.
  Property 'r' does not exist on type 'RectHotspot'.
lib/utils/dom.ts(63,7): error TS18048: 'lastFocusable' is possibly 'undefined'.
lib/utils/dom.ts(66,7): error TS18048: 'firstFocusable' is possibly 'undefined'.
lib/utils/math.ts(76,13): error TS2532: Object is possibly 'undefined'.
lib/utils/math.ts(76,34): error TS2532: Object is possibly 'undefined'.
lib/utils/math.ts(78,3): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
lib/utils/math.ts(162,15): error TS2532: Object is possibly 'undefined'.
lib/utils/math.ts(164,7): error TS2322: Type 'T | undefined' is not assignable to type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'T | undefined'.
lib/utils/math.ts(168,3): error TS2322: Type 'T | undefined' is not assignable to type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'T | undefined'.
lib/utils/string.ts(79,46): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/utils/string.ts(163,5): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(169,9): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(169,9): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
lib/utils/string.ts(169,24): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(171,9): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(172,11): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(172,11): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(173,11): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(173,11): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(174,11): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(174,11): error TS2532: Object is possibly 'undefined'.
lib/utils/string.ts(180,3): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
lib/utils/string.ts(180,10): error TS2532: Object is possibly 'undefined'.
lib/validation 2.ts(356,33): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/validation.ts(356,33): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/variables.ts(14,5): error TS4104: The type 'readonly Variable[]' is 'readonly' and cannot be assigned to the mutable type 'Variable[]'.
lib/variables.ts(15,5): error TS2740: Type 'Readonly<Record<string, string>>' is missing the following properties from type 'Readonly<Record<string, string>>[]': length, pop, push, concat, and 29 more.
lib/variables.ts(53,7): error TS2542: Index signature in type 'Readonly<Record<string, string>>' only permits reading.
lib/variables.ts(75,49): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/variables.ts(87,55): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/variables.ts(89,55): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/variables.ts(91,56): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/variables.ts(93,56): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/variables.ts(114,40): error TS2551: Property 'condition' does not exist on type 'ConditionalStep'. Did you mean 'conditions'?
lib/variables.ts(122,5): error TS2322: Type '{ title: string; description: string | undefined; annotations: { text: string; id: UUID; x: NormalizedCoordinate; y: NormalizedCoordinate; style?: AnnotationStyle; variables?: readonly string[]; }[]; ... 9 more ...; isVisible?: boolean; }[]' is not assignable to type 'Step[]'.
  Type '{ title: string; description: string | undefined; annotations: { text: string; id: UUID; x: NormalizedCoordinate; y: NormalizedCoordinate; style?: AnnotationStyle; variables?: readonly string[]; }[]; ... 9 more ...; isVisible?: boolean; }' is not assignable to type 'Step' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Types of property 'description' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.
lib/variables.ts(212,7): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/variables.ts(219,7): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/variables.ts(226,7): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/variables.ts(245,5): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
lib/version-control/version-manager.ts(134,11): error TS2375: Type '{ id: string; projectId: string; sourceBranch: string; targetBranch: string; title: string; description: string | undefined; author: { name: string; email?: string; }; createdAt: number; status: "pending"; }' is not assignable to type 'MergeRequest' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'description' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/version-control/version-manager.ts(490,11): error TS2375: Type '{ id: string; name: string; projectId: string; currentCommit: string; createdAt: number; description: string | undefined; isActive: false; }' is not assignable to type 'Branch' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'description' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/version-control/version-manager.ts(577,11): error TS2375: Type '{ id: string; name: string; projectId: string; commitId: string; message: string | undefined; author: { name: string; email?: string; }; createdAt: number; type: "lightweight" | "annotated"; }' is not assignable to type 'Tag' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'message' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/version-control/version-manager.ts(656,43): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/version-control/version-manager.ts(669,9): error TS2375: Type '{ variableKey: string | undefined; }' is not assignable to type '{ stepIndex?: number; variableKey?: string; propertyPath?: string; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'variableKey' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
lib/video-processing.ts(172,7): error TS2375: Type '{ id?: string; title?: string; startTime?: number; endTime?: number; description?: string; }' is not assignable to type 'VideoChapter' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Property 'id' is optional in type '{ id?: string; title?: string; startTime?: number; endTime?: number; description?: string; }' but required in type 'VideoChapter'.
lib/voice-narration.ts(95,29): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/voice-narration.ts(115,29): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
lib/voice-narration.ts(285,5): error TS2412: Type 'undefined' is not assignable to type '() => void' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
lib/voice-narration.ts(286,5): error TS2412: Type 'undefined' is not assignable to type '(error: string) => void' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
lib/voice-narration.ts(287,5): error TS2412: Type 'undefined' is not assignable to type '(char: number, length: number) => void' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
pages/api/socket.ts(204,36): error TS2379: Argument of type '{ resourceId: any; ownerId: string; ownerName: string | undefined; acquiredAt: Date; }' is not assignable to parameter of type '{ resourceId: string; ownerId: string; ownerName?: string; acquiredAt: Date; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'ownerName' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
tailwind.config.ts(4,3): error TS2322: Type '["class"]' is not assignable to type 'DarkModeStrategy'.
  Type '["class"]' is not assignable to type '["class", string]'.
    Source has 1 element(s) but target requires 2.
tests/api/ai/optimize-route.test.ts(10,5): error TS2344: Type '(request: OptimizationRequest) => Promise<OptimizationResult>' does not satisfy the constraint 'any[]'.
tests/api/ai/optimize-route.test.ts(13,5): error TS2344: Type '(request: ContentRequest) => Promise<GeneratedContent>' does not satisfy the constraint 'any[]'.
tests/api/ai/optimize-route.test.ts(16,5): error TS2344: Type '(request: FlowAnalysisRequest) => Promise<FlowAnalysisResult>' does not satisfy the constraint 'any[]'.
tests/api/ai/optimize-route.test.ts(65,3): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
tests/api/ai/optimize-route.test.ts(69,3): error TS2322: Type 'string' is not assignable to type 'URLString'.
  Type 'string' is not assignable to type '{ readonly __brand: "URLString"; }'.
tests/api/ai/optimize-route.test.ts(104,3): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
tests/api/ai/optimize-route.test.ts(126,19): error TS2322: Type 'string' is not assignable to type 'UUID'.
  Type 'string' is not assignable to type '{ readonly __brand: "UUID"; }'.
tests/api/ai/optimize-route.test.ts(235,73): error TS2379: Argument of type 'RequestInit' is not assignable to parameter of type 'import("/Users/yamanouchiyuuta/Desktop/PLAINER/plainer/node_modules/.pnpm/next@15.5.3_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/web/spec-extension/request").RequestInit' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'signal' are incompatible.
    Type 'AbortSignal | null' is not assignable to type 'AbortSignal'.
      Type 'null' is not assignable to type 'AbortSignal'.
tests/api/ai/optimize-route.test.ts(254,73): error TS2379: Argument of type 'RequestInit' is not assignable to parameter of type 'import("/Users/yamanouchiyuuta/Desktop/PLAINER/plainer/node_modules/.pnpm/next@15.5.3_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/web/spec-extension/request").RequestInit' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'signal' are incompatible.
    Type 'AbortSignal | null' is not assignable to type 'AbortSignal'.
      Type 'null' is not assignable to type 'AbortSignal'.
tests/api/ai/optimize-route.test.ts(281,73): error TS2379: Argument of type 'RequestInit' is not assignable to parameter of type 'import("/Users/yamanouchiyuuta/Desktop/PLAINER/plainer/node_modules/.pnpm/next@15.5.3_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/web/spec-extension/request").RequestInit' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'signal' are incompatible.
    Type 'AbortSignal | null' is not assignable to type 'AbortSignal'.
      Type 'null' is not assignable to type 'AbortSignal'.
tests/api/ai/optimize-route.test.ts(311,59): error TS2379: Argument of type 'RequestInit' is not assignable to parameter of type 'import("/Users/yamanouchiyuuta/Desktop/PLAINER/plainer/node_modules/.pnpm/next@15.5.3_react-dom@19.1.1_react@19.1.1__react@19.1.1/node_modules/next/dist/server/web/spec-extension/request").RequestInit' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'signal' are incompatible.
    Type 'AbortSignal | null' is not assignable to type 'AbortSignal'.
      Type 'null' is not assignable to type 'AbortSignal'.
 ELIFECYCLE  Command failed with exit code 1.
```

