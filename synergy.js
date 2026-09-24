/* synergy.js, which classes are worth standing next to.
 *
 * window.TTSY, plain data, read by both halves of the application. It lives in
 * its own file rather than in gm.js because a player choosing a class now sees
 * a preview of what that class pairs with, and gm.js is a file a player never
 * otherwise needs, the GM tools are unlocked by an address most visitors will
 * never type.
 *
 * Schema:
 *   roles       the six jobs a crew wants covered
 *   classRoles  class name -> one or two of roles
 *   crewTiers   how much of the board a party covers, by distinct role count
 *   pairs       {id, name, pair:[a,b], line, effect} plus `wired` on the one pair that
 *               is an actual number rather than a line to read at the table
 *
 * The Street Cred bands and the NPC reaction table stay in gm.js. They are the
 * GM's state, not a thing a character sheet knows about.
 */

window.TTSY = {

  /* ------------------------------------------------------------- synergies --
     Two layers, because 21 classes make 210 pairs and nobody wants to read
     that many. A short list of named pairs carries the flavour; the role tags
     underneath it mean a party of classes nobody thought to pair still gets
     told what it covers and what it doesn't.

     Roles are assigned from what a class actually does, its primary ability,
     its saves, its skill list, not from what its name sounds like. Four
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
       and Stealth, a survivor who gets in and out, not a caster. */
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

  /* Named pairs. Only one of these is wired into a number, see ambushTeam()
     in the code half. The rest are lines to read at the table when both of
     them are in the room, which is the whole point: the party notices its own
     composition without the sheet doing arithmetic about it.                */
  pairs: [
    { id: "ambush-team", name: "Ambush Team", pair: ["Ranger", "Rogue"],
      effect: "+1 initiative to both.",
      line: "Two scouts who call the opening move together.",
      wired: "Applied automatically on the GM's screens." },
    { id: "shield-wall", name: "Shield Wall", pair: ["Fighter", "Paladin"],
      effect: "+1 AC against melee attacks while the two stand next to each other.",
      line: "Two front-liners holding the same door. Be generous about cover when they stand together." },
    { id: "chain-of-custody", name: "Chain of Custody", pair: ["Cleric", "Paladin"],
      effect: "Advantage on Persuasion with clergy, House officials and the law. Once a session, a chapel or a House shelters them for a night, no questions asked.",
      line: "Faith and law recognise their own. Institutions vouch for this pair, or shelter them." },
    { id: "signal-and-steel", name: "Signal and Steel", pair: ["Bard", "Barbarian"],
      effect: "When the Barbarian drops a creature, the Bard can use a reaction to give one ally a d6 inspiration die. Once per short rest.",
      line: "A hype-man and a wrecking ball. The crowd remembers the show, not the damage." },
    { id: "ghost-protocol", name: "Ghost Protocol", pair: ["Rogue", "Wirewalker"],
      effect: "On a job both of them work, the first security, alarm or Perception check made against them is at disadvantage.",
      line: "The physical break-in and the digital one happen the same night. Alarms built for one miss the other." },
    { id: "trauma-team", name: "Trauma Team", pair: ["Streetdoc", "Chromehound"],
      effect: "Downtime recovery takes half as long for both. The Streetdoc's healing on the Chromehound restores 2 extra hit points.",
      line: "The Streetdoc keeps the chrome running past what the flesh under it should survive. Downtime recovery goes faster for both." },
    { id: "the-pitch", name: "The Pitch", pair: ["Fixer", "Firebrand"],
      effect: "Advantage on the first Persuasion or Deception check of any negotiation both of them attend.",
      line: "One knows who to talk to. The other makes them want to listen. A job neither lands alone." },
    { id: "last-rites", name: "Last Rites", pair: ["Cleric", "Bioforged"],
      effect: "While the Cleric is within 30 feet, the Bioforged has advantage on saves against its own Humanity-state effects.",
      line: "The Cleric already talks to what used to be human. The Bioforged, still becoming something else, finds that more comforting than most patients do." },
    { id: "puppet-show", name: "Puppet Show", pair: ["Puppeteer", "Bard"],
      effect: "Once per combat, the Bard can cast a spell as if standing where one of the Puppeteer's drones is.",
      line: "A drone that can also lie for a living. Crowd control and misdirection, layered." },
    { id: "dead-reckoning", name: "Dead Reckoning", pair: ["Stackborn", "Rogue"],
      effect: "Once per long rest, when one of them drops to 0 hit points while the other can see them, they drop to 1 instead.",
      line: "Someone who has died before, and someone who plans not to. Close calls read like a checklist." },
    { id: "artificers-familiar", name: "Artificer's Familiar", pair: ["Artificer", "Druid"],
      effect: "Each one's companions (drone, beast or homunculus) get +1 AC and 5 extra hit points.",
      line: "Whichever companion the job needed this week, gears or claws, one of these two brought it." },
    { id: "warband", name: "Warband", pair: ["Barbarian", "Fighter"],
      effect: "When both hit the same creature in the same round, the second hit deals an extra 1d4 damage.",
      line: "Two front-liners who have fought beside each other before swing like they know where the other's blow is going." },
    { id: "cloak-and-dagger", name: "Cloak and Dagger", pair: ["Warlock", "Fixer"],
      effect: "Once a session, they can ask the GM one question about a person or faction and get a true answer.",
      line: "A patron's secrets and a fixer's contacts. Very little in the city stays hidden from these two." },
    { id: "field-repair", name: "Field Repair", pair: ["Artificer", "Chromehound"],
      effect: "Cyberware repairs take half the downtime and cost half as much.",
      line: "Chrome breaks, and the Artificer understands why. Cyberware repairs cost half the usual downtime with both present." },
    { id: "second-skin", name: "Second Skin", pair: ["Bioforged", "Monk"],
      effect: "Once per short rest, each of them can reduce the damage from one hit by 1d8.",
      line: "A body that grows what it needs, a mind that has stopped needing a body at all. Damage that should slow either one down mostly doesn't." },
    { id: "choir", name: "Choir", pair: ["Cleric", "Firebrand"],
      effect: "Advantage on Performance and Persuasion in front of a crowd. Once a session, a crowd does one thing they ask.",
      line: "Two very different congregations. Both of them do what these two ask." },
    { id: "countermeasure", name: "Countermeasure", pair: ["Wizard", "Wirewalker"],
      effect: "Advantage on checks to get past wards, locks or security, arcane or digital, when both work on it together.",
      line: "Arcane theory and network theory rhyme. Warded doors, locked ports, one of these two has seen the trick before." },
    { id: "wild-current", name: "Wild Current", pair: ["Sorcerer", "Puppeteer"],
      effect: "Once per long rest, the Sorcerer can cast a spell as if standing where one of the Puppeteer's drones is.",
      line: "Raw power and remote hands. Neither has to explain what the other needed done." }
  ]
};
