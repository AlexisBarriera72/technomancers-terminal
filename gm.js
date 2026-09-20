/* gm.js — the GM's side of the table.
 *
 * Two halves:
 *   window.TTBGM  reference data you can edit by hand — the unlock token, the
 *                 DC ladder, conditions, the rulings catalogue, NPC templates
 *                 and the name lists the improviser draws from.
 *   window.TTGM   the code. app.js hands it a namespace (window.TT) on boot;
 *                 nothing here runs at load time and nothing here reaches into
 *                 app.js directly.
 *
 * Rulings schema — every field but id/q/roll is optional:
 *   id    slug
 *   q     the situation, as a player would describe it
 *   keys  extra search words
 *   roll  {kind:"check", skill}         an ability check
 *         {kind:"save",  abil}          a saving throw
 *         {kind:"contest", skill, vs}   opposed; vs is the other side's skill
 *         {kind:"none",  text}          don't roll; say this instead
 *   dc    a dcLadder key ("moderate") or a raw number (15)
 *   alt   [{when, dc}]  harder or easier versions of the same job
 *   fail  what going wrong looks like — not "nothing happens"
 *   note  a rule you'll otherwise forget
 *   tags  grouping
 *
 * Synergies — classRoles tags each class with one or two of roles[]; a party's
 *   coverage is looked up in crewTiers by how many distinct roles it holds.
 *   synergyPairs are named two-class combinations: {id, name, pair:[a,b],
 *   line}, plus an optional `wired` string on the one pair that is actually
 *   computed rather than read aloud.
 *
 * Street Cred — repBands is the expansion's own 0-10 table made real:
 *   {min, max, tier, mod, tone, buys, digging, combat}. mod is added to
 *   Charisma checks. reactionBands turn one d20 into what an NPC does about
 *   the party: {max, name, tone, gist}, ascending, null max on the top band.
 *
 * NPC schema lives next to npcTemplates below.
 */

window.TTBGM = {

  /* Change this and the old address stops working. Anyone who reads this file
     can find it — it keeps a curious player out, not a determined one. */
  unlock: "cathedra",

  dcLadder: [
    { key: "trivial",  dc: 5,  label: "Trivial",   gist: "Anyone not actively hindered." },
    { key: "easy",     dc: 10, label: "Easy",      gist: "A trained hand barely notices." },
    { key: "moderate", dc: 15, label: "Moderate",  gist: "The default. Most rolls live here." },
    { key: "hard",     dc: 20, label: "Hard",      gist: "A specialist's day at work." },
    { key: "extreme",  dc: 25, label: "Extreme",   gist: "Expertise plus luck." },
    { key: "legend",   dc: 30, label: "Near-impossible", gist: "Someone is spending a resource." }
  ],

  conditions: [
    { name: "Blinded", gist: "Can't see. Auto-fails sight checks; attacks against have advantage, its own have disadvantage." },
    { name: "Charmed", gist: "Can't attack the charmer. Charmer has advantage on social checks with it." },
    { name: "Deafened", gist: "Can't hear. Auto-fails hearing checks." },
    { name: "Frightened", gist: "Disadvantage while the source is in sight. Can't willingly move closer." },
    { name: "Grappled", gist: "Speed 0. Ends if the grappler is incapacitated." },
    { name: "Incapacitated", gist: "No actions, no reactions." },
    { name: "Invisible", gist: "Attacks against have disadvantage, its own have advantage." },
    { name: "Paralyzed", gist: "Incapacitated, can't move or speak, auto-fails Str and Dex saves. Hits within 5 ft. are crits." },
    { name: "Petrified", gist: "Turned to stone. Incapacitated, resistance to all damage, immune to poison and disease." },
    { name: "Poisoned", gist: "Disadvantage on attacks and ability checks." },
    { name: "Prone", gist: "Disadvantage on attacks. Melee against has advantage, ranged has disadvantage." },
    { name: "Restrained", gist: "Speed 0. Attacks against have advantage, its own have disadvantage, disadvantage on Dex saves." },
    { name: "Stunned", gist: "Incapacitated, auto-fails Str and Dex saves, attacks against have advantage." },
    { name: "Unconscious", gist: "Incapacitated, drops everything, prone. Hits within 5 ft. are crits." },
    { name: "Exhaustion", gist: "Stacking. 1 disadvantage on checks · 2 half speed · 3 disadvantage on attacks and saves · 4 half HP max · 5 speed 0 · 6 death." },
    { name: "Concentrating", gist: "On damage: Con save, DC 10 or half the damage, whichever is higher." },
    /* Cathedra and the Humanity track */
    { name: "Dissociated", gist: "Humanity 40-59%. Disadvantage on Persuasion against anyone who can see the chrome, and on Insight to read emotion." },
    { name: "Fraying", gist: "Humanity 20-39%. DC 12 Wis save on a crit or at 0 HP, or attack the nearest creature." },
    { name: "Flatlining", gist: "Humanity 1-19%. Disadvantage on Wis saves. Long rests restore half Hit Dice." },
    { name: "Consecrated", gist: "Cathedra: no netrunning, no smartlink, no comms. Powered cyberware works at disadvantage." },
    { name: "Marked by the god", gist: "Cathedra: it has noticed this one. Your call what that costs." }
  ],

  /* ------------------------------------------------------------- rulings --
     Grows one entry at a time between sessions. The generic picker covers
     anything not listed, so a gap here is never a dead end.               */
  rulings: [
    /* ---- infiltration ---- */
    { id: "pick-lock", q: "Pick a mechanical lock", keys: ["lock", "door", "picks", "break in"],
      roll: { kind: "check", skill: "Sleight of Hand" }, dc: "moderate",
      alt: [{ when: "A cheap padlock", dc: "easy" }, { when: "Bank-grade, or under time pressure", dc: "hard" }],
      fail: "The picks bind. Another attempt takes ten minutes, or the tools break.",
      note: "Needs thieves' tools. No proficiency means no roll at all on anything above easy.", tags: ["infiltration"] },
    { id: "sneak-past", q: "Move past a guard unseen", keys: ["sneak", "stealth", "hide", "creep", "past"],
      roll: { kind: "contest", skill: "Stealth", vs: "Perception" },
      note: "Use the guard's passive Perception unless they're actively searching. Don't roll for them twice.",
      fail: "Not spotted outright — heard. They call it in and start walking your way.", tags: ["infiltration"] },
    { id: "tail-someone", q: "Follow someone through a crowd without being made",
      keys: ["tail", "follow", "shadow", "track"],
      roll: { kind: "contest", skill: "Stealth", vs: "Perception" }, dc: "moderate",
      note: "Professionals check their tail at corners. Ask for a new roll each time they do.", tags: ["infiltration", "city"] },
    { id: "climb", q: "Climb something without gear", keys: ["climb", "scale", "wall", "up"],
      roll: { kind: "check", skill: "Athletics" }, dc: "moderate",
      alt: [{ when: "Ladder rungs, cargo netting, a fire escape", dc: "trivial" },
            { when: "Wet, sheer, or under fire", dc: "hard" }],
      fail: "Halfway, and stuck. Falling is the second failure, not the first.", tags: ["infiltration", "physical"] },
    { id: "forge-creds", q: "Forge or spoof a credential", keys: ["forge", "fake", "id", "papers", "badge", "credential"],
      roll: { kind: "check", skill: "Deception" }, dc: "hard",
      alt: [{ when: "They have a stolen genuine one to copy", dc: "moderate" }],
      note: "If the check is against a machine rather than a person, use Technology instead.",
      fail: "It scans clean now and flags on the overnight audit.", tags: ["infiltration", "social"] },
    { id: "disable-alarm", q: "Disable an alarm or camera", keys: ["alarm", "camera", "sensor", "disable", "loop"],
      roll: { kind: "check", skill: "Technology" }, dc: "moderate",
      alt: [{ when: "Military-grade, or actively monitored", dc: "hard" }],
      fail: "It goes quiet locally and reports the outage upstream.", tags: ["infiltration", "netrunning"] },

    /* ---- netrunning ---- */
    { id: "hack-panel", q: "Hack a door panel or terminal", keys: ["hack", "panel", "terminal", "bypass", "netrun", "door"],
      roll: { kind: "check", skill: "Technology" }, dc: "moderate",
      alt: [{ when: "Consumer kit", dc: "easy" }, { when: "Corporate", dc: "hard" }, { when: "Military or bank", dc: "extreme" }],
      fail: "Failure by 5 or more trips the alarm rather than just refusing.",
      note: "Technology replaces Arcana for anything with a circuit in it.", tags: ["netrunning"] },
    { id: "splice-feed", q: "Splice a feed off a camera network", keys: ["camera", "feed", "splice", "cctv", "surveillance", "watch"],
      roll: { kind: "check", skill: "Technology" }, dc: "moderate",
      alt: [{ when: "They have a physical tap on the cable", dc: "easy" },
            { when: "Someone is watching the watchroom", dc: "hard" }],
      fail: "The splice holds for one scene, then security notices the duplicate stream.", tags: ["netrunning"] },
    { id: "trace-signal", q: "Trace a signal back to its source", keys: ["trace", "signal", "source", "origin", "track", "call"],
      roll: { kind: "check", skill: "Technology" }, dc: "hard",
      alt: [{ when: "Sloppy amateur", dc: "easy" }, { when: "Routed through a ghost relay", dc: "extreme" }],
      fail: "You get a district, not an address — and they know they were traced.", tags: ["netrunning"] },
    { id: "scrub-record", q: "Scrub or alter a record", keys: ["scrub", "delete", "record", "erase", "edit", "file", "database"],
      roll: { kind: "check", skill: "Technology" }, dc: "hard",
      fail: "The record is gone and the deletion is logged. Someone will read that log.",
      note: "Altering is harder than deleting. Deleting is conspicuous. Neither is clean.", tags: ["netrunning"] },
    { id: "ice-resist", q: "An ICE program hits them", keys: ["ice", "black ice", "program", "attacked", "net damage"],
      roll: { kind: "save", abil: "Int" }, dc: "moderate",
      note: "Damage taken in the NET is real. The body in the chair is what the crew is standing over.",
      tags: ["netrunning", "combat"] },
    { id: "jack-out", q: "Jack out under pressure", keys: ["jack out", "disconnect", "unplug", "escape net"],
      roll: { kind: "save", abil: "Con" }, dc: "moderate",
      fail: "Out, but stunned until the end of their next turn.",
      note: "A safe jack-out needs no roll. This is for when something has hold of them.", tags: ["netrunning"] },

    /* ---- social ---- */
    { id: "talk-down", q: "Talk someone out of violence", keys: ["talk down", "calm", "defuse", "persuade", "stand down"],
      roll: { kind: "check", skill: "Persuasion" }, dc: "moderate",
      alt: [{ when: "They're paid to be here and you're offering more", dc: "easy" },
            { when: "They have orders and a supervisor", dc: "hard" }],
      note: "Street Cred adds to Charisma checks — check the party's track before setting the DC.",
      fail: "They don't attack. They also don't leave, and now they've seen your face.", tags: ["social"] },
    { id: "lie", q: "Tell a lie to someone's face", keys: ["lie", "bluff", "deceive", "con", "story"],
      roll: { kind: "contest", skill: "Deception", vs: "Insight" },
      note: "Contest against their Insight, or use passive Insight if they aren't suspicious yet.",
      fail: "They don't call it. They just stop volunteering anything.", tags: ["social"] },
    { id: "read-someone", q: "Read whether someone is lying", keys: ["read", "insight", "lying", "truth", "sense motive"],
      roll: { kind: "contest", skill: "Insight", vs: "Deception" },
      note: "Tell them what the person's manner suggests, not a verdict. Insight reads people, not facts.",
      tags: ["social"] },
    { id: "intimidate", q: "Lean on someone", keys: ["intimidate", "threaten", "scare", "lean on", "menace"],
      roll: { kind: "check", skill: "Intimidation" }, dc: "moderate",
      note: "Visible chrome helps here and hurts on Persuasion. Below 60% Humanity that's a real trade.",
      fail: "Compliance now, a grudge later, and a description given to someone who pays for them.", tags: ["social"] },
    { id: "haggle", q: "Haggle a price", keys: ["haggle", "barter", "price", "negotiate", "deal", "cheaper"],
      roll: { kind: "check", skill: "Persuasion" }, dc: "moderate",
      note: "Success moves the price 10-25%, not to whatever they wanted. A fixer's cut is not negotiable.",
      tags: ["social", "city"] },
    { id: "gather-rumour", q: "Find out what the street knows", keys: ["rumour", "rumor", "ask around", "word", "gossip", "who knows"],
      roll: { kind: "check", skill: "Persuasion" }, dc: "easy",
      note: "Investigation if they're working records, Persuasion if they're working people. Both take hours.",
      fail: "They learn something true and out of date, and are remembered asking.", tags: ["social", "city"] },
    { id: "keep-composure", q: "Keep a straight face when something goes wrong",
      keys: ["composure", "straight face", "panic", "hold it together"],
      roll: { kind: "check", skill: "Deception" }, dc: "easy", tags: ["social"] },

    /* ---- perception & investigation ---- */
    { id: "spot-ambush", q: "Notice an ambush", keys: ["ambush", "notice", "spot", "see", "perception", "surprise"],
      roll: { kind: "contest", skill: "Perception", vs: "Stealth" },
      note: "Use passive Perception unless they said they were looking. Don't ask for a roll you'd have made in secret.",
      tags: ["combat", "perception"] },
    { id: "search-room", q: "Search a room properly", keys: ["search", "toss", "investigate", "look through", "room"],
      roll: { kind: "check", skill: "Investigation" }, dc: "moderate",
      note: "Perception is what they notice walking in. Investigation is what they find when they take ten minutes.",
      tags: ["perception"] },
    { id: "spot-tail", q: "Notice they're being followed", keys: ["followed", "tail", "watched", "behind"],
      roll: { kind: "contest", skill: "Perception", vs: "Stealth" }, tags: ["perception", "city"] },
    { id: "id-ware", q: "Identify what chrome someone is running", keys: ["identify", "chrome", "ware", "cyberware", "what are they running"],
      roll: { kind: "check", skill: "Technology" }, dc: "moderate",
      alt: [{ when: "It's visible", dc: "easy" }, { when: "Subdermal and well-fitted", dc: "hard" }],
      tags: ["perception", "chrome"] },

    /* ---- medical ---- */
    { id: "stabilise", q: "Stabilise someone at 0 HP", keys: ["stabilise", "stabilize", "dying", "bleeding out", "first aid"],
      roll: { kind: "check", skill: "Medicine" }, dc: 10,
      note: "DC 10 flat, an action, and it doesn't restore hit points. A Streetdoc has better options.",
      tags: ["medical"] },
    { id: "field-surgery", q: "Field surgery, or pull ware loose", keys: ["surgery", "operate", "remove ware", "extract", "cut out"],
      roll: { kind: "check", skill: "Medicine" }, dc: "hard",
      note: "Tearing ware loose does 2d6 to 6d6 slashing by grade — see the Tearing Ware Loose table. Doing it properly takes a clinic.",
      fail: "It comes out. So does something that was holding them together.", tags: ["medical", "chrome"] },
    { id: "diagnose", q: "Work out what's wrong with someone", keys: ["diagnose", "sick", "poisoned", "what's wrong", "illness"],
      roll: { kind: "check", skill: "Medicine" }, dc: "moderate", tags: ["medical"] },
    { id: "resist-drug", q: "Resist a drug, toxin or gas", keys: ["drug", "poison", "toxin", "gas", "dosed", "spiked"],
      roll: { kind: "save", abil: "Con" }, dc: "moderate", tags: ["medical", "combat"] },

    /* ---- combat & physical ---- */
    { id: "dodge-blast", q: "Get clear of a blast", keys: ["blast", "explosion", "grenade", "dodge", "dive"],
      roll: { kind: "save", abil: "Dex" }, dc: "moderate",
      note: "Half damage on a success unless the source says otherwise.", tags: ["combat"] },
    { id: "hold-ground", q: "Resist being moved, grabbed or knocked down", keys: ["shove", "grapple", "knock down", "push", "hold ground"],
      roll: { kind: "contest", skill: "Athletics", vs: "Athletics" },
      note: "The defender may use Acrobatics instead. Their choice, not yours.", tags: ["combat", "physical"] },
    { id: "break-free", q: "Break out of a grapple or restraints", keys: ["break free", "escape", "restrained", "tied", "cuffs"],
      roll: { kind: "contest", skill: "Acrobatics", vs: "Athletics" },
      note: "Athletics to overpower, Acrobatics to slip. Rope and cuffs are Sleight of Hand against a flat DC.",
      tags: ["combat", "physical"] },
    { id: "resist-fear", q: "Hold it together in front of something awful", keys: ["fear", "terror", "horror", "frightened", "nerve"],
      roll: { kind: "save", abil: "Wis" }, dc: "moderate", tags: ["combat", "cathedra"] },
    { id: "jump-gap", q: "Jump a gap", keys: ["jump", "leap", "gap", "across"],
      roll: { kind: "check", skill: "Athletics" }, dc: "moderate",
      note: "A running long jump clears feet equal to Strength score with no roll. Only roll past that.",
      tags: ["physical"] },
    { id: "chase", q: "Keep up in a foot chase", keys: ["chase", "run", "pursue", "keep up", "catch"],
      roll: { kind: "check", skill: "Athletics" }, dc: "moderate",
      note: "Best of three rolls over three rounds beats one roll. Let Acrobatics cover the obstacles.",
      tags: ["physical", "city"] },

    /* ---- vehicles & the city ---- */
    { id: "drive-hard", q: "Drive hard — evade, ram, or take a corner too fast",
      keys: ["drive", "car", "chase", "evade", "ram", "vehicle", "bike"],
      roll: { kind: "check", skill: "Technology" }, dc: "moderate",
      note: "No Vehicles skill in this book. Technology for anything driven, Athletics if they're hanging off it.",
      fail: "They keep it on the road and lose the thing they were chasing.", tags: ["vehicle", "city"] },
    { id: "navigate-city", q: "Find a way through a district they don't know",
      keys: ["navigate", "lost", "route", "way through", "shortcut"],
      roll: { kind: "check", skill: "Survival" }, dc: "moderate", tags: ["city"] },
    { id: "fence-goods", q: "Fence something hot", keys: ["fence", "sell", "hot", "stolen", "move goods"],
      roll: { kind: "check", skill: "Persuasion" }, dc: "moderate",
      note: "A Fixer does this with Favours instead of a roll. Let them.", tags: ["city", "social"] },
    { id: "spot-corp", q: "Tell whether someone is corporate", keys: ["corp", "corporate", "suit", "company", "who are they"],
      roll: { kind: "check", skill: "Insight" }, dc: "easy",
      note: "Shoes and posture. Anyone who's lived in the zone knows this one — consider giving it free.",
      tags: ["city", "social"] },

    /* ---- Cathedra: the campaign's own rules ---- */
    { id: "cathedra-consecrated", q: "They try to netrun on consecrated ground",
      keys: ["consecrated", "sanctum", "holy", "church", "netrun here", "no signal"],
      roll: { kind: "none", text: "It doesn't work. No netrunning, no smartlink, no comms — and powered cyberware operates at disadvantage while they stand there." },
      note: "House rule. It's absolute, not a DC. Say so before they commit to a plan built on it.",
      tags: ["cathedra"] },
    { id: "cathedra-secondhand", q: "They install second-hand ware",
      keys: ["second hand", "secondhand", "used ware", "salvage", "remnant", "cheap chrome"],
      roll: { kind: "none", text: "It installs at +2 Humanity over the listed cost, and it carries a Remnant — something of the last owner comes with it." },
      note: "House rule. The Remnant is yours to invent. Make it a person, not a debuff.",
      tags: ["cathedra", "chrome"] },
    { id: "cathedra-fall", q: "They fall more than 60 feet",
      keys: ["fall", "falling", "drop", "off the edge", "60 feet"],
      roll: { kind: "none", text: "They don't land — they drop a district. Work out where they come down before you work out the damage." },
      note: "House rule. A fall in Cathedra is a change of scene.", tags: ["cathedra"] },
    { id: "cathedra-favour", q: "They want to pay in favours rather than grams",
      keys: ["favour", "favor", "on the book", "owe", "credit", "tab"],
      roll: { kind: "none", text: "Favours on the book replace payment. Write down who holds it — the book is a real object and someone keeps it." },
      note: "House rule. A held favour should come back in a later session, unprompted.", tags: ["cathedra", "social"] },
    { id: "humanity-fraying", q: "A Fraying character takes a crit or drops to 0",
      keys: ["fraying", "humanity", "crit", "zero", "cyberpsychosis", "snap"],
      roll: { kind: "save", abil: "Wis" }, dc: 12,
      note: "Only at Humanity 20-39%. On a failure they attack the nearest creature — nearest, not an enemy.",
      fail: "They turn on whoever is closest. That is usually the person who just saved them.",
      tags: ["cathedra", "chrome", "combat"] },
    { id: "signal-surveillance", q: "Church of the Signal origin senses surveillance",
      keys: ["surveillance", "watched", "bugged", "signal", "church"],
      roll: { kind: "check", skill: "Perception" }, dc: 13,
      note: "Origin perk, Wisdom (Perception) DC 13, and only for that origin. They can always attempt it.",
      tags: ["cathedra", "perception"] },
    { id: "god-notices", q: "The god notices someone", keys: ["god", "notice", "attention", "d20", "session start"],
      roll: { kind: "none", text: "Roll the attention die at the start of the session. On a 20 the god notices one character — use the button on the Party screen." },
      note: "House rule. The Clocks screen is the right place to track what comes of it.",
      tags: ["cathedra"] }
  ],

  /* ------------------------------------------------------------- synergies --
     Two layers, because 21 classes make 210 pairs and nobody wants to read
     that many. A short list of named pairs carries the flavour; the role tags
     underneath it mean a party of classes nobody thought to pair still gets
     told what it covers and what it doesn't.

     Roles are assigned from what a class actually does — its primary ability,
     its saves, its skill list — not from what its name sounds like. Four
     classes carry a second role because the book gives them two jobs.       */
  roles: ["Muscle", "Face", "Tech", "Arcane", "Stealth", "Support"],

  classRoles: {
    /* the book */
    "Artificer": ["Tech"],
    "Barbarian": ["Muscle"],
    "Bard": ["Face", "Support"],
    "Cleric": ["Support"],
    "Druid": ["Arcane"],
    "Fighter": ["Muscle"],
    "Monk": ["Muscle"],
    "Paladin": ["Muscle", "Face"],
    "Ranger": ["Stealth"],
    "Rogue": ["Stealth"],
    "Sorcerer": ["Arcane"],
    "Warlock": ["Arcane"],
    "Wizard": ["Arcane"],
    /* the Neon Ledger */
    "Wirewalker": ["Tech", "Stealth"],
    "Puppeteer": ["Tech"],
    "Chromehound": ["Muscle"],
    "Streetdoc": ["Support"],
    "Fixer": ["Face", "Stealth"],
    "Firebrand": ["Face"],
    /* Con-primary, no spell slots, and a skill list built out of Investigation
       and Stealth — a survivor who gets in and out, not a caster. */
    "Stackborn": ["Stealth"],
    "Bioforged": ["Muscle"]
  },

  /* How much of the board the party covers. Advisory: there is no number
     attached, because "your crew is narrow" is a thing to say out loud, not a
     penalty to apply. */
  crewTiers: [
    { max: 3, name: "Specialist Crew", gist: "Built for one kind of job. Anything outside that lane costs them." },
    { max: 5, name: "Balanced Crew", gist: "Solid coverage, one soft spot at most." },
    { max: 6, name: "Full Spectrum Crew", gist: "Nothing left to a coin flip." }
  ],

  /* Named pairs. Only one of these is wired into a number — see ambushTeam()
     in the code half. The rest are lines to read at the table when both of
     them are in the room, which is the whole point: the party notices its own
     composition without the sheet doing arithmetic about it.                */
  synergyPairs: [
    { id: "ambush-team", name: "Ambush Team", pair: ["Ranger", "Rogue"],
      line: "Two scouts who call the opening move together.",
      wired: "+1 initiative to both, applied automatically." },
    { id: "shield-wall", name: "Shield Wall", pair: ["Fighter", "Paladin"],
      line: "Two front-liners holding the same door. Be generous about cover when they stand together." },
    { id: "chain-of-custody", name: "Chain of Custody", pair: ["Cleric", "Paladin"],
      line: "Faith and law recognise their own. Institutions vouch for this pair, or shelter them." },
    { id: "signal-and-steel", name: "Signal and Steel", pair: ["Bard", "Barbarian"],
      line: "A hype-man and a wrecking ball. The crowd remembers the show, not the damage." },
    { id: "ghost-protocol", name: "Ghost Protocol", pair: ["Rogue", "Wirewalker"],
      line: "The physical break-in and the digital one happen the same night. Alarms built for one miss the other." },
    { id: "trauma-team", name: "Trauma Team", pair: ["Streetdoc", "Chromehound"],
      line: "The Streetdoc keeps the chrome running past what the flesh under it should survive. Downtime recovery goes faster for both." },
    { id: "the-pitch", name: "The Pitch", pair: ["Fixer", "Firebrand"],
      line: "One knows who to talk to. The other makes them want to listen. A job neither lands alone." },
    { id: "last-rites", name: "Last Rites", pair: ["Cleric", "Bioforged"],
      line: "The Cleric already talks to what used to be human. The Bioforged, still becoming something else, finds that more comforting than most patients do." },
    { id: "puppet-show", name: "Puppet Show", pair: ["Puppeteer", "Bard"],
      line: "A drone that can also lie for a living. Crowd control and misdirection, layered." },
    { id: "dead-reckoning", name: "Dead Reckoning", pair: ["Stackborn", "Rogue"],
      line: "Someone who has died before, and someone who plans not to. Close calls read like a checklist." },
    { id: "artificers-familiar", name: "Artificer's Familiar", pair: ["Artificer", "Druid"],
      line: "Whichever companion the job needed this week — gears or claws — one of these two brought it." },
    { id: "warband", name: "Warband", pair: ["Barbarian", "Fighter"],
      line: "Two front-liners who have fought beside each other before swing like they know where the other's blow is going." },
    { id: "cloak-and-dagger", name: "Cloak and Dagger", pair: ["Warlock", "Fixer"],
      line: "A patron's secrets and a fixer's contacts. Very little in the city stays hidden from these two." },
    { id: "field-repair", name: "Field Repair", pair: ["Artificer", "Chromehound"],
      line: "Chrome breaks, and the Artificer understands why. Cyberware repairs cost half the usual downtime with both present." },
    { id: "second-skin", name: "Second Skin", pair: ["Bioforged", "Monk"],
      line: "A body that grows what it needs, a mind that has stopped needing a body at all. Damage that should slow either one down mostly doesn't." },
    { id: "choir", name: "Choir", pair: ["Cleric", "Firebrand"],
      line: "Two very different congregations. Both of them do what these two ask." },
    { id: "countermeasure", name: "Countermeasure", pair: ["Wizard", "Wirewalker"],
      line: "Arcane theory and network theory rhyme. Warded doors, locked ports — one of these two has seen the trick before." },
    { id: "wild-current", name: "Wild Current", pair: ["Sorcerer", "Puppeteer"],
      line: "Raw power and remote hands. Neither has to explain what the other needed done." }
  ],

  /* ------------------------------------------------------------ Street Cred
     The bands, the names and the modifiers are the expansion's own Street Cred
     table, unchanged — this is that rule finally wired to something. What the
     expansion never covered is what a reputation does outside a conversation,
     so each band also carries a line for looking into things and a line for
     what happens when the shooting is about to start.                       */
  repBands: [
    { min: 0, max: 0, tier: "Nobody", mod: 0, tone: "alert",
      buys: "You get searched at the door.",
      digging: "No one owes them the truth.",
      combat: "Nobody is afraid of them, and nobody comes running." },
    { min: 1, max: 2, tier: "Known face", mod: 1, tone: "gold",
      buys: "A fixer will take your call.",
      digging: "Rumours are starting, and most of them are accurate.",
      combat: "Low muscle might hesitate half a beat." },
    { min: 3, max: 4, tier: "Somebody", mod: 2, tone: "gold",
      buys: "A minor favour once per job, without spending a Favour die.",
      digging: "A contact points them the right way once, unasked.",
      combat: "A rival crew might skip a fight it doesn't need." },
    { min: 5, max: 6, tier: "Name", mod: 3, tone: "signal",
      buys: "Doors open. So do files — corps run their faces on sight.",
      digging: "Strangers volunteer what they know before being asked.",
      combat: "Hostile reactions get rare, and someone is probably filming." },
    { min: 7, max: 8, tier: "Legend", mod: 4, tone: "signal",
      buys: "Rivals inherit their enemies. One faction actively wants them dead.",
      digging: "People assume they already know, and talk carefully.",
      combat: "A weaker force refuses the fight outright. A desperate one ambushes instead." },
    { min: 9, max: 10, tier: "Myth", mod: 5, tone: "signal",
      buys: "Strangers do favours unasked, and the price on their heads funds a small army.",
      digging: "Nobody bothers lying to a myth. It has never once worked.",
      combat: "Reactions skew to the ends: someone dies for them, or someone is paid enough to try the other thing." }
  ],

  /* One roll, three questions: does this turn into a fight, does anyone step
     in once it is one, and will this person help at all. Rolled as a d20 plus
     the party's Street Cred modifier plus whatever the situation is worth. */
  reactionBands: [
    { max: 5, name: "Hostile", tone: "alert",
      gist: "They move against the party — draw down, call it in, shut the door." },
    { max: 10, name: "Wary", tone: "gold",
      gist: "Grudging and minimal. One question answered, help only under duress, and they take the safe side of a fight." },
    { max: 15, name: "Neutral", tone: "gold",
      gist: "Business as usual. Deals fairly, takes no side unless pushed." },
    { max: 20, name: "Friendly", tone: "signal",
      gist: "Leans their way — a tip, a discount, a shout of warning, a moment's hesitation before swinging." },
    { max: null, name: "Ally", tone: "signal",
      gist: "Steps in. Cover fire, a rescue, a lie told on the party's behalf. This is the roll that turns a fight." }
  ],

  /* ---------------------------------------------------------- NPC templates
     The four fields the tracker needs are always present: name, ac, hp, init.
     Everything else is detail you can fill in or ignore.                   */
  npcTemplates: [
    { name: "Gutter Ganger", kind: "mook", role: "Mook", cr: "1/8", ac: 12, hp: 9, init: 1,
      acFrom: "Scraps", hpFormula: "2d8", speed: "30 ft.",
      scores: { Str: 11, Dex: 12, Con: 11, Int: 9, Wis: 9, Cha: 9 },
      actions: [{ name: "Shiv", atk: 3, dmg: "1d6+1", text: "Melee, reach 5 ft." },
                { name: "Cheap pistol", atk: 3, dmg: "1d8+1", text: "Ranged 30/90." }] },
    { name: "Corpo Security", kind: "npc", role: "Soldier", cr: "1", ac: 16, hp: 26, init: 2,
      acFrom: "Armoured jacket", hpFormula: "4d8+8", speed: "30 ft.",
      scores: { Str: 14, Dex: 14, Con: 14, Int: 10, Wis: 12, Cha: 10 },
      skills: { Perception: 3 }, senses: "passive Perception 13",
      actions: [{ name: "SMG", atk: 4, dmg: "2d6+2", text: "Ranged 40/120, burst-fire." },
                { name: "Shock baton", atk: 4, dmg: "1d6+2", text: "Melee; Con save DC 12 or stunned to end of turn." }],
      traits: [{ name: "Calls it in", text: "On first taking damage, reinforcements are dispatched. They arrive in 1d4 rounds." }] },
    { name: "Corpo Lieutenant", kind: "npc", role: "Elite", cr: "4", ac: 18, hp: 65, init: 3,
      acFrom: "Hardshell", hpFormula: "10d8+20", speed: "30 ft.",
      scores: { Str: 15, Dex: 16, Con: 15, Int: 13, Wis: 14, Cha: 13 },
      saves: { Dex: 5, Wis: 4 }, skills: { Perception: 4, Insight: 4 },
      senses: "passive Perception 14",
      actions: [{ name: "Assault rifle", atk: 6, dmg: "2d6+3", text: "Ranged 100/400, burst-fire, automatic." },
                { name: "Suppressing fire", atk: null, dmg: "", text: "20-ft. cone; Dex save DC 14 or half speed and disadvantage on attacks until their next turn." }],
      traits: [{ name: "Smartlinked", text: "Ignores half cover." }] },
    { name: "Combat Drone", kind: "npc", role: "Construct", cr: "2", ac: 15, hp: 22, init: 4,
      acFrom: "Plating", hpFormula: "4d8+4", speed: "0 ft., fly 50 ft. (hover)",
      scores: { Str: 12, Dex: 18, Con: 12, Int: 4, Wis: 10, Cha: 1 },
      immune: "poison, psychic", condImmune: "charmed, exhaustion, frightened, poisoned",
      senses: "darkvision 60 ft., passive Perception 10",
      actions: [{ name: "Slug gun", atk: 6, dmg: "1d8+4", text: "Ranged 60/180." }],
      traits: [{ name: "Hardened", text: "Immune to anything that targets a mind. Technology DC 15 to seize control for one round." }] },
    { name: "Ripperdoc", kind: "npc", role: "Support", cr: "1", ac: 12, hp: 22, init: 1,
      acFrom: "Apron", hpFormula: "4d8+4", speed: "30 ft.",
      scores: { Str: 10, Dex: 12, Con: 12, Int: 15, Wis: 14, Cha: 10 },
      skills: { Medicine: 6, Technology: 4 }, senses: "passive Perception 12",
      actions: [{ name: "Bone saw", atk: 2, dmg: "1d8", text: "Melee, reach 5 ft." },
                { name: "Sedative jet", atk: 3, dmg: "", text: "Ranged 15 ft.; Con save DC 13 or poisoned for 1 minute." }] },
    { name: "Netrunner", kind: "npc", role: "Controller", cr: "3", ac: 13, hp: 33, init: 2,
      acFrom: "Nothing useful", hpFormula: "6d8+6", speed: "30 ft.",
      scores: { Str: 8, Dex: 14, Con: 12, Int: 18, Wis: 12, Cha: 11 },
      saves: { Int: 6 }, skills: { Technology: 8 }, senses: "passive Perception 11",
      actions: [{ name: "Icepick", atk: null, dmg: "3d8", text: "One target in the NET or smartlinked; Int save DC 15 for half." },
                { name: "Lockout", atk: null, dmg: "", text: "One powered implant shuts down for 1 minute. Int save DC 15 negates." }],
      traits: [{ name: "Jacked in", text: "Body is prone and helpless while running. Killing the body ends the run." }] },
    { name: "Street Samurai", kind: "npc", role: "Brute", cr: "5", ac: 17, hp: 90, init: 5,
      acFrom: "Subdermal plate", hpFormula: "12d10+24", speed: "40 ft.",
      scores: { Str: 18, Dex: 16, Con: 16, Int: 10, Wis: 12, Cha: 10 },
      saves: { Str: 7, Con: 6 }, senses: "passive Perception 11",
      actions: [{ name: "Monoblade", atk: 7, dmg: "2d8+4", text: "Melee, reach 5 ft. Two attacks per turn." },
                { name: "Heavy pistol", atk: 6, dmg: "2d6+3", text: "Ranged 50/150." }],
      traits: [{ name: "Wired reflexes", text: "Advantage on initiative. Can take one extra action on the first round." },
               { name: "Pain editor", text: "Resistance to bludgeoning, piercing and slashing while below half HP." }] },
    { name: "Cyberpsycho", kind: "npc", role: "Boss", cr: "7", ac: 18, hp: 120, init: 4,
      acFrom: "What's left of the skin", hpFormula: "16d10+32", speed: "40 ft.",
      scores: { Str: 20, Dex: 16, Con: 18, Int: 6, Wis: 8, Cha: 5 },
      saves: { Str: 8, Con: 7 }, immune: "psychic", condImmune: "charmed, frightened",
      senses: "darkvision 60 ft., passive Perception 9", humanity: 0,
      actions: [{ name: "Chrome limb", atk: 8, dmg: "2d10+5", text: "Melee, reach 10 ft. Three attacks per turn." },
                { name: "Overload", atk: null, dmg: "4d6", text: "10-ft. burst of lightning damage; Dex save DC 16 for half. Recharge 5-6." }],
      traits: [{ name: "Nothing left", text: "Doesn't die at 0 HP. Drops to 1 instead, once. Advantage on all attacks." },
               { name: "Was someone", text: "Anyone who knew them has disadvantage on attacks against them for the first round." }] },
    { name: "Hunter-Killer", kind: "npc", role: "Elite construct", cr: "8", ac: 19, hp: 105, init: 6,
      acFrom: "Composite shell", hpFormula: "14d10+28", speed: "40 ft., fly 60 ft.",
      scores: { Str: 18, Dex: 20, Con: 16, Int: 8, Wis: 14, Cha: 1 },
      immune: "poison, psychic", condImmune: "charmed, exhaustion, frightened, poisoned",
      senses: "truesight 30 ft., darkvision 120 ft., passive Perception 16",
      actions: [{ name: "Autocannon", atk: 9, dmg: "3d8+5", text: "Ranged 120/480. Two attacks per turn." },
                { name: "Target lock", atk: null, dmg: "", text: "Marks one creature. Advantage against it until it breaks line of sight." }],
      traits: [{ name: "Assigned", text: "It has one name on its list. It will walk past everyone else to reach them." }] },
    { name: "Civilian", kind: "mook", role: "Bystander", cr: "0", ac: 10, hp: 4, init: 0,
      speed: "30 ft.", scores: { Str: 10, Dex: 10, Con: 10, Int: 10, Wis: 10, Cha: 10 },
      actions: [{ name: "Run", atk: null, dmg: "", text: "Dashes for the nearest exit and screams." }] },
    { name: "House Enforcer", kind: "npc", role: "Soldier", cr: "3", ac: 17, hp: 45, init: 2,
      acFrom: "Bone-carved plate", hpFormula: "7d8+14", speed: "30 ft.",
      scores: { Str: 16, Dex: 13, Con: 15, Int: 10, Wis: 13, Cha: 12 },
      skills: { Intimidation: 3 }, senses: "passive Perception 11",
      actions: [{ name: "Reliquary maul", atk: 5, dmg: "2d8+3", text: "Melee, reach 5 ft." },
                { name: "Collections notice", atk: null, dmg: "", text: "One creature that owes a debt: Wis save DC 13 or frightened for 1 minute." }],
      traits: [{ name: "Consecrated", text: "Unaffected by the netrunning blackout on holy ground. They train for it." }],
      tags: ["cathedra"] },
    { name: "Choir Fragment", kind: "npc", role: "Aberration", cr: "6", ac: 16, hp: 85, init: 3,
      acFrom: "Not entirely there", hpFormula: "10d10+30", speed: "0 ft., fly 30 ft. (hover)",
      scores: { Str: 8, Dex: 16, Con: 16, Int: 14, Wis: 18, Cha: 20 },
      saves: { Wis: 7, Cha: 8 }, immune: "psychic", condImmune: "charmed, frightened, prone",
      senses: "blindsight 60 ft., passive Perception 14",
      actions: [{ name: "Chord", atk: null, dmg: "4d8", text: "All creatures within 20 ft.: Con save DC 15 for half thunder damage and deafened." },
                { name: "Invitation", atk: null, dmg: "", text: "One creature that can hear it: Wis save DC 15 or charmed, moving toward it on its turn." }],
      traits: [{ name: "Part of the song", text: "While any other Choir Fragment is within 60 ft., it has advantage on all saves." }],
      tags: ["cathedra"] }
  ],

  /* ----------------------------------------------- the improviser's pieces */
  names: {
    first: ["Ketch", "Mira", "Sable", "Dorn", "Vex", "Ambrel", "Uln", "Maret", "Kess", "Rell",
            "Thessaly", "Corvid", "Juno", "Bex", "Sarrow", "Ilm", "Nadia", "Pike", "Wren", "Osk",
            "Calla", "Grave", "Teodor", "Nish", "Auber", "Solen", "Marrow", "Vail", "Ryke", "Ester"],
    last: ["Slate", "Vhoss", "Dace", "Calderón", "Thorn", "Reliquary", "Ashe", "Bell", "Kadre",
           "Onward", "Spine", "Lamb", "Verge", "Tally", "Oss", "Wick", "Draper", "Sunder", "Faro", "Quill"],
    role: ["fixer's runner", "bone-carver", "ichor tapper", "House clerk", "rib-walker",
           "choir tender", "debt collector", "unlicensed medic", "scav crew boss", "relic fence",
           "pilgrim guide", "marrowworks foreman", "signal preacher", "gutter chemist",
           "corpse cartographer", "lift operator", "sanctum archivist", "black clinic tout"],
    want: ["a debt cleared", "their sibling found", "out of the district", "a name taken off a list",
           "one clean night's sleep", "the shipment back", "an audience with a House",
           "someone to witness what they saw", "a licence they can't afford",
           "the thing in their chest taken out", "passage up the Spine", "to be owed a favour by you"],
    hiding: ["they already sold you out", "they're carrying someone else's Remnant",
             "they work for the House they're complaining about", "they can't read",
             "the god has noticed them", "they're three days from Cyberpsychosis",
             "the body in the back room", "they're the one who called it in",
             "they've never been to the surface", "their licence is forged",
             "they're being paid to delay you", "they know exactly who you are"],
    quirk: ["won't stand with their back to a door", "hums the choir's key without noticing",
            "one eye is a cheap replacement and it whines", "counts everything in threes",
            "keeps a hand on a bone charm", "speaks two beats too slowly",
            "still has surgical tape on their neck", "laughs at the wrong end of sentences",
            "won't touch anything with their left hand", "smells of ichor and antiseptic",
            "chews stims and denies it", "flinches at comms chatter no one else hears"]
  }
};

/* ========================================================================= */

window.TTGM = (function () {
  "use strict";

  var G = window.TTBGM;
  var T = null;                       // app.js's namespace, handed over by boot()
  var $, el, esc, toast;

  function boot(api) {
    T = api;
    $ = T.$; el = T.el; esc = T.esc; toast = T.toast;
  }

  /* ------------------------------------------------------------ storage --
     Split by how often each key is written: an HP tap must not rewrite the
     whole NPC library. Every write is guarded, and unlike the rest of the app
     a failure here says so once — losing a session's notes silently is worse
     than a toast.                                                          */
  var storageWarned = false;
  function lsGet(key, dflt) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : dflt;
    } catch (e) { return dflt; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) {
      if (!storageWarned) {
        storageWarned = true;
        toast("Storage is blocked — export your vault before you lose it");
      }
      return false;
    }
  }

  var K_PARTY = "ttb.gm.party", K_NPCS = "ttb.gm.npcs",
      K_ENCS = "ttb.gm.encounters", K_PLAY = "ttb.gm.play";

  /* ---- canonical state ---------------------------------------------------
     This used to read straight from localStorage every time, which meant a
     failed write silently discarded the edit AND the "export your vault before
     you lose it" warning was a lie: the export read storage too, so it handed
     back the state from before the failure. Now memory is the truth, storage
     is a mirror we try to keep in sync, and the export reads memory. */
  var mem = { party: null, npcs: null, encs: null, play: null };
  var unsaved = false;

  function arrOf(v) { return Array.isArray(v) ? v : []; }

  function partyAll() {
    if (mem.party === null) mem.party = arrOf(lsGet(K_PARTY, []));
    return mem.party;
  }
  function npcAll() {
    if (mem.npcs === null) mem.npcs = arrOf(lsGet(K_NPCS, []));
    return mem.npcs;
  }
  function encAll() {
    if (mem.encs === null) mem.encs = arrOf(lsGet(K_ENCS, []));
    return mem.encs;
  }
  function playState() {
    if (mem.play === null) {
      var p = lsGet(K_PLAY, null);
      if (!p || typeof p !== "object") p = {};
      if (!Array.isArray(p.clocks)) p.clocks = [];
      if (typeof p.scratch !== "string") p.scratch = "";
      if (typeof p.rep !== "number" || p.rep < 0 || p.rep > 10) p.rep = 0;
      mem.play = p;
    }
    return mem.play;
  }

  /* Memory first, then try to persist. The edit survives either way. */
  function commit(slot, key, val) {
    mem[slot] = val;
    if (!lsSet(key, val)) { unsaved = true; return false; }
    return true;
  }
  function partyWrite(l) { return commit("party", K_PARTY, l); }
  function npcWrite(l)   { return commit("npcs",  K_NPCS,  l); }
  function encWrite(l)   { return commit("encs",  K_ENCS,  l); }
  function playWrite(p)  { p.updated = Date.now(); return commit("play", K_PLAY, p); }
  function playPatch(fn) { var p = playState(); fn(p); playWrite(p); return p; }
  function hasUnsaved() { return unsaved; }

  function lastMode() { return playState().mode || null; }
  function rememberMode(m) { playPatch(function (p) { p.mode = m; }); }

  function uid(prefix) {
    return (prefix || "g") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* --------------------------------------------------------------- dice --
     The app had no roller at all. Everything here is plain and visible: the
     individual dice come back so the GM can show them if they want to.     */
  function roll(n, sides, bonus) {
    var dice = [], total = 0;
    for (var i = 0; i < n; i++) { var v = 1 + Math.floor(Math.random() * sides); dice.push(v); total += v; }
    return { dice: dice, total: total + (bonus || 0), raw: total, bonus: bonus || 0 };
  }
  function d20(bonus, mode) {
    var a = roll(1, 20).total, b = roll(1, 20).total;
    var nat = mode === "adv" ? Math.max(a, b) : mode === "dis" ? Math.min(a, b) : a;
    return { nat: nat, both: mode ? [a, b] : [a], total: nat + (bonus || 0), bonus: bonus || 0 };
  }
  /* Parses the damage strings that already sit in the book's tables —
     "2d6 piercing", "1d8+2", "1d8 piercing + 1d8 thunder" — and the ones a GM
     types into a statblock, which is where this used to fall over: the dice
     branch allowed an optional sign but the constant branch required one, so a
     flat "7" was worth 0 and "5 + 1d4" silently dropped the 5.
     `ok` is false when nothing parsed, so the caller can say so rather than
     rolling a confident zero. */
  function rollExpr(expr) {
    var total = 0, parts = [], found = 0;
    String(expr || "").replace(/([+-]?)\s*(\d*)d(\d+)|([+-]?)\s*(\d+)(?!\s*d\d)/gi,
      function (m, sign, n, sides, lone, flat) {
        if (sides) {
          var r = roll(parseInt(n || "1", 10), parseInt(sides, 10));
          var neg = sign === "-";
          total += neg ? -r.raw : r.raw;
          parts.push((neg ? "-" : "") + (n || 1) + "d" + sides + " [" + r.dice.join(",") + "]");
          found++;
        } else if (flat) {
          var f = parseInt(flat, 10) * (lone === "-" ? -1 : 1);
          total += f;
          parts.push((parts.length && f >= 0 ? "+" : "") + f);
          found++;
        }
        return m;
      });
    return { total: total, detail: parts.join(" "), ok: found > 0 };
  }

  /* ---------------------------------------------------------- UI helpers --
     esc() in app.js does not escape single quotes, and everything on this
     screen is free text the GM typed. So: no user text ever goes through
     innerHTML. txt() and field() below are the only way it reaches the DOM. */
  function txt(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function btn(label, cls, onclick) {
    var b = txt("button", "btn" + (cls ? " " + cls : ""), label);
    if (onclick) b.onclick = onclick;
    return b;
  }
  function field(value, placeholder, oninput, tag) {
    var n = document.createElement(tag || "input");
    if (tag !== "textarea") n.type = "text";
    n.value = value == null ? "" : String(value);
    if (placeholder) n.placeholder = placeholder;
    if (oninput) n.oninput = function () { oninput(n.value); };
    return n;
  }
  function numField(value, oninput, width) {
    var n = document.createElement("input");
    n.type = "number"; n.inputMode = "numeric";
    n.value = value == null ? "" : String(value);
    if (width) n.style.width = width;
    if (oninput) n.oninput = function () { oninput(n.value === "" ? null : Number(n.value)); };
    return n;
  }
  function row(cls) { return el("div", cls || "gm-row"); }
  function sectionHead(host, eyebrow, title, sub) {
    var h = el("div", "stage-head");
    h.appendChild(txt("div", "eyebrow", eyebrow));
    h.appendChild(txt("h2", null, title));
    if (sub) h.appendChild(txt("p", "sub", sub));
    host.appendChild(h);
    return h;
  }
  function empty(host, text, hint) {
    var e = el("div", "empty-state");
    e.appendChild(txt("p", null, text));
    if (hint) e.appendChild(txt("p", "hint", hint));
    host.appendChild(e);
    return e;
  }
  function confirmDrop(what, fn) {
    if (window.confirm("Remove " + what + "? This can't be undone.")) fn();
  }
  function redraw() { T.render(); }
  /* The right-hand panel mirrors the initiative order, so it has to follow an
     in-place HP edit. Repainting only the dossier leaves the tracker's scroll
     position and half-typed notes alone; a full render would not. */
  function refreshDossier() {
    var host = $("#dossier");
    if (host && T.getMode() === "table") renderDossier(host);
  }

  /* ----------------------------------------------------------- the party --
     Characters arrive as the share codes players already generate. Nothing is
     uploaded and nothing syncs: this is a snapshot, and re-importing is how it
     gets refreshed.                                                        */
  function charOf(rec) {
    try { return T.migrate(JSON.parse(rec.payload)); } catch (e) { return null; }
  }
  function partyChars() {
    return partyAll().map(function (rec) {
      var c = charOf(rec);
      return c ? { rec: rec, c: c, d: T.statsOf(c) } : null;
    }).filter(Boolean);
  }

  /* ------------------------------------------------------- party synergies --
     app.js computes one character at a time — statsOf() takes a single `c` and
     has no way to know who else is at the table. That is correct for a player's
     own sheet, which genuinely does not know. Everything below therefore lives
     here, where partyChars() has already put the whole party in one array.

     Takes plain class-name strings so it can be tested without building
     characters.                                                             */
  function synergiesFor(classNames) {
    var names = (classNames || []).filter(Boolean);
    var pairs = G.synergyPairs.filter(function (s) {
      return names.indexOf(s.pair[0]) >= 0 && names.indexOf(s.pair[1]) >= 0;
    });
    var roles = [];
    names.forEach(function (n) {
      (G.classRoles[n] || []).forEach(function (r) {
        if (roles.indexOf(r) < 0) roles.push(r);
      });
    });
    // keep them in the canonical order rather than the order the party joined
    roles = G.roles.filter(function (r) { return roles.indexOf(r) >= 0; });
    var missing = G.roles.filter(function (r) { return roles.indexOf(r) < 0; });
    var tier = null;
    for (var i = 0; i < G.crewTiers.length; i++) {
      if (roles.length <= G.crewTiers[i].max) { tier = G.crewTiers[i]; break; }
    }
    return { pairs: pairs, roles: roles, missing: missing, tier: tier };
  }

  /* The one synergy that is a number rather than a line to read. Both halves
     have to be present, and the bonus belongs to the pair — a Fighter standing
     next to them gets nothing. Same shape as app.js's initiative(), which
     already hardcodes Chromehound and Firebrand for the same reason: it is a
     single known case, not a rule that wants a parser. */
  function ambushTeamBonus(cls, party) {
    if (cls !== "Ranger" && cls !== "Rogue") return 0;
    var names = (party || []).map(function (p) { return p.c.cls; });
    return names.indexOf("Ranger") >= 0 && names.indexOf("Rogue") >= 0 ? 1 : 0;
  }
  /* One place both the encounter builder and the reroll button go through, so
     they cannot drift apart. */
  function combatInitiative(p, party) {
    return T.initiative(p.d) + ambushTeamBonus(p.c.cls, party);
  }

  /* --------------------------------------------------------- Street Cred --
     One number for the whole table, kept beside the clocks. It is the GM's to
     move: there is no quest log to infer it from, and inferring it would be
     worse than asking.                                                      */
  function repGet() { return playState().rep || 0; }
  function repSet(n) {
    var v = Math.max(0, Math.min(10, Math.round(+n || 0)));
    playPatch(function (p) { p.rep = v; });
    return v;
  }
  function repState(rep) {
    var r = Math.max(0, Math.min(10, +rep || 0));
    var band = G.repBands.filter(function (b) { return r >= b.min && r <= b.max; })[0];
    return band ? { rep: r, tier: band.tier, mod: band.mod, tone: band.tone,
                    buys: band.buys, digging: band.digging, combat: band.combat }
                : { rep: r, tier: "Nobody", mod: 0, tone: "alert", buys: "", digging: "", combat: "" };
  }
  function repMod() { return repState(repGet()).mod; }

  /* The expansion's Street Cred rule, finally applied: "a bonus you can add to
     a Charisma check made against someone who has heard of you." Only the
     party's own checks — a passive score shown for reference is not a roll
     anybody is making. */
  function repSkillBonus(sk, d) {
    var base = T.skillBonus(sk, d);
    return T.D.skills[sk] === "Cha" ? base + repMod() : base;
  }

  /* --------------------------------------------------------- NPC reaction --
     Does this turn into a fight, does anyone step in once it is one, and will
     this person help at all — one roll, because they are the same question
     asked at three different moments. */
  function reactionBand(total) {
    for (var i = 0; i < G.reactionBands.length; i++) {
      var b = G.reactionBands[i];
      if (b.max === null || total <= b.max) return b;
    }
    return G.reactionBands[G.reactionBands.length - 1];
  }
  function npcReaction(situational, mode) {
    var r = d20(repMod() + (+situational || 0), mode);
    return { roll: r, band: reactionBand(r.total), rep: repMod() };
  }

  /* Accepts a full share URL, a bare #c=... fragment, or the raw base64.
     A paste has no URL-bar length limit, so nothing is capped here. */
  function parseShare(input) {
    var s = String(input || "").trim();
    if (!s) return null;
    var m = s.match(/[#&]c=([^&\s]+)/);
    var code = m ? m[1] : s.replace(/\s+/g, "");
    try {
      var obj = JSON.parse(T.unb64u(code));
      if (!obj || typeof obj !== "object") return null;
      return T.migrate(obj);
    } catch (e) { return null; }
  }
  function partyPut(c, player, source) {
    var all = partyAll();
    var prev = null;
    all = all.filter(function (r) {
      if (r.id !== c.id) return true;
      prev = r; return false;
    });
    all.push({
      id: c.id, name: c.name || "Unnamed", cls: c.cls || "—", level: c.level,
      player: player != null ? player : (prev ? prev.player : ""),
      source: source || "link",
      added: prev ? prev.added : Date.now(), updated: Date.now(),
      payload: JSON.stringify(c)
    });
    partyWrite(all);
    return !!prev;
  }
  function partyDrop(id) {
    partyWrite(partyAll().filter(function (r) { return r.id !== id; }));
  }

  /* ---- vault backup ------------------------------------------------------
     localStorage on one tablet is a single point of failure. Clearing site
     data wipes the campaign, so this is not a later nicety.                */
  function exportVault() {
    var blob = {
      kind: "ttb-gm-vault", version: 1, saved: new Date().toISOString(),
      party: partyAll(), npcs: npcAll(), encounters: encAll(), play: playState()
    };
    T.saveAs("technomancer-gm-vault.json", JSON.stringify(blob, null, 1), "application/json");
    playPatch(function (p) { p.exported = Date.now(); });
  }
  function mergeById(existing, incoming) {
    if (!Array.isArray(incoming)) return { list: existing, n: 0 };
    var byId = {}, out = existing.slice();
    out.forEach(function (x, i) { byId[x.id] = i; });
    var n = 0;
    incoming.forEach(function (x) {
      if (!x || !x.id) return;
      n++;
      if (byId[x.id] != null) out[byId[x.id]] = x;
      else { byId[x.id] = out.length; out.push(x); }
    });
    return { list: out, n: n };
  }
  function importVault(text) {
    var blob;
    try { blob = JSON.parse(text); } catch (e) { toast("That file isn't JSON"); return; }
    // A player may hand over a roster export instead of a vault.
    if (blob && blob.kind === "ttb-roster" && Array.isArray(blob.characters)) {
      var added = 0;
      blob.characters.forEach(function (c) {
        var mc = T.migrate(c);
        if (mc && mc.id) { partyPut(mc, "", "file"); added++; }
      });
      toast(added ? "Added " + added + " character" + (added === 1 ? "" : "s") : "Nothing in that file");
      redraw(); return;
    }
    if (!blob || blob.kind !== "ttb-gm-vault") { toast("Not a GM vault file"); return; }
    var p = mergeById(partyAll(), blob.party); partyWrite(p.list);
    var n = mergeById(npcAll(), blob.npcs);    npcWrite(n.list);
    var e = mergeById(encAll(), blob.encounters); encWrite(e.list);
    if (blob.play && typeof blob.play === "object") {
      playPatch(function (cur) {
        if (Array.isArray(blob.play.clocks) && blob.play.clocks.length) cur.clocks = blob.play.clocks;
        if (blob.play.scratch) cur.scratch = blob.play.scratch;
        if (blob.play.enc && !cur.enc) cur.enc = blob.play.enc;
      });
    }
    toast("Merged " + p.n + " characters, " + n.n + " NPCs, " + e.n + " encounters");
    redraw();
  }
  function readFile(accept, fn) {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = accept || "application/json";
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { fn(String(r.result)); };
      r.readAsText(f);
    };
    inp.click();
  }

  /* ================================================== SECTION 1 — PARTY  */
  function renderParty(s) {
    sectionHead(s, "The table", "Party",
      "Every number a player is about to be asked for. Sheets arrive as the share codes they already make — this is a snapshot, so ask for a fresh one when someone levels.");

    /* ---- import ---- */
    var box = el("div", "gm-import");
    var ta = field("", "Paste a share link, or the code from one", null, "textarea");
    ta.rows = 2;
    var nameIn = field("", "Player's name (optional)");
    var add = btn("Add to party", "primary", function () {
      var c = parseShare(ta.value);
      if (!c) { toast("Couldn't read that — paste the whole share link"); return; }
      if (!c.cls) { toast("That character has no class yet"); return; }
      var replaced = partyPut(c, nameIn.value.trim(), "link");
      ta.value = ""; nameIn.value = "";
      toast(replaced ? "Updated " + (c.name || "character") : "Added " + (c.name || "character"));
      redraw();
    });
    box.appendChild(ta);
    var ir = row("gm-row");
    ir.appendChild(nameIn);
    ir.appendChild(add);
    ir.appendChild(btn("From a file", "", function () {
      readFile("application/json", function (t) {
        try {
          var o = JSON.parse(t);
          var list = Array.isArray(o) ? o : (o.characters || [o]);
          var n = 0;
          list.forEach(function (c) {
            var mc = T.migrate(c);
            if (mc && mc.id && mc.cls) { partyPut(mc, "", "file"); n++; }
          });
          toast(n ? "Added " + n : "Nothing usable in that file");
          redraw();
        } catch (e) { toast("That file isn't JSON"); }
      });
    }));
    var roster = T.rosterAll() || [];
    if (roster.length) {
      ir.appendChild(btn("From this browser (" + roster.length + ")", "", function () {
        var n = 0;
        roster.forEach(function (r) {
          try {
            var c = T.migrate(JSON.parse(r.payload));
            if (c && c.cls) { partyPut(c, "", "roster"); n++; }
          } catch (e) {}
        });
        toast(n ? "Added " + n + " from the roster" : "Nothing usable");
        redraw();
      }));
    }
    box.appendChild(ir);
    s.appendChild(box);

    var party = partyChars();
    if (!party.length) {
      empty(s, "No one at the table yet.",
        "Ask each player to open their Play Sheet, hit Copy share link, and send it to you. Paste it above.");
      renderVaultTools(s);
      return;
    }

    /* ---- the god's attention die (Cathedra house rule) ---- */
    var god = el("div", "gm-god");
    var godOut = txt("div", "gm-god-out", "");
    god.appendChild(btn("Roll the god's attention", "primary", function () {
      var r = d20(0);
      godOut.textContent = "";
      var big = txt("div", "gm-god-die", r.nat);
      big.className = "gm-god-die" + (r.nat === 20 ? " hit" : "");
      godOut.appendChild(big);
      if (r.nat === 20) {
        var who = party[Math.floor(Math.random() * party.length)];
        godOut.appendChild(txt("div", "gm-god-says", "It notices " + (who.c.name || "someone") + "."));
      } else {
        godOut.appendChild(txt("div", "gm-god-says", "Not this time."));
      }
    }));
    god.appendChild(txt("span", "gm-note", "d20 at the start of the session. On a 20 the god notices one character."));
    god.appendChild(godOut);
    s.appendChild(god);

    /* ---- what the city thinks of them ---- */
    s.appendChild(repStrip());

    /* ---- what this particular set of people is ---- */
    s.appendChild(synergyStrip(party));

    /* ---- who's best at ---- */
    s.appendChild(bestAtBlock(party));

    /* ---- one card per character ---- */
    var grid = el("div", "gm-party");
    party.forEach(function (p) { grid.appendChild(partyCard(p, party)); });
    s.appendChild(grid);

    renderVaultTools(s);
  }

  /* --------------------------------------------------- Street Cred widgets --
     The whole table shares one number, so it lives on the GM's screen and
     nowhere else. A player's own sheet has no way to read it, and a readout
     there would be stale the moment anyone earned a point. */
  function repMeter(rep) {
    var r = repState(rep);
    var box = el("div", "meter");
    var head = el("div", "meter-head");
    head.innerHTML = "<span>Street Cred</span><b class='tone-" + r.tone + "'>" +
      r.rep + " / 10 · " + esc(r.tier) + "</b>";
    box.appendChild(head);
    var bar = el("div", "meter-bar");
    var fill = el("div", "meter-fill bg-" + r.tone);
    fill.style.width = (r.rep * 10) + "%";
    bar.appendChild(fill);
    box.appendChild(bar);
    return box;
  }
  function repStrip() {
    var wrap = el("div", "gm-rep");
    function paint() {
      wrap.innerHTML = "";
      var r = repState(repGet());
      wrap.appendChild(repMeter(r.rep));

      var ctl = el("div", "gm-rep-ctl");
      ctl.appendChild(btn("−1", "tiny", function () { repSet(repGet() - 1); paint(); refreshDossier(); }));
      var sl = document.createElement("input");
      sl.type = "range"; sl.min = 0; sl.max = 10; sl.step = 1; sl.value = r.rep;
      sl.setAttribute("aria-label", "Street Cred");
      sl.setAttribute("aria-valuetext", "Street Cred " + r.rep + " of 10, " + r.tier);
      sl.oninput = function () { repSet(sl.value); paint(); refreshDossier(); };
      ctl.appendChild(sl);
      ctl.appendChild(btn("+1", "tiny", function () { repSet(repGet() + 1); paint(); refreshDossier(); }));
      wrap.appendChild(ctl);

      wrap.appendChild(txt("div", "meter-note", "+" + r.mod +
        " to Charisma checks against anyone who has heard of them. " + r.buys));
      wrap.appendChild(txt("div", "meter-note", "Looking into things · " + r.digging));
      wrap.appendChild(txt("div", "meter-note", "When it turns ugly · " + r.combat));
      wrap.appendChild(txt("div", "gm-note",
        "Yours to move. A point for a job the street saw, one back for folding in public."));
    }
    paint();
    return wrap;
  }
  /* Read-only, for screens where the number is context rather than the task. */
  function repBadge() {
    var r = repState(repGet());
    var b = txt("div", "gm-rep-badge", "");
    b.innerHTML = "<span class='gm-label'>Street Cred</span> <b class='tone-" + r.tone + "'>" +
      r.rep + " · " + esc(r.tier) + "</b> <span class='gm-note'>" +
      T.sgn(r.mod) + " to Charisma checks</span>";
    return b;
  }

  /* ------------------------------------------------------- synergy widget --
     Rendered once for the party rather than on every card: a pair belongs to
     the table, not to either character in it. */
  function synergyStrip(party) {
    var syn = synergiesFor(party.map(function (p) { return p.c.cls; }));
    var wrap = el("div", "gm-syn");
    wrap.appendChild(txt("div", "gm-label", "Standing together"));

    if (syn.pairs.length) {
      var list = el("div", "gm-syn-list");
      syn.pairs.forEach(function (s) {
        var card = el("div", "gm-syn-card" + (s.wired ? " wired" : ""));
        var h = el("div", "gm-syn-head");
        h.appendChild(txt("b", null, s.name));
        h.appendChild(txt("span", "gm-syn-pair", s.pair.join(" + ")));
        card.appendChild(h);
        card.appendChild(txt("div", "gm-syn-line", s.line));
        if (s.wired) card.appendChild(txt("div", "gm-syn-wired", s.wired));
        list.appendChild(card);
      });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(txt("div", "gm-note",
        "No named pair at this table. That is not a penalty — it means whatever they pull off is theirs."));
    }

    var cov = el("div", "gm-syn-cov");
    // gold rather than alert at the narrow end: a specialist crew is a shape,
    // not a fault, and alert is what Humanity uses for actually losing people.
    cov.appendChild(txt("b", "tone-" + (syn.roles.length >= 6 ? "signal" : "gold"),
      syn.tier ? syn.tier.name : ""));
    cov.appendChild(txt("span", "gm-note", syn.tier ? " — " + syn.tier.gist : ""));
    wrap.appendChild(cov);
    var chips = el("div", "gm-chips tight");
    syn.roles.forEach(function (r) { chips.appendChild(txt("span", "chip", r)); });
    syn.missing.forEach(function (r) { chips.appendChild(txt("span", "chip off", r)); });
    wrap.appendChild(chips);
    return wrap;
  }

  /* --------------------------------------------------- the reaction roll --
     Built once and mounted on both the Ruling Desk and the encounter, because
     "does this turn into a fight", "does anyone step in" and "will they talk
     to us" are the same question asked at three different moments. */
  function reactionTool() {
    var wrap = el("div", "gm-react");
    var sit = 0, mode = "";
    var head = el("div", "gm-react-head");
    head.appendChild(txt("div", "gm-label", "NPC reaction"));
    head.appendChild(txt("span", "gm-note",
      "How someone takes them, given who they are. Roll it before a fight starts, in the middle of one, or at a door."));
    wrap.appendChild(head);

    var ctl = el("div", "gm-react-ctl");
    ctl.appendChild(txt("span", "gm-label", "Situation"));
    ctl.appendChild(numField(0, function (v) { sit = v || 0; paint(); }, "58px"));
    var chips = el("div", "gm-chips tight");
    [["", "Straight"], ["adv", "Advantage"], ["dis", "Disadvantage"]].forEach(function (m) {
      var c = txt("button", "chip" + (m[0] === mode ? " on" : ""), m[1]);
      c.onclick = function () {
        mode = m[0];
        [].forEach.call(chips.children, function (x) { x.classList.remove("on"); });
        c.classList.add("on");
        paint();
      };
      chips.appendChild(c);
    });
    ctl.appendChild(chips);
    wrap.appendChild(ctl);

    var pre = txt("div", "gm-note", "");
    wrap.appendChild(pre);
    var out = el("div", "gm-roll-out");
    wrap.appendChild(btn("Roll the reaction", "primary", function () {
      var r = npcReaction(sit, mode);
      out.innerHTML = "";
      var line = el("div", "gm-roll-line");
      line.appendChild(txt("span", "gm-init", r.roll.nat));
      line.appendChild(txt("span", "gm-note",
        (r.roll.both.length > 1 ? "(" + r.roll.both.join(" / ") + ") " : "") +
        T.sgn(r.roll.bonus) + " = " + r.roll.total));
      line.appendChild(txt("b", "tone-" + r.band.tone, r.band.name));
      out.appendChild(line);
      out.appendChild(txt("div", "gm-say", r.band.gist));
    }));
    wrap.appendChild(out);

    function paint() {
      var b = repMod() + sit;
      // 16 is the bottom of Friendly, the first band that actually helps them
      var o = odds(16, b);
      pre.textContent = "d20 " + T.sgn(b) + " (Cred " + T.sgn(repMod()) +
        (sit ? ", situation " + T.sgn(sit) : "") + ") · " +
        o.pct + "% chance of Friendly or better";
    }
    paint();
    return wrap;
  }

  function bestAtBlock(party) {
    var wrap = el("div", "gm-bestat");
    wrap.appendChild(txt("div", "gm-label", "Who's best at…"));
    var out = el("div", "gm-bestat-out");
    var chips = el("div", "gm-chips");
    Object.keys(T.D.skills).sort().forEach(function (sk) {
      var b = txt("button", "chip", sk);
      b.onclick = function () {
        [].forEach.call(chips.children, function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        out.innerHTML = "";
        var ranked = party.map(function (p) {
          return { name: p.c.name || "Unnamed", bonus: repSkillBonus(sk, p.d),
                   passive: T.passiveSkill(sk, p.d), prof: p.d.prof.indexOf(sk) >= 0 };
        }).sort(function (a, b2) { return b2.bonus - a.bonus; });
        var t = el("table", "gm-tbl");
        var hd = el("tr");
        ["", sk + " (" + T.D.skills[sk] + ")", "Passive"].forEach(function (h) {
          hd.appendChild(txt("th", null, h));
        });
        t.appendChild(hd);
        ranked.forEach(function (r) {
          var tr = el("tr", r.prof ? "prof" : "");
          tr.appendChild(txt("td", null, r.name));
          tr.appendChild(txt("td", "num", T.sgn(r.bonus) + (r.prof ? "" : "  ·  not proficient")));
          tr.appendChild(txt("td", "num", r.passive));
          t.appendChild(tr);
        });
        out.appendChild(t);
      };
      chips.appendChild(b);
    });
    wrap.appendChild(chips);
    wrap.appendChild(out);
    return wrap;
  }

  function partyCard(p, party) {
    var c = p.c, d = p.d;
    var card = el("div", "gm-card");

    var head = el("div", "gm-card-head");
    var nm = el("div");
    nm.appendChild(txt("div", "gm-name", c.name || "Unnamed"));
    nm.appendChild(txt("div", "gm-sub",
      "Level " + c.level + " " + (c.cls || "—") +
      (d.sub && c.level >= d.sub.levelAvailable ? " · " + d.sub.name : "") +
      (p.rec.player ? "  ·  " + p.rec.player : "")));
    head.appendChild(nm);
    card.appendChild(head);

    /* the numbers you get asked for */
    var vitals = el("div", "gm-vitals");
    var dc = T.saveDC(d);
    [["AC", d.ac.ac, d.ac.from],
     ["HP", d.hp == null ? "—" : d.hp, (d.cls ? c.level + d.cls.hit : "")],
     // the same number the tracker will roll, synergy included, so the card
     // and the encounter never disagree about it
     ["Init", T.sgn(combatInitiative(p, party || [])),
      [T.initiativeNote(d), ambushTeamBonus(c.cls, party || []) ? "Ambush Team +1" : ""]
        .filter(Boolean).join(" · ")],
     ["Prof", T.sgn(d.pb), ""],
     ["P.Perc", T.passiveSkill("Perception", d), ""],
     ["P.Insight", T.passiveSkill("Insight", d), ""],
     ["P.Invest", T.passiveSkill("Investigation", d), ""],
     dc ? [dc.label, dc.dc, dc.abil + " based"] : null
    ].filter(Boolean).forEach(function (v) {
      var x = el("div", "gm-v");
      x.appendChild(txt("div", "k", v[0]));
      x.appendChild(txt("div", "val", v[1]));
      if (v[2]) x.appendChild(txt("div", "n", v[2]));
      vitals.appendChild(x);
    });
    card.appendChild(vitals);

    /* saves */
    var sv = el("div", "gm-strip");
    sv.appendChild(txt("div", "gm-label", "Saves"));
    var svr = el("div", "gm-saverow");
    T.ABIL.forEach(function (a) {
      var prof = d.saves.indexOf(a) >= 0;
      var x = el("div", "gm-save" + (prof ? " prof" : ""));
      x.appendChild(txt("span", "k", a));
      x.appendChild(txt("span", "val", T.sgn(T.saveBonus(a, d))));
      svr.appendChild(x);
    });
    sv.appendChild(svr);
    card.appendChild(sv);

    /* humanity — reuse the app's own meter so it reads identically */
    if (d.hum) {
      var hm = el("div", "gm-strip");
      hm.appendChild(txt("div", "gm-label", "Humanity"));
      var meter = T.withChar(c, function () { return T.humanityMeter(true); });
      hm.appendChild(meter);
      var st = T.HSTATE[d.hum.state];
      if (st) hm.appendChild(txt("div", "gm-effect", st[1]));
      card.appendChild(hm);
    }

    /* skills they're actually good at */
    var sk = el("div", "gm-strip");
    sk.appendChild(txt("div", "gm-label", "Proficient"));
    var skc = el("div", "gm-chips tight");
    d.prof.slice().sort().forEach(function (name) {
      skc.appendChild(txt("span", "chip", name + " " + T.sgn(repSkillBonus(name, d))));
    });
    if (!d.prof.length) skc.appendChild(txt("span", "gm-note", "none recorded"));
    sk.appendChild(skc);
    card.appendChild(sk);

    /* actions */
    var tools = row("gm-row end");
    tools.appendChild(btn("Full sheet", "", function () {
      var md = T.withChar(c, function () { return T.toMarkdown(); });
      var pre = card.querySelector(".gm-sheet");
      if (pre) { pre.remove(); return; }
      var box = txt("pre", "gm-sheet", md);
      card.appendChild(box);
    }));
    tools.appendChild(btn("Remove", "", function () {
      confirmDrop(c.name || "this character", function () { partyDrop(p.rec.id); redraw(); });
    }));
    card.appendChild(tools);

    var updated = new Date(p.rec.updated || p.rec.added || Date.now());
    card.appendChild(txt("div", "gm-stamp", "snapshot taken " + updated.toLocaleDateString() +
      " · re-paste their link after they level"));
    return card;
  }

  function renderVaultTools(s) {
    var p = playState();
    var wrap = el("div", "gm-vault");
    wrap.appendChild(txt("div", "gm-label", "Backup"));
    var r = row("gm-row");
    r.appendChild(btn("Export GM vault", "primary", exportVault));
    r.appendChild(btn("Import", "", function () {
      readFile("application/json", importVault);
    }));
    wrap.appendChild(r);
    var age = p.exported ? Math.floor((Date.now() - p.exported) / 86400000) : null;
    wrap.appendChild(txt("div", "gm-note", age == null
      ? "Never exported. Everything here lives in this browser only — clearing site data deletes it."
      : age === 0 ? "Exported today." : "Exported " + age + " day" + (age === 1 ? "" : "s") + " ago."));
    if (hasUnsaved()) {
      var bad = txt("div", "gm-unsaved",
        "Some changes could not be saved to this browser. They are still on screen and " +
        "will be included in an export — do that now, before you close the tab.");
      wrap.appendChild(bad);
    }
    s.appendChild(wrap);
  }

  /* ---------------------------------------------------------- dispatch --- */
  function renderStage(s, sec) {
    rememberMode("table");
    s.classList.add("gm");
    var fns = [renderParty, renderEncounter, renderRulings, renderNPCs, renderClocks];
    (fns[sec] || renderParty)(s);
  }

  function renderDossier(host) {
    host.innerHTML = "";
    var head = el("div", "dos-head");
    head.appendChild(txt("div", "dos-title", "The table"));
    host.appendChild(head);
    var body = el("div", "dos-body gm");

    var p = playState();
    var enc = p.enc;
    if (enc && enc.combatants && enc.combatants.length) {
      body.appendChild(txt("div", "gm-label", "Round " + (enc.round || 1)));
      var list = el("div", "gm-mini-init");
      var active = turnOf(enc);
      ordered(enc).forEach(function (cb) {
        var r2 = el("div", "gm-mini" + (active && cb.cid === active.cid ? " on" : "") +
          (cb.dead ? " out" : ""));
        r2.appendChild(txt("span", "i", cb.init));
        r2.appendChild(txt("span", "n", cb.name));
        r2.appendChild(txt("span", "h", cb.hp == null ? "—" : cb.hp + "/" + cb.hpMax));
        list.appendChild(r2);
      });
      body.appendChild(list);
    } else {
      body.appendChild(txt("div", "gm-note", "No encounter running."));
    }

    var party = partyAll();
    body.appendChild(txt("div", "gm-label", "Party (" + party.length + ")"));
    if (!party.length) body.appendChild(txt("div", "gm-note", "Import a share link on the Party screen."));
    party.forEach(function (r2) {
      var x = el("div", "dos-row");
      x.appendChild(txt("span", "k", r2.name));
      x.appendChild(txt("span", "v", "L" + r2.level + " " + r2.cls));
      body.appendChild(x);
    });

    var lock = btn("Lock GM tools", "", function () {
      if (window.confirm("Hide the Table tab on this device? Re-open it with the #gm address.")) T.gmLock();
    });
    lock.style.marginTop = "14px";
    body.appendChild(lock);
    host.appendChild(body);
  }

  /* ================================================ SECTION 3 — RULINGS  */
  var rulingQ = "";

  function dcOf(spec) {
    if (typeof spec === "number") return spec;
    var rung = G.dcLadder.filter(function (r) { return r.key === spec; })[0];
    return rung ? rung.dc : 15;
  }
  function dcLabel(spec) {
    if (typeof spec === "number") return "DC " + spec;
    var rung = G.dcLadder.filter(function (r) { return r.key === spec; })[0];
    return rung ? "DC " + rung.dc + " · " + rung.label.toLowerCase() : "DC " + dcOf(spec);
  }

  /* The whole point of extracting the formulas: this table is correct by
     construction for any character in the vault. */
  function odds(dc, bonus) {
    var needs = dc - bonus;
    if (needs <= 1) return { needs: "auto", pct: 100 };
    if (needs > 20) return { needs: "can't", pct: 0 };
    return { needs: needs + "+", pct: Math.round(((21 - needs) / 20) * 100) };
  }
  function bonusFor(roll, d) {
    if (!roll) return 0;
    if (roll.kind === "save") return T.saveBonus(roll.abil, d);
    // repSkillBonus, not skillBonus: a Charisma check made by someone the city
    // has heard of is the one place Street Cred was always meant to land.
    if (roll.kind === "check" || roll.kind === "contest") return repSkillBonus(roll.skill, d);
    return 0;
  }
  function rollLabel(roll) {
    if (!roll) return "";
    if (roll.kind === "save") return T.ABIL_FULL[roll.abil] + " save";
    if (roll.kind === "check") return T.D.skills[roll.skill] + " (" + roll.skill + ")";
    if (roll.kind === "contest") return roll.skill + " vs " + roll.vs;
    return "no roll";
  }

  function partyTable(roll, dc, party) {
    var t = el("table", "gm-tbl wide");
    var hd = el("tr");
    ["Character", rollLabel(roll), dc == null ? "" : "Needs", dc == null ? "" : "Odds"]
      .forEach(function (h) { hd.appendChild(txt("th", null, h)); });
    t.appendChild(hd);
    party.map(function (p) {
      return { p: p, bonus: bonusFor(roll, p.d) };
    }).sort(function (a, b) { return b.bonus - a.bonus; }).forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(txt("td", null, r.p.c.name || "Unnamed"));
      var cell = txt("td", "num", T.sgn(r.bonus));
      if (roll && roll.kind === "contest") {
        cell.textContent = T.sgn(r.bonus) + "  (their passive " + roll.vs + " " +
          T.passiveSkill(roll.vs, r.p.d) + ")";
      }
      tr.appendChild(cell);
      if (dc != null) {
        var o = odds(dc, r.bonus);
        tr.appendChild(txt("td", "num", o.needs));
        var pc = txt("td", "num", o.pct + "%");
        pc.className = "num " + (o.pct >= 65 ? "good" : o.pct >= 35 ? "mid" : "bad");
        tr.appendChild(pc);
      } else { tr.appendChild(txt("td", null, "")); tr.appendChild(txt("td", null, "")); }
      t.appendChild(tr);
    });
    return t;
  }

  function renderRulings(s) {
    sectionHead(s, "The table", "Ruling desk",
      "What to make them roll, what to set it at, and what each of them actually adds.");

    var party = partyChars();
    if (!party.length) {
      empty(s, "Import the party first.",
        "The ruling desk works without them, but the useful half is seeing each character's real modifier next to the DC.");
    }

    /* Street Cred is already inside every Charisma number below — this is so
       you can see why one of them looks higher than the sheet says. */
    s.appendChild(repBadge());

    /* ---- the generic picker: covers anything not in the catalogue ---- */
    var pick = el("div", "gm-picker");
    pick.appendChild(txt("div", "gm-label", "Any situation"));
    var state = { kind: "check", skill: "Perception", abil: "Wis", dc: "moderate" };
    var out = el("div", "gm-picker-out");

    function paint() {
      out.innerHTML = "";
      var roll = state.kind === "save" ? { kind: "save", abil: state.abil }
                                       : { kind: "check", skill: state.skill };
      var dc = dcOf(state.dc);
      var line = txt("div", "gm-say",
        "Say: “Roll " + (state.kind === "save" ? T.ABIL_FULL[state.abil] + " save" : state.skill) +
        ".”   " + dcLabel(state.dc));
      out.appendChild(line);
      if (party.length) out.appendChild(partyTable(roll, dc, party));
      var rr = row("gm-row");
      var res = txt("span", "gm-roll-out", "");
      rr.appendChild(btn("Roll it secretly for everyone", "", function () {
        res.innerHTML = "";
        party.forEach(function (p) {
          var b = bonusFor(roll, p.d), r = d20(b);
          var line2 = txt("div", "gm-roll-line",
            (p.c.name || "Unnamed") + ": " + r.nat + " " + T.sgn(b) + " = " + r.total +
            (r.total >= dc ? "  ✓" : "  ✗"));
          line2.className = "gm-roll-line " + (r.total >= dc ? "good" : "bad");
          res.appendChild(line2);
        });
      }));
      rr.appendChild(res);
      if (party.length) out.appendChild(rr);
    }

    var kinds = el("div", "gm-chips");
    [["check", "Ability check"], ["save", "Saving throw"]].forEach(function (k) {
      var b = txt("button", "chip" + (state.kind === k[0] ? " on" : ""), k[1]);
      b.onclick = function () {
        state.kind = k[0];
        [].forEach.call(kinds.children, function (x, i) {
          x.classList.toggle("on", i === (k[0] === "check" ? 0 : 1));
        });
        skillWrap.hidden = state.kind !== "check";
        abilWrap.hidden = state.kind !== "save";
        paint();
      };
      kinds.appendChild(b);
    });
    pick.appendChild(kinds);

    var skillWrap = el("div", "gm-chips tight");
    Object.keys(T.D.skills).sort().forEach(function (sk) {
      var b = txt("button", "chip" + (state.skill === sk ? " on" : ""), sk);
      b.onclick = function () {
        state.skill = sk;
        [].forEach.call(skillWrap.children, function (x) { x.classList.remove("on"); });
        b.classList.add("on"); paint();
      };
      skillWrap.appendChild(b);
    });
    pick.appendChild(skillWrap);

    var abilWrap = el("div", "gm-chips tight");
    abilWrap.hidden = true;
    T.ABIL.forEach(function (a) {
      var b = txt("button", "chip" + (state.abil === a ? " on" : ""), T.ABIL_FULL[a]);
      b.onclick = function () {
        state.abil = a;
        [].forEach.call(abilWrap.children, function (x) { x.classList.remove("on"); });
        b.classList.add("on"); paint();
      };
      abilWrap.appendChild(b);
    });
    pick.appendChild(abilWrap);

    var dcWrap = el("div", "gm-chips tight");
    G.dcLadder.forEach(function (r) {
      var b = txt("button", "chip" + (state.dc === r.key ? " on" : ""), r.label + " " + r.dc);
      b.title = r.gist;
      b.onclick = function () {
        state.dc = r.key;
        [].forEach.call(dcWrap.children, function (x) { x.classList.remove("on"); });
        b.classList.add("on"); paint();
      };
      dcWrap.appendChild(b);
    });
    pick.appendChild(dcWrap);
    pick.appendChild(out);
    s.appendChild(pick);
    paint();

    /* ---- what someone makes of them ---- */
    s.appendChild(reactionTool());

    /* ---- the catalogue ---- */
    var cat = el("div", "gm-catalog");
    cat.appendChild(txt("div", "gm-label", "Look it up (" + G.rulings.length + " situations)"));
    var search = field(rulingQ, "hack a door · talk them down · they fall · second-hand ware…",
      function (v) { rulingQ = v; paintList(); });
    search.className = "search";
    cat.appendChild(search);
    var list = el("div", "gm-ruling-list");
    cat.appendChild(list);
    s.appendChild(cat);

    function paintList() {
      list.innerHTML = "";
      var q = rulingQ.trim().toLowerCase();
      var hits = G.rulings.filter(function (r) {
        if (!q) return true;
        return (r.q + " " + (r.keys || []).join(" ") + " " + (r.tags || []).join(" ") +
                " " + (r.note || "")).toLowerCase().indexOf(q) >= 0;
      });
      if (!hits.length) {
        empty(list, "Nothing catalogued for that.",
          "Use the picker above — it covers anything, and never says no match.");
        return;
      }
      hits.forEach(function (r) { list.appendChild(rulingCard(r, party)); });
    }
    paintList();
  }

  function rulingCard(r, party) {
    var d = el("details", "item gm-ruling");
    var sum = document.createElement("summary");
    sum.appendChild(txt("span", "gm-ruling-q", r.q));
    var badge = txt("span", "chip", r.roll.kind === "none" ? "no roll" : rollLabel(r.roll));
    sum.appendChild(badge);
    if (r.dc != null) sum.appendChild(txt("span", "chip lvl", dcLabel(r.dc)));
    d.appendChild(sum);

    var body = el("div", "gm-ruling-body");
    if (r.roll.kind === "none") {
      body.appendChild(txt("div", "gm-say", r.roll.text));
    } else {
      body.appendChild(txt("div", "gm-say", "Say: “Roll " +
        (r.roll.kind === "save" ? T.ABIL_FULL[r.roll.abil] + " save" : r.roll.skill) + ".”"));
      if (r.dc != null && party.length) body.appendChild(partyTable(r.roll, dcOf(r.dc), party));
    }
    if (r.alt && r.alt.length) {
      var a = el("div", "gm-alt");
      a.appendChild(txt("div", "gm-label", "Instead"));
      r.alt.forEach(function (x) {
        var l = el("div", "gm-alt-line");
        l.appendChild(txt("span", "w", x.when));
        l.appendChild(txt("span", "d", dcLabel(x.dc)));
        a.appendChild(l);
      });
      body.appendChild(a);
    }
    if (r.fail) {
      var f = el("div", "gm-fail");
      f.appendChild(txt("span", "k", "On a failure"));
      f.appendChild(txt("span", "v", r.fail));
      body.appendChild(f);
    }
    if (r.note) body.appendChild(txt("div", "gm-note", r.note));
    d.appendChild(body);
    return d;
  }

  /* =================================================== SECTION 4 — NPCS  */
  var npcQ = "", npcOpen = null;

  function blankNPC(kind) {
    return { id: uid("n"), kind: kind || "npc", name: "", role: "", tags: [], cr: "",
             ac: 12, hp: 10, init: 0, acFrom: "", hpFormula: "", speed: "30 ft.",
             scores: null, saves: {}, skills: {}, senses: "", immune: "", resist: "",
             vuln: "", condImmune: "", langs: "",
             traits: [], actions: [], bonus: [], reactions: [], legendary: [],
             humanity: null, notes: "", updated: Date.now() };
  }
  function npcSave(n) {
    n.updated = Date.now();
    var all = npcAll().filter(function (x) { return x.id !== n.id; });
    all.push(n); npcWrite(all);
  }
  function npcFromTemplate(t) {
    var n = Object.assign(blankNPC(t.kind), JSON.parse(JSON.stringify(t)));
    n.id = uid("n");
    n.updated = Date.now();
    return n;
  }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function improviseNPC() {
    var n = npcFromTemplate(G.npcTemplates.filter(function (t) { return t.kind === "mook"; })[0] ||
                            G.npcTemplates[0]);
    n.name = pick(G.names.first) + " " + pick(G.names.last);
    n.role = pick(G.names.role);
    n.kind = "npc";
    n.notes = "Wants: " + pick(G.names.want) +
      "\nHiding: " + pick(G.names.hiding) +
      "\nTell: " + pick(G.names.quirk);
    return n;
  }

  function renderNPCs(s) {
    sectionHead(s, "The table", "NPCs",
      "Everyone you might need numbers for. Mooks are one line; anyone who matters gets the full block.");

    var bar = row("gm-row");
    bar.appendChild(btn("+ Blank NPC", "primary", function () {
      var n = blankNPC("npc"); n.name = "New NPC"; npcSave(n); npcOpen = n.id; redraw();
    }));
    bar.appendChild(btn("+ Quick mook", "", function () {
      var n = blankNPC("mook"); n.name = "Mook"; n.ac = 12; n.hp = 9; npcSave(n); npcOpen = n.id; redraw();
    }));
    bar.appendChild(btn("Improvise someone", "", function () {
      var n = improviseNPC(); npcSave(n); npcOpen = n.id; redraw();
      toast("Meet " + n.name);
    }));
    s.appendChild(bar);

    /* templates */
    var tpl = el("div", "gm-strip");
    tpl.appendChild(txt("div", "gm-label", "From a template"));
    var tc = el("div", "gm-chips tight");
    G.npcTemplates.forEach(function (t) {
      var b = txt("button", "chip", t.name + " · CR " + t.cr);
      b.onclick = function () {
        var n = npcFromTemplate(t); npcSave(n); npcOpen = n.id; redraw();
        toast("Added " + n.name);
      };
      tc.appendChild(b);
    });
    tpl.appendChild(tc);
    s.appendChild(tpl);

    /* pull the campaign's own cast in as stubs */
    var camp = T.campById(T.campSel()) || T.campAll()[0];
    if (camp && camp.npcs && camp.npcs.length) {
      var pullRow = row("gm-row");
      pullRow.appendChild(btn("Pull " + camp.npcs.length + " from " + camp.name, "", function () {
        var have = {};
        npcAll().forEach(function (x) { have[(x.name || "").toLowerCase()] = 1; });
        var n = 0;
        camp.npcs.forEach(function (p) {
          if (have[(p.name || "").toLowerCase()]) return;
          var x = blankNPC("npc");
          x.name = p.name || "Unnamed";
          x.role = p.role || "";
          x.notes = p.notes || "";
          x.tags = ["campaign"];
          npcSave(x); n++;
        });
        toast(n ? "Added " + n + " to stat up" : "Already have them all");
        redraw();
      }));
      pullRow.appendChild(txt("span", "gm-note", "Brings their names and notes over. You add the numbers."));
      s.appendChild(pullRow);
    }

    var all = npcAll().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    if (!all.length) { empty(s, "No NPCs yet.", "Start from a template — it's faster than a blank form."); return; }

    var search = field(npcQ, "Search names, roles and tags", function (v) { npcQ = v; paint(); });
    search.className = "search";
    s.appendChild(search);
    var list = el("div", "gm-npc-list");
    s.appendChild(list);

    function paint() {
      list.innerHTML = "";
      var q = npcQ.trim().toLowerCase();
      var hits = all.filter(function (n) {
        if (!q) return true;
        return ((n.name || "") + " " + (n.role || "") + " " + (n.tags || []).join(" ") + " " +
                (n.notes || "")).toLowerCase().indexOf(q) >= 0;
      });
      if (!hits.length) { empty(list, "No match."); return; }
      hits.forEach(function (n) { list.appendChild(npcRow(n)); });
    }
    paint();
  }

  function npcRow(n) {
    var open = npcOpen === n.id;
    var d = el("details", "item gm-npc" + (n.kind === "mook" ? " mook" : ""));
    d.open = open;
    var sum = document.createElement("summary");
    sum.appendChild(txt("span", "gm-npc-name", n.name || "Unnamed"));
    if (n.role) sum.appendChild(txt("span", "chip", n.role));
    sum.appendChild(txt("span", "chip tier", "AC " + n.ac));
    sum.appendChild(txt("span", "chip tier", n.hp + " HP"));
    if (n.cr) sum.appendChild(txt("span", "chip", "CR " + n.cr));
    d.appendChild(sum);
    d.ontoggle = function () { if (d.open) npcOpen = n.id; };
    d.appendChild(npcEditor(n));
    return d;
  }

  function npcEditor(n) {
    var b = el("div", "gm-npc-body");

    function line(label, node) {
      var l = el("div", "gm-field");
      l.appendChild(txt("label", null, label));
      l.appendChild(node);
      return l;
    }
    function put(k) { return function (v) { n[k] = v; npcSave(n); }; }

    var g1 = el("div", "gm-grid");
    g1.appendChild(line("Name", field(n.name, "", put("name"))));
    g1.appendChild(line("Role", field(n.role, "Brute, Fixer, Bystander…", put("role"))));
    g1.appendChild(line("CR", field(n.cr, "", put("cr"))));
    g1.appendChild(line("AC", numField(n.ac, function (v) { n.ac = v == null ? 10 : v; npcSave(n); })));
    g1.appendChild(line("Hit points", numField(n.hp, function (v) { n.hp = v == null ? 1 : v; npcSave(n); })));
    g1.appendChild(line("Initiative", numField(n.init, function (v) { n.init = v == null ? 0 : v; npcSave(n); })));
    g1.appendChild(line("AC from", field(n.acFrom, "Armoured jacket…", put("acFrom"))));
    g1.appendChild(line("HP formula", field(n.hpFormula, "6d8+18", put("hpFormula"))));
    g1.appendChild(line("Speed", field(n.speed, "30 ft.", put("speed"))));
    b.appendChild(g1);

    if (n.kind !== "mook") {
      /* ability scores, with modifiers shown as you type */
      var ab = el("div", "gm-strip");
      ab.appendChild(txt("div", "gm-label", "Ability scores"));
      var abr = el("div", "gm-abrow");
      if (!n.scores) n.scores = { Str: 10, Dex: 10, Con: 10, Int: 10, Wis: 10, Cha: 10 };
      T.ABIL.forEach(function (a) {
        var cell = el("div", "gm-ab");
        cell.appendChild(txt("div", "k", a));
        var modOut = txt("div", "m", T.sgn(T.mod(n.scores[a])));
        var inp = numField(n.scores[a], function (v) {
          n.scores[a] = v == null ? 10 : v;
          modOut.textContent = T.sgn(T.mod(n.scores[a]));
          npcSave(n);
        }, "58px");
        cell.appendChild(inp);
        cell.appendChild(modOut);
        abr.appendChild(cell);
      });
      ab.appendChild(abr);
      b.appendChild(ab);

      var g2 = el("div", "gm-grid");
      g2.appendChild(line("Senses", field(n.senses, "passive Perception 13", put("senses"))));
      g2.appendChild(line("Languages", field(n.langs, "", put("langs"))));
      g2.appendChild(line("Immunities", field(n.immune, "", put("immune"))));
      g2.appendChild(line("Resistances", field(n.resist, "", put("resist"))));
      g2.appendChild(line("Condition imm.", field(n.condImmune, "", put("condImmune"))));
      g2.appendChild(line("Humanity", numField(n.humanity, function (v) { n.humanity = v; npcSave(n); })));
      b.appendChild(g2);
    }

    /* actions and traits — same editor, two lists */
    [["actions", "Actions"], ["traits", "Traits"], ["reactions", "Reactions"]].forEach(function (spec) {
      var key = spec[0];
      if (n.kind === "mook" && key !== "actions") return;
      if (!Array.isArray(n[key])) n[key] = [];
      var sec = el("div", "gm-strip");
      sec.appendChild(txt("div", "gm-label", spec[1]));
      n[key].forEach(function (a, i) {
        var r = el("div", "gm-action");
        r.appendChild(field(a.name, "Name", function (v) { a.name = v; npcSave(n); }));
        if (key === "actions") {
          r.appendChild(numField(a.atk, function (v) { a.atk = v; npcSave(n); }, "68px"));
          r.appendChild(field(a.dmg, "2d6+3", function (v) { a.dmg = v; npcSave(n); }));
          var rollBtn = btn("Roll", "tiny", function () {
            var hit = a.atk == null ? null : d20(a.atk);
            var dmg = a.dmg ? rollExpr(a.dmg) : null;
            if (dmg && !dmg.ok) dmg = { total: null, detail: "couldn't read \u201c" + a.dmg + "\u201d" };
            toast((hit ? "Attack " + hit.nat + T.sgn(a.atk) + " = " + hit.total : "") +
                  (hit && dmg ? "  ·  " : "") +
                  (dmg ? (dmg.total === null ? dmg.detail : "Damage " + dmg.total) : ""));
          });
          r.appendChild(rollBtn);
        }
        r.appendChild(field(a.text, "What it does", function (v) { a.text = v; npcSave(n); }));
        var x = btn("×", "tiny", function () { n[key].splice(i, 1); npcSave(n); redraw(); });
        r.appendChild(x);
        sec.appendChild(r);
      });
      sec.appendChild(btn("+ Add", "tiny", function () {
        n[key].push(key === "actions" ? { name: "", atk: null, dmg: "", text: "" } : { name: "", text: "" });
        npcSave(n); redraw();
      }));
      b.appendChild(sec);
    });

    var notes = field(n.notes, "Prep notes — what they want, what they're hiding", put("notes"), "textarea");
    notes.rows = 3;
    b.appendChild(line("Notes", notes));

    var tools = row("gm-row end");
    tools.appendChild(btn(n.kind === "mook" ? "Make full NPC" : "Make mook", "", function () {
      n.kind = n.kind === "mook" ? "npc" : "mook"; npcSave(n); redraw();
    }));
    tools.appendChild(btn("Duplicate", "", function () {
      var copy = JSON.parse(JSON.stringify(n));
      copy.id = uid("n"); copy.name = (n.name || "NPC") + " (copy)";
      npcSave(copy); npcOpen = copy.id; redraw();
    }));
    tools.appendChild(btn("Add to encounter", "primary", function () {
      addToEncounter(n, 1); toast("Added " + (n.name || "NPC") + " to the encounter");
    }));
    tools.appendChild(btn("Delete", "", function () {
      confirmDrop(n.name || "this NPC", function () {
        npcWrite(npcAll().filter(function (x) { return x.id !== n.id; })); redraw();
      });
    }));
    b.appendChild(tools);
    return b;
  }

  /* ============================================== SECTION 2 — ENCOUNTER  */
  function ordered(enc) {
    return (enc.combatants || []).slice().sort(function (a, b) {
      if (b.init !== a.init) return b.init - a.init;
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  /* Whose turn it is used to be an index into the list ordered() returns —
     and that list is re-sorted on every render. So removing someone above the
     marker, adding someone who rolled higher, or even renaming a combatant
     tied on initiative silently handed the turn to somebody else. Track the
     combatant's own id instead. */
  function turnOf(enc) {
    var list = ordered(enc);
    if (!list.length) return null;
    var hit = list.filter(function (c) { return c.cid === enc.turnCid; })[0];
    if (hit) return hit;
    // An older encounter, or the active combatant is gone: fall back once.
    var ix = typeof enc.turnIx === "number" ? Math.min(enc.turnIx, list.length - 1) : 0;
    return list[Math.max(0, ix)] || list[0];
  }
  function setTurn(enc, cb) {
    enc.turnCid = cb ? cb.cid : null;
    delete enc.turnIx;                 // the old field is no longer authoritative
  }
  function stepTurn(enc, delta) {
    var list = ordered(enc);
    if (!list.length) { enc.turnCid = null; return; }
    var cur = turnOf(enc);
    var i = list.indexOf(cur);
    if (i < 0) i = 0;
    var next = i + delta;
    if (next >= list.length) { next = 0; enc.round = (enc.round || 1) + 1; }
    else if (next < 0) { next = list.length - 1; enc.round = Math.max(1, (enc.round || 1) - 1); }
    setTurn(enc, list[next]);
  }
  function liveEnc() {
    var p = playState();
    if (!p.enc) {
      p.enc = { id: uid("e"), name: "Encounter", round: 1, turnCid: null, combatants: [] };
      playWrite(p);
    }
    if (!Array.isArray(p.enc.combatants)) p.enc.combatants = [];
    return p.enc;
  }
  function encPatch(fn) {
    playPatch(function (p) {
      if (!p.enc) p.enc = { id: uid("e"), name: "Encounter", round: 1, turnCid: null, combatants: [] };
      fn(p.enc);
    });
  }
  /* A, B, C rather than 1, 2, 3 — easier to say out loud mid-fight. */
  function suffixFor(enc, base) {
    var same = enc.combatants.filter(function (c) {
      return c.name === base || c.name.indexOf(base + " ") === 0;
    });
    if (!same.length) return base;
    return base + " " + String.fromCharCode(65 + same.length);
  }
  function addToEncounter(n, count) {
    encPatch(function (enc) {
      for (var i = 0; i < (count || 1); i++) {
        var rolledHp = n.hpFormula ? rollExpr(n.hpFormula) : null;
        var hp = rolledHp && rolledHp.ok ? rolledHp.total : n.hp;
        enc.combatants.push({
          cid: uid("k"), src: "npc", ref: n.id, name: suffixFor(enc, n.name || "NPC"),
          init: d20(n.init || 0).total, ac: n.ac, hpMax: hp, hp: hp, tmp: 0,
          conds: [], dead: false, notes: ""
        });
      }
    });
  }
  function addPartyToEncounter() {
    var party = partyChars();
    if (!party.length) { toast("No party imported yet"); return; }
    encPatch(function (enc) {
      party.forEach(function (p) {
        if (enc.combatants.some(function (c) { return c.src === "pc" && c.ref === p.rec.id; })) return;
        enc.combatants.push({
          cid: uid("k"), src: "pc", ref: p.rec.id, name: p.c.name || "Unnamed",
          init: d20(combatInitiative(p, party)).total, ac: p.d.ac.ac,
          hpMax: p.d.hp || 1, hp: p.d.hp || 1, tmp: 0, conds: [], dead: false, notes: ""
        });
      });
    });
  }

  function renderEncounter(s) {
    var enc = liveEnc();
    sectionHead(s, "The table", "Encounter",
      "Initiative, hit points and conditions. Tap a bar to damage or heal.");

    var bar = row("gm-row");
    bar.appendChild(btn("+ Party", "primary", function () { addPartyToEncounter(); redraw(); }));
    var npcs = npcAll();
    if (npcs.length) {
      var sel = document.createElement("select");
      sel.appendChild(txt("option", null, "Add an NPC…"));
      npcs.forEach(function (n) {
        var o = txt("option", null, n.name + "  ·  AC " + n.ac + "  ·  " + n.hp + " HP");
        o.value = n.id; sel.appendChild(o);
      });
      var qty = numField(1, null, "62px");
      qty.min = "1";
      sel.onchange = function () {
        var n = npcs.filter(function (x) { return x.id === sel.value; })[0];
        if (!n) return;
        addToEncounter(n, Math.max(1, Number(qty.value) || 1));
        sel.selectedIndex = 0; redraw();
      };
      bar.appendChild(sel);
      bar.appendChild(qty);
    }
    bar.appendChild(btn("+ Ad-hoc", "", function () {
      encPatch(function (e) {
        e.combatants.push({ cid: uid("k"), src: "adhoc", ref: null, name: "Something",
                            init: 10, ac: 12, hpMax: 10, hp: 10, tmp: 0, conds: [], dead: false, notes: "" });
      });
      redraw();
    }));
    /* The same tool as the Ruling Desk's, opened in place: "does anyone step
       in" is a question that happens mid-fight, and tabbing away to ask it
       loses the moment. */
    var reactHost = el("div", "gm-react-slot");
    bar.appendChild(btn("Reaction check", "", function () {
      if (reactHost.firstChild) { reactHost.innerHTML = ""; return; }
      reactHost.appendChild(reactionTool());
    }));
    s.appendChild(bar);
    s.appendChild(reactHost);

    if (!enc.combatants.length) {
      empty(s, "Nothing in the initiative order.",
        "Add the party, then drop in whatever they've walked into.");
      renderEncLibrary(s, enc);
      return;
    }

    /* round / turn controls */
    var ctl = el("div", "gm-turnbar");
    ctl.appendChild(txt("div", "gm-round", "Round " + enc.round));
    ctl.appendChild(repBadge());
    var list = ordered(enc);
    var cur = turnOf(enc);
    ctl.appendChild(txt("div", "gm-turn", cur ? cur.name + "'s turn" : ""));
    var nav = row("gm-row");
    nav.appendChild(btn("◀ Back", "", function () {
      encPatch(function (e) { stepTurn(e, -1); });
      redraw();
    }));
    nav.appendChild(btn("Next turn ▶", "primary", function () {
      encPatch(function (e) { stepTurn(e, 1); });
      redraw();
    }));
    nav.appendChild(btn("Reroll initiative", "", function () {
      // Hoisted: the synergy bonus needs the whole party, and rebuilding it
      // per combatant re-parsed every share code in the vault each time.
      var party = partyChars();
      encPatch(function (e) {
        e.combatants.forEach(function (c) {
          if (c.src === "pc") {
            var p = party.filter(function (x) { return x.rec.id === c.ref; })[0];
            c.init = d20(p ? combatInitiative(p, party) : 0).total;
          } else {
            var n = npcAll().filter(function (x) { return x.id === c.ref; })[0];
            c.init = d20(n ? n.init : 0).total;
          }
        });
        setTurn(e, ordered(e)[0]);
      });
      redraw();
    }));
    ctl.appendChild(nav);
    s.appendChild(ctl);

    /* the order */
    var rows = el("div", "gm-init");
    list.forEach(function (cb) { rows.appendChild(combatantRow(cb, cur && cb.cid === cur.cid)); });
    s.appendChild(rows);

    var end = row("gm-row end");
    end.appendChild(btn("Save as template", "", function () {
      var name = window.prompt("Name this encounter", enc.name || "Encounter");
      if (!name) return;
      var copy = JSON.parse(JSON.stringify(enc));
      copy.id = uid("e"); copy.name = name; copy.created = Date.now();
      encWrite(encAll().concat([copy]));
      toast("Saved “" + name + "”");
      redraw();
    }));
    end.appendChild(btn("End encounter", "", function () {
      if (!window.confirm("Clear the initiative order?")) return;
      playPatch(function (p) { p.enc = null; });
      redraw();
    }));
    s.appendChild(end);

    renderEncLibrary(s, enc);
  }

  function renderEncLibrary(s, enc) {
    var lib = encAll();
    if (!lib.length) return;
    var wrap = el("div", "gm-strip");
    wrap.appendChild(txt("div", "gm-label", "Prepared encounters"));
    lib.sort(function (a, b) { return (b.created || 0) - (a.created || 0); }).forEach(function (t) {
      var r = el("div", "gm-libline");
      r.appendChild(txt("span", "n", t.name));
      r.appendChild(txt("span", "c", (t.combatants || []).length + " combatants"));
      r.appendChild(btn("Run it", "tiny primary", function () {
        if (enc.combatants.length && !window.confirm("Replace the current encounter?")) return;
        // Copy into the live slot so the prepared version stays pristine.
        var copy = JSON.parse(JSON.stringify(t));
        copy.round = 1;
        // A template can be saved mid-fight, so every per-fight field resets —
        // temporary hit points included, which used to ride along forever.
        copy.combatants.forEach(function (c) {
          c.cid = uid("k"); c.hp = c.hpMax; c.tmp = 0; c.conds = []; c.dead = false;
        });
        copy.turnCid = (ordered(copy)[0] || {}).cid || null;
        delete copy.turnIx;
        playPatch(function (p) { p.enc = copy; });
        redraw();
      }));
      r.appendChild(btn("×", "tiny", function () {
        confirmDrop(t.name, function () {
          encWrite(encAll().filter(function (x) { return x.id !== t.id; })); redraw();
        });
      }));
      wrap.appendChild(r);
    });
    s.appendChild(wrap);
  }

  function combatantRow(cb, isCurrent) {
    var r = el("div", "gm-cb" + (isCurrent ? " on" : "") + (cb.dead ? " out" : ""));

    var head = el("div", "gm-cb-head");
    head.appendChild(txt("div", "init", cb.init));
    var nameBox = el("div", "who");
    nameBox.appendChild(txt("div", "n", cb.name));
    var meta = cb.src === "pc" ? "player character" : cb.src === "adhoc" ? "ad-hoc" : "NPC";
    nameBox.appendChild(txt("div", "m", meta + " · AC " + cb.ac));
    head.appendChild(nameBox);
    r.appendChild(head);

    /* hit points — updated in place. A full re-render here would blow away
       scroll position and any half-typed note mid-fight. */
    var hpWrap = el("div", "gm-hp");
    var bar = el("div", "gm-hpbar");
    var fill = el("div", "gm-hpfill");
    bar.appendChild(fill);
    var label = txt("div", "gm-hpnum", "");
    function paintHP() {
      var pct = cb.hpMax > 0 ? Math.max(0, Math.min(100, (cb.hp / cb.hpMax) * 100)) : 0;
      fill.style.width = pct + "%";
      fill.className = "gm-hpfill " + (pct > 50 ? "ok" : pct > 20 ? "hurt" : "bad");
      label.textContent = cb.hp + " / " + cb.hpMax + (cb.tmp ? "  +" + cb.tmp : "");
      r.classList.toggle("out", !!cb.dead);
      var st = r.querySelector(".gm-cb-state");
      if (st) st.textContent = cb.dead ? "down" : "";
    }
    function persist() {
      encPatch(function (e) {
        e.combatants.forEach(function (x) {
          if (x.cid !== cb.cid) return;
          x.hp = cb.hp; x.tmp = cb.tmp; x.dead = cb.dead; x.conds = cb.conds; x.notes = cb.notes;
        });
      });
      refreshDossier();
    }
    function apply(delta) {
      if (delta < 0) {
        var dmg = -delta;
        var soak = Math.min(cb.tmp || 0, dmg);
        cb.tmp -= soak; dmg -= soak;
        cb.hp = Math.max(0, cb.hp - dmg);
      } else {
        cb.hp = Math.min(cb.hpMax, cb.hp + delta);
      }
      cb.dead = cb.hp <= 0;
      paintHP(); persist();
      // Concentration is the thing everyone forgets.
      if (delta < 0 && cb.conds.indexOf("Concentrating") >= 0) {
        var dc = Math.max(10, Math.floor(-delta / 2));
        toast(cb.name + ": concentration, Con save DC " + dc);
      }
    }
    hpWrap.appendChild(bar);
    hpWrap.appendChild(label);

    var pad = el("div", "gm-pad");
    [-10, -5, -1, 1, 5, 10].forEach(function (n) {
      var b = txt("button", "hpbtn" + (n < 0 ? " dmg" : " heal"), (n > 0 ? "+" : "") + n);
      b.onclick = function () { apply(n); };
      pad.appendChild(b);
    });
    var custom = numField(null, null, "72px");
    custom.placeholder = "n";
    var dmgB = txt("button", "hpbtn dmg", "−");
    dmgB.onclick = function () { var v = Number(custom.value); if (v) { apply(-Math.abs(v)); custom.value = ""; } };
    var healB = txt("button", "hpbtn heal", "+");
    healB.onclick = function () { var v = Number(custom.value); if (v) { apply(Math.abs(v)); custom.value = ""; } };
    pad.appendChild(custom); pad.appendChild(dmgB); pad.appendChild(healB);
    var tmpB = txt("button", "hpbtn", "tmp");
    tmpB.title = "Give temporary hit points";
    tmpB.onclick = function () {
      var v = Number(custom.value);
      if (v) { cb.tmp = Math.max(cb.tmp || 0, Math.abs(v)); custom.value = ""; paintHP(); persist(); }
    };
    pad.appendChild(tmpB);
    hpWrap.appendChild(pad);
    r.appendChild(hpWrap);
    r.appendChild(txt("div", "gm-cb-state", cb.dead ? "down" : ""));

    /* conditions */
    var cond = el("div", "gm-cond");
    var chips = el("div", "gm-chips tight");
    (cb.conds || []).forEach(function (name) {
      var c = txt("button", "chip on", name + " ×");
      var def = G.conditions.filter(function (x) { return x.name === name; })[0];
      if (def) c.title = def.gist;
      c.onclick = function () {
        cb.conds = cb.conds.filter(function (x) { return x !== name; });
        persist(); redraw();
      };
      chips.appendChild(c);
    });
    var addSel = document.createElement("select");
    addSel.className = "gm-condsel";
    addSel.appendChild(txt("option", null, "+ condition"));
    G.conditions.forEach(function (x) {
      if ((cb.conds || []).indexOf(x.name) >= 0) return;
      var o = txt("option", null, x.name); o.value = x.name; o.title = x.gist;
      addSel.appendChild(o);
    });
    addSel.onchange = function () {
      if (!addSel.value) return;
      cb.conds = (cb.conds || []).concat([addSel.value]);
      persist(); redraw();
    };
    chips.appendChild(addSel);
    cond.appendChild(chips);
    r.appendChild(cond);

    var tools = row("gm-row end tight");
    if (cb.src === "npc") {
      var src = npcAll().filter(function (x) { return x.id === cb.ref; })[0];
      if (src && (src.actions || []).length) {
        src.actions.forEach(function (a) {
          if (a.atk == null && !a.dmg) return;
          var b = btn(a.name || "attack", "tiny", function () {
            var hit = a.atk == null ? null : d20(a.atk);
            var dmg = a.dmg ? rollExpr(a.dmg) : null;
            if (dmg && !dmg.ok) dmg = { total: null, detail: "couldn't read \u201c" + a.dmg + "\u201d" };
            toast((hit ? "Attack " + hit.nat + T.sgn(a.atk) + " = " + hit.total : "") +
                  (hit && dmg ? "  ·  " : "") +
                  (dmg ? (dmg.total === null ? dmg.detail
                                             : "Damage " + dmg.total + " (" + dmg.detail + ")") : ""));
          });
          tools.appendChild(b);
        });
      }
    }
    tools.appendChild(btn("Remove", "tiny", function () {
      encPatch(function (e) {
        // If the one leaving is the one acting, hand the turn to the next in
        // order first — otherwise the marker lands on whoever happens to shift
        // into that slot.
        var active = turnOf(e);
        if (active && active.cid === cb.cid) stepTurn(e, 1);
        e.combatants = e.combatants.filter(function (x) { return x.cid !== cb.cid; });
        if (!e.combatants.length) e.turnCid = null;
        else if (!e.combatants.some(function (x) { return x.cid === e.turnCid; })) {
          setTurn(e, ordered(e)[0]);
        }
      });
      redraw();
    }));
    r.appendChild(tools);

    paintHP();
    return r;
  }

  /* ================================================== SECTION 5 — CLOCKS */
  function renderClocks(s) {
    sectionHead(s, "The table", "Clocks",
      "Things closing in. Fill a segment whenever the party spends time, makes noise, or gets unlucky.");

    var p = playState();
    var add = row("gm-row");
    [4, 6, 8].forEach(function (seg) {
      add.appendChild(btn("+ " + seg + "-segment clock", seg === 6 ? "primary" : "", function () {
        playPatch(function (st) {
          st.clocks.push({ id: uid("c"), name: "New clock", seg: seg, filled: 0, notes: "" });
        });
        redraw();
      }));
    });
    s.appendChild(add);

    if (!p.clocks.length) {
      empty(s, "No clocks running.",
        "Good first ones for Cathedra: “The Cantor notices you”, “House Thorn calls the debt”, “The god turns its head”.");
    } else {
      var wrap = el("div", "gm-clocks");
      p.clocks.forEach(function (c) { wrap.appendChild(clockCard(c)); });
      s.appendChild(wrap);
    }

    /* session scratchpad */
    var pad = el("div", "gm-strip");
    pad.appendChild(txt("div", "gm-label", "Session scratchpad"));
    var ta = field(p.scratch, "Names you invented, promises made, what to open with next time…",
      function (v) { playPatch(function (st) { st.scratch = v; }); }, "textarea");
    ta.rows = 8;
    ta.className = "gm-scratch";
    pad.appendChild(ta);
    var stampRow = row("gm-row");
    stampRow.appendChild(btn("Stamp the time", "", function () {
      var t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      ta.value = (ta.value ? ta.value + "\n" : "") + "[" + t + "] ";
      ta.focus();
      playPatch(function (st) { st.scratch = ta.value; });
    }));
    pad.appendChild(stampRow);
    s.appendChild(pad);
  }

  function clockCard(c) {
    var card = el("div", "gm-clock");
    var nameIn = field(c.name, "What's closing in", function (v) {
      playPatch(function (st) {
        st.clocks.forEach(function (x) { if (x.id === c.id) x.name = v; });
      });
    });
    nameIn.className = "gm-clock-name";
    card.appendChild(nameIn);

    var segs = el("div", "gm-segs");
    function paint() {
      segs.innerHTML = "";
      for (var i = 0; i < c.seg; i++) {
        (function (i) {
          var seg = txt("button", "gm-seg" + (i < c.filled ? " on" : ""), "");
          seg.setAttribute("aria-label", "Segment " + (i + 1) + " of " + c.seg);
          seg.onclick = function () {
            c.filled = (i + 1 === c.filled) ? i : i + 1;
            playPatch(function (st) {
              st.clocks.forEach(function (x) { if (x.id === c.id) x.filled = c.filled; });
            });
            paint();
            if (c.filled >= c.seg) toast(c.name + " — it lands.");
          };
          segs.appendChild(seg);
        })(i);
      }
      count.textContent = c.filled + " / " + c.seg;
      card.classList.toggle("full", c.filled >= c.seg);
    }
    var count = txt("div", "gm-clock-count", "");
    card.appendChild(segs);
    card.appendChild(count);
    card.appendChild(btn("×", "tiny", function () {
      confirmDrop(c.name || "this clock", function () {
        playPatch(function (st) {
          st.clocks = st.clocks.filter(function (x) { return x.id !== c.id; });
        });
        redraw();
      });
    }));
    paint();
    return card;
  }

  return {
    boot: boot, renderStage: renderStage, renderDossier: renderDossier, lastMode: lastMode,
    // exposed for the test suite
    rollExpr: rollExpr, roll: roll, d20: d20, ordered: ordered, turnOf: turnOf,
    synergiesFor: synergiesFor, ambushTeamBonus: ambushTeamBonus,
    repGet: repGet, repSet: repSet, repState: repState, repMod: repMod,
    repSkillBonus: repSkillBonus, reactionBand: reactionBand, npcReaction: npcReaction
  };
})();
