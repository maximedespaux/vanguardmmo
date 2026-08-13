import { PageHeader } from "@/components/PageHeader";
import { EcranMonstres } from "@/components/monstres/Ecran";
import { classementBoss, classementFrappeurs, faits, metaCatalogue } from "@/components/monstres/catalogue";

/**
 * LES MONSTRES — le wiki de ce qu'on affronte.
 *
 * La fouille du client d'octobre 2025 livre 1 124 fiches : niveau, PV, dégâts,
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
        // même lui qui sert d'exemple à la page (le seul à résister à trois
        // éléments d'un coup). L'image annonce donc la page, elle ne l'illustre
        // pas au hasard.
        art="/jeu/chargement/maploading_clockwork.webp"
        icon="skull"
        title="Les monstres et les boss"
        // LE SOUS-TITRE NE RÉPÈTE PLUS LES COMPTEURS. Il annonçait « 1 124 monstres,
        // dont 235 ajoutés par AirFlyff » alors que les deux tuiles juste dessous
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
        groupes={meta.groupes}
        agressifs={f.agressifs}
        // Le pont vers le catalogue d'objets, compté : chaque nom de butin de ces
        // fiches mène désormais à la fiche de l'objet.
        objetsLaches={f.objetsLaches}
      />
    </div>
  );
}

export const metadata = {
  title: "Les monstres et les boss · Vanguard",
  description:
    "Les 1 124 monstres d'AirFlyff : PV à sortir vies comprises, dégâts par coup, cadence, élément et résistances, rage et invocations.",
};
