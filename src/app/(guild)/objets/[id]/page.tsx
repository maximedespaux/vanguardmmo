import { notFound } from "next/navigation";
import { objetParId, voisins } from "@/components/objets/catalogue";
import { Fiche } from "@/components/objets/Fiche";

/**
 * La fiche d'un objet, à son propre URL.
 *
 * Volontairement une page et non un panneau qui se déplie dans la recherche :
 * une fiche se colle dans Discord (« regarde ça »), et un panneau n'a pas
 * d'adresse. L'identifiant est celui du client du jeu — stable d'un relevé à
 * l'autre, alors que deux objets peuvent porter le même nom (versions garçon et
 * fille), ce qui interdisait de nommer l'adresse par le nom.
 *
 * Le catalogue est lu ici côté serveur : rien de son 3 Mo ne descend au
 * navigateur, seule la fiche demandée voyage.
 */
export default async function FicheObjetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = objetParId(Number(id));
  if (!o) notFound();
  return <Fiche o={o} voisins={voisins(o)} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = objetParId(Number(id));
  return { title: o ? `${o.n} · Objets · Vanguard` : "Objet introuvable · Vanguard" };
}
