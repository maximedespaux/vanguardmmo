import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

// Build de référence d'un poste de Chambre Secrète (id = slotId).
// GET : toute la guilde (lecture). PUT : rôle Vanguard uniquement (édition).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { slotId } = await params;
  const row = await prisma.compositionRefBuild.findUnique({ where: { id: slotId } });
  return NextResponse.json({ blob: row?.blob ?? null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (a.user.role !== "VANGUARD" && process.env.NEXT_PUBLIC_DEV_ALL_ACCESS !== "1") return NextResponse.json({ error: "Réservé au rôle Vanguard" }, { status: 403 });
  const { slotId } = await params;
  const body = await req.json().catch(() => null);
  const blob = body?.blob;
  if (!blob || typeof blob !== "object") return NextResponse.json({ error: "blob requis" }, { status: 400 });
  if (JSON.stringify(blob).length > 400_000) return NextResponse.json({ error: "trop volumineux" }, { status: 413 });
  await prisma.compositionRefBuild.upsert({ where: { id: slotId }, create: { id: slotId, blob }, update: { blob } });
  return NextResponse.json({ ok: true });
}
