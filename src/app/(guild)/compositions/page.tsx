"use client";
import { useState, useEffect, useCallback } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { CS_SLOTS, GROUP_META, GROUPS, type Slot } from "./slots";

type Signup = { id: string; player: string; pseudo: string; classe: string; slotId: string | null; charId?: string; selected?: boolean };
const ADMIN_ROLES = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER"];

export default function CompositionsPage() {
  const { data: session } = useSession();
  const su = session?.user as { discordName?: string; username?: string; name?: string; role?: string } | undefined;
  const meName = su?.discordName ?? su?.username ?? session?.user?.name ?? "Moi";
  const isAdmin = (su?.role ? ADMIN_ROLES.includes(su.role) : false) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  const [tab, setTab] = useState<"cs" | "gvg">("cs");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [myChars, setMyChars] = useState<{ id: string; name: string; class: string }[]>([]);
  const [info, setInfo] = useState<Slot | null>(null);

  // Inscriptions partagées (backend commun) + actualisation automatique toutes les 15 s.
  const load = useCallback(() => {
    fetch("/api/compositions").then(r => (r.ok ? r.json() : null)).then(d => { if (d && Array.isArray(d.signups)) setSignups(d.signups); }).catch(() => {});
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => { fetch("/api/characters").then(r => (r.ok ? r.json() : [])).then(setMyChars).catch(() => {}); }, []);

  const persist = (next: Signup[]) => { setSignups(next); fetch("/api/compositions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signups: next }) }).catch(() => {}); };
  const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const removeSignup = (id: string) => persist(signups.filter(s => s.id !== id));
  const registerToSlot = (slot: Slot, char: { id: string; name: string; class: string }) => {
    if (signups.some(s => s.charId === char.id && s.slotId === slot.id)) return;
    persist([...signups, { id: Math.random().toString(36).slice(2), player: meName, pseudo: char.name, classe: slot.classe, slotId: slot.id, charId: char.id }]);
  };
  const selectSignup = (slotId: string, id: string) => persist(signups.map(s => s.slotId === slotId ? { ...s, selected: s.id === id ? !s.selected : false } : s));
  const resetAll = () => { if (window.confirm("Réinitialiser toute la composition ? Toutes les inscriptions seront effacées pour tout le monde.")) persist([]); };

  const selectedSlots = new Set(signups.filter(s => s.selected && s.slotId).map(s => s.slotId));
  const playersCount = new Set(signups.map(s => s.player.toLowerCase())).size;
  const byClass: Record<string, number> = {}; signups.forEach(s => { byClass[s.classe] = (byClass[s.classe] || 0) + 1; });
  const fillPct = Math.round((selectedSlots.size / CS_SLOTS.length) * 100);

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-chambres.png" icon="🧩" title="Compositions" subtitle="La composition optimale des Chambres Secrètes (à respecter pour la cohésion) et le Guild Siege (libre)." />
      <div className="vg-subtabs">
        <button onClick={() => setTab("cs")} className={`vg-subtab ${tab === "cs" ? "active" : ""}`}>🗝️ Chambre Secrète</button>
        <button onClick={() => setTab("gvg")} className={`vg-subtab ${tab === "gvg" ? "active" : ""}`}>⚔️ Guild Siege</button>
      </div>

      <div key={tab} className="vg-swap">
      {tab === "cs" ? (<>
        {/* Bandeau de progression */}
        <div style={{ ...card, background: "linear-gradient(135deg, rgba(255,140,26,0.08), rgba(199,125,255,0.05))", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 84, height: 84 }}>
            <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--bg-3)" strokeWidth="8" />
              <circle cx="42" cy="42" r="36" fill="none" stroke="var(--orange)" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - fillPct / 100)}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span className="font-heading" style={{ fontWeight: 700, fontSize: 20, color: "var(--orange)" }}>{fillPct}%</span></div>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22 }}>{selectedSlots.size}<span style={{ color: "var(--text-muted)", fontSize: 14 }}>/{CS_SLOTS.length}</span></div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Postes validés</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--blue)" }}>{playersCount}</div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Joueurs</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--purple)" }}>{signups.length}</div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Candidatures</div></div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} /> Partagé · live</span>
            {isAdmin && <button onClick={resetAll} style={{ fontSize: 11.5, padding: "7px 13px", borderRadius: 8, border: "1px solid var(--red)", background: "transparent", color: "var(--red)", cursor: "pointer", fontWeight: 600 }}>↺ Réinitialiser</button>}
          </div>
        </div>

        {/* Zones de composition */}
        {GROUPS.map(g => { const meta = GROUP_META[g]; const slots = CS_SLOTS.filter(s => s.group === g); const done = slots.filter(s => selectedSlots.has(s.id)).length; return (
          <div key={g} style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: `linear-gradient(90deg, ${meta.color}22, transparent)`, borderLeft: `4px solid ${meta.color}` }}>
              <span style={{ fontSize: 20 }}>{meta.icon}</span>
              <span className="font-heading" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 15 }}>{g}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: meta.color, fontWeight: 600 }}>{done}/{slots.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(235px,1fr))", gap: 12, padding: 18 }}>
              {slots.map(slot => { const taken = signups.filter(s => s.slotId === slot.id); const hasSel = taken.some(s => s.selected); const mine = myChars.filter(c => norm(c.class) === norm(slot.classe) && !taken.some(s => s.charId === c.id)); return (
                <div key={slot.id} style={{ position: "relative", background: hasSel ? `${meta.color}11` : "var(--bg-3)", borderRadius: 12, padding: 14, border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg-2)", border: `1px solid ${hasSel ? meta.color : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ClassLogo name={slot.classe} size={32} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 14 }}>{slot.label}</div><div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{slot.note}</div></div>
                    <button onClick={() => setInfo(slot)} title="Build conseillé" style={{ background: "none", border: "none", color: meta.color, cursor: "pointer", fontSize: 15, flexShrink: 0, padding: 2 }}>ℹ️</button>
                  </div>
                  {taken.length > 0 && <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid var(--border)`, display: "flex", flexDirection: "column", gap: 5 }}>
                    {taken.map(t => <div key={t.id} style={{ fontSize: 11.5, color: t.selected ? meta.color : "var(--text)", display: "flex", alignItems: "center", gap: 5, fontWeight: t.selected ? 700 : 400 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.selected ? meta.color : "var(--text-muted)", flexShrink: 0 }} />
                      {t.selected && <span title="Sélectionné" style={{ color: meta.color }}>✓</span>}
                      <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.pseudo}</b> <span style={{ color: "var(--text-muted)", fontSize: 10 }}>· {t.player}</span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                        {isAdmin && <button onClick={() => selectSignup(slot.id, t.id)} title={t.selected ? "Désélectionner" : "Sélectionner ce candidat"} style={{ background: "none", border: "none", color: t.selected ? meta.color : "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>{t.selected ? "★" : "☆"}</button>}
                        {(isAdmin || t.player === meName) && <button onClick={() => removeSignup(t.id)} title="Retirer" style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 12 }}>✕</button>}
                      </span>
                    </div>)}
                  </div>}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
                    {mine.length === 0
                      ? <div style={{ fontSize: 10.5, color: "var(--text-muted)", textAlign: "center" }}>{taken.some(s => s.charId && myChars.some(c => c.id === s.charId)) ? "Inscrit·e" : `Aucun perso ${slot.classe} dispo`}</div>
                      : <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>{mine.map(c => <button key={c.id} onClick={() => registerToSlot(slot, c)} style={{ fontSize: 10.5, padding: "4px 9px", borderRadius: 6, border: `1px solid ${meta.color}`, background: "transparent", color: meta.color, cursor: "pointer" }}>+ {c.name}</button>)}</div>}
                  </div>
                </div>
              ); })}
            </div>
          </div>
        ); })}

        <div style={card}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>👉 Clique <b style={{ color: "var(--orange)" }}>« + ton perso »</b> sur un poste de ta classe pour te porter candidat·e — <b>plusieurs personnes peuvent candidater au même poste</b>. Un responsable sélectionne ensuite le titulaire (★). Le <b>ℹ️</b> donne le build conseillé + le build de référence.</div>
          {signups.length > 0 && (<>
            <div className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 13, margin: "14px 0 8px" }}>Classes engagées</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(byClass).map(([c, n]) => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-3)", borderRadius: 7, padding: "4px 9px", fontSize: 12 }}><ClassLogo name={c} size={20} /> ×{n}</span>)}</div>
          </>)}
        </div>
      </>) : (
        <div style={{ ...card, textAlign: "center", padding: 40, background: "radial-gradient(circle at 50% 30%, rgba(255,140,26,0.08), transparent 70%)" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚔️</div>
          <h2 className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Guild Siege — Libre</h2>
          <p style={{ color: "var(--text)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>Tout le monde peut participer, il n&apos;y a pas de composition stricte. On s&apos;adapte : ramène ton meilleur perso, peu importe la classe. L&apos;essentiel c&apos;est d&apos;être présent et de jouer ensemble. 💪</p>
        </div>
      )}
      </div>

      {/* Bulle d'info : build conseillé + accès au build de référence */}
      {info && <div onClick={() => setInfo(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 460, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <ClassLogo name={info.classe} size={34} />
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 17 }}>{info.label}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{info.classe} · build conseillé</div></div>
            <button onClick={() => setInfo(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-line" }}>{info.build || "Build conseillé à venir."}</div>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`/compositions/build/${info.id}`} style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--orange)", background: "var(--orange)", color: "#0a0a0c", textDecoration: "none" }}>👁️ Voir le build de référence</a>
            {isAdmin && <a href={`/compositions/build/${info.id}?edit=1`} style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", textDecoration: "none" }}>✏️ Éditer la référence</a>}
          </div>
        </div>
      </div>}
    </div>
  );
}
