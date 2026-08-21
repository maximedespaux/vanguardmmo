// ════════════════════════════════════════════════════════════════════════
//  LES LIEUX QUE LE TÉLÉPORTEUR NE PROPOSE PAS
//  node scripts/extraire-lieux.mjs  →  src/data/lieux-hors-teleporteur.json
//                                   →  src/data/lieux-monstres.json
// ════════════════════════════════════════════════════════════════════════
//
// POURQUOI CE FICHIER EXISTE. La page /donjons montre les 23 destinations du
// téléporteur. Le client, lui, porte 51 cartes sur parchemin — et douze d'entre
// elles n'étaient branchées nulle part. En les ouvrant une par une, quatre
// portent le nom imprimé d'une ZONE À TICKET et quatre celui d'un DONJON que la
// grille ne reprend pas. Ce sont des lieux dans lesquels on entre : ils
// appartiennent à cette page.
//
// ┌──────────── LA PREUVE DE CORRESPONDANCE, ET ELLE EST DOUBLE ────────────┐
// │ 1. LE CARTOUCHE. Chaque carte porte son nom IMPRIMÉ dessus, en bas à     │
// │    droite. C'est la seule preuve qui vaille : les noms de FICHIERS       │
// │    mentent — `town_oasis.webp` affiche « Tour Oubliée B5 », et           │
// │    `dungeon_sanpres_1.webp` affiche « USS Darkon », pas « USS Celestia ».│
// │ 2. LA TABLE DES MONSTRES. `public/wiki/monstres.json` pose des espèces   │
// │    dans une zone portant EXACTEMENT ce nom. Sans peuplement, on ne       │
// │    montre pas le lieu : une carte seule ne dit ni le niveau, ni ce qu'on │
// │    y croise.                                                             │
// └─────────────────────────────────────────────────────────────────────────┘
//
// CE QUI EST ÉCARTÉ, et pourquoi — pour qu'on ne le redécouvre pas :
//   · `dungeon_ominous01` (« Fosse aux Esprits Perdus ») et `dungeon_sanpres_1`
//     (« USS Darkon ») sont bien des lieux distincts — la carte du monde
//     d'Harmonin les marque tous les deux d'une entrée de donjon. Mais AUCUNE
//     zone de la table des monstres ne porte leur nom : on n'a que la carte.
//     Celle d'USS Darkon est en plus presque vide, deux salles minuscules.
//   · `dungeon_rustia_2` (« Désiréa (Maître) ») et `dungeon_upresia_1`
//     (« Forêt Enchantée d'Euphrasia ») nomment des variantes de donjons déjà
//     cartographiés. Rien dans les données ne confirme un second étage ni un
//     mode « Maître » : on ne l'invente pas.
//   · `dungeon_herneos` (« Herneos ») double `dungeon_herneos_1` (« Abysses
//     d'Herneos »), déjà branchée sur la Grotte d'Herneos.
//   · `dungeon_contaminatedtrails1` a son cartouche en CORÉEN — ces cartes ne
//     sont pas toutes localisées.
//
// AUCUN CHIFFRE N'EST ÉCRIT À LA MAIN. Espèces, points de réapparition, bornes
// de niveau, plus gros sac de points de vie, prix du ticket : tout est compté
// ou relevé dans les fichiers. Une clé absente veut dire « rien à compter », et
// l'écran n'affiche alors rien.

import fs from "node:fs";
import path from "node:path";

const racine = process.cwd();
const lire = (...p) => JSON.parse(fs.readFileSync(path.join(racine, ...p), "utf8"));

const MONSTRES = lire("public", "wiki", "monstres.json").monstres;
const OU_TROUVER = lire("public", "wiki", "ou-trouver.json").objets;
const DOSSIER_ICONES = path.join(racine, "public", "jeu", "icones");
const DOSSIER_CARTES = path.join(racine, "public", "jeu", "cartes-monde");

/** L'équipe a saisi ses textes en cp1252 : la ligature `œ` est devenue `½` DANS
 *  LE FICHIER DU JEU. Ce n'est pas notre bug, mais l'afficher le serait. Même
 *  réparation que src/components/pnj/generer-pnj.py. */
const reparer = (s) => (s ?? "").replace(/½/g, "œ");

/** Comparaison sans accents : les relevés écrivent « Ile Corail » là où la table
 *  des monstres écrit « Île Corail ». Comparer brut perdait les vingt objets de
 *  l'île — vérifié, c'est ce qui est arrivé au premier essai. */
const sansAccent = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Une icône du client, ou `null`. Les relevés donnent des noms en `.png` et en
 *  casse mêlée ; le disque porte du `.webp` en minuscules. On ne pointe JAMAIS
 *  un fichier absent — une image cassée coûte plus cher que pas d'image. */
function icone(nom) {
  if (!nom) return null;
  const f = nom.toLowerCase().replace(/\.png$/, ".webp");
  return fs.existsSync(path.join(DOSSIER_ICONES, f)) ? f : null;
}

/** Même règle pour les cartes : une carte annoncée et absente casserait la page. */
function carte(fichier) {
  if (!fs.existsSync(path.join(DOSSIER_CARTES, fichier))) {
    throw new Error(`carte absente : public/jeu/cartes-monde/${fichier}`);
  }
  return `/jeu/cartes-monde/${fichier}`;
}

/**
 * LES HUIT LIEUX, avec pour chacun le nom IMPRIMÉ sur sa carte et les zones de
 * la table des monstres qui portent ce nom.
 *
 * `zones` est un tableau parce qu'un lieu peut en compter deux. Deux cas, et ils
 * ne veulent PAS dire la même chose :
 *   · Volcane est posée sous « Ile Volcanique - Volcane » ET « DuVolcaneRed » —
 *     les deux mêmes espèces des deux côtés. Deux noms internes, un peuplement.
 *   · Azria porte « Azria 2 » (huit espèces de 73 à 115) ET « Azria » (trois de
 *     190 à 210). Une carte, DEUX PEUPLEMENTS, séparés de soixante-quinze
 *     niveaux — voir `peuplementsDe()`, qui les distingue sur la PROVENANCE et
 *     non sur ces noms de zone.
 * Les fondre en un seul intervalle donnerait « du niveau 73 au 210 » et ferait
 * croire à une progression continue ; n'en garder qu'un ferait disparaître le
 * farm de fin de jeu du serveur — 4 130 emplacements, 3ᵉ lieu du relevé.
 */
const LIEUX = [
  {
    groupe: "ticket",
    clef: "corail",
    nom: "Île Corail",
    cartouche: "Île Corail",
    carte: "dungeon_cisland.webp",
    zones: ["Île Corail"],
    ticket: "Ticket Ile Corail",
  },
  {
    groupe: "ticket",
    clef: "azria",
    nom: "Azria",
    cartouche: "Azria",
    carte: "world_azria.webp",
    zones: ["Azria 2", "Azria"],
    ticket: "Ticket Azria",
  },
  {
    groupe: "ticket",
    clef: "rartesia",
    // SANS ACCENT, et c'est vérifié sur l'image : le cartouche de
    // `world_rartesia.webp` imprime « Rartesia ». Aucun fichier de données n'écrit
    // « Rartésia » non plus — ni monstres.json (zone « Rartesia »), ni ou-trouver
    // (« Ticket Rartesia »), ni crafts, ni objets-fiches. L'accent avait été ajouté
    // par symétrie avec « Sombrésia », qui lui EST imprimé accentué : la fiche
    // annonçait donc « le cartouche imprimé dit “Rartésia” » au-dessus d'une carte
    // qui dit autre chose. Le cartouche est une CITATION, il se recopie tel quel.
    nom: "Rartesia",
    cartouche: "Rartesia",
    carte: "world_rartesia.webp",
    zones: ["Rartesia"],
    ticket: "Ticket Rartesia",
  },
  {
    groupe: "ticket",
    clef: "sombresia",
    nom: "Sombrésia",
    cartouche: "Sombrésia",
    // La carte de Sombrésia est celle de Rartésia plongée dans le noir : ce sont
    // les mêmes îles flottantes. Le fichier s'appelle `darkrartesia`, et le
    // cartouche imprimé dit bien « Sombrésia ».
    carte: "world_darkrartesia.webp",
    zones: ["Sombrésia"],
    ticket: "Ticket Sombrésia",
  },
  {
    groupe: "client",
    clef: "mas",
    nom: "Mine de Mas",
    cartouche: "Mine de Mas",
    carte: "dungeon_masdungeon.webp",
    zones: ["Mine de Mas"],
  },
  {
    groupe: "client",
    clef: "dekanes",
    nom: "Mine de Dekanes",
    cartouche: "Mine de Dekanes",
    carte: "dungeon_dekanes.webp",
    zones: ["Mine de Dekanes"],
  },
  {
    groupe: "client",
    clef: "ivillis",
    nom: "Temple d'Ivillis",
    cartouche: "Temple d'Ivillis",
    carte: "dungeon_ibless.webp",
    zones: ["Temple d'Ivillis"],
  },
  {
    groupe: "client",
    clef: "volcane",
    nom: "Volcane",
    cartouche: "Volcane",
    carte: "dungeon_volcane.webp",
    // Le client range ces deux-là sous « Ile Volcanique - Volcane » et
    // « DuVolcaneRed » : les mêmes deux espèces, posées de part et d'autre.
    zones: ["Ile Volcanique - Volcane", "DuVolcaneRed"],
  },
];

/**
 * LES EMPLACEMENTS DE RÉAPPARITION, ZONE PAR ZONE, SUR TOUT LE RELEVÉ.
 *
 * « 4 130 emplacements » ne dit rien tant qu'on ne sait pas si c'est beaucoup.
 * Le rang se compte donc sur TOUTES les zones que le relevé porte, pas sur les
 * huit lieux de cette page : un superlatif calculé sur huit lignes ne vaudrait
 * que pour ces huit lignes, et l'écran dirait « du jeu ».
 */
/**
 * ┌──── LE RANG SE COMPTE PAR LIEU, PAS PAR NOM DE ZONE ────┐
 * │ Première version : un total par nom de zone. Elle       │
 * │ classait Azria PREMIÈRE sur 65 avec ses 4 130           │
 * │ emplacements — et c'était faux. Le Parc prestigieux et  │
 * │ le Royaume de Kaelis sont chacun découpés en DEUX modes │
 * │ (« … 1v1 » et « … AoE ») qui sont le même endroit :     │
 * │ comptés séparément ils passaient sous Azria, regroupés  │
 * │ ils la dépassent nettement.                              │
 * │                                                          │
 * │     Parc prestigieux   6 400   (3 200 + 3 200)          │
 * │     Royaume de Kaelis  6 072   (3 036 + 3 036)          │
 * │     Azria              4 130                             │
 * │                                                          │
 * │ Azria est TROISIÈME. C'est exactement la maladie déjà    │
 * │ corrigée sur /objets — compter une unité et présenter le │
 * │ résultat comme une autre.                                │
 * └──────────────────────────────────────────────────────────┘
 *
 * Le suffixe de mode est retiré pour regrouper. La règle est dérivable et ne
 * nomme aucun lieu : elle vaut pour tout découpage à venir du même genre.
 */
const SANS_MODE = (z) => (z ?? "").replace(/\s*(1v1|AoE)\s*$/i, "").trim();

const POSES_PAR_ZONE = (() => {
  const t = new Map();
  for (const m of MONSTRES) for (const l of m.lieux ?? []) {
    const k = SANS_MODE(l.z);
    t.set(k, (t.get(k) ?? 0) + (l.n ?? 0));
  }
  return t;
})();
const TOTAUX_TRIES = [...POSES_PAR_ZONE.values()].sort((a, b) => b - a);
/** 1 = aucune zone du relevé ne porte plus d'emplacements que ce total. */
const rangDesPoses = (n) => TOTAUX_TRIES.filter((v) => v > n).length + 1;

/**
 * UNE CARTE PEUT PORTER DEUX PEUPLEMENTS, ET LES DEUX COMPTENT.
 *
 * ┌─────────── CE QUE CETTE FONCTION RÉPARE ────────────┐
 * │ La carte d'Azria porte huit espèces de 73 à 115 ET  │
 * │ trois de 190 à 210. On en a d'abord fait un seul    │
 * │ intervalle « 73 à 210 », qui fait croire à une      │
 * │ progression continue là où il y a soixante-quinze   │
 * │ niveaux de vide. Puis, en corrigeant, on a rangé la │
 * │ bande haute en note de bas de page — alors qu'elle  │
 * │ porte 4 130 emplacements de réapparition, PLUS QUE  │
 * │ TOUTE AUTRE ZONE DU JEU. Les deux lectures étaient  │
 * │ fausses : ce ne sont ni un palier ni une curiosité, │
 * │ ce sont DEUX PEUPLEMENTS sur une même carte, et ils │
 * │ servent à deux moments très éloignés de la partie.  │
 * └─────────────────────────────────────────────────────┘
 *
 * ┌───────── POURQUOI `maison` ET PLUS `MI_EXP_` ─────────┐
 * │ Le premier tri lisait le préfixe `MI_EXP_` de         │
 * │ l'identifiant. Il tranche juste, mais il ne tranche   │
 * │ QUE TROIS LIGNES sur 1 124, les trois sur Azria :     │
 * │ une règle qui ne s'exerce qu'une fois n'est pas une   │
 * │ règle, c'est Azria écrite en code. Et `id` manque sur │
 * │ une ligne du relevé, donc le test porte sur un champ  │
 * │ qui peut être absent.                                 │
 * │ `maison` dit la même chose et dit POURQUOI : c'est le │
 * │ marqueur « posé par Airborn » du relevé. Il est       │
 * │ présent sur les 1 124 lignes, il en marque 256, et    │
 * │ c'est lui qui permet de NOMMER les deux bandes au     │
 * │ lieu de les numéroter.                                │
 * │ Mesuré sur les 65 zones du relevé : une seule mêle    │
 * │ les deux provenances (Fôret de Faelea), et ses deux   │
 * │ groupes s'y CHEVAUCHENT en niveau — le garde ci-      │
 * │ dessous les refond alors en un seul peuplement, parce │
 * │ que deux bandes qui se recouvrent ne disent rien.     │
 * └───────────────────────────────────────────────────────┘
 */
const ORIGINES = [
  { clef: "flyff", test: (m) => !m.maison },
  { clef: "airborn", test: (m) => m.maison === true },
];

/** Les bornes de niveau d'un groupe d'espèces. */
const bornes = (liste) => [Math.min(...liste.map((m) => m.niv)), Math.max(...liste.map((m) => m.niv))];

function peuplementsDe(zones) {
  const surLaCarte = MONSTRES.filter((m) => (m.lieux ?? []).some((l) => zones.includes(l.z)));
  if (!surLaCarte.length) return [];
  const groupes = ORIGINES.map((o) => ({ origine: o.clef, liste: surLaCarte.filter(o.test) }))
    .filter((g) => g.liste.length)
    .sort((a, b) => bornes(a.liste)[0] - bornes(b.liste)[0]);
  /* Une seule provenance : une seule bande, et elle ne porte PAS d'étiquette
     d'origine — « Flyff d'origine » tout seul, sans rien à quoi l'opposer,
     n'apprend rien et ne change aucun geste. Sept lieux sur huit sont ici. */
  if (groupes.length < 2) return [{ liste: surLaCarte }];
  const [aMin, aMax] = bornes(groupes[0].liste);
  const [bMin, bMax] = bornes(groupes[1].liste);
  const chevauchent = aMin <= bMax && bMin <= aMax;
  return chevauchent ? [{ liste: surLaCarte }] : groupes;
}

/** Ce qu'on montre d'une bande : son compte, sa densité, ses niveaux, sa tête. */
function detailBande(g, zones) {
  const nb = (m) => (m.lieux ?? []).filter((l) => zones.includes(l.z)).reduce((s, l) => s + (l.n ?? 0), 0);
  const poses = g.liste.reduce((t, m) => t + nb(m), 0);
  // Le plus gros sac de points de vie, en PV EFFECTIFS : un adversaire à
  // plusieurs vies ne meurt pas quand sa barre atteint zéro.
  const gros = g.liste.reduce((a, m) => ((m.pvEff ?? m.pv) > (a.pvEff ?? a.pv) ? m : a), g.liste[0]);
  /* LE RANG N'EST ÉCRIT QUE S'IL EST COMPARABLE. Il se compare à des TOTAUX DE
     ZONE ; une bande étalée sur deux zones du relevé (Volcane, posée sous deux
     noms internes) n'est donc pas une zone et n'a pas de rang. Clé absente =
     rien à compter, l'écran n'affiche alors rien. */
  const sesZones = new Set(
    g.liste.flatMap((m) => (m.lieux ?? []).filter((l) => zones.includes(l.z)).map((l) => l.z))
  );
  const [nivMin, nivMax] = bornes(g.liste);
  return {
    ...(g.origine ? { origine: g.origine } : {}),
    especes: g.liste.length,
    poses,
    nivMin,
    nivMax,
    gros: { nom: reparer(gros.nom), niv: gros.niv, pv: gros.pvEff ?? gros.pv, rang: gros.rang, poses: nb(gros) },
    ...(sesZones.size === 1 ? { rangPoses: rangDesPoses(poses) } : {}),
  };
}

/**
 * LE PEUPLEMENT D'UN LIEU : ce qui décide s'il vaut d'être montré, et ses bandes.
 *
 * `bandes` est TOUJOURS écrit, même quand il n'y en a qu'une : l'écran a alors un
 * seul chemin de dessin, donc un seul comportement à vérifier. Les totaux du
 * dessus (espèces, emplacements, bornes) couvrent la carte ENTIÈRE — ils se
 * rendent tels quels dans l'en-tête du panneau et dans le tri de l'échelle.
 */
function peuplement(zones) {
  const groupes = peuplementsDe(zones);
  if (!groupes.length) return null;
  const bandes = groupes.map((g) => detailBande(g, zones));
  const toutes = groupes.flatMap((g) => g.liste);
  const nb = (m) => (m.lieux ?? []).filter((l) => zones.includes(l.z)).reduce((s, l) => s + (l.n ?? 0), 0);
  /* Le plus coriace de TOUTE la carte. Il n'est plus affiché tel quel dès qu'il y
     a deux bandes — un seul « plus coriace » y est trompeur quel que soit celui
     qu'on choisit, l'écran en montre donc un PAR BANDE. Il reste ici parce que
     src/app/(public)/donjons/donnees.ts l'apparie pour faire un lien vers
     /monstres. */
  const gros = toutes.reduce((a, m) => ((m.pvEff ?? m.pv) > (a.pvEff ?? a.pv) ? m : a), toutes[0]);
  return {
    especes: toutes.length,
    poses: bandes.reduce((t, b) => t + b.poses, 0),
    nivMin: Math.min(...bandes.map((b) => b.nivMin)),
    nivMax: Math.max(...bandes.map((b) => b.nivMax)),
    gros: { nom: reparer(gros.nom), niv: gros.niv, pv: gros.pvEff ?? gros.pv, rang: gros.rang, poses: nb(gros) },
    bandes,
  };
}

/**
 * LE RELEVÉ DE COMBAT — ce que chaque créature du lieu fait comme dégâts.
 *
 * ┌───── POURQUOI UN SECOND FICHIER, ET PAS TROIS CLÉS DE PLUS ─────┐
 * │ La tuile d'un lieu tient dans 7 Ko pour les huit. Le relevé de  │
 * │ combat, lui, pèse 102 créatures × (bornes du coup, délai,       │
 * │ cinq résistances) : mesuré, 21 Ko. Or `lieux-hors-teleporteur`  │
 * │ est importé par un composant CLIENT — le fondre dedans aurait   │
 * │ ajouté ces 21 Ko au paquet de /donjons pour tout le monde, y    │
 * │ compris pour qui n'ouvre jamais un panneau. Dans son propre     │
 * │ fichier, il n'est chargé qu'à l'ouverture du premier panneau.   │
 * │ C'est la même raison qui a sorti les 12 Ko de vagues de l'Oasis │
 * │ du paquet (cf. app/(public)/donjons/donnees.ts).                │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * CE QUI N'Y EST PAS, ET POURQUOI :
 *   · `vitAtk` — le client le porte (950, 1 000, 1 050, 1 200 ici ; 100 à 10 000
 *     sur les world boss), aucune source ne dit dans quelle unité ni contre quoi
 *     il se multiplie, et AUCUN écran du site ne l'affiche. Un nombre dont on ne
 *     sait pas dire ce qu'il change ne change aucun geste.
 *   · `vole` — les 102 créatures de ces huit lieux sont au sol. Une pastille vraie
 *     zéro fois sur 102 n'est pas un renseignement.
 *   · `agro` — les 102 sont agressives. Idem.
 *   · l'expérience et la penya : elles restent dans le relevé source, elles ne
 *     montent pas ici. Règle de la maison.
 *
 * `vies` n'est écrit QUE s'il dépasse 1 : aucune de ces créatures ne se relève
 * aujourd'hui, la colonne ne s'affichera donc pas — mais le jour où une zone en
 * gagne une, l'écran le dira sans qu'on y touche.
 */
function releveDeCombat(zones) {
  const groupes = peuplementsDe(zones);
  const nb = (m) => (m.lieux ?? []).filter((l) => zones.includes(l.z)).reduce((s, l) => s + (l.n ?? 0), 0);
  const fiche = (m) => ({
    nom: reparer(m.nom),
    niv: m.niv,
    rang: m.rang,
    // Les PV EFFECTIFS, comme partout : un adversaire à plusieurs vies ne meurt
    // pas quand sa barre atteint zéro.
    pv: m.pvEff ?? m.pv,
    ...((m.vies ?? 1) > 1 ? { vies: m.vies } : {}),
    atkMin: m.atkMin ?? null,
    atkMax: m.atkMax ?? null,
    delai: m.delai ?? null,
    // « aucun » n'est pas un élément, c'est une absence : `null` pour que l'écran
    // n'aille pas chercher une icône qui n'existe pas.
    elem: m.elem && m.elem !== "aucun" ? m.elem : null,
    res: m.res ?? {},
    /* ┌──── LA RAGE ET LE SOIN MONTENT, ET CE N'EST PAS DU CONFORT ────┐
       │ La règle de la maison sur /donjons est écrite dans             │
       │ LienMonstre.tsx : la page garde des monstres « ce qui fait     │
       │ DÉCIDER d'entrer — les PV à sortir, la faiblesse, UNE RAGE     │
       │ SCRIPTÉE ». La fiche de donjon la respecte déjà                │
       │ (FicheClient.tsx écrit « Rage sous X % de PV : ×N dégâts ») ;  │
       │ le premier relevé de ces huit lieux, lui, n'en disait rien —   │
       │ alors que 33 de ses 102 créatures entrent en rage et que 6 se  │
       │ soignent. Ce sont les deux faits qui font passer un combat de  │
       │ gagné à perdu dans les derniers pour-cent, et ils changent le  │
       │ geste : garder les soins pour le seuil, ou passer le seuil du  │
       │ soin d'un seul coup pour qu'il ne parte pas.                   │
       │ Le tableau est GARDÉ TEL QUEL : ce sont des seuils, pas des    │
       │ moyennes, et deux créatures d'ici en portent DEUX.             │
       │ Coût mesuré : voir la ligne de sortie du script.               │
       └────────────────────────────────────────────────────────────────┘ */
    ...(m.rage?.length ? { rage: m.rage.map((r) => ({ pv: r.pv, x: r.x })) } : {}),
    ...(m.soigne?.length ? { soigne: m.soigne.map((s) => ({ pv: s.pv, rend: s.rend })) } : {}),
    poses: nb(m),
  });
  // Le plus fort coup d'abord : c'est la question à laquelle ce relevé répond.
  // Le niveau, lui, est déjà porté par l'échelle et par la tuile.
  const parMenace = (a, b) =>
    (b.delai ? Math.max(b.atkMin ?? 0, b.atkMax ?? 0) / b.delai : 0) -
    (a.delai ? Math.max(a.atkMin ?? 0, a.atkMax ?? 0) / a.delai : 0);
  /* CHAQUE CRÉATURE SAIT DE QUELLE BANDE ELLE EST, et le relevé reste UNE SEULE
     LISTE. Deux listes séparées auraient obligé chaque lecteur à les recoller
     pour comparer les dégâts d'un bout à l'autre de la carte — or c'est
     exactement ce que le panneau fait, ses barres se mesurent sur le maximum de
     TOUT le lieu. Le rang de la bande n'est écrit que s'il y en a plusieurs :
     clé absente = première bande, comme partout ici. */
  const especes = groupes
    .flatMap((g, i) => g.liste.map((m) => ({ ...fiche(m), ...(groupes.length > 1 ? { bande: i } : {}) })))
    .sort(parMenace);
  return { especes };
}

/**
 * CE QUE LE CLIENT ENVOIE CHERCHER LÀ-BAS.
 *
 * Les descriptions d'objets d'Airborn nomment le lieu de farm en clair
 * (« Reine Tyroglyphe Bleue, Mine de Dekanes ») et les tables de quête posent la
 * zone du butin. On récolte les objets dont UNE source nomme le lieu ; les taux
 * de chute, eux, ne remontent pas — ils ne se montrent plus nulle part.
 */
function objetsDuLieu(zones) {
  const vus = new Map();
  const cles = zones.map(sansAccent);
  for (const o of OU_TROUVER) {
    const touche = (o.sources ?? []).some((s) => {
      const ou = sansAccent(`${s.ouFarmer ?? ""} ${(s.zones ?? []).join(" ")}`);
      return cles.some((z) => ou.includes(z));
    });
    if (!touche) continue;
    const nom = reparer(o.nom);
    if (!vus.has(nom)) vus.set(nom, { nom, icone: icone(o.icone) });
  }
  return [...vus.values()];
}

/**
 * LE TICKET D'UNE ZONE — ses durées, et le prix de la journée au FLY SHOP.
 *
 * Le prix est un COÛT D'OPÉRATION, pas une récompense : il reste. Et il porte un
 * fait qu'aucun écran du jeu ne met côte à côte — les quatre tickets ne coûtent
 * pas la même chose, et l'ordre des prix n'est pas celui des niveaux.
 */
function ticketDe(prefixe) {
  const lignes = OU_TROUVER.filter((o) => o.nom.startsWith(prefixe));
  if (!lignes.length) return null;
  const durees = [];
  let flycoin = null;
  let pnj = null;
  let ic = null;
  for (const o of lignes) {
    const j = o.nom.match(/\((\d+)\s*jours?\)/);
    if (j) durees.push(Number(j[1]));
    ic = ic ?? icone(o.icone);
    for (const s of o.sources ?? []) {
      if (s.type !== "craft") continue;
      const fc = (s.entrants ?? []).find((e) => /FLYCOIN/i.test(e.nom ?? ""));
      // Le prix retenu est celui du ticket d'UN JOUR : c'est le seul que les
      // quatre zones ont en commun, donc le seul comparable.
      if (fc && /\(1 jour\)/.test(o.nom)) {
        flycoin = fc.qte;
        pnj = s.pnj ?? null;
      }
    }
  }
  return {
    nom: reparer(lignes[0].nom.replace(/\s*\(.*$/, "")),
    icone: ic,
    durees: [...new Set(durees)].sort((a, b) => a - b),
    flycoin,
    pnj,
  };
}

const lieux = [];
const combats = {};
for (const l of LIEUX) {
  const p = peuplement(l.zones);
  if (!p) {
    console.warn(`  ⚠ ${l.nom} : aucune espèce posée dans ${l.zones.join(" / ")} — écarté`);
    continue;
  }
  combats[l.clef] = releveDeCombat(l.zones);
  lieux.push({
    groupe: l.groupe,
    clef: l.clef,
    nom: l.nom,
    cartouche: l.cartouche,
    carte: carte(l.carte),
    ...p,
    objets: objetsDuLieu(l.zones),
    ticket: l.ticket ? ticketDe(l.ticket) : undefined,
  });
}

const sortie = {
  genere: new Date().toISOString().slice(0, 10),
  source: "public/wiki/monstres.json + public/wiki/ou-trouver.json + cartouches lus sur public/jeu/cartes-monde/",
  /* SUR COMBIEN DE ZONES SE COMPTE UN RANG. L'écran écrit « la plus fournie du
     jeu » : il doit pouvoir dire sur combien de zones ce « du jeu » a été compté,
     sinon c'est un superlatif sans dénominateur. Il est ici et pas répété sur
     chaque bande — c'est le même nombre pour toutes. */
  zonesDuReleve: POSES_PAR_ZONE.size,
  lieux,
};

const cible = path.join(racine, "src", "data", "lieux-hors-teleporteur.json");
fs.writeFileSync(cible, JSON.stringify(sortie, null, 1) + "\n");

/* Le relevé de combat part dans son propre fichier, SANS INDENTATION : il n'est
   jamais lu à l'œil — il est produit ici et consommé par un seul composant — et
   l'indentation lui coûtait 15 Ko de plus, c'est-à-dire la moitié de son poids. */
const cibleCombat = path.join(racine, "src", "data", "lieux-monstres.json");
fs.writeFileSync(
  cibleCombat,
  JSON.stringify({
    genere: sortie.genere,
    source: "public/wiki/monstres.json — bornes du coup, délai entre deux coups, résistances",
    lieux: combats,
  }) + "\n"
);

const totalCombat = Object.values(combats).reduce((t, c) => t + c.especes.length, 0);
/* Les bandes s'écrivent SÉPARÉMENT dans la trace, avec leur rang : c'est là qu'on
   voit d'un coup d'œil qu'un lieu porte deux peuplements et lequel est le plus
   fourni du jeu, sans ouvrir le JSON. */
const bandeCourte = (b) =>
  `${b.nivMin}–${b.nivMax}${b.origine ? ` ${b.origine}` : ""} : ${b.especes} esp., ${b.poses} empl.` +
  `${b.rangPoses ? ` (${b.rangPoses}${b.rangPoses === 1 ? "re" : "e"}/${sortie.zonesDuReleve} zones)` : ""}` +
  ` · ${b.gros.nom} ${b.gros.pv}`;
console.log(
  `${cible}\n  ${lieux.length} lieux · ` +
    lieux.map((l) => `${l.nom} (${l.especes} esp., niv ${l.nivMin}–${l.nivMax}, ${l.objets.length} objet(s))`).join(" · ") +
    lieux
      .filter((l) => l.bandes.length > 1)
      .map((l) => `\n  ${l.nom} — ${l.bandes.length} peuplements · ${l.bandes.map(bandeCourte).join(" | ")}`)
      .join("") +
    `\n${cibleCombat}\n  ${totalCombat} créatures relevées · ${(fs.statSync(cibleCombat).size / 1024).toFixed(1)} Ko`
);
