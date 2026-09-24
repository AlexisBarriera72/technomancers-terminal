/* app/guide.js: The beginner guide, share links and the roster, campaign storage, and
   toast(). */
"use strict";

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
