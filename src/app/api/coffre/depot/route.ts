import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { donnerXp, pointsDepot } from "@/lib/xp";

/**
 * Dépôt RAPIDE dans son coffre personnel, depuis la liste de ce qui manque.
 *
 * Le même geste existe dans l'AirGuild, mais il demande d'ouvrir l'app, de
 * trouver l'objet et de saisir le total. Ici on part de la ligne « il en manque
 * 900 » : on tape ce qu'on a ramené, et c'est fini. C'est le même stock — on
 * écrit dans le MÊME inventaire (`AirGuildState.inv[pseudo]`), jamais dans une
 * copie qui divergerait.
 *
 * Réservé au staff, comme les coffres eux-mêmes.
 */
export async function POST(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Réservé au staff." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const itemRef = String(b?.itemRef ?? "").trim();
  const ajout = Math.max(1, Math.floor(Number(b?.quantite) || 0));
  if (!itemRef || !ajout) return NextResponse.json({ error: "Objet et quantité requis." }, { status: 400 });

  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const etat = (row?.data ?? {}) as Record<string, unknown>;
  const inv = (etat.inv && typeof etat.inv === "object" ? etat.inv : {}) as Record<string, Record<string, number>>;

  // Le coffre porte le pseudo, comme dans l'app : un membre sans coffre s'en
  // voit créer un, plutôt que de perdre son dépôt.
  const pseudo = a.user.username;
  const mien = inv[pseudo] ?? {};
  const avant = Number(mien[itemRef]) || 0;
  const apres = avant + ajout;

  const seuil = Number((etat as { thresh?: Record<string, { ok?: number }> }).thresh?.[itemRef]?.ok) || 10;
  const totalAvant = Object.values(inv).reduce((s, c) => s + (Number(c?.[itemRef]) || 0), 0);

  await prisma.airGuildState.upsert({
    where: { id: "main" },
    create: { id: "main", data: { ...etat, inv: { ...inv, [pseudo]: { ...mien, [itemRef]: apres } } } as object },
    update: { data: { ...etat, inv: { ...inv, [pseudo]: { ...mien, [itemRef]: apres } } } as object },
  });

  // Même barème que le dépôt constaté par la sauvegarde de l'app : ce qui
  // manquait au seuil vaut trois fois le surplus.
  const points = pointsDepot(ajout, Math.max(0, seuil - totalAvant));
  const jour = new Date().toISOString().slice(0, 10);
  await donnerXp(a.user.id, "depot", points, `${ajout} × ${itemRef.split("|").pop()} déposé au coffre`, `depot:${jour}:${pseudo}:${itemRef}:${apres}`);

  return NextResponse.json({ ok: true, stock: apres, points });
}
