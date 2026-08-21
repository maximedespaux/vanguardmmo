import {
  ATTRIBUTS, CODE_ATTRIBUT, ATTRIBUTS_POURCENT, ETEND, ALIAS_LIBELLE, CODES_RECOMPENSE,
  classer, couplesAbsoluPourcent,
  type Attribut, type Classement,
} from "./vocabulaire";
import { codeDe, libelleDe, type BonusBrut, type ObjetClient, type Tables } from "./tables";

/**
 * LE MOTEUR — les statistiques finales d'un personnage, terme par terme.
 *
 * Rien n'est calculé « en gros » : chaque nombre du résultat est une LIGNE
 * (`Terme`) qui dit d'où il vient, quel fichier l'écrit, et s'il est absolu ou
 * en pourcentage. Un total sans ses lignes n'est pas vérifiable, donc il n'existe
 * pas ici.
 *
 * ════════ L'ORDRE DES TERMES, ET IL COMPTE ════════
 *  1. LE SOCLE            classe, niveau, points attribués.
 *  2. BONUS DE PIÈCE      objets-stats.json, par la clé du client. Six paires au plus.
 *                         Le perçage, l'éveil et le scroll s'y rattachent : ce sont
 *                         des bonus PORTÉS PAR LA PIÈCE.
 *  3. PALIERS D'ACCESSOIRE paliers.json → bijoux[id].rangs[palier]. LA VALEUR DU
 *                         PALIER REMPLACE, elle ne s'ajoute pas.
 *  4. PANOPLIES           bonus-sources.json → panoplies, par NOMBRE DE PIÈCES.
 *                         Le costume compte ici aussi : son bonus est porté par le SET.
 *  5. SERTISSAGE          jusqu'à huit logements sur une arme Artefact +20.
 *                         L'ordre des neuf statistiques est celui de GEMU.
 *  6. RARETÉ              deux mécaniques distinctes : la maîtrise d'arme (une valeur
 *                         par rareté, déterministe) et les lignes aléatoires (un
 *                         intervalle, jamais un nombre).
 *  7. CARNETS DE CARTES   data.json → CARNETS.
 *
 * ════════ POURCENTAGES ET ABSOLUS NE SE MÉLANGENT PAS ════════
 * Deux sacs, jamais un seul. On somme les absolus, PUIS on applique les
 * pourcentages, et chaque pourcentage dit à quoi il s'applique (`appliqueA`).
 * Quand le client ne le dit pas — les quatre attributs en pourcentage — le moteur
 * rend LES DEUX lectures et n'en choisit aucune.
 *
 * ════════ CE QUE LE MOTEUR REFUSE DE CALCULER ════════
 * LE GAIN PAR PALIER D'AMÉLIORATION D'UNE ARME OU D'UNE ARMURE. propEnchant.inc
 * ne livre que deux rangées de coefficients (NORMAL_SCAL, ALL_SCAL, dix colonnes
 * L1…L10) et AUCUN fichier ne dit ce qu'elles multiplient. Un calculateur du Flyff
 * officiel a besoin, par niveau, d'un multiplicateur PAR TYPE DE PIÈCE — attaque
 * d'arme, défense de casque, de tenue, de gants, de bottes — plus les bonus de set
 * du palier. Cinq colonnes et une liste que le relevé n'a pas. Le +N est donc
 * AFFICHÉ et ANNONCÉ NON COMPTÉ (`trous`), jamais estimé.
 * Règle posée par Maxime : « un dégât faux est pire qu'un dégât absent ».
 */

export type Rarete = "NONE" | "RARE" | "EPIC" | "LEGENDARY" | "PREMYTHIC" | "MYTHIC";

export type Emplacement =
  | "weapon" | "weapon2" | "shield" | "mantra" | "cape" | "masque"
  | "helmet" | "suit" | "gauntlet" | "boots"
  | "ring1" | "ring2" | "earring1" | "earring2" | "necklace"
  | "fhead" | "ftop" | "fhand" | "ffoot";

/** Une gemme posée dans un logement d'arme : la statistique visée, et la gemme employée. */
export type GemmePosee = { stat: string; gemme?: string };

export type PieceEquipee = {
  /**
   * Identifiant du client (defineitem.h). Prioritaire sur `cle`. Un NOMBRE partout,
   * sauf pour les vingt-quatre pièces de costume, que le catalogue du builder
   * identifie par un texte (« itm_mSeakingLook01_Cap-32.dds#HP »).
   */
  id?: number | string;
  /** Clé symbolique II_* quand l'identifiant est inconnu. */
  cle?: string;
  /** Palier d'amélioration saisi. Compté sur un BIJOU seulement — voir `trous`. */
  palier?: number;
  /** Cartes de perçage posées : identifiant numérique ou clé II_*. */
  percage?: (number | string)[];
  /** Rareté de l'arme. */
  rarete?: Rarete;
  /** Sertissage : les gemmes des logements (cinq au plus). */
  gemmes?: GemmePosee[];
  /** Diamants holographiques (arme Artefact, trois au plus) : le libellé de la statistique. */
  holographiques?: string[];
  /** Gemmes de costume (quatre par pièce) : le libellé de la statistique. */
  gemmesCostume?: string[];
  /** Éveil : une statistique et sa valeur. Le plafond est vérifié. */
  eveil?: { stat: string; valeur: number }[];
  /** Scroll de statistique : +1 à +4 sur un attribut. */
  scroll?: { stat: string; valeur: number };
};

export type Personnage = {
  nom?: string;
  /** Nom français de la classe (« Templier ») ou code du client (« LORDTEMPLER_HERO »). */
  classe: string;
  sexe?: "G" | "F";
  niveau: number;
  /** Points dépensés au-dessus des 15 de base. Absent = tout à 15. */
  attributs?: Partial<Record<Attribut, number>>;
  equipement: Partial<Record<Emplacement, PieceEquipee>>;
  /** Carnets de cartes : leur rang dans CARNETS, et s'ils sont complets. */
  carnets?: { rang: number; complet?: boolean }[];
};

export type Terme = {
  /** 1 à 7 — l'ordre de l'en-tête. */
  ordre: number;
  terme: string;
  /** Code DST_ quand il est connu. */
  code: string | null;
  /** Libellé français, ou `null` : la ligne est alors BRUTE et signalée. */
  libelle: string | null;
  valeur: number;
  nature: Classement["nature"];
  /** Ce que le pourcentage multiplie. `null` = le client ne le dit pas. */
  appliqueA: string | null;
  moment: Classement["moment"];
  /** Une valeur positive RÉDUIT la grandeur visée : un total plus haut est un GAIN. */
  sens?: "reduction";
  /** D'où vient cette ligne, côté personnage. */
  origine: string;
  /** Le fichier et le champ qui l'écrivent. */
  source: string;
  /** Vrai quand aucun libellé n'existe : la ligne reste lisible mais non traduite. */
  brut?: true;
  /** Une décision de lecture, pas une donnée. Le compte rendu la reprend. */
  hypothese?: string;
  /** Le libellé du relevé contredit ce que le code fait. */
  avertissement?: string;
  /**
   * La ligne a été RÉPARTIE sur plusieurs statistiques filles : elle est gardée
   * pour être lue, mais la sommer AVEC ses filles compterait deux fois.
   * « Toutes les statistiques +30 » vaut 30 sur chacun des quatre attributs, pas 150.
   */
  repartie?: string[];
  /** La ligne est une fille d'une ligne répartie. */
  filleDe?: string;
  /**
   * Le libellé n'existait pas au dictionnaire et a été rapproché d'un code par
   * un ALIAS PROUVÉ (voir `vocabulaire.ts` ▸ ALIAS_LIBELLE). La preuve voyage
   * avec la ligne : un rapprochement doit rester contestable.
   */
  alias?: string;
  /**
   * Butin, expérience, penyas : la règle de la maison les interdit À L'ÉCRAN.
   * Elles restent DANS le résultat — amputer la donnée serait pire — mais le
   * drapeau permet à une page de les écarter mécaniquement, sans se souvenir
   * d'une liste de codes.
   */
  recompense?: true;
};

export type Cumul = {
  code: string | null;
  libelle: string | null;
  valeur: number;
  nature: Classement["nature"];
  appliqueA: string | null;
  moment: Classement["moment"];
  termes: Terme[];
  /**
   * Ce cumul est DÉJÀ compté dans ses statistiques filles : le lire pour
   * l'afficher, jamais pour l'additionner. Sans ce drapeau, « Toutes les
   * statistiques +30 » se retrouve dans le total en plus des quatre attributs.
   */
  nePasSommer?: true;
  /** Butin, expérience, penyas — à écarter à l'affichage. Voir `Terme.recompense`. */
  recompense?: true;
};

export type Resultat = {
  personnage: {
    nom: string; classe: string; classeClient: string | null; sexe: "G" | "F"; niveau: number;
  };
  socle: {
    /** 15 par attribut au départ, comme le jeu. */
    depart: number;
    alloues: Record<Attribut, number>;
    /** Budget total de points : niveau × 2 − 2. */
    budget: number;
    depenses: number;
    restants: number;
    facteurs: Record<string, number | string> | null;
    source: string;
    reserve: string;
  };
  attributs: Record<Attribut, {
    depart: number; alloue: number; absolus: number;
    /** Somme sans aucun pourcentage : c'est la valeur employée par les formules dérivées. */
    total: number;
    pourcent: number;
    /** Les deux lectures du pourcentage d'attribut, quand il y en a un. */
    lectures: { surAlloueSeul: number; surAlloueEtAbsolus: number } | null;
  }>;
  absolus: Cumul[];
  pourcentages: Cumul[];
  termes: Terme[];
  derivees: Derivee[];
  /** Les intervalles : ce qui est aléatoire ne devient pas un nombre. */
  intervalles: Intervalle[];
  /** Ce qui n'est pas calculé, et pourquoi. */
  trous: string[];
  /** Les décisions de lecture, listées pour être contestées. */
  hypotheses: string[];
  /** Les codes sans libellé rencontrés — la ligne est comptée, pas traduite. */
  bruts: string[];
  /** Les libellés français rencontrés qu'aucun code DST_ ne réclame — classés au signe %. */
  sansCode: string[];
  /** Les libellés du relevé qui contredisent le code. */
  avertissements: string[];
  /** Les couples (absolu, pourcentage) du dictionnaire : où la confusion est possible. */
  couples: { absolu: string; pourcentage: string }[];
  sources: Record<string, string>;
};

export type Derivee = {
  nom: string;
  valeur: number | null;
  /** Le calcul écrit terme par terme, avec les nombres employés. */
  detail: string;
  source: string;
  reserve?: string;
};

export type Intervalle = {
  nom: string;
  min: number;
  max: number;
  lignes: number;
  detail: string;
  source: string;
};

/** Les correspondances classe française → code du client, prises dans les données de classes. */
const CLASSE_CLIENT: Record<string, string> = {
  Templier: "LORDTEMPLER_HERO",
  Spadassin: "STORMBLADE_HERO",
  Sylphide: "WINDLURKER_HERO",
  Arbaletrier: "CRACKSHOOTER_HERO",
  Primat: "FLORIST_HERO",
  Chanoine: "FORCEMASTER_HERO",
  Envouteur: "MENTALIST_HERO",
  Arcaniste: "ELEMENTORLORD_HERO",
};

/** La clé de signature de panoplie du builder emploie « spada », pas « spadassin ». */
const CLASSE_SIGNATURE: Record<string, string> = {
  Templier: "templier", Spadassin: "spada", Sylphide: "sylphide", Arbaletrier: "arbaletrier",
  Primat: "primat", Chanoine: "chanoine", Envouteur: "envouteur", Arcaniste: "arcaniste",
};

const EMPLACEMENTS_ARMURE: Emplacement[] = ["helmet", "suit", "gauntlet", "boots"];
const EMPLACEMENTS_MODE: Emplacement[] = ["fhead", "ftop", "fhand", "ffoot"];
const EMPLACEMENTS_BIJOU: Emplacement[] = ["ring1", "ring2", "earring1", "earring2", "necklace"];

const sansAccent = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function calculer(personnage: Personnage, tables: Tables): Resultat {
  const termes: Terme[] = [];
  const trous: string[] = [];
  const hypotheses = new Set<string>();
  const bruts = new Set<string>();
  const sansCode = new Set<string>();
  const avertissements = new Set<string>();
  const intervalles: Intervalle[] = [];

  const classeClient = resoudreClasse(personnage.classe, tables);
  const facteurs = classeClient ? tables.facteurs.get(classeClient) ?? null : null;
  const sexe = personnage.sexe ?? "G";
  const niveau = Math.max(1, Math.min(200, Math.round(personnage.niveau || 1)));

  /** Ajoute une ligne au journal, en la classant. Le seul point d'entrée. */
  const poser = (
    ordre: number, terme: string, cleOuCode: string, valeur: number,
    origine: string, source: string, extra?: Partial<Terme>,
  ) => {
    if (!valeur) return;
    const estCode = /^DST_/.test(cleOuCode);
    // UN LIBELLÉ QUE LE DICTIONNAIRE IGNORE PEUT ÊTRE RAPPROCHÉ D'UN CODE, mais
    // seulement si la preuve est écrite dans ALIAS_LIBELLE. Sans ça, « Dégâts
    // critiques % » (costume) formait un second cumul à côté de « Dégâts
    // critiques » (DST_CRITICAL_BONUS) : deux lignes pour une statistique.
    const alias = estCode ? undefined : ALIAS_LIBELLE[cleOuCode];
    const code = estCode ? cleOuCode : (codeDe(tables, cleOuCode) ?? alias?.code ?? null);
    const libelle = code ? libelleDe(tables, code) : (estCode ? null : cleOuCode);

    // UN LIBELLÉ SANS CODE RESTE CLASSÉ. « Dégâts critiques % » est écrit par le
    // relevé de costume et n'existe pas au dictionnaire : sans cette ligne, il
    // tomberait dans le sac des absolus et se ferait additionner à des valeurs
    // brutes. Le signe % du libellé suffit à le ranger du bon côté.
    const cl: Classement = code
      ? classer(code)
      : /%\s*$/.test(cleOuCode)
        ? { nature: "pourcentage", origine: "libelle", appliqueA: null, moment: "degats" }
        : { nature: "absolu", origine: "defaut", appliqueA: null, moment: "fiche" };

    const ligne: Terme = {
      ordre, terme, code, libelle, valeur,
      nature: cl.nature, appliqueA: cl.appliqueA, moment: cl.moment,
      ...(cl.sens ? { sens: cl.sens } : {}),
      origine, source, ...extra,
    };
    if (!libelle) {
      ligne.brut = true;
      bruts.add(code ?? cleOuCode);
    }
    if (alias && code === alias.code) {
      ligne.alias = `« ${cleOuCode} » rapproché de ${alias.code}. ${alias.preuve}`;
      hypotheses.add(ligne.alias);
    }
    if (code && CODES_RECOMPENSE.has(code)) ligne.recompense = true;
    if (!code) sansCode.add(`${cleOuCode} → classé ${cl.nature} par ${cl.origine}`);
    if (code && "libelleDouteux" in cl && cl.libelleDouteux) {
      ligne.avertissement = cl.libelleDouteux;
      avertissements.add(`${code} — ${cl.libelleDouteux}`);
    }
    if (ligne.hypothese) hypotheses.add(ligne.hypothese);
    termes.push(ligne);

    // Un code qui se répand : DST_STAT_ALLUP nourrit les quatre attributs. On
    // garde la ligne d'origine POUR LA LIRE, et on pose les quatre filles pour
    // que les totaux soient justes.
    const filles = code ? ETEND[code] : undefined;
    if (filles) {
      ligne.repartie = filles;
      for (const fille of filles) {
        const clf = classer(fille);
        termes.push({
          ordre, terme, code: fille, libelle: libelleDe(tables, fille), valeur,
          nature: clf.nature, appliqueA: clf.appliqueA, moment: clf.moment,
          origine: `${origine} → ${libelle ?? code}`,
          source: `${source} · réparti sur ${filles.length} statistiques`,
          filleDe: code ?? undefined,
        });
      }
    }
  };

  // ════════ 1. LE SOCLE ════════
  const alloues = {} as Record<Attribut, number>;
  let depenses = 0;
  for (const a of ATTRIBUTS) {
    const v = Math.max(0, Math.round(personnage.attributs?.[a] ?? 0));
    alloues[a] = v;
    depenses += v;
  }
  const budget = niveau * 2 - 2;

  // ════════ 2. LES BONUS DE PIÈCE ════════
  const equipees: { emplacement: Emplacement; piece: PieceEquipee; objet: ReturnType<typeof trouverObjet> }[] = [];
  for (const [emplacement, piece] of Object.entries(personnage.equipement ?? {}) as [Emplacement, PieceEquipee][]) {
    if (!piece) continue;
    const objet = trouverObjet(piece, tables);
    equipees.push({ emplacement, piece, objet });
    const nom = objet?.n ?? piece.cle ?? String(piece.id ?? "?");
    const ou = `${nom} (${emplacement})`;

    if (!objet) {
      trous.push(`${ou} : l'objet n'est ni dans objets-stats.json ni dans le catalogue du builder — aucun bonus propre compté.`);
    } else {
      for (const [code, valeur] of objet.b ?? []) {
        poser(2, "Bonus de pièce", code, valeur, ou,
          "public/wiki/objets-stats.json ▸ objets[].b (Spec_Item.txt)");
      }
    }

    // Le perçage — des cartes posées dans la pièce.
    for (const carte of piece.percage ?? []) {
      const c = typeof carte === "number" ? tables.cartesParId.get(carte) : tables.cartesParCle.get(carte);
      if (!c) {
        trous.push(`${ou} : carte de perçage « ${carte} » inconnue du relevé — non comptée.`);
        continue;
      }
      for (const [code, valeur] of c.b) {
        poser(2, "Perçage", code, valeur, `${ou} · ${c.n}`,
          "public/wiki/bonus-sources.json ▸ percage.cartes (propItemEtc.inc)");
      }
    }

    // L'éveil — le client donne le PLAFOND, pas la valeur : celle-ci est saisie.
    for (const e of piece.eveil ?? []) {
      const code = codeDe(tables, e.stat);
      const plafond = code ? tables.plafondEveil.general[code] : undefined;
      if (plafond != null && e.valeur > plafond) {
        trous.push(`${ou} : éveil « ${e.stat} » saisi à ${e.valeur}, au-dessus du plafond ${plafond} du client — ramené au plafond.`);
      }
      const valeur = plafond != null ? Math.min(e.valeur, plafond) : e.valeur;
      poser(2, "Éveil", code ?? e.stat, valeur, ou,
        "public/wiki/bonus-sources.json ▸ eveil.general (maxawakes.json) — plafond du client, valeur saisie");
    }

    // Le scroll de statistique : +1 à +4, un attribut.
    if (piece.scroll) {
      poser(2, "Scroll de statistique", codeDe(tables, piece.scroll.stat) ?? piece.scroll.stat,
        piece.scroll.valeur, ou,
        "public/airbuilder/data.json ▸ MECH.arme.scrolls_stat (« +1 à +4 »)");
    }

    // ════════ 3. LES PALIERS D'ACCESSOIRE ════════
    const palier = Math.max(0, Math.round(piece.palier ?? 0));
    if (palier > 0) {
      const table = objet ? tables.paliers.get(objet.i) : undefined;
      const estBijou = EMPLACEMENTS_BIJOU.includes(emplacement);
      if (estBijou && table) {
        const plafond = table.plafond ?? 0;
        if (palier > plafond) {
          trous.push(`${ou} : palier +${palier} demandé, plafond +${plafond} dans le client — le calcul s'arrête au plafond.`);
        }
        const rang = Math.min(palier, plafond);
        const lignes = table.rangs?.[rang] ?? [];
        if (!lignes.length) {
          trous.push(`${ou} : le client n'écrit rien au palier +${rang} — la base de l'objet s'applique seule, ce n'est pas une erreur.`);
        }
        for (const [libelle, valeur] of lignes) {
          poser(3, "Palier d'accessoire", libelle, valeur, `${ou} +${rang}`,
            `public/airbuilder/paliers.json ▸ bijoux[${objet?.i}].rangs[${rang}] (accessory.inc) — REMPLACEMENT : seul le palier ${rang} compte, les précédents ne s'additionnent pas`);
        }
      } else if (!estBijou) {
        trous.push(
          `${ou} +${palier} : LE GAIN PAR PALIER NE SE CALCULE PAS. propEnchant.inc ne donne que des coefficients (NORMAL_SCAL, ALL_SCAL sur L1…L10) et aucun fichier ne dit ce qu'ils multiplient. Le +${palier} est affiché, pas compté.`,
        );
      } else {
        trous.push(`${ou} +${palier} : aucun tableau de paliers pour cet objet dans paliers.json — le +${palier} n'est pas compté.`);
      }
    }
  }

  // ════════ 4. LES PANOPLIES ════════
  panoplieArmure(equipees, tables, poser, trous);
  panoplieCostume(personnage, equipees, tables, poser, trous, hypotheses);

  // ════════ 5. LE SERTISSAGE ════════
  sertir(equipees, tables, poser, trous, hypotheses);

  // ════════ 6. LA RARETÉ ════════
  rarete(equipees, tables, poser, trous, intervalles);

  // ════════ 7. LES CARNETS DE CARTES ════════
  for (const c of personnage.carnets ?? []) {
    const carnet = tables.carnets[c.rang];
    if (!carnet) {
      trous.push(`Carnet nº ${c.rang} inconnu du relevé — non compté.`);
      continue;
    }
    const lignes = c.complet ? carnet.complet : carnet.base;
    for (const [libelle, valeur] of lignes) {
      poser(7, "Carnet de cartes", libelle, valeur, `${carnet.nom}${c.complet ? " (complet)" : ""}`,
        "public/airbuilder/data.json ▸ CARNETS[].base / .complet");
    }
  }

  // ════════ AGRÉGATION — DEUX SACS, JAMAIS UN SEUL ════════
  const sacAbsolus = new Map<string, Cumul>();
  const sacPourcents = new Map<string, Cumul>();
  for (const t of termes) {
    const cle = t.code ?? `?${t.libelle ?? "inconnu"}`;
    const sac = t.nature === "absolu" ? sacAbsolus : sacPourcents;
    const c = sac.get(cle);
    if (c) { c.valeur += t.valeur; c.termes.push(t); }
    else sac.set(cle, {
      code: t.code, libelle: t.libelle, valeur: t.valeur,
      nature: t.nature, appliqueA: t.appliqueA, moment: t.moment, termes: [t],
    });
  }
  for (const sac of [sacAbsolus, sacPourcents]) {
    for (const c of sac.values()) {
      if (c.termes.every((t) => t.repartie)) c.nePasSommer = true;
      if (c.termes.some((t) => t.recompense)) c.recompense = true;
    }
  }
  // UNE RÉDUCTION AU-DESSUS DE CENT POUR CENT EST IMPOSSIBLE, donc c'est le sens
  // de la flèche qui est faux. Le moteur le dit au lieu de rendre un temps
  // d'incantation négatif.
  for (const c of sacPourcents.values()) {
    if (c.termes.some((t) => t.sens === "reduction") && c.valeur > 100) {
      trous.push(
        `« ${c.libelle ?? c.code} » cumule ${c.valeur} % en RÉDUCTION, ce qui est impossible : au-delà de 100 % la grandeur passerait sous zéro. Le sens de cette statistique est donc mal noté dans le relevé — voir les avertissements. Le moteur n'applique aucune réduction à partir de ce total.`,
      );
    }
  }

  const absoluDe = (code: string) => sacAbsolus.get(code)?.valeur ?? 0;
  const pourcentDe = (code: string) => sacPourcents.get(code)?.valeur ?? 0;

  const attributs = {} as Resultat["attributs"];
  for (const a of ATTRIBUTS) {
    const code = CODE_ATTRIBUT[a];
    const abs = absoluDe(code);
    const total = 15 + alloues[a] + abs;
    const codePourcent = Object.keys(ATTRIBUTS_POURCENT).find((k) => ATTRIBUTS_POURCENT[k] === a) ?? "";
    const pourcent = codePourcent ? pourcentDe(codePourcent) : 0;
    attributs[a] = {
      depart: 15, alloue: alloues[a], absolus: abs, total, pourcent,
      lectures: pourcent
        ? {
          surAlloueSeul: Math.floor(total + (15 + alloues[a]) * pourcent / 100),
          surAlloueEtAbsolus: Math.floor(total * (1 + pourcent / 100)),
        }
        : null,
    };
    if (pourcent) {
      hypotheses.add(
        `${a} +${pourcent} % : AUCUN fichier du client ne dit sur quoi ce pourcentage porte. Deux lectures possibles — sur l'attribut alloué seul (${attributs[a].lectures?.surAlloueSeul}) ou sur l'attribut alloué PLUS les bonus absolus (${attributs[a].lectures?.surAlloueEtAbsolus}). Le moteur rend les deux et ne tranche pas. Les grandeurs dérivées ci-dessous emploient le total SANS pourcentage (${total}).`,
      );
    }
  }

  const arme = equipees.find((e) => e.emplacement === "weapon");
  // LA DÉFENSE PROPRE DES PIÈCES D'ARMURE. Elle est écrite dans le relevé
  // (objets-stats.json ▸ dn / dx sur un objet dont `t1` vaut ARMOR) et c'est le
  // terme DOMINANT de la défense d'un personnage équipé : sans elle, un Templier
  // en Shaïtan complet sort à un tiers de sa vraie défense. Voir `deriver`.
  const armures = equipees
    .filter((e) => e.emplacement !== "weapon" && e.objet && e.objet.t1 === "ARMOR")
    .map((e) => ({
      nom: e.objet?.n ?? e.emplacement,
      min: typeof e.objet?.dn === "number" ? e.objet.dn : 0,
      max: typeof e.objet?.dx === "number" ? e.objet.dx : 0,
      palier: Math.max(0, Math.round(e.piece.palier ?? 0)),
    }));
  const derivees = deriver({
    niveau, facteurs, equilibrage: classeClient ? tables.equilibrage.get("JOB_" + classeClient) ?? null : null,
    attributs, absoluDe, pourcentDe,
    arme: arme?.objet ?? null,
    armures,
  });

  return {
    personnage: {
      nom: personnage.nom ?? "sans nom",
      classe: personnage.classe, classeClient, sexe, niveau,
    },
    socle: {
      depart: 15, alloues, budget, depenses, restants: budget - depenses,
      facteurs: facteurs ? { ...facteurs } as Record<string, number | string> : null,
      source: "public/wiki/bonus-sources.json ▸ facteursDeClasse (propJob.inc) · public/wiki/balance.json ▸ PVE_BALANCE (propBalance.xml) pour les facteurs d'arme, de blocage et de critique · src/data/classes.ts pour le nom français",
      reserve:
        "Les 15 de départ par attribut et le budget « niveau × 2 − 2 » ne sont écrits dans AUCUN fichier du client que nous détenons : ce sont les valeurs du Flyff officiel. Un budget différent sur Airborn décalerait tous les attributs.",
    },
    attributs,
    absolus: [...sacAbsolus.values()].sort((a, b) => (a.libelle ?? "").localeCompare(b.libelle ?? "")),
    pourcentages: [...sacPourcents.values()].sort((a, b) => (a.libelle ?? "").localeCompare(b.libelle ?? "")),
    termes,
    derivees,
    intervalles,
    trous,
    hypotheses: [...hypotheses],
    bruts: [...bruts],
    sansCode: [...sansCode],
    avertissements: [...avertissements],
    couples: couplesAbsoluPourcent(tables.dictionnaire.keys()),
    sources: tables.sources,
  };
}

type Poser = (
  ordre: number, terme: string, cleOuCode: string, valeur: number,
  origine: string, source: string, extra?: Partial<Terme>,
) => void;

function resoudreClasse(classe: string, tables: Tables): string | null {
  if (tables.facteurs.has(classe)) return classe;
  const direct = CLASSE_CLIENT[classe];
  if (direct && tables.facteurs.has(direct)) return direct;
  const cible = sansAccent(classe);
  for (const [fr, code] of Object.entries(CLASSE_CLIENT)) {
    if (sansAccent(fr) === cible) return tables.facteurs.has(code) ? code : null;
  }
  return null;
}

function trouverObjet(piece: PieceEquipee, tables: Tables) {
  if (typeof piece.id === "number") {
    const o = tables.objetParId.get(piece.id);
    if (o) return o;
  }
  if (piece.cle) {
    const o = tables.objetParCle.get(piece.cle);
    if (o) return o;
  }
  // Repli sur le catalogue du builder : il porte un nom et des bonus déjà en
  // français, ce qui vaut mieux que rien quand le relevé du client ignore l'objet
  // — c'est le cas des vingt-quatre pièces de costume, absentes de Spec_Item.txt.
  if (piece.id != null) {
    const c = tables.catalogue.get(String(piece.id));
    if (c) {
      const repli: ObjetClient = {
        i: typeof c.id === "number" ? c.id : -1, cle: "", n: c.n,
        // Le catalogue du builder ne porte pas `t1`. On l'écrit à COSTUME parce
        // que les seules pièces qui passent par ce repli sont les vingt-quatre
        // pièces de mode, absentes de Spec_Item.txt. Le laisser vide ferait
        // passer une pièce de mode pour une armure au moment de la défense.
        t1: "COSTUME",
        b: [] as BonusBrut[],
      };
      return repli;
    }
  }
  return null;
}

/**
 * LES PANOPLIES D'ARMURE — par NOMBRE DE PIÈCES PORTÉES.
 *
 * Trois pièces et quatre pièces ne donnent pas la même chose : chaque ligne du
 * client porte son propre seuil (`pieces`). Les seuils atteints s'appliquent, les
 * autres non.
 *
 * LA SOURCE EST bonus-sources.json ▸ panoplies, PAS data.json ▸ PANO. Les deux
 * décrivent les mêmes ensembles — la concordance du relevé retrouve les 16
 * signatures comparées dans les SetItem du client — et les additionner
 * compterait chaque bonus deux fois. On prend celle qui est en codes DST_ et
 * indexée par pièce ; PANO ne sert que de nom et de contre-épreuve.
 *
 * DES LIGNES SONT NÉGATIVES, et c'est le point le plus utile de tout le lot :
 * les panoplies Shaïtan portent DST_PVP_DMG_RATE = −200 et les Dryades
 * DST_PVP_DMG = −300 sur QUATRE pièces. Porter l'ensemble complet COÛTE des
 * dégâts JcJ. Le total doit les montrer.
 */
function panoplieArmure(
  equipees: { emplacement: Emplacement; piece: PieceEquipee; objet: ReturnType<typeof trouverObjet> }[],
  tables: Tables, poser: Poser, trous: string[],
) {
  const portees = new Set<number>();
  for (const e of equipees) {
    if (!EMPLACEMENTS_ARMURE.includes(e.emplacement)) continue;
    if (e.objet) portees.add(e.objet.i);
  }
  if (!portees.size) return;

  const candidats = new Set<number>();
  for (const id of portees) for (const rang of tables.panoplieDePiece.get(id) ?? []) candidats.add(rang);

  for (const rang of candidats) {
    const p = tables.panoplies[rang];
    if (!p) continue;
    const compte = p.pieces.filter((x) => typeof x.i === "number" && portees.has(x.i)).length;
    if (compte < 2) continue;

    const atteints = p.paliers.filter((l) => l.pieces <= compte);
    const ignores = p.paliers.filter((l) => l.pieces > compte);
    for (const l of atteints) {
      if (l.valeur == null) {
        trous.push(`Panoplie « ${p.n ?? p.id} » : une ligne est écrite sans valeur dans le client (code « ${l.code} ») — non comptée.`);
        continue;
      }
      poser(4, "Panoplie", l.code, l.valeur,
        `${p.n ?? `SetItem ${p.id}`} — ${compte}/${p.pieces.length} pièces (seuil ${l.pieces})`,
        `public/wiki/bonus-sources.json ▸ panoplies[${rang}].paliers (propItemEtc.inc ▸ SetItem ${p.id})`);
    }
    if (ignores.length) {
      const seuils = [...new Set(ignores.map((l) => l.pieces))].sort((a, b) => a - b).join(", ");
      trous.push(`Panoplie « ${p.n ?? p.id} » : ${ignores.length} ligne(s) demandent ${seuils} pièce(s), ${compte} portée(s) — non comptées.`);
    }
  }
}

/**
 * LE COSTUME — aucune pièce ne paie seule.
 *
 * MECH.mode le dit : le bonus est porté par le SET et ne s'applique qu'aux QUATRE
 * pièces portées. Les quatre pièces répètent le même tableau `setb` dans le
 * relevé — on l'ajoute UNE FOIS, pas quatre. Et l'amélioration du costume ne
 * compte pour rien : le client ne documente aucun gain, ni table ni coefficient.
 *
 * Les gemmes de costume (quatre par pièce) sont un mécanisme à part, avec quatre
 * paliers par statistique — même lecture que le sertissage d'arme, voir `sertir`.
 */
function panoplieCostume(
  personnage: Personnage,
  equipees: { emplacement: Emplacement; piece: PieceEquipee; objet: ReturnType<typeof trouverObjet> }[],
  tables: Tables, poser: Poser, trous: string[], hypotheses: Set<string>,
) {
  const modePortees = EMPLACEMENTS_MODE.filter((s) => personnage.equipement?.[s]);
  if (modePortees.length) {
    const premiere = personnage.equipement?.[modePortees[0]];
    const entree = premiere?.id != null ? tables.catalogue.get(String(premiere.id)) : undefined;
    const sets = new Set(
      modePortees
        .map((s) => {
          const p = personnage.equipement?.[s];
          return p?.id != null ? tables.catalogue.get(String(p.id))?.set : undefined;
        })
        .filter(Boolean) as string[],
    );
    if (modePortees.length === 4 && sets.size === 1 && entree?.setb?.length) {
      for (const [libelle, valeur] of entree.setb) {
        poser(4, "Bonus de costume", libelle, valeur, `Costume ${entree.set} — 4/4 pièces`,
          "public/airbuilder/data.json ▸ ITEMS.fashion[].setb — ajouté UNE fois, les quatre pièces répètent le même tableau");
      }
    } else if (modePortees.length < 4) {
      trous.push(`Costume : ${modePortees.length}/4 pièces portées — le bonus de set ne paie qu'aux quatre, il n'est pas compté.`);
    } else if (sets.size > 1) {
      trous.push(`Costume : ${sets.size} ensembles différents portés — aucun bonus de set.`);
    }
  }

  for (const e of equipees) {
    const choix = e.piece.gemmesCostume ?? [];
    if (!choix.length) continue;
    const parCode = new Map<string, number>();
    for (const stat of choix) {
      const code = codeDe(tables, stat);
      if (!code || !tables.gemmesCostume.has(code)) {
        trous.push(`Gemme de costume « ${stat} » (${e.emplacement}) : absente de la table du client — non comptée.`);
        continue;
      }
      parCode.set(code, (parCode.get(code) ?? 0) + 1);
    }
    for (const [code, nombre] of parCode) {
      const table = tables.gemmesCostume.get(code) ?? [];
      const rang = Math.min(nombre, table.length);
      const valeur = table[rang - 1] ?? 0;
      const somme = table.slice(0, rang).reduce((s, v) => s + v, 0);
      poser(4, "Gemme de costume", code, valeur, `${e.emplacement} — ${nombre} gemme(s)`,
        `public/wiki/bonus-sources.json ▸ sertissage.costume[${code}].paliers[${rang - 1}] (Costume_GemAbility.txt)`,
        {
          hypothese:
            `Gemmes : la valeur du palier REMPLACE, elle ne s'additionne pas. Quatre logements par pièce (MECH.mode.gemmes.parPiece) pour QUATRE colonnes dans le fichier, et GEMC ne retient que la dernière — donc la dernière colonne est un maximum, pas un incrément. Sous la lecture « somme », ${nombre} gemme(s) donneraient ${somme} au lieu de ${valeur}.`,
        });
      hypotheses.add(
        `Sertissage et gemmes de costume : lecture REMPLACEMENT retenue (le palier vaut pour le total), lecture SOMME écartée. Le client ne tranche pas.`,
      );
    }
  }
}

/**
 * LE SERTISSAGE — cinq logements de gemme, plus trois diamants holographiques.
 *
 * ┌─── L'ORDRE EST CELUI DE GEMU, JAMAIS DE DIASTATS ──────────────────────┐
 * │ L'ordre du client (Ultimate_GemAbility.txt) est DST_HP_MAX,             │
 * │ DST_ATKPOWER, DST_ADJDEF, DST_MELEE_STEALHP, DST_PVP_DMG, DST_STR,      │
 * │ DST_STA, DST_DEX, DST_INT ; GEMU y colle neuf fois sur neuf. DIASTATS   │
 * │ porte les mêmes neuf dans un AUTRE ordre. Lire une valeur de GEMU à     │
 * │ l'index d'un nom de DIASTATS donne le bon nom avec le mauvais effet —   │
 * │ c'est l'écart constaté sur les gemmes ultimes. Ce module travaille par  │
 * │ NOM, jamais par index, et la confusion devient impossible.              │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * COMBIEN VAUT UNE GEMME. Le fichier donne HUIT valeurs par gemme et par
 * statistique, dont l'en-tête n'en numérote que cinq — les trois dernières sont
 * sans titre et seul le diamant les remplit, en y répétant sa cinquième valeur.
 * Ce que ces colonnes comptent n'est écrit NULLE PART. Le moteur retient la
 * lecture REMPLACEMENT PAR NOMBRE DE GEMMES, pour quatre raisons tirées des
 * données :
 *   1. cinq colonnes numérotées pour cinq logements (MECH.arme.upgrade_normal.diamants) ;
 *   2. quatre colonnes pour quatre logements côté costume (MECH.mode.gemmes.parPiece) ;
 *   3. GEMU et MECH.arme.sertissage ne retiennent que la dernière colonne et
 *      l'appellent `max` — un maximum, pas un incrément ;
 *   4. la cinquième colonne vaut SIX fois la première quand les quatre premières
 *      valent 1, 2, 3, 4 fois : une prime au tableau complet, pas un pas.
 * La lecture « somme » est calculée aussi et donnée dans l'hypothèse, pour que le
 * choix soit contestable sur des nombres.
 *
 * LES TROIS HOLOGRAPHIQUES sont un AUTRE mécanisme : artefact.json les écrit à
 * valeur fixe (33 par attribut, 15 en dégâts JcJ) et ils ne se débloquent que de
 * +11 à +20. Aucune ambiguïté : ils s'additionnent.
 */
function sertir(
  equipees: { emplacement: Emplacement; piece: PieceEquipee; objet: ReturnType<typeof trouverObjet> }[],
  tables: Tables, poser: Poser, trous: string[], hypotheses: Set<string>,
) {
  for (const e of equipees) {
    const nom = e.objet?.n ?? e.emplacement;
    const gemmes = e.piece.gemmes ?? [];
    if (gemmes.length > 5) {
      trous.push(`${nom} : ${gemmes.length} gemmes posées, cinq logements au plus (MECH.arme.upgrade_normal.diamants) — les suivantes sont ignorées.`);
    }
    const parCode = new Map<string, { nombre: number; gemme: string }>();
    for (const g of gemmes.slice(0, 5)) {
      const entree = tables.ordreSertissage.find((x) => sansAccent(x.libelle) === sansAccent(g.stat));
      const code = entree?.code || codeDe(tables, g.stat);
      if (!code || !tables.sertissage.has(code)) {
        trous.push(`${nom} : gemme « ${g.stat} » hors des neuf statistiques du client — non comptée.`);
        continue;
      }
      const gemme = g.gemme ?? "Diamant";
      const cle = `${code}|${gemme}`;
      const c = parCode.get(cle);
      if (c) c.nombre += 1;
      else parCode.set(cle, { nombre: 1, gemme });
    }
    for (const [cle, { nombre, gemme }] of parCode) {
      const code = cle.split("|")[0];
      const table = tables.sertissage.get(code)?.get(gemme);
      if (!table) {
        trous.push(`${nom} : gemme « ${gemme} » inconnue pour ${code} — non comptée.`);
        continue;
      }
      const rang = Math.min(nombre, table.length);
      const valeur = table[rang - 1] ?? 0;
      const somme = table.slice(0, rang).reduce((s, v) => s + v, 0);
      poser(5, "Sertissage", code, valeur, `${nom} — ${nombre} × ${gemme}`,
        `public/wiki/bonus-sources.json ▸ sertissage.ultimes[${code}] ▸ ${gemme} ▸ paliers[${rang - 1}] (Ultimate_GemAbility.txt)`,
        {
          hypothese:
            `Sertissage : REMPLACEMENT retenu — ${nombre} × ${gemme} sur ${code} vaut ${valeur}. Sous la lecture « somme », ${somme}. Le client ne dit pas ce que comptent ses colonnes.`,
        });
      hypotheses.add(
        "Sertissage et gemmes de costume : lecture REMPLACEMENT retenue (le palier vaut pour le total), lecture SOMME écartée. Le client ne tranche pas.",
      );
    }

    const holos = e.piece.holographiques ?? [];
    if (holos.length > 3) {
      trous.push(`${nom} : ${holos.length} diamants holographiques, trois au plus (MECH.arme.artefact.diamants_holo) — les suivants sont ignorés.`);
    }
    for (const stat of holos.slice(0, 3)) {
      const h = tables.holographiques.find((x) => sansAccent(x.libelle) === sansAccent(stat))
        ?? tables.holographiques.find((x) => x.code === codeDe(tables, stat));
      if (!h) {
        trous.push(`${nom} : diamant holographique « ${stat} » hors des cinq du client — non compté.`);
        continue;
      }
      poser(5, "Diamant holographique", h.code, h.valeur, `${nom} — holo`,
        "public/wiki/bonus-sources.json ▸ artefact.pierres[0].abilities (artefact.json) — débloqués de +11 à +20");
    }
  }
}

/**
 * LA RARETÉ — deux mécaniques que le mot « rareté » fait se ressembler.
 *
 * (a) LA MAÎTRISE D'ARME est déterministe : propweaponleveling.inc donne UNE
 *     statistique par type d'arme (ou par arme nommée) et UNE valeur par rareté.
 *     Elle se calcule.
 * (b) LES LIGNES DE RARETÉ sont tirées au sort : rarity.json donne un vivier de
 *     quatre statistiques par famille d'arme, un intervalle min/max, et la
 *     probabilité d'obtenir 1, 2, 3 ou 4 lignes. Ce n'est pas un nombre, c'est un
 *     INTERVALLE — le moteur le rend comme tel et ne l'ajoute à aucun total.
 *
 * SIX RARETÉS, comptées et non écrites : les clés de `parRarete` du relevé
 * (NONE, RARE, EPIC, LEGENDARY, PREMYTHIC, MYTHIC) et les six libellés de
 * MECH.arme.rarete_tiers se correspondent rang par rang.
 *
 * L'unité de min/maxPercent n'est PAS dite par le client. Le champ s'appelle
 * « percent » et MECH.arme.rarete_pool recopie les mêmes bornes sans signe %.
 * L'intervalle est donc rendu avec le nom du champ, sans être interprété.
 */
function rarete(
  equipees: { emplacement: Emplacement; piece: PieceEquipee; objet: ReturnType<typeof trouverObjet> }[],
  tables: Tables, poser: Poser, trous: string[], intervalles: Intervalle[],
) {
  for (const e of equipees) {
    const rar = e.piece.rarete;
    if (!rar || rar === "NONE") continue;
    const objet = e.objet;
    const nom = objet?.n ?? e.emplacement;
    if (!objet) {
      trous.push(`${nom} : rareté ${rar} demandée mais l'objet est inconnu du relevé — ni maîtrise d'arme ni lignes de rareté.`);
      continue;
    }

    // LA LIGNE NOMMÉE L'EMPORTE SUR LA LIGNE DE TYPE, et ce n'est pas un détail.
    // propweaponleveling.inc écrit dix lignes par TYPE d'arme et seize par ARME
    // NOMMÉE, et les seize nomment justement les armes qui échappent à la règle
    // de leur type : l'Arc éternel a une ligne DST_HP_MAX_RATE alors que
    // WEAPON_BOW donne DST_CRITICAL_BONUS. Additionner les deux inventerait un
    // bonus que le fichier n'accorde à personne ; on prend la plus précise et on
    // DIT laquelle a été écartée.
    const nommees = objet.cle ? tables.maitriseParObjet.get(objet.cle) ?? [] : [];
    const parType = objet.t2 ? tables.maitriseParType.get(`WEAPON_${objet.t2.replace(/^WEAPON_/, "")}`) ?? [] : [];
    const maitrises = nommees.length ? nommees : parType;
    if (nommees.length && parType.length) {
      trous.push(
        `${nom} : deux lignes de maîtrise d'arme se présentent — une NOMMÉE (${nommees.map((m) => m.code).join(", ")}) et une de TYPE (${parType.map((m) => m.code).join(", ")}). La nommée l'emporte ; la ligne de type est écartée, pas additionnée.`,
      );
    }
    if (!maitrises.length) {
      trous.push(`${nom} : aucune ligne de maîtrise d'arme pour ce type (${objet.t2 ?? "?"}) dans propweaponleveling.inc.`);
    }
    for (const m of maitrises) {
      const valeur = m.parRarete[rar] ?? 0;
      poser(6, "Maîtrise d'arme", m.code, valeur, `${nom} — ${rar}`,
        `public/wiki/bonus-sources.json ▸ maitriseArme.statistiques (propweaponleveling.inc) ▸ ${m.cible} ▸ parRarete.${rar}`);
    }
    if (maitrises.length) {
      trous.push(`${nom} : la maîtrise d'arme monte à 100 en treize paliers, mais le relevé ne donne qu'UNE valeur par rareté — le niveau de maîtrise n'est donc pas un facteur calculable, il n'est compté qu'une fois.`);
    }

    const vivier = (objet.cle ? tables.rarete.parObjet.get(objet.cle) : undefined)
      ?? (objet.k3 ? tables.rarete.viviers.get(`IK3_${objet.k3}`) : undefined);
    if (!vivier?.length) {
      trous.push(`${nom} : aucun vivier de rareté (rarity.json) pour IK3_${objet.k3 ?? "?"} — les lignes aléatoires ne sont pas chiffrables.`);
      continue;
    }
    const lignesMax = Math.max(...tables.rarete.lignes.map((l) => l.amount), 0);
    const min = Math.min(...vivier.map((v) => v.minPercent));
    const max = Math.max(...vivier.map((v) => v.maxPercent));
    intervalles.push({
      nom: `Lignes de rareté — ${nom} (${rar})`,
      min, max, lignes: lignesMax,
      detail:
        `Vivier de ${vivier.length} statistiques (${vivier.map((v) => libelleDe(tables, v.id) ?? v.id).join(", ")}), `
        + `de ${min} à ${max} par ligne, ${tables.rarete.lignes.filter((l) => l.amount > 0).map((l) => `${l.amount} ligne(s) : ${l.chance} %`).join(" · ")}. `
        + `Total possible : de ${min} à ${max * lignesMax} sur ${lignesMax} lignes. `
        + "L'unité n'est pas dite par le client : le champ s'appelle « percent », MECH.arme.rarete_pool recopie les mêmes bornes sans signe.",
      source: "public/wiki/bonus-sources.json ▸ rarete.viviers / rarete.lignes (rarity.json)",
    });
    trous.push(`${nom} : les lignes de rareté sont TIRÉES AU SORT — rendues en intervalle, jamais ajoutées à un total.`);
  }
}

/**
 * LES GRANDEURS DÉRIVÉES — PV, PM, PC, défense, attaque, parade.
 *
 * ┌─── CE QUE CES NOMBRES SONT, ET CE QU'ILS NE SONT PAS ──────────────────┐
 * │ Les FACTEURS viennent du client d'Airborn (propJob.inc, relevé dans    │
 * │ bonus-sources.json ▸ facteursDeClasse). L'ORDRE DES OPÉRATIONS, lui,    │
 * │ est celui du Flyff OFFICIEL : Airborn a changé des valeurs, et         │
 * │ personne n'a mesuré ces formules en jeu. Chaque ligne porte donc sa     │
 * │ réserve. Ce sont des ordres de grandeur vérifiables, pas des vérités.   │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * DEUX ORDRES OPPOSÉS, et c'est le piège du lot :
 *   · l'ATTAQUE : le pourcentage s'applique AVANT l'ajout de l'attaque absolue.
 *   · la DÉFENSE : le pourcentage s'applique APRÈS l'ajout de la défense absolue.
 * Inverser l'un des deux change le total de plusieurs centaines.
 *
 * DEUX COLONNES DE propJob.inc N'AVAIENT PAS DE NOM LATIN dans le relevé.
 * Leur intitulé coréen les nomme : « 공속 » (colonne1) est la base de VITESSE
 * D'ATTAQUE de la classe, « 물리방어력관련 » (colonne5) le facteur de DÉFENSE
 * PHYSIQUE. Les deux se recoupent avec l'emploi qu'un calculateur en fait —
 * `colonne1` sert de plancher à la vitesse d'attaque, `colonne5` multiplie
 * l'endurance dans la défense.
 *
 * LES FACTEURS D'ARME VIENNENT DE DEUX TABLES, ET C'EST LA CORRECTION LA PLUS
 * IMPORTANTE DE CE FICHIER. Il était écrit ici que « les sept facteurs d'arme ne
 * varient pas d'une classe à l'autre dans Airborn, les indexer par classe donnerait
 * l'illusion d'une spécialisation qui n'existe pas ». C'était exact de propJob.inc
 * — ses quarante lignes recopient bien les mêmes sept nombres — et faux du client :
 * `propBalance.xml` porte les mêmes propriétés PAR MÉTIER, et elles varient (épée
 * 3,5 chez un Vagabond, 13 chez un Templier). Il nomme en plus l'ARC, que propJob
 * ignore. La spécialisation existe ; c'est propJob.inc qui ne la voit pas.
 *
 * L'ORDRE DE LECTURE : l'équilibrage d'abord, propJob en repli — obligatoire, une
 * ligne d'équilibrage ne nomme que les armes de sa propre voie. Et quand les deux
 * divergent, LES DEUX SONT ÉCRITES dans le détail du terme : rien, dans le client,
 * ne dit laquelle fait foi.
 */
function deriver(ctx: {
  niveau: number;
  facteurs: import("./tables").FacteurClasse | null;
  /** La ligne de `propBalance.xml` du métier, situation PvE. `null` : trois métiers
   *  de propJob.inc n'ont aucune ligne d'équilibrage (Marionnettiste, Gardien, Doppler). */
  equilibrage: import("./tables").LigneEquilibrage | null;
  attributs: Resultat["attributs"];
  absoluDe: (code: string) => number;
  pourcentDe: (code: string) => number;
  arme: ReturnType<typeof trouverObjet>;
  /** Les pièces d'ARMURE portées, avec leur défense propre telle qu'écrite. */
  armures: { nom: string; min: number; max: number; palier: number }[];
}): Derivee[] {
  const { niveau, facteurs, equilibrage, attributs, absoluDe, pourcentDe, arme, armures } = ctx;
  /* Une virgule décimale. Ces détails sont LUS par un joueur français : « 0.91 »
     et « 0.5 » y passaient pour des coquilles, et un détail qu'on croit fautif
     décrédibilise le nombre qu'il explique. */
  const vg = (n: number) => String(n).replace(".", ",");
  const out: Derivee[] = [];
  // ┌─── CE QUI VIENT DU CLIENT, ET CE QUI VIENT D'AILLEURS ─────────────────┐
  // │ Il faut le dire précisément, sinon la réserve laisse croire que seuls   │
  // │ l'ORDRE des opérations est emprunté et que les nombres, eux, sont dans  │
  // │ le client. C'est faux. Viennent du client d'Airborn : les facteurs de  │
  // │ métier — propJob.inc (MaxHP, MaxMP, MaxFP, colonne5) ET propBalance.xml │
  // │ (les familles d'arme, le blocage, le critique) — et les dn/dx. Ne       │
  // │ viennent d'AUCUN fichier détenu : le 150 des PV, le 22 des PM, les      │
  // │ multiplicateurs 20 (PV), 9 (PM), 7 (PC), le 0,01 de l'endurance, le     │
  // │ 0,75, le 2÷2,8, le 0,5÷2,8 et le −4 de la défense, le quart de la       │
  // │ défense d'équipement, le 0,5 de la parade, le ÷10 du critique, le ÷8 du │
  // │ blocage, ainsi que les 15 de départ et le budget « niveau × 2 − 2 ».    │
  // │ Ces quatorze-là sont les constantes du calculateur du Flyff OFFICIEL.   │
  // └────────────────────────────────────────────────────────────────────────┘
  const reserveFormule =
    "Ce qui vient du client d'Airborn : les facteurs de métier de propBalance.xml et de propJob.inc, et les dn/dx du relevé d'objets. Ce qui NE vient d'aucun fichier détenu : l'ordre des opérations ET les constantes numériques de la formule (150, 22, ×20, ×9, ×7, 0,01, 0,75, 2÷2,8, 0,5÷2,8, −4, le quart de la défense d'équipement, 0,5, ÷10, ÷8) — ce sont celles du calculateur du Flyff officiel, réécrites, jamais mesurées sur Airborn.";

  if (!facteurs) {
    out.push({
      nom: "PV max", valeur: null,
      detail: "La classe n'a pas été retrouvée dans facteursDeClasse : aucune grandeur dérivée n'est calculable.",
      source: "public/wiki/bonus-sources.json ▸ facteursDeClasse",
    });
    return out;
  }

  const end = attributs.Endurance.total;
  const int = attributs.Intelligence.total;
  const dex = attributs.Dextérité.total;
  const force = attributs.Force.total;

  /* ┌─── LA DIVERGENCE SE DIT AUSSI QUAND C'EST propJob QUI GAGNE ───────────┐
     │ Le critique et le blocage écrivent leurs deux chiffres parce que        │
     │ l'équilibrage l'emporte sur eux. Les PV et la défense font l'INVERSE —  │
     │ propJob.inc est retenu, pour une raison mesurée (balance.json ▸         │
     │ arbitrage.attributsNonAppliques) — et il serait malhonnête que le sens  │
     │ du choix décide de sa visibilité. C'est même ici qu'il faut le plus le  │
     │ dire : l'équilibrage diverge de propJob sur 33 des 37 métiers pour les  │
     │ PV et sur 24 pour la défense, et l'écart y pèse plus lourd que sur le   │
     │ critique — un facteur quatre sur le Chevalier.                          │
     │ Les deux compteurs ci-dessus ne sont PAS écrits ici : la phrase servie  │
     │ ne cite que les deux facteurs du métier affiché et le nombre qu'ils     │
     │ donnent, tous deux relus dans les relevés à chaque appel.               │
     └────────────────────────────────────────────────────────────────────────┘ */
  const facteurEcarteDeLEquilibrage = (attribut: "HP" | "Def", retenu: number) => {
    const b = equilibrage?.attributs[attribut];
    return typeof b === "number" && b !== retenu ? b : null;
  };

  // PV = (150 + (1 + END × 0,01) × facteurHP × niveau × 20 + PV absolus) × (1 + PV %)
  const pvDe = (f: number) => Math.floor(150 + (1 + end * 0.01) * (f * niveau) * 20);
  const pvBase = pvDe(facteurs.MaxHP);
  const pvAbs = Math.max(0, absoluDe("DST_HP_MAX"));
  const pvPct = pourcentDe("DST_HP_MAX_RATE");
  const pvTotal = (base: number) => Math.floor((base + pvAbs) * (1 + pvPct / 100));
  const hpEcarte = facteurEcarteDeLEquilibrage("HP", facteurs.MaxHP);
  out.push({
    nom: "PV max",
    valeur: pvTotal(pvBase),
    detail:
      `base = plancher(150 + (1 + ${end} × 0,01) × (${facteurs.MaxHP} × ${niveau}) × 20) = ${pvBase} · `
      + `+ ${pvAbs} PV absolus (DST_HP_MAX) = ${pvBase + pvAbs} · `
      + `× (1 + ${pvPct} / 100) (DST_HP_MAX_RATE) = ${pvTotal(pvBase)}`
      + (hpEcarte != null
        ? ` LES DEUX TABLES DU CLIENT DIVERGENT : propJob.inc donne ${vg(facteurs.MaxHP)}, propBalance.xml donne ${vg(hpEcarte)}, ce qui ferait ${pvTotal(pvDe(hpEcarte))}. Le calcul emploie propJob.inc, parce que dans l'équilibrage une promotion fait BAISSER ce facteur — ce qu'un facteur de PV max ne fait pas. Rien dans le client n'écrit lequel fait foi.`
        : ""),
    source: `facteursDeClasse.MaxHP = ${facteurs.MaxHP} · Endurance totale hors pourcentage`
      + (hpEcarte != null ? ` · balance.json ▸ PVE_BALANCE ▸ ${equilibrage?.id ?? "?"}, attribut HP = ${vg(hpEcarte)} — lu, non appliqué` : ""),
    reserve: reserveFormule,
  });

  const pmBase = Math.floor(22 + facteurs.MaxMP * (niveau * 2 + int * 9));
  const pmAbs = Math.max(0, absoluDe("DST_MP_MAX"));
  const pmPct = pourcentDe("DST_MP_MAX_RATE");
  out.push({
    nom: "PM max",
    valeur: Math.floor((pmBase + pmAbs) * (1 + pmPct / 100)),
    detail:
      `base = plancher(22 + ${facteurs.MaxMP} × (${niveau} × 2 + ${int} × 9)) = ${pmBase} · `
      + `+ ${pmAbs} (DST_MP_MAX) · × (1 + ${pmPct} / 100) (DST_MP_MAX_RATE)`,
    source: `facteursDeClasse.MaxMP = ${facteurs.MaxMP}`,
    reserve: reserveFormule,
  });

  const pcBase = Math.floor(facteurs.MaxFP * (niveau * 2 + end * 7));
  const pcAbs = Math.max(0, absoluDe("DST_FP_MAX"));
  const pcPct = pourcentDe("DST_FP_MAX_RATE");
  out.push({
    nom: "PC max",
    valeur: Math.floor((pcBase + pcAbs) * (1 + pcPct / 100)),
    detail:
      `base = plancher(${facteurs.MaxFP} × (${niveau} × 2 + ${end} × 7)) = ${pcBase} · `
      + `+ ${pcAbs} (DST_FP_MAX) · × (1 + ${pcPct} / 100) (DST_FP_MAX_RATE)`,
    source: `facteursDeClasse.MaxFP = ${facteurs.MaxFP}`,
    reserve: reserveFormule,
  });

  // ════════ DÉFENSE ════════
  // Le pourcentage s'applique APRÈS l'absolu — l'inverse de l'attaque.
  //
  // ┌─── LE TERME DOMINANT EST CELUI DE L'ARMURE ────────────────────────────┐
  // │ La part de personnage d'un Templier niveau 200 à 619 d'endurance vaut   │
  // │ 1 038. La défense propre de son armure Shaïtan complète vaut 7 391, et  │
  // │ elle entre pour son QUART, soit 1 847 : presque le double de la part de │
  // │ personnage. L'omettre ne fait pas « un chiffre prudent », ça fait un    │
  // │ chiffre faux — un tiers de la vraie défense, affiché comme la défense.  │
  // │ La valeur est ÉCRITE dans le relevé (objets-stats.json ▸ dn / dx d'un   │
  // │ objet dont `t1` vaut ARMOR), au même titre que les dn/dx de l'arme qui  │
  // │ servent déjà à l'attaque. Ce qui reste non calculable est le +N de la   │
  // │ pièce, et il est annoncé — exactement comme pour l'arme.                │
  // │ Le relevé donne un INTERVALLE (dn ≠ dx) : les deux bornes sont rendues. │
  // └────────────────────────────────────────────────────────────────────────┘
  const defAbs = absoluDe("DST_ADJDEF");
  const defPct = pourcentDe("DST_ADJDEF_RATE");
  const defStatDe = (f: number) => Math.floor(niveau * (2 / 2.8) + (end * (0.5 / 2.8) + (end - 14) * f) * 0.75 - 4);
  const defStat = defStatDe(facteurs.colonne5);
  const equipMin = armures.reduce((s, a) => s + a.min, 0);
  const equipMax = armures.reduce((s, a) => s + a.max, 0);
  const totalDe = (part: number, equip: number) => Math.floor((part + Math.floor(equip / 4) + defAbs) * (1 + defPct / 100));
  const total = (equip: number) => totalDe(defStat, equip);
  const defBas = total(equipMin);
  const defHaut = total(equipMax);
  const defEcarte = facteurEcarteDeLEquilibrage("Def", facteurs.colonne5);
  const ameliorees = armures.filter((a) => a.palier > 0);
  out.push({
    nom: "Défense (attaque physique)",
    valeur: Math.max(0, defBas),
    detail:
      `part de personnage = plancher(${niveau} × 2 ÷ 2,8 + (${end} × 0,5 ÷ 2,8 + (${end} − 14) × ${facteurs.colonne5}) × 0,75 − 4) = ${defStat} · `
      + (armures.length
        ? `+ le QUART de la défense de l'armure portée = plancher(${equipMin} ÷ 4) = ${Math.floor(equipMin / 4)}`
          + (equipMax !== equipMin ? ` (jusqu'à plancher(${equipMax} ÷ 4) = ${Math.floor(equipMax / 4)} à la borne haute)` : "")
          + ` — ${armures.length} pièce(s) : ${armures.map((a) => `${a.nom} ${a.min}–${a.max}`).join(", ")} · `
        : "aucune pièce d'armure portée, donc aucune défense d'équipement · ")
      + `+ ${defAbs} de défense absolue (DST_ADJDEF) · `
      + `× (1 + ${defPct} / 100) (DST_ADJDEF_RATE) = ${defBas}`
      + (defHaut !== defBas ? ` à ${defHaut}` : "")
      + ". Le relevé écrit la défense d'une pièce comme un intervalle (dn–dx) : les deux bornes sont données, aucune n'est tirée au sort ici."
      + (ameliorees.length
        ? ` LE +N N'EST PAS COMPTÉ sur ${ameliorees.map((a) => `${a.nom} +${a.palier}`).join(", ")} : le gain par palier d'une armure n'existe dans aucun fichier du client.`
        : "")
      + (defEcarte != null
        ? ` LES DEUX TABLES DU CLIENT DIVERGENT : propJob.inc donne ${vg(facteurs.colonne5)}, propBalance.xml donne ${vg(defEcarte)}, ce qui ferait ${totalDe(defStatDe(defEcarte), equipMin)}. Le calcul emploie propJob.inc, parce que la FORME de cette formule vient déjà du Flyff officiel et n'est pas confirmée sur Airborn : y ajouter un second choix incertain empilerait deux inconnues. Rien dans le client n'écrit lequel fait foi.`
        : ""),
    source:
      `facteursDeClasse.colonne5 (물리방어력관련) = ${facteurs.colonne5} · `
      + (defEcarte != null ? `balance.json ▸ PVE_BALANCE ▸ ${equilibrage?.id ?? "?"}, attribut Def = ${vg(defEcarte)} — lu, non appliqué · ` : "")
      + "public/wiki/objets-stats.json ▸ dn / dx des pièces dont t1 = ARMOR",
    reserve: reserveFormule,
  });

  // Attaque : le pourcentage s'applique AVANT l'absolu. Voir l'en-tête.
  const famille = arme ? familleArme(arme) : null;
  /* ── LE FACTEUR D'ARME, LES DEUX TABLES ────────────────────────────────────
     L'équilibrage du métier d'abord ; propJob.inc en repli quand la ligne du
     métier ne nomme pas cette arme. Les deux valeurs sont gardées : celle qui
     n'est pas employée s'affiche dans le détail. */
  const brutEquilibrage = famille ? equilibrage?.attributs[famille.attribut] : undefined;
  const facteurEquilibrage = typeof brutEquilibrage === "number" ? brutEquilibrage : null;
  const brutPropJob = famille?.cle ? facteurs[famille.cle] : undefined;
  const facteurPropJob = typeof brutPropJob === "number" ? brutPropJob : null;
  const facteurRetenu = facteurEquilibrage ?? facteurPropJob;
  const tableRetenue = facteurEquilibrage != null ? "propBalance.xml" : "propJob.inc";
  const facteurEcarte = facteurEquilibrage != null && facteurPropJob != null && facteurPropJob !== facteurEquilibrage ? facteurPropJob : null;

  if (arme && famille && facteurRetenu == null) {
    out.push({
      nom: "Attaque affichée", valeur: null,
      detail:
        `${arme.n} est ${famille.attribut === "Bow" ? "un arc" : "une arme"} que ce métier ne porte pas : sa ligne d'équilibrage (propBalance.xml) ne nomme que les armes de sa propre voie, `
        + `et propJob.inc n'a aucune colonne pour cette famille. Le facteur qui multiplie ${famille.stat === "Dextérité" ? `la dextérité (${dex} − ${famille.decalage})` : famille.stat === "Intelligence" ? `l'intelligence (${int} − ${famille.decalage})` : `la force (${force} − ${famille.decalage})`} n'existe donc dans AUCUNE des deux tables. `
        + `Tout le reste est là — ${arme.dn}–${arme.dx} doublés, niveau × ${vg(famille.niveau)}${famille.appointForce ? `, appoint 0,14 × ${force} de force` : ""} — mais il manque le multiplicateur central. Aucun nombre n'est produit.`,
      source: "public/wiki/balance.json ▸ PVE_BALANCE (propBalance.xml) et public/wiki/bonus-sources.json ▸ facteursDeClasse (propJob.inc) — les deux consultées, aucune ne répond",
    });
  } else if (arme && famille && facteurRetenu != null && typeof arme.dn === "number" && typeof arme.dx === "number") {
    const facteurArme = facteurRetenu;
    const statArme = famille.stat === "Intelligence" ? int : famille.stat === "Dextérité" ? dex : force;
    const decalage = famille.decalage;
    const bonusForce = famille.appointForce ? 0.14 * force : 0;
    const attaqueArme = Math.floor((statArme - decalage) * facteurArme + niveau * famille.niveau + bonusForce);
    const brut = { min: arme.dn * 2 + attaqueArme, max: arme.dx * 2 + attaqueArme };
    const moyenne = (brut.min + brut.max) / 2;
    const atkPct = pourcentDe("DST_ATKPOWER_RATE");
    const atkAbs = absoluDe("DST_ATKPOWER");
    const apresPct = moyenne + moyenne * Math.max(0, atkPct) / 100;
    // ┌─── DST_CHR_DMG : LA LIGNE QU'ON NE PEUT NI COMPTER NI TAIRE ───────────┐
    // │ Le relevé l'appelle « Dégâts subis réduits » — auquel cas elle n'a rien │
    // │ à faire dans une attaque. La description française du Grenat d'Amour   │
    // │ dit l'inverse (« fournit de l'ATQ ») et le calculateur de référence la  │
    // │ lit comme des dégâts plats ajoutés au minimum ET au maximum de l'arme, │
    // │ donc AVANT la moyenne, donc multipliés par l'Attaque %. Les deux       │
    // │ lectures ne se départagent pas : 27 objets et cinq bijoux la portent — │
    // │ le Grenat d'Amour +20 en donne 900. On ne l'ajoute donc PAS, et on dit │
    // │ de combien le nombre affiché serait plus haut si c'était de l'attaque. │
    // │ Taire l'écart laisserait croire que la question ne se pose plus.        │
    // └────────────────────────────────────────────────────────────────────────┘
    const chrDmg = absoluDe("DST_CHR_DMG");
    const siAttaque = chrDmg
      ? Math.floor(Math.max(0, (moyenne + chrDmg) * (1 + Math.max(0, atkPct) / 100) + atkAbs))
      : null;
    out.push({
      nom: "Attaque affichée",
      valeur: Math.floor(Math.max(0, apresPct + atkAbs)),
      detail:
        `arme ${arme.n} : ${arme.dn}–${arme.dx} doublés = ${arme.dn * 2}–${arme.dx * 2} · `
        + `+ attaque de famille = plancher((${statArme} − ${decalage}) × ${vg(facteurArme)} + ${niveau} × ${vg(famille?.niveau ?? 0)}${bonusForce ? ` + 0,14 × ${force}` : ""}) = ${attaqueArme} · `
        + (facteurEcarte != null
          ? `LES DEUX TABLES DU CLIENT DIVERGENT SUR CE FACTEUR : propBalance.xml donne ${vg(facteurArme)}, propJob.inc donne ${vg(facteurEcarte)}, et rien dans le client n'écrit laquelle fait foi. Avec ${vg(facteurEcarte)}, l'attaque de famille vaudrait ${Math.floor((statArme - decalage) * facteurEcarte + niveau * (famille?.niveau ?? 0) + bonusForce)} au lieu de ${attaqueArme}. Le calcul emploie l'équilibrage du serveur. · `
          : "")
        + `moyenne = ${moyenne} · × (1 + ${atkPct} / 100) (DST_ATKPOWER_RATE) = ${Math.floor(apresPct)} · `
        + `+ ${atkAbs} d'attaque absolue (DST_ATKPOWER) = ${Math.floor(apresPct + atkAbs)}. `
        + "Le pourcentage s'applique AVANT l'absolu — l'inverse de la défense."
        + (siAttaque != null
          ? ` DST_CHR_DMG VAUT ${chrDmg} ET N'EST PAS COMPTÉ ICI : le relevé l'appelle « Dégâts subis réduits », la description du Grenat d'Amour et le calculateur de référence en font de l'ATTAQUE ajoutée au minimum et au maximum de l'arme. Sous cette seconde lecture, l'attaque affichée vaudrait ${siAttaque} au lieu de ${Math.floor(apresPct + atkAbs)}. Le libellé du dictionnaire doit être tranché avant qu'un des deux nombres soit retenu.`
          : ""),
      source: (tableRetenue === "propBalance.xml"
        ? `balance.json ▸ PVE_BALANCE ▸ ${equilibrage?.id ?? "?"}, attribut ${famille?.attribut ?? "?"} = ${vg(facteurArme)} (propBalance.xml)${facteurEcarte == null && facteurPropJob != null ? " — propJob.inc donne le même chiffre" : ""}`
        : `facteursDeClasse.${famille?.cle ?? "?"} = ${vg(facteurArme)} (propJob.inc — l'équilibrage ne nomme pas cette arme pour ce métier ; cette colonne est identique sur les 40 classes)`)
        + " · objets-stats.json ▸ dn / dx",
      reserve:
        reserveFormule + " Le +N de l'arme n'entre PAS dans ce nombre : son gain par palier n'existe dans aucun fichier.",
    });
  } else {
    // Trois causes différentes ne doivent pas rendre la MÊME phrase : « aucune
    // arme » se corrige en équipant une arme, « famille inconnue » est un trou
    // du moteur, « pas de dn/dx » est un trou du relevé.
    out.push({
      nom: "Attaque affichée", valeur: null,
      detail: !arme
        ? "Aucune arme équipée : il n'y a pas d'attaque à calculer."
        : !famille
          ? `${arme.n} porte le type « ${arme.t2 ?? "absent du relevé"} », que le moteur ne rattache à aucune famille d'arme. Aucun nombre n'est produit plutôt qu'un nombre pris au hasard dans une famille voisine.`
          : `${arme.n} n'a pas de dégâts minimum/maximum (dn / dx) dans le relevé : l'attaque n'est pas chiffrable.`,
      source: "public/wiki/objets-stats.json ▸ t2 / dn / dx",
    });
  }

  const parade = Math.floor(dex * 0.5) + pourcentDe("DST_PARRY");
  out.push({
    nom: "Parade",
    valeur: parade,
    detail: `plancher(${dex} × 0,5) = ${Math.floor(dex * 0.5)} · + ${pourcentDe("DST_PARRY")} (DST_PARRY, points de pourcentage)`,
    source: "Dextérité totale hors pourcentage",
    reserve: reserveFormule,
  });

  // ┌─── LE FACTEUR CRITICAL A SA PLACE, ET ELLE EST CONNUE ─────────────────┐
  // │ Il multiplie la part de dextérité AVANT l'ajout des points de           │
  // │ pourcentage, et le produit est tronqué. C'est la même autorité que      │
  // │ l'ordre employé pour les PV, les PM, les PC, la défense, l'attaque, la  │
  // │ parade et le blocage : le calculateur du Flyff officiel. L'écarter ICI   │
  // │ et le suivre PARTOUT AILLEURS n'était pas de la prudence, c'était une   │
  // │ incohérence — et elle coûtait un facteur QUATRE à la seule lignée du    │
  // │ Bouffon (JESTER → WINDLURKER_HERO / Sylphide), qui est justement la     │
  // │ classe dont le critique fait la réputation. Les trente-six autres       │
  // │ classes portent 1 : sur elles, la correction ne change rien.            │
  // └────────────────────────────────────────────────────────────────────────┘
  /* CRITIQUE ET BLOCAGE SORTENT DE LA MÊME ÉNUMÉRATION QUE LES FACTEURS D'ARME.
     `defineBalance.h` numérote JOB_PROP_BLOCKING 6 et JOB_PROP_CRITICAL 8, au même
     titre que JOB_PROP_SWD 0 : les deux tables les portent toutes les deux, et elles
     ne s'accordent pas. On applique donc EXACTEMENT la même règle qu'à l'arme —
     l'équilibrage d'abord, propJob en repli, et les deux chiffres écrits quand ils
     divergent. Employer l'équilibrage pour l'épée et propJob pour le critique aurait
     fabriqué un personnage qui n'existe dans aucun des deux clients. */
  const deuxTables = (attribut: "Critical" | "Block", colonne: "CRITICAL" | "BLOCKING") => {
    const b = equilibrage?.attributs[attribut];
    const j = facteurs[colonne];
    const balance = typeof b === "number" ? b : null;
    const job = typeof j === "number" ? j : null;
    const retenu = balance ?? job ?? 1;
    return {
      retenu,
      ecarte: balance != null && job != null && job !== balance ? job : null,
      table: balance != null ? "propBalance.xml" : "propJob.inc",
      ou: balance != null ? `balance.json ▸ PVE_BALANCE ▸ ${equilibrage?.id ?? "?"}, attribut ${attribut}` : `facteursDeClasse.${colonne}`,
    };
  };
  const diver = (x: { ecarte: number | null; retenu: number }) =>
    x.ecarte != null
      ? ` LES DEUX TABLES DU CLIENT DIVERGENT : l'équilibrage donne ${vg(x.retenu)}, propJob.inc donne ${vg(x.ecarte)}. Le calcul emploie l'équilibrage ; rien dans le client n'écrit lequel fait foi.`
      : "";

  const crit = deuxTables("Critical", "CRITICAL");
  const critPoints = pourcentDe("DST_CHR_CHANCECRITICAL");
  const critClasse = Math.floor(dex / 10 * crit.retenu);
  const critique = critClasse + critPoints;
  out.push({
    nom: "Taux critique",
    valeur: Math.round(critique * 100) / 100,
    detail:
      `part de classe = plancher(${dex} ÷ 10 × ${vg(crit.retenu)}) = ${critClasse} · `
      + `+ ${critPoints} (DST_CHR_CHANCECRITICAL) — en points de pourcentage · = ${critique}.`
      + diver(crit)
      + " Sa PLACE dans le calcul n'est pas écrite dans le client : elle vient du calculateur du Flyff officiel, comme tout le reste de cet ordre.",
    source: `Dextérité totale hors pourcentage · ${crit.ou} = ${vg(crit.retenu)}`,
    reserve: reserveFormule,
  });

  const bloc = deuxTables("Block", "BLOCKING");
  const blocage = Math.floor(dex / 8 * bloc.retenu);
  out.push({
    nom: "Blocage (part de classe)",
    valeur: blocage + pourcentDe("DST_BLOCK_MELEE"),
    detail: `plancher(${dex} ÷ 8 × ${vg(bloc.retenu)}) = ${blocage} · + ${pourcentDe("DST_BLOCK_MELEE")} (DST_BLOCK_MELEE) · + ${pourcentDe("DST_BLOCK_RANGE")} à distance (DST_BLOCK_RANGE)`
      + diver(bloc),
    source: `${bloc.ou} = ${vg(bloc.retenu)}`,
    reserve: reserveFormule + " La part qui dépend de l'écart de dextérité avec l'attaquant n'est pas ici : elle ne se calcule qu'en face d'une cible.",
  });

  return out;
}

/**
 * La famille d'attaque d'une arme, et les nombres que le calcul lui applique.
 *
 * ┌─── L'ARC N'A PAS DE FACTEUR DANS LE CLIENT ────────────────────────────┐
 * │ propJob.inc nomme SEPT familles d'arme — SWD, AXE, STAFF, STICK,        │
 * │ KNUCKLE, WAND, YOYO — et l'ARC N'EN FAIT PAS PARTIE. Le facteur qui    │
 * │ multiplie la dextérité d'un arbalétrier n'est donc écrit nulle part     │
 * │ dans ce que nous détenons. Le décalage (14), le facteur de niveau       │
 * │ (0,91) et l'appoint de force (0,14 × FOR) se lisent bien dans la        │
 * │ mécanique, mais il manque le multiplicateur central : `cle` vaut `null` │
 * │ et l'attaque de l'arc n'est PAS chiffrée. Réutiliser le facteur du      │
 * │ yo-yo (4,2) parce qu'il est voisin dans le fichier serait une invention.│
 * └────────────────────────────────────────────────────────────────────────┘
 */
function familleArme(arme: NonNullable<ReturnType<typeof trouverObjet>>): {
  /** La colonne de `propJob.inc`. `null` pour l'arc : propJob ne le nomme pas. */
  cle: "SWD" | "AXE" | "STAFF" | "STICK" | "KNUCKLE" | "WAND" | "YOYO" | null;
  /** L'attribut de `propBalance.xml`. C'est la table lue EN PREMIER, et la seule
   *  qui nomme l'arc — `defineBalance.h` le numérote `JOB_PROP_BOW 9`. */
  attribut: "Sword" | "Axe" | "Staff" | "Stick" | "Knuckle" | "Wand" | "Yoyo" | "Bow";
  stat: "Force" | "Dextérité" | "Intelligence";
  decalage: number; niveau: number; appointForce?: true;
} | null {
  const t2 = (arme.t2 ?? "").replace(/^WEAPON_/, "");
  switch (t2) {
    case "ONESWORD": case "TWOSWORD": return { cle: "SWD", attribut: "Sword", stat: "Force", decalage: 12, niveau: 1.1 };
    case "YOYO": return { cle: "YOYO", attribut: "Yoyo", stat: "Force", decalage: 12, niveau: 1.1 };
    case "ONEAXE": case "TWOAXE": return { cle: "AXE", attribut: "Axe", stat: "Force", decalage: 12, niveau: 1.2 };
    case "STAFF": return { cle: "STAFF", attribut: "Staff", stat: "Force", decalage: 10, niveau: 1.1 };
    case "STICK": return { cle: "STICK", attribut: "Stick", stat: "Force", decalage: 10, niveau: 1.3 };
    case "KNUCKLE": return { cle: "KNUCKLE", attribut: "Knuckle", stat: "Force", decalage: 10, niveau: 1.2 };
    case "WAND": return { cle: "WAND", attribut: "Wand", stat: "Intelligence", decalage: 10, niveau: 1.2 };
    /* L'ARBALÈTE PASSE ICI AUSSI : le client la déclare `WEAPON_BOW`, et son
       chargeur d'équilibrage ne connaît pas d'attribut « Crossbow ». Ce n'est
       donc pas un raccourci de notre part — les deux armes partagent la propriété. */
    case "BOW": return { cle: null, attribut: "Bow", stat: "Dextérité", decalage: 14, niveau: 0.91, appointForce: true };
    default: return null;
  }
}
