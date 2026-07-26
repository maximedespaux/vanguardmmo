"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { grouperParDonjon, donjonsPour, type ObjetFarm } from "@/lib/farmDonjons";

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

function Bar({ pc }: { pc: number }) {
  return (
    <div style={{ height: 6, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(2, Math.min(100, pc))}%`, height: "100%", background: col(pc), borderRadius: 4, transition: "width .3s" }} />
    </div>
  );
}

/** Une ligne d'objet a farmer. `drop` = le butin qui justifie le rattachement. */
function LigneObjet({ d, drop }: { d: FarmItem; drop?: string }) {
  const pc = d.target ? Math.round((d.stock / d.target) * 100) : 100;
  return (
    <div className="glass-card fx-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
      {d.icon ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={d.icon} alt="" width={30} height={30} style={{ objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
      ) : <div style={{ width: 30, height: 30, background: "var(--bg)", borderRadius: 6, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {d.item}{d.classe ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {d.classe}</span> : null}
        </div>
        {/* Le libelle du butin est TOUJOURS montre : le rattachement est une
            deduction sur les noms, il faut pouvoir juger sur piece. */}
        {drop && (
          <div style={{ fontSize: 11, color: "var(--gold)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            butin : {drop}
          </div>
        )}
        <div style={{ marginTop: 5 }}><Bar pc={pc} /></div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>stock {d.stock}/{d.target}{d.unit === "slot" ? " (slots)" : ""} · <b style={{ color: col(pc) }}>{pc}%</b></div>
      </div>
      <span title="à farmer" style={{ fontFamily: "Rubik,sans-serif", fontWeight: 700, fontSize: 16, color: "var(--red)", minWidth: 38, textAlign: "right" }}>−{d.manque}</span>
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
  const [vue, setVue] = useState<"donjon" | "objet">("donjon");
  /**
   * Sections depliees. Une seule a la fois par defaut : afficher les 264 objets
   * d'un coup etait precisement ce qui rendait la page illisible et lourde.
   */
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});
  /**
   * On passe l'etat EFFECTIF, pas la cle seule : la premiere section est ouverte
   * par defaut alors que rien n'est stocke pour elle. Un `!ouverts[cle]` valait
   * donc `!undefined` = true et la laissait ouverte — elle ne se repliait jamais.
   */
  const basculer = (cle: string, ouvertActuel: boolean) => setOuverts((o) => ({ ...o, [cle]: !ouvertActuel }));

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

  // Rattachement objets -> donjons (regles dans lib/farmDonjons).
  const parDonjon = useMemo(() => grouperParDonjon(filtered as ObjetFarm[]), [filtered]);

  if (!ready) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Calcul du plan de farm…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 80px" }}>
      <PageHeader icon="sprout" title="Plan de farm" subtitle="Calculé sur le vrai stock du coffre AirGuild : ce qui manque pour atteindre les seuils." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, margin: "8px 0 18px" }}>
        <Stat v={`${health}%`} l="coffres au seuil" c={col(health)} />
        <Stat v={items.length} l="objets à farmer" c="var(--orange)" />
        <Stat v={totalMissing} l="unités manquantes" c="var(--red)" />
        <Stat v={memberCount} l="coffres membres" c="var(--text)" />
      </div>

      {/* Deux lectures du meme plan : « ou farmer » (donjon) et « quoi farmer »
          (objet). La premiere est celle qu'on cherche en pratique. */}
      <div className="vg-subtabs" style={{ marginBottom: 14 }}>
        <button onClick={() => setVue("donjon")} className={`vg-subtab ${vue === "donjon" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="key" size={15} /> Par donjon</button>
        <button onClick={() => setVue("objet")} className={`vg-subtab ${vue === "objet" ? "active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="package" size={15} /> Par objet</button>
      </div>

      {/* Recherche + filtre par catégorie (#farm) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <input placeholder="Rechercher un objet…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...INPUT, flex: 1, minWidth: 200 }} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ ...INPUT, minWidth: 170, cursor: "pointer" }}>
          <option value="">Toutes les catégories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 30, textAlign: "center", color: "var(--green)" }}><Icon name="sparkles" size={16} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 5 }} /> Tous les objets du coffre sont au-dessus de leur seuil. Rien à farmer !</div>
      ) : vue === "donjon" ? (
        <>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 7 }}>
            <Icon name="alert" size={14} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
            <span>
              Les donjons sont rapprochés des objets d&apos;après le nom de leur butin — aucun identifiant ne les relie.
              Le butin retenu est indiqué sous chaque objet : vérifie-le avant une longue session.
            </span>
          </div>

          {parDonjon.groupes.length === 0 ? (
            <div className="glass-card fx-card" style={{ padding: 26, textAlign: "center", color: "var(--text-muted)" }}>
              Aucun donjon connu ne lâche les objets qui restent à farmer.
            </div>
          ) : parDonjon.groupes.map((g, i) => {
            const cle = `d${g.donjon.id}`;
            const ouvert = ouverts[cle] ?? i === 0; // le plus utile ouvert d'office
            return (
              <section key={cle} className="glass-card fx-card" style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
                <button onClick={() => basculer(cle, ouvert)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none", color: "var(--text)", cursor: "pointer", textAlign: "left" }}>
                  <Icon name={ouvert ? "chevron-down" : "chevron-right"} size={15} style={{ color: "var(--orange)", flexShrink: 0 }} />
                  <Icon name="key" size={16} style={{ color: "var(--orange)", flexShrink: 0 }} />
                  <span className="font-heading" style={{ fontWeight: 700, fontSize: 15 }}>{g.donjon.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{g.donjon.type} · niv. {g.donjon.lvl}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--orange)", background: "rgba(255,140,26,.12)", border: "1px solid rgba(255,140,26,.3)", borderRadius: 20, padding: "2px 9px" }}>
                      {g.lignes.length} objet{g.lignes.length > 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--red)", fontWeight: 700 }}>−{g.manqueTotal}</span>
                  </span>
                </button>
                {ouvert && (
                  <div style={{ display: "grid", gap: 8, padding: "0 14px 14px" }}>
                    {g.lignes.map((l) => <LigneObjet key={`${cle}|${l.objet.id}`} d={l.objet as FarmItem} drop={l.drop} />)}
                  </div>
                )}
              </section>
            );
          })}

          {/* Provenance inconnue : c'est une information, pas un echec a cacher. */}
          {parDonjon.orphelins.length > 0 && (() => {
            const ouvert = ouverts.orphelins ?? false;
            return (
              <section className="glass-card fx-card" style={{ marginTop: 14, padding: 0, overflow: "hidden", borderColor: "var(--border)" }}>
                <button onClick={() => basculer("orphelins", ouvert)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", textAlign: "left" }}>
                  <Icon name={ouvert ? "chevron-down" : "chevron-right"} size={15} style={{ flexShrink: 0 }} />
                  <span className="font-heading" style={{ fontWeight: 700, fontSize: 14 }}>Donjon inconnu</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700 }}>{parDonjon.orphelins.length} objets</span>
                </button>
                {ouvert && (
                  <div style={{ padding: "0 14px 14px" }}>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 9 }}>
                      Aucun donjon de <Link href="/donjons" style={{ color: "var(--orange)" }}>la liste</Link> ne mentionne ce butin. Complète les drops du donjon pour les faire apparaître ci-dessus.
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {parDonjon.orphelins.map((o) => <LigneObjet key={o.id} d={o as FarmItem} />)}
                    </div>
                  </div>
                )}
              </section>
            );
          })()}
        </>
      ) : filtered.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Aucun objet ne correspond au filtre.</div>
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
                  // Ou le trouver : repond a la question depuis la vue par objet.
                  const ou = donjonsPour(d.item);
                  return (
                    <div key={d.id}>
                      <LigneObjet d={d} />
                      <div style={{ fontSize: 11, color: ou.length ? "var(--gold)" : "var(--text-muted)", margin: "3px 0 0 42px" }}>
                        {ou.length
                          ? <>à farmer dans : {ou.map((x) => x.donjon.name).join(" · ")}</>
                          : <>aucun donjon connu pour cet objet</>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <div style={{ marginTop: 22, textAlign: "center" }}>
        <Link href="/coffre" className="vg-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="vault" size={15} /> Gérer le stock du coffre</Link>
      </div>
    </div>
  );
}
