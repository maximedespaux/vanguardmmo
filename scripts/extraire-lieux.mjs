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
 * `zones` est un tableau parce qu'un lieu peut en compter deux : Azria porte
 * « Azria » (trois capitaines de niveau 190 à 210) ET « Azria 2 » (huit espèces
 * de 73 à 115) — la même île, deux paliers. Les fondre donnerait un intervalle
 * de niveaux trompeur, donc on garde le détail par zone à côté du total.
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

/** Le peuplement d'une zone : ce qui décide si le lieu vaut d'être montré. */
/**
 * LES MONSTRES D'EXPÉRIENCE NE SONT PAS UN PALIER DE LA ZONE.
 *
 * ┌──────────── LE DÉFAUT QUE CETTE RÈGLE CORRIGE ────────────┐
 * │ La fiche d'Azria annonçait « du niveau 73 au 210 », en    │
 * │ deux paliers disjoints : 8 espèces de 73 à 115, puis      │
 * │ 3 de 190 à 210. Le second n'existe pas comme zone. Ses    │
 * │ trois créatures portent les identifiants MI_EXP_190,      │
 * │ MI_EXP_200 et MI_EXP_210 — ce sont des monstres           │
 * │ D'EXPÉRIENCE qu'Airborn a posés sur la carte enneigée,    │
 * │ pas une tranche de progression. Maxime, qui y joue, l'a   │
 * │ dit : « Azria c'est la dernière zone, 73-114, y'a pas ».  │
 * │ Le relevé lui donnait tort ; c'est la LECTURE du relevé   │
 * │ qui était fausse.                                          │
 * └────────────────────────────────────────────────────────────┘
 *
 * La règle se lit dans la donnée, elle n'est pas écrite pour Azria : le préfixe
 * `MI_EXP_` désigne la famille. Vérifié — il n'en existe QUE TROIS dans tout le
 * jeu, les trois sur Azria, les trois marqués contenu du serveur. Le jour où le
 * serveur en pose ailleurs, ils seront traités pareil sans qu'on y touche.
 *
 * ILS NE DISPARAISSENT PAS POUR AUTANT : ils sortent des niveaux DE LA ZONE et
 * reviennent dans leur propre champ. Trois monstres à 190, 200 et 210 posés pour
 * farmer l'expérience, c'est exactement ce qu'un joueur de ce niveau cherche —
 * et ça ne se devine pas en regardant une carte de zone 73-115.
 */
const estMonstreDExperience = (m) => /^MI_EXP_/i.test(m.id ?? "");

function peuplement(zones) {
  const dansLaZone = MONSTRES.filter((m) => (m.lieux ?? []).some((l) => zones.includes(l.z)));
  const especes = dansLaZone.filter((m) => !estMonstreDExperience(m));
  const experience = dansLaZone.filter(estMonstreDExperience);
  if (!especes.length) return null;
  const poses = especes.reduce(
    (t, m) => t + (m.lieux ?? []).filter((l) => zones.includes(l.z)).reduce((s, l) => s + (l.n ?? 0), 0),
    0
  );
  // Le plus gros sac de points de vie, en PV EFFECTIFS : un adversaire à
  // plusieurs vies ne meurt pas quand sa barre atteint zéro.
  const gros = especes.reduce((a, m) => ((m.pvEff ?? m.pv) > (a.pvEff ?? a.pv) ? m : a), especes[0]);
  const nb = (m) => (m.lieux ?? []).filter((l) => zones.includes(l.z)).reduce((s, l) => s + (l.n ?? 0), 0);
  return {
    especes: especes.length,
    poses,
    nivMin: Math.min(...especes.map((m) => m.niv)),
    nivMax: Math.max(...especes.map((m) => m.niv)),
    gros: { nom: reparer(gros.nom), niv: gros.niv, pv: gros.pvEff ?? gros.pv, rang: gros.rang, poses: nb(gros) },
    paliers: paliersDe(zones),
    /* Absent quand il n'y en a pas — un champ vide sur sept lieux sur huit
       ferait croire à un renseignement manquant plutôt qu'à une absence. */
    ...(experience.length
      ? {
          monstresDExperience: experience
            .sort((a, b) => (a.niv ?? 0) - (b.niv ?? 0))
            .map((m) => ({ nom: reparer(m.nom), niv: m.niv, pv: m.pvEff ?? m.pv, poses: nb(m) })),
        }
      : {}),
  };
}

/**
 * LE RELEVÉ DE COMBAT — ce que chaque créature du lieu fait comme dégâts.
 *
 * ┌──── POURQUOI UN SECOND FICHIER, ET PAS TROIS CLÉS DE PLUS ────┐
 * │ La tuile d'un lieu tient dans 7 Ko pour les huit. Le relevé de │
 * │ combat, lui, pèse 102 créatures × (bornes du coup, délai,      │
 * │ cinq résistances) : mesuré, 27 Ko. Or `lieux-hors-teleporteur` │
 * │ est importé par un composant CLIENT — le fondre dedans aurait  │
 * │ ajouté ces 27 Ko au paquet de /donjons pour tout le monde, y   │
 * │ compris pour qui n'ouvre jamais un panneau. Dans son propre    │
 * │ fichier, il n'est chargé qu'à l'ouverture du premier panneau.  │
 * │ C'est la même raison qui a sorti les 12 Ko de vagues de l'Oasis│
 * │ du paquet (cf. app/(public)/donjons/donnees.ts).               │
 * └────────────────────────────────────────────────────────────────┘
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
  const dansLaZone = MONSTRES.filter((m) => (m.lieux ?? []).some((l) => zones.includes(l.z)));
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
  const especes = dansLaZone.filter((m) => !estMonstreDExperience(m)).map(fiche).sort(parMenace);
  const experience = dansLaZone.filter(estMonstreDExperience).map(fiche).sort((a, b) => a.niv - b.niv);
  return { especes, ...(experience.length ? { experience } : {}) };
}

/**
 * LE DÉTAIL PAR ZONE, quand il dit quelque chose de plus.
 *
 * Deux conditions, et la seconde a été apprise à l'usage : il faut plusieurs
 * zones, et il faut qu'elles ne partagent AUCUNE espèce. Volcane est posée dans
 * « Ile Volcanique - Volcane » ET dans « DuVolcaneRed » — les deux mêmes
 * créatures des deux côtés. Le détail y affichait deux lignes identiques, dont
 * une portant un nom interne de carte qui n'a rien à faire à l'écran. Azria, à
 * l'inverse, a deux paliers vraiment distincts (73–115, puis 190–210) et c'est
 * l'information la plus utile de sa fiche.
 */
function paliersDe(zones) {
  if (zones.length < 2) return undefined;
  /* Les monstres d'expérience sont écartés ICI AUSSI, et c'est le point : c'est
     ce découpage qui fabriquait le faux palier « Azria 190–210 ». Sans ce
     filtre, la zone « Azria » ne contient plus qu'eux, et un lieu se retrouve
     annoncé jusqu'au niveau 210 alors qu'il s'arrête à 115. */
  const parZone = zones.map((z) => ({
    zone: z,
    especes: MONSTRES.filter((m) => !estMonstreDExperience(m) && (m.lieux ?? []).some((l) => l.z === z)),
  }));
  /* Une zone vidée par ce filtre ne produit plus de palier du tout — c'est le
     cas d'Azria, dont la seconde zone ne portait que les trois MI_EXP_. La fiche
     retombe donc sur son intervalle unique, 73–115, qui est le vrai. */
  if (parZone.some((p) => !p.especes.length)) return undefined;
  const ids = parZone.map((p) => new Set(p.especes.map((m) => m.id)));
  const partage = ids.some((a, i) => ids.some((b, j) => i !== j && [...a].some((x) => b.has(x))));
  if (partage) return undefined;
  return parZone.map((p) => ({
    zone: p.zone,
    especes: p.especes.length,
    nivMin: Math.min(...p.especes.map((m) => m.niv)),
    nivMax: Math.max(...p.especes.map((m) => m.niv)),
  }));
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

const totalCombat = Object.values(combats).reduce((t, c) => t + c.especes.length + (c.experience?.length ?? 0), 0);
console.log(
  `${cible}\n  ${lieux.length} lieux · ` +
    lieux.map((l) => `${l.nom} (${l.especes} esp., niv ${l.nivMin}–${l.nivMax}, ${l.objets.length} objet(s))`).join(" · ") +
    `\n${cibleCombat}\n  ${totalCombat} créatures relevées · ${(fs.statSync(cibleCombat).size / 1024).toFixed(1)} Ko`
);
