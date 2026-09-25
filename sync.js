/* The live table, browser side: window.TTSYNC.
 *
 * Three kinds of device join one room (api/room.js) by its six-letter code:
 *   gm      the GM's screen: makes the room, reads the players' sheets,
 *           writes what the table's map shows
 *   player  a phone: writes its character after every change, reads HP
 *   map     the screen in the middle of the table: reads the map
 *
 * Each role remembers its room in its own storage key, so the GM's laptop can
 * also hold a character without the two getting mixed up. Polling stops while
 * the tab is hidden and slows down after failures; nothing here throws into
 * the app, and opened from a file it simply says sync isn't available.
 */
(function (root) {
  "use strict";
  var API = "api/room";
  var EVERY = { gm: 2500, map: 2500, player: 5000 };
  var roles = {};              // role -> { code, gmKey, v, data, ok, err, timer, fails, subs }

  function lsKey(role) { return "ttb.sync." + role; }
  function readSaved(role) {
    try { var o = JSON.parse(localStorage.getItem(lsKey(role)) || "null"); return o && o.code ? o : null; }
    catch (e) { return null; }
  }
  function writeSaved(role, o) {
    try { if (o) localStorage.setItem(lsKey(role), JSON.stringify(o)); else localStorage.removeItem(lsKey(role)); }
    catch (e) {}
  }
  function available() { return /^https?:$/.test(location.protocol) && typeof fetch === "function"; }
  function cleanCode(c) { return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); }

  function request(method, body, query) {
    if (!available()) return Promise.resolve({ status: 0, data: { error: "file" } });
    var url = API + (query ? "?" + query : "");
    var opt = { method: method, cache: "no-store", headers: {} };
    if (body) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d }; });
    }, function () { return { status: 0, data: { error: "offline" } }; });
  }
  // What went wrong, in words the screens can show (and translate).
  function why(res) {
    if (res.status === 0) return res.data && res.data.error === "file"
      ? "Live sync works on the website, not from a file" : "Can't reach the site";
    if (res.status === 404 && res.data && res.data.error === "no such table") return "No table with that code";
    if (res.status === 404 || res.status === 503) return "Live sync isn't set up on this site yet";
    if (res.status === 409) return "That table is full";
    if (res.status === 403) return "Only the GM can do that";
    return "Sync error " + res.status;
  }

  function slot(role) {
    if (!roles[role]) {
      var saved = readSaved(role) || {};
      roles[role] = { code: saved.code || null, gmKey: saved.gmKey || null, v: null, data: null,
                      ok: 0, err: null, timer: null, fails: 0, subs: [] };
    }
    return roles[role];
  }
  function tell(role) {
    var r = slot(role);
    r.subs.slice().forEach(function (fn) { try { fn(r.data, status(role)); } catch (e) {} });
  }
  function poll(role) {
    var r = slot(role);
    clearTimeout(r.timer); r.timer = null;
    if (!r.code) return;
    if (typeof document !== "undefined" && document.hidden) return;   // visibilitychange restarts it
    var code = r.code;
    request("GET", null, "code=" + encodeURIComponent(code) + (r.v != null ? "&since=" + r.v : ""))
      .then(function (res) {
        if (r.code !== code) return;                                // left or switched meanwhile
        if (res.status === 200) {
          r.ok = Date.now(); r.err = null; r.fails = 0;
          if (res.data.v !== r.v || !r.data) {
            if (res.data.chars || res.data.map !== undefined) { r.data = res.data; r.v = res.data.v; tell(role); }
            else r.v = null;                                         // lost our copy; ask for all of it
          }
        } else {
          r.fails++; r.err = why(res);
          if (res.status === 404 && res.data && res.data.error === "no such table") { leave(role); r.err = why(res); }
          tell(role);
        }
      })
      .then(function () {
        if (r.code !== code) return;
        var wait = EVERY[role] * Math.min(8, Math.pow(2, Math.min(r.fails, 3)));
        r.timer = setTimeout(function () { poll(role); }, wait);
      });
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) return;
      Object.keys(roles).forEach(function (role) { if (roles[role].code) poll(role); });
    });
  }

  function start(role, code, gmKey) {
    var r = slot(role);
    r.code = code; r.gmKey = gmKey || null; r.v = null; r.data = null; r.err = null; r.fails = 0;
    writeSaved(role, { code: code, gmKey: r.gmKey });
    poll(role);
  }
  function leave(role) {
    var r = slot(role);
    clearTimeout(r.timer);
    r.code = null; r.gmKey = null; r.v = null; r.data = null;
    writeSaved(role, null);
    tell(role);
  }
  function status(role) {
    var r = slot(role);
    return { code: r.code, gm: !!r.gmKey, ok: r.ok, err: r.err, data: r.data, available: available() };
  }

  /* ---- the GM's room --------------------------------------------------- */
  function create(campaign) {
    return request("POST", { op: "create", campaign: campaign || null }).then(function (res) {
      if (res.status !== 200) return { error: why(res) };
      start("gm", res.data.code, res.data.gmKey);
      return { code: res.data.code };
    });
  }
  function end() {
    var r = slot("gm");
    var p = r.code ? request("POST", { op: "end", code: r.code, gmKey: r.gmKey }) : Promise.resolve();
    leave("gm");
    return p;
  }

  /* ---- joining: check the room is there first --------------------------- */
  function join(role, code) {
    code = cleanCode(code);
    if (code.length !== 6) return Promise.resolve({ error: "A table code is six letters and numbers" });
    return request("GET", null, "code=" + code).then(function (res) {
      if (res.status !== 200) return { error: why(res) };
      start(role, code);
      var r = slot(role);
      r.data = res.data; r.v = res.data.v; r.ok = Date.now();
      tell(role);
      return { code: code, campaign: res.data.campaign || null };
    });
  }

  /* ---- writes, each debounced so a burst of taps is one request ---------- */
  var pending = {};
  function later(key, ms, fn) {
    clearTimeout(pending[key]);
    pending[key] = setTimeout(function () { delete pending[key]; fn(); }, ms);
  }
  function pushChar(c) {
    var r = slot("player");
    if (!r.code || !c || !c.id) return;
    var code = r.code, id = c.id, sheet = JSON.parse(JSON.stringify(c));
    later("char", 1000, function () {
      request("POST", { op: "char", code: code, id: id, char: sheet }).then(function (res) {
        if (res.status === 200) { r.ok = Date.now(); r.err = null; } else r.err = why(res);
        tell("player");
      });
    });
  }
  // HP goes both ways: the player on their sheet, the GM in the encounter.
  function pushHp(role, id, now, temp) {
    var r = slot(role);
    if (!r.code || !id) return;
    var body = { op: "hp", code: r.code, id: id, now: now, temp: temp || 0 };
    later("hp:" + role + ":" + id, 400, function () { request("POST", body); });
  }
  function pushMap(map) {
    var r = slot("gm");
    if (!r.code || !r.gmKey) return;
    var body = { op: "map", code: r.code, gmKey: r.gmKey, map: map };
    later("map", 300, function () { request("POST", body); });
  }

  /* ---- the GM's own map images, in pieces -----------------------------
     One request per piece, one after another: a phone hotspot copes with
     that, and a failed piece is retried rather than the whole image. */
  var PIECE = 88 * 1024;
  function piecesOf(data) {
    var out = [];
    for (var i = 0; i < data.length; i += PIECE) out.push(data.slice(i, i + PIECE));
    return out;
  }
  function pushImage(id, ver, data, progress) {
    var r = slot("gm");
    if (!r.code || !r.gmKey) return Promise.resolve({ error: "No live table" });
    var parts = piecesOf(data), code = r.code, key = r.gmKey;
    function send(i, tries) {
      if (i >= parts.length) return Promise.resolve({ parts: parts.length });
      return request("POST", { op: "img", code: code, gmKey: key, id: id, ver: ver, part: i, data: parts[i] })
        .then(function (res) {
          if (res.status === 200) { if (progress) progress(i + 1, parts.length); return send(i + 1, 0); }
          if (tries < 2 && (res.status === 0 || res.status >= 500)) return send(i, tries + 1);
          return { error: why(res) };
        });
    }
    return send(0, 0);
  }
  function fetchImage(role, id, ver, parts) {
    var r = slot(role), got = [];
    if (!r.code) return Promise.resolve(null);
    var code = r.code;
    function get(i, tries) {
      if (i >= parts) return Promise.resolve(got.join(""));
      return request("GET", null, "code=" + code + "&img=" + encodeURIComponent(id) + "&ver=" +
        encodeURIComponent(ver) + "&part=" + i).then(function (res) {
        if (res.status === 200 && typeof res.data.data === "string") { got.push(res.data.data); return get(i + 1, 0); }
        if (tries < 2 && res.status !== 404) return get(i, tries + 1);
        return null;
      });
    }
    return get(0, 0);
  }

  function on(role, fn) {
    var r = slot(role);
    r.subs.push(fn);
    if (r.code && !r.timer) poll(role);
    return function () { r.subs = r.subs.filter(function (x) { return x !== fn; }); };
  }
  function resume() {
    ["gm", "player", "map"].forEach(function (role) {
      var r = slot(role);
      if (r.code && !r.timer) poll(role);
    });
  }
  function ping() { return request("GET").then(function (res) { return res.status === 200 && !!res.data.ok; }); }

  root.TTSYNC = {
    available: available, ping: ping, create: create, end: end, join: join, leave: leave,
    status: status, on: on, resume: resume, pushChar: pushChar, pushHp: pushHp, pushMap: pushMap,
    pushImage: pushImage, fetchImage: fetchImage, piecesOf: piecesOf, cleanCode: cleanCode
  };
})(window);
