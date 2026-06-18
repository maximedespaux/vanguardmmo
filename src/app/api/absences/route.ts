import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth, isOfficer } from "@/lib/access";

// GET → mes absences ; ?all=1 → toute la guilde (officiers+)
export async function GET(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const all = new URL(req.url).searchParams.get("all") === "1";
  if (all && isOfficer(a.user.role)) {
    const list = await prisma.absence.findMany({ include: { user: { select: { username: true, discordId: true, role: true } } }, orderBy: { startDate: "desc" } });
    return NextResponse.json(list);
  }
  const list = await prisma.absence.findMany({ where: { userId: a.user.id }, orderBy: { startDate: "desc" } });
  return NextResponse.json(list);
}
// POST → déclarer une absence (liée à moi)
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const b = await req.json();
  if (!b?.startDate || !b?.endDate) return NextResponse.json({ error: "startDate et endDate requis" }, { status: 400 });
  const abs = await prisma.absence.create({ data: {
    userId: a.user.id, startDate: new Date(b.startDate), endDate: new Date(b.endDate), reason: b.reason ?? null,
  }});
  return NextResponse.json(abs, { status: 201 });
}
