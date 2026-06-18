import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error; // bras droits uniquement
  const b = await req.json();
  const data: any = {};
  if (b.status) data.status = b.status;
  if (b.amount != null) data.amount = BigInt(Math.max(0, Number(b.amount) || 0));
  const t = await prisma.bankTransaction.update({ where: { id: params.id }, data });
  return NextResponse.json({ ...t, amount: t.amount.toString() });
}
