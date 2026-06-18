"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface Item { name: string; def?: string; count: number; prob?: number; icon?: string; }
interface Ex { require: Item[]; give: Item[]; }
interface Npc { mmi?: string; npc?: string; echanges: Ex[]; }
interface Data { custom: Npc[]; ressources: Npc[]; }

const LABELS: Record<string, string> = {
  MMI_WORLDBOSS_PRESTIGE: "World Boss Prestige", MMI_SET_TANK: "Parure Tank", MMI_SET_TANK_2: "Parure Tank II",
  MMI_PRESTIGE_EXCHANGE: "Prestige", MMI_RARETE_EXCHANGE: "Rareté", MMI_RUNE_EXCHANGE: "Runes", MMI_RUNEYGGDRA: "Runes Yggdrasil",
  MMI_ARTEFACT_ESSENCE: "Essence d'artefact", MMI_ECHANGE_ARTE_2: "Artefact (protection)", MMI_ANGEL_CRAFT: "Craft de fée",
  MMI_ANGEL_DUST: "Poudre féerique", MMI_EGG_EXCHANGE: "Œufs", MMI_OEUF_TANK: "Œuf Tank", MMI_ECHANGE_UP_FASHION: "Amélioration fashion",
  MMI_ECHANGE_RAPIDE: "Échange rapide", MMI_NUCLEUS_EXCHANGE: "Nucléus", MMI_PERFECT_NUCLEUS_EXCHANGE: "Nucléus parfait",
  MMI_MEUBLE_EXCHANGE: "Meubles", MMI_CDFV_EXCHANGE: "Cœur de Forêt", MMI_ANNIVAIR: "Anniversaire",
  MMI_CHANGORI: "Ressources (Changori)", MMI_COLLECT01: "Collecteur de gemmes",
};
const nice = (k?: string) => (k && LABELS[k]) || (k || "").replace(/^MMI_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default function EchangesPage() {
  const [D, setD] = useState<Data | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"custom" | "ressources">("custom");
  useEffect(() => { fetch("/data/echanges.json").then((r) => r.json()).then(setD).catch(() => setD(null)); }, []);

  const list = useMemo(() => {
    if (!D) return [];
    const src = tab === "custom" ? D.custom : D.ressources;
    const ql = q.toLowerCase().trim();
    if (!ql) return src;
    return src.map((n) => ({ ...n, echanges: n.echanges.filter((e) => [...e.require, ...e.give].some((i) => (i.name || "").toLowerCase().includes(ql))) })).filter((n) => n.echanges.length);
  }, [D, tab, q]);

  if (!D) return <div style={{ padding: 40, color: "var(--text-muted,#888)" }}>Chargement…</div>;
  const orange = "var(--orange,#FF8C1A)";
  const card: React.CSSProperties = { background: "var(--bg-2,#131318)", border: "1px solid var(--border,#2E2E38)", borderRadius: 13, padding: 14, marginBottom: 12 };
  const mut = "var(--text-muted,#8A8A95)";
  const line = (arr: Item[]) => arr.map((x, i) => <span key={i}>{i > 0 ? ", " : ""}{x.name} <span style={{ color: mut }}>×{x.count}{x.prob && x.prob < 1 ? ` (${Math.round(x.prob * 100)}%)` : ""}</span></span>);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 90px" }}>
      <PageHeader icon="🔄" title="Échanges PNJ" />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div className="vg-subtabs" style={{ margin: 0 }}>
          <button onClick={() => setTab("custom")} className={`vg-subtab ${tab === "custom" ? "active" : ""}`}>Custom AirFlyff ({D.custom.length})</button>
          <button onClick={() => setTab("ressources")} className={`vg-subtab ${tab === "ressources" ? "active" : ""}`}>Ressources ({D.ressources.length})</button>
        </div>
        <input placeholder="Rechercher un item…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginLeft: "auto", background: "var(--bg-3,#1C1C24)", border: "1px solid var(--border,#2E2E38)", color: "var(--text,#E8E8EC)", padding: "8px 10px", borderRadius: 9, fontSize: 13, minWidth: 220 }} />
      </div>
      {list.map((n, i) => (
        <div key={i} style={card}>
          <div className="font-heading" style={{ color: "var(--gold,#FFD24A)", fontSize: 14, marginBottom: 8 }}>{nice(n.mmi || n.npc)}</div>
          {n.echanges.map((e, j) => (
            <div key={j} style={{ fontSize: 13, padding: "5px 0", borderTop: "1px solid var(--border,#2E2E38)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
              <span style={{ flex: 1, minWidth: 200, color: mut }}>{line(e.require)}</span>
              <span style={{ color: orange, fontWeight: 700 }}>→</span>
              <span style={{ flex: 1, minWidth: 160, color: "var(--green,#4ADE80)" }}>{line(e.give)}</span>
            </div>
          ))}
        </div>
      ))}
      {list.length === 0 && <p style={{ color: mut }}>Aucun résultat.</p>}
    </div>
  );
}
