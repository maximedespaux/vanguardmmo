"use client";
import { useState, useMemo, useEffect } from "react";
import dungeonsData from "@/data/dungeons.json";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { vgToast } from "@/components/Dialogs";

type Dungeon = { id: number; name: string; type: string; lvl: string; prestige: number | null; hp: number; armor: string | null; elem: string; cat: string; icon: string; drops: string[] };
const DG_KEY = "vanguard_donjons_daily";
const RP_KEY = "vanguard_instances_runs";
const RARITIES = [{ k: "commun", l: "Commun", c: "#9CA3AF" }, { k: "rare", l: "Rare", c: "#4EA8FF" }, { k: "epique", l: "Épique", c: "#C77DFF" }, { k: "legendaire", l: "Légendaire", c: "#FF8C1A" }, { k: "premythique", l: "Pré-Myth.", c: "#FF5C8A" }, { k: "mythique", l: "Mythique", c: "#00E5FF" }];
const BONUSES = ["Cape donjon dorée", "Fée Goldea", "Perle oubliée du farmeur", "Autres bonus"];
const isWeapon = (n: string) => /Arme|Épée|Hache|Glaive|Doloire|Poing|Sceptre|Baguette|Bâton|Arc|Arbalète|Yo-yo|Bouclier|Grimoire|Rune/.test(n);
const rarColor = (k: string | null) => RARITIES.find(r => r.k === k)?.c ?? "var(--text-muted)";
const rarLabel = (k: string | null) => RARITIES.find(r => r.k === k)?.l ?? "";
function todayKey() { return new Date().toISOString().slice(0, 10); }
function frDay(d: string) { return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }); }

type Received = Record<number, { qty: number; rarity: string | null; trash: boolean }>;
type LootItem = { name: string; qty: number; rarity: string | null; trash: boolean };
type Run = { dungeonId: number; dungeonName: string; icon: string; date: string; items: LootItem[] };

export default function DonjonsPage() {
  const dungeons = dungeonsData as Dungeon[];
  const [tab, setTab] = useState<"suivi" | "rapport" | "wiki">("wiki");

  // ── Suivi quotidien ──
  const [logs, setLogs] = useState<Record<string, Record<string, number>>>({});
  const [day, setDay] = useState(todayKey());
  useEffect(() => { try { const r = localStorage.getItem(DG_KEY); if (r) setLogs(JSON.parse(r)); } catch {} }, []);
  useEffect(() => { if (Object.keys(logs).length) try { localStorage.setItem(DG_KEY, JSON.stringify(logs)); } catch {} }, [logs]);
  const inc = (id: number, d: number) => setLogs(l => { const day0 = { ...(l[day] || {}) }; day0[id] = Math.max(0, (day0[id] || 0) + d); return { ...l, [day]: day0 }; });
  const dayTotal = (k: string) => Object.values(logs[k] || {}).reduce((s, n) => s + n, 0);
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10); }).reverse();
  const maxDay = Math.max(1, ...last7.map(dayTotal));

  // ── Rapport d'instances ──
  const [runs, setRuns] = useState<Run[]>([]);
  const [curId, setCurId] = useState<number | "">("");
  const [received, setReceived] = useState<Received>({});
  const [bonuses, setBonuses] = useState<Record<string, boolean>>({});
  const [rView, setRView] = useState<"donjon" | "jour" | "mois">("donjon");
  useEffect(() => { try { const r = localStorage.getItem(RP_KEY); if (r) setRuns(JSON.parse(r)); } catch {} }, []);
  useEffect(() => { if (runs.length) try { localStorage.setItem(RP_KEY, JSON.stringify(runs)); } catch {} }, [runs]);
  const cur = dungeons.find(d => d.id === curId);
  const toggleDrop = (i: number) => setReceived(r => { const n = { ...r }; if (n[i]) delete n[i]; else n[i] = { qty: 1, rarity: null, trash: false }; return n; });
  const logRun = () => {
    if (!cur || !Object.keys(received).length) { vgToast("Sélectionne au moins un objet reçu.", false); return; }
    const items = Object.entries(received).map(([i, v]) => ({ name: cur.drops[+i], ...v }));
    setRuns([...runs, { dungeonId: cur.id, dungeonName: cur.name, icon: cur.icon, date: new Date().toISOString(), items }]);
    setReceived({}); setBonuses({}); setCurId("");
  };
  const byDungeon = useMemo(() => {
    const map: Record<number, { name: string; icon: string; runs: number; items: number; loot: Record<string, { qty: number; rarity: string | null; trash: boolean }> }> = {};
    runs.forEach(r => { if (!map[r.dungeonId]) map[r.dungeonId] = { name: r.dungeonName, icon: r.icon, runs: 0, items: 0, loot: {} }; map[r.dungeonId].runs++; r.items.forEach(it => { map[r.dungeonId].items += it.qty; const key = it.name + (it.rarity ? `|${it.rarity}` : "") + (it.trash ? "|trash" : ""); if (!map[r.dungeonId].loot[key]) map[r.dungeonId].loot[key] = { qty: 0, rarity: it.rarity, trash: it.trash }; map[r.dungeonId].loot[key].qty += it.qty; }); });
    return map;
  }, [runs]);
  const rGroups: Record<string, number> = {};
  runs.forEach(r => { const d = new Date(r.date); const k = rView === "jour" ? d.toLocaleDateString("fr-FR") : rView === "mois" ? d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : `${r.icon} ${r.dungeonName}`; rGroups[k] = (rGroups[k] || 0) + r.items.reduce((s, it) => s + it.qty, 0); });
  const rMax = Math.max(1, ...Object.values(rGroups));

  // ── Wiki ──
  const [q, setQ] = useState(""); const [typeFilter, setTypeFilter] = useState<"Tous" | "SOLO" | "GROUPE">("Tous"); const [sel, setSel] = useState<Dungeon | null>(null);
  const wikiList = dungeons.filter(d => (typeFilter === "Tous" || d.type === typeFilter) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
  const TabBtn = ({ k, label }: { k: typeof tab; label: string }) => <button onClick={() => setTab(k)} className={`vg-subtab ${tab === k ? "active" : ""}`}>{label}</button>;

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-pve.png" icon="🗺️" title="Wiki des Donjons" subtitle={`Le wiki des ${dungeons.length} donjons : PV, élément, armure conseillée et drops.`} />
      <SectionTabs section="pve" />
      <div className="vg-subtabs">
        <TabBtn k="wiki" label="📖 Wiki des donjons" />
      </div>

      <div key={tab} className="vg-swap">
      {tab === "suivi" && (<>
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 16, marginBottom: 14 }}>📊 7 derniers jours</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {last7.map(dk => { const v = dayTotal(dk); return (
              <div key={dk} onClick={() => setDay(dk)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v || ""}</div>
                <div style={{ width: "100%", height: `${(v / maxDay) * 90}px`, minHeight: 3, background: dk === day ? "var(--orange)" : "var(--orange-dark)", borderRadius: 4 }} />
                <div style={{ fontSize: 9, color: dk === day ? "var(--orange)" : "var(--text-muted)" }}>{new Date(dk).toLocaleDateString("fr-FR", { weekday: "short" })}</div>
              </div>
            ); })}
          </div>
        </div>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 16, flex: 1 }}>📅 {frDay(day)}</h2>
            <input type="date" value={day} onChange={e => setDay(e.target.value)} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)" }} />
          </div>
          {dungeons.map(d => { const c = (logs[day] || {})[d.id] || 0; return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: c > 0 ? "rgba(255,140,26,0.06)" : "transparent", borderBottom: "1px solid rgba(46,46,56,0.4)" }}>
              <span style={{ fontSize: 20 }}>{d.icon}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{d.name} <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.prestige ? `P${d.prestige}` : d.type}</span></span>
              <button onClick={() => inc(d.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: "pointer" }}>−</button>
              <span className="font-heading" style={{ minWidth: 24, textAlign: "center", fontWeight: 700, color: c > 0 ? "var(--orange)" : "var(--text-muted)" }}>{c}</span>
              <button onClick={() => inc(d.id, 1)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--orange-dark)", background: "rgba(255,140,26,0.12)", color: "var(--orange)", cursor: "pointer" }}>+</button>
            </div>
          ); })}
        </div>
      </>)}

      {tab === "rapport" && (<>
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 16, marginBottom: 12 }}>1️⃣ Choisis le donjon</h2>
          <select value={curId} onChange={e => { setCurId(e.target.value ? +e.target.value : ""); setReceived({}); }} className="vg-select" style={{ width: "100%" }}>
            <option value="">— Sélectionner parmi les {dungeons.length} donjons —</option>
            {dungeons.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}{d.prestige ? ` (P${d.prestige})` : ""}</option>)}
          </select>
          {cur && <div style={{ marginTop: 14 }}><div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Bonus actifs (drop +)</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{BONUSES.map(b => { const on = bonuses[b]; return <button key={b} onClick={() => setBonuses({ ...bonuses, [b]: !on })} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, border: `1px solid ${on ? "var(--orange)" : "var(--border)"}`, background: on ? "rgba(255,140,26,0.12)" : "var(--bg-3)", color: on ? "var(--orange)" : "var(--text-muted)" }}>{b}</button>; })}</div></div>}
        </div>
        {cur && <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 16, marginBottom: 12 }}>2️⃣ Objets reçus — {cur.icon} {cur.name}</h2>
          {cur.drops.map((d, i) => { const rec = received[i]; const weap = isWeapon(d); return (
            <div key={i} style={{ background: "var(--bg-3)", borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: `3px solid ${rec ? (rec.trash ? "var(--text-muted)" : rec.rarity ? rarColor(rec.rarity) : "var(--green)") : "transparent"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => toggleDrop(i)} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, border: `1px solid ${rec ? "var(--green)" : "var(--border)"}`, background: rec ? "rgba(74,222,128,0.12)" : "var(--bg-2)", color: rec ? "var(--green)" : "var(--text)" }}>{rec ? "✓ " : ""}{d}</button>
                {rec && <input type="number" min={1} value={rec.qty} onChange={e => setReceived({ ...received, [i]: { ...rec, qty: +e.target.value || 1 } })} style={{ width: 64, padding: 5, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" }} />}
                {rec && weap && <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{RARITIES.map(r => <button key={r.k} onClick={() => setReceived({ ...received, [i]: { ...rec, rarity: r.k, trash: false } })} style={{ padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontSize: 11, border: `1px solid ${rec.rarity === r.k ? r.c : "var(--border)"}`, background: rec.rarity === r.k ? r.c + "22" : "var(--bg-2)", color: rec.rarity === r.k ? r.c : "var(--text-muted)" }}>{r.l}</button>)}<button onClick={() => setReceived({ ...received, [i]: { ...rec, trash: true, rarity: null } })} style={{ padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontSize: 11, border: `1px solid ${rec.trash ? "var(--text-muted)" : "var(--border)"}`, background: "var(--bg-2)", color: "var(--text-muted)" }}>🗑️ Trash</button></div>}
              </div>
            </div>
          ); })}
          <button onClick={logRun} style={{ marginTop: 14 }} className="vg-btn">✅ Enregistrer l'instance</button>
        </div>}
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 16, marginBottom: 12 }}>📈 Butin</h2>
          <div className="vg-subtabs">{(["donjon", "jour", "mois"] as const).map(v => <button key={v} onClick={() => setRView(v)} className={`vg-subtab ${rView === v ? "active" : ""}`}>{v === "jour" ? "Par jour" : v === "mois" ? "Par mois" : "Par donjon"}</button>)}</div>
          {Object.keys(rGroups).length ? Object.entries(rGroups).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <div style={{ width: 160, fontSize: 12, color: "var(--text-muted)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</div>
              <div style={{ flex: 1, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden", height: 22 }}><div style={{ height: "100%", background: "linear-gradient(90deg,var(--orange-dark),var(--orange))", width: `${v / rMax * 100}%`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, fontSize: 11, fontWeight: 700, color: "#000" }}>{v}</div></div>
            </div>
          )) : <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Aucune instance enregistrée.</div>}
        </div>
        <div style={card}>
          <h2 className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 16, marginBottom: 12 }}>🗂️ Récap des loots par donjon</h2>
          {Object.keys(byDungeon).length ? Object.entries(byDungeon).map(([id, d]) => (
            <div key={id} style={{ background: "var(--bg-3)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><span style={{ fontSize: 24 }}>{d.icon}</span><div className="font-heading" style={{ fontWeight: 700, fontSize: 16 }}>{d.name}</div><span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{d.runs} run(s) · {d.items} objet(s)</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{Object.entries(d.loot).map(([key, l]) => { const name = key.split("|")[0]; return <span key={key} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 6, background: "var(--bg-2)", border: `1px solid ${l.trash ? "var(--text-muted)" : l.rarity ? rarColor(l.rarity) : "var(--border)"}`, color: l.trash ? "var(--text-muted)" : l.rarity ? rarColor(l.rarity) : "var(--text)" }}>{name} <b>×{l.qty}</b>{l.rarity ? ` · ${rarLabel(l.rarity)}` : ""}{l.trash ? " · 🗑️" : ""}</span>; })}</div>
            </div>
          )) : <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Le récap par donjon apparaîtra après tes premières instances.</div>}
        </div>
      </>)}

      {tab === "wiki" && (<>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Rechercher un donjon..." style={{ flex: 1, minWidth: 180, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" }} />
          <div className="vg-subtabs" style={{ margin: 0 }}>{(["Tous", "SOLO", "GROUPE"] as const).map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`vg-subtab ${typeFilter === t ? "active" : ""}`}>{t}</button>)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
          {wikiList.map(d => (
            <div key={d.id} onClick={() => setSel(d)} style={{ ...card, padding: 16, marginBottom: 0, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><span style={{ fontSize: 26 }}>{d.icon}</span><div><div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.type} · {d.lvl}{d.prestige ? ` · P${d.prestige}` : ""}</div></div></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}>❤️ {d.hp.toLocaleString("fr-FR")}</span><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}>🌀 {d.elem}</span>{d.armor && <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}>🛡️ {d.armor}</span>}</div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>🎁 {d.drops.slice(0, 3).join(", ")}{d.drops.length > 3 ? "…" : ""}</div>
            </div>
          ))}
        </div>
        {sel && (
          <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 500, width: "100%", marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><span style={{ fontSize: 40 }}>{sel.icon}</span><div><h2 className="font-heading" style={{ fontSize: 22 }}>{sel.name}</h2><div style={{ color: "var(--text-muted)", fontSize: 13 }}>{sel.type} · Niveau {sel.lvl}{sel.prestige ? ` · Prestige ${sel.prestige}` : ""}</div></div></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12 }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>PV recommandés</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--orange)" }}>{sel.hp.toLocaleString("fr-FR")}</div></div>
                <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12 }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Élément boss</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--blue)" }}>{sel.elem}</div></div>
              </div>
              {sel.armor && <div style={{ background: "rgba(255,140,26,0.06)", border: "1px solid var(--orange-dark)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>🛡️ Armure conseillée : <b>{sel.armor}</b></div>}
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>🎁 Drops</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{sel.drops.map(d => <span key={d} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>{d}</span>)}</div>
              <button onClick={() => setSel(null)} style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }} className="font-heading">Fermer</button>
            </div>
          </div>
        )}
      </>)}
      </div>
    </div>
  );
}
