/* Service worker: a partial install must not replace a working cache.
 *
 * Serves the site over HTTP (service workers need a real origin). The second
 * install is served a bumped CACHE name AND a failing app/boot.js, which is exactly
 * the real-world case: a deploy reached a phone on a weak connection. */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Results, ROOT } = require("./lib");

const TYPES = { ".html": "text/html", ".js": "text/javascript",
                ".json": "application/json", ".svg": "image/svg+xml" };

function serve(port, state) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";

    if (state.fail.indexOf(p) >= 0) { res.writeHead(503); res.end("nope"); return; }

    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end("no"); return;
    }
    let body = fs.readFileSync(file);
    // Rewrite the worker's cache name so the test controls when it re-installs.
    if (p === "/sw.js") {
      body = Buffer.from(String(body).replace(/var CACHE = "[^"]*";/, 'var CACHE = "' + state.cache + '";'));
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/"
    });
    res.end(body);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

module.exports = async function (browser) {
  const R = new Results();

  /* ---- gm.js pure helpers, no server needed ---------------------------- */
  {
    // FILE_URL is derived from __dirname. An absolute path written by hand is
    // right on exactly one machine and wrong on every CI runner.
    const { appPage, FILE_URL } = require("./lib");
    const { page, ctx } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);

    const roll = await page.evaluate(() => {
      const G = window.TTGM;
      if (!G.rollExpr) return { missing: true };
      return {
        five: G.rollExpr("5"),
        mixed: G.rollExpr("5 + 1d4"),
        dice: G.rollExpr("2d6+3"),
        junk: G.rollExpr("banana"),
        empty: G.rollExpr("")
      };
    });
    R.check("item 14, a bare constant is worth itself",
      !roll.missing && roll.five && roll.five.total === 5 && roll.five.ok !== false,
      JSON.stringify(roll.five));
    R.check("item 14, a leading constant is not dropped",
      !roll.missing && roll.mixed && roll.mixed.total >= 6 && roll.mixed.total <= 9,
      JSON.stringify(roll.mixed));
    R.check("item 14, dice still work",
      !roll.missing && roll.dice && roll.dice.total >= 5 && roll.dice.total <= 15,
      JSON.stringify(roll.dice));
    R.check("item 14, unparseable input is reported, not rolled as zero",
      !roll.missing && roll.junk && roll.junk.ok === false, JSON.stringify(roll.junk));
    await ctx.close();
  }

  const PORT = 8824;
  const base = "http://127.0.0.1:" + PORT + "/";
  const state = { cache: "test-v1", fail: [] };
  const server = await serve(PORT, state);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const cacheMap = () => page.evaluate(async () => {
    const out = {};
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      out[k] = (await c.keys()).map(x => new URL(x.url).pathname).sort();
    }
    return out;
  });

  try {
    /* 1. healthy install */
    await page.goto(base);
    await page.waitForTimeout(2500);
    const first = await cacheMap();
    const firstKey = Object.keys(first)[0];
    R.check("healthy install caches the whole shell",
      firstKey === "test-v1" && first["test-v1"] && first["test-v1"].length >= 8,
      JSON.stringify(first));

    /* 2. offline works */
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(700);
    R.check("offline reload serves the app", await page.evaluate(() => !!window.TT));
    await ctx.setOffline(false);

    /* 3. a new version whose app/boot.js 503s must not destroy the good cache */
    state.cache = "test-v2";
    state.fail = ["/app/boot.js"];
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      if (r) { try { await r.update(); } catch (e) {} }
    });
    await page.waitForTimeout(3000);

    const after = await cacheMap();
    const intact = Object.keys(after).filter(k => (after[k] || []).indexOf("/app/boot.js") >= 0);
    R.check("a complete cache survives a failed update", intact.length >= 1,
      JSON.stringify(after));
    R.check("the incomplete cache did not replace the good one",
      !(after["test-v2"] && !after["test-v1"] && after["test-v2"].indexOf("/app/boot.js") < 0),
      JSON.stringify(after));

    /* 4. and the app still loads offline afterwards, the whole point */
    state.fail = [];
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(900);
    const still = await page.evaluate(() => ({ tt: !!window.TT, gm: !!window.TTGM }));
    R.check("app still loads offline after a failed update",
      still.tt === true && still.gm === true, JSON.stringify(still));
    await ctx.setOffline(false);
  } finally {
    await ctx.close();
    await new Promise(r => server.close(r));
  }

  return R;
};
