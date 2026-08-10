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
export function MontantDemande({ paiement, perins, airpoints, onPerins, onAirpoints, erreur, objectif, tauxAP = 0 }: {
  paiement: Paiement;
  perins: string;
  airpoints: string;
  onPerins: (v: string) => void;
  onAirpoints: (v: string) => void;
  /** Souligne le ticket quand l'estimation manque. */
  erreur?: boolean;
  /**
   * Le compte à atteindre, en périns — le tarif de ce qu'on commande. Quand il
   * est connu ET que le cours de l'Airpoint l'est aussi, l'autre monnaie se
   * remplit toute seule : on tape ce qu'on a en périns, le reste bascule en
   * Airpoints. Sinon il faudrait poser la division de tête, et le compte ne
   * tomberait jamais juste.
   */
  objectif?: number | null;
  /** Cours de l'Airpoint, fixé par la guilde. 0 = pas de cours, pas de calcul. */
  tauxAP?: number;
}) {
  /* LE COMPLÉMENT AUTOMATIQUE. Uniquement en mixte, et uniquement si on connaît
     le tarif ET le cours : sans l'un des deux, il n'y a rien à répartir. On
     n'écrase jamais la monnaie qu'on est en train de taper. */
  const calculable = paiement === "mixte" && !!objectif && objectif > 0 && tauxAP > 0;
  const majPerins = (v: string) => {
    onPerins(v);
    if (!calculable) return;
    const reste = Math.max(0, objectif! - Math.max(0, Math.round(Number(v) || 0)));
    onAirpoints(reste > 0 ? String(Math.ceil(reste / tauxAP)) : "0");
  };
  const majAirpoints = (v: string) => {
    onAirpoints(v);
    if (!calculable) return;
    const couvert = Math.max(0, Math.round(Number(v) || 0)) * tauxAP;
    onPerins(String(Math.max(0, objectif! - couvert)));
  };

  const lignes: { clef: "perins" | "airpoints"; v: string; set: (v: string) => void }[] =
    paiement === "airpoints" ? [{ clef: "airpoints", v: airpoints, set: onAirpoints }]
    : paiement === "mixte" ? [{ clef: "perins", v: perins, set: majPerins }, { clef: "airpoints", v: airpoints, set: majAirpoints }]
    : [{ clef: "perins", v: perins, set: onPerins }];

  // Ce qui est couvert par les deux monnaies, ramené en périns.
  const couvert = Math.max(0, Math.round(Number(perins) || 0))
    + (tauxAP > 0 ? Math.max(0, Math.round(Number(airpoints) || 0)) * tauxAP : 0);
  const manque = objectif && objectif > 0 ? objectif - couvert : 0;

  return (
    /* Il se fondait dans la colonne : même fond, même liseré que les champs
       voisins, et on passait à côté d'un champ POURTANT obligatoire. Il porte
       maintenant la couleur de l'argent, et le dit. */
    <div style={{
      border: `1px solid ${erreur ? "var(--red)" : "color-mix(in srgb, var(--gold) 42%, var(--border))"}`,
      borderRadius: 11, overflow: "hidden",
      background: "linear-gradient(180deg, color-mix(in srgb, var(--gold) 7%, var(--bg-3)), var(--bg-3))",
      boxShadow: erreur ? "0 0 0 3px color-mix(in srgb, var(--red) 18%, transparent)" : "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 12px", borderBottom: "1px dashed var(--border)",
        fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--gold)", fontWeight: 700 }}>
          Ton estimation
        </span>
        <span style={{ color: erreur ? "var(--red)" : "var(--orange)", fontWeight: 700 }}>
          {lignes.length > 1 ? "2 monnaies · obligatoire" : "obligatoire"}
        </span>
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
        {erreur
          ? <b style={{ color: "var(--red)" }}>Indique ce que tu es prêt à mettre — sans ce chiffre, personne ne sait par où commencer.</b>
          : objectif && objectif > 0
            ? (Math.abs(manque) < Math.max(1, tauxAP) // à moins d'un Airpoint près, le compte y est
                ? <span style={{ color: "var(--green)" }}>Le compte y est — {objectif.toLocaleString("fr-FR")} périns couverts.</span>
                : manque > 0
                  ? <>Tarif : <b style={{ color: "var(--gold)" }}>{objectif.toLocaleString("fr-FR")} périns</b> — il reste <b style={{ color: "var(--orange)" }}>{manque.toLocaleString("fr-FR")}</b> à couvrir{tauxAP > 0 ? ` (≈ ${Math.ceil(manque / tauxAP).toLocaleString("fr-FR")} AP)` : ""}.</>
                  : <>Tarif : <b style={{ color: "var(--gold)" }}>{objectif.toLocaleString("fr-FR")} périns</b> — tu proposes <b style={{ color: "var(--green)" }}>{Math.abs(manque).toLocaleString("fr-FR")}</b> de plus.</>)
          : lignes.length > 1
            ? "Ce que tu mets dans chaque monnaie. Le détenteur voit les deux et répond avec son prix."
            : "Ce que tu es prêt à mettre. Le détenteur répond avec le sien, et on s'accorde dans la conversation."}
      </div>
    </div>
  );
}
