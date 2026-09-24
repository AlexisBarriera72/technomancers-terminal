/* ---------------------------------------------------------------------------
   Campaign layer for Technomancer's Terminal.

   Anything in here shows up in the app's Campaign tab. Two ways to add to it:

   1. Paste notes into the Claude chat that built this site and ask for them to
      be added, they get folded into this file and the site redeploys.
   2. Add and edit campaigns directly in the app. Those live in the visitor's
      own browser and can be exported to a .json file, which can then be pasted
      back here to make them part of the site for everyone.

   Schema, every field except id and name is optional:

   {
     id:            "short-slug",
     name:          "Display name",
     dm:            "Who runs it",
     blurb:         "One or two sentences of pitch.",
     tone:          ["Heist", "Body horror"],        // short tags
     startingLevel: 3,
     startingCredits: "25,000₵",
     humanity:      true,                            // is the Humanity track in play
     rules:     [{ title: "", text: "" }],           // house rules
     npcs:      [{ name: "", role: "", notes: "" }],
     places:    [{ name: "", notes: "" }],
     items:     [{ name: "", cost: "", notes: "" }], // custom gear
     sessions:  [{ date: "", title: "", notes: "" }],
     hooks:     ["A one-line adventure hook", "…"],
     houses:    [{ id, name, colour, controls, enemy, patron }],   // optional
     districts: [{ id, name, height, house, band, notes }]       // optional
   }
--------------------------------------------------------------------------- */

window.TTBC = {
  campaigns: [
    {
      id: "cathedra",
      name: "Cathedra",
      dm: "Alex",
      blurb: "A god fell out of the sky nine hundred years ago and has not finished " +
             "dying. The city grew inside its ribs. The four Houses drill the marrow " +
             "for ichor, the only substance that will hold an enchantment and carry a " +
             "current at the same time, so every implant in Cathedra was carved from " +
             "something that used to be divine, and none of it has forgotten that.",
      tone: ["Divine industry", "Body horror", "House politics", "Vertical city"],
      startingLevel: 3,
      startingCredits: "25,000 grams",
      humanity: true,
      rules: [
        { title: "The god is still dying",
          text: "Humanity here is not empathy loss, it is replacement. Each time you cross " +
                "into a new Humanity state you take a Remnant instead of the usual flavour: " +
                "your shadow falls wrong, you stop needing to blink, moths come indoors for " +
                "you. The numbers work exactly as written. The thing you are turning into is " +
                "not a machine." },
        { title: "Chrome remembers whose it was",
          text: "Nothing is mass-produced. Every implant is carved from god-bone and keyed to " +
                "one body. Second-hand ware, pulled off a corpse, bought in the Gullet, " +
                "installs at +2 Humanity and carries a Remnant belonging to the last wearer: " +
                "a habit, a fear, an appetite. The DM decides what. You find out at the worst " +
                "possible moment." },
        { title: "Sanctuary static",
          text: "Consecrated ground, any shrine, reliquary or House chapel, is dead air. No " +
                "netrunning, no smartlink, no drone uplink, no comms, and any cyberware with " +
                "an active power draw operates at disadvantage. This is why deals get struck " +
                "in churches, and why Wirewalkers wait outside in the rain." },
        { title: "The Long Fall",
          text: "Cathedra is vertical: eleven districts stacked up the inside of a ribcage. " +
                "Falling damage still caps at 20d6, but any fall of more than 60 feet drops " +
                "you into the district below, and you arrive where you land, among whoever " +
                "lives there. Nobody here takes a lift for granted." },
        { title: "Favours, not coin",
          text: "Anything in the city can be bought with a favour, and the Houses write every " +
                "favour down. Instead of paying, you may take it on the book: no interest, no " +
                "due date, called in at the exact moment it costs you most. Street Cred rises " +
                "when you clear a debt and falls twice as fast when somebody clears yours for " +
                "you." },
        { title: "One in twenty, something looks up",
          text: "Roll a d20 at the start of each session. On a 20 the god notices one character, " +
                "the players choose which, until dawn. That character has advantage on one " +
                "roll of their choosing, and everything with ichor in it (implants, wards, the " +
                "lifts, the Cantor) treats them as a person of importance." }
      ],
      npcs: [
        { name: "Mother Slate", role: "Fixer, the Marrowworks",
          notes: "Half-orc, four hands, two of them grown rather than born. Keeps her ledger in " +
                 "wax so it can be melted. Fair rates, and in forty years she has never been " +
                 "the one to break a deal first." },
        { name: "Archdeacon Uln Sarrow", role: "House Reliquary",
          notes: "Sells indulgences: rented Humanity buffers, blessed, returnable, repossessed " +
                 "on a missed payment. Believes completely that he is doing mercy work. He may " +
                 "even be right." },
        { name: "Ketch", role: "Wirewalker, unaffiliated",
          notes: "Took a survey contract deep into the god's nervous system and came back with " +
                 "a second voice that answers questions Ketch was not asked. Extremely useful. " +
                 "Not restful to travel with." },
        { name: "Dr. Maret Vhoss", role: "Bone-carver, unlicensed",
          notes: "Carves implants from marrow the Houses have not released. Her work is better " +
                 "than theirs and everybody knows it, which is the entire problem." },
        { name: "Ser Ambrel Dace", role: "House Thorn, collections",
          notes: "A knight in full chrome who collects debts in person and has never raised her " +
                 "voice. Accepts payment, a counter-favour, or a duel, in that order of " +
                 "preference." },
        { name: "The Cantor", role: "The choir-engine",
          notes: "Nine hundred voices in a housing the size of a cathedral. Runs the water, the " +
                 "lifts and the wards. Answers one question per petitioner per year: truthfully, " +
                 "and not usefully." }
      ],
      places: [
        { name: "The Ribs",
          notes: "Eleven towers that are not towers. Each rib is its own district, stacked from " +
                 "the Marrowworks at the base to the Crown, where the Houses live above the " +
                 "weather and sell it back down." },
        { name: "The Marrowworks",
          notes: "Where ichor comes out. Three shifts, no windows, and the drilling never stops, " +
                 "because the Houses know, correctly, that the bone heals." },
        { name: "Sanctum Null",
          notes: "A cathedral with no signal in it. Neutral ground by custom rather than by law, " +
                 "which is exactly why the custom has held for two hundred years." },
        { name: "The Gullet",
          notes: "Undercity market in the god's throat. You can buy anything here twice: once " +
                 "from the seller, and once from whoever watched you buy it." },
        { name: "The Sevenfold Spine",
          notes: "The lift-line running the whole length of the corpse. Eleven stops, one " +
                 "operator to a car, and the operators are the best-informed people in the city." },
        { name: "The Eye",
          notes: "A frozen eye the size of a warehouse, still faintly tracking. House Reliquary " +
                 "sells minutes in front of it. What it shows you is true and has not happened " +
                 "yet." }
      ],
      items: [
        { name: "Reliquary shunt", cost: "4,000 grams / month",
          notes: "Rented, never sold. A 10-point Humanity buffer, spent before your own. Miss a " +
                 "payment and House Reliquary repossesses it, along with anything that has grown " +
                 "into it since." },
        { name: "Bone-carved smartlink", cost: "9,000 grams",
          notes: "Ignore half cover with firearm attacks. Keyed to one body: installed in anyone " +
                 "else it does nothing at all except ache." },
        { name: "Choir coin", cost: "-",
          notes: "A favour token from the Cantor. Not for sale, only given. Spend it to have one " +
                 "door in Cathedra unlocked, one lift rerouted, or one ward switched off for six " +
                 "seconds." },
        { name: "Pilgrim's mask", cost: "1,200 grams",
          notes: "Consecrated wards read you as clergy: advantage on Stealth and Deception on " +
                 "holy ground. Be caught wearing one there and no House in the city will take " +
                 "your business for a month." },
        { name: "Ichor ampule", cost: "2,500 grams",
          notes: "Bonus action, regain 4d4+4 hit points. Costs 1 Humanity. Every Streetdoc in " +
                 "the city will tell you not to carry more than two, and every Streetdoc in the " +
                 "city is right." }
      ],
      /* The four Houses. Standing with each is tracked on the GM's City
         screen; `enemy` and `patron` say what the two ends look like. */
      houses: [
        { id: "reliquary", name: "House Reliquary", colour: "gold",
          controls: "The vaults and chapels, the Eye, and rented Humanity: indulgences, blessed and repossessable.",
          enemy: "Their wards stop reading you as a person. Chapel doors stay shut and any shunt you rent is taken back.",
          patron: "A chapel shelters you, and an Archdeacon sells you a minute at the Eye at cost." },
        { id: "thorn", name: "House Thorn", colour: "red",
          controls: "Debt: the ledgers, the collections, the foreclosures and the Counting Rib.",
          enemy: "Ser Ambrel Dace comes to collect in person, with a writ for something you care about.",
          patron: "Your debts on their book go quiet, and one collector looks the other way, once." },
        { id: "lathe", name: "House Lathe", colour: "amber",
          controls: "The Marrowworks drills, ichor refining, and every bone-carver's licence in the city.",
          enemy: "Licensed Streetdocs turn you away and every service contract on your chrome lapses.",
          patron: "Installs at cost, and first look at fresh marrow before it reaches the Gullet." },
        { id: "vigil", name: "House Vigil", colour: "blue",
          controls: "The wards, the Watch, and the licences of every lift operator on the Spine.",
          enemy: "The Watch stops you at every stop on the Spine, and lifts come late or not at all.",
          patron: "Ward-keys for a night, and a lift that arrives when you call it." }
      ],
      /* The eleven ribs, from the base up. `height` is feet above the
         Marrowworks floor, which is what the Long Fall reads to work out
         where someone lands. `band` picks the street encounter table. */
      districts: [
        { id: "marrowworks", name: "The Marrowworks", height: 0, house: "lathe", band: "below",
          notes: "Drill floors and refineries at the base of the corpse. Three shifts, no windows." },
        { id: "gullet", name: "The Gullet", height: 220, house: "thorn", band: "below",
          notes: "The undercity market in the god's throat. Thorn collects the stall rents." },
        { id: "weepwater", name: "Weepwater", height: 400, house: "vigil", band: "below",
          notes: "Cisterns and run-off. The Hush keep a chapel in one of the old cisterns." },
        { id: "tallowgate", name: "Tallowgate", height: 560, house: "lathe", band: "below",
          notes: "Rendering yards, carvers' warrens and every black clinic worth the name." },
        { id: "nave", name: "The Nave", height: 740, house: "vigil", band: "middle",
          notes: "The Spine's middle stop: the Cantor's nave, and Sanctum Null in its shadow." },
        { id: "counting-rib", name: "The Counting Rib", height: 900, house: "thorn", band: "middle",
          notes: "House Thorn's ledger halls. The lights never go off." },
        { id: "seventh-rib", name: "The Seventh Rib", height: 1080, house: "thorn", band: "middle",
          notes: "Tenements, eleven thousand people, and a foreclosure clause nobody has read to the end." },
        { id: "lanternside", name: "Lanternside", height: 1260, house: "reliquary", band: "above",
          notes: "The pilgrims' quarter: hostels, shrines and lantern-sellers." },
        { id: "vaults", name: "The Vaults", height: 1440, house: "reliquary", band: "above",
          notes: "Reliquary's vault-chapels, where the indulgences are kept." },
        { id: "brow", name: "The Brow", height: 1620, house: "reliquary", band: "above",
          notes: "The god's brow, and the chapel of the Eye beneath it." },
        { id: "crown", name: "The Crown", height: 1820, house: "", band: "above",
          notes: "The Houses' manors, above the weather. They sell it back down." }
      ],
      sessions: [
        { date: "Session zero", title: "Bring a debt",
          notes: "Everyone starts owing one of the four Houses something, money, a favour, a " +
                 "body part, a silence. Write one sentence for what you owe and one for who " +
                 "holds it. That is your hook; you do not need a backstory past it. Build at " +
                 "level 3 with 25,000 grams. The Humanity track is on, and it matters more here " +
                 "than the rules text makes it sound." }
      ],
      hooks: [
        "A drilling crew in the Marrowworks hit something that bled warm, and the Houses have " +
        "now paid three separate teams not to talk about it.",
        "Someone in the Gullet is selling second-hand chrome that still answers to its previous " +
        "owner, who is not dead.",
        "The Cantor has begun answering questions nobody asked, and the lifts are arriving " +
        "before they are called.",
        "House Thorn is foreclosing on an entire rib: eleven thousand people, thirty days, and " +
        "a clause nobody has read all the way to the end of.",
        "The Eye has shown the same thing to four different petitioners this month. House " +
        "Reliquary has stopped selling minutes.",
        "A pilgrimage is coming up the Spine, forty thousand faithful, no signal for a week, " +
        "and every Wirewalker in Cathedra suddenly out of work."
      ]
    }
  ]
};
