import { Shell } from "@/components/Shell";

/**
 * L'ESPACE VITRINE — les pages qu'un visiteur peut VOIR sans pouvoir s'en servir.
 *
 * Demande de Maxime : « avoir l'espace boutique en visualisation publique pour attirer
 * et donner envie [...] mais inutilisable sans connexion ».
 *
 * CE GROUPE N'APPELLE AUCUN GARDE, et c'est tout son objet : le layout de (shop)
 * appelle `requireGuild()`, qui REDIRIGE. Une page de vitrine doit rendre pour tout le
 * monde et décider elle-même de ce qu'elle neutralise.
 *
 * POURQUOI LA BOUTIQUE A DÉMÉNAGÉ ICI plutôt que d'ouvrir (shop). Ce groupe-là portait
 * aussi les messages, le profil, les dettes et les requêtes : lui retirer son garde
 * aurait exposé les conversations privées de la guilde et les affaires personnelles de
 * chacun. Une page a changé de groupe, pas de garde collectif — et l'ADRESSE ne bouge
 * pas, un groupe entre parenthèses n'apparaissant pas dans l'URL.
 *
 * CE QUI PROTÈGE ENCORE, et qui n'a pas été touché : les routes /api. `apiGuild()`
 * refuse toujours une commande, un message, une dette. La porte s'ouvre, le tiroir
 * reste verrouillé.
 */
export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
