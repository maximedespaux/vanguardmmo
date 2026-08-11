// ════════════════════════════════════════════════════════════
//  COMPARATIF DE BUILD — écart entre le build de référence d'un poste
//  et le build d'un membre inscrit à ce poste.
//
//  Pourquoi un rapport et pas un calcul de dégâts : la formule de dégâts
//  d'AirFlyff n'est nulle part (ni dans les fichiers du client, ni côté site —
//  src/lib/stats.ts est un essai abandonné dont les constantes sont marquées
//  « à confirmer »). Mais on n'en a pas besoin : la question n'est pas « combien
//  ce personnage tape » mais « à quelle distance est-il de la cible ». Un rapport
//  entre deux valeurs se calcule sans connaître la fonction qui les transforme
//  en dégâts.
//
//  Pourquoi on lit `stats` et pas les colonnes hp/attack/defense de GearProfile :
//  leur remplissage dans /api/characters/sync est explicitement « best-effort »
//  (`hp: n("PV max %") || n("PV max")`), donc une même colonne contient un
//  pourcentage chez l'un et une valeur absolue chez l'autre — et `defense` y
//  stocke en réalité l'Endurance. Comparer des rapports là-dessus ne voudrait
//  rien dire. `stats` vient du moteur du builder, mêmes clés pour tout le monde.
// ════════════════════════════════════════════════════════════

export type SpecType = "PVE" | "PVP_BOSS" | "CHAMBRES_SECRETES";
export type Stats = Record<string, number>;

/** Un axe de comparaison = une clé de statistique du builder + son poids. */
type Axe = { cle: string; poids: number };

// Les poids traduisent ce que la spé demande vraiment. Ils sont ici, en clair et
// en un seul endroit, parce qu'ils sont un CHOIX de la guilde et non une donnée :
// ils se règlent à l'usage. Ne pas les recopier ailleurs.
export const AXES: Record<SpecType, Axe[]> = {
  PVE: [
    { cle: "Attaque %", poids: 30 },
    { cle: "Taux critique", poids: 20 },
    { cle: "Dégâts critiques", poids: 20 },
    { cle: "PV max %", poids: 15 },
    { cle: "Endurance", poids: 10 },
    { cle: "Réduction de dégâts", poids: 5 },
  ],
  PVP_BOSS: [
    { cle: "Attaque %", poids: 25 },
    { cle: "PV max %", poids: 20 },
    { cle: "Taux critique", poids: 15 },
    { cle: "Dégâts critiques", poids: 15 },
    { cle: "Endurance", poids: 15 },
    { cle: "Réduction de dégâts", poids: 10 },
  ],
  CHAMBRES_SECRETES: [
    { cle: "PV max %", poids: 25 },
    { cle: "Attaque %", poids: 20 },
    { cle: "Endurance", poids: 20 },
    { cle: "Taux critique", poids: 15 },
    { cle: "Réduction de dégâts", poids: 10 },
    { cle: "Dégâts critiques", poids: 10 },
  ],
};

/** Emplacements attendus d'un build complet, pour mesurer la complétude. */
export const EMPLACEMENTS = [
  "weapon", "helmet", "suit", "gauntlet", "boots",
  "ring1", "ring2", "earring1", "earring2", "necklace",
  "cape", "masque", "mantra",
] as const;

export type EcartAxe = {
  cle: string;
  poids: number;
  perso: number;
  reference: number;
  /** rapport plafonné à 1 : 0,82 = il manque 18 % de la cible */
  rapport: number;
  /** ce qui manque en valeur brute pour atteindre la référence */
  manque: number;
};

export type Comparatif = {
  /** 0 à 100 : moyenne pondérée des rapports, sur les seuls axes que la référence définit */
  score: number;
  axes: EcartAxe[];
  /** part du poids total réellement mesurée : une référence incomplète donne un score partiel */
  couverture: number;
  /** axes que la référence ne renseigne pas — donc non mesurés, et pas comptés comme un échec */
  nonMesures: string[];
};

const nombre = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Compare deux jeux de statistiques sur les axes d'une spé.
 *
 * Deux garde-fous qui évitent un score menteur :
 *  - chaque axe est plafonné à 1 (et non seulement le total) : sinon une attaque
 *    au double de la cible compenserait une défense à zéro, et un personnage en
 *    papier passerait pour optimisé ;
 *  - on ne pondère que sur les axes que la RÉFÉRENCE renseigne. Un axe absent de
 *    la référence n'est pas un manque du membre : il n'est pas mesuré, et
 *    `couverture` le dit.
 */
export function comparer(reference: Stats, perso: Stats, spec: SpecType): Comparatif {
  const axes: EcartAxe[] = [];
  const nonMesures: string[] = [];
  let poidsUtile = 0, cumul = 0;

  for (const { cle, poids } of AXES[spec]) {
    const ref = nombre(reference[cle]);
    if (ref <= 0) { nonMesures.push(cle); continue; }
    const val = nombre(perso[cle]);
    const rapport = Math.max(0, Math.min(1, val / ref));
    poidsUtile += poids;
    cumul += rapport * poids;
    axes.push({ cle, poids, perso: val, reference: ref, rapport, manque: Math.max(0, ref - val) });
  }

  const poidsTotal = AXES[spec].reduce((s, a) => s + a.poids, 0);
  return {
    score: poidsUtile ? Math.round((cumul / poidsUtile) * 100) : 0,
    axes: axes.sort((a, b) => a.rapport - b.rapport), // le plus en retard d'abord
    couverture: poidsTotal ? Math.round((poidsUtile / poidsTotal) * 100) : 0,
    nonMesures,
  };
}

/**
 * Complétude d'un build : emplacements remplis sur emplacements attendus.
 * Mesure SÉPARÉE du score, et non fondue dedans : un build à qui il manque les
 * bottes et le collier peut afficher de bons rapports si le reste est excellent.
 */
export function completude(equipe: Record<string, unknown> | null | undefined): { remplis: number; attendus: number; pct: number; manquants: string[] } {
  const eq = equipe ?? {};
  const manquants = EMPLACEMENTS.filter((s) => !eq[s]);
  const remplis = EMPLACEMENTS.length - manquants.length;
  return { remplis, attendus: EMPLACEMENTS.length, pct: Math.round((remplis / EMPLACEMENTS.length) * 100), manquants: [...manquants] };
}

/** Les trois écarts les plus rentables à combler, du point de vue du membre. */
export function progression(c: Comparatif, max = 3): EcartAxe[] {
  // « Rentable » = le plus gros manque pondéré, pas le plus gros manque brut :
  // 200 points d'Endurance à 10 % de poids pèsent moins que 20 % d'attaque à 30 %.
  return [...c.axes]
    .filter((a) => a.rapport < 1)
    .sort((a, b) => (1 - b.rapport) * b.poids - (1 - a.rapport) * a.poids)
    .slice(0, max);
}

// ─── Lecture des blobs du builder ───────────────────────────
// Le moteur du builder stocke, par personnage, une liste de « stuffs » qui
// portent chacun leur équipement et leurs statistiques calculées. Même forme
// pour un membre (User.builderBlob, GearProfile) et pour une référence de poste
// (CompositionRefBuild.blob) : c'est le même moteur qui les écrit.

type Stuff = { name?: string; stats?: Stats; eq?: Record<string, unknown>; equipped?: Record<string, unknown> };
type Perso = { name?: string; cls?: string; stuffs?: Stuff[] };
// `chars` est l'état brut du moteur : il ne porte que l'équipement, les totaux étant
// recalculés à chaque affichage. `calcule` est le même contenu passé par
// vgCollectBuilds(), donc AVEC les statistiques — c'est lui qu'on lit en priorité.
type Blob = { chars?: Perso[]; calcule?: Perso[] };

/** DPS / TANK / HYBRIDE déduit du nom du stuff — même règle que /api/characters/sync. */
export function modeDuStuff(nom: string | undefined): "DPS" | "TANK" | "HYBRIDE" {
  const u = (nom || "").toUpperCase();
  return u.includes("TANK") ? "TANK" : u.includes("HYBRID") ? "HYBRIDE" : "DPS";
}

/** Les stuffs d'un blob, indexés par mode. Si deux stuffs partagent un mode, le premier gagne. */
export function stuffsParMode(blob: Blob | null | undefined): Partial<Record<"DPS" | "TANK" | "HYBRIDE", Stuff>> {
  const out: Partial<Record<"DPS" | "TANK" | "HYBRIDE", Stuff>> = {};
  for (const s of blob?.calcule?.[0]?.stuffs ?? blob?.chars?.[0]?.stuffs ?? []) {
    const m = modeDuStuff(s?.name);
    if (!out[m] && s) out[m] = s;
  }
  return out;
}

export const equipementDuStuff = (s: Stuff | undefined) => s?.equipped ?? s?.eq ?? null;
export const statsDuStuff = (s: Stuff | undefined): Stats => s?.stats ?? {};

/** Un stuff sans statistiques n'est pas comparable : la référence doit avoir été
 *  ouverte une fois dans le builder pour que le moteur les calcule. */
export const aDesStats = (s: Stuff | undefined) => Object.keys(statsDuStuff(s)).length > 0;
