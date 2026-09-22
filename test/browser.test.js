/* End-to-end behaviour in a real browser: injection, persistence honesty,
 * share-link transitions, the GM tools, and the existing app still working. */
"use strict";
const { Results, appPage, shareCode, baseChar, FILE_URL } = require("./lib");

module.exports = async function (browser) {
  const R = new Results();

  /* ================= item 1: no script execution from a share link ======== */
  {
    const payload = shareCode(baseChar({
      name: "Pwn", origin: "<img src=x onerror=\"window.__pwned=1\">"
    }));
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#c=" + payload });
    await page.waitForTimeout(400);
    const pwned = await page.evaluate(() => !!window.__pwned);
    R.check("item 1 — onerror payload in a text field does not execute", pwned === false);
    const rendered = await page.evaluate(() => ({
      stage: document.querySelector("#stage").children.length,
      dossier: document.querySelector("#dossier").children.length,
      badge: (document.querySelector(".lvl-badge") || {}).textContent
    }));
    R.check("item 1 — page still renders after a hostile payload",
      rendered.stage > 0 && rendered.dossier > 0, JSON.stringify(rendered));
    R.check("item 1 — no uncaught errors from a hostile payload", errors.length === 0,
      errors.join(" | "));
    await ctx.close();
  }

  /* item 1b: the same payload pasted into an already-open tab (hashchange) */
  {
    const { page, ctx } = await appPage(browser);
    const payload = shareCode(baseChar({ name: "Pwn2", origin: "<img src=x onerror=\"window.__pwned=1\">" }));
    await page.evaluate(p => { location.hash = "#c=" + p; }, payload);
    await page.waitForTimeout(400);
    const pwned = await page.evaluate(() => !!window.__pwned);
    R.check("item 1 — hashchange path does not execute either", pwned === false);
    await ctx.close();
  }

  /* item 4: a crafted link must not blank the page */
  {
    for (const [label, over] of [
      ["unknown class", { cls: "Netrunner" }],
      ["null ASI slot", { asi: [null] }],
      ["fractional level", { level: 2.5, cls: "Chromehound" }],
      ["NaN-ish level", { level: 99 }]
    ]) {
      const { page, ctx, errors } = await appPage(browser,
        { url: FILE_URL + "#c=" + shareCode(baseChar(over)) });
      await page.waitForTimeout(300);
      const n = await page.evaluate(() => ({
        rail: document.querySelector("#rail").children.length,
        stage: document.querySelector("#stage").children.length
      }));
      R.check("item 4 — " + label + " still renders", n.rail > 0 && n.stage > 0,
        JSON.stringify(n) + " " + errors.join(" | "));
      await ctx.close();
    }
  }

  /* ================= item 2: a failed save must not claim success ========= */
  {
    const { page, ctx } = await appPage(browser);
    await page.evaluate(() => {
      // Make every write throw, the way a full quota or blocked storage does.
      const real = Storage.prototype.setItem;
      window.__restore = () => { Storage.prototype.setItem = real; };
      Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
    });
    const said = await page.evaluate(() => {
      const name = document.querySelector(".dos-name");
      if (name) { name.value = "Storage Test"; name.dispatchEvent(new Event("input", { bubbles: true })); }
      const btn = [...document.querySelectorAll(".dossier button")]
        .find(b => /save to roster/i.test(b.textContent));
      if (!btn) return { err: "no save button" };
      btn.click();
      const t = document.querySelector(".toast");
      return { toast: t ? t.textContent : null };
    });
    R.check("item 2 — failed save does not report success",
      !said.err && said.toast && !/saved to this browser/i.test(said.toast),
      "toast=" + JSON.stringify(said));
    await page.evaluate(() => window.__restore && window.__restore());
    await ctx.close();
  }

  /* ================= item 3: GM export contains on-screen edits =========== */
  {
    const { page, ctx } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);
    const out = await page.evaluate(async () => {
      // Type a clock name on the Clocks screen, then break storage and make a
      // second edit that cannot persist. The export must still contain it.
      const goTo = label => {
        const b = [...document.querySelectorAll(".rail .step")]
          .find(x => x.textContent.indexOf(label) >= 0);
        if (b) b.click();
      };
      goTo("Clocks");
      await new Promise(r => setTimeout(r, 250));
      const add = [...document.querySelectorAll(".gm-row button")]
        .find(x => /6-segment/.test(x.textContent));
      if (!add) return { err: "no add-clock button" };
      add.click();
      await new Promise(r => setTimeout(r, 250));

      const ta = document.querySelector(".gm-scratch");
      if (!ta) return { err: "no scratchpad" };
      ta.value = "BEFORE"; ta.dispatchEvent(new Event("input", { bubbles: true }));

      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { throw new Error("QuotaExceededError"); };
      ta.value = "AFTER-THE-FAILURE"; ta.dispatchEvent(new Event("input", { bubbles: true }));

      // Capture the export instead of downloading it. gm.js calls T.saveAs at
      // call time, so replacing the property intercepts it.
      let captured = null;
      const origSaveAs = window.TT.saveAs;
      window.TT.saveAs = function (name, text) { captured = text; };
      goTo("Party");
      await new Promise(r => setTimeout(r, 250));
      const btn = [...document.querySelectorAll("button")]
        .find(x => /export gm vault/i.test(x.textContent));
      if (!btn) { window.TT.saveAs = origSaveAs; Storage.prototype.setItem = real;
                  return { err: "no export button" }; }
      btn.click();
      window.TT.saveAs = origSaveAs;
      Storage.prototype.setItem = real;

      let parsed = null;
      try { parsed = JSON.parse(captured); } catch (e) {}
      return {
        scratch: parsed && parsed.play ? parsed.play.scratch : null,
        stored: (JSON.parse(localStorage.getItem("ttb.gm.play") || "{}")).scratch
      };
    });
    R.check("item 3 — export captured", !out.err, JSON.stringify(out));
    R.eq("item 3 — export contains the edit that failed to save",
      out.scratch, "AFTER-THE-FAILURE");
    await ctx.close();
  }

  /* ================= item 5: share fragment cleared on leaving ============ */
  {
    const payload = shareCode(baseChar({ name: "Shared One" }));
    const { page, ctx } = await appPage(browser, { url: FILE_URL + "#c=" + payload });
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => location.hash);
    R.check("item 5 — share link loads with the fragment present", before.indexOf("#c=") === 0, before);
    // "New character" — accept the confirm dialog
    page.on("dialog", d => d.accept());
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".dossier button")]
        .find(x => /new character/i.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => location.hash);
    R.check("item 5 — New character clears the share fragment", after.indexOf("c=") < 0,
      "hash=" + JSON.stringify(after));
    await ctx.close();
  }

  /* ================= regressions: the app still works ==================== */
  {
    const { page, ctx, errors } = await appPage(browser);
    const st = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll(".modes button")].filter(b => !b.hidden).map(b => b.textContent),
      rail: (document.querySelector(".rail-title") || {}).textContent,
      stage: document.querySelector("#stage").children.length,
      gmHidden: document.querySelector("#mTable").hidden
    }));
    R.eq("player still sees three tabs", st.tabs, ["Forge", "Codex", "Campaign"]);
    R.check("Table tab still hidden by default", st.gmHidden === true);
    R.check("Forge still renders", st.stage > 0 && st.rail === "Build order", JSON.stringify(st));
    R.check("no console errors on a normal load", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  /* GM unlock still works */
  {
    const { page, ctx } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => ({
      hidden: document.querySelector("#mTable").hidden,
      hash: location.hash,
      rail: (document.querySelector(".rail-title") || {}).textContent
    }));
    R.check("GM unlock still reveals the Table tab", st.hidden === false, JSON.stringify(st));
    R.check("GM unlock still strips its own hash", st.hash === "", JSON.stringify(st));
    await ctx.close();
  }

  /* ============ item 13: the turn marker must follow the combatant ======== */
  {
    const { page, ctx } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);

    // Build a deterministic encounter directly in the live play slot.
    const seed = async () => page.evaluate(() => {
      const enc = { id: "e1", name: "T", round: 1, turnCid: null, turnIx: 0, combatants: [
        { cid: "k1", src: "adhoc", ref: null, name: "Rook",  init: 19, ac: 12, hpMax: 20, hp: 20, tmp: 0, conds: [], dead: false, notes: "" },
        { cid: "k2", src: "adhoc", ref: null, name: "Nyx",   init: 14, ac: 12, hpMax: 20, hp: 20, tmp: 0, conds: [], dead: false, notes: "" },
        { cid: "k3", src: "adhoc", ref: null, name: "Gang",  init: 9,  ac: 12, hpMax: 20, hp: 20, tmp: 0, conds: [], dead: false, notes: "" }
      ] };
      const p = JSON.parse(localStorage.getItem("ttb.gm.play") || "{}");
      p.enc = enc; p.mode = "table";
      localStorage.setItem("ttb.gm.play", JSON.stringify(p));
    });
    const goEncounter = async () => {
      await page.reload();
      await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
      await page.waitForTimeout(250);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll(".rail .step")].find(x => /Encounter/.test(x.textContent));
        if (b) b.click();
      });
      await page.waitForTimeout(250);
    };
    const whoseTurn = () => page.evaluate(() => {
      const t = document.querySelector(".gm-turn");
      return t ? t.textContent.replace(/'s turn$/, "") : null;
    });
    const nextTurn = async () => { await page.evaluate(() => {
      const b = [...document.querySelectorAll(".gm-turnbar button")].find(x => /Next turn/.test(x.textContent));
      if (b) b.click(); }); await page.waitForTimeout(250); };
    const removeNamed = async name => { await page.evaluate(n => {
      const row = [...document.querySelectorAll(".gm-cb")].find(r => r.querySelector(".who .n").textContent === n);
      const b = [...row.querySelectorAll("button")].find(x => x.textContent.trim() === "Remove");
      if (b) b.click(); }, name); await page.waitForTimeout(300); };

    await seed(); await goEncounter();
    await nextTurn();                              // Rook -> Nyx
    R.eq("item 13 — turn advances in initiative order", await whoseTurn(), "Nyx");

    await removeNamed("Rook");                     // removing ABOVE the active one
    R.eq("item 13 — removing a combatant above keeps the same one active",
      await whoseTurn(), "Nyx");

    // adding one that rolls higher must not steal the marker either
    await seed(); await goEncounter();
    await nextTurn();
    R.eq("item 13 — reseeded, Nyx active", await whoseTurn(), "Nyx");
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".gm-row button")].find(x => /Ad-hoc/.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      // give the newcomer a high initiative so it sorts above Nyx
      const p = JSON.parse(localStorage.getItem("ttb.gm.play"));
      const added = p.enc.combatants[p.enc.combatants.length - 1];
      added.init = 17; added.name = "Newcomer";
      localStorage.setItem("ttb.gm.play", JSON.stringify(p));
    });
    await goEncounter();
    R.eq("item 13 — adding a higher-initiative combatant does not move the marker",
      await whoseTurn(), "Nyx");

    // removing the ACTIVE one must hand over to the next in order
    await removeNamed("Nyx");
    R.eq("item 13 — removing the active one advances to the next in order",
      await whoseTurn(), "Gang");
    await ctx.close();
  }

  /* ============ item 17: a template must not carry temp HP =============== */
  {
    const { page, ctx } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);
    const tmp = await page.evaluate(async () => {
      const p = JSON.parse(localStorage.getItem("ttb.gm.play") || "{}");
      // a template saved mid-fight, carrying a buff
      localStorage.setItem("ttb.gm.encounters", JSON.stringify([{
        id: "t1", name: "Saved mid-fight", created: Date.now(), round: 3, turnIx: 1,
        combatants: [{ cid: "x1", src: "adhoc", ref: null, name: "Buffed", init: 12,
                       ac: 12, hpMax: 30, hp: 11, tmp: 7, conds: ["Prone"], dead: false, notes: "" }]
      }]));
      p.enc = null; localStorage.setItem("ttb.gm.play", JSON.stringify(p));
      return true;
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".rail .step")].find(x => /Encounter/.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".gm-libline button")].find(x => /Run it/.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(400);
    const ran = await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem("ttb.gm.play")).enc.combatants[0];
      return { hp: c.hp, hpMax: c.hpMax, tmp: c.tmp, conds: c.conds, dead: c.dead };
    });
    R.eq("item 17 — Run it clears temp HP", ran.tmp, 0);
    R.eq("item 17 — Run it still restores hit points", ran.hp, ran.hpMax);
    R.eq("item 17 — Run it still clears conditions", ran.conds, []);
    await ctx.close();
  }

  /* ============ item 15: the printed campaign follows the character ====== */
  {
    const { page, ctx } = await appPage(browser);
    const printed = await page.evaluate(async () => {
      // A character built under Cathedra, while the Campaign tab browses nothing.
      const c = window.TT.migrate({ id: "pc1", name: "Printed", level: 3, cls: "Rogue",
        method: "pointbuy", scores: { Str: 10, Dex: 14, Con: 12, Int: 12, Wis: 10, Cha: 10 },
        arrayMap: {}, skills: [], bgPicks: [], asi: [], picks: {}, subChoices: {},
        feats: [], invocations: [], infusions: [], cyber: [], augments: [], gear: [],
        traits: {}, campaign: "cathedra" });
      localStorage.setItem("ttb.character.v1", JSON.stringify(c));
      localStorage.removeItem("ttb.campaign");     // nothing being browsed
      return true;
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
    await page.waitForTimeout(300);
    // The print buttons live on the Play Sheet step.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".rail .step")]
        .find(x => /Play Sheet/.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(300);
    const label = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")]
        .find(x => /^Classic sheet/i.test(x.textContent.trim()));
      if (!b) return { err: "no classic print button" };
      b.click();
      const head = document.querySelector(".cs-head .meta");
      return { text: head ? head.textContent : null };
    });
    R.check("item 15 — printed campaign comes from the character",
      !label.err && /Cathedra/.test(label.text || ""), JSON.stringify(label));
    await ctx.close();
  }

  /* ===================== Spanish is a display layer only ================== */
  {
    const { page, ctx, errors } = await appPage(browser);
    // build a character in English, then switch
    await page.evaluate(() => {
      const T = window.TT;
      const c = T.blank();
      c.name = "Nyx"; c.cls = "Rogue"; c.sub = "rogue-saboteur"; c.bg = "hacker";
      c.level = 8; c.skills = ["Stealth", "Perception"];
      c.scores = { Str: 10, Dex: 16, Con: 14, Int: 14, Wis: 12, Cha: 8 };
      localStorage.setItem("ttb.character.v1", JSON.stringify(c));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
    await page.waitForTimeout(250);

    const before = await page.evaluate(() => ({
      stored: localStorage.getItem("ttb.character.v1"),
      modes: [...document.querySelectorAll(".modes button")].map(b => b.textContent)
    }));

    await page.evaluate(() => document.querySelector("#langBtn").click());
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => ({
      modes: [...document.querySelectorAll(".modes button")].map(b => b.textContent),
      rail: [...document.querySelectorAll(".rail .step")].map(b => b.textContent.trim()),
      note: !!document.querySelector(".lang-note"),
      btn: document.querySelector("#langBtn").textContent,
      html: document.documentElement.getAttribute("lang"),
      pref: localStorage.getItem("ttb.lang"),
      // the character must be byte-identical: language is not part of a sheet
      stored: localStorage.getItem("ttb.character.v1"),
      // nothing may leak an empty node
      empties: [...document.querySelectorAll("#stage *, .rail *")]
        .filter(e => e.children.length === 0 && /^\s*(undefined|null)\s*$/.test(e.textContent)).length
    }));
    R.check("the language button switches the interface to Spanish",
      after.modes[0] === "Forja" && after.modes[1] === "Códice", JSON.stringify(after.modes));
    R.check("the step rail is translated too",
      after.rail.some(t => /Arquetipo/.test(t)) && after.rail.some(t => /Caracter/.test(t)),
      JSON.stringify(after.rail));
    R.check("a machine-translation notice is shown", after.note === true);
    R.check("the button now offers English back", after.btn === "EN", after.btn);
    R.eq("the document language attribute follows", after.html, "es");
    R.eq("the preference is persisted", after.pref, "es");
    R.eq("switching language does not touch the saved character", after.stored, before.stored);
    R.eq("no undefined leaks into the page", after.empties, 0);
    R.check("switching language raises no errors", errors.length === 0, errors.join(" | "));

    // and it survives a reload
    await page.reload();
    await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
    await page.waitForTimeout(300);
    const reloaded = await page.evaluate(() =>
      [...document.querySelectorAll(".modes button")].map(b => b.textContent));
    R.check("the preference survives a reload", reloaded[0] === "Forja", JSON.stringify(reloaded));

    // switching back restores English exactly, including the static masthead
    await page.evaluate(() => document.querySelector("#langBtn").click());
    await page.waitForTimeout(300);
    const back = await page.evaluate(() => ({
      modes: [...document.querySelectorAll(".modes button")].map(b => b.textContent),
      note: !!document.querySelector(".lang-note"),
      html: document.documentElement.getAttribute("lang")
    }));
    R.eq("switching back restores the English masthead", back.modes, before.modes);
    R.check("the notice goes away with it", back.note === false);
    R.eq("and the document language with it", back.html, "en");
    await ctx.close();
  }

  /* A share link must mean the same thing in either language */
  {
    const a = await appPage(browser);
    await a.page.evaluate(() => {
      const T = window.TT;
      const c = T.blank();
      c.name = "Nyx"; c.cls = "Rogue"; c.sub = "rogue-saboteur"; c.bg = "hacker";
      c.level = 8; c.skills = ["Stealth", "Perception"];
      localStorage.setItem("ttb.character.v1", JSON.stringify(c));
      localStorage.setItem("ttb.lang", "es");
    });
    await a.page.reload();
    await a.page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
    await a.page.waitForTimeout(300);
    const code = await a.page.evaluate(() =>
      window.TT.b64u(JSON.stringify(window.TT.slimChar(window.TT.migrate(
        JSON.parse(localStorage.getItem("ttb.character.v1")))))));
    await a.ctx.close();

    // opened by somebody running the site in English
    const b2 = await appPage(browser, { url: FILE_URL + "#c=" + code });
    await b2.page.waitForTimeout(400);
    const got = await b2.page.evaluate(() => {
      const c = window.TT.migrate(JSON.parse(atob(location.hash.slice(3).replace(/-/g, "+").replace(/_/g, "/"))));
      const d = window.TT.statsOf(c);
      return { cls: c.cls, sub: c.sub, skills: c.skills.slice().sort(), ac: d.ac.ac, hp: d.hp };
    });
    R.eq("a sheet built in Spanish carries the English class key",
      [got.cls, got.sub], ["Rogue", "rogue-saboteur"]);
    R.eq("and the English skill keys", got.skills, ["Perception", "Stealth"]);
    R.check("and the numbers still compute from them",
      typeof got.ac === "number" && got.ac > 0 && typeof got.hp === "number" && got.hp > 0,
      JSON.stringify(got));
    await b2.ctx.close();
  }

  /* Initiative fix from the earlier pass must stay fixed */
  {
    const { page, ctx } = await appPage(browser);
    const init = await page.evaluate(() => {
      const c = window.TT.migrate({ id: "i", name: "I", level: 5, cls: "Chromehound",
        method: "pointbuy", scores: { Str: 14, Dex: 16, Con: 16, Int: 10, Wis: 12, Cha: 8 },
        arrayMap: {}, skills: [], bgPicks: [], asi: [], picks: {}, subChoices: {},
        feats: [], invocations: [], infusions: [], cyber: [], augments: [], gear: [], traits: {} });
      return window.TT.initiative(window.TT.statsOf(c));
    });
    R.eq("Chromehound initiative still includes Con", init, 6);
    await ctx.close();
  }

  /* ========== party synergies and Street Cred on the GM's screens ========== */
  {
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);

    // Ranger + Rogue is the one wired pair; Streetdoc + Chromehound is a named
    // one that is not. Records carry the denormalised name/cls/level the vault
    // writes alongside the payload.
    await page.evaluate(() => {
      const T = window.TT;
      const mk = (name, cls, level) => {
        const c = T.blank();
        c.id = "id-" + name; c.name = name; c.cls = cls; c.level = level;
        c.scores = { Str: 12, Dex: 15, Con: 14, Int: 11, Wis: 13, Cha: 14 };
        c.skills = ["Stealth", "Persuasion"];
        return { id: c.id, name: name, cls: cls, level: level, player: "", source: "test",
                 added: Date.now(), updated: Date.now(), payload: JSON.stringify(c) };
      };
      localStorage.setItem("ttb.gm.party", JSON.stringify([
        mk("Vex", "Ranger", 5), mk("Nyx", "Rogue", 5),
        mk("Doc", "Streetdoc", 4), mk("Ox", "Chromehound", 6),
        mk("Brick", "Fighter", 5)
      ]));
      const p = JSON.parse(localStorage.getItem("ttb.gm.play") || "{}");
      p.mode = "table"; p.rep = 6;
      localStorage.setItem("ttb.gm.play", JSON.stringify(p));
    });
    const goSection = async name => {
      await page.reload();
      await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
      await page.waitForTimeout(250);
      await page.evaluate(n => {
        const b = [...document.querySelectorAll(".rail .step")].find(x => new RegExp(n, "i").test(x.textContent));
        if (b) b.click();
      }, name);
      await page.waitForTimeout(300);
    };

    await goSection("Party");
    const party = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".gm-syn-card")];
      const initOf = who => {
        const card = [...document.querySelectorAll(".gm-card")]
          .find(c => (c.querySelector(".gm-name") || {}).textContent === who);
        if (!card) return null;
        const v = [...card.querySelectorAll(".gm-v")]
          .find(x => /INIT/i.test((x.querySelector(".k") || {}).textContent || ""));
        return v ? v.textContent : null;
      };
      return {
        named: cards.map(c => (c.querySelector("b") || {}).textContent),
        wired: cards.filter(c => c.classList.contains("wired"))
          .map(c => (c.querySelector("b") || {}).textContent),
        covered: [...document.querySelectorAll(".gm-syn .chip:not(.off)")].map(c => c.textContent),
        missing: [...document.querySelectorAll(".gm-syn .chip.off")].map(c => c.textContent),
        tier: (document.querySelector(".gm-syn-cov b") || {}).textContent,
        ranger: initOf("Vex"), rogue: initOf("Nyx"), medic: initOf("Doc"),
        credTier: (document.querySelector(".gm-rep .meter-head b") || {}).textContent
      };
    });
    R.check("both named pairs at this table are found",
      party.named.indexOf("Ambush Team") >= 0 && party.named.indexOf("Trauma Team") >= 0,
      JSON.stringify(party.named));
    R.eq("only the pair that carries a number is marked as wired", party.wired, ["Ambush Team"]);
    R.eq("the roles this party covers", party.covered.sort(), ["Muscle", "Stealth", "Support"]);
    R.eq("and the ones it does not", party.missing.sort(), ["Arcane", "Face", "Tech"]);
    R.check("three roles is a specialist crew", /Specialist/.test(party.tier || ""), party.tier);
    R.check("the Ranger's card shows the pair bonus", /Ambush Team/.test(party.ranger || ""), party.ranger);
    R.check("so does the Rogue's", /Ambush Team/.test(party.rogue || ""), party.rogue);
    R.check("the Streetdoc's does not", !/Ambush Team/.test(party.medic || ""), party.medic);
    R.check("the Cred meter names the band", /Name/.test(party.credTier || ""), party.credTier);

    /* per-character: what this one brings, and who they bring it with */
    const pairs = await page.evaluate(() => {
      const cardOf = n => [...document.querySelectorAll(".gm-card")]
        .find(c => (c.querySelector(".gm-name") || {}).textContent === n);
      const read = n => [...cardOf(n).querySelectorAll(".gm-pair")].map(r => ({
        pair: r.querySelector(".n").textContent,
        with: r.querySelector(".w").textContent,
        live: r.classList.contains("live") }));
      return { vex: read("Vex"), brick: read("Brick") };
    });
    R.eq("a live pair names the person, not the class",
      pairs.vex, [{ pair: "Ambush Team", with: "Nyx", live: true }]);
    R.eq("a pair whose other half is absent names the class and stays unlit",
      pairs.brick, [{ pair: "Shield Wall", with: "Paladin", live: false },
                    { pair: "Warband", with: "Barbarian", live: false }]);

    /* the number the GM moves is the number that persists */
    await page.evaluate(() => {
      const plus = [...document.querySelectorAll(".gm-rep-ctl button")].find(b => b.textContent === "+1");
      plus.click(); plus.click();
    });
    await page.waitForTimeout(250);
    const bumped = await page.evaluate(() => ({
      shown: (document.querySelector(".gm-rep .meter-head b") || {}).textContent,
      stored: JSON.parse(localStorage.getItem("ttb.gm.play") || "{}").rep
    }));
    R.eq("+1 twice moves 6 to 8", bumped.stored, 8);
    R.check("and the meter says so", /\+8/.test(bumped.shown || ""), bumped.shown);

    await goSection("Party");
    const afterReload = await page.evaluate(() =>
      (document.querySelector(".gm-rep .meter-head b") || {}).textContent);
    R.check("Street Cred survives a reload", /\+8/.test(afterReload || ""), afterReload);

    /* the slider has to survive its own input: it used to be rebuilt on every
       step, so arrows lost focus after one press and a drag went nowhere */
    await page.focus(".gm-rep input[type=range]");
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
    const keyed = await page.evaluate(() => ({
      rep: window.TTGM.repGet(),
      focus: document.activeElement === document.querySelector(".gm-rep input[type=range]"),
      said: document.querySelector(".gm-rep input[type=range]").getAttribute("aria-valuetext")
    }));
    R.eq("three arrow presses move Cred three points", keyed.rep, 5);
    R.check("and the slider keeps focus", keyed.focus, "");
    R.eq("and announces the band", keyed.said, "Street Cred +5, Name");
    await page.evaluate(() => { window.TTGM.repSet(8); });

    /* it reaches the Ruling Desk's odds, which is the point of wiring it */
    await goSection("Rulings");
    const desk = await page.evaluate(() => {
      // pick a Charisma skill and read one row of the party table
      const chip = [...document.querySelectorAll(".gm-picker .chip")].find(c => c.textContent === "Persuasion");
      if (chip) chip.click();
      const rows = [...document.querySelectorAll(".gm-picker table tr")].slice(1);
      const cell = rows.length ? rows[0].children[1].textContent.trim() : null;
      return { hasTool: !!document.querySelector(".gm-react"),
               badge: !!document.querySelector(".gm-rep-badge"), cell: cell };
    });
    R.check("the reaction tool is on the ruling desk", desk.hasTool, "");
    R.check("so is the Street Cred badge", desk.badge, "");
    // Cha 14 (+2) + prof (+3) = +5, plus the +4 that Cred 8 is worth
    R.eq("a Persuasion check carries the reputation", desk.cell, "+9");

    const rolled = await page.evaluate(() => {
      [...document.querySelectorAll(".gm-react button")].find(b => /Roll the reaction/.test(b.textContent)).click();
      const out = document.querySelector(".gm-react .gm-roll-out");
      return out ? out.textContent : "";
    });
    R.check("rolling it names one of the five bands",
      /Hostile|Wary|Neutral|Friendly|Ally/.test(rolled), JSON.stringify(rolled.slice(0, 60)));

    /* and the same tool opens inside a fight without leaving it */
    await goSection("Encounter");
    await page.evaluate(() => {
      [...document.querySelectorAll("button")].find(b => /\+ Party/.test(b.textContent)).click();
    });
    await page.waitForTimeout(350);
    const fight = await page.evaluate(() => {
      [...document.querySelectorAll("button")].find(b => /Reaction check/.test(b.textContent)).click();
      return { inline: !!document.querySelector(".gm-react-slot .gm-react"),
               badge: !!document.querySelector(".gm-turnbar .gm-rep-badge"),
               stillEncounter: /Encounter/.test((document.querySelector(".stage-head h2") || {}).textContent || "") };
    });
    R.check("the reaction check opens inside the encounter", fight.inline, "");
    R.check("without navigating away from it", fight.stillEncounter, "");
    R.check("and the fight shows what the city thinks of them", fight.badge, "");

    R.check("no uncaught errors across the GM screens", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  /* the GM's new screens have to speak Spanish too — they are built by gm.js
     after render(), which is exactly where applyLang() is easy to forget */
  {
    const { page, ctx } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const T = window.TT;
      const mk = (name, cls, level) => {
        const c = T.blank();
        c.id = "id-" + name; c.name = name; c.cls = cls; c.level = level;
        c.scores = { Str: 12, Dex: 15, Con: 14, Int: 11, Wis: 13, Cha: 14 };
        c.skills = ["Stealth", "Persuasion"];
        return { id: c.id, name, cls, level, player: "", source: "t",
                 added: Date.now(), payload: JSON.stringify(c) };
      };
      localStorage.setItem("ttb.gm.party", JSON.stringify([
        mk("Vex", "Ranger", 5), mk("Nyx", "Rogue", 5)]));
      localStorage.setItem("ttb.gm.play",
        JSON.stringify({ clocks: [], scratch: "", rep: -6, mode: "table" }));
      localStorage.setItem("ttb.lang", "es");
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT && window.TTES && window.TTES.book,
      null, { timeout: 15000 });
    await page.waitForTimeout(400);

    const es = await page.evaluate(() => {
      const T = window.TT;
      T.setMode("table"); T.gmSec(0); T.render();
      const strip = document.querySelector(".gm-rep");
      const syn = document.querySelector(".gm-syn");
      return {
        // the band name comes from the book's own Street Cred table
        band: (strip.querySelector(".meter-head b") || {}).textContent,
        // these three are the lines the GM actually reads out
        notes: [...strip.querySelectorAll(".meter-note")].map(n => n.textContent),
        synHead: (syn.querySelector(".gm-label") || {}).textContent,
        line: (syn.querySelector(".gm-syn-line") || {}).textContent,
        roles: [...syn.querySelectorAll(".chip")].map(c => c.textContent),
        // the pair's own name is a proper noun and stays English, like a class
        pairName: (syn.querySelector(".gm-syn-card b") || {}).textContent
      };
    });
    R.check("a negative Cred band is translated too", /Señalados/.test(es.band), es.band);
    R.check("so are the three lines under it",
      es.notes.every(n => /Carisma|indagar|feo/.test(n)), JSON.stringify(es.notes));
    R.check("including the penalty, which needs its own sign in the key",
      /-3 a las pruebas de Carisma/.test(es.notes[0] || ""), es.notes[0]);
    R.check("and the synergy heading", /juntos/i.test(es.synHead), es.synHead);
    R.check("and the pair's line", /exploradores/.test(es.line), es.line);
    R.check("and the role chips", es.roles.indexOf("Músculo") >= 0, JSON.stringify(es.roles));
    R.eq("but the pair's name stays English, like a class name", es.pairName, "Ambush Team");

    // "Name" is a band and a form label; it used to come out as the label
    const bands = await page.evaluate(() => {
      const T = window.TT, out = [];
      for (const r of [5, 8]) {
        window.TTGM.repSet(r); T.gmSec(0); T.render();
        out.push((document.querySelector(".gm-rep .meter-head b") || {}).textContent);
      }
      window.TTGM.repSet(-6);
      return out;
    });
    R.check("the Name band is a reputation, not a form label",
      /Un nombre/.test(bands[0]) && !/Nombre$/.test(bands[0]), bands[0]);
    R.check("and the positive bands are translated too", /Leyenda/.test(bands[1]), bands[1]);

    // built by a click, long after applyLang() has run
    const rolled = await page.evaluate(() => {
      const T = window.TT;
      T.gmSec(2); T.render();
      [...document.querySelectorAll(".gm-react button")]
        .find(b => /Tira la reacci|Roll the reaction/.test(b.textContent)).click();
      return document.querySelector(".gm-react .gm-say").textContent;
    });
    const pv = await page.evaluate(() => {
      const T = window.TT;
      T.setMode("forge"); T.render();
      const r = [...document.querySelectorAll(".rail .step")].find(x => /Clase|Class/i.test(x.textContent));
      if (r) r.click();
      const w = [...document.querySelectorAll(".pick-wrap")]
        .find(x => (x.querySelector(".pick h3") || {}).textContent.trim().indexOf("Fighter") === 0);
      w.querySelector(".sec-toggle").click();
      w.querySelectorAll(".syn-pv-row .sec-toggle")[0].click();
      return { head: w.querySelector(".sec-toggle").textContent,
               role: (w.querySelector(".syn-pv-body .chip") || {}).textContent,
               partner: (w.querySelector(".syn-pv-row .count") || {}).textContent,
               pairName: (w.querySelector(".syn-pv-row b") || {}).textContent,
               line: (w.querySelector(".syn-pv-line") || {}).textContent };
    });
    R.check("the preview's heading is translated", /Sinergias/.test(pv.head), pv.head);
    R.check("and the role chip", /Músculo/.test(pv.role || ""), pv.role);
    R.check("and the partner line, with the class name passed through",
      /^con Paladin/.test((pv.partner || "").trim()), pv.partner);
    R.check("and the pair's own line", /primera línea/.test(pv.line || ""), (pv.line || "").slice(0, 50));
    R.eq("but the pair's name stays English here too", pv.pairName, "Shield Wall");

    R.check("a reaction rolled after render is still Spanish",
      /Actúan|regañadientes|Negocio|inclina|Interviene/.test(rolled), rolled.slice(0, 70));

    await page.evaluate(() => localStorage.setItem("ttb.lang", "en"));
    await ctx.close();
  }

  /* ===== the synergy preview on the class cards ===== */
  {
    const { page, ctx, errors } = await appPage(browser);
    await page.evaluate(() => {
      window.__wrap = name => [...document.querySelectorAll(".pick-wrap")]
        .find(w => (w.querySelector(".pick h3") || {}).textContent.trim().indexOf(name) === 0);
      window.TT.setMode("forge"); window.TT.render();
      const r = [...document.querySelectorAll(".rail .step")].find(x => /Class/i.test(x.textContent));
      if (r) r.click();
    });
    await page.waitForTimeout(300);

    const shut = await page.evaluate(() => {
      const w = window.__wrap("Fighter");
      return { count: w.querySelector(".sec-toggle .count").textContent.trim(),
               hidden: w.querySelector(".syn-pv-body").hidden,
               // the preview must be a sibling of the card, never inside it:
               // a button cannot contain a button
               nested: !!w.querySelector("button.pick .sec-toggle") };
    });
    R.eq("Fighter's card counts its pairs before you open it", shut.count, "2");
    R.check("and starts closed", shut.hidden === true, "");
    R.check("the disclosure is beside the card, not inside the button", !shut.nested, "");

    await page.evaluate(() => window.__wrap("Fighter").querySelector(".sec-toggle").click());
    await page.waitForTimeout(150);
    const open = await page.evaluate(() => {
      const w = window.__wrap("Fighter");
      return { roles: [...w.querySelectorAll(".syn-pv-body .chip")].map(c => c.textContent),
               rows: [...w.querySelectorAll(".syn-pv-row .sec-toggle")].map(t => t.textContent.trim()),
               detailsShut: [...w.querySelectorAll(".syn-pv-det")].every(d => d.hidden) };
    });
    R.eq("it names the role the class covers", open.roles, ["Muscle"]);
    R.check("and both pairs, each with its partner class",
      open.rows.length === 2 && /Shield Wall/.test(open.rows[0]) && /Paladin/.test(open.rows[0]) &&
      /Warband/.test(open.rows[1]) && /Barbarian/.test(open.rows[1]), JSON.stringify(open.rows));
    R.check("the second level is still closed", open.detailsShut, "");

    await page.evaluate(() =>
      window.__wrap("Fighter").querySelectorAll(".syn-pv-row .sec-toggle")[0].click());
    await page.waitForTimeout(150);
    const deep = await page.evaluate(() => {
      const d = window.__wrap("Fighter").querySelector(".syn-pv-det");
      return { open: !d.hidden, line: d.querySelector(".syn-pv-line").textContent };
    });
    R.check("clicking a pair opens its detail", deep.open, "");
    R.check("which is that pair's own line", /front-liners holding the same door/.test(deep.line),
      deep.line.slice(0, 50));

    /* render() rebuilds the whole stage, so picking the class you were reading
       about would otherwise shut the thing you opened to decide with */
    await page.evaluate(() => window.__wrap("Fighter").querySelector("button.pick").click());
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      window.__wrap = name => [...document.querySelectorAll(".pick-wrap")]
        .find(w => (w.querySelector(".pick h3") || {}).textContent.trim().indexOf(name) === 0);
      const w = window.__wrap("Fighter");
      return { pressed: w.querySelector("button.pick").getAttribute("aria-pressed"),
               body: !w.querySelector(".syn-pv-body").hidden,
               det: !w.querySelector(".syn-pv-det").hidden };
    });
    R.eq("choosing that class selects it", after.pressed, "true");
    R.check("and the preview is still open after the re-render", after.body && after.det,
      JSON.stringify(after));

    /* a class in no pair must not render an empty disclosure */
    const none = await page.evaluate(() => {
      const empties = [...document.querySelectorAll(".pick-wrap")]
        .filter(w => !w.querySelector(".sec-toggle"))
        .map(w => w.querySelector(".pick h3").textContent.trim());
      return empties;
    });
    R.eq("every class is in at least one pair, so none render empty", none, []);
    R.check("no uncaught errors from the preview", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  /* ===== the roster used to strand everything past the twelfth save ===== */
  {
    const { page, ctx } = await appPage(browser);
    await page.evaluate(() => {
      const T = window.TT, list = [];
      for (let i = 1; i <= 15; i++) {
        const c = T.blank(); c.id = "r" + i; c.name = "Char" + i; c.cls = "Fighter"; c.level = 1;
        list.push({ id: c.id, name: c.name, cls: c.cls, level: 1, updated: 1000 + i,
                    payload: JSON.stringify(c) });
      }
      localStorage.setItem("ttb.roster", JSON.stringify(list));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT, null, { timeout: 10000 });
    await page.waitForTimeout(300);
    const names = () => page.evaluate(() =>
      [...document.querySelectorAll("#roster .roster-item .nm")].map(x => x.textContent));
    const before = await names();
    R.eq("the short list is the twelve most recent", before.length, 12);
    R.check("the oldest are not in it yet", before.indexOf("Char1") < 0, JSON.stringify(before));
    const label = await page.evaluate(() => {
      const b = [...document.querySelectorAll("#roster button")].find(x => /Show all/.test(x.textContent));
      if (b) b.click();
      return b ? b.textContent : null;
    });
    R.eq("a control offers the rest, with the real count", label, "Show all 15");
    await page.waitForTimeout(150);
    const after = await names();
    R.eq("and shows every save", after.length, 15);
    R.check("including the three that used to be unreachable",
      ["Char1", "Char2", "Char3"].every(n => after.indexOf(n) >= 0), JSON.stringify(after));
    await ctx.close();
  }

  /* ===== every toast has Spanish =====
     Toasts only appear after an action, so a sweep of the screens never sees
     them — which is how 29 of them went out English. This reads the source. */
  {
    const fs = require("fs"), path = require("path");
    const root = path.join(__dirname, "..");
    const win = {};
    new Function("window", fs.readFileSync(path.join(root, "es-ui.js"), "utf8"))(win);
    const ui = win.TTES.ui;
    const numKey = s => { let i = 0; return s.replace(/\d+/g, () => "{" + (i++) + "}"); };
    const missing = [];
    for (const f of ["app.js", "gm.js"]) {
      const src = fs.readFileSync(path.join(root, f), "utf8");
      const re = /toast\(\s*("(?:[^"\\]|\\.)*")\s*\)/g;
      let m;
      while ((m = re.exec(src))) {
        const lit = JSON.parse(m[1]);
        if (/[áéíóúñ]/.test(lit)) continue;            // already written in Spanish
        if (!ui[lit] && !ui[numKey(lit)]) missing.push(f + ": " + lit);
      }
    }
    R.eq("every plain toast message has a Spanish entry", missing, []);
  }

  /* ===== the level slider survives its own input =====
     It re-rendered the whole page on every step, replacing itself: arrows
     moved one level and dropped focus, and a drag stopped after one level. */
  {
    const { page, ctx, errors } = await appPage(browser);
    const hp = () => page.evaluate(() =>
      [...document.querySelectorAll(".vital")].map(v => v.textContent).join("|"));
    const before = { lvl: await page.evaluate(() => +document.querySelector("#levelRange").value), hp: await hp() };
    await page.focus("#levelRange");
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    const after = await page.evaluate(() => ({
      lvl: +document.querySelector("#levelRange").value,
      badge: document.querySelector(".lvl-badge").textContent,
      focus: document.activeElement && document.activeElement.id
    }));
    R.eq("three arrow presses move three levels", after.lvl, before.lvl + 3);
    R.eq("the badge follows", after.badge, String(before.lvl + 3));
    R.eq("and the slider keeps focus", after.focus, "levelRange");
    R.check("the sheet is redrawn for the new level", (await hp()) !== before.hp, before.hp);

    const box = await page.locator("#levelRange").boundingBox();
    const y = box.y + box.height / 2, x0 = box.x + (after.lvl - 1) / 19 * box.width;
    await page.mouse.move(x0, y); await page.mouse.down();
    for (let i = 1; i <= 15; i++) await page.mouse.move(x0 + i * box.width / 15, y);
    await page.mouse.up();
    R.eq("a drag runs the whole track", await page.evaluate(() => +document.querySelector("#levelRange").value), 20);
    R.eq("no page errors moving the level", errors, []);
    await ctx.close();
  }

  /* ===== a filter keystroke keeps the page in Spanish =====
     Filters redraw only the stage, and applyLang ran only in render(). */
  {
    const { page, ctx } = await appPage(browser);
    await page.evaluate(() => localStorage.setItem("ttb.lang", "es"));
    await page.reload();
    await page.waitForFunction(() => window.TT && window.TTES && window.TTES.book, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.TT.setMode("codex"); window.TT.render(); });
    await page.fill("#codexSearch", "a");
    await page.waitForTimeout(200);
    const head = await page.evaluate(() => document.querySelector("#stage").innerText.slice(0, 40));
    R.check("typing in the Codex filter keeps the page in Spanish", /CÓDICE|Códice/.test(head), head);
    await ctx.close();
  }

  /* ===== counted toasts read as sentences in both languages =====
     The static check above can't see these: they are built from a number. */
  {
    const { page, ctx } = await appPage(browser);
    const es = await page.evaluate(() => {
      window.TT.setLang("es");
      const out = [
        "Added 1 character", "Added 3 characters", "Added 2 characters from the roster",
        "Added 1 NPC to stat up", "Updated Rook", "Merged 1 character, 0 NPCs, 2 encounters"
      ].map(s => window.TT.T(s));
      window.TT.setLang("en");
      return out;
    });
    R.eq("counted toasts are whole Spanish sentences", es, [
      "1 personaje añadido", "3 personajes añadidos", "2 personajes añadidos desde el archivo",
      "1 PNJ añadido; faltan sus estadísticas", "Rook actualizado",
      "Fusionados: 1 personaje, 0 PNJ y 2 encuentros"
    ]);
    await ctx.close();
  }

  /* ===== restoring a vault brings Street Cred back, and can't freeze Clocks =====
     The export always carried rep; the import dropped it. And the clock card
     draws one button per segment, so a hand-edited count hung the tab. */
  {
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);
    const out = await page.evaluate(async () => {
      window.TTGM.importVault(JSON.stringify({
        kind: "ttb-gm-vault", version: 1, party: [], npcs: [], encounters: [],
        play: { rep: -6, scratch: "notes", clocks: [
          { id: "c1", name: "Huge", seg: 1e9, filled: 3 },
          { name: "No id", seg: 4 },
          { id: "c3", name: "Overfull", seg: "8", filled: 99 }
        ] }
      }));
      const toast = (document.querySelector(".toast") || {}).textContent || "";
      const stored = JSON.parse(localStorage.getItem("ttb.gm.play"));
      const step = [...document.querySelectorAll(".rail .step")]
        .find(x => x.textContent.indexOf("Clocks") >= 0);
      if (step) step.click();
      await new Promise(r => setTimeout(r, 250));
      return {
        toast, rep: stored.rep,
        clocks: stored.clocks.map(c => [c.id, c.seg, c.filled]),
        segs: document.querySelectorAll(".gm-seg").length
      };
    });
    R.eq("a restored vault brings its Street Cred", out.rep, -6);
    R.eq("clocks are cleaned on the way in", out.clocks, [["c1", 6, 3], ["c3", 8, 8]]);
    R.eq("and the Clocks screen draws them", out.segs, 14);
    R.check("the merge toast counts in English", /^Merged 0 characters, 0 NPCs, 0 encounters$/.test(out.toast),
      JSON.stringify(out.toast));
    R.eq("no page errors restoring a vault", errors, []);
    await ctx.close();
  }

  /* ===== the Neon Noir look: what it promises, as behaviour =====
     Styling itself is checked by eye; these are the parts a refactor could
     silently drop — role chips, the quiet header, dark by default, the
     empty-screen pictures, and motion that fires once rather than on every
     redraw. */
  {
    // a system set to light still opens dark: dark is the default now
    const { page, ctx, errors } = await appPage(browser, { context: { colorScheme: "light" } });
    const look = await page.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number);
      const meta = document.querySelector("#brandMeta");
      return { theme: document.documentElement.getAttribute("data-theme"),
               dark: bg[0] + bg[1] + bg[2] < 120, meta: meta.textContent, title: meta.title };
    });
    R.check("dark by default, even on a light-mode system", look.dark && !look.theme, JSON.stringify(look));
    R.eq("the header shows only the version", look.meta, "v1.5");
    R.check("and keeps the build one hover away", /build \d{4}-\d{2}-\d{2}/.test(look.title), look.title);
    await page.click("#themeBtn");
    const light = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      stored: localStorage.getItem("ttb.theme") }));
    R.eq("one tap switches to light, and remembers it", light, { theme: "light", stored: "light" });

    // role chips on the class card itself, with an icon
    await page.evaluate(() => { const T = window.TT; T.setMode("forge"); T.render();
      document.querySelectorAll(".rail .step")[0].click(); });
    await page.waitForTimeout(200);
    const cards = await page.evaluate(() => {
      const card = n => [...document.querySelectorAll(".pick-wrap")]
        .find(w => (w.querySelector("h3") || {}).textContent === n);
      const roles = n => [...card(n).querySelectorAll(".pick > .pick-roles .chip.role")]
        .map(c => [c.textContent, c.className.match(/role-(\w+)/)[1], !!c.querySelector("svg.ri path, svg.ri circle")]);
      return { fighter: roles("Fighter"), bard: roles("Bard") };
    });
    R.eq("a class card shows its role, with an icon", cards.fighter, [["Muscle", "muscle", true]]);
    R.eq("and both roles when it has two", cards.bard, [["Face", "face", true], ["Support", "support", true]]);

    // picking lights the card once; a later redraw of the same pick does not
    const glow = await page.evaluate(async () => {
      const wrapOf = n => [...document.querySelectorAll(".pick-wrap")]
        .find(w => (w.querySelector("h3") || {}).textContent === n);
      wrapOf("Monk").querySelector(".pick").click();
      await new Promise(r => setTimeout(r, 50));
      const after = wrapOf("Monk");
      const lit = after.classList.contains("just-picked") && after.classList.contains("on");
      window.TT.render();
      await new Promise(r => setTimeout(r, 50));
      return { lit, again: wrapOf("Monk").classList.contains("just-picked") };
    });
    R.check("a picked card lights up", glow.lit, JSON.stringify(glow));
    R.check("but not again on a redraw", !glow.again, JSON.stringify(glow));
    R.eq("no page errors in the new look", errors, []);
    await ctx.close();
  }
  {
    // the GM side: empty screens get a picture, a party gets role chips,
    // and crossing a Street Cred band flares while moving inside one does not
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(300);
    const emptyArt = await page.evaluate(() => {
      const T = window.TT, out = {};
      [[0, "party"], [1, "encounter"], [3, "npcs"], [4, "clocks"]].forEach(([i, k]) => {
        T.setMode("table"); T.gmSec(i); T.render();
        out[k] = !!document.querySelector("#stage .empty-state.art svg.empty-art");
      });
      return out;
    });
    R.eq("every empty GM screen has its picture", emptyArt,
      { party: true, encounter: true, npcs: true, clocks: true });

    await page.evaluate(() => {
      const T = window.TT;
      const mk = (name, cls) => { const c = T.blank(); c.id = "id-" + name; c.name = name; c.cls = cls; c.level = 5;
        return { id: c.id, name, cls, level: 5, player: "", source: "t", added: 1, updated: 1, payload: JSON.stringify(c) }; };
      localStorage.setItem("ttb.gm.party", JSON.stringify([mk("Vex", "Ranger"), mk("Brick", "Fighter")]));
      localStorage.setItem("ttb.gm.play", JSON.stringify({ rep: 3, clocks: [], scratch: "", mode: "table" }));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT);
    await page.waitForTimeout(250);
    const gm = await page.evaluate(() => {
      const T = window.TT; T.setMode("table"); T.gmSec(0); T.render();
      const card = n => [...document.querySelectorAll(".gm-card")]
        .find(c => (c.querySelector(".gm-name") || {}).textContent === n);
      const plus = () => [...document.querySelectorAll(".gm-rep-ctl button")].find(b => b.textContent === "+1");
      const flared = () => !!document.querySelector(".gm-rep .tier-name.rank-shift");
      plus().click();                      // 3 -> 4, still Somebody
      const inside = flared();
      plus().click();                      // 4 -> 5, Somebody -> Name
      const across = flared();
      return {
        vex: [...card("Vex").querySelectorAll(".gm-card-head .chip.role")].map(c => c.textContent),
        covered: [...document.querySelectorAll(".gm-syn .chip.role:not(.off)")].map(c => c.textContent),
        inside, across
      };
    });
    R.eq("a party card carries its role chip", gm.vex, ["Stealth"]);
    R.eq("the crew's coverage is role chips too", gm.covered, ["Muscle", "Stealth"]);
    R.check("moving inside a band does not flare", !gm.inside, JSON.stringify(gm));
    R.check("crossing into a new band does", gm.across, JSON.stringify(gm));
    R.eq("no page errors on the GM side of the new look", errors, []);
    await ctx.close();
  }

    /* the retired per-character slider must not come back */
  {
    const { page, ctx } = await appPage(browser);
    const gone = await page.evaluate(() => ({
      slider: !!document.querySelector("#credRange"),
      field: "cred" in window.TT.blank()
    }));
    R.check("the per-character Cred slider is gone", !gone.slider, "");
    R.check("and the field is off the character", !gone.field, "");
    await ctx.close();
  }

  return R;
};
