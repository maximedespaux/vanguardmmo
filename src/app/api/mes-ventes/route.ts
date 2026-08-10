import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

/**
 * Ce que J'AI vendu, et ce que ça m'a rapporté.
 *
 * Le bilan d'un membre existait déjà — mais tourné vers les AUTRES : on
 * l'ouvrait en cliquant le pseudo de quelqu'un, et son volet marchand était
 * réservé au staff. Pour se regarder soi-même, il n'y avait rien. Or c'est la
 * question qu'on se pose le plus souvent : est-ce que ça vaut la peine que je
 * fournisse, et combien ça m'a fait ?
 *
 * Reserve au STAFF. Ce sont ses propres chiffres — mais fournir un objet et en
 * tirer une somme est une activite d'encadrement, et le detail marchand n'a pas
 * a circuler dans toute la guilde.
 *
 * Deux sources de gains, et il faut les deux :
 * Deux états seulement, et jamais additionnés : ce qui est ENCAISSÉ (l'objet
 * est remis) et ce qui est ENGAGÉ (on s'est proposé, l'échange n'est pas
 * conclu). Les mêler ferait un total flatteur et faux.
 *
 * La part de cagnotte a quitté cette page : elle appartient aux commandes
 * farmées à plusieurs, qui se suivent là où elles se prennent.
 */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) {
    return NextResponse.json({ error: "Réservé au staff." }, { status: 403 });
  }
  const moi = a.user.id;

  const [retenues, enCours] = await Promise.all([
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
  ]);

  const perins = retenues.reduce((t, o) => t + Number(o.prix ?? 0), 0);
  const airpoints = retenues.reduce((t, o) => t + Number(o.prixAp ?? 0), 0);

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
    mois,
  });
}
