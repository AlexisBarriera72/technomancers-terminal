/* Spanish — the book's rules text.
 *
 * Loaded on demand the first time somebody switches to Spanish, because it is
 * the large half and most players will never ask for it. The service worker
 * keeps it once it has been fetched, so it is a one-time cost.
 *
 * Keys are the English source text exactly as it reaches the screen. A key that
 * no longer matches falls back to English — which is why the English is the key:
 * change a rule in data.js and the Spanish for it disappears rather than
 * lingering as a translation of something the rule no longer says.
 *
 * Digit runs in a key are written {0}, {1}… so one entry covers a family of
 * interpolated strings and a translator can move a number where Spanish wants it.
 *
 * MACHINE TRANSLATED, and shown as such on screen. The English is the reference
 * text and is one tap away from every entry here. Nothing in this file is read
 * by the rules engine — armour class, weapon proficiency, feat bonuses and the
 * action-economy classifier all parse the English in data.js, never this.
 */
window.TTES = window.TTES || {};
window.TTES.book = {
  "+{0}. Doors open. So do files — corps now run your face on sight.": "+{0}. Se abren puertas. Y expedientes — las corpos ya pasan tu cara por el sistema en cuanto te ven.",
  "A set of common clothes, a cheap employee of the month award, a set of artisan's tools (one of your choice), and a credit stick with {0}₵.": "Un juego de ropa común, un premio barato al empleado del mes, unas herramientas de artesano (a tu elección) y una tarjeta de crédito con {0}₵.",
  "A set of common clothes, a labcoat, a set of artisan's tools (one of your choice), and a credit stick with {0},{1}₵.": "Un juego de ropa común, una bata de laboratorio, unas herramientas de artesano (a tu elección) y una tarjeta de crédito con {0},{1}₵.",
  "A set of common clothes, a set of handcuffs, an old uniform, and a credit stick with {0},{1}₵.": "Un juego de ropa común, unas esposas, un uniforme viejo y una tarjeta de crédito con {0},{1}₵.",
  "A set of common clothes, a smartphone, a trophy from a previous job, and a credit stick with {0},{1}₵.": "Un juego de ropa común, un smartphone, un trofeo de un trabajo anterior y una tarjeta de crédito con {0},{1}₵.",
  "A set of common or fine clothes, a pistol, a dose of a common drug of your choice, a token from your gang, and a credit stick with {0},{1}₵.": "Un juego de ropa común o elegante, una pistola, una dosis de una droga común a tu elección, una insignia de tu banda y una tarjeta de crédito con {0},{1}₵.",
  "A set of common or fine clothes, {0} doses of a common drug of your choice, and a credit stick with {1},{2}₵.": "Un juego de ropa común o elegante, {0} dosis de una droga común a tu elección y una tarjeta de crédito con {1},{2}₵.",
  "A set of fine clothes, a cosmetic pouch, a piece of fancy looking jewelry, a can of pepper spray, and a credit stick with {0},{1}₵.": "Un juego de ropa elegante, un neceser de cosmética, una joya de aspecto caro, un bote de espray de pimienta y una tarjeta de crédito con {0},{1}₵.",
  "A set of fine clothes, a smartphone, a bottle of perfume, and a credit stick with {0},{1}₵.": "Un juego de ropa elegante, un smartphone, un frasco de perfume y una tarjeta de crédito con {0},{1}₵.",
  "A set of fine clothes, a smartphone, an award from your company, and a credit stick with {0},{1}₵.": "Un juego de ropa elegante, un smartphone, un premio de tu empresa y una tarjeta de crédito con {0},{1}₵.",
  "A set of grease-stained common clothes, a set of tinker's tools, and a credit stick with {0},{1}₵.": "Un juego de ropa común manchada de grasa, unas herramientas de calderero y una tarjeta de crédito con {0},{1}₵.",
  "A set of traveler's clothes, a medal, and a credit stick with {0},{1}₵.": "Un juego de ropa de viaje, una medalla y una tarjeta de crédito con {0},{1}₵.",
  "Alter one record — a warrant, a debt, a clearance, a death certificate — convincingly enough to survive casual inspection.": "Alterar un registro — una orden, una deuda, una autorización, un certificado de defunción — de forma convincente para aguantar una inspección rutinaria.",
  "Armor": "Armadura",
  "Building a new identity from nothing takes three days of downtime and {0},{1}₵.": "Construir una identidad nueva desde cero cuesta tres días de inactividad y {0},{1}₵.",
  "Burn ({0}) — the frame's speed doubles until the end of your turn.": "Quemar ({0}) — la velocidad del chasis se duplica hasta el final de tu turno.",
  "Emergency Eject ({0}) — when the frame would be destroyed, it instead drops to {1} hit point and you are not ejected.": "Eyección de emergencia ({0}) — cuando el chasis fuera a quedar destruido, baja a {1} punto de golpe y tú no sales despedido.",
  "Harden ({0}) — the frame gains resistance to all damage until the start of your next turn.": "Blindar ({0}) — el chasis gana resistencia a todo el daño hasta el inicio de tu siguiente turno.",
  "Overclock Servos ({0}) — the frame makes one extra attack this turn.": "Servos al límite ({0}) — el chasis hace un ataque extra este turno.",
  "Sensor Sweep ({0}) — the frame detects every powered object and living creature within {1} feet, through walls.": "Barrido de sensores ({0}) — el chasis detecta todo objeto con corriente y toda criatura viva a {1} pies, a través de las paredes.",
  "They arrive as reflex — hands that know a weapon you have never fired, a language you have never studied answering itself in your mouth.": "Llegan como reflejo — manos que conocen un arma que nunca has disparado, un idioma que nunca has estudiado respondiéndose solo en tu boca.",
  "Tools": "Herramientas",
  "Weapons": "Armas",
  "You can see in all directions — attackers gain no benefit from being unseen or behind you.": "Ves en todas direcciones — a quien te ataca no le sirve de nada estar oculto o a tu espalda.",
  "You were born owing. You start with an extra {0},{1}₵ of gear and a creditor who knows exactly where you sleep.": "Naciste debiendo. Empiezas con {0},{1}₵ de equipo extra y un acreedor que sabe exactamente dónde duermes.",
  "{0}x price of the armor, minimum of {1},{2}₵": "{0}x el precio de la armadura, mínimo {1},{2}₵"
};
