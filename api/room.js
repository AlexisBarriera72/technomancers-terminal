/* The live table: one small room per session, shared by the GM's screen, the
 * players' phones and the map on the table.
 *
 *   GET  /api/room                     is sync set up here?   {ok, store}
 *   GET  /api/room?code=K7Q2MX&since=5 the room, or just {v} if nothing changed
 *   POST /api/room {op:"create", campaign}          -> {code, gmKey}
 *   POST /api/room {op:"char", code, id, char, dev, drop?}
 *                                                   a player's sheet; dev says which device
 *                                                   wrote it, drop an id this device used before
 *   POST /api/room {op:"hp", code, id, now, temp}   current HP, the last write wins
 *   POST /api/room {op:"map", code, gmKey, map}     what the table's screen shows
 *   POST /api/room {op:"img", code, gmKey, id, part, parts, data}
 *                                                   one piece of the GM's own map image
 *   GET  /api/room?code=K7Q2MX&img=u-abc&part=0     a piece back, for the table's screen
 *   POST /api/room {op:"end", code, gmKey}          delete the room
 *
 * The code is all a player needs, so anyone at the table (or anyone they tell)
 * can write a sheet into the room; the map and ending the room need the GM's
 * key, which only the GM's browser holds. Rooms hold character sheets and the
 * map's state, nothing else, and are gone 14 days after the last write.
 *
 * A map the GM made themselves travels as a JPEG data URL cut into pieces
 * small enough for one request each. The pieces live in their own hash, not
 * the room's, so the players' two-second polls never carry an image.
 */
"use strict";
const crypto = require("crypto");
const { store } = require("./_store");

const TTL = 14 * 24 * 3600;
const MAX_BODY = 100 * 1024;
const MAX_SHEET = 60 * 1024;
const MAX_CHARS = 12;
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no 0/O, 1/I
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const ID = /^[\w.-]{1,64}$/;
const roomKey = code => "tt:room:" + code;
const imgKey = code => "tt:img:" + code;
const MAX_PIECE = 90 * 1024;          // under MAX_BODY with room for the envelope
const MAX_PIECES = 30;                // about 2.6 MB of image
const MAX_ROOM_PIECES = 240;          // every image the room holds, together
const DATA_PIECE = /^[A-Za-z0-9+/=:;,.\-]*$/;

class Bad extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  const b = req.body;
  if (b && typeof b === "object" && !Buffer.isBuffer(b)) {
    // already parsed by the platform; its size still counts
    if (JSON.stringify(b).length > MAX_BODY) throw new Bad(413, "too big");
    return b;
  }
  let raw = typeof b === "string" ? b : Buffer.isBuffer(b) ? b.toString("utf8") : null;
  if (raw === null) {
    raw = await new Promise((ok, no) => {
      let n = 0; const parts = [];
      req.on("data", c => {
        n += c.length;
        if (n > MAX_BODY) { no(new Bad(413, "too big")); req.destroy(); return; }
        parts.push(c);
      });
      req.on("end", () => ok(Buffer.concat(parts).toString("utf8")));
      req.on("error", no);
    });
  }
  if (raw.length > MAX_BODY) throw new Bad(413, "too big");
  try { return JSON.parse(raw || "{}"); } catch (e) { throw new Bad(400, "not JSON"); }
}

function newCode() {
  return Array.from(crypto.randomBytes(6), x => ALPHA[x % 32]).join("");
}
function sameKey(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function int(v, lo, hi) {
  const n = Math.round(Number(v));
  return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null;
}
function parse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

// what the table's screen is told to draw: one map, what's revealed on it, two switches
function cleanMap(m) {
  if (!m || typeof m !== "object") throw new Bad(400, "no map");
  return {
    live: typeof m.live === "string" && ID.test(m.live) ? m.live : null,
    revealed: (Array.isArray(m.revealed) ? m.revealed : [])
      .filter(x => typeof x === "string" && ID.test(x)).slice(0, 300),
    grid: m.grid !== false, fog: m.fog !== false,
    // a built-in map shown as its painted picture (mapart.js), fogged by the square
    pic: m.pic === true,
    // a GM's own map: its fog is a packed bitset, one bit a square
    cells: typeof m.cells === "string" && /^[A-Za-z0-9_-]{0,4000}$/.test(m.cells) ? m.cells : null,
    img: cleanImgMeta(m.img)
  };
}
function cleanImgMeta(x) {
  if (!x || typeof x !== "object" || typeof x.id !== "string" || !ID.test(x.id)) return null;
  return { id: x.id, cols: int(x.cols, 1, 200), rows: int(x.rows, 1, 200), parts: int(x.parts, 1, MAX_PIECES),
           ver: typeof x.ver === "string" && ID.test(x.ver) ? x.ver : "1",
           pxW: int(x.pxW, 0, 20000) || 0, pxH: int(x.pxH, 0, 20000) || 0 };
}

async function roomMeta(s, code) {
  if (!CODE.test(code || "")) throw new Bad(400, "bad code");
  const meta = parse(await s.hget(roomKey(code), "meta"));
  if (!meta) throw new Bad(404, "no such table");
  return meta;
}
async function write(s, code, fields) {
  const k = roomKey(code);
  await s.hset(k, fields);
  const v = await s.hincrby(k, "v", 1);
  await s.expire(k, TTL);
  return v;
}

async function state(s, code, since) {
  if (!CODE.test(code || "")) throw new Bad(400, "bad code");
  const k = roomKey(code);
  const v = await s.hget(k, "v");
  if (v === null || v === undefined) throw new Bad(404, "no such table");
  if (since != null && String(since) === String(v)) return { v: +v };
  const all = await s.hgetall(k) || {};
  const meta = parse(all.meta) || {};
  const out = { v: +all.v || +v, campaign: meta.campaign || null, chars: [], hp: {}, map: parse(all.map) };
  Object.keys(all).forEach(f => {
    if (f.indexOf("char:") === 0) {
      const c = parse(all[f]);
      if (c) out.chars.push({ id: f.slice(5), char: c.char, at: c.at });
    } else if (f.indexOf("hp:") === 0) {
      const h = parse(all[f]);
      if (h) out.hp[f.slice(3)] = h;
    }
  });
  return out;
}

async function handle(req, res) {
  const s = store();
  const url = new URL(req.url, "http://x");
  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    if (!code) return send(res, 200, { ok: !!s, store: s ? s.kind : null });
    if (!s) throw new Bad(503, "not-set-up");
    const img = url.searchParams.get("img");
    if (img) {
      await roomMeta(s, code.toUpperCase());
      const part = int(url.searchParams.get("part"), 0, MAX_PIECES - 1);
      const ver = url.searchParams.get("ver") || "1";
      if (!ID.test(img) || part === null || !ID.test(ver)) throw new Bad(400, "bad piece");
      const data = await s.hget(imgKey(code.toUpperCase()), img + ":" + ver + ":" + part);
      if (data === null || data === undefined) throw new Bad(404, "no such piece");
      return send(res, 200, { data });
    }
    return send(res, 200, await state(s, code.toUpperCase(), url.searchParams.get("since")));
  }
  if (req.method !== "POST") throw new Bad(405, "GET or POST");
  if (!s) throw new Bad(503, "not-set-up");
  const b = await readBody(req);
  const code = typeof b.code === "string" ? b.code.toUpperCase() : "";

  if (b.op === "create") {
    let c = newCode(), tries = 0;
    while (await s.hget(roomKey(c), "meta") && ++tries < 5) c = newCode();
    const gmKey = crypto.randomBytes(18).toString("base64url");
    const campaign = typeof b.campaign === "string" && ID.test(b.campaign) ? b.campaign : null;
    await write(s, c, { meta: JSON.stringify({ gmKey, campaign, created: Date.now() }) });
    return send(res, 200, { code: c, gmKey, campaign });
  }

  const meta = await roomMeta(s, code);
  if (b.op === "char") {
    if (typeof b.id !== "string" || !ID.test(b.id)) throw new Bad(400, "bad id");
    if (!b.char || typeof b.char !== "object" || Array.isArray(b.char)) throw new Bad(400, "no sheet");
    // Two players with the same character id (both built over the example,
    // or both loaded one file) would overwrite each other. The first device
    // to write an id keeps it; another device is told to take a new one.
    const dev = typeof b.dev === "string" && /^[a-z0-9]{8,40}$/.test(b.dev) ? b.dev : null;
    const k = roomKey(code);
    const prev = parse(await s.hget(k, "char:" + b.id));
    if (prev && prev.dev && dev && prev.dev !== dev) throw new Bad(409, "id taken");
    const sheet = JSON.stringify({ char: b.char, at: Date.now(), dev });
    if (sheet.length > MAX_SHEET) throw new Bad(413, "sheet too big");
    // the id this device wrote before, if it changed: gone, unless another device owns it
    if (typeof b.drop === "string" && ID.test(b.drop) && b.drop !== b.id) {
      const old = parse(await s.hget(k, "char:" + b.drop));
      if (old && (!old.dev || old.dev === dev)) await s.hdel(k, "char:" + b.drop, "hp:" + b.drop);
    }
    if (!prev) {
      const n = Object.keys(await s.hgetall(k) || {}).filter(f => f.indexOf("char:") === 0).length;
      if (n >= MAX_CHARS) throw new Bad(409, "table full");
    }
    return send(res, 200, { v: await write(s, code, { ["char:" + b.id]: sheet }) });
  }
  if (b.op === "hp") {
    if (typeof b.id !== "string" || !ID.test(b.id)) throw new Bad(400, "bad id");
    // Stamped here, not by the device: a phone's clock can be minutes out, and
    // "the last write to arrive wins" needs one clock to mean anything.
    const at = Math.max(Date.now(), (parse(await s.hget(roomKey(code), "hp:" + b.id)) || {}).at + 1 || 0);
    const hp = { now: b.now == null ? null : int(b.now, 0, 9999), temp: int(b.temp, 0, 9999) || 0, at };
    return send(res, 200, { v: await write(s, code, { ["hp:" + b.id]: JSON.stringify(hp) }) });
  }
  if (b.op === "map" || b.op === "end" || b.op === "img") {
    if (!sameKey(b.gmKey, meta.gmKey)) throw new Bad(403, "only the GM can do that");
    if (b.op === "end") { await s.del(roomKey(code)); await s.del(imgKey(code)); return send(res, 200, { ended: true }); }
    if (b.op === "img") {
      const part = int(b.part, 0, MAX_PIECES - 1), ver = typeof b.ver === "string" && ID.test(b.ver) ? b.ver : "1";
      if (typeof b.id !== "string" || !ID.test(b.id) || part === null) throw new Bad(400, "bad piece");
      if (typeof b.data !== "string" || b.data.length > MAX_PIECE || !DATA_PIECE.test(b.data)) throw new Bad(413, "piece too big");
      const k = imgKey(code), field = b.id + ":" + ver + ":" + part;
      if (!(await s.hget(k, field)) && (await s.hlen(k)) >= MAX_ROOM_PIECES) throw new Bad(409, "too many images");
      await s.hset(k, { [field]: b.data });
      await s.expire(k, TTL);
      return send(res, 200, { ok: true });
    }
    return send(res, 200, { v: await write(s, code, { map: JSON.stringify(cleanMap(b.map)) }) });
  }
  throw new Bad(400, "unknown op");
}

module.exports = async function (req, res) {
  try { await handle(req, res); }
  catch (e) {
    if (e instanceof Bad) return send(res, e.status, { error: e.message });
    send(res, 500, { error: "server error" });
  }
};
