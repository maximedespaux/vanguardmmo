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

  /* Ce que tu vends le plus. Regroupé sur le NOM de l'objet, accents et casse
     normalisés : « Tenue d'Arcaniste » et « tenue d'arcaniste » sont le même
     article, et deux lignes distinctes feraient croire à deux marchés.
     On garde le libellé le plus fréquent pour l'affichage, pas le premier venu. */
  const parObjet = new Map<string, { libelles: Map<string, number>; ventes: number; unites: number; perins: number }>();
  for (const o of retenues) {
    const nom = (o.request.item ?? "objet").trim();
    const k = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const e = parObjet.get(k) ?? { libelles: new Map(), ventes: 0, unites: 0, perins: 0 };
    e.libelles.set(nom, (e.libelles.get(nom) ?? 0) + 1);
    e.ventes++;
    e.unites += o.request.quantity ?? 1;
    e.perins += Number(o.prix ?? 0);
    parObjet.set(k, e);
  }
  const topObjets = [...parObjet.values()]
    .map((e) => ({
      item: [...e.libelles.entries()].sort((a, b) => b[1] - a[1])[0][0],
      ventes: e.ventes, unites: e.unites, perins: e.perins,
    }))
    /* Classé sur les périns et non sur le nombre : vendre dix potions n'est pas
       le même métier que vendre une arme, et c'est l'argent qu'on vient regarder. */
    .sort((a, b) => b.perins - a.perins || b.ventes - a.ventes)
    .slice(0, 8);

  /* Le devenir de ce que tu as pris en charge : ce qui est remis, et ce qui traîne.
     Une vente engagée n'est pas une vente — la distinction existe déjà dans les
     totaux, on la détaille ici par état pour voir OÙ ça bloque. */
  const parEtat = new Map<string, number>();
  for (const o of enCours) parEtat.set(o.request.status, (parEtat.get(o.request.status) ?? 0) + 1);
  const issues = {
    remises: retenues.length,
    parEtat: [...parEtat.entries()].map(([etat, n]) => ({ etat, n })).sort((a, b) => b.n - a.n),
  };

  return NextResponse.json({
    topObjets,
    issues,
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
