import Link from "next/link";
import { Icon } from "@/components/Icon";
import { iconeDe, type Fiche } from "./releves";
import "./mecaniques.css";

/**
 * LA FEUILLE DE STYLE EST UN FICHIER, PLUS UNE BALISE `<style>`.
 *
 * Elle vivait dans un littéral de gabarit rendu par la page. Deux raisons de la
 * sortir, et la seconde est mesurée :
 *
 *  · `VoletSections` est CLIENT, donc la page part DEUX FOIS sur le réseau : le
 *    HTML rendu, puis le paquet RSC qui porte le même arbre. Une balise `<style>`
 *    de dix kilo-octets y passe donc deux fois, à chaque visite. Mesuré sur cette
 *    page : mille deux cents mots servis, pour zéro information de jeu. En
 *    fichier importé, Next la sert une fois et le navigateur la garde.
 *  · LE PIÈGE DE L'ACCENT GRAVE DISPARAÎT. Un accent grave dans un commentaire
 *    CSS à l'intérieur d'un littéral de gabarit fermait le littéral et mettait la
 *    page en 500, sans que `tsc` ne voie rien. Ce projet l'a payé deux fois. Dans
 *    un `.css`, un commentaire est un commentaire.
 *
 * Elle reste PROPRE À CETTE PLANCHE, à côté d'elle, et n'entre pas dans
 * `globals.css` : la CSS globale n'a pas à grossir d'un préfixe par page. Ce qu'il
 * faut savoir de ses règles est écrit en tête du fichier.
 */

/**
 * LES BRIQUES DE LA PLANCHE DES MÉCANIQUES.
 *
 * Aucune n'est cliente : la page qui les emploie est un composant serveur, et ces
 * briques ne font que du rendu. C'est ce qui permet de lire un relevé de 3 Mo au
 * rendu sans en envoyer un octet au navigateur.
 *
 * ┌────── POURQUOI LES BRIQUES PRENNENT UNE LISTE ET PAS UN ÉLÉMENT ──────┐
 * │ `VoletSections` est CLIENT : le contenu des volets part en entier dans │
 * │ le paquet RSC, ouvert ou pas. Et pour chaque COMPOSANT rendu, le       │
 * │ paquet porte en plus son nom, sa pile d'appel et SES PROPS SÉRIALISÉES.│
 * │                                                                       │
 * │ Mesuré sur cette page : 134 `<Case/>` et 100 `<Chip/>` coûtaient plus  │
 * │ que tout le texte de la planche, et une carte de perçage à qui l'on    │
 * │ passait sa fiche entière expédiait au navigateur son prix, son         │
 * │ élément et sa phrase d'infobulle — cinquante-neuf fois, pour afficher  │
 * │ une image et une lettre.                                              │
 * │                                                                       │
 * │ D'où la règle de ce fichier : UNE BRIQUE PREND SA LISTE. `Grille`,     │
 * │ `Chips`, `Objets`, `Vignettes` sont appelées une fois et rendent N     │
 * │ éléments d'HTML, qui ne portent, eux, aucune annotation. Et ce qu'on   │
 * │ leur passe est ce qui s'AFFICHE — jamais l'objet du relevé.            │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Deux familles se croisent ici, et il faut savoir laquelle on emploie :
 *
 *  · `Grille`, `Chips`, `Vignettes` — la PLANCHE. Une image du jeu, son nom dessous.
 *  · `Point`, `Deux`, `Bareme`, `Barres`, `Escalier`, `Paliers` — le RELEVÉ. Un
 *    constat, et ce qu'on en fait.
 *
 * LA PASTILLE « À CONFIRMER EN JEU » A DISPARU, et c'est une décision de fond.
 * Elle servait à publier un demi-fait en s'en dédouanant. La consigne est
 * l'inverse : un renseignement incomplet ne s'affiche plus du tout, sa réserve
 * part avec lui. Ne reste que « à notre avantage » et « piège coûteux » — deux
 * marques qui disent quoi FAIRE, pas ce qu'on ignore.
 */

/* ── La planche ────────────────────────────────────────────────────────────── */

/** Ce qu'une case de la planche affiche, et rien de plus. `cherche` est le nom
 *  porté au catalogue d'objets : c'est lui qui fait de cette planche un wiki. */
export type Vue = {
  cle?: string;
  src?: string | null;
  nom: string;
  /** Le nom cherché dans le catalogue. Absent = case non cliquable. */
  cherche?: string;
  couleur?: string;
};

/** Une case : l'image du jeu, son nom dessous. Sans image, pas de case — un carré
 *  vide se lit comme un fichier manquant. C'est une FONCTION et non un composant :
 *  appelée, elle ne laisse aucune annotation dans le paquet. */
function uneCase(v: Vue, i: number, taille?: number) {
  if (!v.src) return null;
  const style: Record<string, string> = {};
  if (v.couleur) style["--ton"] = v.couleur;
  if (taille) style["--t"] = `${taille}px`;
  const s = Object.keys(style).length ? (style as React.CSSProperties) : undefined;
  const classe = `fx-card mc-case${v.couleur ? " ton" : ""}`;
  const dedans = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={v.src} alt="" />
      <span>{v.nom}</span>
    </>
  );
  const cle = v.cle ?? `${v.nom}-${i}`;
  return v.cherche
    ? <Link key={cle} href={`/objets?q=${encodeURIComponent(v.cherche)}`} className={classe} style={s}>{dedans}</Link>
    : <div key={cle} className={classe} style={s}>{dedans}</div>;
}

/** La grille d'icônes du jeu — l'énumération qui remplace un paragraphe. */
export function Grille({ cases, taille }: { cases: Vue[]; taille?: number }) {
  return <div className="mc-grille">{cases.map((v, i) => uneCase(v, i, taille))}</div>;
}

/** Une case seule, quand il n'y en a qu'une à poser au fil d'une ligne. */
export function Case(v: Vue & { taille?: number }) {
  return uneCase(v, 0, v.taille);
}

/**
 * LA PASTILLE TYPOGRAPHIQUE — un fait qu'on nomme sans avoir d'image.
 *
 * Un plafond de statistique, un code du client, une valeur de vivier : ça n'a pas
 * de dessin, et lui en prêter un serait pire que de l'écrire. `lien` en fait une
 * entrée de wiki quand la pastille nomme un objet réel.
 */
export type Puce = { texte: string; titre?: string; lien?: string };

export function Chips({ puces }: { puces: Puce[] }) {
  if (!puces.length) return null;
  return (
    <div className="mc-grille">
      {puces.map((p) => (
        p.lien
          ? <Link key={p.texte} href={p.lien} className="mc-chip" title={p.titre}>{p.texte}</Link>
          : <span key={p.texte} className="mc-chip" title={p.titre}>{p.texte}</span>
      ))}
    </div>
  );
}

/** Les codes du client, avec le libellé du dictionnaire quand il en a un. Un code
 *  sans libellé s'affiche TEL QUEL : le deviner à partir du nom de la constante
 *  serait une supposition présentée comme une donnée. */
export function Codes({ codes, libelle }: { codes: string[]; libelle: (c: string) => string }) {
  return <Chips puces={codes.map((c) => ({ texte: libelle(c), titre: c }))} />;
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

/** Une image du jeu, légendée, au fil du texte. */
export function Vignettes({ items }: { items: { src: string; legende: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="mc-vignettes">
      {items.map((v) => (
        <span key={v.legende} className="mc-vignette">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.src} alt="" />
          <i>{v.legende}</i>
        </span>
      ))}
    </div>
  );
}

/* ── Le relevé ─────────────────────────────────────────────────────────────── */

/** Une ligne d'objet, réduite à ce qui s'affiche. `ligneDe` la fabrique depuis une
 *  fiche du relevé : c'est là que le prix, l'élément et les identifiants restent
 *  sur le serveur. */
export type Ligne = {
  cle: string;
  src?: string | null;
  nom: string;
  /** La phrase du jeu, citée mot pour mot. Absente quand seul le nom sert. */
  phrase?: string;
  bonus?: [string, number][];
};

export function ligneDe(o: Fiche, opts: { phrase?: boolean; bonus?: boolean } = {}): Ligne {
  return {
    cle: o.cle,
    src: iconeDe(o),
    nom: o.n,
    phrase: opts.phrase ? o.d : undefined,
    bonus: opts.bonus ? o.b : undefined,
  };
}

/** Les bonus tels que le client les chiffre. */
function lesBonus(b?: [string, number][]) {
  if (!b?.length) return null;
  return (
    <span className="mc-bonus">
      {b.map(([s, v]) => <span key={s}>{s} <b>{v > 0 ? `+${v}` : v}</b></span>)}
    </span>
  );
}

export function Bonus({ b }: { b?: [string, number][] }) {
  return lesBonus(b);
}

/** Une liste d'objets du client : icône, nom, et sa propre phrase entre
 *  guillemets — pour qu'on ne confonde pas ce que dit le jeu et ce qu'on déduit. */
export function Objets({ liste }: { liste: Ligne[] }) {
  if (!liste.length) return null;
  return (
    <div className="mc-objs">
      {liste.map((o) => (
        <div key={o.cle} className="mc-obj fx-card">
          {o.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.src} alt="" />
          ) : (
            <Icon name="package" size={18} className="mc-obj-def" />
          )}
          <span className="mc-obj-txt">
            <b>{o.nom}</b>
            {o.phrase && <i>« {o.phrase} »</i>}
            {lesBonus(o.bonus)}
          </span>
        </div>
      ))}
    </div>
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
export function Deux({ lignes, gauche, droite }: {
  lignes: [React.ReactNode, React.ReactNode, boolean?][]; gauche: string; droite: string;
}) {
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

/** Le barème d'un geste : libellé à gauche, valeur à droite. Pour ce qui ne se
 *  compare PAS — deux plafonds d'ordres de grandeur différents, une paire
 *  « R1 · R2 ». Dès que deux valeurs se comparent, c'est `Barres`. */
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
 * UNE RANGÉE DE PALIERS SERVIS / NON SERVIS — la version économe des losanges.
 *
 * `Emplacements` de `jeu/Rarete.tsx` dessine les vrais losanges du jeu, et c'est
 * lui qu'on emploie pour la comparaison qui porte la page : cinq logements contre
 * huit. Mais il pose une IMAGE par case, et cinq familles de joyau à huit paliers
 * font quarante images pour un tableau secondaire. Celle-ci est en CSS pur : même
 * lecture — ce qui est servi, ce qui reste vide — pour le prix d'un nom de classe.
 *
 * Le compte est écrit à côté : huit cases ne se comptent pas d'un coup d'œil, et
 * un lecteur d'écran ne voit que le texte.
 */
export function Paliers({ lignes, total }: {
  lignes: { cle: string; nom: string; sous?: string; servis: number }[];
  total: number;
}) {
  return (
    <div className="mc-slots">
      {lignes.map((l) => {
        const n = Math.max(total, l.servis);
        return (
          <div key={l.cle} className="mc-paliers">
            <span className="mc-paliers-n">{l.nom}{l.sous && <i>{l.sous}</i>}</span>
            <span className="mc-cellules" aria-hidden="true">
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className={i < l.servis ? "on" : undefined} />
              ))}
            </span>
            <b>{l.servis}/{n}</b>
          </div>
        );
      })}
    </div>
  );
}

/**
 * L'ESCALIER — un taux qui s'effondre palier par palier.
 *
 * Deux taux de cette page s'effondrent, et aucun des deux ne se devine en
 * colonne : celui du client, qui divise par dix la réussite d'une amélioration
 * entre +11 et +20, et celui des trois parchemins qui REMPLACENT le taux au lieu
 * de s'y ajouter, chacun sur sa tranche. En marches, on voit la chute — et c'est
 * elle qui décide où l'on garde sa protection.
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
    // Le nom accessible vient du `<title>` SEUL. Le doubler d'un `aria-label`
    // envoyait la même phrase de trente mots quatre fois sur le réseau — deux
    // fois dans le HTML, deux fois dans le paquet RSC — sans rien apporter : avec
    // `role="img"`, un lecteur d'écran lit déjà le titre.
    <svg className="mc-svg" viewBox={`0 0 ${L} ${H}`} role="img">
      <title>{titre}</title>
      <line x1={gauche} y1={bas} x2={L - gauche} y2={bas} className="mc-axe" />
      {marches.map((m) => {
        const x = gauche + (m.de - min) * pas;
        const w = (m.a - m.de + 1) * pas;
        const h = Math.max(3, (m.v / haut) * (bas - 16));
        return (
          <g key={m.nom}>
            <rect x={x + 1.5} y={bas - h} width={Math.max(3, w - 3)} height={h} rx="3" className="mc-marche" />
            <text x={x + w / 2} y={bas - h - 5} className="mc-svg-v">{m.v}</text>
            <text x={x + w / 2} y={bas + 13} className="mc-svg-x">
              {m.de === m.a ? `+${m.de}` : `+${m.de}→+${m.a}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
