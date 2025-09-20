// ============================================================================
// パフォーマンス最適化ユーティリティ
// ============================================================================

import { useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// デバウンス・スロットル
// ============================================================================

/**
 * 指定された時間後に関数を実行するデバウンス機能
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
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback as T;
}

/**
 * 指定された間隔で関数の実行を制限するスロットル機能
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastExecutedRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecutedRef.current;

      if (timeSinceLastExecution >= delay) {
        lastExecutedRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastExecutedRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastExecution);
      }
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback as T;
}

// ============================================================================
// メモ化ヘルパー
// ============================================================================

/**
 * 深い比較でメモ化された値を返す
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

/**
 * 深い等価性チェック
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

// ============================================================================
// 仮想化・遅延読み込み
// ============================================================================

/**
 * 配列の一部のみを表示する仮想化フック
 */
export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  buffer = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const itemsPerView = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + itemsPerView + buffer * 2
    );

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, buffer, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
    visibleRange,
  };
}

// ============================================================================
// レンダリング最適化
// ============================================================================

/**
 * コンポーネントの再レンダリングを追跡するデバッグフック
 */
export function useRenderTracker(componentName: string, props?: Record<string, any>) {
  const prevProps = useRef<Record<string, any>>();
  const renderCount = useRef(0);

  renderCount.current += 1;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`);
      
      if (props && prevProps.current) {
        const changedProps = Object.keys(props).filter(
          key => props[key] !== prevProps.current![key]
        );
        
        if (changedProps.length > 0) {
          console.log(`${componentName} props changed:`, changedProps);
        }
      }
      
      prevProps.current = props;
    }
  });
}

/**
 * 条件付きでコンポーネントをメモ化するヘルパー
 */
export function conditionalMemo<P extends object>(
  Component: React.ComponentType<P>,
  condition: (prevProps: P, nextProps: P) => boolean
): React.ComponentType<P> {
  return React.memo(Component, (prevProps, nextProps) => {
    return condition(prevProps, nextProps);
  });
}

// ============================================================================
// パフォーマンス測定
// ============================================================================

/**
 * 関数の実行時間を測定する
 */
export function measurePerformance<T>(
  fn: () => T,
  label?: string
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  if (process.env.NODE_ENV === 'development' && label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * 非同期関数の実行時間を測定する
 */
export async function measureAsyncPerformance<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  if (process.env.NODE_ENV === 'development' && label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

// ============================================================================
// メモリ使用量監視
// ============================================================================

/**
 * メモリ使用量を監視する（開発環境のみ）
 */
export function useMemoryMonitor(interval = 5000) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let intervalId: NodeJS.Timeout;

    if ('memory' in performance) {
      intervalId = setInterval(() => {
        const memory = (performance as any).memory;
        console.log('Memory Usage:', {
          used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
        });
      }, interval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [interval]);
}

// ============================================================================
// バンドルサイズ最適化
// ============================================================================

/**
 * 動的インポートのヘルパー
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): React.LazyExoticComponent<T> {
  const LazyComponent = React.lazy(importFn);

  if (fallback) {
    const Wrapped = React.forwardRef<any, React.ComponentProps<T>>((props, ref) =>
      React.createElement(
        React.Suspense,
        { fallback: React.createElement(fallback) },
        React.createElement(
          LazyComponent as unknown as React.ComponentType<any>,
          { ...(props as any), ref }
        )
      )
    );
    Wrapped.displayName = 'LazyWithSuspense';
    return Wrapped as unknown as React.LazyExoticComponent<T>;
  }

  return LazyComponent;
}

// ============================================================================
// インスタンス再利用
// ============================================================================

/**
 * オブジェクトの参照安定性を保つ
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const ref = useRef<T>(callback);
  
  useEffect(() => {
    ref.current = callback;
  });

  return useCallback((...args: Parameters<T>) => {
    return ref.current(...args);
  }, []) as T;
}

/**
 * 配列の参照安定性を保つ
 */
export function useStableArray<T>(array: T[]): T[] {
  return useMemo(() => array, [array.length, ...array]);
}

/**
 * オブジェクトの参照安定性を保つ
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  const keys = Object.keys(obj).sort();
  const values = keys.map(key => obj[key]);
  
  return useMemo(() => obj, [keys.join(','), ...values]);
}
