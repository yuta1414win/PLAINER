import { Metadata } from 'next';
import { Project } from '@/lib/types';

interface SEOMetadataProps {
  project?: Project;
  isSharedView?: boolean;
  isEmbedView?: boolean;
}

export function generateMetadata({
  project,
  isSharedView = false,
  isEmbedView = false,
}: SEOMetadataProps): Metadata {
  const baseTitle = 'PLAINER - Screenshot to Interactive Guide';
  const baseDescription =
    'Transform screenshots into interactive step-by-step guides with AI assistance';

  if (!project) {
    return {
      title: baseTitle,
      description: baseDescription,
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  // プロジェクト固有のメタデータを生成
  const title =
    isSharedView || isEmbedView ? `${project.name} - PLAINER Guide` : baseTitle;

  const description = project.description
    ? `${project.description} - ${project.steps.length} step interactive guide created with PLAINER`
    : `${project.name} - ${project.steps.length} step interactive guide created with PLAINER`;

  // 非公開プロジェクトのSEO設定
  const robots = {
    index: project.isPublic,
    follow: project.isPublic,
    noarchive: !project.isPublic,
    nosnippet: !project.isPublic,
  };

  // 埋め込みビューの場合は完全にインデックスを無効化
  if (isEmbedView) {
    robots.index = false;
    robots.follow = false;
  }

  const metadata: Metadata = {
    title,
    description,
    robots,
    // Open Graph / Social Media
    openGraph: project.isPublic
      ? {
          title,
          description,
          type: 'website',
          locale: project.language === 'ja' ? 'ja_JP' : 'en_US',
          siteName: 'PLAINER',
        }
      : undefined,
    // Twitter Cards
    twitter: project.isPublic
      ? {
          card: 'summary_large_image',
          title,
          description,
        }
      : undefined,
    // その他のメタデータ
    keywords: project.isPublic
      ? [
          'interactive guide',
          'tutorial',
          'step-by-step',
          'PLAINER',
          project.name.toLowerCase(),
        ]
      : undefined,
  };

  // 非公開プロジェクトには追加の制限を設定
  if (!project.isPublic) {
    metadata.other = {
      referrer: 'no-referrer',
    };
  }

  return metadata;
}

// プロジェクトの公開/非公開状態を動的に切り替えるためのヘルパー
export function getPrivacyHeaders(
  isPublic: boolean,
  isEmbedView: boolean = false
) {
  const headers: Record<string, string> = {};

  if (!isPublic || isEmbedView) {
    headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive, nosnippet';
    headers['Cache-Control'] = 'private, no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  }

  return headers;
}

// 構造化データ（JSON-LD）の生成
export function generateStructuredData(project: Project): object | null {
  if (!project.isPublic) {
    return null; // 非公開プロジェクトには構造化データを提供しない
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: project.name,
    description:
      project.description || `${project.steps.length} step interactive guide`,
    totalTime: `PT${project.steps.length * 2}M`, // 推定時間（ステップ数 × 2分）
    step: project.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description || step.title,
      ...(step.image && {
        image: {
          '@type': 'ImageObject',
          url: step.image,
        },
      }),
    })),
    tool: [
      {
        '@type': 'SoftwareApplication',
        name: 'PLAINER',
        url: 'https://plainer.app', // 実際のドメインに置き換え
      },
    ],
  };
}
