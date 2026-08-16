/**
 * GÉNÈRE public/airbuilder/mecaniques.json — la table concept → dessin du jeu
 * pour l'AirBuilder.
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

const table = {
  genere: new Date().toISOString().slice(0, 10),
  quoi: "Les dessins du jeu pour les mécaniques de l'AirBuilder. Chargée à part de data.json (injecté en ligne) : ce fichier n'est payé qu'après le premier affichage.",
  regle: "On part de la CLÉ de l'objet dans le relevé du client, jamais du nom du dessin : deux fichiers de public/jeu/mecaniques/ portent le nom d'un autre objet. Ce qui n'a pas de dessin n'a pas de ligne.",
  source: "public/wiki/objets-fiches.json (clés, noms et phrases du client) · public/jeu/icones/ et public/jeu/mecaniques/ (dessins) · public/airbuilder/data.json ▸ MECH (les concepts)",
  rarete, element, upgrade, artefact, ascension, runeArme, holo, eveil,
  ecartes,
};

fs.writeFileSync(SORTIE, JSON.stringify(table), "utf8");
const n = (o) => Object.keys(o ?? {}).length;
const tousLesDessins = new Set();
JSON.stringify(table).replace(/"(\/jeu\/[^"]+)"/g, (_, u) => tousLesDessins.add(u));
console.log(`mecaniques.json écrit — ${fs.statSync(SORTIE).size} octets`);
console.log(`  raretés ${n(rarete)} · éléments ${n(element)} · échelles ${n(upgrade)} · runes d'arme ${n(runeArme)}`);
console.log(`  familles d'ascension ${n(ascension)} (${Object.values(ascension).flat().filter(Boolean).length} dessins)`);
console.log(`  dessins distincts : ${tousLesDessins.size} — dont ${[...tousLesDessins].filter((u) => u.startsWith("/jeu/mecaniques/")).length} de /jeu/mecaniques/`);
console.log(`  écartés : ${ecartes.length}`);
for (const e of ecartes) console.log(`    · ${e.cle ?? e.fichier ?? "?"} — ${e.raison}`);
