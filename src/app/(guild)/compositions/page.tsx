"use client";
import { useState, useEffect } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";

type Slot = { id: string; group: string; label: string; classe: string; note: string };
const CS_SLOTS: Slot[] = [
  { id: "p1", group: "Tanks (Primats)", label: "Primat — Tank croix", classe: "Primat", note: "Croix puis boss final (tank/dps)" },
  { id: "p2", group: "Tanks (Primats)", label: "Primat — Tank croix jumeaux", classe: "Primat", note: "Croix jumeaux → dps araignée → croix boss final" },
  { id: "d1", group: "DPS physique", label: "Cheva", classe: "Templier", note: "DPS physique" },
  { id: "d2", group: "DPS physique", label: "YJ", classe: "Sylphide", note: "DPS physique" },
  { id: "d3", group: "DPS physique", label: "Spadassin", classe: "Spadassin", note: "DPS physique" },
  { id: "d4", group: "DPS physique", label: "Arbalétrier", classe: "Arbaletrier", note: "DPS physique" },
  { id: "d5", group: "DPS physique", label: "Moine", classe: "Chanoine", note: "DPS physique" },
  { id: "d6", group: "DPS physique", label: "Arcaniste (option)", classe: "Arcaniste", note: "Si besoin : +1 à +2 arca" },
  { id: "m1", group: "DPS magique", label: "Arcaniste", classe: "Arcaniste", note: "2 à 3 arca" },
  { id: "m2", group: "DPS magique", label: "Arcaniste", classe: "Arcaniste", note: "2 à 3 arca" },
  { id: "m3", group: "DPS magique", label: "Arcaniste (option)", classe: "Arcaniste", note: "3ème arca si dispo" },
  { id: "m4", group: "DPS magique", label: "Soso", classe: "Envouteur", note: "Support / debuff magique" },
];
const GROUP_META: Record<string, { color: string; icon: string }> = {
  "Tanks (Primats)": { color: "#4EA8FF", icon: "🛡️" },
  "DPS physique": { color: "#FF8C1A", icon: "⚔️" },
  "DPS magique": { color: "#C77DFF", icon: "🔮" },
};
const GROUPS = Object.keys(GROUP_META);
type Signup = { id: string; player: string; pseudo: string; classe: string; slotId: string | null; charId?: string };
const LS_KEY = "vanguard_cs_signups";
// Remise à zéro auto : mercredi & dimanche à 22h00 (Europe/Paris). On calcule la borne
// du dernier reset ; si elle a changé depuis la dernière visite, on vide les inscriptions.
function csPeriodKey(): string {
  try {
    const p = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    for (let i = 0; i <= 7; i++) {
      const d = new Date(p); d.setDate(p.getDate() - i); d.setHours(22, 0, 0, 0);
      const day = d.getDay(); // 0 = dimanche, 3 = mercredi
      if ((day === 0 || day === 3) && d <= p) return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }
  } catch {}
  return "init";
}

export default function CompositionsPage() {
  const { data: session } = useSession();
  const meName = (session?.user as any)?.discordName ?? session?.user?.name ?? "Moi";
  const [tab, setTab] = useState<"cs" | "gvg">("cs");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [myChars, setMyChars] = useState<{ id: string; name: string; class: string }[]>([]);

  useEffect(() => {
    try {
      const key = csPeriodKey();
      if (localStorage.getItem(LS_KEY + "_p") !== key) {        // nouvelle période → remise à zéro
        localStorage.removeItem(LS_KEY);
        localStorage.setItem(LS_KEY + "_p", key);
        setSignups([]);
        return;
      }
      const r = localStorage.getItem(LS_KEY);
      if (r) setSignups(JSON.parse(r));
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(signups)); } catch {} }, [signups]);
  useEffect(() => { fetch("/api/characters").then(r => (r.ok ? r.json() : [])).then(setMyChars).catch(() => {}); }, []);

  const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const removeSignup = (id: string) => setSignups(signups.filter(s => s.id !== id));
  const registerToSlot = (slot: Slot, char: { id: string; name: string; class: string }) => {
    setSignups(prev => [...prev.filter(s => s.charId !== char.id), { id: Math.random().toString(36).slice(2), player: meName, pseudo: char.name, classe: slot.classe, slotId: slot.id, charId: char.id }]);
  };

  const filledSlots = new Set(signups.filter(s => s.slotId).map(s => s.slotId));
  const playersCount = new Set(signups.map(s => s.player.toLowerCase())).size;
  const byClass: Record<string, number> = {}; signups.forEach(s => { byClass[s.classe] = (byClass[s.classe] || 0) + 1; });
  const fillPct = Math.round((filledSlots.size / CS_SLOTS.length) * 100);

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" };

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
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22 }}>{filledSlots.size}<span style={{ color: "var(--text-muted)", fontSize: 14 }}>/{CS_SLOTS.length}</span></div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Postes remplis</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--blue)" }}>{playersCount}</div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Joueurs</div></div>
            <div><div className="font-heading" style={{ fontWeight: 700, fontSize: 22, color: "var(--purple)" }}>{signups.length}</div><div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Persos engagés</div></div>
          </div>
        </div>

        {/* Zones de composition */}
        {GROUPS.map(g => { const meta = GROUP_META[g]; const slots = CS_SLOTS.filter(s => s.group === g); const done = slots.filter(s => filledSlots.has(s.id)).length; return (
          <div key={g} style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: `linear-gradient(90deg, ${meta.color}22, transparent)`, borderLeft: `4px solid ${meta.color}` }}>
              <span style={{ fontSize: 20 }}>{meta.icon}</span>
              <span className="font-heading" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 15 }}>{g}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: meta.color, fontWeight: 600 }}>{done}/{slots.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(225px,1fr))", gap: 12, padding: 18 }}>
              {slots.map(slot => { const taken = signups.filter(s => s.slotId === slot.id); const filled = taken.length > 0; return (
                <div key={slot.id} style={{ position: "relative", background: filled ? `${meta.color}11` : "var(--bg-3)", borderRadius: 12, padding: 14, border: `1px solid ${filled ? meta.color : "var(--border)"}`, transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--bg-2)", border: `1px solid ${filled ? meta.color : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ClassLogo name={slot.classe} size={32} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 14 }}>{slot.label}</div><div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{slot.note}</div></div>
                  </div>
                  {filled ? <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>{taken.map(t => <div key={t.id} style={{ fontSize: 11.5, color: meta.color, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color }} /> <b>{t.pseudo}</b> <span style={{ color: "var(--text-muted)" }}>· {t.player}</span><button onClick={() => removeSignup(t.id)} title="Retirer" style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 13 }}>✕</button></div>)}</div>
                    : (() => {
                        const matching = myChars.filter(c => norm(c.class) === norm(slot.classe));
                        return <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border)" }}>
                          {matching.length === 0
                            ? <div style={{ fontSize: 10.5, color: "var(--text-muted)", textAlign: "center" }}>Aucun perso {slot.classe}</div>
                            : <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>{matching.map(c => <button key={c.id} onClick={() => registerToSlot(slot, c)} style={{ fontSize: 10.5, padding: "4px 9px", borderRadius: 6, border: `1px solid ${meta.color}`, background: "transparent", color: meta.color, cursor: "pointer" }}>+ {c.name}</button>)}</div>}
                        </div>;
                      })()}
                </div>
              ); })}
            </div>
          </div>
        ); })}

        {/* Récap / aide */}
        <div style={card}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>👉 Pour t'inscrire : clique <b style={{ color: "var(--orange)" }}>« + ton perso »</b> sur un poste de ta classe. Tes persos proviennent de tes <b>personnages</b> (AirBuilder).</div>
          {signups.length > 0 && (<>
            <div className="font-heading" style={{ color: "var(--orange)", textTransform: "uppercase", fontSize: 13, margin: "14px 0 8px" }}>Classes engagées</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(byClass).map(([c, n]) => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-3)", borderRadius: 7, padding: "4px 9px", fontSize: 12 }}><ClassLogo name={c} size={20} /> ×{n}</span>)}</div>
          </>)}
        </div>
      </>) : (
        <div style={{ ...card, textAlign: "center", padding: 40, background: "radial-gradient(circle at 50% 30%, rgba(255,140,26,0.08), transparent 70%)" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚔️</div>
          <h2 className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Guild Siege — Libre</h2>
          <p style={{ color: "var(--text)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>Tout le monde peut participer, il n'y a pas de composition stricte. On s'adapte : ramène ton meilleur perso, peu importe la classe. L'essentiel c'est d'être présent et de jouer ensemble. 💪</p>
        </div>
      )}
      </div>
    </div>
  );
}
