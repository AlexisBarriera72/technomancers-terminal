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
     prices:        "street",                        // "book" or "street" (see app/core.js)
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
      // Book chrome is priced for Night City money; Cathedra pays in grams.
      prices: "street",
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
      ],

      /* How spells work in the city. Rules stay the SRD's (spells.js): this
         is how they look, what the street calls them, and a handful of
         spells only Cathedra has. The play sheet reads it for any character
         in this campaign. `names` is keyed by the SRD spell's name. */
      magic: {
        rules: [
          { title: "Ichor carries the spell",
            text: "Every spell in Cathedra runs through ichor, the god's marrow, the same stuff the chrome is carved " +
                  "from. A caster's focus is a sliver of it: a bone bead, a vial, a carved knuckle, a filling in a tooth. " +
                  "Spells work exactly as written. They just smell faintly of warm bone, and moths come to watch." },
          { title: "Static stops chrome, not prayer",
            text: "Sanctuary static kills netrunning, uplinks and powered chrome on consecrated ground. It does nothing " +
                  "to spells. That is why every House chapel keeps a caster on the door, and why a Wirewalker with a " +
                  "prayer or two is never out of work." },
          { title: "Seers don't get old",
            text: "Spells that look ahead (Augury, Divination, Commune, Scrying, Foresight, and the city's own " +
                  "Borrowed Minute and The Eye Opens) work as written. Everyone in the Gullet knows somebody who cast " +
                  "them often, and everyone knows how that somebody ended up. Nobody says why." },
          { title: "One in twenty, the god listens",
            text: "On the session the god looks up, the chosen character's first spell of the day that costs a slot " +
                  "is cast one slot level higher, free. The god is not doing it on purpose. It is dreaming, and they " +
                  "were in the dream." }
        ],
        // how each caster's magic looks here, shown on their sheet
        looks: {
          Artificer: "You write spells into ichor-circuits: a filament of lit marrow in a brass housing, a bead " +
                     "screwed into a knuckle plate, a charm soldered to a drone. Your spells run, rather than " +
                     "happen, and they can be switched off.",
          Bard: "Your magic is the Cantor's trick, learned by ear: nine hundred voices taught the city that a note " +
                "held right can open a lock or close a wound. You sing, hum, heckle or broadcast, and ichor " +
                "within earshot answers.",
          Cleric: "You pray to a god that is still here, in pieces, under your feet. Your prayers go down the pipes " +
                  "with the water and something far below answers in its sleep. The Houses think they own that line. " +
                  "You have learned they only own the chapels.",
          Druid: "The god's body is still alive in places nobody drills: bone-moss in the cisterns, rot-gardens " +
                 "in the Outfall, moths by the million. You talk to what grows in a corpse that won't finish " +
                 "dying, and it talks back.",
          Paladin: "An oath in Cathedra is a debt with your name on the book. Every House keeps knights, and the " +
                   "light that comes off them is the same gold as the Eye's. Break the oath and the light goes out, " +
                   "and House Thorn sends somebody to discuss it.",
          Ranger: "You know the ribs the way operators know the Spine: the shafts, the Long Fall, the things that " +
                  "nest in the god's cartilage. Your magic is small, practical and learned from people who didn't " +
                  "come back one day.",
          Sorcerer: "The god is in your blood, literally: a grandmother who drank refinery run-off, a bone-carver's " +
                    "slip, a birth too close to the Marrowworks. Ichor doesn't need a focus in you. Your spells " +
                    "come out warm, and your Remnants come early.",
          Warlock: "Someone made you an offer. A House, the Cantor, a voice in the pipes, a dead satellite, the " +
                   "dreaming god itself, or a fixer who never says who she works for. The power is real, the terms " +
                   "are on a ledger somewhere, and you have not read to the end of them.",
          Wizard: "You compile spells. Your spellbook is a drive, a slate, a bone tablet etched in lit marrow; " +
                  "your spells are routines that ichor will run if you write them properly. House Lathe licenses " +
                  "the good ones. You pirate the rest."
        },
        // SRD spell -> [what the street calls it, what it looks like here]
        names: {
          "Acid Splash": ["Refinery Spit", "A gob of raw ichor-waste that hisses on whatever it hits."],
          "Chill Touch": ["Ossuary Hand", "A cold grey hand, the kind the Gullet ossuary is full of, closes on the target."],
          "Dancing Lights": ["Lantern-sellers' Trick", "Pilgrim lanterns that float along behind you, the kind sold by the dozen in Lanternside."],
          "Druidcraft": ["Rot-garden Craft", "Bone-moss blooms, a moth lands where you point, the smell of a coming rain from the Crown."],
          "Eldritch Blast": ["Patron's Due", "Your patron's attention, compressed into a crack of cold light. It always sounds like a bell."],
          "Fire Bolt": ["Marrow-flare", "A bead of lit ichor flicked off a fingertip. It smells of hot bone when it lands."],
          "Guidance": ["Operator's Hint", "The quiet certainty a lift operator has about which car to take."],
          "Light": ["Lantern-bead", "A bead of warm god-light, the colour of the Eye on a good day."],
          "Mage Hand": ["Ghost Grip", "A pale hand of bone-dust that lifts and turns things, and never quite looks human."],
          "Mending": ["Carver's Touch", "The break closes along a seam of fresh white bone, the way a bone-carver would do it."],
          "Message": ["Pipe Whisper", "Your words travel the way the lullaby does: under the noise, through anything wet."],
          "Minor Illusion": ["Ghost Ad", "The kind of cheap projection Gullet stalls use to sell things that aren't there."],
          "Poison Spray": ["Outfall", "A breath of the Outfall's air: grey, sweet and very bad for you."],
          "Prestidigitation": ["Gullet Trick", "Every child in the Gullet can do one of these. You can do all of them."],
          "Produce Flame": ["Tallow Flame", "A little rendering-yard flame, yellow, smoky, and cupped in your palm."],
          "Ray of Frost": ["Cistern Chill", "The cold of Weepwater's deep cisterns, drawn out in a white line."],
          "Resistance": ["Hold Fast", "What pilgrims whisper to each other on the Spine when the car shakes."],
          "Sacred Flame": ["God-light", "Gold light from above, like the visions, smelling of warm bone."],
          "Shillelagh": ["Rib-staff", "Your staff grows a sheath of living bone, heavy as a House knight's mace."],
          "Shocking Grasp": ["Live Wire", "The current the ichor carries, let out through your hand."],
          "Spare the Dying": ["Hold the Minute", "You hold the dying one in the minute before, and don't let it tick over."],
          "Thaumaturgy": ["Sanctum Voice", "The chapel's acoustics, carried with you: your voice arrives from above."],
          "Vicious Mockery": ["Heckle", "A line so cruel the Cantor would refuse to repeat it."],
          "Bless": ["Choir Blessing", "Three voices in the pipes sing your friends' names, and mean it."],
          "Burning Hands": ["Refinery Breath", "A fan of orange flame that smells of the refineries at shift change."],
          "Charm Person": ["Favour Owed", "They feel, suddenly and warmly, that they owe you one."],
          "Command": ["House Word", "One word in the voice of a House, and bodies obey before minds do."],
          "Cure Wounds": ["Bone-knit", "The wound closes around a sliver of white that wasn't there before."],
          "Detect Magic": ["Ichor Sense", "Every trace of ichor in sight glows faintly to you, chrome included."],
          "Faerie Fire": ["Moth Dust", "A cloud of pale moths settles on the targets and will not leave."],
          "Feather Fall": ["Long Fall Grace", "The fall still happens. It just forgets to hurry."],
          "Guiding Bolt": ["Eye-bolt", "A shaft of the Eye's gold light, and for a moment the target is very, very seen."],
          "Healing Word": ["Kind Word", "The thing a Streetdoc says that makes you believe you'll make it."],
          "Hellish Rebuke": ["Collection Notice", "Pain comes back to the one who caused it, promptly, with interest."],
          "Hideous Laughter": ["Gullet Joke", "The joke nobody should have told. They laugh until they fall over."],
          "Hunter's Mark": ["Marked", "You fix on them the way a Thorn collector fixes on a debtor."],
          "Mage Armor": ["Plate Memory", "Ichor remembers being armour, and settles over your skin like it."],
          "Magic Missile": ["Choir Darts", "Three notes of the Cantor's hymn, each a dart of light that never misses its mark."],
          "Shield": ["Rib-guard", "A curved plate of translucent bone snaps up between you and the blow."],
          "Sleep": ["Half a Lullaby", "Three bars of a hymn with no words. You should not know it. Where did you learn it?"],
          "Thunderwave": ["Lift-slam", "The boom of a lift car hitting its stop, and everything nearby goes flying."],
          "Blur": ["Bad Signal", "You smear like a bad feed, never quite where you look."],
          "Darkness": ["Lamps Out", "Every lamp in the area chokes at once, the way they do when the god turns over."],
          "Enhance Ability": ["Tune-up", "A quick adjustment to the ichor in the body, like a carver's service visit."],
          "Heat Metal": ["Hot Chrome", "Metal glows red. In Cathedra, that includes the chrome under someone's skin."],
          "Hold Person": ["Writ of Stillness", "They stop, the way a debtor stops when Ser Dace says their name."],
          "Invisibility": ["Unseen by Wards", "Eyes and wards slide off you like water off bone."],
          "Knock": ["The Forgotten Lock", "You sing one note and the lock forgets it was ever locked."],
          "Lesser Restoration": ["Rinse", "The poison or sickness leaves with a gasp, the way bad water leaves a pipe."],
          "Levitate": ["Lift Without a Car", "They rise the way the Spine's cars do, with a faint hum and no visible cable."],
          "Magic Weapon": ["Ichor Edge", "A thread of lit marrow runs down the weapon's length."],
          "Mirror Image": ["Echoes", "Three copies of you, each a half-second out of step, like a loop scar."],
          "Misty Step": ["Skip a Beat", "You step between two of the god's heartbeats and come out somewhere else."],
          "Scorching Ray": ["Drill Sparks", "Three lines of white-hot spark, the kind that fly off a Marrowworks drill."],
          "Shatter": ["Bone Crack", "The crack of a rib settling, focused on one spot."],
          "Silence": ["Sanctum Hush", "A sphere as quiet as Sanctum Null at midnight."],
          "Spiritual Weapon": ["Relic Blade", "A floating weapon of reliquary gold, the kind hung over House altars."],
          "Suggestion": ["The Soft Sell", "The pitch every Gullet stall-holder dreams of: reasonable, warm, impossible to refuse."],
          "Web": ["Cable Snarl", "A mess of old lift cable and sticky ichor-wire fills the space."],
          "Call Lightning": ["Weather from the Crown", "The Houses sell the weather down. You take some without paying."],
          "Counterspell": ["Countersong", "You hum the note that cancels theirs, and their spell falls apart."],
          "Dispel Magic": ["Unstitch", "You find where the spell was stitched and pull the thread."],
          "Fireball": ["Ichor Bloom", "A bead of lit marrow that opens like a flower and roars."],
          "Fly": ["Updraft", "The god's weather lifts you, the warm air that climbs the ribs."],
          "Haste": ["Overclock", "Their heart runs like a refinery at double shift."],
          "Hypnotic Pattern": ["Stained Glass", "The light of a chapel window, turning, and nobody can look away."],
          "Lightning Bolt": ["Spine Current", "The power that runs the lifts, loosed in a straight line."],
          "Revivify": ["Back from the Minute", "You pull them back before the minute runs out. They will remember it."],
          "Sending": ["Down the Pipes", "Your words travel the water to wherever they are, and arrive dripping."],
          "Speak with Dead": ["Ossuary Talk", "The dead of Cathedra talk readily. Most of them were waiting to be asked."],
          "Spirit Guardians": ["The Nine Hundred", "The Cantor's voices surround you, and they do not like whoever is near."],
          "Banishment": ["Excommunicate", "You strike them off the book, and the world agrees for a while."],
          "Dimension Door": ["Lift-shaft Door", "You step into a shaft that isn't there and out of one that isn't either."],
          "Greater Invisibility": ["Ward-blind", "Wards, eyes and chrome optics all agree you are not there."],
          "Polymorph": ["Graft Storm", "Flesh rewrites itself the way a Bioforged dreams of doing."],
          "Wall of Fire": ["Refinery Wall", "A sheet of refinery flame, roaring like the Marrowworks at full shift."],
          "Death Ward": ["Reliquary Seal", "A seal of gold wax on the skin: the Reliquary's promise, for once kept."],
          "Cone of Cold": ["Crown Weather", "The cold that lives above the weather, poured down in a cone."],
          "Greater Restoration": ["Clean Baseline", "For a moment they are exactly who they were before the chrome."],
          "Hold Monster": ["Writ of Stillness, Sealed", "The same writ, stamped by all four Houses."],
          "Mass Cure Wounds": ["Ward Round", "A Streetdoc's round, done in one breath, for everyone at once."],
          "Raise Dead": ["Indulgence", "House Reliquary sells this. You are doing it without a licence."],
          "Scrying": ["A Minute at the Eye", "You borrow the Eye's gaze without paying Reliquary for the minute."],
          "Commune": ["Ask the Cantor", "Three questions, answered truthfully, and not usefully."],
          "Augury": ["Bone-throw", "Knuckle bones cast on a stall table, and they fall the way the future will."],
          "Divination": ["A Question to the Pipes", "You ask the water, and far below something answers in its sleep."],
          "Chain Lightning": ["Spine Arc", "The lift current, jumping from body to body."],
          "Disintegrate": ["Drill Line", "A beam like the Marrowworks drill: it goes through, and there is nothing left on the other side."],
          "Heal": ["Marrow Mend", "The god's own body, for a moment, remembers how to be whole, and lends it to them."]
        },
        /* Spells only Cathedra has. Same shape as spells.js, plus `look`.
           Balanced against the SRD spell of the same level each is modelled on.
           `gm: 1` keeps a spell off the players' lists until the GM hands it
           out: typing its exact name on the sheet adds it. */
        spells: [
          { n: "Tap Hymn", l: 0, s: "Divination", t: "1 action", r: "Touch", c: "V, S", d: "1 minute", k: 1,
            cls: ["Bard", "Cleric", "Warlock", "Wizard"],
            look: "You hum the lullaby's under-note into a tap, and the pipes carry sound back to you.",
            x: [{ type: "p", text: "You touch a tap, drain, cistern, pipe or other opening onto Cathedra's water. For the duration, you can hear through any one opening of the same pipe network within 120 feet of you as if you were standing at it, and you can switch to another such opening as a bonus action. You are deafened to your own surroundings while you listen." }] },
          { n: "Marrow Spark", l: 0, s: "Evocation", t: "1 action", r: "60 feet", c: "V, S, M (a sliver of ichor)", d: "Instantaneous",
            a: "ranged", dmg: { t: "Radiant", char: { "1": "1d10", "5": "2d10", "11": "3d10", "17": "4d10" } },
            cls: ["Artificer", "Sorcerer", "Wizard"],
            look: "A spark of raw marrow, gold, that sticks to what it hits and glows.",
            x: [{ type: "p", text: "Make a ranged spell attack against a creature or object within range. On a hit, the target takes 1d10 radiant damage and sheds dim light in a 10-foot radius until the end of your next turn. An invisible target lit this way is visible for as long as it glows." },
                { type: "p", text: "This spell's damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10)." }] },
          { n: "Moth Lantern", l: 0, s: "Conjuration", t: "1 action", r: "Self", c: "V, S", d: "1 hour",
            cls: ["Druid", "Sorcerer", "Warlock", "Wizard"],
            look: "A slow cloud of pale moths gathers around you and gives off a soft light.",
            x: [{ type: "p", text: "Moths gather in a cloud around you for the duration. The cloud sheds bright light in a 10-foot radius and dim light for an additional 10 feet, and moves with you. As a bonus action, you can send it up to 30 feet to hang in the air at a point you can see, or call it back." },
                { type: "p", text: "The moths are drawn to ichor. While the cloud is within 30 feet of a creature with implants or grafts, some of the moths circle that creature, so you know it carries chrome and roughly where, even if you can't see it clearly." }] },
          { n: "Knell", l: 0, s: "Necromancy", t: "1 action", r: "60 feet", c: "V", d: "Instantaneous",
            sv: "Wis", dmg: { t: "Thunder", char: { "1": "1d6", "5": "2d6", "11": "3d6", "17": "4d6" } },
            cls: ["Cleric", "Warlock", "Wizard"],
            look: "One note from a chapel bell nobody else can hear, rung right behind them.",
            x: [{ type: "p", text: "A creature you can see within range must succeed on a Wisdom saving throw or take 1d6 thunder damage and be unable to take reactions until the start of its next turn." },
                { type: "p", text: "This spell's damage increases by 1d6 when you reach 5th level (2d6), 11th level (3d6), and 17th level (4d6)." }] },
          { n: "Quieter's Note", l: 1, s: "Enchantment", t: "1 action", r: "30 feet", c: "V", d: "Up to 1 minute", k: 1,
            sv: "Wis", cls: ["Bard", "Warlock", "Wizard"],
            look: "One held note, soft as a tap left running in the next room. Sleepers don't wake from it.",
            x: [{ type: "p", text: "One creature that can hear you within range must succeed on a Wisdom saving throw or fall unconscious for the duration. It has disadvantage on the save if it is already asleep. The creature wakes if it takes damage or if someone uses an action to shake or slap it awake, and it can repeat the saving throw at the end of each of its turns, waking on a success." },
                { type: "p", text: "Undead, constructs and creatures immune to being charmed are unaffected." }],
            h: "When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st." },
          { n: "Ledger Mark", l: 1, s: "Divination", t: "1 bonus action", r: "90 feet", c: "V, S, M (a page from any ledger)", d: "Up to 1 hour", k: 1,
            dmg: { t: "Psychic", slot: { "1": "1d6" } },
            cls: ["Bard", "Paladin", "Ranger", "Warlock", "Wizard"],
            look: "You write their name in the air, and the city's accounts remember it.",
            x: [{ type: "p", text: "You mark a creature you can see within range as owing you. Until the spell ends, you know the direction to it while it is within 1 mile of you, and the first time on each of your turns that you hit it with an attack, it takes an extra 1d6 psychic damage." },
                { type: "p", text: "If the target drops to 0 hit points before the spell ends, you can use a bonus action on a later turn to mark a new creature." }],
            h: "When you cast this spell using a spell slot of 3rd or 4th level, you can maintain your concentration on it for up to 8 hours. With a slot of 5th level or higher, up to 24 hours." },
          { n: "Ichor Stitch", l: 1, s: "Evocation", t: "1 action", r: "Touch", c: "V, S", d: "Instantaneous",
            heal: { "1": "1d8" },
            cls: ["Artificer", "Bard", "Cleric", "Druid", "Paladin", "Ranger"],
            look: "The wound closes on a seam of gold marrow. Chrome drinks it first.",
            x: [{ type: "p", text: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. It also gains 1 temporary hit point for each implant or graft it has installed (maximum 5), which last for 1 hour. This spell has no effect on undead or constructs." }],
            h: "When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st." },
          { n: "Long Fall Chime", l: 1, s: "Transmutation", t: "1 reaction, which you take when you or a creature within 60 feet of you falls", r: "60 feet", c: "V", d: "1 minute",
            cls: ["Artificer", "Druid", "Ranger", "Sorcerer", "Wizard"],
            look: "A chime like a lift arriving, and the fall slows to a drift you can steer.",
            x: [{ type: "p", text: "Choose up to five falling creatures within range. A falling creature's rate of descent slows to 60 feet per round until the spell ends, and it can move up to 30 feet horizontally during each of its turns while it falls. If the creature lands before the spell ends, it takes no falling damage and can land on its feet, and the spell ends for that creature." },
                { type: "p", text: "Under Cathedra's Long Fall rule, a creature under this spell only drops into the district below if it chooses to." }] },
          { n: "Sanctuary Static", l: 2, s: "Abjuration", t: "1 action", r: "60 feet", c: "V, S, M (a pinch of chapel dust)", d: "Up to 10 minutes", k: 1,
            cls: ["Artificer", "Bard", "Cleric", "Paladin", "Wizard"],
            look: "The air goes dead the way it does in a House chapel: no signal, no hum, no uplink.",
            x: [{ type: "p", text: "For the duration, a 20-foot-radius sphere centred on a point you choose within range becomes dead air, as if it were consecrated ground. Inside it, no netrunning, program, drone uplink, smartlink or comms works, and any cyberware with an active power draw operates at disadvantage. Signals can't pass into or out of the sphere." },
                { type: "p", text: "The sphere does not stop spells." }] },
          { n: "Borrowed Minute", l: 2, s: "Divination", t: "1 action", r: "Self", c: "V, S", d: "Up to 1 minute", k: 1,
            cls: ["Bard", "Cleric", "Sorcerer", "Warlock", "Wizard"],
            look: "You see a minute ahead, in gold, the way the Eye shows it. It hurts a little.",
            x: [{ type: "p", text: "For the duration, you see a few seconds ahead. Once before the spell ends, when you or a creature you can see within 30 feet of you makes an attack roll, ability check or saving throw, you can use your reaction to give that roll advantage or disadvantage. The spell then ends." },
                { type: "p", text: "You can't be surprised while the spell lasts." }] },
          { n: "Carver's Graft", l: 2, s: "Transmutation", t: "1 action", r: "Touch", c: "V, S, M (a bone chip)", d: "Up to 1 hour", k: 1,
            cls: ["Artificer", "Druid", "Sorcerer", "Wizard"],
            look: "Bone grows out of them in minutes, the way it would take a carver a week to put in.",
            x: [{ type: "p", text: "A willing creature you touch grows a graft of your choice for the duration:" },
                { type: "ul", items: ["Claws. Its unarmed strikes deal 1d8 slashing damage, and it can use Strength or Dexterity for their attack and damage rolls.",
                                      "Plating. Its AC can't be less than 16, regardless of what kind of armor it is wearing.",
                                      "Grips. It gains a climbing speed equal to its walking speed, and it can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check."] },
                { type: "p", text: "A graft from this spell counts as a graft for anything that cares, but costs no Humanity or Essence." }] },
          { n: "The Lullaby", l: 3, s: "Enchantment", t: "1 action", r: "Self (30-foot radius)", c: "V", d: "Up to 1 minute", k: 1,
            sv: "Wis", cls: ["Bard", "Cleric", "Warlock", "Wizard"],
            look: "The hymn with no words, the one in every pipe in Cathedra, sung out loud.",
            x: [{ type: "p", text: "Each creature of your choice within 30 feet of you that can hear you must make a Wisdom saving throw. A creature that has seen a vision of the future has disadvantage on the save. On a failed save, a creature falls asleep for the duration: it is incapacitated and has a speed of 0." },
                { type: "p", text: "The spell ends for a creature if it takes damage or someone else uses an action to shake it awake. Undead, constructs and creatures immune to being charmed are unaffected." }] },
          { n: "Weep", l: 3, s: "Evocation", t: "1 action", r: "120 feet", c: "V, S", d: "Instantaneous",
            sv: "Con", half: 1, dmg: { t: "Radiant", slot: { "3": "6d6", "4": "7d6", "5": "8d6", "6": "9d6", "7": "10d6", "8": "11d6", "9": "12d6" } },
            cls: ["Cleric", "Druid", "Sorcerer", "Wizard"],
            look: "The Eye weeps: hot gold brine falls from nowhere in a column.",
            x: [{ type: "p", text: "Burning brine falls in a 20-foot-radius, 40-foot-high cylinder centred on a point within range. Each creature in the cylinder must make a Constitution saving throw. A creature takes 6d6 radiant damage and is blinded until the end of its next turn on a failed save, or half as much damage and isn't blinded on a successful one." }],
            h: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd." },
          { n: "Lift Call", l: 3, s: "Conjuration", t: "1 action", r: "Self", c: "V, S, M (a lift token)", d: "Instantaneous",
            cls: ["Artificer", "Sorcerer", "Warlock", "Wizard"],
            look: "The chime of a lift arriving, and you are one or more floors away.",
            x: [{ type: "p", text: "You and up to one willing creature you are touching teleport straight up or straight down, up to 300 feet, to an unoccupied space you can see or have stood in before. If there is no floor at the destination, you arrive on the nearest safe footing within 30 feet of it. If you would arrive inside solid bone or an object, the spell fails and is wasted." }],
            h: "When you cast this spell using a spell slot of 4th level or higher, you can bring one additional willing creature for each slot level above 3rd." },
          { n: "Speak Through Chrome", l: 3, s: "Necromancy", t: "1 action", r: "Touch", c: "V, S", d: "10 minutes",
            cls: ["Bard", "Cleric", "Warlock", "Wizard"],
            look: "Every implant is keyed to one body. Ask the chrome, and the body answers, wherever it is.",
            x: [{ type: "p", text: "You touch a piece of cyberware or a graft that once belonged to someone else, installed or not. For the duration, you can ask the last creature it was keyed to up to five questions, and it answers as if you had cast speak with dead on its corpse, whether that creature is dead or alive, near or far. A living creature answered in its sleep and remembers the questions as a dream." },
                { type: "p", text: "Second-hand chrome's Remnant is always part of the answer, one way or another." }] },
          { n: "Choir Chord", l: 4, s: "Evocation", t: "1 action", r: "90 feet", c: "V", d: "Instantaneous",
            sv: "Con", half: 1, dmg: { t: "Thunder", slot: { "4": "5d8", "5": "6d8", "6": "7d8", "7": "8d8", "8": "9d8", "9": "10d8" } },
            cls: ["Bard", "Cleric", "Sorcerer", "Wizard"],
            look: "Nine hundred voices, one chord, all at once, in a space the size of a room.",
            x: [{ type: "p", text: "Each creature of your choice in a 30-foot cube within range must make a Constitution saving throw. On a failed save, a creature takes 5d8 thunder damage and is deafened for 1 minute. On a successful save, it takes half as much damage and isn't deafened. Unsecured objects in the area that weigh 10 pounds or less are knocked flat." }],
            h: "When you cast this spell using a spell slot of 5th level or higher, the damage increases by 1d8 for each slot level above 4th." },
          { n: "Bone Wall", l: 5, s: "Conjuration", t: "1 action", r: "120 feet", c: "V, S, M (a knuckle of god-bone)", d: "Up to 10 minutes", k: 1,
            cls: ["Artificer", "Cleric", "Druid", "Wizard"],
            look: "Living bone erupts from the floor and knits into a wall, still growing.",
            x: [{ type: "p", text: "A wall of living bone grows at a point you choose within range. The wall is 6 inches thick and is composed of ten 10-foot-by-10-foot panels, each contiguous with at least one other; alternatively, 10-foot-by-20-foot panels that are only 3 inches thick. It works as the wall of stone spell describes, with these changes: each panel has AC 15 and 30 hit points per inch of thickness, and while you maintain concentration, each damaged panel regains 10 hit points at the start of each of your turns." },
                { type: "p", text: "If you maintain concentration for the full duration, the wall is permanent. It keeps growing, very slowly, for years." }] },
          { n: "The Eye Opens", l: 5, s: "Divination", t: "10 minutes", r: "Self", c: "V, S, M (a shard of glass from a Reliquary window)", d: "Instantaneous", ri: 1,
            cls: ["Bard", "Cleric", "Sorcerer", "Warlock", "Wizard"],
            look: "Gold light from above, the smell of warm bone, and for a moment the Eye looks through you.",
            x: [{ type: "p", text: "You ask the Eye one question about a place, person or event in Cathedra. The GM answers with a single image, a few seconds long, of something true about it that has not happened yet. The image is never a lie. It is often not the part you wanted." },
                { type: "p", text: "Seeing it costs 1 Humanity. If you cast this spell more than once before finishing a long rest, the second casting shows you nothing but your own face, older." }] },
          // gm: kept off every list; the GM tells the player to write it onto the sheet at the finale
          { n: "The Sending", l: 6, gm: 1, s: "Divination", t: "1 hour", r: "Unlimited", c: "V, S, M (the Eye, open, in front of you)", d: "Instantaneous",
            cls: ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"],
            look: "You stand in front of the Eye and push a picture back down the line of time.",
            x: [{ type: "p", text: "This spell works only while you stand within 60 feet of the Eye with it open. You send one image, a few seconds long, or up to twenty-five words, to a creature you know, at a moment in the past that you name. The GM decides exactly when it arrives and how it is received. It always arrives." },
                { type: "p", text: "A creature that receives it takes it for a vision. It never knows who sent it, unless it works that out for itself." }] }
        ]
      }
    }
  ]
};
