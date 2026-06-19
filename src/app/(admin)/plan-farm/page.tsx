"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadItems, iconUrl, type Item } from "@/data/items";
import { type CoffreEntry } from "@/data/coffre";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";

const CLASS_FR: Record<string, { fr: string; emoji: string }> = {
  SPADASSIN: { fr: "Spadassin", emoji: "🗡️" }, TEMPLIER: { fr: "Templier", emoji: "🛡️" },
  ARCANISTE: { fr: "Arcaniste", emoji: "🔮" }, ENVOUTEUR: { fr: "Envoûteur", emoji: "🌀" },
  ARBALETRIER: { fr: "Arbalétrier", emoji: "🏹" }, SYLPHIDE: { fr: "Sylphide", emoji: "🎯" },
  PRIMAT: { fr: "Primat", emoji: "✨" }, CHANOINE: { fr: "Chanoine", emoji: "👊" },
};

type Entry = CoffreEntry & { assignedTo?: string; priority?: boolean };
type Member = { id: string; username: string; characters: { class: string }[] };
type Deficit = Entry & { manque: number };

const sel: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12, padding: "5px 8px", maxWidth: 140 };

function Stat({ v, l, c }: { v: React.ReactNode; l: string; c: string }) {
  return (
    <div className="glass-card" style={{ padding: 14, textAlign: "center" }}>
      <div className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: c }}>{v}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{l}</div>
    </div>
  );
}

export default function PlanFarmPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      loadItems(),
      fetch("/api/admin/coffre").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([it, co, us]) => {
      setItems(it as Item[]);
      setEntries(co as Entry[]);
      setMembers(us as Member[]);
      setReady(true);
    });
  }, []);

  // Mise à jour optimiste + PATCH (priorité / assignation).
  const patch = (id: number | null, body: Record<string, unknown>) => {
    if (id == null) return;
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, ...body } : e)));
    fetch("/api/admin/coffre", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }).catch(() => {});
  };

  const byId = useMemo(() => {
    const m = new Map<string | number, Item>();
    for (const it of items) if (it.id != null) m.set(it.id, it);
    return m;
  }, [items]);

  const memberNames = useMemo(() => [...new Set(members.map((m) => m.username).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")), [members]);

  const deficits = useMemo<Deficit[]>(
    () => entries.filter((e) => e.stock < e.target).map((e) => ({ ...e, manque: e.target - e.stock }))
      .sort((a, b) => (Number(!!b.priority) - Number(!!a.priority)) || (b.manque - a.manque)),
    [entries]
  );
  const totalMissing = deficits.reduce((s, d) => s + d.manque, 0);
  const okCount = entries.filter((e) => e.stock >= e.target).length;
  const health = entries.length ? Math.round((okCount / entries.length) * 100) : 100;

  const grouped = useMemo(() => {
    const g: Record<string, Deficit[]> = {};
    for (const d of deficits) (g[d.category] ||= []).push(d);
    const sumManque = (l: Deficit[]) => l.reduce((s, x) => s + x.manque, 0);
    return Object.entries(g).sort((a, b) => sumManque(b[1]) - sumManque(a[1]));
  }, [deficits]);

  const classCount = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of members) for (const ch of m.characters || []) c[ch.class] = (c[ch.class] || 0) + 1;
    return c;
  }, [members]);
  const charTotal = useMemo(() => members.reduce((s, m) => s + (m.characters?.length || 0), 0), [members]);

  if (!ready) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Calcul du plan de farm…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="🌾" title="Plan de farm" subtitle="Centre de pilotage du farm : ce qu'il manque dans les coffres, en priorité, et qui s'en occupe." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, margin: "8px 0 22px" }}>
        <Stat v={`${health}%`} l="coffres au seuil" c={health >= 80 ? "var(--green)" : health >= 50 ? "var(--gold)" : "var(--red)"} />
        <Stat v={deficits.length} l="objets à farmer" c="var(--orange)" />
        <Stat v={totalMissing} l="unités manquantes" c="var(--red)" />
        <Stat v={members.length} l="membres" c="var(--text)" />
        <Stat v={charTotal} l="persos à équiper" c="var(--text)" />
      </div>

      {charTotal > 0 && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 22 }}>
          <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text-muted)", marginBottom: 10 }}>Pour qui on farme — répartition des classes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(classCount).sort((a, b) => b[1] - a[1]).map(([cls, n]) => {
              const meta = CLASS_FR[cls] ?? { fr: cls, emoji: "❓" };
              return <span key={cls} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", fontSize: 13 }}>{meta.emoji} {meta.fr} <b style={{ color: "var(--orange)" }}>{n}</b></span>;
            })}
          </div>
        </div>
      )}

      {deficits.length === 0 ? (
        <div className="glass-card" style={{ padding: 30, textAlign: "center", color: "var(--green)" }}>🎉 Tous les coffres sont au-dessus de leur seuil. Rien à farmer !</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>⭐ Clique l&apos;étoile pour prioriser · assigne un membre responsable du farm.</div>
          {grouped.map(([cat, list]) => (
            <section key={cat} style={{ marginBottom: 24 }}>
              <h2 className="font-heading" style={{ fontSize: 15, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                {cat} <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {list.reduce((s, x) => s + x.manque, 0)} à farm</span>
              </h2>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {list.map((d) => {
                  const it = byId.get(d.id);
                  return (
                    <div key={d.id} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderLeft: `3px solid ${d.priority ? "var(--orange)" : "transparent"}` }}>
                      <button onClick={() => patch(d.id, { priority: !d.priority })} title="Priorité" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, lineHeight: 1, color: d.priority ? "var(--gold)" : "var(--text-muted)" }}>{d.priority ? "★" : "☆"}</button>
                      {it && iconUrl(it) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={iconUrl(it)!} alt="" width={32} height={32} style={{ objectFit: "contain" }} />
                      ) : <div style={{ width: 32, height: 32, background: "var(--bg)", borderRadius: 6 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it?.name || `Objet #${d.id}`}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.job ? `${d.job} · ` : ""}stock {d.stock}/{d.target}</div>
                      </div>
                      <VgSelect value={d.assignedTo || ""} onChange={(v) => patch(d.id, { assignedTo: v })} minWidth={140} options={[{ value: "", label: "— assigner —" }, ...memberNames.map((n) => ({ value: n, label: n })), ...(d.assignedTo && !memberNames.includes(d.assignedTo) ? [{ value: d.assignedTo, label: d.assignedTo }] : [])]} />
                      <span title="à farmer" style={{ fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: 16, color: "var(--red)", minWidth: 38, textAlign: "right" }}>−{d.manque}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      <div style={{ marginTop: 22, textAlign: "center" }}>
        <Link href="/coffre" className="vg-btn" style={{ textDecoration: "none" }}>🧰 Gérer le stock du coffre</Link>
      </div>
    </div>
  );
}
