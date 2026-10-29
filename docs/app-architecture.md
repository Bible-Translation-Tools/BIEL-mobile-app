# App architecture

The spec and guideline for where code goes in BIEL Mobile and how layers talk to each other.

See also: [Offline mode](./offline-mode.md), [Chapter audio](./chapter-audio.md), [Downloads Library](./downloads-library.md), [Reading checkpoint](./reading-checkpoint.md).
Reviews against this doc: the `review-architecture` skill (`.agents/skills/review-architecture/`).

## Principles

BIEL uses a **pragmatic layered architecture**: the normal Expo/React layout, plus one capability
layer (`features/`) and one pure layer (`domain/`), with adapters underneath.

1. **Dependencies point down.** A layer may import the layers below it, never above.
2. **One place per concern.** Rules live in `domain/`, what the app does lives in `features/`,
   talking to the outside world lives in adapters, and React lives in UI and hooks.
3. **Lint enforces the boundaries; this doc explains them.** Every rule that can be a lint rule is one
   (see [Lint boundaries](#lint-boundaries)). The rest is checked in review.
4. **No ceremony.** No ports, use-case classes, DI containers, repository interfaces, or mappers
   between identical shapes. Add a layer or abstraction only when a second implementation exists.
5. **Exceptions are named.** Anything that crosses a boundary is listed under
   [Exceptions](#exceptions). An exception that isn't listed there is a bug.

## Layers

```
 app/ (screens) · components/ (UI)
          ↓
 hooks/ · stores/ · contexts/             React bindings and UI state
          ↓
 features/<capability>/index.ts           public operations (the only door into a feature)
          ↓
 features/<capability>/*.ts               what the app does
          ↓                ↘
 domain/ (pure)            api/ · db/ · services/     adapters

 Shared by all layers: types/ · constants/ · utils/
```

| Folder | Owns | Must not |
|--------|------|----------|
| `app/` | Expo Router screens: layout, navigation, composing components and hooks | Hold business logic; call adapters (except the bootstrap in `_layout.tsx`) |
| `components/` | Presentational UI, grouped by screen area (`books/`, `reading/`, `download/`, …) | Fetch data or call features directly; take data and callbacks from props or hooks |
| `hooks/` | React bindings: call a feature, expose loading / data / error, translate errors | Orchestrate multi-step work, retry, choose data sources |
| `stores/` | UI state shared across screens, exposed as hooks | Own state a feature or adapter needs (see [State ownership](#state-ownership)) |
| `contexts/` | App-wide React providers (appearance, locale) | Contain feature logic |
| `features/` | What the app does: orchestration, source strategies, read-modify-write, error data | Import React, hooks, stores, components, or i18n |
| `domain/` | Pure rules and parsers: same input, same output | Do I/O, read the clock, use randomness, import React/Expo or any layer above `types/` |
| `api/` | Talking to BIEL (GraphQL, content HTTP), network state, on-disk file layout | Know about features, UI, or stores |
| `db/` | SQLite: schema, connection, row reads and writes, one file per table group | Contain business rules (read-modify-write belongs to features) |
| `services/` | Device APIs: TrackPlayer setup, system volume | Contain feature logic |
| `types/` | Shared type declarations (our shapes, not server shapes) | Contain functions or runtime values |
| `constants/` | Static values: book order, theme, preference keys | Contain logic |
| `utils/` | Small, generic, framework-free helpers (`source-strategy`, `run-with-concurrency`, `yield-to-ui`, route params) | Hold domain rules (→ `domain/`) or I/O (→ adapters) |
| `i18n/`, `locales/` | Translation setup and strings | Be imported below hooks (except [Exceptions](#exceptions)) |

## Dependency rules

| A file in… | may import |
|------------|------------|
| `app/`, `components/` | hooks, stores, contexts, `features/<cap>` (index only), components, `types`, `constants`, `utils`, `i18n` |
| `hooks/`, `stores/`, `contexts/` | `features/<cap>` (index only), other hooks/stores, `types`, `constants`, `utils`, `i18n`, plus the [preference exception](#exceptions) |
| `features/` | sibling files, another feature's **file** (see [Cross-feature imports](#cross-feature-imports)), `domain`, `api`, `db`, `services`, `types`, `constants`, `utils` |
| `domain/` | other `domain` files, `types` |
| `api/`, `db/`, `services/` | each other where needed, `types`, `constants`, `utils` |
| `types/` | other `types` |

Import cycles are forbidden everywhere.

### Cross-feature imports

UI goes through a feature's `index.ts`. Inside `features/`, a feature never imports another
feature's `index.ts`. It imports the specific file it needs, so the dependency is visible and lint can
detect cycles.

Allowed cross-feature reads today:

| From | Uses | Why |
|------|------|-----|
| `reading`, `playback`, `library`, `catalog` | `downloads/offline-scripture`, `downloads/offline-audio` (`loadOffline*`) | `downloads` owns what is on the device |
| `library` | `catalog/books` (`sortBooks`) | canonical book order |
| `downloads` | `catalog/books` (`getLanguageBookSlugs`) | which books a language download covers |

A new cross-feature import must be added to this table. Two features that depend on each other
(`catalog` ↔ `downloads` today, see [Known issues](#known-issues)) are a sign that the shared piece
belongs in `domain/` or an adapter.

## Capability map

Each `src/features/<capability>/index.ts` is that capability's public API, grouped with a one-line
comment per group. The index is the source of truth for names. The table below gives the shape only.

| Capability | What the user does | Public operations (see `index.ts`) | Domain rules used |
|------------|--------------------|------------------------------------|-------------------|
| `catalog` | Browse languages, books, chapters | language catalog (`getLanguageCatalog`, snapshot, refresh status), `fetch`/`loadBooksForLanguage`, `getChaptersForBook` | — |
| `reading` | Read a chapter | `getChapterContent` | `chapter-html-parser`, `resource-selection` |
| `playback` | Play chapter audio | `getAudioChaptersForBook`, playback session (`loadChapter`, `play`/`pause`, `seekTo*`, `stopPlayback`, subscribe/snapshot), app-lifecycle stop | `verse-timing`, `verse-navigation`, `cue-parser`, `audio-cue-metadata` |
| `downloads` | Download or delete scripture and audio | `download*` / `delete*` (chapter, book, language), sizes, `is*Downloaded`, `runDownload` / `cancelDownload`, task registry, failures, notifications | `downloads`, `audio-manifest`, `book-slug`, `resource-selection`, `whole-book-parser` |
| `library` | Browse what is on the device | `loadDownloadedLibrary`, `loadDownloadedChaptersForBook`, `loadDownloadedBookSlugsByKind` | `content-type` (used by the library UI) |

App state that isn't a capability (reading text settings, appearance, locale, volume, reading
checkpoint) lives in stores and contexts backed by `db/*-preferences.ts`. A pure rule it needs goes
in `domain/` (for example `domain/reading-checkpoint.ts`).

**Adding a capability.** Only when the user gains a new kind of action that fits none of the five.
Add the folder, its `index.ts`, and a row in this table.

## Feature API rules

### Verb rule

Applies to exported functions in `features/`. The name must match what the body does:

| Verb | Source | Notes |
|------|--------|------------|
| `fetch*` | network only | throws when offline or blocked |
| `load*` | local only (SQLite or files) | never touches the network |
| `get*` | whichever works, through a named strategy (below) | per strategy |
| `get*Snapshot` | synchronous in-memory read | — |
| `download*`, `delete*`, `cancel*`, `play`, `pause`, `seekTo*`, `is*` / `has*`, `subscribe*`, `init*` | action or predicate verbs, kept as they are | — |

### Offline strategies

Named helpers in `src/utils/source-strategy.ts`:

- `localFirst(local, remote)`: downloaded copy, then the network. Used by `getChapterContent`,
  `getChapterAudioUrl`, `getChapterVerseTimings`.
- `cacheFirst(cached, remote, fallback, isUsable)`: cached catalog copy, then the network; if
  that fails, the fallback (downloaded content) when usable. The cache is never refreshed. Used by
  `getChaptersForBook` and `getAudioChaptersForBook`, which save the network result to the cache.

A `get*` that needs a different order explains it in a comment on the function. Current custom
ones: `getLanguageBookSlugs` (cache, network, downloaded) and `getLanguageCatalog` (serve
cache, refresh in the background). If a third function would copy one of these, promote it to a
named helper.

### Errors

- Features and adapters return error codes or throw. They never produce user-facing text.
- Failures the UI must explain are **data**: downloads use `DownloadFailure` (`types/download.ts`,
  built in `features/downloads/failures.ts`).
- Hooks translate: `useContentDownload` turns a `DownloadFailure` into text, and
  `useDownloadErrorAlert` shows it.

## State ownership

| State | Lives in | Read by UI through |
|-------|----------|--------------------|
| UI-only state shared across screens (reading text settings) | `stores/` | the store's hook |
| State a feature needs (playback session, download tasks, language catalog snapshot) | the feature | `subscribe*` / `get*Snapshot`, wrapped by a hook or store (e.g. `download-progress-store` wraps the download task registry) |
| Persisted preferences | `db/*-preferences.ts` | a store or context that loads and saves them |

A store never holds state a feature reads. If a feature needs it, the feature owns it and the
store wraps it.

## Database

`src/db/index.ts` is the public list. Files are grouped by table:

| File | Tables | Holds |
|------|--------|-------|
| `schema.ts` | all | table definitions (`CREATE TABLE IF NOT EXISTS`) |
| `connection.ts` | — | `initDatabase`, the shared connection, serialized transactions |
| `languages.ts` | `languages`, `language_catalog` | cached language catalog; the `languages` row downloads reference |
| `book-catalog.ts` | `book_catalog` | cached book list per language |
| `chapter-catalog.ts` | `chapter_catalog` | cached chapter numbers per book (text and audio) |
| `scripture-books.ts` | `books`, `chapters` | whole-book scripture downloads |
| `scripture-chapters.ts` | `scripture_chapters` | chapters downloaded on their own |
| `audio-books.ts` | `audio_books`, `audio_chapters` | audio downloads |
| `local-content.ts` | all download tables | what is on the device, across types |
| `preferences.ts`, `*-preferences.ts` | `preferences` | one file per setting group (appearance, locale, reading text, volume, reading checkpoint) |

Rules:
- `db/` only reads and writes rows. Read-modify-write ("add one chapter to an audio book") lives
  in the feature that needs it, inside a `connection.ts` transaction when it must be atomic.
- Import from `@/db`, not from individual files. Exception: the `*-preferences.ts` files may be imported
  directly by the store or context that owns that setting.
- A new table gets a file (or joins its group's file), an export in `index.ts`, and a row here.

## Server shapes

Only `src/api/graphql/` knows GraphQL field names (`scriptural_rendering_metadata`, `CONTENTS`
URLs, upper-case file types). `catalog-api.ts` maps them to `src/types/catalog.ts`
(`ScriptureRendering`, `CatalogLanguage`, `CatalogBook`, `AudioFile`). Everything above the adapter
uses those types. A new server field is mapped there first.

## Exceptions

Every allowed boundary crossing, with its reason:

| Where | Crosses | Why |
|-------|---------|-----|
| `app/_layout.tsx` | imports `api/offline-storage`, `db`, `db/locale-preferences`, `services/track-player/setup` | app bootstrap (composition root): runs once before any screen |
| `stores/*-store.ts`, `contexts/*-context.tsx` | import `db/*-preferences.ts` | persisted preferences have no feature logic; a feature wrapper would only pass the call through |
| `stores/audio-volume-store.ts`, `hooks/use-system-volume-sync.ts` | import `services/system-audio-volume` | device volume is UI state with no app logic |
| `stores/force-offline-store.ts` | calls `api/network.ts` `setNetworkBlocked` | force-offline is a temporary testing switch, not a product feature; `api/` never imports the store |
| `features/downloads/notifications.ts` | imports `i18n` | it renders OS notifications outside React |

Lint doesn't block the store, context, and hook rows yet (see [Lint boundaries](#lint-boundaries)), so
review checks that no new UI-layer file imports `api/`, `db/`, or `services/` without a row here.

## Testing

Test core logic and important paths, not every file:

- **Expect tests** for parsers and rules whose bugs corrupt or hide content, or that decide what
  counts as downloaded (`src/domain/__tests__/`), and for feature orchestration with real branching
  on a main path: download runs, failures, cancellation, concurrency, offline strategies
  (`features/<cap>/__tests__/`).
- **Skip tests** for small mappers, constants, label formatting, thin wrappers, and helpers already
  covered through a tested caller.
- Domain tests use fixtures in `src/domain/__tests__/assets/`. Feature tests mock adapters, not domain.

## Naming

- Files: one to three kebab-case words naming the subject. The folder already gives the
  capability or layer (`features/downloads/job-runner.ts`, not `download-job-runner-service.ts`). No
  `-service`, `-utils`, `-helper`, or `-manager` suffixes.
- Hooks: `use-<subject>.ts` exporting `use<Subject>`. Stores: `<subject>-store.ts`. Contexts:
  `<subject>-context.tsx`.
- Platform variants: `.native.ts` / `.web.ts` (or `.ios` / `.android`) with a shared `.types.ts`, as
  `use-chapter-audio` does, instead of `Platform.OS` branches spread through a file.
- Feature exports follow the [verb rule](#verb-rule).

## Size

A file past ~300 lines, or one that mixes two subjects, is split by subject when a change next
makes it bigger. Current files over the line are tracked in [Known issues](#known-issues).

## Lint boundaries

Configured in `oxlint.config.ts` (it replaced `eslint.config.js`), run with `pnpm lint`:

| Files | May not import |
|-------|----------------|
| `src/domain/**` | `@/api`, `@/services`, `@/db`, `@/features`, `@/hooks`, `@/stores`, `@/components`, `react*`, `expo*` |
| `src/{api,services,db}/**` | `@/features`, `@/hooks`, `@/stores`, `@/components`, `@/i18n`, `@/constants/theme` |
| `src/features/**` | `@/hooks`, `@/stores`, `@/components`, `@/i18n`, `@/constants/theme`, another feature's `index.ts` |
| `src/{app,components,hooks,stores,contexts}/**` | `@/features/*/*` (must use the capability index) |
| `src/types/**` | `@/hooks`, `@/components`, `@/constants/theme` |
| everything | import cycles (`import/no-cycle`) |

`features/downloads/notifications.ts` has its own override that allows `@/i18n`.

Not enforced by lint, so checked in review:
- UI-layer files importing `@/api`, `@/db`, `@/services` outside [Exceptions](#exceptions).
- `domain/` using globals (`fetch`, `Date.now()`, `Math.random()`, `Platform`).
- `types/` containing functions.
- The verb rule, hook thinness, and business rules in `db/`.

Changing a boundary means changing `oxlint.config.ts` and this table in the same PR.

## New code

Go down the list and use the first match:

1. JSX or a route → `app/` or `components/`
2. `useState` / `useEffect` / other React hooks → `hooks/`
3. UI state shared across screens → `stores/`
4. A rule or parser with no I/O → `domain/`
5. Something the user can do → `features/<capability>/`, exported from its `index.ts`
6. Talking to BIEL, files, or SQLite → `api/` or `db/`
7. Talking to a device API → `services/`
8. A new server field → map it in `api/graphql/catalog-api.ts`
9. A generic helper with no domain meaning → `utils/` (rare; try 4 and 6 first)

A PR that adds a capability, table, strategy, cross-feature import, or exception updates this doc.

## Known issues

Accepted debt, fixed when the trigger fires:

| Issue | Trigger to fix |
|-------|----------------|
| `catalog` ↔ `downloads` depend on each other (`catalog/chapters` reads `loadOffline*`; `downloads/offline-scripture` uses `getLanguageBookSlugs`). `sortBooks` is a pure rule living in `catalog/books.ts`. | Next change to either file: move `sortBooks` to `domain/`; consider moving the `loadOffline*` readers so `catalog` stops depending on `downloads`. |
| Scripture and audio download engines (`offline-scripture.ts` ~550 lines, `offline-audio.ts` ~800) are near-duplicates. | Compare what is left in the two files, or when a third content type is scheduled, then merge. |
| `app/read.tsx` (~600 lines) and `components/reading/audio-play-button.tsx` (~400) are too large. | Split when a feature next touches them. |
| `features/playback/session.ts` (~370 lines) mixes session state and seek logic. | Split when playback next changes. |
