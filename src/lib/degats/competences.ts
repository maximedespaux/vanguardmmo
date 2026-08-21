// ════════════════════════════════════════════════════════════════════════════
//  LES COMPÉTENCES — la matière la mieux renseignée du client, et un coefficient
//  dont l'unité est une hypothèse.
//
//  CE QUE LE CLIENT ÉCRIT, colonne par colonne, vérifié sur `propSkill.txt` et
//  `propSkillAdd.csv` :
//    · `dwReferStat1`  → la statistique de référence. Frappe pure : DST_STR.
//    · `dwReferValue1` → le coefficient. Frappe pure : 5. Guillotine : 18.
//    · `dwReferTarget1`→ RT_ATTACK, c'est-à-dire « ce coefficient porte sur
//                        l'attaque » et pas sur autre chose.
//    · `dwAbilityMin` / `dwAtkAbilityMax` par niveau → la fourchette de base.
//      Frappe pure : 11, 10, 10, 10, 12, 12, 12, 12, 12, 13. Elle N'EST PAS
//      croissante, et ce n'est pas une erreur de relevé : le client l'écrit ainsi.
//    · `dwRepFp`, `dwReqMp` par niveau → le coût.
//    · `dwCooldown`, `dwCastingTime` par niveau → les délais.
//
//  L'HYPOTHÈSE, ET ELLE EST SEULE. Le client donne `dwReferValue1 = 5` ; il ne
//  donne pas l'unité. Prise brute, la Frappe pure d'un Vagabond ajouterait cinq
//  fois la Force au coup — un niveau 1 taperait pour cinq cents à cent de Force,
//  ce qui n'a aucun sens. Prise en dixièmes (0,5), elle ajoute la moitié de la
//  Force, ce qui correspond à ce que le Flyff officiel applique. LE MOTEUR
//  DIVISE DONC PAR DIX, et le dit : c'est la seule convention non écrite du
//  fichier, et elle est signalée sur chaque calcul de compétence.
//
//  CE QUI MANQUE AU RELEVÉ, ET CE QUI MANQUE AU CLIENT — la distinction compte,
//  parce qu'on ne demande au lot des données que ce qui existe :
//
//  À DEMANDER, la colonne est renseignée dans le client :
//    · `dwSkillType` (KT_SKILL / KT_MAGIC), colonne 97 de `propSkill.txt` :
//      118 lignes KT_SKILL, 128 KT_MAGIC. C'est la colonne qui lèverait les 36
//      compétences offensives dont on ne sait pas quelle défense elles frappent.
//    · `dwComboSkillTime`, dernière colonne de `propSkillAdd.csv`, 600 ms sur la
//      Frappe pure : renseignée sur 2 395 lignes, soit 219 compétences. C'est
//      l'intervalle entre deux lancers d'une compétence SANS recharge. Douze des
//      197 lignes du relevé portent une `recharge`, treize dans le client.
//
//  À NE PAS DEMANDER, la colonne existe mais elle est VIDE dans ce client :
//    · `dwSfxElemental`, colonne 78 de `propSkill.txt` : elle vaut « = » sur les
//      246 lignes, c'est-à-dire rien. L'élément d'une compétence ne s'y lit pas
//      et ne s'y lira pas — la discipline est la SEULE source, voir `elementDe`.
//    · `dwAbilityMinPVP` / `dwAbilityMaxPVP`, colonnes 5 et 6 de
//      `propSkillAdd.csv` : elles valent « = » sur les 2 500 lignes. Ce client
//      n'écrit AUCUNE fourchette JcJ distincte de la fourchette JcE.
// ════════════════════════════════════════════════════════════════════════════

import { RESERVE_STATS_PLATES, statPourEchelle, type ChampStat, type Combattant, type Element, type Terme } from "./contrat";
import type { CompetenceBrute } from "./donnees";

/** Ce que `stat` porte comme libellé, et vers quel champ du combattant il pointe. */
const CHAMP_DE_STAT: Record<string, ChampStat> = {
  Force: "force",
  Endurance: "endurance",
  "Dextérité": "dexterite",
  Intelligence: "intelligence",
};

/**
 * « la Force » mais « l'Intelligence » : sans cette élision, le moteur écrivait
 * « sur la Intelligence » sur les 84 compétences qui s'appuient dessus.
 */
const avecArticle = (stat: string) => (/^[aeiouyéèêAEIOUYÉÈÊ]/.test(stat) ? `l'${stat}` : `la ${stat}`);

/** La fourchette de base d'une compétence à un niveau donné. */
export type NiveauCompetence = {
  /** Le niveau, tel qu'un joueur le dit : 1 à `nivMax`. */
  niveau: number;
  degatsMin: number;
  degatsMax: number;
  coutPf: number | null;
  coutPm: number | null;
  rechargeMs: number | null;
  incantationMs: number | null;
  coups: number | null;
};

const colonne = (c: CompetenceBrute, nom: string, i: number): number | null => {
  const tab = c.niveaux[nom];
  if (Array.isArray(tab)) {
    const v = tab[i];
    if (typeof v === "number") return v;
    if (v == null && typeof c.fixe[nom] === "number") return c.fixe[nom];
    return null;
  }
  return typeof c.fixe[nom] === "number" ? c.fixe[nom] : null;
};

/**
 * Lit un niveau de compétence.
 *
 * `niveaux` est un OBJET de tableaux, pas un tableau d'objets : `{ dmin: [...],
 * dmax: [...] }`, chaque tableau indexé par `niveau − 1`. Et ce que le fichier
 * ne répète pas d'un niveau à l'autre a été hissé dans `fixe` — il faut donc
 * regarder aux deux endroits, dans cet ordre.
 */
export function niveauDe(c: CompetenceBrute, niveau: number): NiveauCompetence | null {
  const i = niveau - 1;
  if (i < 0 || niveau > c.nivMax) return null;
  const dmin = colonne(c, "dmin", i);
  const dmax = colonne(c, "dmax", i);
  if (dmin == null && dmax == null) return null;
  return {
    niveau,
    degatsMin: dmin ?? dmax ?? 0,
    degatsMax: dmax ?? dmin ?? 0,
    coutPf: colonne(c, "pf", i),
    coutPm: colonne(c, "pm", i),
    rechargeMs: colonne(c, "recharge", i),
    incantationMs: colonne(c, "inc", i),
    coups: colonne(c, "coups", i),
  };
}

/** Vrai quand la compétence porte une fourchette de dégâts, à un niveau au moins. */
export function estOffensive(c: CompetenceBrute): boolean {
  const dmin = c.niveaux.dmin;
  if (Array.isArray(dmin) && dmin.some((v) => typeof v === "number" && v > 0)) return true;
  return typeof c.fixe.dmin === "number" && c.fixe.dmin > 0;
}

/**
 * PHYSIQUE OU MAGIQUE ? LA QUESTION QUE LE RELEVÉ NE TRANCHE PAS.
 *
 * Elle décide quelle colonne du monstre encaisse le coup — `def` ou `resMag` — et
 * l'écart n'est pas cosmétique : Elun porte 464 de défense pour 103 de résistance
 * magique. Se tromper de colonne fausse le résultat d'un facteur quatre.
 *
 * Ce qui décide dans le client est `dwSkillType` — colonne 97 de `propSkill.txt`,
 * qui vaut KT_SKILL sur 118 lignes et KT_MAGIC sur 128. CETTE COLONNE N'EST PAS
 * DANS LE RELEVÉ. Le champ `type` qu'on a à la place est bâti sur `dwExeTarget`,
 * une autre colonne — et les deux ne se recouvrent pas. Le croisement, refait
 * ligne par ligne entre les 197 du relevé et `propSkill.txt` :
 *
 *   « Attaque magique »          → 22 lignes : 21 KT_MAGIC, 1 absente du client.
 *   « Attaque au corps à corps » → 44 lignes : 42 KT_SKILL, 2 KT_MAGIC — et les
 *                                  deux exceptions sont NOMMÉES ci-dessous.
 *   « Projectile magique »       → 36 lignes : 22 KT_MAGIC, 14 KT_SKILL. AMBIGU.
 *   « Magie »                    → 4 lignes : 2 de chaque.            AMBIGU.
 *
 * La Guillotine est du lot ambigu : `dwExeTarget` la range en EXT_MAGICATKSHOT,
 * ce qui la fait passer pour magique, alors que son `dwSkillType` vaut KT_SKILL —
 * c'est un coup d'épée lancé à distance, pas un sort. Le moteur ne devine donc
 * pas : il calcule les DEUX lectures et affiche la prudente en tête.
 */
export type Nature = "melee" | "magique" | "indetermine";

/**
 * LES DEUX EXCEPTIONS, NOMMÉES. Le relevé les type « Attaque au corps à corps »,
 * mais `dwSkillType` vaut KT_MAGIC dans `propSkill.txt` : ce sont les deux seules
 * lignes du relevé où le type contredit le client. Les laisser sur le chemin
 * physique leur opposait la défense au lieu de la résistance magique — sur Elun,
 * 464 au lieu de 103.
 */
const MAGIQUES_MALGRE_LE_TYPE: Record<string, string> = {
  SI_BIL_PST_BGVURTIALBOLD: "Jugement divin",
  SI_BIL_PST_ASALRAALAIKUM: "Paume de Bouddha",
};

export function natureDe(c: CompetenceBrute): { nature: Nature; terme: Terme } {
  const commun = { cle: "competence.nature", valeur: 1, unite: "facteur" as const };

  if (MAGIQUES_MALGRE_LE_TYPE[c.id]) {
    return {
      nature: "magique",
      terme: {
        ...commun,
        libelle: "Coup magique : c'est la résistance magique de la cible qui encaisse",
        source: "dwSkillType = KT_MAGIC : Client/data-05.air ▸ propSkill.txt, colonne 97",
        certitude: "client",
        note: `${c.nom} est l'une des DEUX lignes du relevé où le type contredit le client : le relevé la range en « Attaque au corps à corps », le client écrit KT_MAGIC. C'est le client qui décide.`,
      },
    };
  }

  const nature: Nature =
    c.type === "Attaque magique"
      ? "magique"
      : c.type === "Attaque au corps à corps"
        ? "melee"
        : "indetermine";

  if (nature === "magique") {
    return {
      nature,
      terme: {
        ...commun,
        libelle: "Coup magique : c'est la résistance magique de la cible qui encaisse",
        source: "type « Attaque magique » du relevé — les 21 lignes ainsi typées que le client connaît valent toutes KT_MAGIC dans propSkill.txt",
        certitude: "client",
      },
    };
  }
  if (nature === "melee") {
    return {
      nature,
      terme: {
        ...commun,
        libelle: "Coup physique : c'est la défense de la cible qui encaisse",
        source: "type « Attaque au corps à corps » du relevé — 42 des 44 lignes ainsi typées valent KT_SKILL dans propSkill.txt",
        certitude: "client",
        note: "Les deux lignes de ce type qui portent pourtant KT_MAGIC sont le Jugement divin et la Paume de Bouddha : elles sont nommées dans le moteur et prennent le chemin magique.",
      },
    };
  }
  return {
    nature,
    terme: {
      ...commun,
      libelle: `Physique ou magique : le relevé ne le dit pas pour une compétence de type « ${c.type ?? "inconnu"} »`,
      source: "dwSkillType (KT_SKILL / KT_MAGIC) : Client/data-05.air ▸ propSkill.txt, colonne 97 — ABSENTE du relevé",
      certitude: "inconnu",
      note: "Les 36 compétences offensives de ce type se partagent 22 KT_MAGIC et 14 KT_SKILL. Les deux lectures sont calculées ; la plus prudente est affichée en tête.",
    },
  };
}

/**
 * Conservé pour lire vite : vrai quand la compétence peut emprunter le chemin
 * magique. Ne s'emploie PAS pour choisir une défense — voir `natureDe`.
 */
export function estMagique(c: CompetenceBrute): boolean {
  return natureDe(c).nature !== "melee";
}

/**
 * L'ÉLÉMENT D'UNE COMPÉTENCE — retrouvé sans `dwSfxElemental`.
 *
 * On a d'abord cru l'élément perdu faute de `dwSfxElemental`. Il ne l'est pas, et
 * la raison est plus solide qu'un contournement : `dwSfxElemental` EXISTE dans
 * `propSkill.txt` (colonne 78) et vaut « = » sur ses 246 lignes — elle est vide
 * dans ce client. La discipline est donc la seule source possible, et il n'y a
 * aucune colonne concurrente qui pourrait la contredire.
 *
 * Le champ `famille` porte `dwItemKind3`, la DISCIPLINE dans laquelle la
 * compétence est apprise : DIS_FIRE, DIS_WATER, DIS_ELECTRICITY, DIS_WIND,
 * DIS_EARTH pour les lignées magiques, DIS_SWORD ou DIS_VAGRANT ailleurs.
 * Vingt-huit compétences sur les 197 portent une discipline élémentaire, dont
 * vingt-cinq des cent qui font des dégâts.
 *
 * CE QUE ÇA N'EST PAS. Une discipline dit dans quelle branche la compétence
 * s'apprend, pas quel élément le coup applique. Sur les lignées de Magicien,
 * d'Élémentaliste et d'Arcaniste toute la branche porte le même élément, et le
 * terme rendu le signale.
 *
 * Les autres valeurs de `famille` nomment une ARME (Épée, Yoyo, Arc, Poing) ou
 * une école sans élément (Psychique, Sacré, Soin, Malédiction, Magie, Passive) :
 * elles ne donnent pas d'élément, et on n'en invente pas.
 */
const ELEMENT_PAR_FAMILLE: Record<string, Element> = {
  Feu: "feu",
  Eau: "eau",
  Foudre: "electricite",
  Vent: "vent",
  Terre: "terre",
};

export function elementDe(c: CompetenceBrute): { element: Element | null; terme: Terme | null } {
  const element = c.famille ? (ELEMENT_PAR_FAMILLE[c.famille] ?? null) : null;
  if (!element) return { element: null, terme: null };
  return {
    element,
    terme: {
      cle: "competence.element",
      libelle: `${c.nom} est une compétence de la discipline « ${c.famille} »`,
      valeur: 1,
      unite: "facteur",
      source: "dwItemKind3 : Client/data-05.air ▸ propSkill.txt, relevé comme « famille »",
      certitude: "client",
      note: "C'est la discipline d'apprentissage. La colonne d'effet élémentaire du client (dwSfxElemental, colonne 78 de propSkill.txt) est VIDE sur ses 246 lignes : la discipline est donc la seule source, et rien ne peut la contredire.",
    },
  };
}

export type EchelleDeStat = { valeur: number; terme: Terme | null; reserve: string | null; reserveStatsPlates?: string | null };

/**
 * LA MISE À L'ÉCHELLE SUR LA STATISTIQUE.
 *
 *   échelle   = (coefficient/10 × 50 − i + 1) / 5      avec i = niveau − 1
 *   apport    = plancher( échelle/10 × statistique + i × statistique/50 )
 *
 * La forme est celle du Flyff officiel. Elle est construite pour que l'apport
 * total reste à peu près constant d'un niveau de compétence à l'autre : le
 * premier terme décroît, le second monte, et la somme vaut environ
 * coefficient/10 × statistique. Sur la Frappe pure (coefficient 5), l'apport
 * tourne donc autour de la moitié de la Force, à tous les niveaux.
 */
export function echelleDeStat(c: CompetenceBrute, combattant: Combattant, niveau: number): EchelleDeStat {
  if (c.coef == null || !c.stat) return { valeur: 0, terme: null, reserve: null };
  const champ = CHAMP_DE_STAT[c.stat];
  if (!champ) {
    return {
      valeur: 0,
      terme: null,
      reserve: `Statistique de référence « ${c.stat} » non reconnue pour ${c.nom} : sa mise à l'échelle n'est pas comptée.`,
    };
  }

  const lu = statPourEchelle(combattant, champ);
  const stat = lu.valeur;
  const i = niveau - 1;
  const echelle = ((c.coef / 10) * 50 - i + 1) / 5;
  const valeur = Math.floor((echelle / 10) * stat + (i * stat) / 50);

  return {
    valeur,
    terme: {
      cle: "competence.echelle",
      libelle: `Mise à l'échelle sur ${avecArticle(c.stat)} (${stat}), coefficient ${c.coef}`,
      valeur,
      unite: "points",
      source: "dwReferStat1 et dwReferValue1 : Client/data-05.air ▸ propSkill.txt — la forme du calcul : Flyff officiel",
      certitude: "flyff-officiel",
      note: `Le coefficient ${c.coef} est lu dans le client, mais son unité ne l'est pas : il est pris en dixièmes (${(c.coef / 10).toString().replace(".", ",")}). Pris brut, cette compétence ajouterait ${c.coef} fois ${avecArticle(c.stat.toLowerCase())}.${lu.plate ? "" : ` Et ${avecArticle(c.stat.toLowerCase())} employée est le TOTAL (${stat}) : la forme du Flyff officiel lit ici un total SANS les pourcentages de statistique.`}`,
    },
    reserve:
      "Le coefficient de compétence est lu dans le client ; sa division par dix est une convention du Flyff officiel, à confirmer sur Airborn. Le SECOND terme de la forme diverge d'un cran de la référence — elle écrit (niveau − 2) × statistique / 50 là où le moteur écrit (niveau − 1) — ce qui vaut moins d'un pour cent du coup, et la référence marque elle-même cette ligne comme douteuse.",
    reserveStatsPlates: lu.plate ? null : RESERVE_STATS_PLATES,
  };
}

/**
 * LA PUISSANCE DE BASE D'UNE COMPÉTENCE, avant défense.
 *
 *   base = ( arme_min + fourchette_du_niveau × 5 + apport_de_stat − 20 ) × (16 + i) / 13
 *
 * TROIS CHOSES À NE PAS CONFONDRE AVEC L'ATTAQUE ORDINAIRE :
 *   · l'arme entre ici SANS le doublement (`dwAbilityMin`, pas ×2) ;
 *   · la Force n'entre PAS par le facteur d'arme de `propJob.inc` — elle entre
 *     par le coefficient de la compétence, et une seule fois ;
 *   · le ×5, le −20 et le (16 + i)/13 sont des constantes du Flyff officiel.
 *
 * `dwAddSkillMin`/`dwAddSkillMax` — les dégâts de compétence propres à une arme —
 * existent dans `Spec_Item.txt` mais ne sont pas dans le relevé d'objets : ils
 * comptent donc pour zéro, et le moteur le signale.
 */
export type PuissanceCompetence = {
  min: number;
  max: number;
  termes: Terme[];
  reserves: string[];
  nonPrisEnCompte: string[];
};

export function puissanceDeCompetence(
  c: CompetenceBrute,
  niv: NiveauCompetence,
  combattant: Combattant,
  armeMin: number,
  armeMax: number,
  nomArme: string,
): PuissanceCompetence {
  const i = niv.niveau - 1;
  const ech = echelleDeStat(c, combattant, niv.niveau);
  const facteurNiveau = (16 + i) / 13;

  const brutMin = (armeMin + niv.degatsMin * 5 + ech.valeur - 20) * facteurNiveau;
  const brutMax = (armeMax + niv.degatsMax * 5 + ech.valeur - 20) * facteurNiveau;

  const termes: Terme[] = [
    {
      cle: "competence.arme",
      libelle: `${nomArme} — fourchette brute (sans doublement)`,
      valeur: armeMin,
      valeurMax: armeMax,
      unite: "points",
      source: "dwAbilityMin / dwAbilityMax : Client ▸ Spec_Item.txt",
      certitude: "client",
      note: "Une compétence lit la fourchette de l'arme telle quelle ; c'est l'attaque ORDINAIRE qui la double.",
    },
    {
      cle: "competence.base",
      libelle: `${c.nom} niveau ${niv.niveau} : fourchette de base ${niv.degatsMin}–${niv.degatsMax}, × 5`,
      valeur: niv.degatsMin * 5,
      valeurMax: niv.degatsMax * 5,
      unite: "points",
      source: "dwAbilityMin / dwAtkAbilityMax par niveau : Client/data-05.air ▸ propSkillAdd.csv — le × 5 : Flyff officiel",
      certitude: "flyff-officiel",
    },
  ];
  if (ech.terme) termes.push(ech.terme);
  termes.push({
    cle: "competence.constante",
    libelle: "Retrait constant",
    valeur: -20,
    unite: "points",
    source: "constante du Flyff officiel",
    certitude: "flyff-officiel",
  });
  termes.push({
    cle: "competence.facteurNiveau",
    libelle: `Facteur de niveau de compétence : (16 + ${i}) / 13`,
    valeur: facteurNiveau,
    unite: "facteur",
    source: "constante du Flyff officiel",
    certitude: "flyff-officiel",
  });

  const reserves: string[] = [];
  if (ech.reserve) reserves.push(ech.reserve);
  if (ech.reserveStatsPlates) reserves.push(ech.reserveStatsPlates);
  if (ech.terme == null && c.coef != null) {
    reserves.push(`${c.nom} porte un coefficient mais aucune statistique de référence lisible : la mise à l'échelle vaut zéro.`);
  }

  const nonPrisEnCompte = [
    "dwAddSkillMin / dwAddSkillMax — les dégâts de compétence propres à l'arme. Les colonnes existent dans Spec_Item.txt mais ne sont pas dans le relevé d'objets : elles comptent pour zéro.",
  ];
  if (estMagique(c) && !elementDe(c).element) {
    nonPrisEnCompte.push(
      "Cette compétence magique n'appartient à aucune discipline élémentaire : à défaut de dwSfxElemental dans le relevé, son élément est inconnu et seule la résistance à l'élément de l'ARME peut s'appliquer.",
    );
  }

  return {
    min: Math.max(0, Math.floor(brutMin)),
    max: Math.max(0, Math.floor(brutMax)),
    termes,
    reserves,
    nonPrisEnCompte,
  };
}

/**
 * LA CADENCE D'UNE COMPÉTENCE, et le trou qu'il faut nommer.
 *
 * Douze compétences sur les 197 du relevé portent une `recharge` (treize dans le
 * client) : pour elles l'intervalle entre deux lancers est écrit, en
 * millisecondes, et les dégâts par seconde se calculent. Sur les cent qui font
 * des dégâts, DEUX seulement. Pour les autres, l'intervalle est
 * `dwComboSkillTime` — 600 ms sur la Frappe pure, renseigné sur 219 compétences
 * du client — une colonne de `propSkillAdd.csv` que le relevé n'a pas gardée. Le
 * moteur rend alors `null` plutôt qu'un chiffre inventé.
 *
 * `dwCastingTime` (le champ `inc` du relevé, 5 000 sur la Guillotine) N'EST PAS
 * une cadence et n'est pas employé comme telle : cinq secondes d'incantation pour
 * une Guillotine ne correspondent à rien de ce qu'on voit en jeu, donc l'unité de
 * cette colonne est elle-même douteuse. On l'affiche, on ne s'en sert pas.
 */
export function cadenceDe(niv: NiveauCompetence): { ms: number | null; terme: Terme | null; manque: string | null } {
  if (niv.rechargeMs != null && niv.rechargeMs > 0) {
    return {
      ms: niv.rechargeMs,
      terme: {
        cle: "cadence.recharge",
        libelle: "Recharge",
        valeur: niv.rechargeMs,
        unite: "ms",
        source: "dwCooldown : Client/data-05.air ▸ propSkillAdd.csv",
        certitude: "client",
      },
      manque: null,
    };
  }
  return {
    ms: null,
    terme: null,
    manque:
      "Cette compétence n'a pas de recharge : l'intervalle entre deux lancers est dwComboSkillTime, colonne de propSkillAdd.csv absente du relevé. Les dégâts par seconde ne sont donc pas calculés.",
  };
}
