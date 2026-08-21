import { Shell } from "@/components/Shell";
import { PageAccueil } from "@/components/accueil/PageAccueil";
import { chiffresAccueil, comptesPortes, phraseAccueil } from "@/components/accueil/chiffres";

/**
 * `/` — l'accueil public.
 *
 * Elle se contentait de `redirect("/histoire")`. La redirection avait deux
 * défauts : la première page du site ne montrait rien du JEU, et le `?error=`
 * que le middleware pose sur `/` quand une page se refuse disparaissait avec la
 * redirection, sans un mot pour l'utilisateur.
 *
 * `/histoire` n'a pas bougé et reste l'entrée « Accueil » de la navigation ; deux
 * liens d'ici y mènent. Cette page prend l'autre moitié du sujet : Airborn, ses
 * huit fins de partie, et les quatre portes ouvertes sans compte.
 *
 * Pourquoi ce fichier reste un composant SERVEUR alors que tout son contenu est
 * client : c'est la seule façon d'exporter `metadata`. La page d'accueil est
 * celle qu'un moteur de recherche voit en premier, et le titre du gabarit racine
 * (« Vanguard Hub ») ne dit ni le jeu ni le serveur.
 *
 * C'est aussi ce qui permet de COMPTER les chiffres au lieu de les écrire : deux
 * des quatre vivent dans `public/wiki/`, que seul le serveur peut lire (voir
 * `components/accueil/chiffres.ts`). Ils descendent en props — la description
 * pour les moteurs est faite du même comptage, donc les deux ne peuvent plus se
 * contredire.
 */
export const metadata = {
  title: "Vanguard — guilde Airborn : Winds of Rhisis",
  description: phraseAccueil(),
};

export default function Home() {
  return (
    <Shell>
      {/* Deux comptages, un seul aller : les quatre chiffres du bandeau, et ce que
          pèse chaque porte du wiki (monstres, catalogue d'objets, marchands). Les
          deux se lisent avec `fs` côté serveur et ne descendent que sous forme de
          nombres — les relevés eux-mêmes pèsent des mégaoctets. */}
      <PageAccueil chiffres={chiffresAccueil()} comptes={comptesPortes()} />
    </Shell>
  );
}
