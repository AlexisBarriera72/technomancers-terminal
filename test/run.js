#!/usr/bin/env node
/* Test runner. `npm test` runs everything; `npm test -- rules` runs one suite. */
"use strict";

const { chromium } = require("playwright");
const { launchOptions } = require("./lib");

const SUITES = {
  rules: require("./rules.test"),
  browser: require("./browser.test"),
  sw: require("./sw.test"),
  story: require("./story.test"),
  city: require("./city.test"),
  player: require("./player.test"),
  spells: require("./spells.test"),
  maps: require("./maps.test"),
  sync: require("./sync.test"),
  untranslated: require("./untranslated.test")
};

(async () => {
  const want = process.argv.slice(2).filter(a => SUITES[a]);
  const names = want.length ? want : Object.keys(SUITES);

  const browser = await chromium.launch(launchOptions());
  let passed = 0;
  const failed = [];

  for (const name of names) {
    let R;
    try {
      R = await SUITES[name](browser);
    } catch (e) {
      console.log("\n" + name + "\n  FAIL suite threw\n         " + (e && e.stack || e));
      failed.push(name + ": suite threw");
      continue;
    }
    R.report(name);
    passed += R.passed;
    R.failed.forEach(f => failed.push(name + ": " + f));
  }

  await browser.close();

  console.log("\n" + "-".repeat(56));
  if (failed.length) {
    console.log(passed + " passed, " + failed.length + " FAILED");
    failed.forEach(f => console.log("  × " + f));
    process.exit(1);
  }
  console.log(passed + " passed");
})().catch(e => { console.error(e); process.exit(1); });
