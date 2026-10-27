"use client";
import { Icon } from "@/components/Icon";
import { ClassLogo } from "@/components/ClassLogo";
import { Bulle, Invisible } from "@/components/Bulle";
import { Pastille, SousTitre } from "@/components/competences/ui";
import { PM_MUR } from "@/components/competences/donnees";
import { LIGNEES, LIMITES } from "@/app/(public)/classes/donnees";
// NB_NOMS_DE_CLASSE n'est plus importé ici : le total de la bande est recompté sur la
// bande, pour qu'un titre et la somme de ses tuiles ne puissent plus divergent.
import { NOMS_PAR_PALIER, PALIERS, palierNomme, PLAFOND_PALIER } from "./vue";
import { Arbre } from "./Arbre";

/**
 * LES ÉCHELLES — trois systèmes qui se superposent, montrés au lieu d'être racontés.
 *
 *   · celle des NOMS : vingt-et-un noms de classe, pas trente-sept. Maître et Héros
 *     ne sont pas des classes mais des promotions du Métier 2 — le client l'écrit,
 *     « Chevalier Maître » a pour promuDe « Chevalier ». C'est l'arbre qui le dit
 *     maintenant, en posant les deux emblèmes DANS la case du Métier 2 ;
 *   · celle des NIVEAUX DE PERSO : Héros s'ouvre à 120, les légendaires à 130, le
 *     personnage plafonne à 200 ;
 *   · celle des NIVEAUX DE COMPÉTENCE : 10 au départ, 20 en Métier 1, puis 10 et 5.
 *
 * Le paragraphe qui expliquait le premier point est parti avec le dessin : l'arbre
 * porte l'information, et sa légende tient en une ligne.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Combien de compétences porte un nom de classe, d'après le relevé. */
export type CompteClasse = (nomClasse: string) => number | null;

export function Echelles({ choisi, onChoix, nbDe }: {
  choisi: string; onChoix: (cle: string) => void; nbDe: CompteClasse;
}) {
  return (
    <>
      {/* Échelle 1 : les paliers. Le ×N ne s'affiche que sur ceux qui introduisent des
          NOMS neufs — sinon la bande sommait 37 sous un titre annonçant 21. Voir la
          note de `palierNomme` dans vue.ts : le détail de la contradiction y est.
          Le total est RECALCULÉ ici sur la bande elle-même, et pas repris de
          NB_NOMS_DE_CLASSE : c'est la seule façon que le titre et la somme des tuiles
          ne puissent plus se contredire, quelle que soit l'évolution des données. */}
      {(() => {
        const somme = NOMS_PAR_PALIER.filter((x) => palierNomme(x.palier)).reduce((s, x) => s + x.noms.length, 0);
        return <SousTitre icon="layers" apres={`${somme} noms de classe · ${NOMS_PAR_PALIER.length} marches`}>Les paliers</SousTitre>;
      })()}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "stretch", marginBottom: 16 }}>
        {NOMS_PAR_PALIER.map((x, i) => {
          const p = PALIERS[x.palier];
          const caps = PLAFOND_PALIER.get(x.palier) ?? [];
          const nomme = palierNomme(x.palier);
          return (
            <span key={x.palier} style={{ display: "inline-flex", alignItems: "stretch", gap: 7 }}>
              {/* Le chevron SUIT sa tuile : placé avant la suivante, il pendait dans le
                  vide en tête de ligne dès que la bande se repliait. */}
              <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, padding: "7px 11px", borderRadius: 10, background: "var(--bg-2)",
                border: `1px solid color-mix(in srgb, ${p.couleur} 38%, var(--border))` }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name={p.icon} size={13} style={{ color: p.couleur }} />
                  <b style={{ fontSize: 12.5 }}>{p.nom}</b>
                  {/* LA PASTILLE PASSE DE `title` À <Bulle>, et ce n'est pas une
                      préférence de style. La pastille « PROMOTION » remplace un ×N :
                      seule, elle n'explique pas POURQUOI ce palier ne compte pas dans
                      les 21, et c'est justement la contradiction qu'on vient de fermer.
                      Or l'explication tenait dans un `title=""` — que le doigt n'ouvre
                      JAMAIS. Sur téléphone, la bande affichait donc deux pastilles
                      inexpliquées sous un total qui ne les additionne pas : le lecteur
                      se retrouvait devant la même énigme qu'avant le correctif.
                      La brique de la maison ouvre au survol ET au clic — voir le cadre
                      « POURQUOI PAS title="" » en tête de src/components/Bulle.tsx. */}
                  {nomme
                    ? <b style={{ fontSize: 12, color: "var(--text-muted)", ...NUM }}>×{x.noms.length}</b>
                    : <Bulle cote="bas" largeur={230}
                        quoi={<>« {x.noms[0]} » n&apos;est pas une classe de plus : c&apos;est
                          le Métier 2 promu. Le client le dit dans son champ <code>promuDe</code>.</>}>
                        <span style={{ fontSize: 10, color: "var(--gold)", textTransform: "uppercase", letterSpacing: ".5px" }}>promotion</span>
                      </Bulle>}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-muted)", ...NUM }}>compétences niv. {caps.join(" ou ")} max</span>
              </span>
              {i < NOMS_PAR_PALIER.length - 1 && <span aria-hidden style={{ color: "var(--text-muted)", alignSelf: "center" }}>›</span>}
            </span>
          );
        })}
      </div>

      {/* Échelle 2 : l'arbre lui-même. */}
      <SousTitre icon="path" apres={`1 départ · 4 troncs · ${LIGNEES.length} fins`}>L&apos;arbre des promotions</SousTitre>
      <Arbre choisi={choisi} onChoix={onChoix} nbDe={nbDe} />

      {/* Échelle 3 : les niveaux de perso qui ouvrent les paliers. */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 16 }}>
        <Borne valeur={LIMITES.niveauMaxGeneral} quoi="Héros s'ouvre" couleur="var(--gn-accent)" />
        <Borne valeur={LIMITES.niveauMaxLegendaire} quoi="les légendaires s'ouvrent" couleur="var(--purple)" />
        <Borne valeur={LIMITES.niveauMaxPersonnage} quoi="plafond d'un perso" couleur="var(--text-muted)" />
      </div>
    </>
  );
}

function Borne({ valeur, quoi, couleur }: { valeur: number; quoi: string; couleur: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 7, padding: "6px 11px", borderRadius: 9, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
      <b className="font-heading" style={{ fontSize: 15, color: couleur, ...NUM }}>{valeur}</b>
      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{quoi}</span>
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  HUIT NOMS, DEUX EFFETS
// ══════════════════════════════════════════════════════════════════════════

/**
 * La trouvaille transversale : elle ne se voit qu'en mettant les huit classes côte à
 * côte, donc elle ne peut pas vivre dans le volet d'une seule.
 *
 * Les deux paragraphes qui l'entouraient sont passés dans des repères « hors jeu » :
 * huit noms différents, huit icônes différentes, deux effets réels — et un mur de PM
 * sur sept d'entre elles. Ni l'un ni l'autre ne se lit dans la fenêtre de compétences.
 */
export function HuitNomsDeuxEffets({ onChoix }: { onChoix: (cle: string) => void }) {
  const heros = LIGNEES.map((l) => ({ classe: l.nom, cle: l.cle, source: l.etapes[4].nom, c: l.heros }));
  const parEffet = new Map<string, typeof heros>();
  for (const h of heros) {
    const k = h.c.effets5.join(" · ");
    parEffet.set(k, [...(parEffet.get(k) ?? []), h]);
  }
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 13, fontSize: 12.5 }}>
        <Invisible enJeu={`Les ${heros.length} compétences de Héros ont ${heros.length} noms et ${heros.length} icônes, mais au niveau 5 elles se rangent dans ${parEffet.size} cases : marquer la cible pour le physique, ou pour la magie. Trois du même bord dans une composition, et la troisième ne rapporte rien.`}>
          <b style={{ color: "var(--text)", ...NUM }}>{heros.length} noms → {parEffet.size} effets</b>
        </Invisible>
        <Invisible enJeu="Sept de ces huit compétences coûtent 9 999 999 PM avant le niveau 5 — personne n'a ça. Et le niveau ne se choisit pas : il se tire au hasard en dépensant un joyau de chaque type, plafonné à 5. Seule la Marque de vulnérabilité du Meneur Héros est utilisable dès le niveau 1.">
          <b style={{ color: "var(--red)" }}>7 sur 8 inutilisables avant le 5</b>
        </Invisible>
      </div>
      <div className="cl-deux">
        {[...parEffet.entries()].map(([effet, membres]) => (
          <div key={effet} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)", marginBottom: 2, ...NUM }}>{effet}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 9, ...NUM }}>
              {membres.length} sur {heros.length} · 60 s, recharge 120 s
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {membres.map((m) => (
                <button key={m.cle} onClick={() => onChoix(m.cle)} className="cl-lien">
                  {/* L'emblème officiel, pas le logo maison : sur cette carte on parle
                      des paliers du jeu, autant montrer ses dessins. */}
                  <ClassLogo name={m.cle} size={20} officiel />
                  <b style={{ fontSize: 12.5 }}>{m.c.nom}</b>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{m.source} → {m.classe}</span>
                  {m.c.coutPM.includes(PM_MUR)
                    ? <Pastille texte="mur PM 1-4" couleur="var(--red)" titre="9 999 999 PM aux niveaux 1 à 4" />
                    : <Pastille texte="jouable dès 1" couleur="var(--green)" titre="500 PM dès le niveau 1 — la seule des huit" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
