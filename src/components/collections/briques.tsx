"use client";
import React from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Les quelques formes que les six sections de /collections se partagent.
 *
 * Elles existaient déjà, dispersées : la pastille de filtre vient de la
 * recherche d'objets, le bandeau de source des fiches du wiki. Redessinées
 * section par section, elles auraient divergé au premier ajustement — six
 * pastilles qui ne se ressemblent plus dans une seule page.
 */

/** Une pastille de filtre. Même forme partout : c'est ce qui la rend lisible. */
export function Pastille({ on, onClick, children, couleur = "var(--orange)" }: {
  on: boolean; onClick: () => void; children: React.ReactNode; couleur?: string;
}) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit",
      fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 20,
      color: on ? "#0A0A0C" : "var(--text)",
      background: on ? couleur : "var(--bg-3)",
      border: `1px solid ${on ? couleur : "var(--border)"}`,
    }}>{children}</button>
  );
}

export const champ: React.CSSProperties = {
  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10,
  padding: "10px 12px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", width: "100%",
};

/** Un champ de recherche avec sa loupe. */
export function Chercher({ valeur, sur, invite }: { valeur: string; sur: (v: string) => void; invite: string }) {
  return (
    <span style={{ position: "relative", flex: "1 1 240px", minWidth: 0 }}>
      <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
      <input value={valeur} onChange={(e) => sur(e.target.value)} placeholder={invite}
        style={{ ...champ, paddingLeft: 34 }} />
    </span>
  );
}

/**
 * D'où sort ce qu'on lit.
 *
 * Chaque section porte le fichier du client qui la nourrit. Ce n'est pas de la
 * coquetterie : ces chiffres n'ont jamais été annoncés par le serveur, et
 * quelqu'un finira par vouloir vérifier. Sans la source, il n'a que notre
 * parole.
 */
export function Source({ fichier, avertissement }: { fichier: string; avertissement?: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
      {avertissement && (
        <p style={{ margin: "0 0 7px", display: "flex", gap: 7, alignItems: "flex-start", color: "var(--text)" }}>
          <Icon name="info" size={14} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 2 }} />
          <span>{avertissement}</span>
        </p>
      )}
      <p style={{ margin: 0 }}>Relevé dans le client du jeu : <code style={{ fontSize: 11 }}>{fichier}</code></p>
    </div>
  );
}

/** Un chiffre qui compte, avec ce qu'il mesure sous lui. */
export function Chiffre({ valeur, quoi, icon, couleur = "var(--gold)" }: {
  valeur: React.ReactNode; quoi: string; icon?: IconName; couleur?: string;
}) {
  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", minWidth: 0 }}>
      <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 20, fontWeight: 700, color: couleur, fontVariantNumeric: "tabular-nums" }}>
        {icon && <Icon name={icon} size={17} />}
        {valeur}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{quoi}</div>
    </div>
  );
}

/** Une rangée de chiffres, qui se replie sur les petits écrans. */
export function Chiffres({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
      {children}
    </div>
  );
}

/** Un titre de bloc à l'intérieur d'une section. */
export function Bloc({ titre, sous, icon, children }: {
  titre: string; sous?: string; icon?: IconName; children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 20 }}>
      <h3 className="font-heading" style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <Icon name={icon} size={16} style={{ color: "var(--orange)" }} />}
        {titre}
      </h3>
      {sous && <p style={{ margin: "0 0 11px", fontSize: 12.5, color: "var(--text-muted)" }}>{sous}</p>}
      {children}
    </section>
  );
}

/**
 * Un tableau qui DÉFILE dans son panneau.
 *
 * Sans le conteneur en `overflow-x:auto`, une colonne de trop élargit la grille
 * du volet et c'est la page entière qui gagne une barre horizontale — le piège
 * que `VoletSections` documente déjà pour ses deux colonnes.
 */
export function Tableau({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 420 }}>
        {children}
      </table>
    </div>
  );
}

export const th: React.CSSProperties = {
  textAlign: "left", padding: "9px 12px", fontSize: 11, textTransform: "uppercase",
  letterSpacing: 0.7, color: "var(--text-muted)", fontWeight: 700,
  background: "var(--bg-3)", whiteSpace: "nowrap",
};

export const td: React.CSSProperties = {
  padding: "9px 12px", borderTop: "1px solid var(--border)", verticalAlign: "middle",
};

/** Une cellule de chiffres : alignée à droite et en chasse fixe, sans quoi les
 *  colonnes de nombres ne se comparent pas d'un coup d'œil. */
export const tdNum: React.CSSProperties = {
  ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
};
