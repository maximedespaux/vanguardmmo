// ════════════════════════════════════════════════════════════
//  Permissions « staff » (bras droits / owners).
//  Un membre est staff s'il a la permission Discord ManageGuild
//  OU l'un des rôles de gestion (Direction/Vanguard/Général/Officier).
// ════════════════════════════════════════════════════════════
import { GuildMember, PermissionFlagsBits } from "discord.js";

/** Le bot peut-il voir + écrire dans ce salon ? */
export function botCanPost(channel: any, me: GuildMember): boolean {
  const perms = channel?.permissionsFor?.(me);
  return !!perms?.has(PermissionFlagsBits.ViewChannel) && !!perms?.has(PermissionFlagsBits.SendMessages);
}

/** Message d'erreur standard quand le bot n'a pas accès à un salon. */
export const NO_ACCESS_MSG =
  "⚠️ Je n'ai pas accès à ce salon. Donne-moi les permissions **Voir le salon** + **Envoyer des messages** ici (ou choisis un salon où j'ai déjà accès, ex. un salon public).";

export const ADMIN_ROLE_IDS = [
  process.env.ROLE_DIRECTION,
  process.env.ROLE_VANGUARD,
  process.env.ROLE_GENERAL,
  process.env.ROLE_OFFICIER,
].filter(Boolean) as string[];

/** Le membre fait-il partie du staff (bras droit / owner) ? */
export function isStaff(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return member.roles.cache.some((r) => ADMIN_ROLE_IDS.includes(r.id));
}

export const VANGUARD_ROLE_ID = process.env.ROLE_VANGUARD ?? "";

/** Réservé au rôle Vanguard (owner). L'admin serveur (Administrator) passe aussi. */
export function isVanguard(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return VANGUARD_ROLE_ID ? member.roles.cache.has(VANGUARD_ROLE_ID) : false;
}
