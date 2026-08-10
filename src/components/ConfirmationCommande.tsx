"use client";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import { DEVISES } from "@/lib/monnaies";

/**
 * RELIRE AVANT D'ENVOYER.
 *
 * Le bouton « Commander » envoyait directement. Or ce clic engage : il mobilise
 * un détenteur, ouvre une conversation, prévient le staff sur Discord — et
 * depuis qu'une seule commande peut être ouverte à la fois, il ferme aussi la
 * porte aux suivantes tant que celle-là n'est pas allée au bout. On ne fait pas
 * ça sans avoir relu.
 *
 * Le récapitulatif dit exactement ce qui part : chaque pièce avec sa quantité
 * et son prix, le total, le pseudo qui recevra le courrier, et la monnaie.
 *
 * Et il pose LA question qui évite le regret : « autre chose ? ». Sans elle, on
 * découvre l'oubli une minute trop tard, et il faut alors abandonner la
 * commande pour en refaire une — cinq minutes d'attente pour un objet oublié.
 */
export type LigneCommande = { nom: string; quantite: number; prix?: number | null; note?: string | null };

export function ConfirmationCommande({
  titre, sousTitre, lignes, perso, paiement, tauxAP = 0, envoi,
  onAjouter, onConfirmer, onAnnuler, motAction = "Confirmer la commande",
}: {
  titre: string;
  sousTitre?: string;
  lignes: LigneCommande[];
  perso: string;
  paiement: string;
  /** Cours de l'Airpoint, pour traduire le total. 0 = pas de cours annoncé. */
  tauxAP?: number;
  envoi?: boolean;
  /** Retour au catalogue, panier gardé. */
  onAjouter: () => void;
  onConfirmer: () => void;
  onAnnuler: () => void;
  motAction?: string;
}) {
  useEffect(() => {
    const t = (e: KeyboardEvent) => { if (e.key === "Escape" && !envoi) onAnnuler(); };
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [onAnnuler, envoi]);

  const chiffres = lignes.map((l) => (l.prix ?? 0) * l.quantite).filter((n) => n > 0);
  const total = chiffres.reduce((s, n) => s + n, 0);
  // « Estimé » plutôt que « Total » dès qu'une ligne n'a pas de prix : annoncer
  // un total qui n'additionne qu'une partie des pièces se lit comme le prix
  // complet, et la facture surprend.
  const partiel = chiffres.length < lignes.length;
  const ap = tauxAP > 0 && total > 0 ? Math.round(total / tauxAP) : 0;
  const nb = (n: number) => n.toLocaleString("fr-FR");
  const devise = DEVISES.find((d) => d.clef === (paiement === "airpoints" ? "airpoints" : "perins"))!;

  return createPortal(
    <div onClick={() => !envoi && onAnnuler()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", backdropFilter: "blur(3px)", zIndex: 90, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(10px,5vh,50px) 14px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="glass-card"
        style={{ width: "100%", maxWidth: 520, borderRadius: 16, background: "var(--bg-2)", border: "1px solid var(--border)", overflow: "hidden" }}>

        <div style={{ padding: "16px 18px 13px", borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(255,140,26,.08), transparent)" }}>
          <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 9 }}>
            <Icon name="receipt" size={18} style={{ color: "var(--orange)" }} />{titre}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            {sousTitre ?? "Relis avant d'envoyer : une fois partie, c'est ta commande en cours — tu ne peux pas en ouvrir une seconde tant qu'elle n'est pas remise ou abandonnée."}
          </div>
        </div>

        <div style={{ padding: "14px 18px", display: "grid", gap: 7, maxHeight: "42vh", overflowY: "auto" }}>
          {lignes.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px" }}>
              <span style={{ flex: "1 1 auto", minWidth: 0, fontSize: 13 }}>
                <b>{l.nom}</b>{l.quantite > 1 ? <span style={{ color: "var(--text-muted)" }}> × {l.quantite}</span> : null}
                {l.note ? <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>« {l.note} »</span> : null}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: l.prix ? "var(--gold)" : "var(--text-muted)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {l.prix ? nb(l.prix * l.quantite) : "à convenir"}
              </span>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 18px 14px", display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--bg-3)", border: "1px dashed var(--border)", borderRadius: 10 }}>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{partiel ? "Estimé (pièces chiffrées)" : "Total estimé"}</span>
            <b style={{ fontSize: 15, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
              {total > 0 ? <>{nb(total)} périns{ap >= 1 ? <span style={{ fontWeight: 400, fontSize: 12.5, color: "var(--text-muted)" }}> · ≈ {nb(ap)} AP</span> : null}</> : "à convenir dans le fil"}
            </b>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 11px" }}>
              <Icon name="user" size={13} />Livré à <b style={{ color: "var(--text)" }}>{perso || "—"}</b>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 11px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={devise.icone} alt="" style={{ width: 14, height: 14 }} />
              {paiement === "mixte" ? "Périns + Airpoints" : devise.label}
            </span>
          </div>
        </div>

        <div style={{ padding: "12px 18px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
          <button onClick={onAjouter} disabled={envoi}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", borderRadius: 9, border: "1px solid var(--orange)", background: "rgba(255,140,26,.1)", color: "var(--orange)", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
            <Icon name="plus" size={14} />Ajouter autre chose
          </button>
          <span style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button onClick={onAnnuler} disabled={envoi}
              style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Annuler</button>
            <button onClick={onConfirmer} disabled={envoi || !lignes.length}
              style={{ padding: "10px 17px", borderRadius: 9, border: "none", background: envoi ? "var(--bg-3)" : "var(--orange)", color: envoi ? "var(--text-muted)" : "#0A0A0C", fontWeight: 700, cursor: envoi ? "wait" : "pointer", fontSize: 13, fontFamily: "inherit" }}>
              {envoi ? "Envoi…" : motAction}
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
