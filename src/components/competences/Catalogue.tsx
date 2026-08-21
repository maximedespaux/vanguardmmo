"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
// `findClass` et pas `CLASSES[cle]` : les clefs de CLASSES sont désaccentuées
// (« Arbaletrier », « Envouteur ») alors que la fouille rend le nom accentué.
// Un accès direct rendait `undefined` pour deux classes sur huit — donc pas
// d'emblème et un libellé cru, mais seulement pour celles-là.
import { findClass } from "@/data/classes";
import { Pastille, SousTitre } from "./ui";
import { CaseVide, IconeCompetence } from "./IconeCompetence";
import { FicheDetail, FicheEnAttente, useFiches, type EtatFiche } from "./Fiche";
import {
  PALIERS, classeAffichee, couleurPalier, fmt, nomPalier,
  type Entree, type Lignee, type Palier, type Planche,
} from "./donnees";

/**
 * LE CATALOGUE — les 197 compétences, cherchées comme on les cherche.
 *
 * 197 et non 202 : le fichier du client écrit DEUX FOIS cinq compétences d'arc de
 * l'Acrobate. Le lecteur n'en est plus informé, et c'est voulu — l'encart qui le
 * disait était de la méthode, pas du jeu (règle 2, voir Sections.tsx). Ce qui compte
 * ici : le nombre affiché vient de `entrees.length`, jamais d'une constante, et la
 * liste reçue est déjà dédoublonnée par la route.
 *
 * Trois façons d'arriver sur une compétence, et elles ne se remplacent pas :
 *  · par le nom, quand on sait déjà lequel on veut ;
 *  · par la LIGNÉE, quand la question est « qu'est-ce que mon Templier peut
 *    apprendre ? » — et là l'ordre du fichier ne vaut rien, c'est l'ordre
 *    d'apprentissage qui compte, donc on regroupe par palier ;
 *  · par le palier seul, quand on compare les huit classes entre elles.
 *
 * La fiche s'ouvre EN PLACE, sous la ligne. Pas de fenêtre modale : la
 * progression d'une compétence de métier fait vingt lignes de tableau, et un
 * voile qui se referme au moindre clic à côté est le pire endroit pour lire ça.
 *
 * CE QU'UNE LIGNE FERMÉE MONTRE, ET POURQUOI ÇA A CHANGÉ.
 *  · SON ICÔNE, celle du jeu. Avant, chaque ligne portait l'emblème de sa
 *    CLASSE : filtré sur une lignée, ça donnait huit boucliers de Chevalier
 *    identiques les uns sous les autres — une image qui ne distinguait rien.
 *    L'emblème est parti ; le nom de la classe reste écrit, et l'icône dit
 *    enfin de quelle compétence on parle, avec le dessin que le joueur a déjà
 *    dans sa barre de raccourcis.
 *  · SA DESCRIPTION, dans les mots du jeu. Elle existait depuis le début mais
 *    n'apparaissait qu'une fois la fiche ouverte : pour savoir ce que font les
 *    trente-quatre compétences d'une lignée, il fallait trente-quatre clics et
 *    trente-quatre requêtes. Elle est maintenant dans l'index.
 *
 * DEUX CHOSES POUR NE PAS DÉROULER 197 LIGNES, depuis que le catalogue vit dans
 * le rail de /classes :
 *  · la classe choisie en haut de page arrive par `ligneeChoisie` — on atterrit
 *    donc sur les ~34 compétences de SA lignée, groupées par palier, et pas sur
 *    les 197 ;
 *  · les lignes fermées tiennent sur deux colonnes. La ligne ouverte, elle,
 *    reprend toute la largeur (`gridColumn: 1 / -1`) : sa fiche porte un tableau
 *    de treize colonnes, illisible dans une demi-largeur.
 */

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Catalogue({ entrees, lignees, planche, ligneeChoisie = "tous" }: {
  entrees: Entree[];
  lignees: Lignee[];
  /** La planche d'icônes servie par la route. `null` = pas encore générée. */
  planche: Planche | null;
  /** La classe choisie en haut de page, déjà résolue en clef de lignée du relevé. */
  ligneeChoisie?: string;
}) {
  const [q, setQ] = useState("");
  const [lignee, setLignee] = useState(ligneeChoisie);
  const [palier, setPalier] = useState<"tous" | Palier>("tous");
  // Changer de classe en haut de page refiltre le catalogue : sinon on choisit
  // « Arcaniste » et la liste continue de montrer le Templier, trois sections
  // plus bas. Le filtre reste manoeuvrable ensuite, c'est un point de depart.
  useEffect(() => { setLignee(ligneeChoisie); }, [ligneeChoisie]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const { fiches, demander } = useFiches();

  const ouvrir = useCallback((id: string) => {
    setOuvert((o) => (o === id ? null : id));
    void demander(id);
  }, [demander]);

  /** Aller sur une compétence citée par une autre : on l'ouvre, on ferme rien. */
  const suivre = useCallback((id: string) => {
    // Les filtres en place peuvent cacher la cible : un prérequis de Vagabond
    // reste invisible si on filtre sur « Légendaire ». On les relâche donc.
    setPalier("tous"); setQ("");
    setOuvert(id);
    void demander(id);
    // Le défilement est porté par .vg-main, pas par la fenêtre (cf. VgFx).
    requestAnimationFrame(() => document.getElementById(`comp-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [demander]);

  const parLignee = useMemo(() => new Map(lignees.map((l) => [l.cle, l])), [lignees]);

  const liste = useMemo(() => {
    const l = lignee === "tous" ? null : parLignee.get(lignee);
    let base = entrees;
    if (l) {
      // L'ordre de la lignée EST l'ordre d'apprentissage : on s'y tient plutôt
      // que de retrier alphabétiquement, ce qui mélangerait les six paliers.
      const rang = new Map(l.competences.map((id, i) => [id, i]));
      base = entrees.filter((e) => rang.has(e.id)).sort((a, b) => rang.get(a.id)! - rang.get(b.id)!);
    }
    if (palier !== "tous") base = base.filter((e) => e.palier === palier);
    const k = sansAccent(q.trim());
    // La recherche porte sur le nom AFFICHÉ de la classe : taper « acolyte »
    // doit trouver les compétences que le fichier range sous « Assistant ». Et
    // sur la DESCRIPTION depuis qu'elle est dans l'index : chercher « saignement »
    // ou « dos de l'ennemi » ramène enfin quelque chose.
    if (k) base = base.filter((e) => sansAccent(`${e.nom} ${classeAffichee(e.classe)} ${e.resume ?? ""} ${e.desc ?? ""} ${e.famille ?? ""}`).includes(k));
    return base;
  }, [entrees, lignee, palier, q, parLignee]);

  /** Groupé par palier quand une lignée est choisie : c'est là que l'ordre parle.
   *  Le sous-titre porte le nom de la classe de ce palier — « Métier 2 » seul ne
   *  dit pas qu'on parle du Chevalier. */
  const groupes = useMemo(() => {
    if (lignee === "tous" || palier !== "tous") return [{ titre: "", classe: null as string | null, items: liste }];
    const chaine = parLignee.get(lignee)?.chaine ?? [];
    return PALIERS
      .map((p, i) => {
        // Au palier Vagabond, le nom du palier EST le nom de la classe : le
        // repeter donnait « Vagabond · Vagabond · 3 ».
        const nom = chaine[i] ? classeAffichee(chaine[i]) : null;
        return { titre: p.nom, classe: nom === p.nom ? null : nom, items: liste.filter((e) => e.palier === p.cle) };
      })
      .filter((g) => g.items.length > 0);
  }, [liste, lignee, palier, parLignee]);

  const l = lignee === "tous" ? null : parLignee.get(lignee);

  return (
    <>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 13 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cherche un nom, un effet…"
          style={{ flex: "1 1 190px", minWidth: 0, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9,
            padding: "9px 12px", color: "var(--text)", fontFamily: "'Rubik',sans-serif", fontSize: 13.5 }} />
        <VgSelect value={lignee} onChange={setLignee} minWidth={168}
          options={[{ value: "tous", label: "Toutes les classes" },
            ...lignees.map((x) => ({ value: x.cle, label: `${findClass(x.cle)?.label ?? x.cle} · ${x.nbCompetences}` }))]} />
        <VgSelect value={palier} onChange={(v) => setPalier(v as "tous" | Palier)} minWidth={148}
          options={[{ value: "tous", label: "Tous les paliers" },
            ...PALIERS.map((p) => ({ value: p.cle, label: p.nom }))]} />
      </div>

      {/* Quand une lignée est choisie, on annonce ce qu'elle pèse : c'est la
          réponse à « et si je monte tout ? », qui ne se lit pas dans la liste. */}
      {l && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", marginBottom: 11, padding: "9px 12px",
          background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11 }}>
          {findClass(l.cle)?.embleme && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={findClass(l.cle)!.embleme} alt="" width={30} height={30} style={{ objectFit: "contain", flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0, flex: "1 1 200px", fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            <b className="font-heading" style={{ color: "var(--text)", fontSize: 13 }}>{l.chaine.map(classeAffichee).join(" → ")}</b>
            <div style={{ marginTop: 1 }}>
              {l.nbCompetences} compétences · {fmt(l.coutPoints)} points pour tout monter au maximum
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 9, fontVariantNumeric: "tabular-nums" }}>
        {liste.length === 0
          ? "Rien ne correspond. Le catalogue ne contient que les compétences de JOUEUR : les états infligés par les monstres n'y sont pas."
          : `${liste.length} compétence${liste.length > 1 ? "s" : ""}${liste.length !== entrees.length ? ` sur ${entrees.length}` : ""}`}
      </div>

      {groupes.map((g) => (
        <div key={g.titre || "tout"} style={{ marginBottom: g.titre ? 14 : 0 }}>
          {g.titre && <SousTitre icon="layers" apres={`${g.classe ? `${g.classe} · ` : ""}${g.items.length}`}>{g.titre}</SousTitre>}
          <div className="cp-liste">
            {g.items.map((e) => (
              <Ligne key={e.id} e={e} ouvert={ouvert === e.id} onClick={() => ouvrir(e.id)}
                fiche={fiches[e.id]} suivre={suivre} planche={planche} />
            ))}
          </div>
        </div>
      ))}

      <style>{`
        /* Deux colonnes de lignes fermees, une seule pour la fiche ouverte : sa
           progression fait treize colonnes de tableau, qui ne rentrent pas dans
           une demi-largeur. Le pas de 340 px est le point ou le nom, la pastille
           de palier et la description tiennent encore sans se couper. */
        .cp-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:6px;align-items:start}
        .cp-liste>.cp-ouvert{grid-column:1/-1}
      `}</style>
    </>
  );
}

/** Une ligne du catalogue, et la fiche qu'elle déplie. */
function Ligne({ e, ouvert, onClick, fiche, suivre, planche }: {
  e: Entree; ouvert: boolean; onClick: () => void; fiche: EtatFiche;
  suivre: (id: string) => void; planche: Planche | null;
}) {
  const c = couleurPalier(e.palier);
  return (
    <div id={`comp-${e.id}`} className={ouvert ? "cp-ouvert" : undefined}
      style={{ background: "var(--bg-2)", border: `1px solid ${ouvert ? "var(--orange)" : "var(--border)"}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={onClick} className="fx-card" style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", textAlign: "left",
        padding: "9px 10px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", color: "var(--text)" }}>
        {e.icone != null ? <IconeCompetence planche={planche} index={e.icone} titre={e.nom} /> : <CaseVide />}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <b className="font-heading" style={{ fontSize: 13 }}>{e.nom}</b>
            <Pastille texte={nomPalier(e.palier)} couleur={c} />
            {e.prerequis.length > 0 && <Pastille texte="prérequis" couleur="var(--text-muted)" titre="Une autre compétence doit être montée avant" />}
          </span>
          {/* La description AVANT les chiffres : c'est ce qui répond à « c'est
              quoi ? », et les chiffres ne servent qu'après. */}
          {e.desc && (
            <span style={{ display: "block", fontSize: 12, color: "var(--text)", opacity: .82, marginTop: 3, lineHeight: 1.45 }}>{e.desc}</span>
          )}
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4, fontVariantNumeric: "tabular-nums" }}>
            {classeAffichee(e.classe)}
            {e.nivPerso > 1 && ` · niv. ${e.nivPerso}`}
            {` · jusqu'à niv. ${e.nivMax}`}
            {e.resume && ` · ${e.resume}`}
            {/* Les rangs muets tiennent en fin de ligne de chiffres et pas en
                pastille : en pastille, ils passaient à la ligne sur un rang sur
                trois et transformaient la liste en guirlande. */}
            {e.nbRangsMuets > 0 && (
              <span style={{ color: "var(--gold)" }} title="Des rangs où aucune valeur du relevé ne change — le détail et leur coût sont dans la fiche">
                {` · ${e.nbRangsMuets} rangs muets`}
              </span>
            )}
          </span>
        </span>
        <Icon name={ouvert ? "chevron-up" : "chevron-down"} size={14} style={{ color: ouvert ? "var(--orange)" : "var(--text-muted)", flexShrink: 0, marginTop: 3 }} />
      </button>
      {ouvert && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "13px 13px 15px", background: "var(--bg-3)" }}>
          {fiche === "chargement" || fiche === undefined
            ? <FicheEnAttente />
            : <FicheDetail f={fiche} suivre={suivre} planche={planche} desc={false} />}
        </div>
      )}
    </div>
  );
}
