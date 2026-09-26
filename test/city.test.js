/* The table tools added around the fight and the city: the encounter's drag
 * order, shared NPC initiative, difficulty and morale; later, the City and
 * Toolkit screens. Driven in the browser the way a GM would use them. */
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

    // difficulty: the demo fight is 2,300 XP against five level-5 characters.
    // Its NPCs are built for level 5 (the demo party's): a CR 3 lieutenant,
    // two CR 2 security guards and a CR 3 drone.
    const diff = await page.evaluate(() => {
      const G = window.TTGM, T = window.TT;
      T.setMode("table"); T.gmSec(1); T.render();
      const d = G.encounterDifficulty(JSON.parse(localStorage.getItem("ttb.gm.play")).enc);
      return { d, shown: (document.querySelector(".gm-diff-band") || {}).textContent,
               xp: (document.querySelector(".gm-diff-xp") || {}).textContent,
               crs: [G.crXp("1/8"), G.crXp("4"), G.crXp("CR 2"), G.crXp("?")] };
    });
    R.eq("CR converts to XP by the SRD table", diff.crs, [25, 1100, 450, null]);
    R.eq("the demo fight's XP adds up its foes", diff.d.xp, 700 + 450 + 450 + 700);
    R.eq("against the party's budget", diff.d.budget, [2500, 3750, 5500]);
    R.eq("which makes it Low", [diff.d.band, diff.shown, diff.xp], ["Low", "Low", "2,300"]);
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

  /* ============================ the city's data ============================ */
  {
    const CITY = load("city.js").TTCITY;
    const CATH = load("campaigns.js").TTBC.campaigns.find(c => c.id === "cathedra");
    const GM = load("gm.js").TTBGM;
    const tables = [["weather", CITY.weather]];
    Object.keys(CITY.street).forEach(b => ["day", "night"].forEach(t => tables.push(["street " + b + " " + t, CITY.street[b][t]])));
    Object.keys(CITY.bounties).forEach(b => tables.push(["bounties " + b, CITY.bounties[b]]));
    R.eq("every city table has one row per face of its die",
      tables.filter(t => t[1].rows.length !== t[1].die).map(t => t[0] + " " + t[1].rows.length + "/" + t[1].die), []);
    R.eq("four Houses", CATH.houses.map(h => h.id), ["reliquary", "thorn", "lathe", "vigil"]);
    R.eq("eleven districts, from the Marrowworks to the Crown",
      [CATH.districts.length, CATH.districts[0].id, CATH.districts[10].id], [11, "marrowworks", "crown"]);
    R.check("each district higher than the one below it by more than a Long Fall",
      CATH.districts.every((d, i) => !i || d.height - CATH.districts[i - 1].height > 60),
      JSON.stringify(CATH.districts.map(d => d.height)));
    R.eq("every district belongs to a real House and a real street table",
      CATH.districts.filter(d => (d.house && !CATH.houses.some(h => h.id === d.house)) || !CITY.street[d.band]).map(d => d.id), []);
    const tmpl = load("npcs.js").TTNPC.archetypes.map(t => t.name), badNpc = [];
    Object.keys(CITY.street).forEach(b => ["day", "night"].forEach(t => CITY.street[b][t].rows.forEach(r => {
      if (r.npc && tmpl.indexOf(r.npc.t) < 0) badNpc.push(r.npc.t);
    })));
    R.eq("every street encounter's NPCs are a real template", badNpc, []);
    R.check("holy days fall on real dates",
      CITY.holyDays.every(h => h.month >= 1 && h.month <= 12 && h.day >= 1 && h.day <= CITY.calendar.days && h.name && h.effect), "");
    R.check("the standing ladder runs -3 to +3", CITY.standing.map(x => x.n).join() === "-3,-2,-1,0,1,2,3", "");
    const tk = [];
    Object.keys(CITY.loot.band).forEach(k => tk.push(["loot " + k, CITY.loot.band[k]]));
    Object.keys(CITY.loot.house).forEach(k => tk.push(["loot " + k, CITY.loot.house[k]]));
    Object.keys(CITY.malfunctions).forEach(k => tk.push(["malfunction tier " + k, CITY.malfunctions[k]]));
    Object.keys(CITY.heist).forEach(k => tk.push(["heist " + k, CITY.heist[k]]));
    Object.keys(CITY.chase).forEach(k => tk.push(["chase " + k, CITY.chase[k]]));
    Object.keys(CITY.net).forEach(k => tk.push(["net " + k, CITY.net[k]]));
    tk.push(["landing", CITY.landing]);
    R.eq("every Toolkit table has one row per face of its die",
      tk.filter(t => t[1].rows.length !== t[1].die).map(t => t[0] + " " + t[1].rows.length + "/" + t[1].die), []);
    R.eq("loot for every House, and names for every House", [Object.keys(CITY.loot.house), CATH.houses.every(h => CITY.names[h.id])],
      [CATH.houses.map(h => h.id), true]);
    const book = load("data.js").TTB;
    R.eq("the chrome that softens a Long Fall is real cyberware",
      CITY.fallChrome.filter(f => !book.cyberware.some(c => c.name === f.name)).map(f => f.name), []);
    R.check("every bounty has a job, a payer, pay, a catch and a clock size",
      Object.keys(CITY.bounties).every(b => CITY.bounties[b].rows.every(j => j.job && j.who && j.pay && j.catch && j.seg >= 2 && j.seg <= 12)), "");
    const unsaid = [];
    Object.keys(CITY.bounties).forEach(b => CITY.bounties[b].rows.forEach(j => {
      if (/\d/.test(j.pay) && !/^\d[\d,]* grams each\b/.test(j.pay)) unsaid.push(j.pay);
    }));
    R.eq("every job that pays grams says it pays each player", unsaid, []);
  }

  /* ============================ the City screen ============================ */
  {
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(250);
    const top = await page.evaluate(() => {
      window.TTGM.loadDemo();
      const T = window.TT; T.setMode("table"); T.gmSec(7); T.render();
      return { rail: [...document.querySelectorAll(".rail .step")].map(x => x.textContent.replace(/^[\s·\d]+/, "").trim()),
               h2: document.querySelector("#stage h2").textContent,
               date: document.querySelector(".gm-cal-date").textContent,
               next: [...document.querySelectorAll(".gm-holy")].map(x => x.textContent),
               houses: [...document.querySelectorAll(".gm-house h4")].map(x => x.textContent),
               log: [...document.querySelectorAll(".gm-cred-log li")].map(x => x.textContent),
               chart: !!document.querySelector(".gm-cred-chart path") };
    });
    R.check("the GM rail has City", top.rail.indexOf("City") >= 0 && top.h2 === "City", JSON.stringify(top.rail));
    R.eq("the demo is on day 64: the 4th of Marrowtide", top.date, "4 Marrowtide, year 900");
    R.check("and the next holy day is Tapping Day, in 3 days", /In 3 days/.test(top.next[0]) && /Tapping Day/.test(top.next[0]), JSON.stringify(top.next));
    R.eq("the four Houses are listed", top.houses, ["House Reliquary", "House Thorn", "House Lathe", "House Vigil"]);
    R.check("the Street Cred history shows the demo's three moves, newest first, with a chart",
      top.log.length === 3 && /All three petitioners/.test(top.log[0]) && top.chart, JSON.stringify(top.log));

    // standing moves and sticks, renames stick, and both go out in the vault
    await page.evaluate(() => {
      const card = [...document.querySelectorAll(".gm-house")].find(c => /Thorn/.test(c.querySelector("h4").textContent));
      [...card.querySelectorAll("button")].find(b => b.textContent === "+").click();
      const orig = window.prompt; window.prompt = () => "The Collectors";
      const card2 = [...document.querySelectorAll(".gm-house")].find(c => /Thorn/.test(c.querySelector("h4").textContent));
      [...card2.querySelectorAll("button")].find(b => b.textContent === "Rename").click();
      window.prompt = orig;
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT);
    await page.waitForTimeout(250);
    const stand = await page.evaluate(() => {
      const T = window.TT; T.setMode("table"); T.gmSec(7); T.render();
      const card = [...document.querySelectorAll(".gm-house")][1];
      let captured = null; const orig = T.saveAs; T.saveAs = (n, t) => { captured = t; };
      T.gmSec(0); T.render();
      [...document.querySelectorAll("button")].find(b => /export gm vault/i.test(b.textContent)).click();
      T.saveAs = orig;
      const v = JSON.parse(captured);
      return { name: card.querySelector("h4").textContent, band: card.querySelector(".gm-house-band b").textContent,
               vault: v.play.city.houses.thorn, vname: v.play.city.names.thorn };
    });
    R.eq("+ moves House Thorn from Hostile to Wary, and a rename sticks through a reload",
      [stand.name, stand.band], ["The Collectors", "Wary"]);
    R.eq("both go out in the vault export", [stand.vault, stand.vname], [-1, "The Collectors"]);

    // every Street Cred move is logged with its reason
    const cred = await page.evaluate(() => {
      const T = window.TT, G = window.TTGM;
      T.setMode("table"); T.gmSec(0); T.render();
      const up = [...document.querySelectorAll(".gm-rep button")].find(b => b.textContent === "+1");
      up.click(); up.click();
      T.gmSec(5); T.render();
      [...document.querySelectorAll("#stage button")].find(b => /Expand everything/.test(b.textContent)).click();
      const sc = [...document.querySelectorAll("details.st-scene")].find(d => /Burned/.test(d.querySelector("summary").textContent));
      const btn = sc ? [...sc.querySelectorAll(".st-cat-cred button")].find(b => /Street Cred/.test(b.textContent)) : null;
      if (btn) btn.click();
      const log = JSON.parse(localStorage.getItem("ttb.gm.play")).repLog;
      [...document.querySelectorAll("#stage button")].find(b => /Collapse everything/.test(b.textContent)).click();
      return { log: log.slice(-2), n: log.length, clicked: !!btn };
    });
    R.eq("two +1 taps on the Party screen fold into one logged move", [cred.log[0].why, cred.log[0].to - cred.log[0].from], ["Moved by hand", 2]);
    R.check("a story scene's Street Cred button logs the scene and the reason",
      cred.clicked && /^Burned/.test(cred.log[1].why), JSON.stringify(cred.log));

    // a new day ticks daily clocks and clears yesterday's weather
    const day = await page.evaluate(() => {
      const T = window.TT;
      T.setMode("table"); T.gmSec(4); T.render();
      const box = document.querySelector(".gm-clock .gm-clock-daily input");
      box.checked = true; box.dispatchEvent(new Event("change"));
      const before = JSON.parse(localStorage.getItem("ttb.gm.play")).clocks[0].filled;
      T.gmSec(2); T.render();
      const wxBefore = !!document.querySelector(".gm-picker .gm-weather-line");
      T.gmSec(7); T.render();
      [...document.querySelectorAll("#stage button")].find(b => /Advance a day/.test(b.textContent)).click();
      const p = JSON.parse(localStorage.getItem("ttb.gm.play"));
      T.gmSec(2); T.render();
      const wxAfter = !!document.querySelector(".gm-picker .gm-weather-line");
      return { before, after: p.clocks[0].filled, day: p.city.day, wxBefore, wxAfter };
    });
    R.eq("Advance a day moves the calendar and fills a daily clock", [day.day, day.after - day.before], [65, 1]);
    R.eq("the weather shows on the Ruling Desk only on the day it was rolled", [day.wxBefore, day.wxAfter], [true, false]);
    const wx = await page.evaluate(() => {
      const T = window.TT; T.setMode("table"); T.gmSec(7); T.render();
      const orig = Math.random; Math.random = () => 0.2;          // row 3 of 12: ichor rain
      [...document.querySelectorAll("#stage button")].find(b => /Roll today's weather/.test(b.textContent)).click();
      Math.random = orig;
      T.gmSec(2); T.render();
      return (document.querySelector(".gm-picker .gm-weather-line") || {}).textContent || "";
    });
    R.check("rolled weather and its DC effects appear next to the DC picker", /Ichor rain/.test(wx) && /\+2 DC/.test(wx), wx);

    // the bounty board
    const board = await page.evaluate(() => {
      const T = window.TT; T.setMode("table"); T.gmSec(7); T.render();
      const clocksBefore = JSON.parse(localStorage.getItem("ttb.gm.play")).clocks.length;
      [...document.querySelectorAll("#stage button")].find(b => /Post three jobs/.test(b.textContent)).click();
      const jobs = [...document.querySelectorAll(".gm-job h5")].map(x => x.textContent);
      [...document.querySelectorAll(".gm-job button")][0].click();
      const p = JSON.parse(localStorage.getItem("ttb.gm.play"));
      return { jobs, clocks: p.clocks.length - clocksBefore, name: p.clocks[p.clocks.length - 1].name,
               taken: p.city.board[0].taken, logged: p.city.jobs.length,
               takenCard: !!document.querySelector(".gm-job.taken") };
    });
    R.check("Post three jobs puts three different jobs on the board", board.jobs.length === 3 && new Set(board.jobs).size === 3, JSON.stringify(board.jobs));
    R.eq("Take it starts a clock named for the job", [board.clocks, board.name], [1, board.jobs[0]]);
    R.check("and marks the job taken", board.taken && board.logged === 1 && board.takenCard, JSON.stringify(board));

    // street encounters, and the NPCs they name
    const street = await page.evaluate(() => {
      const T = window.TT; T.setMode("table"); T.gmSec(7); T.render();
      const sel = document.querySelector(".gm-street select");
      sel.value = "gullet"; sel.dispatchEvent(new Event("change"));
      const orig = Math.random; Math.random = () => 0;             // night, row 1: the stair tax
      [...document.querySelectorAll("#stage button")].find(b => b.textContent === "Roll the street").click();
      Math.random = orig;
      const text = (document.querySelector(".gm-street-result p") || {}).textContent || "";
      const before = JSON.parse(localStorage.getItem("ttb.gm.play")).enc.combatants.length;
      const add = [...document.querySelectorAll(".gm-street-result button")][0];
      const label = add ? add.textContent : "";
      if (add) add.click();
      const after = JSON.parse(localStorage.getItem("ttb.gm.play")).enc.combatants.length;
      return { text, label, added: after - before };
    });
    R.check("rolling the Gullet at night uses the below-the-Nave night table", /taxing the only lit stair/.test(street.text), street.text);
    R.eq("and its NPCs go into the encounter in one tap", [street.label, street.added], ["Add 4 × Gutter Ganger to the encounter", 4]);

    // the Humanity dashboard on the Party screen, and the districts on the Campaign screen
    const more = await page.evaluate(() => {
      const T = window.TT; T.setMode("table"); T.gmSec(0); T.render();
      const hum = [...document.querySelectorAll(".gm-hum-line")].map(l => [l.querySelector(".n").textContent, Number(l.querySelector(".pct").textContent.replace("%", ""))]);
      T.gmSec(6); T.render();
      const chip = [...document.querySelectorAll("#stage .toolbar .chip")].find(b => b.textContent === "City");
      if (chip) chip.click();
      const districts = [...document.querySelectorAll("#stage .entry h4")].map(x => x.textContent);
      return { hum, districts };
    });
    R.check("the Humanity dashboard lists everyone, worst first",
      more.hum.length === 5 && more.hum[0][0] === "Brick Halloran" && more.hum.every((h, i) => !i || h[1] >= more.hum[i - 1][1]), JSON.stringify(more.hum));
    R.check("the Campaign screen lists Cathedra's Houses and districts",
      more.districts.indexOf("House Vigil") >= 0 && more.districts.indexOf("The Crown") >= 0 && more.districts.indexOf("Weepwater") >= 0,
      JSON.stringify(more.districts));

    const es = await page.evaluate(() => {
      const T = window.TT; T.setLang("es"); T.setMode("table"); T.gmSec(7); T.render();
      const out = { rail: [...document.querySelectorAll(".rail .step")].map(x => x.textContent).join("|"),
                    label: document.querySelector(".gm-cal .gm-label").textContent,
                    date: document.querySelector(".gm-cal-date").textContent };
      T.setLang("en");
      return out;
    });
    R.check("in Spanish the City screen's labels translate", /Ciudad/.test(es.rail) && es.label === "Hoy", JSON.stringify(es));
    R.check("but the city's own words stay English", /Marrowtide/.test(es.date), es.date);

    R.eq("no page errors on the City screen", errors, []);
    await ctx.close();
  }

  /* ============================ the Toolkit screen ============================ */
  {
    const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
    await page.waitForTimeout(250);
    const top = await page.evaluate(() => {
      window.TTGM.loadDemo();
      const T = window.TT; T.setMode("table"); T.gmSec(8); T.render();
      return { h2: document.querySelector("#stage h2").textContent,
               tools: [...document.querySelectorAll(".gm-tool summary")].map(x => x.textContent) };
    });
    R.eq("the Toolkit has its seven tools", [top.h2, top.tools],
      ["Toolkit", ["Loot", "Names", "The Long Fall", "Chrome malfunctions", "Heist planner", "Netrun map", "Chase"]]);

    const calc = await page.evaluate(() => {
      const G = window.TTGM, out = {};
      out.edge = G.longFall("nave", 0, true);
      out.short = G.longFall("nave", 40, false);
      out.huge = G.longFall("crown", 5000, false);
      const loot = [];
      for (let i = 0; i < 40; i++) loot.push(G.rollLoot("middle", "vigil"));
      out.loot = { min: Math.min(...loot.map(l => l.items.length)), max: Math.max(...loot.map(l => l.items.length)),
                   sums: loot.every(l => l.total === l.items.reduce((a, x) => a + x.grams, 0)) };
      out.names = G.rollNames("reliquary", 5);
      const mals = [];
      for (let i = 0; i < 20; i++) mals.push(G.rollMalfunctionFor("demo-brick"));
      out.mals = mals.map(m => [m.implant, m.tier]);
      out.noChrome = G.rollMalfunctionFor("demo-vesper");
      return out;
    });
    R.eq("off the edge of the Nave drops 180 ft into Tallowgate",
      [calc.edge.distance, calc.edge.dice, calc.edge.dropped, calc.edge.land.id], [180, 18, true, "tallowgate"]);
    R.check("with damage from 18d6 and a landing rolled", calc.edge.damage >= 18 && calc.edge.damage <= 108 && !!calc.edge.landing, JSON.stringify(calc.edge.damage));
    R.eq("40 ft is a fall, not a Long Fall: they stay put", [calc.short.dropped, calc.short.land.id, calc.short.dice], [false, "nave", 4]);
    R.check("damage caps at 20d6, and 5,000 ft from the Crown reaches the Marrowworks", calc.huge.dice === 20 && calc.huge.damage <= 120 && calc.huge.land.id === "marrowworks",
      JSON.stringify([calc.huge.dice, calc.huge.damage, calc.huge.land.id]));
    R.eq("the party's fall-stopping chrome is listed", calc.edge.chrome.map(c => c.name).sort(), ["Cyberclaws", "Hydraulic Jacks"]);
    R.check("loot finds one to three things and adds up their worth", calc.loot.min >= 1 && calc.loot.max <= 3 && calc.loot.sums, JSON.stringify(calc.loot));
    R.check("five different names", calc.names.length === 5 && new Set(calc.names).size === 5, JSON.stringify(calc.names));
    const brick = { "Dermal Barrier": "2", "Muscle Reinforcement": "3", "Hydraulic Jacks": "2", "Cyberclaws": "2" };
    R.check("a malfunction picks an implant the character actually has, at its tier",
      calc.mals.every(m => brick[m[0]] === m[1]), JSON.stringify(calc.mals));
    R.eq("and a character with no chrome has nothing to malfunction", calc.noChrome, null);

    // the heist plan, the net and the chase remember where you left them
    await page.evaluate(() => {
      const T = window.TT, G = window.TTGM;
      T.setMode("table"); T.gmSec(8); T.render();
      document.querySelectorAll(".gm-tool").forEach(d => { d.open = true; d.dispatchEvent(new Event("toggle")); });
      const find = t => [...document.querySelectorAll("#stage button")].find(b => b.textContent === t);
      const tgt = document.querySelector(".gm-tool-heist input");
      tgt.value = "The Reliquary vault"; tgt.dispatchEvent(new Event("input"));
      find("Loud").click();
      find("+ Step").click();
      const stp = document.querySelector(".gm-tk-steps input");
      stp.value = "Brick opens the door"; stp.dispatchEvent(new Event("input"));
      find("What went wrong").click();
      G.generateNet(2);
      T.render();
      document.querySelector(".gm-net-node").click();
      for (let i = 0; i < 7; i++) find("Pursuers gain").click();
    });
    await page.reload();
    await page.waitForFunction(() => !!window.TT);
    await page.waitForTimeout(250);
    const kept = await page.evaluate(() => {
      const T = window.TT; T.setMode("table"); T.gmSec(8); T.render();
      document.querySelectorAll(".gm-tool").forEach(d => { d.open = true; d.dispatchEvent(new Event("toggle")); });
      const p = JSON.parse(localStorage.getItem("ttb.gm.play"));
      return { heist: p.heist, first: p.netrun.floors[0][0].state, floors: p.netrun.floors.length,
               chase: p.chase.gap, status: (document.querySelector(".gm-chase-status") || {}).textContent,
               log: (document.querySelectorAll(".gm-tool-heist .gm-tk-log li") || []).length };
    });
    R.eq("the heist plan survives a reload", [kept.heist.target, kept.heist.approach, kept.heist.steps, kept.heist.log.length],
      ["The Reliquary vault", "loud", ["Brick opens the door"], 1]);
    R.check("and What went wrong rolls from the Loud table", /Watch|vault|Hunter|hostage|getaway|down|heavier|films|alarm|Wheel/.test(kept.heist.log[0].text), kept.heist.log[0].text);
    R.eq("a generated net keeps its floors and a tapped node stays cleared", [kept.floors, kept.first], [3, "cleared"]);
    R.eq("the chase gap stops at 0: caught", [kept.chase, kept.status], [0, "Caught."]);

    const es = await page.evaluate(() => {
      const T = window.TT; T.setLang("es"); T.setMode("table"); T.gmSec(8); T.render();
      const out = { h2: document.querySelector("#stage h2").textContent,
                    tools: [...document.querySelectorAll(".gm-tool summary")].map(x => x.textContent) };
      T.setLang("en");
      return out;
    });
    R.eq("in Spanish the Toolkit translates", [es.h2, es.tools[0], es.tools[6]], ["Caja de herramientas", "Botín", "Persecución"]);

    R.eq("no page errors on the Toolkit", errors, []);
    await ctx.close();
  }

  return R;
};
