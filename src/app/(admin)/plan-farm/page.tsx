"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

type FarmItem = { id: string; item: string; cat: string; classe: string; icon: string | null; stock: number; target: number; manque: number; unit: string };

const INPUT: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" };

function col(pc: number) { return pc >= 80 ? "var(--green)" : pc >= 50 ? "var(--gold)" : "var(--red)"; }

function Stat({ v, l, c }: { v: React.ReactNode; l: string; c: string }) {
  return (
    <div className="glass-card fx-card" style={{ padding: 14, textAlign: "center" }}>
      <div className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: c }}>{v}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{l}</div>
    </div>
  );
}

function Bar({ pc, h = 6 }: { pc: number; h?: number }) {
  return (
    <div style={{ height: h, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(2, Math.min(100, pc))}%`, height: "100%", background: col(pc), borderRadius: 4, transition: "width .3s" }} />
    </div>
  );
}

const pct = (d: FarmItem) => (d.target ? Math.round((d.stock / d.target) * 100) : 100);

/**
 * Ligne DENSE : un objet tient sur une seule ligne, sans barre individuelle.
 * C'est la carte a trois etages (icone + barre + legende) qui rendait la page
 * illisible — 264 objets sur trois lignes de hauteur ne se parcourent pas.
 * Les chiffres sont en chasse fixe pour que les colonnes s'alignent a l'oeil.
 */
function Ligne({ d }: { d: FarmItem }) {
  const pc = pct(d);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 10px", borderRadius: 7, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
      {d.icon ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={d.icon} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />
      ) : <span style={{ width: 20, height: 20, flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {d.item}{d.classe ? <span style={{ color: "var(--text-muted)" }}> · {d.classe}</span> : null}
      </span>
      <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {d.stock}/{d.target}{d.unit === "slot" ? " sl" : ""}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: col(pc), width: 34, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{pc}%</span>
      <span title="à farmer" style={{ fontWeight: 700, fontSize: 13, color: "var(--red)", width: 56, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>−{d.manque.toLocaleString("fr-FR")}</span>
    </div>
  );
}

export default function PlanFarmPage() {
  // Halo curseur + relief sur les panneaux (.fx-card), cf. VgFx.
  useCardFx();
  const [items, setItems] = useState<FarmItem[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  /** Catégories dépliées. Tout est replié au départ : c'est le point de la refonte. */
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});

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

  /**
   * « À finir en premier » : les objets les plus proches de leur seuil, puis à
   * égalité ceux dont il manque le moins.
   *
   * C'est le seul classement qui donne une prise sur la liste. Trier par volume
   * manquant met en tête les objectifs les plus lointains — exact, mais
   * inactionnable : on ne coche jamais rien. Ici chaque ligne peut être bouclée
   * dans la session, et chaque ligne bouclée fait monter le taux de « coffres au
   * seuil » affiché en haut.
   */
  const priorites = useMemo(
    () => [...filtered].filter((d) => d.manque > 0).sort((a, b) => pct(b) - pct(a) || a.manque - b.manque).slice(0, 12),
    [filtered]
  );

  /** Catégories, la plus en retard en premier : c'est là qu'il y a du travail. */
  const groupes = useMemo(() => {
    const g = new Map<string, FarmItem[]>();
    for (const d of filtered) g.set(d.cat, [...(g.get(d.cat) ?? []), d]);
    return [...g.entries()]
      .map(([cat, list]) => {
        const stock = list.reduce((s, x) => s + x.stock, 0);
        const target = list.reduce((s, x) => s + x.target, 0);
        return { cat, list, manque: list.reduce((s, x) => s + x.manque, 0), pc: target ? Math.round((stock / target) * 100) : 100 };
      })
      .sort((a, b) => a.pc - b.pc || b.manque - a.manque);
  }, [filtered]);

  if (!ready) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Calcul du plan de farm…</div>;

  const filtreActif = !!q.trim() || !!catFilter;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="sprout" title="Plan de farm" subtitle="Calculé sur le vrai stock du coffre AirGuild : ce qui manque pour atteindre les seuils." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, margin: "8px 0 18px" }}>
        <Stat v={`${health}%`} l="coffres au seuil" c={col(health)} />
        <Stat v={items.length} l="objets à farmer" c="var(--orange)" />
        <Stat v={totalMissing.toLocaleString("fr-FR")} l="unités manquantes" c="var(--red)" />
        <Stat v={memberCount} l="coffres membres" c="var(--text)" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <input placeholder="Rechercher un objet…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...INPUT, flex: 1, minWidth: 200 }} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ ...INPUT, minWidth: 170, cursor: "pointer" }}>
          <option value="">Toutes les catégories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 30, textAlign: "center", color: "var(--green)" }}>
          <Icon name="sparkles" size={16} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 5 }} /> Tous les objets du coffre sont au-dessus de leur seuil. Rien à farmer !
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Aucun objet ne correspond au filtre.</div>
      ) : (
        <>
          {/* ── À finir en premier ─────────────────────────────────────── */}
          {priorites.length > 0 && (
            <section className="glass-card fx-card" style={{ padding: 16, marginBottom: 18, borderColor: "rgba(255,140,26,.3)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
                <h2 className="font-heading" style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 1, color: "var(--orange)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="target" size={16} /> À finir en premier
                </h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>les {priorites.length} objets les plus proches de leur seuil</span>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "5px 0 11px" }}>
                Chacun se boucle vite, et chaque objet bouclé fait monter le taux de coffres au seuil.
              </p>
              <div style={{ display: "grid", gap: 5 }}>
                {priorites.map((d) => <Ligne key={`p|${d.id}`} d={d} />)}
              </div>
            </section>
          )}

          {/* ── Tout le reste, replié par catégorie ────────────────────── */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
            <h2 className="font-heading" style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Par catégorie</h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>la plus en retard en premier · clique pour déplier</span>
          </div>

          <div style={{ display: "grid", gap: 7 }}>
            {groupes.map((g) => {
              // Un filtre actif déplie d'office : sinon on chercherait un objet
              // pour ne voir qu'une catégorie fermée.
              const ouvert = ouvertes[g.cat] ?? filtreActif;
              return (
                <section key={g.cat} className="glass-card fx-card" style={{ padding: 0, overflow: "hidden" }}>
                  <button
                    onClick={() => setOuvertes((o) => ({ ...o, [g.cat]: !ouvert }))}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "none", border: "none", color: "var(--text)", cursor: "pointer", textAlign: "left" }}
                  >
                    <Icon name={ouvert ? "chevron-down" : "chevron-right"} size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13.5, flexShrink: 0 }}>{g.cat}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0 }}>{g.list.length} obj.</span>
                    {/* La barre porte l'information : on voit d'un coup d'œil où en est chaque catégorie. */}
                    <span style={{ flex: 1, minWidth: 50, maxWidth: 260 }}><Bar pc={g.pc} h={5} /></span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col(g.pc), width: 38, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{g.pc}%</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", width: 66, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>−{g.manque.toLocaleString("fr-FR")}</span>
                  </button>
                  {ouvert && (
                    <div style={{ display: "grid", gap: 5, padding: "0 13px 13px" }}>
                      {g.list.slice().sort((a, b) => pct(b) - pct(a) || a.manque - b.manque).map((d) => <Ligne key={d.id} d={d} />)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <div style={{ marginTop: 22, textAlign: "center" }}>
        <Link href="/coffre" className="vg-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="vault" size={15} /> Gérer le stock du coffre</Link>
      </div>
    </div>
  );
}
