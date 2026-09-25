/* Spells: the data, the numbers each caster gets, the Level-ups picker, the
 * play sheet's slots and cards, and Cathedra's layer. spells.js and
 * app/magic.js, driven through the page. */
"use strict";
const { Results, appPage, baseChar } = require("./lib");

const SC = { Str: 8, Dex: 14, Con: 13, Int: 16, Wis: 16, Cha: 16 };

async function withChar(browser, over) {
  const out = await appPage(browser);
  await out.page.evaluate(c => {
    localStorage.setItem("ttb.character.v1", JSON.stringify(window.TT.migrate(c)));
  }, baseChar(Object.assign({ scores: SC }, over)));
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

  /* ============================== data and numbers ============================== */
  {
    const { page, ctx, errors } = await appPage(browser);
    const d = await page.evaluate(() => {
      const S = window.TT.SPD, names = S.spells.map(s => s.n);
      return { n: S.spells.length, dupes: names.length - new Set(names).size,
               bad: S.spells.filter(s => !(s.l >= 0 && s.l <= 9) || !s.x.length || !s.cls.length).map(s => s.n),
               fireball: S.spells.find(s => s.n === "Fireball"),
               shield: S.spells.find(s => s.n === "Shield").t,
               casters: Object.keys(S.casters).sort(), notice: !!(S.meta && /Creative Commons/.test(S.meta.notice)) };
    });
    R.eq("the SRD's 319 spells, no name twice", [d.n, d.dupes], [319, 0]);
    R.eq("every spell has a level, text and a class", d.bad, []);
    R.check("Fireball reads as the SRD prints it",
      d.fireball.l === 3 && d.fireball.sv === "Dex" && d.fireball.half === 1 && d.fireball.dmg.slot["3"] === "8d6" && d.fireball.r === "150 feet",
      JSON.stringify(d.fireball).slice(0, 200));
    R.check("a reaction spell says what triggers it", /hit by an attack/.test(d.shield), d.shield);
    R.eq("nine casting classes", d.casters, ["Artificer", "Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"]);
    R.check("the SRD's licence notice travels with it", d.notice);

    const stats = await page.evaluate(sc => {
      const T = window.TT, st = o => T.spellStats(T.migrate(Object.assign({ id: "x", scores: sc }, o)));
      return {
        wiz5: st({ cls: "Wizard", level: 5 }), clr1: st({ cls: "Cleric", level: 1 }),
        pal1: st({ cls: "Paladin", level: 1 }), pal5: st({ cls: "Paladin", level: 5 }),
        wlk11: st({ cls: "Warlock", level: 11 }), art3: st({ cls: "Artificer", level: 3 }),
        rogue: st({ cls: "Rogue", level: 5 }), exp: st({ cls: "Firebrand", level: 5 })
      };
    }, SC);
    R.eq("Wizard 5: DC 14, +6, slots 4/3/2, 4 cantrips, prepares Int + level",
      [stats.wiz5.dc, stats.wiz5.atk, stats.wiz5.slots, stats.wiz5.cantrips, stats.wiz5.prepared, stats.wiz5.book],
      [14, 6, [4, 3, 2], 4, 8, 14]);
    R.eq("Cleric 1: two 1st-level slots, 3 cantrips", [stats.clr1.slots, stats.clr1.cantrips], [[2], 3]);
    R.eq("Paladin 1 casts nothing yet; at 5, slots 4/2 and Cha + half level prepared",
      [stats.pal1.max, stats.pal5.slots, stats.pal5.prepared], [0, [4, 2], 5]);
    R.eq("Warlock 11: three 5th-level pact slots and a 6th-level arcanum",
      [stats.wlk11.pact, stats.wlk11.arcanum, stats.wlk11.known], [{ level: 5, n: 3 }, [6], 11]);
    R.eq("Artificer 3: half caster rounded up", [stats.art3.slots, stats.art3.cantrips], [[3], 2]);
    R.eq("no spellcasting for a Rogue or an expansion class", [stats.rogue, stats.exp], [null, null]);

    const g = await page.evaluate(sc => {
      const T = window.TT, c = o => T.migrate(Object.assign({ id: "x", scores: sc, level: 5 }, o));
      return { dom: T.grantedSpells(c({ cls: "Cleric", sub: "cleric-reliquary-domain" })),
               fan: T.grantedSpells(c({ cls: "Warlock", sub: "warlock-fandom" })),
               fanOpts: T.spellOptions(c({ cls: "Warlock", sub: "warlock-fandom" })).map(s => s.n) };
    }, SC);
    R.eq("a domain's table is always prepared up to the character's level",
      g.dom.always, ["Identify", "Shield of Faith", "Magic Weapon", "Warding Bond", "Glyph of Warding", "Speak with Dead"]);
    R.check("a patron's expanded list widens the picker", g.fan.extra.indexOf("Guiding Bolt") >= 0 && g.fanOpts.indexOf("Guiding Bolt") >= 0,
      JSON.stringify(g.fan));

    const v = await page.evaluate(() => window.TT.migrate({ id: "x", cls: "Wizard", level: 3,
      spells: ["Fireball", "<img src=x>", 5, "Fireball", "Magic Missile", "x".repeat(80)],
      prepared: ["Magic Missile", "Not On The List"], slotsUsed: { "1": 2, "p": 1, "zz": 3, "2": "lots" } }));
    R.eq("the validator keeps names, drops junk and repeats",
      [v.spells, v.prepared, v.slotsUsed], [["Fireball", "<img src=x>", "Magic Missile"], ["Magic Missile"], { "1": 2, "p": 1 }]);
    R.eq("no page errors reading spells", errors, []);
    await ctx.close();
  }

  /* ============================== picking and casting ============================== */
  {
    const { page, ctx, errors } = await withChar(browser, { cls: "Wizard", sub: "wizard-technomancer", level: 5, campaign: "cathedra" });
    await goStep(page, "Level-Ups");
    await page.waitForTimeout(150);
    const take = n => page.evaluate(n => {
      const d = [...document.querySelectorAll(".spell-options details")].find(x => x.querySelector("h4").textContent === n);
      if (d) d.querySelector(".spell-cast .chip").click();
      return !!d;
    }, n);
    R.check("the Level-ups step has a spell picker", await page.evaluate(() => !!document.querySelector("#spell-picker")));
    const offered = await page.evaluate(() => [...document.querySelectorAll(".spell-options h4")].map(h => h.textContent));
    R.check("it offers the Wizard's list up to 3rd level, and Cathedra's own",
      offered.indexOf("Fireball") >= 0 && offered.indexOf("Marrow Spark") >= 0 && offered.indexOf("Cure Wounds") < 0 &&
      offered.indexOf("Cone of Cold") < 0 && offered.indexOf("The Sending") < 0, offered.length + " offered");
    for (const n of ["Fire Bolt", "Light", "Mage Hand", "Marrow Spark", "Magic Missile", "Shield", "Fireball"]) await take(n);
    R.eq("a fifth cantrip is refused", [await take("Ray of Frost"), (await saved(page)).spells.length], [true, 7]);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { const b = [...document.querySelectorAll(".spell-chosen .chip")].find(x => x.textContent === "Prepare"); if (b) b.click(); });
      await page.waitForTimeout(30);
    }
    const c = await saved(page);
    R.eq("taken and prepared", [c.spells, c.prepared],
      [["Fire Bolt", "Light", "Mage Hand", "Marrow Spark", "Magic Missile", "Shield", "Fireball"], ["Magic Missile", "Shield", "Fireball"]]);

    await page.evaluate(() => { const i = document.querySelector("#spell-picker .inv-add input"); i.value = "Hex"; });
    await page.evaluate(() => document.querySelector("#spell-picker .inv-add .btn").click());
    R.check("a spell the free rules lack can still go on the sheet", (await saved(page)).spells.indexOf("Hex") >= 0);

    await goStep(page, "Play Sheet");
    await page.waitForTimeout(200);
    const sheet = await page.evaluate(() => {
      const s = document.querySelector(".spells-sec");
      return s && { text: s.textContent, cards: [...s.querySelectorAll("details h4")].map(h => h.textContent),
                    street: (s.querySelector(".spell-street") || {}).textContent };
    });
    R.check("the sheet has a Spells section with the DC and attack", sheet && /Spell save DC\s*14/.test(sheet.text) && /Spell attack\s*\+6/.test(sheet.text),
      sheet && sheet.text.slice(0, 200));
    R.check("with the cantrips and the prepared spells, not the unprepared one",
      ["Fire Bolt", "Fireball", "Shield"].every(n => sheet.cards.indexOf(n) >= 0) && sheet.cards.indexOf("Hex") < 0, JSON.stringify(sheet.cards));
    R.eq("in Cathedra, the street's name for it", sheet.street, "Marrow-flare");
    await page.evaluate(() => {
      const d = [...document.querySelectorAll(".spells-sec details")].find(x => x.querySelector("h4").textContent === "Fireball");
      d.querySelector(".spell-cast .btn").click();
    });
    R.eq("casting Fireball spends a 3rd-level slot", (await saved(page)).slotsUsed, { "3": 1 });
    await page.evaluate(() => {
      const d = [...document.querySelectorAll(".spells-sec details")].find(x => x.querySelector("h4").textContent === "Fireball");
      d.querySelector(".spell-cast .btn").click();
      const e = [...document.querySelectorAll(".spells-sec details")].find(x => x.querySelector("h4").textContent === "Fireball");
      return e.querySelector(".spell-cast .btn").disabled;
    });
    R.eq("both spent, the button goes grey", await page.evaluate(() => {
      const e = [...document.querySelectorAll(".spells-sec details")].find(x => x.querySelector("h4").textContent === "Fireball");
      return e.querySelector(".spell-cast .btn").disabled;
    }), true);
    const deck = await page.evaluate(() => ({
      act: [...document.querySelectorAll(".tcard.act .tcard-line b")].map(b => b.textContent),
      rea: [...document.querySelectorAll(".tcard.rea .tcard-line b")].map(b => b.textContent) }));
    R.check("the turn cards deal the spells in by what they cost",
      deck.act.indexOf("Fireball") >= 0 && deck.rea.indexOf("Shield") >= 0 && deck.act.indexOf("Shield") < 0, JSON.stringify(deck));
    await page.evaluate(() => [...document.querySelectorAll(".slot-board .chip")].find(b => b.textContent === "Long rest").click());
    R.eq("a long rest brings every slot back", (await saved(page)).slotsUsed || {}, {});
    R.check("the Markdown has the spells", /## Spells[\s\S]*3rd\*\* Fireball/.test(await page.evaluate(() => window.TT.toMarkdown())));
    R.eq("no page errors picking and casting", errors, []);
    await ctx.close();
  }

  /* ============================== a Warlock's pact ============================== */
  {
    const { page, ctx, errors } = await withChar(browser, { cls: "Warlock", level: 5,
      spells: ["Eldritch Blast", "Hellish Rebuke", "Hunger of Hadar"] });
    await goStep(page, "Play Sheet");
    await page.waitForTimeout(200);
    const cast = () => page.evaluate(() => {
      const d = [...document.querySelectorAll(".spells-sec details")].find(x => x.querySelector("h4").textContent === "Hellish Rebuke");
      d.querySelector(".spell-cast .btn").click();
    });
    await cast(); await cast();
    R.eq("pact slots are spent at the pact level", (await saved(page)).slotsUsed, { p: 2 });
    await page.evaluate(() => [...document.querySelectorAll(".slot-board .chip")].find(b => b.textContent === "Short rest").click());
    R.eq("and come back on a short rest", (await saved(page)).slotsUsed || {}, {});
    R.eq("no page errors for the Warlock", errors, []);
    await ctx.close();
  }

  /* ============================== the Codex and the campaign ============================== */
  {
    const { page, ctx, errors } = await withChar(browser, { cls: "Rogue", campaign: "cathedra" });
    await page.evaluate(() => { window.TT.setMode("codex"); window.TT.render(); });
    await page.evaluate(() => [...document.querySelectorAll(".rail .step")].find(x => /Spells$/.test(x.textContent.trim())).click());
    await page.waitForTimeout(300);
    const n = await page.evaluate(() => document.querySelectorAll("#stage details.spell-card").length);
    R.check("the Codex lists every spell, and the campaign's own", n === 319 + 18, String(n));
    await page.evaluate(() => [...document.querySelectorAll("#stage .chip")].find(b => b.textContent === "Paladin").click());
    await page.waitForTimeout(150);
    const pal = await page.evaluate(() => [...document.querySelectorAll("#stage details.spell-card h4")].map(h => h.textContent));
    R.check("filtered by class", pal.indexOf("Bless") >= 0 && pal.indexOf("Fireball") < 0 && pal.indexOf("Ledger Mark") >= 0, pal.length + "");
    const camp = await page.evaluate(() => {
      const T = window.TT, c = T.campById("cathedra");
      return { magic: !!c.magic, gm: c.magic.spells.filter(s => s.gm).map(s => s.n),
               names: Object.keys(c.magic.names).filter(k => !T.SPD.spells.some(s => s.n === k)) };
    });
    R.eq("Cathedra's street names all name a real SRD spell", camp.names, []);
    R.eq("The Sending stays off every list until the GM hands it out", camp.gm, ["The Sending"]);
    R.eq("no page errors in the Codex", errors, []);
    await ctx.close();
  }

  return R;
};
