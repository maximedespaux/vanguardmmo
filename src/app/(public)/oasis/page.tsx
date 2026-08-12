import { PageHeader } from "@/components/PageHeader";
import { PageOasis } from "@/components/oasis/PageOasis";
import { vagues } from "./donnees";

/**
 * LA PROTECTION DE L'OASIS — le contenu que le site nommait mal.
 *
 * Il en affichait 52 paliers sous le titre « Tour sans fin », avec des noms
 * internes de monstres : « Sleepghost 1 », « Wgolem », « Colonew18 ». Trois
 * problèmes en une ligne. Le nom n'existe pas dans le jeu — le mode s'appelle
 * Protection de l'Oasis et la carte Tour Infernale. Il est faux sur le fond — le
 * client a une chaîne pour annoncer la DERNIÈRE vague. Et les noms de monstres
 * n'étaient lisibles par personne — le monstre de la première vague s'appelle
 * « Envahisseur de l'Oasis ».
 *
 * Les 52 vagues sont lues côté serveur : les 12 Ko du relevé ne descendent pas
 * dans le paquet JS de la page, mais le tableau part rendu dans le HTML.
 */
export default function OasisPage() {
  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader
        // Bahara, le désert du jeu : c'est l'oasis qu'on défend qui donne son nom
        // à l'événement.
        art="/jeu/chargement/maploading_bahara.webp"
        icon="tower"
        title="Protection de l'Oasis"
        subtitle="Les 52 vagues de la Tour Infernale : ce qui arrive sur toi, ce que ça encaisse, ce que ça frappe, et ce que ça paie. Avec ce qui reste à vérifier en jeu, dit sans le cacher."
      />
      <PageOasis vagues={vagues()} />
    </div>
  );
}

export const metadata = {
  title: "Protection de l'Oasis — les 52 vagues de la Tour Infernale · Flyff AirFlyff",
  description:
    "Le mode Protection de l'Oasis d'AirFlyff, vague par vague : monstres, niveaux, points de vie, dégâts et emblèmes de protection. La tour n'est pas sans fin — elle s'arrête à la 52e vague.",
};
