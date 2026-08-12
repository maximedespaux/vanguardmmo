import { PageDonjons } from "@/components/donjons/PageDonjons";
import { vagues } from "./donnees";

/**
 * « CE DANS QUOI ON ENTRE » — une seule page pour trois façons d'entrer.
 *
 * Les 23 donjons du téléporteur, les 5 étages de la Tour Oubliée et la Protection
 * de l'Oasis. Cette dernière avait sa page, /oasis, qui posait exactement les
 * mêmes questions que celle-ci — voilà la carte, voilà ce qui t'y attend, voilà ce
 * que ça rapporte. Deux adresses pour une seule question. /oasis redirige
 * désormais ici, sur l'ancre du bloc.
 *
 * La page est un composant SERVEUR de trois lignes, et c'est le relevé de l'Oasis
 * qui l'impose : ses 52 vagues sont lues dans un fichier de 12 Ko (voir
 * donnees.ts), et un « use client » ne peut pas ouvrir un fichier. Tout ce qui
 * demande de l'état — la recherche, les filtres, la fiche ouverte, le repli du
 * bloc Oasis — vit dans PageDonjons.
 *
 * Les métadonnées sont dans layout.tsx, à côté : un composant client ne peut pas
 * exporter `metadata`, et celles de /oasis y ont été fondues avec celles d'ici.
 */
export default function DonjonsPage() {
  return <PageDonjons vagues={vagues()} />;
}
