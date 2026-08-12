"use client";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import {
  ICONE_EMBLEME, estSup, frappeVague, nb, pvCourt, pvVague,
  type Bilan, type Vague,
} from "./modele";

/**
 * LES 52 VAGUES, DANS L'ORDRE OÙ TU LES PRENDS.
 *
 * Ce que le relevé maison affichait : le numéro de la vague, un nom interne de
 * monstre (« Sleepghost 1 », « Wgolem », « Colonew18 »), une quantité, un
 * multiplicateur et le nom de la prime. Autrement dit, de quoi savoir qu'il se
 * passe quelque chose, mais pas à quoi on s'attaque.
 *
 * Ce que la table des monstres du client ajoute, et qui change la lecture : le
 * nom FRANÇAIS — « Sleepghost 1 » s'appelle « Envahisseur de l'Oasis » —, le
 * niveau, les points de vie et les dégâts par coup. La première vague demande
 * 10 millions de PV et frappe à 2 000 ; la dernière en demande 10 milliards et
 * frappe à 390 000.
 *
 * Deux colonnes du client sont volontairement absentes : l'élément et le rang.
 * Ils valent « terre » et « super » sur les 84 lignes SANS UNE EXCEPTION —
 * 84 pastilles identiques n'auraient rien appris, la phrase sous le tableau le
 * dit une fois.
 */
export function Vagues({ vagues, b }: { vagues: Vague[]; b: Bilan }) {
  const [filtre, setFiltre] = useState<"toutes" | "simple" | "sup">("toutes");

  const liste = useMemo(
    () => vagues.filter((v) => filtre === "toutes" || (filtre === "sup") === estSup(v)),
    [vagues, filtre]
  );

  /**
   * L'échelle de la barre de PV est LOGARITHMIQUE, et ce n'est pas un caprice :
   * la dernière vague pèse dix mille fois la première. En échelle linéaire, les
   * trente premières vagues seraient des traits d'un pixel et la barre ne
   * dirait plus rien. En log, on lit les ordres de grandeur — le million, la
   * dizaine de millions, le milliard.
   */
  const echelle = useMemo(() => {
    const pvs = vagues.map(pvVague).filter((p) => p > 0);
    const bas = Math.log10(Math.min(...pvs)), haut = Math.log10(Math.max(...pvs));
    return (pv: number) => (pv <= 0 ? 0 : Math.max(4, ((Math.log10(pv) - bas) / (haut - bas)) * 100));
  }, [vagues]);

  if (!vagues.length) {
    return (
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        Le relevé des vagues n&apos;a pas pu être lu. Le reste de la page — la mécanique, les
        emblèmes, les réserves — ne dépend pas de ce fichier.
      </div>
    );
  }

  const th: React.CSSProperties = { padding: "7px 9px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "9px", verticalAlign: "top", fontVariantNumeric: "tabular-nums" };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        <Chiffre icon="layers" valeur={nb(b.vagues)} quoi="vagues, puis c'est fini" />
        <Chiffre icon="skull" valeur={nb(b.monstres)} quoi={`monstres à abattre, ${b.especes} espèces`} />
        <Chiffre icon="heart" valeur={pvCourt(b.pv)} quoi="de PV à sortir sur un tour complet" />
        <Chiffre icon="alert" valeur={nb(b.pireFrappe)} quoi={`la plus forte frappe — vague ${b.pireVague}, pas la dernière`} tone="var(--red)" />
      </div>

      <div className="vg-subtabs" style={{ marginTop: 0, marginBottom: 12 }}>
        {([["toutes", `Les ${b.vagues}`], ["simple", `Prime simple (${b.vaguesSimples})`], ["sup", `Prime supérieure (${b.vaguesSup})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)} className={`vg-subtab ${filtre === k ? "active" : ""}`}>{l}</button>
        ))}
      </div>

      {/* Le tableau défile DANS son cadre, et `width: 0` n'est pas une coquille.
          Six colonnes de chiffres ne tiennent pas sous 720 px : le tableau porte
          donc un `minWidth` et ce cadre un `overflowX`. Ça suffit sur grand écran,
          où le volet donne sa colonne en `minmax(0,1fr)`. Sous 800 px, la règle
          responsive du volet repasse en `1fr` — dont le minimum automatique vaut
          la taille du CONTENU : le panneau s'élargissait à 720 px et la page
          entière gagnait une barre horizontale. `width: 0` ramène la contribution
          de ce bloc à zéro dans ce calcul, `minWidth: 100%` lui rend ensuite la
          largeur du panneau. Résultat : le tableau défile, la page non. */}
      <div style={{ width: 0, minWidth: "100%", overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
        <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: .7, background: "var(--bg-3)" }}>
              <th style={{ ...th, width: 58 }}>Vague</th>
              <th style={th}>Ce qui arrive sur toi</th>
              <th style={{ ...th, width: 156 }}>PV à sortir</th>
              <th style={{ ...th, width: 96, textAlign: "right" }}>Sa frappe</th>
              <th style={{ ...th, width: 74, textAlign: "right" }}>atkx</th>
              <th style={{ ...th, width: 168 }}>Ta prime</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((v) => {
              const pv = pvVague(v), frappe = frappeVague(v), sup = estSup(v);
              return (
                <tr key={v.n} style={{ borderTop: "1px solid rgba(46,46,56,0.55)" }}>
                  <td style={{ ...td, fontWeight: 700, color: v.n === b.vagues ? "var(--gold)" : "var(--orange)" }}>
                    {v.n}
                    {v.n === b.vagues && <div style={{ fontSize: 9.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5 }}>la dernière</div>}
                  </td>

                  <td style={{ ...td, minWidth: 210 }}>
                    {v.monstres.map((m, i) => (
                      <div key={i} style={{ marginTop: i ? 5 : 0 }}>
                        <span style={{ fontWeight: 600 }}>{m.nom ?? m.interne}</span>
                        <span style={{ color: "var(--orange)" }}> ×{m.qte}</span>
                        {m.retrouve && (
                          <span title="Nom absent du relevé, retrouvé dans la table du client — voir les réserves"
                            style={{ marginLeft: 6, fontSize: 9.5, textTransform: "uppercase", letterSpacing: .5, color: "var(--purple)", border: "1px solid var(--purple)", borderRadius: 20, padding: "0 6px" }}>
                            retrouvé
                          </span>
                        )}
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {m.niv ? `niv. ${m.niv}` : "niveau inconnu"}
                          {m.pv ? ` · ${pvCourt(m.pv)} PV chacun` : ""}
                          {m.atk ? ` · ${nb(m.atk[0])}–${nb(m.atk[1])} par coup` : ""}
                        </div>
                      </div>
                    ))}
                  </td>

                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{pvCourt(pv)}</div>
                    <div style={{ marginTop: 4, height: 5, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${echelle(pv)}%`, height: "100%", borderRadius: 3, background: sup ? "linear-gradient(90deg,var(--gold),var(--orange))" : "var(--orange)" }} />
                    </div>
                  </td>

                  <td style={{ ...td, textAlign: "right", color: frappe >= 300000 ? "var(--red)" : "var(--text)" }}>
                    {frappe ? nb(frappe) : "—"}
                  </td>

                  <td style={{ ...td, textAlign: "right", color: "var(--text-muted)" }}>×{v.atkx.toLocaleString("fr-FR")}</td>

                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ICONE_EMBLEME} alt="" width={18} height={18} style={{ objectFit: "contain", flexShrink: 0 }} />
                      <span>
                        <b style={{ color: sup ? "var(--gold)" : "var(--text)" }}>×{v.primeQte}</b>
                        <span style={{ color: "var(--text-muted)" }}> {sup ? "supérieur" : "ordinaire"}</span>
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Les 52 vagues sont <b style={{ color: "var(--text)" }}>toutes de l&apos;élément terre</b> et toutes
        de rang « super » : le client ne varie pas d&apos;une ligne, donc ces deux colonnes n&apos;ont pas
        leur place dans le tableau — mais si tu montes une résistance, c&apos;est celle-là.
        {" "}La frappe affichée est celle de la table des monstres, <b style={{ color: "var(--text)" }}>avant
        tout multiplicateur</b> : ce que fait la colonne <code>atkx</code> n&apos;est pas établi, va voir
        les réserves avant de bâtir un plan dessus.
        {b.vaguesRetrouvees.length > 0 && (
          <> {" "}Les vagues {b.vaguesRetrouvees.join(", ")} portent des monstres que le relevé ne savait
          pas nommer : ils sont marqués <span style={{ color: "var(--purple)" }}>retrouvé</span>.</>
        )}
        {" "}La bascule des primes est nette : les {b.vaguesSimples} premières vagues paient en emblèmes
        ordinaires, les {b.vaguesSup} suivantes en supérieurs, et ça commence pile à la vague {b.vaguesSimples + 1}.
      </div>
    </div>
  );
}

/** Une tuile de chiffre, à la forme des pastilles de la page des donjons. */
function Chiffre({ icon, valeur, quoi, tone = "var(--orange)" }: { icon: IconName; valeur: string; quoi: string; tone?: string }) {
  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 13px" }}>
      <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: tone, display: "flex", alignItems: "center", gap: 7, fontVariantNumeric: "tabular-nums" }}>
        <Icon name={icon} size={15} />{valeur}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{quoi}</div>
    </div>
  );
}
