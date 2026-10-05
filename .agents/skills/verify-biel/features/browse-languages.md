# Browse languages

Home ("Browse the Bible") lists every language in the BIEL catalog with text/audio availability icons, lets the user
narrow it by typing a language code or name, and opens a language's book list.

## Sub-features

- `lang-list` shows the catalog (alphabetical, each card shows name, `code - national name`, audio/text icons, download button).
- `lang-search` ranks an exact code match first, then code/national-name/name prefix matches.
- `lang-empty` shows `No languages found` for a query with no matches.
- `lang-clear` restores the full list.
- `lang-open` opens `/books` for the chosen language.
- `lang-offline` serves the cached catalog with an offline banner when the network is down (see [Read offline](./offline-read.md)).

## How to get to it (user POV)

- Launch the app; Home is the first screen.
- From any screen: Back until Home.

## Driving it with biel-verify

Preconditions:

- Baseline preconditions; network on.

- **List loads.** Run `bv flow browse-languages`. `Search language here...` is visible and cards render (`01-catalog.png`).
- **Search.** The flow types `en`; the card labelled `Open English` is visible and first (`02-search-en.png`).
- **Empty.** The flow types `zzqx`; `No languages found` is visible (`03-empty.png`).
- **Clear.** The flow taps `Clear search`; the list returns.
- **Open.** The flow taps `Open English`; the Books screen shows `Old Testament` and `New Testament` (`04-books-for-english.png`).
- **Proof.** `PASS browse-languages (<platform>) → <evidence dir>` plus the four screenshots.

## Gotchas

- `English` appears twice on Home: the interface-language button (top bar) and the language card. Tap `Open English`, never `English`.
- First launch after `bv reset` loads the catalog from the network; allow up to ~30 s.
- The card's download button opens a language-wide download menu (large). Do not tap it in this recipe.
