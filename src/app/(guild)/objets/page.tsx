import { PageHeader } from "@/components/PageHeader";
import { RechercheObjets } from "@/components/objets/Recherche";
import { comptesGlobaux, dateDuCatalogue, nombreDObjets } from "@/components/objets/catalogue";

/**
 * LES OBJETS — la page qui manquait.
 *
 * Le site connaissait 12 134 objets nommés sans offrir un seul endroit pour en
 * chercher un : leurs noms n'apparaissaient qu'en passant, dans le coffre, dans
 * une requête, dans le builder. On cherchait donc ailleurs, sur un wiki dont les
 * niveaux sont faux (il montre le niveau DE L'OBJET, pas le niveau requis) et
 * qui a perdu 108 objets ajoutés par AirFlyff.
 *
 * Le mot-clé arrive parfois d'ailleurs (`?q=`) : le plan de farm et les requêtes
 * d'objet peuvent renvoyer ici avec le nom déjà écrit.
 */
export const metadata = { title: "Objets · Vanguard" };

export default async function ObjetsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const total = nombreDObjets();
  // Le chiffre qui dit ce que ce catalogue a d'unique : compté, jamais écrit.
  const { maison } = comptesGlobaux();

  return (
    <>
      <PageHeader icon="package" title="Les objets"
        subtitle={`${total.toLocaleString("fr-FR")} objets du client, dont ${maison.toLocaleString("fr-FR")} ajoutés par AirFlyff.`}
        right={
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "right", lineHeight: 1.5 }}>
            relevé du {dateDuCatalogue()}
          </span>
        } />
      <RechercheObjets depart={q ?? ""} />
    </>
  );
}
