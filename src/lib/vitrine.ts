import { getCurrentUser } from "@/lib/access";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import { peutOuvrir, type CleEspace } from "@/config/nav";
import { espacesAmisDuCompte } from "@/lib/amis";

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
 * La Boutique, première page de vitrine, a quitté le site le 2026-10-21, et avec
 * elle `/api/shop`, la seule route de lecture que ce mode avait ouverte. Reste
 * /crafts, qui lit cet état pour griser ce qu'un visiteur ne peut pas faire.
 *
 * CE QUI N'EST PAS OUVERT, et ne doit pas l'être : le profil et tout l'espace du
 * staff. Le groupe (shop) garde son garde ; c'est pour cela que les pages de vitrine
 * vivent dans leur propre groupe plutôt que de l'ouvrir.
 */

export type EtatVisiteur = {
  /** Une session existe, et elle a passé la vérification d'appartenance au Discord. */
  connecte: boolean;
  /** Membre de la guilde — le niveau qui donne droit d'agir. */
  membre: boolean;
  /**
   * Le droit d'AGIR : commander, enregistrer, publier. C'est ce booléen que les
   * écrans consultent, jamais le rôle : le jour où le prérequis change, il change
   * ici et nulle part ailleurs. Dans un espace que le rôle Friend ouvre (`espace` de
   * `etatVisiteur`), un ami y a droit aussi — sans être `membre` pour autant.
   */
  peutAgir: boolean;
  /**
   * Un des quatre rangs du staff (les bras droits). Un repère d'affichage, pas un droit :
   * toute donnée du staff passe par une route qui revérifie le rang. (L'accueil s'en
   * servait pour poser « À traiter » en tête ; il est neutre depuis le 2026-10-21.)
   */
  staff: boolean;
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
/**
 * `espace` : celui de la page qui demande (config/nav.ts). Le droit d'agir y passe alors par
 * `peutOuvrir`, la décision de la barre et des routes : un ami à qui le rôle Friend ouvre
 * cet espace (SPEC-INFORMATION-GUILDE §9) agit comme un membre — /crafts, dans Astuces,
 * lui montre les recettes que /api/crafts lui sert. Sans espace, la guilde seule.
 */
export async function etatVisiteur(espace?: CleEspace): Promise<EtatVisiteur> {
  const u = await getCurrentUser();
  if (!u) return { connecte: false, membre: false, peutAgir: false, staff: false, pseudo: null };
  const membre = canAccessGuild(u.role);
  const peutAgir = espace ? peutOuvrir("guild", { role: u.role, amis: await espacesAmisDuCompte(u) }, espace) : membre;
  return { connecte: true, membre, peutAgir, staff: canAccessAdmin(u.role), pseudo: u.username ?? null };
}
