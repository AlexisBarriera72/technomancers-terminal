/* app/rules.js: The numbers: save/load and migrate, derived stats, Humanity and Essence,
   feature rendering, level-driven class picks and the action classifier. */
"use strict";

/* -------------------------------------------------------------- derived */
/* Standard array and rolled scores are both assigned through the same
   dropdown, which writes C.arrayMap. This used to read arrayMap only for the
   standard array, so every rolled score was decorative: the sheet kept the
   8s underneath and the step still passed as complete. */
function assignsFromMap() { return C.method === "array" || C.method === "roll"; }
function baseScores() {
  if (assignsFromMap()) {
    var s = { Str: 8, Dex: 8, Con: 8, Int: 8, Wis: 8, Cha: 8 };
    ABIL.forEach(function (a) { if (C.arrayMap[a]) s[a] = C.arrayMap[a]; });
    return s;
  }
  return C.scores;
}
function abilitiesDone() {
  if (!assignsFromMap()) return ABIL.every(function (a) { return C.scores[a] >= 1; });
  return ABIL.every(function (a) { return !!C.arrayMap[a]; });
}

/* Levelling actually changes the sheet: ASI slots and the class features that
   hand out flat ability increases both land here. */
/* Most classes improve at 4/8/12/16/19. Fighter and Rogue get extra ones in
   standard 5e, and the book uses the stock chassis for its thirteen classes,
   so they need their own rows. The eight Neon Ledger classes print
   4/8/12/16/19 in their own progression tables, so they take the default. */
/* Seventeen feats raise an ability score, but that only exists as English in
   the feat's prose, so nothing applied it. Structured here instead: `abil`
   for the nine that name one ability, `choose` for the eight that offer a
   pick. Kept next to the other data tables so adding a feat is a data edit. */
var FEAT_EFFECTS = {
  "Icebreaker's Instinct":  { abil: "Int" },
  "Drone Whisperer":        { abil: "Int" },
  "Street Legend":          { abil: "Cha" },
  "Fast Draw":              { abil: "Dex" },
  "Rated for Trauma":       { abil: "Con" },
  "Chem Tolerance":         { abil: "Con" },
  "Wall Runner":            { abil: "Dex" },
  "Grafted":                { abil: "Con" },
  "Black Market Contacts":  { abil: "Cha" },
  "Paramedic":              { choose: ["Con", "Int", "Wis"] },
  "Prime Hacker":           { choose: ["Int", "Wis", "Cha"] },
  "Clean Baseline":         { choose: ["Cha", "Wis"] },
  "Neural Firewall":        { choose: ["Int", "Wis"] },
  "Corporate Ghost":        { choose: ["Int", "Cha"] },
  "Crowd Sense":            { choose: ["Cha", "Wis"] },
  "Smartlinked":            { choose: ["Dex", "Int"] },
  "Overclocked Metabolism": { choose: ["Con", "Dex"] }
};
function featBump(slot) {
  if (!slot || slot.type !== "feat" || !slot.name) return null;
  var fx = FEAT_EFFECTS[slot.name];
  if (!fx) return null;
  if (fx.abil) return fx.abil;
  if (fx.choose) return fx.choose.indexOf(slot.abil) >= 0 ? slot.abil : null;
  return null;
}

var ASI_LEVELS = [4, 8, 12, 16, 19];
var ASI_BY_CLASS = {
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue:   [4, 8, 10, 12, 16, 19]
};
function asiLevelsFor(clsName) { return ASI_BY_CLASS[clsName] || ASI_LEVELS; }
function myAsiLevels() { return asiLevelsFor(C.cls); }
function asiSlotCount() {
  return myAsiLevels().filter(function (l) { return C.level >= l; }).length;
}
function asiSlots() {
  var n = asiSlotCount(), out = (C.asi || []).slice(0, n);
  while (out.length < n) out.push({ type: null });
  return out;
}
function classBumps() {
  var cl = classByName[C.cls], out = [], cap = {};
  if (!cl) return { list: out, cap: cap };
  if (cl.name === "Chromehound" && C.level >= 20) {
    out.push({ Str: 4, Dex: 4, why: "Apex Predator" }); cap.Str = 24; cap.Dex = 24;
  }
  if (cl.name === "Bioforged" && C.level >= 18) {
    out.push({ Con: 4, why: "Apex Biology" }); cap.Con = 24;
  }
  if (cl.name === "Stackborn" && C.sleeve) {
    var m = { Combat: null, Endurance: { Con: 2 }, Infiltration: { Dex: 2 },
              Diplomatic: { Cha: 2 }, Labour: { Str: 2 }, Synthetic: null };
    var b = m[C.sleeve];
    if (C.sleeve === "Combat") b = { Dex: 2 };
    if (b) { b = Object.assign({}, b, { why: C.sleeve + " sleeve" }); out.push(b);
             Object.keys(b).forEach(function (k) { if (k !== "why") cap[k] = 22; }); }
  }
  return { list: out, cap: cap };
}
function scores() {
  var s = Object.assign({}, baseScores());
  var bumps = classBumps();
  asiSlots().forEach(function (sl) {
    if (sl.type === "feat") {
      var fa = featBump(sl);
      if (fa && s[fa] != null) s[fa] = Math.min(20, s[fa] + 1);
      return;
    }
    if (sl.type !== "asi") return;
    [sl.a, sl.b].forEach(function (a) {
      if (a && s[a] != null) s[a] = Math.min(20, s[a] + 1);
    });
  });
  bumps.list.forEach(function (b) {
    Object.keys(b).forEach(function (k) {
      if (k === "why" || s[k] == null) return;
      s[k] = Math.min(bumps.cap[k] || 20, s[k] + b[k]);
    });
  });
  return s;
}
function takenFeats() {
  return asiSlots().filter(function (s) { return s.type === "feat" && s.name; })
    .map(function (s) { return s.name; });
}
function pbSpent() {
  var t = 0;
  ABIL.forEach(function (a) { t += PB_COST[C.scores[a]] || 0; });
  return t;
}
function bgObj() {
  if (!C.bg) return null;
  for (var i = 0; i < D.backgrounds.length; i++)
    if (D.backgrounds[i].id === C.bg) return D.backgrounds[i];
  return null;
}
/* Backgrounds state their skills three ways: a fixed pair, "X, plus one from
   among A, B and C", or "Choose two from among …". Parse all three. */
function splitSkills(s) {
  return s.split(/,\s*|\s+or\s+|\s+and\s+/i)
    .map(function (x) { return x.trim().replace(/\.$/, ""); })
    .filter(function (x) { return D.skills[x]; });
}
var NUMW = { one: 1, two: 2, three: 3 };
function skillGrant() {
  var b = bgObj();
  var out = { fixed: [], n: 0, from: [] };
  if (!b || !b.traits["Skill Proficiencies"]) return out;
  var txt = b.traits["Skill Proficiencies"].trim().replace(/\.$/, "");
  var m = txt.match(/^choose\s+(one|two|three)\s+from\s+among\s+(.+)$/i);
  if (m) { out.n = NUMW[m[1].toLowerCase()] || 1; out.from = splitSkills(m[2]); return out; }
  m = txt.match(/^(.*?),\s*plus\s+(one|two)\s+from\s+among\s+(.+)$/i);
  if (m) {
    out.fixed = splitSkills(m[1]);
    out.n = NUMW[m[2].toLowerCase()] || 1;
    out.from = splitSkills(m[3]);
    return out;
  }
  out.fixed = splitSkills(txt);
  return out;
}
function bgSkills() {
  var g = skillGrant();
  var picked = (C.bgPicks || []).filter(function (s) { return g.from.indexOf(s) >= 0; });
  return g.fixed.concat(picked.slice(0, g.n));
}
function syncFeats() { C.feats = takenFeats(); }
function allSkills() {
  var set = {};
  bgSkills().concat(C.skills).forEach(function (s) { set[s] = 1; });
  // Classes whose scaling picks ARE skills, the Stackborn's imprints are
  // proficiencies granted by Muscle Memory, and used to be cosmetic.
  var spec = SCALING[C.cls];
  if (spec && spec.skills && C.picks && Array.isArray(C.picks[spec.key])) {
    C.picks[spec.key].forEach(function (sk) { if (D.skills[sk]) set[sk] = 1; });
  }
  if (C.techSwap) {
    // The book: Technology "replaces one of their other skill proficiencies".
    if (C.techReplaces && set[C.techReplaces]) delete set[C.techReplaces];
    set["Technology"] = 1;
  }
  return Object.keys(set);
}
function maxHP() {
  var cl = classByName[C.cls];
  if (!cl) return null;
  var d = dieSize(cl.hit), con = mod(scores().Con);
  return d + con + (C.level - 1) * (Math.floor(d / 2) + 1 + con);
}
function spend() {
  var t = 0;
  C.cyber.forEach(function (x) { t += chromePrice(x); });
  C.augments.forEach(function (n) { t += augPrice(n); });
  C.gear.forEach(function (g) { t += gearPrice(g) * (g.qty > 0 ? g.qty : 1); });
  return t;
}
function mySub() {
  var list = subsFor(C.cls);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  return subById[C.sub] && subById[C.sub].cls === C.cls ? subById[C.sub] : null;
}

/* ---- borrowing another character ---------------------------------------
   Every derived function above reads the module-global C. The GM screen needs
   them for four characters at once, so we lend C out briefly and put it back.
   SAFE for value-returning calls and DOM builders that attach no handlers.
   NEVER for the step renderers or the dossier: their onclick handlers fire
   long after the swap unwinds and would edit whoever C is by then.        */
var swapDepth = 0;
function withChar(c, fn) {
  var prev = C;
  C = c; swapDepth++;
  try { return fn(c); } finally { C = prev; swapDepth--; }
}
/* One swap per character per render, harvest everything, then work on the
   plain object it returns. GM code should never touch C itself. */
function statsOf(c) {
  return withChar(c, function () {
    var cl = classByName[c.cls];
    return { c: c, cls: cl, level: c.level, sc: scores(), pb: profBonus(c.level),
             saves: cl ? cl.saves : [], prof: allSkills(), ac: armorClass(),
             hp: maxHP(), hum: humanity(), ess: essence(), sub: mySub() };
  });
}

/* ---- the numbers, in one place each --------------------------------------
   These were copied inline at three or four render sites apiece and had
   drifted apart. `d` is a statsOf snapshot; it defaults to the current
   character so the forge and print sheets stay one-liners.                */
function saveBonus(a, d) {
  d = d || statsOf(C);
  return mod(d.sc[a]) + (d.saves.indexOf(a) >= 0 ? d.pb : 0);
}
function skillBonus(sk, d) {
  d = d || statsOf(C);
  var ab = D.skills[sk];
  if (!ab) return 0;
  return mod(d.sc[ab]) + (d.prof.indexOf(sk) >= 0 ? d.pb : 0);
}
function passiveSkill(sk, d) { return 10 + skillBonus(sk, d); }
function initiative(d) {
  d = d || statsOf(C);
  // Combat Awareness and Stage Presence are both level 1, so they apply to
  // every Chromehound and every Firebrand there is.
  var n = d.cls && d.cls.name;
  return mod(d.sc.Dex) +
    (n === "Chromehound" ? mod(d.sc.Con) : n === "Firebrand" ? mod(d.sc.Cha) : 0);
}
function initiativeNote(d) {
  d = d || statsOf(C);
  return d.cls && d.cls.name === "Chromehound" && d.level >= 20 ?
    "Apex Predator: advantage" : "";
}
function saveDC(d) {
  d = d || statsOf(C);
  var spec = CLASS_DC[d.cls ? d.cls.name : ""];
  if (!spec) return null;
  return { abil: spec[0], label: spec[1], dc: 8 + d.pb + mod(d.sc[spec[0]]) };
}
/* The class tables state weapon proficiency as prose, either an explicit
   list ("Dart gun, hunting rifle, machine pistol…") or the catch-all "Simple
   or martial firearms per your weapon proficiencies". Nothing parsed it, so
   every character added their proficiency bonus to every weapon they owned:
   a Wizard with a sniper rifle got the same attack bonus as a Chromehound. */
function weaponProficient(cl, gun, name) {
  if (!cl) return false;
  var text = String((gun ? cl.firearms : cl.weapons) || "");
  if (!text) return false;
  if (/\bper your weapon proficiencies\b/i.test(text)) return true;
  if (/^\s*(all|any)\b/i.test(text)) return true;
  var lname = String(name || "").toLowerCase().trim();
  return text.toLowerCase().split(/,|\band\b/).map(function (x) {
    return x.trim().replace(/[.]$/, "");
  }).some(function (entry) {
    if (!entry) return false;
    // "Daggers" must match "Dagger"; "Pistol" must NOT match "Machine Pistol".
    var e = entry.replace(/s$/, "");
    return lname === entry || lname === e || lname.replace(/s$/, "") === e;
  });
}
function attackBonus(g, d) {
  d = d || statsOf(C);
  var gun = g.key.indexOf("Firearm List|") === 0;
  var t = tableByTitle[gun ? "Firearm List" : "Melee Weapons"];
  var row = t ? t.rows.filter(function (r) { return r[0] === g.name; })[0] : null;
  var props = row ? row[row.length - 1] : "";
  // Finesse melee lets you swap Strength for Dexterity.
  var abil = gun ? "Dex" :
    (/finesse/i.test(props) && mod(d.sc.Dex) > mod(d.sc.Str)) ? "Dex" : "Str";
  var prof = weaponProficient(d.cls, gun, g.name);
  return { name: g.name, abil: abil, proficient: prof,
           bonus: mod(d.sc[abil]) + (prof ? d.pb : 0),
           damage: row ? row[2] : "-", props: props };
}

/* Progression tables are indexed by level, so the level must be a whole
   number in range before it touches one. Three sites used to clamp this
   three different ways and none survived a fractional level. */
function lvlRow(cl, lv) {
  if (!cl || !cl.progression || !cl.progression.rows) return null;
  var n = Math.max(1, Math.min(20, Math.round(Number(lv) || 1)));
  return cl.progression.rows[n - 1] || null;
}

/* ---------------------------------------------------- Humanity & Essence */
var TIER_COST = { "1": 2, "2": 5, "3": 9, "4": 14 };
function humanity() {
  var cl = classByName[C.cls], sc = scores();
  var base = sc.Cha * 5;
  var tol = 0, notes = [];
  if (cl && cl.name === "Chromehound") {
    var row = lvlRow(cl, C.level);
    tol += row ? (parseInt(row[row.length - 1], 10) || 0) : 0;
    notes.push("Chrome Tolerance +" + tol);
    if (C.level >= 20) { tol += 40; notes.push("Apex Predator +40"); }
  }
  var junkie = takenFeats().indexOf("Chrome Junkie") >= 0;
  if (junkie) { tol += 15; notes.push("Chrome Junkie +15"); }
  var spent = 0;
  C.cyber.forEach(function (x) {
    var c = TIER_COST[x.tier] || 0;
    if (junkie) c = Math.max(1, c - 1);
    spent += c;
  });
  C.augments.forEach(function () { spent += junkie ? 1 : 1; });
  // Tolerance is spent LAST: it delays cyberpsychosis, it does not stop the drift.
  var left = Math.max(0, base - spent);
  var overflow = Math.max(0, spent - base);
  var tolLeft = Math.max(0, tol - overflow);
  var pct = base > 0 ? Math.max(0, Math.round((left / base) * 100)) : 0;
  var state = pct >= 60 ? "Baseline" : pct >= 40 ? "Dissociated" :
              pct >= 20 ? "Fraying" : pct >= 1 ? "Flatlining" : "Cyberpsychosis";
  var onBuffer = false;
  if (pct === 0 && tolLeft > 0) { state = "Flatlining"; onBuffer = true; }
  return { base: base, tol: tol, tolLeft: tolLeft, spent: spent, left: left, pct: pct,
           state: state, notes: notes, onBuffer: onBuffer,
           implants: C.cyber.length + C.augments.length };
}
var HSTATE = {
  "Baseline": ["signal", "No effect. You still flinch at the right things."],
  "Dissociated": ["gold", "Disadvantage on Persuasion against anyone who can see your chrome, and on Insight to read emotion."],
  "Fraying": ["gold", "DC 12 Wisdom save on a critical hit or at 0 HP, or attack the nearest creature."],
  "Flatlining": ["alert", "Disadvantage on Wisdom saves. Long rests restore half your Hit Dice. You no longer dream."],
  "Cyberpsychosis": ["alert", "The character is lost, an NPC now. Only therapy and removing ware can bring them back."]
};
function essence() {
  var cl = classByName[C.cls];
  if (!cl || cl.name !== "Bioforged") return null;
  var row = lvlRow(cl, C.level);
  if (!row) return null;
  var e = parseInt(row[row.length - 1], 10);
  var st = e >= 15 ? "Baseline" : e >= 11 ? "Divergent" : e >= 6 ? "Unclassified" :
           e >= 1 ? "Post-Human" : "Speciated";
  return { value: e, state: st };
}

/* ------------------------------------------------- feature rendering bits */
function leadify(text) {
  // The book opens many entries with a bolded run-in term: "Belt Feed. If this…"
  //
  // Translated before the run-in is wrapped, not after. The wrap cuts the
  // paragraph into two text nodes, and "Belt Feed." on its own is not a
  // translatable unit, doing it here means the key is the book's sentence
  // exactly as data.js holds it.
  return esc(T(text)).replace(/^([A-ZÁÉÍÓÚÑ][A-Za-z0-9à-ÿ'’\- ]{1,44}\.)(\s)/,
    '<span class="lead">$1</span>$2');
}
function renderTable(t) {
  var w = el("div", "tbl-wrap" + (t.headers && t.headers.length > 3 ? " wide" : ""));
  var tb = el("table");
  if (t.title) tb.appendChild(el("caption", null, esc(T(t.title))));
  if (t.headers && t.headers.some(function (h) { return h; })) {
    var tr = el("tr");
    t.headers.forEach(function (h) { tr.appendChild(el("th", null, esc(T(h)))); });
    var th = el("thead"); th.appendChild(tr); tb.appendChild(th);
  }
  var body = el("tbody");
  t.rows.forEach(function (r) {
    var filled = r.filter(function (c) { return c !== ""; }).length;
    var tr = el("tr", filled === 1 ? "group" : null);
    r.forEach(function (c, i) {
      var td = el("td", null, esc(T(c)));
      if (filled === 1 && i === 0) td.colSpan = r.length;
      if (filled === 1 && i > 0) return;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
  tb.appendChild(body);
  w.appendChild(tb);
  return w;
}
function renderBlocks(blocks, host) {
  (blocks || []).forEach(function (b) {
    if (b.type === "p") host.appendChild(el("p", null, leadify(b.text)));
    else if (b.type === "ul") {
      var ul = el("ul");
      b.items.forEach(function (i) { ul.appendChild(el("li", null, leadify(i))); });
      host.appendChild(ul);
    } else if (b.type === "table") host.appendChild(renderTable(b));
  });
}
function spellListHTML(groups) {
  var wrap = el("div", "cols2");
  groups.forEach(function (g) {
    var d = el("div");
    d.appendChild(el("div", "sub", '<span class="chip lvl">' + esc(g.level) + "</span>"));
    var ul = el("ul");
    g.spells.forEach(function (s) { ul.appendChild(el("li", null, esc(s))); });
    d.appendChild(ul);
    wrap.appendChild(d);
  });
  return wrap;
}

/* group the book's sub-headed options (Hellion / Valkyrie / Titan …) */
function groupFeatures(sub) {
  var out = [];
  sub.features.forEach(function (f) {
    if (f.sub && out.length && !/spell list/i.test(out[out.length - 1].name)) {
      out[out.length - 1].subs.push(f);
    } else out.push({ name: f.name, level: f.level, blocks: f.blocks,
                      spellList: f.spellList, subs: [] });
  });
  return out;
}
var CHOOSE = /choose\s+(one|two|three|a|1|2|3)\b[^.]{0,40}(following|from)/i;
function choiceCount(f) {
  var txt = (f.blocks || []).map(function (b) { return b.text || (b.items || []).join(" "); }).join(" ");
  var m = txt.match(CHOOSE);
  if (!m) return 0;
  var w = m[1].toLowerCase();
  return { one: 1, a: 1, "1": 1, two: 2, "2": 2, three: 3, "3": 3 }[w] || 1;
}

function humanityMeter(compact) {
  var h = humanity();
  var tone = HSTATE[h.state][0];
  var box = el("div", "meter");
  var head = el("div", "meter-head");
  head.innerHTML = "<span>Humanity</span><b class='tone-" + tone + "'>" +
    h.pct + "% · " + esc(h.state) + "</b>";
  box.appendChild(head);
  var bar = el("div", "meter-bar");
  var fill = el("div", "meter-fill bg-" + tone);
  fill.style.width = h.pct + "%";
  bar.appendChild(fill);
  box.appendChild(bar);
  if (!compact) {
    box.appendChild(el("div", "meter-note", esc(HSTATE[h.state][1])));
    if (h.onBuffer) box.appendChild(el("div", "meter-note tone-alert",
      "Running on " + h.tolLeft + " points of tolerance alone. When that is gone, so are you."));
    var sums = ["Base " + h.base + " (Cha × 5)"];
    sums.push(h.implants + " implant" + (h.implants === 1 ? "" : "s") + " · −" + h.spent);
    sums.push("Humanity " + h.left + " / " + h.base);
    if (h.tol) sums.push("buffer " + h.tolLeft + " / " + h.tol + " (" + h.notes.join(", ") + ")");
    box.appendChild(el("div", "meter-note meter-sum", sums.map(esc).join("  ·  ")));
  }
  return box;
}

function essenceMeter() {
  var e = essence();
  if (!e) return null;
  var pct = Math.round((e.value / 20) * 100);
  var tone = e.value >= 15 ? "signal" : e.value >= 6 ? "gold" : "alert";
  var box = el("div", "meter");
  box.style.marginTop = "10px";
  var head = el("div", "meter-head");
  head.innerHTML = "<span>Essence</span><b class='tone-" + tone + "'>" +
    e.value + " · " + esc(e.state) + "</b>";
  box.appendChild(head);
  var bar = el("div", "meter-bar");
  var fill = el("div", "meter-fill bg-" + tone);
  fill.style.width = pct + "%";
  bar.appendChild(fill);
  box.appendChild(bar);
  box.appendChild(el("div", "meter-note",
    "Grown grafts cost Essence, not Humanity: nothing about you reads as artificial."));
  return box;
}

/* -------------------------------------------- level-driven class choices */
var SCALING = {
  Wirewalker: { key: "programs", col: "Programs Known", label: "Programs",
                table: "Program List", nameCol: 1, tierCol: 0, descCol: 2,
                tierLimitCol: "Max Tier",
                note: "Running a program costs Bandwidth equal to twice its tier." },
  Bioforged:  { key: "grafts", col: "Grafts", label: "Grafts",
                table: "Graft List", nameCol: 0, descCol: 1,
                note: "Grafts are always active and cost Essence, not Humanity." },
  Stackborn:  { key: "imprints", col: "Imprints", label: "Imprints",
                skills: true,
                note: "Each imprint is a skill carried over from a life that was not yours." }
};
function classRow() {
  var cl = classByName[C.cls];
  if (!cl || !cl.progression) return null;
  return lvlRow(cl, C.level);
}
function colValue(name) {
  var cl = classByName[C.cls], row = classRow();
  if (!cl || !row) return null;
  var i = cl.progression.headers.indexOf(name);
  return i < 0 ? null : row[i];
}
function findTable(title) {
  var cl = classByName[C.cls];
  if (!cl) return null;
  var found = null;
  cl.features.forEach(function (f) {
    (f.blocks || []).forEach(function (b) {
      if (b.type === "table" && b.title === title) found = b;
    });
  });
  return found;
}
function scalingSpec() {
  var sp = SCALING[C.cls];
  if (!sp) return null;
  var allowed = parseInt(colValue(sp.col), 10) || 0;
  var opts;
  if (sp.skills) {
    opts = Object.keys(D.skills).map(function (k) { return { name: k, desc: D.skills[k] + " skill" }; });
  } else {
    var t = findTable(sp.table);
    if (!t) return null;
    opts = t.rows.map(function (r) {
      return { name: r[sp.nameCol], tier: sp.tierCol != null ? r[sp.tierCol] : null,
               desc: r[sp.descCol] };
    });
  }
  var maxTier = sp.tierLimitCol ? parseInt(colValue(sp.tierLimitCol), 10) : null;
  return { spec: sp, allowed: allowed, options: opts, maxTier: maxTier };
}

/* --------------------------------------------- what a feature lets you do */
function blockText(f) {
  return (f.blocks || []).map(function (b) {
    return b.text || (b.items || []).join(" ") || "";
  }).join(" ");
}
/* What a feature costs to use.
 *
 * This used to scan the whole feature as one string, first match wins, with
 * Bonus action ranked first, and its bonus-action pattern included a bare
 * "bonus action", which matches "firearms which require a bonus action to
 * reload". That is a description of a weapon property, not an ability the
 * feature grants, so Demolitions Expert was filed under Bonus actions with a
 * reaction printed underneath it. Sixty-six features mention more than one
 * action type; four contradicted their own excerpt outright.
 *
 * Two changes: only grant constructions count, and each SENTENCE is judged on
 * its own so the heading always belongs to the text shown beneath it. A
 * feature that really does offer two things now appears under both.
 */
var ACT_RULES = [
  // "use the bonus action granted by your Cunning Action" spends one too.
  ["Bonus action", /\bas a bonus action\b|\buse (?:a|the) bonus action\b/i],
  ["Reaction",     /\bas a reaction\b|\buse your reaction\b|\busing your reaction\b/i],
  ["Action",       /\bas an action\b|\btake an action\b/i],
  ["Attack",       /\byou can attack (?:twice|three times)\b/i]
];
function sentencesOf(t) {
  // No lookbehind: Safari only gained it in 16.4 and a syntax error here
  // would take the whole application down on an older iPad.
  //
  // A full stop between two digits is a decimal point or a thousands
  // separator, not the end of a sentence. English writes 5,000₵ and never
  // hit this; Spanish writes 5.000₵ and hits it constantly, which cut the
  // action cards' sentences in half mid-number.
  var s = String(t || "").replace(/(\d)\.(\d)/g, "$1\u0001$2");
  return (s.match(/[^.!?]+[.!?]*\s*/g) || [])
    .filter(function (x) { return x.trim(); })
    .map(function (x) { return x.replace(/\u0001/g, "."); });
}
function classifySentence(sent) {
  for (var i = 0; i < ACT_RULES.length; i++) {
    if (ACT_RULES[i][1].test(sent)) return ACT_RULES[i][0];
  }
  return null;
}
/* "At 3rd level, you can..." reads badly on a card that already says which
   level unlocked it, so the lead comes off. Both languages get a list of
   their own openers rather than one loose pattern, because a permissive one
   would eat "un conjuro de nivel 5 o inferior" out of the middle of a
   sentence that never had a lead at all. */
var LEAD_EN = /^(?:At|By|After|Starting at|Beginning at|When you reach|When you choose[^,]*at|Upon reaching)\s+\d+(?:st|nd|rd|th)\s+level,?\s*/i;
var LEAD_ES = /^(?:En el nivel|A partir del nivel|Empezando en el nivel|Al llegar al nivel|Al alcanzar el nivel|Para el nivel|Cuando eliges est[eao] [a-záéíóúñ]+ en el nivel|A partir del momento en que[^,]*nivel)\s*\d+\s*,?\s*/i;
function tidy(sent) {
  var s = String(sent || "");
  var t = s.replace(LEAD_EN, "").replace(LEAD_ES, "");
  if (t !== s) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.replace(/^(?:you|your)\b/, function (m) { return m.charAt(0).toUpperCase() + m.slice(1); });
}
/* Sentence-level English to Spanish, for the cards that quote one sentence
   out of a feature.
   The book is keyed by whole blocks, so a sentence sliced out of a block is
   never a key and T() would hand it straight back in English. Translating
   the block and splitting both sides pairs them up. A block whose two
   languages did not split into the same number of sentences contributes
   nothing, and its sentences stay English, the wrong sentence in Spanish
   would be a worse answer than the right one in English. */
function sentenceEs(f) {
  var map = {};
  if (LANG !== "es") return map;
  (f.blocks || []).forEach(function (b) {
    // A list is stored, and translated, one item at a time. Joining the
    // items first would build a string the book has no key for.
    (b.text ? [b.text] : (b.items || [])).forEach(function (en) {
      if (!en) return;
      var es = T(en);
      if (es === en) return;
      var a = sentencesOf(en), c = sentencesOf(es);
      if (a.length !== c.length) return;
      a.forEach(function (s, i) { map[s.trim()] = c[i].trim(); });
    });
  });
  return map;
}
/* One entry per distinct action type, each carrying the sentence that
   granted it. Never empty: a feature that grants nothing is Passive.
   Classification always reads the English: the rules that decide what a
   feature costs are regexes over its own prose, and they must not be handed
   a translation. Only the sentence shown on the card is swapped. */
function actionEntries(f) {
  var seen = {}, out = [], es = sentenceEs(f);
  sentencesOf(blockText(f)).forEach(function (sent) {
    var k = classifySentence(sent);
    if (!k || seen[k]) return;
    seen[k] = 1;
    out.push({ type: k, gist: tidy(es[sent.trim()] || sent) });
  });
  if (!out.length) out.push({ type: "Passive", gist: gistOf(f) });
  return out;
}
function actionType(t) {
  // Kept for callers that only have the text, not the feature.
  var hit = null;
  sentencesOf(t).some(function (sent) { return !!(hit = classifySentence(sent)); });
  return hit || "Passive";
}
function usageOf(t) {
  var m = t.match(/a number of times equal to your ([A-Za-z ]+?) (?:modifier|bonus)[^.]*?per (long|short) rest/i);
  if (m) return m[1].replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + " / " + m[2] + " rest";
  if (/once per (?:long )?rest|once per long rest/i.test(t)) return "1 / long rest";
  if (/once per short rest/i.test(t)) return "1 / short rest";
  if (/once per turn/i.test(t)) return "1 / turn";
  if (/once per creature per long rest/i.test(t)) return "1 / creature / long rest";
  return null;
}
function gistOf(f) {
  var t = blockText(f).replace(/^\s+/, "");
  // Only the opening sentence is shown, so the first block that carries any
  // prose is enough to translate, and it is a whole string the book has a
  // key for. It is not always blocks[0]: a feature that opens with a table
  // contributes an empty string there.
  if (LANG === "es") {
    var en = "";
    (f.blocks || []).some(function (b) {
      en = b.text || (b.items || [])[0] || "";
      return !!en;
    });
    var es = en ? T(en) : en;
    if (es && es !== en) t = es;
  }
  t = tidy(t);
  var end = t.search(/[.!?](?:\s|$)/);
  return end > 0 ? t.slice(0, end + 1) : t.slice(0, 180);
}
