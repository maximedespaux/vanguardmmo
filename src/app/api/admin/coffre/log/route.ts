import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

// Journal des mouvements du coffre (crédits / débits) — qui, combien, quand.
async function requireAdmin() {
  const auth = await apiAuth();
  if ("error" in auth) return { error: auth.error as NextResponse };
  if (!canAccessAdmin(auth.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { user: auth.user };
}

export async function GET() {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const rows = await prisma.coffreMouvement.findMany({ orderBy: { createdAt: "desc" }, take: 80 });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin(); if ("error" in g) return g.error;
  const b = await req.json().catch(() => ({}));
  const itemId = b?.itemId != null && Number.isFinite(Number(b.itemId)) ? Number(b.itemId) : null;
  const qty = Math.max(1, Math.trunc(Number(b?.qty) || 0));
  const type = b?.type === "debit" ? "debit" : "credit";
  if (!b?.item || !qty) return NextResponse.json({ error: "item et quantité requis" }, { status: 400 });
  const delta = type === "credit" ? qty : -qty;

  // Ajuste le stock du coffre si l'objet y est suivi.
  if (itemId != null) {
    const ex = await prisma.coffreItem.findUnique({ where: { itemId } });
    if (ex) await prisma.coffreItem.update({ where: { itemId }, data: { stockTotal: Math.max(0, ex.stockTotal + delta) } });
  }

  const mv = await prisma.coffreMouvement.create({
    data: { itemId, item: String(b.item).slice(0, 120), delta, type, reason: b?.reason ? String(b.reason).slice(0, 160) : null, byUser: g.user.username ?? "?" },
  });
  return NextResponse.json(mv);
}
