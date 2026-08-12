import type { Metadata } from "next";

/**
 * Page ouverte à tous : c'est de la connaissance du JEU, pas de l'activité de
 * guilde. D'où les métadonnées — on veut que ces pages se trouvent depuis un
 * moteur de recherche, c'est par là qu'un joueur découvre Vanguard.
 */
/**
 * Les métadonnées de /oasis ont fondu dans celles-ci, et pas par politesse : la
 * page « Protection de l'Oasis » était indexable, elle portait ses propres mots
 * — les 52 vagues, la Tour Infernale, les emblèmes de protection. Son adresse
 * redirige maintenant vers /donjons ; si ces mots disparaissaient d'ici, la
 * recherche qui menait à elle ne mènerait plus nulle part.
 */
export const metadata: Metadata = {
  title: "Donjons, Tour Oubliée et Protection de l'Oasis — Flyff AirFlyff",
  description: "Tout ce dans quoi on entre sur AirFlyff : les donjons du téléporteur (niveau requis, difficulté, butin), les 5 étages de la Tour Oubliée, et les 52 vagues de la Protection de l'Oasis sur la Tour Infernale — monstres, points de vie, dégâts et emblèmes de protection. Guide tenu à jour par la guilde Vanguard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
