import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { normaliserCompo, CRENEAUX, type Creneau } from "@/lib/compositions";
import { BAREME, donnerXp } from "@/lib/xp";
import { BAREME_CREDITS, bougerCredits } from "@/lib/credits";

/**
 * POST /api/compositions/presences — le staff confirme qui était VRAIMENT là.
 *
 * « Je serai là » est une annonce, pas une venue : récompenser l'annonce
 * reviendrait à payer ceux qui cochent et jamais ceux qui viennent. La
 * confirmation se fait donc APRÈS le créneau, par quelqu'un qui y était.
 *
 * Corps : { creneau: "mer" | "dim" }. On crédite les présences ENCORE
 * inscrites : le staff retire d'abord les absents (la croix existe déjà à côté
 * de chaque nom), puis confirme ce qui reste.
 */
export async function POST(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const creneau = String(b?.creneau ?? "") as Creneau;
  if (!CRENEAUX.some((c) => c.id === creneau)) return NextResponse.json({ error: "Créneau inconnu." }, { status: 400 });

  const row = await prisma.compositionState.findUnique({ where: { id: "main" } });
  const etat = normaliserCompo(row?.data);
  const presents = etat.presences.filter((p) => p.creneau === creneau);
  if (!presents.length) return NextResponse.json({ credites: 0, message: "Personne n'est inscrit sur ce créneau." });

  // Un membre peut annoncer plusieurs personnages : il n'est là qu'une fois.
  const joueurs = Array.from(new Set(presents.map((p) => p.player).filter(Boolean)));
  const comptes = await prisma.user.findMany({
    where: { username: { in: joueurs } },
    select: { id: true, username: true },
  });

  const jour = new Date().toISOString().slice(0, 10);
  const libelle = CRENEAUX.find((c) => c.id === creneau)?.label ?? creneau;
  let credites = 0;
  for (const joueur of joueurs) {
    const compte = comptes.find((c) => c.username.toLowerCase() === joueur.toLowerCase());
    if (!compte) continue;
    // Une même soirée confirmée deux fois ne paie qu'une fois.
    await donnerXp(compte.id, "presence", BAREME.presence, `Présent aux Chambres Secrètes — ${libelle}`, `cs:${jour}:${creneau}:${compte.id}`);
    await bougerCredits(compte.id, BAREME_CREDITS.presence, `Présent aux Chambres Secrètes — ${libelle}`, `cs:${jour}:${creneau}:${compte.id}`);
    credites += 1;
  }
  return NextResponse.json({ credites });
}
