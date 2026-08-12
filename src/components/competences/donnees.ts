// ════════════════════════════════════════════════════════════════════════
//  LES COMPÉTENCES — types partagés et mise en français des chiffres
//
//  Ce module est lu des DEUX côtés : par la route `/api/competences` (côté
//  serveur, pour composer les résumés) et par la page (côté navigateur, pour
//  remplir les tableaux). D'où l'absence de « use client » et de tout import
//  React ici — un seul endroit décide comment on écrit « +15 % » ou « 30 min »,
//  sinon la même valeur s'affiche de deux façons selon la colonne.
//
//  La source est `public/wiki/competences.json` (200 Ko), réduite depuis la
//  fouille du client d'octobre 2025 : seuls les champs affichés ici y sont.
// ════════════════════════════════════════════════════════════════════════

/** Les six marches où une compétence s'apprend. Mêmes noms que sur /classes. */
export type Palier = "vagabond" | "metier1" | "metier2" | "maitre" | "heros" | "legendaire";

export const PALIERS: { cle: Palier; nom: string; couleur: string }[] = [
  { cle: "vagabond", nom: "Vagabond", couleur: "var(--text-muted)" },
  { cle: "metier1", nom: "Métier 1", couleur: "var(--blue)" },
  { cle: "metier2", nom: "Métier 2", couleur: "var(--green)" },
  { cle: "maitre", nom: "Maître", couleur: "var(--gold)" },
  { cle: "heros", nom: "Héros", couleur: "var(--orange)" },
  { cle: "legendaire", nom: "Légendaire", couleur: "var(--purple)" },
];

export const nomPalier = (p: Palier) => PALIERS.find((x) => x.cle === p)?.nom ?? p;
export const couleurPalier = (p: Palier) => PALIERS.find((x) => x.cle === p)?.couleur ?? "var(--text-muted)";

/** Un effet de buff : soit un chiffre sur une statistique, soit un état infligé. */
export type Effet = {
  stat: string;
  valeur?: number | null;
  etat?: string;
  /** Intensité de l'état (dégâts par tick d'un saignement, par exemple). */
  intensite?: number;
  /** Chance d'appliquer l'état, en pourcent. */
  chance?: number;
};

/** Une ligne du tableau de progression, tous champs déjà aplatis par la route. */
export type Niveau = {
  niveau: number;
  dmin?: number | null;
  dmax?: number | null;
  pm?: number | null;
  pf?: number | null;
  /** Temps d'incantation, en millisecondes. */
  inc?: number | null;
  /** Durée de l'effet, en millisecondes. */
  duree?: number | null;
  recharge?: number | null;
  portee?: number | null;
  coups?: number | null;
  proba?: number | null;
  provoc?: number | null;
  dureeDouleur?: number | null;
  vitAtq?: number | null;
  effets?: Effet[];
};

/** L'entrée de catalogue : ce qu'il faut pour lister, filtrer et reconnaître. */
export type Entree = {
  id: string;
  nom: string;
  palier: Palier;
  classe: string;
  famille: string | null;
  nivPerso: number;
  nivMax: number;
  type: string | null;
  arme: string | null;
  /** Ce que la compétence fait, en une ligne. Composé par la route. */
  resume: string | null;
  /** Vrai si un prérequis conditionne son apprentissage. */
  aPrerequis: boolean;
};

export type Lien = { id: string; nom: string; niveau: number };

/** La fiche complète d'une compétence. */
export type Fiche = {
  id: string;
  nom: string;
  desc: string | null;
  palier: Palier;
  classe: string;
  famille: string | null;
  nivPerso: number;
  nivMax: number;
  type: string | null;
  zone: string | null;
  porteeTexte: string | null;
  arme: string | null;
  mains: string | null;
  stat: string | null;
  coef: number | null;
  /** Ce qui ne change PAS d'un niveau à l'autre : affiché une fois, en en-tête,
   *  au lieu d'être répété sur vingt lignes identiques du tableau. */
  constant: Omit<Niveau, "niveau">;
  /** Les colonnes qui, elles, varient. Le tableau n'affiche que celles-là. */
  colonnes: (keyof Omit<Niveau, "niveau">)[];
  niveaux: Niveau[];
  prerequis: Lien[];
  /** Ce que monter cette compétence ouvre. Le sens que le client ne donne pas. */
  debloque: Lien[];
};

export type Lignee = {
  cle: string;
  jobCode: string;
  chaine: string[];
  nbCompetences: number;
  coutPoints: number;
  sommeNiveauxMax: number;
  competences: string[];
};

export type Catalogue = {
  entrees: Entree[];
  lignees: Lignee[];
  /** Points à dépenser pour passer AU niveau n. Cumuler pour un budget. */
  xpCompetence: { niveau: number; xp: number }[];
  horsClasse: HorsClasse;
  /** Les lignes que le client liste DEUX fois, écartées du catalogue. Elles
   *  restent ici pour que la page puisse expliquer l'écart avec les 202 lignes
   *  du fichier, au lieu d'annoncer 197 sans justifier. */
  doublons: { id: string; nom: string; classe: string }[];
};

export type HorsClasse = {
  souverain: { nom: string; type: string; description: string; cible: string; rechargeS: number | null; porteeMax: number | null; permanente: boolean }[];
  groupe: { nom: string; description: string; actif: boolean; niveauGroupe: number | null; coutPoints: number | null }[];
  couple: { nom: string; niveaux: { niveau: number; niveauCouple: number; effets: string }[] }[];
  bonusGroupe: { niveauGroupe: number; bonus: number }[];
};

/**
 * Le compte des compétences hors arbre. Il vit ici parce qu'il est affiché DEUX
 * fois — la pastille du rail et la phrase d'ouverture de la section — et que
 * deux additions écrites séparément finissent par ne plus dire la même chose.
 */
export const nbHorsClasse = (h: HorsClasse) => h.groupe.length + h.souverain.length + h.couple.length;

// ── Le nom des classes ────────────────────────────────────────────────────

/**
 * Les libelles perimes du client, remis au nom que le jeu emploie.
 *
 * « Assistant » n'existe nulle part en jeu : la classe s'appelle ACOLYTE — les
 * textes de personnage l'ecrivent 20 fois, les quetes 36 fois. Seul
 * `propJob.inc`, d'ou sortent les noms de classe du releve, a garde l'ancien
 * libelle. La correction se fait ici, en un seul endroit, parce que ce nom
 * s'affiche dans le catalogue, dans les fiches et dans les chaines de promotion.
 */
const CLASSE_PERIMEE: Record<string, string> = { Assistant: "Acolyte" };

/** Le nom d'une classe tel qu'on l'ecrit a l'ecran. */
export const classeAffichee = (nom: string) => CLASSE_PERIMEE[nom] ?? nom;

// ── Mise en français des chiffres ─────────────────────────────────────────

export const fmt = (n: number) => n.toLocaleString("fr-FR");

/** Les millisecondes du client, dans l'unité où on en parle réellement. */
export function ms(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "instantané";
  if (v < 1000) return `${v} ms`;
  const s = v / 1000;
  if (s < 60) return `${Number.isInteger(s) ? s : s.toFixed(1).replace(".", ",")} s`;
  const m = s / 60;
  return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")} min`;
}

/**
 * Un effet, écrit comme on le lirait à voix haute.
 *
 * Le piège : le libellé de la statistique porte DÉJÀ le pourcentage
 * (« Attaque % »). Recoller l'unité derrière la valeur donnait « Attaque % +15 % ».
 * On retire donc le signe du libellé pour le remettre après le chiffre — et le
 * signe moins compte : plusieurs compétences RETIRENT de la vitesse (−50).
 */
export function effetTexte(e: Effet): string {
  if (e.etat) {
    const bouts = [e.etat];
    if (e.chance != null) bouts.push(`${e.chance} % de chances`);
    if (e.intensite != null) bouts.push(`intensité ${e.intensite}`);
    return bouts.join(" · ");
  }
  const pourcent = e.stat.trim().endsWith("%");
  const libelle = pourcent ? e.stat.trim().slice(0, -1).trim() : e.stat;
  if (e.valeur == null) return libelle;
  const signe = e.valeur < 0 ? "−" : "+";
  return `${libelle} ${signe}${fmt(Math.abs(e.valeur))}${pourcent ? " %" : ""}`;
}

/**
 * Le mur : 9 999 999 PM n'est pas un réglage, c'est la façon dont le client rend
 * un niveau injouable. On le nomme partout pareil plutôt que d'afficher
 * « 9 999 999 » et de laisser chacun deviner.
 */
export const PM_MUR = 9999999;

/** Le coût cumulé pour amener une compétence du niveau 1 au niveau visé. */
export function coutCumule(table: { niveau: number; xp: number }[], vise: number): number {
  return table.filter((x) => x.niveau <= vise).reduce((s, x) => s + x.xp, 0);
}
