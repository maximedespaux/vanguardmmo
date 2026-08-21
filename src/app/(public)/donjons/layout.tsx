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
  /* LE SEUL TITRE QUI NE PORTE PAS LE NOM COMPLET. La règle du site : « Airborn :
     Winds of Rhisis » en entier dans un titre, « Airborn » seul quand la place
     manque. Avec le nom complet celui-ci ferait 74 signes — un moteur en coupe
     une soixantaine, et « Protection de l'Oasis » tomberait hors du lien. */
  title: "Donjons, Tour Oubliée et Protection de l'Oasis — Airborn",
  /* RAMENÉE DE 315 À 158 CARACTÈRES, et ce n'est pas pour faire baisser un compteur :
     un moteur coupe la description vers 160 signes, donc la moitié de l'ancienne
     n'était lue par personne — ni par un robot, ni dans un aperçu de lien Discord.
     TOUS LES MOTS QUE LA NOTE DU DESSUS PROTÈGE SONT LÀ, vérifié un par un : « 52
     vagues », « Protection de l'Oasis », « Tour Infernale », « emblèmes de
     protection », « Tour Oubliée ». Ce qui part, c'est la parenthèse qui répète le
     contenu du site et la signature de guilde, déjà dans le titre. */
  description: "Donjons du téléporteur, 5 étages de Tour Oubliée et 52 vagues de Protection de l'Oasis sur la Tour Infernale : monstres, PV, butin et emblèmes de protection.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
