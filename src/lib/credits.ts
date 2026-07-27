import { prisma } from "@/lib/prisma";

/**
 * Les crédits d'entraide.
 *
 * Le système de dettes est parti parce qu'il était lourd : des montants, des
 * échéances, des relances, un verrou qui bloquait tout. Ce qu'il essayait
 * vraiment de tenir, c'est une chose simple — que ça n'aille pas dans un seul
 * sens. C'est ce que font les crédits : aider en donne, demander en coûte, et
 * le solde dit d'un chiffre si l'on rend ce qu'on prend.
 *
 * Trois principes, qui décident de tout le reste :
 *
 * 1. On ne gagne QUE sur du constaté. Mêmes sources que l'XP, mêmes garde-fous :
 *    une quête close par celui qui a reçu, une présence confirmée par le staff,
 *    un dépôt vu par la sauvegarde du coffre. Sinon on paierait l'annonce.
 *
 * 2. Un solde vide NE BLOQUE PAS. La demande part quand même, marquée « à
 *    découvert », et le staff tranche. Un blocage dur recréerait exactement ce
 *    qu'on vient de retirer — et le nouveau membre, qui n'a encore rien pu
 *    donner, serait le premier puni.
 *
 * 3. Les chiffres sont petits et ronds. Un barème qu'on ne peut pas réciter de
 *    tête n'est pas un barème, c'est une boîte noire.
 */

/**
 * Le taux de change : 1 crédit ≈ 1 000 périns.
 *
 * Il ne sert qu'à donner un ORDRE DE GRANDEUR au coût d'une demande — le prix
 * des objets vient déjà des paliers du coffre. Sans lui, « ça coûte 3 crédits »
 * ne veut rien dire ; avec, chacun peut estimer avant de demander.
 */
export const PERINS_PAR_CREDIT = 1000;

/**
 * Dotation hebdomadaire, par rôle. C'est l'amorce du système : sans elle, un
 * nouveau ne peut RIEN demander avant d'avoir aidé, ce qui est exactement le
 * mur qu'on voulait éviter en retirant les dettes.
 *
 * Elle monte avec le rôle parce qu'un vétéran a déjà donné pendant des mois que
 * le compteur n'a pas vus — il ne repart pas de zéro le jour où on l'installe.
 */
export const DOTATION_HEBDO: Record<string, number> = {
  RECRUE: 1,
  GUARD: 3,
  VETERAN: 5,
  OFFICIER: 8,
  GENERAL: 8,
  VANGUARD: 8,
  DIRECTION: 8,
};

/** Coût d'une demande, d'après le prix estimé. Jamais gratuit : demander
 *  quelque chose au coffre commun mobilise quelqu'un, même pour trois périns. */
export function coutEnCredits(perins: number): number {
  return Math.max(1, Math.ceil((Number(perins) || 0) / PERINS_PAR_CREDIT));
}

export const BAREME_CREDITS = {
  /** Livrer une quête à quelqu'un : le service le plus complet. */
  quete: 3,
  /** Être là aux Chambres Secrètes, confirmé après coup. */
  presence: 1,
  /** Déposer au coffre : 1 crédit par tranche de 100 points d'XP de dépôt,
   *  donc pondéré comme l'XP par ce qui MANQUAIT au seuil. */
  parPointsDepot: 100,
  /** Un personnage dont les deux builds (TANK et DPS) sont publiés : le staff
   *  peut enfin l'accompagner. Une fois par personnage, pas par mise à jour. */
  buildComplet: 1,
} as const;

/** Crédite ou débite. Jamais bloquant, jamais payé deux fois (via `refId`). */
export async function bougerCredits(
  userId: string,
  delta: number,
  motif: string,
  refId?: string
): Promise<void> {
  const d = Math.trunc(delta);
  if (!d) return;
  await prisma.creditEvent
    .create({ data: { userId, delta: d, motif: motif.slice(0, 160), refId: refId ?? null } })
    .catch(() => null);
}

export async function solde(userId: string): Promise<number> {
  const r = await prisma.creditEvent.aggregate({ where: { userId }, _sum: { delta: true } });
  return r._sum.delta ?? 0;
}

export type ResumeCredits = {
  solde: number;
  gagnes: number;
  depenses: number;
  derniers: { id: string; delta: number; motif: string; createdAt: string }[];
};

export async function resumeCredits(userId: string): Promise<ResumeCredits> {
  const [lignes, derniers] = await Promise.all([
    prisma.creditEvent.findMany({ where: { userId }, select: { delta: true } }),
    prisma.creditEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const gagnes = lignes.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0);
  const depenses = lignes.filter((l) => l.delta < 0).reduce((s, l) => s - l.delta, 0);
  return {
    solde: gagnes - depenses,
    gagnes,
    depenses,
    derniers: derniers.map((e) => ({ id: e.id, delta: e.delta, motif: e.motif, createdAt: e.createdAt.toISOString() })),
  };
}

/**
 * Ce que la guilde doit à un membre, et l'inverse — en une phrase lisible.
 * Sert au staff (page d'historique) et au membre lui-même : le même chiffre
 * pour les deux, sinon la règle devient une affaire de confiance.
 */
export function lireSolde(n: number): { texte: string; ton: "bon" | "neutre" | "dette" } {
  if (n > 0) return { texte: `${n} crédit${n > 1 ? "s" : ""} d'avance`, ton: "bon" };
  if (n === 0) return { texte: "à l'équilibre", ton: "neutre" };
  return { texte: `${-n} de plus reçu que donné`, ton: "dette" };
}

/**
 * Verse la dotation de la semaine si elle ne l'a pas déjà été.
 *
 * Semaine ISO plutôt que « 7 jours glissants » : tout le monde touche le même
 * jour, ce qui se raconte en une phrase. L'empreinte contient la semaine, donc
 * appeler cette fonction dix fois par jour ne verse qu'une fois.
 */
export async function verserDotation(user: { id: string; role: string }): Promise<void> {
  const d = new Date();
  // Numéro de semaine ISO : le jeudi de la semaine décide de l'année.
  const jeudi = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  jeudi.setUTCDate(jeudi.getUTCDate() + 4 - (jeudi.getUTCDay() || 7));
  const debut = new Date(Date.UTC(jeudi.getUTCFullYear(), 0, 1));
  const semaine = Math.ceil(((jeudi.getTime() - debut.getTime()) / 86400000 + 1) / 7);
  const clef = `${jeudi.getUTCFullYear()}-S${String(semaine).padStart(2, "0")}`;

  const montant = DOTATION_HEBDO[user.role] ?? DOTATION_HEBDO.RECRUE;
  if (!montant) return;
  await bougerCredits(user.id, montant, `Dotation de la semaine (${clef})`, `dotation:${user.id}:${clef}`);
}
