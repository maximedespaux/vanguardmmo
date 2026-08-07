import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";

/**
 * Fil d'une requête boutique : GET pour lire, POST pour écrire.
 *
 * Remplace le salon d'échange que le bot ouvrait pour chaque demande. Même
 * principe que le fil des dettes : la discussion et les faits enregistrés
 * cohabitent, et un message système n'a pas d'auteur.
 *
 * Accès : le demandeur et le staff. Une requête peut porter sur un objet
 * convoité — l'ouvrir à toute la guilde inviterait aux frictions.
 */
async function acces(id: string) {
  const auth = await apiAuth();
  if ("error" in auth) return { error: auth.error };
  const req = await prisma.bankRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, username: true, item: true, detenteurId: true },
  });
  if (!req) return { error: NextResponse.json({ error: "introuvable" }, { status: 404 }) };
  const estDetenteur = req.detenteurId === auth.user.id;
  if (req.userId !== auth.user.id && !canAccessAdmin(auth.user.role) && !estDetenteur) {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  /**
   * Les coulisses : là où les détenteurs décident entre eux qui vend et à quel
   * prix. Le demandeur n'y a JAMAIS accès, même s'il est de la guilde — c'est de
   * lui qu'on parle. Le filtrage se fait ici, côté serveur : masquer à l'écran
   * laisserait les messages voyager dans la réponse.
   */
  const coulisses = req.userId !== auth.user.id && (canAccessAdmin(auth.user.role) || canAccessGuild(auth.user.role));
  return { auth, req, coulisses };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await acces(id);
  if ("error" in a) return a.error;
  return NextResponse.json(
    await prisma.requestMessage.findMany({
      where: { bankRequestId: id, ...(a.coulisses ? {} : { prive: false }) },
      orderBy: { createdAt: "asc" },
      take: 300,
    })
  );
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await acces(id);
  if ("error" in a) return a.error;

  const b = await req.json().catch(() => ({}));
  const estStaff = canAccessAdmin(a.auth.user.role);
  const moi = a.auth.user.username ?? "?";

  // ── Accepter une offre ────────────────────────────────────────────────
  // Une offre acceptée fige l'accord sur la requête : sans cette écriture, il
  // ne vivrait que dans une phrase du fil et le staff devrait le ressaisir à la
  // main, avec le risque de se tromper de chiffre.
  if (b?.accept) {
    const offre = await prisma.requestMessage.findFirst({
      where: { id: String(b.accept), bankRequestId: id, kind: "offer", acceptedAt: null },
    });
    if (!offre?.amount) return NextResponse.json({ error: "Offre introuvable ou déjà traitée." }, { status: 409 });
    // On n'accepte pas sa propre offre : ce serait s'accorder un prix tout seul.
    if (offre.userId === a.auth.user.id) {
      return NextResponse.json({ error: "L'autre partie doit accepter ton offre." }, { status: 403 });
    }
    // Un accord ne se double pas : les offres plus anciennes restent affichées
    // comme historique, mais accepter la deuxième écraserait silencieusement le
    // prix déjà convenu — et personne ne saurait lequel fait foi.
    const dejaConclu = await prisma.requestMessage.findFirst({
      where: { bankRequestId: id, kind: "offer", acceptedAt: { not: null } },
      select: { id: true },
    });
    if (dejaConclu) {
      return NextResponse.json({ error: "Un accord a déjà été conclu sur cette demande." }, { status: 409 });
    }

    const troc = offre.mode === "troc";
    // Le troc n'est pas un droit : il se paie en objets, donc c'est celui qui
    // REMET l'objet qui doit dire oui. Si le staff a proposé le troc, son accord
    // est déjà donné ; sinon il doit être celui qui accepte. Sans cette règle,
    // deux membres pourraient convenir entre eux d'un paiement que le détenteur
    // n'a jamais voulu.
    const offrantEstStaff = offre.userId
      ? await prisma.user
          .findUnique({ where: { id: offre.userId }, select: { role: true } })
          .then((u) => (u ? canAccessAdmin(u.role) : false))
      : true;
    if (troc && !estStaff && !offrantEstStaff) {
      return NextResponse.json(
        { error: "Un paiement en objets doit être accepté par le détenteur." },
        { status: 403 }
      );
    }

    await prisma.requestMessage.update({ where: { id: offre.id }, data: { acceptedAt: new Date() } });
    // Un troc ne renseigne pas `prixFinal` : il n'y a aucune somme à réclamer, et
    // un montant inscrit là se lirait comme une dette en périns.
    await prisma.bankRequest.update({
      where: { id },
      data: troc
        ? { modePaiement: "troc", prixFinal: null }
        : { modePaiement: "perins", prixFinal: BigInt(offre.amount) },
    });
    await prisma.requestMessage.create({
      data: {
        bankRequestId: id,
        kind: "system",
        body: troc
          ? `${moi} a accepté un échange en objets (valeur estimée ${offre.amount.toLocaleString("fr-FR")} périns).`
          : `${moi} a accepté le prix de ${offre.amount.toLocaleString("fr-FR")} périns.`,
      },
    });
    return NextResponse.json({ ok: true, accepte: offre.amount, mode: troc ? "troc" : "perins" });
  }

  // ── Refuser une offre ─────────────────────────────────────────────────
  // Sans « non », une négociation n'existe pas : on ne pouvait qu'accepter ou
  // laisser traîner, et les prix s'empilaient sans qu'on sache lequel tenait.
  if (b?.refuse) {
    const offre = await prisma.requestMessage.findFirst({
      where: { id: String(b.refuse), bankRequestId: id, kind: "offer", acceptedAt: null, refusedAt: null },
    });
    if (!offre) return NextResponse.json({ error: "Offre introuvable ou déjà traitée." }, { status: 409 });
    if (offre.userId === a.auth.user.id) {
      return NextResponse.json({ error: "C'est ton offre — retire-la en en proposant une autre." }, { status: 403 });
    }
    await prisma.requestMessage.update({ where: { id: offre.id }, data: { refusedAt: new Date() } });
    await prisma.requestMessage.create({
      data: {
        bankRequestId: id, kind: "system",
        body: `${moi} a refusé ${(offre.amount ?? 0).toLocaleString("fr-FR")} périns. À toi de proposer autre chose.`,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Proposer un prix ──────────────────────────────────────────────────
  // Périns par défaut : le troc se demande, il ne se suppose pas.
  if (b?.offer != null) {
    const montant = Math.max(0, Math.floor(Number(b.offer) || 0));
    if (montant <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });

    // Le VENDEUR annonce son tarif en premier : c'est lui qui a l'objet et qui
    // sait ce qu'il en veut. Le demandeur contre-propose ensuite, une fois qu'il
    // y a un chiffre sur la table — sinon il négociait contre le vide, et le
    // détenteur découvrait un prix avant même d'avoir dit qu'il vendait.
    if (a.req.userId === a.auth.user.id && !estStaff) {
      const dem = await prisma.bankRequest.findUnique({
        where: { id },
        select: { detenteurId: true, offres: { where: { statut: "retenue" }, select: { prix: true } } },
      });
      if (!dem?.detenteurId || dem.offres[0]?.prix == null) {
        return NextResponse.json(
          { error: "Attends qu'un détenteur annonce son tarif — tu pourras contre-proposer ensuite." },
          { status: 409 },
        );
      }
    }

    // Un prix convenu ferme la négociation : le serveur refusait bien
    // d'ACCEPTER une seconde offre, mais laissait en proposer d'autres — on
    // continuait donc de marchander un accord déjà conclu.
    const conclu = await prisma.requestMessage.findFirst({
      where: { bankRequestId: id, kind: "offer", acceptedAt: { not: null } },
      select: { amount: true },
    });
    if (conclu) {
      return NextResponse.json(
        { error: `Le prix est convenu (${(conclu.amount ?? 0).toLocaleString("fr-FR")} périns).` },
        { status: 409 },
      );
    }

    // Une négociation avance par tours. Tant que MON offre est sur la table,
    // c'est à l'autre de répondre : sans cette règle, on empilait trois prix
    // d'affilée et personne ne savait plus lequel comptait.
    const enAttente = await prisma.requestMessage.findFirst({
      where: { bankRequestId: id, kind: "offer", acceptedAt: null, refusedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, userId: true, createdAt: true, amount: true },
    });
    if (enAttente?.userId === a.auth.user.id) {
      return NextResponse.json(
        { error: `Ton offre de ${(enAttente.amount ?? 0).toLocaleString("fr-FR")} périns attend une réponse.` },
        { status: 409 },
      );
    }

    // Cinq minutes entre deux propositions : le temps de la réflexion, pas
    // celui d'une enchère à sens unique.
    const DELAI = 5 * 60_000;
    const mienne = await prisma.requestMessage.findFirst({
      where: { bankRequestId: id, kind: "offer", userId: a.auth.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const attente = mienne ? DELAI - (Date.now() - mienne.createdAt.getTime()) : 0;
    if (attente > 0) {
      return NextResponse.json(
        { error: `Encore ${Math.ceil(attente / 60_000)} min avant de proposer un nouveau prix.` },
        { status: 429 },
      );
    }

    // Contre-proposer, c'est refuser : l'offre d'en face sort de la table.
    if (enAttente) await prisma.requestMessage.update({ where: { id: enAttente.id }, data: { refusedAt: new Date() } });

    const troc = b?.mode === "troc";
    const detail = b.body ? ` — ${String(b.body).slice(0, 300)}` : ".";
    await prisma.requestMessage.create({
      data: {
        bankRequestId: id, userId: a.auth.user.id, author: moi, kind: "offer", amount: montant,
        mode: troc ? "troc" : "perins",
        body: troc
          ? `${estStaff ? "Le staff propose" : `${moi} propose`} un échange en objets, estimé à ${montant.toLocaleString("fr-FR")} périns${detail}`
          : `${estStaff ? "Le staff propose" : `${moi} propose`} ${montant.toLocaleString("fr-FR")} périns${detail}`,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Message simple ────────────────────────────────────────────────────
  const texte = String(b?.body ?? "").trim().slice(0, 2000);
  if (!texte) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  // Un message de coulisses n'existe que si celui qui l'écrit y a droit : le
  // drapeau vient du client, la permission vient du serveur.
  const prive = b?.prive === true && a.coulisses;
  await prisma.requestMessage.create({
    data: { bankRequestId: id, userId: a.auth.user.id, author: moi, kind: "chat", body: texte, prive },
  });

  // Sans Discord, la notification du site est le seul signal. Le staff écrit au
  // demandeur ; le demandeur écrit au staff, qu'on prévient en bloc — on ne sait
  // pas qui traitera la demande, la prévenir nominativement serait un pari.
  if (a.req.userId !== a.auth.user.id && !prive) {
    await prisma.notification
      .create({
        data: {
          userId: a.req.userId,
          type: "REQ_MESSAGE",
          title: "Réponse sur ta demande",
          body: `${a.auth.user.username ?? "Le staff"} t'a répondu à propos de « ${a.req.item ?? "ta demande"} ».`,
          // Droit sur la conversation : la notification amène là où on répond.
          link: `/messages?fil=req:${id}`,
        },
      })
      .catch(() => null);
  } else {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER"] } },
      select: { id: true },
    });
    await prisma.notification
      .createMany({
        data: staff.map((s) => ({
          userId: s.id,
          type: "REQ_MESSAGE",
          title: "Message sur une demande",
          body: `${a.req.username} a écrit à propos de « ${a.req.item ?? "sa demande"} ».`,
          link: `/messages?fil=req:${id}`,
        })),
      })
      .catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
