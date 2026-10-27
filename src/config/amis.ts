import type { Role } from "@prisma/client";
import { canAccessGuild } from "@/config/roles";
import type { CleEspace } from "@/config/nav";

/**
 * L'ACCÈS « FRIEND » — des amis de la guilde, PAS des membres (SPEC-INFORMATION-GUILDE §9).
 *
 * Maxime, 2026-10-21 : « donner un accès pour les personnes ayant un rôle spécifique :
 * Friend — Discord (RoleID) : 1550844483095232712 — qui permet d'avoir accès à la section
 * Astuces et AirBuilder, c'est tout ; avoir un espace paramétrable si jamais on souhaite
 * changer. » Et, précisé le même jour : « Les rôles Friend ne sont pas des membres de la
 * guilde et ne figurent pas dans la guilde. »
 *
 * D'où deux règles, qui tiennent ici :
 *  · un ami N'A PAS DE RANG. `User.role` reste ce que Discord en dit (RECRUE) : rien de ce
 *    qui lit le rang — Information Guilde, recensement, compo, compteurs, file — ne le voit,
 *    sans qu'aucune de ces listes ait eu à changer ;
 *  · le rôle Friend ouvre des ESPACES de la carte (config/nav.ts), pas des pages une à une,
 *    et seulement ceux de `ESPACES_OUVRABLES`.
 *
 * Module PUR — ni Prisma, ni Next : le callback `jwt` (lib/auth.ts), le middleware (edge),
 * la barre (navigateur), les gardes (lib/access.ts) et le script de vérification lisent les
 * mêmes réponses. Le réglage lui-même vit en base (`Setting`, clé `acces_amis`) et se lit
 * par lib/amis.ts, côté serveur.
 */

/** Le rôle Discord « Friend » du serveur, donné par Maxime le 2026-10-21. */
export const ROLE_FRIEND_DEFAUT = "1550844483095232712";

/**
 * LES SEULS ESPACES QU'ON PEUT OUVRIR À UN AMI, et c'est un plafond, pas un défaut.
 *
 * Leurs gardes savent lire l'ami — `apiEspace` / `requireEspace` (lib/access.ts) sur
 * /objets, /api/objets, /api/ou-trouver, /api/crafts ; les routes de l'AirBuilder ne
 * demandent qu'une connexion. Guilde et Bras droits n'y sont pas : un ami n'est pas de la
 * guilde, et leurs routes (`apiGuild`, `apiRole`) ne le liraient de toute façon pas — les
 * cocher ouvrirait une barre qui mène à des refus. Les ajouter ici demanderait d'abord de
 * revoir chacune de leurs gardes : c'est une décision, pas un réglage.
 */
export const ESPACES_OUVRABLES = ["astuces", "airbuilder"] as const satisfies readonly CleEspace[];
export type EspaceOuvrable = (typeof ESPACES_OUVRABLES)[number];

export type ReglageAmis = {
  /** Les identifiants des rôles Discord qui font d'un compte un ami. Vide : personne. */
  roles: string[];
  /** Ce que ces rôles ouvrent. Vide : un ami n'a rien de plus qu'un visiteur connecté. */
  espaces: EspaceOuvrable[];
};

export const REGLAGE_AMIS_DEFAUT: ReglageAmis = { roles: [ROLE_FRIEND_DEFAUT], espaces: ["astuces", "airbuilder"] };
/** Ce qu'on applique quand le réglage est illisible : rien d'ouvert, jamais le défaut. */
export const REGLAGE_AMIS_FERME: ReglageAmis = { roles: [], espaces: [] };

export const CLE_REGLAGE_AMIS = "acces_amis";
export const MAX_ROLES_AMIS = 20;

/** Un identifiant Discord (snowflake) : 17 à 20 chiffres. */
export const estIdDiscord = (s: string) => /^\d{17,20}$/.test(s);

/**
 * Un réglage reçu (formulaire) ou relu (base), remis en ordre — ou `null` s'il n'a pas la
 * forme d'un réglage. Les identifiants invalides et les espaces hors plafond sont ÉCARTÉS
 * plutôt que refusés en bloc : un reste valide vaut mieux qu'un refus muet. La route, elle,
 * compare ce qui reste à ce qu'on lui a envoyé et dit ce qu'elle a écarté.
 */
export function normaliserReglageAmis(brut: unknown): ReglageAmis | null {
  if (!brut || typeof brut !== "object") return null;
  const b = brut as { roles?: unknown; espaces?: unknown };
  if (!Array.isArray(b.roles) || !Array.isArray(b.espaces)) return null;
  const roles = [...new Set(b.roles.map((x) => String(x ?? "").trim()).filter(estIdDiscord))].slice(0, MAX_ROLES_AMIS);
  // L'ordre de la carte, pas celui des cases cochées : deux réglages égaux s'écrivent pareil.
  const espaces = ESPACES_OUVRABLES.filter((e) => (b.espaces as unknown[]).includes(e));
  return { roles, espaces };
}

/**
 * La valeur rangée en base (`Setting.value`, du JSON). ABSENTE : le défaut de Maxime — le
 * rôle Friend, Astuces et AirBuilder. ILLISIBLE : FERMÉ. Une valeur abîmée ne doit pas
 * rouvrir ce qu'un bras droit aurait fermé.
 */
export function lireReglageAmis(valeur: string | null | undefined): ReglageAmis {
  if (valeur === null || valeur === undefined) return REGLAGE_AMIS_DEFAUT;
  try {
    return normaliserReglageAmis(JSON.parse(valeur)) ?? REGLAGE_AMIS_FERME;
  } catch {
    return REGLAGE_AMIS_FERME;
  }
}

/**
 * Un ami : un compte HORS de la guilde qui porte un des rôles Friend. Un membre qui porte
 * aussi le rôle reste un membre — son rang lui ouvre déjà tout, et il figure dans la guilde.
 */
export function estAmi(role: Role, discordRoles: readonly string[], reglage: ReglageAmis): boolean {
  return !canAccessGuild(role) && reglage.roles.some((id) => discordRoles.includes(id));
}

/**
 * LES ESPACES QUE LE RÔLE FRIEND OUVRE À CE COMPTE — ce que porte le jeton (`token.amis`).
 * Vide pour un membre (il n'en a pas besoin) comme pour qui n'a pas le rôle.
 */
export function espacesAmisDe(role: Role, discordRoles: readonly string[], reglage: ReglageAmis): EspaceOuvrable[] {
  return estAmi(role, discordRoles, reglage) ? [...reglage.espaces] : [];
}

/**
 * Les deux listes portent-elles les mêmes rôles, dans n'importe quel ordre ? La synchro du
 * bot (bot/scheduler.ts, `syncMemberRanks`) ne réécrit `User.discordRoles` que s'ils ont
 * bougé — c'est par cette colonne qu'un rôle Friend posé ou retiré atteint le site.
 */
export function memesRoles(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
