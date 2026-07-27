"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { canAccessGuild } from "@/config/roles";
import { enRetard, joursDeRetard, progressionDette, resteDette, totauxDettes } from "@/lib/dettes";
import { useCardFx } from "@/components/VgFx";

type Pay = { id: string; amount: number; note: string | null; createdAt: string; recordedBy?: string | null };
type Debt = { id: string; type: string; amount: number; item: string | null; reason: string | null; status: string; adminNote: string | null; payments: Pay[]; createdAt: string; creditor?: string | null; dueDate?: string | null; debtorName?: string | null; role?: "debiteur" | "detenteur" };
type Req = { id: string; kind: string; item: string | null; quantity: number; reason: string | null; status: string; prixPublic: string | null; prixFinal: string | null; adminNote: string | null; createdAt: string; batchId: string | null; cat: string | null; priceEach: number | null };
type Tiers = { v: boolean; d: boolean; pub: number; mem: number; det: number };
type Shop = { id: string; item: string; cat: string; classe: string; price: number; tiers?: Tiers; tiersByRarity?: Record<string, Tiers> | null; rarities?: Record<string, number> | null; stock: number; unit: string; icon: string | null };
// Raretés d'armes (mêmes clés/couleurs que le coffre AirGuild).
const RARITY_META: Record<string, { l: string; c: string }> = {
  rare: { l: "Rare", c: "#4EA8FF" }, epique: { l: "Épique", c: "#C77DFF" },
  legendaire: { l: "Légendaire", c: "#FF8C1A" }, premyth: { l: "Pré-myth.", c: "#FF5C8A" },
};
// Prix affiché selon le statut : membre de guilde → prix membre ; public → prix public.
// Prix applicable : si une rareté est précisée et qu'un tarif existe pour elle, il
// PRIME sur le tarif de l'objet — une Hache Rare et une Hache Pré-myth. n'ont pas
// le même prix. Sinon on retombe sur le tarif de l'objet.
const priceFor = (s: Shop, member: boolean, rarete?: string | null) => {
  const t = (rarete && s.tiersByRarity?.[rarete]) || s.tiers;
  return t ? (member ? t.mem : t.pub) : s.price;
};

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
  // Halo suivant le curseur + léger relief sur les panneaux (.fx-card), comme
  // sur l'accueil et le dashboard. Un seul écouteur délégué pour toute la page.
  useCardFx();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payAmt, setPayAmt] = useState<Record<string, string>>({});
  const [engDate, setEngDate] = useState<Record<string, string>>({});
  /** Fil ouvert (id de dette), son contenu, et le message en cours de frappe. */
  const [filOuvert, setFilOuvert] = useState<string | null>(null);
  const [fil, setFil] = useState<{ id: string; kind: string; author: string | null; body: string; createdAt: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  // ── Boutique ──
  const [shop, setShop] = useState<Shop[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [catF, setCatF] = useState(""); const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [stuffSex, setStuffSex] = useState<Record<string, "G" | "F">>({}); // #4 : préférence Garçon/Fille par Stuff
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
    if (r.ok) { setPayAmt(p => ({ ...p, [id]: "" })); flash("Remboursement enregistré"); load(); } else flash("Erreur");
  };

  /** Le debiteur s'engage sur une date de remboursement (une seule fois). */
  const engager = async (id: string, dueDate: string) => {
    if (!dueDate) return flash("Choisis une date de remboursement.");
    const r = await fetch(`/api/debts/${id}/engagement`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setEngDate(p => ({ ...p, [id]: "" })); flash("Engagement enregistré — le détenteur en est informé."); load(); }
    else flash(j.error ?? "Erreur");
  };

  /** Ouvre/ferme le fil d'une dette et charge son contenu. */
  const ouvrirFil = async (id: string) => {
    if (filOuvert === id) { setFilOuvert(null); return; }
    setFilOuvert(id); setFil([]); setMsg("");
    try { const r = await fetch(`/api/debts/${id}/fil`); if (r.ok) setFil(await r.json()); } catch {}
  };
  const envoyerMsg = async (id: string) => {
    const texte = msg.trim();
    if (!texte) return;
    const r = await fetch(`/api/debts/${id}/fil`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: texte }) });
    if (!r.ok) return flash("Message non envoyé.");
    setMsg("");
    try { const g = await fetch(`/api/debts/${id}/fil`); if (g.ok) setFil(await g.json()); } catch {}
  };

  const deleteDebt = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette dette de l'historique ?\nCette action est irréversible.")) return;
    const r = await fetch(`/api/debts/${id}`, { method: "DELETE" });
    if (r.ok) { flash("Dette supprimée"); load(); } else flash("Erreur — suppression refusée.");
  };

  // ── Panier ──
  // Clé de panier : "itemId" pour un objet simple, "itemId::rareté" pour une arme (une entrée par rareté).
  const baseIdOf = (key: string) => String(key).split("::")[0];
  const rarOf = (key: string) => { const p = String(key).split("::"); return p.length > 1 ? p[1] : null; };
  const byId = (key: string) => shop.find(s => s.id === baseIdOf(key));
  // Quantité max = stock de la RARETÉ de la clé (arme), sinon stock total de l'objet.
  const maxFor = (key: string) => { const it = byId(key); if (!it) return 0; const rk = rarOf(key); return (it.rarities && rk && it.rarities[rk] != null) ? it.rarities[rk] : it.stock; };
  const setQty = (key: string, v: number) => setCart(c => { const max = maxFor(key); const n = Math.max(0, Math.min(max, Math.round(v) || 0)); const cc = { ...c }; if (n <= 0) delete cc[key]; else cc[key] = n; return cc; });
  const cartIds = Object.keys(cart);
  const cartTotal = cartIds.reduce((s, id) => { const it = byId(id); return s + (it ? priceFor(it, isMember, rarOf(id)) * cart[id] : 0); }, 0);
  const submitCart = async (mode: "achat" | "dette") => {
    if (!cartIds.length) return;
    const missingSex = cartIds.filter(id => { const it = byId(id); return it && (it.cat || "").trim().startsWith("Stuff") && !stuffSex[id]; });
    if (missingSex.length) return flash("Indique Garçon ou Fille pour chaque Stuff avant d'envoyer.");
    // #5 — respecter les choix « Vendre » / « Dette » fixés au dépôt de chaque objet.
    if (mode === "achat") { const bad = cartIds.map(byId).find(it => it && it.tiers && it.tiers.v === false); if (bad) return flash(`« ${bad.item} » est proposé en dette uniquement (pas d'achat direct).`); }
    if (mode === "dette") { if (!isMember) return flash("La dette est réservée aux membres de la guilde."); const bad = cartIds.map(byId).find(it => it && it.tiers && it.tiers.d === false); if (bad) return flash(`« ${bad.item} » n'est pas disponible en dette.`); }
    setSending(true);
    const items = cartIds.map(key => { const it = byId(key)!; const isStuff = (it.cat || "").trim().startsWith("Stuff"); const rk = rarOf(key); const rlabel = rk && RARITY_META[rk] ? ` (${RARITY_META[rk].l})` : ""; const name = isStuff && stuffSex[key] ? `${it.item} (${stuffSex[key]})` : `${it.item}${rlabel}`; return { name, quantity: cart[key], price: priceFor(it, isMember, rk), cat: it.cat }; });
    const r = await fetch("/api/bank-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, mode }) });
    setSending(false);
    if (r.ok) { setCart({}); setStuffSex({}); flash(`Demande envoyée — ${cartIds.length} article(s) en ${mode === "dette" ? "dette" : "achat"}. Le staff va valider.`); load(); }
    else { const e = await r.json().catch(() => ({} as any)); flash(e.error || "Erreur — as-tu un personnage déclaré ?"); }
  };

  const filtered = shop.filter(s => (!catF || s.cat === catF) && (!q || s.item.toLowerCase().includes(q.toLowerCase())));
  // Regroupe les requêtes par panier (batchId) → 1 carte par transaction
  const reqGroups = reqs.reduce<{ key: string; items: Req[] }[]>((acc, r) => { const k = r.batchId || r.id; let g = acc.find(x => x.key === k); if (!g) { g = { key: k, items: [] }; acc.push(g); } g.items.push(r); return acc; }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Variante icône + titre : la bannière disponible dit « Banque », alors que
          la nav, l'onglet et le titre disent « Boutique ». Une tuile d'icône évite
          l'incohérence sans réclamer un nouvel asset. */}
      <PageHeader icon="cart" title="Boutique" subtitle="Parcours les objets du coffre de guilde, ajoute au panier et envoie ta demande — le détenteur te répond pour organiser l'échange." />

      {toast && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {([["boutique", "cart", "Boutique"], ["requetes", "clipboard", `Requêtes${reqs.length ? ` (${reqs.length})` : ""}`], ["dettes", "coins", `Dettes${debts.filter(d => d.status !== "REPAID").length ? ` (${debts.filter(d => d.status !== "REPAID").length})` : ""}`], ["rembourse", "check", `Remboursé${debts.filter(d => d.status === "REPAID").length ? ` (${debts.filter(d => d.status === "REPAID").length})` : ""}`]] as const).map(([k, ic, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'Rubik',sans-serif", border: `1px solid ${tab === k ? "var(--orange)" : "var(--border)"}`, background: tab === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: tab === k ? "var(--orange)" : "var(--text-muted)" }}><Icon name={ic} size={15} />{l}</button>
        ))}
      </div>

      {/* ── BOUTIQUE ── */}
      {tab === "boutique" && <div className="glass-card fx-card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}><Icon name="cart" size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Boutique de guilde <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>— articles en stock dans le coffre commun</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <VgSelect value={catF} onChange={setCatF} options={[{ value: "", label: "Toutes catégories" }, ...cats.map(c => ({ value: c, label: c }))]} minWidth={160} />
          <input placeholder="Rechercher un article…" value={q} onChange={e => setQ(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
        </div>
        <div className="shop-layout" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 470, overflowY: "auto", paddingRight: 4 }}>
            {shop.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Le coffre commun est vide pour l'instant — reviens quand le staff l'aura rempli.</div> :
             filtered.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Aucun article ne correspond à ta recherche.</div> :
             filtered.map(s => {
              const raritys = s.rarities ? Object.keys(s.rarities) : [];
              const isWeapon = raritys.length > 0;
              const inCart = isWeapon ? raritys.reduce((t, rk) => t + (cart[`${s.id}::${rk}`] || 0), 0) : (cart[s.id] || 0);
              return (
              <div key={s.id} className="vg-tr" style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--bg-3)", border: `1px solid ${inCart ? "var(--orange)" : "var(--border)"}`, borderRadius: 9, padding: "7px 11px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-2)", borderRadius: 7 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.icon ? <img src={s.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} /> : <Icon name="package" size={18} style={{ color: "var(--text-muted)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.item}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.classe ? s.classe + " · " : ""}stock {s.stock} · <b style={{ color: "var(--gold)" }}>{priceFor(s, isMember) > 0 ? <>~{fmt(priceFor(s, isMember))} périns</> : <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>prix à définir</span>}</b>{s.tiers && !s.tiers.v ? " · dette uniquement" : ""}{isWeapon ? " · choisis la/les rareté(s) ↓" : ""}</div>
                  </div>
                  {!isWeapon && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => setQty(s.id, inCart - 1)} style={stepBtn}>−</button>
                      <input value={inCart} onChange={e => setQty(s.id, +e.target.value || 0)} style={{ ...inp, width: 42, textAlign: "center", padding: "5px 4px", fontSize: 13 }} />
                      <button onClick={() => setQty(s.id, inCart + 1)} style={stepBtn}>＋</button>
                    </div>
                  )}
                </div>
                {isWeapon && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 44 }}>
                    {raritys.map(rk => { const m = RARITY_META[rk]; if (!m) return null; const key = `${s.id}::${rk}`; const q = cart[key] || 0; const stk = s.rarities![rk]; return (
                      <div key={rk} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 5, color: m.c, border: `1px solid ${m.c}55`, background: `${m.c}14`, minWidth: 78 }}>{m.l}</span>
                        <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>stock {stk}</span>
                        {/* Le prix de CETTE rareté : c'est la seule information qui
                            permet de choisir en connaissance de cause. */}
                        {(() => { const pr = priceFor(s, isMember, rk); return pr > 0
                          ? <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--orange)" }}>{fmt(pr)} périns</span>
                          : <span style={{ fontSize: 10.5, fontStyle: "italic", color: "var(--text-muted)" }}>prix à définir</span>; })()}
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, opacity: stk > 0 ? 1 : 0.4 }}>
                          <button onClick={() => setQty(key, q - 1)} style={stepBtn}>−</button>
                          <input value={q} onChange={e => setQty(key, +e.target.value || 0)} style={{ ...inp, width: 40, textAlign: "center", padding: "4px 3px", fontSize: 13 }} />
                          <button onClick={() => setQty(key, q + 1)} style={stepBtn}>＋</button>
                        </div>
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            ); })}
          </div>
          <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: 14, alignSelf: "start" }}>
            <div className="font-heading" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}><Icon name="cart" size={15} style={{ color: "var(--orange)" }} /> Ton panier</div>
            {cartIds.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "14px 0", textAlign: "center" }}>Panier vide.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4, maxHeight: 240, overflowY: "auto" }}>
                {cartIds.map(id => { const it = byId(id); if (!it) return null; const isStuff = (it.cat || "").trim().startsWith("Stuff"); const rk = rarOf(id); const rm = rk ? RARITY_META[rk] : null; return (
                  <div key={id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.item}{rm ? <span style={{ color: rm.c, fontWeight: 700 }}> · {rm.l}</span> : null}</span>
                      <span style={{ color: "var(--text-muted)" }}>×{cart[id]}</span>
                      <span style={{ color: "var(--orange)", minWidth: 58, textAlign: "right" }}>{fmt(priceFor(it, isMember, rarOf(id)) * cart[id])}</span>
                      <button onClick={() => setQty(id, 0)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                    </div>
                    {isStuff && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 2 }}>
                        <span style={{ fontSize: 10.5, color: stuffSex[id] ? "var(--text-muted)" : "var(--orange)", fontWeight: stuffSex[id] ? 400 : 700 }}>Sexe du Stuff :</span>
                        {(["G", "F"] as const).map(sx => (
                          <button key={sx} onClick={() => setStuffSex(p => ({ ...p, [id]: sx }))} style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 6, cursor: "pointer", border: `1px solid ${stuffSex[id] === sx ? "var(--orange)" : "var(--border)"}`, background: stuffSex[id] === sx ? "rgba(255,140,26,.16)" : "var(--bg-2)", color: stuffSex[id] === sx ? "var(--orange)" : "var(--text-muted)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={sx === "G" ? "male" : "female"} size={12} />{sx === "G" ? "Garçon" : "Fille"}</span></button>
                        ))}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, margin: "10px 0 12px", paddingTop: 10, borderTop: "1px solid var(--border)" }}><span style={{ color: "var(--text-muted)" }}>Total estimé</span><b style={{ color: "var(--gold)" }}>{fmt(cartTotal)} périns</b></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => submitCart("achat")} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "rgba(74,222,128,0.12)", color: "var(--green)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Icon name="cart" size={15} /> Demander en achat</button>
              {isMember && <button onClick={() => submitCart("dette")} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--orange)", background: "rgba(255,140,26,0.12)", color: "var(--orange)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Icon name="edit" size={15} /> Demander en dette</button>}
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
              {reqs.length === 0 ? <div className="glass-card fx-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>Aucune requête en cours.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reqGroups.map(g => {
                  const first = g.items[0];
                  const st = REQ_STATUS[first.status] ?? REQ_STATUS.PENDING;
                  const total = g.items.reduce((s, r) => s + (r.priceEach || 0) * r.quantity, 0);
                  const multi = g.items.length > 1;
                  return (
                    <div key={g.key} className="glass-card fx-card" style={{ padding: 14 }}>
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

            {/* Totaux. Separes par role : ce que JE dois et ce qu'on ME doit sont
                deux sommes qu'il ne faut surtout pas melanger. */}
            {tab === "dettes" && list.length > 0 && (() => {
              const mien = totauxDettes(list.filter(d => d.role !== "detenteur"));
              const tenu = totauxDettes(list.filter(d => d.role === "detenteur"));
              const bloc = (t: ReturnType<typeof totauxDettes>, titre: string, couleur: string) => t.nb === 0 ? null : (
                <div style={{ flex: "1 1 220px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: .6, color: "var(--text-muted)", marginBottom: 6 }}>{titre}</div>
                  <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: couleur }}>{fmt(t.reste)}<span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}> restant sur {fmt(t.du)}</span></div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                    {t.nb} dette{t.nb > 1 ? "s" : ""} · {fmt(t.paye)} déjà remboursé
                    {t.enRetard > 0 && <span style={{ color: "var(--red)", fontWeight: 700 }}> · {t.enRetard} en retard</span>}
                  </div>
                </div>
              );
              const blocs = [bloc(mien, "Ce que je dois", "var(--gold)"), bloc(tenu, "Ce qu'on me doit", "var(--green)")].filter(Boolean);
              return blocs.length ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>{blocs}</div> : null;
            })()}
            {list.length === 0 ? <div className="glass-card fx-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>{tab === "rembourse" ? "Aucune dette remboursée pour l'instant." : "Aucune dette en cours."}</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {list.map(d => {
                  const st = DEBT_STATUS[d.status] ?? DEBT_STATUS.REQUESTED;
                  const paid = d.payments.reduce((s, p) => s + p.amount, 0);
                  const retard = enRetard(d);
                  const jours = joursDeRetard(d);
                  const pct = progressionDette(d);
                  return (
                    <div key={d.id} className="glass-card fx-card" style={{ padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="font-heading" style={{ fontWeight: 700 }}>{fmt(d.amount)} {d.type === "PENYA" ? "périn" : d.type.toLowerCase()}</span>
                        {d.item && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>· {d.item}</span>}
                        {retard && (
                          <span title={`Échéance dépassée de ${jours} jour${jours > 1 ? "s" : ""}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--red)", background: "rgba(248,113,113,.12)", color: "var(--red)" }}>
                            <Icon name="alert" size={12} />En retard de {jours} j
                          </span>
                        )}
                        <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${st.c}`, color: st.c }}>{st.l}</span>
                        {canDelete && <button onClick={() => deleteDebt(d.id)} title="Supprimer cette dette de l'historique (Vanguard)" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--red)", background: "rgba(248,113,113,.1)", color: "var(--red)", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={15} /></button>}
                      </div>
                      {d.role === "detenteur" && d.debtorName && (
                        <div style={{ fontSize: 12, marginTop: 5, color: "var(--orange)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="user" size={13} /><b>{d.debtorName}</b> te doit cette somme
                        </div>
                      )}
                      {d.reason && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 5 }}>{d.reason}</div>}
                      {paid > 0 && (
                        <div style={{ marginTop: 7 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: "var(--green)" }}>Remboursé : {fmt(paid)} / {fmt(d.amount)}</span>
                            <span style={{ color: "var(--text-muted)" }}>reste {fmt(resteDette(d))}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 4, background: "var(--bg-3)", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: pct >= 100 ? "var(--green)" : "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .35s" }} />
                          </div>
                        </div>
                      )}
                      {/* Fil : discussion et journal au meme endroit. Remplace le
                          salon Discord — les evenements systeme (engagement,
                          versement) s'y inscrivent aussi, donc l'historique se lit
                          d'un bloc au lieu d'etre reparti entre deux outils. */}
                      <div style={{ marginTop: 9 }}>
                        <button onClick={() => ouvrirFil(d.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: filOuvert === d.id ? "var(--orange)" : "var(--text-muted)", cursor: "pointer" }}>
                          <Icon name={filOuvert === d.id ? "chevron-down" : "chevron-right"} size={12} />
                          <Icon name="message" size={13} />Discussion et historique
                        </button>
                        {filOuvert === d.id && (
                          <div style={{ marginTop: 8, padding: 11, borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                            <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 7, marginBottom: 9 }}>
                              {fil.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Rien pour l&apos;instant. Écris ici pour convenir de la remise ou du remboursement.</div>}
                              {fil.map(m => m.kind === "system" ? (
                                /* Un fait enregistre par le systeme, pas une parole :
                                   il porte un liseré et aucun auteur, pour qu'on ne
                                   le prenne pas pour l'avis de quelqu'un. */
                                <div key={m.id} style={{ fontSize: 12, color: "var(--text-muted)", borderLeft: "2px solid var(--orange)", paddingLeft: 9 }}>
                                  {m.body}
                                  <span style={{ opacity: .7 }}> · {new Date(m.createdAt).toLocaleDateString("fr-FR")}</span>
                                </div>
                              ) : (
                                <div key={m.id} style={{ fontSize: 13 }}>
                                  <b style={{ color: "var(--orange)" }}>{m.author}</b>
                                  <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}> · {new Date(m.createdAt).toLocaleDateString("fr-FR")}</span>
                                  <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 7 }}>
                              <input value={msg} onChange={e => setMsg(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerMsg(d.id); } }}
                                placeholder="Écrire un message…" style={{ ...inp, flex: 1, fontSize: 13 }} />
                              <button className="vg-btn" onClick={() => envoyerMsg(d.id)} style={{ padding: "8px 14px", fontSize: 12.5 }}>Envoyer</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Engagement : c'est le client qui donne la date, une fois
                          l'objet remis. Tant qu'elle manque, aucun suivi de retard
                          n'est possible — d'ou la demande bien visible. */}
                      {d.role !== "detenteur" && d.status === "ACCEPTED" && !d.dueDate && (
                        <div style={{ marginTop: 9, padding: 11, borderRadius: 9, background: "rgba(255,140,26,.08)", border: "1px solid rgba(255,140,26,.32)" }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--orange)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <Icon name="calendar" size={13} />Engage-toi sur une date de remboursement
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 8 }}>
                            Une date approximative suffit, mais elle t&apos;engage : {d.creditor ?? "le détenteur"} et le staff la verront. Elle ne se modifie plus ensuite.
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <input type="date" value={engDate[d.id] ?? ""} onChange={e => setEngDate(p => ({ ...p, [d.id]: e.target.value }))}
                              min={new Date().toISOString().slice(0, 10)}
                              max={new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10)}
                              style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", fontFamily: "inherit", fontSize: 13 }} />
                            <button onClick={() => engager(d.id, engDate[d.id] ?? "")} className="vg-btn" style={{ padding: "7px 14px", fontSize: 12.5 }}>Je m&apos;engage</button>
                          </div>
                        </div>
                      )}
                      {d.dueDate && (
                        <div style={{ fontSize: 12, marginTop: 5, color: retard ? "var(--red)" : "var(--gold)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="calendar" size={13} />Remboursement promis pour le {new Date(d.dueDate).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                      {/* Historique : chaque remboursement, avec qui l'a saisi. C'est la
                          trace qui permet au detenteur et au staff de suivre sans discussion. */}
                      {d.payments.length > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
                          {d.payments.map(p => (
                            <div key={p.id} style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Icon name="check" size={12} style={{ color: "var(--green)" }} />
                              <b style={{ color: "var(--green)" }}>{fmt(p.amount)} périns</b>
                              <span>· {new Date(p.createdAt).toLocaleDateString("fr-FR")}</span>
                              {p.recordedBy && <span>· saisi par {p.recordedBy}</span>}
                              {p.note && <span>· {p.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Le remboursement est saisi par le DETENTEUR de l'objet (ou le
                          staff), pas par le debiteur : il attesterait de son propre
                          paiement. On n'affiche donc le champ qu'aux personnes autorisees. */}
                      {d.status === "ACCEPTED" && (() => {
                        const reste = Math.max(0, d.amount - paid);
                        const jeSuisDetenteur = d.role === "detenteur";
                        if (!jeSuisDetenteur && !canDelete) return (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 9, display: "flex", alignItems: "center", gap: 7 }}>
                            <Icon name="info" size={13} />
                            {d.creditor ? <>C&apos;est <b style={{ color: "var(--text)" }}>{d.creditor}</b> qui enregistre les remboursements reçus.</> : "Le détenteur de l'objet enregistre les remboursements reçus."}
                          </div>
                        );
                        return (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <input type="number" min={1} max={reste} placeholder="Montant reçu…" value={payAmt[d.id] ?? ""} onChange={e => setPayAmt(p => ({ ...p, [d.id]: e.target.value }))} style={{ width: 150, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 13 }} />
                          <button onClick={() => pay(d.id, Math.min(reste, Number(payAmt[d.id]) || 0))} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "transparent", color: "var(--green)", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="coins" size={14} /> J&apos;ai reçu</button>
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
