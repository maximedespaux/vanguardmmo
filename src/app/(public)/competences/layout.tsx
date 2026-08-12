import type { Metadata } from "next";

/**
 * Page ouverte à tous : c'est de la connaissance du JEU, pas de l'activité de
 * guilde. D'où les métadonnées — les compétences d'AirFlyff n'existent nulle
 * part ailleurs en français, et c'est par une recherche comme celle-là qu'un
 * joueur de passage découvre Vanguard. Pas de chiffre dans le titre : il
 * bougerait au prochain relevé, et un titre indexé ne se corrige pas.
 */
export const metadata: Metadata = {
  title: "Les compétences — Flyff AirFlyff",
  description:
    "Toutes les compétences d'AirFlyff, classe par classe : coût en PM et PF, dégâts et buffs niveau par niveau, prérequis, et ce que coûte un niveau en points. Relevé dans le client par la guilde Vanguard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
