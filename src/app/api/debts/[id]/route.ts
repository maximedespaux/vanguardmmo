import { NextResponse } from "next/server";
import { apiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// DELETE /api/debts/[id] — supprime définitivement une dette de l'historique (réservé Vanguard / Direction).
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await apiRole(["VANGUARD", "DIRECTION"]);
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  try {
    await prisma.debt.delete({ where: { id } }); // les DebtPayment liés tombent en cascade
  } catch {
    return NextResponse.json({ error: "Dette introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
