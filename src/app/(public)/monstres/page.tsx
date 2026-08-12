import { PageHeader } from "@/components/PageHeader";
import { EcranMonstres } from "@/components/monstres/Ecran";
import { classementBoss, classementFrappeurs, metaCatalogue } from "@/components/monstres/catalogue";

/**
 * LES MONSTRES — la page que le site n'avait pas.
 *
 * Le wiki couvrait les objets, les donjons, les classes et les crafts, mais rien
 * ne disait ce qu'on affronte. La fouille du client d'octobre 2025 livre 1 124
 * fiches à 48 champs : niveau, PV, dégâts, cadence, élément et ses cinq
 * résistances, et le bloc de comportement — la rage, les invocations, les
 * renforts, la fuite, et les vies.
 *
 * Le catalogue est lu ICI, côté serveur : rien de ses 612 Ko ne descend au
 * navigateur. Seuls le classement des boss et les compteurs voyagent, et la
 * recherche passe par /api/monstres.
 */
export default function MonstresPage() {
  const meta = metaCatalogue();
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
        subtitle={`Les ${meta.total.toLocaleString("fr-FR")} monstres du client d'AirFlyff : ce qu'ils encaissent, ce qu'ils te font, ce qu'ils lâchent, et où ils sont. Avec le seul chiffre qui compte pour un boss — les PV à sortir, vies comprises.`}
      />
      <EcranMonstres
        // Sans argument : TOUS les boss à plusieurs vies, soit les 94 que le
        // compteur du tableau annonce. Le 60 qui était ici en cachait 34.
        boss={classementBoss()}
        frappeurs={classementFrappeurs(20)}
        compteurs={meta.compteurs}
        total={meta.total}
        groupes={meta.groupes}
      />
    </div>
  );
}

export const metadata = {
  title: "Les monstres et les boss · Vanguard",
  description:
    "Les 1 124 monstres d'AirFlyff : PV, dégâts par coup, cadence, élément et résistances, rage, invocations, et les PV effectifs des 94 boss qui se relèvent.",
};
