import type { Metadata } from "next";

/**
 * Page ouverte à tous : c'est de la connaissance du JEU, pas de l'activité de
 * guilde. D'où les métadonnées — on veut que ces pages se trouvent depuis un
 * moteur de recherche, c'est par là qu'un joueur découvre Vanguard.
 */
export const metadata: Metadata = {
  title: "Guide de progression — Flyff AirFlyff",
  description: "Par où commencer sur AirFlyff et quoi viser ensuite : niveaux, stuff, prestige. Le guide que la guilde Vanguard donne à ses recrues.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
