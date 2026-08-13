import { PageHeader } from "@/components/PageHeader";
import { RechercheWiki } from "@/components/wiki/Recherche";
import { chercher, faitsWiki } from "@/lib/wiki";

/**
 * `/wiki` — LA PORTE QUI MANQUAIT.
 *
 * Le site avait la matière d'un wiki et pas son entrée : 14 000 noms relevés dans le
 * client du jeu, cherchables à dix endroits différents, chacun ignorant les neuf
 * autres. Un joueur qui tape « Âme de démon » devait deviner que la réponse est sur
 * /crafts et pas sur /objets.
 *
 * Cette page ne DOUBLE aucune des dix : elle les aiguille. Chaque ligne mène à la page
 * PROPRIÉTAIRE de son sujet — un monstre vers /monstres, une recette vers /crafts, une
 * compétence vers /classes. Un sujet, une page ; celle-ci ne fait que trouver laquelle.
 *
 * L'index est bâti ICI, côté serveur : ~6 Mo de relevés lus une fois, dont rien ne
 * descend au navigateur. Seules les 40 lignes demandées voyagent, par /api/wiki.
 */

const fr = (n: number) => n.toLocaleString("fr-FR");

export const metadata = {
  title: "Le wiki · Vanguard",
  description:
    "Un seul champ pour tout AirFlyff : objets, monstres, recettes, PNJ et compétences, par leur nom ou par leurs mots-clés — et quel monstre lâche quoi.",
};

export default async function WikiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const f = faitsWiki();
  /* LA PREMIÈRE RECHERCHE EST FAITE ICI. Un lien collé dans Discord — /wiki?q=luzaka —
     doit arriver rempli : sinon on voit un champ vide clignoter avant les réponses, et
     un moteur de recherche ne voit QUE le champ vide. La suite passe par /api/wiki. */
  const premiere = chercher({ q: q ?? "" });

  /* Les chiffres du sous-titre sont COMPTÉS sur l'index, jamais écrits : le jour où un
     relevé change, la phrase suit toute seule. Trois défauts de ce genre avaient été
     trouvés ailleurs sur le site, dont un compteur qui annonçait 94 lignes sous un
     tableau qui en montrait 60. */
  /* ON ANNONCE `situes` ET PAS `provenances` : le second compte les NOMS DISTINCTS du
     relevé (4 838), le premier les LIGNES DU WIKI qui portent vraiment un bloc « Où le
     trouver » (5 261 — deux objets de même nom en montrent chacun un). Un sous-titre
     doit promettre ce que la page livre, et c'est le second chiffre. */
  const sous = `${fr(f.total)} noms du client en un seul champ — et ${fr(f.situes)} objets qui disent d’où ils viennent.`;

  /* 32 px de marge sur un écran de bureau, comme les pages voisines ; 16 px sur un
     téléphone, où 64 px de marges sur 375 ne laissaient que 311 px de contenu. */
  return (
    <div style={{ padding: "24px clamp(16px, 4vw, 32px) 56px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Des ruines sous l'eau, un monstre, des statues : tout ce que le catalogue
          contient dans une seule image. Vérifiée à l'œil avant d'être branchée — les 15
          captures de /jeu/credits/ sont propres, contrairement aux 35 écrans de
          chargement qui portent le logo de l'éditeur incrusté dans leur tiers bas. */}
      <PageHeader
        art="/jeu/credits/shotcredit07.webp"
        icon="search"
        title="Le wiki"
        subtitle={sous}
        right={f.genere ? (
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "right", lineHeight: 1.5 }}>
            relevé du {f.genere}
          </span>
        ) : undefined}
      />
      <RechercheWiki depart={q ?? ""} faits={f} premiere={premiere} />
    </div>
  );
}
