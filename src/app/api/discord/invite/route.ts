import { NextResponse } from "next/server";
import { obtenirInvitation } from "@/lib/discord";

/**
 * GET /api/discord/invite → { url: string | null }
 *
 * Volontairement public : la page de connexion s'en sert pour inviter un
 * visiteur qui n'est pas encore sur le serveur, et cette page est publique.
 * Aucune donnée personnelle n'est exposée — juste le lien du serveur.
 *
 * obtenirInvitation() réutilise une invitation permanente existante et garde
 * le résultat en mémoire 1 h : appeler cette route en boucle ne crée pas
 * d'invitations à répétition.
 */
export async function GET() {
  const url = await obtenirInvitation();
  return NextResponse.json({ url }, {
    headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" },
  });
}
