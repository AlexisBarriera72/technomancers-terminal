/* app/forge.js: The Forge's first seven steps: class, archetype, background, abilities,
   proficiencies, level-up choices, and chrome & gear. */
"use strict";

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

  /* ---- spells (app/magic.js) ---- */
  spellPicker(s);

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

/* a price in the Forge's lists: on street prices the book's number sits beside it */
function costHtml(n, book) {
  if (priceMode(C) !== "street") return esc(book);
  return esc(priceText(n)) + ' <span class="book-cost"><span>book</span> ' + esc(book) + "</span>";
}
/* which prices this character pays, and a way onto a campaign's street prices */
function pricesNote() {
  var box = el("div", "prices-note");
  var camp = C.campaign ? campById(C.campaign) : null;
  if (priceMode(C) === "street") {
    box.appendChild(el("b", null, "Street prices"));
    var nm = el("span", "chip", esc(camp.name));
    nm.setAttribute("data-nolang", "");
    box.appendChild(nm);
    box.appendChild(el("span", null,
      "Chrome costs far less than the book says, the more so the higher the tier, and everything else costs half."));
    return box;
  }
  box.appendChild(el("b", null, "Book prices"));
  var street = camp ? null : campAll().filter(function (x) { return x.prices === "street"; })[0];
  if (street) {
    var b = el("button", "chip", esc("Playing in " + street.name + "? Use its prices"));
    b.onclick = function () {
      C.campaign = street.id;
      delete C.isExample; save(); render();
      toast("Street prices, from " + street.name);
    };
    box.appendChild(b);
  } else {
    box.appendChild(el("span", null, camp ? "This campaign plays the book's prices." : "The prices printed in the book."));
  }
  return box;
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
  s.appendChild(pricesNote());

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
        (cost ? " · " + costHtml(priceOf("chrome", cost, t), cost) : ""));
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
      (on ? "✓ " : "") + '<span class="hum-cost">−1 HUM</span>' + (cost ? " · " + costHtml(priceOf("gear", cost), cost) : ""));
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
      r.forEach(function (c, ci) {
        row.appendChild(el("td", ci === 1 ? "cost" : null, ci === 1 && c ? costHtml(priceOf("gear", c), c) : esc(c)));
      });
      body.appendChild(row);
    });
    tb.appendChild(body); w.appendChild(tb); panel.appendChild(w);
    wrap.appendChild(panel);
    s.appendChild(wrap);
  });
  nav(s, 5, 7);
}
