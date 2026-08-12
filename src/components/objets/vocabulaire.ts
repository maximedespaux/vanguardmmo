import type { IconName } from "@/components/Icon";

/**
 * Le vocabulaire du catalogue d'objets : les codes du client du jeu traduits une
 * seule fois, ici, pour que la recherche et la fiche parlent la même langue.
 *
 * Aucun accès disque dans ce fichier : il est importé par du code client comme
 * par la route API. Le chargement du catalogue vit dans `catalogue.ts`, qui lit
 * avec `fs` et ne doit jamais remonter dans un composant client.
 */

/** Un objet du catalogue réduit. Les clés sont courtes parce que le fichier en
 *  compte 12 134 : en clair il pesait 4,5 Mo au lieu de 3. */
export type ObjetFiche = {
  i: number;                    // identifiant du client
  n: string;                    // nom français
  cle: string;                  // clé technique (II_…)
  f: Famille;
  ic?: string;                  // fichier d'icône, vérifié présent sur le disque
  t?: string;                   // type en français (« Glaive (deux mains) »)
  cl?: string;                  // classe requise (code JOB_…)
  nr?: number;                  // niveau requis pour équiper
  no?: number;                  // niveau DE L'OBJET — ≠ niveau requis
  nm?: number;                  // niveau maximum d'utilisation
  g?: "Unique" | "Ultime" | "Baruna";
  d?: string;                   // description du jeu
  dn?: number; dx?: number;     // dégâts (armes) ou défense (armures)
  va?: number;                  // coefficient de vitesse d'attaque
  bm?: number;                  // bonus magique (bâtons)
  ae?: number;                  // attaque élémentaire
  el?: string;                  // élément porté
  em?: string;                  // emplacement d'équipement
  sx?: "male" | "female";
  px?: number;                  // prix de référence en penyas
  du?: number;                  // durabilité affichée
  pi?: number;                  // taille de pile
  ne?: 1;                       // NON échangeable
  li?: 1 | 2;                   // lié au personnage / à l'équipement
  pnj?: 1;                      // vendable chez un PNJ
  dl?: 1;                       // durée de vie réelle
  nou?: 1;                      // nourriture
  af?: 1;                       // nom venu des textes propres à AirFlyff
  hw?: 1;                       // absent du wiki du serveur
  re?: Record<string, number>;  // résistances élémentaires
  b?: [string, number][];       // bonus : libellé + valeur
};

export type Famille = "arme" | "armure" | "bijou" | "mode" | "consommable" | "materiau" | "familier" | "divers";

/** Les familles, dans l'ordre où on cherche : ce qu'on porte d'abord. */
export const FAMILLES: { clef: Famille; label: string; icon: IconName }[] = [
  { clef: "arme", label: "Armes", icon: "sword" },
  { clef: "armure", label: "Armures", icon: "shirt-armor" },
  { clef: "bijou", label: "Bijoux", icon: "ring" },
  { clef: "mode", label: "Mode", icon: "shirt" },
  { clef: "consommable", label: "Consommables", icon: "droplet" },
  { clef: "materiau", label: "Matériaux", icon: "rock" },
  { clef: "familier", label: "Familiers", icon: "paw" },
  { clef: "divers", label: "Divers & boîtes", icon: "package" },
];

/** Une icône par type d'objet, pour que la liste se lise sans lire. */
export function iconeDeType(t: string | undefined, f: Famille): IconName {
  switch (t) {
    case "Épée à une main": case "Glaive (deux mains)": return "sword";
    case "Hache à une main": case "Doloire (deux mains)": return "pickaxe";
    case "Poing": return "fist";
    case "Sceptre de soin": return "sparkles";
    case "Arc / arbalète": return "bow";
    case "Bâton": return "spiral";
    case "Yo-yo": return "target";
    case "Baguette": return "orb";
    case "Casque": return "helmet";
    case "Armure": return "shirt-armor";
    case "Gants": case "Gants (mode)": return "gloves";
    case "Bottes": case "Chaussures (mode)": return "boots";
    case "Bouclier": case "Targe": return "shield";
    case "Grimoire": return "book";
    case "Anneau": return "ring";
    case "Boucle d'oreille": return "earring";
    case "Collier": return "necklace";
    case "Coiffe (mode)": return "hat";
    case "Tenue (mode)": return "shirt";
    case "Cape": return "cape";
    case "Masque": return "mask";
    case "Potion": return "droplet";
    case "Parchemin": return "scroll";
    case "Affiche": return "image";
    case "Matériau": return "rock";
    case "Œuf de familier": return "egg";
    case "Familier d'élevage": case "Familier ramasseur": case "Familier de soutien": return "paw";
    default: return FAMILLES.find((x) => x.clef === f)?.icon ?? "package";
  }
}

/**
 * L'arbre des métiers en français, tel que le client le nomme.
 *
 * Les huit derniers (Templier, Spadassin…) sont les classes légendaires propres
 * à AirFlyff : leurs codes ne se devinent pas (Primat = FLORIST_HERO). La
 * correspondance est prouvée par les tenues « … en Yggdrasil », dont le nom
 * français porte la classe et dont la ligne porte le code.
 */
const METIER: Record<string, string> = {
  VAGRANT: "Vagabond",
  MERCENARY: "Mercenaire", ACROBAT: "Acrobate", ASSIST: "Assistant", MAGICIAN: "Magicien",
  KNIGHT: "Chevalier", BLADE: "Lame", JESTER: "Baladin", RANGER: "Ranger",
  RINGMASTER: "Meneur", BILLPOSTER: "Moine", PSYCHIKEEPER: "Psykeeper", ELEMENTOR: "Élémentaliste",
  LORDTEMPLER_HERO: "Templier", STORMBLADE_HERO: "Spadassin", WINDLURKER_HERO: "Sylphide",
  CRACKSHOOTER_HERO: "Arbalétrier", FLORIST_HERO: "Primat", FORCEMASTER_HERO: "Chanoine",
  MENTALIST_HERO: "Envoûteur", ELEMENTORLORD_HERO: "Arcaniste",
};

/** « BLADE_HERO » → « Lame Héros ». Les paliers se suffixent, ils ne se listent pas. */
export function classeFr(code: string | undefined): string | null {
  if (!code) return null;
  if (METIER[code]) return METIER[code];
  const m = code.match(/^(.+)_(HERO|MASTER)$/);
  if (m && METIER[m[1]]) return `${METIER[m[1]]} ${m[2] === "HERO" ? "Héros" : "Maître"}`;
  return code;
}

/** L'emblème officiel de la classe. Les 37 codes rencontrés ont leur fichier :
 *  vérifié fichier par fichier au moment de réduire le catalogue. */
export const emblemeClasse = (code: string | undefined) =>
  code ? `/jeu/classes/job${code.toLowerCase().replace(/_/g, "")}.webp` : null;

/**
 * La couleur d'un grade — MESURÉE sur le cadre du jeu, pas choisie.
 *
 * Les deux cadres 32×32 que le client pose sur l'icône tranchent la question. Pixels
 * dominants relevés dans les fichiers, opacité pleine :
 *   item_edgeunique   → 41,255,41  (vert pur)            → var(--green)
 *   item_edgeultimate → 255,255,0 puis 230,156,0 (ambre) → var(--gold)
 * D'où le désaccord à signaler avec `GRADE_TON` de `components/jeu/Rarete.tsx`, qui
 * donne `--orange` à l'ultime : le fichier ne porte pas d'orange, il porte du jaune
 * et de l'ambre. Les CADRES eux-mêmes viennent de Rarete.tsx (`IconeGrade`) — il n'y
 * a plus de table de chemins ici, c'était la même chose écrite deux fois.
 */
export const COULEUR_GRADE: Record<string, string> = {
  Unique: "var(--green)",
  Ultime: "var(--gold)",
};

/**
 * LES QUATRE DÉS DE STATISTIQUE DU JEU — `FOR`, `DEX`, `INT`, `END`.
 *
 * Ce sont les tuiles que le client dessine dans la fenêtre de personnage, et elles
 * portent déjà le libellé en français. Un bonus « Force +10 » n'a donc pas besoin
 * qu'on écrive « Force » : le dé du jeu le dit, et il le dit comme le joueur en a
 * l'habitude. C'est vrai des quatre statistiques de base et d'elles seules — les
 * autres bonus (Précision, Taux critique…) n'ont pas de tuile.
 *
 * Vérifié image par image avant de brancher : les quatre fichiers portent bien les
 * trois lettres annoncées, en blanc sur ardoise.
 */
export const DE_STAT: Record<string, string> = {
  Force: "/jeu/interface/statdice_str.webp",
  Dextérité: "/jeu/interface/statdice_dex.webp",
  Intelligence: "/jeu/interface/statdice_int.webp",
  Endurance: "/jeu/interface/statdice_sta.webp",
};

/** L'étiquette « Ultime » telle que le client la dessine (badge ambre). Le grade
 *  Unique n'a pas d'équivalent dans le dossier : on ne lui en invente pas. */
export const BADGE_ULTIME = "/jeu/interface/icon_ultimate.webp";

/** Le cadenas du client, pour ce qui est lié ou non échangeable. */
export const CADENAS = "/jeu/interface/lock.webp";

const EMPLACEMENT: Record<string, string> = {
  PARTS_RWEAPON: "Main droite", PARTS_SHIELD: "Main gauche",
  PARTS_CAP: "Tête", PARTS_HAT: "Tête (mode)", PARTS_MASK: "Visage",
  PARTS_CLOTH: "Buste", PARTS_UPPER_BODY: "Buste (mode)",
  PARTS_GLOVE: "Mains", PARTS_HAND: "Mains (mode)",
  PARTS_BOOTS: "Pieds", PARTS_FOOT: "Pieds (mode)",
  PARTS_CLOAK: "Dos", PARTS_RING1: "Doigt", PARTS_NECKLACE1: "Cou",
  PARTS_EARRING1: "Oreilles", PARTS_RIDE: "Monture", PARTS_BULLET: "Munitions",
};
export const emplacementFr = (e: string | undefined) => (e ? EMPLACEMENT[e] ?? null : null);

/** Les cinq résistances, dans l'ordre des pastilles du jeu. */
export const RESISTANCES: { clef: string; label: string; couleur: string }[] = [
  { clef: "feu", label: "Feu", couleur: "#F87171" },
  { clef: "eau", label: "Eau", couleur: "#4EA8FF" },
  { clef: "vent", label: "Vent", couleur: "#33D6A6" },
  { clef: "terre", label: "Terre", couleur: "#4ADE80" },
  { clef: "foudre", label: "Foudre", couleur: "#FFD24A" },
];

/**
 * Comparaison tolérante aux accents : le jeu écrit « Ame de démon » sans
 * circonflexe et un joueur tape « Âme ». Sans cette normalisation, la moitié
 * des recherches ne trouve rien. Même fonction que /api/ou-trouver.
 */
export const clefRecherche = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/*
 * IL Y AVAIT ICI `penyas(n)`, qui mettait un prix du client en forme (« 2 Md »).
 * Le champ `px` reste dans les données, mais plus aucun écran ne l'affiche : les
 * montants ne servent pas, et un prix de PNJ n'a de toute façon rien à voir avec le
 * marché entre joueurs. Ce qui sert, c'est de savoir qu'un PNJ le vend — pas combien.
 */
