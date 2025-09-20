/**
 * URL長制約対策用の状態圧縮ライブラリ
 * LZ系圧縮とBase64エンコーディングを使用してURLクエリパラメータを短縮
 */

import { Project } from '@/lib/types';

// 簡易的なLZ77圧縮の実装
function lz77Compress(input: string): string {
  const result: string[] = [];
  const windowSize = 4096;
  const lookaheadSize = 18;

  let i = 0;
  while (i < input.length) {
    let match = { length: 0, distance: 0 };

    // 検索窓内で最長一致を探す
    const searchStart = Math.max(0, i - windowSize);
    for (let j = searchStart; j < i; j++) {
      let length = 0;
      while (
        length < lookaheadSize &&
        i + length < input.length &&
        input[j + length] === input[i + length]
      ) {
        length++;
      }

      if (length > match.length) {
        match = { length, distance: i - j };
      }
    }

    if (match.length > 2) {
      // マッチが見つかった場合
      result.push(`<${match.distance},${match.length}>`);
      i += match.length;
    } else {
      // マッチが見つからない場合は文字をそのまま追加
      result.push(input[i]);
      i++;
    }
  }

  return result.join('');
}

function lz77Decompress(compressed: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < compressed.length) {
    if (compressed[i] === '<') {
      // 圧縮されたマッチを処理
      const endIndex = compressed.indexOf('>', i);
      const match = compressed.slice(i + 1, endIndex);
      const [distance, length] = match.split(',').map(Number);

      // マッチした文字列を復元
      const startPos = result.length - distance;
      for (let j = 0; j < length; j++) {
        result.push(result[startPos + j]);
      }

      i = endIndex + 1;
    } else {
      // 通常の文字
      result.push(compressed[i]);
      i++;
    }
  }

  return result.join('');
}

// Base64URL安全なエンコーディング（URLで使用可能）
function base64UrlEncode(str: string): string {
  try {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Base64 encoding failed:', error);
    return '';
  }
}

function base64UrlDecode(str: string): string {
  try {
    // パディングを復元
    const padding = '='.repeat((4 - (str.length % 4)) % 4);
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return atob(base64);
  } catch (error) {
    console.error('Base64 decoding failed:', error);
    return '';
  }
}

// プロジェクトデータを圧縮してURLパラメータ用文字列に変換
export function compressProjectForUrl(project: Project): string {
  try {
    // 不要なデータを除去して軽量化
    const lightProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      steps: project.steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        image: step.image,
        thumbnail: step.thumbnail,
        hotspots: step.hotspots,
        annotations: step.annotations,
        cta: step.cta,
        masks: step.masks,
        order: step.order,
      })),
      chapters: project.chapters,
      theme: project.theme,
      language: project.language,
      isPublic: project.isPublic,
    };

    const jsonString = JSON.stringify(lightProject);
    const compressed = lz77Compress(jsonString);
    const encoded = base64UrlEncode(compressed);

    return encoded;
  } catch (error) {
    console.error('Project compression failed:', error);
    throw new Error('プロジェクトの圧縮に失敗しました');
  }
}

// URLパラメータから圧縮されたプロジェクトデータを復元
export function decompressProjectFromUrl(
  compressedData: string
): Partial<Project> {
  try {
    const decoded = base64UrlDecode(compressedData);
    const decompressed = lz77Decompress(decoded);
    const project = JSON.parse(decompressed);

    // 復元時に必要なフィールドを補完
    return {
      ...project,
      createdAt: new Date(),
      updatedAt: new Date(),
      variables: project.variables || [],
      variableInstances: project.variableInstances || {},
      conditionalSteps: project.conditionalSteps || [],
    };
  } catch (error) {
    console.error('Project decompression failed:', error);
    throw new Error('プロジェクトデータの復元に失敗しました');
  }
}

// URL長をチェックして圧縮が必要かどうかを判定
export function shouldCompressUrl(url: string): boolean {
  const maxUrlLength = 2048; // 一般的なURL長制限
  return url.length > maxUrlLength;
}

// 圧縮率を計算
export function calculateCompressionRatio(
  original: string,
  compressed: string
): number {
  return (1 - compressed.length / original.length) * 100;
}

// 段階的圧縮 - より積極的にデータを削減
export function aggressiveCompressProject(project: Project): string {
  try {
    // さらに軽量化 - 必要最小限のデータのみ
    const minimalProject = {
      i: project.id,
      n: project.name,
      s: project.steps.map((step) => ({
        i: step.id,
        t: step.title,
        img: step.image,
        h: step.hotspots.map((h) => ({
          i: h.id,
          s: h.shape,
          x: h.x,
          y: h.y,
          w: h.w,
          h: h.h,
          r: h.r,
          l: h.label,
        })),
        a: step.annotations.map((a) => ({
          i: a.id,
          t: a.text,
          x: a.x,
          y: a.y,
        })),
      })),
      t: {
        p: project.theme.primaryColor,
        s: project.theme.secondaryColor,
        f: project.theme.fontFamily,
      },
      l: project.language,
      pub: project.isPublic,
    };

    const jsonString = JSON.stringify(minimalProject);
    const compressed = lz77Compress(jsonString);
    const encoded = base64UrlEncode(compressed);

    return encoded;
  } catch (error) {
    console.error('Aggressive compression failed:', error);
    throw new Error('積極的圧縮に失敗しました');
  }
}

// URLの長さをバイト単位で計算
export function calculateUrlLength(
  baseUrl: string,
  queryParams: Record<string, string>
): number {
  const searchParams = new URLSearchParams(queryParams);
  const fullUrl = `${baseUrl}?${searchParams.toString()}`;
  return new Blob([fullUrl]).size;
}

// 圧縮統計情報
export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isSafeForUrl: boolean;
  recommendedAction: 'none' | 'standard' | 'aggressive' | 'export_file';
}

export function analyzeCompressionNeeds(project: Project): CompressionStats {
  const originalJson = JSON.stringify(project);
  const originalSize = new Blob([originalJson]).size;

  const standardCompressed = compressProjectForUrl(project);
  const standardSize = new Blob([standardCompressed]).size;

  const aggressiveCompressed = aggressiveCompressProject(project);
  const aggressiveSize = new Blob([aggressiveCompressed]).size;

  let recommendedAction: CompressionStats['recommendedAction'] = 'none';
  let finalSize = originalSize;

  if (standardSize > 1500) {
    if (aggressiveSize > 1500) {
      recommendedAction = 'export_file';
      finalSize = aggressiveSize;
    } else {
      recommendedAction = 'aggressive';
      finalSize = aggressiveSize;
    }
  } else if (standardSize > 800) {
    recommendedAction = 'standard';
    finalSize = standardSize;
  }

  return {
    originalSize,
    compressedSize: finalSize,
    compressionRatio: calculateCompressionRatio(
      originalJson,
      recommendedAction === 'aggressive'
        ? aggressiveCompressed
        : standardCompressed
    ),
    isSafeForUrl: finalSize <= 1500,
    recommendedAction,
  };
}
