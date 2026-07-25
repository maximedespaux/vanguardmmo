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

/** Récupère l'utilisateur connecté (depuis la base), ou null. Ne redirige pas. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (DEV_ALL) return devUser();
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user && DEV_ALL) return devUser();
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
 * Membre du serveur Discord (pas forcément de la guilde en jeu).
 * Utilisé par /builder : un candidat doit pouvoir construire son build,
 * puisque la candidature le lui demande.
 */
export async function requireVerified(): Promise<User> {
  const user = await requireAuth();
  const u = user as User & { verifiedAt?: Date | null };
  if (canAccessVerified(u.role, u.discordRoles ?? [], u.verifiedAt)) return user;

  // Rien en base : soit le joueur n'est pas sur le serveur, soit il s'est
  // connecte AVANT la mise en place de ce verrou (verifiedAt n'est ecrit qu'a la
  // connexion). On demande a Discord plutot que d'ejecter quelqu'un dont la
  // seule faute est de ne pas s'etre reconnecte.
  const membre = await estMembreDuServeur(u.discordId);
  if (membre === false) redirect("/login?error=discord");
  if (membre === null) return user; // Discord injoignable : on ne punit pas une panne

  await prisma.user.update({ where: { id: u.id }, data: { verifiedAt: new Date() } }).catch(() => {});
  void attribuerRole(u.discordId, ROLE_VERIFIE_ID);
  return user;
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
