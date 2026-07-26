"use client";
import { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { enRetard, joursDeRetard, resteDette, totauxDettes } from "@/lib/dettes";
import { vgPrompt } from "@/components/Dialogs";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

// creditor et dueDate etaient deja renvoyes par l'API (un `include` Prisma ne
// restreint pas les champs scalaires) — ils manquaient juste au type.
type Debt = { id: string; type: string; amount: number; item: string | null; reason: string | null; status: string; adminNote: string | null; decidedBy: string | null; createdAt: string; creditor: string | null; dueDate: string | null; user: { username: string }; payments: { amount: number }[] };
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
  // Halo curseur + relief sur les panneaux (.fx-card), cf. VgFx.
  useCardFx();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [cautions, setCautions] = useState<Record<string, string>>({});
  const [debts, setDebts] = useState<Debt[]>([]);
  // Toutes les dettes, sans filtre de statut : les totaux par detenteur n'ont de
  // sens que sur l'ensemble, pas sur l'onglet affiche.
  const [toutes, setToutes] = useState<Debt[]>([]);
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
  useEffect(() => { fetch("/api/admin/debts").then(r => (r.ok ? r.json() : [])).then(setToutes).catch(() => {}); }, [filter]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const decideReq = async (id: string, action: "achat" | "dette" | "refuse") => {
    const prixPublic = action === "refuse" ? undefined : (Number(prices[id] || 0) || undefined); // vide = prix auto (palier fixé au dépôt)
    const caution = action === "dette" ? (Number(cautions[id] || 0) || undefined) : undefined;
    const adminNote = action === "refuse" ? ((await vgPrompt("Raison du refus ? (optionnel)")) ?? undefined) : undefined;
    const r = await fetch(`/api/admin/bank-request/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, prixPublic, caution, adminNote }) });
    if (r.ok) { flash(action === "achat" ? "Achat accepté" : action === "dette" ? "Dette accordée" : "Requête refusée."); load(); }
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
      <PageHeader banner="/assets/site/banners/banner-banque.webp" title="Suivi des dettes" subtitle="Traite les requêtes (achat ou dette) et valide les remboursements." />
      {toast && <div style={{ marginBottom: 14, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      {/* Chiffres en tete, comme au tableau de bord : on doit savoir d'un coup
          d'oeil s'il y a un retard ou une validation en attente, sans lire la
          liste. Calcules sur TOUTES les dettes (`toutes`), pas sur l'onglet
          affiche — sinon le total dependrait du filtre ouvert. */}
      {(() => {
        const t = totauxDettes(toutes);
        const aValider = toutes.filter((d) => d.status === "PENDING_VALIDATION").length;
        const Tuile = ({ v, l, c, alerte }: { v: React.ReactNode; l: string; c: string; alerte?: boolean }) => (
          <div className="glass-card fx-card" style={{ padding: 14, textAlign: "center", ...(alerte ? { borderColor: c } : null) }}>
            <div className="font-heading" style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: .5 }}>{l}</div>
          </div>
        );
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
            <Tuile v={t.nb} l="dettes en cours" c={t.nb ? "var(--gold)" : "var(--green)"} />
            <Tuile v={fmt(t.reste)} l="périns à rembourser" c="var(--orange)" />
            <Tuile v={fmt(t.paye)} l="déjà remboursé" c="var(--green)" />
            <Tuile v={t.enRetard} l="en retard" c={t.enRetard ? "var(--red)" : "var(--green)"} alerte={t.enRetard > 0} />
            <Tuile v={aValider} l="à valider" c={aValider ? "var(--gold)" : "var(--green)"} alerte={aValider > 0} />
          </div>
        );
      })()}

      {/* ── Requêtes à traiter ── */}
      <h2 className="font-heading" style={{ fontSize: 14, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Requêtes à traiter {reqs.length > 0 && <span style={{ color: "var(--gold)" }}>· {reqs.length}</span>}</h2>
      {reqs.length === 0 ? <div className="glass-card fx-card" style={{ padding: 18, textAlign: "center", color: "var(--text-muted)", marginBottom: 24 }}>Aucune requête en attente.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {reqs.map(r => (
            <div key={r.id} className="glass-card fx-card" style={{ padding: 16 }}>
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
      {/* ── Suivi par detenteur ──────────────────────────────────────────
          Qui a prete quoi, ce qui est rentre, ce qui traine. Le detenteur est
          responsable du suivi : sans cette vue, le staff devait ouvrir chaque
          dette une par une pour savoir ou en etait un preteur. */}
      {(() => {
        const parDetenteur = new Map<string, Debt[]>();
        for (const d of toutes) {
          const cle = (d.creditor || "Guilde").trim() || "Guilde";
          const l = parDetenteur.get(cle) ?? []; l.push(d); parDetenteur.set(cle, l);
        }
        const lignes = [...parDetenteur.entries()]
          .map(([nom, list]) => ({ nom, t: totauxDettes(list) }))
          .filter(x => x.t.nb > 0)
          .sort((a, b) => b.t.reste - a.t.reste || b.t.enRetard - a.t.enRetard);
        if (!lignes.length) return null;
        const g = totauxDettes(toutes);
        return (
          <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <h2 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "var(--orange)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="coins" size={16} />Suivi par détenteur
              </h2>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                {g.nb} dette{g.nb > 1 ? "s" : ""} en cours · <b style={{ color: "var(--gold)" }}>{fmt(g.reste)}</b> à rembourser
                {g.enRetard > 0 && <> · <b style={{ color: "var(--red)" }}>{g.enRetard} en retard</b></>}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: .6 }}>
                    <th style={{ padding: "6px 8px" }}>Détenteur</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Dettes</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Prêté</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Reçu</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Restant</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Retards</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(({ nom, t }) => (
                    <tr key={nom} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{nom}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "var(--text-muted)" }}>{t.nb}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{fmt(t.du)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "var(--green)" }}>{fmt(t.paye)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "var(--gold)", fontWeight: 700 }}>{fmt(t.reste)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: t.enRetard ? "var(--red)" : "var(--text-muted)", fontWeight: t.enRetard ? 700 : 400 }}>{t.enRetard || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div>
        : debts.length === 0 ? <div className="glass-card fx-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>Rien ici.</div>
        : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {debts.map(d => {
            const st = STATUS[d.status] ?? STATUS.REQUESTED;
            const paid = d.payments.reduce((s, p) => s + p.amount, 0);
            const retard = enRetard(d);
            return (
              <div key={d.id} className="glass-card fx-card" style={{ padding: 16, ...(retard ? { borderColor: "var(--red)" } : null) }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="font-heading" style={{ fontWeight: 700 }}>{d.user?.username ?? "?"}</span>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>{fmt(d.amount)} {d.type === "PENYA" ? "périn" : d.type.toLowerCase()}{d.item ? ` (${d.item})` : ""}</span>
                  {d.creditor && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>→ détenu par <b style={{ color: "var(--text)" }}>{d.creditor}</b></span>}
                  {retard && (
                    <span title={`Échéance du ${new Date(d.dueDate!).toLocaleDateString("fr-FR")} dépassée · reste ${fmt(resteDette(d))}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--red)", background: "rgba(248,113,113,.12)", color: "var(--red)" }}>
                      <Icon name="alert" size={12} />Retard {joursDeRetard(d)} j
                    </span>
                  )}
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
