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
  // Les noms de personnage sont uniques en jeu. L'AirBuilder pousse ici les
  // persos qu'il cree (vgPousserPersoCompte) : sans ce garde-fou, rouvrir le
  // builder ou recreer un perso deja connu remplirait le compte de doublons.
  const deja = await prisma.character.findFirst({
    where: { userId: a.user.id, name: { equals: String(b.name), mode: "insensitive" } },
  });
  if (deja) return NextResponse.json(deja);
  // si on demande isMain, on retire le flag des autres
  if (b.isMain) await prisma.character.updateMany({ where: { userId: a.user.id }, data: { isMain: false } });
  const character = await prisma.character.create({
    data: {
      userId: a.user.id,                       // ← jamais sans userId
      name: String(b.name),
      class: b.class,
      level: Number(b.level) || 200,
      prestige: Number(b.prestige) || 1,
      // "G" ou "F" : choisit l'illustration du personnage. Toute autre valeur est ignoree.
      sex: b.sex === "F" || b.sex === "G" ? b.sex : null,
      isMain: !!b.isMain,
      specialization: b.specialization ?? null,
    },
  });
  return NextResponse.json(character, { status: 201 });
}
