import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

/**
 * L'état réel du coffre, calculé une seule fois pour tout le monde.
 *
 * Ce calcul vivait dans la route du plan de farm, donc réservé au staff. Les
 * quêtes en ont besoin elles aussi : sans le stock ni le seuil, demander « une
 * Griffe de Bang » ne dit pas si la guilde en a zéro ou trois cents. Le sortir
 * ici évite d'en écrire une deuxième version qui divergerait aussitôt — c'est
 * exactement comme ça que CoffreItem s'était retrouvée déconnectée du vrai
 * stock.
 *
 * Le stock ne vient PAS de la table CoffreItem mais de l'état AirGuild
 * (inventaire par membre) : c'est le seul endroit que l'app d'iBeats met à jour.
 */

let CATALOG: { bankItems: any[]; icons: Record<string, string>; noRarity: string[] } | null = null;
function loadCatalog() {
  if (CATALOG) return CATALOG;
  try {
    const p = path.join(process.cwd(), "public", "airguild", "data.json");
    const d = JSON.parse(fs.readFileSync(p, "utf-8"));
    CATALOG = { bankItems: d.bankItems ?? [], icons: d.icons ?? {}, noRarity: Array.isArray(d.noRarity) ? d.noRarity : [] };
  } catch { CATALOG = { bankItems: [], icons: {}, noRarity: [] }; }
  return CATALOG;
}

/**
 * Raretes d'armes, memes cles que airguild.js. `premyth` est traitee a part : la
 * guilde veut toujours au moins un exemplaire pre-mythique de chaque arme.
 */
const RARETES = ["rare", "epique", "legendaire", "premyth"] as const;
const PREMYTH_MINI = 1;

/**
 * Meme regle que needsRarity() dans airguild.js : toutes les armes des categories
 * « Armes… » SAUF ce que liste `noRarity`.
 *
 * La liste vit dans data.json, lue par les DEUX cotes. Elle etait auparavant
 * recopiee ici, et la copie avait aussitot derive : « grimoire » manquait, donc
 * les grimoires reclamaient un exemplaire pre-mythique qui n'existe pas pour eux.
 * Le repli couvre le cas d'un data.json sans la cle.
 */
const SANS_RARETE_DEFAUT = ["rune", "marteau", "bouclier", "grimoire"];
function aDesRaretes(it: { cat?: string; item?: string }): boolean {
  if (String(it.cat ?? "").toLowerCase().indexOf("armes") !== 0) return false;
  const liste = loadCatalog().noRarity.length ? loadCatalog().noRarity : SANS_RARETE_DEFAUT;
  const n = String(it.item ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return !liste.some((w) => n.includes(String(w).toLowerCase()));
}

// Seuil « vert » par défaut, aligné sur health() de airguild.js.
function defaultGreen(cat: string, unit: string): number {
  const c = (cat || "").trim();
  if (unit === "slot") return 2;
  if (c === "Ressource" || c === "R1" || c === "R2" || c.startsWith("Carte")) return 20;
  return 10;
}

export type ObjetCoffre = {
  id: string;
  item: string;
  cat: string;
  classe: string;
  icon: string | null;
  stock: number;
  target: number;
  manque: number;
  unit: string;
  rarete: boolean;
  premyth: number;
  manquePremyth: number;
};

export async function etatCoffre(): Promise<{ items: ObjetCoffre[]; membres: number }> {
  const { bankItems, icons } = loadCatalog();
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const S = (row?.data ?? {}) as Record<string, any>;
  const inv: Record<string, Record<string, number>> = S.inv ?? {};
  const members: string[] = Array.isArray(S.members) ? S.members : Object.keys(inv);
  const custom: any[] = Array.isArray(S.custom) ? S.custom : [];
  const hidden = new Set<string>(Array.isArray(S.hidden) ? S.hidden : []);
  const overrides: Record<string, any> = S.overrides ?? {};
  const thresh: Record<string, { mid?: number; ok?: number }> = S.thresh ?? {};

  const brut = (id: string) => members.reduce((s, m) => s + (Number(inv[m]?.[id]) || 0), 0);

  /**
   * Stock total d'un objet. Pour une arme, le coffre repartit le stock sur des
   * cles par rarete (`id|R#rare`, `id|R#premyth`, …) et la cle nue reste vide :
   * ne sommer que celle-ci faisait apparaitre TOUTES les armes a 0, meme
   * largement en stock. On englobe donc l'ensemble des raretes.
   */
  const totalOf = (it: { id: string; cat?: string; item?: string }) => {
    if (!aDesRaretes(it)) return brut(it.id);
    return brut(it.id) + RARETES.reduce((s, r) => s + brut(`${it.id}|R#${r}`), 0);
  };
  const premythOf = (id: string) => brut(`${id}|R#premyth`);

  const all = bankItems
    .concat(custom)
    .map((it: any) => (overrides[it.id] ? { ...it, ...overrides[it.id] } : it))
    .filter((it: any) => !hidden.has(it.id));

  const items: ObjetCoffre[] = all.map((it: any) => {
    const stock = totalOf(it);
    const tok = thresh[it.id]?.ok;
    const target = tok && tok > 0 ? tok : defaultGreen(it.cat, it.unit);
    // Reserve pre-mythique : comptee separement du total, car une arme peut
    // etre au seuil sans qu'aucun exemplaire ne soit pre-myth.
    const rarete = aDesRaretes(it);
    const premyth = rarete ? premythOf(it.id) : 0;
    const manquePremyth = rarete ? Math.max(0, PREMYTH_MINI - premyth) : 0;
    return {
      id: it.id, item: it.item, cat: (it.cat || "").trim(), classe: it.classe ?? "",
      icon: it.icData ? it.icData : (it.ic && icons[it.ic] ? icons[it.ic] : null),
      stock, target, manque: Math.max(0, target - stock), unit: it.unit ?? "",
      rarete, premyth, manquePremyth,
    };
  });

  return { items, membres: members.length };
}
