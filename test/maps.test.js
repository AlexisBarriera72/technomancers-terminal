/* The maps: maps.js checked as data, mapdraw.js checked as a drawing, and
 * the files in maps/ checked against both. */
"use strict";
const fs = require("fs");
const path = require("path");
const { Results, appPage, FILE_URL } = require("./lib");
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

  /* Fog. The GM's view tints each unrevealed area; the players' view blacks
     out the whole map and cuts a hole for each area they have seen. Either
     way: covered until revealed, and fog:false is never covered. */
  const fogBad = [];
  maps.forEach(m => {
    const gmHidden = D.render(m, { fog: { revealed: [] } });
    const plHidden = D.render(m, { player: true, fog: { revealed: [] } });
    if (!/<rect class="fog" [^>]*mask="url\(#[^)]+-seen\)"/.test(plHidden)) fogBad.push(m.id + " no player fog");
    (m.areas || []).forEach(a => {
      const tint = 'data-fog="' + a.id + '"', hole = 'data-seen="' + a.id + '"';
      const gmShown = D.render(m, { fog: { revealed: [a.id] } });
      const plShown = D.render(m, { player: true, fog: { revealed: [a.id] } });
      if (a.fog === false) {
        if (gmHidden.indexOf(tint) >= 0 || plHidden.indexOf(hole) < 0) fogBad.push(m.id + " " + a.id + " covered, but fog:false");
        return;
      }
      if (gmHidden.indexOf(tint) < 0 || plHidden.indexOf(hole) >= 0) fogBad.push(m.id + " " + a.id + " not covered");
      if (gmShown.indexOf(tint) >= 0 || plShown.indexOf(hole) < 0) fogBad.push(m.id + " " + a.id + " still covered once revealed");
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

  // Painted pictures (mapart.js): each belongs to a map, its files exist,
  // and its shape is near its grid's (squares within a fifth of square).
  const artWin = {};
  new Function("window", fs.readFileSync(path.join(ROOT, "mapart.js"), "utf8"))(artWin);
  const art = artWin.TTMAPART || {}, artBad = [];
  Object.keys(art).forEach(id => {
    const a = art[id];
    if (ids.indexOf(id) < 0) artBad.push(id + " is no map");
    if (!a.grid && !a.plain) artBad.push(id + " has no picture");
    if (a.grid && !fs.existsSync(path.join(ROOT, "maps", "art", id + "-grid.webp"))) artBad.push(id + "-grid.webp missing");
    if (a.plain && !fs.existsSync(path.join(ROOT, "maps", "art", id + ".webp"))) artBad.push(id + ".webp missing");
    const squash = (a.h * a.cols) / (a.w * a.rows);
    if (!(squash > 0.8 && squash < 1.25)) artBad.push(id + ": " + a.w + "x" + a.h + " px doesn't fit " + a.cols + "x" + a.rows + " squares");
  });
  R.check("there are painted pictures", Object.keys(art).length >= 2, String(Object.keys(art).length));
  R.eq("every painted picture belongs to a map, exists, and fits its grid", artBad, []);

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

/* The Maps screen and the player screen, driven the way a GM would. */
async function screenChecks(R, browser) {
  const { page, ctx, errors } = await appPage(browser, { url: FILE_URL + "#gm=cathedra" });
  const goMaps = () => page.evaluate(() => { const T = window.TT; T.setMode("table"); T.gmSec(9); T.render(); });
  const shown = () => page.evaluate(() => JSON.stringify(window.TTGM.mapsState().revealed));
  const tapArea = async (sel, id) => {
    const view = sel.locator(".map-view");
    await view.scrollIntoViewIfNeeded();
    const b = await sel.locator('.map-view polygon[data-area="' + id + '"]').boundingBox();
    await sel.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await sel.waitForTimeout(80);
  };
  await goMaps();

  // A map with a painted picture opens on it. The plan's checks come first.
  R.eq("a map with a painted picture opens on the picture, gridded",
    await page.evaluate(() => { const i = document.querySelector(".map-view image"); return i && i.getAttribute("href"); }),
    "maps/art/s1-chapel-grid.webp");
  await page.getByRole("button", { name: "Picture", exact: true }).click();
  R.eq("Picture off draws the plan", await page.locator(".map-view image").count(), 0);

  // With nothing chosen it opens on the first scene's map.
  R.eq("the Maps screen draws the current scene's map",
    await page.evaluate(() => document.querySelector(".map-view svg").getAttribute("data-map")), "s1-chapel");
  R.check("the GM's view has key letters", await page.locator(".map-view g.key").count() > 5, "");
  await page.selectOption(".map-pick select", "gullet-market");
  await page.waitForTimeout(80);
  R.eq("picking another map draws it",
    await page.evaluate(() => document.querySelector(".map-view svg").getAttribute("data-map")), "gullet-market");
  await page.selectOption(".map-pick select", "s1-chapel");
  await page.waitForTimeout(80);

  // The player window: blank until the GM sends a map.
  const pv = await ctx.newPage();
  pv.on("pageerror", e => errors.push("player screen: " + e.message));
  await pv.goto(FILE_URL + "#mapview");
  await pv.waitForSelector(".mapview");
  R.check("the player screen waits for the GM", await pv.locator(".mapview-wait").count() === 1, "");
  R.eq("the player screen draws none of the app", await pv.locator("#stage .stage-head").count(), 0);

  await page.getByRole("button", { name: "Show players this map" }).click();
  await pv.waitForSelector(".mapview svg", { timeout: 3000 });
  const seen = () => pv.evaluate(() =>
    [...document.querySelectorAll(".mapview [data-seen]")].map(x => x.getAttribute("data-seen")).sort().join(","));
  R.eq("Show players this map puts it on the player screen",
    await pv.evaluate(() => document.querySelector(".mapview svg").getAttribute("data-map")), "s1-chapel");
  R.eq("the player screen has no key letters", await pv.locator(".mapview g.key").count(), 0);
  R.eq("at first players see only the open ground", await seen(), "steps,terrace");

  // A tap reveals an area; the player window follows without a reload.
  await tapArea(page, "nave");
  R.eq("a tap on an area reveals it", await shown(), '{"s1-chapel":["nave"]}');
  await pv.waitForFunction(() => !!document.querySelector('.mapview [data-seen="nave"]'), null, { timeout: 3000 })
    .catch(() => {});
  R.eq("the player screen follows the reveal", await seen(), "nave,steps,terrace");
  await tapArea(page, "nave");
  R.eq("a second tap hides it again", await shown(), "{}");
  await page.locator('.map-area[data-area="office"] button').click();
  R.eq("Reveal in the key reveals the area", await shown(), '{"s1-chapel":["office"]}');
  R.check("the key marks it seen", await page.locator('.map-area.shown[data-area="office"]').count() === 1, "");
  await page.reload();
  await page.waitForFunction(() => !!window.TT);
  await goMaps();
  R.eq("reveals survive a reload", await shown(), '{"s1-chapel":["office"]}');
  await page.getByRole("button", { name: "Reveal all" }).click();
  R.check("Reveal all shows every fogged area",
    await page.evaluate(() => window.TTGM.mapsState().revealed["s1-chapel"].length === 8), await shown());
  await pv.waitForTimeout(150);
  R.eq("the player screen shows every area", (await seen()).split(",").length, 10);
  await page.getByRole("button", { name: "Blank the TV" }).click();
  await pv.waitForSelector(".mapview-wait", { timeout: 3000 }).catch(() => {});
  R.check("Blank the TV clears the player screen", await pv.locator(".mapview svg").count() === 0, "");

  // Fog off: the players see everything, and a tap reveals nothing.
  await page.getByRole("button", { name: "Hide all" }).click();
  await page.getByRole("button", { name: "Fog", exact: true }).click();
  R.eq("fog off draws no fog on the GM's view", await page.locator(".map-view .fog").count(), 0);
  await tapArea(page, "nave");
  R.eq("with fog off a tap changes nothing", await shown(), "{}");
  await page.getByRole("button", { name: "Fog", exact: true }).click();

  // Hand-off: the players' view covers this tab until the GM holds the button.
  await page.getByRole("button", { name: "Show on this screen" }).click();
  R.check("Show on this screen covers the tab", await page.locator(".mapview.handoff svg").count() === 1, "");
  await page.locator(".mapview-gm").click();
  R.check("a quick tap on the GM button doesn't close it", await page.locator(".mapview.handoff").count() === 1, "");
  const g = await page.locator(".mapview-gm").boundingBox();
  await page.mouse.move(g.x + 4, g.y + 4);
  await page.mouse.down();
  await page.waitForTimeout(1150);
  await page.mouse.up();
  R.eq("holding it for a second brings the GM screen back", await page.locator(".mapview").count(), 0);

  // The painted picture: square-by-square fog, the grid switch picks the version.
  await page.getByRole("button", { name: "Picture", exact: true }).click();
  await page.getByRole("button", { name: /^(Show players this map|Players see this map)$/ }).click();
  const pv2 = await ctx.newPage();
  pv2.on("pageerror", e => errors.push("player screen: " + e.message));
  await pv2.goto(FILE_URL + "#mapview");
  await pv2.waitForSelector(".mapview svg image", { timeout: 3000 }).catch(() => {});
  const fogRects = () => pv2.evaluate(() => document.querySelectorAll(".mapview .fog rect").length);
  R.eq("the player screen shows the picture, all fogged", [await pv2.evaluate(() => {
    const i = document.querySelector(".mapview svg image"); return i && i.getAttribute("href"); }), await fogRects()],
    ["maps/art/s1-chapel-grid.webp", 32]);
  await page.locator(".map-view").scrollIntoViewIfNeeded();
  const vb2 = await page.locator(".map-view").boundingBox();
  await page.mouse.click(vb2.x + vb2.width / 2, vb2.y + vb2.height / 2);
  await page.waitForTimeout(100);
  const cells = await page.evaluate(() => window.TTGM.mapsState().cells["s1-chapel"] || "");
  R.check("a tap on the picture reveals one square", cells.replace(/A/g, "").length === 1, cells);
  await pv2.waitForFunction(() => document.querySelectorAll(".mapview .fog rect").length > 32, null, { timeout: 3000 }).catch(() => {});
  R.check("and the player screen opens it", await fogRects() > 32, String(await fogRects()));
  R.eq("the plan's fog is separate", await shown(), "{}");
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await pv2.waitForTimeout(200);
  R.eq("grid off shows the picture without its grid", await pv2.evaluate(() =>
    document.querySelector(".mapview svg image").getAttribute("href")), "maps/art/s1-chapel.webp");
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  R.eq("the picture can be downloaded", await page.locator('.map-dl a[href="maps/art/s1-chapel.webp"]').count(), 1);
  await pv2.close();
  await page.getByRole("button", { name: "Picture", exact: true }).click();

  // From the Story screen: a scene's map button opens that map here.
  await page.evaluate(() => { const T = window.TT; T.gmSec(5); T.render(); });
  await page.getByRole("button", { name: "Expand everything" }).click();
  await page.locator('details[data-scene="s4"] .map-chip').first().click();
  R.eq("a scene's map button opens the Maps screen", await page.evaluate(() => window.TT.gmSec()), 9);
  R.eq("on that scene's map",
    await page.evaluate(() => document.querySelector(".map-view svg").getAttribute("data-map")), "s3-barracks");

  // The vault carries the maps, and a hand-edited one is cleaned on the way in.
  await page.evaluate(() => window.TTGM.importVault(JSON.stringify({
    kind: "ttb-gm-vault", party: [], npcs: [], encounters: [],
    play: { maps: { current: "s9-eye", live: "no-such-map", grid: false,
      revealed: { "s9-eye": ["gallery", "nope", "gallery"], "gone": ["x"] } } }
  })));
  const back = await page.evaluate(() => window.TTGM.mapsState());
  R.eq("importing a vault restores the maps and drops what doesn't exist",
    [back.current, back.live, back.grid, JSON.stringify(back.revealed)],
    ["s9-eye", null, false, '{"s9-eye":["gallery"]}']);
  const exported = await page.evaluate(() => JSON.parse(localStorage.getItem("ttb.gm.play")).maps.current);
  R.eq("the maps are saved with the rest of the table", exported, "s9-eye");

  R.eq("no page errors on the Maps screen or the player screen", errors, []);
  await ctx.close();
}

module.exports = async function (browser) {
  const R = new Results();
  dataChecks(R);
  await screenChecks(R, browser);
  return R;
};
