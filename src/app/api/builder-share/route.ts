import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import crypto from "crypto";

// GET /api/builder-share — état de partage du build de l'utilisateur connecté.
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const u = await prisma.user.findUnique({ where: { id: a.user.id }, select: { shareId: true, sharePublic: true } });
  return NextResponse.json({ shareId: u?.shareId ?? null, public: u?.sharePublic ?? false });
}

// POST /api/builder-share — active/désactive le partage. body: { public?: boolean }.
//  Génère un shareId (unique, généré côté code) au 1er partage. Renvoie { shareId, public }.
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const pub = b?.public !== false; // défaut : public
  const cur = await prisma.user.findUnique({ where: { id: a.user.id }, select: { shareId: true } });
  const shareId = cur?.shareId ?? crypto.randomBytes(6).toString("base64url"); // court + URL-safe
  await prisma.user.update({ where: { id: a.user.id }, data: { shareId, sharePublic: pub } });
  return NextResponse.json({ shareId, public: pub });
}
