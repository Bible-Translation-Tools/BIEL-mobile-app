---
name: review-architecture
description: Review a BIEL change (current diff, a branch, or a PR) for where code lives and how it is shaped under the app's pragmatic layered architecture — layer placement, import direction, feature capability boundaries, the fetch/load/get verb rule, thin hooks, row-only db, server shapes kept in api/graphql, naming, and file size. Use when asked to review architecture, structure, organization, or "clean code" of a change, before opening a PR, or when unsure which folder new code belongs in. Not a bug hunt (use /code-review) and not a runtime check (use verify-biel).
---

# review-architecture

Keep BIEL organized the way PR #5 ("Refactor domain rules") left it: **pragmatic layered
architecture**. Normal Expo/React folders, one capability layer (`features/`), one pure layer
(`domain/`), adapters underneath. No ports, no use-case classes, no repositories-behind-interfaces.
Boundaries are enforced by lint where possible and by this review where lint can't see.

Source of truth: [`docs/app-architecture.md`](../../../docs/app-architecture.md). If this skill and that
doc disagree, the doc wins. Flag the disagreement in the report so one of them gets fixed.

## The shape

```
app/ (screens) · components/ (UI)
        ↓
hooks/ · stores/ · contexts/            React bindings and UI state
        ↓
features/<capability>/index.ts          public operations: catalog, reading, playback, downloads, library
        ↓
features/<capability>/*.ts              what the app does: orchestration, read-modify-write, strategies
        ↓                ↘
domain/  (pure)          api/ · db/ · services/   (BIEL + files · SQLite rows · device APIs)

types/ shared shapes only · utils/ small leftovers (source-strategy, concurrency) · constants/ · i18n/
```

Dependencies point **down only**. A layer never imports one above it, and `domain/` imports
nothing but `@/types` and its own siblings.

## Procedure

### 1. Scope

- No argument: `git diff main...HEAD` plus uncommitted changes.
- A branch: `git diff main...<branch>`. A PR number: `gh pr diff <n>` and `gh pr view <n>`.
- List the changed files under `src/`, grouped by top-level folder. Ignore lockfiles, generated
  files, `android/`, `ios/`.

### 2. Mechanical gates (run, don't guess)

```bash
pnpm lint            # oxlint: layer boundaries (no-restricted-imports) + import/no-cycle
pnpm exec tsc --noEmit
pnpm test            # vitest; domain/ and features/ tests
pnpm format:check
```

Report each result as pass/fail with the relevant lines. A boundary lint error is an automatic
**must-fix**. Don't re-report it in step 3, just point at it. If a gate can't run, say so. Don't
assume it passes.

If the change edits `oxlint.config.ts`, check whether it loosens a boundary. That needs the same
justification as the code it lets through, plus a matching update to the "Lint boundaries"
table in `docs/app-architecture.md`.

### 3. Judgment review (what lint can't catch)

Read each changed file **in full**, not only the hunks: placement problems show up in the whole
file. Check it against the rules below. Each finding needs a file:line, the rule it breaks,
and the concrete fix (which file or folder the code should move to, and under what name).

#### A. Placement: is this code in the right layer?

Apply the "New code" ladder from the doc, top to bottom; the first match wins:

1. JSX or a route → `app/` or `components/`
2. `useState` / `useEffect` / other hooks → `hooks/`
3. UI state shared across screens → `stores/` (exposed as a hook)
4. A rule or parser with no I/O → `domain/`
5. Something the user can do → `features/<capability>/`, exported from its `index.ts`
6. Talking to BIEL, files, or SQLite → `api/` or `db/`
7. Talking to a device API → `services/`
8. A new server field → mapped in `api/graphql/catalog-api.ts`

Red flags (each one was fixed somewhere in #5):

- **Logic in `types/`.** Functions, constants with behavior, or derived computations in
  `src/types/**` belong in `domain/`. Types are declarations only.
- **Pure logic stranded in I/O code.** A deterministic branch, calculation, parser, or
  "is this fully downloaded / which rendering wins / which chapters are missing" rule in a
  feature, hook, component, or adapter → extract to `domain/` (test it if it is core logic; see rule E).
- **I/O in `domain/`.** Network calls, file access, SQLite, `Date.now()`, randomness, or platform checks.
  Lint catches imports but not globals like `fetch` or `Date.now()`. Pass time and IDs in as arguments.
- **Business rules in `db/`.** `db/` only reads and writes rows. Read-modify-write sequences
  ("add one chapter to an audio book", "mark book complete when all chapters exist") belong in
  the feature that needs them.
- **Fat hooks.** A hook should call a feature function and map the result to loading, data, and
  error states (plus translation). Multi-step orchestration, retries, caching decisions, or source
  selection inside a hook → move into the feature.
- **UI talking to adapters.** Components, screens, hooks, stores, or contexts importing `@/api`,
  `@/db`, or `@/services` directly → go through a feature. Lint doesn't catch this, so grep for it.
  It's allowed only for the rows in the doc's **Exceptions** table (bootstrap in `_layout.tsx`,
  `db/*-preferences.ts` from their store or context, system volume, force-offline). A new
  crossing needs either a feature or a new row in that table with a reason.
- **Store owning state a feature needs.** State that a feature or adapter reads lives in that
  layer, and the store only wraps it in a hook. The only allowed exception is force-offline
  (store → `api/network.ts` via `setNetworkBlocked`).
- **Server shapes leaking.** GraphQL field names (`scriptural_rendering_metadata`, `CONTENTS`,
  upper-case file types) anywhere outside `src/api/graphql/` → map to `src/types/catalog.ts` types in
  `catalog-api.ts`.
- **User-facing text below hooks.** Features and adapters return error codes or data such as
  `DownloadFailure`, and hooks translate them. The only exception is `features/downloads/notifications.ts`.
- **Cross-feature reach.** UI imports `@/features/<cap>` (the index), never internals. Inside
  `features/`, a feature imports another feature's specific file, never its index. Every such
  import must match a row in the doc's **Cross-feature imports** table. A new one needs a row, and
  a new two-way dependency between features is a must-fix: move the shared piece to `domain/`
  or an adapter.

#### B. Feature API shape

- New user-facing operations are **exported from `features/<cap>/index.ts`**. Internal helpers
  are not exported. The index is the capability's public list, so keep it short and intentional.
- **Verb rule** (applies to `features/` only):
  - `fetch*`: network only; throws when offline or blocked.
  - `load*`: local only (SQLite or files).
  - `get*`: whichever source works, through a **named** strategy in `utils/source-strategy.ts`
    (`localFirst`, `cacheFirst`). A hand-rolled fallback chain needs a comment on the function
    explaining why no helper fits (as `getLanguageBookSlugs` and `getLanguageCatalog` do).
  - Synchronous `get*Snapshot` accessors are exempt.
  - Action verbs stay as they are: `download*`, `delete*`, `cancel*`, `play`, `seekTo*`, `is*` / `has*`.
  - Check the body against the name. A `load*` that touches the network, or a `fetch*` that reads
    SQLite, is a finding even if the name looks fine.
- A new capability folder needs a row in the capability map table in the doc, and a reason it isn't one
  of the existing five.

#### C. Naming and files

- File names are 1–3 kebab-case words and describe the subject. The folder already says the
  capability, so `features/downloads/job-runner.ts`, not `download-job-runner-service.ts`. No
  `-service`, `-utils`, `-helper`, `-manager` suffixes.
- `db/` is one file per table group, re-exported from `db/index.ts`. A new table gets a new file
  or joins its group's file, plus a row in the doc's Database table.
- `utils/` is for small leftovers with no better home. Anything rule-like belongs in `domain/`, and
  anything I/O-like belongs in an adapter. Push back on new `utils/` files.
- Platform splits use `.native.ts` / `.web.ts` (or `.ios` / `.android`) with a shared `.types.ts`,
  as `use-chapter-audio` does, not `Platform.OS` branches spread through a file.

#### D. Size and duplication (pragmatic, not dogmatic)

- A file that grows past ~300 lines, or that mixes two subjects, should be split by subject
  (#5 split `offline-audio` / `offline-scripture` and the old `db/repository`).
  Suggest the split; don't demand it unless the change made the file worse.
- The doc's **Known issues** table lists accepted debt with a trigger for each item (large
  files, the duplicate download engines, the `catalog` ↔ `downloads` cycle). Flag an item only
  when the change fires its trigger. If it does, recommend the fix in that row.
- **Don't propose ceremony.** Interfaces with one implementation, DI containers, use-case
  classes, repository abstractions over `db/`, mappers between identical shapes, or barrels
  outside `features/*/index.ts` and `db/index.ts` are themselves findings against the "pragmatic"
  half of the architecture.

#### E. Tests and docs travel with the code

- Tests are for **core logic and important paths**, not for every file. Expect a test when the
  change adds or changes:
  - a parser or rule whose bugs would corrupt or hide content (HTML/whole-book/cue parsing, verse
    timing and navigation, resource selection), or decide what counts as downloaded
    (`domain/downloads.ts`, `audio-manifest`, `book-slug`);
  - feature orchestration with real branching on a main user path: download job runs, failures,
    cancellation, concurrency, offline source strategies (`localFirst` / `cacheFirst`).
  Put these in `src/domain/__tests__/` or `features/<cap>/__tests__/`.
- Don't ask for tests on trivial or low-risk code: small mappers, constants, label formatting,
  thin wrappers, one-line predicates, or pure helpers already covered through a tested caller. Being
  in `domain/` is not by itself a reason to need a test.
- A missing test on core logic or an important path is a **should-fix**. Elsewhere, at most a
  **consider**, and usually not worth mentioning.
- If the change moves a boundary, or adds a capability, table, strategy, cross-feature import, or
  exception, or resolves a Known issue, `docs/app-architecture.md` must change in the same PR.
  Missing doc updates are a **should-fix**.

### 4. Report

Lead with a concise verdict: **Clean**, **Clean with suggestions**, or **Needs changes**, followed
by two or three sentences on the change's overall shape. Say whether its code landed in the right
layers, name the main problem if there is one, and say what must happen before merge. No more than
a short paragraph. Then:

```
## Verdict
Needs changes. The new checkpoint logic is mostly well placed (rule in domain/, persistence in db/),
but the restore flow runs inside a hook instead of the reading feature. Move it (must-fix 1) and
the rest is ready.

## Gates
lint ✅ · tsc ✅ · test ❌ (1 failing: …) · format ✅

## Must-fix   (breaks a boundary or the layer direction; lint errors; logic in the wrong layer)
1. src/hooks/use-foo.ts:42 — orchestrates download retries in a hook (rule A: fat hooks).
   Move the retry loop to features/downloads/job-runner.ts; the hook calls runDownload().

## Should-fix (naming, verb rule, missing doc update, untested core logic, server shape leak contained to one spot)
## Consider   (splits, small cleanups; optional)
## Looks good (one or two lines on what the change got right — placement that followed the ladder)
```

Rules for the report:
- Every finding cites a rule letter (A–E) and gives the **destination**: which file, function name,
  and verb. "This feels misplaced" is not a finding.
- Read the code you cite. Don't flag what lint already reported, and don't flag Known issues
  unless their trigger has fired.
- Keep the scope to the change. Note pre-existing violations you pass by in one "Pre-existing"
  line at the end, not as findings.
- Don't edit code unless asked. If asked to fix, apply must-fix items first, re-run step 2, and
  report what changed.
