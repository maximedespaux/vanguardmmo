"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { MARQUEUR_AIRBORN } from "@/components/objets/vocabulaire";
import { Resultat } from "./Resultat";
import { useWiki, type ReponseWiki } from "./useWiki";
import { TYPES, type TypeEntree } from "./vocabulaire";

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  UN SEUL CHAMP POUR TOUT LE WIKI                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Le site connaissait déjà chaque nom et le cherchait à DIX endroits différents,
 * chacun sur son île : les objets sur /objets, les monstres sur /monstres, les
 * recettes sur /crafts, les marchands sur /pnj, les compétences sur /classes. Un
 * joueur qui tape « Âme de démon » ne peut pas savoir laquelle des cinq répond — il
 * essaie, il se trompe, il abandonne.
 *
 * TROIS CHOSES QUE CE CHAMP FAIT ET QU'AUCUN DES DIX AUTRES NE FAISAIT :
 *  1. il cherche les CINQ natures d'un coup, et chaque ligne dit laquelle elle est ;
 *  2. il cherche par MOT-CLÉ autant que par nom — « Dégâts critiques », « Flarine »,
 *     « capitaine », « yggdrasil » sortent des réponses ;
 *  3. il lit la table de butin DANS LES DEUX SENS : le nom d'un monstre sort les
 *     objets qu'il lâche, et le nom d'un objet sort le monstre qui le lâche.
 *
 * Rien n'arrive en bloc : l'index vit côté serveur (~6 Mo de relevés) et la route en
 * renvoie 40 lignes. On ne pagine pas, exprès — au-delà de quarante réponses, la
 * bonne façon d'avancer est d'affiner le mot, pas de tourner des pages. Le compte
 * total est affiché : un plafond qui ne s'annonce pas se lit comme un inventaire
 * complet.
 */

type Faits = {
  total: number; parType: Record<string, number>; maison: number; provenances: number;
  butins: number; situes: number; genere: string;
};

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const fr = (n: number) => n.toLocaleString("fr-FR");

const champ: React.CSSProperties = {
  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10,
  padding: "11px 13px", color: "var(--text)", fontSize: 14, fontFamily: "inherit", width: "100%",
};

/** Une pastille de filtre — la même forme que sur /objets et /monstres : c'est ce qui
 *  la rend lisible d'une page à l'autre. */
function Pastille({ on, onClick, children, couleur }: {
  on: boolean; onClick: () => void; children: React.ReactNode; couleur?: string;
}) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit",
      fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 20,
      color: on ? (couleur ? "#0A0A0C" : "var(--gn-sur-action)") : "var(--text)",
      background: on ? (couleur ?? "var(--gn-plein)") : "var(--bg-3)",
      border: `1px solid ${on ? (couleur ?? "rgba(var(--gn-or-rgb),.55)") : "var(--border)"}`,
    }}>{children}</button>
  );
}

/**
 * DE QUOI L'INDEX EST FAIT — un schéma à la place d'une phrase.
 *
 * « 12 134 objets, 1 124 monstres, 834 recettes, 293 PNJ, 197 compétences » est une
 * ligne qu'on ne lit pas. Cinq segments dans les couleurs des pastilles se lisent d'un
 * coup d'œil, et le chiffre exact reste à portée de curseur.
 *
 * PLANCHER À 3 PIXELS par segment : sans lui, les compétences (197 lignes) perdent le
 * leur et une part faible se lit comme une absence. Leur largeur en est légèrement
 * flattée — c'est le prix, et il vaut mieux que l'invisibilité. Le chiffre exact est
 * dans la bulle, jamais déduit de la longueur.
 *
 * UNE SEULE BULLE pour les cinq segments, et pas cinq : une bulle par segment
 * mettrait cinq boutons de 3 pixels côte à côte, impossibles à viser au doigt.
 */
const LARGEUR_COMPO = 170;

function Composition({ parType, total }: { parType: Record<string, number>; total: number }) {
  if (!total) return null;
  return (
    <Bulle largeur={220} quoi={
      <span style={{ display: "grid", gap: 4 }}>
        {TYPES.map((t) => {
          const n = parType[t.clef] ?? 0;
          if (!n) return null;
          return (
            <span key={t.clef} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: t.couleur, flexShrink: 0 }} />
              <b style={{ ...NUM }}>{fr(n)}</b>
              <span style={{ color: "var(--text-muted)" }}>{t.label.toLowerCase()}</span>
            </span>
          );
        })}
      </span>
    }>
      <span aria-hidden="true" style={{ display: "flex", gap: 2, height: 5 }}>
        {TYPES.map((t) => {
          const n = parType[t.clef] ?? 0;
          if (!n) return null;
          return <span key={t.clef} style={{
            height: 5, borderRadius: 2, background: t.couleur, opacity: .85, flexShrink: 0,
            width: Math.max(3, Math.round((n / total) * LARGEUR_COMPO)),
          }} />;
        })}
      </span>
    </Bulle>
  );
}

/**
 * LA SEULE MISE EN GARDE DE LA PAGE, et elle protège d'une erreur coûteuse.
 *
 * Le relevé de provenance porte un avertissement que le client impose : LE BUTIN
 * ORDINAIRE DES MONSTRES N'EST PAS DANS LE CLIENT — le serveur le calcule. Il avait
 * quitté /objets et /monstres avec les TAUX qu'il servait à excuser, et c'était juste
 * là-bas : ces pages n'affirment rien quand elles ne savent rien.
 *
 * ICI C'EST DIFFÉRENT, et c'est ce qui la fait revenir : le bloc « Ce qu'il lâche »
 * annonce un TOTAL. Trois noms suivis de « (4) » se lisent comme la table complète du
 * monstre. Un joueur qui en conclut que le monstre ne lâche pas ce qu'il cherche arrête
 * de farmer pour rien, ou paie l'objet en boutique. Le test de la règle 2 est passé :
 * ça change le geste, donc ça reste — même incomplet.
 *
 * ┌──────── LA PHRASE EST DEVENUE DEUX BARRES, et c'est un gain double.
 * │
 * │ Elle disait « 305 monstres sur 1 124 portent une liste, et 5 261 objets sur 11 782
 * │ disent d'où ils viennent » : quatre nombres dans une subordonnée, que personne ne
 * │ rapproche en lisant. Deux barres les rapprochent SANS LES LIRE — on voit d'un coup
 * │ d'œil que le premier tiers est presque vide et que le second est à moitié plein,
 * │ c'est-à-dire exactement ce que la mise en garde veut faire comprendre. 39 mots
 * │ servis en moins, et le fait passe mieux.
 * │
 * │ UNE SEULE TEINTE, celle que la bulle emploie déjà (l'or de la mise en garde) : c'est
 * │ la LONGUEUR qui porte la grandeur. Deux teintes différentes se liraient comme deux
 * │ natures de choses, et le vert contre l'or ne se distingue pas pour un daltonien
 * │ protan. Plancher à 1,5 % pour qu'une part faible reste une barre et pas une absence.
 * └────────────────────────────────────────────────────────────────────────────────────
 */
function Part({ quoi, n, sur }: { quoi: string; n: number; sur: number }) {
  const pct = sur > 0 ? (n / sur) * 100 : 0;
  return (
    <span style={{ display: "grid", gap: 3 }}>
      <span style={{ display: "flex", gap: 6, alignItems: "baseline", fontSize: 11.5 }}>
        <b style={{ ...NUM, color: "var(--gold)" }}>{fr(n)}</b>
        <span style={{ ...NUM, color: "var(--text-muted)" }}>sur {fr(sur)}</span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>{quoi}</span>
      </span>
      {/* `role="img"` + `aria-label` : la barre est un dessin, et le chiffre exact est
          déjà écrit au-dessus — le lecteur d'écran n'a pas besoin de la relire. */}
      <span role="img" aria-label={`${quoi} : ${fr(n)} sur ${fr(sur)}`}
        style={{ display: "block", height: 5, borderRadius: 3, background: "var(--bg-3)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", borderRadius: 3, background: "var(--gold)",
          width: `${Math.max(1.5, pct).toFixed(1)}%` }} />
      </span>
    </span>
  );
}

function ButinPartiel({ butins, monstres, situes, objets }: {
  butins: number; monstres: number; situes: number; objets: number;
}) {
  if (!monstres || !objets) return null;
  return (
    <Bulle largeur={280} quoi={
      <span style={{ display: "grid", gap: 8 }}>
        <b style={{ color: "var(--gold)" }}>Une provenance vide ne veut pas dire « rien ».</b>
        <Part quoi="monstres qui listent un butin" n={butins} sur={monstres} />
        <Part quoi="objets qui disent d’où ils viennent" n={situes} sur={objets} />
        <span style={{ color: "var(--text-muted)" }}>
          Le reste, c’est le serveur qui le calcule : le client ne l’écrit pas.
        </span>
      </span>
    }>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--gold)", fontSize: 12 }}>
        <Icon name="info" size={13} /> butin partiel
      </span>
    </Bulle>
  );
}

export function RechercheWiki({ depart = "", faits, premiere }: {
  depart?: string;
  faits: Faits;
  /** La première réponse, déjà cherchée par le serveur : la page arrive remplie. */
  premiere: ReponseWiki;
}) {
  useCardFx();
  const [q, setQ] = useState(depart);
  const [type, setType] = useState<TypeEntree | "">("");
  const [maison, setMaison] = useState(false);
  const { r, charge } = useWiki({ q, type, maison }, true, { q: depart, reponse: premiere });

  const filtre = Boolean(q.trim() || type || maison);
  const parType = r?.parType ?? faits.parType;
  const nMaison = r?.maison ?? faits.maison;
  /* Le compte de « Tout » est la SOMME des cinq natures pour les critères courants, et
     pas la taille de l'index : avec le filtre Airborn allumé, « Tout 14 219 » sous une
     liste de 1 740 réponses se lit comme une contradiction. */
  const nTout = Object.values(parType).reduce((a, b) => a + b, 0) || faits.total;

  return (
    /**
     * `minmax(0, 1fr)` ET PAS LA PISTE IMPLICITE — mesuré dans un navigateur à 375 px,
     * et c'est le piège que `min(330px, 100%)` plus bas NE SUFFIT PAS à fermer.
     *
     * Une piste de grille implicite vaut `auto`, et une piste `auto` se dilate jusqu'à
     * la contribution min-content de ses éléments. La grille de résultats, elle, est un
     * ÉLÉMENT DE GRILLE, donc `min-width: auto` : sa contribution min-content valait
     * 613 px. La piste passait à 613 px dans un parent de 343, et TOUT y passait avec
     * elle — la carte du champ de recherche s'étirait à 613 px et `.vg-main` gagnait une
     * barre de défilement horizontale (scrollWidth 629 pour 375 de large).
     *
     * `min(330px, 100%)` sur les colonnes internes ne pouvait pas l'empêcher : pendant
     * le calcul intrinsèque de la piste du dessus, la largeur du bloc conteneur n'est pas
     * encore définie, donc le `100%` ne résout pas et le 330 px reste. Le verrou doit
     * être POSÉ SUR LA PISTE : mesuré, 613 → 343, et plus de barre.
     */
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>

      <div className="glass-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <span style={{ position: "relative", display: "block" }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
            placeholder="Un nom, un bonus, une ville, un ingrédient — les accents ne comptent pas"
            style={{ ...champ, paddingLeft: 36 }} />
        </span>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Pastille on={!type} onClick={() => setType("")}>
            Tout <span style={{ ...NUM, opacity: !type ? .7 : .55 }}>{fr(nTout)}</span>
          </Pastille>
          {TYPES.map((t) => {
            const on = type === t.clef;
            const n = parType[t.clef] ?? 0;
            return (
              <Pastille key={t.clef} on={on} onClick={() => setType(on ? "" : t.clef)}>
                <Icon name={t.icon} size={13} style={{ color: on ? "var(--gn-sur-action)" : t.couleur }} />
                {t.label}
                {n > 0 && <span style={{ ...NUM, opacity: on ? .7 : .55 }}>{fr(n)}</span>}
              </Pastille>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 11 }}>
          {/* Le tri qui vaut la place sur un serveur privé : ce qui n'existe qu'ici. Le
              repère « hors jeu » est posé À CÔTÉ de la pastille et non autour —
              `Invisible` rend un bouton, et un bouton dans un bouton n'est pas du HTML
              valide : le clic du filtre se perdrait. */}
          <Pastille on={maison} onClick={() => setMaison(!maison)}>
            <Icon name="sparkles" size={13} style={{ color: maison ? "var(--gn-sur-action)" : "var(--gn-accent)" }} />
            Ajouts Airborn
            {nMaison > 0 && <span style={{ ...NUM, opacity: maison ? .7 : .55 }}>{fr(nMaison)}</span>}
          </Pastille>
          {/* Le même texte que sur /objets, et il n'est plus écrit deux fois : voir
              `MARQUEUR_AIRBORN` dans components/objets/vocabulaire.ts. */}
          <Invisible enJeu={MARQUEUR_AIRBORN}>
            <></>
          </Invisible>
          {filtre && (
            <button onClick={() => { setQ(""); setType(""); setMaison(false); }}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon name="x" size={13} /> Remettre à zéro
            </button>
          )}
        </div>
      </div>

      {/* Le compte : combien on montre, combien il y en a. Sans ça, quarante lignes
          laissent croire qu'il n'y en a que quarante. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
        {!charge && !r ? "Recherche…" : r ? (
          <>
            <b style={{ color: "var(--text)", ...NUM }}>{fr(r.total)}</b>
            {r.total === 1 ? "réponse" : "réponses"}
            {/* « les plus proches » n'a de sens qu'avec un mot-clé : sans lui il n'y a
                pas de proximité, il y a un ordre — les ajouts d'Airborn d'abord. */}
            {r.total > r.montres && (
              q.trim() || type
                ? <span>· les {r.montres} plus proches sont affichées</span>
                /* La porte ne montre plus « les 40 premières » : elle montre huit lignes
                   de chaque nature (voir `aTourDeRole` dans src/lib/wiki.ts). Dire
                   « les 40 premières » serait faux, et c'est cette phrase qui laissait
                   croire à une liste ordonnée dont on voyait le début. */
                : <span>· {r.montres} pour l&apos;exemple, de chaque nature</span>
            )}
            {/* La composition reste À GAUCHE, collée au compte. Poussée au bord droit,
                sa bulle s'ouvrait au-delà de la fenêtre et la page gagnait une barre de
                défilement horizontale. */}
            <Composition parType={faits.parType} total={faits.total} />
            {/* La mise en garde est collée au compte, avec la composition : c'est là
                qu'on lit « ce que l'index contient », donc c'est là qu'il faut dire ce
                qu'il ne contient pas. */}
            <ButinPartiel butins={faits.butins} monstres={faits.parType.monstre ?? 0}
              situes={faits.situes} objets={faits.parType.objet ?? 0} />
          </>
        ) : "La recherche n’a pas répondu."}
      </div>

      {r && r.resultats.length === 0 && (
        <div className="glass-card" style={{ padding: "26px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          <Icon name="search" size={22} style={{ opacity: .5 }} />
          <p style={{ margin: "9px 0 0" }}>Rien sous ce mot. Essaie plus court.</p>
        </div>
      )}

      {/* `min(330px, 100%)` et pas `330px` : sur un écran de 375 px la colonne du
          contenu fait 311 px, et une piste de 330 px la ferait DÉPASSER — la page
          entière gagnait une barre de défilement horizontale. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(330px,100%),1fr))", gap: 10 }}>
        {r?.resultats.map((e) => <Resultat key={`${e.t}-${e.id}`} e={e} />)}
      </div>
    </div>
  );
}
