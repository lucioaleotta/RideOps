'use client';

import { useCallback, useEffect, useRef } from 'react';

export class PollingRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Polling request failed with status ${status}`);
    this.name = 'PollingRequestError';
  }
}

export async function fetchPollingJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) {
    throw new PollingRequestError(response.status);
  }
  return response.json() as Promise<T>;
}

type PollingOptions = {
  fn: (signal: AbortSignal) => Promise<unknown>;
  intervalMs: number;
  enabled: boolean;
  identityKey: string;
  resumeThresholdMs?: number;
  timeoutMs?: number;
  backoff?: { multiplier?: number; capMs?: number };
  onAuthError?: (status: 401 | 403) => void;
};

const DEFAULT_BACKOFF_CAP_MS = 2 * 60 * 60 * 1000;

export function usePolling({
  fn,
  intervalMs,
  enabled,
  identityKey,
  resumeThresholdMs = intervalMs,
  timeoutMs = 30_000,
  backoff,
  onAuthError
}: PollingOptions) {
  const fnRef = useRef(fn);
  const onAuthErrorRef = useRef(onAuthError);
  const runRef = useRef<((force?: boolean, queueIfBusy?: boolean) => void) | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fnRef.current = fn;
    onAuthErrorRef.current = onAuthError;
  }, [fn, onAuthError]);

  const abort = useCallback(() => {
    abortRef.current?.();
  }, []);

  const refresh = useCallback(() => {
    runRef.current?.(true, true);
  }, []);

  const refreshIfIdle = useCallback(() => {
    runRef.current?.(true, false);
  }, []);

  const cancelCurrent = useCallback(() => {
    activeControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    let hasStarted = false;
    let stoppedForAuth = false;
    let failures = 0;
    let lastSuccessAt: number | null = null;
    let timer: number | null = null;
    let controller: AbortController | null = null;
    let refreshPending = false;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = (delayMs: number) => {
      clearTimer();
      if (!active || stoppedForAuth || (document.visibilityState !== 'visible')) {
        return;
      }
      timer = window.setTimeout(() => {
        timer = null;
        void run();
      }, delayMs);
    };

    const run = async () => {
      if (!active || stoppedForAuth || document.visibilityState !== 'visible') {
        return;
      }
      if (controller && !controller.signal.aborted) {
        return;
      }

      const requestController = new AbortController();
      controller = requestController;
      activeControllerRef.current = requestController;
      refreshPending = false;
      hasStarted = true;
      let timedOut = false;
      const requestTimeout = window.setTimeout(() => {
        timedOut = true;
        requestController.abort();
      }, timeoutMs);
      requestController.signal.addEventListener('abort', () => window.clearTimeout(requestTimeout), { once: true });

      let succeeded = false;
      try {
        await fnRef.current(requestController.signal);
        if (active && !requestController.signal.aborted) {
          lastSuccessAt = Date.now();
          failures = 0;
          succeeded = true;
        } else if (active && timedOut) {
          failures += 1;
        }
      } catch (error) {
        if (!active || (requestController.signal.aborted && !timedOut)) {
          return;
        }

        if (timedOut) {
          failures += 1;
        } else {
          const status = error instanceof PollingRequestError ? error.status :
            typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
              ? error.status
              : null;

          if (status === 401 || status === 403) {
            stoppedForAuth = true;
            onAuthErrorRef.current?.(status);
            if (!onAuthErrorRef.current) {
              console.warn(`Polling stopped after HTTP ${status}.`);
            }
          } else {
            failures += 1;
          }
        }
      } finally {
        window.clearTimeout(requestTimeout);
        if (controller === requestController) {
          controller = null;
        }
        if (activeControllerRef.current === requestController) {
          activeControllerRef.current = null;
        }
        if (!active || stoppedForAuth || (requestController.signal.aborted && !timedOut)) {
          return;
        }

        if (refreshPending) {
          schedule(0);
          return;
        }

        if (succeeded) {
          schedule(intervalMs);
          return;
        }

        const multiplier = Math.max(1, backoff?.multiplier ?? 2);
        const capMs = Math.max(intervalMs, backoff?.capMs ?? Math.max(8 * intervalMs, DEFAULT_BACKOFF_CAP_MS));
        const retryDelay = Math.min(intervalMs * multiplier ** Math.max(0, failures - 1), capMs);
        schedule(retryDelay);
      }
    };

    const request = (force = false, queueIfBusy = false) => {
      if (!active || stoppedForAuth) {
        return;
      }
      clearTimer();
      if (controller && !controller.signal.aborted) {
        if (force && queueIfBusy) refreshPending = true;
        return;
      }
      if (!force && hasStarted && lastSuccessAt !== null && Date.now() - lastSuccessAt < resumeThresholdMs) {
        schedule(intervalMs);
        return;
      }
      void run();
    };

    runRef.current = request;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        clearTimer();
        controller?.abort();
        controller = null;
        return;
      }

      if (!hasStarted) {
        request(true);
      } else {
        request(false);
      }
    };

    abortRef.current = () => {
      active = false;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      controller?.abort();
      controller = null;
      activeControllerRef.current = null;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (document.visibilityState === 'visible') {
      request(true);
    }

    return () => {
      active = false;
      stoppedForAuth = false;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      controller?.abort();
      controller = null;
      activeControllerRef.current = null;
      if (runRef.current === request) {
        runRef.current = null;
      }
      abortRef.current = null;
    };
  }, [enabled, identityKey, intervalMs, resumeThresholdMs, timeoutMs, backoff?.multiplier, backoff?.capMs]);

  return { abort, cancelCurrent, refresh, refreshIfIdle };
}
