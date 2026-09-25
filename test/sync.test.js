/* The live table: api/room.js on its own, then three "devices" (separate
 * browser contexts, so separate storage, the way a phone and a laptop are)
 * talking through tools/serve.js with rooms kept in memory. */
"use strict";
const path = require("path");
const { spawnSync } = require("child_process");
const { Readable } = require("stream");
const { Results, launchOptions, baseChar, FILE_URL, IGNORABLE } = require("./lib");

process.env.TT_SYNC_MEMORY = "1";
const room = require("../api/room");
const serve = require("../tools/serve");

function call(method, url, body) {
  return new Promise(ok => {
    const raw = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
    const req = Readable.from(raw ? [Buffer.from(raw)] : []);
    req.method = method; req.url = url;
    const res = { setHeader() {}, end(s) { ok({ status: this.statusCode, body: JSON.parse(s) }); } };
    room(req, res);
  });
}

async function apiChecks(R) {
  const c = await call("POST", "/api/room", { op: "create", campaign: "cathedra" });
  R.check("a table gets a six-letter code and a GM key", /^[A-HJ-NP-Z2-9]{6}$/.test(c.body.code) && c.body.gmKey.length > 20, JSON.stringify(c.body));
  const code = c.body.code, gmKey = c.body.gmKey;
  R.eq("a bad code is refused", (await call("GET", "/api/room?code=abc")).status, 400);
  R.eq("a code nobody made is not found", (await call("GET", "/api/room?code=ZZZZZZ")).status, 404);
  R.eq("a player writes their sheet with just the code",
    (await call("POST", "/api/room", { op: "char", code, id: "p1", char: { name: "Jax" } })).status, 200);
  // Two players whose characters share an id: the first device keeps it.
  {
    const room2 = (await call("POST", "/api/room", { op: "create" })).body.code;
    const put = (id, dev, name, drop) => call("POST", "/api/room", { op: "char", code: room2, id, dev, drop, char: { name } });
    R.eq("a device writes its sheet", (await put("same", "devaaaaaaaa1", "Ash")).status, 200);
    const taken = await put("same", "devbbbbbbbb2", "Bex");
    R.eq("another device with the same character id is told to take a new one", [taken.status, taken.body.error], [409, "id taken"]);
    R.eq("the first device can still update it", (await put("same", "devaaaaaaaa1", "Ash 2")).status, 200);
    await put("fresh", "devbbbbbbbb2", "Bex");
    await put("moved", "devaaaaaaaa1", "Ash", "same");
    await put("sneaky", "devbbbbbbbb2", "Bex", "moved");
    const ids = (await call("GET", "/api/room?code=" + room2)).body.chars.map(x => x.id).sort();
    R.eq("a device's old id goes when it moves, and nobody can drop another device's sheet", ids, ["fresh", "moved", "sneaky"]);
    // an old room where two players both wrote "example", before devices were told apart
    await call("POST", "/api/room", { op: "char", code: room2, id: "example", char: { name: "Old" } });
    await put("rook1", "devcccccccc3", "Rook", "example");
    R.eq("the shared example sheet is cleared once a player moves off it",
      (await call("GET", "/api/room?code=" + room2)).body.chars.map(x => x.id).indexOf("example"), -1);
  }
  R.eq("a sheet too big for the room is refused",
    (await call("POST", "/api/room", { op: "char", code, id: "p2", char: { notes: "x".repeat(70000) } })).status, 413);
  R.eq("a body too big for anything is refused",
    (await call("POST", "/api/room", JSON.stringify({ op: "char", code, id: "p3", char: { n: "x".repeat(120000) } }))).status, 413);
  R.eq("the map needs the GM's key",
    (await call("POST", "/api/room", { op: "map", code, gmKey: "guess", map: { live: "s1-chapel" } })).status, 403);
  await call("POST", "/api/room", { op: "map", code, gmKey, map: { live: "s1-chapel", revealed: ["nave", "<bad>"] } });
  // HP is stamped by the server, so a phone with its clock wrong can't win or lose on it
  await call("POST", "/api/room", { op: "hp", code, id: "p1", now: 5, temp: 0, at: Date.now() + 3600e3 });
  const first = (await call("GET", "/api/room?code=" + code)).body.hp.p1;
  await call("POST", "/api/room", { op: "hp", code, id: "p1", now: 20, temp: 2, at: 1 });
  const st = (await call("GET", "/api/room?code=" + code)).body;
  R.check("the last HP write to arrive wins, stamped by the server, whatever the device's clock says",
    st.hp.p1.now === 20 && st.hp.p1.at > first.at && first.at < Date.now() + 1000, JSON.stringify([first, st.hp.p1]));
  R.eq("the room holds the sheet, the HP and the map, and never the GM's key",
    [st.chars.map(x => x.char.name), st.hp.p1.now, st.map.live, st.map.revealed, st.campaign, JSON.stringify(st).indexOf(gmKey)],
    [["Jax"], 20, "s1-chapel", ["nave"], "cathedra", -1]);
  R.eq("asking again with nothing new gets just the version",
    Object.keys((await call("GET", "/api/room?code=" + code + "&since=" + st.v)).body), ["v"]);
  // the GM's own map pictures: pieces up with the key, back with just the code, never in the poll
  const piece = "data:image/jpeg;base64," + "A".repeat(1000);
  R.eq("a picture piece needs the GM's key",
    (await call("POST", "/api/room", { op: "img", code, gmKey: "guess", id: "u-abcd1", ver: "1", part: 0, data: piece })).status, 403);
  R.eq("a piece that isn't a data URL is refused",
    (await call("POST", "/api/room", { op: "img", code, gmKey, id: "u-abcd1", ver: "1", part: 0, data: "<script>" })).status, 413);
  R.eq("the GM sends a piece", (await call("POST", "/api/room", { op: "img", code, gmKey, id: "u-abcd1", ver: "1", part: 0, data: piece })).status, 200);
  R.eq("the table's screen fetches it back with just the code",
    (await call("GET", "/api/room?code=" + code + "&img=u-abcd1&ver=1&part=0")).body.data, piece);
  R.eq("a piece nobody sent is not found", (await call("GET", "/api/room?code=" + code + "&img=u-abcd1&ver=1&part=1")).status, 404);
  await call("POST", "/api/room", { op: "map", code, gmKey, map: { live: "u-abcd1", cells: "AB-_", img: { id: "u-abcd1", cols: 20, rows: 15, parts: 1, ver: "1" } } });
  const withImg = (await call("GET", "/api/room?code=" + code)).body;
  R.eq("the map says which picture and its fog, and the poll carries no picture",
    [withImg.map.img, withImg.map.cells, JSON.stringify(withImg).indexOf("AAAAAAAAAA")],
    [{ id: "u-abcd1", cols: 20, rows: 15, parts: 1, ver: "1", pxW: 0, pxH: 0 }, "AB-_", -1]);
  R.eq("ending needs the GM's key", (await call("POST", "/api/room", { op: "end", code, gmKey: "guess" })).status, 403);
  await call("POST", "/api/room", { op: "end", code, gmKey });
  R.eq("an ended table is gone", (await call("GET", "/api/room?code=" + code)).status, 404);

  // No database connected: the site says so rather than failing strangely.
  const bare = spawnSync(process.execPath, ["-e",
    "const r=require(" + JSON.stringify(path.join(__dirname, "../api/room")) + ");" +
    "const res={setHeader(){},end(s){console.log(this.statusCode+' '+s)}};" +
    "r({method:'GET',url:'/api/room'},res);r({method:'GET',url:'/api/room?code=ABCDEF'},res);"],
    { env: { PATH: process.env.PATH }, encoding: "utf8" });
  R.eq("with no database the API says it isn't set up",
    bare.stdout.trim().split("\n").sort(), ['200 {"ok":false,"store":null}', '503 {"error":"not-set-up"}'].sort());
}

async function tableChecks(R, browser) {
  const server = await serve.start(0);
  const URL0 = "http://localhost:" + server.address().port + "/";
  const errors = [];
  const contexts = [];
  async function device(name, url, viewport) {
    const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 900 } });
    contexts.push(ctx);
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push(name + ": " + e.message));
    page.on("console", m => {
      if (m.type() !== "error" || IGNORABLE.test(m.text())) return;
      // asking for a table that doesn't exist is a 404 by design; the browser logs it
      if (name === "other" && /404/.test(m.text())) return;
      errors.push(name + ": " + m.text());
    });
    await page.goto(url);
    await page.waitForTimeout(250);
    return page;
  }
  const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 12000 }).then(() => true, () => false);

  try {
    // The GM starts a table.
    const gm = await device("gm", URL0 + "#gm=cathedra");
    await gm.evaluate(() => { const T = window.TT; T.setMode("table"); T.gmSec(0); T.render(); });
    await gm.getByRole("button", { name: "Start a live table" }).click();
    await gm.waitForSelector(".gm-live-code");
    const code = (await gm.locator(".gm-live-code").innerText()).trim();
    R.check("the GM's Party screen shows the table code", /^[A-HJ-NP-Z2-9]{6}$/.test(code), code);

    // A player joins from their phone with the link.
    const phone = await device("phone", URL0, { width: 390, height: 844 });
    await phone.evaluate(c => localStorage.setItem("ttb.character.v1", JSON.stringify(window.TT.migrate(c))),
      baseChar({ id: "p-jax", name: "Jax", level: 4, bg: "hacker", credits: 1000 }));
    await phone.goto(URL0 + "?fresh#join=" + code);
    R.check("the join link puts the phone on the table", await until(phone, () => /On the GM's screen/.test((document.querySelector(".live-box") || {}).textContent || "")), "");
    R.eq("joining a Cathedra table puts the character on its prices",
      await phone.evaluate(() => JSON.parse(localStorage.getItem("ttb.character.v1")).campaign), "cathedra");
    const gmHas = (lv) => until(gm, lv => (JSON.parse(localStorage.getItem("ttb.gm.party") || "[]"))
      .some(r => r.id === "p-jax" && r.level === lv && r.source === "live"), lv);
    R.check("their sheet shows up on the GM's screen", await gmHas(4), "");

    // Two more players who built over the example character (one fixed id on
    // every device): all three must show up, none replacing another.
    for (const nm of ["Rook", "Vesper"]) {
      const p = await device("phone-" + nm, URL0, { width: 390, height: 844 });
      await p.evaluate(nm => {
        const c = window.TT.migrate({ id: "example", name: nm, level: 3, cls: "Rogue", bg: "hacker" });
        delete c.isExample;
        localStorage.setItem("ttb.character.v1", JSON.stringify(c));
      }, nm);
      await p.goto(URL0 + "?fresh#join=" + code);
      await until(p, () => /On the GM's screen/.test((document.querySelector(".live-box") || {}).textContent || ""));
    }
    const three = await until(gm, () => {
      const live = JSON.parse(localStorage.getItem("ttb.gm.party") || "[]").filter(r => r.source === "live");
      return ["Jax", "Rook", "Vesper"].every(n => live.some(r => r.name === n)) &&
        new Set(live.map(r => r.id)).size === live.length && !live.some(r => r.id === "example");
    });
    R.check("players who built over the example all show up, each with their own id", three,
      await gm.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("ttb.gm.party") || "[]").map(r => [r.id, r.name]))));

    // They level up and buy something; the GM sees it without asking.
    await phone.evaluate(() => { const r = document.querySelector("#levelRange"); r.value = "5"; r.dispatchEvent(new Event("input")); r.dispatchEvent(new Event("change")); });
    await phone.evaluate(() => {
      const c = JSON.parse(localStorage.getItem("ttb.character.v1"));
      c.gear.push({ key: "Gear List|Barbed Wire", name: "Barbed Wire", cost: "200₵" });
      localStorage.setItem("ttb.character.v1", JSON.stringify(c));
    });
    await phone.reload();
    await phone.waitForTimeout(300);
    R.check("a level-up on the phone reaches the GM", await gmHas(5), "");
    R.check("and so does new gear", await until(gm, () => (JSON.parse(localStorage.getItem("ttb.gm.party") || "[]"))
      .some(r => r.id === "p-jax" && /Barbed Wire/.test(r.payload))), "");

    // The GM hits them in an encounter; the phone's HP drops.
    await gm.evaluate(() => { const T = window.TT; T.gmSec(1); T.render(); });
    await gm.getByRole("button", { name: "+ Party" }).click();
    await gm.waitForTimeout(150);
    const jaxCb = () => JSON.parse(localStorage.getItem("ttb.gm.play")).enc.combatants.filter(c => c.ref === "p-jax")[0];
    const max = await gm.evaluate(jaxCb => new Function("return (" + jaxCb + ")()")().hpMax, jaxCb.toString());
    await gm.locator(".gm-cb", { hasText: "Jax" }).locator(".hpbtn.dmg", { hasText: "-5" }).first().click();
    R.check("damage the GM deals shows on the player's sheet",
      await until(phone, m => JSON.parse(localStorage.getItem("ttb.character.v1")).hpNow === m - 5, max), String(max));
    // The player heals on their phone; the GM's encounter follows.
    await phone.evaluate(() => { const T = window.TT; T.setMode("forge"); T.render(); });
    await phone.evaluate(() => [...document.querySelectorAll(".rail .step")].find(b => /Play/i.test(b.textContent)).click());
    await phone.getByRole("button", { name: "Heal 1" }).click();
    R.check("healing on the phone shows in the GM's encounter",
      await until(gm, m => JSON.parse(localStorage.getItem("ttb.gm.play")).enc.combatants.filter(c => c.ref === "p-jax")[0].hp === m - 4, max), "");

    // The iPad in the middle of the table joins with the map link.
    const ipad = await device("ipad", URL0 + "#mapview=" + code, { width: 1180, height: 820 });
    R.check("the table's screen joins and waits for the GM", await until(ipad, () => !!document.querySelector(".mapview-room")), "");
    await gm.evaluate(() => { const T = window.TT; T.gmSec(9); T.render(); });
    // the chapel has a painted picture; it reaches the iPad from the site itself
    await gm.getByRole("button", { name: "Show players this map" }).click();
    R.check("a painted picture reaches the iPad",
      await until(ipad, () => { const i = document.querySelector(".mapview svg image"); return i && /maps\/art\/s1-chapel/.test(i.getAttribute("href")); }), "");
    await gm.getByRole("button", { name: "Picture", exact: true }).click();
    R.check("the map the GM sends appears on the iPad",
      await until(ipad, () => { const s = document.querySelector(".mapview svg"); return s && s.getAttribute("data-map") === "s1-chapel"; }), "");
    R.eq("with no key letters on it", await ipad.locator(".mapview g.key").count(), 0);
    await gm.locator(".map-view").scrollIntoViewIfNeeded();
    const b = await gm.locator('.map-view polygon[data-area="nave"]').boundingBox();
    await gm.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    R.check("a room the GM reveals opens up on the iPad",
      await until(ipad, () => !!document.querySelector('.mapview [data-seen="nave"]')), "");
    R.check("the Maps screen tells the GM how to reach the iPad", /iPad/.test(await gm.locator(".map-other").innerText()), "");

    // The GM brings their own map picture; the iPad gets it, with square-by-square fog.
    const png = await gm.evaluate(() => {
      const c = document.createElement("canvas"); c.width = 400; c.height = 300;
      const x = c.getContext("2d"); x.fillStyle = "#c33"; x.fillRect(0, 0, 400, 300);
      x.fillStyle = "#3c3"; x.fillRect(100, 60, 200, 150);
      return c.toDataURL("image/png").split(",")[1];
    });
    await gm.locator(".map-pick input[type=file]").setInputFiles({ name: "safehouse.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    R.check("an own map picture joins the Maps screen",
      await until(gm, () => /safehouse/.test((document.querySelector(".map-info h3") || {}).textContent || "")), "");
    const um = await gm.evaluate(() => JSON.parse(localStorage.getItem("ttb.gm.usermaps"))[0]);
    R.eq("sized from the picture: 20 squares across, rows to match", [um.cols, um.rows, um.pxW, um.pxH], [20, 15, 400, 300]);
    await gm.getByRole("button", { name: "Show players this map" }).click();
    R.check("the picture reaches the iPad through the room",
      await until(ipad, () => !!document.querySelector(".mapview svg image")), "");
    R.eq("fully fogged until the GM reveals something",
      await ipad.evaluate(() => document.querySelectorAll(".mapview .fog rect").length), 15);
    await gm.getByRole("button", { name: "Reveals" }).click();
    const vb = await gm.locator(".map-view").boundingBox();
    await gm.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2);
    await gm.mouse.down();
    await gm.mouse.move(vb.x + vb.width / 2 + 60, vb.y + vb.height / 2, { steps: 6 });
    await gm.mouse.up();
    R.check("squares the GM drags across open up on the iPad",
      await until(ipad, () => document.querySelectorAll(".mapview .fog rect").length > 15), "");

    // A wrong code on the iPad says so.
    const other = await device("other", URL0 + "#mapview", { width: 1180, height: 820 });
    await other.locator(".mapview-join input").fill("ZZZZZZ");
    await other.getByRole("button", { name: "Join" }).click();
    R.check("a code that isn't a table says so", await until(other, () => /No table with that code/.test(document.body.textContent)), "");

    // Ending the table leaves the cards where they were.
    await gm.evaluate(() => { const T = window.TT; T.gmSec(0); T.render(); });
    gm.once("dialog", d => d.accept());
    await gm.getByRole("button", { name: "End the live table" }).click();
    R.check("ending the table brings back the Start button", await until(gm, () => /Start a live table/.test(document.body.textContent)), "");
    R.check("and Jax stays in the party", await gm.evaluate(() => JSON.parse(localStorage.getItem("ttb.gm.party")).some(r => r.id === "p-jax")), "");
  } finally {
    for (const c of contexts) await c.close();
    server.close();
  }
  R.eq("no page errors on any device", errors, []);

  // From a file, there's no server: the screens say so and nothing breaks.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const fileErrors = [];
  page.on("pageerror", e => fileErrors.push(e.message));
  await page.goto(FILE_URL + "#gm=cathedra");
  await page.waitForFunction(() => !!window.TT);
  await page.evaluate(() => { const T = window.TT; T.setMode("table"); T.gmSec(0); T.render(); });
  R.check("opened from a file, the GM is told live sync needs the website",
    /works on the website/.test(await page.locator(".gm-live").innerText()), "");
  R.eq("and nothing throws", fileErrors, []);
  await ctx.close();
}

module.exports = async function (browser) {
  const R = new Results();
  await apiChecks(R);
  await tableChecks(R, browser);
  return R;
};

if (require.main === module) {
  (async () => {
    const { chromium } = require("playwright");
    const b = await chromium.launch(launchOptions());
    const R = await module.exports(b);
    R.report("sync");
    await b.close();
  })();
}
