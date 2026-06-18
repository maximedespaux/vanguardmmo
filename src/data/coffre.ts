// src/data/coffre.ts
// Moteur du Coffre de guilde basé sur les ID d'objets (refonte).
// Chaque entrée référence un objet par son ID (résolu via itemById de items.ts).
// Persistance locale : localStorage "vanguard_coffre_v2".

import { itemById, type Item } from "@/data/items";

export type CoffreStatus = "stock" | "farm";

export interface CoffreEntry {
  id: number;            // ID de l'objet (clé)
  category: string;      // catégorie de rangement (Stuff, Ressources, Œufs, …)
  job?: string;          // classe concernée (optionnel, libre)
  target: number;        // quantité cible
  stock: number;         // quantité actuelle
  status: CoffreStatus;  // "stock" (ok) ou "farm" (à farmer)
}

const KEY = "vanguard_coffre_v2";

export function loadCoffre(): CoffreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CoffreEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCoffre(entries: CoffreEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
}

/** Résout la fiche complète d'une entrée (nom, icône, type…). */
export function resolve(entry: CoffreEntry): Item | undefined {
  return itemById(entry.id);
}

/** Couleur de stock selon le seuil guilde : ≥10 vert · 6-9 or · <6 rouge. */
export function stockColor(stock: number): string {
  if (stock >= 10) return "var(--green)";
  if (stock >= 6) return "var(--gold)";
  return "var(--red)";
}

/** Normalise un nom pour le matching (accents, casse, espaces, ponctuation). */
export function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Migration : à partir de l'ancien format (objets {item/nom, categorie, classe, stock}),
 * retrouve l'ID de chaque objet par correspondance de nom dans la base.
 * Retourne les entrées mappées + la liste des noms non trouvés.
 */
export function migrateFromLegacy(
  legacy: any[],
  allItems: Item[]
): { entries: CoffreEntry[]; unmatched: string[] } {
  const byName = new Map<string, Item>();
  for (const it of allItems) {
    if (it.id == null || !it.name) continue;
    const n = norm(it.name);
    if (!byName.has(n)) byName.set(n, it); // garde la 1re occurrence
  }
  const entries: CoffreEntry[] = [];
  const unmatched: string[] = [];
  for (const row of legacy) {
    const rawName = row.item ?? row.nom ?? row.name ?? row.objet ?? "";
    const it = byName.get(norm(rawName));
    if (!it || it.id == null) {
      if (rawName) unmatched.push(rawName);
      continue;
    }
    const stock = Number(row.stock ?? row.qty ?? 0) || 0;
    entries.push({
      id: Number(it.id),
      category: row.categorie ?? row.category ?? row.cat ?? "Divers",
      job: row.classe ?? row.class ?? row.job ?? it.job ?? "",
      target: Number(row.cible ?? row.target ?? 10) || 10,
      stock,
      status: stock >= 6 ? "stock" : "farm",
    });
  }
  return { entries, unmatched };
}
