import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db/recent-language-preferences', () => ({
  loadRecentLanguagePreference: vi.fn(() => Promise.resolve(null)),
  saveRecentLanguagePreference: vi.fn(() => Promise.resolve()),
}));

// The store keeps module-level state, so each test loads a fresh store and fresh db mocks together.
async function load() {
  vi.resetModules();
  const store = await import('@/stores/recent-language-store');
  const mocks = await import('@/db/recent-language-preferences');
  return { store, mocks };
}

describe('recent language store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts empty when nothing was saved', async () => {
    const { store } = await load();

    await store.initRecentLanguageStore();

    expect(store.getRecentLanguageCode()).toBeNull();
  });

  it('restores the saved language on init', async () => {
    const { store, mocks } = await load();
    vi.mocked(mocks.loadRecentLanguagePreference).mockResolvedValueOnce('en');

    await store.initRecentLanguageStore();

    expect(store.getRecentLanguageCode()).toBe('en');
  });

  it('writes each newly picked language and skips picking the same one again', async () => {
    const { store, mocks } = await load();
    await store.initRecentLanguageStore();

    store.setRecentLanguage('en');
    store.setRecentLanguage('en');
    store.setRecentLanguage('fr');

    expect(store.getRecentLanguageCode()).toBe('fr');
    expect(mocks.saveRecentLanguagePreference).toHaveBeenCalledTimes(2);
    expect(mocks.saveRecentLanguagePreference).toHaveBeenLastCalledWith('fr');
  });

  it('keeps a pick made while the saved language is still loading', async () => {
    const { store, mocks } = await load();
    let resolveLoad: (code: string | null) => void = () => {};
    vi.mocked(mocks.loadRecentLanguagePreference).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const init = store.initRecentLanguageStore();
    store.setRecentLanguage('fr');
    resolveLoad('en');
    await init;

    expect(store.getRecentLanguageCode()).toBe('fr');
  });
});
