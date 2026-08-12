// ════════════════════════════════════════════════════════════════════════════
//  LES STATISTIQUES D'OBJET — RELEVÉ DU CLIENT AIRFLYFF
//  node scripts/extraire-statistiques-objets.mjs
//    →  public/wiki/objets-stats.json        (le socle : un objet, ses chiffres)
//    →  src/data/statistiques-objets.json    (le dictionnaire des statistiques)
// ════════════════════════════════════════════════════════════════════════════
//
// POURQUOI. Un calculateur de dégâts a besoin de DEUX choses que le site n'avait
// pas sous une forme calculable : la liste des bonus de chaque objet avec le CODE
// de la statistique (et non son libellé français, qui ne se calcule pas), et les
// nombres de combat de l'objet — attaque, vitesse, défense, parade, blocage.
//
// ────────────────────────── LA STRUCTURE TROUVÉE ───────────────────────────
//
// `Client/data-05.air` → `Spec_Item.txt`, 7,7 Mo, UTF-8, fins de ligne CRLF.
// La première ligne nomme 136 colonnes ; les lignes de données en portent 171.
// Les 35 colonnes surnuméraires sont des ajouts (elles ne sont nommées nulle
// part dans le client) ; trois seulement sont lisibles sans deviner, parce que
// d'autres fichiers du client s'en servent :
//     163  ITEM_GRADE_NORMAL | ITEM_GRADE_UNIQUE | ITEM_GRADE_ULTIMATE
//     165  TYPE1_*   (8 valeurs)      166  TYPE2_*   (35 valeurs)
// `Systems/propweaponleveling.inc` appelle `SetItemType2Stat(TYPE2_WEAPON_ONEAXE,
// …)` : c'est bien la même nomenclature. Les 32 autres colonnes restent BRUTES,
// sous la clé `x`, uniquement si elles ne valent pas leur valeur la plus courante.
//
// LES BONUS. Six paires de colonnes, aux noms attendus :
//     53..58  dwDestParam1..6   la statistique visée, sous son nom symbolique
//     59..64  nAdjParamVal1..6  sa valeur
//     65..70  dwChgParamVal1..6 · 71..76 dwdestData1..6  (vides sur tout objet)
// Les codes portés sont les constantes `DST_*` de `data-00.air → defineattribute.h`
// (155 définies hors `DST_NONE`, 74 employées par un objet — les deux chiffres
// sont recomptés à chaque passe, voir `definis` et `employes`). AUCUN code
// numérique n'apparaît, et
// AUCUNE colonne au-delà de la 58 ne porte de `DST_` — sauf la 104, sur 45 objets
// et 45 exactement : les 45 gemmes ultimes, dont la statistique est déjà donnée,
// avec ses cinq paliers, par `data-05.air → Ultimate_GemAbility.txt`. On ne lit
// donc pas la colonne 104 (voir `extraire-bonus-sources.mjs`).
//
// LE SIGNE « = ». Il occupe 6 à 90 % d'une colonne selon la colonne. Deux
// lectures possibles : « même valeur que la ligne précédente » ou « rien ». La
// seconde est la bonne, et c'est VÉRIFIABLE : sous la première, le parchemin
// II_SYS_SYS_SCR_BXMKNT120SET héritait des 500 points de défense des bottes qui
// le précèdent, et 12 864 des 13 071 objets — potions et clés comprises —
// héritaient d'un bonus. Le relevé fait main de l'AirBuilder tranche dans le même
// sens (voir la concordance plus bas), et la question ne se pose de toute façon
// pas pour les dégâts : sur les 1 465 armes, dwAbilityMin et dwAbilityMax sont
// TOUJOURS écrits en clair.
//
// LES LIGNES ABÎMÉES. Le fichier est écrit à la main : 277 lignes ont perdu un
// tabulateur (« =DST_HP_MAX_RATE » collés, ou « 20 40 35 » dans une seule
// cellule) ou en portent un de trop. On les recoupe — en gardant les segments
// entre guillemets d'un seul morceau — puis on VÉRIFIE trois ancres (IK1_ en 5,
// ITEM_GRADE_ en 163, TYPE1_ en 165). Ce qui ne tombe pas juste est rejeté et
// nommé dans le compte rendu : mieux vaut cinq objets absents qu'un objet dont
// les colonnes ont glissé d'un cran.
//
// LES LIBELLÉS. Un code `DST_*` n'est pas affichable. Deux sources, jamais
// inventées : le client lui-même (`TID_TOOLTIP_DST_<code>` → textClient.inc →
// textclient.txt.txt, 37 codes sur 155), et le relevé français déjà en place dans
// `public/wiki/objets-fiches.json`, dont la correspondance se REDÉDUIT ici en
// alignant les 2 312 objets qu'il décrit sur le même relevé (73 codes). Quand les
// deux se contredisent, les deux sont écrites et la contradiction est signalée.
// Un code sans libellé reste un code : il est listé, pas deviné.

import fs from "node:fs";
import path from "node:path";
import { lireArchive, texte } from "./lib-air.mjs";

const racine = process.cwd();
const CLIENT = process.env.AIRFLYFF_CLIENT
  ?? path.join(process.env.HOME, "Desktop/source/AirflyffClient_Octobre_2025/Client");

const a00 = lireArchive(path.join(CLIENT, "data-00.air"));
const a01 = lireArchive(path.join(CLIENT, "data-01.air"));
const a05 = lireArchive(path.join(CLIENT, "data-05.air"));
const a02 = lireArchive(path.join(CLIENT, "data-02.air"));

// ── les tables de correspondance du client ────────────────────────────────────
const defines = (src, prefixe) => {
  const m = new Map();
  const re = new RegExp("^#define\\s+(" + prefixe + "[A-Z0-9_]+)\\s+(-?\\d+)", "gm");
  for (const x of src.matchAll(re)) if (!m.has(x[1])) m.set(x[1], +x[2]);
  return m;
};
const ID_OBJET = defines(texte(a00.get("defineitem.h")), "II_");
const CODE_DST = defines(texte(a00.get("defineattribute.h")), "DST_");

// Trois espaces de noms cohabitent dans propitem.txt.txt : IDS_PROPITEM_TXT_
// (l'original, 21 413 entrées) et deux ajouts d'AirFlyff, IDS_AIRFLYFF_TXT_
// (2 703) et IDS_PROPITEM_NEWSERV_ (1 661). Les deux ajouts séparent la clé du
// texte par des ESPACES là où l'original met un tabulateur — d'où le \s+ : à ne
// pas remplacer par un indexOf("\t"), qui laisse 2 000 objets sans nom.
const tableIds = (src) => {
  const m = new Map();
  for (const l of src.split(/\r?\n/)) {
    const x = /^\s*(\S+)(?:\s+(.*))?$/.exec(l.replace(/^﻿/, ""));
    if (!x) continue;
    m.set(x[1], (x[2] ?? "").trim());
  }
  return m;
};
const TEXTE_OBJET = tableIds(texte(a01.get("propitem.txt.txt")));
const TEXTE_CLIENT = tableIds(texte(a01.get("textclient.txt.txt")));

// textClient.inc : TID_xxx 0x… { IDS_yyy }
const TID = new Map();
for (const m of texte(a02.get("textClient.inc")).matchAll(/(TID_[A-Z0-9_]+)\s+0x[0-9a-fA-F]+\s*\{\s*([A-Z0-9_]+)\s*\}/g)) {
  if (!TID.has(m[1])) TID.set(m[1], m[2]);
}
const libelleClient = (code) => {
  const ids = TID.get("TID_TOOLTIP_" + code);
  const t = ids ? TEXTE_CLIENT.get(ids) : undefined;
  return t && t !== "" ? t : null;
};

// ── Spec_Item.txt ────────────────────────────────────────────────────────────
const LIGNES = texte(a05.get("Spec_Item.txt")).split(/\r?\n/);
const COL = {};
LIGNES[0].split("\t").forEach((c, i) => { const n = c.trim(); if (n && COL[n] === undefined) COL[n] = i; });
const LARGEUR = 171;

// Une cellule peut contenir plusieurs valeurs séparées par des espaces ; un
// segment entre guillemets, lui, est d'un seul morceau (« "Targe Zensoz " »).
const jetons = (c) => c.match(/"+[^"]*"+|[^\s"]+/g) ?? [""];

const lignes = [];
const rejetees = [];
for (let i = 1; i < LIGNES.length; i++) {
  const l = LIGNES[i];
  if (!l.trim() || l.startsWith("//")) continue;
  let r = l.split("\t").map((c) => c.trim());
  if (r.length < 100) continue;             // fragments de ligne, pas des objets
  if (r.length !== LARGEUR) {
    const rr = [];
    for (const c of r) {
      if (c === "") { rr.push(c); continue; }
      for (const j of jetons(c)) {
        const m = /^=(\S.*)$/.exec(j);
        if (m) { rr.push("="); rr.push(m[1]); } else rr.push(j);
      }
    }
    r = rr;
    while (r.length > LARGEUR) {
      const v = r.findIndex((c, j) => c === "" && j > 1 && j < 132);
      if (v < 0) break;
      r.splice(v, 1);
    }
  }
  if (r.length === LARGEUR && /^IK1_/.test(r[5]) && /^ITEM_GRADE_/.test(r[163]) && /^TYPE1_/.test(r[165])) lignes.push(r);
  else rejetees.push({ cle: r[1] ?? "", cellules: r.length });
}

const val = (r, nom) => { const v = r[COL[nom]]; return v === "=" || v === undefined ? "" : v; };
const nombre = (r, nom) => { const v = val(r, nom); return v === "" ? 0 : Number(v.replace(",", ".")) || 0; };
const sansPrefixe = (v, p) => (v.startsWith(p) ? v.slice(p.length) : v);

// Les 32 colonnes surnuméraires que rien, dans le client, ne nomme. On ne les
// recopie PAS sur chaque objet — répéter cinq mille fois un chiffre dont on ignore
// le sens ne renseigne personne. On en dresse un recensement UNE fois, dans le
// dictionnaire : rang, valeurs distinctes, effectifs. C'est de quoi les
// identifier plus tard, sans faire croire qu'on les a comprises.
const recensementAjouts = [];
for (let c = 136; c < LARGEUR; c++) {
  if (c === 163 || c === 165 || c === 166) continue;
  const n = new Map();
  for (const r of lignes) n.set(r[c], (n.get(r[c]) || 0) + 1);
  recensementAjouts.push({
    rang: c,
    distinctes: n.size,
    valeurs: [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v, k]) => ({ v, objets: k })),
  });
}

const objets = [];
const usage = new Map();          // code DST → nombre d'objets porteurs
const inconnus = new Map();       // valeur trouvée en dwDestParam qui n'est pas un DST_
const bonusSansValeur = [];
const valeurSansBonus = [];
const parId = new Map();

for (const r of lignes) {
  const cle = r[1];
  const id = ID_OBJET.get(cle);
  const b = [];
  for (let k = 1; k <= 6; k++) {
    const d = val(r, "dwDestParam" + k);
    const v = val(r, "nAdjParamVal" + k);
    if (d === "" || d === "0" || d === "DST_NONE") {
      if (v !== "" && v !== "0") valeurSansBonus.push({ cle, rang: k, valeur: v });
      continue;
    }
    if (!/^DST_/.test(d)) { inconnus.set(d, (inconnus.get(d) || 0) + 1); continue; }
    if (v === "" || v === "0") { bonusSansValeur.push({ cle, code: d, valeur: v === "" ? null : 0 }); continue; }
    // Trois codes portent un ÉTAT (CHS_POISON…) au lieu d'un nombre.
    b.push([d, /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v]);
    usage.set(d, (usage.get(d) || 0) + 1);
  }

  const t1 = sansPrefixe(r[165], "TYPE1_");
  const em = sansPrefixe(val(r, "dwParts"), "PARTS_");
  const garde = b.length > 0 || t1 === "WEAPON" || t1 === "ARMOR" || ["RING1", "NECKLACE1", "EARRING1"].includes(em);
  if (!garde) continue;

  // Près de deux cents objets n'ont pas de nom dans le client — armes de monstre,
  // pièces d'essai, et la cellule `szName` parfois laissée VIDE. On ne leur en
  // invente pas : la clé `n` est simplement absente. Le compte exact est recalculé
  // à chaque passe, dans `sansNom` ; ne pas l'écrire en dur ici.
  const o = { i: id ?? null, cle };
  const nom = TEXTE_OBJET.get(r[2]) ?? r[2];
  if (nom && !/^IDS_/.test(nom)) o.n = nom;
  o.t1 = t1;
  o.t2 = sansPrefixe(r[166], "TYPE2_");
  const k3 = val(r, "dwItemKind3");
  if (k3) o.k3 = sansPrefixe(k3, "IK3_");
  if (em) o.em = em;
  const grade = sansPrefixe(r[163], "ITEM_GRADE_");
  if (grade !== "NORMAL") o.g = grade;
  const job = val(r, "dwItemJob");
  if (job) o.job = sansPrefixe(job, "JOB_");
  const sexe = val(r, "dwItemSex");
  if (sexe) o.sx = Number(sexe) === 0 ? "M" : "F";
  const main = val(r, "dwHanded");
  if (main) o.h = main === "HD_TWO" ? 2 : main === "HD_DUAL" ? 3 : 1;
  const wt = val(r, "dwWeaponType");
  if (wt) o.wt = sansPrefixe(wt, "WT_");
  const portee = val(r, "dwAttackRange");
  if (portee) o.ar = sansPrefixe(portee, "AR_");

  o.lv = nombre(r, "dwItemLV");                     // niveau de l'objet
  const nr = nombre(r, "dwLimitLevel1");
  if (nr) o.nr = nr;                                // niveau requis pour l'équiper
  const dn = nombre(r, "dwAbilityMin"), dx = nombre(r, "dwAbilityMax");
  if (dn || dx) { o.dn = dn; o.dx = dx; }
  const va = nombre(r, "dwAttackSpeed");
  if (va) o.va = va;
  for (const [c, nom] of [["dwParry", "pa"], ["dwBlockRating", "bl"], ["wItemEAtk", "ea"], ["dwReflect", "rf"]]) {
    const v = nombre(r, c);
    if (v) o[nom] = v;
  }
  const elem = val(r, "dwSfxElemental");
  if (elem && elem !== "0") o.el = sansPrefixe(elem, "ELEMENTAL_");
  const re = {};
  for (const [c, nom] of [["fItemResistFire", "feu"], ["fItemResistWater", "eau"], ["fItemResistWind", "vent"], ["fItemResistEarth", "terre"], ["fItemResistElecricity", "foudre"]]) {
    const v = nombre(r, c);
    if (v) re[nom] = v;
  }
  if (Object.keys(re).length) o.re = re;
  if (b.length) o.b = b;

  objets.push(o);
  if (id != null && !parId.has(id)) parId.set(id, o);
}

// ── LA PIERRE DE TOUCHE : les objets relevés à la main dans l'AirBuilder ──────
// Le relevé fait main porte des LIBELLÉS français, le client des CODES. On aligne
// les deux listes rang par rang : c'est ce qui donne, à la fois, la concordance
// et la correspondance code → libellé.
function concordance(temoins, cleId, lireBonus) {
  const paires = new Map();
  let comparees = 0, identiques = 0, absents = 0;
  const divergences = [];
  for (const t of temoins) {
    const e = parId.get(cleId(t));
    if (!e) { absents++; continue; }
    const main = lireBonus(t), client = e.b ?? [];
    for (let i = 0; i < Math.max(main.length, client.length); i++) {
      comparees++;
      const m = main[i], c = client[i];
      if (!m || !c) { divergences.push({ i: cleId(t), n: e.n, rang: i, main: m ? m.join(" = ") : null, client: c ? c.join(" = ") : null }); continue; }
      if (!paires.has(c[0])) paires.set(c[0], new Map());
      const p = paires.get(c[0]);
      if (!p.has(m[0])) p.set(m[0], []);
      p.get(m[0]).push(cleId(t));
      if (m[1] === c[1]) identiques++;
      else divergences.push({ i: cleId(t), n: e.n, rang: i, main: m.join(" = "), client: c.join(" = ") });
    }
  }
  return { temoins: temoins.length, absents, comparees, identiques, divergences, paires };
}

const builder = JSON.parse(fs.readFileSync(path.join(racine, "public", "airbuilder", "data.json"), "utf8"));
const platsBuilder = [];
for (const v of Object.values(builder.ITEMS)) if (Array.isArray(v)) platsBuilder.push(...v);
const cBuilder = concordance(
  platsBuilder.filter((o) => o.b?.length && typeof o.id === "number"),
  (o) => o.id,
  (o) => o.b,
);

const fiches = JSON.parse(fs.readFileSync(path.join(racine, "public", "wiki", "objets-fiches.json"), "utf8"));
const cFiches = concordance(
  fiches.objets.filter((o) => o.b?.length),
  (o) => o.i,
  (o) => o.b,
);

// ── LE DICTIONNAIRE DES STATISTIQUES ─────────────────────────────────────────
// Le libellé du relevé français l'emporte (il est court et déjà à l'écran), le
// libellé du client sert de filet, et les deux sont conservés. `ambigu` retient
// les codes auxquels le relevé associe plusieurs libellés : c'est le signe qu'un
// objet du relevé a perdu un bonus, donc que ses libellés ont glissé d'un rang.
// Deux libellés « différents » ne se contredisent pas forcément : « Défense » et
// « Augmente votre défense (DEF) de » disent la même chose. On ne signale que les
// couples qui n'ont AUCUN mot en commun — ceux-là demandent un arbitrage humain.
const mots = (s) => new Set(
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((m) => m.length >= 3),
);
const seContredisent = (a, b) => {
  const x = mots(a), y = mots(b);
  for (const m of x) if (y.has(m)) return false;
  return true;
};

const tousCodes = new Set([...CODE_DST.keys(), ...usage.keys()]);
tousCodes.delete("DST_NONE");
const stats = [];
for (const code of [...tousCodes].sort((a, b) => (CODE_DST.get(a) ?? 1e9) - (CODE_DST.get(b) ?? 1e9))) {
  const releve = cFiches.paires.get(code);
  const trie = releve ? [...releve.entries()].sort((a, b) => b[1].length - a[1].length) : [];
  const client = libelleClient(code);
  const e = { code, n: CODE_DST.get(code) ?? null, objets: usage.get(code) ?? 0 };
  if (e.n === null) e.nonDefini = true;   // employé par un objet, absent de defineattribute.h
  if (trie.length) {
    e.fr = trie[0][0];
    e.source = "releve";
    // Un code auquel le relevé associe plusieurs libellés = un objet dont le
    // relevé a perdu un bonus, donc dont les libellés ont glissé d'un rang.
    if (trie.length > 1) e.ambigu = trie.slice(1).map(([l, ids]) => ({ libelle: l, objets: ids }));
  } else if (client) { e.fr = client; e.source = "client"; }
  if (client) e.client = client;
  if (e.fr && client && seContredisent(e.fr, client)) e.contradiction = true;
  stats.push(e);
}
const employes = stats.filter((s) => s.objets > 0);
const sansLibelle = employes.filter((s) => !s.fr).map((s) => s.code);
const nonDefinis = employes.filter((s) => s.nonDefini).map((s) => s.code);

// ── écriture ─────────────────────────────────────────────────────────────────
const jour = new Date().toISOString().slice(0, 10);
const socle = {
  genere: jour,
  source: "Client/data-05.air → Spec_Item.txt · data-00.air → defineitem.h, defineattribute.h · data-01.air → propitem.txt.txt",
  releve: {
    lignesObjet: lignes.length + rejetees.length,
    retenues: lignes.length,
    rejetees: rejetees.length,
    rejets: rejetees,
    colonnesNommees: Object.keys(COL).length,
    cellulesParLigne: LARGEUR,
  },
  legende: {
    i: "identifiant numérique (defineitem.h)", cle: "identifiant symbolique II_*",
    n: "nom affiché — absent quand le client n'en donne aucun",
    t1: "TYPE1_* sans le préfixe", t2: "TYPE2_* sans le préfixe", k3: "dwItemKind3 sans IK3_",
    em: "emplacement (dwParts sans PARTS_)", g: "grade (UNIQUE, ULTIMATE ; absent si NORMAL)",
    job: "classe requise", sx: "sexe imposé", h: "mains (1, 2, 3 = deux armes)",
    wt: "type d'arme (dwWeaponType sans WT_)", ar: "portée (dwAttackRange sans AR_)",
    lv: "niveau de l'objet (dwItemLV)", nr: "niveau requis (dwLimitLevel1)",
    dn: "dwAbilityMin — dégâts mini pour une arme, défense pour une armure",
    dx: "dwAbilityMax", va: "dwAttackSpeed", pa: "dwParry", bl: "dwBlockRating",
    ea: "wItemEAtk — attaque élémentaire", rf: "dwReflect", el: "élément de l'arme",
    re: "résistances élémentaires", b: "bonus, [code DST_, valeur]",
  },
  total: objets.length,
  avecBonus: objets.filter((o) => o.b).length,
  sansNom: objets.filter((o) => !o.n).length,
  objets,
};
const cibleSocle = path.join(racine, "public", "wiki", "objets-stats.json");
fs.writeFileSync(cibleSocle, JSON.stringify(socle) + "\n");

const dictionnaire = {
  genere: jour,
  source: "data-00.air → defineattribute.h (codes) · data-02.air → textClient.inc + data-01.air → textclient.txt.txt (libellés du client) · public/wiki/objets-fiches.json (libellés du relevé, réalignés)",
  definis: [...CODE_DST.keys()].filter((c) => c !== "DST_NONE").length,
  employes: employes.length,
  sansLibelle,
  nonDefinis,
  stats,
  codesNonDst: [...inconnus.entries()].map(([v, n]) => ({ valeur: v, objets: n })),
  bonusSansValeur,
  valeurSansBonus,
  colonnesNonNommees: recensementAjouts,
  concordance: {
    pierreDeTouche: {
      quoi: "public/airbuilder/data.json → ITEMS[*].b, relevé fait main",
      temoins: cBuilder.temoins, absents: cBuilder.absents,
      lignesComparees: cBuilder.comparees, identiques: cBuilder.identiques,
      taux: cBuilder.comparees ? +(cBuilder.identiques / cBuilder.comparees * 100).toFixed(1) : null,
      divergences: cBuilder.divergences,
    },
    releveFrancais: {
      quoi: "public/wiki/objets-fiches.json → objets[*].b, relevé précédent du même fichier client",
      temoins: cFiches.temoins, absents: cFiches.absents,
      lignesComparees: cFiches.comparees, identiques: cFiches.identiques,
      taux: cFiches.comparees ? +(cFiches.identiques / cFiches.comparees * 100).toFixed(1) : null,
      divergences: cFiches.divergences,
    },
  },
};
const cibleDico = path.join(racine, "src", "data", "statistiques-objets.json");
fs.writeFileSync(cibleDico, JSON.stringify(dictionnaire, null, 1) + "\n");

const ko = (f) => Math.round(fs.statSync(f).size / 1024) + " Ko";
console.log(`${cibleSocle}  (${ko(cibleSocle)})
  ${lignes.length} lignes retenues sur ${lignes.length + rejetees.length} · ${rejetees.length} rejetée(s)
  ${objets.length} objets gardés · ${socle.avecBonus} porteurs de bonus · ${usage.size} statistiques employées
${cibleDico}  (${ko(cibleDico)})
  ${dictionnaire.definis} codes définis · ${employes.length} employés · ${sansLibelle.length} sans libellé · ${nonDefinis.length} employé(s) sans définition
  pierre de touche : ${cBuilder.identiques}/${cBuilder.comparees} lignes identiques (${dictionnaire.concordance.pierreDeTouche.taux} %), ${cBuilder.absents} témoin(s) hors relevé
  relevé français  : ${cFiches.identiques}/${cFiches.comparees} lignes identiques (${dictionnaire.concordance.releveFrancais.taux} %)`);
