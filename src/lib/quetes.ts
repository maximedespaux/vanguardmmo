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

/**
 * La cagnotte d'une quête, et la part de chacun.
 *
 * Une quête née d'une requête client porte une somme : celle convenue avec le
 * demandeur. Elle ne vit pas sur la quête mais sur la DEMANDE, là où le staff
 * la négocie déjà dans la conversation — deux endroits pour un même montant,
 * et le jour où il bouge, l'un des deux ment.
 *
 * Le partage est au prorata de ce que chacun a RAMENÉ, pas de ce qu'il a
 * promis : on partage ce qui est arrivé.
 *
 * La répartition se fait au plus fort reste. Arrondir chaque part séparément
 * fait perdre ou inventer des périns — sur 4 500 partagés en trois, les trois
 * tiers arrondis font 4 499. Ici la somme des parts égale toujours la cagnotte,
 * et le reliquat va à ceux qui en ont le plus apporté.
 */
export function partager(cagnotte: number, parts: { id: string; quantite: number }[]): Record<string, number> {
  const total = parts.reduce((s, p) => s + p.quantite, 0);
  if (!cagnotte || !total) return {};
  const exact = parts.map((p) => ({ id: p.id, v: (cagnotte * p.quantite) / total }));
  const bas = exact.map((e) => ({ id: e.id, part: Math.floor(e.v), reste: e.v - Math.floor(e.v) }));
  let manque = cagnotte - bas.reduce((s, b) => s + b.part, 0);
  bas.sort((a, b) => b.reste - a.reste);
  for (let i = 0; manque > 0 && i < bas.length; i++, manque--) bas[i].part += 1;
  return Object.fromEntries(bas.map((b) => [b.id, b.part]));
}

export function serialiserQuete<T extends {
  quantite: number;
  auteur: PersonneBrute;
  contributions: ContributionBrute[];
}>(q: T, cagnotte: number | null = null) {
  const confirme = q.contributions.filter((c) => c.statut === "confirme").reduce((s, c) => s + c.quantite, 0);
  const annonce = q.contributions.filter((c) => c.statut === "annonce").reduce((s, c) => s + c.quantite, 0);
  /* Deux lectures de la part, et il faut les deux : celle ACQUISE, calculée sur
     ce qui est arrivé, et celle ATTENDUE, qui inclut ce qui est promis. La
     seconde est ce qu'on regarde avant de s'engager ; la premiere, ce qu'on
     touche. Le diviseur est la quantite DEMANDEE, pas la somme apportee :
     tant que la quete n'est pas pleine, la cagnotte n'est pas due en entier. */
  const base = Math.max(q.quantite, confirme + annonce);
  const acquis = partager(cagnotte ?? 0, q.contributions.filter((c) => c.statut === "confirme").map((c) => ({ id: c.id, quantite: c.quantite })));
  const attendu = cagnotte
    ? Object.fromEntries(q.contributions.map((c) => [c.id, Math.round((cagnotte * c.quantite) / base)]))
    : {};
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
      /* Ce que cet apport vaut : acquis une fois la reception confirmee,
         attendu tant qu'il n'est qu'annonce. */
      part: c.statut === "confirme" ? (acquis[c.id] ?? 0) : (attendu[c.id] ?? 0),
    })),
    cagnotte,
    // Deux compteurs plutôt qu'un : ce qui est PROMIS évite qu'on farme à
    // quatre la même chose, ce qui est REÇU dit où en est vraiment la quête.
    confirme,
    annonce,
    reste: Math.max(0, q.quantite - confirme - annonce),
  };
}
