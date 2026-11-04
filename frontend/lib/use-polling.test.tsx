import { act, renderHook } from '@testing-library/react';
import { PollingRequestError, usePolling } from './use-polling';

function setVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: visible ? 'visible' : 'hidden'
  });
}

describe('usePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setVisible(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    setVisible(true);
  });

  it('starts immediately and schedules the next run only after completion', async () => {
    let resolveRequest: (() => void) | undefined;
    const fn = jest.fn(() => new Promise<void>((resolve) => { resolveRequest = resolve; }));
    renderHook(() => usePolling({ fn, intervalMs: 1000, enabled: true, identityKey: 'user:tenant' }));

    expect(fn).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => { resolveRequest?.(); });
    act(() => { jest.advanceTimersByTime(999); });
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403])('uses exponential backoff and stops after HTTP %s', async (status) => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('network')).mockRejectedValueOnce(new PollingRequestError(status));
    const onAuthError = jest.fn();
    renderHook(() => usePolling({
      fn,
      intervalMs: 1000,
      enabled: true,
      identityKey: 'user:tenant',
      backoff: { multiplier: 2, capMs: 8000 },
      onAuthError
    }));

    await act(async () => { await Promise.resolve(); });
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(999); });
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(1); });
    await act(async () => { await Promise.resolve(); });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onAuthError).toHaveBeenCalledWith(status);

    act(() => { jest.advanceTimersByTime(10_000); });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('aborts pending work when the page becomes hidden and refreshes on resume', async () => {
    let requestSignal: AbortSignal | undefined;
    const fn = jest.fn((signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise<void>(() => undefined);
    });
    renderHook(() => usePolling({ fn, intervalMs: 1000, enabled: true, identityKey: 'user:tenant' }));

    expect(fn).toHaveBeenCalledTimes(1);
    act(() => {
      setVisible(false);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(requestSignal?.aborted).toBe(true);

    act(() => {
      setVisible(true);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
