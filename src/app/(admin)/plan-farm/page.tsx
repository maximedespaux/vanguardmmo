"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

type FarmItem = {
  id: string; item: string; cat: string; classe: string; icon: string | null;
  stock: number; target: number; manque: number; unit: string;
  /** Arme à raretés : le stock affiché englobe toutes les raretés. */
  rarete?: boolean;
  /** Exemplaires pré-mythiques en coffre, et ce qu'il en manque (réserve de 1). */
  premyth?: number; manquePremyth?: number;
};

/** Couleur de la rareté pré-mythique, alignée sur RARITIES de airguild.js. */
const PREMYTH = "#FF5C8A";

/** Clé de préférence : ordre des sections, par compte. */
const PREF_ORDRE = "plan-farm-ordre";

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
  const sansPremyth = (d.manquePremyth ?? 0) > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 10px", borderRadius: 7, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
      {d.icon ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={d.icon} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />
      ) : <span style={{ width: 20, height: 20, flexShrink: 0 }} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {d.item}{d.classe ? <span style={{ color: "var(--text-muted)" }}> · {d.classe}</span> : null}
        {/* Armes : le stock est la somme de toutes les raretes, mais la reserve
            pre-mythique se suit a part — une arme peut etre au seuil sans
            qu'aucun exemplaire ne soit pre-myth. */}
        {d.rarete && (
          <span
            title={sansPremyth ? "Aucun exemplaire pré-mythique en coffre — en prévoir 1" : `${d.premyth} pré-myth. en coffre`}
            style={{
              marginLeft: 7, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, whiteSpace: "nowrap",
              border: `1px solid ${sansPremyth ? PREMYTH : "rgba(74,222,128,.45)"}`,
              background: sansPremyth ? "rgba(255,92,138,.14)" : "rgba(74,222,128,.11)",
              color: sansPremyth ? PREMYTH : "var(--green)",
            }}
          >
            {sansPremyth ? "pré-myth. manquant" : `pré-myth. ×${d.premyth}`}
          </span>
        )}
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
  /** Catégories retenues. Vide = toutes (plusieurs choix possibles). */
  const [choisies, setChoisies] = useState<string[]>([]);
  /** Catégories dépliées. Tout est replié au départ : c'est le point de la refonte. */
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});
  /**
   * Ordre des sections, propre au compte connecté (UserPref, clé PREF_ORDRE).
   * Vide = ordre par défaut (la catégorie la plus en retard d'abord). On ne
   * bloque jamais l'affichage sur cette préférence : si la lecture échoue, on
   * garde l'ordre par défaut.
   */
  const [ordre, setOrdre] = useState<string[]>([]);
  const [glisse, setGlisse] = useState<string | null>(null);

  // Ordre enregistré pour CE compte. Silencieux : un échec laisse l'ordre par défaut.
  useEffect(() => {
    fetch(`/api/prefs?key=${PREF_ORDRE}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (Array.isArray(j?.value)) setOrdre(j.value.filter((x: unknown) => typeof x === "string")); })
      .catch(() => {});
  }, []);

  const enregistrerOrdre = (liste: string[]) => {
    setOrdre(liste);
    fetch("/api/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: PREF_ORDRE, value: liste }) }).catch(() => {});
  };

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

  // La reserve pre-mythique compte comme une unite a farmer : sinon une arme au
  // seuil mais sans pre-myth n'apparaitrait nulle part dans les totaux.
  const totalMissing = useMemo(() => items.reduce((s, d) => s + d.manque + (d.manquePremyth ?? 0), 0), [items]);
  const health = totalItems ? Math.round((okCount / totalItems) * 100) : 100;
  const cats = useMemo(() => [...new Set(items.map((d) => d.cat))].sort((a, b) => a.localeCompare(b, "fr")), [items]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return items.filter((d) => (choisies.length === 0 || choisies.includes(d.cat)) && (!s || (d.item + " " + d.classe).toLowerCase().includes(s)));
  }, [items, q, choisies]);


  /** Catégories, la plus en retard en premier : c'est là qu'il y a du travail. */
  const groupes = useMemo(() => {
    const g = new Map<string, FarmItem[]>();
    for (const d of filtered) g.set(d.cat, [...(g.get(d.cat) ?? []), d]);
    return [...g.entries()]
      .map(([cat, list]) => {
        const stock = list.reduce((s, x) => s + x.stock, 0);
        const target = list.reduce((s, x) => s + x.target, 0);
        return { cat, list, manque: list.reduce((s, x) => s + x.manque + (x.manquePremyth ?? 0), 0), pc: target ? Math.round((stock / target) * 100) : 100 };
      })
      .sort((a, b) => {
        // Ordre choisi par l'utilisateur s'il existe pour les deux, sinon on
        // retombe sur « la plus en retard d'abord ». Une catégorie absente de la
        // préférence (nouvelle) va à la fin plutôt que de bousculer l'ordre.
        const ia = ordre.indexOf(a.cat), ib = ordre.indexOf(b.cat);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
        return a.pc - b.pc || b.manque - a.manque;
      });
  }, [filtered, ordre]);

  if (!ready) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Calcul du plan de farm…</div>;

  const filtreActif = !!q.trim() || choisies.length > 0;
  const toutOuvrir = (v: boolean) => setOuvertes(Object.fromEntries(groupes.map((g) => [g.cat, v])));

  /** Déplace la section `depuis` à la place de `vers` et enregistre. */
  const deplacer = (depuis: string, vers: string) => {
    if (depuis === vers) return;
    const base = groupes.map((g) => g.cat);
    const l = base.filter((c) => c !== depuis);
    const i = l.indexOf(vers);
    l.splice(i < 0 ? l.length : i, 0, depuis);
    enregistrerOrdre(l);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="sprout" title="Plan de farm" subtitle="Calculé sur le vrai stock du coffre AirGuild : ce qui manque pour atteindre les seuils." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, margin: "8px 0 18px" }}>
        <Stat v={`${health}%`} l="coffres au seuil" c={col(health)} />
        <Stat v={items.length} l="objets à farmer" c="var(--orange)" />
        <Stat v={totalMissing.toLocaleString("fr-FR")} l="unités manquantes" c="var(--red)" />
        <Stat v={memberCount} l="coffres membres" c="var(--text)" />
      </div>

      {/* Filtres. Des puces plutot qu'une liste deroulante : on voit les
          categories et leur volume sans ouvrir un menu, et on peut en cumuler
          plusieurs — impossible avec un <select> simple. */}
      <div className="glass-card fx-card" style={{ padding: 13, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input placeholder="Rechercher un objet…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...INPUT, width: "100%", boxSizing: "border-box", paddingRight: q ? 32 : 12 }} />
            {q && (
              <button onClick={() => setQ("")} title="Effacer" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", display: "flex", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <Icon name="x" size={13} />
              </button>
            )}
          </div>
          <button onClick={() => toutOuvrir(true)} style={{ ...INPUT, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>Tout déplier</button>
          <button onClick={() => toutOuvrir(false)} style={{ ...INPUT, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>Tout replier</button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 11 }}>
          <button
            onClick={() => setChoisies([])}
            style={{
              fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${choisies.length === 0 ? "var(--orange)" : "var(--border)"}`,
              background: choisies.length === 0 ? "rgba(255,140,26,.16)" : "var(--bg-3)",
              color: choisies.length === 0 ? "var(--orange)" : "var(--text-muted)",
            }}
          >
            Toutes
          </button>
          {cats.map((c) => {
            const on = choisies.includes(c);
            const n = items.filter((d) => d.cat === c).length;
            return (
              <button
                key={c}
                onClick={() => setChoisies((l) => (on ? l.filter((x) => x !== c) : [...l, c]))}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 20, cursor: "pointer",
                  border: `1px solid ${on ? "var(--orange)" : "var(--border)"}`,
                  background: on ? "rgba(255,140,26,.16)" : "var(--bg-3)",
                  color: on ? "var(--orange)" : "var(--text)",
                }}
              >
                {c}<span style={{ color: on ? "var(--orange)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 30, textAlign: "center", color: "var(--green)" }}>
          <Icon name="sparkles" size={16} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 5 }} /> Tous les objets du coffre sont au-dessus de leur seuil. Rien à farmer !
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Aucun objet ne correspond au filtre.</div>
      ) : (
        <>

          {/* ── Tout le reste, replié par catégorie ────────────────────── */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
            <h2 className="font-heading" style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Par catégorie</h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {ordre.length ? "ton ordre" : "la plus en retard en premier"} · clique pour déplier · glisse la poignée pour réordonner
            </span>
            {ordre.length > 0 && (
              <button onClick={() => enregistrerOrdre([])} style={{ marginLeft: "auto", fontSize: 11.5, padding: "5px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer" }}>
                Ordre par défaut
              </button>
            )}
          </div>

          <div style={{ display: "grid", gap: 7 }}>
            {groupes.map((g) => {
              // Un filtre actif déplie d'office : sinon on chercherait un objet
              // pour ne voir qu'une catégorie fermée.
              const ouvert = ouvertes[g.cat] ?? filtreActif;
              return (
                <section
                  key={g.cat}
                  className="glass-card fx-card"
                  style={{ padding: 0, overflow: "hidden", opacity: glisse === g.cat ? 0.45 : 1, outline: glisse && glisse !== g.cat ? "1px dashed rgba(255,140,26,.35)" : "none" }}
                  onDragOver={(e) => { if (glisse) e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); if (glisse) deplacer(glisse, g.cat); setGlisse(null); }}
                >
                  <div style={{ display: "flex", alignItems: "stretch" }}>
                    {/* Poignee dediee : le reste de l'en-tete garde le clic pour
                        deplier, sinon les deux gestes se marcheraient dessus. */}
                    <span
                      draggable
                      onDragStart={() => setGlisse(g.cat)}
                      onDragEnd={() => setGlisse(null)}
                      title="Glisser pour réordonner (enregistré sur ton compte)"
                      style={{ display: "flex", alignItems: "center", padding: "0 4px 0 10px", cursor: "grab", color: "var(--text-muted)", flexShrink: 0 }}
                    >
                      <Icon name="menu" size={14} />
                    </span>
                  <button
                    onClick={() => setOuvertes((o) => ({ ...o, [g.cat]: !ouvert }))}
                    style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, padding: "11px 13px 11px 5px", background: "none", border: "none", color: "var(--text)", cursor: "pointer", textAlign: "left" }}
                  >
                    <Icon name={ouvert ? "chevron-down" : "chevron-right"} size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13.5, flexShrink: 0 }}>{g.cat}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0 }}>{g.list.length} obj.</span>
                    {/* La barre porte l'information : on voit d'un coup d'œil où en est chaque catégorie. */}
                    <span style={{ flex: 1, minWidth: 50, maxWidth: 260 }}><Bar pc={g.pc} h={5} /></span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col(g.pc), width: 38, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{g.pc}%</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", width: 66, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>−{g.manque.toLocaleString("fr-FR")}</span>
                  </button>
                  </div>
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
