import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BooksCheckpoint, ChapterCheckpoint } from '@/types/reading-checkpoint';

vi.mock('@/db/reading-checkpoint-preferences', () => ({
  clearReadingCheckpointPreference: vi.fn(() => Promise.resolve()),
  loadReadingCheckpointPreference: vi.fn(() => Promise.resolve(null)),
  saveReadingCheckpointPreference: vi.fn(() => Promise.resolve()),
}));

const chapterFive: ChapterCheckpoint = {
  screen: 'read',
  languageCode: 'en',
  bookSlug: 'MAT',
  bookName: 'Matthew',
  chapter: 5,
  audioOnly: false,
  source: 'catalog',
};

const chapterSix: ChapterCheckpoint = { ...chapterFive, chapter: 6 };

const englishBooks: BooksCheckpoint = { screen: 'books', languageCode: 'en', hasText: true };

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

    store.clearReadingCheckpoint(chapterFive);

    expect(mocks.clearReadingCheckpointPreference).toHaveBeenCalledTimes(1);
    expect(store.getReadingCheckpointSnapshot()).toBeNull();
  });

  it('skips the clear when there is no checkpoint', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();

    store.clearReadingCheckpoint(chapterFive);

    expect(mocks.clearReadingCheckpointPreference).not.toHaveBeenCalled();
  });

  it('saves again after a clear', async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();
    store.saveReadingCheckpoint(chapterFive);
    store.clearReadingCheckpoint(chapterFive);

    store.saveReadingCheckpoint(chapterFive);

    expect(mocks.saveReadingCheckpointPreference).toHaveBeenCalledTimes(2);
    expect(store.getReadingCheckpointSnapshot()).toEqual(chapterFive);
  });

  it("does not clear another screen's checkpoint", async () => {
    const { store, mocks } = await load();
    await store.initReadingCheckpointStore();

    // Back from the reader to the book list: the book list saved before the reader's clear arrived.
    store.saveReadingCheckpoint(chapterFive);
    store.saveReadingCheckpoint(englishBooks);
    store.clearReadingCheckpoint(chapterFive);

    expect(mocks.clearReadingCheckpointPreference).not.toHaveBeenCalled();
    expect(store.getReadingCheckpointSnapshot()).toEqual(englishBooks);
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
