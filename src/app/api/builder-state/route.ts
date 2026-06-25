import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

// État complet du Stuff Builder, stocké par compte → sync cross-device.
// (Séparé de /api/characters/sync qui, lui, normalise vers GearProfile pour le GuildViewer.)

// GET — build du joueur connecté. Pour le staff (?user=<id|discordId>) : build courant,
//   liste des 10 dernières versions (?list=1), ou une version précise (?v=<snapshotId>).
export async function GET(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const url = new URL(req.url);
  const target = url.searchParams.get("user");
  if (target && target !== a.user.id) {
    if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    const u = await prisma.user.findFirst({ where: { OR: [{ id: target }, { discordId: target }] }, select: { id: true, builderBlob: true, username: true } });
    if (!u) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    if (url.searchParams.get("list") === "1") {
      const snapshots = await prisma.buildSnapshot.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, createdAt: true } });
      return NextResponse.json({ snapshots, username: u.username });
    }
    const v = url.searchParams.get("v");
    if (v) {
      const snap = await prisma.buildSnapshot.findFirst({ where: { id: v, userId: u.id }, select: { blob: true } });
      return NextResponse.json({ blob: snap?.blob ?? null, username: u.username });
    }
    return NextResponse.json({ blob: u.builderBlob ?? null, username: u.username });
  }
  const u = await prisma.user.findUnique({ where: { id: a.user.id }, select: { builderBlob: true } });
  return NextResponse.json({ blob: u?.builderBlob ?? null });
}

// POST — sauvegarde le blob complet (auto-save débounce côté builder).
//   { snapshot: true } (envoyé par « Sauvegarder mes persos ») → archive aussi une version (10 max gardées).
export async function POST(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  const blob = body?.blob;
  if (!blob || typeof blob !== "object") return NextResponse.json({ error: "blob requis" }, { status: 400 });
  if (JSON.stringify(blob).length > 500_000) return NextResponse.json({ error: "blob trop volumineux" }, { status: 413 });
  await prisma.user.update({ where: { id: a.user.id }, data: { builderBlob: blob } });

  if (body.snapshot) {
    await prisma.buildSnapshot.create({ data: { userId: a.user.id, blob } });
    // on ne garde que les 10 plus récentes
    const old = await prisma.buildSnapshot.findMany({ where: { userId: a.user.id }, orderBy: { createdAt: "desc" }, skip: 10, select: { id: true } });
    if (old.length) await prisma.buildSnapshot.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
  return NextResponse.json({ ok: true });
}
