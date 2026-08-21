import { PageHeader } from "@/components/PageHeader";
import { EcranMonstres } from "@/components/monstres/Ecran";
import { classementBoss, classementFrappeurs, faits, metaCatalogue, regleElement } from "@/components/monstres/catalogue";

/**
 * LES MONSTRES — le wiki de ce qu'on affronte.
 *
 * La fouille du client d'octobre 2025 livre 1 123 fiches : niveau, PV, dégâts,
 * cadence, élément et ses cinq résistances, et le bloc de comportement — la rage,
 * les invocations, les renforts, la fuite, et les vies.
 *
 * Le catalogue est lu ICI, côté serveur : rien de ses 612 Ko ne descend au
 * navigateur. Seuls le classement des boss et les compteurs voyagent, et la
 * recherche passe par /api/monstres.
 */
export default function MonstresPage() {
  const meta = metaCatalogue();
  const f = faits();
  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader
        // Clockworks, le colosse mécanique : il est DANS ce catalogue, et c'est
        // même lui qui sert d'exemple à la page : il résiste à TROIS éléments à la
        // fois (+0,5 en feu, en électricité et en terre), ce que la roue élémentaire
        // ne produit jamais. Il n'est pas le seul — ils sont huit dans ce cas, compté
        // sur les cinq colonnes — mais c'est le plus connu, et il porte l'exemple.
        // L'image annonce donc la page, elle ne l'illustre pas au hasard.
        art="/jeu/chargement/maploading_clockwork.webp"
        icon="skull"
        title="Les monstres et les boss"
        // LE SOUS-TITRE NE RÉPÈTE PLUS LES COMPTEURS. Il annonçait « 1 124 monstres,
        // dont 235 ajoutés par Airborn » alors que les deux tuiles juste dessous
        // portent exactement ces deux nombres, calculés : le même chiffre écrit deux
        // fois à trois centimètres d'écart. Reste la promesse de la page, et le
        // « ce qu'ils lâchent » qui est neuf — chaque objet de butin mène à sa fiche.
        subtitle="Ce qu'ils encaissent, ce qu'ils te font, ce qu'ils lâchent, et où ils sont."
      />
      <EcranMonstres
        // Sans argument : TOUS les boss à plusieurs vies, soit les 94 que le
        // compteur du tableau annonce. Le 60 qui était ici en cachait 34.
        boss={classementBoss()}
        frappeurs={classementFrappeurs(20)}
        compteurs={meta.compteurs}
        total={meta.total}
        // `groupes` ne descend plus : les contenus se comptent sur les 94 lignes
        // affichées, pas sur les 1 123 du catalogue. Les deux comptages voisinaient
        // à trois centimètres sans que rien ne dise qu'ils ne comptaient pas la
        // même chose — et quinze couples nom/nombre voyageaient pour ça.
        agressifs={f.agressifs}
        // Combien de ceux qui se relèvent portent la marque du serveur : c'est ce qui
        // autorise le schéma d'en-tête à les dessiner l'un DANS l'autre. Compté, pas
        // écrit — le jour où la fouille en sort un qui n'est pas marqué, la phrase
        // change toute seule.
        viesMaison={f.viesMaison}
        // Le pont vers le catalogue d'objets, compté : chaque nom de butin de ces
        // fiches mène désormais à la fiche de l'objet.
        objetsLaches={f.objetsLaches}
        // QUEL ÉLÉMENT EMPORTER — la seule chose que la page ne disait pas. Comptée
        // ici sur les cinq colonnes du client, pour tous les éléments : c'est le
        // catalogue qui décide lequel domine, pas une phrase écrite au clavier.
        regle={regleElement()}
      />
    </div>
  );
}

/* LE COMPTEUR DE LA DESCRIPTION EST LU, PLUS TAPÉ. Il annonçait « les 1 124
   monstres » au clavier, à côté d'un écran qui compte les siens : deux sources pour
   un seul nombre, et la description devient fausse à la fouille suivante sans que
   personne ne la relise. `metaCatalogue()` est déjà en mémoire — c'est le même appel
   que la page. */
const socle = metaCatalogue();
export const metadata = {
  title: "Les monstres et les boss · Vanguard",
  description:
    `Les ${socle.total.toLocaleString("fr-FR")} monstres d'Airborn, dont ${socle.compteurs.maison.toLocaleString("fr-FR")} ajoutés par le serveur : PV à sortir vies comprises, dégâts par coup, cadence, élément et résistances, rage et invocations.`,
};
