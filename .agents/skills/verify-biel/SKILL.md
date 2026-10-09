---
name: verify-biel
description: Launch and drive the BIEL Expo mobile app (Android emulator, iOS simulator) the way a user does — browse languages/books, read, play chapter audio, download, read offline, manage the Downloads Library — and capture SHA-stamped evidence (screenshots, view hierarchy, SQLite rows, on-device files). Use to prove a change works in the real app, to review a PR by running it, or when asked to run/screenshot/verify BIEL.
---

# verify-biel

Scripted, repeatable proof that BIEL works on a device. Everything goes through one helper,
`.agents/skills/verify-biel/bin/biel-verify` (below: `bv`), and Maestro flows in `flows/`.
The feature map in `features/` is the source of truth for *what* to verify; this file is *how*.

From the repo root, `pnpm verify <command>` is the same thing (e.g. `pnpm verify launch ios`). In a shell or agent
session, a short alias avoids pnpm's banner:

```bash
bv() { "$(git rev-parse --show-toplevel)/.agents/skills/verify-biel/bin/biel-verify" "$@"; }
```

## Prerequisites (one-time per machine)

- `mise install` in the repo — `mise.toml` pins **JDK 17** + Node 24 (matches CI). The helper loads it itself.
  Without JDK 17, Gradle 9 tries to auto-download one via foojay 0.5.0 and dies with
  `JvmVendorSpec does not have member field IBM_SEMERU`.
- `pnpm install`.
- Maestro CLI at `~/.maestro/bin/maestro` (`curl -fsSL https://get.maestro.mobile.dev | bash`).
- Android: SDK at `~/Library/Android/sdk`, AVD `Pixel_8_Pro_API_33` (override: `BIEL_AVD`), emulator ≥ 37
  (older emulators render the guest at ¼ size in the window on recent macOS; screenshots are unaffected).
- iOS: Xcode with license accepted (`sudo xcodebuild -license accept`) and an iOS simulator runtime; the helper picks
  `iPhone 17 Pro` on the newest installed runtime (override: `BIEL_SIM=<name|UDID>`). Xcode 27 notes, all handled by the helper:
  Simulator.app is now `Xcode.app/Contents/Applications/DeviceHub.app`, so `expo run:ios` fails ("Can't determine id of Simulator
  app") and the helper builds with `xcodebuild` + `simctl install`; Xcode 27 rejects some pods' deployment targets, so it builds with
  `IPHONEOS_DEPLOYMENT_TARGET=16.0` (verification-only override, no files changed); `expo prebuild` writes `ios.bundleIdentifier`
  and a duplicate `"audio"` background mode into `app.json`, which the helper reverts.

## Launch

```bash
bv launch android        # or: bv launch ios
```

Boots the emulator/simulator if none is running, builds + installs the dev client if missing
(first build ≈ 15 min: Gradle, NDK 27.1 download), starts Metro on :8081 (`BIEL_METRO_PORT`),
opens the app through the dev-client deep link, and waits for Home. **Ready** = it prints
`Ready: <platform> @ <sha> (<clean|dirty>)`; on failure it names the Maestro log to read.

The helper makes launches deterministic: it pre-grants notification permission, skips the
dev-menu onboarding sheet (`_ready` also confirms iOS's "Open in BIEL?" deep-link prompt), and hides Expo's floating dev **Tools** button (it covers the app's `Menu`
button). JS comes from Metro in watch mode, so source edits reach the app on its next load (every flow relaunches it)
without rebuilding. If the app still runs code older than the source, restart Metro with a clean cache:
`bv cleanup && BIEL_METRO_CLEAR=1 bv launch <platform>`. Native
changes (app.json, plugins, native deps) need `pnpm exec expo run:android|ios` again.

Both platforms can run at once against the same Metro. `bv flow <name> <platform>` targets one explicitly; `snapshot`, `db`,
`files`, `reset` and `doctor` (with no argument) use the platform of the most recent `bv launch` (`.verify/run/platform`).

Isolation: one Metro per port and one app instance per device. `bv launch` refuses a Metro on the port
that it did not start. Do not drive an emulator someone else is using.

## Doctor

```bash
bv doctor
```

Read-only. Checks JDK 17, Maestro, device booted, dev build installed, `adb reverse`, Metro answering,
Metro started by this run, and Metro serving *this* checkout. Prints the SHA and whether `src/`,
`app.json` or `package.json` are dirty. Run it before the first drive, after anything surprising,
and after any failed flow. If it prints `UNHEALTHY`, fix the ✗ lines (usually `bv launch`) before driving.

## Drive

```bash
bv flow <feature-flow> [android|ios]   # runs flows/<name>.yaml, prints PASS/FAIL + evidence dir
bv snapshot <label>                    # screenshot + Maestro view hierarchy (JSON) of the current screen
bv db "<sql>"                          # read-only query on a copy of the app's SQLite DB (biel-offline.db)
bv files                               # list offline content under Documents/biel-offline (bytes, path)
bv net off|on                          # Android airplane mode — a REAL network cut (Metro still works via adb reverse)
bv reset                               # wipe app data (DB, downloads, prefs) and relaunch to Home
```

Flows select by **visible text or accessibility label** (on Android, Maestro's plain-text selector
also matches `contentDescription`). Stable handles come from `src/locales/en.json`, e.g.
`"Open English"`, `"Expand 2 John"`, `"Chapter 1.*"`, `"Download All Text"`, `"Delete downloaded All Text"`,
`"Force Offline Mode"`, `"Menu"`. The app has no `testID`s. Ad-hoc exploration: write a scratch flow
and run `maestro test`, then `bv snapshot` to see what the screen exposes.

Fixtures: **English (`en`)**, which has text and audio, and **2 John (`2JN`)**, one chapter, 3.8 KB text
and 1.8 MB audio. Use **3 John** as the "not downloaded" control. The app needs the live BIEL API
(`api.bibleineverylanguage.org`) for any online step.

Recommended order for a full pass (each step's preconditions come from the one before):

```bash
bv reset
bv flow browse-languages && bv flow browse-books && bv flow read-chapter && bv flow reader-checkpoint && bv flow chapter-audio && bv flow audio-panel-gestures
bv flow download-book && bv files && bv db "select language_code,book_slug,byte_size,content_hash from books"
bv net off && bv flow offline-read; bv net on          # iOS: bv flow offline-read-forced ios
bv flow downloads-library && bv files && bv db "select count(*) from books"
```

## Evidence

Everything lands in `.verify/evidence/<short-sha>/` (git-ignored), so proof is tied to the commit it ran against:

- `<feature>/<timestamp>-<platform>/`: `maestro.log`, `report.xml` (JUnit), `takeScreenshot/NN-*.png`
  (named proof shots), `screenshots/step-*.png` (Maestro's automatic shot on failure), `debug/`.
- `snapshots/<timestamp>-<platform>-<label>.png` + `.hierarchy.json`.

Proof standards:

- Drive the real user path (taps on visible controls). `bv reset`, `bv net` and deep-link launch are setup, not proof.
- Capture the action **and** the resulting state. A flow that ends on a spinner is not a pass. Assert content
  (e.g. `".*From the elder to the chosen lady.*"`), not just a title that also appears elsewhere.
- Prove side effects alongside the UI. Downloads and deletes need `bv files` + `bv db` output
  before and after; paste it into the report next to the evidence path.
- Offline claims are proven with `bv net off` (real airplane mode) on Android. Force Offline Mode
  (Menu → System Settings, flow `offline-read-forced`) is in-memory only and resets on relaunch. Use it on iOS, and say which one you used.
- Report every feature-map entry point you could not reach, with the command tried and the unmet precondition.
  Do not report a skipped path as verified through a different one.

## Cleanup

```bash
bv cleanup
```

Stops the Metro this run started, turns airplane mode off, shuts down an emulator/simulator **only if
`bv launch` booted it**, and removes scratch DB copies. It never deletes `.verify/evidence/`, and prints
its path. App data stays on the device; `bv reset` clears it. Never `pkill` by process name. Kill what
`.verify/run/*.pid` says you started.

## Files

- `bin/biel-verify`: the helper. `bv` with no args prints usage.
- `flows/*.yaml`: one per feature. `_`-prefixed flows are building blocks (`_ready`, `_home`,
  `_open-english`, `_open-2john`).
- `features/`: the feature map (what to verify, user entry points, gotchas). Keep it honest when the app changes.
