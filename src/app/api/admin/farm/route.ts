import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import fs from "fs";
import path from "path";

// Plan de farm calculé sur le VRAI stock du coffre AirGuild (airGuildState), et non plus
// sur la table CoffreItem (qui était déconnectée → « plan de farm vide »). #5

let CATALOG: { bankItems: any[]; icons: Record<string, string> } | null = null;
function loadCatalog() {
  if (CATALOG) return CATALOG;
  try {
    const p = path.join(process.cwd(), "public", "airguild", "data.json");
    const d = JSON.parse(fs.readFileSync(p, "utf-8"));
    CATALOG = { bankItems: d.bankItems ?? [], icons: d.icons ?? {} };
  } catch { CATALOG = { bankItems: [], icons: {} }; }
  return CATALOG;
}

// Seuil « vert » par défaut, aligné sur health() de airguild.js.
function defaultGreen(cat: string, unit: string): number {
  const c = (cat || "").trim();
  if (unit === "slot") return 2;
  if (c === "Ressource" || c === "R1" || c === "R2" || c.startsWith("Carte")) return 20;
  return 10;
}

// GET /api/admin/farm — liste « à farmer » (stock réel < seuil vert) + stats. Staff only.
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { bankItems, icons } = loadCatalog();
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const S = (row?.data ?? {}) as Record<string, any>;
  const inv: Record<string, Record<string, number>> = S.inv ?? {};
  const members: string[] = Array.isArray(S.members) ? S.members : Object.keys(inv);
  const custom: any[] = Array.isArray(S.custom) ? S.custom : [];
  const hidden = new Set<string>(Array.isArray(S.hidden) ? S.hidden : []);
  const overrides: Record<string, any> = S.overrides ?? {};
  const thresh: Record<string, { mid?: number; ok?: number }> = S.thresh ?? {};

  const totalOf = (id: string) => members.reduce((s, m) => s + (Number(inv[m]?.[id]) || 0), 0);

  const all = bankItems
    .concat(custom)
    .map((it: any) => (overrides[it.id] ? { ...it, ...overrides[it.id] } : it))
    .filter((it: any) => !hidden.has(it.id));

  const items = all
    .map((it: any) => {
      const stock = totalOf(it.id);
      const tok = thresh[it.id]?.ok;
      const target = tok && tok > 0 ? tok : defaultGreen(it.cat, it.unit);
      return {
        id: it.id, item: it.item, cat: (it.cat || "").trim(), classe: it.classe ?? "",
        icon: it.icData ? it.icData : (it.ic && icons[it.ic] ? icons[it.ic] : null),
        stock, target, manque: Math.max(0, target - stock), unit: it.unit ?? "",
      };
    })
    .filter((x) => x.manque > 0)
    .sort((a, b) => b.manque - a.manque);

  return NextResponse.json({
    items,
    totalItems: all.length,
    okCount: all.length - items.length,
    members: members.length,
  });
}
