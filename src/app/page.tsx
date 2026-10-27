import { Shell } from "@/components/Shell";
import { AccueilVisiteur } from "@/components/accueil/AccueilVisiteur";
import { chiffresAccueil, comptesPortes, phraseAccueil } from "@/components/accueil/chiffres";
import { canAccessGuild } from "@/config/roles";
import { DEV_ROLE } from "@/lib/devAccess";
import { etatVisiteur } from "@/lib/vitrine";

/**
 * `/` — L'ACCUEIL, PUBLIC ET NEUTRE (Maxime, 2026-10-21).
 *
 * « Sur la page Accueil je veux une page uniquement pour le public » : la MÊME vitrine
 * pour tout le monde — le hero, ce que le site fait, les huit classes, la présentation
 * publique de la guilde, rejoindre, le plan du site. Plus de visage « membre » ni
 * « bras droit » : ni recherche, ni prochain rendez-vous, ni « Régler cette page », ni
 * « À traiter », ni « À faire », ni « Mes outils », ni « La guilde cherche », ni « Les
 * classes de la guilde ». Ce qui était interne part dans Information Guilde (les
 * membres) et dans le tableau de bord (les bras droits).
 *
 * UNE SEULE EXCEPTION : « Mes personnages », EN TÊTE, pour qui est connecté et en a —
 * pour rouvrir vite un perso ou un stuff dans l'AirBuilder et corriger ses mesures.
 * C'est une donnée PERSONNELLE : un composant client la lit par une route gardée
 * (GET /api/characters, `apiAuth`), jamais dans le HTML servi ici.
 *
 * Ce fichier reste un composant SERVEUR, pour deux raisons :
 *  1. `metadata` : la page est publique et indexable, et c'est celle qu'un moteur de
 *     recherche voit en premier.
 *  2. Deux boutons dépendent de la session, et le serveur la lit (rang EN BASE) : « Se
 *     connecter » disparaît pour qui l'est, « Postuler » et « Rejoindre » pour qui est
 *     déjà de la guilde — la règle de `appel` dans config/nav.ts : on ne propose pas
 *     d'entrer à qui est entré. Ce ne sont que des boutons en moins : aucun nom, aucun
 *     compte, aucune donnée de membre n'entre dans le HTML. La page est donc rendue à
 *     chaque requête (elle lit la session) — d'où le cache des comptages de
 *     `chiffres.ts`. À vérifier hors du dépôt : qu'aucun cache partagé du proxy (Nginx
 *     Proxy Manager) ne serve `/` à plusieurs personnes.
 *
 * Les chiffres du jeu sont COMPTÉS côté serveur (deux vivent dans `public/wiki/`, que
 * seul le serveur lit) et descendent en props ; la description pour les moteurs est
 * faite du même comptage.
 */
export const metadata = {
  title: "GENESIS — guilde Airborn : Winds of Rhisis",
  description: phraseAccueil(),
};

export default async function Home() {
  const etat = await etatVisiteur();
  /* En local, `DEV_ROLE` décide des deux boutons — sinon DEV_ALL (tout le monde
     DIRECTION) cacherait toujours « Postuler ». Comme pour la barre, il ne donne aucun
     droit. En production, DEV_ROLE est vide (lib/devAccess). */
  const connecte = DEV_ROLE ? DEV_ROLE !== "VISITEUR" : etat.connecte;
  // Un ami simulé (AMI) n'est pas de la guilde : il garde « Postuler », comme un vrai.
  const membre = DEV_ROLE ? DEV_ROLE !== "VISITEUR" && DEV_ROLE !== "AMI" && canAccessGuild(DEV_ROLE) : etat.membre;
  return (
    <Shell>
      {/* Deux comptages, un seul aller : les quatre chiffres du jeu et ce que pèse
          chaque porte du wiki. Lus avec `fs` côté serveur, ils ne descendent que sous
          forme de nombres — les relevés eux-mêmes pèsent des mégaoctets. */}
      <AccueilVisiteur
        chiffres={chiffresAccueil()}
        comptes={comptesPortes()}
        connecte={connecte}
        membre={membre}
      />
    </Shell>
  );
}
