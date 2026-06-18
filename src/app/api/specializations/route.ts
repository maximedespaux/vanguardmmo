import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

// POST { characterId, type, score } → crée/maj la spé (si le perso m'appartient)
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const b = await req.json();
  if (!b?.characterId || !b?.type) return NextResponse.json({ error: "characterId et type requis" }, { status: 400 });
  const c = await prisma.character.findUnique({ where: { id: b.characterId } });
  if (!c || c.userId !== a.user.id) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const spec = await prisma.specialization.upsert({
    where: { characterId_type: { characterId: b.characterId, type: b.type } },
    update: { score: Number(b.score) || 0 },
    create: { characterId: b.characterId, type: b.type, score: Number(b.score) || 0 },
  });
  return NextResponse.json(spec);
}
