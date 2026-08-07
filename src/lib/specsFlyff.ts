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
/** Sertissage d'une arme : 5 diamants, data.json → DIASTATS. */
export const STATS_DIAMANT = ["Intelligence", "Endurance", "Force", "Dextérité", "Syphon de vie", "Dégâts JcJ", "Attaque", "Défense", "PV max"] as const;
/** Les 3 diamants HOLOGRAPHIQUES ne se débloquent qu'en artefact (+11 à +20) — data.json → HOLOSTATS. */
export const STATS_HOLO = ["Intelligence +33", "Endurance +33", "Force +33", "Dextérité +33", "Dégâts JcJ +15"] as const;
/** Gemmes de fashion : 4 emplacements, data.json → GEMC (noms uniques). */
export const STATS_GEMME = ["Force", "Endurance", "Dextérité", "Intelligence", "Attaque", "Dégâts magiques", "Dégâts critiques", "Dégâts magiques %", "Heal Rate", "PV max", "Défense"] as const;
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
  /** Sertissage : diamants, et diamants holographiques quand la pièce passe en
   *  artefact. Réservé aux armes, comme dans weaponPanelImpl. */
  sertissage: { diamants: number; holo: number } | null;
  /** Emplacements de gemmes — les fashions, et elles seules (fashionPanel). */
  gemmes: number;
};

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Les réglages d'un emplacement, à la source : c'est la table de vérité, et
 * tout le reste y mène. Le coffre y arrive par le nom de l'objet, la commande
 * sur mesure par le slot du builder — mais les règles ne sont écrites qu'ici.
 *
 * `artefact` : une arme Éternelle ou Yggdrasil monte à +20 et ouvre douze
 * perçages (weaponPanelImpl) ; les autres plafonnent à +10 et dix.
 * `rarete` : ne concerne que les armes, et pas toutes (voir reglagesPour).
 */
export function reglagesDeSlot(slot: SlotFlyff, o: { artefact?: boolean; rarete?: boolean; label?: string } = {}): Reglages {
  const art = !!o.artefact;
  const base = { slot, label: o.label ?? slot, rarete: false, upMax: 0, etoiles: false, percage: null, eveil: false, scroll: false, elementMax: 0, sertissage: null, gemmes: 0 } as Reglages;
  switch (slot) {
    case "weapon":
      return { ...base, label: o.label ?? "Arme", rarete: o.rarete !== false, upMax: art ? 20 : 10, etoiles: art,
        percage: { max: art ? 12 : 10, cartes: CARTES_ARME }, eveil: true, scroll: true, elementMax: 20,
        // Les 3 holographiques se débloquent en artefact : on les propose là où
        // le builder les propose, pas ailleurs.
        sertissage: { diamants: 5, holo: art ? 3 : 0 } };
    case "shield":
      return { ...base, label: o.label ?? "Bouclier", upMax: 10, percage: { max: 10, cartes: CARTES_ARME }, eveil: true, elementMax: 20 };
    case "suit":
      return { ...base, label: o.label ?? "Tenue", upMax: 10, percage: { max: 4, cartes: CARTES_TENUE }, eveil: true, scroll: true, elementMax: 20 };
    case "armor":
      // « Cette pièce n'a ni perçage ni élément » — armorPanel du builder.
      return { ...base, label: o.label ?? "Armure", upMax: 10, eveil: true, scroll: true };
    case "jewel":
      // jewelPanel : jusqu'à +30 (aProtect lunaire), et l'éveil, rien d'autre.
      return { ...base, label: o.label ?? "Bijou", upMax: 30, eveil: true };
    case "cape":
      return { ...base, label: o.label ?? "Cape", eveil: true };
    case "fashion":
      return { ...base, label: o.label ?? "Fashion", upMax: 10, gemmes: 4 };
  }
}

/** Le slot du builder (weapon, ring1, fhead…) ramené à une famille de réglages. */
export function slotDepuisBuilder(clef: string): SlotFlyff | null {
  const s = clef.replace(/[0-9]/g, "");
  if (s === "weapon") return "weapon";
  if (s === "shield") return "shield";
  if (s === "suit") return "suit";
  if (["helmet", "gauntlet", "boots"].includes(s)) return "armor";
  if (["ring", "earring", "necklace"].includes(s)) return "jewel";
  if (s === "cape") return "cape";
  if (["fashion", "fhead", "ftop", "fhand", "ffoot"].includes(s)) return "fashion";
  // Mantra, masque, fée, familier, ramasseur : le builder n'y règle rien de
  // ce qu'on sait décrire ici.
  return null;
}

/** Les tiers qui passent en artefact, comme dans weaponPanelImpl. */
export const estTierArtefact = (tier?: string | null) => /yggdrasil|eternel/.test(sansAccent(tier ?? ""));

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

  if (estArme && nom.includes("bouclier")) return reglagesDeSlot("shield");
  if (estArme && ARMES.some((a) => nom.includes(a))) return reglagesDeSlot("weapon", { artefact, rarete: o.rarete !== false });
  if (estStuff && (nom.includes("armure") || nom.includes("tenue") || nom.includes("pectoral") || nom.includes("robe"))) {
    return reglagesDeSlot("suit");
  }
  if (estStuff && (nom.includes("casque") || nom.includes("gants") || nom.includes("bottes"))) {
    return reglagesDeSlot("armor", { label: nom.includes("casque") ? "Casque" : nom.includes("gants") ? "Gants" : "Bottes" });
  }
  if (estBijou && (nom.includes("anneau") || nom.includes("boucle") || nom.includes("collier"))) {
    return reglagesDeSlot("jewel", { label: nom.includes("anneau") ? "Anneau" : nom.includes("boucle") ? "Boucles" : "Collier" });
  }
  if (nom.includes("cape")) return reglagesDeSlot("cape");
  return null;
}

/** L'état de saisie : tout est facultatif, une chaîne vide = « non précisé ». */
export type ChoixPiece = {
  rarete: string; up: string; etoiles: string;
  percage: string; carte: string;
  eveilRang: string; eveilStat: string;
  scrollStat: string; scrollNiv: string;
  element: string; elementNiv: string;
  /** Une entrée par emplacement, vide = « peu importe ». */
  diamants: string[]; holo: string[]; gemmes: string[];
};

export const CHOIX_VIDE: ChoixPiece = {
  rarete: "", up: "", etoiles: "", percage: "", carte: "",
  eveilRang: "", eveilStat: "", scrollStat: "", scrollNiv: "", element: "", elementNiv: "",
  diamants: [], holo: [], gemmes: [],
};

/** Les emplacements renseignés, regroupés : « 2× Force, Attaque ». */
export function resumerEmplacements(l: string[] | undefined): string {
  const remplis = (l ?? []).filter(Boolean);
  if (!remplis.length) return "";
  const n: Record<string, number> = {};
  for (const x of remplis) n[x] = (n[x] ?? 0) + 1;
  return Object.entries(n).map(([k, v]) => (v > 1 ? `${v}× ${k}` : k)).join(", ");
}

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
  const dia = resumerEmplacements(c.diamants);
  if (dia) bouts.push(`sertissage ${dia}`);
  const holo = resumerEmplacements(c.holo);
  if (holo) bouts.push(`holo ${holo}`);
  const gem = resumerEmplacements(c.gemmes);
  if (gem) bouts.push(`gemmes ${gem}`);
  return bouts.join(" · ");
}
