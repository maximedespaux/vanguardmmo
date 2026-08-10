/**
 * Les icônes du jeu, telles que l'AirBuilder les emploie.
 *
 * Elles vivaient uniquement dans le moteur vanilla (`public/airbuilder/`). La
 * boutique décrivait donc les mêmes réglages en texte pur : « Fulgur », « R1 »,
 * « Diamant 3 ». On composait une pièce à l'aveugle ici et on la revoyait
 * illustrée là-bas — deux vocabulaires pour une seule chose. Ce fichier tient
 * les chemins en un seul endroit, pour que les deux écrans montrent la même
 * carte, la même pierre et le même parchemin.
 *
 * Les fichiers eux-mêmes restent sous `public/airbuilder/icons/` : ce sont les
 * assets du builder, on les partage, on ne les duplique pas.
 */

/** Perçage : deux familles, et le même élément change de nom d'une à l'autre.
 *  Voir le commentaire de `PIERCECARD` dans `public/airbuilder/airbuilder.js`. */
export const CARTES_ATTAQUE = ["Feu", "Eau", "Air", "Terre", "Foudre"] as const;
export const CARTES_DEFENSE = ["Volcano", "Océane", "Néant", "Séisme", "Fulgur"] as const;
/** Les paliers proposés. Le jeu en a quatre par famille ; on s'en tient à deux. */
export const PALIERS_ATTAQUE = ["A", "S"] as const;
export const PALIERS_DEFENSE = ["7", "10"] as const;

/** La couleur de l'élément, identique des deux côtés de la paire. */
export const COULEUR_CARTE: Record<string, string> = {
  Feu: "#F87171", Volcano: "#F87171",
  Eau: "#4EA8FF", "Océane": "#4EA8FF",
  Air: "#33D6A6", "Néant": "#33D6A6",
  Terre: "#4ADE80", "Séisme": "#4ADE80",
  Foudre: "#FFD24A", Fulgur: "#FFD24A",
};

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** L'image d'une carte de perçage. Sans palier, on montre le plus bas. */
export function carteDePercage(element: string, palier?: string): string | null {
  if (!element) return null;
  const def = (CARTES_DEFENSE as readonly string[]).includes(element);
  const atk = (CARTES_ATTAQUE as readonly string[]).includes(element);
  if (!def && !atk) return null;
  const dispo: readonly string[] = def ? PALIERS_DEFENSE : PALIERS_ATTAQUE;
  const p = palier && dispo.includes(palier) ? palier : dispo[0];
  return `/airbuilder/icons/percage/${sansAccent(element)}-${sansAccent(p)}.png`;
}

/** Le libellé d'un palier : « 10 % » en défense, « S » à l'attaque. */
export const libellePalier = (element: string, palier: string) =>
  (CARTES_DEFENSE as readonly string[]).includes(element) ? `${palier} %` : palier;

/**
 * « Fulgur 10 % » → ["Fulgur", "10"].
 *
 * Le dépôt du builder écrit l'élément et le palier dans un seul champ : c'est
 * ce que le vendeur doit lire d'un trait. Ici on le redécoupe pour repositionner
 * les deux boutons, sans changer la forme stockée.
 */
export function decouperCarte(valeur?: string | null): [string, string] {
  const v = (valeur ?? "").trim();
  if (!v) return ["", ""];
  const m = v.match(/^(\S+)\s+(\S+)/);
  if (!m) return [v, ""];
  return [m[1], m[2].replace(/[^\dASR]/gi, "")];
}

/** Recompose le champ à partir des deux boutons. */
export const composerCarte = (element: string, palier: string) =>
  element ? (palier ? `${element} ${libellePalier(element, palier)}` : element) : "";

/** Élément de la pièce (≠ carte de perçage) : les cinq pastilles du jeu. */
export const ICONE_ELEMENT: Record<string, string> = {
  Feu: "/airbuilder/icons/elements/FireSmall.webp",
  Eau: "/airbuilder/icons/elements/WaterSmall.webp",
  Vent: "/airbuilder/icons/elements/WindSmall.webp",
  Terre: "/airbuilder/icons/elements/EarthSmall.webp",
  "Électricité": "/airbuilder/icons/elements/ElectricSmall.webp",
};

/** Les deux parchemins d'éveil, dans leur version de base. */
export const ICONE_EVEIL: Record<string, string> = {
  R1: "/airbuilder/icons/R1.png",
  R2: "/airbuilder/icons/R2.png",
};

const SERT = "/airbuilder/icons/sertissage";
export const ICONE_DIAMANT = `${SERT}/diamant.png`;
export const ICONE_HOLO = `${SERT}/diamant-holo.png`;
export const ICONE_SCROLL = `${SERT}/statscroll.png`;
export const ICONE_ETOILE = `${SERT}/artefact.png`;
export const ICONE_UPGRADE = `${SERT}/upgrade.png`;

/** Une gemme de costume porte le dessin de sa pièce. Faute d'emplacement connu
 *  — la boutique ne demande qu'« une gemme » —, on montre celle du chapeau. */
export const ICONE_GEMME: Record<string, string> = {
  fhead: `${SERT}/gemme-fhead.png`, ftop: `${SERT}/gemme-ftop.png`,
  fhand: `${SERT}/gemme-fhand.png`, ffoot: `${SERT}/gemme-ffoot.png`,
};
export const GEMME_PAR_DEFAUT = ICONE_GEMME.fhead;

/** L'icône qui va avec une ligne de la bulle, par son intitulé. */
export function iconeDeLigne(label: string, valeur?: string): string | null {
  switch (label) {
    case "Sertissage": return ICONE_DIAMANT;
    case "Holo": return ICONE_HOLO;
    case "Gemmes": return GEMME_PAR_DEFAUT;
    case "Scroll": return ICONE_SCROLL;
    case "Éveil": return ICONE_EVEIL[(valeur ?? "").trim().slice(0, 2)] ?? ICONE_EVEIL.R1;
    case "Perçage": {
      // « 4 · Fulgur 10 % » : l'élément et son palier suivent le nombre d'ouverts.
      const apres = (valeur ?? "").split("·").slice(1).join("·").trim();
      const [el, rang] = decouperCarte(apres);
      return carteDePercage(el, rang);
    }
    case "Élément": {
      const el = (valeur ?? "").replace(/\s*\+\d+\s*$/, "").trim();
      return ICONE_ELEMENT[el] ?? null;
    }
    default: return null;
  }
}
