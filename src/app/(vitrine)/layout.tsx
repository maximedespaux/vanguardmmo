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
 * POURQUOI UN GROUPE À PART plutôt que d'ouvrir (shop) : celui-là garde le profil de
 * chacun. La Boutique, qui a fondé ce groupe, a quitté le site le 2026-10-21 ; il porte
 * /crafts et la redirection de /collections.
 *
 * CE QUI PROTÈGE ENCORE, et qui n'a pas été touché : les routes /api. `apiGuild()`
 * refuse toujours ce qui engage un compte. La porte s'ouvre, le tiroir reste
 * verrouillé.
 */
export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
