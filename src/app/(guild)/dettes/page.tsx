"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

type Pay = { id: string; amount: number; note: string | null; createdAt: string };
type Debt = { id: string; type: string; amount: number; item: string | null; reason: string | null; status: string; adminNote: string | null; payments: Pay[]; createdAt: string };
type Req = { id: string; kind: string; item: string | null; quantity: number; reason: string | null; status: string; prixPublic: string | null; prixFinal: string | null; adminNote: string | null; createdAt: string };

const DEBT_STATUS: Record<string, { l: string; c: string }> = {
  REQUESTED: { l: "Demandée", c: "var(--text-muted)" }, PENDING_VALIDATION: { l: "À valider", c: "var(--gold)" },
  ACCEPTED: { l: "Acceptée", c: "var(--blue)" }, REFUSED: { l: "Refusée", c: "var(--red)" },
  REPAID: { l: "Remboursée", c: "var(--green)" }, CANCELLED: { l: "Annulée", c: "var(--text-muted)" },
};
const REQ_STATUS: Record<string, { l: string; c: string }> = {
  PENDING: { l: "En attente", c: "var(--gold)" },
  ACCEPTE_ACHAT: { l: "Achat accepté (−20 %)", c: "var(--green)" },
  ACCEPTE_DETTE: { l: "Dette accordée", c: "var(--blue)" },
  REFUSE: { l: "Refusée", c: "var(--red)" }, ANNULE: { l: "Annulée", c: "var(--text-muted)" },
};
const KINDS = [["OBJET_IG", "Objet en jeu (IG)"], ["ITEM", "Items"], ["PERINS", "Périns"]] as const;
const KIND_LABEL: Record<string, string> = { OBJET_IG: "Objet IG", ITEM: "Items", PERINS: "Périns" };
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 14 };
const fmt = (n: string | number | null) => (n == null ? "?" : Number(n).toLocaleString("fr-FR"));

export default function BanquePage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payAmt, setPayAmt] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("OBJET_IG");
  const [item, setItem] = useState(""); const [qty, setQty] = useState(1); const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([fetch("/api/bank-request"), fetch("/api/debts")]);
      if (a.ok) setReqs(await a.json());
      if (b.ok) setDebts(await b.json());
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const sendReq = async () => {
    if (kind !== "PERINS" && !item.trim()) return flash("Indique l'objet demandé.");
    const r = await fetch("/api/bank-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, item, quantity: qty, reason }) });
    if (r.ok) { setItem(""); setQty(1); setReason(""); flash("Requête envoyée ✓ — le staff va décider (achat −20 % ou dette)."); load(); }
    else { const e = await r.json().catch(() => ({} as any)); flash(e.error || `Erreur ${r.status}.`); }
  };
  const pay = async (id: string, amount: number) => {
    if (!amount || amount <= 0) return flash("Entre un montant à rembourser (> 0).");
    const r = await fetch(`/api/debts/${id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
    if (r.ok) { setPayAmt(p => ({ ...p, [id]: "" })); flash("Remboursement enregistré ✓"); load(); } else flash("Erreur");
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-banque.png" title="Banque" subtitle="Demande un objet IG, des Items ou des Périns : le staff décide d'un achat (−20 %) ou d'une dette." />

      {/* ── Faire une requête ── */}
      <div className="glass-card" style={{ padding: 18, marginBottom: 14 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}>🏦 Faire une requête</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={kind} onChange={e => setKind(e.target.value)} className="vg-select">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          {kind !== "PERINS" && <input placeholder="Objet / items demandés" value={item} onChange={e => setItem(e.target.value)} style={{ ...inp, flex: 1, minWidth: 180 }} />}
          <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} style={{ ...inp, width: 90 }} title="Quantité" />
        </div>
        <input placeholder="Raison / précisions (optionnel)" value={reason} onChange={e => setReason(e.target.value)} style={{ ...inp, width: "100%", marginTop: 10 }} />
        <button onClick={sendReq} className="vg-btn" style={{ marginTop: 12 }}>Envoyer la requête</button>
        {toast && <div style={{ marginTop: 10, fontSize: 13, color: "var(--green)" }}>{toast}</div>}
        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--text-muted)" }}>ℹ️ Sortie d'objet conditionnée au stock du coffre de guilde (AirGuild). Profil complété requis.</div>
      </div>

      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div> : (
        <>
          {/* ── Mes requêtes ── */}
          {reqs.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h2 className="font-heading" style={{ fontSize: 14, color: "var(--text)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Mes requêtes</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reqs.map(r => {
                  const st = REQ_STATUS[r.status] ?? REQ_STATUS.PENDING;
                  return (
                    <div key={r.id} className="glass-card" style={{ padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{KIND_LABEL[r.kind] ?? r.kind}</span>
                        <span className="font-heading" style={{ fontWeight: 700 }}>{r.item ?? "Périns"} {r.quantity > 1 && <span style={{ color: "var(--text-muted)" }}>×{r.quantity}</span>}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${st.c}`, color: st.c }}>{st.l}</span>
                      </div>
                      {r.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{r.reason}</div>}
                      {r.status === "ACCEPTE_ACHAT" && <div style={{ fontSize: 13, color: "var(--green)", marginTop: 5 }}>Prix : <b>{fmt(r.prixFinal)}</b> périn <span style={{ color: "var(--text-muted)" }}>(public {fmt(r.prixPublic)} −20 %)</span></div>}
                      {r.status === "ACCEPTE_DETTE" && <div style={{ fontSize: 13, color: "var(--blue)", marginTop: 5 }}>Dette de <b>{fmt(r.prixPublic)}</b> périn — voir « Mes dettes » ci-dessous.</div>}
                      {r.adminNote && <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 4 }}>Note staff : {r.adminNote}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Mes dettes ── */}
          <section>
            <h2 className="font-heading" style={{ fontSize: 14, color: "var(--text)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Mes dettes</h2>
            {debts.length === 0 ? <div className="glass-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>Aucune dette en cours. 🎉</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {debts.map(d => {
                  const st = DEBT_STATUS[d.status] ?? DEBT_STATUS.REQUESTED;
                  const paid = d.payments.reduce((s, p) => s + p.amount, 0);
                  return (
                    <div key={d.id} className="glass-card" style={{ padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="font-heading" style={{ fontWeight: 700 }}>{fmt(d.amount)} {d.type === "PENYA" ? "périn" : d.type.toLowerCase()}</span>
                        {d.item && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {d.item}</span>}
                        <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${st.c}`, color: st.c }}>{st.l}</span>
                      </div>
                      {d.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{d.reason}</div>}
                      {paid > 0 && <div style={{ fontSize: 12, color: "var(--green)", marginTop: 5 }}>Remboursé : {fmt(paid)} / {fmt(d.amount)}</div>}
                      {d.status === "ACCEPTED" && (() => { const reste = Math.max(0, d.amount - paid); return (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <input type="number" min={1} max={reste} placeholder="Montant à rembourser…" value={payAmt[d.id] ?? ""} onChange={e => setPayAmt(p => ({ ...p, [d.id]: e.target.value }))} style={{ width: 150, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 13 }} />
                          <button onClick={() => pay(d.id, Math.min(reste, Number(payAmt[d.id]) || 0))} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>💰 Rembourser</button>
                          <button onClick={() => setPayAmt(p => ({ ...p, [d.id]: String(reste) }))} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>Tout ({fmt(reste)})</button>
                        </div>
                      ); })()}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
