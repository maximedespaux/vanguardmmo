/**
 * Forme d'une quête telle qu'elle sort de l'API.
 *
 * Ce module existe parce qu'une route Next ne peut RIEN exporter d'autre que
 * ses verbes HTTP : partager le sérialiseur entre la liste et les actions passe
 * donc par une brique à part — ce qui vaut mieux de toute façon, les deux
 * routes doivent renvoyer exactement la même chose.
 */
export type PersonneBrute = { id: string; username: string; avatar: string | null; discordId: string };

/** Ce qu'il faut charger pour présenter une quête : les deux personnes. */
export const QUETE_AVEC = {
  auteur: { select: { id: true, username: true, avatar: true, discordId: true } },
  preneur: { select: { id: true, username: true, avatar: true, discordId: true } },
} as const;

/** Avatar Discord : déjà connu à la connexion, rien à héberger ni à modérer. */
const avatar = (u: PersonneBrute | null) =>
  u?.avatar ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png?size=64` : null;

export function serialiserQuete<T extends { auteur: PersonneBrute; preneur: PersonneBrute | null }>(q: T) {
  return {
    ...q,
    auteur: { id: q.auteur.id, nom: q.auteur.username, avatar: avatar(q.auteur) },
    preneur: q.preneur ? { id: q.preneur.id, nom: q.preneur.username, avatar: avatar(q.preneur) } : null,
  };
}
