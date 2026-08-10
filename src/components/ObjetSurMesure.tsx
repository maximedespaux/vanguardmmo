"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { BulleObjet } from "@/components/BulleObjet";
import type { SpecObjet } from "@/lib/specObjet";
import { ReglagesPiece } from "@/components/ReglagesPiece";
import { ChampPseudo } from "@/components/ChampPseudo";
import { ChoixPaiement, type Paiement } from "@/components/ChoixPaiement";
import { MontantDemande } from "@/components/MontantDemande";
import {
  reglagesDeSlot, slotDepuisBuilder, estTierArtefact, resumerPiece, resumerEmplacements, CHOIX_VIDE, type ChoixPiece,
} from "@/lib/specsFlyff";

/**
 * Commander un objet qui n'existe pas encore en stock.
 *
 * La boutique ne montre que ce qui dort au coffre. Or ce qu'on veut le plus
 * souvent, c'est une pièce PRÉCISE : la Tenue Yggdrasil +10, percée Fulgur,
 * éveil R1 en dégâts critiques. Elle se montait dans le builder, mais il
 * fallait le savoir, y aller, et l'équiper — trois pas de trop pour une
 * commande. Elle se compose désormais ici, et la bulle se dessine à mesure :
 * on voit ce qu'on demande avant de le demander.
 *
 * Le catalogue est celui du builder (`/airbuilder/data.json`), pas une seconde
 * liste : deux listes d'objets divergent toujours, et c'est le détenteur qui
 * paierait la différence.
 */
type ItemBrut = {
  id: number; n: string; ic?: string; lv?: number; pr?: number;
  tier?: string; col?: string; cls?: string; sex?: string;
  atk?: [number, number]; b?: [string, number][];
};

const SLOTS: { clef: string; label: string }[] = [
  { clef: "weapon", label: "Arme" }, { clef: "shield", label: "Bouclier" },
  { clef: "helmet", label: "Casque" }, { clef: "suit", label: "Tenue" },
  { clef: "gauntlet", label: "Gants" }, { clef: "boots", label: "Bottes" },
  { clef: "ring", label: "Anneau" }, { clef: "earring", label: "Boucles" },
  { clef: "necklace", label: "Collier" }, { clef: "cape", label: "Cape" },
  { clef: "mantra", label: "Mantra" }, { clef: "masque", label: "Masque" },
  { clef: "fairy", label: "Fée" }, { clef: "familier", label: "Familier" },
  { clef: "ramasseur", label: "Ramasseur" }, { clef: "fashion", label: "Fashion" },
];

const champ: React.CSSProperties = {
  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "9px 11px", color: "var(--text)", fontSize: 13, fontFamily: "inherit", width: "100%",
};
const etiquette: React.CSSProperties = { display: "block", fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 4 };

/**
 * Le dépôt laissé par l'AirBuilder, lu UNE fois pour toute la page.
 *
 * On le sort du composant à dessein : React remonte les composants en
 * développement (StrictMode), et un dépôt lu puis effacé dans un effet
 * disparaissait avant le second montage — la pièce était perdue en route.
 * Ici, la valeur survit au remontage ; le localStorage, lui, est vidé
 * immédiatement pour que la pièce ne revienne pas à la visite suivante.
 */
type DepotPiece = { slot?: string; itemId?: string; nom?: string; choix?: Partial<ChoixPiece> };
/**
 * Le builder dépose une PILE : on y coche plusieurs pièces d'un coup, et elles
 * se composent ici l'une après l'autre — chacune a son prix et sa note, donc
 * chacune a son passage. `vg_demande_piece` (au singulier) reste lu pour les
 * dépôts laissés par une version antérieure.
 */
let PILE: DepotPiece[] | undefined;
function lirePile(): DepotPiece[] {
  if (PILE !== undefined) return PILE;
  PILE = [];
  try {
    const multi = localStorage.getItem("vg_demande_pieces");
    localStorage.removeItem("vg_demande_pieces");
    if (multi) PILE = JSON.parse(multi) as DepotPiece[];
    else {
      const seul = localStorage.getItem("vg_demande_piece");
      localStorage.removeItem("vg_demande_piece");
      if (seul) PILE = [JSON.parse(seul) as DepotPiece];
    }
  } catch { PILE = []; }
  return PILE;
}

export function ObjetSurMesure({ onEnvoye }: { onEnvoye?: () => void }) {
  const [items, setItems] = useState<Record<string, ItemBrut[]>>({});
  const [icones, setIcones] = useState<Record<string, string>>({});
  const [slot, setSlot] = useState("suit");
  const [q, setQ] = useState("");
  const [choisi, setChoisi] = useState<ItemBrut | null>(null);

  // Configuration demandée. Les réglages ouverts dépendent de la PIÈCE : une
  // arme se perce et se rend rare, un casque non, un anneau monte à +30. La
  // table est celle du builder (lib/specsFlyff), pas une deuxième liste.
  const [choix, setChoix] = useState<ChoixPiece>(CHOIX_VIDE);
  const [prix, setPrix] = useState("");
  /* « Les deux » ouvre une seconde ligne : personne n'a le compte rond dans une
     seule monnaie, et forcer un champ unique obligeait a convertir de tete a un
     cours qui n'existe pas. */
  const [prixAp, setPrixAp] = useState("");
  const [paiement, setPaiement] = useState<Paiement>("perins");
  const [note, setNote] = useState("");
  /** Pseudo EN JEU : la remise se fait par courrier dans le jeu. */
  const [perso, setPerso] = useState("");

  const [envoi, setEnvoi] = useState(false);
  const [etat, setEtat] = useState<{ msg: string; ok: boolean } | null>(null);
  /** Les pièces composées, en attente d'envoi. On commande rarement une seule
   *  chose : un stuff se complète pièce par pièce, et chacune se négocie à
   *  part — d'où une liste ici, et une demande par pièce à l'arrivée. */
  const [panier, setPanier] = useState<{ spec: SpecObjet; nom: string; prix: number; prixAp: number; note: string }[]>([]);
  /** La pièce dont on regarde le détail. Une seule à la fois : six bulles
   *  empilées dans la colonne de droite ne se comparent pas mieux. */
  const [deplie, setDeplie] = useState<number | null>(null);

  useEffect(() => {
    fetch("/airbuilder/data.json").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setItems(d.ITEMS ?? {});
      setIcones(d.IC ?? {});
    }).catch(() => {});
  }, []);

  /**
   * Une pièce envoyée depuis l'AirBuilder (« Demander cet objet »).
   *
   * Elle transite par le localStorage : une URL ne tiendrait pas la
   * configuration complète. On attend que le catalogue soit chargé pour
   * retrouver l'objet, puis on efface le dépôt — sinon la même pièce
   * reviendrait à chaque visite de la boutique.
   */
  const [reprise, setReprise] = useState<string | null>(null);
  /** Rang de la pièce en cours dans la pile déposée par le builder. */
  const [rang, setRang] = useState(0);
  const pile = lirePile();
  useEffect(() => {
    if (!Object.keys(items).length) return;
    const d = pile[rang];
    if (!d) return;
    // weapon2 → weapon, ring1 → ring, fhead → fashion : le sélecteur de la
    // boutique parle en familles, le builder en emplacements.
    const brutSlot = String(d.slot ?? "").replace(/[0-9]/g, "");
    const s = ["fhead", "ftop", "fhand", "ffoot"].includes(brutSlot) ? "fashion" : brutSlot;
    const liste = items[s] ?? [];
    const trouve = liste.find((i) => String(i.id) === String(d.itemId)) ?? liste.find((i) => i.n === d.nom);
    if (!trouve) return;
    setSlot(s);
    setChoisi(trouve);
    setChoix({ ...CHOIX_VIDE, ...(d.choix ?? {}) });
    setReprise(trouve.n);
  }, [items, rang, pile]);

  const liste = useMemo(() => {
    const base = items[slot] ?? [];
    const t = q.trim().toLowerCase();
    return (t ? base.filter((i) => i.n.toLowerCase().includes(t)) : base).slice(0, 24);
  }, [items, slot, q]);

  /** Ce que le jeu permet sur cette pièce — rien de plus, rien de moins. */
  const reglages = useMemo(() => {
    const s = slotDepuisBuilder(slot);
    if (!s) return null;
    return reglagesDeSlot(s, {
      artefact: estTierArtefact(choisi?.tier),
      label: SLOTS.find((x) => x.clef === slot)?.label ?? s,
    });
  }, [slot, choisi]);

  /** La spec, reconstruite à chaque frappe : c'est elle qu'on envoie ET qu'on montre. */
  const spec: SpecObjet | null = useMemo(() => {
    if (!choisi) return null;
    const puces: string[] = [];
    if (choix.rarete) puces.push(choix.rarete);
    else if (choisi.tier) puces.push(choisi.tier);
    const lignes: { label: string; valeur: string }[] = [];
    if (Number(choix.percage) > 0 || choix.carte) {
      lignes.push({ label: "Perçage", valeur: `${choix.percage || "?"}${choix.carte ? ` · ${choix.carte}` : ""}` });
    }
    if (choix.eveilRang || choix.eveilStat) {
      lignes.push({ label: "Éveil", valeur: [choix.eveilRang, choix.eveilStat].filter(Boolean).join(" · ") });
    }
    if (choix.scrollStat) lignes.push({ label: "Scroll", valeur: `${choix.scrollStat}${Number(choix.scrollNiv) > 0 ? ` +${choix.scrollNiv}` : ""}` });
    if (choix.element) lignes.push({ label: "Élément", valeur: `${choix.element}${Number(choix.elementNiv) > 0 ? ` +${choix.elementNiv}` : ""}` });
    // Le sertissage fait la moitié de la valeur d'une arme : il doit voyager
    // avec la demande, sinon le détenteur livre une lame vide.
    const dia = resumerEmplacements(choix.diamants);
    if (dia) lignes.push({ label: "Sertissage", valeur: dia });
    const holo = resumerEmplacements(choix.holo);
    if (holo) lignes.push({ label: "Holo", valeur: holo });
    const gem = resumerEmplacements(choix.gemmes);
    if (gem) lignes.push({ label: "Gemmes", valeur: gem });
    return {
      nom: choisi.n,
      slot: SLOTS.find((s) => s.clef === slot)?.label ?? slot,
      icone: (choisi.ic && icones[choisi.ic]) || null,
      couleur: choisi.col ?? null,
      tier: choix.rarete || choisi.tier || null,
      up: Number(choix.up) || null,
      etoiles: Number(choix.etoiles) || null,
      classe: choisi.cls ?? null,
      niveau: choisi.lv ?? null,
      prestige: choisi.pr ?? null,
      attaque: choisi.atk ?? null,
      puces,
      lignes,
    };
  }, [choisi, slot, icones, choix]);

  // Le titre de la demande dit la pièce EXACTE : c'est lui que le détenteur lit
  // dans sa liste, avant d'ouvrir la bulle.
  const nomComplet = spec
    ? `${spec.nom}${resumerPiece(choix) ? ` — ${resumerPiece(choix)}` : ""}`
    : "";

  const ajouter = () => {
    if (!spec) return;
    /* L'estimation est OBLIGATOIRE, une par objet. Sans elle, une commande part
       sans montant : le détenteur ne sait pas ce qu'on est prêt à mettre, et
       quand la commande devient une quête, il n'y a rien à partager entre ceux
       qui la farment. Zéro est refusé pour la même raison — c'est une absence
       déguisée, pas un prix. */
    const enPerins = paiement === "airpoints" ? 0 : Math.max(0, Math.round(Number(prix) || 0));
    const enAp = paiement === "perins" ? 0 : Math.max(0, Math.round(Number(prixAp) || 0));
    if (enPerins + enAp <= 0) {
      setEtat({ msg: "Donne ton estimation pour cette pièce : c'est elle qui dit au détenteur ce que tu y mets.", ok: false });
      return;
    }
    setPanier((p) => [...p, { spec, nom: nomComplet, prix: enPerins, prixAp: enAp, note: note.trim() }]);
    // On garde l'objet et ses réglages : composer la pièce suivante d'un set
    // repart presque toujours des mêmes valeurs.
    setEtat(null);
  };

  const envoyer = async () => {
    if (!panier.length) return;
    if (!perso.trim()) { setEtat({ ok: false, msg: "Indique ton pseudo en jeu : c'est là que l'objet sera envoyé par courrier." }); return; }
    setEnvoi(true);
    setEtat(null);
    let ok = 0;
    let dernierMessage = "";
    for (const piece of panier) {
      // Une demande PAR pièce : chacune se négocie, se refuse ou se remet
      // séparément — les grouper obligerait à tout traiter d'un bloc.
      const r = await fetch("/api/bank-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "ITEM",
          item: piece.nom,
          quantity: 1,
          // Le prix estimé sert au coût en crédits (1 crédit ≈ 1 000 périns).
          // Facultatif : le staff l'ajuste dans la conversation s'il est faux.
          prixEstime: piece.prix,
          prixEstimeAp: piece.prixAp || undefined,
          characterName: perso.trim(),
          paiement,
          reason: piece.note ? `Sur mesure — ${piece.note.slice(0, 300)}` : "Objet sur mesure",
          spec: piece.spec,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) ok += 1; else dernierMessage = j.error ?? `erreur ${r.status}`;
    }
    setEnvoi(false);
    if (!ok) { setEtat({ ok: false, msg: dernierMessage || "Aucune demande envoyée." }); return; }
    setPanier([]); setChoisi(null); setChoix(CHOIX_VIDE); setNote(""); setPrix("");
    // Pile déposée par le builder : on enchaîne sur la pièce suivante plutôt
    // que de renvoyer l'utilisateur au builder entre chaque.
    const suite = rang + 1 < pile.length;
    setEtat({
      ok: true,
      msg: suite
        ? `${ok} demande(s) envoyée(s). Pièce suivante : ${pile[rang + 1]?.nom ?? "—"} (${rang + 2} sur ${pile.length}).`
        : `${ok} demande(s) envoyée(s) — la suite se règle dans la conversation.`,
    });
    if (suite) setRang((r) => r + 1);
    onEnvoye?.();
  };

  return (
    <div className="glass-card fx-card" style={{ padding: 18, marginBottom: 16 }}>
      <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--orange)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="hammer" size={14} />Objet sur mesure
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 13 }}>
        Compose exactement la pièce que tu veux. La demande part avec sa bulle : le détenteur voit la version demandée, améliorations comprises.
      </div>

      {/* La porte de sortie vers l'AirBuilder. Quand la pièce est DÉJÀ montée sur
          un stuff, la ressaisir ici est du travail pour rien : on la coche
          là-bas et elle revient avec tous ses réglages. */}
      <a href="/builder?acheter=1"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 13, padding: "9px 13px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", textDecoration: "none", fontSize: 12.5 }}>
        <Icon name="sword" size={15} style={{ color: "var(--orange)" }} />
        <span>
          <b>Elle est déjà sur un de mes stuffs</b>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>
            Coche-la dans l&apos;AirBuilder : elle revient ici avec ses réglages.
          </span>
        </span>
        <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)", marginLeft: 4 }} />
      </a>

      {reprise && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13, padding: "9px 12px", borderRadius: 10, background: "rgba(255,140,26,.1)", border: "1px solid rgba(255,140,26,.34)", fontSize: 12.5 }}>
          <Icon name="shirt" size={15} style={{ color: "var(--orange)", flexShrink: 0 }} />
          <span>
            <b>{reprise}</b> reprise de ton build, avec ses réglages. Ajuste si besoin, puis ajoute-la à ta demande.
            {pile.length > 1 && <> <b>Pièce {rang + 1} sur {pile.length}</b> — les suivantes s&apos;enchaînent après l&apos;envoi.</>}
          </span>
        </div>
      )}

      <div className="shop-layout" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
        {/* ── Choix de l'objet ── */}
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 9, flexWrap: "wrap" }}>
            <select value={slot} onChange={(e) => { setSlot(e.target.value); setChoisi(null); setChoix(CHOIX_VIDE); }} style={{ ...champ, width: "auto", minWidth: 140 }} aria-label="Emplacement">
              {SLOTS.map((s) => <option key={s.clef} value={s.clef}>{s.label}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un objet…" style={{ ...champ, flex: 1, minWidth: 150 }} />
          </div>

          <div style={{ display: "grid", gap: 4, maxHeight: 250, overflowY: "auto" }}>
            {liste.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: 12 }}>Aucun objet pour cet emplacement.</div>}
            {liste.map((i) => {
              const actif = choisi?.id === i.id;
              return (
                <button key={i.id} onClick={() => { setChoisi(i); setChoix(CHOIX_VIDE); }}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px", borderRadius: 9, cursor: "pointer", textAlign: "left", fontFamily: "inherit", border: `1px solid ${actif ? "var(--orange)" : "transparent"}`, background: actif ? "rgba(255,140,26,.1)" : "var(--bg-3)", color: "var(--text)" }}>
                  <span style={{ width: 26, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.ic && icones[i.ic] ? <img src={icones[i.ic]} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} /> : <Icon name="package" size={14} style={{ color: "var(--text-muted)" }} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: i.col ?? "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.n}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>
                      {i.tier ?? "—"}{i.cls ? ` · ${i.cls}` : ""}{i.lv ? ` · niv. ${i.lv}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Réglages ── Le même panneau que les quêtes secondaires : on
              n'ouvre que ce qui existe sur cette pièce-là. */}
          {choisi && (reglages ? (
            <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--border)" }}>
              <ReglagesPiece reglages={reglages} choix={choix} onChange={setChoix} nom={choisi.n} />
            </div>
          ) : (
            <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
              Rien à régler sur cette pièce : dis le reste dans la précision, en dessous.
            </div>
          ))}
        </div>

        {/* ── Aperçu et envoi ── */}
        <div>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 7 }}>Ce que tu demandes</div>
          {spec ? <BulleObjet spec={spec} /> : (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "22px 12px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 11 }}>
              Choisis un objet à gauche : sa bulle se dessine ici.
            </div>
          )}

          {choisi && (
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              {/* La monnaie se dit AVANT le montant, comme dans « Acheter au
                  coffre » : sinon « 2 400 » se lit des deux façons, et le
                  vendeur composait son tarif sans savoir ce que l'autre a. */}
              <ChoixPaiement valeur={paiement} onChange={setPaiement} />
              <MontantDemande
                paiement={paiement}
                perins={prix} airpoints={prixAp}
                onPerins={(v) => { setPrix(v); setEtat(null); }}
                onAirpoints={(v) => { setPrixAp(v); setEtat(null); }}
                erreur={!!etat && !etat.ok && !Number(prix) && !Number(prixAp)}
              />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Une précision ? (facultatif)" style={champ} />
              <button className="vg-btn" onClick={ajouter} style={{ justifyContent: "center" }}>
                <Icon name="plus" size={14} />Ajouter à ma demande
              </button>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                <Icon name="info" size={11} style={{ display: "inline-block", marginRight: 4 }} />
                Une estimation par pièce, et elle est nécessaire : elle dit au détenteur ce que tu y mets, et
                c&apos;est elle qui devient la cagnotte si la guilde doit farmer l&apos;objet. Le tarif final se négocie
                ensuite dans la conversation.
              </div>
            </div>
          )}

          {/* Ce qui partira. Chaque ligne reste retirable jusqu'au dernier
              moment : on compose souvent trois pièces pour n'en garder qu'une. */}
          {panier.length > 0 && (
            <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 7 }}>
                Ma demande — {panier.length} pièce{panier.length > 1 ? "s" : ""}
              </div>
              <div style={{ display: "grid", gap: 5, marginBottom: 10 }}>
                {/* Une ligne ne disait que le nom. Or ce qui distingue deux pièces
                    homonymes, c'est justement la configuration : la bulle se
                    rouvre au clic, pour revérifier avant d'envoyer. */}
                {panier.map((piece, i) => {
                  const ouverte = deplie === i;
                  return (
                  <div key={i} style={{ borderRadius: 9, background: "var(--bg-3)", border: `1px solid ${ouverte ? "var(--orange)" : "var(--border)"}`, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", fontSize: 12 }}>
                      <button onClick={() => setDeplie(ouverte ? null : i)}
                        aria-expanded={ouverte} aria-label={ouverte ? "Masquer le détail" : "Voir le détail"}
                        style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left" }}>
                        <Icon name={ouverte ? "chevron-down" : "chevron-right"} size={12} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {piece.spec.icone && <img src={piece.spec.icone} alt="" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />}
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: piece.spec.couleur ?? "var(--text)" }}>{piece.nom}</span>
                      </button>
                      {(piece.prix > 0 || piece.prixAp > 0) && (
                        <span style={{ color: "var(--gold)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                          {[piece.prix > 0 ? `${piece.prix.toLocaleString("fr-FR")} périns` : "", piece.prixAp > 0 ? `${piece.prixAp.toLocaleString("fr-FR")} AP` : ""].filter(Boolean).join(" + ")}
                        </span>
                      )}
                      <button onClick={() => setPanier((p) => p.filter((_, j) => j !== i))} aria-label="Retirer"
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                    {ouverte && (
                      <div style={{ padding: "0 9px 9px" }}>
                        <BulleObjet spec={piece.spec} compact />
                        {piece.note && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{piece.note}</div>}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              <label style={{ display: "block", marginBottom: 9 }}>
                <span style={etiquette}>Pseudo en jeu *</span>
                <ChampPseudo valeur={perso} onChange={setPerso} style={champ} />
              </label>
              <button className="vg-btn" onClick={envoyer} disabled={envoi} style={{ width: "100%", justifyContent: "center", opacity: envoi ? .6 : 1 }}>
                {envoi ? "Envoi…" : `Demander ${panier.length > 1 ? `ces ${panier.length} objets` : "cet objet"}`}
              </button>
            </div>
          )}

          {etat && <div style={{ marginTop: 10, fontSize: 12.5, color: etat.ok ? "var(--green)" : "var(--red)" }}>{etat.msg}</div>}
        </div>
      </div>
    </div>
  );
}
