/* Technomancer's Terminal, character forge + codex for The Technomancer's Textbook.
 *
 * The player's application is split across app/*.js, loaded in order by
 * index.html: core, i18n, rules, guide, forge, sheet, print, codex, boot.
 * They share one script scope (plain top-level declarations, no build step),
 * which is what the single IIFE gave them before; the only name meant for
 * anyone else is window.TT, published by boot.js.
 */
/* app/core.js: DOM helpers, the book data and its lookups, the character in memory,
   and the storage primitives. Loaded first; everything after it builds on these. */
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
var BUILD = "2026-09-26 15:00";
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

/* ---- prices ---------------------------------------------------------------
   The book's prices climb tenfold a tier, past anything a crew earns: Tier 3
   chrome is millions. A campaign can play on street prices instead (Cathedra
   does): chrome drops harder the higher the tier, so Tier 3 is a goal rather
   than a fantasy, and everything else costs half. The book's number is still
   shown beside it, and the Codex keeps the book's tables as they are.     */
var STREET_CHROME = { 1: 10, 2: 25, 3: 100, 4: 250 };
function priceMode(c) {
  var camp = c && c.campaign ? campById(c.campaign) : null;
  return camp && camp.prices === "street" ? "street" : "book";
}
function streetRound(v) {
  var step = v < 20 ? 1 : v < 100 ? 5 : v < 1000 ? 50 : v < 10000 ? 100 : 500;
  return Math.max(1, Math.round(v / step) * step);
}
// kind "chrome" takes its tier; anything else is "gear" (augments, weapons, armor, kit)
function priceOf(kind, bookCost, tier, c) {
  var n = parseCredits(bookCost);
  if (!n || priceMode(c || C) !== "street") return n;
  return streetRound(kind === "chrome" ? n / (STREET_CHROME[tier] || 10) : n / 2);
}
function chromePrice(x) { return priceOf("chrome", cyberCost[x.name.toLowerCase() + "|" + x.tier], x.tier); }
function augPrice(name) { return priceOf("gear", augCost[name.toLowerCase()]); }
// what one of this item costs; custom items cost what their owner typed
function gearPrice(g) { return g.custom ? parseCredits(g.cost) : priceOf("gear", g.cost); }
function priceText(n) { return n ? fmtCredits(n) : "-"; }

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
var GMSEC = ["Party", "Encounter", "Rulings", "NPCs", "Clocks", "Story", "Campaign", "City", "Toolkit", "Maps"];
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
