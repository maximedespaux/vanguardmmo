"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

type Abs = { id: string; startDate: string; endDate: string; reason: string | null; status: string };
const ST: Record<string, { l: string; c: string }> = {
  PENDING: { l: "En attente", c: "var(--gold)" },
  ACCEPTED: { l: "Validée", c: "var(--green)" },
  APPROVED: { l: "Validée", c: "var(--green)" },
  REFUSED: { l: "Refusée", c: "var(--red)" },
  REJECTED: { l: "Refusée", c: "var(--red)" },
  ENDED: { l: "Terminée", c: "var(--text-muted)" },
};
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 14 };
const fmtD = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default function AbsencesPage() {
  const [list, setList] = useState<Abs[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => { try { const r = await fetch("/api/absences"); if (r.ok) setList(await r.json()); } catch {} };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const submit = async () => {
    if (!start || !end) return flash("Indique les dates de début et de fin.");
    if (end < start) return flash("La date de fin doit être après le début.");
    setSending(true);
    const r = await fetch("/api/absences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startDate: start, endDate: end, reason }) });
    setSending(false);
    if (r.ok) { setStart(""); setEnd(""); setReason(""); flash("Demande d'absence envoyée ✓ — le staff est prévenu."); load(); }
    else flash("Erreur — réessaie.");
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760, margin: "0 auto" }}>
      <PageHeader icon="🌙" title="Mes absences" subtitle="Préviens le staff quand tu seras absent(e) — ça évite les relances." />
      {toast && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      <div className="glass-card" style={{ padding: 18, marginBottom: 18 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}>📅 Faire une demande</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>Du<input type="date" value={start} onChange={e => setStart(e.target.value)} style={inp} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>Au<input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inp} /></label>
          <input placeholder="Raison (optionnel)" value={reason} onChange={e => setReason(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
          <button onClick={submit} disabled={sending} className="vg-btn" style={{ opacity: sending ? 0.5 : 1 }}>Envoyer</button>
        </div>
      </div>

      <h2 className="font-heading" style={{ fontSize: 14, color: "var(--text)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Mes absences</h2>
      {list.length === 0 ? <div className="glass-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>Aucune absence déclarée.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(a => { const st = ST[a.status] ?? { l: a.status, c: "var(--text-muted)" }; return (
            <div key={a.id} className="glass-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="font-heading" style={{ fontWeight: 700 }}>{fmtD(a.startDate)} → {fmtD(a.endDate)}</span>
              {a.reason && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>· {a.reason}</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${st.c}`, color: st.c }}>{st.l}</span>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}
