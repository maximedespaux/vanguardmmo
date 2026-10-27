import { NextResponse } from "next/server";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { lireSuivi } from "@/lib/recap";

/**
 * GET /api/admin/suivi — la guilde, persos et stuffs montés, avec leurs mesures.
 *
 * Une route à elle plutôt que /api/admin/users : celle-ci porte aussi les candidats, et
 * chaque stuff y voyage avec ses pièces. Le suivi ne veut que la guilde et des chiffres.
 * Ses compteurs sont ceux de /staff : même module, même lecture.
 */
export async function GET() {
  const a = await apiRole(ADMIN_ROLES);
  if ("error" in a) return a.error;
  return NextResponse.json(await lireSuivi());
}
