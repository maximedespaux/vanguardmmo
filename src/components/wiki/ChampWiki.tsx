"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Resultat } from "./Resultat";
import { useWiki } from "./useWiki";

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  LA PORTE DU WIKI, À POSER SUR N'IMPORTE QUELLE PAGE                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * `<ChampWiki />` — un champ compact qui cherche dans les 14 000 noms du site et
 * répond en six lignes sous le curseur. À poser dans l'en-tête d'une page (la prop
 * `right` de `PageHeader` s'y prête) : chaque page devient une entrée du wiki sans
 * cesser d'être elle-même.
 *
 * C'EST LA MÊME ROUTE ET LES MÊMES LIGNES que la page /wiki — pas une seconde
 * recherche écrite à côté. Une recherche redessinée par page diverge au premier
 * ajustement, et c'est exactement comme ça qu'on est arrivé à dix recherches
 * différentes sur ce site.
 *
 * DEUX PARTIS PRIS :
 *  1. RIEN AVANT DEUX CARACTÈRES. « a » sort 8 000 lignes : ce n'est pas une réponse,
 *     et la route travaillerait à chaque frappe pour du bruit.
 *  2. LE PANNEAU EST ABSOLU DANS UN PARENT RELATIF, pas un portail. Piège déjà payé
 *     sur ce site : une couche posée haut dans l'arbre s'est retrouvée enfermée par un
 *     ancêtre portant un `transform`. Ici le panneau suit son champ.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

export function ChampWiki({ largeur = 300, placeholder = "Chercher dans le wiki" }: {
  largeur?: number | string;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const assezLong = q.trim().length >= 2;
  const { r } = useWiki({ q, type: "", maison: false, n: 6 }, assezLong);
  const visible = ouvert && assezLong;

  /**
   * ON FERME SUR UN CLIC DEHORS, PAS SUR LA PERTE DE FOCUS.
   *
   * `onBlur` était le réflexe et il casse le composant : au `mousedown` sur un
   * résultat, plusieurs navigateurs rendent `relatedTarget` à `null` — le panneau se
   * démontait donc AVANT que le clic n'atteigne le lien, et la navigation était perdue.
   * Un écouteur `pointerdown` sur le document se déclenche, lui, après avoir vu OÙ on
   * appuie.
   */
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (ev: PointerEvent) => {
      if (!boite.current?.contains(ev.target as Node)) setOuvert(false);
    };
    document.addEventListener("pointerdown", dehors);
    return () => document.removeEventListener("pointerdown", dehors);
  }, [ouvert]);

  return (
    <div
      ref={boite}
      style={{ position: "relative", width: largeur, maxWidth: "100%" }}
      onFocus={() => setOuvert(true)}
    >
      <Icon name="search" size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOuvert(false); (e.target as HTMLInputElement).blur(); }
          // Entrée mène à la page entière : six lignes ne sont qu'un aperçu, et il faut
          // un endroit où voir les 300 autres.
          if (e.key === "Enter" && assezLong) router.push(`/wiki?q=${encodeURIComponent(q.trim())}`);
        }}
        placeholder={placeholder}
        aria-label="Chercher dans le wiki : objets, monstres, recettes, PNJ, compétences"
        style={{
          background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10,
          padding: "9px 12px 9px 33px", color: "var(--text)", fontSize: 13, fontFamily: "inherit", width: "100%",
        }}
      />

      {visible && (
        <div className="glass-card" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          padding: 6, display: "grid", gap: 2, maxHeight: "min(64vh, 420px)", overflowY: "auto",
        }}>
          {r?.resultats.length ? (
            <>
              {r.resultats.map((e) => <Resultat key={`${e.t}-${e.id}`} e={e} compact />)}
              {/* LE PLAFOND S'ANNONCE. Six lignes sous un total de 312 doivent dire 312,
                  sinon on croit avoir tout vu. */}
              <Link href={`/wiki?q=${encodeURIComponent(q.trim())}`} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 9px", marginTop: 2,
                borderTop: "1px solid var(--border)", textDecoration: "none",
                color: "var(--gn-accent)", fontSize: 12, fontWeight: 600,
              }}>
                <Icon name="arrow-right" size={12} />
                {r.total > r.montres
                  ? <>Les <span style={{ ...NUM }}>{r.total.toLocaleString("fr-FR")}</span> réponses</>
                  : <>Ouvrir dans le wiki</>}
              </Link>
            </>
          ) : (
            <div style={{ padding: "12px 10px", fontSize: 12.5, color: "var(--text-muted)", textAlign: "center" }}>
              {r ? "Rien sous ce mot." : "…"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
