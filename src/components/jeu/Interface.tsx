/**
 * LE VOCABULAIRE VISUEL DU JEU — dés de statistique, plaquettes de grade, étoiles,
 * marqueurs de carte.
 *
 * Demande de Maxime : « n'oublie pas les assets du jeu, icônes etc, et faire des effets,
 * design du jeu etc pour mieux reprendre ». Le site dessinait ses propres pastilles et
 * ses propres cadres, alors que le jeu a les siens — et ils dormaient dans
 * public/jeu/interface/, 71 fichiers dont 10 branchés.
 *
 * ┌──────── LE PIÈGE, ET IL AURAIT ÉTÉ INVISIBLE ────────┐
 * │ Les fichiers `barbg`, `bargreen`, `barred`, `barsky` et │
 * │ `barbule` s'appellent « bar » et N'EN SONT PAS. Ouverts │
 * │ à l'écran, ce sont de petites SPHÈRES — les embouts     │
 * │ d'orbe de vie et de mana du jeu. Les étirer comme       │
 * │ remplissage de barre les transforme en taches.          │
 * │ Les barres de ce site restent donc en CSS : une div     │
 * │ dont la largeur porte la grandeur. Aucun asset du jeu   │
 * │ ne sait faire ça.                                       │
 * └─────────────────────────────────────────────────────────┘
 *
 * TOUTES LES TAILLES ONT ÉTÉ MESURÉES avant d'écrire une ligne, parce que la brique de
 * rareté a déjà coûté cette leçon — on y avait posé des cadres 110×250 dans un carré :
 *
 *   statdice_<stat>          50 × 50   carré      les quatre tuiles de statistique
 *   statdice_plus            15 × 17   presque    le bouton d'attribution
 *   icon_artefact/ultimate   51 × 14   3,64 !     plaquettes HORIZONTALES, pas des carrés
 *   icon_artefact_star*      16 × 16   carré      l'étoile pleine et l'étoile vide
 *   usermark                 24 × 24   carré      une CROIX ROUGE
 *   teleportmark01/02        16 × 26   0,62       des épingles, plus hautes que larges
 *   window02                168 × 32   5,25       cadre à découper en neuf, jamais étiré
 *   lock                     13 × 16   0,81
 *
 * CE QUE LE JEU DIT DÉJÀ EN FRANÇAIS : les quatre dés portent FOR, END, DEX et INT
 * gravés dans la pierre. On ne réécrit donc pas ces mots à côté — ce serait les dire
 * deux fois.
 */
import React from "react";

/** Les quatre statistiques attribuables, telles que le jeu les nomme. */
export const STATS = ["str", "sta", "dex", "int"] as const;
export type Stat = (typeof STATS)[number];

/** Le mot que le dé porte DÉJÀ, gravé dans l'image. Il sert au texte de remplacement
 *  et aux lecteurs d'écran, pas à être réécrit à côté de l'icône. */
export const STAT_FR: Record<Stat, string> = {
  str: "Force", sta: "Endurance", dex: "Dextérité", int: "Intelligence",
};

const RATIO_PLAQUE = 51 / 14;
const RATIO_EPINGLE = 16 / 26;

/**
 * LE DÉ D'UNE STATISTIQUE — la tuile de pierre du jeu, avec son mot gravé.
 *
 * `valeur` s'affiche À CÔTÉ et non dessus : le dé porte déjà trois lettres, un nombre
 * par-dessus deviendrait illisible. C'est aussi ce que fait le jeu.
 */
export function DeStat({ stat, valeur, taille = 34 }: {
  stat: Stat;
  /** La valeur atteinte. Omise, le dé sert de simple étiquette. */
  valeur?: number | string;
  taille?: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/jeu/interface/statdice_${stat}.webp`} alt={STAT_FR[stat]} title={STAT_FR[stat]}
        width={taille} height={taille} style={{ objectFit: "contain", flexShrink: 0 }} />
      {valeur != null && (
        <span className="font-heading" style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {typeof valeur === "number" ? valeur.toLocaleString("fr-FR") : valeur}
        </span>
      )}
    </span>
  );
}

/**
 * LA PLAQUETTE DE GRADE — « Artefact » ou « Ultime », telle que le jeu la dessine.
 *
 * Le mot est DANS l'image : on ne l'écrit pas à côté, et le texte de remplacement le
 * porte pour ceux qui ne voient pas l'image. C'est la même leçon que la bannière
 * « Chambres Secrètes », où l'image disait un nom et le titre un autre.
 *
 * `hauteur` seule est réglable — la largeur suit le ratio 51/14. Forcer une largeur
 * écraserait le mot.
 */
export function PlaqueGrade({ grade, hauteur = 15 }: { grade: "artefact" | "ultimate"; hauteur?: number }) {
  const mot = grade === "artefact" ? "Artefact" : "Ultime";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/jeu/interface/icon_${grade === "artefact" ? "artefact" : "ultimate"}.webp`}
      alt={mot} title={mot}
      style={{ height: hauteur, aspectRatio: `${RATIO_PLAQUE}`, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }} />
  );
}

/**
 * LES ÉTOILES D'ARTEFACT — pleines et vides, celles du jeu.
 *
 * Le compte est écrit à côté en petit : dix étoiles ne se comptent pas d'un regard, et
 * un lecteur d'écran ne voit que ce texte, les images étant décoratives.
 */
export function Etoiles({ pleines, total, taille = 15 }: { pleines: number; total: number; taille?: number }) {
  // Un total plus petit que le nombre d'étoiles pleines est une donnée incohérente :
  // on montre alors tout ce qu'on a plutôt que d'en couper une en silence.
  const cases = Math.max(total, pleines);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {Array.from({ length: cases }, (_, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={`/jeu/interface/icon_artefact_star${i < pleines ? "fill" : "empty"}.webp`}
          alt="" aria-hidden="true" width={taille} height={taille} style={{ objectFit: "contain" }} />
      ))}
      <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
        {pleines}/{cases}
      </span>
    </span>
  );
}

/**
 * UN MARQUEUR SUR UNE CARTE — la croix rouge du jeu, ou son épingle de téléporteur.
 *
 * ┌──────────── CE QUE CE COMPOSANT NE FAIT PAS ────────────┐
 * │ Il ne CALCULE aucune position. On lui donne un `x` et un │
 * │ `y` en pourcentage de l'image, il les pose. La règle de  │
 * │ Maxime tient : « pas besoin d'indiquer la position, on   │
 * │ ne peut pas la situer » — et une croix au mauvais        │
 * │ endroit est pire qu'un nom de zone. Tant que la          │
 * │ conversion des coordonnées du client vers un pourcentage │
 * │ de carte n'est pas VÉRIFIÉE sur un cas connu, ce         │
 * │ composant ne doit pas être appelé avec des valeurs       │
 * │ devinées. Il existe pour le jour où elle le sera.        │
 * └─────────────────────────────────────────────────────────┘
 *
 * L'épingle est ancrée par sa POINTE (bas-centre) et la croix par son CENTRE : une
 * épingle centrée sur le point désignerait un endroit situé une demi-épingle trop haut.
 */
export function Marqueur({ x, y, genre = "croix", quoi, taille = 22 }: {
  /** En pourcentage de la largeur de l'image parente (qui doit être `position: relative`). */
  x: number;
  y: number;
  genre?: "croix" | "epingle" | "epingle-rose";
  /** Ce que le marqueur désigne — obligatoire : un marqueur muet n'informe personne. */
  quoi: string;
  taille?: number;
}) {
  const src = genre === "croix"
    ? "/jeu/interface/usermark.webp"
    : `/jeu/interface/teleportmark0${genre === "epingle" ? 1 : 2}.webp`;
  const epingle = genre !== "croix";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={quoi} title={quoi}
      style={{
        position: "absolute", left: `${x}%`, top: `${y}%`,
        height: taille, aspectRatio: epingle ? `${RATIO_EPINGLE}` : "1",
        objectFit: "contain",
        // La pointe de l'épingle est en bas ; la croix se centre.
        transform: epingle ? "translate(-50%, -100%)" : "translate(-50%, -50%)",
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,.9))", pointerEvents: "none",
      }} />
  );
}

/**
 * LE CADRE DE FENÊTRE DU JEU, en bordure découpée.
 *
 * `window02` fait 168 × 32 : c'est une barre de titre, pas un cadre carré. Étirée, ses
 * coins ornés s'écrasent — d'où `border-image` avec un découpage, la seule façon
 * d'étirer les côtés sans toucher aux coins.
 *
 * À employer avec parcimonie : le site a sa propre charte (`glass-card`), et un cadre
 * du jeu autour de chaque bloc ferait un patchwork. Il vaut pour ce qui doit se lire
 * COMME une fenêtre du jeu — un panneau de statistiques, une bulle d'objet.
 */
export function CadreJeu({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      /* 10 px de découpe sur une image de 32 de haut : c'est la part occupée par le
         liseré doré, mesurée sur le fichier. `fill` garde le fond central de l'image
         plutôt que de le laisser transparent. */
      borderImage: "url(/jeu/interface/window02.webp) 10 fill stretch",
      borderWidth: 10, borderStyle: "solid", borderColor: "transparent",
      ...style,
    }}>
      {children}
    </div>
  );
}
