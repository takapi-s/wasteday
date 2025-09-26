import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { QueryOptions } from '../../types/dashboard';

/**
 * パフォーマンス最適化のためのカスタムフック
 */
export const usePerformanceOptimization = () => {
  // デバウンス用のタイマー
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // メモ化されたコールバック
  const createMemoizedCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
  ): T => {
    return useCallback(callback, deps) as T;
  }, []);

  // デバウンス関数
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    return ((...args: Parameters<T>) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        func(...args);
      }, delay);
    }) as T;
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    createMemoizedCallback,
    debounce,
  };
};

/**
 * データ取得の最適化フック
 */
export const useOptimizedDataFetching = (options: QueryOptions) => {
  const { debounce } = usePerformanceOptimization();
  
  // メモ化されたオプション
  const memoizedOptions = useMemo(() => ({
    rangeHours: Math.min(24, Math.max(1, Math.floor(options.rangeHours ?? 24))),
    binMinutes: Math.min(120, Math.max(10, Math.floor(options.binMinutes ?? 60))),
  }), [options.rangeHours, options.binMinutes]);

  // デバウンスされたデータ取得
  const debouncedFetch = useMemo(() => 
    debounce(async (fetchFn: () => Promise<void>) => {
      await fetchFn();
    }, 300),
    [debounce]
  );

  return {
    memoizedOptions,
    debouncedFetch,
  };
};

/**
 * コンポーネントのメモ化フック
 */
export const useComponentMemoization = <T extends Record<string, any>>(
  props: T,
  customCompare?: (prev: T, next: T) => boolean
) => {
  const prevProps = useRef<T>();
  
  return useMemo(() => {
    if (!prevProps.current) {
      prevProps.current = props;
      return props;
    }
    
    if (customCompare) {
      if (customCompare(prevProps.current, props)) {
        return prevProps.current;
      }
    } else {
      // デフォルトの浅い比較
      const keys = Object.keys(props);
      const hasChanged = keys.some(key => 
        prevProps.current![key] !== props[key]
      );
      
      if (!hasChanged) {
        return prevProps.current;
      }
    }
    
    prevProps.current = props;
    return props;
  }, [props, customCompare]);
};

/**
 * 仮想化用のフック
 */
export const useVirtualization = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      itemCount
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, itemCount]);
  
  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;
  
  return {
    visibleRange,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

/**
 * リサイズオブザーバーのフック
 */
export const useResizeObserver = (
  callback: (entries: ResizeObserverEntry[]) => void,
  targetRef: React.RefObject<HTMLElement>
) => {
  const observer = useRef<ResizeObserver | null>(null);
  
  useEffect(() => {
    if (!targetRef.current) return;
    
    observer.current = new ResizeObserver(callback);
    observer.current.observe(targetRef.current);
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [callback, targetRef]);
};

/**
 * インタセクションオブザーバーのフック
 */
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  targetRef: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) => {
  const observer = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (!targetRef.current) return;
    
    observer.current = new IntersectionObserver(callback, options);
    observer.current.observe(targetRef.current);
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [callback, targetRef, options]);
};
