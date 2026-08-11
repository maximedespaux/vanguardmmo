import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

/**
 * Le profil du membre connecté, et lui seul.
 *
 * Pourquoi une route dédiée alors que les données existent déjà ailleurs : elles
 * sont dispersées. L'identité vient de Discord, les commandes de BankRequest, les
 * mouvements de périns de BankTransaction, les personnages du builder. Un membre
 * qui veut savoir « où en est ma commande » ouvrait trois écrans.
 *
 * Le regard du staff sur un AUTRE membre n'est pas ici : c'est /guildviewer. Cette
 * route ne lit jamais que `a.user.id`, il n'y a pas de paramètre pour viser
 * quelqu'un d'autre — c'est le plus simple moyen de ne pas se tromper.
 */

/** Une commande = un panier. `batchId` regroupe les lignes d'un même achat. */
function grouperEnCommandes(lignes: Awaited<ReturnType<typeof lireRequetes>>) {
  const paniers = new Map<string, typeof lignes>();
  for (const l of lignes) {
    // Sans batchId, la ligne est une commande à elle seule (une requête sur mesure).
    const cle = l.batchId || `seule:${l.id}`;
    if (!paniers.has(cle)) paniers.set(cle, []);
    paniers.get(cle)!.push(l);
  }
  return [...paniers.entries()].map(([cle, ls]) => {
    const premiere = ls[0];
    const total = ls.reduce((s, l) => s + Number(l.prixFinal ?? 0), 0);
    return {
      id: cle,
      cree: premiere.createdAt,
      // Un panier peut mêler des lignes à des états différents (une acceptée, une
      // refusée) : on montre l'état le moins avancé, celui qui demande encore
      // quelque chose. Annoncer « remis » quand une ligne traîne serait faux.
      statut: etatLeMoinsAvance(ls.map((l) => l.status)),
      origine: premiere.origine,
      paiement: premiere.modePaiement,
      total: total || null,
      dateSouhaitee: premiere.dateSouhaitee,
      rendezVous: premiere.rendezVous,
      aUnDetenteur: ls.some((l) => !!l.detenteurId),
      lignes: ls.map((l) => ({
        id: l.id,
        item: l.item,
        quantite: l.quantity,
        categorie: l.cat,
        statut: l.status,
        prix: l.prixFinal != null ? Number(l.prixFinal) : null,
        personnage: l.characterName,
      })),
    };
  });
}

// Du moins avancé au plus avancé. Les états terminaux négatifs (refusé, annulé) ne
// « bloquent » rien : une ligne refusée dans un panier servi ne rend pas le panier
// en attente, elle est juste sortie du parcours.
const ORDRE = ["PENDING", "ACCEPTE_ACHAT", "ACCEPTE_DETTE", "EN_ECHANGE", "REMIS"] as const;
function etatLeMoinsAvance(etats: string[]): string {
  const vivants = etats.filter((e) => e !== "REFUSE" && e !== "ANNULE");
  if (!vivants.length) return etats.includes("REFUSE") ? "REFUSE" : "ANNULE";
  return vivants.reduce((min, e) => (ORDRE.indexOf(e as never) < ORDRE.indexOf(min as never) ? e : min), vivants[0]);
}

const lireRequetes = (userId: string) =>
  prisma.bankRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200, // deux cents lignes couvrent largement un historique de membre
    select: {
      id: true, batchId: true, item: true, quantity: true, cat: true, status: true,
      origine: true, modePaiement: true, prixFinal: true, characterName: true,
      detenteurId: true, dateSouhaitee: true, rendezVous: true, createdAt: true,
    },
  });

export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const u = a.user;

  const [requetes, mouvements, persos, prefs] = await Promise.all([
    lireRequetes(u.id),
    prisma.bankTransaction.findMany({
      where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, type: true, item: true, amount: true, status: true, description: true, createdAt: true },
    }),
    prisma.character.findMany({
      where: { userId: u.id }, orderBy: [{ isMain: "desc" }, { level: "desc" }],
      select: { id: true, name: true, class: true, level: true, prestige: true, isMain: true, _count: { select: { gearProfiles: true } } },
    }),
    prisma.userPref.findMany({ where: { userId: u.id }, select: { key: true, value: true } }),
  ]);

  const commandes = grouperEnCommandes(requetes);
  return NextResponse.json({
    // Identité : en lecture seule, et la page le dit. Le pseudo et le rôle sont
    // resynchronisés depuis Discord à chaque connexion — les rendre modifiables
    // ici créerait un conflit qui se rejouerait à la prochaine ouverture.
    identite: {
      pseudo: u.username, role: u.role,
      membreDepuis: u.createdAt, verifieLe: u.verifiedAt,
      partageBuild: u.sharePublic, lienBuild: u.shareId,
    },
    commandes,
    compteurs: {
      commandes: commandes.length,
      enCours: commandes.filter((c) => !["REMIS", "REFUSE", "ANNULE"].includes(c.statut)).length,
      personnages: persos.length,
      stuffs: persos.reduce((s, p) => s + p._count.gearProfiles, 0),
    },
    mouvements: mouvements.map((m) => ({ ...m, amount: Number(m.amount) })),
    personnages: persos.map((p) => ({ ...p, stuffs: p._count.gearProfiles, _count: undefined })),
    preferences: Object.fromEntries(prefs.map((p) => [p.key, p.value])),
  });
}
