import fs from "node:fs";
import path from "node:path";

/**
 * LE SECOND RELEVÉ : CE QUE LES FICHIERS DE VALEURS DU CLIENT CHIFFRENT.
 *
 * `releves.ts` lit ce que le client ÉCRIT sur un objet — des noms, des phrases
 * d'infobulle. Ce module lit ce qu'il CALCULE : `public/wiki/bonus-sources.json`
 * (Ultimate_GemAbility.txt, Costume_GemAbility.txt, artefact.json, rarity.json,
 * propItemEtc.inc) et le dictionnaire des codes `src/data/statistiques-objets.json`.
 *
 * ┌────────── POURQUOI CE FICHIER EXISTE MAINTENANT ──────────┐
 * │ Trois affirmations de cette page étaient jusqu'ici des      │
 * │ lectures d'infobulle, donc discutables. Les tables les      │
 * │ ÉTABLISSENT, et sans qu'on tape un chiffre :                │
 * │                                                            │
 * │  · HUIT logements de gemme et non cinq :                    │
 * │    Ultimate_GemAbility.txt donne huit valeurs par gemme     │
 * │    alors que son en-tête n'en numérote que cinq.            │
 * │  · L'ORDRE des neuf statistiques de sertissage, celui       │
 * │    auquel les noms de gemmes ne répondent pas.              │
 * │  · Le taux d'amélioration d'un artefact, qui s'effondre     │
 * │    de +11 à +20 — une courbe, pas une colonne.              │
 * └────────────────────────────────────────────────────────────┘
 *
 * Ce module touche au disque : il ne doit JAMAIS être importé par un composant
 * client. Le relevé pèse 512 Ko, le dictionnaire 36 Ko : ils sont lus au rendu et
 * gardés en mémoire, pas un octet ne part au navigateur. Même modèle que
 * `releves.ts`.
 *
 * BARUNA EST HORS SUJET : les cartes dont le nom porte ce mot ne sont ni comptées
 * ni montrées.
 */

/* ── Le dictionnaire des codes DST_* ──────────────────────────────────────── */

type Dico = {
  stats?: { code: string; fr?: string }[];
  sansLibelle?: string[];
  nonDefinis?: string[];
};

let DICO: Map<string, string> | null = null;
let SANS_LIBELLE: string[] = [];
let NON_DEFINIS: string[] = [];

function dico(): Map<string, string> {
  if (DICO) return DICO;
  DICO = new Map();
  try {
    const f = path.join(process.cwd(), "src", "data", "statistiques-objets.json");
    const d = JSON.parse(fs.readFileSync(f, "utf8")) as Dico;
    for (const s of d.stats ?? []) if (s.code && s.fr) DICO.set(s.code, s.fr);
    SANS_LIBELLE = d.sansLibelle ?? [];
    NON_DEFINIS = d.nonDefinis ?? [];
  } catch {
    /* Pas de dictionnaire : les codes s'affichent tels quels, jamais devinés. */
  }
  return DICO;
}

/**
 * LE LIBELLÉ D'UN CODE, OU LE CODE LUI-MÊME.
 *
 * Deux codes employés par le client n'ont pas de libellé à donner : l'un n'est
 * traduit nulle part, l'autre n'est même pas déclaré dans `defineattribute.h`.
 * On rend alors le CODE BRUT. Inventer « chance de butin » à partir du nom de la
 * constante serait une supposition présentée comme une donnée — et ces deux-là
 * sont justement des codes de récompense, que `estRecompense` retire de l'écran.
 */
export function libelleDe(code: string): string {
  return dico().get(code) ?? code;
}

/** Les codes que le dictionnaire ne sait pas nommer, tels qu'il les déclare. */
export function codesSansLibelle(): { sansLibelle: string[]; nonDefinis: string[] } {
  dico();
  return { sansLibelle: SANS_LIBELLE, nonDefinis: NON_DEFINIS };
}

/**
 * LES TROIS RÉCOMPENSES QUI RESTENT DANS LES DONNÉES ET QUITTENT L'ÉCRAN.
 *
 * Règle de la maison : les taux de butin, l'expérience et les penyas de
 * récompense ne s'affichent plus. Un PRIX d'opération, lui, reste — le million
 * qu'on paie pour retirer une carte change ce qu'on fait.
 *
 * `DST_WEAPON_EXP_RATE` n'est PAS dans le filtre, et c'est voulu : « Maîtrise
 * d'arme % » est une statistique qu'on cherche sur une pièce, pas une récompense
 * de monstre. Elle a même son volet sur cette page.
 */
const RECOMPENSE = /^DST_(EXPERIENCE|RECOVERY_EXP|ADDDROP|CHANCEDROP|GOLD|PENYA_RATE|DROP_ITEM_)/;
export const estRecompense = (code: string) => RECOMPENSE.test(code);

/* ── Le relevé des tables de valeurs ──────────────────────────────────────── */

type Item = { cle: string; i?: number; n?: string };
type GemmeUltime = { gemme: Item; taillee?: Item; paliers: number[] };
type Palier = { code: string; valeur: number | null; pieces: number };
type Panoplie = { id: number; n?: string; pieces?: { n?: string; em?: string }[]; paliers?: Palier[] };
type Source = {
  genere?: string;
  sertissage?: {
    ultimes?: { code: string; gemmes: GemmeUltime[] }[];
    paliersParGemme?: number;
    paliersNumerotesParLeClient?: number;
    tranchesDeNiveau?: { gemme: Item; niveauMin: number; niveauMax: number }[];
    costume?: { code: string; paliers: number[] }[];
  };
  percage?: { cartes?: { carte: Item; b?: [string, number][] }[] };
  artefact?: {
    amelioration?: { probabilities?: { level: number; probability: number }[] };
  };
  eveil?: { general?: Record<string, number>; costume?: Record<string, number> };
  panoplies?: Panoplie[];
  concordance?: { panoplies?: { comparees?: number; retrouvees?: number } };
};

let SOURCE: Source | null = null;
function source(): Source {
  if (SOURCE) return SOURCE;
  try {
    const f = path.join(process.cwd(), "public", "wiki", "bonus-sources.json");
    SOURCE = JSON.parse(fs.readFileSync(f, "utf8")) as Source;
  } catch {
    SOURCE = {};
  }
  return SOURCE;
}

/**
 * L'ORDRE RÉEL DES NEUF STATISTIQUES DE SERTISSAGE.
 *
 * C'est la clé de tout le volet « Les gemmes mentent » : les neuf codes dans
 * l'ordre où `Ultimate_GemAbility.txt` les range. Les neuf Diamants d'AirFlyff
 * (`II_GEN_MAT_DIAMOND_1` → « sertissage en HP max ») suivent cet ordre rang pour
 * rang ; les anciens noms de gemmes, non.
 */
export const ordreDuClient = (): string[] =>
  (source().sertissage?.ultimes ?? []).map((u) => u.code);

/**
 * HUIT PALIERS PAR GEMME, CINQ SEULEMENT NUMÉROTÉS.
 *
 * Le fait se lit dans la forme du fichier, pas dans une phrase : chaque gemme
 * porte huit valeurs alors que l'en-tête n'en nomme que cinq. Et les quatre
 * premières familles laissent les trois dernières à zéro — seul le Diamant les
 * remplit. C'est ce qui fait qu'un build comparé sur cinq gemmes sous-estime le
 * haut du jeu, et ça se DESSINE.
 *
 * `remplis` est COMPTÉ sur les valeurs, jamais écrit : le jour où AirFlyff ouvre
 * les huit à toutes les familles, le schéma suit.
 */
export function paliersDeGemme() {
  const s = source().sertissage;
  const ultimes = s?.ultimes ?? [];
  const tranches = s?.tranchesDeNiveau ?? [];
  const total = s?.paliersParGemme ?? 0;
  const noms = new Map<string, { nom: string; min: number; max: number }>();
  for (const t of tranches) {
    noms.set(t.gemme.cle, { nom: t.gemme.n ?? t.gemme.cle, min: t.niveauMin, max: t.niveauMax });
  }
  // Une ligne par famille de joyau, dans l'ordre du fichier — donc dans l'ordre
  // des niveaux, puisque le client range ses gemmes ainsi.
  const familles = (ultimes[0]?.gemmes ?? []).map((g, i) => {
    const t = noms.get(g.gemme.cle);
    // Le nombre de paliers réellement servis : le maximum sur les neuf
    // statistiques, pour qu'une statistique creuse ne rabaisse pas la famille.
    const remplis = Math.max(
      ...ultimes.map((u) => (u.gemmes[i]?.paliers ?? []).filter((v) => v > 0).length),
      0,
    );
    return {
      cle: g.gemme.cle,
      nom: t?.nom ?? g.gemme.n ?? g.gemme.cle,
      plage: t ? (t.min === t.max ? `${t.min}` : `${t.min}–${t.max}`) : "",
      remplis,
    };
  });
  return {
    total,
    nommes: s?.paliersNumerotesParLeClient ?? 0,
    familles,
    /** Les familles qui n'atteignent pas les huit, et celles qui y vont. */
    plafonnent: familles.filter((f) => f.remplis < total),
    complets: familles.filter((f) => f.remplis >= total && total > 0),
  };
}

/**
 * CE QUE CHAQUE FAMILLE DE CARTE DONNE VRAIMENT.
 *
 * L'ancienne planche montrait les dessins et les paliers sans jamais dire ce
 * qu'une carte APPORTE. C'est pourtant la seule question qu'on se pose devant
 * l'étal : le Néant rend des PC, l'Océane des PM et des soins, la Terre trois
 * lignes à la fois. Les codes sortent du relevé, les libellés du dictionnaire.
 */
export function bonusDesCartes(): Map<string, string[]> {
  const par = new Map<string, string[]>();
  for (const c of source().percage?.cartes ?? []) {
    const n = c.carte.n ?? "";
    if (/baruna/i.test(n)) continue;
    const m = /^Carte (?:du )?(.+?) \((?:\d+%|[A-Z])\)$/.exec(n);
    if (!m) continue;
    const codes = par.get(m[1]) ?? [];
    for (const [code] of c.b ?? []) {
      if (!estRecompense(code) && !codes.includes(code)) codes.push(code);
    }
    par.set(m[1], codes);
  }
  return par;
}

/**
 * LA COURBE D'AMÉLIORATION D'UN ARTEFACT, de +11 à +20.
 *
 * Le client la donne en probabilités (1 → 0,1). Écrite en colonne, elle se lit
 * comme dix options ; dessinée, on voit qu'elle est divisée par dix sur dix
 * paliers. C'est elle qui décide où l'on pose son parchemin.
 */
export const courbeArtefact = () =>
  (source().artefact?.amelioration?.probabilities ?? [])
    .map((p) => ({ niveau: p.level, pct: Math.round(p.probability * 100) }))
    .sort((a, b) => a.niveau - b.niveau);

/* ── CE QUI N'EST PAS LU, ET POURQUOI ────────────────────────────────────────
 *
 * `eveil.general` et `eveil.costume` (maxawakes.json) existent dans ce relevé et
 * NE REMONTENT PAS à l'écran. Le fichier annonce un plafond de Force de 15 sur
 * l'équipement et de 28 sur un costume, quand les parchemins d'éveil FIXE du
 * client, eux, posent FOR+30 sur l'équipement et FOR+10 sur un costume : les deux
 * séries se contredisent en valeur ET en sens. Rien ne dit laquelle est la bonne
 * échelle — donc rien ne s'affiche, et aucune réserve ne s'affiche à la place.
 *
 * `artefact.pierres` est écarté pour la même raison : la table fait de
 * `II_GEN_MAT_DIAMOND_4` un bonus de Dextérité alors que le client NOMME cet
 * objet « Diamant - sertissage en siphon de vie ». Publier l'un des deux
 * reviendrait à trancher entre deux fichiers du même client.
 */

/**
 * LES PANOPLIES QUI COÛTENT DES STATISTIQUES.
 *
 * LE FAIT QU'AUCUN JOUEUR NE DEVINE. Une panoplie ne fait pas que donner : le
 * client lui écrit aussi des lignes NÉGATIVES, qui s'appliquent quand l'ensemble
 * est porté au complet. Shaïtan retire 200 de dégâts JcJ %, les Dryades 300 de
 * dégâts JcJ, l'Apocalypse 400 de dégâts sur monstres et jusqu'à 500 de
 * précision. Rien, en jeu, ne le dit : la fenêtre de panoplie n'affiche que ce
 * qu'elle ajoute.
 *
 * On agrège par (code, valeur, nombre de pièces) plutôt que de lister 112
 * panoplies : le fait est le BARÈME, et il tient en dix lignes. Les noms de
 * familles, eux, servent à savoir si l'on est concerné — d'où les deux.
 *
 * `propItemEtc.inc` écrit deux identifiants de panoplie en double (le relevé le
 * signale lui-même) : on regroupe donc par NOM, jamais par `id`.
 */
/**
 * LE NOM D'UNE FAMILLE DE PANOPLIE, ET SES DEUX PIÈGES.
 *
 *  · LE GENRE NE CHANGE PAS LE MALUS. « Set de Templier en Yggdrasil (G) » et sa
 *    version (F) sont deux panoplies pour un seul fait : la liste afficherait
 *    trente noms là où vingt en suffisent, et on lirait le suffixe comme une
 *    distinction utile. On regroupe donc sur le nom SANS son genre — l'identifiant,
 *    lui, ne sert jamais de clé, le client en écrit deux en double et le relevé le
 *    signale lui-même.
 *  · UN NOM DE PANOPLIE PEUT ÊTRE TRONQUÉ DANS LE CLIENT. L'ensemble 474 s'appelle
 *    « de FOR » — un fragment de libellé, pas un nom. Ses PIÈCES, elles, portent le
 *    vrai nom en dernier mot (« Casque Srehios », « Bottes Srehios »). On le reprend
 *    quand les quatre morceaux s'accordent ; sinon la famille n'est pas nommée du
 *    tout, plutôt que nommée « de FOR » — un nom faux se lit comme un bogue et fait
 *    douter du reste de la page.
 */
function nomDeFamille(p: Panoplie): string {
  const n = (p.n ?? "").replace(/\s*\((?:G|F)\)\s*$/, "").trim();
  if (/^[A-ZÀ-Þ0-9]/.test(n)) return n;
  const derniers = (p.pieces ?? []).map((x) => (x.n ?? "").trim().split(/\s+/).pop() ?? "");
  const uniques = [...new Set(derniers.filter(Boolean))];
  return uniques.length === 1 ? uniques[0] : "";
}

export function panopliesNegatives() {
  const toutes = source().panoplies ?? [];
  const negatives = toutes.filter((p) =>
    (p.paliers ?? []).some((x) => typeof x.valeur === "number" && x.valeur < 0 && !estRecompense(x.code)));

  const bareme = new Map<string, { code: string; valeur: number; pieces: number; n: number }>();
  const familles = new Map<string, Set<string>>();
  for (const p of negatives) {
    const nom = nomDeFamille(p);
    for (const x of p.paliers ?? []) {
      if (typeof x.valeur !== "number" || x.valeur >= 0 || estRecompense(x.code)) continue;
      const k = `${x.code}|${x.valeur}|${x.pieces}`;
      const e = bareme.get(k) ?? { code: x.code, valeur: x.valeur, pieces: x.pieces, n: 0 };
      e.n += 1;
      bareme.set(k, e);
      if (!nom) continue;
      let codes = familles.get(nom);
      if (!codes) familles.set(nom, (codes = new Set<string>()));
      codes.add(x.code);
    }
  }
  const lignes = [...bareme.values()].sort((a, b) => b.n - a.n || a.valeur - b.valeur);
  const conc = source().concordance?.panoplies;

  /**
   * LE PARTAGE SE COMPTE EN ENSEMBLES, PAS EN LIGNES.
   *
   * Un ensemble peut porter DEUX paliers négatifs : les dix lignes du barème
   * totalisent 122 mentions pour 112 ensembles. Additionner les lignes donnait
   * « 106 + 16 » sous un titre qui annonce 112 — un compte que le lecteur ne peut
   * pas réconcilier, et le défaut exact qu'on nous demande de ne plus reproduire.
   * On partage donc les ENSEMBLES : ceux dont tous les paliers négatifs tombent au
   * dernier cran (s'arrêter avant les évite) et ceux qui en ont un plus tôt (rien à
   * arbitrer). Les deux se somment à `touchees`.
   */
  const cran = lignes.length ? Math.max(...lignes.map((l) => l.pieces)) : 0;
  const negatifsDe = (p: Panoplie) => (p.paliers ?? []).filter((x) =>
    typeof x.valeur === "number" && x.valeur < 0 && !estRecompense(x.code));
  const tot = negatives.filter((p) => !negatifsDe(p).some((x) => x.pieces < cran)).length;

  return {
    total: toutes.length,
    /** Combien d'ensembles portent au moins une ligne négative. */
    touchees: negatives.length,
    /** Le cran de la panoplie complète, tel que le barème le porte. */
    cran,
    /** Ensembles dont le malus n'arrive qu'au dernier cran — évitable. */
    auDernierCran: tot,
    /** Ensembles qui en portent un plus tôt — inévitable. */
    avantLeCran: negatives.length - tot,
    /** Les familles concernées, par nom — un nom pouvant couvrir plusieurs ids. */
    familles: [...familles.entries()]
      .map(([nom, codes]) => ({ nom, codes: [...codes] }))
      .sort((a, b) => b.codes.length - a.codes.length || a.nom.localeCompare(b.nom, "fr")),
    lignes,
    /** Le contrôle croisé que le relevé porte lui-même. */
    concordance: conc?.comparees && conc.comparees === conc.retrouvees ? conc.comparees : 0,
  };
}

/** La date de la fouille des tables de valeurs, telle que le relevé la porte. */
export const dateDesSources = () => source().genere ?? "";
