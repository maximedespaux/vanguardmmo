// ════════════════════════════════════════════════════════════════════════════
//  LES CINQ ÉLÉMENTS — la résistance se LIT, elle ne se déduit jamais.
//
//  Il existe une roue des éléments (le feu bat le vent, l'eau bat le feu…) et
//  elle est tentante : cinq relations, une table de 5 × 5, et on croit tenir la
//  résistance de n'importe quel monstre. C'EST FAUX SUR AIRBORN. Le relevé
//  porte cinq colonnes par monstre, et huit monstres résistent à TROIS éléments
//  à la fois — ce qu'aucune roue ne peut produire. On lit donc les colonnes.
//
//  DEUX PIÈGES DE LECTURE, tous deux vérifiés sur les 1 124 lignes :
//
//  1. LE SIGNE COMPTE, ET IL EST INVERSÉ. Une valeur de −0,3 n'est pas une
//     faiblesse de 30 % du monstre au sens courant : c'est une résistance
//     NÉGATIVE, donc 1 − (−0,3) = 1,3, soit 30 % de dégâts EN PLUS. Le Jeune
//     Aibatt porte feu −0,3 et terre +0,3 : il prend 130 % du feu et 70 % de la
//     terre.
//
//  2. NEUF LIGNES DU RELEVÉ SONT DÉCALÉES. Rizontie, Kentauros, Draken Behemoth,
//     les deux Esprits tourmentés, l'Archange Sanadalphon et l'Esprit du Coffre
//     portent eau = 100 avec électricité et terre à `null` ; Polleburk porte
//     terre = 718 ; une ligne sans nom porte électricité = 150. Une résistance
//     de 100 donnerait un facteur de 1 − 100 = −99, c'est-à-dire un SOIN de
//     quatre-vingt-dix-neuf fois le coup. Le moteur refuse ces valeurs au lieu
//     de les faire entrer dans une multiplication.
// ════════════════════════════════════════════════════════════════════════════

import type { Cible, Element, Terme } from "./contrat";

/** Comment chaque élément s'écrit à l'écran. */
export const NOM_ELEMENT: Record<Element, string> = {
  feu: "Feu",
  eau: "Eau",
  vent: "Vent",
  terre: "Terre",
  electricite: "Électricité",
};

/**
 * « résiste AU feu », « résiste À L'eau », « résiste À LA terre » : la préposition
 * change avec le genre et l'initiale. Sans cette table, le moteur écrivait
 * « résiste au électricité » sur toutes les compétences de foudre.
 */
const AU_ELEMENT: Record<Element, string> = {
  feu: "au feu",
  eau: "à l'eau",
  vent: "au vent",
  terre: "à la terre",
  electricite: "à l'électricité",
};

/**
 * LE PONT ENTRE DEUX VOCABULAIRES. `monstres.json` écrit « electricite » ;
 * les résistances portées par une pièce d'armure (`re` de `objets-stats.json`)
 * écrivent « foudre ». Le même élément, deux orthographes : sans ce pont, la
 * résistance d'un casque Shamutra ne se raccorde à rien.
 */
export const ELEMENT_DEPUIS_OBJET: Record<string, Element> = {
  feu: "feu",
  eau: "eau",
  vent: "vent",
  terre: "terre",
  foudre: "electricite",
  electricite: "electricite",
};

/**
 * LA MAÎTRISE ÉLÉMENTAIRE, un code qui était déclaré et jamais lu.
 *
 * `CODES_OFFENSIFS` annonce les cinq `DST_MASTRY_*` comme des codes « dont le
 * moteur se sert ». Il ne s'en servait pas : un porteur de +50 de Maîtrise de la
 * foudre obtenait exactement le même chiffre qu'un porteur de zéro. Un code
 * déclaré puis ignoré est pire qu'un code absent — un écran l'aurait proposé au
 * choix, et le total n'aurait pas bougé.
 *
 * La maîtrise multiplie la puissance d'une compétence élémentaire : `× (1 +
 * maîtrise / 100)`. La forme vient du Flyff officiel ; les codes et leurs valeurs
 * sont dans le client. `DST_MASTRY_ALL` compte pour les cinq à la fois.
 * Les cinq codes n'apparaissent aujourd'hui que sur quatre objets du relevé.
 */
const CODE_MAITRISE: Record<Element, string> = {
  feu: "DST_MASTRY_FIRE",
  eau: "DST_MASTRY_WATER",
  electricite: "DST_MASTRY_ELECTRICITY",
  vent: "DST_MASTRY_WIND",
  terre: "DST_MASTRY_EARTH",
};

export function maitriseDe(bonus: Record<string, number>, element: Element): Terme | null {
  const propre = bonus[CODE_MAITRISE[element]] ?? 0;
  const toutes = bonus.DST_MASTRY_ALL ?? 0;
  const v = propre + toutes;
  if (!v) return null;
  return {
    cle: "element.maitrise",
    libelle: `Maîtrise ${element === "electricite" ? "de la foudre" : element === "feu" ? "du feu" : element === "eau" ? "de l'eau" : element === "vent" ? "du vent" : "de la terre"}`,
    valeur: v,
    unite: "pourcent",
    source: `${CODE_MAITRISE[element]}${toutes ? " + DST_MASTRY_ALL" : ""} de l'équipement — la place du multiplicateur : Flyff officiel`,
    certitude: "flyff-officiel",
    note: "La valeur est celle du client ; le fait qu'elle multiplie la puissance de la compétence élémentaire vient du Flyff officiel.",
  };
}

/** Le code `DST_*` qui augmente les dégâts d'un élément en JcE. */
const CODE_DEGATS_ELEMENT: Record<Element, string> = {
  feu: "DST_GIVE_PVE_DMG_ELEMENT_FIRE_RATE",
  eau: "DST_GIVE_PVE_DMG_ELEMENT_WATER_RATE",
  electricite: "DST_GIVE_PVE_DMG_ELEMENT_ELECT_RATE",
  vent: "DST_GIVE_PVE_DMG_ELEMENT_WIND_RATE",
  terre: "DST_GIVE_PVE_DMG_ELEMENT_EARTH_RATE",
};

export type LectureResistance = {
  /** Le facteur à appliquer au coup. 1 quand rien n'est applicable. */
  facteur: number;
  terme: Terme | null;
  /** Rempli quand la colonne est illisible : le facteur reste alors à 1. */
  refus: string | null;
};

/**
 * La résistance d'une cible à un élément, lue dans sa colonne.
 *
 * Rend un facteur multiplicatif, et refuse de le produire quand la colonne est
 * absente ou hors des bornes que le client emploie ailleurs (−0,3 à +0,5).
 */
export function resistanceDe(cible: Cible, element: Element): LectureResistance {
  const brut = cible.resistances[element];

  if (brut == null) {
    return {
      facteur: 1,
      terme: null,
      refus: `Colonne « ${NOM_ELEMENT[element]} » vide pour ${cible.nom} : la résistance n'est pas prise en compte.`,
    };
  }
  if (Math.abs(brut) > 1) {
    return {
      facteur: 1,
      terme: null,
      refus: `Colonne « ${NOM_ELEMENT[element]} » de ${cible.nom} : ${brut}. Une résistance se lit entre −0,3 et +0,5 dans tout le reste du relevé ; cette ligne est décalée, elle est écartée du calcul.`,
    };
  }

  const facteur = 1 - brut;
  const pourcent = Math.round(brut * 100);
  return {
    facteur,
    terme: {
      cle: "element.resistance",
      libelle:
        brut === 0
          ? `${cible.nom} — aucune résistance ${AU_ELEMENT[element]}`
          : brut > 0
            ? `${cible.nom} résiste ${AU_ELEMENT[element]} : ${pourcent} %`
            : `${cible.nom} est vulnérable ${AU_ELEMENT[element]} : ${-pourcent} % de dégâts en plus`,
      valeur: facteur,
      unite: "facteur",
      source: `Client ▸ propMover ▸ fResistFire/Water/Electricity/Wind/Earth, relevé dans monstres.json (${cible.id})`,
      certitude: "client",
    },
    refus: null,
  };
}

/** Le bonus de dégâts élémentaires en JcE que porte l'équipement. */
export function bonusElementaire(bonus: Record<string, number>, element: Element): Terme | null {
  const v = bonus[CODE_DEGATS_ELEMENT[element]] ?? 0;
  if (!v) return null;
  return {
    cle: "element.bonus",
    libelle: `Dégâts de ${element === "electricite" ? "foudre" : NOM_ELEMENT[element].toLowerCase()} (JcE)`,
    valeur: v,
    unite: "pourcent",
    source: `bonus d'équipement — ${CODE_DEGATS_ELEMENT[element]}`,
    certitude: "client",
  };
}

/**
 * LE PALIER D'ÉLÉMENT D'UNE ARME N'EST PAS CALCULABLE, et c'est la même cause
 * que pour le +N d'amélioration : la table qui dit ce que rapporte un palier
 * d'élément (l'équivalent de `UpgradeBonus` du Flyff officiel) n'est dans aucun
 * fichier du client Airborn. Poser un élément sur une arme change donc QUEL
 * facteur de résistance s'applique — ce qui est calculable — mais le bonus
 * d'attaque élémentaire du palier, non.
 */
export const PALIER_ELEMENT_NON_CALCULABLE =
  "Le gain d'un palier d'élément sur l'arme n'est pas compté : la table qui le donne (UpgradeBonus chez le Flyff officiel) n'existe pas dans les fichiers du client Airborn. Seul l'élément lui-même est pris en compte, par la résistance de la cible.";
