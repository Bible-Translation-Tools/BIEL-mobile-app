# App architecture

Normal Expo/React layout. Clean Architecture is an **import rule**, not extra folders.

See also: [Offline mode](./offline-mode.md), [Chapter audio](./chapter-audio.md), [Downloads Library](./downloads-library.md).

## Folders

```
src/
  app/           screens (Expo Router)
  components/    UI
  hooks/         React bindings
  stores/        client state
  api/           GraphQL + content (fetch, download, parse)
  services/      device / app-session (player, notifications, caches)
  db/            SQLite
  types/         shared types
  utils/         leftover helpers
```

```
screens / components
        ↓
     hooks / stores
        ↓
  services (device)     api/services (content)
        ↓                        ↓
   native modules          graphql / db / files
```

- UI does not call GraphQL or TrackPlayer.
- Hooks stay thin: call a function below, map to loading/error.
- `api/` and `services/` do not import React, Expo Router, or components.
- No ports or use-case classes.

## `api/services` vs `services`

| | `src/api/services` | `src/services` |
|---|-------------------|----------------|
| Job | Bible content | This phone / this session |
| Does | Fetch, map, download, persist | Player, volume, notifications, boot cache, download jobs |
| Example | `fetchLanguages`, `downloadBookScripture` | TrackPlayer session, `language-catalog` snapshot |

Talk to BIEL or store scripture → `api/services`. Talk to the device or keep running state → `services`.

`language-catalog.ts` is in `services/` because it caches the list in memory at boot. The fetch itself is `api/services/languages.ts`.

SQLite stays in `db/`. Stores are UI state, not the database.

## New code

1. JSX / route → `app/` or `components/`
2. `useState` / `useEffect` → `hooks/`
3. Get/save Bible content → `api/services/`
4. Device or app session → `services/`
5. SQL → `db/`
6. Pure function used in two places → sibling file, not `src/domain/`

Extract a pure module when a rule is copied, or when you want a test with no mocks. Do not extract a single GraphQL call behind a repository.

## Splitting mixed files

A file either does I/O or it does not — never both. Stay in the same folders. Sibling `*-mapping.ts` / `*-parse.ts` with no `graphqlRequest`, `@/db`, files, or TrackPlayer.

Already pure (leave them): `resource-selection.ts`, `whole-book-parser.ts`, `audio-timing-utils.ts`.

Worth splitting:

| File | Keep (I/O) | Extract |
|------|------------|---------|
| `reader.ts` | `fetchChapterContent` | HTML parse |
| `languages.ts` / `books.ts` | fetch | map / merge / sort |
| `language-catalog.ts` | snapshot cache | “is this language downloaded” |
| `chapter-playback.ts` | session + TrackPlayer | verse-seek rules (optional) |

Start with `reader.ts` — parse vs network is already split, and tests only cover parse.

Leave `offline-text.ts`, `offline-audio.ts`, `book-download-runner.ts`, and native adapters alone until a rule is actually duplicated.

Device code may import content rules. Rules must not import TrackPlayer, `db`, or React.
