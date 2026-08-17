/**
 * GÉNÈRE public/airbuilder/mecaniques.json — les DESSINS du jeu et les FAITS
 * des mécaniques, pour l'AirBuilder.
 *
 * ── CE QUE LE FICHIER CONTIENT, EN DEUX MOITIÉS ────────────────────────────
 *
 *   LES DESSINS, à la racine : `rarete`, `element`, `upgrade`, `artefact`,
 *   `ascension`, `runeArme`, `holo`, `eveil`. Chaque valeur porte au minimum un
 *   chemin d'image `f`, souvent le nom `n` et la phrase `d` du client.
 *
 *   LES FAITS, sous `faits` : ce que la bulle et le panneau doivent DIRE.
 *   `faits.armes` est le JOINT — de l'`id` d'une arme du catalogue vers sa clé,
 *   son type, sa ligne de maîtrise, sa famille d'ascension, son vivier de
 *   rareté. Chaque bloc porte `dansLeTotal` (le total du build compte-t-il déjà
 *   cette mécanique ?) et, quand il vaut `false`, un `pourquoiPas`.
 *   La forme complète est décrite au milieu de ce fichier, sous le titre
 *   « DEUXIÈME MOITIÉ : LES FAITS », et résumée dans le champ `faits.lire`.
 *
 * ── LES TROIS RÈGLES QUI ONT DÉCIDÉ DE TOUT ────────────────────────────────
 *
 *   1. ON PART DE LA CLÉ DU CLIENT, jamais du nom d'un fichier ni d'un nom
 *      français (voir juste en dessous).
 *   2. CE QUI EST DÉJÀ DANS data.json N'EST PAS RECOPIÉ. `data.json` est
 *      injecté EN LIGNE : il est en mémoire avant que ce fichier-ci n'arrive.
 *      On écrit le chemin (`data.json ▸ MECH.arme.eveil`), le consommateur va
 *      le lire là-bas. Idem pour les trois grosses tables du client, listées
 *      dans `faits.renvois`.
 *   3. LES CHIFFRES SE COMPTENT. Aucune phrase de ce fichier ne porte un nombre
 *      tapé à la main : les totaux, les concordances et les écarts sont tous
 *      calculés, pour qu'ils cessent d'être vrais si les données changent.
 *
 * POURQUOI UNE TABLE À PART, et pas un ajout à data.json : `data.json` est
 * injecté EN LIGNE dans le document (BuilderRunner.tsx, <script id="DATA">).
 * Tout ce qu'on y met est payé par chaque visiteur AVANT le premier affichage.
 * Cette table-ci se charge en différé, comme `paliers.json`.
 *
 * POURQUOI UN GÉNÉRATEUR, ET POURQUOI IL PART DE LA CLÉ DU CLIENT.
 *
 * Les noms de fichiers de ce projet mentent, et ce dossier-ci ment deux fois :
 *   · `artefact-orichalque-scintillant.webp` n'est PAS l'« Orichalque
 *     Scintillant » (II_GEN_MAT_ORICHALCUM02) — c'est l'« Orichalque Scintillant
 *     pure » (II_SYS_SYS_ORI2_ARTEFACT), celui du passage +11 → +20 ;
 *   · `artefact-orichalque-pure.webp` est l'« Orichalque Pure »
 *     (II_SYS_SYS_ORI_ARTEFACT), dont le client ne dit RIEN — il ne sort pas.
 * Se fier au nom de fichier aurait affiché la pierre du +11 → +20 sur le premier
 * palier. D'où la règle de ce script : ON PART DE LA CLÉ DE L'OBJET, jamais du
 * nom du dessin. Le client dit lui-même quel fichier le représente (champ `ic`
 * du relevé), et c'est cette icône qui fait foi.
 *
 * `public/jeu/mecaniques/` reste préféré quand son fichier est OCTET POUR OCTET
 * celui du client : c'est le dossier curé du site, mais il n'a pas voix au
 * chapitre sur l'identité de l'objet. Pour les dessins retaillés (l'ascension,
 * les cartes d'élément…) la correspondance est déclarée à la main, et chaque
 * image a été ouverte avant d'être posée.
 *
 *   node scripts/generer-mecaniques-builder.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RACINE = process.cwd();
const D_MECA = path.join(RACINE, "public", "jeu", "mecaniques");
const D_ICON = path.join(RACINE, "public", "jeu", "icones");
const SORTIE = path.join(RACINE, "public", "airbuilder", "mecaniques.json");

const MECA = new Set(fs.readdirSync(D_MECA));
const ICON = new Set(fs.readdirSync(D_ICON));
const RELEVE = JSON.parse(fs.readFileSync(path.join(RACINE, "public", "wiki", "objets-fiches.json"), "utf8"));
const DATA = JSON.parse(fs.readFileSync(path.join(RACINE, "public", "airbuilder", "data.json"), "utf8"));
const PAR_CLE = new Map(RELEVE.objets.filter((o) => o.cle).map((o) => [o.cle, o]));

const ecartes = [];
const sansAccent = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = (s) => sansAccent(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sha = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");

/** Le jumeau octet pour octet d'une icône du client dans le dossier curé, s'il
 *  existe. C'est le seul cas où le nom de `mecaniques/` est cru sans réserve :
 *  il n'apporte alors aucune information, c'est le même fichier. */
let PAR_EMPREINTE = null;
function jumeauCure(fichierIcone) {
  if (!PAR_EMPREINTE) {
    PAR_EMPREINTE = new Map();
    for (const f of MECA) PAR_EMPREINTE.set(sha(path.join(D_MECA, f)), f);
  }
  return PAR_EMPREINTE.get(sha(path.join(D_ICON, fichierIcone))) ?? null;
}

/**
 * L'objet du client, avec SON dessin et SA phrase.
 * `dessin` force un fichier de `mecaniques/` dont l'identité a été vérifiée à
 * l'œil contre l'icône du client (les retailles n'ont pas la même empreinte).
 */
function objet(cle, { dessin } = {}) {
  const o = PAR_CLE.get(cle);
  if (!o) { ecartes.push({ cle, raison: "absent du relevé du client" }); return null; }
  let src = null;
  if (dessin) {
    if (MECA.has(dessin)) src = "/jeu/mecaniques/" + dessin;
    else ecartes.push({ cle, fichier: dessin, raison: "le dessin curé n'est pas sur le disque" });
  }
  if (!src && o.ic && ICON.has(o.ic)) {
    const j = jumeauCure(o.ic);
    src = j ? "/jeu/mecaniques/" + j : "/jeu/icones/" + o.ic;
  }
  if (!src) { ecartes.push({ cle, nom: o.n, raison: "aucun dessin sur le disque — la ligne ne sort pas" }); return null; }
  // La phrase du client, coupée avant la mention de PNJ : c'est un libellé de
  // survol, pas un paragraphe, et « obtenable au PNJ Donjon Luca » ne change pas
  // le geste ici.
  const d = (o.d ?? "").split(/,\s*(?:obtenable|disponible)\b/i)[0].trim();
  return { f: src, n: o.n, d };
}

/* ── LA RARETÉ ─────────────────────────────────────────────────────────────
   Le client ne nomme aucun « parchemin de rareté » — la correspondance ne peut
   donc pas passer par une clé. Elle passe par le NOM DU PALIER,
   `MECH.arme.rarete_tiers` → le fichier de même nom sans accents, et la teinte
   de chaque parchemin a été vérifiée contre `RARCOL` du moteur (Rare bleu,
   Épique violet, Légendaire doré, Pré-Mythique rose). Commun et Mythique n'ont
   pas de parchemin : l'un est la base, l'autre s'obtient sur une arme niveau
   100. Ils n'entrent pas plutôt que d'emprunter le dessin d'un voisin. */
const rarete = {};
for (const t of DATA.MECH.arme.rarete_tiers) {
  const f = `rarete-${slug(t)}.webp`;
  if (MECA.has(f)) rarete[t] = "/jeu/mecaniques/" + f;
  else ecartes.push({ fichier: f, raison: `le palier « ${t} » n'a pas de parchemin dessiné` });
}

/* ── L'ÉLÉMENT ─────────────────────────────────────────────────────────────
   La carte COMPLÈTE (+1 à +20), pas l'obsolète (+1 à +5) : le builder monte
   l'élément jusqu'à 20 et montrer celle qui plafonne à 5 ferait acheter la
   mauvaise. Les clés sont celles que `src/components/mecaniques/releves.ts`
   emploie déjà. */
const CARTE_ELEMENT = {
  "Feu": ["II_GEN_MAT_ELE_FLAME", "element-feu.webp"],
  "Eau": ["II_GEN_MAT_ELE_RIVER", "element-eau.webp"],
  "Vent": ["II_GEN_MAT_ELE_CYCLON", "element-vent.webp"],
  "Terre": ["II_GEN_MAT_ELE_DESERT", "element-terre.webp"],
  "Électricité": ["II_GEN_MAT_ELE_GENERATOR", "element-electricite.webp"],
};
const element = {};
for (const el of DATA.ELEMENTS) {
  const p = CARTE_ELEMENT[el];
  if (!p) { ecartes.push({ raison: `aucune carte connue pour l'élément « ${el} »` }); continue; }
  const o = objet(p[0], { dessin: p[1] });
  if (o) element[el] = o;
}

/* ── L'AMÉLIORATION : CE QU'ELLE COÛTE ─────────────────────────────────────
   Le GAIN par palier ne se calcule pas (propEnchant.inc ne donne que des
   coefficients, sans multiplicande) et n'est donc jamais affiché. La PIERRE à
   posséder, elle, est écrite noir sur blanc dans la description de l'objet :
   c'est le seul renseignement chiffrable de cette mécanique, et c'est celui qui
   change le geste — on sait quoi acheter avant de monter.
   `protection` est le parchemin qui évite de PERDRE la pièce à l'échec : une
   mise en garde qui protège d'une erreur coûteuse, elle reste. */
const ECHELLES = {
  armeArmure: [
    { de: 1, a: 10, cle: "II_GEN_MAT_ORICHALCUM01" },
    { de: 11, a: 20, cle: "II_SYS_SYS_ORI2_ARTEFACT", dessin: "artefact-orichalque-scintillant.webp", protection: "II_SPROTECT_PURE" },
  ],
  bijou: [
    { de: 1, a: 20, cle: "II_GEN_MAT_MOONSTONE" },
    { de: 21, a: 30, cle: "II_PIERRE_AMEL_DPS", protection: "II_APROTECT_LUNAIRE" },
  ],
};
const upgrade = {};
for (const [famille, paliers] of Object.entries(ECHELLES)) {
  upgrade[famille] = [];
  for (const p of paliers) {
    const o = objet(p.cle, { dessin: p.dessin });
    if (!o) continue;
    const prot = p.protection ? objet(p.protection) : null;
    upgrade[famille].push({ de: p.de, a: p.a, ...o, ...(prot ? { prot } : {}) });
  }
}
/* Le passage en Artefact n'est pas un palier : c'est un changement de nature,
   entre le +10 et le +11. Il a sa propre pierre. */
const artefact = objet("II_SYS_SYS_STONE_ARTEFACT", { dessin: "artefact-pierre.webp" });

/* ── L'ASCENSION D'UNE ARME ARTEFACT ───────────────────────────────────────
   Les 27 parchemins `II_SCROLL_ARTE_*` s'appellent « Parchemin d'ascension
   <ARME> Artefact Niveau <N> » : la famille d'arme et le rang se LISENT dans le
   nom du client, ils ne sont pas devinés. Deux familles portent un nom de
   fichier abrégé — le client dit « Glaive et Doloire » et « Yo-yo » là où le
   dessin s'appelle `glaive-doloire` et `yoyo` ; l'alias est déclaré ici. */
const ALIAS_ARME = { "glaive-et-doloire": "glaive-doloire", "yo-yo": "yoyo" };
const ascension = {};
for (const o of RELEVE.objets) {
  const m = /^Parchemin d'ascension (.+?) Artefact Niveau (\d)$/.exec(o.n ?? "");
  if (!(o.cle ?? "").startsWith("II_SCROLL_ARTE_") || !m) continue;
  const s = ALIAS_ARME[slug(m[1])] ?? slug(m[1]);
  const f = `artefact-ascension-${s}-${m[2]}.webp`;
  if (!MECA.has(f)) { ecartes.push({ cle: o.cle, fichier: f, raison: `« ${o.n} » n'a pas de dessin` }); continue; }
  (ascension[m[1]] ??= [])[Number(m[2]) - 1] = "/jeu/mecaniques/" + f;
}

/* ── LA RUNE D'ARME ────────────────────────────────────────────────────────
   Le builder range ses armes en quatre paliers (`tier`) et dessinait chacun
   avec une pierre de STATISTIQUE — une rune « Éternelle » s'affichait avec le
   caillou de Force. Les vraies runes existent. Le palier se relie à sa gamme
   par la clé du client, telle que `familleDeRune` de
   `src/components/mecaniques/releves.ts` la découpe : `…_TANK` → gamme
   Éternelle, `…_ANCIENT` → Luzaka oubliée, `…_YGGDRASILL` → Yggdrasil purifié.
   « Ancestral » n'a pas de gamme à lui dans ce découpage — seul le MARTEAU
   ancestral en porte le dessin, et prêter le dessin d'un marteau à une arme
   serait exactement l'erreur qu'on refuse. Il reste sans image.

   NI NOM NI PHRASE NE SORTENT D'ICI. La rune du client s'appelle « Rune Epée
   Éternelle (TANK) » et sa description chiffre les bonus de CE modèle : les
   afficher sur un arc annoncerait les gains d'une épée. Le DESSIN, lui, est
   partagé par toute la gamme — on le vérifie plutôt que de le supposer, en
   comptant les modèles qui portent la même icône. */
const RUNE_ARME = {
  "Éternel": ["_TANK", "rune-tank.webp"],
  "Lusaka": ["_ANCIENT", "rune-arme-ancestrale.webp"],
  "Yggdrasil": ["_YGGDRASILL", "rune-arme-yggdrasil.webp"],
};
const runeArme = {};
for (const [tier, [suffixe, dessin]] of Object.entries(RUNE_ARME)) {
  /* Le code d'arme sur trois lettres est exigé, comme `modeleDeRune` de
     releves.ts le fait : sans lui, `II_SYS_SYS_RUNE_ANCIENT` — le MARTEAU
     runique, qui n'est pas une arme de gamme — entrait dans le lot et faisait
     compter deux dessins pour une seule gamme. */
  const gamme = RELEVE.objets.filter((o) => /^II_SYS_SYS_RUNE_[A-Z]{3}_/.test(o.cle ?? "") && o.cle.endsWith(suffixe));
  // Une gamme dont les modèles ne partagent pas le même dessin n'a pas de
  // dessin de gamme : on ne choisit pas pour elle.
  const icones = [...new Set(gamme.map((o) => o.ic).filter(Boolean))];
  if (!gamme.length || icones.length !== 1) {
    ecartes.push({ cle: `II_SYS_SYS_RUNE_*${suffixe}`, raison: `${gamme.length} runes pour ${icones.length} dessins — pas de dessin commun à la gamme` });
    continue;
  }
  if (!MECA.has(dessin)) { ecartes.push({ fichier: dessin, raison: "le dessin curé n'est pas sur le disque" }); continue; }
  runeArme[tier] = { f: "/jeu/mecaniques/" + dessin, modeles: gamme.length };
}

/* ── LE RESTE ──────────────────────────────────────────────────────────────
   Le diamant holographique est le vrai correctif d'image de cette table : le
   moteur dessinait « la même pierre teintée, faute d'asset dédié » (son propre
   commentaire). L'asset existe. */
const holo = objet("II_SYS_SYS_DIAMOND_ARTEFACT", { dessin: "artefact-diamant-holographique.webp" });
const eveil = objet("II_SYS_SYS_SCR_AWAKE", { dessin: "eveil-parchemin.webp" });

/* ═══════════════════════════════════════════════════════════════════════════
   DEUXIÈME MOITIÉ : LES FAITS
   ═══════════════════════════════════════════════════════════════════════════

   Jusqu'ici cette table ne portait que des DESSINS. La bulle de l'AirBuilder
   et son panneau de configuration ont aussi besoin de DIRE les mécaniques —
   « cette ligne s'allume à partir de Rare », « le +N n'est pas compté », « le
   R2 vaut le double du R1 ». Sans table, l'écran recopierait ces phrases à la
   main, et les chiffres écrits à la main deviennent faux en silence.

   POURQUOI ICI ET PAS DANS data.json : `data.json` est injecté EN LIGNE dans
   le document. Chaque octet y est payé par chaque visiteur AVANT le premier
   affichage. Ce fichier-ci se charge par `fetch`, après. La règle appliquée
   partout dans ce bloc : CE QUI EST DÉJÀ DANS data.json N'EST PAS RECOPIÉ —
   on écrit le chemin (`MECH.arme.rarete_tiers`) et le consommateur va le lire
   là-bas, où il l'a déjà en mémoire.

   ── LA FORME, POUR LE LOT QUI CONSOMME ────────────────────────────────────

   `faits.armes` est LE JOINT. Le catalogue du builder (`data.json ▸
   ITEMS.weapon`) désigne ses armes par un `id` numérique et ne porte ni la clé
   du client, ni le type d'arme. Tout ce qui suit — maîtrise, ascension,
   plafond de perçage, vivier de rareté — est indexé par la clé ou par le type.
   `faits.armes["<id>"]` fait le pont, une fois pour toutes :

     { c: "II_WEA_BOW_ANCIENT",   la clé du client
       t: "WEAPON_ONESWORD",      le TYPE2 du client
       k: "SWD",                  la famille (itemKind3), celle des viviers
       asc: ["Arc", "objet"],     famille d'ascension + d'où elle vient
       mai: ["II_WEA_BOW_ANCIENT", "objet", "WEAPON_BOW"],
                                  la ligne de maîtrise RETENUE, sa provenance,
                                  et la ligne de type ÉCARTÉE s'il y en a une
       p12: true }                le client plafonne son perçage à 12

   `mai` porte UNE seule référence, jamais deux : la règle « la ligne nommée
   l'emporte sur la ligne de type » est APPLIQUÉE ici, pas laissée au
   consommateur. Le troisième élément nomme ce qui a été écarté pour que
   l'écran puisse le dire — il ne doit surtout pas être additionné.

   Chaque bloc de `faits` porte `dansLeTotal` : `true` si le total du build
   compte déjà cette mécanique, `false` sinon. C'est le champ qui permet à
   l'écran d'écrire « non compté » au lieu de laisser croire à un oubli.
   ═════════════════════════════════════════════════════════════════════════ */

const BONUS = JSON.parse(fs.readFileSync(path.join(RACINE, "public", "wiki", "bonus-sources.json"), "utf8"));
const STATS = JSON.parse(fs.readFileSync(path.join(RACINE, "public", "wiki", "objets-stats.json"), "utf8")).objets;
const LIBS = JSON.parse(fs.readFileSync(path.join(RACINE, "src", "data", "statistiques-objets.json"), "utf8")).stats;
const CRAFTS = JSON.parse(fs.readFileSync(path.join(RACINE, "public", "wiki", "crafts.json"), "utf8"));
const COLL = JSON.parse(fs.readFileSync(path.join(RACINE, "public", "wiki", "collections.json"), "utf8"));

const STAT_PAR_ID = new Map(STATS.map((o) => [o.i, o]));
const STAT_PAR_CLE = new Map(STATS.map((o) => [o.cle, o]));
/** Le libellé français d'un code `DST_*`, tel que le relevé des statistiques le
 *  porte. Jamais traduit ici : ce fichier-là est le seul à faire foi, et il est
 *  déjà celui que le moteur de statistiques emploie. */
const FR = new Map(LIBS.filter((s) => s.fr).map((s) => [s.code, s.fr]));
const fr = (code) => FR.get(code) ?? code;
/** Le panneau d'aide du jeu, par son titre. C'est le JEU qui parle : c'est la
 *  seule source sur ce qu'une opération coûte ou détruit. */
const panneau = (motif) => CRAFTS.ateliers.find((a) => motif.test(a.titre)) ?? null;
/** Une phrase d'un panneau, choisie par ce qu'elle contient. On ne recopie pas
 *  le panneau entier : seule la phrase qui change le geste entre ici. */
function phrase(p, motif) {
  if (!p) return "";
  // La coupe se fait sur le POINT seul. Couper aussi sur le point d'exclamation
  // rendait « Attention ! » comme une phrase entière et perdait l'avertissement
  // qui la suit — celui qui dit QUELLE carte part.
  const l = p.texte.replace(/#cfff/g, "").split(/(?<=\.)\s+|\n/).map((s) => s.trim()).filter(Boolean);
  return l.find((s) => motif.test(s)) ?? "";
}

/* ── LE VOCABULAIRE : DEUX FICHIERS QUI SE RECOUPENT ───────────────────────
   Le builder nomme ses statistiques en français (`EVSTATS`, `MECH.arme.eveil`),
   le client par des codes `DST_*`. Le rapprochement ne s'écrit pas à la main :
   `maxawakes.json` (relevé dans bonus-sources ▸ eveil.general) et
   `MECH.arme.eveil` portent LES MÊMES ONZE STATISTIQUES, dans le même ordre et
   AVEC LES MÊMES VALEURS. C'est cette égalité des valeurs — pas l'ordre seul —
   qui autorise l'appariement, et elle est vérifiée ici : si elle se casse, la
   ligne sort en écart au lieu de produire un faux libellé. */
const codesEveil = Object.keys(BONUS.eveil.general ?? {});
const motsEveil = Object.keys(DATA.MECH.arme.eveil ?? {});
const FR_BUILDER = new Map();
if (codesEveil.length === motsEveil.length) {
  codesEveil.forEach((code, i) => {
    const mot = motsEveil[i];
    if (BONUS.eveil.general[code] === DATA.MECH.arme.eveil[mot]) FR_BUILDER.set(code, mot);
    else ecartes.push({ cle: code, raison: `maxawakes.json et MECH.arme.eveil ne s'accordent pas au rang ${i + 1} (${BONUS.eveil.general[code]} contre ${DATA.MECH.arme.eveil[mot]}) — pas de libellé apparié` });
  });
} else {
  ecartes.push({ raison: `maxawakes.json porte ${codesEveil.length} statistiques et MECH.arme.eveil ${motsEveil.length} — appariement impossible` });
}
/** Le mot du BUILDER pour un code, ou à défaut celui du relevé des libellés.
 *  L'ordre compte : le builder écrit « MP max » là où le relevé écrit « PM
 *  max », et c'est le mot du builder que l'écran doit retrouver. */
const frBuilder = (code) => FR_BUILDER.get(code) ?? fr(code);

/* ── LA MAÎTRISE D'ARME ────────────────────────────────────────────────────
   LE MORCEAU LE PLUS FACILE À FAIRE MENTIR, et c'est pour ça qu'il est encodé
   comme il l'est.

   Le client donne, pour chaque ligne, SIX valeurs — une par rareté. Les
   recopier telles quelles invite le lecteur à y lire une montée en puissance.
   Il n'y en a AUCUNE : sur les 26 lignes, les cinq raretés non nulles portent
   partout le même nombre, seul NONE vaut zéro. La rareté ALLUME la ligne, elle
   ne la fait pas monter.

   D'où l'encodage : UNE valeur (`v`) et LA RARETÉ OÙ ELLE S'ALLUME (`des`).
   Un consommateur ne peut pas inventer une progression avec un seul nombre.
   `parRarete` n'apparaît QUE si les valeurs cessent d'être plates — le jour où
   AirFlyff les fait monter, le champ revient tout seul et `plate` tombe à
   `false`. Rien n'est perdu, rien n'est suggéré.

   LE NIVEAU DE MAÎTRISE (0 à 100 dans le builder) NE CHANGE PAS LA VALEUR.
   Les treize paliers du client ne portent QUE de l'expérience à gagner ; aucune
   valeur de statistique n'y est attachée. Le curseur du builder est donc un
   compteur de progression, pas un facteur. */
const ORDRE_RARETE = ["NONE", "RARE", "EPIC", "LEGENDARY", "PREMYTHIC", "MYTHIC"];

function ligneDeMaitrise(m) {
  const vals = ORDRE_RARETE.map((r) => m.parRarete[r] ?? 0);
  const nonNuls = vals.filter((v) => v !== 0);
  const plate = new Set(nonNuls).size <= 1;
  const iPremier = vals.findIndex((v) => v !== 0);
  const l = { code: m.code, fr: fr(m.code) };
  if (plate) {
    l.v = nonNuls[0] ?? 0;
    l.des = iPremier >= 0 ? ORDRE_RARETE[iPremier] : null;
  } else {
    // Le jour où le client fait monter une ligne : on rend les six valeurs et
    // `faits.maitrise.plate` tombe à false. Voir l'en-tête de ce bloc.
    l.parRarete = m.parRarete;
  }
  return l;
}

const maiParType = {};
const maiParObjet = {};
for (const m of BONUS.maitriseArme.statistiques) {
  const cible = m.porte === "type" ? maiParType : maiParObjet;
  (cible[m.cible] ??= []).push(ligneDeMaitrise(m));
}
const toutesLesLignes = BONUS.maitriseArme.statistiques.map(ligneDeMaitrise);
const maitrisePlate = toutesLesLignes.every((l) => l.v !== undefined);
/** À partir de quelle rareté les lignes s'allument. Compté, pas écrit : si une
 *  seule ligne s'allumait ailleurs, cette liste porterait deux valeurs et
 *  l'écran ne pourrait plus écrire une phrase unique. */
const allumeA = [...new Set(toutesLesLignes.map((l) => l.des).filter(Boolean))];
/** Les valeurs distinctes réellement employées, pour que l'écran puisse dire
 *  « 4 % ou 2 % selon l'arme » sans compter lui-même. */
const valeursDeMaitrise = [...new Set(toutesLesLignes.map((l) => l.v).filter((v) => v))].sort((a, b) => b - a);

/* ── L'ASCENSION, PAR TYPE D'ARME PLUTÔT QUE PAR NOM ───────────────────────
   Le builder retrouve aujourd'hui la famille d'ascension par le PREMIER MOT du
   nom français de la pièce. Ça marche pour « Arc éternel » et ça rate pour
   « Arbalète en Yggdrasil Purifié », qui ne commence par aucune famille connue
   et perd son dessin.

   Le client, lui, le dit sans ambiguïté : `artefact.etoiles` relie chaque
   ARME à ses trois parchemins, et le NOM du parchemin porte la famille
   (« Parchemin d'ascension Glaive et Doloire Artefact Niveau 2 »). On remonte
   donc arme → parchemin → famille, puis famille → TYPE2 pour les armes que le
   client n'a pas listées nommément. Deux provenances, et on dit laquelle :
   `"objet"` quand le client nomme l'arme, `"type"` quand on passe par son type. */
const ascParCle = new Map();
for (const e of BONUS.artefact.etoiles ?? []) {
  const o = PAR_CLE.get(e.upgradeItemId);
  const m = /^Parchemin d'ascension (.+?) Artefact Niveau \d$/.exec(o?.n ?? "");
  if (m) ascParCle.set(e.equipmentItemId, m[1]);
}
/* Un type qui mènerait à deux familles ne mène à AUCUNE : on ne choisit pas.
   On accumule donc les familles vues par type, et le type ne rend une famille
   que s'il n'en a vu qu'une. (Écrire le désaccord dans la même case que la
   réponse ne tient pas : une troisième arme du même type, d'accord avec la
   première, ressuscitait la famille qu'un désaccord venait d'annuler.) */
const famillesParType = new Map();
for (const [cle, fam] of ascParCle) {
  const t = STAT_PAR_CLE.get(cle)?.t2;
  if (!t) continue;
  if (!famillesParType.has(t)) famillesParType.set(t, new Set());
  famillesParType.get(t).add(fam);
}
const ascParType = new Map(
  [...famillesParType].map(([t, f]) => [t, f.size === 1 ? [...f][0] : null]),
);

/* ── LE PLAFOND DE PERÇAGE ────────────────────────────────────────────────
   Le client ne déclare QUE les armes qui montent à 12 ; le plafond ordinaire
   (10) est une valeur du builder, pas du client. On ne pose donc `p12` que sur
   les armes que le client nomme, et le reste garde le plafond du builder. */
const P12 = new Set((BONUS.percage.plafond ?? []).flatMap((p) => p.itemIds ?? []));
const plafondsPercage = [...new Set((BONUS.percage.plafond ?? []).map((p) => p.maxPiercingLevel))];

/* ── LE VIVIER DE RARETÉ ───────────────────────────────────────────────────
   `rarity.json` range ses viviers par FAMILLE D'ARME (`IK3_SWD`, `IK3_BOW`…),
   pas par niveau de rareté : monter de Rare à Légendaire ne change pas le
   vivier, ça change le nombre de lignes tirées. Quelques armes ont en plus un
   vivier À ELLES, qui remplace celui de leur famille. */
const vivierParFamille = new Map((BONUS.rarete.viviers ?? []).map((v) => [v.id, v]));
const vivierParObjet = new Map((BONUS.rarete.parObjet ?? []).map((v) => [v.id, v]));

/* ── LE JOINT : chaque arme du catalogue du builder ────────────────────────── */
const armes = {};
const armesSansCle = [];
for (const w of DATA.ITEMS.weapon ?? []) {
  const o = STAT_PAR_ID.get(w.id);
  // Une arme du catalogue que le relevé du client ne connaît pas ne reçoit
  // AUCUNE ligne : ni maîtrise, ni vivier, ni ascension. Elle est nommée ici
  // pour que l'écran écrive « non renseigné » au lieu d'afficher un blanc.
  if (!o) { armesSansCle.push({ id: String(w.id), n: w.n }); continue; }
  const e = { c: o.cle };
  if (o.t2) e.t = o.t2;
  if (o.k3) e.k = o.k3;

  /* L'ASCENSION NE SORT QUE POUR LES ARMES QUE LE CLIENT TIENT POUR ARTEFACT.
     Le discriminant n'est pas inventé : c'est la liste `percage.plafond`, celle
     des armes que le client plafonne à 12 logements. Elle contient les 19 armes
     de `artefact.etoiles` plus une (le Glaive éternel), que le client oublie de
     nommer dans l'ascension — et cette vingtième reçoit sa famille par son
     TYPE, pas par son nom, avec la mention `"type"`. Sans cette porte, chaque
     arme du catalogue recevait une famille d'ascension, y compris celles qui ne
     montent jamais en Artefact. */
  if (P12.has(o.cle)) {
    const famObj = ascParCle.get(o.cle);
    const famType = o.t2 ? ascParType.get(o.t2) : null;
    if (famObj) e.asc = [famObj, "objet"];
    else if (famType) e.asc = [famType, "type"];
  }

  // LA RÈGLE EST APPLIQUÉE ICI, PAS CHEZ LE CONSOMMATEUR.
  const nommee = maiParObjet[o.cle];
  const parType = o.t2 && maiParType[o.t2] ? o.t2 : null;
  if (nommee) e.mai = ["o", o.cle, ...(parType ? [parType] : [])];
  else if (parType) e.mai = ["t", parType];

  if (vivierParObjet.has(o.cle)) e.viv = ["o", o.cle];
  else if (o.k3 && vivierParFamille.has(`IK3_${o.k3}`)) e.viv = ["f", `IK3_${o.k3}`];

  if (P12.has(o.cle)) e.p12 = true;
  armes[String(w.id)] = e;
}
/** Les clés du catalogue, et les viviers par objet qu'il atteint réellement.
 *  Ces deux ensembles servent à ne pas embarquer les tables du client pour des
 *  armes que le builder ne propose pas. */
const clesDuCatalogue = new Set(Object.values(armes).map((a) => a.c));
const viviersEmployes = new Set(Object.values(armes).filter((a) => a.viv?.[0] === "o").map((a) => a.viv[1]));

/* ── L'ÉVEIL — DEUX SÉRIES QUI NE DISENT PAS LA MÊME CHOSE ─────────────────
   Le builder retient la LIGNE (R1 ou R2) et la STATISTIQUE, jamais la valeur.
   Poser un chiffre à côté demande de savoir COMMENT l'éveil a été obtenu, et
   le client décrit deux voies qui ne donnent pas les mêmes nombres :

     · le PARCHEMIN D'ÉVEIL ordinaire tire au sort. Le client écrit sur le
       parchemin lui-même que « les propriétés peuvent être négatives », et le
       seul chiffre qu'il donne est un PLAFOND par statistique
       (`maxawakes.json`, recopié dans MECH.arme.eveil). Ce n'est pas la valeur
       du joueur, c'est le maximum atteignable.
     · les PARCHEMINS D'ÉVEIL FIXE posent une ligne connue d'avance, et leur
       description CHIFFRE le gain, rang 1 et rang 2.

   LES DEUX SÉRIES SE CONTREDISENT — le plafond du tirage est plus bas que le
   fixe (Force : plafond 15, fixe 30 puis 60). `src/components/mecaniques/
   releves.ts` a déjà tranché cette contradiction en cessant d'afficher
   MECH.arme.eveil ; on garde ici la même décision, et on la DIT plutôt que de
   la répéter en silence. Un chiffre affiché sans dire de quelle série il vient
   annoncerait au joueur un gain qu'il n'a pas. */
/* Le suffixe du parchemin fixe et le code `DST_*` qu'il désigne. SIX se lisent
   tout seuls (`STR` → `DST_STR`, `HP` → `DST_HP_MAX`…) ; les cinq autres sont
   les abréviations FRANÇAISES que le parchemin affiche dans son propre nom —
   « DCC » pour les dégâts critiques, « Incant » pour l'incantation, « Dépla »
   pour le déplacement, « SOINS », « ATQ ». C'est un relevé de LECTURE, et il se
   contrôle : dix des onze doivent retomber sur une statistique d'éveil connue
   de MECH.arme.eveil, et une ligne qui n'y retombe pas sort en écart. */
const DST_DU_PARCHEMIN = {
  STR: "DST_STR", STA: "DST_STA", DEX: "DST_DEX", INT: "DST_INT",
  DCC: "DST_CRITICAL_BONUS", INC: "DST_SPELL_RATE", DPL: "DST_SPEED",
  CC: "DST_HEAL_RATE", HP: "DST_HP_MAX", MP: "DST_MP_MAX", ATK: "DST_ATKPOWER",
};
function eveilFixe() {
  const lignes = new Map();
  for (const o of RELEVE.objets) {
    const k = /^II_SYS_SYS_SCR_FIX_AWAKE_(.+?)_R(\d)(_LINK)?$/.exec(o.cle ?? "");
    if (!k || k[3]) continue; // les versions liées sont le même parchemin
    const m = /([A-Za-zÉÈéèêà]+)\s*\+\s*(\d+)\s*(%?)/.exec(o.d ?? "");
    if (!m) continue;
    const code = DST_DU_PARCHEMIN[k[1]] ?? null;
    if (!code) { ecartes.push({ cle: o.cle, raison: `parchemin d'éveil fixe « ${k[1]} » : aucun code DST connu — la ligne ne sort pas` }); continue; }
    const e = lignes.get(k[1]) ?? {
      code,
      // Le mot du builder quand il existe (c'est celui que `evS` porte), sinon
      // celui du relevé des libellés. `parTirage` dit si la statistique fait
      // aussi partie de ce qu'un éveil AU HASARD peut donner.
      fr: frBuilder(code),
      parTirage: FR_BUILDER.has(code),
      pourcent: m[3] === "%",
    };
    e["R" + k[2]] = Number(m[2]);
    lignes.set(k[1], e);
  }
  return [...lignes.values()];
}
const fixes = eveilFixe();
/** R2 vaut-il partout le double de R1 ? COMPTÉ : écrire « le rang 2 double »
 *  serait faux dès qu'une seule ligne s'en écarte, et c'est le genre de
 *  raccourci qui fait acheter le mauvais parchemin. */
const fixesPasDouble = fixes.filter((x) => x.R1 && x.R2 && x.R2 !== x.R1 * 2);
const panEveil = panneau(/veil d.objet/i);

/* ── LES QUATRE PARCHEMINS DE STATISTIQUE ──────────────────────────────────
   Le curseur « Scroll » du builder (Force / Endurance / Dextérité /
   Intelligence, +0 à +4) correspond à quatre objets du client. Leur phrase
   porte DEUX faits : la plage du tirage, et le fait que le parchemin REMPLACE
   ce qui était posé. Le second reste même s'il est incomplet — il protège d'une
   erreur coûteuse : poser un second parchemin efface le premier. */
const SCROLLS_STAT = ["II_SYS_SYS_SCR_RANDOMSTR", "II_SYS_SYS_SCR_RANDOMSTA", "II_SYS_SYS_SCR_RANDOMDEX", "II_SYS_SYS_SCR_RANDOMINT"];
const scrolls = SCROLLS_STAT.map((c) => PAR_CLE.get(c)).filter(Boolean).map((o) => ({
  cle: o.cle, n: o.n,
  stat: /statistique (FOR|END|DEX|INT)/i.exec(o.d ?? "")?.[1] ?? "",
}));
const scrollPlage = /\+\d+\s*(?:à|a)\s*\+\d+/.exec(PAR_CLE.get(SCROLLS_STAT[0])?.d ?? "")?.[0] ?? "";
const scrollRemplace = /Ceci remplace[^.]*\./i.exec(PAR_CLE.get(SCROLLS_STAT[0])?.d ?? "")?.[0] ?? "";
/** Les quatre parchemins partagent-ils un seul dessin ? Compté : c'est la
 *  raison pour laquelle l'écran n'en montre qu'un. */
const scrollUnSeulDessin = new Set(SCROLLS_STAT.map((c) => PAR_CLE.get(c)?.ic).filter(Boolean)).size === 1;

/* ── LA RARÉTÉ : LA CHAÎNE QUE LE CLIENT ÉCRIT ─────────────────────────────
   Les quatre parchemins de raréfaction disent, chacun, SUR QUOI ils
   s'appliquent et CE QU'ILS DONNENT : « Appliqué sur une arme Rare … portant
   ainsi la rareté de l'arme à Epique ». La chaîne se lit donc dans le client,
   elle n'est pas déduite : sans rareté → Rare → Épique → Légendaire →
   Pré-mythique.

   ELLE S'ARRÊTE LÀ. Aucun objet du relevé ne mène au Mythique, et le mot
   MYTHIC n'apparaît dans TOUT le client qu'à un seul endroit — les valeurs de
   maîtrise d'arme. Le Pré-Mythique est bien le préalable du Légendaire au
   Pré-Mythique ; qu'il soit le préalable du MYTHIQUE, le client ne le dit
   nulle part. On écrit ce qui est écrit, et on nomme le trou. */
const TIERS = DATA.MECH.arme.rarete_tiers;
/** Le palier du BUILDER que désigne un mot du client. Le rapprochement se fait
 *  sans accents ni casse : la phrase du client écrit « Pré-mythique » là où le
 *  builder écrit « Pré-Mythique », et `cfg.tier` porte le second. Un mot qui ne
 *  retombe sur aucun palier ne rend rien plutôt que de choisir le voisin. */
const tierDuBuilder = (mot) => TIERS.find((t) => slug(t) === slug(mot)) ?? null;

const CHAINE_RARETE = ["II_SYS_SYS_SCR_RARITY_ADD_01", "II_SYS_SYS_SCR_RARITY_ADD_02", "II_SYS_SYS_SCR_RARITY_ADD_03", "II_SYS_SYS_SCR_RARITY_ADD_04"];
const chaineRarete = CHAINE_RARETE.map((c) => {
  const o = PAR_CLE.get(c);
  if (!o) { ecartes.push({ cle: c, raison: "parchemin de raréfaction absent du relevé" }); return null; }
  // La recherche se fait SANS ACCENTS mais la découpe sur la phrase D'ORIGINE :
  // chercher et couper sur le texte déaccentué rendait « sans rarete », et une
  // phrase du client amputée de ses accents se lit comme une faute de frappe.
  const d = (o.d ?? "").replace(/\s+/g, " ");
  const m = /appliqu[ée] sur une arme ([^,]+),/i.exec(sansAccent(d));
  // Le palier ATTEINT se lit dans le NOM du parchemin, entre parenthèses ; le
  // palier EXIGÉ dans sa phrase. Les deux sont ramenés au vocabulaire du
  // builder pour que l'écran puisse les comparer à `cfg.tier` sans traduire.
  const vers = tierDuBuilder(/\(([^)]+)\)/.exec(o.n)?.[1] ?? "");
  const motDepuis = m ? d.slice(m.index, m.index + m[0].length).replace(/^appliqu\S+ sur une arme /i, "").replace(/,$/, "").trim() : "";
  const depuis = tierDuBuilder(motDepuis);
  const l = { cle: o.cle, n: o.n, vers, f: rarete[vers ?? ""] ?? null };
  // « une arme sans rareté » ne nomme aucun palier : on garde la phrase du
  // client plutôt que de décréter que c'est « Commun ».
  if (depuis) l.depuis = depuis; else if (motDepuis) l.depuisTexte = motDepuis;
  return l;
}).filter(Boolean);
/** Les paliers que la chaîne n'atteint pas. Calculé : la liste vient de
 *  MECH.arme.rarete_tiers moins ce que les parchemins produisent. */
const atteintsParLaChaine = new Set(chaineRarete.map((c) => c.vers));
const rareteSansParchemin = TIERS.filter((t) => !atteintsParLaChaine.has(t));

/* LE PALIER FRANÇAIS ET LE CODE DU CLIENT, RANG PAR RANG.
   `cfg.tier` du builder porte « Rare » ; la maîtrise d'arme range ses valeurs
   sous « RARE ». Sans ce pont, l'écran écrirait la correspondance à la main.
   Elle se pose ici parce que les deux listes ont la même longueur et le même
   ordre — c'est le constat que `src/lib/statistiques/moteur.ts` fait déjà. Si
   l'une des deux change de longueur, le pont ne se construit pas et l'écart le
   dit, plutôt que de décaler six paliers en silence. */
let codesDeRarete = null;
if (TIERS.length === ORDRE_RARETE.length) {
  codesDeRarete = Object.fromEntries(TIERS.map((t, i) => [t, ORDRE_RARETE[i]]));
} else {
  ecartes.push({ raison: `MECH.arme.rarete_tiers porte ${TIERS.length} paliers et le client ${ORDRE_RARETE.length} codes — pas de correspondance` });
}
const relanceObjet = RELEVE.objets.find((o) => /Modificateur de raret/i.test(o.n ?? "") && (o.d ?? ""));

/* ── LE SERTISSAGE ─────────────────────────────────────────────────────────
   Le builder retient la STATISTIQUE de chaque logement, pas le palier atteint :
   il ne peut donc rien compter. Ce qui manquait à l'écran, c'est l'échelle
   elle-même — combien vaut un joyau selon sa famille et son rang — et les
   conditions que seul le panneau du jeu écrit.

   L'échelle est reprise telle quelle : `bonus-sources.json ▸ sertissage.ultimes`
   porte HUIT valeurs par gemme, dont le client n'en numérote que cinq. On ne
   tranche pas sur les trois dernières (voir l'en-tête de
   `scripts/extraire-bonus-sources.mjs`) : elles voyagent avec leur réserve. */
/* LE SECOND TÉMOIN, ET IL TOMBE JUSTE.
   `data.json ▸ GEMU` porte les neuf mêmes statistiques avec leur PLAFOND, dans
   le vocabulaire du builder. Le cinquième palier du Diamant, dans la table du
   client, DOIT valoir ce plafond — c'est le même nombre relevé par deux voies
   qui ne se sont pas concertées. On le vérifie rang par rang : là où ça tombe,
   on prend le mot du builder ; là où ça ne tombe pas, on garde le libellé du
   relevé et on compte l'écart au lieu de le taire.

   MAIS LE BUILDER A DEUX MOTS, ET UN SEUL EST MONTRÉ AU JOUEUR. `GEMU` (et
   `MECH.arme.sertissage`) gardent un libellé mort — « Melee Stealhp », l'identifiant
   anglais — que le builder lui-même remplace : la liste déroulante du joueur est
   bâtie sur `DIASTATS`, et `airbuilder.js` MIGRE les états enregistrés qui portent
   encore l'ancien mot. Écrire le mot de `GEMU` dans cette table servirait au joueur,
   dans la bulle, un nom que sa propre liste ne propose pas.
   LE MOT MONTRÉ EST DONC RETROUVÉ, PAS ÉCRIT : `GEMU` et `DIASTATS` portent les
   mêmes neuf statistiques ; quand un mot de `GEMU` manque à `DIASTATS`, et qu'il
   reste exactement un mot de `DIASTATS` qu'aucun rang de `GEMU` n'emploie, c'est
   celui-là. S'il en reste zéro ou plusieurs, on ne choisit pas : le libellé du
   relevé reprend la main et l'écart est compté. */
const GEMU = DATA.GEMU ?? [];
const DIASTATS = DATA.DIASTATS ?? [];
/** Les mots que la liste du joueur propose et qu'aucun rang de GEMU n'emploie. */
const motsOrphelins = DIASTATS.filter((s) => !GEMU.some((g) => g.fr === s));
/** Le mot du builder MONTRÉ AU JOUEUR pour le rang i de GEMU. */
function motMontre(i) {
  const mot = GEMU[i]?.fr;
  if (mot == null) return null;
  if (DIASTATS.includes(mot)) return mot;
  if (motsOrphelins.length === 1) return motsOrphelins[0];
  return null;
}
let sertissageConcordent = 0;
let sertissageRemplaces = 0;
const echelleSertissage = (BONUS.sertissage.ultimes ?? []).map((a, i) => {
  const dia = a.gemmes.find((g) => /diamant/i.test(g.gemme.n ?? ""));
  const plafond = GEMU[i]?.v;
  const concorde = dia != null && plafond != null && dia.paliers[4] === plafond;
  if (concorde) sertissageConcordent++;
  const montre = concorde ? motMontre(i) : null;
  if (montre != null && montre !== GEMU[i].fr) {
    sertissageRemplaces++;
    ecartes.push({ cle: a.code, raison: `GEMU écrit « ${GEMU[i].fr} », que la liste du joueur (DIASTATS) ne propose pas — le mot montré est « ${montre} »` });
  }
  return {
    code: a.code,
    fr: montre ?? (concorde ? GEMU[i].fr : fr(a.code)),
    gemmes: a.gemmes.map((g) => ({ n: g.gemme.n, p: g.paliers })),
  };
});
const sertissage = {
  echelle: echelleSertissage,
  concordent: sertissageConcordent,
  comparees: Math.min(echelleSertissage.length, GEMU.length),
  // Combien de libellés de GEMU ont dû être remplacés par le mot que la liste
  // du joueur propose vraiment. Compté : si data.json se remet d'accord avec
  // lui-même un jour, ce nombre tombe à zéro tout seul.
  libellesRemplaces: sertissageRemplaces,
  plafonds: "data.json ▸ MECH.arme.sertissage (le dernier palier numéroté du Diamant, et rien d'autre)",
  paliersParGemme: BONUS.sertissage.paliersParGemme,
  paliersNumerotes: BONUS.sertissage.paliersNumerotesParLeClient,
  reserve: BONUS.sertissage.paliersNonNumerotes,
  tranches: (BONUS.sertissage.tranchesDeNiveau ?? []).map((t) => ({ n: t.gemme.n, de: t.niveauMin, a: t.niveauMax })),
  condition: phrase(panneau(/Sertir une arme ultime/i), /Améliorez/i),
  auHasard: phrase(panneau(/Sertir une arme ultime/i), /au hasard|nouveau joyau/i),
  echec: phrase(panneau(/Sertir une arme ultime/i), /échoue/i),
  // La phrase retenue est l'AVERTISSEMENT, pas l'annonce : « une gemme va être
  // enlevée » ne change pas le geste, « impossible d'annuler » si.
  retrait: phrase(panneau(/Retirer une gemme \(arme ultime\)/i), /impossible/i),
};

/* ── LE PERÇAGE ────────────────────────────────────────────────────────────
   Les 115 cartes du client ne sont PAS reprises : le builder calcule déjà le
   perçage dans son total, sur sa propre table (`PIERCECARD`), et substituer une
   seconde table ferait bouger un total qui ne doit pas bouger. Ce qui entre ici
   est ce que le builder ne sait pas : la chance d'ouvrir les derniers
   logements, et ce que coûte un retrait.

   Le client donne des probabilités de 11 à 20 alors que son propre plafond est
   à 12 : les logements au-delà ne s'ouvrent sur aucune arme. On COMPTE l'écart
   au lieu de recopier des lignes mortes. */
const proba = BONUS.percage.probabilites ?? [];
const plafondPercage = Math.max(...plafondsPercage, 0);
const percage = {
  plafondNomme: plafondPercage,
  armesAuPlafond: P12.size,
  ouverture: proba.filter((p) => p.level <= plafondPercage).map((p) => [p.level, p.probability]),
  /* Le client chiffre la réussite jusqu'au logement 20 alors que son propre
     plafond est à 12 : ces lignes-là ne s'ouvrent sur aucune arme. On les
     COMPTE au lieu de les recopier. */
  lignesHorsPlafond: proba.filter((p) => p.level > plafondPercage).length,
  retrait: phrase(panneau(/piercing/i), /Attention/i),
  cout: phrase(panneau(/piercing/i), /co[ûu]t/i),
  dansLeTotal: true,
  commentComptee: "Le builder compte le perçage sur sa propre table PIERCECARD (relevée à la main dans le builder). Les 115 cartes du client sont dans public/wiki/bonus-sources.json ▸ percage.cartes — table de CONTRÔLE, à ne pas substituer sans remesurer le total.",
};

/* ── L'AMÉLIORATION ────────────────────────────────────────────────────────
   Le GAIN par palier n'existe nulle part : `propEnchant.inc` ne donne que des
   coefficients, sans dire ce qu'ils multiplient. Ce fait voyage avec la table
   pour que l'écran écrive « non compté » au lieu de laisser croire à un oubli.
   Ce qui EST chiffré : la chance de réussir chaque palier d'Artefact. */
const amelioration = {
  reussite: (BONUS.artefact.amelioration?.probabilities ?? []).map((p) => [p.level, p.probability]),
  pierre: BONUS.artefact.amelioration?.upgradeItemId ?? "",
  protection: BONUS.artefact.amelioration?.protectItemId ?? "",
  suppression: phrase(panneau(/Supprimer un enchantement/i), /co[ûu]tera|Penyas/i),
  dansLeTotal: false,
  nonCalculable: DATA.MECH.arme.nonCalculable,
};

/* ── L'ESPRIT (la « fée » du builder) ──────────────────────────────────────
   Le builder pose un curseur de niveau 0→50 sur une pièce dont le relevé porte
   un tableau de bonus VIDE : le niveau ne produit donc rien à l'écran. Le
   client, lui, donne des paliers (niveaux 10, 20, 30, 40, 50), chacun avec son
   effet, et le COÛT en poudre féerique de chaque niveau. C'est le trou le plus
   net du builder, et il se comble sans toucher au total. */
const espritsDuBuilder = new Set((DATA.ITEMS.fairy ?? []).map((f) => (f.n ?? "").split(",")[0].trim()));
const esprits = (COLL.anges ?? [])
  .filter((a) => a.montable && espritsDuBuilder.has(a.n))
  .map((a) => ({ n: a.n, cumul: a.cumul, paliers: (a.paliers ?? []).map((p) => [p.niv, p.buff]) }));
/** Le coût par niveau est le même pour tous les esprits montables : on le pose
 *  une fois. COMPTÉ, jamais supposé — si un esprit s'en écarte, la liste porte
 *  deux entrées et le champ disparaît. */
const coutsEsprit = [...new Set((COLL.anges ?? []).filter((a) => a.montable).map((a) => (a.couts ?? []).join(",")))];

const faits = {
  lire: "faits.armes est le JOINT entre l'id d'une arme du catalogue (data.json ▸ ITEMS.weapon) et tout ce qui est indexé par clé ou par type. Chaque bloc porte `dansLeTotal` : false = le total du build ne compte pas cette mécanique, l'écran doit écrire « non compté ». Les chemins écrits en clair (MECH.arme.…) renvoient à data.json, déjà en mémoire — ils ne sont pas recopiés ici.",
  source: "public/wiki/bonus-sources.json (client) · public/wiki/objets-fiches.json + objets-stats.json (clés, types, phrases) · public/wiki/crafts.json ▸ ateliers (les panneaux du jeu) · public/wiki/collections.json (esprits) · src/data/statistiques-objets.json (libellés des codes DST)",

  armes,
  armesSansCle: {
    liste: armesSansCle,
    raison: "Le relevé du client (objets-stats.json) ne porte pas ces armes : le builder leur a donné un identifiant à lui. Sans clé, ni maîtrise, ni vivier de rareté, ni ascension. À dire « non renseigné », jamais à combler par l'arme voisine.",
  },

  /* ── CE QUI N'EST PAS CALCULABLE, ET QUI DOIT ÊTRE DIT ────────────────────
     Trois valeurs manquent au client, et leur absence se lit comme un oubli du
     builder si personne ne l'écrit. Elles voyagent donc avec la table. Les
     phrases longues du client ne sont PAS recopiées — elles sont déjà dans
     data.json, en mémoire au moment où l'écran en a besoin ; on nomme le fait
     et on donne le chemin. Le troisième se COMPTE, et il est compté. */
  nonCalculable: {
    upgradeArme: { quoi: "Le gain d'un palier d'amélioration d'arme ou d'armure n'existe pas dans le client : propEnchant.inc porte des coefficients dont le multiplicande n'est écrit nulle part.", ou: "data.json ▸ MECH.arme.nonCalculable et MECH.armure.upgrade.nonCalculable" },
    upgradeCostume: { quoi: "Le client ne documente aucun gain d'amélioration pour le costume : ni table de paliers, ni coefficient.", ou: "data.json ▸ MECH.mode.upgrade.nonCalculable" },
    armuresSansBonusPropre: {
      objets: ["helmet", "suit", "gauntlet", "boots"].reduce((n, s) => n + (DATA.ITEMS[s] ?? []).length, 0),
      avecBonus: ["helmet", "suit", "gauntlet", "boots"].reduce((n, s) => n + (DATA.ITEMS[s] ?? []).filter((o) => (o.b ?? []).length).length, 0),
      quoi: "Aucune armure du catalogue ne porte de bonus propre : sa valeur est dans sa PANOPLIE, son upgrade, son perçage et son éveil. Un total à zéro sur un stuff d'armure n'est donc pas une erreur d'affichage.",
      ou: "data.json ▸ MECH.armure.bonusPropre",
    },
  },

  /* L'ASCENSION — ET UN ACCORD QUI SE DÉMONTRE.
     Le builder décide qu'une arme peut devenir Artefact avec une liste écrite à
     la main (`['Éternel','Yggdrasil']`). Le client, lui, le dit deux fois et
     sans se concerter : `artefact.etoiles` nomme les armes qui ont des
     parchemins d'ascension, et `percage.plafond` celles qui montent à 12
     logements. Les trois listes tombent l'une sur l'autre — on le COMPTE, et si
     l'accord se casse un jour, ces nombres cessent d'être égaux. */
  ascension: {
    declareesParLeClient: ascParCle.size,
    auPlafondDePercage: P12.size,
    armesDuCatalogue: Object.values(armes).filter((a) => a.asc).length,
    parType: Object.values(armes).filter((a) => a.asc?.[1] === "type").length,
    sansParchemin: [...P12].filter((c) => !ascParCle.has(c)),
    dit: "La famille d'ascension se lit dans le NOM du parchemin que le client attache à l'arme, pas dans le premier mot du nom français de la pièce. C'est ce qui rend sa famille à l'« Arbalète en Yggdrasil Purifié », qui ne commence par aucun nom de famille.",
    dansLeTotal: false,
    pourquoiPas: "Le client ne chiffre aucun gain d'ascension : les parchemins ne portent que leur rang.",
  },

  maitrise: {
    /* Deux lignes ne s'additionnent JAMAIS : la nommée remplace celle du type.
       `faits.armes[].mai` a déjà tranché — ce champ n'est là que pour que
       l'écran puisse écrire la règle. */
    regle: "remplacement",
    plate: maitrisePlate,
    allumeA,
    valeurs: valeursDeMaitrise,
    dit: `La rareté ALLUME la ligne, elle ne la fait pas monter : sur les ${toutesLesLignes.length} lignes du client, ${allumeA.length === 1 ? `toutes s'allument à ${allumeA[0]}` : `elles s'allument à ${allumeA.join(" ou ")}`} et gardent ensuite la même valeur jusqu'au dernier palier.`,
    parType: maiParType,
    parObjet: maiParObjet,
    /* LE NIVEAU DE MAÎTRISE (curseur 0→100 du builder) NE CHANGE RIEN À LA
       VALEUR. Les treize paliers du client ne portent QUE de l'expérience à
       gagner ; aucune valeur de statistique n'y est attachée. Le coût en
       expérience de chaque palier n'entre pas dans cette table : c'est de
       l'expérience, elle ne va pas à l'écran du builder — et l'écran qui la
       montre déjà (`/builder/mecaniques`) la lit dans collections.json. */
    niveau: {
      max: COLL.maitrise?.niveauMax ?? null,
      paliers: (BONUS.maitriseArme.paliers ?? []).length,
      sansEffetSurLaValeur: "Les paliers ne portent que de l'expérience à gagner : aucune valeur de statistique n'y est attachée. Le niveau de maîtrise est un compteur de progression, pas un facteur du total.",
      detail: "public/wiki/collections.json ▸ maitrise",
    },
    dansLeTotal: false,
  },

  rarete: {
    tiers: "data.json ▸ MECH.arme.rarete_tiers",
    lignesTirees: "data.json ▸ MECH.arme.rarete_lignes",
    vivierAffiche: "data.json ▸ MECH.arme.rarete_pool",
    chaine: chaineRarete,
    sansParchemin: rareteSansParchemin,
    codes: codesDeRarete,
    viviers: Object.fromEntries((BONUS.rarete.viviers ?? []).map((v) => [v.id, {
      lv: v.minLevel, b: (v.availableBonus ?? []).map((b) => [fr(b.id), b.minPercent, b.maxPercent]),
    }])),
    /* SEULS LES VIVIERS QUE LE CATALOGUE ATTEINT. Le client en donne 32 par
       objet ; le catalogue du builder n'en touche qu'une poignée, et les autres
       seraient du poids payé par chaque ouverture du panneau pour des armes que
       personne ne peut équiper ici. Le compte de ce qui reste dehors est écrit
       à côté plutôt que tu. */
    viviersParObjet: Object.fromEntries(
      (BONUS.rarete.parObjet ?? []).filter((v) => viviersEmployes.has(v.id)).map((v) => [v.id, {
        b: (v.availableBonus ?? []).map((b) => [fr(b.id), b.minPercent, b.maxPercent]),
      }]),
    ),
    viviersParObjetHorsCatalogue: (BONUS.rarete.parObjet ?? []).length - viviersEmployes.size,
    /* LES RELANCES : le nombre par défaut, et les exceptions QUE LE CATALOGUE
       PEUT RENCONTRER. Les autres armes du client ne se composent pas ici. */
    relances: {
      parDefaut: BONUS.rarete.relances?.default ?? null,
      exceptions: (BONUS.rarete.relances?.byItemId ?? [])
        .map((e) => ({ n: e.amount, armes: (e.id ?? []).filter((c) => clesDuCatalogue.has(c)) }))
        .filter((e) => e.armes.length),
      exceptionsHorsCatalogue: (BONUS.rarete.relances?.byItemId ?? [])
        .reduce((n, e) => n + (e.id ?? []).filter((c) => !clesDuCatalogue.has(c)).length, 0),
    },
    relanceObjet: relanceObjet ? { cle: relanceObjet.cle, n: relanceObjet.n, d: relanceObjet.d } : null,
    unite: "L'unité de min/max n'est PAS dite par le client : le champ s'appelle « percent » et MECH.arme.rarete_pool recopie les mêmes bornes sans signe. Rendre l'intervalle, pas un pourcentage.",
    dansLeTotal: false,
    pourquoiPas: "Les lignes de rareté sont TIRÉES AU SORT — nombre de lignes et valeur. C'est un intervalle, pas un nombre : il ne s'ajoute à aucun total.",
  },

  eveil: {
    lignes: ["R1", "R2"],
    tirage: {
      // `parchemin.d` porte déjà l'avertissement du client (« les propriétés
      // peuvent être négatives ») : il n'est pas répété ici.
      parchemin: eveil,
      plafonds: "data.json ▸ MECH.arme.eveil",
      cout: phrase(panEveil, /penya/i),
    },
    fixe: {
      lignes: fixes,
      r2EstLeDouble: fixesPasDouble.length === 0,
      exceptions: fixesPasDouble.map((x) => x.code),
      /* Les huit statistiques d'éveil que le builder propose (`data.json ▸
         EVSTATS`) ont-elles TOUTES une valeur fixe ? COMPTÉ : si une seule n'en
         avait pas, l'écran devrait laisser sa case vide au lieu d'annoncer une
         règle générale. */
      couvreLeBuilder: (DATA.EVSTATS ?? []).filter((s) => fixes.some((x) => x.fr === s)).length,
      statsDuBuilder: (DATA.EVSTATS ?? []).length,
    },
    contradiction: "Les deux séries ne donnent pas les mêmes nombres — le plafond du tirage est plus bas que le gain du parchemin fixe (Force : 15 contre 30 puis 60). src/components/mecaniques/releves.ts a cessé d'afficher MECH.arme.eveil pour cette raison. Un chiffre posé sur la bulle doit donc DIRE de quelle série il vient ; sans cette mention, il annonce au joueur un gain qu'il n'a pas.",
    ceQueLeBuilderRetient: "La ligne (evL) et la statistique (evS), jamais la valeur ni la voie d'obtention. Tant que le builder ne demande pas laquelle des deux voies a été employée, la valeur du joueur reste inconnue.",
    dansLeTotal: false,
  },

  scroll: {
    objets: scrolls,
    plage: scrollPlage,
    remplace: scrollRemplace,
    unSeulDessin: scrollUnSeulDessin,
    dansLeTotal: false,
    pourquoiPas: "Le builder retient la statistique et le niveau ; le client ne donne pas le gain par niveau de scroll.",
  },

  element: {
    max: DATA.MECH.arme.bonus_element,
    changement: phrase(panneau(/Changement d.élément/i), /conserv/i),
    dansLeTotal: false,
    pourquoiPas: "Le bonus d'élément est un plafond dans MECH.arme, pas une valeur par palier.",
  },

  percage,
  sertissage: { ...sertissage, dansLeTotal: false, pourquoiPas: "Le builder retient la statistique de chaque logement, pas le palier atteint : l'échelle ci-dessus dit ce que vaut un joyau, elle ne dit pas lequel est posé." },
  amelioration,

  panoplie: {
    renvoi: "data.json ▸ PANO (les 64 signatures du builder) et MECH.armure.panoplies",
    seuils: "Chaque ligne porte SON seuil de pièces. Les seuils atteints s'appliquent, les autres non.",
    negatives: DATA.MECH.armure.panoplies?.avertissement ?? "",
    dansLeTotal: true,
    pasRecopie: `Les ${(BONUS.panoplies ?? []).length} panoplies du client sont dans public/wiki/bonus-sources.json ▸ panoplies. Elles ne sont pas reprises ici : le builder porte déjà les siennes dans data.json ▸ PANO, et une seconde table ferait deux totaux.`,
  },

  esprit: {
    max: DATA.FAIRYMAX,
    poudre: COLL.poudre?.n ?? "",
    /* L'ICÔNE DE LA MONNAIE DE MONTÉE, et pourquoi elle est ici plutôt que dans
       data.json : le builder affiche désormais le coût du palier suivant, et un
       nombre nu ne dit pas en quoi il se paie. Le fichier est celui que la page
       Craft et Collections sert déjà (`/jeu/icones/…`) — le même dessin sous le
       même nom, jamais une copie renommée. data.json est injecté en ligne dans
       la page : on n'y ajoute pas un octet, ce fichier-ci est chargé en différé. */
    poudreIc: COLL.poudre?.ic ?? "",
    couts: coutsEsprit.length === 1 ? (COLL.anges ?? []).find((a) => a.montable)?.couts ?? null : null,
    memeCoutPourTous: coutsEsprit.length === 1,
    esprits,
    dansLeTotal: false,
    pourquoiPas: "Les pièces d'esprit du catalogue portent un tableau de bonus vide : le niveau ne produit rien dans le total. Les paliers ci-dessus sont ceux du client.",
  },

  /* ── CE QUI N'EST PAS REPRIS, ET OÙ ÇA VIT ───────────────────────────────
     Le poids de ce fichier est payé à chaque ouverture du builder. Trois tables
     du client sont volumineuses et déjà servies ailleurs : les recopier ici
     coûterait sans rien apprendre au panneau, et ferait surtout DEUX tables
     pour une même mécanique — c'est comme ça qu'un total se met à diverger. */
  renvois: {
    panoplies: `public/wiki/bonus-sources.json ▸ panoplies (${(BONUS.panoplies ?? []).length} entrées) — le builder porte les siennes dans data.json ▸ PANO`,
    cartesDePercage: `public/wiki/bonus-sources.json ▸ percage.cartes (${(BONUS.percage.cartes ?? []).length} cartes) — le builder compte sur sa table PIERCECARD`,
    paliersDeBijoux: `public/airbuilder/paliers.json — ${DATA.MECH.bijou.paliers.paliers} paliers sur ${DATA.MECH.bijou.paliers.bijoux} bijoux, chargé par le builder lui-même`,
    maitriseParPalier: "public/wiki/collections.json ▸ maitrise — les treize paliers et leur coût en expérience",
    concepts: "public/airbuilder/data.json ▸ MECH — déjà injecté en ligne, jamais recopié ici",
  },

  /* CE QUI EST OFFERT PAR LE PANNEAU ET N'ENTRE DANS AUCUN TOTAL. Compté sur
     les blocs ci-dessus plutôt qu'écrit : un réglage ajouté au builder sans son
     bloc ne peut pas se glisser dans cette liste par erreur. */
  nonCompte: null,
};
faits.nonCompte = Object.entries(faits)
  .filter(([, v]) => v && typeof v === "object" && v.dansLeTotal === false)
  .map(([k]) => k);

const table = {
  genere: new Date().toISOString().slice(0, 10),
  quoi: "Les dessins du jeu ET les faits des mécaniques, pour l'AirBuilder. Chargée à part de data.json (injecté en ligne) : ce fichier n'est payé qu'après le premier affichage.",
  regle: "On part de la CLÉ de l'objet dans le relevé du client, jamais du nom du dessin : deux fichiers de public/jeu/mecaniques/ portent le nom d'un autre objet. Ce qui n'a pas de dessin n'a pas de ligne.",
  source: "public/wiki/objets-fiches.json (clés, noms et phrases du client) · public/jeu/icones/ et public/jeu/mecaniques/ (dessins) · public/airbuilder/data.json ▸ MECH (les concepts)",
  rarete, element, upgrade, artefact, ascension, runeArme, holo, eveil,
  faits,
  ecartes,
};

fs.writeFileSync(SORTIE, JSON.stringify(table), "utf8");
const n = (o) => Object.keys(o ?? {}).length;
const tousLesDessins = new Set();
JSON.stringify(table).replace(/"(\/jeu\/[^"]+)"/g, (_, u) => tousLesDessins.add(u));
const poids = (v) => Buffer.byteLength(JSON.stringify(v), "utf8");
console.log(`mecaniques.json écrit — ${fs.statSync(SORTIE).size} octets`);
console.log(`  raretés ${n(rarete)} · éléments ${n(element)} · échelles ${n(upgrade)} · runes d'arme ${n(runeArme)}`);
console.log(`  familles d'ascension ${n(ascension)} (${Object.values(ascension).flat().filter(Boolean).length} dessins)`);
console.log(`  dessins distincts : ${tousLesDessins.size} — dont ${[...tousLesDessins].filter((u) => u.startsWith("/jeu/mecaniques/")).length} de /jeu/mecaniques/`);
console.log(`  FAITS — ${poids(faits)} octets`);
for (const [k, v] of Object.entries(faits)) console.log(`    ${String(poids(v)).padStart(6)} o  ${k}`);
console.log(`  armes jointes : ${n(armes)} / ${(DATA.ITEMS.weapon ?? []).length}`
  + ` · ascension ${Object.values(armes).filter((a) => a.asc).length}`
  + ` · maîtrise ${Object.values(armes).filter((a) => a.mai).length}`
  + ` (dont ${Object.values(armes).filter((a) => a.mai?.[0] === "o").length} par une ligne NOMMÉE, ${Object.values(armes).filter((a) => a.mai?.length === 3).length} avec une ligne de type écartée)`
  + ` · perçage 12 : ${Object.values(armes).filter((a) => a.p12).length}`);
console.log(`  maîtrise : ${toutesLesLignes.length} lignes (${n(maiParType)} par type, ${n(maiParObjet)} par objet)`
  + ` · plates ${maitrisePlate ? "OUI" : "NON"} · s'allument à ${allumeA.join("/")} · valeurs ${valeursDeMaitrise.join(" et ")}`);
console.log(`  rareté : chaîne de ${chaineRarete.length} parchemins · sans parchemin : ${rareteSansParchemin.join(", ") || "aucun"}`);
console.log(`  éveil fixe : ${fixes.length} lignes · R2 = 2 × R1 ${fixesPasDouble.length === 0 ? "partout" : "sauf " + fixesPasDouble.map((x) => x.code).join(", ")}`);
console.log(`  écartés : ${ecartes.length}`);
for (const e of ecartes) console.log(`    · ${e.cle ?? e.fichier ?? "?"} — ${e.raison}`);
