// ════════════════════════════════════════════════════════════════════════
//  CE QUE LA PAGE LIT D'UNE LIGNÉE — la structure d'un côté, les chiffres
//  de l'autre.
//
//  La chaîne de promotion (les noms, les emblèmes, l'ordre des paliers) est un
//  fait stable : elle vit dans `src/app/(public)/classes/donnees.ts`, un
//  instantané du client. Les CHIFFRES d'un palier — combien de compétences, ce
//  que ça coûte de tout monter, à quel niveau ça s'ouvre — se recalculent ici
//  depuis le relevé servi par `/api/competences`, qui est dédoublonné.
//
//  Pourquoi cette séparation : l'instantané avait été généré AVANT le
//  dédoublonnage et annonçait 21 compétences d'Acrobate au lieu de 16, donc
//  1 284 748 points pour la Sylphide et l'Arbalétrier au lieu de 988 398. Les
//  deux pages, fusionnées, affichaient les deux chiffres à trois sections
//  d'écart. L'instantané est corrigé, mais on ne s'y fie plus : il ne sert que
//  de repli quand la route ne répond pas.
// ════════════════════════════════════════════════════════════════════════

import type { IconName } from "@/components/Icon";
import { classeAffichee, coutCumule, type Catalogue, type Entree, type Palier } from "@/components/competences/donnees";
import { LIGNEES, type Etape, type Lignee } from "@/app/(public)/classes/donnees";

/** Les six marches, nommées comme le jeu les nomme. La couleur monte avec le
 *  palier : c'est le seul repère qui permette de lire une lignée d'un coup d'œil. */
export const PALIERS: Record<Palier, { nom: string; couleur: string; icon: IconName }> = {
  vagabond:   { nom: "Départ",     couleur: "var(--text-muted)", icon: "user" },
  metier1:    { nom: "Métier 1",   couleur: "var(--blue)",       icon: "sword" },
  metier2:    { nom: "Métier 2",   couleur: "var(--green)",      icon: "swords" },
  maitre:     { nom: "Maître",     couleur: "var(--gold)",       icon: "medal" },
  heros:      { nom: "Héros",      couleur: "var(--orange)",     icon: "trophy" },
  legendaire: { nom: "Légendaire", couleur: "var(--purple)",     icon: "crown" },
};

/** L'ordre des paliers, une seule fois, pour les parcours en colonnes. */
export const ORDRE_PALIERS: Palier[] = ["vagabond", "metier1", "metier2", "maitre", "heros", "legendaire"];

export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Une seule règle pour toutes les durées de la page. Sinon on affichait
 *  « dure 1 min » à côté de « recharge 120 s » sur la même ligne, pour deux
 *  valeurs du même ordre — impossible à comparer d'un coup d'œil. */
export const duree = (s: number) => (s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);

/** L'emblème officiel d'un nom de classe, pris dans la chaîne de promotion.
 *  Les 37 noms rencontrés y sont — Vagabond, les quatre Métier 1, les huit
 *  Métier 2 avec leurs deux promotions, les huit légendaires. */
const EMBLEMES = new Map<string, string>();
for (const l of LIGNEES) for (const e of l.etapes) EMBLEMES.set(norm(e.nom), e.embleme);
export const emblemeDe = (nomClasse: string) => EMBLEMES.get(norm(classeAffichee(nomClasse))) ?? null;

/** Les noms de classe DISTINCTS, palier par palier : 1 · 4 · 8 · 8 · 8 · 8.
 *  Compté et pas écrit à la main — c'est ce compte qui dit que le jeu a
 *  vingt-et-un noms de classe et non trente-sept. */
export const NOMS_PAR_PALIER = ORDRE_PALIERS.map((p) => {
  const noms = new Set<string>();
  for (const l of LIGNEES) for (const e of l.etapes) if (e.palier === p) noms.add(e.nom);
  return { palier: p, noms: [...noms] };
});

/** Les paliers qui portent un nom de classe neuf. Maître et Héros n'en portent
 *  pas : « Chevalier Maître » est le Chevalier promu, le client le dit. */
export const PALIERS_NOMMANTS: Palier[] = ["vagabond", "metier1", "metier2", "legendaire"];
export const NB_NOMS_DE_CLASSE = new Set(
  NOMS_PAR_PALIER.filter((x) => PALIERS_NOMMANTS.includes(x.palier)).flatMap((x) => x.noms),
).size;

/**
 * Un palier introduit-il des noms de classe NEUFS ?
 *
 * ┌──── LA CONTRADICTION QUE CETTE FONCTION FERME ────┐
 * │ La bande « Les paliers » affichait six tuiles avec │
 * │ leur compte : ×1 ×4 ×8 ×8 ×8 ×8. Somme : 37. Et    │
 * │ son propre titre annonçait « 21 noms de classe »,  │
 * │ juste au-dessus. Deux chiffres du même écran qui   │
 * │ ne s'additionnent pas au même total — le lecteur   │
 * │ n'a aucun moyen de savoir lequel croire.           │
 * │ Les deux étaient pourtant justes : 37 est le nombre│
 * │ d'ÉTAPES rencontrées, 21 celui des NOMS. Ce qui    │
 * │ manquait, c'est que les deux paliers de promotion  │
 * │ ne comptent pas — « Chevalier Maître » n'est pas   │
 * │ une classe de plus, c'est le Chevalier promu, et le│
 * │ client l'écrit dans son champ `promuDe`.           │
 * │ Désormais la bande n'affiche un ×N que sur les     │
 * │ paliers nommants, et 1+4+8+8 fait bien 21.         │
 * └──────────────────────────────────────────────────┘
 */
export const palierNomme = (p: Palier) => PALIERS_NOMMANTS.includes(p);

/** Le plafond de compétence d'un palier, tel que les lignées l'annoncent. */
export const PLAFOND_PALIER = new Map<Palier, number[]>(
  ORDRE_PALIERS.map((p) => {
    const caps = new Set<number>();
    for (const l of LIGNEES) for (const e of l.etapes) if (e.palier === p) caps.add(e.niveauMaxCompetence);
    return [p, [...caps].sort((a, b) => a - b)];
  }),
);

// ── Les chiffres d'une lignée ─────────────────────────────────────────────

export type EtapeVue = Etape & {
  /** Compétences du palier, dédoublonnées. */
  nb: number;
  /** Points pour monter les {nb} compétences au plafond. */
  points: number;
  plafond: number;
  requis: number | null;
};

export type LigneeVue = {
  lignee: Lignee;
  etapes: EtapeVue[];
  nb: number;
  points: number;
  /** Vrai quand les chiffres viennent du relevé, faux quand c'est le repli. */
  releve: boolean;
};

/** Les 197 entrées rangées par nom de classe affiché. Une seule fois par
 *  chargement : la vue d'une lignée s'y sert huit fois. */
export function indexParClasse(entrees: Entree[]): Map<string, Entree[]> {
  const m = new Map<string, Entree[]>();
  for (const e of entrees) {
    const k = norm(classeAffichee(e.classe));
    const l = m.get(k);
    if (l) l.push(e); else m.set(k, [e]);
  }
  return m;
}

/**
 * Ce qu'on affiche pour une lignée. `cat` absent — la route n'a pas répondu —
 * on retombe sur l'instantané, en le disant (`releve: false`).
 */
export function vueLignee(l: Lignee, cat: Catalogue | null, index: Map<string, Entree[]> | null): LigneeVue {
  if (!cat || !index) {
    return {
      lignee: l, releve: false, nb: l.nbCompetences, points: l.coutPoints,
      etapes: l.etapes.map((e) => ({ ...e, nb: e.nbCompetences, points: e.coutPoints, plafond: e.niveauMaxCompetence, requis: e.niveauRequis })),
    };
  }
  const etapes = l.etapes.map((e) => {
    const items = index.get(norm(e.nom)) ?? [];
    const requis = Math.max(1, ...items.map((x) => x.nivPerso));
    return {
      ...e,
      nb: items.length,
      points: items.reduce((s, x) => s + coutCumule(cat.xpCompetence, x.nivMax), 0),
      plafond: items.length ? Math.max(...items.map((x) => x.nivMax)) : e.niveauMaxCompetence,
      requis: requis > 1 ? requis : null,
    };
  });
  return {
    lignee: l, releve: true, etapes,
    nb: etapes.reduce((s, e) => s + e.nb, 0),
    points: etapes.reduce((s, e) => s + e.points, 0),
  };
}
