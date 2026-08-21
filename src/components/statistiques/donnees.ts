import fs from "node:fs";
import path from "node:path";
import { classeFr } from "@/components/objets/vocabulaire";
import {
  FAMILLE_COLONNE, FAMILLE_FR, apportDeLElement, bonusDePanoplie, palierDeBijou, panneauDeCaracteristiques,
  puissanceDArme, puissanceDeCompetence, reductionParDefense,
  type Apport, type Arme, type Competence, type Feuille, type LigneDeStat, type Porteur,
  type SourceDuPanneau,
} from "./moteur";

/**
 * LES CINQ CALCULS COMPLETS — et pourquoi leurs sujets ne sont pas choisis à la main.
 *
 * Règle de la maison : « les chiffres se calculent sur les données, jamais en dur, y
 * compris dans les phrases. » Elle vaut aussi pour les EXEMPLES. Un exemple codé en
 * dur (« prenons l'Épée en Yggdrasil Purifié, 807 à 892 ») devient faux au prochain
 * versement du client, sans qu'aucun test ne le voie. Chaque sujet est donc désigné
 * par une RÈGLE appliquée au relevé :
 *
 *   1. L'ARME       → celle dont la borne BASSE de dégâts est la plus haute du relevé,
 *                     parmi les armes portant une famille connue du tableau des classes.
 *   2. LE PANNEAU   → cette arme, plus la panoplie qui porte la ligne la plus négative,
 *                     plus l'accessoire du calcul 5.
 *   3. LA COMPÉTENCE→ la compétence d'ATTAQUE de la classe de cette arme dont la borne
 *                     haute est la plus forte à son dernier niveau.
 *   4. LE MONSTRE   → celui dont la défense est la plus haute du relevé.
 *   5. L'ACCESSOIRE → parmi les six accessoires qui montent à 30 paliers, celui dont le
 *                     PLATEAU est le plus long — c'est lui qui prouve le remplacement.
 *
 * Le jour où le relevé change, les cinq exemples suivent, et les nombres des phrases
 * avec eux.
 *
 * ┌────────────── CE FICHIER TOUCHE AU DISQUE : SERVEUR SEULEMENT ──────────────┐
 * │ Il lit cinq relevés qui pèsent ensemble près de trois mégaoctets. Il ne doit  │
 * │ JAMAIS être importé par un composant client — même modèle que `lib/panoplie` │
 * │ et `lib/ouFarmer` : lecture au premier appel, index gardé en mémoire.        │
 * │                                                                             │
 * │ Et il ne rend que des FEUILLES DE CALCUL, jamais un relevé : ce qui part au   │
 * │ navigateur, c'est une trentaine de termes chiffrés, pas les 5 075 objets.    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

/* ── Les relevés, lus une fois ──────────────────────────────────────────────── */

type FicheObjet = {
  i: number; cle?: string; n?: string; t1?: string; k3?: string; job?: string;
  dn?: number; dx?: number; nr?: number; b?: [string, number][];
};
type Monstre = {
  id: string; nom: string; niv: number; rang: string; def: number; resMag: number;
  pv: number; pvEff?: number; vies?: number | null; res?: Record<string, number>;
  elem?: string; atkMin?: number; atkMax?: number; esq?: number;
};
type PalierBijou = { n: string; cle?: string; plafond: number; rangs: ([string, number][] | undefined)[] };
type PanoSource = {
  id: number; n: string;
  pieces: { cle: string; i?: number; n?: string; em?: string }[];
  paliers: { code: string; valeur: number | null; pieces: number }[];
};
type FacteurClasse = Record<string, string | number>;

type Base = {
  objets: FicheObjet[];
  monstres: Monstre[];
  competences: Competence[];
  bijoux: Record<string, PalierBijou>;
  panoplies: PanoSource[];
  facteurs: FacteurClasse[];
  /** DST_* → libellé français. 156 codes, dont 67 sans libellé : voir plus bas. */
  libelle: Map<string, string>;
  /** Le nombre TOTAL de codes du dictionnaire, libellés ou non. Gardé ici parce que
   *  `planche()` relisait le fichier du disque à chaque rendu juste pour le compter. */
  codesTotal: number;
  /** LE PLAFOND D'AMÉLIORATION D'UNE ARME NON-ARTEFACT, lu dans MECH et non écrit à
   *  la main. Un commentaire disait « celui que MECH.arme.upgrade_normal déclare » à
   *  côté d'un 10 en dur : la source était citée, pas lue. */
  plafondArme: number;
};

let BASE: Base | null = null;

const lire = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(process.cwd(), ...p), "utf8"));

function base(): Base {
  if (BASE) return BASE;
  const objets = lire("public", "wiki", "objets-stats.json").objets as FicheObjet[];
  const monstres = lire("public", "wiki", "monstres.json").monstres as Monstre[];
  const competences = lire("public", "wiki", "competences.json").competences as Competence[];
  const paliers = lire("public", "airbuilder", "paliers.json");
  const bonus = lire("public", "wiki", "bonus-sources.json");
  const dico = lire("src", "data", "statistiques-objets.json");
  /* LE RELEVÉ DU BUILDER, pour son seul bloc MECH : c'est lui qui déclare les
     plafonds d'amélioration, et le builder les affiche déjà. Deux écrans qui
     annonceraient deux plafonds différents pour la même arme se contrediraient. */
  const mech = lire("public", "airbuilder", "data.json").MECH as
    { arme?: { upgrade_normal?: { max?: number } } };

  /* 67 des 156 codes du dictionnaire n'ont PAS de libellé français : le client ne les
     nomme nulle part. On ne les invente pas — le code brut reste affiché tel quel, et
     c'est un renseignement en soi (« le jeu ne nomme pas cette statistique »). */
  const libelle = new Map<string, string>();
  for (const s of dico.stats as { code: string; fr?: string }[]) if (s.fr) libelle.set(s.code, s.fr);

  BASE = {
    objets, monstres, competences,
    bijoux: paliers.bijoux as Record<string, PalierBijou>,
    panoplies: bonus.panoplies as PanoSource[],
    facteurs: bonus.facteursDeClasse.classes as FacteurClasse[],
    libelle,
    codesTotal: (dico.stats as unknown[]).length,
    plafondArme: mech?.arme?.upgrade_normal?.max ?? 0,
  };
  return BASE;
}

/** Le libellé français d'un code, ou le code lui-même quand le client ne le nomme pas. */
const fr = (code: string) => base().libelle.get(code) ?? code;

/* ── Les cinq sujets, désignés par règle ────────────────────────────────────── */

/** L'arme dont la borne BASSE est la plus haute du relevé. La borne basse plutôt que
 *  la haute : c'est elle qui décide du dégât qu'on est SÛR de faire, et une arme au
 *  très large intervalle (681 à 959) fait un moins bon exemple qu'une arme resserrée. */
function armeDeReference(): FicheObjet | null {
  const liste = base().objets.filter((o) =>
    o.t1 === "WEAPON" && o.n && o.job && o.k3 && FAMILLE_COLONNE[o.k3] !== undefined && (o.dn ?? 0) > 0);
  return liste.reduce<FicheObjet | null>((m, o) => (!m || (o.dn ?? 0) > (m.dn ?? 0) ? o : m), null);
}

/** La panoplie qui porte la ligne la plus négative du relevé — celle dont compléter
 *  l'ensemble coûte le plus cher. */
function panoplieLaPlusCouteuse(): PanoSource | null {
  let pire: { p: PanoSource; v: number } | null = null;
  for (const p of base().panoplies) {
    for (const t of p.paliers ?? []) {
      if (t.valeur != null && t.valeur < 0 && (!pire || t.valeur < pire.v)) pire = { p, v: t.valeur };
    }
  }
  return pire?.p ?? null;
}

/** Parmi les six accessoires à 30 paliers, celui dont le plateau est le plus long. */
function bijouAuPlusLongPlateau(): { id: string; b: PalierBijou; plateau: number; fin: number } | null {
  let best: { id: string; b: PalierBijou; plateau: number; fin: number } | null = null;
  for (const [id, b] of Object.entries(base().bijoux)) {
    if (b.plafond !== 30) continue;
    let run = 0, cur = 0, fin = 0;
    for (let i = 2; i <= b.plafond; i++) {
      /* Un plateau = une statistique réécrite À L'IDENTIQUE d'un palier au suivant.
         On compare stat par stat et non le tableau entier : les Boucles Harpe gardent
         « Attaque 1000 » tout en AJOUTANT deux lignes au fil des paliers — le plateau
         est sur la ligne, pas sur le palier. */
      const avant = b.rangs[i - 1] ?? [];
      const ici = b.rangs[i] ?? [];
      const identique = avant.some(([s, v]) => ici.some(([s2, v2]) => s2 === s && v2 === v));
      if (identique) { cur++; if (cur > run) { run = cur; fin = i; } } else cur = 0;
    }
    if (run && (!best || run > best.plateau)) best = { id, b, plateau: run, fin };
  }
  return best;
}

/**
 * LES DEUX BANDES DU CHAMP `coef`, ET CE QU'ON NE PEUT PAS EN DIRE.
 *
 * ┌──── CE QUE LE RELEVÉ DIT, ET CE QU'IL NE DIT PAS ────────────────────────┐
 * │ VRAI : au-dessus du plus fort coefficient d'attaque, plus AUCUNE attaque.  │
 * │   La bande haute est peuplée exclusivement de buffs et d'effets.           │
 * │ FAUX : « deux populations qui ne se recouvrent pas ». Les buffs occupent    │
 * │   AUSSI la bande basse — cinquante-quatre d'entre eux partagent la plage    │
 * │   des attaques. Le coefficient ne dit donc pas à lui seul de quelle unité   │
 * │   il s'agit : c'est le TYPE de la compétence qui tranche, et le coefficient │
 * │   ne fait que le confirmer dans la bande haute.                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * LE SEUIL NE S'ÉCRIT PAS À LA MAIN. Il valait 1 000, choisi de mémoire. Il se
 * calcule : c'est le plus petit coefficient qui dépasse le plus fort coefficient
 * d'attaque du relevé. Aucun nombre en dur, et la phrase reste vraie au prochain
 * versement du client.
 */
function populationsDeCoefficient(): { haut: number; seuil: number; maxAttaque: number; basNonAttaque: number } | null {
  const avecCoef = base().competences.filter((c) => c.coef != null);
  const attaques = avecCoef.filter((c) => /Attaque/i.test(c.type ?? ""));
  if (!attaques.length) return null;
  const maxAttaque = Math.max(...attaques.map((c) => c.coef!));
  const haut = avecCoef.filter((c) => c.coef! > maxAttaque);
  if (!haut.length) return null;
  return {
    haut: haut.length,
    seuil: Math.min(...haut.map((c) => c.coef!)),
    maxAttaque,
    basNonAttaque: avecCoef.filter((c) => c.coef! <= maxAttaque && !/Attaque/i.test(c.type ?? "")).length,
  };
}

/** Le monstre à la plus haute défense du relevé. */
function monstreLePlusDur(): Monstre | null {
  return base().monstres.reduce<Monstre | null>((m, x) => (!m || (x.def ?? 0) > (m.def ?? 0) ? x : m), null);
}

/** La compétence d'attaque d'une classe dont la borne haute est la plus forte au
 *  dernier niveau. `null` si la classe n'a aucune compétence d'attaque chiffrée. */
function competenceLaPlusForte(classeFrancaise: string): Competence | null {
  const liste = base().competences.filter((c) =>
    c.classe === classeFrancaise && /Attaque/i.test(c.type ?? "") && c.niveaux?.dmax?.length);
  return liste.reduce<Competence | null>((m, c) => {
    const v = c.niveaux!.dmax!.at(-1) ?? 0;
    const mv = m?.niveaux?.dmax?.at(-1) ?? -1;
    return v > mv ? c : m;
  }, null);
}

/* ── Le porteur de l'exemple ────────────────────────────────────────────────── */

/**
 * LES QUATRE STATISTIQUES DU PORTEUR SONT LA QUESTION, PAS UNE DONNÉE.
 *
 * Aucun relevé ne dit comment un joueur répartit ses points : c'est son build. Les
 * valeurs ci-dessous sont donc les paramètres de l'exemple, et l'écran le dit — au
 * même titre qu'on choisit un monstre pour taper dessus. Elles ne portent aucune
 * pastille de certitude, parce qu'elles ne prétendent à rien.
 *
 * Le niveau, lui, VIENT du relevé : c'est le plafond déclaré par le builder
 * (`LVLMAX` de data.json est un plafond de familier ; le plafond de personnage est
 * celui que le formulaire de création impose, 200). On le passe en paramètre pour ne
 * pas le recopier ici.
 */
export const PORTEUR_EXEMPLE = { force: 300, endurance: 1000, dexterite: 200, intelligence: 150 };

function porteurPour(job: string, niveau: number, famille: string): Porteur {
  const colonne = FAMILLE_COLONNE[famille];
  const ligne = base().facteurs.find((f) => f.classe === job);
  const facteur = colonne && ligne ? Number(ligne[colonne]) : null;
  return {
    classe: job,
    classeFr: classeFr(job) ?? job,
    niveau,
    ...PORTEUR_EXEMPLE,
    facteurDeFamille: Number.isFinite(facteur) ? (facteur as number) : null,
  };
}

/* ── Ce que la page affiche ─────────────────────────────────────────────────── */

export type Planche = {
  /** Les cinq feuilles, dans l'ordre du calcul : de l'arme au dégât reçu. */
  feuilles: Feuille[];
  /** Le panneau de caractéristiques du build de l'exemple : ses lignes, et ses
   *  sources listées une seule fois — voir `panneauDeCaracteristiques`. */
  panneau: { lignes: LigneDeStat[]; sources: SourceDuPanneau[] };
  /** Ce que le build de l'exemple porte, en une phrase par pièce. */
  build: string[];
  /** Les constats chiffrés du relevé, pour les phrases de la page. */
  constats: {
    armes: number; monstres: number; competences: number; competencesDAttaque: number;
    codesNommes: number; codesSansNom: number;
    classes: number; famillesDArme: number;
    /** Combien de familles d'arme le RELEVÉ porte, tous fichiers confondus. Le
     *  dénominateur de « 7 sur N » était écrit à la main dans la phrase, et il était
     *  faux : le relevé compte aussi la main nue et une arbalète de test. */
    famillesDArmeTotal: number;
    panopliesNegatives: number; lignesNegatives: number;
    /** Les lignes négatives qui frappent DÈS LA PREMIÈRE pièce : on ne peut pas les
     *  éviter en ne complétant pas l'ensemble. */
    negativesDesUnePiece: number;
    setsQuiCoutentDesUnePiece: string[];
    bijouxATrente: number; plateaux: number;
    coefBuffMin: number; coefAttaqueMax: number; buffsAGrosCoef: number;
    /** Les buffs qui partagent la PLAGE des attaques. Ce nombre casse la phrase
     *  « deux populations qui ne se recouvrent pas » : elles se recouvrent en bas. */
    buffsDansLaBandeDesAttaques: number;
  };
};

/**
 * CE QUE LE RAIL DOIT SAVOIR, et rien de plus : combien de feuilles, combien de termes.
 *
 * Le badge d'un volet est un COMPTE, et un compte recopié à la main devient faux au
 * prochain versement du client — d'où cette fonction plutôt qu'un nombre dans la page.
 * Elle rappelle `planche()`, dont le résultat est calculé sur des relevés déjà en
 * mémoire : le second appel ne relit aucun fichier.
 */
export function chiffresDuCalcul() {
  const p = planche();
  return {
    feuilles: p.feuilles.length,
    termes: p.feuilles.reduce((s, f) => s + f.etapes.reduce((t, e) => t + e.termes.length, 0), 0),
    /* Les termes qu'on annonce comme non calculables. C'est le chiffre qui dit que le
       moteur ne bluffe pas, et il se compte tout seul. */
    absents: p.feuilles.reduce((s, f) =>
      s + f.etapes.reduce((t, e) => t + e.termes.filter((x) => x.certitude === "absent").length, 0), 0),
  };
}

/**
 * LA PLANCHE ENTIÈRE, calculée au rendu. Un seul appel, pour que les cinq feuilles
 * partagent le même porteur et la même arme — cinq exemples sans rapport entre eux
 * ne se lisent pas comme un moteur, ils se lisent comme cinq curiosités.
 */
let PLANCHE: Planche | null = null;

export function planche(): Planche {
  /* ELLE ÉTAIT CALCULÉE DEUX FOIS PAR RENDU : une fois par `chiffresDuCalcul()` pour
     le badge du rail, une fois par le volet lui-même. Les relevés étaient déjà en
     mémoire, mais les cinq feuilles, le panneau et les constats se refaisaient
     entièrement. Le résultat ne dépend que des relevés, qui ne changent pas dans un
     processus : on le garde. */
  if (PLANCHE) return PLANCHE;
  const B = base();
  const arme = armeDeReference();
  const pano = panoplieLaPlusCouteuse();
  const bijou = bijouAuPlusLongPlateau();
  const monstre = monstreLePlusDur();

  /* Un relevé absent ne doit pas faire tomber la page : la planche rend alors ce
     qu'elle a. C'est la même règle que partout ailleurs — un renseignement
     incomplet ne s'affiche pas, il ne casse rien. */
  const feuilles: Feuille[] = [];
  const apports: Apport[] = [];
  const build: string[] = [];

  const niveauMax = 200;
  let porteur: Porteur | null = null;
  let socle: { min: number; max: number; nom: string } | null = null;

  /* ── 1. L'arme ──────────────────────────────────────────────────────────── */
  if (arme?.k3 && arme.job) {
    porteur = porteurPour(arme.job, niveauMax, arme.k3);
    const bonusArme = (arme.b ?? []).map(([c, v]) => [fr(c), v] as [string, number]);
    const plat = bonusArme.filter(([l]) => l === "Attaque").reduce((s, [, v]) => s + v, 0);
    const pct = bonusArme.filter(([l]) => l === "Attaque %").reduce((s, [, v]) => s + v, 0);

    const a: Arme = {
      id: arme.i, nom: arme.n!, cle: arme.cle,
      degatsMin: arme.dn!, degatsMax: arme.dx!,
      famille: arme.k3, niveauRequis: arme.nr, bonus: bonusArme,
    };
    /* LE PLAFOND EST LU, il n'est plus écrit : MECH.arme.upgrade_normal.max. On le
       passe pour que la feuille MONTRE le terme non calculable — c'est la moitié de
       l'intérêt de cette première feuille. */
    const f = puissanceDArme(a, porteur, { bonusAttaquePlat: plat, pourcentDAttaque: pct, palierDAmelioration: B.plafondArme });
    feuilles.push(f);
    socle = { min: f.resultat ?? 0, max: f.resultatMax ?? 0, nom: arme.n! };

    for (const [l, v] of bonusArme) {
      apports.push({
        stat: l, valeur: v, de: arme.n!,
        source: `objets-stats.json ▸ champ b (Spec_Item.txt du client)`,
        certitude: "client",
      });
    }
    build.push(`${arme.n} — ${FAMILLE_FR[arme.k3] ?? arme.k3}, socle ${arme.dn} à ${arme.dx}, niveau requis ${arme.nr}`);
  }

  /* ── 2. La panoplie complète, ligne négative comprise ───────────────────── */
  if (pano) {
    /* TOUS LES SEUILS, pas seulement 4/4. Une première version ne gardait que les
       lignes à quatre pièces, et laissait donc tomber les 16 lignes qui frappent
       DÈS LA PREMIÈRE — les huit sets en Yggdrasil des classes légendaires, qui
       retirent 300 de dégâts JcJ pour une seule pièce portée. Sur un ensemble
       complet, les deux seuils s'appliquent. */
    const acquis = pano.paliers.filter((t) => t.valeur != null && t.pieces <= pano.pieces.length);
    for (const t of acquis) {
      apports.push({
        stat: fr(t.code), valeur: t.valeur!,
        de: `${pano.n} ${t.pieces === 1 ? "dès 1 pièce" : `${t.pieces}/${pano.pieces.length}`}`,
        source: `bonus-sources.json ▸ ensemble ${pano.id} (propItemEtc.inc). Tombe à ${t.pieces} pièce${t.pieces > 1 ? "s" : ""}.${t.valeur! < 0 ? " ELLE RETIRE, et le jeu ne l'affiche pas." : ""}`,
        certitude: "client",
      });
    }
    build.push(`${pano.n} — les ${pano.pieces.length} pièces : ${pano.pieces.map((p) => p.n ?? p.cle).join(", ")}`);

    /* LA FEUILLE DE LA PANOPLIE, à l'ensemble complet. Elle est SÉPARÉE du panneau
       de caractéristiques et ce n'est pas une redite : le panneau montre où les
       points atterrissent, cette feuille montre ce que le SEUIL déclenche — et donc
       s'il faut compléter. Ce sont deux questions différentes. */
    feuilles.push(bonusDePanoplie({
      nom: pano.n, id: pano.id, nbPieces: pano.pieces.length,
      lignes: (pano.paliers ?? [])
        .filter((t) => t.valeur != null)
        .map((t) => ({ stat: fr(t.code), valeur: t.valeur!, seuil: t.pieces }))
        /* Les lignes qui RETIRENT en dernier : on lit d'abord ce qu'on gagne, et la
           facture arrive à la fin — c'est l'ordre dans lequel on prend la décision. */
        .sort((a, b) => a.seuil - b.seuil || (b.valeur > 0 ? 1 : 0) - (a.valeur > 0 ? 1 : 0)),
    }, pano.pieces.length));
  }

  /* ── 3. L'accessoire à son dernier palier ───────────────────────────────── */
  if (bijou) {
    /* Le relevé nomme le bijou `n`, le moteur `nom` : la traduction se fait ICI, à la
       frontière, plutôt que d'imposer au moteur les noms de champs abrégés d'un
       relevé — il en lit cinq, aux conventions différentes. */
    const f = palierDeBijou({ nom: bijou.b.n, cle: bijou.b.cle, plafond: bijou.b.plafond, rangs: bijou.b.rangs }, bijou.b.plafond);
    feuilles.push(f);
    /* ┌──── LE BONUS PROPRE DU BIJOU EST UN APPORT, LUI AUSSI ──────────────────┐
       │ Le panneau ne comptait QUE les lignes du palier. Les Boucles d'Oreille   │
       │ Harpe portent « Attaque 1 500 » dans leur propre champ `b` — lu dans le   │
       │ client, au même titre que le reste — et le panneau annonçait 1 000 : le   │
       │ palier seul. Le builder, lui, comptait les deux (il lit `item.b` puis le  │
       │ palier) : les deux écrans du même lot donnaient 1 000 et 2 500 pour la    │
       │ même paire de boucles. Le palier REMPLACE le palier précédent ; il ne     │
       │ remplace pas le bonus de l'objet, rien dans le client ne le dit.          │
       └─────────────────────────────────────────────────────────────────────────┘ */
    const fiche = B.objets.find((o) => String(o.i) === bijou.id);
    for (const [code, v] of fiche?.b ?? []) {
      apports.push({
        stat: fr(code), valeur: v, de: bijou.b.n,
        source: "objets-stats.json ▸ champ b (Spec_Item.txt du client) — le bonus propre de l'objet, indépendant du palier.",
        certitude: "client",
      });
    }
    for (const [stat, v] of bijou.b.rangs[bijou.b.plafond] ?? []) {
      apports.push({
        stat, valeur: v, de: `${bijou.b.n} +${bijou.b.plafond}`,
        source: `paliers.json ▸ rangs[${bijou.b.plafond}] (accessory.inc). Le palier REMPLACE : elle ne s'ajoute pas.`,
        certitude: "client",
      });
    }
    build.push(`${bijou.b.n} amélioré à +${bijou.b.plafond} — plafond ${bijou.b.plafond}, plateau de ${bijou.plateau} paliers jusqu'au ${bijou.fin}${(fiche?.b ?? []).length ? `, et ${(fiche!.b ?? []).map(([c, v]) => `${fr(c)} ${v > 0 ? "+" : ""}${v}`).join(" · ")} en bonus propre` : ""}`);
  }

  /* ── 4. La compétence ───────────────────────────────────────────────────── */
  if (porteur && socle) {
    const comp = competenceLaPlusForte(porteur.classeFr ?? "");
    if (comp) {
      const niv = comp.niveaux?.dmax?.length ?? 1;
      /* LES TROIS NOMBRES DE LA BULLE SE COMPTENT ICI, sur les 197 compétences du
         relevé, au lieu d'être écrits dans la phrase du moteur. Le seuil des buffs
         n'est pas choisi : c'est le PLUS PETIT coefficient de la population haute, et
         le maximum des attaques est le plus grand de la population basse. Entre les
         deux, le relevé ne place rien — c'est le fait qu'on affiche. */
      const pop = populationsDeCoefficient();
      feuilles.push(puissanceDeCompetence(comp, niv, porteur, socle, pop
        ? { buffs: pop.haut, seuilBuff: pop.seuil, maxAttaque: pop.maxAttaque }
        : undefined));
    }
  }

  /* ── 5. Ce que la défense et l'élément laissent passer ──────────────────── */
  if (monstre && socle) {
    const attaque = socle.min;
    const etapeDef = reductionParDefense(attaque, monstre.def, `monstres.json ▸ ${monstre.nom}, champ def (niveau ${monstre.niv}, rang ${monstre.rang})`);
    /* L'élément le plus favorable du monstre : celui dont la résistance est la plus
       basse. C'est le geste utile — « avec quelle carte je tape ce boss ? » — et il se
       calcule, on ne le choisit pas. */
    const res = monstre.res ?? {};
    const meilleur = (Object.keys(res) as (keyof typeof res)[])
      .reduce((m, k) => (m == null || res[k] < res[m] ? k : m), null as string | null);
    const degatsApresDef = etapeDef.resultat ?? 0;
    const termeElem = meilleur
      ? apportDeLElement(res, meilleur as never, monstre.nom)
      : null;
    const facteur = termeElem?.valeur ?? 1;
    const final = Math.floor(degatsApresDef * facteur);
    const pv = monstre.pvEff ?? monstre.pv;

    feuilles.push({
      titre: "Ce qui arrive vraiment sur le monstre",
      sujet: `${monstre.nom} · niveau ${monstre.niv} · rang ${monstre.rang} · défense ${monstre.def}${monstre.vies ? ` · ${monstre.vies} vies` : ""}`,
      etapes: [
        etapeDef,
        {
          nom: "L'élément",
          formule: "dégâts × (1 − résistance de l'élément)",
          termes: termeElem ? [termeElem] : [{
            quoi: "Le relevé ne donne pas de résistance pour ce monstre",
            valeur: null,
            source: `monstres.json ▸ ${monstre.nom}, champ res absent`,
            certitude: "absent",
          }],
          resultat: final,
          unite: "dégâts",
        },
        /* ┌──── LE TERME QUI TOMBAIT SANS UN MOT ───────────────────────────────┐
           │ « Dégâts sur monstres % » (DST_MONSTER_DMG) est LU DANS LE CLIENT et  │
           │ ne concerne que cette feuille-ci : c'est le seul multiplicateur du     │
           │ jeu dont le nom dit qu'il s'applique aux monstres. Il n'était ni       │
           │ compté ni mentionné — l'arme de l'exemple en porte +20 et la panoplie  │
           │ −400, et le total n'en disait rien.                                   │
           │                                                                     │
           │ ON NE LE CHIFFRE PAS, et c'est un refus motivé, pas un oubli : les     │
           │ deux lignes vont en sens contraire et le client n'écrit NULLE PART     │
           │ comment elles se combinent. Sous une somme (−380 %) l'arme ne fait     │
           │ plus aucun dégât sur un monstre, ce qui est absurde ; sous un produit  │
           │ elle en fait un peu moins. Un dégât faux est pire qu'un dégât absent — │
           │ mais un dégât MUET est pire encore, parce qu'il passe pour complet.    │
           └─────────────────────────────────────────────────────────────────────┘ */
        (() => {
          const lignes: string[] = [];
          for (const [c, v] of arme?.b ?? []) if (fr(c) === "Dégâts sur monstres %") lignes.push(`${arme!.n} ${v > 0 ? "+" : ""}${v} %`);
          for (const t of pano?.paliers ?? []) {
            if (t.valeur != null && fr(t.code) === "Dégâts sur monstres %") lignes.push(`${pano!.n} à ${t.pieces} pièces ${t.valeur > 0 ? "+" : ""}${t.valeur} %`);
          }
          return {
            nom: "Les dégâts sur monstres",
            formule: "un multiplicateur qui ne concerne que les monstres — NON APPLIQUÉ",
            termes: [{
              quoi: lignes.length
                ? `${lignes.length} ligne${lignes.length > 1 ? "s" : ""} « Dégâts sur monstres % » sur le stuff de l'exemple`
                : "Aucune pièce de l'exemple ne porte de ligne « Dégâts sur monstres % »",
              valeur: null,
              detail: lignes.length
                ? `${lignes.join(" · ")}. Elles vont en sens contraire et le client n'écrit pas comment elles se combinent : sous une somme, ce coup ne ferait plus aucun dégât sur un monstre. Le nombre de coups ci-dessous ne les compte donc pas.`
                : undefined,
              source: "objets-stats.json et bonus-sources.json ▸ code DST_MONSTER_DMG",
              certitude: lignes.length ? "absent" : "client",
            }],
            resultat: final,
            unite: "dégâts",
          };
        })(),
        {
          nom: "Combien de coups",
          formule: "PV effectifs ÷ dégâts par coup",
          termes: [
            {
              quoi: monstre.vies && monstre.vies > 1
                ? `PV effectifs : ${monstre.pv.toLocaleString("fr-FR")} × ${monstre.vies} vies`
                : "PV du monstre",
              valeur: pv,
              detail: monstre.vies && monstre.vies > 1
                ? `La barre du jeu annonce ${monstre.pv.toLocaleString("fr-FR")}. Il faut la vider ${monstre.vies} fois : ${pv.toLocaleString("fr-FR")} au total.`
                : undefined,
              source: `monstres.json ▸ ${monstre.nom}, champs pv et vies`,
              certitude: monstre.vies && monstre.vies > 1 ? "deduit" : "client",
            },
            {
              quoi: "Dégâts par coup, résultat des deux étapes précédentes",
              valeur: final,
              source: "Résultat des étapes précédentes de cette feuille",
              certitude: "hypothese",
            },
          ],
          resultat: final > 0 ? Math.ceil(pv / final) : null,
        },
      ],
      resultat: final > 0 ? Math.ceil(pv / final) : null,
      unite: "coups",
      reserves: [
        "La formule de réduction par la défense n'est pas confirmée sur Airborn : le nombre de coups suit la même réserve.",
        "Ni le critique, ni le blocage, ni la vitesse d'attaque n'entrent dans ce compte : c'est un nombre de coups, pas une durée.",
        "Les lignes « Dégâts sur monstres % » du stuff ne sont pas appliquées : le client ne dit pas comment une ligne positive et une ligne négative se combinent.",
      ],
    });
  }

  /* ── Les constats chiffrés, calculés et non recopiés ────────────────────── */
  const famillesConnues = Object.entries(FAMILLE_COLONNE).filter(([, c]) => c != null).length;
  /* LE DÉNOMINATEUR SE COMPTE, il ne s'écrit pas. On ne retient que les familles
     d'armes qu'une CLASSE peut porter (champ `job` renseigné) : sans ce filtre, la
     « Main » — la main nue, `k3` valant HAND — compterait pour une famille d'arme. */
  const famillesDuReleve = new Set(
    B.objets.filter((o) => o.t1 === "WEAPON" && o.n && o.job && o.k3 && o.k3 !== "VIRTUAL").map((o) => o.k3!),
  ).size;
  const negatives = new Set<number>();
  let lignesNeg = 0, negDesUnePiece = 0;
  const setsQuiCoutentDesUnePiece = new Set<string>();
  for (const p of B.panoplies) {
    for (const t of p.paliers ?? []) {
      if (t.valeur == null || t.valeur >= 0) continue;
      negatives.add(p.id); lignesNeg++;
      /* LE SEUIL CHANGE TOUT. Une ligne négative à 4 pièces se paie en COMPLÉTANT
         l'ensemble — on peut choisir de ne pas le compléter. Une ligne négative à
         1 pièce se paie en la PORTANT : il n'y a pas d'échappatoire, et personne
         ne peut le voir en jeu. */
      if (t.pieces === 1) { negDesUnePiece++; setsQuiCoutentDesUnePiece.add(p.n); }
    }
  }
  const attaques = B.competences.filter((c) => /Attaque/i.test(c.type ?? ""));
  /* LE SEUIL DE LA BANDE HAUTE SE CALCULE (voir `populationsDeCoefficient`) : il
     était écrit 1 000 à la main, à deux endroits. */
  const pop = populationsDeCoefficient();
  const plateaux = Object.values(B.bijoux).filter((b) => b.plafond === 30).length;

  PLANCHE = {
    feuilles,
    panneau: panneauDeCaracteristiques(apports),
    build,
    constats: {
      armes: B.objets.filter((o) => o.t1 === "WEAPON" && o.n).length,
      monstres: B.monstres.length,
      competences: B.competences.length,
      competencesDAttaque: attaques.length,
      codesNommes: B.libelle.size,
      codesSansNom: B.codesTotal - B.libelle.size,
      classes: B.facteurs.length,
      famillesDArme: famillesConnues,
      famillesDArmeTotal: famillesDuReleve,
      panopliesNegatives: negatives.size,
      lignesNegatives: lignesNeg,
      negativesDesUnePiece: negDesUnePiece,
      setsQuiCoutentDesUnePiece: [...setsQuiCoutentDesUnePiece].sort((a, b) => a.localeCompare(b, "fr")),
      bijouxATrente: plateaux,
      plateaux: bijou?.plateau ?? 0,
      coefBuffMin: pop?.seuil ?? 0,
      coefAttaqueMax: pop?.maxAttaque ?? 0,
      buffsAGrosCoef: pop?.haut ?? 0,
      buffsDansLaBandeDesAttaques: pop?.basNonAttaque ?? 0,
    },
  };
  return PLANCHE;
}
