import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";

/**
 * Préférences d'affichage du compte connecté.
 *
 * GET  /api/prefs?key=…  → { value }        (null si jamais enregistrée)
 * PUT  /api/prefs        { key, value }
 *
 * Une clé inconnue est acceptée : c'est du confort d'affichage, pas de la
 * donnée métier. En revanche la valeur est bornée — sans ça la route
 * deviendrait un stockage libre écrivable par n'importe quel membre.
 */
const TAILLE_MAX = 20_000;

export async function GET(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!key) return NextResponse.json({ error: "key requise" }, { status: 400 });
  const row = await prisma.userPref.findUnique({
    where: { userId_key: { userId: auth.user.id, key: key.slice(0, 60) } },
  });
  return NextResponse.json({ value: row?.value ?? null });
}

export async function PUT(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const b = await req.json().catch(() => ({}));
  const key = String(b?.key ?? "").slice(0, 60);
  if (!key) return NextResponse.json({ error: "key requise" }, { status: 400 });
  if (JSON.stringify(b?.value ?? null).length > TAILLE_MAX) {
    return NextResponse.json({ error: "préférence trop volumineuse" }, { status: 413 });
  }
  await prisma.userPref.upsert({
    where: { userId_key: { userId: auth.user.id, key } },
    create: { userId: auth.user.id, key, value: b.value ?? null },
    update: { value: b.value ?? null },
  });
  return NextResponse.json({ ok: true });
}
