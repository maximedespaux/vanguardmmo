#!/usr/bin/env node
/*
 * LES FAITS DU SITE OFFICIEL — https://windsofrhisis.com
 *
 * ┌──── POURQUOI UN SCRIPT, ET PAS UNE VISITE ─────────────────────────────────┐
 * │ Le site officiel est une application React d'une seule page : son HTML ne  │
 * │ contient que 996 octets de coquille, aucun contenu. TOUT ce qui est fixe   │
 * │ — les paliers de fidelite, les lots d'AirPoints, la configuration requise, │
 * │ les miroirs de telechargement — vit dans le paquet JavaScript. C'est donc  │
 * │ le paquet qu'on lit, et on le lit A L'ADRESSE QUE LA PAGE DONNE : le nom   │
 * │ du fichier porte une empreinte qui change a chaque mise en ligne, il ne    │
 * │ se retape pas.                                                             │
 * │                                                                            │
 * │ CE QU'ON NE LIT PAS : les classements et la boutique, qui viennent d'une   │
 * │ base Firestore a l'execution. Ce sont des donnees vivantes appartenant au  │
 * │ serveur ; on ne va pas les chercher, et un classement fige n'est pas un    │
 * │ fait mais une photographie perimee des le lendemain.                       │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ON PREND DES FAITS, PAS DE LA PROSE. Les phrases du site appartiennent a ses
 * auteurs : rien n'est recopie. Ce qui sort d'ici, ce sont des valeurs — des
 * prix, des seuils, des versions, des listes d'objets — et l'adresse de la page
 * qui les porte. Chaque fait declare une `preuve` : une courte chaine que le
 * script RECHERCHE dans le paquet telecharge. Une preuve absente ⇒ le fait sort
 * `verifie: false` et le script le crie.
 *
 *   node scripts/extraire-faits-site-officiel.mjs [--sortie <fichier>] [--cache <dossier>]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (nom, defaut) => {
  const i = process.argv.indexOf(`--${nom}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut
}
const SITE = 'https://windsofrhisis.com'
const SORTIE = resolve(arg('sortie', join(RACINE, 'public/wiki/faits-site-officiel.json')))
const CACHE = resolve(arg('cache', join(process.env.TMPDIR || '/tmp', 'site-airborn')))
const AGENT = 'VanguardMMO-wiki-ingest/1.0 (site de guilde, lecture seule)'
const dodo = (ms) => new Promise((r) => setTimeout(r, ms))

async function recuperer(url) {
  const rep = await fetch(url, { headers: { 'user-agent': AGENT } })
  if (!rep.ok) throw new Error(`${url} — HTTP ${rep.status}`)
  return rep.text()
}

/** Le paquet ecrit ses accents en `\xe9` : on les rend lisibles pour la recherche. */
const lisible = (t) =>
  String(t)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')

/**
 * LE CONTENU D'UNE BOITE, SORTI DE SA PHRASE.
 *
 * Le site decrit chaque boite de fidelite par une phrase qui se termine par une
 * parenthese : c'est CETTE parenthese qui porte le fait (« 2 tissus premium
 * cosmetiques, 5 maitrises S, 1 mutagene… »). On en tire une liste d'objets avec
 * leur quantite ; la phrase, elle, reste chez son auteur.
 */
function contenuDeLaBoite(description) {
  const m = lisible(description).match(/\(([^)]*)\)\s*$/)
  if (!m) return null
  return m[1]
    .split(/\s*,\s*| et /)
    .map((bout) => bout.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((bout) => {
      const q = bout.match(/^(\d[\d\s]*)\s+(.*)$/)
      return q ? { quantite: Number(q[1].replace(/\s/g, '')), objet: q[2] } : { quantite: null, objet: bout }
    })
}

async function principal() {
  await mkdir(CACHE, { recursive: true })

  /* 1 — la coquille donne l'adresse du paquet */
  const coquille = await recuperer(`${SITE}/`)
  await writeFile(join(CACHE, 'index.html'), coquille)
  const chemin = coquille.match(/src="(\/static\/js\/[^"]+\.js)"/)
  if (!chemin) throw new Error("la coquille ne nomme aucun paquet JavaScript")
  await dodo(800)
  const paquet = await recuperer(`${SITE}${chemin[1]}`)
  await writeFile(join(CACHE, 'paquet.js'), paquet)

  const faits = []
  const echecs = []
  /** Un fait n'entre que si ses preuves sont retrouvees dans le paquet. */
  const pousse = (fait) => {
    const preuves = (fait.preuves || []).map((p) => ({ texte: p, vue: paquet.includes(p) }))
    const verifie = preuves.every((p) => p.vue)
    if (!verifie) echecs.push({ sujet: fait.sujet, manquantes: preuves.filter((p) => !p.vue).map((p) => p.texte) })
    faits.push({ ...fait, preuves: preuves.map((p) => p.texte), verifie })
  }

  /* 2 — les lots d'AirPoints : prix en euros, points, bonus */
  const lots = [...paquet.matchAll(/\{price:"([\d,]+)",points:(\d+),bonus:(null|\d+),title:"([^"]+)"/g)].map((m) => ({
    prixEuros: Number(m[1].replace(',', '.')),
    points: Number(m[2]),
    bonusPourCent: m[3] === 'null' ? 0 : Number(m[3]),
    nom: lisible(m[4]),
  }))
  if (lots.length) {
    const base = lots.find((l) => !l.bonusPourCent)
    const parEuro = base ? base.points / base.prixEuros : null
    pousse({
      sujet: 'AirPoints — ce que coute la monnaie du site',
      id: 'airpoints.lots',
      page: `${SITE}/shop-points`,
      valeur: {
        lots,
        pointsParEuroSansBonus: parEuro,
        lotsAvecBonus: lots.filter((l) => l.bonusPourCent).length,
        pointsParEuroAuMeilleurLot: Math.max(...lots.map((l) => l.points / l.prixEuros)),
      },
      preuves: ['points:100,bonus:null', 'points:2875,bonus:15'],
      dit:
        `Le site vend ${lots.length} lots d'AirPoints. Sans bonus, ${parEuro} point(s) par euro ;` +
        ` les ${lots.filter((l) => l.bonusPourCent).length} plus gros ajoutent de ${Math.min(...lots.filter((l) => l.bonusPourCent).map((l) => l.bonusPourCent))}` +
        ` a ${Math.max(...lots.map((l) => l.bonusPourCent))} % de points en plus.` +
        " C'est le taux de change reel entre l'euro et la monnaie de boutique, et il n'existe nulle part ailleurs.",
    })
  }

  /* 3 — les paliers de fidelite : combien d'AirPoints pour chaque palier */
  const paliers = [...paquet.matchAll(/\{id:(\d+),name:"([^"]+)",requiredAmount:(\d+)\}/g)].map((m) => ({
    rang: Number(m[1]),
    nom: lisible(m[2]),
    airPointsRequis: Number(m[3]),
  }))
  const paliersVrais = paliers.filter((p) => p.airPointsRequis > 0)
  if (paliersVrais.length) {
    pousse({
      sujet: 'Fidelite — les paliers et leur seuil',
      id: 'fidelite.paliers',
      page: `${SITE}/me/fidelity`,
      valeur: { paliers: paliersVrais, horsPaliers: paliers.filter((p) => !p.airPointsRequis).map((p) => p.nom) },
      preuves: ['requiredAmount:525', 'requiredAmount:5300'],
      dit:
        `${paliersVrais.length} paliers de fidelite, de ${paliersVrais[0].nom} (${paliersVrais[0].airPointsRequis} AirPoints)` +
        ` a ${paliersVrais[paliersVrais.length - 1].nom} (${paliersVrais[paliersVrais.length - 1].airPointsRequis}).` +
        " Le seuil se compte en AirPoints recharges, pas en euros.",
    })
  }

  /* 4 — les boites de fidelite : identifiant en jeu et contenu */
  const boites = [...paquet.matchAll(/\{id:(\d+),name:"(Bo[^"]*fidélité[^"]*|Bo[^"]*fid\\xe9lit\\xe9[^"]*)",icon:"([^"]+)",description:"([^"]*)"\}/g)].map((m) => ({
    identifiantJeu: Number(m[1]),
    nom: lisible(m[2]),
    icone: m[3],
    palier: (lisible(m[4]).match(/palier\s+(\w+)/) || [])[1] || null,
    contenu: contenuDeLaBoite(m[4]),
  }))
  if (boites.length) {
    pousse({
      sujet: 'Fidelite — ce que contient chaque boite',
      id: 'fidelite.boites',
      page: `${SITE}/me/fidelity`,
      valeur: { boites },
      preuves: ['box_fidelite_1.webp', 'box_fidelite_5.webp'],
      dit:
        `${boites.length} boites de recompense, ${boites.filter((b) => b.contenu).length} dont le contenu est chiffre.` +
        " Chacune porte son identifiant d'objet en jeu — c'est le pont entre le site officiel et le catalogue du client.",
    })
  }

  /* 5 — la configuration requise, telle que la page /download la publie */
  const bloc = paquet.slice(paquet.indexOf('Configuration requise'))
  const cellules = [...bloc.slice(0, 9000).matchAll(/children:"([^"]{2,140})"/g)].map((m) => lisible(m[1]))
  const rubriques = ['Architecture', "Système d'exploitation", 'Mémoire vive (RAM)', 'CPU (Processeur)', 'Carte graphique', 'Disque dur']
  const config = {}
  for (const r of rubriques) {
    const i = cellules.indexOf(r)
    if (i !== -1 && cellules[i + 1]) config[r] = cellules[i + 1]
  }
  if (Object.keys(config).length) {
    pousse({
      sujet: 'Client — la configuration que le site annonce',
      id: 'client.configuration',
      page: `${SITE}/download`,
      valeur: config,
      preuves: ['Configuration requise', 'x64 (64 Bits)'],
      dit:
        `${Object.keys(config).length} rubriques de configuration.` +
        " La memoire est annoncee PAR CLIENT OUVERT : c'est le seul chiffre de cette liste qui change un geste, celui du joueur qui fait tourner plusieurs fenetres.",
    })
  }

  /* 6 — les miroirs de telechargement */
  const miroirs = [...paquet.matchAll(/\{name:"([^"]+)",description:"([^"]*)",imageSrc:"\/img\/mirrors\/[^"]*",imageAlt:"[^"]*",href:"([^"]+)"\}/g)].map((m) => ({
    hebergeur: m[1],
    forme: lisible(m[2]),
    adresse: m[3],
  }))
  if (miroirs.length) {
    pousse({
      sujet: 'Client — ou le telecharger',
      id: 'client.miroirs',
      page: `${SITE}/download`,
      valeur: { miroirs },
      preuves: ['/img/mirrors/mega.png', '/img/mirrors/google-drive.png'],
      dit:
        `${miroirs.length} miroirs, tous deux hors du site (${miroirs.map((m) => m.hebergeur).join(' et ')}), et sans installateur.` +
        " Aucune version n'est affichee : le site ne dit pas quelle version du client il distribue.",
    })
  }

  /* 7 — ce que le site met en avant, et les pages qu'il ouvre */
  const routes = [...new Set([...paquet.matchAll(/path:"(\/[^"]*)"/g)].map((m) => m[1]))]
  if (routes.length) {
    pousse({
      sujet: 'Site — les pages publiques',
      id: 'site.pages',
      page: SITE,
      valeur: { routes, comptes: { total: routes.length, compte: routes.filter((r) => r.startsWith('/me') || r.startsWith('/auth')).length } },
      preuves: ['path:"/ranking"', 'path:"/shop-items"'],
      dit:
        `${routes.length} adresses declarees. Deux seulement portent des donnees de jeu — le classement et le catalogue de boutique — et les deux se remplissent a l'execution depuis la base du serveur : elles ne sont pas lisibles hors ligne.`,
    })
  }

  /* 8 — le classement : ce qu'il compare */
  const colonnes = ['Personnage', 'Guilde', 'Classe', 'Niveau', 'Temps de jeu'].filter((c) => paquet.includes(`children:"${c}"`))
  if (colonnes.length) {
    pousse({
      sujet: 'Classement officiel — ce qui est compare',
      id: 'classement.colonnes',
      page: `${SITE}/ranking`,
      valeur: { colonnes },
      preuves: ['path:"/ranking"', 'children:"Temps de jeu"'],
      dit:
        `Le classement officiel compare ${colonnes.length} colonnes : ${colonnes.join(' · ')}.` +
        " Le TEMPS DE JEU y figure a cote du niveau — le serveur mesure donc publiquement les heures passees, pas seulement la progression.",
    })
  }

  /* 9 — le depart commun, que le site affiche en premier argument */
  const freshStart = paquet.includes('Fresh Start')
  if (freshStart) {
    pousse({
      sujet: 'Serveur — un depart commun',
      id: 'serveur.freshStart',
      page: SITE,
      valeur: { misEnAvant: 'Fresh Start', arguments: ['Fresh Start', 'Progression accélérée', 'Contenu évolutif', 'Compétition permanente', 'PvP & rivalités', 'Une aventure communautaire'].filter((a) => paquet.includes(a) || paquet.includes(a.replace(/é/g, '\\xe9'))) },
      preuves: ['Fresh Start'],
      dit:
        "Le premier argument de la page d'accueil est un DEPART COMMUN : tout le monde recommence en meme temps. C'est ce qui date le contenu du site de guilde — un releve tire d'un client d'octobre 2025 ne decrit pas forcement l'etat d'un serveur reparti de zero.",
    })
  }

  /* 10 — la monnaie ne revient pas en euros */
  if (paquet.includes('ne peuvent') && paquet.includes('AirPoints')) {
    pousse({
      sujet: 'AirPoints — sens unique',
      id: 'airpoints.sensUnique',
      page: `${SITE}/cgu`,
      valeur: {
        transfertVersLeJeu: true,
        retourVersLEuro: false,
        retractationJours: Number((paquet.match(/(\d+)j\s+(?:pour vous faire rembourser|l\\xe9gal)/) || [])[1] || 14),
        conditionDuRemboursement: 'points non transferes en jeu',
      },
      preuves: ['AirPoints', 'shop-transfer-success'],
      dit:
        "Les AirPoints vont du site vers un personnage, jamais l'inverse, et le delai de retractation ne porte que sur les points NON transferes. Un point transfere est consomme : c'est ce qui rend le prix d'un objet de boutique irreversible.",
    })
  }

  const releve = {
    genere: new Date().toISOString(),
    quoi: "Les FAITS du site officiel d'Airborn : Winds of Rhisis — prix, seuils, configurations, listes — tires du paquet JavaScript qu'il sert.",
    regle:
      "Aucune phrase du site n'est recopiee : on extrait des valeurs et on nomme la page qui les porte. Chaque fait declare des preuves que le script recherche dans le paquet telecharge ; une preuve absente marque le fait verifie:false.",
    source: { site: SITE, paquet: `${SITE}${chemin[1]}`, octetsDuPaquet: paquet.length },
    ceQuOnNeLitPas:
      "Le classement (/ranking) et le catalogue de boutique (/shop-items) se remplissent depuis la base du serveur a l'execution. Ce sont des donnees vivantes : on ne les aspire pas, et un classement fige n'est pas un fait.",
    comptes: { faits: faits.length, faitsVerifies: faits.filter((f) => f.verifie).length, echecs: echecs.length },
    faits,
    echecs,
  }
  await mkdir(dirname(SORTIE), { recursive: true })
  await writeFile(SORTIE, `${JSON.stringify(releve, null, 1)}\n`)
  process.stdout.write(
    `paquet : ${chemin[1]} (${paquet.length} o)\n${faits.length} faits, ${faits.filter((f) => f.verifie).length} verifies, ${echecs.length} en echec\n${SORTIE}\n`,
  )
  for (const e of echecs) process.stdout.write(`  !! ${e.sujet} — preuve(s) absente(s) : ${e.manquantes.join(' · ')}\n`)
}

principal().catch((e) => {
  process.stderr.write(`${e.stack || e}\n`)
  process.exit(1)
})
