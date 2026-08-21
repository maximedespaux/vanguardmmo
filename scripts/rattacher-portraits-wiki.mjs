#!/usr/bin/env node
/*
 * LES PORTRAITS DE MONSTRE QUE LE WIKI OFFICIEL DONNE — ET QUE LE CLIENT NE DONNE PAS.
 *
 * ┌──── CE QUE CE SCRIPT CHERCHE, ET CE QU'IL REFUSE ──────────────────────────┐
 * │ Le wiki publie des RENDUS DETOURES : le modele 3D du monstre, seul, sur    │
 * │ fond transparent. Le client, lui, n'expose aucun rendu de monstre — la     │
 * │ seule chose qu'il porte est un jeu de 118 cartes a collectionner dont      │
 * │ douze seulement portent un nom de monstre. C'est donc un gain que le       │
 * │ client ne permettait pas.                                                  │
 * │                                                                            │
 * │ MAIS UN PORTRAIT FAUX EST PIRE QUE PAS DE PORTRAIT. Quatre conditions,     │
 * │ toutes obligatoires, et chacune ecarte un cas reel de cette page :         │
 * │   1. L'IMAGE EST DETOUREE (couche alpha). Onze captures d'ecran du wiki    │
 * │      nomment un boss d'Halloween — ce sont des captures de jeu, interface  │
 * │      comprise, pas des portraits. Elles sont listees a part.               │
 * │   2. LA LEGENDE NE NOMME QU'UN MONSTRE. « Kraavus & Kraavos » montre deux  │
 * │      titans differents : rien ne dit lequel est lequel.                    │
 * │   3. LA LEGENDE N'EST PAS UN DENOMBREMENT. « 12 mini-boss Asuras »,        │
 * │      « 3 boss Malphas », « Ensemble des 480 mobs » decrivent une salle,    │
 * │      pas une bete.                                                         │
 * │   4. LE NOM TOMBE SUR UN SEUL MONSTRE du catalogue, en comparant la TETE   │
 * │      du nom (avant la virgule) : le wiki ecrit « Dra'Zhul », le client     │
 * │      « Dra'Zhul, le briseur de cranes ».                                   │
 * │                                                                            │
 * │ UN PLAN QUI MONTRE DEUX FOIS LA MEME BETE RESTE VALIDE : la page des       │
 * │ Chambres ecrit « Midboss Dra'Zhul (x2) » et « Midboss Gor'Thar (x2) », et  │
 * │ le rendu montre bien deux exemplaires du meme modele. C'est le monstre.    │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * LE RENDU EST RECADRE. Les fichiers du wiki laissent le modele au centre d'un
 * cadre de 1314 x 834 presque vide : recadre sur la matiere, le portrait passe
 * de 900 px de large a la taille du monstre, et le poids s'effondre.
 *
 *   node scripts/rattacher-portraits-wiki.mjs [--cache <dossier>] [--largeur 420]
 *
 * Le cache est celui de scripts/aspirer-images-wiki.mjs : on recadre l'ORIGINAL,
 * pas la copie deja reduite a 900 px.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (nom, defaut) => {
  const i = process.argv.indexOf(`--${nom}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut
}
const CACHE = resolve(arg('cache', join(process.env.TMPDIR || '/tmp', 'wiki-airborn')))
const LARGEUR = Number(arg('largeur', '420'))
const SORTIE = join(RACINE, 'public/jeu/wiki/portraits')
const TABLE = join(RACINE, 'src/data/monstres-portraits.json')

const sansAccent = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norme = (s) => sansAccent(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** « Dra'Zhul, le briseur de cranes » → « dra zhul » : le wiki n'ecrit que la tete. */
const tete = (s) => norme(String(s).split(/[,(]/)[0])

/**
 * LES CORRESPONDANCES VERIFIEES A L'ŒIL — et elles se comptent sur une main.
 *
 * La regle automatique exige un nom identique. Une seule image y echappe pour
 * une raison qui n'est pas une approximation mais une FAUTE DE FRAPPE du wiki :
 * il ecrit « Nyzarra » la ou le client ecrit « Nyzzara ». Trois choses rendent
 * l'identite certaine, et il en fallait trois :
 *   · la page des Chambres decrit ce boss comme « une terrifiante araignee
 *     geante », et le rendu EST une araignee geante ;
 *   · le client ne porte qu'un seul boss de Chambre dont le nom soit a une
 *     lettre de celui-la, et il s'appelle « la mere devoreuse » ;
 *   · les cinq autres boss de la meme page tombent, eux, au nom exact.
 * Rien d'autre n'entre ici sans la meme demonstration.
 */
const EXCEPTIONS = { nyzarra: 'MI_CHAMBRE_BOSS_2' }

/** Une legende qui compte des exemplaires ou ramasse une salle n'est pas un nom. */
const DENOMBREMENT = /^\s*(\d+\s|ensemble|entree|emplacement|plan|carte|apercu|panth)/i

async function principal() {
  const manifeste = JSON.parse(await readFile(join(RACINE, 'public/wiki/images-wiki.json'), 'utf8'))
  const catalogue = JSON.parse(await readFile(join(RACINE, 'public/wiki/monstres.json'), 'utf8')).monstres

  const parTete = new Map()
  for (const m of catalogue) {
    for (const cle of new Set([norme(m.nom), tete(m.nom)])) {
      if (!parTete.has(cle)) parTete.set(cle, [])
      parTete.get(cle).push(m)
    }
  }

  const retenus = []
  const ecartes = []
  const vus = new Set()
  for (const im of manifeste.images) {
    if (!im.legende) continue
    const cle = tete(im.legende)
    const candidats = parTete.get(cle) ?? (EXCEPTIONS[cle] ? catalogue.filter((m) => m.id === EXCEPTIONS[cle]) : [])
    if (!candidats.length) continue
    if (vus.has(im.fichier)) continue
    vus.add(im.fichier)

    const refus = []
    if (!im.alpha) refus.push('capture de jeu, pas un rendu detoure')
    if (/&|\bet\b|\+/.test(im.legende)) refus.push('la legende nomme plusieurs betes')
    if (DENOMBREMENT.test(im.legende)) refus.push('la legende denombre ou situe, elle ne nomme pas')
    if (candidats.length > 1) refus.push(`${candidats.length} monstres portent ce nom`)
    if (refus.length) {
      ecartes.push({ fichier: im.fichier, legende: im.legende, page: im.page, monstres: candidats.map((m) => m.id), pourquoi: refus })
      continue
    }
    retenus.push({ monstre: candidats[0], image: im, parException: !parTete.has(cle) })
  }

  await mkdir(SORTIE, { recursive: true })
  const portraits = {}
  for (const r of retenus) {
    const brut = join(CACHE, 'images', `${r.image.identifiantWiki}${extname(r.image.nomOrigine) || '.png'}`)
    if (!(await access(brut).then(() => true, () => false))) throw new Error(`original absent : ${brut}`)
    const source = sharp(await readFile(brut))
    const avant = await source.metadata()
    const sortie = await source
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
      .resize({ width: LARGEUR, withoutEnlargement: true })
      .webp({ quality: 88, effort: 6 })
      .toBuffer({ resolveWithObject: true })
    const nom = `${r.monstre.id.toLowerCase()}.webp`
    await writeFile(join(SORTIE, nom), sortie.data)
    portraits[r.monstre.id] = {
      nom: r.monstre.nom,
      fichier: `/jeu/wiki/portraits/${nom}`,
      largeur: sortie.info.width,
      hauteur: sortie.info.height,
      octets: sortie.data.length,
      legende: r.image.legende,
      page: r.image.pageUrl,
      cadreDOrigine: `${avant.width}x${avant.height}`,
      appariement: r.parException ? 'verifie a l’œil (voir EXCEPTIONS dans le script)' : 'nom identique',
    }
  }

  const table = {
    genere: new Date().toISOString(),
    quoi: "Les rendus detoures de monstre publies par le wiki officiel d'Airborn, rattaches aux fiches de /monstres par le nom.",
    source: manifeste.source,
    regle:
      "Un portrait n'est retenu que si l'image est detouree (couche alpha), que sa legende ne nomme qu'une bete, qu'elle ne denombre pas, et que ce nom tombe sur un seul monstre du catalogue. Les rendus sont recadres sur la matiere.",
    comptes: {
      monstresDuCatalogue: catalogue.length,
      imagesDuWiki: manifeste.comptes.fichiers,
      portraits: Object.keys(portraits).length,
      ecartes: ecartes.length,
    },
    portraits,
    ecartes,
  }
  await writeFile(TABLE, `${JSON.stringify(table, null, 1)}\n`)

  process.stdout.write(
    `${Object.keys(portraits).length} portraits sur ${catalogue.length} monstres · ${ecartes.length} images ecartees\n`,
  )
  for (const [id, p] of Object.entries(portraits)) {
    process.stdout.write(`  ${id} — ${p.nom} : ${p.cadreDOrigine} → ${p.largeur}x${p.hauteur} (${p.octets} o)\n`)
  }
  for (const e of ecartes) process.stdout.write(`  – ${e.legende} : ${e.pourquoi.join(' ; ')}\n`)
}

principal().catch((e) => {
  process.stderr.write(`${e.stack || e}\n`)
  process.exit(1)
})
