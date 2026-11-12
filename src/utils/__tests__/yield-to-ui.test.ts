import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const appState = vi.hoisted(() => {
  const listeners = new Set<(state: string) => void>();
  return {
    currentState: 'active',
    listeners,
    addEventListener: (_event: string, listener: (state: string) => void) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    emit(state: string) {
      this.currentState = state;
      listeners.forEach((listener) => listener(state));
    },
  };
});

vi.mock('react-native', () => ({ AppState: appState }));

const { yieldToUi } = await import('@/utils/yield-to-ui');

beforeEach(() => {
  vi.useFakeTimers();
  appState.currentState = 'active';
  appState.listeners.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('yieldToUi', () => {
  it('waits for a timer tick while the app is on screen', async () => {
    let resolved = false;
    void yieldToUi().then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
    expect(appState.listeners.size).toBe(0);
  });

  it('does not wait on timers while the app is in the background', async () => {
    appState.currentState = 'background';

    let resolved = false;
    void yieldToUi().then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it('releases a pending yield when the app leaves the screen', async () => {
    let resolved = false;
    void yieldToUi().then(() => {
      resolved = true;
    });

    // Timers are paused in the background, so the tick never comes; the state change must release it.
    appState.emit('background');
    await Promise.resolve();

    expect(resolved).toBe(true);
    expect(appState.listeners.size).toBe(0);
  });
});
