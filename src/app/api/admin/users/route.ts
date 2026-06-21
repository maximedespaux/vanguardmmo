import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";

// GET /api/admin/users → tous les membres + persos + stuffs + spés (suivi guilde)
export async function GET() {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const users = await prisma.user.findMany({
    include: { characters: { include: { gearProfiles: true, specializations: true } }, debts: { where: { status: "ACCEPTED" }, select: { id: true, item: true, amount: true, status: true } }, _count: { select: { transactions: true, absences: true } } },
    orderBy: { username: "asc" },
  });
  // BigInt (amount) non sérialisable en JSON → on convertit en Number
  const safe = users.map((u) => ({ ...u, debts: u.debts.map((d) => ({ ...d, amount: Number(d.amount) })) }));
  return NextResponse.json(safe);
}
