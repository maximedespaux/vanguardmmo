/**
 * COMPLÉTER LES DONNÉES DE L'AIRBUILDER À PARTIR DES RELEVÉS DU CLIENT.
 *
 * Le builder est né d'un relevé fait à la main : 390 objets, des libellés de bonus
 * tapés au clavier, et une seule famille de mécanique déclarée (`MECH.arme`). Les
 * relevés automatiques du client existent depuis, et ils sont d'accord avec lui sur
 * les VALEURS — mais pas sur les NOMS, et il leur manque des lignes entières.
 *
 * Ce script ne devine rien. Chaque nombre qu'il écrit vient d'un fichier nommé, et
 * chaque bloc qu'il pose porte le champ `source` qui dit lequel.
 *
 * IL LIT
 *   public/wiki/objets-stats.json        5 075 objets du client, bonus en codes DST_*
 *   src/data/statistiques-objets.json    le dictionnaire DST_* → libellé français
 *   public/wiki/paliers-accessoires.json 75 bijoux, 1 635 paliers, les plafonds
 *   public/wiki/bonus-sources.json       les panoplies (bonus par nombre de pièces)
 *   public/airbuilder/data.json          l'état courant (catalogue et layout : à garder)
 *
 * IL ÉCRIT
 *   public/airbuilder/data.json          MECH.bijou/armure/mode · PANO · SYNO · bonus corrigés
 *   public/airbuilder/paliers.json       la table des paliers de bijou, libellés en français
 *
 * POURQUOI DEUX FICHIERS. data.json part INLINE dans la page (le moteur le lit dans
 * <script id="DATA">) : tout octet ajouté est payé au chargement par chaque visiteur.
 * Les paliers ne servent qu'au joueur qui équipe un bijou — ils vivent donc dans un
 * fichier à part, chargé à la demande. Seuil de la maison : jusqu'à 120 Ko → public/
 * et fetch.
 *
 *   node scripts/completer-airbuilder-data.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), "utf8"));

const db = lire("public/airbuilder/data.json");
const dico = lire("src/data/statistiques-objets.json");
const relObjets = lire("public/wiki/objets-stats.json");
const relPaliers = lire("public/wiki/paliers-accessoires.json");
const relSources = lire("public/wiki/bonus-sources.json");

/* ── LE DICTIONNAIRE ────────────────────────────────────────────────────────
   Un code DST_* n'a qu'un libellé français, et c'est celui du relevé. Les codes
   sans libellé restent en code : mieux vaut « DST_ADDDROP » à l'écran qu'un nom
   inventé qui ferait croire à une statistique connue. */
const FR = {};
for (const s of dico.stats) if (s.fr) FR[s.code] = s.fr;
const fr = (code) => FR[code] || code;

/* ── LES SYNONYMES ──────────────────────────────────────────────────────────
   Le total du builder s'additionne PAR LIBELLÉ. Deux orthographes de la même
   statistique font donc deux lignes, et le joueur ne peut plus lire son total :
   « Dégâts PvE % 5 » et « Dégâts vs monstres 10 » sont le même DST_MONSTER_DMG.

   Chaque entrée dit sur quoi elle s'appuie :
   · `client`  — le libellé de gauche est celui que le CLIENT emploie lui-même
                 (colonne `client` du dictionnaire) pour ce code.
   · `code`    — l'égalité est prouvée par l'appariement objet par objet : le
                 même objet du relevé porte ce code là où le builder écrivait ce
                 libellé (voir le rapport en fin de script).
   · `ortho`   — normalisation d'orthographe, décidée ici et pas dans le client. */
const SYNO = {};
const SYNO_SRC = {};
const syn = (de, vers, src) => {
  if (de === vers) return;
  SYNO[de] = vers;
  SYNO_SRC[de] = src;
};

// Prouvés par la colonne `client` du dictionnaire : le client dit ce mot-là.
for (const s of dico.stats) {
  if (s.fr && s.client && s.client !== s.fr && s.client.length < 30) syn(s.client, s.fr, "client");
}
// Prouvés par l'appariement objet par objet (relevé de ce script, cf. rapport).
syn("Block Range", fr("DST_BLOCK_RANGE"), "code");
syn("Block Melee", fr("DST_BLOCK_MELEE"), "code");
syn("Melee Stealhp", "Syphon de vie", "code");
syn("Mp Max Rate", fr("DST_MP_MAX_RATE"), "code");
syn("Chr Dmg", fr("DST_CHR_DMG"), "code");
syn("Give Dmg Rate Enemy Bleeding", fr("DST_GIVE_DMG_RATE_ENEMY_BLEEDING"), "code");
syn("Vitesse d'attaque", fr("DST_ATTACKSPEED"), "code");
syn("Dégâts vs monstres", fr("DST_MONSTER_DMG"), "code");
syn("Toutes stats", fr("DST_STAT_ALLUP"), "code");
syn("Soin %", fr("DST_HEAL_RATE"), "code");
syn("Vitesse", fr("DST_SPEED"), "code");
syn("MP max", fr("DST_MP_MAX"), "code");
// Orthographe : les deux graphies désignent la même chose, le client n'arbitre pas.
syn("MP max %", fr("DST_MP_MAX_RATE"), "ortho");
syn("Dégâts aux monstres", fr("DST_MONSTER_DMG"), "ortho");
syn("Dégâts PvE %", fr("DST_MONSTER_DMG"), "ortho");
syn("Dégâts sur les boss %", fr("DST_MONSTER_DMG_BOSS"), "ortho");
syn("Vitesse %", fr("DST_SPEED"), "ortho");
syn("Maîtrise d'arme", fr("DST_WEAPON_EXP_RATE"), "ortho");
syn("Giftbox", fr("DST_GIFTBOX"), "ortho");
syn("Taux de drop", fr("DST_DROP_ITEM_ALLGRADE_RATE"), "ortho");
syn("Taux de penyas", fr("DST_PENYA_RATE"), "ortho");
syn("Expérience", fr("DST_EXPERIENCE"), "ortho");

const canon = (lbl) => SYNO[lbl] || lbl;

/* ── LE CROISEMENT PAR IDENTIFIANT NUMÉRIQUE ────────────────────────────────
   Le builder porte `id`, le relevé porte `i` : c'est le même nombre, celui de
   defineitem.h. Les objets à `id` textuel (capes, costumes, mantras, ramasseurs)
   ne viennent pas du relevé et gardent leurs bonus tels quels, seuls leurs
   libellés passent par les synonymes. */
const objParI = new Map(relObjets.objets.map((o) => [o.i, o]));
const cleParI = new Map(relObjets.objets.map((o) => [o.i, o.cle]));

const rapport = { relus: 0, apparies: 0, libelles: 0, lignesAjoutees: [], lignesEclatees: [] };

for (const [slot, arr] of Object.entries(db.ITEMS)) {
  for (const it of arr) {
    rapport.relus++;
    const num = typeof it.id === "number" ? it.id : null;
    const o = num == null ? null : objParI.get(num);
    if (o) {
      rapport.apparies++;
      const attendu = (o.b || []).map((b) => [fr(b[0]), b[1]]);
      const avant = it.b || [];
      // Une ligne du builder qui a fondu plusieurs bonus en un seul libellé :
      // « Spell Rate Atkpower Rate  Addmagic Rate Int  Addmagic » +300 tenait la
      // place de cinq bonus et n'en gardait qu'une valeur.
      if (avant.length === 1 && attendu.length > 1 && /\s{2,}|Rate .*Rate/.test(avant[0][0]))
        rapport.lignesEclatees.push({ slot, n: it.n, avant: avant[0], apres: attendu });
      else if (attendu.length > avant.length)
        rapport.lignesAjoutees.push({ slot, n: it.n, avant: avant.length, apres: attendu.length });
      it.b = attendu;
    } else if (it.b) {
      it.b = it.b.map((b) => {
        if (canon(b[0]) !== b[0]) rapport.libelles++;
        return [canon(b[0]), b[1]];
      });
    }
    if (it.setb) it.setb = it.setb.map((b) => [canon(b[0]), b[1]]);
  }
}
for (const c of db.CARNETS || []) {
  for (const k of ["base", "complet"]) if (c[k]) c[k] = c[k].map((b) => [canon(b[0]), b[1]]);
}

/* ── LES PANOPLIES D'ARMURE ET LEUR BONUS ───────────────────────────────────
   La signature d'un ensemble dans le relevé du builder est l'accord de `tier`,
   `cls` et `sex` — 64 signatures, chacune de quatre pièces exactement, vérifié
   plus bas. Le BONUS, lui, vit dans bonus-sources.json, indexé par la clé du
   client : on passe donc par id → clé → panoplie.

   LE BONUS DÉPEND DU NOMBRE DE PIÈCES PORTÉES : chaque ligne du client porte son
   seuil (`pieces`). Les lignes dont le seuil est atteint s'appliquent, celles
   au-dessus non. La plupart des ensembles ne paient qu'à 4/4, mais pas tous :
   les Yggdrasil portent une ligne à 1 pièce — et elle est NÉGATIVE. */
const panParCle = new Map();
for (const p of relSources.panoplies) for (const x of p.pieces) if (!panParCle.has(x.cle)) panParCle.set(x.cle, p);

const SLOTS_ARMURE = ["helmet", "suit", "gauntlet", "boots"];
const PANO = {};
const sigPieces = new Map();
for (const slot of SLOTS_ARMURE) {
  for (const it of db.ITEMS[slot] || []) {
    if (!it.tier || !it.cls) continue;
    const k = `${it.tier}|${it.cls}|${it.sex || ""}`;
    if (!sigPieces.has(k)) sigPieces.set(k, []);
    sigPieces.get(k).push({ slot, id: it.id });
  }
}
let panoTrouvees = 0;
let lignesNegatives = 0;
for (const [k, pieces] of sigPieces) {
  const trouvees = pieces.map((x) => panParCle.get(cleParI.get(x.id))).filter(Boolean);
  const p = trouvees[0];
  if (!p) continue;
  // Les quatre pièces doivent renvoyer LA MÊME panoplie, sinon la signature du
  // builder et le SetItem du client ne découpent pas au même endroit.
  if (new Set(trouvees.map((x) => x.id)).size !== 1) continue;
  panoTrouvees++;
  const lignes = p.paliers
    .filter((t) => t.valeur != null && t.code && t.code !== "DST_")
    .map((t) => [t.pieces, fr(t.code), t.valeur]);
  lignesNegatives += lignes.filter((l) => l[2] < 0).length;
  PANO[k] = { n: p.n || `#${p.id}`, lignes };
}
db.PANO = PANO;

/* ── LES PALIERS DE BIJOU ───────────────────────────────────────────────────
   LA VALEUR DU PALIER REMPLACE CELLE DU PALIER PRÉCÉDENT, elle ne s'y ajoute
   pas. Le client ne l'écrit nulle part — la règle est compilée dans Neuz.exe —
   mais deux éléments du client le rendent certain, et ils sont recopiés dans le
   fichier produit pour être montrés à l'écran.

   ON RECOPIE LE FICHIER, ON NE LE LISSE PAS : la table fait des PLATEAUX, et
   « chaque palier est différent » serait faux. Les plateaux sont comptés ici. */
const bijoux = {};
let nbPaliers = 0;
let nbPlateaux = 0;
let avecPaliers = 0;
for (const o of relPaliers.objets) {
  const rangs = [];
  let precedent = null;
  let nonVides = 0;
  for (const p of o.paliers) {
    nbPaliers++;
    const lignes = (p.b || []).map((b) => [fr(b[0]), b[1]]);
    if (lignes.length) nonVides++;
    const sig = JSON.stringify(lignes);
    if (lignes.length && sig === precedent) nbPlateaux++;
    precedent = sig;
    rangs[p.p] = lignes;
  }
  if (nonVides) avecPaliers++;
  bijoux[o.i] = { n: o.n || o.cle, cle: o.cle, plafond: o.plafond, rangs };
}

const paliersFichier = {
  genere: new Date().toISOString().slice(0, 10),
  source: relPaliers.source,
  quoi: "Les bonus d'un bijou à chaque palier d'amélioration, libellés en français. Index = le rang du palier ; une case vide signifie que le client n'écrit rien à ce rang.",
  regle: {
    laquelle: "REMPLACEMENT",
    ecriteDansLeClient: false,
    pourquoiCertaine: relPaliers.cumulOuRemplacement.maisDeuxElementsDuClientRendentLE_CUMUL_IMPOSSIBLE,
    palierVide:
      "Un palier dont la case est vide ne retire rien : c'est la base de l'objet (Spec_Item.txt, le champ `b` du catalogue) qui s'applique seule. Sur les six accessoires de Noël 2016, les deux sources ne parlent jamais de la même statistique.",
  },
  plateaux: {
    combien: nbPlateaux,
    quoi: "Nombre de paliers qui RECOPIENT à l'identique le palier précédent. « Chaque palier est différent » est donc faux : le fichier fait des plateaux, et on ne les lisse pas.",
  },
  total: { bijoux: Object.keys(bijoux).length, paliers: nbPaliers, avecPaliers },
  bijoux,
};

/* ── MECH : LES TROIS FAMILLES QUI MANQUAIENT ───────────────────────────────
   `MECH.arme` existait seule. Un bijou n'avait donc aucune mécanique déclarée,
   et son plafond — 20, ou 30 pour six objets — était introuvable côté site. */
const plafondsBijou = relPaliers.plafonds.bijou;
const aTrente = plafondsBijou.aTrente
  .map((cle) => relPaliers.objets.find((o) => o.cle === cle))
  .filter(Boolean)
  .map((o) => ({ i: o.i, n: o.n || o.cle }));

const SLOTS_BIJOU = ["ring1", "ring2", "earring1", "earring2", "necklace"];
const SLOTS_MODE = ["fhead", "ftop", "fhand", "ffoot"];

db.MECH.bijou = {
  emplacements: SLOTS_BIJOU,
  upgrade: {
    courant: plafondsBijou.courant,
    max: plafondsBijou.valeur,
    repartition: plafondsBijou.repartition,
    aTrente,
    source: plafondsBijou.source,
    note: `Le plafond est une propriété DE L'OBJET, pas de la famille : ${plafondsBijou.repartition["20"]} bijoux s'arrêtent à +${plafondsBijou.courant}, ${plafondsBijou.repartition["30"]} vont à +${plafondsBijou.valeur}. Poser 30 pour tous afficherait des paliers que le client n'écrit pas.`,
  },
  paliers: {
    regle: "remplacement",
    fichier: "/airbuilder/paliers.json",
    bijoux: paliersFichier.total.bijoux,
    paliers: paliersFichier.total.paliers,
    avecPaliers: paliersFichier.total.avecPaliers,
    plateaux: nbPlateaux,
    source: relPaliers.source,
  },
  catalogue: {
    dansLeBuilder: SLOTS_BIJOU.filter((s, i, a) => a.indexOf(s) === i).length,
    bijouxDuBuilder: ["ring", "earring", "necklace"].reduce((n, p) => n + (db.ITEMS[p] || []).length, 0),
    bijouxAvecPaliers: paliersFichier.total.avecPaliers,
    manque:
      "Le catalogue du builder ne propose qu'une poignée de bijoux ; la table des paliers en couvre bien davantage. Les bijoux absents du catalogue ne sont pas calculables faute d'icône, de niveau requis et de prestige dans le relevé.",
  },
};

const coefs = relPaliers.plafonds.armeEtArmure.coefficients;
const nbArmures = SLOTS_ARMURE.reduce((n, s) => n + (db.ITEMS[s] || []).length, 0);
const armuresAvecBonus = SLOTS_ARMURE.reduce(
  (n, s) => n + (db.ITEMS[s] || []).filter((it) => it.b && it.b.length).length,
  0,
);

db.MECH.armure = {
  emplacements: SLOTS_ARMURE,
  upgrade: {
    max: relPaliers.plafonds.armeEtArmure.valeur,
    colonnes: relPaliers.plafonds.armeEtArmure.colonnes,
    coefficients: coefs,
    source: "Client ▸ propEnchant.inc (colonnes L1…L10) · data-00.air ▸ defineitem.h",
    nonCalculable:
      "LE GAIN PAR PALIER NE SE CALCULE PAS. propEnchant.inc ne donne que des coefficients ; CE QU'ILS MULTIPLIENT — attaque ? défense ? — n'est écrit dans aucun fichier du client. Le +N est donc affiché et annoncé comme non compté, jamais estimé.",
  },
  percage: { suit: 4, autres: 0, source: "Relevé du builder (pierceMaxFor) · concorde avec MECH.arme.percage_max pour l'arme" },
  bonusPropre: {
    objets: nbArmures,
    avecBonus: armuresAvecBonus,
    ou: "Aucune armure du catalogue ne porte de bonus propre : sa valeur est dans sa PANOPLIE, son upgrade, son perçage et son éveil. Un total à zéro sur un stuff d'armure n'est donc pas une erreur d'affichage.",
  },
  panoplies: {
    signatures: sigPieces.size,
    avecBonus: panoTrouvees,
    pieces: 4,
    cle: "tier + cls + sex — « Bottes Flora » est la version féminine de « Bottes Fortis », ce sont deux panoplies distinctes",
    seuils: "Chaque ligne porte son nombre de pièces requis. Les seuils atteints s'appliquent, les autres non.",
    lignesNegatives,
    avertissement:
      "Des lignes de panoplie sont NÉGATIVES : porter l'ensemble complet COÛTE des dégâts JcJ. Le total doit les montrer, pas les cacher.",
    source: "public/wiki/bonus-sources.json ▸ panoplies (SetItem du client)",
  },
};

const setsMode = new Map();
for (const it of db.ITEMS.fashion || []) {
  const k = `${it.set || ""}|${it.sex || ""}`;
  if (!setsMode.has(k)) setsMode.set(k, new Set());
  setsMode.get(k).add(it.piece);
}
db.MECH.mode = {
  emplacements: SLOTS_MODE,
  ensembles: setsMode.size,
  pieces: (db.ITEMS.fashion || []).length,
  cle: "set + sex",
  bonusDeSet: {
    a: SLOTS_MODE.length,
    seulement: true,
    quoi: "Aucune pièce de costume ne paie seule : le bonus est porté par le SET et ne s'applique qu'aux quatre pièces portées. Les quatre pièces répètent le même tableau dans le relevé — on l'ajoute une fois, pas quatre.",
  },
  gemmes: { parPiece: 4, choix: (db.GEMC || []).length, source: "public/airbuilder/data.json ▸ GEMC" },
  rune: { stats: ["Force", "Endurance", "Dextérité", "Intelligence"] },
  upgrade: {
    nonCalculable:
      "Le client ne documente aucun gain d'amélioration pour le costume : ni table de paliers, ni coefficient. Le curseau reste affiché parce que le joueur le voit en jeu, mais il ne compte pour rien dans le total.",
  },
};

/* Ce que MECH.arme disait de trop : son plafond de +10 est juste pour une arme
   non-artefact et pour une armure, faux dès qu'on l'applique à un bijou. On ne
   change pas la valeur, on écrit à quoi elle s'applique. */
db.MECH.arme.upgrade_normal.portee =
  "Une arme non-artefact. Une armure a le même plafond (MECH.armure) ; un bijou monte à +20 ou +30 (MECH.bijou) — ne pas réutiliser ce nombre hors de l'arme.";
db.MECH.arme.nonCalculable = db.MECH.armure.upgrade.nonCalculable;

db.SYNO = SYNO;
db.SYNO_SRC = SYNO_SRC;

/* ── LES ILLUSTRATIONS DES CARNETS DES ARCANES ──────────────────────────────
   Maxime : « tu avais fait le deck des arcanes et tu as repris dans collections le
   carnet des arcanes, intègre les assets, évite les doublons — c'est de ça que je te
   parle ».

   L'ÉTAT AVANT CE BLOC, mesuré : `db.CARNETS` porte les QUINZE NOMS FRANÇAIS écrits à
   la main par Maxime (« L'appel de l'aventure », « Domaine élémentaire », « Le poids du
   destin ») et ZÉRO illustration. Le relevé du client, lui, porte 59 illustrations et
   AUCUN nom français. Une passe précédente avait tranché à l'envers : elle a écarté le
   carnet fait main en jugeant ses bonus « très pauvres » et affiché la clé non traduite
   `TID_DECK_ARCANE_4` faute de nom — alors que les noms existaient.

   src/data/carnets-arcanes.json est la réconciliation des deux, et elle DORMAIT : ce
   fichier n'était importé nulle part. On le greffe ici, dans le générateur plutôt qu'à
   la main, sinon la prochaine régénération de data.json effacerait les illustrations.

   LA JONCTION SE FAIT PAR LA SIGNATURE DES CARTES, jamais par l'index — les deux
   numérotations diffèrent. Vérifié carnet par carnet : les 1 à 4 coïncident, puis le 5
   du fait-main occupe la position 15 chez le client, et les 6 à 15 correspondent aux
   5 à 14. Une jonction par index aurait collé les illustrations du mauvais carnet à
   onze des quinze, et RIEN ne l'aurait signalé — ni la compilation, ni l'œil.

   Le poids est négligeable : un nom de fichier par carte, 63 cartes. */
const clefCarte = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\bcarte\b/g, "").replace(/[^a-z0-9]/g, "");
const signatureCarnet = (cartes) =>
  (cartes ?? []).map((c) => clefCarte(c.nom ?? c.n)).sort().join("|");

let carnetsIllustres = 0;
let cartesIllustrees = 0;
try {
  const fusion = lire("src/data/carnets-arcanes.json");
  const parSignature = new Map(
    (fusion.liste ?? []).map((d) => [signatureCarnet(d.cartes), d])
  );
  for (const c of db.CARNETS ?? []) {
    const jumeau = parSignature.get(signatureCarnet(c.cartes));
    if (!jumeau) continue;
    // L'illustration s'apparie carte par carte, par le nom : l'ordre des cartes n'est
    // pas garanti identique entre les deux relevés, et se fier au rang aurait donné
    // l'image de la voisine.
    const artParClef = new Map(
      (jumeau.cartes ?? []).filter((x) => x.art).map((x) => [clefCarte(x.nom), x.art])
    );
    let touche = false;
    for (const carte of c.cartes ?? []) {
      const art = artParClef.get(clefCarte(carte.nom ?? carte.n));
      if (!art) continue;
      carte.art = art;
      cartesIllustrees += 1;
      touche = true;
    }
    if (touche) carnetsIllustres += 1;
  }
} catch {
  // Le fichier de fusion est facultatif : sans lui, les carnets gardent les noms de
  // Maxime et n'ont simplement pas d'image. On ne casse pas le builder pour ça.
  carnetsIllustres = -1;
}

/* ── LES SOURCES, POUR L'ÉCRAN ──────────────────────────────────────────────
   Décision de Maxime : « afficher le calcul et sa source, sans le donner pour
   exact ». Le moteur a donc besoin des sources EN LIGNE, pas dans un commentaire
   de code que personne ne lit à l'écran. */
db.SRC = {
  objets: "Client ▸ Spec_Item.txt, relevé dans public/wiki/objets-stats.json (5 075 objets)",
  libelles: "Client ▸ defineattribute.h + textclient.txt, relevé dans src/data/statistiques-objets.json",
  paliers: "Client/data-02.air ▸ accessory.inc — la valeur du palier REMPLACE la précédente",
  panoplies: "Client ▸ SetItem, relevé dans public/wiki/bonus-sources.json",
  percage: "Descriptions du jeu, relevées à la main dans le builder",
  sertissage: "Client ▸ Ultimate_GemAbility.txt — huit emplacements par gemme, dont trois sans titre",
  reserve:
    "Les formules de dégâts publiées ailleurs sont celles du Flyff OFFICIEL ; Airborn a changé des valeurs. Un nombre affiché ici est la somme de ce qui est ÉCRIT dans le client, pas un dégât mesuré en jeu.",
};

/* ── ÉCRITURE ───────────────────────────────────────────────────────────────
   data.json part inline : il s'écrit compact. paliers.json est chargé à la
   demande et se relit à la main : il s'écrit indenté. */
fs.writeFileSync(path.join(RACINE, "public/airbuilder/data.json"), JSON.stringify(db));
fs.writeFileSync(path.join(RACINE, "public/airbuilder/paliers.json"), JSON.stringify(paliersFichier, null, 1));

const ko = (p) => (fs.statSync(path.join(RACINE, p)).size / 1024).toFixed(1) + " Ko";
console.log(`data.json    ${ko("public/airbuilder/data.json")}  (inline dans la page)`);
console.log(`paliers.json ${ko("public/airbuilder/paliers.json")}  (chargé à la demande)`);
console.log(`objets relus ${rapport.relus} · appariés au relevé ${rapport.apparies}`);
console.log(`libellés normalisés hors relevé : ${rapport.libelles} · synonymes déclarés : ${Object.keys(SYNO).length}`);
console.log(`lignes éclatées (un libellé fondu qui en cachait plusieurs) : ${rapport.lignesEclatees.length}`);
for (const x of rapport.lignesEclatees)
  console.log(`   ${x.n} : « ${x.avant[0]} » ${x.avant[1]} → ${x.apres.map((b) => b[0] + " " + b[1]).join(" · ")}`);
console.log(`objets qui gagnent des lignes : ${rapport.lignesAjoutees.length}`);
for (const x of rapport.lignesAjoutees) console.log(`   ${x.n} : ${x.avant} → ${x.apres} bonus`);
console.log(`panoplies d'armure : ${panoTrouvees}/${sigPieces.size} signatures, ${lignesNegatives} lignes négatives`);
console.log(`paliers de bijou : ${paliersFichier.total.paliers} sur ${paliersFichier.total.bijoux} bijoux · ${nbPlateaux} plateaux`);
console.log(`MECH : ${Object.keys(db.MECH).join(", ")}`);
console.log(carnetsIllustres < 0
  ? "carnets des arcanes : fusion absente, les noms restent, pas d image"
  : `carnets des arcanes : ${carnetsIllustres}/${(db.CARNETS ?? []).length} illustres, ${cartesIllustrees} cartes`);
