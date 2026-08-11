import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

/**
 * Les chiffres de la guilde, pour le staff.
 *
 * Le journal raconte les événements un par un ; ici on regarde l'ensemble :
 * qui porte l'entraide, qui ne fait que demander, et si l'activité monte ou
 * descend. Deux besoins différents, deux pages — mélangés, on ne fait ni l'un
 * ni l'autre.
 *
 * Tout est recalculé à la lecture. À l'échelle d'une guilde c'est instantané,
 * et un compteur entretenu à la main finit toujours par mentir.
 */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const ilYa30Jours = new Date(Date.now() - 30 * 864e5);

  const [membres, apports, quetes, demandes] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true, avatar: true, discordId: true, role: true, lastSeenAt: true } }),
    prisma.queteContribution.findMany({
      where: { statut: "confirme" },
      select: { userId: true, quantite: true, confirmeAt: true, quete: { select: { titre: true } } },
    }),
    prisma.quete.findMany({ select: { id: true, statut: true, auteurId: true, createdAt: true } }),
    prisma.bankRequest.findMany({
      select: {
        userId: true, username: true, status: true, createdAt: true,
        // Le devenir d'une vente : qui l'a fournie, combien elle a rapporté, comment
        // elle a été payée, et quand elle s'est conclue. Sans `detenteurId` on ne sait
        // pas QUI vend, sans `updatedAt` on ne sait pas en combien de temps.
        detenteurId: true, prixFinal: true, modePaiement: true, updatedAt: true,
      },
    }),
  ]);

  /* Le classement se faisait sur l'XP. Elle a ete retiree : on classe donc sur
     ce qu'on mesurait vraiment a travers elle — les UNITES APPORTEES, c'est-a-dire
     ce que quelqu'un a effectivement ramene et qu'un autre a confirme recevoir. */
  const parMembre = membres
    .map((m) => {
      const siens = apports.filter((c) => c.userId === m.id);
      return {
        id: m.id,
        nom: m.username,
        role: m.role,
        avatar: m.avatar ? `https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png?size=64` : null,
        unitesApportees: siens.reduce((s, c) => s + c.quantite, 0),
        // Combien de fois il a livré, indépendamment des quantités : dix
        // livraisons de un ne se lisent pas comme une livraison de dix.
        livraisons: siens.length,
        demandes: demandes.filter((d) => d.username === m.username).length,
        quetesOuvertes: quetes.filter((q) => q.auteurId === m.id).length,
        actifRecemment: !!m.lastSeenAt && m.lastSeenAt > ilYa30Jours,
      };
    })
    .filter((m) => m.unitesApportees || m.demandes || m.quetesOuvertes)
    .sort((x, y) => y.unitesApportees - x.unitesApportees);

  // Les 30 derniers jours, jour par jour : une activité qui s'effondre se voit
  // sur une courbe, jamais sur un total.
  const parJour: { jour: string; apports: number; demandes: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const jour = d.toISOString().slice(0, 10);
    parJour.push({
      jour,
      apports: apports.filter((c) => c.confirmeAt?.toISOString().slice(0, 10) === jour).reduce((s, c) => s + c.quantite, 0),
      demandes: demandes.filter((r) => r.createdAt.toISOString().slice(0, 10) === jour).length,
    });
  }

  /* ── Le devenir des ventes ────────────────────────────────────────────────
     « Combien de demandes » ne disait rien : une demande refusée, une abandonnée
     et une servie comptaient pareil. On sépare donc les issues, et on mesure ce
     qui coûte vraiment à la guilde — l'abandon, c'est-à-dire quelqu'un qui a
     demandé et n'a rien eu.

     Note de lecture : un troc ne renseigne pas `prixFinal` (il n'y a pas de somme
     à réclamer), donc le volume en périns ne couvre que les ventes payées en
     périns. Le compter comme un manque à gagner serait faux. */
  const parEtat = (e: string) => demandes.filter((d) => d.status === e);
  const servies = parEtat("REMIS");
  const abandons = parEtat("ANNULE");
  const refus = parEtat("REFUSE");
  const encours = demandes.filter((d) => ["PENDING", "ACCEPTE_ACHAT", "ACCEPTE_DETTE", "EN_ECHANGE"].includes(d.status));
  const conclues = servies.length + abandons.length + refus.length;

  /* Délai médian et non moyen : une seule demande oubliée trois mois tirerait la
     moyenne et ferait croire que tout traîne. */
  const delais = servies
    .map((d) => (d.updatedAt.getTime() - d.createdAt.getTime()) / 864e5)
    .filter((j) => j >= 0)
    .sort((a, b) => a - b);
  const delaiMedian = delais.length ? delais[Math.floor(delais.length / 2)] : null;

  /* Qui fournit. `detenteurId` est l'identifiant du membre qui s'est engagé : tant
     qu'il est nul, la demande n'a personne en face — c'est ce vide qui la fait
     dormir, et il se compte. */
  const nomDe = new Map(membres.map((m) => [m.id, m.username]));
  const parVendeur = new Map<string, { nom: string; servies: number; perins: number }>();
  for (const d of servies) {
    if (!d.detenteurId) continue;
    const e = parVendeur.get(d.detenteurId) ?? { nom: nomDe.get(d.detenteurId) ?? "—", servies: 0, perins: 0 };
    e.servies++;
    e.perins += Number(d.prixFinal ?? 0);
    parVendeur.set(d.detenteurId, e);
  }

  const ventes = {
    servies: servies.length,
    abandons: abandons.length,
    refus: refus.length,
    enCours: encours.length,
    sansDetenteur: encours.filter((d) => !d.detenteurId).length,
    /* Sur les demandes CONCLUES seulement : inclure celles en cours ferait baisser
       le taux à mesure que de nouvelles arrivent, ce qui n'a aucun sens. */
    tauxAbandon: conclues ? Math.round((abandons.length / conclues) * 100) : null,
    tauxService: conclues ? Math.round((servies.length / conclues) * 100) : null,
    delaiMedianJours: delaiMedian != null ? Math.round(delaiMedian * 10) / 10 : null,
    volumePerins: servies.reduce((s, d) => s + Number(d.prixFinal ?? 0), 0),
    partTroc: servies.length ? Math.round((servies.filter((d) => d.modePaiement === "troc").length / servies.length) * 100) : null,
    parVendeur: [...parVendeur.values()].sort((a, b) => b.servies - a.servies).slice(0, 10),
  };

  return NextResponse.json({
    ventes,
    totaux: {
      membresActifs: parMembre.filter((m) => m.actifRecemment).length,
      quetesOuvertes: quetes.filter((q) => q.statut === "ouverte").length,
      quetesLivrees: quetes.filter((q) => q.statut === "livree").length,
      unitesApportees: apports.reduce((s, c) => s + c.quantite, 0),
      demandesEnAttente: demandes.filter((d) => d.status === "PENDING").length,
      demandesTotal: demandes.length,
    },
    parMembre,
    parJour,
  });
}
