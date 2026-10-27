import { PageHeader } from "@/components/PageHeader";
import { RechercheObjets } from "@/components/objets/Recherche";
/* `comptesGlobaux` n'est plus appelé ICI : les comptes qu'il rend (ajouts Airborn,
   grades, bonus, butin) sont portés par les pastilles de filtre, qui les reçoivent de
   /api/objets. Les lire deux fois pour écrire le même nombre dans un sous-titre était
   la définition du doublon. */
import { dateDuCatalogue, nombreDObjets } from "@/components/objets/catalogue";
import { statsDisponibles } from "@/components/objets/stats";

/**
 * LES OBJETS — la page qui manquait.
 *
 * Le site connaissait 12 134 objets nommés sans offrir un seul endroit pour en
 * chercher un : leurs noms n'apparaissaient qu'en passant, dans le coffre, dans
 * une requête, dans le builder. On cherchait donc ailleurs, sur un wiki dont les
 * niveaux sont faux (il montre le niveau DE L'OBJET, pas le niveau requis) et
 * qui a perdu 108 objets ajoutés par Airborn.
 *
 * Le mot-clé arrive parfois d'ailleurs (`?q=`) : le plan de farm et les requêtes
 * d'objet peuvent renvoyer ici avec le nom déjà écrit. `?stat=DST_…` vient des fiches
 * d'objet — chaque ligne de bonus y est un lien vers tout ce qui porte la même
 * statistique.
 */
export const metadata = { title: "Objets · GENESIS" };

export default async function ObjetsPage({ searchParams }: { searchParams: Promise<{ q?: string; stat?: string }> }) {
  const { q, stat: statDepart } = await searchParams;
  const total = nombreDObjets();
  /* Les statistiques demandables, calculées ICI et pas à chaque requête : la liste
     ne bouge pas d'une frappe à l'autre. Elle est lue dans le client du jeu, jamais
     écrite — le jour où une fouille en ajoute une, la liste suit. */
  const stats = statsDisponibles();

  return (
    <>
      <PageHeader icon="package" title="Les objets"
        // « dont N ajoutés par Airborn » est parti du sous-titre : la pastille
        // « Ajouts Airborn » porte déjà ce compte, à dix centimètres. Reste le total,
        // qui ne figure nulle part ailleurs, et les trois façons de chercher.
        subtitle={`${total.toLocaleString("fr-FR")} objets du client. Cherche par nom, par bonus, ou par ce qui le lâche.`}
        right={
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "right", lineHeight: 1.5 }}>
            relevé du {dateDuCatalogue()}
          </span>
        } />
      <RechercheObjets depart={q ?? ""} stats={stats}
        // Un code d'URL qui ne figure pas dans la liste est ignoré : sinon un lien
        // périmé afficherait zéro résultat sans rien expliquer.
        departStat={stats.some((s) => s.code === statDepart) ? statDepart! : ""} />
    </>
  );
}
