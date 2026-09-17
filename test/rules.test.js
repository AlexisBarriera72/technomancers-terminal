/* Rules and validation. Runs in-page against window.TT.
 * Every check here was written to FAIL against 26bdb1e. */
"use strict";
const { Results, appPage, baseChar } = require("./lib");

module.exports = async function (browser) {
  const R = new Results();
  const { page, ctx } = await appPage(browser);

  // statsOf(c) borrows the character and returns every derived value.
  const stats = c => page.evaluate(ch => {
    const d = window.TT.statsOf(window.TT.migrate(ch));
    return { sc: d.sc, pb: d.pb, ac: d.ac, hp: d.hp, prof: d.prof,
             hum: d.hum ? { pct: d.hum.pct, state: d.hum.state } : null,
             ess: d.ess };
  }, c);
  const validate = c => page.evaluate(ch => {
    const out = window.TT.migrate(ch);
    return { level: out.level, cls: out.cls, sub: out.sub, cred: out.cred,
             asi: out.asi, credType: typeof out.cred };
  }, c);

  /* ---- item 7: rolled assignments must reach the sheet ---- */
  {
    const c = baseChar({ method: "roll", rolled: [15, 14, 13, 12, 10, 9],
                         arrayMap: { Str: 15, Dex: 14, Con: 13, Int: 12, Wis: 10, Cha: 9 },
                         scores: { Str: 8, Dex: 8, Con: 8, Int: 8, Wis: 8, Cha: 8 } });
    const d = await stats(c);
    R.eq("item 7 — rolled Str 15 reaches scores", d.sc.Str, 15);
    R.eq("item 7 — rolled Dex 14 reaches scores", d.sc.Dex, 14);
    R.check("item 7 — HP uses the rolled Con", d.hp > 30, "hp=" + d.hp + " (Con 13 at level 5 rogue)");
  }

  /* ---- item 8: two identical rolled values ---- */
  {
    const dup = await page.evaluate(() => {
      // Mirror the assignment handler's rule: can two abilities hold the same
      // value when the pool contains two copies of it?
      const pool = [14, 14, 13, 12, 10, 9];
      const map = {};
      const assign = (abil, v) => {
        const have = pool.filter(x => x === v).length;
        const used = Object.keys(map).filter(k => map[k] === v && k !== abil).length;
        if (used >= have) {
          Object.keys(map).forEach(o => { if (o !== abil && map[o] === v) delete map[o]; });
        }
        map[abil] = v;
      };
      assign("Str", 14); assign("Dex", 14);
      return map;
    });
    R.eq("item 8 — both 14s assignable (model)", dup, { Str: 14, Dex: 14 });

    const c = baseChar({ method: "roll", rolled: [14, 14, 13, 12, 10, 9],
                         arrayMap: { Str: 14, Dex: 14, Con: 13, Int: 12, Wis: 10, Cha: 9 } });
    const d = await stats(c);
    R.eq("item 8 — duplicate values survive migrate", [d.sc.Str, d.sc.Dex], [14, 14]);
  }

  /* ---- item 9: feat ability increases ---- */
  {
    const c = baseChar({ level: 4, scores: { Str: 10, Dex: 15, Con: 13, Int: 12, Wis: 10, Cha: 8 },
                         asi: [{ type: "feat", name: "Fast Draw" }] });
    const d = await stats(c);
    R.eq("item 9 — Fast Draw raises Dex 15 to 16", d.sc.Dex, 16);

    const c2 = baseChar({ level: 4, asi: [{ type: "feat", name: "Paramedic", abil: "Wis" }] });
    const d2 = await stats(c2);
    R.eq("item 9 — Paramedic applies the chosen ability", d2.sc.Wis, 11);

    const covered = await page.evaluate(() => {
      const T = window.TT;
      if (!T.FEAT_EFFECTS) return { missing: true };
      const all = T.ALL_FEATS.map(f => f.name);
      const withInc = all.filter(n => {
        const f = T.ALL_FEATS.filter(x => x.name === n)[0];
        return /increase your|score increases/i.test(JSON.stringify(f.blocks || []));
      });
      const modelled = withInc.filter(n => T.FEAT_EFFECTS[n]);
      return { withInc: withInc.length, modelled: modelled.length,
               missed: withInc.filter(n => !T.FEAT_EFFECTS[n]) };
    });
    R.check("item 9 — every ability-increase feat is modelled",
      !covered.missing && covered.withInc === covered.modelled,
      JSON.stringify(covered));
  }

  /* ---- item 10: per-class ASI levels ---- */
  {
    const got = await page.evaluate(() => {
      const T = window.TT;
      if (!T.asiLevelsFor) return { missing: true };
      return { fighter: T.asiLevelsFor("Fighter"), rogue: T.asiLevelsFor("Rogue"),
               wizard: T.asiLevelsFor("Wizard"), hound: T.asiLevelsFor("Chromehound") };
    });
    R.eq("item 10 — Fighter ASI levels", got.fighter, [4, 6, 8, 12, 14, 16, 19]);
    R.eq("item 10 — Rogue ASI levels", got.rogue, [4, 8, 10, 12, 16, 19]);
    R.eq("item 10 — Wizard keeps the default", got.wizard, [4, 8, 12, 16, 19]);
    R.eq("item 10 — expansion class keeps the default (its own table agrees)",
      got.hound, [4, 8, 12, 16, 19]);
  }

  /* ---- item 11: Ballistic Shield ---- */
  {
    const armour = baseChar({ scores: { Str: 10, Dex: 15, Con: 13, Int: 12, Wis: 10, Cha: 8 },
      gear: [{ key: "Armor|Combat Suit", name: "Combat Suit", cost: "2,000₵" }] });
    const withShield = baseChar({ scores: { Str: 10, Dex: 15, Con: 13, Int: 12, Wis: 10, Cha: 8 },
      gear: [{ key: "Armor|Combat Suit", name: "Combat Suit", cost: "2,000₵" },
             { key: "Armor|Ballistic Shield", name: "Ballistic Shield", cost: "1,000₵" }] });
    const a = await stats(armour), b = await stats(withShield);
    R.check("item 11 — shield adds +2 on top of armour", b.ac.ac === a.ac.ac + 2,
      "armour=" + a.ac.ac + " with shield=" + b.ac.ac);
  }

  /* ---- item 12a: Stackborn imprints grant proficiency ---- */
  {
    const c = baseChar({ cls: "Stackborn", level: 5, sub: null,
                         picks: { imprints: ["Stealth"] }, skills: [] });
    const d = await stats(c);
    R.check("item 12a — imprinted skill is proficient", d.prof.indexOf("Stealth") >= 0,
      "prof=" + JSON.stringify(d.prof));
  }

  /* ---- item 12b: weapon proficiency gates the attack bonus ---- */
  {
    const gated = await page.evaluate(() => {
      const T = window.TT;
      const wiz = T.migrate({ id: "w", name: "W", level: 5, cls: "Wizard", method: "pointbuy",
        scores: { Str: 10, Dex: 14, Con: 12, Int: 16, Wis: 10, Cha: 8 },
        arrayMap: {}, skills: [], bgPicks: [], asi: [], picks: {}, subChoices: {},
        feats: [], invocations: [], infusions: [], cyber: [], augments: [], traits: {},
        gear: [{ key: "Firearm List|Sniper Rifle", name: "Sniper Rifle", cost: "0₵" },
               { key: "Firearm List|Pistol", name: "Pistol", cost: "0₵" }] });
      const d = T.statsOf(wiz);
      const sniper = T.attackBonus(wiz.gear[0], d);
      const pistol = T.attackBonus(wiz.gear[1], d);
      return { sniper: sniper.bonus, sniperProf: sniper.proficient,
               pistol: pistol.bonus, pistolProf: pistol.proficient, pb: d.pb };
    });
    R.check("item 12b — Wizard is not proficient with a sniper rifle",
      gated.sniperProf === false, JSON.stringify(gated));
    R.eq("item 12b — non-proficient attack omits the bonus", gated.sniper, 2);
    R.check("item 12b — Wizard IS proficient with a pistol", gated.pistolProf === true,
      JSON.stringify(gated));
    R.eq("item 12b — proficient attack includes the bonus", gated.pistol, 5);
  }

  /* ---- item 4: the validator ---- */
  {
    const frac = await validate(baseChar({ level: 2.5 }));
    R.check("item 4 — fractional level rejected",
      Number.isInteger(frac.level) && frac.level >= 1 && frac.level <= 20,
      "level=" + frac.level);

    const nan = await page.evaluate(() =>
      window.TT.migrate({ id: "x", level: NaN, scores: {} }).level);
    R.check("item 4 — NaN level rejected", Number.isInteger(nan) && nan >= 1, "level=" + nan);

    const badCls = await validate(baseChar({ cls: "Netrunner" }));
    R.eq("item 4 — unknown class dropped", badCls.cls, null);

    const badSub = await validate(baseChar({ cls: "Rogue", sub: "wirewalker-icebreaker" }));
    R.eq("item 4 — subclass from another class dropped", badSub.sub, null);

    const nullAsi = await validate(baseChar({ asi: [null, { type: "asi", a: "Dex", b: "Con" }] }));
    R.check("item 4 — null ASI slot dropped", nullAsi.asi.every(s => s && typeof s === "object"),
      JSON.stringify(nullAsi.asi));

    const badCred = await validate(baseChar({ cred: "<img src=x onerror=alert(1)>" }));
    R.eq("item 4 — markup in cred coerced to a number", badCred.credType, "number");
  }

  /* ---- item 4: fractional level must not crash the meters ---- */
  {
    const ok = await page.evaluate(() => {
      try {
        const c = window.TT.migrate({ id: "h", name: "H", level: 2.5, cls: "Chromehound",
          method: "pointbuy", scores: { Str: 14, Dex: 14, Con: 14, Int: 10, Wis: 10, Cha: 12 },
          arrayMap: {}, skills: [], bgPicks: [], asi: [], picks: {}, subChoices: {},
          feats: [], invocations: [], infusions: [], cyber: [], augments: [], gear: [], traits: {} });
        const d = window.TT.statsOf(c);
        return { ok: true, pct: d.hum.pct };
      } catch (e) { return { ok: false, err: String(e) }; }
    });
    R.check("item 4 — Chromehound humanity survives a fractional level", ok.ok, ok.err);

    const ok2 = await page.evaluate(() => {
      try {
        const c = window.TT.migrate({ id: "b", name: "B", level: 2.5, cls: "Bioforged",
          method: "pointbuy", scores: { Str: 14, Dex: 10, Con: 16, Int: 10, Wis: 12, Cha: 10 },
          arrayMap: {}, skills: [], bgPicks: [], asi: [], picks: {}, subChoices: {},
          feats: [], invocations: [], infusions: [], cyber: [], augments: [], gear: [], traits: {} });
        window.TT.statsOf(c);
        return { ok: true };
      } catch (e) { return { ok: false, err: String(e) }; }
    });
    R.check("item 4 — Bioforged essence survives a fractional level", ok2.ok, ok2.err);
  }

  /* ---- esc() ---- */
  {
    const esc = await page.evaluate(() => window.TT.esc("a'b\"c<d>e&f"));
    R.check("esc() escapes single quotes", esc.indexOf("'") < 0, esc);
  }

  await ctx.close();
  return R;
};
