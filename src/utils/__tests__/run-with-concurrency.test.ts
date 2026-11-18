import { describe, expect, it, vi } from 'vitest';

import { isAbortError, rejectOnAbort } from '@/utils/run-with-concurrency';

// yieldToUi may read AppState; React Native itself can't load under Vitest.
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
}));

/** A promise that never settles, like a native task that drops its cancel. */
function neverSettles<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

describe('rejectOnAbort', () => {
  it('resolves with the value of the promise', async () => {
    const controller = new AbortController();

    await expect(rejectOnAbort(Promise.resolve('done'), controller.signal)).resolves.toBe('done');
  });

  it('passes the promise through when there is no signal', async () => {
    await expect(rejectOnAbort(Promise.resolve('done'))).resolves.toBe('done');
  });

  it('rejects with the error of the promise', async () => {
    const controller = new AbortController();
    const error = new Error('HTTP 404');

    await expect(rejectOnAbort(Promise.reject(error), controller.signal)).rejects.toBe(error);
  });

  it('rejects with an abort error when aborted, even if the promise never settles', async () => {
    const controller = new AbortController();
    const result = rejectOnAbort(neverSettles<string>(), controller.signal);

    controller.abort();

    await expect(result).rejects.toSatisfy(isAbortError);
  });

  it('rejects straight away when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(rejectOnAbort(neverSettles<string>(), controller.signal)).rejects.toSatisfy(
      isAbortError,
    );
  });

  it('stops listening to the signal once the promise settles', async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener');

    await rejectOnAbort(Promise.resolve('done'), controller.signal);
    await Promise.resolve();

    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
