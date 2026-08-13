import fs from "node:fs";
import path from "node:path";

/**
 * LES TABLES — les cinq relevés, lus une fois, indexés, gardés en mémoire.
 *
 * Pourquoi ici et pas dans le moteur : `objets-stats.json` fait 1,1 Mo et
 * `bonus-sources.json` 512 Ko. La règle de la maison (seuils de poids) envoie
 * tout ce qui dépasse 120 Ko dans une route API qui lit avec `fs` et garde son
 * index en mémoire — modèles : src/lib/ouFarmer.ts, src/components/monstres/catalogue.ts.
 * Le moteur (`moteur.ts`) est pur : il reçoit ces tables et ne touche pas au disque,
 * ce qui le rend testable et réutilisable côté navigateur si un jour on sert un
 * extrait compact.
 *
 * CE QUI EST LU, ET POURQUOI CE FICHIER-LÀ :
 *   public/wiki/objets-stats.json      les bonus PROPRES d'un objet, en codes DST_.
 *                                     5 075 objets, 2 518 avec bonus, six paires au plus.
 *   src/data/statistiques-objets.json  le dictionnaire DST_ → libellé français.
 *   public/airbuilder/paliers.json     les paliers d'accessoire, libellés DÉJÀ en français.
 *   public/wiki/bonus-sources.json     panoplies, sertissage, perçage, rareté, maîtrise
 *                                     d'arme, éveil, artefact, anges, facteurs de classe.
 *   public/airbuilder/data.json        le catalogue du builder (ITEMS), les signatures de
 *                                     panoplie (PANO), les gemmes (GEMU, GEMC, HOLOSTATS),
 *                                     les carnets et les mécaniques (MECH).
 *
 * DEUX VOCABULAIRES, UN SEUL BUS. Les relevés du client parlent en codes DST_ ;
 * data.json et paliers.json parlent français. Le moteur travaille en codes et
 * traduit à l'affichage — l'index `codeDeLibelle` fait le pont. Un libellé qui
 * n'a pas de code reste BRUT et se signale : mieux vaut une ligne « non traduite »
 * qu'une ligne rangée dans le mauvais sac.
 *
 * ┌─── LE PIÈGE DE SYNO ───────────────────────────────────────────────────┐
 * │ data.json porte une table de synonymes SYNO, et elle contient           │
 * │ « Défense » → « Défense % ». C'est vrai pour le libellé du CLIENT       │
 * │ (DST_ADJDEF_RATE s'affiche « Défense » en jeu) et FAUX pour le libellé  │
 * │ du relevé, où « Défense » est DST_ADJDEF, un absolu. Appliquer SYNO aux │
 * │ libellés de ITEMS/PANO/paliers transformerait donc de la défense en     │
 * │ pourcentage de défense. SYNO n'est utilisé ici QUE pour les entrées que │
 * │ le dictionnaire ne connaît pas, et jamais pour écraser une             │
 * │ correspondance directe.                                                │
 * └────────────────────────────────────────────────────────────────────────┘
 */

export type BonusBrut = [string, number];

export type ObjetClient = {
  i: number; cle: string; n?: string;
  t1?: string; t2?: string; k3?: string; em?: string; g?: string;
  job?: string; sx?: string; h?: number; wt?: string; ar?: string;
  lv?: number; nr?: number;
  dn?: number; dx?: number; va?: number; pa?: number; bl?: number;
  ea?: number; rf?: number; el?: string; re?: Record<string, number>;
  b?: BonusBrut[];
};

export type EntreeDictionnaire = { code: string; n: number | string; objets: number; fr?: string; client?: string };

export type LignePanoplie = { code: string; valeur: number | null; pieces: number };
export type Panoplie = {
  rang: number;
  id: number;
  n?: string;
  pieces: { cle: string; i?: number; n?: string; em?: string }[];
  paliers: LignePanoplie[];
};

export type Gemme = { cle: string; i: number; n?: string };
export type LigneSertissage = { gemme: Gemme; taillee?: { cle: string; i?: number }; paliers: number[] };
export type Sertissage = { code: string; gemmes: LigneSertissage[] };

export type Palier = { n: string; cle: string; plafond: number; rangs: [string, number][][] };

export type FacteurClasse = {
  classe: string;
  /** 공속 — la base de vitesse d'attaque de la classe. Nom rendu par la lecture, pas par le fichier. */
  colonne1: number;
  MaxHP: number; MaxMP: number; MaxFP: number;
  /** 물리방어력관련 — le facteur de défense PHYSIQUE de la classe. */
  colonne5: number;
  hp: number; mp: number; fp: number;
  SWD: number; AXE: number; STAFF: number; STICK: number; KNUCKLE: number; WAND: number; YOYO: number;
  BLOCKING: number; CRITICAL: number;
  ICON?: string;
};

export type MaitriseArme = { porte: "type" | "objet"; cible: string; code: string; parRarete: Record<string, number> };

export type Tables = {
  /** Objets du client, par identifiant numérique et par clé symbolique. */
  objetParId: Map<number, ObjetClient>;
  objetParCle: Map<string, ObjetClient>;
  /** Le dictionnaire, par code. */
  dictionnaire: Map<string, EntreeDictionnaire>;
  /** Libellé français (normalisé) → code DST_. */
  codeDeLibelle: Map<string, string>;
  /** Paliers d'accessoire, par identifiant d'objet (clé de texte, comme dans le fichier). */
  paliers: Map<number, Palier>;
  /** Panoplies du client, et l'index pièce → panoplies qui la contiennent. */
  panoplies: Panoplie[];
  panoplieDePiece: Map<number, number[]>;
  /** Sertissage d'arme, par code puis par nom de gemme. */
  sertissage: Map<string, Map<string, number[]>>;
  /**
   * Les neuf statistiques de sertissage. `apparie` dit si le code vient du NOM
   * (le bon chemin) ou du RANG (un repli, quand le libellé de GEMU est anglais),
   * et `concorde` si l'ordre de GEMU colle à celui du client.
   */
  ordreSertissage: {
    libelle: string; code: string; max: number;
    apparie: "nom" | "rang"; concorde: boolean | null;
  }[];
  /** Gemmes de costume : code → les quatre paliers. */
  gemmesCostume: Map<string, number[]>;
  /** Diamants holographiques d'artefact : code → valeur. */
  holographiques: { code: string; libelle: string; valeur: number }[];
  /** Cartes de perçage, par identifiant et par clé. */
  cartesParId: Map<number, { n: string; b: BonusBrut[] }>;
  cartesParCle: Map<string, { n: string; b: BonusBrut[] }>;
  /** Maîtrise d'arme : par TYPE2_ d'arme et par clé d'objet. */
  maitriseParType: Map<string, MaitriseArme[]>;
  maitriseParObjet: Map<string, MaitriseArme[]>;
  /** Rareté : les viviers par famille IK3_ et par objet, et le nombre de lignes. */
  rarete: {
    lignes: { amount: number; chance: number }[];
    viviers: Map<string, { id: string; minPercent: number; maxPercent: number }[]>;
    parObjet: Map<string, { id: string; minPercent: number; maxPercent: number }[]>;
    paliers: string[];
  };
  /** Plafonds d'éveil, par code. */
  plafondEveil: { general: Record<string, number>; costume: Record<string, number>; pet: Record<string, number> };
  /** Facteurs de classe, par code de classe du client (VAGRANT, RANGER_HERO…). */
  facteurs: Map<string, FacteurClasse>;
  /**
   * Catalogue du builder, par identifiant RENDU EN TEXTE. Les vingt-quatre pièces
   * de costume portent un identifiant de TEXTE (« itm_mSeakingLook01_Cap-32.dds#HP »)
   * là où tout le reste porte un nombre : un index numérique les perdrait toutes.
   */
  catalogue: Map<string, CatalogueEntree>;
  /** Signatures de panoplie du builder (64) — sert de libellé et de contre-épreuve. */
  signatures: Map<string, { n: string; lignes: [number, string, number][] }>;
  /** Carnets de cartes, dans l'ordre du fichier. */
  carnets: { nom: string; base: BonusBrut[]; complet: BonusBrut[] }[];
  /** Les mécaniques déclarées (plafonds, emplacements, non-calculables). */
  mech: Mech;
  /** Les sources, telles que les relevés les écrivent. */
  sources: Record<string, string>;
};

export type CatalogueEntree = {
  id: number | string; n: string; ic?: string; lv?: number; pr?: number;
  tier?: string; cls?: string; sex?: string;
  b?: [string, number][]; atk?: [number, number] | null;
  set?: string; piece?: string; setb?: [string, number][];
  emplacement: string;
};

type Mech = {
  arme: Record<string, unknown>;
  bijou: Record<string, unknown>;
  armure: Record<string, unknown>;
  mode: Record<string, unknown>;
};

let TABLES: Tables | null = null;

const racine = () => process.cwd();
const lire = (...bouts: string[]) => JSON.parse(fs.readFileSync(path.join(racine(), ...bouts), "utf-8"));

/** Comparaison de libellés tolérante aux accents, à la casse et à la ponctuation. */
export function clefLibelle(libelle: string): string {
  return (libelle || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

export function chargerTables(): Tables {
  if (TABLES) return TABLES;

  const objets = lire("public", "wiki", "objets-stats.json") as {
    source: string; objets: ObjetClient[];
  };
  const dico = lire("src", "data", "statistiques-objets.json") as {
    source: string; stats: EntreeDictionnaire[]; sansLibelle: string[]; nonDefinis: string[];
  };
  const pal = lire("public", "airbuilder", "paliers.json") as {
    source: string; bijoux: Record<string, Palier>;
  };
  const bs = lire("public", "wiki", "bonus-sources.json") as Record<string, unknown> & { source: string };
  const db = lire("public", "airbuilder", "data.json") as Record<string, unknown>;

  const objetParId = new Map<number, ObjetClient>();
  const objetParCle = new Map<string, ObjetClient>();
  for (const o of objets.objets) {
    objetParId.set(o.i, o);
    if (o.cle) objetParCle.set(o.cle, o);
  }

  const dictionnaire = new Map<string, EntreeDictionnaire>();
  const codeDeLibelle = new Map<string, string>();
  for (const e of dico.stats) {
    dictionnaire.set(e.code, e);
    if (e.fr) {
      const k = clefLibelle(e.fr);
      if (!codeDeLibelle.has(k)) codeDeLibelle.set(k, e.code);
    }
  }
  // Le libellé du CLIENT en second choix : il complète, il n'écrase pas.
  for (const e of dico.stats) {
    if (!e.client) continue;
    const k = clefLibelle(e.client);
    if (!codeDeLibelle.has(k)) codeDeLibelle.set(k, e.code);
  }
  // SYNO en dernier, et seulement pour ce qui manque encore. Voir l'en-tête.
  const syno = (db.SYNO ?? {}) as Record<string, string>;
  for (const [de, vers] of Object.entries(syno)) {
    const kDe = clefLibelle(de);
    if (codeDeLibelle.has(kDe)) continue;
    const cible = codeDeLibelle.get(clefLibelle(vers));
    if (cible) codeDeLibelle.set(kDe, cible);
  }

  const paliers = new Map<number, Palier>();
  for (const [id, p] of Object.entries(pal.bijoux)) paliers.set(Number(id), p);

  const panoplies = ((bs.panoplies ?? []) as Omit<Panoplie, "rang">[]).map((p, rang) => ({ ...p, rang }));
  const panoplieDePiece = new Map<number, number[]>();
  for (const p of panoplies) {
    for (const piece of p.pieces) {
      if (typeof piece.i !== "number") continue;
      const liste = panoplieDePiece.get(piece.i) ?? [];
      liste.push(p.rang);
      panoplieDePiece.set(piece.i, liste);
    }
  }

  const sertBrut = (bs.sertissage ?? {}) as {
    ultimes: Sertissage[]; costume: { code: string; paliers: number[] }[];
  };
  const sertissage = new Map<string, Map<string, number[]>>();
  for (const bloc of sertBrut.ultimes ?? []) {
    const parGemme = new Map<string, number[]>();
    for (const ligne of bloc.gemmes) parGemme.set(ligne.gemme.n ?? ligne.gemme.cle, ligne.paliers);
    sertissage.set(bloc.code, parGemme);
  }
  const gemmesCostume = new Map<string, number[]>();
  for (const g of sertBrut.costume ?? []) gemmesCostume.set(g.code, g.paliers);

  // ┌─── L'APPARIEMENT SE FAIT PAR NOM, PAS PAR RANG ────────────────────────┐
  // │ Le moteur interdit de lire une valeur de gemme à l'index d'un nom :     │
  // │ c'est la cause de l'écart nom/effet entre GEMU et DIASTATS. Cette table │
  // │ doit donc être construite de la même façon, sinon l'interdit est écrit  │
  // │ dans les commentaires et violé dans le code. Chaque libellé de GEMU est │
  // │ traduit en code par le DICTIONNAIRE, puis on vérifie que ce code figure │
  // │ bien parmi les neuf du client. Le rang ne sert plus qu'à une            │
  // │ CONTRE-ÉPREUVE : `concorde` dit si l'ordre de GEMU colle à celui du     │
  // │ client, et un désaccord se voit au lieu de passer inaperçu.             │
  // │ « Melee Stealhp » est un libellé ANGLAIS resté dans GEMU : le           │
  // │ dictionnaire ne le connaît pas, et c'est le seul des neuf qui doive     │
  // │ retomber sur le rang. Il est marqué comme tel.                          │
  // └────────────────────────────────────────────────────────────────────────┘
  const gemu = (db.GEMU ?? []) as { fr: string; v: number }[];
  const codesUltimes = (sertBrut.ultimes ?? []).map((x) => x.code);
  const neufDuClient = new Set(codesUltimes);
  const ordreSertissage = gemu.map((g, rang) => {
    const parNom = codeDeLibelle.get(clefLibelle(g.fr)) ?? null;
    const parNomValide = parNom && neufDuClient.has(parNom) ? parNom : null;
    const parRang = codesUltimes[rang] ?? "";
    return {
      libelle: g.fr,
      code: parNomValide ?? parRang,
      max: g.v,
      /** Comment ce code a été trouvé. « rang » est un repli, et il se voit. */
      apparie: (parNomValide ? "nom" : "rang") as "nom" | "rang",
      /** Faux = GEMU et le client ne rangent pas cette statistique au même rang. */
      concorde: parNomValide ? parNomValide === parRang : null,
    };
  });

  const artefact = (bs.artefact ?? {}) as {
    pierres: { abilities: { dstId: string; adjValue: number }[] }[];
  };
  const holographiques = (artefact.pierres?.[0]?.abilities ?? []).map((a) => ({
    code: a.dstId,
    libelle: dictionnaire.get(a.dstId)?.fr ?? a.dstId,
    valeur: a.adjValue,
  }));

  const percage = (bs.percage ?? {}) as { cartes: { carte: { cle: string; i: number; n: string }; b: BonusBrut[] }[] };
  const cartesParId = new Map<number, { n: string; b: BonusBrut[] }>();
  const cartesParCle = new Map<string, { n: string; b: BonusBrut[] }>();
  for (const c of percage.cartes ?? []) {
    cartesParId.set(c.carte.i, { n: c.carte.n, b: c.b });
    cartesParCle.set(c.carte.cle, { n: c.carte.n, b: c.b });
  }

  const maitrise = (bs.maitriseArme ?? {}) as { statistiques: MaitriseArme[] };
  const maitriseParType = new Map<string, MaitriseArme[]>();
  const maitriseParObjet = new Map<string, MaitriseArme[]>();
  for (const m of maitrise.statistiques ?? []) {
    const cible = m.porte === "type" ? maitriseParType : maitriseParObjet;
    const liste = cible.get(m.cible) ?? [];
    liste.push(m);
    cible.set(m.cible, liste);
  }

  const rarBrut = (bs.rarete ?? {}) as {
    lignes: { amount: number; chance: number }[];
    viviers: { id: string; availableBonus: { id: string; minPercent: number; maxPercent: number }[] }[];
    parObjet: { id: string; availableBonus: { id: string; minPercent: number; maxPercent: number }[] }[];
  };
  const rarete = {
    lignes: rarBrut.lignes ?? [],
    viviers: new Map((rarBrut.viviers ?? []).map((v) => [v.id, v.availableBonus])),
    parObjet: new Map((rarBrut.parObjet ?? []).map((v) => [v.id, v.availableBonus])),
    paliers: ((db.MECH as Mech | undefined)?.arme?.rarete_tiers as string[] | undefined) ?? [],
  };

  const facteurs = new Map<string, FacteurClasse>();
  const fdc = (bs.facteursDeClasse ?? {}) as { classes: FacteurClasse[] };
  for (const f of fdc.classes ?? []) facteurs.set(f.classe, f);

  const items = (db.ITEMS ?? {}) as Record<string, CatalogueEntree[]>;
  const catalogue = new Map<string, CatalogueEntree>();
  for (const [emplacement, liste] of Object.entries(items)) {
    for (const it of liste) {
      if (it.id == null) continue;
      catalogue.set(String(it.id), { ...it, emplacement });
    }
  }

  const signatures = new Map<string, { n: string; lignes: [number, string, number][] }>(
    Object.entries((db.PANO ?? {}) as Record<string, { n: string; lignes: [number, string, number][] }>),
  );

  const carnets = ((db.CARNETS ?? []) as { nom: string; base: BonusBrut[]; complet: BonusBrut[] }[]).map((c) => ({
    nom: c.nom, base: c.base ?? [], complet: c.complet ?? [],
  }));

  TABLES = {
    objetParId, objetParCle, dictionnaire, codeDeLibelle, paliers,
    panoplies, panoplieDePiece, sertissage, ordreSertissage, gemmesCostume, holographiques,
    cartesParId, cartesParCle, maitriseParType, maitriseParObjet, rarete,
    plafondEveil: (bs.eveil ?? { general: {}, costume: {}, pet: {} }) as Tables["plafondEveil"],
    facteurs, catalogue, signatures, carnets,
    mech: (db.MECH ?? { arme: {}, bijou: {}, armure: {}, mode: {} }) as Mech,
    sources: {
      objets: objets.source,
      libelles: dico.source,
      paliers: pal.source,
      bonus: bs.source,
      builder: String((db.SRC as Record<string, string> | undefined)?.objets ?? ""),
      reserve: String((db.SRC as Record<string, string> | undefined)?.reserve ?? ""),
    },
  };
  return TABLES;
}

/** Le code d'un libellé français, ou `null` s'il n'en existe pas. */
export function codeDe(tables: Tables, libelle: string): string | null {
  return tables.codeDeLibelle.get(clefLibelle(libelle)) ?? null;
}

/** Le libellé français d'un code, ou `null` — un code sans libellé reste BRUT. */
export function libelleDe(tables: Tables, code: string): string | null {
  return tables.dictionnaire.get(code)?.fr ?? null;
}
