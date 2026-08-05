import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

/**
 * GET /api/builder-share/[shareId] — un build partagé.
 *
 * « Public » signifie ici « visible par les autres membres », pas « visible par
 * internet » : un build dit la classe, le stuff et le niveau de quelqu'un. Le
 * lien reste donc réservé aux membres du serveur Discord, comme le reste du
 * site — sinon il suffisait de faire circuler une URL pour contourner la
 * connexion.
 */
export async function GET(_req: Request, context: { params: Promise<{ shareId: string }> }) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const { shareId } = await context.params;
  if (!shareId) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const u = await prisma.user.findFirst({
    where: { shareId },
    select: { username: true, builderBlob: true, sharePublic: true },
  });
  if (!u || !u.sharePublic) return NextResponse.json({ error: "Build introuvable ou privé." }, { status: 404 });
  return NextResponse.json({ blob: u.builderBlob ?? null, username: u.username });
}
