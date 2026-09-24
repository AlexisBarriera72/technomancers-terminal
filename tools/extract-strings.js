#!/usr/bin/env node
/* Collect every English string that actually reaches the screen.
 *
 * The translation table is keyed by the text applyLang() sees, not by the
 * string literals in app.js, those are concatenation fragments and half of
 * them never appear on their own. So this drives the real application through
 * every screen it has and reads the DOM back.
 *
 * Output: tools/strings.json, split into `ui` (written by the application) and
 * `book` (text that exists verbatim in a data file), because those two are
 * translated in different passes and carry different risk.
 *
 *   node tools/extract-strings.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..");
const { launchOptions } = require(path.join(ROOT, "test/lib"));

const DATA_FILES = ["data.js", "expansion.js", "srd.js", "campaigns.js"];
const OUT = path.join(__dirname, "strings.json");

/* Digit runs become {0}, {1}… exactly as T() does, so the keys we emit are the
   keys the runtime will look up. */
function numKey(str) {
  let i = 0;
  return str.replace(/\d+/g, () => "{" + i++ + "}");
}

/* The data files are JSON with \uXXXX escapes, so grepping their raw source for
   an em dash never matches. Load them for real and flatten every string. */
function dataBlob() {
  const sandbox = { window: {} };
  for (const f of DATA_FILES) {
    // eslint-disable-next-line no-new-func
    new Function("window", fs.readFileSync(path.join(ROOT, f), "utf8"))(sandbox.window);
  }
  const out = [];
  (function walk(o) {
    if (typeof o === "string") return out.push(o);
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    Object.keys(o).forEach(k => walk(o[k]));
  })(sandbox.window);
  return { exact: new Set(out), blob: out.join("\n") };
}

/* A short word is book text only if a data file holds it whole. A plain
   substring test files "Forge" under the book because some feature happens to
   say "forge a credential", and the masthead then never gets translated. */
const LONG = 40;
function isBookText(text, data) {
  if (data.exact.has(text)) return true;
  return text.length >= LONG && data.blob.indexOf(text) >= 0;
}

(async () => {
  const data = dataBlob();

  const browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("file://" + ROOT + "/index.html#gm=cathedra");
  await page.waitForFunction(() => !!window.TT, null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const found = await page.evaluate(async () => {
    const T = window.TT, G = window.TTGM;
    const seen = new Map();          // text -> where we first saw it
    const ATTRS = ["title", "aria-label", "placeholder", "alt"];

    function harvest(where) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let n;
      while ((n = w.nextNode())) {
        const pn = n.parentNode && n.parentNode.nodeName;
        if (pn === "SCRIPT" || pn === "STYLE" || pn === "TEXTAREA") continue;
        const v = n.nodeValue.trim();
        if (!v || !/[A-Za-z]/.test(v)) continue;
        if (!seen.has(v)) seen.set(v, where);
      }
      document.body.querySelectorAll("[" + ATTRS.join("],[") + "]").forEach(e => {
        ATTRS.forEach(a => {
          const v = e.getAttribute(a);
          if (v && /[A-Za-z]/.test(v) && !seen.has(v.trim())) seen.set(v.trim(), where + " @" + a);
        });
      });
    }

    // A character complete enough that no step renders an empty placeholder.
    const c = T.blank();
    c.name = "Nyx"; c.cls = "Rogue"; c.sub = "rogue-saboteur"; c.bg = "hacker";
    c.level = 8; c.skills = ["Stealth", "Perception"];
    localStorage.setItem("ttb.character.v1", JSON.stringify(c));

    // Forge: every step, with the beginner guide both on and off, because the
    // guide is a large body of text that only renders when it is on.
    for (const help of [true, false]) {
      const gb = document.querySelector("#guideBtn");
      if (gb && String(gb.getAttribute("aria-pressed") === "true") !== String(help)) gb.click();
      for (let step = 0; step < 12; step++) {
        T.setMode("forge");
        const rail = [...document.querySelectorAll(".rail .step")];
        if (step >= rail.length) break;
        rail[step].click();
        harvest("forge/step" + step + (help ? "/guide" : ""));
      }
    }

    // Codex, every section.
    T.setMode("codex"); T.render();
    const secs = [...document.querySelectorAll(".rail .step")];
    for (let i = 0; i < secs.length; i++) {
      [...document.querySelectorAll(".rail .step")][i].click();
      harvest("codex/" + i);
    }

    // Campaign.
    T.setMode("campaign"); T.render(); harvest("campaign");

    // GM tools, every screen.
    if (G) {
      T.setMode("table");
      for (let i = 0; i < 8; i++) {
        T.gmSec(i); T.render();
        harvest("gm/" + i);
      }
    }

    // Print preview, every layout.
    T.setMode("forge"); T.render();
    for (const kind of ["classic", "pocket", "cards", "full"]) {
      const b = [...document.querySelectorAll("button")].find(x => /print|sheet|card|dossier/i.test(x.textContent));
      if (b) b.click();
      harvest("print/" + kind);
    }

    return [...seen.entries()].map(([text, where]) => ({ text, where }));
  });

  await ctx.close();
  await browser.close();

  const ui = {}, book = {};
  let uiChars = 0, bookChars = 0;
  for (const { text, where } of found) {
    const key = numKey(text);
    // Book text is text that exists verbatim in a data file. Everything else
    // the application wrote itself.
    const isBook = isBookText(text, data);
    const bag = isBook ? book : ui;
    if (!bag[key]) bag[key] = { sample: text, where };
    if (isBook) bookChars += text.length; else uiChars += text.length;
  }

  fs.writeFileSync(OUT, JSON.stringify({ ui, book }, null, 1));
  console.log("ui:   " + Object.keys(ui).length + " keys, " + uiChars + " chars");
  console.log("book: " + Object.keys(book).length + " keys, " + bookChars + " chars");
  console.log("wrote " + path.relative(ROOT, OUT));
})().catch(e => { console.error(e); process.exit(1); });
