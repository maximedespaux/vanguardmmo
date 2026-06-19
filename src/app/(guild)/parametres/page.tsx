"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";

const ROLE_META: Record<string, { label: string; color: string; badge: string; emoji: string }> = {
  DIRECTION: { label: "Direction", color: "var(--red)", badge: "fondateur", emoji: "🛡️" },
  VANGUARD: { label: "Vanguard", color: "var(--gold)", badge: "fondateur", emoji: "👑" },
  GENERAL: { label: "Général", color: "var(--orange)", badge: "brasdroit", emoji: "🧭" },
  OFFICIER: { label: "Officier", color: "var(--orange)", badge: "brasdroit", emoji: "🔥" },
  VETERAN: { label: "Vétéran", color: "var(--blue)", badge: "guilde", emoji: "📋" },
  GUARD: { label: "Guard", color: "var(--blue)", badge: "guilde", emoji: "⚔️" },
  RECRUE: { label: "Recrue", color: "var(--text-muted)", badge: "public", emoji: "🌱" },
};

export default function ParametresPage() {
  const { data: session } = useSession();
  const u = session?.user as any;
  const [compact, setCompact] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setCompact(localStorage.getItem("vanguard_compact") === "1");
    setReduceMotion(localStorage.getItem("vanguard_reduce_motion") === "1");
  }, []);
  const setPref = (key: string, v: boolean, set: (b: boolean) => void) => { set(v); localStorage.setItem(key, v ? "1" : "0"); };

  const dev = !u?.discordId;
  const r = ROLE_META[u?.role as string] ?? (dev ? ROLE_META.DIRECTION : ROLE_META.RECRUE);

  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!on)} aria-pressed={on} style={{ width: 48, height: 27, borderRadius: 14, border: "none", cursor: "pointer", flexShrink: 0, background: on ? "linear-gradient(90deg,#FFB552,#FF8C1A)" : "var(--bg-4)", boxShadow: on ? "0 0 12px rgba(255,140,26,.45)" : "none", position: "relative", transition: "background .18s, box-shadow .18s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 24 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.4)", transition: "left .18s" }} />
    </button>
  );

  const prefRow = (icon: string, title: string, desc: string, on: boolean, onChange: (v: boolean) => void) => (
    <div className="set-row" style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", borderRadius: 11, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
      <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{desc}</div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-parametres.png" icon="⚙️" title="Paramètres" subtitle="Ton compte et tes préférences d'affichage." />

      {/* Carte profil */}
      <div className="glass-card" style={{ padding: 0, marginBottom: 16, overflow: "hidden", borderLeft: `3px solid ${r.color}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 22px", flexWrap: "wrap", background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 10%, transparent), transparent 60%)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/assets/site/ranks/${r.badge}.png`} alt={r.label} style={{ width: 62, height: 62, objectFit: "contain", flexShrink: 0, filter: `drop-shadow(0 0 9px color-mix(in srgb, ${r.color} 55%, transparent))` }} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="font-heading" style={{ fontSize: 21, fontWeight: 700 }}>{u?.name ?? u?.discordName ?? "Maxime (dev)"}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 40%, transparent)`, borderRadius: 20, padding: "3px 12px", textTransform: "uppercase", letterSpacing: 0.6 }}>{r.emoji} {r.label}</span>
              {dev && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 11px" }}>mode développement local</span>}
            </div>
          </div>
        </div>
        {u?.discordId && (
          <div style={{ padding: "0 22px 16px", fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center" }}>
            <span>Discord ID</span><span style={{ fontFamily: "monospace", color: "var(--text)", background: "var(--bg-3)", borderRadius: 6, padding: "2px 8px" }}>{u.discordId}</span>
          </div>
        )}
      </div>

      {/* Préférences d'affichage */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 14 }}>🎨 Affichage</div>
        <div style={{ display: "grid", gap: 10 }}>
          {prefRow("📐", "Mode compact", "Réduit les espacements pour voir plus d'infos à l'écran", compact, (v) => setPref("vanguard_compact", v, setCompact))}
          {prefRow("✨", "Réduire les animations", "Coupe les transitions et effets de mouvement", reduceMotion, (v) => setPref("vanguard_reduce_motion", v, setReduceMotion))}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>ℹ️ Ces préférences sont enregistrées sur cet appareil.</p>
      </div>

      {u?.discordId && (
        <button onClick={() => signOut()} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--red)", cursor: "pointer", fontWeight: 600, transition: "border-color .15s, background .15s" }} className="set-logout">⏻ Se déconnecter</button>
      )}

      <style>{`
        .set-row{transition:border-color .15s, transform .12s}
        .set-row:hover{border-color:color-mix(in srgb, var(--orange) 45%, transparent)}
        .set-logout:hover{border-color:var(--red);background:rgba(248,113,113,.08)}
      `}</style>
    </div>
  );
}
