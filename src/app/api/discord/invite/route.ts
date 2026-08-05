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
  // Un échec ne se met PAS en cache : sinon le visiteur qui tombe pendant une
  // panne Discord garde un écran sans bouton « Rejoindre » pendant dix minutes,
  // alors que c'est devenu la première étape obligatoire de la connexion.
  return NextResponse.json({ url }, {
    headers: {
      "Cache-Control": url ? "public, max-age=600, s-maxage=3600" : "no-store",
    },
  });
}
