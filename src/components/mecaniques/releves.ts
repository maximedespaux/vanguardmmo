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

/** Les cinq familles de joyau, et l'image que cette page emploie déjà pour
 *  chacune. La plage de niveaux n'est pas écrite ici : elle est lue dans la
 *  description du client (voir `famillesDeJoyau`). */
const JOYAUX: { cle: string; img: string }[] = [
  { cle: "II_GEN_MAT_TOPAZ", img: "/jeu/mecaniques/gemme-topaze.webp" },
  { cle: "II_GEN_MAT_RUBY", img: "/jeu/mecaniques/gemme-rubis.webp" },
  { cle: "II_GEN_MAT_SAPPHIRE", img: "/jeu/mecaniques/gemme-saphir.webp" },
  { cle: "II_GEN_MAT_EMERALD", img: "/jeu/mecaniques/gemme-emeraude.webp" },
  { cle: "II_GEN_MAT_DIAMOND", img: "/jeu/mecaniques/gemme-diamant.webp" },
];

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
  return JOYAUX.map(({ cle, img }) => {
    const o = objet(cle);
    const m = (o?.d ?? "").match(/niveau\s*(\d+)\s*-?\s*(\d+)?/);
    const nommee = new RegExp(`^${cle}0[1-9]$`);
    const nommees = tout.filter((x) => nommee.test(x.cle ?? "")).length;
    return {
      nom: o?.n ?? cle,
      plage: m ? (m[2] ? `${m[1]}–${m[2]}` : m[1]) : "",
      img,
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
export const PARCHEMINS_TAUX = ["II_SYS_SYS_SCR_SMELTING", "II_SYS_SYS_SCR_SUPERSMELTING", "II_SYS_SYS_SCR_NOR_SMELTING01", "II_SYS_SYS_SCR_NOR_SMELTING02", "II_SYS_SYS_SCR_NOR_SMELTING03"];
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

/* ── L'arène : la seconde table d'équilibrage ─────────────────────────────── */

/**
 * RELEVÉ DE LECTURE — ces coefficients ne sont dans aucun de nos fichiers de
 * données ; ils ont été lus dans les tables d'équilibrage du client. La section
 * porte donc une réserve, et ces lignes ne doivent pas être présentées comme
 * mesurées en jeu.
 */
export const ARENE_ARMES: [string, string][] = [
  ["Arbalétrier", "vitesse ÷ 3,3 · arc ÷ 4"],
  ["Sylphide", "vitesse ÷ 1,6 · yoyo ÷ 4"],
  ["Templier, Spadassin", "arme ÷ 3,6 environ"],
  ["Chanoine", "poing ÷ 2,3"],
  ["Arcaniste, Envoûteur", "rien : identique"],
  ["Primat", "il y gagne un peu"],
];

/* ── La GvG ───────────────────────────────────────────────────────────────── */

/** Le barème, tel que le panneau du jeu l'affiche. */
export const GVG_BAREME: [string, string][] = [
  ["Vaincre un ennemi", "+2"],
  ["… que ce joueur n'avait jamais battu", "+1"],
  ["… en étant maître de guilde", "+1"],
  ["… quand c'est un défenseur", "+1"],
  ["… qui n'a plus de résurrection", "+1"],
  ["Chaque résurrection qu'il te reste à la fin", "+1"],
];
