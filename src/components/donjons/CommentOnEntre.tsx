"use client";
import { Icon, type IconName } from "@/components/Icon";

/**
 * COMMENT ON ENTRE — le schéma qui remplace quatre explications éparpillées.
 *
 * L'ordre des blocs de cette page DIT quelque chose : du plus proche du
 * téléporteur au plus à part. Chaque bloc portait donc sa phrase pour expliquer
 * pourquoi il n'était pas dans le précédent — une puce sous la Tour Oubliée, deux
 * sous-titres de groupe dans « Hors du téléporteur », une ligne sous l'Oasis. Quatre
 * endroits, quatre formulations, et il fallait descendre toute la page pour
 * reconstituer la réponse à la seule question qui les sépare : par où on passe.
 *
 * Ici elles tiennent sur cinq lignes posées côte à côte, et la comparaison se fait
 * d'un regard. Chaque ligne mène à son bloc.
 *
 * ┌──────── CE QUI EST CALCULÉ, ET POURQUOI TOUT L'EST ────────┐
 * │ Les comptes viennent des relevés, jamais d'une phrase :     │
 * │ le jour où un donjon s'ajoute, la ligne suit. Et les lignes  │
 * │ elles-mêmes suivent les RÉGLAGES : un Vanguard qui éteint le │
 * │ bloc « Hors du téléporteur » ne doit pas laisser derrière    │
 * │ lui un renvoi vers un bloc absent.                          │
 * └────────────────────────────────────────────────────────────┘
 *
 * « Entrée non documentée » n'est pas un aveu décoratif : c'est le renseignement
 * qui change le geste. Quatre cartes du client sont peuplées et cartographiées, et
 * AUCUN fichier ne dit comment on y va — sans cette ligne, on les cherche au
 * téléporteur, qui ne les propose pas.
 */
export type Porte = {
  icon: IconName;
  /** Par où on passe. Deux à sept mots, pas une phrase. */
  par: React.ReactNode;
  /** Ce qu'il y a derrière, compté sur les données. */
  quoi: string;
  /** L'ancre du bloc, sur cette page. */
  ancre: string;
};

export function CommentOnEntre({ portes }: { portes: Porte[] }) {
  if (portes.length < 2) return null;
  return (
    <figure className="ce-cadre">
      <figcaption className="ce-titre">Comment on entre</figcaption>
      <div className="ce-liste">
        {portes.map((p) => (
          <a
            key={p.ancre}
            href={`#${p.ancre}`}
            className="ce-porte"
            /* ┌──── PAS DE `onClick`, ET C'EST UN CHOIX PAYÉ ────┐
               Le défilement de ce site se fait sur `.vg-main`, pas sur `window` —
               piège maison. Le saut NATIF d'une ancre s'en sort tout seul : il défile
               le premier ancêtre défilable, et il respecte le `scroll-margin-top` que
               les quatre cibles portent, ce qui les empêche d'atterrir sous la barre
               de navigation fixe.
               Un `scrollIntoView({ behavior: "smooth" })` avait d'abord été écrit ici,
               et il RATAIT SA CIBLE — mesuré dans le navigateur : les huit cartes du
               bloc « Hors du téléporteur » se chargent en `lazy`, elles arrivent
               PENDANT l'animation, la page s'allonge sous le curseur et l'animation
               finit onze cents pixels trop haut. Le saut instantané du navigateur ne
               peut pas se faire déborder comme ça, et il laisse en plus l'ancre dans
               l'adresse : le lien devient copiable.
               └────────────────────────────────────────────────┘ */
          >
            <Icon name={p.icon} size={15} className="ce-ic" />
            <span className="ce-par">{p.par}</span>
            <span className="ce-quoi">{p.quoi}</span>
            <Icon name="chevron-right" size={13} className="ce-fleche" />
          </a>
        ))}
      </div>
      {/* LA NOTE DE CSS SE LIT ICI, HORS DU GABARIT. Un commentaire écrit dans le
          littéral du `<style>` est SERVI au visiteur mot pour mot ; hors du littéral
          il ne coûte rien, il garde ses accents, et le piège de l'accent grave qui
          referme le gabarit (page en 500, invisible pour tsc) ne peut plus se poser.

          Le repli sous 420 px : sept mots de porte plus un compte ne tiennent plus
          sur une ligne, alors le compte passe dessous plutôt que d'être coupé. */}
      <style>{`
        .ce-cadre{margin:0 0 14px;background:var(--bg-2);border:1px solid var(--border);
          border-radius:14px;padding:13px 15px}
        .ce-titre{font-size:11px;text-transform:uppercase;letter-spacing:.6px;
          color:var(--text-muted);margin-bottom:9px}
        .ce-liste{display:grid;gap:6px}
        .ce-porte{display:grid;grid-template-columns:18px minmax(0,1fr) auto 13px;
          align-items:center;gap:9px;text-decoration:none;color:var(--text);
          background:var(--bg-3);border:1px solid var(--border);border-radius:9px;
          padding:7px 10px;font-size:12.5px}
        .ce-porte:hover{border-color:var(--gn-accent)}
        .ce-ic{color:var(--gn-accent);flex-shrink:0}
        .ce-par{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ce-quoi{color:var(--text-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
        .ce-fleche{color:var(--text-muted);flex-shrink:0}
        @media(max-width:420px){
          .ce-porte{grid-template-columns:18px minmax(0,1fr) 13px}
          .ce-par{white-space:normal}
          .ce-quoi{grid-column:2;grid-row:2}
        }
      `}</style>
    </figure>
  );
}
