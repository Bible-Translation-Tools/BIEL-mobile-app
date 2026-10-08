# Browse books

The Books screen for a language splits books into Old/New Testament tabs, filters them by name, and expands a
book card into its chapter grid; tapping a chapter opens the reader.

## Sub-features

- `books-tabs` switches between `Old Testament` and `New Testament` lists.
- `books-search` filters the active testament by book name.
- `books-expand` expands a book into a numbered chapter grid (`Collapse <book>` when open).
- `books-open-chapter` opens `/read` for the tapped chapter.
- `books-download-button` opens the per-book download menu (see [Download a book](./downloads.md)).

## How to get to it (user POV)

- Home → tap a language card (`Open <Language>`).

## Driving it with biel-verify

Preconditions:

- Baseline preconditions; network on.

- **Old Testament default.** Run `bv flow browse-books`. `Expand Genesis` is visible (`01-old-testament.png`).
- **Switch tab.** The flow taps `New Testament`; `Expand Matthew` is visible and `Expand Genesis` is not (`02-new-testament.png`).
- **Search.** The flow types `2 John`; only `Expand 2 John` remains.
- **Expand.** The flow taps `Expand 2 John`; a chapter button matching `Chapter 1.*` appears and the card reads `Collapse 2 John` (`03-2john-chapters.png`).
- **Open chapter.** The flow taps `Chapter 1.*`; the reader shows `2 John 1` and the verse text `From the elder to the chosen lady…` (`04-reader.png`).
- **Proof.** PASS line plus the four screenshots.

## Gotchas

- Book search only searches the **active** testament. Switch tabs first.
- Chapter buttons' labels vary with availability (`Chapter 1`, `Chapter 1, text and audio`, `Chapter 1, not downloaded`); match with `Chapter 1.*`.
- `2 John 1` appears in the reader header and in the audio mini player, and the reader shows a spinner first. Assert verse text, not the title, or a loading screen passes.
