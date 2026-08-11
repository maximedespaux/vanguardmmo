import DONNEES from "@/data/donjons-client.json";

/**
 * CE QUE LE CLIENT DU JEU SAIT DES DONJONS, ET QUE LES CAPTURES NE DISAIENT PAS.
 *
 * La page des donjons a longtemps été un résumé de captures d'écran : type,
 * niveaux, PV conseillés, butin. La fouille des 84 archives de mondes du client
 * a livré ce qui manquait — le monde derrière chaque donjon, la taille réelle de
 * la carte, la coordonnée exacte de l'entrée, et surtout **le peuplement** :
 * quels monstres sont posés, à quel niveau, avec quels PV et quelles mécaniques
 * scriptées (rage à 20 % des PV, invocations de renforts).
 *
 * `donjons-client.json` est la réduction de `instances.json` (361 Ko) croisé avec
 * `monstres.json` (1,5 Mo) : 20 Ko, ce qui s'importe statiquement sans passer par
 * une route API. Le fichier est indexé par l'`id` de `dungeons.json`, pas par le
 * nom : les deux sources n'écrivent pas les noms pareil (« Chateau de Draken »
 * sans accent circonflexe côté client, « Forêt d’Euphrasia » avec l'apostrophe
 * typographique), et apparier par nom à l'exécution aurait cassé au premier
 * caractère près.
 *
 * DEUX MISES EN GARDE qui valent pour tout ce fichier :
 *
 * 1. Les monstres listés sont ceux **posés dans le fichier de carte**. Plusieurs
 *    boss finaux sont créés par le serveur au fil de la progression et n'y
 *    figurent pas — le Temple aérien n'a ainsi aucun monstre placé, et ça ne veut
 *    pas dire qu'il est vide.
 * 2. Le butin ORDINAIRE des monstres n'est pas dans le client : le serveur le
 *    calcule. Une absence de butin relevé ne dit jamais « ça ne tombe pas ».
 */
export type MonstrePose = {
  nom: string; niv: number; pv: number; rang: string; elem: string | null; points: number;
  atk?: number[];
  /** `[seuil en % de PV, facteur de dégâts]` — la rage scriptée du monstre. */
  rage?: number[];
  invoque?: { pv: number; n: number; nom: string }[];
  boss?: boolean;
  /** L'élément qui lui fait le plus mal, d'après sa table de résistances. */
  faible?: string;
  resiste?: string;
  aggro?: number;
  vole?: boolean;
};

export type DonjonClient = {
  monde: number;
  /** Le nom de la carte dans `World.inc`, souvent différent du nom affiché. */
  interne: string;
  dossier: string;
  blocs: number[];
  unites?: number[];
  interieur: boolean;
  vol: boolean;
  entree: number[];
  arrivee?: number[];
  /** Le monde d'où part le téléporteur : Madrigal, sauf la Faille du débutant. */
  depuis: string;
  /** Le prestige que le tooltip du client affiche — pas forcément celui du site. */
  prestigeClient: number | null;
  pvClient: number;
  zones?: string[];
  monstres: MonstrePose[];
  /** Sietch Kalgas seulement : ce que le serveur fait apparaître en plus. */
  horsCarte?: { nom: string; niv: number; pv: number; rang: string; role: string }[];
  etapes?: string[];
  noteButin?: string;
};

export type EtageTour = {
  etage: number; monde: number; carte: string; nom: string; unites: number[];
  boss: string; niv: number; pv: number; elem: string | null; points: number;
  faible?: string; sortie?: number[];
};

const TABLE = DONNEES as { donjons: Record<string, DonjonClient>; tourOubliee: EtageTour[] };

export const donjonClient = (id: number): DonjonClient | undefined => TABLE.donjons[String(id)];
export const TOUR_OUBLIEE = TABLE.tourOubliee;

/**
 * LES PLANS DE DONJON : deux, pas vingt-trois.
 *
 * Le client contient 26 plans (`dungeon_*.dds`), mais seuls deux ont été
 * convertis et versés dans le dépôt. On les branche par le dossier de carte du
 * client — `DuCastula`, `DuOphidian` — parce que c'est la seule clé stable : les
 * noms de fichiers viennent du client, pas du site.
 *
 * Les deux réglages optionnels servent le même plan, celui du Château de Draken,
 * et aucun n'est décoratif :
 *
 * - `filtre` : ce plan est un rendu de terrain non éclairé, un carré rouge uni où
 *   les couloirs existent mais sont invisibles à l'œil nu. Sans contraste, on
 *   affiche une image vide. À ne pas appliquer aux plans déjà lisibles, ça les
 *   brûle.
 * - `cadre` : `[x, y, largeur, hauteur]` en fraction de l'image. Les cartes du
 *   client font la taille du monde, pas celle du donjon — au Château de Draken,
 *   les salles occupent un quart de l'image et le reste est du vide. Recadrer se
 *   fait ici plutôt qu'en retouchant le fichier, parce que le fichier vient du
 *   client et sera reversé tel quel à la prochaine fouille.
 */
export const PLANS: Record<string, { src: string; filtre?: string; cadre?: [number, number, number, number] }> = {
  DuCastula: {
    src: "/jeu/plans/ducastula_bigpicture.webp",
    filtre: "grayscale(0.6) contrast(2.5) brightness(1.1)",
    cadre: [0.05, 0.37, 0.5, 0.5],
  },
  DuOphidian: { src: "/jeu/plans/duophidian_bigmap.webp" },
};

/** Les grands nombres de PV se lisent mieux abrégés : 570 350 000 → 570,4 M. */
export function pvCourt(pv: number): string {
  if (pv >= 1_000_000_000) return `${(pv / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md`;
  if (pv >= 1_000_000) return `${(pv / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  return pv.toLocaleString("fr-FR");
}

export const coord = (c: number[]) => `${c[0].toLocaleString("fr-FR")}, ${c[1].toLocaleString("fr-FR")}`;

/** La couleur d'un rang, pour qu'on repère un « super » sans lire l'étiquette. */
export const TON_RANG: Record<string, string> = {
  faible: "var(--text-muted)", normal: "var(--text)", capitaine: "var(--blue)",
  super: "var(--purple)", boss: "var(--red)",
};
