/**
 * Les deux monnaies du serveur : périns et Airpoints.
 *
 * Elles ne se convertissent pas — les périns se gagnent en jeu, les Airpoints
 * s'achètent. Un prix sans sa monnaie ne veut donc rien dire, et « 2 400 » sur
 * une offre pouvait se lire des deux façons. Chaque montant porte désormais sa
 * monnaie, avec son icône : on reconnaît la pièce avant de lire le chiffre.
 */
export type Devise = "perins" | "airpoints";

export const DEVISES: { clef: Devise; label: string; court: string; icone: string }[] = [
  { clef: "perins", label: "Périns", court: "périns", icone: "/assets/site/monnaies/perins.webp" },
  { clef: "airpoints", label: "Airpoints", court: "AP", icone: "/assets/site/monnaies/airpoints.webp" },
];

export const devise = (d?: string | null): Devise => (d === "airpoints" ? "airpoints" : "perins");
export const infoDevise = (d?: string | null) => DEVISES.find((x) => x.clef === devise(d))!;

/** « 2 400 périns » ou « 150 AP » — le chiffre ne voyage jamais seul. */
export function montant(n: number | bigint | null | undefined, d?: string | null): string {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("fr-FR")} ${infoDevise(d).court}`;
}

/**
 * Un prix qui peut mêler les deux monnaies.
 *
 * Personne n'a jamais le compte rond dans une seule : refuser le mélange
 * obligeait à renoncer à la vente ou à arrondir au détriment de quelqu'un.
 * « 1 400 000 périns + 100 AP » se lit d'un coup, et le taux annoncé par le
 * vendeur suit entre parenthèses — il n'y a pas de cours officiel, c'est lui
 * qui dit ce qu'il accepte.
 */
export function prixMixte(
  perins: number | bigint | null | undefined,
  airpoints: number | null | undefined,
  taux?: number | null,
): string {
  const p = perins == null ? 0 : Number(perins);
  const a = airpoints ?? 0;
  const bouts: string[] = [];
  if (p > 0) bouts.push(`${p.toLocaleString("fr-FR")} périns`);
  if (a > 0) bouts.push(`${a.toLocaleString("fr-FR")} AP`);
  if (!bouts.length) return "prix à convenir";
  const detail = a > 0 && taux ? ` (1 AP = ${taux.toLocaleString("fr-FR")} périns)` : "";
  return bouts.join(" + ") + detail;
}

/**
 * L'équivalent en périns d'un prix mixte, pour comparer deux offres entre
 * elles. Sans taux, la part en Airpoints n'est pas convertible : on la laisse
 * de côté plutôt que d'inventer un cours.
 */
export function equivalentPerins(
  perins: number | bigint | null | undefined,
  airpoints: number | null | undefined,
  taux?: number | null,
): number | null {
  const p = perins == null ? 0 : Number(perins);
  const a = airpoints ?? 0;
  if (a > 0 && !taux) return null;
  return p + a * (taux ?? 0);
}
