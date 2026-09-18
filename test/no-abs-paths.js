#!/usr/bin/env node
/* Guard: no absolute filesystem paths in the test suite.
 *
 * A hardcoded path is right on exactly one machine. test/sw.test.js once pointed
 * a file:// URL at this container's checkout directory, which passed here and
 * failed on CI with ERR_FILE_NOT_FOUND — the one class of bug that is invisible
 * on the machine that wrote it, which is what this cheap check is for.
 *
 * Paths belong to test/lib.js, which derives them from __dirname.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const BAD = /(?:file:\/\/)?\/(?:home|Users|tmp|var|opt)\//;
// lib.js owns the one legitimate absolute path (CHROME), resolved from env.
const ALLOW = { "lib.js": /CHROME_PATH|pw-browsers/ };

let failures = [];

fs.readdirSync(DIR)
  .filter(f => f.endsWith(".js") && f !== path.basename(__filename))
  .forEach(file => {
    const text = fs.readFileSync(path.join(DIR, file), "utf8");
    text.split("\n").forEach((line, i) => {
      if (!BAD.test(line)) return;
      const allow = ALLOW[file];
      if (allow && allow.test(line)) return;
      failures.push("  test/" + file + ":" + (i + 1) + "  " + line.trim().slice(0, 100));
    });
  });

if (failures.length) {
  console.error("Absolute paths in the test suite — these break on any other machine:\n");
  console.error(failures.join("\n"));
  console.error("\nUse FILE_URL / ROOT from test/lib.js instead.");
  process.exit(1);
}
console.log("no absolute paths in test/");
