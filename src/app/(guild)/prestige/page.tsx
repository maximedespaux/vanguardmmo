"use client";
import { useState } from "react";
import { PRESTIGE_COSTS, PRESTIGE_KEYS, prestigeNeed } from "@/data/prestige";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";

const fmt = (n: number) => n.toLocaleString("fr-FR");
function emojiFor(k: string): string {
  const s = k.toLowerCase();
  if (s.includes("feu")) return "🔥";
  if (s.includes("eau")) return "💧";
  if (s.includes("foudre")) return "⚡";
  if (s.includes("vent")) return "🌪️";
  if (s.includes("terre")) return "🪨";
  if (s.includes("nucléus") || s.includes("nucleus")) return "⚪";
  if (s.includes("emblème") || s.includes("embleme")) return "🛡️";
  if (s.includes("périn") || s.includes("perin")) return "🪙";
  if (s.includes("badge")) return "🎖️";
  if (s.includes("farm")) return "🎟️";
  if (s.includes("jeton")) return "🎫";
  return "📦";
}

export default function PrestigePage() {
  const [cur, setCur] = useState(1);
  const [tgt, setTgt] = useState(10);
  const [have, setHave] = useState<Record<string, number>>({});
  const [showTable, setShowTable] = useState(false);

  const need = prestigeNeed(cur, tgt);
  const keys = PRESTIGE_KEYS.filter((k) => need[k]);
  const done = keys.filter((k) => (have[k] ?? 0) >= need[k]).length;
  const globalPct = keys.length ? Math.round((keys.reduce((s, k) => s + Math.min(1, (have[k] ?? 0) / need[k]), 0) / keys.length) * 100) : 0;

  return (
    <div style={{ padding: "24px 18px 60px", maxWidth: 1040, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-guides.png" icon="🌟" title="Calculateur de Prestige" subtitle="Choisis ton prestige actuel et ta cible : le calculateur additionne les ressources de chaque palier (données AirFlyff réelles)." />
      <SectionTabs section="guides" />

      {/* Sélecteur */}
      <div className="glass-card" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", padding: 18, marginBottom: 16 }}>
        <label style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Prestige actuel</div>
          <VgSelect full value={cur} onChange={(val) => { const v = +val; setCur(v); if (v >= tgt) setTgt(Math.min(10, v + 1)); }} options={[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => ({ value: String(p), label: `Prestige ${p}` }))} />
        </label>
        <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, color: "var(--orange)", fontSize: 22 }}>→</div>
        <label style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Prestige cible</div>
          <VgSelect full value={tgt} onChange={(v) => setTgt(+v)} options={[2, 3, 4, 5, 6, 7, 8, 9, 10].filter((p) => p > cur).map((p) => ({ value: String(p), label: `Prestige ${p}` }))} />
        </label>
      </div>

      {keys.length === 0 ? (
        <div className="glass-card" style={{ padding: 26, textAlign: "center", color: "var(--text-muted)" }}>Aucune donnée pour cet intervalle.</div>
      ) : (
        <>
          {/* Progression globale */}
          <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9, flexWrap: "wrap", gap: 6 }}>
              <span className="font-heading" style={{ fontSize: 14, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1 }}>📦 Pour passer de P{cur} à P{tgt}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{done}/{keys.length} ressources · <b style={{ color: globalPct === 100 ? "var(--green)" : "var(--orange)" }}>{globalPct}%</b></span>
            </div>
            <div style={{ height: 12, background: "var(--bg-3)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${globalPct}%`, background: globalPct === 100 ? "var(--green)" : "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .35s ease", boxShadow: "0 0 12px rgba(255,140,26,.4)" }} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>Total cumulé sur {tgt - cur} palier(s) · renseigne ce que tu as déjà pour suivre ton restant.</div>
          </div>

          {/* Grille des ressources */}
          <div className="pr-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12, marginBottom: 18 }}>
            {keys.map((k) => {
              const total = need[k]; const owned = have[k] ?? 0; const rem = Math.max(0, total - owned);
              const pct = Math.min(100, Math.round((owned / total) * 100)); const ok = rem === 0;
              return (
                <div key={k} className="pr-card" style={{ border: `1px solid ${ok ? "var(--green)" : "var(--border)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                    <span style={{ fontSize: 19 }}>{emojiFor(k)}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{k}</span>
                    {ok && <span style={{ color: "var(--green)", fontSize: 15 }}>✓</span>}
                  </div>
                  <div style={{ height: 9, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: ok ? "var(--green)" : "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .3s ease" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" min={0} value={owned || ""} onChange={(e) => setHave({ ...have, [k]: Math.max(0, +e.target.value || 0) })} placeholder="J'en ai…"
                      style={{ width: 92, padding: "6px 9px", fontSize: 12.5, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)" }} />
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>/ {fmt(total)}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: 13, color: ok ? "var(--green)" : "var(--orange)" }}>{ok ? "Complet" : `reste ${fmt(rem)}`}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Détail par palier (repliable) */}
          <button onClick={() => setShowTable((s) => !s)} className="pr-toggle">{showTable ? "▾" : "▸"} Détail par palier</button>
          {showTable && (
            <div className="glass-card" style={{ padding: 16, marginTop: 10 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 10, borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>Palier</th>
                      {PRESTIGE_KEYS.map((k) => <th key={k} style={{ padding: 8, textAlign: "right" }} title={k}>{emojiFor(k)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(PRESTIGE_COSTS).map((p) => {
                      const pn = +p; const c = PRESTIGE_COSTS[pn]; const active = pn >= cur && pn < tgt;
                      return (
                        <tr key={p} style={{ borderBottom: "1px solid rgba(46,46,56,0.4)", background: active ? "rgba(255,140,26,0.07)" : "transparent" }}>
                          <td style={{ padding: 8, fontWeight: 600, color: active ? "var(--orange)" : "var(--text)" }}>P{pn}→{pn + 1}</td>
                          {PRESTIGE_KEYS.map((k) => <td key={k} style={{ padding: 8, textAlign: "right", fontFamily: "monospace", color: c[k] ? "var(--text)" : "var(--text-muted)" }}>{c[k] ? fmt(c[k]) : "·"}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .pr-card{background:linear-gradient(180deg,#191920,#131318);border-radius:13px;padding:13px 15px;transition:transform .15s,box-shadow .15s}
        .pr-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.32)}
        .pr-card input:focus{outline:none;border-color:var(--orange)}
        .pr-toggle{background:var(--bg-3);border:1px solid var(--border);color:var(--text-muted);border-radius:9px;padding:9px 16px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:12.5px;text-transform:uppercase;letter-spacing:.6px;cursor:pointer;transition:color .15s,border-color .15s}
        .pr-toggle:hover{color:var(--orange);border-color:var(--orange)}
        @keyframes prIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .pr-grid>*{animation:prIn .4s ease both}
        .pr-grid>*:nth-child(2){animation-delay:.03s}.pr-grid>*:nth-child(3){animation-delay:.06s}.pr-grid>*:nth-child(4){animation-delay:.09s}.pr-grid>*:nth-child(5){animation-delay:.12s}.pr-grid>*:nth-child(6){animation-delay:.15s}.pr-grid>*:nth-child(7){animation-delay:.18s}.pr-grid>*:nth-child(8){animation-delay:.21s}.pr-grid>*:nth-child(9){animation-delay:.24s}
        @media(prefers-reduced-motion:reduce){.pr-grid>*{animation:none}}
      `}</style>
    </div>
  );
}
