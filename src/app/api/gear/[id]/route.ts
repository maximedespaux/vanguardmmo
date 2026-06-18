import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

const MODES = ["DPS", "TANK", "HYBRIDE"];
const RARITIES = ["COMMUN", "RARE", "EPIQUE", "LEGENDAIRE", "PREMYTHIQUE", "MYTHIQUE"];
const int = (v: any) => Math.max(0, Math.floor(Number(v) || 0));

async function ownsGear(userId: string, gearId: string) {
  const g = await prisma.gearProfile.findUnique({ where: { id: gearId }, include: { character: true } });
  return g && g.character.userId === userId ? g : null;
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!(await ownsGear(a.user.id, params.id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const b = await req.json();

  // Liste blanche : on ne met à jour QUE ces champs (jamais characterId → pas de réattribution).
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string") data.name = b.name.slice(0, 60);
  if (MODES.includes(b.mode)) data.mode = b.mode;
  if (RARITIES.includes(b.weaponRarity)) data.weaponRarity = b.weaponRarity;
  for (const k of ["weapon", "armor", "jewelry", "pets", "cards"]) if (k in b) data[k] = b[k] ?? undefined;
  for (const k of ["hp", "attack", "defense", "critRate", "critDamage", "damageReduction"]) if (k in b) data[k] = int((b as any)[k]);

  try {
    const g = await prisma.gearProfile.update({ where: { id: params.id }, data });
    return NextResponse.json(g);
  } catch {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!(await ownsGear(a.user.id, params.id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.gearProfile.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
