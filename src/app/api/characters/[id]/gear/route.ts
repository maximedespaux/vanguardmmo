import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

const MODES = ["DPS", "TANK", "HYBRIDE"];
const RARITIES = ["COMMUN", "RARE", "EPIQUE", "LEGENDAIRE", "PREMYTHIQUE", "MYTHIQUE"];
const int = (v: any) => Math.max(0, Math.floor(Number(v) || 0));

async function ownsChar(userId: string, characterId: string) {
  const c = await prisma.character.findUnique({ where: { id: characterId } });
  return !!c && c.userId === userId;
}

// GET → les stuffs de CE perso (s'il m'appartient)
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!(await ownsChar(a.user.id, params.id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const gear = await prisma.gearProfile.findMany({ where: { characterId: params.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(gear);
}

// POST → crée un stuff (DPS/TANK/HYBRIDE) sur CE perso (enums validés, entiers bornés)
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!(await ownsChar(a.user.id, params.id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const b = await req.json();
  try {
    const g = await prisma.gearProfile.create({ data: {
      characterId: params.id,                  // ← jamais sans characterId
      name: String(b.name ?? "Stuff 1").slice(0, 60),
      mode: MODES.includes(b.mode) ? b.mode : "DPS",
      weaponRarity: RARITIES.includes(b.weaponRarity) ? b.weaponRarity : "COMMUN",
      weapon: b.weapon ?? undefined, armor: b.armor ?? undefined, jewelry: b.jewelry ?? undefined, pets: b.pets ?? undefined, cards: b.cards ?? undefined,
      hp: int(b.hp), attack: int(b.attack), defense: int(b.defense), critRate: int(b.critRate), critDamage: int(b.critDamage), damageReduction: int(b.damageReduction),
    }});
    return NextResponse.json(g, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Données de build invalides." }, { status: 400 });
  }
}
