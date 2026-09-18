/* End-to-end behaviour in a real browser: injection, persistence honesty,
 * share-link transitions, the GM tools, and the existing app still working. */
"use strict";
const { Results, appPage, shareCode, baseChar, FILE_URL } = require("./lib");

module.exports = async function (browser) {
  const R = new Results();

  /* ================= item 1: no script execution from a share link ======== */
  {
    const payload = shareCode(baseChar({
      name: "Pwn", cred: "<img src=x onerror=\"window.__pwned=1\">"
    }));
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#c=" + payload });
    await page.waitForTimeout(400);
    const pwned = await page.evaluate(() => !!window.__pwned);
    R.check("item 1 — onerror payload in cred does not execute", pwned === false);
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
    const payload = shareCode(baseChar({ name: "Pwn2", cred: "<img src=x onerror=\"window.__pwned=1\">" }));
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

  return R;
};
