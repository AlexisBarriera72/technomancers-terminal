#!/usr/bin/env node
/* Guard: no em dashes anywhere in the site, its Spanish, its docs or its tests.
 *
 * The house style is commas, colons and brackets. Spanish keys are the exact
 * English text they translate, so a dash that comes back in one place and not
 * the other silently leaves a line in English; failing here is cheaper.
 * Matches the character itself, its JSON escape and its HTML entities.
 * En dashes (–) are fine: they mark ranges like 3–12.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
// Built from parts so this file does not match itself.
const BAD = new RegExp([String.fromCharCode(0x2014), "\\\\u" + "2014",
  "&md" + "ash;", "&#82" + "12;", "&#x20" + "14;"].join("|"), "i");
const DIRS = [".", "app", "test", "tools"];
const EXT = /\.(js|html|md|json|css|txt)$|^\.gitignore$/;
const SKIP = { "package-lock.json": 1, "strings.json": 1 };

const failures = [];
DIRS.forEach(dir => {
  fs.readdirSync(path.join(ROOT, dir))
    .filter(f => EXT.test(f) && !SKIP[f])
    .forEach(f => {
      const rel = path.join(dir, f);
      fs.readFileSync(path.join(ROOT, rel), "utf8").split("\n").forEach((line, i) => {
        if (BAD.test(line)) failures.push(rel + ":" + (i + 1) + "  " + line.trim().slice(0, 100));
      });
    });
});

if (failures.length) {
  console.error("Em dash found (use a comma, colon or brackets):\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("no-em-dash: clean");
