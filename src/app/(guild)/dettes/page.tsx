"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";

type Pay = { id: string; amount: number; note: string | null; createdAt: string };
type Debt = { id: string; type: string; amount: number; item: string | null; reason: string | null; status: string; adminNote: string | null; payments: Pay[]; createdAt: string };
type Req = { id: string; kind: string; item: string | null; quantity: number; reason: string | null; status: string; prixPublic: string | null; prixFinal: string | null; adminNote: string | null; createdAt: string; batchId: string | null; cat: string | null; priceEach: number | null };
type Shop = { id: string; item: string; cat: string; classe: string; price: number; stock: number; unit: string; icon: string | null };

const DEBT_STATUS: Record<string, { l: string; c: string }> = {
  REQUESTED: { l: "Demandée", c: "var(--text-muted)" }, PENDING_VALIDATION: { l: "À valider", c: "var(--gold)" },
  ACCEPTED: { l: "Acceptée", c: "var(--blue)" }, REFUSED: { l: "Refusée", c: "var(--red)" },
  REPAID: { l: "Remboursée", c: "var(--green)" }, CANCELLED: { l: "Annulée", c: "var(--text-muted)" },
};
const REQ_STATUS: Record<string, { l: string; c: string }> = {
  PENDING: { l: "En attente", c: "var(--gold)" },
  ACCEPTE_ACHAT: { l: "Achat accepté (−20 %)", c: "var(--green)" },
  ACCEPTE_DETTE: { l: "Dette accordée", c: "var(--blue)" },
  REFUSE: { l: "Refusée", c: "var(--red)" }, ANNULE: { l: "Annulée", c: "var(--text-muted)" },
};
const KIND_LABEL: Record<string, string> = { OBJET_IG: "Objet IG", ITEM: "Items", PERINS: "Périns" };
const CLASSES = ["Templier", "Spadassin", "Arcaniste", "Envouteur", "Arbaletrier", "Sylphide", "Primat", "Chanoine"];
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 14 };
const stepBtn: React.CSSProperties = { width: 24, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", fontSize: 14 };
const fmt = (n: string | number | null) => (n == null ? "?" : Number(n).toLocaleString("fr-FR"));

export default function BanquePage() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payAmt, setPayAmt] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  // ── Boutique ──
  const [shop, setShop] = useState<Shop[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [catF, setCatF] = useState(""); const [clsF, setClsF] = useState(""); const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [stuffSex, setStuffSex] = useState<Record<string, "G" | "F">>({}); // #4 : préférence ♂/♀ par Stuff
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"boutique" | "requetes" | "dettes" | "rembourse">("boutique");
  const { data: session } = useSession();
  const canDelete = ["VANGUARD", "DIRECTION"].includes((session?.user as unknown as { role?: string })?.role ?? "");

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([fetch("/api/bank-request"), fetch("/api/debts")]);
      if (a.ok) setReqs(await a.json());
      if (b.ok) setDebts(await b.json());
    } catch {}
    setLoading(false);
  };
  const loadShop = async () => { try { const r = await fetch("/api/shop"); if (r.ok) { const d = await r.json(); setShop(d.items ?? []); setCats(d.cats ?? []); } } catch {} };
  useEffect(() => { load(); loadShop(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const pay = async (id: string, amount: number) => {
    if (!amount || amount <= 0) return flash("Entre un montant à rembourser (> 0).");
    const r = await fetch(`/api/debts/${id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
    if (r.ok) { setPayAmt(p => ({ ...p, [id]: "" })); flash("Remboursement enregistré ✓"); load(); } else flash("Erreur");
  };

  const deleteDebt = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette dette de l'historique ?\nCette action est irréversible.")) return;
    const r = await fetch(`/api/debts/${id}`, { method: "DELETE" });
    if (r.ok) { flash("Dette supprimée ✓"); load(); } else flash("Erreur — suppression refusée.");
  };

  // ── Panier ──
  const byId = (id: string) => shop.find(s => s.id === id);
  const setQty = (id: string, v: number) => setCart(c => { const it = byId(id); const max = it ? it.stock : 0; const n = Math.max(0, Math.min(max, Math.round(v) || 0)); const cc = { ...c }; if (n <= 0) delete cc[id]; else cc[id] = n; return cc; });
  const cartIds = Object.keys(cart);
  const cartTotal = cartIds.reduce((s, id) => { const it = byId(id); return s + (it ? it.price * cart[id] : 0); }, 0);
  const submitCart = async (mode: "achat" | "dette") => {
    if (!cartIds.length) return;
    const missingSex = cartIds.filter(id => { const it = byId(id); return it && (it.cat || "").trim().startsWith("Stuff") && !stuffSex[id]; });
    if (missingSex.length) return flash("Indique ♂ Garçon ou ♀ Fille pour chaque Stuff avant d'envoyer.");
    setSending(true);
    const items = cartIds.map(id => { const it = byId(id)!; const isStuff = (it.cat || "").trim().startsWith("Stuff"); return { name: isStuff && stuffSex[id] ? `${it.item} (${stuffSex[id]})` : it.item, quantity: cart[id], price: it.price, cat: it.cat }; });
    const r = await fetch("/api/bank-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, mode }) });
    setSending(false);
    if (r.ok) { setCart({}); setStuffSex({}); flash(`Demande envoyée ✓ — ${cartIds.length} article(s) en ${mode === "dette" ? "dette" : "achat"}. Le staff va valider.`); load(); }
    else { const e = await r.json().catch(() => ({} as any)); flash(e.error || "Erreur — as-tu un personnage déclaré ?"); }
  };

  const filtered = shop.filter(s => (!catF || s.cat === catF) && (!clsF || s.classe === clsF || !s.classe) && (!q || s.item.toLowerCase().includes(q.toLowerCase())));
  // Regroupe les requêtes par panier (batchId) → 1 carte par transaction
  const reqGroups = reqs.reduce<{ key: string; items: Req[] }[]>((acc, r) => { const k = r.batchId || r.id; let g = acc.find(x => x.key === k); if (!g) { g = { key: k, items: [] }; acc.push(g); } g.items.push(r); return acc; }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-banque.png" title="Banque" subtitle="Parcours le coffre de guilde, ajoute au panier, et fais ta demande (achat ou dette). Le staff valide depuis l'AirGuild." />

      {toast && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {([["boutique", "🛒 Boutique"], ["requetes", `📋 Requêtes${reqs.length ? ` (${reqs.length})` : ""}`], ["dettes", `💰 Dettes${debts.filter(d => d.status !== "REPAID").length ? ` (${debts.filter(d => d.status !== "REPAID").length})` : ""}`], ["rembourse", `✅ Remboursé${debts.filter(d => d.status === "REPAID").length ? ` (${debts.filter(d => d.status === "REPAID").length})` : ""}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'Rajdhani',sans-serif", border: `1px solid ${tab === k ? "var(--orange)" : "var(--border)"}`, background: tab === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: tab === k ? "var(--orange)" : "var(--text-muted)" }}>{l}</button>
        ))}
      </div>

      {/* ── BOUTIQUE ── */}
      {tab === "boutique" && <div className="glass-card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}>🛒 Boutique de guilde <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>— articles en stock dans le coffre commun</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <VgSelect value={catF} onChange={setCatF} options={[{ value: "", label: "Toutes catégories" }, ...cats.map(c => ({ value: c, label: c }))]} minWidth={160} />
          <VgSelect value={clsF} onChange={setClsF} options={[{ value: "", label: "Toutes classes" }, ...CLASSES.map(c => ({ value: c, label: c }))]} minWidth={150} />
          <input placeholder="🔍 Rechercher un article…" value={q} onChange={e => setQ(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
        </div>
        <div className="shop-layout" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 470, overflowY: "auto", paddingRight: 4 }}>
            {shop.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Le coffre commun est vide pour l'instant — reviens quand le staff l'aura rempli. 📦</div> :
             filtered.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Aucun article ne correspond à ta recherche.</div> :
             filtered.map(s => { const inCart = cart[s.id] || 0; return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-3)", border: `1px solid ${inCart ? "var(--orange)" : "var(--border)"}`, borderRadius: 9, padding: "7px 11px" }}>
                <div style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-2)", borderRadius: 7 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.icon ? <img src={s.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} /> : <span>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.item}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.classe ? s.classe + " · " : ""}stock {s.stock} · <b style={{ color: "var(--gold)" }}>~{fmt(s.price)}</b> périns</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setQty(s.id, inCart - 1)} style={stepBtn}>−</button>
                  <input value={inCart} onChange={e => setQty(s.id, +e.target.value || 0)} style={{ ...inp, width: 42, textAlign: "center", padding: "5px 4px", fontSize: 13 }} />
                  <button onClick={() => setQty(s.id, inCart + 1)} style={stepBtn}>＋</button>
                </div>
              </div>
            ); })}
          </div>
          <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: 14, alignSelf: "start" }}>
            <div className="font-heading" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🧺 Ton panier</div>
            {cartIds.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "14px 0", textAlign: "center" }}>Panier vide.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4, maxHeight: 240, overflowY: "auto" }}>
                {cartIds.map(id => { const it = byId(id); if (!it) return null; const isStuff = (it.cat || "").trim().startsWith("Stuff"); return (
                  <div key={id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.item}</span>
                      <span style={{ color: "var(--text-muted)" }}>×{cart[id]}</span>
                      <span style={{ color: "var(--gold)", minWidth: 58, textAlign: "right" }}>{fmt(it.price * cart[id])}</span>
                      <button onClick={() => setQty(id, 0)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
                    </div>
                    {isStuff && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 2 }}>
                        <span style={{ fontSize: 10.5, color: stuffSex[id] ? "var(--text-muted)" : "var(--orange)", fontWeight: stuffSex[id] ? 400 : 700 }}>Sexe du Stuff :</span>
                        {(["G", "F"] as const).map(sx => (
                          <button key={sx} onClick={() => setStuffSex(p => ({ ...p, [id]: sx }))} style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 6, cursor: "pointer", border: `1px solid ${stuffSex[id] === sx ? "var(--orange)" : "var(--border)"}`, background: stuffSex[id] === sx ? "rgba(255,140,26,.16)" : "var(--bg-2)", color: stuffSex[id] === sx ? "var(--orange)" : "var(--text-muted)" }}>{sx === "G" ? "♂ Garçon" : "♀ Fille"}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, margin: "10px 0 12px", paddingTop: 10, borderTop: "1px solid var(--border)" }}><span style={{ color: "var(--text-muted)" }}>Total estimé</span><b style={{ color: "var(--gold)" }}>{fmt(cartTotal)} périns</b></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => submitCart("achat")} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "rgba(74,222,128,0.12)", color: "var(--green)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13 }}>🛒 Demander en achat</button>
              <button onClick={() => submitCart("dette")} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--orange)", background: "rgba(255,140,26,0.12)", color: "var(--orange)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13 }}>📝 Demander en dette</button>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>ℹ️ Ta demande part au staff qui valide (achat −20 % ou dette). Profil avec personnage requis.</div>
          </div>
        </div>
      </div>}

      {loading ? <div style={{ color: "var(--text-muted)" }}>Chargement…</div> : (
        <>
          {tab === "requetes" && (
            <section style={{ marginBottom: 22 }}>
              <h2 className="font-heading" style={{ fontSize: 14, color: "var(--text)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Mes requêtes</h2>
              {reqs.length === 0 ? <div className="glass-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>Aucune requête en cours.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reqGroups.map(g => {
                  const first = g.items[0];
                  const st = REQ_STATUS[first.status] ?? REQ_STATUS.PENDING;
                  const total = g.items.reduce((s, r) => s + (r.priceEach || 0) * r.quantity, 0);
                  const multi = g.items.length > 1;
                  return (
                    <div key={g.key} className="glass-card" style={{ padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="font-heading" style={{ fontWeight: 700 }}>{multi ? `🧺 Panier — ${g.items.length} articles` : (first.item ?? "Périns")}{!multi && first.quantity > 1 ? <span style={{ color: "var(--text-muted)" }}> ×{first.quantity}</span> : null}</span>
                        {total > 0 && <span style={{ color: "var(--gold)", fontSize: 13 }}>~{fmt(total)} périns</span>}
                        <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${st.c}`, color: st.c }}>{st.l}</span>
                      </div>
                      {multi && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 8 }}>
                          {g.items.map(it => (
                            <div key={it.id} style={{ display: "flex", gap: 8 }}>
                              <span style={{ flex: 1, minWidth: 0 }}>{it.cat ? <span style={{ opacity: .65 }}>[{it.cat}] </span> : null}{it.item} ×{it.quantity}</span>
                              {it.priceEach ? <span style={{ color: "var(--gold)" }}>~{fmt(it.priceEach * it.quantity)}</span> : null}
                            </div>
                          ))}
                        </div>
                      )}
                      {!multi && first.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{first.reason}</div>}
                      {first.status === "ACCEPTE_ACHAT" && <div style={{ fontSize: 13, color: "var(--green)", marginTop: 5 }}>Prix : <b>{fmt(first.prixFinal)}</b> périn <span style={{ color: "var(--text-muted)" }}>(public {fmt(first.prixPublic)} −20 %)</span></div>}
                      {first.status === "ACCEPTE_DETTE" && <div style={{ fontSize: 13, color: "var(--blue)", marginTop: 5 }}>Dette de <b>{fmt(first.prixPublic)}</b> périn — voir l'onglet « Dettes ».</div>}
                      {first.adminNote && <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 4 }}>Note staff : {first.adminNote}</div>}
                    </div>
                  );
                })}
              </div>
              )}
            </section>
          )}

          {(tab === "dettes" || tab === "rembourse") && (() => { const list = debts.filter(d => tab === "rembourse" ? d.status === "REPAID" : d.status !== "REPAID"); return (
          <section>
            <h2 className="font-heading" style={{ fontSize: 14, color: "var(--text)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{tab === "rembourse" ? "Dettes remboursées" : "Mes dettes"}</h2>
            {list.length === 0 ? <div className="glass-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>{tab === "rembourse" ? "Aucune dette remboursée pour l'instant." : "Aucune dette en cours. 🎉"}</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {list.map(d => {
                  const st = DEBT_STATUS[d.status] ?? DEBT_STATUS.REQUESTED;
                  const paid = d.payments.reduce((s, p) => s + p.amount, 0);
                  return (
                    <div key={d.id} className="glass-card" style={{ padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="font-heading" style={{ fontWeight: 700 }}>{fmt(d.amount)} {d.type === "PENYA" ? "périn" : d.type.toLowerCase()}</span>
                        {d.item && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {d.item}</span>}
                        <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${st.c}`, color: st.c }}>{st.l}</span>
                        {canDelete && <button onClick={() => deleteDebt(d.id)} title="Supprimer cette dette de l'historique (Vanguard)" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--red)", background: "rgba(248,113,113,.1)", color: "var(--red)", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0 }}>🗑️</button>}
                      </div>
                      {d.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{d.reason}</div>}
                      {paid > 0 && <div style={{ fontSize: 12, color: "var(--green)", marginTop: 5 }}>Remboursé : {fmt(paid)} / {fmt(d.amount)}</div>}
                      {d.status === "ACCEPTED" && (() => { const reste = Math.max(0, d.amount - paid); return (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <input type="number" min={1} max={reste} placeholder="Montant à rembourser…" value={payAmt[d.id] ?? ""} onChange={e => setPayAmt(p => ({ ...p, [d.id]: e.target.value }))} style={{ width: 150, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 13 }} />
                          <button onClick={() => pay(d.id, Math.min(reste, Number(payAmt[d.id]) || 0))} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>💰 Rembourser</button>
                          <button onClick={() => setPayAmt(p => ({ ...p, [d.id]: String(reste) }))} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>Tout ({fmt(reste)})</button>
                        </div>
                      ); })()}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          ); })()}
        </>
      )}
      <style>{`@media(max-width:760px){.shop-layout{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
