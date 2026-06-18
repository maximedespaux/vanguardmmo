// ─── Rôles Discord → rôle applicatif ────────────────────────
// Renseigne les IDs de rôles Discord dans .env (clic droit rôle → Copier l'identifiant).
import type { Role } from "@prisma/client";

export const DISCORD_ROLE_IDS: Record<Exclude<Role, "RECRUE">, string | undefined> = {
  DIRECTION: process.env.ROLE_DIRECTION,
  VANGUARD:  process.env.ROLE_VANGUARD,
  GENERAL:   process.env.ROLE_GENERAL,
  OFFICIER:  process.env.ROLE_OFFICIER,
  VETERAN:   process.env.ROLE_VETERAN,
  GUARD:     process.env.ROLE_GUARD,
};

// Hiérarchie (du plus haut au plus bas)
export const ROLE_RANK: Role[] = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD", "RECRUE"];

// Qui accède à quoi
export const GUILD_ROLES: Role[] = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"];
export const ADMIN_ROLES: Role[] = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER"];

// Calcule le plus haut rôle applicatif à partir des IDs de rôles Discord du membre
export function highestRoleFromDiscord(memberRoleIds: string[]): Role {
  for (const role of ROLE_RANK) {
    if (role === "RECRUE") continue;
    const id = DISCORD_ROLE_IDS[role as Exclude<Role, "RECRUE">];
    if (id && memberRoleIds.includes(id)) return role;
  }
  return "RECRUE";
}
export function canAccessGuild(role: Role) { return GUILD_ROLES.includes(role); }
export function canAccessAdmin(role: Role) { return ADMIN_ROLES.includes(role); }
export function rankValue(role: Role) { return ROLE_RANK.length - ROLE_RANK.indexOf(role); }
