/**
 * L'IMAGE DU DÉBRIEF, RENDUE À PARTIR D'UN JEU FIXE — sans base, sans Discord (SPEC-CHAMBRES-
 * RECENSEMENT §4.11, piège n° 8 ; lot 7). C'est l'image que le bot publierait, rendue par le même
 * code (`donneesImage`, `imageDebrief`, src/lib/seance-image.ts).
 *
 *   npx tsx scripts/essai-image-debrief.ts                  # le débrief du 18/10/2026, tel qu'importé
 *   npx tsx scripts/essai-image-debrief.ts --complet        # une séance fictive : chronos, écarts,
 *                                                           # record, analyse, joueurs et chiffres
 *   npx tsx scripts/essai-image-debrief.ts sortie.png       # où l'écrire (défaut : le dossier temporaire)
 *
 * DANS LE CONTENEUR, AVANT TOUTE PUBLICATION (piège n° 8) : Pango retombe sur une autre police
 * SANS ERREUR quand Cinzel ou Athiti manquent. Il faut donc REGARDER l'image rendue là où le bot
 * tourne. Depuis le dossier du dépôt sur le VPS (le dossier `essai/` reçoit l'image) :
 *
 *   mkdir -p essai && docker compose -f docker-compose.prod.yml run --rm -v "$PWD/essai:/app/essai" \
 *     bot npx tsx scripts/essai-image-debrief.ts --complet essai/debrief.png
 *
 * puis ouvrir `essai/debrief.png` (scp, ou le navigateur de fichiers du VPS) : les titres doivent
 * être en Cinzel (capitales à empattements), le reste en Athiti. Le script dit aussi ce que
 * fontconfig trouve pour chacune (fc-match), quand fc-match est installé.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import {
  CHRONO_VIDE, analyseDebrief, lireDebriefImporte, resumeDebrief,
  type Chrono, type NoteEtape, type ResumeDebrief, type SeanceComparee,
} from "@/lib/chambres";
import { ETAPES_CS_DEFAUT, PHASES_CS_DEFAUT, dateLongue, type ChiffreFige } from "@/lib/evenements";
import { donneesImage, hoteDuSite, imageDebrief, type DonneesImage } from "@/lib/seance-image";
import type { JoueurDebrief } from "@/lib/seances-serveur";

const FICHIER_18 = "src/data/chambres-debrief-2026-10-18.json";
const SITE = "https://vanguardhub.fr";

/** Le 18/10/2026 tel que l'import l'écrit : statuts et remarques mot pour mot, aucun chrono,
 *  gagné, 10 joueurs dont la liste n'a pas été gardée (pas de clôture). */
function le18(): DonneesImage {
  const lu = lireDebriefImporte(JSON.parse(readFileSync(resolve(process.cwd(), FICHIER_18), "utf8")));
  if (!lu.ok) throw new Error(`Le débrief du 18/10 est refusé :\n${lu.erreurs.join("\n")}`);
  const d = lu.d;
  const resume = resumeDebrief(d.etapes, d.notes, CHRONO_VIDE, d.resultat, d.aRetenir);
  const a = analyseDebrief(resume, []);
  return donneesImage({
    date: d.date, phases: d.phases, chiffres: true, site: hoteDuSite(SITE), clotureAt: null,
    vue: { resume, analyse: { ...a, precedentLabel: null }, joueurs: [], nbJoueurs: d.joueurs },
  });
}

/** Une séance FICTIVE, pour voir tout ce que l'image sait dire : chaque étape chronométrée, une
 *  séance publiée avant elle (dimanche 18 octobre, mêmes étapes, plus lente), donc des écarts, un
 *  record, « mal deux fois de suite » ; une remarque « <b> & co » (elle doit s'afficher telle
 *  quelle), un émoji (il doit disparaître) ; « à retenir » ; et dix joueurs clôturés, avec leurs
 *  chiffres DÉCLARÉS — un Primat et ses deux PV, une mesure à remesurer, un joueur sans mesure. */
function complet(): DonneesImage {
  const secondes = [372, 95, 140, 210, 372, 160, 118, 131, 245, 150, 190, 300, 420];
  const etapes = ETAPES_CS_DEFAUT;
  // Le chrono en direct : une fin par étape (les durées en sont tirées, `dureesChrono`).
  const chrono = (durees: number[]): Chrono => {
    const debut = Date.UTC(2026, 9, 21, 19, 5);
    let t = debut;
    return { debut, fins: durees.map((x) => (t += x * 1000)), par: "essai", fini: true };
  };
  const notes: Record<string, NoteEtape> = {};
  const avant: Record<string, NoteEtape> = {};
  const statuts = ["bien", "bien", "bien", "moyen", "mal", "bien", "mal", "bien", "mal", "bien", "moyen", "bien", "moyen"] as const;
  etapes.forEach((e, i) => {
    notes[e.code] = { statut: statuts[i % statuts.length], chrono: null, remarque: "" };
    avant[e.code] = { statut: e.code === "3.4" || e.code === "2.2" ? "mal" : "bien", chrono: null, remarque: "" };
  });
  notes["2.2"].remarque = "Équilibrer les deux équipes avant de lancer : Kraavos est mort 9 s après Kraavus. Les deux tanks annoncent la vie de leur boss et le pourcentage 🔥";
  notes["3.4"].remarque = "<b> & co : deux debuffs Envoûteur en même temps, l'araignée a renvoyé les dégâts.";
  notes["5"].remarque = "Trop de monde tape pendant le changement de résistance : on s'arrête dès que la couleur tourne.";
  notes["1.2"].chrono = 101; // corrigé au débrief : l'étoile
  const resume: ResumeDebrief = resumeDebrief(etapes, notes, chrono(secondes.slice(0, etapes.length)), "gagne",
    "Équilibrer les jumeaux AVANT de lancer, et garder l'araignée collée au mur nord. Ener reste en sceptre jusqu'au troll de droite.");
  const plusLent = secondes.slice(0, etapes.length).map((x, i) => x + (i % 3 === 0 ? 25 : -8));
  const precedent: SeanceComparee = { cle: "cs_2026-10-18_dim", date: "2026-10-18", resume: resumeDebrief(etapes, avant, chrono(plusLent), "gagne", "") };
  const a = analyseDebrief(resume, [precedent]);
  const mesure = Date.UTC(2026, 9, 12, 18);
  const vieille = Date.UTC(2026, 8, 2, 18);
  const fige = (c: Partial<ChiffreFige> & Pick<ChiffreFige, "role" | "valeur" | "texte">): ChiffreFige => ({ arme: null, mesureLe: mesure, aRemesurer: false, ...c });
  const j = (pseudo: string, classe: string, chiffres: ChiffreFige[]): JoueurDebrief =>
    ({ pseudo, classe, player: pseudo.toLowerCase(), moi: false, present: true, poste: null, role: null, enLigne: "", chiffres, salles: [], jumeau: null });
  const joueurs: JoueurDebrief[] = [
    j("Brann", "Primat", [fige({ role: "offtank", valeur: 6_100_000, texte: "6,1 M PV", arme: "sceptre" }), fige({ role: "tank", valeur: 5_200_000, texte: "5,2 M PV", arme: "poing" })]),
    j("Ener", "Templier", [fige({ role: "tank", valeur: 9_400_000, texte: "9,4 M PV", arme: "doloire", mesureLe: vieille, aRemesurer: true })]),
    j("Kaelis", "Arcaniste", [fige({ role: "dps", valeur: 182_000, texte: "182 k/s" })]),
    j("Lina", "Arcaniste", [fige({ role: "dps", valeur: 164_000, texte: "164 k/s" })]),
    j("Morwen", "Envouteur", [fige({ role: "dps", valeur: 121_000, texte: "121 k/s" })]),
    j("Ki_ra", "Sylphide", [fige({ role: "dps", valeur: 180_000, texte: "150 k – 210 k/s" })]),
    j("Thorvald", "Spadassin", [fige({ role: "dps", valeur: 140_000, texte: "140 k/s" })]),
    j("Sélène", "Arbaletrier", [fige({ role: "dps", valeur: 155_000, texte: "155 k/s", mesureLe: vieille, aRemesurer: true })]),
    j("Aldric", "Chanoine", [fige({ role: "tank", valeur: 7_800_000, texte: "7,8 M PV", arme: "poing" })]),
    j("Nyx", "Spadassin", []),
  ];
  return donneesImage({
    date: "2026-10-21", phases: PHASES_CS_DEFAUT, chiffres: true, site: hoteDuSite(SITE), clotureAt: Date.UTC(2026, 9, 21, 21, 30),
    vue: { resume, analyse: { ...a, precedentLabel: dateLongue(precedent.date) }, joueurs, nbJoueurs: joueurs.length },
    videos: { "2.2": 2 },
  });
}

/** Ce que fontconfig trouve pour chaque police (sous Linux : l'image Docker). */
function polices() {
  for (const q of ["Cinzel:weight=600", "Cinzel:weight=700", "Athiti:weight=400", "Athiti:weight=600", "Athiti:weight=700"]) {
    const r = spawnSync("fc-match", ["-f", "%{family} · %{style} · %{file}\n", q], { encoding: "utf8" });
    if (r.error) { console.log("  fc-match absent : les polices sont chargées par fichier (public/fonts)."); return; }
    console.log(`  ${q.padEnd(18)} → ${r.stdout.trim()}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const quoi = args.includes("--complet") ? "complet" : "18-10";
  const sortie = resolve(process.cwd(), args.find((x) => !x.startsWith("--")) ?? join(tmpdir(), `essai-debrief-${quoi}.png`));
  const d = quoi === "complet" ? complet() : le18();
  const t = Date.now();
  const png = await imageDebrief(d);
  writeFileSync(sortie, png);
  const m = await sharp(png).metadata();
  console.log(`Image ${quoi === "complet" ? "d'une séance fictive complète" : "du débrief du 18/10/2026"} : ${m.width} × ${m.height} px, ${Math.round(png.length / 1024)} Ko, rendue en ${Date.now() - t} ms.`);
  console.log(`→ ${sortie}`);
  console.log("Polices :");
  polices();
  return 0;
}

main().then((c) => { process.exitCode = c; }, (e) => { console.error(e); process.exitCode = 1; });
