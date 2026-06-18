import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

// GET /api/characters → uniquement MES personnages (+ stuffs + spés)
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const characters = await prisma.character.findMany({
    where: { userId: a.user.id },
    include: { gearProfiles: true, specializations: true },
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(characters);
}

// POST /api/characters → crée un perso AUTOMATIQUEMENT associé à moi
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const b = await req.json();
  if (!b?.name || !b?.class) return NextResponse.json({ error: "name et class requis" }, { status: 400 });
  // si on demande isMain, on retire le flag des autres
  if (b.isMain) await prisma.character.updateMany({ where: { userId: a.user.id }, data: { isMain: false } });
  const character = await prisma.character.create({
    data: {
      userId: a.user.id,                       // ← jamais sans userId
      name: String(b.name),
      class: b.class,
      level: Number(b.level) || 200,
      prestige: Number(b.prestige) || 1,
      isMain: !!b.isMain,
      specialization: b.specialization ?? null,
    },
  });
  return NextResponse.json(character, { status: 201 });
}
