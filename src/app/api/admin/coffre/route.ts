import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

// Coffre de guilde (AirGuild) — persistance en base (modèle CoffreItem).
// Forme exposée = CoffreEntry de la page : { id (=itemId catalogue), category, job, target, stock, status }.

const toEntry = (r: { itemId: number | null; category: string | null; job: string | null; target: number; stockTotal: number; status: string; assignedTo: string | null; priority: boolean }) => ({
  id: r.itemId, category: r.category ?? "Divers", job: r.job ?? "", target: r.target, stock: r.stockTotal, status: r.status, assignedTo: r.assignedTo ?? "", priority: !!r.priority,
});

async function requireAdmin() {
  const auth = await apiAuth();
  if ("error" in auth) return { error: auth.error };
  if (!canAccessAdmin(auth.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const rows = await prisma.coffreItem.findMany({ where: { itemId: { not: null } }, orderBy: [{ category: "asc" }, { item: "asc" }] });
  return NextResponse.json(rows.map(toEntry));
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [body];
  let count = 0;
  for (const e of list) {
    const itemId = Number(e?.id ?? e?.itemId);
    if (!Number.isFinite(itemId)) continue;
    const stock = Math.max(0, Math.trunc(Number(e.stock) || 0));
    const target = Math.max(1, Math.trunc(Number(e.target) || 10));
    const status = e.status === "stock" ? "stock" : "farm";
    await prisma.coffreItem.upsert({
      where: { itemId },
      create: { itemId, item: String(e.item ?? e.name ?? `#${itemId}`), category: e.category ?? "Divers", job: e.job || null, stockTotal: stock, target, status },
      update: { item: e.item ?? undefined, category: e.category ?? undefined, job: e.job ?? undefined, stockTotal: stock, target, status },
    });
    count++;
  }
  return NextResponse.json({ ok: true, count });
}

export async function PATCH(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const b = await req.json().catch(() => ({}));
  const itemId = Number(b?.id ?? b?.itemId);
  if (!Number.isFinite(itemId)) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const data: { stockTotal?: number; target?: number; status?: string; assignedTo?: string | null; priority?: boolean } = {};
  if (b.stock != null) data.stockTotal = Math.max(0, Math.trunc(Number(b.stock) || 0));
  if (b.target != null) data.target = Math.max(1, Math.trunc(Number(b.target) || 10));
  if (b.status) data.status = b.status === "stock" ? "stock" : "farm";
  if (b.assignedTo !== undefined) data.assignedTo = b.assignedTo ? String(b.assignedTo).slice(0, 60) : null;
  if (b.priority !== undefined) data.priority = !!b.priority;
  const row = await prisma.coffreItem.update({ where: { itemId }, data });
  return NextResponse.json(toEntry(row));
}

export async function DELETE(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const b = await req.json().catch(() => ({}));
  const itemId = Number(b?.id ?? b?.itemId);
  if (!Number.isFinite(itemId)) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.coffreItem.deleteMany({ where: { itemId } });
  return NextResponse.json({ ok: true });
}
