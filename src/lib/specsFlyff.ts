/**
 * Ce qu'on peut préciser sur une pièce — et seulement ce que le jeu permet.
 *
 * Les réglages sont ceux du builder (public/airbuilder/airbuilder.js, fonctions
 * defCfg / panelFor) : une arme se perce et se rend rare, un casque non ; un
 * anneau monte à +30 quand une tenue plafonne à +10 ; l'éveil est R1 ou R2, pas
 * R3. Afficher partout les mêmes cases donnerait des quêtes impossibles —
 * « Casque Légendaire percé Fulgur » ne veut rien dire.
 *
 * D'où la règle : on part du NOM de l'objet du coffre (« Epee », « Armure »,
 * « Bouclier », « Anneaux »…) et de sa catégorie (« Armes - Yggdrasil »,
 * « Stuff - Dryades », « Bijoux »), et on n'ouvre que les réglages du slot
 * correspondant. Tout le reste — runes, cartes, ressources, pierres d'éveil —
 * n'a aucun réglage : ça se compte, point.
 *
 * Pas de Prisma ni de fs ici : ce module est lu par la page des quêtes, donc
 * côté navigateur.
 */

/** Rareté d'arme, mêmes paliers que MECH.arme.rarete_tiers du builder. */
export const RARETES = ["Commun", "Rare", "Épique", "Légendaire", "Pré-Mythique", "Mythique"] as const;
/** Éveil : le builder n'en propose que deux rangs. */
export const RANGS_EVEIL = ["R1", "R2"] as const;
/** data.json → EVSTATS. */
export const STATS_EVEIL = ["Force", "Endurance", "Dextérité", "Intelligence", "Dégâts critiques", "Attaque", "PV max", "MP max"] as const;
/** Scroll stat : quatre statistiques, +1 à +4. */
export const STATS_SCROLL = ["Force", "Endurance", "Dextérité", "Intelligence"] as const;
/** Élément de l'arme (≠ carte de perçage), data.json → ELEMENTS. */
export const ELEMENTS = ["Feu", "Eau", "Vent", "Terre", "Électricité"] as const;
/** Cartes de perçage : arme et bouclier d'un côté, tenue de l'autre. */
export const CARTES_ARME = ["Feu", "Eau", "Terre", "Foudre"] as const;
export const CARTES_TENUE = ["Fulgur", "Volcano", "Océane"] as const;

export type SlotFlyff = "weapon" | "shield" | "suit" | "armor" | "jewel" | "cape" | "fashion";

export type Reglages = {
  slot: SlotFlyff;
  /** Étiquette lisible du slot, pour l'écran. */
  label: string;
  /** Rareté Commun→Mythique : armes concernées seulement. */
  rarete: boolean;
  /** Amélioration maximale (+N), ou 0 si la pièce ne s'améliore pas. */
  upMax: number;
  /** Étoiles d'artefact, sur les armes qui montent au-delà de +10. */
  etoiles: boolean;
  /** Perçage : emplacements maximum et cartes possibles. */
  percage: { max: number; cartes: readonly string[] } | null;
  eveil: boolean;
  scroll: boolean;
  /** Niveau d'élément maximum, ou 0 si la pièce n'en porte pas. */
  elementMax: number;
};

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Les armes du coffre, par leur nom court (le coffre ne dit que « Epee »). */
const ARMES = [
  "epee", "glaive", "hache", "doloire", "marteau", "arc", "arbalete", "baguette",
  "baton", "sceptre", "grimoire", "poing", "yo-yo", "yoyo", "dague", "katana",
  "faux", "lance", "masse", "gantelet",
];

/**
 * Une arme Yggdrasil ou Éternelle passe en artefact : +20 au lieu de +10, et
 * douze perçages au lieu de dix (weaponPanelImpl du builder).
 */
const estArtefactable = (cat: string) => /yggdrasil|eternel/.test(sansAccent(cat));

/**
 * Les réglages disponibles pour un objet du coffre, ou `null` s'il n'en a
 * aucun — c'est le cas de tout ce qui se ramasse par lot : runes, cartes,
 * ressources, pierres d'éveil.
 *
 * `rarete` vient du coffre (aDesRaretes dans lib/coffre) : marteaux, boucliers
 * et grimoires n'ont pas de palier de rareté, la liste vit dans le data.json de
 * l'AirGuild et on ne la recopie pas ici.
 */
export function reglagesPour(o: { item: string; cat: string; rarete?: boolean }): Reglages | null {
  const cat = sansAccent(o.cat ?? "");
  const nom = sansAccent(o.item ?? "");

  // Une rune porte le nom de l'arme à laquelle elle se destine — « Rune Épée
  // Éternelle » — mais reste un consommable : elle se ramasse, elle ne se perce
  // pas. Sans ce test, elle héritait de tous les réglages d'une épée.
  if (/\brunes?\b/.test(nom)) return null;

  // Seules ces familles sont des pièces d'équipement. La catégorie « R1 »
  // contient des objets nommés « Fashion » ou « Bijoux » qui sont des pierres
  // d'éveil, pas des pièces : sans ce garde-fou, on leur proposerait un +30.
  const estStuff = cat.startsWith("stuff");
  const estArme = cat.startsWith("armes");
  const estBijou = cat.startsWith("bijou");
  if (!estStuff && !estArme && !estBijou) return null;

  const artefact = estArtefactable(o.cat ?? "");

  if (estArme && nom.includes("bouclier")) {
    return { slot: "shield", label: "Bouclier", rarete: false, upMax: 10, etoiles: false,
      percage: { max: 10, cartes: CARTES_ARME }, eveil: true, scroll: false, elementMax: 20 };
  }
  if (estArme && ARMES.some((a) => nom.includes(a))) {
    return { slot: "weapon", label: "Arme", rarete: o.rarete !== false, upMax: artefact ? 20 : 10, etoiles: artefact,
      percage: { max: artefact ? 12 : 10, cartes: CARTES_ARME }, eveil: true, scroll: true, elementMax: 20 };
  }
  if (estStuff && (nom.includes("armure") || nom.includes("tenue") || nom.includes("pectoral") || nom.includes("robe"))) {
    return { slot: "suit", label: "Tenue", rarete: false, upMax: 10, etoiles: false,
      percage: { max: 4, cartes: CARTES_TENUE }, eveil: true, scroll: true, elementMax: 20 };
  }
  if (estStuff && (nom.includes("casque") || nom.includes("gants") || nom.includes("bottes"))) {
    // « Cette pièce n'a ni perçage ni élément » — armorPanel du builder.
    return { slot: "armor", label: nom.includes("casque") ? "Casque" : nom.includes("gants") ? "Gants" : "Bottes",
      rarete: false, upMax: 10, etoiles: false, percage: null, eveil: true, scroll: true, elementMax: 0 };
  }
  if (estBijou && (nom.includes("anneau") || nom.includes("boucle") || nom.includes("collier"))) {
    // jewelPanel : jusqu'à +30 (aProtect lunaire), et l'éveil, rien d'autre.
    return { slot: "jewel", label: nom.includes("anneau") ? "Anneau" : nom.includes("boucle") ? "Boucles" : "Collier",
      rarete: false, upMax: 30, etoiles: false, percage: null, eveil: true, scroll: false, elementMax: 0 };
  }
  if (nom.includes("cape")) {
    return { slot: "cape", label: "Cape", rarete: false, upMax: 0, etoiles: false, percage: null, eveil: true, scroll: false, elementMax: 0 };
  }
  return null;
}

/** L'état de saisie : tout est facultatif, une chaîne vide = « non précisé ». */
export type ChoixPiece = {
  rarete: string; up: string; etoiles: string;
  percage: string; carte: string;
  eveilRang: string; eveilStat: string;
  scrollStat: string; scrollNiv: string;
  element: string; elementNiv: string;
};

export const CHOIX_VIDE: ChoixPiece = {
  rarete: "", up: "", etoiles: "", percage: "", carte: "",
  eveilRang: "", eveilStat: "", scrollStat: "", scrollNiv: "", element: "", elementNiv: "",
};

/**
 * La pièce visée en une ligne — c'est ce texte qu'on relit dans la to-do list,
 * et celui qu'on montrera au staff au moment du dépôt.
 */
export function resumerPiece(c: ChoixPiece): string {
  const bouts: string[] = [];
  if (c.rarete) bouts.push(c.rarete);
  if (Number(c.up) > 0) bouts.push(`+${Number(c.up)}${Number(c.etoiles) > 0 ? ` ${"★".repeat(Number(c.etoiles))}` : ""}`);
  if (Number(c.percage) > 0 || c.carte) {
    bouts.push(`${Number(c.percage) > 0 ? `${Number(c.percage)} perçage${Number(c.percage) > 1 ? "s" : ""}` : "percé"}${c.carte ? ` ${c.carte}` : ""}`);
  }
  if (c.eveilRang || c.eveilStat) bouts.push(`éveil ${[c.eveilRang, c.eveilStat].filter(Boolean).join(" ")}`);
  if (c.scrollStat) bouts.push(`scroll ${c.scrollStat}${Number(c.scrollNiv) > 0 ? ` +${Number(c.scrollNiv)}` : ""}`);
  if (c.element) bouts.push(`élément ${c.element}${Number(c.elementNiv) > 0 ? ` +${Number(c.elementNiv)}` : ""}`);
  return bouts.join(" · ");
}
