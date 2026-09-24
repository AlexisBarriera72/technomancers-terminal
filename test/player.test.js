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

  return R;
};
