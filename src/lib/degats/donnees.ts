// ════════════════════════════════════════════════════════════════════════════
//  LES RELEVÉS QUE LE MOTEUR LIT — lus une fois avec `fs`, gardés en mémoire.
//
//  POURQUOI PAS UN IMPORT : les quatre fichiers pèsent 2,3 Mo à eux seuls
//  (objets-stats 1,1 Mo · monstres 612 Ko · bonus-sources 512 Ko · compétences
//  196 Ko). Un import statique les poserait dans le paquet JS de la page ; un
//  fetch depuis le navigateur ferait la même bêtise en différé. Au-delà de
//  120 Ko la maison lit avec `fs` derrière une route — même modèle que
//  `src/lib/ouFarmer.ts` et `src/components/monstres/catalogue.ts`.
//
//  CE FICHIER TOUCHE AU DISQUE : il ne doit JAMAIS être importé par un composant
//  « use client ». Les calculs purs, eux, vivent dans les autres modules du
//  dossier et ne demandent que des objets déjà chargés — ils tournent aussi bien
//  dans le navigateur si un jour on leur passe les données autrement.
// ════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import type { ArmeEquipee, Cible, Element } from "./contrat";

// ── Les formes sur disque ──────────────────────────────────────────────────

/** Une ligne de `public/wiki/competences.json`. Forme vérifiée sur les 197. */
export type CompetenceBrute = {
  id: string;
  nom: string;
  desc?: string;
  classe: string;
  famille?: string;
  nivPerso: number;
  nivMax: number;
  type?: string;
  zone?: string;
  arme?: string;
  mains?: string;
  /** `dwReferStat1` mis en français : Force, Endurance, Dextérité, Intelligence. */
  stat?: string;
  /** `dwReferValue1`, brut. Voir `echelleDeStat` pour le sort qu'on lui réserve. */
  coef?: number;
  /** Ce qui ne bouge pas d'un niveau à l'autre : le fichier l'a hissé ici. */
  fixe: Record<string, number>;
  /**
   * UN OBJET, PAS UN TABLEAU : `{ dmin: [...], dmax: [...], pf: [...] }`, un
   * tableau par colonne, indexé par niveau de compétence moins un.
   */
  niveaux: Record<string, unknown[]>;
};

type ObjetBrut = {
  i: number;
  cle: string;
  n?: string;
  t1: string;
  t2: string;
  k3?: string;
  em?: string;
  job?: string;
  h?: number;
  wt?: string;
  ar?: string;
  lv: number;
  nr?: number;
  dn?: number;
  dx?: number;
  va?: number;
  g?: string;
  b?: [string, number][];
  re?: Record<string, number>;
  ea?: number;
};

type MonstreBrut = {
  id: string;
  nom: string;
  niv: number;
  rang: string | null;
  pv: number;
  def: number;
  resMag: number;
  esq: number;
  prec: number;
  vitAtk?: number;
  delai?: number;
  elem: string | null;
  elemNiv?: number;
  res?: Record<string, number | null>;
  vies: number | null;
  pvEff: number;
};

/** Une ligne de `facteursDeClasse` de `bonus-sources.json`, telle qu'extraite. */
export type FacteursClasse = {
  classe: string;
  /** Colonne coréenne 공속 — la vitesse d'attaque de base de la classe. */
  colonne1?: number;
  MaxHP?: number;
  MaxMP?: number;
  MaxFP?: number;
  /** Colonne coréenne 물리방어력관련 — le facteur de défense physique. */
  colonne5?: number;
  SWD?: number;
  AXE?: number;
  STAFF?: number;
  STICK?: number;
  KNUCKLE?: number;
  WAND?: number;
  YOYO?: number;
  BLOCKING?: number;
  CRITICAL?: number;
  [k: string]: number | string | undefined;
};

// ── Le chargement, une seule fois ──────────────────────────────────────────

const lire = <T,>(...bouts: string[]): T =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), ...bouts), "utf-8")) as T;

let COMPETENCES: Map<string, CompetenceBrute> | null = null;
let OBJETS: Map<string, ObjetBrut> | null = null;
let MONSTRES: Map<string, MonstreBrut> | null = null;
let CLASSES: Map<string, FacteursClasse> | null = null;
let LIBELLES: Map<string, string> | null = null;

export function competences(): Map<string, CompetenceBrute> {
  if (!COMPETENCES) {
    const p = lire<{ competences: CompetenceBrute[] }>("public", "wiki", "competences.json");
    COMPETENCES = new Map(p.competences.map((c) => [c.id, c]));
  }
  return COMPETENCES;
}

function objets(): Map<string, ObjetBrut> {
  if (!OBJETS) {
    const p = lire<{ objets: ObjetBrut[] }>("public", "wiki", "objets-stats.json");
    OBJETS = new Map(p.objets.map((o) => [o.cle, o]));
  }
  return OBJETS;
}

function monstres(): Map<string, MonstreBrut> {
  if (!MONSTRES) {
    const p = lire<{ monstres: MonstreBrut[] }>("public", "wiki", "monstres.json");
    MONSTRES = new Map(p.monstres.map((m) => [m.id, m]));
  }
  return MONSTRES;
}

/**
 * LES FACTEURS DE CLASSE — `propJob.inc`, dix-huit colonnes sur quarante lignes.
 *
 * Le relevé garde les intitulés du client tels quels, y compris les deux qui
 * n'ont aucun fragment latin. Deux d'entre elles servent au calcul de dégâts et
 * il faut savoir lesquelles, sinon on prend une colonne pour une autre :
 *   · `colonne1` = 공속, la vitesse d'attaque de base (VAGRANT 75, BLADE 90) ;
 *   · `colonne5` = 물리방어력관련, le facteur de défense physique.
 * Et un piège de nommage à ne pas retomber dedans : les clés `hp`, `mp`, `fp`
 * du relevé sont les taux de RÉCUPÉRATION (회복률). Le facteur de PV max, lui,
 * s'appelle `MaxHP` — c'est celui qui vaut 2 pour un Templier.
 */
export function facteursDeClasse(): Map<string, FacteursClasse> {
  if (!CLASSES) {
    const p = lire<{ facteursDeClasse: { classes: FacteursClasse[] } }>("public", "wiki", "bonus-sources.json");
    CLASSES = new Map(p.facteursDeClasse.classes.map((c) => [c.classe, c]));
  }
  return CLASSES;
}

/** Le dictionnaire `DST_*` → libellé français. 36 Ko : import direct possible,
 *  mais on passe par `fs` comme le reste pour que tout le module se charge pareil. */
export function libelleStat(code: string): string {
  if (!LIBELLES) {
    const p = lire<{ stats: { code: string; fr?: string }[] }>("src", "data", "statistiques-objets.json");
    LIBELLES = new Map(p.stats.map((s) => [s.code, s.fr ?? s.code]));
  }
  return LIBELLES.get(code) ?? code;
}

// ── Les conversions vers les formes du contrat ─────────────────────────────

/** Les cinq colonnes de résistance, avec le nom que `monstres.json` emploie. */
const COLONNES_RES: Element[] = ["feu", "eau", "electricite", "vent", "terre"];

/**
 * Une cible depuis le relevé des monstres.
 *
 * `pvEff` est repris tel quel : le relevé a déjà fait PV × vies, et c'est bien
 * ce total qu'il faut sortir pour tuer un monstre à plusieurs vies.
 */
export function cible(id: string): Cible | null {
  const m = monstres().get(id);
  if (!m) return null;
  const resistances: Partial<Record<Element, number | null>> = {};
  for (const c of COLONNES_RES) resistances[c] = m.res?.[c] ?? null;
  return {
    id: m.id,
    nom: m.nom,
    niveau: m.niv,
    rang: m.rang ?? "inconnu",
    pointsDeVie: m.pvEff ?? m.pv,
    vies: m.vies,
    defense: m.def,
    resistanceMagique: m.resMag,
    esquive: m.esq,
    resistances,
    element: m.elem,
    delaiMs: m.delai ?? null,
  };
}

/** Cherche une cible par son nom, sans se soucier des accents ni de la casse. */
export function cibleParNom(nom: string): Cible | null {
  const k = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const vise = k(nom);
  for (const m of monstres().values()) if (k(m.nom ?? "") === vise) return cible(m.id);
  return null;
}

/** Une arme depuis le relevé des objets. `upgrade` est recopié, jamais compté. */
export function armeEquipee(cleObjet: string, o: { upgrade?: number; element?: Element | null; paliersElement?: number } = {}): ArmeEquipee | null {
  const x = objets().get(cleObjet);
  if (!x || x.t1 !== "WEAPON") return null;
  return {
    cle: x.cle,
    nom: x.n ?? x.cle,
    categorie: x.t2,
    typeArme: x.wt ?? "",
    degatsMin: x.dn ?? 0,
    degatsMax: x.dx ?? 0,
    vitesse: x.va ?? 0,
    upgrade: o.upgrade ?? 0,
    element: o.element ?? null,
    paliersElement: o.paliersElement ?? 0,
  };
}

/** Les bonus `DST_*` que porte un objet, sous la forme attendue par `Combattant`. */
export function bonusDObjet(cleObjet: string): Record<string, number> {
  const x = objets().get(cleObjet);
  const out: Record<string, number> = {};
  for (const [code, v] of x?.b ?? []) out[code] = (out[code] ?? 0) + v;
  return out;
}

// ── Les consommables et le buff de guilde ──────────────────────────────────

export type Consommable = {
  cle: string;
  nom: string;
  /** POTION, SCROLL ou EXCEPTION — la sous-famille du client. */
  famille: string;
  bonus: Record<string, number>;
};

/**
 * LES CONSOMMABLES QUI CHANGENT UN DÉGÂT.
 *
 * Le relevé porte 766 lignes `CONSUME`, toutes avec au moins un bonus. La très
 * grande majorité rend des PV ou des PM et ne pèse pas sur un coup ; on ne
 * retient donc que celles qui portent un des codes dont le moteur se sert.
 *
 * `dureeMs` N'EST PAS DANS LE RELEVÉ. La durée d'un parchemin vit dans
 * `dwCircleTime`/`dwSkillTime` de `propItem`, colonnes que l'extraction n'a pas
 * gardées. Un consommable est donc présenté comme un terme actif ou non, jamais
 * avec un compte à rebours.
 */
export function consommablesOffensifs(codesUtiles: readonly string[]): Consommable[] {
  const utiles = new Set(codesUtiles);
  const out: Consommable[] = [];
  for (const x of objets().values()) {
    if (x.t1 !== "CONSUME" || !x.b) continue;
    const bonus: Record<string, number> = {};
    let garde = false;
    for (const [code, v] of x.b) {
      bonus[code] = (bonus[code] ?? 0) + v;
      if (utiles.has(code)) garde = true;
    }
    if (garde) out.push({ cle: x.cle, nom: x.n ?? x.cle, famille: x.t2.replace(/^CONSUME_/, ""), bonus });
  }
  return out;
}

/**
 * LES BUFFS DE GUILDE, et pourquoi ils demandent deux fichiers.
 *
 * `guildbuff.csv` (FSDATA/COMMON/Systems/data.air) ne donne que la liste, le camp
 * (PVE / PVP / SERVER) et le prix. CE QU'ILS FONT est ailleurs : chaque ligne est
 * une clé `II_*` du relevé d'objets. Les clés sont donc recopiées ici — c'est la
 * seule chose du CSV qui ne se déduit pas — et l'effet est lu dans
 * `objets-stats.json`.
 *
 * ONZE LIGNES, ET DEUX FAMILLES QU'IL FAUT LES DEUX. Sept portent le camp PVE ou
 * PVP : ce sont les parchemins qu'une guilde achète. Les quatre dernières portent
 * SERVER : ce sont des distinctions gagnées, deux à la Guerre de Siège et deux aux
 * Chambres Secrètes. On avait d'abord gardé les sept premières seulement, en
 * croyant les quatre autres hors sujet. ELLES NE LE SONT PAS : « Participation aux
 * Chambres Secrètes » porte DST_MONSTER_DMG 5 et « Vainqueur des Chambres
 * Secrètes » DST_MONSTER_DMG 10. Les écarter retirait dix pour cent de dégâts à
 * un joueur de Vanguard qui vient de gagner sa semaine.
 *
 * QUATRE DES ONZE pèsent donc sur un dégât : « Enchantement de Shade » (+10 %
 * monstres, +10 % boss), « Ego de Shade » (+5 JcJ), et les deux Chambres
 * Secrètes. Les sept autres portent des PV, de la vitesse de déplacement, du
 * blocage, du butin, de l'expérience ou des penyas — le module ne remonte que
 * les codes de `CODES_OFFENSIFS`, donc ces lignes n'affichent rien.
 */
const CLES_BUFF_GUILDE = [
  "II_SYS_SCR_GUILD_PVE_BUFF01",
  "II_SYS_SCR_GUILD_PVP_BUFF01",
  "II_SYS_SCR_GUILD_PVE_BUFF02",
  "II_SYS_SCR_GUILD_PVP_BUFF02",
  "II_SYS_SCR_GUILD_PVE_BUFF03",
  "II_SYS_SCR_GUILD_PVP_BUFF03",
  "II_SYS_SCR_GUILD_PVE_BUFF04",
  "II_SYS_SYS_LS_WINNERDIGNITY",
  "II_SYS_SYS_LS_SPLENDIDGLORY",
  "II_SYS_SYS_LS_WINNERDIGNITY1",
  "II_SYS_SYS_LS_SPLENDIDGLORY1",
] as const;

export function buffsDeGuilde(codesUtiles: readonly string[]): Consommable[] {
  const utiles = new Set(codesUtiles);
  const out: Consommable[] = [];
  for (const cle of CLES_BUFF_GUILDE) {
    const x = objets().get(cle);
    if (!x?.b) continue;
    const bonus: Record<string, number> = {};
    let garde = false;
    for (const [code, v] of x.b) {
      bonus[code] = (bonus[code] ?? 0) + v;
      if (utiles.has(code)) garde = true;
    }
    if (garde) out.push({ cle, nom: x.n ?? cle, famille: "GUILDE", bonus });
  }
  return out;
}

/** Le compte des relevés chargés, pour qu'un écran puisse citer ses sources. */
export function inventaire() {
  return {
    competences: competences().size,
    objets: objets().size,
    monstres: monstres().size,
    classes: facteursDeClasse().size,
  };
}
