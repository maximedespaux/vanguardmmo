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
// ┌──────────── CE QUI FAIT ENTRER UN LIEU, ET DANS QUEL ORDRE ─────────────┐
// │ 1. LE PEUPLEMENT — obligatoire, et c'est la seule condition qui l'est.   │
// │    `public/wiki/monstres.json` doit poser des espèces dans une zone      │
// │    portant exactement le nom du lieu. Sans peuplement, on ne montre pas  │
// │    le lieu : une carte seule ne dit ni le niveau, ni ce qu'on y croise.  │
// │ 2. LA PREUVE DU NOM — le CARTOUCHE quand il y en a un. Chaque parchemin  │
// │    porte son nom IMPRIMÉ en bas à droite, et c'est la seule preuve qui   │
// │    vaille : les noms de FICHIERS mentent — `town_oasis.webp` affiche     │
// │    « Tour Oubliée B5 », et `dungeon_sanpres_1.webp` affiche « USS        │
// │    Darkon », pas « USS Celestia ».                                       │
// │                                                                          │
// │ CETTE HIÉRARCHIE A ÉTÉ INVERSÉE, ET ÇA COÛTAIT CHER. Les deux preuves    │
// │ étaient d'abord exigées ensemble. Résultat : les DEUX ZONES LES PLUS     │
// │ FOURNIES DU JEU — le Parc prestigieux et le Royaume de Kaelis, 12 472    │
// │ emplacements à elles deux, trois fois Azria — restaient invisibles sur   │
// │ le site parce que le client n'a pas dessiné de parchemin pour ses        │
// │ propres mondes. Un dessin manquant n'est pas un lieu manquant. Quand le  │
// │ cartouche n'existe pas, la preuve du nom est le client lui-même :        │
// │ `World.inc` titre ces mondes mot pour mot.                               │
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

/**
 * Même règle pour les cartes : une carte annoncée et absente casserait la page.
 *
 * ┌──── ET UN LIEU PEUT N'EN AVOIR AUCUNE ────┐
 * │ Les 50 cartes sur parchemin du client ont │
 * │ été relues une à une, cartouche par        │
 * │ cartouche : AUCUNE ne porte « Parc         │
 * │ prestigieux » ni « Royaume de Kaelis ».    │
 * │ Ces deux mondes sont des ajouts d'Airborn  │
 * │ (`Wd1v1Pre`, `WdAoePre`, `WdMap1`,         │
 * │ `WdMap2` dans World.inc) et le jeu ne leur │
 * │ a pas dessiné de parchemin.                │
 * │ On les montre donc SANS carte plutôt qu'en │
 * │ leur prêtant celle d'un voisin : une carte │
 * │ approchante ferait chercher un décor qui   │
 * │ n'est pas le bon, et le cartouche — la     │
 * │ seule preuve du nom — dirait autre chose.  │
 * └────────────────────────────────────────────┘
 */
function carte(fichier) {
  if (!fichier) return null;
  if (!fs.existsSync(path.join(DOSSIER_CARTES, fichier))) {
    throw new Error(`carte absente : public/jeu/cartes-monde/${fichier}`);
  }
  return `/jeu/cartes-monde/${fichier}`;
}

/**
 * LES DIX LIEUX, avec pour chacun le nom IMPRIMÉ sur sa carte et les zones de
 * la table des monstres qui portent ce nom.
 *
 * ┌──────── DEUX LIEUX SANS CARTE, ET C'EST LE PLUS GROS DU RELEVÉ ────────┐
 * │ Le Parc prestigieux (6 400 emplacements) et le Royaume de Kaelis      │
 * │ (6 072) n'apparaissaient NULLE PART sur le site. Ensemble ils pèsent  │
 * │ 12 472 emplacements de réapparition, trois fois Azria — et ce sont    │
 * │ les deux premières zones du relevé.                                    │
 * │ Ils n'entraient pas parce que la règle d'admission de ce fichier       │
 * │ exigeait DEUX preuves : un cartouche de carte ET un peuplement. La     │
 * │ seconde est là et déborde ; la première n'existe pas — le client n'a   │
 * │ pas dessiné de parchemin pour ses propres mondes. Exiger la carte      │
 * │ revenait à faire disparaître le contenu le plus fourni du serveur      │
 * │ parce qu'il est trop récent pour avoir un dessin.                      │
 * │ La règle devient donc : le PEUPLEMENT est obligatoire, la carte est    │
 * │ une preuve de nom quand elle existe. Pour ces deux-là, la preuve de    │
 * │ nom est le client lui-même — World.inc les titre mot pour mot.         │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * `zones` est un tableau parce qu'un lieu peut en compter deux. Trois cas, et ils
 * ne veulent PAS dire la même chose :
 *   · Volcane est posée sous « Ile Volcanique - Volcane » ET « DuVolcaneRed » —
 *     les deux mêmes espèces des deux côtés. Deux noms internes, un peuplement.
 *   · Azria porte « Azria 2 » (huit espèces de 73 à 115) ET « Azria » (trois de
 *     190 à 210). Une carte, DEUX PEUPLEMENTS, séparés de soixante-quinze
 *     niveaux — voir `peuplementsDe()`, qui les distingue sur la PROVENANCE et
 *     non sur ces noms de zone.
 *   · Le Parc prestigieux et le Royaume de Kaelis portent chacun deux zones qui
 *     ne diffèrent QUE par un suffixe : « … 1v1 » et « … AoE ». Ce n'est ni un
 *     nom interne de plus ni un second peuplement — c'est LE MÊME ENDROIT joué de
 *     deux façons, et le client vend un ticket par façon. Voir `modesDe()`.
 * Les fondre en un seul intervalle donnerait « du niveau 73 au 210 » et ferait
 * croire à une progression continue ; n'en garder qu'un ferait disparaître le
 * farm de fin de jeu du serveur — 4 130 emplacements, 3ᵉ lieu du relevé.
 *
 * ┌──── LES CITATIONS DU CLIENT SE RECOPIENT, ELLES NE SE RÉSUMENT PAS ────┐
 * │ `cartouche` est depuis toujours une citation : le nom lu sur l'image.   │
 * │ `acces` en est une autre, du même genre — les noms d'objets et les      │
 * │ phrases du client d'août 2026, recopiés mot pour mot avec le fichier    │
 * │ d'où ils sortent. Rien d'autre n'est écrit à la main : la DURÉE d'un    │
 * │ ticket se lit dans son nom, le MODE qu'il ouvre se lit dans son nom,    │
 * │ et le nombre de billets se compte. Une citation qu'on abrège cesse      │
 * │ d'être vérifiable ; un nombre qu'on recopie devient faux en silence.    │
 * └────────────────────────────────────────────────────────────────────────┘
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
    /* KAELIS EST UNE ZONE À TICKET, ET C'EST PROUVÉ PAR LE MÊME FICHIER QUE LES
       QUATRE AUTRES. `PaidWorldTicket.txt` du client d'août 2026 relie
       `II_SYS_TICKET_KAELIS` au monde 10 et `II_SYS_TICKET_KAELIS_2` au monde 11,
       exactement comme il relie les tickets d'Azria, de l'Île Corail, de Rartesia
       et de Sombrésia à leurs mondes. `PaidWorldSet.txt` nomme ces deux mondes
       WI_KAELIS et WI_KAELIS_2, que World.inc titre « Royaume de Kaelis 1v1 » et
       « Royaume de Kaelis Aoe » — les deux noms de zone du relevé, au caractère
       près, espace parasite comprise. */
    groupe: "ticket",
    clef: "kaelis",
    nom: "Royaume de Kaelis",
    /* PAS DE CARTE : les 50 parchemins du client ont été relus, aucun cartouche ne
       porte ce nom. La preuve de nom est World.inc, qui titre les deux mondes. */
    cartouche: null,
    zones: ["Royaume de Kaelis 1v1 ", "Royaume de Kaelis Aoe"],
    acces: {
      /* DEUX BILLETS, UN PAR MODE — et c'est la preuve la plus nette que « 1v1 » et
         « AoE » ne sont pas deux endroits mais deux façons : on n'achète pas le
         même papier. Les noms sont ceux de propitem.txt.txt, recopiés entiers ;
         la durée et le mode s'en lisent, ils ne sont pas ressaisis. */
      billets: ["Rêve de Kaelis 1v1 (2h)", "Rêve de Kaelis AoE (2h)"],
      icone: "Itm_ticketkaelis.png",
      ou: "chez Rukas, à l'Oasis",
      /* Ce que le client écrit du ticket, mot pour mot. Il dit à quoi sert la zone,
         et c'est lui qui autorise le bloc « ce qu'on en rapporte » plus bas. */
      dit: "Ticket vous permettant de plonger dans le rêve de Kaelis pendant 2h. (Zone d'obtention des Gemmes rares, Pierre Jupiter et parchemins destinés au sertissage des tenues fashion)",
      source: "PaidWorldTicket.txt et propitem.txt.txt, client d'août 2026",
    },
  },
  {
    /* LE PARC PRESTIGIEUX N'A NI CARTE NI PORTE DOCUMENTÉE, ET IL EST POURTANT LA
       ZONE LA PLUS FOURNIE DU JEU. World.inc titre trois mondes voisins :
       « Entrée des parcs prestigieux » (WdMarket), « Parc prestigieux 1v1 »
       (Wd1v1Pre) et « Parc prestigieux AoE » (WdAoePre). Le premier est un hall :
       son nom est au PLURIEL parce qu'il ouvre sur les deux autres. Mais aucun
       fichier du client ne dit comment on arrive dans ce hall — il n'est ni dans
       PaidWorldSet.txt, ni dans teleporter.xml. C'est la même porte que les quatre
       cartes du bas : non documentée.

       ┌──── « PARC » ET « JARDIN » NE DÉSIGNENT PAS LA MÊME CHOSE ────┐
       │ Le client écrit « Parc prestigieux » pour CES deux mondes, et  │
       │ « Jardin prestigieux » dans huit descriptions d'objets de      │
       │ prestige — qui nomment leurs monstres : Esclave des fourmis,   │
       │ Garde fourmi d'Yggdrasil, Araignée Mutante, Reine fourmi. Or   │
       │ le relevé pose ces quatre-là dans la Fôret de Faelea, pas ici :│
       │ ici il n'y a QUE la Fleur de nucléus. Les deux noms se          │
       │ ressemblent, les deux peuplements n'ont rien de commun. On ne   │
       │ recopie donc pas ici ce que le wiki écrit du « Jardin           │
       │ Prestigieux » : ce serait décrire un autre endroit.             │
       └────────────────────────────────────────────────────────────────┘ */
    groupe: "client",
    clef: "parc-prestigieux",
    nom: "Parc prestigieux",
    cartouche: null,
    zones: ["Parc prestigieux 1v1", "Parc prestigieux AoE"],
    acces: {
      /* Le hall d'entrée, cité tel que World.inc le titre. Ce n'est pas un détail
         de comptabilité : il change où l'on cherche. Sans lui on guette une
         destination au téléporteur, qui ne la propose pas ; avec lui on sait
         qu'il existe un sas, et que son nom est au pluriel parce qu'il ouvre sur
         les deux modes. */
      hall: "Entrée des parcs prestigieux",
      source: "World.inc, client d'août 2026",
    },
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
 * dix lieux de cette page : un superlatif calculé sur dix lignes ne vaudrait
 * que pour ces dix lignes, et l'écran dirait « du jeu ».
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
/**
 * LES DEUX FAÇONS DE JOUER UN MÊME ENDROIT, telles que le client les suffixe.
 *
 * La liste est écrite UNE fois : `SANS_MODE` s'en sert pour regrouper, `modeDe`
 * pour nommer. Sans ça les deux règles auraient fini par diverger — et le client
 * n'écrit déjà pas ces suffixes de la même façon d'un monde à l'autre :
 * « Parc prestigieux AoE » avec un E majuscule, « Royaume de Kaelis Aoe » sans,
 * et « Royaume de Kaelis 1v1 » avec une espace de fin. La comparaison est donc
 * insensible à la casse, et le nom RENDU est la forme canonique de cette liste :
 * le mode est un terme de jeu (« en un contre un », « en zone »), pas un
 * cartouche qu'on citerait tel quel.
 */
const MODES = ["1v1", "AoE"];
const FIN_DE_MODE = new RegExp(`\\s*(${MODES.join("|")})\\s*$`, "i");
const SANS_MODE = (z) => (z ?? "").replace(FIN_DE_MODE, "").trim();
/** Le mode d'une zone, dans sa forme canonique, ou `null` si elle n'en porte pas. */
const modeDe = (z) => {
  const m = (z ?? "").match(FIN_DE_MODE);
  return m ? MODES.find((x) => x.toLowerCase() === m[1].toLowerCase()) ?? m[1] : null;
};

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
  /* LE RANG N'EST ÉCRIT QUE S'IL EST COMPARABLE. Il se compare aux totaux de
     `POSES_PAR_ZONE`, qui compte PAR ENDROIT — les suffixes de mode y sont déjà
     retirés. Le test doit donc l'être aussi : une bande étalée sur « … 1v1 » et
     « … AoE » est UN endroit et se compare, quand une bande étalée sur deux noms
     internes différents (Volcane, posée sous « Ile Volcanique - Volcane » et
     « DuVolcaneRed ») n'en est pas un et n'a pas de rang.
     Comparer les noms bruts faisait perdre son rang au lieu le plus fourni du jeu
     — le Parc prestigieux, 1ᵉʳ sur les 63 zones du relevé — pour la seule raison
     qu'il se joue de deux façons. Clé absente = rien à comparer, l'écran
     n'affiche alors rien. */
  const sesZones = new Set(
    g.liste.flatMap((m) => (m.lieux ?? []).filter((l) => zones.includes(l.z)).map((l) => SANS_MODE(l.z)))
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
 * LES MODES D'UN LIEU — le même endroit, joué de deux façons.
 *
 * ┌──────── CE QUE NI LA CARTE NI LE PEUPLEMENT NE DISENT ────────┐
 * │ Un lieu peut porter deux zones qui ne diffèrent QUE par un    │
 * │ suffixe de mode. Ce ne sont pas deux endroits : c'est le même │
 * │ endroit, et le client vend un ticket pour chacun. Les fondre  │
 * │ en un seul total (ce que fait `bandes`, à juste titre, pour   │
 * │ classer le lieu) ferait disparaître le seul renseignement qui │
 * │ ne se devine PAS d'une carte : ce qui change quand on change  │
 * │ de mode.                                                       │
 * │                                                                │
 * │ Et il change. Relevé, jamais écrit :                          │
 * │   Royaume de Kaelis — les quatre espèces de piétaille passent │
 * │     de 55 M à 39 M de PV entre le 1v1 et l'AoE ; les quatre    │
 * │     boss, eux, ne bougent pas.                                 │
 * │   Parc prestigieux — la Fleur de nucléus passe du niveau 199   │
 * │     à 198 et de 2,5 M à 2 M de PV.                             │
 * │ C'est exactement le genre de chose qu'on ne devine pas depuis  │
 * │ une carte, et ici il n'y a même pas de carte.                  │
 * └────────────────────────────────────────────────────────────────┘
 *
 * `rangPoses` N'EST PAS REPRIS SUR UN MODE, et c'est le même arbitrage qu'ailleurs :
 * le rang se compare à des totaux PAR ENDROIT. Le rang d'une moitié de lieu
 * classerait le Parc prestigieux derrière Azria alors qu'il la dépasse — c'est
 * précisément l'erreur que `SANS_MODE` a été écrit pour corriger.
 */
function modesDe(zones) {
  if (zones.length < 2 || !zones.every((z) => modeDe(z))) return null;
  const modes = zones
    .map((z) => {
      const liste = MONSTRES.filter((m) => (m.lieux ?? []).some((l) => l.z === z));
      if (!liste.length) return null;
      const { especes, poses, nivMin, nivMax, gros } = detailBande({ liste }, [z]);
      /* ┌──── LES DEUX BOUTS, ET PAS SEULEMENT LE PLUS GROS ────┐
         │ Comparer les deux modes sur leur seul « plus coriace » │
         │ ne montrait RIEN au Royaume de Kaelis : ses quatre     │
         │ boss pèsent 9 Md des deux côtés, à l'unité près. Ce    │
         │ qui change, c'est la PIÉTAILLE — 110 M en 1v1, 78 M en │
         │ AoE. Un écart nul sur un bout ne veut pas dire que les │
         │ deux modes se valent : il veut dire qu'on regardait le │
         │ mauvais bout.                                          │
         │ `petit` n'est écrit que s'il désigne une AUTRE créature │
         │ que `gros` — au Parc prestigieux il n'y a qu'une espèce │
         │ par mode, et deux fois le même nombre n'est pas une     │
         │ comparaison.                                           │
         └────────────────────────────────────────────────────────┘ */
      const pvDe = (m) => m.pvEff ?? m.pv;
      const bas = liste.reduce((a, m) => (pvDe(m) < pvDe(a) ? m : a), liste[0]);
      return {
        nom: modeDe(z), especes, poses, nivMin, nivMax, gros,
        ...(pvDe(bas) < gros.pv
          ? { petit: { nom: reparer(bas.nom), niv: bas.niv, pv: pvDe(bas), rang: bas.rang } }
          : {}),
      };
    })
    .filter(Boolean);
  /* Un seul mode peuplé ne se compare à rien : on n'annonce pas « deux façons »
     quand une seule est habitée. */
  return modes.length > 1 ? modes : null;
}

/**
 * LE PEUPLEMENT D'UN LIEU : ce qui décide s'il vaut d'être montré, et ses bandes.
 *
 * `bandes` est TOUJOURS écrit, même quand il n'y en a qu'une : l'écran a alors un
 * seul chemin de dessin, donc un seul comportement à vérifier. Les totaux du
 * dessus (espèces, emplacements, bornes) couvrent la carte ENTIÈRE — ils se
 * rendent tels quels dans l'en-tête du panneau et dans le tri de l'échelle.
 *
 * `modes` est une clé DE PLUS, pas un remplacement de `bandes` : les deux
 * découpent le même peuplement selon deux questions différentes — « d'où ça
 * vient » pour l'une, « comment on y joue » pour l'autre. Aucun lieu du relevé
 * ne porte les deux à la fois, mais rien n'interdirait qu'un lieu le fasse un
 * jour, et l'écran s'en sortirait.
 */
function peuplement(zones) {
  const groupes = peuplementsDe(zones);
  if (!groupes.length) return null;
  const bandes = groupes.map((g) => detailBande(g, zones));
  const modes = modesDe(zones);
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
    ...(modes ? { modes } : {}),
  };
}

/**
 * LE RELEVÉ DE COMBAT — ce que chaque créature du lieu fait comme dégâts.
 *
 * ┌───── POURQUOI UN SECOND FICHIER, ET PAS TROIS CLÉS DE PLUS ─────┐
 * │ La tuile d'un lieu tient dans 7 Ko pour les huit. Le relevé de  │
 * │ combat, lui, pèse 120 créatures × (bornes du coup, délai,       │
 * │ cinq résistances) : mesuré, 25 Ko. Or `lieux-hors-teleporteur`  │
 * │ est importé par un composant CLIENT — le fondre dedans aurait   │
 * │ ajouté ces 25 Ko au paquet de /donjons pour tout le monde, y    │
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
 *   · `vole` — les 120 créatures de ces dix lieux sont au sol. Une pastille vraie
 *     zéro fois sur 102 n'est pas un renseignement.
 *   · `agro` — les 102 sont agressives. Idem.
 *   · l'expérience et la penya : elles restent dans le relevé source, elles ne
 *     montent pas ici. Règle de la maison.
 *
 * `vies` n'est écrit QUE s'il dépasse 1. C'était une clause en réserve — aucune
 * créature ne se relevait dans les huit premiers lieux — et le Royaume de Kaelis
 * vient l'activer : ses SEIZE espèces se relèvent, 2 fois pour la piétaille et
 * 6 fois pour les boss. `pv1` part avec, parce que c'est LUI que la barre de vie
 * du jeu affiche : un boss annoncé à 1,5 Md en demande 9. Sans les deux nombres
 * côte à côte, le relevé et l'écran de jeu se contrediraient sans qu'on sache
 * lequel croire.
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
    // `pv1` = ce que la barre du jeu annonce, une seule vie. Écrit seulement quand
    // il diffère de `pv`, sinon c'est le même nombre deux fois.
    ...((m.vies ?? 1) > 1 ? { vies: m.vies, pv1: m.pv } : {}),
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
       │ le premier relevé de ces dix lieux, lui, n'en disait rien —   │
       │ alors que 33 de ses 120 créatures entrent en rage et que 6 se  │
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
  /* ET DE QUEL MODE. Même parti pris que pour la bande : une seule liste, une clé
     de plus. Le mode d'une créature se lit dans le nom de SA zone, il n'est pas
     déduit de son propre nom — huit des seize créatures de Kaelis portent bien
     « 1v1 » ou « AoE » dans leur nom, mais le Faucheur de Grenat, lui, n'en porte
     pas alors qu'il est posé dans le 1v1. Se fier au nom du monstre l'aurait rangé
     nulle part. */
  const modes = modesDe(zones);
  const rangDuMode = (m) => {
    if (!modes) return {};
    const sienne = (m.lieux ?? []).find((l) => zones.includes(l.z));
    const i = modes.findIndex((x) => x.nom === modeDe(sienne?.z));
    return i >= 0 ? { mode: i } : {};
  };
  const especes = groupes
    .flatMap((g, i) => g.liste.map((m) => ({
      ...fiche(m),
      ...(groupes.length > 1 ? { bande: i } : {}),
      ...rangDuMode(m),
    })))
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
  /* LE NOM DE ZONE SANS SON SUFFIXE DE MODE COMPTE AUSSI : personne n'écrit
     « Royaume de Kaelis AoE » dans une description d'objet, on y écrit le lieu.
     Sur les huit lieux qui n'en ont pas, `SANS_MODE` est l'identité et rien ne change. */
  const cles = [...new Set(zones.flatMap((z) => [z, SANS_MODE(z)]))].map(sansAccent);
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
 * CE QUE LA ZONE ALIMENTE — et pourquoi ce n'est PAS la même liste que ci-dessus.
 *
 * ┌──────── LE CAS QUI A OBLIGÉ À DEUX LISTES ────────┐
 * │ Les quatre gemmes de sertissage et la Pierre      │
 * │ Jupiter ne se ramassent pas au sol : elles se     │
 * │ FABRIQUENT, dix morceaux pour une, chez un PNJ    │
 * │ dont l'enseigne est « [Souvenir de Kaelis]        │
 * │ Apprenti Rukas ». Aucune source ne nomme donc une │
 * │ zone, et `objetsDuLieu` les rate toutes les cinq. │
 * │ Or c'est LA raison d'aller là-bas : le client     │
 * │ l'écrit sur le ticket lui-même — « Zone           │
 * │ d'obtention des Gemmes rares, Pierre Jupiter et   │
 * │ parchemins destinés au sertissage des tenues      │
 * │ fashion ».                                         │
 * └────────────────────────────────────────────────────┘
 *
 * LA RÈGLE NE NOMME AUCUN LIEU : un objet dont un CRAFT se fait chez un PNJ dont
 * l'enseigne porte un mot distinctif du lieu (cinq lettres au moins, aux
 * frontières de mot) appartient à ce lieu. Les deux garde-fous sont payés :
 *   · cinq lettres au moins — « Mine de Mas » n'a aucun mot assez long, et c'est
 *     tant mieux : sans cette borne, « mas » attrapait sept « Masque ».
 *   · aux frontières de mot — sans elles, « mas » attrapait « Masque » quand
 *     même.
 * Vérifiée sur les dix lieux : zéro correspondance sur neuf, cinq sur Kaelis.
 *
 * ELLE DIT « ALIMENTE », PAS « TOMBE ICI », et la nuance change le geste : on ne
 * cherche pas une gemme au sol, on cherche des MORCEAUX et on va voir Rukas. Le
 * détail de l'échange est sur la fiche de chaque objet, où il vit déjà.
 */
function alimenteLe(nom) {
  const mots = sansAccent(nom).split(/[^a-z0-9]+/).filter((w) => w.length >= 5);
  if (!mots.length) return [];
  const vus = new Map();
  for (const o of OU_TROUVER) {
    for (const s of o.sources ?? []) {
      if (s.type !== "craft") continue;
      const enseigne = sansAccent(s.pnj ?? "");
      if (!mots.some((w) => new RegExp(`\\b${w}\\b`).test(enseigne))) continue;
      const n = reparer(o.nom);
      if (!vus.has(n)) vus.set(n, { nom: n, icone: icone(o.icone), pnj: s.pnj ?? null });
    }
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

/**
 * LE TICKET QU'ON NE PEUT PAS LIRE DANS `ou-trouver` — celui du client.
 *
 * Le Rêve de Kaelis n'a AUCUNE ligne dans `ou-trouver.json` : ce ticket ne
 * s'achète pas au FLY SHOP et ne se fabrique pas dans `Exchange_Script.txt`. Le
 * client, lui, le nomme deux fois dans `propitem.txt.txt` et le relie à ses deux
 * mondes dans `PaidWorldTicket.txt`. La déclaration du lieu recopie donc ces noms
 * — et RIEN D'AUTRE : la durée se lit dans le nom, le mode se lit dans le nom, le
 * nombre de billets se compte. Si demain le client renomme ses tickets, ce qui est
 * ici devient faux et visible ; ce qui est calculé suit tout seul.
 */
function ticketDuClient(acces) {
  if (!acces?.billets?.length) return null;
  const heures = [...new Set(
    acces.billets.map((n) => Number((n.match(/\((\d+)\s*h\)/i) ?? [])[1])).filter(Boolean)
  )].sort((a, b) => a - b);
  return {
    // Le nom nu, ce que les billets ont en commun : le suffixe de mode et la durée
    // sont retirés parce que chaque billet les porte déjà.
    nom: acces.billets[0].replace(new RegExp(`\\s*(${MODES.join("|")})\\s*\\(.*$`, "i"), "").trim(),
    icone: icone(acces.icone),
    durees: [],
    heures,
    /* UN BILLET PAR MODE, et le mode se LIT dans le nom du billet. C'est ce qui
       prouve que « 1v1 » et « AoE » ne sont pas deux endroits : deux papiers
       différents pour une même destination, ça ne se fait pas. */
    billets: acces.billets.map((nom) => ({
      nom,
      mode: MODES.find((m) => new RegExp(`\\b${m}\\b`, "i").test(nom)) ?? null,
    })),
    flycoin: null,
    pnj: null,
    ou: acces.ou ?? null,
    dit: acces.dit ?? null,
    source: acces.source ?? null,
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
  const alimente = alimenteLe(l.nom);
  lieux.push({
    groupe: l.groupe,
    clef: l.clef,
    nom: l.nom,
    /* Une clé absente veut dire « rien à montrer », partout dans ce fichier : deux
       lieux n'ont ni carte ni cartouche, et l'écran ne doit pas leur inventer de
       cadre vide. */
    ...(l.cartouche ? { cartouche: l.cartouche } : {}),
    ...(l.carte ? { carte: carte(l.carte) } : {}),
    ...p,
    objets: objetsDuLieu(l.zones),
    ...(alimente.length ? { alimente } : {}),
    /* Le hall d'entrée que le client nomme, quand il en nomme un. Ce n'est pas un
       ticket : on ne sait toujours pas comment on y arrive, mais on sait qu'il
       existe et comment il s'appelle — donc où le chercher. */
    ...(l.acces?.hall ? { hall: { nom: l.acces.hall, source: l.acces.source ?? null } } : {}),
    ticket: l.ticket ? ticketDe(l.ticket) : ticketDuClient(l.acces) ?? undefined,
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
/* Les modes s'écrivent eux aussi dans la trace : c'est là qu'on vérifie d'un coup
   d'œil que les deux façons de jouer un même endroit ne portent PAS les mêmes
   nombres — sans quoi les distinguer à l'écran n'apprendrait rien. */
const modeCourt = (m) =>
  `${m.nom} : ${m.especes} esp., ${m.poses} empl., niv ${m.nivMin}${m.nivMin === m.nivMax ? "" : `–${m.nivMax}`}` +
  ` · ${m.gros.nom} ${m.gros.pv}`;
console.log(
  `${cible}\n  ${lieux.length} lieux · ` +
    lieux.map((l) => `${l.nom} (${l.especes} esp., niv ${l.nivMin}–${l.nivMax}, ${l.objets.length} objet(s)${l.carte ? "" : ", sans carte"})`).join(" · ") +
    lieux
      .filter((l) => l.bandes.length > 1)
      .map((l) => `\n  ${l.nom} — ${l.bandes.length} peuplements · ${l.bandes.map(bandeCourte).join(" | ")}`)
      .join("") +
    lieux
      .filter((l) => l.modes?.length)
      .map((l) => `\n  ${l.nom} — ${l.modes.length} modes · ${l.modes.map(modeCourt).join(" | ")}`)
      .join("") +
    lieux
      .filter((l) => l.alimente?.length)
      .map((l) => `\n  ${l.nom} — alimente ${l.alimente.length} objet(s) : ${l.alimente.map((o) => o.nom).join(", ")}`)
      .join("") +
    `\n${cibleCombat}\n  ${totalCombat} créatures relevées · ${(fs.statSync(cibleCombat).size / 1024).toFixed(1)} Ko`
);
