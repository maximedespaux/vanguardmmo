// ════════════════════════════════════════════════════════════════════════════
//  LE MOTEUR — l'ordre des opérations, et rien de plus.
//
//  Les nombres viennent des autres fichiers du dossier ; ici on ne fait que les
//  appliquer dans l'ordre, et rendre la liste de ce qu'on a appliqué.
//
//  L'ORDRE, POUR UN COUP ORDINAIRE :
//    1. fourchette de l'arme, doublée
//    2. + l'apport de la statistique (facteur d'arme × statistique + niveau)
//    3. × (1 + Attaque %)          puis + Attaque plate
//    4. − la défense de la cible   ← la seule étape dont la FORME est supposée
//    5. × (1 − résistance élémentaire), quand l'arme porte un élément
//    6. × l'écart de niveau, si la cible est plus haute
//    7. + Dégâts sur monstres %, + Dégâts sur boss % si le rang le justifie
//
//  POUR UNE COMPÉTENCE, l'étape 1 et l'étape 2 sont remplacées par la puissance
//  de compétence : la fourchette de l'arme NON doublée, la fourchette du niveau
//  de compétence multipliée par cinq, et le coefficient de la compétence. La
//  Force n'entre alors qu'UNE fois, par le coefficient — pas par le facteur
//  d'arme. Confondre les deux double la statistique.
//
//  CE QUE LE MOTEUR NE FAIT PAS, ET NE FERA PAS :
//    · il ne tire pas au hasard. Flyffulator simule des coups un par un ; ici on
//      rend la fourchette, parce qu'une fourchette se vérifie et un tirage non ;
//    · il ne compte pas le +N d'amélioration, ni le palier d'élément ;
//    · il n'affirme rien : chaque résultat repart avec ses réserves.
// ════════════════════════════════════════════════════════════════════════════

import { apportDeStat, familleDe, SANS_FACTEUR, vitesseDAttaque } from "./armes";
import { cadenceDe, elementDe, estOffensive, natureDe, niveauDe, puissanceDeCompetence } from "./competences";
import {
  PALIER_NON_CALCULABLE,
  RESERVE_DEFENSE,
  RESERVE_ORDRE_BONUS,
  RESERVE_PALIERS_ACCESSOIRE,
  RESERVE_STATS_PLATES,
  statPourEchelle,
  type Cible,
  type Combattant,
  type Element,
  type Resultat,
  type Terme,
} from "./contrat";
import { appliquerDefense, defenseOpposee, facteurEcartDeNiveau } from "./defense";
import { competences, facteursDeClasse } from "./donnees";
import { bonusElementaire, maitriseDe, PALIER_ELEMENT_NON_CALCULABLE, resistanceDe } from "./elements";

export type Options = {
  /** La main employée. `gauche` n'est pour l'instant jamais utile : voir la note. */
  main?: "droite" | "gauche";
  /** Vrai pour montrer aussi ce que donnerait un coup critique. */
  avecCritique?: boolean;
};

const arrondi = (n: number) => Math.max(0, Math.floor(n));

/** Le rang d'un monstre qui vaut « boss » pour les bonus qui le mentionnent. */
const RANGS_BOSS = new Set(["boss", "demi-boss", "super"]);

/**
 * LES CODES QUE LES PALIERS DE BIJOU SAVENT PORTER. Quand l'un d'eux arrive avec
 * une valeur, le résultat repart avec `RESERVE_PALIERS_ACCESSOIRE` : le moteur ne
 * reçoit qu'une somme et ne peut pas voir si les paliers d'un même bijou ont été
 * cumulés au lieu d'être remplacés. La liste est celle des codes de dégâts qu'on
 * lit dans `paliers.json` — Attaque, Dégâts magiques %, Dégâts critiques.
 */
const CODES_PORTES_PAR_UN_PALIER = ["DST_ATKPOWER", "DST_ADDMAGIC_RATE", "DST_CRITICAL_BONUS", "DST_ATKPOWER_RATE"];

const paliersEnJeu = (c: Combattant) => CODES_PORTES_PAR_UN_PALIER.some((k) => (c.bonus[k] ?? 0) !== 0);

// ════════════════════════════════════════════════════════════════════════════
//  L'ATTAQUE ORDINAIRE
// ════════════════════════════════════════════════════════════════════════════

export function coupOrdinaire(c: Combattant, cible: Cible, o: Options = {}): Resultat {
  const termes: Terme[] = [];
  const reserves: string[] = [];
  const nonPrisEnCompte: string[] = [];

  const arme = o.main === "gauche" ? c.armeGauche : c.armeDroite;
  if (!arme) {
    return vide(`Aucune arme en main ${o.main ?? "droite"} : rien à calculer.`);
  }

  const famille = familleDe(arme);
  if (famille && SANS_FACTEUR.includes(famille)) {
    return vide(
      `${arme.nom} — l'attaque ordinaire d'un arc ne se calcule pas : propJob.inc n'a pas de colonne pour l'arc, donc le coefficient qui met la Dextérité à l'échelle n'est écrit dans aucun fichier du client. Les compétences d'arc, elles, se calculent : leur coefficient est dans propSkill.txt.`,
    );
  }

  // 1. La fourchette de l'arme, doublée.
  let min = arme.degatsMin * 2;
  let max = arme.degatsMax * 2;
  termes.push({
    cle: "ordinaire.arme",
    libelle: `${arme.nom} — fourchette ${arme.degatsMin}–${arme.degatsMax}, doublée`,
    valeur: min,
    valeurMax: max,
    unite: "points",
    source: "dwAbilityMin / dwAbilityMax : Client ▸ Spec_Item.txt, relevé objets-stats.json",
    certitude: "flyff-officiel",
    note: "Les deux bornes sont dans le client ; leur doublement est une constante du Flyff officiel.",
  });

  // 2. L'apport de la statistique.
  const apport = apportDeStat(c, arme);
  if (apport.bloque) return vide(apport.bloque);
  termes.push(...apport.termes);
  reserves.push(...apport.reserves);
  min += apport.valeur;
  max += apport.valeur;

  // 3. Le multiplicateur d'attaque, puis l'attaque plate.
  const tauxAttaque = c.bonus.DST_ATKPOWER_RATE ?? 0;
  if (tauxAttaque) {
    const f = 1 + tauxAttaque / 100;
    min *= f;
    max *= f;
    termes.push({
      cle: "ordinaire.tauxAttaque",
      libelle: "Attaque % (DST_ATKPOWER_RATE)",
      valeur: tauxAttaque,
      unite: "pourcent",
      source: "bonus d'équipement additionnés, relevé objets-stats.json — la place du multiplicateur : Flyff officiel",
      certitude: "flyff-officiel",
      note: "La valeur est celle du client ; l'ordre — multiplicateur d'abord, attaque plate ensuite — non.",
    });
  }
  const platAttaque = c.bonus.DST_ATKPOWER ?? 0;
  if (platAttaque) {
    min += platAttaque;
    max += platAttaque;
    termes.push({
      cle: "ordinaire.platAttaque",
      libelle: "Attaque (DST_ATKPOWER)",
      valeur: platAttaque,
      unite: "points",
      source: "bonus d'équipement additionnés, relevé objets-stats.json",
      certitude: "client",
    });
  }
  if (tauxAttaque && platAttaque) reserves.push(RESERVE_ORDRE_BONUS);
  if (paliersEnJeu(c)) reserves.push(RESERVE_PALIERS_ACCESSOIRE);

  min = arrondi(min);
  max = arrondi(max);
  termes.push({
    cle: "ordinaire.avantDefense",
    libelle: "Coup avant défense",
    valeur: min,
    valeurMax: max,
    unite: "points",
    source: "somme des lignes ci-dessus",
    certitude: "flyff-officiel",
  });

  // 4. La défense.
  const def = defenseOpposee(cible, "ordinaire");
  termes.push(def.terme);
  const redMin = appliquerDefense(min, def.valeur);
  const redMax = appliquerDefense(max, def.valeur);
  termes.push(...redMax.termes);
  min = redMin.degats;
  max = redMax.degats;
  reserves.push(RESERVE_DEFENSE);

  // 5. L'élément.
  const apresElement = appliquerElement(c, cible, arme.element, min, max);
  termes.push(...apresElement.termes);
  reserves.push(...apresElement.reserves);
  nonPrisEnCompte.push(...apresElement.nonPrisEnCompte);
  min = apresElement.min;
  max = apresElement.max;

  // 6. L'écart de niveau.
  const ecart = facteurEcartDeNiveau(c.niveau, cible.niveau);
  if (ecart) {
    termes.push(ecart);
    min = arrondi(min * ecart.valeur);
    max = arrondi(max * ecart.valeur);
  }

  // 7. Les bonus contre les monstres.
  const contreMonstres = appliquerBonusMonstres(c, cible, min, max);
  termes.push(...contreMonstres.termes);
  min = contreMonstres.min;
  max = contreMonstres.max;

  // Le critique, montré à part : il ne remplace pas le coup, il le double parfois.
  if (o.avecCritique !== false) {
    const crit = coupCritique(c, cible, min, max);
    termes.push(...crit.termes);
    reserves.push(...crit.reserves);
  }

  // La touche.
  const touche = tauxDeTouche(c, cible);
  termes.push(...touche.termes);
  reserves.push(...touche.reserves);

  // Ce que le client ne dit pas.
  if (arme.upgrade > 0) nonPrisEnCompte.push(`${arme.nom} +${arme.upgrade} — ${PALIER_NON_CALCULABLE}`);
  nonPrisEnCompte.push(
    "Le relevé d'objets ne porte aucune arme à deux armes (la colonne « mains » ne vaut que 1 ou 2) : le calcul ne boucle donc que sur une main.",
  );

  // La cadence.
  const v = vitesseDAttaque(c, arme);
  termes.push(...v.termes);
  reserves.push(...v.reserves);
  nonPrisEnCompte.push(
    `Vitesse d'attaque ${v.pourcent} % : elle ne se convertit pas en coups par seconde, la durée d'une animation d'attaque n'est dans aucun relevé. Les dégâts par seconde d'une attaque ordinaire ne sont donc pas calculés.`,
  );

  const moyen = Math.floor((min + max) / 2);
  return {
    quoi: `Attaque ordinaire — ${arme.nom} contre ${cible.nom} (niveau ${cible.niveau}, rang ${cible.rang})`,
    degatsMin: min,
    degatsMax: max,
    degatsMoyen: moyen,
    termes,
    reserves,
    nonPrisEnCompte,
    cadenceMs: null,
    degatsParSeconde: null,
    coupsPourTuer: moyen > 0 ? Math.ceil(cible.pointsDeVie / moyen) : null,
    secondesPourTuer: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  LA COMPÉTENCE
// ════════════════════════════════════════════════════════════════════════════

export function coupDeCompetence(c: Combattant, cible: Cible, idCompetence: string, niveau: number, o: Options = {}): Resultat {
  const comp = competences().get(idCompetence);
  if (!comp) return vide(`Compétence ${idCompetence} inconnue du relevé.`);
  if (!estOffensive(comp)) return vide(`${comp.nom} ne porte aucune fourchette de dégâts : ce n'est pas une compétence d'attaque.`);

  const niv = niveauDe(comp, niveau);
  if (!niv) return vide(`${comp.nom} n'a pas de niveau ${niveau} (maximum ${comp.nivMax}).`);

  const arme = o.main === "gauche" ? c.armeGauche : c.armeDroite;
  if (!arme) return vide(`${comp.nom} : aucune arme en main, la fourchette de l'arme entre dans le calcul.`);

  const termes: Terme[] = [];
  const reserves: string[] = [];
  const nonPrisEnCompte: string[] = [];
  const nat = natureDe(comp);
  termes.push(nat.terme);

  // 1-2. La puissance de compétence.
  const p = puissanceDeCompetence(comp, niv, c, arme.degatsMin, arme.degatsMax, arme.nom);
  termes.push(...p.termes);
  reserves.push(...p.reserves);
  nonPrisEnCompte.push(...p.nonPrisEnCompte);

  // 4. La défense. Quand le relevé ne dit pas si le coup est physique ou magique,
  //    on calcule les DEUX lectures de bout en bout : la prudente devient le
  //    résultat, l'autre reste affichée pour que l'écart soit visible.
  //
  //    ATTENTION À CE QU'ON MET DANS QUELLE LECTURE. Les bonus de dégâts magiques
  //    (DST_ADDMAGIC, DST_ADDMAGIC_RATE) n'appartiennent QU'À la lecture magique :
  //    les appliquer avant de choisir la défense gonflait aussi la lecture
  //    physique, et la « plus prudente des deux » ne l'était plus. Mesuré sur une
  //    Guillotine lancée avec la Baguette en Yggdrasil : 18 344 annoncés contre
  //    11 109 pour la vraie lecture physique, soit 65 % de trop.
  const lectures = nat.nature === "indetermine" ? (["competenceMelee", "competenceMagique"] as const) : ([nat.nature === "magique" ? "competenceMagique" : "competenceMelee"] as const);

  const calculees = lectures.map((nature) => {
    const bonusOffensifs = appliquerBonusOffensifs(c, p.min, p.max, nature === "competenceMagique");
    const d = defenseOpposee(cible, nature);
    return {
      nature,
      termesAvant: bonusOffensifs.termes,
      avantDefense: { min: bonusOffensifs.min, max: bonusOffensifs.max },
      terme: d.terme,
      min: appliquerDefense(bonusOffensifs.min, d.valeur),
      max: appliquerDefense(bonusOffensifs.max, d.valeur),
    };
  });
  // La prudente : celle qui laisse le moins de dégâts.
  calculees.sort((a, b) => a.max.degats - b.max.degats);
  const retenue = calculees[0];
  termes.push(...retenue.termesAvant);
  termes.push({
    cle: "competence.avantDefense",
    libelle: "Coup avant défense",
    valeur: retenue.avantDefense.min,
    valeurMax: retenue.avantDefense.max,
    unite: "points",
    source: "somme des lignes ci-dessus",
    certitude: "flyff-officiel",
  });
  let min = retenue.avantDefense.min;
  let max = retenue.avantDefense.max;
  termes.push(retenue.terme, ...retenue.max.termes);
  if (calculees.length > 1) {
    const autre = calculees[1];
    const identiques = autre.min.degats === retenue.min.degats && autre.max.degats === retenue.max.degats;
    termes.push({
      cle: "defense.autreLecture",
      libelle: identiques
        ? `Autre lecture — si le coup est ${autre.nature === "competenceMagique" ? "magique" : "physique"} : le MÊME résultat, ${cible.nom} opposant ici la même valeur des deux côtés`
        : `Autre lecture — si le coup est ${autre.nature === "competenceMagique" ? "magique" : "physique"} : ${autre.min.degats.toLocaleString("fr-FR")} à ${autre.max.degats.toLocaleString("fr-FR")} avant la suite du calcul`,
      valeur: autre.min.degats,
      valeurMax: autre.max.degats,
      unite: "points",
      source: autre.terme.source,
      certitude: "inconnu",
      note: identiques
        ? "L'ambiguïté du relevé ne change rien sur cette cible : sa défense et sa résistance magique se compriment vers la même valeur."
        : "C'est la lecture écartée. Elle est montrée parce que le relevé ne permet pas de choisir : la colonne dwSkillType manque.",
    });
    reserves.push(
      identiques
        ? `${comp.nom} : le relevé ne dit pas si ce coup est physique ou magique (la colonne dwSkillType de propSkill.txt n'y est pas). Sur cette cible, les deux lectures donnent le même résultat.`
        : `${comp.nom} : le relevé ne dit pas si ce coup est physique ou magique (la colonne dwSkillType de propSkill.txt n'y est pas). La valeur affichée est la plus prudente des deux lectures.`,
    );
  }
  min = retenue.min.degats;
  max = retenue.max.degats;
  reserves.push(RESERVE_DEFENSE);
  if ((c.bonus.DST_ATKPOWER_RATE ?? 0) && (c.bonus.DST_ATKPOWER ?? 0)) reserves.push(RESERVE_ORDRE_BONUS);
  if (paliersEnJeu(c)) reserves.push(RESERVE_PALIERS_ACCESSOIRE);

  // 5. L'élément. Celui de la COMPÉTENCE quand sa discipline en nomme un
  //    (« Foudre », « Feu »…) ; sinon celui posé sur l'arme.
  const elemComp = elementDe(comp);
  if (elemComp.terme) termes.push(elemComp.terme);
  const apresElement = appliquerElement(
    c,
    cible,
    elemComp.element ?? arme.element,
    min,
    max,
    elemComp.element ? "competence" : "arme",
  );
  termes.push(...apresElement.termes);
  reserves.push(...apresElement.reserves);
  nonPrisEnCompte.push(...apresElement.nonPrisEnCompte);
  min = apresElement.min;
  max = apresElement.max;

  // 6. L'écart de niveau.
  const ecart = facteurEcartDeNiveau(c.niveau, cible.niveau);
  if (ecart) {
    termes.push(ecart);
    min = arrondi(min * ecart.valeur);
    max = arrondi(max * ecart.valeur);
  }

  // 7. Les bonus contre les monstres.
  const contreMonstres = appliquerBonusMonstres(c, cible, min, max);
  termes.push(...contreMonstres.termes);
  min = contreMonstres.min;
  max = contreMonstres.max;

  // Les coups multiples.
  if (niv.coups && niv.coups > 1) {
    termes.push({
      cle: "competence.coups",
      libelle: `Coups par lancer`,
      valeur: niv.coups,
      unite: "points",
      source: "dwSkillCount : Client/data-05.air ▸ propSkillAdd.csv",
      certitude: "client",
      note: "Les dégâts ci-dessous sont ceux d'UN coup ; le lancer en porte plusieurs.",
    });
  }

  // Le coût et la cadence.
  if (niv.coutPf != null) {
    termes.push({
      cle: "competence.coutPf",
      libelle: "Coût en PC",
      valeur: niv.coutPf,
      unite: "points",
      source: "dwRepFp : Client/data-05.air ▸ propSkillAdd.csv",
      certitude: "client",
    });
  }
  if (niv.coutPm != null) {
    termes.push({
      cle: "competence.coutPm",
      libelle: "Coût en PM",
      valeur: niv.coutPm,
      unite: "points",
      source: "dwReqMp : Client/data-05.air ▸ propSkillAdd.csv",
      certitude: "client",
    });
  }
  const cadence = cadenceDe(niv);
  if (cadence.terme) termes.push(cadence.terme);
  if (cadence.manque) nonPrisEnCompte.push(cadence.manque);
  if (niv.incantationMs != null) {
    termes.push({
      cle: "competence.incantation",
      libelle: "Temps d'incantation, tel qu'écrit",
      valeur: niv.incantationMs,
      unite: "ms",
      source: "dwCastingTime : Client/data-05.air ▸ propSkillAdd.csv",
      certitude: "client",
      note: "Affiché, pas employé comme cadence : la colonne annonce 5 000 sur la Guillotine, qui est instantanée en jeu — son unité est donc elle-même douteuse.",
    });
  }

  // Les compétences ne font pas de critique.
  nonPrisEnCompte.push(
    "Une compétence ne peut pas être un coup critique — c'est le cas chez le Flyff officiel, et rien dans le client d'Airborn ne l'infirme. Les bonus de dégâts critiques ne pèsent donc pas sur cette ligne.",
  );
  if (arme.upgrade > 0) nonPrisEnCompte.push(`${arme.nom} +${arme.upgrade} — ${PALIER_NON_CALCULABLE}`);

  const moyen = Math.floor((min + max) / 2);
  const parSeconde = cadence.ms ? Math.floor((moyen * (niv.coups ?? 1)) / (cadence.ms / 1000)) : null;
  const coups = moyen > 0 ? Math.ceil(cible.pointsDeVie / (moyen * (niv.coups ?? 1))) : null;

  return {
    quoi: `${comp.nom} niveau ${niveau} (${comp.classe}) — ${arme.nom} contre ${cible.nom} (niveau ${cible.niveau}, rang ${cible.rang})`,
    degatsMin: min,
    degatsMax: max,
    degatsMoyen: moyen,
    termes,
    reserves,
    nonPrisEnCompte,
    cadenceMs: cadence.ms,
    degatsParSeconde: parSeconde,
    coupsPourTuer: coups,
    secondesPourTuer: coups != null && cadence.ms ? Math.round((coups * cadence.ms) / 1000) : null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  LES MORCEAUX PARTAGÉS
// ════════════════════════════════════════════════════════════════════════════

/**
 * LES BONUS OFFENSIFS D'UNE COMPÉTENCE, dans l'ordre où ils s'appliquent.
 *
 *   (puissance) × (1 + Dégâts magiques %) + Dégâts magiques   ← lecture magique seule
 *                × (1 + Attaque %)        + Attaque
 *
 * La fonction est appelée UNE FOIS PAR LECTURE. C'est ce qui garantit que les
 * deux bonus magiques ne se retrouvent pas dans un coup physique quand le relevé
 * ne tranche pas la nature du coup.
 *
 * L'ORDRE lui-même est une hypothèse, et il coûte : mettre l'attaque plate avant
 * le multiplicateur au lieu d'après change le coup de 2,3 % sur un porteur d'épée
 * en Yggdrasil. Le client ne dit pas lequel des deux ordres il applique — d'où la
 * réserve `RESERVE_ORDRE_BONUS`.
 */
function appliquerBonusOffensifs(c: Combattant, minBrut: number, maxBrut: number, magique: boolean) {
  const termes: Terme[] = [];
  let min = minBrut;
  let max = maxBrut;

  if (magique) {
    const tauxMagie = c.bonus.DST_ADDMAGIC_RATE ?? 0;
    if (tauxMagie) {
      const f = 1 + tauxMagie / 100;
      min = arrondi(min * f);
      max = arrondi(max * f);
      termes.push({
        cle: "competence.magieTaux",
        libelle: "Dégâts magiques % (DST_ADDMAGIC_RATE)",
        valeur: tauxMagie,
        unite: "pourcent",
        source: "bonus d'équipement additionnés",
        certitude: "client",
        note: "Ce bonus n'entre que dans la lecture MAGIQUE du coup : un coup physique ne le reçoit pas.",
      });
    }
    const platMagie = c.bonus.DST_ADDMAGIC ?? 0;
    if (platMagie) {
      min += platMagie;
      max += platMagie;
      termes.push({
        cle: "competence.magiePlat",
        libelle: "Dégâts magiques (DST_ADDMAGIC)",
        valeur: platMagie,
        unite: "points",
        source: "bonus d'équipement additionnés",
        certitude: "client",
        note: "Ce bonus n'entre que dans la lecture MAGIQUE du coup : un coup physique ne le reçoit pas.",
      });
    }
  }

  const tauxAttaque = c.bonus.DST_ATKPOWER_RATE ?? 0;
  if (tauxAttaque) {
    const f = 1 + tauxAttaque / 100;
    min *= f;
    max *= f;
    termes.push({
      cle: "competence.tauxAttaque",
      libelle: "Attaque % (DST_ATKPOWER_RATE)",
      valeur: tauxAttaque,
      unite: "pourcent",
      source: "bonus d'équipement additionnés — la place du multiplicateur dans la formule : Flyff officiel",
      certitude: "flyff-officiel",
      note: "La valeur est celle du client ; l'endroit où le multiplicateur entre dans une puissance de compétence, non.",
    });
  }
  const platAttaque = c.bonus.DST_ATKPOWER ?? 0;
  if (platAttaque) {
    min += platAttaque;
    max += platAttaque;
    termes.push({
      cle: "competence.platAttaque",
      libelle: "Attaque (DST_ATKPOWER)",
      valeur: platAttaque,
      unite: "points",
      source: "bonus d'équipement additionnés",
      certitude: "client",
    });
  }

  return { min: arrondi(min), max: arrondi(max), termes };
}

function appliquerElement(
  c: Combattant,
  cible: Cible,
  element: Element | null,
  min: number,
  max: number,
  provenance: "arme" | "competence" = "arme",
) {
  const termes: Terme[] = [];
  const reserves: string[] = [];
  const nonPrisEnCompte: string[] = [];

  if (!element) {
    nonPrisEnCompte.push(
      "Aucun élément sur l'arme : les cinq colonnes de résistance de la cible ne s'appliquent pas. Aucune arme du relevé ne porte d'élément d'origine — un élément vient d'une pierre posée sur l'arme.",
    );
    return { min, max, termes, reserves, nonPrisEnCompte };
  }

  const res = resistanceDe(cible, element);
  if (res.refus) reserves.push(res.refus);
  if (res.terme) {
    termes.push(res.terme);
    min = arrondi(min * res.facteur);
    max = arrondi(max * res.facteur);
  }

  // La maîtrise élémentaire, qui ne joue que sur une compétence élémentaire :
  // c'est la puissance du sort qu'elle multiplie, pas un coup d'arme.
  if (provenance === "competence") {
    const maitrise = maitriseDe(c.bonus, element);
    if (maitrise) {
      termes.push(maitrise);
      min = arrondi(min * (1 + maitrise.valeur / 100));
      max = arrondi(max * (1 + maitrise.valeur / 100));
    }
  }

  const bonus = bonusElementaire(c.bonus, element);
  if (bonus) {
    termes.push(bonus);
    min = arrondi(min * (1 + bonus.valeur / 100));
    max = arrondi(max * (1 + bonus.valeur / 100));
  }

  // Le palier d'élément ne concerne que l'arme : une compétence de discipline
  // élémentaire ne passe par aucune pierre, donc rien ne manque de ce côté-là.
  if (provenance === "arme") nonPrisEnCompte.push(PALIER_ELEMENT_NON_CALCULABLE);
  return { min, max, termes, reserves, nonPrisEnCompte };
}

function appliquerBonusMonstres(c: Combattant, cible: Cible, min: number, max: number) {
  const termes: Terme[] = [];
  const surMonstres = c.bonus.DST_MONSTER_DMG ?? 0;
  if (surMonstres) {
    min += Math.floor((min * surMonstres) / 100);
    max += Math.floor((max * surMonstres) / 100);
    termes.push({
      cle: "monstre.degats",
      libelle: "Dégâts sur monstres % (DST_MONSTER_DMG)",
      valeur: surMonstres,
      unite: "pourcent",
      source: "bonus d'équipement, panoplies, parchemins de guilde — additionnés",
      certitude: "client",
    });
  }
  const surBoss = c.bonus.DST_MONSTER_DMG_BOSS ?? 0;
  if (surBoss && RANGS_BOSS.has(cible.rang)) {
    min += Math.floor((min * surBoss) / 100);
    max += Math.floor((max * surBoss) / 100);
    termes.push({
      cle: "monstre.boss",
      libelle: `Dégâts sur boss % (DST_MONSTER_DMG_BOSS) — ${cible.nom} est de rang ${cible.rang}`,
      valeur: surBoss,
      unite: "pourcent",
      source: "bonus d'équipement — le rang vient de dwMonsterGrade, relevé monstres.json",
      certitude: "client",
    });
  }
  return { min, max, termes };
}

/**
 * LE COUP CRITIQUE, montré à côté du coup normal et jamais fondu dedans.
 *
 * Le taux se lit : Dextérité / 10 × le facteur CRITICAL de `propJob.inc`, plus
 * le taux critique de l'équipement. Le facteur vaut 1 pour toutes les classes
 * SAUF la famille Sylphide, où il vaut 4 — c'est écrit dans le client, et c'est
 * la seule classe pour laquelle la Dextérité paie quatre fois.
 *
 * Le multiplicateur, lui, est du Flyff officiel : entre 1,1 et 1,4 à niveau égal,
 * entre 1,2 et 2 quand on tape plus bas que soi.
 */
function coupCritique(c: Combattant, cible: Cible, min: number, max: number) {
  const ligne = facteursDeClasse().get(c.classe);
  const facteurClasse = typeof ligne?.CRITICAL === "number" ? ligne.CRITICAL : 1;
  const dex = statPourEchelle(c, "dexterite");
  const reserves: string[] = dex.plate ? [] : [RESERVE_STATS_PLATES];
  const taux = Math.floor((dex.valeur / 10) * facteurClasse) + (c.bonus.DST_CHR_CHANCECRITICAL ?? 0);
  const bonusDegats = c.bonus.DST_CRITICAL_BONUS ?? 0;

  const plusHaut = c.niveau > cible.niveau;
  const bas = plusHaut ? 1.2 : 1.1;
  const haut = plusHaut ? 2 : 1.4;
  const multiplicateur = Math.max(0.1, 1 + bonusDegats / 100);

  const termes: Terme[] = [
    {
      cle: "critique.taux",
      libelle: `Taux critique : Dextérité ${dex.valeur} / 10 × ${facteurClasse}${c.bonus.DST_CHR_CHANCECRITICAL ? ` + ${c.bonus.DST_CHR_CHANCECRITICAL} d'équipement` : ""}`,
      valeur: Math.min(taux, 100),
      unite: "pourcent",
      source: "facteur CRITICAL : Client/data-02.air ▸ propJob.inc — le / 10 : Flyff officiel",
      certitude: "flyff-officiel",
      note: facteurClasse !== 1 ? `Le facteur ${facteurClasse} de cette classe est bien celui du client : la famille Sylphide est la seule à en porter un autre que 1.` : undefined,
    },
    {
      cle: "critique.degats",
      libelle: `Si le coup est critique`,
      valeur: arrondi(min * bas * multiplicateur),
      valeurMax: arrondi(max * haut * multiplicateur),
      unite: "points",
      source: `multiplicateur ${bas}–${haut} : Flyff officiel${bonusDegats ? ` — bonus de ${bonusDegats} % : DST_CRITICAL_BONUS de l'équipement` : ""}`,
      certitude: "flyff-officiel",
      note: plusHaut
        ? "Vous tapez plus bas que votre niveau : le multiplicateur critique va de 1,2 à 2 au lieu de 1,1 à 1,4."
        : undefined,
    },
  ];
  return { termes, reserves };
}

/**
 * LE TAUX DE TOUCHE. Deux nombres du client (la Dextérité du joueur, l'esquive du
 * monstre), une forme officielle, et un plancher/plafond à 20 et 96 % qui ne se
 * lit pas non plus dans le client.
 */
function tauxDeTouche(c: Combattant, cible: Cible) {
  const dex = statPourEchelle(c, "dexterite");
  const reserves: string[] = dex.plate ? [] : [RESERVE_STATS_PLATES];
  const facteur = 1.6 * 1.5 * ((c.niveau * 1.2) / (c.niveau + cible.niveau));
  const part = dex.valeur / (dex.valeur + cible.esquive);
  const brut = Math.floor(part * facteur * 100);
  const precision = c.bonus.DST_ADJ_HITRATE ?? 0;
  const ajuste = Math.max(20, Math.min(96, brut + precision));

  const termes: Terme[] = [
    {
      cle: "touche.taux",
      libelle: `Chance de toucher ${cible.nom} — Dextérité ${dex.valeur} contre esquive ${cible.esquive}${precision ? `, + ${precision} de Précision` : ""}`,
      valeur: ajuste,
      unite: "pourcent",
      source: `esquive : dwParry, relevé monstres.json (${cible.id})${precision ? " — Précision : DST_ADJ_HITRATE de l'équipement" : ""} — la forme et les bornes 20/96 : Flyff officiel`,
      certitude: "flyff-officiel",
      note: brut + precision > 96 ? "Le calcul dépasse le plafond : la touche est ramenée à 96 %, il reste toujours quatre pour cent d'échec." : undefined,
    },
  ];
  return { termes, reserves };
}

function vide(pourquoi: string): Resultat {
  return {
    quoi: pourquoi,
    degatsMin: 0,
    degatsMax: 0,
    degatsMoyen: 0,
    termes: [],
    reserves: [],
    nonPrisEnCompte: [pourquoi],
    cadenceMs: null,
    degatsParSeconde: null,
    coupsPourTuer: null,
    secondesPourTuer: null,
  };
}
