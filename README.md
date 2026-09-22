# Technomancer's Terminal

A character builder and rules browser for *The Technomancer's Textbook* (Mogrit's
cyberpunk 5e supplement) plus the **Neon Ledger** expansion.

Live at **technomancers-terminal.vercel.app**.

Static site. No build step, no dependencies, no backend.

## Deploying

The Vercel project is linked to this repository, so:

```
git add -A
git commit -m "what changed"
git push
```

A push to `main` is the deploy. Nothing else to run.

To preview before you push, open `index.html` in a browser or serve the folder
with `npx serve .`.

## The files

| File | What it is |
|---|---|
| `index.html` | Shell markup and all the CSS. |
| `app.js` | The player-facing application. Vanilla JS, one IIFE, no framework. |
| `gm.js` | The GM tools — `window.TTBGM` (rulings, conditions, NPC templates, Street Cred bands) and `window.TTGM` (the code). |
| `data.js` | `window.TTB` — everything extracted from the Textbook. |
| `expansion.js` | `window.TTBX` — the Neon Ledger expansion. |
| `srd.js` | `window.TTSRD` — SRD 5.1 material, currently the Wild Magic Sorcerer. |
| `synergy.js` | `window.TTSY` — the class roles and the named pairs. Read by both halves. |
| `es-ui.js` | `window.TTES.ui` — Spanish for the application's own text. Always loaded. |
| `es-book.js` | `window.TTES.book` — Spanish for the rules text. Fetched on demand. |
| `campaigns.js` | `window.TTBC` — your campaigns. **This is the one you edit.** |
| `sw.js` | Service worker, so the site opens with no signal. |

`es-ui.js` is in the service worker's `SHELL`, so the interface works in Spanish
offline. `es-book.js` is not — it is the large half, fetched on first use and cached
by the worker's ordinary fetch handler from then on.

`vercel.json` sets cache headers. `manifest.json` and `icon.svg` make it installable.

`app.js` hands `gm.js` a namespace (`window.TT`) at startup — the book lookups, the
DOM helpers and the derived-stat functions. Everything else in `app.js` stays private.

## Spanish

The **ES** button in the masthead switches the whole interface to Spanish. It is
entirely client-side: a preference in `localStorage`, no request, no server, and
nothing about it in the character or the share link. A sheet built in Spanish opens
identically for somebody running the site in English.

**Spanish is a display layer over a finished English DOM, and it has to stay one.**
The application infers mechanics from English prose — `ACT_RULES` decides what a
feature costs to use by reading its own text, `parseACBonus()` reads the armour
table, `weaponProficient()` reads a class's weapon line — and characters store
class, archetype, skill and feat **names** as the keys those lookups use. So
`render()` builds the page in English exactly as it always did, and `applyLang()`
then rewrites the text nodes it produced. Nothing touches `window.TTB`, `TTBX` or
`TTSRD`.

That is why **proper nouns stay English**: class, archetype, feat, background and
gear names. Translating them would break saved sheets and shared links. The on-screen
notice says so rather than leaving people to work it out.

### How the table works

Keys are the English text exactly as it reaches the screen, so a key that stops
matching falls back to English — a source string you edit loses its Spanish instead
of keeping a translation of something it no longer says.

- Runs of digits are written `{0}`, `{1}`… so one entry covers `Step 01` through
  `Step 08`, and a translator can move a number where Spanish wants it.
- `window.TTES.patterns` handles text built from the data (`Add {*}` →
  `Añadir {*}`). `{*}` matches a run; the capture goes back through the table, so a
  gear name passes through untouched while a skill name inside it is translated.
- Guide sentences carrying `[[term]]` glossary markup are translated **whole**, in
  `withTerms()`, before the split — three fragments cannot be translated separately
  without getting the grammar wrong. The Spanish keeps the English glossary key:
  `[[skill|habilidad]]`.
- The action cards quote **one sentence** out of a feature's prose, and the book is
  keyed by whole blocks, so a sliced sentence is never a key. `sentenceEs()`
  translates the block and pairs the two languages' sentences by position. A block
  whose two languages split into different numbers of sentences contributes nothing
  and its sentences stay English: the wrong sentence in Spanish is a worse answer
  than the right one in English. Four cards out of 642 are in that state, all of
  them sentences that straddle a block boundary.
- Spanish writes thousands as `5.000₵`, so `sentencesOf()` does not treat a full
  stop between two digits as the end of a sentence.

### Adding translations

`node tools/extract-strings.js` drives the real application through every screen and
writes `tools/strings.json` — every string that actually reaches the DOM, split into
`ui` (the application's own) and `book` (text that exists in a data file). Translate
into the matching file. Anything missing renders in English, so partial coverage is
safe to ship.

`node tools/book-coverage.js` reports what is left, per group, straight from the
data files; `node tools/book-coverage.js <group>` lists it. Every sentence of rules
text is translated. What it still counts as missing is **names** — classes,
archetypes, features, feats, gear — which stay English on purpose.

**The rules text is machine translated**, and the interface says so. The English is
the reference and the **EN** button shows it. Nothing in `es-book.js` is ever read by
the rules engine.

## Adding or changing a campaign

Open `campaigns.js` and edit the `campaigns` array. The schema is documented in
a comment at the top of that file — every field except `id` and `name` is
optional. Commit, push, done.

You can also build campaigns inside the app itself (Campaign → New campaign).
Those live in the visitor's own browser. Export one to `.json` and paste it into
`campaigns.js` to make it part of the site for everybody.

The current campaign is **Cathedra** — a city grown inside the ribcage of a god
that is still dying, where the Humanity track measures how much of the god is
replacing you.

## Where characters are stored

In the visitor's browser (`localStorage`), never on a server. Sharing works by
encoding the character into the URL after `#c=` — anyone who opens that link
gets the character and can save their own copy. Nothing is uploaded.

## The GM tools

Hidden until you visit **`/#gm=cathedra`**. That unlocks a fourth tab, *Table*,
and remembers the unlock on that device. `/#gm=off` — or the **Lock GM tools**
button in the right-hand panel — puts it away again, which is what you want
before handing the tablet to a player.

> The token lives in `gm.js`, which is a public file on a public deploy. Anyone
> who opens devtools can find it. It keeps a curious player out of your notes,
> not a determined one. The real guarantee is that nothing the GM keeps ever
> leaves the device. Change `TTBGM.unlock` to change the address.

Five screens:

| Screen | What it does |
|---|---|
| **Party** | Every PC's AC, HP, initiative, passives, saves, Humanity and class DC on one page. Plus *who's best at…* for any skill, the god's attention die, the table's Street Cred, and which named pairs this particular set of people makes. |
| **Encounter** | Initiative order, hit points, temp HP, conditions, round counter. Tap a number pad to damage or heal. |
| **Rulings** | What to make them roll and what to set it at — with each character's real modifier and the odds. A searchable catalogue sits under a generic picker that covers anything, and an NPC reaction roll for what someone makes of them. |
| **NPCs** | Statblocks, from twelve templates or blank. Mooks are one line. Includes an improviser for the NPC you didn't prepare. |
| **Clocks** | Segmented progress clocks and a session scratchpad. |

### Street Cred and what the party is

Two things on the GM's side read the whole table at once, which nothing else in
the app can do. `app.js` computes one character at a time — `statsOf(c)` takes a
single character and has no way to know who else is there, which is correct,
because a player's own sheet genuinely does not know. So both live in `gm.js`
next to `partyChars()`, the one place the party is already in one array, and
neither appears on a player's screen.

**Street Cred** is one number for the table, −10 to +10, kept beside the clocks
in `ttb.gm.play`. The expansion has always described it as "a shared track" that
adds to Charisma checks; until now it was a private slider on each sheet that
nothing read. The positive half is the expansion's own table unchanged. Each
band also carries a line for what it buys in a conversation, what it does when
they go looking for something, and what happens when it turns ugly — the last
two are new, because the book only ever covered the talking.

The book only ever went up. The five negative bands — Burned, Bad paper, Marked,
Poison, Blacklisted — mirror the five above, so infamy costs exactly what fame
pays, down to −5. The meter is centre-anchored, growing right when the city
likes them and left when it does not.

The modifier is real: it goes through `bonusFor()`, so every Charisma check the
Ruling Desk prices already has it, and the per-character skill chips show it
too. It is the GM's to move — a point for a job the street saw, one back for
folding in public. There is no quest log to infer it from, and inferring it
would be worse than asking.

Each character's card also lists their own class's pairs, so the GM can see
what one person brings and what the table is one recruit short of. A pair that
is live names the person — Vex pairs with Nyx, not "a Rogue" — because the GM's
screen is the only one that can know that.

**Synergies** are named class pairs — 18 of them, ten spanning both rulebooks,
with all 21 classes appearing at least once. They are lines to read when both
are in the room, not arithmetic, with one exception: Ranger + Rogue is
**Ambush Team**, worth +1 initiative to both, computed in `combatInitiative()`
the way `app.js`'s `initiative()` already hardcodes Chromehound and Firebrand.
Under the pairs, every class carries one or two of six roles, and the party is
told which it covers and which it does not. A narrow crew is a shape, not a
fault — the coverage line says so rather than scoring it.

Players see the same pairs while **choosing a class**: each card carries a
disclosure listing what that class pairs with, and opening one shows its line.
That is the moment the information can still change a decision. The card is a
`<button>`, so the preview is a sibling rather than a child — a button cannot
contain a button — and its open state is held outside the card because
`render()` rebuilds the whole stage when you pick something.

**The NPC reaction roll** is one d20 plus Street Cred plus whatever the moment
is worth, read off a five-band table from Hostile to Ally. It is built once and
mounted twice, on the Ruling Desk and inside the encounter, because "does this
turn into a fight", "does anyone step in once it is one" and "will this person
help at all" are the same question asked at three different moments — and
asking it mid-fight should not mean tabbing away from the fight. What the NPC
actually does with that result is still the GM's call; nothing here scripts a
betrayal or a rescue.

### Getting the party in

There is no server, so the GM screen works on snapshots you import. Each player
opens their Play Sheet, hits **Copy share link**, and sends it to you; you paste
it into the box on the Party screen. When someone levels up they send a fresh
link and it replaces the old one.

Everything the GM stores lives in that one browser under `ttb.gm.*`. Clearing
site data deletes the lot, so **Export GM vault** on the Party screen writes the
whole thing to a `.json` file. Do it after a good prep session.

## Offline

`sw.js` caches the site so it opens with no signal — which is the normal case at
a table underground. Add it to the home screen on a tablet and it runs as its own
app; on iOS that also stops Safari evicting your GM notes after a week of not
visiting.

## Tests

The site itself still has no dependencies and no build step. The tests are
dev-only — the app needs a DOM, so even the rules checks run inside a real
browser against `window.TT`, the namespace `app.js` publishes for `gm.js`.

```
npm install
npx playwright install chromium
npm test            # everything
npm test -- rules   # just the rules/validation checks
```

`npm run check` is a syntax-only pass and needs nothing installed. CI runs both
on every push.

| Suite | What it covers |
|---|---|
| `test/rules.test.js` | Ability scores, feats, per-class ASI levels, AC, proficiency, the import validator. |
| `test/browser.test.js` | Injection, save failures, the GM vault export, share-link transitions, and that the app still works. |
| `test/sw.test.js` | A failed update must not replace a working offline cache. |

## Deploying a change

A push to `main` is the deploy, but **bump both version markers in the same commit**
or people keep seeing the old site:

- `BUILD` in `app.js` — printed in the masthead, so you can tell at a glance which
  version a device is actually running. That is the quickest way to answer "did my
  change go live?"
- `CACHE` in `sw.js` — the service worker serves its cached copy first, so without a
  bump the first load after a deploy still shows the old version.

Give Vercel a minute after the merge. A deploy that hasn't finished looks exactly
like a change that didn't work.

## Printing

Four layouts, all from the Play step:

- **Classic sheet** — two pages, the traditional 5e layout.
- **Pocket card** — two cards, the numbers you actually reach for mid-combat.
- **Ability cards** — one cut-out card per feature.
- **Full dossier** — everything, printed straight through.

## Credits

*The Technomancer's Textbook* is Mogrit's work; the class, subclass, background,
feat and equipment text in `data.js` is reproduced from it. The Neon Ledger
expansion in `expansion.js`, the campaign material in `campaigns.js` and the
application itself are original.

`srd.js` carries SRD 5.1 material — the Wild Magic Sorcerer at present. Its
mechanics are the SRD's, unchanged: same triggers, same dice, same durations, so a
table using the printed rules and a table using this site are playing the same game.
Only the surrounding description is written for Cathedra, and that split is load
bearing rather than stylistic — `actionEntries()` in `app.js` infers a feature's
action cost by reading its own prose, so rewriting a rule sentence for flavour would
quietly change what the sheet prints.

Each source shows its own chip — Book, Neon Ledger or SRD — from `sourceName()` in
`app.js`. Add a fourth by giving its records an `origin` and adding one line to
`SOURCES`.

> This work includes material taken from the System Reference Document 5.1
> ("SRD 5.1") by Wizards of the Coast LLC, available at
> https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is
> licensed under the Creative Commons Attribution 4.0 International License,
> available at https://creativecommons.org/licenses/by/4.0/legalcode.
