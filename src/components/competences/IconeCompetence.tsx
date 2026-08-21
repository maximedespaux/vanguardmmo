"use client";
import type { Planche } from "./donnees";

/**
 * L'ICÔNE D'UNE COMPÉTENCE — celle du jeu, découpée dans la planche.
 *
 * D'où elle vient : `propSkill.txt` porte une colonne `szIcon` qui NOMME le
 * fichier de l'icône de chaque compétence. C'est la donnée du client qui fait
 * la correspondance, pas une ressemblance de noms — voir
 * `scripts/extraire-icones-competences.mjs`, qui assemble les dessins en une
 * image et pose le numéro de case sur chaque compétence.
 *
 * POURQUOI UNE PLANCHE ET PAS DEUX CENTS FICHIERS : le catalogue peut afficher
 * les 197 compétences d'un coup. En fichiers séparés, c'étaient deux cents
 * requêtes ; ici, une seule image, déjà en cache dès la deuxième icône lue.
 *
 * POURQUOI `<span>` ET PAS `<img>` : une planche s'affiche par sa position de
 * fond. Le rôle est purement décoratif — le nom de la compétence est écrit
 * juste à côté —, donc `aria-hidden` : un lecteur d'écran qui annonce « image »
 * entre chaque nom rend la liste illisible.
 *
 * LA TAILLE PAR DÉFAUT EST CELLE DU JEU. Les icônes font 32 px et on les
 * affiche à 32 px : un pixel de l'image pour un pixel de l'écran, jamais de
 * flou d'interpolation. Une autre taille reste possible et la planche suit,
 * puisque `backgroundSize` se recalcule sur la grille.
 */
export function IconeCompetence({ planche, index, taille, titre }: {
  planche: Planche | null;
  /** Le numéro de case. `null` quand le client ne donne pas d'icône. */
  index: number | null;
  taille?: number;
  /** Infobulle native — utile quand l'icône est seule dans une case étroite. */
  titre?: string;
}) {
  if (!planche || index == null) return null;
  const t = taille ?? planche.taille;
  const k = t / planche.taille;
  return (
    <span aria-hidden title={titre} style={{
      width: t, height: t, flexShrink: 0, display: "block", borderRadius: 6,
      backgroundImage: `url(${planche.fichier})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${planche.colonnes * t}px ${planche.lignes * t}px`,
      backgroundPosition: `${-(index % planche.colonnes) * t}px ${-Math.floor(index / planche.colonnes) * t}px`,
      // Agrandie, une icône de 32 px doit rester nette : c'est du dessin au
      // pixel, un lissage la rendrait molle. Réduite, on garde le lissage.
      imageRendering: k > 1 ? "pixelated" : undefined,
    }} />
  );
}

/**
 * La case vide, exactement au gabarit de l'icône.
 *
 * Elle sert quand une ligne de liste doit garder son alignement alors que la
 * compétence n'a pas de dessin : sans elle, un nom se décalerait de 32 px et la
 * colonne se mettrait à zigzaguer. Aujourd'hui les 197 compétences ont leur
 * icône, mais le jour où le client en ajoute une, la liste ne bougera pas.
 */
export function CaseVide({ taille = 32 }: { taille?: number }) {
  return <span aria-hidden style={{ width: taille, height: taille, flexShrink: 0, display: "block", borderRadius: 6, background: "var(--bg-3)", border: "1px solid var(--border)" }} />;
}
