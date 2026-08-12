"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * L'ARBRE DU FARM — 39 fabrications, 115 ingrédients, et le chemin entre les deux.
 *
 * Ces recettes ne sont NULLE PART dans les fichiers d'échange du client : elles
 * vivent dans les descriptions françaises des ingrédients, sous la forme « Objet
 * nécessaire à la création de X (monstres et lieu) ». C'est la seule source pour
 * 38 des 39.
 *
 * L'arbre a plusieurs étages, et c'est tout l'intérêt : quand la source d'un
 * ingrédient dit « Crafting Masque Saint City », l'ingrédient n'est pas un butin,
 * c'est le produit d'un AUTRE craft. Une liste plate ferait croire qu'on va
 * chercher tout ça sur des monstres, alors qu'un tiers des lignes se fabrique.
 * D'où la descente (« ça se fabrique aussi ») et la remontée (« sert à »).
 */

export type Ingredient = {
  n: string; ic: string | null; ou: string; maison: boolean;
  /** Clef de l'arbre qui produit cet ingrédient, ou `null` s'il se farme. */
  vers: string | null;
  /** Quantité, quand la recette chiffrée du client la donne. Souvent absente. */
  q: number | null;
};
export type ArbreCraft = {
  cle: string; nom: string; pnj: string | null; st: string | null;
  recette: number | null; ing: Ingredient[]; utilisePar: string[];
};

const cle = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Les libellés viennent de phrases de description : certains démarrent en minuscule. */
const titre = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Vignette({ ic, taille = 30 }: { ic: string | null; taille?: number }) {
  if (!ic) {
    return <span style={{ width: taille, height: taille, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Icon name="package" size={Math.round(taille * 0.6)} /></span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/jeu/icones/${ic}`} alt="" width={taille} height={taille}
    style={{ width: taille, height: taille, flexShrink: 0, objectFit: "contain", imageRendering: "pixelated" }} />;
}

export function ArbreDuFarm({ arbres, carteRecette }: {
  arbres: ArbreCraft[];
  /** Rend la recette chiffrée correspondante. Dépliée SUR PLACE, pas dans une
   *  fenêtre : une modale posée dans un panneau qui porte un `transform` s'y
   *  retrouve enfermée, et on l'a déjà payé une fois sur ce site. */
  carteRecette?: (id: number) => React.ReactNode;
}) {
  // Le chemin parcouru, pas juste la sélection : on descend d'un cran par clic et
  // on doit pouvoir revenir sur ses pas sans perdre l'endroit d'où l'on venait.
  const [chemin, setChemin] = useState<string[]>([arbres[0]?.cle ?? ""]);
  const [q, setQ] = useState("");
  const [chiffree, setChiffree] = useState(false);

  const parCle = useMemo(() => new Map(arbres.map((a) => [a.cle, a])), [arbres]);
  const actif = parCle.get(chemin[chemin.length - 1]) ?? arbres[0];

  // La recherche porte aussi sur les ingrédients : on cherche « Koori » sans savoir
  // dans quelle fabrication il entre — c'est justement la question.
  const liste = useMemo(() => {
    const k = cle(q.trim());
    if (!k) return arbres;
    return arbres.filter((a) => cle(a.nom).includes(k) || a.ing.some((g) => cle(g.n).includes(k) || cle(g.ou).includes(k)));
  }, [arbres, q]);

  // Changer de fabrication referme la recette chiffrée : celle de la précédente
  // n'a rien à faire sous la suivante.
  const aller = (c: string) => { setChiffree(false); setChemin((p) => (p[p.length - 1] === c ? p : [...p, c])); };
  const remonter = (i: number) => { setChiffree(false); setChemin((p) => p.slice(0, i + 1)); };

  if (!actif) return null;

  const seFabriquent = actif.ing.filter((g) => g.vers).length;

  return (
    <div className="cr-arbre">

      <div style={{ display: "grid", gap: 9, alignContent: "start" }}>
        <label style={{ position: "relative", display: "block" }}>
          <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="un objet, un monstre, une zone…"
            style={{
              width: "100%", padding: "9px 10px 9px 31px", fontFamily: "inherit", fontSize: 12.5,
              background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, color: "var(--text)",
            }} />
        </label>

        <div style={{ maxHeight: 520, overflowY: "auto", display: "grid", gap: 5, paddingRight: 3 }}>
          {liste.map((a) => {
            const on = a.cle === actif.cle;
            return (
              <button key={a.cle} onClick={() => setChemin([a.cle])} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
                fontFamily: "inherit", padding: "7px 9px", borderRadius: 9,
                background: on ? "rgba(255,140,26,.1)" : "var(--bg-2)",
                border: `1px solid ${on ? "var(--orange)" : "var(--border)"}`,
              }} onClickCapture={() => setChiffree(false)}>
                <Vignette ic={a.ing[0]?.ic ?? null} taille={22} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? "var(--orange)" : "var(--text)" }}>
                  {titre(a.nom)}
                </span>
                <span style={{ flexShrink: 0, fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{a.ing.length}</span>
              </button>
            );
          })}
          {!liste.length && <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "6px 2px" }}>Aucune fabrication ne parle de ça.</p>}
        </div>
      </div>

      <div style={{ minWidth: 0 }}>

        {chemin.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 11, fontSize: 12 }}>
            {chemin.map((c, i) => (
              <span key={c + i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <Icon name="chevron-right" size={12} style={{ color: "var(--text-muted)" }} />}
                <button onClick={() => remonter(i)} disabled={i === chemin.length - 1} style={{
                  background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: 12,
                  cursor: i === chemin.length - 1 ? "default" : "pointer",
                  fontWeight: i === chemin.length - 1 ? 700 : 500,
                  color: i === chemin.length - 1 ? "var(--text)" : "var(--orange)",
                  textDecoration: i === chemin.length - 1 ? "none" : "underline",
                  textDecorationStyle: "dotted",
                }}>{titre(parCle.get(c)?.nom ?? c)}</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 11, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
          <Vignette ic={actif.ing[0]?.ic ?? null} taille={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-heading" style={{ fontSize: 16, fontWeight: 700 }}>{titre(actif.nom)}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {actif.ing.length} ingrédient{actif.ing.length > 1 ? "s" : ""}
              {seFabriquent > 0 && ` · dont ${seFabriquent} qui se fabrique${seFabriquent > 1 ? "nt" : ""} aussi`}
            </div>
          </div>
          {actif.pnj && (
            <span style={{ flexShrink: 0, fontSize: 11.5, textAlign: "right", color: "var(--text-muted)" }}>
              chez<br /><b style={{ color: "var(--orange)" }}>{actif.pnj}</b>
            </span>
          )}
        </div>

        {actif.recette != null && carteRecette && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setChiffree((v) => !v)} className="fx-card" style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12.5, padding: "9px 11px", borderRadius: 10,
              background: "rgba(74,222,128,.07)", border: "1px solid color-mix(in srgb, var(--green) 35%, transparent)", color: "var(--text)",
            }}>
              <Icon name="check" size={15} style={{ color: "var(--green)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Cette fabrication a aussi une <b>recette chiffrée</b> dans le client — quantités et PNJ confirmés.</span>
              <Icon name={chiffree ? "chevron-up" : "chevron-down"} size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
            </button>
            {chiffree && <div style={{ marginTop: 9 }}>{carteRecette(actif.recette)}</div>}
          </div>
        )}

        <div style={{ display: "grid", gap: 7 }}>
          {actif.ing.map((g) => (
            <div key={g.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <Vignette ic={g.ic} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{g.n}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>
                  <Icon name={g.vers ? "hammer" : "pickaxe"} size={11} style={{ flexShrink: 0 }} />
                  {g.ou}
                </span>
              </span>
              {g.q != null && (
                <b style={{ flexShrink: 0, fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--gold)" }}>×{g.q.toLocaleString("fr-FR")}</b>
              )}
              {g.vers && parCle.has(g.vers) && (
                <button onClick={() => aller(g.vers!)} style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: "inherit",
                  fontSize: 11.5, fontWeight: 700, padding: "5px 9px", borderRadius: 8,
                  background: "rgba(255,140,26,.1)", border: "1px solid color-mix(in srgb, var(--orange) 45%, transparent)", color: "var(--orange)",
                }}>
                  ça se fabrique <Icon name="chevron-right" size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {actif.utilisePar.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 7 }}>
              ce que ça sert à fabriquer
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {actif.utilisePar.map((c) => (
                <button key={c} onClick={() => aller(c)} style={{
                  display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
                  padding: "6px 10px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)",
                }}>
                  <Icon name="arrow-up" size={12} style={{ color: "var(--orange)" }} />
                  {titre(parCle.get(c)?.nom ?? c)}
                </button>
              ))}
            </div>
          </div>
        )}

        <p style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.55, color: "var(--text-muted)" }}>
          Les descriptions du client donnent les ingrédients et où les farmer, <b>pas les
          quantités ni le PNJ qui réalise l’échange</b> — sauf pour les masques PvE, dont la
          recette chiffrée existe par ailleurs. Les quantités absentes ci-dessus sont donc
          inconnues, pas égales à un.
        </p>
      </div>

      <style>{`
        .cr-arbre{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}
        @media(max-width:880px){.cr-arbre{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
