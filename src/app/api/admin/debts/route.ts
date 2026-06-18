import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const STATUSES = ["REQUESTED", "PENDING_VALIDATION", "ACCEPTED", "REFUSED", "REPAID", "CANCELLED"] as const;
const ser = (d: any) => ({ ...d, amount: Number(d.amount), payments: d.payments?.map((p: any) => ({ ...p, amount: Number(p.amount) })) });

// GET /api/admin/debts?status=&userId= — toutes les dettes
export async function GET(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  if (!canAccessAdmin(auth.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const userId = url.searchParams.get("userId");
  const where: any = {};
  if (status && (STATUSES as readonly string[]).includes(status)) where.status = status;
  if (userId) where.userId = userId;

  const debts = await prisma.debt.findMany({
    where, include: { payments: true, user: { select: { username: true } } }, orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(debts.map(ser));
}

// POST /api/admin/debts — décider  { id, status, note }
export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  if (!canAccessAdmin(auth.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id, status, note } = await req.json();
  if (!id || !(STATUSES as readonly string[]).includes(status))
    return NextResponse.json({ error: "id ou statut invalide" }, { status: 400 });

  const updated = await prisma.debt.update({
    where: { id }, data: { status, adminNote: note ?? null, decidedBy: auth.user.username },
  });
  await audit(auth.user.username, `dette.${status}`, id);
  return NextResponse.json(ser(updated));
}
