#!/usr/bin/env node
/* How much of the rules text is translated, by group.
 *
 * Compares tools/book-worklist.js against the keys in es-book.js (and es-ui.js,
 * which carries the shared vocabulary). Anything missing renders in English, so
 * this reports progress rather than failure.
 */
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const w = {};
new Function("window", fs.readFileSync(path.join(ROOT, "es-book.js"), "utf8"))(w);
new Function("window", fs.readFileSync(path.join(ROOT, "es-ui.js"), "utf8"))(w);
const have = Object.assign({}, w.TTES.book, w.TTES.ui);

const GROUPS = ["classes", "archetypes", "feats", "backgrounds", "gear", "setting", "campaigns"];
let tn = 0, td = 0, tc = 0, tdc = 0;
const missing = {};
for (const g of GROUPS) {
  const out = execFileSync(process.execPath, [path.join(__dirname, "book-worklist.js"), g], { encoding: "utf8" });
  const rows = out.split("\n").filter(Boolean).map(l => JSON.parse(l.slice(l.indexOf("\t") + 1)));
  const gone = rows.filter(r => !have[r]);
  missing[g] = gone;
  const chars = rows.reduce((a, b) => a + b.length, 0);
  const doneChars = rows.filter(r => have[r]).reduce((a, b) => a + b.length, 0);
  tn += rows.length; td += rows.length - gone.length; tc += chars; tdc += doneChars;
  const pct = rows.length ? Math.round((rows.length - gone.length) / rows.length * 100) : 100;
  console.log(g.padEnd(12) + String(rows.length - gone.length).padStart(5) + " / " +
              String(rows.length).padEnd(6) + String(pct).padStart(4) + "%" +
              ("  " + Math.round(doneChars / 1024) + "k / " + Math.round(chars / 1024) + "k").padStart(16));
}
console.log("-".repeat(46));
console.log("total".padEnd(12) + String(td).padStart(5) + " / " + String(tn).padEnd(6) +
            String(Math.round(td / tn * 100)).padStart(4) + "%" +
            ("  " + Math.round(tdc / 1024) + "k / " + Math.round(tc / 1024) + "k").padStart(16));

if (process.argv[2] && missing[process.argv[2]]) {
  missing[process.argv[2]].forEach((s, i) => console.log(i + "\t" + JSON.stringify(s)));
}
