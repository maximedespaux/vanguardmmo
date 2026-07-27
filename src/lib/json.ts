/**
 * Convertit tous les BigInt d'une valeur en nombres, en profondeur.
 *
 * `JSON.stringify` jette sur un BigInt : il suffit d'oublier UN champ pour
 * qu'une route entière réponde 500. C'est arrivé avec `Debt.caution`, ajoutée
 * par la boutique alors que la sérialisation ne traitait que `amount` — et
 * l'échec est muet côté page, qui affiche une liste vide comme s'il n'y avait
 * rien à voir. Convertir sans énumérer les colonnes ferme la porte à la
 * prochaine.
 *
 * Les montants du jeu tiennent très en deçà de la limite d'un nombre JS
 * (9 × 10¹⁵) : la conversion ne perd rien.
 */
export function sansBigInt<T>(valeur: T): T {
  if (typeof valeur === "bigint") return Number(valeur) as unknown as T;
  if (valeur === null || typeof valeur !== "object") return valeur;
  if (valeur instanceof Date) return valeur;
  if (Array.isArray(valeur)) return valeur.map(sansBigInt) as unknown as T;
  const sortie: Record<string, unknown> = {};
  for (const [clef, v] of Object.entries(valeur as Record<string, unknown>)) sortie[clef] = sansBigInt(v);
  return sortie as T;
}
