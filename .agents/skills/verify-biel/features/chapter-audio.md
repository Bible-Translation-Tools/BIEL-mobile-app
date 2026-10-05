# Chapter audio

Chapters with audio show a mini player at the bottom of the reader. Play expands it into a panel with verse
skip, volume and close; the currently playing verse is highlighted in the text.

## Sub-features

- `audio-play` starts playback from the mini player (`Play` → `Pause`).
- `audio-verse-skip` moves to the next/previous verse (`Next verse` / `Previous verse`); the panel label changes to `<Book> <ch>:<verse>` and the verse highlight moves.
- `audio-pause` pauses (`Pause` → `Play`).
- `audio-close` closes the panel (`Close audio player`).
- `audio-volume` app volume slider (`Volume`). Not driven yet.
- `audio-offline` plays a downloaded chapter file before streaming. Not driven yet; needs `Download All Audio` (1.8 MB for 2 John).

## How to get to it (user POV)

- Reader for a chapter whose language has audio → tap ▶ in the bottom bar.

## Driving it with biel-verify

Preconditions:

- Baseline preconditions; network on (streams from the CDN).

- **Play.** Run `bv flow chapter-audio`. After tapping `Play`, `Pause` appears within 45 s and the panel shows `2 John 1:1` (`01-playing.png`).
- **Skip.** The flow taps `Next verse`; the label becomes `2 John 1:2` and verse 2 is highlighted (`02-after-next-verse.png`).
- **Pause.** The flow taps `Pause`; `Play` is visible again (`03-paused.png`).
- **Close.** The flow taps `Close audio player`.
- **Proof.** PASS line; `02-after-next-verse.png` shows the highlight on verse 2. For real sound, check `adb shell dumpsys media_session` shows state PLAYING while `01` is on screen.

## Gotchas

- The first `Play` after a fresh install can take a while (TrackPlayer setup + stream). One cold run failed to show `Pause` in 45 s, and a re-run passed. Re-run once before calling it broken, and say so.
- The emulator has no audible output by default; prove playback by UI state and the media session, not by ear.
- Leaving the reader stops playback (`use-stop-playback-on-leave`); don't navigate mid-assertion.
