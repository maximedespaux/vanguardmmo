// ════════════════════════════════════════════════════════════
//  Bypass d'accès DEV — source unique (serveur / edge).
//  Opt-in SÛR : actif UNIQUEMENT en dev local avec DEV_ALL_ACCESS="1".
//  En production (NODE_ENV === "production"), TOUJOURS désactivé →
//  la vraie connexion Discord + la vérification des rôles s'appliquent.
// ════════════════════════════════════════════════════════════
export const DEV_ALL = process.env.DEV_ALL_ACCESS === "1" && process.env.NODE_ENV !== "production";

/**
 * RÔLE SIMULÉ — `DEV_ROLE=GUARD` (ou VISITEUR, RECRUE, OFFICIER…) dans .env, puis
 * redémarrer le serveur de dev.
 *
 * Avec DEV_ALL, tout le monde est DIRECTION : la barre montre tout, et les trois
 * barres que voient les joueurs (visiteur, membre, bras droit) ne se voyaient
 * qu'en production. DEV_ROLE ne change QUE ce que la navigation montre — barre,
 * « Tout », plan du site, onglets, et le visage de l'accueil (visiteur, membre, bras
 * droit, app/page.tsx). Les pages et les routes restent ouvertes par DEV_ALL : on
 * regarde la barre d'un Guard, on n'en emprunte pas les droits.
 * VISITEUR veut dire « personne de connecté ». AMI : un compte hors guilde qui porte le
 * rôle Discord Friend (config/amis.ts) — rang RECRUE, et les espaces du réglage par défaut.
 *
 * Lu des deux côtés : next.config.js le recopie dans le paquet du navigateur, et
 * le vide au build de production. Le test de NODE_ENV en est la seconde serrure.
 */
const SIMULABLES = ["VISITEUR", "AMI", "RECRUE", "GUARD", "VETERAN", "OFFICIER", "GENERAL", "VANGUARD", "DIRECTION"] as const;
export type RoleSimule = (typeof SIMULABLES)[number];
const brut = process.env.NODE_ENV === "production" ? "" : (process.env.DEV_ROLE ?? "").trim().toUpperCase();
export const DEV_ROLE: RoleSimule | null = (SIMULABLES as readonly string[]).includes(brut) ? (brut as RoleSimule) : null;
