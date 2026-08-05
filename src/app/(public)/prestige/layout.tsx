import type { Metadata } from "next";

/**
 * Page ouverte à tous : c'est de la connaissance du JEU, pas de l'activité de
 * guilde. D'où les métadonnées — on veut que ces pages se trouvent depuis un
 * moteur de recherche, c'est par là qu'un joueur découvre Vanguard.
 */
export const metadata: Metadata = {
  title: "Calculateur de prestige — Flyff AirFlyff",
  description: "Ce que coûte un prestige sur AirFlyff et ce qu'il rapporte, palier par palier. Calcule le tien avant de te lancer.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
