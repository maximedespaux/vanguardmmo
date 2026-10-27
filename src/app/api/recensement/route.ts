import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { GUILD_ROLES, canAccessAdmin } from "@/config/roles";
import { normaliserCompo } from "@/lib/compositions";
import { lignesRecensement, postesDesInscriptions, resumer } from "@/lib/recensement";
import { lienBuildPartage } from "@/lib/guilde";

/**
 * GET /api/recensement — les chiffres de chacun, stuff par stuff.
 * GET /api/recensement?vue=resume — les mêmes, comptés par classe et par rôle, pour la
 * rubrique Suivi des bras droits (spec §12.4) : elle lit ce résumé au lieu de recompter.
 *
 * La page /recensement est devenue le 2026-10-21 une SECTION d'Information Guilde, qui lit
 * SES lignes par GET /api/guilde (la seule route de la page, lib/guilde.ts) : mêmes
 * fonctions, mais sans membre caché et sans rien du staff. Ici restent le résumé du Suivi
 * et la vue complète, pour qui l'appelle directement (le bot, demain).
 *
 * MEMBRES SEULEMENT (`apiGuild`) : un visiteur ou un candidat (RECRUE) reçoit 401 / 403.
 * La page est ouverte à toute la guilde — c'est la décision de Maxime : chacun voit ce que
 * les autres alignent —, jamais au-delà.
 *
 * On lit des PERSONNAGES de comptes de la guilde, actifs, et de leurs stuffs la seule
 * colonne `mesures`. Ni `stats`, ni les pièces, ni `builderBlob`, ni `discordId` : la
 * réponse ne porte que ce qui s'affiche, et l'id d'un compte n'y figure que dans les liens
 * du staff, qui l'a déjà (spec §12.2).
 */
export async function GET(req: Request) {
  const a = await apiGuild();
  if ("error" in a) return a.error;
  const staff = canAccessAdmin(a.user.role);

  const [persos, etatRow] = await Promise.all([
    prisma.character.findMany({
      /* Un membre CACHÉ par un bras droit (`User.cacheLe`) sort des listes que lisent les
         membres ; le staff, lui, le voit toujours (SPEC-INFORMATION-GUILDE §4). */
      where: { user: { isActive: true, role: { in: GUILD_ROLES }, ...(staff ? {} : { cacheLe: null }) } },
      select: {
        name: true, class: true, level: true, prestige: true,
        user: { select: { id: true, username: true, sharePublic: true, shareId: true, persosPartages: true } },
        gearProfiles: { select: { mesures: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.compositionState.findUnique({ where: { id: "main" } }),
  ]);

  const maintenant = Date.now();
  /* Le build d'un autre, pour un membre : la règle d'Information Guilde (lib/guilde,
     `lienBuildPartage`) — le perso coché « Visible dans Information Guilde », et lui seul.
     Le staff garde la sienne (le build de chacun). */
  const comptes = new Map(persos.map((p) => [p.user.id, p.user]));
  const lignes = lignesRecensement(persos, {
    maintenant,
    appelant: { id: a.user.id, staff },
    postes: postesDesInscriptions(normaliserCompo(etatRow?.data)),
    lien: staff ? undefined : (p) => lienBuildPartage(comptes.get(p.user.id)!, p.name, a.user),
  });

  if (new URL(req.url).searchParams.get("vue") === "resume") {
    return NextResponse.json({ maintenant, ...resumer(lignes, staff) });
  }
  // `staff` ne donne rien : il dit seulement à la page d'afficher les liens que la route
  // a déjà calculés pour lui (dossier, build de chacun) et le filtre des comptes.
  return NextResponse.json({ maintenant, staff, lignes });
}
