// ════════════════════════════════════════════════════════════════════════════
//  LE BONUS D'UN BIJOU PALIER PAR PALIER — accessory.inc
//  node scripts/extraire-paliers-accessoires.mjs  →  public/wiki/paliers-accessoires.json
// ════════════════════════════════════════════════════════════════════════════
//
// CE QUE CE FICHIER RÉPARE. Le site connaissait deux choses d'un bijou : la ligne
// de `Spec_Item.txt` (dans `public/wiki/objets-stats.json`) et la panoplie à
// laquelle il appartient (dans `public/wiki/bonus-sources.json`). Il ne connaissait
// PAS le troisième terme, et c'est celui que Maxime décrit : « Anneau aile,
// 30 niveaux, chaque palier est différent ». Ce troisième terme est une TABLE
// EXPLICITE du client, jamais relevée jusqu'ici :
//
//   Client/data-02.air  ▸  accessory.inc   (57 961 octets, UTF-8, fins CRLF)
//
// L'encodage : le fichier est bien de l'UTF-8 — ses premiers octets sont
// EF BF BD (U+FFFD), le commentaire coréen d'origine a déjà été détruit à la
// source. Le lire en Windows-1252 ne perd aucune donnée (tout le reste est de
// l'ASCII) mais l'annonce était fausse et vaut d'être corrigée.
//
// Sa forme, telle qu'elle est écrite :
//
//   Accessory
//   {
//       II_GEN_JEW_RIN_STRRING          // le commentaire est en coréen mutilé
//       {
//           0   {   DST_STR   1   }
//           1   {   DST_STR   2   }
//           …
//           20  {   DST_STR   40  }
//       }
//   }
//
// Un palier peut porter PLUSIEURS statistiques sur la même ligne, et peut être
// VIDE (`0 { }`). Le fichier est lu au compteur d'accolades, pas à l'expression
// régulière : l'indentation y est incohérente (un à trois tabulations selon le
// bloc) et deux objets se suivent parfois sans ligne vide.
//
// ─────────────── CE QUE LA TABLE DIT, ET CE QU'ELLE NE DIT PAS ───────────────
//
// ELLE DIT le plafond, objet par objet. 75 bijoux y figurent : 69 vont de 0 à 20
// (21 paliers) et SIX vont de 0 à 30 (31 paliers). Les six sont exactement les
// accessoires de Noël 2016 — dont l'Anneau Ailé. Le « 30 » de Maxime est donc
// écrit dans le client, et il ne vaut QUE pour ces six objets. Le plafond n'est
// pas une constante du jeu : c'est une propriété de l'objet.
//
// ELLE DIT que la table et `Spec_Item.txt` ne se contredisent JAMAIS, parce
// qu'elles ne parlent jamais du même objet en même temps. Vérifié sur les 75 :
// 33 ont leur bonus dans `accessory.inc` seul (palier 0 rempli, `Spec_Item` vide),
// 30 l'ont dans `Spec_Item` seul (palier 0 vide), 12 sont vides des deux côtés
// (coffres, vieux anneaux désactivés). ZÉRO recouvrement, donc zéro arbitrage à
// faire. C'est le meilleur résultat possible : les deux sources s'additionnent
// sans qu'on ait à choisir.
//
// ELLE NE DIT PAS si le palier N REMPLACE le palier N−1 ou s'AJOUTE à lui. Les
// valeurs de l'Anneau Ailé (1, 2, 2, 3, 3, 4…) ressemblent à un remplacement —
// un cumul donnerait des sommes énormes — mais RIEN dans le fichier ne l'écrit.
// La règle est compilée dans Neuz.exe (`accessory.inc` y figure comme chaîne de
// caractères, à côté de `propEnchant.inc`). On recopie donc les valeurs brutes
// et on laisse `cumulOuRemplacement: "non dit par le client"`. Un dégât faux est
// pire qu'un dégât absent.
//
// ELLE NE DIT PAS non plus le NOM du palier côté joueur (« +5 » ? « niveau 5 » ?),
// ni ce qui fait monter un palier. Le client nomme l'opération ailleurs :
// `defineachievement.h` distingue `MODE_TASK_ENCHANT_JEWELRY_MAX` de
// `MODE_TASK_ENCHANT_WEAPONS_MAX` — le bijou et l'arme montent par deux
// mécaniques différentes, ce qui explique deux plafonds différents (20 ou 30
// contre 10).
//
// ─────────────────────────── LES SIX RARETÉS ────────────────────────────────
//
// Deux fichiers du client les comptent, indépendamment l'un de l'autre :
//   · propweaponleveling.inc  nomme les six : NONE, RARE, EPIC, LEGENDARY,
//     PREMYTHIC, MYTHIC (dans `AddRarityStat`).
//   · randomitemstat.inc      les numérote : `dwRarity` va de 1 à 5, plus le 0
//     implicite — six valeurs, cohérent avec les six noms.
// Et les images le confirment : `Client/Data/Item/data.air` porte
// `item_edgerarity1.tga` … `item_edgerarity5.tga` (cinq bordures pour cinq
// raretés visibles, la 0 n'en a pas). ATTENTION : les fichiers 4 et 5 sont
// OCTET POUR OCTET IDENTIQUES (md5 d39f05c4…). Le jeu lui-même ne distingue
// donc pas Pré-Mythique de Mythique par la bordure ; seul le mot les sépare.
//
// ──────────────────────── LES PLAFONDS, PAR FAMILLE ─────────────────────────
//
// Chaque chiffre ci-dessous vient d'un fichier nommé, aucun d'une communauté :
//   bijou               20, et 30 pour six objets   accessory.inc (compté)
//   arme/armure         10                          propEnchant.inc (colonnes
//                                                   L1…L10) et les parchemins
//                                                   II_SYS_SYS_SCR_ENCHANT_
//                                                   ABSOLUTE06…10 de defineitem.h
//   arme artefact       20                          artefact.json, generalUpgrade.
//                                                   probabilities = niveaux 11→20
//   perçage             12                          artefact.json, maxPiercingLevel
//   maîtrise d'arme     100 (13 paliers)            propweaponleveling.inc, AddStage
//   ange                50 (5 paliers de buff)      angels.json
//
// LE « +10 » DU BUILDER N'EST DONC PAS FAUX — il est INCOMPLET. Il vaut pour une
// arme non-artefact et pour une armure, et pour rien d'autre.

import fs from "node:fs";
import path from "node:path";
import { lireArchive, texte } from "./lib-air.mjs";

const racine = process.cwd();
const CLIENT = process.env.AIRFLYFF_CLIENT
  ?? path.join(process.env.HOME, "Desktop/source/AirflyffClient_Octobre_2025/Client");

const a00 = lireArchive(path.join(CLIENT, "data-00.air"));
const a01 = lireArchive(path.join(CLIENT, "data-01.air"));
const a02 = lireArchive(path.join(CLIENT, "data-02.air"));
const a05 = lireArchive(path.join(CLIENT, "data-05.air"));
const sys = lireArchive(path.join(CLIENT, "FSDATA/COMMON/Systems/data.air"));

// ── Résolution nom/identifiant, même chaîne que extraire-bonus-sources.mjs ────
// Le nom d'un objet ne se DÉDUIT PAS de son numéro : il faut passer par la
// deuxième colonne de Spec_Item.txt, qui nomme le texte à afficher.
const ID_OBJET = new Map();
for (const m of texte(a00.get("defineitem.h")).matchAll(/^#define\s+(II_[A-Z0-9_]+)\s+(-?\d+)/gm)) {
  if (!ID_OBJET.has(m[1])) ID_OBJET.set(m[1], +m[2]);
}
const tableIds = (src) => {
  const m = new Map();
  for (const l of src.split(/\r?\n/)) {
    const x = /^\s*(\S+)(?:\s+(.*))?$/.exec(l.replace(/^﻿/, ""));
    if (x) m.set(x[1], (x[2] ?? "").trim());
  }
  return m;
};
const NOM_OBJET = tableIds(texte(a01.get("propitem.txt.txt")));
const TEXTE_DE = new Map();
for (const l of texte(a05.get("Spec_Item.txt")).split(/\r?\n/)) {
  if (!l || l.startsWith("//")) continue;
  const c = l.split("\t");
  if (c.length < 100) continue;
  const cle = (c[1] ?? "").trim();
  if (cle.startsWith("II_") && !TEXTE_DE.has(cle)) TEXTE_DE.set(cle, (c[2] ?? "").trim());
}
const objetNomme = (cle) => {
  const o = { cle };
  const i = ID_OBJET.get(cle);
  if (i != null) o.i = i;
  const t = NOM_OBJET.get(TEXTE_DE.get(cle) ?? "");
  if (t) o.n = t;
  return o;
};

const anomalies = [];

// ── LE RELEVÉ ────────────────────────────────────────────────────────────────
// Compteur d'accolades, sur le texte débarrassé de ses commentaires. On ne se
// fie NI à l'indentation (elle varie de 1 à 3 tabulations) NI aux lignes vides
// (deux objets se touchent parfois).
const brut = texte(a02.get("accessory.inc"));
const sansCommentaires = brut.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

// Un mot, un nombre ou une accolade. Le lexique suffit : le fichier n'a pas de
// chaîne entre guillemets.
const jetons = sansCommentaires.match(/\{|\}|[^\s{}]+/g) ?? [];

let i = 0;
// On saute jusqu'à l'accolade qui ouvre `Accessory`.
while (i < jetons.length && jetons[i] !== "{") i++;
if (i >= jetons.length) throw new Error("accessory.inc : bloc Accessory introuvable");
if (jetons[i - 1] !== "Accessory") {
  anomalies.push({ ou: "accessory.inc", quoi: "le premier bloc ne s'appelle pas Accessory mais " + jetons[i - 1] });
}
i++; // on entre dans Accessory

const objets = [];
const vus = new Set();
while (i < jetons.length && jetons[i] !== "}") {
  const cle = jetons[i++];
  if (jetons[i] !== "{") { anomalies.push({ ou: "accessory.inc", quoi: "clé sans bloc : " + cle }); continue; }
  i++; // on entre dans le bloc de l'objet
  const paliers = [];
  while (i < jetons.length && jetons[i] !== "}") {
    const rang = jetons[i++];
    if (!/^\d+$/.test(rang)) { anomalies.push({ ou: "accessory.inc", quoi: "palier non numérique dans " + cle + " : " + rang }); continue; }
    if (jetons[i] !== "{") { anomalies.push({ ou: "accessory.inc", quoi: "palier sans bloc dans " + cle + " : " + rang }); continue; }
    i++;
    const b = [];
    while (i < jetons.length && jetons[i] !== "}") {
      const code = jetons[i++];
      const v = jetons[i++];
      if (!/^DST_[A-Z0-9_]+$/.test(code) || !/^-?\d+$/.test(v)) {
        anomalies.push({ ou: "accessory.inc", quoi: "paire illisible dans " + cle + " palier " + rang + " : " + code + " " + v });
        continue;
      }
      b.push([code, +v]);
    }
    i++; // on sort du palier
    paliers.push({ p: +rang, b });
  }
  i++; // on sort de l'objet

  if (vus.has(cle)) anomalies.push({ ou: "accessory.inc", quoi: "objet écrit deux fois : " + cle });
  vus.add(cle);

  // Les rangs doivent être 0..n sans trou : on le VÉRIFIE au lieu de le supposer.
  const attendus = paliers.map((x, k) => x.p === k).every(Boolean);
  if (!attendus) anomalies.push({ ou: "accessory.inc", quoi: "paliers non contigus depuis 0 dans " + cle, rangs: paliers.map((x) => x.p) });

  objets.push({ ...objetNomme(cle), plafond: paliers.length - 1, paliers });
}

// ── CONTRÔLE 1 — contre Spec_Item.txt (public/wiki/objets-stats.json) ────────
// La question qui décide de tout : les deux sources se contredisent-elles ?
const stats = JSON.parse(fs.readFileSync(path.join(racine, "public/wiki/objets-stats.json"), "utf8"));
const parCle = new Map(stats.objets.filter((e) => e.cle).map((e) => [e.cle, e]));
const memePaire = (a, b) => {
  const t = (x) => x.map(([c, v]) => c + "=" + v).sort().join("|");
  return t(a) === t(b);
};
// DEUX MESURES DIFFÉRENTES, et la confusion des deux a produit une conclusion
// fausse dans la première version de ce fichier. À ne plus mélanger :
//   · au PALIER 0 seulement — aucun objet n'est servi des deux côtés à la fois.
//   · sur TOUS LES PALIERS — DIX objets sur 75 le sont, et pour deux d'entre eux
//     la MÊME statistique porte des valeurs DIFFÉRENTES dans les deux sources.
// Donc il y a bien un arbitrage à faire, et un risque de double comptage réel.
const croise = { comparees: 0, palier0Seul: 0, specItemSeul: 0, videDesDeuxCotes: 0, recouvrementsAuPalier0: [], cleAbsenteDeSpecItem: [] };
const recouvrementsToutPalier = [];
for (const o of objets) {
  const e = parCle.get(o.cle);
  if (!e) { croise.cleAbsenteDeSpecItem.push(o.cle); continue; }
  croise.comparees++;
  const p0 = o.paliers[0]?.b ?? [];
  const sp = e.b ?? [];
  if (p0.length && sp.length) {
    croise.recouvrementsAuPalier0.push({ cle: o.cle, palier0: p0, specItem: sp, identiques: memePaire(p0, sp) });
  } else if (p0.length) croise.palier0Seul++;
  else if (sp.length) croise.specItemSeul++;
  else croise.videDesDeuxCotes++;

  // Le vrai contrôle : une statistique de Spec_Item reparaît-elle à un palier ?
  const codesSpec = new Set(sp.map(([c]) => c));
  const communes = new Map();
  for (const p of o.paliers) {
    for (const [c, v] of p.b) {
      if (!codesSpec.has(c)) continue;
      if (!communes.has(c)) communes.set(c, { base: sp.find(([k]) => k === c)[1], paliers: {} });
      communes.get(c).paliers[p.p] = v;
    }
  }
  if (communes.size) {
    recouvrementsToutPalier.push({
      cle: o.cle, i: o.i, n: o.n,
      statistiquesCommunes: Object.fromEntries([...communes].map(([c, d]) => [c, { valeurSpecItem: d.base, valeursParPalier: d.paliers }])),
    });
  }
}
croise.recouvrementsSurTousLesPaliers = {
  combien: recouvrementsToutPalier.length,
  sur: croise.comparees,
  lecture: "les deux sources NE SONT PAS disjointes. Pour ces objets, la statistique de Spec_Item.txt reparaît dans la table des paliers. La règle d'application (la valeur du palier remplace-t-elle la base, ou s'y ajoute-t-elle ?) doit être tranchée AVANT tout affichage, sinon le total est faux.",
  casLePlusNet: "II_GEN_JEW_NEC_CHRISTMAS_HARP_EARRING_2016 (25178) : Spec_Item.txt écrit DST_ATKPOWER 1500, accessory.inc plafonne DST_ATKPOWER à 1000 du palier 20 au palier 30. Même statistique, deux valeurs, sur le même objet.",
  details: recouvrementsToutPalier,
};

// ── CONTRÔLE 2 — contre le relevé fait main de public/airbuilder/data.json ───
// Dans ce projet le fait-main a déjà eu raison contre une extraction. On lui
// donne donc le dernier mot : si l'on diverge, c'est nous qui sommes suspects.
const builder = JSON.parse(fs.readFileSync(path.join(racine, "public/airbuilder/data.json"), "utf8"));
const faitMain = new Map();
for (const cat of ["ring", "earring", "necklace"]) {
  for (const e of builder.ITEMS[cat] ?? []) if (typeof e.id === "number") faitMain.set(e.id, { cat, ...e });
}
const contreFaitMain = { comparees: 0, memesValeurs: 0, divergences: [], sansPalierDansLeFaitMain: [] };
for (const o of objets) {
  const fm = o.i != null ? faitMain.get(o.i) : undefined;
  if (!fm) continue;
  contreFaitMain.comparees++;
  // Le fait-main traduit les codes DST_ ; on ne compare donc que les VALEURS, sur
  // Spec_Item (c'est ce que le fait-main a recopié), et on note que le fait-main
  // n'a AUCUN palier — c'est précisément le manque que ce fichier comble.
  const sp = (parCle.get(o.cle)?.b ?? []).map(([, v]) => v).sort((x, y) => x - y).join(",");
  const mm = (fm.b ?? []).map(([, v]) => v).sort((x, y) => x - y).join(",");
  if (sp === mm) contreFaitMain.memesValeurs++;
  else contreFaitMain.divergences.push({ i: o.i, n: fm.n, faitMain: fm.b, specItem: parCle.get(o.cle)?.b });
  if (o.plafond > 0) contreFaitMain.sansPalierDansLeFaitMain.push({ i: o.i, n: fm.n, plafond: o.plafond });
}

// ── LES PLAFONDS, CHACUN AVEC SON FICHIER ────────────────────────────────────
// On COMPTE ce qu'on peut compter au lieu de l'écrire à la main.
const paliersParObjet = new Map();
for (const o of objets) paliersParObjet.set(o.plafond, (paliersParObjet.get(o.plafond) ?? 0) + 1);

const enchant = texte(a02.get("propEnchant.inc"));
const colonnesEnchant = (enchant.match(/^\s*\/\/\s*Kind\s+(.*)$/m)?.[1] ?? "").trim().split(/\s+/);
const lignesEnchant = {};
for (const m of enchant.matchAll(/^\s*([A-Z_]+_SCAL)\s+(.*)$/gm)) {
  lignesEnchant[m[1]] = m[2].trim().split(/\s+/).map(Number);
}
const scrollsAbsolus = [...texte(a00.get("defineitem.h")).matchAll(/^#define\s+(II_SYS_SYS_SCR_ENCHANT_ABSOLUTE(\d+))\s+(\d+)/gm)]
  .map((m) => ({ cle: m[1], niveau: +m[2], i: +m[3] }));

const artefact = JSON.parse(texte(sys.get("artefact.json")));
const anges = JSON.parse(texte(sys.get("angels.json")));
const wl = texte(sys.get("propweaponleveling.inc"));
const raretesNommees = [...new Set([...wl.matchAll(/AddRarityStat\(\s*([A-Z]+)\s*,/g)].map((m) => m[1]))];
const nbStagesArme = [...wl.matchAll(/AddStage\(\s*(\d+)\s*,\s*(\d+)\s*\)/g)].length;
const dernierStage = [...wl.matchAll(/AddStage\(\s*(\d+)\s*,\s*(\d+)\s*\)/g)].pop();

const raretesNumerotees = [...new Set([...texte(sys.get("randomitemstat.inc")).matchAll(/^\s*\d+\s+(\d+)\s+\d+\s*$/gm)].map((m) => +m[1]))].sort((a, b) => a - b);

// Deux formes de déclaration, pas une : par TYPE d'arme, et par OBJET nommé.
// Compter « AddRarityStat / 6 » sans les distinguer donne un chiffre creux.
const declParType = [...wl.matchAll(/SetItemType2Stat\(\s*([A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*\)/g)].map((m) => ({ type2: m[1], stat: m[2] }));
const declParObjet = [...wl.matchAll(/SetItemIDStat\(\s*(II_[A-Z0-9_]+)\s*,\s*([A-Z0-9_]+)\s*\)/g)].map((m) => ({ cle: m[1], stat: m[2] }));

// ── LES PALIERS D'UN OBJET DE MODE — Costume_GemAbility.txt ──────────────────
// Ce fichier avait été manqué : il porte bien une échelle par palier, mais dans
// une AUTRE forme que `accessory.inc` (des colonnes, pas des blocs `<rang> {`).
// C'est pour cela qu'un balayage cherchant la forme d'accessory.inc ne le voyait
// pas. Quatre niveaux de gemme, et la liste des gemmes acceptées par pièce.
const cga = texte(a05.get("Costume_GemAbility.txt"));
const modeAbilites = [...cga.matchAll(/ABILITY\s+(DST_[A-Z0-9_]+)\s*\{([^}]*)\}/g)].map((m) => ({
  stat: m[1],
  parNiveau: m[2].trim().split(/\s+/).map(Number).filter((n) => Number.isFinite(n)),
}));
const modeParPiece = [...cga.matchAll(/FIXED_GEM_ABILITY\s+(PARTS_[A-Z]+)\s*\{([^}]*)\}/g)].map((m) => ({
  piece: m[1],
  gemmes: [...m[2].matchAll(/(II_[A-Z0-9_]+)\s+(DST_[A-Z0-9_]+)\s+([\d\s]+)/g)].map((g) => ({
    gemme: g[1], stat: g[2], parNiveau: g[3].trim().split(/\s+/).map(Number).filter((n) => Number.isFinite(n)),
  })),
}));

// Le sertissage d'une arme ultime : cinq niveaux de gemme, huit colonnes écrites.
const uga = texte(a05.get("Ultimate_GemAbility.txt"));
const ultimeAbilites = [...uga.matchAll(/ABILITY\s+(DST_[A-Z0-9_]+)\s*\{([^}]*)\}/g)].map((m) => ({
  stat: m[1],
  gemmes: [...m[2].matchAll(/(II_GEN_MAT_[A-Z]+)\s+(II_GEN_MAT_[A-Z0-9]+)\s+([\d\s]+)/g)].map((g) => ({
    gemme: g[1], parNiveau: g[3].trim().split(/\s+/).map(Number).filter((n) => Number.isFinite(n)),
  })),
}));

const plafonds = {
  bijou: {
    valeur: Math.max(...objets.map((o) => o.plafond)),
    courant: [...paliersParObjet.entries()].sort((a, b) => b[1] - a[1])[0][0],
    repartition: Object.fromEntries([...paliersParObjet.entries()].sort((a, b) => a[0] - b[0]).map(([p, n]) => [p, n])),
    source: "Client/data-02.air ▸ accessory.inc — COMPTÉ, pas écrit : le plafond est une propriété de l'objet",
    aTrente: objets.filter((o) => o.plafond === 30).map((o) => o.cle),
  },
  armeEtArmure: {
    valeur: Math.max(...Object.values(lignesEnchant).map((v) => v.length)),
    colonnes: colonnesEnchant,
    coefficients: lignesEnchant,
    parchemins: scrollsAbsolus,
    source: "Client/data-02.air ▸ propEnchant.inc (colonnes L1…L10) · Client/data-00.air ▸ defineitem.h (parchemins ABSOLUTE06…10)",
    reserve: "propEnchant.inc ne donne que des COEFFICIENTS (0,3 à 1,2). Ce qu'ils multiplient — attaque ? défense ? — est compilé dans Neuz.exe et n'est écrit dans AUCUN fichier de données. On ne calcule donc pas de dégât avec ces nombres.",
  },
  armeArtefact: {
    valeur: Math.max(...artefact.generalUpgrade.probabilities.map((p) => p.level)),
    depuis: Math.min(...artefact.generalUpgrade.probabilities.map((p) => p.level)),
    probabilites: artefact.generalUpgrade.probabilities,
    source: "FSDATA/COMMON/Systems/data.air ▸ artefact.json, generalUpgrade.probabilities",
    reserve: "ce sont des PROBABILITÉS de réussite, pas des valeurs de bonus. Le gain de chaque palier de +11 à +20 n'est écrit nulle part.",
  },
  percage: {
    valeur: Math.max(...artefact.piercingUpgrade.maxPiercingSizes.map((x) => x.maxPiercingLevel)),
    objetsConcernes: artefact.piercingUpgrade.maxPiercingSizes.reduce((n, x) => n + x.itemIds.length, 0),
    source: "FSDATA/COMMON/Systems/data.air ▸ artefact.json, piercingUpgrade.maxPiercingSizes.maxPiercingLevel",
    reserve: "ce 12 est une LIMITE PAR OBJET, écrite pour une liste nommée de "
      + artefact.piercingUpgrade.maxPiercingSizes.reduce((n, x) => n + x.itemIds.length, 0)
      + " armes (Yggdrasil et Ancient). Le MÊME fichier donne des probabilités de perçage jusqu'au niveau "
      + Math.max(...artefact.piercingUpgrade.probabilities.map((p) => p.level))
      + " : rien n'établit que 12 vaille pour une arme absente de cette liste. MECH.arme.percage_max = 12 est donc juste pour une arme artefact, non vérifié ailleurs.",
    probabilitesNiveaux: artefact.piercingUpgrade.probabilities.map((p) => p.level),
  },
  mode: {
    valeur: Math.max(...modeAbilites.map((a) => a.parNiveau.length)),
    source: "Client/data-05.air ▸ Costume_GemAbility.txt — quatre colonnes de niveau (1급…4급), une ligne par statistique, plus FIXED_GEM_ABILITY par pièce",
    parStatistique: modeAbilites,
    parPiece: modeParPiece,
    reserve: "le fichier n'écrit PAS le mot « palier » ni de plafond nommé : les quatre colonnes sont COMPTÉES. Il décrit le sertissage d'un costume (quelle gemme, quelle statistique, quelle valeur au niveau N), pas une amélioration +N de l'objet lui-même. Ne pas confondre les deux, et ne pas déclarer MECH.mode.upgrade_normal à partir de ce chiffre.",
    correctif: "la première version de ce relevé disait « plafond du mode INTROUVABLE dans le client ». C'était faux par omission : Costume_GemAbility.txt n'avait pas été ouvert.",
  },
  sertissageArmeUltime: {
    valeur: Math.max(...ultimeAbilites.flatMap((a) => a.gemmes.map((g) => g.parNiveau.filter((v) => v > 0).length))),
    source: "Client/data-05.air ▸ Ultimate_GemAbility.txt",
    parStatistique: ultimeAbilites,
    reserve: "huit colonnes sont écrites alors que l'en-tête n'en nomme que cinq ; les colonnes 6 à 8 ne sont non nulles que pour le Diamant. Les maxima concordent avec MECH.arme.sertissage déjà fait main (PV max 6825, Attaque 375, Défense 300).",
  },
  maitriseArme: {
    valeur: dernierStage ? +dernierStage[2] : null,
    paliers: nbStagesArme,
    source: "FSDATA/COMMON/Systems/data.air ▸ propweaponleveling.inc, AddStage(de, à)",
    reserve: "propweaponleveling.inc ne dit pas si la valeur d'AddRarityStat s'accorde une fois par palier franchi ou une seule fois au total.",
  },
  ange: {
    valeur: Math.max(...anges.angels.flatMap((a) => a.stages.map((s) => s.level))),
    paliers: Math.max(...anges.angels.map((a) => a.stages.length)),
    entrees: anges.angels.length,
    aPaliers: anges.angels.filter((a) => a.stages.length > 1).map((a) => a.id),
    aBuffFixe: anges.angels.filter((a) => a.stages.length === 1).map((a) => a.id),
    jeuxDeValeurs: anges.angels.reduce((n, a) => n + a.stages.length, 0),
    source: "FSDATA/COMMON/Systems/data.air ▸ angels.json — chaque palier désigne un OBJET de buff, dont les bonus se lisent dans objets-stats.json",
    correctif: "angels.json porte " + anges.angels.length + " entrées, pas six : seules "
      + anges.angels.filter((a) => a.stages.length > 1).length
      + " montent par paliers (10/20/30/40/50) ; les autres n'ont qu'un buff fixe au niveau 0.",
  },
  elementArme: {
    valeur: 10,
    source: "Client/Client/data.air ▸ help.txt.txt, IDS_CLIENT_HELP_INC_000571",
    citation: "les cartes d'élément existent « pour les enchantements de +1 à +5 et pour les enchantements de +6 à +10 »",
    reserve: "c'est un TEXTE D'AIDE, pas une table. Le même fichier parle de la « boutique Flyff » et du « site officiel » : il peut avoir été hérité du Flyff officiel sans être remis à jour pour AirFlyff. Le chiffre 10 est corroboré par propEnchant.inc, mais la valeur du bonus élémentaire à chaque palier n'est écrite nulle part.",
  },
};

// ── LE TROU DANS MECH — dit précisément, pour que le fil principal le comble ──
const mech = builder.MECH ?? {};
const trouDansMech = {
  ou: "public/airbuilder/data.json ▸ MECH",
  famillesDeclarees: Object.keys(mech),
  cequiManque: [
    "MECH.bijou — aucune entrée : un bijou n'a donc AUCUNE mécanique déclarée, et son plafond (20, ou 30 pour six objets) est introuvable côté site",
    "MECH.armure — aucune entrée : le plafond +10 de l'armure n'est écrit nulle part non plus",
    "MECH.mode — aucune entrée",
  ],
  cequiestDejaJuste: [
    "MECH.arme.percage_max = " + (mech.arme?.percage_max ?? "?") + " ↔ artefact.json maxPiercingLevel = " + plafonds.percage.valeur,
    "MECH.arme.artefact.max = " + (mech.arme?.artefact?.max ?? "?") + " ↔ artefact.json generalUpgrade jusqu'au niveau " + plafonds.armeArtefact.valeur,
    "MECH.arme.rarete_tiers compte déjà SIX raretés en français, quand src/components/jeu/Rarete.tsx n'en connaît que quatre",
  ],
  cequiestIncompletSansEtreFaux: "MECH.arme.upgrade_normal.max = " + (mech.arme?.upgrade_normal?.max ?? "?") + " : juste pour une arme non-artefact et pour une armure, faux dès qu'on l'applique à un bijou",
};

const raretes = {
  liste: raretesNommees,
  combien: raretesNommees.length,
  sourceDesNoms: "FSDATA/COMMON/Systems/data.air ▸ propweaponleveling.inc, AddRarityStat(<nom>, valeur)",
  declarations: {
    total: declParType.length + declParObjet.length,
    parTypeDArme: declParType,
    parObjetNomme: declParObjet,
    lecture: "il y a DEUX formes de déclaration : " + declParType.length + " SetItemType2Stat (par type d'arme) et " + declParObjet.length + " SetItemIDStat (par objet nommé, les LUZA_T et les ANCIENT). Total " + (declParType.length + declParObjet.length) + ", et non 27 comme annoncé d'abord — ce chiffre venait d'un comptage d'AddRarityStat sans distinguer les deux formes.",
    laRareteNeChangeRien: "dans les " + (declParType.length + declParObjet.length) + " blocs, les cinq raretés non nulles reçoivent TOUJOURS la même valeur (4 pour les armes physiques, 2 pour baguette/bâton/canne). Aucune progression RARE < EPIC < LEGENDARY n'est écrite. Vérifié bloc par bloc : zéro exception. Ce fichier ne permet donc pas d'accorder plus à un objet mythique qu'à un objet rare.",
  },
  numerotationIndependante: {
    valeurs: raretesNumerotees,
    lecture: "randomitemstat.inc numérote dwRarity de " + raretesNumerotees[0] + " à " + raretesNumerotees.at(-1) + " ; avec le 0 implicite (NONE) cela fait " + (raretesNumerotees.at(-1) + 1) + " valeurs, autant que de noms",
    source: "FSDATA/COMMON/Systems/data.air ▸ randomitemstat.inc, bloc MAKE_WDUST (niveau, dwRarity, nombre de poussières)",
  },
  images: {
    fichiers: ["item_edgerarity1.tga", "item_edgerarity2.tga", "item_edgerarity3.tga", "item_edgerarity4.tga", "item_edgerarity5.tga"],
    ou: "Client/Data/Item/data.air",
    piege: "item_edgerarity4.tga et item_edgerarity5.tga sont OCTET POUR OCTET identiques (md5 d39f05c48579cb1530e28f58ff2e224f). Le jeu ne sépare pas Pré-Mythique de Mythique par la bordure : seul le mot les sépare.",
    rarete0: "la rareté 0 (NONE) n'a pas d'image — cinq bordures pour six raretés",
  },
  cequilFautAjouterAuSite: {
    ou: "src/components/jeu/Rarete.tsx — appartient au fil principal, non modifié ici",
    constat: "RARETES y vaut [\"common\",\"rare\",\"epic\",\"legendary\"] : quatre. Le client en nomme six.",
    aAjouter: ["premythic", "mythic"],
    libellesDejaDansLeProjet: "public/airbuilder/data.json ▸ MECH.arme.rarete_tiers écrit déjà les six en français : Commun, Rare, Épique, Légendaire, Pré-Mythique, Mythique",
    imagesDisponibles: "public/jeu/mecaniques/rarete-pre-mythique.webp et public/jeu/icones/rarity_pmm.webp existent ; AUCUN fichier du projet ne porte « mythique » — l'image manque, et le client ne peut pas la fournir puisque sa bordère 5 est la copie de la 4.",
  },
};

const sortie = {
  genere: new Date().toISOString().slice(0, 10),
  source: "Client/data-02.air ▸ accessory.inc (bonus par palier) · propEnchant.inc · Client/data-00.air ▸ defineitem.h, defineachievement.h · FSDATA/COMMON/Systems/data.air ▸ artefact.json, angels.json, propweaponleveling.inc, randomitemstat.inc",
  legende: {
    cle: "identifiant symbolique II_*",
    i: "identifiant numérique (defineitem.h)",
    n: "nom affiché — absent quand le client n'en donne aucun",
    plafond: "rang du dernier palier écrit (0 compris) — COMPTÉ dans le fichier",
    paliers: "[{ p: rang, b: [[code DST_, valeur]] }] — b peut être vide, le client l'écrit ainsi",
  },
  cumulOuRemplacement: {
    regleEcrite: "NON. Aucun fichier du client n'écrit si la valeur du palier N remplace celle du palier N−1 ou s'y ajoute. Les valeurs sont recopiées brutes.",
    maisDeuxElementsDuClientRendentLE_CUMUL_IMPOSSIBLE: [
      "LE PLATEAU. Sur les six accessoires à 30 paliers, une statistique est réécrite À L'IDENTIQUE d'un palier au suivant : DST_ATKPOWER vaut 1000 aux paliers 20 à 30 des Boucles Harpe (25178) et du Collier d'Ange (25179), DST_STA vaut 40 aux paliers 20 à 30 des versions Pures. Sous un cumul, réécrire la même valeur onze fois de suite ajouterait onze fois 1000 d'attaque — ce que le fichier ne peut pas vouloir dire, puisqu'il change de statistique précisément à partir du palier 21.",
      "LA DESCRIPTION FRANÇAISE DU CLIENT. Le Grenat d'Amour (II_GEN_JEW_RIN_JESSICA) n'a AUCUN bonus dans Spec_Item.txt, et sa description (data-01.air ▸ propitem.txt.txt, IDS_PROPITEM_TXT_016410) dit : « Cet anneau palpite d'énergie magique, il fournit de l'ATQ ainsi qu'un pourcentage de défense suivant son niveau d'amélioration. » Sa ligne d'accessory.inc donne exactement cela : DST_CHR_DMG plus DST_ADJDEF_RATE. « suivant son niveau d'amélioration » désigne une valeur DÉTERMINÉE PAR le niveau, pas une somme accumulée.",
    ],
    statut: "CE N'EST PAS UN RELEVÉ, C'EST UNE DÉDUCTION à partir de deux pièces du client. Elle ne doit pas être affichée comme une certitude. La question reste à poser à Maxime, mais l'hypothèse du cumul peut être écartée.",
    corroborationNeuz: "Neuz.exe porte CAccessoryProperty::LoadScript, « accessory.inc », « Accessory - Item Property not found: ItemId %d », « Accessory duplicated: ItemId %d », RefineAccessory et UPGRADE_TRIES_ACCESSORY, dans D:\\Flyff\\airflyff\\source\\source\\_Common\\accessory.cpp. La table est donc bien chargée par identifiant d'objet et sert bien un raffinement compté en essais.",
    parQuoiUnBijouMonte: "par la PIERRE LUNAIRE. Les descriptions françaises des bijoux disent « Cet objet peut être amélioré à l'aide d'une pierre lunaire » (data-01.air ▸ propitem.txt.txt, IDS_PROPITEM_TXT_008949 et suivants), et defineachievement.h nomme MODE_TASK_ENCHANT_MOONSTONE_SUCCESS à côté de MODE_TASK_ENCHANT_JEWELRY_MAX.",
  },
  total: objets.length,
  seuleTableDePaliersDuClient: {
    constat: "accessory.inc est le seul fichier du client qui écrive un bonus par palier SOUS LA FORME de blocs « <rang> { … } ». Ce n'est PAS la même chose que « le seul du client à écrire une échelle par palier ».",
    correctif: "la première version de ce fichier concluait « ZÉRO ligne de cette forme ailleurs, donc aucune autre table de paliers ». La mesure ne portait pas : elle ne détectait qu'une SYNTAXE. Deux autres fichiers portent bien une échelle par niveau, en colonnes : Client/data-05.air ▸ Costume_GemAbility.txt (quatre niveaux) et Ultimate_GemAbility.txt (cinq niveaux écrits, huit colonnes). Et le comptage lui-même était faux : propquest-requestbox.inc, propMediation.inc, propFlyffpiece.inc et couple.inc portent aussi des lignes « <nombre> { » — sans rapport avec les paliers, mais le « ZÉRO » était inexact.",
    mesureRefaite: "356 fichiers de données décodés (data-00 à data-05, Client/data.air, FSDATA COMMON/CLIENT/Systems) : accessory.inc 1 635 lignes de la forme « <rang> { », puis propquest-requestbox.inc 163, propquest-dungeonandpk.inc 55, propMediation.inc 45, propquest.inc 35, propFlyffpiece.inc 29, propquest-scenario.inc 26, couple.inc 19, propquest-requestbox2.inc 4.",
    consequence: "reste vrai, et c'est le point qui compte : AUCUN fichier du client ne donne le gain d'une arme ou d'une armure au palier +1…+10. Ni sous forme de blocs, ni en colonnes.",
  },
  piegesDeLecture: [
    "LE PRÉFIXE DE LA CLÉ MENT SUR L'EMPLACEMENT. II_GEN_JEW_NEC_CHRISTMAS_HARP_EARRING_2016 (25178) porte NEC_ mais Spec_Item.txt le déclare IK3_EARRING, et II_GEN_JEW_EAR_CHRISTMAS_ANGEL_NECKLACE_2016 (25179) porte EAR_ mais est IK3_NECKLACE. Le nom et dwItemKind3 sont d'accord entre eux ; c'est le préfixe qui est faux. Le relevé fait main de public/airbuilder/data.json classe déjà 25178 en earring et 25179 en necklace — il a raison. Ne JAMAIS déduire l'emplacement d'un bijou du préfixe de sa clé, sinon les deux tables de paliers s'échangent.",
    "LES NOMS DES BUFFS D'ANGE SE RESSEMBLENT MAIS NE COLLIDENT PAS DANS LE CLIENT. II_SYS_SYS_ANGEL5BUFF_05 à _10 pointent sur IDS_PROPITEM_NEWSERV_0005479_1 … _0005489_1, et II_SYS_SYS_ANGEL6BUFF_01 à _04 sur LES MÊMES identifiants de texte. Le client les distingue par le suffixe « _1 » : ANGEL5BUFF_01 utilise IDS_..._0005479 (sans suffixe). Un appariement qui ignore le « _1 » donnera à l'ange 5 le nom de l'ange 6. Et les valeurs de l'ange 5 sont bonnes : angels.json le nomme II_SYS_SYS_QUE_ANGEL_DROP, un ange de butin — DST_DROP_ITEM_ALLGRADE_RATE y est à sa place.",
  ],
  plafonds,
  trouDansMech,
  raretes,
  concordance: { contreSpecItem: croise, contreFaitMain },
  anomalies,
  objets,
};

const dest = path.join(racine, "public/wiki/paliers-accessoires.json");
fs.writeFileSync(dest, JSON.stringify(sortie, null, 0));
const ko = (fs.statSync(dest).size / 1024).toFixed(1);
console.log(`paliers-accessoires.json — ${objets.length} bijoux, ${objets.reduce((n, o) => n + o.paliers.length, 0)} paliers, ${ko} Ko`);
console.log(`  plafonds bijou : ${JSON.stringify(plafonds.bijou.repartition)}`);
console.log(`  recouvrements au palier 0 : ${croise.recouvrementsAuPalier0.length} (palier 0 seul ${croise.palier0Seul}, Spec_Item seul ${croise.specItemSeul}, vides ${croise.videDesDeuxCotes})`);
console.log(`  recouvrements sur TOUS les paliers : ${croise.recouvrementsSurTousLesPaliers.combien}/${croise.comparees} — arbitrage nécessaire`);
console.log(`  mode (Costume_GemAbility.txt) : ${plafonds.mode.valeur} niveaux, ${plafonds.mode.parStatistique.length} statistiques, ${plafonds.mode.parPiece.length} pièces`);
console.log(`  contre le fait-main : ${contreFaitMain.memesValeurs}/${contreFaitMain.comparees} valeurs identiques, ${contreFaitMain.divergences.length} divergence(s)`);
console.log(`  raretés nommées : ${raretes.liste.join(", ")}`);
if (anomalies.length) console.log(`  anomalies : ${anomalies.length}`);
for (const a of anomalies) console.log(`    · ${a.quoi}`);
