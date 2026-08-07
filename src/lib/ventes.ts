import { prisma } from "@/lib/prisma";

/**
 * Une vente entre deux membres : qui détient l'objet, qui s'engage à le
 * fournir, et où en est la remise.
 *
 * Ce qui manquait : une demande partait « au staff ». Le staff n'est personne —
 * on ne pouvait donc afficher ni sa présence, ni savoir s'il avait vraiment
 * l'objet, ni décrémenter le bon coffre à la remise. Et comme le stock est
 * éclaté entre les coffres des membres, deux personnes pouvaient livrer la
 * même arme sans le savoir.
 *
 * Le stock vit dans `AirGuildState.data.inv[pseudo][itemRef]` — le même endroit
 * que l'app AirGuild écrit. On ne tient JAMAIS une copie à côté : c'est comme
 * ça que la table CoffreItem s'était retrouvée déconnectée du vrai stock.
 */

export type Detenteur = { pseudo: string; quantite: number };

/** Sans accents ni casse : « Épée » et « epee » désignent le même objet. */
const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/**
 * Retrouve la CLÉ de coffre derrière le libellé d'une demande.
 *
 * Une demande porte « Glaive - Templier (Épique) » — ce que le membre a lu à
 * l'écran. Le coffre, lui, range sous « Armes - Yggdrasil|Templier|Glaive|
 * R#epique ». Comparer les deux directement ne trouvait jamais personne, et la
 * demande semblait n'avoir aucun détenteur alors que trois membres l'avaient.
 *
 * On passe donc par le catalogue, qui porte les deux : son `item` est le
 * libellé, son `id` est la clé.
 */
export async function clefDeCoffre(libelle: string): Promise<string | null> {
  if (!libelle) return null;
  if (libelle.includes("|")) return libelle;              // déjà une clé
  const nu = plat(libelle.replace(/\s*\([^)]*\)\s*$/, ""));  // « (Épique) » n'est pas dans le nom
  const { etatCoffre } = await import("@/lib/coffre");
  const { items } = await etatCoffre();
  const exact = items.find((o) => plat(o.item) === nu);
  if (exact) return exact.id;
  // Repli : le libellé peut avoir été recopié avec la classe accolée.
  const partiel = items.find((o) => nu.startsWith(plat(o.item)) || plat(o.item).startsWith(nu));
  return partiel ? partiel.id : null;
}

type EtatCoffre = { inv?: Record<string, Record<string, number>>; members?: string[] };

async function lireEtat(): Promise<{ etat: Record<string, unknown>; inv: Record<string, Record<string, number>> }> {
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const etat = (row?.data ?? {}) as Record<string, unknown>;
  const inv = ((etat as EtatCoffre).inv ?? {}) as Record<string, Record<string, number>>;
  return { etat, inv };
}

/**
 * Qui possède cet objet, et combien — du mieux fourni au moins fourni.
 *
 * Une arme est rangée par rareté (`id|R#legendaire`) : demander « Épée » sans
 * préciser doit trouver les détenteurs de toutes ses raretés, sinon la demande
 * la plus courante ne trouve personne.
 */
export async function detenteursDe(itemRef: string): Promise<Detenteur[]> {
  const clef = await clefDeCoffre(itemRef);
  if (!clef) return [];
  const { inv } = await lireEtat();
  const base = clef.split("|R#")[0];
  const out: Detenteur[] = [];
  for (const [pseudo, coffre] of Object.entries(inv)) {
    if (!coffre || typeof coffre !== "object") continue;
    let n = 0;
    for (const [rangee, valeur] of Object.entries(coffre)) {
      // Toutes les raretés de la même arme comptent : le demandeur veut
      // l'objet, la rareté se négocie dans la conversation.
      if (rangee.split("|R#")[0] === base) n += Number(valeur) || 0;
    }
    if (n > 0) out.push({ pseudo, quantite: n });
  }
  return out.sort((a, b) => b.quantite - a.quantite);
}

/**
 * Sort l'objet du coffre d'un membre, ou l'y remet — l'inverse exact du dépôt.
 *
 * Deux pièges, et le second faisait que RIEN ne bougeait :
 *  — le coffre est rangé par CLÉ de catalogue (« Armes - Yggdrasil|Templier|Glaive »),
 *    pas par libellé de demande (« Glaive - Templier (Pré-myth.) »). On passait
 *    le libellé : la ligne n'existait pas, le stock restait intact, et on créait
 *    au passage une entrée fantôme à 0 ;
 *  — une arme est rangée par rareté (`clé|R#épique`) : il faut piocher dans les
 *    rangées que ce membre possède vraiment, de la mieux fournie à la moins.
 *
 * On ne descend jamais sous zéro : mieux vaut un stock à 0 qu'un stock négatif
 * qui ferait mentir tous les totaux.
 */
export async function bougerCoffre(pseudo: string, itemRef: string, delta: number, rangeeVoulue?: string | null): Promise<{ avant: number; apres: number; rangee: string } | null> {
  const clef = await clefDeCoffre(itemRef);
  if (!clef || !pseudo) return null;
  const { etat, inv } = await lireEtat();
  const coffre = { ...(inv[pseudo] ?? {}) };
  const base = clef.split("|R#")[0];
  const rangees = Object.keys(coffre)
    .filter((r) => r.split("|R#")[0] === base)
    .sort((a, b) => (Number(coffre[b]) || 0) - (Number(coffre[a]) || 0));
  const avant = rangees.reduce((t, r) => t + (Number(coffre[r]) || 0), 0);

  let touchee = rangeeVoulue || clef;
  if (delta < 0) {
    // On pioche d'abord dans la rangée demandée si elle est fournie (la rareté
    // que le client a demandée), sinon dans la mieux garnie.
    const ordre = rangeeVoulue && (Number(coffre[rangeeVoulue]) || 0) > 0
      ? [rangeeVoulue, ...rangees.filter((r) => r !== rangeeVoulue)]
      : rangees;
    let reste = Math.min(avant, -delta);
    for (const r of ordre) {
      if (reste <= 0) break;
      const q = Number(coffre[r]) || 0;
      if (q <= 0) continue;
      const pris = Math.min(q, reste);
      coffre[r] = q - pris;
      reste -= pris;
      touchee = r;
    }
  } else if (delta > 0) {
    // On rend EXACTEMENT là où c'était parti : une arme est rangée par rareté,
    // et créditer la première rangée venue transformait une Pré-mythique en
    // Épique sans que personne ne s'en aperçoive.
    const cible = rangeeVoulue || rangees[0] || clef;
    coffre[cible] = (Number(coffre[cible]) || 0) + delta;
    touchee = cible;
  }

  const apres = Object.keys(coffre)
    .filter((r) => r.split("|R#")[0] === base)
    .reduce((t, r) => t + (Number(coffre[r]) || 0), 0);
  const data = { ...etat, inv: { ...inv, [pseudo]: coffre } } as object;
  await prisma.airGuildState.upsert({ where: { id: "main" }, create: { id: "main", data }, update: { data } });
  return { avant, apres, rangee: touchee };
}

/** Réserver l'objet : il sort du coffre dès qu'un détenteur prend la commande. */
export const retirerDuCoffre = (pseudo: string, itemRef: string, quantite: number) =>
  bougerCoffre(pseudo, itemRef, -Math.max(1, Math.floor(quantite)));
/** Le rendre — dans la rangée d'où il était parti. */
export const rendreAuCoffre = (pseudo: string, itemRef: string, quantite: number, rangee?: string | null) =>
  bougerCoffre(pseudo, itemRef, Math.max(1, Math.floor(quantite)), rangee);

/** En ligne = vu il y a moins de 5 min (le signe de vie s'écrit toutes les 3 min). */
export const SEUIL_EN_LIGNE = 5 * 60_000;
export const estEnLigne = (vu: Date | null | undefined) =>
  !!vu && Date.now() - new Date(vu).getTime() < SEUIL_EN_LIGNE;

export type OffreVue = {
  id: string;
  membre: { id: string; nom: string; avatar: string | null; enLigne: boolean; vuLe: string | null };
  prix: number | null;
  /** Part en Airpoints d'un paiement mixte, et le taux que le vendeur accepte. */
  prixAp: number | null;
  tauxAp: number | null;
  /** "perins" | "airpoints" */
  devise: string;
  /** "comptant" | "dette" */
  reglement: string;
  /** Un officier a regardé et dit oui — une caution, pas un verrou. */
  validee: boolean;
  aObjet: boolean;
  statut: string;
  moi: boolean;
};

export type VenteVue = {
  requestId: string;
  /** REMIS / ANNULE / REFUSE = la demande est close. Sans ce statut, l'écran
   *  continuait d'afficher « Échange fait » et « Abandonner » sur une demande
   *  deja reglee : on cliquait, et rien ne finissait jamais. */
  statut: string;
  /** Le détenteur retenu, s'il y en a un. */
  detenteur: OffreVue | null;
  offres: OffreVue[];
  /** Ceux qui ont l'objet au coffre mais ne se sont pas encore prononcés. */
  detenteursPossibles: Detenteur[];
  rendezVous: string | null;
  /** Qui a proposé l'heure, et si l'autre l'a confirmée. Une heure sans auteur
   *  ne dit ni qui doit s'y plier, ni si l'autre l'a seulement vue. */
  rendezVousPar: string | null;
  rendezVousOk: boolean;
  /** Ce que le demandeur voit de l'autre côté, et réciproquement. */
  demandeur: { id: string; nom: string; enLigne: boolean; vuLe: string | null } | null;
  /** Tarif de référence AirGuild, pour situer les prix proposés. */
  prixReference: number | null;
  /** Ce que l'acheteur a annoncé pouvoir payer : "perins" | "airpoints" | "mixte". */
  souhaitPaiement: string;
  /**
   * Deux natures de demande, deux façons d'y répondre :
   * — "boutique" : l'objet DORT au coffre de quelqu'un. On cherche son
   *   détenteur, et « entre nous » réunit ceux qui l'ont.
   * — "aFaire" : personne ne l'a. Il faut le farmer ou le fabriquer, à
   *   plusieurs, et ça devient une quête. « Entre nous » réunit le staff.
   */
  nature: "boutique" | "aFaire";
  /** La quête ouverte depuis cette demande, s'il y en a une. */
  queteId: string | null;
  /** Pourquoi le demandeur en a besoin — ce qui décide de la suite. */
  raison: string | null;
  /** La dette n'est ouverte qu'aux membres de la guilde — c'est le DEMANDEUR
   *  qui doit l'être, puisque c'est lui qui devra rembourser. */
  dettePossible: boolean;
};

const vueOffre = (
  o: { id: string; prix: bigint | null; prixAp: number | null; tauxAp: number | null; devise: string; reglement: string; valideePar: string | null; aObjet: boolean; statut: string; userId: string; user: { id: string; username: string; avatar: string | null; discordId: string; lastSeenAt: Date | null } },
  moiId?: string,
): OffreVue => ({
  id: o.id,
  membre: {
    id: o.user.id,
    nom: o.user.username,
    avatar: o.user.avatar ? `https://cdn.discordapp.com/avatars/${o.user.discordId}/${o.user.avatar}.png?size=64` : null,
    enLigne: estEnLigne(o.user.lastSeenAt),
    vuLe: o.user.lastSeenAt ? o.user.lastSeenAt.toISOString() : null,
  },
  prix: o.prix == null ? null : Number(o.prix),
  prixAp: o.prixAp,
  tauxAp: o.tauxAp,
  devise: o.devise,
  reglement: o.reglement,
  validee: !!o.valideePar,
  aObjet: o.aObjet,
  statut: o.statut,
  moi: !!moiId && o.userId === moiId,
});

/** L'état complet d'une vente, tel que les deux parties doivent le voir. */
export async function vueVente(requestId: string, moiId?: string): Promise<VenteVue | null> {
  const req = await prisma.bankRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true, item: true, detenteurId: true, rendezVous: true, rendezVousPar: true, rendezVousOk: true, status: true,
      priceEach: true, userId: true, modePaiement: true, kind: true, reason: true, queteId: true, quantity: true,
      offres: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true, prix: true, prixAp: true, tauxAp: true, devise: true, reglement: true, valideePar: true,
          aObjet: true, statut: true, userId: true,
          user: { select: { id: true, username: true, avatar: true, discordId: true, lastSeenAt: true } },
        },
      },
    },
  });
  if (!req) return null;

  const offres = req.offres.filter((o) => o.statut !== "retiree").map((o) => vueOffre(o, moiId));
  const detenteur = offres.find((o) => o.membre.id === req.detenteurId) ?? null;

  // Ceux qui ont l'objet sans s'être prononcés : c'est à eux que le salon des
  // ventes s'adresse, et c'est ce qui dit si l'attente est normale ou non.
  const possibles = req.item ? await detenteursDe(req.item) : [];
  const dejaVus = new Set(offres.map((o) => o.membre.nom.toLowerCase()));
  const detenteursPossibles = possibles.filter((d) => !dejaVus.has(d.pseudo.toLowerCase()));

  const demandeur = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, lastSeenAt: true, role: true },
  });
  const { canAccessGuild } = await import("@/config/roles");

  return {
    requestId: req.id,
    statut: req.status,
    detenteur,
    offres,
    detenteursPossibles,
    rendezVous: req.rendezVous ? req.rendezVous.toISOString() : null,
    rendezVousPar: req.rendezVousPar,
    rendezVousOk: req.rendezVousOk,
    demandeur: demandeur
      ? {
          id: demandeur.id, nom: demandeur.username,
          enLigne: estEnLigne(demandeur.lastSeenAt),
          vuLe: demandeur.lastSeenAt ? demandeur.lastSeenAt.toISOString() : null,
        }
      : null,
    prixReference: req.priceEach ?? null,
    souhaitPaiement: req.modePaiement,
    // Le stock tranche mieux que le type de la demande : un objet que personne
    // n'a au coffre ne se vend pas, quel qu'ait été le formulaire d'origine.
    nature: possibles.length > 0 ? "boutique" : "aFaire",
    queteId: req.queteId,
    raison: req.reason?.replace(/^Boutique · /, "") ?? null,
    dettePossible: !!demandeur && canAccessGuild(demandeur.role),
  };
}

/**
 * Prévenir quelqu'un : sur le site ET en message privé Discord.
 *
 * La cloche du site ne se voit que si on y est. Or l'échange se joue en jeu,
 * entre deux personnes qui doivent se retrouver : celui qui attend doit être
 * tiré de Discord, pas découvrir trois heures plus tard qu'on l'attendait. Le
 * MP porte donc toujours le lien vers la conversation — c'est là qu'on répond,
 * pas dans le MP.
 */
/**
 * Prévient quelqu'un sur le site ET par MP Discord.
 *
 * `type` sert aussi de repère : une notification déjà posée est ce qui permet
 * de ne pas renvoyer deux fois la même (cf. « je suis en jeu »).
 */
export async function prevenir(userId: string, titre: string, corps: string, lien: string, type = "vente"): Promise<void> {
  await prisma.notification.create({ data: { userId, type, title: titre, body: corps, link: lien } }).catch(() => {});
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
    if (!u?.discordId) return;
    const { envoyerMP, COULEURS } = await import("@/lib/discord");
    const site = process.env.NEXTAUTH_URL || "https://vanguardhub.fr";
    await envoyerMP(u.discordId, {
      embeds: [{
        title: titre,
        description: `${corps}\n\n[Répondre sur le site](${site}${lien})`,
        color: COULEURS.orange,
      }],
    });
  } catch { /* un MP fermé ne doit jamais bloquer une vente */ }
}

/**
 * Prévient tout le staff. Une candidature à fournir un objet doit remonter :
 * le staff n'a pas à valider pour que ça avance — la vente n'attend pas — mais
 * il doit pouvoir regarder, se joindre, ou dire non.
 */
export async function prevenirStaff(titre: string, corps: string, lien: string, saufId?: string): Promise<void> {
  const { ADMIN_ROLES } = await import("@/config/roles");
  const staff = await prisma.user.findMany({ where: { role: { in: ADMIN_ROLES } }, select: { id: true } });
  await Promise.all(staff.filter((u) => u.id !== saufId).map((u) => prevenir(u.id, titre, corps, lien)));
}

/* ─── Le salon des ventes ──────────────────────────────────────────────────
   Une demande qui n'existe que sur le site attend qu'on pense à l'ouvrir. Le
   salon, lui, se voit sur le téléphone. Il ne remplace pas le site : il y
   renvoie, et c'est le site qui tranche. Le message est ensuite MODIFIÉ quand
   quelqu'un prend la commande — c'est ce qui rend impossible de prendre un
   objet sans que personne ne le sache.                                       */

/** Salon 🏦・ventes. Surchargeable par .env pour un autre serveur. */
const SALON_VENTES = process.env.CHANNEL_VENTES || "1515100678467485866";
const SITE = process.env.NEXTAUTH_URL || "https://vanguardhub.fr";

function embedVente(d: { id: string; item: string | null; quantity: number; username: string }, detenteurs: Detenteur[], pris?: { par: string; prix: number | null }) {
  const qui = detenteurs.length
    ? detenteurs.map((x) => `${x.pseudo} (${x.quantite})`).join(" · ")
    : "personne au coffre";
  return {
    embeds: [{
      title: pris ? `Pris en charge — ${d.item ?? "objet"}` : `Demande — ${d.item ?? "objet"}`,
      description: pris
        ? `**${pris.par}** s'en occupe${pris.prix ? ` pour **${pris.prix.toLocaleString("fr-FR")} périns**` : ""}.\nLes autres détenteurs n'ont plus à s'en soucier.`
        : `**${d.username}** demande **${d.quantity} × ${d.item ?? "objet"}**.\nAu coffre : ${qui}.\nPremier qui la prend sur le site l'obtient.`,
      color: pris ? 0x4ade80 : 0xff8c1a,
      url: `${SITE}/requetes/${d.id}`,
      footer: { text: pris ? "Tout se règle sur le site" : "Ouvre le lien pour la prendre" },
    }],
  };
}

/** Annonce une nouvelle demande. Silencieux si Discord n'est pas configuré. */
export async function annoncerVente(requestId: string): Promise<void> {
  try {
    const d = await prisma.bankRequest.findUnique({
      where: { id: requestId },
      select: { id: true, item: true, quantity: true, username: true, venteMessageId: true },
    });
    if (!d?.item || d.venteMessageId) return;
    const { posterEtRetenir } = await import("@/lib/discord");
    const messageId = await posterEtRetenir(SALON_VENTES, embedVente(d, await detenteursDe(d.item)));
    if (messageId) await prisma.bankRequest.update({ where: { id: requestId }, data: { venteMessageId: messageId } });
  } catch { /* le salon est un relais, jamais un point de passage obligé */ }
}

/** Met l'annonce à jour : « pris par X ». */
export async function majAnnonceVente(requestId: string): Promise<void> {
  try {
    const d = await prisma.bankRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true, item: true, quantity: true, username: true, venteMessageId: true, detenteurId: true,
        offres: { where: { statut: "retenue" }, select: { prix: true, user: { select: { username: true } } } },
      },
    });
    if (!d?.venteMessageId || !d.item) return;
    const retenue = d.offres[0];
    const pris = d.detenteurId && retenue
      ? { par: retenue.user.username, prix: retenue.prix == null ? null : Number(retenue.prix) }
      : undefined;
    const { modifierMessage } = await import("@/lib/discord");
    await modifierMessage(SALON_VENTES, d.venteMessageId, embedVente(d, await detenteursDe(d.item), pris));
  } catch { /* idem : une annonce ratée ne bloque pas la vente */ }
}
