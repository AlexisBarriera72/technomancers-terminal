# Technomancer's Terminal

A character builder and rules browser for *The Technomancer's Textbook* (Mogrit's
cyberpunk 5e supplement) plus the **Neon Ledger** expansion.

Live at **technomancers-terminal.vercel.app**.

Static site. No build step, no dependencies, no backend. Five files.

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
| `app.js` | The whole application. Vanilla JS, one IIFE, no framework. |
| `data.js` | `window.TTB` — everything extracted from the Textbook. |
| `expansion.js` | `window.TTBX` — the Neon Ledger expansion. |
| `campaigns.js` | `window.TTBC` — your campaigns. **This is the one you edit.** |

`vercel.json` only sets cache headers.

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
