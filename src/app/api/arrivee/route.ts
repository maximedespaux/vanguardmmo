import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

/**
 * GET /api/arrivee — OÙ L'ON ARRIVE APRÈS LA CONNEXION (SPEC-INFORMATION-GUILDE §1).
 *
 * « Après la connexion, un membre de la guilde arrive sur Information Guilde ; un candidat
 * ou un visiteur reste sur `/`. » La page de connexion ne sait pas, au moment du clic, qui
 * va se connecter : elle confie donc son retour à cette adresse (`callbackUrl`), qui lit
 * le rang EN BASE — celui que le callback `jwt` vient d'écrire (lib/auth.ts) — et
 * renvoie au bon endroit. Rien d'autre : pas de page, aucune donnée, une redirection.
 *
 * Un Friend n'est pas de la guilde (§9) : il reste sur l'accueil, où « Mes personnages »
 * l'attend en tête.
 *
 * `redirect` répond une adresse RELATIVE : derrière le proxy, une adresse absolue bâtie
 * sur la requête pourrait porter l'hôte interne du conteneur.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  redirect(u && canAccessGuild(u.role) ? "/guilde" : "/");
}
