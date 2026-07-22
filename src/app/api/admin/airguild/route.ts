import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

// État complet de l'AirGuild (app d'iBeats) — un seul blob JSON partagé (modèle AirGuildState).

// Migration coffre v2 (une seule fois, marquée par _csetup=2) : suppression du « Commun ».
// Le stock du Commun est fusionné dans le coffre principal de la guilde = le coffre membre d'iBeats.
// Idempotent même en accès concurrent : chaque GET part de l'état d'origine et produit le même merge
// (le dernier write gagne avec le même résultat, jamais de double-comptage). Aucune perte : le Total guilde
// (somme de tous les coffres) reste identique, on ne fait que déplacer/consolider entre coffres.
function migrateCoffreState(S: any): boolean {
  if (!S || typeof S !== "object" || S._csetup === 2) return false;
  const isObj = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);
  S.inv = isObj(S.inv) ? S.inv : {};
  S.members = Array.isArray(S.members) ? S.members : [];
  const norm = (s: string) => (s || "").trim().toLowerCase().replace(/^\.+/, "");
  const hasDot = (s: string) => /^\.+/.test((s || "").trim());
  const findKey = (want: string) =>
    Object.keys(S.inv).find((k) => norm(k) === want) ||
    S.members.find((m: string) => norm(m) === want);
  const main = findKey("ibeats") || "ibeats";
  const mainN = norm(main);
  if (!isObj(S.inv[main])) S.inv[main] = {};
  const mergeInto = (src: unknown) => {
    if (!isObj(src)) return;
    const s = src as Record<string, unknown>;
    for (const id of Object.keys(s)) {
      S.inv[main][id] = (Number(S.inv[main][id]) || 0) + (Number(s[id]) || 0);
    }
  };
  // Coffre principal = ex-« Commun » + TOUTE variante du coffre principal (casse/point/espace, ex. « iBeats » vs « ibeats »)
  // → consolidés dans une seule clé `main`. Aucune perte : on ne fait que déplacer, le Total guilde reste identique.
  for (const k of Object.keys(S.inv)) {
    if (k !== main && (norm(k) === "commun" || norm(k) === mainN)) { mergeInto(S.inv[k]); delete S.inv[k]; }
  }
  // Nettoyage du compte parasite « .dexoz » — variante à POINT uniquement (jamais un vrai joueur nommé « Dexoz »).
  for (const k of Object.keys(S.inv)) {
    if (k !== main && hasDot(k) && norm(k) === "dexoz") { mergeInto(S.inv[k]); delete S.inv[k]; }
  }
  S.members = S.members.filter((m: string) => {
    if (m === main) return true;
    if (norm(m) === "commun" || norm(m) === mainN) return false;
    if (hasDot(m) && norm(m) === "dexoz") return false;
    return true;
  });
  if (!S.members.includes(main)) S.members.push(main);
  if (!S.members.includes(S.cur) && S.cur !== "__total__") S.cur = "__total__";
  S.mainCoffre = main;
  S._csetup = 2;
  return true;
}

async function guard() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error as NextResponse };
  if (!canAccessAdmin(a.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const g = await guard(); if ("error" in g) return g.error;
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const data = (row?.data ?? null) as Record<string, unknown> | null;
  if (data && migrateCoffreState(data)) {
    await prisma.airGuildState.upsert({ where: { id: "main" }, create: { id: "main", data: data as object }, update: { data: data as object } });
  }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const g = await guard(); if ("error" in g) return g.error;
  const data = await req.json().catch(() => null);
  if (data == null || typeof data !== "object") return NextResponse.json({ error: "data invalide" }, { status: 400 });
  await prisma.airGuildState.upsert({
    where: { id: "main" },
    create: { id: "main", data: data as object },
    update: { data: data as object },
  });
  return NextResponse.json({ ok: true });
}
