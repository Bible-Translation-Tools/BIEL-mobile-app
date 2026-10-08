# Read offline

With no network, the app still starts, shows the cached language catalog and book lists, and reads any chapter
whose text was downloaded, from local storage. Undownloaded content is unavailable.

## Sub-features

- `off-boot` cold start without network reaches Home with the banner `You are in offline mode.` (`Dismiss`).
- `off-catalog` language list and book list come from the local catalog cache.
- `off-read` a downloaded book's chapter renders its verse text locally.
- `off-missing` a book with nothing downloaded expands to an empty card (no chapters, no message).

## How to get to it (user POV)

- Turn on airplane mode, open the app.
- Or, in-app: Menu → System Settings → `Force Offline Mode` (simulated; resets on relaunch).

## Driving it with biel-verify

Preconditions:

- `bv flow download-book` passed (2 John text on disk). Then `bv net off`; `bv net` prints `airplane-mode: 1`.

- **Offline boot.** Run `bv flow offline-read`. Home shows `You are in offline mode.` above the catalog (`01-home-offline.png`).
- **Cached catalog.** The flow dismisses the banner, opens `Open English` → `New Testament` → `Expand 2 John`; `Chapter 1.*` is listed (`02-2john-offline-chapters.png`).
- **Local read.** The flow taps `Chapter 1.*`; verse text `From the elder to the chosen lady…` renders with the network off (`03-2john-read-offline.png`).
- **Not downloaded.** The flow expands `3 John`; no chapter buttons appear (`04-3john-not-downloaded.png`).
- **Restore.** Run `bv net on` (cleanup also does this).
- **iOS / simulated.** Run `bv flow offline-read-forced ios` instead (same precondition, network left on). It opens Menu → `System Settings` → `Force Offline Mode`, waits for `You are in offline mode.`, then repeats the local read and the 3 John control without relaunching.
- **Proof.** PASS line, `bv net` output showing `airplane-mode: 1` during the run, and the `bv files` listing showing the file the text came from.

## Gotchas

- Offline cold start shows a black screen for ~20 s before Home; `_ready` waits up to 120 s. Don't misread it as a crash.
- The offline banner overlaps the top bar (interface-language button and `Menu`) until dismissed.
- Force Offline Mode lives in memory. `bv reset`, `_home` (relaunch) or any app restart turns it off silently. Prefer `bv net off` on Android.
- `bv net off` does not break Metro (adb reverse), but it does break anything else that needs the network, including the language catalog on a fresh `bv reset`. Download fixtures before going offline.
- iOS simulators share the Mac's network. Use Force Offline Mode there and report it as simulated.
