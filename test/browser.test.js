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
