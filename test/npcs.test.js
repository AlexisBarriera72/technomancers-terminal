/* NPCs that level with the table: npcs.js's archetypes, gm.js's npcBuild(),
 * the NPC level slider, and an old roster moving onto it. */
"use strict";
const fs = require("fs");
const path = require("path");
const { Results, appPage, FILE_URL } = require("./lib");

const ROOT = path.join(__dirname, "..");
function load(file) {
  const win = {};
  new Function("window", fs.readFileSync(path.join(ROOT, file), "utf8"))(win);
  return win;
}

// a party record the NPCs screen reads its average level from
const rec = (id, level) => ({ id, name: id, cls: "Fighter", level, player: "", source: "test",
  added: 1, updated: 1, payload: JSON.stringify({ id, name: id, cls: "Fighter", level }) });

async function gmPage(browser, seed) {
  const out = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
  await out.page.evaluate(s => {
    localStorage.clear();
    localStorage.setItem("ttb.gm", "1");
    Object.keys(s).forEach(k => localStorage.setItem(k, JSON.stringify(s[k])));
  }, seed || {});
  await out.page.reload();
  await out.page.waitForFunction(() => window.TT && window.TTGM, null, { timeout: 10000 });
  await out.page.evaluate(() => { const T = window.TT; T.setMode("table"); T.gmSec(3); T.render(); });
  out.page.on("dialog", d => d.accept());
  return out;
}

module.exports = async function (browser) {
  const R = new Results();

  /* ============================== the data ============================== */
  {
    const N = load("npcs.js").TTNPC;
    const A = N.archetypes, cats = N.categories.map(c => c.id);
    R.check("at least forty NPCs", A.length >= 40, String(A.length));
    R.eq("no id or name twice", [A.length - new Set(A.map(a => a.id)).size, A.length - new Set(A.map(a => a.name)).size], [0, 0]);
    R.eq("the categories asked for are there",
      ["street", "religious", "house"].filter(c => cats.indexOf(c) < 0), []);
    R.eq("every category has at least three NPCs",
      cats.filter(c => A.filter(a => a.cat === c).length < 3), []);
    const bad = [];
    A.forEach(a => {
      if (cats.indexOf(a.cat) < 0) bad.push(a.id + ": category " + a.cat);
      if (!N.roles[a.role]) bad.push(a.id + ": role " + a.role);
      if (!a.kits || !a.kits.length || a.kits.some(k => !N.kits[k])) bad.push(a.id + ": kits");
      if (!a.scores || ["Str", "Dex", "Con", "Int", "Wis", "Cha"].some(k => !(a.scores[k] >= 1))) bad.push(a.id + ": scores");
      if (!a.scores[a.prime]) bad.push(a.id + ": prime");
      if (!a.desc) bad.push(a.id + ": desc");
      [].concat(a.powers || [], a.traits || [], a.reactions || []).forEach(f => {
        if (!f.name || !f.text || !(f.min >= 1 && f.min <= 20)) bad.push(a.id + ": " + (f.name || "a feature"));
        if (/\{dmg\}/.test(f.text) && !(f.dice && f.dice.length === 4)) bad.push(a.id + ": " + f.name + " says {dmg} with no dice");
        const odd = (f.text.match(/\{[^}]*\}/g) || []).filter(t => ["{dc}", "{pb}", "{dmg}"].indexOf(t) < 0);
        if (odd.length) bad.push(a.id + ": " + f.name + " " + odd.join());
      });
    });
    Object.keys(N.kits).forEach(k => {
      const kit = N.kits[k];
      if (kit.names.length !== 4 || kit.dice.length !== 4 || (kit.ammo && kit.ammo.length !== 4)) bad.push("kit " + k);
    });
    R.eq("every NPC is complete and every feature fills in", bad, []);
    R.eq("the old templates' names are all still there",
      ["Gutter Ganger", "Corpo Security", "Corpo Lieutenant", "Combat Drone", "Ripperdoc", "Netrunner",
       "Street Samurai", "Cyberpsycho", "Hunter-Killer", "Civilian", "House Enforcer", "Choir Fragment"]
        .filter(n => !A.some(a => a.name === n)), []);
  }

  /* ============================== the numbers ============================== */
  {
    const { page, ctx, errors } = await gmPage(browser);
    const b = await page.evaluate(() => {
      const G = window.TTGM, A = window.TTNPC.archetypes, XP = window.TTBGM.xpByCr;
      const cs = A.find(a => a.name === "Corpo Security");
      const at = L => G.npcBuild(cs, L);
      const l3 = at(3), l5 = at(5), l12 = at(12);
      const wrong = [];
      A.forEach(a => {
        let prev = null;
        for (let L = 1; L <= 20; L++) {
          const s = G.npcBuild(a, L);
          if (!(s.cr in XP)) wrong.push(a.id + " L" + L + " CR " + s.cr);
          if (!(s.hp >= 1 && s.ac >= 8)) wrong.push(a.id + " L" + L + " hp/ac");
          if (prev && (s.hp < prev.hp || s.ac < prev.ac || XP[s.cr] < XP[prev.cr] || s.dc < prev.dc))
            wrong.push(a.id + " drops at L" + L);
          if ([].concat(s.actions, s.traits, s.reactions).some(f => /\{\w+\}/.test(f.text + f.name + (f.dmg || ""))))
            wrong.push(a.id + " L" + L + " left a {token}");
          prev = s;
        }
      });
      return {
        l3: [l3.hp, l3.hpFormula, l3.ac, l3.actions[0].name, l3.actions[0].atk, l3.actions[0].dmg, l3.cr],
        l3traits: l3.traits.map(t => t.name), l5traits: l5.traits.map(t => t.name),
        l5multi: l5.actions[0].name + ": " + l5.actions[0].text,
        l12: [l12.ac, l12.actions[0].text, l12.actions[1].name, l12.pb, l12.dc, l12.scores.Dex],
        next3: l3.next, wrong,
        civ: G.npcBuild(A.find(a => a.name === "Civilian"), 12).cr,
        boss: [G.npcBuild(A.find(a => a.name === "Cyberpsycho"), 5).traits.some(t => t.name === "Legendary resistance"),
               G.npcBuild(A.find(a => a.name === "Cyberpsycho"), 9).traits.some(t => t.name === "Legendary resistance")]
      };
    });
    R.eq("Corpo Security at level 3: the old template's 26 HP, AC 15, one SMG burst at +4",
      b.l3, [26, "4d8+8", 15, "Machine pistol", 4, "2d4+2", "1/4"]);
    R.check("a feature arrives at its level", b.l3traits.indexOf("Drilled") < 0 && b.l5traits.indexOf("Drilled") >= 0,
      JSON.stringify([b.l3traits, b.l5traits]));
    R.eq("level 5 brings a second attack", b.l5multi, "Multiattack: Makes 2 weapon attacks, in any mix.");
    R.eq("level 12: better armour, three attacks, a smart SMG, +4 proficiency, Dex 20",
      b.l12, [16, "Makes 3 weapon attacks, in any mix.", "Smart SMG", 4, 17, 20]);
    R.check("it says what the next level brings", b.next3 && b.next3.level === 5 &&
      b.next3.what.indexOf("2 attacks") >= 0 && b.next3.what.indexOf("Better weapons") >= 0, JSON.stringify(b.next3));
    R.eq("every NPC, every level: a real CR, and nothing ever goes down as the level rises", b.wrong, []);
    R.eq("a bystander is worth no XP at any level", b.civ, "0");
    R.eq("a boss gains Legendary resistance at level 9", b.boss, [false, true]);
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  /* ============================== the slider ============================== */
  {
    const { page, ctx, errors } = await gmPage(browser, {
      "ttb.gm.party": [rec("a", 4), rec("b", 6), rec("c", 5)]
    });
    const s1 = await page.evaluate(() => {
      const T = window.TT, G = window.TTGM;
      const panel = document.querySelector(".gm-npclevel");
      const head = panel.textContent;
      // the library: Religious, then Hush Quieter
      [...document.querySelectorAll(".gm-npccats .chip")].find(b => b.textContent === "Religious").click();
      const cards = [...document.querySelectorAll(".gm-arch b")].map(b => b.textContent);
      [...document.querySelectorAll(".gm-arch")].find(c => c.querySelector("b").textContent === "Hush Quieter").click();
      const n = G.npcAll()[0];
      const row = document.querySelector(".gm-npc");
      return { head, cards, n: [n.name, n.arch, n.level, n.hp], row: row.querySelector("summary").textContent,
               open: row.open, block: !!row.querySelector(".gm-sb"), lvl: G.npcLevel() };
    });
    R.check("the NPC level follows the party's average (4, 6, 5 makes 5)",
      s1.lvl === 5 && /5/.test(s1.head) && /Following the party/.test(s1.head), s1.head);
    R.check("the Religious tab lists its NPCs", ["Reliquary Acolyte", "Hush Quieter", "Hush Choirmaster"].every(x => s1.cards.indexOf(x) >= 0),
      JSON.stringify(s1.cards));
    R.eq("tapping one adds it at the NPC level", s1.n.slice(0, 3), ["Hush Quieter", "hush-quieter", 5]);
    R.check("and opens its statblock", s1.open && s1.block && /Lv 5/.test(s1.row), s1.row);

    const s2 = await page.evaluate(() => {
      const G = window.TTGM, range = document.querySelector(".gm-npclevel input[type=range]");
      const before = G.npcAll()[0].hp;
      range.value = "11"; range.dispatchEvent(new Event("input")); range.dispatchEvent(new Event("change"));
      const n = G.npcAll()[0], after = n.hp, lvl = n.level;   // read now: the object is rebuilt in place
      const play = JSON.parse(localStorage.getItem("ttb.gm.play"));
      const head = document.querySelector(".gm-npclevel").textContent;
      const follow = [...document.querySelectorAll(".gm-npclevel button")].find(b => /Follow the party/.test(b.textContent));
      const label = follow && follow.textContent;
      follow.click();
      return { before, after, lvl, stored: play.npcLevel, head, label,
               back: G.npcLevel(), again: G.npcAll()[0].hp,
               storedNpc: JSON.parse(localStorage.getItem("ttb.gm.npcs"))[0].arch };
    });
    R.check("moving the slider rebuilds every NPC for the new level", s2.lvl === 11 && s2.after > s2.before,
      JSON.stringify(s2));
    R.eq("the level is kept with the table", s2.stored, 11);
    R.check("and the screen says it's set by hand", /Set by hand; the party is level 5/.test(s2.head), s2.head);
    R.eq("Follow the party goes back to the party's level", [s2.label, s2.back, s2.again], ["Follow the party (level 5)", 5, s2.before]);
    R.eq("only who the NPC is has to be stored for it to level", s2.storedNpc, "hush-quieter");

    const s3 = await page.evaluate(() => {
      const T = window.TT, G = window.TTGM, find = t => [...document.querySelectorAll("#stage button")].find(b => b.textContent.trim() === t);
      find("Edit by hand").click();
      const n = G.npcAll()[0];
      const hp5 = n.hp;
      G.setNpcLevel(15); T.render();
      const still = G.npcAll()[0];
      const editor = !!document.querySelector(".gm-npc .gm-action input");
      return { arch: still.arch || null, hp: [hp5, still.hp], editor };
    });
    R.eq("Edit by hand stops it levelling: the numbers stay put", [s3.arch, s3.hp[0] === s3.hp[1]], [null, true]);
    R.check("and its numbers can be typed over", s3.editor);

    const s4 = await page.evaluate(() => {
      const T = window.TT, G = window.TTGM;
      const sel = document.querySelector(".gm-npc-arch select");
      sel.value = "corpo-security"; sel.dispatchEvent(new Event("change"));
      const n = G.npcAll()[0];
      return [n.arch, n.name, n.level, n.hp === G.npcBuild(window.TTNPC.archetypes.find(a => a.id === "corpo-security"), 15).hp];
    });
    R.eq("a hand-made NPC can start levelling again, keeping its name", s4, ["corpo-security", "Hush Quieter", 15, true]);

    const s5 = await page.evaluate(() => {
      const T = window.TT, G = window.TTGM;
      T.gmSec(1); T.render();
      const chip = [...document.querySelectorAll("#stage .chip")].find(c => /^NPC level/.test(c.textContent));
      const sel = document.querySelector("#stage select");
      const n = G.npcAll()[0];
      sel.value = n.id; sel.dispatchEvent(new Event("change"));
      const enc = JSON.parse(localStorage.getItem("ttb.gm.play")).enc;
      const cb = enc.combatants[0];
      const hd = +/^(\d+)d/.exec(n.hpFormula)[1];
      return { chip: chip && chip.textContent, ac: cb.ac === n.ac,
               hpOk: cb.hpMax >= hd + (n.hp - Math.floor(hd * 4.5)) && cb.hpMax <= hd * 8 + (n.hp - Math.floor(hd * 4.5)) };
    });
    R.eq("the Encounter screen shows the NPC level", s5.chip, "NPC level 15");
    R.check("an NPC added to a fight brings this level's AC and rolled hit points", s5.ac && s5.hpOk, JSON.stringify(s5));
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  /* ============================== an old roster ============================== */
  {
    const tmplCopy = { id: "old1", kind: "npc", name: "Door guard", role: "Soldier", cr: "1", ac: 16, hp: 26, init: 2,
      acFrom: "Armoured jacket", hpFormula: "4d8+8", actions: [{ name: "SMG", atk: 4, dmg: "2d6+2", text: "" }],
      traits: [], reactions: [], notes: "Watches the lift." };
    const tallow = { id: "st-tallow", kind: "npc", name: "Tallow", role: "Hush quieter", cr: "3", ac: 17, hp: 45, init: 2,
      hpFormula: "7d8+14", actions: [{ name: "Reliquary maul", atk: 5, dmg: "2d8+3", text: "" }], tags: ["story"] };
    const edited = Object.assign({}, tmplCopy, { id: "old2", name: "Tough guard", hp: 40 });
    const improvised = { id: "old3", kind: "npc", name: "Ketch Dace", role: "relic fence", ac: 12, hp: 9, init: 1,
      hpFormula: "2d8", actions: [{ name: "Shiv", atk: 3, dmg: "1d6+1", text: "" }], notes: "Wants: out" };
    const { page, ctx, errors } = await gmPage(browser, {
      "ttb.gm.party": [rec("a", 3)], "ttb.gm.npcs": [tmplCopy, tallow, edited, improvised]
    });
    const m = await page.evaluate(() => {
      const all = window.TTGM.npcAll(), by = id => all.find(n => n.id === id);
      const o = by("old1"), t = by("st-tallow"), e = by("old2"), i = by("old3");
      return {
        copy: [o.arch, o.name, o.role, o.notes, o.hp], tallow: [t.arch, t.name, t.role],
        edited: [e.arch || null, e.hp], improvised: [i.arch, i.kind, i.name],
        rows: document.querySelectorAll(".gm-npc").length
      };
    });
    R.eq("an untouched template copy moves onto the slider, name, notes and all",
      m.copy, ["corpo-security", "Door guard", "", "Watches the lift.", 26]);
    R.eq("a story NPC becomes what its scene now asks for", m.tallow, ["hush-quieter", "Tallow", "Hush quieter"]);
    R.eq("one the GM edited keeps its numbers", m.edited, [null, 40]);
    R.eq("an improvised one keeps its full statblock", m.improvised, ["gutter-ganger", "npc", "Ketch Dace"]);
    R.eq("all four are listed", m.rows, 4);

    // the Story screen's shortcut to a scene's level
    const st = await page.evaluate(async () => {
      const T = window.TT, G = window.TTGM, tick = () => new Promise(r => setTimeout(r, 40));
      T.gmSec(5); T.render();
      [...document.querySelectorAll("#stage button")].find(b => /Expand everything/.test(b.textContent)).click();
      await tick();
      const d = [...document.querySelectorAll("details.st-scene")].find(x => /S4/.test(x.querySelector("summary").textContent));
      const b = [...d.querySelectorAll("button")].find(x => /^NPCs to level/.test(x.textContent));
      const label = b && b.textContent;
      if (b) b.click();
      return { label, lvl: G.npcLevel() };
    });
    R.check("a scene offers to set the NPC level it's written for", /^NPCs to level \d+$/.test(st.label || ""), st.label);
    R.eq("and sets it", st.lvl, +(/(\d+)$/.exec(st.label || "0") || [0, 0])[1]);
    R.eq("no page errors", errors, []);
    await ctx.close();
  }

  return R;
};
