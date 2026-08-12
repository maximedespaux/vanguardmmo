import { getCurrentUser } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

/**
 * LE MODE VITRINE — voir sans pouvoir se servir.
 *
 * Demande de Maxime : « Le public doit se connecter pour accéder aux informations et
 * rejoindre le serveur. En public, voir les fonctionnalités mises en place, mais
 * demander aux joueurs de se connecter : sans ça ils ne peuvent pas accéder aux
 * fonctionnalités. Le prérequis est d'être sur le serveur + connecté. Pareil pour
 * passer des commandes. Et avoir l'espace boutique en visualisation publique pour
 * attirer et donner envie — pareil pour astuces et fonctionnalités, mais inutilisable
 * sans connexion. »
 *
 * ┌──────── CE QUI CHANGE, ET POURQUOI C'EST UN RENVERSEMENT ────────┐
 * │ Jusqu'ici une page réservée était CACHÉE : le middleware renvoyait │
 * │ un visiteur vers /login, et l'entrée de menu ne s'affichait même   │
 * │ pas. Un joueur de passage ne pouvait donc pas savoir que la        │
 * │ boutique, l'AirBuilder ou les astuces existaient — or c'est        │
 * │ exactement ce qui donne envie de rejoindre le serveur.             │
 * │ Elle devient VISIBLE ET INERTE : on regarde, on ne touche pas.     │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * TROIS COUCHES DE GARDE EXISTENT SUR CE SITE, et le mode vitrine n'en ouvre que
 * DEUX. C'est l'invariant à ne jamais casser :
 *   1. le middleware (redirige)            → ouvert pour les espaces de vitrine
 *   2. le layout du groupe (requireGuild)  → ouvert pour les espaces de vitrine
 *   3. les routes /api (apiGuild)          → RESTE FERMÉ, sans exception
 * Conséquence : un visiteur voit l'écran, et toute action qu'il tenterait se heurte
 * au serveur. La porte s'ouvre, le tiroir reste verrouillé.
 *
 * UNE SEULE ROUTE DE LECTURE A ÉTÉ OUVERTE, et son contenu a été relu ligne par
 * ligne avant : `/api/shop` renvoie le nom, la catégorie, la classe, le prix, le
 * stock, la rareté et l'icône de chaque article. Aucun nom de membre, aucune dette,
 * aucune commande, aucune conversation. C'est un étalage, pas un registre.
 *
 * CE QUI N'EST PAS OUVERT, et ne doit pas l'être : les messages, le profil, les
 * dettes, les requêtes, le suivi de commande, et tout l'espace du staff. Le groupe
 * (shop) les portait avec la boutique — c'est pourquoi la boutique a déménagé dans
 * son propre groupe plutôt que d'ouvrir le groupe entier. Ouvrir (shop) aurait
 * exposé les conversations privées de la guilde.
 */

export type EtatVisiteur = {
  /** Une session existe, et elle a passé la vérification d'appartenance au Discord. */
  connecte: boolean;
  /** Membre de la guilde — le niveau qui donne droit d'agir. */
  membre: boolean;
  /**
   * Le droit d'AGIR : commander, enregistrer, publier. C'est ce booléen que les
   * écrans consultent, jamais le rôle : le jour où le prérequis change, il change
   * ici et nulle part ailleurs.
   */
  peutAgir: boolean;
  pseudo: string | null;
};

/**
 * L'état du visiteur, SANS jamais rediriger — c'est toute la différence avec
 * `requireGuild()`. Une page de vitrine doit pouvoir rendre pour tout le monde et
 * décider elle-même de ce qu'elle grise.
 *
 * `getCurrentUser()` rend déjà `null` pour qui n'est pas connecté OU n'est plus sur
 * le serveur Discord (la vérification est remontée dedans). On n'a donc pas à
 * distinguer les deux cas ici : les deux donnent le même écran de vitrine, et le
 * même message — « connecte-toi, et sois sur le serveur ».
 */
export async function etatVisiteur(): Promise<EtatVisiteur> {
  const u = await getCurrentUser();
  if (!u) return { connecte: false, membre: false, peutAgir: false, pseudo: null };
  const membre = canAccessGuild(u.role);
  return { connecte: true, membre, peutAgir: membre, pseudo: u.username ?? null };
}
