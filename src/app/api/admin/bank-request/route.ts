import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";

const ser = (r: any) => ({ ...r, prixPublic: r.prixPublic?.toString() ?? null, prixFinal: r.prixFinal?.toString() ?? null });

// GET /api/admin/bank-request[?status=PENDING] — requêtes (admin)
export async function GET(req: Request) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const status = new URL(req.url).searchParams.get("status");
  const reqs = await prisma.bankRequest.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reqs.map(ser));
}
