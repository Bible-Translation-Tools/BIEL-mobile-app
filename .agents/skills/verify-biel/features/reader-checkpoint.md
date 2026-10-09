# Reader checkpoint

When the app is closed while a chapter is open, the next launch reopens that chapter instead of Home.
Leaving the reader with Back forgets it, so the launch after that shows Home again.

## Sub-features

- `checkpoint-restore` relaunching from the reader reopens the same chapter (text or audio-only).
- `checkpoint-back` Back from a restored reader goes to the books list for that language (or the Downloads Library, if the chapter was opened from there); Back again goes Home.
- `checkpoint-clear` once the user backs out of the reader, the next launch shows Home.

## How to get to it (user POV)

- Open any chapter, close the app (swipe it away or let the OS kill it), open the app again.

## Driving it with biel-verify

Preconditions:

- Baseline preconditions; network on.

- **Restore.** Run `bv flow reader-checkpoint`. It opens 2 John 1 (`01-reader-before-relaunch.png`), relaunches, and the verse text `From the elder to the chosen lady…` shows without Home (`02-reader-restored.png`).
- **Back.** The flow taps `Go back`; the English books list shows (`03-books-after-back.png`). It taps `Go back` again and Home shows.
- **Clear.** The flow relaunches; Home shows, not the reader (`04-home-after-relaunch.png`).
- **Proof.** PASS line; `bv db "select * from preferences where key = 'reading_checkpoint'"` returns a row after step 1 and none at the end.

## Gotchas

- Any flow that ends inside the reader leaves a checkpoint. `_ready` backs out of a restored reader so later flows still start on Home.
- The checkpoint write is debounced (200 ms). Maestro's `stopApp` kills the app without the background flush, so the flow waits before relaunching.
- The Downloads Library source (`from=downloads-library`) is not driven by this flow; it needs a download first (see [Download a book](./downloads.md)).
