"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { canAccessGuild } from "@/config/roles";

type Pay = { id: string; amount: number; note: string | null; createdAt: string };
type Debt = { id: string; type: string; amount: number; item: string | null; reason: string | null; status: string; adminNote: string | null; payments: Pay[]; createdAt: string };
type Req = { id: string; kind: string; item: string | null; quantity: number; reason: string | null; status: string; prixPublic: string | null; prixFinal: string | null; adminNote: string | null; createdAt: string; batchId: string | null; cat: string | null; priceEach: number | null };
type Tiers = { v: boolean; d: boolean; pub: number; mem: number; det: number; cau: number };
type Shop = { id: string; item: string; cat: string; classe: string; price: number; tiers?: Tiers; rarities?: Record<string, number> | null; stock: number; unit: string; icon: string | null };
// Raretés d'armes (mêmes clés/couleurs que le coffre AirGuild).
const RARITY_META: Record<string, { l: string; c: string }> = {
  rare: { l: "Rare", c: "#4EA8FF" }, epique: { l: "Épique", c: "#C77DFF" },
  legendaire: { l: "Légendaire", c: "#FF8C1A" }, premyth: { l: "Pré-myth.", c: "#FF5C8A" },
};
// Prix affiché selon le statut : membre de guilde → prix membre ; public → prix public.
const priceFor = (s: Shop, member: boolean) => (s.tiers ? (member ? s.tiers.mem : s.tiers.pub) : s.price);

const DEBT_STATUS: Record<string, { l: string; c: string }> = {
  REQUESTED: { l: "Demandée", c: "var(--text-muted)" }, PENDING_VALIDATION: { l: "À valider", c: "var(--gold)" },
  ACCEPTED: { l: "Acceptée", c: "var(--blue)" }, REFUSED: { l: "Refusée", c: "var(--red)" },
  REPAID: { l: "Remboursée", c: "var(--green)" }, CANCELLED: { l: "Annulée", c: "var(--text-muted)" },
};
const REQ_STATUS: Record<string, { l: string; c: string }> = {
  PENDING: { l: "En attente", c: "var(--gold)" },
  ACCEPTE_ACHAT: { l: "Achat accepté", c: "var(--green)" },
  ACCEPTE_DETTE: { l: "Dette accordée", c: "var(--blue)" },
  REFUSE: { l: "Refusée", c: "var(--red)" }, ANNULE: { l: "Annulée", c: "var(--text-muted)" },
};
const KIND_LABEL: Record<string, string> = { OBJET_IG: "Objet IG", ITEM: "Items", PERINS: "Périns" };
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
  const [catF, setCatF] = useState(""); const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [stuffSex, setStuffSex] = useState<Record<string, "G" | "F">>({}); // #4 : préférence ♂/♀ par Stuff
  const [weaponRarity, setWeaponRarity] = useState<Record<string, string>>({}); // rareté voulue par arme (même principe que ♂/♀)
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"boutique" | "requetes" | "dettes" | "rembourse">("boutique");
  const { data: session } = useSession();
  const canDelete = ["VANGUARD", "DIRECTION"].includes((session?.user as unknown as { role?: string })?.role ?? "");
  const role = (session?.user as any)?.role ?? "RECRUE";
  const isMember = canAccessGuild(role); // membre de guilde → prix membre ; sinon prix public + invitation Discord

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
  const cartTotal = cartIds.reduce((s, id) => { const it = byId(id); return s + (it ? priceFor(it, isMember) * cart[id] : 0); }, 0);
  const submitCart = async (mode: "achat" | "dette") => {
    if (!cartIds.length) return;
    const missingSex = cartIds.filter(id => { const it = byId(id); return it && (it.cat || "").trim().startsWith("Stuff") && !stuffSex[id]; });
    if (missingSex.length) return flash("Indique ♂ Garçon ou ♀ Fille pour chaque Stuff avant d'envoyer.");
    const missingRar = cartIds.filter(id => { const it = byId(id); return it && it.rarities && Object.keys(it.rarities).length > 0 && !weaponRarity[id]; });
    if (missingRar.length) return flash("Choisis la rareté voulue pour chaque arme avant d'envoyer.");
    setSending(true);
    const items = cartIds.map(id => { const it = byId(id)!; const isStuff = (it.cat || "").trim().startsWith("Stuff"); const rk = weaponRarity[id]; const rlabel = it.rarities && rk && RARITY_META[rk] ? ` (${RARITY_META[rk].l})` : ""; const name = isStuff && stuffSex[id] ? `${it.item} (${stuffSex[id]})` : `${it.item}${rlabel}`; return { name, quantity: cart[id], price: priceFor(it, isMember), cat: it.cat }; });
    const r = await fetch("/api/bank-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, mode }) });
    setSending(false);
    if (r.ok) { setCart({}); setStuffSex({}); flash(`Demande envoyée ✓ — ${cartIds.length} article(s) en ${mode === "dette" ? "dette" : "achat"}. Le staff va valider.`); load(); }
    else { const e = await r.json().catch(() => ({} as any)); flash(e.error || "Erreur — as-tu un personnage déclaré ?"); }
  };

  const filtered = shop.filter(s => (!catF || s.cat === catF) && (!q || s.item.toLowerCase().includes(q.toLowerCase())));
  // Regroupe les requêtes par panier (batchId) → 1 carte par transaction
  const reqGroups = reqs.reduce<{ key: string; items: Req[] }[]>((acc, r) => { const k = r.batchId || r.id; let g = acc.find(x => x.key === k); if (!g) { g = { key: k, items: [] }; acc.push(g); } g.items.push(r); return acc; }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader banner="/assets/site/banners/banner-banque.png" title="Boutique" subtitle="Parcours le coffre de guilde, ajoute au panier, et fais ta demande (achat ou dette). Le staff valide depuis l'AirGuild." />

      {toast && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      {!isMember && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,140,26,.08)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Icon name="discord" size={20} style={{ color: "var(--orange)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: "var(--text)" }}>Tu consultes les <b>prix publics</b>. Rejoins <b>Vanguard</b> pour le <b style={{ color: "var(--green)" }}>prix membre</b> et pouvoir commander depuis le coffre.</div>
          <a href="/candidature" style={{ padding: "8px 14px", borderRadius: 8, background: "var(--orange)", color: "#0A0A0C", fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>Rejoindre Vanguard</a>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {([["boutique", "cart", "Boutique"], ["requetes", "clipboard", `Requêtes${reqs.length ? ` (${reqs.length})` : ""}`], ["dettes", "coins", `Dettes${debts.filter(d => d.status !== "REPAID").length ? ` (${debts.filter(d => d.status !== "REPAID").length})` : ""}`], ["rembourse", "check", `Remboursé${debts.filter(d => d.status === "REPAID").length ? ` (${debts.filter(d => d.status === "REPAID").length})` : ""}`]] as const).map(([k, ic, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'Rubik',sans-serif", border: `1px solid ${tab === k ? "var(--orange)" : "var(--border)"}`, background: tab === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: tab === k ? "var(--orange)" : "var(--text-muted)" }}><Icon name={ic} size={15} />{l}</button>
        ))}
      </div>

      {/* ── BOUTIQUE ── */}
      {tab === "boutique" && <div className="glass-card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}><Icon name="cart" size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Boutique de guilde <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>— articles en stock dans le coffre commun</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <VgSelect value={catF} onChange={setCatF} options={[{ value: "", label: "Toutes catégories" }, ...cats.map(c => ({ value: c, label: c }))]} minWidth={160} />
          <input placeholder="Rechercher un article…" value={q} onChange={e => setQ(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
        </div>
        <div className="shop-layout" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 470, overflowY: "auto", paddingRight: 4 }}>
            {shop.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Le coffre commun est vide pour l'instant — reviens quand le staff l'aura rempli.</div> :
             filtered.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Aucun article ne correspond à ta recherche.</div> :
             filtered.map(s => { const inCart = cart[s.id] || 0; return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-3)", border: `1px solid ${inCart ? "var(--orange)" : "var(--border)"}`, borderRadius: 9, padding: "7px 11px" }}>
                <div style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-2)", borderRadius: 7 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.icon ? <img src={s.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} /> : <Icon name="package" size={18} style={{ color: "var(--text-muted)" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.item}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.classe ? s.classe + " · " : ""}stock {s.stock} · <b style={{ color: "var(--gold)" }}>~{fmt(priceFor(s, isMember))}</b> périns{s.tiers && s.tiers.cau > 0 ? ` · caution ${fmt(s.tiers.cau)}` : ""}{s.tiers && !s.tiers.v ? " · dette uniquement" : ""}</div>
                  {s.rarities && Object.keys(s.rarities).length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                      {Object.keys(s.rarities).map(r => { const m = RARITY_META[r]; return m ? (
                        <span key={r} style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 5, color: m.c, border: `1px solid ${m.c}55`, background: `${m.c}14` }}>{m.l} ×{s.rarities![r]}</span>
                      ) : null; })}
                    </div>
                  )}
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
            <div className="font-heading" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}><Icon name="cart" size={15} style={{ color: "var(--orange)" }} /> Ton panier</div>
            {cartIds.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "14px 0", textAlign: "center" }}>Panier vide.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4, maxHeight: 240, overflowY: "auto" }}>
                {cartIds.map(id => { const it = byId(id); if (!it) return null; const isStuff = (it.cat || "").trim().startsWith("Stuff"); return (
                  <div key={id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.item}</span>
                      <span style={{ color: "var(--text-muted)" }}>×{cart[id]}</span>
                      <span style={{ color: "var(--gold)", minWidth: 58, textAlign: "right" }}>{fmt(priceFor(it, isMember) * cart[id])}</span>
                      <button onClick={() => setQty(id, 0)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                    </div>
                    {isStuff && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 2 }}>
                        <span style={{ fontSize: 10.5, color: stuffSex[id] ? "var(--text-muted)" : "var(--orange)", fontWeight: stuffSex[id] ? 400 : 700 }}>Sexe du Stuff :</span>
                        {(["G", "F"] as const).map(sx => (
                          <button key={sx} onClick={() => setStuffSex(p => ({ ...p, [id]: sx }))} style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 6, cursor: "pointer", border: `1px solid ${stuffSex[id] === sx ? "var(--orange)" : "var(--border)"}`, background: stuffSex[id] === sx ? "rgba(255,140,26,.16)" : "var(--bg-2)", color: stuffSex[id] === sx ? "var(--orange)" : "var(--text-muted)" }}>{sx === "G" ? "♂ Garçon" : "♀ Fille"}</button>
                        ))}
                      </div>
                    )}
                    {it.rarities && Object.keys(it.rarities).length > 0 && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 2, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10.5, color: weaponRarity[id] ? "var(--text-muted)" : "var(--orange)", fontWeight: weaponRarity[id] ? 400 : 700 }}>Rareté voulue :</span>
                        {Object.keys(it.rarities).map(rk => { const m = RARITY_META[rk]; if (!m) return null; const on = weaponRarity[id] === rk; return (
                          <button key={rk} onClick={() => setWeaponRarity(p => ({ ...p, [id]: rk }))} style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 6, cursor: "pointer", border: `1px solid ${on ? m.c : "var(--border)"}`, background: on ? `${m.c}22` : "var(--bg-2)", color: on ? m.c : "var(--text-muted)" }}>{m.l} <span style={{ opacity: 0.7, fontWeight: 400 }}>×{it.rarities![rk]}</span></button>
                        ); })}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, margin: "10px 0 12px", paddingTop: 10, borderTop: "1px solid var(--border)" }}><span style={{ color: "var(--text-muted)" }}>Total estimé</span><b style={{ color: "var(--gold)" }}>{fmt(cartTotal)} périns</b></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => submitCart("achat")} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "rgba(74,222,128,0.12)", color: "var(--green)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Icon name="cart" size={15} /> Demander en achat</button>
              <button onClick={() => submitCart("dette")} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--orange)", background: "rgba(255,140,26,0.12)", color: "var(--orange)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Icon name="edit" size={15} /> Demander en dette</button>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}><Icon name="info" size={11} style={{ display: "inline-block", verticalAlign: "-1px", marginRight: 4 }} />Ta demande part au staff qui valide (achat ou dette). Profil avec personnage requis.</div>
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
                        <span className="font-heading" style={{ fontWeight: 700 }}>{multi ? <><Icon name="cart" size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />Panier — {g.items.length} articles</> : (first.item ?? "Périns")}{!multi && first.quantity > 1 ? <span style={{ color: "var(--text-muted)" }}> ×{first.quantity}</span> : null}</span>
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
                      {first.status === "ACCEPTE_ACHAT" && <div style={{ fontSize: 13, color: "var(--green)", marginTop: 5 }}>Prix : <b>{fmt(first.prixFinal)}</b> périn</div>}
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
            {list.length === 0 ? <div className="glass-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>{tab === "rembourse" ? "Aucune dette remboursée pour l'instant." : "Aucune dette en cours."}</div> : (
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
                        {canDelete && <button onClick={() => deleteDebt(d.id)} title="Supprimer cette dette de l'historique (Vanguard)" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--red)", background: "rgba(248,113,113,.1)", color: "var(--red)", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={15} /></button>}
                      </div>
                      {d.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{d.reason}</div>}
                      {paid > 0 && <div style={{ fontSize: 12, color: "var(--green)", marginTop: 5 }}>Remboursé : {fmt(paid)} / {fmt(d.amount)}</div>}
                      {d.status === "ACCEPTED" && (() => { const reste = Math.max(0, d.amount - paid); return (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <input type="number" min={1} max={reste} placeholder="Montant à rembourser…" value={payAmt[d.id] ?? ""} onChange={e => setPayAmt(p => ({ ...p, [d.id]: e.target.value }))} style={{ width: 150, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 13 }} />
                          <button onClick={() => pay(d.id, Math.min(reste, Number(payAmt[d.id]) || 0))} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="coins" size={14} /> Rembourser</button>
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
