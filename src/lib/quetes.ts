/**
 * Forme d'une quête telle qu'elle sort de l'API.
 *
 * Ce module existe parce qu'une route Next ne peut RIEN exporter d'autre que
 * ses verbes HTTP : partager le sérialiseur entre la liste et les actions passe
 * donc par une brique à part — ce qui vaut mieux de toute façon, les deux
 * routes doivent renvoyer exactement la même chose.
 */
export type PersonneBrute = { id: string; username: string; avatar: string | null; discordId: string };

/** Ce qu'il faut charger pour présenter une quête : l'auteur et les apports. */
export const QUETE_AVEC = {
  auteur: { select: { id: true, username: true, avatar: true, discordId: true } },
  contributions: {
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, username: true, avatar: true, discordId: true } } },
  },
} as const;

/** Avatar Discord : déjà connu à la connexion, rien à héberger ni à modérer. */
const avatar = (u: PersonneBrute | null) =>
  u?.avatar ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png?size=64` : null;

const personne = (u: PersonneBrute) => ({ id: u.id, nom: u.username, avatar: avatar(u) });

type ContributionBrute = {
  id: string; userId: string; quantite: number; statut: string;
  createdAt: Date; confirmeAt: Date | null; user: PersonneBrute;
};

export function serialiserQuete<T extends {
  quantite: number;
  auteur: PersonneBrute;
  contributions: ContributionBrute[];
}>(q: T) {
  const confirme = q.contributions.filter((c) => c.statut === "confirme").reduce((s, c) => s + c.quantite, 0);
  const annonce = q.contributions.filter((c) => c.statut === "annonce").reduce((s, c) => s + c.quantite, 0);
  return {
    ...q,
    auteur: personne(q.auteur),
    contributions: q.contributions.map((c) => ({
      id: c.id,
      quantite: c.quantite,
      statut: c.statut,
      par: personne(c.user),
      createdAt: c.createdAt,
      confirmeAt: c.confirmeAt,
    })),
    // Deux compteurs plutôt qu'un : ce qui est PROMIS évite qu'on farme à
    // quatre la même chose, ce qui est REÇU dit où en est vraiment la quête.
    confirme,
    annonce,
    reste: Math.max(0, q.quantite - confirme - annonce),
  };
}
