import { prisma } from "@/lib/prisma";

/**
 * XP de profil : ce que la guilde reconnaît comme un service rendu.
 *
 * Quatre sources, décidées avec Maxime, et une règle commune : on ne paie que
 * ce qui a été CONSTATÉ par quelqu'un d'autre. Un dépôt est crédité par le
 * staff qui l'enregistre, une présence est confirmée après coup, une quête est
 * close par celui qui a reçu les objets, une dette est soldée par le détenteur.
 * Sans ce garde-fou, on récompenserait l'annonce et pas le geste.
 */

export type SourceXp = "depot" | "quete" | "presence" | "dette";

export const SOURCES: Record<SourceXp, { label: string; icon: string }> = {
  depot: { label: "Dépôts au coffre", icon: "vault" },
  quete: { label: "Quêtes livrées", icon: "target" },
  presence: { label: "Chambres Secrètes", icon: "users" },
  dette: { label: "Dettes soldées à temps", icon: "coins" },
};

/**
 * Barème. Les valeurs disent ce que la guilde estime rare : une dette
 * remboursée dans les temps vaut cher parce qu'elle est difficile et qu'elle
 * n'arrive qu'une fois ; une présence vaut moins mais revient deux fois par
 * semaine, donc elle pèse à la longue.
 */
export const BAREME = {
  /** Par unité déposée qui MANQUAIT au seuil du plan de farm. */
  depotUtile: 3,
  /** Par unité déposée au-delà du seuil — utile, mais pas ce qu'on attendait. */
  depotSurplus: 1,
  /** Plafond par mouvement : un dépôt géant ne doit pas écraser tout le reste. */
  depotMax: 300,
  quete: 100,
  presence: 50,
  dette: 200,
} as const;

/**
 * Paliers croissants : 500 XP pour le niveau 2, 1000 de plus pour le 3, etc.
 * Les premiers niveaux tombent vite (on voit que ça compte), les suivants se
 * méritent. Calculé par boucle plutôt qu'en formule fermée : c'est le genre de
 * chose qu'on relit six mois plus tard et qu'on doit comprendre sans papier.
 */
export function niveau(xp: number): { niveau: number; dansNiveau: number; pourNiveau: number } {
  let n = 1;
  let reste = Math.max(0, Math.floor(xp));
  let seuil = 500;
  while (reste >= seuil) {
    reste -= seuil;
    n += 1;
    seuil = 500 * n;
  }
  return { niveau: n, dansNiveau: reste, pourNiveau: seuil };
}

/**
 * Crédite des points. Jamais bloquant : l'XP est une récompense, elle ne doit
 * pas faire échouer le remboursement ou la livraison qui vient d'être
 * enregistrée. `refId` rend l'appel rejouable sans double paiement.
 */
export async function donnerXp(
  userId: string,
  source: SourceXp,
  points: number,
  detail: string,
  refId?: string
): Promise<void> {
  const p = Math.max(0, Math.floor(points));
  if (!p) return;
  await prisma.xpEvent
    .create({ data: { userId, source, points: p, detail: detail.slice(0, 200), refId: refId ?? null } })
    .catch(() => null); // refId déjà pris = déjà payé, c'est le comportement voulu
}

/** Points d'un dépôt, pondérés par ce qui manquait au seuil. */
export function pointsDepot(quantite: number, manqueAvant: number): number {
  const q = Math.max(0, Math.floor(quantite));
  const utile = Math.min(q, Math.max(0, Math.floor(manqueAvant)));
  const surplus = q - utile;
  return Math.min(BAREME.depotMax, utile * BAREME.depotUtile + surplus * BAREME.depotSurplus);
}

export type ResumeXp = {
  total: number;
  niveau: number;
  dansNiveau: number;
  pourNiveau: number;
  parSource: { source: SourceXp; label: string; points: number }[];
  derniers: { id: string; source: string; points: number; detail: string | null; createdAt: string }[];
};

export async function resumeXp(userId: string): Promise<ResumeXp> {
  const [parSource, derniers] = await Promise.all([
    prisma.xpEvent.groupBy({ by: ["source"], where: { userId }, _sum: { points: true } }),
    prisma.xpEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const total = parSource.reduce((s, r) => s + (r._sum.points ?? 0), 0);
  return {
    total,
    ...niveau(total),
    // Toutes les sources sont listées, même à zéro : c'est ainsi qu'on découvre
    // ce qui rapporte, sans aller chercher une page d'explications.
    parSource: (Object.keys(SOURCES) as SourceXp[]).map((s) => ({
      source: s,
      label: SOURCES[s].label,
      points: parSource.find((r) => r.source === s)?._sum.points ?? 0,
    })),
    derniers: derniers.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  };
}

/** Classement de la guilde, plafonné : c'est un encouragement, pas un palmarès. */
export async function classement(limite = 10) {
  const lignes = await prisma.xpEvent.groupBy({
    by: ["userId"],
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: limite,
  });
  if (!lignes.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: lignes.map((l) => l.userId) } },
    select: { id: true, username: true, avatar: true, discordId: true },
  });
  return lignes.map((l) => {
    const u = users.find((x) => x.id === l.userId);
    const total = l._sum.points ?? 0;
    return {
      userId: l.userId,
      username: u?.username ?? "?",
      // Avatar Discord : déjà en base, aucune image à héberger ni à modérer.
      avatar: u?.avatar && u?.discordId ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png?size=64` : null,
      total,
      niveau: niveau(total).niveau,
    };
  });
}
