import type { HexColor } from '@/lib/types';

export interface ContrastResult {
  ratio: number; // e.g., 4.5
  level: 'fail' | 'AA-large' | 'AA' | 'AAA';
}

export function hexToRgb(hex: HexColor): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

export function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function contrastRatio(fg: HexColor, bg: HexColor): ContrastResult {
  const frgb = hexToRgb(fg);
  const brgb = hexToRgb(bg);
  const L1 = luminance(frgb.r, frgb.g, frgb.b);
  const L2 = luminance(brgb.r, brgb.g, brgb.b);
  const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  let level: ContrastResult['level'] = 'fail';
  if (ratio >= 7) level = 'AAA';
  else if (ratio >= 4.5) level = 'AA';
  else if (ratio >= 3) level = 'AA-large';
  return { ratio: Math.round(ratio * 100) / 100, level };
}

export interface SizeCheckResult {
  ok: boolean;
  minTarget: number; // px
  width: number; // px
  height: number; // px
}

export function checkTouchTargetSize(
  widthPx: number,
  heightPx: number,
  minTargetPx = 44
): SizeCheckResult {
  return {
    ok: widthPx >= minTargetPx && heightPx >= minTargetPx,
    minTarget: minTargetPx,
    width: Math.round(widthPx),
    height: Math.round(heightPx),
  };
}

export interface AccessibilityIssue {
  type: 'contrast' | 'size';
  message: string;
  data?: any;
}

export function evaluateHotspotAccessibility(params: {
  hotspotColor?: HexColor; // default overlay color
  backgroundColor?: HexColor; // fallback background
  hotspotWidthPx: number;
  hotspotHeightPx: number;
}): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const fg = params.hotspotColor ?? ('#ef4444' as HexColor);
  const bg = params.backgroundColor ?? ('#ffffff' as HexColor);
  const contrast = contrastRatio(fg, bg);
  if (contrast.level === 'fail') {
    issues.push({
      type: 'contrast',
      message: `コントラスト比 ${contrast.ratio}:1 (推奨 3:1 以上)。色の組み合わせを見直してください。`,
      data: contrast,
    });
  }
  const size = checkTouchTargetSize(params.hotspotWidthPx, params.hotspotHeightPx);
  if (!size.ok) {
    issues.push({
      type: 'size',
      message: `タッチターゲットが小さすぎます (${size.width}x${size.height}px)。最低 ${size.minTarget}px を推奨。`,
      data: size,
    });
  }
  return issues;
}

