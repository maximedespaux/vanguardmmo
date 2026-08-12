"use client";
import { Bulle } from "@/components/Bulle";
import type { DonjonClient } from "./donneesClient";

/**
 * L'ÉLÉMENT, EN IMAGE — et la réponse à un défaut de données qui traînait.
 *
 * ┌──── CE QUE LA PAGE AFFICHAIT, ET POURQUOI ÇA NE DISAIT RIEN ────┐
 * │ `dungeons.json` porte un champ `elem` présenté comme « Élément   │
 * │ boss ». Il vaut « Terre » sur LES VINGT-TROIS donjons, sans      │
 * │ exception — compté sur le fichier. Une colonne dont toutes les   │
 * │ lignes sont identiques ne permet aucun choix, et la série a      │
 * │ toutes les allures du copier-coller déjà constaté sur les        │
 * │ prestiges du client (voir `EcartPrestige`).                      │
 * │                                                                  │
 * │ Ce qui, lui, change ce qu'on emporte, c'est la FAIBLESSE des     │
 * │ créatures posées — et elle varie : vent, feu, eau, électricité   │
 * │ selon l'instance. Elle est LUE dans la table de résistances de   │
 * │ chaque monstre, jamais déduite de la roue élémentaire : des      │
 * │ monstres de ce jeu résistent à trois éléments à la fois.         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Les cinq dessins viennent du client (`/jeu/mecaniques/element-*.webp`) et
 * servent déjà sur la page des monstres : le même élément a la même image d'un
 * écran à l'autre, c'est tout l'intérêt. Un élément hors des cinq — « Aucun » —
 * n'a pas d'image et n'en reçoit pas d'inventée.
 */

/** Les cinq éléments du jeu, écrits comme les données de donjon les écrivent. */
const FICHIER: Record<string, string> = {
  Feu: "feu", Eau: "eau", Vent: "vent", Terre: "terre",
  "Électricité": "electricite", Electricite: "electricite",
};

export const iconeElementFr = (elem?: string | null): string | null => {
  const f = elem ? FICHIER[elem.trim()] : null;
  return f ? `/jeu/mecaniques/element-${f}.webp` : null;
};

/** L'image d'un élément, ou rien. `titre` porte le mot pour qui survole. */
export function IconeElementDonjon({ elem, taille = 15 }: { elem?: string | null; taille?: number }) {
  const src = iconeElementFr(elem);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={elem ?? ""} title={elem ?? undefined} width={taille} height={taille}
    style={{ objectFit: "contain", flexShrink: 0, verticalAlign: "-2px" }} />;
}

/** Y a-t-il une faiblesse relevée sur ce donjon ? À demander AVANT de dessiner le
 *  cadre qui entoure les icônes : sans ça, une instance sans faiblesse relevée
 *  affichait une pastille vide ne portant que son pictogramme. */
export const aDesFaiblesses = (d: DonjonClient) => d.monstres.some((m) => !!m.faible);

/**
 * CE À QUOI LE PEUPLEMENT EST FAIBLE, en icônes.
 *
 * On agrège les faiblesses des créatures posées et on compte combien d'espèces
 * portent chacune : deux icônes dans une pastille disent en 40 px ce que
 * « faible au vent, faible au feu » disait sur deux lignes de tuile. La bulle
 * garde le détail — quelle espèce, pour ne pas emporter le mauvais élément sur
 * la foi d'une majorité.
 *
 * Rend `null` quand aucune espèce posée n'a de faiblesse relevée : le Temple
 * aérien n'a aucun monstre dans son fichier de carte, et une pastille vide
 * laisserait croire à un site cassé.
 */
export function FaiblessesDonjon({ d, taille = 13, bulle = true }: {
  d: DonjonClient;
  taille?: number;
  /** `false` DANS UN ÉLÉMENT DÉJÀ CLIQUABLE. Une bulle est un `<button>` : posée
   *  dans la tuile d'un donjon, qui ouvre la fiche au clic, l'ouvrir ouvrait aussi
   *  la fiche. Les tuiles s'en servent sans bulle, la fiche avec. */
  bulle?: boolean;
}) {
  const compte = new Map<string, string[]>();
  for (const m of d.monstres) {
    if (!m.faible) continue;
    compte.set(m.faible, [...(compte.get(m.faible) ?? []), m.nom]);
  }
  if (!compte.size) return null;
  const rangs = [...compte.entries()].sort((a, b) => b[1].length - a[1].length);
  const icones = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {rangs.map(([el]) => <IconeElementDonjon key={el} elem={el} taille={taille} />)}
    </span>
  );
  if (!bulle) return icones;
  return (
    <Bulle
      largeur={280}
      quoi={
        <span style={{ display: "grid", gap: 6 }}>
          {rangs.map(([el, noms]) => (
            <span key={el} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <IconeElementDonjon elem={el} taille={14} />
              <span style={{ minWidth: 0 }}>
                <b>{el}</b> — {noms.slice(0, 4).join(", ")}
                {noms.length > 4 ? ` et ${noms.length - 4} autre${noms.length - 4 > 1 ? "s" : ""}` : ""}
              </span>
            </span>
          ))}
          <span style={{ color: "var(--text-muted)" }}>
            Lu dans la table de résistances de chaque créature, pas déduit de la roue élémentaire.
          </span>
        </span>
      }
    >
      {icones}
    </Bulle>
  );
}
