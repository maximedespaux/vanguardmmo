import { NextResponse } from "next/server";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { calculerRecap } from "@/lib/recap";

/**
 * GET /api/admin/a-traiter — la file des bras droits et les compteurs de /staff.
 *
 * Le calcul vit dans lib/recap.ts et non ici : le bot le reprendra pour son récap,
 * et deux calculs finiraient par donner deux chiffres. Le bloc « À traiter » de
 * l'accueil d'un bras droit en lit les trois premières lignes : aucune route ouverte
 * aux membres ne porte rien du staff.
 */
export async function GET() {
  const a = await apiRole(ADMIN_ROLES);
  if ("error" in a) return a.error;
  return NextResponse.json(await calculerRecap());
}
