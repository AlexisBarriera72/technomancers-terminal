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
| `gm.js` | The GM tools — `window.TTBGM` (rulings, conditions, NPC templates) and `window.TTGM` (the code). |
| `data.js` | `window.TTB` — everything extracted from the Textbook. |
| `expansion.js` | `window.TTBX` — the Neon Ledger expansion. |
| `campaigns.js` | `window.TTBC` — your campaigns. **This is the one you edit.** |
| `sw.js` | Service worker, so the site opens with no signal. |

`vercel.json` sets cache headers. `manifest.json` and `icon.svg` make it installable.

`app.js` hands `gm.js` a namespace (`window.TT`) at startup — the book lookups, the
DOM helpers and the derived-stat functions. Everything else in `app.js` stays private.

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
| **Party** | Every PC's AC, HP, initiative, passives, saves, Humanity and class DC on one page. Plus *who's best at…* for any skill, and the god's attention die. |
| **Encounter** | Initiative order, hit points, temp HP, conditions, round counter. Tap a number pad to damage or heal. |
| **Rulings** | What to make them roll and what to set it at — with each character's real modifier and the odds. A searchable catalogue sits under a generic picker that covers anything. |
| **NPCs** | Statblocks, from twelve templates or blank. Mooks are one line. Includes an improviser for the NPC you didn't prepare. |
| **Clocks** | Segmented progress clocks and a session scratchpad. |

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
visiting. Bump `CACHE` in `sw.js` when you deploy a change to the app's files.

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
