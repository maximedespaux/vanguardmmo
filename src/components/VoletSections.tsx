"use client";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * CARTE D'IDENTITÉ · RAIL · PANNEAU — la disposition des pages qui ont
 * plusieurs facettes.
 *
 * Nos pages « riches » empilaient toutes leurs sections dans une colonne : il
 * fallait dérouler pour savoir ce qu'elles contenaient, et chercher une
 * information revenait à la balayer du regard en descendant. Ici, ce qu'on
 * cherche se choisit dans un rail — chaque entrée porte son compte, donc on
 * sait ce qu'il y a dedans SANS l'ouvrir.
 *
 * Une brique, pas un copier-coller : la même disposition redessinée page par
 * page diverge au premier ajustement, et on se retrouve avec quatre rails qui
 * ne se ressemblent plus.
 *
 * Ce n'est PAS pour toutes les pages. Un catalogue, le builder, une liste de
 * donjons n'ont qu'une seule chose à montrer — leur donner un rail à une
 * entrée ajouterait un clic pour rien.
 */
export type SectionVolet = {
  clef: string;
  titre: string;
  /** La ligne sous le titre : ce qu'on trouve dans cette section. */
  sous: string;
  icon: IconName;
  /** Compte affiché en pastille. `null` = pas de compte (ex. un bilan). */
  compte?: number | null;
  contenu: React.ReactNode;
};

export function VoletSections({ sections, defaut, entete }: {
  sections: SectionVolet[];
  /** Section ouverte à l'arrivée. Par défaut la première. */
  defaut?: string;
  /** La carte d'identité, au-dessus du rail. */
  entete?: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(defaut ?? sections[0]?.clef);
  const active = sections.find((s) => s.clef === ouvert) ?? sections[0];
  if (!active) return null;

  return (
    <>
      {entete}
      {/* `minWidth: 0` sur les deux colonnes : sans lui, un contenu large — tableau,
          bloc de code, longue ligne — ÉLARGIT la grille au lieu de défiler dans son
          panneau, et c'est la page entière qui gagne une barre horizontale. Une page
          l'avait contourné par une règle locale ; le défaut valait pour toutes. */}
      <div className="vg-volet" style={{ display: "grid", gridTemplateColumns: "270px minmax(0,1fr)", gap: 14, alignItems: "start" }}>

        <div style={{ display: "grid", gap: 8 }}>
          {sections.map((s) => {
            const on = s.clef === active.clef;
            return (
              <button key={s.clef} onClick={() => setOuvert(s.clef)} className="fx-card"
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  padding: "13px 14px", borderRadius: 12,
                  background: on ? "rgba(var(--gn-lueur-rgb),.09)" : "var(--bg-2)",
                  border: `1px solid ${on ? "var(--gn-accent)" : "var(--border)"}` }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: on ? "var(--gn-action)" : "var(--bg-3)", border: `1px solid ${on ? "rgba(var(--gn-or-rgb),.55)" : "var(--border)"}`,
                  color: on ? "var(--gn-sur-action)" : "var(--gn-accent)" }}>
                  <Icon name={s.icon} size={17} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: on ? "var(--gn-accent)" : "var(--text)" }}>
                    {s.titre}
                    {s.compte != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: "center", padding: "1px 7px", borderRadius: 20,
                        background: s.compte ? "var(--bg-3)" : "transparent",
                        border: `1px solid ${s.compte ? "var(--border)" : "transparent"}`,
                        color: s.compte ? "var(--gold)" : "var(--text-muted)" }}>{s.compte}</span>
                    )}
                  </span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{s.sous}</span>
                </span>
                <Icon name="chevron-right" size={15} style={{ color: on ? "var(--gn-accent)" : "var(--text-muted)", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        <div className="glass-card fx-card" style={{ padding: 18, minHeight: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 13, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--gn-accent)" }}>
              <Icon name={active.icon} size={17} />
            </span>
            <span>
              <span className="font-heading" style={{ display: "block", fontSize: 15.5, fontWeight: 700 }}>{active.titre}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{active.sous}</span>
            </span>
          </div>
          {active.contenu}
        </div>
      </div>

      {/* Sous 800 px le rail passe AU-DESSUS : deux colonnes de 270 px et de
          reste ne tiennent pas côte à côte sur un téléphone. */}
      <style>{`@media(max-width:800px){.vg-volet{grid-template-columns:1fr !important}}`}</style>
    </>
  );
}

/** La carte d'identité qui coiffe un volet : qui/quoi, et l'action principale. */
export function EnteteVolet({ icon, titre, sous, marque, action }: {
  icon: IconName;
  titre: string;
  sous: React.ReactNode;
  /** Pastille à côté du titre (un état, un compte marquant). */
  marque?: { texte: string; couleur: string };
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-card fx-card" style={{ padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
      <span style={{ width: 54, height: 54, borderRadius: 15, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(180deg, rgba(255,210,74,.18), rgba(var(--gn-lueur-rgb),.1))", border: "1px solid rgba(255,210,74,.35)", color: "var(--gold)" }}>
        <Icon name={icon} size={26} />
      </span>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div className="font-heading" style={{ fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          {titre}
          {marque && (
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, color: marque.couleur,
              background: `color-mix(in srgb, ${marque.couleur} 11%, transparent)`,
              border: `1px solid color-mix(in srgb, ${marque.couleur} 40%, transparent)`,
              borderRadius: 20, padding: "2px 10px" }}>{marque.texte}</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{sous}</div>
      </div>
      {action}
    </div>
  );
}
