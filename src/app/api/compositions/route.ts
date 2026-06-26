import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

// Composition des Chambres Secrètes — un blob JSON partagé par toute la guilde
// (inscriptions + candidats + sélection). Lecture/écriture ouvertes aux membres de guilde ;
// les actions sensibles (sélection, reset) sont gardées côté page (rôle admin).
async function guard() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error as NextResponse };
  if (!canAccessGuild(a.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const g = await guard(); if ("error" in g) return g.error;
  const row = await prisma.compositionState.findUnique({ where: { id: "main" } });
  return NextResponse.json(row?.data ?? { signups: [] });
}

export async function PUT(req: NextRequest) {
  const g = await guard(); if ("error" in g) return g.error;
  const data = await req.json().catch(() => null);
  if (data == null || typeof data !== "object") return NextResponse.json({ error: "data invalide" }, { status: 400 });
  if (JSON.stringify(data).length > 300_000) return NextResponse.json({ error: "trop volumineux" }, { status: 413 });
  await prisma.compositionState.upsert({
    where: { id: "main" },
    create: { id: "main", data: data as object },
    update: { data: data as object },
  });
  return NextResponse.json({ ok: true });
}
