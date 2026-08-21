#!/usr/bin/env node
// Aspire le wiki officiel d'Airborn : Winds of Rhisis (https://airborn.gitbook.io/airborn).
//
// GitBook expose chaque page en Markdown en suffixant son adresse par « .md », et la table
// des matieres complete par « /llms.txt ». On telecharge donc la table, puis chaque page,
// EN TEMPORISANT entre les requetes : c'est le site de quelqu'un d'autre, on ne le martele pas.
//
// Les pages brutes ne sont PAS destinees a etre servies : la prose du wiki appartient a ses
// auteurs. Ce cache local ne sert qu'a l'extraction de FAITS (chiffres, seuils, tables), qui
// est le travail de scripts/extraire-faits-wiki.mjs.
//
//   node scripts/aspirer-wiki-airborn.mjs [--sortie <dossier>] [--pause <ms>] [--force]

import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const RACINE_WIKI = 'https://airborn.gitbook.io/airborn'
const TABLE = `${RACINE_WIKI}/llms.txt`
const AGENT = 'VanguardMMO-wiki-ingest/1.0 (site de guilde, lecture seule)'

function argument(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut
}
const FORCE = process.argv.includes('--force')
const PAUSE = Number(argument('pause', '900'))
const SORTIE = resolve(argument('sortie', join(process.env.TMPDIR || '/tmp', 'wiki-airborn')))

const dodo = (ms) => new Promise((r) => setTimeout(r, ms))

/** Recupere une adresse en reessayant, avec un recul progressif. */
async function recuperer(url, essais = 3) {
  for (let n = 1; n <= essais; n++) {
    try {
      const rep = await fetch(url, { headers: { 'user-agent': AGENT, accept: 'text/plain,text/markdown,*/*' } })
      if (rep.status === 429 || rep.status >= 500) throw new Error(`HTTP ${rep.status}`)
      if (!rep.ok) return { erreur: `HTTP ${rep.status}` }
      return { texte: await rep.text() }
    } catch (e) {
      if (n === essais) return { erreur: String(e.message || e) }
      await dodo(PAUSE * 2 * n)
    }
  }
}

/** `- [Titre](https://airborn.gitbook.io/airborn/chemin.md): description */
function lireTable(txt) {
  const pages = []
  const vus = new Set()
  for (const ligne of txt.split('\n')) {
    const m = ligne.match(/^\s*-\s*\[(.+?)\]\((https:\/\/airborn\.gitbook\.io\/airborn\/[^)]+?\.md)\)\s*(?::\s*(.*))?$/)
    if (!m) continue
    const url = m[2]
    if (vus.has(url)) continue
    vus.add(url)
    const chemin = url.slice(`${RACINE_WIKI}/`.length).replace(/\.md$/, '')
    pages.push({
      titre: m[1].replace(/\\([[\]])/g, '$1').trim(),
      url,
      chemin,
      section: chemin.includes('/') ? chemin.split('/')[0] : 'racine',
      resume: (m[3] || '').trim() || null,
    })
  }
  return pages
}

const existe = (p) => access(p).then(() => true, () => false)

async function principal() {
  await mkdir(SORTIE, { recursive: true })
  process.stdout.write(`table des matieres : ${TABLE}\n`)
  const table = await recuperer(TABLE)
  if (table.erreur) throw new Error(`table injoignable : ${table.erreur}`)
  await writeFile(join(SORTIE, 'llms.txt'), table.texte)

  const pages = lireTable(table.texte)
  process.stdout.write(`${pages.length} pages annoncees\n`)

  let telecharges = 0, caches = 0
  const echecs = []
  for (const [i, page] of pages.entries()) {
    const fichier = join(SORTIE, 'pages', `${page.chemin}.md`)
    if (!FORCE && (await existe(fichier))) {
      page.octets = (await readFile(fichier)).length
      caches++
      continue
    }
    const rep = await recuperer(page.url)
    if (rep.erreur) {
      echecs.push({ url: page.url, erreur: rep.erreur })
      process.stdout.write(`  !! ${page.chemin} — ${rep.erreur}\n`)
    } else {
      await mkdir(dirname(fichier), { recursive: true })
      await writeFile(fichier, rep.texte)
      page.octets = Buffer.byteLength(rep.texte)
      telecharges++
      process.stdout.write(`  ${String(i + 1).padStart(3)}/${pages.length} ${page.chemin} (${page.octets} o)\n`)
    }
    await dodo(PAUSE)
  }

  await writeFile(
    join(SORTIE, 'index.json'),
    JSON.stringify({ genere: new Date().toISOString(), source: TABLE, pages, echecs }, null, 2),
  )
  process.stdout.write(
    `\n${telecharges} telechargees, ${caches} deja en cache, ${echecs.length} en echec\ndossier : ${SORTIE}\n`,
  )
}

principal().catch((e) => {
  process.stderr.write(`${e.stack || e}\n`)
  process.exit(1)
})
