"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Chercher, Chiffre, Chiffres, Source } from "./briques";
import { clef, type Deck } from "./donnees";

/**
 * LES CARNETS DE CARTES — avec les illustrations, enfin.
 *
 * Le builder connaît quinze carnets mais leur prête des bonus très pauvres,
 * et il ne montre aucune carte. La fouille donne les deux : les bonus exacts
 * de chaque carnet, et les 129 illustrations du client.
 *
 * L'image se retrouve par la clef de l'objet — `II_SYS_SYS_MONSTERDECK_7`
 * devient `couleur_ii_sys_sys_monsterdeck_7.webp`. Le client en garde deux
 * versions, la couleur pour la carte obtenue et le noir et blanc pour la case
 * vide ; on ne montre que la couleur, parce que la page dit ce qui EXISTE, pas
 * ce que tel joueur possède.
 *
 * Le client nomme les carnets par une clef non traduite (`TID_DECK_ARCANE_4`) :
 * on n'invente pas de nom français, on les numérote comme le jeu les numérote,
 * et le bonus tient lieu d'identité — c'est de toute façon lui qu'on cherche.
 */
export function Cartes({ decks, definies, placees, source }: {
  decks: Deck[]; definies: number; placees: number; source: string;
}) {
  const [q, setQ] = useState("");

  const vus = useMemo(() => {
    const k = clef(q.trim());
    if (!k) return decks;
    return decks.filter((d) =>
      d.cartes.some((c) => clef(c.n).includes(k)) ||
      d.bonus.some(([l]) => clef(l).includes(k)) ||
      clef(d.etui).includes(k) ||
      String(d.id) === k);
  }, [decks, q]);

  return (
    <div>
      <Chiffres>
        <Chiffre valeur={decks.length} quoi="carnets, chacun avec son bonus" icon="card" />
        <Chiffre valeur={`${placees} / ${definies}`} quoi="cartes rangées dans un carnet" icon="grid" couleur="var(--gn-accent)" />
        <Chiffre valeur={definies - placees} quoi="cartes définies hors carnet" icon="help" couleur="var(--text-muted)" />
      </Chiffres>

      <div style={{ marginBottom: 12 }}>
        <Chercher valeur={q} sur={setQ} invite="Une carte, un bonus, un numéro de carnet" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(268px,1fr))", gap: 10 }}>
        {vus.map((d) => <CarteDeck key={d.id} d={d} />)}
      </div>

      {vus.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "26px 0" }}>
          Aucun carnet sous ce mot.
        </p>
      )}

      <Source fichier={source}
        avertissement={<>Les carnets n&apos;ont pas de nom français dans le client : leur clef (<code style={{ fontSize: 11 }}>TID_DECK_ARCANE_4</code>) n&apos;est pas traduite. On les numérote plutôt que de leur en inventer un.</>} />
    </div>
  );
}

function CarteDeck({ d }: { d: Deck }) {
  // Le bonus « éveillé » est presque toujours identique au bonus de base : on ne
  // l'affiche que quand il diffère réellement, sinon la carte porte deux fois
  // la même ligne et on cherche la différence pour rien.
  const memeBonus = JSON.stringify(d.bonus) === JSON.stringify(d.eveille);

  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className="font-heading" style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--gold)", fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {d.id}
        </span>
        <span className="font-heading" style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700 }}>Carnet {d.id}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.etui}</span>
      </div>

      {/* Les illustrations d'abord : c'est la seule façon de reconnaître une
          carte qu'on a en inventaire. Elles font 64 px dans le client, on les
          rend en pixels plutôt que floues. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {d.cartes.map((c) => (
          <span key={c.n} title={c.niv ? `${c.n} — niv. ${c.niv}` : c.n}
            style={{ display: "grid", gap: 3, justifyItems: "center", width: 58 }}>
            <span style={{ width: 52, height: 68, borderRadius: 6, background: "var(--bg-3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {c.art ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/jeu/cartes/${c.art}`} alt={c.n} width={50} height={66}
                  style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
              ) : <Icon name="card" size={18} style={{ color: "var(--text-muted)" }} />}
            </span>
            {/* Le préfixe « Carte » est RÉPÉTÉ dans le client sur au moins une
                entrée (« Carte Carte Bob Maître des nucléus ») : on retire
                toutes les occurrences en tête, pas seulement la première. Deux
                lignes autorisées plutôt qu'une coupée aux points de suspension —
                un nom de carte tronqué ne se reconnaît pas. */}
            <span style={{ fontSize: 9.5, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2, overflow: "hidden", maxHeight: 23, width: "100%" }}>
              {c.n.replace(/^(?:Carte\s+)+/i, "")}
            </span>
          </span>
        ))}
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
        {d.bonus.map(([l, v]) => (
          <li key={l} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{l}</span>
            <b className="font-heading" style={{ color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>+{v}</b>
          </li>
        ))}
      </ul>

      {!memeBonus && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, color: "var(--purple)", fontWeight: 700, marginBottom: 4 }}>Éveillé</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {d.eveille.map(([l, v]) => (
              <li key={l} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
                <span style={{ flex: 1, minWidth: 0 }}>{l}</span>
                <b className="font-heading" style={{ color: "var(--purple)", fontVariantNumeric: "tabular-nums" }}>+{v}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
