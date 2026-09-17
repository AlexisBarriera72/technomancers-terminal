/* Minimal test harness. No framework — one dev dependency is enough.
 *
 * The app is a DOM application with no module exports, so even the "unit"
 * tests run inside a real browser against window.TT, the namespace app.js
 * already publishes for gm.js. That is honest about what is being tested:
 * the code as it actually runs.
 */
"use strict";

const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const FILE_URL = "file://" + ROOT + "/index.html";
// Chromium ships in the image; fall back to whatever Playwright resolves.
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// Google Fonts is blocked in CI sandboxes; those failures are not ours.
const IGNORABLE = /ERR_CERT_AUTHORITY_INVALID|fonts\.g|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_FAILED|ERR_INTERNET_DISCONNECTED/;

function launchOptions() {
  const fs = require("fs");
  return fs.existsSync(CHROME) ? { executablePath: CHROME } : {};
}

class Results {
  constructor() { this.passed = 0; this.failed = []; this.lines = []; }
  check(name, ok, detail) {
    if (ok) { this.passed++; this.lines.push("  ok   " + name); }
    else { this.failed.push(name); this.lines.push("  FAIL " + name + (detail ? "\n         " + detail : "")); }
  }
  eq(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    this.check(name, ok, ok ? "" : "expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
  }
  report(suite) {
    console.log("\n" + suite);
    console.log(this.lines.join("\n"));
    return this.failed;
  }
}

/* A page with the app loaded and window.TT available. */
async function appPage(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext(opts.context || {});
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => {
    if (m.type() === "error" && !IGNORABLE.test(m.text())) errors.push("console: " + m.text());
  });
  await page.goto(opts.url || FILE_URL);
  await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
  await page.waitForTimeout(150);
  return { page, ctx, errors };
}

/* Encode a character the same way the app's share button does. */
function shareCode(charObj) {
  const slim = {};
  Object.keys(charObj).forEach(k => {
    const v = charObj[k];
    if (v == null || v === "" || v === false) return;
    if (Array.isArray(v) && !v.length) return;
    if (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) return;
    slim[k] = v;
  });
  return Buffer.from(JSON.stringify(slim), "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* A complete, legal character to mutate per test. */
function baseChar(over) {
  return Object.assign({
    id: "ctest", name: "Test", level: 5, cls: "Rogue", method: "pointbuy",
    scores: { Str: 10, Dex: 15, Con: 13, Int: 12, Wis: 10, Cha: 8 },
    rolled: null, arrayMap: {}, skills: [], bgPicks: [], techSwap: false, techReplaces: null,
    sub: null, origin: null, cred: 0, asi: [], picks: {}, sleeve: null,
    subChoices: {}, style: null, feats: [], invocations: [], infusions: [],
    cyber: [], augments: [], gear: [], traits: {}
  }, over || {});
}

module.exports = { ROOT, FILE_URL, launchOptions, Results, appPage, shareCode, baseChar, IGNORABLE };
