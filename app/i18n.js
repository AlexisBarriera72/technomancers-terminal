/* app/i18n.js: Spanish, the render-time overlay (T, applyLang, setLang) and the lazy
   loader for es-book.js. */
"use strict";

/* ------------------------------------------------------------------ i18n */
/* Spanish is a display layer over a finished English DOM, and nothing else.
 *
 * It has to be. This application infers mechanics from English prose:
 * ACT_RULES reads a feature's own text to decide what it costs to use,
 * parseACBonus reads the armour table, weaponProficient reads a class's
 * weapon line. Characters then store class, archetype, skill and feat NAMES
 * as the very strings those lookups are keyed on. Translating the data in
 * place would not merely risk a mistranslated rule, it would mislabel the
 * action economy, drop armour bonuses, and fail every saved character at the
 * next validate.
 *
 * So nothing here touches window.TTB, TTBX or TTSRD. render() builds the page
 * in English exactly as it always did, and applyLang() then rewrites the text
 * nodes it produced. The table is keyed by the English text itself, so a miss
 * simply leaves English on screen, which is the direction we want to fail in.
 * Change an English source string and it stops matching and reverts to
 * English, rather than showing a translation of something it no longer says.
 *
 * The original English is kept per node, so switching back is exact and
 * re-running is idempotent (we always translate from the original, never from
 * a previous translation).
 */
var LANG_KEY = "ttb.lang";
var LANG = "en";
var ES = {};
var esBook = "idle";          // idle | loading | ready | failed
var ORIG_TEXT = new WeakMap();
var ORIG_ATTR = new WeakMap();
var I18N_ATTRS = ["title", "aria-label", "placeholder", "alt"];

var ES_PAT = [];
function esRebuild() {
  ES = {};
  ES_PAT = [];
  var src = window.TTES;
  if (!src) return;
  [src.ui, src.book].forEach(function (d) {
    if (d) Object.keys(d).forEach(function (k) { ES[k] = d[k]; });
  });
  /* Patterns exist for strings the application generates from the data, where
     enumerating them would mean re-listing every gear item and going stale the
     moment one is added. {*} matches a run and is passed through untranslated,
     which is what we want: the thing being named is a proper noun. */
  (src.patterns || []).forEach(function (pair) {
    var parts = String(pair[0]).split("{*}");
    if (parts.length < 2) return;
    var rx = parts.map(function (x) {
      return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("([\\s\\S]+?)");
    ES_PAT.push({ re: new RegExp("^" + rx + "$"), out: String(pair[1]) });
  });
}
function esHasBook() {
  return !!(window.TTES && window.TTES.book &&
            Object.keys(window.TTES.book).length);
}

/* Runs of digits become {0}, {1}… so one entry covers "Step 01" through
   "Step 06", and so a translator can move a number where Spanish wants it. */
function numKey(str) {
  var nums = [];
  var key = str.replace(/\d+/g, function (m) {
    nums.push(m);
    return "{" + (nums.length - 1) + "}";
  });
  return { key: key, nums: nums };
}
function T(str) {
  if (LANG !== "es" || str == null) return str;
  var s = String(str);
  if (ES[s]) return ES[s];
  if (!/\d/.test(s)) return byPattern(s);
  var n = numKey(s);
  var hit = ES[n.key];
  if (hit) {
    return hit.replace(/\{(\d+)\}/g, function (m, i) {
      return n.nums[+i] == null ? m : n.nums[+i];
    });
  }
  return byPattern(s);
}
/* The captured run is put back through T() rather than passed through raw.
   A proper noun misses the table and survives unchanged, which is what we
   want for "Add Sniper Rifle"; a word we do translate, a skill inside
   "Say: “Roll Stealth.”", a step name inside "Go to Abilities", comes back
   in Spanish instead of leaving half the sentence behind. */
function byPattern(s) {
  for (var i = 0; i < ES_PAT.length; i++) {
    var m = ES_PAT[i].re.exec(s);
    if (!m) continue;
    var k = 1;
    return ES_PAT[i].out.replace(/\{\*\}/g, function () {
      var v = m[k++];
      return v == null ? "" : T(v);
    });
  }
  return s;
}

/* Keep surrounding whitespace: markup is indented in index.html and the
   spacing between inline chips is load-bearing. */
function translateRun(raw) {
  var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
  if (!m || !m[2]) return raw;
  var out = T(m[2]);
  return out === m[2] ? raw : m[1] + out + m[3];
}

function applyLang(root) {
  root = root || document.body;
  if (!root || !document.createTreeWalker) return;
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  var texts = [], n;
  while ((n = w.nextNode())) {
    var pn = n.parentNode && n.parentNode.nodeName;
    if (pn === "SCRIPT" || pn === "STYLE" || pn === "TEXTAREA") continue;
    if (!/[A-Za-z]/.test(n.nodeValue)) continue;
    if (noLang(n.parentNode)) continue;
    texts.push(n);
  }
  texts.forEach(function (t) {
    var src = ORIG_TEXT.has(t) ? ORIG_TEXT.get(t) : t.nodeValue;
    var out = LANG === "es" ? translateRun(src) : src;
    if (out === t.nodeValue) return;
    if (!ORIG_TEXT.has(t)) ORIG_TEXT.set(t, t.nodeValue);
    t.nodeValue = out;
  });

  if (!root.querySelectorAll) return;
  var sel = I18N_ATTRS.map(function (a) { return "[" + a + "]"; }).join(",");
  var els = root.querySelectorAll(sel);
  for (var i = 0; i < els.length; i++) {
    if (!noLang(els[i])) applyLangAttrs(els[i]);
  }
  if (root === document.body) applyLangAttrs(document.documentElement);
}
/* Opt-out for anything whose text is managed directly rather than rendered,
   the language button relabels itself, so letting the restore path have it
   too would put the two in a fight. */
function noLang(node) {
  if (!node) return false;
  var e = node.nodeType === 1 ? node : node.parentElement;
  return !!(e && e.closest && e.closest("[data-nolang]"));
}
function applyLangAttrs(e) {
  var keep = ORIG_ATTR.get(e);
  I18N_ATTRS.forEach(function (a) {
    if (!e.hasAttribute || !e.hasAttribute(a)) return;
    var src = keep && keep[a] != null ? keep[a] : e.getAttribute(a);
    var out = LANG === "es" ? T(src) : src;
    if (out === e.getAttribute(a)) return;
    if (!keep) { keep = {}; ORIG_ATTR.set(e, keep); }
    if (keep[a] == null) keep[a] = e.getAttribute(a);
    e.setAttribute(a, out);
  });
}

/* The book text is the large half, it is fetched only when somebody actually
   asks for Spanish, and the service worker keeps it from then on. Until it
   lands the interface is Spanish and the rules are English, which is the
   fallback working rather than an error. */
function loadEsBook() {
  if (esBook === "ready" || esBook === "loading") return;
  esBook = "loading";
  var s = document.createElement("script");
  s.src = "es-book.js";
  s.onload = function () { esBook = "ready"; esRebuild(); render(); };
  s.onerror = function () {
    esBook = "failed";
    toast("No se pudieron cargar las reglas en español, se muestran en inglés.");
  };
  document.head.appendChild(s);
}
function setLang(next) {
  LANG = next === "es" ? "es" : "en";
  lsWrite(LANG_KEY, LANG);
  document.documentElement.setAttribute("lang", LANG === "es" ? "es" : "en");
  if (LANG === "es") loadEsBook();
  render();
}

function save() {
  if (swapDepth) return true;       // borrowed sheet; never write it to our slot
  if (C && C.isShared) return true; // someone else's link; leave their slot alone
  var ok = lsWrite(LS, JSON.stringify(C));
  // at a live table, the GM's screen gets every change a second later
  if (window.TTSYNC && !C.isExample) window.TTSYNC.pushChar(slimChar(C));
  return ok;
}
function load() {
  try {
    var raw = localStorage.getItem(LS);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {}
  return null;
}
/* ---- validation -------------------------------------------------------
   Every way a character enters the app goes through here: share links, file
   imports, roster opens and the local save. It used to check only shape,
   "is this an array, is this an object", and let the contents through
   untouched, which is how markup reached the dossier and how a level of 2.5
   or an unknown class name reached code that assumed neither could happen.
   Validate contents, drop what cannot be trusted, and report what was
   dropped rather than silently mangling someone's character.            */
var lastDropped = [];

function isPlainObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
function intIn(v, lo, hi) {
  var n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isFinite(n) && Math.floor(n) === n && n >= lo && n <= hi ? n : null;
}
function strOrNull(v) { return typeof v === "string" && v ? v : null; }
function knownSkill(s) { return typeof s === "string" && !!D.skills[s]; }
function knownFeat(n) {
  return typeof n === "string" && ALL_FEATS.some(function (f) { return f.name === n; });
}
function knownBg(id) {
  return typeof id === "string" && D.backgrounds.some(function (b) { return b.id === id; });
}

function migrate(c) {
  if (!c) return c;
  var drop = [];
  var base = blank();
  var out = blank();
  out.id = strOrNull(c.id) || out.id;

  // --- scalars -------------------------------------------------------
  out.name = typeof c.name === "string" ? c.name : "";
  var lv = intIn(c.level, 1, 20);
  if (lv === null && c.level !== undefined && c.level !== null) drop.push("level");
  out.level = lv === null ? base.level : lv;

  out.method = ["pointbuy", "array", "roll", "manual"].indexOf(c.method) >= 0 ? c.method : "pointbuy";

  // --- identity: must name something the app actually has -------------
  out.cls = classByName[c.cls] ? c.cls : null;
  if (c.cls && !out.cls) drop.push("class “" + String(c.cls).slice(0, 40) + "”");

  if (out.cls && subById[c.sub] && subById[c.sub].cls === out.cls) out.sub = c.sub;
  else { out.sub = null; if (c.sub) drop.push("archetype"); }

  out.bg = knownBg(c.bg) ? c.bg : null;
  if (c.bg && !out.bg) drop.push("background");

  out.origin = strOrNull(c.origin);
  out.sleeve = strOrNull(c.sleeve);
  out.style = strOrNull(c.style);
  out.techSwap = c.techSwap === true;
  out.techReplaces = knownSkill(c.techReplaces) ? c.techReplaces : null;

  // --- ability scores --------------------------------------------------
  ABIL.forEach(function (a) {
    var v = isPlainObj(c.scores) ? intIn(c.scores[a], 1, 30) : null;
    out.scores[a] = v === null ? 8 : v;
  });
  out.arrayMap = {};
  if (isPlainObj(c.arrayMap)) {
    ABIL.forEach(function (a) {
      var v = intIn(c.arrayMap[a], 1, 30);
      if (v !== null) out.arrayMap[a] = v;
    });
  }
  out.rolled = Array.isArray(c.rolled)
    ? c.rolled.map(function (n) { return intIn(n, 1, 30); }).filter(function (n) { return n !== null; })
    : null;
  if (out.rolled && !out.rolled.length) out.rolled = null;

  // --- lists -----------------------------------------------------------
  out.skills = (Array.isArray(c.skills) ? c.skills : []).filter(knownSkill);
  out.bgPicks = (Array.isArray(c.bgPicks) ? c.bgPicks : []).filter(knownSkill);
  out.augments = (Array.isArray(c.augments) ? c.augments : [])
    .filter(function (n) { return typeof n === "string"; });
  ["invocations", "infusions"].forEach(function (k) {
    out[k] = (Array.isArray(c[k]) ? c[k] : []).filter(function (n) { return typeof n === "string"; });
  });

  out.cyber = (Array.isArray(c.cyber) ? c.cyber : []).filter(function (x) {
    return isPlainObj(x) && typeof x.name === "string";
  }).map(function (x) { return { name: x.name, tier: String(x.tier == null ? "1" : x.tier) }; });

  out.gear = (Array.isArray(c.gear) ? c.gear : []).filter(function (g) {
    return isPlainObj(g) && typeof g.key === "string" && typeof g.name === "string";
  }).map(function (g) {
    var o = { key: g.key, name: g.name, cost: typeof g.cost === "string" ? g.cost : "" };
    var q = intIn(g.qty, 1, 999);
    if (q !== null && q > 1) o.qty = q;
    var w = typeof g.wt === "number" && isFinite(g.wt) && g.wt >= 0 ? g.wt : weightFor(g.key);
    if (w !== null) o.wt = w;
    if (g.custom === true) { o.custom = true; o.name = o.name.slice(0, 80); }
    return o;
  });
  out.credits = intIn(c.credits, 0, 1000000000);
  out.frames = (Array.isArray(c.frames) ? c.frames : []).slice(0, 4).map(function (f) {
    return isPlainObj(f) ? { hp: intIn(f.hp, 0, 999), gone: f.gone === true } : {};
  }).map(function (f) { if (f.hp === null) delete f.hp; return f; });
  if (!out.frames.length) delete out.frames;
  var uu = intIn(c.uplinkUsed, 0, 99);
  if (uu) out.uplinkUsed = uu;
  // hit points right now, kept on the sheet and shared with the GM at a live table
  var hn = intIn(c.hpNow, 0, 9999);
  if (hn !== null) out.hpNow = hn;
  var ht = intIn(c.hpTemp, 0, 9999);
  if (ht) out.hpTemp = ht;
  if (typeof c.hpAt === "number" && isFinite(c.hpAt) && c.hpAt > 0) out.hpAt = c.hpAt;

  // --- level-up slots ---------------------------------------------------
  var rawAsi = Array.isArray(c.asi) ? c.asi : [];
  var badSlots = 0;
  out.asi = rawAsi.map(function (s) {
    if (!isPlainObj(s)) { badSlots++; return { type: null }; }
    if (s.type === "asi") {
      return { type: "asi",
               a: ABIL.indexOf(s.a) >= 0 ? s.a : null,
               b: ABIL.indexOf(s.b) >= 0 ? s.b : null };
    }
    if (s.type === "feat") {
      var slot = { type: "feat", name: knownFeat(s.name) ? s.name : null };
      if (ABIL.indexOf(s.abil) >= 0) slot.abil = s.abil;
      if (s.name && !slot.name) badSlots++;
      return slot;
    }
    return { type: null };
  });
  if (badSlots) drop.push(badSlots + " level-up slot" + (badSlots === 1 ? "" : "s"));

  // Feats used to be an unlimited list; fold a legacy list into slots.
  if (!out.asi.some(function (s) { return s.type; }) && Array.isArray(c.feats) && c.feats.length) {
    out.asi = c.feats.filter(knownFeat).map(function (n) { return { type: "feat", name: n }; });
  }
  out.feats = out.asi.filter(function (s) { return s.type === "feat" && s.name; })
                     .map(function (s) { return s.name; });

  // --- maps -------------------------------------------------------------
  out.picks = {};
  if (isPlainObj(c.picks)) {
    Object.keys(c.picks).forEach(function (k) {
      if (Array.isArray(c.picks[k])) {
        out.picks[k] = c.picks[k].filter(function (v) { return typeof v === "string"; });
      }
    });
  }
  out.subChoices = {};
  if (isPlainObj(c.subChoices)) {
    Object.keys(c.subChoices).forEach(function (k) {
      if (Array.isArray(c.subChoices[k])) {
        out.subChoices[k] = c.subChoices[k].filter(function (v) { return typeof v === "string"; });
      }
    });
  }
  out.traits = {};
  if (isPlainObj(c.traits)) {
    Object.keys(c.traits).forEach(function (k) {
      if (typeof c.traits[k] === "string") out.traits[k] = c.traits[k];
    });
  }

  // --- known flags, everything else discarded --------------------------
  if (c.isShared === true) out.isShared = true;
  if (c.isExample === true) out.isExample = true;
  if (typeof c.campaign === "string") out.campaign = c.campaign;

  lastDropped = drop;
  return out;
}
function droppedNote() { return lastDropped.slice(); }
