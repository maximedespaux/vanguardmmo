import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

/**
 * Mes objectifs de farm — un suivi pour soi, pas une promesse aux autres.
 *
 * GET    → les miens, en cours d'abord.
 * POST   → { titre, cible, itemRef?, unite? } : je m'y mets.
 * PATCH  → { id, fait? , termine? } : j'avance, ou j'arrête.
 *
 * Rien n'est vérifié par personne : c'est un pense-bête. C'est aussi pour ça
 * qu'un objectif ne donne PAS d'XP — sinon il suffirait de cocher.
 */
async function membre() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error };
  if (!canAccessGuild(a.user.role)) return { error: NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 }) };
  return { user: a.user };
}

export async function GET() {
  const m = await membre();
  if ("error" in m) return m.error;
  return NextResponse.json(
    await prisma.objectifFarm.findMany({
      where: { userId: m.user.id },
      orderBy: [{ termineAt: "asc" }, { createdAt: "desc" }],
      take: 40,
    })
  );
}

export async function POST(req: Request) {
  const m = await membre();
  if ("error" in m) return m.error;
  const b = await req.json().catch(() => ({}));
  const titre = String(b?.titre ?? "").trim().slice(0, 120);
  if (!titre) return NextResponse.json({ error: "Dis ce que tu vas farmer." }, { status: 400 });
  const o = await prisma.objectifFarm.create({
    data: {
      userId: m.user.id, titre,
      cible: Math.max(1, Math.min(999999, Math.floor(Number(b?.cible) || 1))),
      itemRef: b?.itemRef ? String(b.itemRef).slice(0, 160) : null,
      unite: b?.unite === "slot" ? "slot" : b?.unite === "unitaire" ? "unitaire" : null,
    },
  });
  return NextResponse.json(o, { status: 201 });
}

export async function PATCH(req: Request) {
  const m = await membre();
  if ("error" in m) return m.error;
  const b = await req.json().catch(() => ({}));
  const o = await prisma.objectifFarm.findUnique({ where: { id: String(b?.id ?? "") } });
  if (!o || o.userId !== m.user.id) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });

  if (b?.supprimer) {
    await prisma.objectifFarm.delete({ where: { id: o.id } });
    return NextResponse.json({ ok: true });
  }

  const fait = b?.fait != null ? Math.max(0, Math.min(o.cible, Math.floor(Number(b.fait) || 0))) : o.fait;
  // L'objectif se ferme tout seul quand le compte y est : personne n'a à penser
  // à cliquer « terminé » après avoir saisi le dernier lot.
  const termine = b?.termine === true || fait >= o.cible;
  return NextResponse.json(
    await prisma.objectifFarm.update({
      where: { id: o.id },
      data: { fait, termineAt: termine ? (o.termineAt ?? new Date()) : null },
    })
  );
}
