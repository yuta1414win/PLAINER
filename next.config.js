/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  output: 'standalone', // Cloud Run使用時
  // Next.js 15: experimental.typedRoutes -> typedRoutes に移動
  typedRoutes: true,
  // モノレポ誤検出による lockfile 警告を抑制
  outputFileTracingRoot: path.join(__dirname, '..'),
  eslint: {
    dirs: ['app', 'components', 'lib'],
    // Allow production builds to succeed even with ESLint issues
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時のTypeScriptエラーを無視しない
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        // 全てのルートにセキュリティヘッダを適用
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // API ルートに追加のセキュリティヘッダ
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
