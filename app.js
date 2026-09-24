/* Technomancer's Terminal, character forge + codex for The Technomancer's Textbook */
(function () {
  "use strict";
  var D = window.TTB;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (t, c, h) {
    var n = document.createElement(t);
    if (c) n.className = c;
    if (h != null) n.innerHTML = h;
    return n;
  };
  var esc = function (s) {
    // Single quotes included: attributes get built by concatenation in places,
    // and leaving ' out is the classic way an escape helper stops helping.
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  };

  /* ------------------------------------------------------------------ data */
  /* Bumped by hand on every deploy, there is no build step, and a commit
     cannot contain its own hash. Shown in the masthead so "did my change go
     live?" is answerable at a glance. Bump CACHE in sw.js alongside it. */
  var BUILD = "2026-09-25 01:30";
  var ABIL = ["Str", "Dex", "Con", "Int", "Wis", "Cha"];
  var ABIL_FULL = { Str: "Strength", Dex: "Dexterity", Con: "Constitution",
                    Int: "Intelligence", Wis: "Wisdom", Cha: "Charisma" };
  var PB_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  var ARRAY = [15, 14, 13, 12, 10, 8];
  var X = window.TTBX || { classes: [], subclasses: [], feats: [], systems: [], origins: null };
  var SRD = window.TTSRD || { meta: null, subclasses: [] };
  /* Which classes are worth standing next to. Read-only here, the sheet never
     stores any of it, and a missing file costs the preview and nothing else. */
  var SY = window.TTSY || { roles: [], classRoles: {}, crewTiers: [], pairs: [] };
  var tableByTitle = {};
  D.tables.forEach(function (t) { tableByTitle[t.title] = t; });

  // Book classes carry one archetype each; expansion classes carry several.
  var subById = {};
  D.subclasses.forEach(function (s) { s.origin = "book"; subById[s.id] = s; });
  X.subclasses.forEach(function (s) { subById[s.id] = s; });
  SRD.subclasses.forEach(function (s) { s.origin = "srd"; subById[s.id] = s; });

  var ALL_SUBS = D.subclasses.concat(X.subclasses, SRD.subclasses);
  var ALL_FEATS = D.feats.concat(X.feats.map(function (f) {
    return Object.assign({ origin: "expansion" }, f);
  }));

  var classByName = {};
  D.classes.forEach(function (c) { c.origin = "book"; classByName[c.name] = c; });
  X.classes.forEach(function (c) {
    c.subclassId = c.subclassIds[0];
    classByName[c.name] = c;
  });
  var ALL_CLASSES = D.classes.concat(X.classes);

  function paras(x) {
    return Array.isArray(x) ? x : (typeof x === "string" && x ? [x] : []);
  }

  function subsFor(clsName) {
    return ALL_SUBS.filter(function (s) { return s.cls === clsName; });
  }
  function isExp(o) { return o && o.origin === "expansion"; }

  /* Where a class, archetype or feat came from.
   *
   * This used to be an isExp() ternary written out at fifteen render sites, each
   * with the two labels inline, which is why adding a third source is the reason
   * this function exists. Anything without an origin is from the book. */
  var SOURCES = { expansion: "Neon Ledger", srd: "SRD", book: "Book" };
  function isBook(o) { return !o || !o.origin || o.origin === "book"; }
  function sourceName(o) { return SOURCES[(o && o.origin) || "book"] || "Book"; }
  /* The SRD is CC-BY, and the licence asks for this in so many words. It is
     rendered wherever SRD material is listed rather than buried in a footer. */
  function srdNotice(host) {
    if (!SRD.meta || !SRD.subclasses.length) return;
    var n = el("div", "note srd-note");
    n.innerHTML = '<b>SRD</b>: ' + esc(SRD.meta.note) + "<br><small>" +
      esc(SRD.meta.notice) + "</small>";
    host.appendChild(n);
  }
  function sourceChip(o, cls, style) {
    return '<span class="chip ' + (cls || "tier") + '"' +
      (style ? ' style="' + style + '"' : "") + ">" + esc(sourceName(o)) + "</span>";
  }

  function mod(n) { return Math.floor((n - 10) / 2); }
  function sgn(n) { return (n >= 0 ? "+" : "") + n; }
  function ordinal(n) {
    var t = n % 100, d = n % 10;
    return n + (t >= 11 && t <= 13 ? "th" : d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th");
  }
  function profBonus(lv) { return 2 + Math.floor((lv - 1) / 4); }
  function dieSize(h) { return parseInt(String(h).replace("d", ""), 10); }

  /* cost lookup for cyberware / augments */
  var cyberCost = {};
  (tableByTitle["Cyberware List"] || { rows: [] }).rows.forEach(function (r) {
    cyberCost[(r[0] || "").toLowerCase() + "|" + r[1]] = r[2];
  });
  var augCost = {};
  (tableByTitle["Augment List"] || { rows: [] }).rows.forEach(function (r) {
    augCost[(r[0] || "").toLowerCase()] = r[1];
  });
  function parseCredits(s) {
    var m = String(s || "").replace(/[,₵\s]/g, "");
    var n = parseFloat(m);
    return isNaN(n) ? 0 : n;
  }
  function fmtCredits(n) { return n.toLocaleString("en-US") + "₵"; }

  /* tiers a cyberware entry offers, e.g. "Tier 1, 2, or 3" */
  function tiersOf(entry) {
    var t = entry.tier || "";
    var nums = t.match(/\d+/g) || [];
    return nums.map(function (n) { return n; });
  }

  /* ------------------------------------------------------------- character */
  function blank() {
    return {
      id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: "", level: 3, cls: null, method: "pointbuy",
      scores: { Str: 8, Dex: 8, Con: 8, Int: 8, Wis: 8, Cha: 8 },
      rolled: null, arrayMap: {}, skills: [], bgPicks: [], techSwap: false, techReplaces: null,
      sub: null, origin: null, bg: null, asi: [], picks: {}, sleeve: null,
      subChoices: {}, style: null, feats: [], invocations: [], infusions: [],
      cyber: [], augments: [], gear: [], traits: {}, credits: null
    };
  }
  function example() {
    var c = blank();
    c.id = "example";
    c.name = "Nyx Calderón";
    c.level = 5;
    c.cls = "Rogue";
    c.method = "array";
    c.arrayMap = { Dex: 15, Int: 14, Con: 13, Wis: 12, Cha: 10, Str: 8 };
    c.scores = { Str: 8, Dex: 15, Con: 13, Int: 14, Wis: 12, Cha: 10 };
    c.bg = "hacker";
    c.sub = "rogue-saboteur";
    c.skills = ["Stealth", "Perception", "Sleight of Hand", "Deception"];
    // Attached to the level-4 slot, not the legacy flat list, takenFeats()
    // derives from asi, so a bare c.feats was wiped on the first level-up edit.
    c.asi = [{ type: "feat", name: "Demolitions Expert" }];
    c.feats = ["Demolitions Expert"];
    c.cyber = [{ name: "Wired Reflexes", tier: "2" }];
    c.isExample = true;
    return c;
  }

  var C = null;
  var mode = "forge";
  var step = 0;
  var codexSec = 0;
  var codexQ = "";
  var STEPS = ["Class", "Archetype", "Background", "Abilities", "Proficiencies",
               "Level-Ups", "Chrome & Gear", "Play Sheet"];
  var CAMPSEC = ["Overview", "House Rules", "People", "Places", "Custom Gear", "Session Log", "Hooks"];
  var campSecIx = 0;
  var GMSEC = ["Party", "Encounter", "Rulings", "NPCs", "Clocks", "Story", "Campaign", "City", "Toolkit"];
  var gmSecIx = 0;
  var gmOn = false;
  try { gmOn = localStorage.getItem("ttb.gm") === "1"; } catch (e) {}
  var CODEX = ["Subclasses", "Backgrounds", "Feats", "Fighting Styles",
               "Warlock Invocations", "Artificer Infusions", "Cyberware",
               "Augments", "Reference Tables",
               "Expansion Classes", "Humanity & Cred", "Origins", "Glossary"];

  /* ------------------------------------------------------------ persistence */
  var LS = "ttb.character.v1";

  /* Storage can fail, a full quota, a private window, blocked site data, and
     every write here used to swallow the exception and carry on, so the app
     cheerfully reported saves that never happened. These return whether the
     write landed, and callers are expected to care. */
  var storageBroken = false;
  function lsWrite(key, value) {
    try { localStorage.setItem(key, value); storageBroken = false; return true; }
    catch (e) { storageBroken = true; return false; }
  }
  function lsRead(key) {
    // null = absent, undefined = unreadable. Those are different, and conflating
    // them renders a read failure as "you have no characters".
    try { return localStorage.getItem(key); } catch (e) { return undefined; }
  }
  function storageIsBroken() { return storageBroken; }

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
    return lsWrite(LS, JSON.stringify(C));
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
    C.cyber.forEach(function (x) { t += parseCredits(cyberCost[x.name.toLowerCase() + "|" + x.tier]); });
    C.augments.forEach(function (n) { t += parseCredits(augCost[n.toLowerCase()]); });
    C.gear.forEach(function (g) { t += parseCredits(g.cost) * (g.qty > 0 ? g.qty : 1); });
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


  /* =================================================== beginner guidance === */
  var helpMode = true;
  try { var hm = localStorage.getItem("ttb.help"); if (hm !== null) helpMode = hm === "1"; } catch (e) {}

  var GLOSSARY = {
    "ability score": "One of six numbers (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) rating your body and mind. 10 is average for a person; 20 is the human peak.",
    "modifier": "The number you actually add to dice rolls, worked out from an ability score. Score 10–11 gives +0, and every 2 points above or below shifts it by 1. Score 16 gives +3.",
    "hit die": "The die you roll for health each level. A d10 class is tougher than a d6 class. This app adds the average for you.",
    "hit points": "Your health. Damage takes them away; at 0 you fall unconscious and start making death saving throws.",
    "proficiency bonus": "A number that grows with your level (+2 at 1st, +6 at 20th). You add it to anything you're trained in.",
    "saving throw": "A roll to resist something happening to you: poison, an explosion, mind control. Your class is trained in two of them.",
    "skill": "A thing you can be trained in, like Stealth or Persuasion. Roll a d20, add the matching ability modifier, and add your proficiency bonus if you're trained.",
    "armour class": "How hard you are to hit. An attacker must roll this number or higher on a d20. Usually written AC.",
    "initiative": "The roll at the start of a fight that decides turn order. It's a d20 plus your Dexterity modifier.",
    "action": "The main thing you do on your turn: attack, cast, run a program. One per turn.",
    "bonus action": "A quick extra thing, only when a feature says you can. One per turn, on top of your action.",
    "reaction": "Something you do out of turn, when a trigger described by a feature happens. One per round.",
    "long rest": "About eight hours of downtime. You get your health and most abilities back.",
    "short rest": "About an hour. You recover some abilities, and can spend Hit Dice to heal.",
    "archetype": "A specialisation inside your class, the flavour of Rogue or Wirewalker you are. Also called a subclass.",
    "feat": "A special package of abilities you can take instead of raising your ability scores.",
    "ability score improvement": "At levels 4, 8, 12, 16 and 19 you either raise your ability scores or take a feat. Often shortened to ASI.",
    "dc": "Difficulty Class, the number you need to meet or beat on a roll. Your own DC is what enemies must beat to resist your abilities.",
    "advantage": "Roll two d20s and keep the higher one. Disadvantage is the same but you keep the lower.",
    "humanity": "This book's tracker for how much of you is still a person. Every implant costs some. Run out and your character is lost.",
    "credits": "Money in this setting, written ₵. Cyberware is expensive; tier 4 runs to tens of millions.",
    "tier": "How advanced a piece of cyberware is, 1 to 4. Higher tiers are stronger, cost far more credits, and cost more Humanity."
  };

  function withTerms(text) {
    // [[term]] and [[term|shown words]] become tappable definitions
    //
    // Translated here, before the split, rather than left to applyLang(). A
    // dotted term cuts its sentence into three text nodes, and three fragments
    // ("A", "skill", "is something you roll for…") cannot be translated
    // separately without getting the grammar wrong. The Spanish keeps the
    // English term as the glossary key, [[skill|habilidad]], because
    // GLOSSARY is keyed on it.
    text = T(text);
    var frag = document.createDocumentFragment();
    var re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var key = m[1].toLowerCase(), shown = m[2] || m[1];
      var btn = el("button", "term", esc(shown));
      btn.type = "button";
      btn.setAttribute("aria-label", T("What does {0} mean?").replace("{0}", shown));
      (function (k, b) {
        b.onclick = function () {
          var block = b;
          while (block.parentNode && ["P", "LI", "DIV"].indexOf(block.tagName) < 0)
            block = block.parentNode;
          var existing = block.parentNode &&
            block.parentNode.querySelector('.term-def[data-k="' + k + '"]');
          if (existing) { existing.remove(); return; }
          var d = el("div", "term-def", "<b>" + esc(T(k)) + "</b>" + esc(T(GLOSSARY[k] || "")));
          d.setAttribute("data-k", k);
          if (block.parentNode) block.parentNode.insertBefore(d, block.nextSibling);
        };
      })(key, btn);
      frag.appendChild(btn);
      last = re.lastIndex;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }

  var HELP = [
    { title: "What a class is",
      what: "Your class is your character's job, what they're good at and what they reach for when things go wrong. It decides your [[hit die|health per level]], which [[saving throw|saving throws]] you're trained in, and most of what you can do.",
      todo: ["Read the cards and pick whoever sounds like someone you'd enjoy being for a few months.",
             "There is no wrong answer. Nothing is locked in, you can change class right up until your first session."],
      tip: "The easiest to run at a table are Fighter, Barbarian and Chromehound: you mostly hit things and are hard to kill. Wirewalker and Puppeteer have the most moving parts." },
    { title: "What an archetype is",
      what: "An [[archetype]] is a specialisation inside your class. Two Rogues can play completely differently depending on which one they took.",
      todo: ["Every class offers a choice of archetypes, pick the one you want to play.",
             "Read the features. Greyed-out ones are real, you just aren't high enough level yet."],
      tip: "Features unlock as you level. Drag the level slider in the panel on the right to see what arrives later." },
    { title: "Background and origin",
      what: "Your background is what you did for money before any of this started. It hands you [[skill|skills]], tools, starting gear and a special ability. Your origin is where you came from, and gives a small perk plus a story hook.",
      todo: ["Pick one background. If it says “choose two from…”, buttons will appear for you to choose.",
             "Pick or roll an origin, the d12 button rolls for you.",
             "The personality tables at the bottom are optional. Roll them if you want ideas for who this person actually is."],
      tip: "Backgrounds are as much about story as numbers. Pick one you'd enjoy explaining to the table." },
    { title: "What the six numbers mean",
      what: "[[ability score|Ability scores]] describe your body and mind. What matters at the table is the [[modifier]] underneath each one, that's what you add to your dice.",
      todo: ["Standard array is the simplest: you get 15, 14, 13, 12, 10 and 8 to assign.",
             "Put your 15 in the ability marked as your class's primary, it's highlighted for you.",
             "Put 14 and 13 in Constitution and whatever else your class leans on. Dump the 8 somewhere you don't care about."],
      tip: "Constitution is never a bad place for a good number, it's your health and it matters for every class." },
    { title: "Skills and proficiency",
      what: "A [[skill]] is something you roll for outside combat. Being trained in one means adding your [[proficiency bonus]] to that roll, which is a big deal.",
      todo: ["Pick the number of skills your class allows, the counter at the top tracks it.",
             "Anything your background already gave you is ticked and can't be picked twice."],
      tip: "Perception is the most-rolled skill in the game. If it's on your class list and nobody else has it, take it." },
    { title: "Levelling up",
      what: "At levels 4, 8, 12, 16 and 19 every character gets an [[ability score improvement]]: raise your numbers, or take a [[feat]] instead. Some classes also learn new things as they level.",
      todo: ["Spend each slot shown. If you're new, take the ability increase and put both points into your class's primary ability.",
             "If your class learns programs, grafts or imprints, pick them here, the count grows every few levels."],
      tip: "Feats are more interesting but ability increases are more reliably useful. There's no shame in +2 Dexterity." },
    { title: "Buying chrome",
      what: "Cyberware costs [[credits|money]] and [[humanity]]. The money is your DM's problem. The Humanity is yours: each implant takes a piece of the person you were, and at zero your character is gone.",
      todo: ["Install one or two [[tier|tier 1]] implants to start. They're cheap in both currencies.",
             "Pick a weapon and some armour from the tables lower down.",
             "Watch the Humanity bar. Staying above 60% keeps you free of any penalty."],
      tip: "Starting characters usually don't have millions of credits. Ask your DM what you can afford before you go shopping." },
    { title: "Your character sheet",
      what: "This is everything you've chosen, worked out into the numbers you'll actually use at the table.",
      todo: ["Check the vitals strip, that's your [[armour class|AC]], [[hit points]], [[initiative]] and [[proficiency bonus]].",
             "Read “What you can do”. Those are your options on a turn, sorted by [[action]], [[bonus action]] and [[reaction]].",
             "Print it, or copy it as Markdown and paste it wherever you keep notes."],
      tip: "Don't try to memorise it. Everyone reads their sheet at the table, including people who've played for years." }
  ];

  function helpPanel(i) {
    if (!helpMode || !HELP[i]) return null;
    var h = HELP[i];
    var box = el("div", "help");
    var head = el("h5");
    head.appendChild(document.createTextNode("New to this? " + h.title));
    var hide = el("button", "chip", "Hide guide");
    hide.style.marginLeft = "auto";
    hide.onclick = function () {
      helpMode = false;
      try { localStorage.setItem("ttb.help", "0"); } catch (e) {}
      render();
    };
    head.appendChild(hide);
    box.appendChild(head);
    var p = el("p");
    p.appendChild(withTerms(h.what));
    box.appendChild(p);
    var ol = el("ol");
    h.todo.forEach(function (t) {
      var li = el("li");
      li.appendChild(withTerms(t));
      ol.appendChild(li);
    });
    box.appendChild(ol);
    box.appendChild(el("p", "tip", "<b>Tip</b> " + esc(h.tip)));
    return box;
  }

  /* what is still missing on each step, in plain words */
  function missingFor(i) {
    var cl = classByName[C.cls];
    switch (i) {
      case 0: return C.cls ? null : "Pick a class to get started.";
      case 1:
        if (!C.cls) return "Pick a class first.";
        var opts = subsFor(C.cls).length;
        return mySub() ? null : "Choose one of the " + (opts || "") + " archetypes.";
      case 2:
        if (!C.bg) return "Pick a background.";
        var g = skillGrant();
        var got = bgSkills().filter(function (s) { return g.from.indexOf(s) >= 0; }).length;
        if (g.n && got < g.n) return "Your background lets you choose " + g.n +
          " skill" + (g.n === 1 ? "" : "s") + ", " + (g.n - got) + " still to pick.";
        return null;
      case 3:
        if (assignsFromMap()) {
          var left = 6 - ABIL.filter(function (a) { return !!C.arrayMap[a]; }).length;
          if (left > 0) return "Assign " + left + " more score" + (left === 1 ? "" : "s") + " to abilities.";
        } else if (C.method === "pointbuy" && pbSpent() === 0) return "Spend your 27 points.";
        return null;
      case 4:
        if (!cl) return "Pick a class first.";
        var need = cl.skillCount - C.skills.length;
        if (need > 0) return "Choose " + need + " more skill" + (need === 1 ? "" : "s") + ".";
        if (need < 0) return "You've picked too many skills, remove " + (-need) + ".";
        if (C.techSwap && !C.techReplaces) return "Choose which skill Technology replaces.";
        return null;
      case 5:
        if (!cl) return "Pick a class first.";
        var slots = asiSlotCount(), used = asiSlots().filter(function (x) { return x.type; }).length;
        if (used < slots) return (slots - used) + " level-up choice" + (slots - used === 1 ? "" : "s") +
          " waiting, take an ability increase or a feat.";
        var sp = scalingSpec();
        if (sp) {
          var have = ((C.picks && C.picks[sp.spec.key]) || []).length;
          if (have < sp.allowed) return "Choose " + (sp.allowed - have) + " more " +
            sp.spec.label.toLowerCase() + ".";
        }
        var unchosen = asiSlots().filter(function (sl) {
          var fx2 = sl && sl.type === "feat" && sl.name ? FEAT_EFFECTS[sl.name] : null;
          return fx2 && fx2.choose && !featBump(sl);
        }).length;
        if (unchosen) return "Choose the ability score " + unchosen + " feat" +
          (unchosen === 1 ? "" : "s") + " should raise.";
        if (["Fighter", "Paladin", "Ranger"].indexOf(cl.name) >= 0 && !C.style)
          return "Choose a fighting style.";
        if (cl.name === "Stackborn" && !C.sleeve) return "Choose a sleeve package.";
        return null;
      case 6:
        return (C.cyber.length || C.augments.length || C.gear.length) ? null :
          "Optional, but most characters want a weapon at least.";
      default: return null;
    }
  }

  function firstIncomplete() {
    for (var i = 0; i < 7; i++) if (missingFor(i)) return i;
    return null;
  }

  var BEGINNER = ["Fighter", "Barbarian", "Chromehound", "Rogue"];
  function quickBuild() {
    var c = blank();
    c.name = "";
    c.level = 3;
    c.cls = "Chromehound";
    var subs = subsFor(c.cls);
    c.sub = subs.length ? subs[0].id : null;
    c.bg = "gangster";
    c.method = "array";
    var cl = classByName[c.cls];
    // 15 to the class's primary, 14 to Constitution, then fill downward
    var order = cl.primary.concat(["Con"]).concat(ABIL).filter(function (a, i, arr) {
      return arr.indexOf(a) === i;
    });
    ARRAY.forEach(function (v, i) { c.arrayMap[order[i]] = v; });
    c.scores = {};
    ABIL.forEach(function (a) { c.scores[a] = c.arrayMap[a] || 8; });
    C = c;
    // skills the class allows, minus anything the background already grants
    var granted = bgSkills();
    cl.skills.forEach(function (sk) {
      if (C.skills.length < cl.skillCount && granted.indexOf(sk) < 0) C.skills.push(sk);
    });
    C.origin = "Combat Zone Raised";
    C.gear = [];
    var fl = tableByTitle["Firearm List"], ar = tableByTitle["Armor"];
    if (fl) {
      var gun = fl.rows.filter(function (r) { return /pistol/i.test(r[0]) && r[1]; })[0];
      if (gun) C.gear.push({ key: "Firearm List|" + gun[0], name: gun[0], cost: gun[1], wt: weightFor("Firearm List|" + gun[0]) });
    }
    if (ar) {
      var arm = ar.rows.filter(function (r) { return /steelcloth/i.test(r[0]); })[0];
      if (arm) C.gear.push({ key: "Armor|" + arm[0], name: arm[0], cost: arm[1], wt: weightFor("Armor|" + arm[0]) });
    }
    C.cyber = [{ name: "Auto-Injector", tier: "1" }];
    save();
  }


  /* ============================================== standalone web features === */
  var CAMP = (window.TTBC && window.TTBC.campaigns) ? window.TTBC.campaigns.slice() : [];

  function downloadFile(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 800);
      return true;
    } catch (e) { return false; }
  }
  function saveAs(name, text, mime) {
    toast(downloadFile(name, text, mime) ? "Downloaded " + name : "Download blocked by the browser");
  }

  /* ---- share a character as a link -------------------------------------- */
  function b64u(s) {
    return btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64u(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return decodeURIComponent(escape(atob(s)));
  }
  function slimChar(c) {
    // drop empty fields so the link stays short
    var out = {};
    Object.keys(c).forEach(function (k) {
      var v = c[k];
      if (v == null || v === "" || v === false) return;
      if (Array.isArray(v) && !v.length) return;
      if (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) return;
      out[k] = v;
    });
    return out;
  }
  function shareLink() {
    var base = location.origin + location.pathname;
    return base + "#c=" + b64u(JSON.stringify(slimChar(C)));
  }
  /* Leaving a shared view has to drop the fragment, or the next reload prefers
     the stranger's character over whatever the user has been building since.
     Anything else in the hash (the GM token) is left alone. */
  function clearShareHash() {
    var rest = (location.hash || "").replace(/[#&]c=[^&]*/, "").replace(/^[#&]+/, "");
    try {
      history.replaceState(null, "", location.pathname + location.search + (rest ? "#" + rest : ""));
    } catch (e) {}
  }
  function readShared() {
    var m = (location.hash || "").match(/[#&]c=([^&]+)/);
    if (!m) return null;
    try { return JSON.parse(unb64u(m[1])); } catch (e) { return null; }
  }

  /* ---- roster: many characters, kept in this browser -------------------- */
  function rosterAll() {
    var raw = lsRead("ttb.roster");
    if (raw === undefined) return null;          // unreadable, not empty
    try { return JSON.parse(raw || "[]"); } catch (e) { return null; }
  }
  function rosterWrite(list) { return lsWrite("ttb.roster", JSON.stringify(list)); }
  function rosterPut(c) {
    var all = (rosterAll() || []).filter(function (r) { return r.id !== c.id; });
    all.push({ id: c.id, name: c.name || "Unnamed", cls: c.cls || "-", level: c.level,
               updated: Date.now(), payload: JSON.stringify(c) });
    return rosterWrite(all);
  }
  function rosterDrop(id) {
    return rosterWrite((rosterAll() || []).filter(function (r) { return r.id !== id; }));
  }

  /* ---- campaigns: seeded from campaigns.js, editable in the browser ----- */
  function campUser() {
    var raw = lsRead("ttb.campaigns");
    try { return JSON.parse((raw === undefined ? "[]" : raw) || "[]"); } catch (e) { return []; }
  }
  function campUserWrite(list) { return lsWrite("ttb.campaigns", JSON.stringify(list)); }
  function campAll() {
    var mine = campUser(), ids = {};
    mine.forEach(function (c) { ids[c.id] = 1; });
    return CAMP.filter(function (c) { return !ids[c.id]; })
      .map(function (c) { return Object.assign({ builtIn: true }, c); })
      .concat(mine);
  }
  function campById(id) {
    var all = campAll();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function campSave(c) {
    var mine = campUser().filter(function (x) { return x.id !== c.id; });
    mine.push(c);
    return campUserWrite(mine);
  }
  var campSel = null, campEditing = false;
  campSel = lsRead("ttb.campaign") || null;
  function setCamp(id) {
    campSel = id;
    if (id) return lsWrite("ttb.campaign", id);
    try { localStorage.removeItem("ttb.campaign"); return true; } catch (e) { return false; }
  }

  /* ----------------------------------------------------------------- toast */
  var toastT;
  function toast(msg) {
    var old = $(".toast"); if (old) old.remove();
    var t = el("div", "toast", esc(msg));
    document.body.appendChild(t);
    applyLang(t);
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.remove(); }, 2200);
  }

  /* ====================================================== STEP: 1, CLASS */
  /* ------------------------------------------------- the synergy preview --
     A class card is a <button>, so this cannot live inside one: nested
     interactive elements are invalid and every click would bubble into
     selecting the class. It goes in a wrapper beside the card instead.

     Open state is kept out here because render() rebuilds the whole stage, and
     choosing a class re-renders, without this, opening Fighter's preview and
     then picking Fighter would shut what you just opened. */
  var synOpen = {}, synPairOpen = {};

  /* ------------------------------------------------------------- roles --
     One icon and one colour per crew role, so a party's mix reads at a
     glance. Drawn inline rather than shipped as image files: a few strokes
     each, coloured by CSS, nothing to fetch. gm.js uses the same chips. */
  var ROLE_ICON = {
    Muscle: '<path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6z"/><path d="M13 7l-3 5h4l-3 5"/>',
    Face: '<path d="M4 5h16v11H10l-4 4v-4H4z"/><path d="M8 9h8M8 12h5"/>',
    Tech: '<rect x="7" y="7" width="10" height="10"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    Arcane: '<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>',
    Stealth: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/>',
    Support: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>'
  };
  function roleChipHTML(r, extra) {
    return '<span class="chip role role-' + esc(String(r).toLowerCase()) + (extra ? " " + extra : "") + '">' +
      '<svg class="ri" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ROLE_ICON[r] || "") +
      "</svg><span>" + esc(r) + "</span></span>";
  }
  function roleChip(r, extra) {
    var t = document.createElement("span");
    t.innerHTML = roleChipHTML(r, extra);
    return t.firstChild;
  }
  function roleChips(name) {
    return '<div class="pick-roles">' + (SY.classRoles[name] || []).map(function (r) {
      return roleChipHTML(r);
    }).join("") + "</div>";
  }

  function pairsForClass(name) {
    return SY.pairs.filter(function (p) { return p.pair.indexOf(name) >= 0; });
  }
  function partnerOf(p, name) {
    return p.pair[0] === name ? p.pair[1] : p.pair[0];
  }

  function synergyPreview(name) {
    var pairs = pairsForClass(name);
    var wrap = el("div", "syn-pv");
    if (!pairs.length) return wrap;

    var tog = el("button", "sec-toggle");
    tog.setAttribute("aria-expanded", !!synOpen[name]);
    tog.innerHTML = "Synergies" + '<span class="count">' + pairs.length + "</span>";
    var panel = el("div", "syn-pv-body");
    panel.hidden = !synOpen[name];
    tog.onclick = function () {
      synOpen[name] = !synOpen[name];
      panel.hidden = !synOpen[name];
      tog.setAttribute("aria-expanded", !!synOpen[name]);
    };
    wrap.appendChild(tog);

    var roles = SY.classRoles[name] || [];
    if (roles.length) {
      var rr = el("div", "gm-chips tight");
      roles.forEach(function (r) { rr.appendChild(roleChip(r)); });
      panel.appendChild(rr);
    }

    pairs.forEach(function (p) {
      var key = name + "|" + p.id;
      var row = el("div", "syn-pv-row");
      var t2 = el("button", "sec-toggle sub");
      t2.setAttribute("aria-expanded", !!synPairOpen[key]);
      // the partner is a separate node so the Spanish table can pass a class
      // name through untranslated while translating the words around it
      t2.innerHTML = "<b>" + esc(p.name) + "</b>" +
        '<span class="count">with ' + esc(partnerOf(p, name)) + "</span>";
      var det = el("div", "syn-pv-det");
      det.hidden = !synPairOpen[key];
      det.appendChild(el("div", "syn-pv-line", esc(p.line)));
      // what the pair actually does at the table: its own two nodes, so the
      // label and the sentence each translate
      if (p.effect) {
        var ef = el("div", "syn-pv-effect");
        ef.appendChild(el("span", "syn-pv-k", "What it does"));
        var et = document.createElement("span");
        et.textContent = p.effect;
        ef.appendChild(et);
        det.appendChild(ef);
      }
      if (p.wired) det.appendChild(el("div", "syn-pv-wired", esc(p.wired)));
      t2.onclick = function () {
        synPairOpen[key] = !synPairOpen[key];
        det.hidden = !synPairOpen[key];
        t2.setAttribute("aria-expanded", !!synPairOpen[key]);
      };
      row.appendChild(t2);
      row.appendChild(det);
      panel.appendChild(row);
    });

    wrap.appendChild(panel);
    return wrap;
  }

  /* The card and its preview, as one grid cell. */
  function classPick(c) {
    var wrap = el("div", "pick-wrap" + (C.cls === c.name ? " on" : ""));
    wrap.appendChild(classCard(c));
    wrap.appendChild(synergyPreview(c.name));
    return wrap;
  }

  function classCard(c) {
    var subs = subsFor(c.name);
    var b = el("button", "pick");
    b.setAttribute("aria-pressed", C.cls === c.name);
    var sub = subs.length === 1 ? subs[0] : null;
    b.innerHTML =
      "<h3>" + esc(c.name) +
      (isBook(c) ? "" : " " + sourceChip(c, "tier", "vertical-align:middle")) +
      "</h3>" +
      roleChips(c.name) +
      '<div class="sub">' +
      (sub ? esc(sub.name) + " · unlocks at level " + sub.levelAvailable
           : subs.length + " archetypes · choose at level " + (subs[0] ? subs[0].levelAvailable : 3)) +
      "</div>" +
      '<div class="stats"><span>Hit <b>' + esc(c.hit) + "</b></span>" +
      "<span>Saves <b>" + c.saves.join("/") + "</b></span>" +
      "<span>Skills <b>" + c.skillCount + "</b></span>" +
      (c.resource ? "<span>Resource <b>" + esc(c.resource) + "</b></span>" : "") +
      "</div>" +
      '<div class="why">' + esc(c.tagline || (sub ? sub.tagline : "")) + "</div>" +
      (helpMode && BEGINNER.indexOf(c.name) >= 0 ?
        '<span class="rec-badge">Good first class</span>' : "");
    b.onclick = function () {
      if (C.cls !== c.name) {
        C.cls = c.name; C.skills = []; C.subChoices = {}; C.style = null;
        C.invocations = []; C.infusions = []; C.picks = {}; C.sleeve = null;
        C.sub = subs.length === 1 ? subs[0].id : null;
      }
      delete C.isExample; save(); render();
    };
    return b;
  }

  function stepClass(s) {
    head(s, "Step 01", "Choose a class",
      D.classes.length + " classes from the book and " + X.classes.length + " more from the " +
      "Neon Ledger expansion, which bring a resource of their own. " +
      ALL_SUBS.length + " archetypes between them.");

    s.appendChild(el("div", "eyebrow", "From the book · 13 classes"));
    var g = el("div", "grid");
    D.classes.forEach(function (c) { g.appendChild(classPick(c)); });
    s.appendChild(g);

    if (X.classes.length) {
      var h2 = el("div", "eyebrow");
      h2.style.marginTop = "26px";
      h2.innerHTML = "Neon Ledger expansion · " + X.classes.length + " classes " +
        '<span class="page-ref">original material, not from the PDF</span>';
      s.appendChild(h2);
      var g2 = el("div", "grid");
      X.classes.forEach(function (c) { g2.appendChild(classPick(c)); });
      s.appendChild(g2);
    }

    var cl = classByName[C.cls];
    if (cl && isExp(cl)) {
      var det = el("div");
      det.style.marginTop = "30px";
      det.appendChild(el("div", "eyebrow", esc(cl.name) + ": class features"));
      var pr = el("div", "prose");
      paras(cl.description).forEach(function (p) { pr.appendChild(el("p", null, esc(p))); });
      det.appendChild(pr);
      det.appendChild(renderTable(cl.progression));
      cl.features.forEach(function (f) {
        var live = C.level >= f.level;
        var box = el("div", "feature " + (live ? "live" : "locked"));
        var hd = el("div", "feature-head");
        hd.innerHTML = "<h4>" + esc(f.name) + '</h4><span class="chip lvl">Lv ' + f.level + "</span>";
        box.appendChild(hd);
        renderBlocks(f.blocks, box);
        det.appendChild(box);
      });
      s.appendChild(det);
    }
    nav(s, null, C.cls ? 1 : null);
  }

  /* =================================================== STEP: 2, ARCHETYPE */
  function stepArchetype(s) {
    var cl = classByName[C.cls];
    if (!cl) return needClass(s);
    var options = subsFor(C.cls);
    var sub = mySub();

    if (options.length > 1) {
      head(s, "Step 02", "Choose an archetype",
        cl.name + " picks one of " + options.length + " archetypes at level " +
        options[0].levelAvailable + ". Each has its own feature ladder at 3rd, 6th, 10th, " +
        "14th and 17th level.");
      var g = el("div", "grid");
      options.forEach(function (o) {
        var b = el("button", "pick");
        b.setAttribute("aria-pressed", C.sub === o.id);
        b.innerHTML = "<h3>" + esc(o.name) + "</h3>" +
          '<div class="sub">unlocks at level ' + o.levelAvailable + "</div>" +
          '<div class="why">' + esc(o.tagline) + "</div>";
        b.onclick = function () { C.sub = o.id; delete C.isExample; save(); render(); };
        g.appendChild(b);
      });
      s.appendChild(g);
      if (!sub) { nav(s, 0, null); return; }
      var rule = el("div");
      rule.style.cssText = "border-top:1px solid var(--line-soft);margin:28px 0 0";
      s.appendChild(rule);
    }

    if (!sub) { nav(s, 0, 2); return; }
    head(s, options.length > 1 ? "Archetype" : "Step 02", sub.name,
      "The " + cl.name + " archetype from the book. Features grey out until your " +
      "character reaches the level that grants them.");

    var meta = el("div", "toolbar");
    meta.innerHTML =
      '<span class="chip lvl">' + esc(cl.name) + " · level " + sub.levelAvailable + "</span>" +
      '<span class="chip">' + esc(sub.tagline) + "</span>" +
      (sub.page ? '<span class="page-ref">Book p. ' + sub.page + "</span>"
                : sourceChip(sub));
    s.appendChild(meta);

    if (C.level < sub.levelAvailable) {
      var warn = el("div", "note");
      warn.innerHTML = "<b>Not yet</b><span>Your character is level " + C.level +
        ". The " + esc(sub.name) + " archetype comes online at level " +
        sub.levelAvailable + ", raise the level in the dossier to unlock it.</span>";
      s.appendChild(warn);
    }

    var intro = el("div", "prose");
    paras(sub.description).forEach(function (p) { intro.appendChild(el("p", null, esc(p))); });
    s.appendChild(intro);

    if (sub.tables) sub.tables.forEach(function (t) { s.appendChild(renderTable(t)); });

    groupFeatures(sub).forEach(function (f) {
      var live = C.level >= f.level;
      var box = el("div", "feature " + (live ? "live" : "locked"));
      var h = el("div", "feature-head");
      h.innerHTML = "<h4>" + esc(f.name) + '</h4><span class="chip lvl">Lv ' + f.level + "</span>";
      box.appendChild(h);
      renderBlocks(f.blocks, box);
      if (f.spellList) box.appendChild(spellListHTML(f.spellList));

      if (f.subs.length) {
        var n = choiceCount(f);
        if (n) {
          var picker = el("div", "chips");
          picker.style.margin = "4px 0 12px";
          f.subs.forEach(function (sf) {
            var key = f.name, cur = C.subChoices[key] || [];
            var on = cur.indexOf(sf.name) >= 0;
            var c = el("button", "chip" + (on ? " on" : ""), esc(sf.name));
            c.onclick = function () {
              var arr = (C.subChoices[key] || []).slice();
              var i = arr.indexOf(sf.name);
              if (i >= 0) arr.splice(i, 1);
              else { arr.push(sf.name); while (arr.length > n) arr.shift(); }
              C.subChoices[key] = arr; delete C.isExample; save(); render();
            };
            picker.appendChild(c);
          });
          var lab = el("div", "sub");
          lab.style.cssText = "font-family:var(--f-mono);font-size:10px;letter-spacing:.1em;" +
            "text-transform:uppercase;color:var(--ink-faint);margin:6px 0 4px";
          lab.textContent = "Choose " + n;
          box.appendChild(lab);
          box.appendChild(picker);
        }
        f.subs.forEach(function (sf) {
          var sb = el("div", "feature sub-feature");
          sb.appendChild(el("div", "feature-head", "<h4>" + esc(sf.name) + "</h4>"));
          renderBlocks(sf.blocks, sb);
          box.appendChild(sb);
        });
      }
      s.appendChild(box);
    });

    (sub.sidebars || []).forEach(function (sb) {
      if (!sb.text.length) return;
      var c = el("div", "callout");
      c.innerHTML = "<h5>" + esc(sb.title) + "</h5><p>" + esc(sb.text.join(" ")) + "</p>";
      s.appendChild(c);
    });
    (sub.statblocks || []).forEach(function (sb) {
      var box = el("div", "statblock");
      box.appendChild(el("h4", null, esc(sb.name)));
      (sb.lines || []).forEach(function (l) { box.appendChild(el("div", "sb-line", leadify(l))); });
      (sb.sections || []).forEach(function (sec) {
        box.appendChild(el("div", "sb-sec", esc(sec.name)));
        (sec.lines || []).forEach(function (l) { box.appendChild(el("div", "sb-line", leadify(l))); });
      });
      s.appendChild(box);
    });
    nav(s, 0, 2);
  }

  /* ================================================== STEP: 3, BACKGROUND */
  function stepBackground(s) {
    head(s, "Step 03", "Background & origin",
      "A background says what you did for money. An origin says what was done to you first. " +
      "Take one of each, they answer different questions.");

    if (X.origins) {
      var ob = el("div");
      ob.style.marginBottom = "26px";
      ob.appendChild(el("div", "eyebrow", "Origin " +
        '<span class="page-ref">Neon Ledger · pick one or roll a d12</span>'));
      var ochips = el("div", "chips");
      X.origins.table.rows.forEach(function (r) {
        var on = C.origin === r[1];
        var ob2 = el("button", "chip" + (on ? " on" : ""), esc(r[1]));
        ob2.onclick = function () { C.origin = on ? null : r[1]; delete C.isExample; save(); render(); };
        ochips.appendChild(ob2);
      });
      var roll = el("button", "chip tier", "Roll d12");
      roll.onclick = function () {
        C.origin = X.origins.table.rows[Math.floor(Math.random() * 12)][1];
        delete C.isExample; save(); render();
      };
      ochips.appendChild(roll);
      ob.appendChild(ochips);
      var chosen = X.origins.table.rows.filter(function (r) { return r[1] === C.origin; })[0];
      if (chosen) ob.appendChild(el("p", "origin-note", esc(chosen[2])));
      s.appendChild(ob);
      s.appendChild(el("div", "eyebrow", "Background · 15 from the book"));
    }

    var g = el("div", "grid");
    D.backgrounds.forEach(function (b) {
      var btn = el("button", "pick");
      btn.setAttribute("aria-pressed", C.bg === b.id);
      btn.innerHTML = "<h3>" + esc(b.name) + "</h3>" +
        '<div class="sub">' + esc(b.feature ? b.feature.name : "") + "</div>" +
        '<div class="why">' + esc(b.traits["Skill Proficiencies"] || "") + "</div>";
      btn.onclick = function () { if (C.bg !== b.id) C.bgPicks = []; C.bg = b.id; delete C.isExample; save(); render(); };
      g.appendChild(btn);
    });
    s.appendChild(g);

    var b = bgObj();
    if (b) {
      var det = el("div");
      det.style.marginTop = "26px";
      det.appendChild(el("div", "eyebrow", esc(b.name) + ' <span class="page-ref">· p. ' + b.page + "</span>"));
      var pr = el("div", "prose");
      paras(b.description).forEach(function (p) { pr.appendChild(el("p", null, esc(p))); });
      det.appendChild(pr);

      Object.keys(b.traits).forEach(function (k) {
        var row = el("div", "dos-row");
        row.innerHTML = '<span class="k">' + esc(k.replace(" Proficiencies", "")) +
          '</span><span class="v">' + esc(b.traits[k]) + "</span>";
        det.appendChild(row);
      });

      var g = skillGrant();
      if (g.n) {
        var picked = bgSkills().filter(function (s) { return g.from.indexOf(s) >= 0; });
        var box = el("div");
        box.style.margin = "14px 0 4px";
        box.appendChild(el("div", "eyebrow", "This background lets you choose " + g.n +
          ' <span class="sel-count' + (picked.length === g.n ? " full" : "") + '">' +
          picked.length + " / " + g.n + " picked</span>"));
        var chips = el("div", "chips");
        g.from.forEach(function (sk) {
          var on = picked.indexOf(sk) >= 0;
          var cb = el("button", "chip" + (on ? " on" : ""),
            esc(sk) + " <span style='opacity:.6'>" + D.skills[sk] + "</span>");
          cb.onclick = function () {
            var arr = (C.bgPicks || []).slice();
            var i = arr.indexOf(sk);
            if (i >= 0) arr.splice(i, 1);
            else { arr.push(sk); while (arr.length > g.n) arr.shift(); }
            C.bgPicks = arr; delete C.isExample; save(); render();
          };
          chips.appendChild(cb);
        });
        box.appendChild(chips);
        det.appendChild(box);
      }
      if (b.feature) {
        var fb = el("div", "feature live");
        fb.style.marginTop = "18px";
        fb.appendChild(el("div", "feature-head", "<h4>Feature: " + esc(b.feature.name) + "</h4>"));
        renderBlocks(b.feature.blocks, fb);
        det.appendChild(fb);
      }
      (b.characteristics || []).forEach(function (t) {
        var wrap = el("div");
        var bar = el("div", "toolbar");
        var die = parseInt((t.headers[0] || "d6").replace(/\D/g, ""), 10) || 6;
        var out = el("span", "roll-out");
        var key = b.id + "|" + t.title;
        if (C.traits[key]) out.textContent = "→ " + C.traits[key];
        var rb = el("button", "btn", "Roll " + t.headers[0]);
        rb.onclick = function () {
          var n = 1 + Math.floor(Math.random() * die);
          var row = t.rows[Math.min(n, t.rows.length) - 1];
          C.traits[key] = row ? row[1] : "";
          delete C.isExample; save(); render();
        };
        bar.appendChild(rb); bar.appendChild(out);
        wrap.appendChild(renderTable(t));
        wrap.appendChild(bar);
        det.appendChild(wrap);
      });
      s.appendChild(det);
    }
    nav(s, 1, C.bg ? 3 : null);
  }

  /* =================================================== STEP: 4, ABILITIES */
  function stepAbilities(s) {
    var cl = classByName[C.cls];
    head(s, "Step 04", "Ability scores",
      "Point buy, the standard array, rolled, or typed straight in. These are your starting " +
      "scores, ability score improvements and class features add to them, shown in green.");

    var bar = el("div", "toolbar");
    var seg = el("div", "seg");
    [["pointbuy", "Point buy"], ["array", "Standard array"], ["roll", "Roll 4d6"], ["manual", "Manual"]]
      .forEach(function (m) {
        var b = el("button", null, m[1] + (helpMode && m[0] === "array" ? " ★" : ""));
        if (helpMode && m[0] === "array") b.title = "Easiest option, recommended if you're new";
        b.setAttribute("aria-pressed", C.method === m[0]);
        b.onclick = function () {
          C.method = m[0];
          if (m[0] === "pointbuy") C.scores = { Str: 8, Dex: 8, Con: 8, Int: 8, Wis: 8, Cha: 8 };
          if (m[0] === "array") C.arrayMap = {};
          delete C.isExample; save(); render();
        };
        seg.appendChild(b);
      });
    bar.appendChild(seg);

    if (C.method === "pointbuy") {
      var used = pbSpent();
      var p = el("span", "pool" + (used > 27 ? " over" : ""));
      p.innerHTML = "Points <b>" + used + " / 27</b>";
      bar.appendChild(p);
    }
    if (C.method === "roll") {
      var rb = el("button", "btn", "Roll six sets");
      rb.onclick = function () {
        C.rolled = [];
        for (var i = 0; i < 6; i++) {
          var d = [0, 0, 0, 0].map(function () { return 1 + Math.floor(Math.random() * 6); })
            .sort(function (a, b) { return b - a; });
          C.rolled.push(d[0] + d[1] + d[2]);
        }
        C.arrayMap = {}; delete C.isExample; save(); render();
      };
      bar.appendChild(rb);
    }
    s.appendChild(bar);

    var pool = C.method === "array" ? ARRAY : (C.method === "roll" ? (C.rolled || []) : null);
    if (pool) {
      var taken = {};
      ABIL.forEach(function (a) { if (C.arrayMap[a] != null) taken[a] = C.arrayMap[a]; });
      var counts = {};
      pool.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
      Object.keys(taken).forEach(function (a) { counts[taken[a]] = (counts[taken[a]] || 0) - 1; });
      var avail = el("div", "chips");
      avail.style.marginBottom = "14px";
      if (!pool.length) avail.appendChild(el("span", "empty-state", "Roll to generate six scores."));
      Object.keys(counts).sort(function (a, b) { return b - a; }).forEach(function (v) {
        for (var i = 0; i < counts[v]; i++) avail.appendChild(el("span", "chip", v));
      });
      s.appendChild(avail);
    }

    var wrap = el("div", "abilities");
    var sc = scores(), rawSc = baseScores();
    ABIL.forEach(function (a) {
      var isPri = cl && cl.primary.indexOf(a) >= 0;
      var delta = sc[a] - rawSc[a];
      var box = el("div", "ab" + (isPri ? " primary" : ""));
      box.innerHTML = '<div class="nm">' + a + '</div><div class="sc">' + esc(rawSc[a]) +
        (delta ? ' <span style="font-size:14px;color:var(--signal)">+' + delta + "</span>" : "") +
        '</div><div class="md">' + sgn(mod(sc[a])) +
        (delta ? ' <span class="page-ref">at ' + sc[a] + "</span>" : "") + "</div>";
      var row = el("div", "row");
      if (C.method === "pointbuy") {
        var dec = el("button", null, "−"), inc = el("button", null, "+");
        dec.disabled = C.scores[a] <= 8;
        inc.disabled = C.scores[a] >= 15 ||
          pbSpent() - (PB_COST[C.scores[a]] || 0) + (PB_COST[C.scores[a] + 1] || 99) > 27;
        dec.setAttribute("aria-label", "Decrease " + ABIL_FULL[a]);
        inc.setAttribute("aria-label", "Increase " + ABIL_FULL[a]);
        dec.onclick = function () { C.scores[a]--; delete C.isExample; save(); render(); };
        inc.onclick = function () { C.scores[a]++; delete C.isExample; save(); render(); };
        row.appendChild(dec); row.appendChild(inc);
      } else if (C.method === "manual") {
        var inp = el("input");
        inp.type = "number"; inp.min = 1; inp.max = 30; inp.value = C.scores[a];
        inp.id = "ab-" + a;
        inp.style.cssText = "width:62px;text-align:center;background:var(--sunk);color:var(--ink);" +
          "border:1px solid var(--line);border-radius:2px;padding:3px;font-family:var(--f-mono)";
        inp.onchange = function () {
          C.scores[a] = Math.max(1, Math.min(30, parseInt(inp.value, 10) || 10));
          delete C.isExample; save(); render();
        };
        row.appendChild(inp);
      } else {
        var sel = el("select");
        sel.id = "ab-" + a;
        sel.setAttribute("aria-label", ABIL_FULL[a] + " score");
        sel.style.cssText = "background:var(--sunk);color:var(--ink);border:1px solid var(--line);" +
          "border-radius:2px;padding:3px 5px;font-family:var(--f-mono);font-size:12px";
        var opts = ["-"].concat((pool || []).slice().sort(function (x, y) { return y - x; })
          .filter(function (v, i, arr) { return arr.indexOf(v) === i; }));
        opts.forEach(function (o) {
          var op = el("option", null, o);
          op.value = o === "-" ? "" : o;
          if (String(C.arrayMap[a] || "") === String(op.value)) op.selected = true;
          sel.appendChild(op);
        });
        sel.onchange = function () {
          var v = parseInt(sel.value, 10);
          if (!v) delete C.arrayMap[a];
          else {
            // Only bump another ability off this value when the pool does not
            // actually contain enough copies of it. Rolled sets have duplicates.
            var have = (pool || []).filter(function (x) { return x === v; }).length;
            var others = ABIL.filter(function (o) { return o !== a && C.arrayMap[o] === v; });
            while (others.length >= have && others.length) delete C.arrayMap[others.shift()];
            C.arrayMap[a] = v;
          }
          delete C.isExample; save(); render();
        };
        row.appendChild(sel);
      }
      box.appendChild(row);
      wrap.appendChild(box);
    });
    s.appendChild(wrap);
    nav(s, 2, 4);
  }

  /* =============================================== STEP: 5, PROFICIENCIES */
  function stepProf(s) {
    var cl = classByName[C.cls];
    if (!cl) return needClass(s);
    var fromBg = bgSkills();
    head(s, "Step 05", "Skills & proficiencies",
      cl.name + " picks " + cl.skillCount + " skill" + (cl.skillCount > 1 ? "s" : "") +
      ". Your background's skills are already counted and can't be picked twice.");

    var n = C.skills.length;
    var cnt = el("div", "toolbar");
    cnt.innerHTML = '<span class="pool' + (n === cl.skillCount ? "" : " over") + '">Chosen <b>' +
      n + " / " + cl.skillCount + "</b></span>";
    s.appendChild(cnt);

    var g = el("div", "chips");
    g.style.marginBottom = "20px";
    cl.skills.forEach(function (sk) {
      var granted = fromBg.indexOf(sk) >= 0;
      var on = C.skills.indexOf(sk) >= 0;
      var b = el("button", "chip" + (on || granted ? " on" : ""),
        esc(sk) + " <span style='opacity:.6'>" + D.skills[sk] + "</span>" + (granted ? " ·bg" : ""));
      if (granted) { b.disabled = true; b.title = "Granted by your background"; }
      b.onclick = function () {
        var i = C.skills.indexOf(sk);
        if (i >= 0) C.skills.splice(i, 1);
        else if (C.skills.length < cl.skillCount) C.skills.push(sk);
        else toast("Pick limit reached");
        delete C.isExample; save(); render();
      };
      g.appendChild(b);
    });
    s.appendChild(g);

    var tech = D.skillsAndTools[0];
    var box = el("div", "callout");
    box.style.borderColor = "var(--accent)";
    box.innerHTML = "<h5 style='color:var(--accent)'>Technology: the book's new skill</h5>" +
      "<p>" + esc((tech.blocks[0] && tech.blocks[0].text) || "") + "</p>";
    var tb = el("button", "chip" + (C.techSwap ? " on" : ""),
      C.techSwap ? "✓ Taking Technology" : "Swap one skill for Technology");
    tb.onclick = function () {
      C.techSwap = !C.techSwap;
      if (!C.techSwap) C.techReplaces = null;
      delete C.isExample; save(); render();
    };
    var wrapT = el("div");
    wrapT.style.marginTop = "8px";
    wrapT.appendChild(tb);
    if (C.techSwap) {
      var pool = bgSkills().concat(C.skills).filter(function (v, i, a) {
        return a.indexOf(v) === i && v !== "Technology";
      });
      wrapT.appendChild(el("p", "slot-note",
        pool.length ? "It replaces one proficiency you already have, choose which:"
                    : "Pick your skills above first, then choose which one Technology replaces."));
      var pc = el("div", "chips");
      pool.forEach(function (sk) {
        var on = C.techReplaces === sk;
        var cb = el("button", "chip" + (on ? " on" : ""), esc(sk));
        cb.onclick = function () {
          C.techReplaces = on ? null : sk; delete C.isExample; save(); render();
        };
        pc.appendChild(cb);
      });
      wrapT.appendChild(pc);
      if (!C.techReplaces && pool.length)
        wrapT.appendChild(el("p", "slot-note tone-alert",
          "Until you choose, Technology is being added as a free extra skill."));
    }
    box.appendChild(wrapT);
    s.appendChild(box);

    var prof = el("div");
    prof.style.marginTop = "22px";
    [["Armor", cl.armor], ["Weapons", cl.weapons], ["Firearms", cl.firearms],
     ["Tools", cl.tools], ["Saving throws", cl.saves.map(function (a) { return ABIL_FULL[a]; }).join(", ")]]
      .forEach(function (p) {
        var r = el("div", "dos-row");
        r.innerHTML = '<span class="k">' + p[0] + '</span><span class="v">' + esc(p[1]) + "</span>";
        prof.appendChild(r);
      });
    s.appendChild(prof);

    var fp = tableByTitle["Class Firearm Proficiencies"];
    if (fp) {
      var note = el("div", "note");
      note.innerHTML = "<b>Firearm rule</b><span>If you're proficient with simple or martial " +
        "weapons, you're proficient with simple or martial firearms. Some classes get extra " +
        "firearms on top, see the table below.</span>";
      s.appendChild(note);
      s.appendChild(renderTable(fp));
    }
    nav(s, 3, 5);
  }

  /* ==================================================== STEP: 6, OPTIONS */
  function optionList(s, title, items, sel, limit, note) {
    var sec = el("div");
    sec.style.marginBottom = "30px";
    var h = el("div", "eyebrow", esc(title) +
      '<span class="sel-count' + (sel.length >= limit ? " full" : "") + '">' +
      sel.length + (limit < 99 ? " / " + limit : "") + " chosen</span>");
    sec.appendChild(h);
    if (note) sec.appendChild(el("p", "empty-state", esc(note)));
    items.forEach(function (it) {
      var on = sel.indexOf(it.name) >= 0;
      var e = el("div", "entry");
      var head = el("div", "entry-head");
      var b = el("button", "chip" + (on ? " on" : ""), on ? "✓ Taken" : "Take");
      b.onclick = function () {
        var i = sel.indexOf(it.name);
        if (i >= 0) sel.splice(i, 1);
        else if (sel.length < limit) sel.push(it.name);
        else toast("Limit reached");
        delete C.isExample; save(); render();
      };
      head.innerHTML = "<h4>" + esc(it.name) + "</h4>" +
        (it.prerequisite ? '<span class="chip warn">Prereq: ' + esc(it.prerequisite) + "</span>" : "") +
        (it.item ? '<span class="chip tier">Item: ' + esc(it.item) + "</span>" : "");
      head.appendChild(b);
      e.appendChild(head);
      renderBlocks(it.blocks, e);
      sec.appendChild(e);
    });
    s.appendChild(sec);
  }
  function stepOptions(s) {
    var cl = classByName[C.cls];
    if (!cl) return needClass(s);
    head(s, "Step 06", "Level-up choices",
      "Every level you cross hands you something. " + cl.name + " ability score improvements " +
      "arrive at " + myAsiLevels().map(ordinal).join(", ").replace(/, ([^,]*)$/, " and $1") +
      ", take the increase or a feat instead. Classes that learn things as they go pick " +
      "them here too.");

    /* ---- ASI / feat slots ---- */
    var slots = asiSlots();
    var sec = el("div");
    sec.style.marginBottom = "32px";
    var filled = slots.filter(function (x) { return x.type; }).length;
    sec.appendChild(el("div", "eyebrow", "Ability score improvements " +
      '<span class="sel-count' + (filled === slots.length && slots.length ? " full" : "") + '">' +
      filled + " / " + slots.length + " taken</span>"));

    if (!slots.length) {
      var nextAsi = myAsiLevels().filter(function (l) { return l > C.level; })[0];
      sec.appendChild(el("p", "empty-state",
        "None yet, your first arrives at level " + nextAsi + ". Move the level slider in the " +
        "dossier to get there."));
    }

    slots.forEach(function (slot, i) {
      var lvl = myAsiLevels()[i];
      var card = el("div", "slot");
      var hd = el("div", "slot-head");
      hd.innerHTML = '<span class="chip lvl">Level ' + lvl + "</span>";
      var seg = el("div", "seg");
      [["asi", "Ability increase"], ["feat", "Feat"]].forEach(function (m) {
        var b = el("button", null, m[1]);
        b.setAttribute("aria-pressed", slot.type === m[0]);
        b.onclick = function () {
          var arr = asiSlots();
          arr[i] = m[0] === "asi" ? { type: "asi", a: null, b: null } : { type: "feat", name: null };
          C.asi = arr; syncFeats(); delete C.isExample; save(); render();
        };
        seg.appendChild(b);
      });
      hd.appendChild(seg);
      card.appendChild(hd);

      if (slot.type === "asi") {
        var sc = baseScores();
        var note = el("div", "slot-note", "Raise two scores by 1, or one score by 2 " +
          "(pick the same score twice). Nothing goes above 20.");
        card.appendChild(note);
        var chips = el("div", "chips");
        ABIL.forEach(function (a) {
          var count = [slot.a, slot.b].filter(function (x) { return x === a; }).length;
          var b = el("button", "chip" + (count ? " on" : ""),
            a + (count ? " +" + count : ""));
          b.onclick = function () {
            var arr = asiSlots(), sl = arr[i];
            if (!sl.a) sl.a = a;            // first +1
            else if (!sl.b) sl.b = a;       // second +1, same score again gives +2
            else { sl.a = sl.b; sl.b = a; } // both spent: roll the oldest off
            C.asi = arr; delete C.isExample; save(); render();
          };
          chips.appendChild(b);
        });
        if (slot.a || slot.b) {
          var clr = el("button", "chip", "Clear");
          clr.onclick = function () {
            var arr = asiSlots(); arr[i] = { type: "asi", a: null, b: null };
            C.asi = arr; delete C.isExample; save(); render();
          };
          chips.appendChild(clr);
        }
        card.appendChild(chips);
      } else if (slot.type === "feat") {
        var picked = slot.name;
        var wrap = el("div");
        wrap.style.marginTop = "8px";
        if (picked) {
          var ft = ALL_FEATS.filter(function (f) { return f.name === picked; })[0];
          var e = el("div", "entry");
          e.style.cssText = "padding-top:0;border-bottom:none";
          var eh = el("div", "entry-head");
          eh.innerHTML = "<h4>" + esc(picked) + "</h4>" +
            (ft && !isBook(ft) ? sourceChip(ft) : "") +
            (ft && ft.prerequisite ? '<span class="chip warn">Prereq: ' + esc(ft.prerequisite) + "</span>" : "");
          var clear = el("button", "chip", "Change");
          clear.onclick = function () {
            var arr = asiSlots(); arr[i] = { type: "feat", name: null };
            C.asi = arr; syncFeats(); delete C.isExample; save(); render();
          };
          eh.appendChild(clear);
          e.appendChild(eh);

          var fx = FEAT_EFFECTS[picked];
          if (fx) {
            var pickRow = el("div", "feat-abil");
            if (fx.abil) {
              pickRow.appendChild(el("span", "chip on", "+1 " + ABIL_FULL[fx.abil]));
            } else {
              pickRow.appendChild(el("div", "feat-abil-q", "Which score does this raise?"));
              var chips = el("div", "chips");
              fx.choose.forEach(function (ab) {
                var on = slot.abil === ab;
                var cb = el("button", "chip" + (on ? " on" : ""), "+1 " + ABIL_FULL[ab]);
                cb.setAttribute("aria-pressed", on);
                cb.onclick = function () {
                  var arr = asiSlots();
                  arr[i] = { type: "feat", name: picked, abil: on ? null : ab };
                  C.asi = arr; syncFeats(); delete C.isExample; save(); render();
                };
                chips.appendChild(cb);
              });
              pickRow.appendChild(chips);
              if (!slot.abil) {
                pickRow.appendChild(el("p", "origin-note",
                  "Pick one. Until you do, this feat's increase is not on your sheet."));
              }
            }
            e.appendChild(pickRow);
          }

          if (ft) renderBlocks(ft.blocks, e);
          wrap.appendChild(e);
        } else {
          var fq = (featQ[i] || "").toLowerCase().trim();
          var fin = el("input");
          fin.type = "search";
          fin.id = "featFilter" + i;
          fin.className = "search";
          fin.style.marginBottom = "10px";
          fin.setAttribute("aria-label", "Filter feats");
          fin.placeholder = "Filter " + ALL_FEATS.length + " feats…";
          fin.value = featQ[i] || "";
          fin.oninput = function () { featQ[i] = fin.value; restage("featFilter" + i); };
          wrap.appendChild(fin);

          var shown = ALL_FEATS.filter(function (f) {
            return !fq || (f.name + " " + (f.prerequisite || "") + " " +
              JSON.stringify(f.blocks)).toLowerCase().indexOf(fq) >= 0;
          });
          if (!shown.length)
            wrap.appendChild(el("div", "no-results", "No feat matches “" + esc(featQ[i]) + "”."));
          shown.forEach(function (f) {
            var already = takenFeats().indexOf(f.name) >= 0;
            var row = el("div", "feat-row" + (already ? " taken" : ""));
            var top = el("div", "do-top");
            top.innerHTML = "<b>" + esc(f.name) + "</b>" +
              '<span class="tag">' + esc(sourceName(f)) + "</span>" +
              (f.prerequisite ? '<span class="tag use">Needs: ' + esc(f.prerequisite) + "</span>" : "");
            var take = el("button", "chip", already ? "Taken" : "Take");
            if (already) { take.disabled = true; take.style.opacity = ".35"; }
            take.onclick = function () {
              var arr = asiSlots(); arr[i] = { type: "feat", name: f.name };
              C.asi = arr; featQ[i] = ""; syncFeats(); delete C.isExample; save(); render();
            };
            top.appendChild(take);
            row.appendChild(top);
            row.appendChild(el("p", null, esc(gistOf(f))));
            wrap.appendChild(row);
          });
        }
        card.appendChild(wrap);
      }
      sec.appendChild(card);
    });
    s.appendChild(sec);

    /* ---- class picks that scale with level ---- */
    var sp = scalingSpec();
    if (sp) {
      var key = sp.spec.key;
      var chosen = (C.picks && C.picks[key]) || [];
      var valid = chosen.filter(function (n) {
        return sp.options.some(function (o) {
          return o.name === n && (!sp.maxTier || !o.tier || parseInt(o.tier, 10) <= sp.maxTier);
        });
      });
      var ps = el("div");
      ps.style.marginBottom = "32px";
      ps.appendChild(el("div", "eyebrow", sp.spec.label + " known " +
        '<span class="sel-count' + (valid.length === sp.allowed ? " full" :
          (valid.length > sp.allowed ? " over" : "")) + '">' +
        valid.length + " / " + sp.allowed + "</span>"));
      ps.appendChild(el("p", "slot-note", esc(sp.spec.note) +
        (sp.maxTier ? " At level " + C.level + " you can run up to tier " + sp.maxTier + "." : "")));
      var og = el("div", "chips");
      sp.options.forEach(function (o) {
        var locked = sp.maxTier && o.tier && parseInt(o.tier, 10) > sp.maxTier;
        var on = valid.indexOf(o.name) >= 0;
        var b = el("button", "chip" + (on ? " on" : "") + (locked ? "" : ""),
          (o.tier ? "T" + o.tier + " · " : "") + esc(o.name));
        b.title = o.desc || "";
        if (locked) { b.disabled = true; b.style.opacity = ".3"; b.title = "Needs a higher level"; }
        b.onclick = function () {
          C.picks = C.picks || {};
          var arr = (C.picks[key] || []).slice();
          var ix = arr.indexOf(o.name);
          if (ix >= 0) arr.splice(ix, 1);
          else { arr.push(o.name); while (arr.length > sp.allowed) arr.shift(); }
          C.picks[key] = arr; delete C.isExample; save(); render();
        };
        og.appendChild(b);
      });
      ps.appendChild(og);
      if (valid.length) {
        var det = el("div");
        det.style.marginTop = "12px";
        valid.forEach(function (n) {
          var o = sp.options.filter(function (x) { return x.name === n; })[0];
          var r = el("div", "trait-line");
          r.innerHTML = '<span class="k">' + (o.tier ? "Tier " + o.tier + " · " : "") +
            esc(n) + "</span>" + esc(o.desc || "");
          det.appendChild(r);
        });
        ps.appendChild(det);
      }
      s.appendChild(ps);
    }

    /* ---- Stackborn sleeve package ---- */
    if (C.cls === "Stackborn") {
      var st = findTable("Sleeve Packages");
      if (st) {
        var ss = el("div");
        ss.style.marginBottom = "32px";
        ss.appendChild(el("div", "eyebrow", "Sleeve package " +
          '<span class="sel-count' + (C.sleeve ? " full" : "") + '">' +
          (C.sleeve ? "1 / 1" : "0 / 1") + "</span>"));
        ss.appendChild(el("p", "slot-note",
          "Your current body is equipment. Swap the package whenever you gain a level."));
        var sg = el("div", "chips");
        st.rows.forEach(function (r) {
          var on = C.sleeve === r[0];
          var b = el("button", "chip" + (on ? " on" : ""), esc(r[0]));
          b.title = r[1];
          b.onclick = function () { C.sleeve = on ? null : r[0]; delete C.isExample; save(); render(); };
          sg.appendChild(b);
        });
        ss.appendChild(sg);
        if (C.sleeve) {
          var row = st.rows.filter(function (r) { return r[0] === C.sleeve; })[0];
          ss.appendChild(el("p", "origin-note", esc(row[1])));
        }
        s.appendChild(ss);
      }
    }

    /* ---- book-class options ---- */
    var hasStyle = ["Fighter", "Paladin", "Ranger"].indexOf(cl.name) >= 0;
    if (hasStyle) {
      var fs = el("div");
      fs.style.marginBottom = "30px";
      fs.appendChild(el("div", "eyebrow", "Fighting style: choose one"));
      D.fightingStyles.forEach(function (st2) {
        var on = C.style === st2.name;
        var e = el("div", "entry");
        var h = el("div", "entry-head");
        var b = el("button", "chip" + (on ? " on" : ""), on ? "✓ Chosen" : "Choose");
        b.onclick = function () { C.style = on ? null : st2.name; delete C.isExample; save(); render(); };
        h.innerHTML = "<h4>" + esc(st2.name) + "</h4>";
        h.appendChild(b);
        e.appendChild(h);
        renderBlocks(st2.blocks, e);
        fs.appendChild(e);
      });
      s.appendChild(fs);
    }
    if (cl.name === "Warlock")
      optionList(s, "Warlock invocations", D.invocations, C.invocations, 99,
        "The book's invocations, on top of the Player's Handbook list.");
    if (cl.name === "Artificer")
      optionList(s, "Artificer infusions", D.infusions, C.infusions, 99, null);

    nav(s, 4, 6);
  }

  /* ============================================== STEP: 7, CHROME & GEAR */
  var gearQ = "";
  var featQ = {};
  function collapsible(title, badges, blocks, open) {
    var d = el("details", "item");
    if (open) d.open = true;
    var sm = el("summary");
    sm.appendChild(el("h4", null, esc(title)));
    if (badges) sm.appendChild(badges);
    d.appendChild(sm);
    var body = el("div", "body");
    renderBlocks(blocks, body);
    d.appendChild(body);
    return d;
  }
  function humCostFor(tier) {
    var c = TIER_COST[tier] || 0;
    if (takenFeats().indexOf("Chrome Junkie") >= 0) c = Math.max(1, c - 1);
    return c;
  }

  function stepGear(s) {
    head(s, "Step 07", "Chrome & gear",
      "Cyberware is rated by tier: higher tiers cost exponentially more credits and more of " +
      "you. Every implant shows what it takes off your Humanity.");

    /* what's already installed, always in view */
    var ib = el("div", "installed-bar");
    ib.appendChild(el("div", "k", "Installed · " + fmtCredits(spend())));
    var list = el("div", "list");
    C.cyber.forEach(function (x) {
      var b = el("button", "chip on", esc(x.name) + " T" + esc(x.tier) + " ✕");
      b.title = "Remove";
      b.onclick = function () {
        C.cyber = C.cyber.filter(function (y) { return !(y.name === x.name && y.tier === x.tier); });
        delete C.isExample; save(); render();
      };
      list.appendChild(b);
    });
    C.augments.forEach(function (a) {
      var b = el("button", "chip on", esc(a) + " ✕");
      b.title = "Remove";
      b.onclick = function () {
        C.augments = C.augments.filter(function (y) { return y !== a; });
        delete C.isExample; save(); render();
      };
      list.appendChild(b);
    });
    C.gear.forEach(function (g) {
      var b = el("button", "chip on", esc(g.name) + " ✕");
      b.title = "Remove";
      b.onclick = function () {
        C.gear = C.gear.filter(function (y) { return y.key !== g.key; });
        delete C.isExample; save(); render();
      };
      list.appendChild(b);
    });
    if (!list.children.length)
      list.appendChild(el("span", "empty-state", "Nothing installed yet."));
    ib.appendChild(list);
    s.appendChild(ib);

    var hp = el("div", "callout");
    hp.style.borderColor = "var(--" + HSTATE[humanity().state][0] + ")";
    hp.appendChild(el("h5", null, "Humanity: every implant is a piece of you that used to be meat"));
    hp.appendChild(humanityMeter(false));
    var em = essenceMeter();
    if (em) hp.appendChild(em);
    s.appendChild(hp);

    s.appendChild(inventoryPanel());

    /* filter */
    var fb = el("div", "filter-bar");
    var fi = el("input");
    fi.id = "gearFilter";
    fi.type = "search";
    fi.setAttribute("aria-label", "Filter chrome and gear");
    fi.placeholder = "Filter implants, augments and gear…";
    fi.value = gearQ;
    fi.oninput = function () { gearQ = fi.value; restage("gearFilter"); };
    fb.appendChild(fi);
    var expandAll = el("button", "chip", "Expand all");
    expandAll.onclick = function () {
      var open = !$("details.item[open]");
      document.querySelectorAll("details.item").forEach(function (d) { d.open = open; });
      expandAll.textContent = T(open ? "Collapse all" : "Expand all");
    };
    fb.appendChild(expandAll);
    s.appendChild(fb);

    var q = gearQ.toLowerCase().trim();
    function hit(name, text) {
      return !q || (name + " " + (text || "")).toLowerCase().indexOf(q) >= 0;
    }

    /* cyberware */
    var cw = D.cyberware.filter(function (c) {
      return hit(c.name, JSON.stringify(c.blocks));
    });
    var cs = el("div");
    cs.appendChild(el("div", "eyebrow", "Cyberware · " + cw.length +
      (cw.length !== D.cyberware.length ? " of " + D.cyberware.length : "") + " implants"));
    cw.forEach(function (c) {
      var chips = el("span", "chips");
      tiersOf(c).forEach(function (t) {
        var cost = cyberCost[c.name.toLowerCase() + "|" + t];
        var on = C.cyber.some(function (x) { return x.name === c.name && x.tier === t; });
        var b = el("button", "chip" + (on ? " on" : " tier"),
          "T" + t + ' · <span class="hum-cost">−' + humCostFor(t) + " HUM</span>" +
          (cost ? " · " + esc(cost) : ""));
        b.onclick = function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          var i = -1;
          C.cyber.forEach(function (x, k) { if (x.name === c.name && x.tier === t) i = k; });
          if (i >= 0) C.cyber.splice(i, 1); else C.cyber.push({ name: c.name, tier: t });
          delete C.isExample; save(); render();
        };
        chips.appendChild(b);
      });
      cs.appendChild(collapsible(c.name, chips, c.blocks, !!q));
    });
    if (!cw.length && q) cs.appendChild(el("div", "no-results", "No implants match “" + esc(gearQ) + "”."));
    s.appendChild(cs);

    /* augments */
    var ag = D.augments.filter(function (a) { return hit(a.name, JSON.stringify(a.blocks)); });
    var as2 = el("div");
    as2.style.marginTop = "26px";
    as2.appendChild(el("div", "eyebrow", "Augments · " + ag.length +
      (ag.length !== D.augments.length ? " of " + D.augments.length : "")));
    ag.forEach(function (a) {
      var on = C.augments.indexOf(a.name) >= 0;
      var cost = augCost[a.name.toLowerCase()];
      var chips = el("span", "chips");
      var b = el("button", "chip" + (on ? " on" : ""),
        (on ? "✓ " : "") + '<span class="hum-cost">−1 HUM</span>' + (cost ? " · " + esc(cost) : ""));
      b.onclick = function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var i = C.augments.indexOf(a.name);
        if (i >= 0) C.augments.splice(i, 1); else C.augments.push(a.name);
        delete C.isExample; save(); render();
      };
      chips.appendChild(b);
      as2.appendChild(collapsible(a.name, chips, a.blocks, !!q));
    });
    if (!ag.length && q) as2.appendChild(el("div", "no-results", "No augments match “" + esc(gearQ) + "”."));
    s.appendChild(as2);

    /* equipment tables, collapsed */
    ["Firearm List", "Armor", "Melee Weapons", "Gear List"].forEach(function (tn) {
      var t = tableByTitle[tn];
      if (!t) return;
      var rows = t.rows.filter(function (r) {
        return r.filter(function (c) { return c !== ""; }).length === 1 || hit(r[0], r.join(" "));
      });
      var real = rows.filter(function (r) { return r.filter(function (c) { return c !== ""; }).length > 1; });
      if (q && !real.length) return;

      var wrap = el("div");
      wrap.style.marginTop = "22px";
      var tog = el("button", "sec-toggle");
      var open = !!q;
      tog.setAttribute("aria-expanded", open);
      tog.innerHTML = esc(tn) + '<span class="count">' + real.length + " items</span>";
      var panel = el("div");
      panel.hidden = !open;
      tog.onclick = function () {
        panel.hidden = !panel.hidden;
        tog.setAttribute("aria-expanded", !panel.hidden);
      };
      wrap.appendChild(tog);

      var w = el("div", "tbl-wrap wide");
      var tb = el("table");
      var tr = el("tr");
      tr.appendChild(el("th", null, ""));
      t.headers.forEach(function (h) { tr.appendChild(el("th", null, esc(T(h)))); });
      var th = el("thead"); th.appendChild(tr); tb.appendChild(th);
      var body = el("tbody");
      rows.forEach(function (r) {
        var filled = r.filter(function (c) { return c !== ""; }).length;
        if (filled === 1) {
          var gr = el("tr", "group");
          var td = el("td", null, esc(r[0]));
          td.colSpan = r.length + 1;
          gr.appendChild(td); body.appendChild(gr); return;
        }
        var row = el("tr");
        var key = tn + "|" + r[0];
        var on = C.gear.some(function (g) { return g.key === key; });
        var cell = el("td");
        var b = el("button", "chip" + (on ? " on" : ""), on ? "✓" : "+");
        b.setAttribute("aria-label", (on ? "Remove " : "Add ") + r[0]);
        b.onclick = function () {
          var i = -1;
          C.gear.forEach(function (g, k) { if (g.key === key) i = k; });
          if (i >= 0) C.gear.splice(i, 1);
          else {
            var ng = { key: key, name: r[0], cost: r[1] }, wt = weightFor(key);
            if (wt !== null) ng.wt = wt;
            C.gear.push(ng);
          }
          delete C.isExample; save(); render();
        };
        cell.appendChild(b);
        row.appendChild(cell);
        r.forEach(function (c) { row.appendChild(el("td", null, esc(c))); });
        body.appendChild(row);
      });
      tb.appendChild(body); w.appendChild(tb); panel.appendChild(w);
      wrap.appendChild(panel);
      s.appendChild(wrap);
    });
    nav(s, 5, 7);
  }

  /* ========================================================= inventory === */
  /* Gear carries a count and a weight. The weight is read from the book's
     own Weight column when an item is added, and filled in for older saves
     by looking the item up again. Custom items carry whatever was typed. */
  function parseWeight(s) {
    var m = /([\d.]+)\s*lb/i.exec(String(s == null ? "" : s));
    return m && isFinite(+m[1]) ? +m[1] : null;
  }
  function weightFor(key) {
    var ix = String(key || "").indexOf("|");
    if (ix < 0) return null;
    var t = tableByTitle[key.slice(0, ix)];
    if (!t) return null;
    var col = t.headers.indexOf("Weight");
    if (col < 0) return null;
    var nm = key.slice(ix + 1);
    var r = t.rows.filter(function (x) { return x[0] === nm; })[0];
    return r ? parseWeight(r[col]) : null;
  }
  function gearQty(g) { return g.qty > 0 ? g.qty : 1; }
  function carried() {
    var w = C.gear.reduce(function (a, g) { return a + (g.wt || 0) * gearQty(g); }, 0);
    return Math.round(w * 10) / 10;
  }
  function carryCap() { return scores().Str * 15; }
  /* A campaign's starting money wins over the background's credit stick. */
  function startingCredits() {
    var camp = C.campaign ? campById(C.campaign) : null;
    if (camp && camp.startingCredits && parseCredits(camp.startingCredits) > 0)
      return { n: parseCredits(camp.startingCredits), from: camp.name };
    var b = bgObj(), eq = b && b.traits ? String(b.traits.Equipment || "") : "";
    var m = /credit stick with ([\d,]+)\s*₵/i.exec(eq);
    return m ? { n: parseCredits(m[1]), from: b.name } : null;
  }
  function inventoryPanel() {
    var box = el("div", "callout inv");
    box.appendChild(el("h5", null, "Credits and carrying"));

    var cr = el("div", "inv-row");
    cr.appendChild(el("span", "k", "Credits"));
    var ci = el("input");
    ci.type = "number"; ci.min = "0"; ci.inputMode = "numeric"; ci.id = "invCredits";
    ci.value = C.credits == null ? "" : String(C.credits);
    ci.setAttribute("aria-label", "Credits");
    ci.onchange = function () {
      var v = ci.value.trim();
      C.credits = v === "" ? null : Math.max(0, Math.round(+v) || 0);
      delete C.isExample; save(); render();
    };
    cr.appendChild(ci);
    var sb = el("button", "chip", "Starting credits");
    sb.onclick = function () {
      var sc = startingCredits();
      if (!sc) { toast("Pick a background first"); return; }
      C.credits = sc.n; delete C.isExample; save(); render();
      toast("Credits set from " + sc.from);
    };
    cr.appendChild(sb);
    box.appendChild(cr);
    if (C.credits != null) {
      var left = C.credits - spend();
      var lr = el("div", "inv-row");
      lr.appendChild(el("span", "k", "Spent"));
      lr.appendChild(el("b", null, esc(fmtCredits(spend()))));
      lr.appendChild(el("span", "k", "Left"));
      lr.appendChild(el("b", left < 0 ? "tone-alert" : "tone-signal", esc(fmtCredits(left))));
      box.appendChild(lr);
    }

    var w = carried(), cap = carryCap(), str = scores().Str;
    var wr = el("div", "inv-carry");
    wr.appendChild(el("span", "k", "Carrying"));
    wr.appendChild(el("b", null, esc(String(w)) + " lb"));
    wr.appendChild(el("span", "page-ref", "of " + cap + " lb"));
    var bar = el("div", "inv-bar");
    var fill = el("div", "inv-fill" + (w > str * 10 ? " bad" : w > str * 5 ? " hurt" : ""));
    fill.style.width = Math.min(100, cap ? (w / cap) * 100 : 0) + "%";
    bar.appendChild(fill);
    wr.appendChild(bar);
    box.appendChild(wr);
    if (w > cap) box.appendChild(el("p", "tone-alert", "Over your carrying capacity: you can push or drag it, but not carry it."));
    else if (w > str * 10) box.appendChild(el("p", "tone-alert", "Very heavy: speed drops by 20 ft, and disadvantage on Strength, Dexterity and Constitution checks, attacks and saves."));
    else if (w > str * 5) box.appendChild(el("p", "tone-gold", "Heavy: speed drops by 10 ft."));

    if (C.gear.length) {
      var list = el("div", "inv-list");
      C.gear.forEach(function (g, i) {
        var line = el("div", "inv-item");
        var nm = el("span", "n");
        nm.textContent = g.name;
        if (g.custom) nm.setAttribute("data-nolang", "");
        line.appendChild(nm);
        var q = el("span", "qty");
        var minus = el("button", "chip", "−");
        minus.setAttribute("aria-label", "One fewer " + g.name);
        minus.onclick = function () { if (gearQty(g) > 1) { C.gear[i].qty = gearQty(g) - 1; save(); render(); } };
        var plus = el("button", "chip", "+");
        plus.setAttribute("aria-label", "One more " + g.name);
        plus.onclick = function () { C.gear[i].qty = Math.min(999, gearQty(g) + 1); save(); render(); };
        q.appendChild(minus);
        q.appendChild(el("b", null, "×" + gearQty(g)));
        q.appendChild(plus);
        line.appendChild(q);
        line.appendChild(el("span", "wt", g.wt != null ? esc(String(Math.round(g.wt * gearQty(g) * 10) / 10)) + " lb" : "-"));
        line.appendChild(el("span", "cost", esc(g.cost || "-")));
        var rm = el("button", "chip warn", "✕");
        rm.setAttribute("aria-label", "Remove " + g.name);
        rm.onclick = function () { C.gear.splice(i, 1); delete C.isExample; save(); render(); };
        line.appendChild(rm);
        list.appendChild(line);
      });
      box.appendChild(list);
    }

    var add = el("div", "inv-add");
    add.appendChild(el("span", "k", "Something not in the book"));
    var an = el("input"); an.placeholder = "Item"; an.setAttribute("aria-label", "Item name");
    var ac = el("input"); ac.placeholder = "Cost"; ac.setAttribute("aria-label", "Item cost");
    var aw = el("input"); aw.type = "number"; aw.min = "0"; aw.step = "0.1"; aw.placeholder = "lb";
    aw.setAttribute("aria-label", "Item weight in pounds");
    var ab = el("button", "btn", "Add item");
    ab.onclick = function () {
      var nm = an.value.trim();
      if (!nm) { an.focus(); return; }
      var wt = aw.value === "" ? null : Math.max(0, +aw.value || 0);
      C.gear.push({ key: "Custom|" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
                    name: nm.slice(0, 80), cost: ac.value.trim().slice(0, 40), qty: 1, wt: wt, custom: true });
      delete C.isExample; save(); render();
    };
    [an, ac, aw, ab].forEach(function (x) { add.appendChild(x); });
    box.appendChild(add);
    return box;
  }

  /* ================================================== the level-up panel === */
  /* Raising the level opens this at the top of the page instead of a toast:
     what arrived, what the numbers became, and what's still to choose. It
     stays until Done, and follows further raises in the same sitting. */
  var levelUp = null;   // { from, to }
  function atLevel(n, fn) {
    var keep = C.level;
    C.level = n;
    try { return fn(); } finally { C.level = keep; }
  }
  function pendingChoices() {
    var out = [];
    var unspent = asiSlotCount() - asiSlots().filter(function (x) { return x.type; }).length;
    if (unspent > 0) out.push({ text: unspent + " ability/feat choice" + (unspent === 1 ? "" : "s"), step: 5 });
    var spN = scalingSpec();
    var pickShort = spN ? spN.allowed - ((C.picks && C.picks[spN.spec.key]) || []).length : 0;
    if (pickShort > 0) {
      var lbl = spN.spec.label.toLowerCase();
      out.push({ text: pickShort + " " + (pickShort === 1 ? lbl.replace(/s$/, "") : lbl), step: 5 });
    }
    var sub = mySub(), subs = subsFor(C.cls);
    if (!sub && subs.length && subs[0].levelAvailable <= C.level)
      out.push({ text: "your archetype", step: 1 });
    return out;
  }
  function levelUpPanel() {
    if (!levelUp || !C.cls || levelUp.to <= levelUp.from) return null;
    var from = levelUp.from, to = levelUp.to;
    var box = el("div", "lvlup");
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Level up");
    var hd = el("div", "lvlup-head");
    hd.appendChild(el("h3", null, "Level up: " + from + " → " + to));
    var done = el("button", "btn", "Done");
    done.onclick = function () { levelUp = null; render(); };
    hd.appendChild(done);
    box.appendChild(hd);

    var rows = ladder().filter(function (r) { return r.level > from && r.level <= to; });
    var gained = rows.reduce(function (a, r) { return a.concat(r.gains); }, []);
    if (myAsiLevels().some(function (l) { return l > from && l <= to; }) &&
        gained.indexOf("Ability Score Improvement") < 0) gained.push("Ability Score Improvement");
    if (gained.length) box.appendChild(el("p", "lvlup-sum", esc("Level " + to + ": gained " + gained.slice(0, 3).join(", ") +
      (gained.length > 3 ? " +" + (gained.length - 3) + " more" : ""))));

    if (!gained.length) box.appendChild(el("p", "page-ref",
      "Nothing new from the Textbook at these levels. Your class's own features are in the Player's Handbook."));
    var nums = el("div", "lvlup-nums");
    [["Max HP", atLevel(from, maxHP), maxHP()], ["Proficiency", sgn(profBonus(from)), sgn(profBonus(to))]].forEach(function (x) {
      var n = el("div", "lvlup-num");
      n.appendChild(el("span", "k", esc(x[0])));
      n.appendChild(el("b", null, esc(String(x[1])) + " → " + esc(String(x[2]))));
      nums.appendChild(n);
    });
    box.appendChild(nums);

    if (rows.length) {
      var ol = el("ul", "lvlup-list");
      rows.forEach(function (r) {
        if (!r.gains.length) return;
        var li = el("li");
        li.appendChild(el("b", null, "Level " + r.level));
        li.appendChild(el("span", null, esc(r.gains.join(", "))));
        ol.appendChild(li);
      });
      if (ol.children.length) box.appendChild(ol);
    }

    var todo = pendingChoices();
    if (todo.length) {
      box.appendChild(el("div", "eyebrow", "Still to choose"));
      todo.forEach(function (t) {
        var line = el("div", "lvlup-todo");
        line.appendChild(el("span", null, esc(t.text)));
        var go = el("button", "btn primary", "Take me there");
        go.onclick = function () { step = t.step; mode = "forge"; render(); window.scrollTo(0, 0); };
        line.appendChild(go);
        box.appendChild(line);
      });
    } else {
      box.appendChild(el("p", "page-ref", "Nothing left to choose. You're ready to play at level " + to + "."));
    }
    return box;
  }

  /* ================================================ the turn quick-cards === */
  /* Plain-language reminders a player can tap mid-turn, with the character's
     own actions, bonus actions and reactions dealt in from the same buckets
     "What you can do" uses. */
  var TURN_CARDS = [
    { k: "Move", tag: "", text: "Up to your speed, split however you like around your action. Standing up from prone costs half your speed; difficult terrain costs double." },
    { k: "Action", tag: "act", list: [
      ["Attack", "Make one weapon attack (more if a feature says so)."],
      ["Dash", "Move your speed again this turn."],
      ["Disengage", "Your movement doesn't provoke opportunity attacks this turn."],
      ["Dodge", "Until your next turn, attacks against you have disadvantage and you have advantage on Dexterity saves."],
      ["Help", "Give an ally advantage on their next check, or on their next attack against a creature next to you."],
      ["Hide", "Make a Stealth check to become hidden, if you can't be seen."],
      ["Ready an action", "Choose a trigger and an action; when the trigger happens, you act with your reaction."],
      ["Search", "Look for something: a Perception or Investigation check."],
      ["Use an Object", "Anything fiddly: a lock, a device, a second object."],
      ["Cast or run a program", "Use a spell, program or similar feature that takes an action."]
    ] },
    { k: "Bonus action", tag: "bon", text: "Only when a feature or spell gives you one. One per turn." },
    { k: "Reaction", tag: "rea", list: [
      ["Opportunity attack", "When a creature you can see leaves your reach, make one melee attack against it."]
    ], text: "One per round. It comes back at the start of your turn." },
    { k: "Free", tag: "", text: "Say a few words, and interact with one object as part of moving or acting: draw a weapon, open a door, pick something up." }
  ];
  function turnDeck(buckets) {
    var sec = el("div", "sheet-sec turn-deck");
    sec.style.gridColumn = "1 / -1";
    sec.appendChild(el("h3", null, "On your turn"));
    sec.appendChild(el("p", "page-ref", "Tap a card for what it lets you do."));
    var deck = el("div", "tcards");
    function card(title, tag, lines) {
      var c = el("button", "tcard" + (tag ? " " + tag : ""));
      c.setAttribute("aria-expanded", "false");
      c.appendChild(el("span", "tcard-k", esc(title)));
      var body = el("span", "tcard-body");
      lines.forEach(function (l) {
        var p = el("span", "tcard-line");
        if (l[0]) p.appendChild(el("b", null, esc(l[0])));
        p.appendChild(el("span", null, esc(l[1])));
        if (l[2]) p.appendChild(el("span", "tag use", esc(l[2])));
        body.appendChild(p);
      });
      body.hidden = true;
      c.appendChild(body);
      c.onclick = function () {
        body.hidden = !body.hidden;
        c.setAttribute("aria-expanded", body.hidden ? "false" : "true");
        c.classList.toggle("open", !body.hidden);
      };
      return c;
    }
    TURN_CARDS.forEach(function (t) {
      var lines = [];
      if (t.text) lines.push(["", t.text]);
      (t.list || []).forEach(function (x) { lines.push(x); });
      var mine = t.k === "Action" ? (buckets.Action || []) : t.k === "Bonus action" ? (buckets["Bonus action"] || [])
        : t.k === "Reaction" ? (buckets.Reaction || []) : [];
      mine.forEach(function (d) { lines.push([d.name, d.gist, d.uses]); });
      deck.appendChild(card(t.k, t.tag, lines));
    });
    var conds = (window.TTBGM && window.TTBGM.conditions) || [];
    if (conds.length) {
      deck.appendChild(card("Conditions", "", conds.map(function (x) { return [x.name, x.gist]; })));
    }
    sec.appendChild(deck);
    return sec;
  }

  /* ============================================= the Puppeteer's frames === */
  function frameSpec() {
    var cl = classByName[C.cls];
    if (!cl || cl.name !== "Puppeteer") return null;
    var prog = cl.progression, row = prog && prog.rows[C.level - 1];
    if (!row) return null;
    var hi = function (h) { return prog.headers.indexOf(h); };
    var frames = +row[hi("Frames")] || 1, tier = +row[hi("Frame Tier")] || 1, uplink = +row[hi("Uplink")] || 0;
    var fFeat = cl.features.filter(function (f) { return f.name === "Frame"; })[0];
    var tbl = fFeat && fFeat.blocks.filter(function (b) { return b.type === "table"; })[0];
    var tr = tbl ? tbl.rows.filter(function (r) { return +r[0] === tier; })[0] : null;
    var hpM = tr ? /(\d+)\s*\+\s*(\d+)/.exec(tr[2]) : null;
    var rb = cl.features.filter(function (f) { return f.name === "Remote Body"; })[0];
    var ul = rb && rb.blocks.filter(function (b) { return b.type === "ul"; })[0];
    var opts = ul ? ul.items.map(function (t) {
      var m = /^(.+?) \((\d+)\),\s*(.*)$/.exec(t);
      return m ? { name: m[1], cost: +m[2], text: m[3] } : null;
    }).filter(Boolean) : [];
    return { frames: frames, tier: tier, uplink: uplink,
             ac: tr ? +tr[1] : null, hp: hpM ? +hpM[1] + +hpM[2] * C.level : null,
             speed: tr ? tr[3] : "", sdc: tr ? tr[4] : "", attack: tr ? tr[5] : "", opts: opts };
  }
  function dronePanel() {
    var fs = frameSpec();
    if (!fs) return null;
    if (!Array.isArray(C.frames)) C.frames = [];
    var sec = el("div", "sheet-sec drones");
    sec.style.gridColumn = "1 / -1";
    sec.appendChild(el("h3", null, "Frames"));
    var stats = el("div", "chips frame-stats");
    [fs.frames === 1 ? "1 frame" : fs.frames + " frames", "Tier " + fs.tier, "AC " + fs.ac, fs.hp + " HP",
     fs.speed, "Str/Dex/Con " + fs.sdc, fs.attack].forEach(function (t) { if (t) stats.appendChild(el("span", "chip", esc(t))); });
    sec.appendChild(stats);
    var grid = el("div", "frames");
    for (var i = 0; i < fs.frames; i++) {
      (function (i) {
        var st = C.frames[i] && typeof C.frames[i] === "object" ? C.frames[i] : {};
        var hp = typeof st.hp === "number" ? Math.max(0, Math.min(fs.hp, st.hp)) : fs.hp;
        var gone = !!st.gone || hp <= 0;
        var card = el("div", "frame" + (gone ? " gone" : ""));
        card.appendChild(el("b", null, "Frame " + (i + 1)));
        var hpL = el("div", "frame-hp");
        hpL.appendChild(el("span", "v", hp + " / " + fs.hp));
        var bar = el("div", "inv-bar");
        var fill = el("div", "inv-fill" + (hp / fs.hp <= 0.2 ? " bad" : hp / fs.hp <= 0.5 ? " hurt" : ""));
        fill.style.width = Math.max(0, (hp / fs.hp) * 100) + "%";
        bar.appendChild(fill);
        hpL.appendChild(bar);
        card.appendChild(hpL);
        var pad = el("div", "frame-pad");
        function set(v, g) {
          C.frames[i] = { hp: Math.max(0, Math.min(fs.hp, v)), gone: !!g };
          save(); render();
        }
        [-5, -1, 1, 5].forEach(function (n) {
          var b = el("button", "chip" + (n < 0 ? " warn" : ""), (n > 0 ? "+" : "") + n);
          b.setAttribute("aria-label", (n < 0 ? "Frame " + (i + 1) + " takes " + (-n) : "Frame " + (i + 1) + " heals " + n));
          b.onclick = function () { set(hp + n, hp + n <= 0); };
          pad.appendChild(b);
        });
        card.appendChild(pad);
        if (gone) {
          card.appendChild(el("p", "tone-alert", "Destroyed. If you were jumped in: 2d6 psychic, and no jumping until a short rest."));
          card.appendChild(el("p", "page-ref", "A new one takes 8 hours and " + (500 * fs.tier) + "₵."));
          var rb = el("button", "btn", "Rebuilt");
          rb.onclick = function () { set(fs.hp, false); };
          card.appendChild(rb);
        }
        grid.appendChild(card);
      })(i);
    }
    sec.appendChild(grid);

    var used = Math.max(0, Math.min(fs.uplink, C.uplinkUsed || 0)), left = fs.uplink - used;
    var up = el("div", "uplink");
    up.appendChild(el("span", "k", "Uplink"));
    up.appendChild(el("b", null, left + " / " + fs.uplink));
    var pips = el("span", "uplink-pips");
    for (var p = 0; p < fs.uplink; p++) pips.appendChild(el("span", "pip" + (p < left ? " on" : "")));
    up.appendChild(pips);
    var lr = el("button", "chip", "Long rest");
    lr.onclick = function () { C.uplinkUsed = 0; save(); render(); toast("Uplink is full again"); };
    up.appendChild(lr);
    sec.appendChild(up);
    var opts = el("div", "uplink-opts");
    fs.opts.forEach(function (o) {
      var b = el("button", "btn", esc(o.name) + ' <span class="page-ref">' + o.cost + "</span>");
      b.title = o.text;
      b.disabled = o.cost > left;
      b.onclick = function () {
        if (o.cost > fs.uplink - (C.uplinkUsed || 0)) return;
        C.uplinkUsed = (C.uplinkUsed || 0) + o.cost; save(); render();
        toast(o.name + ": " + o.text);
      };
      opts.appendChild(b);
    });
    sec.appendChild(opts);
    sec.appendChild(el("p", "page-ref", "Spend Uplink as a bonus action while jumped in. It all comes back on a long rest."));
    return sec;
  }

  /* ==================================================== STEP: 8, DOSSIER */
  /* --------------------------------------------------------- sheet helpers */
  var CLASS_DC = { Wirewalker: ["Int", "Interface DC"], Puppeteer: ["Int", "Uplink DC"],
                   Streetdoc: ["Wis", "Medicine DC"], Firebrand: ["Cha", "Signal DC"],
                   Fixer: ["Cha", "Fixer DC"], Bioforged: ["Con", "Graft DC"] };

  /* The Armor table holds two different kinds of value in one column: a base
     formula ("14 + Dex modifier (max 2)") and an additive bonus ("+2", which is
     the Ballistic Shield). The old parser was anchored to a leading digit, so
     the shield parsed as null and was discarded, it added nothing at all. */
  function parseACBonus(formula) {
    var m = String(formula).match(/^\s*\+\s*(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : null;
  }
  function parseAC(formula, sc) {
    var m = String(formula).match(/^(\d+)(?:\s*\+\s*Dex modifier(?:\s*\(max\s*(\d+)\))?)?/i);
    if (!m) return null;
    var base = parseInt(m[1], 10);
    if (!/Dex/i.test(formula)) return base;
    var dex = mod(sc.Dex);
    if (m[2]) dex = Math.min(dex, parseInt(m[2], 10));
    return base + dex;
  }
  function armorRow(name) {
    var t = tableByTitle["Armor"];
    return t ? (t.rows.filter(function (r) { return r[0] === name; })[0] || null) : null;
  }
  function armorClass() {
    var sc = scores(), best = { ac: 10 + mod(sc.Dex), from: "Unarmoured" };
    var bonus = 0, bonusFrom = [];
    C.gear.forEach(function (g) {
      if (g.key.indexOf("Armor|") !== 0) return;
      var row = armorRow(g.name);
      if (!row) return;
      var add = parseACBonus(row[2]);
      if (add != null) {
        // A shield stacks on top of whatever you are wearing; it is not armour
        // competing to be the best single source.
        if (bonusFrom.indexOf(g.name) < 0) { bonus += add; bonusFrom.push(g.name); }
        return;
      }
      var v = parseAC(row[2], sc);
      if (v != null && v > best.ac) best = { ac: v, from: g.name };
    });
    var sub = mySub();
    if (sub && sub.name === "Bulwark Protocol" && C.level >= 3) {
      var v2 = 13 + mod(sc.Con) + Math.min(mod(sc.Dex), 2);
      if (v2 > best.ac) best = { ac: v2, from: "Subdermal Plate" };
    }
    if (C.cls === "Bioforged" && (C.picks && (C.picks.grafts || []).indexOf("Dermal Weave") >= 0)) {
      var v3 = 13 + mod(sc.Dex);
      if (v3 > best.ac) best = { ac: v3, from: "Dermal Weave" };
    }
    if (bonus) {
      best = { ac: best.ac + bonus,
               from: best.from + " + " + bonusFrom.join(" + ") };
    }
    return best;
  }

  // Features whose whole job is "now go choose your subclass" aren't abilities.
  var CHOOSER = /^(Deck Architecture|Rig Doctrine|Combat Doctrine|Practice|Operation|Act|Stack Protocol|Strain)$/;
  function activeFeatures() {
    var out = [], cl = classByName[C.cls], sub = mySub();
    if (cl && isExp(cl))
      cl.features.forEach(function (f) {
        if (C.level >= f.level && f.name !== "Ability Score Improvement" && !CHOOSER.test(f.name))
          out.push({ f: f, src: cl.name });
      });
    if (sub)
      sub.features.forEach(function (f) {
        if (C.level >= f.level) out.push({ f: f, src: sub.name });
      });
    var b = bgObj();
    if (b && b.feature) out.push({ f: { name: b.feature.name, level: 1, blocks: b.feature.blocks },
                                   src: b.name });
    takenFeats().forEach(function (n) {
      var ft = ALL_FEATS.filter(function (x) { return x.name === n; })[0];
      if (ft) out.push({ f: { name: ft.name, level: 0, blocks: ft.blocks }, src: "Feat" });
    });
    // Programs, grafts and imprints are the moment-to-moment kit, list them too.
    var sp = scalingSpec();
    if (sp && C.picks && (C.picks[sp.spec.key] || []).length) {
      C.picks[sp.spec.key].forEach(function (n) {
        var o = sp.options.filter(function (x) { return x.name === n; })[0];
        if (!o) return;
        out.push({
          f: { name: o.name + (o.tier ? " (tier " + o.tier + ")" : ""), level: 0,
               blocks: [{ type: "p", text: o.desc || "" }] },
          src: sp.spec.label.replace(/s$/, ""),
          forceType: sp.spec.key === "programs" ? "Action" : null,
          cost: sp.spec.key === "programs" && o.tier ?
            (parseInt(o.tier, 10) * 2) + " Bandwidth" : null
        });
      });
    }
    if (C.style) {
      var st = D.fightingStyles.filter(function (x) { return x.name === C.style; })[0];
      if (st) out.push({ f: { name: st.name, level: 0, blocks: st.blocks }, src: "Fighting style" });
    }
    return out;
  }

  /* what each level of this build gives you, 1 through 20 */
  function ladder() {
    var cl = classByName[C.cls], sub = mySub(), rows = [];
    for (var lv = 1; lv <= 20; lv++) {
      var gains = [];
      if (cl && isExp(cl))
        cl.features.forEach(function (f) { if (f.level === lv) gains.push(f.name); });
      if (sub)
        sub.features.forEach(function (f) { if (f.level === lv) gains.push(sub.name + ": " + f.name); });
      if (!cl || !isExp(cl)) {
        if (myAsiLevels().indexOf(lv) >= 0) gains.push("Ability Score Improvement");
      }
      if (cl && cl.progression) {
        var row = cl.progression.rows[lv - 1], prev = lv > 1 ? cl.progression.rows[lv - 2] : null;
        cl.progression.headers.forEach(function (h, i) {
          if (i < 3 || !prev) return;
          if (row[i] !== prev[i] && row[i] !== "-")
            gains.push(h + " " + prev[i] + " → " + row[i]);
        });
      }
      rows.push({ level: lv, gains: gains });
    }
    return rows;
  }

  function stepSheet(s) {
    var cl = classByName[C.cls];
    if (!cl) return needClass(s);
    var sub = mySub(), b = bgObj(), sc = scores(), pb = profBonus(C.level);
    var ac = armorClass();

    head(s, "Step 08", C.name || "Unnamed operator",
      "Level " + C.level + " " + cl.name + (sub && C.level >= sub.levelAvailable ? " · " + sub.name : "") +
      (b ? " · " + b.name : "") + (C.origin ? " · " + C.origin : ""));

    var slug = (C.name || "operator").replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "");

    s.appendChild(el("div", "eyebrow", "Print"));
    var ptools = el("div", "toolbar");
    PRINT_KINDS.forEach(function (k) {
      var b = el("button", "btn" + (k[0] === "classic" ? " primary" : ""), k[1]);
      b.title = k[2];
      b.onclick = function () { openPreview(k[0]); };
      ptools.appendChild(b);
    });
    s.appendChild(ptools);
    if (helpMode)
      s.appendChild(el("p", "slot-note",
        "Each opens a preview first, so you can see the page before you spend the paper. " +
        "Use your browser's \u201cSave as PDF\u201d in the print dialog if you'd rather have a file."));

    s.appendChild(el("div", "eyebrow", "Share & save"));
    var tools = el("div", "toolbar");
    var cp = el("button", "btn", "Copy as Markdown");
    cp.onclick = function () {
      var md = toMarkdown();
      if (navigator.clipboard) navigator.clipboard.writeText(md).then(
        function () { toast("Copied to clipboard"); }, function () { toast("Copy failed"); });
      else toast("Clipboard unavailable");
    };
    tools.appendChild(cp);

    var sh = el("button", "btn primary", "Copy share link");
    sh.title = "A link that rebuilds this exact character for whoever opens it";
    sh.onclick = function () {
      var url = shareLink();
      if (url.length > 7500) { toast("Character too large to share as a link, export a file instead"); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(
        function () { toast("Share link copied"); }, function () { toast("Copy failed"); });
      else toast("Clipboard unavailable");
    };
    tools.appendChild(sh);

    var dl = el("button", "btn", "Download .md");
    dl.onclick = function () { saveAs(slug + ".md", toMarkdown(), "text/markdown;charset=utf-8"); };
    tools.appendChild(dl);

    var dj = el("button", "btn", "Download backup (.json)");
    dj.onclick = function () {
      saveAs(slug + ".ttb.json", JSON.stringify(C, null, 1), "application/json");
    };
    tools.appendChild(dj);
    s.appendChild(tools);

    /* ---- vitals ---- */
    var vs = el("div", "vitals-strip");
    var dcSpec = CLASS_DC[cl.name];
    [["AC", ac.ac, ac.from],
     ["Hit points", maxHP(), cl.hit + " hit die"],
     ["Initiative", sgn(initiative()), "d20 +"],
     ["Proficiency", sgn(pb), ""],
     ["Speed", "30 ft.", ""],
     dcSpec ? [dcSpec[1], saveDC().dc, dcSpec[0] + " based"] : null
    ].filter(Boolean).forEach(function (v) {
      var x = el("div", "vs");
      x.innerHTML = '<div class="k">' + esc(v[0]) + '</div><div class="v">' + esc(v[1]) +
        '</div><div class="n">' + esc(v[2] || "") + "</div>";
      vs.appendChild(x);
    });
    s.appendChild(vs);

    /* ---- resources from the class table ---- */
    if (cl.progression) {
      var row = classRow();
      var rg = el("div", "res-grid");
      cl.progression.headers.forEach(function (h, i) {
        if (i < 3) return;
        var x = el("div", "res");
        x.innerHTML = '<div class="k">' + esc(h) + '</div><div class="v">' + esc(row[i]) + "</div>";
        rg.appendChild(x);
      });
      if (rg.children.length) {
        s.appendChild(el("div", "eyebrow", cl.resource + " and other pools at level " + C.level));
        s.appendChild(rg);
      }
    }

    /* ---- next unlock ---- */
    var lad = ladder();
    var next = lad.filter(function (r) { return r.level > C.level && r.gains.length; })[0];
    if (next) {
      var nu = el("div", "next-up");
      nu.innerHTML = "<b>Next level up</b>: at level " + next.level + " you gain " +
        esc(next.gains.join(", ")) + ".";
      s.appendChild(nu);
    }

    var grid = el("div", "sheet-grid");

    /* ---- what you can do ---- */
    var gdo = el("div", "sheet-sec");
    gdo.style.gridColumn = "1 / -1";
    gdo.appendChild(el("h3", null, "What you can do at level " + C.level));
    var buckets = { "Action": [], "Bonus action": [], "Reaction": [], "Attack": [], "Passive": [] };
    activeFeatures().forEach(function (e) {
      var t = blockText(e.f);
      var entries = e.forceType ? [{ type: e.forceType, gist: gistOf(e.f) }] : actionEntries(e.f);
      entries.forEach(function (en) {
        var kind = buckets[en.type] ? en.type : "Passive";
        buckets[kind].push({ name: e.f.name, src: e.src, uses: e.cost || usageOf(t),
                             gist: en.gist, level: e.f.level });
      });
    });
    var order = ["Action", "Bonus action", "Reaction", "Attack", "Passive"];
    var cls = { "Action": "act", "Bonus action": "bon", "Reaction": "rea", "Attack": "act",
                "Passive": "" };
    var any = false;
    order.forEach(function (k) {
      if (!buckets[k].length) return;
      any = true;
      var g = el("div", "do-group");
      g.appendChild(el("h4", null, k === "Attack" ? "On the Attack action" : k +
        (k === "Passive" ? "" : "s")));
      buckets[k].forEach(function (d) {
        var e = el("div", "do");
        var top = el("div", "do-top");
        top.innerHTML = "<b>" + esc(d.name) + "</b>" +
          '<span class="tag ' + cls[k] + '">' + esc(k) + "</span>" +
          (d.uses ? '<span class="tag use">' + esc(d.uses) + "</span>" : "") +
          '<span class="page-ref">' + esc(d.src) + (d.level ? " · lv " + d.level : "") + "</span>";
        e.appendChild(top);
        e.appendChild(el("p", null, esc(d.gist)));
        g.appendChild(e);
      });
      gdo.appendChild(g);
    });
    if (!any) gdo.appendChild(el("p", "empty-state",
      "Nothing active yet, pick a class and archetype, then raise your level."));
    if (!isExp(cl))
      gdo.appendChild(el("p", "slot-note",
        "This lists what the Technomancer's Textbook and your choices add. " + cl.name +
        "'s core features, Sneak Attack, Rage, Spellcasting and the rest, come from the " +
        "Player's Handbook and aren't reproduced here, so keep that to hand as well."));
    grid.appendChild(gdo);
    grid.insertBefore(turnDeck(buckets), gdo);
    var dp = dronePanel();
    if (dp) grid.insertBefore(dp, gdo.nextSibling);

    /* ---- abilities ---- */
    var g1 = el("div", "sheet-sec");
    g1.appendChild(el("h3", null, "Abilities & saves"));
    var base = baseScores();
    ABIL.forEach(function (a) {
      var save = cl.saves.indexOf(a) >= 0;
      var delta = sc[a] - base[a];
      var l = el("div", "skill-line" + (save ? " prof" : ""));
      l.innerHTML = "<span>" + (save ? '<span class="dot"></span>' : '<span class="dot off"></span>') +
        ABIL_FULL[a] + (delta ? ' <span class="page-ref">+' + delta + " from levelling</span>" : "") +
        '</span><span class="b">' + sc[a] + " (" + sgn(mod(sc[a])) + ")" +
        (save ? " · save " + sgn(saveBonus(a)) : "") + "</span>";
      g1.appendChild(l);
    });
    grid.appendChild(g1);

    /* ---- skills ---- */
    var g2 = el("div", "sheet-sec");
    g2.appendChild(el("h3", null, "Skills"));
    var mine = allSkills();
    Object.keys(D.skills).sort().forEach(function (sk) {
      var p = mine.indexOf(sk) >= 0;
      var v = skillBonus(sk);
      var l = el("div", "skill-line" + (p ? " prof" : ""));
      l.innerHTML = "<span>" + (p ? '<span class="dot"></span>' : '<span class="dot off"></span>') +
        esc(sk) + " <span style='opacity:.5;font-size:11px'>" + D.skills[sk] +
        '</span></span><span class="b">' + sgn(v) + "</span>";
      g2.appendChild(l);
    });
    grid.appendChild(g2);

    /* ---- level ladder ---- */
    var gl = el("div", "sheet-sec");
    gl.appendChild(el("h3", null, "Level ladder"));
    var lw = el("div", "ladder");
    lad.forEach(function (r) {
      var row2 = el("button", "rung" + (r.gains.length ? " has" : "") +
        (r.level === C.level ? " now" : "") + (r.level > C.level ? " future" : ""));
      row2.type = "button";
      row2.setAttribute("aria-current", r.level === C.level);
      row2.setAttribute("aria-label", "Set level " + r.level +
        (r.gains.length ? ": " + r.gains.join(", ") : ""));
      row2.innerHTML = '<span class="lv">' + (r.level === C.level ? "▸ " : "") + r.level +
        '</span><span class="what">' + (r.gains.length ? esc(r.gains.join(", ")) : "-") + "</span>";
      row2.onclick = function () { C.level = r.level; delete C.isExample; save(); render(); };
      lw.appendChild(row2);
    });
    gl.appendChild(lw);
    grid.appendChild(gl);

    /* ---- condition ---- */
    var gh = el("div", "sheet-sec");
    gh.appendChild(el("h3", null, "Condition"));
    gh.appendChild(humanityMeter(false));
    var emS = essenceMeter();
    if (emS) gh.appendChild(emS);
    if (C.origin) {
      var orow = el("div", "trait-line");
      orow.innerHTML = '<span class="k">Origin</span>' + esc(C.origin);
      gh.appendChild(orow);
    }
    if (C.sleeve) {
      var srow = el("div", "trait-line");
      srow.innerHTML = '<span class="k">Sleeve</span>' + esc(C.sleeve);
      gh.appendChild(srow);
    }
    grid.appendChild(gh);

    /* ---- known picks ---- */
    var sp = scalingSpec();
    if (sp && C.picks && (C.picks[sp.spec.key] || []).length) {
      var gk = el("div", "sheet-sec");
      gk.appendChild(el("h3", null, sp.spec.label + " known"));
      C.picks[sp.spec.key].forEach(function (n) {
        var o = sp.options.filter(function (x) { return x.name === n; })[0];
        if (!o) return;
        var r = el("div", "trait-line");
        r.innerHTML = '<span class="k">' + (o.tier ? "Tier " + o.tier + " · " : "") + esc(n) +
          "</span>" + esc(o.desc || "");
        gk.appendChild(r);
      });
      grid.appendChild(gk);
    }

    /* ---- gear ---- */
    var g5 = el("div", "sheet-sec");
    g5.appendChild(el("h3", null, "Chrome & gear · " + fmtCredits(spend())));
    var ul5 = el("ul");
    C.cyber.forEach(function (x) {
      ul5.appendChild(el("li", null, esc(x.name) + " (Tier " + esc(x.tier) + "), " +
        esc(cyberCost[x.name.toLowerCase() + "|" + x.tier] || "-")));
    });
    C.augments.forEach(function (a) {
      ul5.appendChild(el("li", null, esc(a) + ", " + esc(augCost[a.toLowerCase()] || "-")));
    });
    C.gear.forEach(function (g) {
      var li5 = el("li", null, esc(g.name) + (gearQty(g) > 1 ? " ×" + gearQty(g) : "") + ", " + esc(g.cost || "-") +
        (g.wt != null ? ' <span class="page-ref">' + esc(String(Math.round(g.wt * gearQty(g) * 10) / 10)) + " lb</span>" : ""));
      if (g.custom) li5.setAttribute("data-nolang", "");
      ul5.appendChild(li5);
    });
    if (!ul5.children.length) g5.appendChild(el("p", "empty-state", "No chrome installed."));
    g5.appendChild(ul5);
    var carry5 = el("p", "page-ref", "Carrying " + carried() + " lb of " + carryCap() + " lb");
    g5.appendChild(carry5);
    if (C.credits != null) {
      var left5 = C.credits - spend();
      g5.appendChild(el("p", left5 < 0 ? "tone-alert" : "page-ref", "Credits left: " + esc(fmtCredits(left5))));
    }
    grid.appendChild(g5);

    /* ---- background ---- */
    if (b) {
      var g6 = el("div", "sheet-sec");
      g6.appendChild(el("h3", null, "Background · " + esc(b.name)));
      Object.keys(b.traits).forEach(function (k) {
        var l = el("div", "trait-line");
        l.innerHTML = '<span class="k">' + esc(k) + "</span>" + esc(b.traits[k]);
        g6.appendChild(l);
      });
      var rolled = Object.keys(C.traits).filter(function (k) { return k.indexOf(b.id + "|") === 0; });
      rolled.forEach(function (k) {
        var l = el("div", "trait-line");
        l.innerHTML = '<span class="k">' + esc(k.split("|")[1]) + "</span>" + esc(C.traits[k]);
        g6.appendChild(l);
      });
      grid.appendChild(g6);
    }

    s.appendChild(grid);

    if (helpMode) {
      var wn = el("div", "whatnow");
      wn.appendChild(el("h3", null, "You're done: what happens now"));
      var ol = el("ol");
      [["Get it off the screen.", "Hit <em>Print sheet</em> for paper, or <em>Copy as Markdown</em> " +
        "to paste into Discord, Notion, a Google Doc or wherever your group keeps things."],
       ["Show your DM.", "They'll tell you if anything needs changing for their game, " +
        "starting level, how much money you begin with, whether Humanity is being used at all."],
       ["Bring dice, or an app.", "You mostly need a d20. The other dice come up for damage and healing."],
       ["On your turn you get one " + "<em>action</em>, one <em>bonus action</em> if something grants it, " +
        "and your movement.", "The \u201cWhat you can do\u201d list above is sorted that way on purpose, " +
        "read it off the sheet, nobody memorises this."],
       ["When you level up, come back.", "Move the level slider, and the app will tell you exactly " +
        "what you gained and what you still need to choose."]
      ].forEach(function (x) {
        ol.appendChild(el("li", null, "<b>" + x[0] + "</b> " + x[1]));
      });
      wn.appendChild(ol);
      s.appendChild(wn);
    }

    nav(s, 6, null);
  }

  function toMarkdown() {
    var cl = classByName[C.cls], sub = mySub(), b = bgObj(), sc = scores(), pb = profBonus(C.level);
    var L = [];
    L.push("# " + (C.name || "Unnamed operator"));
    L.push("");
    L.push("Level " + C.level + " " + (cl ? cl.name : "-") +
      (sub && C.level >= sub.levelAvailable ? ", " + sub.name : "") + (b ? ", " + b.name : ""));
    L.push("");
    L.push("| | " + ABIL.join(" | ") + " |");
    L.push("|---|" + ABIL.map(function () { return "---|"; }).join(""));
    L.push("| Score | " + ABIL.map(function (a) { return sc[a]; }).join(" | ") + " |");
    L.push("| Mod | " + ABIL.map(function (a) { return sgn(mod(sc[a])); }).join(" | ") + " |");
    L.push("");
    var ac2 = armorClass();
    L.push("- **Armour class** " + ac2.ac + " (" + ac2.from + ")  ");
    L.push("- **Hit points** " + (maxHP() || "-") + "  ");
    L.push("- **Proficiency bonus** " + sgn(pb) + "  ");
    L.push("- **Saving throws** " + (cl ? cl.saves.map(function (a) {
      return ABIL_FULL[a] + " " + sgn(saveBonus(a));
    }).join(", ") : "-"));
    L.push("- **Skills** " + (allSkills().map(function (sk) {
      return sk + " " + sgn(skillBonus(sk));
    }).join(", ") || "-"));
    var dcs = cl ? saveDC() : null;
    if (dcs) L.push("- **" + dcs.label + "** " + dcs.dc);
    if (cl && cl.progression) {
      var prow = classRow();
      var pools = cl.progression.headers.map(function (h, i) {
        return i < 3 ? null : h + " " + prow[i];
      }).filter(Boolean);
      if (pools.length) L.push("- **Pools** " + pools.join(", "));
    }
    var spM = scalingSpec();
    if (spM && C.picks && (C.picks[spM.spec.key] || []).length)
      L.push("- **" + spM.spec.label + "** " + C.picks[spM.spec.key].join(", "));
    if (C.sleeve) L.push("- **Sleeve** " + C.sleeve);
    var hm = humanity();
    L.push("- **Humanity** " + hm.left + " / " + hm.base + " (" + hm.pct + "%, " + hm.state +
      ")" + (hm.tol ? ", buffer " + hm.tolLeft + "/" + hm.tol : "") +
      ", " + hm.implants + " implants installed");
    var es = essence();
    if (es) L.push("- **Essence** " + es.value + " (" + es.state + ")");
    if (C.origin) L.push("- **Origin** " + C.origin);
    L.push("");
    if (cl && isExp(cl)) {
      L.push("## " + cl.name + " (Neon Ledger): " + cl.resource);
      cl.features.filter(function (f) { return C.level >= f.level; }).forEach(function (f) {
        L.push("- " + f.name + " *(level " + f.level + ")*");
      });
      L.push("");
    }
    if (sub) {
      L.push("## Archetype: " + sub.name +
        (sub.page ? " (p. " + sub.page + ")" : " (" + sourceName(sub) + ")"));
      sub.features.filter(function (f) { return C.level >= f.level; }).forEach(function (f) {
        L.push("- " + f.name + " *(level " + f.level + ")*");
      });
      Object.keys(C.subChoices).forEach(function (k) {
        if ((C.subChoices[k] || []).length) L.push("- **" + k + ":** " + C.subChoices[k].join(", "));
      });
      L.push("");
    }
    if (b) {
      L.push("## Background: " + b.name + " (p. " + b.page + ")");
      Object.keys(b.traits).forEach(function (k) { L.push("- **" + k + ":** " + b.traits[k]); });
      if (b.feature) L.push("- **Feature:** " + b.feature.name);
      Object.keys(C.traits).forEach(function (k) {
        if (k.indexOf(b.id + "|") === 0) L.push("- *" + k.split("|")[1] + ":* " + C.traits[k]);
      });
      L.push("");
    }
    L.push("## What you can do");
    var bk = { "Action": [], "Bonus action": [], "Reaction": [], "Attack": [], "Passive": [] };
    activeFeatures().forEach(function (e) {
      var t = blockText(e.f);
      var entries = e.forceType ? [{ type: e.forceType, gist: gistOf(e.f) }] : actionEntries(e.f);
      entries.forEach(function (en) {
        var kind2 = bk[en.type] ? en.type : "Passive";
        bk[kind2].push({ n: e.f.name, u: e.cost || usageOf(t), g: en.gist });
      });
    });
    ["Action", "Bonus action", "Reaction", "Attack", "Passive"].forEach(function (k) {
      if (!bk[k].length) return;
      L.push("");
      L.push("### " + k);
      bk[k].forEach(function (d) {
        L.push("- **" + d.n + "**" + (d.u ? " *(" + d.u + ")*" : "") + ", " + d.g);
      });
    });
    L.push("");
    var nx = ladder().filter(function (r) { return r.level > C.level && r.gains.length; })[0];
    if (nx) { L.push("**Next level up:** at " + nx.level + " you gain " + nx.gains.join(", ") + "."); L.push(""); }

    var opts = [];
    if (C.style) opts.push("Fighting style: " + C.style);
    takenFeats().forEach(function (f) { opts.push("Feat: " + f); });
    C.invocations.forEach(function (f) { opts.push("Invocation: " + f); });
    C.infusions.forEach(function (f) { opts.push("Infusion: " + f); });
    if (opts.length) { L.push("## Options"); opts.forEach(function (o) { L.push("- " + o); }); L.push(""); }
    if (C.cyber.length || C.augments.length || C.gear.length) {
      L.push("## Chrome & gear: " + fmtCredits(spend()));
      C.cyber.forEach(function (x) {
        L.push("- " + x.name + " (Tier " + x.tier + "), " +
          (cyberCost[x.name.toLowerCase() + "|" + x.tier] || "-"));
      });
      C.augments.forEach(function (a) { L.push("- " + a + ", " + (augCost[a.toLowerCase()] || "-")); });
      C.gear.forEach(function (g) {
        L.push("- " + g.name + (gearQty(g) > 1 ? " ×" + gearQty(g) : "") + ", " + (g.cost || "-") +
          (g.wt != null ? " (" + Math.round(g.wt * gearQty(g) * 10) / 10 + " lb)" : ""));
      });
      if (C.credits != null) L.push("- Credits left: " + fmtCredits(C.credits - spend()));
      L.push("");
    }
    L.push("---");
    var srcs = [];
    if (isExp(cl) || C.origin) srcs.push("the " + X.meta.title + " expansion");
    if (sub && sub.origin === "srd" && SRD.meta) srcs.push(SRD.meta.title);
    L.push("Built from *" + D.meta.title + "* by " + D.meta.author + ", version " +
      D.meta.version + (srcs.length ? ", with " + srcs.join(" and ") : "") + ".");
    if (sub && sub.origin === "srd" && SRD.meta) L.push("", SRD.meta.notice);
    return L.join("\n");
  }


  /* ==================================================== printable layouts === */
  var PRINT_KINDS = [
    ["classic", "Classic sheet", "Two portrait pages in the familiar D&D layout."],
    ["pocket", "Pocket card", "One small card with your vitals and turn options."],
    ["cards", "Ability cards", "Every feature as a cut-out card."],
    ["full", "Full dossier", "Everything on screen, printed straight through."]
  ];

  function pTag(t, dark) { return '<span class="tg' + (dark ? " dark" : "") + '">' + esc(t) + "</span>"; }

  function buildClassic(root) {
    var cl = classByName[C.cls], sub = mySub(), b = bgObj(), sc = scores(), pb = profBonus(C.level);
    // The character's own campaign, not whichever one is being browsed in the
    // Campaign tab. C.campaign was written when settings were applied and then
    // never read anywhere, so opening another campaign relabelled the printout.
    var ac = armorClass(), h = humanity(), camp = C.campaign ? campById(C.campaign) : null;

    var p1 = el("div", "cs-page");
    var head = el("div", "cs-head");
    head.innerHTML = '<div class="nm">' + esc(C.name || "Unnamed operator") + "</div>" +
      '<div class="meta">' +
      "<div><b>Class &amp; level</b>" + esc(cl.name) + " " + C.level + "</div>" +
      "<div><b>Archetype</b>" + esc(sub && C.level >= sub.levelAvailable ? sub.name : "-") + "</div>" +
      "<div><b>Background</b>" + esc(b ? b.name : "-") + "</div>" +
      "<div><b>Origin</b>" + esc(C.origin || "-") + "</div>" +
      "<div><b>Campaign</b>" + esc(camp ? camp.name : "-") + "</div>" +
      "<div><b>Player</b>&nbsp;</div></div>";
    p1.appendChild(head);

    var cols = el("div", "cs-cols");

    // column 1, abilities, saves, skills
    var c1 = el("div");
    ABIL.forEach(function (a) {
      var box = el("div", "ab-box");
      box.innerHTML = '<div class="n">' + ABIL_FULL[a].toUpperCase() + '</div><div class="s">' +
        sc[a] + '</div><div class="m">' + sgn(mod(sc[a])) + "</div>";
      c1.appendChild(box);
    });
    var sv = el("div", "cs-box");
    sv.innerHTML = "<h4>Saving throws</h4>";
    ABIL.forEach(function (a) {
      var prof = cl.saves.indexOf(a) >= 0;
      sv.innerHTML += '<div class="cs-line"><span><span class="pipbox' + (prof ? " on" : "") +
        '"></span>' + ABIL_FULL[a] + '</span><span class="b">' +
        sgn(saveBonus(a)) + "</span></div>";
    });
    c1.appendChild(sv);
    var sk = el("div", "cs-box");
    sk.innerHTML = "<h4>Skills</h4>";
    var mine = allSkills();
    Object.keys(D.skills).sort().forEach(function (s2) {
      var prof = mine.indexOf(s2) >= 0;
      sk.innerHTML += '<div class="cs-line"><span><span class="pipbox' + (prof ? " on" : "") +
        '"></span>' + esc(s2) + ' <span style="color:#777;font-size:6.5pt">' + D.skills[s2] +
        '</span></span><span class="b">' + sgn(skillBonus(s2)) + "</span></div>";
    });
    c1.appendChild(sk);
    cols.appendChild(c1);

    // column 2, combat
    var c2 = el("div");
    var stat = el("div", "cs-stat");
    var dc = CLASS_DC[cl.name];
    [["AC", ac.ac], ["Initiative", sgn(initiative())], ["Speed", "30 ft."],
     ["Prof. bonus", sgn(pb)], ["Hit dice", C.level + cl.hit],
     dc ? [dc[1], saveDC().dc] : ["Passive Perc.", passiveSkill("Perception")]
    ].forEach(function (x) {
      stat.innerHTML += '<div class="s"><div class="k">' + esc(x[0]).toUpperCase() +
        '</div><div class="v">' + esc(x[1]) + "</div></div>";
    });
    c2.appendChild(stat);

    var hp = el("div", "cs-box");
    hp.innerHTML = "<h4>Hit points</h4>" +
      '<div class="cs-line"><span>Maximum</span><span class="b">' + (maxHP() || "-") + "</span></div>" +
      '<div class="cs-line"><span>Current</span><span class="b">&nbsp;</span></div>' +
      '<div class="cs-write"></div><div class="cs-write"></div>' +
      '<div class="cs-line" style="margin-top:4px"><span>Temporary</span><span class="b">&nbsp;</span></div>' +
      '<div class="cs-write"></div>';
    c2.appendChild(hp);

    var ds = el("div", "cs-box");
    ds.innerHTML = "<h4>Death saves</h4>" +
      '<div class="cs-line"><span>Successes</span><span>' +
      '<span class="pipbox"></span><span class="pipbox"></span><span class="pipbox"></span></span></div>' +
      '<div class="cs-line"><span>Failures</span><span>' +
      '<span class="pipbox"></span><span class="pipbox"></span><span class="pipbox"></span></span></div>';
    c2.appendChild(ds);

    var atk = el("div", "cs-box");
    atk.innerHTML = "<h4>Attacks</h4>" +
      '<div class="cs-line" style="color:#777;font-size:6.5pt;font-family:\'JetBrains Mono\',monospace">' +
      "<span>WEAPON</span><span>ATK / DAMAGE</span></div>";
    var weapons = C.gear.filter(function (g) {
      return g.key.indexOf("Firearm List|") === 0 || g.key.indexOf("Melee Weapons|") === 0;
    });
    weapons.forEach(function (g) {
      var a = attackBonus(g);
      atk.innerHTML += '<div class="cs-line"><span>' + esc(g.name) +
        (a.proficient ? "" : ' <span style="color:#888;font-size:6pt">not proficient</span>') +
        '</span><span class="b">' + sgn(a.bonus) + " / " + esc(a.damage) + "</span></div>";
    });
    for (var i = weapons.length; i < 4; i++) atk.innerHTML += '<div class="cs-write"></div>';
    c2.appendChild(atk);

    if (cl.progression) {
      var row2 = classRow(), res = el("div", "cs-box");
      res.innerHTML = "<h4>" + esc(cl.resource) + " &amp; pools</h4>";
      cl.progression.headers.forEach(function (hh, ix) {
        if (ix < 3) return;
        res.innerHTML += '<div class="cs-line"><span>' + esc(hh) + '</span><span class="b">' +
          esc(row2[ix]) + "</span></div>";
      });
      c2.appendChild(res);
    }

    var hum = el("div", "cs-box");
    hum.innerHTML = "<h4>Humanity</h4>" +
      '<div class="cs-line"><span>' + esc(h.state) + '</span><span class="b">' + h.pct + "%</span></div>" +
      '<div class="cs-hum"><i style="width:' + h.pct + '%"></i></div>' +
      '<div style="font-size:7pt;color:#555">' + h.left + " / " + h.base +
      (h.tol ? " · buffer " + h.tolLeft + "/" + h.tol : "") + " · " + h.implants + " implants</div>";
    c2.appendChild(hum);
    cols.appendChild(c2);

    // column 3, proficiencies, gear
    var c3 = el("div");
    var pf = el("div", "cs-box");
    pf.innerHTML = "<h4>Proficiencies</h4>" +
      '<div style="font-size:8pt"><b>Armour</b> ' + esc(cl.armor) + "<br><b>Weapons</b> " +
      esc(cl.weapons) + "<br><b>Firearms</b> " + esc(cl.firearms) + "<br><b>Tools</b> " +
      esc(cl.tools) + (b && b.traits["Tool Proficiencies"] ? ", " + esc(b.traits["Tool Proficiencies"]) : "") +
      (b && b.traits["Languages"] ? "<br><b>Languages</b> " + esc(b.traits["Languages"]) : "") + "</div>";
    c3.appendChild(pf);

    var gr = el("div", "cs-box");
    gr.innerHTML = "<h4>Chrome &amp; gear · " + esc(fmtCredits(spend())) + "</h4>";
    C.cyber.forEach(function (x) {
      gr.innerHTML += '<div class="cs-line"><span>' + esc(x.name) + " T" + esc(x.tier) +
        '</span><span class="b">−' + esc(TIER_COST[x.tier] || 0) + " hum</span></div>";
    });
    C.augments.forEach(function (a) {
      gr.innerHTML += '<div class="cs-line"><span>' + esc(a) + '</span><span class="b">aug</span></div>';
    });
    C.gear.forEach(function (g) {
      gr.innerHTML += '<div class="cs-line"><span>' + esc(g.name) + '</span><span class="b">' +
        esc(g.cost) + "</span></div>";
    });
    if (!C.cyber.length && !C.augments.length && !C.gear.length)
      for (var j = 0; j < 6; j++) gr.innerHTML += '<div class="cs-write"></div>';
    c3.appendChild(gr);

    if (b) {
      var bg = el("div", "cs-box");
      bg.innerHTML = "<h4>Background · " + esc(b.name) + "</h4>";
      Object.keys(b.traits).forEach(function (k) {
        bg.innerHTML += '<div style="font-size:7.6pt;margin-bottom:3px"><b>' +
          esc(k.replace(" Proficiencies", "")) + "</b> " + esc(b.traits[k]) + "</div>";
      });
      c3.appendChild(bg);
    }
    cols.appendChild(c3);
    p1.appendChild(cols);
    root.appendChild(p1);

    // page 2, features in full
    var p2 = el("div", "cs-page");
    var h2 = el("div", "cs-head");
    h2.innerHTML = '<div class="nm" style="font-size:15pt">' + esc(C.name || "Unnamed operator") +
      ': features</div><div class="meta"><div><b>Level</b>' + C.level + "</div></div>";
    p2.appendChild(h2);
    var wrap = el("div", "two-col");
    activeFeatures().forEach(function (e) {
      var t = blockText(e.f), uses = e.cost || usageOf(t);
      var entries = e.forceType ? [{ type: e.forceType, gist: gistOf(e.f) }] : actionEntries(e.f);
      var kind = entries.map(function (en) { return en.type; }).join(" · ");
      var d = el("div", "cs-feat");
      d.innerHTML = "<b>" + esc(e.f.name) + '</b> <span class="lv">' + esc(kind) +
        (uses ? " · " + esc(uses) : "") + " · " + esc(e.src) + "</span><br>" +
        entries.map(function (en) { return esc(en.gist); }).join("<br>");
      wrap.appendChild(d);
    });
    p2.appendChild(wrap);
    var notes = el("div", "cs-box");
    notes.style.marginTop = "10px";
    notes.innerHTML = "<h4>Notes</h4>" + new Array(9).join('<div class="cs-write"></div>');
    p2.appendChild(notes);
    root.appendChild(p2);
  }

  function buildPocket(root) {
    var cl = classByName[C.cls], sub = mySub(), sc = scores(), pb = profBonus(C.level);
    var ac = armorClass(), dc = CLASS_DC[cl.name];
    var wrap = el("div", "sheet-block");
    var grid = el("div", "pc-wrap");

    function card() {
      var c = el("div", "pc-card");
      c.innerHTML = '<div class="nm">' + esc(C.name || "Unnamed operator") + "</div>" +
        '<div class="sub">Level ' + C.level + " " + esc(cl.name) +
        (sub && C.level >= sub.levelAvailable ? " · " + esc(sub.name) : "") + "</div>";
      var v = el("div", "pc-v");
      [["AC", ac.ac], ["HP", maxHP() || "-"], ["INIT", sgn(initiative())], ["PROF", sgn(pb)],
       [dc ? "DC" : "P.PER", dc ? saveDC().dc : passiveSkill("Perception")]
      ].forEach(function (x) {
        v.innerHTML += '<div><div class="k">' + esc(x[0]) + '</div><div class="val">' +
          esc(x[1]) + "</div></div>";
      });
      c.appendChild(v);

      var bk = { "Action": [], "Bonus action": [], "Reaction": [], "Attack": [] };
      activeFeatures().forEach(function (e) {
        var t = blockText(e.f);
        var entries = e.forceType ? [{ type: e.forceType }] : actionEntries(e.f);
        entries.forEach(function (en) {
          if (bk[en.type]) bk[en.type].push({ n: e.f.name, u: e.cost || usageOf(t) });
        });
      });
      ["Action", "Bonus action", "Reaction", "Attack"].forEach(function (k) {
        if (!bk[k].length) return;
        c.innerHTML += '<div class="pc-sec">' + esc(k === "Attack" ? "On the attack action" : k + "s") + "</div>";
        bk[k].slice(0, 9).forEach(function (d) {
          c.innerHTML += '<div class="pc-line"><b>' + esc(d.n) + "</b>" +
            (d.u ? ' <span style="color:#666">' + esc(d.u) + "</span>" : "") + "</div>";
        });
      });
      if (cl.progression) {
        var row = classRow();
        var pools = cl.progression.headers.map(function (hh, ix) {
          return ix < 3 ? null : hh + " " + row[ix];
        }).filter(Boolean);
        if (pools.length)
          c.innerHTML += '<div class="pc-sec">Pools</div><div class="pc-line">' +
            esc(pools.join(" · ")) + "</div>";
      }
      var h = humanity();
      c.innerHTML += '<div class="pc-sec">Humanity</div><div class="pc-line">' + h.pct + "% · " +
        esc(h.state) + "</div>";
      return c;
    }
    grid.appendChild(card());
    grid.appendChild(card());
    wrap.appendChild(grid);
    root.appendChild(wrap);
  }

  function buildCards(root) {
    var wrap = el("div", "sheet-block");
    var head = el("div");
    head.style.cssText = "margin-bottom:10px;border-bottom:2px solid #000;padding-bottom:5px";
    head.innerHTML = '<div style="font-family:\'Chakra Petch\',sans-serif;font-size:14pt">' +
      esc(C.name || "Unnamed operator") + '</div><div style="font-family:\'JetBrains Mono\',monospace;' +
      'font-size:7pt;letter-spacing:.1em;color:#555;text-transform:uppercase">Level ' + C.level +
      " " + esc(C.cls) + ", cut along the dashed lines</div>";
    wrap.appendChild(head);
    var grid = el("div", "ac-grid");
    activeFeatures().forEach(function (e) {
      var t = blockText(e.f), uses = e.cost || usageOf(t);
      var kind = (e.forceType ? [e.forceType]
        : actionEntries(e.f).map(function (en) { return en.type; })).join(" · ");
      var c = el("div", "ac-card");
      var txt = (e.f.blocks || []).map(function (bl) {
        return bl.text || (bl.items || []).join(" • ");
      }).join(" ");
      txt = txt.replace(/^(?:At|By|After|Starting at|Beginning at|When you reach|When you choose[^,]*at|Upon reaching)\s+\d+(?:st|nd|rd|th)\s+level,?\s*/i, "");
      if (txt.length > 420) txt = txt.slice(0, 415).replace(/\s\S*$/, "") + "…";
      c.innerHTML = '<div class="t">' + esc(e.f.name) + '</div><div class="tags">' +
        pTag(kind, kind !== "Passive") + (uses ? pTag(uses) : "") +
        (e.f.level ? pTag("Lv " + e.f.level) : "") + "</div><p>" + esc(txt) + "</p>" +
        '<div class="src">' + esc(e.src) + "</div>";
      grid.appendChild(c);
    });
    wrap.appendChild(grid);
    root.appendChild(wrap);
  }

  function buildFull(root) {
    var wrap = el("div", "sheet-block");
    var pre = el("pre");
    pre.style.cssText = "white-space:pre-wrap;font-family:'Spectral',Georgia,serif;font-size:9.5pt;line-height:1.4";
    pre.textContent = toMarkdown().replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
    wrap.appendChild(pre);
    root.appendChild(wrap);
  }

  var printKind = "classic";
  function buildPrint(kind) {
    var root = $("#printRoot");
    if (!root || !classByName[C.cls]) return;
    root.innerHTML = "";
    ({ classic: buildClassic, pocket: buildPocket, cards: buildCards, full: buildFull }[kind] ||
      buildClassic)(root);
    applyLang(root);
  }
  function openPreview(kind) {
    printKind = kind;
    buildPrint(kind);
    var root = $("#printRoot");
    if ($(".preview-bar")) $(".preview-bar").remove();
    var bar = el("div", "preview-bar");
    var lab = PRINT_KINDS.filter(function (k) { return k[0] === kind; })[0];
    bar.innerHTML = '<span class="lab">Print preview · ' + esc(lab ? lab[1] : kind) + "</span>";
    PRINT_KINDS.forEach(function (k) {
      var b = el("button", "chip" + (k[0] === kind ? " on" : ""), esc(k[1]));
      b.onclick = function () { openPreview(k[0]); };
      bar.appendChild(b);
    });
    var pr = el("button", "btn primary", "Print");
    pr.onclick = function () { window.print(); };
    var cls = el("button", "btn", "Close");
    cls.onclick = function () {
      document.body.classList.remove("previewing");
      bar.remove();
      window.scrollTo(0, 0);
    };
    bar.appendChild(pr); bar.appendChild(cls);
    root.parentNode.insertBefore(bar, root);
    document.body.classList.add("previewing");
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------ step chrome */
  function head(s, eyebrow, title, sub) {
    var h = el("div", "stage-head");
    h.innerHTML = '<div class="eyebrow">' + esc(eyebrow) + "</div><h2>" + esc(title) + "</h2>" +
      (sub ? "<p>" + esc(sub) + "</p>" : "");
    s.appendChild(h);
    if (mode === "forge" && !s.querySelector(".help")) {
      var hp = helpPanel(step);
      if (hp) s.appendChild(hp);
    }
  }
  function needClass(s) {
    head(s, "Locked", "Pick a class first", "This step needs a class before it has anything to show.");
    var b = el("button", "btn primary", "Go to classes");
    b.onclick = function () { step = 0; render(); };
    s.appendChild(b);
  }
  function nav(s, prev, next) {
    var r = el("div", "btn-row");
    if (prev != null) {
      var p = el("button", "btn", "← Back to " + STEPS[prev]);
      p.onclick = function () { step = prev; render(); window.scrollTo(0, 0); };
      r.appendChild(p);
    }
    r.appendChild(el("div", "spacer"));
    var miss = missingFor(step);
    if (miss && helpMode) {
      var note = el("div", "slot-note");
      note.style.cssText = "flex:1 1 100%;order:-1;margin:0 0 4px;color:var(--gold)";
      note.textContent = "Still to do here: " + miss;
      r.appendChild(note);
    }
    if (next != null) {
      var n = el("button", "btn primary", "Next: " + STEPS[next] + " →");
      n.onclick = function () { step = next; render(); window.scrollTo(0, 0); };
      r.appendChild(n);
    } else if (step === 7) {
      var done = el("button", "btn primary", "Copy sheet & finish");
      done.onclick = function () {
        var md = toMarkdown();
        if (navigator.clipboard) navigator.clipboard.writeText(md).then(
          function () { toast("Sheet copied, you're ready to play"); },
          function () { toast("Copy failed"); });
      };
      r.appendChild(done);
    }
    s.appendChild(r);
  }

  /* ------------------------------------------------------------------ codex */
  function codexEntries(list, extra) {
    var q = codexQ.toLowerCase();
    return list.filter(function (x) {
      if (!q) return true;
      return JSON.stringify(x).toLowerCase().indexOf(q) >= 0;
    });
  }
  function renderCodex(s) {
    var sec = CODEX[codexSec];
    var before;
    head(s, "Codex", sec, "Straight from the book: " + D.meta.title + ", v" + D.meta.version + ".");
    var inp = el("input", "search");
    inp.id = "codexSearch";
    inp.placeholder = "Filter " + sec.toLowerCase() + "…";
    inp.setAttribute("aria-label", "Filter " + sec);
    inp.value = codexQ;
    inp.oninput = function () { codexQ = inp.value; restage("codexSearch"); };
    s.appendChild(inp);
    before = s.childElementCount;

    if (sec === "Expansion Classes") {
      codexEntries(X.classes).forEach(function (c) {
        var e = el("div", "entry");
        var h = el("div", "entry-head");
        h.innerHTML = "<h4>" + esc(c.name) + "</h4>" + sourceChip(c) +
          '<span class="chip lvl">Hit ' + esc(c.hit) + "</span>" +
          '<span class="chip">' + c.saves.join("/") + " saves</span>" +
          '<span class="chip">' + esc(c.resource) + "</span>";
        e.appendChild(h);
        e.appendChild(el("p", null, esc(c.tagline)));
        paras(c.description).forEach(function (p) { e.appendChild(el("p", null, esc(p))); });
        e.appendChild(renderTable(c.progression));
        c.features.forEach(function (f) {
          var box = el("div", "feature live");
          box.appendChild(el("div", "feature-head",
            "<h4>" + esc(f.name) + '</h4><span class="chip lvl">Lv ' + f.level + "</span>"));
          renderBlocks(f.blocks, box);
          e.appendChild(box);
        });
        subsFor(c.name).forEach(function (sc) {
          var sb = el("div", "feature live");
          sb.appendChild(el("div", "feature-head",
            "<h4>" + esc(c.name) + ": " + esc(sc.name) + "</h4>" +
            '<span class="chip lvl">Level ' + sc.levelAvailable + "</span>"));
          sb.appendChild(el("p", null, esc(sc.tagline)));
          paras(sc.description).forEach(function (p) { sb.appendChild(el("p", null, esc(p))); });
          sc.features.forEach(function (f) {
            var fb = el("div", "feature sub-feature");
            fb.appendChild(el("div", "feature-head",
              "<h4>" + esc(f.name) + '</h4><span class="chip lvl">Lv ' + f.level + "</span>"));
            renderBlocks(f.blocks, fb);
            sb.appendChild(fb);
          });
          e.appendChild(sb);
        });
        var go = el("button", "btn", "Open in forge");
        go.onclick = function () {
          C.cls = c.name; C.sub = null; C.skills = []; delete C.isExample; save();
          mode = "forge"; step = 0; render(); window.scrollTo(0, 0);
        };
        e.appendChild(go);
        s.appendChild(e);
      });
    } else if (sec === "Humanity & Cred") {
      X.systems.forEach(function (sys) {
        var e = el("div", "entry");
        e.appendChild(el("div", "entry-head", "<h4>" + esc(sys.name) +
          '</h4><span class="chip tier">Neon Ledger</span>'));
        e.appendChild(el("p", null, "<em>" + esc(sys.tagline) + "</em>"));
        renderBlocks(sys.blocks, e);
        s.appendChild(e);
      });
    } else if (sec === "Glossary") {
      var q = codexQ.toLowerCase().trim();
      var keys = Object.keys(GLOSSARY).filter(function (k) {
        return !q || (k + " " + GLOSSARY[k]).toLowerCase().indexOf(q) >= 0;
      });
      s.appendChild(el("p", "slot-note",
        "Plain-English definitions for the words this app and the rules use. " +
        "Dotted words inside the beginner guide open these too."));
      keys.forEach(function (k) {
        var e = el("div", "entry");
        e.appendChild(el("div", "entry-head", "<h4>" + esc(k) + "</h4>"));
        e.appendChild(el("p", null, esc(GLOSSARY[k])));
        s.appendChild(e);
      });
    } else if (sec === "Origins") {
      var e = el("div", "entry");
      e.appendChild(el("div", "entry-head", "<h4>" + esc(X.origins.name) +
        '</h4><span class="chip tier">Neon Ledger</span>'));
      X.origins.intro.forEach(function (p) { e.appendChild(el("p", null, esc(p))); });
      e.appendChild(renderTable(X.origins.table));
      s.appendChild(e);
    } else if (sec === "Subclasses") {
      codexEntries(ALL_SUBS).forEach(function (sub) {
        var e = el("div", "entry");
        var h = el("div", "entry-head");
        h.innerHTML = "<h4>" + esc(sub.cls) + ": " + esc(sub.name) + '</h4>' +
          '<span class="chip lvl">Level ' + sub.levelAvailable + "</span>" +
          (sub.page ? '<span class="page-ref">p. ' + sub.page + "</span>"
                    : sourceChip(sub));
        e.appendChild(h);
        e.appendChild(el("p", null, esc(sub.tagline)));
        var ul = el("ul");
        sub.features.forEach(function (f) {
          ul.appendChild(el("li", null, "<strong>" + esc(f.name) + "</strong>, level " + f.level));
        });
        e.appendChild(ul);
        var go = el("button", "btn", "Open in forge");
        go.onclick = function () {
          C.cls = sub.cls; C.sub = sub.id; delete C.isExample; save();
          mode = "forge"; step = 1; render(); window.scrollTo(0, 0);
        };
        e.appendChild(go);
        s.appendChild(e);
      });
      srdNotice(s);
    } else if (sec === "Backgrounds") {
      codexEntries(D.backgrounds).forEach(function (b) {
        var e = el("div", "entry");
        e.appendChild(el("div", "entry-head", "<h4>" + esc(b.name) + "</h4>" +
          '<span class="page-ref">p. ' + b.page + "</span>"));
        Object.keys(b.traits).forEach(function (k) {
          var r = el("div", "dos-row");
          r.innerHTML = '<span class="k">' + esc(k.replace(" Proficiencies", "")) +
            '</span><span class="v">' + esc(b.traits[k]) + "</span>";
          e.appendChild(r);
        });
        if (b.feature) {
          var f = el("div", "feature live");
          f.appendChild(el("div", "feature-head", "<h4>Feature: " + esc(b.feature.name) + "</h4>"));
          renderBlocks(b.feature.blocks, f);
          e.appendChild(f);
        }
        s.appendChild(e);
      });
    } else if (sec === "Reference Tables") {
      codexEntries(D.tables).forEach(function (t) { s.appendChild(renderTable(t)); });
    } else {
      var map = { Feats: ALL_FEATS, "Fighting Styles": D.fightingStyles,
                  "Warlock Invocations": D.invocations, "Artificer Infusions": D.infusions,
                  Cyberware: D.cyberware, Augments: D.augments };
      codexEntries(map[sec] || []).forEach(function (it) {
        var e = el("div", "entry");
        var h = el("div", "entry-head");
        h.innerHTML = "<h4>" + esc(it.name) + "</h4>" +
          (isBook(it) ? "" : sourceChip(it)) +
          (it.tier ? '<span class="chip tier">' + esc(it.tier) + "</span>" : "") +
          (it.prerequisite ? '<span class="chip warn">Prereq: ' + esc(it.prerequisite) + "</span>" : "") +
          (it.item ? '<span class="chip tier">Item: ' + esc(it.item) + "</span>" : "");
        e.appendChild(h);
        renderBlocks(it.blocks, e);
        s.appendChild(e);
      });
    }
    codexEmptyCheck(s, before);
  }

  function codexEmptyCheck(s, before) {
    if (codexQ && s.childElementCount <= before)
      s.appendChild(el("div", "no-results",
        "Nothing in this section matches “" + esc(codexQ) + "”. Try another section, " +
        "the filter only searches the one you're in."));
  }


  /* ====================================================== campaign section === */
  var CAMP_FIELDS = {
    "House Rules": { key: "rules", cols: [["title", "Rule"], ["text", "What it does"]] },
    "People":      { key: "npcs",  cols: [["name", "Name"], ["role", "Role"], ["notes", "Notes"]] },
    "Places":      { key: "places", cols: [["name", "Place"], ["notes", "Notes"]] },
    "Custom Gear": { key: "items", cols: [["name", "Item"], ["cost", "Cost"], ["notes", "Notes"]] },
    "Session Log": { key: "sessions", cols: [["date", "Date"], ["title", "Session"], ["notes", "What happened"]] }
  };

  function campListRow(c, field, entry, ix) {
    var spec = CAMP_FIELDS[field], wrap = el("div", "entry");
    var head = el("div", "entry-head");
    var title = entry[spec.cols[0][0]] || "Untitled";
    head.innerHTML = "<h4>" + esc(title) + "</h4>" +
      (spec.cols[1] && entry[spec.cols[1][0]] && spec.cols.length > 2 ?
        '<span class="chip">' + esc(entry[spec.cols[1][0]]) + "</span>" : "");
    if (!c.builtIn) {
      var del = el("button", "chip warn", "Delete");
      del.onclick = function () {
        c[spec.key].splice(ix, 1); campSave(c); render();
      };
      head.appendChild(del);
    }
    wrap.appendChild(head);
    spec.cols.slice(c.builtIn ? 1 : 0).forEach(function (col) {
      if (c.builtIn) {
        if (entry[col[0]]) wrap.appendChild(el("p", null, esc(entry[col[0]])));
        return;
      }
      var lab = el("div", "trait-line");
      lab.innerHTML = '<span class="k">' + esc(col[1]) + "</span>";
      var inp = col[0] === "notes" || col[0] === "text" ? el("textarea") : el("input");
      inp.value = entry[col[0]] || "";
      inp.setAttribute("aria-label", col[1]);
      inp.className = "search";
      inp.style.cssText = "margin:0;width:100%;" + (inp.tagName === "TEXTAREA" ? "min-height:62px;" : "");
      inp.oninput = function () { entry[col[0]] = inp.value; campSave(c); };
      lab.appendChild(inp);
      wrap.appendChild(lab);
    });
    if (c.builtIn && spec.cols.length > 2 && entry[spec.cols[1][0]])
      wrap.insertBefore(el("p", "slot-note", esc(entry[spec.cols[1][0]])), wrap.children[1]);
    return wrap;
  }

  function renderCampaign(s) {
    var all = campAll(), c = campById(campSel);
    if (!c && all.length) { setCamp(all[0].id); c = all[0]; }

    head(s, "Campaign", c ? c.name : "No campaign yet",
      c ? (c.blurb || "") : "A campaign holds the house rules, people, places and gear that " +
      "belong to one table. Create one, or ask for one to be added to the site.");

    var bar = el("div", "toolbar");
    all.forEach(function (x) {
      var b = el("button", "chip" + (x.id === campSel ? " on" : ""), esc(x.name) +
        (x.builtIn ? "" : " ·"));
      b.onclick = function () { setCamp(x.id); campSecIx = 0; render(); };
      bar.appendChild(b);
    });
    var add = el("button", "chip tier", "+ New campaign");
    add.onclick = function () {
      var nc = { id: "c" + Date.now().toString(36), name: "Untitled campaign", dm: "", blurb: "",
                 tone: [], startingLevel: 1, startingCredits: "", humanity: true,
                 rules: [], npcs: [], places: [], items: [], sessions: [], hooks: [] };
      campSave(nc); setCamp(nc.id); campSecIx = 0; render();
      toast("Campaign created");
    };
    bar.appendChild(add);
    var imp = el("button", "chip", "Import .json");
    imp.onclick = function () {
      var f = el("input"); f.type = "file"; f.accept = ".json,application/json";
      f.onchange = function () {
        var file = f.files && f.files[0];
        if (!file) return;
        var rd = new FileReader();
        rd.onload = function () {
          try {
            var obj = JSON.parse(rd.result);
            var list = Array.isArray(obj) ? obj : (obj.campaigns || [obj]);
            list.forEach(function (x) {
              if (!x.id) x.id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
              delete x.builtIn;
              campSave(x);
            });
            setCamp(list[0].id); render();
            toast("Imported " + list.length + " campaign" + (list.length === 1 ? "" : "s"));
          } catch (e) { toast("That file isn't a campaign export"); }
        };
        rd.readAsText(file);
      };
      f.click();
    };
    bar.appendChild(imp);
    s.appendChild(bar);

    if (!c) return;

    var seg = el("div", "toolbar");
    var secs = CAMPSEC.concat((c.houses || []).length || (c.districts || []).length ? ["City"] : []);
    if (campSecIx >= secs.length) campSecIx = 0;
    secs.forEach(function (name, i) {
      var b = el("button", "chip" + (i === campSecIx ? " on" : ""), esc(name));
      b.onclick = function () { campSecIx = i; render(); };
      seg.appendChild(b);
    });
    var ex = el("button", "chip tier", "Export this campaign");
    ex.onclick = function () {
      var copy = Object.assign({}, c); delete copy.builtIn;
      saveAs((c.name || "campaign").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".campaign.json",
        JSON.stringify(copy, null, 1), "application/json");
    };
    seg.appendChild(ex);
    s.appendChild(seg);

    var sec = secs[campSecIx];

    if (sec === "City") {
      /* Read-only reference: the GM's City screen tracks standing with these
         Houses and the Long Fall reads the districts' heights. The words are
         the campaign's own and stay in English, like the story. */
      var ch = el("div");
      if ((c.houses || []).length) {
        ch.appendChild(el("h3", "eyebrow", "Houses"));
        c.houses.forEach(function (h) {
          var e = el("div", "entry");
          var hh = el("div", "entry-head");
          var nm = el("h4"); nm.textContent = h.name; nm.setAttribute("data-nolang", "");
          hh.appendChild(nm);
          e.appendChild(hh);
          [["", h.controls], ["At their worst", h.enemy], ["At their best", h.patron]].forEach(function (x) {
            if (!x[1]) return;
            var p = el("p");
            if (x[0]) { var k = el("b", null, esc(x[0])); p.appendChild(k); p.appendChild(document.createTextNode(" ")); }
            var t = el("span"); t.textContent = x[1]; t.setAttribute("data-nolang", "");
            p.appendChild(t);
            e.appendChild(p);
          });
          ch.appendChild(e);
        });
      }
      if ((c.districts || []).length) {
        ch.appendChild(el("h3", "eyebrow", "Districts, from the top"));
        c.districts.slice().sort(function (a, b) { return (b.height || 0) - (a.height || 0); }).forEach(function (d) {
          var e = el("div", "entry");
          var hh = el("div", "entry-head");
          var nm = el("h4"); nm.textContent = d.name; nm.setAttribute("data-nolang", "");
          hh.appendChild(nm);
          hh.appendChild(el("span", "chip", esc(String(d.height || 0)) + " ft"));
          e.appendChild(hh);
          var p = el("p"); p.textContent = d.notes || ""; p.setAttribute("data-nolang", "");
          e.appendChild(p);
          ch.appendChild(e);
        });
      }
      s.appendChild(ch);

    } else if (sec === "Overview") {
      var g = el("div");
      if (!c.builtIn) {
        [["name", "Name"], ["dm", "Run by"], ["blurb", "Pitch"], ["startingCredits", "Starting credits"]]
          .forEach(function (f) {
            var row = el("div", "trait-line");
            row.innerHTML = '<span class="k">' + esc(f[1]) + "</span>";
            var inp = f[0] === "blurb" ? el("textarea") : el("input");
            inp.className = "search";
            inp.style.cssText = "margin:0;width:100%;" + (f[0] === "blurb" ? "min-height:70px;" : "");
            inp.value = c[f[0]] || "";
            inp.setAttribute("aria-label", f[1]);
            inp.oninput = function () { c[f[0]] = inp.value; campSave(c); };
            row.appendChild(inp);
            g.appendChild(row);
          });
        var lv = el("div", "trait-line");
        lv.innerHTML = '<span class="k">Starting level</span>';
        var ls = el("input");
        ls.type = "number"; ls.min = 1; ls.max = 20; ls.value = c.startingLevel || 1;
        ls.className = "search"; ls.style.cssText = "margin:0;width:90px";
        ls.setAttribute("aria-label", "Starting level");
        ls.oninput = function () { c.startingLevel = +ls.value; campSave(c); };
        lv.appendChild(ls);
        g.appendChild(lv);
      } else {
        [["Run by", c.dm], ["Starting level", c.startingLevel],
         ["Starting credits", c.startingCredits],
         ["Humanity track", c.humanity === false ? "Not in play" : "In play"],
         ["Tone", (c.tone || []).join(" · ")]].forEach(function (x) {
          if (!x[1]) return;
          var row = el("div", "trait-line");
          row.innerHTML = '<span class="k">' + esc(x[0]) + "</span>" + esc(x[1]);
          g.appendChild(row);
        });
      }
      s.appendChild(g);

      var use = el("div", "toolbar");
      use.style.marginTop = "18px";
      var ub = el("button", "btn primary", "Use these settings on my character");
      ub.onclick = function () {
        if (c.startingLevel) C.level = c.startingLevel;
        C.campaign = c.id;
        delete C.isExample; save(); mode = "forge"; render();
        toast("Character set to level " + C.level + " for " + c.name);
      };
      use.appendChild(ub);
      if (!c.builtIn) {
        var del = el("button", "btn", "Delete campaign");
        del.onclick = function () {
          if (!confirm("Delete " + c.name + "? This can't be undone.")) return;
          campUserWrite(campUser().filter(function (x) { return x.id !== c.id; }));
          setCamp(null); render(); toast("Campaign deleted");
        };
        use.appendChild(del);
      }
      s.appendChild(use);

    } else if (sec === "Hooks") {
      var hk = el("div");
      (c.hooks || []).forEach(function (t, i) {
        var row = el("div", "entry");
        if (c.builtIn) { row.appendChild(el("p", null, esc(t))); }
        else {
          var ta = el("textarea");
          ta.className = "search";
          ta.style.cssText = "margin:0;width:100%;min-height:58px";
          ta.value = t;
          ta.setAttribute("aria-label", "Hook " + (i + 1));
          ta.oninput = function () { c.hooks[i] = ta.value; campSave(c); };
          row.appendChild(ta);
          var d = el("button", "chip warn", "Delete");
          d.onclick = function () { c.hooks.splice(i, 1); campSave(c); render(); };
          row.appendChild(d);
        }
        hk.appendChild(row);
      });
      if (!(c.hooks || []).length) hk.appendChild(el("p", "empty-state", "No hooks yet."));
      s.appendChild(hk);
      if (!c.builtIn) {
        var ah = el("button", "btn", "+ Add hook");
        ah.onclick = function () { c.hooks = c.hooks || []; c.hooks.push(""); campSave(c); render(); };
        s.appendChild(ah);
      }

    } else {
      var spec = CAMP_FIELDS[sec];
      var list = c[spec.key] || [];
      var host = el("div");
      list.forEach(function (entry, ix) { host.appendChild(campListRow(c, sec, entry, ix)); });
      if (!list.length) host.appendChild(el("p", "empty-state", "Nothing here yet."));
      s.appendChild(host);
      if (!c.builtIn) {
        var ab = el("button", "btn", "+ Add " + sec.replace(/s$/, "").toLowerCase());
        ab.onclick = function () {
          c[spec.key] = c[spec.key] || [];
          var blank2 = {};
          spec.cols.forEach(function (col) { blank2[col[0]] = ""; });
          c[spec.key].push(blank2); campSave(c); render();
        };
        s.appendChild(ab);
      }
    }
  }

  /* ---------------------------------------------------------------- render */
  /* One entry per mode. A lookup rather than a ternary chain, because the old
     chain fell through to Codex and a fourth mode would have silently set
     codexSec on every rail click. */
  var RAILS = {
    forge:    { title: "Build order", list: STEPS,
                get: function () { return step; },      set: function (i) { step = i; } },
    codex:    { title: "Sections",    list: CODEX,
                get: function () { return codexSec; },  set: function (i) { codexSec = i; codexQ = ""; } },
    table:    { title: "The table",   list: GMSEC,
                get: function () { return gmSecIx; },   set: function (i) { gmSecIx = i; } }
  };
  function renderRail() {
    var r = $("#rail");
    var R = RAILS[mode] || RAILS.forge;
    r.innerHTML = "";
    r.appendChild(el("div", "rail-title", R.title));
    var wrap = el("div", "steps");
    var cur = R.get();
    R.list.forEach(function (label, i) {
      var done = mode === "forge" && stepDone(i);
      var b = el("button", "step" + (done && i !== cur ? " done" : ""));
      b.setAttribute("aria-current", i === cur);
      b.innerHTML = '<span class="step-n">' + (done && i !== cur ? "" : (mode === "forge" ?
        String(i + 1).padStart(2, "0") : "·")) + '</span><span class="step-l">' + esc(label) + "</span>";
      b.onclick = function () { R.set(i); render(); window.scrollTo(0, 0); };
      wrap.appendChild(b);
    });
    r.appendChild(wrap);
  }
  function stepDone(i) {
    switch (i) {
      case 0: return !!C.cls;
      case 1: return !!mySub();
      case 2: return !!C.bg && bgSkills().length >= skillGrant().fixed.length + skillGrant().n;
      case 3: return C.method === "pointbuy" ? pbSpent() > 0 : abilitiesDone();
      case 4: return C.cls ? C.skills.length === classByName[C.cls].skillCount : false;
      case 5:
        if (!C.cls) return false;
        var n = asiSlotCount(), f = asiSlots().filter(function (x) { return x.type; }).length;
        var sp2 = scalingSpec();
        var picksOk = !sp2 || ((C.picks && C.picks[sp2.spec.key]) || []).length >= sp2.allowed;
        var styleOk = ["Fighter", "Paladin", "Ranger"].indexOf(C.cls) < 0 || !!C.style;
        var sleeveOk = C.cls !== "Stackborn" || !!C.sleeve;
        return f === n && picksOk && styleOk && sleeveOk;
      case 6: return !!(C.cyber.length || C.augments.length || C.gear.length);
      default: return false;
    }
  }
  var levelFrom = null;   // the level a slider gesture started at, for the toast
  function renderDossier() {
    var d = $("#dossier");
    d.innerHTML = "";
    var cl = classByName[C.cls], sub = mySub(), b = bgObj(), sc = scores();
    var head = el("div", "dos-head");
    head.appendChild(el("div", "lab", C.isExample ? "Example build" : "Operator dossier"));
    var nm = el("input", "dos-name");
    nm.id = "charName";
    nm.value = C.name;
    nm.placeholder = "Name your operator";
    nm.setAttribute("aria-label", "Character name");
    nm.oninput = function () { C.name = nm.value; delete C.isExample; save(); renderDossierSoft(); };
    head.appendChild(nm);
    d.appendChild(head);

    var body = el("div", "dos-body");
    var lv = el("div", "lvl-row");
    lv.innerHTML = '<span class="k" style="font-family:var(--f-mono);font-size:10px;' +
      'letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)">Level</span>';
    var range = el("input");
    range.type = "range"; range.min = 1; range.max = 20; range.value = C.level; range.id = "levelRange";
    range.setAttribute("aria-label", "Character level");
    range.setAttribute("aria-valuetext", T("Level " + C.level));
    var badge = el("span", "lvl-badge", C.level);
    /* While it moves, update in place: rebuilding the slider under the pointer
       ended a drag after one level, and the arrow keys lost focus after one
       press. The full redraw waits for "change", which fires on release and on
       every key press. */
    range.oninput = function () {
      if (levelFrom == null) levelFrom = C.level;
      C.level = +range.value; delete C.isExample; save();
      badge.textContent = C.level;
      range.setAttribute("aria-valuetext", T("Level " + C.level));
      renderRail(); applyLang($("#rail"));
      renderStage(); applyLang($("#stage"));
    };
    range.onchange = function () {
      var was = levelFrom == null ? C.level : levelFrom, now = +range.value;
      levelFrom = null;
      C.level = now; delete C.isExample; save(); render();
      var again = $("#levelRange");
      if (again) again.focus();
      /* A raise opens (or widens) the level-up panel at the top of the
         page; lowering below where it started closes it. Focus stays on the
         slider, so the arrow keys keep working. */
      if (now > was && C.cls) {
        levelUp = { from: levelUp && levelUp.from < was ? levelUp.from : was, to: now };
        renderStage(); applyLang($("#stage"));
      } else if (levelUp && now <= levelUp.from) {
        levelUp = null;
        renderStage(); applyLang($("#stage"));
      } else if (levelUp) {
        levelUp.to = now;
        renderStage(); applyLang($("#stage"));
      }
    };
    lv.appendChild(range);
    lv.appendChild(badge);
    body.appendChild(lv);
    if (cl && C.level > 1 && !levelUp && mode === "forge") {
      var wc = el("button", "chip lvl-what", "What changed at level " + C.level);
      wc.onclick = function () { levelUp = { from: C.level - 1, to: C.level }; render(); window.scrollTo(0, 0); };
      body.appendChild(wc);
    }

    var vit = el("div", "vitals");
    [["HP", cl ? maxHP() : "-"], ["Prof", sgn(profBonus(C.level))],
     ["Init", sgn(cl ? initiative() : mod(sc.Dex))]].forEach(function (v) {
      var x = el("div", "vital");
      x.innerHTML = '<div class="k">' + v[0] + '</div><div class="v">' + v[1] + "</div>";
      vit.appendChild(x);
    });
    body.appendChild(vit);

    [["Class", cl ? cl.name : null],
     ["Archetype", sub ? (C.level >= sub.levelAvailable ? sub.name :
        sub.name + " (lv " + sub.levelAvailable + ")") : null],
     ["Background", b ? b.name : null],
     ["Origin", C.origin || null],
     ["Skills", allSkills().length ? allSkills().join(", ") : null],
     ["Options", [C.style].concat(takenFeats(), C.invocations, C.infusions)
        .filter(Boolean).join(", ") || null],
     ["Chrome", C.cyber.length || C.augments.length ?
        (C.cyber.length + C.augments.length) + " installed · " + fmtCredits(spend()) : null]
    ].forEach(function (r) {
      var row = el("div", "dos-row");
      row.innerHTML = '<span class="k">' + r[0] + "</span>" +
        '<span class="v' + (r[1] ? "" : " empty") + '">' + esc(r[1] || "not set") + "</span>";
      body.appendChild(row);
    });

    var doneCount = 0;
    for (var si = 0; si < 8; si++) if (stepDone(si)) doneCount++;
    var prog = el("div", "progress");
    prog.innerHTML = '<span class="n">Step ' + Math.min(step + 1, 8) + ' of 8</span>' +
      '<span class="progress-bar"><span class="progress-fill" style="width:' +
      Math.round((doneCount / 8) * 100) + '%"></span></span>' +
      '<span class="n">' + doneCount + '/8 done</span>';
    body.appendChild(prog);

    var nextIx = firstIncomplete();
    if (nextIx !== null) {
      var nc = el("div", "next-card");
      nc.appendChild(el("div", "k", nextIx === step ? "On this step" : "Next thing to do"));
      nc.appendChild(el("div", "what", esc(missingFor(nextIx))));
      if (nextIx !== step) {
        var gb = el("button", "btn", "Go to " + STEPS[nextIx]);
        gb.onclick = function () { step = nextIx; render(); window.scrollTo(0, 0); };
        nc.appendChild(gb);
      }
      body.appendChild(nc);
    } else if (C.cls) {
      var nc2 = el("div", "next-card");
      nc2.appendChild(el("div", "k", "Ready"));
      nc2.appendChild(el("div", "what",
        "Everything's filled in. Open the play sheet to print or copy your character."));
      var gb2 = el("button", "btn", "Open play sheet");
      gb2.onclick = function () { step = 7; render(); window.scrollTo(0, 0); };
      nc2.appendChild(gb2);
      body.appendChild(nc2);
    }

    var unspent = asiSlotCount() - asiSlots().filter(function (x) { return x.type; }).length;
    var spN = scalingSpec();
    var pickShort = spN ? spN.allowed - ((C.picks && C.picks[spN.spec.key]) || []).length : 0;
    if (unspent > 0 || pickShort > 0) {
      var todo = [];
      if (unspent > 0) todo.push(unspent + " ability/feat choice" + (unspent === 1 ? "" : "s"));
      if (pickShort > 0) {
        var lbl = spN.spec.label.toLowerCase();
        todo.push(pickShort + " " + (pickShort === 1 ? lbl.replace(/s$/, "") : lbl));
      }
      var nb = el("button", "btn");
      nb.style.cssText = "width:100%;justify-content:center;border-color:var(--signal);color:var(--signal)";
      nb.textContent = "Level up: " + todo.join(" + ") + " to pick";
      nb.onclick = function () { step = 5; mode = "forge"; render(); window.scrollTo(0, 0); };
      body.appendChild(nb);
    }

    body.appendChild(humanityMeter(true));
    var em2 = essenceMeter();
    if (em2) body.appendChild(em2);

    var btns = el("div", "btn-row");
    btns.style.cssText = "margin-top:6px;padding-top:12px";
    var fresh = el("button", "btn", "New character");
    fresh.onclick = function () {
      if (!C.isExample && !confirm("Discard the current character and start fresh?")) return;
      clearShareHash();
      C = blank(); save(); step = 0; render();
    };
    var sv = el("button", "btn primary", "Save to roster");
    sv.onclick = saveToRoster;
    btns.appendChild(sv); btns.appendChild(fresh);
    body.appendChild(btns);

    var roster = el("div");
    roster.id = "roster";
    body.appendChild(roster);
    d.appendChild(body);
    refreshRoster();
  }
  function renderDossierSoft() {
    // name edits shouldn't steal focus, only repaint the label
    var lab = $(".dos-head .lab");
    if (lab) lab.textContent = C.isExample ? "Example build" : "Operator dossier";
  }

  /* ---------------------------------------------------------------- roster */
  function saveToRoster() {
    if (!C.name) { toast("Name your operator first"); var n = $("#charName"); if (n) n.focus(); return; }
    if (C.isShared) {
      delete C.isShared;
      C.id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      clearShareHash();
      save();
    }
    var ok = rosterPut(C);
    refreshRoster();
    if (ok) toast("Saved to this browser");
    else storageFailed("Not saved, this browser refused to store it.");
  }

  /* A failed write is not a 2-second toast. It stays until acted on, and it
     offers the one thing that still works: getting the data out to a file. */
  function storageFailed(msg) {
    var host = $("#roster");
    toast("Not saved, storage is blocked or full");
    if (!host) return;
    var old = $(".storage-alert");
    if (old) old.remove();
    var box = el("div", "note storage-alert");
    box.style.borderLeftColor = "var(--alert)";
    var b = el("b", null, "Not saved");
    var sp = el("span");
    sp.textContent = msg + " Your work is still on screen, download it now, " +
      "then free up space or leave private browsing.";
    box.appendChild(b); box.appendChild(sp);
    var dl = el("button", "btn primary", "Download this character");
    dl.onclick = function () {
      var slug = (C.name || "character").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      saveAs(slug + ".ttb.json", JSON.stringify(C, null, 1), "application/json");
    };
    box.appendChild(dl);
    host.parentNode.insertBefore(box, host);
  }

  /* The dossier is already long on a phone, so the roster shows the twelve
     most recent by default. It used to stop there: the header counted every
     save, the list showed twelve, and anything older had no Open or Delete
     button anywhere in the interface. */
  var ROSTER_SHORT = 12, rosterAllShown = false;
  function refreshRoster() {
    var host = $("#roster");
    if (!host) return;
    var list = rosterAll();
    host.innerHTML = "";
    if (list === null) {
      var warn = el("div", "rail-title", "Saved in this browser");
      warn.style.marginTop = "12px";
      host.appendChild(warn);
      host.appendChild(el("p", "empty-state",
        "Can't read saved characters in this browser, site data may be blocked. " +
        "Nothing has been deleted."));
      return;
    }
    var t = el("div", "rail-title", "Saved in this browser · " + list.length);
    t.style.marginTop = "12px";
    host.appendChild(t);
    if (!list.length)
      host.appendChild(el("p", "empty-state", "Nothing saved yet. Hit Save to roster above."));
    var w = el("div", "roster");
    var sorted = list.slice().sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
    var shown = rosterAllShown ? sorted : sorted.slice(0, ROSTER_SHORT);
    shown.forEach(function (r) {
        var item = el("div", "roster-item" + (r.id === C.id ? " current" : ""));
        item.innerHTML = '<span class="nm">' + esc(r.name) + '</span>' +
          '<span class="meta">' + esc(r.cls) + " " + esc(r.level) + "</span>";
        var open = el("button", "chip", "Open");
        open.onclick = function () {
          try {
            clearShareHash();
            C = migrate(JSON.parse(r.payload)); save(); step = 7; mode = "forge"; render();
          } catch (e) { toast("That save is damaged"); }
        };
        var del = el("button", "chip warn", "✕");
        del.setAttribute("aria-label", "Delete " + r.name);
        del.onclick = function () {
          if (!confirm("Delete " + r.name + " from this browser?")) return;
          rosterDrop(r.id); refreshRoster(); toast("Deleted");
        };
        item.appendChild(open); item.appendChild(del);
        w.appendChild(item);
      });
    host.appendChild(w);
    if (sorted.length > ROSTER_SHORT) {
      var more = el("button", "chip", rosterAllShown ? "Show the latest " + ROSTER_SHORT
                                                     : "Show all " + sorted.length);
      more.style.marginTop = "6px";
      more.onclick = function () { rosterAllShown = !rosterAllShown; refreshRoster(); };
      host.appendChild(more);
    }

    var row = el("div", "toolbar");
    row.style.marginTop = "8px";
    var exp = el("button", "chip", "Export all");
    exp.onclick = function () {
      if (!list.length) { toast("Nothing to export"); return; }
      saveAs("technomancer-characters.json",
        JSON.stringify({ kind: "ttb-roster", saved: new Date().toISOString(),
          characters: list.map(function (r) { return JSON.parse(r.payload); }) }, null, 1),
        "application/json");
    };
    var imp = el("button", "chip", "Import");
    imp.onclick = function () {
      var f = el("input"); f.type = "file"; f.accept = ".json,application/json";
      f.onchange = function () {
        var file = f.files && f.files[0];
        if (!file) return;
        var rd = new FileReader();
        rd.onload = function () {
          try {
            var obj = JSON.parse(rd.result);
            var chars = obj.characters || (Array.isArray(obj) ? obj : [obj]);
            chars.forEach(function (ch) {
              if (!ch.id) ch.id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
              rosterPut(migrate(ch));
            });
            refreshRoster();
            toast("Imported " + chars.length + " character" + (chars.length === 1 ? "" : "s"));
          } catch (e) { toast("That file isn't a character export"); }
        };
        rd.readAsText(file);
      };
      f.click();
    };
    row.appendChild(exp); row.appendChild(imp);
    host.appendChild(row);
    // Also called on its own after a delete or an import, when render(), and
    // so applyLang(), is not running. Without this the roster redrew itself
    // in English on a Spanish page.
    applyLang(host);
  }

  function localList() {
    try { return JSON.parse(localStorage.getItem("ttb.roster") || "[]"); } catch (e) { return []; }
  }

  /* ------------------------------------------------------------------ boot */
  /* Redraw just the stage from a filter box, and put the caret back. It has to
     do what render() does last, too: without applyLang one keystroke in Spanish
     turned the whole page back to English. */
  function restage(focusId) {
    renderStage();
    applyLang($("#stage"));
    var n = focusId && $("#" + focusId);
    if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  }

  function renderStage() {
    var s = $("#stage");
    s.innerHTML = "";
    if (mode === "table") return window.TTGM.renderStage(s, gmSecIx);
    // The Campaign screen lives in the GM tools now; players never reach it.
    if (mode === "campaign") mode = "forge";
    if (mode === "codex") return renderCodex(s);
    if (step === 0 && !C.cls && helpMode) {
      var w = el("div", "welcome");
      w.innerHTML = "<h3>Making your first character?</h3>" +
        "<p>You're going to answer eight questions, in order, down the left-hand side. " +
        "Each one adds to the sheet on the right. It takes about ten minutes, nothing is " +
        "permanent, and the last step gives you something you can print and bring to the table.</p>" +
        "<p>Every step has a <em>New to this?</em> box explaining what it's for in plain " +
        "English, and dotted words like <em>hit die</em> can be tapped for a definition.</p>";
      var row = el("div", "row");
      var qb = el("button", "btn primary", "Build one for me");
      qb.onclick = function () {
        quickBuild(); step = 7; render(); window.scrollTo(0, 0);
        toast("Built a level 3 Chromehound, change anything you like");
      };
      var st = el("button", "btn", "I'll choose myself");
      st.onclick = function () {
        var g = $(".welcome");
        if (g) g.remove();
        var first = $(".pick");
        if (first) first.focus();
      };
      row.appendChild(qb); row.appendChild(st);
      w.appendChild(row);
      s.appendChild(w);
    }
    if (C.isShared) {
      var sn = el("div", "note");
      sn.style.borderLeftColor = "var(--accent)";
      sn.innerHTML = "<b>Shared character</b><span>Someone sent you " +
        esc(C.name || "this character") + ". Changes won't be kept unless you hit " +
        "<em>Save to roster</em> in the panel on the right, that makes a copy of your own.</span>";
      s.appendChild(sn);
    }
    if (C.isExample) {
      var n = el("div", "note");
      n.innerHTML = "<b>Example build</b><span>Nyx Calderón is loaded so you can see a " +
        "finished sheet. Change anything, or hit <em>New character</em> in the dossier, " +
        "and it becomes yours.</span>";
      s.appendChild(n);
    }
    var lp = levelUpPanel();
    if (lp) s.appendChild(lp);
    [stepClass, stepArchetype, stepBackground, stepAbilities, stepProf,
     stepOptions, stepGear, stepSheet][step](s);
  }
  function render() {
    // Locking the GM tools while they're open has to eject you from them.
    if (!gmOn && mode === "table") mode = "forge";
    renderRail();
    renderStage();
    if (mode === "table") window.TTGM.renderDossier($("#dossier"));
    else renderDossier();
    var gb3 = $("#guideBtn");
    if (gb3) {
      gb3.setAttribute("aria-pressed", helpMode);
      gb3.style.color = helpMode ? "var(--signal)" : "";
      gb3.style.borderColor = helpMode ? "var(--signal)" : "";
    }
    $("#mForge").setAttribute("aria-pressed", mode === "forge");
    $("#mCodex").setAttribute("aria-pressed", mode === "codex");
    var mt = $("#mTable");
    if (mt) { mt.hidden = !gmOn; mt.setAttribute("aria-pressed", mode === "table"); }
    var lb = $("#langBtn");
    if (lb) {
      lb.textContent = LANG === "es" ? "EN" : "ES";
      lb.setAttribute("aria-pressed", LANG === "es");
      lb.setAttribute("title", LANG === "es" ? "Switch to English" : "Cambiar a español");
      lb.setAttribute("aria-label", lb.getAttribute("title"));
    }
    langNote();
    // Last, and over the whole document: the GM tools, the dossier and the
    // masthead are all built by different code paths and none of them should
    // have to know this feature exists.
    applyLang();
  }

  /* Say plainly what the Spanish is and is not.
   *
   * The rules text is machine translated and a mistranslated "ventaja" or a
   * dropped "no" changes how a rule works, so nobody should mistake it for a
   * checked translation. The English is one tap away, and the proper nouns are
   * left in English on purpose because saved characters are keyed on them,
   * both of which are worth saying rather than leaving people to work out. */
  function langNote() {
    var old = $(".lang-note");
    if (old) old.remove();
    if (LANG !== "es") return;
    var n = el("div", "note lang-note");
    n.setAttribute("data-nolang", "");
    n.innerHTML =
      "<b>Traducción automática</b>" +
      "<span>El texto de las reglas está traducido por máquina; el inglés es la versión " +
      "de referencia. Pulsa <b>EN</b> arriba para ver el original.</span>" +
      "<span>Los nombres de clases, arquetipos, dotes y equipo se quedan en inglés a " +
      "propósito: tu personaje se guarda con esos nombres y la hoja calcula a partir de " +
      "ellos.</span>" +
      (esBook === "ready" ? "" :
        "<span>" + (esBook === "failed"
          ? "No se pudieron cargar las reglas en español; se muestran en inglés."
          : "Las reglas se están cargando y mientras tanto se muestran en inglés.") + "</span>");
    var ws = $(".workspace");
    if (ws && ws.parentNode) ws.parentNode.insertBefore(n, ws);
  }

  /* ---- GM tools: hidden until someone knows the address --------------------
     #gm=<token> unlocks and remembers on this device; #gm=off puts it away
     again. The token sits in a public file on a public deploy, so this is
     obscurity, not security, the real guarantee is that nothing the GM keeps
     ever leaves the tablet.                                                */
  function gmUnlock(on) {
    gmOn = !!on;
    try {
      if (on) localStorage.setItem("ttb.gm", "1");
      else localStorage.removeItem("ttb.gm");
    } catch (e) {}
    if (!on && mode === "table") mode = "forge";
  }
  function gmHash() {
    var m = (location.hash || "").match(/[#&]gm=([^&]+)/);
    if (!m) return false;
    var tok = decodeURIComponent(m[1]);
    var want = (window.TTBGM && window.TTBGM.unlock) || "table";
    if (tok === "off") gmUnlock(false);
    else if (tok === want) { gmUnlock(true); mode = "table"; }
    else return false;
    // Strip only our own token; a c= share fragment alongside it must survive.
    var rest = (location.hash || "").replace(/[#&]gm=[^&]*/, "").replace(/^[#&]+/, "");
    try {
      history.replaceState(null, "", location.pathname + location.search + (rest ? "#" + rest : ""));
    } catch (e) {}
    return true;
  }

  /* ---- what gm.js is allowed to see ---------------------------------------
     Everything above is closed over by this IIFE, and the startup merge at the
     top mutates the book data in place while building classByName/subById, so
     gm.js cannot rebuild any of it correctly on its own. Hand over the already
     merged references instead. App state is reached through accessors, never
     as raw bindings.                                                        */
  window.TT = {
    // book data and lookups
    D: D, X: X, SRD: SRD, CAMP: CAMP, classByName: classByName, subById: subById,
    ALL_CLASSES: ALL_CLASSES, ALL_SUBS: ALL_SUBS, ALL_FEATS: ALL_FEATS,
    tableByTitle: tableByTitle, subsFor: subsFor, paras: paras,
    sourceName: sourceName, isBook: isBook,
    T: T, applyLang: applyLang, setLang: setLang, roleChip: roleChip,
    // the GM tools share the player side's ? guide, and host the Campaign screen
    renderCampaign: function (s) { return renderCampaign(s); },
    helpOn: function () { return helpMode; },
    setHelp: function (v) {
      helpMode = !!v;
      try { localStorage.setItem("ttb.help", helpMode ? "1" : "0"); } catch (e) {}
      render();
    },
    getLang: function () { return LANG; }, esHasBook: esHasBook,
    ABIL: ABIL, ABIL_FULL: ABIL_FULL, HSTATE: HSTATE, CLASS_DC: CLASS_DC,
    // dom helpers
    $: $, el: el, esc: esc, toast: toast, head: head, renderTable: renderTable,
    renderBlocks: renderBlocks, collapsible: collapsible, saveAs: saveAs,
    humanityMeter: humanityMeter, essenceMeter: essenceMeter,
    // the numbers
    mod: mod, sgn: sgn, profBonus: profBonus, dieSize: dieSize,
    FEAT_EFFECTS: FEAT_EFFECTS, asiLevelsFor: asiLevelsFor, featBump: featBump,
    weaponProficient: weaponProficient, baseScores: baseScores, droppedNote: droppedNote,
    storageIsBroken: storageIsBroken,
    withChar: withChar, statsOf: statsOf, saveBonus: saveBonus, skillBonus: skillBonus,
    passiveSkill: passiveSkill, initiative: initiative, initiativeNote: initiativeNote,
    saveDC: saveDC, attackBonus: attackBonus, armorClass: armorClass, maxHP: maxHP,
    allSkills: allSkills, humanity: humanity, activeFeatures: activeFeatures,
    blockText: blockText, actionType: actionType, actionEntries: actionEntries,
    usageOf: usageOf, toMarkdown: toMarkdown,
    // character plumbing
    migrate: migrate, blank: blank, b64u: b64u, unb64u: unb64u, slimChar: slimChar,
    rosterAll: rosterAll, campAll: campAll, campById: campById, campSel: function () { return campSel; },
    // app state
    getMode: function () { return mode; },
    setMode: function (m) { mode = m; },
    gmSec: function (v) { if (v != null) gmSecIx = v; return gmSecIx; },
    gmLock: function () { gmUnlock(false); render(); },
    render: render
  };

  function init() {
    // Just the version on screen; the rest is one hover away for whoever
    // needs to know which build a tablet is running.
    var bm = $("#brandMeta");
    bm.textContent = "v" + String(D.meta.version).split(" ")[0];
    bm.title = D.meta.author + " · v" + D.meta.version + " · " + D.meta.pages + " pp · build " + BUILD;
    // Before anything renders, so the first paint is already in the right
    // language rather than flashing English first.
    LANG = lsRead(LANG_KEY) === "es" ? "es" : "en";
    document.documentElement.setAttribute("lang", LANG);
    esRebuild();
    if (LANG === "es") loadEsBook();
    var unlocked = gmHash();
    if (window.TTGM && window.TTGM.boot) window.TTGM.boot(window.TT);
    var shared = readShared();
    if (shared) {
      // Keep the hash: the visitor may reload, and we must not clobber whatever
      // character they already had in this browser.
      C = migrate(shared);
      C.isShared = true;
      setTimeout(function () { toast("Shared character, Save to roster to keep it"); }, 400);
    } else {
      C = load() || migrate(example());
    }
    // Reloading the tablet mid-session should land back where you were.
    if (gmOn && !shared && !unlocked && window.TTGM && window.TTGM.lastMode &&
        window.TTGM.lastMode() === "table") mode = "table";
    $("#mForge").onclick = function () { mode = "forge"; render(); window.scrollTo(0, 0); };
    $("#mCodex").onclick = function () { mode = "codex"; render(); window.scrollTo(0, 0); };
    if ($("#mTable")) $("#mTable").onclick = function () { mode = "table"; render(); window.scrollTo(0, 0); };
    var gbtn = $("#guideBtn");
    gbtn.onclick = function () {
      helpMode = !helpMode;
      try { localStorage.setItem("ttb.help", helpMode ? "1" : "0"); } catch (e) {}
      render();
      toast(helpMode ? "Beginner guide on" : "Beginner guide off");
    };
    if ($("#langBtn")) {
      $("#langBtn").onclick = function () { setLang(LANG === "es" ? "en" : "es"); };
    }
    /* A card lights up once, when it is picked. A style on [aria-pressed]
       alone would replay on every redraw of the same selection; this finds
       the card again after the click's own render() and marks just that one. */
    document.addEventListener("click", function (e) {
      var p = e.target.closest && e.target.closest(".pick");
      var h = p && p.querySelector("h3");
      if (!h) return;
      var name = h.textContent;
      setTimeout(function () {
        var hit = [].filter.call(document.querySelectorAll('#stage .pick[aria-pressed="true"]'), function (x) {
          var hh = x.querySelector("h3");
          return hh && hh.textContent === name;
        })[0];
        if (!hit) return;
        var card = hit.parentNode.classList.contains("pick-wrap") ? hit.parentNode : hit;
        card.classList.remove("just-picked");
        void card.offsetWidth;            // restart the animation if it is already there
        card.classList.add("just-picked");
      }, 0);
    }, true);

    $("#themeBtn").onclick = function () {
      var r = document.documentElement;
      var cur = r.getAttribute("data-theme");
      // dark unless someone has chosen light: it is the default, not the system's call
      var isDark = cur !== "light";
      r.setAttribute("data-theme", isDark ? "light" : "dark");
      try { localStorage.setItem("ttb.theme", r.getAttribute("data-theme")); } catch (e) {}
    };
    try {
      var t = localStorage.getItem("ttb.theme");
      if (t) document.documentElement.setAttribute("data-theme", t);
    } catch (e) {}
    render();

    // A hash-only navigation (pasting a share link while already here) doesn't reload.
    window.addEventListener("hashchange", function () {
      if (gmHash()) { render(); window.scrollTo(0, 0); toast(gmOn ? "GM tools unlocked" : "GM tools locked"); return; }
      var sh = readShared();
      if (!sh) return;
      C = migrate(sh); C.isShared = true;
      step = 7; mode = "forge"; render(); window.scrollTo(0, 0);
      toast("Shared character loaded");
    });

  }
  /* Offline shell. Lives here rather than inline in index.html so the page can
     ship a Content-Security-Policy with script-src 'self' and no unsafe-inline.
     Service workers need https (or localhost), so this quietly does nothing
     when the page is opened straight off the disk. */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js")["catch"](function () {});
    });
  }

  init();
})();
