/* app/boot.js: The rail, the dossier, the roster panel, render(), the GM unlock, the
   window.TT namespace gm.js reads, and start-up. Loaded last. */
"use strict";

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
  // The player screen for the TV: the map and nothing else. It only reads.
  if (/^#mapview\b/.test(location.hash) && window.TTGM && window.TTGM.mountPlayerView) {
    window.TTGM.mountPlayerView(false);
    return;
  }
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
