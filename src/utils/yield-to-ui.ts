import { AppState } from 'react-native';

/**
 * Lets the RN bridge process frames before the next stretch of JS work.
 *
 * Only waits while the app is on screen. React Native pauses JS timers when the app is in the
 * background (Android `JavaTimerManager.onHostPause`), so a `setTimeout` there would not fire
 * until the user returns, stalling background work such as downloads. With no screen to keep
 * responsive, there is nothing to yield to.
 */
export function yieldToUi(): Promise<void> {
  if (AppState.currentState !== 'active') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let subscription: { remove: () => void } | null = null;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve();
    };
    const timer = setTimeout(done, 0);
    // A yield already waiting when the app leaves the screen would otherwise hang until it returns.
    subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') done();
    });
  });
}

/** Runs callback when the main thread is idle (replaces InteractionManager.runAfterInteractions). */
export function scheduleIdleTask(callback: () => void): void {
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(() => callback());
    return;
  }

  setTimeout(callback, 0);
}
