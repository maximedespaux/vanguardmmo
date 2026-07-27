"use client";
import { Icon } from "@/components/Icon";
import type { SpecObjet } from "@/lib/specObjet";

/**
 * La bulle d'un objet, telle qu'on la voit dans le builder.
 *
 * Redessinée ici à partir des données plutôt que réinjectée en HTML : ce qui
 * arrive du builder passe par la base et serait, sinon, du balisage écrit par
 * un membre et affiché dans l'écran d'un autre.
 *
 * Elle sert à trancher d'un coup d'œil : c'est bien CETTE pièce-là qu'on
 * demande — la Légendaire +9 percée, pas son homonyme du coffre.
 */
export function BulleObjet({ spec, compact = false }: { spec: SpecObjet; compact?: boolean }) {
  const couleur = spec.couleur || "var(--text)";
  return (
    <div style={{
      display: "inline-block", minWidth: compact ? 0 : 230, maxWidth: 340,
      background: "linear-gradient(180deg,#191920,#121217)", border: "1px solid var(--border)",
      borderTop: `2px solid ${couleur}`, borderRadius: "0 0 11px 11px", padding: "10px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {spec.icone && <img src={spec.icone} alt="" style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0 }} />}
        <span style={{ fontWeight: 700, fontSize: 13.5, color: couleur, lineHeight: 1.2 }}>
          {spec.nom}
          {spec.up ? <span style={{ color: "var(--gold)" }}> +{spec.up}</span> : null}
          {spec.etoiles ? <span style={{ color: "var(--gold)" }}> {"★".repeat(Math.min(5, spec.etoiles))}</span> : null}
        </span>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{spec.slot}</div>

      {(spec.puces?.length ?? 0) > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
          {spec.puces!.map((p, i) => (
            <span key={i} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, border: "1px solid var(--border)", color: "var(--gold)" }}>{p}</span>
          ))}
        </div>
      )}

      {spec.attaque && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: 7, color: "var(--text-muted)" }}>
          <span>Attaque</span><b style={{ color: "var(--text)" }}>{spec.attaque[0]} ~ {spec.attaque[1]}</b>
        </div>
      )}

      {(spec.lignes?.length ?? 0) > 0 && (
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: "1px dashed var(--border)", display: "grid", gap: 3 }}>
          {spec.lignes!.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 11.5 }}>
              <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{l.label}</span>
              <span style={{ marginLeft: "auto", textAlign: "right", color: "var(--text)" }}>{l.valeur}</span>
            </div>
          ))}
        </div>
      )}

      {!compact && (spec.classe || spec.niveau || spec.prestige) && (
        <div style={{ marginTop: 7, paddingTop: 6, borderTop: "1px solid var(--border)", display: "grid", gap: 2, fontSize: 11 }}>
          {spec.classe && <div style={{ display: "flex" }}><span style={{ color: "var(--text-muted)" }}>Classe</span><b style={{ marginLeft: "auto" }}>{spec.classe}</b></div>}
          {spec.niveau ? <div style={{ display: "flex" }}><span style={{ color: "var(--text-muted)" }}>Niveau requis</span><b style={{ marginLeft: "auto" }}>{spec.niveau}</b></div> : null}
          {spec.prestige ? <div style={{ display: "flex" }}><span style={{ color: "var(--text-muted)" }}>Prestige</span><b style={{ marginLeft: "auto" }}>P{spec.prestige}</b></div> : null}
        </div>
      )}
    </div>
  );
}

/** Repli discret quand une demande n'a pas de spec (panier, ancienne requête). */
export function SansBulle({ texte }: { texte: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
      <Icon name="package" size={13} />{texte}
    </span>
  );
}
