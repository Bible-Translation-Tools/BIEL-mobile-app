# BIEL Mobile App

Expo (SDK 55) app using [Expo Router](https://docs.expo.dev/router/introduction/) with routes in `src/app/`.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [Android platform tools](https://developer.android.com/tools/releases/platform-tools) (`adb` on your PATH)
- [Expo Go](https://expo.dev/go) on your Android device (for development without a custom dev build)

## Install dependencies

```bash
pnpm install
```

## Run on Android (USB device)

Use this flow when your phone is connected over USB and you develop with **Expo Go**.

### 1. Connect the device and forward Metro’s port

```bash
adb devices
adb reverse tcp:8081 tcp:8081
```

`adb reverse` lets the phone reach Metro on your PC at `127.0.0.1:8081`. Run it again after unplugging the device or rebooting the phone.

Verify the forward is active:

```bash
adb reverse --list
```

You should see `tcp:8081 tcp:8081`.

### 2. Start Metro and open the app on Android

```bash
pnpm start --android --localhost
```

**Use `--localhost`** for USB development. The terminal should show a URL like `exp://127.0.0.1:8081`, not a LAN address such as `exp://192.168.x.x:8081`.

### 3. Wait for the first bundle

The first Android bundle often takes **20–35 seconds**. Expo Go shows a spinner until Metro logs something like:

```text
Android Bundled ... node_modules/expo-router/entry.js
```

Later reloads are much faster. This is normal, not necessarily a hang.

### 4. Reload after code changes

- Shake the device → **Reload**, or
- Press `r` in the Metro terminal

