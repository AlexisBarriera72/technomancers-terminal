/* Guns: each firearm's attack and damage, its magazine read off the book's
 * reload property, the round counter on the play sheet, reloading from the
 * ammunition on the gear list, and the GM's view of every player's rounds. */
"use strict";
const { Results, appPage, baseChar, FILE_URL } = require("./lib");

const GEAR = [
  { key: "Firearm List|Pistol", name: "Pistol", cost: "1,000₵" },
  { key: "Firearm List|Assault Rifle", name: "Assault Rifle", cost: "3,000₵" },
  { key: "Ammunition|Bullets", name: "Bullets", cost: "3₵", qty: 50 },
  { key: "Melee Weapons|Garrote", name: "Garrote", cost: "100₵" }
];

async function withChar(browser, over, lang) {
  const out = await appPage(browser);
  await out.page.evaluate(([c, lang]) => {
    localStorage.setItem("ttb.character.v1", JSON.stringify(window.TT.migrate(c)));
    if (lang) localStorage.setItem("ttb.lang", lang);
  }, [baseChar(Object.assign({ cls: "Fighter", level: 3, credits: 20000,
    scores: { Str: 10, Dex: 16, Con: 14, Int: 10, Wis: 12, Cha: 8 }, gear: GEAR }, over)), lang || null]);
  await out.page.reload();
  await out.page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
  await out.page.evaluate(() => {
    const s = [...document.querySelectorAll(".rail .step")];
    s[s.length - 1].click();
  });
  await out.page.waitForTimeout(150);
  return out;
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("ttb.character.v1")));
const gunCard = (page, name) => page.evaluateHandle(n =>
  [...document.querySelectorAll(".weapon")].find(w => w.querySelector(".weapon-top b").textContent === n), name);

module.exports = async function (browser) {
  const R = new Results();

  /* ============================== the numbers ============================== */
  {
    const { page, ctx, errors } = await withChar(browser, {});
    const w = await page.evaluate(() => {
      const T = window.TT, d = T.statsOf(T.C || JSON.parse(localStorage.getItem("ttb.character.v1")));
      const one = (key, name) => T.weaponInfo({ key, name }, d);
      return { pistol: one("Firearm List|Pistol", "Pistol"), gl: one("Firearm List|Grenade Launcher", "Grenade Launcher"),
               ar: one("Firearm List|Assault Rifle", "Assault Rifle"), garrote: one("Melee Weapons|Garrote", "Garrote"),
               junk: one("Gear List|Rope", "Rope"), pb: d.pb };
    });
    R.eq("a pistol holds 10 and reloads with a bonus action", [w.pistol.cap, w.pistol.reloadAction, w.pistol.ammo, w.pistol.range],
      [10, false, "Bullets", "70/280"]);
    R.eq("its damage adds the Dex modifier it attacks with", [w.pistol.abil, w.pistol.damage], ["Dex", "2d4+3 piercing"]);
    R.eq("the attack is Dex plus proficiency when proficient",
      w.pistol.bonus, 3 + (w.pistol.proficient ? w.pb : 0));
    R.eq("a grenade launcher: 6 shots, an action to reload, the modifier on the first die only",
      [w.gl.cap, w.gl.reloadAction, w.gl.damage], [6, true, "1d8+3 piercing + 1d8 thunder"]);
    R.eq("an assault rifle is automatic and burst-fire", [w.ar.auto, w.ar.burst, w.ar.cap], [true, true, 20]);
    R.eq("a garrote is a weapon with no magazine", [w.garrote.gun, w.garrote.cap, w.garrote.damage], [false, null, "1d6+3 slashing"]);
    R.eq("a rope is not a weapon", w.junk, null);
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  /* ============================== the counter ============================== */
  {
    const { page, ctx, errors } = await withChar(browser, {});
    const s1 = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".weapons .weapon")];
      const card = n => cards.find(w => w.querySelector(".weapon-top b").textContent === n);
      const p = card("Pistol"), ar = card("Assault Rifle"), g = card("Garrote");
      return { names: cards.map(c => c.querySelector(".weapon-top b").textContent),
               pistol: p.querySelector(".mag-n").textContent + p.querySelector(".mag-count .of").textContent,
               pips: p.querySelectorAll(".pip.on").length, pistolBurst: p.querySelectorAll(".mag-btns .chip").length,
               arBurst: [...ar.querySelectorAll(".mag-btns .chip")].map(b => b.textContent),
               arBar: !!ar.querySelector(".mag-bar"), garroteMag: !!g.querySelector(".mag"),
               reloadTag: p.querySelector(".mag-btns .tag").textContent,
               reloadOff: p.querySelector(".mag-btns .btn:not(.primary)").disabled,
               spare: p.querySelector(".mag-spare").textContent,
               rules: !!document.querySelector(".weapons details.gun-rules"),
               deck: [...document.querySelectorAll(".tcard")].map(c => c.textContent).join(" | ") };
    });
    R.eq("the Weapons section lists every weapon on the gear list", s1.names, ["Pistol", "Assault Rifle", "Garrote"]);
    R.eq("a gun starts full", [s1.pistol, s1.pips], ["10/ 10", 10]);
    R.eq("only an automatic or burst-fire gun gets the −3 and −10 buttons", [s1.pistolBurst, s1.arBurst], [0, ["−3", "−10"]]);
    R.check("a big magazine draws a bar, a melee weapon no counter", s1.arBar && !s1.garroteMag, JSON.stringify(s1));
    R.eq("reload says what it costs, and is off while full", [s1.reloadTag, s1.reloadOff], ["Bonus action", true]);
    R.eq("the spare rounds on the gear list are counted", s1.spare, "Spare Bullets: 50");
    R.check("and how guns work is on the sheet", s1.rules);
    R.check("the turn cards offer the reload as a bonus action", /Reload: Pistol/.test(s1.deck), s1.deck);

    const fire = async (name, label, times) => {
      for (let i = 0; i < (times || 1); i++) {
        await page.evaluate(([n, l]) => {
          const card = [...document.querySelectorAll(".weapon")].find(w => w.querySelector(".weapon-top b").textContent === n);
          [...card.querySelectorAll(".mag-btns button")].find(b => b.textContent === l).click();
        }, [name, label]);
      }
    };
    await fire("Pistol", "Fire", 3);
    await fire("Assault Rifle", "−10");
    await fire("Assault Rifle", "−3");
    let c = await saved(page);
    R.eq("firing counts the rounds down, and they're kept with the character",
      c.ammo, { "Firearm List|Pistol": 7, "Firearm List|Assault Rifle": 7 });
    const spendBefore = await page.evaluate(() => window.TT.spend());
    await fire("Pistol", "Reload");
    c = await saved(page);
    const s2 = await page.evaluate(() => ({
      toast: (document.querySelector(".toast") || {}).textContent,
      spare: [...document.querySelectorAll(".weapon")].find(w => /Pistol/.test(w.textContent)).querySelector(".mag-spare").textContent,
      spend: window.TT.spend() }));
    R.eq("reloading fills it from the spare bullets", [c.ammo["Firearm List|Pistol"], c.ammoUsed], [10, { Bullets: 3 }]);
    R.eq("and says what's left", [s2.toast, s2.spare], ["Reloaded Pistol, 47 Bullets spare", "Spare Bullets: 47"]);
    R.eq("spending rounds never hands credits back", s2.spend, spendBefore);
    R.eq("the gear list still holds what was bought", c.gear.find(g => g.key === "Ammunition|Bullets").qty, 50);

    // the last of the spares, then none
    await page.evaluate(() => {
      const T = window.TT, ch = JSON.parse(localStorage.getItem("ttb.character.v1"));
      ch.ammoUsed = { Bullets: 45 }; ch.ammo = { "Firearm List|Pistol": 0 };
      localStorage.setItem("ttb.character.v1", JSON.stringify(ch));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT);
    await page.evaluate(() => { const s = [...document.querySelectorAll(".rail .step")]; s[s.length - 1].click(); });
    const s3 = await page.evaluate(() => {
      const card = [...document.querySelectorAll(".weapon")].find(w => /Pistol/.test(w.querySelector("b").textContent));
      return { empty: card.querySelector(".mag").classList.contains("empty"),
               fireOff: card.querySelector(".mag-btns .btn.primary").disabled };
    });
    R.eq("an empty gun says so and won't fire", [s3.empty, s3.fireOff], [true, true]);
    await fire("Pistol", "Reload");
    c = await saved(page);
    const t1 = await page.evaluate(() => (document.querySelector(".toast") || {}).textContent);
    R.eq("five spare rounds reload five", [c.ammo["Firearm List|Pistol"], t1],
      [5, "Reloaded 5 of 10: that was the last of your Bullets"]);
    await fire("Pistol", "Fire");
    await fire("Pistol", "Reload");
    const t2 = await page.evaluate(() => (document.querySelector(".toast") || {}).textContent);
    R.eq("with none left, the reload says so", t2, "No Bullets left on your gear list");
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  /* ============================== no ammunition bought ============================== */
  {
    const { page, ctx, errors } = await withChar(browser, { gear: [GEAR[0]], ammo: { "Firearm List|Pistol": 2 } });
    const s = await page.evaluate(() => document.querySelector(".mag-spare").textContent);
    R.check("without ammunition on the gear list, spares aren't counted, and it says how to start",
      /aren't being counted: add Bullets to your gear/.test(s), s);
    await page.evaluate(() => [...document.querySelectorAll(".mag-btns button")].find(b => b.textContent === "Reload").click());
    const c = await saved(page);
    R.eq("and reload simply fills the gun", c.ammo, { "Firearm List|Pistol": 10 });
    const bad = await page.evaluate(() => window.TT.migrate(Object.assign(JSON.parse(localStorage.getItem("ttb.character.v1")),
      { ammo: { "Firearm List|Pistol": 5, x: -1, y: "a", z: 1e9 }, ammoUsed: { Bullets: 3, Shells: "no" } })));
    R.eq("a hand-edited file can't put nonsense in the counter", [bad.ammo, bad.ammoUsed],
      [{ "Firearm List|Pistol": 5 }, { Bullets: 3 }]);
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  /* ============================== in Spanish ============================== */
  {
    const { page, ctx, errors } = await withChar(browser, {}, "es");
    const es = await page.evaluate(() => {
      const EN = /\b(the|and|with|your|you|this|that|what|when|from|into|every|their|they|rounds?|reload|fire|spare)\b/i;
      const sec = document.querySelector(".weapons"), left = [];
      const w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue.trim();
        if (t && EN.test(t) && !n.parentElement.closest("[data-nolang]")) left.push(t);
      }
      return { left, head: sec.querySelector("h3").textContent, how: sec.querySelector(".gun-rules summary").textContent };
    });
    R.eq("the weapons section reads in Spanish", [es.head, es.how], ["Armas", "Cómo funcionan las armas de fuego"]);
    R.eq("with nothing left in English", es.left.filter(t => !/Automatic, burst-fire/.test(t)), []);
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  /* ============================== the GM's view ============================== */
  {
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    const g = await page.evaluate(() => {
      const T = window.TT; window.TTGM.loadDemo();
      T.setMode("table"); T.gmSec(0); T.render();
      const card = [...document.querySelectorAll(".gm-party .gm-card")].find(c => c.querySelector(".gm-name").textContent === "Jax Oriel");
      const strip = [...card.querySelectorAll(".gm-strip")].find(s => /Rounds/.test(s.textContent));
      T.gmSec(1); T.render();
      const row = [...document.querySelectorAll(".gm-cb")].find(r => r.querySelector(".who .n").textContent === "Jax Oriel");
      const other = [...document.querySelectorAll(".gm-cb")].find(r => r.querySelector(".who .n").textContent === "Vesper Kane");
      return { card: strip && strip.querySelector(".chip").textContent, title: strip && strip.querySelector(".chip").title,
               row: row.querySelector(".gm-rounds") && row.querySelector(".gm-rounds").textContent,
               none: !other.querySelector(".gm-rounds") };
    });
    R.eq("the party card shows each gun's rounds and the spares", [g.card, g.title], ["Pistol 8/10", "40 spare Bullets"]);
    R.eq("so does their row in the fight", g.row, "Pistol 8/10");
    R.check("and a player with no gun shows none", g.none);
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  return R;
};
