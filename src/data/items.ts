// ════════════════════════════════════════════════════════════
//  CATALOGUE D'OBJETS — modèle typé (builder façon Dofusbook)
//  Règle d'or : un objet est toujours catégorisé. Une arme porte
//  TOUJOURS un weaponSubtype + des classes. Jamais d'arme « sans classe ».
//  Voir references/VANGUARD_BRIEF_CURSOR.md §7 et API_OFFICIELLE_FR.md.
// ════════════════════════════════════════════════════════════

export type ClassKey =
  | "Spadassin" | "Templier" | "Arcaniste" | "Envouteur"
  | "Arbaletrier" | "Sylphide" | "Primat" | "Chanoine";

export type Slot =
  | "arme" | "offhand"
  | "casque" | "armure" | "gants" | "bottes"
  | "anneau1" | "anneau2" | "boucles1" | "boucles2" | "collier"
  | "cape" | "masque"
  | "familier" | "ramasseur"
  | "fashion1" | "fashion2" | "fashion3" | "fashion4";

export type ItemCategory =
  | "weapon" | "shield" | "grimoire"
  | "helmet" | "armor" | "gloves" | "boots"
  | "ring" | "earring" | "necklace"
  | "cape" | "mask" | "familier" | "ramasseur" | "fashion";

export type WeaponSubtype =
  | "epee" | "hache" | "glaive" | "doloire"
  | "baton" | "baguette" | "sceptre"
  | "poing" | "yoyo" | "arbalete" | "arc";

export type Tier =
  | "luzaka" | "vampirique" | "shaitan" | "dryades"
  | "yggdrasil" | "eternel" | "artefact";

export type Rarity =
  | "COMMUN" | "RARE" | "EPIQUE" | "LEGENDAIRE" | "PREMYTHIQUE" | "MYTHIQUE";

export type BuildMode = "DPS" | "TANK";

export type UpgradeKind =
  | "forge" | "etoiles" | "eveil" | "carte" | "gemme" | "sertissage";

export interface Stats {
  hp: number; attack: number; defense: number;
  critRate: number; critDamage: number; damageReduction: number;
}

export interface Item {
  id: string | number;
  name: string;
  // ── Champs du builder typé (optionnels : absents du catalogue plat importé) ──
  category?: ItemCategory;
  slot?: Slot | Slot[];
  classes?: ClassKey[] | "all";   // contrainte clé du builder
  tier?: Tier;
  rarity?: Rarity;
  weaponSubtype?: WeaponSubtype;  // OBLIGATOIRE si category === "weapon"
  modes?: BuildMode[];
  prestigeMin?: number;           // Yggdrasil=3, Éternel=10
  minAttack?: number;
  maxAttack?: number;
  baseStats?: Partial<Stats>;
  allowedUpgrades?: UpgradeKind[];
  icon?: string;
  // ── Champs du catalogue plat (public/data/items.json) ──
  type?: string;                  // type d'objet (Hache, Casque, …)
  job?: string;                   // classe/métier requis
  level?: number;                 // niveau requis
  grade?: string;                 // rang brut du wiki (≠ rareté builder)
}

// ─── Règles armes/off-hand par classe (cf. brief §7.3) ──────
export const WEAPON_RULES: Record<ClassKey, {
  dps: WeaponSubtype[]; tank: WeaponSubtype[];
  offhand: "shield" | "grimoire" | "shield_or_grimoire" | "none";
}> = {
  Spadassin:   { dps: ["epee", "hache"], tank: ["epee", "hache"],      offhand: "none" },
  Templier:    { dps: ["glaive"],        tank: ["doloire"],            offhand: "shield" },
  Chanoine:    { dps: ["poing"],         tank: ["poing"],              offhand: "shield" },
  Primat:      { dps: ["sceptre"],       tank: ["sceptre", "poing"],   offhand: "shield_or_grimoire" },
  Arcaniste:   { dps: ["baton"],         tank: ["baton"],              offhand: "shield_or_grimoire" },
  Envouteur:   { dps: ["baguette"],      tank: ["baguette"],           offhand: "shield_or_grimoire" },
  Sylphide:    { dps: ["yoyo"],          tank: ["yoyo"],               offhand: "none" },
  Arbaletrier: { dps: ["arbalete"],      tank: ["arc"],                offhand: "none" },
};

/** Valide la cohérence d'un objet. Lève une erreur en dev si incohérent. */
export function validateItem(it: Item): string[] {
  const errs: string[] = [];
  if (it.category === "weapon") {
    if (!it.weaponSubtype) errs.push(`${it.id}: arme sans weaponSubtype`);
    if (!it.classes || it.classes === "all" || it.classes.length === 0)
      errs.push(`${it.id}: arme sans classe (interdit)`);
  }
  if (it.allowedUpgrades?.includes("etoiles") && it.tier !== "artefact")
    errs.push(`${it.id}: étoiles autorisées uniquement sur artefact`);
  if (it.allowedUpgrades?.includes("carte") && it.category &&
      !["weapon", "shield", "armor"].includes(it.category))
    errs.push(`${it.id}: cartes autorisées seulement arme/bouclier/armure`);
  if (it.tier === "yggdrasil" && (it.prestigeMin ?? 0) < 3)
    errs.push(`${it.id}: Yggdrasil exige prestigeMin >= 3`);
  if (it.tier === "eternel" && (it.prestigeMin ?? 0) < 10)
    errs.push(`${it.id}: Éternel exige prestigeMin >= 10`);
  return errs;
}

// ─── Catalogue (à remplir : seed API + objets AirFlyff custom) ──
// Voir scripts/seed-items.ts pour aspirer la base depuis api.flyff.com,
// puis ajouter ici les objets AirFlyff (Yggdrasil/Éternel) à la main.
export const ITEMS: Item[] = [];

let _cache: Item[] | null = null;
/** Charge le catalogue d'objets : public/data/items.json (10k+ objets) côté navigateur, avec cache.
 *  Repli sur ITEMS (builder typé) si le fetch n'est pas possible (rendu serveur, fichier absent). */
export async function loadItems(): Promise<Item[]> {
  if (_cache) return _cache;
  if (ITEMS.length) return (_cache = ITEMS);
  try {
    const res = await fetch("/data/items.json");
    if (res.ok) return (_cache = (await res.json()) as Item[]);
  } catch { /* hors navigateur ou fichier absent */ }
  return ITEMS; // échec : on NE met PAS [] en cache (sinon empoisonnement permanent)
}

/** Retourne l'URL de l'icône d'un item, ou null si absente. */
export function iconUrl(it: Item): string | null {
  return it.icon ?? null;
}

/** Retrouve un item par son ID dans le catalogue chargé (cache), repli sur ITEMS. */
export function itemById(id: string | number): Item | undefined {
  const src = _cache ?? ITEMS;
  return src.find((it) => it.id === id || String(it.id) === String(id));
}

/** Objets équipables dans un emplacement, pour une classe + un mode donnés. */
export function itemsForSlot(slot: Slot, cls: ClassKey, mode: BuildMode, prestige: number): Item[] {
  return ITEMS.filter((it) => {
    const slots = Array.isArray(it.slot) ? it.slot : it.slot ? [it.slot] : [];
    if (!slots.includes(slot)) return false;
    if (it.classes && it.classes !== "all" && !it.classes.includes(cls)) return false;
    if (it.modes && !it.modes.includes(mode)) return false;
    return true; // les objets au prestigeMin trop haut restent visibles mais verrouillés côté UI
  });
}

// Validation au chargement en dev
if (process.env.NODE_ENV !== "production") {
  const all = ITEMS.flatMap(validateItem);
  if (all.length) console.warn("[items] incohérences:\n" + all.join("\n"));
}
