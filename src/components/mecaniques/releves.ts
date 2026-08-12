import fs from "node:fs";
import path from "node:path";

/**
 * CE QUE LE CLIENT DIT DES MÉCANIQUES — lu sur le disque, jamais recopié à la main.
 *
 * La page des mécaniques a longtemps montré des dessins et des mots. Elle porte
 * maintenant les FAITS qui étaient enfermés dans « Astuces de guilde » : un nom de
 * gemme qui ment, un plafond de sertissage que personne n'annonce, une échelle
 * d'amélioration qui ne s'arrête pas là où on le croit. Ces faits sont chiffrés —
 * et un chiffre écrit à la main dans du JSX devient faux au prochain versement du
 * client sans que personne ne s'en aperçoive.
 *
 * D'où ce module : tout ce qui se COMPTE se compte ici, sur
 * `public/wiki/objets-fiches.json` (12 134 objets relevés dans le client) et sur
 * les dossiers d'icônes. Les seules constantes écrites à la main sont des relevés
 * de LECTURE — l'ordre réel des neuf statistiques de sertissage, les coefficients
 * d'arène — qui ne vivent dans aucun de nos fichiers de données ; elles portent
 * chacune sa réserve à l'écran.
 *
 * Ce fichier touche au disque : il ne doit JAMAIS être importé par un composant
 * client. Même modèle que `src/components/objets/catalogue.ts`.
 *
 * BARUNA EST HORS SUJET : rien de ce qui porte ce nom n'est compté ni montré.
 * C'est pour ça que les filtres travaillent sur des motifs de NOM plutôt que sur
 * des préfixes de clé — les objets Baruna portent le mot dans leur nom.
 */

export type Fiche = {
  i: number;
  n: string;
  cle: string;
  ic?: string;
  d?: string;
  /** La famille du relevé : « arme », « stuff », « mode »… C'est elle qui dit
   *  qu'une pièce est un costume, et non son nom. */
  f?: string;
  /** L'emplacement du client (`PARTS_HAT`, `PARTS_CAP`…). Deux séries
   *  distinctes : les `PARTS_HAT/CLOTH/GLOVE/BOOTS` sont les emplacements de
   *  MODE, les `PARTS_CAP/UPPER_BODY/HAND/FOOT` ceux de l'armure. C'est la
   *  preuve, dans le relevé, qu'un costume s'ajoute à l'armure au lieu de la
   *  remplacer : ce ne sont pas les mêmes cases. */
  em?: string;
  /** Le TYPE affiché — « Coiffe (mode) », « Cape », « Masque »… C'est ce libellé
   *  que le guide de progression emploie pour compter la garde-robe, là où cette
   *  page compte par `em`. Les deux ne donnent pas le même total, et l'écart est
   *  affiché plutôt que laissé sans explication (voir `costumesQuiPaientSeuls`). */
  t?: string;
  /** Les bonus tels que le client les liste : [statistique, valeur]. */
  b?: [string, number][];
};

let PAR_CLE: Map<string, Fiche> | null = null;
let TOUT: Fiche[] | null = null;
let GENERE = "";

function charger(): { PAR_CLE: Map<string, Fiche>; TOUT: Fiche[] } {
  if (PAR_CLE && TOUT) return { PAR_CLE, TOUT };
  const f = path.join(process.cwd(), "public", "wiki", "objets-fiches.json");
  const d = JSON.parse(fs.readFileSync(f, "utf8")) as { genere?: string; objets: Fiche[] };
  GENERE = d.genere ?? "";
  TOUT = d.objets;
  PAR_CLE = new Map(d.objets.map((o) => [o.cle, o]));
  return { PAR_CLE, TOUT };
}

/** Les accents s'enlevent par les marques combinantes U+0300..U+036F, ecrites en
 *  echappement plutot qu'en caracteres bruts : la plage nue est invisible dans un
 *  editeur et se perd au premier copier-coller. */
const sansAccent = (s: string) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** La date de la fouille, telle que le relevé la porte lui-même. */
export const dateDuReleve = () => { charger(); return GENERE; };
/** L'objet du client par sa clé, ou `null` si ce relevé ne l'a pas. */
export const objet = (cle: string): Fiche | null => charger().PAR_CLE.get(cle) ?? null;
/** Plusieurs objets, dans l'ordre demandé, en sautant ceux qui manquent — une
 *  ligne absente vaut mieux qu'une ligne inventée. */
export const objets = (cles: string[]): Fiche[] =>
  cles.map(objet).filter((o): o is Fiche => !!o);

/* ── Les icônes ───────────────────────────────────────────────────────────── */

let ICONES: Set<string> | null = null;
function iconesDuJeu(): Set<string> {
  if (ICONES) return ICONES;
  try {
    ICONES = new Set(fs.readdirSync(path.join(process.cwd(), "public", "jeu", "icones")));
  } catch {
    ICONES = new Set();
  }
  return ICONES;
}

/**
 * L'icône d'un objet, ou `null`.
 *
 * 935 objets sur 12 134 n'ont pas de fichier sur le disque. On vérifie donc la
 * présence avant de rendre un chemin : une image cassée se lit comme un asset
 * manquant, et sur une planche de mécaniques on croirait à un objet qui n'existe
 * pas.
 */
export function iconeDe(o?: Fiche | null): string | null {
  if (!o?.ic || !iconesDuJeu().has(o.ic)) return null;
  return `/jeu/icones/${o.ic}`;
}

let PERCAGE: Set<string> | null = null;
function iconesDePercage(): Set<string> {
  if (PERCAGE) return PERCAGE;
  try {
    PERCAGE = new Set(fs.readdirSync(path.join(process.cwd(), "public", "airbuilder", "icons", "percage")));
  } catch {
    PERCAGE = new Set();
  }
  return PERCAGE;
}

/**
 * L'icône d'une carte de perçage, palier par palier.
 *
 * `carteDePercage()` de `lib/assetsJeu` ne connaît que les deux paliers que la
 * boutique propose (A/S et 7/10 %) et retombe sur le plus bas pour tout le reste :
 * elle rendrait l'image du 7 % pour un 12 %. Ici on demande le FICHIER exact et on
 * rend `null` s'il n'existe pas, pour que l'appelant écrive le palier en clair
 * plutôt que de montrer le dessin d'un autre.
 */
export function iconePercage(famille: string, palier: string): string | null {
  const f = `${sansAccent(famille)}-${sansAccent(palier)}.png`;
  return iconesDePercage().has(f) ? `/airbuilder/icons/percage/${f}` : null;
}

/* ── Les joyaux de sertissage ─────────────────────────────────────────────── */

/**
 * Les cinq familles de joyau, et les images que cette page emploie pour chacune.
 * La plage de niveaux n'est pas écrite ici : elle est lue dans la description du
 * client (voir `famillesDeJoyau`).
 *
 * `morceau` est le FRAGMENT — un second dessin du client, jamais branché
 * jusqu'ici. Vérifié image par image avant d'être posé : le morceau est un éclat
 * effilé là où le joyau est une pierre taillée, et sa teinte est celle de sa
 * famille. Le Diamant n'en a pas dans le relevé d'assets, d'où le `null` : on ne
 * lui prête pas le dessin d'une autre famille.
 */
const JOYAUX: { cle: string; img: string; morceau: string | null }[] = [
  { cle: "II_GEN_MAT_TOPAZ", img: "/jeu/mecaniques/gemme-topaze.webp", morceau: "/jeu/mecaniques/gemme-morceau-topaze.webp" },
  { cle: "II_GEN_MAT_RUBY", img: "/jeu/mecaniques/gemme-rubis.webp", morceau: "/jeu/mecaniques/gemme-morceau-rubis.webp" },
  { cle: "II_GEN_MAT_SAPPHIRE", img: "/jeu/mecaniques/gemme-saphir.webp", morceau: "/jeu/mecaniques/gemme-morceau-saphir.webp" },
  { cle: "II_GEN_MAT_EMERALD", img: "/jeu/mecaniques/gemme-emeraude.webp", morceau: "/jeu/mecaniques/gemme-morceau-emeraude.webp" },
  { cle: "II_GEN_MAT_DIAMOND", img: "/jeu/mecaniques/gemme-diamant.webp", morceau: null },
];

/**
 * LES HUIT RUNES DE RAMASSEUR, et la pierre TANK.
 *
 * `ICONE_RUNE_STAT` de `lib/assetsJeu` ne tient que les quatre runes de TENUE.
 * Le client en dessine huit autres pour le ramasseur, et elles portent une
 * distinction qu'aucun écran du site ne montrait : la même statistique existe en
 * version JcE et en version JcJ. Les noms de fichiers le disent (`-jce`, `-jcj`)
 * et les dessins le confirment — même silhouette d'orbe, deux teintes.
 */
export const RAMASSEUR: { f: string; nom: string }[] = [
  { f: "rune-ramasseur-force-jce", nom: "Force · JcE" },
  { f: "rune-ramasseur-force-jcj", nom: "Force · JcJ" },
  { f: "rune-ramasseur-intelligence-jce", nom: "Intelligence · JcE" },
  { f: "rune-ramasseur-intelligence-jcj", nom: "Intelligence · JcJ" },
  { f: "rune-ramasseur-dexterite", nom: "Dextérité" },
  { f: "rune-ramasseur-endurance", nom: "Endurance" },
  { f: "rune-ramasseur-asaleur", nom: "Assaleur" },
];
/** La pierre de la gamme TANK, telle que le client la dessine. */
export const RUNE_TANK = "/jeu/mecaniques/rune-tank.webp";

/**
 * Les cinq familles avec leur plage de niveaux et le nombre de gemmes NOMMÉES
 * qu'elles portent.
 *
 * La plage sort de la description du client (« joyau de niveau 60 -70 … ») : c'est
 * la même phrase que le joueur lit dans son infobulle, donc elle ne peut pas se
 * désynchroniser de ce qu'il a sous les yeux.
 */
export function famillesDeJoyau() {
  const { TOUT: tout } = charger();
  return JOYAUX.map(({ cle, img, morceau }) => {
    const o = objet(cle);
    const m = (o?.d ?? "").match(/niveau\s*(\d+)\s*-?\s*(\d+)?/);
    const nommee = new RegExp(`^${cle}0[1-9]$`);
    const nommees = tout.filter((x) => nommee.test(x.cle ?? "")).length;
    return {
      nom: o?.n ?? cle,
      plage: m ? (m[2] ? `${m[1]}–${m[2]}` : m[1]) : "",
      img,
      /** Le fragment, ou `null` quand le client n'en dessine pas pour la famille. */
      imgMorceau: morceau,
      nommees,
      /** Le sertisseur, nommé par le client lui-même. */
      sertisseur: /par ([A-ZÉÈ][\wéèêà]+)/.exec(o?.d ?? "")?.[1] ?? "",
    };
  });
}

/** Combien de gemmes nommées, toutes familles confondues. */
export const nombreDeGemmesNommees = () =>
  famillesDeJoyau().reduce((n, f) => n + f.nommees, 0);

/**
 * LE FAIT LE PLUS UTILE DE TOUTE LA PAGE, ET IL SE CALCULE.
 *
 * AirFlyff a changé l'ordre des neuf statistiques de sertissage sans retoucher
 * les textes d'objets, restés sur l'ordre du Flyff d'origine : le nom qu'on lit
 * décrit donc l'effet d'une AUTRE gemme. Ça se lisait comme une affirmation ;
 * ça se DÉMONTRE dans le relevé, et sans écrire un seul nom à la main.
 *
 * Les cinq familles de joyau portent neuf gemmes nommées chacune (`…TOPAZ04`) :
 * ce sont les anciens libellés. À côté, AirFlyff a ajouté neuf Diamants dont le
 * libellé DIT ce qu'ils font (`…DIAMOND_4` = « sertissage en siphon de vie ») et
 * qui suivent l'ordre du fichier. Rang par rang, on compare donc le nom ancien au
 * libellé neuf ; là où les deux ne parlent pas de la même statistique, le nom
 * ment.
 *
 * Conséquence voulue : si le serveur corrige ses libellés, le compte de noms faux
 * tombe tout seul et la page cesse d'accuser. Un « 7 sur 9 » écrit en dur, lui,
 * survivrait à sa correction.
 */
const RANGS_SERTISSAGE = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const capitale = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Deux libellés parlent-ils de la même statistique ? La comparaison est faite
 *  sur le début du mot, sans accents : le client écrit « Dexteritée » là où la
 *  gemme dit « dextérité », et une égalité stricte lirait ça comme un mensonge. */
function memeStat(a: string, b: string) {
  const x = sansAccent(a).trim(), y = sansAccent(b).trim();
  return !!x && !!y && (x.startsWith(y) || y.startsWith(x));
}

export function tableauDesGemmes() {
  return RANGS_SERTISSAGE.map((r) => {
    const ancien = objet(`II_GEN_MAT_TOPAZ0${r}`);
    const neuf = objet(`II_GEN_MAT_DIAMOND_${r}`);
    // « Diamant - sertissage en siphon de vie » → « Siphon de vie ».
    const reel = capitale((neuf?.n ?? "").replace(/^.*sertissage en\s*/i, "").trim());
    // « Topaze de maîtrise » → « maîtrise » ; « Topaze d'intelligence » → « intelligence ».
    const promesse = (ancien?.n ?? "").replace(/^Topaze\s+(?:de\s+|du\s+|d')/i, "").trim();
    return {
      rang: r,
      nom: ancien?.n ?? "",
      /** La phrase de l'infobulle, mot pour mot. */
      infobulle: ancien?.d ?? "",
      reel,
      neuf,
      juste: memeStat(promesse, reel),
    };
  }).filter((g) => g.nom && g.reel);
}

export const nombreDeGemmes = () => tableauDesGemmes().length;
export const nombreDeGemmesMenteuses = () => tableauDesGemmes().filter((g) => !g.juste).length;

/* ── Les runes ────────────────────────────────────────────────────────────── */

const PREFIXE_RUNE = "II_SYS_SYS_RUNE_";

/** Les familles de runes, et l'ordre dans lequel on les montre. La clé de
 *  famille se lit dans la clé de l'objet — aucune liste de noms à maintenir. */
const FAMILLES_RUNE: { clef: string; nom: string; sous: string }[] = [
  { clef: "eternelle", nom: "Arme Éternelle", sous: "un modèle d'arme par rune" },
  { clef: "luzaka", nom: "Arme Luzaka oubliée", sous: "la gamme TANK" },
  { clef: "vampirique", nom: "Arme Vampirique", sous: "critique et vitesse" },
  { clef: "yggdrasil", nom: "Arme en Yggdrasil purifié", sous: "le haut de la gamme" },
  { clef: "marteau", nom: "Marteau runique", sous: "sa propre série" },
  { clef: "tenue", nom: "Tenue & cape", sous: "par statistique" },
  { clef: "ramasseur", nom: "Ramasseur", sous: "JcE ou JcJ" },
  { clef: "familier", nom: "Familier", sous: "JcE ou JcJ" },
];

function familleDeRune(o: Fiche): string {
  const r = (o.cle ?? "").slice(PREFIXE_RUNE.length);
  if (r.startsWith("TENUE_") || r.startsWith("WEAP")) return "tenue";
  if (r.startsWith("SPET_")) return "familier";
  if (r.startsWith("PET_")) return "ramasseur";
  if (["VEMPAIN", "ANCIENT", "YGGDRASIL"].includes(r)) return "marteau";
  if (r.endsWith("_TANK")) return "eternelle";
  if (r.endsWith("_ANCIENT")) return "luzaka";
  if (r.endsWith("_VEMPIRE")) return "vampirique";
  if (r.endsWith("_YGGDRASILL")) return "yggdrasil";
  return "autre";
}

/** Le code d'arme d'une rune de gamme (`SWO`, `AXT`…), ou `""`. C'est lui qui
 *  permet de voir qu'une gamme a un modèle en moins que ses voisines. */
const modeleDeRune = (o: Fiche): string => {
  const m = (o.cle ?? "").slice(PREFIXE_RUNE.length).match(/^([A-Z]{3})_/);
  return m ? m[1] : "";
};

/** Les gammes d'ARME, celles qui se comparent entre elles modèle par modèle. */
const GAMMES_ARME = ["eternelle", "luzaka", "vampirique", "yggdrasil"];

/** Ce que le client appelle chaque code d'arme — pris dans le NOM de la rune
 *  éternelle correspondante, jamais deviné. */
function nomDeModele(codes: string[], runes: Fiche[]): Record<string, string> {
  const n: Record<string, string> = {};
  for (const c of codes) {
    const ref = runes.find((o) => modeleDeRune(o) === c && familleDeRune(o) === "eternelle")
      ?? runes.find((o) => modeleDeRune(o) === c);
    // « Rune Doloire Éternelle (TANK) » → « Doloire ».
    n[c] = ref ? (ref.n.match(/^Rune ([^(]+?)(?: [ÉE]ternel\w*| Luzaka| Vampirique| en Yggdrasil)/)?.[1] ?? ref.n) : c;
  }
  return n;
}

/**
 * TOUT CE QU'ON PEUT DIRE DES RUNES SANS RIEN SUPPOSER.
 *
 * Trois anomalies sortent du relevé, et les trois sont calculées ici plutôt que
 * décrites à la main :
 *
 *  · `tankMenteuses` — une rune dont le nom annonce « (TANK) » et dont les bonus
 *    ne portent NI PV max NI Endurance. Le nom, la description et l'effet réel
 *    disent alors trois choses différentes.
 *  · `intruses` — une rune dont TOUS les bonus sont défensifs dans une gamme qui,
 *    elle, ne l'est pas. Le test est volontairement strict : dans la gamme TANK,
 *    où le défensif est la règle, il ne remonte rien.
 *  · `doublons` — deux runes différentes qui portent exactement le même nom.
 *
 * Si le serveur corrige l'une d'elles, le bloc correspondant disparaît de la page
 * de lui-même. C'est le but : une anomalie décrite en dur survivrait à sa
 * correction et ferait mentir la page.
 */
export function runes() {
  const { TOUT: tout } = charger();
  const toutes = tout.filter((o) => (o.cle ?? "").startsWith(PREFIXE_RUNE));

  const familles = FAMILLES_RUNE.map((f) => ({
    ...f,
    membres: toutes.filter((o) => familleDeRune(o) === f.clef),
  }));

  const defensive = (o: Fiche) =>
    !!o.b?.length && o.b.every(([s]) => /pv max|endurance/i.test(s));

  const tankMenteuses = toutes.filter(
    (o) => /\(TANK\)/.test(o.n) && !!o.b?.length && !o.b.some(([s]) => /pv max|endurance/i.test(s))
  );

  const intruses: Fiche[] = [];
  for (const g of GAMMES_ARME) {
    const m = toutes.filter((o) => familleDeRune(o) === g);
    const def = m.filter(defensive);
    // Minoritaire dans sa gamme, et pas déjà signalée par son nom.
    if (def.length && def.length * 2 < m.length) {
      for (const o of def) if (!tankMenteuses.includes(o) && !/\(TANK\)/.test(o.n)) intruses.push(o);
    }
  }

  const parNom: Record<string, Fiche[]> = {};
  for (const o of toutes) (parNom[o.n] ??= []).push(o);
  const doublons = Object.values(parNom).filter((l) => l.length > 1);

  // Un modèle d'arme servi par les autres gammes et absent d'une gamme.
  const modeles = [...new Set(toutes.filter((o) => GAMMES_ARME.includes(familleDeRune(o))).map(modeleDeRune))].filter(Boolean);
  const libelle = nomDeModele(modeles, toutes);
  const manquants: { gamme: string; modele: string }[] = [];
  for (const g of GAMMES_ARME) {
    const servis = new Set(toutes.filter((o) => familleDeRune(o) === g).map(modeleDeRune));
    for (const c of modeles) {
      if (!servis.has(c)) {
        manquants.push({ gamme: FAMILLES_RUNE.find((f) => f.clef === g)?.nom ?? g, modele: libelle[c] ?? c });
      }
    }
  }

  return { total: toutes.length, familles, tankMenteuses, intruses, doublons, manquants };
}

/* ── Le perçage ───────────────────────────────────────────────────────────── */

/** Les paliers dans l'ordre du jeu, pour que la planche ne les range pas par
 *  hasard. Ce qui n'est pas dans cette liste est ajouté à la fin : on préfère un
 *  palier mal placé à un palier perdu. */
const ORDRE_ATTAQUE = ["D", "C", "B", "A", "S", "R"];
const ORDRE_DEFENSE = ["2", "3", "4", "7", "10", "12"];

function classer(paliers: string[], ordre: string[]) {
  return [...paliers].sort((a, b) => {
    const ia = ordre.indexOf(a), ib = ordre.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

/**
 * LES CARTES DE PERÇAGE DU CLIENT, familles et paliers.
 *
 * La planche n'en montrait que deux paliers par famille — ceux que la boutique
 * propose. Le client en a bien plus, et l'écart n'était écrit nulle part : une
 * arme peut prendre une carte de rang R, une tenue une carte à 12 %.
 *
 * Les cartes Baruna ne passent pas les motifs (leur nom porte « de Baruna »),
 * donc elles ne sont ni comptées ni montrées.
 */
export function cartesDePercage() {
  const { TOUT: tout } = charger();
  const ATK = /^carte (feu|eau|air|foudre|terre) \((d|c|b|a|s|r)\)$/;
  const DEF = /^carte (?:du )?(neant|volcano|oceane|fulgur|seisme) \((\d+)%\)$/;

  const lire = (motif: RegExp) => {
    const par: Record<string, { famille: string; paliers: { palier: string; fiche: Fiche }[] }> = {};
    for (const o of tout) {
      const m = sansAccent(o.n).match(motif);
      if (!m) continue;
      // Le nom affiché vient de la fiche : « Carte du Néant » garde son « du ».
      const famille = o.n.replace(/^Carte (?:du )?/, "").replace(/\s*\(.*\)$/, "");
      (par[famille] ??= { famille, paliers: [] }).paliers.push({ palier: m[2].toUpperCase(), fiche: o });
    }
    return Object.values(par);
  };

  const rangeur = (l: ReturnType<typeof lire>, ordre: string[]) =>
    l.map((f) => ({
      ...f,
      paliers: classer(f.paliers.map((p) => p.palier), ordre).map(
        (p) => f.paliers.find((x) => x.palier === p)!
      ),
    }));

  const attaque = rangeur(lire(ATK), ORDRE_ATTAQUE);
  const defense = rangeur(lire(DEF), ORDRE_DEFENSE);
  const compte = (l: ReturnType<typeof lire>) => l.reduce((n, f) => n + f.paliers.length, 0);
  return { attaque, defense, nAttaque: compte(attaque), nDefense: compte(defense), total: compte(attaque) + compte(defense) };
}

/** Les dix cartes d'élémentarisation — celles qui montent l'ÉLÉMENT d'une pièce,
 *  et qu'on confond avec les cartes de perçage parce qu'elles s'appellent aussi
 *  « Carte ». Deux par élément : une obsolète qui plafonne à +5, une complète.
 *  La plage vient de la description du client. */
export function cartesDElement() {
  const CLES = [
    "II_GEN_MAT_ELE_TOUCH", "II_GEN_MAT_ELE_FLAME",
    "II_GEN_MAT_ELE_LAKE", "II_GEN_MAT_ELE_RIVER",
    "II_GEN_MAT_ELE_GALE", "II_GEN_MAT_ELE_CYCLON",
    "II_GEN_MAT_ELE_STONE", "II_GEN_MAT_ELE_DESERT",
    "II_GEN_MAT_ELE_VOLTAGE", "II_GEN_MAT_ELE_GENERATOR",
  ];
  return objets(CLES).map((o) => ({
    fiche: o,
    plage: /\+1 à \+(\d+)/.exec(o.d ?? "")?.[0] ?? "",
    obsolete: /obsolete/i.test(o.d ?? ""),
  }));
}

/* ── L'échelle d'amélioration ─────────────────────────────────────────────── */

/**
 * DE +1 À +30, ce qu'il faut à chaque étage.
 *
 * L'ancienne page disait « l'échelle ne s'arrête pas à +20 » sans dire avec quoi
 * on monte. Chaque étage cite donc les objets du client, et c'est le client qui
 * décrit ce qu'ils font : les descriptions affichées sont ses phrases, pas les
 * nôtres. Un objet absent du relevé disparaît de sa ligne sans casser le tableau.
 */
export const ECHELLE: { de: string; titre: string; cles: string[] }[] = [
  { de: "+1 → +10", titre: "L'amélioration ordinaire", cles: ["II_GEN_MAT_ORICHALCUM01", "II_GEN_MAT_MOONSTONE"] },
  { de: "Passage en Artefact", titre: "La pièce change de nature", cles: ["II_SYS_SYS_PLAN_ARTEFACT", "II_SYS_SYS_STONE_ARTEFACT", "II_SYS_SYS_SPRO4_ARTEFACT"] },
  { de: "+11 → +20", titre: "L'étage Artefact", cles: ["II_SYS_SYS_ORI2_ARTEFACT", "II_SPROTECT_PURE", "II_SYS_SYS_ROCHE_ARTEFACT", "II_GPROTECT_LUNAIRE"] },
  { de: "+21 → +30", titre: "Les parures du Bastion de l'Archange", cles: ["II_PIERRE_AMEL_DPS", "II_PIERRE_AMEL_TANK", "II_APROTECT_LUNAIRE"] },
  { de: "Sertissage 6 → 8", titre: "Le plafond que personne n'annonce", cles: ["II_SYS_SYS_DIAMOND_ARTEFACT"] },
];

/** Les parchemins qui changent le TAUX, avec la phrase du client. Les trois
 *  premiers sont des bonus de réussite, les cinq derniers une réussite
 *  garantie — d'où deux groupes plutôt qu'une liste. */
export const PARCHEMINS_TAUX = ["II_SYS_SYS_SCR_SMELTING", "II_SYS_SYS_SCR_SUPERSMELTING", "II_SYS_SYS_SCR_NOR_SMELTING01", "II_SYS_SYS_SCR_NOR_SMELTING02", "II_SYS_SYS_SCR_NOR_SMELTING03", "II_SYS_SYS_SCR_SMELTING2"];

/**
 * DEUX FAMILLES DE PARCHEMINS QU'ON LISAIT COMME UNE SEULE.
 *
 * La page disait « les taux affichés sont des bonus, pas des probabilités de
 * base ». C'est vrai du Sfusion (« augmentant le taux … de 10 % ») et faux des
 * trois Parchemins d'amélioration (« 100 % de chance d'amélioration d'une arme
 * de +3 à +6 ») : ceux-là ne s'ajoutent à rien, ils REMPLACENT le taux. Confondre
 * les deux fait empiler un parchemin sur un autre en croyant cumuler.
 *
 * Le tri se fait donc sur la phrase du client, pas sur une liste écrite à la
 * main : « augmentant le taux … de N % » → bonus ; « N % de chance » →
 * probabilité. Ce qui ne dit ni l'un ni l'autre reste dans `garanti`.
 */
export function parcheminsClasses() {
  const l = objets(PARCHEMINS_TAUX);
  const lire = (o: Fiche) => {
    const d = o.d ?? "";
    const bonus = /augmentant le taux[^.]*?de\s*(\d+)\s*%/i.exec(d);
    const remplace = /(\d+)\s*%\s*de chance/i.exec(d);
    const garanti = /garantissant[^.]*?(\d+)\s*%/i.exec(d);
    // « efficace jusqu'à un enchantement +7 », « de +3 à +6 », « une arme +9 ».
    const plage = /(?:de\s*)?\+(\d+)\s*(?:à|a)\s*\+(\d+)/.exec(d);
    const jusqua = /jusqu.à(?: un enchantement)?\s*\+(\d+)/i.exec(d);
    const seul = /une arme\s*\+(\d+)/i.exec(d);
    return {
      fiche: o,
      pct: Number(bonus?.[1] ?? remplace?.[1] ?? garanti?.[1] ?? 0),
      genre: bonus ? "ajoute" : garanti ? "garantit" : remplace ? "remplace" : "autre",
      plage: plage ? `+${plage[1]} → +${plage[2]}` : jusqua ? `jusqu'à +${jusqua[1]}` : seul ? `+${seul[1]}` : "",
      // Les deux limites que seul le client écrit, et que personne ne relit.
      unTir: /une seule tentative/i.test(d),
      pasArmure: /ne fonctionne pas pour les armures/i.test(d),
      pasElement: /ne fonctionne pas pour les élémentarisations/i.test(d),
      surElement: /élémentarisation/i.test(d),
    };
  };
  const tout = l.map(lire);
  return {
    ajoutent: tout.filter((x) => x.genre === "ajoute" || x.genre === "garantit"),
    remplacent: tout.filter((x) => x.genre === "remplace"),
    autres: tout.filter((x) => x.genre === "autre"),
    total: tout.length,
    /** COMBIEN L'ÉCRIVENT, et pas « tous ». La page annonçait « la limite que
     *  tous partagent : un parchemin n'est actif que pour une seule tentative ».
     *  Seuls les trois Sfusion le disent ; les trois Parchemins d'amélioration
     *  n'en parlent pas. Étendre la phrase aux six revenait à inventer une
     *  limite sur la moitié d'entre eux — on compte donc ceux qui l'écrivent. */
    unTir: tout.filter((x) => x.unTir).length,
  };
}
export const PARCHEMINS_ABSOLUS = ["II_SYS_SYS_SCR_ENCHANT_ABSOLUTE06", "II_SYS_SYS_SCR_ENCHANT_ABSOLUTE07", "II_SYS_SYS_SCR_ENCHANT_ABSOLUTE08", "II_SYS_SYS_SCR_ENCHANT_ABSOLUTE09", "II_SYS_SYS_SCR_ENCHANT_ABSOLUTE10"];

/**
 * Tout ce que le PNJ « Donjon Luca » échange, et ses deux monnaies.
 *
 * Le relevé le dit dans les descriptions plutôt que dans une table de PNJ : on
 * cherche donc les objets dont la description cite ce PNJ. C'est le passage
 * obligé de tout le haut niveau, et personne ne l'annonce en jeu.
 */
export function comptoirDeLuca() {
  const { TOUT: tout } = charger();
  const cites = tout.filter((o) => /donjon luca/i.test(o.d ?? ""));
  // Le même parchemin existe en version liée : deux clés, un seul objet utile.
  const vus = new Set<string>();
  const uniques = cites.filter((o) => (vus.has(o.n) ? false : (vus.add(o.n), true)));
  const monnaies = uniques.filter((o) => /monnaie d.échange/i.test(o.d ?? ""));
  return { objets: uniques.filter((o) => !monnaies.includes(o)), monnaies };
}

/* ── LE SECOND TÉMOIN : la table de l'AirBuilder ───────────────────────────
 *
 * Jusqu'ici cette page n'avait qu'une source, `objets-fiches.json` — ce que le
 * client ÉCRIT sur un objet. Il en existe une deuxième, indépendante et déjà
 * dans le dépôt : `public/airbuilder/data.json`, la table de valeurs du moteur
 * du builder. Les deux ne disent pas la même chose : la première donne les NOMS
 * et les phrases, la seconde donne les CHIFFRES.
 *
 * C'est précieux pour deux raisons.
 *
 *  · Les plafonds de sertissage, les valeurs de gemme de costume et les
 *    probabilités de lignes de rareté ne sont écrits NULLE PART dans les
 *    infobulles. Sans cette table, il faudrait les taper à la main.
 *  · Là où les deux sources se recoupent, l'accord vaut démonstration et le
 *    désaccord vaut avertissement. Les neuf Diamants du client et la liste
 *    `GEMU` du builder tombent rang pour rang dans le même ordre : c'est ce qui
 *    transforme « les gemmes mentent » d'affirmation en constat vérifiable par
 *    deux fichiers que personne n'a écrits ensemble.
 *
 * Rien n'est recopié : si le builder est reversé, les chiffres de la page
 * suivent, et si un accord se casse la page le dit d'elle-même.
 */

type Chiffre = { fr: string; v: number; t?: number };
type TableBuilder = {
  GEMU?: Chiffre[];
  GEMC?: Chiffre[];
  DIASTATS?: string[];
  ITEMS?: { fashion?: PieceFashion[] };
  MECH?: { arme?: MecaArme };
};
type PieceFashion = {
  n: string; set?: string; piece?: string; sex?: string; ic?: string;
  cat?: string; b?: [string, number][]; setb?: [string, number][];
};
type MecaArme = {
  rarete_pool?: { stat: string; min: number; max: number }[];
  rarete_lignes?: { amount: number; chance: number }[];
};

let TABLE: TableBuilder | null = null;
function builder(): TableBuilder {
  if (TABLE) return TABLE;
  try {
    const f = path.join(process.cwd(), "public", "airbuilder", "data.json");
    TABLE = JSON.parse(fs.readFileSync(f, "utf8")) as TableBuilder;
  } catch {
    TABLE = {};
  }
  return TABLE;
}

/**
 * Les neuf statistiques de sertissage AVEC leur plafond, dans l'ordre de la
 * table de valeurs.
 *
 * La page listait les neuf noms et rien d'autre : on savait qu'une gemme donne
 * de la Force sans savoir jusqu'où. Le plafond est ce qui permet de comparer
 * deux builds, et c'est justement ce que l'infobulle ne dit pas.
 */
export const plafondsDeSertissage = () =>
  (builder().GEMU ?? []).map((g) => ({ stat: g.fr, max: g.v }));

/**
 * LES DOUBLETS DE VOCABULAIRE DU CLIENT, et pourquoi il faut les traiter.
 *
 * AirFlyff nomme plusieurs fois la même statistique avec deux mots : « HP max »
 * et « PV max », « Dégâts PvP » et « Dégâts JcJ », « Siphon de vie » et « Melee
 * Stealhp ». Comparer les libellés à la lettre faisait donc passer trois rangs
 * pour un désaccord entre les deux fichiers, alors que les deux parlent de la
 * même chose — et ça sous-estimait précisément la démonstration qu'on veut
 * faire. Deux plafonds disparaissaient au passage, faute d'être retrouvés.
 *
 * On ramène donc chaque libellé à un mot canonique avant de comparer. C'est une
 * équivalence de VOCABULAIRE, pas une supposition sur le jeu : PvP et JcJ sont
 * la même abréviation dans deux langues, HP et PV aussi. La page dit à l'écran
 * combien de rangs passent par un doublet, pour qu'on ne prenne pas cette
 * normalisation pour une donnée.
 */
const DOUBLETS: [RegExp, string][] = [
  // L'ordre compte : « melee stealhp » d'abord, sinon rien ne l'attrape.
  [/melee\s*steal\s*hp|steal\s*hp/g, "siphon de vie"],
  [/\bsyphon\b/g, "siphon"],
  [/\bhp\b/g, "pv"],
  [/\bpvp\b/g, "jcj"],
  [/\bmp\b/g, "pm"],
];

/** Le libellé ramené à son mot canonique : sans accents, sans « max », et avec
 *  les doublets du client résolus. */
function canon(s: string): string {
  let x = sansAccent(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\bmax\b/g, " ");
  for (const [re, vers] of DOUBLETS) x = x.replace(re, vers);
  return x.replace(/\s+/g, " ").trim();
}

/** Deux libellés désignent-ils la même statistique, doublets compris ? La
 *  comparaison reste sur le début du mot : le client écrit « Dexteritée » là où
 *  la table écrit « Dextérité ». */
function memeStatique(a: string, b: string): boolean {
  const x = canon(a), y = canon(b);
  return !!x && !!y && (x.startsWith(y) || y.startsWith(x));
}

/** Le libellé passe-t-il par un doublet plutôt que par une égalité franche ?
 *  C'est ce qui permet de le DIRE à l'écran au lieu de le masquer. */
const parDoublet = (a: string, b: string) =>
  memeStatique(a, b) && !(() => {
    const x = sansAccent(a).replace(/[^a-z0-9 ]+/g, " ").replace(/\bmax\b/g, " ").replace(/\s+/g, " ").trim();
    const y = sansAccent(b).replace(/[^a-z0-9 ]+/g, " ").replace(/\bmax\b/g, " ").replace(/\s+/g, " ").trim();
    return !!x && !!y && (x.startsWith(y) || y.startsWith(x));
  })();

/** Le plafond d'une statistique, quel que soit le mot employé pour la nommer. */
export function plafondDeStat(nom: string): number | null {
  for (const { stat, max } of plafondsDeSertissage()) {
    if (memeStatique(nom, stat)) return max;
  }
  return null;
}

/**
 * LA PREUVE DU DÉCALAGE, PAR RECOUPEMENT DE DEUX FICHIERS.
 *
 * Le builder porte les mêmes neuf statistiques DEUX FOIS, dans deux ordres qui
 * ne se ressemblent pas : `DIASTATS` alimente la liste déroulante que le joueur
 * voit, `GEMU` porte les valeurs. On compare donc, rang par rang, l'ordre de
 * `GEMU` aux neuf Diamants d'AirFlyff — deux fichiers que personne n'a écrits
 * ensemble. Là où les neuf rangs concordent, l'ordre réel est établi ; et il
 * n'est pas celui de la liste déroulante.
 *
 * `concordent` retombe à `false` tout seul si l'un des deux fichiers est
 * corrigé : c'est le but, la page cesserait alors d'affirmer.
 */
export function ordresDeSertissage() {
  const fichier = plafondsDeSertissage().map((x) => x.stat);
  const affiche = builder().DIASTATS ?? [];
  const table = tableauDesGemmes();
  const rangs = table.map((g, i) => ({
    rang: g.rang,
    diamant: g.reel,
    table: fichier[i] ?? "",
    concorde: !!fichier[i] && memeStatique(g.reel, fichier[i]),
    /** Concordance obtenue en résolvant un doublet de vocabulaire, pas par
     *  égalité franche des libellés. */
    doublet: !!fichier[i] && parDoublet(g.reel, fichier[i]),
  }));
  // La comparaison des deux ordres se fait sur les noms canoniques : « PV max »
  // et « HP max » sont le même rang, « Intelligence » en rang 1 ou en rang 9 ne
  // l'est pas.
  const memeRangPartout = fichier.length === affiche.length
    && fichier.every((s, i) => memeStatique(s, affiche[i] ?? ""));
  return {
    fichier, affiche,
    rangs,
    concordent: rangs.length > 0 && rangs.every((r) => r.concorde),
    justes: rangs.filter((r) => r.concorde).length,
    doublets: rangs.filter((r) => r.doublet).length,
    /** Les deux listes du builder rangent-elles les neuf dans le même ordre ? */
    memeRangPartout,
  };
}

/**
 * Ce que la rareté tire vraiment : le vivier de statistiques et le nombre de
 * lignes.
 *
 * La section Rareté ne montrait que les six parchemins. Ce qui décide de la
 * valeur d'une arme rare n'est pourtant pas le palier mais le TIRAGE : combien
 * de lignes, prises dans quel vivier. Ces deux tables ne sont dans aucune
 * infobulle.
 */
export function rareteChiffree() {
  const m = builder().MECH?.arme ?? {};
  const lignes = (m.rarete_lignes ?? []).slice().sort((a, b) => a.amount - b.amount);
  return {
    vivier: m.rarete_pool ?? [],
    lignes,
    /** Les chances doivent faire 100 : si elles ne le font pas, on le montre. */
    somme: lignes.reduce((n, l) => n + l.chance, 0),
  };
}

/* LES VALEURS D'ÉVEIL DE LA TABLE DU BUILDER NE SONT PLUS LUES.
 *
 * `MECH.arme.eveil` existait ici et ne concordait pas avec les parchemins d'éveil
 * FIXE du client. La page portait donc les deux séries avec une réserve « on ne
 * sait pas laquelle croire » — exactement le demi-fait qu'on ne publie plus. Les
 * parchemins du client, eux, sont complets et disent leur rang : ils suffisent.
 * Le champ reste dans le fichier de données, il ne remonte plus à l'écran. */

/* ── LES COSTUMES ─────────────────────────────────────────────────────────
 *
 * LE TROU DU SITE. Le mot « fashion » traverse quatre fichiers de code et
 * n'était expliqué sur aucune page : ni quelles pièces en sont, ni si leurs
 * bonus comptent dans les statistiques, ni ce qu'on y sertit, ni ce qu'on perd
 * en défaisant. Tout ce qui suit se lit dans les fichiers ; ce qui ne s'y lit
 * pas est signalé comme absent plutôt que comblé.
 */

/** Les quatre emplacements de costume, dans l'ordre où le jeu les range. Les
 *  libellés ne sont pas écrits ici : ils sont LUS dans la description des
 *  joyaux (« Joyau utilisé pour les coiffes »). */
const JOYAUX_COSTUME: { cle: string; img: string; morceau: string; imgMorceau: string; coffret: string }[] = [
  { cle: "II_GEN_MAT_GARNET", img: "gemme-costume-grenat", morceau: "II_SYS_SYS_SCR_GARNET", imgMorceau: "gemme-costume-morceau-grenat", coffret: "II_SYS_SYS_SCR_BX_GARNET" },
  { cle: "II_GEN_MAT_TURQUOISE", img: "gemme-costume-turquoise", morceau: "II_SYS_SYS_SCR_TURQUOISE", imgMorceau: "gemme-costume-morceau-turquoise", coffret: "II_SYS_SYS_SCR_BX_TURQUOISE" },
  { cle: "II_GEN_MAT_AQUAMARINE", img: "gemme-costume-aigue-marine", morceau: "II_SYS_SYS_SCR_AQUAMARINE", imgMorceau: "gemme-costume-morceau-aigue-marine", coffret: "II_SYS_SYS_SCR_BX_AIGUEMARINE" },
  { cle: "II_GEN_MAT_AMETHYST", img: "gemme-costume-amethyste", morceau: "II_SYS_SYS_SCR_AMETHYST", imgMorceau: "gemme-costume-morceau-amethyste", coffret: "II_SYS_SYS_SCR_BX_AMETHYST" },
];

/**
 * LES QUATRE FAMILLES DE JOYAU DE COSTUME, une par pièce.
 *
 * Le fait qui compte, et qu'aucune interface ne dit : le joyau dépend de la
 * PIÈCE. Un Grenat ne va que sur une coiffe, une Améthyste que sur des bottes.
 * La pièce se lit dans la description du joyau, la liste des statistiques
 * possibles dans celle du coffret : les deux phrases sont celles que le joueur a
 * sous les yeux, donc elles ne peuvent pas se désynchroniser de son écran.
 *
 * À côté du joyau brut, AirFlyff a posé des joyaux NOMMÉS (`…_GARNET_FOR`) —
 * exactement le geste qu'il a fait sur les Diamants d'arme. On les compte plutôt
 * que de l'annoncer.
 */
export function joyauxDeCostume() {
  const { TOUT: tout } = charger();
  return JOYAUX_COSTUME.map(({ cle, img, morceau, imgMorceau, coffret }) => {
    const brut = objet(cle);
    const nommees = tout.filter((o) => (o.cle ?? "").startsWith(`${cle}_`));
    const boite = objet(coffret);
    // « … aux statistiques prédéfinies (FOR, END, DEX, INT, Attaque, Puissance
    // magique. » — la parenthèse du client n'est pas toujours refermée, d'où la
    // découpe sur la dernière ouvrante plutôt que sur une paire.
    const apres = (boite?.d ?? "").split("(").slice(1).join("(");
    const stats = apres
      ? apres.replace(/[).\s]+$/, "").split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean)
      : [];
    return {
      brut,
      nom: brut?.n ?? cle,
      /** « Joyau utilisé pour les coiffes. » → « coiffes ». */
      piece: /pour (?:les|la|le|l.)\s*([^.]+)/i.exec(brut?.d ?? "")?.[1]?.trim() ?? "",
      img: `/jeu/mecaniques/${img}.webp`,
      imgMorceau: `/jeu/mecaniques/${imgMorceau}.webp`,
      morceau: objet(morceau),
      coffret: boite,
      stats,
      nommees,
    };
  });
}

/** Ce que le builder propose pour un emplacement de gemme de costume, avec les
 *  valeurs. `GEMC` compte plus d'entrées que de noms : le nom qui revient est
 *  celui que DEUX pièces partagent, et c'est la trace de la structure « quatre
 *  statistiques communes plus deux par pièce ». */
export function gemmesCostumeDuBuilder() {
  const entrees = builder().GEMC ?? [];
  const vus = new Map<string, number>();
  for (const g of entrees) vus.set(g.fr, (vus.get(g.fr) ?? 0) + 1);

  /**
   * LES QUATRE PALIERS — et pourquoi cette page a d'abord cru ne pas les avoir.
   *
   * `public/airbuilder/data.json` → GEMC ne porte QU'UNE valeur par statistique,
   * la plus haute. Cette page en a donc conclu que « le fichier ne dit ni combien
   * la première gemme donne, ni comment les 4 se répartissent » — pendant que le
   * guide de progression affichait, deux clics plus loin, les quatre paliers de
   * chacune des 11 gemmes. Ils sont dans un SECOND fichier du dépôt,
   * `src/data/builder-data.json` → costumeGems.
   *
   * Les deux se recoupent : le dernier palier de `costumeGems` est exactement la
   * valeur de GEMC. C'est le contrôle qui autorise à afficher la marche ici, et il
   * est recalculé plutôt qu'affirmé (`concordent` plus bas).
   */
  const paliers = new Map<string, number[]>();
  try {
    const f = path.join(process.cwd(), "src", "data", "builder-data.json");
    const brut = JSON.parse(fs.readFileSync(f, "utf8")) as {
      costumeGems?: { stat: string; levels: number[] }[];
    };
    for (const g of brut.costumeGems ?? []) {
      if (g?.stat && Array.isArray(g.levels) && g.levels.length) paliers.set(g.stat, g.levels);
    }
  } catch {
    /* Le fichier peut manquer : la page retombe alors sur le seul plafond. */
  }

  /**
   * LE SEUL LIBELLÉ QUI DIFFÈRE ENTRE LES DEUX FICHIERS.
   *
   * GEMC écrit « Heal Rate », costumeGems écrit « Soin % » — et c'est, dans les
   * deux fichiers, la statistique qui apparaît DEUX fois (celle que deux pièces se
   * partagent). Même rang, même valeur haute, deux mots.
   *
   * On ne fusionne pas en silence : l'appariement est déclaré ici et AFFICHÉ comme
   * un rapprochement de vocabulaire, exactement comme la page le fait déjà pour
   * HP/PV et PvP/JcJ sur les diamants. Sans lui, la pastille « Heal Rate »
   * resterait seule sans ses paliers, ce qui se lit comme une donnée manquante.
   */
  const DOUBLET: Record<string, string> = { "Heal Rate": "Soin %" };

  const uniques = [...vus.keys()].map((fr) => {
    const e = entrees.find((x) => x.fr === fr)!;
    const autreNom = DOUBLET[fr];
    const lv = paliers.get(fr) ?? (autreNom ? paliers.get(autreNom) ?? null : null);
    return {
      stat: fr, v: e.v, pourcent: e.t === 1,
      /** Les 4 paliers, du premier au dernier, ou `null` si le second relevé ne
       *  les porte pas pour cette statistique. */
      paliers: lv,
      /** Le nom que l'AUTRE fichier emploie, quand ce n'est pas le même mot. */
      parDoublet: paliers.has(fr) ? null : (autreNom ?? null),
      /** Le dernier palier vaut-il bien le plafond de l'autre fichier ? */
      concorde: lv ? lv[lv.length - 1] === e.v : null,
    };
  });

  const avecPaliers = uniques.filter((u) => u.paliers);
  const doublets = uniques.filter((u) => u.parDoublet && u.paliers);
  return {
    entrees, uniques,
    repetes: [...vus.entries()].filter(([, n]) => n > 1).map(([fr]) => fr),
    /** Combien de statistiques ont leurs 4 paliers, et combien concordent avec le
     *  plafond de GEMC. Affiché pour que le recoupement soit vérifiable à l'écran. */
    nPaliers: avecPaliers.length,
    nConcordent: avecPaliers.filter((u) => u.concorde).length,
    /** Le nombre de paliers, lu et non écrit (4 aujourd'hui). */
    marches: avecPaliers[0]?.paliers?.length ?? 0,
    /** Les statistiques dont les paliers ne se retrouvent que via un doublet de
     *  vocabulaire, avec les deux mots. Affiché, jamais tu. */
    doublets: doublets.map((u) => ({ stat: u.stat, autre: u.parDoublet! })),
  };
}

/**
 * LES SETS DE COSTUME, et ce que chacun donne.
 *
 * Deux choses à établir, et les fichiers les établissent tous les deux :
 *
 *  · La PIÈCE seule ne donne rien. Les 24 pièces du builder ont un champ de
 *    bonus VIDE et un bonus de SET rempli ; les pièces du client n'ont pas de
 *    ligne de bonus non plus. C'est le set porté entier qui paie.
 *  · Les trois sets partagent leurs dessins. On ne peut donc pas voir, sur
 *    quelqu'un, lequel des trois il porte — et le nom du set n'apparaît que dans
 *    l'infobulle.
 *
 * Le contrôle croisé est la partie utile : le client vend une boîte par set et
 * ANNONCE son bonus dans la description de la boîte. Là où la boîte et le
 * builder disent la même chose, la ligne est double-sourcée ; là où ils
 * divergent, la page le montre au lieu de choisir.
 */
export function setsDeFashion() {
  const pieces = builder().ITEMS?.fashion ?? [];
  const parSet = new Map<string, PieceFashion[]>();
  for (const p of pieces) {
    const s = p.set ?? "?";
    if (!parSet.has(s)) parSet.set(s, []);
    parSet.get(s)!.push(p);
  }
  return {
    total: pieces.length,
    /** Les pièces se comptent, les dessins aussi : moins de dessins que de
     *  pièces, c'est la définition d'une apparence partagée. */
    dessins: new Set(pieces.map((p) => p.ic).filter(Boolean)).size,
    /** Une pièce du builder porte-t-elle un bonus à elle ? */
    piecesAvecBonusPropre: pieces.filter((p) => (p.b ?? []).length > 0).length,
    sets: [...parSet.entries()].map(([nom, l]) => {
      // Le dernier mot du nom de set (« Fulgurant ») retrouve la boîte du
      // client (« Tenue du roi dragon fulgurant (G) ») sans table à tenir.
      const mot = sansAccent(nom.split(/\s+/).pop() ?? "");
      const boite = charger().TOUT.find(
        (o) => /^Tenue du roi dragon .+ \(G\)$/.test(o.n) && sansAccent(o.n).includes(mot)
      );
      const bonus = (l[0]?.setb ?? []) as [string, number][];
      const annonce = boite?.d ?? "";
      // LA COMPARAISON PORTE SUR LES NOMBRES, ET SUR UN SAC DE NOMBRES.
      //
      // Sur les libellés, rien ne se comparerait : le jeu écrit « HP 5% » là où
      // le builder écrit « PV max % +5 ». Un nombre, si.
      //
      // Mais chercher chaque nombre du builder DANS LA PHRASE ne suffit pas, et
      // c'est l'erreur que cette page a affichée : une ligne que le jeu
      // n'annonce pas se croit retrouvée parce qu'une AUTRE ligne porte le même
      // nombre. Sur le set Fulgurant, le builder liste « Endurance % +5 » que la
      // boîte ne nomme jamais, et son 5 se retrouvait dans « HP 5% » — le set
      // passait pour double-sourcé sur 5 lignes sur 5.
      //
      // On travaille donc sur un SAC de nombres qu'on CONSOMME : chaque ligne du
      // site prend un nombre du jeu et le retire. Ce qui reste du côté du site
      // est ce qu'il dit en plus, et la multiplicité est respectée — le jeu écrit
      // bien deux fois « 15 » sur Fulgurant, donc deux lignes à 15 sont
      // légitimes.
      const nombres = (annonce.match(/\d+/g) ?? []).map(Number);
      const nombresDuJeu = nombres.length;
      const sac = [...nombres];
      const enTrop = bonus.filter(([, v]) => {
        const i = sac.indexOf(v);
        if (i < 0) return true;
        sac.splice(i, 1);
        return false;
      });
      const retrouves = bonus.length - enTrop.length;
      const toutesRetrouvees = enTrop.length === 0 && bonus.length > 0;
      return {
        nom,
        role: l[0]?.cat ?? "",
        emplacements: [...new Set(l.map((p) => p.piece).filter(Boolean))] as string[],
        genres: [...new Set(l.map((p) => p.sex).filter(Boolean))] as string[],
        bonus,
        /** Ce que la boîte du client annonce, mot pour mot, ou "". */
        annonce,
        boite: boite ?? null,
        /** Combien des chiffres du builder se retrouvent dans la phrase du jeu. */
        retrouves,
        /** Combien de valeurs la phrase du jeu porte, elle. */
        nombresDuJeu,
        /** Les lignes du site que la phrase du jeu ne couvre pas. */
        enTrop,
        /** Tous les chiffres du site apparaissent dans la phrase du jeu. */
        toutesRetrouvees,
        /** Les deux listes ont la même longueur : sans ça, l'une dit quelque
         *  chose que l'autre ignore, même si tous les nombres se retrouvent. */
        memeCompte: !!annonce && nombresDuJeu === bonus.length,
        concordent: !!annonce && toutesRetrouvees && nombresDuJeu === bonus.length,
      };
    }),
  };
}

/** Les pièces de costume telles que le CLIENT les nomme, pour montrer leurs
 *  vraies icônes. Un seul jeu suffit à l'écran : quatre dessins, et le relevé
 *  dit lui-même combien de pièces les partagent. */
export function piecesDeFashion() {
  const { TOUT: tout } = charger();
  // L'ordre du haut vers le bas, celui de la fenêtre du jeu. Le relevé, lui,
  // range par identifiant : sans ce tri, les bottes passaient avant la couronne.
  const ORDRE = ["CAP", "UPPER", "HAND", "FOOT"];
  const l = tout
    .filter((o) => /^II_ARM_M_MSEAKINGLOOK(CAP|UPPER|HAND|FOOT)$/.test(o.cle ?? ""))
    .sort((a, b) => {
      const r = (o: Fiche) => ORDRE.findIndex((p) => (o.cle ?? "").endsWith(p));
      return r(a) - r(b);
    });
  const toutes = tout.filter((o) => /^II_ARM_[MF]_[MF]SEAKINGLOOK(CAP|UPPER|HAND|FOOT)(_\d+)?$/.test(o.cle ?? ""));
  return {
    montrees: l,
    total: toutes.length,
    dessins: new Set(toutes.map((o) => o.ic).filter(Boolean)).size,
    /** Aucune de ces pièces ne porte de ligne de bonus dans le relevé. */
    avecBonus: toutes.filter((o) => (o.b ?? []).length > 0).length,
  };
}

/**
 * LE CONTRE-EXEMPLE, ET POURQUOI IL DOIT ÊTRE À L'ÉCRAN.
 *
 * La page affirmait « une couronne ou des bottes de costume, seules, ne donnent
 * rien », en réservant l'exception à la cape et au masque. C'est FAUX, et le
 * relevé le dit : sur les quatre emplacements de mode qui prennent des gemmes,
 * des centaines de pièces portent une ligne de bonus à elles seules — une
 * Couronne de Suzeraineté vaut PV max +9999 sans aucun set. Ce qui est propre
 * aux trois sets du Roi Dragon, c'est qu'ils paient par le SET et pas par la
 * pièce ; d'autres costumes font exactement l'inverse.
 *
 * On compte donc, et on montre un exemple par emplacement — celui dont la
 * valeur de bonus est la plus haute, pour que le contre-exemple soit net. Rien
 * n'est choisi à la main : si le client change, l'exemple change.
 *
 * Les quatre emplacements sont ceux de la MODE (`PARTS_HAT`, `PARTS_CLOTH`,
 * `PARTS_GLOVE`, `PARTS_BOOTS`), pas ceux de l'armure (`PARTS_CAP`,
 * `PARTS_UPPER_BODY`, `PARTS_HAND`, `PARTS_FOOT`) : ce sont deux séries
 * distinctes dans le relevé, et c'est ce qui prouve que le costume s'ajoute à la
 * tenue au lieu de la remplacer.
 */
const EMPLACEMENTS_MODE: { em: string; nom: string }[] = [
  { em: "PARTS_HAT", nom: "coiffe" },
  { em: "PARTS_CLOTH", nom: "tenue" },
  { em: "PARTS_GLOVE", nom: "gants" },
  { em: "PARTS_BOOTS", nom: "bottes" },
];

/** Les deux emplacements de mode qui NE prennent PAS de gemme — il n'existe pas
 *  de famille de joyau pour eux — et qui portent en revanche leurs propres
 *  lignes de bonus. Ils sont nommés ici parce que le relevé n'a pas de champ qui
 *  dise « celui-ci prend des gemmes » : c'est la description des quatre joyaux
 *  (coiffes, tenues, gants, bottes) qui le décide. */
const EMPLACEMENTS_SANS_GEMME: { em: string; nom: string; art: string }[] = [
  // L'article est porté ici et pas dans la phrase : « la {nom} » donnait « la
  // masque » à l'écran, et une faute d'accord fait douter de tout le reste.
  { em: "PARTS_CLOAK", nom: "cape", art: "la" },
  { em: "PARTS_MASK", nom: "masque", art: "le" },
];

export function costumesQuiPaientSeuls() {
  const { TOUT: tout } = charger();
  const mode = tout.filter((o) => o.f === "mode");
  const sur = mode.filter((o) => EMPLACEMENTS_MODE.some((e) => e.em === o.em));
  const avecBonus = sur.filter((o) => (o.b ?? []).length > 0);
  const plus = (o: Fiche) => Math.max(...(o.b ?? []).map(([, v]) => v), 0);
  const exemples = EMPLACEMENTS_MODE.map(({ em, nom }) => {
    const l = avecBonus.filter((o) => o.em === em);
    const meilleur = l.slice().sort((a, b) => plus(b) - plus(a))[0];
    return meilleur ? { emplacement: nom, fiche: meilleur, sur: l.length } : null;
  }).filter((x): x is { emplacement: string; fiche: Fiche; sur: number } => !!x);
  /**
   * LES 74 PIÈCES QUI SÉPARENT CETTE PAGE DE CELLE DU GUIDE.
   *
   * Le guide (/astuces) compte la garde-robe par le TYPE affiché — « Coiffe
   * (mode) », « Tenue (mode) »… — et trouve 2 623 pièces sur ces quatre
   * emplacements. Cette page compte par l'EMPLACEMENT D'ÉQUIPEMENT (`em`) et en
   * trouve 2 549. L'écart n'est pas une erreur de l'une des deux : 74 pièces sont
   * de la mode par leur famille et par leur type, mais le client les range sur les
   * emplacements de l'ARMURE (PARTS_CAP, PARTS_UPPER_BODY, PARTS_HAND,
   * PARTS_FOOT) et non sur ceux du costume.
   *
   * La conséquence est celle qui compte ici : un joyau de costume se pose sur un
   * emplacement de COSTUME, donc ces 74 pièces ne prennent pas de gemme. C'est
   * pour ça que cette page compte par `em` — et on affiche le nombre plutôt que de
   * laisser deux écrans annoncer deux totaux sans raison visible.
   */
  const emCostume = new Set(EMPLACEMENTS_MODE.map((e) => e.em));
  const surEmplacementArmure = mode.filter(
    (o) => !emCostume.has(o.em ?? "") && /^(Coiffe|Tenue|Gants|Chaussures) \(mode\)$/.test(o.t ?? "")
  );

  return {
    emplacements: EMPLACEMENTS_MODE.length,
    total: sur.length,
    avecBonus: avecBonus.length,
    /** Les 74 : de la mode qui occupe un emplacement d'armure, donc sans gemme. */
    horsEmplacement: surEmplacementArmure.length,
    /** Le total que donne le comptage par type — celui du guide. */
    totalParType: sur.length + surEmplacementArmure.length,
    exemples,
    /** La cape et le masque : combien de pièces, combien portent un bonus. */
    sansGemme: EMPLACEMENTS_SANS_GEMME.map(({ em, nom, art }) => {
      const l = mode.filter((o) => o.em === em);
      return { nom, art, total: l.length, avecBonus: l.filter((o) => (o.b ?? []).length > 0).length };
    }),
  };
}

/**
 * L'ÉVEIL DU COSTUME — il existe, et le builder du site l'ignore.
 *
 * Le client vend des parchemins d'éveil FIXE : au lieu de tirer une ligne au
 * hasard, ils en posent une connue d'avance. Il y en a une série pour
 * l'équipement et une série pour le costume, et les deux ne valent pas la même
 * chose. Tout est lu dans le nom et la description (« FOR+10 »), y compris la
 * liste des pièces éligibles quand la description la donne.
 */
export function eveilFixe(motif: RegExp) {
  const { TOUT: tout } = charger();

  /**
   * La statistique et le rang se lisent dans la CLÉ, pas dans le nom.
   *
   * Le nom ne les porte pas au même endroit d'une série à l'autre : le costume
   * écrit « … rang 1 (MP) », l'équipement « … fixe FOR (Rang 1) ». Lire « la
   * dernière parenthèse » donnait donc « Rang 1 » comme nom de statistique et
   * repliait les onze lignes de l'équipement sur deux. La clé, elle, a la même
   * forme des deux côtés : `…_<STAT>_R<n>`, éventuellement suivi de `_LINK`.
   */
  const lire = (o: Fiche) => {
    const d = o.d ?? "";
    const reste = (o.cle ?? "").replace(motif, "");
    const k = /^(.+?)_R(\d)(_LINK)?$/.exec(reste);
    const m = /([A-Za-zÉÈ]+)\s*\+\s*(\d+)\s*(%?)/.exec(d);
    // Le libellé lisible est dans le nom : « (MP) » en fin, ou le mot qui suit
    // « fixe ». On ne garde jamais « Rang 1 » comme libellé.
    const paren = /\(([^)]+)\)\s*$/.exec(o.n)?.[1] ?? "";
    const label = paren && !/rang/i.test(paren)
      ? paren
      : (/fixe\s+(.+?)\s*\(/i.exec(o.n)?.[1] ?? k?.[1] ?? "");
    return {
      fiche: o,
      /** La clé de regroupement — stable, et la même dans les deux séries. */
      code: k?.[1] ?? "",
      label: label.trim(),
      rang: k?.[2] ?? "",
      /** Les versions liées sont le même parchemin sous une seconde clé : on
       *  les compte à part au lieu de gonfler le total. */
      liee: !!k?.[3],
      valeur: Number(m?.[2] ?? 0),
      pourcent: m?.[3] === "%",
      /** « … de votre choix. (Casque, Torse, Bouclier, Arme) » */
      pieces: /choix\.?\s*\(([^)]+)/i.exec(d)?.[1]?.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean) ?? [],
    };
  };
  const l = tout.filter((o) => motif.test(o.cle ?? "")).map(lire).filter((x) => x.valeur > 0 && x.code);
  const distincts = l.filter((x) => !x.liee);
  const parCode = new Map<string, { code: string; label: string; r1: number; r2: number; pourcent: boolean; pieces: string[] }>();
  for (const x of distincts) {
    const e = parCode.get(x.code) ?? { code: x.code, label: x.label, r1: 0, r2: 0, pourcent: x.pourcent, pieces: x.pieces };
    if (x.rang === "2") e.r2 = x.valeur; else e.r1 = x.valeur;
    if (x.pieces.length) e.pieces = x.pieces;
    if (x.label) e.label = e.label || x.label;
    parCode.set(x.code, e);
  }
  const lignes = [...parCode.values()];
  return {
    total: distincts.length,
    liees: l.length - distincts.length,
    lignes,
    /** Celles dont le rang 2 ne vaut PAS le double du rang 1. Écrire « R2 = le
     *  double » serait faux pour celles-là, et c'est exactement le genre de
     *  raccourci qui fait acheter le mauvais parchemin. */
    pasDouble: lignes.filter((x) => x.r1 > 0 && x.r2 > 0 && x.r2 !== x.r1 * 2),
  };
}

/**
 * LES MASQUES DU ROI DRAGON — l'apparence et le bonus sont deux choses.
 *
 * Trois « saveurs » (endurant, agile, spartiate) portent des bonus différents et
 * tournent en boucle chez le même PNJ ; huit masques recolorés n'ont, eux,
 * AUCUNE ligne de bonus. C'est la réponse chiffrée à « est-ce que je perds
 * quelque chose en changeant l'apparence » : les deux séries existent, et une
 * seule paie.
 *
 * La rotation est lue dans les recettes du client (`crafts.json`), pas décrite :
 * si AirFlyff l'ouvre ou la ferme, la page suit.
 */
/** Les objets que le client appelle « Teinture ». Ils se comptent au lieu
 *  d'être annoncés : la page dit qu'il n'existe pas de teinture de costume, et
 *  ce constat repose entièrement sur ce compte-là. */
export const teintures = () =>
  charger().TOUT.filter((o) => /teinture/i.test(o.n));

export function masquesDuDragon() {
  const { TOUT: tout } = charger();
  const saveurs = tout.filter((o) => /^Masque (endurant|agile|spartiate) du roi dragon/i.test(o.n));
  // UNE RECOLORATION SE RECONNAÎT À SON FICHIER D'IMAGE, pas à l'absence de
  // bonus : définir la famille par « ceux qui ne donnent rien » puis annoncer
  // qu'aucun ne donne rien serait un raisonnement circulaire, et la page
  // n'aurait rien démontré.
  //
  // Le discriminant est ailleurs, et il est net. Le masque de base et ses trois
  // saveurs partagent UN SEUL fichier d'image — c'est le même masque, seul
  // l'effet change. Une recoloration, elle, a forcément son propre fichier,
  // puisque c'est le dessin qui change. On garde donc les masques dont l'image
  // porte la même racine (« itm_mseaskingmask ») mais N'EST PAS le fichier des
  // saveurs.
  const racines = [...new Set(
    saveurs.map((o) => (o.ic ?? "").replace(/\.webp$/i, "").replace(/[0-9-]+$/, "")).filter(Boolean)
  )];
  const imagesDesSaveurs = new Set(saveurs.map((o) => o.ic).filter(Boolean));
  const recolores = tout.filter(
    (o) => /^Masque /i.test(o.n)
      && !imagesDesSaveurs.has(o.ic)
      && racines.some((r) => (o.ic ?? "").startsWith(r))
  );
  // Une saveur par jeu de bonus : les 18 clés ne décrivent que trois effets.
  const parBonus = new Map<string, Fiche>();
  for (const o of saveurs) {
    const k = JSON.stringify(o.b ?? []);
    if (!parBonus.has(k)) parBonus.set(k, o);
  }
  const rotations = recettes().filter(
    (r) => /masque \w+ du roi dragon/i.test(r.e?.[0]?.n ?? "")
      && /masque \w+ du roi dragon/i.test(r.s?.[0]?.n ?? "")
  );
  return {
    saveurs: [...parBonus.values()],
    nSaveurs: saveurs.length,
    recolores,
    sansBonus: recolores.filter((o) => !(o.b ?? []).length).length,
    rotations: rotations.length,
    /** Le taux que la recette affiche, s'il est le même partout. */
    tauxRotation: [...new Set(rotations.map((r) => r.s?.[0]?.c).filter((c) => c != null))],
    couturier: rotations[0]?.pnj?.[0] ?? "",
  };
}

/* ── Les panneaux du jeu (crafts.json) ────────────────────────────────────── */

type Ingredient = { n: string; ic?: string; q?: number; c?: number | null };
type Recette = { id: number; g?: string; pnj?: string[]; e?: Ingredient[]; s?: Ingredient[] };
type Panneau = { titre: string; texte: string; pct: number[]; penya: string[] };

let CRAFTS: { recettes: Recette[]; ateliers: Panneau[] } | null = null;
function crafts() {
  if (CRAFTS) return CRAFTS;
  try {
    const f = path.join(process.cwd(), "public", "wiki", "crafts.json");
    const d = JSON.parse(fs.readFileSync(f, "utf8")) as { recettes?: Recette[]; ateliers?: Panneau[] };
    CRAFTS = { recettes: d.recettes ?? [], ateliers: d.ateliers ?? [] };
  } catch {
    CRAFTS = { recettes: [], ateliers: [] };
  }
  return CRAFTS;
}
const recettes = () => crafts().recettes;

/**
 * UN PANNEAU D'AIDE DU JEU, par son titre.
 *
 * Ces textes sont ceux que la fenêtre de transformation affiche en jeu : c'est
 * le jeu qui parle, et il est la seule source sur ce qu'une opération détruit.
 * La page des crafts les montre tous ; ici on ne cite QUE celui qui répond à la
 * question posée, et on renvoie à /crafts pour le reste — c'est le même relevé,
 * pas une seconde liste à maintenir.
 */
export const panneau = (motif: RegExp): Panneau | null =>
  crafts().ateliers.find((a) => motif.test(a.titre)) ?? null;

/**
 * LE MÉLANGE DE COSTUMES — la seule opération de costume qui coûte cher.
 *
 * Le panneau du jeu annonce une liste de résultats possibles ; on la compte et
 * on regarde combien de ces résultats sont des sets qui donnent des bonus. Le
 * rapport entre les deux est la seule chose qui décide si le geste vaut le coup,
 * et il n'est écrit nulle part.
 */
export function melangeDeCostumes() {
  const p = panneau(/mélange de costumes/i);
  if (!p) return null;
  // La liste commence après « Liste d'Acquisition » et tient une ligne par
  // résultat. On garde les lignes qui nomment une tenue ou un uniforme.
  const lignes = p.texte.split("\n").map((s) => s.trim()).filter(Boolean);
  const debut = lignes.findIndex((s) => /liste d.acquisition/i.test(s));
  const sorties = (debut >= 0 ? lignes.slice(debut + 1) : []).filter((s) => /^(tenue|uniforme|costume)/i.test(s));
  const min = Number(/de\s*(\d+)\s*(?:a|à)\s*(\d+)\s*costumes/i.exec(p.texte)?.[1] ?? 0);
  const max = Number(/de\s*(\d+)\s*(?:a|à)\s*(\d+)\s*costumes/i.exec(p.texte)?.[2] ?? 0);
  return {
    texte: p.texte,
    sorties,
    /** Les sorties qui appartiennent à un set du builder — les seules qui
     *  portent un bonus connu. */
    avecBonus: sorties.filter((s) => /dragon (immortel|fulgurant|intouchable)/i.test(s)),
    min, max,
    protection: objet("II_SYS_SYS_SCR_COSTUMEDEFENDER"),
    /** COMBIEN D'AUTRES FENÊTRES DE TRANSFORMATION, et pourquoi ça se compte.
     *  Ce nombre était écrit à la main (« les 22 autres ») : il devenait faux au
     *  premier panneau ajouté, et il comptait les deux panneaux Baruna, qui sont
     *  hors sujet et ne doivent apparaître dans aucun compte. */
    autresPanneaux: crafts().ateliers.filter(
      (a) => a !== p && !/baruna/i.test(a.titre) && !/baruna/i.test(a.texte)
    ).length,
  };
}

/** La recette qui fabrique un joyau de costume : combien de morceaux, chez qui,
 *  à quel taux. Lue dans les recettes du client. */
export function recetteDeJoyau(nom: string) {
  const r = recettes().find((x) => (x.s ?? []).some((s) => s.n === nom));
  if (!r) return null;
  return {
    pnj: r.pnj?.[0] ?? "",
    entrants: r.e ?? [],
    taux: r.s?.[0]?.c ?? null,
  };
}

/* ── CE QUI EST PARTI D'ICI, ET OÙ ────────────────────────────────────────────
 *
 * `ARENE_ARMES` (les coefficients de la seconde table d'équilibrage) et
 * `GVG_BAREME` (le barème aux points) vivaient dans ce fichier et s'affichaient
 * sur la planche des mécaniques. Ni l'un ni l'autre ne parle d'une pièce
 * d'équipement : l'arène est un sujet de /classes, la GvG un sujet de
 * /compositions. Un sujet, une page — la planche renvoie maintenant vers elles au
 * lieu de développer chez le voisin.
 *
 * Les deux relevés ne sont pas perdus : ils sont dans l'historique de ce fichier,
 * et le déménagement est signalé au fil principal pour que la page propriétaire
 * les accueille. Ne pas les rétablir ici. */
