import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { GUILD_ROLES } from "@/config/roles";
import { jourParis, jourUTC } from "@/lib/recap";
import { versInformationGuilde } from "@/lib/guilde";

/**
 * GET /api/guilde — tout ce que la page Information Guilde affiche, et rien d'autre
 * (SPEC-INFORMATION-GUILDE §2 : « une seule route de lecture »).
 *
 * MEMBRES SEULEMENT (`apiGuild`) : un visiteur, un candidat ou un Friend reçoit 401 / 403.
 * Elle ne prend aucun paramètre : elle ne vise personne, elle rend la guilde.
 *
 * Ce qui est LU est borné à ce qui sert : l'identité Discord, le rang, les persos, et de
 * leurs stuffs les seules mesures et la présence des pièces (un stuff vide n'en est pas
 * un). Ni `builderBlob`, ni `stats`, ni `lastSeenAt`, ni le motif d'une absence ne sont
 * même demandés à la base. L'identifiant d'un compte est lu pour relier les lignes entre
 * elles, et ne sort pas : lib/guilde.ts compose la réponse.
 *
 * Remplace GET /api/accueil, gardée pour cette page depuis que l'accueil est devenu
 * public, et retirée avec elle le 2026-10-21.
 */
export async function GET() {
  const a = await apiGuild();
  if ("error" in a) return a.error;

  const maintenant = new Date();
  const auj = jourParis(maintenant);
  const demain = jourUTC(new Date(Date.parse(`${auj}T00:00:00Z`) + 86_400_000));

  const membres = await prisma.user.findMany({
    // Les rangs de guilde, les comptes actifs, pas les membres cachés (lib/guilde, `figure`).
    where: { role: { in: GUILD_ROLES }, isActive: true, cacheLe: null },
    select: {
      id: true, username: true, discordId: true, avatar: true, role: true, isActive: true, cacheLe: true,
      sharePublic: true, shareId: true, persosPartages: true,
      characters: {
        // L'ordre de l'AirBuilder (/api/characters) : le principal en tête.
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          name: true, class: true, level: true, prestige: true, isMain: true,
          gearProfiles: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { mesures: true, weapon: true, armor: true, jewelry: true, pets: true, cards: true },
          },
        },
      },
    },
  });

  const [absences, compo] = await Promise.all([
    /* Celles qui touchent aujourd'hui ; un refus seul sort du compte, la règle de /staff
       (lib/recap). Le motif n'est pas lu. */
    prisma.absence.findMany({
      where: {
        userId: { in: membres.map((m) => m.id) }, status: { not: "REJECTED" },
        startDate: { lt: new Date(`${demain}T00:00:00Z`) }, endDate: { gte: new Date(`${auj}T00:00:00Z`) },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
    prisma.compositionState.findUnique({ where: { id: "main" } }),
  ]);

  return NextResponse.json(versInformationGuilde(
    {
      membres,
      absences: absences.map((x) => ({ userId: x.userId, debut: jourUTC(x.startDate), fin: jourUTC(x.endDate) })),
      compo: compo?.data,
    },
    { moi: { id: a.user.id, username: a.user.username }, maintenant: maintenant.getTime(), aujourdhui: auj },
  ));
}
