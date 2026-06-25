"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const CLASS_FR: Record<string, { fr: string; emoji: string }> = {
  SPADASSIN: { fr: "Spadassin", emoji: "🗡️" }, TEMPLIER: { fr: "Templier", emoji: "🛡️" },
  ARCANISTE: { fr: "Arcaniste", emoji: "🔮" }, ENVOUTEUR: { fr: "Envoûteur", emoji: "🌀" },
  ARBALETRIER: { fr: "Arbalétrier", emoji: "🏹" }, SYLPHIDE: { fr: "Sylphide", emoji: "🎯" },
  PRIMAT: { fr: "Primat", emoji: "✨" }, CHANOINE: { fr: "Chanoine", emoji: "👊" },
};

type FarmItem = { id: string; item: string; cat: string; classe: string; icon: string | null; stock: number; target: number; manque: number; unit: string };
type Member = { username: string; characters: { class: string }[] };

function Stat({ v, l, c }: { v: React.ReactNode; l: string; c: string }) {
  return (
    <div className="glass-card" style={{ padding: 14, textAlign: "center" }}>
      <div className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: c }}>{v}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{l}</div>
    </div>
  );
}

export default function PlanFarmPage() {
  const [items, setItems] = useState<FarmItem[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const empty = { items: [], okCount: 0, totalItems: 0 };
    Promise.all([
      fetch("/api/admin/farm").then((r) => (r.ok ? r.json() : empty)).catch(() => empty),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([farm, us]) => {
      setItems(farm.items ?? []);
      setOkCount(farm.okCount ?? 0);
      setTotalItems(farm.totalItems ?? 0);
      setMembers(us as Member[]);
      setReady(true);
    });
  }, []);

  const totalMissing = useMemo(() => items.reduce((s, d) => s + d.manque, 0), [items]);
  const health = totalItems ? Math.round((okCount / totalItems) * 100) : 100;

  const grouped = useMemo(() => {
    const g: Record<string, FarmItem[]> = {};
    for (const d of items) (g[d.cat] ||= []).push(d);
    const sum = (l: FarmItem[]) => l.reduce((s, x) => s + x.manque, 0);
    return Object.entries(g).sort((a, b) => sum(b[1]) - sum(a[1]));
  }, [items]);

  const classCount = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of members) for (const ch of m.characters || []) c[ch.class] = (c[ch.class] || 0) + 1;
    return c;
  }, [members]);
  const charTotal = useMemo(() => members.reduce((s, m) => s + (m.characters?.length || 0), 0), [members]);

  if (!ready) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Calcul du plan de farm…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="🌾" title="Plan de farm" subtitle="Calculé sur le vrai stock du coffre AirGuild : ce qui manque pour atteindre les seuils." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, margin: "8px 0 22px" }}>
        <Stat v={`${health}%`} l="coffres au seuil" c={health >= 80 ? "var(--green)" : health >= 50 ? "var(--gold)" : "var(--red)"} />
        <Stat v={items.length} l="objets à farmer" c="var(--orange)" />
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

      {items.length === 0 ? (
        <div className="glass-card" style={{ padding: 30, textAlign: "center", color: "var(--green)" }}>🎉 Tous les objets du coffre sont au-dessus de leur seuil. Rien à farmer !</div>
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat} style={{ marginBottom: 24 }}>
            <h2 className="font-heading" style={{ fontSize: 15, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              {cat} <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {list.reduce((s, x) => s + x.manque, 0)} à farm</span>
            </h2>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {list.map((d) => (
                <div key={d.id} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                  {d.icon ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.icon} alt="" width={30} height={30} style={{ objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
                  ) : <div style={{ width: 30, height: 30, background: "var(--bg)", borderRadius: 6, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.item}{d.classe ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {d.classe}</span> : null}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>stock {d.stock}/{d.target}{d.unit === "slot" ? " (slots)" : ""}</div>
                  </div>
                  <span title="à farmer" style={{ fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: 16, color: "var(--red)", minWidth: 38, textAlign: "right" }}>−{d.manque}</span>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <div style={{ marginTop: 22, textAlign: "center" }}>
        <Link href="/coffre" className="vg-btn" style={{ textDecoration: "none" }}>🧰 Gérer le stock du coffre</Link>
      </div>
    </div>
  );
}
