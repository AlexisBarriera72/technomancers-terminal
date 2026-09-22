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
    return { level: out.level, cls: out.cls, sub: out.sub,
             asi: out.asi, levelType: typeof out.level };
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

    const badLevel = await validate(baseChar({ level: "<img src=x onerror=alert(1)>" }));
    R.eq("item 4 — markup in a number field coerced to a number", badLevel.levelType, "number");
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

  /* ---- item 16: a feature's action heading must match its own excerpt ---- */
  {
    const dem = await page.evaluate(() => {
      const T = window.TT;
      if (!T.actionEntries) return { missing: true };
      const f = T.D.feats.filter(x => x.name === "Demolitions Expert")[0];
      return { types: T.actionEntries(f).map(e => e.type),
               gists: T.actionEntries(f).map(e => e.gist) };
    });
    R.check("item 16 — Demolitions Expert is a Reaction, not a Bonus action",
      !dem.missing && dem.types.length === 1 && dem.types[0] === "Reaction",
      JSON.stringify(dem));
    R.check("item 16 — and its excerpt is the reaction sentence",
      !dem.missing && /reaction to detonate/i.test(dem.gists[0] || ""),
      JSON.stringify(dem.gists));

    // "requires a bonus action to reload" describes a weapon property; it is
    // not an ability the feature grants.
    const loose = await page.evaluate(() =>
      window.TT.actionType("Firearms with the blast property which require a bonus action to reload."));
    R.eq("item 16 — a reload mention is not a granted bonus action", loose, "Passive");

    // The sweep: across every feature in both books, the label must not
    // contradict the text shown beneath it.
    const sweep = await page.evaluate(() => {
      const T = window.TT;
      if (!T.actionEntries) return { total: 0, n: -1, bad: ["actionEntries not implemented"] };
      const feats = [];
      const eat = arr => (arr || []).forEach(x => {
        if (x && x.blocks) feats.push(x);
        if (x && x.features) x.features.forEach(f => f.blocks && feats.push(f));
      });
      eat(T.D.feats); eat(T.X.feats); eat(T.D.subclasses); eat(T.X.subclasses);
      eat(T.X.classes); eat(T.D.cyberware); eat(T.D.augments); eat(T.D.fightingStyles);
      const pat = {
        "Bonus action": /\bas a bonus action\b|\buse (?:a|the) bonus action\b/i,
        "Reaction": /\bas a reaction\b|\buse your reaction\b|\busing your reaction\b/i,
        "Action": /\bas an action\b|\btake an action\b/i
      };
      const bad = [];
      feats.forEach(f => {
        T.actionEntries(f).forEach(e => {
          const p = pat[e.type];
          // The excerpt must contain the construction its heading claims.
          if (p && !p.test(e.gist)) bad.push({ n: f.name, t: e.type, g: (e.gist || "").slice(0, 70) });
        });
      });
      return { total: feats.length, bad: bad.slice(0, 6), n: bad.length };
    });
    R.check("item 16 — no feature's heading contradicts its excerpt",
      sweep.n === 0, sweep.n + " of " + sweep.total + " — " + JSON.stringify(sweep.bad));
  }

  /* ---- content drift: counts must come from the data ---- */
  {
    const counts = await page.evaluate(() => {
      const T = window.TT;
      return { classes: T.D.classes.length + T.X.classes.length,
               // ALL_SUBS, not two of the three sources — the count drifted once
               // already because it was written out by hand.
               archetypes: T.ALL_SUBS.length,
               meta: (document.querySelector('meta[property="og:description"]') || {}).content || "" };
    });
    R.eq("real class count", counts.classes, 21);
    R.eq("real archetype count", counts.archetypes, 106);
    R.check("og:description states the real class count",
      counts.meta.indexOf(counts.classes + " classes") >= 0, counts.meta);
    R.check("og:description states the real archetype count",
      counts.meta.indexOf(counts.archetypes + " archetypes") >= 0, counts.meta);
  }

  /* ---- Spanish must not reach the rules engine ----------------------------
   *
   * This is the check the whole design exists to make passable. The mechanics
   * are inferred from English prose and characters are stored keyed on English
   * names, so if translation ever stopped being a render-time overlay, it would
   * show up here as a number that moved. */
  {
    // The rules text is a lazy script, fetched on the first switch to Spanish.
    // Wait for it before comparing: with only the interface strings loaded,
    // this would be checking that untranslated prose changes nothing, which is
    // exactly the case that was never in doubt.
    await page.evaluate(() => window.TT.setLang("es"));
    await page.waitForFunction(() => window.TTES && window.TTES.book, null, { timeout: 15000 });
    await page.evaluate(() => window.TT.setLang("en"));
    R.check("the rules text loads on demand", true, "");
    const parity = await page.evaluate(() => {
      const T = window.TT;
      const cases = [
        { id: "a", name: "A", level: 8, cls: "Rogue", sub: "rogue-saboteur", bg: "hacker",
          method: "pointbuy", scores: { Str: 10, Dex: 16, Con: 14, Int: 14, Wis: 12, Cha: 8 },
          skills: ["Stealth", "Perception"], gear: [{ name: "Combat Vest", cost: "1,000₵" }],
          asi: [{ type: "feat", name: "Fast Draw" }] },
        { id: "b", name: "B", level: 12, cls: "Chromehound", method: "pointbuy",
          scores: { Str: 16, Dex: 14, Con: 16, Int: 8, Wis: 12, Cha: 10 },
          cyber: [{ name: "Wired Reflexes", tier: "Tier 2" }] },
        { id: "c", name: "C", level: 5, cls: "Sorcerer", sub: "sorcerer-wild-magic",
          method: "pointbuy", scores: { Str: 8, Dex: 14, Con: 14, Int: 10, Wis: 12, Cha: 16 } }
      ];
      function snapshot() {
        return cases.map(raw => {
          const c = T.migrate(JSON.parse(JSON.stringify(raw)));
          const d = T.statsOf(c);
          // activeFeatures() and allSkills() read the current character, so
          // borrow it the way the application does.
          return T.withChar(c, () => ({
            sc: d.sc, ac: d.ac, hp: d.hp, pb: d.pb,
            hum: d.hum ? d.hum.pct : null,
            skills: T.allSkills().slice().sort(),
            saves: ["Str", "Dex", "Con", "Int", "Wis", "Cha"].map(a => T.saveBonus(a, d)),
            init: T.initiative(d),
            // the action-economy classifier, which reads the feature's own prose
            acts: T.activeFeatures().map(f => T.actionEntries(f).map(e => e.type).join("/"))
          }));
        });
      }
      const en = snapshot();
      T.setLang("es");
      const esLang = T.getLang();
      const es = snapshot();
      // and the DOM really did change, so this is not passing by doing nothing
      const masthead = (document.querySelector("#mForge") || {}).textContent;
      T.setLang("en");
      return { en: en, es: es, lang: esLang, masthead: masthead,
               back: (document.querySelector("#mForge") || {}).textContent };
    });
    R.check("switching to Spanish actually changed the interface",
      parity.lang === "es" && parity.masthead === "Forja", JSON.stringify(parity.masthead));
    R.check("switching back restores English",
      parity.back === "Forge", JSON.stringify(parity.back));
    R.eq("every derived number is identical in Spanish", parity.es, parity.en);
  }

  /* ---- the action cards quote a sentence, and it has to be translated ----
     The card shows one sentence lifted out of a feature's prose. The book is
     keyed by whole blocks, so a sliced sentence is not a key, and for a while
     every one of these came out English on an otherwise Spanish page. */
  {
    const g = await page.evaluate(() => {
      const T = window.TT;
      const feats = [];
      T.ALL_CLASSES.forEach(c => (c.features || []).forEach(f => feats.push(f)));
      T.ALL_SUBS.forEach(s => (s.features || []).forEach(f => feats.push(f)));
      function gists() {
        const out = [];
        feats.forEach(f => { try { T.actionEntries(f).forEach(e => out.push(e)); } catch (e) {} });
        return out;
      }
      T.setLang("en");
      const en = gists();
      T.setLang("es");
      const es = gists();
      T.setLang("en");
      const english = /\b(the|you|your|and|with|that|from|can|when|their)\b/i;
      return {
        n: es.length,
        sameTypes: en.length === es.length && en.every((e, i) => e.type === es[i].type),
        changed: es.filter((e, i) => e.gist !== en[i].gist).length,
        stillEnglish: es.filter(e => e.gist && english.test(e.gist)).length,
        sample: es.filter(e => e.gist && english.test(e.gist)).map(e => e.gist.slice(0, 70))
      };
    });
    R.check("the classifier reads the same prose in either language", g.sameTypes, "types differ");
    R.check("nearly every action card is translated",
      g.n > 500 && g.changed > g.n * 0.9, g.changed + " of " + g.n);
    // The leftovers are sentences that straddle a block boundary — an intro
    // ending in a colon glued to the first list item — which no single book
    // entry covers. They fall back to English rather than to a wrong pairing.
    R.check("and the handful that are not is still a handful",
      g.stillEnglish <= 6, g.stillEnglish + " left: " + JSON.stringify(g.sample));
  }

  /* ---- the lookup itself ---- */
  {
    const t = await page.evaluate(() => {
      const T = window.TT;
      T.setLang("es");
      const out = {
        exact: T.T("Choose a class"),
        // digits are placeholders, so one entry covers the whole family
        numeric: T.T("Step 04"),
        interpolated: T.T("{0} items".replace("{0}", "7")),
        // a pattern passes the proper noun through untouched…
        properNoun: T.T("Add Sniper Rifle"),
        // …but translates a capture we do have a word for
        capture: T.T("Say: “Roll Stealth.”"),
        // a miss falls back to English rather than to a blank
        miss: T.T("A sentence that is deliberately not in the table."),
        hasBook: T.esHasBook()
      };
      T.setLang("en");
      out.offIsIdentity = T.T("Choose a class");
      return out;
    });
    R.eq("an exact key translates", t.exact, "Elige una clase");
    R.eq("digits are placeholders, not part of the key", t.numeric, "Paso 04");
    R.eq("an interpolated count keeps its number", t.interpolated, "7 objetos");
    R.eq("a pattern leaves the proper noun in English", t.properNoun, "Añadir Sniper Rifle");
    R.eq("a pattern still translates what it can", t.capture, "Di: «Tira Sigilo»."); 
    R.eq("a missing key falls back to English",
      t.miss, "A sentence that is deliberately not in the table.");
    R.eq("English is a pass-through", t.offIsIdentity, "Choose a class");
  }

  /* ---- SRD source and the Wild Magic archetype ---- */
  {
    const wm = await page.evaluate(() => {
      const T = window.TT;
      const sub = T.subById["sorcerer-wild-magic"];
      if (!sub) return { missing: true };
      const surge = (sub.features[0].blocks || []).filter(b => b.type === "table")[0];
      const featText = f => (f.blocks || []).map(b => b.text || "").join(" ");
      return {
        cls: sub.cls,
        origin: sub.origin,
        label: T.sourceName(sub),
        levelAvailable: sub.levelAvailable,
        sorcererSubs: T.subsFor("Sorcerer").length,
        levels: sub.features.map(f => f.level),
        names: sub.features.map(f => f.name),
        surgeRows: surge ? surge.rows.length : 0,
        surgeFirst: surge ? surge.rows[0][0] : null,
        surgeLast: surge ? surge.rows[surge.rows.length - 1][0] : null,
        // Bend Luck is the one feature that costs something to use; the
        // classifier reads it out of the prose, so a reflavoured rule sentence
        // would show up right here.
        bendLuck: T.actionEntries(sub.features.filter(f => f.name === "Bend Luck")[0])
                   .map(e => e.type),
        // mechanics must be the SRD's, unchanged
        bendText: featText(sub.features.filter(f => f.name === "Bend Luck")[0]),
        surgeText: featText(sub.features[0]),
        bombard: featText(sub.features.filter(f => f.name === "Spell Bombardment")[0]),
        labels: ["book", "expansion", "srd"].map(o => T.sourceName({ origin: o })),
        notice: (T.SRD.meta || {}).notice || ""
      };
    });
    R.check("Wild Magic is registered as a Sorcerer archetype",
      !wm.missing && wm.cls === "Sorcerer" && wm.levelAvailable === 1, JSON.stringify(wm));
    R.eq("Sorcerer now offers six archetypes", wm.sorcererSubs, 6);
    R.eq("Wild Magic feature levels match the SRD", wm.levels, [1, 1, 6, 14, 18]);
    R.eq("Wild Magic feature names match the SRD", wm.names,
      ["Wild Magic Surge", "Tides of Chaos", "Bend Luck", "Controlled Chaos", "Spell Bombardment"]);
    R.eq("the surge table has all 50 rows", wm.surgeRows, 50);
    R.check("the surge table spans 01 to 00",
      wm.surgeFirst === "01\u201302" && wm.surgeLast === "99\u201300",
      JSON.stringify([wm.surgeFirst, wm.surgeLast]));
    R.eq("Bend Luck is classified as a reaction", wm.bendLuck, ["Reaction"]);
    R.check("Bend Luck keeps the SRD's cost and die",
      /spend 2 sorcery points to roll 1d4/.test(wm.bendText), wm.bendText.slice(0, 120));
    R.check("Wild Magic Surge keeps the SRD's trigger",
      /roll a d20 immediately after you cast a sorcerer spell of 1st level or higher/.test(wm.surgeText) &&
      /If you roll a 1, roll on the Wild Magic Surge table/.test(wm.surgeText), wm.surgeText.slice(0, 160));
    R.check("Spell Bombardment keeps its once-per-turn limit",
      /only once per turn/.test(wm.bombard), wm.bombard.slice(0, 160));
    R.eq("each source has its own label", wm.labels, ["Book", "Neon Ledger", "SRD"]);
    R.check("the SRD attribution the licence requires is present",
      wm.notice.indexOf("System Reference Document 5.1") >= 0 &&
      wm.notice.indexOf("Creative Commons Attribution 4.0") >= 0, wm.notice.slice(0, 80));
  }

  /* ---- content drift: the example character must be what the banner says ---- */
  {
    // example() is private, so drive it the way a first-time visitor does:
    // a browser with nothing saved loads the example.
    const fresh = await appPage(browser);
    await fresh.page.evaluate(() => localStorage.removeItem("ttb.character.v1"));
    await fresh.page.reload();
    await fresh.page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
    await fresh.page.waitForTimeout(250);
    const state = await fresh.page.evaluate(() => ({
      isExample: !!(document.querySelector(".note b") &&
                    /example build/i.test(document.querySelector(".note b").textContent)),
      // Play Sheet is the output, not an input — stepDone() never marks it,
      // so only the build steps before it are asserted.
      incomplete: [...document.querySelectorAll(".rail .step")]
        .slice(0, -1)
        .filter(b => !b.classList.contains("done") && b.getAttribute("aria-current") !== "true")
        .map(b => b.querySelector(".step-l").textContent.trim()),
      archetype: (() => {
        const rows = [...document.querySelectorAll(".dossier .dos-row")];
        const r = rows.find(x => /Archetype/i.test(x.textContent));
        return r ? r.querySelector(".v").textContent.trim() : null;
      })()
    }));
    R.check("example character has an archetype",
      state.archetype && state.archetype !== "not set", JSON.stringify(state.archetype));
    R.check("example character has no incomplete steps",
      state.incomplete.length === 0, JSON.stringify(state.incomplete));
    await fresh.ctx.close();
  }

  /* ---- party synergies: the only thing in the app that reads more than one
     character at once, so nothing else covers it ---- */
  {
    const syn = await page.evaluate(() => {
      const G = window.TTGM;
      const s = n => G.synergiesFor(n);
      return {
        bothNeeded: s(["Ranger", "Fighter"]).pairs.map(p => p.id),
        bothPresent: s(["Ranger", "Rogue", "Cleric"]).pairs.map(p => p.id),
        // a second copy of one half is still only one half
        twoRangers: s(["Ranger", "Ranger"]).pairs.map(p => p.id),
        // Bard is Face+Support, Cleric is Support: three distinct, not four
        secondTags: s(["Bard", "Cleric"]).roles,
        empty: s([]).roles.length,
        three: s(["Fighter", "Bard", "Wizard"]).tier.name,           // Muscle Face Support Arcane = 4
        one: s(["Fighter"]).tier.name,
        full: s(["Fighter", "Bard", "Artificer", "Wizard", "Rogue", "Cleric"]).tier.name,
        fullMissing: s(["Fighter", "Bard", "Artificer", "Wizard", "Rogue", "Cleric"]).missing,
        // roles come back in the book's order, not the order the party joined
        order: s(["Cleric", "Fighter"]).roles
      };
    });
    R.eq("a named pair needs both halves", syn.bothNeeded, []);
    R.eq("both halves present, the pair fires", syn.bothPresent, ["ambush-team"]);
    R.eq("two of the same class is not a pair", syn.twoRangers, []);
    R.eq("a class with two roles contributes both", syn.secondTags, ["Face", "Support"]);
    R.eq("no party, no roles", syn.empty, 0);
    R.eq("one class covers one role", syn.one, "Specialist Crew");
    R.eq("four roles is balanced", syn.three, "Balanced Crew");
    R.eq("all six roles", syn.full, "Full Spectrum Crew");
    R.eq("and nothing missing", syn.fullMissing, []);
    R.eq("roles come back in canonical order", syn.order, ["Muscle", "Support"]);
  }

  /* ---- the one synergy that is a number ---- */
  {
    const amb = await page.evaluate(() => {
      const G = window.TTGM;
      const party = names => names.map(n => ({ c: { cls: n } }));
      return {
        lone: G.ambushTeamBonus("Ranger", party(["Ranger", "Fighter"])),
        ranger: G.ambushTeamBonus("Ranger", party(["Ranger", "Rogue"])),
        rogue: G.ambushTeamBonus("Rogue", party(["Ranger", "Rogue", "Fighter"])),
        // the bonus belongs to the pair, not to everyone standing near them
        bystander: G.ambushTeamBonus("Fighter", party(["Ranger", "Rogue", "Fighter"])),
        nobody: G.ambushTeamBonus("Wizard", party(["Wizard"]))
      };
    });
    R.eq("a Ranger with no Rogue gets nothing", amb.lone, 0);
    R.eq("Ranger of a real pair gets +1", amb.ranger, 1);
    R.eq("Rogue of a real pair gets +1", amb.rogue, 1);
    R.eq("a bystander gets nothing from someone else's pair", amb.bystander, 0);
    R.eq("a class outside the pair gets nothing", amb.nobody, 0);
  }

  /* ---- Street Cred: the expansion's table, finally attached to something ---- */
  {
    const rep = await page.evaluate(() => {
      const G = window.TTGM;
      const mods = [], tiers = [];
      for (let r = -10; r <= 10; r++) { mods.push(G.repState(r).mod); tiers.push(G.repState(r).tier); }
      return {
        mods, tiers,
        // out of range must not fall off either end of the table
        low: G.repState(-99).tier, high: G.repState(99).tier,
        // a hand-edited vault can carry 2.6; it used to fall between bands
        frac: G.repState(2.6).tier,
        clampUp: G.repSet(99), clampDown: G.repSet(-99), round: G.repSet(3)
      };
    });
    R.eq("every point of Cred has a modifier", rep.mods,
      [-5, -5, -4, -4, -3, -3, -2, -2, -1, -1, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    R.check("infamy costs what fame pays",
      rep.mods.every((m, i) => m === -rep.mods[rep.mods.length - 1 - i]), JSON.stringify(rep.mods));
    R.eq("the positive bands are still the expansion's", rep.tiers.slice(10),
      ["Nobody", "Known face", "Known face", "Somebody", "Somebody",
       "Name", "Name", "Legend", "Legend", "Myth", "Myth"]);
    R.eq("and the negative half mirrors them", rep.tiers.slice(0, 10),
      ["Blacklisted", "Blacklisted", "Poison", "Poison", "Marked", "Marked",
       "Bad paper", "Bad paper", "Burned", "Burned"]);
    R.eq("below the track is still the bottom band", rep.low, "Blacklisted");
    R.eq("above the track is still the top band", rep.high, "Myth");
    R.eq("a fractional value rounds into a band", rep.frac, "Somebody");
    R.eq("setting above 10 clamps", rep.clampUp, 10);
    R.eq("setting below -10 clamps there now, not at zero", rep.clampDown, -10);
    R.eq("setting in range is kept", rep.round, 3);
  }

  /* ---- and it reaches the number the Ruling Desk actually shows ---- */
  {
    const cha = await page.evaluate(() => {
      const T = window.TT, G = window.TTGM;
      const c = T.migrate({ name: "R", level: 5, cls: "Bard", method: "pointbuy",
        scores: { Str: 8, Dex: 12, Con: 12, Int: 10, Wis: 10, Cha: 16 },
        skills: ["Persuasion", "Athletics"] });
      const d = T.statsOf(c);
      const at = rep => { G.repSet(rep); return {
        cha: G.repSkillBonus("Persuasion", d), str: G.repSkillBonus("Athletics", d) }; };
      const base = { cha: T.skillBonus("Persuasion", d), str: T.skillBonus("Athletics", d) };
      const zero = at(0), five = at(5), bad = at(-6);
      G.repSet(0);
      return { base, zero, five, bad };
    });
    R.eq("at no reputation a Charisma check is unchanged", cha.zero.cha, cha.base.cha);
    R.eq("at Cred 5 a Charisma check gains the band's +3", cha.five.cha, cha.base.cha + 3);
    R.eq("at Cred -6 the same check loses that band's 3", cha.bad.cha, cha.base.cha - 3);
    R.eq("a Strength check never moves", cha.five.str, cha.base.str);
    R.eq("not even when they are hated", cha.bad.str, cha.base.str);
    R.eq("and it did not move at zero either", cha.zero.str, cha.base.str);
  }

  /* ---- the reaction roll: one question asked at three moments ---- */
  {
    const rx = await page.evaluate(() => {
      const G = window.TTGM;
      const n = t => G.reactionBand(t).name;
      G.repSet(0);
      const rolls = [];
      for (let i = 0; i < 40; i++) { const r = G.npcReaction(0); rolls.push(r); }
      return {
        bounds: [n(-3), n(5), n(6), n(10), n(11), n(15), n(16), n(20), n(21), n(99)],
        // every roll must land in a band and carry the reputation it used
        allBanded: rolls.every(r => r.band && r.band.name),
        natInRange: rolls.every(r => r.roll.nat >= 1 && r.roll.nat <= 20),
        totalMatches: rolls.every(r => r.roll.total === r.roll.nat + r.roll.bonus)
      };
    });
    R.eq("the reaction bands run bottom to top without a gap", rx.bounds,
      ["Hostile", "Hostile", "Wary", "Wary", "Neutral", "Neutral",
       "Friendly", "Friendly", "Ally", "Ally"]);
    R.check("every reaction roll lands in a band", rx.allBanded, "");
    R.check("every reaction roll is a real d20", rx.natInRange, "");
    R.check("the total is the die plus the modifier", rx.totalMatches, "");
  }

  /* ---- reputation moves the reaction roll, which is the whole point ---- */
  {
    const swing = await page.evaluate(() => {
      const G = window.TTGM;
      G.repSet(0); const low = G.npcReaction(0).rep;
      G.repSet(9); const high = G.npcReaction(0).rep;
      const withSit = G.npcReaction(4).roll.bonus;
      G.repSet(0);
      return { low, high, withSit };
    });
    R.eq("at the bottom the roll gets nothing", swing.low, 0);
    R.eq("at Myth the roll carries +5", swing.high, 5);
    R.eq("a situational modifier stacks on top", swing.withSit, 9);
  }

  await ctx.close();
  return R;
};
