// ════════════════════════════════════════════════════════════
//  Bypass d'accès DEV — source unique (serveur / edge).
//  Opt-in SÛR : actif UNIQUEMENT en dev local avec DEV_ALL_ACCESS="1".
//  En production (NODE_ENV === "production"), TOUJOURS désactivé →
//  la vraie connexion Discord + la vérification des rôles s'appliquent.
// ════════════════════════════════════════════════════════════
export const DEV_ALL = process.env.DEV_ALL_ACCESS === "1" && process.env.NODE_ENV !== "production";
