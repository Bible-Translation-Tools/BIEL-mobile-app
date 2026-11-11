# Expo SDK 58 upgrade

SDK 58 (React Native 0.88) is the first SDK built for **iOS 27**, and App Store uploads will require the latest SDKs from April 2027. The app went from **SDK 55 / React Native 0.83.6** to **SDK 58 / React Native 0.88.1** one SDK at a time (55 → 56 → 57 → 58), as Expo recommends.

Sources: changelogs for [SDK 56](https://expo.dev/changelog/sdk-56), [57](https://expo.dev/changelog/sdk-57) and [58](https://expo.dev/changelog/sdk-58); Router migrations [55 → 56](https://docs.expo.dev/router/migrate/sdk-55-to-56/) and [57 → 58](https://docs.expo.dev/router/migrate/sdk-57-to-58/); the [upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## What changed

| SDK | Change | What we did |
|-----|--------|-------------|
| 56, 58 | `expo-file-system`: `File.move()` / `copy()` become async (56), `File.write()` too (58) | `writeFileAtomically()` (`src/api/offline-storage.ts`) awaits the write and the move, and every caller awaits it. Otherwise the `.tmp` → target move races the write and corrupts downloads |
| 56 | `react-native-track-player` 4.1.2 is flagged as unsupported on the New Architecture | All player calls go through `src/services/playback-engine/`, and lint (`no-restricted-imports`) blocks direct imports elsewhere, so a fix or replacement stays in that folder. Excluded from expo-doctor's check in `package.json` → `expo.doctor.reactNativeDirectoryCheck.exclude` |
| 56 | Expo Router drops `@react-navigation/*` imports in app code | Themes and navigation types come from `expo-router/react-navigation`; the `@react-navigation/native` dependency is removed |
| 56 | RN 0.85 removed `StyleSheet.absoluteFillObject` | Spread `StyleSheet.absoluteFill` (6 places) |
| 56 | `@expo/dom-webview` stayed at 55.x in the lockfile | Direct dependency at the SDK version |
| 56 | `expo/fetch` replaces `globalThis.fetch` | No code change (opt-out: `EXPO_PUBLIC_USE_RN_FETCH=1`) |
| 56, 57 | `expo install --fix` adds the `expo-font` and `expo-status-bar` config plugins | Kept in `app.json` |
| 57 | `expo prebuild` cleans and regenerates `android/` / `ios/` by default (`--no-clean` to opt out) | Both are generated (CNG). A clean iOS prebuild drops the signing team set in Xcode; set it again, or add `ios.appleTeamId` to `app.json` |
| 58 | RN's strict TypeScript API is the default | Migrated rather than using the `customConditions` opt-out: `HostInstance` / `TextInputInstance` refs, `ListViewToken`, `TextLayoutEvent`, `undefined` instead of `null` for list header/footer, `useColorScheme()` can return `null` |
| 58 | `StatusBar.setBackgroundColor` removed | Dropped from `reading-toolbar.tsx`; edge-to-edge already draws the toolbar behind the status bar |
| 58 | Gesture Handler 3.3 (major), Reanimated 4.7, Worklets 0.13; Reanimated and Worklets moved to `build.gradle.kts` | Versions from `expo install --fix`; the app doesn't import Gesture Handler directly. `scripts/patch-android-cxx-paths.js` handles both Gradle DSLs |
| 58 | Expo Router navigation core rewrite | None of the removed APIs are used; `index.tsx` keeps `navigation.addListener('transitionEnd')` |
| 58 | Foreground notifications shown by default | `notifications.ts` already sets `shouldShowBanner` / `shouldShowList` |
| 58 | iOS scene-based lifecycle | The template's `SceneDelegate` (subclass of `ExpoAppSceneDelegate`) and scene manifest replace `plugins/withSceneLifecycle.js`, which was removed (its AppDelegate regex no longer matches). `withPodsDeploymentTarget` stays |
| 58 | R8 minification on by default for Android release builds | Not changed. If the player or its service gets stripped, add keep rules through `expo-build-properties`, or set `android.enableMinifyInReleaseBuilds` to `false` |
| 58 | Node 22.13+ / 24.3+ / 26+; Android compileSdk 37, build-tools 37.0.0 (targetSdk 36, NDK unchanged) | CI and `mise.toml` use Node 24; CI installs and checks `platforms;android-37` / `build-tools;37.0.0` |
