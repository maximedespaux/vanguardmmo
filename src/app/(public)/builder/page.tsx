import "./airbuilder.css";
import { getCurrentUser } from "@/lib/access";
import { BuilderRunner } from "./BuilderRunner";
import { BUILDER_MARKUP } from "./markup";

/**
 * /builder — le seul builder du site (l'ancien /builder.html, statique et donc
 * hors authentification, a été supprimé).
 *
 * OUVERT À TOUS, connecté ou non. C'est un outil de jeu, pas une donnée de
 * guilde : un joueur de passage doit pouvoir monter un stuff et regarder ce que
 * ça donne. Ce qui engage un compte — enregistrer, publier ses persos, partager
 * un lien, commander une pièce — reste réservé à ceux qui ont rejoint le Discord
 * et se sont connectés. Le build d'un visiteur vit dans SON navigateur, et nulle
 * part ailleurs.
 *
 * ?embed=1 : affichage dans l'iframe de la candidature. Le layout du groupe
 * enveloppe toujours la page dans <Shell>, et un layout ne peut pas lire les
 * searchParams — on neutralise donc la barre de navigation en CSS, au plus près
 * de l'endroit qui en a besoin.
 */
export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const { embed } = await searchParams;
  const enIframe = embed === "1";
  const connecte = !!(await getCurrentUser());
  return (
    <div className="abx">
      {enIframe && (
        <style>{`
          .vg-topnav{display:none!important}
          .vg-main{padding-top:0!important}
          .vg-page{max-width:none!important;padding:0!important}
        `}</style>
      )}
      <div dangerouslySetInnerHTML={{ __html: BUILDER_MARKUP }} />
      <BuilderRunner embed={enIframe} connecte={connecte} />
    </div>
  );
}
