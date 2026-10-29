import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReadingCheckpoint } from '@/types/reading-checkpoint';

vi.mock('@/db/reading-checkpoint-preferences', () => ({
  clearReadingCheckpointPreference: vi.fn(() => Promise.resolve()),
  loadReadingCheckpointPreference: vi.fn(() => Promise.resolve(null)),
  saveReadingCheckpointPreference: vi.fn(() => Promise.resolve()),
}));

const chapterFive: ReadingCheckpoint = {
  languageCode: 'en',
  bookSlug: 'MAT',
  bookName: 'Matthew',
  chapter: 5,
  audioOnly: false,
  source: 'catalog',
};

const chapterSix: ReadingCheckpoint = { ...chapterFive, chapter: 6 };

// The store keeps module-level state, so each test loads a fresh store and fresh db mocks together.
async function load() {
  vi.resetModules();
  const store = await import('@/stores/reading-checkpoint-store');
  const mocks = await import('@/db/reading-checkpoint-preferences');
  return { store, mocks };
}

describe('reading checkpoint store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores the saved checkpoint on init', async () => {
    const { store, mocks } = await load();
    vi.mocked(mocks.loadReadingCheckpointPreference).mockResolvedValueOnce(chapterFive);

    await store.initReadingCheckpointStore();

    expect(store.getReadingCheckpointSnapshot()).toEqual(chapterFive);
  });

  it('writes only the latest checkpoint after rapid saves', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();

    store.saveReadingCheckpoint(chapterFive);
    store.saveReadingCheckpoint(chapterSix);
    await vi.advanceTimersByTimeAsync(200);

    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledTimes(1);
    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledWith(chapterSix);
  });

  it('clears the stored checkpoint after the scheduled delay', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();
    store.saveReadingCheckpoint(chapterFive);
    await vi.advanceTimersByTimeAsync(200);

    store.scheduleClearReadingCheckpoint();
    await vi.advanceTimersByTimeAsync(250);

    expect(mocks.clearReadingCheckpointPreference).toHaveBeenCalledTimes(1);
    expect(store.getReadingCheckpointSnapshot()).toBeNull();
  });

  it('keeps the checkpoint when the reader is focused again before the clear runs', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();
    store.saveReadingCheckpoint(chapterFive);
    await vi.advanceTimersByTimeAsync(200);

    store.scheduleClearReadingCheckpoint();
    await vi.advanceTimersByTimeAsync(100);
    store.cancelScheduledClearReadingCheckpoint();
    await vi.advanceTimersByTimeAsync(500);

    expect(mocks.clearReadingCheckpointPreference).not.toHaveBeenCalled();
    expect(store.getReadingCheckpointSnapshot()).toEqual(chapterFive);
  });

  it('writes a pending change immediately when flushed', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();

    store.saveReadingCheckpoint(chapterSix);
    store.flushReadingCheckpoint();

    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledTimes(1);
    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledWith(chapterSix);
  });
  it('writes nothing when flushed with no pending save', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();
    store.saveReadingCheckpoint(chapterFive);
    await vi.advanceTimersByTimeAsync(200);

    store.flushReadingCheckpoint();

    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledTimes(1);
  });

  it('logs a failed write instead of throwing', async () => {
    const { store, mocks } = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(mocks.saveReadingCheckpointPreference).mockRejectedValueOnce(new Error('disk full'));
    await store.initReadingCheckpointStore();

    store.saveReadingCheckpoint(chapterFive);
    await vi.advanceTimersByTimeAsync(200);

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
