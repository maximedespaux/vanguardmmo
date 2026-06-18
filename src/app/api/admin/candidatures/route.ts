import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "WAITING", "INTERVIEW"] as const;

// GET /api/admin/candidatures?status=PENDING — liste des candidatures
export async function GET(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  if (!canAccessAdmin(auth.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status");
  const where = status && (STATUSES as readonly string[]).includes(status) ? { status: status as any } : {};
  const apps = await prisma.application.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(apps);
}

// POST /api/admin/candidatures — décider d'une candidature  { id, status, note? }
export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  if (!canAccessAdmin(auth.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id, status, note } = await req.json();
  if (!id || !(STATUSES as readonly string[]).includes(status))
    return NextResponse.json({ error: "id ou statut invalide" }, { status: 400 });

  const updated = await prisma.application.update({
    where: { id },
    data: { status, adminNote: note ?? null, decidedBy: auth.user.username, decidedAt: new Date() },
  });
  await audit(auth.user.username, `candidature.${status}`, id);
  return NextResponse.json(updated);
}
