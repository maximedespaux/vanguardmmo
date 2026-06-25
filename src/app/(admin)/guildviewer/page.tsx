"use client";
import { useEffect, useMemo, useState } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { PageHeader } from "@/components/PageHeader";

type Gear = { id: string; name: string; mode: string; weaponRarity?: string; hp?: number; attack?: number; defense?: number; critRate?: number; critDamage?: number; damageReduction?: number; weapon?: any; armor?: any; jewelry?: any; pets?: any; cards?: any };
type Spec = { id: string; type: string; score: number };
type Char = { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; gearProfiles: Gear[]; specializations: Spec[] };
type DebtLite = { id: string; item: string | null; amount: number; status: string };
type Member = { id: string; username: string; avatar?: string | null; role: string; isActive: boolean; characters: Char[]; debts: DebtLite[]; _count: { transactions: number; absences: number } };

const ROLE_META: Record<string, { emoji: string; label: string; color: string }> = {
  DIRECTION: { emoji: "🛡️", label: "Direction", color: "var(--red)" },
  VANGUARD: { emoji: "👑", label: "Vanguard", color: "var(--gold)" },
  GENERAL: { emoji: "🧭", label: "Général", color: "var(--orange)" },
  OFFICIER: { emoji: "🔥", label: "Officier", color: "var(--orange)" },
  VETERAN: { emoji: "📋", label: "Vétéran", color: "var(--blue)" },
  GUARD: { emoji: "⚔️", label: "Guard", color: "var(--blue)" },
  RECRUE: { emoji: "🌱", label: "Recrue", color: "var(--text-muted)" },
};
const RANK_BADGE: Record<string, string> = { DIRECTION: "fondateur", VANGUARD: "fondateur", GENERAL: "brasdroit", OFFICIER: "brasdroit", VETERAN: "guilde", GUARD: "guilde", RECRUE: "public" };
const modeColor = (m: string) => (m === "TANK" ? "var(--blue)" : m === "HYBRIDE" ? "var(--purple)" : "var(--orange)");
const RARITY_FR: Record<string, string> = { COMMUN: "Commun", RARE: "Rare", EPIQUE: "Épique", LEGENDAIRE: "Légendaire", PREMYTHIQUE: "Pré-myth.", MYTHIQUE: "Mythique" };
const kfmt = (n?: number) => { const v = n || 0; return v >= 1e6 ? (v / 1e6).toFixed(1).replace(".0", "") + "M" : v >= 1e3 ? (v / 1e3).toFixed(1).replace(".0", "") + "k" : String(v); };
const SPEC_FR: Record<string, string> = { PVE: "PvE", PVP_BOSS: "PvP/Boss", CHAMBRES_SECRETES: "Chambres S." };
export default function GuildViewerPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  const [onlyNoBuild, setOnlyNoBuild] = useState(false);
  const [histUser, setHistUser] = useState<string | null>(null);
  const [hist, setHist] = useState<{ id: string; createdAt: string }[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const openHist = async (uid: string) => {
    if (histUser === uid) { setHistUser(null); return; }
    setHistUser(uid); setHist([]); setHistLoading(true);
    try { const r = await fetch(`/api/builder-state?user=${uid}&list=1`); if (r.ok) { const j = await r.json(); setHist(j.snapshots || []); } } catch { /* noop */ }
    setHistLoading(false);
  };

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/admin/users"); if (r.ok) setMembers(await r.json()); else setErr(true); }
      catch { setErr(true); }
    })();
  }, []);

  const stats = useMemo(() => {
    const m = members ?? [];
    const chars = m.flatMap((u) => u.characters);
    const builds = chars.reduce((s, c) => s + c.gearProfiles.length, 0);
    const charsNoBuild = chars.filter((c) => c.gearProfiles.length === 0).length;
    const membersNoChar = m.filter((u) => u.characters.length === 0).length;
    return { members: m.length, active: m.filter((u) => u.isActive).length, chars: chars.length, builds, charsNoBuild, membersNoChar };
  }, [members]);

  const filtered = useMemo(() => {
    let m = members ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) m = m.filter((u) => u.username.toLowerCase().includes(needle) || u.characters.some((c) => c.name.toLowerCase().includes(needle) || c.class.toLowerCase().includes(needle)));
    if (onlyNoBuild) m = m.filter((u) => u.characters.length === 0 || u.characters.some((c) => c.gearProfiles.length === 0));
    return m;
  }, [members, q, onlyNoBuild]);

  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 13px", color: "var(--text)", fontSize: 14 };

  const miniStat = (ic: string, n: number, l: string, c: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 50, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "5px 9px" }}>
      <span className="font-heading" style={{ fontSize: 15, fontWeight: 700, color: c, lineHeight: 1 }}>{n}</span>
      <span style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap" }}>{ic} {l}</span>
    </div>
  );

  if (err) return <div style={{ padding: 40, color: "var(--red)" }}>Accès refusé ou erreur de chargement (réservé au staff).</div>;
  if (!members) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Chargement du GuildViewer…</div>;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-guildviewer.png" icon="👁️" title="GuildViewer" subtitle="Suivi complet des membres : personnages, classes, builds et activité. Repère qui accompagner en priorité." />

      {/* Hub admin — tout relié depuis le GuildViewer (#26) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 18px" }}>
        {([["/coffre", "🧰 AirGuild (coffre)"], ["/gestion-dettes", "🏦 Banque (gestion)"], ["/plan-farm", "🌾 Plan de farm"], ["/candidatures", "📋 Candidatures"], ["/gestion-worldboss", "🐉 World Boss"]] as const).map(([href, label]) => (
          <a key={href} href={href} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: "'Rajdhani',sans-serif", textDecoration: "none", color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--border)" }} className="gv-hublink">{label}</a>
        ))}
      </div>

      {/* Stats globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { v: stats.members, l: "membres", c: "var(--text)", ic: "👥" },
          { v: stats.active, l: "actifs", c: "var(--green)", ic: "🟢" },
          { v: stats.chars, l: "personnages", c: "var(--orange)", ic: "🧙" },
          { v: stats.builds, l: "builds", c: "var(--blue)", ic: "⚔️" },
          { v: stats.charsNoBuild, l: "persos sans build", c: stats.charsNoBuild ? "var(--red)" : "var(--green)", ic: "🛠️" },
          { v: stats.membersNoChar, l: "membres sans perso", c: stats.membersNoChar ? "var(--gold)" : "var(--green)", ic: "👤" },
        ].map((s) => (
          <div key={s.l} className="gv-stat glass-card" style={{ padding: "15px 17px", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", right: -10, top: -14, fontSize: 50, opacity: 0.07, pointerEvents: "none" }}>{s.ic}</span>
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: s.c }} />
            <div className="font-heading" style={{ fontSize: 30, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <input style={{ ...inp, flex: 1, minWidth: 220 }} placeholder="🔍 Rechercher un membre, un perso, une classe…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: onlyNoBuild ? "var(--orange)" : "var(--text-muted)", cursor: "pointer", background: "var(--bg-3)", border: `1px solid ${onlyNoBuild ? "var(--orange)" : "var(--border)"}`, borderRadius: 9, padding: "9px 14px", transition: "border-color .15s, color .15s" }}>
          <input type="checkbox" checked={onlyNoBuild} onChange={(e) => setOnlyNoBuild(e.target.checked)} /> ⚠️ À accompagner (sans build)
        </label>
      </div>

      {/* Membres */}
      {filtered.length === 0 ? <div className="glass-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>Aucun membre ne correspond.</div> :
        filtered.map((u) => {
          const r = ROLE_META[u.role] ?? ROLE_META.RECRUE;
          const noChar = u.characters.length === 0;
          return (
            <div key={u.id} className="gv-member glass-card" style={{ padding: 0, marginBottom: 13, overflow: "hidden", borderLeft: `3px solid ${r.color}` }}>
              {/* En-tête membre */}
              <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 17px", flexWrap: "wrap", background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 9%, transparent), transparent 55%)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/site/ranks/${RANK_BADGE[u.role] ?? "public"}.png`} alt={r.label} title={r.label} style={{ width: 46, height: 46, objectFit: "contain", flexShrink: 0, filter: `drop-shadow(0 0 7px color-mix(in srgb, ${r.color} 55%, transparent))` }} />
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span className="font-heading" style={{ fontWeight: 700, fontSize: 17 }}>{u.username}</span>
                    <span title={u.isActive ? "Actif" : "Inactif"} style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: u.isActive ? "var(--green)" : "var(--text-muted)", boxShadow: u.isActive ? "0 0 7px var(--green)" : "none" }} />
                  </div>
                  <span style={{ display: "inline-block", marginTop: 5, fontSize: 10.5, fontWeight: 700, color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 40%, transparent)`, borderRadius: 20, padding: "2px 11px", textTransform: "uppercase", letterSpacing: 0.6 }}>{r.emoji} {r.label}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {miniStat("🧙", u.characters.length, "perso", noChar ? "var(--gold)" : "var(--text)")}
                  {miniStat("💰", u.debts.length, "dette", u.debts.length ? "var(--red)" : "var(--text-muted)")}
                  {miniStat("🚫", u._count.absences, "abs.", u._count.absences ? "var(--gold)" : "var(--text-muted)")}
                  <button onClick={() => openHist(u.id)} title="Historique des builds — 10 dernières versions sauvegardées" style={{ fontSize: 11, fontWeight: 700, cursor: "pointer", color: histUser === u.id ? "#000" : "var(--text-muted)", background: histUser === u.id ? "var(--orange)" : "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 11px", whiteSpace: "nowrap" }}>🕘 Versions{histUser === u.id ? " ▲" : ""}</button>
                </div>
              </div>
              {histUser === u.id && (
                <div style={{ margin: "0 17px 13px", padding: "11px 13px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <div className="font-heading" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 8 }}>🕘 Historique des builds</div>
                  {histLoading ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Chargement…</div>
                    : hist.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Aucune version archivée — le membre doit cliquer « 💾 Sauvegarder mes persos » dans l&apos;AirBuilder.</div>
                    : <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{hist.map((s, i) => (
                        <a key={s.id} href={`/builder/${u.id}?v=${s.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 600, color: i === 0 ? "var(--orange)" : "var(--text)", background: "var(--bg-2)", border: `1px solid ${i === 0 ? "var(--orange)" : "var(--border)"}`, borderRadius: 7, padding: "5px 11px", textDecoration: "none", whiteSpace: "nowrap" }}>{i === 0 ? "● Actuel · " : ""}{new Date(s.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</a>
                      ))}</div>}
                </div>
              )}

              {/* Personnages */}
              {noChar ? (
                <div style={{ margin: "0 17px 15px", padding: "11px 14px", background: "rgba(255,210,74,.06)", border: "1px dashed var(--gold)", borderRadius: 10, fontSize: 12.5, color: "var(--gold)" }}>⚠️ Aucun personnage déclaré — à inviter à compléter son profil via le Builder.</div>
              ) : (
                <div style={{ display: "grid", gap: 7, padding: "0 17px 15px" }}>
                  {u.characters.map((c) => {
                    return (
                      <div key={c.id} className="gv-char" style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: "9px 13px" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}><ClassLogo name={c.class} size={23} /></div>
                        <div style={{ minWidth: 130 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name} {c.isMain && <span title="Personnage principal" style={{ color: "var(--gold)", fontSize: 11 }}>★</span>}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.class} · Niv {c.level} · P{c.prestige}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginLeft: "auto" }}>
                          {c.gearProfiles.length === 0
                            ? <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--red)", background: "rgba(248,113,113,.1)", border: "1px solid var(--red)", borderRadius: 6, padding: "2px 9px" }}>aucun build</span>
                            : c.gearProfiles.map((g) => (
                                <span key={g.id} title={`${g.name} — ❤️ ${kfmt(g.hp)} · ⚔️ ${kfmt(g.attack)} · 🛡️ ${kfmt(g.defense)} · 💥 ${g.critRate ?? 0}%`} style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6, border: `1px solid ${modeColor(g.mode)}`, background: `color-mix(in srgb, ${modeColor(g.mode)} 13%, transparent)`, color: modeColor(g.mode), whiteSpace: "nowrap" }}>
                                  {g.mode}{g.weaponRarity ? ` · ${RARITY_FR[g.weaponRarity] ?? g.weaponRarity}` : ""}
                                </span>
                              ))}
                          {c.specializations.length > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--purple)", background: "rgba(199,125,255,.1)", border: "1px solid color-mix(in srgb, var(--purple) 45%, transparent)", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>{c.specializations.map((s) => `${SPEC_FR[s.type] ?? s.type} ${s.score}%`).join(" · ")}</span>
                          )}
                          {c.gearProfiles.length > 0 && <a href={`/builder/${u.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, fontWeight: 700, color: "var(--orange)", background: "rgba(255,140,26,.1)", border: "1px solid var(--orange)", borderRadius: 6, padding: "3px 10px", textDecoration: "none", whiteSpace: "nowrap" }}>⚔️ AirBuilder ↗</a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {u.debts.length > 0 && (
                <div style={{ margin: "0 17px 15px", padding: "9px 13px", background: "rgba(248,113,113,.07)", border: "1px solid color-mix(in srgb, var(--red) 35%, transparent)", borderRadius: 10, fontSize: 12, color: "var(--text-muted)" }}>
                  <b style={{ color: "var(--red)" }}>💰 Dettes :</b> {u.debts.map((d) => `${d.item || "objet"} (${d.amount.toLocaleString("fr-FR")} périn)`).join(" · ")}
                </div>
              )}
            </div>
          );
        })}

      <style>{`
        .gv-stat{transition:transform .18s, box-shadow .18s}
        .gv-char{transition:border-color .15s, transform .12s, background .15s}
        .gv-char:hover{border-color:var(--orange);transform:translateX(2px);background:var(--bg-4)}
      `}</style>
    </div>
  );
}
