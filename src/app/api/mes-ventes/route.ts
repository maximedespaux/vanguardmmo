import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { partager } from "@/lib/quetes";

/**
 * Ce que J'AI vendu, et ce que ça m'a rapporté.
 *
 * Le bilan d'un membre existait déjà — mais tourné vers les AUTRES : on
 * l'ouvrait en cliquant le pseudo de quelqu'un, et son volet marchand était
 * réservé au staff. Pour se regarder soi-même, il n'y avait rien. Or c'est la
 * question qu'on se pose le plus souvent : est-ce que ça vaut la peine que je
 * fournisse, et combien ça m'a fait ?
 *
 * Pas de question de permission ici : ce sont mes propres chiffres.
 *
 * Deux sources de gains, et il faut les deux :
 *  — la VENTE directe, quand j'avais l'objet et que je l'ai remis ;
 *  — la PART DE CAGNOTTE, quand la guilde a farmé une commande à plusieurs et
 *    que j'y ai apporté ma part. Ne compter que la première effacerait tout
 *    l'intérêt de farmer ensemble.
 */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const moi = a.user.id;

  const [retenues, enCours, mesApports] = await Promise.all([
    // Mes ventes conclues : l'offre a été retenue ET l'objet a été remis.
    prisma.offreVente.findMany({
      where: { userId: moi, statut: "retenue", request: { status: "REMIS" } },
      select: {
        id: true, prix: true, prixAp: true, createdAt: true,
        request: { select: { id: true, item: true, quantity: true, username: true } },
      },
      orderBy: { createdAt: "desc" }, take: 200,
    }),
    // Ce qui est promis mais pas encore remis : c'est de l'argent en attente,
    // pas de l'argent gagné. Les mélanger gonflerait le bilan.
    prisma.offreVente.findMany({
      where: { userId: moi, statut: "retenue", request: { status: { not: "REMIS" } } },
      select: {
        id: true, prix: true, prixAp: true,
        request: { select: { id: true, item: true, quantity: true, username: true, status: true } },
      },
      orderBy: { createdAt: "desc" }, take: 50,
    }),
    prisma.queteContribution.findMany({
      where: { userId: moi },
      select: { id: true, quantite: true, statut: true, confirmeAt: true, createdAt: true, queteId: true },
      orderBy: { createdAt: "desc" }, take: 200,
    }),
  ]);

  /* La part de cagnotte se recalcule ici, elle ne se stocke pas : le tarif
     bouge tant que la commande se négocie, et une part figée mentirait. On
     recharge donc les quêtes concernées avec TOUS leurs apports — ma part
     dépend de ce que les autres ont ramené, pas seulement de moi. */
  const idsQuetes = [...new Set(mesApports.map((c) => c.queteId))];
  const quetes = idsQuetes.length
    ? await prisma.quete.findMany({
        where: { id: { in: idsQuetes } },
        select: {
          id: true, titre: true, quantite: true, statut: true,
          contributions: { select: { id: true, userId: true, quantite: true, statut: true } },
        },
      })
    : [];
  const demandesDesQuetes = idsQuetes.length
    ? await prisma.bankRequest.findMany({
        where: { queteId: { in: idsQuetes } },
        select: { queteId: true, priceEach: true, prixFinal: true, quantity: true },
      })
    : [];
  const tarif = new Map(demandesDesQuetes.map((d) => [d.queteId!, d]));
  const cagnotteDe = (queteId: string) => {
    const d = tarif.get(queteId);
    if (!d) return 0;
    if (d.prixFinal != null) return Number(d.prixFinal);
    return d.priceEach ? d.priceEach * Math.max(1, d.quantity || 1) : 0;
  };

  const parts: { queteId: string; titre: string; quantite: number; part: number; acquise: boolean; date: string }[] = [];
  for (const q of quetes) {
    const cagnotte = cagnotteDe(q.id);
    if (!cagnotte) continue;
    const confirmes = q.contributions.filter((c) => c.statut === "confirme");
    const repartition = partager(cagnotte, confirmes.map((c) => ({ id: c.id, quantite: c.quantite })));
    // Ce qui est seulement annoncé se chiffre sur la quantité DEMANDÉE : tant
    // que la quête n'est pas pleine, la cagnotte n'est pas due en entier.
    const base = Math.max(q.quantite, q.contributions.reduce((s, c) => s + c.quantite, 0));
    for (const c of mesApports.filter((x) => x.queteId === q.id)) {
      const acquise = c.statut === "confirme";
      const part = acquise ? (repartition[c.id] ?? 0) : Math.round((cagnotte * c.quantite) / base);
      if (!part) continue;
      parts.push({
        queteId: q.id, titre: q.titre, quantite: c.quantite, part, acquise,
        date: (c.confirmeAt ?? c.createdAt).toISOString(),
      });
    }
  }

  const perins = retenues.reduce((t, o) => t + Number(o.prix ?? 0), 0);
  const airpoints = retenues.reduce((t, o) => t + Number(o.prixAp ?? 0), 0);
  const partsAcquises = parts.filter((p) => p.acquise).reduce((t, p) => t + p.part, 0);
  const partsAttendues = parts.filter((p) => !p.acquise).reduce((t, p) => t + p.part, 0);

  /* Les six derniers mois, pour voir si ça monte ou si ça s'arrête. Un total
     seul ne dit jamais ça : quelqu'un qui a beaucoup vendu l'an dernier et plus
     rien depuis affiche le même chiffre qu'un vendeur régulier. */
  const mois: { mois: string; perins: number; ventes: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const clef = d.toISOString().slice(0, 7);
    const dedans = retenues.filter((o) => o.createdAt.toISOString().slice(0, 7) === clef);
    mois.push({
      mois: clef,
      perins: dedans.reduce((t, o) => t + Number(o.prix ?? 0), 0),
      ventes: dedans.length,
    });
  }

  return NextResponse.json({
    totaux: {
      ventes: retenues.length,
      perins,
      airpoints,
      partsAcquises,
      partsAttendues,
      enAttente: enCours.length,
      // Ce que valent les ventes engagées mais pas encore remises.
      perinsEnAttente: enCours.reduce((t, o) => t + Number(o.prix ?? 0), 0),
    },
    ventes: retenues.map((o) => ({
      id: o.id, item: o.request.item ?? "objet", quantite: o.request.quantity,
      pour: o.request.username, perins: Number(o.prix ?? 0), airpoints: Number(o.prixAp ?? 0),
      date: o.createdAt.toISOString(),
    })),
    engagees: enCours.map((o) => ({
      id: o.id, item: o.request.item ?? "objet", quantite: o.request.quantity,
      pour: o.request.username, perins: Number(o.prix ?? 0), etat: o.request.status,
    })),
    parts: parts.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 50),
    mois,
  });
}
