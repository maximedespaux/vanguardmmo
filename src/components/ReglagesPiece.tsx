"use client";
import type { Reglages, ChoixPiece } from "@/lib/specsFlyff";
import { RARETES, RANGS_EVEIL, STATS_EVEIL, STATS_SCROLL, ELEMENTS, STATS_DIAMANT, STATS_HOLO, STATS_GEMME, resumerPiece } from "@/lib/specsFlyff";

/**
 * Décrire la pièce exacte qu'on veut — rareté, +N, étoiles, perçage, éveil,
 * scroll, élément — et rien d'autre.
 *
 * Le même panneau sert à prendre une quête secondaire et à commander un objet
 * sur mesure : ce sont deux fois la même question (« laquelle, exactement ? »),
 * et deux formulaires auraient divergé au premier ajout. Ce qui s'affiche vient
 * de `reglages` (lib/specsFlyff), qui ne propose que ce que le jeu permet sur
 * cette pièce-là.
 */
const ligne: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" };
const etiquette: React.CSSProperties = { fontSize: 11.5, color: "var(--text-muted)", width: 62, flexShrink: 0 };
const mini: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 9px", color: "var(--text)", fontSize: 12.5, fontFamily: "inherit" };
const pastille = (actif: boolean): React.CSSProperties => ({
  padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit",
  border: `1px solid ${actif ? "var(--orange)" : "var(--border)"}`,
  background: actif ? "rgba(255,140,26,.14)" : "transparent",
  color: actif ? "var(--orange)" : "var(--text-muted)",
});

export function ReglagesPiece({ reglages: r, choix, onChange, nom }: {
  reglages: Reglages;
  choix: ChoixPiece;
  onChange: (c: ChoixPiece) => void;
  /** Nom de l'objet, repris dans le résumé du bas. */
  nom?: string;
}) {
  const maj = (k: keyof ChoixPiece, v: string) => onChange({ ...choix, [k]: v });
  /** Un emplacement de sertissage ou de gemme : la liste est creuse, on ne la
   *  remplit que là où l'on a une exigence. */
  const majEmplacement = (k: "diamants" | "holo" | "gemmes", i: number, v: string) => {
    const l = [...(choix[k] ?? [])];
    while (l.length <= i) l.push("");
    l[i] = v;
    onChange({ ...choix, [k]: l });
  };
  const bascule = (k: keyof ChoixPiece, v: string) => maj(k, choix[k] === v ? "" : v);

  return (
    <div style={{ display: "grid", gap: 9, padding: "10px 11px", borderRadius: 9, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
        {r.label} — la pièce que je vise (facultatif)
      </div>

      {r.rarete && (
        <div style={ligne}>
          <span style={etiquette}>Rareté</span>
          {RARETES.map((x) => (
            <button key={x} onClick={() => bascule("rarete", x)} style={pastille(choix.rarete === x)}>{x}</button>
          ))}
        </div>
      )}

      {r.upMax > 0 && (
        <div style={ligne}>
          <span style={etiquette}>Amélio.</span>
          <select value={choix.up} onChange={(e) => maj("up", e.target.value)} style={mini} aria-label="Amélioration">
            <option value="">+ ?</option>
            {Array.from({ length: r.upMax + 1 }, (_, i) => i).map((n) => <option key={n} value={n}>+{n}</option>)}
          </select>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>max +{r.upMax}</span>
          {/* Les étoiles n'existent qu'en artefact, c'est-à-dire au-delà de +10. */}
          {r.etoiles && Number(choix.up) > 10 && (
            <>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: 8 }}>Étoiles</span>
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => bascule("etoiles", String(n))} style={pastille(choix.etoiles === String(n))}>
                  {"★".repeat(n)}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {r.percage && (
        <div style={ligne}>
          <span style={etiquette}>Perçage</span>
          <select value={choix.percage} onChange={(e) => maj("percage", e.target.value)} style={mini} aria-label="Perçages">
            <option value="">—</option>
            {Array.from({ length: r.percage.max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>sur {r.percage.max}</span>
          <select value={choix.carte} onChange={(e) => maj("carte", e.target.value)} style={mini} aria-label="Carte de perçage">
            <option value="">carte…</option>
            {r.percage.cartes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {r.eveil && (
        <div style={ligne}>
          <span style={etiquette}>Éveil</span>
          {RANGS_EVEIL.map((x) => (
            <button key={x} onClick={() => bascule("eveilRang", x)} style={pastille(choix.eveilRang === x)}>{x}</button>
          ))}
          <select value={choix.eveilStat} onChange={(e) => maj("eveilStat", e.target.value)} style={mini} aria-label="Statistique d'éveil">
            <option value="">statistique…</option>
            {STATS_EVEIL.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {r.scroll && (
        <div style={ligne}>
          <span style={etiquette}>Scroll</span>
          <select value={choix.scrollStat} onChange={(e) => maj("scrollStat", e.target.value)} style={mini} aria-label="Statistique du scroll">
            <option value="">stat…</option>
            {STATS_SCROLL.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={choix.scrollNiv} onChange={(e) => maj("scrollNiv", e.target.value)} style={mini} aria-label="Niveau du scroll">
            <option value="">+ ?</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>+{n}</option>)}
          </select>
        </div>
      )}

      {r.elementMax > 0 && (
        <div style={ligne}>
          <span style={etiquette}>Élément</span>
          <select value={choix.element} onChange={(e) => maj("element", e.target.value)} style={mini} aria-label="Élément">
            <option value="">aucun</option>
            {ELEMENTS.map((el) => <option key={el} value={el}>{el}</option>)}
          </select>
          <select value={choix.elementNiv} onChange={(e) => maj("elementNiv", e.target.value)} style={mini} aria-label="Niveau d'élément">
            <option value="">+ ?</option>
            {Array.from({ length: r.elementMax }, (_, i) => i + 1).map((n) => <option key={n} value={n}>+{n}</option>)}
          </select>
        </div>
      )}

      {/* ── Sertissage et gemmes ────────────────────────────────────────────
          Il manquait, alors que c'est la moitié de la valeur d'une arme : on
          commandait « Arbalète Mythique +20 » sans jamais dire ce qu'il y avait
          dedans. Un emplacement laissé vide veut dire « peu importe » — on ne
          force personne à remplir les cinq. */}
      {r.sertissage && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={ligne}>
            <span style={etiquette}>Sertissage</span>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
              {Array.from({ length: r.sertissage.diamants }, (_, i) => (
                <select key={i} value={choix.diamants?.[i] ?? ""} onChange={(e) => majEmplacement("diamants", i, e.target.value)}
                  style={{ ...mini, fontSize: 11.5 }} aria-label={`Diamant ${i + 1}`} title={`Diamant ${i + 1}`}>
                  <option value="">Diamant {i + 1}</option>
                  {STATS_DIAMANT.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ))}
            </div>
          </div>
          {/* Les holographiques n'existent qu'en artefact : on le dit au lieu de
              les cacher, sinon on les cherche. */}
          {/* Comme dans le builder : les holos n'existent qu'au-delà de +10. */}
          {r.sertissage.holo > 0 && Number(choix.up) > 10 ? (
            <div style={ligne}>
              <span style={{ ...etiquette, color: "var(--purple)" }}>Holo</span>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                {Array.from({ length: r.sertissage.holo }, (_, i) => (
                  <select key={i} value={choix.holo?.[i] ?? ""} onChange={(e) => majEmplacement("holo", i, e.target.value)}
                    style={{ ...mini, fontSize: 11.5, borderColor: choix.holo?.[i] ? "var(--purple)" : "var(--border)" }} aria-label={`Diamant holographique ${i + 1}`}>
                    <option value="">Holo {i + 1}</option>
                    {STATS_HOLO.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", paddingLeft: 62 }}>
              Les 3 diamants holographiques se débloquent en Artefact (+11 à +20).
            </div>
          )}
        </div>
      )}

      {r.gemmes > 0 && (
        <div style={ligne}>
          <span style={etiquette}>Gemmes</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {Array.from({ length: r.gemmes }, (_, i) => (
              <select key={i} value={choix.gemmes?.[i] ?? ""} onChange={(e) => majEmplacement("gemmes", i, e.target.value)}
                style={{ ...mini, fontSize: 11.5 }} aria-label={`Gemme ${i + 1}`}>
                <option value="">Gemme {i + 1}</option>
                {STATS_GEMME.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ))}
          </div>
        </div>
      )}

      {resumerPiece(choix) && (
        <div style={{ fontSize: 12, color: "var(--gold)" }}>
          Je cherche : {nom ? <b>{nom}</b> : null} {nom ? "— " : ""}{resumerPiece(choix)}
        </div>
      )}
    </div>
  );
}
