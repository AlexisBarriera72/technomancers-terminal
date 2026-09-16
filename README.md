# Technomancer's Terminal

A character builder and rules browser for *The Technomancer's Textbook* (Mogrit's
cyberpunk 5e supplement) plus the **Neon Ledger** expansion.

Static site. No build step, no dependencies, no backend. Five files.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

## Put it on the web

From inside this folder:

```
npx vercel link --yes --project technomancers-terminal
npx vercel --prod
```

The first line only has to run once — it writes a `.vercel/` folder that ties
this directory to the Vercel project. After that, `npx vercel --prod` is the
whole deploy: Vercel detects a static site, uploads the five files and hands
back the URL. `vercel.json` only sets cache headers.

Every later change — a new campaign, an edit to the data — is the same single
command from this folder.

Any other static host works too — Netlify drop, GitHub Pages, Cloudflare Pages,
an S3 bucket. Nothing here needs a server.

## The files

| File | What it is |
|---|---|
| `index.html` | Shell markup and all the CSS. |
| `app.js` | The whole application. Vanilla JS, one IIFE, no framework. |
| `data.js` | `window.TTB` — everything extracted from the Textbook. |
| `expansion.js` | `window.TTBX` — the Neon Ledger expansion. |
| `campaigns.js` | `window.TTBC` — your campaigns. **This is the one you edit.** |

## Adding a campaign

Open `campaigns.js` and add an object to the `campaigns` array. The schema is
documented in a comment at the top of that file — every field except `id` and
`name` is optional. Redeploy and it shows up in the Campaign tab for everyone
who opens the site.

You can also build campaigns inside the app itself (Campaign → New campaign).
Those live in the visitor's own browser. Export one to `.json` and paste it into
`campaigns.js` to make it part of the site for everybody.

## Where characters are stored

In the visitor's browser (`localStorage`), never on a server. Sharing works by
encoding the character into the URL after `#c=` — anyone who opens that link
gets the character, and can save their own copy. Nothing is uploaded.

## Printing

Four layouts, all from the Play step:

- **Classic sheet** — two pages, the traditional 5e layout.
- **Pocket card** — two cards, the numbers you actually reach for mid-combat.
- **Ability cards** — one cut-out card per feature.
- **Full dossier** — everything, printed straight through.
