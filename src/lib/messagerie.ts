import { prisma } from "@/lib/prisma";
import { canAccessAdmin } from "@/config/roles";
import type { Role, User } from "@prisma/client";

/**
 * Boîte de réception : toutes les demandes d'un membre, vues comme des
 * conversations.
 *
 * Un fil vivait ENFERMÉ dans sa carte de demande : il fallait déjà savoir que
 * la demande existait pour retrouver ce qui s'y était dit. C'est l'inverse
 * d'une messagerie. Ici on part de la conversation.
 *
 * Les dettes ont disparu de cette liste avec le système lui-même ; la clé de
 * fil reste préfixée, parce que les marqueurs de lecture déjà posés le sont.
 */

/** Clé d'un fil, préfixée : c'est elle qui porte le marqueur de lecture. */
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
  type: "requete";
  id: string;
  /** Sur quoi porte la conversation — l'objet, pas le numéro de dossier. */
  titre: string;
  /** État de la transaction, en clair : on juge la ligne sans l'ouvrir. */
  etat: string;
  /** Couleur de l'état : "attente" | "encours" | "fini" | "stop". */
  ton: "attente" | "encours" | "fini" | "stop";
  avec: string;
  /** C'est MA demande. Les coulisses entre vendeurs ne s'ouvrent jamais à
   *  l'auteur : c'est de lui qu'on y parle. */
  jeSuisLAuteur: boolean;
  enLigne: boolean;
  /** "perins" (règle par défaut) ou "troc" — visible sans ouvrir, comme le prix. */
  paiement: "perins" | "troc";
  /**
   * De quoi il s'agit, dit avant d'ouvrir : un ACHAT au coffre (l'objet y dort,
   * il a un tarif) ou une REQUÊTE d'objet (il faut lui trouver un détenteur, ou
   * le farmer). Les deux suivaient le même chemin sans jamais se distinguer, et
   * on ne savait pas si on lisait une commande ou un appel à la guilde.
   */
  categorie: "achat" | "requete";
  /** La quête de guilde ouverte depuis cette demande, s'il y en a une. */
  queteId: string | null;
  /** L'objet exact demandé, quand la demande vient du builder. */
  spec: unknown;
  /** Combien de demandes ce membre a déjà faites — de quoi juger sans quitter
   *  la conversation, et point d'entrée vers son historique. */
  demandesDeLAuteur: number;
  /** Le détail marchand en une ligne (souhait, prix) — ce que montrait la carte
   *  de « Mes demandes » avant que les deux écrans n'en fassent qu'un. */
  detail: string | null;
  dernier: Apercu | null;
  nonLus: number;
  /** Horodatage de tri : dernier message, sinon création de la demande. */
  quand: string;
  lien: string;
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

  // Requêtes boutique : les miennes ; et pour le staff, TOUTES — c'est lui
  // l'interlocuteur de chaque demande, on ignore d'avance qui la traitera.
  const requetes = await prisma.bankRequest.findMany({
    where: staff ? {} : { userId: user.id },
    select: { id: true, userId: true, username: true, item: true, quantity: true, status: true, modePaiement: true, spec: true, prixFinal: true, reason: true, characterName: true, createdAt: true, origine: true, queteId: true, batchId: true },
    orderBy: { createdAt: "desc" },
    take: staff ? 300 : 200,
  });

  const idsRequetes = requetes.map((r) => r.id);
  if (!idsRequetes.length) return [];

  const [messages, marqueurs] = await Promise.all([
    prisma.requestMessage.findMany({
      where: { bankRequestId: { in: idsRequetes } },
      orderBy: { createdAt: "desc" },
      take: MAX_MESSAGES,
      select: { id: true, bankRequestId: true, userId: true, author: true, kind: true, body: true, createdAt: true },
    }),
    prisma.requestRead.findMany({
      where: { userId: user.id },
      select: { filId: true, lastSeenAt: true },
    }),
  ]);

  const vuLe = new Map(marqueurs.map((m) => [m.filId, m.lastSeenAt.getTime()]));

  // Un seul passage sur les messages : le premier vu pour un fil est le dernier
  // écrit (tri décroissant), les suivants ne servent qu'au compte des non-lus.
  const dernier = new Map<string, Apercu>();
  const nonLus = new Map<string, number>();
  for (const m of messages) {
    const filId = m.bankRequestId ? clefRequete(m.bankRequestId) : null;
    if (!filId) continue;
    if (!dernier.has(filId)) {
      dernier.set(filId, { auteur: m.author, corps: m.body, kind: m.kind, quand: m.createdAt.toISOString() });
    }
    // Mes propres messages ne sont jamais « non lus » : je viens de les écrire.
    if (m.userId === user.id) continue;
    if (m.createdAt.getTime() > (vuLe.get(filId) ?? 0)) nonLus.set(filId, (nonLus.get(filId) ?? 0) + 1);
  }

  // Combien de fois chacun a demandé : compté une fois pour toute la liste
  // plutôt qu'une requête par conversation.
  const parAuteur = new Map<string, number>();
  for (const r of requetes) parAuteur.set(r.userId, (parAuteur.get(r.userId) ?? 0) + 1);

  const conversations: Conversation[] = [];

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
      jeSuisLAuteur: jeSuisDemandeur,
      // Le staff est un collectif, pas une personne : afficher « en ligne » pour
      // lui laisserait croire qu'un officier précis est devant l'écran.
      enLigne: false,
      paiement: r.modePaiement === "troc" ? "troc" : "perins",
      // Les demandes d'avant la distinction n'ont pas d'origine : le panier
      // groupait par batchId et fixait un tarif, l'objet sur mesure portait une
      // spec. On retombe dessus plutôt que de tout marquer « achat ».
      categorie: (r.origine === "achat" || r.origine === "requete")
        ? r.origine
        : (r.spec ? "requete" : r.batchId ? "achat" : "requete"),
      queteId: r.queteId ?? null,
      spec: r.spec ?? null,
      demandesDeLAuteur: parAuteur.get(r.userId) ?? 0,
      detail: [
        // Le pseudo en jeu d'abord : c'est ce qu'il faut pour envoyer le courrier.
        r.characterName ? `courrier à ${r.characterName}` : null,
        r.reason?.replace(/^Boutique · /, "") ?? null,
        r.prixFinal ? `${Number(r.prixFinal).toLocaleString("fr-FR")} périns` : null,
      ].filter(Boolean).join(" · ") || null,
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
