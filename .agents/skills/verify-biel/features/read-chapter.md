# Read a chapter

The reader renders one chapter's scripture with verse numbers and lets the user change text size and line height
(persisted) from the Menu drawer, then return to the book list.

## Sub-features

- `read-render` shows `<Book> <chapter>` and the chapter's verse text.
- `read-text-size` increases/decreases text size from Menu → Text Settings.
- `read-line-height` increases/decreases line height.
- `read-reset` restores default text settings.
- `read-back` returns to the Books screen with the book still expanded.

## How to get to it (user POV)

- Home → language → book → chapter number.
- (Not mapped yet: Menu → Download in the reader, for single-chapter download.)

## Driving it with biel-verify

Preconditions:

- Baseline preconditions; network on, or 2 John downloaded (see [Read offline](./offline-read.md)).

- **Render.** Run `bv flow read-chapter`. Verse text `From the elder to the chosen lady…` and the heading `2 John 1` are visible (`01-reader-default.png`).
- **Open settings.** The flow taps `Menu` then `Text Settings`; `Text Size` and `Line Height` steppers appear.
- **Change.** The flow taps `Increase text size` twice and `Increase line height` once (`02-text-settings-bigger.png`), dismisses the drawer, and the text reflows larger (`03-reader-bigger.png`).
- **Reset.** The flow reopens Text Settings and taps `Reset text settings`; the text returns to default (`04-reader-reset.png`).
- **Back.** The flow taps `Go back`; `Collapse 2 John` is visible.
- **Proof.** PASS line; compare `01` with `03` (larger) and `04` (back to default). Persistence: `bv db "select * from preferences"`.

## Gotchas

- `Close menu` labels both the drawer's ✕ and the full-screen backdrop; tapping by label hits the backdrop's centre, which is **under** the drawer, and nothing happens. Tapping the backdrop at a point is unreliable on the CI emulator. Tap the ✕ with `text: "Close menu"` + `rightOf: "<drawer title>"`.
- In a dev build, Expo's floating Tools button sits on top of `Menu`. `bv launch` hides it. If `Menu` taps open the Expo dev menu, relaunch with `bv launch`.
- Text settings persist across launches; reset them so later screenshots are comparable.
