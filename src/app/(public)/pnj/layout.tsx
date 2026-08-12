import type { Metadata } from "next";

/**
 * Page ouverte à tous : c'est de la connaissance du JEU, pas de l'activité de
 * guilde. Les portraits de dialogue n'existaient nulle part sur le web
 * francophone d'AirFlyff — c'est exactement le genre de page par laquelle un
 * joueur tombe sur Vanguard.
 */
export const metadata: Metadata = {
  title: "Les PNJ d'AirFlyff — qui vend quoi, et où le trouver",
  description:
    "L'annuaire des PNJ d'AirFlyff : les métiers de craft (Sage des Mantras, Angie, Pépito, Karlagarfeld), les boutiques et leurs prix, la ville de chacun, et les portraits de dialogue tirés du client. Guide de la guilde Vanguard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
