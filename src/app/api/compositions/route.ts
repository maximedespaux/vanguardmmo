import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { normaliserCompo } from "@/lib/compositions";

// Composition des Chambres Secrètes — un blob JSON partagé par toute la guilde
// (inscriptions + candidats + sélection). Lecture/écriture ouvertes aux membres de guilde ;
// les actions sensibles (sélection, reset) sont gardées côté page (rôle admin).
async function guard() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error as NextResponse };
  if (!canAccessGuild(a.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const g = await guard(); if ("error" in g) return g.error;
  const row = await prisma.compositionState.findUnique({ where: { id: "main" } });
  // Toujours une forme garantie : le bot lit les memes donnees pour annoncer
  // l'effectif manquant, il ne peut pas s'appuyer sur un blob libre.
  return NextResponse.json(normaliserCompo(row?.data));
}

export async function PUT(req: NextRequest) {
  const g = await guard(); if ("error" in g) return g.error;
  const brut = await req.json().catch(() => null);
  if (brut == null || typeof brut !== "object") return NextResponse.json({ error: "data invalide" }, { status: 400 });
  // On normalise AVANT d'ecrire : rien d'inattendu n'entre en base, et les
  // bornes de taille sont appliquees champ par champ (plus sur qu'un seul
  // controle sur la taille totale).
  const data = normaliserCompo(brut);
  await prisma.compositionState.upsert({
    where: { id: "main" },
    create: { id: "main", data: data as object },
    update: { data: data as object },
  });
  return NextResponse.json({ ok: true });
}
