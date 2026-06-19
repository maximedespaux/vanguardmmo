import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

const ser = (r: any) => ({ ...r, prixPublic: r.prixPublic?.toString() ?? null, prixFinal: r.prixFinal?.toString() ?? null });

// GET /api/bank-request — mes requêtes
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const reqs = await prisma.bankRequest.findMany({ where: { userId: a.user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(reqs.map(ser));
}

// POST /api/bank-request — créer une requête (pré-requis : profil avec au moins un personnage)
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const charCount = await prisma.character.count({ where: { userId: a.user.id } });
  if (charCount === 0) return NextResponse.json({ error: "Complète d'abord ton profil (au moins un personnage) pour faire une requête." }, { status: 400 });

  const b = await req.json();

  // ── Panier boutique : plusieurs articles d'un coup (souhait achat ou dette) ──
  if (Array.isArray(b.items) && b.items.length) {
    const mode = b.mode === "dette" ? "dette" : "achat";
    let count = 0;
    for (const it of b.items.slice(0, 40)) {
      const name = (it?.name ?? "").toString().slice(0, 200).trim();
      if (!name) continue;
      await prisma.bankRequest.create({
        data: {
          userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
          kind: "ITEM", item: name, quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
          reason: `🛒 Boutique · ~${Math.round(Number(it.price) || 0)} périns/u · souhait : ${mode === "dette" ? "dette" : "achat direct"}`,
        },
      });
      count++;
    }
    return NextResponse.json({ ok: true, count }, { status: 201 });
  }

  const kind = ["OBJET_IG", "ITEM", "PERINS"].includes(b.kind) ? b.kind : "OBJET_IG";
  const item = (b.item ?? "").toString().slice(0, 200).trim() || null;
  if (kind !== "PERINS" && !item) return NextResponse.json({ error: "Indique l'objet demandé." }, { status: 400 });

  const r = await prisma.bankRequest.create({
    data: {
      userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
      kind, item, quantity: Math.max(1, Math.floor(Number(b.quantity) || 1)),
      reason: (b.reason ?? "").toString().slice(0, 500).trim() || null,
      characterName: (b.characterName ?? "").toString().slice(0, 80).trim() || null,
    },
  });
  return NextResponse.json(ser(r), { status: 201 });
}
