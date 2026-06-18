"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";

type Ev = { id: string; boss: { name: string; zone: string | null; recommendedLevel: number | null; strategy: string | null; rewards: string | null }; startAt: string; status: string; note: string | null; confirmed: number; declined: number; participants: string[]; myStatus: string | null };

export default function WorldBossPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { const r = await fetch("/api/worldboss"); if (r.ok) setEvents(await r.json()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const participate = async (id: string, status: string) => {
    const r = await fetch(`/api/worldboss/${id}/participate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (r.ok) load();
  };
  const fmt = (s: string) => new Date(s).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const btn = (c: string, on: boolean): React.CSSProperties => ({ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, border: `1px solid ${c}`, background: on ? c : "transparent", color: on ? "#0A0A0C" : c });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-pve.png" icon="🐉" title="World Boss" subtitle="Les prochains affrontements. Confirme ta présence pour que les officiers organisent les groupes." />
      <SectionTabs section="pve" />

      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div>
        : events.length === 0 ? <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Aucun événement prévu pour l'instant.</div>
        : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {events.map(e => (
            <div key={e.id} className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="font-heading" style={{ fontSize: 18, fontWeight: 700 }}>{e.boss.name}</span>
                {e.boss.recommendedLevel && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>niv. {e.boss.recommendedLevel}+</span>}
                {e.status === "ONGOING" && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--green)", color: "var(--green)" }}>en cours</span>}
                <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--orange)" }}>{fmt(e.startAt)}</span>
              </div>
              {e.boss.zone && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>📍 {e.boss.zone}</div>}
              {e.boss.strategy && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>🎯 {e.boss.strategy}</div>}
              {e.boss.rewards && <div style={{ fontSize: 13, color: "var(--gold)", marginTop: 4 }}>🎁 {e.boss.rewards}</div>}
              {e.note && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>📝 {e.note}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                <button onClick={() => participate(e.id, "CONFIRMED")} style={btn("var(--green)", e.myStatus === "CONFIRMED")}>✅ Présent</button>
                <button onClick={() => participate(e.id, "DECLINED")} style={btn("var(--red)", e.myStatus === "DECLINED")}>❌ Absent</button>
                <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>{e.confirmed} présent(s){e.declined ? ` · ${e.declined} absent(s)` : ""}</span>
              </div>
              {e.participants.length > 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>👥 {e.participants.join(", ")}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
