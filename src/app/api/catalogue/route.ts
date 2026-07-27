import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { etatCoffre } from "@/lib/coffre";

/**
 * Le catalogue du coffre, pour les membres de la guilde.
 *
 * Sert à demander une quête sur un objet EXISTANT plutôt qu'en texte libre :
 * on voit ce que la guilde possède, son seuil et ce qu'il manque, donc on
 * demande ce qui sert vraiment. Sans ces chiffres, « il me faut une Griffe »
 * ne dit ni combien il en reste, ni si quelqu'un en cherche déjà.
 *
 * Ouvert plus largement que le plan de farm (staff) : c'est une liste d'objets
 * et de quantités, pas la gestion du coffre.
 */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 });

  const { items } = await etatCoffre();
  // Les plus en retard d'abord : c'est ce qu'on veut voir en haut d'un
  // sélecteur qui sert à décider quoi farmer.
  const tries = [...items].sort((x, y) => y.manque - x.manque || x.item.localeCompare(y.item));
  return NextResponse.json({
    items: tries,
    cats: Array.from(new Set(tries.map((i) => i.cat).filter(Boolean))).sort(),
  });
}
