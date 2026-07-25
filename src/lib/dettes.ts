/**
 * Règles de suivi des dettes — partagées entre la page /dettes, le tableau de
 * bord et le bot. Écrites une fois pour que « en retard » et « il reste tant »
 * veuillent dire la même chose partout : trois calculs indépendants finiraient
 * par se contredire, et c'est le détenteur qui en ferait les frais.
 *
 * Sans dépendance (ni React, ni next/*, ni Prisma) pour rester importable côté
 * bot comme côté site.
 */

/** Forme minimale attendue. Volontairement souple : la page et le bot ne
 *  lisent pas exactement les mêmes objets (JSON sérialisé vs Prisma). */
export type DetteSuivi = {
  amount: number | bigint;
  status: string;
  dueDate?: string | Date | null;
  payments?: { amount: number | bigint }[] | null;
};

const nb = (v: number | bigint | null | undefined) => Number(v ?? 0);

/** Une dette n'est « vivante » (à rembourser) que si elle a été acceptée. */
export const STATUTS_VIVANTS = ["ACCEPTED"] as const;
/** Statuts encore ouverts, validation comprise — utile pour les compteurs. */
export const STATUTS_OUVERTS = ["REQUESTED", "PENDING_VALIDATION", "ACCEPTED"] as const;

export const estVivante = (d: DetteSuivi) => (STATUTS_VIVANTS as readonly string[]).includes(d.status);

/** Total déjà remboursé, d'après l'historique des versements. */
export function payeDette(d: DetteSuivi): number {
  return (d.payments ?? []).reduce((s, p) => s + nb(p.amount), 0);
}

/** Ce qu'il reste à rembourser, jamais négatif (un trop-perçu n'est pas une créance). */
export function resteDette(d: DetteSuivi): number {
  return Math.max(0, nb(d.amount) - payeDette(d));
}

/**
 * En retard = échéance dépassée, dette acceptée, et il reste quelque chose.
 *
 * La comparaison se fait à la journée : une échéance au 12 n'est pas en retard
 * le 12 à 8h. Sans ça, tout le monde serait signalé en retard le jour même de
 * l'échéance qu'il a lui-même proposée.
 */
export function enRetard(d: DetteSuivi, maintenant: Date = new Date()): boolean {
  if (!d.dueDate || !estVivante(d) || resteDette(d) <= 0) return false;
  const ech = new Date(d.dueDate);
  if (isNaN(ech.getTime())) return false;
  const finDuJour = new Date(ech.getFullYear(), ech.getMonth(), ech.getDate(), 23, 59, 59, 999);
  return maintenant.getTime() > finDuJour.getTime();
}

/** Nombre de jours de retard (0 si pas en retard). */
export function joursDeRetard(d: DetteSuivi, maintenant: Date = new Date()): number {
  if (!enRetard(d, maintenant)) return 0;
  const ech = new Date(d.dueDate!);
  const jour = 24 * 60 * 60 * 1000;
  return Math.floor((maintenant.getTime() - ech.getTime()) / jour);
}

export type TotauxDettes = {
  nb: number;
  du: number;      // montant total des dettes vivantes
  paye: number;    // déjà remboursé
  reste: number;   // encore à rembourser
  enRetard: number; // nombre de dettes en retard
};

export function totauxDettes(list: DetteSuivi[], maintenant: Date = new Date()): TotauxDettes {
  const vivantes = list.filter(estVivante);
  return {
    nb: vivantes.length,
    du: vivantes.reduce((s, d) => s + nb(d.amount), 0),
    paye: vivantes.reduce((s, d) => s + payeDette(d), 0),
    reste: vivantes.reduce((s, d) => s + resteDette(d), 0),
    enRetard: vivantes.filter((d) => enRetard(d, maintenant)).length,
  };
}

/** Progression du remboursement, en pourcentage entier borné à 100. */
export function progressionDette(d: DetteSuivi): number {
  const total = nb(d.amount);
  if (total <= 0) return 100;
  return Math.min(100, Math.round((payeDette(d) / total) * 100));
}
