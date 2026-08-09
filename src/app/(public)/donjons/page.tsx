"use client";
import { useState } from "react";
import dungeonsData from "@/data/dungeons.json";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

type Dungeon = { id: number; name: string; type: string; lvl: string; prestige: number | null; hp: number; armor: string | null; elem: string; cat: string; icon: string; drops: string[] };

/**
 * Un donjon à `hp: 0` n'est pas un donjon sans données : c'est un donjon sans PV
 * minimal requis (Sietch Kalgas, dont le boss a un aggro fixe — cf. le guide de
 * progression). Afficher « 0 » laissait croire à une fiche incomplète.
 */
const hpLabel = (hp: number) => (hp > 0 ? hp.toLocaleString("fr-FR") : "Aucun minimum");

export default function DonjonsPage() {
  // Halo curseur + relief sur les cartes de donjon (.fx-card), cf. VgFx.
  useCardFx();
  const dungeons = dungeonsData as Dungeon[];

  const [q, setQ] = useState(""); const [typeFilter, setTypeFilter] = useState<"Tous" | "SOLO" | "GROUPE">("Tous"); const [sel, setSel] = useState<Dungeon | null>(null);
  const wikiList = dungeons.filter(d => (typeFilter === "Tous" || d.type === typeFilter) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-pve.webp" icon="map" title="Wiki des Donjons" subtitle={`Le wiki des ${dungeons.length} donjons : PV, élément, armure conseillée et drops.`} />
      <SectionTabs section="pve" />
      {/* L'onglet « Wiki des donjons » a ete retire : il etait seul dans sa barre,
          donc il ne proposait aucun choix — la page EST le wiki. Le suivi quotidien
          et le rapport d'instances qui l'accompagnaient sont partis avec lui ; leur
          code restait la sans qu'aucun clic ne puisse plus l'atteindre. */}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un donjon..." style={{ flex: 1, minWidth: 180, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)" }} />
        <div className="vg-subtabs" style={{ margin: 0 }}>{(["Tous", "SOLO", "GROUPE"] as const).map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`vg-subtab ${typeFilter === t ? "active" : ""}`}>{t}</button>)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
        {wikiList.map(d => (
          <div key={d.id} className="fx-card" onClick={() => setSel(d)} style={{ ...card, padding: 16, marginBottom: 0, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><Icon name={d.icon as IconName} framed frameSize={36} tone="orange" /><div style={{ minWidth: 0 }}><div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.type} · {d.lvl}{d.prestige ? ` · P${d.prestige}` : ""}</div></div></div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="heart" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{hpLabel(d.hp)}</span><span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="sparkles" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{d.elem}</span>{d.armor && <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}><Icon name="shield" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{d.armor}</span>}</div>
            {d.drops.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}><Icon name="gift" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />{d.drops.slice(0, 3).join(", ")}{d.drops.length > 3 ? "…" : ""}</div>}
          </div>
        ))}
      </div>
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 500, width: "100%", marginBottom: 0, maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><Icon name={sel.icon as IconName} framed frameSize={48} tone="orange" /><div style={{ minWidth: 0 }}><h2 className="font-heading" style={{ fontSize: 22 }}>{sel.name}</h2><div style={{ color: "var(--text-muted)", fontSize: 13 }}>{sel.type} · Niveau {sel.lvl}{sel.prestige ? ` · Prestige ${sel.prestige}` : ""}</div></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12, minWidth: 0 }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>PV recommandés</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--orange)" }}>{hpLabel(sel.hp)}</div></div>
              <div style={{ background: "var(--bg-3)", borderRadius: 8, padding: 12, minWidth: 0 }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Élément boss</div><div className="font-heading" style={{ fontWeight: 700, color: "var(--blue)" }}>{sel.elem}</div></div>
            </div>
            {sel.armor && <div style={{ background: "rgba(255,140,26,0.06)", border: "1px solid var(--orange-dark)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}><Icon name="shield" size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Armure conseillée : <b>{sel.armor}</b></div>}
            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}><Icon name="gift" size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Drops</div>
            {sel.drops.length > 0
              ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{sel.drops.map(d => <span key={d} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>{d}</span>)}</div>
              : <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Personne n&apos;a encore relevé les drops de cette instance.</div>}
            <button onClick={() => setSel(null)} style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }} className="font-heading">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
