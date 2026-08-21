// ════════════════════════════════════════════════════════════════════════════
//  L'ÉQUILIBRAGE DU SERVEUR — la couche que le dépôt n'avait jamais lue.
//
//  Jusqu'ici le moteur ne connaissait qu'une table de métier : `propJob.inc`,
//  dix-huit colonnes, quarante lignes. Il en tirait deux conclusions, écrites en
//  toutes lettres dans `armes.ts`, et LES DEUX ÉTAIENT FAUSSES POUR CE CLIENT :
//
//    « aucune colonne ne nomme l'arc, le coefficient vit donc dans l'exécutable »
//    « les sept colonnes d'arme portent la même valeur sur les quarante classes,
//      on ne les indexe donc pas par classe »
//
//  Le client porte une SECONDE table, jamais ouverte : `propBalance.xml`
//  (data-05.air), déclarée par `defineBalance.h` (data-00.air). Elle nomme l'arc
//  — `JOB_PROP_BOW 9` — et ses facteurs varient d'un métier à l'autre, jusqu'à
//  un facteur trois : `JOB_RANGER` Bow 11,8 contre `JOB_ACROBAT` Bow 4,0.
//
//  Le relevé complet est dans `public/wiki/balance.json`, produit par
//  `scripts/extraire-balance.mjs`. Ce module ne fait que le LIRE et arbitrer.
//
//  ════════ LAQUELLE DES DEUX TABLES FAIT FOI ════════
//
//  Ni l'une ni l'autre seule. Les deux, DANS CET ORDRE, attribut par attribut :
//
//    1. propBalance.xml, à la situation demandée (PvE contre un monstre, PvP
//       contre un joueur) ;
//    2. propJob.inc, quand la ligne d'équilibrage ne dit rien de cet attribut.
//
//  ET LE SECOND ÉTAGE N'EST PAS UN CONFORT, IL EST OBLIGATOIRE : une ligne
//  d'équilibrage ne nomme QUE les armes de son propre métier. `JOB_VAGRANT`
//  porte Sword et Axe, et rien d'autre — un Vagabond qui tient une baguette n'a
//  aucun facteur Wand dans propBalance. Deux armes nommées sur les neuf familles
//  déclarées : les sept autres retombent toujours sur propJob.inc.
//
//  Pourquoi propBalance d'abord, mesuré et non supposé (les comptes se relisent
//  dans `balance.json ▸ arbitrage`) :
//    · Neuz.exe porte `propBalance.xml`, `PropBalance`, `CProject::loadPropBalance`,
//      les dix-neuf noms d'attribut à la suite et le message d'erreur
//      « %s - SkillID not found [Job %d - PvP %d] » — le client lit ce fichier et
//      l'indexe par métier ET par drapeau PvP ;
//    · propJob ne varie pas d'une classe à l'autre sur ses colonnes d'arme (une
//      seule valeur distincte sur quarante lignes, sept fois) ; propBalance varie ;
//    · propBalance est propJob recopié puis retouché sur les métiers de départ ;
//    · le client embarque une fenêtre d'administration `APP_ADMIN_BALANCE`.
//
//  ET CE QUI N'EST PAS PROUVÉ, parce qu'un choix silencieux a déjà coûté cher
//  ici : rien, dans le client, n'ÉCRIT que l'équilibrage l'emporte. Le wiki
//  officiel (106 pages) ne porte aucune formule et ne peut rien arbitrer. Le
//  moteur CALCULE donc avec propBalance et PORTE L'AUTRE VALEUR à côté : chaque
//  lecture rend `autre`, et tout terme construit dessus écrit les deux chiffres.
//  Un écran qui n'en montre qu'un trahit ce module.
//
//  ════════ CE QUE L'ÉQUILIBRAGE DONNE ET QUE LE MOTEUR N'APPLIQUE PAS ════════
//
//  « propBalance fait foi » ne veut pas dire « on prend tout ». Deux attributs
//  restent lus dans `propJob.inc`, et la raison est MESURÉE, pas décrétée — les
//  comptes vivent dans `balance.json ▸ arbitrage.attributsNonAppliques` :
//
//  · LES POINTS DE VIE. Dans l'équilibrage, la promotion FAIT BAISSER le facteur
//    neuf fois sur huit lignées ; dans propJob.inc, jamais. La plupart de ces
//    baisses valent quelques pour cent — du réglage — mais UNE divise le facteur
//    du Chevalier par 6,3 en passant Maître (8,32 → 1,32). Une promotion ne
//    retire pas cinq sixièmes des points de vie : ces lignes ne se lisent pas
//    comme un facteur de PV max, et on ne les emploie pas comme tel.
//    (Ne pas réécrire ici le compte exact de chaque palier : il était donné pour
//    « huit baisses à deux pour cent », et c'était faux — la deuxième plus forte
//    en vaut quatorze. Le détail chiffré, lui, est relu à chaque extraction dans
//    `balance.json ▸ arbitrage.attributsNonAppliques.pointsDeVie.detail`.)
//
//  · LA VITESSE DE BASE. Six lignes portent `AtkSpeed="250"`, au-dessus du
//    plafond de 187,5 que la formule de vitesse impose — et ce plafond est
//    lui-même une constante du Flyff officiel, pas un chiffre du client. Ou bien
//    Airborn l'a relevé, et la formule est fausse de bout en bout pour ces
//    métiers ; ou bien ils sont saturés en permanence. Rien ne tranche, donc on
//    calcule avec propJob.inc et on AFFICHE les deux (voir `armes.ts`).
//
//  Ce qui passe : les neuf familles d'arme, le blocage et le critique — les
//  coefficients de combat, ceux que `defineBalance.h` numérote côte à côte.
//
//  ════════ CE QUE CE MODULE NE FAIT PAS ════════
//
//  IL N'APPLIQUE PAS LES FACTEURS DE COMPÉTENCE. `propBalance.xml` écrit
//  `<Skill ID="SI_VAG_ONE_CLEANHIT" Factor="2.0" />` — soixante-cinq fois, sur
//  vingt-et-un identifiants. Il n'écrit JAMAIS ce que ce facteur multiplie :
//  les dégâts de la compétence ? son coefficient de statistique ? sa durée ? Les
//  trois lectures donnent des nombres différents et rien ne les départage. Le
//  facteur est donc LU et RENDU, pour qu'un écran puisse le montrer, et n'entre
//  dans AUCUN produit. Un dégât faux est pire qu'un dégât absent.
// ════════════════════════════════════════════════════════════════════════════

import { equilibrage, type LigneDEquilibrage } from "./donnees";

/** Les deux situations de `defineBalance.h`. Elles ne se confondent pas : le jeu
 *  n'applique pas les mêmes chiffres contre un monstre et contre un joueur. */
export type Situation = "PVE_BALANCE" | "PVP_BALANCE";

/** La situation par défaut du site : /statistiques et /builder tapent des monstres. */
export const SITUATION_PAR_DEFAUT: Situation = "PVE_BALANCE";

/** Famille d'arme du moteur → nom d'attribut de `propBalance.xml`. */
const ATTRIBUT_DE_FAMILLE: Record<string, string> = {
  SWD: "Sword", AXE: "Axe", STAFF: "Staff", STICK: "Stick",
  KNUCKLE: "Knuckle", WAND: "Wand", YOYO: "Yoyo", BOW: "Bow",
};

/** Famille d'arme du moteur → colonne de `propJob.inc`. `null` : propJob l'ignore. */
const COLONNE_DE_FAMILLE: Record<string, string | null> = {
  SWD: "SWD", AXE: "AXE", STAFF: "STAFF", STICK: "STICK",
  KNUCKLE: "KNUCKLE", WAND: "WAND", YOYO: "YOYO", BOW: null,
};

export type TableDeFacteur = "propBalance.xml" | "propJob.inc";

/**
 * UNE LECTURE DE FACTEUR, ET LES DEUX TABLES AVEC.
 *
 * `valeur` est le chiffre employé dans le calcul. `autre` est ce que l'AUTRE
 * table dit du même facteur, quand elle en dit quelque chose. Les deux sont
 * rendus ensemble exprès : l'appelant n'a pas le droit d'oublier le second.
 */
export type LectureDeFacteur = {
  valeur: number;
  table: TableDeFacteur;
  /** La situation d'où vient la valeur. `null` quand elle vient de propJob.inc. */
  situation: Situation | null;
  /** Le métier dont la ligne a été lue — c'est ce qu'il faut citer, pas la classe demandée. */
  metier: string;
  autre: { table: TableDeFacteur; valeur: number } | null;
  /** Vrai quand les deux tables donnent le MÊME chiffre : il n'y a alors rien à arbitrer. */
  accord: boolean;
  source: string;
};

/** `VAGRANT` → `JOB_VAGRANT`, et l'inverse. */
const cleDeMetier = (classe: string) => (classe.startsWith("JOB_") ? classe : "JOB_" + classe);

function ligne(classe: string, situation: Situation): LigneDEquilibrage | null {
  return equilibrage(situation).get(cleDeMetier(classe)) ?? null;
}

/**
 * LE FACTEUR D'ARME, LES DEUX TABLES RENDUES ENSEMBLE.
 *
 * `null` seulement si NI l'équilibrage NI propJob.inc ne donnent de chiffre —
 * c'est-à-dire jamais, pour les huit familles que le site connaît. La fonction
 * garde la possibilité de refuser : c'est ce qui a permis de dire « l'arc ne se
 * calcule pas » pendant des mois, et il ne faut pas la retirer sous prétexte
 * qu'elle ne sert plus aujourd'hui.
 */
export function lireFacteurDArme(
  classe: string,
  famille: string,
  situation: Situation = SITUATION_PAR_DEFAUT,
  facteursDePropJob?: Record<string, unknown> | null,
): LectureDeFacteur | null {
  const attribut = ATTRIBUT_DE_FAMILLE[famille];
  const colonne = COLONNE_DE_FAMILLE[famille];
  const l = attribut ? ligne(classe, situation) : null;
  const deLEquilibrage = l && typeof l.attributs[attribut] === "number" ? l.attributs[attribut] : null;
  const brut = colonne ? facteursDePropJob?.[colonne] : undefined;
  const dePropJob = typeof brut === "number" ? brut : null;

  if (deLEquilibrage != null) {
    return {
      valeur: deLEquilibrage,
      table: "propBalance.xml",
      situation,
      metier: l!.id,
      autre: dePropJob != null ? { table: "propJob.inc", valeur: dePropJob } : null,
      accord: dePropJob != null && dePropJob === deLEquilibrage,
      source: `Client/data-05.air ▸ propBalance.xml, ${situation} ▸ ${l!.id}, attribut ${attribut}`,
    };
  }
  if (dePropJob != null) {
    return {
      valeur: dePropJob,
      table: "propJob.inc",
      situation: null,
      metier: cleDeMetier(classe),
      autre: null,
      accord: true,
      source: `Client/data-02.air ▸ propJob.inc, colonne ${colonne} — l'équilibrage ${situation} ne nomme pas cette arme pour ce métier`,
    };
  }
  return null;
}

/**
 * LA VITESSE DE BASE DU MÉTIER, VUE PAR L'ÉQUILIBRAGE.
 *
 * ELLE N'EST PAS EMPLOYÉE DANS LE CALCUL, et c'est délibéré. La formule de
 * vitesse d'attaque du Flyff officiel plafonne la base à 187,5 avant de la faire
 * entrer dans `25 / (200 − base)`. `propBalance.xml` donne `AtkSpeed="250"` à un
 * Rôdeur : au-dessus du plafond. Deux lectures restent alors ouvertes — soit
 * Airborn a relevé le plafond, et notre formule est fausse de bout en bout pour
 * cette classe ; soit le Rôdeur est saturé en permanence. Le client ne le dit
 * pas, et le plafond lui-même est une constante du Flyff officiel, pas un chiffre
 * du client. On garde donc la base de `propJob.inc` dans le calcul, et on REND
 * celle de l'équilibrage pour que le terme l'affiche à côté.
 */
export function vitesseDeBaseEquilibree(classe: string, situation: Situation = SITUATION_PAR_DEFAUT): number | null {
  const l = ligne(classe, situation);
  const v = l?.attributs.AtkSpeed;
  return typeof v === "number" ? v : null;
}

/** Le facteur de blocage ou de critique de l'équilibrage, quand la ligne le porte. */
export function proprieteEquilibree(classe: string, attribut: "Block" | "Critical" | "Def", situation: Situation = SITUATION_PAR_DEFAUT): number | null {
  const v = ligne(classe, situation)?.attributs[attribut];
  return typeof v === "number" ? v : null;
}

export type FacteurDeCompetence = {
  id: string;
  facteur: number;
  metier: string;
  situation: Situation;
  /** Ce que le facteur multiplie. Le client ne l'écrit nulle part. */
  operande: null;
  source: string;
};

/**
 * LE FACTEUR D'UNE COMPÉTENCE POUR UN MÉTIER — LU, JAMAIS APPLIQUÉ.
 *
 * Rendu pour qu'un écran puisse l'afficher tel quel, avec `operande: null` qui
 * dit franchement qu'on ne sait pas ce qu'il multiplie.
 */
export function facteurDeCompetence(
  classe: string,
  idCompetence: string,
  situation: Situation = SITUATION_PAR_DEFAUT,
): FacteurDeCompetence | null {
  const l = ligne(classe, situation);
  const c = l?.competences.find((x) => x.id === idCompetence);
  if (!l || !c) return null;
  return {
    id: c.id,
    facteur: c.facteur,
    metier: l.id,
    situation,
    operande: null,
    source: `Client/data-05.air ▸ propBalance.xml, ${situation} ▸ ${l.id} ▸ <Skill ID="${c.id}" Factor="${c.facteur}" />`,
  };
}

/** Tous les facteurs de compétence d'une situation, pour un écran de relevé. */
export function facteursDeCompetence(situation: Situation = SITUATION_PAR_DEFAUT): FacteurDeCompetence[] {
  const out: FacteurDeCompetence[] = [];
  for (const l of equilibrage(situation).values()) {
    for (const c of l.competences) {
      out.push({
        id: c.id,
        facteur: c.facteur,
        metier: l.id,
        situation,
        operande: null,
        source: `Client/data-05.air ▸ propBalance.xml, ${situation} ▸ ${l.id}`,
      });
    }
  }
  return out;
}

/**
 * LES FAMILLES QUI N'ONT DE FACTEUR NULLE PART — CALCULÉ, PAS ÉCRIT.
 *
 * Remplace la liste en dur `SANS_FACTEUR = ["BOW"]`, qui était une conclusion
 * tirée d'une seule table. La mesure porte sur les DEUX : une famille n'est sans
 * facteur que si aucun métier ne lui en donne un, ni dans l'équilibrage, ni dans
 * propJob.inc.
 */
export function famillesSansFacteur(lignesDePropJob: Iterable<Record<string, unknown>>): string[] {
  const trouvees = new Set<string>();
  for (const situation of ["PVE_BALANCE", "PVP_BALANCE"] as Situation[]) {
    for (const l of equilibrage(situation).values()) {
      for (const [famille, attribut] of Object.entries(ATTRIBUT_DE_FAMILLE)) {
        if (typeof l.attributs[attribut] === "number") trouvees.add(famille);
      }
    }
  }
  for (const ligneJob of lignesDePropJob) {
    for (const [famille, colonne] of Object.entries(COLONNE_DE_FAMILLE)) {
      if (colonne && typeof ligneJob[colonne] === "number") trouvees.add(famille);
    }
  }
  return Object.keys(ATTRIBUT_DE_FAMILLE).filter((f) => !trouvees.has(f));
}
