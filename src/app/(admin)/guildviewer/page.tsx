"use client";
import { useEffect, useMemo, useState } from "react";
import { ClassLogo } from "@/components/ClassLogo";
import { PageHeader } from "@/components/PageHeader";

type Gear = { id: string; name: string; mode: string; weaponRarity?: string; hp?: number; attack?: number; defense?: number; critRate?: number; critDamage?: number; damageReduction?: number };
type Spec = { id: string; type: string; score: number };
type Char = { id: string; name: string; class: string; level: number; prestige: number; isMain: boolean; gearProfiles: Gear[]; specializations: Spec[] };
type Member = { id: string; username: string; avatar?: string | null; role: string; isActive: boolean; characters: Char[]; _count: { transactions: number; absences: number } };

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

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 14 };
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 14 };

  if (err) return <div style={{ padding: 40, color: "var(--red)" }}>Accès refusé ou erreur de chargement (réservé au staff).</div>;
  if (!members) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Chargement du GuildViewer…</div>;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-guildviewer.png" icon="👁️" title="GuildViewer" subtitle="Suivi complet des membres : personnages, classes, builds et activité. Repère qui accompagner en priorité." />

      {/* Stats globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { v: stats.members, l: "membres", c: "var(--text)" },
          { v: stats.active, l: "actifs", c: "var(--green)" },
          { v: stats.chars, l: "personnages", c: "var(--text)" },
          { v: stats.builds, l: "builds", c: "var(--blue)" },
          { v: stats.charsNoBuild, l: "persos sans build", c: stats.charsNoBuild ? "var(--red)" : "var(--green)" },
          { v: stats.membersNoChar, l: "membres sans perso", c: stats.membersNoChar ? "var(--gold)" : "var(--green)" },
        ].map((s) => (
          <div key={s.l} className="glass-card" style={{ padding: 14 }}>
            <div className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <input style={{ ...inp, flex: 1, minWidth: 220 }} placeholder="Rechercher un membre, un perso, une classe…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={onlyNoBuild} onChange={(e) => setOnlyNoBuild(e.target.checked)} /> À accompagner (sans build)
        </label>
      </div>

      {/* Membres */}
      {filtered.length === 0 ? <div style={{ ...card, textAlign: "center", color: "var(--text-muted)" }}>Aucun membre ne correspond.</div> :
        filtered.map((u) => {
          const r = ROLE_META[u.role] ?? ROLE_META.RECRUE;
          return (
            <div key={u.id} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: u.characters.length ? 12 : 0, flexWrap: "wrap" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/site/ranks/${RANK_BADGE[u.role] ?? "public"}.png`} alt={r.label} title={r.label} style={{ width: 42, height: 42, objectFit: "contain", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div className="font-heading" style={{ fontWeight: 700, fontSize: 16 }}>{u.username} {!u.isActive && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· inactif</span>}</div>
                  <div style={{ fontSize: 12, color: r.color }}>{r.label}</div>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-muted)" }}>
                  <span>{u.characters.length} perso(s)</span>
                  <span>{u._count.transactions} dette(s)</span>
                  <span>{u._count.absences} absence(s)</span>
                </div>
              </div>

              {u.characters.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--gold)" }}>⚠️ Aucun personnage déclaré.</div>
              ) : (
                <div style={{ display: "grid", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  {u.characters.map((c) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <ClassLogo name={c.class} size={24} />
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 120 }}>{c.name} {c.isMain && <span style={{ color: "var(--gold)", fontSize: 10 }}>★</span>}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Niv {c.level} · P{c.prestige}</span>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                        {c.gearProfiles.length === 0
                          ? <span style={{ fontSize: 11, color: "var(--red)" }}>aucun build</span>
                          : c.gearProfiles.map((g) => (
                              <span key={g.id} title={`${g.name} — ❤️ ${kfmt(g.hp)} · ⚔️ ${kfmt(g.attack)} · 🛡️ ${kfmt(g.defense)} · 💥 ${g.critRate ?? 0}%`} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: `1px solid ${modeColor(g.mode)}`, color: modeColor(g.mode), whiteSpace: "nowrap" }}>
                                {g.mode}{g.weaponRarity ? ` · ${RARITY_FR[g.weaponRarity] ?? g.weaponRarity}` : ""}
                              </span>
                            ))}
                        {(() => { const g = c.gearProfiles.find((x) => (x.hp || 0) > 0); return g ? <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", whiteSpace: "nowrap" }}>❤️{kfmt(g.hp)} ⚔️{kfmt(g.attack)} 🛡️{kfmt(g.defense)}</span> : null; })()}
                      </div>
                      {c.specializations.length > 0 && (
                        <span style={{ fontSize: 10, color: "var(--purple)" }}>{c.specializations.map((s) => `${SPEC_FR[s.type] ?? s.type} ${s.score}%`).join(" · ")}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
