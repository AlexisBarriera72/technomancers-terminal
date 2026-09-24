/* The maps: maps.js checked as data, mapdraw.js checked as a drawing, and
 * the files in maps/ checked against both. */
"use strict";
const fs = require("fs");
const path = require("path");
const { Results } = require("./lib");
const tool = require("../tools/render-maps");

const ROOT = path.join(__dirname, "..");

function dataChecks(R) {
  const win = tool.load(), D = win.TTMAPDRAW, M = win.TTMAPS, maps = M.maps;
  const groups = M.groups.map(g => g.id);
  const sceneIds = [];
  win.TTST.acts.forEach(a => a.scenes.forEach(s => sceneIds.push(s.id)));

  const ids = maps.map(m => m.id);
  R.eq("map ids are unique", ids.filter((x, i) => ids.indexOf(x) !== i), []);
  R.check("there are maps", maps.length >= 29, String(maps.length));
  R.eq("every map is in a known group", maps.filter(m => groups.indexOf(m.group) < 0).map(m => m.id), []);

  const out = [], keys = [], types = [], scenes = [], empty = [];
  maps.forEach(m => {
    const inside = (x, y, what) => {
      if (!(x >= 0 && y >= 0 && x <= m.w && y <= m.h)) out.push(m.id + " " + what + " (" + x + "," + y + ")");
    };
    if (!(m.areas || []).length) empty.push(m.id);
    const seenKey = {}, seenId = {};
    (m.areas || []).forEach(a => {
      D.areaPoints(a).forEach(p => inside(p[0], p[1], "area " + a.id));
      if (a.key && seenKey[a.key]) keys.push(m.id + " key " + a.key);
      if (seenId[a.id]) keys.push(m.id + " area id " + a.id);
      seenKey[a.key] = seenId[a.id] = 1;
    });
    (m.doors || []).forEach(d => {
      const len = d[4] || 1;
      inside(d[0], d[1], "door");
      inside(d[0] + (d[2] === "h" ? len : 0), d[1] + (d[2] === "h" ? 0 : len), "door end");
    });
    (m.f || []).forEach(f => {
      if (D.TYPES.indexOf(f[0]) < 0) types.push(m.id + " " + f[0]);
      if (/^(pipe|cable|rail)$/.test(f[0])) { inside(f[1], f[2], f[0]); inside(f[3], f[4], f[0] + " end"); }
      else { inside(f[1], f[2], f[0]); inside(f[1] + (f[3] || 1), f[2] + (f[4] || 1), f[0] + " far corner"); }
    });
    (m.marks || []).forEach(k => inside(k[0], k[1], "mark " + k[2]));
    (m.labels || []).forEach(l => inside(l[1], l[2], "label " + l[0]));
    (m.scenes || []).forEach(s => { if (sceneIds.indexOf(s) < 0) scenes.push(m.id + " " + s); });
  });
  R.eq("every map has areas", empty, []);
  R.eq("areas, doors, features, marks and labels sit inside their map", out, []);
  R.eq("area keys and ids are unique within a map", keys, []);
  R.eq("every feature type is one the renderer draws", types, []);
  R.eq("every scene a map names is a real story scene", scenes, []);
  R.eq("every story scene has at least one map",
    sceneIds.filter(s => !maps.some(m => (m.scenes || []).indexOf(s) >= 0)), []);

  // Drawing: every map in every mode, and nothing broken in the numbers.
  const bad = [];
  maps.forEach(m => {
    [{ theme: "noir", title: true }, { theme: "print", title: true },
     { theme: "noir", player: true, fog: { revealed: [] } }].forEach(o => {
      const svg = D.render(m, o);
      if (/NaN|undefined|Infinity/.test(svg)) bad.push(m.id + " " + (o.player ? "player" : o.theme));
      if (!/^<svg [^>]*viewBox="0 0 \d+ \d+"/.test(svg) || !/<\/svg>$/.test(svg)) bad.push(m.id + " not an svg");
    });
  });
  R.eq("every map draws in noir, print and player with no NaN or undefined", bad, []);

  /* The players' view shows nothing only the GM should see: taking every
     GM-only thing out of a map leaves the player drawing exactly the same. */
  const leaks = [];
  maps.forEach(m => {
    const clean = JSON.parse(JSON.stringify(m));
    clean.doors = (clean.doors || []).filter(d => d[3] !== "secret");
    clean.f = (clean.f || []).filter(f => !(f[5] && typeof f[5] === "object" && f[5].gm));
    clean.labels = (clean.labels || []).filter(l => l[3] !== "gm");
    clean.marks = (clean.marks || []).filter(k => k[3] === "exit");
    (clean.areas || []).forEach(a => { if (!a.pub) a.name = ""; delete a.key; });
    [null, { revealed: [] }, { revealed: (m.areas || []).map(a => a.id) }].forEach(fog => {
      const o = { theme: "noir", player: true, fog: fog };
      if (D.render(m, o) !== D.render(clean, o)) leaks.push(m.id + (fog ? " fogged" : ""));
    });
    if (/class="key"/.test(D.render(m, { player: true }))) leaks.push(m.id + " key letters");
  });
  R.eq("the player view hides key letters, secret doors, GM features, GM labels and private names", leaks, []);
  R.check("the leak check has something to catch",
    maps.some(m => (m.doors || []).some(d => d[3] === "secret")) &&
    maps.some(m => (m.f || []).some(f => f[5] && f[5].gm)), "");

  // Fog: an unrevealed area is covered, a revealed one is not, fog:false never is.
  const fogBad = [];
  maps.forEach(m => {
    (m.areas || []).forEach(a => {
      const tag = 'data-fog="' + a.id + '"';
      const hidden = D.render(m, { player: true, fog: { revealed: [] } });
      const shown = D.render(m, { player: true, fog: { revealed: [a.id] } });
      if (a.fog === false ? hidden.indexOf(tag) >= 0 : hidden.indexOf(tag) < 0) fogBad.push(m.id + " " + a.id + " hidden");
      if (shown.indexOf(tag) >= 0) fogBad.push(m.id + " " + a.id + " revealed");
    });
  });
  R.eq("fog covers each unrevealed area and lifts when it is revealed", fogBad, []);

  // areaAt finds each area from its own label point (what a tap would hit).
  const miss = [];
  maps.forEach(m => (m.areas || []).forEach(a => {
    if (a.lx != null) return;       // a label moved off-centre on purpose
    const c = D.areaCenter(a), hit = D.areaAt(m, c[0], c[1]);
    if (!hit) miss.push(m.id + " " + a.id);
  }));
  R.eq("a tap in the middle of an area finds an area", miss, []);

  // The files in maps/ are what the tool writes today.
  const stale = [];
  maps.forEach(m => tool.VERSIONS.forEach(v => {
    const f = path.join(ROOT, "maps", v.dir, m.id + ".svg");
    if (!fs.existsSync(f) || fs.readFileSync(f, "utf8") !== D.render(m, v.opts) + "\n") stale.push(v.dir + "/" + m.id);
  }));
  const idx = path.join(ROOT, "maps", "index.html");
  if (!fs.existsSync(idx) || fs.readFileSync(idx, "utf8") !== tool.gallery(win)) stale.push("index.html");
  R.eq("maps/ is up to date (run `npm run maps`)", stale, []);
  R.check("the gallery has no scripts, so the site's CSP allows it",
    fs.existsSync(idx) && !/<script/i.test(fs.readFileSync(idx, "utf8")), "");
}

module.exports = async function () {
  const R = new Results();
  dataChecks(R);
  return R;
};
