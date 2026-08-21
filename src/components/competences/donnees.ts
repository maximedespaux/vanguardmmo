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
//  Deux ajouts d'août 2026, faits sur le client de ce mois-là : le numéro de
//  case d'icône de chaque compétence (bloc `planche`, voir
//  `scripts/extraire-icones-competences.mjs`), et la vérification que les 99
//  tables de dégâts qui varient d'un rang à l'autre y sont au chiffre près
//  identiques — le relevé de 2025 décrit donc toujours le jeu de 2026.
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

/**
 * LA PLANCHE D'ICÔNES — une image, une case par dessin.
 *
 * Les 197 compétences de classe et les 17 compétences hors classe qui en ont une
 * pointent sur un jeu plus petit de dessins : onze compétences de Magicien
 * partagent la même icône, et c'est le client qui le dit, pas nous. Ils sont
 * assemblés en une seule image par `scripts/extraire-icones-competences.mjs`,
 * et une compétence ne porte que le NUMÉRO de sa case. La grille est décrite
 * ici, jamais recopiée dans une feuille de style : le jour où le client ajoute
 * une compétence, la planche change de forme et la page suit.
 */
export type Planche = {
  fichier: string;
  /** Le côté d'une case, en pixels. C'est la taille NATIVE des icônes du jeu. */
  taille: number;
  colonnes: number;
  lignes: number;
  cases: number;
  source: string;
};

/**
 * LES RANGS QUI NE CHANGENT RIEN.
 *
 * Certaines compétences ont des rangs dont AUCUNE colonne du client ne diffère
 * du rang précédent — mêmes dégâts, mêmes PF, même durée, mêmes effets, même
 * coût. Le jeu les fait payer plein tarif : c'est le renseignement qui évite
 * une dépense, donc il est affiché.
 *
 * LA LISTE VIENT DU CLIENT, PAS DU RELEVÉ, et ça n'est pas un raffinement : le
 * relevé ne garde que les colonnes qui varient, et une colonne qu'il a laissée
 * de côté suffit à retourner le conseil. `scripts/rangs-muets-competences.mjs`
 * relit donc `propSkillAdd.csv` rang par rang et pose la liste dans le relevé ;
 * la route ne fait plus qu'y appliquer la table de coût. Combien de compétences
 * sont concernées ne s'écrit nulle part : ça se compte sur `nbRangsMuets`,
 * comme tous les autres chiffres de cette page.
 */
export type RangsMuets = {
  /** Les rangs concernés, à partir du 2 — le rang 1 n'a pas de précédent. */
  rangs: number[];
  /** Ce que coûtent CES rangs-là, en points de compétence. */
  cout: number;
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
  /** Ce qu'elle fait, dans les mots du jeu. Il est dans l'index et plus
   *  seulement dans la fiche : sans lui, une ligne fermée ne disait que des
   *  chiffres, et il fallait ouvrir 197 fiches pour savoir de quoi on parle. */
  desc: string | null;
  /** Le numéro de case sur la planche. `null` si le client n'en donne pas. */
  icone: number | null;
  /** Ce qu'il faut avoir monté avant, et à quel rang. Vide = rien.
   *  Dans l'INDEX et plus seulement dans la fiche : l'arbre des compétences se
   *  dessine sur ces arêtes, et il ne peut pas demander 197 fiches pour les
   *  connaître. Le surcoût est de six kilo-octets. */
  prerequis: Lien[];
  /** Combien de ses rangs ne changent aucune valeur. 0 = aucun. */
  nbRangsMuets: number;
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
  /** Le numéro de case sur la planche d'icônes. */
  icone: number | null;
  /** Les rangs qui ne changent aucune valeur, et ce qu'ils coûtent. */
  rangsMuets: RangsMuets;
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
  /** D'où sort ce relevé, phrase comprise — « Client Airborn (octobre 2025),
   *  archives .air déchiffrées ». Elle voyage AVEC les données au lieu d'être
   *  retapée à l'écran : la page l'annonçait en dur, et une refouille l'aurait
   *  rendue fausse en silence. `null` si le relevé ne la porte pas. */
  source: string | null;
  /** La planche d'icônes, et sa grille. `null` si elle n'a jamais été générée. */
  planche: Planche | null;
  /** Points à dépenser pour passer AU niveau n. Cumuler pour un budget. */
  xpCompetence: { niveau: number; xp: number }[];
  horsClasse: HorsClasse;
  /** Les lignes que le client liste DEUX fois, écartées du catalogue. Elles
   *  restent ici pour que la page puisse expliquer l'écart avec les 202 lignes
   *  du fichier, au lieu d'annoncer 197 sans justifier. */
  doublons: { id: string; nom: string; classe: string }[];
};

/**
 * Les compétences hors arbre de classe.
 *
 * `icone` est le numéro de case sur la même planche que les 197 autres. Il vaut
 * `null` pour les trois compétences de COUPLE, et ce n'est pas un oubli : le
 * client attache leurs dessins à des objets de buff libellés « Puissance
 * d'attaque +2 % », jamais au nom de la compétence. Les relier demanderait de
 * deviner (voir `scripts/extraire-icones-competences.mjs`).
 */
export type HorsClasse = {
  souverain: { nom: string; type: string; description: string; cible: string; rechargeS: number | null; porteeMax: number | null; permanente: boolean; icone: number | null }[];
  groupe: { nom: string; description: string; actif: boolean; niveauGroupe: number | null; coutPoints: number | null; icone: number | null }[];
  couple: { nom: string; niveaux: { niveau: number; niveauCouple: number; effets: string }[]; icone: number | null }[];
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
