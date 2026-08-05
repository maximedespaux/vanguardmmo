import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessGuild, canAccessAdmin, canAccessVerified, rankValue, ROLE_VERIFIE_ID } from "@/config/roles";
import { estMembreDuServeur, attribuerRole } from "@/lib/discord";
import type { Role, User } from "@prisma/client";
import { DEV_ALL } from "@/lib/devAccess";

// Mode dev local (DEV_ALL) : crée/utilise un vrai User « dev » (rôle DIRECTION) pour
//    simuler la prod sans Discord. Source unique : src/lib/devAccess.ts (fail-closed en prod).

async function devUser(): Promise<User> {
  return prisma.user.upsert({
    where: { discordId: "DEV" },
    update: {},
    create: { discordId: "DEV", username: "Maxime (dev)", role: "DIRECTION", discordRoles: [] },
  });
}

/**
 * Signe de vie, pour le « en ligne » de la messagerie.
 *
 * Écrit au plus une fois par PAS_PRESENCE : cette fonction est traversée par
 * chaque requête du site, une écriture à chaque fois transformerait un simple
 * affichage de page en écriture en base. Jamais attendu et jamais bloquant —
 * personne ne doit voir une page échouer parce qu'on n'a pas pu noter sa
 * présence.
 */
const PAS_PRESENCE = 3 * 60_000;
function marquerPresence(user: User) {
  const vu = (user as User & { lastSeenAt?: Date | null }).lastSeenAt;
  if (vu && Date.now() - new Date(vu).getTime() < PAS_PRESENCE) return;
  void prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
}

/**
 * Membre du serveur Discord ? C'est le socle de tout accès au site.
 *
 * Il n'y a plus de palier « connecté mais pas sur le serveur » : il ne donnait
 * rien de plus que le rôle Vérifié(e) et faisait croire à un accès qui n'en
 * était pas un. On refuse donc la session AVANT qu'elle serve à quoi que ce
 * soit — ici plutôt qu'au cas par cas, parce que tout le site passe par
 * getCurrentUser et qu'un verrou oublié sur une route serait une porte ouverte.
 *
 * Trois preuves acceptées, de la plus fiable à la plus faible : le rôle de
 * guilde (un membre est évidemment sur le serveur), `verifiedAt` (constaté à la
 * connexion), le rôle Discord Vérifié(e). Aucune ne suffit seule : le bot peut
 * manquer de MANAGE_ROLES, et `verifiedAt` n'existe pas sur les vieux comptes.
 */
async function estVerifie(u: User): Promise<boolean> {
  const v = u as User & { verifiedAt?: Date | null };
  if (canAccessVerified(v.role, v.discordRoles ?? [], v.verifiedAt)) return true;

  // Rien en base : on demande à Discord plutôt que d'éjecter quelqu'un dont la
  // seule faute est de s'être connecté avant la mise en place du verrou.
  const membre = await estMembreDuServeur(v.discordId);
  if (membre === false) return false;
  if (membre === null) return true; // Discord injoignable : on ne punit pas une panne

  await prisma.user.update({ where: { id: v.id }, data: { verifiedAt: new Date() } }).catch(() => {});
  void attribuerRole(v.discordId, ROLE_VERIFIE_ID);
  return true;
}

/** Récupère l'utilisateur connecté (depuis la base), ou null. Ne redirige pas. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (!DEV_ALL) return null;
    // Le compte de dev suit le même chemin que les autres, présence comprise :
    // sans cela, « en ligne » ne serait vérifiable qu'une fois en production.
    const dev = await devUser();
    marquerPresence(dev);
    return dev;
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user && DEV_ALL) return devUser();
  if (!user) return null;
  // Une session émise avant ce verrou, ou un membre qui a quitté le serveur,
  // ne vaut pas mieux qu'une absence de session.
  if (!(await estVerifie(user))) return null;
  marquerPresence(user);
  return user;
}

// ── Pour les Server Components / layouts (redirige) ──
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireRole(roles: Role[]): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/login?error=forbidden");
  return user;
}
export async function requireGuild(): Promise<User> {
  const user = await requireAuth();
  if (!canAccessGuild(user.role)) redirect("/login?error=guild");
  return user;
}
/**
 * Membre du serveur Discord — ce qui est désormais vrai de toute session.
 *
 * Le contrôle a été remonté dans getCurrentUser : on ne peut plus être connecté
 * sans être sur le serveur. La fonction reste, parce qu'elle DIT ce que la page
 * exige (le builder est ouvert aux candidats, pas seulement à la guilde), et
 * que ce serait une régression silencieuse de le laisser deviner.
 */
export async function requireVerified(): Promise<User> {
  return requireAuth();
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (!canAccessAdmin(user.role)) redirect("/login?error=admin");
  return user;
}

// ── Pour les API routes (renvoie une réponse au lieu de rediriger) ──
export type ApiAuth = { user: User } | { error: NextResponse };
export async function apiAuth(): Promise<ApiAuth> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  return { user };
}
export async function apiRole(roles: Role[]): Promise<ApiAuth> {
  const r = await apiAuth();
  if ("error" in r) return r;
  if (!roles.includes(r.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return r;
}
export const isOfficer = (role: Role) => canAccessAdmin(role); // Officier+ = bras droits
export { rankValue };
