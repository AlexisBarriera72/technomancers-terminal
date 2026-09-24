/* Battle maps for Cathedra: every scene of "The Fourth Minute" and the
 * places the street, a heist or a chase can go.
 *
 * Maps are data, drawn by mapdraw.js on a grid where one square is 5 ft.
 * The GM's Maps screen shows them with fog of war and a player screen;
 * tools/render-maps.js writes the same drawings to maps/ as files.
 *
 *   id, title, place, group ("story" | "street" | "heist" | "chase" | "city")
 *   scenes     story scene ids this map serves ("s1"…)
 *   w, h       size in squares;  bg  floor type under everything
 *   blurb      what the map is for, in a sentence
 *   areas      { id, key, name, r:[x,y,w,h] | poly:[[x,y]…], floor, walls, fog, pub, text }
 *              walls: false for open ground; fog: false for what players always see;
 *              pub: the name is shown to players once the area is revealed
 *   doors      [x, y, "h"|"v", type, length]   type: door locked secret ward shutter window arch
 *   walls      extra wall lines, [[x,y]…]
 *   f          features [type, x, y, w, h, {label, gm, dir}]
 *   labels     [text, x, y, "gm"?]
 *   marks      [x, y, text, "party"|"foe"|"exit"]
 *   notes      tips for running it
 *
 * English only, like the story; the screen's labels are translated.
 */
window.TTMAPS = {
  groups: [
    { id: "story", name: "The Fourth Minute, scene by scene" },
    { id: "street", name: "Streets and districts" },
    { id: "heist", name: "Heists, clinics and hideouts" },
    { id: "chase", name: "Chases and heights" },
    { id: "city", name: "The city" }
  ],
  maps: [

    /* ============================================================ S1 */
    {
      id: "s1-chapel", title: "The Reliquary chapel", place: "The Crown · House Reliquary",
      group: "story", scenes: ["s1"], w: 36, h: 28, bg: "void",
      blurb: "Street level of the job: the terrace, the gate, the nave and the chapel lift down. The vision hits on the steps on the way out.",
      areas: [
        { id: "terrace", key: "A", name: "Crown terrace", r: [0, 0, 36, 4], floor: "garden", fog: false, pub: true,
          text: "Manicured bone-lawn above the weather. Two acolytes walk the edge every ten minutes. The skylight over the nave is reachable from here (Athletics DC 13 to cross the roof quietly)." },
        { id: "nave", key: "B", name: "The nave", r: [6, 4, 16, 16], floor: "tile", pub: true,
          text: "Candles, moths, no signal: sanctuary static. Twenty pews. Anyone kneeling is ignored; anyone standing gets asked if they need guidance. The altar hides the lift key under its cloth (Investigation DC 12)." },
        { id: "sacristy", key: "C", name: "Sacristy", r: [1, 4, 5, 7], floor: "wood", pub: true,
          text: "Vestments, censers and the acolytes' duty roster. A stolen robe gives advantage on Deception at the gate below." },
        { id: "office", key: "D", name: "Minute-sellers' office", r: [1, 11, 5, 5], floor: "carpet",
          text: "Where House Reliquary sells minutes at the Eye. The ledger names the three other petitioners who saw the vision this month (Investigation DC 15)." },
        { id: "security", key: "E", name: "Wardens' loft", r: [1, 16, 5, 6], floor: "metal",
          text: "Two consoles and a camera feed from the cloister. Consecrated: none of it can be hacked from inside the chapel, only from the lift shaft (Technology DC 15)." },
        { id: "cloister", key: "F", name: "Cloister", r: [22, 4, 5, 16], floor: "stone", pub: true,
          text: "Covered walk around a dry fountain. If the repossession complication is in play, it happens here: a Thorn collector, a weeping debtor, witnesses." },
        { id: "chapel-ne", key: "G", name: "Chapel of the Eye", r: [27, 4, 8, 7], floor: "carpet", pub: true,
          text: "A painted Eye on the wall, weeping real ichor. Petitioners wait here for their minute. The Archdeacon prays here at the shift change." },
        { id: "lifthall", key: "H", name: "Chapel lift", r: [27, 11, 8, 9], floor: "metal",
          text: "The only lift down to the vault levels. Called with the altar key or hacked from inside the shaft. Three floors down, the acolytes are singing." },
        { id: "narthex", key: "I", name: "Narthex", r: [10, 20, 8, 3], floor: "tile", pub: true,
          text: "Two acolytes at the gate ask every visitor their business (Deception or Persuasion DC 15)." },
        { id: "steps", key: "J", name: "Processional steps", r: [8, 23, 12, 5], floor: "stone", walls: false, fog: false, pub: true,
          text: "Where the shard cracks. Consecrated ground ends at the bottom step: the moment the shard crosses it, the Eye weeps and the vision takes everyone (Wisdom save DC 25 to act for one round)." }
      ],
      doors: [
        [23, 4, "h", "door"], [6, 7, "v", "door"], [6, 13, "v", "door"], [6, 18, "v", "locked"],
        [22, 8, "v", "arch", 2], [22, 15, "v", "arch", 2], [27, 7, "v", "door"], [27, 15, "v", "locked", 2],
        [13, 20, "h", "door", 2], [13, 23, "h", "door", 2], [33, 11, "h", "door"]
      ],
      f: [
        ["tree", 2, 1, 2, 2], ["tree", 31, 1, 2, 2], ["plants", 8, 0, 8, 3], ["plants", 26, 0, 5, 3],
        ["skylight", 11, 8, 6, 4], ["altar", 12, 5, 4, 1], ["light", 11, 5], ["light", 16, 5],
        ["pillar", 7, 6], ["pillar", 20, 6], ["pillar", 7, 12], ["pillar", 20, 12], ["pillar", 7, 17], ["pillar", 20, 17],
        ["pew", 8, 13, 5, 1], ["pew", 15, 13, 5, 1], ["pew", 8, 15, 5, 1], ["pew", 15, 15, 5, 1], ["pew", 8, 17, 5, 1], ["pew", 15, 17, 5, 1],
        ["pew", 8, 10, 5, 1], ["pew", 15, 10, 5, 1],
        ["shelf", 1, 4, 5, 1], ["table", 2, 7, 3, 2], ["desk", 2, 12, 3, 1], ["shelf", 1, 15, 5, 1],
        ["console", 2, 17, 3, 1], ["console", 2, 20, 3, 1], ["camera", 23, 18, 1, 1, { gm: true }],
        ["fountain", 23, 10, 3, 3], ["eye", 30, 5, 4, 3], ["bench", 28, 9, 6, 1],
        ["lift", 30, 13, 3, 3, { label: "LIFT" }], ["console", 28, 18, 2, 1],
        ["stairs", 8, 24, 12, 3, { dir: "s" }]
      ],
      marks: [[4, 2, "Party", "party"], [18, 1, "Acolyte", "foe"], [12, 21, "Gate", "foe"], [14, 27, "Out", "exit"]],
      notes: [
        "Two ways down: the chapel lift (H) with the altar key, or the lift shaft from the terrace side, which is outside the dead air and can be hacked.",
        "Run the way out on this map: the vision hits on the steps (J), not in the vault."
      ]
    },
    {
      id: "s1-vault", title: "Under the chapel: the vault", place: "The Crown · three floors under the Reliquary chapel",
      group: "story", scenes: ["s1"], w: 34, h: 26, bg: "bone",
      blurb: "The vault levels: the choir that sings to the door, the prayer-ward, the ossuary crawl and the case.",
      areas: [
        { id: "landing", key: "A", name: "Lift landing", r: [1, 1, 7, 6], floor: "metal", pub: true,
          text: "The chapel lift opens here. The singing is loud enough to cover footsteps (advantage on Stealth while the choir sings)." },
        { id: "choir", key: "B", name: "The choir gallery", r: [8, 1, 16, 9], floor: "tile", pub: true,
          text: "Six acolytes sing to the bone door in shifts. They stop only to challenge strangers. Talking past them: Deception DC 15, easier in stolen robes." },
        { id: "wardhall", key: "C", name: "The prayer-ward", r: [24, 1, 9, 9], floor: "stone",
          text: "A ward woven from prayer. Its weak stitch can be read (Religion DC 15): it sleeps for six seconds when the choir changes key." },
        { id: "bonedoor", key: "D", name: "The bone door", r: [26, 10, 6, 3], floor: "bone",
          text: "Opens while the ward sleeps. Holding it for six seconds: Athletics DC 20; if the ward only sleeps for four, whoever holds it takes 2d6 bludgeoning." },
        { id: "vault", key: "E", name: "The reliquary vault", r: [20, 13, 13, 12], floor: "stone",
          text: "Shelves of relics. The cornea shard sits in a case the size of a coffin, sealed but not trapped: the ward was the trap. It hums when touched." },
        { id: "ossuary", key: "F", name: "Ossuary crawl", poly: [[1, 9], [6, 9], [6, 15], [14, 15], [14, 19], [20, 19], [20, 21], [12, 21], [12, 17], [4, 17], [4, 11], [1, 11]], floor: "bone",
          text: "A 2 ft crawlspace between stacked dead, from the lift landing to the vault's back wall. Stealth DC 15 not to bring bones down. It skips the choir entirely." },
        { id: "reliquarium", key: "G", name: "Archdeacon's cell", r: [1, 19, 9, 6], floor: "carpet",
          text: "Uln Sarrow's private prayer cell. His recorded minute of the vision is on a wax cylinder here, if anyone thinks to look (Investigation DC 13)." }
      ],
      doors: [[8, 3, "v", "arch", 2], [24, 4, "v", "arch", 2], [28, 10, "h", "ward", 2], [28, 13, "h", "locked", 2],
              [20, 19, "v", "secret", 2], [4, 7, "h", "gap", 2], [5, 19, "h", "door"]],
      f: [
        ["lift", 2, 2, 3, 3, { label: "LIFT" }], ["crowd", 11, 5, 10, 3], ["choir", 10, 1, 12, 2], ["light", 9, 8], ["light", 22, 8],
        ["ward", 27, 4, 3, 3], ["light", 25, 2], ["light", 31, 2],
        ["shelf", 21, 14, 11, 1], ["shelf", 21, 23, 11, 1], ["shelf", 32, 15, 1, 8], ["altar", 25, 17, 4, 3, { label: "the case" }],
        ["shard", 26, 18, 2, 1], ["bones", 1, 9, 6, 8], ["bones", 6, 15, 8, 4], ["bones", 12, 19, 8, 2],
        ["pew", 3, 21, 5, 1], ["desk", 7, 23, 2, 1]
      ],
      marks: [[4, 5, "Party", "party"], [16, 4, "Choir", "foe"]],
      notes: ["The fast route is through the choir (B) and the ward (C). The quiet one is the ossuary (F), which comes out behind the shelves through a secret panel."]
    },

    /* ============================================================ S2 */
    {
      id: "s2-loft", title: "Ketch's noodle-loft", place: "The Gullet · above a noodle shop",
      group: "story", scenes: ["s2"], band: "below", w: 34, h: 24, bg: "flesh",
      blurb: "Where the crew wake three days after the job: the shop below, Ketch's loft above, the roof and the singing channel.",
      areas: [
        { id: "kitchen", key: "A", name: "Kitchen", r: [1, 1, 8, 5], floor: "tile", pub: true,
          text: "Stock pots big enough to hide in. The cook owes Ketch and will lie for the crew once (Persuasion DC 10)." },
        { id: "backstair", key: "B", name: "Back stair", r: [9, 1, 5, 5], floor: "wood", pub: true,
          text: "Up to the loft, out to the alley. The only way up that doesn't cross the shop." },
        { id: "shop", key: "C", name: "Noodle shop", r: [1, 6, 12, 10], floor: "wood", pub: true,
          text: "Six tables, a counter and steam. Anyone can walk in. Ser Ambrel Dace sits at the counter and orders before she says a word." },
        { id: "channel", key: "D", name: "Run-off channel", r: [13, 6, 3, 10], floor: "water", walls: false,
          text: "Open water along the shop's wall, feeding the drain. Tallow comes up this way, singing under the water (Perception DC 15 to hear it a round early)." },
        { id: "alley", key: "E", name: "Alley", r: [14, 0, 4, 6], floor: "street", fog: false, pub: true,
          text: "Behind the kitchen. Rubbish, a ladder to the roof, and a way into the market lane." },
        { id: "lane", key: "F", name: "Market lane", r: [0, 16, 17, 8], floor: "street", fog: false, pub: true,
          text: "The Gullet's main lane (see the Gullet market map). Reliquary notices with the crew's faces on every post." },
        { id: "loft", key: "G", name: "Ketch's loft", r: [19, 1, 14, 10], floor: "wood", pub: true,
          text: "Four cots, Ketch's rig and a window over the lane. The crew wake here. Ketch's second voice talks through the rig's speakers when it has something to say." },
        { id: "roof", key: "H", name: "Roof", r: [19, 12, 14, 10], floor: "metal", walls: false, pub: true,
          text: "Flat tin over the shop. A water tank Tallow can sing through: Wisdom save DC 14 each round in earshot or fall asleep." },
        { id: "edge", key: "I", name: "Rib edge", r: [19, 22, 14, 2], floor: "drop", walls: false, fog: false,
          text: "The Gullet drops away here: a Long Fall to Weepwater." }
      ],
      doors: [[4, 6, "h", "door"], [10, 6, "h", "door"], [14, 2, "v", "door"], [5, 16, "h", "door", 2], [24, 11, "h", "door"], [19, 3, "v", "arch", 2], [26, 11, "h", "window", 3]],
      f: [
        ["machine", 2, 2, 2, 2, { label: "stove" }], ["vat", 5, 2, 2, 2], ["stairs", 10, 2, 3, 3, { dir: "n" }],
        ["counter", 2, 7, 9, 1], ["stool", 3, 8], ["stool", 5, 8], ["stool", 7, 8], ["stool", 9, 8],
        ["table", 2, 10, 2, 2], ["table", 6, 10, 2, 2], ["table", 10, 10, 2, 2], ["table", 2, 13, 2, 2], ["table", 6, 13, 2, 2], ["table", 10, 13, 2, 2],
        ["ladder", 16, 1, 1, 4], ["crate", 14, 4], ["stall", 3, 18, 3, 2], ["stall", 10, 19, 3, 2], ["crowd", 1, 20, 15, 3],
        ["bed", 20, 2, 2, 3], ["bed", 23, 2, 2, 3], ["bed", 20, 6, 2, 3], ["bed", 23, 6, 2, 3],
        ["console", 28, 2, 4, 1], ["machine", 29, 4, 3, 3, { label: "rig" }], ["console", 28, 8, 4, 1],
        ["tank", 28, 14, 4, 4], ["vent", 21, 15, 2, 2], ["hatch", 24, 12, 2, 2], ["pipe", 13, 16, 13, 6, { w: 0.3 }]
      ],
      labels: [["upstairs", 26, 0.7], ["ground floor", 7, 0.7]],
      marks: [[21, 4, "Party", "party"], [14, 13, "Tallow", "foe"], [6, 21, "Dace", "foe"], [15, 1, "Out", "exit"]],
      notes: ["If Dace and Tallow arrive together, put Dace in the shop (C) and Tallow in the channel (D): the crew are between them."]
    },

    /* ============================================================ S3 */
    {
      id: "s3-spine", title: "A Spine station", place: "The Sevenfold Spine · a middle stop",
      group: "story", scenes: ["s3", "s5"], band: "middle", w: 36, h: 26, bg: "void",
      blurb: "Ines Varro's stop: two platforms either side of the open shaft, the cars, the operator's cabin and the gantry across the drop.",
      areas: [
        { id: "watch", key: "A", name: "Watch post", r: [4, 1, 8, 4], floor: "metal", pub: true,
          text: "Two Watch officers check papers and scan chrome serials (Deception DC 13 with forged papers)." },
        { id: "west", key: "B", name: "West platform", r: [4, 5, 10, 16], floor: "metal", pub: true,
          text: "Benches and a railing over the shaft. Cars dock at the rail." },
        { id: "shaft", key: "C", name: "The shaft", r: [14, 0, 8, 21], floor: "drop", walls: false, fog: false, pub: true,
          text: "The Spine's open shaft. Climbing the cable: Athletics DC 15. Falling: Long Fall, the car below or a district down." },
        { id: "east", key: "D", name: "East platform", r: [22, 5, 10, 16], floor: "metal", pub: true,
          text: "The busier side. The Hush quieter waits here, on a bench, humming." },
        { id: "cabin", key: "E", name: "Operator's cabin", r: [22, 1, 6, 4], floor: "metal",
          text: "Ines Varro's cabin: the controls for every car at this stop. From here a car can be held, dropped a rib, or sent up empty." },
        { id: "gantry", key: "F", name: "Maintenance gantry", r: [14, 2, 8, 2], floor: "grate", walls: false,
          text: "A catwalk across the shaft with the junction box at its east end (Technology DC 20 to reroute the Spine)." },
        { id: "winch", key: "G", name: "Winch room", r: [32, 5, 4, 8], floor: "metal",
          text: "The brake winches. Loud. Locking a winch stops a car where it is." },
        { id: "hall", key: "H", name: "Ticket hall", r: [4, 21, 28, 5], floor: "tile", pub: true,
          text: "Turnstiles, ticket booths, pilgrims asleep on their packs." },
        { id: "stair", key: "I", name: "Stair to the district", r: [0, 21, 4, 5], floor: "stone", walls: false, fog: false, pub: true,
          text: "Down into the district this stop serves." }
      ],
      doors: [[7, 5, "h", "arch", 2], [24, 5, "h", "door"], [32, 8, "v", "door"], [7, 21, "h", "arch", 3], [26, 21, "h", "arch", 3], [4, 22, "v", "arch", 3]],
      f: [
        ["cable", 16, 0, 16, 21], ["cable", 20, 0, 20, 21], ["lift", 15, 8, 3, 4, { label: "CAR 3" }], ["lift", 18, 14, 3, 4, { label: "CAR 4" }],
        ["rail", 14, 5, 14, 21], ["rail", 22, 5, 22, 21], ["bench", 5, 8, 1, 4], ["bench", 5, 14, 1, 4], ["bench", 30, 8, 1, 4], ["bench", 30, 14, 1, 4],
        ["crowd", 24, 15, 5, 4], ["console", 23, 2, 4, 1], ["console", 20, 2, 2, 1, { label: "junction" }], ["machine", 32.5, 6, 3, 3], ["machine", 32.5, 10, 3, 2],
        ["desk", 5, 2, 3, 1], ["camera", 11, 2, 1, 1, { gm: true }], ["counter", 12, 22, 3, 2], ["counter", 21, 22, 3, 2], ["barrier", 5, 24, 26, 1],
        ["stairs", 0, 21, 4, 5, { dir: "w" }], ["light", 9, 12], ["light", 27, 12], ["sign", 6, 20, 5, 1], ["sign", 25, 20, 5, 1]
      ],
      marks: [[8, 23, "Party", "party"], [27, 10, "Quieter", "foe"], [1, 23, "Down", "exit"]],
      notes: ["Complication: Ines's car drops a rib with the crew on it. Use the Lift car map, then the Long Fall on the Toolkit screen."]
    },
    {
      id: "s3-barracks", title: "Drillers' barracks", place: "The Marrowworks · shaft nine's crew quarters",
      group: "story", scenes: ["s3", "s4"], band: "below", w: 32, h: 22, bg: "bone",
      blurb: "Brother Cobb's crew, sick and frightened, in the barracks above shaft nine.",
      areas: [
        { id: "shafthead", key: "A", name: "Shaft-head", r: [1, 1, 9, 9], floor: "metal", pub: true,
          text: "The cage lift down to shaft nine, sealed by both Houses. Lockers and rock-bores on racks." },
        { id: "mess", key: "B", name: "Mess hall", r: [10, 1, 12, 9], floor: "wood", pub: true,
          text: "Long tables, a stove and a shift board with shaft nine's line painted over." },
        { id: "bunks", key: "C", name: "Bunk room", r: [22, 1, 9, 12], floor: "wood", pub: true,
          text: "Forty bunks, eleven empty since the warm bleed. Pay stubs from three Houses under the mattresses." },
        { id: "infirmary", key: "D", name: "Infirmary", r: [1, 10, 9, 11], floor: "tile",
          text: "Four drillers with glowing veins (Medicine DC 15 to treat; a failure means the light spreads). They attack anyone they think is the Hush." },
        { id: "corridor", key: "E", name: "Corridor", r: [10, 10, 12, 3], floor: "metal", pub: true, text: "Lit by one flickering tube." },
        { id: "wash", key: "F", name: "Wash house", r: [10, 13, 8, 8], floor: "tile", text: "Showers and a drain. The water here is warm, and it shouldn't be." },
        { id: "foreman", key: "G", name: "Cobb's room", r: [18, 13, 6, 8], floor: "carpet",
          text: "Brother Cobb's room. His sketches of what he saw in the vision: a hand, from the inside." },
        { id: "tools", key: "H", name: "Tool store", r: [24, 13, 7, 8], floor: "metal", text: "Rock-bores (as heavy crossbows, 1d10 piercing), charges and rope." }
      ],
      doors: [[10, 4, "v", "door", 2], [22, 5, "v", "door", 2], [5, 10, "h", "door"], [10, 11, "v", "door"], [22, 11, "v", "door"], [14, 13, "h", "door"], [20, 13, "h", "door"], [26, 13, "h", "door"], [5, 21, "h", "door"]],
      f: [
        ["cage", 2, 2, 4, 4, { label: "CAGE" }], ["shelf", 7, 2, 2, 6], ["shelf", 2, 7, 4, 1],
        ["table", 11, 3, 10, 1], ["table", 11, 6, 10, 1], ["bench", 11, 2, 10, 1], ["bench", 11, 4, 10, 1], ["bench", 11, 5, 10, 1], ["bench", 11, 7, 10, 1], ["machine", 19, 8, 2, 2],
        ["bed", 23, 2, 2, 3], ["bed", 26, 2, 2, 3], ["bed", 29, 2, 2, 3], ["bed", 23, 6, 2, 3], ["bed", 26, 6, 2, 3], ["bed", 29, 6, 2, 3], ["bed", 23, 10, 2, 3], ["bed", 29, 10, 2, 3],
        ["bed", 2, 11, 2, 3], ["bed", 5, 11, 2, 3], ["bed", 2, 15, 2, 3], ["bed", 5, 15, 2, 3], ["machine", 7, 18, 2, 2],
        ["tank", 11, 14, 3, 3], ["tank", 14, 14, 3, 3], ["hatch", 12, 18, 2, 2], ["desk", 19, 14, 3, 1], ["bed", 22, 17, 2, 3],
        ["shelf", 25, 14, 5, 1], ["crate", 25, 17], ["crate", 27, 17], ["crate", 29, 18], ["light", 16, 11]
      ],
      marks: [[15, 11, "Party", "party"], [4, 13, "Sick crew", "foe"]]
    },

    /* ============================================================ S4 */
    {
      id: "s4-shaft", title: "Shaft nine, three shifts down", place: "The Marrowworks · shaft nine",
      group: "story", scenes: ["s4"], band: "below", w: 36, h: 30, bg: "bone",
      blurb: "The warm bleed: the cage landing, the Houses' guards, the open shaft and the bore face where the hand grips.",
      areas: [
        { id: "landing", key: "A", name: "Cage landing", r: [1, 1, 8, 7], floor: "metal", pub: true,
          text: "The cage arrives here. Thorn's engineers hold this side." },
        { id: "gate", key: "B", name: "Sealed gate", r: [9, 2, 6, 4], floor: "metal", pub: true,
          text: "Both Houses' seals on one gate. Getting past both sets of guards: Stealth or Deception DC 20." },
        { id: "catwalk", key: "C", name: "Upper catwalk", r: [15, 1, 20, 3], floor: "grate", walls: false, pub: true,
          text: "A ring of grating around the top of the bore. Reliquary deacons hold the far end." },
        { id: "shaft", key: "D", name: "The bore", r: [17, 4, 12, 14], floor: "drop", walls: false, fog: false,
          text: "Straight down to the face. A warm light comes up from it." },
        { id: "wcat", key: "E", name: "West ladders", r: [15, 4, 2, 14], floor: "grate", walls: false, text: "Ladders and platforms down the west wall of the bore." },
        { id: "ecat", key: "F", name: "East ladders", r: [29, 4, 2, 14], floor: "grate", walls: false, text: "Ladders down the east wall. Rusted; Athletics DC 12 or slip 10 ft." },
        { id: "control", key: "G", name: "Drill controller", r: [2, 12, 9, 7], floor: "metal",
          text: "The controller's logs show three crews and three seals (Technology DC 15). From here the drill can be started, stopped or run in reverse." },
        { id: "face", key: "H", name: "The bore face", r: [14, 18, 21, 11], floor: "flesh", walls: false,
          text: "The drill head and, in the bone, the hand: warm, bleeding light instead of ichor, and gripping. Telling a wound from a birth: Medicine or Religion DC 20." },
        { id: "sump", key: "I", name: "Ichor sump", r: [2, 21, 10, 8], floor: "ichor", walls: false,
          text: "Where the milky water floods from if the shaft floods: swim (Athletics DC 12) or climb." },
        { id: "crack", key: "J", name: "Cracked floor", r: [20, 25, 8, 4], floor: "flesh", walls: false, fog: false,
          text: "If the floor gives way, everyone on it takes the Long Fall to the district below, glowing faintly." }
      ],
      doors: [[9, 3, "v", "door", 2], [15, 2, "v", "locked", 2], [6, 12, "h", "door", 2]],
      f: [
        ["cage", 2, 2, 4, 4, { label: "CAGE" }], ["crate", 6, 6], ["crate", 7, 6], ["cover", 10, 4, 4, 1],
        ["rail", 17, 4, 29, 4], ["rail", 17, 18, 29, 18], ["ladder", 15, 5, 1, 12], ["ladder", 30, 5, 1, 12],
        ["console", 3, 13, 7, 1], ["machine", 3, 15, 3, 3], ["desk", 7, 16, 3, 1],
        ["drill", 16, 19, 6, 6], ["hand", 27, 19, 7, 6], ["cable", 19, 18, 19, 4], ["pipe", 11, 15, 16, 22, { w: 0.35 }],
        ["rubble", 23, 22, 4, 3], ["rubble", 14, 26, 5, 3], ["crate", 3, 22], ["crate", 4, 26], ["light", 20, 10], ["light", 25, 10]
      ],
      marks: [[4, 4, "Party", "party"], [12, 3, "Thorn", "foe"], [33, 2, "Reliquary", "foe"]],
      notes: ["The keystone way: seal the breach without touching the hand (Sleight of Hand or tinker's tools DC 15), then talk both Houses out of drilling tonight."]
    },

    /* ============================================================ S5 */
    {
      id: "s5-nave", title: "The Cantor's nave", place: "The Nave · the Spine's middle stop",
      group: "story", scenes: ["s5", "s10"], band: "middle", w: 40, h: 30, bg: "stone",
      blurb: "One question a year: the queue, the kneeling steps, the choir-engine and its one silent housing.",
      areas: [
        { id: "engine", key: "A", name: "The choir-engine", r: [10, 1, 20, 5], floor: "metal", pub: true,
          text: "Nine hundred voice-housings, singing. Wardens stand between the steps and the housings." },
        { id: "empty", key: "B", name: "The silent housing", r: [30, 1, 4, 5], floor: "metal",
          text: "One housing, empty and waiting (Perception DC 20 to notice it isn't singing). It hums when one of the crew walks under it." },
        { id: "nave", key: "C", name: "The kneeling steps", r: [8, 6, 24, 12], floor: "tile", pub: true,
          text: "Petitioners kneel here to ask their one question. The Archdeacon kneels at the front, asking his." },
        { id: "gallery", key: "D", name: "Tenders' gallery", r: [1, 6, 7, 12], floor: "wood",
          text: "The Hush tender writes down every question and every answer (Sleight of Hand DC 20 to lift the notes)." },
        { id: "pew", key: "E", name: "Archdeacon's pew", r: [32, 6, 7, 6], floor: "carpet", pub: true, text: "House Reliquary's reserved pew. Two acolytes." },
        { id: "lifts", key: "F", name: "Side lifts", r: [32, 12, 7, 6], floor: "metal", pub: true, text: "Two lifts to the Spine. Tonight they arrive before anyone calls them." },
        { id: "queue", key: "G", name: "Queue hall", r: [1, 18, 24, 11], floor: "tile", pub: true,
          text: "Two thousand people, roped into a switchback. Keeping their place: Intimidation or Persuasion DC 15." },
        { id: "vestibule", key: "H", name: "Vestibule", r: [25, 18, 14, 11], floor: "stone", pub: true, text: "Doors to the Spine stop and the Watch's desk." }
      ],
      doors: [[8, 10, "v", "arch", 2], [32, 8, "v", "arch", 2], [32, 14, "v", "arch", 2], [12, 18, "h", "arch", 4], [28, 18, "h", "arch", 4], [25, 23, "v", "arch", 2], [34, 29, "h", "door", 3]],
      f: [
        ["choir", 10, 1, 20, 4], ["ward", 11, 5, 1, 1], ["ward", 28, 5, 1, 1], ["choir", 30, 1, 4, 3, { gm: false }],
        ["bench", 10, 8, 9, 1], ["bench", 21, 8, 9, 1], ["bench", 10, 11, 9, 1], ["bench", 21, 11, 9, 1], ["bench", 10, 14, 9, 1], ["bench", 21, 14, 9, 1],
        ["pillar", 9, 7], ["pillar", 30, 7], ["pillar", 9, 16], ["pillar", 30, 16],
        ["desk", 2, 8, 4, 1], ["shelf", 1, 12, 1, 5], ["stairs", 5, 14, 2, 3, { dir: "n" }], ["pew", 33, 8, 5, 1], ["pew", 33, 10, 5, 1],
        ["lift", 33, 13, 2, 3], ["lift", 36, 13, 2, 3],
        ["barrier", 2, 20, 21, 1], ["barrier", 2, 22, 21, 1], ["barrier", 2, 24, 21, 1], ["barrier", 2, 26, 21, 1], ["crowd", 2, 19, 22, 9],
        ["desk", 33, 20, 4, 1], ["light", 20, 7], ["light", 15, 17], ["light", 25, 17]
      ],
      marks: [[4, 27, "Party", "party"], [3, 9, "Tender", "foe"]]
    },

    /* ============================================================ S6 */
    {
      id: "s6-counting", title: "The Counting Rib", place: "The Counting Rib · House Thorn's ledger halls",
      group: "story", scenes: ["s6"], band: "middle", w: 36, h: 26, bg: "stone",
      blurb: "House Thorn's ledger hall, the archive stacks, the Book's chamber and the duelling floor.",
      areas: [
        { id: "hall", key: "A", name: "The ledger hall", r: [1, 1, 22, 17], floor: "wood", pub: true,
          text: "Forty clerks at forty desks, working through the night on one name. Candles everywhere: paper and flame." },
        { id: "stacks", key: "B", name: "Archive stacks", r: [23, 1, 12, 10], floor: "wood",
          text: "Aisles of ledgers, floor to ceiling. Good cover, terrible place for a fire." },
        { id: "book", key: "C", name: "The Book's chamber", r: [23, 11, 12, 8], floor: "carpet",
          text: "The case with the oldest page (Sleight of Hand or thieves' tools DC 20). The Book is warm. Threads run from it into the bone (Arcana DC 20 to see them)." },
        { id: "entrance", key: "D", name: "Entrance hall", r: [1, 18, 10, 7], floor: "stone", pub: true, text: "A guard desk and a clerk who asks what account you're here about." },
        { id: "duel", key: "E", name: "Duelling floor", r: [11, 18, 12, 7], floor: "tile", pub: true,
          text: "Where debts are settled by duel, with a clerk to record it. Dace's contest: Athletics or Acrobatics DC 20, first to three hits." },
        { id: "archivist", key: "F", name: "Archivist's office", r: [23, 19, 12, 6], floor: "carpet", text: "The Thorn archivist and the clause, read to its end (Investigation DC 15)." }
      ],
      doors: [[23, 5, "v", "arch", 2], [29, 11, "h", "locked", 2], [5, 18, "h", "door", 2], [15, 18, "h", "arch", 3], [11, 21, "v", "arch", 2], [23, 21, "v", "door"], [5, 25, "h", "door", 2]],
      f: [
        ["desk", 2, 3, 3, 1], ["desk", 7, 3, 3, 1], ["desk", 12, 3, 3, 1], ["desk", 17, 3, 3, 1],
        ["desk", 2, 7, 3, 1], ["desk", 7, 7, 3, 1], ["desk", 12, 7, 3, 1], ["desk", 17, 7, 3, 1],
        ["desk", 2, 11, 3, 1], ["desk", 7, 11, 3, 1], ["desk", 12, 11, 3, 1], ["desk", 17, 11, 3, 1],
        ["shelf", 1, 15, 21, 1], ["light", 6, 5], ["light", 16, 5], ["light", 6, 9], ["light", 16, 9], ["light", 11, 13],
        ["shelf", 24, 2, 1, 8], ["shelf", 27, 2, 1, 8], ["shelf", 30, 2, 1, 8], ["shelf", 33, 2, 1, 8],
        ["altar", 27, 13, 4, 3, { label: "the Book" }], ["cable", 29, 14, 23, 12], ["cable", 29, 14, 35, 12], ["cable", 29, 14, 35, 18], ["light", 25, 17], ["light", 33, 17],
        ["desk", 2, 20, 3, 1], ["ring", 13, 19, 8, 5], ["desk", 26, 20, 4, 1], ["shelf", 32, 20, 2, 4]
      ],
      marks: [[3, 23, "Party", "party"], [17, 21, "Dace", "foe"]]
    },
    {
      id: "s6-seventh", title: "The Seventh Rib tenements", place: "The Seventh Rib · foreclosed",
      group: "story", scenes: ["s6", "s11"], band: "middle", w: 38, h: 28, bg: "bone",
      blurb: "Eleven thousand people, thirty days: the tenement street, the blocks, the courtyard and the rib's open edge.",
      areas: [
        { id: "street", key: "A", name: "Tenement street", r: [0, 11, 38, 6], floor: "street", fog: false, pub: true,
          text: "Thorn's collectors' carts, families with bundles, and a crowd that could go either way (rallying them: Persuasion or Performance DC 15)." },
        { id: "north", key: "B", name: "North block", r: [2, 1, 14, 10], floor: "stone", pub: true, text: "Four flats and a stairwell. The collectors are working through it door by door." },
        { id: "court", key: "C", name: "Courtyard", r: [18, 1, 10, 10], floor: "garden", pub: true, text: "Laundry lines and a well. Where the tenants meet." },
        { id: "office", key: "D", name: "Thorn's rent office", r: [29, 1, 8, 10], floor: "carpet", text: "The collectors' base: eviction orders, keys to every flat, a strongbox." },
        { id: "south", key: "E", name: "South block", r: [2, 17, 16, 10], floor: "stone", pub: true, text: "Six flats. The families here won't leave." },
        { id: "barricade", key: "F", name: "Barricade yard", r: [19, 17, 10, 10], floor: "street", walls: false, pub: true, text: "The tenants' barricade: furniture, carts and a fire. Half cover." },
        { id: "edge", key: "G", name: "Rib edge", r: [30, 17, 8, 11], floor: "drop", walls: false, fog: false, text: "The rib ends here. A Long Fall to the Nave." }
      ],
      walls: [[[6, 1], [6, 11]], [[6, 6], [16, 6]], [[11, 1], [11, 11]], [[7, 17], [7, 27]], [[7, 22], [18, 22]], [[12, 17], [12, 27]]],
      doors: [[4, 11, "h", "door", 2], [8, 6, "h", "door"], [13, 6, "h", "door"], [6, 3, "v", "door"], [6, 8, "v", "door"], [11, 3, "v", "door"], [11, 8, "v", "door"],
              [22, 11, "h", "arch", 3], [32, 11, "h", "door", 2], [4, 17, "h", "door", 2], [7, 19, "v", "door"], [7, 24, "v", "door"], [12, 19, "v", "door"], [12, 24, "v", "door"], [14, 22, "h", "door"]],
      f: [
        ["stairs", 2, 1, 4, 10, { dir: "n" }], ["stairs", 2, 17, 5, 10, { dir: "s" }], ["bed", 7, 2, 2, 3], ["bed", 13, 2, 2, 3], ["bed", 8, 7, 2, 3], ["bed", 13, 7, 2, 3],
        ["fountain", 21, 4, 3, 3], ["cable", 19, 2, 27, 9], ["cable", 19, 9, 27, 2], ["plants", 24, 7, 3, 3],
        ["desk", 30, 2, 4, 1], ["shelf", 35, 2, 1, 6], ["crate", 30, 8], ["crate", 31, 8],
        ["car", 8, 12, 5, 3], ["car", 26, 13, 5, 3], ["crowd", 14, 12, 10, 4], ["bed", 8, 18, 2, 3], ["bed", 14, 18, 2, 3], ["bed", 9, 23, 2, 3], ["bed", 14, 24, 2, 3],
        ["cover", 19, 18, 1, 8], ["cover", 20, 18, 8, 1], ["crate", 22, 21], ["crate", 25, 22], ["light", 24, 24], ["rubble", 21, 23, 6, 3], ["rail", 30, 17, 30, 28]
      ],
      marks: [[1, 13, "Party", "party"], [10, 11, "Collectors", "foe"]]
    },

    /* ============================================================ S7 */
    {
      id: "s7-choirhouse", title: "The Choir-house", place: "Beneath the Cantor · the Hush's cistern chapel",
      group: "story", scenes: ["s7", "s10"], band: "below", w: 38, h: 28, bg: "stone",
      blurb: "The Hush's heart: forty tenders singing into the water from a chapel on an island in the cistern.",
      areas: [
        { id: "stair", key: "A", name: "The stair", r: [1, 1, 4, 12], floor: "stone", walls: false, pub: true,
          text: "The only dry way in. Holding it against the purge squad: Athletics or combat DC 15. Getting in without breaking the song: Stealth DC 20." },
        { id: "walk", key: "B", name: "Upper walkway", r: [5, 1, 30, 3], floor: "grate", walls: false, pub: true, text: "A grating around the cistern, twelve feet above the water." },
        { id: "wniche", key: "C", name: "West niches", r: [5, 4, 3, 16], floor: "stone", walls: false, text: "Singers in alcoves, each with a pipe to the water." },
        { id: "eniche", key: "D", name: "East niches", r: [32, 4, 3, 16], floor: "stone", walls: false, text: "More singers. One is asleep on her feet." },
        { id: "cistern", key: "E", name: "The cistern", r: [8, 4, 24, 16], floor: "water", walls: false, fog: false, pub: true,
          text: "Warm water, chest-deep, rising if the complication is in play. Swimming: Athletics DC 12." },
        { id: "platform", key: "F", name: "Choir platform", r: [14, 8, 12, 7], floor: "stone", walls: false, pub: true,
          text: "Choirmaster Wren Aldous at the lectern. Joining the lullaby without a wrong note: Performance DC 20. The fixed vision happens here." },
        { id: "wbridge", key: "G", name: "West bridge", r: [8, 11, 6, 2], floor: "grate", walls: false, pub: true, text: "Planks over the water." },
        { id: "ebridge", key: "H", name: "East bridge", r: [26, 11, 6, 2], floor: "grate", walls: false, pub: true, text: "A narrow iron bridge. It sings when stepped on." },
        { id: "cell", key: "I", name: "Choirmaster's cell", r: [5, 20, 10, 7], floor: "wood", text: "Aldous's cell: a cot, her voice-box spares and the Hush's list of seers." },
        { id: "drain", key: "J", name: "Drain tunnel", r: [15, 21, 22, 3], floor: "water", walls: false, text: "Out to the pipes (see the Pipe gallery map). Knee-deep; the song carries along it for miles." }
      ],
      doors: [[5, 20, "h", "door", 2]],
      f: [
        ["stairs", 1, 1, 4, 12, { dir: "n" }], ["crowd", 5, 5, 3, 14], ["crowd", 32, 5, 3, 14], ["crowd", 15, 9, 10, 3], ["altar", 18, 12, 4, 2, { label: "lectern" }],
        ["pipe", 6, 4, 10, 8, { w: 0.25 }], ["pipe", 34, 4, 30, 8, { w: 0.25 }], ["pipe", 6, 19, 10, 16, { w: 0.25 }], ["pipe", 34, 19, 30, 16, { w: 0.25 }],
        ["rail", 5, 4, 35, 4], ["light", 16, 9], ["light", 24, 9], ["bed", 6, 21, 2, 3], ["shelf", 10, 21, 4, 1], ["desk", 11, 24, 3, 1], ["pillar", 13, 5], ["pillar", 27, 5], ["pillar", 13, 18], ["pillar", 27, 18]
      ],
      marks: [[3, 3, "Party", "party"], [20, 10, "Aldous", "foe"]]
    },

    /* ============================================================ S8 */
    {
      id: "s8-pilgrimage", title: "The Spine on pilgrimage day", place: "The Sevenfold Spine · the seventh stop",
      group: "story", scenes: ["s8"], band: "middle", w: 38, h: 30, bg: "void",
      blurb: "Forty thousand pilgrims climbing: two packed platforms, a car hanging by one clamp, and the rib-ladders where nets can go.",
      areas: [
        { id: "wladder", key: "A", name: "West rib-ladders", r: [0, 2, 3, 26], floor: "bone", walls: false, pub: true, text: "Handholds in the rib. Rigging nets and ropes here: Athletics or Survival DC 15." },
        { id: "west", key: "B", name: "West platform", r: [3, 6, 12, 16], floor: "metal", pub: true, text: "Packed shoulder to shoulder (difficult terrain everywhere). The Hush strike team is in the crowd (Perception or Investigation DC 20)." },
        { id: "shaft", key: "C", name: "The shaft", r: [15, 0, 8, 30], floor: "drop", walls: false, fog: false, pub: true, text: "A Long Fall of four districts from here." },
        { id: "car", key: "D", name: "The hanging car", r: [16, 20, 5, 5], floor: "metal", text: "Twelve pilgrims in a car held by one clamp. Every creature that moves inside: DC 12 Dexterity save or the car tips." },
        { id: "east", key: "E", name: "East platform", r: [23, 6, 12, 16], floor: "metal", pub: true, text: "The abbess's side. Everyone here is singing." },
        { id: "junction", key: "F", name: "Junction box", r: [23, 1, 6, 5], floor: "metal", text: "Rerouting the Spine from here: Technology DC 20. Getting it wrong sends every car up at once." },
        { id: "dais", key: "G", name: "The abbess's dais", r: [23, 22, 12, 6], floor: "carpet", pub: true, text: "The abbess leads the prayer from here. Talking forty thousand people into a different miracle: Persuasion or Religion DC 25." },
        { id: "eladder", key: "H", name: "East rib-ladders", r: [35, 2, 3, 26], floor: "bone", walls: false, pub: true, text: "The way off the Spine for anyone who can climb or be lowered." }
      ],
      doors: [[25, 6, "h", "door", 2]],
      f: [
        ["crowd", 4, 7, 10, 14], ["crowd", 24, 7, 10, 14], ["crowd", 24, 23, 10, 4], ["cable", 17, 0, 17, 20], ["cable", 21, 0, 21, 30],
        ["lift", 16, 20, 5, 5, { label: "CAR 12" }], ["lift", 16, 4, 4, 4, { label: "CAR 11" }], ["rail", 15, 6, 15, 22], ["rail", 23, 6, 23, 22],
        ["ladder", 1, 3, 1, 24], ["ladder", 36, 3, 1, 24], ["console", 24, 2, 4, 1], ["altar", 27, 23, 4, 2], ["light", 9, 14], ["light", 29, 14]
      ],
      marks: [[8, 21, "Party", "party"], [10, 10, "Hush", "foe"]],
      notes: ["The Long Fall calculator on the Toolkit screen handles anyone who goes over."]
    },

    /* ============================================================ S9 */
    {
      id: "s9-eye", title: "The Eye's viewing gallery", place: "The Brow · House Reliquary",
      group: "story", scenes: ["s9", "s5"], band: "above", w: 40, h: 30, bg: "void",
      blurb: "The sealing of the Eye, and an auction: the gallery, the shroud rig, the prayer-circuit and lot 41.",
      areas: [
        { id: "eye", key: "A", name: "The Eye", r: [8, 1, 24, 10], floor: "glass", walls: false, fog: false, pub: true,
          text: "A frozen eye the size of a warehouse, still faintly tracking. Looking into it and seeing the other side: Wisdom save DC 20." },
        { id: "gantry", key: "B", name: "Lid gantry", r: [2, 3, 6, 8], floor: "grate", walls: false, pub: true, text: "Scaffold up to the lash, where the shroud will catch if it tears." },
        { id: "rig", key: "C", name: "Shroud rig", r: [32, 3, 7, 8], floor: "metal", text: "The winches and the shroud itself. Cutting a cable: AC 15, 20 hit points." },
        { id: "gallery", key: "D", name: "Viewing gallery", r: [4, 11, 32, 11], floor: "carpet", pub: true,
          text: "Tiered seats facing the Eye. If the pupil dilates, the floor tilts toward it and everyone slides 10 ft (Dexterity save DC 13)." },
        { id: "circuit", key: "E", name: "Prayer-circuit", r: [1, 22, 12, 7], floor: "metal", text: "Three consoles run the shroud's prayer. Sabotage: Technology or Arcana DC 20." },
        { id: "dais", key: "F", name: "Auction dais", r: [14, 22, 12, 7], floor: "wood", pub: true, text: "The quiet auction. Lot 41 is the Lidless. Lifting it during the ceremony: Sleight of Hand DC 20." },
        { id: "entry", key: "G", name: "Entrance and guards", r: [26, 22, 13, 7], floor: "stone", pub: true, text: "Reliquary guards and the way out to Lanternside." }
      ],
      doors: [[8, 22, "h", "arch", 2], [19, 22, "h", "arch", 2], [30, 22, "h", "arch", 3], [36, 26, "v", "door", 2]],
      f: [
        ["eye", 9, 1, 22, 9], ["ladder", 3, 4, 1, 6], ["cover", 4, 9, 3, 1], ["machine", 33, 4, 5, 3], ["cable", 33, 6, 30, 3], ["cable", 33, 8, 30, 8],
        ["pew", 6, 13, 12, 1], ["pew", 22, 13, 12, 1], ["pew", 6, 16, 12, 1], ["pew", 22, 16, 12, 1], ["pew", 6, 19, 12, 1], ["pew", 22, 19, 12, 1],
        ["console", 2, 23, 4, 1], ["console", 7, 23, 4, 1], ["console", 2, 26, 4, 1], ["desk", 17, 24, 6, 1], ["crate", 19, 26, 2, 2, { label: "41" }],
        ["desk", 28, 24, 3, 1], ["light", 12, 21], ["light", 28, 21]
      ],
      marks: [[32, 27, "Party", "party"], [20, 12, "Sarrow", "foe"]]
    },

    /* =========================================================== S10 */
    {
      id: "s10-pipes", title: "The pipe gallery", place: "Between the Choir-house and the nave",
      group: "story", scenes: ["s10", "s7"], band: "middle", w: 36, h: 26, bg: "void",
      blurb: "The crawlways the last lullaby runs through: relay valves, overloaded pipes and Pell's hollow.",
      areas: [
        { id: "hatch", key: "A", name: "Choir-house hatch", r: [1, 1, 6, 5], floor: "stone", pub: true, text: "Up from the Choir-house drain tunnel." },
        { id: "upper", key: "B", name: "Upper crawl", r: [7, 2, 22, 2], floor: "grate", pub: true, text: "Four feet high. Squeezing past someone: Acrobatics DC 12." },
        { id: "riser", key: "C", name: "Riser", r: [17, 4, 2, 4], floor: "grate", text: "A vertical drop of 20 ft to the valve room, with rungs." },
        { id: "valves", key: "D", name: "Relay valves", r: [12, 8, 10, 8], floor: "metal", pub: true, text: "Routing the song through overloaded pipes: Technology DC 20. Failure: a pipe bursts, 2d6 scalding to everyone in the room." },
        { id: "over", key: "E", name: "Overload pipe", r: [22, 11, 6, 2], floor: "grate", text: "Hot to the touch. Steam every round on a d6 roll of 1." },
        { id: "west", key: "F", name: "West crawl", r: [3, 6, 3, 16], floor: "grate", pub: true, text: "Down toward the lower crawl." },
        { id: "lower", key: "G", name: "Lower crawl", r: [6, 20, 22, 3], floor: "grate", pub: true, text: "Water runs along the bottom. The humming is loudest here (Insight or Arcana DC 20 to hear words in it)." },
        { id: "pell", key: "H", name: "Pell's hollow", r: [28, 18, 7, 7], floor: "wood", text: "Pell hides here with her drawings. Reaching her through the pipes: Stealth or Acrobatics DC 20." },
        { id: "grille", key: "I", name: "Nave grille", r: [29, 1, 6, 5], floor: "stone", pub: true, text: "A grille that opens into the Cantor's nave, behind the choir-engine." }
      ],
      doors: [[7, 2, "v", "arch", 2], [29, 2, "v", "arch", 2], [17, 8, "h", "arch", 2], [22, 11, "v", "arch", 2], [28, 11, "v", "gap", 2], [6, 20, "v", "arch", 2], [28, 20, "v", "arch", 2], [3, 6, "h", "gap", 3]],
      walls: [[[28, 11], [30, 11], [30, 18]], [[28, 13], [29, 13], [29, 18]]],
      f: [
        ["hatch", 2, 2, 2, 2], ["pipe", 7, 2.5, 29, 2.5, { w: 0.25 }], ["pipe", 6, 21.5, 28, 21.5, { w: 0.25 }], ["pipe", 4.5, 6, 4.5, 22, { w: 0.25 }],
        ["ladder", 17, 4, 2, 4], ["machine", 13, 9, 3, 3, { label: "valve" }], ["machine", 17, 9, 3, 3, { label: "valve" }], ["machine", 13, 13, 3, 2], ["console", 18, 13, 3, 1],
        ["vent", 24, 11, 2, 2], ["pipe", 29, 13, 29, 18, { w: 0.2 }], ["bed", 29, 19, 2, 3], ["desk", 32, 19, 2, 1], ["crate", 32, 22], ["vent", 31, 2, 2, 2]
      ],
      marks: [[3, 3, "Party", "party"], [31, 21, "Pell", "party"]]
    },

    /* =========================================================== S11 */
    {
      id: "s11-birth", title: "The birth: the Seventh's rail", place: "The Seventh Rib, as the ribs open",
      group: "story", scenes: ["s11"], band: "middle", w: 40, h: 30, bg: "void",
      blurb: "Dawn: the road along the rib's edge, the rail to hold, the open air where the city used to be, and the newborn's finger.",
      areas: [
        { id: "line", key: "A", name: "Evacuation line", r: [2, 1, 22, 7], floor: "street", walls: false, fog: false, pub: true, text: "Everyone who can walk, walking. Running the voice-lines: Technology or Persuasion DC 20." },
        { id: "chapel", key: "B", name: "Dead-air chapel", r: [26, 1, 10, 7], floor: "stone", pub: true, text: "A chapel full of people and sanctuary static. Reaching it across the tilt: Acrobatics or Stealth DC 20." },
        { id: "road", key: "C", name: "The rail road", r: [2, 8, 30, 6], floor: "street", walls: false, fog: false, pub: true, text: "Tilting a little more every round. At the end of each round, anyone not holding on slides 5 ft toward the rail." },
        { id: "rail", key: "D", name: "The Seventh's rail", r: [2, 14, 30, 2], floor: "grate", walls: false, fog: false, pub: true, text: "Holding the rail against the tilt: Athletics DC 25. Below it, nothing." },
        { id: "air", key: "E", name: "The open air", r: [0, 16, 40, 14], floor: "drop", walls: false, fog: false, pub: true, text: "Where the ribs have opened. Long Fall rules; the newborn catches one person if it has seen them before." },
        { id: "finger", key: "F", name: "The newborn's finger", r: [33, 8, 7, 14], floor: "flesh", walls: false, fog: false, text: "Warm, enormous, curious. Being touched costs 1 Humanity and is the kindest thing that has ever happened to them." }
      ],
      doors: [[30, 8, "h", "door", 2]],
      f: [
        ["crowd", 3, 2, 20, 5], ["crowd", 27, 2, 8, 5], ["sign", 6, 7, 3, 1], ["sign", 16, 7, 3, 1], ["rubble", 5, 9, 6, 4], ["rubble", 20, 10, 8, 3], ["car", 12, 9, 5, 3],
        ["rail", 2, 16, 32, 16], ["hand", 32, 8, 8, 13], ["rubble", 10, 20, 12, 6]
      ],
      marks: [[14, 11, "Party", "party"]]
    },

    /* =========================================================== S12 */
    {
      id: "s12-ruins", title: "The Sending", place: "The ruins of the Reliquary gallery",
      group: "story", scenes: ["s12"], band: "above", w: 36, h: 26, bg: "stone",
      blurb: "After the birth: the Eye on its side, closed outside and open inside, and bodies from earlier loops.",
      areas: [
        { id: "eye", key: "A", name: "The Eye", r: [8, 1, 20, 11], floor: "glass", walls: false, pub: true,
          text: "Closed on the outside, open on the inside. Lifting it together: a group Athletics check, DC 20. Reading its log of past sendings: Technology or Arcana DC 20." },
        { id: "wall", key: "B", name: "Broken wall", r: [29, 1, 7, 11], floor: "drop", walls: false, fog: false, text: "Open to the sky. The newborn leans over here to watch; its breath knocks everyone prone (Strength save DC 15)." },
        { id: "gallery", key: "C", name: "Collapsed gallery", r: [1, 12, 34, 13], floor: "stone", walls: false, pub: true, text: "Rubble, fallen seats and dust. Difficult terrain everywhere except the aisle." },
        { id: "bodies", key: "D", name: "The earlier loops", r: [2, 15, 10, 7], floor: "bone", walls: false,
          text: "Bodies in the crew's clothes, older each time. Holding their nerve in front of their own corpses: Wisdom save DC 20. One of them is not dead." },
        { id: "survivors", key: "E", name: "Survivors' corner", r: [24, 18, 10, 6], floor: "stone", walls: false, pub: true, text: "Hush survivors and whoever else made it. They will beg the crew not to send anything." }
      ],
      f: [
        ["eye", 9, 2, 18, 9, { closed: true }], ["rubble", 1, 12, 34, 3], ["rubble", 14, 16, 8, 8], ["rubble", 26, 13, 8, 4],
        ["body", 3, 16, 2, 1], ["body", 6, 17, 2, 1], ["body", 3, 19, 2, 1], ["body", 8, 20, 2, 1], ["crowd", 25, 19, 8, 4], ["pew", 13, 13, 6, 1], ["pew", 20, 22, 6, 1]
      ],
      marks: [[18, 23, "Party", "party"]]
    },

    /* ======================================================= streets */
    {
      id: "gullet-market", title: "The Gullet market", place: "The Gullet · below the Nave",
      group: "street", scenes: ["s2", "s3"], band: "below", w: 36, h: 26, bg: "flesh",
      blurb: "The undercity market in the god's throat: stalls, a noodle bar, a pawn cage and three ways out.",
      areas: [
        { id: "lane", key: "A", name: "Market lane", r: [0, 9, 36, 7], floor: "street", fog: false, pub: true,
          text: "The main lane. Crowded by day (difficult terrain away from the middle), half-lit and taxed by gangs at night." },
        { id: "noodle", key: "B", name: "Noodle bar", r: [2, 2, 9, 7], floor: "wood", pub: true,
          text: "Steam, a counter and a back door. The cook sells rumours with the broth." },
        { id: "pawn", key: "C", name: "Pawn cage", r: [13, 2, 8, 7], floor: "grate", pub: true,
          text: "Second-hand chrome behind bars. Some of it still twitches. Remnants included at no extra charge." },
        { id: "stairs", key: "D", name: "Stair to the Spine", r: [23, 1, 6, 8], floor: "stone", walls: false, pub: true,
          text: "Up to the Spine station. A gang takes a toll here at night." },
        { id: "gully", key: "E", name: "Rib gully", r: [30, 0, 6, 9], floor: "drop", walls: false, fog: false,
          text: "A gap between two ribs. A Long Fall to Weepwater, 180 ft below." },
        { id: "clinic", key: "F", name: "Black clinic", r: [2, 16, 10, 8], floor: "tile",
          text: "Two chairs, one ripperdoc, no questions. The back room connects to the drain." },
        { id: "stalls", key: "G", name: "Stall row", r: [13, 17, 14, 6], floor: "street", walls: false, pub: true,
          text: "Food, charms and stolen lift passes. Every stallholder watched you buy something." },
        { id: "drain", key: "H", name: "Drain mouth", r: [28, 17, 7, 8], floor: "water",
          text: "A grate into the run-off tunnels to Weepwater. Knee-deep. Nobody follows you in there without a reason." }
      ],
      doors: [[5, 9, "h", "door", 2], [16, 9, "h", "shutter", 3], [6, 16, "h", "door", 2], [28, 20, "v", "arch", 2], [2, 5, "v", "door"]],
      f: [
        ["counter", 3, 3, 6, 1], ["stool", 3, 4], ["stool", 5, 4], ["stool", 7, 4], ["table", 3, 6, 2, 2], ["table", 7, 6, 2, 2],
        ["cage", 14, 3, 6, 3], ["shelf", 14, 7, 6, 1], ["stairs", 24, 1, 4, 8, { dir: "n" }],
        ["stall", 2, 10, 3, 2], ["stall", 8, 13, 3, 2], ["stall", 20, 10, 3, 2], ["stall", 27, 13, 3, 2], ["crowd", 5, 11, 26, 3],
        ["bed", 3, 17, 2, 3], ["bed", 6, 17, 2, 3], ["machine", 9, 20, 2, 3], ["stall", 13, 18, 3, 2], ["stall", 17, 18, 3, 2],
        ["stall", 21, 18, 3, 2], ["crate", 25, 21], ["crate", 14, 21], ["hatch", 31, 20, 2, 2], ["light", 12, 12], ["light", 24, 12],
        ["sign", 3, 9, 4, 1], ["sign", 14, 9, 4, 1]
      ],
      marks: [[1, 12, "West", "exit"], [35, 12, "East", "exit"], [26, 1, "Up", "exit"]],
      notes: ["By night, roll on the street table for below the Nave. Anything that turns up can enter from either end of the lane."]
    },
    {
      id: "tallowgate-yards", title: "Tallowgate rendering yards", place: "Tallowgate · below the Nave",
      group: "street", band: "below", w: 36, h: 26, bg: "dirt",
      blurb: "Rendering vats, carvers' warrens and the back doors of every black clinic worth the name.",
      areas: [
        { id: "yard", key: "A", name: "Rendering yard", r: [1, 1, 16, 12], floor: "dirt", walls: false, fog: false, pub: true, text: "Vats of boiling marrow and drying racks. The fumes: Constitution save DC 10 after an hour or poisoned until you leave." },
        { id: "warren", key: "B", name: "Carvers' warren", r: [18, 1, 17, 8], floor: "wood", pub: true, text: "Six workshop booths, each an unlicensed carver. House Lathe inspectors come through twice a week." },
        { id: "alley", key: "C", name: "Warren alley", r: [18, 9, 17, 4], floor: "street", walls: false, fog: false, pub: true, text: "Narrow, wet and watched from every booth." },
        { id: "clinic", key: "D", name: "Clinic back room", r: [18, 13, 8, 12], floor: "tile", text: "The back door of a black clinic: a chair, a cooler of parts and a drain." },
        { id: "boneyard", key: "E", name: "Boneyard", r: [1, 14, 16, 11], floor: "dirt", walls: false, pub: true, text: "Offcuts of the god, stacked. Scavengers at night. Difficult terrain." },
        { id: "stack", key: "F", name: "Chimney stack", r: [27, 13, 8, 12], floor: "metal", text: "The furnace. Hot enough to lose a body in. Climbing the stack leads up to the Nave's underside (Athletics DC 15)." }
      ],
      walls: [[[21, 1], [21, 9]], [[24, 1], [24, 9]], [[27, 1], [27, 9]], [[30, 1], [30, 9]], [[33, 1], [33, 9]], [[18, 5], [35, 5]]],
      doors: [[19, 9, "h", "gap"], [22, 9, "h", "gap"], [25, 9, "h", "gap"], [28, 9, "h", "gap"], [31, 9, "h", "gap"], [21, 13, "h", "door", 2], [30, 13, "h", "door", 2]],
      f: [
        ["vat", 2, 2, 3, 3], ["vat", 6, 2, 3, 3], ["vat", 10, 2, 3, 3], ["shelf", 2, 7, 12, 1], ["shelf", 2, 9, 12, 1], ["crate", 14, 3], ["crate", 15, 5],
        ["table", 19, 2, 2, 2], ["table", 22, 2, 2, 2], ["table", 25, 2, 2, 2], ["table", 28, 2, 2, 2], ["table", 31, 2, 2, 2], ["table", 22, 6, 2, 2], ["table", 28, 6, 2, 2],
        ["bones", 2, 15, 14, 9], ["rubble", 5, 18, 6, 4], ["bed", 20, 15, 2, 3], ["tank", 22, 20, 3, 3], ["hatch", 19, 22, 2, 2], ["engine", 28, 15, 6, 6], ["pipe", 31, 13, 31, 1, { w: 0.4 }]
      ],
      marks: [[0.5, 12, "West", "exit"], [35.5, 11, "East", "exit"]]
    },
    {
      id: "weepwater-stairs", title: "Weepwater cistern stairs", place: "Weepwater · below the Nave",
      group: "street", band: "below", scenes: ["s7"], w: 34, h: 26, bg: "stone",
      blurb: "Flooded stairs down to a public cistern, a pump house and the hidden way to the Choir-house.",
      areas: [
        { id: "stairs", key: "A", name: "Flooded stairs", r: [1, 1, 8, 24], floor: "stone", walls: false, fog: false, pub: true, text: "Steps down into ankle-deep, then waist-deep water. The lower half is difficult terrain." },
        { id: "edge", key: "B", name: "Cistern edge", r: [9, 1, 16, 4], floor: "stone", walls: false, pub: true, text: "A ledge with washing lines and a shrine to the water." },
        { id: "cistern", key: "C", name: "The cistern", r: [9, 5, 24, 14], floor: "water", walls: false, fog: false, pub: true, lx: 20, ly: 16.5, text: "Deep, cold at the edges, warm in the middle. Swimming: Athletics DC 12; the warm middle sings at night." },
        { id: "pump", key: "D", name: "Pump house", r: [25, 1, 8, 4], floor: "metal", pub: true, text: "The Watch keeps a ward here. Shutting the pumps floods the stairs in a minute." },
        { id: "bridge", key: "E", name: "Iron bridge", r: [13, 11, 16, 2], floor: "grate", walls: false, pub: true, text: "Over the cistern to the far landing." },
        { id: "landing", key: "F", name: "Stair landing", r: [9, 19, 16, 6], floor: "stone", walls: false, pub: true, text: "Where the washers gather. Market by day." },
        { id: "hush", key: "G", name: "The singing door", r: [26, 19, 7, 6], floor: "stone", text: "A door behind a curtain of run-off. Behind it, the way down to the Choir-house (Perception DC 20 to notice it hums)." }
      ],
      doors: [[28, 5, "h", "door", 2], [26, 21, "v", "secret", 2]],
      f: [
        ["stairs", 1, 1, 8, 13, { dir: "s" }], ["cable", 10, 2, 24, 3], ["altar", 21, 1, 2, 1], ["machine", 26, 2, 3, 2], ["ward", 30, 2, 2, 2],
        ["rail", 9, 5, 25, 5], ["crowd", 11, 20, 12, 4], ["stall", 12, 22, 3, 2], ["stall", 18, 22, 3, 2], ["pipe", 30, 5, 30, 19, { w: 0.4 }], ["light", 20, 12]
      ],
      patches: [{ r: [1, 14, 8, 11], floor: "water" }],
      marks: [[4, 1, "Up", "exit"], [29, 22, "Down", "exit"]]
    },
    {
      id: "chapel-small", title: "A chapel on neutral ground", place: "Any district · Sanctum Null or a House chapel",
      group: "street", band: "middle", w: 26, h: 18, bg: "street",
      blurb: "Where deals get struck: dead air, no recordings, and a priest who hears nothing.",
      areas: [
        { id: "porch", key: "A", name: "Porch", r: [9, 13, 8, 4], floor: "stone", pub: true, text: "Wirewalkers wait out here in the rain: sanctuary static starts at the door." },
        { id: "nave", key: "B", name: "Chapel", r: [5, 1, 16, 12], floor: "tile", pub: true, text: "Dead air: no netrunning, no smartlink, no comms, and powered cyberware works at disadvantage. Deals here aren't recorded." },
        { id: "confess", key: "C", name: "Confessional", r: [1, 1, 4, 6], floor: "wood", pub: true, text: "Two booths. The quietest place in the district." },
        { id: "vestry", key: "D", name: "Vestry", r: [21, 1, 4, 6], floor: "wood", text: "Robes, candles, the poor box and a back door." },
        { id: "crypt", key: "E", name: "Crypt stair", r: [21, 7, 4, 6], floor: "stone", text: "Down to the ossuary. Some chapels' crypts connect to the drains." }
      ],
      doors: [[12, 13, "h", "door", 2], [5, 3, "v", "door"], [21, 3, "v", "door"], [21, 9, "v", "door"], [25, 3, "v", "locked"]],
      f: [["altar", 11, 2, 4, 1], ["pew", 7, 5, 5, 1], ["pew", 14, 5, 5, 1], ["pew", 7, 7, 5, 1], ["pew", 14, 7, 5, 1], ["pew", 7, 9, 5, 1], ["pew", 14, 9, 5, 1],
          ["light", 10, 2], ["light", 15, 2], ["bench", 2, 2, 2, 1], ["bench", 2, 4, 2, 1], ["shelf", 22, 2, 2, 1], ["stairs", 22, 8, 2, 4, { dir: "s" }], ["pillar", 6, 12], ["pillar", 19, 12]],
      marks: [[13, 17, "In", "exit"]]
    },
    {
      id: "lanternside", title: "Lanternside pilgrim street", place: "Lanternside · above the Seventh",
      group: "street", band: "above", w: 38, h: 26, bg: "street",
      blurb: "Hostels, shrines and lantern-sellers, and the line to the Eye.",
      areas: [
        { id: "street", key: "A", name: "Pilgrim street", r: [0, 10, 38, 6], floor: "street", fog: false, pub: true, text: "Lantern stalls and pilgrims. By day it's a procession; at night, lanterns and pickpockets." },
        { id: "hostel1", key: "B", name: "Hostel of the Open Hand", r: [1, 1, 14, 9], floor: "wood", pub: true, text: "Forty beds, one landlady, no questions for pilgrims." },
        { id: "shrine", key: "C", name: "Street shrine", r: [16, 1, 8, 9], floor: "tile", pub: true, text: "Candles and offerings. Sanctuary static inside." },
        { id: "queue", key: "D", name: "The line to the Eye", r: [25, 1, 12, 9], floor: "stone", walls: false, pub: true, text: "Roped queue to House Reliquary's gallery, up the Brow stair." },
        { id: "hostel2", key: "E", name: "Hostel of the Weeping", r: [1, 16, 14, 9], floor: "wood", pub: true, text: "Cheaper. The walls are thin and the landlord sells what he hears." },
        { id: "sellers", key: "F", name: "Lantern market", r: [16, 16, 12, 9], floor: "street", walls: false, pub: true, text: "Lanterns, relics of dubious origin and hot food." },
        { id: "brow", key: "G", name: "Brow stair", r: [29, 16, 8, 9], floor: "stone", walls: false, pub: true, text: "Up to the Brow and the Eye's gallery." }
      ],
      doors: [[7, 10, "h", "door", 2], [19, 10, "h", "arch", 2], [7, 16, "h", "door", 2]],
      f: [
        ["bed", 2, 2, 2, 3], ["bed", 5, 2, 2, 3], ["bed", 8, 2, 2, 3], ["bed", 11, 2, 2, 3], ["counter", 2, 7, 5, 1], ["altar", 18, 2, 4, 1], ["light", 17, 4], ["light", 22, 4], ["bench", 17, 6, 6, 1],
        ["barrier", 26, 3, 10, 1], ["barrier", 26, 5, 10, 1], ["barrier", 26, 7, 10, 1], ["crowd", 26, 2, 10, 7], ["crowd", 3, 11, 30, 4], ["stall", 5, 11, 3, 1], ["stall", 20, 14, 3, 1],
        ["bed", 2, 20, 2, 3], ["bed", 5, 20, 2, 3], ["bed", 8, 20, 2, 3], ["counter", 2, 17, 5, 1], ["stall", 17, 17, 3, 2], ["stall", 22, 17, 3, 2], ["stall", 17, 21, 3, 2], ["stall", 22, 21, 3, 2],
        ["stairs", 30, 17, 6, 8, { dir: "n" }], ["light", 12, 13], ["light", 26, 13]
      ],
      marks: [[0.5, 13, "West", "exit"], [37.5, 13, "East", "exit"], [33, 24, "Brow", "exit"]]
    },
    {
      id: "crown-manor", title: "A Crown manor party", place: "The Crown · a House manor",
      group: "heist", band: "above", w: 40, h: 30, bg: "garden",
      blurb: "Gardens above the weather, a ballroom, a study with a safe, the servants' corridor and a balcony over nothing.",
      areas: [
        { id: "garden", key: "A", name: "Gardens", r: [0, 20, 40, 10], floor: "garden", walls: false, fog: false, pub: true, text: "Hedges and fountains. Anyone well dressed walks in through the gate." },
        { id: "ballroom", key: "B", name: "Ballroom", r: [10, 8, 20, 12], floor: "wood", pub: true, text: "A string quartet, a hundred guests and a House heir looking for trouble." },
        { id: "gallery", key: "C", name: "Long gallery", r: [10, 1, 20, 7], floor: "carpet", pub: true, text: "Portraits and bone sculpture. Guards pass every five minutes." },
        { id: "study", key: "D", name: "Study", r: [30, 1, 9, 9], floor: "carpet", text: "The House's safe (thieves' tools DC 20), a desk of letters, and a window onto the balcony." },
        { id: "balcony", key: "E", name: "Balcony", r: [30, 10, 9, 5], floor: "stone", walls: false, pub: true, text: "Over the edge of the Crown. The drop is the whole city." },
        { id: "servants", key: "F", name: "Servants' corridor", r: [1, 1, 9, 3], floor: "stone", text: "The quiet way round the house. Servants notice strangers (Deception DC 13 in livery)." },
        { id: "kitchen", key: "G", name: "Kitchens", r: [1, 4, 9, 10], floor: "tile", text: "Busy, hot and full of knives. The service lift is here." },
        { id: "pad", key: "H", name: "AV pad", r: [30, 15, 9, 5], floor: "metal", walls: false, pub: true, text: "The guests' AVs. Keys with the valet." },
        { id: "drop", key: "I", name: "The edge", r: [39, 10, 1, 10], floor: "drop", walls: false, fog: false, text: "The Crown ends. Long Fall." }
      ],
      doors: [[18, 20, "h", "door", 4], [18, 8, "h", "arch", 4], [30, 4, "v", "door"], [34, 10, "h", "window", 2], [30, 12, "v", "door", 2], [10, 2, "v", "door"], [5, 4, "h", "door"], [10, 10, "v", "door"]],
      f: [
        ["tree", 2, 22, 3, 3], ["tree", 34, 23, 3, 3], ["fountain", 17, 23, 5, 5], ["plants", 5, 21, 9, 7], ["plants", 25, 21, 8, 7],
        ["crowd", 12, 11, 16, 7], ["table", 11, 9, 4, 1], ["table", 25, 9, 4, 1], ["pillar", 11, 18], ["pillar", 28, 18],
        ["shelf", 11, 1, 18, 1], ["bench", 13, 5, 3, 1], ["bench", 24, 5, 3, 1], ["desk", 32, 3, 4, 2], ["crate", 37, 2, 1, 1, { label: "safe" }], ["shelf", 38, 4, 1, 5],
        ["counter", 2, 6, 7, 1], ["machine", 2, 8, 3, 2], ["lift", 6, 10, 3, 3], ["av", 31, 16, 3, 3], ["av", 35, 16, 3, 3], ["rail", 39, 10, 39, 15]
      ],
      marks: [[19, 29, "Gate", "exit"], [20, 26, "Party", "party"]]
    },

    /* ============================================== heists, hideouts */
    {
      id: "black-clinic", title: "Dr. Vhoss's black clinic", place: "Tallowgate · behind a laundry",
      group: "heist", band: "below", scenes: ["s4"], w: 30, h: 20, bg: "stone",
      blurb: "Better work than the Houses' and everyone knows it: waiting room, surgery, recovery and the back room.",
      areas: [
        { id: "laundry", key: "A", name: "Laundry front", r: [1, 13, 10, 6], floor: "tile", pub: true, text: "Steam and sheets. The laundress decides who gets through." },
        { id: "waiting", key: "B", name: "Waiting room", r: [1, 1, 10, 12], floor: "wood", pub: true, text: "Six chairs, all full, all with something wrong." },
        { id: "surgery", key: "C", name: "Surgery", r: [11, 1, 11, 10], floor: "tile", text: "Two tables under lamps. Vhoss works with her back to the door and knows exactly who's behind her." },
        { id: "recovery", key: "D", name: "Recovery", r: [11, 11, 11, 8], floor: "tile", text: "Beds, drips and patients in no state to run." },
        { id: "store", key: "E", name: "Marrow store", r: [22, 1, 7, 8], floor: "metal", text: "Carved implants and raw marrow the Houses haven't released. Locked (thieves' tools DC 15)." },
        { id: "back", key: "F", name: "Back room", r: [22, 9, 7, 10], floor: "carpet", text: "Vhoss's private room. After session 4, the Lidless may be here." }
      ],
      doors: [[5, 13, "h", "door", 2], [11, 5, "v", "door", 2], [16, 11, "h", "door", 2], [22, 4, "v", "locked"], [22, 13, "v", "door"], [29, 16, "v", "secret", 2]],
      f: [
        ["machine", 2, 14, 3, 2, { label: "washers" }], ["machine", 6, 14, 3, 2], ["counter", 2, 17, 6, 1], ["chair", 2, 3], ["chair", 2, 5], ["chair", 2, 7], ["chair", 8, 3], ["chair", 8, 5], ["chair", 8, 7], ["desk", 4, 10, 3, 1],
        ["bed", 12, 3, 2, 4], ["bed", 17, 3, 2, 4], ["machine", 14, 8, 3, 2], ["light", 13, 2], ["light", 18, 2], ["bed", 12, 13, 2, 4], ["bed", 15, 13, 2, 4], ["bed", 18, 13, 2, 4],
        ["shelf", 23, 2, 5, 1], ["shelf", 23, 5, 5, 1], ["tank", 26, 6, 2, 2], ["desk", 23, 11, 3, 1], ["crate", 27, 14, 1, 1, { label: "?", gm: true }], ["bed", 24, 15, 2, 3]
      ],
      marks: [[6, 18, "In", "exit"], [29, 17, "Drain", "exit"]]
    },
    {
      id: "repo-warehouse", title: "Reliquary repossession warehouse", place: "The Vaults · House Reliquary",
      group: "heist", band: "above", w: 38, h: 26, bg: "metal",
      blurb: "Where missed payments end up: aisles of repossessed shunts, a loading dock and guard drones.",
      areas: [
        { id: "dock", key: "A", name: "Loading dock", r: [1, 18, 14, 7], floor: "metal", pub: true, text: "Carts come in at night. The dock master checks every crate against a manifest." },
        { id: "aisles", key: "B", name: "Storage aisles", r: [1, 1, 26, 17], floor: "metal", pub: true, text: "Rows of shelving. Every shunt is tagged with a name and a missed date (Investigation DC 12 to find one)." },
        { id: "cages", key: "C", name: "Live cages", r: [27, 1, 10, 10], floor: "grate", text: "Shunts something has grown into. They move. Opening a cage: thieves' tools DC 15." },
        { id: "office", key: "D", name: "Clerk's office", r: [27, 11, 10, 7], floor: "carpet", text: "Manifests and the drone controller (Technology DC 15 to send the drones elsewhere)." },
        { id: "charging", key: "E", name: "Drone bay", r: [15, 18, 22, 7], floor: "grate", text: "Two guard drones charging (Combat Drone). They wake if an alarm sounds." }
      ],
      doors: [[5, 25, "h", "shutter", 4], [7, 18, "h", "arch", 3], [27, 5, "v", "locked", 2], [27, 14, "v", "door"], [20, 18, "h", "arch", 3]],
      f: [
        ["shelf", 3, 3, 1, 12], ["shelf", 7, 3, 1, 12], ["shelf", 11, 3, 1, 12], ["shelf", 15, 3, 1, 12], ["shelf", 19, 3, 1, 12], ["shelf", 23, 3, 1, 12],
        ["crate", 2, 20], ["crate", 3, 20], ["crate", 2, 21], ["crate", 9, 21, 2, 2], ["car", 4, 22, 5, 3], ["cage", 28, 2, 4, 3], ["cage", 32, 2, 4, 3], ["cage", 28, 6, 4, 3], ["cage", 32, 6, 4, 3],
        ["desk", 28, 12, 4, 1], ["console", 33, 12, 3, 1], ["shelf", 28, 16, 8, 1], ["machine", 17, 20, 3, 3, { label: "drone" }], ["machine", 22, 20, 3, 3, { label: "drone" }], ["console", 30, 19, 5, 1], ["camera", 25, 1, 1, 1, { gm: true }]
      ],
      marks: [[8, 24, "Dock", "exit"]]
    },
    {
      id: "fixer-den", title: "Mother Slate's back room", place: "The Marrowworks · behind a pawnshop",
      group: "heist", band: "below", scenes: ["s1", "s2"], w: 28, h: 20, bg: "bone",
      blurb: "Where jobs start and debts are counted in wax.",
      areas: [
        { id: "shop", key: "A", name: "Pawnshop", r: [1, 12, 14, 7], floor: "wood", pub: true, text: "The front: pawned tools and chrome. Slate's nephew minds it and pretends not to." },
        { id: "office", key: "B", name: "Slate's office", r: [1, 1, 14, 11], floor: "carpet", pub: true, text: "Four hands, one ledger in wax, and fair rates. The table where jobs are offered." },
        { id: "vault", key: "C", name: "Wax vault", r: [15, 1, 6, 6], floor: "metal", text: "Every favour Slate is owed, in wax, ready to be melted if the Houses come." },
        { id: "back", key: "D", name: "Back hall", r: [15, 7, 12, 5], floor: "stone", pub: true, text: "To the loading door and the drillers' stair." },
        { id: "den", key: "E", name: "The quiet room", r: [15, 12, 12, 7], floor: "wood", text: "Where people who owe Slate wait. Cots and a lock on the outside." }
      ],
      doors: [[7, 12, "h", "door", 2], [15, 3, "v", "locked"], [15, 9, "v", "door"], [20, 12, "h", "locked"], [27, 9, "v", "door", 2], [7, 19, "h", "door", 2]],
      f: [["table", 4, 4, 6, 3], ["chair", 3, 5], ["chair", 10, 5], ["chair", 6, 3], ["chair", 6, 7], ["shelf", 1, 1, 13, 1], ["light", 7, 5], ["shelf", 16, 2, 4, 1], ["shelf", 16, 5, 4, 1],
          ["counter", 2, 14, 10, 1], ["shelf", 2, 17, 11, 1], ["bed", 17, 14, 2, 3], ["bed", 21, 14, 2, 3], ["crate", 24, 8], ["crate", 25, 8]],
      marks: [[8, 19, "Street", "exit"], [27, 10, "Back", "exit"]]
    },

    /* ================================================== chases, heights */
    {
      id: "rooftops", title: "Gantries between the ribs", place: "Any rib · above the drop",
      group: "chase", w: 40, h: 30, bg: "void",
      blurb: "Platforms over nothing, joined by gantries, ladders and a zip cable: a chase or a fight with a Long Fall on every side.",
      areas: [
        { id: "p1", key: "A", name: "Water tower roof", r: [1, 1, 9, 8], floor: "metal", walls: false, pub: true, text: "Flat, exposed, a tank to hide behind." },
        { id: "g1", key: "B", name: "Gantry", r: [10, 4, 8, 2], floor: "grate", walls: false, pub: true, text: "Sways. Running it: Acrobatics DC 12." },
        { id: "p2", key: "C", name: "Signal mast", r: [18, 1, 10, 9], floor: "metal", walls: false, pub: true, text: "Aerials and a ladder down. Cover behind the mast housings." },
        { id: "gap", key: "D", name: "The gap", r: [28, 3, 4, 4], floor: "drop", walls: false, fog: false, text: "20 ft to the next roof, 10 ft lower. Jump: Athletics DC 15." },
        { id: "p3", key: "E", name: "Chapel roof", r: [32, 1, 7, 10], floor: "stone", walls: false, pub: true, text: "Sloped tiles (difficult terrain). Dead air below." },
        { id: "p4", key: "F", name: "Scaffold", r: [2, 14, 12, 7], floor: "grate", walls: false, pub: true, text: "Builders' scaffold down the rib face. Ladders every 10 ft." },
        { id: "zip", key: "G", name: "Zip cable", r: [14, 16, 12, 1], floor: "grate", walls: false, text: "A cable from the scaffold to the vent stack. Riding it with anything: Dexterity save DC 12 or fall." },
        { id: "p5", key: "H", name: "Vent stack", r: [26, 13, 10, 10], floor: "metal", walls: false, pub: true, text: "Hot vents; standing on one at the end of a turn: 1d6 fire." },
        { id: "p6", key: "I", name: "Landing", r: [8, 24, 24, 5], floor: "street", walls: false, pub: true, text: "The street below, finally. A lift stop at the east end." }
      ],
      f: [
        ["tank", 3, 2, 4, 4], ["cover", 1, 7, 3, 1], ["rail", 10, 4, 18, 4], ["rail", 10, 6, 18, 6], ["engine", 21, 2, 4, 4], ["ladder", 26, 7, 1, 7], ["vent", 34, 3, 2, 2], ["vent", 34, 7, 2, 2],
        ["ladder", 3, 9, 1, 5], ["ladder", 12, 21, 1, 3], ["crate", 5, 16], ["crate", 9, 18], ["cable", 14, 16.5, 26, 16.5], ["vent", 28, 15, 2, 2], ["vent", 32, 15, 2, 2], ["vent", 28, 19, 2, 2], ["vent", 32, 19, 2, 2],
        ["ladder", 30, 23, 1, 1], ["lift", 28, 25, 3, 3], ["car", 12, 25, 4, 3]
      ],
      marks: [[4, 2, "Start", "party"], [36, 26, "Out", "exit"]],
      notes: ["Use the Chase tracker on the Toolkit screen alongside this map: each platform is one step of the gap."]
    },
    {
      id: "lift-car", title: "Inside a Spine lift car", place: "The Sevenfold Spine · between stops",
      group: "chase", band: "middle", scenes: ["s3", "s8"], w: 22, h: 14, bg: "void",
      blurb: "A fight in a moving car: the car, its roof hatch, the counterweight going the other way, and the shaft.",
      areas: [
        { id: "car", key: "A", name: "The car", r: [4, 4, 10, 6], floor: "metal", pub: true, text: "Twelve seats, one operator, doors that won't open between stops (Athletics DC 18 to force)." },
        { id: "roof", key: "B", name: "Car roof", r: [4, 1, 10, 3], floor: "grate", walls: false, pub: true, text: "Up through the hatch. The cable and the shaft wall rush past; anything taller than 5 ft on the roof at a junction takes 2d10 bludgeoning." },
        { id: "weight", key: "C", name: "Counterweight", r: [16, 3, 4, 8], floor: "metal", walls: false, text: "Passes the car every 30 seconds. Jumping across: Athletics DC 15." },
        { id: "shaft", key: "D", name: "The shaft", r: [0, 11, 22, 3], floor: "drop", walls: false, fog: false, pub: true, text: "Long Fall." }
      ],
      doors: [[8, 10, "h", "shutter", 2], [8, 4, "h", "door", 2]],
      f: [["bench", 5, 5, 8, 1], ["bench", 5, 8, 8, 1], ["console", 12, 6, 1, 2, { label: "op" }], ["hatch", 8, 2, 2, 2], ["cable", 9, 0, 9, 1], ["cable", 18, 0, 18, 3], ["machine", 16, 4, 4, 6]],
      marks: [[6, 7, "Party", "party"]]
    },
    {
      id: "av-pad", title: "AV pad and garage", place: "Any upper district",
      group: "chase", band: "above", w: 32, h: 22, bg: "void",
      blurb: "Where a vehicle chase starts: the pad over the drop, the garage, fuel and a control booth.",
      areas: [
        { id: "pad", key: "A", name: "Landing pad", r: [12, 1, 19, 12], floor: "metal", walls: false, fog: false, pub: true, text: "Two AVs and room for a third. The edge is unrailed." },
        { id: "garage", key: "B", name: "Garage", r: [1, 1, 11, 12], floor: "metal", pub: true, text: "Bikes, a car on a lift and tools. The mechanic sleeps upstairs." },
        { id: "fuel", key: "C", name: "Fuel store", r: [1, 13, 7, 8], floor: "grate", text: "Ichor cells. Anything that sets them off: 6d6 fire in a 20 ft radius (Dexterity save DC 15 for half)." },
        { id: "booth", key: "D", name: "Control booth", r: [8, 13, 8, 8], floor: "tile", text: "Landing clearances and the Watch's AV register (Technology DC 15 to scrub a registration)." },
        { id: "edge", key: "E", name: "The edge", r: [16, 13, 16, 9], floor: "drop", walls: false, fog: false, pub: true, text: "Open air. An AV can drop into it; a person can't." }
      ],
      doors: [[12, 5, "v", "shutter", 4], [4, 13, "h", "door", 2], [8, 16, "v", "door"], [12, 17, "v", "window", 2]],
      f: [["av", 15, 3, 5, 4], ["av", 23, 3, 5, 4], ["ring", 17, 7, 8, 5], ["car", 2, 2, 4, 6], ["car", 7, 3, 2, 4], ["car", 7, 8, 2, 4], ["shelf", 1, 11, 10, 1],
          ["tank", 2, 14, 2, 2], ["tank", 4, 14, 2, 2], ["tank", 2, 17, 2, 2], ["console", 9, 14, 5, 1], ["desk", 10, 18, 3, 1], ["light", 13, 1], ["light", 30, 1]],
      marks: [[3, 20, "Party", "party"]]
    },
    {
      id: "alley", title: "A dead-end alley", place: "Anywhere below the Nave",
      group: "chase", band: "below", w: 24, h: 16, bg: "flesh",
      blurb: "The generic ambush: an alley, a fire escape, a drain and a door that might be unlocked.",
      areas: [
        { id: "alley", key: "A", name: "Alley", r: [0, 5, 24, 6], floor: "street", walls: false, fog: false, pub: true, text: "Bins, puddles and one lamp. The far end is a wall." },
        { id: "escape", key: "B", name: "Fire escape", r: [6, 1, 6, 4], floor: "grate", walls: false, pub: true, text: "Up to the roofs (Athletics DC 12 to reach the ladder)." },
        { id: "door", key: "C", name: "Back door", r: [14, 11, 8, 4], floor: "tile", text: "A kitchen, a storeroom, or a gang's front: roll or choose. Locked half the time (thieves' tools DC 13)." },
        { id: "drain", key: "D", name: "Drain", r: [1, 11, 5, 4], floor: "water", walls: false, text: "A grate into the run-off. Tight squeeze (Acrobatics DC 13)." }
      ],
      doors: [[17, 11, "h", "door", 2]],
      f: [["crate", 3, 6], ["crate", 4, 6], ["crate", 18, 8], ["cover", 10, 9, 3, 1], ["ladder", 8, 4, 1, 1], ["light", 12, 6], ["hatch", 2, 12, 2, 2], ["vent", 22, 6, 2, 2], ["rubble", 19, 5, 4, 3]],
      marks: [[1, 8, "In", "exit"]]
    }
  ]
};

/* The city itself, drawn from Cathedra's districts in campaigns.js: each rib
   at its real height (one square is 50 ft), the Spine up the middle with a
   stop at every district. For the Long Fall, the pilgrimage and the birth. */
(function () {
  var camp = ((window.TTBC && window.TTBC.campaigns) || []).filter(function (c) { return c.id === "cathedra"; })[0];
  if (!camp || !camp.districts || !window.TTMAPS) return;
  var ds = camp.districts.slice().sort(function (a, b) { return a.height - b.height; });
  var houses = {};
  (camp.houses || []).forEach(function (h) { houses[h.id] = h.name; });
  var FT = 50, W = 32, top = ds[ds.length - 1].height + 200;
  var H = Math.ceil(top / FT) + 3, cx = W / 2;
  function yOf(ft) { return H - 2 - ft / FT; }
  function half(ft) { return 5 + 8 * Math.sin(Math.PI * Math.min(1, ft / top)); }
  function feet(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  var keys = "ABCDEFGHIJKLMN";
  var areas = [], f = [], labels = [];
  ds.forEach(function (d, i) {
    var lo = d.height, hi = i + 1 < ds.length ? ds[i + 1].height : top - 60;
    var y0 = yOf(lo), y1 = yOf(hi);
    var floor = d.band === "below" ? (d.id === "weepwater" ? "water" : "flesh") : d.band === "middle" ? "stone" : d.id === "crown" ? "garden" : "carpet";
    areas.push({
      id: d.id, key: keys[i], name: d.name, floor: floor, fog: false, pub: true,
      poly: [[cx - half(lo), y0], [cx + half(lo), y0], [cx + half(hi), y1 + 0.3], [cx - half(hi), y1 + 0.3]],
      lx: cx + half(lo) * 0.55, ly: (y0 + y1) / 2 + 0.2,
      text: d.notes + " " + feet(d.height) + " ft above the Marrowworks floor" +
        (houses[d.house] ? "; held by " + houses[d.house] + "." : ".")
    });
    labels.push([feet(d.height) + " ft", cx - half(lo) - 2.2, y0 - 0.2]);
    f.push(["lift", cx - 0.5, y0 - 1.1, 1, 1]);
  });
  f.unshift(["cable", cx - 0.25, yOf(0), cx - 0.25, yOf(top - 60)], ["cable", cx + 0.25, yOf(0), cx + 0.25, yOf(top - 60)]);
  var brow = ds.filter(function (d) { return d.id === "brow"; })[0];
  if (brow) f.push(["eye", cx + half(brow.height) - 1, yOf(brow.height) - 3, 4, 3]);
  labels.push(["the Spine", cx + 1.6, yOf(top - 120)], ["the weather", cx, 1.2], ["the god's marrow", cx, H - 0.6]);
  window.TTMAPS.maps.push({
    id: "city-section", title: "Cathedra, in cross-section", place: "Eleven ribs, the Marrowworks to the Crown",
    group: "city", scenes: ["s8", "s11"], w: W, h: H, bg: "void", scale: FT,
    blurb: "The whole city on one sheet: every district at its height, the Spine and its stops. For the Long Fall, the pilgrimage and the birth.",
    areas: areas, f: f, labels: labels,
    notes: ["Any fall of more than 60 ft drops a district: follow it down this sheet. The Long Fall on the Toolkit screen uses the same heights."]
  });
})();

