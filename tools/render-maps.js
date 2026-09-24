#!/usr/bin/env node
/* Writes every map in maps.js to files, for use outside the app.
 *
 *   maps/noir/<id>.svg     the GM's copy: key letters, secret doors, a title band
 *   maps/player/<id>.svg   for the players or a VTT: no letters, nothing secret,
 *                          no title band, so the grid is exactly 50 px a square
 *   maps/print/<id>.svg    black on white for paper, with a title band
 *   maps/index.html        a gallery of all of them, no scripts
 *
 * The drawings come from mapdraw.js, the same code the Maps screen uses, so
 * the files and the screen always agree. Run it after changing a map:
 *
 *   npm run maps
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "maps");

/* The data files are browser scripts that hang themselves on window; hand
   them a plain object instead. */
function load() {
  const win = {};
  ["campaigns.js", "story.js", "mapdraw.js", "maps.js"].forEach(f => {
    new Function("window", fs.readFileSync(path.join(ROOT, f), "utf8"))(win);
  });
  return win;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const VERSIONS = [
  { dir: "noir", opts: { theme: "noir", title: true } },
  { dir: "player", opts: { theme: "noir", player: true } },
  { dir: "print", opts: { theme: "print", title: true } }
];

function gallery(win) {
  const M = win.TTMAPS, scenes = {};
  ((win.TTST && win.TTST.acts) || []).forEach(a => (a.scenes || []).forEach(s => { scenes[s.id] = s; }));
  const card = m => {
    const sc = (m.scenes || []).map(id => scenes[id]
      ? '<span class="chip" title="' + esc(scenes[id].title) + '">S' + esc(scenes[id].session) + "</span>" : "").join("");
    const scale = m.scale || 5;
    return '<article class="card">' +
      '<a class="thumb" href="noir/' + esc(m.id) + '.svg"><img src="noir/' + esc(m.id) + '.svg" alt="' + esc(m.title) + '" loading="lazy"></a>' +
      '<div class="body"><h3>' + esc(m.title) + "</h3>" +
      '<p class="place">' + esc(m.place) + "</p>" +
      '<p class="meta">' + sc + '<span class="dim">' + m.w + " × " + m.h + " squares · " + m.w * scale + " × " + m.h * scale + " ft</span></p>" +
      "<p>" + esc(m.blurb) + "</p>" +
      '<p class="links"><a href="noir/' + esc(m.id) + '.svg">GM</a><a href="player/' + esc(m.id) + '.svg">Players</a>' +
      '<a href="print/' + esc(m.id) + '.svg">Print</a></p></div></article>';
  };
  const sections = M.groups.map(g => {
    const list = M.maps.filter(m => m.group === g.id);
    if (!list.length) return "";
    return '<section><h2>' + esc(g.name) + ' <span class="dim">' + list.length + "</span></h2>" +
      '<div class="grid">' + list.map(card).join("") + "</div></section>";
  }).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cathedra maps</title>
<meta name="description" content="Battle maps for The Fourth Minute and the streets of Cathedra, in three versions: GM, players and print.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Chakra+Petch:wght@700&display=swap">
<style>
:root{--bg:#05070c;--panel:#0b111b;--line:#1c2a3b;--text:#e8eef7;--dim:#9fb0c6;--cyan:#22d3ee;--pink:#ff3d81}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 Barlow,Arial,sans-serif}
header,section{max-width:1200px;margin:0 auto;padding:0 16px}
header{padding-top:32px;padding-bottom:8px}
h1{font:700 30px/1.1 "Chakra Petch",Barlow,sans-serif;margin:0 0 8px;letter-spacing:.5px}
h1 b{color:var(--cyan)}
h2{font:700 20px/1.2 "Chakra Petch",Barlow,sans-serif;margin:36px 0 14px;border-bottom:1px solid var(--line);padding-bottom:8px}
h3{margin:0;font-size:18px}
p{margin:0 0 8px}
.dim{color:var(--dim);font-weight:400}
.lede{color:var(--dim);max-width:70ch}
.lede a,.links a{color:var(--cyan)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.thumb{display:block;background:#02040a;aspect-ratio:4/3;overflow:hidden}
.thumb img{width:100%;height:100%;object-fit:contain;display:block}
.body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:2px;flex:1}
.place{color:var(--dim);font-size:14px}
.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px}
.chip{border:1px solid var(--pink);color:var(--pink);border-radius:999px;padding:0 8px;font-weight:700}
.links{margin-top:auto;display:flex;gap:16px;font-weight:600}
footer{max-width:1200px;margin:40px auto;padding:0 16px;color:var(--dim);font-size:14px}
</style>
</head>
<body>
<header>
<h1>Cathedra <b>maps</b></h1>
<p class="lede">Every scene of <i>The Fourth Minute</i> and the places a street fight, a heist or a chase can go.
One square is 5 ft. Each map comes three ways: <b>GM</b> with the key letters and secret doors,
<b>Players</b> with none of that and no title band (50 px a square, ready for a VTT), and <b>Print</b>, black on white.
In the app, the GM's Maps screen shows the same maps with fog of war and a player screen for the TV.</p>
</header>
${sections}
<footer>Drawn by tools/render-maps.js from maps.js. ${M.maps.length} maps.</footer>
</body>
</html>
`;
}

function build(outDir) {
  const win = load();
  const D = win.TTMAPDRAW;
  VERSIONS.forEach(v => fs.mkdirSync(path.join(outDir, v.dir), { recursive: true }));
  let files = 0;
  win.TTMAPS.maps.forEach(m => {
    VERSIONS.forEach(v => {
      fs.writeFileSync(path.join(outDir, v.dir, m.id + ".svg"), D.render(m, v.opts) + "\n");
      files++;
    });
  });
  fs.writeFileSync(path.join(outDir, "index.html"), gallery(win));
  return { maps: win.TTMAPS.maps.length, files: files + 1 };
}

module.exports = { load, build, gallery, VERSIONS };

if (require.main === module) {
  const r = build(OUT);
  console.log("wrote " + r.files + " files for " + r.maps + " maps to " + path.relative(process.cwd(), OUT) + "/");
}
