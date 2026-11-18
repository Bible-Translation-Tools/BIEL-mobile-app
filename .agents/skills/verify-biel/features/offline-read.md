# Read offline

With no network, the app still starts, shows the cached language catalog and book lists, and reads any chapter
whose text was downloaded, from local storage. Undownloaded content is unavailable.

## Sub-features

- `off-boot` cold start without network reaches Home with the toast `You are in offline mode.` (`Dismiss`); it hides itself after 6 s.
- `off-catalog` language list and book list come from the local catalog cache.
- `off-read` a downloaded book's chapter renders its verse text locally.
- `off-missing` a book with nothing downloaded expands to an empty card (no chapters, no message).

## How to get to it (user POV)

- Turn on airplane mode, open the app.

## Driving it with biel-verify

Preconditions:

- `bv flow download-book` passed (2 John text on disk). Then `bv net off`; `bv net` prints `airplane-mode: 1`.

- **Offline boot.** Run `bv flow offline-read`. Home shows the `You are in offline mode.` toast at the bottom (`01-home-offline.png`).
- **Cached catalog.** The flow dismisses the toast if it is still up, opens `Open English`, searches `2 John` (search opens both testament groups) → `Expand 2 John`; `Chapter 1.*` is listed (`02-2john-offline-chapters.png`).
- **Local read.** The flow taps `Chapter 1.*`; verse text `From the elder to the chosen lady…` renders with the network off (`03-2john-read-offline.png`).
- **Not downloaded.** The flow expands `3 John`; no chapter buttons appear (`04-3john-not-downloaded.png`).
- **Restore.** Run `bv net on` (cleanup also does this).
- **iOS.** There is no way to take an iOS simulator offline from `bv` (simulators share the Mac's network). Report offline read as not verified on iOS.
- **Proof.** PASS line, `bv net` output showing `airplane-mode: 1` during the run, and the `bv files` listing showing the file the text came from.

## Gotchas

- Offline cold start shows a black screen for ~20 s before Home; `_ready` waits up to 120 s. Don't misread it as a crash.
- The offline toast floats at the bottom for 6 s, over the list or the reader's play button. Assert it right after launch; it is gone a few steps later.
- `bv net off` does not break Metro (adb reverse), but it does break anything else that needs the network, including the language catalog on a fresh `bv reset`. Download fixtures before going offline.
- iOS simulators share the Mac's network, so offline can only be proven on Android.
