import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { blobDesPersosPartages } from "@/lib/guilde";

/**
 * GET /api/builder-share/[shareId] — un build partagé.
 *
 * « Public » signifie ici « visible par les autres membres », pas « visible par
 * internet » : un build dit la classe, le stuff et le niveau de quelqu'un. Le
 * lien reste donc réservé aux membres du serveur Discord, comme le reste du
 * site — sinon il suffisait de faire circuler une URL pour contourner la
 * connexion.
 *
 * DEUX PARTAGES, deux portées :
 *  · le lien ouvert (`sharePublic`) montre TOUT le build, à qui a le lien ;
 *  · sans lui, les persos cochés « Visible dans Information Guilde » (`persosPartages`,
 *    SPEC-INFORMATION-GUILDE §5) se montrent aux seuls membres de la GUILDE — c'est d'elle
 *    que vient le lien « Voir le build » —, et le build ne contient alors QUE ces persos :
 *    un perso non coché n'est pas « caché à l'affichage », il ne part pas.
 */
export async function GET(_req: Request, context: { params: Promise<{ shareId: string }> }) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const { shareId } = await context.params;
  if (!shareId) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const u = await prisma.user.findFirst({
    where: { shareId },
    select: { username: true, builderBlob: true, sharePublic: true, persosPartages: true },
  });
  const introuvable = NextResponse.json({ error: "Build introuvable ou privé." }, { status: 404 });
  if (!u) return introuvable;
  if (u.sharePublic) return NextResponse.json({ blob: u.builderBlob ?? null, username: u.username });
  if (!u.persosPartages.length || !canAccessGuild(a.user.role)) return introuvable;
  const blob = blobDesPersosPartages(u.builderBlob, u.persosPartages);
  if (!blob) return introuvable;
  return NextResponse.json({ blob, username: u.username });
}
