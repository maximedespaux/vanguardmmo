// ════════════════════════════════════════════════════════════════════════════
//  LE MOTEUR DE DÉGÂTS — porte d'entrée.
//
//  Deux fonctions suffisent à s'en servir :
//
//    coupOrdinaire(combattant, cible)                       → Resultat
//    coupDeCompetence(combattant, cible, "SI_…", niveau)    → Resultat
//
//  Un `Resultat` porte la fourchette de dégâts ET la liste des termes qui l'ont
//  produite, chacun avec sa source et son degré de confiance. Un écran qui
//  n'affiche que `degatsMoyen` trahit le moteur : les réserves de `reserves` et
//  les manques de `nonPrisEnCompte` sont à afficher AVEC le nombre. C'est la
//  décision prise avec Maxime — le calcul s'affiche avec sa source, sans être
//  donné pour exact, parce que les formules publiées ailleurs sont celles du
//  Flyff OFFICIEL et qu'Airborn a changé des valeurs.
//
//  D'où sortent les chiffres, en un coup d'œil :
//    · public/wiki/objets-stats.json  — 5 075 objets : fourchettes, vitesses, bonus
//    · public/wiki/competences.json   — 197 compétences : coefficients, niveaux
//    · public/wiki/monstres.json      — 1 124 monstres : défense, esquive, résistances
//    · public/wiki/bonus-sources.json — propJob.inc : facteurs d'arme, critique, vitesse
//    · public/wiki/balance.json       — propBalance.xml : l'ÉQUILIBRAGE du serveur,
//      45 métiers x 2 situations (PvE / PvP), le facteur d'ARC compris
//    · src/data/statistiques-objets.json — les codes DST_* en français
//
//  ATTENTION : `donnees.ts` lit le disque. N'importez pas ce module depuis un
//  composant « use client » — passez par une route API.
// ════════════════════════════════════════════════════════════════════════════

export {
  PALIER_NON_CALCULABLE,
  RESERVE_DEFENSE,
  RESERVE_ORDRE_BONUS,
  RESERVE_PALIERS_ACCESSOIRE,
  RESERVE_STATS_PLATES,
  statPourEchelle,
  terme,
  type ArmeEquipee,
  type Certitude,
  type ChampStat,
  type Cible,
  type Combattant,
  type Element,
  type Resultat,
  type Terme,
  type Unite,
} from "./contrat";

export { coupDeCompetence, coupOrdinaire, type Options } from "./moteur";

export {
  apportDeStat,
  facteurDArme,
  famillesSansFacteurDArme,
  familleDe,
  lectureDuFacteurDArme,
  vitesseDAttaque,
  type FamilleArme,
} from "./armes";

export {
  facteurDeCompetence,
  facteursDeCompetence,
  famillesSansFacteur,
  lireFacteurDArme,
  proprieteEquilibree,
  SITUATION_PAR_DEFAUT,
  vitesseDeBaseEquilibree,
  type FacteurDeCompetence,
  type LectureDeFacteur,
  type Situation,
  type TableDeFacteur,
} from "./balance";

export {
  cadenceDe,
  echelleDeStat,
  elementDe,
  estMagique,
  estOffensive,
  natureDe,
  niveauDe,
  puissanceDeCompetence,
  type Nature,
  type NiveauCompetence,
  type PuissanceCompetence,
} from "./competences";

export { appliquerDefense, defenseOpposee, facteurEcartDeNiveau, type NatureDuCoup } from "./defense";

export {
  bonusElementaire,
  ELEMENT_DEPUIS_OBJET,
  maitriseDe,
  NOM_ELEMENT,
  PALIER_ELEMENT_NON_CALCULABLE,
  resistanceDe,
} from "./elements";

export {
  appointParCle,
  avecAppoints,
  catalogueDeGuilde,
  catalogueOffensif,
  CODES_OFFENSIFS,
} from "./consommables";

export {
  armeEquipee,
  bonusDObjet,
  cible,
  cibleParNom,
  competences,
  equilibrage,
  facteursDeClasse,
  inventaire,
  libelleStat,
  type CompetenceBrute,
  type Consommable,
  type FacteursClasse,
  type LigneDEquilibrage,
} from "./donnees";
