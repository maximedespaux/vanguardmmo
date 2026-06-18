import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// Sérialise les BigInt (amount) en nombre pour le JSON.
function ser(d: any) {
  return { ...d, amount: Number(d.amount), payments: d.payments?.map((p: any) => ({ ...p, amount: Number(p.amount) })) };
}

// GET /api/debts — les dettes de l'utilisateur courant
export async function GET() {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const debts = await prisma.debt.findMany({
    where: { userId: auth.user.id },
    include: { payments: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(debts.map(ser));
}

// POST /api/debts — créer une demande de dette/prêt  { type, amount, item, reason, dueDate, characterName, creditor }
export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const b = await req.json();
  const debt = await prisma.debt.create({
    data: {
      userId: auth.user.id,
      type: b.type ?? "PENYA",
      amount: BigInt(Math.max(0, Math.floor(Number(b.amount) || 0))),
      item: b.item ?? null,
      reason: b.reason ?? null,
      creditor: b.creditor ?? null,
      characterName: b.characterName ?? null,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      status: "PENDING_VALIDATION",
    },
  });
  return NextResponse.json(ser(debt));
}
