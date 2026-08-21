// ════════════════════════════════════════════════════════════════════════════
//  LES ARMES — la fourchette de coup, l'apport de la statistique, la cadence.
//
//  CE QUE LE CLIENT DONNE, ET CE QU'IL NE DONNE PAS. C'est la distinction qui
//  structure tout ce fichier :
//
//  · `dwAbilityMin` / `dwAbilityMax` — les deux bornes de l'arme. Dans le client.
//  · `dwAttackSpeed` (0,025 à 0,085) — le coefficient de vitesse. Dans le client.
//  · Le facteur d'arme (épée 4,5 · hache 5,5 · bâton 0,8 · sceptre 3 · poing 5 ·
//    baguette 6 · yo-yo 4,2) — dans `propJob.inc`.
//  · Le SEUIL retiré à la statistique (12 ou 10 ou 14) et le facteur de niveau
//    (1,1 · 1,2 · 1,3 · 0,91) — DANS AUCUN FICHIER. Ce sont des constantes du
//    Flyff officiel, reprises telles quelles et marquées comme telles.
//
//  UNE DIVERGENCE À CONNAÎTRE. Chez le Flyff officiel, le facteur d'arme varie
//  d'une classe à l'autre. Dans `propJob.inc` d'Airborn, les sept colonnes
//  d'arme portent la MÊME valeur sur les quarante lignes de classe : ce sont des
//  constantes d'arme recopiées. On ne les indexe donc pas par classe.
//
//  ET UN TROU. `propJob.inc` n'a PAS de colonne pour l'arc. L'attaque ordinaire
//  d'un arc ou d'une arbalète n'est donc pas calculable : voir `SANS_FACTEUR`.
// ════════════════════════════════════════════════════════════════════════════

import { RESERVE_STATS_PLATES, statPourEchelle, type ArmeEquipee, type Combattant, type Terme } from "./contrat";
import { facteursDeClasse } from "./donnees";

/** Les familles d'arme, nommées comme le client nomme ses colonnes. */
export type FamilleArme = "SWD" | "AXE" | "STAFF" | "STICK" | "KNUCKLE" | "WAND" | "YOYO" | "BOW";

/** `wt` du relevé → famille de `propJob.inc`. Les deux `wt` génériques
 *  (MELEE, RANGE) ne nomment aucune famille : on retombe alors sur `t2`. */
const FAMILLE_PAR_WT: Record<string, FamilleArme> = {
  MELEE_SWD: "SWD",
  MELEE_AXE: "AXE",
  MELEE_STAFF: "STAFF",
  MELEE_STICK: "STICK",
  MELEE_KNUCKLE: "KNUCKLE",
  MELEE_YOYO: "YOYO",
  MAGIC_WAND: "WAND",
  RANGE_BOW: "BOW",
};

const FAMILLE_PAR_T2: Record<string, FamilleArme> = {
  WEAPON_ONESWORD: "SWD",
  WEAPON_TWOSWORD: "SWD",
  WEAPON_ONEAXE: "AXE",
  WEAPON_TWOAXE: "AXE",
  WEAPON_STAFF: "STAFF",
  WEAPON_STICK: "STICK",
  WEAPON_KNUCKLE: "KNUCKLE",
  WEAPON_YOYO: "YOYO",
  WEAPON_WAND: "WAND",
  WEAPON_BOW: "BOW",
};

/**
 * « retiré à la Force », mais « retiré à l'Intelligence ». Sans cette élision, la
 * note d'une baguette écrivait « retiré à la Intelligence ».
 */
const aLaStat = (nom: string) => (/^[AEIOUYÉÈÊaeiouyéèê]/.test(nom) ? `l'${nom}` : `la ${nom}`);

export function familleDe(arme: ArmeEquipee): FamilleArme | null {
  return FAMILLE_PAR_WT[arme.typeArme] ?? FAMILLE_PAR_T2[arme.categorie] ?? null;
}

/**
 * LES FAMILLES SANS FACTEUR DANS LE CLIENT.
 *
 * `propJob.inc` a dix-huit colonnes : 공속, MaxHP, MaxMP, MaxFP, 물리방어력,
 * trois taux de récupération, SWD, AXE, STAFF, STICK, KNUCKLE, WAND, BLOCKING,
 * YOYO, CRITICAL, ICON. Aucune ne nomme l'arc. Le coefficient qui met la
 * Dextérité à l'échelle pour un arc vit donc dans l'exécutable, pas dans un
 * fichier lisible — et sans lui, l'attaque ordinaire d'un arc ne se calcule pas.
 */
export const SANS_FACTEUR: FamilleArme[] = ["BOW"];

/**
 * LA STATISTIQUE DE RÉFÉRENCE de chaque famille, et le seuil qu'on lui retire.
 * Les seuils viennent du Flyff officiel — le client ne les écrit nulle part.
 */
const REFERENCE: Record<FamilleArme, { stat: "force" | "dexterite" | "intelligence"; seuil: number; facteurNiveau: number }> = {
  SWD: { stat: "force", seuil: 12, facteurNiveau: 1.1 },
  YOYO: { stat: "force", seuil: 12, facteurNiveau: 1.1 },
  AXE: { stat: "force", seuil: 12, facteurNiveau: 1.2 },
  STAFF: { stat: "force", seuil: 10, facteurNiveau: 1.1 },
  STICK: { stat: "force", seuil: 10, facteurNiveau: 1.3 },
  KNUCKLE: { stat: "force", seuil: 10, facteurNiveau: 1.2 },
  WAND: { stat: "intelligence", seuil: 10, facteurNiveau: 1.2 },
  BOW: { stat: "dexterite", seuil: 14, facteurNiveau: 0.91 },
};

/** Le facteur d'arme lu dans `propJob.inc`. Il ne dépend pas de la classe :
 *  on lit quand même la ligne de la classe portée, pour que la source citée
 *  soit exactement celle qu'on a lue. */
export function facteurDArme(classe: string, famille: FamilleArme): number | null {
  const ligne = facteursDeClasse().get(classe) ?? facteursDeClasse().get("VAGRANT");
  const v = ligne?.[famille];
  return typeof v === "number" ? v : null;
}

/** Le code `DST_*` qui ajoute des dégâts plats à une famille précise. */
const CODE_DEGATS_FAMILLE: Partial<Record<FamilleArme, string>> = {
  BOW: "DST_BOW_DMG",
  YOYO: "DST_YOY_DMG",
};

export type ApportDeStat = { valeur: number; termes: Terme[]; reserves: string[]; bloque: string | null };

/**
 * L'APPORT DE LA STATISTIQUE À L'ATTAQUE ORDINAIRE.
 *
 *   apport = (statistique − seuil) × facteurDArme + niveau × facteurDeNiveau
 *            [ + 0,14 × Force pour un arc ]  + dégâts plats de la famille
 *
 * Chaque morceau est rendu comme un terme séparé, avec sa source : c'est la
 * seule façon de voir, à l'écran, que le 4,5 vient du client et que le 12 non.
 */
export function apportDeStat(c: Combattant, arme: ArmeEquipee): ApportDeStat {
  const famille = familleDe(arme);
  const termes: Terme[] = [];
  const reserves: string[] = [];
  if (!famille) return { valeur: 0, termes, reserves, bloque: `Famille d'arme inconnue pour ${arme.nom} (${arme.categorie}).` };

  const facteur = facteurDArme(c.classe, famille);
  if (facteur == null) {
    return {
      valeur: 0,
      termes,
      reserves,
      bloque: `Aucun facteur d'arme pour la famille ${famille} dans propJob.inc : l'attaque ordinaire de cette arme ne se calcule pas.`,
    };
  }

  const ref = REFERENCE[famille];
  const lu = statPourEchelle(c, ref.stat);
  const stat = lu.valeur;
  if (!lu.plate) reserves.push(RESERVE_STATS_PLATES);
  const partStat = (stat - ref.seuil) * facteur;
  const partNiveau = c.niveau * ref.facteurNiveau;
  const appoint = famille === "BOW" ? 0.14 * statPourEchelle(c, "force").valeur : 0;
  const codeFamille = CODE_DEGATS_FAMILLE[famille];
  const platFamille = codeFamille ? (c.bonus[codeFamille] ?? 0) : 0;

  const nomStat = { force: "Force", dexterite: "Dextérité", intelligence: "Intelligence" }[ref.stat];

  termes.push({
    cle: "arme.stat",
    libelle: `(${nomStat} ${stat} − ${ref.seuil}) × ${facteur.toString().replace(".", ",")}`,
    valeur: partStat,
    unite: "points",
    source: `facteur ${facteur} : Client/data-02.air ▸ propJob.inc, colonne ${famille} — seuil ${ref.seuil} : constante du Flyff officiel`,
    certitude: "flyff-officiel",
    note: `Le facteur ${facteur} est bien celui du client, mais le seuil de ${ref.seuil} points retiré à ${aLaStat(nomStat)} n'est écrit dans aucun fichier.${lu.plate ? "" : " Et la valeur lue est le TOTAL : la forme du Flyff officiel prend ici un total SANS les pourcentages de statistique."}`,
  });
  termes.push({
    cle: "arme.niveau",
    libelle: `Niveau ${c.niveau} × ${ref.facteurNiveau.toString().replace(".", ",")}`,
    valeur: partNiveau,
    unite: "points",
    source: "constante du Flyff officiel — absente des fichiers du client",
    certitude: "flyff-officiel",
  });
  if (appoint) {
    termes.push({
      cle: "arme.appointArc",
      libelle: `Appoint d'arc : 0,14 × Force ${statPourEchelle(c, "force").valeur}`,
      valeur: appoint,
      unite: "points",
      source: "constante du Flyff officiel",
      certitude: "flyff-officiel",
    });
  }
  if (platFamille) {
    termes.push({
      cle: "arme.platFamille",
      libelle: `Bonus ${codeFamille}`,
      valeur: platFamille,
      unite: "points",
      source: "bonus d'équipement, relevé objets-stats.json",
      certitude: "client",
    });
  }

  return { valeur: Math.floor(partStat + partNiveau + appoint) + platFamille, termes, reserves, bloque: null };
}

// ════════════════════════════════════════════════════════════════════════════
//  LA CADENCE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Les paliers de bonus de vitesse. Dix-huit valeurs, indexées par
 * `vitesseDeBase / 10`. Constante du Flyff officiel : le client n'en donne pas
 * la table, seulement les deux nombres qu'on y fait entrer.
 */
const PALIERS_VITESSE = [
  0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8,
  0.88, 0.96, 1.04, 1.12, 1.2, 1.3, 1.38, 1.5,
];

const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Le libellé français suivi du code du client : l'écran doit pouvoir vérifier. */
const libelleAvecCode = (fr: string, code: string) => `${fr} (${code})`;

export type Vitesse = {
  /** Le multiplicateur, entre 0,1 et 2. C'est la grandeur que le jeu manipule. */
  multiplicateur: number;
  /** Le pourcentage tel que la fenêtre de personnage l'affiche (2 → 100 %). */
  pourcent: number;
  termes: Terme[];
  reserves: string[];
};

/**
 * LA VITESSE D'ATTAQUE, et ce qu'elle ne dit pas.
 *
 *   base   = 공속(classe) + dwAttackSpeed(arme) × (4 × Dextérité + niveau / 8)
 *   vitesse = 25 / (200 − base) + palier[base / 10]
 *            puis + points de DST_ATTACKSPEED, puis × DST_ATTACKSPEED_RATE
 *
 * DEUX TERMES SUR TROIS SONT DANS LE CLIENT : 공속 (colonne 1 de `propJob.inc`,
 * 75 pour un Vagabond, 90 pour un Spadassin) et `dwAttackSpeed` de l'arme. Le
 * reste — le 4, le /8, le 200, le 25, la table de paliers — est du Flyff officiel.
 *
 * CE QUE ÇA NE DONNE PAS : un nombre de coups par seconde. La grandeur obtenue
 * est un MULTIPLICATEUR ; la durée d'une animation d'attaque, qui seule permet
 * de passer à des coups par seconde, n'est dans aucun relevé. Le moteur affiche
 * donc la vitesse, et refuse de la convertir en dégâts par seconde.
 */
export function vitesseDAttaque(c: Combattant, arme: ArmeEquipee): Vitesse {
  const ligne = facteursDeClasse().get(c.classe);
  const baseClasse = typeof ligne?.colonne1 === "number" ? ligne.colonne1 : 75;
  const dex = statPourEchelle(c, "dexterite");
  const reserves: string[] = dex.plate ? [] : [RESERVE_STATS_PLATES];
  const echelle = 4 * dex.valeur + c.niveau / 8;
  const plafondBase = 200 - (200 * 0.125) / 2; // 187,5
  const base = Math.floor(Math.min(baseClasse + arme.vitesse * echelle, plafondBase));

  let v = (200 * 0.125) / (200 - base);
  v += PALIERS_VITESSE[Math.floor(borne(base / 10, 0, PALIERS_VITESSE.length - 1))];

  const points = c.bonus.DST_ATTACKSPEED ?? 0;
  if (points) v += (points / 1000) * 20;
  const taux = c.bonus.DST_ATTACKSPEED_RATE ?? 0;
  if (taux > 0) v += (v * taux) / 100;
  v = borne(v, 0.1, 2);

  const termes: Terme[] = [
    {
      cle: "vitesse.classe",
      libelle: `Vitesse de base de la classe (${c.classe})`,
      valeur: baseClasse,
      unite: "points",
      source: "Client/data-02.air ▸ propJob.inc, colonne 공속",
      certitude: "client",
    },
    {
      cle: "vitesse.arme",
      libelle: `${arme.nom} : dwAttackSpeed ${arme.vitesse.toString().replace(".", ",")} × (4 × Dex ${dex.valeur} + niveau/8)`,
      valeur: arme.vitesse * echelle,
      unite: "points",
      source: "dwAttackSpeed : Client ▸ Spec_Item.txt — le 4 et le /8 : Flyff officiel",
      certitude: "flyff-officiel",
    },
  ];
  if (points) {
    termes.push({
      cle: "vitesse.points",
      libelle: libelleAvecCode("Vitesse d'attaque (points)", "DST_ATTACKSPEED"),
      valeur: points,
      unite: "points",
      source: "bonus d'équipement",
      certitude: "client",
    });
  }
  if (taux) {
    termes.push({
      cle: "vitesse.taux",
      libelle: libelleAvecCode("Vitesse d'attaque", "DST_ATTACKSPEED_RATE"),
      valeur: taux,
      unite: "pourcent",
      source: "bonus d'équipement",
      certitude: "client",
    });
  }
  termes.push({
    cle: "vitesse.total",
    libelle: "Vitesse d'attaque",
    valeur: v,
    unite: "facteur",
    source: "somme des lignes ci-dessus",
    certitude: "flyff-officiel",
    note: "Le jeu affiche cette grandeur en pourcentage : 2 vaut 100 %. Elle ne se convertit PAS en coups par seconde — la durée d'une animation d'attaque n'est dans aucun relevé.",
  });

  return { multiplicateur: v, pourcent: Math.floor((v * 100) / 2), termes, reserves };
}
