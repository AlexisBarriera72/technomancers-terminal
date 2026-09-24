/* gm.js, the GM's side of the table.
 *
 * Two halves:
 *   window.TTBGM  reference data you can edit by hand, the unlock token, the
 *                 DC ladder, conditions, the rulings catalogue, NPC templates
 *                 and the name lists the improviser draws from.
 *   window.TTGM   the code. app.js hands it a namespace (window.TT) on boot;
 *                 nothing here runs at load time and nothing here reaches into
 *                 app.js directly.
 *
 * Rulings schema, every field but id/q/roll is optional:
 *   id    slug
 *   q     the situation, as a player would describe it
 *   keys  extra search words
 *   roll  {kind:"check", skill}         an ability check
 *         {kind:"save",  abil}          a saving throw
 *         {kind:"contest", skill, vs}   opposed; vs is the other side's skill
 *         {kind:"none",  text}          don't roll; say this instead
 *   dc    a dcLadder key ("moderate") or a raw number (15)
 *   alt   [{when, dc}]  harder or easier versions of the same job
 *   fail  what going wrong looks like, not "nothing happens"
 *   note  a rule you'll otherwise forget
 *   tags  grouping
 *
 * Synergies live in synergy.js (window.TTSY), not here, a player's class
 *   picker reads them now, and this file is GM-only.
 *
 * Street Cred, repBands is the expansion's own 0-10 table made real, plus
 *   a mirrored negative half the book never had:
 *   {min, max, tier, mod, tone, buys, digging, combat}. mod is added to
 *   Charisma checks. reactionBands turn one d20 into what an NPC does about
 *   the party: {max, name, tone, gist}, ascending, null max on the top band.
 *
 * NPC schema lives next to npcTemplates below.
 */

window.TTBGM = {

  /* Change this and the old address stops working. Anyone who reads this file
     can find it, it keeps a curious player out, not a determined one. */
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
      fail: "Not spotted outright, heard. They call it in and start walking your way.", tags: ["infiltration"] },
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
      fail: "You get a district, not an address, and they know they were traced.", tags: ["netrunning"] },
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
      note: "Street Cred adds to Charisma checks, check the party's track before setting the DC.",
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
      note: "Tearing ware loose does 2d6 to 6d6 slashing by grade, see the Tearing Ware Loose table. Doing it properly takes a clinic.",
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
    { id: "drive-hard", q: "Drive hard, evade, ram, or take a corner too fast",
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
      note: "Shoes and posture. Anyone who's lived in the zone knows this one, consider giving it free.",
      tags: ["city", "social"] },

    /* ---- Cathedra: the campaign's own rules ---- */
    { id: "cathedra-consecrated", q: "They try to netrun on consecrated ground",
      keys: ["consecrated", "sanctum", "holy", "church", "netrun here", "no signal"],
      roll: { kind: "none", text: "It doesn't work. No netrunning, no smartlink, no comms, and powered cyberware operates at disadvantage while they stand there." },
      note: "House rule. It's absolute, not a DC. Say so before they commit to a plan built on it.",
      tags: ["cathedra"] },
    { id: "cathedra-secondhand", q: "They install second-hand ware",
      keys: ["second hand", "secondhand", "used ware", "salvage", "remnant", "cheap chrome"],
      roll: { kind: "none", text: "It installs at +2 Humanity over the listed cost, and it carries a Remnant, something of the last owner comes with it." },
      note: "House rule. The Remnant is yours to invent. Make it a person, not a debuff.",
      tags: ["cathedra", "chrome"] },
    { id: "cathedra-fall", q: "They fall more than 60 feet",
      keys: ["fall", "falling", "drop", "off the edge", "60 feet"],
      roll: { kind: "none", text: "They don't land, they drop a district. Work out where they come down before you work out the damage." },
      note: "House rule. A fall in Cathedra is a change of scene.", tags: ["cathedra"] },
    { id: "cathedra-favour", q: "They want to pay in favours rather than grams",
      keys: ["favour", "favor", "on the book", "owe", "credit", "tab"],
      roll: { kind: "none", text: "Favours on the book replace payment. Write down who holds it, the book is a real object and someone keeps it." },
      note: "House rule. A held favour should come back in a later session, unprompted.", tags: ["cathedra", "social"] },
    { id: "humanity-fraying", q: "A Fraying character takes a crit or drops to 0",
      keys: ["fraying", "humanity", "crit", "zero", "cyberpsychosis", "snap"],
      roll: { kind: "save", abil: "Wis" }, dc: 12,
      note: "Only at Humanity 20-39%. On a failure they attack the nearest creature (nearest, not an enemy).",
      fail: "They turn on whoever is closest. That is usually the person who just saved them.",
      tags: ["cathedra", "chrome", "combat"] },
    { id: "signal-surveillance", q: "Church of the Signal origin senses surveillance",
      keys: ["surveillance", "watched", "bugged", "signal", "church"],
      roll: { kind: "check", skill: "Perception" }, dc: 13,
      note: "Origin perk, Wisdom (Perception) DC 13, and only for that origin. They can always attempt it.",
      tags: ["cathedra", "perception"] },
    { id: "god-notices", q: "The god notices someone", keys: ["god", "notice", "attention", "d20", "session start"],
      roll: { kind: "none", text: "Roll the attention die at the start of the session. On a 20 the god notices one character, use the button on the Party screen." },
      note: "House rule. The Clocks screen is the right place to track what comes of it.",
      tags: ["cathedra"] }
  ],

  /* ------------------------------------------------------------ Street Cred
     The bands, the names and the modifiers are the expansion's own Street Cred
     table, unchanged, this is that rule finally wired to something. What the
     expansion never covered is what a reputation does outside a conversation,
     so each band also carries a line for looking into things and a line for
     what happens when the shooting is about to start.                       */
  repBands: [
    /* Below zero is not in the expansion, the book only ever went up. These
       five mirror the five above, because a party the city has decided against
       should cost exactly what a party it likes is paid. */
    { min: -10, max: -9, tier: "Blacklisted", mod: -5, tone: "alert",
      buys: "The city has decided. Nothing legitimate is on offer at any price.",
      digging: "Every question is a warning to whoever they asked about.",
      combat: "There is a standing rate for them, and more than one person knows it." },
    { min: -8, max: -7, tier: "Poison", mod: -4, tone: "alert",
      buys: "Being seen with them costs other people work, and those people know it.",
      digging: "Doors that were open close as they reach them.",
      combat: "A fight they start is one the neighbourhood finishes, on the other side." },
    { min: -6, max: -5, tier: "Marked", mod: -3, tone: "alert",
      buys: "Fixers stop returning calls. The work that reaches them is the work nobody else took.",
      digging: "Ask twice about the same thing and it gets back to the wrong person.",
      combat: "Somebody is already being paid to be there when it starts." },
    { min: -4, max: -3, tier: "Bad paper", mod: -2, tone: "gold",
      buys: "Their name on a job makes people quote higher. Some stop quoting.",
      digging: "The easy sources dry up, and they pay for what they used to be told.",
      combat: "Nobody steps in on their side. They have seen how that ends." },
    { min: -2, max: -1, tier: "Burned", mod: -1, tone: "gold",
      buys: "Somebody is telling the story of how they did not pay, and it is mostly true.",
      digging: "People answer, then check who else was listening.",
      combat: "A crew that would have walked past decides to watch them instead." },
    /* Zero is the middle of the track now, not the floor, so it stops being
       coloured like a problem. */
    { min: 0, max: 0, tier: "Nobody", mod: 0, tone: "gold",
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
      buys: "Doors open. So do files, corps run their faces on sight.",
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
      gist: "They move against the party, draw down, call it in, shut the door." },
    { max: 10, name: "Wary", tone: "gold",
      gist: "Grudging and minimal. One question answered, help only under duress, and they take the safe side of a fight." },
    { max: 15, name: "Neutral", tone: "gold",
      gist: "Business as usual. Deals fairly, takes no side unless pushed." },
    { max: 20, name: "Friendly", tone: "signal",
      gist: "Leans their way, a tip, a discount, a shout of warning, a moment's hesitation before swinging." },
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
  },

  /* ---- encounter difficulty, from the SRD 5.2 (CC-BY-4.0) ---------------
     XP by challenge rating, and the XP budget per character by level:
     [Low, Moderate, High]. A fight's difficulty is its foes' XP against
     the party's summed budget. */
  xpByCr: { "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700,
    "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
    "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000,
    "17": 18000, "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000,
    "23": 50000, "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000,
    "29": 135000, "30": 155000 },
  xpBudget: [null,
    [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100],
    [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100],
    [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800],
    [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]],

  /* ---- how each GM screen works, shown while the ? guide is on ----------
     Steps are the order to do things in; hints sit under the controls they
     name; tips are the hover text on buttons. Data rather than inline strings
     so a test can hold every line to having a Spanish translation. */
  help: {
    party: {
      steps: [
        "Ask each player to open their Play Sheet and press Copy share link, then send it to you.",
        "Paste the link below, type the player's name if you like, and press Add to party. Paste it again after they level up, cards are snapshots.",
        "At the start of every session, press Roll the god's attention once.",
        "Move Street Cred with −1 / +1 when the street sees them do something: a job done well, folding in public.",
        "After every session, press Export GM vault so a cleared browser can't lose your table."
      ],
      hints: {
        import: "Paste the whole share link or just the code after #c=. Adding the same character again updates their card instead of making a second one.",
        fromFile: "From a file takes a player's Download backup (.json) or a roster export. From this browser adds characters saved on this device.",
        god: "Once per session. On a 20 the god notices one character until dawn: advantage on one roll, and anything with ichor treats them as important.",
        cred: "Street Cred is the whole table's reputation. It is already added to every Charisma check on the Ruling desk and to the reaction roll.",
        card: "Full sheet shows their whole character as text for rules questions. Remove takes them off this device's party only, their own sheet is untouched.",
        vault: "Export writes everything on these screens to one file. Import merges a file back: characters, NPCs and encounters by id; clocks, Street Cred and story progress are replaced.",
        demo: "Fills every screen with a made-up game so you can see how it all looks. Your own table is set aside and comes back when you exit."
      },
      tips: {
        add: "Add this character to your party",
        file: "Import characters from a .json file",
        browser: "Import characters saved on this device",
        god: "Roll a d20; on a 20 the god notices someone",
        credDown: "The street saw them fold: Street Cred −1",
        credUp: "The street saw them do well: Street Cred +1",
        full: "Show their whole sheet as text",
        remove: "Remove from this device's party",
        export: "Save everything on the GM screens to a file",
        importVault: "Load a GM vault file and merge it in",
        demo: "Load a made-up game to look around"
      }
    },
    encounter: {
      steps: [
        "Press + Party to put every character in, with initiative already rolled.",
        "Add enemies: pick an NPC from the list, set how many, press Add to encounter. Use + Ad-hoc for someone you haven't statted yet.",
        "Press Next turn ▶ when someone finishes; ◀ Back if you moved on too early.",
        "Damage and healing: tap −10 … +10 on a combatant, or type a number in the box and press − (damage) or + (heal). tmp sets temporary hit points.",
        "Add conditions from the + condition menu; tap a condition to clear it.",
        "To change the order, drag a combatant by its ⠿ handle, or use ▲ and ▼.",
        "Check the Difficulty bar before the first roll: it weighs the foes against the party's levels.",
        "Turn Morale on for foes who can break. When half their side is down, the screen asks for a morale roll.",
        "Press Save as template to reuse this fight later, and End encounter when it's over."
      ],
      hints: {
        bar: "Reaction check asks whether a meeting turns violent and whether anyone steps in, Street Cred is included. Reroll initiative gives everyone a new order.",
        order: "Drag the ⠿ handle to move someone, or tap ▲ ▼. A moved combatant takes the initiative of whoever it now sits next to, and the order sticks.",
        difficulty: "Low, Moderate and High are the party's XP budgets for their levels. Foes without a challenge rating (ad-hoc ones) aren't counted.",
        morale: "Roll morale rolls a DC 10 Wisdom save for every foe still standing. Press Fled on the ones who break; they drop out of the turn order.",
        hp: "Red buttons hurt, green heal. For a big hit, type the number and press −. Anyone Concentrating gets their save reminder when they take damage.",
        library: "Run it loads a saved fight fresh: full hit points, no conditions."
      },
      tips: {
        party: "Add every party member with rolled initiative",
        adhoc: "Add a combatant with no statblock",
        next: "Pass the turn to the next in order",
        back: "Go back one turn",
        reroll: "Roll new initiative for everyone",
        npcInit: "Roll one initiative per kind of foe; the party keeps theirs",
        morale: "Turn morale checks on or off for this fight",
        fled: "Mark this foe as fled; they skip their turns",
        react: "Roll how an NPC reacts to the party",
        template: "Save this fight to reuse later",
        end: "Clear the encounter",
        run: "Load this prepared fight"
      }
    },
    rulings: {
      steps: [
        "A player says what they're doing.",
        "Find it in the catalogue below, or use Any situation and pick the skill or save yourself.",
        "Read the Say line out loud and pick a DC, Moderate (15) is the default; Hard (20) is a specialist's day at work.",
        "The table shows each character's real bonus and chance, Street Cred included.",
        "Press Roll it secretly for everyone when they shouldn't know how well they did."
      ],
      hints: {
        picker: "Check for skills, Save for saving throws. The DC buttons run from Trivial (5) to Near-impossible (30).",
        react: "Use the reaction roll when the party meets someone whose attitude isn't obvious: pick what's in their favour or against them, then roll.",
        catalog: "Search for what they're doing, “climb”, “lie”, “hack”, and open it for the roll, the DC and what failure costs."
      },
      tips: {
        secret: "Roll this check for every character without telling them",
        react: "Roll the NPC's reaction"
      }
    },
    npcs: {
      steps: [
        "+ Blank NPC for someone who matters, + Quick mook for someone who's there to fall down, Improvise someone for a name and a secret on the spot.",
        "From a template gives you a ready statblock, rename it and it's yours.",
        "Pull from Cathedra brings the campaign's cast in as names and notes; you add the numbers.",
        "Open an NPC to edit it. Add to encounter drops them into the fight; Duplicate makes a second; Delete removes them.",
        "Search by name, role or tag when the list gets long."
      ],
      hints: {
        make: "Mooks are one line in a fight; NPCs get the full statblock. Improvise someone gives a name, a want, a secret and a tell.",
        templates: "Templates are starting points. Change anything after you add one.",
        row: "Open an NPC to see and edit everything. Add to encounter uses the count you set on the Encounter screen."
      },
      tips: {
        blank: "Make a new NPC from scratch",
        mook: "Make a one-line mook",
        improvise: "Make someone up on the spot",
        addEnc: "Put this NPC in the current fight",
        dup: "Make a copy of this NPC",
        del: "Delete this NPC"
      }
    },
    clocks: {
      steps: [
        "Start a clock when a threat begins: 4 segments for soon, 6 for the usual, 8 for a slow burn.",
        "Name it after what happens when it fills, “House Thorn calls the debt”.",
        "Tap a segment whenever the party spends time, makes noise or gets unlucky. Tap the last filled one to undo.",
        "When it's full, it happens. No roll.",
        "The scratchpad is for this session's notes; Stamp the time adds the time so you can find things later."
      ],
      hints: {
        add: "Pick the size by how soon it should land. You can have as many clocks running as you like.",
        clock: "Tap a segment to fill up to it. × deletes the clock.",
        scratch: "Names you made up, promises the party made, how to open next session. It's saved as you type."
      },
      tips: {
        add4: "A short clock: it lands soon",
        add6: "The usual clock",
        add8: "A slow-burn clock",
        stamp: "Add the current time to your notes",
        del: "Delete this clock"
      }
    },
    story: {
      steps: [
        "Before the campaign: open The truth and Running the doom below and read them once.",
        "Before each session: open that session's scene and press Set as current, then Start clocks and Add NPCs.",
        "During play: read the Read aloud boxes, press Roll for a vision at the scene's “Roll when” moments, press Apply when they make one of the listed calls, and use the Street Cred buttons.",
        "After the session: Mark played, pick Right, Mixed or Wrong, write a note, tick the fragment if it came true, and mark keystones Kept or Broken."
      ],
      hints: {
        dials: "Doom: tap a segment when a fragment of the vision comes true. Salvage: who gets out, the scenes say how much. Feed: + when they feed the god mercy, violence, lies or questions. The 1% path closes the moment one keystone breaks.",
        vision: "Press it at a key moment. Tell the chosen player privately. If someone finds the Eye-chrome, pick them here, it lowers the roll to 16.",
        expand: "Everything is a drop-down. Expand everything opens it all at once; Collapse everything tidies up.",
        scene: "Set as current before the session. Start clocks and Add NPCs put this scene's clocks and people on the other screens, once. Afterwards: Mark played and pick how it went.",
        apply: "Apply adds that call's Salvage, Feed and Doom to the dials at the top."
      },
      tips: {
        vision: "Roll a d20 for a vision; on a hit it picks someone at the table",
        played: "Mark this scene as played",
        current: "Make this the scene you're running now",
        clocks: "Add this scene's clocks to the Clocks screen",
        npcs: "Add this scene's NPCs to the NPC screen",
        apply: "Add this call's Salvage, Feed and Doom",
        cred: "Change the table's Street Cred"
      }
    },
    campaign: {
      steps: [
        "This is reference for your table: house rules, people, places, custom gear, the session log and hooks.",
        "The sections run along the top, tap one to open it.",
        "Cathedra comes with the site and is read-only. + New campaign makes one you can type into; it saves as you go.",
        "Export this campaign writes it to a file you can keep or share; Import loads one."
      ],
      hints: {
        use: "Use these settings on my character sets the character open in the Forge on this device to this campaign's starting level."
      },
      tips: {
        newCamp: "Start an empty campaign you can type into",
        importCamp: "Load a campaign from a .json file",
        exportCamp: "Save this campaign to a file",
        use: "Apply this campaign's starting level to the character open on this device"
      }
    },
    dossier: {
      hints: { lock: "Lock before you hand the tablet to a player. The #gm address opens it again." }
    }
  }
};

/* ========================================================================= */

window.TTGM = (function () {
  "use strict";

  var G = window.TTBGM;
  /* Synergy content moved to its own file when the class picker started
     reading it. Degrade to "no synergies" rather than throwing if it goes
     missing: every other GM tool still works without them. */
  var SY = window.TTSY || { roles: [], classRoles: {}, crewTiers: [], pairs: [] };
  var T = null;                       // app.js's namespace, handed over by boot()
  var $, el, esc, toast;

  function boot(api) {
    T = api;
    $ = T.$; el = T.el; esc = T.esc; toast = T.toast;
  }

  /* ------------------------------------------------------------ storage --
     Split by how often each key is written: an HP tap must not rewrite the
     whole NPC library. Every write is guarded, and unlike the rest of the app
     a failure here says so once, losing a session's notes silently is worse
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
        toast("Storage is blocked, export your vault before you lose it");
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
      p.clocks = cleanClocks(p.clocks);
      p.story = cleanStory(p.story);
      if (typeof p.scratch !== "string") p.scratch = "";
      if (typeof p.rep !== "number" || !(p.rep >= -10 && p.rep <= 10)) p.rep = 0;
      p.rep = Math.round(p.rep);
      mem.play = p;
    }
    return mem.play;
  }

  /* Clocks arrive from a vault file a person can edit, and the card draws one
     button per segment, so a bad count here froze the tab on every visit to
     Clocks. Anything without an id can't be edited or deleted either. */
  function cleanClocks(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (c) {
      return c && typeof c === "object" && typeof c.id === "string" && c.id;
    }).map(function (c) {
      var o = {};
      Object.keys(c).forEach(function (k) { o[k] = c[k]; });
      var seg = Math.round(+c.seg);
      o.seg = seg >= 2 && seg <= 12 ? seg : 6;
      o.filled = Math.max(0, Math.min(o.seg, Math.round(+c.filled) || 0));
      o.name = c.name == null ? "" : String(c.name);
      return o;
    });
  }

  /* The Story tab's progress lives in play, so the vault carries it. Same
     caution as the clocks: it can arrive from a hand-edited file. */
  function cleanStory(st) {
    function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
    var o = obj(st), feed = obj(o.feed), out = {
      current: typeof o.current === "string" ? o.current : null,
      done: obj(o.done), branch: obj(o.branch), notes: obj(o.notes),
      doom: obj(o.doom), keys: obj(o.keys),
      salvage: Math.max(-99, Math.min(99, Math.round(+o.salvage) || 0)),
      feed: {},
      eyeChrome: typeof o.eyeChrome === "string" ? o.eyeChrome : "",
      echoes: (Array.isArray(o.echoes) ? o.echoes : []).filter(function (e) {
        return e && typeof e === "object" && typeof e.text === "string";
      }).slice(-300)
    };
    ["mercy", "violence", "lies", "questions"].forEach(function (k) {
      out.feed[k] = Math.max(0, Math.round(+feed[k]) || 0);
    });
    return out;
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

  /* "1 characters" read wrong in English, and Spanish needs the singular and
     plural as separate keys anyway. */
  function count(n, one, many) { return n + " " + (n === 1 ? one : many); }

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
  /* Parses the damage strings that already sit in the book's tables,
     "2d6 piercing", "1d8+2", "1d8 piercing + 1d8 thunder", and the ones a GM
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
  /* Line drawings for the screens that start empty. Stroke only, in the
     accent colour, so they sit in either theme without a second set. */
  var ART = {
    // three seats at a table, the middle one waiting for someone
    party: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="30" cy="34" r="10"/><path d="M14 72c0-12 7-20 16-20s16 8 16 20"/>' +
      '<circle cx="106" cy="34" r="10"/><path d="M90 72c0-12 7-20 16-20s16 8 16 20"/>' +
      '<g class="hot" stroke-dasharray="4 5"><circle cx="68" cy="28" r="12"/><path d="M48 72c0-15 9-24 20-24s20 9 20 24"/></g>' +
      '<path d="M6 84h124"/><path class="hot" d="M68 22v12M62 28h12"/></g>',
    // an ID card with nobody on it yet
    npcs: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path d="M16 14h92l12 12v58H16z"/><circle cx="46" cy="44" r="12"/><path d="M28 76c2-10 9-15 18-15s16 5 18 15"/>' +
      '<path d="M74 38h32M74 48h24M74 58h28"/><path class="hot" stroke-dasharray="3 4" d="M74 68h20"/></g>',
    // a reticle over an empty initiative ladder
    encounter: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="42" cy="48" r="26"/><circle cx="42" cy="48" r="8"/><path d="M42 14v14M42 68v14M8 48h14M62 48h14"/>' +
      '<path d="M88 26h40M88 42h32M88 58h36M88 74h24" stroke-dasharray="5 5"/><path class="hot" d="M80 26h2"/></g>',
    // a six-segment clock with nothing filled
    clocks: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="68" cy="48" r="34"/><path d="M68 14v68M38.6 31l58.8 34M38.6 65l58.8-34"/>' +
      '<circle cx="68" cy="48" r="5" class="hot"/><path class="hot" d="M112 18l8-6M116 30h10M24 18l-8-6M20 30H10"/></g>'
  };
  function empty(host, text, hint, art) {
    var e = el("div", "empty-state" + (art ? " art" : ""));
    if (art && ART[art]) {
      var pic = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      pic.setAttribute("viewBox", "0 0 136 96");
      pic.setAttribute("class", "empty-art");
      pic.setAttribute("aria-hidden", "true");
      pic.innerHTML = ART[art];
      e.appendChild(pic);
      var words = el("div");
      words.appendChild(txt("p", null, text));
      if (hint) words.appendChild(txt("p", "hint", hint));
      e.appendChild(words);
    } else {
      e.appendChild(txt("p", null, text));
      if (hint) e.appendChild(txt("p", "hint", hint));
    }
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
     app.js computes one character at a time, statsOf() takes a single `c` and
     has no way to know who else is at the table. That is correct for a player's
     own sheet, which genuinely does not know. Everything below therefore lives
     here, where partyChars() has already put the whole party in one array.

     Takes plain class-name strings so it can be tested without building
     characters.                                                             */
  function synergiesFor(classNames) {
    var names = (classNames || []).filter(Boolean);
    var pairs = SY.pairs.filter(function (s) {
      return names.indexOf(s.pair[0]) >= 0 && names.indexOf(s.pair[1]) >= 0;
    });
    var roles = [];
    names.forEach(function (n) {
      (SY.classRoles[n] || []).forEach(function (r) {
        if (roles.indexOf(r) < 0) roles.push(r);
      });
    });
    // keep them in the canonical order rather than the order the party joined
    roles = SY.roles.filter(function (r) { return roles.indexOf(r) >= 0; });
    var missing = SY.roles.filter(function (r) { return roles.indexOf(r) < 0; });
    var tier = null;
    for (var i = 0; i < SY.crewTiers.length; i++) {
      if (roles.length <= SY.crewTiers[i].max) { tier = SY.crewTiers[i]; break; }
    }
    return { pairs: pairs, roles: roles, missing: missing, tier: tier };
  }

  /* The one synergy that is a number rather than a line to read. Both halves
     have to be present, and the bonus belongs to the pair, a Fighter standing
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
    var v = Math.max(-10, Math.min(10, Math.round(+n || 0)));
    playPatch(function (p) { p.rep = v; });
    return v;
  }
  function repState(rep) {
    var r = Math.max(-10, Math.min(10, Math.round(+rep || 0)));
    var band = G.repBands.filter(function (b) { return r >= b.min && r <= b.max; })[0];
    return band ? { rep: r, tier: band.tier, mod: band.mod, tone: band.tone,
                    buys: band.buys, digging: band.digging, combat: band.combat }
                : { rep: r, tier: "Nobody", mod: 0, tone: "gold", buys: "", digging: "", combat: "" };
  }
  function repMod() { return repState(repGet()).mod; }

  /* The expansion's Street Cred rule, finally applied: "a bonus you can add to
     a Charisma check made against someone who has heard of you." Only the
     party's own checks, a passive score shown for reference is not a roll
     anybody is making. */
  function repSkillBonus(sk, d) {
    var base = T.skillBonus(sk, d);
    return T.D.skills[sk] === "Cha" ? base + repMod() : base;
  }

  /* --------------------------------------------------------- NPC reaction --
     Does this turn into a fight, does anyone step in once it is one, and will
     this person help at all, one roll, because they are the same question
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
      id: c.id, name: c.name || "Unnamed", cls: c.cls || "-", level: c.level,
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
      toast(added ? "Added " + count(added, "character", "characters") : "Nothing in that file");
      redraw(); return;
    }
    if (!blob || blob.kind !== "ttb-gm-vault") { toast("Not a GM vault file"); return; }
    var p = mergeById(partyAll(), blob.party); partyWrite(p.list);
    var n = mergeById(npcAll(), blob.npcs);    npcWrite(n.list);
    var e = mergeById(encAll(), blob.encounters); encWrite(e.list);
    if (blob.play && typeof blob.play === "object") {
      var clocks = cleanClocks(blob.play.clocks), r = blob.play.rep;
      playPatch(function (cur) {
        if (clocks.length) cur.clocks = clocks;
        if (typeof blob.play.scratch === "string" && blob.play.scratch) cur.scratch = blob.play.scratch;
        if (blob.play.enc && !cur.enc) cur.enc = blob.play.enc;
        // The export always carried Street Cred; restoring used to drop it.
        if (typeof r === "number" && isFinite(r)) cur.rep = Math.max(-10, Math.min(10, Math.round(r)));
        if (blob.play.story && typeof blob.play.story === "object") cur.story = cleanStory(blob.play.story);
      });
    }
    toast("Merged " + count(p.n, "character", "characters") + ", " + count(n.n, "NPC", "NPCs") +
          ", " + count(e.n, "encounter", "encounters"));
    redraw();
  }
  /* ------------------------------------------------------------ demo table --
     A made-up game already in progress, five characters, their NPCs, a fight
     in its second round, clocks ticking, so the GM screens can be seen doing
     their job before a real party exists.

     It is loaded into the real keys rather than beside them, because every
     screen already reads those. Whatever was there is set aside first, from
     memory (the canonical copy, unsaved edits included), and put back exactly
     on the way out. A demo that could eat someone's campaign is not a demo. */
  var K_DEMO = "ttb.gm.demo";
  function inDemo() {
    try { return localStorage.getItem(K_DEMO) !== null; } catch (e) { return false; }
  }
  function demoChar(o) {
    var c = T.blank();
    Object.keys(o).forEach(function (k) { c[k] = o[k]; });
    c.method = "array";
    c.arrayMap = JSON.parse(JSON.stringify(c.scores));
    return T.migrate(c);
  }
  function demoTable() {
    var now = Date.now();
    var cast = [
      ["Ana", demoChar({ id: "demo-vesper", name: "Vesper Kane", level: 5, cls: "Ranger",
        sub: "ranger-drone-master", bg: "cop",
        scores: { Str: 10, Dex: 15, Con: 13, Int: 12, Wis: 14, Cha: 8 },
        skills: ["Perception", "Stealth", "Survival"] })],
      ["Leo", demoChar({ id: "demo-jax", name: "Jax Oriel", level: 5, cls: "Rogue",
        sub: "rogue-saboteur", bg: "gangster",
        scores: { Str: 8, Dex: 15, Con: 13, Int: 14, Wis: 12, Cha: 10 },
        skills: ["Stealth", "Perception", "Sleight of Hand", "Deception"],
        cyber: [{ name: "Wired Reflexes", tier: "2" }] })],
      ["Mia", demoChar({ id: "demo-sable", name: "Sable Voss", level: 5, cls: "Wirewalker",
        sub: "wirewalker-icebreaker", bg: "hacker",
        scores: { Str: 8, Dex: 14, Con: 13, Int: 15, Wis: 12, Cha: 10 },
        skills: ["Technology", "Investigation", "Stealth"] })],
      ["Sam", demoChar({ id: "demo-brick", name: "Brick Halloran", level: 5, cls: "Barbarian",
        sub: "barbarian-street-savage", bg: "punk-rocker",
        scores: { Str: 15, Dex: 13, Con: 14, Int: 8, Wis: 12, Cha: 10 },
        skills: ["Athletics", "Intimidation"],
        cyber: [{ name: "Dermal Barrier", tier: "2" }] })],
      ["Rae", demoChar({ id: "demo-lux", name: "Lux Marrow", level: 5, cls: "Bard",
        sub: "bard-college-of-anarchy", bg: "celebrity",
        scores: { Str: 8, Dex: 14, Con: 13, Int: 10, Wis: 12, Cha: 15 },
        skills: ["Persuasion", "Performance", "Insight"] })]
    ].filter(function (x) { return x[1] && x[1].cls; });

    var party = cast.map(function (x, i) {
      var c = x[1];
      return { id: c.id, name: c.name, cls: c.cls, level: c.level, player: x[0], source: "demo",
               added: now - (cast.length - i) * 60000, updated: now, payload: JSON.stringify(c) };
    });

    function fromTemplate(tname, patch) {
      var t = G.npcTemplates.filter(function (x) { return x.name === tname; })[0] || G.npcTemplates[0];
      var n = npcFromTemplate(t);
      Object.keys(patch).forEach(function (k) { n[k] = patch[k]; });
      n.id = patch.id; n.updated = now;
      return n;
    }
    var npcs = [
      fromTemplate("Corpo Lieutenant", { id: "demo-n-dace", name: "Ser Ambrel Dace",
        role: "House Thorn, collections", tags: ["Cathedra", "House Thorn"],
        notes: "Here for Brick's debt, with interest.\nWants: the ichor vial Jax lifted last session.\nTell: straightens his cuffs before he lies." }),
      fromTemplate("Corpo Security", { id: "demo-n-enforcer", name: "Thorn Enforcer",
        role: "House Thorn muscle", tags: ["Cathedra", "House Thorn"],
        notes: "Paid by the hour. Will fold if Dace drops." }),
      fromTemplate("Combat Drone", { id: "demo-n-drone", name: "Collections Drone",
        role: "Construct", tags: ["Cathedra", "House Thorn"], notes: "" }),
      fromTemplate("Gutter Ganger", { id: "demo-n-ganger", name: "Gullet Runner",
        role: "Mook", tags: ["Cathedra", "The Gullet"],
        notes: "Sells directions. Sells you out for the same price." }),
      fromTemplate("Corpo Security", { id: "demo-n-slate", name: "Mother Slate", kind: "npc",
        role: "Fixer, the Marrowworks", tags: ["Cathedra", "contact"],
        notes: "Gave them the job. Owes Lux a favour and knows it.\nWants: the Houses fighting each other, not her." })
    ];

    // the fight: round 2, Sable to act, everyone a little worse for wear
    var pcs = party.map(function (r) { var c = charOf(r); return { rec: r, c: c, d: T.statsOf(c) }; });
    var inits = { "demo-vesper": 19, "demo-jax": 21, "demo-sable": 17, "demo-brick": 9, "demo-lux": 12 };
    var hurt = { "demo-vesper": 9, "demo-jax": 0, "demo-sable": 14, "demo-brick": 22, "demo-lux": 4 };
    var conds = { "demo-brick": ["Frightened"], "demo-lux": ["Concentrating"] };
    var k = 0;
    function cid() { return "demo-k" + (k++); }
    var combatants = pcs.map(function (p) {
      var max = p.d.hp || 1;
      return { cid: cid(), src: "pc", ref: p.rec.id, name: p.c.name, init: inits[p.rec.id] || 10,
               ac: p.d.ac.ac, hpMax: max, hp: Math.max(1, max - (hurt[p.rec.id] || 0)),
               tmp: p.rec.id === "demo-brick" ? 5 : 0, conds: conds[p.rec.id] || [], dead: false, notes: "" };
    });
    function foe(n, name, init, hp, extra) {
      var cb = { cid: cid(), src: "npc", ref: n.id, name: name, init: init, ac: n.ac,
                 hpMax: n.hp, hp: hp, tmp: 0, conds: [], dead: hp <= 0, notes: "" };
      Object.keys(extra || {}).forEach(function (x) { cb[x] = extra[x]; });
      return cb;
    }
    combatants.push(foe(npcs[0], "Ser Ambrel Dace", 15, 41));
    combatants.push(foe(npcs[1], "Thorn Enforcer", 13, 11, { conds: ["Prone"] }));
    combatants.push(foe(npcs[1], "Thorn Enforcer B", 13, 26));
    combatants.push(foe(npcs[2], "Collections Drone", 16, 0));
    var enc = { id: "demo-e-live", name: "Collections in the Gullet", round: 2,
                turnCid: combatants.filter(function (c) { return c.ref === "demo-sable"; })[0].cid,
                combatants: combatants };

    var encs = [{ id: "demo-e-cantor", name: "The lifts arrive early", created: now,
      round: 1, turnCid: null, combatants: [
        foe(npcs[2], "Collections Drone", 14, npcs[2].hp),
        foe(npcs[2], "Collections Drone B", 11, npcs[2].hp),
        foe(npcs[3], "Gullet Runner", 8, npcs[3].hp)] }];

    var play = {
      mode: "table", rep: 3, updated: now,
      clocks: [
        { id: "demo-c1", name: "The Cantor notices you", seg: 6, filled: 4, notes: "" },
        { id: "demo-c2", name: "House Thorn calls the debt", seg: 8, filled: 5, notes: "" },
        { id: "demo-c3", name: "The god turns its head", seg: 4, filled: 1, notes: "" }
      ],
      story: {
        current: "s4", done: { s1: true, s2: true, s3: true },
        branch: { s1: "mixed", s2: "right", s3: "wrong" },
        notes: { s3: "They ambushed the quieters on the Spine before anyone asked a thing. Pell saw it all." },
        doom: { 1: true }, salvage: 4, feed: { mercy: 2, violence: 1, lies: 0, questions: 2 },
        keys: { k1: "kept", k2: "kept", k3: "broken" }, eyeChrome: "",
        echoes: [
          { at: now, scene: "s1", who: "everyone", fixed: true, clue: "",
            text: "THE FOURTH MINUTE: the Eye weeps; the Cantor misses a note; the Marrowworks fills with light; a ledger burns; the Spine snaps; the Eye closes; four figures in the ruins." },
          { at: now, scene: "s2", who: "Jax Oriel", fixed: false,
            clue: "“You'll want him later” is a phrase one of the players uses.",
            text: "Gold light, a warm hand over their ears, and a voice they almost know: “Don't kill the singer. You'll want him later.”" }
        ]
      },
      scratch: "Session 4, Collections in the Gullet\n" +
        "[20:10] Jax lifted the ichor vial from Dace's courier. Dace knows.\n" +
        "[20:35] Mother Slate: the Marrowworks crew hit something that bled warm.\n" +
        "[21:02] Fight in the Gullet. Brick owes Thorn 4,000₵ and a tooth.\n" +
        "Next time: the lifts arrive before they are called.",
      enc: enc
    };
    return { party: party, npcs: npcs, encs: encs, play: play };
  }
  function loadDemo() {
    if (!inDemo()) {
      var stash = { party: partyAll(), npcs: npcAll(), encs: encAll(), play: playState() };
      if (!lsSet(K_DEMO, stash)) { toast("Storage is blocked, so your table can't be set aside for the demo"); return; }
    }
    var d = demoTable();
    partyWrite(d.party); npcWrite(d.npcs); encWrite(d.encs);
    commit("play", K_PLAY, d.play);
    toast("Demo table loaded");
    redraw();
  }
  function exitDemo() {
    var st = lsGet(K_DEMO, null);
    if (st && typeof st === "object") {
      partyWrite(arrOf(st.party)); npcWrite(arrOf(st.npcs)); encWrite(arrOf(st.encs));
      var back = st.play && typeof st.play === "object" ? st.play : {};
      back.mode = "table";
      if (commit("play", K_PLAY, back)) mem.play = null;   // re-read through playState's checks
    }
    try { localStorage.removeItem(K_DEMO); } catch (e) {}
    toast("Your own table is back");
    redraw();
  }
  function demoBanner(s) {
    var b = el("div", "gm-demo");
    var words = el("div");
    words.appendChild(txt("b", null, "Demo table"));
    words.appendChild(txt("span", null,
      "Made-up characters mid-fight. Your own table is set aside and comes back when you exit; nothing you change here is kept."));
    b.appendChild(words);
    var r = row("gm-row tight");
    r.appendChild(btn("Reset the demo", "", loadDemo));
    r.appendChild(btn("Exit demo", "primary", exitDemo));
    b.appendChild(r);
    s.appendChild(b);
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

  /* ================================================== SECTION 1, PARTY  */
  function renderParty(s) {
    sectionHead(s, "The table", "Party",
      "Every number a player is about to be asked for. Sheets arrive as the share codes they already make, this is a snapshot, so ask for a fresh one when someone levels.");

    /* ---- import ---- */
    var box = el("div", "gm-import");
    var ta = field("", "Paste a share link, or the code from one", null, "textarea");
    ta.rows = 2;
    var nameIn = field("", "Player's name (optional)");
    var add = btn("Add to party", "primary", function () {
      var c = parseShare(ta.value);
      if (!c) { toast("Couldn't read that, paste the whole share link"); return; }
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
          toast(n ? "Added " + count(n, "character", "characters") : "Nothing usable in that file");
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
        toast(n ? "Added " + count(n, "character", "characters") + " from the roster" : "Nothing usable");
        redraw();
      }));
    }
    box.appendChild(ir);
    s.appendChild(box);

    var party = partyChars();
    if (!party.length) {
      empty(s, "No one at the table yet.",
        "Ask each player to open their Play Sheet, hit Copy share link, and send it to you. Paste it above.", "party");
      var tryRow = row("gm-row");
      tryRow.appendChild(btn("Or load a demo table", "primary", loadDemo));
      s.appendChild(tryRow);
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
      if (T.applyLang) T.applyLang(godOut);
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
    head.appendChild(txt("span", null, "Street Cred"));
    // the band name is its own node: glued to the number it would be a new
    // key for every point on the track, and the book already translates it
    var b = el("b", "tone-" + r.tone);
    // signed, not "6 / 10": the track runs both ways now and "−4 / 10" reads
    // like a fraction of the wrong thing
    b.appendChild(txt("span", null, T.sgn(r.rep) + " · "));
    b.appendChild(txt("span", "tier-name", tierText(r.tier)));
    head.appendChild(b);
    box.appendChild(head);
    /* Centre-anchored: zero in the middle, growing right when they are liked
       and left when they are not. Its own classes, because humanityMeter()
       uses the plain .meter-bar/.meter-fill and must not move. */
    var bar = el("div", "meter-bar bipolar");
    bar.appendChild(el("div", "meter-zero"));
    var fill = el("div", "meter-fill bipolar bg-" + r.tone);
    var half = Math.abs(r.rep) / 10 * 50;
    fill.style.width = half + "%";
    if (r.rep >= 0) fill.style.left = "50%"; else fill.style.right = "50%";
    bar.appendChild(fill);
    box.appendChild(bar);
    return box;
  }
  /* "Name" is also the label on every name field, and the overlay has one key
     per string, so in Spanish the band read "Nombre". Bands look themselves up
     under their own prefix first. */
  function tierText(tier) {
    var k = "Cred tier: " + tier, v = T.T ? T.T(k) : k;
    return v === k ? tier : v;
  }
  function repStrip() {
    var wrap = el("div", "gm-rep");
    var meterHost = el("div"), notes = el("div");

    /* The slider is built once and only its value changes. Rebuilding it on
       every input replaced the element mid-gesture: a drag stopped after the
       first step and arrow keys lost focus after one press. */
    var ctl = el("div", "gm-rep-ctl");
    var sl = document.createElement("input");
    sl.type = "range"; sl.min = -10; sl.max = 10; sl.step = 1;
    sl.setAttribute("aria-label", "Street Cred");
    function move(v) { repSet(v); paint(); refreshDossier(); }
    sl.oninput = function () { move(sl.value); };
    ctl.appendChild(btn("−1", "tiny", function () { move(repGet() - 1); }));
    ctl.appendChild(sl);
    ctl.appendChild(btn("+1", "tiny", function () { move(repGet() + 1); }));
    wrap.appendChild(meterHost);
    wrap.appendChild(ctl);
    wrap.appendChild(notes);
    wrap.appendChild(txt("div", "gm-note",
      "Yours to move. A point for a job the street saw, one back for folding in public."));

    var lastTier = null;
    function paint() {
      var r = repState(repGet());
      meterHost.innerHTML = "";
      meterHost.appendChild(repMeter(r.rep));
      // crossing into a new band flares, so the table notices the city has
      // changed its mind; moving within a band does not
      if (lastTier !== null && lastTier !== r.tier) {
        var tn = meterHost.querySelector(".tier-name"), fl = meterHost.querySelector(".meter-fill");
        if (tn) tn.classList.add("rank-shift");
        if (fl) fl.classList.add("rank-shift-bar", "tone-" + r.tone);
      }
      lastTier = r.tier;
      if (+sl.value !== r.rep) sl.value = r.rep;
      // attributes outside the overlay's list, so translated here
      sl.setAttribute("aria-valuetext",
        T.T("Street Cred") + " " + T.sgn(r.rep) + ", " + T.T(tierText(r.tier)));

      notes.innerHTML = "";
      // Each half is its own text node rather than one built string, so the
      // Spanish table can translate the label and the band line separately,
      // a concatenation would need one key per band per line.
      function note(label, body) {
        var d = el("div", "meter-note");
        d.appendChild(txt("span", "gm-label", label));
        d.appendChild(txt("span", null, " " + body));
        notes.appendChild(d);
      }
      note(T.sgn(r.mod) + " to Charisma checks", r.buys);
      note("Looking into things", r.digging);
      note("When it turns ugly", r.combat);
      if (T.applyLang) { T.applyLang(meterHost); T.applyLang(notes); }
    }
    paint();
    return wrap;
  }
  /* Read-only, for screens where the number is context rather than the task. */
  function repBadge() {
    var r = repState(repGet());
    var b = txt("div", "gm-rep-badge", "");
    b.appendChild(txt("span", "gm-label", "Street Cred"));
    var v = el("b", "tone-" + r.tone);
    v.appendChild(txt("span", null, T.sgn(r.rep) + " · "));
    v.appendChild(txt("span", null, tierText(r.tier)));
    b.appendChild(v);
    b.appendChild(txt("span", "gm-note", T.sgn(r.mod) + " to Charisma checks"));
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
        if (s.effect) {
          var ef = el("div", "gm-syn-effect");
          ef.appendChild(txt("span", "gm-label", "What it does"));
          ef.appendChild(txt("span", null, s.effect));
          card.appendChild(ef);
        }
        if (s.wired) card.appendChild(txt("div", "gm-syn-wired", s.wired));
        list.appendChild(card);
      });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(txt("div", "gm-note",
        "No named pair at this table. That is not a penalty, it means whatever they pull off is theirs."));
    }

    var cov = el("div", "gm-syn-cov");
    // gold rather than alert at the narrow end: a specialist crew is a shape,
    // not a fault, and alert is what Humanity uses for actually losing people.
    cov.appendChild(txt("b", "tone-" + (syn.roles.length >= 6 ? "signal" : "gold"),
      syn.tier ? syn.tier.name : ""));
    cov.appendChild(txt("span", "gm-note", ": "));
    cov.appendChild(txt("span", "gm-note", syn.tier ? syn.tier.gist : ""));
    wrap.appendChild(cov);
    var chips = el("div", "gm-chips tight");
    syn.roles.forEach(function (r) { chips.appendChild(T.roleChip(r)); });
    syn.missing.forEach(function (r) { chips.appendChild(T.roleChip(r, "off")); });
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
      // built after render(), so applyLang() has already been and gone, the
      // same thing toast() does with the text it creates on the fly
      if (T.applyLang) T.applyLang(out);
    }));
    wrap.appendChild(out);

    function paint() {
      var b = repMod() + sit;
      // 16 is the bottom of Friendly, the first band that actually helps them
      var o = odds(16, b);
      pre.innerHTML = "";
      pre.appendChild(txt("span", null, "d20 " + T.sgn(b) + " · "));
      pre.appendChild(txt("span", null, o.pct + "% chance of Friendly or better"));
      pre.appendChild(txt("span", null, "  ·  "));
      pre.appendChild(txt("span", null, sit ? "Cred " + T.sgn(repMod()) + ", situation " + T.sgn(sit)
                                           : "Cred " + T.sgn(repMod())));
      if (T.applyLang) T.applyLang(pre);
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
      "Level " + c.level + " " + (c.cls || "-") +
      (d.sub && c.level >= d.sub.levelAvailable ? " · " + d.sub.name : "") +
      (p.rec.player ? "  ·  " + p.rec.player : "")));
    head.appendChild(nm);
    var roles = el("div", "pick-roles");
    (SY.classRoles[c.cls] || []).forEach(function (r) { roles.appendChild(T.roleChip(r)); });
    head.appendChild(roles);
    card.appendChild(head);

    /* the numbers you get asked for */
    var vitals = el("div", "gm-vitals");
    var dc = T.saveDC(d);
    [["AC", d.ac.ac, d.ac.from],
     ["HP", d.hp == null ? "-" : d.hp, (d.cls ? c.level + d.cls.hit : "")],
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

    /* humanity, reuse the app's own meter so it reads identically */
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
      // skill and number as separate nodes: glued together the Spanish table
      // would need one key per skill per bonus
      var chip = el("span", "chip");
      chip.appendChild(txt("span", null, name));
      chip.appendChild(txt("span", null, " " + T.sgn(repSkillBonus(name, d))));
      skc.appendChild(chip);
    });
    if (!d.prof.length) skc.appendChild(txt("span", "gm-note", "none recorded"));
    sk.appendChild(skc);
    card.appendChild(sk);

    /* What this one brings, as opposed to what the table is. The party-wide
       panel above the cards answers the second question; this answers the
       first, and shows what the table is one recruit short of. */
    var mine = SY.pairs.filter(function (s) { return s.pair.indexOf(c.cls) >= 0; });
    if (mine.length) {
      var ps = el("div", "gm-strip");
      ps.appendChild(txt("div", "gm-label", "Pairs with"));
      var list = el("div", "gm-pairs");
      mine.forEach(function (s) {
        var other = s.pair[0] === c.cls ? s.pair[1] : s.pair[0];
        // the GM can name the person; a player's own screen never can
        var who = (party || []).filter(function (x) {
          return x.c.cls === other && x.rec.id !== p.rec.id;
        })[0];
        var row = el("div", "gm-pair" + (who ? " live" : ""));
        row.appendChild(txt("span", "n", s.name));
        row.appendChild(txt("span", "w", who ? (who.c.name || "Unnamed") : other));
        if (s.effect) row.title = s.effect;
        list.appendChild(row);
      });
      ps.appendChild(list);
      card.appendChild(ps);
    }

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
    if (!inDemo()) {
      wrap.appendChild(txt("div", "gm-label", "Try it"));
      var dr = row("gm-row");
      dr.appendChild(btn("Load a demo table", "", loadDemo));
      dr.appendChild(txt("span", "gm-note",
        "A made-up Cathedra game mid-fight, to see every screen in use. Your own table is set aside and comes back when you exit."));
      wrap.appendChild(dr);
    }
    var age = p.exported ? Math.floor((Date.now() - p.exported) / 86400000) : null;
    wrap.appendChild(txt("div", "gm-note", age == null
      ? "Never exported. Everything here lives in this browser only, clearing site data deletes it."
      : age === 0 ? "Exported today." : "Exported " + age + " day" + (age === 1 ? "" : "s") + " ago."));
    if (hasUnsaved()) {
      var bad = txt("div", "gm-unsaved",
        "Some changes could not be saved to this browser. They are still on screen and " +
        "will be included in an export, do that now, before you close the tab.");
      wrap.appendChild(bad);
    }
    s.appendChild(wrap);
  }

  /* =================================================== SECTION 6, STORY
     "The Fourth Minute", from story.js. Everything the story says is English
     and marked data-nolang, so the Spanish overlay never half-translates a
     sentence; the tab's own labels translate as usual.

     Drop-downs build their contents the first time they open: twelve scenes
     of sixteen categories each is a lot of DOM to make for a tab you may only
     glance at. Open state is kept out here because render() rebuilds the
     stage, the same reason app.js keeps synOpen. */
  var ST = window.TTST || null;
  var storyOpen = {};
  var FEEDS = [["mercy", "Mercy"], ["violence", "Violence"], ["lies", "Lies"], ["questions", "Questions"]];

  function storyState() { return playState().story; }
  function storyPatch(fn) { playPatch(function (p) { p.story = cleanStory(p.story); fn(p.story); }); }
  function storyScenes() {
    if (!ST) return [];
    return ST.acts.reduce(function (a, act) { return a.concat(act.scenes); }, []);
  }
  function sceneById(id) { return storyScenes().filter(function (x) { return x.id === id; })[0] || null; }
  function sceneNow() {
    var st = storyState();
    return sceneById(st.current) ||
      storyScenes().filter(function (x) { return !st.done[x.id]; })[0] || null;
  }
  /* story text: never run through the Spanish overlay */
  function stxt(tag, cls, text) {
    var n = txt(tag, cls, text);
    n.setAttribute("data-nolang", "");
    return n;
  }
  function band(salvage) {
    return salvage >= 18 ? "Witnesses" : salvage >= 12 ? "Exodus" : salvage >= 6 ? "Embers" : "Ash";
  }
  function keysKept(st) {
    var kept = 0, broken = 0;
    (ST ? ST.keystones : []).forEach(function (k) {
      if (st.keys[k.id] === "kept") kept++;
      else if (st.keys[k.id] === "broken") broken++;
    });
    return { kept: kept, broken: broken, total: ST ? ST.keystones.length : 0 };
  }
  function doomCount(st) {
    return Object.keys(st.doom).filter(function (k) { return st.doom[k]; }).length;
  }

  /* A drop-down whose body is made on first open and remembered across renders. */
  function lazyDetails(id, cls, head, fill) {
    var d = el("details", "item st-d " + (cls || ""));
    var sum = el("summary");
    if (typeof head === "string") sum.appendChild(txt("h4", null, head)); else sum.appendChild(head);
    d.appendChild(sum);
    var body = el("div", "body");
    d.appendChild(body);
    var built = false;
    function build() {
      if (built) return;
      built = true;
      fill(body);
      if (T.applyLang) T.applyLang(body);
    }
    if (storyOpen[id]) { d.open = true; build(); }
    d.addEventListener("toggle", function () {
      storyOpen[id] = d.open;
      if (d.open) build();
    });
    return d;
  }
  function paras(host, list) {
    (list || []).forEach(function (x) {
      if (typeof x === "string") { host.appendChild(stxt("p", "st-p", x)); return; }
      var b = el("div", "st-block");
      b.appendChild(stxt("b", "st-h", x.h));
      b.appendChild(stxt("p", "st-p", x.t));
      host.appendChild(b);
    });
  }

  /* ---- the dials the tab keeps: doom, salvage, feed, keystones ---- */
  function storyDials(s) {
    var st = storyState(), box = el("div", "st-dials");

    var doom = el("div", "st-dial");
    doom.appendChild(txt("div", "gm-label", "Doom"));
    var segs = el("div", "gm-segs st-doom");
    ST.fragments.forEach(function (f) {
      var on = !!st.doom[f.n];
      var b = txt("button", "gm-seg" + (on ? " on" : ""), "");
      b.setAttribute("aria-label", "Fragment " + f.n);
      b.setAttribute("aria-pressed", on);
      b.title = f.image;
      b.onclick = function () { storyPatch(function (x) { x.doom[f.n] = !x.doom[f.n]; }); redraw(); };
      segs.appendChild(b);
    });
    doom.appendChild(segs);
    doom.appendChild(txt("div", "gm-note", doomCount(st) + " / 7"));
    box.appendChild(doom);

    var sal = el("div", "st-dial");
    sal.appendChild(txt("div", "gm-label", "Salvage"));
    var sr = row("gm-row tight");
    sr.appendChild(btn("−1", "tiny", function () { storyPatch(function (x) { x.salvage--; }); redraw(); }));
    sr.appendChild(txt("b", "st-big", String(st.salvage)));
    sr.appendChild(btn("+1", "tiny", function () { storyPatch(function (x) { x.salvage++; }); redraw(); }));
    sal.appendChild(sr);
    sal.appendChild(stxt("div", "gm-note", band(st.salvage)));
    box.appendChild(sal);

    var feed = el("div", "st-dial");
    feed.appendChild(txt("div", "gm-label", "Feed"));
    var fr = el("div", "gm-chips tight");
    var top = Math.max.apply(null, FEEDS.map(function (f) { return st.feed[f[0]]; }));
    FEEDS.forEach(function (f) {
      var c = el("span", "st-feed" + (top > 0 && st.feed[f[0]] === top ? " top" : ""));
      c.appendChild(txt("span", null, f[1]));
      c.appendChild(txt("b", null, " " + st.feed[f[0]]));
      c.appendChild(btn("+", "tiny", function () { storyPatch(function (x) { x.feed[f[0]]++; }); redraw(); }));
      c.appendChild(btn("−", "tiny", function () { storyPatch(function (x) { x.feed[f[0]] = Math.max(0, x.feed[f[0]] - 1); }); redraw(); }));
      fr.appendChild(c);
    });
    feed.appendChild(fr);
    box.appendChild(feed);

    var k = keysKept(st);
    var path = el("div", "st-dial");
    path.appendChild(txt("div", "gm-label", "The 1% path"));
    path.appendChild(txt("b", "st-path " + (k.broken ? "closed" : "open"), k.broken ? "Closed" : "Still open"));
    path.appendChild(txt("div", "gm-note", k.kept + " / " + k.total + " keystones kept"));
    box.appendChild(path);

    s.appendChild(box);
  }

  /* ---- the vision roll: the "gift from the gods" ---- */
  function rollVision() {
    var st = storyState(), sc = sceneNow();
    var need = st.eyeChrome ? 16 : 17;
    var r = roll(1, 20, 0).total;
    var out = { roll: r, need: need, hit: r >= need, scene: sc ? sc.id : null, who: null, echo: null };
    if (!out.hit) return out;
    var party = partyChars();
    out.who = party.length ? (pick(party).c.name || "Unnamed") : "one of them";
    var pool = sc && sc.echoes && sc.echoes.length ? sc.echoes : null;
    if (!pool) return out;
    out.echo = pick(pool);
    storyPatch(function (x) {
      x.echoes.push({ at: Date.now(), scene: sc.id, who: out.who, text: out.echo.text, clue: out.echo.clue, fixed: false });
    });
    return out;
  }
  function logFixed(sc) {
    storyPatch(function (x) {
      x.echoes.push({ at: Date.now(), scene: sc.id, who: "everyone", text: sc.fixedEcho, clue: "", fixed: true });
    });
  }
  function storyVisions(s) {
    var st = storyState(), sc = sceneNow();
    var wrap = el("div", "gm-god st-vision");
    wrap.appendChild(btn("Roll for a vision", "primary", function () {
      var v = rollVision();
      out.innerHTML = "";
      out.appendChild(txt("span", "gm-god-die" + (v.hit ? " hit" : ""), String(v.roll)));
      var says = el("div", "st-vision-out");
      if (!v.hit) {
        says.appendChild(txt("div", "gm-god-says", "Nothing this time."));
        says.appendChild(txt("div", "gm-note", "Needs " + v.need + "+."));
      } else if (!v.echo) {
        says.appendChild(txt("div", "gm-god-says", "A vision, but this scene's vision is a fixed one."));
      } else {
        says.appendChild(stxt("div", "gm-god-says", v.who + " sees:"));
        says.appendChild(stxt("div", "st-p", v.echo.text));
        if (v.echo.clue) says.appendChild(stxt("div", "gm-note st-clue", "Clue: " + v.echo.clue));
      }
      out.appendChild(says);
      if (T.applyLang) T.applyLang(out);
      refreshDossier();
    }));
    var info = el("div", "st-vision-info");
    info.appendChild(txt("span", "gm-note", "d20 at a key moment · 17+, or 16+ with the Eye-chrome · scene: "));
    info.appendChild(stxt("span", "gm-note", sc ? "S" + sc.session + " · " + sc.title : "none"));
    wrap.appendChild(info);

    // who, if anyone, has the Lidless: it moves the roll by one
    var sel = document.createElement("select");
    sel.className = "gm-condsel";
    var none = txt("option", null, "Nobody has the Eye-chrome");
    none.value = ""; sel.appendChild(none);
    partyChars().forEach(function (p) {
      var o = txt("option", null, p.c.name || "Unnamed");
      o.value = p.c.name || "Unnamed";
      o.setAttribute("data-nolang", "");
      if (st.eyeChrome === o.value) o.selected = true;
      sel.appendChild(o);
    });
    if (st.eyeChrome && !partyChars().some(function (p) { return (p.c.name || "Unnamed") === st.eyeChrome; })) {
      var gone = txt("option", null, st.eyeChrome); gone.value = st.eyeChrome; gone.selected = true;
      sel.appendChild(gone);
    }
    sel.setAttribute("aria-label", "Who has the Eye-chrome");
    sel.onchange = function () { storyPatch(function (x) { x.eyeChrome = sel.value; }); redraw(); };
    wrap.appendChild(sel);
    var out = el("div", "gm-god-out");
    wrap.appendChild(out);
    s.appendChild(wrap);
  }

  /* ---- role hooks, filled from the party ---- */
  function partyRoles() {
    var map = {};
    partyChars().forEach(function (p) {
      (SY.classRoles[p.c.cls] || []).forEach(function (r) {
        (map[r] = map[r] || []).push(p.c.name || "Unnamed");
      });
    });
    return map;
  }
  function fillHooks(host, sc) {
    var have = partyRoles();
    SY.roles.forEach(function (r) {
      if (!sc.hooks || !sc.hooks[r]) return;
      var who = have[r];
      var line = el("div", "st-hook" + (who ? " on" : " off"));
      var head = el("div", "st-hook-head");
      head.appendChild(T.roleChip(r, who ? "" : "off"));
      head.appendChild(stxt("span", "st-who", who ? who.join(", ") : ""));
      if (!who) head.appendChild(txt("span", "gm-note", "nobody at the table"));
      line.appendChild(head);
      line.appendChild(stxt("div", "st-p", sc.hooks[r]));
      host.appendChild(line);
    });
  }

  /* ---- wiring into the other screens ---- */
  function storyStartClocks(id) {
    var sc = sceneById(id), n = 0;
    if (!sc) return 0;
    playPatch(function (p) {
      (sc.clocks || []).forEach(function (c) {
        if (p.clocks.some(function (x) { return x.id === c.id; })) return;
        p.clocks.push({ id: c.id, name: c.name, seg: c.seg, filled: 0, notes: "" });
        n++;
      });
    });
    return n;
  }
  function storyAddNpcs(id) {
    var sc = sceneById(id), n = 0;
    if (!sc) return 0;
    var have = {};
    npcAll().forEach(function (x) { have[x.id] = true; });
    (sc.npcs || []).forEach(function (m) {
      if (have[m.id]) return;
      var t = G.npcTemplates.filter(function (x) { return x.name === m.template; })[0] || G.npcTemplates[0];
      var nn = npcFromTemplate(t);
      nn.id = m.id; nn.name = m.name; nn.role = m.role; nn.notes = m.notes || "";
      nn.tags = ["story"];
      npcSave(nn); have[m.id] = true; n++;
    });
    return n;
  }
  function applyCall(c) {
    storyPatch(function (x) {
      if (c.salvage) x.salvage += c.salvage;
      if (c.feed && x.feed[c.feed] != null) x.feed[c.feed]++;
      if (c.doom) x.doom[c.doom] = true;
    });
  }
  function callLine(host, c, sc) {
    var d = el("div", "st-call");
    d.appendChild(stxt("b", "st-q", c.call));
    d.appendChild(stxt("p", "st-p", c.result));
    if (c.lead) {
      var l = el("p", "st-p st-lead");
      l.appendChild(txt("span", "gm-label", "Lead on"));
      l.appendChild(stxt("span", null, " " + c.lead));
      d.appendChild(l);
    }
    var r = row("gm-row tight");
    var bits = [];
    if (c.salvage) bits.push("Salvage " + T.sgn(c.salvage));
    if (c.feed) bits.push("Feed: " + c.feed);
    if (c.doom) bits.push("Doom: fragment " + c.doom);
    var ap = btn("Apply", "tiny", function () {
      applyCall(c);
      toast("Applied to the story");
      redraw();
    });
    ap.title = HELP.story && HELP.story.tips.apply || "";
    r.appendChild(ap);
    bits.forEach(function (b) { r.appendChild(txt("span", "chip", b)); });
    d.appendChild(r);
    host.appendChild(d);
  }
  function keyLine(host, k) {
    var st = storyState(), v = st.keys[k.id] || "";
    var d = el("div", "st-key " + v);
    var head = el("div", "st-key-head");
    head.appendChild(stxt("b", null, k.id.toUpperCase() + " · " + k.name));
    var seg = el("div", "seg");
    [["kept", "Kept"], ["broken", "Broken"], ["", "Undecided"]].forEach(function (o) {
      var b = txt("button", null, o[1]);
      b.setAttribute("aria-pressed", v === o[0]);
      b.onclick = function () { storyPatch(function (x) { if (o[0]) x.keys[k.id] = o[0]; else delete x.keys[k.id]; }); redraw(); };
      seg.appendChild(b);
    });
    head.appendChild(seg);
    d.appendChild(head);
    d.appendChild(stxt("p", "st-p", k.keep));
    var om = el("p", "st-p");
    om.appendChild(txt("span", "gm-label", "Omen"));
    om.appendChild(stxt("span", null, " " + k.omen));
    d.appendChild(om);
    var sc2 = el("p", "st-p");
    sc2.appendChild(txt("span", "gm-label", "Scar"));
    sc2.appendChild(stxt("span", null, " " + k.scar));
    d.appendChild(sc2);
    host.appendChild(d);
  }

  /* ---- one scene ---- */
  var CATS = [
    ["truth", "What's really happening"], ["readAloud", "Read aloud"], ["hooks", "Ways in, by role"],
    ["questions", "Questions worth asking"], ["notAsked", "If they don't ask"], ["missed", "Details they can miss"],
    ["right", "Right calls"], ["wrong", "Wrong calls"], ["goesWrong", "When it goes wrong anyway"],
    ["checks", "Checks and DCs"], ["visions", "Visions"], ["scars", "Loop scars"], ["eyeChrome", "The Eye-chrome"],
    ["cred", "Street Cred"], ["clocksNpcs", "Clocks and NPCs"], ["fragment", "The fragment"], ["keystones", "Keystones"]
  ];
  function fillCat(host, key, sc) {
    switch (key) {
      case "truth": host.appendChild(stxt("p", "st-p", sc.truth)); break;
      case "readAloud":
        sc.readAloud.forEach(function (t) { host.appendChild(stxt("p", "st-read", t)); }); break;
      case "hooks": fillHooks(host, sc); break;
      case "questions":
        sc.questions.forEach(function (q) {
          var d = el("div", "st-qa");
          var h = el("div", "st-q-head");
          h.appendChild(stxt("b", "st-q", q.q));
          if (q.keystone) h.appendChild(txt("span", "chip tier", "Keystone " + q.keystone.toUpperCase()));
          d.appendChild(h);
          d.appendChild(stxt("p", "st-p", q.a));
          host.appendChild(d);
        });
        break;
      case "notAsked":
        sc.notAsked.forEach(function (x) {
          var d = el("div", "st-qa");
          d.appendChild(stxt("b", "st-q", x["if"]));
          d.appendChild(stxt("p", "st-p", x.then));
          var r = el("p", "st-p st-lead");
          r.appendChild(txt("span", "gm-label", "Where it comes back"));
          r.appendChild(stxt("span", null, " " + x.recover));
          d.appendChild(r);
          host.appendChild(d);
        });
        break;
      case "missed":
        sc.missed.forEach(function (x) {
          var d = el("div", "st-qa");
          d.appendChild(stxt("b", "st-q", x.detail));
          var m = el("p", "st-p");
          m.appendChild(txt("span", "gm-label", "What it means"));
          m.appendChild(stxt("span", null, " " + x.means));
          d.appendChild(m);
          var f = el("p", "st-p st-lead");
          f.appendChild(txt("span", "gm-label", "If they miss it"));
          f.appendChild(stxt("span", null, " " + x.ifMissed));
          d.appendChild(f);
          host.appendChild(d);
        });
        break;
      case "right":
        if (helpOn()) { var ah = hintEl("story", "apply"); if (ah) host.appendChild(ah); }
        sc.right.forEach(function (c) { callLine(host, c, sc); }); break;
      case "wrong": sc.wrong.forEach(function (c) { callLine(host, c, sc); }); break;
      case "goesWrong":
        var ul = el("ul", "st-list");
        sc.goesWrong.forEach(function (t) { ul.appendChild(stxt("li", null, t)); });
        host.appendChild(ul);
        break;
      case "checks":
        var tb = el("table", "gm-tbl");
        var hr = el("tr");
        ["Situation", "Roll", "DC"].forEach(function (h) { hr.appendChild(txt("th", null, h)); });
        tb.appendChild(hr);
        sc.checks.forEach(function (c) {
          var tr = el("tr");
          tr.appendChild(stxt("td", null, c.what));
          tr.appendChild(stxt("td", null, c.skill));
          tr.appendChild(txt("td", "num", c.dc ? String(c.dc) : "-"));
          tb.appendChild(tr);
        });
        host.appendChild(tb);
        break;
      case "visions":
        if (sc.fixedEcho) {
          var fx = el("div", "st-qa st-fixed");
          fx.appendChild(txt("span", "chip tier", "Fixed vision"));
          fx.appendChild(stxt("p", "st-read", sc.fixedEcho));
          var logged = storyState().echoes.some(function (e) { return e.fixed && e.scene === sc.id; });
          var lr = row("gm-row tight");
          lr.appendChild(btn(logged ? "Logged" : "Log it as seen", "tiny", function () {
            if (!logged) { logFixed(sc); toast("Vision logged"); redraw(); }
          }));
          fx.appendChild(lr);
          host.appendChild(fx);
        }
        sc.echoes.forEach(function (e) {
          var d = el("div", "st-qa");
          var b = el("p", "st-p");
          b.appendChild(txt("span", "gm-label", "Roll when"));
          b.appendChild(stxt("span", null, " " + e.beat));
          d.appendChild(b);
          d.appendChild(stxt("p", "st-read", e.text));
          var cl = el("p", "st-p st-lead");
          cl.appendChild(txt("span", "gm-label", "The clue"));
          cl.appendChild(stxt("span", null, " " + e.clue));
          d.appendChild(cl);
          host.appendChild(d);
        });
        break;
      case "scars":
        var ul2 = el("ul", "st-list");
        sc.scars.forEach(function (t) { ul2.appendChild(stxt("li", null, t)); });
        host.appendChild(ul2);
        break;
      case "eyeChrome": host.appendChild(stxt("p", "st-p", sc.eyeChrome)); break;
      case "cred":
        sc.cred.forEach(function (c) {
          var r = row("gm-row tight st-cred");
          var cb2 = btn("Street Cred " + T.sgn(c.delta), "tiny", function () {
            var v = repSet(repGet() + c.delta);
            toast("Street Cred is now " + T.sgn(v));
            redraw();
          });
          cb2.title = HELP.story && HELP.story.tips.cred || "";
          r.appendChild(cb2);
          r.appendChild(stxt("span", "st-p", c.event));
          host.appendChild(r);
        });
        break;
      case "clocksNpcs":
        if ((sc.clocks || []).length) {
          host.appendChild(txt("div", "gm-label", "Clocks"));
          sc.clocks.forEach(function (c) { host.appendChild(stxt("div", "st-p", c.name + " · " + c.seg)); });
        }
        if ((sc.npcs || []).length) {
          host.appendChild(txt("div", "gm-label", "NPCs"));
          sc.npcs.forEach(function (m) {
            var d = el("div", "st-qa");
            d.appendChild(stxt("b", "st-q", m.name + ", " + m.role));
            d.appendChild(stxt("p", "st-p", m.notes));
            host.appendChild(d);
          });
        }
        break;
      case "fragment":
        var f = ST.fragments.filter(function (x) { return x.n === sc.fragment.n; })[0];
        host.appendChild(stxt("p", "st-read", (f ? f.image : "")));
        var ul3 = el("ul", "st-list");
        sc.fragment.ways.forEach(function (t) { ul3.appendChild(stxt("li", null, t)); });
        host.appendChild(ul3);
        var on = !!storyState().doom[sc.fragment.n];
        host.appendChild(btn(on ? "Fragment " + sc.fragment.n + " is ticked" : "Tick fragment " + sc.fragment.n, "tiny", function () {
          storyPatch(function (x) { x.doom[sc.fragment.n] = !x.doom[sc.fragment.n]; }); redraw();
        }));
        break;
      case "keystones":
        sc.keystones.forEach(function (id) {
          var k = ST.keystones.filter(function (x) { return x.id === id; })[0];
          if (k) keyLine(host, k);
        });
        break;
    }
  }
  function hasCat(key, sc) {
    if (key === "eyeChrome") return !!sc.eyeChrome;
    if (key === "fragment") return !!sc.fragment;
    if (key === "keystones") return !!(sc.keystones && sc.keystones.length);
    if (key === "visions") return !!(sc.fixedEcho || (sc.echoes && sc.echoes.length));
    if (key === "clocksNpcs") return !!((sc.clocks && sc.clocks.length) || (sc.npcs && sc.npcs.length));
    if (key === "scars") return !!(sc.scars && sc.scars.length);
    if (key === "cred") return !!(sc.cred && sc.cred.length);
    return true;
  }
  function sceneBlock(sc) {
    var st = storyState();
    var head = el("div", "st-scene-head");
    head.appendChild(txt("span", "st-num", "S" + sc.session));
    head.appendChild(stxt("h4", null, sc.title));
    head.appendChild(txt("span", "chip", "Level " + sc.level));
    if (st.done[sc.id]) head.appendChild(txt("span", "chip st-done", "Played"));
    if (st.current === sc.id) head.appendChild(txt("span", "chip st-now", "Now"));
    if (st.branch[sc.id]) head.appendChild(txt("span", "chip st-br " + st.branch[sc.id],
      st.branch[sc.id] === "right" ? "Went right" : st.branch[sc.id] === "wrong" ? "Went wrong" : "Mixed"));

    return lazyDetails("scene:" + sc.id, "st-scene" + (st.current === sc.id ? " now" : ""), head, function (body) {
      body.appendChild(stxt("div", "gm-note st-place", sc.place));
      var c = row("gm-row st-ctl");
      c.appendChild(btn(st.done[sc.id] ? "Played ✓" : "Mark played", st.done[sc.id] ? "tiny" : "tiny primary", function () {
        storyPatch(function (x) { x.done[sc.id] = !x.done[sc.id]; }); redraw();
      }));
      c.appendChild(btn(st.current === sc.id ? "Current scene" : "Set as current", "tiny", function () {
        storyPatch(function (x) { x.current = sc.id; }); redraw();
      }));
      var seg = el("div", "seg");
      [["right", "Right"], ["mixed", "Mixed"], ["wrong", "Wrong"]].forEach(function (o) {
        var b = txt("button", null, o[1]);
        b.setAttribute("aria-pressed", st.branch[sc.id] === o[0]);
        b.onclick = function () {
          storyPatch(function (x) { if (x.branch[sc.id] === o[0]) delete x.branch[sc.id]; else x.branch[sc.id] = o[0]; });
          redraw();
        };
        seg.appendChild(b);
      });
      c.appendChild(seg);
      if ((sc.clocks || []).length) c.appendChild(btn("Start clocks", "tiny", function () {
        var n = storyStartClocks(sc.id);
        toast(n ? "Started " + count(n, "clock", "clocks") : "Those clocks are already running");
      }));
      if ((sc.npcs || []).length) c.appendChild(btn("Add NPCs", "tiny", function () {
        var n = storyAddNpcs(sc.id);
        toast(n ? "Added " + count(n, "NPC", "NPCs") + " to your NPCs" : "They're already in your NPCs");
      }));
      body.appendChild(c);
      [].forEach.call(c.querySelectorAll("button"), function (b) {
        var l = b.textContent;
        var k = /^Mark played|^Played/.test(l) ? "played" : /current/i.test(l) ? "current" :
          /^Start clocks/.test(l) ? "clocks" : /^Add NPCs/.test(l) ? "npcs" : null;
        if (k && HELP.story.tips[k]) b.title = HELP.story.tips[k];
      });
      if (helpOn()) { var sh = hintEl("story", "scene"); if (sh) body.appendChild(sh); }

      var note = field(st.notes[sc.id] || "", "Your notes for this scene, what happened, who they annoyed…",
        function (v) { storyPatch(function (x) { if (v) x.notes[sc.id] = v; else delete x.notes[sc.id]; }); }, "textarea");
      note.className = "st-note";
      note.rows = 2;
      body.appendChild(note);

      CATS.forEach(function (cat) {
        if (!hasCat(cat[0], sc)) return;
        body.appendChild(lazyDetails("cat:" + sc.id + ":" + cat[0], "st-cat st-cat-" + cat[0], cat[1], function (h) {
          fillCat(h, cat[0], sc);
        }));
      });
    });
  }

  /* ---- the demo walkthrough: the whole campaign, one session at a time ----
     Steps add up from the start, so any step can be shown on the dials. It
     only ever writes to the demo table: outside the demo, showing a step
     loads the demo first, which sets the real table aside. */
  var walkIx = 0;
  function walkState(n) {
    var st = cleanStory({}), cred = 0, W = (ST && ST.walkthrough) || [];
    for (var i = 0; i <= n && i < W.length; i++) {
      var w = W[i], a = w.add || {}, set = w.set || {};
      (a.done || []).forEach(function (id) { st.done[id] = true; });
      Object.keys(a.branch || {}).forEach(function (k) { st.branch[k] = a.branch[k]; });
      Object.keys(a.notes || {}).forEach(function (k) { st.notes[k] = a.notes[k]; });
      (a.doom || []).forEach(function (d) { st.doom[d] = true; });
      st.salvage += a.salvage || 0;
      Object.keys(a.feed || {}).forEach(function (k) { st.feed[k] += a.feed[k]; });
      Object.keys(a.keys || {}).forEach(function (k) { st.keys[k] = a.keys[k]; });
      (a.echoes || []).forEach(function (e) {
        var sc = sceneById(e.scene);
        if (!sc) return;
        var ech = e.fixed ? null : sc.echoes[e.echo || 0];
        st.echoes.push({ at: 0, scene: e.scene, who: e.who, fixed: !!e.fixed,
          text: e.fixed ? sc.fixedEcho : (ech ? ech.text : ""), clue: ech ? ech.clue : "" });
      });
      if (set.current) st.current = set.current;
      if (set.eyeChrome != null) st.eyeChrome = set.eyeChrome;
      if (set.cred != null) cred = set.cred;
    }
    return { story: st, cred: cred };
  }
  function showWalk(n) {
    if (!inDemo()) loadDemo();
    var ws = walkState(n);
    playPatch(function (p) { p.story = ws.story; });
    repSet(ws.cred);
    redraw();
  }
  function walkBlock() {
    var W = ST.walkthrough || [];
    if (!W.length) return null;
    return lazyDetails("ref:walk", "st-ref st-walk", "Demo walkthrough: a whole campaign, step by step", function (h) {
      h.appendChild(txt("p", "gm-note", "Follow the demo crew from before session 1 to the Sending. Each step says what happened at the table and which buttons the GM pressed. Show this on the dials sets Doom, Salvage, Feed, keystones and Street Cred to that point, on the demo table only."));
      var nav = row("gm-row st-walk-nav");
      nav.appendChild(btn("◀ Previous", "tiny", function () { walkIx = Math.max(0, walkIx - 1); redraw(); }));
      nav.appendChild(txt("span", "st-walk-n", "Step " + (walkIx + 1) + " / " + W.length));
      nav.appendChild(btn("Next ▶", "tiny primary", function () { walkIx = Math.min(W.length - 1, walkIx + 1); redraw(); }));
      h.appendChild(nav);
      var w = W[walkIx];
      h.appendChild(stxt("h4", "st-walk-title", w.title));
      h.appendChild(stxt("p", "st-read", w.narrative));
      h.appendChild(txt("div", "gm-label", "What the GM did"));
      var ol = el("ol", "st-list st-walk-actions");
      w.actions.forEach(function (a) { ol.appendChild(stxt("li", null, a)); });
      h.appendChild(ol);
      var ws = walkState(walkIx), st = ws.story, k = keysKept(st);
      var top = FEEDS.slice().sort(function (a, b) { return st.feed[b[0]] - st.feed[a[0]]; })[0];
      var chips = el("div", "gm-chips tight st-walk-state");
      [["Doom", doomCount(st) + " / 7"], ["Salvage", st.salvage + " · " + band(st.salvage)],
       ["Street Cred", T.sgn(ws.cred)], ["Keystones kept", k.kept + " / " + k.total],
       ["Feed", st.feed[top[0]] ? (T.T ? T.T(top[1]) : top[1]) + " " + st.feed[top[0]] : "-"]].forEach(function (c) {
        var ch = el("span", "chip");
        ch.appendChild(txt("span", null, c[0] + ": "));
        ch.appendChild(stxt("b", null, c[1]));
        chips.appendChild(ch);
      });
      h.appendChild(txt("div", "gm-label", "Where the dials are after this step"));
      h.appendChild(chips);
      var go = row("gm-row");
      var b = btn(inDemo() ? "Show this on the dials" : "Load the demo and show this", "primary", function () {
        showWalk(walkIx);
        toast("Step " + (walkIx + 1) + " is on the dials");
      });
      b.title = "Set the demo table's story to this point";
      go.appendChild(b);
      h.appendChild(go);
    });
  }

  function refBlock(id, title, fill) {
    return lazyDetails("ref:" + id, "st-ref", title, fill);
  }
  function renderStory(s) {
    sectionHead(s, "The table", "Story", null);
    if (!ST) { empty(s, "The story file didn't load.", "Reload the page; story.js sits next to gm.js."); return; }
    var intro = el("div", "st-title");
    intro.appendChild(stxt("h3", null, ST.title));
    intro.appendChild(stxt("p", "st-p", ST.pitch));
    intro.appendChild(txt("div", "gm-note", "GM eyes only. " + ST.sessions + " sessions · levels " +
      ST.levels[0] + "–" + ST.levels[1] + " · Street Cred starts at " + T.sgn(ST.startCred) + "."));
    s.appendChild(intro);

    storyDials(s);
    storyVisions(s);
    var wb = walkBlock();
    if (wb) s.appendChild(wb);

    var tools = row("gm-row");
    // Nested drop-downs are built on open, so "everything" means every id
    // the story can have, set before the redraw rather than clicked open.
    tools.appendChild(btn("Expand everything", "tiny", function () {
      ["walk", "truth", "running", "fragments", "keystones", "visions", "eye", "scars", "hush", "cast", "tables",
       "offscript", "endings"].forEach(function (k) { storyOpen["ref:" + k] = true; });
      ST.acts.forEach(function (a) {
        storyOpen["act:" + a.id] = true;
        a.scenes.forEach(function (sc) {
          storyOpen["scene:" + sc.id] = true;
          CATS.forEach(function (c) { storyOpen["cat:" + sc.id + ":" + c[0]] = true; });
        });
      });
      redraw();
    }));
    tools.appendChild(btn("Collapse everything", "tiny", function () {
      Object.keys(storyOpen).forEach(function (k) { storyOpen[k] = false; });
      [].forEach.call(s.querySelectorAll("details.st-d"), function (d) { d.open = false; });
    }));
    s.appendChild(tools);

    /* ---- the reference shelf ---- */
    s.appendChild(txt("div", "gm-label", "Before you run it"));
    s.appendChild(refBlock("truth", "The truth", function (h) { paras(h, ST.truth); }));
    s.appendChild(refBlock("running", "Running the doom", function (h) { paras(h, ST.running); }));
    s.appendChild(refBlock("fragments", "The seven fragments", function (h) {
      var st = storyState();
      ST.fragments.forEach(function (f) {
        var d = el("div", "st-qa" + (st.doom[f.n] ? " st-ticked" : ""));
        d.appendChild(stxt("b", "st-q", f.n + ". " + f.image));
        d.appendChild(stxt("p", "st-p", f.gm));
        h.appendChild(d);
      });
    }));
    s.appendChild(refBlock("keystones", "The 1% path: twelve keystones", function (h) {
      ST.keystones.forEach(function (k) { keyLine(h, k); });
    }));
    s.appendChild(refBlock("visions", "The visions", function (h) {
      paras(h, ST.visions);
      var st = storyState();
      h.appendChild(txt("div", "gm-label", "Vision log (" + st.echoes.length + ")"));
      if (!st.echoes.length) h.appendChild(txt("div", "gm-note", "Nothing seen yet."));
      st.echoes.forEach(function (e, i) {
        var d = el("div", "st-qa");
        var hd = el("div", "st-q-head");
        hd.appendChild(stxt("b", "st-q", (i + 1) + ". " + e.who + " · " + (sceneById(e.scene) || { title: e.scene }).title));
        if (e.fixed) hd.appendChild(txt("span", "chip tier", "Fixed"));
        hd.appendChild(btn("×", "tiny", function () {
          storyPatch(function (x) { x.echoes.splice(i, 1); }); redraw();
        }));
        d.appendChild(hd);
        d.appendChild(stxt("p", "st-p", e.text));
        h.appendChild(d);
      });
    }));
    s.appendChild(refBlock("eye", "The Eye-chrome (secret)", function (h) {
      var E = ST.eyeChrome;
      h.appendChild(stxt("b", "st-q", E.name));
      h.appendChild(stxt("p", "st-p", E.what));
      var ul = el("ul", "st-list");
      E.effects.forEach(function (t) { ul.appendChild(stxt("li", null, t)); });
      h.appendChild(ul);
      h.appendChild(txt("div", "gm-label", "Where it can turn up"));
      E.chances.forEach(function (c) {
        var d = el("div", "st-qa");
        d.appendChild(stxt("b", "st-q", c.where));
        d.appendChild(stxt("p", "st-p", c.how));
        h.appendChild(d);
      });
    }));
    s.appendChild(refBlock("scars", "Loop scars", function (h) {
      var ul = el("ul", "st-list");
      ST.scars.forEach(function (t) { ul.appendChild(stxt("li", null, t)); });
      h.appendChild(ul);
    }));
    s.appendChild(refBlock("hush", "The Hush", function (h) { paras(h, ST.hush); }));
    s.appendChild(refBlock("cast", "Cast", function (h) {
      ST.cast.forEach(function (c) {
        var d = el("div", "st-qa");
        d.appendChild(stxt("b", "st-q", c.name + ", " + c.role));
        d.appendChild(stxt("p", "st-p", c.notes));
        h.appendChild(d);
      });
    }));
    s.appendChild(refBlock("tables", "Random tables", function (h) {
      ST.tables.forEach(function (t) {
        var d = el("div", "st-qa");
        var hd = el("div", "st-q-head");
        hd.appendChild(stxt("b", "st-q", t.name + " (d" + t.die + ")"));
        var out = el("div", "st-roll-out");
        hd.appendChild(btn("Roll", "tiny primary", function () {
          var r = roll(1, t.die, 0).total;
          out.innerHTML = "";
          out.appendChild(txt("span", "gm-god-die hit", String(r)));
          out.appendChild(stxt("span", "st-p", t.rows[r - 1] || ""));
        }));
        d.appendChild(hd);
        d.appendChild(stxt("p", "gm-note", t.note));
        d.appendChild(out);
        var ol = el("ol", "st-list");
        t.rows.forEach(function (x) { ol.appendChild(stxt("li", null, x)); });
        d.appendChild(ol);
        h.appendChild(d);
      });
    }));
    s.appendChild(refBlock("offscript", "Off-script kit", function (h) { paras(h, ST.offScript); }));
    s.appendChild(refBlock("endings", "Endings", function (h) {
      var st = storyState(), b = band(st.salvage).toLowerCase();
      ST.endings.forEach(function (e) {
        var d = el("div", "st-block" + (e.id === b ? " st-ticked" : ""));
        d.appendChild(stxt("b", "st-h", e.name));
        d.appendChild(stxt("p", "st-p", e.t));
        h.appendChild(d);
      });
    }));

    /* ---- the story itself ---- */
    s.appendChild(txt("div", "gm-label", "The story"));
    ST.acts.forEach(function (act) {
      var head = el("div", "st-act-head");
      head.appendChild(stxt("h4", null, act.title));
      head.appendChild(txt("span", "chip", "Sessions " + act.sessions));
      head.appendChild(txt("span", "chip", "Levels " + act.levels));
      s.appendChild(lazyDetails("act:" + act.id, "st-act", head, function (body) {
        body.appendChild(stxt("p", "st-p st-act-sum", act.summary));
        act.scenes.forEach(function (sc) { body.appendChild(sceneBlock(sc)); });
      }));
    });
  }

  /* ----------------------------------------------------- the ? guide ---
     Every GM screen explains itself while the ? guide is on (the same switch
     the player side uses): a "How to use this screen" box under the heading,
     and a one-line hint under the controls it names. Tooltips stay on either
     way. The screens themselves don't know any of this exists: decorate()
     finds its places after a screen is drawn, so the help can be read, edited
     and translated in one place (TTBGM.help). */
  var HELP = G.help || {};
  function helpOn() { return T.helpOn ? T.helpOn() : true; }
  function guideBox(s, key) {
    var h = HELP[key];
    if (!helpOn() || !h || !h.steps) return;
    var box = el("div", "help gm-guide");
    var head = el("h5");
    head.appendChild(txt("span", null, "How to use this screen"));
    var hide = btn("Hide guide", "tiny", function () { if (T.setHelp) T.setHelp(false); });
    hide.style.marginLeft = "auto";
    hide.title = "Hide every guide. The ? button at the top brings them back.";
    head.appendChild(hide);
    box.appendChild(head);
    var ol = el("ol");
    h.steps.forEach(function (t) { ol.appendChild(txt("li", null, t)); });
    box.appendChild(ol);
    var at = s.querySelector(".stage-head");
    if (at && at.parentNode === s) s.insertBefore(box, at.nextSibling); else s.insertBefore(box, s.firstChild);
  }
  function hintEl(key, which) {
    var h = HELP[key], t = h && h.hints && h.hints[which];
    return t ? txt("div", "gm-hint", t) : null;
  }
  // after = true puts it after the node; false puts it inside, at the end
  function hintAt(node, key, which, inside) {
    if (!node || !helpOn()) return;
    var n = hintEl(key, which);
    if (!n) return;
    if (inside) node.appendChild(n);
    else if (node.parentNode) node.parentNode.insertBefore(n, node.nextSibling);
  }
  function tips(s, key, map) {
    var t = (HELP[key] && HELP[key].tips) || {};
    [].forEach.call(s.querySelectorAll("button"), function (b) {
      if (b.title) return;
      var label = b.textContent.trim();
      for (var i = 0; i < map.length; i++) {
        if (label.indexOf(map[i][0]) === 0 && t[map[i][1]]) { b.title = t[map[i][1]]; return; }
      }
    });
  }
  function btnRow(s, label) {
    var b = [].filter.call(s.querySelectorAll("button"), function (x) {
      return x.textContent.trim().indexOf(label) === 0;
    })[0];
    return b ? b.parentNode : null;
  }
  function decorate(s, sec) {
    var key = ["party", "encounter", "rulings", "npcs", "clocks", "story", "campaign"][sec] || "party";
    guideBox(s, key);
    var q = function (sel) { return s.querySelector(sel); };
    if (key === "party") {
      hintAt(q(".gm-import textarea"), "party", "import");
      hintAt(q(".gm-import .gm-row"), "party", "fromFile");
      hintAt(q(".gm-god"), "party", "god");
      hintAt(q(".gm-rep"), "party", "cred");
      var firstCard = q(".gm-party .gm-card");
      if (firstCard) hintAt(firstCard, "party", "card", true);
      hintAt(btnRow(s, "Export GM vault"), "party", "vault");
      hintAt(btnRow(s, "Load a demo table") || btnRow(s, "Or load a demo table"), "party", "demo");
      tips(s, "party", [["Add to party", "add"], ["From a file", "file"], ["From this browser", "browser"],
        ["Roll the god", "god"], ["−1", "credDown"], ["+1", "credUp"], ["Full sheet", "full"], ["Remove", "remove"],
        ["Export GM vault", "export"], ["Import", "importVault"], ["Load a demo", "demo"], ["Or load a demo", "demo"]]);
    } else if (key === "encounter") {
      hintAt(btnRow(s, "+ Party"), "encounter", "bar");
      var cb = q(".gm-cb .gm-pad");
      if (cb) hintAt(cb, "encounter", "hp");
      hintAt(btnRow(s, "Run it"), "encounter", "library");
      hintAt(q(".gm-diff"), "encounter", "difficulty");
      hintAt(q(".gm-morale"), "encounter", "morale");
      var order = q(".gm-init");
      if (order && helpOn() && order.children.length > 1) {
        var ho = hintEl("encounter", "order");
        if (ho) order.parentNode.insertBefore(ho, order);
      }
      tips(s, "encounter", [["+ Party", "party"], ["+ Ad-hoc", "adhoc"], ["Next turn", "next"], ["◀ Back", "back"],
        ["Reroll initiative", "reroll"], ["Roll NPC initiative", "npcInit"], ["Morale:", "morale"], ["Fled", "fled"],
        ["Reaction check", "react"], ["Save as template", "template"],
        ["End encounter", "end"], ["Run it", "run"]]);
    } else if (key === "rulings") {
      hintAt(q(".gm-picker"), "rulings", "picker", true);
      hintAt(q(".gm-react"), "rulings", "react");
      var cat = q(".gm-catalog");
      if (cat) cat.parentNode.insertBefore(hintEl("rulings", "catalog") || document.createTextNode(""), cat);
      tips(s, "rulings", [["Roll it secretly", "secret"], ["Roll the reaction", "react"]]);
    } else if (key === "npcs") {
      hintAt(btnRow(s, "+ Blank NPC"), "npcs", "make");
      var tpl = [].filter.call(s.querySelectorAll(".gm-strip"), function (x) {
        return /From a template/.test(x.textContent);
      })[0];
      if (tpl) hintAt(tpl, "npcs", "templates", true);
      var firstNpc = q(".gm-npc");
      if (firstNpc && helpOn()) { var hn = hintEl("npcs", "row"); if (hn) firstNpc.parentNode.insertBefore(hn, firstNpc); }
      tips(s, "npcs", [["+ Blank NPC", "blank"], ["+ Quick mook", "mook"], ["Improvise", "improvise"],
        ["Add to encounter", "addEnc"], ["Duplicate", "dup"], ["Delete", "del"]]);
    } else if (key === "clocks") {
      hintAt(btnRow(s, "+ 4-segment"), "clocks", "add");
      hintAt(q(".gm-clocks"), "clocks", "clock");
      hintAt(q(".gm-scratch"), "clocks", "scratch");
      tips(s, "clocks", [["+ 4-segment", "add4"], ["+ 6-segment", "add6"], ["+ 8-segment", "add8"],
        ["Stamp the time", "stamp"], ["×", "del"]]);
    } else if (key === "story") {
      hintAt(q(".st-dials"), "story", "dials");
      hintAt(q(".st-vision"), "story", "vision");
      hintAt(btnRow(s, "Expand everything"), "story", "expand");
      tips(s, "story", [["Roll for a vision", "vision"]]);
    } else if (key === "campaign") {
      hintAt(btnRow(s, "Use these settings"), "campaign", "use");
      tips(s, "campaign", [["+ New campaign", "newCamp"], ["Import", "importCamp"], ["Export this campaign", "exportCamp"],
        ["Use these settings", "use"]]);
    }
  }
  function renderCampaignGM(s) {
    if (T.renderCampaign) T.renderCampaign(s);
    else empty(s, "The campaign screen didn't load.");
  }

  /* ---------------------------------------------------------- dispatch --- */
  function renderStage(s, sec) {
    rememberMode("table");
    s.classList.add("gm");
    if (inDemo()) demoBanner(s);
    var fns = [renderParty, renderEncounter, renderRulings, renderNPCs, renderClocks, renderStory, renderCampaignGM];
    (fns[sec] || renderParty)(s);
    decorate(s, fns[sec] ? sec : 0);
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
        r2.appendChild(txt("span", "h", cb.hp == null ? "-" : cb.hp + "/" + cb.hpMax));
        list.appendChild(r2);
      });
      body.appendChild(list);
    } else {
      body.appendChild(txt("div", "gm-note", "No encounter running."));
    }

    var cur = ST ? sceneNow() : null;
    if (cur) {
      var stst = storyState();
      body.appendChild(txt("div", "gm-label", "Story"));
      var sr = el("div", "dos-row");
      sr.appendChild(stxt("span", "k", "S" + cur.session));
      sr.appendChild(stxt("span", "v", cur.title));
      body.appendChild(sr);
      var dr = el("div", "dos-row");
      dr.appendChild(txt("span", "k", "Doom"));
      dr.appendChild(txt("span", "v", doomCount(stst) + " / 7"));
      body.appendChild(dr);
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
    lock.title = HELP.dossier && HELP.dossier.hints.lock || "";
    body.appendChild(lock);
    if (helpOn()) { var lh = hintEl("dossier", "lock"); if (lh) body.appendChild(lh); }
    host.appendChild(body);
  }

  /* ================================================ SECTION 3, RULINGS  */
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
        "The ruling desk works without them, but the useful half is seeing each character's real modifier next to the DC.", "party");
    }

    /* Street Cred is already inside every Charisma number below, this is so
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
          "Use the picker above, it covers anything, and never says no match.");
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

  /* =================================================== SECTION 4, NPCS  */
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
        toast(n ? "Added " + count(n, "NPC", "NPCs") + " to stat up" : "Already have them all");
        redraw();
      }));
      pullRow.appendChild(txt("span", "gm-note", "Brings their names and notes over. You add the numbers."));
      s.appendChild(pullRow);
    }

    var all = npcAll().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    if (!all.length) { empty(s, "No NPCs yet.", "Start from a template, it's faster than a blank form.", "npcs"); return; }

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

    /* actions and traits, same editor, two lists */
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

    var notes = field(n.notes, "Prep notes, what they want, what they're hiding", put("notes"), "textarea");
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

  /* ============================================== SECTION 2, ENCOUNTER  */
  /* Ties are broken by `tie`, a rank a drag leaves behind, so a GM who drags
     the Rogue above the tied drone keeps that order; then by name. */
  function ordered(enc) {
    return (enc.combatants || []).slice().sort(function (a, b) {
      if (b.init !== a.init) return b.init - a.init;
      var ta = typeof a.tie === "number" ? a.tie : 1e6, tb = typeof b.tie === "number" ? b.tie : 1e6;
      if (ta !== tb) return ta - tb;
      return (a.name || "").localeCompare(b.name || "");
    });
  }
  /* Moves one combatant to position `to` in the order. It takes the
     initiative of whoever it now sits next to, and every tied group gets its
     ranks rewritten in on-screen order, so the drag is exactly what sorts. */
  function moveCombatant(enc, cid, to) {
    var list = ordered(enc);
    var from = -1;
    list.forEach(function (c, i) { if (c.cid === cid) from = i; });
    if (from < 0) return false;
    to = Math.max(0, Math.min(list.length - 1, to));
    if (to === from) return false;
    var item = list.splice(from, 1)[0];
    list.splice(to, 0, item);
    var nb = list[to - 1] || list[to + 1];
    if (nb) item.init = nb.init;
    var rank = {};
    list.forEach(function (c) {
      rank[c.init] = rank[c.init] || 0;
      c.tie = rank[c.init]++;
    });
    return true;
  }
  /* "Goblin B" and "Goblin" are the same kind of thing for a shared roll. */
  function kindOf(c) {
    return c.ref ? "ref:" + c.ref : "name:" + String(c.name || "").replace(/ [A-Z]$/, "");
  }
  /* One roll per kind of NPC, the way the book runs a pack: every Gutter
     Ganger acts on the same count. Party initiative is left alone, players
     roll their own. */
  function rollNpcInitiative(enc) {
    var lib = npcAll(), rolled = {};
    enc.combatants.forEach(function (c) {
      if (c.src === "pc") return;
      var k = kindOf(c);
      if (!(k in rolled)) {
        var n = c.ref ? lib.filter(function (x) { return x.id === c.ref; })[0] : null;
        rolled[k] = d20(n ? n.init || 0 : 0).total;
      }
      c.init = rolled[k];
      delete c.tie;
    });
    setTurn(enc, ordered(enc)[0]);
    return rolled;
  }

  /* Whose turn it is used to be an index into the list ordered() returns,
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
  /* Anyone who fled is skipped; if everyone has, the marker stays put. */
  function stepTurn(enc, delta) {
    var list = ordered(enc);
    if (!list.length) { enc.turnCid = null; return; }
    var cur = turnOf(enc);
    var i = list.indexOf(cur);
    if (i < 0) i = 0;
    var next = i;
    for (var tries = 0; tries < list.length; tries++) {
      next += delta;
      if (next >= list.length) { next = 0; enc.round = (enc.round || 1) + 1; }
      else if (next < 0) { next = list.length - 1; enc.round = Math.max(1, (enc.round || 1) - 1); }
      if (!list[next].fled) break;
    }
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
  /* A, B, C rather than 1, 2, 3, easier to say out loud mid-fight. */
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
        "Add the party, then drop in whatever they've walked into.", "encounter");
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
          delete c.tie;
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
    if (enc.combatants.some(function (c) { return c.src !== "pc"; })) {
      nav.appendChild(btn("Roll NPC initiative", "", function () {
        var kinds = 0;
        encPatch(function (e) { kinds = Object.keys(rollNpcInitiative(e)).length; });
        toast(kinds === 1 ? "One roll for the whole pack" : kinds + " rolls, one for each kind of foe");
        redraw();
      }));
    }
    nav.appendChild(btn(enc.morale ? "Morale: on" : "Morale: off", enc.morale ? "primary" : "", function () {
      encPatch(function (e) { e.morale = !e.morale; });
      redraw();
    }));
    ctl.appendChild(nav);
    s.appendChild(ctl);

    var diff = difficultyStrip(enc);
    if (diff) s.appendChild(diff);
    if (enc.morale) {
      var mor = moraleCard(enc);
      if (mor) s.appendChild(mor);
    }

    /* the order */
    var rows = el("div", "gm-init");
    list.forEach(function (cb, ix) {
      rows.appendChild(combatantRow(cb, cur && cb.cid === cur.cid,
        { ix: ix, count: list.length, morale: !!enc.morale }));
    });
    wireDrag(rows);
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

  /* ---- difficulty: the foes' XP against the party's budget ------------- */
  function crXp(cr) {
    var k = String(cr == null ? "" : cr).trim().replace(/^CR\s*/i, "");
    return Object.prototype.hasOwnProperty.call(G.xpByCr, k) ? G.xpByCr[k] : null;
  }
  function encounterDifficulty(enc) {
    var party = partyChars(), lib = npcAll(), levels = [];
    var pcs = enc.combatants.filter(function (c) { return c.src === "pc"; });
    if (pcs.length) {
      pcs.forEach(function (c) {
        var p = party.filter(function (x) { return x.rec.id === c.ref; })[0];
        levels.push(p ? Number(p.c.level) : NaN);
      });
    } else {
      party.forEach(function (p) { levels.push(Number(p.c.level)); });
    }
    levels = levels.filter(function (l) { return l >= 1; }).map(function (l) { return Math.min(20, Math.floor(l)); });
    var budget = [0, 0, 0];
    levels.forEach(function (l) { for (var i = 0; i < 3; i++) budget[i] += G.xpBudget[l][i]; });
    var xp = 0, uncounted = 0, foes = 0;
    enc.combatants.forEach(function (c) {
      if (c.src === "pc") return;
      foes++;
      var n = c.ref ? lib.filter(function (x) { return x.id === c.ref; })[0] : null;
      var v = n ? crXp(n.cr) : null;
      if (v == null) uncounted++; else xp += v;
    });
    var band = null;
    if (levels.length && foes) {
      band = xp <= budget[0] ? "Low" : xp <= budget[1] ? "Moderate" : xp <= budget[2] ? "High" : "Over High";
    }
    return { xp: xp, budget: budget, band: band, pcs: levels.length, foes: foes, uncounted: uncounted };
  }
  function fmtNum(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function difficultyStrip(enc) {
    var d = encounterDifficulty(enc);
    if (!d.foes) return null;
    var w = el("div", "gm-diff");
    var head = el("div", "gm-diff-head");
    head.appendChild(txt("span", "gm-label", "Difficulty"));
    if (!d.pcs) {
      head.appendChild(txt("span", "gm-note", "Import the party to see how hard this fight is."));
      w.appendChild(head);
      return w;
    }
    var tone = d.band === "Low" ? "signal" : d.band === "Moderate" ? "gold" : "alert";
    head.appendChild(txt("b", "gm-diff-band tone-" + tone, d.band));
    head.appendChild(txt("span", "gm-diff-xp", fmtNum(d.xp)));
    head.appendChild(txt("span", "gm-note", "XP"));
    w.appendChild(head);
    var top = Math.max(d.budget[2] * 1.25, d.xp, 1);
    var bar = el("div", "gm-diff-bar");
    var fill = el("div", "gm-diff-fill tone-" + tone);
    fill.style.width = Math.min(100, (d.xp / top) * 100) + "%";
    bar.appendChild(fill);
    ["Low", "Moderate", "High"].forEach(function (name, i) {
      var m = el("span", "gm-diff-mark");
      m.style.left = Math.min(100, (d.budget[i] / top) * 100) + "%";
      m.title = name + ": " + fmtNum(d.budget[i]) + " XP";
      bar.appendChild(m);
    });
    w.appendChild(bar);
    var legend = el("div", "gm-diff-legend");
    ["Low", "Moderate", "High"].forEach(function (name, i) {
      var k = el("span");
      k.appendChild(txt("span", null, name));
      k.appendChild(txt("b", null, fmtNum(d.budget[i])));
      legend.appendChild(k);
    });
    w.appendChild(legend);
    if (d.uncounted) {
      w.appendChild(txt("div", "gm-note", d.uncounted === 1
        ? "1 foe has no challenge rating and isn't counted."
        : d.uncounted + " foes have no challenge rating and aren't counted."));
    }
    return w;
  }

  /* ---- morale: half their side is down, the rest may not stay ---------- */
  var moraleRolls = {};
  function moraleState(enc) {
    var foes = enc.combatants.filter(function (c) { return c.src !== "pc"; });
    var down = foes.filter(function (c) { return c.dead || c.fled; }).length;
    var standing = foes.filter(function (c) { return !c.dead && !c.fled; });
    return { foes: foes.length, down: down, standing: standing,
             due: foes.length >= 2 && down * 2 >= foes.length && standing.length > 0 };
  }
  function rollMorale(enc) {
    var lib = npcAll(), out = {};
    moraleState(enc).standing.forEach(function (c) {
      var n = c.ref ? lib.filter(function (x) { return x.id === c.ref; })[0] : null;
      var wis = n && n.scores && typeof n.scores.Wis === "number" ? T.mod(n.scores.Wis) : 0;
      var r = d20(wis);
      out[c.cid] = { total: r.total, pass: r.total >= 10 };
    });
    moraleRolls = out;
    return out;
  }
  function setFled(cid, fled) {
    encPatch(function (e) {
      e.combatants.forEach(function (x) { if (x.cid === cid) x.fled = !!fled; });
      var active = turnOf(e);
      if (fled && active && active.cid === cid) stepTurn(e, 1);
    });
  }
  function moraleCard(enc) {
    var st = moraleState(enc);
    if (!st.due) return null;
    var box = el("div", "gm-morale");
    box.appendChild(txt("div", "gm-label", "Morale check"));
    box.appendChild(txt("p", null, "Half their side is down. Each foe still standing makes a DC 10 Wisdom save; on a failure they run or give up."));
    var go = row("gm-row");
    go.appendChild(btn("Roll morale", "primary", function () { rollMorale(liveEnc()); redraw(); }));
    box.appendChild(go);
    var any = false;
    st.standing.forEach(function (c) {
      var r = moraleRolls[c.cid];
      if (!r) return;
      any = true;
      var line = el("div", "gm-morale-line " + (r.pass ? "holds" : "fails"));
      line.appendChild(txt("b", null, c.name));
      line.appendChild(txt("span", "num", String(r.total)));
      line.appendChild(txt("span", null, r.pass ? "holds" : "breaks"));
      if (!r.pass) line.appendChild(btn("Fled", "tiny", function () { setFled(c.cid, true); redraw(); }));
      box.appendChild(line);
    });
    if (!any) box.appendChild(txt("div", "gm-note", "Nobody has rolled yet."));
    return box;
  }

  /* ---- drag to reorder, by pointer (mouse and touch) ------------------- */
  function wireDrag(rows) {
    [].forEach.call(rows.children, function (r, ix) {
      var grip = r.querySelector(".gm-grip");
      if (!grip) return;
      grip.addEventListener("pointerdown", function (ev) {
        if (ev.button != null && ev.button !== 0) return;
        ev.preventDefault();
        try { grip.setPointerCapture(ev.pointerId); } catch (e) {}
        r.classList.add("dragging");
        var kids = [].slice.call(rows.children);
        function slot(y) {
          for (var i = 0; i < kids.length; i++) {
            var b = kids[i].getBoundingClientRect();
            if (y < b.top + b.height / 2) return i;
          }
          return kids.length;
        }
        function mark(at) {
          kids.forEach(function (k, i) {
            k.classList.toggle("drop-before", i === at && at !== ix && at !== ix + 1);
            k.classList.toggle("drop-after", at === kids.length && i === kids.length - 1 && ix !== kids.length - 1);
          });
        }
        function move(e) { mark(slot(e.clientY)); }
        function done(e, cancel) {
          grip.removeEventListener("pointermove", move);
          grip.removeEventListener("pointerup", up);
          grip.removeEventListener("pointercancel", cancelled);
          kids.forEach(function (k) { k.classList.remove("drop-before", "drop-after", "dragging"); });
          if (cancel) return;
          var at = slot(e.clientY);
          var to = at > ix ? at - 1 : at;
          if (to === ix) return;
          var cid = r.getAttribute("data-cid");
          encPatch(function (enc) { moveCombatant(enc, cid, to); });
          redraw();
        }
        function up(e) { done(e, false); }
        function cancelled(e) { done(e, true); }
        grip.addEventListener("pointermove", move);
        grip.addEventListener("pointerup", up);
        grip.addEventListener("pointercancel", cancelled);
      });
    });
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
        // A template can be saved mid-fight, so every per-fight field resets,
        // temporary hit points included, which used to ride along forever.
        copy.combatants.forEach(function (c) {
          c.cid = uid("k"); c.hp = c.hpMax; c.tmp = 0; c.conds = []; c.dead = false; c.fled = false;
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

  function combatantRow(cb, isCurrent, pos) {
    pos = pos || {};
    var r = el("div", "gm-cb" + (isCurrent ? " on" : "") + (cb.dead || cb.fled ? " out" : "") + (cb.fled ? " fled" : ""));
    r.setAttribute("data-cid", cb.cid);

    var head = el("div", "gm-cb-head");
    if (pos.count > 1) {
      var grip = txt("button", "gm-grip", "⠿");
      grip.title = "Drag to change the order";
      grip.setAttribute("aria-label", "Drag to change the order");
      head.appendChild(grip);
    }
    head.appendChild(txt("div", "init", cb.init));
    var nameBox = el("div", "who");
    nameBox.appendChild(txt("div", "n", cb.name));
    var meta = cb.src === "pc" ? "player character" : cb.src === "adhoc" ? "ad-hoc" : "NPC";
    nameBox.appendChild(txt("div", "m", meta + " · AC " + cb.ac));
    head.appendChild(nameBox);
    if (pos.count > 1) {
      var mv = el("div", "gm-mv");
      var upB = btn("▲", "tiny", function () {
        encPatch(function (e) { moveCombatant(e, cb.cid, pos.ix - 1); }); redraw();
      });
      upB.title = "Move up in the order"; upB.setAttribute("aria-label", "Move up in the order");
      upB.disabled = pos.ix === 0;
      var dnB = btn("▼", "tiny", function () {
        encPatch(function (e) { moveCombatant(e, cb.cid, pos.ix + 1); }); redraw();
      });
      dnB.title = "Move down in the order"; dnB.setAttribute("aria-label", "Move down in the order");
      dnB.disabled = pos.ix === pos.count - 1;
      mv.appendChild(upB); mv.appendChild(dnB);
      head.appendChild(mv);
    }
    r.appendChild(head);

    /* hit points, updated in place. A full re-render here would blow away
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
      r.classList.toggle("out", !!cb.dead || !!cb.fled);
      var st = r.querySelector(".gm-cb-state");
      if (st) st.textContent = cb.fled ? "fled" : cb.dead ? "down" : "";
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
    r.appendChild(txt("div", "gm-cb-state", cb.fled ? "fled" : cb.dead ? "down" : ""));

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
    if (cb.fled) {
      tools.appendChild(btn("Back in", "tiny", function () { setFled(cb.cid, false); redraw(); }));
    } else if (pos.morale && cb.src !== "pc") {
      tools.appendChild(btn("Fled", "tiny", function () { setFled(cb.cid, true); redraw(); }));
    }
    tools.appendChild(btn("Remove", "tiny", function () {
      encPatch(function (e) {
        // If the one leaving is the one acting, hand the turn to the next in
        // order first, otherwise the marker lands on whoever happens to shift
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

  /* ================================================== SECTION 5, CLOCKS */
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
        "Good first ones for Cathedra: “The Cantor notices you”, “House Thorn calls the debt”, “The god turns its head”.", "clocks");
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
            if (c.filled >= c.seg) toast(c.name + ", it lands.");
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
    repSkillBonus: repSkillBonus, reactionBand: reactionBand, npcReaction: npcReaction,
    importVault: importVault, loadDemo: loadDemo, exitDemo: exitDemo, inDemo: inDemo,
    storyState: storyState, rollVision: rollVision, storyStartClocks: storyStartClocks,
    storyAddNpcs: storyAddNpcs, cleanStory: cleanStory, help: HELP,
    walkState: walkState, showWalk: showWalk, storyPatch: storyPatch,
    moveCombatant: moveCombatant, rollNpcInitiative: rollNpcInitiative, stepTurn: stepTurn,
    encounterDifficulty: encounterDifficulty, moraleState: moraleState, rollMorale: rollMorale, crXp: crXp
  };
})();
