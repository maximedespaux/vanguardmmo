import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

async function owned(userId: string, id: string) {
  const c = await prisma.character.findUnique({ where: { id } });
  return c && c.userId === userId ? c : null;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiAuth(); if ("error" in a) return a.error;
  const c = await prisma.character.findFirst({ where: { id: params.id, userId: a.user.id }, include: { gearProfiles: true, specializations: true } });
  if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(c);
}
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!(await owned(a.user.id, params.id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const b = await req.json();
  if (b.isMain) await prisma.character.updateMany({ where: { userId: a.user.id }, data: { isMain: false } });
  const c = await prisma.character.update({ where: { id: params.id }, data: {
    name: b.name, class: b.class, level: b.level, prestige: b.prestige, isMain: b.isMain, specialization: b.specialization,
  }});
  return NextResponse.json(c);
}
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!(await owned(a.user.id, params.id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.character.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
