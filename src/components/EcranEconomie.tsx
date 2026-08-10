"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { Fil } from "@/components/Fil";
import { BulleObjet } from "@/components/BulleObjet";
import { ObjetSurMesure } from "@/components/ObjetSurMesure";
import { ChoixBoutique, type ChoixFait } from "@/components/ChoixBoutique";
import { RequetesClients } from "@/components/RequetesClients";
import { MesCommandes } from "@/components/MesCommandes";
import { specDepuisJson } from "@/lib/specObjet";
import { canAccessAdmin } from "@/config/roles";
import { ChampPseudo } from "@/components/ChampPseudo";
import { ChoixPaiement, type Paiement } from "@/components/ChoixPaiement";
import { MontantDemande } from "@/components/MontantDemande";
import { ConfirmationCommande, type LigneCommande } from "@/components/ConfirmationCommande";
import { useCardFx } from "@/components/VgFx";

type Req = { id: string; kind: string; item: string | null; quantity: number; reason: string | null; status: string; prixPublic: string | null; prixFinal: string | null; adminNote: string | null; createdAt: string; batchId: string | null; cat: string | null; priceEach: number | null; spec?: unknown };
type Tiers = { v: boolean; prix: number };
type Shop = { id: string; item: string; cat: string; classe: string; price: number; tiers?: Tiers; tiersByRarity?: Record<string, Tiers> | null; rarities?: Record<string, number> | null; stock: number; unit: string; icon: string | null };
// Raretés d'armes (mêmes clés/couleurs que le coffre AirGuild).
const RARITY_META: Record<string, { l: string; c: string }> = {
  rare: { l: "Rare", c: "#4EA8FF" }, epique: { l: "Épique", c: "#C77DFF" },
  legendaire: { l: "Légendaire", c: "#FF8C1A" }, premyth: { l: "Pré-myth.", c: "#FF5C8A" },
};
/** L'ordre du jeu, du plus commun au plus rare. Les clés arrivaient dans
 *  l'ordre où le coffre avait été parcouru — on lisait « Pré-myth. » avant
 *  « Légendaire », ce qui ne veut rien dire pour un joueur. */
const ORDRE_RARETE = ["rare", "epique", "legendaire", "premyth"];
/**
 * LE prix — il n'y en a plus qu'un.
 *
 * Il y avait un tarif public et un tarif membre. La boutique n'étant plus
 * ouverte hors guilde, le premier ne s'affichait plus jamais ; et surtout, un
 * objet doit avoir UN prix, celui de la guilde, sinon deux d'entre nous se font
 * concurrence sur la même pièce.
 *
 * La rareté, elle, garde son mot : si un tarif existe pour la rareté demandée,
 * il PRIME — une Hache Rare et une Hache Pré-mythique ne valent pas pareil.
 */
const priceFor = (s: Shop, rarete?: string | null) => {
  const t = (rarete && s.tiersByRarity?.[rarete]) || s.tiers;
  return t ? t.prix : s.price;
};

/**
 * « ≈ 12 AP » à côté du prix en périns, quand la guilde a fixé un cours.
 *
 * Jamais « ≈ 0 AP » : un objet qui coûte quelque chose ne vaut pas zéro
 * Airpoint. Sous la barre du 1 AP on se tait — la conversion n'apprend rien,
 * et un zéro se lit comme « gratuit ».
 */
const enAP = (perins: number, taux: number) => {
  if (taux <= 0 || perins <= 0) return "";
  const ap = Math.round(perins / taux);
  return ap >= 1 ? `≈ ${ap.toLocaleString("fr-FR")} AP` : "";
};

/** Le plus bas et le plus haut prix d'une arme suivie par rareté. */
const fourchette = (s: Shop) => {
  const t = s.tiersByRarity ? Object.values(s.tiersByRarity).map((x) => x.prix).filter((n) => n > 0) : [];
  return t.length ? { min: Math.min(...t), max: Math.max(...t) } : null;
};

/**
 * Deux gestes, deux groupes.
 *
 * On COMMANDE (au coffre ou sur mesure), puis on SUIT ce qu'on a commandé.
 * Servir les commandes des autres est un troisième geste, et il n'appartient
 * qu'au staff.
 */
const GROUPES = [
  { titre: "Commander", staff: false, onglets: [["stock", "cart", "Au coffre"], ["surMesure", "hammer", "Sur mesure"]] as const },
  { titre: "Suivre", staff: false, onglets: [["commande", "message", "Ma commande"]] as const },
  { titre: "Servir", staff: true, onglets: [["requetes", "package", "À livrer"]] as const },
];

/** Ce qu'on fait dans ce panneau, en une phrase — affichée, pas cachée. */
const EXPLIQUE: Record<string, string> = {
  stock: "Le catalogue de ce qui dort dans les coffres de la guilde. Choisis, remplis ton panier, commande.",
  surMesure: "La pièce n'est pas au coffre : décris-la exactement, elle sera cherchée ou fabriquée pour toi.",
  commande: "Ce que TU as commandé — par l'un ou l'autre chemin — et où ça en est : qui fournit, à quel prix, quand.",
  requetes: "Les commandes des AUTRES, celles que la guilde doit servir. À prendre en charge, seul ou à plusieurs.",
};

const REQ_STATUS: Record<string, { l: string; c: string }> = {
  PENDING: { l: "En attente", c: "var(--gold)" },
  ACCEPTE_ACHAT: { l: "Achat accepté", c: "var(--green)" },
  REFUSE: { l: "Refusée", c: "var(--red)" }, ANNULE: { l: "Annulée", c: "var(--text-muted)" },
};
const KIND_LABEL: Record<string, string> = { OBJET_IG: "Objet IG", ITEM: "Items", PERINS: "Périns" };
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 14 };
/* Les +/- du panier. Ils faisaient 24 x 26 : intouchables au doigt, alors que
   le plancher confortable est 44. On ne grossit pas le dessin — il tiendrait
   toute la ligne — on agrandit la ZONE : le cadre reste petit, la surface
   sensible deborde de part et d'autre grace au pseudo-element. */
const stepBtn: React.CSSProperties = { position: "relative", width: 26, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", fontSize: 14 };
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
  /* Le cours de l'Airpoint, fixé par la guilde dans l'AirGuild. 0 = aucun cours
     annoncé : on n'affiche alors pas de conversion, plutôt que d'en inventer. */
  const [tauxAP, setTauxAP] = useState(0);
  const [catF, setCatF] = useState(""); const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [stuffSex, setStuffSex] = useState<Record<string, "G" | "F">>({}); // #4 : préférence Garçon/Fille par Stuff
  const [sending, setSending] = useState(false);
  /** Le récapitulatif ouvert avant l'envoi. */
  const [aRelire, setARelire] = useState(false);
  /** Ce que l'acheteur est prêt à mettre — obligatoire, comme sur mesure. */
  const [estimP, setEstimP] = useState("");
  const [estimAp, setEstimAp] = useState("");
  const [estimManque, setEstimManque] = useState(false);
  const [persoManque, setPersoManque] = useState(false);
  /** Un mot libre joint à la commande. Facultatif. */
  const [precision, setPrecision] = useState("");
  /** Pseudo EN JEU : c'est là que l'objet part par courrier. Pré-rempli avec
   *  le personnage principal — le retaper à chaque demande est une corvée. */
  const [perso, setPerso] = useState("");
  const [mesPersos, setMesPersos] = useState<{ name: string; isMain: boolean }[]>([]);
  /** Deux façons de demander, deux panneaux : ce qui dort au coffre, et ce qui
   *  doit être fabriqué. Les mélanger dans une seule liste rendait le sur
   *  mesure invisible — il n'a pas de ligne dans le stock. */
  const [panneau, setPanneau] = useState<"stock" | "surMesure" | "commande" | "requetes">("stock");
  const [paiement, setPaiement] = useState<Paiement>("perins");
  /** La question posée à l'entrée : acheter au coffre, ou faire fabriquer. */
  const [choixOuvert, setChoixOuvert] = useState(false);
  // Arrivée depuis l'AirBuilder (« Demander cet objet ») : la pièce attend dans
  // le panneau sur mesure, autant l'ouvrir. Sans ça, le joueur atterrissait sur
  // le catalogue du coffre et sa pièce restait invisible.
  //
  // Ces deux cas court-circuitent la question d'entrée : elle n'a plus lieu
  // d'être quand la réponse est déjà dans l'adresse (`?piece=1` au retour du
  // builder, `?mode=` quand on a déjà choisi une fois).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("piece")) { setPanneau("surMesure"); return; }
    const mode = p.get("mode");
    if (mode === "stock" || mode === "surMesure" || mode === "commande" || mode === "requetes") { setPanneau(mode); return; }
    setChoixOuvert(true);
  }, []);
  /** Le choix se note dans l'adresse : un retour arrière ne repose pas la question. */
  const repondre = (c: ChoixFait) => {
    setPanneau(c); setChoixOuvert(false);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("mode", c);
      window.history.replaceState(null, "", u);
    } catch { /* pas bloquant */ }
  };
  const { data: session } = useSession();
  const canDelete = ["VANGUARD", "DIRECTION"].includes((session?.user as unknown as { role?: string })?.role ?? "");
  const role = (session?.user as any)?.role ?? "RECRUE";
  /* Le verrou reel est cote serveur (`/api/quetes/a-prendre` et `enQuete`
     exigent un role de guilde) : ce drapeau ne decide que de l'affichage, et il
     est toujours faux en production. Meme convention que la messagerie. */
  const estStaff = canAccessAdmin(role) || process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";

  const load = async () => {
    setLoading(true);
    try {
      const a = await fetch("/api/bank-request");
      if (a.ok) setReqs(await a.json());
    } catch {}
    setLoading(false);
  };
  const loadShop = async () => { try { const r = await fetch("/api/shop"); if (r.ok) { const d = await r.json(); setShop(d.items ?? []); setCats(d.cats ?? []); setTauxAP(+d.tauxAP || 0); } } catch {} };
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
  const cartTotal = cartIds.reduce((s, id) => { const it = byId(id); return s + (it ? priceFor(it, rarOf(id)) * cart[id] : 0); }, 0);

  /* LE MONTANT SE REMPLIT TOUT SEUL, depuis le tarif de la guilde.
     L'objet est au coffre : il a un prix, ce n'est pas au client de le
     deviner. Il choisit la monnaie, le montant suit — arrondi à l'unité, et
     réparti exactement quand il règle dans les deux. S'il trouve le tarif trop
     cher, ça se discute avec le détenteur, pas en tapant un autre chiffre. */
  useEffect(() => {
    if (!cartTotal) { setEstimP(""); setEstimAp(""); return; }
    if (paiement === "perins") { setEstimP(String(cartTotal)); setEstimAp(""); return; }
    if (paiement === "airpoints") {
      // Sans cours annoncé, il n'y a rien à convertir : on laisse la main.
      setEstimP("");
      setEstimAp(tauxAP > 0 ? String(Math.max(1, Math.round(cartTotal / tauxAP))) : "");
      return;
    }
    // Mixte : on part de « tout en périns », le client déplace ensuite ce qu'il
    // veut vers les Airpoints — la somme reste égale au tarif.
    setEstimP(String(cartTotal)); setEstimAp("0");
  }, [cartTotal, paiement, tauxAP]);
  /** Ce qui part vraiment : le nom tel qu'il sera lu par le détenteur. */
  const lignesDuPanier = (): { name: string; quantity: number; price: number; cat: string }[] =>
    cartIds.map(key => { const it = byId(key)!; const isStuff = (it.cat || "").trim().startsWith("Stuff"); const rk = rarOf(key); const rlabel = rk && RARITY_META[rk] ? ` (${RARITY_META[rk].l})` : ""; const name = isStuff && stuffSex[key] ? `${it.item} (${stuffSex[key]})` : `${it.item}${rlabel}`; return { name, quantity: cart[key], price: priceFor(it, rk), cat: it.cat }; });

  /** Le clic n'envoie plus : il ouvre le récapitulatif. Les contrôles restent
   *  ici pour qu'on corrige AVANT de relire, pas pendant. */
  const demanderConfirmation = () => {
    if (!cartIds.length) return;
    const missingSex = cartIds.filter(id => { const it = byId(id); return it && (it.cat || "").trim().startsWith("Stuff") && !stuffSex[id]; });
    if (missingSex.length) return flash("Indique Garçon ou Fille pour chaque Stuff avant d'envoyer.");
    if (!perso.trim()) { setPersoManque(true); return flash("Indique ton pseudo en jeu : c'est là que l'objet sera envoyé par courrier."); }
    setPersoManque(false);
    const p = paiement === "airpoints" ? 0 : Math.max(0, Math.round(Number(estimP) || 0));
    const ap = paiement === "perins" ? 0 : Math.max(0, Math.round(Number(estimAp) || 0));
    if (p + ap <= 0) { setEstimManque(true); return flash("Donne ton estimation : c'est elle qui dit au détenteur ce que tu y mets."); }
    setEstimManque(false);
    setARelire(true);
  };

  const submitCart = async () => {
    setSending(true);
    const items = lignesDuPanier();
    const r = await fetch("/api/bank-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, characterName: perso.trim(), paiement, precision: precision.trim() || undefined,
      prixEstime: Math.max(0, Math.round(Number(estimP) || 0)), prixEstimeAp: Math.max(0, Math.round(Number(estimAp) || 0)) }) });
    setSending(false);
    if (r.ok) { setARelire(false); setCart({}); setStuffSex({}); setEstimP(""); setEstimAp(""); setPrecision(""); flash(`Commande envoyée — ${cartIds.length} article(s). Suis-la dans « Ma commande ».`); load(); }
    else { const e = await r.json().catch(() => ({} as any)); setARelire(false); flash(e.error || "Erreur — as-tu un personnage déclaré ?"); }
  };

  const filtered = shop.filter(s => (!catF || s.cat === catF) && (!q || s.item.toLowerCase().includes(q.toLowerCase())));
  /** Demandes encore ouvertes : c'est ce qui merite qu'on retourne dans le fil. */
  const enCours = reqs.filter((r) => r.status === "PENDING").length;
  // Regroupe les requêtes par panier (batchId) → 1 carte par transaction
  const reqGroups = reqs.reduce<{ key: string; items: Req[] }[]>((acc, r) => { const k = r.batchId || r.id; let g = acc.find(x => x.key === k); if (!g) { g = { key: k, items: [] }; acc.push(g); } g.items.push(r); return acc; }, []);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Une tuile d'icône plutôt que la bannière : elle dit « Banque » alors que
          tout le reste dit « Boutique ». */}
      <PageHeader icon="cart" title="Boutique" subtitle="Ce qui dort au coffre, une pièce à faire fabriquer — et le suivi de ta commande, au même endroit." />

      {toast && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--green)" }}>{toast}</div>}

      <ChoixBoutique ouvert={choixOuvert} staff={estStaff} onChoix={repondre} onFermer={() => setChoixOuvert(false)} />

      {/* Les deux panneaux, et — a leur droite — la conversation. Une demande
          envoyee ne se suit pas dans la boutique : elle se poursuit dans le fil.
          L'y renvoyer depuis n'importe quelle section evite d'avoir a ressortir
          par la barre de navigation pour savoir ou en est ce qu'on a demande. */}
      {/* DEUX GROUPES, parce qu'il y a deux gestes.
          Les quatre onglets se suivaient à la file : rien ne disait que les
          deux premiers servent à PASSER une commande et les deux autres à la
          SUIVRE ou à la SERVIR. « Acheter au coffre » et « Ma commande » se
          lisaient donc comme deux façons d'acheter. */}
      <div style={{ display: "flex", gap: 14, marginBottom: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
        {GROUPES.filter((g) => !g.staff || estStaff).map((g) => (
          <div key={g.titre}>
            <div className="font-heading" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 5, paddingLeft: 2 }}>{g.titre}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {g.onglets.map(([k, ic, l]) => (
                <button key={k} onClick={() => repondre(k)} title={EXPLIQUE[k]}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'Rubik',sans-serif", border: `1px solid ${panneau === k ? "var(--orange)" : "var(--border)"}`, background: panneau === k ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: panneau === k ? "var(--orange)" : "var(--text-muted)" }}>
                  <Icon name={ic} size={15} />{l}
                  {k === "commande" && enCours > 0 && (
                    <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--gold)", color: "#0A0A0C", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{enCours}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* La phrase qui manquait : ce qu'on fait ICI, en toutes lettres. */}
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="info" size={13} style={{ color: "var(--orange)", flexShrink: 0 }} />{EXPLIQUE[panneau]}
      </div>

      {panneau === "surMesure" && <ObjetSurMesure onEnvoye={() => { load(); repondre("commande"); }} />}
      {panneau === "commande" && <MesCommandes entete={false} />}
      {panneau === "requetes" && estStaff && <RequetesClients />}

      {panneau === "stock" && <div className="glass-card fx-card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 12 }}><Icon name="cart" size={14} style={{ marginRight: 6 }} />Boutique de guilde <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>— articles en stock dans le coffre commun</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <VgSelect value={catF} onChange={setCatF} options={[{ value: "", label: "Toutes catégories" }, ...cats.map(c => ({ value: c, label: c }))]} minWidth={160} />
          <input placeholder="Rechercher un article…" value={q} onChange={e => setQ(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
        </div>
        <div className="shop-layout" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 470, overflowY: "auto", paddingRight: 4 }}>
            {shop.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Le coffre commun est vide pour l'instant — reviens quand le staff l'aura rempli.</div> :
             filtered.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 22, textAlign: "center" }}>Aucun article ne correspond à ta recherche.</div> :
             filtered.map(s => {
              const raritys = s.rarities ? ORDRE_RARETE.filter((k) => k in s.rarities!) : [];
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
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.classe ? s.classe + " · " : ""}stock {s.stock} · {(() => {
                      /* Une arme a un prix PAR RARETÉ. Afficher en tête le tarif
                         de la clé de base — souvent un vieux prix jamais revu —
                         contredit la liste juste en dessous. On annonce la
                         fourchette réelle, ou rien. */
                      const f = isWeapon ? fourchette(s) : null;
                      if (f) return <b style={{ color: "var(--gold)" }}>{f.min === f.max ? <>{fmt(f.min)} périns</> : <>de {fmt(f.min)} à {fmt(f.max)} périns</>}</b>;
                      const pr = priceFor(s), ap = enAP(pr, tauxAP);
                      return pr > 0
                        ? <><b style={{ color: "var(--gold)" }}>~{fmt(pr)} périns</b>{ap ? <span style={{ color: "var(--text-muted)" }}> · {ap}</span> : null}</>
                        : <b style={{ color: "var(--text-muted)", fontStyle: "italic" }}>prix à définir</b>;
                    })()}{isWeapon ? " · choisis la/les rareté(s) ↓" : ""}</div>
                  </div>
                  {!isWeapon && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button className="vg-touch" aria-label="Retirer un" onClick={() => setQty(s.id, inCart - 1)} style={stepBtn}>−</button>
                      <input value={inCart} onChange={e => setQty(s.id, +e.target.value || 0)} style={{ ...inp, width: 42, textAlign: "center", padding: "5px 4px", fontSize: 13 }} />
                      <button className="vg-touch" aria-label="Ajouter un" onClick={() => setQty(s.id, inCart + 1)} style={stepBtn}>＋</button>
                    </div>
                  )}
                </div>
                {isWeapon && (
                  <div className="vg-rarete-liste" style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 44 }}>
                    {raritys.map(rk => { const m = RARITY_META[rk]; if (!m) return null; const key = `${s.id}::${rk}`; const q = cart[key] || 0; const stk = s.rarities![rk]; return (
                      <div key={rk} className="vg-ligne-dense" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "1px 7px", borderRadius: 5, color: m.c, border: `1px solid ${m.c}55`, background: `${m.c}14`, minWidth: 78 }}>{m.l}</span>
                        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>stock {stk}</span>
                        {/* Le prix de CETTE rareté : c'est la seule information qui
                            permet de choisir en connaissance de cause. */}
                        {(() => { const pr = priceFor(s, rk); const ap = enAP(pr, tauxAP); return pr > 0
                          ? <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--orange)" }}>{fmt(pr)} périns{ap ? <span style={{ fontWeight: 400, color: "var(--text-muted)" }}> · {ap}</span> : null}</span>
                          : <span style={{ fontSize: 11.5, fontStyle: "italic", color: "var(--text-muted)" }}>prix à définir</span>; })()}
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
                      <span style={{ color: "var(--orange)", minWidth: 58, textAlign: "right" }}>{fmt(priceFor(it, rarOf(id)) * cart[id])}</span>
                      <button onClick={() => setQty(id, 0)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="x" size={14} /></button>
                    </div>
                    {isStuff && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 2 }}>
                        <span style={{ fontSize: 11.5, color: stuffSex[id] ? "var(--text-muted)" : "var(--orange)", fontWeight: stuffSex[id] ? 400 : 700 }}>Sexe du Stuff :</span>
                        {(["G", "F"] as const).map(sx => (
                          <button key={sx} onClick={() => setStuffSex(p => ({ ...p, [id]: sx }))} style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 6, cursor: "pointer", border: `1px solid ${stuffSex[id] === sx ? "var(--orange)" : "var(--border)"}`, background: stuffSex[id] === sx ? "rgba(255,140,26,.16)" : "var(--bg-2)", color: stuffSex[id] === sx ? "var(--orange)" : "var(--text-muted)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={sx === "G" ? "male" : "female"} size={12} />{sx === "G" ? "Garçon" : "Fille"}</span></button>
                        ))}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, margin: "10px 0 12px", paddingTop: 10, borderTop: "1px solid var(--border)" }}><span style={{ color: "var(--text-muted)" }}>Total estimé</span><b style={{ color: "var(--gold)" }}>{fmt(cartTotal)} périns{enAP(cartTotal, tauxAP) ? <span style={{ fontWeight: 400, color: "var(--text-muted)" }}> · {enAP(cartTotal, tauxAP)}</span> : null}</b></div>
            {/* Le pseudo EN JEU, juste au-dessus du bouton : c'est la dernière
                chose qu'on vérifie avant d'envoyer, et l'objet part par courrier. */}
            {/* LE PSEUDO EN JEU D'ABORD. Il était coincé juste au-dessus du
                bouton, après le paiement : on découvrait qu'il manquait au
                moment de commander. C'est pourtant la première question — sans
                lui, l'objet n'a nulle part où être envoyé. */}
            <div style={{ marginBottom: 9 }}>
              <span style={{ display: "block", fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: persoManque ? "var(--red)" : "var(--text-muted)", marginBottom: 4 }}>
                Pseudo en jeu — obligatoire
              </span>
              <ChampPseudo valeur={perso} onChange={(v) => { setPerso(v); setPersoManque(false); }}
                style={{ ...inp, width: "100%", borderColor: persoManque ? "var(--red)" : "var(--border)" }} />
              <span style={{ display: "block", fontSize: 11, color: persoManque ? "var(--red)" : "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                {persoManque ? "Indique-le : c'est là que l'objet sera envoyé par courrier." : "C'est là que l'objet sera envoyé par courrier, en jeu."}
              </span>
            </div>
            <div style={{ marginBottom: 9 }}>
              <ChoixPaiement valeur={paiement} onChange={setPaiement} />
            </div>
            {/* LE MÊME TICKET QUE SUR MESURE. Le panier n'en avait pas : on
                voyait le tarif de la guilde et on commandait, sans jamais dire
                ce qu'on était prêt à mettre. Le détenteur n'avait donc rien à
                quoi répondre — et quand la commande part en quête, la cagnotte
                restait vide. Pré-rempli au tarif : c'est le point de départ
                naturel, pas un plafond. */}
            <div style={{ marginBottom: 9 }}>
              <MontantDemande
                paiement={paiement}
                perins={estimP} airpoints={estimAp}
                onPerins={(v) => { setEstimP(v); setToast(""); }}
                onAirpoints={(v) => { setEstimAp(v); setToast(""); }}
                objectif={cartTotal || null}
                tauxAP={tauxAP}
                erreur={estimManque}
              />
            </div>
            {/* PAS DE DATE ICI. L'objet dort déjà dans un coffre : la remise se
                fait dans la foulée, et demander « pour quand ? » pour quelque
                chose qui part le soir même ajoute un champ pour rien. Elle
                reste sur le sur mesure, où la pièce est à trouver ou à faire.
                Une précision libre, en revanche, sert toujours. */}
            <input value={precision} onChange={(e) => setPrecision(e.target.value)} maxLength={300}
              placeholder="Une précision ? (facultatif)" style={{ ...inp, width: "100%", marginBottom: 9 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={demanderConfirmation} disabled={!cartIds.length || sending} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--green)", background: "rgba(74,222,128,0.12)", color: "var(--green)", cursor: cartIds.length && !sending ? "pointer" : "default", opacity: cartIds.length && !sending ? 1 : 0.45, fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Icon name="cart" size={15} /> Commander</button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}><Icon name="info" size={11} style={{ display: "inline-block", marginRight: 4 }} />Ta demande part au staff, qui répond dans la conversation. Profil avec personnage requis.</div>
          </div>
        </div>
      </div>}

      {aRelire && (
        <ConfirmationCommande
          titre="Ta commande"
          lignes={lignesDuPanier().map((l): LigneCommande => ({ nom: l.name, quantite: l.quantity, prix: l.price || null }))}
          motApres={precision.trim() || undefined}
          perso={perso.trim()} paiement={paiement} tauxAP={tauxAP} envoi={sending}
          onAjouter={() => setARelire(false)}
          onConfirmer={submitCart}
          onAnnuler={() => setARelire(false)}
        />
      )}

      <style>{`@media(max-width:760px){.shop-layout{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
