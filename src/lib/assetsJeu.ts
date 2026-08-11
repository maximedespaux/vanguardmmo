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

/* ── Les mécaniques telles que le JEU les dessine ─────────────────────────
 *
 * Tout ce qui précède vient du builder (`/airbuilder/icons/`). Ce qui suit
 * vient de la fouille du client (`/jeu/mecaniques/`, `/jeu/interface/`), et on
 * garde les deux dossiers séparés : mélangés, on ne saurait plus quelle image
 * est un asset maison et laquelle sort du jeu.
 *
 * Règle de toute la section : une fonction rend `null` dès qu'elle n'a pas de
 * fichier CERTAIN, et l'appelant garde alors son texte tel quel. Une icône
 * fausse ou cassée coûte plus cher que pas d'icône — sur une rareté ou une
 * ascension, on la croirait.
 */
const MECA = "/jeu/mecaniques";
const ITF = "/jeu/interface";

/**
 * Les parchemins de rareté.
 *
 * Il en manque deux volontairement : « Commun » est l'état de base et n'a pas
 * de parchemin, et le client n'en livre pas pour « Mythique ». On préfère le
 * trou au recyclage de celui du palier voisin : la rareté est la première chose
 * qu'on lit sur une arme, une image empruntée s'y verrait immédiatement.
 */
export const ICONE_RARETE: Record<string, string> = {
  Rare: `${MECA}/rarete-rare.webp`,
  "Épique": `${MECA}/rarete-epique.webp`,
  "Légendaire": `${MECA}/rarete-legendaire.webp`,
  "Pré-Mythique": `${MECA}/rarete-pre-mythique.webp`,
};

/** Les couleurs de rareté du moteur (RARCOL dans airbuilder.js). Recopiées —
 *  pas importées : le moteur est du JS vanilla qu'on ne touche pas. Si l'une
 *  bouge là-bas, elle doit bouger ici, sans quoi la même arme n'aurait pas la
 *  même couleur dans le builder et dans la boutique. */
export const COULEUR_RARETE: Record<string, string> = {
  Commun: "#9CA3AF", Rare: "#4EA8FF", "Épique": "#C77DFF",
  "Légendaire": "#FF8C1A", "Pré-Mythique": "#FF5C8A", Mythique: "#C92A2A",
};

/** Le bandeau « Artefact » du jeu — 51×14, c'est une ÉTIQUETTE et pas une icône
 *  carrée. Forcée dans un carré de 16 px elle s'écrase et devient illisible :
 *  on lui fixe la hauteur et on laisse la largeur suivre. */
export const ETIQUETTE_ARTEFACT = `${ITF}/icon_artefact.webp`;
/** Même forme, l'autre palier : « Ultime ». */
export const ETIQUETTE_ULTIME = `${ITF}/icon_ultimate.webp`;
/** Les étoiles d'artefact du jeu. Le « ★ » d'une police fait le travail, mais
 *  pas le même : celles-ci sont les étoiles que le membre voit sur sa pièce. */
export const ETOILE_PLEINE = `${ITF}/icon_artefact_starfill.webp`;
export const ETOILE_VIDE = `${ITF}/icon_artefact_starempty.webp`;

/**
 * Les neuf familles d'ascension d'artefact.
 *
 * Le client n'a pas un plan par arme mais un par FAMILLE, et le glaive partage
 * le sien avec la doloire — c'est le fichier lui-même qui le dit
 * (`artefact-ascension-glaive-doloire-1.webp`). On ne devine rien d'autre :
 * l'arbalète, la dague, le grimoire ou la faux n'ont pas de plan dans le
 * client, donc ils n'auront pas d'image, et leur ligne restera en texte.
 */
const FAMILLES_ASCENSION: [RegExp, string][] = [
  [/glaive|doloire/, "glaive-doloire"],
  [/epee/, "epee"],
  [/hache/, "hache"],
  [/\barc\b|arcs/, "arc"],
  [/baguette/, "baguette"],
  [/baton/, "baton"],
  [/sceptre/, "sceptre"],
  [/poing/, "poing"],
  [/yo-?yo/, "yoyo"],
];

/** La famille d'ascension d'une arme, d'après son nom (« Épée Yggdrasil » →
 *  `epee`), ou `null` si le client n'en connaît pas pour cette arme. */
export function familleAscension(nom?: string | null): string | null {
  const n = sansAccent(nom ?? "");
  if (!n) return null;
  for (const [re, f] of FAMILLES_ASCENSION) if (re.test(n)) return f;
  return null;
}

/** Le plan d'ascension d'une arme, au palier voulu (1 à 3 étoiles). */
export function planAscension(nom?: string | null, palier?: number | string | null): string | null {
  const f = familleAscension(nom);
  if (!f) return null;
  const p = Math.min(3, Math.max(1, Math.round(Number(palier) || 1)));
  return `${MECA}/artefact-ascension-${f}-${p}.webp`;
}

/** L'essence de l'arme : la ressource qu'on farme pour l'ascension. Un dessin
 *  par famille, les neuf existent. */
export function essenceArme(nom?: string | null): string | null {
  const f = familleAscension(nom);
  return f ? `${MECA}/artefact-essence-${f}.webp` : null;
}

/**
 * Deux choses portent le mot « rune » et ne sont pas la même.
 *
 * La rune d'ARME dépend du palier de l'arme — Ancestrale, Vampirique,
 * Yggdrasil — et le marteau a ses propres dessins. La rune BONUS d'une tenue,
 * d'une cape, d'un familier ou d'un ramasseur porte, elle, la pierre de sa
 * STATISTIQUE. Le moteur fait déjà cette distinction (voir le commentaire de
 * `runeBonusImg` dans airbuilder.js) ; on la tient ici aussi.
 */
export const ICONE_RUNE_ARME: Record<string, string> = {
  Ancestrale: `${MECA}/rune-arme-ancestrale.webp`,
  Vampirique: `${MECA}/rune-arme-vampirique.webp`,
  Yggdrasil: `${MECA}/rune-arme-yggdrasil.webp`,
};
/** Le marteau a sa propre série — même trois paliers, autre dessin. */
export const ICONE_RUNE_MARTEAU: Record<string, string> = {
  Ancestrale: `${MECA}/rune-marteau-ancestrale.webp`,
  Vampirique: `${MECA}/rune-marteau-vampirique.webp`,
  Yggdrasil: `${MECA}/rune-marteau-yggdrasil.webp`,
};
/** La rune bonus d'une tenue, par statistique. */
export const ICONE_RUNE_STAT: Record<string, string> = {
  Force: `${MECA}/rune-tenue-force.webp`,
  Endurance: `${MECA}/rune-tenue-endurance.webp`,
  "Dextérité": `${MECA}/rune-tenue-dexterite.webp`,
  Intelligence: `${MECA}/rune-tenue-intelligence.webp`,
};
/** La rune Yggdrasil vierge — celle qu'on gravera. */
export const ICONE_RUNE_VIERGE = `${MECA}/rune-yggdrasil-vierge.webp`;

/**
 * L'image d'une rune, quelle que soit la façon dont on l'a écrite.
 *
 * Le builder dépose trois formes selon la pièce : « Yggdrasil » (palier
 * d'arme), « Force » (statistique d'une tenue) ou rien du tout (une arme runée
 * dont on ne sait pas le palier). Les trois arrivent ici sous forme de texte,
 * d'où la lecture par mot-clef plutôt que par table exacte.
 */
export function iconeRune(valeur?: string | null, nomArme?: string | null): string | null {
  const v = sansAccent(valeur ?? "");
  const marteau = /marteau/.test(sansAccent(nomArme ?? ""));
  const table = marteau ? ICONE_RUNE_MARTEAU : ICONE_RUNE_ARME;
  if (/yggdrasil/.test(v)) return table.Yggdrasil;
  if (/vampirique/.test(v)) return table.Vampirique;
  if (/ancestrale/.test(v)) return table.Ancestrale;
  for (const [stat, src] of Object.entries(ICONE_RUNE_STAT)) if (sansAccent(stat) === v) return src;
  // « Rune » tout court : on sait qu'il y en a une, pas laquelle. La pierre
  // vierge dit exactement ça, et ne prétend pas à un palier.
  if (!v) return ICONE_RUNE_VIERGE;
  return null;
}

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
    // Ces deux-là n'étaient pas illustrées faute d'assets ; elles le sont
    // depuis la fouille du client.
    case "Rareté": return ICONE_RARETE[(valeur ?? "").trim()] ?? null;
    case "Rune": return iconeRune(valeur);
    default: return null;
  }
}

/**
 * L'icône d'une PASTILLE de la bulle (`spec.puces`).
 *
 * Les pastilles ne sont pas des lignes étiquetées mais des morceaux de phrase
 * déjà composés par le builder — « Légendaire », « Rune Force »,
 * « Maîtrise 78/100 », « Rang S ». D'où la lecture par préfixe. Celles qu'on
 * ne sait pas illustrer honnêtement gardent leur texte seul : la maîtrise et le
 * rang de familier en font partie, le client a bien six pastilles « M » mais
 * rien ne dit laquelle vaut quel palier, et deviner ici se lirait comme un fait.
 */
export function iconeDePuce(puce: string, nomObjet?: string | null): string | null {
  const p = (puce ?? "").trim();
  if (!p) return null;
  if (ICONE_RARETE[p]) return ICONE_RARETE[p];
  const rune = p.match(/^Rune\b\s*(.*)$/i);
  if (rune) return iconeRune(rune[1], nomObjet);
  return null;
}

/** La couleur d'une pastille de rareté, ou `null` si ce n'en est pas une. */
export const couleurDePuce = (puce: string): string | null => COULEUR_RARETE[(puce ?? "").trim()] ?? null;
