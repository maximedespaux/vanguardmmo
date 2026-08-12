import { Icon } from "@/components/Icon";
import { iconeDe, type Fiche } from "./releves";

/**
 * LES BRIQUES DE LA PLANCHE DES MÉCANIQUES.
 *
 * Aucune n'est cliente : la page qui les emploie est un composant serveur, et ces
 * briques ne font que du rendu. C'est ce qui permet de lire un relevé de 3 Mo au
 * rendu sans en envoyer un octet au navigateur.
 *
 * ┌────────── POURQUOI DES CLASSES CSS ET PLUS DES OBJETS DE STYLE ──────────┐
 * │ VoletSections est un composant CLIENT : le contenu des dix volets part    │
 * │ donc en entier dans le paquet RSC de la page, ouvert ou pas. Chaque       │
 * │ `style={{…}}` s'y sérialise propriété par propriété. Mesuré : 78 `Case`   │
 * │ et 87 `Chip` pesaient à eux seuls 49 Ko de payload pour six déclarations  │
 * │ de style répétées à l'identique. Une classe pèse son nom. C'est le seul   │
 * │ allègement de cette page qui ne retire AUCUN fait.                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Deux familles se croisent ici, et il faut savoir laquelle on emploie :
 *
 *  · `Case`, `Chip`, `Groupe` — la PLANCHE. Une image du jeu, son nom dessous.
 *  · `Point`, `Deux`, `Bareme`, `Barres`, `Escalier`, `Vignette` — le RELEVÉ. Un
 *    constat, et ce qu'on en fait.
 *
 * LA PASTILLE « À CONFIRMER EN JEU » A DISPARU, et c'est une décision de fond.
 * Elle servait à publier un demi-fait en s'en dédouanant. La consigne est
 * l'inverse : un renseignement incomplet ne s'affiche plus du tout, sa réserve
 * part avec lui. Ne reste que « à notre avantage » et « piège coûteux » — deux
 * marques qui disent quoi FAIRE, pas ce qu'on ignore.
 */

/* ── La planche ────────────────────────────────────────────────────────────── */

/** Une case de la planche : l'image du jeu, son nom dessous. Sans image, on ne
 *  dessine pas la case — pas de carré vide qui ferait croire à un fichier
 *  manquant. Pour un palier qu'on connaît SANS avoir son dessin, c'est `Chip`. */
export function Case({ src, nom, couleur, taille }: { src?: string | null; nom: string; couleur?: string; taille?: number }) {
  if (!src) return null;
  // Le style n'existe que s'il y a quelque chose à dire : une case ordinaire ne
  // porte aucun attribut de style, donc rien à sérialiser.
  const v: Record<string, string> = {};
  if (couleur) v["--ton"] = couleur;
  if (taille) v["--t"] = `${taille}px`;
  return (
    <div className={`fx-card mc-case${couleur ? " ton" : ""}`} style={Object.keys(v).length ? (v as React.CSSProperties) : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
      <span>{nom}</span>
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
  return <span className="mc-chip" title={titre}>{texte}</span>;
}

/** Le petit intertitre en capitales des sections de la planche. */
export function Groupe({ titre, children }: { titre: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mc-groupe">
      <div className="mc-groupe-t">{titre}</div>
      {children}
    </div>
  );
}

/** Un objet du client : son icône, son nom, et SA phrase — celle de l'infobulle,
 *  entre guillemets, pour qu'on ne confonde pas ce que dit le jeu avec ce qu'on
 *  en déduit. `sansPhrase` quand seul le NOM sert : c'est le cas dès qu'on aligne
 *  une famille d'objets dont les infobulles se répètent. */
export function LigneObjet({ o, apres, sansPhrase = false }: { o: Fiche; apres?: React.ReactNode; sansPhrase?: boolean }) {
  const src = iconeDe(o);
  return (
    <div className="mc-obj fx-card">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <Icon name="package" size={18} className="mc-obj-def" />
      )}
      <span className="mc-obj-txt">
        <b>{o.n}</b>
        {!sansPhrase && o.d && <i>« {o.d} »</i>}
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
export function Point({ titre, children, marque }: {
  titre: React.ReactNode; children: React.ReactNode; marque?: "profit" | "piege";
}) {
  const M = {
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
          <span>{l[1]}{l[2] && <Icon name="check" size={13} className="mc-deux-ok" />}</span>
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

/** Le barème d'un geste : libellé à gauche, valeur à droite. Pour ce qui ne se
 *  compare PAS — deux plafonds qui ne jouent pas dans le même ordre de grandeur,
 *  une paire « R1 · R2 ». Dès que deux valeurs se comparent, c'est `Barres`. */
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
 * DES BARRES, PARCE QU'UNE COLONNE DE NOMBRES NE SE COMPARE PAS DU REGARD.
 *
 * ┌────────────────── LES DEUX RÈGLES, MESURÉES ──────────────────┐
 * │ 1. UNE SEULE TEINTE — celle que la colonne emploie déjà (l'or   │
 * │    des valeurs). C'est la LONGUEUR qui porte la grandeur.       │
 * │    Peindre les grandes valeurs en vert et les petites en doré   │
 * │    ne se distingue pas pour un daltonien protan : écart mesuré  │
 * │    5,8 de deltaE, soit sous le seuil de perception.             │
 * │ 2. PLANCHER À 1,5 % — sans lui, une valeur minuscule perd sa    │
 * │    barre et l'absence de barre se lit comme une donnée          │
 * │    manquante, ce qui est le contraire du fait qu'on montre.     │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Le libellé est DANS la piste : à côté, la piste tombait à un tiers de la
 * largeur du panneau sur téléphone et les barres cessaient de se comparer.
 */
export function Barres({ lignes, max }: {
  lignes: { nom: string; v: number; texte?: string }[];
  /** Le haut de l'échelle. Par défaut la plus grande valeur. */
  max?: number;
}) {
  const haut = Math.max(max ?? 0, ...lignes.map((l) => l.v), 1);
  return (
    <div className="mc-barres">
      {lignes.map((l) => (
        <div key={l.nom} className="mc-barre">
          <span className="mc-piste">
            <span className="mc-plein" style={{ width: `${Math.max(1.5, (l.v / haut) * 100)}%` }} />
            <span className="mc-piste-t">{l.nom}</span>
          </span>
          <b>{l.texte ?? l.v}</b>
        </div>
      ))}
    </div>
  );
}

/**
 * L'ESCALIER — un taux qui s'effondre palier par palier.
 *
 * Trois parchemins d'amélioration REMPLACENT le taux de réussite au lieu de s'y
 * ajouter, et chacun ne vaut que sur sa tranche : 100 % de +3 à +6, 50 % sur
 * +7/+8, 30 % au +9. En colonne, ces trois nombres se lisent comme trois options
 * équivalentes. En marches, on voit l'effondrement — et c'est lui qui décide où
 * l'on garde son parchemin.
 *
 * SVG en ligne, aucune dépendance. La largeur d'une marche est sa TRANCHE de
 * paliers, sa hauteur le taux : les deux dimensions portent une vraie grandeur.
 * Une seule teinte, et un `<title>` pour qui ne voit pas le dessin.
 */
export function Escalier({ marches, titre }: {
  marches: { de: number; a: number; v: number; nom: string }[];
  titre: string;
}) {
  if (!marches.length) return null;
  const min = Math.min(...marches.map((m) => m.de));
  const max = Math.max(...marches.map((m) => m.a));
  const haut = Math.max(...marches.map((m) => m.v), 1);
  const n = max - min + 1;
  const L = 320, H = 96, bas = 78, gauche = 4;
  const pas = (L - gauche * 2) / n;
  return (
    <svg className="mc-svg" viewBox={`0 0 ${L} ${H}`} role="img" aria-label={titre}>
      <title>{titre}</title>
      <line x1={gauche} y1={bas} x2={L - gauche} y2={bas} className="mc-axe" />
      {marches.map((m) => {
        const x = gauche + (m.de - min) * pas;
        const w = (m.a - m.de + 1) * pas;
        const h = Math.max(3, (m.v / haut) * (bas - 16));
        return (
          <g key={m.nom}>
            <rect x={x + 1.5} y={bas - h} width={Math.max(3, w - 3)} height={h} rx="3" className="mc-marche" />
            <text x={x + w / 2} y={bas - h - 5} className="mc-svg-v">{m.v} %</text>
            <text x={x + w / 2} y={bas + 13} className="mc-svg-x">
              {m.de === m.a ? `+${m.de}` : `+${m.de}→+${m.a}`}
            </text>
          </g>
        );
      })}
    </svg>
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
      .mc-note { font-size:12.5px; color:var(--text-muted); line-height:1.5; margin:0; }
      .mc-grille { display:flex; flex-wrap:wrap; gap:8px; }
      /* La case de la planche. --t est la taille de l'image (32 par defaut),
         --ton la couleur de la famille quand elle en a une. Les deux sont des
         variables pour qu'une case ordinaire ne porte AUCUN attribut de style :
         c'est ce qui allege le payload de la page. */
      .mc-case { display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px 8px;
        border-radius:10px; background:var(--bg-2); border:1px solid var(--border); min-width:82px; text-align:center; }
      .mc-case > img { width:var(--t,32px); height:var(--t,32px); object-fit:contain; image-rendering:pixelated; }
      .mc-case > span { font-size:11.5px; color:var(--text-muted); line-height:1.25; }
      .mc-case.ton { border-color:color-mix(in srgb, var(--ton) 34%, var(--border)); }
      .mc-case.ton > span { color:var(--ton); font-weight:700; }
      .mc-chip { display:inline-flex; align-items:center; padding:5px 10px; border-radius:8px;
        background:var(--bg-2); border:1px dashed var(--border); color:var(--text-muted);
        font-size:11.5px; white-space:nowrap; }
      .mc-groupe { display:grid; gap:8px; }
      .mc-groupe-t { font-size:11.5px; text-transform:uppercase; letter-spacing:.8px; color:var(--text-muted); }
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
      /* La pastille dit d'un coup d'oeil si la ligne est un avantage a prendre
         ou un piege a eviter. Il n'y a plus de troisieme etat : ce qu'on n'a pas
         verifie ne s'affiche plus du tout. */
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
      .mc-deux-ok { margin-left:6px; color:var(--green); }
      .mc-bareme { display:grid; gap:5px; font-variant-numeric:tabular-nums; }
      .mc-bareme > div { display:flex; align-items:center; justify-content:space-between; gap:12px;
        background:var(--bg-2); border:1px solid var(--border); border-radius:8px; padding:8px 12px; font-size:12.5px; }
      .mc-bareme > div > span { color:var(--text-muted); min-width:0; }
      .mc-bareme > div > b { color:var(--gold); font-family:'Rubik',sans-serif; white-space:nowrap; }
      /* LES BARRES. Une seule teinte, la longueur porte la grandeur. Le libelle
         est DANS la piste : a cote, la piste tombait a un tiers de la largeur du
         panneau sur telephone et les barres cessaient de se comparer. */
      .mc-barres { display:grid; gap:5px; font-variant-numeric:tabular-nums; }
      .mc-barre { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; }
      .mc-piste { position:relative; display:block; height:24px; border-radius:7px; overflow:hidden;
        background:var(--bg-2); border:1px solid var(--border); }
      .mc-plein { position:absolute; left:0; top:0; bottom:0;
        background:color-mix(in srgb, var(--gold) 26%, transparent);
        border-right:2px solid var(--gold); }
      .mc-piste-t { position:relative; display:block; padding:0 9px; line-height:24px;
        font-size:12px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .mc-barre > b { font-size:12.5px; color:var(--gold); font-family:'Rubik',sans-serif; white-space:nowrap; }
      /* L'escalier des parchemins. Le SVG suit la largeur du panneau ; les
         libelles restent lisibles parce que le viewBox est fixe et le texte
         dimensionne en unites de ce viewBox. */
      .mc-svg { display:block; width:100%; max-width:420px; height:auto; }
      .mc-axe { stroke:var(--border); stroke-width:1; }
      .mc-marche { fill:color-mix(in srgb, var(--gold) 26%, transparent); stroke:var(--gold); stroke-width:1.5; }
      .mc-svg-v { fill:var(--gold); font-size:10px; font-weight:700; text-anchor:middle; font-family:'Rubik',sans-serif; }
      .mc-svg-x { fill:var(--text-muted); font-size:9px; text-anchor:middle; }
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
      .mc-obj-def { color:var(--text-muted); flex-shrink:0; }
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
      /* La phrase du JEU, citee mot pour mot. Elle n'est pas mise en avant pour
         faire joli : sur une page tiree de fichiers, il faut voir d'un coup
         d'oeil ce que le jeu dit lui-meme et ce qu'on en deduit. */
      .mc-cite { margin:0; padding:9px 13px; border-left:2px solid var(--gold);
        background:var(--bg-2); border-radius:0 8px 8px 0; font-size:12.5px;
        line-height:1.6; color:var(--text-muted); font-style:italic; }
      /* Les sets de costume : une carte par set. */
      .mc-sets { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:9px; }
      .mc-set { display:grid; gap:5px; align-content:start; padding:11px 13px; border-radius:10px;
        background:var(--bg-2); border:1px solid var(--border); min-width:0; }
      .mc-set > b { font-family:'Rubik',sans-serif; font-size:13px; color:var(--gold); }
      .mc-set-role { font-size:10.5px; text-transform:uppercase; letter-spacing:1px;
        color:var(--text-muted); font-weight:700; }
      /* LA RANGEE DE LOSANGES, legendee. Le compte se lit d'un coup d'oeil la ou
         « 5 » et « 8 » ecrits dans une phrase se lisent comme equivalents. */
      .mc-slots { display:grid; gap:7px; }
      .mc-slot { display:flex; align-items:center; gap:11px; flex-wrap:wrap;
        background:var(--bg-2); border:1px solid var(--border); border-radius:9px; padding:7px 11px; }
      .mc-slot > span:first-child { font-size:12.5px; font-weight:700; min-width:132px; }
      .mc-slot > i { font-style:normal; font-size:11.5px; color:var(--text-muted); }
      /* Le renvoi vers la page proprietaire du sujet. Un sujet, une page : ici on
         ne redeveloppe pas, on montre la porte. */
      .mc-ailleurs { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
        gap:9px; margin-top:18px; }
      .mc-porte { display:flex; align-items:flex-start; gap:10px; padding:11px 13px; border-radius:11px;
        background:var(--bg-2); border:1px solid var(--border); text-decoration:none; color:var(--text); }
      .mc-porte:hover { border-color:var(--orange); }
      .mc-porte > span { display:grid; gap:2px; min-width:0; }
      .mc-porte b { font-family:'Rubik',sans-serif; font-size:13px; color:var(--orange); }
      .mc-porte i { font-style:normal; font-size:11.5px; color:var(--text-muted); line-height:1.45; }
    `}</style>
  );
}
