import type { Metadata } from "next";

/**
 * Page ouverte à tous : c'est de la connaissance du JEU, pas de l'activité de
 * guilde. D'où les métadonnées — on veut que ces pages se trouvent depuis un
 * moteur de recherche, c'est par là qu'un joueur découvre Vanguard.
 */
export const metadata: Metadata = {
  title: "Donjons et instances — Flyff AirFlyff",
  description: "La liste des donjons d'AirFlyff : niveau requis, difficulté et ce que chaque instance rapporte. Guide tenu à jour par la guilde Vanguard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
