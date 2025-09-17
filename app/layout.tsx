import type { Metadata, Viewport } from 'next';
import { ErrorBoundary } from '@/components/error-boundary';
import { ConsentBanner } from '@/components/privacy/consent-banner';
import './globals.css';
import { SiteHeader } from '@/components/site-header';


export const metadata: Metadata = {
  title: 'PLAINER - Screenshot to Interactive Guide',
  description:
    'Transform screenshots into interactive step-by-step guides with AI assistance',
  keywords: ['screenshot', 'guide', 'tutorial', 'ai', 'interactive'],
  authors: [{ name: 'PLAINER Team' }],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <div className="min-h-screen bg-background font-sans antialiased">
            <SiteHeader />
            {children}
            {/* GDPR/CCPA Consent Banner */}
            <ConsentBanner />
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
