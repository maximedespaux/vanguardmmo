/**
 * CE QU'ON COLLECTIONNE — la forme de `public/wiki/collections.json`.
 *
 * Le fichier est l'extrait REDUIT de la fouille du client : 43 Ko, seulement
 * les champs que la page affiche. Il est servi depuis `public/`, donc chargé
 * une fois par le navigateur et non recalculé à chaque requête — c'est de la
 * connaissance du jeu, elle ne change qu'à la prochaine fouille.
 *
 * Quatre systèmes du jeu vivent ici plutôt que sur quatre pages : ils posent
 * tous la même question — « qu'est-ce qu'il me reste à décrocher ? ».
 */

/** Un titre d'honneur. Le client donne une CLEF de condition, jamais une
 *  phrase : `q` est notre lecture de la clef, et la page le dit. */
export type Titre = {
  n: string;
  /** Le regroupement par CE QU'ON FAIT — pas les cinq catégories du client,
   *  qui mélangeaient une promotion et une pilule dans le même sac. */
  g: GroupeTitre;
  q: string;
  s: number;
  /** Icône du jeu, sous `/jeu/icones/`. Absente = pas de fichier certain. */
  ic?: string;
  /** Identifiant du catalogue : ouvre la fiche de l'objet. */
  oid?: number;
  /** Niveau du monstre, pour les titres de chasse. */
  niv?: number;
  /** La zone où l'espèce apparaît le plus — pas la première trouvée. */
  ou?: string;
  /** Emblème de classe, pour les promotions. */
  emb?: string;
};

export type GroupeTitre =
  | "promotion" | "chasse" | "objet" | "remis" | "pvp" | "stat" | "social" | "temps";

/** Une famille de succès : ses marches, écrites en français. Les SEUILS et les
 *  lots vivent côté serveur — on montre le gabarit, pas des chiffres qu'on n'a
 *  pas. */
export type FamilleSucces = {
  cle: string;
  nom: string;
  bloc: "chasse" | "donjon" | "autre";
  icon: string;
  marches: string[];
  /** Les espèces à chasser, quand la famille en liste. */
  cibles?: { n: string; niv?: number }[];
};

export type Ange = {
  n: string;
  sous?: string;
  ic?: string;
  /** Le coût du passage AU niveau n+1, index 0 = du niveau 1 au 2. */
  couts: number[];
  cumul: number;
  /** `false` = un habillage : un seul niveau, et le buff de tous les autres. */
  montable: boolean;
  paliers: { niv: number; buff: string }[];
};

export type Maitrise = {
  xp: Record<string, number>;
  niveauMax: number;
  armes: { n: string; stat: string; gain: Record<string, number> }[];
  /** Une tranche de niveaux de maîtrise, et son coût selon le niveau de l'ARME. */
  paliers: { de: number; a: number; bas: number; haut: number; seuilHaut: number }[];
};

export type Deck = {
  id: number;
  etui: string;
  bonus: [string, number][];
  eveille: [string, number][];
  cartes: { n: string; sujet?: string; niv?: number; art?: string }[];
};

/** Un grade de karma. Le client laisse deux champs à « = » sur le dernier
 *  grade : on les rend tels quels plutôt que de recopier le voisin. */
export type Karma = {
  grade: number;
  n: string;
  pts: number;
  col: string;
  remise: number | string;
  vente: number | string;
  gardes: boolean;
  xp: number;
  penyas: number;
  objets: number;
  chance: number;
  recup: number;
};

export type Collections = {
  genere: string;
  sources: Record<string, string>;
  titres: Titre[];
  succesFamilles: FamilleSucces[];
  nbSucces: number;
  anges: Ange[];
  poudre: { n: string; ic?: string; oid?: number };
  maitrise: Maitrise;
  decks: Deck[];
  nbCartesDefinies: number;
  nbCartesPlacees: number;
  karma: Karma[];
};

/** Les huit groupes de titres, dans l'ordre où on vient les voir : ce qui
 *  s'obtient en jouant normalement d'abord, les curiosités à la fin. */
export const GROUPES: { cle: GroupeTitre; label: string; icon: string; quoi: string }[] = [
  { cle: "promotion", label: "Promotions", icon: "medal", quoi: "Le titre tombe en passant le palier de classe." },
  { cle: "chasse", label: "Chasse", icon: "target", quoi: "Une espèce, un compteur de morts." },
  { cle: "objet", label: "Consommation", icon: "basket", quoi: "Manger, boire — beaucoup." },
  { cle: "pvp", label: "PvP", icon: "swords", quoi: "Les points d'arène et les kills." },
  { cle: "stat", label: "Statistiques", icon: "gauge", quoi: "Une caractéristique poussée à son plafond." },
  { cle: "social", label: "Vie sociale", icon: "heart", quoi: "Couple, couvées, sauts." },
  { cle: "temps", label: "Temps passé", icon: "clock", quoi: "Des heures, simplement." },
  { cle: "remis", label: "Remis par un objet", icon: "gift", quoi: "Ceux-là ne se farment pas : un objet à usage unique les donne." },
];

/** Un nombre, avec l'espace des milliers du français. */
export const nb = (n: number) => n.toLocaleString("fr-FR");

/** Comparaison tolérante pour la recherche : les accents et la casse ne
 *  comptent pas — on tape « fee » et on trouve « féerique ». */
export const clef = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
