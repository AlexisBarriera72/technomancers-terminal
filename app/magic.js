/* app/magic.js: spellcasting for the book's casters.
 *
 * The book reuses the Player's Handbook chassis for its thirteen classes and
 * never reprints Spellcasting, so a Wizard's sheet used to stop at the
 * Technomancer's features. This file adds what the SRD can supply: slots, the
 * save DC and attack bonus, how many spells a caster knows or prepares, a
 * picker over the class's list, and spell cards that spend slots.
 *
 * The rules come from spells.js (SRD 5.1, unchanged). A campaign can add a
 * `magic` block (campaigns.js, Cathedra's) with spells of its own, street
 * names and a look for each class; that layer is words, never numbers.
 *
 * Stored on the character, all optional:
 *   spells     names chosen: cantrips plus the spells known, prepared or,
 *              for a Wizard, written in the spellbook. A name the data
 *              doesn't know is kept as written, so a Player's Handbook spell
 *              can still go on the sheet.
 *   prepared   Wizard only, the spellbook spells prepared today
 *   slotsUsed  { "1": 2, "p": 1, "a6": 1 } slots spent since the last rest;
 *              "p" is a Warlock's pact slots, "aN" a Mystic Arcanum
 */
"use strict";

var SPD = window.TTSPELLS || { meta: null, casters: {}, spells: [] };
var SRD_SPELL = {};
SPD.spells.forEach(function (s) { s.src = "srd"; SRD_SPELL[s.n.toLowerCase()] = s; });
var SPELL_ORD = ["Cantrips", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
var MAX_SPELLS = 120;
function spellLevelName(l) { return l === 0 ? "Cantrip" : SPELL_ORD[l] + " level"; }

/* ---- the campaign's layer ------------------------------------------------ */
function campMagicOf(c) {
  var camp = c && c.campaign ? campById(c.campaign) : null;
  return camp && camp.magic && typeof camp.magic === "object" ? camp.magic : null;
}
function campSpells(c) {
  var m = campMagicOf(c);
  if (!m || !Array.isArray(m.spells)) return [];
  return m.spells.filter(function (s) {
    return s && typeof s.n === "string" && typeof s.l === "number" && s.l >= 0 && s.l <= 9;
  }).map(function (s) { return Object.assign({}, s, { src: "camp" }); });
}
/* [what the street calls it, what it looks like] or null */
function spellDress(s, c) {
  if (!s) return null;
  if (s.src === "camp") return s.look ? [null, String(s.look)] : null;
  var m = campMagicOf(c), x = m && m.names && m.names[s.n];
  return Array.isArray(x) ? [x[0] || null, x[1] || null] : null;
}
function spellFind(name, c) {
  var k = String(name || "").toLowerCase().trim();
  if (!k) return null;
  var own = campSpells(c || C).filter(function (s) { return s.n.toLowerCase() === k; })[0];
  return own || SRD_SPELL[k] || null;
}
function titleCase(n) {
  return String(n).replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); })
    .replace(/\b(Of|From|And|The|With|To)\b/g, function (m, w, i) { return i ? w.toLowerCase() : w; });
}

/* ---- who casts, and how much ---------------------------------------------- */
function casterSpec(c) {
  var cl = c && classByName[c.cls];
  if (!cl || isExp(cl)) return null;
  return SPD.casters[cl.name] || null;
}
function spellStats(c) {
  c = c || C;
  var sp = casterSpec(c);
  if (!sp) return null;
  var d = statsOf(c), lv = Math.max(1, Math.min(20, Math.round(c.level) || 1));
  var row = sp.rows[lv - 1] || [0, null, []], m = mod(d.sc[sp.abil]);
  var out = { abil: sp.abil, kind: sp.kind, mod: m, dc: 8 + d.pb + m, atk: d.pb + m,
              cantrips: row[0] || 0, known: row[1], prepared: null, book: null,
              slots: [], pact: null, max: 0, arcanum: [] };
  if (sp.kind === "pact") {
    row[2].forEach(function (n, i) { if (n) out.pact = { level: i + 1, n: n }; });
    out.max = out.pact ? out.pact.level : 0;
    [[11, 6], [13, 7], [15, 8], [17, 9]].forEach(function (a) { if (lv >= a[0]) out.arcanum.push(a[1]); });
  } else {
    out.slots = row[2].slice();
    out.max = out.slots.length;
  }
  if (out.known == null && (sp.kind === "known" || sp.kind === "pact")) out.known = 0;
  if (sp.kind === "prepared" || sp.kind === "book") {
    var base = c.cls === "Paladin" || c.cls === "Artificer" ? Math.floor(lv / 2) : lv;
    out.prepared = out.max ? Math.max(1, m + base) : 0;
  }
  if (sp.kind === "book") out.book = 6 + 2 * (lv - 1);
  return out;
}

/* The archetype's own spells, read from its tables: "<Class> Level" tables
   are always prepared from that level; "Spell Level" tables widen the list. */
function grantedSpells(c) {
  c = c || C;
  var out = { always: [], extra: [] };
  var sub = statsOf(c).sub;
  if (!sub) return out;
  sub.features.forEach(function (f) {
    (f.blocks || []).forEach(function (b) {
      if (b.type !== "table" || !b.headers || !/^spells$/i.test(b.headers[1] || "")) return;
      var widen = /spell level/i.test(b.headers[0] || "");
      b.rows.forEach(function (r) {
        var at = parseInt(r[0], 10) || 1;
        var names = String(r[1] || "").split(/,\s*/).map(function (x) { return x.trim().replace(/\.$/, ""); })
          .filter(Boolean);
        names.forEach(function (n) {
          var s = spellFind(n, c), nm = s ? s.n : titleCase(n);
          if (widen) out.extra.push(nm);
          else if (c.level >= at) out.always.push(nm);
        });
      });
    });
  });
  return out;
}

/* What the picker offers: the class's list, the archetype's additions and
   the campaign's own spells, up to the highest level this caster can cast. */
function spellOptions(c, st) {
  c = c || C; st = st || spellStats(c);
  if (!st) return [];
  var g = grantedSpells(c), extra = {}, always = {};
  g.extra.forEach(function (n) { extra[n.toLowerCase()] = 1; });
  g.always.forEach(function (n) { always[n.toLowerCase()] = 1; });
  return SPD.spells.concat(campSpells(c).filter(function (s) { return !s.gm; })).filter(function (s) {
    if (always[s.n.toLowerCase()]) return false;
    if ((s.cls || []).indexOf(c.cls) < 0 && !extra[s.n.toLowerCase()]) return false;
    if (s.l === 0) return st.cantrips > 0;
    return s.l <= st.max || st.arcanum.indexOf(s.l) >= 0;
  });
}

/* How the choices stand against the limits. */
function spellTally(c, st) {
  c = c || C; st = st || spellStats(c);
  var t = { cantrips: 0, leveled: 0, arcanum: {}, prepared: 0,
            cantripMax: st ? st.cantrips : 0, leveledMax: 0, prepMax: 0 };
  if (!st) return t;
  (c.spells || []).forEach(function (n) {
    var s = spellFind(n, c);
    if (s && s.l === 0) t.cantrips++;
    else if (s && st.kind === "pact" && s.l > 5) t.arcanum[s.l] = (t.arcanum[s.l] || 0) + 1;
    else t.leveled++;
  });
  t.leveledMax = st.kind === "book" ? st.book : st.kind === "prepared" ? st.prepared : st.known;
  if (st.kind === "book") {
    t.prepMax = st.prepared;
    t.prepared = (c.prepared || []).filter(function (n) {
      var s = spellFind(n, c);
      return (c.spells || []).indexOf(n) >= 0 && !(s && s.l === 0);
    }).length;
  }
  return t;
}
/* The shortfall, in words, for the level-up panel and the step's to-do. */
function spellTodo(c) {
  c = c || C;
  var st = spellStats(c);
  if (!st) return [];
  var t = spellTally(c, st), out = [];
  if (t.cantrips < t.cantripMax) out.push(t.cantripMax - t.cantrips + " cantrip" + (t.cantripMax - t.cantrips === 1 ? "" : "s"));
  var word = st.kind === "prepared" ? "spell to prepare" : st.kind === "book" ? "spell for your spellbook" : "spell";
  var short = (t.leveledMax || 0) - t.leveled;
  if (short > 0) out.push(short + " " + (short === 1 ? word : word.replace(/^spell/, "spells")));
  if (st.kind === "book" && t.prepMax > t.prepared && t.leveled)
    out.push(Math.min(t.prepMax - t.prepared, t.leveled - t.prepared) + " to prepare from your spellbook");
  st.arcanum.forEach(function (l) { if (!t.arcanum[l]) out.push("a " + SPELL_ORD[l] + "-level Mystic Arcanum"); });
  return out.filter(function (x) { return !/^0 /.test(x); });
}

/* ---- slots ---------------------------------------------------------------- */
function slotsUsed() { return C.slotsUsed && typeof C.slotsUsed === "object" ? C.slotsUsed : {}; }
function slotLeft(key, max) { return Math.max(0, max - (slotsUsed()[key] || 0)); }
function spendSlot(key, max) {
  if (slotLeft(key, max) <= 0) return false;
  C.slotsUsed = Object.assign({}, slotsUsed());
  C.slotsUsed[key] = (C.slotsUsed[key] || 0) + 1;
  return true;
}
function restSlots(short) {
  if (!short) { C.slotsUsed = {}; return; }
  var u = Object.assign({}, slotsUsed());
  delete u.p;                            // pact magic comes back on a short rest
  C.slotsUsed = u;
}

/* ---- reading a spell ------------------------------------------------------- */
function spellAct(s) {
  var t = String(s.t || "");
  if (/bonus action/i.test(t)) return "Bonus action";
  if (/reaction/i.test(t)) return "Reaction";
  if (/^1 action/i.test(t)) return "Action";
  return "Longer";
}
function diceAt(map, lv) {
  if (!map) return null;
  var best = null;
  Object.keys(map).map(Number).sort(function (a, b) { return a - b; }).forEach(function (k) {
    if (k <= lv) best = map[k];
  });
  return best;
}
/* One line a player can read mid-turn: range, attack or save, dice. */
function spellGist(s, st, c) {
  c = c || C;
  var bits = [];
  if (s.r && s.r !== "Self") bits.push(s.r.replace(/ feet$/, " ft"));
  if (s.a) bits.push(s.a + " spell attack " + sgn(st.atk));
  if (s.sv) bits.push(s.sv + " save DC " + st.dc + (s.half ? ", half on a save" : ""));
  if (s.dmg) {
    var dice = s.dmg.char ? diceAt(s.dmg.char, c.level) : diceAt(s.dmg.slot, s.l);
    if (dice) bits.push(dice + (s.dmg.t ? " " + s.dmg.t.toLowerCase() : ""));
  }
  if (s.heal) {
    var hd = diceAt(s.heal, s.l);
    if (hd) bits.push("heals " + String(hd).replace(/MOD/g, String(st.mod)));
  }
  if (s.k) bits.push("concentration");
  if (!bits.length) {
    var first = (s.x || []).filter(function (b) { return b.text; })[0];
    var t = first ? first.text : "";
    var end = t.search(/[.!?](?:\s|$)/);
    bits.push(end > 0 ? t.slice(0, end + 1) : t.slice(0, 140));
  }
  return bits.join(" · ");
}

/* Everything the character can cast right now, for the sheet and the turn cards. */
function castable(c) {
  c = c || C;
  var st = spellStats(c);
  if (!st) return [];
  var out = [], seen = {};
  function add(n, how) {
    var k = String(n).toLowerCase();
    if (seen[k]) return;
    seen[k] = 1;
    out.push({ name: n, s: spellFind(n, c), how: how });
  }
  grantedSpells(c).always.forEach(function (n) { add(n, "always"); });
  (c.spells || []).forEach(function (n) {
    var s = spellFind(n, c);
    if (st.kind === "book" && !(s && s.l === 0) && (c.prepared || []).indexOf(n) < 0) return;
    add(n, "chosen");
  });
  return out;
}
/* The turn cards' share: spells sorted into the action they cost. */
function spellBuckets(c) {
  c = c || C;
  var st = spellStats(c), out = { "Action": [], "Bonus action": [], "Reaction": [] };
  if (!st) return out;
  castable(c).forEach(function (x) {
    if (!x.s) return;
    var k = spellAct(x.s);
    if (!out[k]) return;
    out[k].push({ name: x.s.n, gist: spellGist(x.s, st, c), uses: x.s.l ? SPELL_ORD[x.s.l] : "Cantrip" });
  });
  return out;
}

/* ---- a spell, drawn ----------------------------------------------------------
   Names and rules text stay in English in both languages, like the book's
   names do: the sheet stores them, and the rules are the SRD's own words. */
function spellCard(x, st, opts) {
  opts = opts || {};
  var s = x.s, dress = s ? spellDress(s, C) : null;
  var d = el("details", "item spell-card");
  if (opts.open) d.open = true;
  var sm = el("summary");
  var h = el("h4");
  h.textContent = s ? s.n : x.name;
  h.setAttribute("data-nolang", "");
  sm.appendChild(h);
  var tags = el("span", "spell-tags");
  if (dress && dress[0]) {
    var dn = el("span", "spell-street");
    dn.textContent = dress[0];
    dn.setAttribute("data-nolang", "");
    tags.appendChild(dn);
  }
  if (s) {
    var act = spellAct(s);
    var at = el("span", "tag " + ({ "Action": "act", "Bonus action": "bon", "Reaction": "rea" }[act] || ""),
      esc(act === "Longer" ? s.t : act));
    if (act === "Longer") at.setAttribute("data-nolang", "");
    tags.appendChild(at);
    tags.appendChild(el("span", "tag spell-lv", s.l ? SPELL_ORD[s.l] : "Cantrip"));
    if (s.k) tags.appendChild(el("span", "tag", "Conc."));
    if (s.ri) tags.appendChild(el("span", "tag", "Ritual"));
    if (s.src === "camp") { var ct = el("span", "tag use", "Cathedra"); ct.setAttribute("data-nolang", ""); tags.appendChild(ct); }
  } else tags.appendChild(el("span", "tag", "Your own"));
  if (x.how === "always") tags.appendChild(el("span", "tag bon", "Always prepared"));
  sm.appendChild(tags);
  if (s && st) {
    var gist = el("p", "spell-gist");
    gist.textContent = spellGist(s, st, C);
    gist.setAttribute("data-nolang", "");
    sm.appendChild(gist);
  }
  // buttons ride in the summary so they show while the card is shut
  if (opts.tail) { opts.tail.addEventListener("click", function (e) { e.stopPropagation(); }); sm.appendChild(opts.tail); }
  d.appendChild(sm);
  var body = el("div", "body");
  body.setAttribute("data-nolang", "");
  if (!s) {
    body.appendChild(el("p", "slot-note", "Not in the free rules. Keep the book's page handy for this one."));
  } else {
    if (dress && dress[1]) {
      var look = el("p", "spell-look");
      look.textContent = dress[1];
      body.appendChild(look);
    }
    var meta = el("div", "spell-meta");
    [[spellLevelName(s.l) + " " + String(s.s || "").toLowerCase()], ["Casting time", s.t], ["Range", s.r],
     ["Components", s.c], ["Duration", s.d]].forEach(function (m) {
      var r = el("span");
      if (m.length === 1) { r.textContent = m[0]; r.className = "spell-school"; }
      else { var k = el("b"); k.textContent = m[0] + " "; r.appendChild(k); r.appendChild(document.createTextNode(m[1] || "-")); }
      meta.appendChild(r);
    });
    body.appendChild(meta);
    renderBlocks(s.x, body);
    if (s.h) {
      var hl = el("p");
      var hb = el("b"); hb.textContent = "At higher levels. ";
      hl.appendChild(hb); hl.appendChild(document.createTextNode(s.h));
      body.appendChild(hl);
    }
  }
  d.appendChild(body);
  return d;
}

/* ---- a Wizard's preparations ----------------------------------------------------
   Spells a Wizard takes go into the spellbook, and only prepared ones can be
   cast. A Wizard who took spells and never pressed Prepare saw nothing but
   cantrips on the sheet, so taking a spell now prepares it while there's
   room, and the sheet lists the rest of the book with its own Prepare. */
function setPrepared(n, on, st) {
  var arr = (C.prepared || []).slice(), ix = arr.indexOf(n);
  if (on && ix < 0) {
    if (spellTally(C, st).prepared >= st.prepared) { toast("You can prepare " + st.prepared + " today; unprepare one first"); return false; }
    arr.push(n);
  } else if (!on && ix >= 0) arr.splice(ix, 1);
  C.prepared = arr; delete C.isExample; save(); render();
  return true;
}

/* ---- the play sheet's Spells section ------------------------------------------ */
function castSpell(s, st, level) {
  if (!s || s.l === 0) return;
  var ok;
  if (st.kind === "pact" && s.l > 5) ok = spendSlot("a" + s.l, 1);
  else if (st.kind === "pact") ok = spendSlot("p", st.pact ? st.pact.n : 0);
  else ok = spendSlot(String(level), st.slots[level - 1] || 0);
  if (!ok) { toast("No slot left for that"); return; }
  delete C.isExample; save(); render();
  toast(s.n + (st.kind === "pact" || level === s.l ? "" : " at " + SPELL_ORD[level] + " level"));
}
function castButtons(s, st) {
  var row = el("div", "spell-cast");
  if (!s || s.l === 0) return null;
  if (st.kind === "pact") {
    var arc = s.l > 5;
    var left = arc ? slotLeft("a" + s.l, 1) : slotLeft("p", st.pact ? st.pact.n : 0);
    var b = el("button", "btn primary", arc ? "Cast (Mystic Arcanum)" : "Cast at " + SPELL_ORD[st.pact ? st.pact.level : s.l]);
    b.disabled = !left;
    b.onclick = function (e) { e.preventDefault(); castSpell(s, st, st.pact ? st.pact.level : s.l); };
    row.appendChild(b);
    return row;
  }
  var any = false;
  for (var L = s.l; L <= st.slots.length; L++) {
    (function (L) {
      var left = slotLeft(String(L), st.slots[L - 1] || 0);
      if (!st.slots[L - 1]) return;
      var b = el("button", L === s.l ? "btn primary" : "btn", L === s.l ? "Cast" : SPELL_ORD[L]);
      b.title = left + " " + SPELL_ORD[L] + "-level slot" + (left === 1 ? "" : "s") + " left";
      b.disabled = !left;
      b.onclick = function (e) { e.preventDefault(); castSpell(s, st, L); };
      row.appendChild(b);
      any = true;
    })(L);
  }
  if (s.ri) row.appendChild(el("span", "page-ref", "Or as a ritual: 10 minutes longer, no slot."));
  return any ? row : null;
}
function slotBoard(st) {
  var box = el("div", "slot-board");
  function line(label, key, max) {
    var r = el("div", "uplink");
    r.appendChild(el("span", "k", esc(label)));
    var left = slotLeft(key, max);
    r.appendChild(el("b", null, left + " / " + max));
    var pips = el("span", "uplink-pips");
    for (var i = 0; i < max; i++) {
      (function (i) {
        var p = el("button", "pip" + (i < left ? " on" : ""));
        p.setAttribute("aria-label", label + ": " + (i < left ? "spend a slot" : "get a slot back"));
        p.onclick = function () {
          C.slotsUsed = Object.assign({}, slotsUsed());
          C.slotsUsed[key] = Math.max(0, Math.min(max, (C.slotsUsed[key] || 0) + (i < left ? 1 : -1)));
          delete C.isExample; save(); render();
        };
        pips.appendChild(p);
      })(i);
    }
    r.appendChild(pips);
    box.appendChild(r);
  }
  if (st.kind === "pact") {
    if (st.pact) line("Pact slots (" + SPELL_ORD[st.pact.level] + ")", "p", st.pact.n);
    st.arcanum.forEach(function (l) { line("Mystic Arcanum (" + SPELL_ORD[l] + ")", "a" + l, 1); });
  } else {
    st.slots.forEach(function (n, i) { if (n) line(SPELL_ORD[i + 1] + " level", String(i + 1), n); });
  }
  var rest = el("div", "toolbar");
  if (st.kind === "pact") {
    var sr = el("button", "chip", "Short rest");
    sr.onclick = function () { restSlots(true); save(); render(); toast("Pact slots back"); };
    rest.appendChild(sr);
  }
  var lr = el("button", "chip", "Long rest");
  lr.onclick = function () { restSlots(false); save(); render(); toast("Every slot is back"); };
  rest.appendChild(lr);
  box.appendChild(rest);
  return box;
}
function spellSection() {
  var st = spellStats(C);
  if (!st) return null;
  var sec = el("div", "sheet-sec spells-sec");
  sec.id = "spells";
  sec.style.gridColumn = "1 / -1";
  sec.appendChild(el("h3", null, "Spells"));
  var vit = el("div", "chips spell-vitals");
  [["Spell save DC", st.dc], ["Spell attack", sgn(st.atk)], ["Casting ability", ABIL_FULL[st.abil]]].forEach(function (v) {
    vit.appendChild(el("span", "chip", esc(v[0]) + " <b>" + esc(String(v[1])) + "</b>"));
  });
  sec.appendChild(vit);
  var mg = campMagicOf(C), look = mg && mg.looks && mg.looks[C.cls];
  if (look) {
    var lp = el("p", "spell-look");
    lp.textContent = look;
    lp.setAttribute("data-nolang", "");
    sec.appendChild(lp);
  }
  if (!st.max && !st.cantrips) {
    sec.appendChild(el("p", "empty-state", "Your spellcasting starts at level 2."));
    return sec;
  }
  if (st.max) sec.appendChild(slotBoard(st));

  var list = castable(C);
  var todo = spellTodo(C);
  var tools = el("div", "toolbar");
  var pick = el("button", "btn" + (todo.length ? " primary" : ""), todo.length ? "Choose spells: " + todo.map(T).join(", ") : "Change spells");
  pick.onclick = function () { mode = "forge"; step = 5; render(); var t = document.getElementById("spell-picker"); if (t && t.scrollIntoView) t.scrollIntoView(); };
  tools.appendChild(pick);
  sec.appendChild(tools);
  if (!list.length) {
    sec.appendChild(el("p", "empty-state", "No spells yet."));
    return sec;
  }
  for (var l = 0; l <= 9; l++) {
    var here = list.filter(function (x) { return (x.s ? x.s.l : 1) === l; });
    if (!here.length) continue;
    sec.appendChild(el("div", "eyebrow", l === 0 ? "Cantrips, at will" : SPELL_ORD[l] + " level"));
    here.forEach(function (x) {
      var tail = castButtons(x.s, st);
      if (st.kind === "book" && x.how === "chosen" && x.s && x.s.l > 0) {
        tail = tail || el("div", "spell-cast");
        var un = el("button", "chip", "Unprepare");
        un.onclick = function (e) { e.preventDefault(); setPrepared(x.name, false, st); };
        tail.appendChild(un);
      }
      sec.appendChild(spellCard(x, st, { tail: tail }));
    });
  }
  // the rest of a Wizard's book: there, but not castable until prepared
  if (st.kind === "book") {
    var idle = (C.spells || []).filter(function (n) {
      var s = spellFind(n, C);
      return !(s && s.l === 0) && (C.prepared || []).indexOf(n) < 0;
    });
    if (idle.length) {
      var tl = spellTally(C, st);
      sec.appendChild(el("div", "eyebrow", "In your spellbook, not prepared"));
      sec.appendChild(el("p", "slot-note", "Prepared " + tl.prepared + " of " + st.prepared +
        ". Only prepared spells can be cast; change them after a long rest."));
      idle.forEach(function (n) {
        var s = spellFind(n, C), tail = el("div", "spell-cast");
        var pb = el("button", "btn", "Prepare");
        pb.disabled = tl.prepared >= st.prepared;
        pb.onclick = function (e) { e.preventDefault(); setPrepared(n, true, st); };
        tail.appendChild(pb);
        var card = spellCard({ name: n, s: s, how: "book" }, st, { tail: tail });
        card.classList.add("unprepared");
        sec.appendChild(card);
      });
    }
  }
  if (SPD.meta) {
    // the licence's own words, kept as written in either language
    var lic = el("p", "page-ref srd-note", esc(SPD.meta.notice));
    lic.setAttribute("data-nolang", "");
    sec.appendChild(lic);
  }
  return sec;
}

/* ---- the Level-ups step's picker -------------------------------------------------- */
var spellQ = "", spellLv = null;
function spellPicker(s) {
  var st = spellStats(C);
  if (!st) return;
  var box = el("div", "spell-picker");
  box.id = "spell-picker";
  box.style.marginBottom = "32px";
  var t = spellTally(C, st);
  var kindWord = st.kind === "prepared" ? "prepared" : st.kind === "book" ? "in your spellbook" : "known";
  function count(n, max) {
    return '<span class="sel-count' + (n === max ? " full" : n > max ? " over" : "") + '">' + n + " / " + max + "</span>";
  }
  box.appendChild(el("div", "eyebrow", "Spells " +
    (st.cantrips ? count(t.cantrips, st.cantrips) + " cantrips " : "") +
    (st.max ? count(t.leveled, t.leveledMax) + " " + esc(kindWord) : "")));
  var how = {
    known: "You know a fixed number of spells and swap one when you gain a level.",
    pact: "You know a fixed number of spells. Pact slots are all the same level and come back on a short rest." +
          (st.arcanum.length ? " Your Mystic Arcanum is one spell of each level shown, cast once a day." : ""),
    prepared: "Your whole class list is open to you. Choose the ones you have ready today; change them after a long rest.",
    book: "Spells go into your spellbook (two free each level), and each day you prepare some of them. Tap Prepare on the ones you want ready."
  }[st.kind];
  var hp = el("p", "slot-note");
  hp.appendChild(el("span", null, esc(how)));
  if (st.max) { hp.appendChild(document.createTextNode(" ")); hp.appendChild(el("span", null, "You can cast up to " + SPELL_ORD[st.max] + "-level spells.")); }
  box.appendChild(hp);
  if (!st.max && !st.cantrips) {
    box.appendChild(el("p", "empty-state", "Spellcasting starts at level 2."));
    s.appendChild(box);
    return;
  }

  // what's chosen
  var chosen = C.spells || [];
  var g = grantedSpells(C);
  if (g.always.length) {
    var al = el("p", "slot-note");
    al.appendChild(el("b", null, "Always prepared from your archetype: "));
    var an = el("span"); an.textContent = g.always.join(", "); an.setAttribute("data-nolang", "");
    al.appendChild(an);
    box.appendChild(al);
  }
  if (chosen.length) {
    var have = el("div", "chips spell-chosen");
    chosen.forEach(function (n) {
      var sp = spellFind(n, C), lvl = sp ? sp.l : null;
      var wrap = el("span", "chip on");
      var nm = el("span"); nm.textContent = (sp ? sp.n : n) + (lvl === 0 ? " (cantrip)" : lvl ? " (" + SPELL_ORD[lvl] + ")" : "");
      nm.setAttribute("data-nolang", "");
      wrap.appendChild(nm);
      if (st.kind === "book" && lvl !== 0) {
        var on = (C.prepared || []).indexOf(n) >= 0;
        var pb = el("button", "chip" + (on ? " on" : ""), on ? "Prepared" : "Prepare");
        pb.setAttribute("aria-pressed", on ? "true" : "false");
        pb.onclick = function () { setPrepared(n, !on, st); };
        wrap.appendChild(pb);
      }
      var x = el("button", "chip warn", "✕");
      x.setAttribute("aria-label", "Remove " + n);
      x.onclick = function () {
        C.spells = chosen.filter(function (m) { return m !== n; });
        C.prepared = (C.prepared || []).filter(function (m) { return m !== n; });
        delete C.isExample; save(); render();
      };
      wrap.appendChild(x);
      have.appendChild(wrap);
    });
    box.appendChild(have);
  }

  // filters
  var fl = el("div", "toolbar spell-filter");
  var inp = el("input");
  inp.type = "search"; inp.className = "search"; inp.id = "spellFilter";
  inp.placeholder = "Filter spells…";
  inp.setAttribute("aria-label", "Filter spells");
  inp.value = spellQ;
  inp.oninput = function () { spellQ = inp.value; restage("spellFilter"); };
  fl.appendChild(inp);
  var levels = [];
  if (st.cantrips) levels.push(0);
  for (var i = 1; i <= st.max; i++) levels.push(i);
  st.arcanum.forEach(function (l) { levels.push(l); });
  [null].concat(levels).forEach(function (l) {
    var b = el("button", "chip" + (spellLv === l ? " on" : ""), l === null ? "All" : l === 0 ? "Cantrips" : SPELL_ORD[l]);
    b.onclick = function () { spellLv = l; render(); };
    fl.appendChild(b);
  });
  box.appendChild(fl);

  var q = spellQ.toLowerCase().trim();
  var opts = spellOptions(C, st).filter(function (sp) {
    if (spellLv !== null && sp.l !== spellLv) return false;
    if (!q) return true;
    var dress = spellDress(sp, C);
    return (sp.n + " " + (dress ? dress.join(" ") : "") + " " + sp.s + " " + JSON.stringify(sp.x)).toLowerCase().indexOf(q) >= 0;
  });
  var listBox = el("div", "spell-options");
  opts.forEach(function (sp) {
    var on = chosen.some(function (n) { return n.toLowerCase() === sp.n.toLowerCase(); });
    var b = el("button", "chip" + (on ? " on" : ""), on ? "✓ Taken" : "Take");
    b.onclick = function (e) {
      e.preventDefault();
      var arr = (C.spells || []).slice();
      var ix = -1;
      arr.forEach(function (n, k) { if (n.toLowerCase() === sp.n.toLowerCase()) ix = k; });
      if (ix >= 0) {
        arr.splice(ix, 1);
        C.prepared = (C.prepared || []).filter(function (m) { return m.toLowerCase() !== sp.n.toLowerCase(); });
      } else {
        var tt = spellTally(C, st);
        if (sp.l === 0 && tt.cantrips >= tt.cantripMax) { toast("You know " + tt.cantripMax + " cantrips; remove one first"); return; }
        if (st.kind === "pact" && sp.l > 5 && tt.arcanum[sp.l]) { toast("One Mystic Arcanum of each level"); return; }
        if (sp.l > 0 && !(st.kind === "pact" && sp.l > 5) && st.kind !== "book" && tt.leveled >= tt.leveledMax) {
          toast("That's your " + tt.leveledMax + "; remove one first"); return;
        }
        if (arr.length >= MAX_SPELLS) { toast("That's a lot of spells"); return; }
        arr.push(sp.n);
        // a Wizard's new spell is ready to cast while there's room to prepare it
        if (st.kind === "book" && sp.l > 0 && tt.prepared < st.prepared)
          C.prepared = (C.prepared || []).concat([sp.n]);
      }
      C.spells = arr; delete C.isExample; save(); render();
    };
    listBox.appendChild(spellCard({ name: sp.n, s: sp }, st, { tail: (function () {
      var r = el("div", "spell-cast"); r.appendChild(b); return r;
    })() }));
  });
  if (!opts.length) listBox.appendChild(el("div", "no-results", "No spell matches that."));
  box.appendChild(listBox);

  // anything not in the free rules
  var own = el("div", "inv-add");
  own.appendChild(el("span", "k", "A spell from your book"));
  var oi = el("input"); oi.placeholder = "Spell name"; oi.maxLength = 60; oi.setAttribute("aria-label", "Spell name");
  var ob = el("button", "btn", "Add");
  ob.onclick = function () {
    var n = oi.value.trim().slice(0, 60);
    if (!n) { oi.focus(); return; }
    var found = spellFind(n, C);
    var arr = (C.spells || []).slice();
    var name = found ? found.n : n;
    if (arr.some(function (m) { return m.toLowerCase() === name.toLowerCase(); })) { toast("Already on your sheet"); return; }
    arr.push(name);
    C.spells = arr.slice(0, MAX_SPELLS); delete C.isExample; save(); render();
    toast(found ? found.n + " added" : "Added as written");
  };
  own.appendChild(oi); own.appendChild(ob);
  box.appendChild(own);
  box.appendChild(el("p", "page-ref", esc(SPD.meta ? SPD.meta.note : "")));
  s.appendChild(box);
}

/* ---- Markdown and print ------------------------------------------------------------ */
function spellMarkdown() {
  var st = spellStats(C);
  if (!st) return [];
  var L = ["## Spells", "",
    "- **Spell save DC** " + st.dc + ", **spell attack** " + sgn(st.atk) + " (" + ABIL_FULL[st.abil] + ")"];
  if (st.pact) L.push("- **Pact slots** " + st.pact.n + " at " + SPELL_ORD[st.pact.level] + " level");
  else if (st.slots.length) L.push("- **Slots** " + st.slots.map(function (n, i) { return SPELL_ORD[i + 1] + " " + n; }).join(", "));
  var list = castable(C);
  for (var l = 0; l <= 9; l++) {
    var here = list.filter(function (x) { return (x.s ? x.s.l : 1) === l; });
    if (!here.length) continue;
    L.push("- **" + (l === 0 ? "Cantrips" : SPELL_ORD[l]) + "** " + here.map(function (x) {
      return (x.s ? x.s.n : x.name) + (x.how === "always" ? "*" : "");
    }).join(", "));
  }
  L.push("");
  return L;
}
