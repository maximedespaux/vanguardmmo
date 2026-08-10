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
    prisma.bankRequest.findMany({ select: { userId: true, username: true, status: true, createdAt: true } }),
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

  return NextResponse.json({
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
