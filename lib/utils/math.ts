/**
 * 数値・数学関連のユーティリティ関数
 */

// 数値を指定した範囲に制限
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 数値を正規化（0-1の範囲に変換）
export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

// 正規化された値を元の範囲に戻す
export function denormalize(
  normalizedValue: number,
  min: number,
  max: number
): number {
  return normalizedValue * (max - min) + min;
}

// 線形補間
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// 2点間の距離を計算
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// 角度をラジアンに変換
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ラジアンを角度に変換
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

// 数値を指定した精度で丸める
export function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

// 2つの数値がほぼ等しいかチェック
export function isNearlyEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) < epsilon;
}

// 数値配列の平均値を計算
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

// 数値配列の中央値を計算
export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

// 数値配列の標準偏差を計算
export function standardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const avg = average(numbers);
  const squaredDifferences = numbers.map((num) => Math.pow(num - avg, 2));
  const avgSquaredDiff = average(squaredDifferences);
  return Math.sqrt(avgSquaredDiff);
}

// イージング関数
export const easing = {
  // 線形
  linear: (t: number): number => t,

  // イーズイン
  easeIn: (t: number): number => t * t,
  easeInCubic: (t: number): number => t * t * t,
  easeInQuart: (t: number): number => t * t * t * t,

  // イーズアウト
  easeOut: (t: number): number => 1 - Math.pow(1 - t, 2),
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t: number): number => 1 - Math.pow(1 - t, 4),

  // イーズインアウト
  easeInOut: (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  easeInOutQuart: (t: number): number => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  },

  // バウンス
  bounce: (t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};

// グリッドにスナップ
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// パーセンテージを計算
export function percentage(part: number, whole: number): number {
  if (whole === 0) return 0;
  return (part / whole) * 100;
}

// 範囲内のランダムな数値を生成
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// 整数の範囲内のランダムな数値を生成
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

// 重み付きランダム選択
export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) {
    throw new Error('Items and weights arrays must have the same length');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}
