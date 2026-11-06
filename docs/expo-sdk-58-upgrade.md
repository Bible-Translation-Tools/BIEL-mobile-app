# Expo SDK 58 upgrade runbook

Why: SDK 58 (React Native 0.88) is the first SDK built for **iOS 27**. App Store uploads will require the latest SDKs from April 2027.

Where we start: **SDK 55 / React Native 0.83.6**. Expo recommends upgrading **one SDK at a time**, so the path is 55 → 56 → 57 → 58. Land and verify each step before starting the next.

Sources: [SDK 58 changelog](https://expo.dev/changelog/sdk-58), [upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [Router SDK 57 → 58 migration](https://docs.expo.dev/router/migrate/sdk-57-to-58/). Read each intermediate SDK's changelog too (56, 57); this runbook only lists what was known when it was written.

## Already done (prep on SDK 55)

| Item | Change |
|------|--------|
| `expo-file-system`: `File.write()` becomes async in SDK 58 | `writeFileAtomically()` (`src/api/offline-storage.ts`) is async and awaits the write, and every caller awaits it. Without this, the `.tmp` → target move would race the write and corrupt downloads. |
| `react-native-track-player` risk | All player calls go through `src/services/playback-engine/`. Lint (`no-restricted-imports`) blocks direct imports anywhere else. If the library breaks on a new RN, the fix or the replacement (for example `expo-audio`) is confined to that folder. |

## Step log

### SDK 56 — `expo@56.0.24` (React Native 0.85.3, React 19.2.3, TypeScript 6.0.3)

Source: [SDK 56 changelog](https://expo.dev/changelog/sdk-56), [Router SDK 55 → 56 migration](https://docs.expo.dev/router/migrate/sdk-55-to-56/).

| Change in SDK 56 | What we did |
|------------------|-------------|
| Expo Router no longer supports `@react-navigation/*` imports in app code | `src/app/_layout.tsx` (themes, `ThemeProvider`) and `src/app/index.tsx` (navigation types) import from `expo-router/react-navigation`; removed the `@react-navigation/native` dependency |
| `expo-file-system`: `File.move()` / `copy()` are async | `writeFileAtomically()` now awaits `move()` too (no other `move`/`copy` calls) |
| RN 0.85 removed `StyleSheet.absoluteFillObject` | Spread `StyleSheet.absoluteFill` instead (6 places) |
| `@expo/dom-webview` (optional peer of `expo`) stayed at 55.x in the lockfile | Added it as a direct dependency at the SDK version (`expo install @expo/dom-webview`) |
| `expo install --fix` added the `expo-font` config plugin to `app.json` | Kept |
| expo-doctor: `react-native-track-player` "Unsupported on New Architecture" (React Native Directory) | Excluded in `package.json` → `expo.doctor.reactNativeDirectoryCheck.exclude`; the risk is tracked in the checklist below |
| **Known regression:** Hermes V1 (default from SDK 56) leaks memory with Reanimated/Worklets; expo-doctor flags it | Not worked around. Fixed in SDK 57 (`expo@57.0.9`+, RN 0.86.2+). **Don't ship a release from SDK 56**; go on to 57 |
| `expo/fetch` replaces `globalThis.fetch` | No code change; verify downloads and streaming audio on device (opt-out: `EXPO_PUBLIC_USE_RN_FETCH=1`) |
| Minimum Xcode 26.4, iOS deployment target 16.4, Node ≥ 20.19.4 | Nothing to change here (Node 24) |

### SDK 57: `expo@57.0.32` (React Native 0.86.3, React 19.2.3)

Source: [SDK 57 changelog](https://expo.dev/changelog/sdk-57). React Native 0.86 is meant to have no breaking changes from 0.85, and this step needed no app code changes.

| Change in SDK 57 | What we did |
|------------------|-------------|
| Hermes V1 memory regression fixed in `expo@57.0.9` (and the dev startup slowdown in `57.0.17`) | On 57.0.32; expo-doctor passes all checks |
| Reanimated 4.3 → 4.5, Worklets 0.8 → 0.10, Gesture Handler 2.31 → 2.32 | Taken from `expo install --fix` |
| `expo install --fix` added the `expo-status-bar` config plugin to `app.json` | Kept |
| `expo prebuild` now cleans and regenerates `android/` / `ios/` by default (`--no-clean` to opt out) | No impact: both folders are generated (CNG) |
| iOS 27 scene lifecycle is opt-in on SDK 57 (`expo-build-properties` → `ios.enableSceneSupport`, from `57.0.23`) | Not enabled; it becomes the default in SDK 58 |

## Each SDK step

Do each step on its own branch and PR (for example `chore/expo-sdk-56`), cut from `main` after the previous step has merged.

1. Read that SDK's changelog (`https://expo.dev/changelog/sdk-5X`) and add anything relevant to the checklist below.
2. `pnpm add expo@^5X.0.0` (X = 6, 7, 8)
3. `pnpm exec expo install --fix`, then `pnpm exec expo-doctor`. pnpm holds back packages published too recently (`minimumReleaseAgeExclude` in `pnpm-workspace.yaml` is how exceptions are made). If install refuses a fresh patch release, add that exact `name@version` there instead of pinning an older one by hand.
4. Delete `android/` (CNG, gitignored) and regenerate with `pnpm exec expo prebuild --platform android`. On a Mac, do the same for `ios/`.
5. Work through the checklist below.
6. Run **Verification** (bottom).

## Checklist

### react-native-track-player 4.1.2 (highest risk)

- [ ] `pnpm install` still applies `patches/react-native-track-player@4.1.2.patch`. The patch wraps `MusicModule.kt` `@ReactMethod`s so they return `Unit`, which the New Architecture interop requires.
- [ ] Android compiles with the new Kotlin / AGP / Gradle. If it doesn't, extend the patch (`pnpm patch react-native-track-player@4.1.2`).
- [ ] **SDK 58:** R8 minification is **on by default** for Android release builds. Build a **release** APK and check playback, the notification and the lock screen. If the player or its service is stripped, add keep rules via `expo-build-properties`, or set `android.enableMinifyInReleaseBuilds` to `false` as a stopgap.
- [ ] If the library can't be kept working, replace it inside `src/services/playback-engine/` only. The adapter's API is the contract: `setupPlaybackEngine`, `registerPlaybackEngineService`, `loadTrack`, `play`, `pause`, `reset`, `seekTo`, `updateNowPlaying`, `getPlaybackStatus`, `getProgress`, `useIsPlaying`, `useEngineProgress`, `useOnQueueEnded`, `isEngineNotificationClick`. Also replace `plugins/withTrackPlayerService.js` (Android foreground service type) and the notification deep link handled in `src/app/+native-intent.tsx`.

### Other native dependencies

- [ ] `react-native-volume-manager` 2.0.8: confirm it loads on the New Architecture (volume slider follows hardware buttons). It's isolated in `src/services/system-audio-volume.ts`, which already catches failures.
- [ ] `react-native-reanimated` / `react-native-worklets` / `gesture-handler` / `screens` / `svg` / `safe-area-context` / `react-native-web`: let `expo install --fix` choose the versions. Don't pin by hand.
- [ ] `scripts/patch-android-cxx-paths.js` (Windows CMake path length): check that its package list still covers every module with a `CMakeLists.txt`, and that it still finds the `externalNativeBuild` blocks it rewrites.

### Expo packages (SDK 58 notes)

- [ ] **expo-router:** the navigation core was rewritten (deterministic keys, deferred dispatch, much of the forked react-navigation API removed). Follow the migration guide. Re-check the direct `@react-navigation/native` imports (`ThemeProvider`/themes in `src/app/_layout.tsx`, navigation types in `src/app/index.tsx`) and whether the `@react-navigation/native` dependency is still needed or at the right version.
- [ ] **expo-notifications:** foreground notifications are now shown by default. `src/features/downloads/notifications.ts` already sets `shouldShowBanner` / `shouldShowList` explicitly. Check that progress notifications still don't pop banners.
- [ ] **expo-localization:** on iOS, RTL layout now follows `I18nManager` and is no longer forced from the device locale. Check RTL content languages, if any are offered.
- [ ] **expo-sqlite:** libSQL removed. Not used here, so nothing to do.
- [ ] **expo-symbols:** now an optional peer dependency. It stays a direct dependency here, so check it still resolves.
- [ ] **NODE_ENV:** Expo CLI now sets it from the command. CI exports `NODE_ENV=production` (`.github/workflows/android.yml`). Confirm the prebuild still behaves as before.
- [ ] **TypeScript:** RN's strict TypeScript API is the default. Fix new type errors (`pnpm exec tsc --noEmit`). The `customConditions` opt-out is temporary; avoid it.
- [ ] **RN API removals** (`InteractionManager`, `Touchable` root export, `Modal` `animated` prop): run `rg "InteractionManager|Touchable[^A-Z]|animated=" src`. `src/utils/yield-to-ui.ts` already avoids `InteractionManager`.

### Toolchain and CI

- [ ] `.github/workflows/android.yml`: update `platforms;android-*`, `build-tools;*`, `ndk;*` and the version comments to match `./gradlew :app:properties` after prebuild. Also update the `compileSdkVersion` / `targetSdkVersion` / `buildToolsVersion` greps.
- [ ] Java / Node: update `mise.toml` and the workflow if the new RN Gradle plugin requests a different JDK toolchain.
- [ ] `eslint-plugin-expo` (loaded by oxlint as a JS plugin): bump it if a newer version targets the new SDK.

### iOS 27 (needs a Mac with Xcode 27)

- [ ] Prebuild generates `SceneDelegate.swift` and a `UIApplicationSceneManifest` (scene-based lifecycle). There's no custom `AppDelegate`, so this should need no code changes.
- [ ] iPhone apps become resizable on iOS 27. The app is portrait-only (`app.json`), so check layout at odd sizes and that nothing relies on fixed screen dimensions.
- [ ] Background audio (`UIBackgroundModes: audio`), lock screen controls, now-playing title updates per verse, and the notification tap reopening the reader.
- [ ] `expo-glass-effect` and `expo-symbols` render correctly.
- [ ] Xcode 27 replaces Simulator.app with Device Hub. The `verify-biel` helper already builds with `xcodebuild` + `simctl` for this; plain `expo run:ios` may fail to find the Simulator app.

## Verification (every step)

### Automated checks

- `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm exec expo-doctor`
- Check the player library is only imported by the adapter: `rg "react-native-track-player" src index.js` → only `src/services/playback-engine/`.
- Not `pnpm format:check` yet. It already fails on `main`, because Windows checkouts (`core.autocrlf=true`, no `.gitattributes`) give every file CRLF line endings and oxfmt flags all of them. Add it back once a `.gitattributes` with `* text=auto eol=lf` has landed and the tree is renormalized.

### Before testing on a device

- **API up?** Startup waits on the BIEL catalog with no timeout, so an API outage looks like a splash-screen hang, not an upgrade bug. Check first:
  `curl -s -m 15 -X POST -H "content-type: application/json" -H "User-Agent: Mozilla/5.0" -d '{"query":"{__typename}"}' https://api.bibleineverylanguage.org/v1/graphql` → `{"data":{"__typename":"query_root"}}`
- **Build on a physical Android phone** with `pnpm android`. The `verify-biel` helper only drives emulators, so phone checks are manual (below). Gradle needs JDK 17 (`mise.toml` pins it; without mise, point `JAVA_HOME` at a JDK 17, not a newer default `java`). Don't set `CI=1`: it disables Metro's watch mode.
- **Start on Home.** The app reopens the last reader/Books route on relaunch. Press Back to Home before testing.

### Manual checks on the phone (debug build, and from SDK 58 also release)

Release build on Windows: see [android-windows-build.md](./android-windows-build.md) (`gradlew.bat clean assembleRelease` with `NODE_ENV=production`). Then `adb install -r android/app/build/outputs/apk/release/app-release.apk`.

| Area | Do | Expect |
|------|----|--------|
| Startup | Cold start the app | Home ("Browse the Bible") within a few seconds |
| Browse | Open English, search `2 John`, expand it | `Chapter 1` listed |
| Reader audio | Chapter 1 → open the audio player → Play | Audio plays; title shows `2 John 1:1` |
| Verse stepping | Next verse, then Previous verse | `1:2`, then back to `1:1` |
| Chapter boundary | In a multi-chapter book, step past the last verse and before the first verse | Loads the next/previous chapter and keeps playing |
| Autoplay | Let a chapter end | The next chapter starts on its own |
| Notification | Pull down the shade while playing: play/pause/stop; watch the title | Controls work; title follows the verse |
| Notification tap | Tap the notification | Reader opens at the **playing** chapter with the panel open; audio keeps going |
| Lock screen | Lock the phone while playing | Same controls on the lock screen |
| Lifecycle | Back to the book list; background the app outside the reader; swipe it from recents | Playback stops; the notification goes away |
| Volume | Use hardware volume keys with the panel open | The in-app slider follows (`react-native-volume-manager`) |
| Downloads | Download chapter audio and a whole book's text (2 John is small) | Download completes, book shows as downloaded |
| Offline | Airplane mode → reopen, read and play the downloaded chapter | Text and audio load from disk |
| No temp files | `adb shell run-as org.bibletranslationtools.biel find files/biel-offline -type f` | `.mp3` / `.cue` / `.html` / `whole.json`, no `*.tmp` |
| Download notifications | Watch while downloading | Progress shows in the shade only, no banner pop-ups |

If something fails, collect the Metro output and `adb logcat -d -s ReactNativeJS AndroidRuntime` before changing code.

### iOS 27 (SDK 58 step only; needs a Mac with Xcode 27)

Run the same table on an iOS 27 simulator (or device), plus the **iOS 27** checklist items above. On a Mac the `verify-biel` helper does work (`bv launch ios`), including its Xcode 27 / Device Hub handling.
