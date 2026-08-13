import type { Metadata } from "next";

/**
 * Page ouverte à tous : c'est de la connaissance du JEU, pas de l'activité de
 * guilde. D'où les métadonnées — les classes et les compétences d'AirFlyff
 * n'existent nulle part ailleurs en français, et c'est par une recherche comme
 * celle-là qu'un joueur de passage découvre Vanguard.
 *
 * Elles descendent de `/competences`, qui redirige ici depuis la fusion des deux
 * pages : les métadonnées suivent la page qui survit, sinon l'adresse indexée
 * perdrait son titre en route. Pas de chiffre dans le titre : il bougerait au
 * prochain relevé, et un titre indexé ne se corrige pas.
 */
export const metadata: Metadata = {
  title: "Classes et compétences — Flyff AirFlyff",
  // Ramenée sous les 160 signes qu'un moteur affiche : au-delà, la fin n'était lue
  // par personne. Les mots qui font trouver la page sont tous restés.
  description:
    "Les 8 lignées d'AirFlyff et leurs compétences : la chaîne de promotion du Vagabond aux légendaires, le coût en PM et PF, les dégâts et buffs niveau par niveau.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
