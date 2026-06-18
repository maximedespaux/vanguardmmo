import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessGuild, canAccessAdmin, rankValue } from "@/config/roles";
import type { Role, User } from "@prisma/client";
import { DEV_ALL } from "@/lib/devAccess";

// 🔓 Mode dev local (DEV_ALL) : crée/utilise un vrai User « dev » (rôle DIRECTION) pour
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
