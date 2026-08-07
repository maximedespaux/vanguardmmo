"use client";
import { DEVISES } from "@/lib/monnaies";

/**
 * Comment l'acheteur souhaite payer : périns, Airpoints, ou les deux.
 *
 * Ce n'est pas un montant — l'acheteur ne connaît pas encore le prix, c'est le
 * vendeur qui l'annonce en premier. C'est une intention, et elle manquait : le
 * détenteur composait son tarif sans savoir si l'autre avait des Airpoints, et
 * la question repartait dans la conversation à chaque fois.
 */
export type Paiement = "perins" | "airpoints" | "mixte";

export function ChoixPaiement({ valeur, onChange }: { valeur: Paiement; onChange: (p: Paiement) => void }) {
  const choix: { clef: Paiement; label: string; icones: string[] }[] = [
    { clef: "perins", label: "Périns", icones: [DEVISES[0].icone] },
    { clef: "airpoints", label: "Airpoints", icones: [DEVISES[1].icone] },
    { clef: "mixte", label: "Les deux", icones: [DEVISES[0].icone, DEVISES[1].icone] },
  ];
  return (
    <div>
      <span style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 4 }}>
        Je paie en
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {choix.map((c) => {
          const actif = valeur === c.clef;
          return (
            <button key={c.clef} onClick={() => onChange(c.clef)} type="button"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                border: `1px solid ${actif ? "var(--orange)" : "var(--border)"}`,
                background: actif ? "rgba(255,140,26,.14)" : "var(--bg-3)",
                color: actif ? "var(--orange)" : "var(--text-muted)" }}>
              {c.icones.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" style={{ width: 15, height: 15 }} />
              ))}
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
