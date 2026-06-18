// ════════════════════════════════════════════════════════════
//  Import du catalogue d'objets depuis le wiki AirFlyff.
//  Lit scripts/wiki-source.html (JSON embarqué #payload) et écrit :
//    - public/data/items.json  (catalogue léger pour le site/coffre)
//  Lancement : node scripts/import-items.cjs
// ════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(__dirname, "wiki-source.html");
const OUT = path.join(ROOT, "public", "data", "items.json");

const html = fs.readFileSync(SRC, "utf8");
const m = html.match(/id=["']payload["'][^>]*>([\s\S]*?)<\/script>/i);
if (!m) { console.error("payload introuvable"); process.exit(1); }
const DB = JSON.parse(m[1].trim());

const items = (DB.items || [])
  .filter((it) => it && it.n) // doit avoir un nom
  .map((it) => ({
    id: it.i,
    name: it.n,
    type: it.t || null,
    job: it.j || null,
    level: it.lv || null,
    grade: it.r != null ? String(it.r) : null, // rang brut du wiki (≠ rareté builder)
    icon: it.ic ? `https://api.flyff.com/image/item/${it.ic}` : null,
  }));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(items));
const sizeMo = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`✅ ${items.length} objets écrits dans public/data/items.json (${sizeMo} Mo)`);

// Stats utiles
const byType = {};
items.forEach((it) => { if (it.type) byType[it.type] = (byType[it.type] || 0) + 1; });
console.log("Top types :", Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, n]) => `${t}:${n}`).join(", "));
