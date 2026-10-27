"use client";
import React from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Les trois briques que les cinq sections de /competences se repassent.
 *
 * Elles vivent ici et pas dans chaque section parce qu'un tableau de chiffres
 * revient cinq fois sur cette page : la progression d'une compétence, le coût
 * des paliers, le budget des huit lignées, les bonus de groupe, les niveaux de
 * couple. Redessinés à chaque fois, ils divergeaient dès le premier ajustement.
 */

/** Le titre d'un bloc à l'intérieur d'une section. */
export function SousTitre({ icon, children, apres }: { icon: IconName; children: React.ReactNode; apres?: React.ReactNode }) {
  return (
    <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--gn-accent)", margin: "0 0 10px" }}>
      <Icon name={icon} size={13} />
      {children}
      {apres != null && (
        <span style={{ fontSize: 12, fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "var(--text-muted)" }}>{apres}</span>
      )}
    </div>
  );
}

/** Une étiquette courte et colorée : un palier, un état, un avertissement. */
export function Pastille({ texte, couleur, titre }: { texte: string; couleur: string; titre?: string }) {
  return (
    <span title={titre} style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: couleur,
      background: `color-mix(in srgb, ${couleur} 11%, transparent)`,
      border: `1px solid color-mix(in srgb, ${couleur} 38%, transparent)`,
      borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap" }}>{texte}</span>
  );
}

/**
 * Un tableau qui défile DANS son cadre.
 *
 * Sans ce `overflow-x: auto`, un tableau de treize colonnes élargit la grille du
 * volet et c'est la page entière qui gagne une barre horizontale — le piège que
 * VoletSections désamorce côté colonnes, mais que le contenu peut rouvrir.
 */
export function Cadre({ children, minWidth = 420 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 11, background: "var(--bg-2)" }}>
      <table style={{ width: "100%", minWidth, borderCollapse: "collapse", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
        {children}
      </table>
    </div>
  );
}

/** Les cellules du tableau, pour ne pas répéter le style sur chaque `<td>`. */
export const TH: React.CSSProperties = {
  textAlign: "left", padding: "8px 11px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".6px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
};
export const TD: React.CSSProperties = {
  padding: "7px 11px", borderTop: "1px solid rgba(255,255,255,.04)", verticalAlign: "top",
};

/** Le bloc « à retenir » : ce qui change une décision, pas une note de bas de page. */
export function Encart({ icon, ton = "orange", titre, children }: {
  icon: IconName; ton?: "orange" | "gold" | "red" | "blue"; titre: string; children: React.ReactNode;
}) {
  const marque = ton === "orange";
  const c = marque ? "var(--gn-accent)" : `var(--${ton})`;
  return (
    <div style={{ background: marque ? "rgba(var(--gn-lueur-rgb),.07)" : `color-mix(in srgb, ${c} 7%, transparent)`,
      border: marque ? "1px solid rgba(var(--gn-or-rgb),.32)" : `1px solid color-mix(in srgb, ${c} 32%, transparent)`,
      borderRadius: 11, padding: "13px 15px", marginBottom: 14 }}>
      <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: c, marginBottom: 5 }}>
        <Icon name={icon} size={14} />{titre}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text)" }}>{children}</div>
    </div>
  );
}
