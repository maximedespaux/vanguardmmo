"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";

type Ev = { id: string; name: string; day: string; time: string; remindBefore: number; channelId: string | null; mention: string; embedTitle: string | null; embedDesc: string | null; embedColor: string | null; embedImage: string | null; enabled: boolean };
const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "tous"];
const MENTIONS: [string, string][] = [["", "Aucun ping"], ["@here", "@here"], ["@everyone", "@everyone"]];

const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 11px", color: "var(--text)", fontSize: 13.5 };
const lab: React.CSSProperties = { fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function EventsPage() {
  const [list, setList] = useState<Ev[]>([]);
  const [f, setF] = useState({ name: "", day: "mercredi", time: "21:00", remindBefore: 15, channelId: "", mention: "", embedTitle: "", embedDesc: "", embedColor: "", embedImage: "" });
  const [toast, setToast] = useState("");

  const load = () => fetch("/api/admin/events").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  const add = async () => {
    if (!f.name.trim()) return flash("Donne un nom à l'événement.");
    const r = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (r.ok) { setF({ ...f, name: "", embedTitle: "", embedDesc: "", embedImage: "" }); load(); flash("Événement ajouté ✓"); } else flash("Erreur");
  };
  const toggle = async (e: Ev) => { await fetch("/api/admin/events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, enabled: !e.enabled }) }); load(); };
  const del = async (id: string) => { await fetch("/api/admin/events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="📅" title="Événements du jeu" subtitle="Le bot annonce ces événements et envoie les rappels automatiquement. Modifie-les ici — pas besoin de toucher au code." />
      {toast && <div style={{ marginBottom: 14, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      {/* Ajouter */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}>➕ Nouvel événement</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, alignItems: "end" }}>
          <div style={{ gridColumn: "span 2" }}><label style={lab}>Nom</label><input style={{ ...inp, width: "100%" }} placeholder="Ex : Chambres Secrètes" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label style={lab}>Jour</label><VgSelect full value={f.day} onChange={v => setF({ ...f, day: v })} options={DAYS.map((d) => ({ value: d, label: d === "tous" ? "Tous les jours" : cap(d) }))} /></div>
          <div><label style={lab}>Heure</label><input style={{ ...inp, width: "100%" }} type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          <div><label style={lab}>Rappel (min avant)</label><input style={{ ...inp, width: "100%" }} type="number" min={0} value={f.remindBefore} onChange={(e) => setF({ ...f, remindBefore: Math.max(0, Number(e.target.value) || 0) })} /></div>
          <div><label style={lab}>Ping</label><VgSelect full value={f.mention} onChange={v => setF({ ...f, mention: v })} options={MENTIONS.map(([v, l]) => ({ value: v, label: l }))} /></div>
          <div style={{ gridColumn: "span 2" }}><label style={lab}>Salon (ID — vide = salon d'annonces par défaut)</label><input style={{ ...inp, width: "100%" }} placeholder="optionnel" value={f.channelId} onChange={(e) => setF({ ...f, channelId: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed var(--border)", paddingTop: 4, marginTop: 2 }}><span style={{ fontSize: 10.5, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1 }}>🎨 Embed (optionnel)</span></div>
          <div style={{ gridColumn: "span 2" }}><label style={lab}>Titre de l&apos;embed</label><input style={{ ...inp, width: "100%" }} placeholder={`vide = 🔔 ${f.name || "Nom de l'événement"}`} value={f.embedTitle} onChange={(e) => setF({ ...f, embedTitle: e.target.value })} /></div>
          <div><label style={lab}>Couleur</label><input type="color" style={{ ...inp, width: "100%", height: 38, padding: 3, cursor: "pointer" }} value={f.embedColor || "#ff8c1a"} onChange={(e) => setF({ ...f, embedColor: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lab}>Description</label><textarea style={{ ...inp, width: "100%", resize: "vertical", minHeight: 52, fontFamily: "inherit", boxSizing: "border-box" }} placeholder="Texte de l'embed. Le « commence dans X min » est ajouté automatiquement." value={f.embedDesc} onChange={(e) => setF({ ...f, embedDesc: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lab}>Image (URL)</label><input style={{ ...inp, width: "100%" }} placeholder="https://…" value={f.embedImage} onChange={(e) => setF({ ...f, embedImage: e.target.value })} /></div>
        </div>
        <button className="vg-btn" style={{ marginTop: 14 }} onClick={add}>Ajouter l&apos;événement</button>
      </div>

      {/* Liste */}
      {list.length === 0 ? (
        <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Aucun événement configuré. Ajoute-en un ci-dessus.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((e) => (
            <div key={e.id} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", opacity: e.enabled ? 1 : 0.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-heading" style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {e.day === "tous" ? "Tous les jours" : cap(e.day)} à {e.time}
                  {e.remindBefore > 0 ? ` · rappel ${e.remindBefore} min avant` : ""}
                  {e.mention ? ` · ${e.mention}` : ""}
                  {e.channelId ? ` · salon ${e.channelId}` : ""}
                </div>
              </div>
              <button onClick={() => toggle(e)} style={{ ...inp, cursor: "pointer", fontSize: 12, color: e.enabled ? "var(--green)" : "var(--text-muted)", borderColor: e.enabled ? "var(--green)" : "var(--border)" }}>{e.enabled ? "● Actif" : "○ Inactif"}</button>
              <button onClick={() => del(e.id)} title="Supprimer" style={{ ...inp, cursor: "pointer", color: "var(--red)", borderColor: "var(--border)" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
