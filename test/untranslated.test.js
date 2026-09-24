/* Spanish lint: every screen drawn in Spanish, compared with a baseline.
 *
 * Draws the Forge's eight steps, every Codex section and every GM screen (the
 * demo table loaded, the Toolkit's drop-downs open) with the language set to
 * Spanish, and collects the text that still looks English: a node with a
 * common English word in it, outside anything marked data-nolang. What is
 * left today is mostly proper nouns and book titles, and it is listed in
 * untranslated-baseline.txt.
 *
 * A string that is not in the baseline fails the suite, and is printed, so a
 * new label can't ship in English by accident. A baseline line that no longer
 * appears passes, with a reminder to take it out.
 *
 * To accept the current state on purpose:  node test/untranslated.test.js --write
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { Results, appPage, FILE_URL } = require("./lib");

const BASELINE = path.join(__dirname, "untranslated-baseline.txt");

async function collect(browser) {
  const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
  await page.evaluate(() => localStorage.setItem("ttb.lang", "es"));
  await page.reload();
  await page.waitForFunction(() => window.TT && window.TTES && window.TTES.book, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const out = await page.evaluate(async () => {
    const T = window.TT, wait = () => new Promise(r => setTimeout(r, 30));
    window.TTGM.loadDemo();
    const EN = /\b(the|and|with|your|you|this|that|what|when|from|into|every|their|they|choose|level)\b/i;
    const seen = new Set();
    const grab = () => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue.trim();
        if (!t || !/[a-z]/i.test(t)) continue;
        const e = n.parentElement;
        if (!e || e.closest("[data-nolang],script,style,textarea,.print-root,.toast")) continue;
        if (EN.test(t)) seen.add(t.slice(0, 120));
      }
    };
    T.setMode("forge");
    for (let i = 0; i < 8; i++) { T.render(); document.querySelectorAll(".rail .step")[i].click(); await wait(); grab(); }
    T.setMode("codex"); T.render();
    const n = document.querySelectorAll(".rail .step").length;
    for (let i = 0; i < n; i++) { document.querySelectorAll(".rail .step")[i].click(); await wait(); grab(); }
    T.setMode("table"); T.gmSec(0); T.render();
    const gm = document.querySelectorAll(".rail .step").length;
    for (let i = 0; i < gm; i++) {
      T.setMode("table"); T.gmSec(i); T.render();
      document.querySelectorAll("#stage details.gm-tool").forEach(d => { d.open = true; d.dispatchEvent(new Event("toggle")); });
      await wait(); grab();
    }
    T.setLang("en");
    return [...seen].sort();
  });
  await ctx.close();
  return { out, errors };
}

module.exports = async function (browser) {
  const R = new Results();
  const { out, errors } = await collect(browser);
  const base = fs.existsSync(BASELINE)
    ? fs.readFileSync(BASELINE, "utf8").split("\n").filter(Boolean) : [];
  const fresh = out.filter(t => base.indexOf(t) < 0);
  const gone = base.filter(t => out.indexOf(t) < 0);
  R.eq("no new English left on a Spanish screen", fresh, []);
  if (gone.length) {
    console.log("\n  note: " + gone.length + " baseline line(s) are translated now; " +
      "run `node test/untranslated.test.js --write` to shrink the baseline.");
  }
  R.check("the screens were actually drawn", out.length > 20, String(out.length));
  R.eq("no page errors drawing every screen in Spanish", errors, []);
  return R;
};

if (require.main === module && process.argv.indexOf("--write") >= 0) {
  (async () => {
    const { chromium } = require("playwright");
    const { launchOptions } = require("./lib");
    const b = await chromium.launch(launchOptions());
    const { out } = await collect(b);
    fs.writeFileSync(BASELINE, out.join("\n") + "\n");
    console.log("wrote " + out.length + " lines to " + path.relative(process.cwd(), BASELINE));
    await b.close();
  })();
}
