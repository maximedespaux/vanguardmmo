import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { nomPartage } from "@/lib/guilde";
import crypto from "crypto";

/**
 * LE PARTAGE DE SON BUILD — la fenêtre « Partager mon build » de l'AirBuilder.
 *
 * Deux gestes, indépendants, et c'est le membre qui les fait lui-même (Maxime : « il est
 * possible de partager le build du membre si le membre le souhaite — intervention par
 * lui-même en partageant depuis l'AirBuilder ») :
 *
 *  · le LIEN (`sharePublic`) : un lien /build/{shareId} qu'il donne à qui il veut, réservé
 *    aux membres du serveur Discord — tout le build ;
 *  · « VISIBLE DANS INFORMATION GUILDE » (`persosPartages`, SPEC-INFORMATION-GUILDE §5) :
 *    une case PAR PERSO. Information Guilde montre alors « Voir le build » pour ce perso,
 *    et pour lui seul — les autres restent aux bras droits. Décocher retire le partage.
 *
 * Le shareId naît au premier des deux : c'est l'adresse des deux vues.
 */
const MAX_PERSOS = 30;

// GET /api/builder-share — état de partage du build de l'utilisateur connecté.
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const u = await prisma.user.findUnique({ where: { id: a.user.id }, select: { shareId: true, sharePublic: true, persosPartages: true } });
  return NextResponse.json({ shareId: u?.shareId ?? null, public: u?.sharePublic ?? false, persos: u?.persosPartages ?? [] });
}

/**
 * POST /api/builder-share
 *   { public: boolean }  — active ou coupe le lien (défaut : actif, comme avant) ;
 *   { persos: string[] } — la liste COMPLÈTE des persos visibles dans Information Guilde,
 *                          noms tels que l'AirBuilder les porte. Le lien n'est pas touché.
 * Renvoie { shareId, public, persos }.
 */
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const cur = await prisma.user.findUnique({ where: { id: a.user.id }, select: { shareId: true, sharePublic: true, persosPartages: true } });
  const shareId = cur?.shareId ?? crypto.randomBytes(6).toString("base64url"); // court + URL-safe

  if (Array.isArray(b?.persos)) {
    /* La liste entière plutôt qu'un perso à la fois : le builder envoie ce qu'il montre,
       et un nom qui ne correspond plus à rien (un perso renommé) tombe de lui-même. Les
       noms sont rangés comme la synchro les range (40 signes), sans doublon. */
    const vus = new Set<string>();
    const persos: string[] = [];
    for (const x of b.persos as unknown[]) {
      const nom = nomPartage(String(x ?? ""));
      if (!nom || vus.has(nom.toLowerCase())) continue;
      vus.add(nom.toLowerCase()); persos.push(nom);
    }
    if (persos.length > MAX_PERSOS) return NextResponse.json({ error: "Trop de persos." }, { status: 400 });
    await prisma.user.update({ where: { id: a.user.id }, data: { shareId, persosPartages: persos } });
    return NextResponse.json({ shareId, public: cur?.sharePublic ?? false, persos });
  }

  const pub = b?.public !== false; // défaut : public
  await prisma.user.update({ where: { id: a.user.id }, data: { shareId, sharePublic: pub } });
  return NextResponse.json({ shareId, public: pub, persos: cur?.persosPartages ?? [] });
}
