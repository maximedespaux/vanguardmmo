import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { canAccessGuild, canAccessAdmin } from "@/config/roles";
import { etatCoffre } from "@/lib/coffre";
import { sourcesDe } from "@/lib/ouFarmer";

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

  const staff = canAccessAdmin(a.user.role);
  const { items } = await etatCoffre();
  // Les plus en retard d'abord : c'est ce qu'on veut voir en haut d'un
  // sélecteur qui sert à décider quoi farmer.
  const tries = [...items]
    .sort((x, y) => y.manque - x.manque || x.item.localeCompare(y.item))
    // « Où aller » vient du même catalogue, lu à l'envers : les donjons
    // listent leur butin, on en déduit où tombe chaque objet.
    .map((o) => {
      // Le BESOIN est public, les QUANTITÉS ne le sont pas : un membre doit
      // savoir quoi farmer sans lire l'état du coffre, qui est une information
      // de gestion. On coupe ici plutôt qu'à l'affichage — sinon les chiffres
      // voyagent quand même dans la réponse, et il suffit de l'ouvrir.
      const besoin = o.manque <= 0 ? "ok" : o.manque >= o.target / 2 ? "fort" : "moyen";
      // `rarete` reste public : ce n'est pas un stock mais une caractéristique
      // de l'objet (une arme a des paliers de rareté, un marteau non), et c'est
      // ce qui décide des réglages proposés quand on prend la pièce en quête.
      const commun = { id: o.id, item: o.item, cat: o.cat, classe: o.classe, icon: o.icon, unit: o.unit, rarete: o.rarete, besoin, sources: sourcesDe(o.item) };
      return staff ? { ...o, ...commun } : { ...commun, stock: 0, target: 0, manque: 0, premyth: 0, manquePremyth: 0 };
    });
  return NextResponse.json({
    items: tries,
    cats: Array.from(new Set(tries.map((i) => i.cat).filter(Boolean))).sort(),
  });
}
