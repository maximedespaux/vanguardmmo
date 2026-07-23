"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { vgPrompt } from "@/components/Dialogs";
import { Icon } from "@/components/Icon";

type Debt = { id: string; type: string; amount: number; item: string | null; reason: string | null; status: string; adminNote: string | null; decidedBy: string | null; createdAt: string; user: { username: string }; payments: { amount: number }[] };
type Req = { id: string; username: string; kind: string; item: string | null; quantity: number; reason: string | null; status: string; createdAt: string };

const STATUS: Record<string, { l: string; c: string }> = {
  REQUESTED: { l: "Demandée", c: "var(--text-muted)" }, PENDING_VALIDATION: { l: "À valider", c: "var(--gold)" },
  ACCEPTED: { l: "Acceptée", c: "var(--blue)" }, REFUSED: { l: "Refusée", c: "var(--red)" },
  REPAID: { l: "Remboursée", c: "var(--green)" }, CANCELLED: { l: "Annulée", c: "var(--text-muted)" },
};
const KIND_LABEL: Record<string, string> = { OBJET_IG: "Objet IG", ITEM: "Items", PERINS: "Périns" };
const FILTERS = [["", "Toutes"], ["PENDING_VALIDATION", "À valider"], ["ACCEPTED", "Acceptées"], ["REPAID", "Remboursées"], ["REFUSED", "Refusées"]] as const;
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 11px", color: "var(--text)", fontSize: 13 };
const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function BanqueAdminPage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [cautions, setCautions] = useState<Record<string, string>>({});
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filter, setFilter] = useState("PENDING_VALIDATION");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [rq, dt] = await Promise.all([
        fetch("/api/admin/bank-request?status=PENDING"),
        fetch(`/api/admin/debts${filter ? `?status=${filter}` : ""}`),
      ]);
      if (rq.ok) setReqs(await rq.json());
      if (dt.ok) setDebts(await dt.json());
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const decideReq = async (id: string, action: "achat" | "dette" | "refuse") => {
    const prixPublic = action === "refuse" ? undefined : (Number(prices[id] || 0) || undefined); // vide = prix auto (palier fixé au dépôt)
    const caution = action === "dette" ? (Number(cautions[id] || 0) || undefined) : undefined;
    const adminNote = action === "refuse" ? ((await vgPrompt("Raison du refus ? (optionnel)")) ?? undefined) : undefined;
    const r = await fetch(`/api/admin/bank-request/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, prixPublic, caution, adminNote }) });
    if (r.ok) { flash(action === "achat" ? "Achat accepté ✓" : action === "dette" ? "Dette accordée ✓" : "Requête refusée."); load(); }
    else { const e = await r.json().catch(() => ({} as any)); flash(e.error || "Erreur"); }
  };
  const decideDebt = async (id: string, status: string) => {
    const note = status === "REFUSED" ? ((await vgPrompt("Raison du refus ?")) ?? undefined) : undefined;
    const r = await fetch("/api/admin/debts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, note }) });
    if (r.ok) load(); else flash("Erreur");
  };
  const btn = (c: string): React.CSSProperties => ({ padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${c}`, background: "transparent", color: c });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 950, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-banque.png" title="Boutique — gestion" subtitle="Traite les requêtes (achat ou dette) et valide les remboursements." />
      {toast && <div style={{ marginBottom: 14, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      {/* ── Requêtes à traiter ── */}
      <h2 className="font-heading" style={{ fontSize: 14, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Requêtes à traiter {reqs.length > 0 && <span style={{ color: "var(--gold)" }}>· {reqs.length}</span>}</h2>
      {reqs.length === 0 ? <div className="glass-card" style={{ padding: 18, textAlign: "center", color: "var(--text-muted)", marginBottom: 24 }}>Aucune requête en attente.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {reqs.map(r => (
            <div key={r.id} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="font-heading" style={{ fontWeight: 700 }}>{r.username}</span>
                <span style={{ color: "var(--text-muted)" }}>·</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{KIND_LABEL[r.kind] ?? r.kind}</span>
                <span>{r.item ?? "Périns"}{r.quantity > 1 ? ` ×${r.quantity}` : ""}</span>
              </div>
              {r.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{r.reason}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
                <input placeholder="Prix — auto si vide" value={prices[r.id] ?? ""} onChange={e => setPrices(p => ({ ...p, [r.id]: e.target.value }))} style={{ ...inp, width: 150 }} title="Laisse vide pour appliquer le prix du palier fixé au dépôt (membre/public selon l'acheteur)" />
                <input placeholder="Caution (dette)" value={cautions[r.id] ?? ""} onChange={e => setCautions(p => ({ ...p, [r.id]: e.target.value }))} style={{ ...inp, width: 130 }} title="Caution rendue au retour de l'objet (pour une dette)" />
                <button onClick={() => decideReq(r.id, "achat")} style={{ ...btn("var(--green)"), display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="cart" size={15} /> Achat</button>
                <button onClick={() => decideReq(r.id, "dette")} style={{ ...btn("var(--blue)"), display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="book" size={15} /> Dette (prix public)</button>
                <button onClick={() => decideReq(r.id, "refuse")} style={{ ...btn("var(--red)"), display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="x" size={15} /> Refuser</button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>{prices[r.id] && Number(prices[r.id]) > 0 ? `Prix imposé : ${fmt(Number(prices[r.id]))} périn` : "Prix auto = palier fixé au dépôt (membre/public selon l'acheteur)"}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dettes ── */}
      <h2 className="font-heading" style={{ fontSize: 14, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Dettes</h2>
      <div className="vg-subtabs">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`vg-subtab ${filter === k ? "active" : ""}`}>{l}</button>)}
      </div>
      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div>
        : debts.length === 0 ? <div className="glass-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>Rien ici.</div>
        : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {debts.map(d => {
            const st = STATUS[d.status] ?? STATUS.REQUESTED;
            const paid = d.payments.reduce((s, p) => s + p.amount, 0);
            return (
              <div key={d.id} className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="font-heading" style={{ fontWeight: 700 }}>{d.user?.username ?? "?"}</span>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>{fmt(d.amount)} {d.type === "PENYA" ? "périn" : d.type.toLowerCase()}{d.item ? ` (${d.item})` : ""}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${st.c}`, color: st.c }}>{st.l}</span>
                </div>
                {d.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>{d.reason}</div>}
                {paid > 0 && <div style={{ fontSize: 12, color: "var(--green)", marginTop: 4 }}>Remboursé : {fmt(paid)}</div>}
                {d.adminNote && <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 4 }}>Note : {d.adminNote}{d.decidedBy ? ` — ${d.decidedBy}` : ""}</div>}
                {!["REFUSED", "REPAID", "CANCELLED"].includes(d.status) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {d.status !== "ACCEPTED" && <button onClick={() => decideDebt(d.id, "ACCEPTED")} style={{ ...btn("var(--blue)"), display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="check" size={15} /> Valider</button>}
                    <button onClick={() => decideDebt(d.id, "REFUSED")} style={{ ...btn("var(--red)"), display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="x" size={15} /> Refuser</button>
                    {d.status === "ACCEPTED" && <button onClick={() => decideDebt(d.id, "REPAID")} style={{ ...btn("var(--green)"), display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="coins" size={15} /> Remboursée</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
