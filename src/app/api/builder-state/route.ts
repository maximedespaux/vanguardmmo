import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

// État complet du Stuff Builder, stocké par compte → sync cross-device.
// (Séparé de /api/characters/sync qui, lui, normalise vers GearProfile pour le GuildViewer.)

// GET — build du joueur connecté. ?user=<id|discordId> → build d'un membre (staff only, pour /builder/<user>).
export async function GET(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const target = new URL(req.url).searchParams.get("user");
  if (target && target !== a.user.id) {
    if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    const u = await prisma.user.findFirst({ where: { OR: [{ id: target }, { discordId: target }] }, select: { builderBlob: true, username: true } });
    if (!u) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    return NextResponse.json({ blob: u.builderBlob ?? null, username: u.username });
  }
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
