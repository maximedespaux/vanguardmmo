// ════════════════════════════════════════════════════════════
//  COÛTS DE PRESTIGE — données RÉELLES AirFlyff
//  Par palier de départ : P(n) → P(n+1). Clés dynamiques (l'item
//  demandé varie selon le palier). Source : wiki AirFlyff.
// ════════════════════════════════════════════════════════════

export const PRESTIGE_COSTS: Record<number, Record<string, number>> = {
  1: { "Badge Jardin Prestigieux": 3 },
  2: { "Badge Jardin Prestigieux": 6 },
  3: { "Badge Jardin Prestigieux": 6, "Nucléus neutre": 15000 },
  4: { "Nucléus neutre": 35000 },
  5: { "Badge Jardin Prestigieux": 10, "Emblème de protection": 5000 },
  6: { "Badge Jardin Prestigieux": 15, "Badge de la Tour": 1, "Nucléus neutre": 10000, "Emblème de protection": 6000 },
  7: { "Périn": 500, "Nucléus neutre": 25000, "Nucléus parfait": 5000, "Badge World Boss prestigieux": 1 },
  8: { "Badge Jardin Prestigieux": 10, "Badge de la Tour": 1, "Badge de donjon mineur": 2, "Badge World Boss prestigieux": 1 },
  9: { "Emblème de protection": 4000, "Nucléus parfait": 9999, "Badge Donjon": 2, "Badge de donjon mineur": 2, "Badge Jardin Prestigieux": 25, "Badge World Boss prestigieux": 2 },
};

/** Toutes les ressources référencées, dans un ordre d'affichage stable. */
export const PRESTIGE_KEYS: string[] = (() => {
  const seen: string[] = [];
  for (let p = 1; p <= 9; p++) {
    for (const k of Object.keys(PRESTIGE_COSTS[p] ?? {})) if (!seen.includes(k)) seen.push(k);
  }
  return seen;
})();

/** Somme cumulée des ressources nécessaires entre `from` (inclus) et `to` (exclu). */
export function prestigeNeed(from: number, to: number): Record<string, number> {
  const need: Record<string, number> = {};
  for (let p = from; p < to; p++) {
    const c = PRESTIGE_COSTS[p];
    if (!c) continue;
    for (const [k, v] of Object.entries(c)) need[k] = (need[k] ?? 0) + v;
  }
  return need;
}
