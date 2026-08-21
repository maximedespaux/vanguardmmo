#!/usr/bin/env node
// Recupere les IMAGES du wiki officiel d'Airborn et les range AVEC LEUR LEGENDE.
//
// ┌──────── POURQUOI CE SCRIPT EXISTE, ET POURQUOI IL EST TORDU ────────┐
// │ Le Markdown que GitBook sert (page + « .md ») ecrit ses images sous  │
// │ DEUX formes, et une seule est telechargeable :                       │
// │   · <img src="https://416674709-files.gitbook.io/~/files/v0/…">      │
// │     — l'adresse complete du CDN, jeton compris : `curl` suffit ;     │
// │   · <img src="/files/8Vg2…"> — un chemin RELATIF que rien ne resout. │
// │ Ni le CDN, ni l'API GitBook, ni la page en .md ne traduisent cet     │
// │ identifiant. La seule chose qui le fait, c'est L'APPLICATION : la    │
// │ page HTML (sans « .md ») porte les memes images reecrites en         │
// │ « …/~gitbook/image?url=<adresse CDN encodee> ». On telecharge donc   │
// │ la page HTML et on lit le parametre `url`.                           │
// │                                                                      │
// │ Mais le HTML ne porte plus l'identifiant `/files/<id>` : impossible  │
// │ d'apparier par la cle. On apparie donc PAR L'ORDRE — apres avoir     │
// │ ecarte du HTML la banniere de page et les variantes sombres, qui     │
// │ n'existent pas dans le Markdown (voir `imagesDuHtml`) — et on        │
// │ VERIFIE l'appariement sur les LEGENDES : chaque legende du Markdown  │
// │ doit se retrouver mot pour mot sous l'image de meme rang. Une page   │
// │ dont une legende tombe n'est pas devinee : elle sort en echec.       │
// └──────────────────────────────────────────────────────────────────────┘
//
// LES IMAGES SONT DES BLOCS <figure><img><figcaption>, PAS la syntaxe Markdown
// « ![](…) » : un filtre sur « ![]() » en trouve deux sur presque deux cents.
//
// LA LEGENDE COMPTE AUTANT QUE L'IMAGE. Un plan d'instance sans sa legende est
// un plan anonyme ; « Un bouclier avec un eveil fixe END+30 » EST un fait. Le
// manifeste garde donc, pour chaque fichier : la page qui le porte, son rang
// dans la page, son texte de remplacement, sa legende, et l'adresse d'origine.
//
// MENAGEMENT DU SITE : une pause entre CHAQUE requete (page HTML comme image).
// C'est le serveur de quelqu'un d'autre.
//
//   node scripts/aspirer-images-wiki.mjs [--cache <dossier>] [--pause 1200]
//                                        [--largeur 900] [--qualite 82]
//                                        [--sortie public/jeu/wiki]
//                                        [--manifeste public/wiki/images-wiki.json]
//
// Le dossier `--cache` est celui de scripts/aspirer-wiki-airborn.mjs (il doit
// contenir `pages/**.md`). Les originaux sont gardes dans `<cache>/images/` :
// une seconde execution ne retelecharge rien.

import { mkdir, writeFile, readFile, readdir, access, stat } from 'node:fs/promises'
import { dirname, join, resolve, extname, basename } from 'node:path'
import sharp from 'sharp'

const RACINE_WIKI = 'https://airborn.gitbook.io/airborn'
const AGENT = 'VanguardMMO-wiki-ingest/1.0 (site de guilde, lecture seule)'

function argument(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut
}
const PAUSE = Number(argument('pause', '1200'))
const LARGEUR = Number(argument('largeur', '900'))
const QUALITE = Number(argument('qualite', '82'))
const CACHE = resolve(argument('cache', join(process.env.TMPDIR || '/tmp', 'wiki-airborn')))
const SORTIE = resolve(argument('sortie', 'public/jeu/wiki'))
const MANIFESTE = resolve(argument('manifeste', 'public/wiki/images-wiki.json'))

const dodo = (ms) => new Promise((r) => setTimeout(r, ms))
const existe = (p) => access(p).then(() => true, () => false)

/* ─────────────────────────── lecture du corpus ─────────────────────────── */

async function pagesDuCache(racine) {
  const trouvees = []
  async function descendre(dossier, prefixe) {
    for (const e of await readdir(dossier, { withFileTypes: true })) {
      const p = join(dossier, e.name)
      if (e.isDirectory()) await descendre(p, `${prefixe}${e.name}/`)
      else if (e.name.endsWith('.md')) trouvees.push({ fichier: p, chemin: `${prefixe}${e.name.slice(0, -3)}` })
    }
  }
  await descendre(join(racine, 'pages'), '')
  return trouvees.sort((a, b) => a.chemin.localeCompare(b.chemin))
}

/** Les entites que GitBook ecrit dans son Markdown (&#x26; pour &, surtout). */
function detexter(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

/** Une legende est du TEXTE : on retire le balisage, on garde les mots. */
function legendeDe(html) {
  if (!html) return null
  const t = detexter(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
  return t || null
}

const attribut = (balise, nom) => {
  const m = balise.match(new RegExp(`${nom}="([^"]*)"`))
  return m ? detexter(m[1]) : null
}

/**
 * Les images d'une page, DANS L'ORDRE DU DOCUMENT.
 *
 * Trois formes cohabitent : la figure legendee (l'immense majorite), l'<img>
 * nu hors figure, et deux « ![](…) » Markdown. Les trois sont ramassees par la
 * meme passe, en position, pour que l'ordre soit celui de la page.
 */
function imagesDeLaPage(md) {
  const trouvees = []
  const motif = /<figure>\s*<img\b([^>]*)>\s*(?:<figcaption>([\s\S]*?)<\/figcaption>)?\s*<\/figure>|<img\b([^>]*)>|!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g
  let m
  while ((m = motif.exec(md))) {
    if (m[1] !== undefined) {
      trouvees.push({ src: attribut(m[1], 'src'), alt: attribut(m[1], 'alt'), largeurWiki: attribut(m[1], 'width'), legende: legendeDe(m[2]), forme: 'figure' })
    } else if (m[3] !== undefined) {
      trouvees.push({ src: attribut(m[3], 'src'), alt: attribut(m[3], 'alt'), largeurWiki: attribut(m[3], 'width'), legende: null, forme: 'img' })
    } else {
      trouvees.push({ src: detexter(m[5]), alt: detexter(m[4]) || null, largeurWiki: null, legende: null, forme: 'markdown' })
    }
  }
  return trouvees.filter((i) => i.src)
}

/* ─────────────────────── resolution des chemins relatifs ─────────────────── */

/** `…/o/spaces%2F<espace>%2Fuploads%2F<id>%2F<nom>` → { id, nom, chemin }. */
function piecesDuCdn(url) {
  const m = String(url).match(/\/o\/([^?]+)/)
  if (!m) return null
  const chemin = decodeURIComponent(m[1])
  const bouts = chemin.split('/')
  return { chemin, id: bouts[bouts.length - 2] || null, nom: bouts[bouts.length - 1] || null }
}

/**
 * LES IMAGES DE CONTENU D'UNE PAGE HTML, DANS L'ORDRE, AVEC LEUR LEGENDE.
 *
 * ┌──── DEUX PIEGES, ET LA CLASSE CSS QUI LES DESAMORCE TOUS LES DEUX ────┐
 * │ Compter naivement les <img> de la page donne TROIS de plus que le     │
 * │ Markdown sur la page des Chambres secretes (18 contre 15), et le      │
 * │ decalage n'est pas constant : un appariement par simple offset        │
 * │ attribue alors la mauvaise image a la mauvaise legende, sans rien     │
 * │ signaler. Les trois intrus :                                          │
 * │   · LA BANNIERE DE LA PAGE, en tete, que le Markdown n'ecrit pas.     │
 * │     Elle porte « w-full object-cover » et rien d'autre ;              │
 * │   · LES VARIANTES SOMBRES : quand l'auteur a depose une seconde       │
 * │     image pour le theme sombre, GitBook pose DEUX <img> pour UNE      │
 * │     ligne de Markdown — la claire (« block dark:hidden ») et la       │
 * │     sombre (« hidden dark:block »). Le Markdown, lui, n'en nomme      │
 * │     qu'une.                                                           │
 * │ Les images de contenu portent « rounded-corners: » quand elles sont   │
 * │ posees en bloc, et la seule classe « inline » quand elles sont dans   │
 * │ le fil du texte (deux pages en ont). On garde ces deux familles,      │
 * │ moins les variantes sombres — et le compte tombe pile sur celui du    │
 * │ Markdown, page par page.                                              │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * La legende est ramassee au passage : elle sert de VERIFICATION de
 * l'appariement, ce qui est indispensable ici — aucune des 55 pages a
 * resoudre ne porte la moindre adresse complete, donc aucun point d'ancrage.
 */
function imagesDuHtml(html) {
  const balises = [...html.matchAll(/<img\b[^>]*>/g)]
  const contenu = balises.filter((m) => {
    const classe = (m[0].match(/class="([^"]*)"/) || ['', ''])[1]
    if (/hidden dark:block/.test(classe)) return false
    return /rounded-corners:/.test(classe) || /(^|\s)inline(\s|$)/.test(classe)
  })
  const liste = []
  for (const [n, m] of contenu.entries()) {
    const fin = n + 1 < contenu.length ? contenu[n + 1].index : html.length
    const segment = html.slice(m.index, fin)
    const cap = segment.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/)
    const src = detexter((m[0].match(/src="([^"]*)"/) || ['', ''])[1])
    const enc = src.match(/[?&]url=([^&]+)/)
    if (!enc) continue
    let url
    try { url = decodeURIComponent(enc[1]) } catch { continue }
    const p = piecesDuCdn(url)
    if (!p) continue
    liste.push({ url, ...p, legende: legendeDe(cap ? cap[1] : null) })
  }
  return liste
}

async function recuperer(url, binaire = false, essais = 3) {
  for (let n = 1; n <= essais; n++) {
    try {
      const rep = await fetch(url, { headers: { 'user-agent': AGENT } })
      if (rep.status === 429 || rep.status >= 500) throw new Error(`HTTP ${rep.status}`)
      if (!rep.ok) return { erreur: `HTTP ${rep.status}` }
      return binaire ? { octets: Buffer.from(await rep.arrayBuffer()) } : { texte: await rep.text() }
    } catch (e) {
      if (n === essais) return { erreur: String(e.message || e) }
      await dodo(PAUSE * 2 * n)
    }
  }
}

/**
 * L'APPARIEMENT — le seul endroit ou l'on pourrait mentir sans s'en apercevoir.
 *
 * Le Markdown et le HTML portent la MEME suite d'images une fois la banniere et
 * les variantes sombres ecartees : on apparie donc rang par rang, sans decalage
 * a deviner. Trois verifications, et la moindre qui tombe fait sortir la page en
 * echec plutot que de produire un appariement plausible :
 *
 *   1. LE COMPTE. Autant d'images de contenu d'un cote que de l'autre.
 *   2. LES ANCRAGES. Les images dont le Markdown donne deja l'adresse complete
 *      doivent tomber sur la meme adresse dans le HTML.
 *   3. LES LEGENDES. Chaque legende non vide du Markdown doit se retrouver, mot
 *      pour mot, sous l'image de meme rang dans le HTML. C'est la verification
 *      qui compte vraiment : AUCUNE des pages a resoudre ne porte d'adresse
 *      complete, donc sans les legendes il n'y aurait aucun ancrage du tout.
 */
function apparier(attendues, htmlListe) {
  if (htmlListe.length !== attendues.length) {
    return { erreur: `le HTML porte ${htmlListe.length} images de contenu pour ${attendues.length} dans le Markdown` }
  }
  let ancres = 0, legendes = 0
  for (const [i, a] of attendues.entries()) {
    if (a.cdn) {
      if (piecesDuCdn(a.cdn)?.chemin !== htmlListe[i].chemin) return { erreur: `ancrage rompu au rang ${i}` }
      ancres++
    }
    if (a.legende) {
      if (a.legende !== htmlListe[i].legende) {
        return { erreur: `legende differente au rang ${i} : « ${a.legende} » contre « ${htmlListe[i].legende ?? '(aucune)'} »` }
      }
      legendes++
    }
  }
  return { ancres, legendes }
}

/* ──────────────────────────── nommage des fichiers ───────────────────────── */

const sansAccent = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
function nomDeFichier(nomOrigine, pris) {
  let base = sansAccent(decodeURIComponent(nomOrigine || 'image'))
    .replace(extname(nomOrigine || ''), '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'image'
  let nom = `${base}.webp`
  let n = 2
  while (pris.has(nom)) nom = `${base}_${n++}.webp`
  pris.add(nom)
  return nom
}

/* ──────────────────────────────── programme ──────────────────────────────── */

async function principal() {
  const pages = await pagesDuCache(CACHE)
  if (!pages.length) throw new Error(`aucune page dans ${join(CACHE, 'pages')} — lancer d'abord scripts/aspirer-wiki-airborn.mjs`)
  process.stdout.write(`${pages.length} pages lues dans ${CACHE}\n`)

  // 1. inventaire
  const inventaire = []
  for (const page of pages) {
    const md = await readFile(page.fichier, 'utf8')
    const imgs = imagesDeLaPage(md)
    if (!imgs.length) continue
    inventaire.push({
      chemin: page.chemin,
      url: `${RACINE_WIKI}/${page.chemin}`,
      images: imgs.map((im, ordre) => ({
        ...im,
        ordre,
        cdn: /^https?:\/\//.test(im.src) ? im.src : null,
        relatif: /^\/files\//.test(im.src) ? im.src : null,
      })),
    })
  }
  const total = inventaire.reduce((n, p) => n + p.images.length, 0)
  const relatives = inventaire.reduce((n, p) => n + p.images.filter((i) => !i.cdn).length, 0)
  process.stdout.write(`${total} images sur ${inventaire.length} pages — ${total - relatives} adressees, ${relatives} a resoudre\n`)

  // 2. resolution page par page
  const echecs = []
  const aResoudre = inventaire.filter((p) => p.images.some((i) => !i.cdn))
  for (const [n, page] of aResoudre.entries()) {
    const cacheHtml = join(CACHE, 'html', `${page.chemin}.html`)
    let html
    if (await existe(cacheHtml)) html = await readFile(cacheHtml, 'utf8')
    else {
      const rep = await recuperer(page.url)
      await dodo(PAUSE)
      if (rep.erreur) { echecs.push({ page: page.chemin, quoi: 'page HTML', erreur: rep.erreur }); continue }
      html = rep.texte
      await mkdir(dirname(cacheHtml), { recursive: true })
      await writeFile(cacheHtml, html)
    }
    const liste = imagesDuHtml(html)
    const ap = apparier(page.images, liste)
    if (ap.erreur) {
      echecs.push({ page: page.chemin, quoi: 'appariement', erreur: ap.erreur, htmlImages: liste.length, mdImages: page.images.length })
      process.stdout.write(`  !! ${page.chemin} — ${ap.erreur}\n`)
      continue
    }
    page.appariement = { images: liste.length, ancres: ap.ancres, legendesVerifiees: ap.legendes }
    for (const [i, im] of page.images.entries()) {
      if (!im.cdn) im.cdn = liste[i].url
      im.resolue = im.relatif ? 'html' : 'markdown'
    }
    process.stdout.write(`  ${String(n + 1).padStart(3)}/${aResoudre.length} ${page.chemin} — ${liste.length} images, ${ap.legendes} legende(s) verifiee(s)\n`)
  }

  // 3. telechargement + conversion
  await mkdir(SORTIE, { recursive: true })
  await mkdir(join(CACHE, 'images'), { recursive: true })
  const pris = new Set()
  const parChemin = new Map()
  const fiches = []
  let octetsOrigine = 0, octetsWebp = 0, telecharges = 0
  for (const page of inventaire) {
    for (const im of page.images) {
      if (!im.cdn) { echecs.push({ page: page.chemin, quoi: 'non resolue', erreur: im.src }); continue }
      const p = piecesDuCdn(im.cdn)
      if (!p) { echecs.push({ page: page.chemin, quoi: 'adresse illisible', erreur: im.cdn }); continue }

      let deja = parChemin.get(p.chemin)
      if (!deja) {
        const brut = join(CACHE, 'images', `${p.id}${extname(p.nom) || '.bin'}`)
        if (!(await existe(brut))) {
          const rep = await recuperer(im.cdn, true)
          await dodo(PAUSE)
          if (rep.erreur) { echecs.push({ page: page.chemin, quoi: 'telechargement', erreur: `${rep.erreur} — ${p.nom}` }); continue }
          await writeFile(brut, rep.octets)
          telecharges++
        }
        const source = await readFile(brut)
        const nom = nomDeFichier(p.nom, pris)
        const image = sharp(source, { animated: false })
        const meta = await image.metadata()
        const webp = await image
          .resize({ width: Math.min(LARGEUR, meta.width || LARGEUR), withoutEnlargement: true })
          .webp({ quality: QUALITE, effort: 6 })
          .toBuffer({ resolveWithObject: true })
        await writeFile(join(SORTIE, nom), webp.data)
        octetsOrigine += source.length
        octetsWebp += webp.data.length
        deja = {
          fichier: `/jeu/wiki/${nom}`,
          nomOrigine: p.nom,
          identifiantWiki: p.id,
          format: meta.format,
          largeurOrigine: meta.width || null,
          hauteurOrigine: meta.height || null,
          largeur: webp.info.width,
          hauteur: webp.info.height,
          alpha: !!meta.hasAlpha,
          octets: webp.data.length,
          octetsOrigine: source.length,
        }
        parChemin.set(p.chemin, deja)
      }
      fiches.push({
        ...deja,
        page: page.chemin,
        pageUrl: page.url,
        ordre: im.ordre,
        alt: im.alt || null,
        legende: im.legende,
        largeurWiki: im.largeurWiki ? Number(im.largeurWiki) : null,
        adresseWiki: im.relatif || null,
        resolue: im.relatif ? 'page HTML de l’application GitBook' : 'adresse complete dans le Markdown',
      })
    }
  }

  const manifeste = {
    genere: new Date().toISOString(),
    quoi: "Les images du wiki officiel d'Airborn : Winds of Rhisis, converties en WebP, rangees avec la page qui les porte et leur legende.",
    source: RACINE_WIKI,
    conversion: `WebP qualite ${QUALITE}, largeur plafonnee a ${LARGEUR} px (jamais agrandie)`,
    comptes: {
      pagesLues: pages.length,
      pagesAvecImages: inventaire.length,
      references: total,
      fichiers: parChemin.size,
      avecLegende: fiches.filter((f) => f.legende).length,
      avecTransparence: [...parChemin.values()].filter((f) => f.alpha).length,
      octetsOrigine,
      octetsWebp,
      echecs: echecs.length,
    },
    pages: inventaire.map((p) => ({ chemin: p.chemin, url: p.url, images: p.images.length, appariement: p.appariement || null })),
    images: fiches,
    echecs,
  }
  await mkdir(dirname(MANIFESTE), { recursive: true })
  await writeFile(MANIFESTE, `${JSON.stringify(manifeste, null, 1)}\n`)

  process.stdout.write(
    `\n${parChemin.size} fichiers ecrits dans ${SORTIE} (${telecharges} telecharges cette fois)\n` +
    `${(octetsOrigine / 1e6).toFixed(1)} Mo bruts → ${(octetsWebp / 1e6).toFixed(1)} Mo WebP` +
    ` (${octetsOrigine ? Math.round((octetsWebp / octetsOrigine) * 100) : 0} %)\n` +
    `${manifeste.comptes.avecLegende} references legendees, ${echecs.length} echec(s)\nmanifeste : ${MANIFESTE}\n`,
  )
}

principal().catch((e) => {
  process.stderr.write(`${e.stack || e}\n`)
  process.exit(1)
})
