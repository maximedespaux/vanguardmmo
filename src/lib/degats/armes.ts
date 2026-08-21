// ════════════════════════════════════════════════════════════════════════════
//  LES ARMES — la fourchette de coup, l'apport de la statistique, la cadence.
//
//  CE QUE LE CLIENT DONNE, ET CE QU'IL NE DONNE PAS. C'est la distinction qui
//  structure tout ce fichier :
//
//  · `dwAbilityMin` / `dwAbilityMax` — les deux bornes de l'arme. Dans le client.
//  · `dwAttackSpeed` (0,025 à 0,085) — le coefficient de vitesse. Dans le client.
//  · Le facteur d'arme — dans DEUX fichiers du client qui ne disent pas la même
//    chose : `propJob.inc` (épée 4,5 · hache 5,5 · bâton 0,8 · sceptre 3 ·
//    poing 5 · baguette 6 · yo-yo 4,2, les mêmes pour les quarante classes) et
//    `propBalance.xml` (par métier, et il nomme l'ARC). Voir `balance.ts`.
//  · Le SEUIL retiré à la statistique (12 ou 10 ou 14) et le facteur de niveau
//    (1,1 · 1,2 · 1,3 · 0,91) — DANS AUCUN FICHIER. Ce sont des constantes du
//    Flyff officiel, reprises telles quelles et marquées comme telles. RIEN dans
//    l'équilibrage n'y change quoi que ce soit : il donne le COEFFICIENT, jamais
//    le seuil. Une réserve tombée n'en fait pas tomber une autre.
//
//  ════════ CE QUI A CHANGÉ, ET POURQUOI C'EST ÉCRIT ICI ════════
//
//  Ce fichier a porté pendant des mois deux affirmations fausses, tirées d'une
//  lecture complète de `propJob.inc` — et d'une seule table :
//
//    « les sept colonnes d'arme portent la même valeur sur les quarante lignes
//      de classe : on ne les indexe donc pas par classe »
//    « propJob.inc n'a PAS de colonne pour l'arc : l'attaque ordinaire d'un arc
//      ou d'une arbalète n'est donc pas calculable »
//
//  Les deux étaient exactes SUR propJob.inc, et fausses sur le client. Le client
//  porte `propBalance.xml`, qui nomme l'arc (`JOB_PROP_BOW 9` dans
//  `defineBalance.h`) et dont les facteurs varient par métier — `JOB_RANGER`
//  Bow 11,8 contre `JOB_ACROBAT` Bow 4,0. L'Arbalétrier et la Sylphide, les deux
//  classes entièrement hors calcul, y entrent.
//
//  LA LEÇON, et elle vaut plus que le correctif : « ce n'est pas dans le client »
//  ne se conclut pas d'un fichier lu, mais des fichiers PAS ENCORE lus. Il en
//  restait cent trente-trois.
//
//  LES DEUX TABLES SE CONTREDISENT et rien, dans le client, n'écrit laquelle
//  l'emporte. `balance.ts` porte l'arbitrage, ses preuves et ses limites ; ce
//  fichier se contente d'écrire LES DEUX VALEURS dans le terme quand elles
//  divergent, et de joindre une réserve.
// ════════════════════════════════════════════════════════════════════════════

import { famillesSansFacteur, lireFacteurDArme, SITUATION_PAR_DEFAUT, vitesseDeBaseEquilibree, type LectureDeFacteur, type Situation } from "./balance";
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

/** Une virgule décimale : ces nombres s'affichent en français, pas en JavaScript. */
const fr = (n: number) => n.toString().replace(".", ",");

export function familleDe(arme: ArmeEquipee): FamilleArme | null {
  return FAMILLE_PAR_WT[arme.typeArme] ?? FAMILLE_PAR_T2[arme.categorie] ?? null;
}

/**
 * LES FAMILLES SANS FACTEUR DANS LE CLIENT — CALCULÉ SUR LES DEUX TABLES.
 *
 * C'était une liste écrite à la main, `["BOW"]`, tirée de `propJob.inc` seul.
 * Elle se mesure maintenant sur les deux tables réunies : une famille n'est sans
 * facteur que si NI l'équilibrage NI propJob ne lui en donnent un, sur aucun
 * métier. Sur ce client, la liste est vide — mais la fonction reste, et le
 * moteur continue de savoir refuser : c'est elle qui a dit « l'arc ne se calcule
 * pas » pendant des mois, et c'était juste tant que la seconde table dormait.
 */
export function famillesSansFacteurDArme(): FamilleArme[] {
  return famillesSansFacteur([...facteursDeClasse().values()] as unknown as Record<string, unknown>[]) as FamilleArme[];
}

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

/**
 * LE FACTEUR D'ARME, LES DEUX TABLES RENDUES ENSEMBLE.
 *
 * L'équilibrage du métier d'abord (`propBalance.xml`, situation demandée), puis
 * `propJob.inc` quand la ligne d'équilibrage ne nomme pas cette arme — ce qui
 * arrive SEPT FOIS SUR NEUF, chaque ligne ne nommant que les armes de sa voie.
 * La lecture rendue porte l'autre valeur : elle n'est jamais perdue en route.
 */
export function lectureDuFacteurDArme(
  classe: string,
  famille: FamilleArme,
  situation: Situation = SITUATION_PAR_DEFAUT,
): LectureDeFacteur | null {
  const ligne = facteursDeClasse().get(classe) ?? facteursDeClasse().get("VAGRANT");
  return lireFacteurDArme(classe, famille, situation, (ligne ?? null) as Record<string, unknown> | null);
}

/** Le seul chiffre, quand l'appelant n'a pas besoin de l'arbitrage. */
export function facteurDArme(classe: string, famille: FamilleArme, situation: Situation = SITUATION_PAR_DEFAUT): number | null {
  return lectureDuFacteurDArme(classe, famille, situation)?.valeur ?? null;
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
 * seule façon de voir, à l'écran, que le COEFFICIENT vient du client et que le
 * SEUIL non — et, depuis que le client s'est révélé porter deux tables de métier,
 * de laquelle des deux le coefficient est sorti.
 */
export function apportDeStat(c: Combattant, arme: ArmeEquipee, situation: Situation = SITUATION_PAR_DEFAUT): ApportDeStat {
  const famille = familleDe(arme);
  const termes: Terme[] = [];
  const reserves: string[] = [];
  if (!famille) return { valeur: 0, termes, reserves, bloque: `Famille d'arme inconnue pour ${arme.nom} (${arme.categorie}).` };

  const lecture = lectureDuFacteurDArme(c.classe, famille, situation);
  if (lecture == null) {
    return {
      valeur: 0,
      termes,
      reserves,
      bloque: `Aucun facteur d'arme pour la famille ${famille}, ni dans propBalance.xml ni dans propJob.inc : l'attaque ordinaire de cette arme ne se calcule pas.`,
    };
  }
  const facteur = lecture.valeur;

  const ref = REFERENCE[famille];
  const lu = statPourEchelle(c, ref.stat);
  const stat = lu.valeur;
  if (!lu.plate) reserves.push(RESERVE_STATS_PLATES);
  const partStat = (stat - ref.seuil) * facteur;
  const partNiveau = c.niveau * ref.facteurNiveau;
  /* L'APPOINT D'ARC RESTE UNE CONSTANTE EMPRUNTÉE. propBalance.xml donne le
     coefficient de l'arc, pas ce 0,14 : la réserve sur les constantes du Flyff
     officiel n'est pas levée par la découverte de la table d'équilibrage. */
  const appoint = famille === "BOW" ? 0.14 * statPourEchelle(c, "force").valeur : 0;
  const codeFamille = CODE_DEGATS_FAMILLE[famille];
  const platFamille = codeFamille ? (c.bonus[codeFamille] ?? 0) : 0;

  const nomStat = { force: "Force", dexterite: "Dextérité", intelligence: "Intelligence" }[ref.stat];

  /* LES DEUX TABLES DANS LA MÊME LIGNE. Quand l'équilibrage et propJob.inc ne
     donnent pas le même chiffre, le terme écrit les deux et une réserve part
     avec le résultat : le choix est visible, jamais silencieux. */
  const divergence = lecture.autre && !lecture.accord ? lecture.autre : null;
  if (divergence) {
    reserves.push(
      `Facteur d'arme ${famille} : les deux tables du client ne s'accordent pas — ${lecture.table} donne ${fr(lecture.valeur)}, ${divergence.table} donne ${fr(divergence.valeur)}. Le calcul emploie l'équilibrage du serveur ; rien dans le client n'écrit lequel fait foi.`,
    );
  }

  termes.push({
    cle: "arme.stat",
    libelle: `(${nomStat} ${stat} − ${ref.seuil}) × ${fr(facteur)}`,
    valeur: partStat,
    unite: "points",
    source: `facteur ${fr(facteur)} : ${lecture.source} — seuil ${ref.seuil} : constante du Flyff officiel`,
    certitude: "flyff-officiel",
    note:
      `Le facteur ${fr(facteur)} est bien celui du client, mais le seuil de ${ref.seuil} points retiré à ${aLaStat(nomStat)} n'est écrit dans aucun fichier.` +
      (divergence ? ` Et les deux tables du client divergent : ${divergence.table} donne ${fr(divergence.valeur)} pour la même famille.` : "") +
      (lu.plate ? "" : " Et la valeur lue est le TOTAL : la forme du Flyff officiel prend ici un total SANS les pourcentages de statistique."),
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
const libelleAvecCode = (nomFr: string, code: string) => `${nomFr} (${code})`;

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
 * ET ICI, CONTRAIREMENT AU FACTEUR D'ARME, ON GARDE `propJob.inc`. `propBalance.xml`
 * donne une autre base — `AtkSpeed="250"` pour un Rôdeur — qui dépasse le plafond
 * de 187,5 employé juste en dessous. Or ce plafond est lui-même une constante du
 * Flyff officiel : si Airborn écrit 250, ou bien il a relevé le plafond et la
 * formule est fausse de bout en bout pour cette classe, ou bien le Rôdeur est
 * saturé en permanence. Le client ne tranche pas. On calcule donc avec la base de
 * propJob.inc, et le terme AFFICHE celle de l'équilibrage à côté — c'est la seule
 * façon de ne pas cacher un écart qu'on ne sait pas lire.
 *
 * CE QUE ÇA NE DONNE PAS : un nombre de coups par seconde. La grandeur obtenue
 * est un MULTIPLICATEUR ; la durée d'une animation d'attaque, qui seule permet
 * de passer à des coups par seconde, n'est dans aucun relevé. Le moteur affiche
 * donc la vitesse, et refuse de la convertir en dégâts par seconde.
 */
export function vitesseDAttaque(c: Combattant, arme: ArmeEquipee, situation: Situation = SITUATION_PAR_DEFAUT): Vitesse {
  const ligne = facteursDeClasse().get(c.classe);
  const baseClasse = typeof ligne?.colonne1 === "number" ? ligne.colonne1 : 75;
  const baseEquilibree = vitesseDeBaseEquilibree(c.classe, situation);
  const dex = statPourEchelle(c, "dexterite");
  const reserves: string[] = dex.plate ? [] : [RESERVE_STATS_PLATES];
  const echelle = 4 * dex.valeur + c.niveau / 8;
  const plafondBase = 200 - (200 * 0.125) / 2; // 187,5
  if (baseEquilibree != null && baseEquilibree !== baseClasse) {
    reserves.push(
      `Vitesse d'attaque : les deux tables du client donnent une base différente pour ${c.classe} — propJob.inc ${fr(baseClasse)}, propBalance.xml ${fr(baseEquilibree)}. Le calcul emploie propJob.inc, parce que le plafond de ${fr(plafondBase)} qui suit vient du Flyff officiel et non du client.`,
    );
  }
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
      note:
        baseEquilibree != null && baseEquilibree !== baseClasse
          ? `L'équilibrage du serveur (propBalance.xml, ${situation}) donne ${baseEquilibree.toString().replace(".", ",")} pour ce métier. Ce chiffre n'est PAS employé ici : le plafond de ${plafondBase.toString().replace(".", ",")} qui suit est une constante du Flyff officiel, et ${baseEquilibree > plafondBase ? "cette valeur le dépasse" : "on ne sait pas si Airborn l'a conservé"}. Les deux lectures sont affichées, aucune n'est cachée.`
          : undefined,
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
