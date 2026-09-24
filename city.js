/* The city's tables: what the GM's City and Toolkit screens roll on.
 *
 * Cathedra's Houses and districts live with the campaign (campaigns.js);
 * this file holds everything that is rolled or looked up: the calendar and
 * holy days, the weather, street encounters, the bounty board, and the
 * Toolkit's generators. English only, like the story: the screens' labels
 * are translated, the city's own words are not.
 *
 * Every table's `rows` has exactly `die` entries, one per face, and a test
 * holds it to that.
 */
window.TTCITY = {
  /* ---------------------------------------------------------- standing --
     Where the party stands with one House, -3 to +3. */
  standing: [
    { n: -3, name: "Enemy",    text: "They act against you: writs, raids, doors that stay shut, and a name on a list." },
    { n: -2, name: "Hostile",  text: "Prices doubled, no favours, and their people report where you were seen." },
    { n: -1, name: "Wary",     text: "Prices up by half. They want paying up front and they count it twice." },
    { n: 0,  name: "Unknown",  text: "You are strangers to them. Book prices, book manners." },
    { n: 1,  name: "Known",    text: "They'll take a meeting, and they'll let you put a favour on the book." },
    { n: 2,  name: "Friendly", text: "A tenth off, and a quiet word when trouble is coming your way." },
    { n: 3,  name: "Patron",   text: "They back you: shelter, a word in the right ear, and their people answer when you call." }
  ],

  /* ---------------------------------------------------------- calendar --
     360 days: twelve months of thirty. Years count from the Fall. */
  calendar: {
    startYear: 900,
    days: 30,
    months: ["Kindling", "Ashfall", "Marrowtide", "Weeping", "Lanterns", "Tallow",
             "Highbell", "Sunder", "Ossuary", "Choirmonth", "Longfall", "Stillness"]
  },
  holyDays: [
    { month: 1, day: 1, name: "Firstbone",
      text: "The new year. Every lift runs free from dawn to dusk, so the Spine is packed shoulder to shoulder.",
      effect: "Lifts are free and slow. Sleight of Hand to lift a purse on the Spine is at advantage; so is theirs." },
    { month: 2, day: 13, name: "The Weighing",
      text: "House Thorn reads the whole debt ledger aloud in the Counting Rib, one name at a time, for three days.",
      effect: "Collections double for a week. Anyone with a debt to Thorn has a collector at the door." },
    { month: 3, day: 7, name: "Tapping Day",
      text: "House Lathe opens a new bore in the Marrowworks with a hymn and a drill the size of a chapel.",
      effect: "The Marrowworks is shut to outsiders. The next day fresh marrow floods the Gullet: cyberware costs 20% less for a week." },
    { month: 4, day: 20, name: "The Weeping",
      text: "The cisterns are blessed and opened. Water runs down every rib and pools in Weepwater.",
      effect: "Water is free. Weepwater and everything below it floods knee-deep: difficult terrain for a day." },
    { month: 5, day: 15, name: "Lantern Night",
      text: "Pilgrims carry lanterns up the whole length of the Spine, singing.",
      effect: "Sanctuary static covers the entire Spine for the night. House Reliquary sells minutes at the Eye at half price." },
    { month: 6, day: 30, name: "Remnant Wake",
      text: "The city remembers the dead whose chrome was carved out and worn again.",
      effect: "No second-hand ware changes hands. Humanity therapy costs half." },
    { month: 7, day: 9, name: "Choir Day",
      text: "The Cantor opens its nave to everyone, and the lifts stop for an hour at noon while it sings.",
      effect: "Each petitioner may ask the Cantor a second question this year. Nothing on the Spine moves at noon." },
    { month: 9, day: 3, name: "The Count",
      text: "House Vigil takes its census, rib by rib.",
      effect: "Watch patrols double. Anyone without papers is detained for a day and a night." },
    { month: 11, day: 22, name: "Fall-Feast",
      text: "The day the god fell. The Crown throws alms down the Spine: a rain of grams.",
      effect: "Every district below the Nave riots by nightfall. Street Cred moves double for anything done in public today." },
    { month: 12, day: 30, name: "The Stillness",
      text: "The last day of the year. No drilling, no trading, no lifts.",
      effect: "Everything is shut. By custom, any favour on the book may be called in today and cannot be refused." }
  ],

  /* ----------------------------------------------------------- weather --
     Rolled once a day. `dc` lines are shown next to the Ruling Desk's DC
     picker, so the GM sees them at the moment they set a number. */
  weather: { name: "Today's weather", die: 12, rows: [
    { name: "Clear under the ribs", text: "Still air and a pale light through the bone.", dc: [] },
    { name: "Ash drift", text: "Grey flakes fall from the Crown's furnaces and settle on everything.",
      dc: [{ what: "Sight beyond 60 ft", mod: "lightly obscured" }] },
    { name: "Ichor rain", text: "Warm, faintly gold rain off the upper ribs. Exposed chrome hums in it.",
      dc: [{ what: "Climbing and grappling on the ribs", mod: "+2 DC" },
           { what: "Perception beyond 30 ft", mod: "disadvantage" }] },
    { name: "Bone fog", text: "The marrow breathes out. A white fog fills the districts below the Nave.",
      dc: [{ what: "Sight beyond 30 ft (Nave and below)", mod: "heavily obscured" },
           { what: "Stealth", mod: "advantage" }] },
    { name: "God-heat", text: "The corpse runs a fever. Metal is too hot to hold bare-handed by noon.",
      dc: [{ what: "Each hour of hard work", mod: "DC 10 Con save or 1 exhaustion" }] },
    { name: "Static squall", text: "Ichor in the air scrambles every signal in the city.",
      dc: [{ what: "Netrunning and comms", mod: "+2 DC" }, { what: "Drone and frame range", mod: "halved" }] },
    { name: "Marrow wind", text: "An updraft howls up through the ribs and takes anything loose with it.",
      dc: [{ what: "Ranged attacks at long range", mod: "disadvantage" },
           { what: "Acrobatics on ledges and gantries", mod: "+2 DC" }] },
    { name: "The overflow", text: "The cisterns spill. Water runs down every stair to Weepwater.",
      dc: [{ what: "Streets in Weepwater and below", mod: "difficult terrain" }] },
    { name: "Choir hum", text: "The Cantor is singing through the wards. The bone itself carries it.",
      dc: [{ what: "Perception that relies on hearing", mod: "disadvantage" },
           { what: "Insight on anyone near a ward", mod: "+2 DC" }] },
    { name: "Clear and cold", text: "Frost on the gantries and every breath a cloud.",
      dc: [{ what: "Athletics to climb iced metal", mod: "+2 DC" }] },
    { name: "Moth-bloom", text: "Moths come indoors, thousands of them, drawn to anyone the god has touched.",
      dc: [{ what: "Stealth for anyone Fraying or worse", mod: "disadvantage" }] },
    { name: "Red sky", text: "The Houses are burning off excess ichor in the Crown. The whole city glows.",
      dc: [{ what: "Persuasion with House agents", mod: "+2 DC" }, { what: "Ichor ampules", mod: "cost double today" }] }
  ] },

  /* ------------------------------------------------ street encounters --
     By height: `below` is the Marrowworks to Tallowgate, `middle` the Nave
     to the Seventh Rib, `above` Lanternside to the Crown. `npc` names a
     template on the NPC screen, with how many. */
  street: {
    below: {
      day: { name: "Below the Nave, by day", die: 10, rows: [
        { text: "A shift change at the Marrowworks: three hundred drillers on the same stair, and one of them recognises a face in the party." },
        { text: "A rent collector from House Thorn is working the stalls, and a stallholder begs the party to vouch that she has paid.", npc: { t: "Corpo Security", n: 1 } },
        { text: "A child selling bone charms swears one of them is 'from the warm bore'. It is, and it is still warm." },
        { text: "Gullet runners have cornered a pilgrim who took a wrong turn down the Spine.", npc: { t: "Gutter Ganger", n: 3 } },
        { text: "An unlicensed carver is packing up in a hurry: a House Lathe inspection is two stalls away." },
        { text: "A lift car stuck between stops, full, and the operator shouting down for someone who can climb." },
        { text: "A funeral procession for a driller, carrying the chrome that is about to be carved out of him." },
        { text: "A stall selling second-hand ware, and one implant on the table twitches when a party member walks past." },
        { text: "A flooded stair in Weepwater. Something is moving under the water, and it is probably only a drone.", npc: { t: "Combat Drone", n: 1 } },
        { text: "Mother Slate's runner finds the party: she has work, and it has to start within the hour." }
      ] },
      night: { name: "Below the Nave, by night", die: 10, rows: [
        { text: "A gang is taxing the only lit stair home, one coin a head, two for anyone in chrome.", npc: { t: "Gutter Ganger", n: 4 } },
        { text: "A body at the foot of a rib, fallen from somewhere high. Its implants have already been taken." },
        { text: "Hush singers in a cistern chapel. The song stops the moment anyone listens to it." },
        { text: "A cyberpsycho loose in the rendering yards of Tallowgate, and the Watch is not coming down this far.", npc: { t: "Cyberpsycho", n: 1 } },
        { text: "A black clinic with its lights on. Someone inside is screaming, and someone else is counting grams." },
        { text: "House Thorn's collectors are breaking a door. The family inside has one night left on the book.", npc: { t: "Corpo Security", n: 2 } },
        { text: "A lost drone circling a market lantern, still broadcasting its last owner's name." },
        { text: "Drillers drinking after a shift, loud about the thing in the new bore that bled." },
        { text: "The water in Weepwater is glowing faintly gold tonight. Nobody is drinking it." },
        { text: "A stranger in old, familiar chrome watches the party from across the Gullet and leaves before anyone reaches them." }
      ] }
    },
    middle: {
      day: { name: "The Nave to the Seventh Rib, by day", die: 10, rows: [
        { text: "A queue for the Cantor's nave two thousand long, and someone offering to sell their place in it." },
        { text: "A Watch checkpoint on the Spine, checking papers and scanning chrome serials.", npc: { t: "Corpo Security", n: 2 } },
        { text: "Foreclosure notices going up on every door in the Seventh Rib, and a crowd forming." },
        { text: "A clerk from the Counting Rib drops a ledger page, and it names a party member." },
        { text: "A street preacher in Sanctum Null's shadow, preaching that the god is not dying." },
        { text: "Two House Vigil ward-keepers arguing over a ward that has started to hum." },
        { text: "A courier on a rooftop sprint across the rib, chased, and carrying something that glows." },
        { text: "A lift operator who wants to sell what she overheard between stops this morning." },
        { text: "A fixer's meeting in a chapel, deliberately, because nothing gets recorded on holy ground." },
        { text: "A House Lathe recruiter offering drillers' contracts with a signing bonus in fresh chrome." }
      ] },
      night: { name: "The Nave to the Seventh Rib, by night", die: 10, rows: [
        { text: "The lifts arrive before anyone calls them. All of them. Empty." },
        { text: "A netrunner jacked in on a bench, and three people waiting for her to go under so they can take her deck.", npc: { t: "Netrunner", n: 1 } },
        { text: "Evicted families from the Seventh Rib sleeping in the Spine's stations, and the Watch moving them on.", npc: { t: "Corpo Security", n: 3 } },
        { text: "A knight of House Thorn in full chrome, walking alone, and everyone else crossing the street." },
        { text: "A ward flickers off for six seconds. In the dark, someone runs." },
        { text: "An ichor tapper selling from a hole in the bone that is definitely not licensed." },
        { text: "A duel over a debt, in the street, with witnesses and a clerk to record it." },
        { text: "A pilgrim who has come all the way up the Spine and will not stop crying." },
        { text: "The Counting Rib's lights are all on, and the clerks are working through the night on one name." },
        { text: "Someone has painted the Fourth Minute on a wall: a burning eye and four figures." }
      ] }
    },
    above: {
      day: { name: "Lanternside to the Crown, by day", die: 10, rows: [
        { text: "An Archdeacon's procession clearing the street, and anyone who doesn't kneel is noted." },
        { text: "A House heir slumming it with bodyguards, looking for something to do that their family would hate.", npc: { t: "Corpo Security", n: 2 } },
        { text: "Pilgrims' hostels full, and a line to the Eye that has not moved in an hour." },
        { text: "A Reliquary repossession, in public: a shunt taken back from a woman who missed one payment." },
        { text: "A bone-sculptor's gallery opening, and the sculptures are of the god's face, remembered." },
        { text: "Private security on every corner. Everyone here has a reason to ask the party theirs.", npc: { t: "Corpo Security", n: 3 } },
        { text: "A Crown servant wants to sell a key to a service lift that runs straight down the Spine." },
        { text: "A House Vigil census taker, clipboard and all, who needs everyone's name." },
        { text: "Weather-sellers on the Brow, bottling the clear air of the Crown for the ribs below." },
        { text: "A duel between two House heirs, fought by hired champions. One champion is losing badly." }
      ] },
      night: { name: "Lanternside to the Crown, by night", die: 10, rows: [
        { text: "A party in a manor with its doors open. Anyone well dressed walks in." },
        { text: "A lieutenant of House Lathe meeting someone from the Gullet, far too high up for either of them.", npc: { t: "Corpo Lieutenant", n: 1 } },
        { text: "The Eye's chapel, lit, with nobody inside to sell the minutes." },
        { text: "A hunter-killer drone on patrol over the Crown's gardens.", npc: { t: "Hunter-Killer", n: 1 } },
        { text: "A servant slipping out with a bundle of jewellery and a House's crest on it." },
        { text: "Street samurai waiting for someone to leave a party.", npc: { t: "Street Samurai", n: 2 } },
        { text: "A body in a fountain, in expensive chrome, and a very expensive silence around it." },
        { text: "The Watch escorting a prisoner down the Spine without paperwork." },
        { text: "Moths at every lantern, thick as snow, and the pilgrims calling it an omen." },
        { text: "A choir fragment loose in a chapel, singing in a voice that isn't one voice.", npc: { t: "Choir Fragment", n: 1 } }
      ] }
    }
  },

  /* ------------------------------------------------------ bounty board --
     Jobs by how the street sees the crew. `seg` sizes the clock that
     "Take it" starts. */
  bounties: {
    low: { name: "Jobs for a crew with a bad name (Street Cred below 0)", die: 8, rows: [
      { job: "Carry a sealed box down the Spine without opening it", who: "A Gullet fence who won't give a name", pay: "600 grams", catch: "The box is ticking, and the fence has already sold the route to someone else.", seg: 4 },
      { job: "Strip a crashed drone before the Watch arrives", who: "A scav crew boss", pay: "400 grams and a cut", catch: "The drone belongs to House Vigil, and it is still recording.", seg: 4 },
      { job: "Stand at a door and look frightening while a debt is collected", who: "A House Thorn clerk", pay: "500 grams", catch: "The debtor is somebody the crew owes a favour to.", seg: 4 },
      { job: "Find a runaway driller and bring him back to his shift", who: "A House Lathe foreman", pay: "800 grams", catch: "He ran because of what he saw in the new bore.", seg: 6 },
      { job: "Clear squatters out of a Seventh Rib tenement", who: "A foreclosure agent", pay: "700 grams", catch: "The squatters are the family who still own it on paper.", seg: 6 },
      { job: "Test an unlicensed implant by wearing it for a week", who: "An unlicensed carver", pay: "1,000 grams and the implant", catch: "It installs at +2 Humanity and carries a Remnant.", seg: 6 },
      { job: "Steal back a pawned choir coin", who: "A desperate pilgrim", pay: "300 grams and a prayer", catch: "The pawnbroker is paying the Watch.", seg: 4 },
      { job: "Guard a black clinic overnight", who: "Dr. Maret Vhoss", pay: "900 grams", catch: "House Lathe raids it tonight.", seg: 6 }
    ] },
    mid: { name: "Jobs for a crew the street knows (Street Cred 0 to 4)", die: 8, rows: [
      { job: "Escort a ward-keeper to a ward that has started humming", who: "House Vigil", pay: "2,000 grams", catch: "The ward is humming because someone is trying to switch it off from the inside.", seg: 6 },
      { job: "Recover a ledger page before the Weighing", who: "A family on Thorn's book", pay: "1,500 grams and a debt forgiven", catch: "The page is in the Counting Rib, in a room with no doors.", seg: 6 },
      { job: "Map a new tunnel in the god's nervous system", who: "Ketch", pay: "2,500 grams", catch: "The second voice has already mapped it, and wants the crew to find something specific.", seg: 8 },
      { job: "Deliver a bribe to a lift operator, and make sure it lands", who: "Mother Slate", pay: "1,800 grams", catch: "The operator has been bought already, twice.", seg: 4 },
      { job: "Protect a witness until the Cantor hears her question", who: "A Sanctum Null priest", pay: "2,200 grams", catch: "Three Houses want her silent, and the queue is two days long.", seg: 8 },
      { job: "Retrieve a shunt from a repossession warehouse", who: "A woman who missed one payment", pay: "1,200 grams", catch: "Something has grown into it since.", seg: 6 },
      { job: "Win a duel on a debtor's behalf", who: "A Seventh Rib tenant", pay: "2,000 grams", catch: "The other champion is Ser Ambrel Dace's student.", seg: 4 },
      { job: "Find out who is selling chrome that answers to its old owner", who: "House Lathe, quietly", pay: "3,000 grams", catch: "The old owner is alive and wants it back.", seg: 8 }
    ] },
    high: { name: "Jobs for a crew with a name (Street Cred 5 and up)", die: 8, rows: [
      { job: "Steal a minute at the Eye that someone else already paid for", who: "A House heir", pay: "8,000 grams", catch: "The minute was bought by the crew's own future.", seg: 8 },
      { job: "Broker a truce between Thorn and Lathe for one night", who: "House Vigil", pay: "10,000 grams and a patron's favour", catch: "Somebody wants the truce broken, and they have hired a crew too.", seg: 8 },
      { job: "Carry a Crown message down to the Marrowworks by hand", who: "An Archdeacon", pay: "6,000 grams", catch: "The message is a death warrant for the foreman who reads it.", seg: 6 },
      { job: "Rescue a netrunner lost in the god's nervous system", who: "Her crew", pay: "7,500 grams", catch: "She doesn't want to come back.", seg: 8 },
      { job: "Stop a foreclosure in thirty days", who: "Eleven thousand tenants of the Seventh Rib", pay: "Whatever they can raise, and the street's love", catch: "The clause at the end of the contract is real.", seg: 12 },
      { job: "Guard the Cantor's nave on Choir Day", who: "The Cantor itself", pay: "A choir coin", catch: "Nine hundred voices, and one of them is silent, waiting.", seg: 6 },
      { job: "Retrieve a drill head from the new bore", who: "House Lathe", pay: "12,000 grams", catch: "It isn't a drill head any more.", seg: 8 },
      { job: "Find the people who keep singing the city to sleep", who: "House Reliquary", pay: "9,000 grams", catch: "They are the Hush, and they are right.", seg: 8 }
    ] }
  }
};
