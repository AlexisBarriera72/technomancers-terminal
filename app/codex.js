/* app/codex.js: Step chrome (head, nav), the Codex, and the Campaign screen the GM tools host. */
"use strict";

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
  } else if (sec === "Spells") {
    codexSpells(s);
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

/* Every spell the app knows, by class and level. The SRD's, plus the
   character's campaign's own when it has any. */
var codexSpellCls = null, codexSpellLv = null;
function codexSpells(s) {
  var casters = Object.keys(SPD.casters).sort();
  var bar = el("div", "toolbar spell-filter");
  [null].concat(casters).forEach(function (n) {
    var b = el("button", "chip" + (codexSpellCls === n ? " on" : ""), n === null ? "Every class" : esc(n));
    if (n) b.setAttribute("data-nolang", "");
    b.onclick = function () { codexSpellCls = n; render(); };
    bar.appendChild(b);
  });
  s.appendChild(bar);
  var lv = el("div", "toolbar spell-filter");
  [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (l) {
    var b = el("button", "chip" + (codexSpellLv === l ? " on" : ""), l === null ? "All levels" : l === 0 ? "Cantrips" : SPELL_ORD[l]);
    b.onclick = function () { codexSpellLv = l; render(); };
    lv.appendChild(b);
  });
  s.appendChild(lv);
  var own = campSpells(C).filter(function (x) { return !x.gm; });
  var all = codexEntries(SPD.spells.concat(own)).filter(function (x) {
    return (codexSpellCls === null || (x.cls || []).indexOf(codexSpellCls) >= 0) &&
           (codexSpellLv === null || x.l === codexSpellLv);
  });
  var cn = el("p", "slot-note");
  cn.appendChild(el("span", null, all.length + " spells."));
  if (SPD.meta) { cn.appendChild(document.createTextNode(" ")); cn.appendChild(el("span", null, esc(SPD.meta.note))); }
  s.appendChild(cn);
  all.slice().sort(function (a, b) { return a.l - b.l || a.n.localeCompare(b.n); }).forEach(function (x) {
    s.appendChild(spellCard({ name: x.n, s: x }, null));
  });
  if (SPD.meta) {
    // the licence's own words, kept as written in either language
    var lic = el("p", "page-ref srd-note", esc(SPD.meta.notice));
    lic.setAttribute("data-nolang", "");
    s.appendChild(lic);
  }
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
               tone: [], startingLevel: 1, startingCredits: "", prices: "street", humanity: true,
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
  var secs = CAMPSEC.concat((c.houses || []).length || (c.districts || []).length ? ["City"] : [])
    .concat(c.magic && typeof c.magic === "object" ? ["Magic"] : []);
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

  } else if (sec === "Magic") {
    campMagicPage(s, c);

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
      var pl = el("div", "trait-line");
      pl.innerHTML = '<span class="k">Prices</span>';
      var ps = el("select");
      ps.className = "search"; ps.style.cssText = "margin:0;width:auto";
      ps.setAttribute("aria-label", "Prices");
      [["book", "Book prices"], ["street", "Street prices"]].forEach(function (o) {
        var op = el("option", null, o[1]); op.value = o[0];
        if ((c.prices === "street" ? "street" : "book") === o[0]) op.selected = true;
        ps.appendChild(op);
      });
      ps.onchange = function () { c.prices = ps.value; campSave(c); };
      pl.appendChild(ps);
      g.appendChild(pl);
    } else {
      [["Run by", c.dm], ["Starting level", c.startingLevel],
       ["Starting credits", c.startingCredits],
       ["Prices", c.prices === "street" ? "Street prices" : "Book prices"],
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

/* The campaign's magic: how it works here, how each class's looks, and the
   spells only this campaign has. Words only; the sheet uses the same data. */
function campMagicPage(s, c) {
  var m = c.magic, box = el("div");
  (Array.isArray(m.rules) ? m.rules : []).forEach(function (r) {
    var e = el("div", "entry");
    e.appendChild(el("div", "entry-head", "<h4>" + esc(r.title || "") + "</h4>"));
    e.appendChild(el("p", null, esc(r.text || "")));
    box.appendChild(e);
  });
  var looks = m.looks && typeof m.looks === "object" ? Object.keys(m.looks) : [];
  if (looks.length) {
    box.appendChild(el("h3", "eyebrow", "How each class's magic looks"));
    looks.sort().forEach(function (k) {
      var r = el("div", "trait-line");
      var kk = el("span", "k"); kk.textContent = k; kk.setAttribute("data-nolang", "");
      r.appendChild(kk);
      r.appendChild(document.createTextNode(T(String(m.looks[k]))));
      box.appendChild(r);
    });
  }
  var own = (Array.isArray(m.spells) ? m.spells : []).filter(function (x) { return x && x.n && !x.gm; });
  if (own.length) {
    box.appendChild(el("h3", "eyebrow", "Spells only " + esc(c.name) + " has"));
    box.appendChild(el("p", "slot-note", "On the class lists shown on each, for any character in this campaign."));
    own.forEach(function (x) {
      var sp = Object.assign({ src: "camp" }, x);
      var card = spellCard({ name: sp.n, s: sp }, null);
      var who = el("p", "page-ref");
      who.textContent = (x.cls || []).join(", ");
      who.setAttribute("data-nolang", "");
      card.querySelector(".body").appendChild(who);
      box.appendChild(card);
    });
  }
  var names = m.names && typeof m.names === "object" ? Object.keys(m.names) : [];
  if (names.length) {
    box.appendChild(el("h3", "eyebrow", "What the street calls them"));
    var tb = el("div", "spell-street-list");
    tb.setAttribute("data-nolang", "");
    names.sort().forEach(function (k) {
      var r = el("div", "trait-line");
      var kk = el("span", "k"); kk.textContent = k;
      r.appendChild(kk);
      var v = el("b"); v.textContent = (m.names[k] || [])[0] || "";
      r.appendChild(v);
      r.appendChild(document.createTextNode(" " + ((m.names[k] || [])[1] || "")));
      tb.appendChild(r);
    });
    box.appendChild(tb);
  }
  s.appendChild(box);
}
