import { useCallback, useRef } from "react";

/**
 * Trailing-edge throttle. The callback will be invoked at most once per `delay` ms.
 * If called multiple times within the delay, only the last call fires after the delay expires.
 */
export function useThrottledCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay = 100,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const throttled = useCallback((...args: Parameters<T>) => {
    lastArgsRef.current = args;
    if (timerRef.current === null) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (lastArgsRef.current) {
          callbackRef.current(...lastArgsRef.current);
          lastArgsRef.current = null;
        }
      }, delay);
    }
  }, [delay]) as T;

  return throttled;
}
