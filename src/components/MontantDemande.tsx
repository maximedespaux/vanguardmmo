"use client";
import { DEVISES } from "@/lib/monnaies";
import type { Paiement } from "@/components/ChoixPaiement";

/**
 * Ce qu'on met sur la pièce, présenté comme un ticket de caisse.
 *
 * Un champ nombre nu ne disait pas en QUOI on payait : le même « 2 400 » se
 * lisait en périns ou en Airpoints selon ce qu'on avait coché plus haut, et il
 * fallait remonter pour le savoir. Chaque ligne porte donc sa monnaie, avec sa
 * pièce — on la reconnaît avant de lire le chiffre.
 *
 * « Les deux » ouvre DEUX lignes, pas une. Personne n'a jamais le compte rond
 * dans une seule monnaie : forcer un seul champ obligeait à tout convertir de
 * tête, à un cours qui n'existe pas.
 *
 * L'alignement est celui d'un ticket — libellé à gauche, montant à droite, sur
 * une chasse fixe : deux nombres l'un sous l'autre se comparent d'un regard,
 * ce qu'un texte au fil de l'eau ne permet pas.
 */
export function MontantDemande({ paiement, perins, airpoints, onPerins, onAirpoints, erreur }: {
  paiement: Paiement;
  perins: string;
  airpoints: string;
  onPerins: (v: string) => void;
  onAirpoints: (v: string) => void;
  /** Souligne le ticket quand l'estimation manque. */
  erreur?: boolean;
}) {
  const lignes: { clef: "perins" | "airpoints"; v: string; set: (v: string) => void }[] =
    paiement === "airpoints" ? [{ clef: "airpoints", v: airpoints, set: onAirpoints }]
    : paiement === "mixte" ? [{ clef: "perins", v: perins, set: onPerins }, { clef: "airpoints", v: airpoints, set: onAirpoints }]
    : [{ clef: "perins", v: perins, set: onPerins }];

  return (
    <div style={{
      border: `1px solid ${erreur ? "var(--red)" : "var(--border)"}`, borderRadius: 11,
      background: "var(--bg-3)", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 12px", borderBottom: "1px dashed var(--border)",
        fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)",
      }}>
        <span>Ton estimation</span>
        <span style={{ color: "var(--orange)" }}>{lignes.length > 1 ? "2 monnaies" : "obligatoire"}</span>
      </div>

      <div style={{ display: "grid", gap: 1, background: "var(--border)" }}>
        {lignes.map(({ clef, v, set }) => {
          const d = DEVISES.find((x) => x.clef === clef)!;
          return (
            <label key={clef} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: "var(--bg-3)", cursor: "text",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.icone} alt="" style={{ width: 19, height: 19, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", flexShrink: 0 }}>{d.label}</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={v} onChange={(e) => set(e.target.value)}
                aria-label={`Montant en ${d.label}`}
                placeholder="0"
                style={{
                  marginLeft: "auto", width: "min(52%, 190px)", textAlign: "right",
                  background: "transparent", border: "none", outline: "none",
                  color: v ? "var(--gold)" : "var(--text-muted)",
                  fontFamily: "'Rubik',sans-serif", fontSize: 16, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, minWidth: 34, textAlign: "right" }}>{d.court}</span>
            </label>
          );
        })}
      </div>

      <div style={{ padding: "7px 12px", borderTop: "1px dashed var(--border)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
        {lignes.length > 1
          ? "Ce que tu mets dans chaque monnaie. Le détenteur voit les deux et répond."
          : "Ce que tu es prêt à mettre. Le tarif final se négocie dans la conversation."}
      </div>
    </div>
  );
}
