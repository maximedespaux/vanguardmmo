import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { etatStuff, lireMesures, roleDuStuff } from "@/lib/mesures";
import { reglageAmis } from "@/lib/amis";
import { estAmi } from "@/config/amis";

/**
 * GET /api/admin/users → les comptes, leurs persos, leurs stuffs et leurs spés : la section
 * « Membres & builds » du tableau de bord (/staff).
 *
 *  · `comptes` : la guilde, et ceux qui en sont sortis ou y frappent (candidats, comptes
 *    sortis, exclus) — la section range ces derniers à part, repliés, avec leur dossier ;
 *  · `amis` : les comptes hors guilde qui portent le rôle Discord Friend (config/amis.ts,
 *    SPEC-INFORMATION-GUILDE §9). JAMAIS mêlés aux autres : ils ne sont pas de la guilde et
 *    n'ont rien à faire dans ses comptes. Leurs persos, leurs stuffs et leurs mesures se
 *    lisent comme ceux d'un membre — sans rien de ce qui fait un dossier : ni absences, ni
 *    marque « caché » ou « parti ».
 *
 * `cacheLe` : la pastille « Caché » (le membre ne figure plus dans Information Guilde).
 * `discordRoles` n'est lu que pour reconnaître un ami : il ne part pas.
 */
export async function GET() {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  /* `select` et non `include` : l'include renvoyait toutes les colonnes de User — dont
     le blob complet de l'AirBuilder de chacun — et toutes les pièces de chaque stuff,
     pour une liste qui n'en affiche rien. (Les dettes et les mouvements de périns n'y
     voyagent plus : partis avec la Boutique.) */
  const [users, reglage] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, username: true, avatar: true, role: true, isActive: true, lastSeenAt: true, cacheLe: true, discordRoles: true,
        characters: {
          select: {
            id: true, name: true, class: true, level: true, prestige: true, isMain: true,
            specializations: { select: { id: true, type: true, score: true } },
            gearProfiles: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true, name: true, mode: true, weaponRarity: true, hp: true, attack: true, defense: true, critRate: true,
                mesures: true, weapon: true, armor: true, jewelry: true, pets: true, cards: true,
              },
            },
          },
        },
        _count: { select: { absences: true } },
      },
      orderBy: { username: "asc" },
    }),
    reglageAmis(),
  ]);
  const maintenant = Date.now();
  // Les pièces ne servent qu'à dire si le stuff est vide : elles ne partent pas.
  const lire = ({ discordRoles: _roles, ...u }: (typeof users)[number]) => ({
    ...u,
    characters: u.characters.map((c) => ({
      ...c,
      gearProfiles: c.gearProfiles.map(({ weapon, armor, jewelry, pets, cards, mesures, ...g }) => {
        const m = lireMesures(mesures);
        return { ...g, mesures: m, role: roleDuStuff(g.name, c.class, m), etat: etatStuff({ mesures, weapon, armor, jewelry, pets, cards }, maintenant) };
      }),
    })),
  });
  const comptes: ReturnType<typeof lire>[] = [];
  const amis: ReturnType<typeof lire>[] = [];
  for (const u of users) (estAmi(u.role, u.discordRoles, reglage) ? amis : comptes).push(lire(u));
  return NextResponse.json({
    comptes,
    amis: amis.map(({ id, username, avatar, lastSeenAt, characters }) => ({ id, username, avatar, lastSeenAt, characters })),
  });
}
