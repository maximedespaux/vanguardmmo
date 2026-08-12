import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

/**
 * GET /api/shop — le catalogue du coffre commun : les articles EN STOCK, avec leur
 * categorie, leur classe, leur prix, leur rarete, leur quantite et leur icone.
 *
 * CETTE ROUTE EST OUVERTE A TOUS, et c'est un choix, pas un oubli. Demande de Maxime :
 * « avoir l'espace boutique en visualisation publique pour attirer et donner envie [...]
 * mais inutilisable sans connexion ». Une vitrine vide n'attire personne : il faut que
 * le visiteur voie le vrai stock et les vrais prix.
 *
 * CE QU'ELLE EXPOSE A ETE RELU LIGNE PAR LIGNE avant de retirer le garde : nom,
 * categorie, classe, prix, tarifs par rarete, stock, unite, icone. AUCUN nom de membre,
 * AUCUNE dette, AUCUNE commande, AUCUN journal. C'est un etalage, pas un registre — et
 * le commentaire d'origine le disait deja.
 *
 * CE QUI GARDE LA PORTE, puisque celle-ci s'ouvre : /api/bank-request, qui enregistre
 * une commande, reste garde par apiGuild(). Un visiteur voit donc l'etal et ne peut rien
 * en sortir. Si un jour cette route se met a renvoyer autre chose — un nom, une dette,
 * un historique — LE GARDE DOIT REVENIR EN MEME TEMPS.
 */
export async function GET() {

  const { bankItems, icons, bankCats } = loadCatalog();
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const S = (row?.data ?? {}) as any;
  // Boutique = stock TOTAL GUILDE : somme des coffres MEMBRES (le stock de chaque membre y compte).
  // On somme uniquement S.members (comme le client totalGuild) pour ignorer une clé héritée « Commun » non migrée.
  const allInv = (S.inv && typeof S.inv === "object") ? (S.inv as Record<string, Record<string, number>>) : {};
  const members: string[] = Array.isArray(S.members) ? S.members : Object.keys(allInv);
  const inv: Record<string, number> = {};
  const rarInv: Record<string, Record<string, number>> = {}; // armes suivies par rareté : baseId → { rareté: stock }
  for (const m of members) {
    const coffre = allInv[m];
    if (!coffre || typeof coffre !== "object") continue;
    for (const id of Object.keys(coffre)) {
      const n = Number(coffre[id]) || 0; if (!n) continue;
      const sep = id.indexOf("|R#"); // clé arme = « baseId|R#rareté »
      if (sep >= 0) {
        const base = id.slice(0, sep), rar = id.slice(sep + 3);
        inv[base] = (inv[base] || 0) + n;
        (rarInv[base] = rarInv[base] || {})[rar] = (rarInv[base][rar] || 0) + n;
      } else inv[id] = (inv[id] || 0) + n;
    }
  }
  const prices: Record<string, any> = S.prices ?? {};
  /* UN SEUL PRIX. Il y en avait trois — public, membre, dette — hérités d'une
     boutique ouverte hors guilde. Elle ne l'est plus, et surtout le tarif doit
     être COMMUN : trois prix pour un objet, c'est trois façons de se faire
     concurrence entre nous.

     Deux écritures anciennes restent lisibles : le nombre nu, et l'objet à
     paliers dont on reprend le prix MEMBRE — c'est celui que les gens payaient
     réellement, puisque seuls des membres voyaient la boutique. */
  const tiers = (id: string, base: number) => {
    const p = prices[id];
    if (p && typeof p === "object") return { v: p.v !== false, prix: +p.prix || +p.mem || +p.pub || 0 };
    const n = (p != null ? +p : 0) || base || 0;
    return { v: true, prix: n };
  };
  /* Le cours de l'Airpoint, fixé par la guilde dans l'AirGuild. 0 = pas de
     cours annoncé : on n'affiche alors aucune conversion plutôt que d'en
     inventer une. */
  const tauxAP = Math.max(0, Math.round(Number(S.tauxAP) || 0));
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
      const t = tiers(it.id, it.prix ?? 0);
      if (!t.v) return null; // pas proposé à la Boutique
      // Une arme a un prix PAR RARETÉ (clé « id|R#rareté » dans S.prices) : sans
      // cela, les tarifs saisis par rareté dans l'AirGuild ne seraient jamais lus
      // et la Boutique afficherait le même prix pour une Rare et une Pré-myth.
      const rar = rarInv[it.id] ?? null;
      const tiersParRarete = rar
        ? Object.fromEntries(Object.keys(rar).map((r) => [r, tiers(`${it.id}|R#${r}`, it.prix ?? 0)]))
        : null;
      return {
        id: it.id,
        item: it.item,
        cat: it.cat,
        classe: it.classe ?? "",
        price: t.prix,
        tiers: t,     // { v, prix } — un seul tarif, celui de la guilde
        tiersByRarity: tiersParRarete, // { rareté: { v, prix } } ou null
        stock,
        unit: it.unit ?? "",
        rarities: rar, // armes → { rareté: stock } ; null pour les objets sans rareté
        icon: it.icData ? it.icData : (it.ic && icons[it.ic] ? icons[it.ic] : null), // icData (asset perso édité) prioritaire, comme dans l'AirGuild (itemAsset)
      };
    })
    .filter(Boolean);

  // Catégories réellement présentes en stock : bankCats (ordre stable) + toute NOUVELLE
  // catégorie créée dans l'AirGuild (items custom / overrides), pour qu'elles apparaissent.
  const usedCats = [...new Set([...bankCats, ...items.map((i: any) => i.cat)])].filter((c: string) => c && items.some((i: any) => i.cat === c));
  return NextResponse.json({ items, cats: usedCats, tauxAP });
}
