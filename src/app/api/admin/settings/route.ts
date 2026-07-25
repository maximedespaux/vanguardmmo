import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin } from "@/config/roles";

/**
 * Réglages simples clé/valeur, partagés entre le site et le bot.
 * Créé pour l'interrupteur des rappels Chambres Secrètes : le jeu peut être
 * indisponible, il faut pouvoir couper les rappels sans toucher au code.
 *
 * Seules les clés de LISTE_BLANCHE sont acceptées : sans ça, cette route
 * deviendrait un stockage libre écrivable par n'importe quel admin.
 */
const LISTE_BLANCHE = new Set(["cs_rappels_actifs", "gs_rappels_actifs"]);

/** Valeurs par défaut, appliquées quand la clé n'a jamais été écrite. */
const DEFAUTS: Record<string, string> = { cs_rappels_actifs: "0", gs_rappels_actifs: "0" };

export async function GET() {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const rows = await prisma.setting.findMany({ where: { key: { in: [...LISTE_BLANCHE] } } });
  const out: Record<string, string> = { ...DEFAUTS };
  for (const r of rows) out[r.key] = r.value;
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  if (!canAccessAdmin(auth.user.role)) {
    return NextResponse.json({ error: "Réservé au staff." }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const key = String(b.key ?? "");
  if (!LISTE_BLANCHE.has(key)) return NextResponse.json({ error: "Réglage inconnu." }, { status: 400 });
  const value = String(b.value ?? "");
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  return NextResponse.json({ ok: true, key, value });
}
