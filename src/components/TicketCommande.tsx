"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * LE TICKET DE COMMANDE — la preuve que c'est parti.
 *
 * Après l'envoi, la boutique affichait une phrase : « 2 pièce(s) commandée(s) ».
 * On ne savait pas ce qui était parti, ni pour combien, ni à quel nom, et il
 * fallait la croire. Un ticket répond à tout ça d'un coup d'œil, et il se garde :
 * la référence est ce qu'on cite dans la conversation avec le détenteur.
 *
 * Ce n'est pas un reçu de paiement. Le site ne déplace pas de périns : le montant
 * est ce que le membre a ESTIMÉ, le versement se règle en jeu. Le ticket le dit,
 * sinon il ferait croire à une transaction qui n'a pas eu lieu.
 */

export type LigneTicket = { nom: string; quantite: number; perins: number };

/** Le code-barres est décoratif — il donne au bloc sa forme de ticket. La
 *  référence lisible est écrite dessous, et c'est elle qui sert. Tiré de la
 *  référence elle-même pour que le même ticket dessine toujours le même code. */
function CodeBarres({ reference }: { reference: string }) {
  const graine = [...reference].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const alea = (n: number) => { const x = Math.sin(graine + n) * 10000; return x - Math.floor(x); };
  const barres = Array.from({ length: 52 }, (_, i) => (alea(i) > 0.68 ? 2.5 : 1.4));
  const espace = 1.6;
  const largeur = barres.reduce((s, b) => s + b + espace, 0) - espace;
  let x = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
      <svg width="100%" height="52" viewBox={`0 0 ${largeur} 52`} preserveAspectRatio="none" aria-hidden="true" style={{ maxWidth: 260 }}>
        {barres.map((b, i) => { const cx = x; x += b + espace; return <rect key={i} x={cx} y="0" width={b} height="52" fill="var(--text)" opacity={0.82} />; })}
      </svg>
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, letterSpacing: ".22em", color: "var(--text-muted)" }}>{reference}</span>
    </div>
  );
}

/** Confettis, en couleurs de la guilde. Coupés si le système demande moins
 *  d'animations — une pluie de confettis est exactement ce qu'on ne veut pas
 *  imposer à quelqu'un qui a réglé ça. */
function Confettis() {
  const [actif, setActif] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setActif(true);
    const t = setTimeout(() => setActif(false), 5200);
    return () => clearTimeout(t);
  }, []);
  if (!actif) return null;
  const couleurs = ["var(--orange)", "var(--gold)", "var(--green)", "var(--blue)", "var(--purple)"];
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
      <style>{`@keyframes vgtomber{0%{transform:translateY(-12vh) rotate(0);opacity:1}100%{transform:translateY(108vh) rotate(680deg);opacity:0}}`}</style>
      {Array.from({ length: 64 }, (_, i) => (
        <span key={i} style={{
          position: "absolute", left: `${(i * 37) % 100}%`, top: "-6%", width: 6, height: 12, borderRadius: 1,
          background: couleurs[i % couleurs.length],
          animation: `vgtomber ${2.6 + ((i * 7) % 22) / 10}s ${((i * 13) % 18) / 10}s linear forwards`,
        }} />
      ))}
    </div>
  );
}

const Pointilles = () => <div aria-hidden="true" style={{ borderTop: "2px dashed var(--border)", margin: "16px 0" }} />;

export function TicketCommande({
  reference, lignes, perins, airpoints = 0, personnage, paiement, date, onFermer,
}: {
  reference: string;
  lignes: LigneTicket[];
  perins: number;
  airpoints?: number;
  personnage: string;
  paiement: "perins" | "troc" | string;
  date: Date;
  onFermer: () => void;
}) {
  const [monte, setMonte] = useState(false);
  useEffect(() => {
    setMonte(true);
    const onEchap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", onEchap);
    return () => document.removeEventListener("keydown", onEchap);
  }, [onFermer]);
  if (!monte) return null;

  const nb = lignes.reduce((s, l) => s + l.quantite, 0);
  const quand = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);

  return createPortal(
    <>
      <Confettis />
      <div role="dialog" aria-modal="true" aria-label="Commande envoyée" onClick={onFermer}
        style={{ position: "fixed", inset: 0, zIndex: 2, background: "rgba(5,5,7,.72)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, overflowY: "auto" }}>
        <style>{`
          @keyframes vgticket{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
          @keyframes vgcoche{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:none}}
          @media (prefers-reduced-motion: reduce){.vg-ticket,.vg-ticket-coche{animation:none!important}}
        `}</style>
        <div className="vg-ticket" onClick={(e) => e.stopPropagation()}
          style={{ position: "relative", width: "100%", maxWidth: 380, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 18, boxShadow: "0 24px 60px rgba(0,0,0,.6)", animation: "vgticket .34s cubic-bezier(.16,1,.3,1)" }}>
          {/* Les deux encoches qui font le ticket. Elles prennent la couleur du fond
              de page, donc elles « percent » la carte au lieu d'être des pastilles. */}
          <div aria-hidden="true" style={{ position: "absolute", left: -11, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)" }} />
          <div aria-hidden="true" style={{ position: "absolute", right: -11, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--border)" }} />

          <div style={{ padding: "26px 24px 6px", textAlign: "center" }}>
            <div className="vg-ticket-coche" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: "50%", background: "color-mix(in srgb, var(--green) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 40%, transparent)", color: "var(--green)", animation: "vgcoche .4s .18s backwards cubic-bezier(.16,1,.3,1)" }}>
              <Icon name="check" size={28} />
            </div>
            <div className="font-heading" style={{ fontSize: 20, fontWeight: 700, marginTop: 13 }}>C&apos;est parti</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
              {nb} objet{nb > 1 ? "s" : ""} commandé{nb > 1 ? "s" : ""}. Un détenteur va se proposer, et la conversation s&apos;ouvre dans tes demandes.
            </div>
          </div>

          <div style={{ padding: "0 24px 24px" }}>
            <Pointilles />

            {/* Ce qui part, ligne par ligne : la phrase « 2 pièces » ne disait pas quoi. */}
            <div style={{ display: "grid", gap: 6 }}>
              {lignes.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nom}</span>
                  {l.quantite > 1 && <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>×{l.quantite}</span>}
                  {l.perins > 0 && <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{l.perins.toLocaleString("fr-FR")}</span>}
                </div>
              ))}
            </div>

            <Pointilles />

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--text-muted)" }}>Envoyé à</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{personnage}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--text-muted)" }}>
                  {paiement === "troc" ? "Paiement" : "Ton estimation"}
                </div>
                <div className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
                  {paiement === "troc" ? "Troc" : `${perins.toLocaleString("fr-FR")} périns`}
                </div>
                {airpoints > 0 && <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>+ {airpoints.toLocaleString("fr-FR")} Airpoints</div>}
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--text-muted)" }}>Date</div>
            <div style={{ fontSize: 12.5 }}>{quand}</div>

            {/* Le site ne déplace pas de périns : le dire ici évite de faire croire
                à une transaction qui n'a pas eu lieu. */}
            <div style={{ marginTop: 12, display: "flex", gap: 7, alignItems: "flex-start", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Ce ticket n&apos;est pas un paiement : le versement se règle en jeu avec le détenteur.</span>
            </div>

            <Pointilles />
            <CodeBarres reference={reference} />

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <a href="/messages" style={{ flex: 1, textAlign: "center", padding: "10px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 13, background: "var(--orange)", color: "#0A0A0C" }}>
                Suivre ma commande
              </a>
              <button onClick={onFermer} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
