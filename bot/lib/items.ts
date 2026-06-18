// ════════════════════════════════════════════════════════════
//  Résolution du nom d'un objet à partir de son ID (ou nom).
//  Cherche dans public/data/builder-data.json ou les JSON de
//  données fournis. Si rien trouvé, renvoie la valeur telle quelle.
// ════════════════════════════════════════════════════════════
import { readFileSync } from "fs";
import { join } from "path";

let INDEX: Record<string, string> | null = null;

function loadIndex(): Record<string, string> {
  if (INDEX) return INDEX;
  INDEX = {};
  const candidates = [
    join(process.cwd(), "public", "data", "items.json"),
    join(process.cwd(), "public", "data", "builder-data.json"),
    join(process.cwd(), "prisma", "coffre-items.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = JSON.parse(readFileSync(p, "utf-8"));
      const arr = Array.isArray(raw) ? raw : raw.items || [];
      for (const it of arr) {
        const id = it.id ?? it.gameId ?? it.define;
        if (id != null && it.name) INDEX[String(id)] = it.name;
      }
      if (Object.keys(INDEX).length) break;
    } catch { /* fichier absent : on continue */ }
  }
  return INDEX;
}

export async function resolveItemName(ref: string): Promise<string | null> {
  const idx = loadIndex();
  return idx[ref] ?? idx[ref.trim()] ?? null;
}
