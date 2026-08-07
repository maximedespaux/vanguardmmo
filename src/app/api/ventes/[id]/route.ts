import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import { detenteursDe, majAnnonceVente, retirerDuCoffre, vueVente } from "@/lib/ventes";
import { donnerXp } from "@/lib/xp";
import { sansBigInt } from "@/lib/json";

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
      const prix = b?.prix == null || b.prix === "" ? null : BigInt(Math.max(0, Math.floor(Number(b.prix) || 0)));
      const libre = !dem.detenteurId;

      await prisma.offreVente.upsert({
        where: { requestId_userId: { requestId: id, userId: a.user.id } },
        create: { requestId: id, userId: a.user.id, prix, statut: libre ? "retenue" : "proposee" },
        update: { prix, statut: libre ? "retenue" : "proposee" },
      });

      if (libre) {
        await prisma.bankRequest.update({ where: { id }, data: { detenteurId: a.user.id } });
        // Le demandeur doit l'apprendre sans avoir à revenir voir.
        await prisma.notification.create({
          data: {
            userId: dem.userId, type: "vente",
            title: `${a.user.username} s'occupe de ta demande`,
            body: `${dem.item ?? "Objet"}${prix ? ` — ${Number(prix).toLocaleString("fr-FR")} périns` : ""}`,
            link: `/requetes/${id}`,
          },
        });
      }
      void majAnnonceVente(id);
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
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
      await prisma.notification.create({
        data: {
          userId: dem.userId, type: "vente",
          title: "Ta demande cherche un nouveau détenteur",
          body: `${a.user.username} s'est désisté pour ${dem.item ?? "l'objet"}.`,
          link: `/requetes/${id}`,
        },
      });
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /** « Je l'ai bien » — coché avant de discuter, pas après. */
    case "objet": {
      const offre = await prisma.offreVente.findUnique({
        where: { requestId_userId: { requestId: id, userId: a.user.id } },
      });
      if (!offre) return NextResponse.json({ error: "Prends d'abord la commande." }, { status: 400 });
      await prisma.offreVente.update({ where: { id: offre.id }, data: { aObjet: b?.aObjet !== false } });
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
      await prisma.bankRequest.update({ where: { id }, data: { rendezVous: quand } });
      const autre = a.user.id === dem.userId ? dem.detenteurId : dem.userId;
      if (autre && quand) {
        await prisma.notification.create({
          data: {
            userId: autre, type: "vente",
            title: `${a.user.username} propose un rendez-vous`,
            body: `${dem.item ?? "Objet"} — ${quand.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
            link: `/requetes/${id}`,
          },
        });
      }
      return NextResponse.json(sansBigInt((await vueVente(id, a.user.id))!));
    }

    /** « Je suis là, maintenant » : la présence passive ne suffit pas à faire venir l'autre. */
    case "enLigne": {
      if (!dansLaBoucle) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const autre = a.user.id === dem.userId ? dem.detenteurId : dem.userId;
      if (!autre) return NextResponse.json({ error: "Personne en face pour l'instant." }, { status: 400 });
      await prisma.notification.create({
        data: {
          userId: autre, type: "vente",
          title: `${a.user.username} est en ligne`,
          body: `Pour ${dem.item ?? "l'objet"} — c'est le moment.`,
          link: `/requetes/${id}`,
        },
      });
      return NextResponse.json({ ok: true });
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

      await prisma.bankRequest.update({ where: { id }, data: { status: "REMIS" } });
      if (vendeur) {
        await donnerXp(vendeur.id, "quete", 100, `Vente remise : ${quantite} × ${dem.item}`, `vente:${id}`);
        await prisma.notification.create({
          data: {
            userId: dem.userId, type: "vente",
            title: "Ton objet a été remis",
            body: `${quantite} × ${dem.item} par ${vendeur.username}.`,
            link: `/requetes/${id}`,
          },
        });
      }
      void majAnnonceVente(id);
      return NextResponse.json({ ok: true, stock });
    }

    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
}
