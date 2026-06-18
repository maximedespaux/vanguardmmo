import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

// État complet de l'AirGuild (app d'iBeats) — un seul blob JSON partagé (modèle AirGuildState).
async function guard() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error as NextResponse };
  if (!canAccessAdmin(a.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const g = await guard(); if ("error" in g) return g.error;
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  return NextResponse.json(row?.data ?? null);
}

export async function PUT(req: NextRequest) {
  const g = await guard(); if ("error" in g) return g.error;
  const data = await req.json().catch(() => null);
  if (data == null || typeof data !== "object") return NextResponse.json({ error: "data invalide" }, { status: 400 });
  await prisma.airGuildState.upsert({
    where: { id: "main" },
    create: { id: "main", data: data as object },
    update: { data: data as object },
  });
  return NextResponse.json({ ok: true });
}
