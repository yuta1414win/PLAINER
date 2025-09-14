export interface DetectedElement {
  x: number; // px in source image
  y: number; // px in source image
  width: number; // px
  height: number; // px
  label: string;
  score: number; // 0..1
}

/**
 * Lightweight, dependency-free heuristic detector for common UI elements.
 * It downsamples the image, computes edge magnitude, extracts rectangular
 * regions, and filters by aspect ratio and area to suggest button/input-like boxes.
 */
export async function detectUIElementsFromImage(
  image: HTMLImageElement,
  options: { maxDimension?: number } = {}
): Promise<DetectedElement[]> {
  const maxDim = options.maxDimension ?? 256;

  // Prepare offscreen canvas at downscaled size
  const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0, w, h);
  const src = ctx.getImageData(0, 0, w, h);

  // Convert to grayscale
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < src.data.length; i += 4, j++) {
    const r = src.data[i];
    const g = src.data[i + 1];
    const b = src.data[i + 2];
    // perceived luminance
    gray[j] = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
  }

  // Sobel edge magnitude
  const mag = new Float32Array(w * h);
  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const at = (x: number, y: number) => gray[y * w + x] || 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0,
        gy = 0,
        k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const v = at(x + kx, y + ky);
          gx += v * gxK[k];
          gy += v * gyK[k];
          k++;
        }
      }
      mag[y * w + x] = Math.hypot(gx, gy);
    }
  }

  // Threshold edges (Otsu-like quick heuristic)
  let sum = 0;
  for (let i = 0; i < mag.length; i++) sum += mag[i];
  const mean = sum / mag.length;
  const threshold = mean * 1.5; // a bit above mean edge magnitude
  const bin = new Uint8Array(w * h);
  for (let i = 0; i < mag.length; i++) bin[i] = mag[i] > threshold ? 1 : 0;

  // Connected components (union-find by BFS) on edge map to get boxes
  const visited = new Uint8Array(w * h);
  const rects: { x0: number; y0: number; x1: number; y1: number; count: number }[] = [];
  const qx = new Int16Array(w * h);
  const qy = new Int16Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (bin[idx] === 0 || visited[idx]) continue;
      // BFS
      let head = 0,
        tail = 0;
      qx[tail] = x;
      qy[tail] = y;
      tail++;
      visited[idx] = 1;
      let x0 = x,
        y0 = y,
        x1 = x,
        y1 = y,
        count = 0;
      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head];
        head++;
        count++;
        if (cx < x0) x0 = cx;
        if (cy < y0) y0 = cy;
        if (cx > x1) x1 = cx;
        if (cy > y1) y1 = cy;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx,
              ny = cy + dy;
            if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) continue;
            const nidx = ny * w + nx;
            if (bin[nidx] && !visited[nidx]) {
              visited[nidx] = 1;
              qx[tail] = nx;
              qy[tail] = ny;
              tail++;
            }
          }
        }
      }
      // Filter very small blobs
      const bw = x1 - x0 + 1;
      const bh = y1 - y0 + 1;
      const area = bw * bh;
      if (area < 80) continue;
      rects.push({ x0, y0, x1, y1, count });
    }
  }

  // Merge overlapping/nearby rectangles
  rects.sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);
  const merged: typeof rects = [];
  const overlap = (a: typeof rects[number], b: typeof rects[number]) => {
    const xOverlap = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
    const yOverlap = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const areaA = (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1);
    return (xOverlap * yOverlap) / areaA > 0.3;
  };
  for (const r of rects) {
    let mergedInto = false;
    for (const m of merged) {
      if (overlap(m, r)) {
        m.x0 = Math.min(m.x0, r.x0);
        m.y0 = Math.min(m.y0, r.y0);
        m.x1 = Math.max(m.x1, r.x1);
        m.y1 = Math.max(m.y1, r.y1);
        m.count += r.count;
        mergedInto = true;
        break;
      }
    }
    if (!mergedInto) merged.push({ ...r });
  }

  // Score candidates and map to source image coordinates
  const candidates: DetectedElement[] = [];
  for (const m of merged) {
    const bw = m.x1 - m.x0 + 1;
    const bh = m.y1 - m.y0 + 1;
    const aspect = bw / bh;
    const area = bw * bh;
    const relArea = area / (w * h);
    // Accept button-like and input-like boxes
    const looksLikeButton = aspect >= 1.6 && aspect <= 6 && relArea >= 0.001 && relArea <= 0.15;
    const looksLikeInput = aspect >= 2.5 && aspect <= 12 && bh >= 10;
    if (!looksLikeButton && !looksLikeInput) continue;

    // Score prefers mid-size, centered-ish elements
    const cx = (m.x0 + m.x1) / 2 / w;
    const cy = (m.y0 + m.y1) / 2 / h;
    const centerBias = 1 - Math.hypot(cx - 0.5, cy - 0.5);
    const sizeBias = 1 - Math.abs(relArea - 0.02) / 0.02;
    const score = Math.max(0, Math.min(1, 0.5 * centerBias + 0.5 * sizeBias));

    candidates.push({
      x: Math.round(m.x0 / scale),
      y: Math.round(m.y0 / scale),
      width: Math.round(bw / scale),
      height: Math.round(bh / scale),
      label: looksLikeButton ? 'Button' : 'Input',
      score,
    });
  }

  // Remove near-duplicates on full-res coordinates
  const dedup: DetectedElement[] = [];
  const iou = (a: DetectedElement, b: DetectedElement) => {
    const ax1 = a.x + a.width,
      ay1 = a.y + a.height,
      bx1 = b.x + b.width,
      by1 = b.y + b.height;
    const xi = Math.max(0, Math.min(ax1, bx1) - Math.max(a.x, b.x));
    const yi = Math.max(0, Math.min(ay1, by1) - Math.max(a.y, b.y));
    const inter = xi * yi;
    const ua = a.width * a.height + b.width * b.height - inter;
    return ua > 0 ? inter / ua : 0;
  };
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    if (dedup.every((d) => iou(c, d) < 0.5)) dedup.push(c);
  }

  return dedup.slice(0, 10);
}

