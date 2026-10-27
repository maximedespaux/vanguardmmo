"use client";
import { Bulle, Invisible } from "@/components/Bulle";
import { Cadre, Pastille, SousTitre, TD, TH } from "@/components/competences/ui";
import { PM_MUR, classeAffichee, fmt } from "@/components/competences/donnees";
import { LIMITES, type CompetenceLegendaire, type CompetencePalier, type Lignee } from "@/app/(public)/classes/donnees";
import { PALIERS, duree, type LigneeVue } from "./vue";

/**
 * UNE LIGNÉE, VUE DE QUATRE FAÇONS — sa chaîne, son tableau de paliers, ses
 * compétences de palier, ses légendaires.
 *
 * ┌──────────── LES NOTES SONT DEVENUES DES BULLES ────────────┐
 * │ Ce fichier portait cinq paragraphes en petit sous ses        │
 * │ tableaux. Trois disaient ce que les données NE contiennent   │
 * │ pas — pas de niveau de promotion, aucune valeur JcJ, pas de  │
 * │ coordonnées d'arbre : des constats d'ignorance, ils sont     │
 * │ partis. Les deux qui changent une décision sont restés, mais │
 * │ derrière un repère : le mur de PM des Héros, et le fait que  │
 * │ le texte du jeu contredise ses propres chiffres.             │
 * └────────────────────────────────────────────────────────────┘
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** La chaîne elle-même : six emblèmes, cinq flèches, et ce que chaque marche apprend.
 *  Le compte de compétences y est passé pour que la chaîne réponde seule à « où sont
 *  mes compétences ? » sans ouvrir le tableau. */
export function Chaine({ vue }: { vue: LigneeVue }) {
  return (
    <div className="cl-chaine">
      {vue.etapes.map((e, i) => {
        const p = PALIERS[e.palier];
        return (
          <div key={e.nom} className="cl-maille">
            <div className="cl-marche" style={{ borderColor: `color-mix(in srgb, ${p.couleur} 45%, var(--border))` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.embleme} alt="" width={40} height={40} style={{ objectFit: "contain" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "center", lineHeight: 1.15 }}>{classeAffichee(e.nom)}</span>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".5px", color: p.couleur, fontWeight: 700 }}>{p.nom}</span>
              <span style={{ fontSize: 10.5, color: "var(--text-muted)", ...NUM }}>
                {e.nb} comp.{e.requis ? ` · dès ${e.requis}` : ""}
              </span>
            </div>
            {/* La flèche SUIT sa marche au lieu de précéder la suivante : quand la
                chaîne se replie sur deux lignes, une flèche en tête de ligne pend dans
                le vide, alors qu'en fin de ligne elle dit « ça continue ». */}
            {i < vue.etapes.length - 1 && <span className="cl-fleche" aria-hidden>→</span>}
          </div>
        );
      })}
    </div>
  );
}

/** Le tableau des six paliers : ce que chacun apprend, plafonne et coûte. */
export function TableLignee({ vue }: { vue: LigneeVue }) {
  return (
    <Cadre minWidth={430}>
      <thead>
        <tr>
          <th style={TH}>Palier</th>
          <th style={TH}>Compétences</th>
          <th style={TH}>Plafond</th>
          <th style={TH}>
            {/* La colonne se faisait prendre pour le niveau de promotion : la
                précision est passée dans la bulle de son en-tête, où on la cherche. */}
            <Bulle cote="bas" quoi="Le niveau que demande la compétence la plus tardive du palier — pas celui auquel tu obtiens la promotion. Un tiret veut dire que toutes les compétences du palier s'apprennent au niveau 1.">
              Dernière comp.
            </Bulle>
          </th>
          <th style={TH}>Points au max</th>
        </tr>
      </thead>
      <tbody>
        {vue.etapes.map((e) => {
          const p = PALIERS[e.palier];
          return (
            <tr key={e.nom}>
              <td style={TD}>
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.embleme} alt="" width={24} height={24} style={{ objectFit: "contain", flexShrink: 0 }} />
                  <span>
                    <b style={{ display: "block", fontSize: 12.5 }}>{e.nom}</b>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px", color: p.couleur, fontWeight: 700 }}>{p.nom}</span>
                  </span>
                </span>
              </td>
              <td style={TD}>{e.nb}</td>
              <td style={{ ...TD, color: "var(--text-muted)" }}>niv. {e.plafond}</td>
              <td style={{ ...TD, color: e.requis ? "var(--text)" : "var(--text-muted)" }}>{e.requis ? `niv. ${e.requis}` : "—"}</td>
              <td style={{ ...TD, fontWeight: 700, color: "var(--gold)" }}>{fmt(e.points)}</td>
            </tr>
          );
        })}
        <tr>
          <td style={{ ...TD, fontWeight: 700 }}>Toute la lignée</td>
          <td style={{ ...TD, fontWeight: 700 }}>{vue.nb}</td>
          <td style={TD} />
          <td style={{ ...TD, color: "var(--text-muted)" }}>niv. {LIMITES.niveauMaxLegendaire}</td>
          <td style={{ ...TD, fontWeight: 700, color: "var(--gold)" }}>{fmt(vue.points)}</td>
        </tr>
      </tbody>
    </Cadre>
  );
}

/**
 * LES BARRES DE BUDGET : quel palier vide la réserve.
 *
 * Une seule teinte, celle de la page : c'est la LONGUEUR qui porte la grandeur. Le
 * dégradé d'avant faisait croire qu'une couleur valait un jugement. Plancher à 1,5 %
 * pour qu'un palier minuscule garde une barre — une barre absente se lit comme une
 * donnée manquante, pas comme une petite valeur.
 *
 * Le paragraphe de six lignes qui précédait est réduit à sa seule ligne utile.
 */
export function BarresBudget({ vue }: { vue: LigneeVue }) {
  const gros = [...vue.etapes].sort((a, b) => b.points - a.points)[0];
  const part = Math.round((gros.points / vue.points) * 100);
  return (
    <>
      <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: "0 0 12px" }}>
        <b style={{ color: "var(--gold)", ...NUM }}>{fmt(vue.points)} points</b> pour monter les {vue.nb} compétences
        au maximum, dont{" "}
        <Invisible enJeu="Ce sont les compétences de Métier 1 qui coûtent, parce qu'elles seules plafonnent au niveau 20 : les paliers de fin s'arrêtent à 5 ou 10 et ne pèsent presque rien. La fenêtre de compétences ne montre jamais ce déséquilibre.">
          <b style={{ color: "var(--gn-accent)", ...NUM }}>{part} % chez {gros.nom}</b>
        </Invisible>
      </p>
      <div style={{ display: "grid", gap: 7, marginBottom: 18 }}>
        {vue.etapes.map((e) => {
          const pct = (e.points / vue.points) * 100;
          return (
            <div key={e.nom} style={{ display: "grid", gridTemplateColumns: "minmax(96px,140px) 1fr auto", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.nom}>{e.nom}</span>
              <span role="img" aria-label={`${Math.round(pct)} % du budget`}
                style={{ height: 9, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.max(pct, 1.5)}%`, background: "var(--gn-jauge)", borderRadius: 5 }} />
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 84, textAlign: "right", ...NUM }}>
                {pct < 1 ? "<1" : Math.round(pct)} % · {e.nb} comp.
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Une compétence de palier : ses chiffres au niveau 5, et son coût en PM par niveau.
 *  C'est là que se voit le mur. */
export function CartePalier({ c, titre, couleur, mur }: {
  c: CompetencePalier; titre: string; couleur: string; mur: boolean;
}) {
  return (
    <div style={{ padding: "13px 15px", borderRadius: 12, background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${couleur} 30%, var(--border))` }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".6px", color: couleur, fontWeight: 700, marginBottom: 4 }}>{titre}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 9 }}>
        <span className="font-heading" style={{ fontSize: 15.5, fontWeight: 700, color: "var(--gn-accent)" }}>{c.nom}</span>
        <Pastille texte={`niveau ${c.niveauRequis}`} couleur="var(--text-muted)" />
        {mur && (
          <Invisible enJeu="Aux niveaux 1 à 4, la compétence coûte 9 999 999 PM : personne n'a ça, donc elle ne sert à rien avant le niveau 5. Et ce niveau ne se choisit pas — il se tire au hasard en dépensant un joyau de chaque type (topaze, rubis, saphir, émeraude, diamant), plafonné à 5. Tant que le tirage n'a pas donné 5, les joyaux sont dépensés pour rien.">
            <b style={{ fontSize: 11, color: "var(--red)", textTransform: "uppercase", letterSpacing: ".5px" }}>mur avant le 5</b>
          </Invisible>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {c.effets5.map((e) => (
          <span key={e} style={{ fontSize: 12.5, fontWeight: 700, padding: "5px 10px", borderRadius: 8, background: "var(--bg-3)",
            border: "1px solid var(--border)", color: "var(--green)", ...NUM }}>{e}</span>
        ))}
        {c.dureeS != null && <Puce>dure {duree(c.dureeS)}</Puce>}
        {c.rechargeS != null && <Puce>recharge {duree(c.rechargeS)}</Puce>}
      </div>

      {c.coutPM.some((v) => v != null) && (
        <>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 6 }}>PM à lancer, niveau par niveau</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {c.coutPM.map((pm, i) => {
              const bloque = pm === PM_MUR;
              return (
                <span key={i} title={bloque ? "9 999 999 PM : le client rend le niveau injouable" : undefined}
                  style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 62, padding: "5px 8px", borderRadius: 8,
                  background: bloque ? "rgba(255,90,90,.09)" : "var(--bg-3)", border: `1px solid ${bloque ? "color-mix(in srgb, var(--red) 42%, transparent)" : "var(--border)"}` }}>
                  <b style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-muted)" }}>niv. {i + 1}</b>
                  <b style={{ fontSize: 12, color: bloque ? "var(--red)" : "var(--green)", ...NUM }}>{bloque ? "mur" : fmt(pm ?? 0)}</b>
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Les légendaires d'une lignée : le bout de la chaîne. */
export function Legendaires({ lignee }: { lignee: Lignee }) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {lignee.legendaires.map((l) => <CarteLegendaire key={l.nom} l={l} />)}
    </div>
  );
}

function CarteLegendaire({ l }: { l: CompetenceLegendaire }) {
  const tot = l.niveauRequis < LIMITES.niveauMaxLegendaire;
  return (
    <div style={{ padding: "11px 13px", borderRadius: 11, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <b style={{ fontSize: 13.5, color: "var(--purple)" }}>{l.nom}</b>
        {/* Le raccourci du Primat n'existe que pour lui : le dire en note à tout le
            monde faisait croire que chaque classe en avait un. Il est donc porté par
            la pastille de la seule compétence concernée. */}
        {tot ? (
          <Invisible enJeu={`Toutes les légendaires demandent le niveau ${LIMITES.niveauMaxLegendaire}. Celle-ci s'ouvre dès ${l.niveauRequis} — c'est la seule exception des huit lignées.`}>
            <b style={{ fontSize: 11, color: "var(--green)" }}>dès le niveau {l.niveauRequis}</b>
          </Invisible>
        ) : (
          <Pastille texte={`niveau ${l.niveauRequis}`} couleur="var(--text-muted)" />
        )}
        {l.arme && <Pastille texte={l.arme} couleur="var(--blue)" />}
        {l.zone && <Pastille texte={l.zone} couleur="var(--text-muted)" />}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {l.degats5 && <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 9px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--red)", ...NUM }}>
          {fmt(l.degats5[0])}–{fmt(l.degats5[1])} dégâts
        </span>}
        {l.effets5.map((e) => (
          <span key={e} style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 9px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--green)", ...NUM }}>{e}</span>
        ))}
        {l.pm1 != null && <Puce>{fmt(l.pm1)} → {fmt(l.pm5 ?? l.pm1)} PM</Puce>}
        {l.rechargeS != null && <Puce>recharge {duree(l.rechargeS)}</Puce>}
      </div>
    </div>
  );
}

/** Les deux compétences de palier de la classe choisie, côte à côte. */
export function PaliersDeLaClasse({ vue }: { vue: LigneeVue }) {
  const l = vue.lignee;
  return (
    <>
      <SousTitre icon="medal" apres={`${l.etapes[3].nom} · ${l.etapes[4].nom}`}>Chez {l.nom}</SousTitre>
      <div style={{ marginBottom: 11, fontSize: 12.5 }}>
        <Invisible enJeu="Les chiffres verts viennent de la table d'effets du client ; la phrase du jeu, elle, décrit parfois autre chose. Le Chevalier Maître promet de la vitesse et donne de la Force et des PV. Quand les deux se contredisent, ce sont les chiffres qui s'appliquent.">
          <b style={{ color: "var(--text)" }}>Le texte du jeu ne dit pas toujours ce que la compétence fait</b>
        </Invisible>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 12, marginBottom: 12, alignItems: "start" }}>
        <CartePalier c={l.maitre} titre="Palier Maître" couleur="var(--gold)" mur={l.maitre.coutPM.includes(PM_MUR)} />
        <CartePalier c={l.heros} titre="Palier Héros" couleur="var(--gn-accent)" mur={l.heros.coutPM.includes(PM_MUR)} />
      </div>
    </>
  );
}

/** Une brique minuscule, répétée partout sur cette page. */
function Puce({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
      {children}
    </span>
  );
}
