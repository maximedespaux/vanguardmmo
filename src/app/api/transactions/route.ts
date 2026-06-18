import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth, isOfficer } from "@/lib/access";

// GET → mes transactions ; ?all=1 → toute la guilde (officiers+)
export async function GET(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const all = new URL(req.url).searchParams.get("all") === "1";
  const where = all && isOfficer(a.user.role) ? {} : { userId: a.user.id };
  const list = await prisma.bankTransaction.findMany({ where, include: all ? { user: { select: { username: true, discordId: true, role: true } } } : undefined, orderBy: { createdAt: "desc" } });
  // BigInt → string pour la sérialisation JSON
  return NextResponse.json(list.map(t => ({ ...t, amount: t.amount.toString() })));
}
// POST → demande/dette liée à moi
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const b = await req.json();
  const t = await prisma.bankTransaction.create({ data: {
    userId: a.user.id, type: b.type ?? "DETTE", item: b.item ?? null, amount: BigInt(Math.max(0, Number(b.amount) || 0)), description: b.description ?? null,
  }});
  return NextResponse.json({ ...t, amount: t.amount.toString() }, { status: 201 });
}
