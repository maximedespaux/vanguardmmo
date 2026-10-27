/**
 * Convertit en WebP les images lourdes de public/assets/, puis supprime la source.
 *
 * Pourquoi : les fonds de page, bannières et badges sont des PNG de 0,5 à 2,8 Mo
 * rechargés à chaque navigation. Le WebP divise leur poids par ~5 à qualité
 * visuellement équivalente. C'est le premier gain de performance du site.
 *
 * ── Le cycle de vie d'une image lourde ──────────────────────────────────────
 *   1. déposer le PNG/JPG d'origine dans public/assets/… (ex. site/bg/sup12.png) ;
 *   2. `npm run assets` : le .webp est écrit à côté, PUIS la source est supprimée ;
 *   3. pointer les références (`globals.css`, `airbuilder.css`, `src/**`) vers le .webp.
 *
 * Le .webp est donc le SEUL fichier versionné : le PNG n'est qu'un intermédiaire.
 * Les 63 PNG historiques ont été supprimés du dépôt une fois les .webp validés en
 * production (ils pesaient 88 Mo pour 9,3 Mo de .webp) ; ils restent récupérables
 * dans l'historique git si une source haute définition est un jour nécessaire.
 * Conserver les masters ailleurs (Drive, Discord…) plutôt que dans le dépôt.
 *
 * Principes :
 *   - seuls les fichiers > 200 Ko sont traités (en dessous le gain est marginal) ;
 *   - la source n'est supprimée QUE si le .webp est écrit et non vide ;
 *   - une source encore référencée en .png dans le code est CONSERVÉE et signalée
 *     (sécurité : sinon l'étape 3 oubliée donnerait une image 404 en production) ;
 *   - un .webp déjà à jour ne provoque pas de réencodage, mais sa source résiduelle
 *     est supprimée (le script rattrape un dépôt laissé à mi-chemin) ;
 *   - un échec sur un fichier n'interrompt pas le lot, il est signalé à la fin.
 *
 * Lancer :  npm run assets                (à refaire après tout ajout d'image lourde)
 *           npm run assets -- --keep-sources   (convertir sans rien supprimer)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("✗ sharp est introuvable. Il arrive normalement avec next ; sinon : npm i -D sharp");
  process.exit(1);
}

const ROOT = "public/assets";
const MIN_BYTES = 200 * 1024; // en dessous, le PNG est déjà léger
const QUALITY = 82;
const EFFORT = 5;
const SOURCE_EXT = new Set([".png", ".jpg", ".jpeg"]);
const KEEP_SOURCES = process.argv.includes("--keep-sources");

// Où chercher les références avant de supprimer une source (cf. principes).
const CODE_ROOTS = ["src", "public", "bot", "scripts"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".html", ".json", ".md"]);
const CODE_SKIP = new Set(["node_modules", ".next", ".git", "assets"]); // assets/ = les images elles-mêmes
// Ce fichier cite des chemins d'exemple en .png dans ses commentaires : s'il se
// lisait lui-même, il les prendrait pour des références vivantes et ne supprimerait
// jamais les sources correspondantes.
const SELF = path.resolve(fileURLToPath(import.meta.url));

if (!fs.existsSync(ROOT)) {
  console.error(`✗ Dossier introuvable : ${ROOT} — lancer depuis la racine du projet.`);
  process.exit(1);
}

/** Liste récursive des images candidates (chemin + taille). */
function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SOURCE_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    const stat = fs.statSync(full);
    if (stat.size <= MIN_BYTES) continue;
    out.push({ src: full, size: stat.size, mtime: stat.mtimeMs });
  }
  return out;
}

/** Concatène le code du projet une seule fois, pour y chercher les références. */
function readCodeBase() {
  const chunks = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // dossier absent (ex. bot/ sur une installation partielle)
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!CODE_SKIP.has(entry.name)) walk(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (!CODE_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      const full = path.join(dir, entry.name);
      if (path.resolve(full) === SELF) continue;
      chunks.push(fs.readFileSync(full, "utf8"));
    }
  };
  for (const root of CODE_ROOTS) walk(root);
  return chunks.join("\n");
}

/**
 * Le code pointe-t-il encore vers cette source ? On teste le chemin exact
 * (`assets/site/bg/sup2.png`, ce qui couvre `/assets/…` comme `public/assets/…`)
 * et la forme dynamique (`assets/site/ranks/${badge}.png`), la seule qu'une
 * recherche littérale manquerait.
 */
function isStillReferenced(code, src) {
  const rel = src.replace(/^public\//, "").replace(/\\/g, "/"); // assets/site/bg/sup2.png
  if (code.includes(rel)) return true;
  const dir = rel.slice(0, rel.lastIndexOf("/") + 1); // assets/site/bg/
  const ext = path.extname(rel); // .png
  const dyn = new RegExp(`${dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\$\\{[^}]*\\}\\${ext}`);
  return dyn.test(code);
}

const ko = (bytes) => `${(bytes / 1024).toFixed(0)} Ko`;
const mo = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} Mo`;

const candidates = collect(ROOT).sort((a, b) => b.size - a.size);
if (candidates.length === 0) {
  console.log(`Aucune image > ${ko(MIN_BYTES)} dans ${ROOT}/ — rien à faire.`);
  console.log("(normal : les sources sont supprimées après conversion, seuls les .webp sont versionnés.)");
  process.exit(0);
}

console.log(`${candidates.length} image(s) > ${ko(MIN_BYTES)} dans ${ROOT}/\n`);

const code = KEEP_SOURCES ? "" : readCodeBase();

let bytesIn = 0;
let bytesOut = 0;
let converted = 0;
let skipped = 0;
let pruned = 0;
let prunedBytes = 0;
const failures = [];
const stillReferenced = [];

/** Supprime la source une fois le .webp en place — sauf si le code la référence encore. */
function pruneSource(src, size) {
  if (KEEP_SOURCES) return;
  if (isStillReferenced(code, src)) {
    stillReferenced.push(src);
    console.log(`     ↳ source conservée : encore référencée en ${path.extname(src)} dans le code`);
    return;
  }
  try {
    fs.rmSync(src);
    pruned++;
    prunedBytes += size;
    console.log(`     ↳ source supprimée (${ko(size)})`);
  } catch (err) {
    failures.push({ src, message: `suppression impossible : ${err?.message ?? err}` });
  }
}

for (const { src, size, mtime } of candidates) {
  const dest = src.replace(/\.(png|jpe?g)$/i, ".webp");

  // Idempotence : un .webp au moins aussi récent que sa source est à jour.
  const existing = fs.existsSync(dest) ? fs.statSync(dest) : null;
  if (existing && existing.size > 0 && existing.mtimeMs >= mtime) {
    bytesIn += size;
    bytesOut += existing.size;
    skipped++;
    console.log(`  =  ${src}  (déjà à jour, ${ko(existing.size)})`);
    pruneSource(src, size);
    continue;
  }

  try {
    // On écrit d'abord dans un fichier temporaire : un plantage en cours
    // d'encodage ne laisse pas un .webp tronqué en place de l'ancien.
    const tmp = `${dest}.tmp`;
    await sharp(src).webp({ quality: QUALITY, effort: EFFORT }).toFile(tmp);
    const outSize = fs.statSync(tmp).size;
    if (outSize === 0) throw new Error("sortie vide (0 octet)");
    fs.renameSync(tmp, dest);

    bytesIn += size;
    bytesOut += outSize;
    converted++;
    const gain = ((1 - outSize / size) * 100).toFixed(0);
    console.log(`  ✓  ${src}  ${ko(size)} → ${ko(outSize)}  (−${gain} %)`);
    pruneSource(src, size);
  } catch (err) {
    fs.rmSync(`${dest}.tmp`, { force: true });
    failures.push({ src, message: err?.message ?? String(err) });
    console.log(`  ✗  ${src}  — ${err?.message ?? err}`);
  }
}

const treated = converted + skipped;
const saved = bytesIn - bytesOut;
const pct = bytesIn > 0 ? ((saved / bytesIn) * 100).toFixed(1) : "0";

console.log("\n┌─────────────────────────────────────────────┐");
console.log(`│ Fichiers traités   : ${String(treated).padEnd(23)}│`);
console.log(`│   dont convertis   : ${String(converted).padEnd(23)}│`);
console.log(`│   dont déjà à jour : ${String(skipped).padEnd(23)}│`);
console.log(`│ Poids avant (src)  : ${mo(bytesIn).padEnd(23)}│`);
console.log(`│ Poids après (webp) : ${mo(bytesOut).padEnd(23)}│`);
console.log(`│ Économie           : ${`${mo(saved)}  (−${pct} %)`.padEnd(23)}│`);
console.log(`│ Sources supprimées : ${`${pruned}  (${mo(prunedBytes)} rendus)`.padEnd(23)}│`);
console.log("└─────────────────────────────────────────────┘");

if (failures.length > 0) {
  console.log(`\n⚠ ${failures.length} échec(s) — sources conservées, aucune référence à modifier :`);
  for (const f of failures) console.log(`   ${f.src} : ${f.message}`);
}

if (stillReferenced.length > 0) {
  console.log(`\n⚠ ${stillReferenced.length} source(s) encore référencée(s) dans le code, donc conservée(s) :`);
  for (const s of stillReferenced) console.log(`   ${s}`);
  console.log("   → faire pointer la référence vers le .webp, puis relancer `npm run assets`.");
}

if (KEEP_SOURCES) {
  console.log("\n--keep-sources : aucune source supprimée. Sans ce drapeau, les sources");
  console.log("converties sont retirées du dépôt (seuls les .webp sont versionnés).");
} else if (converted > 0) {
  console.log("\nÉtape suivante : pointer les références vers les .webp ci-dessus");
  console.log("(globals.css, airbuilder.css, src/**) — les sources ne sont plus servies.");
}

// Un échec de conversion ne doit pas casser un build qui appellerait ce script.
process.exit(0);
