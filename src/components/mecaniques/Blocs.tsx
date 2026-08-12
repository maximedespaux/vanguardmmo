import { Icon } from "@/components/Icon";
import { iconeDe, type Fiche } from "./releves";

/**
 * LES BRIQUES DE LA PLANCHE DES MÉCANIQUES.
 *
 * Aucune n'est cliente : la page qui les emploie est un composant serveur, et ces
 * briques ne font que du rendu. C'est ce qui permet de lire un relevé de 3 Mo au
 * rendu sans en envoyer un octet au navigateur.
 *
 * Deux familles se croisent ici, et il faut savoir laquelle on emploie :
 *
 *  · `Case`, `Chip`, `Groupe` — la PLANCHE. Une image du jeu, son nom dessous.
 *    C'était toute l'ancienne page des mécaniques.
 *  · `Point`, `Deux`, `Bareme`, `Vignette` — le RELEVÉ. Un constat, ce qu'on en
 *    fait, et une pastille qui dit si c'est vérifié ou pas. Ça vient de la page
 *    « Astuces de guilde », qui a fusionné ici ; les classes CSS ont changé de
 *    préfixe (`ag-` → `mc-`) mais le dessin est le même, volontairement : Maxime
 *    a validé ces blocs tels quels.
 *
 * La pastille de `Point` n'est pas un ornement. Sur une page tirée de fichiers,
 * un fait donné pour certain alors qu'il reste à confirmer coûte plus cher qu'un
 * fait absent : la distinction doit se voir À L'ÉCRAN, pas seulement dans un
 * commentaire de code.
 */

export const note: React.CSSProperties = { fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 };
export const grille: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };

const cadre: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
  padding: "10px 8px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)",
  minWidth: 82, textAlign: "center",
};
const legende: React.CSSProperties = { fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.25 };

/** Une case de la planche : l'image du jeu, son nom dessous. Sans image, on ne
 *  dessine pas la case — pas de carré vide qui ferait croire à un fichier
 *  manquant. Pour un palier qu'on connaît SANS avoir son dessin, c'est `Chip`. */
export function Case({ src, nom, couleur, taille = 32 }: { src?: string | null; nom: string; couleur?: string; taille?: number }) {
  if (!src) return null;
  return (
    <div className="fx-card" style={{ ...cadre, borderColor: couleur ? `${couleur}55` : "var(--border)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: taille, height: taille, objectFit: "contain", imageRendering: "pixelated" }} />
      <span style={{ ...legende, color: couleur ?? "var(--text-muted)", fontWeight: couleur ? 700 : 400 }}>{nom}</span>
    </div>
  );
}

/**
 * Le palier dont on n'a PAS l'image.
 *
 * Le client a six paliers de carte par famille, nos assets en dessinent trois. Se
 * taire sur les autres reviendrait à laisser croire qu'ils n'existent pas ; leur
 * prêter le dessin du palier voisin serait pire. D'où cette pastille purement
 * typographique : on voit tout de suite que c'est un nom, pas une image.
 */
export function Chip({ texte, titre }: { texte: string; titre?: string }) {
  return (
    <span title={titre} style={{
      display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: 8,
      background: "var(--bg-2)", border: "1px dashed var(--border)", color: "var(--text-muted)",
      fontSize: 11.5, whiteSpace: "nowrap",
    }}>{texte}</span>
  );
}

/** Le petit intertitre en capitales des sections de la planche. */
export function Groupe({ titre, children }: { titre: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>{titre}</div>
      {children}
    </div>
  );
}

/** Un objet du client : son icône, son nom, et SA phrase — celle de l'infobulle,
 *  entre guillemets, pour qu'on ne confonde pas ce que dit le jeu avec ce qu'on
 *  en déduit. */
export function LigneObjet({ o, apres }: { o: Fiche; apres?: React.ReactNode }) {
  const src = iconeDe(o);
  return (
    <div className="mc-obj fx-card">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <Icon name="package" size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
      )}
      <span className="mc-obj-txt">
        <b>{o.n}</b>
        {o.d && <i>« {o.d} »</i>}
        {apres}
      </span>
    </div>
  );
}

/** Les bonus d'un objet, tels que le client les chiffre. */
export function Bonus({ b }: { b?: [string, number][] }) {
  if (!b?.length) return null;
  return (
    <span className="mc-bonus">
      {b.map(([s, v]) => <span key={s}>{s} <b>+{v}</b></span>)}
    </span>
  );
}

/** Un point de la page : le constat, puis ce qu'on en fait. */
export function Point({ titre, children, marque }: { titre: React.ReactNode; children: React.ReactNode; marque?: "verifier" | "profit" | "piege" }) {
  const M = {
    verifier: { t: "À confirmer en jeu", c: "var(--gold)" },
    profit: { t: "À notre avantage", c: "var(--green)" },
    piege: { t: "Piège coûteux", c: "var(--red)" },
  };
  const m = marque ? M[marque] : null;
  return (
    <div className="mc-point">
      <h4>
        {titre}
        {m && <span className="mc-marque" style={{ color: m.c, borderColor: m.c }}>{m.t}</span>}
      </h4>
      <div className="mc-corps">{children}</div>
    </div>
  );
}

/** Deux colonnes : ce que tu lis à gauche, ce que c'est vraiment à droite. */
export function Deux({ lignes, gauche, droite }: { lignes: [React.ReactNode, React.ReactNode, boolean?][]; gauche: string; droite: string }) {
  return (
    <div className="mc-deux">
      <div className="mc-deux-tete"><span>{gauche}</span><span>{droite}</span></div>
      {lignes.map((l, i) => (
        <div key={i} className={`mc-deux-l ${l[2] ? "ok" : ""}`}>
          <span>{l[0]}</span>
          <span>{l[1]}{l[2] && <Icon name="check" size={13} style={{ marginLeft: 6, color: "var(--green)" }} />}</span>
        </div>
      ))}
    </div>
  );
}

/** Une image du jeu, légendée, au fil du texte. */
export function Vignette({ src, legende: l }: { src: string; legende: string }) {
  return (
    <span className="mc-vignette">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
      <i>{l}</i>
    </span>
  );
}

/** Le barème d'un geste : libellé à gauche, points à droite. */
export function Bareme({ lignes }: { lignes: [string, string][] }) {
  return (
    <div className="mc-bareme">
      {lignes.map(([l, v]) => (
        <div key={l}><span>{l}</span><b>{v}</b></div>
      ))}
    </div>
  );
}

/**
 * La feuille de style de la page.
 *
 * Elle vit ici et pas dans `globals.css` : ces classes ne servent qu'à cette
 * page, et la CSS globale n'a pas à grossir d'un préfixe par page.
 *
 * ATTENTION, PIÈGE PAYÉ DEUX FOIS SUR CE PROJET : un accent grave dans un
 * commentaire CSS à l'intérieur d'un littéral de gabarit ferme le littéral et met
 * la page en 500, sans que `tsc` ne voie rien. Les commentaires ci-dessous sont
 * donc écrits SANS ACCENTS, exprès.
 */
export function StyleMecaniques() {
  return (
    <style>{`
      .mc-point { background:var(--bg-3); border-radius:10px; padding:14px 16px; margin-bottom:11px;
        border-left:2px solid var(--orange-dark); }
      .mc-point h4 { font-family:'Rubik',sans-serif; font-weight:700; font-size:14.5px; color:var(--orange);
        margin:0 0 8px; display:flex; align-items:center; gap:9px; flex-wrap:wrap; line-height:1.4; }
      .mc-corps { display:grid; gap:9px; font-size:13.5px; line-height:1.62; color:var(--text); }
      .mc-corps p { margin:0; }
      .mc-corps b { color:var(--text); }
      .mc-corps ul { margin:0; padding-left:19px; display:grid; gap:7px; }
      .mc-corps li { line-height:1.6; }
      .mc-src { font-size:12px; color:var(--text-muted); line-height:1.55; }
      .mc-src b { color:var(--text-muted); }
      .mc-chapo { font-size:13.5px; line-height:1.62; color:var(--text-muted); margin:0 0 12px; }
      /* La pastille dit d'un coup d'oeil si la ligne est un avantage a prendre,
         un piege a eviter, ou une chose qu'on n'a pas encore verifiee. Sans
         elle, tout se lit avec la meme confiance — c'est justement le probleme
         qu'on veut eviter sur une page tiree de fichiers. */
      .mc-marque { font-size:10.5px; text-transform:uppercase; letter-spacing:1px; font-weight:700;
        padding:2px 8px; border-radius:4px; border:1px solid currentColor; white-space:nowrap; }
      /* « Ce que tu lis » / « ce que c'est » : deux colonnes, et la coche verte
         sur les seules lignes qui ne mentent pas. Les noms s'alignent
         (tabular-nums) pour qu'on suive la ligne du regard. */
      .mc-deux { display:grid; gap:3px; font-variant-numeric:tabular-nums; }
      /* minmax(0,1fr) et non 1fr : un « 1fr » nu garde min-content pour
         minimum, donc un libelle un peu long pousse la ligne hors du panneau
         au lieu de se replier. Le piege ne se voit que sur telephone. */
      .mc-deux-tete, .mc-deux-l { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; padding:7px 11px; }
      .mc-deux-tete { font-size:10.5px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);
        font-family:'Rubik',sans-serif; font-weight:700; padding-bottom:2px; }
      .mc-deux-l { background:var(--bg-2); border:1px solid var(--border); border-radius:8px; font-size:12.5px; }
      .mc-deux-l > span:first-child { color:var(--text-muted); text-decoration:line-through;
        text-decoration-color:var(--red); text-decoration-thickness:1px; }
      .mc-deux-l > span:last-child { color:var(--gold); font-weight:600; display:flex; align-items:center; }
      .mc-deux-l.ok > span:first-child { text-decoration:none; color:var(--text); }
      .mc-deux-l.ok > span:last-child { color:var(--green); }
      .mc-bareme { display:grid; gap:5px; font-variant-numeric:tabular-nums; }
      .mc-bareme > div { display:flex; align-items:center; justify-content:space-between; gap:12px;
        background:var(--bg-2); border:1px solid var(--border); border-radius:8px; padding:8px 12px; font-size:12.5px; }
      .mc-bareme > div > span { color:var(--text-muted); min-width:0; }
      .mc-bareme > div > b { color:var(--gold); font-family:'Rubik',sans-serif; white-space:nowrap; }
      .mc-vignettes { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:11px; }
      .mc-vignette { display:inline-flex; align-items:center; gap:7px; background:var(--bg-3);
        border:1px solid var(--border); border-radius:8px; padding:6px 10px; flex-shrink:0; }
      .mc-vignette img { width:26px; height:26px; object-fit:contain; image-rendering:pixelated; }
      .mc-vignette i { font-style:normal; font-size:11.5px; color:var(--text-muted); white-space:nowrap; }
      /* Une vignette a cote d'un bloc de texte. En dessous de 560 px la
         vignette passe au-dessus : a deux colonnes le texte tombe a quatre
         mots par ligne et devient illisible. */
      .mc-cote { display:flex; align-items:flex-start; gap:12px; margin-bottom:11px; }
      .mc-cote > .mc-point { flex:1; min-width:0; margin-bottom:0; }
      .mc-cote > p { flex:1; min-width:0; margin:0; font-size:13.5px; line-height:1.62; }
      @media(max-width:560px){ .mc-cote { flex-direction:column; } }
      /* Un objet du client : icone, nom, et sa propre phrase. La phrase est en
         gris et entre guillemets — c'est le jeu qui parle, pas nous. */
      .mc-obj { display:flex; align-items:flex-start; gap:10px; padding:8px 11px; border-radius:9px;
        background:var(--bg-2); border:1px solid var(--border); }
      .mc-obj > img { width:26px; height:26px; object-fit:contain; image-rendering:pixelated; flex-shrink:0; }
      .mc-obj-txt { min-width:0; display:grid; gap:2px; font-size:12.5px; line-height:1.45; }
      .mc-obj-txt > b { color:var(--text); }
      .mc-obj-txt > i { font-style:normal; font-size:11.5px; color:var(--text-muted); line-height:1.5; }
      .mc-bonus { display:flex; flex-wrap:wrap; gap:6px; margin-top:3px; }
      .mc-bonus > span { font-size:11px; padding:1px 7px; border-radius:20px; background:var(--bg-3);
        border:1px solid var(--border); color:var(--text-muted); white-space:nowrap; }
      .mc-bonus > span > b { color:var(--gold); }
      /* L'echelle : un etage par ligne, son palier a gauche en colonne fixe. En
         dessous de 620 px le palier passe au-dessus de ses objets. */
      .mc-etage { display:grid; grid-template-columns:132px minmax(0,1fr); gap:12px; align-items:start;
        padding:11px 0; border-top:1px solid var(--border); }
      .mc-etage:first-child { border-top:none; padding-top:2px; }
      .mc-etage-t { display:grid; gap:2px; }
      .mc-etage-t > b { font-family:'Rubik',sans-serif; font-size:13px; color:var(--gold); }
      .mc-etage-t > span { font-size:11.5px; color:var(--text-muted); line-height:1.35; }
      .mc-etage-l { display:grid; gap:6px; }
      @media(max-width:620px){ .mc-etage { grid-template-columns:1fr; } }
      .mc-pied { max-width:820px; margin:20px auto 0; font-size:12.5px; line-height:1.65;
        color:var(--text-muted); text-align:center; font-style:italic; }
    `}</style>
  );
}
