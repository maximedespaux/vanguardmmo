import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import fs from "fs";
import path from "path";

// Catalogue statique (bankItems + icônes) de l'AirGuild — lu une fois et mis en cache.
let CATALOG: { bankItems: any[]; icons: Record<string, string>; bankCats: string[] } | null = null;
function loadCatalog() {
  if (CATALOG) return CATALOG;
  try {
    const p = path.join(process.cwd(), "public", "airguild", "data.json");
    const d = JSON.parse(fs.readFileSync(p, "utf-8"));
    CATALOG = { bankItems: d.bankItems ?? [], icons: d.icons ?? {}, bankCats: d.bankCats ?? [] };
  } catch {
    CATALOG = { bankItems: [], icons: {}, bankCats: [] };
  }
  return CATALOG;
}

// GET /api/shop — catalogue SHOPPABLE pour les membres : uniquement les articles en stock
// dans le coffre commun, avec prix + icône. Aucune donnée sensible (dettes/membres/log).
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;

  const { bankItems, icons, bankCats } = loadCatalog();
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const S = (row?.data ?? {}) as any;
  // Boutique = stock TOTAL GUILDE : somme des coffres MEMBRES (le stock de chaque membre y compte).
  // On somme uniquement S.members (comme le client totalGuild) pour ignorer une clé héritée « Commun » non migrée.
  const allInv = (S.inv && typeof S.inv === "object") ? (S.inv as Record<string, Record<string, number>>) : {};
  const members: string[] = Array.isArray(S.members) ? S.members : Object.keys(allInv);
  const inv: Record<string, number> = {};
  for (const m of members) {
    const coffre = allInv[m];
    if (!coffre || typeof coffre !== "object") continue;
    for (const id of Object.keys(coffre)) inv[id] = (inv[id] || 0) + (Number(coffre[id]) || 0);
  }
  const prices: Record<string, number> = S.prices ?? {};
  const custom: any[] = Array.isArray(S.custom) ? S.custom : [];
  const hidden = new Set<string>(Array.isArray(S.hidden) ? S.hidden : []);
  const overrides: Record<string, any> = S.overrides ?? {};

  const items = bankItems
    .concat(custom)
    .map((it: any) => (overrides[it.id] ? { ...it, ...overrides[it.id] } : it))
    .filter((it: any) => !hidden.has(it.id))
    .map((it: any) => {
      const stock = inv[it.id] ?? 0;
      if (stock <= 0) return null;
      return {
        id: it.id,
        item: it.item,
        cat: it.cat,
        classe: it.classe ?? "",
        price: prices[it.id] != null ? prices[it.id] : (it.prix ?? 0),
        stock,
        unit: it.unit ?? "",
        icon: it.icData ? it.icData : (it.ic && icons[it.ic] ? icons[it.ic] : null), // icData (asset perso édité) prioritaire, comme dans l'AirGuild (itemAsset)
      };
    })
    .filter(Boolean);

  // Catégories réellement présentes en stock : bankCats (ordre stable) + toute NOUVELLE
  // catégorie créée dans l'AirGuild (items custom / overrides), pour qu'elles apparaissent.
  const usedCats = [...new Set([...bankCats, ...items.map((i: any) => i.cat)])].filter((c: string) => c && items.some((i: any) => i.cat === c));
  return NextResponse.json({ items, cats: usedCats });
}
