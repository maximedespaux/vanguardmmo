import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/builder-share/[shareId] — build partagé PUBLIC (lisible sans login).
export async function GET(_req: Request, context: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await context.params;
  if (!shareId) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const u = await prisma.user.findFirst({
    where: { shareId },
    select: { username: true, builderBlob: true, sharePublic: true },
  });
  if (!u || !u.sharePublic) return NextResponse.json({ error: "Build introuvable ou privé." }, { status: 404 });
  return NextResponse.json({ blob: u.builderBlob ?? null, username: u.username });
}
