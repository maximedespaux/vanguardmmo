/**
 * LE VOCABULAIRE DES STATISTIQUES — ce qu'est un code, et ce qu'il multiplie.
 *
 * Ce module ne lit aucun fichier : il ne porte que ce qu'on sait d'un CODE.
 * Les valeurs, les libellés et les objets arrivent par `tables.ts`.
 *
 * ┌─── L'ERREUR QUE CE FICHIER EXISTE POUR EMPÊCHER ───────────────────────┐
 * │ Additionner un pourcentage à un absolu. Le relevé écrit DST_HP_MAX      │
 * │ (des PV) et DST_HP_MAX_RATE (un pourcentage de PV) avec la même forme   │
 * │ `[code, valeur]` : rien, dans la donnée, n'empêche de faire             │
 * │ 273 + 70 = 343. Le total serait faux de plusieurs milliers de PV.       │
 * │ D'où DEUX SACS SÉPARÉS dans le moteur — `absolus` et `pourcentages` —   │
 * │ et un ordre écrit noir sur blanc : on somme les absolus, PUIS on        │
 * │ applique les pourcentages.                                             │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * LES COUPLES NE SONT PAS ÉCRITS ICI, ILS SE COMPTENT. `couplesAbsoluPourcent()`
 * parcourt le dictionnaire et retient tout code en `_RATE`/`_PERCENT` dont la
 * version sans suffixe existe aussi. C'est la liste des endroits où la confusion
 * est possible — treize au dernier comptage, mais le nombre vient de la donnée.
 *
 * SOURCE DES CLASSEMENTS. Trois origines, jamais mélangées dans le compte rendu :
 *   · « suffixe »  le code finit par _RATE ou _PERCENT. Aucun doute.
 *   · « libellé »  le libellé du client finit par « % ». Écrit par le jeu.
 *   · « lecture »  ni l'un ni l'autre : le classement vient de la façon dont un
 *                  calculateur de Flyff OFFICIEL lit ce code. AirFlyff a changé
 *                  des valeurs — cette origine est donc une RÉSERVE, pas une preuve.
 */

/** Ce qu'on fait d'une valeur : la sommer, ou l'appliquer en facteur. */
export type Nature = "absolu" | "pourcentage";

/** Quand la valeur agit : sur la fiche de personnage, ou au moment des dégâts. */
export type Moment = "fiche" | "degats" | "horsCombat";

export type Classement = {
  nature: Nature;
  /** D'où vient le classement — voir l'en-tête. */
  origine: "suffixe" | "libelle" | "lecture" | "defaut";
  /** Ce que le pourcentage multiplie, en français. `null` quand le client ne le dit pas. */
  appliqueA: string | null;
  moment: Moment;
  /** Des points de pourcentage ajoutés à une probabilité déjà exprimée en %. */
  pointsDePourcentage?: true;
  /** Une valeur positive RÉDUIT la grandeur visée. Sans ça, un build paraît meilleur avec moins. */
  sens?: "reduction";
  /** Le libellé du relevé contredit ce que le code fait. Le moteur le signale. */
  libelleDouteux?: string;
};

/**
 * LES CODES QUE LE SUFFIXE NE TRAHIT PAS. Chacun porte sa preuve.
 * Tout ce qui n'est pas là et ne finit pas par _RATE/_PERCENT est un absolu.
 */
const HORS_SUFFIXE: Record<string, Classement> = {
  DST_MONSTER_DMG: {
    nature: "pourcentage", origine: "libelle", moment: "degats",
    appliqueA: "les dégâts finaux infligés à un monstre",
  },
  DST_MONSTER_DMG_BOSS: {
    nature: "pourcentage", origine: "libelle", moment: "degats",
    appliqueA: "les dégâts finaux infligés à un boss",
  },
  DST_EXPERIENCE: {
    nature: "pourcentage", origine: "libelle", moment: "horsCombat",
    appliqueA: "l'expérience gagnée",
  },
  DST_CRITICAL_BONUS: {
    nature: "pourcentage", origine: "lecture", moment: "degats",
    appliqueA: "les dégâts d'un coup critique",
  },
  DST_CHR_CHANCECRITICAL: {
    nature: "pourcentage", origine: "lecture", moment: "fiche",
    appliqueA: "la probabilité de coup critique", pointsDePourcentage: true,
  },
  DST_ADJ_HITRATE: {
    nature: "pourcentage", origine: "lecture", moment: "fiche",
    appliqueA: "la probabilité de toucher", pointsDePourcentage: true,
  },
  DST_PARRY: {
    nature: "pourcentage", origine: "lecture", moment: "fiche",
    appliqueA: "la probabilité de parade", pointsDePourcentage: true,
  },
  DST_BLOCK_MELEE: {
    nature: "pourcentage", origine: "lecture", moment: "fiche",
    appliqueA: "la probabilité de blocage au corps à corps", pointsDePourcentage: true,
  },
  DST_BLOCK_RANGE: {
    nature: "pourcentage", origine: "lecture", moment: "fiche",
    appliqueA: "la probabilité de blocage à distance", pointsDePourcentage: true,
  },
  DST_SPEED: {
    nature: "pourcentage", origine: "lecture", moment: "horsCombat",
    appliqueA: "la vitesse de déplacement de base",
  },
  DST_LOCOMOTION: {
    nature: "pourcentage", origine: "lecture", moment: "horsCombat",
    appliqueA: "la vitesse de vol de base",
  },
  DST_REFLECT_DAMAGE: {
    nature: "pourcentage", origine: "lecture", moment: "degats",
    appliqueA: "la part des dégâts subis renvoyée à l'attaquant",
  },
  DST_MELEE_STEALHP: {
    nature: "pourcentage", origine: "lecture", moment: "degats",
    appliqueA: "la part des dégâts infligés rendue en PV",
  },
  DST_ATTACKSPEED: {
    nature: "pourcentage", origine: "lecture", moment: "fiche",
    appliqueA: "la vitesse d'attaque calculée",
    libelleDouteux:
      "Le relevé l'appelle « Vitesse d'attaque (points) » — donc un absolu — mais le calculateur de référence le lit comme un taux (valeur ÷ 1000 × 20). Les deux lectures ne donnent pas le même nombre et le client ne tranche pas.",
  },
  DST_CHR_DMG: {
    nature: "absolu", origine: "lecture", moment: "degats",
    appliqueA: null,
    libelleDouteux:
      "Le relevé l'appelle « Dégâts subis réduits ». La description française du Grenat d'Amour dit pourtant qu'il « fournit de l'ATQ ainsi qu'un pourcentage de défense », et sa ligne d'accessory.inc est exactement DST_CHR_DMG + DST_ADJDEF_RATE : DST_CHR_DMG est donc de l'ATTAQUE ajoutée, pas une réduction. 27 objets le portent — le libellé du relevé est à corriger, pas le calcul.",
  },
  DST_STAT_ALLUP: {
    nature: "absolu", origine: "defaut", moment: "fiche",
    appliqueA: null,
  },
  DST_SPELL_RATE: {
    nature: "pourcentage", origine: "suffixe", moment: "fiche",
    appliqueA: "le temps d'incantation", sens: "reduction",
    libelleDouteux:
      "Deux libellés opposés pour le même code. Le relevé écrit « Temps d'incantation % » — donc une RÉDUCTION, plus c'est haut moins on met de temps — et le libellé du CLIENT écrit « Vitesse d'incantation », donc une AUGMENTATION. Le Sceptre éternel en porte 100 : sous la première lecture le temps tombe à zéro, sous la seconde la vitesse double. 152 objets portent ce code, le sens de la flèche change leur classement dans un comparatif.",
  },
};

/** Les pourcentages qui multiplient une grandeur de la fiche, et laquelle. */
const APPLIQUE_A: Record<string, { appliqueA: string; moment?: Moment; sens?: "reduction" }> = {
  DST_HP_MAX_RATE: { appliqueA: "les PV de base PLUS les PV absolus" },
  DST_MP_MAX_RATE: { appliqueA: "les PM de base PLUS les PM absolus" },
  DST_FP_MAX_RATE: { appliqueA: "les PC de base PLUS les PC absolus" },
  DST_ATKPOWER_RATE: { appliqueA: "la moyenne d'attaque de l'arme, AVANT l'ajout de l'attaque absolue" },
  DST_ADJDEF_RATE: { appliqueA: "la défense totale, APRÈS l'ajout de la défense absolue" },
  DST_ADDMAGIC_RATE: { appliqueA: "les dégâts magiques" },
  DST_ATTACKSPEED_RATE: { appliqueA: "la vitesse d'attaque calculée" },
  DST_SPELL_RATE: { appliqueA: "le temps d'incantation", sens: "reduction" },
  DST_MP_DEC_RATE: { appliqueA: "le coût en PM d'une compétence", sens: "reduction" },
  DST_FP_DEC_RATE: { appliqueA: "le coût en PC d'une compétence", sens: "reduction" },
  DST_HEAL_RATE: { appliqueA: "les soins rendus" },
  DST_PVP_DMG_RATE: { appliqueA: "les dégâts finaux en JcJ", moment: "degats" },
  DST_RECV_GENERIC_DMG_RATE: { appliqueA: "les dégâts subis", moment: "degats", sens: "reduction" },
  DST_RESIST_MAGIC_RATE: { appliqueA: "les dégâts magiques subis", moment: "degats", sens: "reduction" },
  DST_WEAPON_EXP_RATE: { appliqueA: "l'expérience de maîtrise d'arme", moment: "horsCombat" },
  DST_PENYA_RATE: { appliqueA: "les penyas ramassés", moment: "horsCombat" },
  DST_RESTPOINT_RATE: { appliqueA: "les points de repos", moment: "horsCombat" },
  DST_DROP_ITEM_ALLGRADE_RATE: { appliqueA: "le butin", moment: "horsCombat" },
};

/**
 * LES QUATRE ATTRIBUTS EN POURCENTAGE — le trou le plus gênant du lot.
 *
 * DST_STR_PERCENT existe (13 objets), DST_STA_PERCENT (24), DST_DEX_PERCENT (13),
 * DST_INT_PERCENT (21). Aucun fichier du client ne dit sur QUOI le pourcentage
 * porte. Deux lectures possibles, qui ne donnent pas le même nombre :
 *   · sur l'attribut ALLOUÉ seul (15 + points dépensés) ;
 *   · sur l'attribut alloué PLUS les bonus absolus de l'équipement.
 * Le calculateur du Flyff officiel n'en applique AUCUNE : sa somme d'attribut ne
 * regarde que les absolus. Ces quatre codes sont donc une invention d'AirFlyff,
 * et rien ne permet de choisir.
 *
 * Le moteur rend LES DEUX lectures, côte à côte, et n'en promeut aucune.
 */
export const ATTRIBUTS_POURCENT: Record<string, string> = {
  DST_STR_PERCENT: "Force",
  DST_STA_PERCENT: "Endurance",
  DST_DEX_PERCENT: "Dextérité",
  DST_INT_PERCENT: "Intelligence",
};

/**
 * LES LIBELLÉS SANS CODE QU'ON RAPPROCHE QUAND MÊME, ET LEUR PREUVE.
 *
 * data.json écrit ses bonus en français, pas en codes DST_. La plupart de ses
 * libellés se retrouvent au dictionnaire ; quelques-uns non, et ceux-là formaient
 * un SECOND CUMUL FANTÔME à côté du vrai. Constaté : le costume écrit
 * « Dégâts critiques % » là où le dictionnaire écrit « Dégâts critiques »
 * (DST_CRITICAL_BONUS) — un Templier en Glaive éternel et costume complet
 * ressortait avec deux lignes, « Dégâts critiques 80 » et
 * « Dégâts critiques % 10 », pour UNE SEULE statistique du jeu.
 *
 * On ne rapproche que ce qui se prouve, et la preuve est écrite ici. Un
 * rapprochement faux additionnerait deux statistiques différentes : le silence
 * (la ligne reste `sansCode`) reste le comportement par défaut.
 *
 * CE QU'ON NE RAPPROCHE PAS, ET POURQUOI. « Puissance magique » (deux carnets,
 * 250 à 1 000) ressemble à DST_ADDMAGIC (« Dégâts magiques »), mais rien ne le
 * dit : la ligne reste sans code, classée ABSOLU par son ordre de grandeur, et
 * elle est signalée. « Heal Rate » (GEMC) et « Melee Stealhp » (GEMU) sont des
 * libellés ANGLAIS restés dans le relevé du builder : à corriger là-bas, pas ici.
 */
export const ALIAS_LIBELLE: Record<string, { code: string; preuve: string }> = {
  "Dégâts critiques %": {
    code: "DST_CRITICAL_BONUS",
    preuve:
      "DST_CRITICAL_BONUS est DÉJÀ un pourcentage (il multiplie les dégâts d'un coup critique) et le client l'affiche « Dégâts critiques », sans signe. Le même relevé emploie les deux orthographes pour la même statistique : data.json ▸ GEMC écrit « Dégâts critiques » pour la gemme de costume dont le client donne le code DST_CRITICAL_BONUS, et data.json ▸ ITEMS.fashion[].setb écrit « Dégâts critiques % » sur les huit pièces de costume. Sans ce rapprochement, un personnage portant une arme et un costume sort DEUX lignes pour une seule statistique.",
  },
};

/** Un code qui se répand sur plusieurs autres. Confirmé par la lecture du calculateur de référence. */
export const ETEND: Record<string, string[]> = {
  DST_STAT_ALLUP: ["DST_STR", "DST_STA", "DST_DEX", "DST_INT"],
  DST_MASTRY_ALL: [
    "DST_MASTRY_FIRE", "DST_MASTRY_WATER", "DST_MASTRY_WIND",
    "DST_MASTRY_EARTH", "DST_MASTRY_ELECTRICITY",
  ],
  DST_RESIST_ALL: [
    "DST_RESIST_FIRE", "DST_RESIST_WATER", "DST_RESIST_WIND",
    "DST_RESIST_EARTH", "DST_RESIST_ELECTRICITY",
  ],
};

/** Les quatre attributs, dans l'ordre des dés de statistique du jeu. */
export const ATTRIBUTS = ["Force", "Endurance", "Dextérité", "Intelligence"] as const;
export type Attribut = (typeof ATTRIBUTS)[number];

/** Le code du dé de statistique correspondant. */
export const CODE_ATTRIBUT: Record<Attribut, string> = {
  Force: "DST_STR",
  Endurance: "DST_STA",
  Dextérité: "DST_DEX",
  Intelligence: "DST_INT",
};

/**
 * Les trois statistiques que la règle de la maison interdit à l'écran : taux de
 * butin, expérience, penyas de récompense. Elles restent DANS le résultat — le
 * filtre est à l'affichage, pas à la source, sinon la donnée est amputée.
 */
export const CODES_RECOMPENSE = new Set([
  "DST_EXPERIENCE", "DST_PENYA_RATE", "DST_DROP_ITEM_ALLGRADE_RATE",
  "DST_ADDDROP", "DST_CHANCEDROP", "DST_DROP_ITEM_ONEMORE_CHANCE", "DST_RECOVERY_EXP",
]);

/** Classe un code. Ne renvoie jamais `null` : un code inconnu est un absolu signalé ailleurs. */
export function classer(code: string): Classement {
  const c = HORS_SUFFIXE[code];
  if (c) return c;

  if (/_(RATE|PERCENT)$/.test(code)) {
    if (ATTRIBUTS_POURCENT[code]) {
      return { nature: "pourcentage", origine: "suffixe", moment: "fiche", appliqueA: null };
    }
    const p = APPLIQUE_A[code];
    return {
      nature: "pourcentage", origine: "suffixe",
      // Un code répertorié agit sur la FICHE sauf mention contraire ; un code
      // dont on ne sait rien est rangé du côté des dégâts, où il ne fausse aucun
      // total de fiche par défaut.
      moment: p ? p.moment ?? "fiche" : "degats",
      appliqueA: p?.appliqueA ?? null,
      ...(p?.sens ? { sens: p.sens } : {}),
    };
  }

  return { nature: "absolu", origine: "defaut", appliqueA: null, moment: "fiche" };
}

/**
 * Les couples (absolu, pourcentage) du dictionnaire — les endroits où la
 * confusion est mécaniquement possible. Comptés, jamais écrits.
 */
export function couplesAbsoluPourcent(codes: Iterable<string>): { absolu: string; pourcentage: string }[] {
  const tous = new Set(codes);
  const couples: { absolu: string; pourcentage: string }[] = [];
  for (const code of tous) {
    const m = /^(.*?)_(RATE|PERCENT)$/.exec(code);
    if (!m) continue;
    if (tous.has(m[1])) couples.push({ absolu: m[1], pourcentage: code });
  }
  return couples.sort((a, b) => a.absolu.localeCompare(b.absolu));
}
