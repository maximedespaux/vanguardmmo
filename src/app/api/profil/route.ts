import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

/**
 * Le profil du membre connecté, et lui seul.
 *
 * L'identité vient de Discord, les personnages du builder. Les commandes et les
 * mouvements de périns y figuraient aussi ; ils sont partis avec la Boutique, le
 * 2026-10-21, et leurs lignes restent en base.
 *
 * Le regard du staff sur un AUTRE membre n'est pas ici : c'est son dossier, dans le
 * tableau de bord des bras droits (/staff, section Membres & builds). Cette
 * route ne lit jamais que `a.user.id`, il n'y a pas de paramètre pour viser
 * quelqu'un d'autre — c'est le plus simple moyen de ne pas se tromper.
 */
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const u = a.user;

  const [persos, prefs] = await Promise.all([
    prisma.character.findMany({
      where: { userId: u.id }, orderBy: [{ isMain: "desc" }, { level: "desc" }],
      select: { id: true, name: true, class: true, level: true, prestige: true, isMain: true, _count: { select: { gearProfiles: true } } },
    }),
    prisma.userPref.findMany({ where: { userId: u.id }, select: { key: true, value: true } }),
  ]);

  return NextResponse.json({
    // Identité : en lecture seule, et la page le dit. Le pseudo et le rôle sont
    // resynchronisés depuis Discord à chaque connexion — les rendre modifiables
    // ici créerait un conflit qui se rejouerait à la prochaine ouverture.
    identite: {
      pseudo: u.username, role: u.role,
      membreDepuis: u.createdAt, verifieLe: u.verifiedAt,
      partageBuild: u.sharePublic, lienBuild: u.shareId,
    },
    compteurs: {
      personnages: persos.length,
      stuffs: persos.reduce((s, p) => s + p._count.gearProfiles, 0),
    },
    personnages: persos.map((p) => ({ ...p, stuffs: p._count.gearProfiles, _count: undefined })),
    preferences: Object.fromEntries(prefs.map((p) => [p.key, p.value])),
  });
}
