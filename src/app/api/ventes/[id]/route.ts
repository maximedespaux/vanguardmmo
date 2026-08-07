import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import { detenteursDe, majAnnonceVente, prevenir, prevenirStaff, retirerDuCoffre, vueVente } from "@/lib/ventes";
import { donnerXp } from "@/lib/xp";
import { sansBigInt } from "@/lib/json";
import { prixMixte } from "@/lib/monnaies";

/**
 * La vie d'une vente : qui la prend, quand on se voit, et quand c'est remis.
 *
 * Le principe qui tient l'ensemble : le PREMIER détenteur qui prend la commande
 * la verrouille. Sans ce verrou, deux membres livraient le même objet sans le
 * savoir — le stock est éclaté entre leurs coffres, personne ne voit ce que
 * l'autre fait. Et rien ne se fait en silence : chaque prise est annoncée au
 * demandeur, et le bot la publie dans le salon des ventes.
 *
 * GET  → l'état complet, pour les deux parties.
 * POST → { action: "prendre" | "liberer" | "objet" | "rendezVous" | "enLigne" | "vendu" }
 */

/** Deux « je suis en jeu » à moins de dix minutes disent la même chose. */
const DELAI_EN_JEU = 10 * 60_000;

async function chargerDemande(id: string) {
  return prisma.bankRequest.findUnique({
    where: { id },
    select: {
      id: true, userId: true, username: true, item: true, quantity: true, status: true,
      detenteurId: true, priceEach: true, rendezVous: true,
    },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const { id } = await ctx.params;
  const vue = await vueVente(id, a.user.id);
  if (!vue) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  return NextResponse.json(sansBigInt(vue));
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const action = String(b?.action ?? "");

  const dem = await chargerDemande(id);
  if (!dem) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });

  const estStaff = canAccessAdmin(a.user.role);
  const estDemandeur = dem.userId === a.user.id;
  const estDetenteur = dem.detenteurId === a.user.id;
  const dansLaBoucle = estDemandeur || estDetenteur || estStaff;

  switch (action) {
    /**
     * Prendre la commande. Premier arrivé, premier servi — c'est ce qui évite
     * la double livraison. Les suivants peuvent quand même laisser leur prix :
     * si celui qui a pris se désiste, le demandeur a déjà des options.
     */
    case "prendre": {
      if (!canAccessGuild(a.user.role)) {
        return NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 });
      }
      const entier = (v: unknown) => (v == null || v === "" ? null : Math.max(0, Math.floor(Number(v) || 0)));
      const perins = entier(b?.prix);
      const prixAp = entier(b?.prixAp);
      const tauxAp = entier(b?.tauxAp);
      const prix = perins == null ? null : BigInt(perins);
      // La monnaie « principale » n'a de sens que sur une offre à monnaie
      // unique ; un paiement mixte porte ses deux parts.
      const devise = !perins && prixAp ? "airpoints" : "perins";
      const libre = !dem.detenteurId;

      // La dette n'est ouverte qu'aux membres de la GUILDE : c'est le demandeur
      // qui devra rembourser, et on ne fait pas crédit à quelqu'un qui peut
      // quitter le serveur demain. Le vendeur ne peut donc pas l'accorder seul.
      const client = await prisma.user.findUnique({ where: { id: dem.userId }, select: { role: true } });
      const reglement = b?.reglement === "dette" && client && canAccessGuild(client.role) ? "dette" : "comptant";

      await prisma.offreVente.upsert({
        where: { requestId_userId: { requestId: id, userId: a.user.id } },
        create: { requestId: id, userId: a.user.id, prix, prixAp, tauxAp, devise, reglement, statut: libre ? "retenue" : "proposee" },
        update: { prix, prixAp, tauxAp, devise, reglement, statut: libre ? "retenue" : "proposee" },
      });

      if (libre) {
        await prisma.bankRequest.update({ where: { id }, data: { detenteurId: a.user.id } });
        // Le demandeur doit l'apprendre sans avoir à revenir voir.
        await prevenir(
          dem.userId,
          `${a.user.username} s'occupe de ta demande`,
          `${dem.item ?? "Objet"} — ${prixMixte(prix, prixAp, tauxAp)}${reglement === "dette" ? " à crédit" : ""}. Réponds pour convenir d'une heure, ou dis-lui que tu es en ligne.`,
          `/messages?fil=req:${id}`,
        );
      }
      // Le staff est prévenu de la candidature — pour regarder, se joindre, ou
      // dire non. Il ne BLOQUE rien : la vente avance sans l'attendre, sinon une
      // demande dormirait jusqu'à ce qu'un officier passe.
      void prevenirStaff(
        libre ? `${a.user.username} veut fournir un objet` : `${a.user.username} se propose aussi`,
        `${dem.item ?? "Objet"} pour ${dem.username} — ${prixMixte(prix, prixAp, tauxAp)}${reglement === "dette" ? " à crédit" : ""}.`,
        `/messages?fil=req:${id}`,
        a.user.id,
      );
      void majAnnonceVente(id);
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /**
     * Le staff cautionne l'échange. Ce n'est pas une autorisation — la vente
     * n'a pas attendu — mais le client voit qu'un tiers a regardé.
     */
    case "valider": {
      if (!estStaff) return NextResponse.json({ error: "Réservé au staff." }, { status: 403 });
      const offre = await prisma.offreVente.findFirst({ where: { requestId: id, statut: "retenue" } });
      if (!offre) return NextResponse.json({ error: "Personne ne s'en occupe encore." }, { status: 400 });
      await prisma.offreVente.update({
        where: { id: offre.id },
        data: { valideePar: a.user.id, valideeLe: new Date() },
      });
      await prevenir(
        offre.userId,
        `${a.user.username} a validé ton échange`,
        `${dem.item ?? "L'objet"} — tu peux y aller.`,
        `/messages?fil=req:${id}`,
      );
      if (dem.userId !== a.user.id) {
        await prevenir(
          dem.userId,
          "Ton échange est validé par le staff",
          `${dem.item ?? "L'objet"} — ${a.user.username} a vérifié la transaction.`,
          `/messages?fil=req:${id}`,
        );
      }
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /**
     * En faire une quête de guilde.
     *
     * Un objet que PERSONNE n'a au coffre ne se vend pas : il se farme, et à
     * plusieurs. La demande devient alors une quête participative, en gardant
     * le « pourquoi » — sans la raison, celui qui farme ne sait pas pour qui
     * ni dans quel but, et la quête traîne.
     */
    case "enQuete": {
      if (!estStaff && !estDemandeur) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const deja = await prisma.bankRequest.findUnique({ where: { id }, select: { queteId: true, reason: true } });
      if (deja?.queteId) return NextResponse.json({ error: "Une quête existe déjà pour cette demande." }, { status: 409 });

      const quete = await prisma.quete.create({
        data: {
          auteurId: a.user.id,
          titre: dem.item ?? "Objet demandé",
          quantite: Math.max(1, dem.quantity || 1),
          note: [`Demandé par ${dem.username}`, deja?.reason?.replace(/^Boutique · /, "")].filter(Boolean).join(" — ").slice(0, 500),
          itemRef: dem.item,
        },
      });
      await prisma.bankRequest.update({ where: { id }, data: { queteId: quete.id } });
      await prisma.requestMessage.create({
        data: {
          bankRequestId: id, kind: "system",
          body: `${a.user.username} a ouvert une quête de guilde : plusieurs membres peuvent y contribuer.`,
        },
      });
      await prevenirStaff(
        "Nouvelle quête depuis une demande",
        `${dem.item ?? "Objet"} pour ${dem.username} — personne ne l'a au coffre, on le farme.`,
        `/quetes`,
        a.user.id,
      );
      return NextResponse.json({ ok: true, queteId: quete.id });
    }

    /** Se désister : la demande repart aux autres détenteurs. */
    case "liberer": {
      if (!estDetenteur && !estStaff) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      await prisma.offreVente.updateMany({
        where: { requestId: id, userId: dem.detenteurId ?? a.user.id },
        data: { statut: "retiree" },
      });
      await prisma.bankRequest.update({ where: { id }, data: { detenteurId: null, rendezVous: null } });
      void majAnnonceVente(id);
      await prevenir(
        dem.userId,
        "Ta demande cherche un nouveau détenteur",
        `${a.user.username} s'est désisté pour ${dem.item ?? "l'objet"}.`,
        `/messages?fil=req:${id}`,
      );
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /** « Je l'ai bien » — coché avant de discuter, pas après. */
    case "objet": {
      const offre = await prisma.offreVente.findUnique({
        where: { requestId_userId: { requestId: id, userId: a.user.id } },
      });
      if (!offre) return NextResponse.json({ error: "Prends d'abord la commande." }, { status: 400 });
      const aObjet = b?.aObjet !== false;
      await prisma.offreVente.update({ where: { id: offre.id }, data: { aObjet } });
      // Le client attend surtout CETTE information : l'objet existe vraiment.
      if (aObjet && dem.userId !== a.user.id) {
        await prevenir(
          dem.userId,
          `${a.user.username} a vérifié l'objet`,
          `${dem.item ?? "L'objet"} est bien en sa possession. Il reste à convenir d'une heure.`,
          `/messages?fil=req:${id}`,
        );
      }
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /**
     * Fixer l'heure de la remise. Deux joueurs qui ne se croisent jamais ne
     * concluent rien ; « je suis en ligne » ne vaut que sur l'instant.
     */
    case "rendezVous": {
      if (!dansLaBoucle) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const quand = b?.quand ? new Date(String(b.quand)) : null;
      if (quand && Number.isNaN(quand.getTime())) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
      await prisma.bankRequest.update({
        where: { id },
        data: { rendezVous: quand, rendezVousPar: quand ? a.user.id : null, rendezVousOk: false },
      });
      const autre = a.user.id === dem.userId ? dem.detenteurId : dem.userId;
      if (autre && quand) {
        await prevenir(
          autre,
          `${a.user.username} propose un rendez-vous`,
          `${dem.item ?? "Objet"} — ${quand.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}. Confirme sur le site si ça te va.`,
          `/messages?fil=req:${id}`,
        );
      }
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /** « Ça me va » : sans confirmation, une heure n'est qu'une proposition. */
    case "rdvOk": {
      if (!dansLaBoucle) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const d = await prisma.bankRequest.findUnique({ where: { id }, select: { rendezVous: true, rendezVousPar: true } });
      if (!d?.rendezVous) return NextResponse.json({ error: "Aucune heure proposée." }, { status: 400 });
      if (d.rendezVousPar === a.user.id) {
        return NextResponse.json({ error: "C'est toi qui l'as proposée — attends sa réponse." }, { status: 409 });
      }
      await prisma.bankRequest.update({ where: { id }, data: { rendezVousOk: true } });
      if (d.rendezVousPar) {
        await prevenir(
          d.rendezVousPar,
          `${a.user.username} confirme le rendez-vous`,
          `${dem.item ?? "Objet"} — ${d.rendezVous.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}.`,
          `/messages?fil=req:${id}`,
        );
      }
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /**
     * « Je suis en jeu, maintenant » : la présence passive ne suffit pas à faire
     * venir l'autre.
     *
     * Une fois, pas dix. Rien n'empêchait de recliquer, et chaque clic partait
     * en notification ET en MP Discord : trois « est en jeu » identiques à la
     * suite, pour une information qui n'a pas changé. La notification déjà
     * posée fait donc office de verrou — le geste est sans effet pendant dix
     * minutes, et on le dit plutôt que de faire semblant.
     */
    case "enLigne": {
      if (!dansLaBoucle) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const autre = a.user.id === dem.userId ? dem.detenteurId : dem.userId;
      if (!autre) return NextResponse.json({ error: "Personne en face pour l'instant." }, { status: 400 });
      const lien = `/messages?fil=req:${id}`;
      const recent = await prisma.notification.findFirst({
        where: { userId: autre, type: "vente_enjeu", link: lien, createdAt: { gt: new Date(Date.now() - DELAI_EN_JEU) } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (recent) {
        const minutes = Math.max(1, Math.round((Date.now() - recent.createdAt.getTime()) / 60_000));
        return NextResponse.json({ ok: true, deja: true, message: `Déjà signalé il y a ${minutes} min — laisse-lui le temps de voir.` });
      }
      await prevenir(
        autre,
        `${a.user.username} est en jeu`,
        `Pour ${dem.item ?? "l'objet"} — connecte-toi, c'est le moment.`,
        lien,
        "vente_enjeu",
      );
      return NextResponse.json({ ok: true, message: "C'est signalé — l'autre reçoit une notification et un MP." });
    }

    /**
     * « C'est maintenant » : le rendez-vous, c'est tout de suite.
     *
     * Proposer une heure puis annoncer qu'on est en jeu, c'était deux gestes et
     * surtout DEUX notifications pour une seule intention. Ici l'heure est
     * posée et l'autre prévenu une fois — avec le même verrou de dix minutes
     * que « je suis connecté ».
     */
    case "maintenant": {
      if (!dansLaBoucle) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const autre = a.user.id === dem.userId ? dem.detenteurId : dem.userId;
      if (!autre) return NextResponse.json({ error: "Personne en face pour l'instant." }, { status: 400 });
      const lien = `/messages?fil=req:${id}`;
      const recent = await prisma.notification.findFirst({
        where: { userId: autre, type: "vente_enjeu", link: lien, createdAt: { gt: new Date(Date.now() - DELAI_EN_JEU) } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      await prisma.bankRequest.update({
        where: { id },
        data: { rendezVous: new Date(), rendezVousPar: a.user.id, rendezVousOk: false },
      });
      if (!recent) {
        await prevenir(
          autre,
          `${a.user.username} est en jeu, maintenant`,
          `Pour ${dem.item ?? "l'objet"} — il propose de le faire tout de suite.`,
          lien,
          "vente_enjeu",
        );
      }
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /**
     * Remis. Le stock sort du coffre du VENDEUR — sans ça la boutique continue
     * d'afficher un objet déjà parti, et la demande suivante tombe dans le vide.
     */
    case "vendu": {
      if (!estDetenteur && !estStaff) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      if (!dem.item) return NextResponse.json({ error: "Demande sans objet." }, { status: 400 });

      const vendeur = await prisma.user.findUnique({
        where: { id: dem.detenteurId ?? a.user.id },
        select: { id: true, username: true },
      });
      const quantite = Math.max(1, Math.floor(Number(b?.quantite) || dem.quantity || 1));

      // On retire sur la clé que ce vendeur possède réellement : une arme est
      // rangée par rareté, et retirer sur la clé nue ne toucherait rien.
      const miens = await detenteursDe(dem.item);
      const aLObjet = vendeur && miens.some((d) => d.pseudo.toLowerCase() === vendeur.username.toLowerCase());
      let stock: { avant: number; apres: number } | null = null;
      if (vendeur && aLObjet) stock = await retirerDuCoffre(vendeur.username, dem.item, quantite);

      // Achat ou dette : la demande garde la nature de la transaction, c'est
      // elle qu'on relira dans six mois pour savoir qui doit quoi.
      const offreRetenue = await prisma.offreVente.findFirst({ where: { requestId: id, statut: "retenue" } });
      await prisma.bankRequest.update({
        where: { id },
        data: {
          status: "REMIS",
          modePaiement: offreRetenue?.devise ?? "perins",
          prixFinal: offreRetenue?.prix ?? undefined,
        },
      });
      if (vendeur) {
        await donnerXp(vendeur.id, "quete", 100, `Vente remise : ${quantite} × ${dem.item}`, `vente:${id}`);
        await prevenir(
          dem.userId,
          "Ton objet a été remis",
          `${quantite} × ${dem.item} par ${vendeur.username}.`,
          `/messages?fil=req:${id}`,
        );
      }
      void majAnnonceVente(id);
      return NextResponse.json({ ok: true, stock });
    }

    /**
     * Clore la demande — réglée ailleurs, ou abandonnée.
     *
     * « Échange fait » appartient au détenteur et sort l'objet de SON coffre.
     * Clore est autre chose : le demandeur n'a plus besoin de l'objet, ou il
     * l'a eu autrement. Sans ce geste, une demande morte restait « en attente »
     * pour toujours et polluait la liste de chacun.
     */
    case "clore": {
      if (!estDemandeur && !estStaff) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const abandon = b?.issue !== "fait";
      await prisma.bankRequest.update({
        where: { id },
        data: { status: abandon ? "ANNULE" : "REMIS", detenteurId: null, rendezVous: null },
      });
      await prisma.offreVente.updateMany({ where: { requestId: id, statut: "retenue" }, data: { statut: "retiree" } });
      await prisma.requestMessage.create({
        data: {
          bankRequestId: id, kind: "system",
          body: abandon
            ? `${a.user.username} a abandonné cette demande.`
            : `${a.user.username} a clos cette demande : c'est réglé.`,
        },
      });
      // Celui qui s'en occupait doit l'apprendre : il gardait l'objet de côté.
      if (dem.detenteurId && dem.detenteurId !== a.user.id) {
        await prevenir(
          dem.detenteurId,
          abandon ? "Demande abandonnée" : "Demande close",
          `${dem.item ?? "L'objet"} — tu peux le remettre en vente.`,
          `/messages?fil=req:${id}`,
        );
      }
      void majAnnonceVente(id);
      return NextResponse.json({ ok: true });
    }

    /**
     * Rouvrir une demande abandonnée. Un clic malheureux sur « Abandonner » la
     * fermait pour de bon : il fallait tout refaire. Réservé aux demandes
     * annulées — « échange fait » a sorti l'objet d'un coffre, ça ne se défait
     * pas d'un bouton.
     */
    case "rouvrir": {
      if (!estDemandeur && !estStaff) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      if (dem.status !== "ANNULE" && dem.status !== "REFUSE")
        return NextResponse.json({ error: "Seule une demande abandonnée se rouvre." }, { status: 400 });
      await prisma.bankRequest.update({ where: { id }, data: { status: "PENDING" } });
      await prisma.requestMessage.create({
        data: { bankRequestId: id, kind: "system", body: `${a.user.username} a rouvert cette demande.` },
      });
      void majAnnonceVente(id);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
}
