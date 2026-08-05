"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { BulleObjet } from "@/components/BulleObjet";
import type { SpecObjet } from "@/lib/specObjet";
import { ReglagesPiece } from "@/components/ReglagesPiece";
import { ChampPseudo } from "@/components/ChampPseudo";
import {
  reglagesDeSlot, slotDepuisBuilder, estTierArtefact, resumerPiece, CHOIX_VIDE, type ChoixPiece,
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
const etiquette: React.CSSProperties = { display: "block", fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 4 };

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
  const [note, setNote] = useState("");
  /** Pseudo EN JEU : la remise se fait par courrier dans le jeu. */
  const [perso, setPerso] = useState("");

  const [envoi, setEnvoi] = useState(false);
  const [etat, setEtat] = useState<{ msg: string; ok: boolean } | null>(null);
  /** Les pièces composées, en attente d'envoi. On commande rarement une seule
   *  chose : un stuff se complète pièce par pièce, et chacune se négocie à
   *  part — d'où une liste ici, et une demande par pièce à l'arrivée. */
  const [panier, setPanier] = useState<{ spec: SpecObjet; nom: string; prix: number; note: string }[]>([]);

  useEffect(() => {
    fetch("/airbuilder/data.json").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setItems(d.ITEMS ?? {});
      setIcones(d.IC ?? {});
    }).catch(() => {});
  }, []);

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
    setPanier((p) => [...p, { spec, nom: nomComplet, prix: Math.max(0, Number(prix) || 0), note: note.trim() }]);
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
          characterName: perso.trim(),
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
    setEtat({ ok: true, msg: `${ok} demande(s) envoyée(s) — la suite se règle dans la conversation.` });
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
                    <span style={{ display: "block", fontSize: 10.5, color: "var(--text-muted)" }}>
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
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 7 }}>Ce que tu demandes</div>
          {spec ? <BulleObjet spec={spec} /> : (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "22px 12px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 11 }}>
              Choisis un objet à gauche : sa bulle se dessine ici.
            </div>
          )}

          {choisi && (
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              <label><span style={etiquette}>Prix estimé (facultatif)</span>
                <input type="number" min={0} value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="en périns" style={champ} />
              </label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Une précision ? (facultatif)" style={champ} />
              <button className="vg-btn" onClick={ajouter} style={{ justifyContent: "center" }}>
                <Icon name="plus" size={14} />Ajouter à ma demande
              </button>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                <Icon name="info" size={11} style={{ display: "inline-block", verticalAlign: "-1px", marginRight: 4 }} />
                Le coût en crédits suit le prix estimé (1 crédit ≈ 1 000 périns). Le staff l&apos;ajuste s&apos;il ne colle pas.
              </div>
            </div>
          )}

          {/* Ce qui partira. Chaque ligne reste retirable jusqu'au dernier
              moment : on compose souvent trois pièces pour n'en garder qu'une. */}
          {panier.length > 0 && (
            <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 7 }}>
                Ma demande — {panier.length} pièce{panier.length > 1 ? "s" : ""}
              </div>
              <div style={{ display: "grid", gap: 5, marginBottom: 10 }}>
                {panier.map((piece, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", fontSize: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {piece.spec.icone && <img src={piece.spec.icone} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: piece.spec.couleur ?? "var(--text)" }}>{piece.nom}</span>
                    {piece.prix > 0 && <span style={{ color: "var(--gold)", flexShrink: 0 }}>~{piece.prix.toLocaleString("fr-FR")}</span>}
                    <button onClick={() => setPanier((p) => p.filter((_, j) => j !== i))} aria-label="Retirer"
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex" }}>
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
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
