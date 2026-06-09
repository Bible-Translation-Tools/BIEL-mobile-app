/** Lets the RN bridge process frames before the next stretch of JS work. */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
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
