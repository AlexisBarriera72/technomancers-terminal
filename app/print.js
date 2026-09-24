/* app/print.js: Printable layouts: classic, pocket, cards and full, and the preview. */
"use strict";

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
      esc(priceText(gearPrice(g))) + "</span></div>";
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
