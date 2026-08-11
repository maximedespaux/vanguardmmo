import { Shell } from "@/components/Shell";
import { PageAccueil } from "@/components/accueil/PageAccueil";

/**
 * `/` — l'accueil public.
 *
 * Elle se contentait de `redirect("/histoire")`. La redirection avait deux
 * défauts : la première page du site ne montrait rien du JEU, et le `?error=`
 * que le middleware pose sur `/` quand une page se refuse disparaissait avec la
 * redirection, sans un mot pour l'utilisateur.
 *
 * `/histoire` n'a pas bougé et reste l'entrée « Accueil » de la navigation ; deux
 * liens d'ici y mènent. Cette page prend l'autre moitié du sujet : AirFlyff, ses
 * huit fins de partie, et les quatre portes ouvertes sans compte.
 *
 * Pourquoi ce fichier reste un composant SERVEUR alors que tout son contenu est
 * client : c'est la seule façon d'exporter `metadata`. La page d'accueil est
 * celle qu'un moteur de recherche voit en premier, et le titre du gabarit racine
 * (« Vanguard Hub ») ne dit ni le jeu ni le serveur.
 */
export const metadata = {
  title: "Vanguard — guilde AirFlyff",
  description:
    "La guilde Vanguard sur le serveur privé Flyff AirFlyff : les 23 instances et leurs butins, la provenance de 4 970 objets, les paliers de prestige et l'AirBuilder. Consultable sans compte.",
};

export default function Home() {
  return (
    <Shell>
      <PageAccueil />
    </Shell>
  );
}
