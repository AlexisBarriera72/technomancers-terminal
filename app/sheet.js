/* app/sheet.js: The play sheet (step 8) and what sits around it: inventory and credits,
   the level-up panel, the turn cards, the Puppeteer's frames, and the
   Markdown export. */
"use strict";

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
