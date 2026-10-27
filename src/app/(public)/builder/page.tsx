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
  searchParams: Promise<{ embed?: string; volet?: string }>;
}) {
  const { embed, volet } = await searchParams;
  const enIframe = embed === "1";
  /* `volet=1` : le builder dans un cadre, sur une AUTRE page du site. Il perd sa
     barre de navigation comme en `embed`, mais GARDE sa sauvegarde — c'est toute
     la difference. `embed` sert la candidature, ou le build est capture par la
     page hote et ne doit surtout pas s'enregistrer ; ici il s'agit du build du
     joueur, qu'on veut voir s'ecrire tout seul. */
  const enVolet = volet === "1";
  const connecte = !!(await getCurrentUser());
  return (
    <div className="abx">
      {(enIframe || enVolet) && (
        <style>{`
          .vg-topnav{display:none!important}
          .vg-main{padding-top:0!important}
          .vg-page{max-width:none!important;padding:0!important}
        `}</style>
      )}
      {/* Le bouton « Les mécaniques » n'est plus masqué au visiteur : la planche
          est passée dans (public), elle s'ouvre sans compte. C'est le lexique
          dont un débutant a le plus besoin, et c'est lui qu'on lui cachait. */}

      {/* Un visiteur voit tout mais ne compose pas. Le dire AVANT qu'il clique :
          sans ce bandeau, il essaie, rien ne bouge, et il croit que c'est cassé. */}
      {!connecte && !enIframe && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
          margin: "0 0 14px", padding: "11px 14px", borderRadius: 11,
          background: "rgba(var(--gn-lueur-rgb),.08)", border: "1px solid rgba(var(--gn-or-rgb),.26)" }}>
          <span style={{ fontSize: 13, color: "var(--text)", flex: "1 1 240px", lineHeight: 1.5 }}>
            Tu regardes l&apos;AirBuilder en lecture. <b>Pour composer ton stuff et le partager</b>, rejoins
            le Discord de GENESIS et connecte-toi.
          </span>
          <a href="/login" className="vg-btn" style={{ padding: "9px 16px", fontSize: 12.5, flexShrink: 0 }}>
            Se connecter
          </a>
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: BUILDER_MARKUP }} />
      <BuilderRunner embed={enIframe} connecte={connecte} />
    </div>
  );
}
