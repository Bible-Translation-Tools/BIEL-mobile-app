import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  });

  it('restores the saved checkpoint on init', async () => {
    const { store, mocks } = await load();
    vi.mocked(mocks.loadReadingCheckpointPreference).mockResolvedValueOnce(chapterFive);

    await store.initReadingCheckpointStore();

    expect(store.getReadingCheckpointSnapshot()).toEqual(chapterFive);
  });

  it('writes each new checkpoint right away and skips an unchanged one', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();

    store.saveReadingCheckpoint(chapterFive);
    store.saveReadingCheckpoint({ ...chapterFive });
    store.saveReadingCheckpoint(chapterSix);

    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledTimes(2);
    expect(mocks.saveReadingCheckpointPreference).toHaveBeenLastCalledWith(chapterSix);
  });

  it('clears the stored checkpoint right away', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();
    store.saveReadingCheckpoint(chapterFive);

    store.clearReadingCheckpoint();

    expect(mocks.clearReadingCheckpointPreference).toHaveBeenCalledTimes(1);
    expect(store.getReadingCheckpointSnapshot()).toBeNull();
  });

  it('skips the clear when there is no checkpoint', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();

    store.clearReadingCheckpoint();

    expect(mocks.clearReadingCheckpointPreference).not.toHaveBeenCalled();
  });

  it('saves again after a clear', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();
    store.saveReadingCheckpoint(chapterFive);
    store.clearReadingCheckpoint();

    store.saveReadingCheckpoint(chapterFive);

    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledTimes(2);
    expect(store.getReadingCheckpointSnapshot()).toEqual(chapterFive);
  });

  it('logs a failed write instead of throwing', async () => {
    const { store, mocks } = await load();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(mocks.saveReadingCheckpointPreference).mockRejectedValueOnce(new Error('disk full'));
    await store.initReadingCheckpointStore();

    store.saveReadingCheckpoint(chapterFive);
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    warn.mockRestore();
  });
});
