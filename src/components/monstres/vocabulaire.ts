/**
 * LE VOCABULAIRE DES MONSTRES — ce que l'écran et le serveur partagent.
 *
 * Séparé de `catalogue.ts` exprès : ce dernier lit le disque avec `fs` et ne
 * peut donc jamais être importé par un composant client. Tout ce qui doit être
 * lisible des deux côtés (types, libellés, couleurs, mises en forme) vit ici, et
 * ici seulement — c'est le même découpage que `components/objets/`.
 */

/** Le monstre tel que `public/wiki/monstres.json` le porte. Les noms de champs
 *  sont courts parce qu'ils sont répétés 1 124 fois dans un fichier de 612 Ko :
 *  écrire « attaqueMinimum » partout coûtait 60 Ko pour rien. */
export type Monstre = {
  id: string;
  nom: string;
  /** Clé de recherche, accents ôtés — calculée à la fouille, pas à la frappe. */
  k: string;
  niv: number | null;
  rang: string | null;
  pv: number;
  pm: number | null;
  atkMin: number | null;
  atkMax: number | null;
  def: number | null;
  resMag: number | null;
  prec: number | null;
  esq: number | null;
  /** Force, endurance, dextérité, intelligence — dans cet ordre. */
  sta: (number | null)[];
  vitAtk: number | null;
  /** Délai entre deux attaques, en millisecondes. */
  delai: number | null;
  elem: string | null;
  elemNiv: number | null;
  res: Record<string, number>;
  agro: string | null;
  vole: boolean;
  penya: number | null;
  exp: number | null;
  madrigal: number | null;
  zone: string | null;
  /** Porte une clé `NEWSERV` : c'est du contenu ajouté par AirFlyff. */
  maison: boolean;
  vies: number | null;
  /** PV × vies. Égal aux PV quand il n'y a qu'une vie. */
  pvEff: number;
  rage?: { pv: number; x: number }[];
  soigne?: { pv: number; rend: number }[];
  invoque?: { m: string; n: number; c: number }[];
  renfort?: { m: string; n: number; pv: number };
  fuit?: number;
  esqPct?: number;
  distance?: number;
  aggro?: number;
  sansPenalite?: boolean;
  tache?: boolean;
  butin?: { o: string; p: number; q: number }[];
  butinClient?: { o: string; p: number; niv: number }[];
  titre?: { t: string; n: number };
  groupe?: string;
  lieux?: { z: string; n: number }[];
};

export type Compteurs = {
  maison: number; vies: number; milliard: number;
  rage: number; invoque: number; localises: number; butin: number;
};

/** Recherche à accents normalisés : « Bàäl'tru » se trouve en tapant « baaltru »,
 *  et « Ame » trouve « Âme ». Sans ça, la moitié des noms d'AirFlyff — qui sont
 *  pleins de diacritiques et d'apostrophes — sont introuvables au clavier. */
export const clefRecherche = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Les gros nombres du haut niveau ne se lisent pas : 30 000 000 000 devient
 *  « 30 Md ». On garde le chiffre exact à côté quand il est le sujet de la ligne. */
export function court(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 10_000) return `${(n / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`;
  return n.toLocaleString("fr-FR");
}

export const entier = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("fr-FR");

/** La couleur d'un rang, pour qu'on repère un « super » sans lire l'étiquette.
 *  Mêmes tons que la fiche de donjon (`donjons/donneesClient.ts`) : deux pages
 *  qui montrent les mêmes monstres ne peuvent pas les colorier autrement. */
export const TON_RANG: Record<string, string> = {
  faible: "var(--text-muted)", normal: "var(--text)", capitaine: "var(--blue)",
  "demi-boss": "var(--gold)", boss: "var(--red)", super: "var(--purple)",
  materiau: "var(--green)",
};

export const tonRang = (r: string | null) => (r && TON_RANG[r]) || "var(--text-muted)";

/** Les 5 éléments du jeu et leur icône, vérifiées présentes dans
 *  `public/jeu/mecaniques/`. « aucun » n'a pas d'image : c'est une absence, pas
 *  un élément, et lui coller une icône ferait croire le contraire. */
export const ELEMENTS = ["feu", "eau", "electricite", "vent", "terre"] as const;

export const ELEMENT_FR: Record<string, string> = {
  feu: "Feu", eau: "Eau", electricite: "Électricité", vent: "Vent", terre: "Terre", aucun: "Aucun",
};

export const TON_ELEMENT: Record<string, string> = {
  feu: "var(--red)", eau: "var(--blue)", electricite: "var(--gold)",
  vent: "var(--green)", terre: "var(--orange)", aucun: "var(--text-muted)",
};

export const iconeElement = (e: string | null) =>
  e && (ELEMENTS as readonly string[]).includes(e) ? `/jeu/mecaniques/element-${e}.webp` : null;

/**
 * Ce à quoi il est faible, ce à quoi il résiste — LU DANS SES RÉSISTANCES.
 *
 * On pourrait appliquer la roue élémentaire (feu > vent > terre > électricité >
 * eau > feu), mais quelques monstres sortent du moule : Clockworks porte +0,5 sur
 * trois éléments à la fois. Déduire au lieu de lire donnerait une faiblesse qui
 * n'existe pas — donc on lit les cinq colonnes du client, et rien d'autre.
 * Une valeur négative = il prend PLUS de dégâts de cet élément.
 */
export function faiblesses(res: Record<string, number>) {
  const faible: string[] = [];
  const resiste: string[] = [];
  for (const e of ELEMENTS) {
    const v = res?.[e];
    if (typeof v !== "number" || v === 0) continue;
    (v < 0 ? faible : resiste).push(e);
  }
  return { faible, resiste };
}

/** Coups par seconde, à partir du délai en millisecondes. C'est la donnée que le
 *  tank regarde : 4 millions de dégâts toutes les 4 secondes et les mêmes toutes
 *  les 250 ms ne sont pas le même combat. */
export function cadence(delaiMs: number | null): string | null {
  if (!delaiMs || delaiMs <= 0) return null;
  const parSec = 1000 / delaiMs;
  return parSec >= 1
    ? `${parSec.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} coups/s`
    : `1 coup toutes les ${(delaiMs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
}

/** L'avertissement à ne jamais omettre. Une fiche muette sur le butin laisse
 *  croire que le monstre ne lâche rien — c'est faux, et c'est le serveur qui
 *  calcule les tables ordinaires. Le texte est ici pour être identique partout. */
export const AVERTISSEMENT_BUTIN =
  "Le butin ordinaire des monstres n’est PAS dans les fichiers du jeu : le serveur le calcule. Ce qui est listé ici, ce sont les seules tables écrites dans le client — le butin de quête et les six butins déclarés en dur. Une fiche sans butin ne veut donc jamais dire « ça ne lâche rien ».";
