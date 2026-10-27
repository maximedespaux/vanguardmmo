import { notFound } from "next/navigation";
import { objetParId, voisins } from "@/components/objets/catalogue";
import { bonusDe } from "@/components/objets/stats";
import { lacheursDe } from "@/components/monstres/catalogue";
import { marchandsDe } from "@/components/pnj/annuaire";
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
 *
 * QUATRE RELEVÉS SONT JOINTS ICI, tous côté serveur :
 *  · `objets-fiches.json` — l'identité de l'objet ;
 *  · `objets-stats.json` — ses bonus en codes du client, plus sûrs que les libellés
 *    du premier (cf. `stats.ts`) ;
 *  · `monstres.json` — QUI LE LÂCHE, la question à laquelle aucune page ne
 *    répondait. Le nom d'un monstre, jamais un taux ;
 *  · `pnj.json` — QUI L'A, et à quel titre. La fiche annonçait « Vendu par un PNJ »
 *    sur 1 088 objets d'après un champ qui ne veut pas dire ça (cf. `pnj/annuaire`).
 *
 * Aucun de ces quatre fichiers ne descend au navigateur : seule la fiche voyage.
 */
export default async function FicheObjetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = objetParId(Number(id));
  if (!o) notFound();
  const m = marchandsDe(o.n);
  /* PLAFONNÉ ICI, pas dans `lacheursDe` : la liste complète sert aussi à compter.
     Deux objets du relevé — le Fragment de Cœur et le Morceau de cœur de Shade —
     tombent sur 265 monstres chacun ; sans plafond leur fiche affichait 265 lignes,
     1 662 mots, sur une passe qui doit COMPACTER. Le tri par niveau croissant est
     fait dans `lacheursDe` : les huit gardés sont donc les plus abordables. */
  const l = lacheursDe(o.n);
  return (
    <Fiche o={o} voisins={voisins(o)} bonus={bonusDe(o.i)}
      lacheurs={l.slice(0, 8)} lacheursTotal={l.length}
      marchands={m.liste} marchandsTotal={m.total} />
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = objetParId(Number(id));
  return { title: o ? `${o.n} · Objets · GENESIS` : "Objet introuvable · GENESIS" };
}
