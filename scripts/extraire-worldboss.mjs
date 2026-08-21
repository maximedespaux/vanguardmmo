/**
 * EXTRAIT LE RELEVÉ WORLD BOSS depuis public/wiki/monstres.json.
 *
 *   node scripts/extraire-worldboss.mjs   →  src/data/worldboss-releve.json
 *
 * Pourquoi un fichier à part alors que monstres.json contient déjà tout : ce dernier
 * pèse 612 Ko et se lit avec `fs` côté serveur (components/monstres/catalogue.ts).
 * Le bloc world boss est un composant CLIENT — importer 612 Ko dans le paquet du
 * navigateur pour seize lignes serait absurde. On en sort 14 Ko, comme
 * src/data/chambres-adversaires.json le fait pour les Chambres Secrètes.
 *
 * ── LES TROIS CRITÈRES, ET POURQUOI CEUX-LÀ ───────────────────────────────────
 * Il n'existe AUCUN rang « world boss » dans Airborn : les 1 124 monstres se
 * rangent en sept rangs (faible, normal, capitaine, demi-boss, boss, super,
 * materiau) et pas un ne porte ce mot. On ne peut donc pas répondre par un filtre de
 * rang. Ce que les fichiers écrivent, en revanche :
 *
 *   wb       un SEGMENT de l'identifiant client vaut exactement « WB »
 *            (MI_BEHEMOTH_WB, MI_WB_IPULI_1…). WB = World Boss.
 *            ⚠ On découpe sur les tirets bas au lieu de chercher la sous-chaîne :
 *            MI_COLOHOWBOW contient « WB » au milieu d'un mot et n'a rien à voir.
 *   bigboss  le nom d'affichage finit par « (Big Boss) ».
 *            ⚠ Le piège de MI_COLOHOWBOW a un jumeau à l'envers : ici le filtre est
 *            trop SERRÉ. « Abomination mécanique (BigBoss) » porte le même suffixe
 *            sans l'espace, et endsWith("(Big Boss)") le laisse tomber sans que
 *            personne ne le voie. On extrait donc ces variantes À PART (clé
 *            `variantes`) pour que l'écran puisse dire qu'elles existent.
 *   guilde   l'identifiant commence par MI_GUILDBOSS_ — ceux-là ne sont PAS des
 *            world boss, ils sont extraits pour qu'on ne les compte pas deux fois.
 *
 * Le critère est recopié DANS le fichier produit, et l'écran l'affiche : quelqu'un
 * qui lit la page sait sur quoi la liste est bâtie.
 *
 * Aucun compteur n'est écrit ici : les phrases de l'écran se recalculent sur les
 * tableaux. Un chiffre saisi à la main devient faux à la prochaine fouille du client.
 */
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const SRC = path.join(RACINE, "public", "wiki", "monstres.json");
const OUT = path.join(RACINE, "src", "data", "worldboss-releve.json");

const d = JSON.parse(fs.readFileSync(SRC, "utf8"));
const M = d.monstres;

const CHAMPS = [
  "id", "nom", "niv", "rang", "pv", "pm", "atkMin", "atkMax", "def", "resMag",
  "prec", "esq", "vitAtk", "delai", "elem", "elemNiv", "res", "agro", "aggro",
  "vole", "penya", "exp", "madrigal", "zone", "maison", "vies", "pvEff", "groupe",
];

function reduire(x) {
  const o = {};
  for (const c of CHAMPS) o[c] = c === "vies" ? (x.vies || 1) : (x[c] ?? null);
  // Points d'apparition posés dans les fichiers de carte. Zéro = le client ne le
  // place NULLE PART, donc on ne peut rien dire de l'endroit où il sort — et c'est
  // le cas des douze. La seule information d'endroit est celle que le staff écrit.
  o.apparitions = (x.lieux ?? []).reduce((s, l) => s + (l.n ?? 0), 0);
  o.zones = (x.lieux ?? []).map((l) => l.z);
  o.butin = (x.butin ?? []).length + (x.butinClient ?? []).length;
  return o;
}

const parVie = (a, b) => b.pvEff - a.pvEff;
const wb = M.filter((x) => x.id.split("_").includes("WB")).sort(parVie);
const bigboss = M.filter((x) => x.nom.trim().endsWith("(Big Boss)")).sort(parVie);
const guilde = M.filter((x) => x.id.startsWith("MI_GUILDBOSS_")).sort(parVie);

// La MÊME marque, écrite sans l'espace. Sans ce relevé, la page affirmait « ce sont
// les seuls du catalogue à le porter » alors qu'un septième monstre le porte aussi.
// Ils sont gardés à part et non comptés avec les autres, parce qu'ils ne partagent
// aucun de leurs chiffres : le suffixe est une étiquette, pas un gabarit.
const sansEspace = (s) => s.toLowerCase().replace(/\s+/g, "");
const variantes = M
  .filter((x) => sansEspace(x.nom).endsWith("(bigboss)") && !bigboss.includes(x))
  .sort(parVie);

// Les rangs du plus faible au plus fort, dans le même ordre que TON_RANG de
// components/monstres/vocabulaire.ts. Un tri alphabétique donnait « boss, capitaine,
// demi-boss, faible… » : la liste se lisait comme un classement, et il était faux.
const ORDRE_RANGS = ["faible", "normal", "capitaine", "demi-boss", "boss", "super", "materiau"];
const presents = new Set(M.map((x) => x.rang).filter(Boolean));

const paquet = {
  genere: "extrait de public/wiki/monstres.json (fouille du client Airborn d'octobre 2025)",
  catalogue: d.total,
  rangs: ORDRE_RANGS.filter((r) => presents.has(r)),
  // Combien de monstres portent VRAIMENT un rang : deux du catalogue n'en ont
  // aucun, et « les 1 124 se rangent en sept rangs » était donc faux pour deux.
  ranges: M.filter((x) => x.rang).length,
  localises: d.compteurs.localises,
  familles: [
    {
      clef: "wb",
      titre: "Ceux que le client marque « WB »",
      critere: "un segment de l'identifiant client est exactement WB — MI_BEHEMOTH_WB, MI_WB_IPULI_1…",
      note: "WB est l'abréviation de World Boss. C'est la seule marque « world boss » écrite dans les fichiers du jeu.",
      monstres: wb.map(reduire),
    },
    {
      clef: "bigboss",
      titre: "Ceux que le client nomme « (Big Boss) »",
      critere: "le nom d'affichage finit par « (Big Boss) »",
      note: "Le suffixe est dans le nom lu à l'écran, pas dans l'identifiant — et l'espace compte : la même marque écrite « (BigBoss) » est relevée à part, sous le tableau.",
      monstres: bigboss.map(reduire),
      variantes: variantes.map(reduire),
    },
  ],
  confusions: [
    {
      clef: "guilde",
      titre: "Les boss de Guild Siege",
      critere: "identifiant client commençant par MI_GUILDBOSS_",
      note: "Ils appartiennent au siège de guilde, pas à un passage de world boss. Ils sont ici pour qu'on ne les compte pas deux fois.",
      monstres: guilde.map(reduire),
    },
  ],
  // Trois objets du jeu portent le nom du world boss — la meilleure confirmation
  // qu'on ait que ce contenu existe et qu'il est à part. Sources :
  // src/data/objets-jeu.json (nom -> icône du client) et src/data/icones-objets.json
  // pour le badge, tel que la page Prestige le nomme déjà.
  recompenses: [
    {
      nom: "Coffre du Regard Scellé",
      icone: "/jeu/icones/itm_box_worldboss.webp",
      source: "src/data/objets-jeu.json — icone itm_box_worldboss",
      quoi: "Le coffre. Son icone du client s'appelle littéralement itm_box_worldboss, et « Regard » est le mot du nom d'Elun.",
    },
    {
      nom: "Badge World Boss prestigieux",
      icone: "/assets/items/craft/badges/badgeworldboss.png",
      source: "src/data/icones-objets.json, et src/data/prestige.ts pour les paliers",
      quoi: "Le badge exigé par le prestige. Le client l'écrit « Badge Worldboss Préstigieux ».",
    },
    {
      nom: "Buff du World Boss Préstigieux",
      icone: "/jeu/icones/itm_sklking03.webp",
      source: "src/data/objets-jeu.json — icone itm_sklking03",
      quoi: "Un buff à son nom. Ce qu'il donne n'est pas dans le client.",
    },
  ],
};

fs.writeFileSync(OUT, JSON.stringify(paquet, null, 1), "utf8");
console.log(`écrit ${path.relative(RACINE, OUT)}`);
console.log(`  WB ${wb.length} · (Big Boss) ${bigboss.length} (+${variantes.length} sans espace) · Guild Siege ${guilde.length}`);
for (const f of [...paquet.familles, ...paquet.confusions]) {
  for (const m of [...f.monstres, ...(f.variantes ?? [])]) {
    console.log(`  ${f.clef.padEnd(8)} ${m.id.padEnd(22)} ${m.nom.slice(0, 36).padEnd(36)} PV a sortir ${m.pvEff.toLocaleString("fr-FR").padStart(16)} · ${m.vies} vie(s) · ${m.apparitions} apparition(s)`);
  }
}
