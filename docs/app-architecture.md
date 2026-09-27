# App architecture

Normal Expo/React layout plus one pure `domain/` folder. Boundaries are enforced by lint, not by extra layers.

See also: [Offline mode](./offline-mode.md), [Chapter audio](./chapter-audio.md), [Downloads Library](./downloads-library.md).

## Folders

```
src/
  app/           screens (Expo Router)
  components/    UI
  hooks/         React bindings
  stores/        useSyncExternalStore hooks over module state
  domain/        pure rules and parsers (no I/O, no React)
  api/           GraphQL adapter + content I/O (fetch, download, persist)
  services/      device / app-session (player, notifications, caches, download registry)
  db/            SQLite
  types/         shared types (our shapes, not server shapes)
  utils/         leftover helpers
```

```
screens / components
        ↓
     hooks / stores
        ↓
  services (device)     api/services (content)
        ↓          ↘  ↙          ↓
   native modules   domain   graphql / db / files
```

- UI does not call GraphQL or TrackPlayer.
- Hooks stay thin: call a function below, map to loading/error.
- No ports or use-case classes.

## `domain/`

Pure functions with tests that need no mocks:

| File | Rules |
|------|-------|
| `downloads.ts` | `DownloadOutcome`, "is fully downloaded", byte sums, chapter record merge |
| `verse-navigation.ts` | current / next / previous verse from timings |
| `resource-selection.ts` | `pickRendering` (which rendering to use for a book/chapter) |
| `chapter-html-parser.ts`, `whole-book-parser.ts`, `cue-parser.ts` | content parsing |
| `audio-cue-metadata.ts` | `parseAudioCueMetadata` (JSON verse markers embedded in timing files) |
| `verse-timing.ts` | `getVerseTimingParser` (which parser to use for a timing file format) |

Move a rule here when it is copied in two places or when you want to test it without mocks. Do not move a single GraphQL call behind a repository.

## `api/services` vs `services`

| | `src/api/services` | `src/services` |
|---|-------------------|----------------|
| Job | Bible content | This phone / this session |
| Does | Fetch, map, download, persist | Player, volume, notifications, boot cache, download jobs |
| Example | `fetchLanguages`, `downloadBookScripture` | TrackPlayer session, `language-catalog` snapshot, `download-progress` registry |

Talk to BIEL or store scripture → `api/services`. Talk to the device or keep running state → `services`.

Plain module state lives in `services/` (or `api/`); `stores/` only wraps it in hooks. Services return error codes, and hooks translate them.

## Server shapes

Only `src/api/graphql/` knows GraphQL field names (`scriptural_rendering_metadata`, `CONTENTS` URLs, upper-case file types). `catalog-api.ts` maps them to `src/types/catalog.ts` (`ScriptureRendering`, `CatalogLanguage`, `CatalogBook`, `AudioFile`). Everything above the adapter uses those types.

Force-offline is a temporary switch: the store calls `setNetworkBlocked` in `api/network.ts`, and `api/` never imports the store.

## Lint boundaries

Configured in `eslint.config.js`, run with `pnpm lint`:

| Files | May not import |
|-------|----------------|
| `src/domain/**` | `@/api`, `@/services`, `@/db`, `@/hooks`, `@/stores`, `@/components`, `react*`, `expo*` |
| `src/{api,services,db}/**` | `@/hooks`, `@/stores`, `@/components`, `@/i18n`, `@/constants/theme` |
| `src/types/**` | `@/hooks`, `@/components`, `@/constants/theme` |
| everything | import cycles (`import/no-cycle`) |

Exception: `services/download-notification-service.ts` may import i18n, because it renders OS notifications outside React.

## New code

1. JSX / route → `app/` or `components/`
2. `useState` / `useEffect` → `hooks/`
3. Rule or parser with no I/O → `domain/`
4. Get/save Bible content → `api/services/`
5. Device or app session → `services/`
6. SQL → `db/`
7. New server field → map it in `api/graphql/catalog-api.ts`

## Deferred

- **Merge the text and audio download engines** (`offline-text.ts`, `offline-audio.ts`) only after comparing what is left in the two files, or when a third content type is scheduled.
- **Split `read.tsx` and `audio-play-button.tsx`** when a feature next touches them.
