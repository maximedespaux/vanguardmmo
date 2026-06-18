"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

type Boss = { id: string; name: string; zone: string | null; recommendedLevel: number | null; rewards: string | null; strategy: string | null };
type Ev = { id: string; bossId: string; boss: Boss; startAt: string; status: string; note: string | null; participants: { status: string }[] };
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 11px", color: "var(--text)", fontSize: 13 };

export default function WorldBossAdminPage() {
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  // form boss
  const [bn, setBn] = useState(""); const [bz, setBz] = useState(""); const [bl, setBl] = useState(""); const [bs, setBs] = useState(""); const [br, setBr] = useState("");
  // form event
  const [evBoss, setEvBoss] = useState(""); const [evDate, setEvDate] = useState(""); const [evNote, setEvNote] = useState("");

  const load = async () => { setLoading(true); try { const r = await fetch("/api/admin/worldboss"); if (r.ok) { const d = await r.json(); setBosses(d.bosses); setEvents(d.events); if (!evBoss && d.bosses[0]) setEvBoss(d.bosses[0].id); } } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const post = (body: any) => fetch("/api/admin/worldboss", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const createBoss = async () => { if (!bn.trim()) return; const r = await post({ action: "createBoss", name: bn, zone: bz, recommendedLevel: Number(bl) || null, strategy: bs, rewards: br }); if (r.ok) { setBn(""); setBz(""); setBl(""); setBs(""); setBr(""); load(); } };
  const createEvent = async () => { if (!evBoss || !evDate) return alert("Choisis un boss et une date."); const r = await post({ action: "createEvent", bossId: evBoss, startAt: evDate, note: evNote }); if (r.ok) { setEvDate(""); setEvNote(""); load(); } };
  const setStatus = async (id: string, status: string) => { const r = await post({ action: "setStatus", id, status }); if (r.ok) load(); };
  const del = async (id: string) => { if (!confirm("Supprimer cet événement ?")) return; const r = await post({ action: "deleteEvent", id }); if (r.ok) load(); };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 950, margin: "0 auto" }}>
      <PageHeader icon="🐉" title="World Boss — gestion" subtitle="Crée les fiches de boss et programme les événements." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}>Nouveau boss</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input placeholder="Nom" value={bn} onChange={e => setBn(e.target.value)} style={inp} />
            <input placeholder="Zone" value={bz} onChange={e => setBz(e.target.value)} style={inp} />
            <input placeholder="Niveau recommandé" value={bl} onChange={e => setBl(e.target.value)} style={inp} />
            <input placeholder="Stratégie" value={bs} onChange={e => setBs(e.target.value)} style={inp} />
            <input placeholder="Récompenses" value={br} onChange={e => setBr(e.target.value)} style={inp} />
            <button onClick={createBoss} className="vg-btn">Créer le boss</button>
          </div>
        </div>
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}>Programmer un événement</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={evBoss} onChange={e => setEvBoss(e.target.value)} className="vg-select">{bosses.length === 0 ? <option value="">— crée un boss d'abord —</option> : bosses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <input type="datetime-local" value={evDate} onChange={e => setEvDate(e.target.value)} style={inp} />
            <input placeholder="Note (optionnelle)" value={evNote} onChange={e => setEvNote(e.target.value)} style={inp} />
            <button onClick={createEvent} className="vg-btn">Programmer</button>
          </div>
        </div>
      </div>

      <div className="font-heading" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 12 }}>Événements</div>
      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div>
        : events.length === 0 ? <div className="glass-card" style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Aucun événement.</div>
        : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map(e => {
            const conf = e.participants.filter(p => p.status === "CONFIRMED").length;
            return (
              <div key={e.id} className="glass-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className="font-heading" style={{ fontWeight: 700 }}>{e.boss?.name}</span>
                <span style={{ fontSize: 13, color: "var(--orange)" }}>{new Date(e.startAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{conf} présent(s)</span>
                <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, border: "1px solid var(--border)", color: "var(--text-muted)" }}>{e.status}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={() => setStatus(e.id, "ONGOING")} style={mini("var(--green)")}>Démarrer</button>
                  <button onClick={() => setStatus(e.id, "DONE")} style={mini("var(--blue)")}>Terminer</button>
                  <button onClick={() => setStatus(e.id, "CANCELLED")} style={mini("var(--gold)")}>Annuler</button>
                  <button onClick={() => del(e.id)} style={mini("var(--red)")}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function mini(c: string): React.CSSProperties { return { padding: "5px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12, border: `1px solid ${c}`, background: "transparent", color: c }; }
