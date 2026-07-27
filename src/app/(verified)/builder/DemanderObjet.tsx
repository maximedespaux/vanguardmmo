"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { BulleObjet } from "@/components/BulleObjet";
import { specDepuisEquip, type SpecObjet } from "@/lib/specObjet";

/**
 * « Je veux CET objet » — le pont entre le builder et la boutique.
 *
 * Ce qui manquait : le builder connaît la pièce exacte (rareté, +9, perçage,
 * sertissage) alors qu'une demande à la boutique ne portait qu'un nom et une
 * quantité. Le détenteur devait deviner, ou tout redemander dans la discussion.
 *
 * On lit l'état du builder là où il l'écrit lui-même — `localStorage.vg_air_e1`
 * — plutôt que de modifier son moteur : c'est du vanilla fourni par iBeats, et
 * chaque ligne ajoutée dedans est une ligne à re-fusionner à sa prochaine
 * version.
 */
const CLEF_ETAT = "vg_air_e1";

const LABELS: Record<string, string> = {
  weapon: "Arme", weapon2: "Arme 2", shield: "Bouclier", mantra: "Mantra", cape: "Cape", masque: "Masque",
  helmet: "Casque", suit: "Tenue", gauntlet: "Gants", boots: "Bottes",
  fhead: "Tête (fashion)", ftop: "Haut (fashion)", fhand: "Gants (fashion)", ffoot: "Bottes (fashion)",
  ramasseur: "Ramasseur", familier: "Familier", fairy: "Fée",
  necklace: "Collier", ring1: "Anneau 1", ring2: "Anneau 2", earring1: "Boucle 1", earring2: "Boucle 2",
};

type Piece = { slot: string; spec: SpecObjet };

export function DemanderObjet() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [choix, setChoix] = useState<Record<string, boolean>>({});
  const [ouvert, setOuvert] = useState(false);
  const [icones, setIcones] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<{ msg: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Le catalogue du builder donne l'image des objets : l'état ne garde qu'une clé.
  useEffect(() => {
    fetch("/airbuilder/data.json").then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.IC && setIcones(d.IC)).catch(() => {});
  }, []);

  const relire = useCallback(() => {
    try {
      const brut = JSON.parse(window.localStorage.getItem(CLEF_ETAT) || "null");
      const perso = brut?.chars?.[brut?.cur ?? 0];
      const stuff = perso?.stuffs?.[perso?.curStuff ?? 0];
      const eq = stuff?.eq ?? {};
      const liste: Piece[] = [];
      for (const slot of Object.keys(eq)) {
        const spec = specDepuisEquip(LABELS[slot] ?? slot, eq[slot]);
        if (!spec) continue;
        const cle = (eq[slot]?.item?.ic ?? "") as string;
        liste.push({ slot, spec: { ...spec, icone: icones[cle] ?? null } });
      }
      setPieces(liste);
    } catch { setPieces([]); }
  }, [icones]);

  // Le moteur écrit dans localStorage à chaque changement ; on relit à
  // l'ouverture et régulièrement tant que le panneau est déplié.
  useEffect(() => {
    relire();
    if (!ouvert) return;
    const t = setInterval(relire, 2500);
    return () => clearInterval(t);
  }, [ouvert, relire]);

  const selection = pieces.filter((p) => choix[p.slot]);

  const envoyer = async () => {
    if (!selection.length) return;
    setEnvoi(true);
    setEtat(null);
    let ok = 0;
    let dernierMessage = "";
    for (const p of selection) {
      // Une demande PAR pièce : chacune se négocie, se refuse ou se remet
      // séparément — les grouper obligerait à tout traiter d'un bloc.
      const r = await fetch("/api/bank-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "ITEM",
          item: `${p.spec.nom}${p.spec.up ? ` +${p.spec.up}` : ""}${p.spec.tier ? ` (${p.spec.tier})` : ""}`,
          quantity: 1,
          reason: `Depuis le builder — ${p.spec.slot}`,
          spec: p.spec,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) ok += 1; else dernierMessage = j.error ?? "Demande refusée.";
    }
    setEnvoi(false);
    setChoix({});
    setEtat(ok
      ? { ok: true, msg: `${ok} demande(s) envoyée(s) — suis-les dans « Mes demandes ».` }
      : { ok: false, msg: dernierMessage || "Aucune demande envoyée." });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 18px 26px" }}>
      <button onClick={() => setOuvert((o) => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 15px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, border: "1px solid var(--orange)", background: ouvert ? "rgba(255,140,26,.14)" : "var(--bg-3)", color: "var(--orange)" }}>
        <Icon name={ouvert ? "chevron-down" : "cart"} size={15} />
        Demander un objet de ce build à la boutique
      </button>

      {ouvert && (
        <div className="glass-card" style={{ padding: 16, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>
            Coche les pièces que tu veux obtenir. La demande part avec la bulle de l&apos;objet :
            le détenteur voit exactement la version demandée, améliorations comprises.
          </div>

          {pieces.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Aucune pièce équipée sur ce stuff. Équipe des objets dans le builder, puis reviens ici.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>
              {pieces.map((p) => (
                <label key={p.slot} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: 9, borderRadius: 11, cursor: "pointer", border: `1px solid ${choix[p.slot] ? "var(--orange)" : "var(--border)"}`, background: choix[p.slot] ? "rgba(255,140,26,.07)" : "var(--bg-3)" }}>
                  <input type="checkbox" checked={!!choix[p.slot]} onChange={(e) => setChoix((c) => ({ ...c, [p.slot]: e.target.checked }))}
                    style={{ marginTop: 4, accentColor: "var(--orange)" }} />
                  <BulleObjet spec={p.spec} compact />
                </label>
              ))}
            </div>
          )}

          {etat && (
            <div style={{ marginTop: 12, fontSize: 13, color: etat.ok ? "var(--green)" : "var(--red)" }}>{etat.msg}</div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
            <button className="vg-btn" onClick={envoyer} disabled={!selection.length || envoi}
              style={{ opacity: selection.length && !envoi ? 1 : .5, cursor: selection.length && !envoi ? "pointer" : "default" }}>
              {envoi ? "Envoi…" : `Demander ${selection.length || ""}`.trim()}
            </button>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              Une demande par pièce : chacune se négocie et se remet séparément.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
