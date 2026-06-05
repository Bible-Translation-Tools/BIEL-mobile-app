# Android release builds on Windows

How this project avoids CMake path-length failures when building native modules with pnpm on Windows.

## Problem

Release builds (`assembleRelease`) compile C++ code for libraries such as `react-native-gesture-handler`, `react-native-reanimated`, and `react-native-worklets`.

On Windows, pnpm resolves packages under long paths like:

```
node_modules/.pnpm/react-native-gesture-handler@…/node_modules/react-native-gesture-handler/android/.cxx/…
```

That path can exceed **CMake’s 250-character object-path limit** (`CMAKE_OBJECT_PATH_MAX`), even when Windows long-path support is enabled. The build then fails with errors such as:

```
has 261 characters. The maximum full path to an object file is 250
lld: error: unknown argument: -z
```

Enabling Windows long paths fixes the OS `MAX_PATH` limit; it does **not** remove CMake’s separate 250-character limit.

## Fix

Native CMake output is redirected to a short path under the Android project:

```
android/build/cxx/<module-name>/
```

This is applied by `scripts/patch-android-cxx-paths.js`, which adds `buildStagingDirectory` to the module-level `externalNativeBuild.cmake` blocks for:

- `react-native-gesture-handler`
- `react-native-reanimated`
- `react-native-worklets`
- `react-native-screens`

The script runs automatically after every `pnpm install` via the `postinstall` script in `package.json`.

### Related configuration

**`.npmrc`** — hoists dependencies and avoids symlinks into `.pnpm` where possible:

```
node-linker=hoisted
symlink=false
```

**`package.json`** — `@expo/config-plugins` is listed under `devDependencies` so the custom config plugin in `plugins/withTrackPlayerService.js` resolves correctly with a hoisted layout.

## Building a release APK

From the project root:

```cmd
pnpm install

cd android
set NODE_ENV=production
gradlew.bat clean assembleRelease
```

Output APK:

```
android\app\build\outputs\apk\release\app-release.apk
```

## After adding a native dependency

If you add a library that uses CMake via `externalNativeBuild`, check whether its `android/build.gradle` needs the same treatment. If `assembleRelease` fails with the path-length or `lld: unknown argument: -z` errors for that package, add its npm name to the `NATIVE_PACKAGES` array in `scripts/patch-android-cxx-paths.js`, then run:

```cmd
pnpm install
```

## Troubleshooting

| Symptom | What to try |
|--------|-------------|
| Path-length / `lld: -z` errors return after `pnpm install` | Confirm `postinstall` ran: `node scripts/patch-android-cxx-paths.js` |
| Stale native build artifacts | Delete `android/build/cxx`, `android/.gradle`, and `android/app/.cxx`, then rebuild |
| `Cannot find module '@expo/config-plugins'` | Run `pnpm install` so devDependencies are present |
| `NODE_ENV` warning during bundle step | Set `NODE_ENV=production` before `gradlew.bat assembleRelease` |
