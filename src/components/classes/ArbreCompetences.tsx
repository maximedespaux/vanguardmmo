"use client";
import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Pastille, SousTitre } from "@/components/competences/ui";
import { CaseVide, IconeCompetence } from "@/components/competences/IconeCompetence";
import { FicheDetail, FicheEnAttente, useFiches, type EtatFiche } from "@/components/competences/Fiche";
import {
  classeAffichee, couleurPalier, nomPalier, PALIERS,
  type Entree, type Lignee, type Palier, type Planche,
} from "@/components/competences/donnees";

/**
 * L'ARBRE DES COMPÉTENCES D'UNE LIGNÉE — qui ouvre quoi, et à partir de quel rang.
 *
 * CE N'EST PAS L'ARBRE DES PROMOTIONS (`classes/Arbre.tsx`, dans « Les échelles »).
 * Les deux répondent à deux questions différentes, et les confondre est facile :
 *   · l'arbre des PROMOTIONS dit dans quel ordre on change de CLASSE —
 *     Vagabond → Mercenaire → Chevalier → Maître → Héros → Templier. Six cases.
 *   · celui-ci dit ce que la lignée APPREND : les compétences, leurs
 *     dépendances, et le rang qu'il faut atteindre sur l'une pour ouvrir
 *     l'autre. Trente-quatre cases chez le Templier.
 * Le premier se lit une fois ; celui-ci se lit à chaque montée de niveau.
 *
 * D'OÙ VIENNENT LES TRAITS. Le client écrit, pour chaque compétence, ses
 * prérequis : une autre compétence ET le rang qu'elle doit atteindre. Rien
 * n'est déduit d'un nom ou d'un ordre de fichier. Un dessin sans prérequis est
 * une racine ; les autres pendent de leur prérequis.
 *
 * TROIS CHOSES QUE LE RELEVÉ IMPOSE ET QU'IL FAUT ASSUMER À L'ÉCRAN :
 *  1. UNE CHAÎNE PEUT CHANGER DE PALIER. « Maître des épées » est une compétence
 *     de Mercenaire (Métier 1) et elle ouvre « Justice », qui est du Chevalier
 *     (Métier 2). Vingt-trois arêtes font ce saut. L'enfant garde donc sa propre
 *     pastille de palier : on voit le saut au lieu de le subir.
 *  2. UNE COMPÉTENCE PEUT AVOIR DEUX PRÉREQUIS. Dix en ont. Elle est posée sous
 *     le premier, et le second est écrit sur sa ligne — la dessiner deux fois
 *     ferait croire à deux compétences.
 *  3. LA PLUPART DES COMPÉTENCES N'OUVRENT RIEN. Les afficher toutes en tête de
 *     liste noyait les vraies chaînes ; elles sont rassemblées en fin de palier,
 *     en une bande de cases, sous leur propre titre.
 *
 * L'INDENTATION EST LA SEULE GRAMMAIRE : un filet vertical par niveau de
 * profondeur, pas de SVG. Les chaînes vont jusqu'à dix crans de profondeur chez
 * le Chanoine — un dessin à coordonnées fixes se serait replié en bouillie sur
 * un téléphone, alors qu'une liste indentée se lit toujours.
 */

type Noeud = {
  e: Entree;
  profondeur: number;
  /** Le prérequis sous lequel il est posé, et le rang qu'il exige. */
  parent: { nom: string; niveau: number } | null;
  /** Les autres prérequis, quand il y en a plusieurs. */
  aussi: { nom: string; niveau: number }[];
};

type Groupe = {
  palier: Palier;
  /** Le nom de la classe à ce palier, quand il diffère du nom du palier. */
  classe: string | null;
  /** Les chaînes : une racine et sa descendance, à plat, dans l'ordre de lecture. */
  chaines: Noeud[][];
  /** Les compétences qui n'ouvrent rien et ne dépendent de rien. */
  isolees: Entree[];
};

/**
 * La forêt d'une lignée : les racines par palier, chacune avec sa descendance
 * aplatie dans l'ordre où on la lit.
 */
function foret(entrees: Entree[], lignee: Lignee): Groupe[] {
  const dans = new Set(lignee.competences);
  const parId = new Map(entrees.filter((e) => dans.has(e.id)).map((e) => [e.id, e]));
  const rang = new Map(lignee.competences.map((id, i) => [id, i]));
  const ordonne = (a: Entree, b: Entree) => (rang.get(a.id) ?? 0) - (rang.get(b.id) ?? 0);

  /** Les prérequis d'une compétence qui appartiennent VRAIMENT à cette lignée. */
  const parents = (e: Entree) => e.prerequis.filter((p) => parId.has(p.id));

  /** id du parent → enfants, en gardant le premier prérequis comme parent. */
  const enfants = new Map<string, Entree[]>();
  for (const e of parId.values()) {
    const ps = parents(e);
    if (!ps.length) continue;
    const cle = ps[0].id;
    if (!enfants.has(cle)) enfants.set(cle, []);
    enfants.get(cle)!.push(e);
  }
  for (const liste of enfants.values()) liste.sort(ordonne);

  const racines = [...parId.values()].filter((e) => parents(e).length === 0).sort(ordonne);

  /** Une racine et toute sa descendance, à plat. Le `vus` coupe court à un
   *  cycle : le relevé n'en contient pas, mais une boucle figerait la page. */
  const descendance = (e: Entree, profondeur: number, parent: Noeud["parent"], vus: Set<string>): Noeud[] => {
    if (vus.has(e.id)) return [];
    vus.add(e.id);
    const ps = parents(e);
    const n: Noeud = { e, profondeur, parent, aussi: ps.slice(1).map((p) => ({ nom: p.nom, niveau: p.niveau })) };
    const suite = (enfants.get(e.id) ?? []).flatMap((f) => {
      const lien = f.prerequis.find((p) => p.id === e.id);
      return descendance(f, profondeur + 1, { nom: e.nom, niveau: lien?.niveau ?? 1 }, vus);
    });
    return [n, ...suite];
  };

  const vus = new Set<string>();
  const groupes: Groupe[] = PALIERS.map((p, i) => {
    const nom = lignee.chaine[i] ? classeAffichee(lignee.chaine[i]) : null;
    const ici = racines.filter((r) => r.palier === p.cle);
    const chaines: Noeud[][] = [];
    const isolees: Entree[] = [];
    for (const r of ici) {
      if (!enfants.has(r.id)) { isolees.push(r); vus.add(r.id); continue; }
      const c = descendance(r, 0, null, vus);
      if (c.length) chaines.push(c);
    }
    return { palier: p.cle, classe: nom === p.nom ? null : nom, chaines, isolees };
  }).filter((g) => g.chaines.length > 0 || g.isolees.length > 0);

  return groupes;
}

/**
 * Le nombre de CHAÎNES d'une lignée — ce que la pastille du rail annonce.
 *
 * Il sort de la même fonction que le dessin. Compté à part, il aurait fini par
 * dire autre chose que le chapeau de la section, et c'est exactement le défaut
 * que la page a déjà payé deux fois (« trente-sept classes », « 23 instances »).
 */
export function compteChaines(entrees: Entree[], lignee: Lignee | null): number | null {
  if (!lignee) return null;
  return foret(entrees, lignee).reduce((s, g) => s + g.chaines.length, 0);
}

export function ArbreCompetences({ entrees, lignee, planche }: {
  entrees: Entree[];
  lignee: Lignee | null;
  planche: Planche | null;
}) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const { fiches, demander } = useFiches();

  const basculer = useCallback((id: string) => {
    setOuvert((o) => (o === id ? null : id));
    void demander(id);
  }, [demander]);

  const suivre = useCallback((id: string) => {
    setOuvert(id);
    void demander(id);
    requestAnimationFrame(() => document.getElementById(`arb-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [demander]);

  const groupes = useMemo(() => (lignee ? foret(entrees, lignee) : []), [entrees, lignee]);

  // Les chiffres du chapeau se comptent sur la forêt, jamais à la main.
  const nbChaines = groupes.reduce((s, g) => s + g.chaines.length, 0);
  const nbLies = groupes.reduce((s, g) => s + g.chaines.reduce((t, c) => t + c.length, 0), 0);
  const nbIsolees = groupes.reduce((s, g) => s + g.isolees.length, 0);
  const profondeur = nbChaines ? Math.max(...groupes.flatMap((g) => g.chaines.flatMap((c) => c.map((n) => n.profondeur)))) + 1 : 0;

  if (!lignee) return <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Choisis une classe en haut de page.</div>;

  return (
    <>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 13 }}>
        Ce que <b style={{ color: "var(--text)" }}>{lignee.cle}</b> apprend, et dans quel ordre le jeu
        l&apos;autorise. <b style={{ color: "var(--text)" }}>{nbChaines} chaînes</b> relient{" "}
        <b style={{ color: "var(--text)" }}>{nbLies}</b> compétences sur {lignee.nbCompetences} ; la plus longue
        en enfile <b style={{ color: "var(--text)" }}>{profondeur}</b>. Les {nbIsolees} autres ne dépendent de rien
        et n&apos;ouvrent rien : elles sont rangées en fin de palier, sous « sans dépendance ».
        <br />
        À ne pas confondre avec <b style={{ color: "var(--text)" }}>l&apos;arbre des promotions</b>, dans « Les échelles » :
        celui-là dit quand on CHANGE DE CLASSE, celui-ci ce qu&apos;on APPREND.
      </div>

      {groupes.map((g) => {
        const c = couleurPalier(g.palier);
        const total = g.chaines.reduce((s, x) => s + x.length, 0) + g.isolees.length;
        return (
          <div key={g.palier} style={{ marginBottom: 16 }}>
            <SousTitre icon="layers" apres={`${g.classe ? `${g.classe} · ` : ""}${total}`}>{nomPalier(g.palier)}</SousTitre>

            {g.chaines.map((chaine, i) => (
              <div key={i} style={{ marginBottom: 9, paddingLeft: 2, borderLeft: `2px solid color-mix(in srgb, ${c} 45%, transparent)` }}>
                {chaine.map((n) => (
                  <NoeudLigne key={n.e.id} n={n} palierGroupe={g.palier} planche={planche}
                    ouvert={ouvert === n.e.id} onClick={() => basculer(n.e.id)}
                    fiche={fiches[n.e.id]} suivre={suivre} />
                ))}
              </div>
            ))}

            {g.isolees.length > 0 && (
              <div style={{ marginTop: g.chaines.length ? 10 : 0 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 6 }}>
                  Sans dépendance · {g.isolees.length}
                </div>
                <div className="ac-isolees">
                  {g.isolees.map((e) => (
                    <button key={e.id} id={`arb-${e.id}`} onClick={() => basculer(e.id)} className="ac-chip fx-card"
                      aria-expanded={ouvert === e.id}>
                      {e.icone != null ? <IconeCompetence planche={planche} index={e.icone} taille={24} titre={e.nom} /> : <CaseVide taille={24} />}
                      {/* Le nom se REPLIE au lieu d'être coupé : « Expertise des
                          armes à deux mains » finissait en « Expertise des armes
                          à deux … », et un nom tronqué ne se cherche plus. */}
                      <span style={{ minWidth: 0 }}>{e.nom}</span>
                    </button>
                  ))}
                </div>
                {/* La fiche d'une case isolée s'ouvre SOUS la bande et non dans
                    la case : une case de 190 px ne peut pas porter un tableau de
                    treize colonnes, et pousser la case déferait la grille. */}
                {ouvert != null && g.isolees.some((e) => e.id === ouvert) && (
                  <div style={{ marginTop: 8 }}>
                    <PanneauFiche fiche={fiches[ouvert]} suivre={suivre} planche={planche} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .ac-isolees{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px}
        .ac-chip{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:9px;background:var(--bg-2);
          border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:12.5px;cursor:pointer;text-align:left;line-height:1.3}
        .ac-chip:hover{border-color:var(--gn-accent)}
        /* LE RETRAIT. Un cran vaut 15 px, et la profondeur va jusqu'a dix chez
           le Chanoine : 150 px de marge sur un ecran de 375 px pliaient chaque
           ligne en quatre. Le pas tombe donc a 4 px sous 560 px — assez pour que
           l'oeil voie l'escalier, assez peu pour que le texte respire. Le lien
           lui-meme n'est jamais porte par le retrait seul : chaque ligne ECRIT
           de quelle competence elle depend. */
        .ac-cran{padding-left:calc(6px + var(--cran) * 15px)}
        @media(max-width:560px){.ac-cran{padding-left:calc(6px + var(--cran) * 4px)}}
      `}</style>
    </>
  );
}

/** Le panneau déplié sous une compétence : la fiche, ou l'attente. */
function PanneauFiche({ fiche, suivre, planche }: { fiche: EtatFiche; suivre: (id: string) => void; planche: Planche | null }) {
  return (
    <div style={{ marginBottom: 9, border: "1px solid var(--gn-accent)", borderRadius: 10, padding: "13px 13px 15px", background: "var(--bg-3)" }}>
      {fiche === "chargement" || fiche === undefined
        ? <FicheEnAttente />
        : <FicheDetail f={fiche} suivre={suivre} planche={planche} />}
    </div>
  );
}

/** Une compétence dans une chaîne, et la fiche qu'elle déplie. */
function NoeudLigne({ n, palierGroupe, planche, ouvert, onClick, fiche, suivre }: {
  n: Noeud; palierGroupe: Palier; planche: Planche | null; ouvert: boolean;
  onClick: () => void; fiche: EtatFiche; suivre: (id: string) => void;
}) {
  const { e } = n;
  const saut = e.palier !== palierGroupe;
  return (
    // Le retrait passe par une VARIABLE CSS et non par un pixel calculé ici :
    // c'est la feuille de style qui choisit le pas, donc elle peut le réduire
    // sur téléphone sans que ce composant ait à connaître la largeur de l'écran.
    <div id={`arb-${e.id}`} className="ac-cran" style={{ "--cran": n.profondeur,
      borderLeft: n.profondeur > 0 ? "1px solid var(--border)" : undefined,
      marginLeft: n.profondeur > 0 ? 6 : 0 } as React.CSSProperties}>
      <button onClick={onClick} aria-expanded={ouvert} className="fx-card"
        style={{ display: "flex", alignItems: "flex-start", gap: 9, width: "100%", textAlign: "left", marginBottom: 4,
          padding: "7px 9px", borderRadius: 9, background: ouvert ? "rgba(var(--gn-lueur-rgb),.07)" : "var(--bg-2)",
          border: `1px solid ${ouvert ? "var(--gn-accent)" : "var(--border)"}`, cursor: "pointer", fontFamily: "inherit", color: "var(--text)" }}>
        {e.icone != null ? <IconeCompetence planche={planche} index={e.icone} taille={24} titre={e.nom} /> : <CaseVide taille={24} />}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <b className="font-heading" style={{ fontSize: 12.5 }}>{e.nom}</b>
            {/* La pastille n'apparaît que quand la chaîne CHANGE de palier :
                répétée sur chaque nœud, elle ne signalait plus rien. */}
            {saut && <Pastille texte={nomPalier(e.palier)} couleur={couleurPalier(e.palier)} titre="Cette chaîne franchit un palier" />}
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 1, lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}>
            {n.parent
              ? <>ouverte par <b style={{ color: "var(--text)" }}>{n.parent.nom}</b> au rang {n.parent.niveau}</>
              : <>aucun prérequis</>}
            {n.aussi.map((a) => <span key={a.nom}> · et {a.nom} au rang {a.niveau}</span>)}
            {e.nivPerso > 1 && ` · perso niv. ${e.nivPerso}`}
            {` · jusqu'au rang ${e.nivMax}`}
            {e.nbRangsMuets > 0 && <span style={{ color: "var(--gold)" }}> · {e.nbRangsMuets} rangs muets</span>}
          </span>
        </span>
        <Icon name={ouvert ? "chevron-up" : "chevron-down"} size={13} style={{ color: ouvert ? "var(--gn-accent)" : "var(--text-muted)", flexShrink: 0, marginTop: 3 }} />
      </button>
      {ouvert && <PanneauFiche fiche={fiche} suivre={suivre} planche={planche} />}
    </div>
  );
}
