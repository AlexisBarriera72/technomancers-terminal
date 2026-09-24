#!/usr/bin/env node
/* The rules text that needs translating, taken from the data rather than the DOM.
 *
 * leadify() and renderTable() translate whole data strings now, so a book key is
 * exactly the string data.js holds, which means this can enumerate the work
 * without a browser, in the order a reader meets it.
 *
 * Names are deliberately absent: class, archetype, feature, feat, background and
 * gear names stay English because characters are stored keyed on them and the
 * rules lookups read them. Only prose is listed.
 *
 *   node tools/book-worklist.js [group]
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const w = {};
for (const f of ["data.js", "expansion.js", "srd.js", "campaigns.js"]) {
  new Function("window", fs.readFileSync(path.join(ROOT, f), "utf8"))(w);
}
const B = w.TTB, X = w.TTBX, S = w.TTSRD;
const C = (w.TTBC && w.TTBC.campaigns) || [];

const seen = new Set();
const groups = {};
function add(group, s) {
  if (typeof s !== "string") return;
  const t = s.trim();
  if (!t || !/[A-Za-z]{3}/.test(t) || seen.has(t)) return;
  seen.add(t);
  (groups[group] = groups[group] || []).push(t);
}
function blocks(group, bs) {
  (bs || []).forEach(b => {
    if (b.type === "p") add(group, b.text);
    else if (b.type === "ul") (b.items || []).forEach(i => add(group, i));
    else if (b.type === "table") table(group, b);
  });
}
function table(group, t) {
  if (!t) return;
  add(group, t.title);
  (t.headers || []).forEach(h => add(group, h));
  (t.rows || []).forEach(r => r.forEach(c => add(group, c)));
}
function features(group, fs_) {
  (fs_ || []).forEach(f => blocks(group, f.blocks));
}
function sidebars(group, list) {
  (list || []).forEach(sb => {
    add(group, sb.title);
    (sb.lines || []).forEach(l => add(group, l));
    (sb.sections || []).forEach(sec => {
      add(group, sec.title);
      (sec.lines || []).forEach(l => add(group, l));
    });
  });
}

/* classes */
[].concat(B.classes, X.classes).forEach(c => {
  add("classes", c.tagline);
  (c.description || []).forEach(p => add("classes", p));
  ["armor", "weapons", "tools", "firearms", "resource"].forEach(k => add("classes", c[k]));
  table("classes", c.progression);
  features("classes", c.features);
});

/* archetypes */
[].concat(B.subclasses, X.subclasses, S ? S.subclasses : []).forEach(s => {
  add("archetypes", s.tagline);
  (s.description || []).forEach(p => add("archetypes", p));
  features("archetypes", s.features);
  sidebars("archetypes", s.sidebars);
  (s.statblocks || []).forEach(sb => sidebars("archetypes", [sb]));
});

/* feats, styles, invocations, infusions */
[].concat(B.feats, X.feats).forEach(f => {
  add("feats", f.prerequisite);
  (f.description || []).forEach(p => add("feats", p));
  blocks("feats", f.blocks);
  add("feats", f.text);
});
[].concat(B.fightingStyles || [], B.invocations || [], B.infusions || []).forEach(o => {
  add("feats", o.prerequisite);
  (o.description || []).forEach(p => add("feats", p));
  blocks("feats", o.blocks);
  add("feats", o.text);
});

/* backgrounds */
(B.backgrounds || []).forEach(b => {
  Object.keys(b.traits || {}).forEach(k => { add("backgrounds", k); add("backgrounds", b.traits[k]); });
  (b.description || []).forEach(p => add("backgrounds", p));
  if (b.feature) { add("backgrounds", b.feature.name); blocks("backgrounds", b.feature.blocks); add("backgrounds", b.feature.text); }
  (b.tables || []).forEach(t => table("backgrounds", t));
  blocks("backgrounds", b.blocks);
});

/* gear, chrome, reference tables */
(B.cyberware || []).forEach(o => { add("gear", o.tier); (o.description || []).forEach(p => add("gear", p)); blocks("gear", o.blocks); add("gear", o.text); });
(B.augments || []).forEach(o => { (o.description || []).forEach(p => add("gear", p)); blocks("gear", o.blocks); add("gear", o.text); });
(B.tables || []).forEach(t => table("gear", t));
(B.skillsAndTools || []).forEach(o => { add("gear", o.text); blocks("gear", o.blocks); });

/* setting: systems, origins, campaigns */
(X.systems || []).forEach(s2 => { add("setting", s2.tagline); blocks("setting", s2.blocks); });
if (X.origins) { add("setting", X.origins.tagline); (X.origins.intro || []).forEach(p => add("setting", p)); table("setting", X.origins.table); }
if (S && S.meta) { add("setting", S.meta.tagline); add("setting", S.meta.note); }
C.forEach(c => {
  add("campaigns", c.tagline); add("campaigns", c.blurb); add("campaigns", c.pitch);
  (c.tone || []).forEach(t => add("campaigns", t));
  (c.hooks || []).forEach(h => add("campaigns", h));
  (c.rules || []).forEach(r => { add("campaigns", r.title); add("campaigns", r.text); });
  (c.npcs || []).forEach(n => { add("campaigns", n.role); add("campaigns", n.notes); });
});

const want = process.argv[2];
let total = 0, chars = 0;
Object.keys(groups).forEach(g => {
  const n = groups[g].length, c = groups[g].reduce((a, b) => a + b.length, 0);
  total += n; chars += c;
  if (!want) console.log(g.padEnd(12) + String(n).padStart(6) + " strings" + String(c).padStart(9) + " chars");
});
if (!want) console.log("-".repeat(40) + "\n" + "total".padEnd(12) + String(total).padStart(6) + " strings" + String(chars).padStart(9) + " chars");
else (groups[want] || []).forEach((s, i) => console.log(i + "\t" + JSON.stringify(s)));
