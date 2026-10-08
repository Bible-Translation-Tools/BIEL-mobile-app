# Review of PRs #4 and #5: changes and suggestions

Branch `review/pr-4`, stacked on #5 ("Refactor domain rules", `refactor` @ `139403a`), which is itself
stacked on #4 ("Design Architecture", `code-review` @ `eebc86c`). Each commit message has the detail;
this page explains what each group of changes is and why it is here, and lists what was found but
deliberately not changed.

The review was done by running the app (Android emulator, iOS simulator, a physical iPhone), not only by
reading the diff. Everything below came out of that.

## 1. verify-biel: a way for an agent (or a person) to prove the app works

**What.** A project skill at `.agents/skills/verify-biel/` (also linked from `.claude/skills/` and
`.cursor/skills/`), following Cursor's `create-verification-skill` pattern:

- `bin/biel-verify` (`pnpm verify <cmd>`): `launch android|ios`, `doctor`, `flow <name>`,
  `snapshot`, `db "<sql>"`, `files`, `net off|on` (real Android airplane mode), `reset`, `cleanup`.
- `flows/*.yaml`: Maestro flows that drive the real app by its visible text and accessibility
  labels: browse languages, browse books, read a chapter, chapter audio, audio-panel gestures,
  download a book, Downloads Library (filter + delete), read offline (airplane mode on Android,
  Force Offline Mode on iOS).
- `features/`: a feature map (what each feature is, how a user reaches it, how to drive it, gotchas)
  with a ledger recording which commit each feature was last verified at, per platform.
- Evidence (screenshots, view hierarchy, SQLite rows, on-device files, Maestro logs) lands in
  `.verify/evidence/<sha>/`, so a claim like "offline reading works" is tied to a commit.

**Why.** "It works" should be checkable without trusting whoever says it, and an agent should be able
to check its own work the same way a reviewer would. Proof here means driving the real user path and
checking side effects (the file and DB rows a download writes, deleted on delete), not just a
final screenshot. It already paid off: it found the iOS bugs in section 2, and confirmed each fix
with a negative control (the flow fails with the fix removed).

**Suggestion: promote stable flows to e2e tests.** Verification and e2e are different jobs that can
share the same flows:

| | verify-biel | e2e suite (proposed) |
|---|---|---|
| Question | Does *this change* work in the real app? | Did something that used to work break? |
| Run by | An agent or a person, on demand | CI, on every push |
| Output | Evidence tied to a commit | Pass/fail that gates merge |
| Data | Live BIEL API | Should be hermetic, or it will be flaky |

Path: tag flows that have proven stable (`tags: [e2e]`) and run `maestro test --include-tags e2e` in CI.
Android can run on GitHub's Linux runners with an emulator action after the existing build; iOS needs
a macOS runner, or EAS Workflows' built-in Maestro step. The decision to make first: the flows
currently depend on the live API's content (English, 2 John), so choose fixtures, a staging API, or
accepting that dependency before anything gates merges.

Expect harness flakes and design for them. During this review, every failed run was Maestro itself
(its on-device driver not starting in time, its iOS driver erroring, or a hung text input), never an
assertion about the app: the same flows passed on rerun. Locally that was made worse by a heavily
loaded laptop (endpoint security scanning every file write, both simulators running). A CI job
should give the driver a longer start-up timeout (`biel-verify` sets `MAESTRO_DRIVER_STARTUP_TIMEOUT`
to 180 s), warm the device up before the first flow, retry a failed flow once, and run Android and
iOS as separate jobs.

## 2. App fixes found by running it

Commit `a040719`; all three are on `main` too, not introduced by #4 or #5.

- **"?" at the end of the volume bar on iOS.** `icon-symbol.tsx` used the Material icon set on iOS
  but passed it the SF Symbol name `speaker.wave.3.fill`. It now uses the Material name.
- **Dragging the volume slider navigated back on iOS.** iOS 26 can start swipe-back anywhere on screen,
  not just the edge. `read.tsx` disables swipe-back while the audio player is open (and on the
  audio-only screen). Android is unaffected: its edge swipe is the system gesture.
- **Volume bar didn't look draggable.** Added a thumb (`volume-slider.tsx`).

## 3. Tooling

**Lint was broken on #4, and #5 fixed it.** On #4, `pnpm lint` (`expo lint`) crashed because
`eslint.config.js` required `eslint-config-expo`, which was never installed. #5 installed ESLint and
added layer-boundary rules (`no-restricted-imports` per folder, `import/no-cycle`), so on #5 ESLint
works: 0 errors, 16 warnings.

- **oxlint replaces ESLint: optional** (`b8948d8`). Proposed for speed and to follow Expo's own
  direction (Expo moved its monorepo packages to oxlint in expo/expo#47096), not to fix anything.
  Drop the commit to keep ESLint; nothing after it depends on it. It extends Expo's
  `oxlint-config-universe/native` preset, adds back what `eslint-config-expo` had (the three
  `eslint-plugin-expo` rules through oxlint's alpha JS-plugin API, so versions are pinned;
  `exhaustive-deps`; the React Compiler rules, since `app.json` enables the compiler), and **ports
  #5's boundary rules one-to-one**. Checked by planting 15 violations covering every boundary rule
  and an import cycle: ESLint with #5's config and oxlint with the port flagged the identical 15
  file:line findings. Baseline: 0 errors, 335 warnings (see section 5).
- **oxfmt as the formatter** (`45fafaf` config, `41ec62e` reformat). There was no formatter. The
  config matches the code's existing style (100 columns, single quotes) so the reformat is small,
  and covers code only (not Markdown, YAML, or the HTML test fixtures). The reformat is its own
  mechanical commit: skip it in review.
- **fallow for dead code and diff audits** (`f6da789`). `pnpm fallow dead-code` for the whole repo,
  `pnpm fallow audit --base main` for a branch's changes. Configured for Expo: config plugins are
  entries, and dependencies used without an import are listed with reasons.
- **mise.toml** pins JDK 17 and Node 24 to match CI. Without JDK 17, Gradle 9 tries to download one
  through an old plugin and crashes.

## 4. Dead code and dependencies

- **Dead code removed** (`891a807`). #5 already deleted most template leftovers; this removes the
  last one (`animated-icon.module.css`) and every function, constant and type with no references
  (about 30, e.g. `upsertBookCatalogEntry`, `loadDownloadedLanguages`, `isLanguageScriptureDownloaded`,
  `getDownloadTaskList`), plus barrel re-exports nobody imports. #5's convention of importing
  features through their index is kept. Behavior is unchanged: nothing removed was reachable from a
  route, the entry file, a config plugin, or a test. `fallow health` went from 50 (D) on #4 to 75 (B).
- **Dependencies** (`6d06c35`): added `@expo/vector-icons` (imported everywhere but only present by
  accident; this also made `tsc` clean). Removed five unused packages, three of them native
  (`expo-device`, `expo-image`, `expo-web-browser`), so existing dev builds need a rebuild. Kept
  four that are used without an import (`expo-dev-client`, `expo-system-ui`, `expo-glass-effect`,
  `react-native-web`).

## 5. Findings left for the author (not changed here)

Behavior and docs:
- `docs/offline-mode.md` says the book card's checkmark reflects text only; the rule
  (`isFullyDownloaded` in `src/domain/downloads.ts`) requires text **and** audio when a book has audio.
- An offline cold start shows a black screen for about 20 seconds before Home.
- Downloads Library opens on the Old Testament tab and says "No downloads yet" when downloads exist
  under the New Testament. The same message is used for an empty filter result.
- The library groups downloads under the language code ("en") instead of its name.
- Offline, a book with nothing downloaded expands to an empty card with no explanation.
- The offline banner covers the top bar's back arrow and Menu, and sometimes reappears after
  being dismissed (happens with or without this branch).

Accessibility:
- Two labels each belong to two controls: "Close menu" (drawer backdrop and ✕) and "Cancel" (dialog
  backdrop and button). Screen readers announce duplicate controls.
- On iOS the library filter options read as ", , Both" / ", Audio Only" (empty icon labels).

Build and config:
- `app.json` has no `ios.bundleIdentifier`. `expo prebuild` infers one and writes it back into
  `app.json`, along with a duplicate `"audio"` background mode. Commit the bundle ID.
- With Xcode 27, iOS builds fail unless the deployment target is raised to 16
  (`IPHONEOS_DEPLOYMENT_TARGET=16.0`). Teammates on Xcode 26 won't see it yet.

Code (from oxlint and fallow):
- React Compiler and hooks warnings (oxlint): 27 `set-state-in-effect`, 11 `exhaustive-deps`,
  8 `refs`, 2 `immutability`, 1 `preserve-manual-memoization`. Code the compiler can't optimize, or
  effects that cause extra renders. ESLint on #5 doesn't report these: eslint-config-expo 55 doesn't
  enable the compiler rules.
- 277 `curly` warnings: the preset wants braces on one-line `if`s; the code doesn't use them.
  A team style decision (`oxlint --fix` applies it).
- Duplicate export names: `DownloadProgressCallback` (`features/downloads/offline-audio.ts` and
  `offline-scripture.ts`) and `useColorScheme` (`contexts/appearance-context.tsx` and
  `hooks/use-color-scheme.web.ts`).
- Biggest risk areas by `fallow health`: `ReadingScreen` in `read.tsx` (516 lines) and
  `useContentDownload` (345 lines). The iOS audio bugs above were in the reader.
- A dev-mode React warning: "Can't perform a React state update on a component that hasn't
  mounted yet."

## 6. Product suggestions (out of scope here)

- Change book or chapter from inside the reader, without navigating back.
- Let the audio player collapse to just the play button.
- Reopen the app where the user left off. Today only the audio notification resumes, and only
  while audio is playing.

## Verification status

On this branch stacked on #5 (`41ec62e`–`f9a73c9`; the commits between only touch the verify helper):

- `tsc --noEmit` clean; vitest 11 files / 75 tests pass; oxlint 0 errors; `pnpm format:check` clean;
  `fallow dead-code` reports only the two duplicate export names above.
- verify-biel. JS from a cleared Metro cache; native builds identical to the ones verified on #4
  (same runtime dependencies, `app.json` and config plugin):

| Flow | Android (API 33 emulator) | iOS (iPhone 17 Pro, iOS 26.2 sim) |
|---|---|---|
| browse-languages | pass | pass |
| browse-books | **not verified** (harness) | pass |
| read-chapter | **not verified** (harness) | pass |
| chapter-audio | pass | pass |
| audio-panel-gestures | pass | pass |
| download-book (+ file and DB rows checked) | pass | pass |
| offline-read | **partial**: 2 John read with airplane mode on (screenshot); hung before the 3 John control | pass (Force Offline Mode) |
| downloads-library (+ delete leaves no files) | pass | pass |

The Android gaps are environment, not app: Maestro's driver timed out or hung before touching the
app, and the local emulator then stopped booting (load ~35 on 10 cores; graphics initialization hang).
`chapter-audio` and `download-book` on Android walk the same browse path (Home, English, New
Testament, 2 John, chapter 1) and passed. On #4 every flow passed on both platforms.

Rerun with `pnpm verify launch android|ios` and the flow order in
`.agents/skills/verify-biel/SKILL.md`.
