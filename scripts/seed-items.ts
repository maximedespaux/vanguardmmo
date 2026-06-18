// ════════════════════════════════════════════════════════════
//  SEED DES OBJETS DEPUIS L'API OFFICIELLE FLYFF
//  Aspire les objets de base depuis https://api.flyff.com et écrit
//  un fichier brut src/data/items-officiel.json.
//  Lancement :  pnpm tsx scripts/seed-items.ts
//  ⚠️ Données OFFICIELLES (pas AirFlyff). Sert de base : ensuite on
//     ajoute/écrase les objets AirFlyff custom à la main dans items.ts.
//  Détails : references/API_OFFICIELLE_FR.md
// ════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";

const API = "https://api.flyff.com";
// Catégories utiles au builder
const KEEP = new Set(["weapon", "armor", "jewelry", "fashion"]);

async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// Récupère par lots (l'API accepte des IDs séparés par des virgules)
async function fetchInBatches(ids: number[], size = 200): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const chunk = ids.slice(i, i + size).join(",");
    const data = await getJson(`${API}/item/${chunk}`);
    out.push(...(Array.isArray(data) ? data : [data]));
    console.log(`  ...${Math.min(i + size, ids.length)}/${ids.length}`);
  }
  return out;
}

async function main() {
  console.log("→ Liste des IDs d'objets…");
  const ids: number[] = await getJson(`${API}/item`);
  console.log(`  ${ids.length} objets au total.`);

  console.log("→ Téléchargement par lots…");
  const all = await fetchInBatches(ids);

  const filtered = all
    .filter((it) => KEEP.has(it.category))
    .map((it) => ({
      id: it.id,
      name: it.name?.en ?? it.name,
      category: it.category,
      subcategory: it.subcategory ?? null,
      rarity: it.rarity ?? null,
      class: it.class ?? null,        // ID de classe officielle requis
      level: it.level ?? null,
      twoHanded: it.twoHanded ?? false,
      minAttack: it.minAttack ?? null,
      maxAttack: it.maxAttack ?? null,
      minDefense: it.minDefense ?? null,
      maxDefense: it.maxDefense ?? null,
      element: it.element ?? null,
      icon: it.icon ?? null,
      abilities: it.abilities ?? [],
    }));

  const out = path.join(process.cwd(), "src/data/items-officiel.json");
  fs.writeFileSync(out, JSON.stringify(filtered, null, 1));
  console.log(`✅ ${filtered.length} objets écrits dans ${out}`);
  console.log("   Prochaine étape : mapper classes officielles → AirFlyff et nourrir items.ts.");
}

main().catch((e) => { console.error(e); process.exit(1); });
