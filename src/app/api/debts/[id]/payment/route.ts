import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// POST /api/debts/[id]/payment — le joueur enregistre un remboursement  { amount, note }
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;

  const debt = await prisma.debt.findUnique({ where: { id: params.id }, include: { payments: true } });
  if (!debt) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  if (debt.userId !== auth.user.id) return NextResponse.json({ error: "pas ta dette" }, { status: 403 });

  const b = await req.json();
  const amount = BigInt(Math.max(0, Math.floor(Number(b.amount) || 0)));
  await prisma.debtPayment.create({ data: { debtId: debt.id, amount, note: b.note ?? null } });

  // Si le total remboursé couvre la dette, on marque REPAID.
  const paid = debt.payments.reduce((s, p) => s + p.amount, 0n) + amount;
  if (debt.amount > 0n && paid >= debt.amount) {
    await prisma.debt.update({ where: { id: debt.id }, data: { status: "REPAID" } });
  }
  return NextResponse.json({ ok: true });
}
