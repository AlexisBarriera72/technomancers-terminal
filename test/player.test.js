/* The player's side additions: the level-up panel, inventory and credits,
 * the turn quick-cards and the Puppeteer's frames. Driven through the page. */
"use strict";
const { Results, appPage, baseChar } = require("./lib");

async function withChar(browser, over) {
  const out = await appPage(browser);
  await out.page.evaluate(c => {
    localStorage.setItem("ttb.character.v1", JSON.stringify(window.TT.migrate(c)));
  }, baseChar(over));
  await out.page.reload();
  await out.page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
  await out.page.waitForTimeout(200);
  return out;
}
const goStep = (page, name) => page.evaluate(n => {
  const b = [...document.querySelectorAll(".rail .step")].find(x => x.textContent.indexOf(n) >= 0);
  if (b) b.click();
}, name);
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("ttb.character.v1")));

module.exports = async function (browser) {
  const R = new Results();

  /* ============================ the level-up panel ============================ */
  {
    const { page, ctx, errors } = await withChar(browser, { cls: "Puppeteer", level: 4, bg: "hacker",
      scores: { Str: 10, Dex: 14, Con: 13, Int: 15, Wis: 12, Cha: 8 } });
    const setLevel = n => page.evaluate(n => {
      const r = document.querySelector("#levelRange");
      r.value = n; r.dispatchEvent(new Event("input")); r.dispatchEvent(new Event("change"));
    }, n);
    const none = await page.evaluate(() => !!document.querySelector(".lvlup"));
    await setLevel(5);
    const up = await page.evaluate(() => {
      const p = document.querySelector(".lvlup");
      return p ? { h: p.querySelector("h3").textContent, text: p.textContent,
                   todo: [...p.querySelectorAll(".lvlup-todo span")].map(x => x.textContent) } : null;
    });
    R.eq("no level-up panel until the level goes up", none, false);
    R.eq("raising the level opens the level-up panel", up && up.h, "Level up: 4 → 5");
    R.check("it says what arrived at level 5", /Split Attention/.test(up.text) && /Frames 1 → 2/.test(up.text), up.text.slice(0, 200));
    R.check("and what the numbers became", /Max HP/.test(up.text) && /Proficiency\+2 → \+3/.test(up.text), up.text);
    R.check("and the choice still to make", up.todo.some(t => /ability\/feat choice/.test(t)), JSON.stringify(up.todo));

    await setLevel(7);
    R.eq("a further raise widens it", await page.evaluate(() => document.querySelector(".lvlup h3").textContent), "Level up: 4 → 7");
    await page.evaluate(() => [...document.querySelectorAll(".lvlup-todo button")][0].click());
    const there = await page.evaluate(() => (document.querySelector("#stage h2") || {}).textContent);
    R.check("Take me there opens the Level-Ups step", /Level-up choices|Level-Ups/i.test(there), there);
    await setLevel(3);
    R.eq("lowering below where it started closes it", await page.evaluate(() => !!document.querySelector(".lvlup")), false);
    await setLevel(5);
    await page.evaluate(() => [...document.querySelectorAll(".lvlup button")].find(b => b.textContent === "Done").click());
    const after = await page.evaluate(() => ({ panel: !!document.querySelector(".lvlup"),
      what: [...document.querySelectorAll("#dossier button")].some(b => /What changed at level 5/.test(b.textContent)) }));
    R.eq("Done closes it, and the dossier can bring it back", after, { panel: false, what: true });
    R.eq("no page errors levelling up", errors, []);
    await ctx.close();
  }

  /* ============================ inventory and credits ============================ */
  {
    const { page, ctx, errors } = await withChar(browser, { bg: "hacker",
      scores: { Str: 10, Dex: 15, Con: 13, Int: 12, Wis: 10, Cha: 8 } });
    await goStep(page, "Chrome");
    await page.evaluate(() => {
      const tog = [...document.querySelectorAll(".sec-toggle")].find(t => /Firearm List/.test(t.textContent));
      tog.click();
      document.querySelector('[aria-label="Add Dart Gun"]').click();
    });
    let c = await saved(page);
    R.eq("adding a Dart Gun records its weight from the book", [c.gear[0].name, c.gear[0].wt], ["Dart Gun", 3]);
    await page.evaluate(() => document.querySelector('[aria-label="One more Dart Gun"]').click());
    c = await saved(page);
    const inv = await page.evaluate(() => document.querySelector(".inv-carry").textContent);
    R.eq("+ makes it two", c.gear[0].qty, 2);
    R.check("and the carried weight doubles", /Carrying6 lb/.test(inv.replace(/\s+/g, "")) || /6 lb/.test(inv), inv);

    await page.evaluate(() => [...document.querySelectorAll(".inv button")].find(b => b.textContent === "Starting credits").click());
    c = await saved(page);
    R.eq("Starting credits reads the Hacker's credit stick", c.credits, 500);
    await page.evaluate(() => { const i = document.querySelector("#invCredits"); i.value = "5000"; i.dispatchEvent(new Event("change")); });
    const left = await page.evaluate(() => [...document.querySelectorAll(".inv-row b")].map(b => b.textContent));
    R.eq("credits left take off two Dart Guns", left, ["3,200₵", "1,800₵"]);

    await page.evaluate(() => {
      const [n, co, w] = document.querySelectorAll(".inv-add input");
      n.value = "Grandmother's lighter"; co.value = "sentimental"; w.value = "0.5";
      [...document.querySelectorAll(".inv-add button")][0].click();
    });
    c = await saved(page);
    const custom = c.gear.find(g => g.custom);
    R.eq("a custom item goes in with its weight", custom && [custom.name, custom.wt, custom.cost], ["Grandmother's lighter", 0.5, "sentimental"]);

    const mig = await page.evaluate(() => window.TT.migrate({ id: "old", name: "Old", level: 3, cls: "Rogue",
      gear: [{ key: "Firearm List|Hunting Rifle", name: "Hunting Rifle", cost: "1,700₵" },
             { key: "Armor|Nonsense", name: "Nonsense", cost: "1₵", qty: "lots", wt: -4 }] }).gear);
    R.eq("an old save gets weights filled in, and bad values are dropped", mig.map(g => [g.name, g.wt, g.qty]),
      [["Hunting Rifle", 7, undefined], ["Nonsense", undefined, undefined]]);

    await goStep(page, "Play Sheet");
    const sheet = await page.evaluate(() => [...document.querySelectorAll(".sheet-sec")].find(x => /Chrome & gear/.test(x.textContent)).textContent);
    R.check("the play sheet lists the count, the weight and the credits left",
      /Dart Gun ×2/.test(sheet) && /Carrying 6\.5 lb of 150 lb/.test(sheet) && /Credits left: 1,800₵/.test(sheet), sheet.slice(0, 300));
    R.eq("no page errors in the inventory", errors, []);
    await ctx.close();
  }

  /* ============================ turn cards and frames ============================ */
  {
    const { page, ctx, errors } = await withChar(browser, { cls: "Puppeteer", level: 5, bg: "hacker",
      scores: { Str: 10, Dex: 14, Con: 13, Int: 15, Wis: 12, Cha: 8 } });
    await goStep(page, "Play Sheet");
    const deck = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".tcard")];
      const bonus = cards.find(c => c.querySelector(".tcard-k").textContent === "Bonus action");
      const shut = bonus.querySelector(".tcard-body").hidden;
      bonus.click();
      return { names: cards.map(c => c.querySelector(".tcard-k").textContent), shut,
               open: !bonus.querySelector(".tcard-body").hidden,
               own: [...bonus.querySelectorAll(".tcard-line b")].map(b => b.textContent) };
    });
    R.eq("the turn deck has its cards", deck.names, ["Move", "Action", "Bonus action", "Reaction", "Free", "Conditions"]);
    R.check("a card opens when tapped", deck.shut && deck.open, JSON.stringify(deck));
    R.check("and the Bonus action card carries the character's own", deck.own.some(n => /Remote Body|Jump Rig/.test(n)), JSON.stringify(deck.own));

    const fr = await page.evaluate(() => {
      const d = document.querySelector(".drones");
      return { frames: d.querySelectorAll(".frame").length, up: d.querySelector(".uplink b").textContent };
    });
    R.eq("a level 5 Puppeteer has two frames and 5 Uplink", fr, { frames: 2, up: "5 / 5" });
    await page.evaluate(() => {
      const f = document.querySelector(".frame");
      [...f.querySelectorAll(".frame-pad button")].find(b => b.textContent === "-5").click();
      [...document.querySelectorAll(".uplink-opts button")].find(b => /^Overclock Servos/.test(b.textContent)).click();
    });
    let c = await saved(page);
    const after = await page.evaluate(() => ({ hp: document.querySelector(".frame .frame-hp .v").textContent,
      up: document.querySelector(".uplink b").textContent }));
    R.eq("a tier 2 frame at level 5 has 45 HP, and takes 5", [c.frames[0].hp, after.hp], [40, "40 / 45"]);
    R.eq("spending Overclock Servos takes 2 Uplink", [c.uplinkUsed, after.up], [2, "3 / 5"]);
    await page.evaluate(() => [...document.querySelectorAll(".uplink button")].find(b => b.textContent === "Long rest").click());
    c = await saved(page);
    R.check("a long rest refills it", !c.uplinkUsed, JSON.stringify(c.uplinkUsed));

    const es = await page.evaluate(() => {
      const T = window.TT; T.setLang("es"); T.render();
      const out = { deck: (document.querySelector(".turn-deck h3") || {}).textContent,
                    frames: (document.querySelector(".drones h3") || {}).textContent };
      T.setLang("en");
      return out;
    });
    R.eq("in Spanish the new sheet sections translate", es, { deck: "En tu turno", frames: "Chasis" });
    R.eq("no page errors on the play sheet", errors, []);
    await ctx.close();
  }
  {
    const { page, ctx } = await withChar(browser, {});
    await goStep(page, "Play Sheet");
    R.eq("a Rogue has no frames panel", await page.evaluate(() => !!document.querySelector(".drones")), false);
    await ctx.close();
  }

  /* ======================= the level slider on a phone ======================= */
  {
    const { page, ctx, errors } = await (async () => {
      const out = await appPage(browser, { context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } });
      await out.page.evaluate(c => localStorage.setItem("ttb.character.v1", JSON.stringify(window.TT.migrate(c))),
        baseChar({ level: 3, bg: "hacker" }));
      await out.page.reload();
      await out.page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
      await out.page.waitForTimeout(200);
      return out;
    })();
    const y = () => page.evaluate(() => Math.round(document.querySelector("#levelRange").getBoundingClientRect().top));
    const slide = (lv, ev) => page.evaluate(a => {
      const r = document.querySelector("#levelRange"); r.value = a[0]; r.dispatchEvent(new Event(a[1]));
    }, [lv, ev]);
    await goStep(page, "Level");
    await page.locator("#levelRange").scrollIntoViewIfNeeded();
    const y0 = await y(), moved = [];
    for (let lv = 4; lv <= 12; lv++) { await slide(lv, "input"); moved.push(await y() - y0); }
    R.check("dragging the level on a phone keeps the slider under the finger",
      moved.every(d => Math.abs(d) <= 2), JSON.stringify(moved));
    await slide(12, "change");
    R.check("and letting go leaves it where it was", Math.abs(await y() - y0) <= 2, String(await y() - y0));
    await goStep(page, "Play Sheet");
    await page.locator("#levelRange").scrollIntoViewIfNeeded();
    const y1 = await y();
    await slide(13, "input"); await slide(13, "change");
    R.check("on the play sheet too, where the level-up panel opens above", Math.abs(await y() - y1) <= 2, String(await y() - y1));
    await page.getByRole("button", { name: "One level up" }).click();
    R.eq("the + button raises the level by one", (await saved(page)).level, 14);
    await page.getByRole("button", { name: "One level down" }).click();
    await page.getByRole("button", { name: "One level down" }).click();
    R.eq("the − button lowers it", (await saved(page)).level, 12);
    R.check("the + button stays put on screen too", Math.abs(await y() - y1) <= 2, String(await y() - y1));
    const small = await page.evaluate(() => [...document.querySelectorAll("input:not([type=range]):not([type=checkbox]):not([type=radio]), select, textarea")]
      .filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.id || e.className || e.tagName));
    R.eq("no field on a phone is small enough for iOS to zoom into", small, []);
    R.eq("no page errors with the slider on a phone", errors, []);
    await ctx.close();
  }

  /* ============================ street prices ============================ */
  {
    const loadout = { bg: "hacker", credits: 25000,
      cyber: [{ name: "Auto-Injector", tier: "1" }, { name: "Bone Lacing", tier: "2" }], augments: ["Cranium Bomb"],
      gear: [{ key: "Firearm List|Dart Gun", name: "Dart Gun", cost: "1,600₵" },
             { key: "custom-1", name: "Grandma's knife", cost: "500₵", custom: true }] };
    const { page, ctx, errors } = await withChar(browser, loadout);
    const P = (kind, cost, tier) => page.evaluate(a => window.TT.priceOf(a[0], a[1], a[2]), [kind, cost, tier]);
    R.eq("with no campaign, the book's prices", await page.evaluate(() => window.TT.spend()), 30000 + 350000 + 15000 + 1600 + 500);
    await goStep(page, "Chrome");
    R.check("the gear step says the prices are the book's", /Book prices/.test(await page.locator(".prices-note").innerText()), "");
    await page.locator(".prices-note button").click();          // Playing in Cathedra? Use its prices
    await page.waitForTimeout(100);
    R.eq("the button puts the character in Cathedra", (await saved(page)).campaign, "cathedra");
    // 30,000/10 + 350,000/25 + 15,000/2 + 1,600/2, and a custom item costs what its owner typed
    R.eq("on street prices the same kit costs far less", await page.evaluate(() => window.TT.spend()), 3000 + 14000 + 7500 + 800 + 500);
    R.eq("a Tier 1 Auto-Injector costs a tenth", await P("chrome", "30,000₵", "1"), 3000);
    R.eq("a Tier 3 one costs a hundredth", await P("chrome", "3,000,000₵", "3"), 30000);
    R.eq("a Tier 4 one costs a two-hundred-and-fiftieth", await P("chrome", "35,000,000₵", "4"), 140000);
    R.eq("gear costs half, rounded to a round number", await P("gear", "1,750₵"), 900);
    R.eq("cheap gear stays cheap", await P("gear", "3₵"), 2);
    const cells = await page.evaluate(() => {
      document.querySelectorAll(".sec-toggle").forEach(t => { if (/Firearm/.test(t.textContent)) t.click(); });
      const td = [...document.querySelectorAll("td.cost")].find(x => /book/.test(x.textContent));
      return td ? td.textContent : "";
    });
    R.check("the Forge shows the street price with the book's beside it", /^\d[\d,]*₵ book [\d,]+₵$/.test(cells), cells);
    await goStep(page, "Play Sheet");
    R.check("the play sheet lists street prices", /Auto-Injector \(Tier 1\), 3,000₵/.test(await page.locator(".sheet-sec").allInnerTexts().then(t => t.join("\n"))), "");
    R.eq("no page errors with street prices", errors, []);
    await ctx.close();
  }

  /* ============================ HP right now ============================ */
  {
    const { page, ctx, errors } = await withChar(browser, { level: 5 });
    await goStep(page, "Play Sheet");
    const hp = () => page.evaluate(() => { const c = JSON.parse(localStorage.getItem("ttb.character.v1")); return [c.hpNow, c.hpTemp || 0]; });
    const max = await page.evaluate(() => { const b = document.querySelector(".hp-big"); return +b.textContent.split("/")[1]; });
    await page.locator(".hp-amt").fill("4");
    await page.getByRole("button", { name: "Set temp HP" }).click();
    await page.getByRole("button", { name: "Take 5 damage" }).click();
    R.eq("damage eats temp HP first", await hp(), [max - 1, 0]);
    await page.getByRole("button", { name: "Heal 5" }).click();
    R.eq("healing stops at the maximum", (await hp())[0], max);
    await page.locator(".hp-amt").fill("999");
    await page.getByRole("button", { name: "Damage", exact: true }).click();
    R.eq("HP stops at 0", (await hp())[0], 0);
    await page.getByRole("button", { name: "Long rest" }).click();
    R.eq("a long rest fills it back up", await hp(), [max, 0]);
    R.check("opened from a file, the sheet says live sync needs the website", /works on the website/.test(await page.locator(".live-box").innerText()), "");
    R.eq("no page errors on the HP tracker", errors, []);
    await ctx.close();
  }

  return R;
};
