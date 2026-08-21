#!/usr/bin/env node
/*
 * EXTRAIT LES FAITS DU WIKI OFFICIEL D'AIRBORN — ET LES CONFRONTE AU RELEVÉ DU CLIENT.
 *
 * ┌──── CE QU'ON PREND, ET CE QU'ON LAISSE ─────────────────────────────────────┐
 * │ On prend les CHIFFRES, les SEUILS, les TABLES, les CONDITIONS. On ne prend  │
 * │ pas les paragraphes : ils appartiennent à leurs auteurs, et le site dit les │
 * │ choses avec sa propre voix. Aucune phrase du wiki n'est recopiée dans le    │
 * │ relevé ; ce qui y figure, ce sont des valeurs et l'adresse de la page qui   │
 * │ les porte.                                                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * TROIS TRAVAUX, DANS CET ORDRE :
 *
 *  1. LES INSTANCES SE LISENT TOUTES SEULES. Les 24 pages d'instance ont la même
 *     ossature (niveau minimum · PV pour le tank · élément d'armure · type · butin ·
 *     fréquence). On les analyse au lieu de les retaper : une valeur mal lue se voit
 *     dans le compte final, une valeur retapée ne se voit pas.
 *
 *  2. LES FAITS DE MÉCANIQUE SONT TRANSCRITS — MAIS CHACUN PORTE SES PREUVES. Une
 *     mécanique ne se lit pas au motif régulier : ses nombres sont dans des phrases.
 *     Alors chaque fait transcrit ci-dessous déclare des `preuves` : de courtes
 *     chaînes que le script RECHERCHE dans la page téléchargée. Une preuve absente
 *     ⇒ le fait est marqué `verifie: false` et le script le crie. C'est la seule
 *     barrière contre une faute de recopie, et elle est automatique.
 *
 *  3. LA CONFRONTATION EST CALCULÉE. Le site porte déjà un relevé tiré du CLIENT du
 *     jeu. Pour chaque sujet couvert des deux côtés, on compare les valeurs et on
 *     conclut CONFIRME / CONTREDIT / COMPLETE. Rien n'est arbitré ici : quand les
 *     deux sources divergent, le relevé porte LES DEUX chiffres et nomme sa source.
 *
 *   node scripts/extraire-faits-wiki.mjs [--cache <dossier>] [--sortie <fichier>]
 *
 * Le cache est celui qu'écrit scripts/aspirer-wiki-airborn.mjs.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (nom, defaut) => {
  const i = process.argv.indexOf(`--${nom}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut
}
const CACHE = resolve(arg('cache', join(process.env.TMPDIR || '/tmp', 'wiki-airborn')))
const SORTIE = resolve(arg('sortie', join(RACINE, 'public/wiki/faits-wiki-officiel.json')))
const WIKI = 'https://airborn.gitbook.io/airborn'

/* ── outils de texte ──────────────────────────────────────────────────────── */

/** Rend une page lisible par une recherche de sous-chaîne : entités HTML décodées,
 *  emphase Markdown retirée, apostrophes et espaces uniformisés. */
function aplatir(md) {
  return md
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[‘’′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\([*_[\]()])/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[   ]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .normalize('NFC')
}

const sansAccent = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Le premier nombre d'un texte, points et espaces de milliers compris. `null` si aucun. */
function nombre(txt) {
  if (!txt) return null
  const m = txt.match(/\d[\d. ]*\d|\d/)
  if (!m) return null
  const n = Number(m[0].replace(/[. ]/g, ''))
  return Number.isFinite(n) ? n : null
}

/* ── 1. LES INSTANCES, LUES AU MOTIF ──────────────────────────────────────── */

/** Valeur d'une puce « **Étiquette**: valeur » quel que soit l'habillage.
 *
 *  L'ÉTIQUETTE EST EXIGÉE EN TÊTE DE LIGNE, et c'est tout l'enjeu. Une puce
 *  Markdown aplatie laisse son étiquette en début de ligne ; le corps du
 *  paragraphe de description, lui, est une phrase continue. Sans cette ancre,
 *  « Drop » attrapait le VERBE de la phrase d'introduction — « une instance
 *  qui permet de drop des parchemins… » — au lieu de la puce « Drop: … » qui
 *  suit plus bas. Le relevé récoltait alors la PROSE du wiki (jusqu'à 27 mots
 *  consécutifs) et perdait la liste de butin, seule partie factuelle. */
function champ(plat, etiquettes) {
  for (const e of etiquettes) {
    const m = plat.match(new RegExp(`^[ \\t]*${e}\\s*:?\\s*([^\\n]*)`, 'im'))
    if (m && m[1].trim()) return m[1].trim().replace(/^[:\s]+/, '')
  }
  return null
}

function lireInstance(chemin, md) {
  const plat = aplatir(md)
  const titre = (plat.match(/^#\s*(.+)$/m) || [])[1]?.trim() ?? chemin
  const niveauTxt = champ(plat, ['Niveau minimum'])
  const pvTxt = champ(plat, ['HP requis pour tank', 'HP conseillés pour tank', 'HP conseillés pour le tank'])
  const elemTxt = champ(plat, ["Élément de l'armure pour tank", "Élément de l'armure pour le tank"])
  const typeTxt = champ(plat, ['Type du donjon'])
  const butinTxt = champ(plat, ['Drop'])
  const cooldownTxt = champ(plat, ['Cool ?down'])
  const entreesTxt = champ(plat, ['Entrées journalières'])
  if (!pvTxt && !niveauTxt) return null

  const prestiges = [...(niveauTxt ?? '').matchAll(/prestige\s*(\d+)/gi)].map((m) => Number(m[1]))
  return {
    page: chemin,
    url: `${WIKI}/${chemin}.md`,
    nom: titre,
    famille: chemin.split('/')[1] ?? null, // solo · groupe · guilde
    niveauMini: nombre(niveauTxt),
    prestigeMini: prestiges.length ? Math.min(...prestiges) : null,
    prestigePaliers: prestiges.length > 1 ? prestiges : null,
    pvTank: nombre(pvTxt),
    pvApproche: /~|environ|~/.test(pvTxt ?? ''),
    elementArmure: elemTxt ? elemTxt.replace(/[.\s]+$/, '') : null,
    type: typeTxt ? typeTxt.replace(/[[\]\\.]/g, '').trim() : null,
    butin: butinTxt ? butinTxt.replace(/[.\s]+$/, '').split(/\s*[;,&]\s*/).map((s) => s.trim()).filter(Boolean) : [],
    cooldown: cooldownTxt ? cooldownTxt.replace(/[\\.\s]+$/, '') : null,
    entreesParJour: nombre(entreesTxt),
  }
}

/* ── 2. LES FAITS DE MÉCANIQUE, TRANSCRITS ET PROUVÉS ─────────────────────── */
/*  `preuves` = des fragments qui DOIVENT se trouver dans la page. Ce sont des
 *  nombres et des mots-clés, jamais des phrases : ils servent à vérifier, pas à
 *  republier. Une preuve qui tombe est une erreur de transcription, et le script
 *  la signale au lieu de la laisser passer.                                    */

const FAITS = [
  {
    id: 'maitrise.plafondParRarete',
    sujet: 'Maîtrise de l’arme',
    page: 'activites/pve/pve-les-armes/maitrise-de-larme',
    valeurs: { NONE: 10, RARE: 40, EPIC: 60, LEGENDARY: 80, MYTHIC: 100, PREMYTHIC: null },
    note: 'Le wiki ne nomme pas le palier Pré-mythique dans cette liste : cinq raretés, pas six.',
    preuves: ["jusqu'au niveau 10", 'Rareté rare = niveau 40', 'épique = niveau 60', 'légendaire = niveau 80', 'mythique = niveau 100'],
  },
  {
    id: 'maitrise.gainParPalier',
    sujet: 'Maîtrise de l’arme',
    page: 'activites/pve/pve-les-armes/maitrise-de-larme',
    valeurs: {
      pas: 10,
      cumule: true,
      physique: { stat: 'Dégâts critiques %', parPalier: 4, max: 40, sauf: 'doloire' },
      magique: { stat: 'Dégâts magiques %', parPalier: 2, max: 20 },
      tank: { stat: 'PV %', parPalier: 4, max: 40 },
      support: { stat: 'Soins %', parPalier: 4, objet: 'Sceptre de Luzaka support' },
    },
    preuves: ['Chaque palier de 10 niveaux', 'hors doloire', '+4% de dégâts critiques par palier (max 40%)', '+2% de dégâts magiques par palier (max 20%)', '+4% de PV par palier (max 40%)', '4% de soin'],
  },
  {
    id: 'maitrise.bahamuth',
    sujet: 'Maîtrise de l’arme',
    page: 'activites/pve/pve-les-armes/maitrise-de-larme',
    valeurs: { familier: 'Bahamut', donne: "% d'expérience de maîtrise d'arme" },
    preuves: ["d'exp d'arme en bonus"],
  },
  {
    id: 'rarete.lignes',
    sujet: 'Rareté de l’arme',
    page: 'activites/pve/pve-les-armes/rarete-de-larme',
    valeurs: {
      regle: 'la rareté est le nombre de lignes de statistiques',
      paliers: [
        { lignes: 0, nom: 'Commune' }, { lignes: 1, nom: 'Rare' }, { lignes: 2, nom: 'Épique' },
        { lignes: 3, nom: 'Légendaire' }, { lignes: 4, nom: 'Pré-mythique' },
      ],
      mythique: '4 lignes toutes portées à 50 %',
      maxParLigne: 50,
      premiereMainSeule: 'assassins',
    },
    preuves: ['Sans rareté = Commune', '1 ligne de rareté = Rare', '2 lignes de rareté = Épique', '3 lignes de rareté = Légendaire', '4 lignes de rareté = Pré-mythique', "jusqu'à 50% maximum", 'toutes augmentées à 50%', 'première main est prise en compte pour les assassins'],
  },
  {
    id: 'rarete.statsParFamille',
    sujet: 'Rareté de l’arme',
    page: 'activites/pve/pve-les-armes/rarete-de-larme',
    valeurs: {
      physique: ['Toucher', 'Dégâts critiques', 'Critique', 'Attaque'],
      magique: ['Attaque', 'Dégâts magiques %', 'Int', 'Puissance magique'],
      tank: ['PV %', 'Bloc mêlée/distance', 'Endurance'],
    },
    preuves: ['Toucher / Dégâts critiques / Critique / Attaque', 'Attaque / Dégâts magiques % / Int / Puissance magique', 'Pv% / Bloc mêlée/distance / Endurance'],
  },
  {
    id: 'rarete.chaineDesParchemins',
    sujet: 'Rareté de l’arme',
    page: 'activites/pve/pve-les-armes/rarete-de-larme',
    valeurs: [
      { de: 'Commun', vers: 'Rare', ou: 'drop sur les géants de Madrigal' },
      { de: 'Rare', vers: 'Épique', ou: 'Bob', cout: { nucleus: 5000 } },
      { de: 'Épique', vers: 'Légendaire', ou: 'Pépito', cout: { 'morceaux d’arme vampirique': 20 } },
      { de: 'Légendaire', vers: 'Pré-mythique', ou: 'LootBox (PNJ Couturier, Oasis) ou boutique' },
      { de: 'Pré-mythique', vers: 'Mythique', ou: 'aucun parchemin : porter les 4 lignes à 50 %' },
    ],
    complement: 'Le modificateur de rareté (Pépito, contre des poussières d’armes) retire la valeur d’une ligne au hasard mais ne change JAMAIS quelle ligne est présente.',
    preuves: ['géants de Madrigal', '5000 nucléus chez Bob', "20 morceaux d'arme vampirique chez Pépito", 'LootBox', 'poussières', 'vous ne pourrez pas changer de ligne disponible'],
  },
  {
    id: 'eveil.basique.plafonds',
    sujet: 'Éveils basiques',
    page: 'activites/pve/pve-eveils/eveils-basique',
    valeurs: {
      lignesMax: 3,
      equipement: { stat: 15, pourcent: 10, attaque: 100, mp: 100, hp: 100 },
      fashion: { stat: 7, dcc: 5, attaque: 100, mp: 100, hp: 100 },
      ou: 'Menu ▸ Systèmes Airborn ▸ Éveil',
    },
    preuves: ['éveils max sont 15 en stat', '10% sur les stats à %', "100 pour l'attaque/mp/hp", '7 stats, 5% dcc', "jusqu'à 3 lignes"],
  },
  {
    id: 'eveil.fixe.uneSeuleLigne',
    sujet: 'Éveils fixes',
    page: 'activites/pve/pve-eveils/eveils-fixes',
    valeurs: { lignesMax: 1 },
    pourquoiCaCompte: "C'est une CONTRAINTE, pas un gain : elle change ce que le joueur peut poser sur une pièce. L'éveil basique en autorise trois, l'éveil fixe une seule.",
    preuves: ["qu'une seule ligne d'éveil fixe"],
  },
  {
    id: 'eveil.fixe.acte3',
    sujet: 'Éveils fixes (acte 3)',
    page: 'activites/pve/pve-eveils/eveils-fixes',
    valeurs: {
      porte: ['bijoux (Temple Aérien)', 'fashions, capes et masques (Paradis Arcanique)'],
      R1: { INT: 10, END: 10, FOR: 10, MP: 200, DCC: 8 },
      R2: { INT: 20, END: 20, FOR: 20, MP: 400, DCC: 15 },
    },
    preuves: ['acte 3', '10 INT / END / FOR', '200 MP', '8% DCC', '20 INT / END / FOR', '400 MP', '15% DCC', 'Temple Aérien', 'Paradis Arrcanique'],
  },
  {
    id: 'eveil.fixe.serieHistorique',
    sujet: 'Éveils fixes (série d’origine)',
    page: 'activites/pve/pve-eveils/eveils-fixes',
    valeurs: { R1: 30, R2: 60, porte: 'armes, armures et boucliers', ou: 'Temple de Zerkattak / Behemoth, ou boîte d’éveil aléatoire en boutique Airpoints' },
    note: "Cette série n'est pas dans le texte du wiki : elle est dans les LÉGENDES de ses deux captures (« éveil fixe END+30 », « éveil fixe INT+60 »). C'est la série que porte déjà le relevé du client.",
    preuves: ['END+30', 'INT+60', 'boîte'],
  },
  {
    id: 'eveil.fixe.ouLesTrouver',
    sujet: 'Éveils fixes',
    page: 'instances/groupe/temple-de-zerkattak-behemoth',
    valeurs: { instance: 'Temple de Zerkattak / Behemoth', butin: 'Parchemin d’éveil rang 1 & 2' },
    preuves: ["parchemins d'éveils de rang fix 1 et 2"],
  },
  {
    id: 'artefact.conditions',
    sujet: 'Artefact',
    page: 'fonctionnalites/artefact',
    valeurs: {
      armesEligibles: ['Yggdrasil Purifié', 'Éternelle'],
      prerequis: '+10',
      pnj: 'Heimerdinger',
      objets: ["Pierre d'amélioration Artefact", "Parchemin de protection d'Artefact", "Plan de fabrication d'Artefact"],
      tauxAvecProtection: 100,
      ouvre: { upgrade: [11, 20], slotsHolo: 3, slotsHoloA: 20, percage: [11, 12], ascensionNiveaux: 3 },
      diamantsAcceptes: 'Diamants Holographiques uniquement, dans les 3 slots ouverts au +20',
    },
    preuves: ['Heimerdinger', 'X+10', 'Upgrade de +11 à +20', '3 nouveaux slots', 'Piercing de +11 à +12', "niveaux d'Ascension (3)", 'taux d’upgrade est de 100%', 'Diamants Holographiques pourront être comptés'],
  },
  {
    id: 'artefact.ascension.gain',
    sujet: 'Ascension',
    page: 'fonctionnalites/artefact',
    valeurs: { niveau1: 5, niveau2: 10, niveau3: 15, total: 30, porte: 'chacune des statistiques de l’arme', premiereMainSeule: true },
    combleUnTrou: "Le client ne chiffre AUCUN gain d'ascension — les parchemins ne portent que leur rang. Le wiki donne les trois pourcentages et leur somme.",
    preuves: ['5% niveau 1, 10 niveau 2, et 15% niveau 3', 'pour un total de 30%', 'ne marche que sur la première main'],
  },
  {
    id: 'artefact.ascension.cout',
    sujet: 'Ascension',
    page: 'fonctionnalites/artefact',
    valeurs: { essencesParNiveau: [1, 2, 3], sacrifices: 6, armesArtefactConsommees: 12, sacrifice: 'une arme Yggdrasil Purifié + une arme Éternelle de la même classe, toutes deux en statut Artefact', ordreImpose: true },
    preuves: ['Le premier coûtera 1 essence, le second 2, le troisième 3', 'total de 6 sacrifices, donc 12 armes Artefact', 'devront être de statut Artefact'],
  },
  {
    id: 'fashion.upgrade',
    sujet: 'Upgrade de costume',
    page: 'fonctionnalites/upgrade-fashion/systeme-dupgrade',
    valeurs: {
      plage: [1, 10],
      pnj: '[Forge] Bobochan, Flaris Centre',
      menu: 'Amélioration de Costume sécurisée',
      pieces: ['Tête', 'Corps', 'Gants', 'Bottes'],
      slotsOuvertsDe: 7,
      slotsTotal: 4,
      materiaux: ['Pierre Jupiter', 'Parchemin de Protection de Costume', 'Perin / Penya'],
    },
    combleUnTrou: "Le client ne documente aucun gain de statistique par palier d'upgrade de costume — et pour cause : le wiki dit que l'upgrade n'en donne pas. Il OUVRE des emplacements de sertissage, à partir du +7. C'est le sertissage qui donne les statistiques.",
    preuves: ['de +1 a +10', 'Bobochan', 'niveau +7', 'total de 4 emplacements', 'Pierre Jupiter', 'Parchemin de Protection de Costume'],
  },
  {
    id: 'fashion.sertissage.gemmes',
    sujet: 'Sertissage de costume',
    page: 'fonctionnalites/upgrade-fashion/le-sertissage',
    valeurs: {
      pnj: '[Joaillère] Angie, Flaris Centre',
      echecImpossible: true,
      retrait: 'Parchemin de Réinitialisation de Gemme, ligne choisie',
      gemmeParPiece: { 'Tête': 'Grenat', 'Corps': 'Turquoise', 'Gants': 'Aigue-marine', 'Bottes': 'Améthyste' },
      communes: { statistiques: ['FOR', 'END', 'DEX', 'INT'], parNombreDeGemmes: [5, 15, 25, 40] },
      specifiques: {
        'Tête': { Attaque: [400, 800, 1400, 2100], 'Puissance magique': [800, 1600, 2800, 4200] },
        'Corps': { 'Dégâts critiques %': [8, 16, 32, 65], 'Dégâts magiques %': [3, 7, 12, 32] },
        'Gants': { 'Soin %': [10, 20, 40, 75], 'PV': [2276, 4552, 11380, 28500] },
        'Bottes': { 'Soin %': [10, 20, 40, 75], 'Défense': [200, 400, 700, 900] },
      },
    },
    preuves: ['Angie', 'Grenat', 'Turquoise', 'Aigue-marine', 'Améthyste', 'FOR + 5', 'FOR + 15', 'FOR +25', 'FOR + 40', 'Attaque + 2100', 'Puissance Magique + 4200', 'Dégâts Critiques + 65%', 'Dégâts Magiques + 32%', 'Soin + 75%', 'HP + 28500', 'DEF + 900', 'celle-ci ne peut pas échouer', 'Réinitialisation de Gemme'],
  },
  {
    id: 'parures.upgrade21a30',
    sujet: 'Parures du Bastion (+21 → +30)',
    page: 'fonctionnalites/parures-nouveaux-upgrades',
    valeurs: {
      plage: [21, 30],
      pierres: { DPS: 'Pierre d’amélioration parure DPS', TANK: 'Pierre d’amélioration parure Tank' },
      ouTrouverLesPierres: ['Temple Aérien', 'Jardin des Rois'],
      protection: { objet: 'Parchemin Aprotect Lunaire', ou: 'PNJ Donjon, contre des médailles de donjon' },
      DPS: {
        Anneaux: { parNiveau: { 'Dégâts PvE %': 1 }, total: { 'Dégâts PvE %': 10 } },
        'Boucles d’oreilles': { parNiveau: { 'DCC %': 2, 'Dégâts magiques %': 1 }, total: { 'DCC %': 20, 'Dégâts magiques %': 10 } },
        Collier: { parNiveau: { 'Drop %': 1 }, total: { 'Drop %': 10 } },
      },
      TANK: {
        Anneau: { parNiveau: { 'PV %': 1 }, total: { 'PV %': 10 } },
        'Boucles d’oreilles': { parNiveau: { 'PV %': 1 }, total: { 'PV %': 10 } },
        Collier: { parNiveau: { 'END %': 1 }, total: { 'END %': 10 } },
      },
    },
    combleUnTrou: "Le relevé du site nomme la pierre du +21 → +30 mais ne chiffre rien. Le wiki donne le gain par niveau ET le total, et les deux ferment : 10 niveaux × le gain par niveau = le total annoncé, sur les six pièces.",
    preuves: ["jusqu'au niveau 30", '+1% de dégâts PVE par niveau, pour un total de 10%', '2% de DCC et 1% de dégâts magiques par niveau', 'un total de 20 et 10%', 'Drop +1% par niveau', '+1% HP par niveau', "+1% d'END par niveau", 'Aprotect Lunaire'],
  },
  {
    id: 'esprits.paliers',
    sujet: 'Esprits',
    page: 'fonctionnalites/les-esprits',
    valeurs: {
      palierMax: 50,
      nourriture: 'Poudre Féerique',
      craftNourriture: '1 objet de la Clairière = 500 Poudre Féerique (PNJ Capitaine Hook)',
      pnj: 'Capitaine Hook, devant la Clairière de la Fée',
      craftables: 4,
      boutiqueSeule: ['Goldea'],
      esprits: {
        Elerina: { 10: 'PvP 3% / MP 500', 20: 'PvP 6% / MP 1000', 30: 'PvP 9% / MP 1500', 40: 'PvP 12% / MP 2000', 50: 'PvP 15% / MP 2500' },
        Lyrina: { 10: 'Attaque 2% / DCC 20%', 20: 'Attaque 4% / DCC 40%', 30: 'Attaque 6% / DCC 60%', 40: 'Attaque 8% / DCC 80%', 50: 'Attaque 10% / DCC 100%' },
        Elowen: { 10: 'INT 20 / Soin 50%', 20: 'INT 40 / Soin 100%', 30: 'INT 60 / Soin 150%', 40: 'INT 80 / Soin 200%', 50: 'INT 20% / Soin 250%' },
        Veloria: { 10: 'END 20 / PV 4%', 20: 'END 40 / PV 8%', 30: 'END 60 / PV 12%', 40: 'END 80 / PV 16%', 50: 'END 100 / PV 20%' },
        Goldea: { 10: 'Drop 12% / Penyas 9%', 20: 'Drop 20% / Penyas 15%', 30: 'Drop 28% / Penyas 21%', 40: 'Drop 36% / Penyas 27%', 50: 'Drop +1 / Penyas 35%' },
      },
      composants: {
        'Clairière de la fée': ['Cristal féérique', 'Essence de Luciole', "Coeur d'Ange"],
        'Paradis Arcanique · Mausolée des Divinités · Sanctuaire de Shogun · Jardin des Rois': ['Ailes enchantées', 'Redbull Magique', 'Voeux de Rhisis'],
      },
    },
    regleMaison: "Les paliers de Goldea sont chiffrés en drop et en penyas : la maison ne met pas de taux de drop à l'écran. Le fait est relevé, son affichage est un arbitrage.",
    preuves: ['Capitaine Hook', '(50 max)', 'Poudre Féerique', '1 item pour 500 Poudre Féerique', 'PVP 3% / MP 500', 'Attaque 10% / DCC 100%', 'Int 20% / Soin 250%', 'End 100 / PV 20%', 'Drop 12% / Penyas 9%', 'Drop +1 / Penyas 35%'],
  },
  {
    id: 'arcanes.etuis',
    sujet: 'Carnet d’Arcanes',
    page: 'fonctionnalites/carnet-darcanes',
    valeurs: {
      etuis: 3,
      raretesDeCarte: ['Commune', 'Rare', 'Épique', 'Légendaire'],
      composition: {
        'Étui 1': { Commune: 'toutes' },
        'Étui 2': { Rare: 3, Commune: 1 },
        'Étui 3': { 'Épique': 3, 'Légendaire': 3 },
      },
      deuxBonus: { base: 'une carte de chaque emplacement', complet: 'autant d’exemplaires identiques que la carte porte de losanges' },
      exception: 'les carnets communs n’ont qu’un seul bonus',
      ouTrouverLesEtuis: 'Paradis Arcanique',
      paquets: { aleatoires: 'tous les nouveaux donjons, solo et groupe', rares: 'donjons de groupe', epiques: 'donjons de groupe', legendaires: 'PNJ Donjon (Luca) ou boutique' },
      ou: 'Menu ▸ Systèmes Airborn ▸ Carnet d’arcanes',
    },
    preuves: ['3 types de deck', 'étui 1, il ne faut que des cartes Communes', 'étui 2, il faut 3 cartes Rares et une Commune', 'étui 3, il faut 3 cartes Épiques et 3 cartes Légendaires', 'Communes, Rares, Epiques, Légendaires', 'Bonus de base', 'Bonus complet', 'Losanges', 'Paradis Arcanique', 'Luca'],
  },
  {
    id: 'cartes.paliers',
    sujet: 'Cartes d’élément',
    page: 'fonctionnalites/les-cartes',
    valeurs: {
      'B et 4%': 'drop sur tous les monstres, plus facilement en zones de farm B1 à B4',
      'A et 7%': 'craft chez le maître des cartes à Flaris, à partir des B et 4%',
      'S et 10%': 'drop sur le boss du Sietch Kalgas',
      changements: { Foudre: 'donne du DCC au lieu du CC bonus', Eau: 'donne du Soin % en plus des MP bonus' },
    },
    preuves: ['carte Foudre donne du DCC', 'carte Eau donne du Soins %', 'B1, B2, B3 et B4', 'maître des cartes à Flaris', "boss de l'instance Kalgas"],
  },
  {
    id: 'prestige.echelle',
    sujet: 'Prestige',
    page: 'fonctionnalites/le-prestige',
    valeurs: { depart: 0, maximum: 10, pnj: 'Souverain Prestigieux, Oasis (à gauche de Plank)', seuils: { 'USS Celestia': 1, 'Sentier de Rhisis': 3, 'Dédale de Rhisis': 3, 'Sietch Kalgas': 5 } },
    preuves: ['niveau de prestige 0 pour commencer', 'niveau 10 étant le maximum', 'Sietch Kalgas (prestige 5)', 'Sentier/Dédale de Rhisis (prestige 3)', 'USS Celestia (prestige 1)'],
  },
  {
    id: 'prestige.quetesDeBadges',
    sujet: 'Prestige',
    page: 'fonctionnalites/le-prestige/autres-quetes-pour-le-prestige',
    valeurs: {
      'Badge de la Tour': [
        { quete: 'Badge farming AoE', cible: 'Capitaine Dantalian', nombre: 40000, zone: 'B4' },
        { quete: 'Badge farming 1v1', cible: 'Capitaine Hague', nombre: 15000, zone: 'B3' },
      ],
      'Badge Donjon': { pnj: 'Flore Aison, Jardin Prestigieux', cibles: [['Azranoct', 10], ['Zerkattak Furieux', 10], ['Mahtolle', 10], ['Anagrero, Hanades et Nehnoruh', 10], ["Branche d'Yggdrasil Contaminée", 10]] },
      'Badge du Jardin Prestigieux': { quetes: ['Nettoyage jardin - 1 : 1000 monstres normaux de chaque type', 'Nettoyage jardin - 2 : 10 géants de chacun'] },
      'Badge de donjon mineur': { aPartirDuPrestige: 8, pour: [9, 10], nombreParPalier: 2, cibles: [['Draken Behemoth', 10], ["Rangda l'Effroyable", 10], ['Archange, Sanadalphon', 9], ['Harpyness Matriarche', 10]] },
      'Badge du Worldboss Prestigieux': { aPartirDuPrestige: 8, recette: '2 rubis de chagrin + 2 de joie + 2 de colère, chez le Souverain Prestigieux' },
    },
    preuves: ['40.000 "Capitaine Dantalian"', '15.000 "Capitaine Hague"', 'Flore Aison', 'Azranoct (10)', 'Archange, Sanadalphon (9)', 'partir du niveau de prestige 8', '1000 monstres normaux', '10 géants', 'Avec 2 de chaques'],
  },
  {
    id: 'chambres.cadre',
    sujet: 'Chambres Secrètes',
    page: 'activites/pve/pve-chambres-secretes',
    valeurs: {
      horaires: ['Mercredi 21h', 'Dimanche 21h'],
      guildesMax: 12,
      joueursParGuilde: 10,
      buffGagnants: { 'PvE %': 10, 'Drop %': 20 },
      buffParticipants: { 'PvE %': 5, 'Drop %': 5 },
      partie1: { prerequis: 'niveau 180, stuff acte 2', mobs: 480, miniBoss: { nom: 'Asuras Mutant', nombre: 12 }, boss: { nom: 'Malphas', nombre: 3 }, monnaie: 'Jeton Secret', rendementRun: 2000, rendementParJoueur: 200 },
      partie2: { prerequis: 'niveau 200, prestige 10, stuff acte 3', mobs: 400, miniBoss: 4, boss: 4, monnaie: 'Obsidienne Corrompue', rendementRun: 1600, rendementParJoueur: 160 },
    },
    preuves: ['Mercredi à 21h & Dimanche à 21h', '12 guildes', '10 joueurs max par guilde', '+10% PvE / +20% Drop', '+5% PvE / +5% Drop', '480 mobs', 'Asuras Mutant', '3 Malphas', '2 000 jetons', '200 jetons par joueur', '1600 obsidienne', '160 jetons par joueur', 'niv 200 - Prestige 10'],
  },
  {
    id: 'chambres.mecaniques',
    sujet: 'Chambres Secrètes',
    page: 'activites/pve/pve-chambres-secretes',
    valeurs: {
      'Kraavus & Kraavos': { barres: 3, regeneration: '≈ 13 319 999 PV/s, décroissante', invincibleA: '15 % de la dernière barre', ecartMaxEntreLesDeuxMorts: '4 s', penalite: 'régénération de 50 % des PV' },
      Nyzarra: { barres: 5, retourDeDouleur: '10 % des dégâts renvoyés', fenetre: '4 s pour cesser toute attaque' },
      Aatrox: { barres: 6, resistancesCycliques: { jaune: 'corps à corps', vert: 'distance', violet: 'magique' }, dureeDePhase: '10 s', debut: '20 s de combat', rage: 'à 3 barres restantes, le mauvais type de dégâts le SOIGNE du double' },
      'Gor’Thar': { barres: 2 },
      'Dra’Zhul': { barres: 1 },
    },
    pourquoiCaCompte: "Ce sont des conditions, pas de la couleur : frapper Aatrox du mauvais type le soigne, et tuer les jumeaux à plus de 4 secondes d'écart rend la moitié de leur vie. Une composition d'équipe se décide là-dessus.",
    preuves: ['13 319 999 HP par seconde', '15 % de sa dernière barre de vie', 'écart de plus de 4 secondes', 'régénération de 50 %', 'renvoyer 10 % des dégâts', 'vous avez 4 secondes', '20 secondes de combat', 'Chaque phase dure 10 secondes', '3 barres de vie restantes', 'le soigne du double'],
  },
  {
    id: 'worldboss.horaires',
    sujet: 'World Boss',
    page: 'activites/pve/pve-world-boss',
    valeurs: {
      'Patate de Forain': { heure: '17h30', ou: 'ancienne arène de Saint City', aLaMort: 'event souverain EXP +25 % / Drop +5 %' },
      Clockworks: { heures: ['18h30', '00h30'], ou: 'Jardin Prestigieux', accesPrestige: 5, aLaMort: 'event souverain EXP +25 % / Drop +5 %', buffDeProximite: { duree: '2 h', 'PvE %': 10, 'PV %': 10, 'Penyas %': 10, 'Drop %': 5 } },
    },
    preuves: ['17h30', '18h30', '00h30', 'Prestige 5', 'PVE +10%, PV +10%, PENYAS +10% et DROP +5% pendant 2h'],
  },
  {
    id: 'donjonRush.cadre',
    sujet: 'Donjon Rush',
    page: 'activites/pve/pve-donjon-rush',
    valeurs: {
      donjon: 'La Caverne de Glace',
      ou: 'Flaris Nord',
      entreesParJour: 6,
      participants: 2,
      quotaSbires: 271,
      quotaPart: '70 % des trashs',
      pantheon: { equipes: 12, personnages: 24 },
      buffsBossFinal: { 'PV %': 12, 'Drop %': 20, 'Penyas %': 13, 'Exp maîtrise des armes %': 25 },
      pvConseilles: { midboss: 130000, bossFinal: 160000 },
      bossFinal: 'Azharyon, Couronne du Givre',
      resistances: { bleu: 'physique (mêlée et distance)', violet: 'magique' },
      rage: 'à 7 barres restantes, le mauvais type de dégâts le soigne du double',
    },
    preuves: ['6 entrées', '2 personnages', '271 mobs', '70% des trash', 'Top 12', '24 personnages', 'HP+12% / DROP+20% / PENYAS+13% / EXP MAÎTRISE DES ARMES+25%', '130 000 HP pour les midboss, 160 000 Hp pour le boss final', 'Azharyon', '7 barres de vie restantes'],
  },
  {
    id: 'guilde.pointsPvE',
    sujet: 'Points de guilde PvE',
    page: 'fonctionnalites/les-points-de-guilde-pve',
    valeurs: {
      sources: [
        { ou: 'Sentier de la damnation', taux: '1500 emblèmes de la damnation → 50 points' },
        { ou: 'Chambres Secrètes', taux: '1600 jetons secrets → 200 points' },
        { ou: 'Donjon de guilde', taux: 'parchemins de 50 points, 1 entrée par jour' },
      ],
      donjonDeGuilde: { ouvertPar: 'chef de guilde ou général', objet: "acheté 2 000 000 000 penyas chez « Passpaspartout », Flarine Centre", duree: '3 minutes', pvConseilles: 2130000 },
      buffs: { cout: { points: 500, penyas: 2000000000 }, liste: { 'Enchantement de Shade': 'PvE +10 % / Dégâts contre les boss +10 %', "Armure d'Yggdrasil": 'PV +10 % / Exp +20 %', 'Bénédiction de Rhisis': 'Drop +20 %', Avarice: 'Penyas +15 % / Vitesse de déplacement +20 %' } },
    },
    preuves: ['1500 emblèmes de la damnation pour 50 points', '1600 jetons secrets', '2.130.000 HP', '2.000.000.000 penyas', '500 points PvE', 'Enchantement de Shade', "Armure d'Yggdrasil", 'Bénédiction de Rhisis', 'Avarice', '3 minutes'],
  },
  {
    id: 'groupe.niveaux',
    sujet: 'Groupes',
    page: 'fonctionnalites/les-groupes',
    valeurs: {
      niveauDeDepart: 1,
      parchemins: { 'niveau 50': 'Bob, Oasis', 'niveau 100': 'Airpoints, Oasis' },
      buffAgressivite: { 'PvE +5 %': 75, 'Penyas +10 %': 100 },
      changements: ['parchemin de déploiement passif pour tous', 'buffs TPF toujours au maximum quel que soit l’effectif', 'exp de groupe possible en solo, sans pénalité'],
    },
    preuves: ['groupe lv 50 chez Bob', 'groupe lv 100 en AP', 'PVE+5% à partir du niveau de groupe 75', 'Penyas +10% au niveau 100'],
  },
  {
    id: 'familiersDores.parfaits',
    sujet: 'Familiers dorés',
    page: 'fonctionnalites/familiers-dores',
    valeurs: {
      craft: { pnj: 'Éleveur Sacha', base: '20 morceaux d’œuf doré + 1000 perins' },
      'Licorne majestueuse': { INT: 150, 'Dégâts magiques %': 25, 'DCC %': 100, DEX: 150 },
      'Hyppogriphe sombre': { FOR: 150, 'DCC %': 100, MP: 3000, 'Soin %': 100 },
      'familier tank (acte 3)': { END: 100, PV: 4000, 'PV %': 15, 'Défense %': 25, surcout: '+50 % des anciennes ressources et 15 catalyseurs d’énergie de Bubble' },
    },
    preuves: ['20 oeufs et 1000 perins', '150 Int / 25% dégâts magiques / 100% dégâts des coups critiques / 150 DEX', '150 FOR / 100% DCC / 3000 MP / 100% soin', '100 END, 4000 PV, 15% PV, 25% Défense', '15 catalyseurs'],
  },
  {
    id: 'melee.horaires',
    sujet: 'Mêlée générale',
    page: 'activites/pvp/pvp-melee-generale',
    valeurs: {
      pnj: 'Creed, Oasis',
      modes: { 'Objectif de points': 100, 'Vies limitées': 25, 'Limite de temps': '15 minutes (à venir)' },
      calendrier: [
        ['Lundi', '19:00', 'Objectif de points'], ['Mardi', '18:00', 'Vies limitées'],
        ['Mercredi', '21:30', 'Objectif de points'], ['Jeudi', '18:00', 'Vies limitées'],
        ['Vendredi', '19:00', 'Objectif de points'], ['Samedi', '16:00', 'Vies limitées'],
        ['Samedi', '18:00', 'Objectif de points'], ['Dimanche', '16:00', 'Objectif de points'],
        ['Dimanche', '20:00', 'Vies limitées'],
      ],
    },
    preuves: ['Creed', 'fixé à 100 points', '25 vies max', 'fixée à 15 minutes', '21:30'],
  },
  {
    id: 'guildSiege.cadre',
    sujet: 'Guild Siege',
    page: 'activites/pvp/pvp-guild-siege',
    valeurs: { frequence: 'tous les jours', finDesInscriptions: ['19h', '22h'], buffs: { participant: 'Penyas +5 %', gagnant: 'Penyas +15 %' } },
    preuves: ['19h et 22h', 'PENYAS+5%', 'PENYAS+15%'],
  },
  {
    id: 'oasis.protection',
    sujet: 'Protection de l’Oasis',
    page: 'activites/pve/pve-protection-de-loasis-solo',
    valeurs: { etages: 52, pvPourToutTank: 200000, sautsDeDifficulte: [26, 36], niveauConseilleA36: 180 },
    preuves: ["jusqu'à l'étage 52", '200k', 'niveau 26', 'A partir du 36'],
  },
  {
    id: 'farming.zones',
    sujet: 'Farming',
    page: 'activites/pve/pve-farming',
    valeurs: {
      B1: { niveau: 120, mode: '1v1' }, B2: { niveau: 120, mode: 'AoE' },
      B3: { niveau: 121, mode: '1v1' }, B4: { niveau: 121, mode: 'AoE' },
      zonesPrestigieuses: { niveau: 180, prestige: 7, ou: 'Jardinet Prestigieux', tenteBlanche: 'AoE', tenteJaune: '1v1', gainAnnonce: '≈ +30 % de drop et de penyas', quete: { '1v1': 1200, AoE: 3000 } },
      acte3: 'les monstres de ces zones sont passés aux alentours du niveau 200',
    },
    regleMaison: "Le « +30 % » est un rendement de drop et de penyas : à relever, pas forcément à afficher.",
    preuves: ['zones B1 et B2', 'B3 est la zone 1v1, B4 est pour aoe', 'niveau 180 et prestige 7', 'environ 30% de drops', '1200 mobs pour les 1v1, 3000 pour les Aoe'],
  },
  {
    id: 'rookie.paliers',
    sujet: 'Voie du Rookie',
    page: 'debutant/debutant-voie-du-rookie',
    valeurs: {
      pnj: '[Rookie] Pompon, Flaris Nord',
      paliers: {
        60: '45 Pièces de Rookie',
        90: '100 Pièces + 250 Cartes Élément Vent',
        107: '500 Orichalque, Pierre Lunaire, Sprotect, Gprotect + 20 Jetons d’Air',
        120: '225 Pièces + 450 Orichalque Scintillant & Sprotect Ultime + 1 Pièce Rookie Vampirique',
        122: '2 Runes Vampiriques + Masque HP & PVE 1',
        131: '300 Pièces + 500 Orichalque, Pierre Lunaire, Sprotect, Gprotect + 4 Fulgur et Volcane (7 %)',
        150: '800 Pièces de Rookie',
        200: '400 Pièces + 1 Boîte de Meubles + 1 Boîte de Consommables Rookie + Parchemins de Prestige 1, 2 et 3',
      },
      sacDuDebutant: { duree: '15 j', 'All Stats': 35, 'Vitesse de déplacement %': 20, 'DCC %': 15, 'Incantation %': 20, 'Dégâts magiques %': 5 },
      nyx: { 'XP %': 125, 'PvE %': 7, 'Déplacement %': 30, 'All Stats': 35 },
      mantraRookie: { 'PvE %': 3, 'PV %': 3 },
    },
    preuves: ['Pompon', 'Niveau 60', '45 Pièces de Rookie', '800 Pièces de Rookie', 'Parchemins de Prestige 1, Prestige 2, Prestige 3', 'All Stats +35 , Vitesse de déplacement +20%, DCC +15%, Incantation +20%, Dégâts magiques +5%', 'XP +125%, PVE +7%'],
  },
  {
    id: 'masques.niveaux',
    sujet: 'Masques',
    page: 'activites/pve/pve-crafting-divers/masques',
    valeurs: { pnj: 'Bibi la Bicrave, Oasis', types: ['PvE', 'PV', 'PvP/MP'], niveau1: 3, niveau2: 10, niveau3: 'existe, matériaux dans tout Darkon et la Mine Dekanes' },
    divergenceInterne: "La page « L'Oasis » du MÊME wiki écrit 8 % pour le niveau 2, pas 10 %. Le wiki se contredit lui-même ; aucune des deux valeurs ne peut être servie sans dire laquelle.",
    preuves: ['Bibi la Bicrave', 'de 3% au niveau 1, puis de 10% au niveau 2'],
  },
  {
    id: 'mantras.niveaux',
    sujet: 'Mantras',
    page: 'activites/pve/pve-crafting-divers/mantra',
    valeurs: { pnj: 'Sage des Mantras, Flarine Centre', emplacement: 'à la place des flèches', niveau1: { PvE: 5, PV: 5, 'PvP + MP': 5 }, niveau2: 'existe (Gouffre d’Ishtar, Général d’Ishtar)' },
    preuves: ['Sage des Mantras', 'Pve + 5%', 'Hp + 5%', 'pvp + mp 5%', 'place des flèches', 'Gouffre d’Ishtar'],
  },
  {
    id: 'capes.fusion',
    sujet: 'Capes de fusion',
    page: 'activites/pve/pve-crafting-divers/cape',
    valeurs: {
      pnj: 'Couturier Karlagarfeld, Oasis',
      recettes: [
        { resultat: 'Cape donjon dorée', bonus: 'Drop +1 & dégâts contre les boss +30 %' },
        { resultat: 'Cape du farmeur doré', bonus: 'Drop +1 & Penyas +50 % & Déplacement +30 %' },
        { resultat: 'Cape draconique Fulgurante', bonus: 'END +10 % & PV +20 % & Déplacement +25 %' },
      ],
    },
    preuves: ['Karlagarfeld', 'Drop +1 & dégâts boss 30%', 'Drop +1 & penyas 50% & dépla 30%', 'End 10% & HP 20% & dépla 25%'],
  },
  {
    id: 'amelioration.trouNonComble',
    sujet: 'Amélioration (+1 → +20)',
    page: 'fonctionnalites/artefact',
    valeurs: { gainParPalier: null },
    constat: "LE TROU RESTE OUVERT. Le wiki dit OÙ et AVEC QUOI on améliore une arme (+1 → +10 puis, en statut Artefact, +11 → +20), et que la protection donne 100 % de réussite. Il ne dit NULLE PART ce qu'un palier d'amélioration RAPPORTE en statistique — exactement comme le client, dont propEnchant.inc ne porte que des coefficients sans multiplicande. Aucune des deux sources ne permet de chiffrer le +N : il reste « non compté ».",
    preuves: ['Upgrade de +11 à +20'],
  },
]

/* ── 3. LES OBJETS NOMMÉS PAR LE WIKI, RATTACHÉS AUX DESSINS DÉJÀ EN DÉPÔT ── */
/*  Aucune image n'est téléchargée : le dépôt porte déjà les icônes du client. On
 *  rattache sur le nom français du catalogue, accents et casse mis de côté —
 *  c'est le client lui-même qui apparie le nom et le dessin, pas nous.
 *
 *  DEUX OBJETS PEUVENT PORTER LE MÊME NOM. Le catalogue en compte deux qui
 *  s'appellent « Pierre Jupiter », et prendre le premier venu revient à tirer au
 *  sort : c'est ainsi que le mauvais dessin est entré dans le relevé. Une
 *  homonymie n'est donc plus tranchée par l'ordre du fichier — il faut nommer la
 *  clé du client en troisième position, sinon l'objet ressort SANS dessin et
 *  l'ambiguïté est écrite dans le relevé.                                       */

const OBJETS_DU_WIKI = [
  ['Poudre Féerique', 'esprits.paliers'],
  // Deux « Pierre Jupiter » au catalogue. La bonne est le MATÉRIAU, que le client
  // décrit lui-même comme servant « à améliorer les costumes » et marque « (Airaz) » ;
  // l'autre est un consommable du Flyff d'origine qui augmente les attaques de foudre.
  ['Pierre Jupiter', 'fashion.upgrade', 'II_GEN_MAT_LIGHTNINGSTONE'],
  ['Jeton Secret', 'chambres.cadre'], ['Obsidienne Corrompue', 'chambres.cadre'],
  ['Diamant Holographique', 'artefact.conditions'], ['Orichalque', 'amelioration.trouNonComble'],
  ['Orichalque Scintillant', 'amelioration.trouNonComble'], ['Pierre Lunaire', 'amelioration.trouNonComble'],
  ['Médaille de donjon', 'parures.upgrade21a30'], ['Étui à carte 1', 'arcanes.etuis'],
  ['Étui à carte 2', 'arcanes.etuis'], ['Étui à carte 3', 'arcanes.etuis'],
  ['Cristal féérique', 'esprits.paliers'], ['Essence de Luciole', 'esprits.paliers'],
  ["Coeur d'Ange", 'esprits.paliers'], ['Ailes enchantées', 'esprits.paliers'],
  ['Redbull Magique', 'esprits.paliers'], ['Voeux de Rhisis', 'esprits.paliers'],
  ['Grenat', 'fashion.sertissage.gemmes'], ['Turquoise', 'fashion.sertissage.gemmes'],
  ['Aigue-marine', 'fashion.sertissage.gemmes'], ['Améthyste', 'fashion.sertissage.gemmes'],
  ['Rune vampirique Vierge', null], ['Rune Yggdrasil Vierge', null],
]

/** Dessins ouverts À L'ŒIL avant d'être écrits dans le relevé — parce que les noms
 *  de fichiers mentent, et que cinq pièges ont déjà été payés sur ce dépôt. Ceux-là
 *  ont été regardés : la pierre, la poudre, l'obsidienne, le diamant, les quatre
 *  gemmes de costume, le jeton et les deux runes vierges. */
const DESSINS_REGARDES = [
  'itm_syssysscrscraplightningstone.webp', 'itm_poudre_feerique.webp', 'itm_obsidienne_corrompue.webp',
  'itm_diamant_multicolore.webp', 'itm_syssysscrscrapgarnet.webp', 'itm_syssysscrscrapturquoise.webp',
  'itm_syssysscrscrapamethyst.webp', 'itm_goldchip.webp', 'itm_armorshard.webp',
  'itm_rune_vierge_yggdrasil.webp',
]

/* ── LECTURE DES RELEVÉS DU SITE, POUR LA CONFRONTATION ───────────────────── */

const lireJson = async (p) => JSON.parse(await readFile(join(RACINE, p), 'utf8'))

/** dungeons.json ↔ pages d'instance : les deux ne nomment pas tout pareil. */
const ALIAS_INSTANCE = {
  'desirea': 'desirea', 'ruines prestigieuses': 'ruine prestigieuse',
  'temple de zerkattak behemoth': 'behemoth', 'sanctuaire de shogun': 'sanctuaire shogun',
}
const cleInstance = (nom) => {
  const k = sansAccent(nom).replace(/^(l |la |le |les )/, '')
  return ALIAS_INSTANCE[k] ?? k
}

async function confronter(instances, faits) {
  const ecarts = []
  const pousse = (o) => ecarts.push(o)

  /* — les instances — */
  const dj = await lireJson('src/data/dungeons.json')
  const parCle = new Map(dj.map((d) => [cleInstance(d.name), d]))
  const vues = new Set()
  const pvEcart = []
  for (const i of instances) {
    const c = cleInstance(i.nom)
    const d = parCle.get(c)
    if (!d) {
      pousse({
        sujet: 'Instances', verdict: 'COMPLETE', id: `instance.absente.${c}`,
        wiki: { nom: i.nom, famille: i.famille, pvTank: i.pvTank, entreesParJour: i.entreesParJour, butin: i.butin },
        site: null, ou: 'src/data/dungeons.json',
        dit:
          `Le wiki porte une instance que le relevé du site ne connaît pas : « ${i.nom} » (famille ${i.famille}).` +
          ` L'ajouter fait passer le site de ${dj.length} à ${dj.length + 1} instances — et « ${dj.length} instances » est un compte qui se dit ailleurs dans la navigation :` +
          ` il se recalcule sur le fichier, il ne se retape pas.`,
      })
      continue
    }
    vues.add(c)
    if (i.pvTank && d.hp && i.pvTank !== d.hp) {
      pvEcart.push({ nom: d.name, site: d.hp, wiki: i.pvTank, ecart: i.pvTank - d.hp, ratio: Number((i.pvTank / d.hp).toFixed(2)) })
    }
    if (i.prestigeMini != null && d.prestige != null && i.prestigeMini !== d.prestige) {
      pousse({
        sujet: 'Instances', verdict: 'CONTREDIT', id: `instance.prestige.${c}`,
        wiki: { prestigeMini: i.prestigeMini }, site: { prestige: d.prestige },
        ou: 'src/data/dungeons.json', page: i.url,
        dit: `${d.name} : le site demande prestige ${d.prestige}, le wiki prestige ${i.prestigeMini}.`,
      })
    }
    if (i.niveauMini != null && d.lvl) {
      const nSite = nombre(d.lvl)
      if (nSite != null && nSite !== i.niveauMini) {
        pousse({
          sujet: 'Instances', verdict: 'CONTREDIT', id: `instance.niveau.${c}`,
          wiki: { niveauMini: i.niveauMini }, site: { lvl: d.lvl }, ou: 'src/data/dungeons.json', page: i.url,
          dit: `${d.name} : niveau minimum ${nSite} sur le site, ${i.niveauMini} sur le wiki.`,
        })
      }
    }
  }
  if (pvEcart.length) {
    const comparees = instances.filter((i) => i.pvTank && parCle.get(cleInstance(i.nom))).length
    const sousEvalues = pvEcart.filter((l) => l.wiki > l.site).length
    const pire = pvEcart.reduce((a, b) => (b.ratio > a.ratio ? b : a))
    pousse({
      sujet: 'Instances — PV conseillés pour le tank', verdict: 'CONTREDIT', id: 'instance.pvTank',
      gravite: 'haute',
      wiki: 'les PV annoncés par les pages d’instance du wiki officiel',
      site: 'src/data/dungeons.json ▸ hp, servi sous le libellé « PV recommandés » sur /donjons',
      lignes: pvEcart,
      compte: { instancesComparees: comparees, identiques: comparees - pvEcart.length, enEcart: pvEcart.length, siteEnDessous: sousEvalues },
      dit:
        `${pvEcart.length} des ${comparees} instances comparées portent deux chiffres différents, et ${sousEvalues} d'entre elles ont le chiffre du site EN DESSOUS de celui du wiki` +
        ` (au pire ${pire.nom} : ${pire.site} contre ${pire.wiki}, soit ×${pire.ratio}).` +
        " C'est un seuil d'entrée servi à l'écran : un tank qui s'aligne sur le site arrive sous-équipé et fait rater la run à son groupe." +
        ` Les ${comparees - pvEcart.length} instances identiques sont toutes des instances récentes — le relevé du site semble simplement plus ancien que le wiki, pas faux par principe.`,
    })
  }
  const nonVues = dj.filter((d) => !vues.has(cleInstance(d.name))).map((d) => d.name)
  if (nonVues.length) {
    pousse({ sujet: 'Instances', verdict: 'COMPLETE', id: 'instance.sansPageWiki', site: nonVues, wiki: null, dit: 'Instances du site sans page correspondante dans le wiki.' })
  }
  const elems = [...new Set(instances.map((i) => i.elementArmure).filter(Boolean))]
  const sansArmure = dj.filter((d) => !d.armor).map((d) => d.name)
  pousse({
    sujet: 'Instances — élément d’armure du tank', verdict: 'CONFIRME', id: 'instance.elementArmure',
    wiki: { valeurs: elems, pages: instances.filter((i) => i.elementArmure).length },
    site: { valeurs: [...new Set(dj.map((d) => d.armor).filter(Boolean))], instancesSansArmure: sansArmure },
    ou: 'src/data/dungeons.json ▸ armor',
    dit:
      `Le wiki demande le même élément sur les ${instances.filter((i) => i.elementArmure).length} pages d'instance : ${elems.join(' · ')}. Le site l'écrit déjà (« Armure vent +20 »), donc l'ÉLÉMENT est confirmé.` +
      ` Deux réserves quand même. Le « +20 » est du site seul : le wiki ne chiffre le palier d'armure qu'une fois, « Vent +10 » à Désirea, et laisse les autres sans niveau.` +
      ` Et ${sansArmure.length} instances du site n'affichent aucune armure (${sansArmure.join(', ')}) alors que le wiki en demande une sur chacune.`,
  })

  /* — la maîtrise d'arme — */
  const meca = await lireJson('public/airbuilder/mecaniques.json')
  const plafondWiki = faits.find((f) => f.id === 'maitrise.plafondParRarete').valeurs
  const plafondSite = meca.faits?.maitrise?.plafondNiveau ?? {}
  const memePlafond = Object.entries(plafondWiki).every(([k, v]) => plafondSite[k] === v || (v === null && plafondSite[k] == null))
  pousse({
    sujet: 'Maîtrise de l’arme', verdict: memePlafond ? 'CONFIRME' : 'CONTREDIT', id: 'maitrise.plafonds',
    wiki: plafondWiki, site: plafondSite, ou: 'public/airbuilder/mecaniques.json ▸ faits.maitrise',
    dit: memePlafond
      ? 'Le site a déjà intégré les plafonds du wiki. Le gain par palier (4 / 2) vient du client, les plafonds du wiki : les deux moitiés du mécanisme viennent de deux sources différentes et l’arithmétique ferme (10 paliers × 4 % = 40 %, le maximum annoncé).'
      : 'Les plafonds diffèrent — à reprendre.',
  })
  pousse({
    sujet: 'Raretés — combien y en a-t-il ?', verdict: 'CONTREDIT', id: 'rarete.nombreDeTiers',
    gravite: 'moyenne',
    wiki: { nommees: 5, liste: ['Commune', 'Rare', 'Épique', 'Légendaire', 'Mythique'], note: 'la page Maîtrise saute Pré-mythique ; la page Rareté, elle, le nomme comme 4ᵉ ligne' },
    site: { declarees: 6, liste: Object.keys(meca.faits?.maitrise?.plafondNiveau ?? {}) },
    ou: 'public/airbuilder/data.json ▸ MECH.arme.rarete_tiers',
    dit: "Le client déclare SIX paliers (dont PREMYTHIC) ; la table des plafonds de maîtrise du wiki n'en nomme que CINQ et ne dit pas où s'arrête un Pré-mythique. Le site a raison de laisser ce plafond à `null` plutôt que de l'inventer.",
  })

  /* — l'éveil : trois séries, et ce qu'elles sont vraiment — */
  const bonus = await lireJson('public/wiki/bonus-sources.json')
  pousse({
    sujet: 'Éveil basique — plafonds de tirage', verdict: 'CONFIRME', id: 'eveil.basique',
    wiki: faits.find((f) => f.id === 'eveil.basique.plafonds').valeurs.equipement,
    site: { DST_STR: bonus.eveil?.general?.DST_STR, DST_CRITICAL_BONUS: bonus.eveil?.general?.DST_CRITICAL_BONUS, DST_HP_MAX: bonus.eveil?.general?.DST_HP_MAX, DST_MP_MAX: bonus.eveil?.general?.DST_MP_MAX, DST_ATKPOWER: bonus.eveil?.general?.DST_ATKPOWER },
    ou: 'public/wiki/bonus-sources.json ▸ eveil.general (= data.json ▸ MECH.arme.eveil)',
    dit: "LA RÉSERVE TOMBE. MECH.arme.eveil (Force 15, PV 100…) n'est pas une troisième série concurrente : c'est le PLAFOND DE L'ÉVEIL BASIQUE, et le wiki l'écrit mot pour mot — 15 en stat, 10 % sur les stats à %, 100 pour attaque/MP/PV. Les trois séries ne se contredisent pas, elles ne parlent pas de la même chose.",
  })
  pousse({
    sujet: 'Éveil basique sur fashion', verdict: 'CONTREDIT', id: 'eveil.basique.costume',
    wiki: faits.find((f) => f.id === 'eveil.basique.plafonds').valeurs.fashion,
    site: bonus.eveil?.costume ?? null,
    ou: 'public/wiki/bonus-sources.json ▸ eveil.costume',
    dit: `Le wiki plafonne l'éveil de fashion à 7 en statistique et 5 % de DCC ; le client déclare ${JSON.stringify(bonus.eveil?.costume)}. Personne ne peut trancher sans mesurer en jeu : le relevé porte les deux.`,
  })
  pousse({
    sujet: 'Éveils fixes — DEUX familles, pas trois séries', verdict: 'COMPLETE', id: 'eveil.fixe.deuxFamilles',
    gravite: 'haute',
    wiki: {
      'série d’origine (armes, armures, boucliers)': { R1: 30, R2: 60, ou: 'Temple de Zerkattak / Behemoth', preuve: 'légendes des deux captures du wiki : END+30, INT+60' },
      'série acte 3 (bijoux, fashions, capes, masques)': faits.find((f) => f.id === 'eveil.fixe.acte3').valeurs,
      contrainte: 'une seule ligne d’éveil fixe par pièce',
    },
    site: meca.faits?.eveil?.fixe?.lignes?.slice(0, 5) ?? null,
    ou: 'public/airbuilder/mecaniques.json ▸ faits.eveil',
    dit: "Le site portait 30 / 60 et le wiki 10 / 20 : ce n'est pas une contradiction, ce sont DEUX FAMILLES DE PARCHEMINS. La série 30/60 va sur les armes, armures et boucliers (Behemoth) ; la série 10 INT-END-FOR / 200 MP / 8 % DCC (R1) et 20 / 400 / 15 % (R2) est celle de l'acte 3, pour les BIJOUX (Temple Aérien) et les FASHIONS, CAPES et MASQUES (Paradis Arcanique). Un chiffre affiché doit donc dire SUR QUELLE PIÈCE il s'applique — et le builder doit ajouter la contrainte que le client ne porte pas : UNE SEULE ligne d'éveil fixe, là où l'éveil basique en autorise trois.",
  })

  /* — l'ascension : le client ne chiffre rien, le wiki chiffre — */
  pousse({
    sujet: 'Ascension', verdict: 'COMPLETE', id: 'ascension.gain',
    gravite: 'haute',
    wiki: faits.find((f) => f.id === 'artefact.ascension.gain').valeurs,
    site: { dansLeTotal: meca.faits?.ascension?.dansLeTotal, pourquoiPas: meca.faits?.ascension?.pourquoiPas },
    ou: 'public/airbuilder/mecaniques.json ▸ faits.ascension',
    dit: "Le site écrit « le client ne chiffre aucun gain d'ascension ». Le wiki le chiffre : +5 % au niveau 1, +10 % au niveau 2, +15 % au niveau 3 sur CHACUNE des statistiques de l'arme, 30 % en tout — et seulement sur la première main. C'est une mécanique aujourd'hui marquée « non comptée » dans le builder qui devient calculable.",
  })

  /* — l'amélioration : le trou reste ouvert des deux côtés — */
  pousse({
    sujet: 'Amélioration +1 → +20', verdict: 'CONFIRME', id: 'amelioration.silence',
    wiki: { gainParPalier: null, ceQuIlDit: ['+1 → +10 sur l’arme', '+11 → +20 réservé au statut Artefact', 'protection = 100 % de réussite'] },
    site: { nonCalculable: meca.faits?.nonCalculable?.upgradeArme?.quoi ?? null },
    ou: 'public/airbuilder/mecaniques.json ▸ faits.nonCalculable.upgradeArme',
    dit: "Le wiki ne comble PAS ce trou : il ne chiffre aucun gain par palier d'amélioration d'arme. La mention « non compté » du builder reste juste — et c'est maintenant vérifié sur les deux sources, plus seulement sur le client.",
  })
  pousse({
    sujet: 'Amélioration de costume', verdict: 'COMPLETE', id: 'amelioration.costume',
    wiki: faits.find((f) => f.id === 'fashion.upgrade').valeurs,
    site: { nonCalculable: meca.faits?.nonCalculable?.upgradeCostume?.quoi ?? null },
    ou: 'public/airbuilder/mecaniques.json ▸ faits.nonCalculable.upgradeCostume',
    dit: "Le site cherchait un gain par palier de costume dans le client et n'en trouvait pas. Le wiki explique pourquoi : l'upgrade de costume ne DONNE pas de statistique, il OUVRE des emplacements de sertissage (+7 à +10, quatre au total). La valeur est dans la gemme, pas dans le palier.",
  })
  pousse({
    sujet: 'Sertissage — deux systèmes distincts', verdict: 'COMPLETE', id: 'sertissage.deuxSystemes',
    wiki: { costume: ['Grenat', 'Turquoise', 'Aigue-marine', 'Améthyste'], echelle: '1 à 4 gemmes par pièce' },
    site: { armeArmure: (meca.faits?.sertissage?.echelle ?? []).map((e) => e.fr), gemmes: [...new Set((meca.faits?.sertissage?.echelle ?? []).flatMap((e) => e.gemmes.map((g) => g.n)))] },
    ou: 'public/airbuilder/mecaniques.json ▸ faits.sertissage',
    dit: "Ce ne sont pas les mêmes pierres ni les mêmes pièces. Le relevé du site couvre le sertissage d'ARME et d'ARMURE (Topaze, Rubis, Saphir, Émeraude, Diamant) ; le wiki documente le sertissage de COSTUME (Grenat pour la tête, Turquoise pour le corps, Aigue-marine pour les gants, Améthyste pour les bottes), que le site ne porte pas du tout.",
  })

  /* — les esprits — */
  const espritsWiki = faits.find((f) => f.id === 'esprits.paliers').valeurs.esprits
  const espritsSite = Object.fromEntries((meca.faits?.esprit?.esprits ?? []).map((e) => [e.n, Object.fromEntries(e.paliers)]))
  const desaccords = []
  for (const [nom, paliers] of Object.entries(espritsWiki)) {
    const s = espritsSite[nom]
    if (!s) continue
    for (const [p, v] of Object.entries(paliers)) {
      const sv = s[p]
      if (sv && sansAccent(sv).replace(/ /g, '') !== sansAccent(v).replace(/ /g, '')) desaccords.push({ esprit: nom, palier: Number(p), site: sv, wiki: v })
    }
  }
  const espritsMontables = (await lireJson('public/wiki/collections.json')).anges.filter((a) => a.montable).map((a) => a.n)
  const espritsEnEcart = [...new Set(desaccords.map((d) => d.esprit))]
  pousse({
    sujet: 'Esprits — bonus par palier', verdict: desaccords.length ? 'CONTREDIT' : 'CONFIRME', id: 'esprits.paliers',
    gravite: desaccords.length ? 'moyenne' : null,
    wiki: espritsWiki, site: espritsSite, lignes: desaccords,
    ou: 'public/airbuilder/mecaniques.json ▸ faits.esprit (relevé de public/wiki/collections.json ▸ anges)',
    dit: desaccords.length
      ? `${desaccords.length} paliers ne concordent pas, et tous sur le même esprit : ${espritsEnEcart.join(', ')}, aux paliers ${[...new Set(desaccords.map((d) => d.palier))].join(', ')}.` +
        ` Les quatre autres esprits concordent palier pour palier, et le palier 50 de ${espritsEnEcart.join(', ')} est identique des deux côtés — c'est donc bien le même esprit, pas un mauvais appariement de noms.` +
        ` Mais les deux séries ne parlent pas de la même chose : le client donne des bonus de progression (Exp, PvE, déplacement, All Stat) là où le wiki donne du drop et des penyas.` +
        ` Le relevé du client date de la fouille d'octobre 2025 ; le wiki est la source vivante. Ne pas trancher sans regarder l'esprit en jeu.`
      : 'Les paliers concordent.',
  })
  pousse({
    sujet: 'Esprits — combien sont montables', verdict: 'CONFIRME', id: 'esprits.montables',
    wiki: { craftables: 4, boutiqueSeule: ['Goldea'], total: 5 },
    site: { montables: espritsMontables, entreesDansLeReleve: (await lireJson('public/wiki/collections.json')).anges.length },
    ou: 'public/wiki/collections.json ▸ anges',
    dit: `Le wiki annonce 4 esprits craftables plus Goldea en boutique. Le relevé du client porte 20 entrées d'esprit, dont exactement ${espritsMontables.length} marquées « montable » : ${espritsMontables.join(', ')}. Les deux sources désignent le même quintette — les 15 autres entrées sont des esprits à palier unique, sans progression.`,
  })
  pousse({
    sujet: 'Esprits — pourquoi le builder ne les compte pas', verdict: 'COMPLETE', id: 'esprits.dansLeTotal',
    wiki: { palierMax: 50, bonusChiffres: true },
    site: { dansLeTotal: meca.faits?.esprit?.dansLeTotal, pourquoiPas: meca.faits?.esprit?.pourquoiPas },
    ou: 'public/airbuilder/mecaniques.json ▸ faits.esprit',
    dit: "Le builder écarte les esprits parce que les pièces du catalogue portent un tableau de bonus VIDE. Le wiki, lui, chiffre les cinq esprits palier par palier : la mécanique est calculable à partir du wiki, pas à partir du client.",
  })

  /* — le carnet d'arcanes : la règle du wiki tient-elle sur nos 15 carnets ? — */
  const carnets = await lireJson('src/data/carnets-arcanes.json')
  const attendu = { 'Étui 1': { Commune: null }, 'Étui 2': { Rare: 3, Commune: 1 }, 'Étui 3': { 'Épique': 3, 'Légendaire': 3 } }
  const fautes = []
  for (const c of carnets.liste) {
    const compo = {}
    for (const k of c.cartes) compo[k.rarete] = (compo[k.rarete] ?? 0) + 1
    const att = attendu[c.etui]
    if (!att) { fautes.push({ carnet: c.nom, etui: c.etui, raison: 'étui inconnu du wiki' }); continue }
    if (c.etui === 'Étui 1') { if (Object.keys(compo).some((r) => r !== 'Commune')) fautes.push({ carnet: c.nom, compo }); continue }
    for (const [r, n] of Object.entries(att)) {
      const cible = r === 'Épique' ? 'Épique' : r === 'Légendaire' ? 'Légendaire' : r
      if ((compo[cible] ?? 0) !== n) fautes.push({ carnet: c.nom, etui: c.etui, compo, attendu: att })
    }
  }
  pousse({
    sujet: 'Carnet d’Arcanes — composition des étuis', verdict: fautes.length ? 'CONTREDIT' : 'CONFIRME', id: 'arcanes.composition',
    wiki: attendu, site: { carnets: carnets.carnets, cartes: carnets.cartes }, lignes: fautes,
    ou: 'src/data/carnets-arcanes.json',
    dit: fautes.length
      ? `${fautes.length} carnets ne suivent pas la règle annoncée par le wiki.`
      : `La règle du wiki (étui 1 : que des communes · étui 2 : 3 rares + 1 commune · étui 3 : 3 épiques + 3 légendaires) se vérifie sur les ${carnets.carnets} carnets et les ${carnets.cartes} cartes du relevé, sans exception.`,
  })

  /* — le prestige : une quête qu'on ne peut pas faire avant d'en avoir le fruit — */
  pousse({
    sujet: 'Prestige — Badge du Worldboss Prestigieux', verdict: 'CONTREDIT', id: 'prestige.badgeWorldboss',
    gravite: 'moyenne',
    wiki: { queteAccessibleAPartirDuPrestige: 8 },
    site: { 'P7 → P8': 'Badge World Boss prestigieux ×1' },
    ou: 'src/data/prestige.ts ▸ PRESTIGE_COSTS[7]',
    dit: "Le site fait payer le passage 7 → 8 avec un badge dont le wiki dit que la quête n'ouvre qu'AU prestige 8. L'un des deux se trompe, et la page /prestige envoie sinon le joueur farmer une quête qu'il ne peut pas prendre.",
  })
  pousse({
    sujet: 'Prestige — badges de donjon mineur', verdict: 'CONFIRME', id: 'prestige.donjonMineur',
    wiki: { aPartirDuPrestige: 8, pour: [9, 10], nombreParPalier: 2 },
    site: { 'P8 → P9': 2, 'P9 → P10': 2 }, ou: 'src/data/prestige.ts',
    dit: 'Le wiki et la table de coûts du site donnent le même nombre de badges de donjon mineur aux deux derniers paliers.',
  })

  /* — la rareté d'arme : 50 % annoncé, 100 % dans le client sur deux viviers — */
  const viviers = meca.faits?.rarete?.viviers ?? {}
  const au100 = Object.entries(viviers).filter(([, v]) => v.b.some((b) => b[2] > 50)).map(([k]) => k)
  pousse({
    sujet: 'Rareté — plafond d’une ligne', verdict: au100.length ? 'CONTREDIT' : 'CONFIRME', id: 'rarete.plafondLigne',
    gravite: au100.length ? 'moyenne' : null,
    wiki: { maxParLigne: 50 },
    site: { viviersAuDessusDe50: au100, detail: Object.fromEntries(au100.map((k) => [k, viviers[k].b])) },
    ou: 'public/airbuilder/mecaniques.json ▸ faits.rarete.viviers',
    dit: au100.length
      ? `Le wiki écrit « jusqu'à 50 % maximum » par ligne, et le rang Mythique comme « 4 lignes toutes à 50 % ». Le client donne pourtant 20–100 % sur ${au100.join(' et ')} contre 10–50 % sur tous les autres viviers. Le « 50 % » du wiki ne vaut donc pas pour toutes les armes, ou le client porte une échelle que l'écran divise par deux.`
      : 'Le plafond de 50 % vaut sur tous les viviers.',
  })

  /* — la protection de l'Oasis : le wiki se contredit, le client tranche — */
  const oasis = await lireJson('public/wiki/oasis-vagues.json')
  pousse({
    sujet: 'Protection de l’Oasis — nombre d’étages', verdict: 'CONFIRME', id: 'oasis.etages',
    wiki: { 'page Protection de l’Oasis': 52, 'page L’Oasis': 25 },
    site: { vagues: oasis.vagues?.length ?? null },
    ou: 'public/wiki/oasis-vagues.json',
    dit: `Le wiki se contredit LUI-MÊME : sa page « Protection de l'Oasis » annonce 52 étages, sa page « L'Oasis » en annonce 25. Le relevé du client en compte ${oasis.vagues?.length}. La page Oasis du wiki est simplement restée à l'ancienne extension.`,
  })
  pousse({
    sujet: 'Masques — bonus de niveau 2', verdict: 'CONTREDIT', id: 'masques.niveau2',
    wiki: { 'page Masques': 10, 'page L’Oasis': 8 }, site: null,
    ou: 'aucun relevé du site ne porte ce chiffre',
    dit: "Deux pages du même wiki donnent deux valeurs pour le masque de niveau 2 : 10 % et 8 %. Rien ne permet de trancher ici — un chiffre servi à l'écran serait un coup de dés.",
  })

  return ecarts
}

/* ── ASSEMBLAGE ───────────────────────────────────────────────────────────── */

async function fichiersMarkdown(dir, prefixe = '') {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...(await fichiersMarkdown(join(dir, e.name), `${prefixe}${e.name}/`)))
    else if (e.name.endsWith('.md')) out.push(`${prefixe}${e.name.replace(/\.md$/, '')}`)
  }
  return out
}

async function principal() {
  const index = JSON.parse(await readFile(join(CACHE, 'index.json'), 'utf8'))
  const chemins = await fichiersMarkdown(join(CACHE, 'pages'))
  const texte = new Map()
  for (const c of chemins) texte.set(c, aplatir(await readFile(join(CACHE, 'pages', `${c}.md`), 'utf8')))

  /* 1 — les instances */
  const instances = []
  for (const c of chemins.filter((c) => c.startsWith('instances/') && c.includes('/'))) {
    const brut = await readFile(join(CACHE, 'pages', `${c}.md`), 'utf8')
    const i = lireInstance(c, brut)
    if (i) instances.push(i)
  }
  instances.sort((a, b) => (a.famille ?? '').localeCompare(b.famille ?? '') || (a.pvTank ?? 0) - (b.pvTank ?? 0))

  /* 2 — les faits, chacun vérifié contre sa page */
  const faits = []
  const preuvesPerdues = []
  for (const f of FAITS) {
    const plat = texte.get(f.page)
    const manquantes = plat ? f.preuves.filter((p) => !plat.includes(aplatir(p).trim())) : f.preuves
    if (!plat) preuvesPerdues.push({ id: f.id, raison: `page absente du cache : ${f.page}` })
    else if (manquantes.length) preuvesPerdues.push({ id: f.id, manquantes })
    const meta = index.pages.find((p) => p.chemin === f.page)
    faits.push({
      ...f,
      url: `${WIKI}/${f.page}.md`,
      titrePage: meta?.titre ?? null,
      preuves: f.preuves.length,
      verifie: !!plat && manquantes.length === 0,
      preuvesManquantes: manquantes.length ? manquantes : undefined,
    })
  }

  /* 3 — les objets nommés, rattachés aux dessins déjà en dépôt */
  const fiches = (await lireJson('public/wiki/objets-fiches.json')).objets
  const parNom = new Map()
  for (const o of fiches) {
    const k = sansAccent(o.n)
    if (!parNom.has(k)) parNom.set(k, [])
    parNom.get(k).push(o)
  }
  const objets = OBJETS_DU_WIKI.map(([nom, fait, cleVoulue]) => {
    const candidats = parNom.get(sansAccent(nom)) ?? []
    const avecDessin = candidats.filter((c) => c.ic)
    // Une clé nommée tranche l'homonymie ; sinon, il faut que le catalogue ne
    // propose qu'UN seul dessin. Deux dessins et pas de clé : on ne devine pas.
    const o = cleVoulue
      ? candidats.find((c) => c.cle === cleVoulue) ?? null
      : new Set(avecDessin.map((c) => c.ic)).size === 1
        ? avecDessin[0]
        : null
    const ambigu = !o && avecDessin.length > 1
    return {
      nom,
      fait,
      cleClient: o?.cle ?? null,
      icone: o?.ic ? `/jeu/icones/${o.ic}` : null,
      dessinRegarde: o?.ic ? DESSINS_REGARDES.includes(o.ic) : false,
      ...(ambigu
        ? { ambiguite: avecDessin.map((c) => `${c.cle} → ${c.ic}`) }
        : {}),
    }
  })

  /* 4 — la confrontation */
  const confrontation = await confronter(instances, FAITS)
  const ordre = { haute: 0, moyenne: 1 }
  confrontation.sort((a, b) => (ordre[a.gravite] ?? 9) - (ordre[b.gravite] ?? 9))

  const releve = {
    genere: new Date().toISOString(),
    quoi: "Les FAITS du wiki officiel d'Airborn : Winds of Rhisis — chiffres, seuils, tables, conditions — et leur confrontation au relevé tiré du client du jeu.",
    regle: "On extrait des faits, pas de la prose : des valeurs, des seuils, des listes, et l'adresse de la page qui les porte. Les champs de texte sont des étiquettes du wiki (un nom d'objet, un nom de PNJ, une valeur de puce), jamais ses paragraphes — les puces sont lues en tête de ligne pour ne pas attraper la phrase de description qui les précède. Chaque fait déclare des preuves que le script recherche dans la page téléchargée ; un fait dont une preuve tombe est marqué verifie:false.",
    source: { wiki: WIKI, tableDesMatieres: `${WIKI}/llms.txt`, pagesAnnoncees: index.pages.length, pagesLues: chemins.length },
    confronteA: [
      'src/data/dungeons.json', 'src/data/prestige.ts', 'src/data/carnets-arcanes.json',
      'public/airbuilder/mecaniques.json', 'public/wiki/bonus-sources.json', 'public/wiki/oasis-vagues.json',
    ],
    assets:
      "Aucune image n'est prise au wiki. Les objets nommés sont rattachés aux dessins DÉJÀ extraits du client, par le nom français du catalogue (public/wiki/objets-fiches.json), accents et casse mis de côté — c'est le client lui-même qui apparie le nom et le dessin, jamais nous d'après un nom de fichier. Deux objets peuvent porter le même nom : l'homonymie n'est jamais tranchée par l'ordre du catalogue, il faut nommer la clé du client, sinon l'objet ressort sans dessin et le champ `ambiguite` dit entre quoi le choix restait à faire. " +
      "`dessinRegarde` dit lesquels ont en plus été ouverts à l'œil : les noms de fichiers mentent, et ce dépôt a déjà payé cinq fois pour l'avoir oublié.",
    comptes: {
      faits: faits.length,
      faitsVerifies: faits.filter((f) => f.verifie).length,
      instances: instances.length,
      objetsRattaches: objets.filter((o) => o.icone).length,
      objetsSansDessin: objets.filter((o) => !o.icone).length,
      dessinsRegardes: objets.filter((o) => o.dessinRegarde).length,
      confrontations: confrontation.length,
      contredit: confrontation.filter((c) => c.verdict === 'CONTREDIT').length,
      confirme: confrontation.filter((c) => c.verdict === 'CONFIRME').length,
      complete: confrontation.filter((c) => c.verdict === 'COMPLETE').length,
    },
    confrontation,
    instances,
    faits,
    objets,
  }

  await writeFile(SORTIE, `${JSON.stringify(releve, null, 1)}\n`)

  process.stdout.write(`${chemins.length} pages lues · ${instances.length} instances analysées · ${faits.length} faits\n`)
  if (preuvesPerdues.length) {
    process.stdout.write(`\n!! ${preuvesPerdues.length} faits dont une preuve n'a pas été retrouvée :\n`)
    for (const p of preuvesPerdues) process.stdout.write(`   ${p.id} → ${JSON.stringify(p.manquantes ?? p.raison)}\n`)
  } else process.stdout.write('toutes les preuves retrouvées dans les pages\n')
  process.stdout.write(
    `confrontation : ${releve.comptes.contredit} CONTREDIT · ${releve.comptes.confirme} CONFIRME · ${releve.comptes.complete} COMPLETE\n${SORTIE}\n`,
  )
}

principal().catch((e) => {
  process.stderr.write(`${e.stack || e}\n`)
  process.exit(1)
})
