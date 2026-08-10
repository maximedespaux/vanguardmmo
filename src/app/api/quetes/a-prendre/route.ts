import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

/**
 * Les requêtes d'objets qui attendent que quelqu'un s'en charge.
 *
 * Une requête d'objet pouvait déjà devenir une quête de guilde — le bouton
 * existait, mais au fond de la conversation, et seuls le demandeur et le staff
 * le voyaient. Résultat : neuf requêtes sur dix dormaient sans quête, invisibles
 * de la page où l'on vient justement chercher quoi farmer.
 *
 * Elles remontent donc ici, avant d'être des quêtes. N'importe quel membre peut
 * en ouvrir une : c'est un geste d'entraide, pas un engagement — celui qui
 * ouvre ne promet rien, il rend seulement la demande visible et rejoignable.
 *
 * Ce qui est déjà pris en charge par un détenteur n'apparaît pas : l'objet
 * existe au coffre de quelqu'un, il n'y a rien à farmer.
 */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) {
    return NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 });
  }

  const brutes = await prisma.bankRequest.findMany({
    where: {
      queteId: null,
      detenteurId: null,
      status: { in: ["PENDING", "ACCEPTE_ACHAT", "ACCEPTE_DETTE", "EN_ECHANGE"] },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      id: true, item: true, quantity: true, username: true, userId: true,
      createdAt: true, reason: true, spec: true, cat: true, priceEach: true,
      origine: true, batchId: true,
    },
  });

  /* `origine` n'existe que depuis la distinction achat / requete : elle vaut
     null sur toutes les demandes anterieures, et filtrer dessus les effacait
     toutes. On retombe donc sur la meme regle que la messagerie — une spec
     signe l'objet sur mesure, un batchId signe le panier — pour que les deux
     ecrans ne classent pas la meme demande differemment. */
  const estRequete = (r: { origine: string | null; spec: unknown; batchId: string | null }) =>
    r.origine === "requete" || (r.origine !== "achat" && (r.spec ? true : !r.batchId));

  return NextResponse.json(
    brutes.filter(estRequete).slice(0, 60).map((r) => ({
      id: r.id,
      item: r.item ?? "Objet",
      quantite: r.quantity || 1,
      demandeur: r.username,
      estLaMienne: r.userId === a.user.id,
      // La raison dit POURQUOI on farmerait ça : c'est elle qui décide quelqu'un.
      note: r.reason?.replace(/^Boutique · /, "") ?? null,
      cat: r.cat,
      prix: r.priceEach ?? null,
      spec: r.spec ?? null,
      quand: r.createdAt.toISOString(),
    })),
  );
}
