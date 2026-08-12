"use client";
import { Icon } from "@/components/Icon";
import { Cadre, Pastille, SousTitre, TD, TH } from "@/components/competences/ui";
import { PM_MUR, fmt } from "@/components/competences/donnees";
import { LIMITES, type CompetenceLegendaire, type CompetencePalier, type Lignee } from "@/app/(public)/classes/donnees";
import { PALIERS, duree, type LigneeVue } from "./vue";

/**
 * UNE LIGNÉE, VUE DE QUATRE FAÇONS — sa chaîne, son tableau de paliers, ses
 * compétences de palier, ses légendaires.
 *
 * Ces blocs vivaient dans la page ; ils en sortent le jour où /classes a absorbé
 * /competences, parce qu'une page qui monte neuf sections ne peut pas aussi
 * porter le dessin de chacune.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

/** La chaîne elle-même : six emblèmes, cinq flèches, et ce que chaque marche
 *  apprend. Le compte de compétences y est passé pour que la chaîne réponde
 *  seule à « où sont mes compétences ? » sans ouvrir le tableau. */
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
              <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "center", lineHeight: 1.15 }}>{e.nom}</span>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".5px", color: p.couleur, fontWeight: 700 }}>{p.nom}</span>
              <span style={{ fontSize: 10.5, color: "var(--text-muted)", ...NUM }}>
                {e.nb} comp.
                {/* Le niveau affiche est celui de la competence la plus tardive du
                    palier, PAS celui de la promotion : le client n'a pas le second. */}
                {e.requis ? ` · dès ${e.requis}` : ""}
              </span>
            </div>
            {/* La fleche SUIT sa marche au lieu de preceder la suivante : quand la
                chaine se replie sur deux lignes, une fleche en tete de ligne pend
                dans le vide, alors qu'en fin de ligne elle dit « ca continue ». */}
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
    <>
      <Cadre minWidth={430}>
        <thead>
          <tr>
            <th style={TH}>Palier</th>
            <th style={TH}>Compétences</th>
            <th style={TH}>Plafond</th>
            <th style={TH}>Sa dernière compétence</th>
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
      <Note>
        La colonne « sa dernière compétence » est le niveau que demande la compétence la plus tardive
        du palier — <b>pas</b> celui auquel tu obtiens la promotion : le client ne contient nulle part
        les niveaux de promotion. Un tiret veut dire que le fichier inscrit 1 sur toutes les
        compétences du palier, ce qui ne veut rien dire de plus.
      </Note>
    </>
  );
}

/** Les barres de budget : quel palier vide la réserve. Une seule teinte, la
 *  LONGUEUR porte la grandeur. */
export function BarresBudget({ vue }: { vue: LigneeVue }) {
  const gros = [...vue.etapes].sort((a, b) => b.points - a.points)[0];
  const part = Math.round((gros.points / vue.points) * 100);
  return (
    <>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
        Tout monter au maximum chez <b>{vue.lignee.nom}</b> demande{" "}
        <b style={{ color: "var(--gold)", ...NUM }}>{fmt(vue.points)} points</b> pour {vue.nb} compétences.
        À lui seul, le palier <b>{PALIERS[gros.palier].nom}</b> — {gros.nom} — en pèse{" "}
        <b style={{ color: "var(--orange)", ...NUM }}>{part} %</b> : les paliers de fin ne coûtent presque rien,
        ce sont les compétences de métier — plafond niveau 20 — qui vident la réserve.
      </p>
      <div style={{ display: "grid", gap: 7, marginBottom: 18 }}>
        {vue.etapes.map((e) => {
          const pct = (e.points / vue.points) * 100;
          return (
            <div key={e.nom} style={{ display: "grid", gridTemplateColumns: "minmax(96px,140px) 1fr auto", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.nom}>{e.nom}</span>
              <span style={{ height: 9, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.max(pct, 0.4)}%`, background: "linear-gradient(90deg,#FFB552,#FF8C1A)", borderRadius: 5 }} />
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 96, textAlign: "right", ...NUM }}>
                {fmt(e.points)} · {pct < 1 ? "<1" : Math.round(pct)} % · {e.nb} comp.
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Une compétence de palier : ses chiffres au niveau 5, et son coût en PM par
 *  niveau. C'est là que se voit le mur. */
export function CartePalier({ c, titre, couleur, mur }: {
  c: CompetencePalier; titre: string; couleur: string; mur: boolean;
}) {
  return (
    <div style={{ padding: "13px 15px", borderRadius: 12, background: "var(--bg-2)", border: `1px solid color-mix(in srgb, ${couleur} 30%, var(--border))` }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".6px", color: couleur, fontWeight: 700, marginBottom: 4 }}>{titre}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 9 }}>
        <span className="font-heading" style={{ fontSize: 15.5, fontWeight: 700, color: "var(--orange)" }}>{c.nom}</span>
        <Pastille texte={`niveau ${c.niveauRequis}`} couleur="var(--text-muted)" />
        <Pastille texte="5 niveaux" couleur="var(--text-muted)" />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {c.effets5.map((e) => (
          <span key={e} style={{ fontSize: 12.5, fontWeight: 700, padding: "5px 10px", borderRadius: 8, background: "var(--bg-3)",
            border: "1px solid var(--border)", color: "var(--green)", ...NUM }}>{e}</span>
        ))}
        {c.dureeS != null && <Puce>dure {duree(c.dureeS)}</Puce>}
        {c.rechargeS != null && <Puce>recharge {duree(c.rechargeS)}</Puce>}
      </div>

      {c.description && <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 11px" }}>« {c.description} »</p>}

      {c.coutPM.some((v) => v != null) && (
        <>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 6 }}>Ce que ça te coûte en PM à lancer</div>
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
          {mur && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10, padding: "10px 12px", borderRadius: 10,
              background: "rgba(255,90,90,.07)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)" }}>
              <Icon name="alert" size={14} style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, lineHeight: 1.5 }}>
                Aux niveaux 1 à 4, la compétence coûte <b style={{ color: "var(--red)", ...NUM }}>9 999 999 PM</b> : personne n&apos;a ça,
                donc elle ne sert à rien tant qu&apos;elle n&apos;est pas au niveau 5. Et ce niveau, tu ne le choisis pas : elle se monte
                avec un joyau de chaque type — topaze, rubis, saphir, émeraude, diamant — et le niveau obtenu est tiré au hasard,
                plafonné à 5. Tant que le tirage n&apos;a pas donné 5, les joyaux sont dépensés pour rien.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Les légendaires d'une lignée : le bout de la chaîne. */
export function Legendaires({ lignee }: { lignee: Lignee }) {
  const tot = lignee.legendaires.filter((l) => l.niveauRequis < LIMITES.niveauMaxLegendaire);
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {lignee.legendaires.map((l) => <CarteLegendaire key={l.nom} l={l} />)}
      <Note>
        {/* L'exception du Primat n'existe que pour lui : la dire a tout le monde
            ferait croire que chaque classe a son raccourci. */}
        {tot.length
          ? <>Toutes demandent le niveau {LIMITES.niveauMaxLegendaire}, sauf « {tot[0].nom} » qui s&apos;ouvre dès {tot[0].niveauRequis} — {lignee.nom} est la seule classe à avoir ce raccourci. </>
          : <>Toutes demandent le niveau {LIMITES.niveauMaxLegendaire}. </>}
        Les chiffres sont ceux du niveau 5. Le client n&apos;a aucune valeur JcJ : les colonnes prévues
        pour ça sont vides sur les 2 500 lignes, donc rien ici ne dit ce que ça fait sur un joueur.
      </Note>
    </div>
  );
}

function CarteLegendaire({ l }: { l: CompetenceLegendaire }) {
  return (
    <div style={{ padding: "11px 13px", borderRadius: 11, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <b style={{ fontSize: 13.5, color: "var(--purple)" }}>{l.nom}</b>
        <Pastille texte={`niveau ${l.niveauRequis}`} couleur={l.niveauRequis < LIMITES.niveauMaxLegendaire ? "var(--green)" : "var(--text-muted)"}
          titre={l.niveauRequis < LIMITES.niveauMaxLegendaire ? "Elle s'ouvre avant les autres légendaires" : undefined} />
        {l.arme && <Pastille texte={l.arme} couleur="var(--blue)" />}
        {l.zone && <Pastille texte={l.zone} couleur="var(--text-muted)" />}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: l.description ? 6 : 0 }}>
        {l.degats5 && <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 9px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--red)", ...NUM }}>
          {fmt(l.degats5[0])}–{fmt(l.degats5[1])} dégâts
        </span>}
        {l.effets5.map((e) => (
          <span key={e} style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 9px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--green)", ...NUM }}>{e}</span>
        ))}
        {l.pm1 != null && <Puce>{fmt(l.pm1)} → {fmt(l.pm5 ?? l.pm1)} PM</Puce>}
        {l.rechargeS != null && <Puce>recharge {duree(l.rechargeS)}</Puce>}
      </div>
      {l.description && <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{l.description}</p>}
    </div>
  );
}

/** Les deux compétences de palier de la classe choisie, côte à côte, et ce que
 *  le texte du jeu ne dit pas de leur niveau 5. */
export function PaliersDeLaClasse({ vue }: { vue: LigneeVue }) {
  const l = vue.lignee;
  return (
    <>
      <SousTitre icon="medal" apres={`${l.etapes[3].nom} · ${l.etapes[4].nom}`}>Chez {l.nom}</SousTitre>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 12, marginBottom: 12, alignItems: "start" }}>
        <CartePalier c={l.maitre} titre="Palier Maître" couleur="var(--gold)" mur={l.maitre.coutPM.includes(PM_MUR)} />
        <CartePalier c={l.heros} titre="Palier Héros" couleur="var(--orange)" mur={l.heros.coutPM.includes(PM_MUR)} />
      </div>
      <Note>
        La phrase entre guillemets est le texte du jeu, les chiffres viennent de sa table d&apos;effets.
        Quand les deux se contredisent — le Chevalier Maître promet de la vitesse et donne de la Force
        et des PV —, ce sont les chiffres qui s&apos;appliquent. Un seul Maître touche deux
        statistiques : celui du Chevalier.
      </Note>
    </>
  );
}

// ── Deux briques minuscules, répétées partout sur cette page ──────────────

function Puce({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
      {children}
    </span>
  );
}

/** La note en petit, avec son icône : la réserve qu'on pose SOUS un tableau. */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 11, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
      <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}
