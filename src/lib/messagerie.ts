import { prisma } from "@/lib/prisma";
import { canAccessAdmin } from "@/config/roles";
import type { Role, User } from "@prisma/client";

/**
 * Boîte de réception : toutes les conversations d'un membre en une seule liste.
 *
 * Jusqu'ici un fil vivait ENFERMÉ dans sa carte de demande : il fallait déjà
 * savoir que la demande existait pour retrouver ce qui s'y était dit. C'est
 * l'inverse d'une messagerie. Ici on part de la conversation, pas de l'objet.
 *
 * Dettes et requêtes boutique sont mélangées volontairement : de l'extérieur
 * c'est la même chose — quelqu'un attend une réponse de moi, ou moi de lui.
 */

/** Clé d'un fil, préfixée : c'est elle qui porte le marqueur de lecture. */
export const clefDette = (id: string) => `debt:${id}`;
export const clefRequete = (id: string) => `req:${id}`;

/** En ligne = vu il y a moins de 5 min (le signe de vie s'écrit toutes les 3 min). */
const SEUIL_EN_LIGNE = 5 * 60_000;
const enLigne = (vu: Date | null | undefined) =>
  !!vu && Date.now() - new Date(vu).getTime() < SEUIL_EN_LIGNE;

export type Apercu = {
  auteur: string | null;
  corps: string;
  kind: string;
  quand: string;
};

export type Conversation = {
  filId: string;
  type: "dette" | "requete";
  id: string;
  /** Sur quoi porte la conversation — l'objet, pas le numéro de dossier. */
  titre: string;
  /** État de la transaction, en clair : on juge la ligne sans l'ouvrir. */
  etat: string;
  /** Couleur de l'état : "attente" | "encours" | "fini" | "stop". */
  ton: "attente" | "encours" | "fini" | "stop";
  avec: string;
  enLigne: boolean;
  dernier: Apercu | null;
  nonLus: number;
  /** Horodatage de tri : dernier message, sinon création de la demande. */
  quand: string;
  lien: string;
};

const ETAT_DETTE: Record<string, { l: string; t: Conversation["ton"] }> = {
  REQUESTED: { l: "Demandée", t: "attente" },
  PENDING_VALIDATION: { l: "En attente de validation", t: "attente" },
  ACCEPTED: { l: "En cours de remboursement", t: "encours" },
  REPAID: { l: "Remboursée", t: "fini" },
  REFUSED: { l: "Refusée", t: "stop" },
  CANCELLED: { l: "Annulée", t: "stop" },
};

const ETAT_REQUETE: Record<string, { l: string; t: Conversation["ton"] }> = {
  PENDING: { l: "En attente du staff", t: "attente" },
  ACCEPTE_ACHAT: { l: "Acceptée — achat", t: "encours" },
  ACCEPTE_DETTE: { l: "Acceptée — dette", t: "encours" },
  EN_ECHANGE: { l: "Échange en cours", t: "encours" },
  REMIS: { l: "Objet remis", t: "fini" },
  REFUSE: { l: "Refusée", t: "stop" },
  ANNULE: { l: "Annulée", t: "stop" },
};

/**
 * Plafond de messages relus pour bâtir les aperçus. À l'échelle d'une guilde on
 * est très loin du compte ; le plafond n'est là que pour qu'une base qui a vécu
 * ne fasse pas tomber la page. Au pire, les fils les plus anciens perdent leur
 * aperçu — jamais les récents, puisqu'on lit du plus récent au plus ancien.
 */
const MAX_MESSAGES = 2000;

export async function listerConversations(user: User): Promise<Conversation[]> {
  const staff = canAccessAdmin(user.role as Role);
  const pseudo = (user.username ?? "").trim();

  // Mes dettes : celles que je dois, et celles dont je suis le détenteur (comparé
  // au pseudo, comme partout ailleurs sur les dettes — le détenteur n'est pas
  // toujours un compte du site).
  //
  // Le staff ne récupère PAS ici toutes les dettes de la guilde : ce serait
  // déverser la situation financière de chacun dans la boîte de tous les
  // officiers. La vue d'ensemble a déjà sa page, /gestion-dettes.
  const dettes = await prisma.debt.findMany({
    where: pseudo
      ? { OR: [{ userId: user.id }, { creditor: { equals: pseudo, mode: "insensitive" } }] }
      : { userId: user.id },
    select: {
      id: true, userId: true, item: true, type: true, status: true, creditor: true, createdAt: true,
      user: { select: { username: true, lastSeenAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Requêtes boutique : les miennes ; et pour le staff, TOUTES — c'est lui
  // l'interlocuteur de chaque demande, on ignore d'avance qui la traitera.
  const requetes = await prisma.bankRequest.findMany({
    where: staff ? {} : { userId: user.id },
    select: { id: true, userId: true, username: true, item: true, quantity: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: staff ? 300 : 200,
  });

  const idsDettes = dettes.map((d) => d.id);
  const idsRequetes = requetes.map((r) => r.id);
  if (!idsDettes.length && !idsRequetes.length) return [];

  const [messages, marqueurs, detenteurs] = await Promise.all([
    prisma.requestMessage.findMany({
      where: { OR: [{ debtId: { in: idsDettes } }, { bankRequestId: { in: idsRequetes } }] },
      orderBy: { createdAt: "desc" },
      take: MAX_MESSAGES,
      select: { id: true, debtId: true, bankRequestId: true, userId: true, author: true, kind: true, body: true, createdAt: true },
    }),
    prisma.requestRead.findMany({
      where: { userId: user.id },
      select: { filId: true, lastSeenAt: true },
    }),
    // Présence des détenteurs : ils ne sont désignés que par un pseudo sur la
    // dette, il faut donc les retrouver par leur nom pour savoir s'ils sont là.
    prisma.user.findMany({
      where: { username: { in: dettes.map((d) => d.creditor ?? "").filter(Boolean) } },
      select: { username: true, lastSeenAt: true },
    }),
  ]);

  const vuLe = new Map(marqueurs.map((m) => [m.filId, m.lastSeenAt.getTime()]));
  const presence = new Map(detenteurs.map((u) => [u.username.toLowerCase(), u.lastSeenAt]));

  // Un seul passage sur les messages : le premier vu pour un fil est le dernier
  // écrit (tri décroissant), les suivants ne servent qu'au compte des non-lus.
  const dernier = new Map<string, Apercu>();
  const nonLus = new Map<string, number>();
  for (const m of messages) {
    const filId = m.debtId ? clefDette(m.debtId) : m.bankRequestId ? clefRequete(m.bankRequestId) : null;
    if (!filId) continue;
    if (!dernier.has(filId)) {
      dernier.set(filId, { auteur: m.author, corps: m.body, kind: m.kind, quand: m.createdAt.toISOString() });
    }
    // Mes propres messages ne sont jamais « non lus » : je viens de les écrire.
    if (m.userId === user.id) continue;
    if (m.createdAt.getTime() > (vuLe.get(filId) ?? 0)) nonLus.set(filId, (nonLus.get(filId) ?? 0) + 1);
  }

  const conversations: Conversation[] = [];

  for (const d of dettes) {
    const filId = clefDette(d.id);
    const jeSuisDebiteur = d.userId === user.id;
    const etat = ETAT_DETTE[d.status] ?? { l: d.status, t: "attente" as const };
    const avec = jeSuisDebiteur ? (d.creditor ?? "le staff") : (d.user?.username ?? "un membre");
    conversations.push({
      filId,
      type: "dette",
      id: d.id,
      titre: d.item ? `Dette — ${d.item}` : d.type === "PENYA" ? "Dette de périns" : "Dette",
      etat: etat.l,
      ton: etat.t,
      avec,
      enLigne: enLigne(jeSuisDebiteur ? presence.get((d.creditor ?? "").toLowerCase()) : d.user?.lastSeenAt),
      dernier: dernier.get(filId) ?? null,
      nonLus: nonLus.get(filId) ?? 0,
      quand: (dernier.get(filId)?.quand ?? d.createdAt.toISOString()),
      lien: `/dettes?fil=${d.id}`,
    });
  }

  for (const r of requetes) {
    const filId = clefRequete(r.id);
    const jeSuisDemandeur = r.userId === user.id;
    const etat = ETAT_REQUETE[r.status] ?? { l: r.status, t: "attente" as const };
    conversations.push({
      filId,
      type: "requete",
      id: r.id,
      titre: `${r.item ?? "Demande"}${r.quantity > 1 ? ` ×${r.quantity}` : ""}`,
      etat: etat.l,
      ton: etat.t,
      avec: jeSuisDemandeur ? "Staff Vanguard" : r.username,
      // Le staff est un collectif, pas une personne : afficher « en ligne » pour
      // lui laisserait croire qu'un officier précis est devant l'écran.
      enLigne: false,
      dernier: dernier.get(filId) ?? null,
      nonLus: nonLus.get(filId) ?? 0,
      quand: (dernier.get(filId)?.quand ?? r.createdAt.toISOString()),
      lien: `/requetes/${r.id}`,
    });
  }

  // Une affaire close dont personne n'a rien dit n'est pas une conversation :
  // elle ne ferait qu'allonger la liste. Vu du staff, à qui TOUTES les requêtes
  // remontent, c'est ce qui sépare une boîte de réception d'un journal — les
  // demandes réglées restent consultables sur leur page.
  const vivantes = conversations.filter((c) => c.dernier || c.ton === "attente" || c.ton === "encours");

  // La plus récente en haut : c'est celle qui attend une réponse.
  return vivantes.sort((a, b) => b.quand.localeCompare(a.quand));
}

/** Nombre de conversations qui contiennent du neuf (pour la pastille de la nav). */
export async function compterFilsNonLus(user: User): Promise<number> {
  const liste = await listerConversations(user);
  return liste.filter((c) => c.nonLus > 0).length;
}

/**
 * Marque un fil comme lu jusqu'à maintenant. Appelé à l'ouverture de la
 * conversation : c'est le seul moment où on sait vraiment que le membre a vu.
 */
export async function marquerLu(userId: string, filId: string): Promise<void> {
  const maintenant = new Date();
  await prisma.requestRead
    .upsert({
      where: { userId_filId: { userId, filId } },
      update: { lastSeenAt: maintenant },
      create: { userId, filId, lastSeenAt: maintenant },
    })
    .catch(() => null);
}
