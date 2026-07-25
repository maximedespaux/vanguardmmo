/**
 * Convertit en WebP les images lourdes de public/assets/.
 *
 * Pourquoi : les fonds de page, bannières et badges sont des PNG de 0,5 à 2,8 Mo
 * rechargés à chaque navigation. Le WebP divise leur poids par ~5 à qualité
 * visuellement équivalente. C'est le premier gain de performance du site.
 *
 * Principes :
 *   - le .webp est écrit À CÔTÉ de l'original, qui n'est JAMAIS supprimé ;
 *   - seuls les fichiers > 200 Ko sont traités (en dessous le gain est marginal) ;
 *   - un .webp déjà présent et plus récent que sa source est conservé (idempotent) ;
 *   - un échec sur un fichier n'interrompt pas le lot, il est signalé à la fin.
 *
 * Lancer :  npm run assets      (à refaire après tout ajout d'image lourde)
 *
 * Après conversion, penser à pointer les références (`globals.css`, `src/**`)
 * vers le .webp — voir le rapport affiché en fin de traitement.
 */
import fs from "node:fs";
import path from "node:path";

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

const ko = (bytes) => `${(bytes / 1024).toFixed(0)} Ko`;
const mo = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} Mo`;

const candidates = collect(ROOT).sort((a, b) => b.size - a.size);
if (candidates.length === 0) {
  console.log(`Aucune image > ${ko(MIN_BYTES)} dans ${ROOT}/ — rien à faire.`);
  process.exit(0);
}

console.log(`${candidates.length} image(s) > ${ko(MIN_BYTES)} dans ${ROOT}/\n`);

let bytesIn = 0;
let bytesOut = 0;
let converted = 0;
let skipped = 0;
const failures = [];

for (const { src, size, mtime } of candidates) {
  const dest = src.replace(/\.(png|jpe?g)$/i, ".webp");

  // Idempotence : un .webp au moins aussi récent que sa source est à jour.
  const existing = fs.existsSync(dest) ? fs.statSync(dest) : null;
  if (existing && existing.size > 0 && existing.mtimeMs >= mtime) {
    bytesIn += size;
    bytesOut += existing.size;
    skipped++;
    console.log(`  =  ${src}  (déjà à jour, ${ko(existing.size)})`);
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
console.log("└─────────────────────────────────────────────┘");

if (failures.length > 0) {
  console.log(`\n⚠ ${failures.length} échec(s) — originaux conservés, aucune référence à modifier :`);
  for (const f of failures) console.log(`   ${f.src} : ${f.message}`);
}

console.log("\nLes originaux sont conservés. Les .webp ne servent que si les");
console.log("références y pointent (globals.css, airbuilder.css, src/**).");

// Un échec de conversion ne doit pas casser un build qui appellerait ce script.
process.exit(0);
