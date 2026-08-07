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
