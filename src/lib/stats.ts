// ════════════════════════════════════════════════════════════
//  MOTEUR DE STATS — formules de combat Flyff
//  Implémente les formules de references/FORMULES_FR.md.
//  ⚠️ Constantes officielles : à confirmer/ajuster pour AirFlyff (TODO).
//  Les facteurs par classe (autoAttackFactors, maxHP) peuvent être
//  récupérés depuis l'API officielle — cf. references/API_OFFICIELLE_FR.md §5.
// ════════════════════════════════════════════════════════════

import type { ClassKey, WeaponSubtype } from "@/data/items";

// ─── Modificateur de PV par classe (officiel) ──────────────
// TODO AirFlyff : confirmer le mapping et les valeurs.
export const CLASS_HP_MODIFIER: Record<ClassKey, number> = {
  Templier: 40,    // Knight
  Chanoine: 34,    // Ringmaster
  Arbaletrier: 32, // Ranger
  Primat: 32,      // Billposter
  Spadassin: 30,   // Blade
  Sylphide: 30,    // Jester
  Envouteur: 30,   // Psykeeper
  Arcaniste: 30,   // Elementor
};

// ─── Facteur niveau par type d'arme (officiel) ─────────────
export const WEAPON_LEVEL_FACTOR: Record<WeaponSubtype, number> = {
  epee: 1.1, glaive: 1.1, hache: 1.2, doloire: 1.2,
  baton: 1.1, sceptre: 1.3, poing: 1.2, baguette: 1.2,
  yoyo: 1.1, arbalete: 0.91, arc: 0.91,
};

// ─── Modificateur de stat par type d'arme (officiel) ───────
export const WEAPON_STAT_MOD: Record<WeaponSubtype, number> = {
  epee: 12, glaive: 12, hache: 12, doloire: 12,
  baton: 10, sceptre: 10, poing: 10, baguette: 10,
  yoyo: 12, arbalete: 14, arc: 14,
};

// PV max — cf. FORMULES_FR.md §9
export function computeMaxHp(cls: ClassKey, level: number, end: number, flatMaxHp = 0, maxHpRate = 0): number {
  const mod = CLASS_HP_MODIFIER[cls];
  const baseHp = 150 + mod * level * (1 + end / 100);
  return Math.floor((baseHp + flatMaxHp) * (1 + maxHpRate));
}

// Attaque affichée (approx, cf. FORMULES_FR.md §2-3)
// TODO AirFlyff : facteur d'auto-attaque par classe/arme (autoAttackFactors de l'API).
export function computeAttackDisplay(args: {
  attMin: number; attMax: number; attackPct?: number; upcutPct?: number; flatAttack?: number;
}): number {
  const { attMin, attMax, attackPct = 0, upcutPct = 0, flatAttack = 0 } = args;
  return Math.floor(((attMin + attMax) / 2) * (1 + attackPct) * (1 + upcutPct)) + flatAttack;
}

// Équivalence chance critique <-> dégâts critiques (cf. FORMULES_FR.md §5)
// Renvoie combien de % de dégâts crit équivalent à 1% de chance crit, au point donné.
export function critEquivalence(critChance: number): number {
  // approx : ~2.73 à basse chance, ~1.64 à très haute chance.
  if (critChance >= 96) return 1.64;
  return 2.73;
}

// Cap de blocage : 75% affiché ≈ 92.5% réel (roll sur 80). cf. FORMULES_FR.md §11
export const BLOCK_CAP_DISPLAY = 75;
