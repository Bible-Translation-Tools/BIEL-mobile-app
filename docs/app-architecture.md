# App architecture

Normal Expo/React layout plus a capability-based `features/` layer and one pure `domain/` folder. Boundaries are enforced by lint, not by extra layers.

See also: [Offline mode](./offline-mode.md), [Chapter audio](./chapter-audio.md), [Downloads Library](./downloads-library.md).

## Folders

```
src/
  app/           screens (Expo Router)
  components/    UI
  hooks/         React bindings
  stores/        useSyncExternalStore hooks over module state
  contexts/      appearance and locale providers
  features/      what the app does (catalog, reading, playback, downloads, library)
  domain/        pure rules and parsers (no I/O, no React)
  api/           server, network, and file adapters
  services/      device adapters (TrackPlayer setup, system volume)
  db/            SQLite
  types/         shared type declarations only (our shapes, not server shapes)
  utils/         leftover helpers (including source-strategy)
```

```
screens / components
        ↓
     hooks / stores / contexts
        ↓
     features/*/index.ts
        ↓
   features (capability logic)
        ↓          ↘
   domain        api / db / services
```

- UI does not call GraphQL or TrackPlayer.
- Hooks stay thin: call a feature function, map to loading/error.
- UI imports features through their `index.ts`. Features import sibling files, never another feature's index.
- No ports or use-case classes.

## Capability map

Each `src/features/<capability>/index.ts` is the public list of operations. File names describe the subject; the folder already says which capability it belongs to (one to three kebab-case words; no `-service` / `-utils` suffixes).

| Capability | What the user does | Entry functions |
|------------|--------------------|-----------------|
| `catalog` | Browse languages, books, chapters | `fetchLanguages`, `loadLanguages`, `getLanguageCatalog`, `fetchBooksForLanguage`, `loadBooksForLanguage`, `getLanguageBookSlugs`, `getChaptersForBook` |
| `reading` | Read a chapter | `getChapterContent` |
| `playback` | Play chapter audio | `getChapterAudioUrl`, `getChapterVerseTimings`, `getAudioChaptersForBook`, `loadChapter`, `play`, `seekTo*`, `stopPlayback` |
| `downloads` | Download or delete scripture and audio | `download*` / `delete*` (chapter, book, language), `runDownload`, `cancelDownload` |
| `library` | Browse what is on the device | `loadDownloadedLibrary`, `loadDownloadedBooksForLanguage`, `loadDownloadedChaptersForBook`, `loadDownloadedLanguages` |

`domain/` stays separate: features do I/O; domain is the lint-enforced pure zone. Shared rules: `downloads.ts` (status, task IDs, "fully downloaded"), `resource-selection.ts` (reading + downloads), `verse-navigation.ts` (playback), `content-type.ts` (library UI), plus the parsers.

Which domain rules each feature uses:

| Feature | Domain |
|---------|--------|
| `catalog` | — |
| `reading` | `chapter-html-parser`, `resource-selection` |
| `playback` | `verse-timing`, `verse-navigation` |
| `downloads` | `downloads`, `resource-selection`, `whole-book-parser` |
| `library` | `content-type` (in UI; library feature itself maps local records) |

## Verb rule

Applied to `features/` only:

- `fetch*`: network only; throws when offline or blocked.
- `load*`: local only (SQLite or files).
- `get*`: uses whichever source works, via a named strategy helper. Synchronous `get*Snapshot` accessors keep their names.
- Action verbs stay as they are: `download*`, `delete*`, `cancel*`, `play`, `seekTo*`, `is*` / `has*`.

## Offline strategies

Named helpers in `src/utils/source-strategy.ts`:

- `localFirst(local, remote)`: downloaded copy, then network. Used by `getChapterContent`, `getChapterAudioUrl`, `getChapterVerseTimings`.
- `networkFirst(remote, local, isUsable)`: catalog first; on failure, local if usable. Used by `getChaptersForBook`, `getAudioChaptersForBook`.

Custom (commented on the function, not a helper): `getLanguageBookSlugs` (cache, then network, then downloaded) and `getLanguageCatalog` (serve cache, refresh in the background).

## `features/` vs adapters

| | `src/features` | `src/api` | `src/services` |
|---|----------------|-----------|----------------|
| Job | What the app does | Talk to BIEL / files | Talk to this phone |
| Does | Catalog, reading, playback, downloads, library | GraphQL, content HTTP, disk layout | TrackPlayer setup, system volume |
| Example | `getChapterContent`, `runDownload` | `catalogApi`, `offline-storage.ts` | `track-player/setup.ts` |

Plain module state lives in `features/` (or `api/` / `services/` for adapters); `stores/` wraps it in hooks. Features return error codes or throw; hooks translate for display.

## Server shapes

Only `src/api/graphql/` knows GraphQL field names (`scriptural_rendering_metadata`, `CONTENTS` URLs, upper-case file types). `catalog-api.ts` maps them to `src/types/catalog.ts` (`ScriptureRendering`, `CatalogLanguage`, `CatalogBook`, `AudioFile`). Everything above the adapter uses those types.

Force-offline is a temporary switch: the store calls `setNetworkBlocked` in `api/network.ts`, and `api/` never imports the store.

## Lint boundaries

Configured in `eslint.config.js`, run with `pnpm lint`:

| Files | May not import |
|-------|----------------|
| `src/domain/**` | `@/api`, `@/services`, `@/db`, `@/features`, `@/hooks`, `@/stores`, `@/components`, `react*`, `expo*` |
| `src/{api,services,db}/**` | `@/features`, `@/hooks`, `@/stores`, `@/components`, `@/i18n`, `@/constants/theme` |
| `src/features/**` | `@/hooks`, `@/stores`, `@/components`, `@/i18n`, `@/constants/theme`, other features' `index.ts` |
| `src/{app,components,hooks,stores,contexts}/**` | `@/features/*/*` (must use the capability index) |
| `src/types/**` | `@/hooks`, `@/components`, `@/constants/theme` |
| everything | import cycles (`import/no-cycle`) |

Exception: `features/downloads/notifications.ts` may import i18n, because it renders OS notifications outside React.

## New code

1. JSX / route → `app/` or `components/`
2. `useState` / `useEffect` → `hooks/`
3. Rule or parser with no I/O → `domain/`
4. A thing the user can do → `features/<capability>/`, exported from that folder's `index.ts`
5. Talk to BIEL, files, or SQLite → `api/` or `db/`
6. Talk to a device API → `services/`
7. New server field → map it in `api/graphql/catalog-api.ts`

## Deferred

- **Merge the scripture and audio download engines** (`offline-scripture.ts`, `offline-audio.ts`) only after comparing what is left in the two files, or when a third content type is scheduled.
- **Split `read.tsx` and `audio-play-button.tsx`** when a feature next touches them.
