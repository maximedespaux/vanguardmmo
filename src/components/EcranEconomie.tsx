"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { Fil } from "@/components/Fil";
import { BulleObjet } from "@/components/BulleObjet";
import { ObjetSurMesure } from "@/components/ObjetSurMesure";
import { specDepuisJson } from "@/lib/specObjet";
import { canAccessGuild, canAccessAdmin } from "@/config/roles";
import { useCardFx } from "@/components/VgFx";

type Req = { id: string; kind: string; item: string | null; quantity: number; reason: string | null; status: string; prixPublic: string | null; prixFinal: string | null; adminNote: string | null; createdAt: string; batchId: string | null; cat: string | null; priceEach: number | null; spec?: unknown };
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

const REQ_STATUS: Record<string, { l: string; c: string }> = {
  PENDING: { l: "En attente", c: "var(--gold)" },
  ACCEPTE_ACHAT: { l: "Achat accepté", c: "var(--green)" },
  REFUSE: { l: "Refusée", c: "var(--red)" }, ANNULE: { l: "Annulée", c: "var(--text-muted)" },
};
const KIND_LABEL: Record<string, string> = { OBJET_IG: "Objet IG", ITEM: "Items", PERINS: "Périns" };
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 14 };
const stepBtn: React.CSSProperties = { width: 24, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", fontSize: 14 };
const fmt = (n: string | number | null) => (n == null ? "?" : Number(n).toLocaleString("fr-FR"));

/**
 * Deux écrans seulement, désormais : la boutique et la conversation qui suit.
 * Le système de dettes a été retiré — trop lourd pour ce qu'il rendait — et
 * avec lui le verrou qui bloquait les demandes, les relances et les paliers de
 * caution. Ce qui reste est ce que la guilde utilisait vraiment : on demande un
 * objet du coffre, le staff répond, on s'arrange dans le fil.
 */

export function EcranEconomie() {
  // Halo suivant le curseur + léger relief sur les panneaux (.fx-card), comme
  // sur l'accueil et le dashboard. Un seul écouteur délégué pour toute la page.
  useCardFx();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  // ── Boutique ──
  const [shop, setShop] = useState<Shop[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [catF, setCatF] = useState(""); const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [stuffSex, setStuffSex] = useState<Record<string, "G" | "F">>({}); // #4 : préférence Garçon/Fille par Stuff
  const [sending, setSending] = useState(false);
  /** Pseudo EN JEU : c'est là que l'objet part par courrier. Pré-rempli avec
   *  le personnage principal — le retaper à chaque demande est une corvée. */
  const [perso, setPerso] = useState("");
  const [mesPersos, setMesPersos] = useState<{ name: string; isMain: boolean }[]>([]);
  /** Deux façons de demander, deux panneaux : ce qui dort au coffre, et ce qui
   *  doit être fabriqué. Les mélanger dans une seule liste rendait le sur
   *  mesure invisible — il n'a pas de ligne dans le stock. */
  const [panneau, setPanneau] = useState<"stock" | "surMesure">("stock");
  const { data: session } = useSession();
  const canDelete = ["VANGUARD", "DIRECTION"].includes((session?.user as unknown as { role?: string })?.role ?? "");
  const role = (session?.user as any)?.role ?? "RECRUE";
  const isMember = canAccessGuild(role); // membre de guilde → prix membre ; sinon prix public + invitation Discord

  const load = async () => {
    setLoading(true);
    try {
      const a = await fetch("/api/bank-request");
      if (a.ok) setReqs(await a.json());
    } catch {}
    setLoading(false);
  };
  const loadShop = async () => { try { const r = await fetch("/api/shop"); if (r.ok) { const d = await r.json(); setShop(d.items ?? []); setCats(d.cats ?? []); } } catch {} };
  useEffect(() => { load(); loadShop(); }, []);
  useEffect(() => {
    fetch("/api/characters").then((r) => (r.ok ? r.json() : [])).then((cs: { name: string; isMain: boolean }[]) => {
      setMesPersos(cs ?? []);
      const principal = cs?.find((c) => c.isMain) ?? cs?.[0];
      if (principal) setPerso(principal.name);
    }).catch(() => {});
  }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };




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
  const submitCart = async () => {
    if (!cartIds.length) return;
    const missingSex = cartIds.filter(id => { const it = byId(id); return it && (it.cat || "").trim().startsWith("Stuff") && !stuffSex[id]; });
    if (missingSex.length) return flash("Indique Garçon ou Fille pour chaque Stuff avant d'envoyer.");
    if (!perso.trim()) return flash("Indique ton pseudo en jeu : c'est là que l'objet sera envoyé par courrier.");
      // Le palier « dette uniquement » n'a plus de sens : tout se demande, le
    // staff décide au cas par cas dans la conversation.
    setSending(true);
    const items = cartIds.map(key => { const it = byId(key)!; const isStuff = (it.cat || "").trim().startsWith("Stuff"); const rk = rarOf(key); const rlabel = rk && RARITY_META[rk] ? ` (${RARITY_META[rk].l})` : ""; const name = isStuff && stuffSex[key] ? `${it.item} (${stuffSex[key]})` : `${it.item}${rlabel}`; return { name, quantity: cart[key], price: priceFor(it, isMember, rk), cat: it.cat }; });
    const r = await fetch("/api/bank-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, characterName: perso.trim() }) });
    setSending(false);
    if (r.ok) { setCart({}); setStuffSex({}); flash(`Demande envoyée — ${cartIds.length} article(s). Le staff va répondre dans la conversation.`); load(); }
    else { const e = await r.json().catch(() => ({} as any)); flash(e.error || "Erreur — as-tu un personnage déclaré ?"); }
  };

  const filtered = shop.filter(s => (!catF || s.cat === catF) && (!q || s.item.toLowerCase().includes(q.toLowerCase())));
  // Regroupe les requêtes par panier (batchId) → 1 carte par transaction
  const reqGroups = reqs.reduce<{ key: string; items: Req[] }[]>((acc, r) => { const k = r.batchId || r.id; let g = acc.find(x => x.key === k); if (!g) { g = { key: k, items: [] }; acc.push(g); } g.items.push(r); return acc; }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Une tuile d'icône plutôt que la bannière : elle dit « Banque » alors que
          tout le reste dit « Boutique ». */}
      <PageHeader icon="cart" title="Boutique" subtitle="Parcours les objets du coffre de guilde, ajoute au panier et envoie ta demande — la suite se règle dans la conversation." />

      {toast && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {([["stock", "cart", "Acheter au coffre"], ["surMesure", "hammer", "Objet sur mesure"]] as const).map(([k, ic, l]) => (
          <button key={k} onClick={() => setPanneau(k)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'Rubik',sans-serif", border: `1px solid ${panneau === k ? "var(--orange)" : "var(--border)"}`, background: panneau === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: panneau === k ? "var(--orange)" : "var(--text-muted)" }}>
            <Icon name={ic} size={15} />{l}
          </button>
        ))}
      </div>

      {panneau === "surMesure" && <ObjetSurMesure onEnvoye={load} />}

      {panneau === "stock" && <div className="glass-card fx-card" style={{ padding: 18, marginBottom: 16 }}>
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
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.classe ? s.classe + " · " : ""}stock {s.stock} · <b style={{ color: "var(--gold)" }}>{priceFor(s, isMember) > 0 ? <>~{fmt(priceFor(s, isMember))} périns</> : <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>prix à définir</span>}</b>{isWeapon ? " · choisis la/les rareté(s) ↓" : ""}</div>
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
                  <div className="vg-rarete-liste" style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 44 }}>
                    {raritys.map(rk => { const m = RARITY_META[rk]; if (!m) return null; const key = `${s.id}::${rk}`; const q = cart[key] || 0; const stk = s.rarities![rk]; return (
                      <div key={rk} className="vg-ligne-dense" style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            {/* Le pseudo EN JEU, juste au-dessus du bouton : c'est la dernière
                chose qu'on vérifie avant d'envoyer, et l'objet part par courrier. */}
            <div style={{ marginBottom: 9 }}>
              <span style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 4 }}>Pseudo en jeu *</span>
              {mesPersos.length > 1 ? (
                <select value={perso} onChange={(e) => setPerso(e.target.value)} style={{ ...inp, width: "100%" }}>
                  {mesPersos.map((c) => <option key={c.name} value={c.name}>{c.name}{c.isMain ? " (principal)" : ""}</option>)}
                </select>
              ) : (
                <input value={perso} onChange={(e) => setPerso(e.target.value)} placeholder="ton personnage en jeu" style={{ ...inp, width: "100%" }} />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => submitCart()} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "rgba(74,222,128,0.12)", color: "var(--green)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Icon name="cart" size={15} /> Demander ces objets</button>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}><Icon name="info" size={11} style={{ display: "inline-block", verticalAlign: "-1px", marginRight: 4 }} />Ta demande part au staff, qui répond dans la conversation. Profil avec personnage requis.</div>
          </div>
        </div>
      </div>}

      <style>{`@media(max-width:760px){.shop-layout{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
