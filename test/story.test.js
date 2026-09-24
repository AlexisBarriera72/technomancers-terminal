/* The Story tab: "The Fourth Minute".
 *
 * Two halves. The data lint reads story.js directly and holds the story to
 * its own promises, every scene carries every category, every reference
 * resolves, so a later edit can't quietly leave a hole the GM finds mid-game.
 * The browser half drives the tab the way a GM would. */
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

module.exports = async function (browser) {
  const R = new Results();

  /* ============================ data lint ============================ */
  {
    const ST = load("story.js").TTST;
    const GM = load("gm.js").TTBGM;
    const SY = load("synergy.js").TTSY;
    const scenes = ST.acts.reduce((a, x) => a.concat(x.scenes), []);
    const ids = scenes.map(s => s.id);

    R.eq("four acts", ST.acts.length, 4);
    R.eq("twelve scenes, one a session", scenes.map(s => s.session), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    R.check("scene ids are unique", new Set(ids).size === ids.length, JSON.stringify(ids));
    R.eq("levels run 3 to 12", [scenes[0].level, scenes[scenes.length - 1].level], [3, 12]);
    R.check("and never go down", scenes.every((s, i) => !i || s.level >= scenes[i - 1].level), "");

    const need = {
      truth: s => typeof s.truth === "string" && s.truth.length > 80,
      readAloud: s => s.readAloud.length >= 1,
      hooks: s => SY.roles.every(r => typeof s.hooks[r] === "string" && s.hooks[r]),
      questions: s => s.questions.length >= 3 && s.questions.every(q => q.q && q.a),
      notAsked: s => s.notAsked.length >= 2 && s.notAsked.every(x => x["if"] && x.then && x.recover),
      missed: s => s.missed.length >= 2 && s.missed.every(x => x.detail && x.means && x.ifMissed),
      right: s => s.right.length >= 2 && s.right.every(c => c.call && c.result && c.lead),
      wrong: s => s.wrong.length >= 2 && s.wrong.every(c => c.call && c.result && c.lead),
      goesWrong: s => s.goesWrong.length >= 3,
      checks: s => s.checks.length >= 3 && s.checks.every(c => c.what && c.skill && typeof c.dc === "number"),
      visions: s => !!s.fixedEcho || s.echoes.length >= 1,
      lists: s => Array.isArray(s.scars) && Array.isArray(s.cred) && Array.isArray(s.clocks) &&
                  Array.isArray(s.npcs) && Array.isArray(s.keystones)
    };
    const holes = [];
    scenes.forEach(s => Object.keys(need).forEach(k => { if (!need[k](s)) holes.push(s.id + ": " + k); }));
    R.eq("every scene carries every category", holes, []);

    const FEEDS = ["mercy", "violence", "lies", "questions"];
    const badCalls = [];
    scenes.forEach(s => s.right.concat(s.wrong).forEach(c => {
      if (c.feed && FEEDS.indexOf(c.feed) < 0) badCalls.push(s.id + " feed " + c.feed);
      if (c.doom && !(c.doom >= 1 && c.doom <= 7)) badCalls.push(s.id + " doom " + c.doom);
      if (c.salvage != null && typeof c.salvage !== "number") badCalls.push(s.id + " salvage");
    }));
    R.eq("every call's Feed, Doom and Salvage is valid", badCalls, []);

    R.eq("seven fragments", ST.fragments.map(f => f.n), [1, 2, 3, 4, 5, 6, 7]);
    const fragScenes = {};
    scenes.forEach(s => { if (s.fragment) fragScenes[s.fragment.n] = true; });
    R.check("every fragment has a scene where it can come true",
      ST.fragments.every(f => fragScenes[f.n]), JSON.stringify(fragScenes));

    R.eq("twelve keystones", ST.keystones.map(k => k.id),
      ["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9", "k10", "k11", "k12"]);
    R.check("every keystone has a keep, an omen and a scar",
      ST.keystones.every(k => k.keep && k.omen && k.scar), "");
    const kref = [];
    ST.keystones.forEach(k => {
      if (k.scene !== "any" && ids.indexOf(k.scene) < 0) kref.push(k.id + " -> " + k.scene);
      if (k.scene !== "any" && scenes.filter(s => s.id === k.scene)[0].keystones.indexOf(k.id) < 0)
        kref.push(k.id + " not listed on " + k.scene);
    });
    scenes.forEach(s => s.keystones.forEach(id => {
      if (!ST.keystones.some(k => k.id === id)) kref.push(s.id + " lists unknown " + id);
    }));
    R.eq("keystones and scenes point at each other", kref, []);

    R.eq("the fixed visions are sessions 1, 7 and 12",
      scenes.filter(s => s.fixedEcho).map(s => s.session), [1, 7, 12]);
    R.eq("the Eye-chrome has five chances to turn up", ST.eyeChrome.chances.length, 5);

    const tmpl = GM.npcTemplates.map(t => t.name);
    const badNpc = [];
    scenes.forEach(s => s.npcs.forEach(n => {
      if (tmpl.indexOf(n.template) < 0) badNpc.push(s.id + ": " + n.name + " uses " + n.template);
      if (!n.id || !n.name || !n.role) badNpc.push(s.id + ": incomplete npc");
    }));
    R.eq("every story NPC uses a real template", badNpc, []);
    const badClock = [];
    scenes.forEach(s => s.clocks.forEach(c => {
      if (!c.id || !c.name || !(c.seg >= 2 && c.seg <= 12)) badClock.push(s.id + ": " + JSON.stringify(c));
    }));
    R.eq("every story clock is a clock the Clocks screen can draw", badClock, []);
    R.check("every random table has one row per face of its die",
      ST.tables.every(t => t.rows.length === t.die), JSON.stringify(ST.tables.map(t => [t.id, t.die, t.rows.length])));
    R.check("the endings cover every Salvage band, Feed and the moth",
      ["ash", "embers", "exodus", "witnesses", "feed", "moth"].every(id => ST.endings.some(e => e.id === id)), "");

    // the demo walkthrough: a whole campaign, one step a session
    const W = ST.walkthrough || [];
    R.eq("the walkthrough has thirteen steps, before session 1 and one a session", W.length, 13);
    R.check("every step says what happened and what the GM pressed",
      W.every(w => w.title && w.narrative && w.actions && w.actions.length >= 3),
      JSON.stringify(W.map(w => [w.title, (w.actions || []).length])));
    const wref = [];
    W.forEach((w, i) => {
      const a = w.add || {}, set = w.set || {};
      (a.done || []).concat(Object.keys(a.branch || {}), Object.keys(a.notes || {}))
        .forEach(id => { if (ids.indexOf(id) < 0) wref.push(i + ": scene " + id); });
      if (set.current && ids.indexOf(set.current) < 0) wref.push(i + ": current " + set.current);
      Object.keys(a.keys || {}).forEach(k => {
        if (!ST.keystones.some(x => x.id === k)) wref.push(i + ": keystone " + k);
        if (["kept", "broken"].indexOf(a.keys[k]) < 0) wref.push(i + ": keystone state " + a.keys[k]);
      });
      Object.keys(a.feed || {}).forEach(k => { if (FEEDS.indexOf(k) < 0) wref.push(i + ": feed " + k); });
      (a.doom || []).forEach(d => { if (!(d >= 1 && d <= 7)) wref.push(i + ": doom " + d); });
      (a.echoes || []).forEach(e => { if (ids.indexOf(e.scene) < 0) wref.push(i + ": echo " + e.scene); });
    });
    R.eq("every step points at real scenes, keystones and Feeds", wref, []);

    R.eq("every named synergy pair says what it does",
      SY.pairs.filter(p => typeof p.effect !== "string" || p.effect.length < 10).map(p => p.id), []);
    R.eq("and only Ambush Team claims to be automatic",
      SY.pairs.filter(p => p.wired).map(p => p.id), ["ambush-team"]);
  }

  /* ============================ in the browser ============================ */
  {
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(250);

    // the demo arrives with the story under way
    const top = await page.evaluate(() => {
      window.TTGM.loadDemo();
      const T = window.TT; T.setMode("table"); T.gmSec(5); T.render();
      const rail = [...document.querySelectorAll(".rail .step")].map(x => x.textContent.replace(/^[\s·\d]+/, "").trim());
      return {
        rail, title: (document.querySelector("#stage h2") || {}).textContent,
        acts: document.querySelectorAll("details.st-act").length,
        doomOn: document.querySelectorAll(".st-doom .gm-seg.on").length,
        dossier: (document.querySelector("#dossier") || {}).textContent || ""
      };
    });
    R.check("the rail has a Story tab", top.rail.indexOf("Story") >= 0, JSON.stringify(top.rail));
    R.eq("the Story screen shows four acts", top.acts, 4);
    R.eq("the demo has one fragment of Doom ticked", top.doomOn, 1);
    R.check("the GM panel names the current scene", /The warm bleed/.test(top.dossier), top.dossier.slice(0, 200));

    // everything opens, nothing throws
    const all = await page.evaluate(async () => {
      [...document.querySelectorAll("#stage button")].find(b => /Expand everything/.test(b.textContent)).click();
      await new Promise(r => setTimeout(r, 50));
      return { scenes: document.querySelectorAll("details.st-scene[open]").length,
               cats: document.querySelectorAll("details.st-cat[open]").length };
    });
    R.eq("expanding everything opens all twelve scenes", all.scenes, 12);
    R.check("and every category inside them", all.cats >= 12 * 14, JSON.stringify(all));

    // role hooks name the characters who can take them
    const hooks = await page.evaluate(() => {
      const sc = [...document.querySelectorAll("details.st-scene")].find(d => /warm bleed/.test(d.querySelector("summary").textContent));
      const rows = [...sc.querySelectorAll(".st-cat-hooks .st-hook")];
      const row = r => rows.find(x => x.querySelector(".chip.role-" + r));
      return {
        muscle: row("muscle").className.indexOf(" on") >= 0 ? row("muscle").querySelector(".st-who").textContent : null,
        arcaneOff: row("arcane").className.indexOf(" off") >= 0
      };
    });
    R.eq("a role hook names who at the table fits it", hooks.muscle, "Brick Halloran");
    R.check("and a role nobody has is dimmed", hooks.arcaneOff, "");

    // wiring: clocks and NPCs land once, Cred moves
    const wire = await page.evaluate(() => {
      const G = window.TTGM;
      const c1 = G.storyStartClocks("s6"), c2 = G.storyStartClocks("s6");
      const clocks = JSON.parse(localStorage.getItem("ttb.gm.play")).clocks.map(c => c.id);
      const n1 = G.storyAddNpcs("s4"), n2 = G.storyAddNpcs("s4");
      const npcs = JSON.parse(localStorage.getItem("ttb.gm.npcs")).filter(n => /^st-/.test(n.id)).map(n => n.name);
      const before = G.repGet();
      const T = window.TT; T.render();
      const sc = [...document.querySelectorAll("details.st-scene")].find(d => /Burned/.test(d.querySelector("summary").textContent));
      const credBtn = [...sc.querySelectorAll(".st-cat-cred button")].find(b => /\+1/.test(b.textContent));
      credBtn.click();
      return { c1, c2, hasClock: clocks.indexOf("st-foreclosure") >= 0, n1, n2, npcs, before, after: G.repGet() };
    });
    R.eq("Start clocks adds the scene's clocks once", [wire.c1, wire.c2, wire.hasClock], [1, 0, true]);
    R.eq("Add NPCs adds the scene's NPCs once", [wire.n1, wire.n2], [3, 0]);
    R.check("as real NPCs in the library", wire.npcs.indexOf("Dr. Maret Vhoss") >= 0, JSON.stringify(wire.npcs));
    R.eq("a Street Cred button moves the table's Cred", wire.after, wire.before + 1);

    // the vision roll: a party member, the right threshold, and the log
    const vis = await page.evaluate(() => {
      const G = window.TTGM, names = ["Vesper Kane", "Jax Oriel", "Sable Voss", "Brick Halloran", "Lux Marrow"];
      const logBefore = G.storyState().echoes.length;
      let hit = null, needs = [];
      for (let i = 0; i < 200 && !hit; i++) { const v = G.rollVision(); needs.push(v.need); if (v.hit) hit = v; }
      const sel = document.querySelector(".st-vision select");
      sel.value = "Sable Voss"; sel.dispatchEvent(new Event("change"));
      const need2 = G.rollVision().need;
      return { need: needs[0], need2, who: hit && hit.who, named: hit && names.indexOf(hit.who) >= 0,
               logged: G.storyState().echoes.length > logBefore, chrome: G.storyState().eyeChrome };
    });
    R.eq("a vision needs 17 or better", vis.need, 17);
    R.check("and goes to someone at the table", vis.named, JSON.stringify(vis));
    R.check("and is logged for the Sending", vis.logged, "");
    R.eq("the Eye-chrome makes it 16", [vis.chrome, vis.need2], ["Sable Voss", 16]);

    // tracking persists through a reload and through the vault
    await page.evaluate(() => {
      const T = window.TT; T.render();
      const sc = [...document.querySelectorAll("details.st-scene")].find(d => /warm bleed/.test(d.querySelector("summary").textContent));
      [...sc.querySelectorAll(".st-ctl button")].find(b => /Mark played/.test(b.textContent)).click();
      const sc2 = [...document.querySelectorAll("details.st-scene")].find(d => /warm bleed/.test(d.querySelector("summary").textContent));
      [...sc2.querySelectorAll(".st-ctl .seg button")].find(b => b.textContent === "Wrong").click();
      const sc3 = [...document.querySelectorAll("details.st-scene")].find(d => /warm bleed/.test(d.querySelector("summary").textContent));
      const note = sc3.querySelector(".st-note");
      note.value = "They stopped the drill."; note.dispatchEvent(new Event("input"));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT);
    await page.waitForTimeout(250);
    const kept = await page.evaluate(() => {
      const st = window.TTGM.storyState();
      let captured = null;
      const orig = window.TT.saveAs;
      window.TT.saveAs = (n, t) => { captured = t; };
      const T = window.TT; T.setMode("table"); T.gmSec(0); T.render();
      [...document.querySelectorAll("button")].find(b => /export gm vault/i.test(b.textContent)).click();
      window.TT.saveAs = orig;
      const blob = JSON.parse(captured);
      return { done: !!st.done.s4, branch: st.branch.s4, note: st.notes.s4,
               exported: !!(blob.play.story && blob.play.story.done.s4), blob: captured };
    });
    R.eq("played, branch and note survive a reload", [kept.done, kept.branch, kept.note],
      [true, "wrong", "They stopped the drill."]);
    R.check("and go out in the vault export", kept.exported, "");

    const restored = await page.evaluate(blob => {
      const G = window.TTGM;
      const b = JSON.parse(blob);
      b.play.story.salvage = 9; b.play.story.echoes.push({ nope: 1 }, "junk");
      G.importVault(JSON.stringify(b));
      const st = G.storyState();
      return { salvage: st.salvage, junk: st.echoes.every(e => typeof e.text === "string") };
    }, kept.blob);
    R.eq("a vault import brings the story back", restored.salvage, 9);
    R.check("and drops malformed vision log entries", restored.junk, "");

    // Spanish: the tab's labels translate; the story does not
    const es = await page.evaluate(() => {
      const T = window.TT; T.setLang("es"); T.setMode("table"); T.gmSec(5); T.render();
      const out = {
        rail: [...document.querySelectorAll(".rail .step")].map(x => x.textContent).join("|"),
        dial: (document.querySelector(".st-dial .gm-label") || {}).textContent,
        story: (document.querySelector(".st-title h3") || {}).textContent,
        pitch: (document.querySelector(".st-title .st-p") || {}).textContent
      };
      T.setLang("en");
      return out;
    });
    R.check("in Spanish the tab is Historia", /Historia/.test(es.rail), es.rail);
    R.eq("and its labels translate", es.dial, "Perdición");
    R.eq("but the story keeps its English", [es.story, /^The crew fail a job/.test(es.pitch)], ["The Fourth Minute", true]);

    // the walkthrough: after session 3 (step 4) is exactly where the demo table starts
    const seedCheck = await page.evaluate(() => {
      const G = window.TTGM, T = window.TT;
      G.loadDemo();
      const st = G.storyState(), ws = G.walkState(3).story;
      const pick = x => ({ current: x.current, done: x.done, branch: x.branch, doom: x.doom,
                           salvage: x.salvage, feed: x.feed, keys: x.keys,
                           echoes: x.echoes.map(e => [e.scene, e.who, e.fixed]) });
      return { demo: pick(st), walk: pick(ws), cred: G.walkState(3).cred, rep: G.repGet() };
    });
    R.eq("the walkthrough after session 3 adds up to the demo table", seedCheck.walk, seedCheck.demo);
    R.eq("including its Street Cred", seedCheck.cred, seedCheck.rep);

    const walk = await page.evaluate(async () => {
      const G = window.TTGM, T = window.TT;
      T.setMode("table"); T.gmSec(5); T.render();
      const find = () => document.querySelector("details.st-walk");
      const d = find();
      d.open = true; d.dispatchEvent(new Event("toggle"));
      await new Promise(r => setTimeout(r, 30));
      const step = () => find().querySelector(".st-walk-n").textContent;
      const first = step();
      [...find().querySelectorAll("button")].find(b => /Next/.test(b.textContent)).click();
      const second = step(), secondTitle = find().querySelector(".st-walk-title").textContent;
      for (let i = 0; i < 20; i++) [...find().querySelectorAll("button")].find(b => /Next/.test(b.textContent)).click();
      const last = step();
      const go = [...find().querySelectorAll("button")].find(b => /on the dials/.test(b.textContent));
      const label = go.textContent;
      go.click();
      const st = G.storyState();
      return { first, second, secondTitle, last, label, salvage: st.salvage,
               doomOn: document.querySelectorAll(".st-doom .gm-seg.on").length,
               cred: G.repGet(), stillOpen: find().open };
    });
    R.eq("the walkthrough starts at step 1", walk.first, "Step 1 / 13");
    R.eq("Next moves it on", walk.second, "Step 2 / 13");
    R.check("and shows that step", walk.secondTitle.length > 3, walk.secondTitle);
    R.eq("and stops at the last step", walk.last, "Step 13 / 13");
    R.eq("in the demo the button says it shows the dials", walk.label, "Show this on the dials");
    R.eq("showing the last step sets Salvage", walk.salvage, 17);
    R.eq("and fills all seven fragments of Doom", walk.doomOn, 7);
    R.eq("and sets the table's Street Cred", walk.cred, 10);
    R.check("and the walkthrough stays open to keep reading", walk.stillOpen, "");

    // outside the demo it loads the demo first; the real table comes back after
    const real = await page.evaluate(() => {
      const G = window.TTGM, T = window.TT;
      G.exitDemo();
      G.storyPatch(function (st) { st.salvage = 2; st.feed.lies = 5; });
      G.repSet(-3);
      T.setMode("table"); T.gmSec(5); T.render();
      const d = document.querySelector("details.st-walk");
      const label = [...d.querySelectorAll("button")].find(b => /show this/i.test(b.textContent)).textContent;
      G.showWalk(5);
      const during = { demo: G.inDemo(), salvage: G.storyState().salvage };
      G.exitDemo();
      return { label, during, after: { demo: G.inDemo(), salvage: G.storyState().salvage,
               lies: G.storyState().feed.lies, cred: G.repGet() } };
    });
    R.eq("outside the demo the button loads the demo first", real.label, "Load the demo and show this");
    R.eq("which puts the step on the demo table", real.during.demo, true);
    R.eq("and leaving the demo brings the real story back untouched",
      real.after, { demo: false, salvage: 2, lies: 5, cred: -3 });

    const walkEs = await page.evaluate(() => {
      const T = window.TT; T.setLang("es"); T.setMode("table"); T.gmSec(5); T.render();
      const d = document.querySelector("details.st-walk");
      const out = { n: d.querySelector(".st-walk-n").textContent,
                    title: d.querySelector(".st-walk-title").textContent,
                    effectsLeftEnglish: window.TTSY.pairs.filter(p => T.T(p.effect) === p.effect).map(p => p.id) };
      T.setLang("en");
      return out;
    });
    R.check("in Spanish the walkthrough's chrome translates", /^Paso \d+ \/ 13$/.test(walkEs.n), walkEs.n);
    R.eq("every synergy's bonus has a Spanish line", walkEs.effectsLeftEnglish, []);
    R.check("but the demo crew's story stays English", /[a-z]/.test(walkEs.title) && !/^Paso/.test(walkEs.title), walkEs.title);

    R.eq("no page errors on the Story tab", errors, []);
    await ctx.close();
  }

  return R;
};
