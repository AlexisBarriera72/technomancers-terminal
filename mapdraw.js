/* Draws a map from maps.js as an SVG string.
 *
 * One function, render(map, opts), used three ways: the GM's Maps screen,
 * the player screen on the TV (fog opaque, no key letters, nothing marked
 * for the GM only), and tools/render-maps.js, which writes the same SVG to
 * files. It only builds strings, so it runs in the browser and in Node.
 *
 * Maps are drawn on a square grid, one square is 5 ft. Coordinates in the
 * map data are in squares; this file multiplies by S.
 *
 *   opts.theme   "noir" (dark, for screens) or "print" (black on white)
 *   opts.grid    draw the grid (default true)
 *   opts.keys    draw the lettered key circles (default true, never for players)
 *   opts.player  the players' view: fog is opaque, GM-only things are hidden
 *   opts.fog     { revealed: [areaId…] } or null for no fog at all
 *   opts.title   a title band under the map, for exported files
 */
(function (root) {
  "use strict";
  var S = 50;

  var THEMES = {
    noir: {
      void: "#02040a", voidLine: "rgba(34,211,238,0.06)",
      grid: "rgba(120,200,230,0.16)", wall: "#a8e6f5", wallW: 7, glow: true,
      obj: "#1b2536", objLine: "#6f86a3", wood: "#2a1d14", woodLine: "#7a5a3f",
      accent: "#22d3ee", hot: "#ff3d81", gold: "#fbbf24", text: "#e8eef7", textDim: "#9fb0c6",
      keyFill: "#ff3d81", keyText: "#12040a", door: "#22d3ee", doorLocked: "#fbbf24", doorSecret: "#ff3d81",
      fogGm: "rgba(2,4,10,0.55)", fogPlayer: "#02040a", markParty: "#22d3ee", markFoe: "#ff3d81", markExit: "#a3e635",
      plant: "#123a33", plantLine: "#2f7a6a", people: "#6f86a3",
      floors: {
        metal: ["#0f1724", "#1a2536"], bone: ["#1b1712", "#2a231a"], tile: ["#101a28", "#1a2638"],
        stone: ["#13161d", "#1d222c"], wood: ["#1c140e", "#2a1f16"], carpet: ["#1e0f1b", "#2c1628"],
        street: ["#0c1119", "#151c27"], water: ["#05232f", "#0d4053"], ichor: ["#2a1f05", "#6b4f0c"],
        drop: ["#000000", "rgba(255,61,129,0.45)"], grate: ["#0b131c", "#1f2d3d"], dirt: ["#16130e", "#221d15"],
        glass: ["#081a24", "#16384a"], flesh: ["#220c13", "#3d1622"], void: ["#02040a", "rgba(34,211,238,0.06)"],
        garden: ["#0b1c18", "#143128"], neon: ["#12091a", "#2a1238"]
      }
    },
    print: {
      void: "#ffffff", voidLine: "#e4e4e4",
      grid: "rgba(0,0,0,0.2)", wall: "#111111", wallW: 7, glow: false,
      obj: "#ffffff", objLine: "#333333", wood: "#f3ece2", woodLine: "#555555",
      accent: "#333333", hot: "#555555", gold: "#777777", text: "#111111", textDim: "#444444",
      keyFill: "#ffffff", keyText: "#111111", door: "#ffffff", doorLocked: "#dddddd", doorSecret: "#ffffff",
      fogGm: "rgba(0,0,0,0.25)", fogPlayer: "#ffffff", markParty: "#333333", markFoe: "#333333", markExit: "#333333",
      plant: "#eef3ee", plantLine: "#555555", people: "#777777",
      floors: {
        metal: ["#f3f4f6", "#dfe2e6"], bone: ["#f6f1e8", "#e5dccd"], tile: ["#f6f6f6", "#e2e2e2"],
        stone: ["#f1f1f1", "#dcdcdc"], wood: ["#f7f1e8", "#e4d8c6"], carpet: ["#f5eef3", "#e3d4de"],
        street: ["#fbfbfb", "#e9e9e9"], water: ["#e3f1f7", "#b9d9e6"], ichor: ["#fbf1d2", "#e2cf92"],
        drop: ["#ffffff", "#8a8a8a"], grate: ["#f4f4f4", "#bdbdbd"], dirt: ["#f5f1ea", "#ddd3c3"],
        glass: ["#eef6f9", "#cfe3ea"], flesh: ["#f8ebee", "#e2c4cb"], void: ["#ffffff", "#e4e4e4"],
        garden: ["#eef4ee", "#d3e2d3"], neon: ["#f3eef6", "#ddd0e5"]
      }
    }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function n(v) { return Math.round(v * 10) / 10; }
  /* A small deterministic generator, so rubble and crowds land in the same
     place every time a map is drawn. */
  function rng(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- areas ------------------------------------------------------------ */
  function areaPoints(a) {
    if (a.poly) return a.poly;
    var r = a.r;
    return [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]];
  }
  function areaCenter(a) {
    if (a.lx != null) return [a.lx, a.ly];
    if (a.r) return [a.r[0] + a.r[2] / 2, a.r[1] + a.r[3] / 2];
    var p = a.poly, x = 0, y = 0;
    p.forEach(function (q) { x += q[0]; y += q[1]; });
    return [x / p.length, y / p.length];
  }
  function pts(list) { return list.map(function (p) { return n(p[0] * S) + "," + n(p[1] * S); }).join(" "); }
  function walled(a) { return a.walls !== false && a.floor !== "drop" && a.floor !== "street" && a.floor !== "garden"; }

  /* ---- patterns ----------------------------------------------------------- */
  function defs(P, id) {
    var out = ["<defs>"];
    Object.keys(P.floors).forEach(function (k) {
      var c = P.floors[k], pid = id + "-f-" + k, body;
      switch (k) {
        case "metal":
          body = '<rect width="100" height="100" fill="' + c[0] + '"/><path d="M0 0H100M0 50H100M50 0V50M0 50V100M75 50V100M25 50V100" stroke="' + c[1] + '" stroke-width="2" fill="none"/>' +
            '<circle cx="6" cy="6" r="2" fill="' + c[1] + '"/><circle cx="56" cy="56" r="2" fill="' + c[1] + '"/>';
          return out.push(pat(pid, 100, body));
        case "tile":
          return out.push(pat(pid, 25, '<rect width="25" height="25" fill="' + c[0] + '"/><path d="M0 0H25M0 0V25" stroke="' + c[1] + '" stroke-width="1.5"/>'));
        case "grate":
          return out.push(pat(pid, 12, '<rect width="12" height="12" fill="' + c[0] + '"/><path d="M0 6H12M6 0V12" stroke="' + c[1] + '" stroke-width="2"/>'));
        case "water":
          return out.push(pat(pid, 60, '<rect width="60" height="60" fill="' + c[0] + '"/><path d="M0 18q7.5-7 15 0t15 0t15 0t15 0M0 48q7.5-7 15 0t15 0t15 0t15 0" stroke="' + c[1] + '" stroke-width="2" fill="none"/>'));
        case "ichor":
          return out.push(pat(pid, 60, '<rect width="60" height="60" fill="' + c[0] + '"/><path d="M0 18q7.5-7 15 0t15 0t15 0t15 0M0 48q7.5-7 15 0t15 0t15 0t15 0" stroke="' + c[1] + '" stroke-width="2.5" fill="none"/>'));
        case "drop":
        case "void":
          return out.push(pat(pid, 16, '<rect width="16" height="16" fill="' + c[0] + '"/><path d="M-4 4L4 -4M0 16L16 0M12 20L20 12" stroke="' + c[1] + '" stroke-width="' + (k === "drop" ? 1.6 : 1) + '"/>'));
        case "wood":
          return out.push(pat(pid, 50, '<rect width="50" height="50" fill="' + c[0] + '"/><path d="M0 0H50M0 12.5H50M0 25H50M0 37.5H50M20 0V12.5M40 12.5V25M10 25V37.5M30 37.5V50" stroke="' + c[1] + '" stroke-width="1.4"/>'));
        case "bone":
        case "flesh":
          return out.push(pat(pid, 80, '<rect width="80" height="80" fill="' + c[0] + '"/><path d="M0 20q20-10 40 0t40 0M0 60q20 10 40 0t40 0M10 40q10-6 20 0" stroke="' + c[1] + '" stroke-width="2" fill="none"/>'));
        case "street":
          return out.push(pat(pid, 100, '<rect width="100" height="100" fill="' + c[0] + '"/><path d="M0 0H100M0 0V100M50 0V100M0 50H100" stroke="' + c[1] + '" stroke-width="1.2"/>'));
        case "garden":
          return out.push(pat(pid, 30, '<rect width="30" height="30" fill="' + c[0] + '"/><path d="M5 10l3-5 3 5M18 24l3-5 3 5" stroke="' + c[1] + '" stroke-width="1.5" fill="none"/>'));
        default:
          return out.push(pat(pid, 40, '<rect width="40" height="40" fill="' + c[0] + '"/><path d="M0 0H40M0 0V40" stroke="' + c[1] + '" stroke-width="1"/>'));
      }
    });
    if (P.glow) {
      out.push('<filter id="' + id + '-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
    }
    out.push("</defs>");
    return out.join("");
  }
  function pat(pid, size, body) {
    return '<pattern id="' + pid + '" width="' + size + '" height="' + size + '" patternUnits="userSpaceOnUse">' + body + "</pattern>";
  }

  /* ---- features ----------------------------------------------------------- */
  // Every type feature() draws; the maps test checks maps.js against it.
  var TYPES = ["crate", "cover", "pillar", "column", "table", "desk", "counter", "bench", "pew", "altar", "bed",
    "shelf", "stall", "console", "machine", "vat", "tank", "fountain", "pipe", "cable", "rail", "stairs", "ladder",
    "lift", "cage", "drill", "engine", "stool", "chair", "ring", "vent", "hand", "eye", "ward", "shard", "camera",
    "turret", "rubble", "bones", "crowd", "plants", "tree", "car", "av", "hatch", "choir", "body", "light", "sign",
    "barrier", "skylight"];
  function feature(f, P, rand, player) {
    var t = f[0], x = f[1] * S, y = f[2] * S, w = (f[3] || 1) * S, h = (f[4] || 1) * S, o = f[5] || {};
    if (typeof o === "string") o = { label: o };
    if (player && o.gm) return "";
    var cx = x + w / 2, cy = y + h / 2, s = [];
    var line = ' stroke="' + P.objLine + '" stroke-width="2"';
    function rect(xx, yy, ww, hh, fill, extra) {
      return '<rect x="' + n(xx) + '" y="' + n(yy) + '" width="' + n(ww) + '" height="' + n(hh) + '" fill="' + fill + '"' + (extra || line) + "/>";
    }
    switch (t) {
      case "crate":
        s.push(rect(x + 4, y + 4, w - 8, h - 8, P.obj));
        s.push('<path d="M' + n(x + 4) + " " + n(y + 4) + "L" + n(x + w - 4) + " " + n(y + h - 4) + "M" + n(x + w - 4) + " " + n(y + 4) + "L" + n(x + 4) + " " + n(y + h - 4) + '"' + line + "/>");
        break;
      case "cover":
        s.push(rect(x + 2, y + 2, w - 4, h - 4, P.obj, ' stroke="' + P.objLine + '" stroke-width="2" stroke-dasharray="6 3"'));
        break;
      case "pillar":
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(Math.min(w, h) * 0.4) + '" fill="' + P.obj + '"' + line + "/>");
        break;
      case "column":
        s.push(rect(x + 6, y + 6, w - 12, h - 12, P.obj));
        break;
      case "table": case "desk": case "counter": case "bench": case "pew": case "altar": case "bed":
        s.push(rect(x + 5, y + 5, w - 10, h - 10, P.wood, ' stroke="' + P.woodLine + '" stroke-width="2"'));
        if (t === "altar") s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="7" fill="none" stroke="' + P.gold + '" stroke-width="2"/>');
        if (t === "bed") s.push(rect(x + 8, y + 8, Math.min(w, h) * 0.45, h - 16, P.obj));
        break;
      case "shelf":
        s.push(rect(x + 3, y + 3, w - 6, h - 6, P.wood, ' stroke="' + P.woodLine + '" stroke-width="2"'));
        var steps = Math.max(2, Math.round(Math.max(w, h) / 25)), d = "";
        for (var i = 1; i < steps; i++) {
          d += w >= h ? "M" + n(x + 3 + (w - 6) * i / steps) + " " + n(y + 3) + "v" + n(h - 6) : "M" + n(x + 3) + " " + n(y + 3 + (h - 6) * i / steps) + "h" + n(w - 6);
        }
        s.push('<path d="' + d + '" stroke="' + P.woodLine + '" stroke-width="1.5"/>');
        break;
      case "stall":
        s.push(rect(x + 3, y + 3, w - 6, h - 6, P.obj));
        var st = "";
        for (var k = 0; k * 14 < w - 6; k++) st += "M" + n(x + 3 + k * 14) + " " + n(y + 3) + "v" + n(Math.min(14, h - 6));
        s.push('<path d="' + st + '" stroke="' + P.hot + '" stroke-width="5"/>');
        break;
      case "console":
        s.push(rect(x + 4, y + 8, w - 8, h - 16, P.obj));
        s.push('<path d="M' + n(x + 9) + " " + n(cy) + "H" + n(x + w - 9) + '" stroke="' + P.accent + '" stroke-width="3"' + (P.glow ? ' filter="url(#FID-glow)"' : "") + "/>");
        break;
      case "machine":
        s.push(rect(x + 3, y + 3, w - 6, h - 6, P.obj));
        s.push(rect(x + 10, y + 10, w * 0.35, h - 20, "none"));
        s.push('<circle cx="' + n(x + w * 0.72) + '" cy="' + n(cy) + '" r="' + n(Math.min(w, h) * 0.18) + '" fill="none"' + line + "/>");
        break;
      case "vat": case "tank": case "fountain":
        var rr = Math.min(w, h) / 2 - 4;
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(rr) + '" fill="' + P.obj + '"' + line + "/>");
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(rr * 0.65) + '" fill="' + (t === "vat" ? P.floors.ichor[1] : P.floors.water[1]) + '" stroke="none"/>');
        break;
      case "pipe": case "cable": case "rail":
        // [type, x1, y1, x2, y2, {w}] in squares
        var x2 = f[3] * S, y2 = f[4] * S;
        var sw = t === "pipe" ? (o.w || 0.4) * S : t === "rail" ? 3 : 2.5;
        s.push('<path d="M' + n(x) + " " + n(y) + "L" + n(x2) + " " + n(y2) + '" stroke="' + (t === "pipe" ? P.objLine : t === "rail" ? P.textDim : P.gold) + '" stroke-width="' + n(sw) + '" stroke-linecap="round"' + (t === "rail" ? ' stroke-dasharray="2 6"' : "") + "/>");
        if (t === "pipe") s.push('<path d="M' + n(x) + " " + n(y) + "L" + n(x2) + " " + n(y2) + '" stroke="' + P.obj + '" stroke-width="' + n(sw * 0.55) + '" stroke-linecap="round"/>');
        return s.join("");
      case "stairs": case "ladder":
        var dir = o.dir || (w >= h ? "e" : "s"), lines = "", count = Math.round(Math.max(w, h) / (t === "ladder" ? 12 : 10));
        s.push(rect(x + 3, y + 3, w - 6, h - 6, t === "ladder" ? "none" : P.obj));
        for (var q = 1; q < count; q++) {
          lines += (dir === "e" || dir === "w") ? "M" + n(x + 3 + (w - 6) * q / count) + " " + n(y + 3) + "v" + n(h - 6)
                                                 : "M" + n(x + 3) + " " + n(y + 3 + (h - 6) * q / count) + "h" + n(w - 6);
        }
        s.push('<path d="' + lines + '"' + line + "/>");
        var ax = { e: [x + w - 8, cy, x + 8, cy], w: [x + 8, cy, x + w - 8, cy], s: [cx, y + h - 8, cx, y + 8], n: [cx, y + 8, cx, y + h - 8] }[dir];
        s.push('<path d="M' + n(ax[2]) + " " + n(ax[3]) + "L" + n(ax[0]) + " " + n(ax[1]) + '" stroke="' + P.accent + '" stroke-width="2.5" marker-end="url(#FID-arrow)"/>');
        break;
      case "lift": case "cage":
        s.push(rect(x + 3, y + 3, w - 6, h - 6, P.obj, ' stroke="' + P.accent + '" stroke-width="3"'));
        s.push(rect(x + 10, y + 10, w - 20, h - 20, "none", ' stroke="' + P.objLine + '" stroke-width="1.5"'));
        if (t === "cage") {
          var bars = "";
          for (var b = 1; b < 6; b++) bars += "M" + n(x + 3 + (w - 6) * b / 6) + " " + n(y + 3) + "v" + n(h - 6);
          s.push('<path d="' + bars + '" stroke="' + P.objLine + '" stroke-width="1.5"/>');
        } else {
          s.push('<path d="M' + n(x + 10) + " " + n(y + 10) + "L" + n(x + w - 10) + " " + n(y + h - 10) + "M" + n(x + w - 10) + " " + n(y + 10) + "L" + n(x + 10) + " " + n(y + h - 10) + '" stroke="' + P.objLine + '" stroke-width="1.5"/>');
        }
        break;
      case "drill": case "engine":
        var R = Math.min(w, h) / 2 - 4, spokes = "";
        for (var a = 0; a < 12; a++) {
          var ang = a * Math.PI / 6;
          spokes += "M" + n(cx + Math.cos(ang) * R * 0.3) + " " + n(cy + Math.sin(ang) * R * 0.3) + "L" + n(cx + Math.cos(ang) * R) + " " + n(cy + Math.sin(ang) * R);
        }
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(R) + '" fill="' + P.obj + '" stroke="' + P.gold + '" stroke-width="3"/>');
        s.push('<path d="' + spokes + '" stroke="' + P.objLine + '" stroke-width="3"/>');
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(R * 0.28) + '" fill="' + P.floors.ichor[1] + '"/>');
        break;
      case "stool": case "chair":
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(Math.min(w, h) * 0.22) + '" fill="' + P.wood + '" stroke="' + P.woodLine + '" stroke-width="2"/>');
        break;
      case "ring":
        s.push('<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(w / 2 - 4) + '" ry="' + n(h / 2 - 4) + '" fill="none" stroke="' + P.hot + '" stroke-width="3" stroke-dasharray="10 7"/>');
        break;
      case "vent":
        s.push(rect(x + 6, y + 6, w - 12, h - 12, P.obj));
        s.push('<path d="M' + n(x + 10) + " " + n(y + h * 0.35) + "H" + n(x + w - 10) + "M" + n(x + 10) + " " + n(cy) + "H" + n(x + w - 10) + "M" + n(x + 10) + " " + n(y + h * 0.65) + "H" + n(x + w - 10) + '"' + line + "/>");
        break;
      case "hand":
        // the new god's hand, growing out of the bone: a palm and five fingers
        var hr = Math.min(w, h), glowH = P.glow ? ' filter="url(#FID-glow)"' : "";
        s.push('<ellipse cx="' + n(cx) + '" cy="' + n(y + h * 0.68) + '" rx="' + n(w * 0.26) + '" ry="' + n(h * 0.22) + '" fill="' + P.floors.flesh[1] + '" stroke="' + P.gold + '" stroke-width="3"' + glowH + "/>");
        var fing = "";
        [-0.36, -0.18, 0, 0.18, 0.36].forEach(function (dx, i) {
          var len = hr * (i === 0 ? 0.3 : 0.5 - Math.abs(dx) * 0.4);
          var bx0 = cx + dx * w * 0.6, by0 = y + h * 0.55;
          fing += "M" + n(bx0) + " " + n(by0) + "L" + n(bx0 + dx * w * 0.35) + " " + n(by0 - len);
        });
        s.push('<path d="' + fing + '" stroke="' + P.gold + '" stroke-width="' + n(hr * 0.07) + '" stroke-linecap="round"' + glowH + "/>");
        break;
      case "eye":
        if (o.closed) {
          s.push('<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(w / 2 - 4) + '" ry="' + n(h / 2 - 4) + '" fill="' + P.obj + '" stroke="' + P.gold + '" stroke-width="4"/>');
          s.push('<path d="M' + n(x + 8) + " " + n(cy) + "Q" + n(cx) + " " + n(cy + h * 0.25) + " " + n(x + w - 8) + " " + n(cy) + '" stroke="' + P.gold + '" stroke-width="4" fill="none"/>');
          break;
        }
        s.push('<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(w / 2 - 4) + '" ry="' + n(h / 2 - 4) + '" fill="' + P.floors.glass[0] + '" stroke="' + P.gold + '" stroke-width="5"' + (P.glow ? ' filter="url(#FID-glow)"' : "") + "/>");
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(Math.min(w, h) * 0.3) + '" fill="' + P.floors.ichor[1] + '" stroke="' + P.gold + '" stroke-width="3"/>');
        s.push('<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(Math.min(w, h) * 0.08) + '" ry="' + n(Math.min(w, h) * 0.24) + '" fill="' + P.void + '"/>');
        break;
      case "ward":
        s.push('<path d="M' + n(cx) + " " + n(y + 6) + "L" + n(x + w - 6) + " " + n(cy) + "L" + n(cx) + " " + n(y + h - 6) + "L" + n(x + 6) + " " + n(cy) + 'Z" fill="' + P.obj + '" stroke="' + P.hot + '" stroke-width="3"' + (P.glow ? ' filter="url(#FID-glow)"' : "") + "/>");
        break;
      case "shard":
        s.push('<path d="M' + n(cx) + " " + n(y + 5) + "L" + n(x + w - 12) + " " + n(cy) + "L" + n(cx + 4) + " " + n(y + h - 5) + "L" + n(x + 12) + " " + n(cy + 4) + 'Z" fill="' + P.hot + '" stroke="' + P.text + '" stroke-width="1.5"' + (P.glow ? ' filter="url(#FID-glow)"' : "") + "/>");
        break;
      case "camera":
        s.push('<path d="M' + n(x + 10) + " " + n(y + 10) + "L" + n(x + w - 8) + " " + n(cy) + "L" + n(x + 10) + " " + n(y + h - 10) + 'Z" fill="' + P.obj + '" stroke="' + P.hot + '" stroke-width="2"/>');
        break;
      case "turret":
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(Math.min(w, h) * 0.3) + '" fill="' + P.obj + '" stroke="' + P.hot + '" stroke-width="2.5"/>');
        s.push('<path d="M' + n(cx) + " " + n(cy) + "L" + n(x + w - 4) + " " + n(cy) + '" stroke="' + P.hot + '" stroke-width="5"/>');
        break;
      case "rubble": case "bones": case "crowd": case "plants":
        var count2 = Math.round((w / S) * (h / S) * (t === "crowd" ? 2.2 : t === "plants" ? 1.2 : 3));
        for (var c = 0; c < count2; c++) {
          var px = x + 6 + rand() * (w - 12), py = y + 6 + rand() * (h - 12), rsz = 4 + rand() * 7;
          if (t === "crowd") {
            s.push('<circle cx="' + n(px) + '" cy="' + n(py) + '" r="' + n(7 + rand() * 3) + '" fill="' + P.people + '" stroke="' + P.void + '" stroke-width="1.5"/>');
          } else if (t === "plants") {
            s.push('<circle cx="' + n(px) + '" cy="' + n(py) + '" r="' + n(rsz + 6) + '" fill="' + P.plant + '" stroke="' + P.plantLine + '" stroke-width="1.5"/>');
          } else if (t === "bones") {
            var ang2 = rand() * Math.PI;
            s.push('<path d="M' + n(px) + " " + n(py) + "l" + n(Math.cos(ang2) * 12) + " " + n(Math.sin(ang2) * 12) + '" stroke="' + P.textDim + '" stroke-width="3" stroke-linecap="round"/>');
          } else {
            s.push('<path d="M' + n(px) + " " + n(py - rsz) + "l" + n(rsz) + " " + n(rsz * 0.6) + "l" + n(-rsz * 0.4) + " " + n(rsz) + "l" + n(-rsz * 1.1) + " " + n(-rsz * 0.3) + 'Z" fill="' + P.obj + '" stroke="' + P.objLine + '" stroke-width="1.2"/>');
          }
        }
        break;
      case "tree":
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(Math.min(w, h) / 2 - 3) + '" fill="' + P.plant + '" stroke="' + P.plantLine + '" stroke-width="2"/>');
        break;
      case "car": case "av":
        s.push('<rect x="' + n(x + 4) + '" y="' + n(y + 4) + '" width="' + n(w - 8) + '" height="' + n(h - 8) + '" rx="' + n(Math.min(w, h) * 0.25) + '" fill="' + P.obj + '" stroke="' + (t === "av" ? P.accent : P.objLine) + '" stroke-width="2.5"/>');
        s.push(w >= h ? rect(x + w * 0.62, y + 10, w * 0.14, h - 20, P.floors.glass[1], ' stroke="none"')
                      : rect(x + 10, y + h * 0.2, w - 20, h * 0.14, P.floors.glass[1], ' stroke="none"'));
        break;
      case "hatch":
        s.push(rect(x + 8, y + 8, w - 16, h - 16, P.obj));
        s.push('<path d="M' + n(x + 8) + " " + n(cy) + "H" + n(x + w - 8) + '"' + line + "/>");
        break;
      case "choir":
        // organ pipes: the Cantor's housing
        var pipes = Math.max(4, Math.round(w / 18)), pw = (w - 8) / pipes;
        for (var p2 = 0; p2 < pipes; p2++) {
          var ph = h * (0.45 + 0.55 * Math.abs(Math.sin((p2 + 1) * 1.7)));
          s.push(rect(x + 4 + p2 * pw, y + h - ph, pw - 3, ph - 4, P.obj, ' stroke="' + P.gold + '" stroke-width="1.5"'));
        }
        break;
      case "body":
        s.push('<ellipse cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(w * 0.38) + '" ry="' + n(h * 0.2) + '" fill="' + P.floors.flesh[1] + '" stroke="' + P.objLine + '" stroke-width="1.5"/>');
        break;
      case "light":
        s.push('<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(Math.min(w, h) * 0.18) + '" fill="' + P.gold + '"' + (P.glow ? ' filter="url(#FID-glow)"' : "") + "/>");
        break;
      case "sign":
        s.push(rect(x + 4, cy - 6, w - 8, 12, P.obj, ' stroke="' + P.hot + '" stroke-width="2.5"'));
        break;
      case "barrier":
        s.push('<path d="M' + n(x + 4) + " " + n(cy) + "H" + n(x + w - 4) + '" stroke="' + P.textDim + '" stroke-width="2" stroke-dasharray="4 5"/>');
        s.push('<circle cx="' + n(x + 5) + '" cy="' + n(cy) + '" r="4" fill="' + P.objLine + '"/><circle cx="' + n(x + w - 5) + '" cy="' + n(cy) + '" r="4" fill="' + P.objLine + '"/>');
        break;
      case "skylight":
        s.push(rect(x + 4, y + 4, w - 8, h - 8, "none", ' stroke="' + P.accent + '" stroke-width="2" stroke-dasharray="8 5"'));
        break;
      default:
        s.push(rect(x + 4, y + 4, w - 8, h - 8, P.obj));
    }
    if (o.label) {
      s.push('<text x="' + n(cx) + '" y="' + n(cy + 4) + '" text-anchor="middle" font-size="12" fill="' + P.textDim + '" font-family="Barlow, Arial, sans-serif">' + esc(o.label) + "</text>");
    }
    return s.join("");
  }

  /* ---- doors --------------------------------------------------------------- */
  function door(d, P, floorFill, player) {
    // [x, y, "h"|"v", type, length]
    var x = d[0] * S, y = d[1] * S, dir = d[2] || "h", t = d[3] || "door", len = (d[4] || 1) * S;
    if (t === "secret" && player) return "";
    var s = [], th = P.wallW + 6;
    var bx = dir === "h" ? x : x - th / 2, by = dir === "h" ? y - th / 2 : y;
    var bw = dir === "h" ? len : th, bh = dir === "h" ? th : len;
    if (t === "arch" || t === "gap") {
      return '<rect x="' + n(bx) + '" y="' + n(by + (dir === "h" ? 0 : 0)) + '" width="' + n(bw) + '" height="' + n(bh) + '" fill="' + floorFill + '"/>';
    }
    s.push('<rect x="' + n(bx) + '" y="' + n(by) + '" width="' + n(bw) + '" height="' + n(bh) + '" fill="' + floorFill + '"/>');
    var col = t === "locked" || t === "ward" ? P.doorLocked : t === "secret" ? P.doorSecret : P.door;
    var ix = dir === "h" ? x + 6 : x - 5, iy = dir === "h" ? y - 5 : y + 6;
    var iw = dir === "h" ? len - 12 : 10, ih = dir === "h" ? 10 : len - 12;
    if (t === "window") {
      s.push('<rect x="' + n(ix) + '" y="' + n(iy + (dir === "h" ? 3 : 0)) + '" width="' + n(dir === "h" ? iw : 4) + '" height="' + n(dir === "h" ? 4 : ih) + '" fill="' + P.floors.glass[1] + '" stroke="' + P.wall + '" stroke-width="1.5"/>');
      return s.join("");
    }
    if (t === "shutter") {
      s.push('<rect x="' + n(ix) + '" y="' + n(iy) + '" width="' + n(iw) + '" height="' + n(ih) + '" fill="' + P.obj + '" stroke="' + col + '" stroke-width="2" stroke-dasharray="3 3"/>');
      return s.join("");
    }
    s.push('<rect x="' + n(ix) + '" y="' + n(iy) + '" width="' + n(iw) + '" height="' + n(ih) + '" fill="' + P.obj + '" stroke="' + col + '" stroke-width="2.5"/>');
    if (t === "locked" || t === "ward" || t === "secret") {
      s.push('<text x="' + n(dir === "h" ? x + len / 2 : x) + '" y="' + n(dir === "h" ? y + 4 : y + len / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + col + '" font-family="Barlow, Arial, sans-serif">' +
        (t === "locked" ? "L" : t === "ward" ? "W" : "S") + "</text>");
    }
    return s.join("");
  }

  /* ---- the whole map ------------------------------------------------------- */
  function render(map, opts) {
    opts = opts || {};
    var P = THEMES[opts.theme] || THEMES.noir;
    var fid = "m" + String(map.id).replace(/[^a-z0-9]/gi, "");
    var W = map.w * S, H = map.h * S;
    var band = opts.title ? 70 : 0;
    var rand = rng(map.id);
    var player = !!opts.player;
    var revealed = opts.fog && opts.fog.revealed ? opts.fog.revealed : null;
    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + (H + band) + '" width="' + W + '" height="' + (H + band) + '" class="tt-map" data-map="' + esc(map.id) + '">');
    out.push(defs(P, fid).replace("</defs>",
      '<marker id="' + fid + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="' + P.accent + '"/></marker></defs>'));
    var bg = map.bg || "void";
    out.push('<rect width="' + W + '" height="' + H + '" fill="url(#' + fid + "-f-" + bg + ')"/>');

    // floors
    (map.areas || []).forEach(function (a) {
      out.push('<polygon points="' + pts(areaPoints(a)) + '" fill="url(#' + fid + "-f-" + (a.floor || "metal") + ')" data-area="' + esc(a.id) + '"/>');
    });
    (map.patches || []).forEach(function (p) {
      out.push('<polygon points="' + pts(p.poly || areaPoints({ r: p.r })) + '" fill="url(#' + fid + "-f-" + p.floor + ')"/>');
    });

    // grid
    if (opts.grid !== false) {
      var g = "";
      for (var gx = 1; gx < map.w; gx++) g += "M" + gx * S + " 0V" + H;
      for (var gy = 1; gy < map.h; gy++) g += "M0 " + gy * S + "H" + W;
      out.push('<path d="' + g + '" stroke="' + P.grid + '" stroke-width="1" fill="none"/>');
    }

    // features
    var fs = [];
    (map.f || []).forEach(function (f) { fs.push(feature(f, P, rand, player)); });
    out.push(fs.join("").replace(/FID/g, fid));

    // walls
    var wattr = ' fill="none" stroke="' + P.wall + '" stroke-width="' + P.wallW + '" stroke-linejoin="round" stroke-linecap="round"' + (P.glow ? ' filter="url(#' + fid + '-glow)"' : "");
    (map.areas || []).forEach(function (a) {
      if (walled(a)) out.push('<polygon points="' + pts(areaPoints(a)) + '"' + wattr + "/>");
      else if (a.floor === "drop") out.push('<polygon points="' + pts(areaPoints(a)) + '" fill="none" stroke="' + P.hot + '" stroke-width="3" stroke-dasharray="10 6"/>');
    });
    (map.walls || []).forEach(function (w) { out.push('<polyline points="' + pts(w) + '"' + wattr + "/>"); });

    // doors: a door gap is painted with the floor of the first area it touches
    (map.doors || []).forEach(function (d) {
      var fl = "url(#" + fid + "-f-" + (d[5] || floorAt(map, d)) + ")";
      out.push(door(d, P, fl, player));
    });

    // labels
    (map.areas || []).forEach(function (a) {
      if (!a.name || a.nolabel) return;
      if (player && !a.pub) return;
      if (player && revealed && a.fog !== false && revealed.indexOf(a.id) < 0) return;
      var c = areaCenter(a);
      out.push('<text x="' + n(c[0] * S) + '" y="' + n(c[1] * S + (opts.keys !== false && !player && a.key ? 34 : 5)) + '" text-anchor="middle" font-size="15" letter-spacing="1.5" fill="' + P.textDim + '" font-family="Barlow, Arial, sans-serif" style="text-transform:uppercase">' + esc(String(a.name).toUpperCase()) + "</text>");
    });
    (map.labels || []).forEach(function (l) {
      if (player && l[3] === "gm") return;
      out.push('<text x="' + n(l[1] * S) + '" y="' + n(l[2] * S) + '" text-anchor="middle" font-size="13" fill="' + P.textDim + '" font-family="Barlow, Arial, sans-serif" font-style="italic">' + esc(l[0]) + "</text>");
    });

    // start marks: [x, y, label, kind]
    (map.marks || []).forEach(function (m) {
      if (player && m[3] !== "exit") return;
      var col = m[3] === "foe" ? P.markFoe : m[3] === "exit" ? P.markExit : P.markParty;
      out.push('<g><circle cx="' + n(m[0] * S) + '" cy="' + n(m[1] * S) + '" r="11" fill="none" stroke="' + col + '" stroke-width="3"/>' +
        '<text x="' + n(m[0] * S) + '" y="' + n(m[1] * S - 16) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + col + '" font-family="Barlow, Arial, sans-serif">' + esc(m[2]) + "</text></g>");
    });

    // fog
    if (revealed) {
      (map.areas || []).forEach(function (a) {
        if (a.fog === false || revealed.indexOf(a.id) >= 0) return;
        out.push('<polygon class="fog" data-fog="' + esc(a.id) + '" points="' + pts(areaPoints(a)) + '" fill="' + (player ? P.fogPlayer : P.fogGm) + '"' +
          (player ? ' stroke="' + P.fogPlayer + '" stroke-width="' + (P.wallW + 6) + '" stroke-linejoin="round"' : ' stroke="none"') + "/>");
      });
    }

    // key letters, the GM's only
    if (!player && opts.keys !== false) {
      (map.areas || []).forEach(function (a) {
        if (!a.key) return;
        var c = areaCenter(a), kx = n(c[0] * S), ky = n(c[1] * S - 4);
        out.push('<g class="key" data-key="' + esc(a.id) + '"><circle cx="' + kx + '" cy="' + ky + '" r="16" fill="' + P.keyFill + '" stroke="' + P.keyText + '" stroke-width="2"/>' +
          '<text x="' + kx + '" y="' + n(c[1] * S + 2) + '" text-anchor="middle" font-size="17" font-weight="700" fill="' + P.keyText + '" font-family="Barlow, Arial, sans-serif">' + esc(a.key) + "</text></g>");
      });
    }

    if (band) {
      out.push('<rect y="' + H + '" width="' + W + '" height="' + band + '" fill="' + (opts.theme === "print" ? "#ffffff" : "#05070c") + '"/>');
      out.push('<text x="20" y="' + (H + 30) + '" font-size="22" font-weight="700" fill="' + P.text + '" font-family="Barlow, Arial, sans-serif">' + esc(map.title) + "</text>");
      var sc = map.scale || 5;
      out.push('<text x="20" y="' + (H + 55) + '" font-size="14" fill="' + P.textDim + '" font-family="Barlow, Arial, sans-serif">' + esc((map.place || "") + " · " + map.w * sc + " by " + map.h * sc + " ft · one square is " + sc + " ft") + "</text>");
      // scale bar: four squares
      var sx = W - 20 - 4 * S;
      out.push('<path d="M' + sx + " " + (H + 40) + "h" + 4 * S + '" stroke="' + P.text + '" stroke-width="3"/><path d="M' + sx + " " + (H + 34) + "v12M" + (sx + 4 * S) + " " + (H + 34) + "v12M" + (sx + 2 * S) + " " + (H + 36) + 'v8" stroke="' + P.text + '" stroke-width="2"/>' +
        '<text x="' + (sx + 2 * S) + '" y="' + (H + 62) + '" text-anchor="middle" font-size="13" fill="' + P.textDim + '" font-family="Barlow, Arial, sans-serif">' + (4 * sc) + ' ft</text>');
    }
    out.push("</svg>");
    return out.join("");
  }
  function floorAt(map, d) {
    var x = d[0] + (d[2] === "h" ? 0.5 : 0), y = d[1] + (d[2] === "h" ? 0 : 0.5);
    var hit = null;
    (map.areas || []).forEach(function (a) {
      if (hit || !a.r) return;
      var r = a.r;
      if (x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]) hit = a.floor || "metal";
    });
    return hit || map.bg || "void";
  }

  /* Which area holds a point (in squares); used by the viewer to reveal fog
     with a tap. Last drawn wins, the same as the eye sees. */
  function areaAt(map, x, y) {
    var hit = null;
    (map.areas || []).forEach(function (a) {
      if (inPoly(areaPoints(a), x, y)) hit = a;
    });
    return hit;
  }
  function inPoly(p, x, y) {
    var inside = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  root.TTMAPDRAW = { render: render, areaAt: areaAt, areaPoints: areaPoints, areaCenter: areaCenter,
    S: S, THEMES: THEMES, TYPES: TYPES };
})(typeof window !== "undefined" ? window : this);
