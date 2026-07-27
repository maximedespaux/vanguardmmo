import "./airbuilder.css";
import { BuilderRunner } from "./BuilderRunner";
import { BUILDER_MARKUP } from "./markup";
import { DemanderObjet } from "./DemanderObjet";

/**
 * /builder — le seul builder du site (l'ancien /builder.html, statique et donc
 * hors authentification, a été supprimé).
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
      <BuilderRunner embed={enIframe} />
      {/* Le pont vers la boutique : demander la pièce EXACTE qu'on vient de
          monter. Absent en iframe — la candidature n'a rien à commander. */}
      {!enIframe && <DemanderObjet />}
    </div>
  );
}
