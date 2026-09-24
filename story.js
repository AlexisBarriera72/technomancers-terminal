/* story.js, "The Fourth Minute", a campaign for Cathedra. GM EYES ONLY.
 *
 * window.TTST, plain data read by gm.js's Story tab. Bundled with the GM tools
 * by choice, which means it is public in the site's source like the unlock
 * token: it keeps the story out of a player's way, not out of a determined
 * player's hands.
 *
 * Shape: reference sections first (the truth, how to run the doom, the
 * visions, the Eye-chrome, loop scars, the Hush, the cast, random tables, the
 * off-script kit, the endings), then acts, each holding scenes. Every scene
 * carries the same categories, so the tab can draw them all the same way:
 *
 *   id, act, session, level, title, place, truth, readAloud[], hooks{role},
 *   questions[{q,a,keystone?}], notAsked[{if,then,recover}],
 *   missed[{detail,means,ifMissed}], right[{call,result,lead,salvage,feed}],
 *   wrong[{call,result,lead,salvage,feed,doom?}], goesWrong[],
 *   checks[{what,skill,dc}], echoes[{beat,text,clue}], fixedEcho?,
 *   scars[], cred[{event,delta}], clocks[{id,name,seg}],
 *   npcs[{id,name,template,role,notes}], fragment{n,ways[]}?, keystones[],
 *   eyeChrome?
 *
 * feed is one of "mercy", "violence", "lies", "questions". dc is a number on
 * the Ruling desk's ladder (5 trivial · 10 easy · 15 moderate · 20 hard ·
 * 25 extreme · 30 near-impossible).
 */

var TTST = window.TTST = {
  title: "The Fourth Minute",
  pitch: "The crew fail a job, see the end of Cathedra, and spend twelve sessions trying to stop it. " +
         "Every attempt helps it happen. The help they thought came from the gods came from themselves.",
  sessions: 12,
  levels: [3, 12],
  startCred: -3,

  /* ================================================================ THE TRUTH */
  truth: [
    { h: "The one-sentence version",
      t: "The god is not dying, it is asleep and pregnant with itself; the Hush have sung it asleep for nine hundred years; " +
         "the crew see its birth in a stolen vision, and every move they make to stop the birth is one of the reasons it happens." },
    { h: "What the god is",
      t: "It fell nine hundred years ago, but it did not fall to die. It came down to be born again, the way some things " +
         "in the old stories burn to become something else. The Houses think the bone heals because gods are hard to kill. " +
         "The bone heals because it is growing. The warm thing the Marrowworks drill hit is not a wound. It is the new god's hand." },
    { h: "What the Hush have been doing",
      t: "A secret order inside the Cantor's voice-tenders. Nine hundred years ago the first of them learned that a lullaby " +
         "carried through water keeps the god dreaming. Every pipe in Cathedra carries it: under the noise of the taps, " +
         "a hymn with no words. Anyone who sees the god's future wakes it a little, a seer is an alarm clock, so the " +
         "Hush quietly kill seers. They look like a death cult. They are the only reason the city exists." },
    { h: "What the Eye is",
      t: "The god's own eye, frozen open, still tracking. It shows what is true and has not happened yet. Nobody knows it " +
         "also receives: something strong enough, standing in front of it at the end of the world, can send a picture back " +
         "down the line of time. That is what the crew's future selves do." },
    { h: "The loop",
      t: "In the ruins after the birth, the surviving crew find the Eye still open. They realise what it can do and send " +
         "their past selves visions: warnings, directions, help. They have done this before. Many times. Every loop, the " +
         "help they send is a little different, and every loop, the help is part of how it happens again. The first vision " +
         "they ever sent was the Fourth Minute. The crew believe the visions are gifts from the gods. They are gifts from themselves." },
    { h: "The Fourth Minute",
      t: "This season the Eye showed four petitioners the same minute: the end of the city. The fourth petitioner was " +
         "Archdeacon Uln Sarrow of House Reliquary. Frightened, he did something no Archdeacon had done: he recorded it, " +
         "in a shard of the Eye's cornea, to study it and find a way to stop it. The Hush learned the shard exists. A recording " +
         "is a seer that never dies. They hired the crew to steal it so they could destroy it." },
    { h: "Why there is no villain",
      t: "Everyone in this story is trying to stop the end. The Hush sing. The Archdeacon studies. House Thorn keeps its " +
         "ledger. Mother Slate keeps her word. The crew chase the vision. Every one of those efforts is a load-bearing part of " +
         "the fall. Do not play anyone as evil. Play everyone as right about something, and the tragedy does the rest." },
    { h: "Timeline",
      t: "900 years ago: the god comes down. ~880 years ago: the first Hush sing. This spring: the Eye shows four petitioners " +
         "the same minute; the Archdeacon records his. Session 1: the heist. Sessions 2–3: the Hush hunt the crew and the " +
         "other petitioners. Sessions 4–6: the crew ask around. Session 7: the Choir-house. Session 8: the pilgrimage. " +
         "Session 9: the Eye. Session 10: the last lullaby. Session 11: the birth. Session 12: the Sending." },
    { h: "What the players must never be told early",
      t: "That the visions come from themselves. That the Hush are keeping the city alive. That the fall is a birth. Let them " +
         "find all three. Plant clues honestly; if they work it out, reward them (that is keystone k11), and let the loop get smarter." }
  ],

  /* ======================================================== RUNNING THE DOOM */
  running: [
    { h: "The rule you are not allowed to break",
      t: "Cathedra falls. However well they play, however badly. The only exception is the 1% path below. " +
         "When a scene would stop a fragment coming true, it comes true by its other route, usually because " +
         "someone else was trying to fix the same problem. Never tell them this is the rule." },
    { h: "Doom (seven fragments)",
      t: "The Fourth Minute has seven images in it. Each completes once, in some scene, by one of at least two routes. " +
         "Tick them on this tab as they happen. When all seven are ticked, the birth begins, whatever session it is. " +
         "If they are ahead of schedule, let it land early, nothing frightens a table like the prophecy being faster than the plot." },
    { h: "Salvage (what their play decides)",
      t: "Salvage is who gets out. Add it when they ask the right question, catch a detail, make a right call or save someone " +
         "the story didn't expect them to; take it away for the opposites. Every scene suggests amounts. Most scenes swing 1–4. " +
         "At the end, Salvage picks the epilogue band: 0–5 Ash, 6–11 Embers, 12–17 Exodus, 18 and up Witnesses." },
    { h: "Feed (what the newborn god learns from them)",
      t: "The god is born remembering them. Each right or wrong call feeds it one of four things: mercy, violence, lies or " +
         "questions. Whichever is highest at the birth is what it becomes. A god that learned questions is the kindest outcome; " +
         "a god that learned lies is the worst, because it will be very good at them." },
    { h: "The 1% path (twelve keystones)",
      t: "Twelve keystones are listed on this tab. Each is a decision so specific that almost no table makes all of them. " +
         "Mark each kept or broken as it happens. If all twelve are kept at the Sending, the birth happens without the fall: " +
         "the god leaves the ribs like a moth leaving a cocoon, and Cathedra survives, godless. One broken keystone closes " +
         "the path for good. Do not reopen it out of kindness; the players will find out how close they came, and that is the kindness." },
    { h: "Omens and scars",
      t: "When a keystone is kept, show a small omen: something in the city goes right for no reason. When one is broken, " +
         "put a loop scar somewhere they will find it. Never explain either. Attentive players will start reading the city." },
    { h: "Street Cred is the redemption",
      t: "They start at −3, Bad paper. Their climb out of it is the visible story of their redemption, and it should be possible " +
         "to reach +6 or more by the birth. Scenes list Cred events. Note that clearing debts raises Cred (Cathedra's rule) " +
         "and also completes fragment 4. Doing right by the city and doing right by the prophecy are not the same thing." },
    { h: "Pacing twelve sessions",
      t: "One level a session, 3 to 12 (they reach 12 at the last lullaby). Each session is written as one scene with room to " +
         "breathe. If a session runs short, pull from the random tables or the side threads in each scene's 'When it goes wrong'. " +
         "If it runs long, the Doom clock can do the cutting for you." }
  ],

  fragments: [
    { n: 1, image: "The Eye weeps.",
      gm: "The cornea shard cracks on the chapel steps. Fixed: happens in session 1 no matter what." },
    { n: 2, image: "The Cantor misses a note.",
      gm: "The lullaby falters. Route A: the crew kill Hush singers. Route B: the crew expose the Hush and the Houses purge them. " +
          "Route C (session 10): the last lullaby fails with or without them." },
    { n: 3, image: "The Marrowworks bleeds light.",
      gm: "Route A: the crew stop the drilling to spare the warm thing, and the new god's hand closes. Route B: the Houses learn " +
          "what it is and drill deeper to finish it; the hand opens around the drill." },
    { n: 4, image: "Thorn's ledger burns.",
      gm: "Every favour on the book is a nail in the coffin. Route A: the crew clear their debts (it looks like redemption). " +
          "Route B: they burn the ledger to save a rib from foreclosure." },
    { n: 5, image: "The Spine snaps.",
      gm: "Route A: they evacuate people by the lifts and the Spine takes more weight than it ever has. Route B: they sabotage " +
          "it to stop the pilgrimage or a Hush strike team. Route C: the Hush cut it themselves to stop the pilgrims' prayer reaching the god." },
    { n: 6, image: "The Eye closes.",
      gm: "Route A: the crew blind the Eye to stop the visions. Route B: Archdeacon Sarrow seals it with a reliquary shroud " +
          "to stop the panic. Either way, the god has to open a new one." },
    { n: 7, image: "Four figures in the ruins. One holds the Eye.",
      gm: "The birth and the Sending. Fixed. The figures are the crew. If the party is not four, the image has as many figures as there are of them." }
  ],

  keystones: [
    { id: "k1", scene: "s1", name: "Clean hands",
      keep: "Nobody dies during the heist: no guard, acolyte or bystander.",
      omen: "The chapel moths follow them out and scatter into the rain instead of dying against the lamps.",
      scar: "Days later, a Reliquary memorial candle carries one of their names, spelled the way only they spell it." },
    { id: "k2", scene: "s2", name: "Ask the second voice",
      keep: "Someone asks Ketch's second voice who sent the vision. (It answers: “You did. You always do.”)",
      omen: "Ketch sleeps through the night for the first time in years.",
      scar: "Ketch's second voice starts humming a tune one of the players hums." },
    { id: "k3", scene: "s3", name: "Talk first",
      keep: "They speak to a Hush agent, and listen, before anyone draws on one.",
      omen: "The next tap they turn on runs clean and warm, and they hear three bars of a lullaby under the water.",
      scar: "A Hush death-notice with their names already on it, dated next month." },
    { id: "k4", scene: "s4", name: "Let it bleed",
      keep: "They neither stop the drilling nor wound the warm thing. They seal the breach and leave it be.",
      omen: "Brother Cobb's drill crew hear the bone creak like a sleeper turning over, and then nothing.",
      scar: "A second warm breach opens in a shaft nobody has drilled for a century." },
    { id: "k5", scene: "s5", name: "The right question",
      keep: "Someone asks the Cantor a question that shows they suspect a loop, best of all, “What did we ask you last time?”",
      omen: "The lifts arrive when they are called, not before, for a whole day.",
      scar: "The Cantor answers a question nobody asked: “The same thing as always.”" },
    { id: "k6", scene: "s6", name: "Stay on the book",
      keep: "They leave their debts on House Thorn's ledger and save the foreclosed rib some other way.",
      omen: "Ser Ambrel Dace, for once, raises her voice, to laugh.",
      scar: "A page of the ledger turns up in the Gullet with their names crossed out in their own hands." },
    { id: "k7", scene: "s7", name: "Spare the Choirmaster",
      keep: "Choirmaster Wren Aldous leaves the Choir-house alive.",
      omen: "Every tap in the district plays a single clear note at dawn.",
      scar: "A brass voice-box in a Gullet stall, still warm, for sale." },
    { id: "k8", scene: "s8", name: "Ropes, not rails",
      keep: "They get the pilgrims down by rope, net and the ribs themselves, and keep them off the Spine.",
      omen: "A rope holds that should not have. Somebody's grandmother says she had a feeling.",
      scar: "The snapped Spine cable, when they find it, is tied in a knot one of them always ties." },
    { id: "k9", scene: "s9", name: "Leave it open",
      keep: "They do not blind the Eye, and they stop Reliquary sealing it.",
      omen: "The Eye, for a moment, looks at them and not through them.",
      scar: "A second shard of cornea in the Archdeacon's safe, already labelled in their handwriting: “the Fifth Minute”." },
    { id: "k10", scene: "s10", name: "Sing with them",
      keep: "They join the Hush's last lullaby instead of guarding the doors or fighting.",
      omen: "The birth, when it comes, starts slow enough to walk out of.",
      scar: "Nine hundred and one voices in the Cantor, and one of them is theirs." },
    { id: "k11", scene: "any", name: "Name the sender",
      keep: "Before the finale, a player says aloud, in character, that the visions come from themselves or from the future.",
      omen: "The next vision is a little clearer than it should be, as if someone knows they are listening.",
      scar: "Their future selves' next vision is shorter, and angrier." },
    { id: "k12", scene: "s12", name: "Send it true",
      keep: "At the Sending, they send back exactly the visions they received, in order. (The echo log on this tab is your check.)",
      omen: "There is no omen. There is only the moth.",
      scar: "There is no scar. There is only the next loop." }
  ],

  /* ============================================================== THE VISIONS */
  visions: [
    { h: "What they think is happening",
      t: "Divine favour. Cathedra's own rule (one in twenty, something looks up) gives them the perfect explanation, and the " +
         "visions are lit like god-light: gold, from above, smelling of warm bone. Let them build theology on it." },
    { h: "What is happening",
      t: "Every vision is sent by one of the crew, from the ruins, through the Eye. The future selves are tired, scarred and " +
         "doing their best. Each vision hides a clue to that: a pet phrase, their handwriting, a scar the character doesn't have yet." },
    { h: "Rolling for a vision",
      t: "Each scene marks its key moments. At one, roll a d20 (the button on this tab does it): on a 17 or higher, a random " +
         "party member sees that scene's vision. If someone at the table owns the Eye-chrome, it is 16 or higher. " +
         "Say it happens to the chosen player privately (a note, a whisper, a text), then let them decide what to tell the others." },
    { h: "The three fixed visions",
      t: "Session 1 (the Fourth Minute, everyone), session 7 (the Choir-house, whoever is closest to the Choirmaster) and " +
         "session 12 (the Sending, everyone, from the other side). Fixed visions cost 1 Humanity each and leave a Remnant " +
         "(Cathedra's rule). Random visions cost nothing." },
    { h: "Keeping the log",
      t: "Every vision rolled here is logged. Keep it honest: keystone k12 asks the players to send back exactly what they " +
         "received, and the only way to check is what you actually gave them." }
  ],

  eyeChrome: {
    name: "The Lidless",
    what: "A bone-carved optic cut from the lash-bone of the Eye. Installs as second-hand chrome: +2 Humanity and a Remnant " +
          "(it does not blink, and neither, slowly, does its wearer). Never hand it to them. It turns up by luck, or they buy it " +
          "without knowing what it is.",
    effects: [
      "Visions come on a 16 or higher instead of 17, slightly better, not much.",
      "Once a session, whisper its wearer one detail a minute before it happens.",
      "On consecrated ground it goes dark, like all chrome, but it keeps tracking.",
      "The Hush want it back, and will trade a great deal for it. Any Hush agent who sees it stops fighting to look."
    ],
    chances: [
      { where: "A Gullet stall (session 2 or later)",
        how: "When a player shops for any optic in the Gullet, roll a d20. On 18+, the stall has “an old eye, very cheap, doesn't blink” for 12,000 grams." },
      { where: "Dr. Maret Vhoss's back room (session 4 or later)",
        how: "If they have done Vhoss a kindness, she mentions a piece she won't install in anyone she likes. It costs a favour on the book." },
      { where: "A dead Hush tender (session 3 or 7)",
        how: "If they kill a Hush tender, roll a d6: on a 6 it was carrying the Lidless to bring home. A cruel way to find it." },
      { where: "A Reliquary auction lot (session 9)",
        how: "Lot 41 at the Reliquary's quiet sale, catalogued as “ocular relic, provenance lost”. Outbid House Thorn, or steal it." },
      { where: "A corpse in the ruins (session 12)",
        how: "One of the future selves' bodies wears it. The last chance, and the worst way to learn what it is." }
    ]
  },

  /* ============================================================== LOOP SCARS */
  scars: [
    "A corpse in the Gullet's ossuary wearing one of the crew's chrome, carved from the same bone, keyed to the same body.",
    "Graffiti on a Marrowworks shaft wall in one player's handwriting: DON'T STOP THE DRILL.",
    "The Cantor: “You asked me that last time.” It will not say when last time was.",
    "Pell's drawings of the four figures in the ruins. One of them has a crew member's exact scar.",
    "A lift operator greets them by name and asks how the last run went. They have never met.",
    "A Hush death-notice with their names on it, dated a month from now, in handwriting that is not a Hush scribe's.",
    "A choir coin with teeth marks that match a player's habit of biting coins.",
    "Mother Slate's wax ledger has their job in it twice. The first entry is in a different colour of wax, and older.",
    "A page of House Thorn's ledger with their names crossed out in their own hands.",
    "In the Eye's reflection, for a second, there are two of each of them."
  ],

  /* ================================================================== THE HUSH */
  hush: [
    { h: "Who they are",
      t: "Around forty voice-tenders inside the Cantor's service, and perhaps two hundred more who don't know what they are " +
         "part of: plumbers, bath-keepers, well-singers. They keep the lullaby going through the water, in shifts, forever." },
    { h: "Choirmaster Wren Aldous",
      t: "Seventies, a brass voice-box where her throat was, has not slept a full night in fifty years because someone has " +
         "to be singing. Kind, exhausted, merciless about seers. She hired the crew through Slate, and she is the one who has " +
         "to order their deaths when they see the vision. She hates it. She does it." },
    { h: "How they kill",
      t: "Quietly. A 'quieter' sings one note through a pipe near a seer's head while they sleep, and the seer does not wake. " +
         "In the open they carry pipe-knives and sing to make locks forget they were locked. They never kill anyone who hasn't " +
         "seen the future. That restraint is the first clue that they are not monsters." },
    { h: "What changes their mind",
      t: "Proof that killing the crew will not stop the waking (the loop scars are proof, if the crew have noticed them). " +
         "The Lidless returned. The crew singing with them. The Choirmaster alive to hear the argument." },
    { h: "What they get wrong",
      t: "They think the god is dying and the lullaby is mercy. It is a birth, and the lullaby is holding it back. They are " +
         "right that it must not wake yet; they are wrong that it can be stopped. Nobody told them either." }
  ],

  /* ==================================================================== CAST */
  cast: [
    { name: "Mother Slate", role: "Fixer, the Marrowworks · the cutout",
      notes: "Took the job for a client who paid in choir coins, which she has never seen a living person spend. Her reputation " +
             "burns with theirs after session 1. She is the first person they have to make it right with. She will not name the client " +
             "until she is sure the crew aren't going to get her killed, then she will, and it will be the most useful thing anyone says to them." },
    { name: "Ketch", role: "Wirewalker · the second voice",
      notes: "Finds the crew unconscious on the chapel steps and drags them to the Gullet. Ketch's second voice is the god dreaming; " +
             "it knows their names because it has met them in every loop. It answers questions Ketch was not asked, and occasionally " +
             "questions the crew have not asked yet." },
    { name: "Choirmaster Wren Aldous", role: "The Hush",
      notes: "See the Hush. Wants the crew dead and wishes they weren't. The best ally they could have, if they reach her before they hurt her." },
    { name: "Tallow", role: "Hush quieter",
      notes: "Polite, young, sings beautifully, and is the one sent to kill them in session 2. Says sorry before and after. If spared, " +
             "becomes the Hush's reluctant go-between." },
    { name: "Archdeacon Uln Sarrow", role: "House Reliquary · the fourth petitioner",
      notes: "Saw the Fourth Minute himself and recorded it to study it. Not a villain: a frightened man with a great deal of money " +
             "trying to fix the end of the world. His fix, in session 9, is to seal the Eye." },
    { name: "Ser Ambrel Dace", role: "House Thorn, collections",
      notes: "Collecting the Reliquary's damages from the crew from session 2. Never raises her voice. The debts she collects are the " +
             "nails in the god's coffin, though she doesn't know it; she simply believes a city runs on promises kept." },
    { name: "Dr. Maret Vhoss", role: "Bone-carver, unlicensed",
      notes: "Patches the crew after the fall and in every act afterwards. Knows bone better than the Houses do, and is the first " +
             "person to say out loud that the bone isn't healing, it's growing." },
    { name: "Ines Varro", role: "Lift operator, the Sevenfold Spine · second petitioner",
      notes: "Saw the Spine snap. Has quietly stopped taking passengers above the seventh rib. The Hush are coming for her in session 3." },
    { name: "Brother Cobb", role: "Drill foreman, the Marrowworks · third petitioner",
      notes: "Saw the Marrowworks fill with light. His crew hit the warm thing. He has been paid three times to keep quiet and has kept none of the money." },
    { name: "Pell", role: "A Gullet child, about ten · first petitioner",
      notes: "Saw four figures in the ruins, and draws them, over and over. The drawings get better. They start to look like the crew." },
    { name: "The Cantor", role: "The choir-engine",
      notes: "Nine hundred voices. One question per petitioner per year: truthful, not useful. It remembers every loop, and cannot say so directly." }
  ],

  /* ============================================================ RANDOM TABLES */
  tables: [
    { id: "rumours", name: "Street rumours about the crew", die: 12,
      note: "Roll when they walk into a bar, a lift or a crowd. Use the first half if Street Cred is below zero, the second if above.",
      rows: [
        "“They sold the Reliquary vault to House Thorn. Ask Dace who paid her damages.”",
        "“One of them fell asleep on the chapel steps like they'd been shot. Faking, if you ask me.”",
        "“Slate's done with them. Slate's never done with anyone.”",
        "“They say the Eye looked at them. Nobody the Eye looks at lasts the year.”",
        "“Don't drink the water near them. Things in the pipes follow them home.”",
        "“They owe Thorn a tooth apiece. I've seen the ledger.”",
        "“They got Brother Cobb's crew out alive. Nobody got anyone out of the Marrowworks alive.”",
        "“The Cantor answered one of them twice. It doesn't do that.”",
        "“They're the ones who saw it. The end. And they're still trying.”",
        "“Lift operators hold cars for them now. Operators don't hold cars for Houses.”",
        "“Dace laughed at something one of them said. Dace doesn't laugh.”",
        "“They're going to be the reason we get out. Or the reason we don't. Nobody's sure which.”"
      ] },
    { id: "reprisals", name: "Hush reprisals", die: 8,
      note: "Roll when the crew hurt the Hush, or simply at the end of any session where they were loud about the vision.",
      rows: [
        "Every tap in their safehouse runs cold and silent for a day. The silence is worse.",
        "A quieter sings outside a window at 3 a.m. Wisdom save, DC 14, or no benefit from the long rest.",
        "A friendly NPC they told about the vision stops answering. Found asleep; will not wake. The Hush say it was mercy.",
        "Their lift stops between ribs for an hour while someone hums in the cable housing.",
        "A choir coin under each of their pillows. A warning, and a payment for a job they haven't been offered yet.",
        "Mother Slate receives a death-notice with their names. She passes it on, which is either loyalty or advice.",
        "The Hush flood the Gullet stall that sold them something. The stall-holder blames them loudly.",
        "Tallow turns up to apologise in advance. Then leaves. Then the pipes start singing."
      ] },
    { id: "omens", name: "Omens of the waking", die: 10,
      note: "Roll between scenes. Read rows 1–4 if Doom is 0–2, rows 4–7 if Doom is 3–4, rows 7–10 if Doom is 5 or more.",
      rows: [
        "Moths come indoors all across one rib, all facing the same way.",
        "Chrome carved from the same bone twitches together, city-wide, for one second.",
        "Warm water comes out of the cold taps and smells of milk.",
        "The lifts arrive before they are called. Everyone has stopped mentioning it.",
        "A district's bones creak at night like a building settling, except it is the building that is new.",
        "Children in three ribs draw the same four figures on the same day.",
        "The Cantor sings a note that is not in its range, and nine hundred voices apologise.",
        "The ribs flex. Everyone standing loses their footing at once. Nobody is hurt; everyone is afraid.",
        "The Eye's pupil dilates, like someone stepping from light into dark.",
        "For a whole minute, every heartbeat in Cathedra keeps time with something much larger."
      ] },
    { id: "gullet", name: "Gullet encounters", die: 10,
      note: "Roll when they cut through the undercity market.",
      rows: [
        "A seller of second-hand chrome whose stock twitches toward the Marrowworks.",
        "Pell, drawing on a wall, who says “you again” and doesn't explain.",
        "Two Thorn collectors arguing about whether a debt dies with the debtor. Dace's rule says no.",
        "A shrine with a pilgrim's mask for sale. Wearing it on holy ground is a crime; owning it is not.",
        "A bath-keeper humming the lullaby, who stops when she sees them look.",
        "Ketch, eating noodles, whose second voice orders for them before they sit down.",
        "A fight over an ichor ampule. Whoever wins will be sick for a week.",
        "A Reliquary acolyte selling rented Humanity buffers out of a coat. Two weeks' grace on missed payments.",
        "A lift operator off shift who will trade a secret for a drink.",
        "Someone selling tickets to the Eye's last minutes. Forgeries. Probably."
      ] }
  ],

  /* =========================================================== OFF-SCRIPT KIT */
  offScript: [
    { h: "They skip a scene",
      t: "Nothing in this story is a gate. Move the scene's clue to the next NPC they talk to, and let its fragment come true " +
         "by its other route, offstage, reported as news. Skipped scenes cost Salvage (−2), never the plot." },
    { h: "They try to leave the city",
      t: "Cathedra is the inside of a corpse. The only way out is the Spine's top stop and a year's walk across the god's weather. " +
         "Let them try: the weather turns them back, or the Hush meet them at the stop, or the vision comes again on the road. " +
         "If they truly insist, the birth comes to them, the ribs open above the road." },
    { h: "They attack the wrong person",
      t: "They will; that is the story. Let the fight happen and the cost land (Doom via the relevant fragment, Salvage down, " +
         "Feed violence). Then have someone who liked the victim tell them what they didn't ask." },
    { h: "They ask something you didn't plan for",
      t: "Answer truthfully, costly, and pointing at the nearest unticked fragment. If the question would reveal the loop, " +
         "answer with a loop scar instead of words." },
    { h: "A character dies",
      t: "Dark but survivable: a dying character gets a vision, their own face, older, saying their name. They may spend 1 " +
         "Humanity to stabilise at 1 HP. If they refuse, or it's truly over, the Cantor offers a seat (the voice in the pipes) " +
         "and the player keeps playing as that voice." },
    { h: "They guess the twist early",
      t: "Reward it: keystone k11 kept, and a vision that is clearer. Then let the loop get smarter, the future selves start " +
         "sending visions that assume the crew know, which is its own kind of unsettling." },
    { h: "They refuse the quest",
      t: "The Hush keep hunting, the rumours keep turning, and Street Cred keeps falling. The story comes to them: the petitioners " +
         "come to the crew for protection, and turning them away costs Salvage." },
    { h: "They split up",
      t: "Good. Roll a vision for each group at the next key moment; different groups getting different help is the loop at its best." },
    { h: "The players are miserable, not tragic",
      t: "Doom is fixed; misery isn't. Give them a clean win the prophecy doesn't care about: a rescue, a debt forgiven, a " +
         "rival humiliated, a Cred jump. Redemption is the point of the arc even when salvation isn't." }
  ],

  /* ================================================================= ENDINGS */
  endings: [
    { id: "ash", name: "Ash (Salvage 0–5)",
      t: "The ribs open and most of Cathedra goes with them. The survivors are few, and every one of them knows who the crew " +
         "were. Street Cred is meaningless now; the stories are not kind." },
    { id: "embers", name: "Embers (Salvage 6–11)",
      t: "A few ribs get out: the Gullet, parts of the Marrowworks, whoever listened. The crew are argued about for a generation. " +
         "Some light candles for them; some would spit." },
    { id: "exodus", name: "Exodus (Salvage 12–17)",
      t: "Most of the city walks out along the god's arm as it unfolds. The crew are remembered as the ones who warned people, " +
         "and the ones who were there at the end, and people are not sure which matters more." },
    { id: "witnesses", name: "Witnesses (Salvage 18+)",
      t: "A city's worth of people stand on the god's opened hand and watch it be born. Nobody died who could have been saved. " +
         "The crew are the reason, and everyone knows it. Their redemption is complete, even though the city is gone." },
    { id: "feed", name: "What the god becomes (Feed)",
      t: "Mercy: it is gentle, and it will come back to ask how they are. Violence: it is strong and afraid, and the survivors " +
         "will need to stay out of its way. Lies: it is charming and it is never, ever honest, and it likes them. Questions: " +
         "it is curious, and it asks them what it should be, the best ending short of the moth." },
    { id: "moth", name: "The 1% ending: the moth",
      t: "All twelve keystones kept. At the Sending they send back exactly what they received, and the loop closes clean. " +
         "The birth happens without the fall: the ribs part like curtains, something enormous and very new climbs out of " +
         "Cathedra and into the sky, and the city is still standing, godless, lit by its own lamps for the first time in nine " +
         "hundred years. Tell them how close they came. They came all the way." }
  ],

  acts: []
};

/* ======================================================================= ACT I */
TTST.acts.push({
  id: "a1", title: "Act I, The Fourth Minute", sessions: "1–3", levels: "3–5",
  summary: "They fail a job, see the end of the city, wake up hunted, and decide to chase the vision to prove everyone wrong about them.",
  scenes: [

  /* ------------------------------------------------------------------ S1 */
  { id: "s1", act: 1, session: 1, level: 3, title: "The Reliquary job", place: "The Crown · House Reliquary's chapel-vault",
    truth: "Mother Slate hires them, for a client who pays in choir coins, to lift a cornea shard from Archdeacon Uln Sarrow's " +
      "vault under the Reliquary chapel. The client is the Hush, who want to destroy it. Nobody, not the Hush, not Slate, not the " +
      "Archdeacon, knows the shard cracks the moment it leaves consecrated ground. The heist is fully winnable up to the chapel " +
      "steps. Then the Eye weeps, the vision floods all of them, and they black out in the rain with alarms going. How badly they " +
      "failed (who died, who saw their faces, what they left behind) is all theirs.",
    readAloud: [
      "Mother Slate counts choir coins with two of her four hands and doesn't look up. “Reliquary vault, under the chapel in the Crown. " +
      "One shard of glass the size of a thumbnail, in a case the size of a coffin. My client wants it out, intact, by dawn. " +
      "Fifteen thousand grams apiece, and I don't ask who pays in coins nobody spends.”",
      "The Reliquary chapel is the quietest place you have ever stood. No signal. No hum from your chrome. Just candles, moths, and " +
      "a choir of acolytes three floors down, singing to a door."
    ],
    hooks: {
      Muscle: "The vault door is counter-weighted on a bone hinge. Someone strong enough can hold it for the six seconds the ward sleeps.",
      Face: "The acolytes change shift at the third bell, and the new ones don't know every visiting pilgrim's face. Someone with a story walks in the front.",
      Tech: "Consecrated ground kills netrunning, but the chapel's lift outside is ichor-driven and ordinary. Hack the lift, not the vault.",
      Arcane: "The ward is a prayer, not a machine. Someone who knows how prayers are built can find where this one was stitched short.",
      Stealth: "The ossuary crawlspace connects to the vault's drainage grate. It is narrow, it is full of the dead, and nobody watches it.",
      Support: "An acolyte is sick in the cloister, a Streetdoc or a priest can be invited in to treat them, which gets someone inside for an hour."
    },
    questions: [
      { q: "Who is the client?", a: "Slate: “Someone who pays in choir coins. You know anybody who spends those? No. Nor do I.” (First Hush clue.)" },
      { q: "What is the shard, exactly?", a: "Slate doesn't know. An acolyte, if asked in the chapel: “The Archdeacon's minute. He came back from the Eye white as salt.”" },
      { q: "Why intact?", a: "Slate: “Client's words. ‘It must not break before we hold it.’ Their ‘we’, not mine.” (They fear it breaking, foreshadowing.)" },
      { q: "Has anyone else been hired for this?", a: "Slate hesitates. “I have this job in my ledger twice. I only took it once.” (Loop scar; worth a Salvage point if they ask to see it.)" },
      { q: "What happens to the Archdeacon if it's stolen?", a: "An acolyte: “He'll be relieved. He hasn't slept since he recorded it.” (He is not a villain.)" }
    ],
    notAsked: [
      { if: "They never ask who the client is.", then: "They leave with no idea the Hush exist, and in session 2 the attack comes from nowhere.",
        recover: "Ketch's second voice, in session 2, says “Your client sings. Did you not wonder why they pay in choir coins?”" },
      { if: "They never ask what the shard is.", then: "The vision hits with no context, and they will assume it is a curse from the Archdeacon.",
        recover: "The Archdeacon's public statement in session 2 mentions “a recording of great spiritual danger”, they can put it together." },
      { if: "They don't ask why it must stay intact.", then: "Nobody thinks to carry it in a consecrated reliquary box, which is the only thing that would have kept it whole.",
        recover: "It breaks anyway (it must). But a crew who asked will know, afterwards, that it broke because it left holy ground, and that is a clue about the Eye." }
    ],
    missed: [
      { detail: "The acolytes' choir three floors down sings the same melody the pipes hum at night.",
        means: "The lullaby. The Reliquary's choir is unknowingly part of the Hush's song.",
        ifMissed: "The first time they hear it clearly will be at the Choir-house, and it will feel familiar without them knowing why." },
      { detail: "The shard's case is engraved on the inside: “IV”.",
        means: "There were four petitioners. This was the fourth minute.",
        ifMissed: "They won't know to look for the other three until the rumours find them in session 3." },
      { detail: "Moths gather on the case, all facing the same way, toward the Marrowworks.",
        means: "The warm thing below is waking. The god knows where its hand is.",
        ifMissed: "Nothing, now. It is a clue for session 4 that pays off only if remembered." }
    ],
    right: [
      { call: "They get in and out without killing anyone.", result: "Keystone k1 kept. The failure is the city's, not theirs.",
        lead: "Play the vision on the steps at full weight, they did everything right and it still happened. That is the tone of the whole campaign.",
        salvage: 2, feed: "mercy" },
      { call: "They carry the shard in something consecrated (a reliquary box, a pilgrim's mask wrapped around it).", result: "It survives down the chapel steps and cracks on the first step that isn't holy, a few seconds later. They get further than anyone.",
        lead: "They remember where it cracked. That becomes the clue that the Eye is bound to holy ground (useful in session 9).", salvage: 1, feed: "questions" },
      { call: "They ask to see Slate's ledger entry twice.", result: "A loop scar, found on day one. Most tables will laugh it off.",
        lead: "Note who asked. That player is your best candidate for keystone k11 later.", salvage: 1, feed: "questions" }
    ],
    wrong: [
      { call: "They kill a guard or an acolyte.", result: "Keystone k1 broken. The Reliquary publishes the dead acolyte's name with the crew's descriptions.",
        lead: "Start session 2 with the funeral procession passing their hiding place.", salvage: -2, feed: "violence" },
      { call: "They open the case to look at the shard.", result: "They see a flicker of the vision early, a single frame of the ribs opening, and one of them freezes for a turn at the worst moment.",
        lead: "Curiosity isn't punished for long: that player gets the clearest version of the vision on the steps.", salvage: 0, feed: "questions" },
      { call: "They double-cross Slate and try to sell the shard elsewhere.", result: "It cracks on the steps anyway, and now Slate knows they meant to cheat her.",
        lead: "Slate is harder to win back in session 2 (−1 on every Cred event involving her).", salvage: -1, feed: "lies" }
    ],
    goesWrong: [
      "The shift change comes early: the Archdeacon arrives to pray over the case, alone, and sees them. He doesn't raise the alarm, he asks them, quietly, not to break it.",
      "A Reliquary Humanity-buffer repossession is happening in the cloister at the same time. Chaos, witnesses, and a Thorn collector with no interest in them yet.",
      "The ward sleeps for four seconds, not six. Whoever is holding the door takes 2d6 bludgeoning.",
      "It starts to rain chrome-grey ash. Everyone in the Crown looks up. Nobody is watching the chapel. (An omen, use it as a gift.)"
    ],
    checks: [
      { what: "Talk past the acolytes at the gate", skill: "Deception", dc: 15 },
      { what: "Read the prayer-ward's weak stitch", skill: "Religion", dc: 15 },
      { what: "Crawl the ossuary without disturbing the dead", skill: "Stealth", dc: 15 },
      { what: "Hold the bone door for six seconds", skill: "Athletics", dc: 20 },
      { what: "Hack the chapel lift from outside the dead air", skill: "Technology", dc: 15 },
      { what: "Resist the vision long enough to act (on the steps)", skill: "Wisdom save", dc: 25 }
    ],
    fixedEcho: "THE FOURTH MINUTE (everyone, on the chapel steps, 1 Humanity each and a Remnant): the Eye weeps; the Cantor misses a note; " +
      "the Marrowworks fills with warm light; a ledger burns; the Spine snaps like a harp string; the Eye closes; four figures stand in " +
      "the ruins, and one holds an eye in its hands like a lantern. Then nothing. They wake up somewhere else.",
    echoes: [
      { beat: "Just before the ward, if someone hesitates", text: "A flash of gold: a hand, older than theirs, holding the bone door open. A voice says “six seconds, not five, not seven.”",
        clue: "The voice uses the exact counting habit of whoever is holding the door." }
    ],
    scars: ["Mother Slate's wax ledger has this job in it twice; the first entry is in older wax."],
    cred: [
      { event: "The heist fails publicly (it always does)", delta: -3 },
      { event: "Someone died during it", delta: -1 },
      { event: "They left the Archdeacon unharmed and he says so in public", delta: 1 }
    ],
    clocks: [{ id: "st-reliquary-damages", name: "Reliquary damages (Thorn collects)", seg: 4 }],
    npcs: [
      { id: "st-slate", name: "Mother Slate", template: "Civilian", role: "Fixer, the Marrowworks",
        notes: "The cutout. Paid in choir coins. Loses face when the job fails; can be won back." },
      { id: "st-sarrow", name: "Archdeacon Uln Sarrow", template: "Civilian", role: "House Reliquary · fourth petitioner",
        notes: "Recorded his minute of the vision. Frightened, rich, not a villain." },
      { id: "st-acolyte", name: "Reliquary acolyte", template: "Corpo Security", role: "Chapel guard",
        notes: "Sings on shift. Would rather not fight in a chapel." }
    ],
    fragment: { n: 1, ways: ["The shard cracks on the first step that isn't consecrated ground. Fixed."] },
    keystones: ["k1"]
  },

  /* ------------------------------------------------------------------ S2 */
  { id: "s2", act: 1, session: 2, level: 4, title: "Burned", place: "The Gullet · Ketch's noodle-loft, then everywhere they used to be welcome",
    truth: "Ketch found them on the chapel steps and dragged them down to the Gullet before the Reliquary guards got there. They wake " +
      "three days later. Their faces are on every Reliquary notice board, Mother Slate won't see them, Ser Ambrel Dace has been " +
      "assigned the Reliquary's damages, and the Hush, who now know the crew are seers, send Tallow to sing them to sleep for good. " +
      "The scene ends with the crew deciding to chase the vision: to prove they are not what the city says.",
    readAloud: [
      "You wake to the smell of broth and the sound of someone arguing with themselves. The someone is a Wirewalker with cables in " +
      "their scalp, and the argument is one-sided: two voices, one mouth. “They're up,” says the second voice. “Tell them it's been " +
      "three days. Tell them the city has decided who they are.”",
      "Every notice board in the Gullet has your faces on it, under the Reliquary seal: WANTED FOR DESECRATION. Somebody has drawn " +
      "moths around one of you."
    ],
    hooks: {
      Muscle: "Ser Ambrel Dace offers a duel instead of payment. Winning it clears one segment of the damages clock and earns respect nobody expected.",
      Face: "Mother Slate will see exactly one of them, for exactly one minute. What they say decides whether she ever works with them again.",
      Tech: "Ketch's cables are listening to the pipes. A Tech character can hear what Ketch hears: singing, under the water, all the time.",
      Arcane: "The vision left a residue. An Arcane character can feel it in the others like a splinter, and feel that it didn't come from the god.",
      Stealth: "Getting across the Gullet unseen now is its own job. Someone who knows the rooftops of the throat can move the crew at night.",
      Support: "One of them came back from the steps with a Remnant that is getting worse. Treating it is the first scene of the day and the best time to talk."
    },
    questions: [
      { q: "(To Ketch's second voice) Who sent the vision?", a: "“You did. You always do.” Ketch apologises for it. The players will think it's nonsense. It's keystone k2.", keystone: "k2" },
      { q: "(To Ketch) Why did you help us?", a: "“The voice told me your names a week before the job. It's never been wrong about a name.”" },
      { q: "(To Slate) Who was the client?", a: "Only if they've earned it (Cred event below). “They pay in choir coins and they sing when they think no one's listening. That's all I have. That's all I want.”" },
      { q: "(To Dace) What exactly do we owe?", a: "“Twelve thousand grams, or four favours on the book, or a duel. The Reliquary doesn't care which; I prefer the duel.”" },
      { q: "(To Tallow, if taken alive) Why us?", a: "“Because you saw it. Everyone who sees it wakes it a little. I'm sorry. I'm really sorry.”" }
    ],
    notAsked: [
      { if: "Nobody asks the second voice anything.", then: "Keystone k2 is gone, and they lose the earliest and plainest statement of the twist.",
        recover: "It will say something unprompted in session 5, but by then it's a scar (humming a player's tune), not a keystone." },
      { if: "They never ask Tallow why.", then: "They conclude the Hush are a death cult. That is exactly the conclusion the story wants them to be able to make.",
        recover: "Tallow, spared, can say it in session 3. Tallow, killed, can't." },
      { if: "They don't go to Slate at all.", then: "She assumes they've cut her loose. Her Cred event is lost and her name for the client stays secret until session 6.",
        recover: "Slate sends word in session 4: “You never came. I'd have told you.”" }
    ],
    missed: [
      { detail: "Tallow hums before he attacks, and it is the tune from the chapel choir.",
        means: "The singers in the chapel and the killers in the pipes are part of the same song.",
        ifMissed: "The Choir-house in session 7 is a total surprise instead of an 'oh no'." },
      { detail: "Ketch's broth is made with water from a well the second voice told Ketch to use, the one well in the Gullet the Hush don't sing through.",
        means: "The second voice is protecting them from the Hush.",
        ifMissed: "Nothing yet; it pays off if they ever wonder why they slept safely at Ketch's." },
      { detail: "One of the WANTED notices has moths drawn around a face. It's Pell's work.",
        means: "Pell, a child, has seen them before, in the vision.",
        ifMissed: "They meet Pell in session 3 without realising they've seen the drawings." }
    ],
    right: [
      { call: "They take Tallow alive and let him go, or keep him and listen.", result: "The Hush learn the crew don't kill seers' killers on sight. The next attempt is a warning, not an assassin.",
        lead: "Tallow becomes the go-between; use him to deliver clues when they get stuck.", salvage: 2, feed: "mercy" },
      { call: "They face Slate and take responsibility.", result: "Slate gives them the choir-coin detail and a job lead toward the other petitioners.",
        lead: "Session 3 opens with a name from Slate: Ines Varro, who stopped running her lift above the seventh rib.", salvage: 1, feed: "mercy" },
      { call: "They decide, out loud, to chase the vision.", result: "The redemption arc begins. Give them a moment: the rain stops, a lift arrives on time.",
        lead: "Ask each player what their character is trying to prove, and to whom. Write it down; the finale uses it.", salvage: 1, feed: "questions" }
    ],
    wrong: [
      { call: "They kill Tallow.", result: "The Hush escalate. A second quieter comes, and a Hush death-notice for the crew circulates. If you want, roll the Lidless chance (d6, a 6) on Tallow's body.",
        lead: "Tallow's sister is a bath-keeper in the Gullet. She will be at the Choir-house in session 7.", salvage: -1, feed: "violence" },
      { call: "They blame Slate publicly.", result: "Slate's name burns further and she stops protecting them. Cred event lost.",
        lead: "She becomes a closed door they will need open in session 6.", salvage: -1, feed: "lies" },
      { call: "They hide and wait for it to blow over.", result: "It doesn't. Dace's damages clock ticks, and the rumours get worse.",
        lead: "The petitioners come to them instead, Ines Varro knocks on Ketch's door with the Hush one street behind.", salvage: -1, feed: "lies" }
    ],
    goesWrong: [
      "Dace arrives while Tallow is mid-song. Three-way standoff: Dace wants them alive (they owe her), Tallow wants them asleep.",
      "Ketch's second voice says something in front of Dace that only a Hush would know. Dace starts asking questions of her own.",
      "Their Remnant from the vision shows at the worst time: someone's shadow falls toward the Marrowworks and a Reliquary acolyte notices.",
      "The Gullet's water goes silent. It has never been silent. The whole market stops to listen."
    ],
    checks: [
      { what: "Hear the singing under the water (Tallow's approach)", skill: "Perception", dc: 15 },
      { what: "Resist Tallow's sleep-note (each round in earshot)", skill: "Wisdom save", dc: 14 },
      { what: "Win Dace's duel (first to 3 hits, or yield)", skill: "Athletics or Acrobatics", dc: 15 },
      { what: "Get one minute with Slate", skill: "Persuasion", dc: 15 },
      { what: "Cross the Gullet unseen", skill: "Stealth", dc: 15 }
    ],
    echoes: [
      { beat: "When Tallow starts to sing", text: "Gold light, a warm hand over their ears, and a voice they almost know: “Don't kill the singer. You'll want him later.”",
        clue: "“You'll want him later” is a phrase one of the players uses. Pick whichever player says it." },
      { beat: "When they decide to chase the vision", text: "For a heartbeat they see themselves older, in rain, laughing at something. Then it's gone.",
        clue: "One of the older faces has a scar the character doesn't have yet." }
    ],
    scars: ["Ketch's second voice greets one of them with a nickname only their friends use."],
    cred: [
      { event: "They take responsibility to Slate's face", delta: 1 },
      { event: "They pay Dace or win her duel", delta: 1 },
      { event: "They kill Tallow in the Gullet in front of witnesses", delta: -1 }
    ],
    clocks: [{ id: "st-hush-close", name: "The Hush close in", seg: 6 }],
    npcs: [
      { id: "st-ketch", name: "Ketch", template: "Netrunner", role: "Wirewalker · the second voice",
        notes: "Found them on the steps. The second voice knows their names from other loops." },
      { id: "st-tallow", name: "Tallow", template: "House Enforcer", role: "Hush quieter",
        notes: "Polite, apologetic, sings people to sleep for good. Worth sparing." },
      { id: "st-dace", name: "Ser Ambrel Dace", template: "Corpo Lieutenant", role: "House Thorn, collections",
        notes: "Collecting the Reliquary's damages. Payment, a counter-favour or a duel." }
    ],
    keystones: ["k2"]
  },

  /* ------------------------------------------------------------------ S3 */
  { id: "s3", act: 1, session: 3, level: 5, title: "The other petitioners", place: "The Sevenfold Spine, the Marrowworks and the Gullet, in one long night",
    truth: "The Eye showed four petitioners the same minute. The Archdeacon was the fourth. The other three, Ines Varro (a lift " +
      "operator), Brother Cobb (a drill foreman) and Pell (a Gullet child), each saw a different part more clearly. The Hush are " +
      "working through the list tonight. The crew can reach at most two before the Hush reach the third, unless they split up. " +
      "Everything about tonight is designed to make the Hush look like monsters. They are killing frightened people in their sleep. " +
      "They also never touch anyone who hasn't seen the vision.",
    readAloud: [
      "Three names, three ribs, one night. Somewhere under the city, forty people in plain clothes are humming the same song and walking toward the same three doors.",
      "Pell's drawing is pinned above her sleeping mat: four figures in a ruin, one holding something round and bright. The paper is new. The drawing is not the first, there are dozens underneath it."
    ],
    hooks: {
      Muscle: "Ines Varro's lift car is stuck between ribs with a quieter in the cable housing. Someone has to climb the cable.",
      Face: "Brother Cobb has been paid three times to stay quiet. A Face can get him talking by being the first person who asks what he saw instead of telling him not to say it.",
      Tech: "The Hush move through the pipes. A Tech character can map which pipes are singing tonight and see where they are going next.",
      Arcane: "Pell's drawings are more than drawings: each one is a little accurate about something that hasn't happened yet. An Arcane character can read them like scripture.",
      Stealth: "Getting to Pell before the Hush means going through the Gullet's drains, which are the Hush's roads.",
      Support: "Brother Cobb's crew are sick from the warm thing. Treating them buys his trust and an early look at session 4."
    },
    questions: [
      { q: "(To a Hush agent, before fighting) Why are you doing this?", a: "“Because they saw it, and seeing it wakes it. We sing so it sleeps. We're sorry.” Keystone k3 if they listen.", keystone: "k3" },
      { q: "(To Ines) What did you see?", a: "“The Spine. It snapped like a harp string, and everyone on it was singing.”" },
      { q: "(To Cobb) What did your crew hit?", a: "“Something warm. It bled light, not ichor. It gripped the drill bit. Like a baby grips a finger.”" },
      { q: "(To Pell) Who are the four people?", a: "Pell looks at them for a long time. “I don't know yet. I'll know when they're older.”" },
      { q: "Why hasn't anyone killed the Archdeacon?", a: "Tallow or any Hush: “He's in the Crown, on holy ground, and he's paying us for our silence without knowing it.” (The Reliquary choir sings the lullaby too.)" }
    ],
    notAsked: [
      { if: "No one talks to the Hush before fighting.", then: "Keystone k3 broken. They go into Act II certain the Hush are the enemy, which makes session 7 a massacre if they're not careful.",
        recover: "A dying quieter's last words: “Keep singing.” It is not enough to reopen the keystone, but it is enough to make them wonder." },
      { if: "They don't ask Pell anything.", then: "They never learn the drawings are of them until someone else points it out.",
        recover: "Dr. Vhoss, in session 4, sees one of the drawings on them and says “that's you. That's a very good likeness.”" },
      { if: "They don't ask Cobb what his crew hit.", then: "Session 4 opens with them walking into the Marrowworks blind.",
        recover: "Cobb's crew's sickness is visible: their veins glow faintly. An observant character can work it out." }
    ],
    missed: [
      { detail: "The Hush agents only ever go for the petitioners, never the petitioners' families, even when they're in the room.",
        means: "They kill seers, not people. That is a rule, and rules are not what monsters keep.",
        ifMissed: "The crew will treat the Choir-house like a nest of murderers in session 7." },
      { detail: "One of Pell's older drawings shows the crew on the chapel steps, lying in the rain. It is dated before the job.",
        means: "Loop scar. Pell saw the failure before it happened.",
        ifMissed: "It will still be there in session 6 when they come back for Pell. It will be the fourth drawing from the top." },
      { detail: "The quieters' pipe-knives are old, older than the city's current pipes.",
        means: "The Hush are ancient.",
        ifMissed: "Minor. A good detail for a Religion or History check later." }
    ],
    right: [
      { call: "They split up and reach all three petitioners.", result: "All three survive the night. The Hush notice that the crew are protecting seers, not hunting them.",
        lead: "Ines, Cobb and Pell each owe them a favour. Ines is the most useful in session 8, Cobb in session 4, Pell always.", salvage: 3, feed: "mercy" },
      { call: "They talk a Hush agent down without violence.", result: "Keystone k3 kept. The agent leaves and takes the crew's message back to the Choirmaster.",
        lead: "The Choirmaster now knows them by name and reputation. Session 7 opens with a letter instead of a trap, if they want it.", salvage: 2, feed: "questions" },
      { call: "They hide the petitioners somewhere consecrated.", result: "The Hush can't sing through dead air. The petitioners are safe for as long as they stay there.",
        lead: "Sanctum Null becomes a refuge, and a place where the crew can meet anyone without the pipes listening.", salvage: 2, feed: "questions" }
    ],
    wrong: [
      { call: "They ambush and kill the Hush team.", result: "Doom: fragment 2 advances by route A (the Cantor misses a note, one of the singers was a voice in it). The pipes go quiet in one rib for a night.",
        lead: "Everyone in that rib sleeps badly and dreams of the Marrowworks. Roll twice on the omens table next session.", salvage: -2, feed: "violence", doom: 2 },
      { call: "They leave one petitioner to the Hush to save the other two.", result: "The one they leave is found asleep, smiling, in the morning. Nobody can wake them.",
        lead: "The other two petitioners stop trusting the crew a little. Pell draws the sleeper, and the drawing has a fifth figure now.", salvage: -1, feed: "violence" },
      { call: "They use the petitioners as bait to catch a Hush agent.", result: "It works, and it looks exactly like what the Hush would do. The petitioners never forgive them.",
        lead: "Salvage later: the petitioners' favours are gone. Ines won't help with the pilgrimage.", salvage: -2, feed: "lies" }
    ],
    goesWrong: [
      "Ines's lift car drops a rib while they're on it. Long Fall rule: they land in a district that has heard of them.",
      "Cobb's crew mistake the crew for the Hush and attack. Four sick, frightened drillers with rock-bores.",
      "Pell isn't at home. Pell is at the Eye, trying to see the four figures' faces. Getting her back means walking past the Reliquary's guards.",
      "Dace's collectors pick tonight to collect. They are very good at finding people."
    ],
    checks: [
      { what: "Map the singing pipes to predict the Hush route", skill: "Technology or Investigation", dc: 15 },
      { what: "Climb the lift cable to the quieter", skill: "Athletics", dc: 15 },
      { what: "Talk a Hush agent into lowering their knife", skill: "Persuasion", dc: 20 },
      { what: "Read Pell's drawings for what hasn't happened yet", skill: "Arcana or Religion", dc: 15 },
      { what: "Treat Cobb's crew's glowing veins", skill: "Medicine", dc: 15 }
    ],
    echoes: [
      { beat: "At the moment they must choose which petitioner to go to first", text: "Gold light. A child's hand pulling theirs. “Pell first. Pell always first.”",
        clue: "The hand pulling theirs has a ring one of the characters wears." },
      { beat: "When a Hush agent raises a knife", text: "They see the agent, older, singing at a bedside, crying. The voice: “Ask her why. You didn't, last time.”",
        clue: "“Last time”, the first time the visions admit to a last time." }
    ],
    scars: ["Pell's older drawing of the crew in the rain on the chapel steps, dated before the job."],
    eyeChrome: "If they kill a Hush tender tonight, roll a d6 for the Lidless on the body (a 6).",
    cred: [
      { event: "All three petitioners survive the night", delta: 2 },
      { event: "A petitioner is lost on their watch", delta: -1 },
      { event: "They're seen fighting the Hush in the street (people think they're protecting the city)", delta: 1 }
    ],
    clocks: [{ id: "st-hush-close", name: "The Hush close in", seg: 6 }],
    npcs: [
      { id: "st-ines", name: "Ines Varro", template: "Civilian", role: "Lift operator · second petitioner",
        notes: "Saw the Spine snap. Knows every car and cable. Useful in session 8." },
      { id: "st-cobb", name: "Brother Cobb", template: "Civilian", role: "Drill foreman · third petitioner",
        notes: "His crew hit the warm thing. Paid three times to keep quiet." },
      { id: "st-pell", name: "Pell", template: "Civilian", role: "Gullet child · first petitioner",
        notes: "Draws four figures in the ruins. The drawings are getting more accurate." },
      { id: "st-quieter", name: "Hush quieter", template: "House Enforcer", role: "The Hush",
        notes: "Sings seers to sleep. Never touches anyone who hasn't seen the vision." }
    ],
    fragment: { n: 2, ways: ["Route A if they kill Hush singers tonight (a singer was a voice in the Cantor). Otherwise this fragment waits for session 7 or 10."] },
    keystones: ["k3"]
  }
  ]
});

/* ====================================================================== ACT II */
TTST.acts.push({
  id: "a2", title: "Act II, Ask Around", sessions: "4–6", levels: "6–8",
  summary: "They investigate the vision across the city. Every answer is true. Every answer is also a door the end walks through.",
  scenes: [

  /* ------------------------------------------------------------------ S4 */
  { id: "s4", act: 2, session: 4, level: 6, title: "The warm bleed", place: "The Marrowworks · shaft nine, three shifts down",
    truth: "Brother Cobb's crew hit the new god's hand, growing inside the old bone. It is warm, it bleeds light instead of ichor, and " +
      "it grips. The Houses have sealed shaft nine and paid three crews to forget. Tonight House Reliquary and House Thorn both send " +
      "people to decide what to do with it. The crew's choice here decides route of fragment 3: stop the drilling (the hand closes) " +
      "or let the Houses drill deeper to 'finish it' (the hand opens). The keystone path is to do neither: seal the breach and leave it be.",
    readAloud: [
      "Shaft nine smells like a nursery. Warm, milky, clean. That is the first thing wrong. The second thing is the light: soft and gold, coming up through a crack in the bone like dawn under a door.",
      "Somewhere below you, something enormous and very small is holding a drill bit the way a baby holds a finger."
    ],
    hooks: {
      Muscle: "The drill rig is jammed in the breach. Someone strong can pull it free, or drive it deeper. Either one decides the fragment.",
      Face: "A Reliquary deacon and a Thorn engineer are arguing at the shaft head. A Face can make them both think the other side has already decided.",
      Tech: "The drill's controller logs show it has been drilling itself for three nights with no operator. Someone reads the logs, someone finds out why.",
      Arcane: "The light is holy and it is not the old god's. An Arcane character knows the difference between a wound and a birth, if they look.",
      Stealth: "Getting into a sealed shaft past both Houses' guards is the whole first half of the night.",
      Support: "Cobb's crew's glowing veins are getting worse. Keeping them alive means understanding the light, and it tells them what the light is."
    },
    questions: [
      { q: "Is the bone healing?", a: "Dr. Vhoss, if brought along or asked afterwards: “Healing? No. Healing closes. This is growing. This is making room.”" },
      { q: "What happens if the drilling stops?", a: "Cobb: “The bone closes over the shaft in a week. It always has. That's why we never stop.” (Stopping lets it grow unwatched.)" },
      { q: "What happens if they drill deeper?", a: "The Thorn engineer: “We finish it. Whatever it is. That's the plan.” (It isn't finishing anything; it's cutting the cord.)" },
      { q: "Who wrote DON'T STOP THE DRILL on the shaft wall?", a: "Nobody on Cobb's crew. The paint is older than the shaft. (Loop scar, their handwriting.)" },
      { q: "Can we just leave it alone?", a: "Cobb, surprised: “Seal it and walk away? Nobody's ever… I suppose. Nobody's ever tried.” (Keystone k4.)", keystone: "k4" }
    ],
    notAsked: [
      { if: "They never ask Vhoss about the bone.", then: "They leave thinking it's a wound, and 'kill it or save it' seem like the only two choices.",
        recover: "Vhoss asks them about it in session 5, when she sees the light still on their boots." },
      { if: "They never ask what leaving it alone would mean.", then: "Keystone k4 is almost certainly lost; the Houses force the question into kill-or-save.",
        recover: "None. This is one of the keystones the story is built to be missable." },
      { if: "They don't read the drill logs.", then: "They miss that the drill has been running itself, the god is pulling it in.",
        recover: "The drill is found the next morning, three hundred feet deeper, with no one near it." }
    ],
    missed: [
      { detail: "The light is warm on the skin of whoever saw the vision most clearly, and cold on everyone else.",
        means: "The seers are connected to it. They are waking it just by being here.",
        ifMissed: "The Hush's reason for killing seers stays abstract until session 7." },
      { detail: "The graffiti DON'T STOP THE DRILL is in one player's handwriting.",
        means: "Loop scar. Their future selves have been here.",
        ifMissed: "They can find it later; the wall doesn't go anywhere. It will be warm to the touch in session 11." },
      { detail: "The hand has four fingers and a thumb, and one of the fingers has a scar across it exactly where one character has a scar.",
        means: "The god is being born remembering them. It's already learning from them.",
        ifMissed: "The newborn god in session 11 has the same scar, and someone will finally notice." }
    ],
    right: [
      { call: "They seal the breach and leave the hand alone, and talk both Houses out of acting.", result: "Keystone k4 kept. The fragment still comes true, the Houses send a second crew in a month and drill anyway, but it isn't theirs.",
        lead: "Cobb's crew recover. Cobb becomes a firm ally; his crew become the backbone of the evacuation later.", salvage: 3, feed: "questions" },
      { call: "They save Cobb's crew with Vhoss's help.", result: "Vhoss learns what the light is, and says the word 'birth' out loud for the first time.",
        lead: "Vhoss becomes the crew's doctor for the rest of the campaign, and the Lidless is in her back room.", salvage: 2, feed: "mercy" },
      { call: "They read the drill logs and don't touch the rig.", result: "They know the god is pulling the drill in. It's the first proof that the thing below is doing things on purpose.",
        lead: "Give them a vision if they ask the right follow-up (why?).", salvage: 1, feed: "questions" }
    ],
    wrong: [
      { call: "They stop the drilling to spare the warm thing.", result: "Doom: fragment 3, route A. Unwatched, the hand closes around the shaft and the Marrowworks fills with light for a whole shift. Three drillers go blind.",
        lead: "Everyone thinks they saved it. They did. That is the tragedy. Start session 5 with a Cred rise and an omen.", salvage: -1, feed: "mercy", doom: 3 },
      { call: "They help the Houses drill deeper to finish it.", result: "Doom: fragment 3, route B. The drill goes in, the hand opens around it, and light floods the Marrowworks for a whole shift.",
        lead: "The Houses think it's dead. It isn't. Omens double next session.", salvage: -2, feed: "violence", doom: 3 },
      { call: "They try to cut a piece of the warm thing to take away.", result: "It bleeds light on them. Whoever cut it gets a Remnant (light shows through their skin in the dark) and the Hush know exactly where they are, always, from now on.",
        lead: "The Hush close in clock gains 2 segments. Tallow sends a note: “Why would you do that.”", salvage: -2, feed: "violence" }
    ],
    goesWrong: [
      "The shaft floods with warm, milky water. Everyone must swim or climb. It is not unpleasant. That is worse.",
      "Both Houses' teams arrive at once and start shooting at each other over who gets to decide. The crew are in the middle.",
      "A Hush quieter is already in the shaft, singing to the hand. It's working. Interrupting them wakes it.",
      "The Long Fall: the shaft floor gives way and they drop into the district below, glowing faintly."
    ],
    checks: [
      { what: "Get past both Houses' guards into shaft nine", skill: "Stealth or Deception", dc: 20 },
      { what: "Read the drill controller's logs", skill: "Technology", dc: 15 },
      { what: "Tell a wound from a birth", skill: "Medicine or Religion", dc: 20 },
      { what: "Talk the Houses out of drilling tonight", skill: "Persuasion", dc: 20 },
      { what: "Seal the breach without touching the hand", skill: "Sleight of Hand or tinker's tools", dc: 15 }
    ],
    echoes: [
      { beat: "When they first see the light", text: "Gold, warm, a voice that sounds like it has been crying: “Don't stop it and don't help it. Seal it. Leave it. Walk away. It's the hardest thing you'll do.”",
        clue: "“The hardest thing you'll do”, the future self is guessing, and they're wrong: the hardest thing is session 12." },
      { beat: "If someone touches the hand", text: "Tiny fingers close around theirs, and for a second they feel very, very loved.",
        clue: "No clue. Just let it land." }
    ],
    scars: ["DON'T STOP THE DRILL, painted on the shaft wall in one player's handwriting, in paint older than the shaft."],
    eyeChrome: "Dr. Vhoss's back room opens to them from tonight if they've done her a kindness.",
    cred: [
      { event: "Cobb's crew come home alive", delta: 1 },
      { event: "They publicly stand up to both Houses", delta: 1 },
      { event: "Drillers are blinded on their watch", delta: -1 }
    ],
    clocks: [{ id: "st-marrow", name: "The Marrowworks lights up", seg: 4 }],
    npcs: [
      { id: "st-vhoss", name: "Dr. Maret Vhoss", template: "Ripperdoc", role: "Bone-carver, unlicensed",
        notes: "First to say 'growing', not 'healing'. The Lidless is in her back room." },
      { id: "st-thorn-eng", name: "Thorn engineer", template: "Corpo Security", role: "House Thorn",
        notes: "Wants to drill deeper and finish it." },
      { id: "st-rel-deacon", name: "Reliquary deacon", template: "Corpo Security", role: "House Reliquary",
        notes: "Wants to collect the light and sell it." }
    ],
    fragment: { n: 3, ways: ["Route A: they stop the drilling.", "Route B: they (or the Houses) drill deeper.", "If they do neither, the Houses do it a month later, offstage."] },
    keystones: ["k4"]
  },

  /* ------------------------------------------------------------------ S5 */
  { id: "s5", act: 2, session: 5, level: 7, title: "One question a year", place: "The Cantor's nave · the Sevenfold Spine's middle stop",
    truth: "The Cantor answers one question per petitioner per year, truthfully and not usefully. It has answered this crew before, in " +
      "every loop, and it remembers. It cannot say so directly, but it will answer a question about the loop truthfully. This scene " +
      "is a puzzle with no wrong answers, only wasted ones. The Hush are here too, because the Cantor is their instrument, and a " +
      "Hush tender is present at every audience. The Archdeacon is here as well, asking his own question.",
    readAloud: [
      "The Cantor's nave is the size of a rib. Nine hundred voices hang in brass housings from the ceiling like bells, and all of them breathe at once when you walk in.",
      "“Petitioners,” it says, with nine hundred mouths. “One each. Choose well. You usually don't.”"
    ],
    hooks: {
      Muscle: "The queue is violent, people have waited months. Someone keeps the crew's places in line, which earns respect from a crowd that will remember it during the evacuation.",
      Face: "The Archdeacon is three places ahead. A Face can trade him a question: his answer for one of theirs.",
      Tech: "The Cantor is also a machine. A Tech character can see which of the nine hundred voices is speaking, and that one of them is silent, waiting to be filled.",
      Arcane: "The Cantor's answers rhyme with the vision. An Arcane character can hear which fragment each answer points to.",
      Stealth: "The Hush tender at the audience keeps notes. Lifting the notes shows every question every seer has asked this year.",
      Support: "An old woman in the queue is dying and wants to ask one last question. Giving her a place costs nothing and is remembered."
    },
    questions: [
      { q: "What did we ask you last time?", a: "“The same thing as always.” A pause, nine hundred mouths deep. “You never ask this one.” Keystone k5.", keystone: "k5" },
      { q: "How do we stop the end?", a: "“You don't. You never do. You make it smaller.” (True, and the most useful answer it has.)" },
      { q: "Who sent the vision?", a: "“Someone who loves you and is very tired.” (It will not say more.)" },
      { q: "What is the god?", a: "“Pregnant. With itself.” The Hush tender drops her pen." },
      { q: "Who are the Hush?", a: "“The reason you have a city to lose.” The tender looks at them for the first time." },
      { q: "Where is the Lidless?", a: "(Only if they've heard the name.) “In a doctor's back room, waiting for someone who won't blink.”" }
    ],
    notAsked: [
      { if: "Nobody asks about 'last time' or the loop.", then: "Keystone k5 is lost, and the Cantor says “the same thing as always” unprompted to someone else in the queue, a scar they may overhear.",
        recover: "None for the keystone. But the overheard line is a clue." },
      { if: "Nobody asks about the Hush.", then: "They leave still thinking the Hush are a cult.",
        recover: "The tender, watching them go, says: “You didn't ask about us. Everyone asks about us.” Then leaves a choir coin in someone's pocket." },
      { if: "They waste questions on things they could learn elsewhere (prices, names).", then: "The Cantor answers truthfully and it doesn't matter. Salvage −1 per wasted question.",
        recover: "The Archdeacon offers his question in trade, if they will tell him what they saw." }
    ],
    missed: [
      { detail: "One of the nine hundred voice-housings is empty and polished, as if it's expected.",
        means: "The 901st seat. Someone is going to be a voice in the Cantor.",
        ifMissed: "It's a Tech or Perception notice. It matters for session 10 (keystone k10's scar)." },
      { detail: "The Hush tender's notes list this crew's names with question marks already written next to them.",
        means: "The Hush knew they were coming. The Cantor told them, or the loop did.",
        ifMissed: "They'll never know how the Hush always seem to be a step ahead." },
      { detail: "When the Cantor answers, one voice lags behind the others, and it has an accent from the crew's home rib.",
        means: "Loop scar. One of the voices was one of them, in an earlier loop.",
        ifMissed: "Nothing, now. It will make sense at the Sending." }
    ],
    right: [
      { call: "They ask about the loop.", result: "Keystone k5 kept. The lifts arrive on time for a day (omen).",
        lead: "Give the player who asked a vision next session regardless of the roll.", salvage: 2, feed: "questions" },
      { call: "They trade with the Archdeacon.", result: "His answer: “Seal the Eye and it can't be born.” He believes it. It's wrong, and it's session 9.",
        lead: "The Archdeacon now counts them as allies. He'll invite them to the sealing.", salvage: 1, feed: "questions" },
      { call: "They give their place to the dying woman.", result: "She asks the Cantor whether her son will live. It says yes. It doesn't say where.",
        lead: "Her son is a lift operator. He'll hold a car for them in session 8.", salvage: 2, feed: "mercy" }
    ],
    wrong: [
      { call: "They threaten the Hush tender for her notes.", result: "The Cantor stops answering the crew for a year. Out loud. In front of everyone.",
        lead: "They're shamed in public; Cred falls, and the Hush close in clock gains a segment.", salvage: -2, feed: "violence" },
      { call: "They lie to the Cantor (claiming to be someone else).", result: "It answers the real person's question instead. Something private about a crew member is said aloud to the whole nave.",
        lead: "Pick a character's secret. The Cantor knows it. So does the queue now.", salvage: -1, feed: "lies" },
      { call: "They ask the Cantor how to kill the Hush.", result: "“Stop singing.” Everyone in the nave hears it. Two days later the Houses start asking the same question.",
        lead: "This seeds fragment 2's route B: the Houses begin their purge in session 7.", salvage: -2, feed: "violence" }
    ],
    goesWrong: [
      "The lifts arrive before they're called, all of them, at once, empty. The queue panics.",
      "A Hush tender and a Reliquary acolyte recognise the crew at the same moment.",
      "The Cantor answers a question nobody asked, and it's one of the crew's names.",
      "The empty voice-housing hums on its own when one of them walks under it."
    ],
    checks: [
      { what: "Keep their place in a furious queue", skill: "Intimidation or Persuasion", dc: 15 },
      { what: "Spot the empty voice-housing", skill: "Perception", dc: 20 },
      { what: "Lift the Hush tender's notes", skill: "Sleight of Hand", dc: 20 },
      { what: "Hear which fragment an answer points to", skill: "Arcana or Religion", dc: 15 },
      { what: "Resist the Cantor's attention (one question gets personal)", skill: "Wisdom save", dc: 15 }
    ],
    echoes: [
      { beat: "In the queue, before they reach the front", text: "A gold whisper: “Ask it about last time. We never do. Please, this time, ask it.”",
        clue: "The whisper says 'we'. The gods don't say we." },
      { beat: "As they leave", text: "They see the nave from above, as if hanging in a housing, looking down at themselves leaving.",
        clue: "One of the voices is theirs, later. The 901st seat." }
    ],
    scars: ["The Cantor, to someone else in the queue: “You asked me that last time.”", "One of the nine hundred voices has a crew member's accent."],
    cred: [
      { event: "They hold the queue for everyone, not just themselves", delta: 1 },
      { event: "The Cantor refuses them in public", delta: -2 },
      { event: "Word spreads that the Cantor answered them twice", delta: 1 }
    ],
    clocks: [{ id: "st-hush-close", name: "The Hush close in", seg: 6 }],
    npcs: [
      { id: "st-tender", name: "Hush tender (the notetaker)", template: "Netrunner", role: "The Hush",
        notes: "Keeps the audience notes. Has the crew's names with question marks already written." },
      { id: "st-cantor", name: "The Cantor", template: "Choir Fragment", role: "The choir-engine",
        notes: "Nine hundred voices. Remembers every loop. Cannot say so directly." }
    ],
    keystones: ["k5"]
  },

  /* ------------------------------------------------------------------ S6 */
  { id: "s6", act: 2, session: 6, level: 8, title: "On the book", place: "House Thorn's counting-rib · the foreclosed Seventh",
    truth: "House Thorn is foreclosing on the Seventh Rib: eleven thousand people, thirty days, and a clause nobody has read to the end. " +
      "The end of the clause says the debt is 'held against the god's rest'. Every favour on Thorn's book is literally a binding: " +
      "the ledger is one of the nails in the god's coffin, written nine hundred years ago by a Thorn who knew. Clearing debts loosens " +
      "it. Burning the ledger pulls every nail at once. The crew's own damages (from session 1) are on that book. Redemption says pay " +
      "them. The prophecy says that is fragment 4.",
    readAloud: [
      "The counting-rib is a cathedral of paper. Ledgers to the ceiling, ladders on rails, and a smell like old money and candle smoke. At the centre, chained to a lectern, the Book: nine hundred years of favours, every one still owed.",
      "Ser Ambrel Dace is waiting for you by the lectern. She has your page open. “You have come to pay,” she says, “or you have come to argue. I enjoy both.”"
    ],
    hooks: {
      Muscle: "Dace offers the duel again, and this time the stakes are the Seventh's debt. Win, and the rib gets thirty more days.",
      Face: "The clause. Someone who reads it aloud to the Seventh's people starts a movement Thorn can't collect against.",
      Tech: "Thorn's ledger has a copy in the counting-engines. Changing the copy changes nothing, the Book is the binding, but it buys time.",
      Arcane: "The Book is warm and it hums. An Arcane character can see the threads running from it down into the bone.",
      Stealth: "The oldest page is in a locked case. Reading it reveals who wrote the binding and why.",
      Support: "The Seventh's people need organising: shelters, food, a plan. A Support character becomes the rib's hero if they stay."
    },
    questions: [
      { q: "What does 'held against the god's rest' mean?", a: "Dace, honestly: “I have no idea. I collect it anyway. A city runs on promises kept.”" },
      { q: "Who wrote the first page?", a: "The oldest page, if read: a Thorn who wrote, “Every debt a nail. Let it sleep in our debt forever.” She knew." },
      { q: "What happens if the Book burns?", a: "The Thorn archivist, white: “Every favour in the city would be forgiven at once. Nobody would owe anybody anything. I… don't know what that would do.”" },
      { q: "Can we take the Seventh's debt onto ourselves?", a: "Dace, delighted: “You can. Nobody ever has. Eleven thousand favours on one page.” (The keystone way to save the rib.)", keystone: "k6" },
      { q: "(To Slate, if they've won her back) Who was the client?", a: "“The Hush. A Choirmaster called Wren Aldous. She cried when she paid me.”" }
    ],
    notAsked: [
      { if: "They don't read the clause to the end.", then: "They never learn the ledger is a binding. They'll pay their debts as redemption and complete fragment 4 without knowing.",
        recover: "The archivist mutters it while filing: “against the god's rest… always thought that was poetry.”" },
      { if: "They don't ask about taking the debt on.", then: "The only ways left to save the Seventh are paying (fragment 4 route A) or burning (route B).",
        recover: "None for the keystone. It's there to be missed." },
      { if: "They never go back to Slate.", then: "They go into session 7 without knowing the Choirmaster's name or that she hired them.",
        recover: "Tallow gives the name, if he's alive." }
    ],
    missed: [
      { detail: "A page of the ledger is missing, torn out cleanly.",
        means: "It's in the Gullet with their names crossed out in their own hands (loop scar).",
        ifMissed: "The scar still turns up, Pell finds it and gives it to them in session 7." },
      { detail: "Dace's own name is on the Book, owing the Seventh a favour.",
        means: "Dace was born in the Seventh. She's foreclosing on her own home and doing it because a promise is a promise.",
        ifMissed: "She is an obstacle. Noticed, she is a person who can be moved." },
      { detail: "The Book is warmer on pages with more debt.",
        means: "The debts are doing something physical. They're holding.",
        ifMissed: "The burn, if it happens, is a surprise in all the worst ways." }
    ],
    right: [
      { call: "They take the Seventh's debt onto their own page.", result: "Keystone k6 kept. The Seventh is saved, the nails hold, and the crew owe more than anyone in Cathedra. Dace laughs out loud (omen).",
        lead: "Their Cred goes up (the rib loves them) while their debts pile up. Dace becomes their collector and, quietly, their protector.", salvage: 4, feed: "mercy" },
      { call: "They read the clause to the Seventh's people.", result: "The rib organises. Thorn can't foreclose on eleven thousand people who all read the clause.",
        lead: "The Seventh evacuates first in session 11. Big Salvage later.", salvage: 2, feed: "questions" },
      { call: "They beat Dace in the duel and spare her.", result: "She owes them a favour. It goes on the Book. That makes her theirs.",
        lead: "Dace fights beside them at the last lullaby.", salvage: 1, feed: "mercy" }
    ],
    wrong: [
      { call: "They pay off their own debts to clear their names.", result: "Doom: fragment 4, route A. It looks exactly like redemption, and their Cred jumps. The Book's page goes cold, and somewhere below, a nail loosens.",
        lead: "Let them feel good. Then the omens get worse.", salvage: 0, feed: "mercy", doom: 4 },
      { call: "They burn the Book to save the Seventh.", result: "Doom: fragment 4, route B. Every favour in the city is forgiven at once. The ribs creak all night. Half the city thinks the crew are heroes.",
        lead: "Thorn declares them enemies of the House. Dace resigns rather than hunt them.", salvage: 1, feed: "violence", doom: 4 },
      { call: "They forge the ledger copy to wipe the Seventh's debt.", result: "It holds for a week, then Thorn finds it. The Seventh is foreclosed early, with the crew blamed.",
        lead: "The Seventh's people won't help with the evacuation.", salvage: -3, feed: "lies" }
    ],
    goesWrong: [
      "Thorn's collectors start moving families out of the Seventh while the crew are inside the counting-rib.",
      "The Book's warmth sets a candle alight nearby. Nobody meant to start the burn.",
      "The Reliquary sends an offer: they'll buy the Seventh's debt and rent the people Humanity buffers. It's legal.",
      "A Hush quieter is in the counting-rib too, singing to the Book. It turns out the Hush know exactly what the Book is."
    ],
    checks: [
      { what: "Read the clause to its end (it's long and it's written to be skipped)", skill: "Investigation", dc: 15 },
      { what: "Open the case with the oldest page", skill: "Sleight of Hand or thieves' tools", dc: 20 },
      { what: "Win the duel against Dace", skill: "Athletics or Acrobatics (contest)", dc: 20 },
      { what: "Rally the Seventh", skill: "Persuasion or Performance", dc: 15 },
      { what: "See the threads running from the Book into the bone", skill: "Arcana", dc: 20 }
    ],
    echoes: [
      { beat: "When they reach for their own page", text: "Gold and furious: “Don't pay it. Owe it. Owe everything. We paid, last time, and look.”",
        clue: "“We paid, last time”, the loop, plainly. If a player catches it, keystone k11 is close." },
      { beat: "If fire starts", text: "They see the Book burning, and themselves older, not trying to put it out.",
        clue: "The older selves are wearing the clothes the crew are wearing right now." }
    ],
    scars: ["A torn-out page of the ledger with their names crossed out in their own hands."],
    cred: [
      { event: "They save the Seventh", delta: 2 },
      { event: "They clear their own debts (Cathedra rule: clearing a debt raises Cred)", delta: 1 },
      { event: "Thorn declares them enemies", delta: -1 }
    ],
    clocks: [{ id: "st-foreclosure", name: "Foreclosure of the Seventh", seg: 8 }],
    npcs: [
      { id: "st-dace", name: "Ser Ambrel Dace", template: "Corpo Lieutenant", role: "House Thorn, collections",
        notes: "Born in the Seventh. Foreclosing on her own home because a promise is a promise." },
      { id: "st-archivist", name: "Thorn archivist", template: "Civilian", role: "House Thorn",
        notes: "Has read the clause. Thought it was poetry." }
    ],
    fragment: { n: 4, ways: ["Route A: they pay off their own debts.", "Route B: they burn the Book.", "If neither, Reliquary buys the Seventh's debt and clears it to sell buffers, offstage, next month."] },
    keystones: ["k6"]
  }
  ]
});

/* ===================================================================== ACT III */
TTST.acts.push({
  id: "a3", title: "Act III, Every Fix Feeds It", sessions: "7–9", levels: "9–11",
  summary: "They know enough to act. Every action is correct. Every action completes the vision.",
  scenes: [

  /* ------------------------------------------------------------------ S7 */
  { id: "s7", act: 3, session: 7, level: 9, title: "The Choir-house", place: "Beneath the Cantor · the Hush's cistern chapel",
    truth: "The crew find the Hush's heart: a flooded chapel under the Cantor where forty voice-tenders sing the lullaby into the city's " +
      "water in shifts. Choirmaster Wren Aldous is here. If the crew come as enemies, they win the fight, they are level 9 and the Hush " +
      "are singers, and killing the singers completes fragment 2. If they come to talk, they learn everything the Hush know: the god " +
      "must not wake, seers wake it, and the crew are the loudest alarm the Hush have ever heard. Either way, this is the midpoint, and " +
      "the fixed vision happens here. Meanwhile, the Houses, who heard the Cantor say 'stop singing', are coming to purge the Hush.",
    readAloud: [
      "Water to the knee, warm as a bath. Forty people in plain clothes stand in a ring, singing without words, and the song goes down into the water and away through a thousand pipes. None of them stop when you come in. They can't.",
      "An old woman with a brass voice-box where her throat was turns to look at you. She keeps singing. Her eyes say: I'm sorry. I'm so sorry. Please don't."
    ],
    hooks: {
      Muscle: "The Houses' purge squad is coming down the cistern stair. Someone holds the stair, for the Hush or against them.",
      Face: "The Choirmaster can't stop singing to talk. A Face has to hold a conversation with someone who answers in hand-signs and looks.",
      Tech: "The pipes are a network. A Tech character can see where the lullaby goes, and that it's already thin in three ribs.",
      Arcane: "The lullaby is a spell nine hundred years long. An Arcane character can join it, or unpick it.",
      Stealth: "Getting in unheard, in water, among people who listen for a living, is the hardest infiltration in the campaign.",
      Support: "Singers collapse from exhaustion mid-song. Keeping them standing keeps the song going."
    },
    questions: [
      { q: "Why do you kill seers?", a: "Hand-signs, translated by Tallow if present: “Every seer is a bell. It wakes to bells. We have been ringing it back to sleep for nine hundred years.”" },
      { q: "What is the god?", a: "“Dying. We sing it an easier death.” They believe it. They're wrong. If the crew tell them 'pregnant', the whole room misses a beat." },
      { q: "Can the song be stopped safely?", a: "“No. When it stops, it wakes. When it wakes, the city ends.”" },
      { q: "Can we help you sing?", a: "The Choirmaster weeps. “Nobody has ever asked.” She teaches them the first line. (Sets up keystone k10.)" },
      { q: "Who else knows you're here?", a: "“Everyone, now. The Cantor told the whole nave to stop us singing. The Houses are coming.”" }
    ],
    notAsked: [
      { if: "They come in fighting and never ask anything.", then: "Doom: fragment 2, route A. They kill the singers, the Cantor misses a note, and the whole city wakes at 3 a.m. at once.",
        recover: "A dying singer presses a choir coin into a crew member's hand and says “finish the verse”. That's all." },
      { if: "They never ask about the Houses' purge.", then: "The purge squad catches them mid-conversation and the Hush think the crew brought them.",
        recover: "Tallow warns them, if he's alive." },
      { if: "They don't ask to help sing.", then: "Keystone k10 in session 10 is much harder: they'll have to learn the song under fire.",
        recover: "The Choirmaster, if alive, offers in session 10 anyway." }
    ],
    missed: [
      { detail: "One of the singers is Pell's mother.",
        means: "Pell is a seer because she grew up with the song in her ears.",
        ifMissed: "Pell will ask them, in session 10, where her mother is." },
      { detail: "The Choirmaster's voice-box has a maker's mark: Dr. M. Vhoss.",
        means: "Vhoss has known about the Hush for years.",
        ifMissed: "Vhoss's knowledge stays hidden; ask her directly and she'll confess." },
      { detail: "The water is warmer every time a seer in the room speaks.",
        means: "The crew are waking it just by talking here.",
        ifMissed: "They'll wonder why the song keeps faltering when they argue." }
    ],
    right: [
      { call: "They spare the Choirmaster and hold the stair against the Houses.", result: "Keystone k7 kept. Every tap in the district plays one clear note at dawn (omen). The Hush owe them everything.",
        lead: "The fragment still comes true, the Houses kill some singers before they're driven off, but the Hush survive as an order.", salvage: 3, feed: "mercy" },
      { call: "They tell the Hush the god is pregnant, not dying.", result: "The song falters for a second, and the Choirmaster believes them. The Hush change what they're singing: a lullaby for a child instead of a dirge.",
        lead: "The birth, when it comes, is gentler. Salvage bonus stacks in session 11.", salvage: 2, feed: "questions" },
      { call: "They return the Lidless to the Hush (if they have it).", result: "The Hush trust them absolutely. The Choirmaster tells them where the Eye can be closed and why it mustn't be.",
        lead: "They lose the vision bonus, and gain a clear warning about session 9.", salvage: 2, feed: "mercy" }
    ],
    wrong: [
      { call: "They kill the singers.", result: "Doom: fragment 2, route A. The Cantor misses a note. Every tap in Cathedra runs silent for a full minute, and the city wakes at once.",
        lead: "The Hush that survive swear a death-oath against the crew. Tallow, if alive, is the one who brings it.", salvage: -4, feed: "violence", doom: 2 },
      { call: "They lead the Houses here, or step aside for the purge.", result: "Doom: fragment 2, route B. The Houses massacre the Hush. The crew didn't lift a blade, and everyone knows it anyway.",
        lead: "Cred goes up with the Houses and down with the street. That split is its own story.", salvage: -3, feed: "lies", doom: 2 },
      { call: "They take the Choirmaster prisoner to make her explain.", result: "Without her, the song thins in six ribs. Moths come indoors everywhere.",
        lead: "She'll explain. She'll also never forgive them.", salvage: -1, feed: "violence" }
    ],
    goesWrong: [
      "The purge squad arrives early and floods the cistern with flash-steam. Nobody can see; everybody can hear.",
      "A singer collapses and the song stops for three seconds. The ribs creak. Everyone freezes.",
      "One of the crew starts singing along without meaning to, the tune has been in their head since session 1.",
      "The water rises. Warm. Fast. The Hush keep singing as it reaches their chins."
    ],
    checks: [
      { what: "Get in without breaking the song", skill: "Stealth", dc: 20 },
      { what: "Hold a conversation in hand-signs and looks", skill: "Insight", dc: 15 },
      { what: "Join the lullaby without a wrong note", skill: "Performance", dc: 20 },
      { what: "Hold the stair against the purge", skill: "Athletics or combat", dc: 15 },
      { what: "Unpick the lullaby (why would you)", skill: "Arcana", dc: 25 }
    ],
    fixedEcho: "THE CHOIR-HOUSE (whoever is closest to the Choirmaster, 1 Humanity and a Remnant): they see themselves, older, standing in this water " +
      "with a blade, and the Choirmaster at their feet; and then the same room with the same older self singing, and the Choirmaster singing beside them. " +
      "The voice, cracking: “One of these is last time. Please let the other one be this time.”",
    echoes: [
      { beat: "As they come down the stair", text: "Gold warmth and a smell of milk: “Don't draw. Whatever you think you know, don't draw.”",
        clue: "“Whatever you think you know” is a phrase one player uses when arguing." }
    ],
    scars: ["A brass voice-box in a Gullet stall, still warm, for sale, if the Choirmaster died in any earlier scene of any loop, it is hers."],
    eyeChrome: "If they kill a Hush tender here, roll a d6 for the Lidless on the body (a 6).",
    cred: [
      { event: "They drive off the Houses' purge", delta: 1 },
      { event: "They massacre the Hush", delta: -2 },
      { event: "The Houses credit them with the purge (they didn't stop it)", delta: 1 }
    ],
    clocks: [{ id: "st-purge", name: "The Houses' purge reaches the cistern", seg: 4 }],
    npcs: [
      { id: "st-aldous", name: "Choirmaster Wren Aldous", template: "Choir Fragment", role: "The Hush",
        notes: "Hired them through Slate. Has to order their deaths and hates it. Keystone k7." },
      { id: "st-purge", name: "House purge squad", template: "Street Samurai", role: "Houses Thorn and Reliquary",
        notes: "Sent because the Cantor said 'stop singing'. Doing their jobs." }
    ],
    fragment: { n: 2, ways: ["Route A: they kill the singers.", "Route B: they let the Houses purge the Hush.", "If they save the Hush entirely, the fragment waits for session 10's last lullaby, which fails."] },
    keystones: ["k7"]
  },

  /* ------------------------------------------------------------------ S8 */
  { id: "s8", act: 3, session: 8, level: 10, title: "The pilgrimage", place: "The Sevenfold Spine · forty thousand pilgrims climbing",
    truth: "Forty thousand pilgrims climb the Spine to pray at the Crown: a week without signal, every car full. Their prayer, all at " +
      "once, is the loudest bell the god has ever heard. The Hush want to stop them reaching the top. The Houses want the tithe. The " +
      "crew know the Spine snaps, Ines Varro saw it. Every way to stop the prayer or save the pilgrims puts more weight on the Spine " +
      "or cuts it. The keystone way is to get the pilgrims off the Spine entirely, by rope, net and the ribs themselves.",
    readAloud: [
      "The Spine is singing. Not the lullaby, something older. Forty thousand people in the cars and on the service stairs, all humming the same pilgrim hymn, and the cables are humming back.",
      "Ines Varro's hands are shaking on her lever. “This is it,” she says. “This is exactly what I saw. They're singing. Everyone on it was singing.”"
    ],
    hooks: {
      Muscle: "Cars are jamming at the seventh stop. Someone has to physically move a car full of pilgrims off the line.",
      Face: "The pilgrims won't leave the Spine for anyone. A Face has to talk a crowd of forty thousand into a different miracle.",
      Tech: "No signal for a week, but the Spine's own control lines are ichor, not radio. A Tech character can reroute the whole Spine from one junction box.",
      Arcane: "The prayer is real magic, and it's pointed at the god. An Arcane character can bend it, toward the Hush's lullaby instead.",
      Stealth: "A Hush strike team is heading for the main cable with pipe-knives. Someone has to find them in forty thousand people.",
      Support: "The ropes-and-nets evacuation needs organising, and the Long Fall rule means every slip is a district-sized drop."
    },
    questions: [
      { q: "(To Ines) What exactly did you see snap?", a: "“The main cable, at the seventh stop. Not the rails. The cable.” (They know where it will break.)" },
      { q: "(To the Hush) Are you going to cut it?", a: "Tallow or any Hush: “If they reach the top, the god wakes. We'd rather lose the Spine than the city.”" },
      { q: "Can we get them off without the lifts?", a: "Ines, slowly: “The ribs have service ladders every forty feet. Ropes. Nets. It'd take all night. Nobody would believe you.” (Keystone k8.)", keystone: "k8" },
      { q: "(To the pilgrims' abbess) What are you praying for?", a: "“For the god to wake and forgive us.” She means it kindly. It's the worst possible prayer." },
      { q: "Whose son holds a car for us? (If they helped the dying woman in session 5)", a: "Her son, a lift operator, holds a car at the seventh stop exactly as long as they need." }
    ],
    notAsked: [
      { if: "They never ask Ines where it snaps.", then: "They protect the wrong part of the Spine.",
        recover: "A vision at the key moment, if the roll hits." },
      { if: "They don't ask the Hush what they're planning.", then: "The Hush cut the cable while the crew are fighting on the rails. Route C.",
        recover: "None. The Hush act. That's what the Hush do." },
      { if: "They don't consider ropes.", then: "Every option left puts weight on the Spine or cuts it.",
        recover: "A Support or Muscle character's hook points at the service ladders; if nobody takes it, the keystone is gone." }
    ],
    missed: [
      { detail: "The pilgrim hymn has the same melody as the lullaby, played backwards.",
        means: "The prayer is a wake-up call, literally.",
        ifMissed: "An Arcane check can still find it mid-scene; if nobody does, the prayer completes unopposed." },
      { detail: "The snapped cable (if it snaps) is tied in a knot one of the crew always ties.",
        means: "Loop scar. Their future selves tied it, trying to stop it, last time.",
        ifMissed: "It's still there afterwards, dangling at the seventh stop, for anyone who looks." },
      { detail: "The abbess is carrying one of Pell's drawings.",
        means: "Pell's drawings are spreading as scripture. The four figures are becoming saints.",
        ifMissed: "In session 11, the survivors call the crew by the figures' names." }
    ],
    right: [
      { call: "They get the pilgrims off by rope, net and ribs.", result: "Keystone k8 kept. The Spine still snaps, the Hush cut it, or the prayer's weight does, but it's empty when it goes. A rope holds that shouldn't have (omen).",
        lead: "Forty thousand people owe the crew their lives. Salvage jumps. Cred jumps.", salvage: 5, feed: "mercy" },
      { call: "They turn the pilgrims' prayer into the lullaby.", result: "The prayer goes into the water instead of up the Spine. The god rolls over and sleeps a little longer.",
        lead: "Doom is delayed by one session, the birth begins at session 11's end instead of its start.", salvage: 2, feed: "questions" },
      { call: "They stop the Hush strike team without killing them.", result: "The Hush don't cut the cable. The Spine snaps later, on its own, with fewer people on it.",
        lead: "The Hush trust them a little more.", salvage: 2, feed: "mercy" }
    ],
    wrong: [
      { call: "They evacuate everyone by the lifts, as fast as possible.", result: "Doom: fragment 5, route A. The Spine takes more weight than it ever has. The main cable goes at the seventh stop with twelve cars on it.",
        lead: "They saved thousands and lost hundreds. Both things are true. Let the table sit with it.", salvage: -2, feed: "mercy", doom: 5 },
      { call: "They cut the cable themselves to stop the pilgrims reaching the top.", result: "Doom: fragment 5, route B. It works. The prayer is stopped. The Spine is gone, and everyone knows who cut it.",
        lead: "Cred crashes. The Hush, astonishingly, respect them for it.", salvage: -3, feed: "violence", doom: 5 },
      { call: "They let the pilgrimage reach the top.", result: "The prayer lands. Every omen on the table happens at once, over one night.",
        lead: "Doom advances by two: tick fragment 5 (the Spine gives under the return trip) and roll omens three times.", salvage: -3, feed: "lies", doom: 5 }
    ],
    goesWrong: [
      "A pilgrim car detaches and hangs by one clamp over a Long Fall of four districts.",
      "The abbess declares the crew heretics. Forty thousand people turn around.",
      "Ser Ambrel Dace arrives to collect the Spine's tithe and finds the Spine emptying. She has a choice to make, and so do they.",
      "The Hush strike team and a Reliquary security detail meet on the rails and start fighting in the middle of the pilgrims."
    ],
    checks: [
      { what: "Talk forty thousand pilgrims into a different miracle", skill: "Persuasion or Religion", dc: 25 },
      { what: "Reroute the Spine from a junction box", skill: "Technology", dc: 20 },
      { what: "Find the Hush strike team in the crowd", skill: "Perception or Investigation", dc: 20 },
      { what: "Rig nets and ropes on the rib-ladders", skill: "Athletics or Survival", dc: 15 },
      { what: "Catch a falling pilgrim (Long Fall rule)", skill: "Acrobatics or Athletics", dc: 20 }
    ],
    echoes: [
      { beat: "When they reach the seventh stop", text: "Gold and quiet: a knot, tied slowly, by hands they know. “Not the rails. The ribs. The ribs have ladders.”",
        clue: "The hands tying the knot tie it the way one character ties knots." },
      { beat: "When the cable starts to hum", text: "They see the Spine from below, empty, snapping, and cheering. People cheering.",
        clue: "Everyone cheering is on the ribs, not the Spine. The future selves are showing what worked." }
    ],
    scars: ["The snapped Spine cable, tied in a knot one of the crew always ties."],
    cred: [
      { event: "The pilgrims get off alive", delta: 3 },
      { event: "Cars fall with people in them", delta: -2 },
      { event: "They cut the Spine themselves", delta: -3 }
    ],
    clocks: [{ id: "st-spine", name: "Pilgrims on the Spine", seg: 6 }],
    npcs: [
      { id: "st-ines", name: "Ines Varro", template: "Civilian", role: "Lift operator · second petitioner",
        notes: "Knows exactly where it snaps. Her hands are shaking." },
      { id: "st-abbess", name: "The pilgrims' abbess", template: "Civilian", role: "Leads the pilgrimage",
        notes: "Praying for the god to wake and forgive. Means it kindly." },
      { id: "st-strike", name: "Hush strike team", template: "House Enforcer", role: "The Hush",
        notes: "Going to cut the main cable. Would rather lose the Spine than the city." }
    ],
    fragment: { n: 5, ways: ["Route A: evacuating by the lifts.", "Route B: the crew cut the cable.", "Route C: the Hush cut it."] },
    keystones: ["k8"]
  },

  /* ------------------------------------------------------------------ S9 */
  { id: "s9", act: 3, session: 9, level: 11, title: "Close the Eye", place: "The Eye · House Reliquary's viewing gallery",
    truth: "Archdeacon Uln Sarrow has studied his minute for months and reached a conclusion: the vision can't come true if the Eye " +
      "can't see it. He means to seal the Eye with a reliquary shroud tonight, and he has invited the crew, his fellow seers, to " +
      "witness it. It will not stop anything. It closes the god's old eye, which is fragment 6, and it is also the only way the " +
      "future selves can send visions, which means sealing it would stop the help. The keystone path is to leave it open and stop " +
      "the sealing. There's also a quiet auction tonight in the gallery, and lot 41 is the Lidless.",
    readAloud: [
      "The Eye fills the gallery wall: a frozen iris the size of a warehouse, faintly tracking, the pupil wet and deep. People in their best clothes are drinking wine in front of it.",
      "The Archdeacon takes your hands like an old friend. “We are the ones who saw it,” he says. “Tonight we close its eye, and none of us has to see it again.”"
    ],
    hooks: {
      Muscle: "The shroud is carried by twelve acolytes on poles. Stopping it means stopping twelve people who think they're saving the world.",
      Face: "The Archdeacon trusts them. A Face can talk him out of it, if they can explain what they know without sounding mad.",
      Tech: "The shroud is wired: ichor threads, a prayer-circuit. A Tech character can make it fail without anyone knowing why.",
      Arcane: "Looking into the Eye tonight, an Arcane character sees it look back, and sees, very faintly, a figure on the other side.",
      Stealth: "Lot 41 at the quiet sale is the Lidless. Someone lifts it while the room is watching the shroud.",
      Support: "The Archdeacon hasn't slept in months. Someone who sits with him and listens hears everything he knows."
    },
    questions: [
      { q: "(To the Archdeacon) What if closing it doesn't stop anything?", a: "“Then I will have tried.” He has no second plan. He is very tired." },
      { q: "What did your minute show, exactly?", a: "“Four figures in the ruins. One holding the Eye.” He looks at them. “It was you. I have known since the chapel.”" },
      { q: "(Looking into the Eye) Who's on the other side?", a: "For a heartbeat, someone waves. It's one of them. Older." },
      { q: "What's lot 41?", a: "The auctioneer: “Ocular relic, provenance lost. It doesn't blink.” (The Lidless.)" },
      { q: "Can the Eye be damaged?", a: "The Archdeacon: “Easily. It's glass and dream. That's why I'm sealing it rather than breaking it.”" }
    ],
    notAsked: [
      { if: "They don't look into the Eye.", then: "They miss the figure on the other side, the plainest clue in the campaign.",
        recover: "Pell, if present, looks, and says “it's you”." },
      { if: "They don't ask what the Archdeacon saw.", then: "They never learn he's known who the four figures are since the chapel.",
        recover: "He tells them anyway, at the end of the night, whatever happens." },
      { if: "They don't notice the auction.", then: "The Lidless goes to House Thorn and is never seen again until the ruins.",
        recover: "The last chance is session 12, on a corpse." }
    ],
    missed: [
      { detail: "The Archdeacon's safe holds a second cornea shard, labelled in one crew member's handwriting: 'the Fifth Minute'.",
        means: "Loop scar. Someone, last time, recorded more.",
        ifMissed: "It's a scar, not a clue; missing it costs nothing but a chill." },
      { detail: "The Eye's pupil tracks whoever saw the vision most clearly.",
        means: "It's looking for them. It always has been.",
        ifMissed: "Nothing. It's the kind of detail that makes a table go quiet when someone notices." },
      { detail: "In the Eye's reflection, for a second, there are two of each of them.",
        means: "The loop. Them now, and them then.",
        ifMissed: "The same reflection returns at the Sending, and it will make sense." }
    ],
    right: [
      { call: "They stop the sealing and leave the Eye open.", result: "Keystone k9 kept. The Eye looks at them, not through them (omen). The fragment still comes true: the god closes its old eye on its own at the end of the night, to open a new one.",
        lead: "The visions continue. The Archdeacon, humbled, joins them.", salvage: 2, feed: "questions" },
      { call: "They win or lift the Lidless.", result: "Visions now hit on 16+. The Lidless whispers: one detail, one minute early, each session.",
        lead: "The Hush will want it. So will Thorn, who bid on it.", salvage: 1, feed: "questions" },
      { call: "They tell the Archdeacon the truth and he believes them.", result: "House Reliquary starts quietly evacuating the Crown. Of all the Houses, Reliquary gets its people out.",
        lead: "Big Salvage in session 11.", salvage: 3, feed: "questions" }
    ],
    wrong: [
      { call: "They help seal the Eye.", result: "Doom: fragment 6, route B. The Eye closes. The visions stop. For the first time in months, nobody sees anything coming.",
        lead: "Roll no more random visions for the rest of the campaign. The fixed one at the Sending still happens. Let them notice the silence.", salvage: -2, feed: "lies", doom: 6 },
      { call: "They blind the Eye themselves to stop the visions.", result: "Doom: fragment 6, route A. It weeps light across the gallery. Everyone who was looking loses an hour of their memory.",
        lead: "Same as sealing: no more random visions. And the crew did it, in front of the city's rich.", salvage: -3, feed: "violence", doom: 6 },
      { call: "They steal the Eye's cornea shard (the Fifth Minute) and run.", result: "It cracks on the first step that isn't holy, like the first one. Everyone gets a flash of the Sending.",
        lead: "Give them the session-12 vision early, broken and out of order. Chaos. Wonderful chaos.", salvage: -1, feed: "questions" }
    ],
    goesWrong: [
      "The Hush arrive to stop the sealing too, by killing the Archdeacon.",
      "The shroud catches on the Eye's lash and tears; the Eye half-closes, and everyone in the gallery sees one second of the birth.",
      "Thorn outbids everyone on lot 41 and walks out with it. Dace carries the box.",
      "The Eye's pupil dilates and the gallery floor tilts toward it. Everyone slides."
    ],
    checks: [
      { what: "Talk the Archdeacon out of it", skill: "Persuasion or Insight", dc: 20 },
      { what: "Sabotage the shroud's prayer-circuit", skill: "Technology or Arcana", dc: 20 },
      { what: "Lift lot 41 during the ceremony", skill: "Sleight of Hand", dc: 20 },
      { what: "Outbid Thorn on lot 41 (grams or favours)", skill: "Persuasion", dc: 15 },
      { what: "Look into the Eye and see the other side", skill: "Wisdom save", dc: 20 }
    ],
    echoes: [
      { beat: "When the shroud is raised", text: "Gold, urgent, crackling like a bad line: “Leave it open. If you close it we can't reach you. We can't...”",
        clue: "“We can't reach you.” The gods can reach anywhere. Whoever this is, can't." },
      { beat: "Looking into the Eye", text: "They see a hand press against the inside of the Eye, and the hand is theirs.",
        clue: "The plainest clue in the campaign. If they get it, keystone k11 is theirs to take." }
    ],
    scars: ["A second cornea shard labelled 'the Fifth Minute' in one crew member's handwriting.", "Two of each of them in the Eye's reflection."],
    eyeChrome: "Lot 41 at the Reliquary's quiet sale is the Lidless: outbid Thorn, or steal it.",
    cred: [
      { event: "The Archdeacon publicly thanks them", delta: 1 },
      { event: "They blind the Eye in front of the rich", delta: -2 },
      { event: "Reliquary evacuates the Crown on their word", delta: 2 }
    ],
    clocks: [{ id: "st-sealing", name: "The sealing ceremony", seg: 4 }],
    npcs: [
      { id: "st-sarrow", name: "Archdeacon Uln Sarrow", template: "Civilian", role: "House Reliquary · fourth petitioner",
        notes: "Sealing the Eye tonight. Has known the four figures are the crew since the chapel." },
      { id: "st-auctioneer", name: "Reliquary auctioneer", template: "Civilian", role: "House Reliquary",
        notes: "Lot 41: ocular relic, provenance lost. It doesn't blink." }
    ],
    fragment: { n: 6, ways: ["Route A: the crew blind the Eye.", "Route B: the Archdeacon seals it.", "If neither, the god closes its old eye itself at dawn to open a new one."] },
    keystones: ["k9"]
  }
  ]
});

/* ====================================================================== ACT IV */
TTST.acts.push({
  id: "a4", title: "Act IV, The Birth", sessions: "10–12", levels: "12",
  summary: "The song fails, the god is born, and in the ruins they find out who has been helping them all along.",
  scenes: [

  /* ----------------------------------------------------------------- S10 */
  { id: "s10", act: 4, session: 10, level: 12, title: "The last lullaby", place: "Every pipe in Cathedra · the Choir-house and the Cantor's nave",
    truth: "However many singers are left, it is not enough. Tonight the Hush attempt one last lullaby: every tender, every bath-keeper, " +
      "every well-singer, at once, to hold the god asleep through the night. It fails. It always fails. If fragment 2 hasn't come " +
      "true yet, it comes true here (route C). What the crew decide is where they stand when it fails: singing with the Hush " +
      "(keystone k10, and the birth starts slow enough to walk out of), guarding the doors, or getting people out.",
    readAloud: [
      "At midnight every tap in Cathedra opens by itself, and the whole city hears it for the first time: a lullaby with no words, " +
      "sung by more people than you knew existed, coming out of the walls.",
      "Under it, something enormous and very new is humming along."
    ],
    hooks: {
      Muscle: "The Houses' last purge squad wants to silence the pipes by force. The crew are the only people who can stop them.",
      Face: "Half the city is panicking. A Face on the Cantor's own voice-lines can tell eleven districts what's happening, or lie to them kindly.",
      Tech: "The pipes are overloading. A Tech character keeps the song flowing to the ribs that need it most, choosing who hears it.",
      Arcane: "The lullaby is failing because it's the wrong song. An Arcane character can hear what the god is humming and change the lullaby to match.",
      Stealth: "Pell has gone missing again, to the Choir-house, to find her mother. Someone has to go through the pipes to get her.",
      Support: "Singers are collapsing all over the city. Every one kept standing is a minute longer before the birth."
    },
    questions: [
      { q: "(To the Choirmaster) How long can you hold it?", a: "“Until dawn, if nobody stops. Somebody will stop.”" },
      { q: "Can we sing?", a: "“Yes. Stand with us. You've been singing since the chapel whether you knew it or not.” Keystone k10.", keystone: "k10" },
      { q: "What is it humming?", a: "An Arcane check or the Choirmaster: “The same song, backwards. It's singing itself awake. It learned it from us.”" },
      { q: "Where's the 901st voice-housing?", a: "In the Cantor's nave, polished, waiting. The Choirmaster: “For whoever sings last.”" },
      { q: "Who's getting people out?", a: "Whoever they've made allies of: Cobb's crew, Ines's operators, the Seventh's organisers, the Reliquary. If none, nobody." }
    ],
    notAsked: [
      { if: "They don't ask to sing.", then: "Keystone k10 lost. The crew guard the doors, the lullaby fails at 3 a.m. instead of dawn, and the birth starts fast.",
        recover: "None. Put a scar in the Cantor: nine hundred and one voices." },
      { if: "They never ask who's evacuating.", then: "They find out in the morning that nobody was.",
        recover: "Any Salvage allies they've built act on their own: Cobb, Ines, the Seventh, Reliquary. Count each as +2 Salvage." },
      { if: "They don't look for Pell.", then: "Pell is found in the Choir-house in the morning, asleep, and she won't wake. She is dreaming the four figures.",
        recover: "She wakes at the birth, if someone carries her out." }
    ],
    missed: [
      { detail: "The god's humming has words, very faintly, and they are things the crew have said.",
        means: "It learned to speak from them.",
        ifMissed: "The newborn will quote them in session 11, and they'll recognise it." },
      { detail: "One of the singers is Tallow (if alive), and he is singing the part that used to be the crew's to sing, in the loops where they sang.",
        means: "Loop scar: there is a part in the song for them.",
        ifMissed: "Nothing. But Tallow will say so, if asked." },
      { detail: "The 901st housing starts humming on its own as the song thins.",
        means: "Someone will fill it tonight or at the Sending.",
        ifMissed: "At the Sending, the housing has a voice in it, and it's familiar." }
    ],
    right: [
      { call: "They sing with the Hush until the song fails.", result: "Keystone k10 kept. It fails at dawn instead of 3 a.m., and the birth starts slow enough to walk out of (omen).",
        lead: "Every district with an ally in it evacuates in time. Salvage from every ally counts double.", salvage: 4, feed: "mercy" },
      { call: "They change the lullaby to match the god's humming.", result: "It stops being a sleep-song and becomes a birth-song. The god calms. The birth, when it comes, is careful.",
        lead: "Feed questions +2. The newborn will be curious rather than frightened.", salvage: 2, feed: "questions" },
      { call: "They get Pell out of the pipes.", result: "Pell finishes her drawing on the way: four figures in the ruins, and now she can see their faces.",
        lead: "She gives them the drawing. It is exactly them, older. The clearest clue before the Sending.", salvage: 1, feed: "mercy" }
    ],
    wrong: [
      { call: "They guard the doors and fight the purge squad instead of singing.", result: "The song fails at 3 a.m. Doom: fragment 2 completes by route C if it hasn't already.",
        lead: "They win the fight. It doesn't matter. Let them see that it didn't matter.", salvage: 0, feed: "violence", doom: 2 },
      { call: "They silence the pipes themselves to stop the city panicking.", result: "The god wakes all at once. The birth starts immediately and fast.",
        lead: "Skip to session 11 tonight. No evacuation time at all. Salvage −3 on top.", salvage: -3, feed: "lies", doom: 2 },
      { call: "They leave the city while they can.", result: "They reach the top of the ribs as the song fails, and turn to look back.",
        lead: "Session 11 happens around them anyway, the ribs open above the road. They are still at the centre.", salvage: -4, feed: "lies" }
    ],
    goesWrong: [
      "The Choirmaster's voice-box fails mid-song. Someone has to take her line.",
      "The Houses cut the water to the Crown to save the rich from 'the noise'. The Crown's song goes silent first.",
      "The purge squad reaches the Cantor's nave and starts pulling voice-housings down.",
      "The ribs flex hard enough to throw everyone standing. Long Fall rule for anyone near an edge."
    ],
    checks: [
      { what: "Sing the lullaby without a wrong note, for an hour", skill: "Performance (three successes before two failures)", dc: 20 },
      { what: "Hear the words in the god's humming", skill: "Insight or Arcana", dc: 20 },
      { what: "Route the song through overloaded pipes", skill: "Technology", dc: 20 },
      { what: "Hold the nave against the purge", skill: "Athletics or combat", dc: 20 },
      { what: "Reach Pell through the pipes", skill: "Stealth or Acrobatics", dc: 20 }
    ],
    echoes: [
      { beat: "When the first singer falls", text: "Gold, and very close: “Sing. Just sing. You know the words. You wrote some of them.”",
        clue: "“You wrote some of them”, the lullaby has lines in it that came from the crew, from other loops." },
      { beat: "At 3 a.m., whatever is happening", text: "They see dawn from the ruins, and a figure holding up the Eye to the light like a lantern, waving.",
        clue: "The figure is waving to them. The gods don't wave." }
    ],
    scars: ["Nine hundred and one voices in the Cantor, and one of them is theirs.", "Tallow, singing the crew's part of the song."],
    cred: [
      { event: "They sing with the Hush in front of the city", delta: 2 },
      { event: "The city hears them on the Cantor's lines, telling the truth", delta: 2 },
      { event: "They flee", delta: -3 }
    ],
    clocks: [{ id: "st-lullaby", name: "The last lullaby holds", seg: 8 }],
    npcs: [
      { id: "st-aldous", name: "Choirmaster Wren Aldous", template: "Choir Fragment", role: "The Hush",
        notes: "Leads the last lullaby. Her voice-box is failing." },
      { id: "st-purge2", name: "Last purge squad", template: "Hunter-Killer", role: "The Houses",
        notes: "Sent to silence the pipes by force." }
    ],
    fragment: { n: 2, ways: ["Route C: the last lullaby fails, with or without them, if fragment 2 isn't ticked already."] },
    keystones: ["k10"]
  },

  /* ----------------------------------------------------------------- S11 */
  { id: "s11", act: 4, session: 11, level: 12, title: "The birth", place: "Cathedra, as it opens",
    truth: "Dawn. The ribs open like a hand. The god is born, not out of the corpse, but as it: the old body unfolding into the new " +
      "one, and everything built inside it falling or walking out along its arm. The newborn remembers the crew. What it is depends " +
      "on Feed. How many get out depends on Salvage. The crew are at the centre whatever they do: the thing being born looks for " +
      "them first. This is the set piece. It is not a boss fight unless they make it one.",
    readAloud: [
      "The ribs are opening. Not breaking, opening, slowly, the way fingers uncurl. Districts tilt. Lifts hang sideways. Light comes up from the Marrowworks like a sunrise from underneath.",
      "And something enormous and very new turns its attention toward you, and says, in your own voice: “There you are.”"
    ],
    hooks: {
      Muscle: "The Seventh's tilt is sliding eleven thousand people toward a Long Fall. Someone holds the rail.",
      Face: "The newborn is talking, in their voices. Someone has to answer it. What they say is part of what it becomes.",
      Tech: "The Spine is gone, but the ribs have ladders and the Cantor's pipes still carry voice. A Tech character runs the evacuation's comms.",
      Arcane: "The birth is a ritual nine hundred years long. An Arcane character can steady it, slow it, at a cost in Humanity.",
      Stealth: "People are trapped in sealed House chapels with dead air: no comms, no signal. Someone has to go in person.",
      Support: "The Streetdocs are overwhelmed. Every ichor ampule in the city is being used at once, and every one costs Humanity."
    },
    questions: [
      { q: "(To the newborn) What are you?", a: "Answer by Feed. Mercy: “Yours.” Violence: “Afraid.” Lies: “Whatever you want me to be.” Questions: “I don't know yet. What should I be?”" },
      { q: "(To the newborn) Do you remember us?", a: "“Every time.” (The loop, from the god's mouth.)" },
      { q: "Where is the Eye?", a: "The old Eye has closed (fragment 6), but it is still there, in the ruins of the Reliquary gallery, and it's still open on the inside. Someone has to go and get it." },
      { q: "Can it be slowed?", a: "Yes, by singing, by an Arcane character spending Humanity, or by asking it to. Each slows it by an hour; every hour is +1 Salvage." },
      { q: "(To the newborn) What do you want?", a: "“To see.” It will follow whoever has the Eye." }
    ],
    notAsked: [
      { if: "They never talk to the newborn.", then: "It learns from what they do instead of what they say. Feed is whatever they fed it; no chance to tip it now.",
        recover: "It speaks to them again at the Sending." },
      { if: "They don't ask about the Eye.", then: "They go into the Sending without knowing where it is.",
        recover: "The newborn looks toward it. It's the only thing it's looking at." },
      { if: "They don't ask whether it can be slowed.", then: "The birth takes the time it takes. No bonus Salvage.",
        recover: "None." }
    ],
    missed: [
      { detail: "The newborn has a scar across one finger, exactly where one character has a scar (see session 4).",
        means: "It learned its shape from them.",
        ifMissed: "At the Sending, somebody finally notices." },
      { detail: "Every one of Pell's drawings, wherever it's pinned in the city, is glowing.",
        means: "The four figures are about to happen.",
        ifMissed: "Nothing. They're walking into the drawing either way." },
      { detail: "The survivors call out to the crew by the saints' names from the pilgrim drawings.",
        means: "The crew are becoming a story the city tells.",
        ifMissed: "The epilogue uses those names regardless." }
    ],
    right: [
      { call: "They talk to the newborn gently and honestly.", result: "Feed questions or mercy +2. It slows to listen. Every minute it listens, people get out.",
        lead: "Let the conversation be long. This is the emotional heart of the campaign.", salvage: 3, feed: "questions" },
      { call: "They go back for the people in the dead-air chapels.", result: "Hundreds saved who would have been lost. Nobody would have known.",
        lead: "Salvage for the unseen. Tell them, in the epilogue, exactly how many.", salvage: 3, feed: "mercy" },
      { call: "They slow the birth with song or Humanity.", result: "Each hour is +1 Salvage. The cost is theirs to pay.",
        lead: "Let them decide how much of themselves they spend. Big moment: Humanity cost and a Remnant each (big-moments rule).", salvage: 2, feed: "mercy" }
    ],
    wrong: [
      { call: "They attack the newborn.", result: "It's afraid, and it learns what fear does. Feed violence +3. The birth speeds up.",
        lead: "It's not a winnable fight and it shouldn't be one. Let them do damage; let it cry.", salvage: -3, feed: "violence" },
      { call: "They lie to the newborn to make it leave.", result: "It believes them. It learns how. Feed lies +3.",
        lead: "It will be very good at lying to them for the rest of their lives.", salvage: -1, feed: "lies" },
      { call: "They save only themselves and the people they know.", result: "They get out fast. So do their friends. Almost nobody else does.",
        lead: "Salvage band drops. The survivors know who ran.", salvage: -4, feed: "lies" }
    ],
    goesWrong: [
      "The Crown slides. House Reliquary's entire chapel tips into the open air, full of people and dead air.",
      "The newborn reaches for the crew with one enormous finger. Being touched costs 1 Humanity and is the kindest thing that has ever happened to them.",
      "The last of the Houses' guards open fire on the newborn. It flinches, and a district goes with it.",
      "Mother Slate, Ketch, Dace, Vhoss, Cobb, Ines, Pell, pick whichever NPC they love most. They're in the wrong place."
    ],
    checks: [
      { what: "Hold the Seventh's rail against the tilt", skill: "Athletics", dc: 25 },
      { what: "Talk to the newborn without breaking", skill: "Wisdom save", dc: 20 },
      { what: "Steady the birth (per hour, 1 Humanity each try)", skill: "Arcana", dc: 20 },
      { what: "Run the evacuation's voice-lines", skill: "Technology or Persuasion", dc: 20 },
      { what: "Reach the dead-air chapels", skill: "Acrobatics or Stealth", dc: 20 }
    ],
    echoes: [
      { beat: "When the ribs begin to open", text: "Gold, clear, very calm for once: “Go to the Eye when it's done. We'll be waiting. We always are.”",
        clue: "“We'll be waiting.” The future selves are about to be them." }
    ],
    scars: ["DON'T STOP THE DRILL, on the shaft wall, warm and glowing as the Marrowworks opens."],
    cred: [
      { event: "They stay and get people out", delta: 3 },
      { event: "They run", delta: -4 }
    ],
    clocks: [{ id: "st-birth", name: "The birth", seg: 8 }],
    npcs: [
      { id: "st-newborn", name: "The newborn", template: "Choir Fragment", role: "The god, born again",
        notes: "Remembers them. What it is depends on Feed. Not a fight unless they make it one." }
    ],
    fragment: { n: 7, ways: ["The birth. Fixed. (The 1% path changes how it happens, not whether.)"] },
    keystones: []
  },

  /* ----------------------------------------------------------------- S12 */
  { id: "s12", act: 4, session: 12, level: 12, title: "The Sending", place: "The ruins · the Eye, still open on the inside",
    truth: "After the birth, in the ruins of the Reliquary gallery, the crew find the Eye closed on the outside and still open on the " +
      "inside. Standing in front of it, they understand what it does: it sends. Every vision they ever had came from here, from " +
      "them. They are the future selves now. The last choice of the campaign is literally the first vision: what do they send back? " +
      "Default: they send what they received, the loop closes, and it all happens again as it just did. Different: the next loop " +
      "is worse, or stranger, describe it. With all twelve keystones kept, they already know exactly what to send, and the loop " +
      "closes clean: the moth ending.",
    readAloud: [
      "The gallery is open to the sky now. The Eye lies on its side in the rubble, closed, and then, when you step in front of it, you see it is still open on the inside, like a window seen from the wrong side of the glass.",
      "In it, very small, very far away, you see yourselves: younger, soaked, lying on the chapel steps in the rain. The Eye waits for you to decide what they should see."
    ],
    hooks: {
      Muscle: "Lifting the Eye takes all of them. It's heavy the way a memory is heavy.",
      Face: "Someone has to speak the vision into the Eye. The words are theirs to choose, and the players should choose them, out loud.",
      Tech: "The Eye has a memory. A Tech character can see the log of every vision ever sent through it, including sendings from earlier loops.",
      Arcane: "An Arcane character understands the cost: whoever sends pays in Humanity, and the Remnant is permanent.",
      Stealth: "Among the rubble are bodies from earlier loops. Someone goes through their pockets. (The Lidless is on one.)",
      Support: "Someone has to hold the whole thing together, the crew, the survivors, the newborn watching over the gallery wall."
    },
    questions: [
      { q: "Who sent the visions?", a: "They did. They're about to. Let a player say it before you confirm it." },
      { q: "Can we send something different?", a: "Yes. The Eye doesn't care. The loop does." },
      { q: "What did we receive?", a: "Read them the echo log from this tab, in order. Every vision they got. This is k12's check.", keystone: "k12" },
      { q: "Who are the bodies?", a: "Them. Earlier loops. Some older than others." },
      { q: "(To the newborn) What should we send?", a: "By Feed. Questions: “Send them a question.” Mercy: “Send them each other.” Violence: “Send them a weapon.” Lies: “Send them what they want to hear.”" }
    ],
    notAsked: [
      { if: "They don't ask what they received.", then: "They improvise the sending from memory. Almost certainly it's not exact, k12 is lost.",
        recover: "None. That's the point: the players have to have been paying attention for twelve sessions." },
      { if: "They never wonder about the bodies.", then: "The Lidless stays in the rubble, and they don't see how many times this has happened.",
        recover: "The newborn tells them: “You've been here so often.”" },
      { if: "They don't ask whether it can be different.", then: "They send the same, and it's the default ending. That's fine; most tables will.",
        recover: "-" }
    ],
    missed: [
      { detail: "The Eye's log shows many sendings. Each loop, the visions are a little different, and every loop they got a little closer.",
        means: "They are not the first to try, and they won't be the last, unless.",
        ifMissed: "The ending is still whole. This is for the table that looks." },
      { detail: "The newborn has the same scar as one of them.",
        means: "It learned its shape from them.",
        ifMissed: "Describe it in the epilogue." },
      { detail: "Pell's last drawing, if they carried her out, has five figures: the four, and a child holding their hands.",
        means: "Pell is with them. Pell was always going to be.",
        ifMissed: "Give them the drawing in the epilogue." }
    ],
    right: [
      { call: "They send back exactly what they received, in order (all twelve keystones kept).", result: "The moth ending. The loop closes clean.",
        lead: "Read the moth ending. Tell them how close they came: they came all the way.", salvage: 5, feed: "questions" },
      { call: "They send back exactly what they received (keystones not all kept).", result: "The loop closes as it has before. Salvage decides the epilogue band.",
        lead: "The bittersweet default. Read the band and the Feed result.", salvage: 2, feed: "questions" },
      { call: "They send a message of their own to one particular character.", result: "The loop takes it. Next time, that character has one more piece of help. It isn't enough, but it's more.",
        lead: "Describe the next loop in one line: something small that goes better.", salvage: 1, feed: "mercy" }
    ],
    wrong: [
      { call: "They send nothing.", result: "Paradox. The Eye goes dark. The past crew never saw the Fourth Minute, never failed the job, and the city fell anyway, with nobody warning anyone.",
        lead: "Salvage drops to 0 for the epilogue. The survivors, whoever they are, never heard of the crew.", salvage: -10, feed: "lies" },
      { call: "They send a warning to stop the heist.", result: "The past crew don't take the job. The Hush hire someone else. That crew fail too, and see the vision, and don't have anyone to help them.",
        lead: "Ash epilogue, whatever Salvage says. In the ruins, four strangers stand in front of the Eye.", salvage: -6, feed: "questions" },
      { call: "They break the Eye.", result: "No more loops. No more help. This was the last time, and it's this ending forever.",
        lead: "Read their epilogue band as final. It is.", salvage: 0, feed: "violence" }
    ],
    goesWrong: [
      "The Hush survivors arrive, see the Eye, and beg the crew not to send anything, because seers wake it.",
      "The newborn leans over the gallery wall to watch. Its breath knocks everyone down.",
      "A body from an earlier loop moves. It's not dead, it's them, very old, and they have one thing to say.",
      "The Eye starts sending on its own before they've decided, and they have to grab it."
    ],
    checks: [
      { what: "Lift the Eye together", skill: "Athletics (group check)", dc: 20 },
      { what: "Read the Eye's log of past sendings", skill: "Technology or Arcana", dc: 20 },
      { what: "Hold their nerve in front of their own corpses", skill: "Wisdom save", dc: 20 },
      { what: "Speak the vision into the Eye", skill: "No roll. The players say it.", dc: 0 }
    ],
    fixedEcho: "THE SENDING (everyone, from the other side, 1 Humanity each and a permanent Remnant): they see the chapel steps in the rain, " +
      "and themselves, younger, lying there, and they understand that the golden light was never the gods. It was this. It was always this.",
    echoes: [],
    scars: ["Their own bodies in the rubble, from earlier loops.", "The Eye's log: sending after sending, each a little different."],
    eyeChrome: "One of the future selves' bodies wears the Lidless. The last chance, and the worst way to learn what it is.",
    cred: [
      { event: "The survivors see them carry the Eye out of the ruins", delta: 2 }
    ],
    clocks: [],
    npcs: [
      { id: "st-oldself", name: "The oldest self", template: "Civilian", role: "One of them, from an earlier loop",
        notes: "Not quite dead. Has one line. Make it the thing that player's character most needs to hear." }
    ],
    fragment: { n: 7, ways: ["The Sending completes the vision's last image: four figures in the ruins, one holding the Eye."] },
    keystones: ["k11", "k12"]
  }
  ]
});

/* ============================================================ WALKTHROUGH
   A sample run of the whole campaign with the demo crew (Vesper, Jax, Sable,
   Brick and Lux), one step per session. Each step says what happened at the
   table and which buttons the GM pressed. `set` is absolute, `add` stacks on
   the steps before it; the Story tab adds them up to show the dials at any
   point. Steps 1 to 3 add up to exactly what "Load a demo table" starts with. */
TTST.walkthrough = [
  { title: "Before session 1",
    narrative: "Five players have built their characters and sent their share links. The GM has read The truth and Running the doom, " +
      "and knows one thing the players don't: however well they play tonight, the job fails.",
    actions: [
      "Party screen: paste each share link and press Add to party.",
      "Party screen: press Roll the god's attention (a 7, nothing happens).",
      "Story: open S1 and press Set as current, then Start clocks and Add NPCs.",
      "Read the S1 Read aloud box to open the session."
    ],
    set: { current: "s1", cred: 0 }, add: {} },

  { title: "After session 1: The Reliquary job",
    narrative: "Lux talked the crew past the gate as visiting pilgrims, Brick held the bone door for its six seconds, and nobody died. " +
      "Jax asked Mother Slate who the client was and got the choir-coin answer. On the chapel steps the shard cracked, " +
      "all five saw the Fourth Minute and blacked out in the rain.",
    actions: [
      "Log it as seen on S1's fixed vision (everyone loses 1 Humanity and takes a Remnant).",
      "Keystone K1: Kept, nobody died. Show the omen: the moths follow them out.",
      "Apply 'They get in and out without killing anyone' (Salvage +2, mercy).",
      "Doom: tick fragment 1, the Eye weeps.",
      "Street Cred −3 for the public failure, then +1 when the Archdeacon says they left him unharmed.",
      "Mark played, Mixed. Note: 'Jax asked about the client. Nobody opened the case.'"
    ],
    set: { current: "s2", cred: -2 },
    add: { done: ["s1"], branch: { s1: "mixed" }, doom: [1], salvage: 2, feed: { mercy: 1, questions: 1 },
           keys: { k1: "kept" }, notes: { s1: "Jax asked about the client. Nobody opened the case." },
           echoes: [{ scene: "s1", fixed: true, who: "everyone" }] } },

  { title: "After session 2: Burned",
    narrative: "They woke in Ketch's loft. Sable asked the second voice who sent the vision and laughed off the answer, " +
      "'You did. You always do.' When Tallow came singing through the pipes, Brick pinned him and Lux talked him down instead of killing him. " +
      "They went to Slate and owned the failure, and decided to chase the vision.",
    actions: [
      "When Tallow started to sing: Roll for a vision. 18, a hit on Jax: 'Don't kill the singer. You'll want him later.'",
      "Keystone K2: Kept, someone asked the second voice.",
      "Apply 'They take Tallow alive' (Salvage +2, mercy) and 'They decide to chase the vision' (Salvage +1, questions).",
      "Street Cred +1 for facing Slate, +1 for paying Dace's first installment.",
      "Mark played, Right."
    ],
    set: { current: "s3", cred: 0 },
    add: { done: ["s2"], branch: { s2: "right" }, salvage: 3, feed: { mercy: 1, questions: 1 }, keys: { k2: "kept" },
           echoes: [{ scene: "s2", echo: 0, who: "Jax Oriel" }] } },

  { title: "After session 3: The other petitioners",
    narrative: "They split up and saved all three petitioners. But Vesper and Brick ambushed a pair of Hush quieters on the Spine " +
      "before anyone asked them a thing, and Pell watched it happen. Nobody died, so the Cantor didn't miss a note, but the chance to hear the Hush out was gone.",
    actions: [
      "Keystone K3: Broken, nobody talked first. The 1% path closes here. Put the scar somewhere: a Hush death-notice with their names.",
      "Apply 'They split up and reach all three' (Salvage +3) and take 4 back for the ambush and Pell's fear.",
      "Street Cred +2 for three petitioners alive, +1 for being seen fighting the Hush.",
      "Mark played, Wrong. Note: 'They ambushed the quieters on the Spine before anyone asked a thing. Pell saw it all.'"
    ],
    set: { current: "s4", cred: 3 },
    add: { done: ["s3"], branch: { s3: "wrong" }, salvage: -1, feed: { violence: 1 }, keys: { k3: "broken" },
           notes: { s3: "They ambushed the quieters on the Spine before anyone asked a thing. Pell saw it all." } } },

  { title: "After session 4: The warm bleed",
    narrative: "This is where 'Load a demo table' starts. Lux brought Dr. Vhoss down shaft nine and together they saved Cobb's crew. " +
      "Then the crew stopped the drilling to spare the warm thing, and for a whole shift the Marrowworks filled with light. " +
      "Sable, who had been kind to Vhoss, was shown the back room and bought 'an old eye that doesn't blink'.",
    actions: [
      "Pick Sable Voss in the Eye-chrome picker next to Roll for a vision. Visions now hit on 16.",
      "Apply 'They save Cobb's crew with Vhoss's help' (Salvage +2, mercy).",
      "Apply 'They stop the drilling' (Salvage −1, mercy, Doom fragment 3).",
      "Keystone K4: Broken. Street Cred +1, Cobb's crew came home.",
      "Mark played, Mixed."
    ],
    set: { current: "s5", cred: 4, eyeChrome: "Sable Voss" },
    add: { done: ["s4"], branch: { s4: "mixed" }, doom: [3], salvage: 1, feed: { mercy: 2 }, keys: { k4: "broken" } } },

  { title: "After session 5: One question a year",
    narrative: "In the Cantor's nave Sable asked 'What did we ask you last time?' and nine hundred voices said 'You never ask this one.' " +
      "Lux gave up a place in the queue to a dying woman. Brick spotted the empty 901st voice-housing and nobody knew what to make of it.",
    actions: [
      "Keystone K5: Kept. Omen: the lifts arrive on time all day.",
      "Roll for a vision in the queue: 16, a hit (the Eye-chrome counts) on Lux: 'Ask it about last time.'",
      "Apply 'They ask about the loop' (Salvage +2, questions) and 'They give their place to the dying woman' (Salvage +2, mercy).",
      "Street Cred +1, they held the queue for everyone.",
      "Mark played, Right."
    ],
    set: { current: "s6", cred: 5 },
    add: { done: ["s5"], branch: { s5: "right" }, salvage: 4, feed: { mercy: 1, questions: 1 }, keys: { k5: "kept" },
           echoes: [{ scene: "s5", echo: 0, who: "Lux Marrow" }] } },

  { title: "After session 6: On the book",
    narrative: "Vesper read House Thorn's clause to the Seventh Rib out loud and eleven thousand people refused to leave. " +
      "Then the crew paid off their own debts to clear their names. It felt exactly like redemption. The page went cold, and a nail came loose somewhere below.",
    actions: [
      "Apply 'They read the clause to the Seventh's people' (Salvage +2, questions).",
      "Apply 'They pay off their own debts' (Doom fragment 4, mercy). Street Cred +2 for saving the Seventh.",
      "Keystone K6: Broken, they cleared the book.",
      "Mark played, Mixed. Roll on the omens table afterwards: 'The ribs flex.'"
    ],
    set: { current: "s7", cred: 7 },
    add: { done: ["s6"], branch: { s6: "mixed" }, doom: [4], salvage: 2, feed: { mercy: 1, questions: 1 }, keys: { k6: "broken" } } },

  { title: "After session 7: The Choir-house",
    narrative: "Remembering Pell's face on the Spine, they came in with hands open this time. Lux told Choirmaster Aldous the god isn't dying, it's pregnant, " +
      "and the whole room missed a beat. They held the stair while the Houses' purge squad came down, but the Houses still killed six singers before they were driven off.",
    actions: [
      "Log it as seen on S7's fixed vision, for Brick (closest to the Choirmaster). 1 Humanity and a Remnant.",
      "Keystone K7: Kept, the Choirmaster lives. Omen: every tap plays one clear note at dawn.",
      "Apply 'They spare the Choirmaster and hold the stair' (Salvage +3, mercy).",
      "Doom: tick fragment 2 (the purge killed singers, so route B came true without them).",
      "Street Cred +1, they drove the purge off. Mark played, Right."
    ],
    set: { current: "s8", cred: 8 },
    add: { done: ["s7"], branch: { s7: "right" }, doom: [2], salvage: 3, feed: { mercy: 1, questions: 1 }, keys: { k7: "kept" },
           echoes: [{ scene: "s7", fixed: true, who: "Brick Halloran" }] } },

  { title: "After session 8: The pilgrimage",
    narrative: "Forty thousand pilgrims were singing on the Spine and Ines's hands were shaking. The crew panicked and evacuated everyone by the lifts, as fast as they could. " +
      "They saved thousands. The main cable went at the seventh stop with twelve cars on it.",
    actions: [
      "Apply 'They evacuate everyone by the lifts' (Salvage −2, mercy, Doom fragment 5).",
      "Keystone K8: Broken. Scar: the snapped cable is tied in Vesper's knot.",
      "Street Cred −2, cars fell with people in them.",
      "Mark played, Wrong. Note: 'Let the table sit with it. They saved thousands and lost hundreds.'"
    ],
    set: { current: "s9", cred: 6 },
    add: { done: ["s8"], branch: { s8: "wrong" }, doom: [5], salvage: -2, feed: { mercy: 1 }, keys: { k8: "broken" },
           notes: { s8: "Let the table sit with it. They saved thousands and lost hundreds." } } },

  { title: "After session 9: Close the Eye",
    narrative: "At the Archdeacon's sealing they talked him down and the shroud never went up. Sable looked into the Eye, saw a hand pressed against the inside of it, " +
      "and said out loud, 'That's my hand. They're us.' Nobody at the table spoke for a minute. At dawn the god closed its old eye on its own.",
    actions: [
      "Roll for a vision when Sable looks into the Eye: 17, a hit on Sable: the hand is theirs.",
      "Keystones K9 and K11: Kept (the Eye stays open; Sable named the sender).",
      "Apply 'They stop the sealing and leave the Eye open' (Salvage +2, questions).",
      "Doom: tick fragment 6 (the god closed the eye itself). Street Cred +1, the Archdeacon thanks them publicly.",
      "Mark played, Right."
    ],
    set: { current: "s10", cred: 7 },
    add: { done: ["s9"], branch: { s9: "right" }, doom: [6], salvage: 2, feed: { questions: 1 }, keys: { k9: "kept", k11: "kept" },
           echoes: [{ scene: "s9", echo: 1, who: "Sable Voss" }] } },

  { title: "After session 10: The last lullaby",
    narrative: "Every tap in the city sang. The Houses sent one last squad to silence the pipes, and the crew guarded the doors instead of singing. " +
      "They won the fight. It didn't matter: the song failed at three in the morning.",
    actions: [
      "Keystone K10: Broken, they fought instead of sang. Scar: nine hundred and one voices in the Cantor.",
      "Apply 'They guard the doors and fight' (Salvage 0, violence).",
      "Every ally they made (Cobb, Ines, the Seventh, Reliquary) evacuates on their own: count that in the next session.",
      "Mark played, Wrong."
    ],
    set: { current: "s11", cred: 7 },
    add: { done: ["s10"], branch: { s10: "wrong" }, feed: { violence: 1 }, keys: { k10: "broken" } } },

  { title: "After session 11: The birth",
    narrative: "The ribs opened like a hand. Brick fired on the newborn before anyone could stop him, and it flinched. Then Lux spoke to it, gently, " +
      "and it answered in their own voices: 'There you are.' It slowed down to listen, and most of the city walked out along its arm.",
    actions: [
      "Roll for a vision as the ribs open: a hit on Vesper: 'Go to the Eye when it's done. We'll be waiting.'",
      "Apply 'They attack the newborn' (violence) and 'They talk to the newborn gently and honestly' (Salvage +3, questions).",
      "Take 2 Salvage back for the district that went when it flinched.",
      "Doom: tick fragment 7. Street Cred +3, they stayed and got people out.",
      "Mark played, Mixed."
    ],
    set: { current: "s12", cred: 10 },
    add: { done: ["s11"], branch: { s11: "mixed" }, doom: [7], salvage: 1, feed: { violence: 1, questions: 2 },
           echoes: [{ scene: "s11", echo: 0, who: "Vesper Kane" }] } },

  { title: "After session 12: The Sending",
    narrative: "In the ruins they found the Eye, closed outside and open inside, and their own younger selves lying on the chapel steps. " +
      "The GM read out the vision log and they sent back exactly what they had received. The loop closed as it always has. " +
      "Salvage ended at 17: Exodus. Questions was the top Feed, so the newborn god asked them what it should be.",
    actions: [
      "Log it as seen on S12's fixed vision (everyone, 1 Humanity and a permanent Remnant).",
      "Read out The visions > Vision log so they can send it back in order. Keystone K12: Kept.",
      "Apply 'They send back exactly what they received' (Salvage +2, questions).",
      "Open Endings: Salvage 17 is Exodus; Feed questions means the god asks what it should be.",
      "Tell them the 1% path closed in session 3, and that they kept 7 of 12. Mark played, Right."
    ],
    set: { current: "s12", cred: 10 },
    add: { done: ["s12"], branch: { s12: "right" }, salvage: 2, feed: { questions: 1 }, keys: { k12: "kept" },
           echoes: [{ scene: "s12", fixed: true, who: "everyone" }] } }
];
