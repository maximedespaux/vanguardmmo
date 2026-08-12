// ════════════════════════════════════════════════════════════════════════════
//  D'OÙ VIENNENT LES BONUS — LES SEPT SOURCES, RELEVÉES DANS LE CLIENT
//  node scripts/extraire-bonus-sources.mjs  →  public/wiki/bonus-sources.json
// ════════════════════════════════════════════════════════════════════════════
//
// Un objet ne porte pas que les bonus écrits sur sa ligne de `Spec_Item.txt`
// (ceux-là sont dans `public/wiki/objets-stats.json`). Sept autres mécaniques en
// ajoutent, chacune décrite par un fichier différent du client — et TOUTES
// désignent la statistique par le même code `DST_*`. C'est ce qui rend le calcul
// possible : une seule clé, sept sources.
//
// ─────────────────────── LES FICHIERS ET CE QU'ILS DISENT ───────────────────
//
// Client/data-05.air
//   Ultimate_GemAbility.txt   sertissage. `ABILITY DST_x { gemme  gemme-taillée
//                             v1 … v8 }` : HUIT valeurs, dont l'en-tête n'en
//                             numérote que CINQ (« 1… » à « 5… ») et laisse les
//                             trois dernières sans titre ; seul le diamant les
//                             remplit, et il y répète sa cinquième valeur.
//                             `LEVEL_GEM` donne la tranche de niveau que chaque
//                             gemme accepte.
//                             CE QUE CES HUIT COLONNES NE SONT PAS : des
//                             EMPLACEMENTS de gemme. Trois raisons. (1) Le mot
//                             qui suit le chiffre dans l'en-tête est illisible :
//                             le fichier livré dans l'archive porte, à sa place,
//                             des caractères de remplacement (`EF BF BD`) — le
//                             coréen a été détruit par une conversion avant
//                             l'empaquetage, on ne peut donc rien lire du sens.
//                             (2) L'arithmétique l'interdit : la cinquième
//                             colonne vaut SIX fois la première (228 → 1365,
//                             1138 → 6825, 10 → 60) quand les quatre premières
//                             valent 1, 2, 3, 4 fois. Une somme de gemmes
//                             identiques ne peut pas valoir 6 à la cinquième :
//                             c'est un palier avec prime au maximum. (3) Sous la
//                             lecture « emplacement », une topaze en sixième
//                             position donnerait 0. Les huit emplacements d'une
//                             arme Artefact, eux, sont 5 + 3 : cinq logements de
//                             gemme (`MECH.arme.upgrade_normal.diamants`) et
//                             trois diamants holographiques débloqués de +11 à
//                             +20 (`MECH.arme.artefact.diamants_holo`), deux
//                             mécaniques distinctes que le nombre 8 fait se
//                             ressembler. D'où le nom de la clé : `paliers`.
//   Costume_GemAbility.txt    gemmes de costume, QUATRE paliers. Le fichier
//                             écrit DEUX FOIS `ABILITY DST_HEAL_RATE`, aux mêmes
//                             valeurs : le doublon est dans le CLIENT, ce n'est
//                             pas une erreur de relevé.
// FSDATA/COMMON/Systems/data.air
//   propweaponleveling.inc    maîtrise d'arme. Une statistique par TYPE2_ d'arme
//                             (et par arme nommée pour les Luzaka et les Éternel
//                             d'événement), sa valeur par rareté, puis treize
//                             paliers et l'expérience de chacun.
//   rarity.json               rareté : combien de lignes de bonus (0 à 4, avec
//                             leur probabilité), le vivier de quatre statistiques
//                             par famille d'arme, et le nombre de relances.
//   artefact.json             artefact : pierres holographiques et leur valeur,
//                             probabilité de réussite de +11 à +20, perçage
//                             plafonné à 12 sur les armes nommées.
//   angels.json               anges : chaque palier donne un OBJET de buff, dont
//                             les bonus se lisent dans objets-stats.json.
// FSDATA/CLIENT/data.air
//   maxawakes.json            éveil : le plafond de chaque statistique, séparé
//                             pour l'équipement, le costume et le familier.
// Client/data-02.air
//   propItemEtc.inc           (UTF-16LE) perçage : `Piercing <carte> { DST_x v }`,
//                             et panoplies : `SetItem <n> <nom> { Elem {…} Avail
//                             { DST_x  valeur  pièces } }`.
//   propJob.inc               (CP949) dix-huit colonnes par classe. SEPT nomment
//                             une famille d'arme (SWD 4,5 · AXE 5,5 · STAFF 0,8 ·
//                             STICK 3 · KNUCKLE 5 · WAND 6 · YOYO 4,2) et ces
//                             sept-là ne varient PAS d'une classe à l'autre : ce
//                             sont des constantes d'arme recopiées sur chaque
//                             ligne, à ne pas indexer par classe. BLOCKING et
//                             CRITICAL varient, mais ne désignent pas une arme.
//                             ICON n'est pas un coefficient du tout : c'est un
//                             nom de fichier (« JobBlade »), absent sur trois
//                             classes. Deux colonnes n'ont aucun intitulé latin :
//                             on garde le coréen.
//
// CE QU'ON NE DIT PAS. Aucun de ces fichiers ne précise si la valeur d'un palier
// s'AJOUTE au précédent ou le REMPLACE. Les huit valeurs du diamant se lisent
// comme un cumul (1138 × N jusqu'à 5, puis plateau), celles de la maîtrise d'arme
// donnent un seul nombre par rareté pour treize paliers. On recopie ce qui est
// écrit, on ne tranche pas — un facteur faux vaut un dégât faux.

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
const cli = lireArchive(path.join(CLIENT, "FSDATA/CLIENT/data.air"));

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
const NOM_SET = tableIds(texte(a01.get("propitemetc.txt.txt")));

// Le nom d'un objet ne se DÉDUIT PAS de son numéro : la hache Rodney porte le
// numéro 81 et le texte IDS_PROPITEM_TXT_000124. Il faut lire la deuxième
// colonne de Spec_Item.txt, qui nomme le texte — et qui pointe indifféremment
// vers l'un des trois espaces de noms du fichier de textes.
const TEXTE_DE = new Map();
for (const l of texte(a05.get("Spec_Item.txt")).split(/\r?\n/)) {
  if (!l || l.startsWith("//")) continue;
  const c = l.split("\t");
  if (c.length < 100) continue;
  const cle = (c[1] ?? "").trim();
  if (cle.startsWith("II_") && !TEXTE_DE.has(cle)) TEXTE_DE.set(cle, (c[2] ?? "").trim());
}
const objet = (cle) => {
  const o = { cle };
  const i = ID_OBJET.get(cle);
  if (i != null) o.i = i;
  return o;
};
// Un objet n'a de nom que si le client lui en donne un : sinon la clé est absente.
const objetNomme = (cle) => {
  const o = objet(cle);
  const t = NOM_OBJET.get(TEXTE_DE.get(cle) ?? "");
  if (t) o.n = t;
  return o;
};

const nombres = (l) => l.trim().split(/\s+/);
const anomalies = [];

// ── 1. SERTISSAGE — gemmes ultimes ───────────────────────────────────────────
const gu = texte(a05.get("Ultimate_GemAbility.txt"));
const gemmesUltimes = [];
for (const bloc of gu.matchAll(/ABILITY\s+(DST_[A-Z0-9_]+)\s*\{([^}]*)\}/g)) {
  const rangees = [];
  for (const l of bloc[2].split(/\r?\n/)) {
    const t = nombres(l).filter((x) => x !== "");
    if (t.length < 3 || !t[0].startsWith("II_")) continue;
    rangees.push({ gemme: objetNomme(t[0]), taillee: objet(t[1]), paliers: t.slice(2).map(Number) });
  }
  gemmesUltimes.push({ code: bloc[1], gemmes: rangees });
}
// Combien de colonnes l'en-tête numérote-t-il ? On le COMPTE au lieu de l'écrire :
// la ligne de commentaire qui précède le premier bloc porte une cellule par
// colonne, et celles des paliers commencent par leur chiffre. Le mot qui suit le
// chiffre est illisible (caractères de remplacement, voir l'en-tête du fichier),
// donc on ne compte que les chiffres.
const paliersNommes = (src) => {
  for (const l of src.split(/\r?\n/)) {
    if (!/^\s*\/\//.test(l) || !l.includes("\t")) continue;
    const n = l.split("\t").filter((c) => /^\s*\d+/.test(c)).length;
    if (n) return n;
  }
  return null;
};

const tranches = [];
const lg = /LEVEL_GEM\s*\{([^}]*)\}/.exec(gu);
if (lg) for (const l of lg[1].split(/\r?\n/)) {
  const t = nombres(l).filter((x) => x !== "");
  if (t.length === 3 && t[0].startsWith("II_")) tranches.push({ gemme: objetNomme(t[0]), niveauMin: +t[1], niveauMax: +t[2] });
}

// ── 2. SERTISSAGE — gemmes de costume ────────────────────────────────────────
const gc = texte(a05.get("Costume_GemAbility.txt"));
const gemmesCostume = [];
for (const bloc of gc.matchAll(/ABILITY\s+(DST_[A-Z0-9_]+)\s*\{([^}]*)\}/g)) {
  const paliers = nombres(bloc[2].replace(/\s+/g, " ")).filter((x) => /^-?\d+$/.test(x)).map(Number);
  const deja = gemmesCostume.find((g) => g.code === bloc[1]);
  if (deja) { anomalies.push({ ou: "Costume_GemAbility.txt", quoi: "ABILITY " + bloc[1] + " écrit deux fois", identique: JSON.stringify(deja.paliers) === JSON.stringify(paliers) }); continue; }
  gemmesCostume.push({ code: bloc[1], paliers });
}
const gemmesCostumeFixes = [];
for (const bloc of gc.matchAll(/FIXED_GEM_ABILITY\s+(PARTS_[A-Z0-9_]+)\s*\{([^}]*)\}/g)) {
  const l = [];
  for (const ligne of bloc[2].split(/\r?\n/)) {
    const t = nombres(ligne).filter((x) => x !== "");
    if (t.length < 3 || !t[0].startsWith("II_")) continue;
    l.push({ gemme: objetNomme(t[0]), code: t[1], paliers: t.slice(2).map(Number) });
  }
  gemmesCostumeFixes.push({ emplacement: bloc[1].slice("PARTS_".length), gemmes: l });
}

// ── 3. PERÇAGE et 4. PANOPLIES — propItemEtc.inc ─────────────────────────────
const pie = texte(a02.get("propItemEtc.inc"));
const percage = [];
for (const bloc of pie.matchAll(/Piercing\s+(II_[A-Z0-9_]+)\s*\{([^}]*)\}/g)) {
  const bonus = [];
  for (const l of bloc[2].split(/\r?\n/)) {
    const t = nombres(l).filter((x) => x !== "");
    if (t.length >= 2 && t[0].startsWith("DST_")) bonus.push([t[0], Number(t[1])]);
  }
  if (bonus.length) percage.push({ carte: objetNomme(bloc[1]), b: bonus });
  else anomalies.push({ ou: "propItemEtc.inc", quoi: "Piercing " + bloc[1] + " sans bonus" });
}
const panoplies = [];
// Soixante-dix-huit en-têtes portent un commentaire entre le nom et l'accolade :
// un `\s*` avant le `{` les laissait tomber.
for (const bloc of pie.matchAll(/SetItem\s+(\d+)\s+(IDS_[A-Z0-9_]+)[^\n{]*\n\s*\{([\s\S]*?)\n\}/g)) {
  const corps = bloc[3];
  const elem = /Elem\s*\{([^}]*)\}/.exec(corps);
  const avail = /Avail\s*\{([^}]*)\}/.exec(corps);
  const pieces = [];
  if (elem) for (const l of elem[1].split(/\r?\n/)) {
    const t = nombres(l).filter((x) => x !== "");
    if (t.length >= 2 && t[0].startsWith("II_")) pieces.push({ ...objetNomme(t[0]), em: t[1].replace(/^PARTS_/, "") });
  }
  const paliers = [];
  if (avail) for (const l of avail[1].split(/\r?\n/)) {
    const t = nombres(l).filter((x) => x !== "");
    if (t.length >= 3 && t[0].startsWith("DST_")) paliers.push({ code: t[0], valeur: Number(t[1]), pieces: Number(t[2]) });
  }
  const nom = NOM_SET.get(bloc[2]);
  const p = { id: +bloc[1], pieces, paliers };
  if (nom) p.n = nom;
  if (!pieces.length || !paliers.length) anomalies.push({ ou: "propItemEtc.inc", quoi: "SetItem " + bloc[1] + " incomplet", pieces: pieces.length, paliers: paliers.length });
  panoplies.push(p);
}
// L'identifiant d'une panoplie n'est PAS unique dans le client : trois numéros
// sont écrits deux ou trois fois, sur des pièces différentes. Un consommateur qui
// range les panoplies dans une table indexée par `id` en perd donc trois sans
// s'en apercevoir — d'où l'anomalie, plutôt que le silence.
{
  const vus = new Map();
  for (const p of panoplies) vus.set(p.id, (vus.get(p.id) || 0) + 1);
  const doubles = [...vus.entries()].filter(([, n]) => n > 1);
  for (const [id, n] of doubles) {
    anomalies.push({
      ou: "propItemEtc.inc",
      quoi: "SetItem " + id + " écrit " + n + " fois, sur des pièces différentes",
      consequence: "l'identifiant de panoplie ne peut pas servir de clé",
    });
  }
}

// ── 5. MAÎTRISE D'ARME — propweaponleveling.inc ──────────────────────────────
const pwl = texte(sys.get("propweaponleveling.inc"));
const recompenses = {};
for (const m of pwl.matchAll(/Set([A-Za-z]+)Exp\((\d+)\)/g)) recompenses[m[1]] = +m[2];
const maitriseArme = [];
for (const m of pwl.matchAll(/Set(ItemType2|ItemID)Stat\(\s*([A-Z0-9_]+)\s*,\s*(DST_[A-Z0-9_]+)\s*\)\s*\{([^}]*)\}/g)) {
  const parRarete = {};
  for (const r of m[4].matchAll(/AddRarityStat\(\s*([A-Z]+)\s*,\s*(-?\d+)\s*\)/g)) parRarete[r[1]] = +r[2];
  maitriseArme.push({ porte: m[1] === "ItemType2" ? "type" : "objet", cible: m[2].replace(/^TYPE2_/, ""), code: m[3], parRarete });
}
const paliersMaitrise = [];
for (const m of pwl.matchAll(/AddStage\((\d+),\s*(\d+)\)\s*\{([\s\S]*?)\n\}/g)) {
  const tranchesExp = [];
  for (const w of m[3].matchAll(/WeaponLevelRange\((\d+),\s*(\d+)\)\s*\{[^}]*?SetExp\((\d+)\)/g)) {
    tranchesExp.push({ niveauArmeMin: +w[1], niveauArmeMax: +w[2], exp: +w[3] });
  }
  paliersMaitrise.push({ du: +m[1], au: +m[2], exp: tranchesExp });
}

// ── LES FACTEURS DE CLASSE — propJob.inc ─────────────────────────────────────
// Dix-huit colonnes pour chacune des quarante classes. L'en-tête du fichier les
// nomme lui-même, en coréen (CP949) pour huit d'entre elles et en clair pour les
// dix autres (SWD, AXE, STAFF, STICK, KNUCKLE, WAND, BLOCKING, YOYO, CRITICAL,
// ICON). On recopie l'intitulé du client TEL QUEL, sans le traduire : deux
// colonnes n'ont aucun fragment latin et resteraient une devinette. DIX-HUIT
// COLONNES NE FONT PAS DIX-HUIT COEFFICIENTS : `ICON` porte un nom de fichier,
// pas un nombre. Le compte rendu ci-dessous les sépare, et les compte.
const pj = new TextDecoder("euc-kr").decode(a02.get("propJob.inc"));
const lignesJob = pj.split(/\r?\n/).filter((l) => l.trim());
const enTeteJob = (lignesJob.find((l) => l.includes("MaxHP")) ?? "").split("\t").slice(1).map((c) => c.trim());
const colonnesJob = enTeteJob.map((titre, i) => {
  const latin = titre.replace(/[^\x20-\x7E]/g, "").trim();
  return { rang: i, titre, cle: latin || "colonne" + (i + 1), traduit: Boolean(latin) };
});
const facteursDeClasse = [];
// Les sept familles d'arme nommées par l'en-tête. BLOCKING, CRITICAL et ICON
// figurent dans la même série de colonnes mais ne désignent pas une arme : on ne
// les compte pas parmi les facteurs d'arme.
const FAMILLES_ARME = ["SWD", "AXE", "STAFF", "STICK", "KNUCKLE", "WAND", "YOYO"];
for (const l of lignesJob) {
  if (!l.startsWith("JOB_")) continue;
  const t = l.split("\t").map((c) => c.trim());
  const f = { classe: t[0].slice("JOB_".length) };
  colonnesJob.forEach((c, i) => {
    const v = t[i + 1];
    if (v === undefined || v === "" || v === "=") return;
    f[c.cle] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  });
  facteursDeClasse.push(f);
}
// Deux renseignements qu'aucun consommateur ne doit redécouvrir : quelles colonnes
// ne portent pas un nombre, et lesquelles ne varient pas d'une classe à l'autre.
// Les deux se COMPTENT sur les quarante lignes.
for (const c of colonnesJob) {
  const vues = facteursDeClasse.map((f) => f[c.cle]);
  const remplies = vues.filter((v) => v !== undefined);
  if (remplies.length && remplies.every((v) => typeof v !== "number")) {
    c.coefficient = false;
    c.quoi = "pas un nombre — le client y écrit un texte";
  } else c.coefficient = true;
  c.varieSelonLaClasse = new Set(remplies).size > 1;
  if (FAMILLES_ARME.includes(c.cle)) c.familleDArme = true;
  const absentes = facteursDeClasse.length - remplies.length;
  if (absentes) c.classesSansValeur = absentes;
}

// ── 6. RARETÉ et 7. ÉVEIL, plus l'artefact et les anges ──────────────────────
const rarete = JSON.parse(texte(sys.get("rarity.json")));
const artefact = JSON.parse(texte(sys.get("artefact.json")));
const anges = JSON.parse(texte(sys.get("angels.json")));
const eveil = JSON.parse(texte(cli.get("maxawakes.json")));

// ── LA PIERRE DE TOUCHE ──────────────────────────────────────────────────────
// Le relevé fait main de l'AirBuilder décrit trois de ces sept sources : les
// panoplies Shaïtan et Dryade classe par classe, la valeur maximale des neuf
// gemmes ultimes, et les cinq pierres holographiques. On les recompte ici : si
// l'extraction s'en écartait, ce serait l'extraction qu'il faudrait suspecter.
const builder = JSON.parse(fs.readFileSync(path.join(racine, "src", "data", "builder-data.json"), "utf8"));
const bd = JSON.parse(fs.readFileSync(path.join(racine, "public", "airbuilder", "data.json"), "utf8"));

const empreinte = (v) => [...v].sort((a, b) => a - b).join(",");
const empreintesPanoplies = new Map();
for (const p of panoplies) {
  const e = empreinte(p.paliers.map((x) => x.valeur));
  if (!empreintesPanoplies.has(e)) empreintesPanoplies.set(e, []);
  empreintesPanoplies.get(e).push(p.id);
}
const panopliesMain = [];
for (const [tier, classes] of Object.entries(builder.setBonus ?? {})) {
  for (const [classe, lignes] of Object.entries(classes)) {
    const e = empreinte(lignes.map((x) => x.value));
    panopliesMain.push({ tier, classe, valeurs: lignes.length, retrouveeDans: empreintesPanoplies.get(e) ?? [] });
  }
}

// Comparer les VALEURS ne suffit pas. Les quatre pierres holographiques de
// statistique valent toutes 33, et quatre des neuf gemmes ultimes valent toutes
// 75 : un ordre faux passe donc la comparaison chiffrée sans broncher. C'est le
// piège DIASTATS. On compare aussi le LIBELLÉ, en le prenant dans le dictionnaire
// produit par `extraire-statistiques-objets.mjs` — on ne se donne pas de table de
// correspondance à la main.
const dicoStats = new Map();
try {
  const dico = JSON.parse(fs.readFileSync(path.join(racine, "src", "data", "statistiques-objets.json"), "utf8"));
  for (const s of dico.stats ?? []) if (s.fr) dicoStats.set(s.code, s.fr);
} catch { /* le dictionnaire n'est pas encore produit : on ne compare que les valeurs. */ }
const memeLibelle = (a, b) => {
  if (!a || !b) return null;
  const n = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  return n(a) === n(b);
};

const diamant = (code) => gemmesUltimes.find((g) => g.code === code)?.gemmes.find((x) => x.gemme.cle === "II_GEN_MAT_DIAMOND");
// Même précaution que pour les pierres holographiques : QUATRE des neuf gemmes
// ultimes valent 75, une comparaison chiffrée seule ne verrait pas un ordre
// inversé. On vérifie donc aussi le libellé — c'est ce qui fait tenir la
// démonstration « GEMU est le bon ordre, DIASTATS non ».
const gemmesMain = (bd.GEMU ?? []).map((g, i) => {
  const code = gemmesUltimes[i]?.code ?? null;
  const d = diamant(code);
  const attendu = code ? dicoStats.get(code) ?? null : null;
  const e = { rang: i, main: g, code, palier5: d ? d.paliers[4] : null, egal: d ? d.paliers[4] === g.v : false };
  if (attendu) { e.libelleAttendu = attendu; e.libelleEgal = memeLibelle(g.fr, attendu); }
  return e;
});
const holoMain = (bd.HOLOSTATS ?? []).map(([nom, v], i) => {
  const c = artefact.gemStones?.[0]?.abilities?.[i];
  const attendu = c?.dstId ? dicoStats.get(c.dstId) ?? null : null;
  const l = memeLibelle(nom, attendu);
  const e = { rang: i, main: { nom, v }, code: c?.dstId ?? null, valeur: c?.adjValue ?? null, egal: c?.adjValue === v };
  if (attendu) { e.libelleAttendu = attendu; e.libelleEgal = l; }
  return e;
});

const sortie = {
  genere: new Date().toISOString().slice(0, 10),
  source: "Client/data-05.air (Ultimate_GemAbility.txt, Costume_GemAbility.txt) · Client/FSDATA/COMMON/Systems/data.air (propweaponleveling.inc, rarity.json, artefact.json, angels.json) · Client/FSDATA/CLIENT/data.air (maxawakes.json) · Client/data-02.air (propItemEtc.inc) · Client/data-00.air + data-01.air (identifiants et noms)",
  sertissage: {
    ultimes: gemmesUltimes,
    // PALIERS, pas emplacements — voir l'en-tête de ce fichier. Les huit
    // emplacements d'une arme Artefact viennent d'ailleurs (5 + 3).
    paliersParGemme: gemmesUltimes[0]?.gemmes[0]?.paliers.length ?? null,
    paliersNumerotesParLeClient: paliersNommes(gu),
    paliersNonNumerotes: "Le mot qui suit le chiffre dans l'en-tête est illisible : l'archive livre des caractères de remplacement à sa place. Rien, dans le client, ne dit ce que compte cette colonne.",
    tranchesDeNiveau: tranches,
    costume: gemmesCostume,
    costumeFixes: gemmesCostumeFixes,
  },
  percage: {
    cartes: percage,
    plafond: artefact.piercingUpgrade?.maxPiercingSizes ?? null,
    probabilites: artefact.piercingUpgrade?.probabilities ?? null,
  },
  panoplies,
  maitriseArme: {
    statistiques: maitriseArme,
    paliers: paliersMaitrise,
    experienceGagnee: recompenses,
  },
  rarete: {
    lignes: rarete.lineChance,
    viviers: rarete.itemKind3,
    parObjet: rarete.itemId ?? null,
    relances: rarete.rerolls,
    annonces: rarete.annoucement,
  },
  eveil,
  artefact: {
    pierres: artefact.gemStones,
    amelioration: artefact.generalUpgrade,
    fragments: artefact.sacrificeFragments,
    etoiles: artefact.starUpgrade,
  },
  anges: anges.angels,
  facteursDeClasse: { colonnes: colonnesJob, classes: facteursDeClasse },
  anomalies,
  concordance: {
    quoi: "src/data/builder-data.json (setBonus, relevé fait main) et public/airbuilder/data.json (GEMU, HOLOSTATS)",
    panoplies: { comparees: panopliesMain.length, retrouvees: panopliesMain.filter((p) => p.retrouveeDans.length).length, detail: panopliesMain },
    gemmesUltimes: {
      comparees: gemmesMain.length,
      egales: gemmesMain.filter((g) => g.egal).length,
      libellesEgaux: gemmesMain.filter((g) => g.libelleEgal === true).length,
      libellesFaux: gemmesMain.filter((g) => g.libelleEgal === false).map((g) => ({ rang: g.rang, main: g.main.fr, code: g.code, attendu: g.libelleAttendu })),
      detail: gemmesMain,
    },
    pierresHolographiques: {
      comparees: holoMain.length,
      egales: holoMain.filter((g) => g.egal).length,
      libellesEgaux: holoMain.filter((g) => g.libelleEgal === true).length,
      libellesFaux: holoMain.filter((g) => g.libelleEgal === false).map((g) => ({ rang: g.rang, main: g.main.nom, code: g.code, attendu: g.libelleAttendu })),
      detail: holoMain,
    },
  },
};

const cible = path.join(racine, "public", "wiki", "bonus-sources.json");
fs.writeFileSync(cible, JSON.stringify(sortie, null, 1) + "\n");
console.log(`${cible}  (${Math.round(fs.statSync(cible).size / 1024)} Ko)
  sertissage : ${gemmesUltimes.length} statistiques de gemme ultime sur ${sortie.sertissage.paliersParGemme} paliers (${sortie.sertissage.paliersNumerotesParLeClient} numérotés par le client) · ${gemmesCostume.length} de costume · ${gemmesCostumeFixes.length} emplacements à gemme imposée
  perçage    : ${percage.length} cartes
  panoplies  : ${panoplies.length} (${panoplies.filter((p) => p.n).length} nommées)
  maîtrise   : ${maitriseArme.length} règles · ${paliersMaitrise.length} paliers
  rareté     : ${rarete.itemKind3.length} viviers · ${rarete.lineChance.length} lignes possibles
  éveil      : ${Object.keys(eveil).map((k) => k + " " + Object.keys(eveil[k]).length).join(", ")}
  anges      : ${anges.angels.length}
  classes    : ${facteursDeClasse.length} × ${colonnesJob.length} colonnes, dont ${colonnesJob.filter((c) => c.coefficient).length} coefficients et ${colonnesJob.filter((c) => c.familleDArme).length} familles d'arme (${colonnesJob.filter((c) => c.coefficient && !c.varieSelonLaClasse).length} ne varient pas selon la classe · ${colonnesJob.filter((c) => !c.traduit).length} sans intitulé latin)
  anomalies  : ${anomalies.length}
  pierre de touche : ${sortie.concordance.panoplies.retrouvees}/${sortie.concordance.panoplies.comparees} panoplies du relevé main retrouvées · ${sortie.concordance.gemmesUltimes.egales}/${sortie.concordance.gemmesUltimes.comparees} gemmes ultimes (libellés ${sortie.concordance.gemmesUltimes.libellesEgaux}/${sortie.concordance.gemmesUltimes.comparees}) · ${sortie.concordance.pierresHolographiques.egales}/${sortie.concordance.pierresHolographiques.comparees} pierres holographiques en valeur, ${sortie.concordance.pierresHolographiques.libellesEgaux}/${sortie.concordance.pierresHolographiques.comparees} en libellé${sortie.concordance.pierresHolographiques.libellesFaux.length ? " (à corriger dans le relevé main : " + sortie.concordance.pierresHolographiques.libellesFaux.map((x) => x.main + " → " + x.attendu).join(", ") + ")" : ""}`);
