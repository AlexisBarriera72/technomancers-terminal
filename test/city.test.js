/* The table tools added around the fight and the city: the encounter's drag
 * order, shared NPC initiative, difficulty and morale; later, the City and
 * Toolkit screens. Driven in the browser the way a GM would use them. */
"use strict";
const { Results, appPage, FILE_URL } = require("./lib");

module.exports = async function (browser) {
  const R = new Results();

  /* ============================ the encounter ============================ */
  {
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(250);

    const names = () => page.evaluate(() =>
      [...document.querySelectorAll(".gm-init .gm-cb .who .n")].map(n => n.textContent));
    await page.evaluate(() => {
      window.TTGM.loadDemo();
      const T = window.TT; T.setMode("table"); T.gmSec(1); T.render();
    });
    const before = await names();

    // ▲ swaps a combatant with the one above, and the order sticks
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".gm-init .gm-cb")];
      [...rows[2].querySelectorAll(".gm-mv button")][0].click();
    });
    const afterUp = await names();
    R.eq("▲ moves a combatant up one place", afterUp.slice(0, 3), [before[0], before[2], before[1]]);
    await page.reload();
    await page.waitForFunction(() => !!window.TT);
    await page.waitForTimeout(250);
    await page.evaluate(() => { const T = window.TT; T.setMode("table"); T.gmSec(1); T.render(); });
    R.eq("and the new order survives a reload", (await names()).slice(0, 3), afterUp.slice(0, 3));

    // a drag by the handle, with a real pointer: the third row to the top
    const last = afterUp[2];
    const grip = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".gm-init .gm-cb")];
      rows[0].scrollIntoView({ block: "start" });
      const g = rows[2].querySelector(".gm-grip").getBoundingClientRect();
      const top = rows[0].getBoundingClientRect();
      return { x: g.x + g.width / 2, y: g.y + g.height / 2, ty: top.y + 6 };
    });
    await page.mouse.move(grip.x, grip.y);
    await page.mouse.down();
    await page.mouse.move(grip.x, grip.y - 40, { steps: 4 });
    await page.mouse.move(grip.x, grip.ty, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const dragged = await names();
    R.eq("dragging the third combatant to the top puts it first", dragged.slice(0, 3), [last, afterUp[0], afterUp[1]]);
    const inits = await page.evaluate(() =>
      [...document.querySelectorAll(".gm-init .gm-cb .init")].map(n => Number(n.textContent)));
    R.check("and the initiative column still reads top to bottom",
      inits.every((v, i) => !i || v <= inits[i - 1]), JSON.stringify(inits));

    // one roll per kind of foe, the party untouched
    const pack = await page.evaluate(() => {
      const G = window.TTGM;
      const enc = { combatants: [
        { cid: "p1", src: "pc", ref: "demo-jax", name: "Jax", init: 17 },
        { cid: "a", src: "npc", ref: "demo-n-enforcer", name: "Thorn Enforcer", init: 3, tie: 2 },
        { cid: "b", src: "npc", ref: "demo-n-enforcer", name: "Thorn Enforcer B", init: 19 },
        { cid: "c", src: "adhoc", ref: null, name: "Rat", init: 10 },
        { cid: "d", src: "adhoc", ref: null, name: "Rat B", init: 4 },
        { cid: "e", src: "npc", ref: "demo-n-drone", name: "Collections Drone", init: 1 }
      ] };
      const kinds = Object.keys(G.rollNpcInitiative(enc)).length;
      const by = id => enc.combatants.find(c => c.cid === id);
      return { kinds, pc: by("p1").init, enforcers: by("a").init === by("b").init,
               rats: by("c").init === by("d").init, tie: "tie" in by("a"), turn: enc.turnCid };
    });
    R.eq("Roll NPC initiative rolls once per kind of foe", pack.kinds, 3);
    R.check("and every copy of a kind shares the roll", pack.enforcers && pack.rats, JSON.stringify(pack));
    R.eq("the party keeps its own initiative", pack.pc, 17);
    R.check("and a dragged tie rank is cleared", !pack.tie && !!pack.turn, JSON.stringify(pack));

    // difficulty: the demo fight is 1,950 XP against five level-5 characters
    const diff = await page.evaluate(() => {
      const G = window.TTGM, T = window.TT;
      T.setMode("table"); T.gmSec(1); T.render();
      const d = G.encounterDifficulty(JSON.parse(localStorage.getItem("ttb.gm.play")).enc);
      return { d, shown: (document.querySelector(".gm-diff-band") || {}).textContent,
               xp: (document.querySelector(".gm-diff-xp") || {}).textContent,
               crs: [G.crXp("1/8"), G.crXp("4"), G.crXp("CR 2"), G.crXp("?")] };
    });
    R.eq("CR converts to XP by the SRD table", diff.crs, [25, 1100, 450, null]);
    R.eq("the demo fight's XP adds up its foes", diff.d.xp, 1100 + 200 + 200 + 450);
    R.eq("against the party's budget", diff.d.budget, [2500, 3750, 5500]);
    R.eq("which makes it Low", [diff.d.band, diff.shown, diff.xp], ["Low", "Low", "1,950"]);
    const hard = await page.evaluate(() => {
      const G = window.TTGM;
      const enc = { combatants: [{ src: "pc", ref: "demo-jax" }, { src: "npc", ref: "demo-n-dace" },
        { src: "npc", ref: "demo-n-dace" }, { src: "adhoc", ref: null }] };
      return G.encounterDifficulty(enc);
    });
    R.eq("one level-5 character against two lieutenants is over High", [hard.band, hard.uncounted], ["Over High", 1]);

    // morale: turn it on, drop half their side, roll, one breaks and flees
    const mor = await page.evaluate(async () => {
      const T = window.TT, G = window.TTGM;
      T.setMode("table"); T.gmSec(1); T.render();
      const find = t => [...document.querySelectorAll("#stage button")].find(b => b.textContent.trim() === t);
      find("Morale: off").click();
      const cardBefore = !!document.querySelector(".gm-morale");
      // the drone is already at 0; drop one Enforcer too: 2 of 4 foes down
      const row = [...document.querySelectorAll(".gm-cb")].find(r => r.querySelector(".who .n").textContent === "Thorn Enforcer");
      const hit = [...row.querySelectorAll(".hpbtn")].find(b => b.textContent === "-10");
      hit.click(); hit.click();
      T.render();
      const card = !!document.querySelector(".gm-morale");
      const orig = Math.random; Math.random = () => 0;          // every d20 comes up 1
      find("Roll morale").click();
      Math.random = orig;
      const lines = [...document.querySelectorAll(".gm-morale-line")].map(l => l.textContent);
      const fledBtn = document.querySelector(".gm-morale-line .btn");
      const who = fledBtn.parentNode.querySelector("b").textContent;
      fledBtn.click();
      const enc = JSON.parse(localStorage.getItem("ttb.gm.play")).enc;
      const gone = enc.combatants.find(c => c.name === who);
      const struck = [...document.querySelectorAll(".gm-cb.fled .who .n")].map(n => n.textContent);
      return { cardBefore, card, lines: lines.length, breaks: lines.every(t => /breaks/.test(t)),
               who, fled: !!gone.fled, struck, morale: enc.morale };
    });
    R.eq("morale is off until the GM turns it on, then on", [mor.cardBefore, mor.morale], [false, true]);
    R.check("half their side down asks for a morale check", mor.card, "");
    R.check("Roll morale rolls for every foe still standing", mor.lines === 2 && mor.breaks, JSON.stringify(mor));
    R.check("Fled marks that foe, struck through", mor.fled && mor.struck.indexOf(mor.who) >= 0, JSON.stringify(mor));

    const skip = await page.evaluate(() => {
      const G = window.TTGM;
      const enc = { round: 1, turnCid: "a", combatants: [
        { cid: "a", name: "A", init: 20 }, { cid: "b", name: "B", init: 15, fled: true }, { cid: "c", name: "C", init: 10 }] };
      G.stepTurn(enc, 1);
      const one = enc.turnCid;
      G.stepTurn(enc, -1);
      return [one, enc.turnCid];
    });
    R.eq("a fled combatant is skipped in the turn order, both ways", skip, ["c", "a"]);

    const es = await page.evaluate(() => {
      const T = window.TT; T.setLang("es"); T.setMode("table"); T.gmSec(1); T.render();
      const out = { band: (document.querySelector(".gm-diff-head .gm-label") || {}).textContent,
                    buttons: [...document.querySelectorAll("#stage .gm-turnbar button")].map(b => b.textContent) };
      T.setLang("en");
      return out;
    });
    R.eq("in Spanish the difficulty label translates", es.band, "Dificultad");
    R.check("and the new buttons", es.buttons.indexOf("Tirar iniciativa de PNJ") >= 0 &&
      es.buttons.indexOf("Moral: sí") >= 0, JSON.stringify(es.buttons));

    R.eq("no page errors on the Encounter screen", errors, []);
    await ctx.close();
  }

  return R;
};
