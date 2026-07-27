import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { compterFilsNonLus } from "@/lib/messagerie";

// GET /api/notifications — mes notifications récentes + nombre de non-lues,
// et le nombre de conversations qui contiennent du neuf.
//
// Les deux compteurs voyagent ensemble parce que la cloche est déjà interrogée
// toutes les 45 s depuis chaque page : y greffer la messagerie évite un second
// va-et-vient permanent pour un seul chiffre.
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const [items, unread, fils] = await Promise.all([
    prisma.notification.findMany({ where: { userId: a.user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.count({ where: { userId: a.user.id, read: false } }),
    compterFilsNonLus(a.user).catch(() => 0),
  ]);
  return NextResponse.json({ items, unread, fils });
}

// POST /api/notifications — marque des notifications comme lues ({ ids?: string[] } ; sans ids = toutes).
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({} as any));
  const ids = Array.isArray(b?.ids) ? b.ids.filter((x: any) => typeof x === "string") : null;
  await prisma.notification.updateMany({
    where: { userId: a.user.id, read: false, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
