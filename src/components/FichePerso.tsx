"use client";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { renduPerso, type Sexe } from "@/data/charRenders";

/**
 * Choisir une classe, un sexe, un niveau, un prestige — en montrant ce qu'on
 * choisit.
 *
 * C'étaient des listes déroulantes : on sélectionnait « ARBALETRIER » en
 * majuscules sans jamais voir la classe, et le sexe n'était même pas proposé
 * alors qu'il décide de l'illustration. Le builder, lui, montre les huit
 * classes en vignettes depuis toujours. On reprend son geste ici : le même
 * choix doit se faire de la même façon des deux côtés.
 */
export const CLASSES = ["SPADASSIN", "TEMPLIER", "ARCANISTE", "ENVOUTEUR", "ARBALETRIER", "SYLPHIDE", "PRIMAT", "CHANOINE"] as const;
export type Classe = (typeof CLASSES)[number];

export type Fiche = { name: string; class: string; sex: Sexe; level: number; prestige: number };

const etiquette: React.CSSProperties = {
  display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: .9,
  color: "var(--text-muted)", marginBottom: 6,
};
const champ: React.CSSProperties = {
  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "9px 12px", color: "var(--text)", fontSize: 14, fontFamily: "inherit", width: "100%",
};

export function FichePerso({ valeur, onChange, compact = false }: {
  valeur: Fiche;
  onChange: (f: Fiche) => void;
  /** Dans une carte déjà dense, on resserre l'aperçu. */
  compact?: boolean;
}) {
  const maj = (p: Partial<Fiche>) => onChange({ ...valeur, ...p });
  const rendu = renduPerso(valeur.class, valeur.sex);

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* L'illustration change en direct : c'est elle qui dit si on a choisi
            la bonne classe et le bon sexe, mieux qu'un mot en majuscules. */}
        <div style={{ width: compact ? 66 : 88, height: compact ? 92 : 122, flexShrink: 0, borderRadius: 11, overflow: "hidden", position: "relative",
          background: "radial-gradient(circle at 50% 26%, rgba(255,140,26,.15), rgba(10,10,12,.9) 72%)",
          border: "1px solid rgba(255,140,26,.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {rendu
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={rendu} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom center" }} />
            : <ClassLogo name={valeur.class} size={34} />}
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 0, display: "grid", gap: 11 }}>
          <label>
            <span style={etiquette}>Pseudo en jeu</span>
            <input value={valeur.name} onChange={(e) => maj({ name: e.target.value })}
              placeholder="ex. Daiisuke" maxLength={80} style={champ} />
          </label>

          <div>
            <span style={etiquette}>Sexe</span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["G", "F"] as Sexe[]).map((s) => (
                <button key={s} type="button" onClick={() => maj({ sex: s })}
                  style={pastille(valeur.sex === s)}>{s === "G" ? "Garçon" : "Fille"}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <span style={etiquette}>Classe</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CLASSES.map((c) => {
            const actif = valeur.class === c;
            return (
              <button key={c} type="button" onClick={() => maj({ class: c })} title={c}
                aria-label={c} aria-pressed={actif}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px 6px 6px", borderRadius: 9,
                  cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit",
                  border: `1px solid ${actif ? "var(--orange)" : "var(--border)"}`,
                  background: actif ? "rgba(255,140,26,.14)" : "var(--bg-3)",
                  color: actif ? "var(--orange)" : "var(--text-muted)" }}>
                <ClassLogo name={c} size={18} />
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 13, flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 120px" }}>
          <span style={etiquette}>Niveau</span>
          <input type="number" min={1} max={200} value={valeur.level}
            onChange={(e) => maj({ level: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} style={champ} />
        </label>
        <div style={{ flex: "2 1 220px" }}>
          <span style={etiquette}>Prestige</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
              <button key={p} type="button" onClick={() => maj({ prestige: p })}
                style={{ ...pastille(valeur.prestige === p), minWidth: 38, justifyContent: "center" }}>P{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const pastille = (actif: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9,
  cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
  border: `1px solid ${actif ? "var(--orange)" : "var(--border)"}`,
  background: actif ? "rgba(255,140,26,.14)" : "var(--bg-3)",
  color: actif ? "var(--orange)" : "var(--text-muted)",
});

/** Petite carte de confirmation, montée sur <body> par l'appelant. */
export function Confirmation({ titre, texte, action, danger, onOui, onNon, occupe }: {
  titre: string; texte: React.ReactNode; action: string; danger?: boolean;
  onOui: () => void; onNon: () => void; occupe?: boolean;
}) {
  return (
    <div onClick={() => !occupe && onNon()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 18 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, width: "100%", maxWidth: 420 }}>
        <div className="font-heading" style={{ fontSize: 16.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name={danger ? "alert" : "star"} size={17} style={{ color: danger ? "var(--red)" : "var(--gold)" }} />{titre}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 15px" }}>{texte}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onNon} disabled={occupe}
            style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={onOui} disabled={occupe}
            style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: danger ? "var(--red)" : "var(--orange)", color: "#0A0A0C", fontWeight: 700, cursor: occupe ? "wait" : "pointer", fontSize: 13, fontFamily: "inherit" }}>
            {occupe ? "…" : action}
          </button>
        </div>
      </div>
    </div>
  );
}
