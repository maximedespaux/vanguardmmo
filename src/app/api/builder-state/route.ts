import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

// État complet du Stuff Builder, stocké par compte → sync cross-device.
// (Séparé de /api/characters/sync qui, lui, normalise vers GearProfile pour le GuildViewer.)

// GET — récupère le build sauvegardé du joueur
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const u = await prisma.user.findUnique({ where: { id: a.user.id }, select: { builderBlob: true } });
  return NextResponse.json({ blob: u?.builderBlob ?? null });
}

// POST — sauvegarde le blob complet (auto-save débounce côté builder)
export async function POST(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  const blob = body?.blob;
  if (!blob || typeof blob !== "object") return NextResponse.json({ error: "blob requis" }, { status: 400 });
  if (JSON.stringify(blob).length > 500_000) return NextResponse.json({ error: "blob trop volumineux" }, { status: 413 });
  await prisma.user.update({ where: { id: a.user.id }, data: { builderBlob: blob } });
  return NextResponse.json({ ok: true });
}
