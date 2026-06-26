"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

type FarmItem = { id: string; item: string; cat: string; classe: string; icon: string | null; stock: number; target: number; manque: number; unit: string };

const INPUT: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" };

function col(pc: number) { return pc >= 80 ? "var(--green)" : pc >= 50 ? "var(--gold)" : "var(--red)"; }

function Stat({ v, l, c }: { v: React.ReactNode; l: string; c: string }) {
  return (
    <div className="glass-card" style={{ padding: 14, textAlign: "center" }}>
      <div className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: c }}>{v}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{l}</div>
    </div>
  );
}

function Bar({ pc }: { pc: number }) {
  return (
    <div style={{ height: 6, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(2, Math.min(100, pc))}%`, height: "100%", background: col(pc), borderRadius: 4, transition: "width .3s" }} />
    </div>
  );
}

export default function PlanFarmPage() {
  const [items, setItems] = useState<FarmItem[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");

  useEffect(() => {
    const empty = { items: [], okCount: 0, totalItems: 0, members: 0 };
    fetch("/api/admin/farm").then((r) => (r.ok ? r.json() : empty)).catch(() => empty).then((farm) => {
      setItems(farm.items ?? []);
      setOkCount(farm.okCount ?? 0);
      setTotalItems(farm.totalItems ?? 0);
      setMemberCount(farm.members ?? 0);
      setReady(true);
    });
  }, []);

  const totalMissing = useMemo(() => items.reduce((s, d) => s + d.manque, 0), [items]);
  const health = totalItems ? Math.round((okCount / totalItems) * 100) : 100;
  const cats = useMemo(() => [...new Set(items.map((d) => d.cat))].sort((a, b) => a.localeCompare(b, "fr")), [items]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return items.filter((d) => (!catFilter || d.cat === catFilter) && (!s || (d.item + " " + d.classe).toLowerCase().includes(s)));
  }, [items, q, catFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, FarmItem[]> = {};
    for (const d of filtered) (g[d.cat] ||= []).push(d);
    const sum = (l: FarmItem[]) => l.reduce((s, x) => s + x.manque, 0);
    return Object.entries(g).sort((a, b) => sum(b[1]) - sum(a[1]));
  }, [filtered]);

  if (!ready) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Calcul du plan de farm…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="🌾" title="Plan de farm" subtitle="Calculé sur le vrai stock du coffre AirGuild : ce qui manque pour atteindre les seuils." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, margin: "8px 0 18px" }}>
        <Stat v={`${health}%`} l="coffres au seuil" c={col(health)} />
        <Stat v={items.length} l="objets à farmer" c="var(--orange)" />
        <Stat v={totalMissing} l="unités manquantes" c="var(--red)" />
        <Stat v={memberCount} l="coffres membres" c="var(--text)" />
      </div>

      {/* Recherche + filtre par catégorie (#farm) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <input placeholder="🔎 Rechercher un objet…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...INPUT, flex: 1, minWidth: 200 }} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ ...INPUT, minWidth: 170, cursor: "pointer" }}>
          <option value="">Toutes les catégories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <div className="glass-card" style={{ padding: 30, textAlign: "center", color: "var(--green)" }}>🎉 Tous les objets du coffre sont au-dessus de leur seuil. Rien à farmer !</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Aucun objet ne correspond au filtre.</div>
      ) : (
        grouped.map(([cat, list]) => {
          const sumStock = list.reduce((s, x) => s + x.stock, 0);
          const sumTarget = list.reduce((s, x) => s + x.target, 0);
          const catPc = sumTarget ? Math.round((sumStock / sumTarget) * 100) : 100;
          return (
            <section key={cat} style={{ marginBottom: 24 }}>
              <h2 className="font-heading" style={{ fontSize: 15, borderBottom: "1px solid var(--border)", paddingBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span>{cat} <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {list.reduce((s, x) => s + x.manque, 0)} à farm</span></span>
                <span style={{ color: col(catPc), fontSize: 13, fontWeight: 700 }}>{catPc}%</span>
              </h2>
              {/* Barre de progression de la catégorie (récap) */}
              <div style={{ margin: "9px 0 13px" }}><Bar pc={catPc} /></div>
              <div style={{ display: "grid", gap: 8 }}>
                {list.map((d) => {
                  const pc = d.target ? Math.round((d.stock / d.target) * 100) : 100;
                  return (
                    <div key={d.id} className="glass-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                      {d.icon ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={d.icon} alt="" width={30} height={30} style={{ objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
                      ) : <div style={{ width: 30, height: 30, background: "var(--bg)", borderRadius: 6, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.item}{d.classe ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {d.classe}</span> : null}</div>
                        {/* Barre de progression de l'item */}
                        <div style={{ marginTop: 5 }}><Bar pc={pc} /></div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>stock {d.stock}/{d.target}{d.unit === "slot" ? " (slots)" : ""} · <b style={{ color: col(pc) }}>{pc}%</b></div>
                      </div>
                      <span title="à farmer" style={{ fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: 16, color: "var(--red)", minWidth: 38, textAlign: "right" }}>−{d.manque}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <div style={{ marginTop: 22, textAlign: "center" }}>
        <Link href="/coffre" className="vg-btn" style={{ textDecoration: "none" }}>🧰 Gérer le stock du coffre</Link>
      </div>
    </div>
  );
}
