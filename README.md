PLAINER — Local Development Guide

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
