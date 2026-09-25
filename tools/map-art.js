#!/usr/bin/env node
/* Painted map pictures: node tools/map-art.js <folder> [more folders…]
 *
 * Takes pictures named the way a map generator exports them,
 *
 *     <name>-<anything>-<cols>x<rows>-gridded.png
 *     <name>-<anything>-<cols>x<rows>-gridless.png
 *
 * works out which of maps.js's maps each belongs to (ALIAS below, or the
 * map's own id as the name), and writes
 *
 *     maps/art/<map id>.webp        the gridless picture
 *     maps/art/<map id>-grid.webp   the gridded one
 *     mapart.js                     what the Maps screen reads: the grid
 *                                   each picture was drawn on, and which
 *                                   of the two exists
 *
 * Pictures are shrunk to 2400 px on the long side, as WebP. Chromium does
 * the decoding and encoding, through Playwright, which is already the test
 * suite's one dependency. A map can have only one of the two versions; if a
 * name has two gridded pictures, the one closest to the gridless one wins.
 * Existing entries in mapart.js are kept, so folders can be added one at a
 * time.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "maps", "art");
const INDEX = path.join(ROOT, "mapart.js");
const MAX_SIDE = 2400;
const QUALITY = 0.82;
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// generator file names -> map ids in maps.js
const ALIAS = {
  "alley": "alley", "barracks": "s3-barracks", "black-clinic": "black-clinic",
  "choir-house": "s7-choirhouse", "counting-rib": "s6-counting", "gullet-market": "gullet-market",
  "lift-car": "lift-car", "nave": "s5-nave", "noodle-loft": "s2-loft", "pilgrimage": "s8-pilgrimage",
  "pipe-gallery": "s10-pipes", "reliquary-vault": "s1-vault", "seventh-rib": "s6-seventh",
  "shaft-nine": "s4-shaft", "spine-station": "s3-spine", "weepwater-stairs": "weepwater-stairs",
  "reliquary-chapel": "s1-chapel", "fixer-den": "fixer-den", "eye-gallery": "s9-eye",
  "birth": "s11-birth", "ruins": "s12-ruins", "tallowgate-yards": "tallowgate-yards",
  "chapel-small": "chapel-small", "lanternside": "lanternside", "crown-manor": "crown-manor",
  "repo-warehouse": "repo-warehouse", "rooftops": "rooftops", "av-pad": "av-pad"
};
const NAME = /^(.+?)-(?:[a-z]+-)?(\d{1,3})x(\d{1,3})-(gridded|gridless)(?:-?\(?\d+\)?)?\.(png|webp|jpe?g)$/i;

function mapIds() {
  const win = {};
  new Function("window", fs.readFileSync(path.join(ROOT, "maps.js"), "utf8"))(win);
  return new Set(win.TTMAPS.maps.map(m => m.id));
}
function readIndex() {
  if (!fs.existsSync(INDEX)) return {};
  const win = {};
  try { new Function("window", fs.readFileSync(INDEX, "utf8"))(win); } catch (e) { return {}; }
  return win.TTMAPART || {};
}

function scan(folders, ids) {
  const found = {}, skipped = [];
  folders.forEach(dir => fs.readdirSync(dir).forEach(f => {
    const m = NAME.exec(f);
    if (!m) { skipped.push(f + " (name)"); return; }
    const base = m[1].toLowerCase();
    const id = ALIAS[base] || (ids.has(base) ? base : null);
    if (!id || !ids.has(id)) { skipped.push(f + " (no map called " + base + ")"); return; }
    const e = found[id] || (found[id] = { cols: +m[2], rows: +m[3], gridded: [], gridless: [] });
    if (e.cols !== +m[2] || e.rows !== +m[3]) skipped.push(f + " (grid differs from its twin)");
    else e[m[4].toLowerCase()].push(path.join(dir, f));
  }));
  return { found, skipped };
}

async function main() {
  const folders = process.argv.slice(2);
  if (!folders.length) { console.log("usage: node tools/map-art.js <folder> [more folders]"); process.exit(1); }
  const ids = mapIds();
  const { found, skipped } = scan(folders, ids);
  skipped.forEach(s => console.log("skipped " + s));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { chromium } = require("playwright");
  const browser = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await browser.newPage();
  const mime = f => /\.png$/i.test(f) ? "image/png" : /\.webp$/i.test(f) ? "image/webp" : "image/jpeg";
  const url = f => "data:" + mime(f) + ";base64," + fs.readFileSync(f).toString("base64");
  // Decode, shrink and encode in the page; also a difference score for picking twins.
  async function encode(file, twin) {
    return page.evaluate(async ([src, twinSrc, max, q]) => {
      const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = s; });
      const im = await load(src);
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const x = c.getContext("2d");
      x.drawImage(im, 0, 0, c.width, c.height);
      let diff = null;
      if (twinSrc) {
        const t = await load(twinSrc), c2 = document.createElement("canvas");
        c2.width = 256; c2.height = Math.round(256 * c.height / c.width);
        const y = c2.getContext("2d");
        y.drawImage(im, 0, 0, c2.width, c2.height);
        const a = y.getImageData(0, 0, c2.width, c2.height).data;
        y.drawImage(t, 0, 0, c2.width, c2.height);
        const b = y.getImageData(0, 0, c2.width, c2.height).data;
        diff = 0;
        for (let i = 0; i < a.length; i += 4) diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        diff /= a.length / 4;
      }
      const data = c.toDataURL("image/webp", q);
      return { w: c.width, h: c.height, src: [im.naturalWidth, im.naturalHeight], diff, data: data.split(",")[1] };
    }, [url(file), twin ? url(twin) : null, MAX_SIDE, QUALITY]);
  }

  const index = readIndex();
  for (const id of Object.keys(found).sort()) {
    const e = found[id], out = { cols: e.cols, rows: e.rows, grid: false, plain: false };
    const plain = e.gridless[0] || null;
    let gridded = e.gridded[0] || null;
    if (e.gridded.length > 1 && plain) {
      let best = Infinity;
      for (const g of e.gridded) {
        const r = await encode(g, plain);
        if (r.diff < best) { best = r.diff; gridded = g; }
      }
    }
    for (const [file, suffix, key] of [[plain, "", "plain"], [gridded, "-grid", "grid"]]) {
      if (!file) continue;
      const r = await encode(file);
      fs.writeFileSync(path.join(OUT_DIR, id + suffix + ".webp"), Buffer.from(r.data, "base64"));
      out[key] = true; out.w = r.w; out.h = r.h;
      console.log(id + suffix + ".webp", r.src.join("x") + " -> " + r.w + "x" + r.h,
        Math.round(Buffer.from(r.data, "base64").length / 1024) + " KB");
    }
    index[id] = out;
  }
  await browser.close();

  const body = Object.keys(index).sort().map(id => "  " + JSON.stringify(id) + ": " + JSON.stringify(index[id])).join(",\n");
  fs.writeFileSync(INDEX,
    "/* Painted pictures for maps.js's maps, written by tools/map-art.js.\n" +
    " *\n" +
    " * id: { cols, rows }  the grid the picture was drawn on, in squares\n" +
    " *     grid            maps/art/<id>-grid.webp exists (grid painted in)\n" +
    " *     plain           maps/art/<id>.webp exists (no grid)\n" +
    " *     w, h            the pictures' size in pixels\n" +
    " */\n" +
    "window.TTMAPART = {\n" + body + "\n};\n");
  console.log(Object.keys(index).length + " maps with pictures in mapart.js");
}

main().catch(e => { console.error(e); process.exit(1); });
