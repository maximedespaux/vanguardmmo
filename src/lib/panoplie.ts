import fs from "node:fs";
import path from "node:path";

/**
 * LES PANOPLIES — retrouver les trois pièces sœurs d'une armure.
 *
 * Demande de Maxime : « la possibilité quand on intègre par exemple botte Yggdrasil
 * la possibilité de mettre la panoplie entièrement pour éviter de perdre du temps ».
 * Commander un stuff complet, c'était chercher quatre fois, saisir quatre fois.
 *
 * ┌─── IL N'Y A PAS DE CHAMP « PANOPLIE » DANS LES DONNÉES ───┐
 * │ C'est la CLÉ DU CLIENT qui la porte, et il a fallu la lire  │
 * │ pour s'en apercevoir :                                     │
 * │                                                            │
 * │   II_ARM_M_MER_BOOTS_SET_01   → Bottes Fortis, niveau 15    │
 * │   II_ARM_M_MER_GAUNTLET_SET_01 → Gants Fortis, niveau 15    │
 * │   II_ARM_M_MER_HELMET_SET_01  → Casque Fortis, niveau 15    │
 * │   II_ARM_M_MER_SUIT_SET_01    → Armure Fortis, niveau 15    │
 * │                                                            │
 * │ La signature d'un ensemble est donc la clé PRIVÉE de son    │
 * │ segment de pièce. Le genre (M/F) et la classe (MER, ACR…)   │
 * │ en font partie : « Bottes Flora » est la version féminine   │
 * │ de « Bottes Fortis », ce sont deux panoplies distinctes et  │
 * │ les mélanger proposerait à un joueur une pièce qu'il ne     │
 * │ peut pas porter.                                           │
 * └────────────────────────────────────────────────────────────┘
 *
 * VÉRIFIÉ AVANT D'ÊTRE ÉCRIT, sur les 1 858 armures du relevé : la règle produit
 * 265 ensembles, dont 264 comptent EXACTEMENT quatre pièces et un seul est orphelin.
 * Un découpage qui laisserait des ensembles à deux ou trois pièces signalerait une
 * règle fausse ; ce n'est pas le cas.
 *
 * CE QUE CETTE RÈGLE NE COUVRE PAS, et qu'il faut savoir avant de promettre une
 * panoplie au joueur :
 *
 * · Les BOUCLIERS ne font pas partie des ensembles à quatre pièces. Ils portent bien
 *   un segment SHIELD, mais leur clé ne suit pas la même numérotation.
 * · « YGGDRASIL » n'est PAS une panoplie d'armure, contrairement à ce que l'exemple
 *   pouvait laisser croire : c'est une lignée d'ARMES — 21 armes et un bouclier, plus
 *   leurs runes. Il n'existe pas de botte Yggdrasil dans le client. Le besoin, lui,
 *   reste entier sur les 264 vraies panoplies.
 * · Les armures hors ensemble (les BOOTS01 à BOOTS04 du Vagabond, par exemple) n'ont
 *   pas de sœurs : la fonction renvoie alors une liste vide, et l'écran ne doit pas
 *   proposer un bouton qui n'ajouterait rien.
 */

/** Les segments de pièce reconnus dans une clé d'armure. */
const PIECES = ["HELMET", "SUIT", "BOOTS", "GAUNTLET", "SHIELD"] as const;

export type PieceArmure = {
  id: number;
  nom: string;
  cle: string;
  /** Le libellé du jeu : Casque, Armure, Bottes, Gants, Bouclier. */
  type: string;
  icone?: string | null;
  niveauRequis?: number | null;
  classe?: string | null;
  grade?: string | null;
};

type Fiche = {
  i: number; n: string; cle?: string; f?: string; ic?: string; t?: string;
  cl?: string; nr?: number; g?: string;
};

let PAR_SIGNATURE: Map<string, PieceArmure[]> | null = null;
let SIGNATURE_DE: Map<number, string> | null = null;

/**
 * La signature : la clé privée de son segment de pièce. `null` si la clé ne contient
 * aucun segment connu — l'objet n'est alors pas rattachable à un ensemble, et c'est
 * un résultat, pas une erreur.
 */
export function signature(cle: string | undefined | null): string | null {
  if (!cle) return null;
  for (const p of PIECES) {
    const re = new RegExp(`_${p}(_|$)`);
    if (re.test(cle)) return cle.replace(re, "_@_");
  }
  return null;
}

/**
 * Le relevé pèse 4,4 Mo : on le lit avec `fs` au premier appel et on garde les deux
 * index en mémoire — même modèle que `lib/ouFarmer.ts` et
 * `components/objets/catalogue.ts`. Ce fichier touche au disque : il ne doit JAMAIS
 * être importé par un composant client.
 */
function charger() {
  if (PAR_SIGNATURE && SIGNATURE_DE) return { PAR_SIGNATURE, SIGNATURE_DE };
  const f = path.join(process.cwd(), "public", "wiki", "objets-fiches.json");
  const brut = JSON.parse(fs.readFileSync(f, "utf8")) as unknown;
  const liste: Fiche[] = Array.isArray(brut)
    ? (brut as Fiche[])
    : ((brut as { objets?: Fiche[] }).objets ?? []);

  const parSig = new Map<string, PieceArmure[]>();
  const sigDe = new Map<number, string>();
  for (const o of liste) {
    if (o.f !== "armure" || !o.cle) continue;
    const s = signature(o.cle);
    if (!s) continue;
    const piece: PieceArmure = {
      id: o.i, nom: o.n, cle: o.cle, type: o.t ?? "",
      icone: o.ic ?? null, niveauRequis: o.nr ?? null,
      classe: o.cl ?? null, grade: o.g ?? null,
    };
    const l = parSig.get(s);
    if (l) l.push(piece); else parSig.set(s, [piece]);
    sigDe.set(o.i, s);
  }

  /* L'ordre d'affichage est celui dont on s'équipe, de la tête aux pieds — le relevé,
     lui, sort les pièces dans l'ordre du fichier du client (bottes, gants, casque,
     armure), qui ne veut rien dire pour un joueur. */
  const RANG: Record<string, number> = { Casque: 0, Armure: 1, Gants: 2, Bottes: 3, Bouclier: 4 };
  for (const l of parSig.values()) {
    l.sort((a, b) => (RANG[a.type] ?? 9) - (RANG[b.type] ?? 9) || a.nom.localeCompare(b.nom, "fr"));
  }

  PAR_SIGNATURE = parSig;
  SIGNATURE_DE = sigDe;
  return { PAR_SIGNATURE, SIGNATURE_DE };
}

/**
 * La panoplie d'une pièce : elle-même comprise, dans l'ordre où l'on s'équipe.
 * Liste VIDE si la pièce n'appartient à aucun ensemble — l'appelant ne doit alors
 * proposer aucun bouton, plutôt qu'un bouton qui n'ajoute rien.
 */
export function panoplieDe(idObjet: number): PieceArmure[] {
  const { PAR_SIGNATURE: parSig, SIGNATURE_DE: sigDe } = charger();
  const s = sigDe.get(idObjet);
  if (!s) return [];
  const l = parSig.get(s) ?? [];
  // Une pièce seule n'est pas une panoplie : ne rien proposer vaut mieux qu'un
  // bouton « compléter » qui ajouterait uniquement ce qu'on a déjà.
  return l.length >= 2 ? l : [];
}

/** Les pièces qui MANQUENT, une fois retiré ce qui est déjà au panier. */
export function complement(idObjet: number, dejaPris: number[]): PieceArmure[] {
  const pris = new Set(dejaPris);
  return panoplieDe(idObjet).filter((p) => !pris.has(p.id));
}

/** Le nom commun de l'ensemble, déduit des noms de ses pièces.
 *
 *  « Bottes Fortis », « Gants Fortis », « Casque Fortis », « Armure Fortis » donnent
 *  « Fortis ». On le calcule sur le plus long suffixe commun aux quatre noms plutôt
 *  que de retirer un préfixe connu : les libellés du jeu ne sont pas réguliers
 *  (« Armure Piquante » contre « Bottes Piquantes »), et un accord au féminin ferait
 *  échouer une comparaison mot à mot. Faute de suffixe commun, on rend `null` et
 *  l'écran parle simplement de « la panoplie ». */
export function nomEnsemble(pieces: PieceArmure[]): string | null {
  if (pieces.length < 2) return null;
  const mots = pieces.map((p) => p.nom.split(/\s+/));
  let commun: string[] = [];
  for (let i = 1; i <= Math.min(...mots.map((m) => m.length)); i++) {
    const bout = mots[0].slice(-i).join(" ");
    if (mots.every((m) => m.slice(-i).join(" ") === bout)) commun = mots[0].slice(-i);
    else break;
  }
  return commun.length ? commun.join(" ") : null;
}
