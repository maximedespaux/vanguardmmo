import type { Role } from "@prisma/client";
import { ADMIN_ROLES, GUILD_ROLES, rankValue } from "@/config/roles";
import type { CompoState } from "@/lib/compositions";

/**
 * LES GESTES DU DOSSIER D'UN MEMBRE, ET QUI PEUT LES FAIRE — la règle, en un seul
 * endroit (SPEC-INFORMATION-GUILDE §4).
 *
 * Demande de Maxime du 2026-10-21 : pouvoir cacher un membre, le retirer de la guilde
 * « s'il n'est plus présent en jeu », le promouvoir « s'il fait des efforts », le
 * rétrograder, et tenir des notes internes. Réponse du même jour : ces gestes-là sont
 * ouverts aux QUATRE rangs bras droits (Direction, Vanguard, Général, Officier).
 *
 * Deux règles, et elles sont celles de Maxime :
 *  · on n'agit que sur un rang STRICTEMENT inférieur au sien (et jamais sur soi) ;
 *  · on ne promeut pas au-delà du rang juste sous le sien — la Direction, au-dessus de
 *    tout, nomme donc jusqu'à Vanguard, et personne ne fabrique un égal.
 *
 * Les gestes d'AVANT (retirer un rôle Discord, exclure, bannir) gardent leur garde :
 * Vanguard et plus (note moderation-guildviewer). Ils coûtent un membre, ou une
 * casquette posée à la main ; l'ouverture aux quatre rangs ne les concerne pas.
 *
 * Module PUR — ni Prisma, ni Next : la route (/api/admin/moderation), le dossier
 * (/api/admin/membre/[id]) et le script de vérification lisent les mêmes réponses. Le
 * bot en reprend `retirerDeLaCompo`.
 */

export const RANG_LIBELLE: Record<Role, string> = {
  DIRECTION: "Direction", VANGUARD: "Vanguard", GENERAL: "Général", OFFICIER: "Officier",
  VETERAN: "Vétéran", GUARD: "Guard", RECRUE: "Recrue",
};

export type Geste = "role" | "guilde" | "kick" | "ban" | "promouvoir" | "retrograder" | "cacher" | "montrer";
export const GESTES: Geste[] = ["promouvoir", "retrograder", "cacher", "montrer", "guilde", "role", "kick", "ban"];

/** Les gestes d'avant : Vanguard et plus, comme le 2026-08-10. */
const SANCTIONS: Geste[] = ["role", "kick", "ban"];
export const rangMinimum = (g: Geste): Role => (SANCTIONS.includes(g) ? "VANGUARD" : "OFFICIER");

type Qui = { id: string; role: Role };

/** Strictement au-dessous de soi, et pas soi : la règle de tous les gestes et des notes. */
export function peutAgirSur(acteur: Qui, cible: Qui): boolean {
  return ADMIN_ROLES.includes(acteur.role) && acteur.id !== cible.id && rankValue(cible.role) < rankValue(acteur.role);
}

/**
 * Où ce bras droit peut faire monter ce membre : les rangs de guilde au-dessus du sien,
 * jusqu'au rang juste sous celui de l'acteur. SEULEMENT UN MEMBRE DÉJÀ DANS LA GUILDE
 * (Maxime, 2026-10-21 : « candidature d'abord ») : une Recrue — un candidat, ou quelqu'un
 * sorti de la guilde — n'entre que par la candidature, qui se décide à plusieurs.
 */
export function rangsDePromotion(acteur: Qui, cible: Qui): Role[] {
  if (!peutAgirSur(acteur, cible) || !GUILD_ROLES.includes(cible.role)) return [];
  return GUILD_ROLES.filter((r) => rankValue(r) > rankValue(cible.role) && rankValue(r) < rankValue(acteur.role))
    .sort((a, b) => rankValue(a) - rankValue(b));
}

/**
 * Où il peut le faire descendre : les rangs de guilde sous le sien. Guard est le plancher —
 * en dessous, c'est « Retirer de la guilde », un geste à part, qui dit ce qu'il fait.
 */
export function rangsDeRetrogradation(acteur: Qui, cible: Qui): Role[] {
  if (!peutAgirSur(acteur, cible) || !GUILD_ROLES.includes(cible.role)) return [];
  return GUILD_ROLES.filter((r) => rankValue(r) < rankValue(cible.role)).sort((a, b) => rankValue(b) - rankValue(a));
}

export type Droits = {
  /** Geste par geste : `null` s'il est permis, sinon la phrase qui dit pourquoi non. Le
   *  dossier la montre sur le bouton grisé — masquer un geste ne dit pas pourquoi. */
  gestes: Record<Geste, string | null>;
  promotions: Role[];
  retrogradations: Role[];
  /** Lire et écrire les notes internes : la même règle que les gestes. */
  notes: boolean;
};

/** Ce que cet acteur peut faire sur ce membre — la route refait le même calcul. */
export function droitsSur(acteur: Qui, cible: Qui & { cacheLe: Date | string | null }): Droits {
  const promotions = rangsDePromotion(acteur, cible);
  const retrogradations = rangsDeRetrogradation(acteur, cible);
  const deLaGuilde = GUILD_ROLES.includes(cible.role);

  const commun: string | null = !ADMIN_ROLES.includes(acteur.role) ? "Réservé aux bras droits."
    : acteur.id === cible.id ? "On ne s'applique pas ça à soi-même."
      : rankValue(cible.role) >= rankValue(acteur.role) ? "Son rang est égal ou supérieur au tien : ça ne se règle pas depuis ton dossier."
        : null;

  const raison = (g: Geste): string | null => {
    if (commun) return commun;
    if (rankValue(acteur.role) < rankValue(rangMinimum(g))) return "Réservé au rang Vanguard et au-dessus.";
    switch (g) {
      case "promouvoir":
        return promotions.length ? null
          : !deLaGuilde ? "Il n'est pas de la guilde : on y entre par la candidature, qui se décide à plusieurs."
            : "Le rang juste au-dessus du sien est le tien ou plus haut : seul un rang supérieur au tien peut le promouvoir.";
      case "retrograder":
        return retrogradations.length ? null
          : deLaGuilde ? "Guard est le premier rang de la guilde : en dessous, c'est « Retirer de la guilde »."
            : "Il n'est pas de la guilde.";
      case "cacher":
        return cible.cacheLe ? "Il est déjà caché." : !deLaGuilde ? "Il ne figure déjà pas dans la guilde." : null;
      case "montrer":
        return cible.cacheLe ? null : "Il n'est pas caché.";
      case "guilde":
        return deLaGuilde ? null : "Il n'est déjà pas de la guilde.";
      default:
        return null;
    }
  };

  return {
    gestes: Object.fromEntries(GESTES.map((g) => [g, raison(g)])) as Record<Geste, string | null>,
    promotions,
    retrogradations,
    notes: !commun,
  };
}

/* ── Le rang relu sur Discord ─────────────────────────────────────────────────────

   Ce que le rang lu dans les rôles Discord écrit en base : le rang, et, si c'est un rang
   de guilde, le RETOUR parmi les actifs. La sortie de la guilde, l'exclusion et le
   bannissement marquent le compte inactif (bot/lib/moderation.ts), et Information Guilde
   et le recensement taisent un compte inactif : sans ce retour, un ancien membre remis
   dans la guilde — à la main sur Discord, par /boutonrole ou par une promotion du
   dossier — restait invisible, et « Parti » dans Membres & builds. Un seul calcul pour
   les trois chemins : syncMemberRanks, la répercussion d'un geste, la connexion. Ce
   drapeau n'ouvre aucun droit : les gardes lisent le rang. */
export function rangRelu(rang: Role): { role: Role; isActive?: true } {
  return GUILD_ROLES.includes(rang) ? { role: rang, isActive: true } : { role: rang };
}

/* ── Les notes internes ──────────────────────────────────────────────────────── */

export type Ton = "probleme" | "effort" | "neutre";
export const TONS: { clef: Ton; libelle: string }[] = [
  { clef: "probleme", libelle: "Problème" },
  { clef: "effort", libelle: "Effort" },
  { clef: "neutre", libelle: "Neutre" },
];
export const estTon = (x: unknown): x is Ton => TONS.some((t) => t.clef === x);
export const NOTE_MIN = 3;
export const NOTE_MAX = 1000;

/* ── Le départ : ne plus figurer dans la composition ─────────────────────────────

   « Après lui, le membre ne figure plus nulle part côté guilde » (§4). Information Guilde,
   le recensement, les classes et les compteurs lisent le RANG, qui tombe à Recrue avec le
   geste. La composition des Chambres, elle, est un blob d'inscriptions que chacun pose
   lui-même : sans ce tri, un membre sorti y restait inscrit, et annoncé présent. Ses
   inscriptions et ses « je serai là » partent donc avec lui — reconnus par ses persos
   (le nom du jeu) et par son pseudo, comme Information Guilde reconnaît les siens. */
const cleNom = (x: string) => x.trim().toLowerCase();

export function retirerDeLaCompo(etat: CompoState, qui: { pseudo: string; persos: string[] }): { etat: CompoState; retires: number } {
  const persos = new Set(qui.persos.map(cleNom));
  const sien = (x: { player: string; pseudo: string }) => cleNom(x.player) === cleNom(qui.pseudo) || persos.has(cleNom(x.pseudo));
  const signups = etat.signups.filter((s) => !sien(s));
  const presences = etat.presences.filter((p) => !sien(p));
  return {
    etat: { ...etat, signups, presences },
    retires: etat.signups.length - signups.length + etat.presences.length - presences.length,
  };
}
