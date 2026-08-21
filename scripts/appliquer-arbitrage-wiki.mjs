#!/usr/bin/env node
/*
 * APPLIQUE L'ARBITRAGE — la seule partie de la confrontation qui touche aux données.
 *
 * scripts/extraire-faits-wiki.mjs constate et arbitre ; il n'écrit rien dans les
 * données du site. Ce script-ci prend le relevé qu'il a produit et corrige ce que
 * l'arbitrage a tranché EN FAVEUR DU WIKI, et seulement cela.
 *
 * ┌──── UNE SEULE CORRECTION, ET C'EST LA PLUS GRAVE ─────────────────────────┐
 * │ Les PV conseillés pour le tank. Dix-sept des vingt-trois instances les     │
 * │ portaient TROP BAS (au pire la Faille du débutant : 3 000 contre 12 000,   │
 * │ soit quatre fois moins). Ce n'est pas une donnée d'agrément : c'est le     │
 * │ seuil sur lequel un tank décide s'il est prêt, et le rater fait rater la   │
 * │ run à tout le groupe.                                                      │
 * │                                                                            │
 * │ POURQUOI LE WIKI GAGNE ICI, alors que le client gagne d'ordinaire : le     │
 * │ client n'écrit nulle part de PV conseillés — ni defineinstance.h, ni aucun │
 * │ des fichiers de données d'août 2026. Le champ `pvClient` de                │
 * │ src/data/donjons-client.json, qui en a l'air, est identique au champ `hp`  │
 * │ du site sur les vingt-trois instances : c'est une copie, pas une lecture.  │
 * │ Il n'y a donc qu'une source, et c'est le wiki.                             │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * LE SCRIPT NE DEVINE RIEN : il n'écrit une valeur que si l'instance est appariée
 * par son nom entre le relevé du wiki et dungeons.json, et il dit ligne par ligne
 * ce qu'il change. Sans `--ecrire`, il montre et ne touche à rien.
 *
 *   node scripts/appliquer-arbitrage-wiki.mjs [--ecrire]
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ECRIRE = process.argv.includes('--ecrire')

/* MÊME NORMALISATION QUE scripts/extraire-faits-wiki.mjs, au caractère près : la
   ponctuation devient une espace. Sans ça, « Temple de Zerkattak / Behemoth »
   tombe à côté de son alias et une instance sur dix-sept reste au vieux chiffre —
   c'est arrivé au premier essai. */
const sansAccent = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** dungeons.json ↔ pages d'instance : les deux ne nomment pas tout pareil. */
const ALIAS = {
  desirea: 'desirea',
  'ruines prestigieuses': 'ruine prestigieuse',
  'temple de zerkattak behemoth': 'behemoth',
  'sanctuaire de shogun': 'sanctuaire shogun',
}
const cle = (nom) => {
  const k = sansAccent(nom).replace(/^(l |la |le |les )/, '')
  return ALIAS[k] ?? k
}

async function principal() {
  const faits = JSON.parse(await readFile(join(RACINE, 'public/wiki/faits-wiki-officiel.json'), 'utf8'))
  const cheminDonjons = join(RACINE, 'src/data/dungeons.json')
  const donjons = JSON.parse(await readFile(cheminDonjons, 'utf8'))

  const arb = faits.confrontation.find((c) => c.id === 'instance.pvTank')?.arbitrage
  if (!arb) throw new Error("le relevé ne porte aucun arbitrage pour instance.pvTank")
  if (arb.tranche !== 'wiki') {
    process.stdout.write(`l'arbitrage ne tranche pas en faveur du wiki (${arb.tranche}) : rien à appliquer\n`)
    return
  }

  const parCle = new Map(faits.instances.filter((i) => i.pvTank).map((i) => [cle(i.nom), i]))
  const changes = []
  const sansPage = []
  for (const d of donjons) {
    const i = parCle.get(cle(d.name))
    if (!i) { sansPage.push(d.name); continue }
    if (d.hp === i.pvTank) continue
    changes.push({ nom: d.name, avant: d.hp, apres: i.pvTank, ratio: Number((i.pvTank / d.hp).toFixed(2)), page: i.url })
  }

  /* LE FICHIER EST RÉÉCRIT AU CARACTÈRE PRÈS, PAS RESÉRIALISÉ. dungeons.json tient
     sur une seule ligne, dans une mise en forme qui n'est pas celle de
     JSON.stringify : le repasser à la moulinette produirait un diff de 23 objets
     là où trois cents caractères changent, et ce fichier est partagé avec d'autres
     travaux en cours. On remplace donc la valeur en place, et on vérifie que le
     motif tombe une fois et une seule. */
  let texte = await readFile(cheminDonjons, 'utf8')
  for (const c of changes) {
    const motif = new RegExp(`("name": ${JSON.stringify(c.nom).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,240}?"hp": )${c.avant}\\b`)
    const trouves = texte.match(new RegExp(motif, 'g'))
    if (!trouves || trouves.length !== 1) throw new Error(`« ${c.nom} » : ${trouves ? trouves.length : 0} occurrence(s) du motif, il en faut exactement une`)
    texte = texte.replace(motif, `$1${c.apres}`)
  }

  for (const c of changes) {
    process.stdout.write(`  ${c.nom.padEnd(24)} ${String(c.avant).padStart(9)} → ${String(c.apres).padStart(9)}  (×${c.ratio})\n`)
  }
  process.stdout.write(
    `\n${changes.length} instance(s) corrigée(s) sur ${donjons.length}` +
    `${sansPage.length ? `, ${sansPage.length} sans page de wiki (${sansPage.join(', ')})` : ''}\n`,
  )
  if (!ECRIRE) { process.stdout.write('rien écrit — relancer avec --ecrire\n'); return }
  JSON.parse(texte) // un fichier qui ne se relit pas ne s'écrit pas
  await writeFile(cheminDonjons, texte)
  process.stdout.write(`${cheminDonjons} écrit\n`)
}

principal().catch((e) => {
  process.stderr.write(`${e.stack || e}\n`)
  process.exit(1)
})
