/**
 * パフォーマンス最適化関連のカスタムHooks
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// ============================================================================
// デバウンス・スロットリング
// ============================================================================

/**
 * デバウンス処理を行うHook
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * スロットリング処理を行うHook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;

  return throttledCallback;
}

// ============================================================================
// メモ化関連
// ============================================================================

/**
 * 深い比較でメモ化を行うHook
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const dependenciesRef = useRef<React.DependencyList>();
  const resultRef = useRef<T>();

  const hasChanged = useMemo(() => {
    const prevDeps = dependenciesRef.current;
    if (!prevDeps || prevDeps.length !== deps.length) {
      return true;
    }

    return deps.some((dep, index) => {
      return !Object.is(dep, prevDeps[index]);
    });
  }, deps);

  if (hasChanged || !resultRef.current) {
    resultRef.current = factory();
    dependenciesRef.current = deps;
  }

  return resultRef.current;
}

/**
 * 配列の浅い比較でメモ化を行うHook
 */
export function useShallowMemo<T extends any[]>(array: T): T {
  const memoizedArray = useMemo(() => array, [array.length, ...array]);

  return memoizedArray;
}

// ============================================================================
// 仮想化・遅延読み込み
// ============================================================================

/**
 * 画像の遅延読み込み用Hook
 */
export function useLazyImage(src: string): {
  imageSrc: string | null;
  isLoaded: boolean;
  isError: boolean;
} {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setIsError(false);
    };
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(false);
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { imageSrc, isLoaded, isError };
}

/**
 * Intersection Observer を使った可視領域検知Hook
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): {
  ref: (node: Element | null) => void;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
} {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node) {
        observerRef.current = new IntersectionObserver(([entry]) => {
          setIsIntersecting(entry.isIntersecting);
          setEntry(entry);
        }, options);
        observerRef.current.observe(node);
      }
    },
    [options.rootMargin, options.threshold]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { ref, isIntersecting, entry };
}

// ============================================================================
// リソース管理
// ============================================================================

/**
 * リソースのプリロード用Hook
 */
export function usePreloadImages(urls: string[]): {
  preloadedCount: number;
  isAllPreloaded: boolean;
  failedUrls: string[];
} {
  const [preloadedCount, setPreloadedCount] = useState(0);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  useEffect(() => {
    let loadedCount = 0;
    const failed: string[] = [];

    const loadPromises = urls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          setPreloadedCount(loadedCount);
          resolve();
        };
        img.onerror = () => {
          failed.push(url);
          setFailedUrls([...failed]);
          resolve();
        };
        img.src = url;
      });
    });

    Promise.all(loadPromises).then(() => {
      setPreloadedCount(loadedCount);
    });
  }, [urls]);

  return {
    preloadedCount,
    isAllPreloaded: preloadedCount === urls.length,
    failedUrls,
  };
}

// ============================================================================
// レンダリング最適化
// ============================================================================

/**
 * 重い計算を行う際のレンダリング最適化Hook
 */
export function useAsyncMemo<T>(
  factory: () => Promise<T>,
  deps: React.DependencyList,
  initialValue: T
): {
  value: T;
  isLoading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<{
    value: T;
    isLoading: boolean;
    error: Error | null;
  }>({
    value: initialValue,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    factory()
      .then((result) => {
        if (!cancelled) {
          setState({
            value: result,
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}

/**
 * フレーム単位での重い処理の分割実行Hook
 */
export function useChunkedProcessing<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 100
): {
  results: R[];
  isProcessing: boolean;
  progress: number;
} {
  const [results, setResults] = useState<R[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      setResults([]);
      setProgress(0);
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setProgress(0);

    const processChunk = (startIndex: number) => {
      const endIndex = Math.min(startIndex + chunkSize, items.length);
      const chunk = items.slice(startIndex, endIndex);

      const chunkResults = chunk.map(processor);

      setResults((prev) => [...prev, ...chunkResults]);
      setProgress(endIndex / items.length);

      if (endIndex < items.length) {
        // 次のフレームで続行
        requestAnimationFrame(() => processChunk(endIndex));
      } else {
        setIsProcessing(false);
      }
    };

    // 処理開始
    requestAnimationFrame(() => processChunk(0));
  }, [items, processor, chunkSize]);

  return { results, isProcessing, progress };
}

// ============================================================================
// メモリ管理
// ============================================================================

/**
 * WeakMapを使ったキャッシュHook
 */
export function useWeakMapCache<K extends object, V>(): {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  has: (key: K) => boolean;
  delete: (key: K) => boolean;
} {
  const cacheRef = useRef(new WeakMap<K, V>());

  const get = useCallback((key: K) => {
    return cacheRef.current.get(key);
  }, []);

  const set = useCallback((key: K, value: V) => {
    cacheRef.current.set(key, value);
  }, []);

  const has = useCallback((key: K) => {
    return cacheRef.current.has(key);
  }, []);

  const deleteKey = useCallback((key: K) => {
    return cacheRef.current.delete(key);
  }, []);

  return { get, set, has, delete: deleteKey };
}

/**
 * サイズ制限付きLRUキャッシュHook
 */
export function useLRUCache<K, V>(
  maxSize: number = 100
): {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  has: (key: K) => boolean;
  clear: () => void;
  size: number;
} {
  const cacheRef = useRef(new Map<K, V>());

  const get = useCallback((key: K) => {
    const cache = cacheRef.current;
    if (cache.has(key)) {
      // LRU: アクセスされたアイテムを最後に移動
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    return undefined;
  }, []);

  const set = useCallback(
    (key: K, value: V) => {
      const cache = cacheRef.current;

      if (cache.has(key)) {
        // 既存のキーの場合は削除してから追加（順序を最後に）
        cache.delete(key);
      } else if (cache.size >= maxSize) {
        // サイズ制限に達した場合は最古のアイテムを削除
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      cache.set(key, value);
    },
    [maxSize]
  );

  const has = useCallback((key: K) => {
    return cacheRef.current.has(key);
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const size = cacheRef.current.size;

  return { get, set, has, clear, size };
}
