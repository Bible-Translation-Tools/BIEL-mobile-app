# Download a book

Users download a book's text and/or audio from the book card menu, see it in the Downloads Library (grouped by
language, split by testament, filterable by content type), and delete a track with a confirmation.

## Sub-features

- `dl-menu` opens `Download` with `All Text` and `All Audio` rows showing sizes.
- `dl-text` downloads the whole-book text. The track row becomes `Delete downloaded All Text` with `Downloaded`.
- `dl-card-state` shows the card's `Delete <book>` only when **all** available tracks are downloaded (text + audio for books with audio).
- `lib-list` Downloads Library shows `N book(s) downloaded` per testament, grouped by language.
- `lib-filter` filters by `Both` / `Text Only` / `Audio Only`.
- `lib-delete` row trash → per-track menu → `Delete downloaded All Text` → confirm dialog (`Delete Download`) → removed.
- `lib-cancel` cancelling the dialog keeps the download.

## How to get to it (user POV)

- Books screen → download button on a book card (`Download <book>`).
- Menu (any screen) → `Downloads Library`.

## Driving it with biel-verify

Preconditions:

- `bv reset` (no downloads); network on.

- **Before.** Run `bv files` (prints nothing) and `bv db "select count(*) from books"` (0).
- **Download text.** Run `bv flow download-book`. The menu shows `Download All Text` and `Download All Audio` (`01-menu.png`); after the tap, reopening shows `Delete downloaded All Text` and still `Download All Audio` (`02-text-downloaded.png`).
- **Side effects.** Run `bv files`: `3930  files/biel-offline/en/2JN/scripture/whole.json`. Run `bv db "select language_code,book_slug,resource_type,byte_size,content_hash from books"`: one `en|2JN|ulb|3930|<hash>` row. `bv db "select * from chapters"` has one row.
- **Library.** Run `bv flow downloads-library`. The default `Old Testament` tab says `No downloads yet` (`01-library-ot-tab.png`); `New Testament` shows `1 book downloaded`, group `en`, `2 John` (`01b-library-nt-tab.png`).
- **Filter.** The flow selects `Audio Only` (2 John hidden, `02-…`) then `Text Only` (2 John back, `03-…`).
- **Delete.** The flow taps `Delete 2 John` → `Delete downloaded All Text` → `Cancel` (still downloaded) → again → `Delete`. `No downloads yet` is shown (`06-after-delete.png`).
- **Side effects.** `bv files` prints nothing; `bv db "select count(*) from books"` and `… from chapters` are 0.
- **Proof.** Both PASS lines plus the before/after `files`/`db` output.

## Gotchas

- Precondition matters: if 2 John text is already downloaded, `Download All Text` is absent and `download-book` fails. Start from `bv reset`.
- Do not wait for `Delete 2 John` on the book card after a text-only download of a book with audio; it never appears (see `dl-card-state`).
- The library opens on `Old Testament` and says `No downloads yet` there even when NT books are downloaded. The same copy is used for an empty filter result.
- The library group header shows the language **code** (`en`), not its name.
- On iOS each filter option is one accessible element labelled `", Audio Only"` (empty icon labels add commas; VoiceOver reads them). Match `".*Audio Only"`.
- Filter popover: add `waitForAnimationToEnd` after opening it, or the option tap is silently lost. Selecting an option closes it.
- `Cancel` labels both the dialog backdrop and the button. Anchor taps with `below: "Are you sure you want to delete\\?"`.
- On a hung Maestro run (no output past a step's timeout), the helper's watchdog kills it after `BIEL_FLOW_TIMEOUT` (420 s).
