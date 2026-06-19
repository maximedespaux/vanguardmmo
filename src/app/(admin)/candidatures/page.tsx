"use client";
import { useEffect, useState } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { PageHeader } from "@/components/PageHeader";
import { vgPrompt, vgToast } from "@/components/Dialogs";

type App = {
  id: string; discordId: string; username: string; avatar: string | null;
  chars: { name: string; cls: string; prestige: number }[] | null;
  specs: string[]; csChars: number | null; favClasses: string[];
  interests: string | null; motivation: string | null; experience: string | null;
  quizScore: number | null; quizTotal: number | null;
  status: string; adminNote: string | null; decidedBy: string | null; createdAt: string;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "En attente",  color: "var(--gold)" },
  ACCEPTED:  { label: "Acceptée",    color: "var(--green)" },
  REJECTED:  { label: "Refusée",     color: "var(--red)" },
  WAITING:   { label: "Mise en attente", color: "var(--blue)" },
  INTERVIEW: { label: "Entretien",   color: "var(--purple)" },
};
const SPEC_LABELS: Record<string, string> = { PVE: "🌾 PvE", PVP: "🏆 PvP & Boss", CS: "🗝️ CS" };
const FILTERS = [["", "Toutes"], ["PENDING", "En attente"], ["ACCEPTED", "Acceptées"], ["REJECTED", "Refusées"], ["WAITING", "En attente (mise)"], ["INTERVIEW", "Entretien"]] as const;

export default function CandidaturesAdminPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`/api/admin/candidatures${filter ? `?status=${filter}` : ""}`); if (r.ok) setApps(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const decide = async (id: string, status: string) => {
    const note = (await vgPrompt("Note admin (optionnelle) ?")) ?? undefined;
    const r = await fetch("/api/admin/candidatures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, note }) });
    if (r.ok) load(); else vgToast("Erreur", false);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-candidature.png" icon="📋" title="Candidatures" subtitle="Examine et décide des candidatures reçues." />

      <div className="vg-subtabs">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`vg-subtab ${filter === k ? "active" : ""}`}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div>
        : apps.length === 0 ? <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Aucune candidature ici.</div>
        : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {apps.map((a) => {
            const sm = STATUS_META[a.status] ?? STATUS_META.PENDING;
            return (
              <div key={a.id} className="glass-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div className="font-heading" style={{ fontSize: 17, fontWeight: 700 }}>{a.username}</div>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--bg-3)", border: `1px solid ${sm.color}`, color: sm.color }}>{sm.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{new Date(a.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {(a.chars ?? []).map((c, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "4px 10px", background: "var(--bg-3)", borderRadius: 8 }}>
                      <ClassLogo name={c.cls} size={18} /> {c.name} <span style={{ color: "var(--text-muted)" }}>P{c.prestige}</span>
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div><b style={{ color: "var(--text)" }}>Spés :</b> {(a.specs ?? []).map((s) => SPEC_LABELS[s] ?? s).join(" · ") || "—"}{a.specs?.includes("CS") && a.favClasses?.length ? ` · CS: ${a.csChars ?? "?"} perso(s), ${a.favClasses.join(", ")}` : ""}</div>
                  <div><b style={{ color: "var(--text)" }}>Quiz :</b> {a.quizScore ?? "?"}/{a.quizTotal ?? "?"}</div>
                  {a.interests && <div><b style={{ color: "var(--text)" }}>Intérêts :</b> {a.interests}</div>}
                  {a.motivation && <div><b style={{ color: "var(--text)" }}>Motivation :</b> {a.motivation}</div>}
                  {a.experience && <div><b style={{ color: "var(--text)" }}>Expérience :</b> {a.experience}</div>}
                  {a.adminNote && <div style={{ color: "var(--gold)" }}><b>Note admin :</b> {a.adminNote}{a.decidedBy ? ` — ${a.decidedBy}` : ""}</div>}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  <button onClick={() => decide(a.id, "ACCEPTED")} style={btn("var(--green)")}>✅ Accepter</button>
                  <button onClick={() => decide(a.id, "REJECTED")} style={btn("var(--red)")}>❌ Refuser</button>
                  <button onClick={() => decide(a.id, "WAITING")} style={btn("var(--blue)")}>⏸️ En attente</button>
                  <button onClick={() => decide(a.id, "INTERVIEW")} style={btn("var(--purple)")}>💬 Entretien</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return { padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${color}`, background: "transparent", color };
}
