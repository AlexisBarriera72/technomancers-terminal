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
| `gm.js` | The GM tools, `window.TTBGM` (rulings, conditions, NPC templates, Street Cred bands) and `window.TTGM` (the code). |
| `data.js` | `window.TTB`, everything extracted from the Textbook. |
| `expansion.js` | `window.TTBX`, the Neon Ledger expansion. |
| `srd.js` | `window.TTSRD`, SRD 5.1 material, currently the Wild Magic Sorcerer. |
| `city.js` | `window.TTCITY`, the City and Toolkit screens' tables: calendar, holy days, weather, street encounters, bounties. |
| `synergy.js` | `window.TTSY`, the class roles and the named pairs. Read by both halves. |
| `story.js` | `window.TTST`, "The Fourth Minute", the GM-only campaign behind the Story tab. |
| `es-ui.js` | `window.TTES.ui`, Spanish for the application's own text. Always loaded. |
| `es-book.js` | `window.TTES.book`, Spanish for the rules text. Fetched on demand. |
| `campaigns.js` | `window.TTBC`, your campaigns. **This is the one you edit.** |
| `sw.js` | Service worker, so the site opens with no signal. |

`es-ui.js` is in the service worker's `SHELL`, so the interface works in Spanish
offline. `es-book.js` is not, it is the large half, fetched on first use and cached
by the worker's ordinary fetch handler from then on.

`vercel.json` sets cache headers. `manifest.json` and `icon.svg` make it installable.

`app.js` hands `gm.js` a namespace (`window.TT`) at startup, the book lookups, the
DOM helpers and the derived-stat functions. Everything else in `app.js` stays private.

## The look

"Neon Noir": dark by default whatever the device prefers, with light one tap
away on the ◐ button (remembered per browser). Two neon colours, cyan for what
you act on and what is selected, pink for section labels, and every text colour
is at least 4.5:1 against every background it sits on, in both themes.

- **Fonts.** Barlow for the interface, Chakra Petch for headings, JetBrains Mono
  for labels and numbers. Rules text from the book (Codex entries, features,
  what your character can do) stays in Spectral, so the book still reads like
  the book.
- **Cut corners** are a `clip-path`. It draws no border along the cut, so each cut
  panel draws its own diagonal with `::after`, and the glow is inset because a
  clip-path would cut an outer one off. Focus rings on cut things sit inside
  them for the same reason.
- **Roles** each have an icon and a colour (`ROLE_ICON` in `app.js`, the
  `.role-*` rules in `index.html`), shown on class cards, the synergy preview,
  the GM's coverage chips and each GM party card.
- **Motion** is two things: a card lights up once when it is picked, and the
  Street Cred rank flares when it crosses into a new band. A device set to
  reduce motion gets neither.
- **Printed sheets** are untouched: black on white, their own fonts.

All of it lives in `index.html`; the "Neon Noir" section near the end of the
stylesheet holds the cut corners, glow, role chips, empty screens and motion.

## Spanish

The **ES** button in the masthead switches the whole interface to Spanish. It is
entirely client-side: a preference in `localStorage`, no request, no server, and
nothing about it in the character or the share link. A sheet built in Spanish opens
identically for somebody running the site in English.

**Spanish is a display layer over a finished English DOM, and it has to stay one.**
The application infers mechanics from English prose, `ACT_RULES` decides what a
feature costs to use by reading its own text, `parseACBonus()` reads the armour
table, `weaponProficient()` reads a class's weapon line, and characters store
class, archetype, skill and feat **names** as the keys those lookups use. So
`render()` builds the page in English exactly as it always did, and `applyLang()`
then rewrites the text nodes it produced. Nothing touches `window.TTB`, `TTBX` or
`TTSRD`.

That is why **proper nouns stay English**: class, archetype, feat, background and
gear names. Translating them would break saved sheets and shared links. The on-screen
notice says so rather than leaving people to work it out.

### How the table works

Keys are the English text exactly as it reaches the screen, so a key that stops
matching falls back to English, a source string you edit loses its Spanish instead
of keeping a translation of something it no longer says.

- Runs of digits are written `{0}`, `{1}`… so one entry covers `Step 01` through
  `Step 08`, and a translator can move a number where Spanish wants it.
- `window.TTES.patterns` handles text built from the data (`Add {*}` →
  `Añadir {*}`). `{*}` matches a run; the capture goes back through the table, so a
  gear name passes through untouched while a skill name inside it is translated.
- Guide sentences carrying `[[term]]` glossary markup are translated **whole**, in
  `withTerms()`, before the split, three fragments cannot be translated separately
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
writes `tools/strings.json`, every string that actually reaches the DOM, split into
`ui` (the application's own) and `book` (text that exists in a data file). Translate
into the matching file. Anything missing renders in English, so partial coverage is
safe to ship.

`node tools/book-coverage.js` reports what is left, per group, straight from the
data files; `node tools/book-coverage.js <group>` lists it. Every sentence of rules
text is translated. What it still counts as missing is **names**, classes,
archetypes, features, feats, gear, which stay English on purpose.

**The rules text is machine translated**, and the interface says so. The English is
the reference and the **EN** button shows it. Nothing in `es-book.js` is ever read by
the rules engine.

## Adding or changing a campaign

Open `campaigns.js` and edit the `campaigns` array. The schema is documented in
a comment at the top of that file, every field except `id` and `name` is
optional. Commit, push, done.

The Campaign screen is part of the GM tools (Table → Campaign); players no
longer see it, since whatever they need is told to them at the table. You can
build campaigns there too (+ New campaign). Those live in that browser. Export one to `.json` and paste it into
`campaigns.js` to make it part of the site for everybody.

The current campaign is **Cathedra**, a city grown inside the ribcage of a god
that is still dying, where the Humanity track measures how much of the god is
replacing you.

## Levelling up, inventory and the play sheet

- **Level-up panel.** Raising the level from the dossier slider opens a panel
  at the top of the page instead of a toast. It lists what arrived at each new
  level (from `ladder()`), max HP and proficiency before and after, and what's
  still to choose (ability/feat slots, programs and the like, the archetype),
  each with **Take me there**. Further raises widen it, lowering below where
  it started closes it, and **What changed at level N** in the dossier brings
  it back. Focus stays on the slider, so the arrow keys keep working.
- **Inventory and credits.** Gear carries a count (`qty`) and a weight (`wt`,
  read from the book's own Weight column when an item is added and filled in
  for older saves by `migrate`). Items the book doesn't have can be added by
  hand (`custom: true`). `credits` is what the character has; **Starting
  credits** reads the campaign's starting money or the background's credit
  stick. The Chrome & gear step and the play sheet show credits left and the
  weight carried against Str × 15, with a warning past Str × 5 and Str × 10.
- **On your turn.** The play sheet opens with a deck of cards to tap: Move,
  Action (Attack, Dash, Disengage, Dodge, Help, Hide, Ready an action, Search,
  Use an Object, cast or run a program), Bonus action, Reaction, Free, and the
  conditions. The character's own actions, bonus actions and reactions are
  dealt into the matching cards from the same buckets as *What you can do*.
- **Frames.** A Puppeteer's play sheet shows their frames at the tier the
  class table gives for their level, with AC, HP, speed and attack from the
  frame table, an HP track per frame (and what a destroyed frame costs), and
  the Uplink pool with a button per Remote Body option that spends its cost.
  Frame HP and Uplink spent are saved on the character (`frames`,
  `uplinkUsed`).

## Where characters are stored

In the visitor's browser (`localStorage`), never on a server. Sharing works by
encoding the character into the URL after `#c=`, anyone who opens that link
gets the character and can save their own copy. Nothing is uploaded.

## The GM tools

Hidden until you visit **`/#gm=cathedra`**. That unlocks a fourth tab, *Table*,
and remembers the unlock on that device. `/#gm=off`, or the **Lock GM tools**
button in the right-hand panel, puts it away again, which is what you want
before handing the tablet to a player.

> The token lives in `gm.js`, which is a public file on a public deploy. Anyone
> who opens devtools can find it. It keeps a curious player out of your notes,
> not a determined one. The real guarantee is that nothing the GM keeps ever
> leaves the device. Change `TTBGM.unlock` to change the address.

### The Story tab

A sixth GM screen holds **"The Fourth Minute"**, a twelve-session campaign for
Cathedra (levels 3→12). The crew fail a heist, see the end of the city in a
stolen vision, and spend the campaign trying to stop it; every attempt helps it
happen, and the "gifts from the gods" that help them turn out to be from their
own future selves. The city always falls, the fall is a birth, except on a
1% path that needs all twelve keystones kept.

Everything is a drop-down: reference sections (the truth, running the doom,
the seven fragments, keystones, visions, the secret Eye-chrome, loop scars,
the Hush, cast, random tables with roll buttons, an off-script kit, endings),
then four acts of scenes. Every scene has the same categories, what's really
happening, read-aloud, ways in by role, questions worth asking, if they don't
ask, details they can miss, right calls, wrong calls, when it goes wrong
anyway, checks and DCs, visions, loop scars, Street Cred, clocks and NPCs, its
fragment and keystones.

It tracks and it's wired in: mark scenes played, the branch taken and a note;
tick Doom, move Salvage and Feed, mark keystones kept or broken; **Roll for a
vision** picks someone from the party (17+, or 16+ with the Eye-chrome) and logs
it for the finale; **Start clocks**, **Add NPCs** and the Street Cred buttons
feed the other GM screens. Role hooks name whoever in the imported party fits
them. Progress lives in `ttb.gm.play` beside the clocks, so the vault export
carries it. The story text is English only; the tab's labels are translated.

**Demo walkthrough** (the first drop-down) follows the demo crew through a whole
campaign in 13 steps, from before session 1 to the Sending. Each step says what
happened at the table, which buttons the GM pressed and why, and where the dials
end up. **Show this on the dials** writes that step's running totals (Doom,
Salvage, Feed, keystones, the vision log, Street Cred) into the story state, so
the dials move in front of you. It only ever writes to the demo table: outside
the demo the button reads **Load the demo and show this**, and loading the demo
sets your real table aside first. The steps live in `TTST.walkthrough`, and
their totals after session 3 are exactly the demo table's starting point, which
a test holds them to.

> Like the unlock token, `story.js` is a public file. It keeps the story out
> of a player's way, not out of a determined player's hands.

**Load a demo table** (on the Party screen, under Backup) fills every screen
with a made-up Cathedra game in progress: five level-5 characters with three
live synergy pairs, their NPCs, a fight in round two, three clocks, Street Cred
and session notes. It loads into the real `ttb.gm.*` keys, so your own table is
first copied aside to `ttb.gm.demo`; **Exit demo** puts it back exactly, and a
banner on every GM screen says you are in the demo until then. The demo itself
is `demoTable()` in `gm.js`.

**Every GM screen explains itself.** While the **?** guide is on (the same
switch as the players' beginner guide, on by default), each screen opens with a
"How to use this screen" box, what to add, in what order, and when, and a
one-line hint sits under each group of controls. Every button also says what it
does on hover, guide or no guide. The text lives in one place, `TTBGM.help` in
`gm.js`, and a test holds every line of it to having a Spanish translation.
**Hide guide** (or **?**) turns it all off once you know it.

Nine screens: the five below, then Story, Campaign, City and Toolkit:

| Screen | What it does |
|---|---|
| **Party** | Every PC's AC, HP, initiative, passives, saves, Humanity and class DC on one page. Plus *who's best at…* for any skill, the god's attention die, the table's Street Cred, which named pairs this particular set of people makes, and a **Humanity dashboard**: everyone's band, worst first. |
| **Encounter** | Initiative order, hit points, temp HP, conditions, round counter. Tap a number pad to damage or heal. Drag a combatant by its ⠿ handle (or ▲ ▼) to change the order; **Roll NPC initiative** gives each kind of foe one shared roll; a **Difficulty** bar weighs the foes' XP (by CR) against the party's SRD 5.2 budget for their levels; **Morale** asks for a DC 10 Wisdom save when half the foes are down, and a foe who breaks is marked Fled and skipped. |
| **Rulings** | What to make them roll and what to set it at, with each character's real modifier and the odds. A searchable catalogue sits under a generic picker that covers anything, and an NPC reaction roll for what someone makes of them. |
| **NPCs** | Statblocks, from twelve templates or blank. Mooks are one line. Includes an improviser for the NPC you didn't prepare. |
| **Clocks** | Segmented progress clocks and a session scratchpad. A clock marked *Ticks with each day* fills a segment whenever the City screen advances a day. |

### The City screen

Cathedra's four Houses and eleven districts are part of the campaign
(`campaigns.js`: `houses`, `districts`, each district with its height above the
Marrowworks floor). The book named two Houses and a handful of places; Lathe
(drills, refining, carvers' licences), Vigil (wards, the Watch, the lift
operators) and the rest of the stack were written to fill it out. The Campaign
screen lists them under **City**. Everything rolled lives in `city.js`
(`window.TTCITY`): the calendar and ten holy days, a d12 weather table, street
encounters by height and time of day, and a bounty board by Street Cred band.
Like the story, those words stay English; the screen's labels are translated.

The screen tracks:

- **Today**: the date in Cathedra's calendar (twelve months of thirty days,
  counted from the Fall), today's or the next holy day, and **Advance a day**,
  which fills one segment on every clock marked to tick with the days.
- **Weather**, rolled once a day. Any effect on rolls also shows next to the
  Ruling Desk's DC picker and in the side panel, only on the day it was rolled.
- **Standing with the Houses**, −3 (Enemy) to +3 (Patron), with what each step
  means. A House can be renamed for your table; the rename is GM state, since
  the built-in campaign is read-only.
- **Street Cred history**: every change with its reason and a small chart.
  `repSet(value, why)` takes the reason; the Party screen's controls log
  "Moved by hand" (a drag or a run of taps folds into one line), story buttons
  log the scene, and a vault import logs itself.
- **Bounty board**: three jobs for the crew's Street Cred band. **Take it**
  starts a clock named for the job.
- **Street encounter**: pick a district and day or night and roll; when the
  encounter names who turns up, one tap adds them to the fight.

All of it lives in `ttb.gm.play` (`city`, `repLog`), goes out in the vault
export, comes back on import through `cleanCity`, and the demo table seeds it.

### The Toolkit screen

Generators and calculators for the moments nobody prepared, each a drop-down,
all rolling on `city.js` tables:

- **Loot**: one find for where they are (below the Nave, the middle ribs, or
  Lanternside up), one for whose it was if you pick a House, sometimes a
  second find; values in grams, and **Copy to notes** appends it to the session
  scratchpad.
- **Names**: five at a time from each House's pool or the street, corpo and
  priest pools. **Make NPC** turns one into a real NPC on the NPC screen.
- **The Long Fall**: pick the district and either *Off the edge* (down to the
  district below) or a distance. It rolls 1d6 per 10 ft (capped at 20d6), works
  out which district they land in from the heights, rolls where they land, and
  lists any party chrome that stops a fall (Hydraulic Jacks, Integrated Grapple
  Gun, Cyberclaws).
- **Chrome malfunctions**: a d12 table per tier. Pick a character and it picks
  one of their installed implants and rolls at that implant's tier.
- **Heist planner**: target, approach (quiet, social, loud, inside man), a crew
  role per party member, the plan as steps, a six-segment heat clock, and
  **What went wrong** from the approach's table.
- **Netrun map**: a security rating from 1 to 5 builds an architecture of
  passwords, files, control nodes and ICE (with AC, HP, attack, damage and DC
  scaled to the rating) down to the root. Tap a node for cleared, again for
  tripped.
- **Chase**: on foot, bike, car or AV; a 0 to 10 gap (0 is caught, 10 is gone)
  with a complication table for feet and one for wheels. The book has no
  vehicle rules, so the modes are a nudge to the check, not statblocks.

The heist, the net and the chase live in `ttb.gm.play` (`heist`, `netrun`,
`chase`), are cleaned on load and on import, and go out in the vault.

### Street Cred and what the party is

Two things on the GM's side read the whole table at once, which nothing else in
the app can do. `app.js` computes one character at a time, `statsOf(c)` takes a
single character and has no way to know who else is there, which is correct,
because a player's own sheet genuinely does not know. So both live in `gm.js`
next to `partyChars()`, the one place the party is already in one array, and
neither appears on a player's screen.

**Street Cred** is one number for the table, −10 to +10, kept beside the clocks
in `ttb.gm.play`. The expansion has always described it as "a shared track" that
adds to Charisma checks; until now it was a private slider on each sheet that
nothing read. The positive half is the expansion's own table unchanged. Each
band also carries a line for what it buys in a conversation, what it does when
they go looking for something, and what happens when it turns ugly, the last
two are new, because the book only ever covered the talking.

The book only ever went up. The five negative bands, Burned, Bad paper, Marked,
Poison, Blacklisted, mirror the five above, so infamy costs exactly what fame
pays, down to −5. The meter is centre-anchored, growing right when the city
likes them and left when it does not.

The modifier is real: it goes through `bonusFor()`, so every Charisma check the
Ruling Desk prices already has it, and the per-character skill chips show it
too. It is the GM's to move, a point for a job the street saw, one back for
folding in public. There is no quest log to infer it from, and inferring it
would be worse than asking.

Each character's card also lists their own class's pairs, so the GM can see
what one person brings and what the table is one recruit short of. A pair that
is live names the person, Vex pairs with Nyx, not "a Rogue", because the GM's
screen is the only one that can know that.

**Synergies** are named class pairs, 18 of them, ten spanning both rulebooks,
with all 21 classes appearing at least once. Each has a line to read when both
are in the room and a small, real bonus (`effect`), such as Shield Wall's +1 AC
against melee attacks while the two stand next to each other. The GM applies
those at the table, with one exception: Ranger + Rogue is **Ambush Team**, worth
+1 initiative to both, computed in `combatInitiative()` the way `app.js`'s
`initiative()` already hardcodes Chromehound and Firebrand.
Under the pairs, every class carries one or two of six roles, and the party is
told which it covers and which it does not. A narrow crew is a shape, not a
fault, the coverage line says so rather than scoring it.

Players see the same pairs while **choosing a class**: each card carries a
disclosure listing what that class pairs with, and opening one shows its line
and **What it does**, the bonus. The GM's synergy cards show the same line, and
a pair on a character's card shows it on hover.
That is the moment the information can still change a decision. The card is a
`<button>`, so the preview is a sibling rather than a child, a button cannot
contain a button, and its open state is held outside the card because
`render()` rebuilds the whole stage when you pick something.

**The NPC reaction roll** is one d20 plus Street Cred plus whatever the moment
is worth, read off a five-band table from Hostile to Ally. It is built once and
mounted twice, on the Ruling Desk and inside the encounter, because "does this
turn into a fight", "does anyone step in once it is one" and "will this person
help at all" are the same question asked at three different moments, and
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
whole thing to a `.json` file. Do it after a good prep session. **Import** merges
it back: characters, NPCs and encounters by id, and the file's clocks and Street
Cred replace the ones on screen.

## Offline

`sw.js` caches the site so it opens with no signal, which is the normal case at
a table underground. Add it to the home screen on a tablet and it runs as its own
app; on iOS that also stops Safari evicting your GM notes after a week of not
visiting.

## Tests

The site itself still has no dependencies and no build step. The tests are
dev-only, the app needs a DOM, so even the rules checks run inside a real
browser against `window.TT`, the namespace `app.js` publishes for `gm.js`.

```
npm install
npx playwright install chromium
npm test            # everything
npm test -- rules   # just the rules/validation checks
```

`npm run check` is a syntax-only pass and needs nothing installed. It also runs
two guards: no absolute paths in the tests, and no em dashes anywhere
(`test/no-em-dash.js`). The house style is commas, colons and brackets, and a
Spanish key is the exact English it translates, so a dash that comes back on
one side only would leave a line in English. CI runs both on every push.

| Suite | What it covers |
|---|---|
| `test/rules.test.js` | Ability scores, feats, per-class ASI levels, AC, proficiency, the import validator. |
| `test/browser.test.js` | Injection, save failures, the GM vault export, share-link transitions, and that the app still works. |
| `test/sw.test.js` | A failed update must not replace a working offline cache. |
| `test/city.test.js` | The GM's table tools: encounter order, shared NPC initiative, difficulty and morale; the city's data (tables sized to their dice, districts climbing) and the City and Toolkit screens. |
| `test/player.test.js` | The level-up panel, inventory and credits (weights, counts, custom items, old saves), the turn cards and the Puppeteer's frames. |
| `test/story.test.js` | The story holds together (every scene complete, every reference resolves), the Story tab tracks, rolls and persists, the demo walkthrough adds up, and every synergy says what it does. |

## Deploying a change

A push to `main` is the deploy, but **bump both version markers in the same commit**
or people keep seeing the old site:

- `BUILD` in `app.js`, printed in the masthead, so you can tell at a glance which
  version a device is actually running. That is the quickest way to answer "did my
  change go live?"
- `CACHE` in `sw.js`, the service worker serves its cached copy first, so without a
  bump the first load after a deploy still shows the old version.

Give Vercel a minute after the merge. A deploy that hasn't finished looks exactly
like a change that didn't work.

## Printing

Four layouts, all from the Play step:

- **Classic sheet**, two pages, the traditional 5e layout.
- **Pocket card**, two cards, the numbers you actually reach for mid-combat.
- **Ability cards**, one cut-out card per feature.
- **Full dossier**, everything, printed straight through.

## Credits

*The Technomancer's Textbook* is Mogrit's work; the class, subclass, background,
feat and equipment text in `data.js` is reproduced from it. The Neon Ledger
expansion in `expansion.js`, the campaign material in `campaigns.js` and the
application itself are original.

`srd.js` carries SRD 5.1 material, the Wild Magic Sorcerer at present. Its
mechanics are the SRD's, unchanged: same triggers, same dice, same durations, so a
table using the printed rules and a table using this site are playing the same game.
Only the surrounding description is written for Cathedra, and that split is load
bearing rather than stylistic, `actionEntries()` in `app.js` infers a feature's
action cost by reading its own prose, so rewriting a rule sentence for flavour would
quietly change what the sheet prints.

Each source shows its own chip, Book, Neon Ledger or SRD, from `sourceName()` in
`app.js`. Add a fourth by giving its records an `origin` and adding one line to
`SOURCES`.

> This work includes material taken from the System Reference Document 5.1
> ("SRD 5.1") by Wizards of the Coast LLC, available at
> https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is
> licensed under the Creative Commons Attribution 4.0 International License,
> available at https://creativecommons.org/licenses/by/4.0/legalcode.
