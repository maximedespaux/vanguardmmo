import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

// Événements du jeu — éditables sur le site (cette API), lus par le bot (scheduler).
const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "tous"];

async function requireAdmin() {
  const auth = await apiAuth();
  if ("error" in auth) return { error: auth.error };
  if (!canAccessAdmin(auth.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

const day = (v: any) => (DAYS.includes(v) ? v : "tous");
const time = (v: any) => (/^\d{1,2}:\d{2}$/.test(v) ? v : "21:00");
const rb = (v: any) => Math.max(0, Math.min(720, Math.trunc(Number(v) || 0)));

export async function GET() {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const rows = await prisma.gameEvent.findMany({ orderBy: [{ enabled: "desc" }, { name: "asc" }] });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const row = await prisma.gameEvent.create({
    data: { name, day: day(b.day), time: time(b.time), remindBefore: rb(b.remindBefore), channelId: b.channelId ? String(b.channelId).trim() : null, mention: typeof b.mention === "string" ? b.mention.trim() : "", enabled: b.enabled !== false },
  });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (b.name != null) data.name = String(b.name).trim();
  if (b.day != null) data.day = day(b.day);
  if (b.time != null) data.time = time(b.time);
  if (b.remindBefore != null) data.remindBefore = rb(b.remindBefore);
  if (b.channelId !== undefined) data.channelId = b.channelId ? String(b.channelId).trim() : null;
  if (b.mention !== undefined) data.mention = typeof b.mention === "string" ? b.mention.trim() : "";
  if (b.enabled !== undefined) data.enabled = !!b.enabled;
  const row = await prisma.gameEvent.update({ where: { id: String(b.id) }, data });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.gameEvent.delete({ where: { id: String(b.id) } });
  return NextResponse.json({ ok: true });
}
