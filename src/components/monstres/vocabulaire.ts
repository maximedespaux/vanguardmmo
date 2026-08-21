/**
 * LE VOCABULAIRE DES MONSTRES — ce que l'écran et le serveur partagent.
 *
 * Séparé de `catalogue.ts` exprès : ce dernier lit le disque avec `fs` et ne
 * peut donc jamais être importé par un composant client. Tout ce qui doit être
 * lisible des deux côtés (types, libellés, couleurs, mises en forme) vit ici, et
 * ici seulement — c'est le même découpage que `components/objets/`.
 *
 * ┌─────────── CE QUI A QUITTÉ CE FICHIER, ET POURQUOI ───────────┐
 * │ `exp`, `penya` et les taux de butin ne sont PLUS dans le type  │
 * │ `Monstre`. Ils restent dans `public/wiki/monstres.json` — on   │
 * │ ne touche pas au relevé — mais ils ne peuvent plus atteindre   │
 * │ un écran : le compilateur refuse `m.exp`. C'est la demande de  │
 * │ Maxime prise au mot (« taux de drop, exp, penyas : on s'en     │
 * │ fiche »), et un type est le seul garde-fou qui tienne quand    │
 * │ six écrans montrent les mêmes monstres.                       │
 * │ `AVERTISSEMENT_BUTIN` est parti avec eux : il expliquait       │
 * │ l'absence des tables de butin ordinaires, c'est-à-dire d'une   │
 * │ chose dont on se fiche.                                        │
 * └────────────────────────────────────────────────────────────────┘
 */

/** Le monstre tel que `public/wiki/monstres.json` le porte. Les noms de champs
 *  sont courts parce qu'ils sont répétés 1 124 fois dans un fichier de 612 Ko :
 *  écrire « attaqueMinimum » partout coûtait 60 Ko pour rien. */
export type Monstre = {
  id: string;
  nom: string;
  /** Clé de recherche, accents ôtés — calculée à la fouille, pas à la frappe. */
  k: string;
  niv: number | null;
  rang: string | null;
  pv: number;
  pm: number | null;
  atkMin: number | null;
  atkMax: number | null;
  def: number | null;
  resMag: number | null;
  prec: number | null;
  esq: number | null;
  /** Force, endurance, dextérité, intelligence — dans cet ordre. */
  sta: (number | null)[];
  /** Délai entre deux attaques, en millisecondes. */
  delai: number | null;
  elem: string | null;
  elemNiv: number | null;
  res: Record<string, number>;
  agro: string | null;
  vole: boolean;
  zone: string | null;
  /** Porte une clé `NEWSERV` : c'est du contenu ajouté par Airborn. */
  maison: boolean;
  vies: number | null;
  /** PV × vies. Égal aux PV quand il n'y a qu'une vie. */
  pvEff: number;
  rage?: { pv: number; x: number }[];
  soigne?: { pv: number; rend: number }[];
  invoque?: { m: string; n: number; c: number }[];
  renfort?: { m: string; n: number; pv: number };
  fuit?: number;
  distance?: number;
  aggro?: number;
  tache?: boolean;
  /** Le NOM des objets, jamais leur taux : `p` n'est pas déclaré, donc aucun
   *  écran ne peut l'afficher même si le fichier le porte encore. */
  butin?: { o: string; q: number }[];
  butinClient?: { o: string; niv: number }[];
  titre?: { t: string; n: number };
  groupe?: string;
  lieux?: { z: string; n: number }[];
};

/**
 * UNE LIGNE DE CLASSEMENT — treize champs sur trente-quatre.
 *
 * ┌──── CE QUE ÇA CHANGE, ET C'EST MESURÉ ────┐
 * │ Les deux classements de /monstres — 94 boss │
 * │ et 20 frappeurs — descendaient au navigateur│
 * │ en monstres COMPLETS : leur butin, leurs    │
 * │ points d'apparition, leurs invocations,     │
 * │ leurs quatre dés, tout. Soit 70 Ko de       │
 * │ charge utile pour un tableau qui montre     │
 * │ treize colonnes. La projection les ramène à │
 * │ 36 Ko — et le texte qui voyage avec eux     │
 * │ compte dans les mots servis de la page.     │
 * └───────────────────────────────────────────┘
 *
 * `Pick` et non un type à part : les champs gardent le nom, le type et la
 * documentation qu'ils ont dans `Monstre`, et une colonne qu'on ajouterait au
 * tableau sans l'ajouter ici ne compile pas.
 */
export type LigneClassement = Pick<Monstre,
  "id" | "nom" | "niv" | "rang" | "pv" | "pvEff" | "vies" |
  "atkMin" | "atkMax" | "delai" | "elem" | "res" | "groupe">;

/**
 * UN MONSTRE RÉDUIT À « EST-CE QUE J'Y VAIS ? ».
 *
 * C'est ce que la fiche d'un OBJET reçoit pour répondre à « qui le lâche ». Le type
 * vit ici et non dans `catalogue.ts` parce que ce dernier lit le disque : une fiche
 * est un composant client et ne peut rien lui importer, pas même un type.
 * Aucun taux de butin n'y figure — c'est la provenance qui sert.
 */
export type Lacheur = {
  id: string; nom: string; niv: number | null; rang: string | null;
  vies: number | null; pvEff: number; maison: boolean;
  elem: string | null; zone: string | null; groupe?: string;
};

export type Compteurs = {
  maison: number; vies: number; milliard: number;
  rage: number; invoque: number; localises: number; butin: number;
};

/** Recherche à accents normalisés : « Bàäl'tru » se trouve en tapant « baaltru »,
 *  et « Ame » trouve « Âme ». Sans ça, la moitié des noms d'Airborn — qui sont
 *  pleins de diacritiques et d'apostrophes — sont introuvables au clavier. */
export const clefRecherche = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Les gros nombres du haut niveau ne se lisent pas : 30 000 000 000 devient
 *  « 30 Md ». On garde le chiffre exact à côté quand il est le sujet de la ligne. */
export function court(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 10_000) return `${(n / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`;
  return n.toLocaleString("fr-FR");
}

export const entier = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("fr-FR");

/** La couleur d'un rang, pour qu'on repère un « super » sans lire l'étiquette.
 *  Mêmes tons que la fiche de donjon (`donjons/donneesClient.ts`) : deux pages
 *  qui montrent les mêmes monstres ne peuvent pas les colorier autrement. */
export const TON_RANG: Record<string, string> = {
  faible: "var(--text-muted)", normal: "var(--text)", capitaine: "var(--blue)",
  "demi-boss": "var(--gold)", boss: "var(--red)", super: "var(--purple)",
  materiau: "var(--green)",
};

export const tonRang = (r: string | null) => (r && TON_RANG[r]) || "var(--text-muted)";

/** Les 5 éléments du jeu et leur icône, vérifiées servies depuis
 *  `public/jeu/mecaniques/`. « aucun » n'a pas d'image : c'est une absence, pas
 *  un élément, et lui coller une icône ferait croire le contraire. */
export const ELEMENTS = ["feu", "eau", "electricite", "vent", "terre"] as const;

export const ELEMENT_FR: Record<string, string> = {
  feu: "Feu", eau: "Eau", electricite: "Électricité", vent: "Vent", terre: "Terre", aucun: "Aucun",
};

export const TON_ELEMENT: Record<string, string> = {
  feu: "var(--red)", eau: "var(--blue)", electricite: "var(--gold)",
  vent: "var(--green)", terre: "var(--orange)", aucun: "var(--text-muted)",
};

export const iconeElement = (e: string | null) =>
  e && (ELEMENTS as readonly string[]).includes(e) ? `/jeu/mecaniques/element-${e}.webp` : null;

/**
 * Ce à quoi il est faible, ce à quoi il résiste — LU DANS SES RÉSISTANCES.
 *
 * On pourrait appliquer la roue élémentaire (feu > vent > terre > électricité >
 * eau > feu), mais quelques monstres sortent du moule : Clockworks porte +0,5 sur
 * trois éléments à la fois, et des boss sont faibles à leur PROPRE élément — ce
 * que la roue ne produit jamais. Donc on lit les cinq colonnes du client, et rien
 * d'autre. Une valeur négative = il prend PLUS de dégâts de cet élément.
 */
export function faiblesses(res: Record<string, number>) {
  const faible: string[] = [];
  const resiste: string[] = [];
  for (const e of ELEMENTS) {
    const v = res?.[e];
    if (typeof v !== "number" || v === 0) continue;
    (v < 0 ? faible : resiste).push(e);
  }
  return { faible, resiste };
}

/** Les cinq colonnes dans l'ordre du jeu, prêtes pour le graphique. */
export const colonnesRes = (res: Record<string, number>) =>
  ELEMENTS.map((e) => ({ e, v: typeof res?.[e] === "number" ? res[e] : 0 }));

/* ════════ QUEL ÉLÉMENT EMPORTER — LA RÈGLE QUI MANQUAIT ════════
 *
 * Le site montrait les faiblesses MONSTRE PAR MONSTRE et n'a jamais dit la règle
 * pratique : « la plupart sont de terre, prends du vent ». Elle se compte, et le
 * compte porte sa propre nuance, qui est ce qui la rend utilisable :
 *
 *   sur les monstres de TERRE — le gros du catalogue —
 *     le VENT est la faiblesse dominante,
 *     et l'ÉLECTRICITÉ est ENCAISSÉE par la majorité d'entre eux.
 *
 * Se tromper d'élément ne fait pas « un peu moins de dégâts » : ça tape dans une
 * résistance. C'est pour ça que la règle générale sort toujours accompagnée du
 * compte de ceux qui la démentent — jamais d'un pourcentage seul.
 *
 * RIEN N'EST DÉDUIT DE LA ROUE ÉLÉMENTAIRE. La roue existe (voir `faiblesses`),
 * mais elle ne produit ni les monstres à +0,5 sur trois éléments, ni les boss
 * faibles à leur propre élément. Tout ci-dessous est un comptage sur les cinq
 * colonnes du client, et rien d'autre. La règle générale se dit EN PLUS des
 * colonnes, jamais à leur place.
 */

/** Un élément, et ce qu'un lot de monstres en fait : combien le prennent plus fort,
 *  combien l'encaissent mieux, combien ne bougent pas. Les trois se somment à `n`. */
export type ColonneLot = { e: string; faible: number; resiste: number; neutre: number };

export type ConseilElement = {
  /** L'élément des monstres comptés (« terre »), ou « aucun ». */
  groupe: string;
  /** Combien de monstres portent cet élément. */
  n: number;
  /** Les cinq éléments, dans l'ordre du jeu. */
  colonnes: ColonneLot[];
  /** Celui que le plus de monstres du lot prennent plus fort. `null` si aucun. */
  emporter: ColonneLot | null;
  /** Celui que le plus de monstres du lot ENCAISSENT MIEUX : le piège à éviter. */
  eviter: ColonneLot | null;
  /** Combien du lot ne portent que des zéros — l'élément n'y change rien. */
  indifferents: number;
};

/** Le comptage d'un lot déjà filtré. `groupe` n'est qu'une étiquette : la fonction
 *  ne relit pas `elem`, elle ne lit que les cinq colonnes. */
export function conseilElement(lot: { res: Record<string, number> }[], groupe: string): ConseilElement {
  const compte = new Map<string, ColonneLot>(
    ELEMENTS.map((e) => [e, { e, faible: 0, resiste: 0, neutre: 0 }]),
  );
  let indifferents = 0;
  for (const m of lot) {
    let bouge = false;
    for (const e of ELEMENTS) {
      const c = compte.get(e)!;
      const v = typeof m.res?.[e] === "number" ? m.res[e] : 0;
      if (v < 0) { c.faible++; bouge = true; } else if (v > 0) { c.resiste++; bouge = true; } else c.neutre++;
    }
    if (!bouge) indifferents++;
  }
  const colonnes = ELEMENTS.map((e) => compte.get(e)!);
  /* Départage par le NOMBRE, puis par l'ordre du jeu : sans second critère, deux
     éléments à égalité changeaient de place d'un rendu à l'autre selon l'ordre
     d'insertion de la table. */
  const tete = (clef: "faible" | "resiste") => {
    const t = [...colonnes].sort((a, b) => b[clef] - a[clef]
      || ELEMENTS.indexOf(a.e as typeof ELEMENTS[number]) - ELEMENTS.indexOf(b.e as typeof ELEMENTS[number]))[0];
    return t && t[clef] > 0 ? t : null;
  };
  return { groupe, n: lot.length, colonnes, emporter: tete("faible"), eviter: tete("resiste"), indifferents };
}

/**
 * LE CATALOGUE ENTIER, RANGÉ PAR ÉLÉMENT DE MONSTRE — du plus peuplé au moins.
 *
 * C'est la table qui répond à « qu'est-ce que je prends », et le premier lot est
 * la réponse la plus souvent utile parce que c'est le plus gros. `dominant` le
 * nomme pour que les phrases n'aient pas à le supposer : le jour où une fouille
 * renverse le classement, elles suivent.
 */
export function regleElementaire(monstres: { elem: string | null; res: Record<string, number> }[]) {
  const parGroupe = new Map<string, { res: Record<string, number> }[]>();
  for (const m of monstres) {
    const g = m.elem ?? "aucun";
    const l = parGroupe.get(g) ?? [];
    l.push(m);
    parGroupe.set(g, l);
  }
  const lots = [...parGroupe].map(([g, l]) => conseilElement(l, g)).sort((a, b) => b.n - a.n);
  return {
    total: monstres.length,
    lots,
    /** Le lot le plus peuplé — celui dont la règle sert le plus souvent. */
    dominant: lots.find((l) => l.groupe !== "aucun") ?? null,
    /** Combien, sur tout le catalogue, ne portent que des zéros. */
    indifferents: lots.reduce((s, l) => s + l.indifferents, 0),
  };
}

/** Ce que CE monstre-là fait de l'élément qu'on conseille contre les siens.
 *  Trois réponses seulement, et chacune change le geste. */
export function faceALaRegle(res: Record<string, number>, conseille: string | null | undefined) {
  if (!conseille) return "sansRegle" as const;
  const v = typeof res?.[conseille] === "number" ? res[conseille] : 0;
  return v < 0 ? ("suit" as const) : v > 0 ? ("resiste" as const) : ("neutre" as const);
}

/**
 * L'ÉCHELLE DU GRAPHIQUE DE RÉSISTANCES, relevée sur les données.
 *
 * Les 5 601 valeurs du catalogue ne prennent que neuf valeurs distinctes, et
 * 99,8 % d'entre elles tiennent entre −0,3 et +0,5. Huit monstres portent 100 ou
 * 718 — hors de toute échelle commune. On borne donc à 0,5 et on écrit le
 * nombre à côté de la barre : une barre pleine avec « +718 » lisible dit la
 * vérité, alors qu'une échelle à 718 écraserait les 1 115 autres monstres à zéro.
 */
export const RES_ECHELLE = 0.5;

/**
 * LE COUP LE PLUS FORT QU'IL PORTE — et pourquoi ce n'est pas simplement `atkMax`.
 *
 * Cinq monstres du catalogue portent leurs deux bornes de dégâts À L'ENVERS dans
 * le client : la borne « basse » est la plus haute. Pour la Divinité du Chaos,
 * atkMin vaut 360 000 et atkMax 36 001. Prendre `atkMax` tel quel annonce un coup
 * DIX FOIS trop faible, et range le monstre le plus violent de sa famille en
 * dernier dans un classement par dégâts.
 *
 * Les cinq, relevés sur les données : Général d'Ishtar, Elémentaire du Cahos
 * (Trash), Divinité du Chaos (Big Boss), Esprit tourmenté protecteur, et
 * Navi & Titania.
 *
 * Vit ici et non dans une page : /monstres, /worldboss et la recherche montrent
 * les MÊMES monstres, et ont affiché deux chiffres différents pour le même
 * monstre tant que chacune faisait son calcul. Une seule fonction, un seul
 * nombre.
 */
export const coupMax = (m: { atkMin: number | null; atkMax: number | null }) =>
  Math.max(m.atkMin ?? 0, m.atkMax ?? 0);

/** La borne la plus basse, une fois les deux remises dans l'ordre. Sert à écrire
 *  la fourchette « 36 001 à 360 000 » sans la donner à l'envers. */
export const coupMin = (m: { atkMin: number | null; atkMax: number | null }) =>
  Math.min(m.atkMin ?? 0, m.atkMax ?? 0);

/** Vrai quand le client donne les bornes à l'envers : la fiche peut alors le
 *  DIRE au lieu de corriger en silence. */
export const bornesInversees = (m: { atkMin: number | null; atkMax: number | null }) =>
  m.atkMin != null && m.atkMax != null && m.atkMax < m.atkMin;

/** Dégâts par seconde sur une cible : le seul moyen de comparer un boss qui
 *  frappe fort lentement et un boss qui frappe deux fois moins fort quatre fois
 *  plus vite. Partagé pour que /monstres et /worldboss ne divergent pas. */
export const parSeconde = (m: { atkMin: number | null; atkMax: number | null; delai: number | null }) =>
  m.delai && m.delai > 0 ? Math.round((coupMax(m) * 1000) / m.delai) : 0;

/** Coups par seconde, à partir du délai en millisecondes. C'est la donnée que le
 *  tank regarde : 4 millions de dégâts toutes les 4 secondes et les mêmes toutes
 *  les 250 ms ne sont pas le même combat. */
export function cadence(delaiMs: number | null): string | null {
  if (!delaiMs || delaiMs <= 0) return null;
  const parSec = 1000 / delaiMs;
  return parSec >= 1
    ? `${parSec.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} coups/s`
    : `1 coup toutes les ${(delaiMs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
}

/**
 * LA MÊME CADENCE EN DEUX SIGNES, pour une carte ou une colonne.
 *
 * « 1 coup toutes les 3,5 s » fait six mots. Il y en a quarante-huit à l'écran dans
 * la recherche et quatre-vingt-quatorze dans le classement des boss : la même phrase
 * répétée cent quarante fois, c'est six cents mots pour une donnée qui tient en deux
 * signes. La phrase complète n'est pas perdue — elle passe dans l'infobulle du
 * navigateur, et la fiche du monstre, qui n'en montre qu'une, la garde en clair.
 *
 * L'UNITÉ CHANGE AVEC LE MONSTRE, ET C'EST VOULU. 1 039 des 1 123 frappent moins
 * d'une fois par seconde : pour eux le chiffre qui parle est l'INTERVALLE (« 3,5 s »).
 * Les 84 autres — les boss des Chambres à 250 ms, certains du Chaos à 101 — se lisent
 * en COUPS PAR SECONDE (« 9,9/s »). Le suffixe « /s » distingue les deux sans un mot :
 * « 3,5 s » est une durée, « 9,9/s » une fréquence. Tout ramener à une seule unité
 * afficherait « 0,29/s » pour le cas ordinaire, et « 0/s » pour le monstre dont le
 * client écrit 250 000 000 ms — un zéro qui se lirait comme une donnée manquante.
 */
export function cadenceCourte(delaiMs: number | null): string | null {
  if (!delaiMs || delaiMs <= 0) return null;
  const parSec = 1000 / delaiMs;
  return parSec >= 1
    ? `${parSec.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/s`
    : `${(delaiMs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
}

/**
 * LES HUIT PORTRAITS QU'ON A LE DROIT DE MONTRER.
 *
 * Le client porte 118 illustrations de cartes de monstre (110 × 250,
 * `public/jeu/cartes/couleur_ii_sys_sys_monsterdeck_<n>.webp`) dont la collection
 * est le sujet de /crafts. Douze d'entre elles portent le nom EXACT d'un monstre
 * du catalogue — mais un nom identique ne prouve pas que le dessin représente la
 * bête. Les douze ont donc été OUVERTES une par une, et seules celles dont
 * l'illustration correspond visiblement au monstre sont ici :
 *
 *   Lawolf → un loup bleu ; Dantalian → un sorcier encapuchonné ; Mordillos →
 *   un lycan violet (son identifiant client est MI_LYCANOS01) ; Nyx → un ange
 *   noir ailé (MI_ANGELWHITE3) ; Kraken → une bête marine à tentacules ;
 *   Dragon de Jade → un dragon vert ; Clockworks → le colosse mécanique ;
 *   Rangda → une figure en robe noire couverte de crânes.
 *
 * ÉCARTÉES malgré le nom identique : « Stalagmite » (une créature végétale, quand
 * le monstre est MI_GPOTATO02) et « Remardda » (un fauve de boss, quand le monstre
 * est de niveau 12). Un portrait faux est pire que pas de portrait — c'est le même
 * arbitrage que les quatre vues aériennes retirées du site.
 */
const PORTRAITS: Record<string, number> = {
  MI_LAWOLF2: 3, MI_DANTALIAN02: 24, MI_LYCANOS01: 35, MI_ANGELWHITE3: 42,
  MI_HERNKRAKEN01: 48, MI_NEWDRAGON: 50, MI_CLOCKWORK1: 55,
  MI_RANGDA01: 59, MI_RANGDA01_1: 59,
};

export const portraitDe = (id: string) =>
  PORTRAITS[id] ? `/jeu/cartes/couleur_ii_sys_sys_monsterdeck_${PORTRAITS[id]}.webp` : null;

/**
 * LES SIX ICÔNES DE BUTIN QUE LE PONT NE TROUVE PAS — ET QU'ON A OUVERTES.
 *
 * `monstres-butin.json` tire l'icône d'un objet de `objets-fiches.json`, et huit des
 * 106 objets de butin n'y portent aucun champ d'icône : leur pastille s'affiche donc
 * sans image. Les huit fichiers, eux, EXISTENT sous `public/jeu/icones/` — c'est le
 * relevé qui ne fait pas le lien, et une autre table du site (`objets-jeu.json`) le
 * fait par NOM.
 *
 * ┌────── POURQUOI SIX ET NON HUIT : LES NOMS MENTENT ──────┐
 * │ Les huit candidates ont été CONVERTIES ET REGARDÉES une  │
 * │ par une. Six montrent l'objet : un cœur ébréché, un croc,│
 * │ un maillon de chaîne brisé, une lame, une patte d'insecte│
 * │ verte, un parchemin scellé à la cire. DEUX SONT ÉCARTÉES:│
 * │  · « Fragment de Cœur » → un BOUQUET DE FLEURS. La table │
 * │    par nom se trompe (c'est un objet d'event homonyme),  │
 * │    et cet objet-là est lâché par 265 monstres : l'erreur │
 * │    aurait été la plus visible du site ;                  │
 * │  · « Boîte vide » → un paquet cadeau fermé, ruban        │
 * │    compris. Rien ne prouve que c'est le bon objet, et    │
 * │    une boîte VIDE dessinée fermée et enrubannée ne dit   │
 * │    pas la vérité. Faute de certitude : rien.             │
 * └───────────────────────────────────────────────────────┘
 *
 * Une table écrite à la main, comme `PORTRAITS` juste au-dessus, et pour la même
 * raison : ce n'est pas un calcul, c'est une VÉRIFICATION à l'œil. Elle ne fabrique
 * aucun chiffre — elle ne fait que rattacher un fichier vu à un nom.
 */
const ICONES_BUTIN: Record<string, string> = {
  "Morceau de coeur de Shade": "itm_syssyseveheartpi.webp",
  "Dent de Jeune Lawolf": "itm_syssysquelawtoo.webp",
  "Chaîne de Bang": "itm_syssysquebangch.webp",
  "Couteaux Pukepuke": "itm_syssysquepukekl.webp",
  "Jambe de Fefern": "itm_syssysquefefele.webp",
  "Sceau de Nevil": "itm_syssysquenpcld.webp",
};

/** L'icône du pont si elle existe, sinon celle qu'on a vérifiée à l'œil, sinon
 *  RIEN — jamais un fichier deviné. */
export const iconeButin = (nom: string, ic?: string | null) => ic ?? ICONES_BUTIN[nom] ?? null;
