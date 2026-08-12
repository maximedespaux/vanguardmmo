"use client";
import Link from "next/link";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon, type IconName } from "@/components/Icon";
import { fr, type Dashboard } from "./donnees";

/**
 * L'ÉTAT DE LA GUILDE — des LONGUEURS, plus des nombres nus.
 *
 * La page posait sept cartes de trois chiffres empilés : « 14 / 12 / 2 »,
 * « 31 / 14 / 17 », « 8 / 46 ». Aucun de ces nombres ne dit s'il est bon. Deux
 * absences en cours, c'est peu ou beaucoup ? La réponse est toujours dans le
 * RAPPORT, jamais dans le nombre — d'où quatre barres, et chacune est une part
 * d'un tout qu'on nomme à côté.
 *
 * LA RÈGLE DES BARRES DE CE SITE, appliquée à la lettre :
 *
 *   · UNE SEULE TEINTE pour toutes les barres. C'est la LONGUEUR qui porte la
 *     grandeur, jamais la couleur. Colorer « coffre » en rouge parce qu'il manque
 *     des objets ferait porter le sens par une teinte — et le vert et le doré de
 *     la charte ne se distinguent pas pour un daltonien protan (écart mesuré 5,8
 *     de deltaE). Ce qui va mal se dit avec un MOT, à côté de la barre.
 *   · PLANCHER À 1,5 %. Une part de 1 % rendrait une barre invisible, et une barre
 *     absente se lit « pas de donnée », pas « presque rien ».
 *   · PAS DE DÉNOMINATEUR, PAS DE LIGNE. Une guilde sans candidature n'affiche pas
 *     « 0 / 0 » ni une barre vide : la ligne n'existe pas. Un rapport sur zéro
 *     n'est pas nul, il n'a pas de sens.
 *
 * Les liens sont RÉELS. La page menait tout le monde vers /guildviewer, y compris
 * les membres, pour qui le middleware renvoie sur `/?error=admin` — une carte qui
 * promet un écran auquel on n'a pas droit. Chaque mesure porte donc sa destination
 * de staff ET, quand elle existe, celle des membres.
 */

type Mesure = {
  label: string;
  icon: IconName;
  /** Ce qu'on compte, et sur quoi. */
  n: number;
  total: number;
  /** Le tout, en un mot, pour que « 12 / 14 » se lise. */
  de: string;
  /** Ce qui ne va pas, en clair — c'est ça qui alerte, pas une couleur. */
  note?: string;
  href?: string;
  /** Destination pour qui n'est pas du staff. Absente = pas de lien. */
  hrefMembre?: string;
};

function mesures(d: Dashboard): Mesure[] {
  const m: Mesure[] = [];

  if (d.members.total > 0) {
    m.push({
      label: "Membres actifs", icon: "users",
      n: d.members.active, total: d.members.total, de: "membres",
      note: d.members.inactive ? `${d.members.inactive} inactif${d.members.inactive > 1 ? "s" : ""}` : undefined,
      href: "/guildviewer",
    });
  }

  if (d.characters.total > 0) {
    const equipes = d.characters.total - d.characters.withoutBuild;
    m.push({
      label: "Personnages avec un build", icon: "shirt",
      n: equipes, total: d.characters.total, de: "personnages",
      note: d.characters.withoutBuild ? `${d.characters.withoutBuild} sans stuff renseigné` : undefined,
      href: "/guildviewer", hrefMembre: "/personnages",
    });
  }

  if (d.coffre.total > 0) {
    m.push({
      label: "Coffre au seuil", icon: "vault",
      n: d.coffre.total - d.coffre.under, total: d.coffre.total, de: "objets suivis",
      note: d.coffre.under ? `${d.coffre.under} à compléter` : undefined,
      // Un membre voit le stock commun dans la Boutique : c'est le même coffre,
      // vu du côté de celui qui vient s'équiper.
      href: "/coffre", hrefMembre: "/boutique",
    });
  }

  if (d.candidatures.total > 0) {
    const traitees = d.candidatures.total - d.candidatures.pending - d.candidatures.waiting;
    m.push({
      label: "Candidatures traitées", icon: "clipboard",
      n: Math.max(0, traitees), total: d.candidatures.total, de: "reçues",
      note: d.candidatures.pending ? `${d.candidatures.pending} en attente de réponse` : undefined,
      href: "/candidatures",
    });
  }

  return m;
}

/** Une barre de part. Même forme que celle des Adversaires de Chambre Secrète. */
function Barre({ part }: { part: number }) {
  return (
    <span aria-hidden="true" className="gr-piste">
      <span className="gr-jauge" style={{ width: `${Math.max(1.5, Math.min(100, part * 100))}%` }} />
    </span>
  );
}

function LigneMesure({ m, staff }: { m: Mesure; staff: boolean }) {
  const part = m.total ? m.n / m.total : 0;
  const dedans = (
    <>
      <span className="gr-lab">
        <Icon name={m.icon} size={15} style={{ color: "var(--orange)", flexShrink: 0 }} />
        <span className="gr-lab-t">{m.label}</span>
      </span>
      <span className="gr-mid">
        <Barre part={part} />
        {/* La note dit CE QUI NE VA PAS, en mots. C'est elle qui remplace la barre
            rouge qu'on aurait été tenté de dessiner. */}
        {m.note && <span className="gr-note">{m.note}</span>}
      </span>
      <span className="gr-chif">
        <b>{fr(m.n)}</b>
        <span className="gr-tot">/ {fr(m.total)} {m.de}</span>
      </span>
      <span className="gr-pc">{Math.round(part * 100)} %</span>
    </>
  );

  const href = staff ? m.href : m.hrefMembre;
  // Pas de lien plutôt qu'un lien qui rebondit : sans droit sur la destination, le
  // middleware renvoie sur l'accueil avec une erreur, ce qui ressemble à une panne.
  return href
    ? <Link href={href} className="gr-ligne gr-ligne-l">{dedans}</Link>
    : <div className="gr-ligne">{dedans}</div>;
}

export function Grandeurs({ d, staff }: { d: Dashboard; staff: boolean }) {
  const liste = mesures(d);
  if (!liste.length) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Rien à mesurer pour l&apos;instant — la guilde n&apos;a encore aucun relevé.</div>;
  }
  return (
    <div className="gr-bloc">
      {liste.map((m) => <LigneMesure key={m.label} m={m} staff={staff} />)}
      <StyleGrandeurs />
    </div>
  );
}

/**
 * LES CLASSES REPRÉSENTÉES — le seul graphique que la page avait déjà, et il était
 * juste. Il ne change pas de forme, seulement de voisinage : il rejoint les autres
 * grandeurs au lieu de flotter seul entre les cartes et les liens.
 *
 * Les deux corrections qu'il porte, à ne pas reperdre :
 *   1. UNE seule teinte, plus le dégradé de deux — la barre d'une classe rare
 *      finissait entièrement dans le clair du dégradé et celle d'une classe jouée
 *      dans l'orange franc, la couleur semblait porter une information.
 *   2. Plancher à 1,5 % — une classe jouée par un seul personnage sur cent recevait
 *      une barre de 1 %, donc invisible.
 * Et la part affichée est celle du TOTAL, pas de la barre : la barre compare à la
 * classe la plus jouée (bon pour comparer), mais 100 % se lisait « au maximum ».
 */
export function Classes({ d }: { d: Dashboard }) {
  if (!d.characters.classes.length) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Aucun personnage déclaré pour l&apos;instant.</div>;
  }
  const max = Math.max(1, ...d.characters.classes.map((c) => c.count));
  const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
  return (
    <div className="gr-bloc">
      {d.characters.classes.map((c) => (
        <div key={c.classe} className="gr-ligne">
          <span className="gr-lab">
            <ClassLogo name={c.classe} size={20} />
            <span className="gr-lab-t">{cap(c.classe)}</span>
          </span>
          <span className="gr-mid"><Barre part={c.count / max} /></span>
          <span className="gr-chif"><b>{c.count}</b></span>
          <span className="gr-pc">{d.characters.total ? Math.round((c.count / d.characters.total) * 100) : 0} %</span>
        </div>
      ))}
      <StyleGrandeurs />
    </div>
  );
}

/* La feuille de style des deux blocs, écrite une fois. Rendue deux fois quand les
   deux blocs sont là : deux balises <style> identiques ne se marchent pas dessus,
   les règles sont les mêmes. */
function StyleGrandeurs() {
  return (
    <style>{`
      .gr-bloc{display:flex;flex-direction:column;gap:4px}
      /* La grille et non un flex : les quatre colonnes doivent s'aligner d'une
         ligne a l'autre, sinon les pourcentages font des marches d'escalier. */
      .gr-ligne{display:grid;grid-template-columns:minmax(140px,190px) 1fr auto 46px;
        align-items:center;gap:14px;padding:9px 11px;border-radius:10px;
        color:var(--text);text-decoration:none;transition:background .15s}
      .gr-ligne-l:hover{background:var(--bg-3)}
      .gr-lab{display:flex;align-items:center;gap:8px;min-width:0}
      .gr-lab-t{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .gr-mid{min-width:0}
      .gr-piste{display:block;height:10px;border-radius:5px;background:var(--bg-3);overflow:hidden}
      /* UNE teinte, celle de la charte. Voir la note du haut du fichier. */
      .gr-jauge{display:block;height:100%;border-radius:5px;background:var(--orange)}
      .gr-note{display:block;margin-top:4px;font-size:11.5px;color:var(--text-muted);font-family:'Alef',sans-serif}
      .gr-chif{display:flex;align-items:baseline;gap:5px;justify-content:flex-end;
        font-variant-numeric:tabular-nums;white-space:nowrap}
      .gr-chif b{font-family:'Rubik',sans-serif;font-size:14.5px;font-weight:600}
      .gr-tot{font-size:11.5px;color:var(--text-muted)}
      .gr-pc{text-align:right;font-size:11.5px;color:var(--text-muted);font-variant-numeric:tabular-nums}
      /* Sous 620px la ligne se plie en deux etages : le libelle et les chiffres en
         haut, la barre en dessous sur toute la largeur. A quatre colonnes dans
         300px, le libelle se reduisait a « Membr... » et la barre a 20px. */
      @media(max-width:620px){
        .gr-ligne{grid-template-columns:1fr auto 44px;gap:8px 10px}
        .gr-mid{grid-column:1 / -1;order:2}
        .gr-chif,.gr-pc{order:1}
      }
    `}</style>
  );
}
