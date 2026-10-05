# BIEL verification map

The maintained source for verifying BIEL's user-facing behavior. Read this index before driving the app,
then use the matching feature file as the recipe. Drive with `biel-verify` (`bv`); see `../SKILL.md`.

## Verification ledger

Each row is a claim about one commit. Re-verify and update the row (do not add a parallel one) when the app changes.

| Feature | Flow | Android | iOS |
|---|---|---|---|
| [Browse languages](./browse-languages.md) | `browse-languages` | ✅ `eebc86c` 2026-10-05 | ✅ `eebc86c` 2026-10-05 |
| [Browse books](./browse-books.md) | `browse-books` | ✅ `eebc86c` 2026-10-05 | ✅ `eebc86c` 2026-10-05 |
| [Read a chapter](./read-chapter.md) | `read-chapter` | ✅ `eebc86c` 2026-10-05 | ✅ `eebc86c` 2026-10-05 |
| [Chapter audio](./chapter-audio.md) | `chapter-audio` | ✅ `eebc86c` 2026-10-05 | ✅ `eebc86c` 2026-10-05 |
| [Download a book](./downloads.md) | `download-book`, `downloads-library` | ✅ `eebc86c` 2026-10-05 | ✅ `eebc86c` 2026-10-05 |
| [Read offline](./offline-read.md) | `offline-read`, `offline-read-forced` | ✅ `eebc86c` 2026-10-05 (airplane mode) | ✅ `eebc86c` 2026-10-05 (Force Offline Mode, simulated) |

Platforms: Android = Pixel_8_Pro_API_33 (API 33) emulator; iOS = iPhone 17 Pro, iOS 26.2 simulator, built with Xcode 27.
Evidence for a row lives at `.verify/evidence/<sha>/<flow>/` on the machine that ran it.

## Baseline preconditions

- `bv launch <platform>` printed `Ready`, and `bv doctor` says `healthy` for the SHA under test.
- Network on (`bv net on`) unless the recipe says otherwise. The live BIEL API is reachable.
- Fixture language **English** (`en`, text + audio); fixture book **2 John** (`2JN`, 1 chapter).
- Download-dependent recipes start from `bv reset` (no downloads), then build state in the order given in `../SKILL.md`.
- Never drive an instance this run did not launch.

## Driving conventions

- Select by visible text or accessibility label from `src/locales/en.json`. Treat quoted handles as literal (regex where shown, e.g. `"Chapter 1.*"`).
- Several labels are **shared** by two elements: `Close menu` (drawer backdrop + ✕), `Cancel` (dialog backdrop + button), `English`
  (interface-language button + language name). Use the more specific handle given in each recipe.
- Wait for content, not time: `extendedWaitUntil` on the text you expect. Add `waitForAnimationToEnd` after opening a popover.
- Restore state after mutations (delete what you downloaded, `bv net on`). Never delete evidence.

## Proof and skip reporting

- UI proof = named screenshot(s) from the flow + the PASS line with its evidence path.
- Mutation proof = `bv files` and `bv db` output before and after, next to the UI proof.
- Offline proof states which mechanism was used: `bv net off` (real) or Force Offline Mode (in-app, in-memory).
- Record the feature, entry point, platform and SHA with every artifact (the evidence path already encodes SHA + platform).
- An unreachable path is reported with the attempted command and the unmet precondition, never as verified through another path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph of user-visible behavior, then exactly four H2s, in order:
`Sub-features`, `How to get to it (user POV)`, `Driving it with biel-verify`, `Gotchas`. Keep implementation details out;
name user paths, stable handles, required state, commands, and observable proof.

## Not yet mapped

Real user surfaces with no recipe yet (sources cited so the next pass can add them):

- System settings: theme Automatic/Light/Dark, Force Offline Mode. `src/components/home/system-settings-menu.tsx`
- Interface language picker (10 locales). `src/components/locale/locale-popover.tsx`
- Whole-language download from the Home card (text and audio). `src/components/home/language-card-row.tsx`
- Single-chapter download from the reader Menu → Download. `src/components/reading/chapter-download-menu.tsx`
- Audio-only languages/chapters. `src/components/reading/audio-only-chapter-screen.tsx`
- Download progress notifications. `src/services/download-notification-service.ts`
- Resume playback from the media notification (deep link `trackplayer://notification.click`). `src/app/+native-intent.tsx`
