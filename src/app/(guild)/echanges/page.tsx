"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";

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

  if (!D) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Chargement…</div>;

  const itemList = (arr: Item[], give: boolean) => arr.map((x, i) => (
    <span key={i} style={{ display: "inline-block", marginRight: 7, whiteSpace: "nowrap" }}>
      <span style={{ color: give ? "var(--green)" : "var(--text)", fontWeight: give ? 600 : 500 }}>{x.name}</span>
      <span style={{ color: "var(--text-muted)" }}> ×{x.count}{x.prob && x.prob < 1 ? ` (${Math.round(x.prob * 100)}%)` : ""}</span>
    </span>
  ));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 32px 90px" }}>
      <PageHeader icon="swap" title="Échanges PNJ" subtitle="Tous les échanges PNJ d'AirFlyff : ce qu'il faut donner (à gauche) pour obtenir quoi (à droite). Cherche un item pour le retrouver vite." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="vg-subtabs" style={{ margin: 0 }}>
          <button onClick={() => setTab("custom")} className={`vg-subtab ${tab === "custom" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="sparkles" size={14} />Custom AirFlyff ({D.custom.length})</button>
          <button onClick={() => setTab("ressources")} className={`vg-subtab ${tab === "ressources" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="sprout" size={14} />Ressources ({D.ressources.length})</button>
        </div>
        <input placeholder="Rechercher un item…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginLeft: "auto", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", padding: "9px 13px", borderRadius: 9, fontSize: 13.5, minWidth: 220, flex: "1 1 220px" }} />
      </div>

      <div key={tab} className="vg-swap">
        {list.map((n, i) => (
          <div key={i} className="glass-card" style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", background: "linear-gradient(90deg, rgba(255,210,74,.1), transparent 60%)", borderLeft: "3px solid var(--gold)" }}>
              <Icon name="swap" size={16} style={{ color: "var(--gold)" }} />
              <span className="font-heading" style={{ color: "var(--gold)", fontSize: 14.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{nice(n.mmi || n.npc)}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{n.echanges.length} échange(s)</span>
            </div>
            <div style={{ padding: "11px 14px", display: "grid", gap: 7 }}>
              {n.echanges.map((e, j) => (
                <div key={j} className="ex-row" style={{ display: "flex", gap: 11, alignItems: "center", flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 13px" }}>
                  <span style={{ flex: 1, minWidth: 190, fontSize: 12.5, lineHeight: 1.6 }}>{itemList(e.require, false)}</span>
                  <span style={{ width: 25, height: 25, borderRadius: "50%", flexShrink: 0, background: "color-mix(in srgb, var(--orange) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--orange) 45%, transparent)", color: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>→</span>
                  <span style={{ flex: 1, minWidth: 150, fontSize: 12.5, lineHeight: 1.6 }}>{itemList(e.give, true)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="glass-card" style={{ padding: 26, textAlign: "center", color: "var(--text-muted)" }}>Aucun résultat pour « {q} ».</div>}
      </div>

      <style>{`
        .ex-row{transition:border-color .15s, transform .12s, background .15s}
        .ex-row:hover{border-color:color-mix(in srgb, var(--orange) 55%, transparent);transform:translateX(2px);background:var(--bg-4)}
      `}</style>
    </div>
  );
}
