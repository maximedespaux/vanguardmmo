"use client";
import { Icon } from "@/components/Icon";
import { ClassLogo } from "@/components/ClassLogo";
import { Pastille, SousTitre } from "@/components/competences/ui";
import { PM_MUR } from "@/components/competences/donnees";
import { LIGNEES, LIMITES } from "@/app/(public)/classes/donnees";
import { NB_NOMS_DE_CLASSE, NOMS_PAR_PALIER, ORDRE_PALIERS, PALIERS, PLAFOND_PALIER } from "./vue";
import { Note } from "./Lignee";

/**
 * LES ÉCHELLES — le système de paliers lu d'un coup d'œil, pas en paragraphes.
 *
 * Trois échelles se superposent dans ce jeu et on les confondait :
 *   · celle des NOMS : vingt-et-un noms de classe, pas trente-sept. Maître et
 *     Héros ne sont pas des classes mais des promotions du Métier 2 — le client
 *     l'écrit noir sur blanc, « Chevalier Maître » a pour promuDe « Chevalier » ;
 *   · celle des NIVEAUX DE PERSO : la promotion Héros s'ouvre à 120, les
 *     légendaires à 130, le personnage plafonne à 200 ;
 *   · celle des NIVEAUX DE COMPÉTENCE : 10 au départ, 20 en Métier 1, 10 en
 *     Métier 2, et 5 seulement sur les trois derniers paliers.
 *
 * D'où un arbre et deux bandeaux au lieu de trois paragraphes : les huit lignées
 * tiennent dans une grille de cinq colonnes, et on y lit le branchement — quatre
 * Métier 1 pour huit Métier 2 — sans avoir à le déduire.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** Combien de compétences porte un nom de classe, d'après le relevé. */
export type CompteClasse = (nomClasse: string) => number | null;

export function Echelles({ choisi, onChoix, nbDe }: {
  choisi: string; onChoix: (cle: string) => void; nbDe: CompteClasse;
}) {
  const vagabond = LIGNEES[0].etapes[0];
  // Les lignees regroupees par Metier 1 : c'est le branchement du jeu, quatre
  // troncs pour huit fins. Calcule et pas ecrit — si une lignee s'ajoutait,
  // l'arbre suivrait.
  const troncs: { nom: string; embleme: string; lignees: typeof LIGNEES }[] = [];
  for (const l of LIGNEES) {
    const m1 = l.etapes[1];
    const t = troncs.find((x) => x.nom === m1.nom);
    if (t) t.lignees.push(l);
    else troncs.push({ nom: m1.nom, embleme: m1.embleme, lignees: [l] });
  }
  const colonnes = ORDRE_PALIERS.slice(1);

  return (
    <>
      {/* Echelle 1 : les paliers, et combien de noms chacun porte. */}
      <SousTitre icon="layers" apres={`${NB_NOMS_DE_CLASSE} noms de classe`}>Les six paliers</SousTitre>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "stretch", marginBottom: 14 }}>
        {NOMS_PAR_PALIER.map((x, i) => {
          const p = PALIERS[x.palier];
          const caps = PLAFOND_PALIER.get(x.palier) ?? [];
          return (
            <span key={x.palier} style={{ display: "inline-flex", alignItems: "stretch", gap: 7 }}>
              {/* Le chevron SUIT sa tuile : place avant la suivante, il pendait
                  dans le vide en tete de ligne des que la bande se repliait. */}
              <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, padding: "7px 11px", borderRadius: 10, background: "var(--bg-2)",
                border: `1px solid color-mix(in srgb, ${p.couleur} 38%, var(--border))` }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name={p.icon} size={13} style={{ color: p.couleur }} />
                  <b style={{ fontSize: 12.5 }}>{p.nom}</b>
                  <b style={{ fontSize: 12, color: "var(--text-muted)", ...NUM }}>×{x.noms.length}</b>
                </span>
                <span style={{ fontSize: 10.5, color: "var(--text-muted)", ...NUM }}>compétences niv. {caps.join(" ou ")} max</span>
              </span>
              {i < NOMS_PAR_PALIER.length - 1 && <span aria-hidden style={{ color: "var(--text-muted)", alignSelf: "center" }}>›</span>}
            </span>
          );
        })}
      </div>

      {/* Echelle 2 : l'arbre. Il defile dans son cadre plutot que de se replier :
          replie en une colonne, un arbre ne montre plus le branchement, qui est
          la seule chose qu'on vient y chercher. */}
      <SousTitre icon="path" apres={`${troncs.length} troncs · ${LIGNEES.length} fins`}>L&apos;arbre des promotions</SousTitre>
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 11, background: "var(--bg-2)", padding: 9, marginBottom: 6 }}>
        <div style={{ minWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", marginBottom: 8, borderRadius: 9,
            background: "var(--bg-3)", border: "1px solid var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vagabond.embleme} alt="" width={30} height={30} style={{ objectFit: "contain", flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <b style={{ fontSize: 12.5 }}>{vagabond.nom}</b>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}> — le départ commun aux {LIGNEES.length} lignées, {nbDe(vagabond.nom) ?? vagabond.nbCompetences} compétences</span>
            </span>
          </div>

          <div className="cl-arbre">
            {colonnes.map((p) => (
              <div key={p} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".6px", fontWeight: 700, color: PALIERS[p].couleur, padding: "0 2px 2px" }}>
                {PALIERS[p].nom}
              </div>
            ))}
            {troncs.map((t) => (
              <Tronc key={t.nom} tronc={t} choisi={choisi} onChoix={onChoix} nbDe={nbDe} />
            ))}
          </div>
        </div>
      </div>
      <Note>
        {/* Le compte de « trente-sept classes » etait faux, et il trahissait le
            systeme : Maitre et Heros sont des paliers de la meme classe de
            Metier 2. Seul le troisieme metier donne huit noms neufs. */}
        <b style={{ color: "var(--text)" }}>{NB_NOMS_DE_CLASSE} noms de classe</b> seulement, et cinq paliers pour les porter :
        Maître et Héros ne sont pas de nouvelles classes mais des <b>promotions</b> de ton Métier 2 — un Chevalier devient
        Chevalier Maître, puis Chevalier Héros. Seul le troisième métier change de nom. Clique une ligne pour ouvrir sa lignée
        dans les sections voisines.
      </Note>

      {/* Echelle 3 : les niveaux de perso qui ouvrent les paliers. */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 }}>
        <Borne valeur={LIMITES.niveauMaxGeneral} quoi="le palier Héros s'ouvre" couleur="var(--orange)" />
        <Borne valeur={LIMITES.niveauMaxLegendaire} quoi="les légendaires s'ouvrent" couleur="var(--purple)" />
        <Borne valeur={LIMITES.niveauMaxPersonnage} quoi="niveau maximum d'un perso" couleur="var(--text-muted)" />
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

/** Un tronc de Métier 1 et les lignées qui en sortent. La cellule de gauche
 *  s'étend sur ses deux lignes : c'est ce qui fait voir le branchement. */
function Tronc({ tronc, choisi, onChoix, nbDe }: {
  tronc: { nom: string; embleme: string; lignees: typeof LIGNEES };
  choisi: string; onChoix: (cle: string) => void; nbDe: CompteClasse;
}) {
  return (
    <>
      <Case nom={tronc.nom} embleme={tronc.embleme} nb={nbDe(tronc.nom)} couleur={PALIERS.metier1.couleur}
        style={{ gridRow: `span ${tronc.lignees.length}` }} />
      {tronc.lignees.map((l) => (
        <ButtonLignee key={l.cle} lignee={l} actif={l.cle === choisi} onChoix={onChoix} nbDe={nbDe} />
      ))}
    </>
  );
}

function ButtonLignee({ lignee, actif, onChoix, nbDe }: {
  lignee: (typeof LIGNEES)[number]; actif: boolean; onChoix: (cle: string) => void; nbDe: CompteClasse;
}) {
  return (
    <>
      {lignee.etapes.slice(2).map((e) => (
        <button key={e.nom} onClick={() => onChoix(lignee.cle)} className="cl-case-btn" aria-pressed={actif}
          style={{ borderColor: actif ? "var(--orange)" : "var(--border)", background: actif ? "rgba(255,140,26,.09)" : "var(--bg-3)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.embleme} alt="" width={26} height={26} style={{ objectFit: "contain", flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>
            <b style={{ display: "block", fontSize: 11.5, lineHeight: 1.2, color: actif ? "var(--orange)" : "var(--text)" }}>{e.nom}</b>
            <span style={{ fontSize: 10, color: "var(--text-muted)", ...NUM }}>{nbDe(e.nom) ?? e.nbCompetences} comp.</span>
          </span>
        </button>
      ))}
    </>
  );
}

function Case({ nom, embleme, nb, couleur, style }: {
  nom: string; embleme: string; nb: number | null; couleur: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", borderRadius: 9, background: "var(--bg-3)",
      border: `1px solid color-mix(in srgb, ${couleur} 34%, var(--border))`, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={embleme} alt="" width={26} height={26} style={{ objectFit: "contain", flexShrink: 0 }} />
      <span style={{ minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 11.5, lineHeight: 1.2 }}>{nom}</b>
        {nb != null && <span style={{ fontSize: 10, color: "var(--text-muted)", ...NUM }}>{nb} comp.</span>}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  HUIT NOMS, DEUX EFFETS
// ══════════════════════════════════════════════════════════════════════════

/**
 * La trouvaille transversale : elle ne se voit qu'en mettant les huit classes
 * côte à côte, donc elle ne peut pas vivre dans le volet d'une seule.
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
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 13px" }}>
        Chaque palier Héros a sa compétence, son nom et son icône. Au niveau 5, elles se rangent pourtant dans{" "}
        <b style={{ color: "var(--text)" }}>{parEffet.size} cases</b> seulement : marquer la cible pour le physique, ou pour la magie.
        Si ta composition en aligne trois du même bord, la troisième ne rapporte rien.
      </p>
      <div className="cl-deux">
        {[...parEffet.entries()].map(([effet, membres]) => (
          <div key={effet} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)", marginBottom: 2, ...NUM }}>{effet}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 9 }}>
              {membres.length} compétence{membres.length > 1 ? "s" : ""} sur {heros.length} · 60 s, recharge 120 s
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {membres.map((m) => (
                <button key={m.cle} onClick={() => onChoix(m.cle)} className="cl-lien">
                  {/* L'embleme officiel, pas le logo maison : sur cette carte on
                      parle des paliers du jeu, autant montrer ses dessins. */}
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
      <Note>
        Sept de ces huit compétences coûtent 9 999 999 PM avant le niveau 5, et le niveau s&apos;obtient au tirage — un joyau de
        chaque type, résultat aléatoire plafonné à 5. Seule la « Marque de vulnérabilité » du Meneur Héros est utilisable dès
        le niveau 1.
      </Note>
    </>
  );
}
