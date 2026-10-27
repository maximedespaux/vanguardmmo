/**
 * LES RÈGLES DES CHAMBRES, VÉRIFIÉES SANS FRAMEWORK — `npx tsx scripts/verifier-seances.ts`.
 *
 * Le dépôt n'a pas de framework de test et ce script n'en ajoute pas (spec §14) : des cas
 * tirés de la spec, `node:assert`, et un code de sortie. Chaque lot y ajoute les siens ;
 * le lot 1 (le recensement) vérifie ici ses fonctions pures — la partie site se vérifie
 * par curl, Discord n'étant pas joignable en local.
 *
 * Il ne touche à AUCUNE base : tout se joue sur des objets écrits ici.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CS_SLOTS } from "@/app/(guild)/compositions/slots";
import {
  aRemesurer, chiffreCourt, chiffresDuPoste, chiffresParRole, choisirStuff, departager, enLigne, lignesRecensement,
  lireNombre, postesDesInscriptions, resumer, rolesDuPoste, type PersoRecense,
} from "@/lib/recensement";
import { blobDesPersosPartages, estPartage, etatSuivi, figure, lienBuildPartage, nomPartage, versInformationGuilde, type MembreBrut } from "@/lib/guilde";
import { droitsSur, estTon, peutAgirSur, rangRelu, rangsDePromotion, rangsDeRetrogradation, retirerDeLaCompo } from "@/lib/gestes";
import { normaliserCompo } from "@/lib/compositions";
import {
  ESPACES_OUVRABLES, REGLAGE_AMIS_DEFAUT, REGLAGE_AMIS_FERME, ROLE_FRIEND_DEFAUT, espacesAmisDe, estAmi, lireReglageAmis,
  memesRoles, normaliserReglageAmis,
} from "@/config/amis";
import { espaceDe, espacesPour, peutOuvrir, type Qui } from "@/config/nav";
import { accesDe } from "@/config/nav";
import { nbPlaces } from "@/lib/compositions";
import {
  ADVERSAIRES_CS, ETAPES_CS_DEFAUT, PARAMETRES_CS_DEFAUT, PARAMETRES_GS_DEFAUT, PHASES_CS_DEFAUT, aEnregistrer, bilanParticipations,
  choixDeMesure, cleDeSeance, conflitsEveryone, derniereSeanceParis, instantParis, libellePoste, lignesCloture, memeValeur, normaliserCS,
  normaliserGS, partiesParis, postesEffectifs, prochaineSeanceParis, remplirTexte, resoudreCle, retirerMentions, seanceCouranteParis,
  seancesRecentesParis, validerParametres, type Participant,
} from "@/lib/evenements";
import { annoncesDeLaSeance, seanceCS, survolFige } from "@/lib/evenements";
import {
  RAPPELS_CS_DEFAUT, annoncer, conditionRemplie, delaiDit, everyoneRecent, inscrireAuPoste, liberer, lireMarqueurs, marquerFait,
  mentionsDuRappel, persosJouables, planDuTick, posteDuPseudo, reclamer, refusMembre, retirerAnnonces, type ChiffreFige, type ParametresCS,
} from "@/lib/evenements";
import { annonceAnnulation, instantRappel, panneauPublie, refusEnvoi } from "@/lib/evenements";
import { fusionnerLu, phraseManques, type CompoState } from "@/lib/compositions";
import { publicationPermise, seanceDuBouton } from "@/lib/evenements";
import {
  appliquerAction, basculerSalle, choisirJumeau, detailsRepartition, ecartJumeaux, equipesGolems, equipesJumeaux, lireAction, lireRepartition, nettoyer,
  niveauEcart, peutJouer, phraseConsignes, placerJumeauStaff, positionsDe, recap, recapEnNoms, regrouperSalles, remplirAuto, resumeClasses, roleTenu, rotationsAraignee,
  singulier, typeDps, vueRepartition, type Place, type Repartition,
} from "@/lib/chambres";
import { modifierChrono, modifierRepartition } from "@/lib/seances-serveur";
import {
  CHRONO_DEJA_AVANCE, CHRONO_VIDE, appliquerChrono, chronoParDefaut, dureesChrono, etatChrono, fmtDuree, lireChrono, lireClicChrono, momentDe,
  refusChronoSeance, repere, tempsDeSeance, totalChrono, type Chrono,
} from "@/lib/chambres";
import { derouleDe, lireDeroule } from "@/lib/evenements";
import { RE_CODE_ETAPE } from "@/lib/evenements";
import {
  analyseDebrief, appliquerDebrief, chronoEtape, ecart, ecrireDebrief, etapeSuivante, lireDebrief, lireDebriefImporte, lireDuree, lirePatchDebrief,
  planImport, precedentsDe, resumeDebrief, resumeDeSeance, tempsDuBilan, type IssueSeance, type StatutEtape,
} from "@/lib/chambres";
import { marquerDebriefPublie, modifierDebrief, vueDebrief } from "@/lib/seances-serveur";
import { cloturerSeance, rouvrirSeance } from "@/lib/seances-serveur";
import { DEBRIEF_CONFLIT, avantDuPatch, conflitDebrief, texteDuPatch } from "@/lib/chambres";
import { Prisma } from "@prisma/client";
import { ButtonStyle, PermissionFlagsBits } from "discord.js";
import * as MSG from "../bot/lib/seances-messages";
import {
  COULEURS, LARGEUR, MAX_LIGNES_REMARQUE, PASTILLES, REMARQUE_IMAGE, TITRE_IMAGE, bloc, chiffreImage, dateCourte, donneesImage, echapperBalisage, hoteDuSite, imageDebrief, phrasesAnalyse, texteImage,
} from "@/lib/seance-image";
import { REMARQUE_MAX } from "@/lib/chambres";
import { etatPublication } from "@/lib/seances-serveur";
import sharp from "sharp";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { LIEN_VIDEO_MAX, REFUS_FICHIER_DISCORD, lireLienVideo, lireTempsDuLien } from "@/lib/evenements";
import {
  GO, MO, REFUS_TYPE_VIDEO, VIDEO_MAX_OCTETS, bilanPurge, lecteurDe, lireDemandeVideo, lireEtapeVideo, lireMomentVideo, lirePlage, lireTitreVideo,
  peutVoirVideo, planPurge, refusDesOctets, refusEnvoiExpire, refusEnvoiFichier, refusSeanceVideo, tailleDite, trierVideos, typeDesOctets, vueVideo,
} from "@/lib/videos";
import { cheminVideo, ecrireFichierVideo } from "@/lib/videos-serveur";
import {
  ROLES_GS, clotureGS, creneauDe, effectifGS, gesteGS, manqueGS, prochaineSeanceGS, publicationPermiseGS, rappelsDus, rappelsEnService, refusInscriptionGS,
  rolesAffichageGS, seanceGS, seancesRecentesGS, type AnnonceGS,
} from "@/lib/evenements";
import { chiffreGS, cloturerGS, inscrireGS, joueursGS } from "@/lib/seances-serveur";
import {
  DUREE_DEMANDE_MS, MAX_DEMANDES_PAR_JOUEUR, SOURCE_DRACARYS, enAttente as demandeEnAttente, equilibrerJumeaux, lireDemande, optionsEchange, planImport as planImportDebrief,
  repondreEchange, texteDemande, type DemandeEchange,
} from "@/lib/chambres";
import { notifierEchange } from "@/lib/seances-serveur";
import {
  instantSnowflake, lignesAEcrire, lireDateDracarys, lireDracarys, planDebriefDracarys, planParticipants, salleDracarys,
} from "@/lib/import-dracarys";
import { importerDracarys } from "@/lib/import-dracarys-serveur";
import { familleNotif } from "@/lib/typesNotif";

/** Le débrief du 18/10/2026 tel que l'image Docker l'embarque (src/data — `assets/` reste hors de
 *  l'image, .dockerignore) ; la retranscription d'origine reste dans assets/genesis/refonte. */
const FICHIER_18 = "src/data/chambres-debrief-2026-10-18.json";
const ORIGINE_18 = "assets/genesis/refonte/debrief-2026-10-18.json";

let ok = 0;
/** Les cas asynchrones (lot 4 : deux écritures concurrentes sur une base en mémoire) : on
 *  attend leur verdict avant le compte final, sinon un échec passerait pour un succès. */
const enAttente: Promise<void>[] = [];
const cas = (nom: string, f: () => void | Promise<void>) => {
  const echec = (e: unknown) => { console.error(`  ÉCHEC  ${nom}\n${(e as Error).message}`); process.exitCode = 1; };
  try {
    const r = f();
    if (r instanceof Promise) { enAttente.push(r.then(() => { ok++; console.log(`  ok  ${nom}`); }, echec)); return; }
    ok++; console.log(`  ok  ${nom}`);
  } catch (e) { echec(e); }
};
const jour = (iso: string) => Date.parse(`${iso}T12:00:00+02:00`);
const slot = (id: string) => CS_SLOTS.find((s) => s.id === id)!;
/** Une colonne `GearProfile.mesures` telle que l'écrit `mesExport` du builder. */
const stuff = (role: string, v: Record<string, number>, mesureLe: number | null, complet: boolean | null = true) =>
  ({ mesures: { role, v, poudres: { verte: true }, buffs: {}, cond: { perles: true }, maj: mesureLe, mesureLe, complet } });

console.log("Lot 1 — le recensement");

/* ── Les nombres : ports À L'IDENTIQUE de mesLire / mesCourt ─────────────────── */
cas("lireNombre lit les nombres comme on les tape sur Discord", () => {
  assert.equal(lireNombre("9,4M"), 9_400_000);
  assert.equal(lireNombre("1.2 m"), 1_200_000);
  assert.equal(lireNombre("850k"), 850_000);
  assert.equal(lireNombre("9 400 000"), 9_400_000);
  assert.equal(lireNombre("9.400.000"), 9_400_000);
  assert.equal(lireNombre("9 400 000"), 9_400_000);
  assert.equal(lireNombre("0"), 0);
  assert.equal(lireNombre("beaucoup"), 0);
});
cas("chiffreCourt donne la forme courte du builder", () => {
  assert.equal(chiffreCourt(9_400_000), "9,4 M");
  assert.equal(chiffreCourt(850_000), "850 k");
  assert.equal(chiffreCourt(1_250_000), "1,25 M");
  assert.equal(chiffreCourt(10_000_000), "10 M");
  assert.equal(chiffreCourt(182_000), "182 k");
  assert.equal(chiffreCourt(640), "640");
  assert.equal(chiffreCourt(0), "—");
});
cas("lireNombre et chiffreCourt disent exactement ce que disent mesLire et mesCourt (airbuilder.js)", () => {
  // Les deux fonctions du builder, extraites de leur fichier et évaluées telles quelles :
  // si l'une change là-bas sans l'autre ici, ce cas tombe.
  const js = readFileSync(join(process.cwd(), "public/airbuilder/airbuilder.js"), "utf8");
  const extraire = (nom: string) => {
    const debut = js.indexOf(`function ${nom}(`);
    assert.ok(debut >= 0, `${nom} introuvable dans airbuilder.js`);
    const fin = js.indexOf("\n/*", debut);
    return js.slice(debut, fin);
  };
  const builder = new Function(`${extraire("mesLire")}\n${extraire("mesCourt")}\nreturn { mesLire, mesCourt };`)() as {
    mesLire: (t: unknown) => number; mesCourt: (n: unknown) => string;
  };
  for (const t of ["9,4M", "1.2 m", "850k", "9 400 000", "12,345", "4,85m", "0", "", "abc", "7.9M", "1k"]) {
    assert.equal(lireNombre(t), builder.mesLire(t), `lireNombre(${JSON.stringify(t)})`);
  }
  for (const n of [0, 5, 999, 1000, 1049, 1050, 12_345, 850_000, 999_949, 1_000_000, 4_850_000, 9_400_000, 10_000_000, 123_456_789]) {
    assert.equal(chiffreCourt(n), builder.mesCourt(n), `chiffreCourt(${n})`);
  }
});

/* ── L'âge d'une mesure ─────────────────────────────────────────────────────── */
cas("une mesure du 01/09, consultée le 20/10, est « à remesurer »", () => {
  const le20 = jour("2026-10-20");
  assert.equal(aRemesurer({ complet: true, mesureLe: jour("2026-09-01") }, le20), true);
  assert.equal(aRemesurer({ complet: true, mesureLe: jour("2026-09-25") }, le20), false);
  // Une mesure incomplète est « à renseigner », pas « à remesurer ».
  assert.equal(aRemesurer({ complet: false, mesureLe: jour("2026-09-01") }, le20), false);
  const par = chiffresParRole([stuff("dps", { dps: 182_000, bulle: 45_000 }, jour("2026-09-01"))], "ARCANISTE", le20);
  assert.equal(par.dps?.aRemesurer, true);
  assert.equal(par.dps?.mesureLe, jour("2026-09-01"));
});

/* ── Les Primats (décision de Maxime du 2026-10-21, spec §2.3) ──────────────── */
const le20 = jour("2026-10-20");
const primat = [
  stuff("tank", { pv: 7_900_000, pvSceptre: 4_800_000 }, jour("2026-10-10")),
  stuff("offtank", { pv: 4_900_000, dps: 120_000 }, jour("2026-10-15")),
  stuff("dps", { boulette: 45_000, dps: 180_000 }, jour("2026-10-12")),
];
cas("un Primat Tank + Off tank montre ses deux PV sur p1, sceptre puis poing", () => {
  const par = chiffresParRole(primat, "PRIMAT", le20);
  const p1 = chiffresDuPoste(par, rolesDuPoste(slot("p1")));
  assert.deepEqual(p1.map((c) => [c.role, c.valeur, c.arme]), [["offtank", 4_900_000, "sceptre"], ["tank", 7_900_000, "poing"]]);
  assert.equal(enLigne(p1, rolesDuPoste(slot("p1"))), "4,9 M sceptre · 7,9 M poing");
});
cas("sur p1, un seul des deux PV dit son arme (le second manque)", () => {
  const p1 = rolesDuPoste(slot("p1"));
  const sceptreSeul = chiffresParRole([primat[1]], "PRIMAT", le20);
  assert.equal(enLigne(chiffresDuPoste(sceptreSeul, p1), p1), "4,9 M PV sceptre");
  const poingSeul = chiffresParRole([stuff("tank", { pv: 7_900_000 }, jour("2026-10-10"), false)], "PRIMAT", le20);
  assert.equal(enLigne(chiffresDuPoste(poingSeul, p1), p1), "7,9 M PV poing");
});
cas("… et ses seuls PV en sceptre sur p2", () => {
  const par = chiffresParRole(primat, "PRIMAT", le20);
  const p2 = chiffresDuPoste(par, rolesDuPoste(slot("p2")));
  assert.deepEqual(p2.map((c) => [c.role, c.valeur]), [["offtank", 4_900_000]]);
  assert.equal(enLigne(p2, rolesDuPoste(slot("p2"))), "4,9 M PV");
});
cas("un Primat Tank seul : ses PV en sceptre viennent du stuff Tank (il fait office d'Off tank PUIS de Tank)", () => {
  const par = chiffresParRole([primat[0]], "PRIMAT", le20);
  assert.equal(par.offtank?.valeur, 4_800_000);
  assert.equal(par.offtank?.arme, "sceptre");
  assert.equal(enLigne(chiffresDuPoste(par, rolesDuPoste(slot("p2"))), rolesDuPoste(slot("p2"))), "4,8 M PV");
});
cas("p2 sans aucun sceptre : le poing n'est qu'un repli, et il le dit", () => {
  const par = chiffresParRole([stuff("tank", { pv: 7_900_000 }, jour("2026-10-10"), false)], "PRIMAT", le20);
  assert.equal(par.offtank, undefined);
  assert.equal(enLigne(chiffresDuPoste(par, rolesDuPoste(slot("p2"))), rolesDuPoste(slot("p2"))), "7,9 M PV poing");
});
cas("les autres postes jugent les dégâts ; un annoncé sans poste prend le premier poste de sa classe", () => {
  assert.deepEqual(rolesDuPoste(slot("d1")).mesure, ["dps"]);
  assert.deepEqual(rolesDuPoste(null, "PRIMAT").mesure, ["offtank", "tank"]);
  assert.deepEqual(rolesDuPoste(null, "Arcaniste").mesure, ["dps"]);
  assert.equal(rolesDuPoste(slot("p2")).araignee, "dps");
  assert.equal(rolesDuPoste(slot("p1")).araignee, "tank");
});

/* ── Le chiffre de chaque classe (spec §4.2) ───────────────────────────────── */
cas("Arcaniste : DPS/s, Bulle en détail ; Spadassin : le milieu de la fourchette", () => {
  const arca = chiffresParRole([stuff("dps", { dps: 182_000, bulle: 45_000 }, le20)], "ARCANISTE", le20).dps!;
  assert.deepEqual([arca.valeur, arca.texte, arca.detail], [182_000, "182 k/s", "Bulle 45 k"]);
  const spada = chiffresParRole([stuff("dps", { dpsMin: 150_000, dpsMax: 210_000 }, le20)], "SPADASSIN", le20).dps!;
  assert.deepEqual([spada.valeur, spada.texte], [180_000, "150 k – 210 k/s"]);
  const temp = chiffresParRole([stuff("tank", { pv: 9_400_000 }, le20)], "TEMPLIER", le20).tank!;
  assert.deepEqual([temp.texte, temp.arme], ["9,4 M PV", "doloire"]);
});
cas("un stuff vide ne compte jamais ; un stuff complet passe avant un incomplet", () => {
  assert.deepEqual(chiffresParRole([stuff("dps", { dps: 999_000 }, le20, null)], "ARCANISTE", le20), {});
  const c = choisirStuff([
    stuff("dps", { dps: 300_000 }, jour("2026-10-19"), false),
    stuff("dps", { dps: 200_000, bulle: 40_000 }, jour("2026-10-01"), true),
  ], ["dps"], "ARCANISTE", le20);
  assert.equal(c?.valeur, 200_000);
  assert.equal(choisirStuff([], ["dps"], "ARCANISTE", le20), null);
});

/* ── Les homonymes (spec §12.3) ─────────────────────────────────────────────── */
cas("un homonyme RECRUE n'est jamais pris ; le compte de l'inscription d'abord", () => {
  const G = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"];
  const recrue = { id: "r", user: { username: "candidat", role: "RECRUE", isActive: true } };
  const membre = { id: "m", user: { username: "maxime", role: "GUARD", isActive: true } };
  const autre = { id: "a", user: { username: "lina", role: "VETERAN", isActive: true } };
  const parti = { id: "p", user: { username: "parti", role: "GUARD", isActive: false } };
  assert.equal(departager([recrue], "candidat", G), null);
  assert.equal(departager([recrue, membre], "candidat", G)?.id, "m");
  assert.equal(departager([membre, autre], "lina", G)?.id, "a");
  assert.equal(departager([membre, autre], "Maxime", G)?.id, "m");
  assert.equal(departager([parti], "parti", G), null);
});

/* ── Les lignes de /recensement (spec §12.1, §12.2) ─────────────────────────── */
const moi = { id: "u1", username: "maxime", sharePublic: false, shareId: null };
const lina = { id: "u2", username: "lina", sharePublic: true, shareId: "AbC123" };
const tom = { id: "u3", username: "tom", sharePublic: false, shareId: null };
// Des colonnes qui ne doivent JAMAIS sortir, glissées exprès dans l'entrée.
const fuite = { stats: { atk: 123_456_789 }, weapon: { main: "SECRET" }, builderBlob: "SECRET", discordId: "424242" };
const persos = [
  { name: "Brann", class: "PRIMAT", level: 200, prestige: 4, user: moi, gearProfiles: primat.map((g) => ({ ...g, ...fuite })) },
  { name: "Mira", class: "ARCANISTE", level: 200, prestige: 2, user: lina, gearProfiles: [stuff("dps", { dps: 190_000, bulle: 48_000 }, jour("2026-10-15"))] },
  { name: "Orin", class: "SPADASSIN", level: 180, prestige: 0, user: tom, gearProfiles: [stuff("dps", {}, null, null)] },
  { name: "Thorn", class: "TEMPLIER", level: 200, prestige: 1, user: tom, gearProfiles: [stuff("tank", {}, jour("2026-10-15"), false)] },
] as unknown as PersoRecense[];
const etat = {
  signups: [
    { id: "s1", player: "maxime", pseudo: "Brann", classe: "Primat", slotId: "p2", selected: false },
    { id: "s2", player: "maxime", pseudo: "brann", classe: "Primat", slotId: "p1", selected: true },
    { id: "s3", player: "lina", pseudo: "Mira", classe: "Arcaniste", slotId: "m1" },
  ],
  slotMeta: { m1: { label: "Arca principal" } },
};
const pourUnMembre = lignesRecensement(persos, { maintenant: le20, appelant: { id: "u1", staff: false }, postes: postesDesInscriptions(etat) });
const pourLeStaff = lignesRecensement(persos, { maintenant: le20, appelant: { id: "u9", staff: true }, postes: postesDesInscriptions(etat) });

cas("une ligne par perso et par rôle mesuré ; « sans mesure » sans rôle", () => {
  const brann = pourUnMembre.filter((l) => l.perso === "Brann").map((l) => l.role);
  assert.deepEqual(brann, ["tank", "offtank", "dps"]);
  const orin = pourUnMembre.filter((l) => l.perso === "Orin");
  assert.deepEqual(orin.map((l) => [l.role, l.chiffre, l.complet]), [[null, null, null]]);
  const thorn = pourUnMembre.filter((l) => l.perso === "Thorn");
  assert.deepEqual(thorn.map((l) => [l.role, l.chiffre, l.complet]), [["tank", null, false]]);
});
cas("le poste CS est celui de l'inscription titulaire, sous son libellé renommé", () => {
  assert.equal(pourUnMembre.find((l) => l.perso === "Brann")?.posteCS, "Primat — Tank croix");
  assert.equal(pourUnMembre.find((l) => l.perso === "Mira")?.posteCS, "Arca principal");
  assert.equal(pourUnMembre.find((l) => l.perso === "Orin")?.posteCS, null);
});
cas("le lien du build suit les droits réels de /api/builder-state (piège n° 5)", () => {
  const lien = (ls: typeof pourUnMembre, perso: string) => ls.find((l) => l.perso === perso)?.lienBuild;
  assert.equal(lien(pourUnMembre, "Brann"), "/builder");          // le mien
  assert.equal(lien(pourUnMembre, "Mira"), "/build/AbC123");      // partagé
  assert.equal(lien(pourUnMembre, "Orin"), null);                  // privé
  assert.equal(lien(pourLeStaff, "Orin"), "/builder/u3");          // le staff
  assert.ok(pourUnMembre.every((l) => l.lienDossier === null));
  assert.equal(pourLeStaff.find((l) => l.perso === "Mira")?.lienDossier, "/staff?section=membres&dossier=u2");
});
cas("la réponse ne contient aucune colonne stats (ni pièces, ni blob, ni discordId)", () => {
  const permis = ["perso", "classe", "joueur", "niveau", "prestige", "role", "chiffre", "texte", "arme", "detail", "poudres", "buffs", "avec",
    "mesureLe", "aRemesurer", "complet", "posteCS", "lienBuild", "lienDossier", "moi"].sort();
  for (const l of [...pourUnMembre, ...pourLeStaff]) assert.deepEqual(Object.keys(l).sort(), permis);
  const json = JSON.stringify([pourUnMembre, pourLeStaff]);
  for (const interdit of ["stats", "weapon", "builderBlob", "discordId", "SECRET", "424242", "123456789"]) assert.ok(!json.includes(interdit), interdit);
  // Pour un membre, l'id d'un compte n'apparaît nulle part — pas même le sien.
  assert.ok(!JSON.stringify(pourUnMembre).match(/"u[123]"|\/u[123]\b/));
});
cas("les relances ne partent qu'au staff", () => {
  assert.equal(resumer(pourUnMembre, false).aRelancer, undefined);
  const r = resumer(pourLeStaff, true);
  assert.deepEqual(r.aRelancer?.map((x) => [x.perso, x.raison]).sort(), [["Orin", "sans_mesure"], ["Thorn", "incomplet"]]);
  const primats = r.parClasse.find((c) => c.classe === "Primat")!;
  assert.deepEqual([primats.pvMedian, primats.pvSceptreMedian, primats.dpsMedian], [7_900_000, 4_900_000, 180_000]);
});

/* ══ Information Guilde (SPEC-INFORMATION-GUILDE §2) ═══════════════════════════
   La page /guilde des membres : rien d'interne ne sort de lib/guilde.ts, les membres
   cachés, partis ou candidats n'y figurent pas, et « Voir le build » n'existe que pour
   un build partagé. Tout se joue sur des lignes écrites ici, sans base. */
console.log("\nInformation Guilde");

/** Un compte tel que la route le lit, avec des colonnes internes glissées EXPRÈS : elles
 *  ne doivent jamais ressortir. */
const compte = (o: Partial<MembreBrut> & { id: string; username: string }) => ({
  discordId: `d-${o.id}`, avatar: null, role: "GUARD", isActive: true, cacheLe: null, sharePublic: false, shareId: null, persosPartages: [],
  characters: [],
  // ↓ ce que la route ne demande pas, et qui ne doit pas passer s'il arrivait quand même
  lastSeenAt: new Date("2026-10-19T10:00:00Z"), builderBlob: "BLOB-SECRET", notes: "NOTE-SECRETE",
  ...o,
}) as unknown as MembreBrut;
const perso = (name: string, cls: string, isMain: boolean, gearProfiles: unknown[] = []) =>
  ({ name, class: cls, level: 200, prestige: 3, isMain, gearProfiles }) as MembreBrut["characters"][number];
const vieux = jour("2026-09-01");

const ig = {
  membres: [
    compte({ id: "u1", username: "maxime", role: "DIRECTION", avatar: "abc", characters: [
      perso("Brann", "PRIMAT", true, primat), perso("Kael", "TEMPLIER", false, [stuff("tank", { pv: 9_000_000 }, vieux)]),
    ] }),
    // Lina a coché « Visible dans Information Guilde » pour Mira, dans son AirBuilder (§5).
    compte({ id: "u2", username: "lina", role: "VETERAN", shareId: "AbC123", persosPartages: ["Mira"], characters: [
      perso("Mira", "ARCANISTE", true, [stuff("dps", { dps: 190_000, bulle: 48_000 }, jour("2026-10-15"))]),
    ] }),
    // Tom a ouvert le LIEN (sharePublic), sans cocher de perso : rien dans Information Guilde.
    compte({ id: "u3", username: "tom", shareId: "PRIVE99", sharePublic: true, characters: [
      perso("Thorn", "TEMPLIER", true, [stuff("tank", {}, jour("2026-10-15"), false)]),
    ] }),
    compte({ id: "u4", username: "cache", cacheLe: new Date("2026-10-18T00:00:00Z"), characters: [perso("Ombre", "SYLPHIDE", true)] }),
    compte({ id: "u5", username: "candidat", role: "RECRUE", characters: [perso("Nouveau", "SPADASSIN", true)] }),
    compte({ id: "u6", username: "parti", isActive: false, characters: [perso("Ancien", "CHANOINE", true)] }),
    compte({ id: "u7", username: "zoe" }),
  ],
  absences: [
    { userId: "u2", debut: "2026-10-19", fin: "2026-10-21" },  // court aujourd'hui
    { userId: "u3", debut: "2026-10-21", fin: "2026-10-21" },  // un seul jour : aujourd'hui
    { userId: "u7", debut: "2026-10-22", fin: "2026-10-25" },  // demain : pas absente
    { userId: "u4", debut: "2026-10-20", fin: "2026-10-23" },  // caché : ne figure nulle part
  ],
  compo: {
    presences: [
      { player: "maxime", pseudo: "Brann", classe: "Primat", creneau: "mer", ts: jour("2026-10-20") },
      { player: "lina", pseudo: "Mira", classe: "Arcaniste", creneau: "mer", ts: jour("2026-10-19") },
    ],
    signups: [{ id: "s1", player: "lina", pseudo: "Mira", classe: "Arcaniste", slotId: "m1", selected: true }],
  },
};
const vue = versInformationGuilde(ig, { moi: { id: "u1", username: "maxime" }, maintenant: jour("2026-10-21"), aujourdhui: "2026-10-21" });

cas("ne figurent que les rangs de guilde actifs et non cachés", () => {
  assert.deepEqual(vue.membres.map((m) => m.discord.nom), ["maxime", "lina", "tom", "zoe"]);
  assert.equal(figure({ role: "GUARD", isActive: true, cacheLe: null }), true);
  assert.equal(figure({ role: "GUARD", isActive: true, cacheLe: new Date() }), false);
  assert.equal(figure({ role: "RECRUE", isActive: true, cacheLe: null }), false);
  assert.equal(figure({ role: "VETERAN", isActive: false, cacheLe: null }), false);
  // Ni dans le recensement, ni dans les classes : le caché et le candidat n'y sont pas.
  const persosVus = new Set(vue.recensement.map((l) => l.perso));
  for (const absent of ["Ombre", "Nouveau", "Ancien"]) assert.ok(!persosVus.has(absent), absent);
});
cas("chacun : pseudo en jeu (le principal), rang, Discord avec son identifiant", () => {
  const max = vue.membres[0];
  assert.deepEqual([max.pseudo, max.rang, max.discord.nom, max.discord.id, max.moi], ["Brann", "DIRECTION", "maxime", "d-u1", true]);
  assert.equal(max.discord.avatar, "https://cdn.discordapp.com/avatars/d-u1/abc.png?size=64");
  // Sans perso, le nom Discord tient lieu de pseudo.
  assert.equal(vue.membres.find((m) => m.discord.nom === "zoe")?.pseudo, "zoe");
  assert.deepEqual(max.persos.map((p) => [p.nom, p.principal]), [["Brann", true], ["Kael", false]]);
});
cas("« Voir le build » : le mien, un build partagé — jamais un build privé", () => {
  const lien = (nom: string) => vue.membres.flatMap((m) => m.persos).find((p) => p.nom === nom)?.build;
  assert.equal(lien("Brann"), "/builder?perso=Brann");
  assert.equal(lien("Mira"), "/build/AbC123?perso=Mira");
  assert.equal(lien("Thorn"), null); // le lien est ouvert, mais Thorn n'est pas coché
  assert.equal(lienBuildPartage({ id: "x", shareId: null, persosPartages: ["P"] }, "P", { id: "u1" }), null);
  // Le recensement de la page suit la même règle : ni dossier, ni build du staff.
  assert.ok(vue.recensement.every((l) => l.lienDossier === null));
  assert.equal(vue.recensement.find((l) => l.perso === "Thorn")?.lienBuild, null);
  // … et c'est LA MÊME décision (lienBuildPartage) : chaque ligne du recensement mène là
  // où mène « Voir le build » du même perso — le sien en lien profond, un partage sur ce perso.
  for (const l of vue.recensement) assert.equal(l.lienBuild, lien(l.perso) ?? null, l.perso);
  assert.equal(vue.recensement.find((l) => l.perso === "Mira")?.lienBuild, "/build/AbC123?perso=Mira");
  assert.equal(vue.recensement.find((l) => l.perso === "Kael")?.lienBuild, "/builder?perso=Kael");
});
cas("les absents du jour : leurs noms, rien d'autre — ni demain, ni un membre caché", () => {
  assert.deepEqual(vue.absents, ["Mira", "Thorn"]);
});
cas("le suivi des mesures : qui est à jour, qui doit remesurer, à qui il en manque", () => {
  const par = Object.fromEntries(vue.membres.map((m) => [m.discord.nom, [m.mesures, etatSuivi(m.mesures)]]));
  assert.deepEqual(par.maxime, [{ montes: 4, aJour: 3, aRemesurer: 1, manquantes: 0 }, "a-remesurer"]);
  assert.deepEqual(par.lina, [{ montes: 1, aJour: 1, aRemesurer: 0, manquantes: 0 }, "a-jour"]);
  assert.deepEqual(par.tom, [{ montes: 1, aJour: 0, aRemesurer: 0, manquantes: 1 }, "manquantes"]);
  assert.deepEqual(par.zoe, [{ montes: 0, aJour: 0, aRemesurer: 0, manquantes: 0 }, "aucun"]);
});
cas("la Chambre Secrète : les annonces sans nom, et les miennes reconnues par mes persos", () => {
  assert.deepEqual(vue.cs.annonces.map((a) => a.creneau), ["mer", "mer"]);
  assert.deepEqual(vue.cs.miennes, [{ creneau: "mer", ts: jour("2026-10-20") }]);
  assert.ok(vue.cs.places > 0);
  assert.ok(!JSON.stringify(vue.cs).includes("Mira") && !JSON.stringify(vue.cs).includes("lina"));
});
cas("la réponse ne contient RIEN d'interne", () => {
  const json = JSON.stringify(vue);
  for (const interdit of ["BLOB-SECRET", "NOTE-SECRETE", "lastSeenAt", "2026-10-19T10:00", "PRIVE99", "sharePublic", "shareId",
    "cacheLe", "isActive", "motif", "reason", "Ombre", "candidat", "Nouveau", "\"u1\"", "\"u2\"", "\"u3\"", "/builder/u"]) {
    assert.ok(!json.includes(interdit), interdit);
  }
  const permis = ["pseudo", "rang", "discord", "moi", "persos", "mesures"].sort();
  for (const m of vue.membres) assert.deepEqual(Object.keys(m).sort(), permis);
  assert.deepEqual(Object.keys(vue).sort(), ["absents", "cs", "genereLe", "maintenant", "membres", "recensement"]);
});

/* ══ Le partage par perso (SPEC-INFORMATION-GUILDE §5) ══════════════════════════
   « Visible dans Information Guilde » : une case par perso dans l'AirBuilder. Le lien
   ouvert à la main ne suffit plus, et la vue partagée ne contient QUE les persos cochés. */
console.log("\nLe partage par perso");

cas("la case décide, sans casse ni accent, au nom coupé comme la synchro", () => {
  assert.ok(estPartage(["Élise"], "elise"));
  assert.ok(estPartage(["  Mira "], "Mira"));
  assert.ok(!estPartage(["Mira"], "Miro"));
  const long = "A".repeat(45);
  assert.equal(nomPartage(long).length, 40);
  assert.ok(estPartage([nomPartage(long)], long)); // le site ne connaît que 40 signes
  assert.equal(lienBuildPartage({ id: "x", shareId: "S1", persosPartages: [] }, "P", { id: "u1" }), null);
  assert.equal(lienBuildPartage({ id: "x", shareId: "S1", persosPartages: ["p"] }, "P", { id: "u1" }), "/build/S1?perso=P");
  // Le sien : toujours son AirBuilder, coché ou non.
  assert.equal(lienBuildPartage({ id: "u1", shareId: null, persosPartages: [] }, "Brann", { id: "u1" }), "/builder?perso=Brann");
});
cas("la vue partagée ne garde que les persos cochés, et rien d'autre de l'état", () => {
  const blob = { chars: [{ name: "Mira", cls: "Arcaniste" }, { name: "Secret", cls: "Primat" }], cur: 1, templates: ["MODELE-PRIVE"] };
  const vu = blobDesPersosPartages(blob, ["mira"]);
  assert.deepEqual(vu, { chars: [{ name: "Mira", cls: "Arcaniste" }], cur: 0 });
  assert.ok(!JSON.stringify(vu).includes("Secret") && !JSON.stringify(vu).includes("MODELE-PRIVE"));
  assert.equal(blobDesPersosPartages(blob, ["Renommé"]), null); // un perso renommé n'est plus partagé
  assert.equal(blobDesPersosPartages(null, ["Mira"]), null);
});

/* ══ Les gestes du dossier (SPEC-INFORMATION-GUILDE §4) ══════════════════════════
   Les quatre rangs bras droits, sur un rang STRICTEMENT inférieur ; pas de promotion
   au-delà du rang juste sous le sien ; les gestes d'avant restent à Vanguard et plus. */
console.log("\nLes gestes du dossier");

const qui = (id: string, role: string, cacheLe: Date | null = null) => ({ id, role: role as MembreBrut["role"], cacheLe });
const direction = qui("d", "DIRECTION"), vanguard = qui("v", "VANGUARD"), general = qui("g", "GENERAL"), officier = qui("o", "OFFICIER");
const veteran = qui("vet", "VETERAN"), guard = qui("gu", "GUARD"), recrue = qui("r", "RECRUE");

cas("on n'agit que sur un rang strictement inférieur, jamais sur soi", () => {
  assert.ok(peutAgirSur(officier, guard));
  assert.ok(peutAgirSur(officier, veteran));
  assert.ok(!peutAgirSur(officier, qui("o2", "OFFICIER")));
  assert.ok(!peutAgirSur(officier, general));
  assert.ok(!peutAgirSur(direction, direction));
  assert.ok(peutAgirSur(direction, vanguard));
  assert.ok(!peutAgirSur(veteran, guard)); // un Vétéran n'est pas bras droit
});
cas("on ne promeut pas au-delà du rang juste sous le sien", () => {
  assert.deepEqual(rangsDePromotion(officier, guard), ["VETERAN"]);
  assert.deepEqual(rangsDePromotion(officier, veteran), []); // Officier serait son égal
  assert.deepEqual(rangsDePromotion(general, guard), ["VETERAN", "OFFICIER"]);
  assert.deepEqual(rangsDePromotion(direction, general), ["VANGUARD"]); // la Direction nomme jusqu'à Vanguard
  // Une Recrue n'entre que par la candidature (Maxime, 2026-10-21) : pas de promotion.
  assert.deepEqual(rangsDePromotion(direction, recrue), []);
  assert.deepEqual(rangsDePromotion(officier, general), []); // pas d'action vers le haut
});
cas("on rétrograde jusqu'à Guard ; en dessous, c'est « retirer de la guilde »", () => {
  assert.deepEqual(rangsDeRetrogradation(vanguard, qui("o2", "OFFICIER")), ["VETERAN", "GUARD"]);
  assert.deepEqual(rangsDeRetrogradation(officier, veteran), ["GUARD"]);
  assert.deepEqual(rangsDeRetrogradation(officier, guard), []);
  assert.deepEqual(rangsDeRetrogradation(direction, recrue), []);
});
cas("les droits du dossier, geste par geste, avec leur raison", () => {
  const o = droitsSur(officier, guard);
  assert.equal(o.gestes.promouvoir, null);
  assert.equal(o.gestes.cacher, null);
  assert.equal(o.gestes.guilde, null);
  assert.ok(o.gestes.montrer); // il n'est pas caché
  assert.match(o.gestes.retrograder ?? "", /Guard est le premier rang/);
  // Les gestes d'avant : Vanguard et plus.
  for (const g of ["role", "kick", "ban"] as const) assert.match(o.gestes[g] ?? "", /Vanguard/);
  const v = droitsSur(vanguard, guard);
  for (const g of ["role", "kick", "ban"] as const) assert.equal(v.gestes[g], null);
  // Sur un égal, sur soi, sur un supérieur : rien, et pas de notes.
  for (const [a, c] of [[officier, qui("o2", "OFFICIER")], [officier, officier], [officier, vanguard]] as const) {
    const d = droitsSur(a, c);
    assert.ok(Object.values(d.gestes).every((r) => r));
    assert.equal(d.notes, false);
    assert.deepEqual([d.promotions, d.retrogradations], [[], []]);
  }
  assert.equal(droitsSur(veteran, guard).notes, false);
  assert.equal(droitsSur(officier, guard).notes, true);
  // Caché : « Montrer de nouveau », plus « Cacher ».
  const c = droitsSur(officier, qui("gu", "GUARD", new Date()));
  assert.equal(c.gestes.montrer, null);
  assert.ok(c.gestes.cacher);
  // Hors guilde : ni cacher, ni retirer de la guilde, ni le faire entrer — la candidature
  // d'abord (Maxime, 2026-10-21).
  const r = droitsSur(officier, recrue);
  assert.ok(r.gestes.cacher && r.gestes.guilde);
  assert.match(r.gestes.promouvoir ?? "", /candidature/);
});
cas("les tons des notes", () => {
  assert.ok(estTon("probleme") && estTon("effort") && estTon("neutre"));
  assert.ok(!estTon("PROBLEME") && !estTon("") && !estTon(undefined));
});
cas("sorti de la guilde, il quitte la composition — lui seul", () => {
  const etat = normaliserCompo({
    signups: [
      { id: "s1", player: "lina", pseudo: "Mira", classe: "Arcaniste", slotId: "m1" },
      { id: "s2", player: "tom", pseudo: "Thorn", classe: "Templier", slotId: "t1" },
      // Inscrit sous un autre nom de joueur, reconnu par son perso.
      { id: "s3", player: "Lina#2", pseudo: "mira", classe: "Arcaniste", slotId: null },
    ],
    presences: [
      { player: "LINA", pseudo: "Autre", classe: "Primat", creneau: "dim", ts: 1 },
      { player: "tom", pseudo: "Thorn", classe: "Templier", creneau: "mer", ts: 2 },
    ],
    slotMeta: { m1: { label: "Arca principal" } }, instructions: "consignes",
  });
  const { etat: apres, retires } = retirerDeLaCompo(etat, { pseudo: "lina", persos: ["Mira"] });
  assert.equal(retires, 3);
  assert.deepEqual(apres.signups.map((x) => x.id), ["s2"]);
  assert.deepEqual(apres.presences.map((x) => x.pseudo), ["Thorn"]);
  assert.deepEqual([apres.slotMeta, apres.instructions], [etat.slotMeta, etat.instructions]);
  assert.equal(retirerDeLaCompo(etat, { pseudo: "personne", persos: [] }).retires, 0);
});

cas("un rang de guilde relu sur Discord le ramène parmi les actifs — Recrue ne touche à rien", () => {
  /* La sortie de la guilde, l'exclusion et le bannissement marquent le compte inactif ;
     remis dans la guilde (à la main sur Discord, ou promu), il doit réapparaître dans
     Information Guilde et le recensement, qui taisent un compte inactif (`figure`). */
  for (const r of ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"] as const) {
    assert.deepEqual(rangRelu(r), { role: r, isActive: true });
    assert.equal(figure({ isActive: false, cacheLe: null, ...rangRelu(r) }), true);
  }
  // Recrue : le drapeau n'est pas touché — un compte sorti reste « parti ».
  assert.deepEqual(rangRelu("RECRUE"), { role: "RECRUE" });
});

console.log("\nL'accès des amis (rôle Friend, SPEC-INFORMATION-GUILDE §9)");

const FRIEND = ROLE_FRIEND_DEFAUT;
const AUTRE_ROLE = "1530581532752875680"; // Vérifié(e) : un rôle qui n'ouvre rien
const ami: Qui = { role: "RECRUE", amis: espacesAmisDe("RECRUE", [AUTRE_ROLE, FRIEND], REGLAGE_AMIS_DEFAUT) };
const candidat: Qui = { role: "RECRUE", amis: [] };
const unGuard: Qui = { role: "GUARD", amis: [] };

cas("le réglage : absent → le défaut de Maxime ; illisible → FERMÉ, jamais le défaut", () => {
  assert.deepEqual(lireReglageAmis(null), { roles: [FRIEND], espaces: ["astuces", "airbuilder"] });
  assert.deepEqual(lireReglageAmis(undefined), REGLAGE_AMIS_DEFAUT);
  assert.deepEqual(lireReglageAmis("{pas du json"), REGLAGE_AMIS_FERME);
  assert.deepEqual(lireReglageAmis('{"roles":"1550844483095232712"}'), REGLAGE_AMIS_FERME);
  // Fermé par un bras droit : une liste vide reste vide, elle ne retombe pas sur le défaut.
  assert.deepEqual(lireReglageAmis('{"roles":[],"espaces":[]}'), { roles: [], espaces: [] });
});

cas("le réglage relu ne garde que des identifiants Discord et des espaces du plafond", () => {
  const r = normaliserReglageAmis({ roles: [FRIEND, ` ${FRIEND} `, "abc", "123", AUTRE_ROLE], espaces: ["bras-droits", "guilde", "airbuilder", "astuces", "astuces"] });
  assert.deepEqual(r, { roles: [FRIEND, AUTRE_ROLE], espaces: ["astuces", "airbuilder"] });
  assert.equal(normaliserReglageAmis({ roles: Array.from({ length: 30 }, (_, i) => String(10n ** 17n + BigInt(i))), espaces: [] })!.roles.length, 20);
  assert.equal(normaliserReglageAmis(null), null);
  assert.deepEqual([...ESPACES_OUVRABLES], ["astuces", "airbuilder"]);
});

cas("un ami : hors guilde ET un rôle Friend — un membre qui le porte reste un membre", () => {
  assert.equal(estAmi("RECRUE", [FRIEND], REGLAGE_AMIS_DEFAUT), true);
  assert.equal(estAmi("RECRUE", [AUTRE_ROLE], REGLAGE_AMIS_DEFAUT), false);
  assert.equal(estAmi("GUARD", [FRIEND], REGLAGE_AMIS_DEFAUT), false);
  assert.equal(estAmi("RECRUE", [FRIEND], { roles: [], espaces: ["astuces"] }), false);
  assert.deepEqual(espacesAmisDe("RECRUE", [FRIEND], REGLAGE_AMIS_DEFAUT), ["astuces", "airbuilder"]);
  assert.deepEqual(espacesAmisDe("RECRUE", [FRIEND], { roles: [FRIEND], espaces: ["airbuilder"] }), ["airbuilder"]);
  assert.deepEqual(espacesAmisDe("OFFICIER", [FRIEND], REGLAGE_AMIS_DEFAUT), []);
  // Le rang ne bouge pas : un ami figure aussi peu qu'un candidat dans Information Guilde.
  assert.equal(figure({ role: "RECRUE", isActive: true, cacheLe: null }), false);
});

cas("la décision : l'ami ouvre le niveau guilde dans SES espaces, et rien d'autre", () => {
  assert.equal(peutOuvrir("guild", ami, "astuces"), true);
  assert.equal(peutOuvrir("guild", ami, "airbuilder"), true);
  assert.equal(peutOuvrir("guild", ami, "guilde"), false);
  assert.equal(peutOuvrir("guild", ami), false); // une ligne sans espace : le profil
  assert.equal(peutOuvrir("admin", ami, "bras-droits"), false);
  assert.equal(peutOuvrir("public", ami), true);
  assert.equal(peutOuvrir("guild", candidat, "astuces"), false);
  assert.equal(peutOuvrir("guild", unGuard, "guilde"), true);
  assert.equal(peutOuvrir("admin", unGuard, "bras-droits"), false);
  // Un jeton qui porterait Guilde ou Bras droits n'ouvre rien : le plafond tient.
  const force: Qui = { role: "RECRUE", amis: ["guilde", "bras-droits"] };
  assert.equal(peutOuvrir("guild", force, "guilde"), false);
  assert.equal(peutOuvrir("admin", force, "bras-droits"), false);
  assert.equal(peutOuvrir("guild", { role: "RECRUE", devAll: true }, "guilde"), true);
});

cas("l'espace d'une adresse, sous-pages comprises — ce que lit le middleware", () => {
  assert.equal(espaceDe("/objets"), "astuces");
  assert.equal(espaceDe("/objets/12345"), "astuces");
  assert.equal(espaceDe("/mecaniques"), "astuces");
  assert.equal(espaceDe("/builder"), "airbuilder");
  assert.equal(espaceDe("/personnages"), "airbuilder");
  assert.equal(espaceDe("/guilde"), "guilde");
  assert.equal(espaceDe("/compositions/build/abc"), "guilde");
  assert.equal(espaceDe("/staff?section=membres"), "bras-droits");
  assert.equal(espaceDe("/acces-amis"), "bras-droits");
  assert.equal(espaceDe("/"), undefined);
  assert.equal(espaceDe("/#la-guilde"), undefined);
  assert.equal(espaceDe("/objetsx"), undefined);
  // Les adresses gardées « guilde » par le middleware : l'ami ne passe que /objets.
  const passe = ["/guilde", "/compositions", "/worldboss", "/absences", "/objets"].filter((p) => peutOuvrir("guild", ami, espaceDe(p)));
  assert.deepEqual(passe, ["/objets"]);
});

cas("la carte d'un ami : Astuces et AirBuilder entiers, de la Guilde sa seule face publique, ni profil ni staff", () => {
  const { espaces, hors } = espacesPour(ami, "plan");
  const noms = Object.fromEntries(espaces.map((e) => [e.cle, e.liens.map((l) => l.href)]));
  assert.deepEqual(Object.keys(noms), ["airbuilder", "astuces", "guilde"]);
  assert.ok(noms.astuces.includes("/objets") && noms.astuces.includes("/crafts"));
  assert.deepEqual(noms.guilde, ["/#la-guilde"]);
  assert.deepEqual(hors.map((l) => l.href), ["/", "/candidature"]); // « Postuler » : il n'est pas de la guilde
  // Toute ligne réservée qu'il voit est dans un espace que son réglage lui ouvre.
  for (const e of espaces) for (const l of e.liens) {
    if ((l.acces ?? e.acces) !== "public") assert.ok((ami.amis ?? []).includes(e.cle), `${l.href} montré hors de ses espaces`);
  }
  // Un candidat connecté sans le rôle n'a pas Objets.
  assert.ok(!espacesPour(candidat, "plan").espaces.find((e) => e.cle === "astuces")!.liens.some((l) => l.href === "/objets"));
  // Réglage réduit à l'AirBuilder : Objets disparaît de sa carte.
  const reduit: Qui = { role: "RECRUE", amis: espacesAmisDe("RECRUE", [FRIEND], { roles: [FRIEND], espaces: ["airbuilder"] }) };
  assert.ok(!espacesPour(reduit, "plan").espaces.find((e) => e.cle === "astuces")!.liens.some((l) => l.href === "/objets"));
});

cas("la synchro du bot ne réécrit les rôles que s'ils ont bougé", () => {
  assert.equal(memesRoles([FRIEND, AUTRE_ROLE], [AUTRE_ROLE, FRIEND]), true);
  assert.equal(memesRoles([AUTRE_ROLE], [AUTRE_ROLE, FRIEND]), false); // Friend posé
  assert.equal(memesRoles([AUTRE_ROLE, FRIEND], [AUTRE_ROLE]), false); // Friend retiré
  assert.equal(memesRoles([], []), true);
});


console.log("\nLot 2 — le socle des séances et le paramétrage (SPEC-CHAMBRES-RECENSEMENT §2.5, §3, §4.8, §9)");

/** Un instant donné à l'heure de PARIS, quel que soit le fuseau de la machine qui lance le script. */
const paris = (date: string, hhmm: string) => instantParis(date, hhmm);

cas("les heures de Paris : été (UTC+2), hiver (UTC+1), et la nuit du changement d'heure", () => {
  assert.equal(paris("2026-10-21", "21:00").toISOString(), "2026-10-21T19:00:00.000Z");
  // Le dimanche 25 octobre 2026, Paris repasse à l'heure d'hiver à 3 h : 21 h, c'est 20 h UTC.
  assert.equal(paris("2026-10-25", "21:00").toISOString(), "2026-10-25T20:00:00.000Z");
  assert.equal(paris("2026-10-25", "12:00").toISOString(), "2026-10-25T11:00:00.000Z");
  assert.equal(paris("2026-03-29", "21:00").toISOString(), "2026-03-29T19:00:00.000Z"); // le jour du passage à l'heure d'été
  assert.deepEqual(partiesParis(new Date("2026-10-21T20:00:00Z")), { date: "2026-10-21", jour: 3, hhmm: "22:00", minutes: 1320 });
  assert.deepEqual(partiesParis(new Date("2026-10-25T22:59:00Z")), { date: "2026-10-25", jour: 0, hhmm: "23:59", minutes: 1439 });
});

cas("une clôture faite le mercredi à 22 h vise le mercredi, pas le dimanche", () => {
  const mer22 = paris("2026-10-21", "22:00");
  assert.equal(derniereSeanceParis(mer22).cle, "cs_2026-10-21_mer");
  assert.equal(resoudreCle("cs_derniere", mer22).ok && (resoudreCle("cs_derniere", mer22) as { seance: { cle: string } }).seance.cle, "cs_2026-10-21_mer");
  assert.equal(seanceCouranteParis(mer22).cle, "cs_2026-10-21_mer"); // commencée depuis moins de 6 h
  assert.equal(prochaineSeanceParis(mer22).cle, "cs_2026-10-25_dim"); // la préparation, elle, a basculé
});

cas("une clôture faite le jeudi à 9 h vise ENCORE le mercredi (cs_derniere, contre-examen n° 3)", () => {
  const jeu9 = paris("2026-10-22", "09:00");
  const r = resoudreCle("cs_derniere", jeu9);
  assert.ok(r.ok);
  assert.equal(r.ok && r.seance.cle, "cs_2026-10-21_mer");
  // C'était le piège : la séance « courante » est déjà le dimanche, pas encore joué.
  assert.equal(seanceCouranteParis(jeu9).cle, "cs_2026-10-25_dim");
});

cas("les fenêtres de préparation : la demi-heure qui suit 21 h le mercredi reste au mercredi", () => {
  assert.equal(prochaineSeanceParis(paris("2026-10-21", "21:15")).cle, "cs_2026-10-21_mer");
  assert.equal(prochaineSeanceParis(paris("2026-10-21", "21:45")).cle, "cs_2026-10-25_dim");
  assert.equal(prochaineSeanceParis(paris("2026-10-18", "21:00")).cle, "cs_2026-10-21_mer");
  assert.equal(prochaineSeanceParis(paris("2026-10-18", "20:59")).cle, "cs_2026-10-18_dim");
  assert.equal(derniereSeanceParis(paris("2026-10-21", "20:59")).cle, "cs_2026-10-18_dim");
  // L'ouverture date les annonces valides : dimanche 21 h pour un mercredi, mercredi 21 h 30 pour un dimanche.
  assert.equal(prochaineSeanceParis(paris("2026-10-20", "12:00")).ouverture.toISOString(), paris("2026-10-18", "21:00").toISOString());
  assert.equal(prochaineSeanceParis(paris("2026-10-23", "12:00")).ouverture.toISOString(), paris("2026-10-21", "21:30").toISOString());
  assert.deepEqual(seancesRecentesParis(paris("2026-10-22", "09:00"), 3).map((x) => x.cle), ["cs_2026-10-21_mer", "cs_2026-10-18_dim", "cs_2026-10-14_mer"]);
});

cas("la clé d'une séance : le jour doit être celui du créneau, la date doit exister", () => {
  const r = resoudreCle("cs_2026-10-21_dim");
  assert.ok(!r.ok && r.status === 400 && /pas un dimanche/.test(r.error));
  assert.ok(!resoudreCle("cs_2026-02-30_dim").ok);
  assert.ok(!resoudreCle("cs_2026-10-21_jeu").ok);
  assert.ok(!resoudreCle("../../etc").ok);
  const ok = resoudreCle("cs_2026-10-21_mer");
  assert.ok(ok.ok && ok.seance.debut.toISOString() === "2026-10-21T19:00:00.000Z");
  // Le Guild Siege : rien sans créneau ; un créneau du samedi n'existe pas un dimanche.
  assert.ok(!resoudreCle("gs_derniere", new Date(), { creneaux: [] }).ok);
  const gs = { creneaux: [{ id: "sam2100", jour: "sam" as const, heure: "21:00", finInscription: "19:00" }] };
  assert.ok(resoudreCle("gs_2026-10-24_sam2100", new Date(), gs).ok);
  assert.ok(!resoudreCle("gs_2026-10-25_sam2100", new Date(), gs).ok);
  assert.equal(cleDeSeance({ creneau: "mer", debut: new Date("2026-10-21T19:00:00Z") }), "cs_2026-10-21_mer");
});

cas("les phases et les étapes par défaut sont EXACTEMENT celles du débrief du 18/10/2026 (décision 7)", () => {
  const d = JSON.parse(readFileSync(join(process.cwd(), FICHIER_18), "utf8")) as {
    phases: Record<string, string>; etapes: { code: string; label: string; phase: string }[];
  };
  assert.deepEqual(PHASES_CS_DEFAUT, d.phases);
  assert.deepEqual(ETAPES_CS_DEFAUT.map(({ code, label, phase }) => ({ code, label, phase })), d.etapes.map(({ code, label, phase }) => ({ code, label, phase })));
  assert.equal(ETAPES_CS_DEFAUT.find((e) => e.code === "2.1")!.emoji, "💂"); // pas ⚔️ : il veut dire « DPS physique »
});

cas("les monstres de chaque étape viennent du relevé du client, et seulement quand on le sait (décision 8)", () => {
  const ids = (code: string) => ETAPES_CS_DEFAUT.find((e) => e.code === code)!.monstres.map((m) => m.id);
  assert.deepEqual(ids("2.2"), ["MI_CHAMBRE_BOSS_4", "MI_CHAMBRE_BOSS_6"]);
  assert.deepEqual(ids("3.4"), ["MI_CHAMBRE_BOSS_2"]);
  assert.deepEqual(ids("5"), ["MI_CHAMBRE_BOSS_1"]);
  assert.deepEqual(ids("1.1"), []); // « 480 mobs » : aucune donnée ne dit lesquels
  assert.deepEqual(ETAPES_CS_DEFAUT.find((e) => e.code === "1.3")!.monstres, [{ id: null, nom: "Malphas" }]);
  for (const e of ETAPES_CS_DEFAUT) for (const m of e.monstres) if (m.id) assert.ok(ADVERSAIRES_CS.some((a) => a.id === m.id && a.nom === m.nom), `${e.code} : ${m.id}`);
});

cas("normaliserParametres : rien → le défaut ; une valeur abîmée reprend son défaut, sans exception", () => {
  assert.ok(memeValeur(normaliserCS({}), PARAMETRES_CS_DEFAUT));
  assert.ok(memeValeur(normaliserCS(null), PARAMETRES_CS_DEFAUT));
  assert.ok(memeValeur(normaliserGS(undefined), PARAMETRES_GS_DEFAUT));
  const abime = normaliserCS({ etapes: "x", rappels: 3, salons: { chambres: "abc", debriefs: 12 }, degats: "oui", postes: [{ id: "p1", classe: "Dragon" }] });
  assert.deepEqual(abime.etapes, ETAPES_CS_DEFAUT);
  assert.deepEqual(abime.salons, { chambres: "", debriefs: "", essais: "" });
  assert.equal(abime.postes[0].classe, "Primat");
  // Le Guild Siege est codé mais INACTIF par défaut (décision 2), sans créneau.
  assert.equal(PARAMETRES_GS_DEFAUT.actif, false);
  assert.deepEqual(PARAMETRES_GS_DEFAUT.creneaux, []);
});

cas("les mentions écrites dans un texte sont retirées (piège n° 15) ; une variable inconnue reste", () => {
  assert.equal(retirerMentions("@everyone Demain <@123456789012345678> à {heure} <@&987654321098765432>@here"), "Demain à {heure}");
  const p = normaliserCS({ rappels: [{ ...PARAMETRES_CS_DEFAUT.rappels[0], texte: "@everyone Demain à {heure} !" }] });
  assert.equal(p.rappels[0].texte, "Demain à {heure} !");
  assert.equal(remplirTexte("Ce soir à {heure} · {inconnue}", { heure: "21 h" }), "Ce soir à 21 h · {inconnue}");
});

cas("validerParametres : le défaut passe ; chaque règle du §9.3 refuse avec sa raison", () => {
  assert.deepEqual(validerParametres("cs", PARAMETRES_CS_DEFAUT), []);
  assert.deepEqual(validerParametres("gs", PARAMETRES_GS_DEFAUT), []);
  const r = PARAMETRES_CS_DEFAUT.rappels;
  const err = (patch: Record<string, unknown>, ctx = {}) => validerParametres("cs", { ...PARAMETRES_CS_DEFAUT, ...patch }, ctx);
  assert.ok(err({ rappels: [{ ...r[0], heure: "25:00" }] }).some((e) => /HH:MM/.test(e)));
  assert.ok(err({ rappels: [r[0], { ...r[1], id: "veille" }] }).some((e) => /Deux rappels/.test(e)));
  assert.ok(err({ rappels: [{ ...r[1], heure: "21:30" }] }).some((e) => /pendant la Chambre/.test(e)));
  assert.ok(err({ rappels: [{ ...r[4], mention: "everyone" }] }).some((e) => /récap/.test(e)));
  assert.ok(err({ rappels: [{ ...r[1], texte: "x".repeat(401) }] }).some((e) => /400 au plus/.test(e)));
  assert.ok(err({ etapes: [] }).some((e) => /au moins une étape/.test(e)));
  assert.ok(err({ etapes: Array.from({ length: 31 }, (_, i) => ({ code: `9.${i}`, label: "x", phase: "1", emoji: "🧟", monstres: [] })) }).some((e) => /30 étapes/.test(e)));
  assert.ok(err({ etapes: [ETAPES_CS_DEFAUT[0], { ...ETAPES_CS_DEFAUT[1], code: "1.1" }] }).some((e) => /unique/.test(e)));
  assert.ok(err({ etapes: [{ ...ETAPES_CS_DEFAUT[0], phase: "8" }] }).some((e) => /phase n'existe pas/.test(e)));
  assert.ok(err({ etapes: [{ ...ETAPES_CS_DEFAUT[0], monstres: [{ id: "MI_INCONNU_42", nom: "?" }] }] }, { monstreConnu: () => false }).some((e) => /aucune fiche/.test(e)));
  const arca = PARAMETRES_CS_DEFAUT.postes.find((p) => p.id === "m1")!;
  assert.ok(err({ postes: [{ ...arca, cs: { ...arca.cs, mesure: ["offtank"] } }] }).some((e) => /seul le Primat/.test(e)));
  // Un salon : connu du bot, et du bon type.
  const salon = "123456789012345678";
  assert.ok(err({ salons: { chambres: salon, debriefs: "", essais: "" } }).some((e) => /ne connaît pas/.test(e)));
  assert.deepEqual(err({ salons: { chambres: salon, debriefs: "", essais: "" } }, { salons: [{ id: salon, type: "text" }] }), []);
  assert.ok(err({ salons: { chambres: salon, debriefs: "", essais: "" } }, { salons: [{ id: salon, type: "forum" }] }).some((e) => /texte ou d'annonces/.test(e)));
});

cas("un seul @everyone par demi-heure : un Guild Siege le samedi à 21 h heurte le panneau du dimanche (§8.5)", () => {
  const gs = normaliserGS({ actif: true, creneaux: [{ jour: "sam", heure: "21:00", finInscription: "19:00" }] });
  const conflits = conflitsEveryone(PARAMETRES_CS_DEFAUT, gs);
  assert.equal(conflits.length, 1);
  assert.match(conflits[0], /« jour » du Guild Siege \(samedi 20:00\).*« veille » \(samedi 20:00\)/);
  assert.ok(validerParametres("gs", gs, { autre: PARAMETRES_CS_DEFAUT }).length === 1);
  // Un vendredi à 21 h ne heurte rien ; un rappel sans mention non plus.
  assert.deepEqual(conflitsEveryone(PARAMETRES_CS_DEFAUT, normaliserGS({ actif: true, creneaux: [{ jour: "ven", heure: "21:00", finInscription: null }] })), []);
  // Un Guild Siege ÉTEINT n'envoie rien : ses créneaux se préparent sans bloquer les Chambres,
  // et le conflit est refusé au moment où on l'allume (contre-vérification du lot 2).
  const eteint = { ...gs, actif: false };
  assert.deepEqual(conflitsEveryone(PARAMETRES_CS_DEFAUT, eteint), []);
  assert.deepEqual(validerParametres("cs", PARAMETRES_CS_DEFAUT, { autre: eteint }), []);
  assert.deepEqual(validerParametres("gs", eteint, { autre: PARAMETRES_CS_DEFAUT }), []);
  assert.deepEqual(conflitsEveryone(PARAMETRES_CS_DEFAUT, { ...gs, rappels: gs.rappels.map((r) => ({ ...r, mention: "aucune" as const })) }), []);
});

cas("on n'écrit en base que ce qui diffère du défaut, quel que soit l'ordre des clés (contre-examen n° 24)", () => {
  assert.deepEqual(aEnregistrer("cs", normaliserCS({})), {});
  // Relu par la normalisation, un rappel n'a pas ses champs dans l'ordre du défaut : pas modifié pour autant.
  assert.deepEqual(aEnregistrer("cs", normaliserCS(JSON.parse(JSON.stringify(PARAMETRES_CS_DEFAUT)))), {});
  const etapes = ETAPES_CS_DEFAUT.map((e) => (e.code === "4.3" ? { ...e, label: "Gor'Thar (2 barres)" } : e));
  assert.deepEqual(Object.keys(aEnregistrer("cs", normaliserCS({ etapes }))), ["etapes"]);
  // « Rétablir le défaut » : la valeur du code revient, la clé disparaît.
  assert.deepEqual(aEnregistrer("cs", normaliserCS({ etapes: ETAPES_CS_DEFAUT })), {});
});

cas("les postes : la règle des trois Primats, l'option, et le titre fixé par le paramétrage", () => {
  const postes = postesEffectifs(PARAMETRES_CS_DEFAUT);
  assert.equal(postes.length, 12);
  assert.equal(nbPlaces(postes), 10);
  assert.equal(choixDeMesure(postes.find((p) => p.id === "p1")!.cs), "tank2");   // Tank : sceptre ET poing
  assert.equal(choixDeMesure(postes.find((p) => p.id === "p2")!.cs), "offtank"); // Off tank : sceptre
  assert.equal(choixDeMesure(postes.find((p) => p.id === "d1")!.cs), "dps");
  const d6 = { ...PARAMETRES_CS_DEFAUT.postes.find((p) => p.id === "d6")!, optionnel: false };
  assert.equal(nbPlaces(postesEffectifs(normaliserCS({ postes: [d6] }))), 11);
  // Titre : celui du paramétrage l'emporte sur celui renommé sur la page ; tel quel, la page garde le sien.
  const renomme = { d1: { label: "Templier" } };
  assert.equal(libellePoste(postes.find((p) => p.id === "d1")!, renomme), "Templier");
  const fixe = postesEffectifs(normaliserCS({ postes: [{ ...PARAMETRES_CS_DEFAUT.postes.find((p) => p.id === "d1")!, label: "Chevalier" }] }));
  assert.equal(libellePoste(fixe.find((p) => p.id === "d1")!, renomme), "Chevalier");
  // Une classe qui ne se mesure pas en Off tank repart sur le DPS.
  assert.deepEqual(normaliserCS({ postes: [{ id: "p2", classe: "Arcaniste", cs: { jumeaux: "dps", golems: "dps", araignee: "dps", mesure: ["offtank"] } }] }).postes[1].cs.mesure, ["dps"]);
});

const part = (pseudo: string, extra: Partial<Participant> = {}): Participant => ({
  pseudo, classe: "Arcaniste", player: pseudo.toLowerCase() + "_d", userId: `u_${pseudo}`, slotId: null, poste: null, retenu: true, ts: 0,
  roles: { jumeaux: "dps", golems: "dps", araignee: "dps" }, type: "mag", role: "mag", chiffres: [], enLigne: "", ...extra,
});

cas("la clôture : les décochés deviennent absents, un annoncé non retenu s'ajoute, un inconnu est refusé", () => {
  const { lignes, inconnus } = lignesCloture([part("Brann"), part("Ysolde"), part("Mira")], [part("Nox", { retenu: false })], ["brann", "Mira"], ["Nox"]);
  assert.deepEqual(lignes.map((l) => [l.pseudo, l.present]), [["Brann", true], ["Ysolde", false], ["Mira", true], ["Nox", true]]);
  assert.deepEqual(inconnus, []);
  // Un annoncé non retenu NON ajouté n'est pas écrit : il n'était pas participant.
  assert.equal(lignesCloture([part("Brann")], [part("Nox", { retenu: false })], ["Brann"]).lignes.length, 1);
  assert.deepEqual(lignesCloture([part("Brann")], [], ["Brann", "Zed"]).inconnus, ["Zed"]);
  // Deux fois la même clôture donne les mêmes lignes : la base les REMPLACE (vérifié par scripts du lot sur la base locale).
  assert.deepEqual(lignesCloture([part("Brann")], [], ["Brann"]).lignes, lignesCloture([part("Brann")], [], ["Brann"]).lignes);
});

cas("une séance passée ne reprend pas les annonces faites depuis pour la suivante du même créneau", () => {
  // Contre-vérification du lot 2 : `presencesSeance` ne borne que le début. La clôture du
  // mercredi 14 faite le 21 (son sélecteur remonte de quatre semaines) comptait les annonces
  // du mercredi 21 — même créneau, plus récentes.
  const a = (pseudo: string, creneau: "mer" | "dim", date: string, hhmm: string) =>
    ({ player: "p", pseudo, classe: "Arcaniste", creneau, ts: paris(date, hhmm).getTime() });
  const etat = { presences: [a("Brann", "mer", "2026-10-12", "18:00"), a("Ysolde", "mer", "2026-10-19", "18:00"), a("Mira", "dim", "2026-10-16", "12:00")] };
  const noms = (s: ReturnType<typeof seanceCS>) => annoncesDeLaSeance(etat, s).map((p) => p.pseudo);
  assert.deepEqual(noms(seanceCS("2026-10-14", "mer")), ["Brann"]);  // pas Ysolde, annoncée pour le 21
  assert.deepEqual(noms(seanceCS("2026-10-21", "mer")), ["Ysolde"]); // pas Brann, annoncé pour le 14
  assert.deepEqual(noms(seanceCS("2026-10-18", "dim")), ["Mira"]);
  assert.deepEqual(noms(seanceCS("2026-10-25", "dim")), []);
});

cas("un chiffre figé se montre DÉCLARÉ, daté, avec son témoin « à remesurer » (décision 9)", () => {
  const c = { texte: "4,9 M PV", arme: "sceptre", mesureLe: paris("2026-09-01", "12:00").getTime(), aRemesurer: true };
  assert.equal(survolFige(c), "4,9 M PV en sceptre · déclaré le 01/09/2026 · plus de 30 jours : à remesurer");
  assert.equal(survolFige({ ...c, arme: null, mesureLe: null, aRemesurer: false }), "4,9 M PV · déclaré, sans date");
});

cas("l'historique : un joueur est un COMPTE ; deux persos un même soir ne font qu'une participation", () => {
  const b = bilanParticipations([
    { seance: "cs_2026-10-18_dim", date: "2026-10-18", pseudo: "Brann", player: "maxime", userId: "u1", present: true },
    { seance: "cs_2026-10-18_dim", date: "2026-10-18", pseudo: "Orin", player: "maxime", userId: "u1", present: false },
    { seance: "cs_2026-10-21_mer", date: "2026-10-21", pseudo: "Brann", player: "maxime", userId: "u1", present: false },
    { seance: "cs_2026-10-21_mer", date: "2026-10-21", pseudo: "Lina", player: "lina", userId: null, present: true },
  ], (id) => (id === "u1" ? "Maxime" : null));
  const maxime = b.find((j) => j.joueur === "Maxime")!;
  assert.equal(maxime.joues, 1);
  assert.equal(maxime.absences, 1);
  assert.deepEqual(maxime.absentLe, ["2026-10-21"]); // le 18, il était là avec Brann : pas absent
  assert.deepEqual(maxime.persos, ["Brann", "Orin"]);
  assert.equal(b.find((j) => j.joueur === "lina")!.joues, 1);
});

cas("le paramétrage est dans le plan du site d'un Officier, et pas dans celui d'un Vétéran", () => {
  const liens = (q: Qui, vue: "plan" | "barre" = "plan") => espacesPour(q, vue).espaces.flatMap((e) => e.liens.map((l) => l.href));
  assert.ok(liens({ role: "OFFICIER" }).includes("/discord/evenements"));
  assert.ok(!liens({ role: "VETERAN" }).includes("/discord/evenements"));
  assert.ok(!liens({ role: "GUARD" }).includes("/discord/evenements"));
  assert.ok(!liens({ role: "OFFICIER" }, "barre").includes("/discord/evenements")); // hors de la barre, comme le veut la spec
  assert.equal(accesDe("/discord/evenements"), "admin");
  assert.equal(espaceDe("/discord/evenements"), "bras-droits");
  assert.equal(peutOuvrir("admin", ami, espaceDe("/discord/evenements")), false); // un ami n'y entre pas
});

console.log("\nLot 3 — notre bot reprend l'inscription et les rappels (SPEC-CHAMBRES-RECENSEMENT §4.12, §8)");

/* Une semaine type : mercredi 21 octobre 2026 (heure d'été, UTC+2), le samedi 24 et le dimanche
   25 (la nuit du changement d'heure). */
const CS0 = PARAMETRES_CS_DEFAUT;
const CS_BASCULE: ParametresCS = { ...CS0, nouveauxMessages: true };
const GS_SAMEDI = normaliserGS({ actif: true, creneaux: [{ jour: "sam", heure: "21:00", finInscription: "19:00" }] });
const ids = (l: { rappel: { id: string }; seance: { cle: string } }[]) => l.map((d) => `${d.seance.cle}|${d.rappel.id}`);
const POSTES = postesEffectifs(CS0);
const COMPTE = { id: "u-maxime", username: "maxime" };
const MERCREDI = seanceCS("2026-10-21", "mer");
const fige = (role: "dps" | "offtank" | "tank", valeur: number, texte: string, arme: string | null = null, aRemesurer = false): ChiffreFige =>
  ({ role, valeur, texte, arme: arme as ChiffreFige["arme"], mesureLe: jour("2026-10-12"), aRemesurer });

cas("interrupteur général coupé : rien ne part ; allumé, le panneau de la veille est dû mardi à 20 h", () => {
  const mardi20h = paris("2026-10-20", "20:00");
  assert.deepEqual(planDuTick({ actifs: { cs: false, gs: false }, cs: CS_BASCULE, gs: GS_SAMEDI, now: mardi20h }).dus, []);
  assert.deepEqual(ids(planDuTick({ actifs: { cs: true, gs: false }, cs: CS0, gs: GS_SAMEDI, now: mardi20h }).dus), ["cs_2026-10-21_mer|veille"]);
});

cas("bascule coupée : seuls les deux rappels existants partent (veille et jour) ; allumée, 13 h 30 aussi", () => {
  const a1330 = paris("2026-10-21", "13:30");
  assert.deepEqual(planDuTick({ actifs: { cs: true, gs: false }, cs: CS0, gs: GS_SAMEDI, now: a1330 }).dus, []);
  assert.deepEqual(ids(planDuTick({ actifs: { cs: true, gs: false }, cs: CS_BASCULE, gs: GS_SAMEDI, now: a1330 }).dus), ["cs_2026-10-21_mer|places_1"]);
  assert.deepEqual(ids(planDuTick({ actifs: { cs: true, gs: false }, cs: CS0, gs: GS_SAMEDI, now: paris("2026-10-21", "20:00") }).dus), ["cs_2026-10-21_mer|jour"]);
});

cas("un bot redémarré à 13 h 34 envoie le rappel de 13 h 30 ; à 13 h 41, il ne l'envoie plus (et le journal le dit)", () => {
  const plan = (hhmm: string) => planDuTick({ actifs: { cs: true, gs: false }, cs: CS_BASCULE, gs: GS_SAMEDI, now: paris("2026-10-21", hhmm) });
  assert.deepEqual(plan("13:34").dus.map((d) => [d.rappel.id, d.retard]), [["places_1", 4]]);
  assert.deepEqual(plan("13:40").dus.map((d) => d.rappel.id), ["places_1"]);
  assert.deepEqual(plan("13:41").dus, []);
  assert.deepEqual(plan("13:41").manques.map((d) => d.rappel.id), ["places_1"]);
  assert.deepEqual(plan("13:29").dus, []);
});

cas("effectif complet : pas de message à 13 h 30 ; il manque une classe : il part, et le dit", () => {
  const complet = ["Primat", "Primat", "Templier", "Sylphide", "Spadassin", "Arbaletrier", "Chanoine", "Arcaniste", "Arcaniste", "Envouteur"].map((classe) => ({ classe }));
  assert.equal(phraseManques(complet, POSTES), null);
  const r = CS0.rappels.find((x) => x.id === "places_1")!;
  assert.equal(conditionRemplie(r, { manque: null, participants: 10 }), false);
  const troue = complet.filter((c, i) => c.classe !== "Envouteur" && i !== 7 && i !== 8);
  assert.equal(phraseManques(troue, POSTES), "2 Arcanistes et 1 Envoûteur");
  assert.equal(conditionRemplie(r, { manque: "2 Arcanistes et 1 Envoûteur", participants: 7 }), true);
});

cas("le rappel de 18 h 30 remplace celui de 13 h 30 : même message, et lui seul supprime le précédent", () => {
  const [p1, p2] = ["places_1", "places_2"].map((id) => RAPPELS_CS_DEFAUT.find((r) => r.id === id)!);
  assert.equal(p1.type, p2.type);
  assert.equal(p1.remplacePrecedent, false);
  assert.equal(p2.remplacePrecedent, true);
});

cas("deux bots lancés en même temps n'envoient qu'un message : le second ne peut pas réclamer", () => {
  const m = { t: 1, etat: "envoi" as const, canal: "1498696982229811352", everyone: true };
  const premier = reclamer({}, "places_1", m);
  assert.ok(premier);
  assert.equal(reclamer(premier, "places_1", m), null);
  // Un envoi raté LIBÈRE le marqueur : le tick suivant réessaie.
  assert.ok(reclamer(liberer(premier, "places_1"), "places_1", m));
  assert.equal(marquerFait(premier, "places_1").places_1.etat, "fait");
  // La forme courte de la spec ({ veille: ms }) se lit : déjà envoyé.
  assert.equal(reclamer({ veille: 123 }, "veille", m), null);
  assert.equal(lireMarqueurs({ veille: 123 }).veille.etat, "fait");
});

cas("une annonce faite sur Discord, puis un clic sur le site 5 s plus tard par un autre membre : l'annonce reste ; un poste choisi aussi", () => {
  const lu = Date.parse("2026-10-21T10:00:00+02:00");
  const discord = { player: "lina", pseudo: "Kaelis", classe: "Arcaniste", creneau: "mer" as const, ts: lu + 1000, retenu: false, userId: "u-lina" };
  const poste = { id: "x1", player: "lina", pseudo: "Kaelis", classe: "Arcaniste", slotId: "m1", charId: "c1", selected: false, ts: lu + 2000, userId: "u-lina" };
  const precedent: CompoState = { signups: [poste], slotMeta: {}, presences: [discord], instructions: "" };
  // Tom renvoie l'état qu'il a lu à `lu`, plus sa propre annonce.
  const tom = { player: "tom", pseudo: "Orin", classe: "Spadassin", creneau: "mer" as const, ts: lu + 5000, retenu: false };
  const envoi: CompoState = { signups: [], slotMeta: {}, presences: [tom], instructions: "" };
  const fusion = fusionnerLu(envoi, precedent, lu, lu + 3000, { id: "u-tom", username: "tom" });
  assert.deepEqual(fusion.presences.map((p) => p.pseudo).sort(), ["Kaelis", "Orin"]);
  assert.deepEqual(fusion.signups.map((x) => x.slotId), ["m1"]);
  // Sans `lu` (un vieux client) : rien ne change. Ligne inchangée depuis la lecture : rien non plus.
  assert.equal(fusionnerLu(envoi, precedent, null, lu + 3000), envoi);
  assert.equal(fusionnerLu(envoi, precedent, lu + 3000, lu + 3000), envoi);
  // Ce que l'appelant a posé puis retiré ne revient pas : « je m'annonce » puis « non » se défait.
  assert.deepEqual(fusionnerLu(envoi, precedent, lu, lu + 3000, { id: "u-lina", username: "lina" }).presences.map((p) => p.pseudo), ["Orin"]);
  // Le client a déplacé Kaelis sur un autre poste entre-temps : l'ancienne inscription ne revient pas.
  const deplace: CompoState = { ...envoi, signups: [{ ...poste, id: "x2", slotId: "m2" }] };
  assert.deepEqual(fusionnerLu(deplace, precedent, lu, lu + 3000, { id: "u-tom", username: "tom" }).signups.map((x) => x.slotId), ["m2"]);
});

cas("une annonce faite sur Discord porte player = User.username : la page dit « Je suis annoncé·e » à son auteur", () => {
  const etat: CompoState = { signups: [], slotMeta: {}, presences: [], instructions: "" };
  const kaelis = { id: "c1", name: "Kaelis", class: "ARCANISTE", isMain: true };
  const r = annoncer(etat, MERCREDI, [kaelis], [kaelis], COMPTE, Date.parse("2026-10-20T20:05:00+02:00"));
  assert.deepEqual(r.nouveaux, ["Kaelis"]);
  const p = etat.presences[0];
  assert.equal(p.player, COMPTE.username);   // meName de la page = session.user.name = User.username
  assert.equal(p.userId, COMPTE.id);
  assert.equal(p.classe, "Arcaniste");
  assert.ok(annoncesDeLaSeance(etat, MERCREDI).some((x) => x.player === "maxime")); // `jySuis`
  // Recoché, un retenu le reste, et garde son heure d'annonce.
  etat.presences[0].retenu = true;
  annoncer(etat, MERCREDI, [kaelis], [kaelis], COMPTE, Date.parse("2026-10-21T12:00:00+02:00"));
  assert.equal(etat.presences.length, 1);
  assert.equal(etat.presences[0].retenu, true);
  assert.equal(etat.presences[0].ts, Date.parse("2026-10-20T20:05:00+02:00"));
  // « Pas cette fois » le retire, et dit qu'il était retenu.
  const retirees = retirerAnnonces(etat, MERCREDI, [kaelis]);
  assert.equal(retirees[0].retenu, true);
  assert.equal(etat.presences.length, 0);
  assert.match(MSG.reponse("retire_retenu"), /Tu étais retenu : préviens le staff/);
});

cas("un compte RECRUE qui clique « Je viens » ou tape /recensement classe:Arcaniste reçoit le ⛔", () => {
  assert.equal(refusMembre({ role: "RECRUE", isActive: true }), "reserve_membres");
  assert.equal(refusMembre({ role: "GUARD", isActive: false }), "reserve_membres");
  assert.equal(refusMembre(null), "compte_non_lie");
  assert.equal(refusMembre({ role: "VETERAN", isActive: true, cacheLe: new Date() }), "compte_cache");
  assert.equal(refusMembre({ role: "GUARD", isActive: true }), null);
  assert.equal(MSG.reponse("reserve_membres"), "⛔ Les Chambres sont réservées aux membres de la guilde.");
  assert.equal(MSG.reponse("reserve_membres", { quoi: "Le recensement est réservé" }), "⛔ Le recensement est réservé aux membres de la guilde.");
  assert.match(MSG.reponse("compte_non_lie", { site: "https://genesis.example" }), /^🔗 .*https:\/\/genesis\.example/);
});

/* Le panneau de la veille, avec la compo de l'exemple du §8.3. */
const joueur = (pseudo: string, classe: string, slotId: string | null, retenu: boolean, chiffres: ChiffreFige[]): MSG.JoueurMsg =>
  ({ pseudo, classe, slotId, retenu, chiffres, cs: rolesDuParticipantTest(slotId, classe) });
function rolesDuParticipantTest(slotId: string | null, classe: string) {
  return (POSTES.find((p) => p.id === slotId) ?? POSTES.find((p) => p.classe === classe))!.cs;
}
const JOUEURS = [
  joueur("Brann", "Primat", "p1", true, [fige("offtank", 4_900_000, "4,9 M PV", "sceptre"), fige("tank", 7_900_000, "7,9 M PV", "poing")]),
  joueur("Ysolde", "Primat", "p2", true, [fige("offtank", 6_100_000, "6,1 M PV", "sceptre", true)]),
  joueur("Thorn", "Templier", "d1", true, [fige("dps", 180_000, "150 k – 210 k/s")]),
  joueur("Orin", "Spadassin", "d3", false, []),
  joueur("Nox", "Arcaniste", null, false, [fige("dps", 175_000, "175 k/s")]),
];
const panneau = (o: Partial<MSG.DonneesPanneau> = {}) => MSG.messagePanneau({
  cle: MERCREDI.cle, label: MERCREDI.label, etat: "ouvert", jourJ: false, texte: RAPPELS_CS_DEFAUT[0].texte,
  vars: { heure: "21 h", date: "mercredi 21 octobre" }, postes: POSTES, slotMeta: {}, joueurs: JOUEURS, places: 10,
  manque: "1 Envoûteur et 2 Arcanistes", chiffres: true, site: "https://genesis.example", maj: Date.parse("2026-10-20T18:42:00Z"), ...o,
});

cas("le panneau M1 : titre, effectif, postes, chiffres DÉCLARÉS, boutons sans état", () => {
  const m = panneau();
  const e = m.embeds[0];
  assert.equal(e.title, "🏰 Chambre Secrète — mercredi 21 octobre · 21 h");
  assert.match(e.description!, /^⏰ Demain à 21 h\. Annonce-toi dès maintenant/);
  assert.match(e.description!, /👥 5 \/ 10 annoncés · ✅ 3 retenus/);
  assert.match(e.description!, /⚠️ Il manque : 1 Envoûteur et 2 Arcanistes/);
  assert.equal(e.color, MSG.COULEUR.or);
  assert.deepEqual(e.fields!.map((f) => f.name), ["🛡️ Tanks", "⚔️ DPS physiques", "🔮 DPS magiques", "🙋 Annoncés sans poste"]);
  const tanks = e.fields![0].value;
  assert.match(tanks, /Tank croix — ✅ Brann ❤️ 4,9 M sceptre · 7,9 M poing/); // p1 : les deux PV, sceptre d'abord
  assert.match(tanks, /Tank croix jumeaux — ✅ Ysolde ❤️ 6,1 M 📏/);            // p2 : le sceptre (son chiffre attendu, l'arme se tait), à remesurer
  assert.match(e.fields![1].value, /Spadassin — Orin ❔/);                       // annoncé, non retenu, sans mesure
  assert.match(e.fields![1].value, /Arbalétrier — ▫️ personne/);
  assert.ok(!/Arcaniste \(option\)/.test(e.fields![1].value + e.fields![2].value)); // un poste optionnel vide est caché
  assert.match(e.fields![3].value, /Nox 💥 175 k\/s/);
  assert.ok(e.description!.includes(MSG.LEGENDE_CHIFFRES)); // des valeurs déclarées, dites comme telles
  assert.equal(e.footer!.text, "GENESIS · Chambres Secrètes · mis à jour");
  const b = m.components[0].components as { custom_id?: string; url?: string; style: number; label?: string }[];
  // Lot 4 : « 📍 Mes positions » rejoint le panneau (M1 du §8.3), entre « Pas cette fois » et le lien.
  assert.deepEqual(b.map((x) => x.custom_id ?? x.url), ["cs:viens:cs_2026-10-21_mer", "cs:absent:cs_2026-10-21_mer", "cs:pos:cs_2026-10-21_mer", "https://genesis.example/compositions?onglet=inscription"]);
  assert.deepEqual(b.map((x) => x.label), ["Je viens", "Pas cette fois", "Mes positions", "Choisir mon poste sur le site"]);
  assert.deepEqual(m.allowedMentions, { parse: [] });
  // Le jour J, « Demain » devient « Ce soir ».
  assert.match(panneau({ jourJ: true }).embeds[0].description!, /^⏰ Ce soir à 21 h\./);
});

cas("dans un salon visible de @everyone, le panneau part sans chiffres", () => {
  assert.equal(MSG.chiffresPermis({ degatsDiscord: true, salonFerme: false }), false);
  assert.equal(MSG.chiffresPermis({ degatsDiscord: false, salonFerme: true }), false);
  assert.equal(MSG.chiffresPermis({ degatsDiscord: true, salonFerme: true }), true);
  const sans = JSON.stringify(panneau({ chiffres: false }).embeds);
  for (const marque of ["❤️", "💥", "📏", "❔", "4,9 M", "déclarés"]) assert.ok(!sans.includes(marque), `« ${marque} » ne doit pas sortir`);
  assert.ok(sans.includes("✅ Brann"));
});

cas("le panneau fermé (clôture, annulation, remplacé) : suffixe, anthracite, boutons retirés", () => {
  for (const [etat, suffixe] of [["terminee", " · terminée"], ["annulee", " · annulée"], ["remplace", " · remplacé"]] as const) {
    const m = panneau({ etat });
    assert.ok(m.embeds[0].title!.endsWith(suffixe));
    assert.equal(m.embeds[0].color, MSG.COULEUR.anthracite);
    assert.deepEqual(m.components, []);
  }
  assert.equal(panneau({ manque: null }).embeds[0].color, MSG.COULEUR.vert);
});

cas("M3 de 20 h : @everyone ET les participants, en un message ; @everyone seul tant que la bascule est coupée", () => {
  const avant = mentionsDuRappel("everyone_participants", { nouveauxMessages: false, comptes: ["111111111111111111"], bloque: false });
  assert.deepEqual(avant, { everyone: true, users: [] });
  const calc = mentionsDuRappel("everyone_participants", { nouveauxMessages: true, comptes: ["111111111111111111", "222222222222222222", "111111111111111111", "pas-un-id"], bloque: false });
  assert.deepEqual(calc, { everyone: true, users: ["111111111111111111", "222222222222222222"] });
  const m = MSG.avecMentions(MSG.messageJour({
    dans: delaiDit(3_600_000), texte: RAPPELS_CS_DEFAUT[3].texte, vars: { heure: "21 h" }, source: "retenus",
    joueurs: JOUEURS.filter((j) => j.retenu), places: 10, manque: "1 Envoûteur", chiffres: true, site: "", maj: 0,
  }), calc, { liste: true, gras: ["Ysolde"] });
  assert.equal(m.content, "@everyone — ce soir : <@111111111111111111> <@222222222222222222> **Ysolde**");
  assert.deepEqual(m.allowedMentions, { parse: ["everyone"], users: ["111111111111111111", "222222222222222222"] });
  // Bascule coupée : « @everyone » seul, sans liste — le rappel d'avant, sous sa forme réécrite.
  assert.equal(MSG.avecMentions(m, avant, { liste: true, gras: ["Ysolde"] }).content, "@everyone");
  assert.equal(m.embeds[0].title, "⏰ La Chambre Secrète commence dans 1 h");
  assert.match(m.embeds[0].description!, /👥 3 \/ 10 retenus\n⚠️ Il manque : 1 Envoûteur/);
  assert.match(m.embeds[0].fields![0].value, /Brann ❤️ 4,9 M sceptre · 7,9 M poing/);
  assert.deepEqual(m.components, []); // sans adresse du site, pas de bouton lien (Discord le refuserait)
});

cas("avec un Guild Siege le samedi à 21 h, un seul @everyone part le samedi à 20 h", () => {
  const sam20h = paris("2026-10-24", "20:00");
  const plan = planDuTick({ actifs: { cs: true, gs: true }, cs: CS0, gs: GS_SAMEDI, now: sam20h });
  assert.deepEqual(ids(plan.dus), ["cs_2026-10-25_dim|veille", "gs_2026-10-24_sam2100|jour"]);
  // Les Chambres d'abord : leur panneau part avec @everyone et le marque dans le salon…
  const salon = "1498696982229811352";
  const marques = reclamer({}, "veille", { t: sam20h.getTime(), etat: "envoi", canal: salon, everyone: true });
  // … puis le Guild Siege, dans le même salon, la même minute : sans mention.
  const bloque = everyoneRecent([marques], salon, sam20h.getTime() + 20_000);
  assert.equal(bloque, true);
  assert.deepEqual(mentionsDuRappel("everyone", { nouveauxMessages: true, comptes: [], bloque }), { everyone: false, users: [] });
  // Un autre salon, ou 30 minutes plus tard : libre.
  assert.equal(everyoneRecent([marques], "999999999999999999", sam20h.getTime()), false);
  assert.equal(everyoneRecent([marques], salon, sam20h.getTime() + 30 * 60_000), false);
  // Inactif (le défaut, décision 2) : le Guild Siege n'envoie rien, même interrupteur allumé.
  assert.deepEqual(ids(planDuTick({ actifs: { cs: false, gs: true }, cs: CS0, gs: { ...GS_SAMEDI, actif: false }, now: sam20h }).dus), []);
});

cas("un compte avec deux Arcanistes reçoit le menu à choix multiple, et ses deux annonces se voient sur le site", () => {
  const persos = [
    { id: "c2", name: "Nox", class: "ARCANISTE", isMain: false },
    { id: "c1", name: "Kaelis", class: "ARCANISTE", isMain: true },
    { id: "c3", name: "Pyro", class: "CHANOINE", isMain: false },
  ];
  const etat: CompoState = { signups: [{ id: "s1", player: "maxime", pseudo: "Nox", classe: "Arcaniste", slotId: "m1" }], slotMeta: {}, presences: [], instructions: "" };
  const jouables = persosJouables(persos, POSTES, etat.signups);
  assert.deepEqual(jouables.map((c) => c.name), ["Nox", "Kaelis", "Pyro"]); // inscrit sur un poste, puis le principal
  const arcas = jouables.filter((c) => c.class === "ARCANISTE");
  const [rang] = MSG.menuPersos(MERCREDI.cle, arcas, new Set(["kaelis"]));
  const menu = rang.components[0] as { type: number; custom_id: string; max_values: number; min_values: number; options: { value: string; default?: boolean }[] };
  assert.equal(menu.custom_id, "cs:choix:cs_2026-10-21_mer");
  assert.equal(menu.min_values, 1);
  assert.equal(menu.max_values, 2);
  assert.deepEqual(menu.options.map((o) => [o.value, o.default]), [["Nox", false], ["Kaelis", true]]);
  annoncer(etat, MERCREDI, arcas, persos, COMPTE, Date.parse("2026-10-20T21:00:00+02:00"));
  assert.deepEqual(annoncesDeLaSeance(etat, MERCREDI).map((p) => p.pseudo).sort(), ["Kaelis", "Nox"]);
  // Le perso sans poste reçoit le menu des postes de sa classe.
  assert.equal(posteDuPseudo(etat.signups, "nox"), "m1");
  assert.equal(posteDuPseudo(etat.signups, "Kaelis"), null);
  const mp = MSG.menuPoste(MERCREDI.cle, "Kaelis", "Arcaniste", [{ id: "m1", label: "Arcaniste", inscrits: 1 }, { id: "m2", label: "Arcaniste", inscrits: 0 }])!;
  const sel = mp.components[0] as { custom_id: string; options: { value: string; description?: string }[] };
  assert.equal(sel.custom_id, "cs:poste:cs_2026-10-21_mer:Kaelis");
  assert.deepEqual(sel.options.map((o) => o.description), ["1 déjà inscrit", "personne encore"]);
  assert.deepEqual(MSG.lireId(sel.custom_id), { evenement: "cs", action: "poste", cle: "cs_2026-10-21_mer", reste: "Kaelis" });
  assert.equal(MSG.menuPoste(MERCREDI.cle, "x".repeat(90), "Arcaniste", [{ id: "m1", label: "Arcaniste", inscrits: 0 }]), null); // > 100 signes
});

cas("le poste choisi dans le menu Discord : un seul poste par perso, retiré par PSEUDO, daté, avec son compte", () => {
  const etat: CompoState = {
    signups: [
      { id: "a", player: "maxime", pseudo: "kaelis", classe: "Arcaniste", slotId: "m1", charId: "ancien-id", selected: true },
      { id: "b", player: "lina", pseudo: "Mira", classe: "Arcaniste", slotId: "m1" },
    ], slotMeta: {}, presences: [], instructions: "",
  };
  assert.equal(inscrireAuPoste(etat, { id: "c1", name: "Kaelis" }, { id: "m1", classe: "Arcaniste" }, COMPTE, 5), "deja");
  assert.equal(etat.signups[0].selected, true); // le même poste recoché garde son étoile
  assert.equal(inscrireAuPoste(etat, { id: "c1", name: "Kaelis" }, { id: "m2", classe: "Arcaniste" }, COMPTE, 7, () => "n1"), "inscrit");
  assert.deepEqual(etat.signups.map((x) => [x.id, x.pseudo, x.slotId]), [["b", "Mira", "m1"], ["n1", "Kaelis", "m2"]]);
  assert.deepEqual({ ...etat.signups[1], id: undefined }, { id: undefined, player: "maxime", pseudo: "Kaelis", classe: "Arcaniste", slotId: "m2", charId: "c1", selected: false, ts: 7, userId: "u-maxime" });
  // normaliserCompo garde `ts` (le correctif `lu` en dépend) ; une inscription d'avant vaut 0.
  const relu = normaliserCompo(etat);
  assert.deepEqual(relu.signups.map((x) => x.ts), [0, 7]);
});

cas("chaque message d'essai arrive dans le salon des essais, sans mention et sans bouton actif", () => {
  const env = { cs: "", csDebrief: "", gs: "", staff: "333333333333333333", defaut: "1498696982229811352" };
  assert.equal(MSG.resoudreSalons(CS0, PARAMETRES_GS_DEFAUT, env).essais, "333333333333333333");
  assert.equal(MSG.resoudreSalons({ salons: { ...CS0.salons, essais: "444444444444444444" } }, PARAMETRES_GS_DEFAUT, env).essais, "444444444444444444");
  assert.equal(MSG.resoudreSalons(CS0, PARAMETRES_GS_DEFAUT, { ...env, staff: "" }).essais, ""); // jamais le salon de la guilde
  assert.equal(MSG.resoudreSalons(CS0, PARAMETRES_GS_DEFAUT, env).chambres, "1498696982229811352");
  assert.equal(MSG.resoudreSalons(CS0, PARAMETRES_GS_DEFAUT, { ...env, cs: "555555555555555555" }).debriefs, "555555555555555555");
  const vrai = MSG.avecMentions(panneau(), { everyone: true, users: ["111111111111111111"] });
  assert.equal(vrai.content, "@everyone <@111111111111111111>");
  const essai = MSG.enEssai(vrai, "une note");
  assert.deepEqual(essai.allowedMentions, { parse: [] });
  assert.ok(!essai.content!.includes("@everyone"));   // dite, jamais faite
  assert.match(essai.content!, /Mention prévue : @​everyone et 1 participant\.\nune note$/);
  assert.ok(essai.embeds[0].title!.startsWith("🧪 ESSAI — 🏰 Chambre Secrète"));
  const b = essai.components[0].components as { custom_id?: string; url?: string }[];
  assert.deepEqual(b.map((x) => x.custom_id ?? x.url), ["cs:essai:0.0", "cs:essai:0.1", "cs:essai:0.2", "https://genesis.example/compositions?onglet=inscription"]);
  assert.equal(MSG.lireId("cs:essai:0.1")!.action, "essai");
});

cas("M2, M4 et M8 : « il manque du monde », la veille sans panneau, l'annulation", () => {
  const m2 = MSG.messagePlaces({ cle: MERCREDI.cle, heure: "21 h", texte: RAPPELS_CS_DEFAUT[1].texte, vars: {}, annonces: 7, places: 10, manque: "1 Envoûteur", lienPanneau: "https://discord.com/channels/1/2/3", site: "https://genesis.example", maj: 0 });
  assert.equal(m2.embeds[0].title, "⏰ Chambre Secrète ce soir à 21 h — il manque du monde");
  assert.equal(m2.embeds[0].description, "👥 7 / 10 annoncés\n⚠️ Il manque : 1 Envoûteur\nTu peux venir ? Un clic sur ✅ Je viens suffit, ici ou sur le panneau.");
  assert.deepEqual((m2.components[0].components as { label?: string }[]).map((x) => x.label), ["Je viens", "Voir le panneau"]);
  const m4 = MSG.messageVeille({ cle: MERCREDI.cle, heure: "21 h", jourJ: false, texte: CS0.textes.sansPanneau, vars: {}, annonces: 4, places: 10, manque: null, site: "", maj: 0 });
  assert.equal(m4.embeds[0].title, "⏰ Chambre Secrète demain à 21 h");
  assert.match(m4.embeds[0].description!, /👥 4 \/ 10 annoncés · ✅ Au complet$/);
  const m8 = MSG.messageAnnulation({ label: MERCREDI.label, dateLongue: "mercredi 21 octobre", jourMeme: true, motif: "maintenance du serveur", prochaine: "dimanche 25 octobre · 21 h", maj: 0 });
  assert.equal(m8.embeds[0].title, "🚫 Chambre Secrète de ce soir annulée");
  assert.equal(m8.embeds[0].description, "📅 mercredi 21 octobre · 21 h — maintenance du serveur\nLa prochaine : dimanche 25 octobre · 21 h.");
  assert.equal(MSG.messageAnnulation({ label: "x", dateLongue: "mercredi 21 octobre", jourMeme: false, motif: null, prochaine: "y", maj: 0 }).embeds[0].title, "🚫 Chambre Secrète du mercredi 21 octobre annulée");
});

/* Contre-vérification du lot 3 : ce qui ne se vérifiait que dans le code d'entrées/sorties du bot. */

cas("séance annulée : rien ne part ; M8 part si le paramétrage le prévoit, @everyone le jour même seulement", () => {
  // Le refus lu sous le verrou, au moment de réclamer un rappel.
  assert.equal(refusEnvoi({ annulee: true, clotureAt: null }), "annulee");
  assert.equal(refusEnvoi({ annulee: false, clotureAt: new Date() }), "cloturee");
  assert.equal(refusEnvoi({ annulee: false, clotureAt: null }), null);
  const base = { annulee: true, annoncerAnnulation: true, nouveauxMessages: true, rappelsActifs: true, seance: MERCREDI };
  assert.deepEqual(annonceAnnulation({ ...base, now: paris("2026-10-21", "15:00") }), { envoyer: true, jourMeme: true });
  assert.deepEqual(annonceAnnulation({ ...base, now: paris("2026-10-20", "22:00") }), { envoyer: true, jourMeme: false });
  // Coupée dans le paramétrage, bascule coupée, interrupteur général coupé, rétablie entre-temps : rien.
  for (const o of [{ annoncerAnnulation: false }, { nouveauxMessages: false }, { rappelsActifs: false }, { annulee: false }]) {
    assert.equal(annonceAnnulation({ ...base, ...o, now: paris("2026-10-21", "15:00") }).envoyer, false, JSON.stringify(o));
  }
  // Une demande restée en file jusqu'au lendemain matin : séance passée, rien.
  assert.equal(annonceAnnulation({ ...base, now: paris("2026-10-22", "04:00") }).envoyer, false);
});

cas("« Republier » : la séance qu'on prépare ou celle qui se joue — jamais une passée ni une lointaine", () => {
  assert.equal(panneauPublie(MERCREDI, paris("2026-10-20", "15:00")), null);
  assert.equal(panneauPublie(MERCREDI, paris("2026-10-21", "22:00")), null);                       // elle se joue
  assert.match(panneauPublie(MERCREDI, paris("2026-10-22", "04:00")) ?? "", /passée/);              // 7 h après
  assert.match(panneauPublie(seanceCS("2026-11-04", "mer"), paris("2026-10-20", "15:00")) ?? "", /prochaine/);
});

cas("« Je viens » : la réponse porte « ❌ Pas cette fois » (que M2 et M4 n'ont pas), et dit qu'un retenu décoché laisse un trou", () => {
  const menus = Array.from({ length: 6 }, (_, k) => MSG.menuPoste(MERCREDI.cle, `Perso${k}`, "Arcaniste", [{ id: "m1", label: "Arcaniste", inscrits: 0 }])!);
  const c = MSG.composantsAnnonce(MERCREDI.cle, menus);
  assert.equal(c.length, 5); // 4 menus et le bouton : la limite de Discord
  const b = c[4].components[0] as { custom_id: string; label: string };
  assert.deepEqual([b.custom_id, b.label], ["cs:absent:cs_2026-10-21_mer", "Pas cette fois"]);
  assert.equal(MSG.avecMenu(c).length, 4);
  assert.equal(MSG.avecMenu([c[4]]).length, 0); // le bouton seul ne fait pas dire « choisis le poste des autres »
  const etat: CompoState = { signups: [], slotMeta: {}, presences: [], instructions: "" };
  const kaelis = { id: "c1", name: "Kaelis", class: "ARCANISTE" }, nox = { id: "c2", name: "Nox", class: "ARCANISTE" };
  annoncer(etat, MERCREDI, [kaelis], [kaelis, nox], COMPTE, Date.parse("2026-10-20T20:05:00+02:00"));
  etat.presences[0].retenu = true;
  const r = annoncer(etat, MERCREDI, [nox], [kaelis, nox], COMPTE, Date.parse("2026-10-20T21:00:00+02:00"));
  assert.deepEqual([r.retires, r.retenusRetires], [["Kaelis"], ["Kaelis"]]);
  assert.equal(MSG.reponse("retenu_decoche", { noms: r.retenusRetires }), "⚠️ **Kaelis** était retenu : préviens le staff pour qu'on le remplace.");
});

cas("le titre de 20 h dit « dans 1 h » depuis l'heure du rappel : rattrapé à 20 h 04, ou en essai un mardi", () => {
  const r = RAPPELS_CS_DEFAUT.find((x) => x.id === "jour")!;
  assert.equal(delaiDit(MERCREDI.debut.getTime() - instantRappel(r, MERCREDI)!.getTime()), "dans 1 h");
});

cas("les bornes de Discord : 1 024 par champ, 6 000 au total, coupé avec « … (voir le site) »", () => {
  const long = Array.from({ length: 80 }, (_, i) => `ligne ${i} ${"x".repeat(30)}`).join("\n");
  const c = MSG.couper(long, 1024);
  assert.ok(c.length <= 1024);
  assert.ok(c.endsWith("… (voir le site)"));
  const e = MSG.borner({ title: "t", description: "d", fields: Array.from({ length: 8 }, (_, i) => ({ name: `f${i}`, value: long })) });
  assert.ok(MSG.poidsEmbed(e) <= 6000);
  assert.ok(e.fields!.every((f) => f.value.length <= 1024));
  // Un nom de perso n'entre pas dans le Markdown.
  assert.equal(MSG.echapper("Ki_ra*"), "Ki\\_ra\\*");
});

cas("/recensement : mes chiffres, rôle par rôle, déclarés et datés — et le DPS d'un Primat est magique", () => {
  const m = MSG.messageMesChiffres([{ name: "Brann", classe: "Primat", par: {
    tank: { role: "tank", valeur: 9_400_000, texte: "9,4 M PV", arme: "poing", detail: null, mesureLe: Date.parse("2026-10-12T12:00:00+02:00"), aRemesurer: false, complet: true, poudres: [], buffs: [], avec: [] },
    offtank: { role: "offtank", valeur: 6_800_000, texte: "6,8 M PV", arme: "sceptre", detail: null, mesureLe: Date.parse("2026-09-02T12:00:00+02:00"), aRemesurer: true, complet: true, poudres: [], buffs: [], avec: [] },
  } }], "");
  assert.equal(m.embeds[0].fields![0].value, "🛡️ Tank (poing) ❤️ 9,4 M · mesuré le 12/10\n🛡️ Off tank (sceptre) ❤️ 6,8 M · 📏 mesuré le 02/09, à remesurer\n🔮 DPS ❔ sans mesure");
  assert.ok(m.embeds[0].title!.startsWith("📊 "));
  assert.equal(MSG.nomRole("dps", "Templier"), "⚔️ DPS");
  assert.equal(MSG.nomRole("tank", "Templier"), "🛡️ Tank (doloire)");
});


/* ══ Lot 4 — la répartition des phases, le récap et « Mes positions » (§4.3, §4.4, §4.6, M5, M10) ══
   Avec la compo type de 10 (§14, lot 4) : deux Primats (p1, p2), une fois chacune des classes
   physiques, deux Arcanistes et l'Envoûteur. */
console.log("\nLot 4 — la répartition des phases, le récap et « Mes positions »");

const rolesDe = (slotId: string) => POSTES.find((p) => p.id === slotId)!.cs;
const jr = (pseudo: string, classe: string, slotId: string, chiffres: ChiffreFige[] = [], retenu = true): MSG.JoueurRecap =>
  ({ pseudo, classe, slotId, retenu, chiffres, cs: rolesDe(slotId), roles: rolesDe(slotId) });
const COMPO_TYPE: MSG.JoueurRecap[] = [
  jr("Brann", "Primat", "p1", [fige("offtank", 4_900_000, "4,9 M PV", "sceptre"), fige("tank", 7_900_000, "7,9 M PV", "poing")]),
  jr("Ysolde", "Primat", "p2", [fige("offtank", 6_100_000, "6,1 M PV", "sceptre")]),
  jr("Thorn", "Templier", "d1", [fige("dps", 180_000, "150 k – 210 k/s")]),
  jr("Lina", "Sylphide", "d2", [fige("dps", 165_000, "140 k – 190 k/s")]),
  jr("Orin", "Spadassin", "d3", [fige("dps", 170_000, "170 k/s")]),
  jr("Sol", "Arbaletrier", "d4", [fige("dps", 175_000, "175 k/s")]),
  jr("Pyra", "Chanoine", "d5", [fige("dps", 140_000, "120 k – 160 k/s")]),
  jr("Mira", "Arcaniste", "m1", [fige("dps", 190_000, "190 k/s")]),
  jr("Kaelis", "Arcaniste", "m2", [fige("dps", 182_000, "182 k/s")]),
  jr("Sel", "Envouteur", "m4", []),
];
const SALLES = CS0.salles;
const ctxR = (joueurs = COMPO_TYPE) => ({ joueurs, salles: SALLES });
const vide = (): Repartition => ({ salles: {}, jumeaux: {}, demandes: [] });
const classesDe = (l: { classe: string }[]) => l.map((j) => j.classe).sort();

cas("golems à 5 contre 5, avec un Primat et un Arcaniste de chaque côté (et un tank chacun)", () => {
  const g = equipesGolems(COMPO_TYPE, vide());
  assert.equal(g.depuis, "calcul");
  assert.deepEqual([g.gauche.length, g.droite.length], [5, 5]);
  for (const cote of [g.gauche, g.droite]) {
    assert.equal(cote.filter((j) => j.classe === "Primat").length, 1);
    assert.equal(cote.filter((j) => j.classe === "Arcaniste").length, 1);
    assert.equal(cote.filter((j) => j.roles.golems === "tank").length, 1);
  }
  // Des équipes des jumeaux déjà équilibrées sont gardées telles quelles : Verte à gauche.
  const r = vide();
  const places: [string, Place][] = [["brann", "vert_tank"], ["mira", "vert_mag"], ["thorn", "vert_phy"], ["lina", "vert_phy"], ["pyra", "vert_phy"],
    ["ysolde", "rouge_tank"], ["kaelis", "rouge_mag"], ["sel", "rouge_mag"], ["orin", "rouge_phy"], ["sol", "rouge_phy"]];
  for (const [k, p] of places) r.jumeaux[k] = p;
  const gj = equipesGolems(COMPO_TYPE, r);
  assert.equal(gj.depuis, "jumeaux");
  assert.deepEqual(gj.gauche.map((j) => j.pseudo), ["Brann", "Thorn", "Lina", "Pyra", "Mira"]);
  // Deux tanks du même côté : déséquilibré, on recalcule.
  r.jumeaux.ysolde = "vert_mag"; r.jumeaux.brann = "vert_tank";
  assert.equal(equipesGolems(COMPO_TYPE, { ...r, jumeaux: { ...r.jumeaux, ysolde: "vert_tank" } }).depuis, "calcul");
});

cas("rotations de l'araignée sans doublon de classe ; un troisième Arcaniste (m3) passe en réserve ; p1 en est exclu, p2 en fait partie", () => {
  const rot = rotationsAraignee(COMPO_TYPE);
  for (const r of [rot.r1, rot.r2]) assert.equal(new Set(r.map((j) => j.classe)).size, r.length, "deux joueurs de la même classe dans une rotation");
  assert.deepEqual(rot.reserve, []);
  assert.equal([...rot.r1, ...rot.r2].filter((j) => j.classe === "Arcaniste").length, 2);
  assert.ok(rot.r1.some((j) => j.pseudo === "Mira") && rot.r2.some((j) => j.pseudo === "Kaelis")); // un par rotation
  assert.ok(![...rot.r1, ...rot.r2].some((j) => j.pseudo === "Brann")); // p1 tanke l'araignée
  assert.ok([...rot.r1, ...rot.r2].some((j) => j.pseudo === "Ysolde")); // p2 la frappe (§2.3)
  assert.equal(rot.r1.length + rot.r2.length, 9);
  const avecNox = [...COMPO_TYPE, jr("Nox", "Arcaniste", "m3", [fige("dps", 175_000, "175 k/s")])];
  const rot2 = rotationsAraignee(avecNox);
  assert.deepEqual(rot2.reserve.map((j) => j.pseudo), ["Nox"]);
});

cas("les salles : prendre, libérer d'un second clic, ne pas voler ; le staff écrase ; compléter va au moins chargé", () => {
  const r = vide();
  assert.deepEqual(basculerSalle(r, ctxR(), "s3", "kaelis", false), { ok: true, message: "Tu prends Salle 3." });
  assert.deepEqual(basculerSalle(r, ctxR(), "s4", "kaelis", false), { ok: true, message: "Tu prends Salle 4." }); // plusieurs possibles
  assert.deepEqual(basculerSalle(r, ctxR(), "s3", "mira", false), { ok: false, status: 409, message: "Salle 3 est déjà prise par Kaelis." });
  assert.deepEqual(basculerSalle(r, ctxR(), "s3", "mira", true), { ok: true, message: "Salle 3 → Mira." });
  assert.deepEqual(basculerSalle(r, ctxR(), "s4", "kaelis", false), { ok: true, message: "Tu libères Salle 4." });
  assert.equal(basculerSalle(r, ctxR(), "s3", "zed", false).ok, false); // pas un participant
  assert.equal((basculerSalle(r, ctxR(), "s99", "kaelis", false) as { status: number }).status, 400);
  // Compléter : chaque salle vide au moins chargé ; à égalité, le premier annoncé (Brann).
  const r2 = vide();
  r2.salles.s1 = "brann";
  assert.equal(remplirAuto(r2, ctxR()), 11);
  const charge = (k: string) => Object.values(r2.salles).filter((x) => x === k).length;
  assert.equal(r2.salles.s2, "ysolde"); // Brann en tient déjà une
  assert.deepEqual(COMPO_TYPE.map((j) => charge(j.pseudo.toLowerCase())), [2, 2, 1, 1, 1, 1, 1, 1, 1, 1]);
  assert.equal(remplirAuto(r2, ctxR()), 0);
});

cas("les jumeaux : 1 tank et 4 DPS par équipe, le poste décide du rôle, le type de DPS suit la classe", () => {
  const r = vide();
  const [brann, ysolde, , , , , , mira] = COMPO_TYPE;
  assert.equal(peutJouer(brann, "tank"), true);
  assert.equal(peutJouer(mira, "phy"), false); // Arcaniste : magique
  assert.equal(peutJouer(jr("Pri", "Primat", "d1"), "mag"), true); // un Primat DPS est rangé en magique (§2.3)
  assert.deepEqual(choisirJumeau(r, brann, "vert_tank"), { ok: true, message: "Tu es dans l'équipe Verte — Tank." });
  assert.deepEqual(choisirJumeau(r, ysolde, "vert_tank"), { ok: false, status: 409, message: "L'équipe Verte a déjà son tank." });
  assert.equal((choisirJumeau(r, mira, "vert_phy") as { status: number }).status, 400);
  for (const j of COMPO_TYPE.slice(2, 6)) assert.equal(choisirJumeau(r, j, `vert_${typeDps(j.classe)}` as Place).ok, true);
  assert.deepEqual(choisirJumeau(r, mira, "vert_mag"), { ok: false, status: 409, message: "L'équipe Verte a déjà ses 4 DPS." });
  assert.deepEqual(choisirJumeau(r, brann, "vert_tank"), { ok: true, message: "Tu quittes l'équipe Verte — Tank." }); // second clic
  // Le staff : le plafond propose l'échange ; l'échange vérifie les deux rôles.
  r.jumeaux.brann = "vert_tank";
  assert.match((placerJumeauStaff(r, ctxR(), ysolde, "vert_tank") as { message: string }).message, /utilise plutôt « Échanger avec… »/);
  r.jumeaux.ysolde = "rouge_tank";
  assert.deepEqual(placerJumeauStaff(r, ctxR(), ysolde, "ech:Brann"), { ok: true, message: "Ysolde et Brann échangent leurs places." });
  assert.deepEqual([r.jumeaux.ysolde, r.jumeaux.brann], ["vert_tank", "rouge_tank"]);
  assert.equal(placerJumeauStaff(r, ctxR(), mira, "ech:Brann").ok, false); // Mira ne tient pas « Tank »
  assert.deepEqual(placerJumeauStaff(r, ctxR(), ysolde, "retirer"), { ok: true, message: "Ysolde sort de son équipe." });
});

cas("le nettoyage : un non-participant perd ses places, un poste changé perd la place qu'il ne tient plus, une salle retirée disparaît", () => {
  const r = lireRepartition({ salles: { s1: "Brann", s2: "Zed", zz9: "mira", "S3": "mira" }, jumeaux: { brann: "vert_tank", mira: "rouge_phy", zed: "vert_mag", kaelis: "pas_une_place" }, demandes: [{ x: 1 }] });
  assert.deepEqual(r.salles, { s1: "brann", s2: "zed", zz9: "mira" }); // clé de salle illisible écartée, pseudo en minuscules
  const n = nettoyer(r, COMPO_TYPE, SALLES);
  assert.deepEqual(n.salles, { s1: "brann" });
  assert.deepEqual(n.jumeaux, { brann: "vert_tank" }); // Mira ne tient pas « DPS physique », Zed n'est pas là
  // Lot 10 : une demande illisible disparaît à la lecture, sans casser la répartition (§4.5).
  assert.deepEqual(n.demandes, []);
  assert.deepEqual(lireRepartition("abîmé"), { salles: {}, jumeaux: {}, demandes: [] });
});

cas("un membre ne peut pas placer le perso d'un autre (403) ; « compléter » et « échanger » sont au staff", () => {
  const ctx = (staff: boolean, miens: string[]) => ({ ...ctxR(), staff, miens });
  const r = vide();
  assert.deepEqual(appliquerAction(r, { action: "salle", salle: "s1", pseudo: "Mira" }, ctx(false, ["kaelis"])),
    { ok: false, status: 403, message: "Tu ne places que ton propre perso : pour un autre, passe par le staff." });
  assert.equal((appliquerAction(r, { action: "auto" }, ctx(false, ["kaelis"])) as { status: number }).status, 403);
  assert.equal((appliquerAction(r, { action: "jumeau_echanger", pseudo: "Mira", avec: "Kaelis" }, ctx(false, ["kaelis"])) as { status: number }).status, 403);
  assert.equal((appliquerAction(r, { action: "salle", salle: "s1", pseudo: "Kaelis", force: true }, ctx(false, ["kaelis"])) as { status: number }).status, 403);
  // Sans pseudo : LE perso de l'appelant ; aucun, il s'annonce d'abord ; deux, il précise.
  assert.deepEqual(appliquerAction(r, { action: "salle", salle: "s1" }, ctx(false, ["kaelis"])), { ok: true, message: "Tu prends Salle 1." });
  assert.match((appliquerAction(r, { action: "salle", salle: "s2" }, ctx(false, [])) as { message: string }).message, /annonce-toi d'abord/);
  assert.equal((appliquerAction(r, { action: "salle", salle: "s2" }, ctx(false, ["kaelis", "mira"])) as { status: number }).status, 400);
  // L'occupant libère, un autre membre non ; le staff place par-dessus.
  assert.equal((appliquerAction(r, { action: "liberer", salle: "s1" }, ctx(false, ["mira"])) as { status: number }).status, 403);
  assert.deepEqual(appliquerAction(r, { action: "salle", salle: "s1", pseudo: "Mira", force: true }, ctx(true, [])), { ok: true, message: "Salle 1 → Mira." });
  assert.deepEqual(appliquerAction(r, { action: "salles", salles: ["s5", "s1", "s6"], pseudo: "Kaelis" }, ctx(false, ["kaelis"])),
    { ok: true, message: "Tes salles : Salles 5 + 6. Salle 1 vient d'être prise par Mira." });
  // Le corps de la route, relu sans confiance ; les gestes du lot 10 sont refusés clairement.
  assert.deepEqual(lireAction({ action: "jumeau", place: "rouge_mag", pseudo: "Kaelis" }), { ok: true, action: { action: "jumeau", place: "rouge_mag", pseudo: "Kaelis" } });
  // Les gestes du lot 10 se lisent (ils étaient refusés « au lot 10 » jusque-là).
  assert.deepEqual(lireAction({ action: "equilibrer" }), { ok: true, action: { action: "equilibrer" } });
  assert.equal(lireAction({ action: "salle", salle: "../x" }).ok, false);
  assert.equal(lireAction({ action: "jumeau", place: "bleu_tank" }).ok, false);
  assert.equal(lireAction(null).ok, false);
});

cas("deux clics simultanés sur la même salle : un seul l'obtient (verrou de version de la séance)", async () => {
  // Une base en mémoire qui se comporte comme Prisma sur les trois appels de `majSeance` : la
  // lecture (upsert), l'écriture conditionnée par la version (updateMany), la relecture.
  let row = { id: "x", cle: MERCREDI.cle, version: 0, repartition: null as unknown, annulee: false, clotureAt: null as Date | null };
  const db = {
    seanceGuilde: {
      upsert: async () => { await new Promise((r) => setTimeout(r, 1)); return structuredClone(row); },
      updateMany: async ({ where, data }: { where: { version: number }; data: { repartition?: unknown } }) => {
        if (where.version !== row.version) return { count: 0 };
        row = { ...row, repartition: data.repartition ?? row.repartition, version: row.version + 1 };
        return { count: 1 };
      },
      findUniqueOrThrow: async () => structuredClone(row),
    },
    $transaction: async <T>(f: (tx: unknown) => Promise<T>) => f(db),
  };
  const ctx = (miens: string[]) => ({ ...ctxR(), staff: false, miens });
  const [a, b] = await Promise.all([
    modifierRepartition(db as never, MERCREDI, { action: "salle", salle: "s3" }, ctx(["kaelis"])),
    modifierRepartition(db as never, MERCREDI, { action: "salle", salle: "s3" }, ctx(["mira"])),
  ]);
  assert.equal([a, b].filter((x) => x.ok).length, 1);
  const perdant = [a, b].find((x) => !x.ok) as { status: number; message: string };
  assert.equal(perdant.status, 409);
  assert.match(perdant.message, /^Salle 3 est déjà prise par (Kaelis|Mira)\.$/);
  assert.equal(row.version, 1);
  // Une séance clôturée ne bouge plus.
  row.clotureAt = new Date();
  assert.deepEqual(await modifierRepartition(db as never, MERCREDI, { action: "salle", salle: "s4" }, ctx(["kaelis"])),
    { ok: false, status: 409, message: "Cette séance est clôturée : sa répartition ne bouge plus." });
});

cas("la vue des jumeaux : membres par rôle, ce qui manque, totaux DÉCLARÉS, écart entre les équipes (or > 10 %, crimson > 20 %)", () => {
  const r = vide();
  Object.assign(r.jumeaux, { brann: "vert_tank", mira: "vert_mag", thorn: "vert_phy", ysolde: "rouge_tank", kaelis: "rouge_mag" });
  const v = vueRepartition(r, ctxR());
  assert.deepEqual(v.jumeaux.vert, { tank: ["Brann"], mag: ["Mira"], phy: ["Thorn"], totalDps: 370_000, pvTank: 4_900_000, manque: ["2 DPS"] });
  assert.deepEqual(v.jumeaux.rouge.manque, ["3 DPS"]);
  assert.equal(v.jumeaux.rouge.pvTank, 6_100_000); // le sceptre de p2
  assert.equal(v.ecartJumeaux, Math.round((370 - 182) / 370 * 100));
  assert.deepEqual([niveauEcart(5), niveauEcart(15), niveauEcart(25), niveauEcart(null)], ["ok", "moyen", "fort", null]);
  assert.equal(ecartJumeaux(500_000, 0), null); // une équipe vide ne fait pas un écart de 100 %
  assert.deepEqual(v.nonPlaces, ["Lina", "Orin", "Sol", "Pyra", "Sel"]);
  assert.equal(v.couvertes, 0);
  assert.equal(v.salles.length, 12);
});

cas("les salles d'un joueur en une étiquette : « Salles 3 + 4 », « Asuras 11 + 12 »", () => {
  assert.equal(regrouperSalles(["Salle 3", "Salle 4"]), "Salles 3 + 4");
  assert.equal(regrouperSalles(["Asura 11 (arbre)", "Asura 12 (arbre)"]), "Asuras 11 + 12");
  assert.equal(regrouperSalles(["Asura 11 (arbre)"]), "Asura 11 (arbre)");
  assert.equal(regrouperSalles(["Salle 10", "Asura 11 (arbre)"]), "Salle 10 + Asura 11 (arbre)");
  // Deux sortes de salles chez le même joueur : chaque sorte reste groupée (relevé du lot 4 sur :3040).
  assert.equal(regrouperSalles(["Salle 6", "Salle 10", "Asura 11 (arbre)", "Asura 12 (arbre)"]), "Salles 6 + 10 + Asuras 11 + 12");
  assert.equal(regrouperSalles(["Salle 6", "Salle 10", "Asura 11 (arbre)"]), "Salles 6 + 10 + Asura 11 (arbre)");
  assert.equal(regrouperSalles(["Salle 2", "Toit", "Salle 4"]), "Salles 2 + 4 + Toit");
  assert.equal(regrouperSalles([]), "");
  assert.equal(singulier("Golems"), "Golem");
  assert.equal(resumeClasses([{ j: COMPO_TYPE[0], tank: true }, { j: COMPO_TYPE[7], tank: false }, { j: COMPO_TYPE[8], tank: false }]), "1 Primat tank · 2 Arcanistes");
});

/* Le récap de la soirée : la compo type, ses salles et ses jumeaux. */
const REP_SOIREE = (): Repartition => {
  const r = vide();
  Object.assign(r.salles, { s1: "brann", s2: "thorn", s3: "kaelis", s4: "kaelis", s5: "mira", a11: "sol", a12: "sol" });
  Object.assign(r.jumeaux, { brann: "vert_tank", mira: "vert_mag", thorn: "vert_phy", lina: "vert_phy", pyra: "vert_phy",
    ysolde: "rouge_tank", kaelis: "rouge_mag", sel: "rouge_mag", orin: "rouge_phy", sol: "rouge_phy" });
  return r;
};
const RECAP = () => recap(COMPO_TYPE, REP_SOIREE(), CS0, 10);

cas("le récap (§4.6) : trois colonnes par rôle tenu, salles regroupées par joueur, jumeaux et golems tank en tête, rotations, consignes du paramétrage", () => {
  const rc = RECAP();
  assert.deepEqual(rc.tanks.map((j) => j.pseudo), ["Brann", "Ysolde"]);
  assert.deepEqual(rc.mag.map((j) => j.pseudo), ["Mira", "Kaelis", "Sel"]);
  assert.equal(rc.phy.length, 5);
  assert.deepEqual(rc.phase1.map((x) => [x.libelle, x.j.pseudo]), [["Salle 1", "Brann"], ["Salle 2", "Thorn"], ["Salles 3 + 4", "Kaelis"], ["Salle 5", "Mira"], ["Asuras 11 + 12", "Sol"]]);
  assert.deepEqual(rc.sansJoueur, ["Salle 6", "Salle 7", "Salle 8", "Salle 9", "Salle 10"]);
  assert.equal(rc.couvertes, 7);
  assert.deepEqual(rc.jumeaux.rouge[0], { j: COMPO_TYPE[1], tank: true });
  assert.equal(rc.golems.depuis, "jumeaux");
  assert.deepEqual(rc.golems.gauche.map((m) => [m.j.pseudo, m.tank]), [["Brann", true], ["Thorn", false], ["Lina", false], ["Pyra", false], ["Mira", false]]);
  assert.equal(rc.golems.resumeGauche, "1 Primat tank · 1 Templier · 1 Sylphide · 1 Chanoine · 1 Arcaniste");
  assert.equal(rc.golems.consigne, CS0.consignes.golems);
  assert.deepEqual(rc.araignee.consignes, CS0.consignes.araignee);
  assert.equal(rc.pied, "bonne Chambre à tous !");
  // Ce que le staff règle dans le paramétrage part tel quel (décision 5).
  const autre = recap(COMPO_TYPE, REP_SOIREE(), { ...CS0, noms: { golems: "Trolls" }, consignes: { golems: "Restez groupés.", araignee: ["Un seul debuff."] }, textes: { ...CS0.textes, piedRecap: "courage !" } }, 10);
  assert.deepEqual([autre.golems.nom, autre.golems.consigne, autre.araignee.consignes, autre.pied], ["Trolls", "Restez groupés.", ["Un seul debuff."], "courage !"]);
  // Le récap en noms (ce que la route 4 envoie au navigateur) : des pseudos, rien d'autre.
  const noms = recapEnNoms(rc);
  assert.deepEqual(noms.tanks, ["Brann", "Ysolde"]);
  assert.ok(!JSON.stringify(noms).includes("chiffres") && !JSON.stringify(noms).includes("slotId"));
});

cas("M5 — le récap Discord : titre, effectif, colonnes, phases, consignes, pied, 📍 et la mention des participants", () => {
  const m = MSG.messageRecap({
    cle: MERCREDI.cle, jour: "mercredi 21 octobre", etat: "ouvert", recap: RECAP(), source: "retenus",
    texte: CS0.rappels.find((r) => r.type === "recap")!.texte, vars: {}, chiffres: true, positions: true, site: "https://genesis.example", maj: 0,
  });
  const e = m.embeds[0];
  assert.equal(e.title, "📋 Chambre Secrète — mercredi 21 octobre · récap");
  assert.match(e.description!, /^👥 10 \/ 10 joueurs · lis bien ton rôle à chaque phase\./);
  assert.ok(e.description!.includes(MSG.LEGENDE_CHIFFRES));
  assert.deepEqual(e.fields!.map((f) => f.name), [
    "🛡️ Tanks", "🔮 DPS magiques", "⚔️ DPS physiques", "🌳 Phase 1 — Asuras (salles)", "👯 Phase 2 — 🟩 Équipe Verte", "👯 Phase 2 — 🟥 Équipe Rouge", "​",
    "🗿 Phase 3 — Golem ⬅️ gauche", "🗿 Phase 3 — Golem ➡️ droite", "​", "🕷️ Araignée — 1️⃣ Rotation 1", "🕷️ Araignée — 2️⃣ Rotation 2", "​",
  ]);
  assert.deepEqual(e.fields!.map((f) => !!f.inline), [true, true, true, false, true, true, false, true, true, false, true, true, false]);
  assert.match(e.fields![0].value, /Brann ❤️ 4,9 M sceptre · 7,9 M poing/);
  assert.match(e.fields![3].value, /\*\*Salles 3 \+ 4\*\* → .*Kaelis/);
  assert.match(e.fields![3].value, /⚠️ Sans joueur : Salle 6, Salle 7, Salle 8, Salle 9, Salle 10/);
  assert.match(e.fields![5].value, /^.*Ysolde — tank\n/);
  assert.match(e.fields![7].value, /\*1 Primat tank · 1 Templier · 1 Sylphide · 1 Chanoine · 1 Arcaniste\*$/);
  assert.equal(e.fields![9].value, `⚠️ ${CS0.consignes.golems}`);
  assert.equal(e.fields![12].value, `⚠️ Araignée : ${phraseConsignes(CS0.consignes.araignee)}`);
  // La ligne du §8.3 (M5) : minuscules après « : » et « · », capitales d'un mot en capitales gardées.
  assert.equal(e.fields![12].value, "⚠️ Araignée : jamais deux debuffs de la même classe en même temps · tout le monde collé à l'araignée, même à distance · cercle DANGER : Échap tout de suite (elle renvoie les dégâts).");
  assert.equal(phraseConsignes(["Restez groupés !", " ", "Etc…"]), "restez groupés ! · etc…");
  assert.equal(phraseConsignes([]), "");
  assert.equal(e.footer!.text, "GENESIS · Chambres Secrètes · bonne Chambre à tous !");
  assert.equal(e.color, MSG.COULEUR.crimson);
  assert.ok(MSG.poidsEmbed(e) <= 6000 && e.fields!.length <= 25);
  const b = m.components[0].components as { custom_id?: string; url?: string; label?: string }[];
  assert.deepEqual(b.map((x) => x.custom_id ?? x.url), ["cs:pos:cs_2026-10-21_mer", "https://genesis.example/compositions?onglet=repartition"]);
  // « 📋 Récap de ce soir — @… » : les participants qui ont un compte, les autres en gras, sans mention.
  const calc = mentionsDuRappel("participants", { nouveauxMessages: true, comptes: ["111111111111111111"], bloque: false });
  const avec = MSG.avecMentions(m, calc, { tete: "📋 Récap de ce soir", gras: ["Sel"] });
  assert.equal(avec.content, "📋 Récap de ce soir — <@111111111111111111> **Sel**");
  assert.deepEqual(avec.allowedMentions, { parse: [], users: ["111111111111111111"] });
  // Sans personne à mentionner (/chambre recap, « Publier le récap ») : pas de ligne du tout.
  assert.equal(MSG.avecMentions(m, { everyone: false, users: [] }, { tete: "📋 Récap de ce soir" }).content, undefined);
  // Un salon ouvert aux visiteurs : aucun chiffre. Fermé à la clôture : anthracite, sans boutons.
  const sans = JSON.stringify(MSG.messageRecap({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", recap: RECAP(), source: "retenus", texte: "", vars: {}, chiffres: false, positions: true, site: "", maj: 0 }).embeds);
  for (const marque of ["❤️", "💥", "📏", "❔", "4,9 M"]) assert.ok(!sans.includes(marque), marque);
  // La consigne des golems vidée par le staff : une ligne vide garde les golems et les rotations
  // sur deux rangées (Discord range trois champs « inline » côte à côte).
  const sansConsigne = MSG.messageRecap({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", recap: recap(COMPO_TYPE, REP_SOIREE(), { ...CS0, consignes: { golems: "", araignee: [] } }, 10), source: "retenus", texte: "", vars: {}, chiffres: true, positions: true, site: "", maj: 0 }).embeds[0].fields!;
  const iGolem = sansConsigne.findIndex((f) => f.name.includes("➡️ droite"));
  assert.equal(sansConsigne[iGolem + 1].inline, undefined);
  assert.ok(sansConsigne[iGolem + 2].name.includes("Rotation 1"));
  assert.ok(!JSON.stringify(sansConsigne).includes("⚠️ Araignée"));
  const ferme = MSG.messageRecap({ cle: MERCREDI.cle, jour: "x", etat: "terminee", recap: RECAP(), source: "retenus", texte: "", vars: {}, chiffres: true, positions: true, site: "", maj: 0 });
  assert.ok(ferme.embeds[0].title!.endsWith(" · terminée"));
  assert.equal(ferme.embeds[0].color, MSG.COULEUR.anthracite);
  assert.deepEqual(ferme.components, []);
});

cas("une salle changée sur le site après 20 h 40 se voit dans le récap Discord en moins de 30 s", () => {
  // Le récap recalculé change dès que la répartition change…
  const avant = MSG.messageRecap({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", recap: RECAP(), source: "retenus", texte: "", vars: {}, chiffres: true, positions: true, site: "", maj: 0 });
  const r = REP_SOIREE(); r.salles.s6 = "orin";
  const apres = MSG.messageRecap({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", recap: recap(COMPO_TYPE, r, CS0, 10), source: "retenus", texte: "", vars: {}, chiffres: true, positions: true, site: "", maj: 1 });
  assert.notDeepEqual(apres.embeds[0].fields![3], avant.embeds[0].fields![3]);
  assert.match(apres.embeds[0].fields![3].value, /\*\*Salle 6\*\* → .*Orin/);
  // … et la synchro qui modifie les messages vivants (récap compris) tourne toutes les 15 s.
  const sched = readFileSync(join(process.cwd(), "bot/scheduler.ts"), "utf8");
  assert.match(sched, /setInterval\(\(\) => synchroniserMessages\(client\)[^)]*\)[^,]*, 15_000\)/);
  const seances = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  // (Le chrono s'y ajoute au lot 5.)
  assert.match(seances, /const VIVANTS = \["panneau", "recap", "phase1", "phase2", "chrono"\] as const/);
});

cas("M10 — 📍 Mes positions : salles, équipe, golem, rotation ; les menus pour les changer ; et qui n'est pas parmi les joueurs", () => {
  const rc = RECAP();
  const pos = positionsDe(rc, "kaelis")!;
  assert.deepEqual(pos, { pseudo: "Kaelis", classe: "Arcaniste", salles: ["Salle 3", "Salle 4"], jumeau: "rouge_mag", golem: "droite", golemTank: false, araignee: 2 });
  assert.deepEqual(positionsDe(rc, "Brann")!.araignee, "tank");
  assert.equal(positionsDe(rc, "Zed"), null);
  const m = MSG.messagePositions({
    cle: MERCREDI.cle, label: MERCREDI.label, positions: [{ ...pos, poste: "Arcaniste", retenu: true }], nomGolems: "Golems", source: "retenus",
    menus: [MSG.menuMesSalles(MERCREDI.cle, "Kaelis", SALLES, rc.repartition)!, MSG.menuMonEquipe(MERCREDI.cle, COMPO_TYPE[8], "rouge_mag")!],
    site: "https://genesis.example",
  });
  assert.equal(m.content.split("\n")[0], "📍 Tes positions — mercredi 21 octobre · 21 h");
  assert.match(m.content, /\*\*Kaelis\*\* · poste Arcaniste · ✅ retenu/);
  assert.match(m.content, /\n🌳 Salles 3 \+ 4\n👯 Jumeaux : 🟥 Équipe Rouge — 🔮 DPS magique\n🗿 Golem : ➡️ droite\n🕷️ Araignée : 2️⃣ Rotation 2$/);
  assert.deepEqual(m.allowedMentions, { parse: [] });
  const [salles, equipe, liens] = m.components;
  const ms = salles.components[0] as { custom_id: string; min_values: number; max_values: number; options: { value: string; default?: boolean }[] };
  assert.equal(ms.custom_id, "cs:msal:cs_2026-10-21_mer:Kaelis");
  assert.equal(ms.min_values, 0);
  // Les salles libres et les siennes, cochées — jamais celles des autres (on ne vole pas).
  assert.deepEqual(ms.options.map((o) => o.value), ["s3", "s4", "s6", "s7", "s8", "s9", "s10"]);
  assert.deepEqual(ms.options.filter((o) => o.default).map((o) => o.value), ["s3", "s4"]);
  const me = equipe.components[0] as { custom_id: string; options: { value: string; default?: boolean }[] };
  assert.equal(me.custom_id, "cs:mjum:cs_2026-10-21_mer:Kaelis");
  assert.deepEqual(me.options.map((o) => [o.value, !!o.default]), [["aucune", false], ["vert_mag", false], ["rouge_mag", true]]);
  assert.equal((liens.components[0] as { url: string }).url, "https://genesis.example/compositions?onglet=repartition");
  // Rien de choisi : la ligne le dit, et dit où le faire.
  const nu = MSG.lignesPositions({ ...pos, salles: [], jumeau: null, golem: null, araignee: null, poste: null, retenu: false }, "Golems", "annonces");
  assert.deepEqual(nu.slice(1), ["🌳 Salles : pas encore choisies — prends-les ci-dessous ou sur le site.", "👯 Jumeaux : pas encore d'équipe — choisis-la ci-dessous ou sur le site."]);
  assert.match(nu[0], /sans poste · annoncé \(personne n'est encore retenu\)/);
  const absent = MSG.messagePositions({ cle: MERCREDI.cle, label: MERCREDI.label, positions: [], nomGolems: "Golems", source: "retenus", menus: [], site: "" });
  assert.match(absent.content, /^📍 Tu n'es pas parmi les joueurs de la Chambre du mercredi 21 octobre · 21 h : ni retenu, ni annoncé\./);
  assert.deepEqual(absent.components, []);
  // Annoncé, mais le staff en a retenu d'autres : « ni annoncé » serait faux (contre-vérification du lot 4).
  const nonRetenu = MSG.messagePositions({ cle: MERCREDI.cle, label: MERCREDI.label, positions: [], nomGolems: "Golems", source: "retenus", menus: [], site: "", nonRetenus: ["Nox"] });
  assert.equal(nonRetenu.content, "📍 **Nox** est annoncé, mais le staff ne l'a pas retenu pour la Chambre du mercredi 21 octobre · 21 h : pas de position ce soir.");
  assert.ok(!nonRetenu.content.includes("ni annoncé"));
  const ctxNR = { ...ctxR(), staff: false, miens: [], nonRetenus: ["nox"] };
  assert.deepEqual(appliquerAction(vide(), { action: "salle", salle: "s1" }, ctxNR),
    { ok: false, status: 409, message: "Le staff ne t'a pas retenu pour cette séance : tu n'as pas de place à prendre." });
  // Le verdict d'un geste, en tête : ✅, ⛔ ou ⚠️.
  assert.equal(MSG.reponseGeste({ ok: true, message: "Tu prends Salle 3." }), "✅ Tu prends Salle 3.");
  assert.equal(MSG.reponseGeste({ ok: false, status: 403, message: "Non." }), "⛔ Non.");
  assert.equal(MSG.reponseGeste({ ok: false, status: 409, message: "Prise." }), "⚠️ Prise.");
});

cas("les boutons des salles et des jumeaux dans Discord (décision 1) : sans état, 5 rangées au plus, fermés à la clôture", () => {
  const rep = nettoyer(REP_SOIREE(), COMPO_TYPE, SALLES);
  const p1 = MSG.messagePhase1({
    cle: MERCREDI.cle, jour: "mercredi 21 octobre", etat: "ouvert", texte: CS0.textes.phase1, vars: {}, site: "https://genesis.example", maj: 0,
    salles: SALLES.map((x) => ({ ...x, j: COMPO_TYPE.find((j) => j.pseudo.toLowerCase() === rep.salles[x.cle]) ?? null })),
  });
  assert.equal(p1.embeds[0].title, "🌳 Phase 1 — Asuras (salles) · mercredi 21 octobre");
  assert.match(p1.embeds[0].description!, /\*\*Salle 6\*\* → ▫️ personne/);
  assert.match(p1.embeds[0].description!, /⚠️ 7 \/ 12 couvertes$/);
  assert.ok(p1.components.length <= 5);
  const ids = p1.components.flatMap((r) => r.components.map((c) => ("custom_id" in c ? c.custom_id : (c as { url: string }).url)));
  assert.deepEqual(ids.slice(0, 3), ["cs:salle:cs_2026-10-21_mer:s1", "cs:salle:cs_2026-10-21_mer:s2", "cs:salle:cs_2026-10-21_mer:s3"]);
  assert.deepEqual(ids.slice(12), ["cs:auto:cs_2026-10-21_mer", "cs:placer:cs_2026-10-21_mer", "cs:pos:cs_2026-10-21_mer", "https://genesis.example/compositions?onglet=repartition"]);
  // Une salle prise passe au vert ; une salle n'a pas d'émoji (il ne veut rien dire), Discord refuse un émoji vide.
  const s1 = p1.components[0].components[0] as { style: number; emoji?: unknown };
  assert.equal(s1.style, ButtonStyle.Success);
  assert.equal(s1.emoji, undefined);
  assert.deepEqual(MSG.lireId("cs:salle:cs_2026-10-21_mer:a11"), { evenement: "cs", action: "salle", cle: "cs_2026-10-21_mer", reste: "a11" });

  const equipes = equipesJumeaux(rep, COMPO_TYPE);
  const p2 = MSG.messagePhase2({ cle: MERCREDI.cle, jour: "mercredi 21 octobre", etat: "ouvert", equipes, ecart: ecartJumeaux(equipes.vert.totalDps, equipes.rouge.totalDps), texte: CS0.textes.phase2, vars: {}, chiffres: true, site: "", maj: 0 });
  assert.deepEqual(p2.embeds[0].fields!.slice(0, 2).map((f) => f.name), ["🟩 Équipe Verte", "🟥 Équipe Rouge"]);
  assert.match(p2.embeds[0].fields![0].value, /^🛡️ .*Brann ❤️ 4,9 M sceptre · 7,9 M poing\n🔮 .*Mira 💥 190 k\/s/);
  assert.match(p2.embeds[0].fields![0].value, /💥 675 k\/s · ❤️ 4,9 M$/);
  assert.match(p2.embeds[0].fields![2].value, /Écart de dégâts déclarés entre les équipes : \d+ %/);
  const r1 = p2.components[0].components as { custom_id: string; label: string; style: number }[];
  assert.deepEqual(r1.map((c) => [c.custom_id, c.label]), [["cs:jum:cs_2026-10-21_mer:vert_tank", "Verte — Tank"], ["cs:jum:cs_2026-10-21_mer:vert_mag", "Verte — DPS magique"], ["cs:jum:cs_2026-10-21_mer:vert_phy", "Verte — DPS physique"]]);
  assert.equal((p2.components[1].components[0] as { style: number }).style, ButtonStyle.Danger);
  assert.equal((p2.components[2].components[0] as { custom_id: string }).custom_id, "cs:echanger:cs_2026-10-21_mer");
  // Sans chiffres (salon ouvert) : ni chiffre, ni total, ni écart.
  const ouvert = JSON.stringify(MSG.messagePhase2({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", equipes, ecart: 10, texte: "", vars: {}, chiffres: false, site: "", maj: 0 }).embeds);
  for (const marque of ["❤️", "💥", "Écart"]) assert.ok(!ouvert.includes(marque), marque);
  // Fermés : sans boutons.
  assert.deepEqual(MSG.messagePhase1({ cle: MERCREDI.cle, jour: "x", etat: "terminee", salles: [], texte: "", vars: {}, site: "", maj: 0 }).components, []);
  assert.deepEqual(MSG.messagePhase2({ cle: MERCREDI.cle, jour: "x", etat: "annulee", equipes, ecart: null, texte: "", vars: {}, chiffres: true, site: "", maj: 0 }).components, []);
});

cas("les deux messages à boutons : leur consigne vient du paramétrage (décision 5) ; les « pas encore placés » portent leur chiffre déclaré (décision 9)", () => {
  // Le défaut du code, mot pour mot, en tête de chaque message.
  const p1 = MSG.messagePhase1({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", salles: SALLES.map((x) => ({ ...x, j: null })), texte: CS0.textes.phase1, vars: {}, site: "", maj: 0 });
  assert.ok(p1.embeds[0].description!.startsWith(`${PARAMETRES_CS_DEFAUT.textes.phase1}\n\n**Salle 1** → ▫️ personne`));
  const equipes = equipesJumeaux(vide(), COMPO_TYPE);
  const p2 = MSG.messagePhase2({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", equipes, ecart: null, texte: CS0.textes.phase2, vars: {}, chiffres: false, site: "", maj: 0 });
  assert.equal(p2.embeds[0].description, PARAMETRES_CS_DEFAUT.textes.phase2);
  assert.match(p2.embeds[0].description!, /^Chaque équipe : 1 tank et 4 DPS, 🔮 magiques ou ⚔️ physiques\..*\nKraavus et Kraavos doivent mourir à 4 s d'écart au plus/);
  // Réécrite par le staff, avec ses variables ; vidée, plus de consigne (et pas de ligne vide en tête).
  const autre = MSG.messagePhase1({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", salles: [{ cle: "s1", label: "Salle 1", j: null }], texte: "Ce soir à {heure} : une salle chacun.", vars: { heure: "21 h" }, site: "", maj: 0 });
  assert.ok(autre.embeds[0].description!.startsWith("Ce soir à 21 h : une salle chacun.\n\n**Salle 1**"));
  assert.ok(MSG.messagePhase1({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", salles: [{ cle: "s1", label: "Salle 1", j: null }], texte: "  ", vars: {}, site: "", maj: 0 }).embeds[0].description!.startsWith("**Salle 1**"));
  assert.equal(MSG.messagePhase2({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", equipes, ecart: null, texte: "", vars: {}, chiffres: false, site: "", maj: 0 }).embeds[0].description, undefined);
  // Le paramétrage : un `textes` enregistré avant ces deux clés les reprend du défaut ; une mention
  // saisie est retirée ; plus de 400 signes, refusé.
  const lu = normaliserCS({ textes: { piedRecap: "courage !", sansPanneau: "x" } });
  assert.deepEqual([lu.textes.phase1, lu.textes.phase2], [PARAMETRES_CS_DEFAUT.textes.phase1, PARAMETRES_CS_DEFAUT.textes.phase2]);
  assert.equal(normaliserCS({ textes: { phase2: "@everyone Équilibrez !" } }).textes.phase2, "Équilibrez !");
  assert.ok(validerParametres("cs", { ...PARAMETRES_CS_DEFAUT, textes: { ...PARAMETRES_CS_DEFAUT.textes, phase1: "x".repeat(401) } }).some((e) => /Phase 1.*401 signes/.test(e)));
  // « Pas encore placés » : le chiffre DÉCLARÉ de chacun quand le salon le permet, rien sinon.
  const avec = MSG.messagePhase2({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", equipes, ecart: null, texte: "", vars: {}, chiffres: true, site: "", maj: 0 }).embeds[0].fields!.find((f) => f.name === "▫️ Pas encore placés")!;
  assert.match(avec.value, /Mira 💥 190 k\/s/);
  const sans = MSG.messagePhase2({ cle: MERCREDI.cle, jour: "x", etat: "ouvert", equipes, ecart: null, texte: "", vars: {}, chiffres: false, site: "", maj: 0 }).embeds[0].fields!.find((f) => f.name === "▫️ Pas encore placés")!;
  assert.ok(!/💥|❤️/.test(sans.value));
  // L'essai des deux messages (§8.10 : un essai de CHAQUE message) : sans mention, boutons inactifs.
  const essai = MSG.enEssai(p1, "note");
  assert.deepEqual(essai.allowedMentions, { parse: [] });
  assert.ok(essai.embeds[0].title!.startsWith("🧪 ESSAI — 🌳 Phase 1"));
  assert.ok(essai.components.flatMap((r) => r.components).every((c) => !("custom_id" in c) || c.custom_id.startsWith("cs:essai:")));
  const route = readFileSync(join(process.cwd(), "src/app/api/evenements/parametres/essai/route.ts"), "utf8");
  assert.match(route, /\["panneau", "annulation", "recap", "repartition", "chrono", "debrief", "echange"\]/); // le chrono depuis le lot 5, le débrief publié depuis le lot 7, la demande d'échange depuis le lot 10
  const bot = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  assert.match(bot, /message === "repartition"/);
});

cas("les menus du staff en deux temps : la salle puis le joueur ; le joueur puis sa place, un retrait ou un échange", () => {
  const rep = nettoyer(REP_SOIREE(), COMPO_TYPE, SALLES);
  // L'occupant s'écrit par son PSEUDO (« Kaelis »), comme le bot le passe (`sallesStaff`), pas par sa clé.
  const pseudoDe = (k: string | undefined) => (k ? COMPO_TYPE.find((j) => j.pseudo.toLowerCase() === k)?.pseudo ?? k : null);
  const ms = MSG.menuChoixSalle(MERCREDI.cle, SALLES.map((x) => ({ ...x, occupant: pseudoDe(rep.salles[x.cle]) })), "s3").components[0] as { custom_id: string; options: { value: string; description: string; default: boolean }[] };
  assert.equal(ms.custom_id, "cs:psal:cs_2026-10-21_mer");
  assert.deepEqual([ms.options[2].description, ms.options[2].default, ms.options[5].description], ["tenue par Kaelis", true, "libre"]);
  const mj = MSG.menuJoueurSalle(MERCREDI.cle, "s3", COMPO_TYPE, "kaelis")!.components[0] as { custom_id: string; options: { value: string; default?: boolean }[] };
  assert.equal(mj.custom_id, "cs:pjou:cs_2026-10-21_mer:s3");
  assert.equal(mj.options[0].value, "0"); // « Libérer la salle »
  assert.deepEqual(mj.options.filter((o) => o.default).map((o) => o.value), ["Kaelis"]);
  const ma = MSG.menuActionJumeau(MERCREDI.cle, COMPO_TYPE[8], COMPO_TYPE, rep)!.components[0] as { custom_id: string; options: { value: string; label: string }[] };
  assert.equal(ma.custom_id, "cs:sact:cs_2026-10-21_mer:Kaelis");
  assert.deepEqual(ma.options.slice(0, 3).map((o) => o.value), ["vert_mag", "rouge_mag", "retirer"]);
  assert.ok(ma.options.some((o) => o.value === "ech:Mira" && o.label === "Échanger avec Mira (Verte — DPS magique)"));
  assert.ok(ma.options.length <= 25);
  assert.deepEqual(MSG.lireId("cs:sact:cs_2026-10-21_mer:Kaelis"), { evenement: "cs", action: "sact", cle: "cs_2026-10-21_mer", reste: "Kaelis" });
  // Ce que dit chaque choix du staff — le geste écrit est celui de la route 5 du site.
  assert.deepEqual(MSG.gesteJoueurSalle("0", "s3"), { action: "liberer", salle: "s3" });
  assert.deepEqual(MSG.gesteJoueurSalle("Orin", "s3"), { action: "salle", salle: "s3", pseudo: "Orin", force: true });
  assert.deepEqual(MSG.gesteActionStaff("retirer", "Kaelis"), { action: "jumeau_retirer", pseudo: "Kaelis" });
  assert.deepEqual(MSG.gesteActionStaff("ech:Mira", "Kaelis"), { action: "jumeau_echanger", pseudo: "Kaelis", avec: "Mira" });
  assert.deepEqual(MSG.gesteActionStaff("vert_mag", "Kaelis"), { action: "jumeau", place: "vert_mag", pseudo: "Kaelis", force: true });
  assert.equal(MSG.gesteActionStaff("ech:", "Kaelis"), null);
  assert.equal(MSG.gesteActionStaff("vert_soin", "Kaelis"), null);
  // Le staff place Orin (salle 3, tenue par Kaelis) : il écrase l'occupant ; le même geste par un
  // membre est refusé (403), et « Libérer » rend la salle.
  const ctxStaff = { ...ctxR(), staff: true, miens: [] };
  const r3 = nettoyer(REP_SOIREE(), COMPO_TYPE, SALLES);
  assert.equal(appliquerAction(r3, MSG.gesteJoueurSalle("Orin", "s3"), ctxStaff).ok, true);
  assert.equal(r3.salles.s3, "orin");
  assert.equal((appliquerAction(r3, MSG.gesteJoueurSalle("Kaelis", "s3"), { ...ctxR(), staff: false, miens: ["mira"] }) as { status?: number }).status, 403);
  assert.equal(appliquerAction(r3, MSG.gesteJoueurSalle("0", "s3"), ctxStaff).ok, true);
  assert.equal(r3.salles.s3, undefined);
});

cas("Discord : qui n'a pas le droit reçoit un refus éphémère, dans l'ordre compte → rang → séance", () => {
  const base: MSG.GardeRepartition = { refus: null, cache: false, staff: false, exigeStaff: false, seanceValable: true, annulee: false, cloturee: false, site: "https://genesis.example" };
  assert.equal(MSG.refusRepartition(base), null); // un membre, sur la séance qui se joue
  assert.match(MSG.refusRepartition({ ...base, refus: "compte_non_lie" })!, /^🔗 .*https:\/\/genesis\.example/);
  // Un visiteur, un candidat, un Friend (rang RECRUE en base) : ⛔, et rien sur la séance.
  assert.equal(MSG.refusRepartition({ ...base, refus: "reserve_membres", seanceValable: false, exigeStaff: true }), "⛔ Les Chambres sont réservées aux membres de la guilde.");
  assert.equal(refusMembre({ role: "RECRUE", isActive: true }), "reserve_membres");
  // Un membre caché n'est jamais parmi les joueurs ; le staff caché garde ses gestes.
  assert.match(MSG.refusRepartition({ ...base, cache: true })!, /^⛔ Ton compte n'apparaît pas/);
  assert.equal(MSG.refusRepartition({ ...base, cache: true, staff: true, exigeStaff: true }), null);
  // Compléter, Placer, Placer · échanger : le staff seul.
  assert.equal(MSG.refusRepartition({ ...base, exigeStaff: true }), MSG.REFUS_STAFF);
  assert.equal(MSG.REFUS_STAFF, "⛔ Réservé au staff (bras droits).");
  assert.equal(MSG.refusRepartition({ ...base, exigeStaff: true, staff: true }), null);
  // Un vieux message resté dans le salon, une séance annulée ou clôturée.
  assert.equal(MSG.refusRepartition({ ...base, seanceValable: false }), "⚠️ Cette répartition est celle d'une séance passée.");
  assert.equal(MSG.refusRepartition({ ...base, annulee: true }), "🚫 Cette séance est annulée.");
  assert.equal(MSG.refusRepartition({ ...base, cloturee: true }), "⚠️ Cette séance est terminée.");
  // Un bouton public ne devine pas lequel de ses persos : 📍 a un menu par perso.
  assert.equal(MSG.refusPlusieurs(1, "salle"), null);
  assert.equal(MSG.refusPlusieurs(2, "salle"), "⚠️ Tu as plusieurs persos parmi les joueurs : choisis les salles de chacun avec 📍 Mes positions.");
  assert.match(MSG.refusPlusieurs(2, "equipe")!, /choisis l'équipe de chacun/);
  // 📍 « Équipe de Kaelis » : la place cochée re-choisie ne la quitte pas ; « Aucune » la quitte.
  assert.deepEqual(MSG.gesteMonEquipe("rouge_mag", "rouge_mag", "Kaelis"), { deja: { ok: true, message: "Tu es déjà en Rouge — DPS magique." } });
  assert.deepEqual(MSG.gesteMonEquipe("vert_mag", "rouge_mag", "Kaelis"), { action: { action: "jumeau", place: "vert_mag", pseudo: "Kaelis" } });
  assert.deepEqual(MSG.gesteMonEquipe("aucune", "rouge_mag", "Kaelis"), { action: { action: "jumeau_retirer", pseudo: "Kaelis" } });
  assert.deepEqual(MSG.gesteMonEquipe("aucune", null, "Kaelis"), { deja: { ok: true, message: "Tu n'es dans aucune équipe." } });
  assert.deepEqual(MSG.gesteMonEquipe("vert_soin", null, "Kaelis"), { deja: { ok: false, status: 400, message: "Place inconnue." } });
  // Chaque identifiant de bouton et de menu tient dans les 100 caractères de Discord, et le
  // bot route chacun : un bouton qu'il ne connaît pas répond « ne sert plus », jamais rien.
  const seances = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  for (const a of ["pos", "salle", "jum", "auto", "placer", "echanger"]) assert.ok(seances.includes(`id.action === "${a}"`), a);
  for (const a of ["msal", "mjum", "psal", "pjou", "sjou", "sact"]) assert.ok(seances.includes(`id.action === "${a}"`), a);
  const cle = "cs_2026-10-21_mer";
  for (const id of [MSG.ID.salle(cle, "a12"), MSG.ID.jumeau(cle, "rouge_tank"), MSG.ID.auto(cle), MSG.ID.placer(cle), MSG.ID.echanger(cle), MSG.ID.joueurSalle(cle, "s10")]) assert.ok(id.length <= 100, id);
});

cas("le récap, la répartition et 📍 ne visent que la séance qui se joue ou qu'on prépare", () => {
  assert.equal(publicationPermise(MERCREDI, paris("2026-10-21", "20:40"), "recap"), null);
  assert.equal(publicationPermise(MERCREDI, paris("2026-10-21", "23:00"), "repartition"), null); // elle se joue
  assert.match(publicationPermise(MERCREDI, paris("2026-10-22", "04:00"), "recap") ?? "", /passée : son récap est fermé/);
  assert.equal(seanceDuBouton(MERCREDI.cle, paris("2026-10-21", "22:00"))?.cle, MERCREDI.cle);
  assert.equal(seanceDuBouton(MERCREDI.cle, paris("2026-10-22", "04:00")), null); // un vieux message resté dans le salon
  assert.equal(seanceDuBouton("cs_2026-10-25_dim", paris("2026-10-22", "04:00"))?.cle, "cs_2026-10-25_dim");
  // Le rappel de 20 h : 📍 et la répartition n'y sont qu'avec la bascule.
  const jour = (positions: boolean) => MSG.messageJour({ dans: "dans 1 h", texte: "", vars: {}, source: "retenus", joueurs: [], places: 10, manque: null, chiffres: false, site: "https://genesis.example", maj: 0, cle: MERCREDI.cle, positions });
  assert.deepEqual(jour(true).components[0].components.map((c) => ("custom_id" in c ? c.custom_id : (c as { url: string }).url)), ["cs:pos:cs_2026-10-21_mer", "https://genesis.example/compositions?onglet=repartition"]);
  assert.equal(jour(false).components[0].components.length, 1);
  // /chambre positions attend la bascule, comme ce bouton : la réponse renvoie au site.
  const avant = MSG.positionsAvantBascule("https://genesis.example");
  assert.match(avant.content, /^📍 .*onglet Répartition\.$/);
  assert.equal((avant.components[0].components[0] as { url: string }).url, "https://genesis.example/compositions?onglet=repartition");
  assert.deepEqual(avant.allowedMentions, { parse: [] });
  const cmd = readFileSync(join(process.cwd(), "bot/commands/chambre.ts"), "utf8");
  assert.match(cmd, /nouveauxMessages\) \{ await i\.editReply\(M\.positionsAvantBascule\(SITE_URL\)\)/);
});

cas("la clôture retient les salles, la place chez les jumeaux et le rôle tenu ce soir", () => {
  const rep = nettoyer(REP_SOIREE(), COMPO_TYPE, SALLES);
  assert.deepEqual(detailsRepartition(rep, COMPO_TYPE[8]), { salles: ["s3", "s4"], jumeau: "rouge_mag", role: "mag" });
  assert.deepEqual(detailsRepartition(rep, COMPO_TYPE[1]), { salles: [], jumeau: "rouge_tank", role: "tank" });
  assert.deepEqual(detailsRepartition(vide(), COMPO_TYPE[7]), { salles: [], jumeau: null, role: "mag" });
  assert.equal(roleTenu(COMPO_TYPE[0], vide()), "tank");
  assert.equal(roleTenu(jr("Pri", "Primat", "d1"), vide()), "mag");
});

/* ══ Lot 5 — le chrono en direct (§4.9, §7.4, M6) ══════════════════════════════════════════
   Les cinq vérifications du §14, plus le message M6 et les règles pures qui les portent. */
console.log("\nLot 5 — le chrono en direct");

const ETAPES = CS0.etapes;
const T0 = paris("2026-10-21", "21:04").getTime();
const min = (n: number) => n * 60_000;
/** Un chrono parti à 21:04, avec ces durées d'étape (en minutes). */
const chronoApres = (...durees: number[]): Chrono => {
  const fins: number[] = [];
  let t = T0;
  for (const d of durees) { t += min(d); fins.push(t); }
  return { debut: T0, fins, par: "Maxime", fini: fins.length === ETAPES.length };
};
const ok1 = <T,>(r: { ok: boolean } & T) => { assert.ok(r.ok, JSON.stringify(r)); return r as Extract<T, { ok: true }> & { chrono: Chrono; message: string; change: boolean }; };

cas("les durées : m:ss, h:mm:ss, « — » ; le total du départ à la dernière fin", () => {
  assert.equal(fmtDuree(372), "6:12");
  assert.equal(fmtDuree(3723), "1:02:03");
  assert.equal(fmtDuree(59.6), "1:00"); // arrondie
  assert.equal(fmtDuree(null), "—");
  assert.equal(fmtDuree(0), "0:00");
  const c = chronoApres(6.2, 4 + 40 / 60);
  assert.deepEqual(dureesChrono(c, ETAPES), { "1.1": 372, "1.2": 280 });
  assert.equal(totalChrono(c), 652);
  assert.equal(totalChrono(CHRONO_VIDE), 0);
});

cas("un clic : Démarrer, la fin de chaque étape, la dernière termine ; le staff seul, sur l'heure du serveur", () => {
  let c = ok1(appliquerChrono(CHRONO_VIDE, "suivante", T0, "Maxime", ETAPES));
  assert.deepEqual(c.chrono, { debut: T0, fins: [], par: "Maxime", fini: false });
  assert.equal(c.message, "Chrono démarré.");
  c = ok1(appliquerChrono(c.chrono, "suivante", T0 + 372_000, "Lina", ETAPES));
  assert.equal(c.message, "1.1 480 monstres : 6:12.");
  assert.equal(c.chrono.par, "Maxime"); // le chronométreur est celui qui a démarré
  let x = c.chrono;
  for (let i = 1; i < ETAPES.length; i++) x = ok1(appliquerChrono(x, "suivante", T0 + min(10 * (i + 1)), "Maxime", ETAPES)).chrono;
  assert.equal(x.fini, true);
  assert.equal(x.fins.length, 13);
  assert.deepEqual(appliquerChrono(x, "suivante", T0 + min(200), "Maxime", ETAPES), { ok: false, status: 409, message: "Le chrono est terminé." });
  // Le temps ne recule jamais, même si le bot et le site n'ont pas tout à fait la même horloge.
  const y = ok1(appliquerChrono(chronoApres(5), "suivante", T0 + min(4), "Maxime", ETAPES));
  assert.equal(y.chrono.fins[1], T0 + min(5));
  assert.deepEqual(appliquerChrono(CHRONO_VIDE, "suivante", T0, "Maxime", []), { ok: false, status: 400, message: "Aucune étape : règle-les dans le paramétrage des événements." });
});

cas("« Annuler » défait un « Arrêter », puis la dernière fin, puis le départ", () => {
  const avant = chronoApres(6, 5);
  const arrete = ok1(appliquerChrono(avant, "arreter", T0 + min(14), "Maxime", ETAPES));
  assert.equal(arrete.chrono.fini, true);
  assert.equal(arrete.message, "Chrono arrêté avant la fin, après 1.2 12 Asuras.");
  assert.equal(etatChrono(arrete.chrono, ETAPES, T0 + min(20)).arreteAvantFin, true);
  // Arrêté : « suivante » ne repart pas d'elle-même.
  assert.match((appliquerChrono(arrete.chrono, "suivante", T0 + min(15), "Maxime", ETAPES) as { message: string }).message, /Annuler le dernier clic/);
  const repris = ok1(appliquerChrono(arrete.chrono, "annuler", T0 + min(15), "Maxime", ETAPES));
  assert.deepEqual(repris.chrono, avant); // l'arrêt seul est défait : les deux fins restent
  assert.equal(repris.message, "L'arrêt est annulé : le chrono reprend.");
  const moinsUne = ok1(appliquerChrono(repris.chrono, "annuler", T0 + min(16), "Maxime", ETAPES));
  assert.deepEqual(moinsUne.chrono.fins, [T0 + min(6)]);
  assert.equal(moinsUne.message, "1.2 12 Asuras reprend : sa fin est annulée.");
  const zero = ok1(appliquerChrono(ok1(appliquerChrono(moinsUne.chrono, "annuler", 0, "x", ETAPES)).chrono, "annuler", 0, "x", ETAPES));
  assert.deepEqual(zero.chrono, CHRONO_VIDE);
  assert.equal((appliquerChrono(CHRONO_VIDE, "annuler", 0, "x", ETAPES) as { status: number }).status, 409);
  // Une fin de trop (le chrono terminé) s'annule aussi : la dernière étape reprend.
  const complet = chronoApres(...ETAPES.map(() => 3));
  assert.deepEqual(ok1(appliquerChrono(complet, "annuler", 0, "x", ETAPES)).chrono.fins.length, 12);
  // Arrêter deux fois ne change rien ; effacer remet à zéro.
  assert.equal(ok1(appliquerChrono(arrete.chrono, "arreter", 0, "x", ETAPES)).change, false);
  assert.deepEqual(ok1(appliquerChrono(avant, "reinitialiser", 0, "x", ETAPES)).chrono, CHRONO_VIDE);
  assert.equal(ok1(appliquerChrono(CHRONO_VIDE, "reinitialiser", 0, "x", ETAPES)).change, false);
});

cas("le repère de l'état affiché distingue le départ, chaque fin et l'arrêt ; le corps du clic est relu sans confiance", () => {
  const etats = [CHRONO_VIDE, chronoApres(), chronoApres(6), { ...chronoApres(6), fini: true }, chronoApres(6, 5)];
  assert.equal(new Set(etats.map(repere)).size, etats.length);
  assert.equal(repere(CHRONO_VIDE), 0);
  assert.deepEqual(lireClicChrono({ action: "suivante", vu: 4 }), { ok: true, action: "suivante", vu: 4 });
  assert.deepEqual(lireClicChrono({ action: "annuler", vu: "7" }), { ok: true, action: "annuler", vu: 7 });
  assert.equal(lireClicChrono({ action: "effacer", vu: 0 }).ok, false);
  assert.equal(lireClicChrono({ action: "suivante" }).ok, false);
  assert.equal(lireClicChrono({ action: "suivante", vu: -1 }).ok, false);
  assert.equal(lireClicChrono(null).ok, false);
  // Un blob abîmé : un chrono vide, ou coupé à la première fin qui remonte le temps.
  assert.deepEqual(lireChrono("abîmé"), CHRONO_VIDE);
  assert.deepEqual(lireChrono({ debut: T0, fins: [T0 + 5, "x", T0 + 9], par: 3, fini: "oui" }), { debut: T0, fins: [T0 + 5], par: "", fini: false });
  assert.deepEqual(lireChrono({ debut: T0, fins: [T0 + 9, T0 + 5] }).fins, [T0 + 9]);
});

/** Une base en mémoire qui se comporte comme Prisma sur ce que `modifierChrono` appelle. */
function baseChrono(init: Partial<{ chrono: unknown; etapes: unknown; debrief: unknown; annulee: boolean; clotureAt: Date | null }> = {}) {
  let row = { id: "x", cle: MERCREDI.cle, version: 0, chrono: null as unknown, etapes: null as unknown, debrief: null as unknown, annulee: false, clotureAt: null as Date | null, ...init };
  const db = {
    seanceGuilde: {
      upsert: async () => { await new Promise((r) => setTimeout(r, 1)); return structuredClone(row); },
      updateMany: async ({ where, data }: { where: { version: number }; data: { chrono?: unknown; etapes?: unknown } }) => {
        if (where.version !== row.version) return { count: 0 };
        row = {
          ...row, version: row.version + 1,
          ...(data.chrono !== undefined ? { chrono: data.chrono } : {}),
          ...(data.etapes !== undefined ? { etapes: data.etapes === Prisma.DbNull ? null : data.etapes } : {}),
        };
        return { count: 1 };
      },
      findUniqueOrThrow: async () => structuredClone(row),
      findUnique: async () => structuredClone(row),
    },
    $transaction: async <T,>(f: (tx: unknown) => Promise<T>) => f(db),
  };
  return { db: db as never, lire: () => row };
}
const a2105 = () => paris("2026-10-21", "21:05").getTime();

cas("les étapes sont figées au démarrage : une étape modifiée ensuite ne change pas ce chrono", async () => {
  const b = baseChrono();
  const r = await modifierChrono(b.db, MERCREDI, "suivante", 0, "Maxime", CS0, a2105);
  assert.ok(r.ok);
  assert.deepEqual(lireDeroule(b.lire().etapes)?.etapes.map((e) => e.code), ETAPES.map((e) => e.code));
  // Le staff retire des étapes dans le paramétrage : la séance garde les siennes.
  const reduit = { etapes: ETAPES.slice(0, 2), phases: { "1": "Phase 1 — Chambres" } };
  const r2 = await modifierChrono(b.db, MERCREDI, "suivante", repere(r.chrono), "Maxime", reduit, () => a2105() + min(6));
  assert.ok(r2.ok);
  assert.equal(r2.deroule.etapes.length, 13);
  assert.equal(r2.message, "1.1 480 monstres : 6:00.");
  assert.equal(derouleDe(b.lire().etapes, reduit).etapes.length, 13);
  assert.equal(derouleDe(null, reduit).etapes.length, 2); // pas figé : le paramétrage
  // Effacer, tant qu'aucun débrief n'est noté, libère la liste : le prochain départ prendra celle du moment.
  const r3 = await modifierChrono(b.db, MERCREDI, "reinitialiser", repere(r2.chrono), "Maxime", reduit, a2105);
  assert.ok(r3.ok);
  assert.equal(b.lire().etapes, null);
  const b2 = baseChrono({ chrono: chronoApres(6), etapes: { etapes: ETAPES, phases: CS0.phases }, debrief: { "1.1": { statut: "bien" } } });
  await modifierChrono(b2.db, MERCREDI, "reinitialiser", repere(chronoApres(6)), "Maxime", reduit, a2105);
  assert.equal(lireDeroule(b2.lire().etapes)?.etapes.length, 13); // un débrief noté garde la liste
  // La lecture : une liste vide ou illisible n'est pas figée.
  assert.equal(lireDeroule({ etapes: [] }), null);
  assert.equal(lireDeroule("abîmé"), null);
  assert.deepEqual(lireDeroule({ etapes: [{ code: "9", label: "Essai", phase: "7", emoji: "🐉" }] })?.phases, { "7": "Phase 7" });
});

cas("un clic sur le site et un clic sur Discord au même instant ne créent qu'une seule fin", async () => {
  const b = baseChrono({ chrono: chronoApres(6) });
  const vu = repere(chronoApres(6));
  const [site, discord] = await Promise.all([
    modifierChrono(b.db, MERCREDI, "suivante", vu, "Maxime", CS0, () => a2105() + min(10)),
    modifierChrono(b.db, MERCREDI, "suivante", vu, "Lina", CS0, () => a2105() + min(10) + 300),
  ]);
  assert.equal([site, discord].filter((x) => x.ok).length, 1);
  const perdant = [site, discord].find((x) => !x.ok) as Extract<typeof site, { ok: false }>;
  assert.deepEqual([perdant.status, perdant.conflit, perdant.message], [409, true, CHRONO_DEJA_AVANCE]);
  assert.equal(lireChrono(b.lire().chrono).fins.length, 2); // une seule fin de plus
  assert.equal(perdant.chrono.fins.length, 2); // le refus porte l'état à réafficher
  // Deux « Démarrer » simultanés (le cas que `vu = fins.length` laissait passer) : un départ, aucune fin.
  const d = baseChrono();
  await Promise.all([
    modifierChrono(d.db, MERCREDI, "suivante", 0, "Maxime", CS0, a2105),
    modifierChrono(d.db, MERCREDI, "suivante", 0, "Lina", CS0, () => a2105() + 200),
  ]);
  assert.deepEqual(lireChrono(d.lire().chrono).fins, []);
  // Un « Arrêter » et un « Annuler » croisés : le second ne défait pas un arrêt qu'il n'a pas vu.
  const e = baseChrono({ chrono: chronoApres(6, 5) });
  const vu2 = repere(chronoApres(6, 5));
  await modifierChrono(e.db, MERCREDI, "arreter", vu2, "Maxime", CS0, a2105);
  const croise = await modifierChrono(e.db, MERCREDI, "annuler", vu2, "Lina", CS0, a2105);
  assert.equal(croise.ok, false);
  assert.equal(lireChrono(e.lire().chrono).fini, true);
});

cas("seule la séance qui se joue se chronomètre ; ni annulée, ni clôturée", async () => {
  assert.equal(refusChronoSeance({ cle: MERCREDI.cle, annulee: false, cloturee: false }, paris("2026-10-21", "21:30")), null);
  assert.equal(refusChronoSeance({ cle: MERCREDI.cle, annulee: false, cloturee: false }, paris("2026-10-21", "15:00")), null); // le jour J, avant le départ
  assert.match(refusChronoSeance({ cle: MERCREDI.cle, annulee: false, cloturee: false }, paris("2026-10-22", "04:00"))!, /autre séance que celle qui se joue/);
  assert.match(refusChronoSeance({ cle: "cs_2026-10-25_dim", annulee: false, cloturee: false }, paris("2026-10-21", "22:00"))!, /autre séance/);
  assert.equal(refusChronoSeance({ cle: MERCREDI.cle, annulee: true, cloturee: false }, paris("2026-10-21", "21:30")), "Cette séance est annulée : pas de chrono.");
  assert.equal(refusChronoSeance({ cle: MERCREDI.cle, annulee: false, cloturee: true }, paris("2026-10-21", "23:30")), "Cette séance est clôturée : son chrono ne bouge plus.");
  const b = baseChrono({ clotureAt: new Date() });
  const r = await modifierChrono(b.db, MERCREDI, "suivante", 0, "Maxime", CS0, a2105);
  assert.deepEqual([r.ok, (r as { status: number }).status, (r as { conflit: boolean }).conflit], [false, 409, false]);
  assert.equal(b.lire().chrono, null);
});

cas("une horloge de téléphone avancée de 2 min affiche le bon temps", () => {
  const c = chronoApres(6, 5);
  const serveur = T0 + min(14) + 30_000;     // 21:18:30 au serveur
  const telephone = serveur + min(2);        // le téléphone avance de 2 min
  // Le décalage se mesure à chaque réponse : l'heure du serveur moins celle du navigateur.
  const decalage = serveur - telephone;
  const juste = etatChrono(c, ETAPES, serveur);
  const corrige = etatChrono(c, ETAPES, telephone + decalage);
  assert.equal(fmtDuree(corrige.ecoule), "14:30");
  assert.equal(fmtDuree(corrige.dansEtape), "3:30");
  assert.deepEqual([corrige.ecoule, corrige.dansEtape], [juste.ecoule, juste.dansEtape]);
  assert.equal(fmtDuree(etatChrono(c, ETAPES, telephone).ecoule), "16:30"); // sans correction : faux
  // L'onglet calcule bien sur l'heure corrigée, chaque seconde, sans requestAnimationFrame seul.
  const onglet = readFileSync(join(process.cwd(), "src/components/chambres/Chrono.tsx"), "utf8");
  assert.match(onglet, /etatChrono\(vue\.chrono, vue\.etapes, tick \+ decalage\)/);
  assert.match(onglet, /setDecalage\(j\.maintenant - \(t0 \+ t1\) \/ 2\)/);
  assert.match(onglet, /setInterval\(\(\) => setTick\(Date\.now\(\)\), 1_000\)/);
  assert.ok(!/requestAnimationFrame\(/.test(onglet));
});

cas("ce que montre le chrono : en attente, en cours, terminé ; les boutons qui ont un sens", () => {
  const attente = etatChrono(CHRONO_VIDE, ETAPES, T0);
  assert.deepEqual([attente.statut, attente.courante, attente.principal, attente.annuler, attente.arreter], ["attente", 0, { label: "Démarrer", actif: true }, false, false]);
  const enCours = etatChrono(chronoApres(6, 5, 4, 3), ETAPES, T0 + min(21));
  assert.equal(enCours.statut, "en_cours");
  assert.equal(enCours.courante, 4);
  assert.deepEqual(enCours.principal, { label: "Fin : 2.2 Jumeaux", actif: true });
  assert.deepEqual(enCours.lignes.map((l) => l.statut).slice(0, 6), ["fait", "fait", "fait", "fait", "en_cours", "a_venir"]);
  assert.deepEqual([enCours.total, enCours.dansEtape, enCours.depuis], [18 * 60, 3 * 60, T0 + min(18)]);
  assert.deepEqual([enCours.annuler, enCours.arreter], [true, true]);
  const fin = etatChrono(chronoApres(...ETAPES.map(() => 3)), ETAPES, T0 + min(90));
  assert.deepEqual([fin.statut, fin.courante, fin.principal, fin.total, fin.arreteAvantFin, fin.arreter], ["termine", null, { label: "Terminé", actif: false }, 39 * 60, false, false]);
});

const M6 = (o: Partial<MSG.DonneesChrono> = {}) => MSG.messageChrono({
  cle: MERCREDI.cle, jour: "mercredi 21 octobre", etat: "ouvert", chrono: CHRONO_VIDE, etapes: ETAPES,
  texte: RAPPELS_CS_DEFAUT.find((r) => r.type === "chrono")!.texte, vars: {}, joueurs: [], chiffres: false,
  site: "https://genesis.example", maj: T0 + min(21), ...o,
});
const boutonsDe = (m: MSG.MessageSeance) => m.components.flatMap((r) => r.components).map((c) => ("custom_id" in c ? `${(c as { label?: string }).label}|${c.custom_id}` : `${(c as { label?: string }).label}|${(c as { url: string }).url}`));

cas("M6 — le chrono Discord : trois états, l'étape en cours « depuis <t:…:R> », les monstres de l'étape, les boutons sans état", () => {
  const a = M6();
  const ea = a.embeds[0];
  assert.equal(ea.title, "⏱️ Chrono — Chambre du mercredi 21 octobre");
  assert.equal(ea.url, "https://genesis.example/compositions?onglet=chrono");
  assert.equal(ea.description!.split("\n")[0], "▶️ Un membre du staff clique sur Démarrer au lancement de l'instance.");
  assert.ok(ea.description!.includes("\n▫️ 🧟 1.1 480 monstres\n▫️ 🌳 1.2 12 Asuras"));
  assert.equal(ea.color, MSG.COULEUR.crimson);
  assert.deepEqual(boutonsDe(a), ["Démarrer|cs:chrono:cs_2026-10-21_mer:suivante:0", "Suivre sur le site|https://genesis.example/compositions?onglet=chrono"]);
  assert.deepEqual(a.allowedMentions, { parse: [] });

  const c = chronoApres(6.2, 4 + 40 / 60, 3.7, 2 + 58 / 60);
  const b = M6({ chrono: c });
  const eb = b.embeds[0];
  const l = eb.description!.split("\n");
  assert.equal(l[0], `Départ à <t:${Math.floor(T0 / 1000)}:T> · chronométreur : Maxime`);
  assert.equal(l[2], "✅ 🧟 1.1 480 monstres — **6:12**");
  assert.equal(l[3], "✅ 🌳 1.2 12 Asuras — **4:40**");
  assert.equal(l[6], `▶️ **👯 2.2 Jumeaux** — en cours depuis <t:${Math.floor(c.fins[3] / 1000)}:R>`);
  // Décision 8 : les monstres de l'étape en cours, chacun vers sa fiche publique.
  assert.equal(l[7], "　↳ contre : [Kraavus, titan putréfié](https://genesis.example/monstres/MI_CHAMBRE_BOSS_4) · [Kraavos, titan maudit](https://genesis.example/monstres/MI_CHAMBRE_BOSS_6)");
  assert.equal(l[8], "▫️ 🕸️ 3.1 100 araignées");
  assert.equal(eb.color, MSG.COULEUR.or);
  const v = repere(c);
  assert.deepEqual(boutonsDe(b), [
    `Fin : 2.2 Jumeaux|cs:chrono:cs_2026-10-21_mer:suivante:${v}`, `Annuler le dernier clic|cs:chrono:cs_2026-10-21_mer:annuler:${v}`,
    `Arrêter|cs:chrono:cs_2026-10-21_mer:arreter:${v}`, "Suivre sur le site|https://genesis.example/compositions?onglet=chrono",
  ]);
  const em = (m: MSG.MessageSeance, i: number) => (m.components[0].components[i] as { emoji?: { name: string } }).emoji?.name;
  assert.deepEqual([em(b, 0), em(b, 1), em(b, 2)], ["⏭️", "↩️", "⏹️"]);
  // Un monstre sans fiche (les Malphas des Chambres) : son nom seul, sans lien.
  assert.equal(MSG.ligneMonstres(ETAPES[2], "https://genesis.example"), "　↳ contre : Malphas");
  assert.equal(MSG.ligneMonstres(ETAPES[0], "https://genesis.example"), "");

  const fini = M6({ chrono: chronoApres(...ETAPES.map(() => 3)) });
  assert.equal(fini.embeds[0].description!.split("\n")[0], "🏁 Terminé en 39:00");
  assert.equal(fini.embeds[0].color, MSG.COULEUR.vert);
  assert.deepEqual(boutonsDe(fini).map((x) => x.split("|")[0]), ["Annuler le dernier clic", "Suivre sur le site"]);
  const arrete = M6({ chrono: { ...chronoApres(6, 5), fini: true } });
  assert.equal(arrete.embeds[0].description!.split("\n")[0], "🏁 Terminé en 11:00 (arrêté avant la fin)");
  // Fermé (clôture, remplacé) : anthracite, sans boutons.
  const ferme = M6({ chrono: c, etat: "terminee" });
  assert.equal(ferme.embeds[0].title, "⏱️ Chrono — Chambre du mercredi 21 octobre · terminée");
  assert.deepEqual([ferme.embeds[0].color, ferme.components], [MSG.COULEUR.anthracite, []]);
  // La phrase d'attente vient du paramétrage (décision 5) ; un essai n'a aucun bouton actif.
  assert.match(M6({ texte: "On lance à {heure}.", vars: { heure: "21 h" } }).embeds[0].description!, /^▶️ On lance à 21 h\./);
  const essai = MSG.enEssai(b);
  assert.ok(essai.components.flatMap((r) => r.components).every((x) => !("custom_id" in x) || x.custom_id.startsWith("cs:essai:")));
  // Un libellé d'étape très long reste dans les 80 signes d'un bouton ; chaque identifiant dans les 100.
  const longue = ETAPES.map((e) => ({ ...e, label: "Une étape au nom vraiment beaucoup trop long pour tenir sur un seul bouton" }));
  const bl = M6({ chrono: chronoApres(1), etapes: longue });
  assert.ok((bl.components[0].components[0] as { label: string }).label.length <= 80);
  assert.ok(MSG.ID.chrono("cs_2026-10-21_mer", "reinitialiser", 9999).length <= 100);
});

cas("M6 — les joueurs de la séance et leurs dégâts DÉCLARÉS, seulement dans un salon fermé (décision 9)", () => {
  const joueurs = COMPO_TYPE.slice(0, 3);
  const avec = M6({ chrono: chronoApres(6), joueurs, chiffres: true });
  const champ = avec.embeds[0].fields![0];
  assert.equal(champ.name, "👥 Ce soir (3)");
  assert.match(champ.value, /Brann ❤️ 4,9 M sceptre · 7,9 M poing · .*Ysolde ❤️ 6,1 M · .*Thorn 💥 150 k – 210 k\/s/);
  assert.ok(avec.embeds[0].description!.endsWith(MSG.LEGENDE_CHIFFRES));
  const sans = M6({ chrono: chronoApres(6), joueurs, chiffres: false });
  assert.ok(!/❤️|💥/.test(sans.embeds[0].fields![0].value));
  assert.ok(!sans.embeds[0].description!.includes("non vérifiés"));
  assert.deepEqual(M6().embeds[0].fields, []);
});

cas("un non-staff qui clique sur Discord reçoit le refus éphémère ; le bot route chaque bouton du chrono", () => {
  const g = { staff: false, refusSeance: null, action: "suivante" as const, site: "https://genesis.example" };
  assert.equal(MSG.refusChrono(g), "⛔ Seul le staff fait avancer le chrono. Suis-le sur le site : https://genesis.example/compositions?onglet=chrono");
  assert.equal(MSG.refusChrono({ ...g, staff: true }), null);
  assert.equal(MSG.refusChrono({ ...g, staff: true, refusSeance: "Cette séance est annulée : pas de chrono." }), "⚠️ Cette séance est annulée : pas de chrono.");
  assert.match(MSG.refusChrono({ ...g, staff: true, action: "reinitialiser" })!, /se fait sur le site/);
  assert.equal(MSG.CHRONO_EN_RETARD, "⚠️ Le chrono a déjà avancé. Le message est à jour.");
  assert.deepEqual(MSG.clicChronoDuBouton("suivante:7"), { ok: true, action: "suivante", vu: 7 });
  assert.deepEqual(MSG.clicChronoDuBouton("tout:7"), { ok: false });
  const id = MSG.lireId(MSG.ID.chrono(MERCREDI.cle, "arreter", 5))!;
  assert.deepEqual(id, { evenement: "cs", action: "chrono", cle: MERCREDI.cle, reste: "arreter:5" });
  // Le bot : le bouton est routé, le refus part en éphémère APRÈS deferUpdate (piège n° 16), le
  // staff est relu en base, et le clic écrit par la même fonction que la route 6.
  const seances = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  assert.ok(seances.includes(`id.action === "chrono" && id.reste) return cliquerChrono(`));
  assert.match(seances, /async function cliquerChrono[\s\S]*?await i\.deferUpdate\(\);[\s\S]*?flags: EPH[\s\S]*?canAccessAdmin\(user\.role\)[\s\S]*?modifierChrono\(prisma, s, clic\.action, clic\.vu/);
  const route = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/chrono/route.ts"), "utf8");
  assert.match(route, /apiRole\(ADMIN_ROLES\)/);
  assert.match(route, /modifierChrono\(prisma, s, lu\.action, lu\.vu/);
  // `seance_publier` « chrono » est créé par la route 11, jamais ajouté à la route générique.
  const generique = readFileSync(join(process.cwd(), "src/app/api/admin/bot-command/route.ts"), "utf8");
  assert.ok(!/seance_|chrono/.test(generique.split("\n").find((x) => x.includes("ALLOWED")) ?? ""));
});

cas("l'onglet montre d'abord le chrono de la séance qui se joue — hors séance, le dernier terminé", () => {
  const courante = { cle: "cs_2026-10-25_dim", date: "2026-10-25", chrono: null };
  const recents = [{ cle: "cs_2026-10-21_mer", fini: true }, { cle: "cs_2026-10-18_dim", fini: true }];
  assert.equal(chronoParDefaut(courante, recents, "2026-10-23"), "cs_2026-10-21_mer"); // jeudi : hors séance
  assert.equal(chronoParDefaut(courante, recents, "2026-10-25"), "cs_2026-10-25_dim"); // le jour J
  assert.equal(chronoParDefaut({ ...courante, chrono: chronoApres(3) }, recents, "2026-10-23"), "cs_2026-10-25_dim"); // déjà lancé
  assert.equal(chronoParDefaut(courante, [], "2026-10-23"), "cs_2026-10-25_dim");
});

cas("qui joue l'étape : les salles, les jumeaux, le golem de gauche ou de droite, l'araignée — lu sur l'émoji de l'étape", () => {
  const de = (code: string) => momentDe(ETAPES.find((e) => e.code === code)!);
  assert.deepEqual(de("1.2"), { quoi: "salles" });
  assert.deepEqual(de("2.2"), { quoi: "jumeaux" });
  assert.deepEqual(de("3.2"), { quoi: "golems", cote: "gauche" });
  assert.deepEqual(de("3.3"), { quoi: "golems", cote: "droite" });
  assert.deepEqual(de("3.4"), { quoi: "araignee" });
  assert.equal(de("1.1"), null);
  assert.equal(de("5"), null);
  assert.deepEqual(momentDe({ emoji: "🕷", label: "Nyzzara" }), { quoi: "araignee" }); // sans le sélecteur U+FE0F
  assert.deepEqual(momentDe({ emoji: "🗿", label: "Les deux trolls" }), { quoi: "golems", cote: null });
});

cas("contre-examen du lot 5 — l'historique ne dit pas « arrêté » d'un chrono qui tourne ; un compte désactivé ne fait pas avancer le chrono", () => {
  // Bilans (route 13) : un chrono en cours n'a ni temps ni « arrêté » ; il dit « en cours ».
  assert.deepEqual(tempsDeSeance(chronoApres(6, 5), ETAPES.length), { total: null, arrete: false, chronoEnCours: true });
  assert.deepEqual(tempsDeSeance({ ...chronoApres(6, 5), fini: true }, ETAPES.length), { total: 660, arrete: true, chronoEnCours: false });
  assert.deepEqual(tempsDeSeance(chronoApres(...ETAPES.map(() => 3)), ETAPES.length), { total: 39 * 60, arrete: false, chronoEnCours: false });
  assert.deepEqual(tempsDeSeance(CHRONO_VIDE, ETAPES.length), { total: null, arrete: false, chronoEnCours: false });
  assert.deepEqual(tempsDeSeance({ ...chronoApres(), fini: true }, ETAPES.length), { total: null, arrete: false, chronoEnCours: false });
  const route = readFileSync(join(process.cwd(), "src/app/api/seances/historique/route.ts"), "utf8");
  // Lot 6 : le temps retenu par le débrief, avec la même règle pour un chrono qui tourne.
  assert.match(route, /\.\.\.tempsDuBilan\(resume, lireChrono\(s\.chrono\)\)/);
  const bilans = readFileSync(join(process.cwd(), "src/components/chambres/Bilans.tsx"), "utf8");
  assert.match(bilans, /s\.chronoEnCours \? <span[^>]*>en cours<\/span>/);
  // Le bot : un rang staff EN BASE ne vaut que pour un compte actif ; le message cliqué qui ne se
  // met pas à jour ne fait pas croire que le clic est perdu.
  const seances = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  assert.match(seances, /isStaff\(i\.member as GuildMember \| null\) \|\| \(!!user && user\.isActive && canAccessAdmin\(user\.role\)\)/);
  assert.match(seances, /async function cliquerChrono[\s\S]*?modifierChrono\([\s\S]*?try \{[\s\S]*?i\.editReply[\s\S]*?\} catch/);
});

/* ══ Lot 6 — les débriefs sur le site (§4.1, §4.10, §7.5) ═════════════════════════════════
   Les quatre vérifications du §14, l'import du 18/10/2026 (décision 11), et les règles pures
   qui les portent : la saisie, le résumé, l'analyse, ce que voit un membre. */
console.log("\nLot 6 — les débriefs");

/** Un résumé sur la liste par défaut, avec ces chronos (minutes) et ces statuts par code. */
const resumeAvec = (chronos: (number | null)[], statuts: Record<string, StatutEtape> = {}, resultat: IssueSeance | null = "gagne") =>
  resumeDebrief(ETAPES, Object.fromEntries(ETAPES.map((e, i) => [e.code, { statut: statuts[e.code] ?? null, chrono: chronos[i] === null || chronos[i] === undefined ? null : chronos[i]! * 60, remarque: "" }])), CHRONO_VIDE, resultat, "");
const COMPLET = (m: number) => ETAPES.map(() => m);
const comparee = (cle: string, r: ReturnType<typeof resumeAvec>) => ({ cle, date: cle.slice(3, 13), resume: r });
const JSON_18 = JSON.parse(readFileSync(join(process.cwd(), FICHIER_18), "utf8"));
const soir = () => paris("2026-10-21", "23:00").getTime();

cas("« 2m34 », « 1:02:03 », « 45 » et « 1h02 » donnent 154, 3 723, 45 et 3 720 s (§4.1)", () => {
  assert.equal(lireDuree("2m34"), 154);
  assert.equal(lireDuree("1:02:03"), 3723);
  assert.equal(lireDuree("45"), 45);
  assert.equal(lireDuree("1h02"), 3720); // l'écart voulu au modèle, qui donnait 3 602
  assert.equal(lireDuree("1h2m3s"), 3723);
  assert.equal(lireDuree("45s"), 45);
  assert.equal(lireDuree("2:34"), 154);
  assert.equal(lireDuree("2 min 34"), 154);
  assert.equal(lireDuree(" 6 : 12 "), 372);
  assert.equal(lireDuree("1h"), 3600);
  assert.equal(lireDuree("1H30M"), 5400);
  assert.equal(lireDuree(""), null); // vide : reprendre la mesure
  assert.equal(lireDuree("   "), null);
  assert.equal(lireDuree(null), null);
  for (const x of ["abc", "2:3:4:5", "1,5", "-3", "2m34x", ":12", {}]) assert.equal(lireDuree(x), undefined, String(x));
});

cas("un écart : « −m:ss » plus rapide, « +m:ss » plus lent, « = » le même ; rien si un temps manque", () => {
  assert.deepEqual(ecart(2537, 2620), { texte: "−1:23", signe: -1 });
  assert.deepEqual(ecart(2620, 2569), { texte: "+0:51", signe: 1 });
  assert.deepEqual(ecart(372.4, 372), { texte: "=", signe: 0 });
  assert.deepEqual(ecart(4000, 300), { texte: "+1:01:40", signe: 1 });
  assert.equal(ecart(null, 300), null);
  assert.equal(ecart(300, undefined), null);
});

cas("une saisie vidée fait revenir la mesure du chrono", () => {
  const c = chronoApres(6.2, 4);
  const e0 = { notes: {}, resultat: null, aRetenir: "" };
  const a1 = appliquerDebrief(e0, { etapes: { "1.1": { chrono: "6:30" } } }, ETAPES);
  assert.ok(a1.ok);
  assert.equal(a1.etat.notes["1.1"].chrono, 390);
  let r = resumeDebrief(ETAPES, a1.etat.notes, c, null, "");
  assert.deepEqual([r.lignes[0].chrono, r.lignes[0].mesure, r.lignes[0].saisi], [390, 372, true]);
  const a2 = appliquerDebrief(a1.etat, { etapes: { "1.1": { chrono: "" } } }, ETAPES);
  assert.ok(a2.ok);
  assert.equal(a2.message, "1.1 480 monstres : chrono repris de la mesure.");
  assert.equal(a2.etat.notes["1.1"], undefined); // plus rien de saisi : la note vide disparaît
  r = resumeDebrief(ETAPES, a2.etat.notes, c, null, "");
  assert.deepEqual([r.lignes[0].chrono, r.lignes[0].saisi], [372, false]);
  assert.equal(r.lignes[1].chrono, 240);
  assert.equal(r.lignes[2].chrono, null); // ni mesure ni saisie
  assert.equal(r.total, 612);
  assert.equal(r.complet, false);
  assert.equal(chronoEtape({ statut: null, chrono: 0, remarque: "" }, 50), 0); // une saisie à 0 reste une saisie
});

cas("une saisie : étape inconnue, chrono illisible, remarque et « à retenir » trop longs sont refusés, avec leur raison", () => {
  const e0 = { notes: { "2.2": { statut: "bien" as const, chrono: null, remarque: "ok" } }, resultat: null, aRetenir: "" };
  const non = (p: Parameters<typeof appliquerDebrief>[1]) => { const r = appliquerDebrief(e0, p, ETAPES); assert.equal(r.ok, false); return (r as { message: string }).message; };
  assert.equal(non({ etapes: { "9.9": { statut: "mal" } } }), "Étape inconnue : 9.9. Le déroulé de cette séance ne la compte pas.");
  assert.equal(non({ etapes: { "2.2": { chrono: "deux minutes" } } }), "Chrono illisible : écris par exemple 2:34 ou 45s."); // bot.py:2035-2037
  assert.match(non({ etapes: { "2.2": { chrono: "7h" } } }), /trop long \(7:00:00\) : 6 h au plus/);
  assert.equal(non({ etapes: { "2.2": { remarque: "x".repeat(301) } } }), "La remarque de 2.2 fait 301 signes : 300 au plus.");
  assert.equal(non({ aRetenir: "y".repeat(1001) }), "« À retenir » fait 1001 signes : 1000 au plus.");
  // Rien n'a bougé : la copie seule est touchée.
  assert.equal(e0.notes["2.2"].remarque, "ok");
  const ok = appliquerDebrief(e0, { etapes: { "2.2": { statut: "mal", remarque: "  Kraavos mort 9 s après  " } }, resultat: "gagne", aRetenir: " Équilibrer avant de lancer. " }, ETAPES);
  assert.ok(ok.ok);
  assert.deepEqual(ok.etat.notes["2.2"], { statut: "mal", chrono: null, remarque: "Kraavos mort 9 s après" });
  assert.equal(ok.etat.aRetenir, "Équilibrer avant de lancer.");
  assert.equal(ok.message, "2.2 Jumeaux : mal, remarque enregistrée · Résultat : gagné · « À retenir » enregistré.");
  // Le corps de la route 7, relu sans confiance : la forme seulement.
  assert.deepEqual(lirePatchDebrief({ etapes: { "2.2": { statut: "moyen", chrono: 95 } } }), { ok: true, patch: { etapes: { "2.2": { statut: "moyen", chrono: "95" } } } });
  assert.deepEqual(lirePatchDebrief({ resultat: null }), { ok: true, patch: { resultat: null } });
  assert.equal(lirePatchDebrief({ etapes: { "2.2": { statut: "excellent" } } }).ok, false);
  assert.equal(lirePatchDebrief({ resultat: "nul" }).ok, false);
  assert.equal(lirePatchDebrief({ etapes: [] }).ok, false);
  assert.equal(lirePatchDebrief({}).ok, false);
  assert.equal(lirePatchDebrief(null).ok, false);
});

cas("le débrief relu sans confiance ; écrit sans notes vides ; l'import garde sa clé, que nulle étape ne peut porter", () => {
  const lu = lireDebrief({ "1.1": { statut: "bien", chrono: 372, remarque: "r" }, "2.2": { statut: "génial", chrono: -4, remarque: 3 }, "3.1": {}, "_import": { joueurs: 10, source: "image", le: 5 }, "bad key!": { statut: "mal" } });
  assert.deepEqual(lu.notes, { "1.1": { statut: "bien", chrono: 372, remarque: "r" } });
  assert.deepEqual(lu.importe, { joueurs: 10, source: "image", le: 5 });
  assert.deepEqual(lireDebrief("abîmé"), { notes: {}, importe: null });
  assert.equal(RE_CODE_ETAPE.test("_import"), false);
  assert.deepEqual(ecrireDebrief({ notes: { "1.1": { statut: null, chrono: null, remarque: "" }, "1.2": { statut: "mal", chrono: null, remarque: "" } }, importe: null }),
    { "1.2": { statut: "mal", chrono: null, remarque: "" } });
});

cas("pas de record au premier débrief, ni sur un chrono arrêté avant la fin (§4.10, point 3)", () => {
  const premier = analyseDebrief(resumeAvec(COMPLET(3)), []);
  assert.equal(premier.record, false); // le modèle le proclamait (bot.py:2089)
  assert.equal(premier.precedent, null);
  assert.equal(premier.ecartTotal, null);
  const avant = comparee("cs_2026-10-18_dim", resumeAvec(COMPLET(4)));
  assert.equal(analyseDebrief(resumeAvec(COMPLET(3)), [avant]).record, true);
  assert.equal(analyseDebrief(resumeAvec(COMPLET(4)), [avant]).record, false); // égal n'est pas un record
  // Arrêté en Phase 2 : un total court (5 étapes), jamais un record.
  const arrete = resumeAvec([3, 3, 3, 3, 3, null, null, null, null, null, null, null, null]);
  assert.equal(arrete.complet, false);
  assert.equal(analyseDebrief(arrete, [avant]).record, false);
  // Un précédent PARTIEL ne compte pas pour le record : il faut un précédent complet.
  const partielAvant = comparee("cs_2026-10-18_dim", resumeAvec([1, 1, null, null, null, null, null, null, null, null, null, null, null]));
  assert.equal(analyseDebrief(resumeAvec(COMPLET(3)), [partielAvant]).record, false);
  // Les chronos d'un chrono arrêté, complétés à la main au débrief : la séance redevient complète.
  const complete = resumeDebrief(ETAPES, Object.fromEntries(ETAPES.slice(2).map((e) => [e.code, { statut: null, chrono: 120, remarque: "" }])), chronoApres(3, 3), null, "");
  assert.equal(complete.complet, true);
  assert.equal(complete.total, 6 * 60 + 11 * 120);
});

cas("« mal deux fois de suite » ne compare qu'avec la dernière séance PUBLIÉE et antérieure", () => {
  const t = (cle: string) => seanceCS(cle.slice(3, 13), cle.endsWith("mer") ? "mer" : "dim").debut.getTime();
  const toutes = [
    { cle: "cs_2026-10-14_mer", debut: t("cs_2026-10-14_mer"), publie: true },
    { cle: "cs_2026-10-18_dim", debut: t("cs_2026-10-18_dim"), publie: false }, // brouillon : ignoré
    { cle: "cs_2026-10-25_dim", debut: t("cs_2026-10-25_dim"), publie: true },  // après : ignorée
    { cle: "cs_2026-10-21_mer", debut: t("cs_2026-10-21_mer"), publie: true },  // elle-même
    { cle: "cs_2026-10-11_dim", debut: t("cs_2026-10-11_dim"), publie: true },
  ];
  assert.deepEqual(precedentsDe(toutes, { cle: "cs_2026-10-21_mer", debut: t("cs_2026-10-21_mer") }).map((x) => x.cle), ["cs_2026-10-11_dim", "cs_2026-10-14_mer"]);
  // Le 14 (publié, juste avant) avait 3.4 « mal » ; le 11, 3.2. Ce soir : 3.2 et 3.4 « mal ».
  const ce = resumeAvec(COMPLET(3), { "3.2": "mal", "3.4": "mal", "4.2": "mal" });
  const a = analyseDebrief(ce, [
    comparee("cs_2026-10-11_dim", resumeAvec(COMPLET(3), { "3.2": "mal" })),
    comparee("cs_2026-10-14_mer", resumeAvec(COMPLET(3), { "3.4": "mal", "4.2": "moyen" })),
  ]);
  assert.deepEqual(a.malDeuxFois, [{ code: "3.4", label: "Araignée (Nyzarra)" }]);
  assert.deepEqual(a.precedent, { cle: "cs_2026-10-14_mer", date: "2026-10-14" });
  assert.deepEqual(analyseDebrief(ce, []).malDeuxFois, []);
});

cas("l'écart total seulement entre deux séances complètes (« temps partiel » sinon) ; les écarts par étape restent", () => {
  const avant = comparee("cs_2026-10-18_dim", resumeAvec(COMPLET(4)));
  const a = analyseDebrief(resumeAvec([3, ...COMPLET(4).slice(1)]), [avant]);
  assert.deepEqual(a.ecartTotal, { texte: "−1:00", signe: -1 });
  assert.equal(a.sansEcart, null);
  assert.deepEqual(a.ecarts["1.1"], { texte: "−1:00", signe: -1 });
  assert.deepEqual(a.ecarts["1.2"], { texte: "=", signe: 0 });
  const partiel = analyseDebrief(resumeAvec([5, 5, null, ...COMPLET(4).slice(3)]), [avant]);
  assert.equal(partiel.ecartTotal, null);
  assert.equal(partiel.sansEcart, "partiel");
  assert.deepEqual(partiel.ecarts["1.1"], { texte: "+1:00", signe: 1 }); // par étape, toujours
  assert.equal(partiel.ecarts["1.3"], null);
  const precPartiel = analyseDebrief(resumeAvec(COMPLET(3)), [comparee("cs_2026-10-18_dim", resumeAvec([4, null, ...COMPLET(4).slice(2)]))]);
  assert.equal(precPartiel.sansEcart, "precedent_partiel");
  // Une étape absente de l'une des deux (le déroulé a changé entre-temps) n'a pas d'écart.
  const sans22 = { ...avant, resume: { ...avant.resume, lignes: avant.resume.lignes.filter((l) => l.etape.code !== "2.2") } };
  assert.equal(analyseDebrief(resumeAvec(COMPLET(3)), [sans22]).ecarts["2.2"], null);
});

cas("l'étape la plus longue, sa part du temps ; le parcours passe à la suivante et s'arrête à la dernière", () => {
  const r = resumeAvec([6.2, 4, 3, 3, 6.2, ...COMPLET(2).slice(5)]);
  const a = analyseDebrief(r, []);
  assert.deepEqual(a.plusLongue, { code: "1.1", label: "480 monstres", duree: 372, part: Math.round((100 * 372) / r.total) }); // à égalité, la première
  assert.equal(analyseDebrief(resumeAvec(ETAPES.map(() => null)), []).plusLongue, null);
  assert.equal(etapeSuivante(0, 13), 1);
  assert.equal(etapeSuivante(12, 13), 12);
  assert.equal(etapeSuivante(0, 0), 0);
  assert.deepEqual(r.manquants, ETAPES.map((e) => e.code));
  assert.deepEqual(resumeAvec(COMPLET(3), Object.fromEntries(ETAPES.slice(0, 12).map((e) => [e.code, "bien" as const]))).manquants, ["5"]);
});

cas("l'historique : le temps retenu par le débrief ; « en cours » pour un chrono qui tourne ; un membre ne voit que la mesure avant publication", () => {
  const row = { etapes: { etapes: ETAPES, phases: CS0.phases }, chrono: { ...chronoApres(6, 5), fini: true }, debrief: { "1.1": { statut: "bien", chrono: 300, remarque: "" }, "1.3": { statut: null, chrono: 240, remarque: "" } }, resultat: "gagne", aRetenir: "Tenir l'aggro" };
  const staff = resumeDeSeance(row, CS0);
  assert.equal(staff.resume.total, 300 + 300 + 240);
  assert.deepEqual(tempsDuBilan(staff.resume, lireChrono(row.chrono)), { total: 840, partiel: true, chronoEnCours: false });
  const membre = resumeDeSeance(row, CS0, false);
  assert.equal(membre.resume.total, 660); // la mesure seule
  assert.equal(membre.resume.resultat, null);
  assert.equal(membre.resume.aRetenir, "");
  assert.deepEqual(tempsDuBilan(staff.resume, chronoApres(6, 5)), { total: null, partiel: false, chronoEnCours: true });
  assert.deepEqual(tempsDuBilan(resumeAvec(COMPLET(3)), CHRONO_VIDE), { total: 39 * 60, partiel: false, chronoEnCours: false });
  // La liste figée de la séance l'emporte sur le paramétrage, et elle se compare sur le code.
  assert.equal(resumeDeSeance({ ...row, etapes: null }, { etapes: ETAPES.slice(0, 2), phases: CS0.phases }).resume.lignes.length, 2);
});

cas("le débrief du 18/10/2026 : 13 étapes, statuts et remarques MOT POUR MOT, aucun chrono, gagné, 10 joueurs (décision 11)", () => {
  const lu = lireDebriefImporte(JSON_18);
  assert.ok(lu.ok, JSON.stringify(lu));
  const d = lu.d;
  assert.equal(d.cle, "cs_2026-10-18_dim");
  assert.equal(d.etapes.length, 13);
  assert.deepEqual(d.etapes.map((e) => [e.code, e.label, e.phase]), JSON_18.etapes.map((e: { code: string; label: string; phase: string }) => [e.code, e.label, e.phase]));
  assert.deepEqual(d.phases, JSON_18.phases);
  for (const e of JSON_18.etapes as { code: string; statut: string; remarque: string }[]) {
    assert.equal(d.notes[e.code]?.statut, e.statut, e.code);
    assert.equal(d.notes[e.code]?.remarque, e.remarque, e.code); // pas même un espace retiré
    assert.equal(d.notes[e.code]?.chrono, null);
  }
  assert.equal(d.notes["3.2"].remarque, "Ener n'a pas fait attention aux changement d'arme pour avoir les bon hp,");
  assert.equal(d.resultat, "gagne");
  assert.equal(d.joueurs, 10);
  assert.equal(d.aRetenir, "");
  // L'émoji et les monstres, que l'image ne montrait pas, viennent du déroulé par défaut.
  assert.equal(d.etapes.find((e) => e.code === "2.2")?.emoji, "👯");
  assert.deepEqual(d.etapes.find((e) => e.code === "5")?.monstres.map((m) => m.id), ["MI_CHAMBRE_BOSS_1"]);
  // Sans chrono : un temps total nul, ni record ni écart ; le résumé dit tout ce qui a été noté.
  const r = resumeDebrief(d.etapes, d.notes, CHRONO_VIDE, d.resultat, d.aRetenir);
  assert.deepEqual([r.total, r.complet, r.manquants], [0, false, []]);
  const a = analyseDebrief(r, []);
  assert.deepEqual([a.record, a.ecartTotal, a.plusLongue, a.sansEcart], [false, null, null, null]);
  // Comparé à lui, le mercredi suivant voit ses « mal deux fois de suite » (3.2, 3.3, 4.2).
  const mercredi = resumeDebrief(ETAPES, { "3.2": { statut: "mal", chrono: null, remarque: "" }, "4.2": { statut: "mal", chrono: null, remarque: "" }, "5": { statut: "mal", chrono: null, remarque: "" } }, CHRONO_VIDE, "gagne", "");
  assert.deepEqual(analyseDebrief(mercredi, [{ cle: d.cle, date: d.date, resume: r }]).malDeuxFois.map((x) => x.code), ["3.2", "4.2"]);
});

cas("l'import refuse un fichier douteux, avec la liste des raisons", () => {
  const faux = structuredClone(JSON_18);
  faux.date = "2026-10-19"; // un lundi
  faux.etapes[1].statut = "super";
  faux.etapes[2].remarque = "x".repeat(301);
  faux.etapes[3].code = "1.1"; // en double
  faux.joueurs = 0;
  const lu = lireDebriefImporte(faux);
  assert.equal(lu.ok, false);
  assert.deepEqual((lu as { erreurs: string[] }).erreurs, [
    "Le 2026-10-19 n'est pas un dimanche.",
    "Étape « 1.2 » : statut « super » inconnu.",
    "Étape « 1.3 » : remarque de 301 signes, 300 au plus.",
    "Étape « 1.1 » : en double.",
    "Le nombre de joueurs va de 1 à 100, ou reste null.",
  ]);
  assert.equal(lireDebriefImporte({ ...JSON_18, evenement: "gs" }).ok, false);
});

cas("l'import est idempotent : relancé, rien ne change ; il n'écrase jamais un débrief fait sur le site", () => {
  const d = (lireDebriefImporte(JSON_18) as { d: Parameters<typeof planImport>[1] }).d;
  const t0 = Date.parse("2026-10-21T15:00:00+02:00");
  const p1 = planImport(null, d, t0);
  assert.equal(p1.quoi, "ecrire");
  const w = (p1 as Extract<typeof p1, { quoi: "ecrire" }>).data;
  assert.equal(w.debriefPar, "Import");
  assert.equal(w.debriefPublieAt.getTime(), t0);
  assert.equal(w.aRetenir, null);
  assert.deepEqual(lireDebrief(w.debrief).importe, { joueurs: 10, source: "Image « Retour Chambre — 18/10/2026 » du bot Python, retranscrite mot pour mot", le: t0 });
  // La séance telle que l'import l'a laissée : relancé une heure plus tard, rien à faire.
  const apres = { annulee: false, etapes: w.etapes, debrief: structuredClone(w.debrief), resultat: w.resultat, aRetenir: w.aRetenir, debriefPublieAt: w.debriefPublieAt, debriefPar: w.debriefPar };
  assert.deepEqual(planImport(apres, d, t0 + 3_600_000), { quoi: "rien", message: "Le débrief du dimanche 18 octobre est déjà importé, à l'identique : rien n'a changé." });
  // Le fichier corrigé : réimporté, avec les dates du premier passage.
  const corrige = { ...d, notes: { ...d.notes, "1.1": { statut: "moyen" as const, chrono: null, remarque: "" } } };
  const p3 = planImport(apres, corrige, t0 + 7_200_000);
  assert.equal(p3.quoi, "ecrire");
  assert.equal((p3 as Extract<typeof p3, { quoi: "ecrire" }>).data.debriefPublieAt.getTime(), t0);
  assert.equal(lireDebrief((p3 as Extract<typeof p3, { quoi: "ecrire" }>).data.debrief).importe?.le, t0);
  // Contre-vérification : l'import RETOUCHÉ sur le site (une note du staff signe `debriefPar`),
  // ou repassé en brouillon, n'est jamais réécrit — relancer l'import effacerait ce travail.
  const retouche = { ...apres, debrief: { ...structuredClone(w.debrief), "3.2": { statut: "mal", chrono: 95, remarque: "Ener sans sceptre" } }, debriefPar: "Maxime" };
  assert.deepEqual(planImport(retouche, d, t0 + 3_600_000), { quoi: "refus", message: "Le débrief du dimanche 18 octobre a été repris sur le site depuis l'import (par Maxime) : l'import ne l'écrase pas." });
  assert.equal(planImport(retouche, corrige, t0 + 3_600_000).quoi, "refus");
  assert.deepEqual(planImport({ ...apres, debriefPublieAt: null }, d, t0 + 3_600_000), { quoi: "refus", message: "Le débrief du dimanche 18 octobre a été repris sur le site depuis l'import (repassé en brouillon) : l'import ne l'écrase pas." });
  // Republié tel quel par le staff : rien à faire (pas de refus pour rien).
  assert.equal(planImport({ ...apres, debriefPar: "Lina" }, d, t0 + 3_600_000).quoi, "rien");
  // Le fichier embarqué par l'image (src/data) est, octet pour octet, la retranscription d'origine.
  if (existsSync(join(process.cwd(), ORIGINE_18))) {
    assert.equal(readFileSync(join(process.cwd(), FICHIER_18), "utf8"), readFileSync(join(process.cwd(), ORIGINE_18), "utf8"));
  }
  assert.match(readFileSync(join(process.cwd(), "scripts/importer-debrief.ts"), "utf8"), /const DEFAUT = "src\/data\/chambres-debrief-2026-10-18\.json";/);
  // Un débrief fait sur le site, une séance chronométrée ici, une séance annulée : refusé.
  const vide = { annulee: false, etapes: null, debrief: null, resultat: null, aRetenir: null, debriefPublieAt: null };
  assert.equal(planImport({ ...vide, debrief: { "1.1": { statut: "bien" } } }, d, t0).quoi, "refus");
  assert.equal(planImport({ ...vide, resultat: "perdu" }, d, t0).quoi, "refus");
  assert.equal(planImport({ ...vide, etapes: { etapes: ETAPES, phases: CS0.phases } }, d, t0).quoi, "refus");
  assert.equal(planImport({ ...vide, annulee: true }, d, t0).quoi, "refus");
  assert.equal(planImport(vide, d, t0).quoi, "ecrire"); // une ligne vide (clôture, panneau…) : on écrit
});

/** Une base en mémoire qui se comporte comme Prisma sur ce que `modifierDebrief` et
 *  `marquerDebriefPublie` appellent : toute colonne du patch est écrite. */
function baseDebrief(init: Record<string, unknown> = {}) {
  let row: Record<string, unknown> & { version: number } = {
    id: "d", cle: MERCREDI.cle, version: 0, chrono: null, etapes: null, debrief: null, resultat: null, aRetenir: null,
    debriefPar: null, debriefPublieAt: null, annulee: false, clotureAt: null, ...init,
  };
  const db = {
    seanceGuilde: {
      upsert: async () => { await new Promise((r) => setTimeout(r, 1)); return structuredClone(row); },
      updateMany: async ({ where, data }: { where: { version: number }; data: Record<string, unknown> }) => {
        if (where.version !== row.version) return { count: 0 };
        const propre = Object.fromEntries(Object.entries(data).filter(([k]) => k !== "version").map(([k, v]) => [k, v === Prisma.DbNull ? null : structuredClone(v)]));
        row = { ...row, ...propre, version: row.version + 1 };
        return { count: 1 };
      },
      findUniqueOrThrow: async () => structuredClone(row),
      findUnique: async () => structuredClone(row),
    },
    $transaction: async <T,>(f: (tx: unknown) => Promise<T>) => f(db),
  };
  return { db: db as never, lire: () => row };
}

cas("une note fige la liste d'étapes ; deux notes simultanées sur deux étapes sont gardées toutes les deux", async () => {
  const b = baseDebrief();
  const reduit = { etapes: ETAPES.slice(0, 3), phases: { "1": "Phase 1 — Chambres" } };
  const [x, y] = await Promise.all([
    modifierDebrief(b.db, MERCREDI, { etapes: { "1.1": { statut: "bien" } } }, "Maxime", reduit, soir),
    modifierDebrief(b.db, MERCREDI, { etapes: { "1.2": { statut: "mal", remarque: "trop lents" } }, resultat: "perdu" }, "Lina", reduit, soir),
  ]);
  assert.ok(x.ok && y.ok);
  const notes = lireDebrief(b.lire().debrief).notes;
  assert.deepEqual(Object.keys(notes).sort(), ["1.1", "1.2"]);
  assert.equal(b.lire().resultat, "perdu");
  assert.deepEqual(lireDeroule(b.lire().etapes)?.etapes.map((e) => e.code), ["1.1", "1.2", "1.3"]);
  // Le paramétrage change ensuite : la séance garde sa liste ; une étape qu'elle n'a pas est refusée.
  const r = await modifierDebrief(b.db, MERCREDI, { etapes: { "2.2": { statut: "bien" } } }, "Maxime", CS0, soir);
  assert.deepEqual(r, { ok: false, status: 400, message: "Étape inconnue : 2.2. Le déroulé de cette séance ne la compte pas." });
  // Une seule écriture qui touche « debriefPar » : le dernier qui a écrit.
  await modifierDebrief(b.db, MERCREDI, { aRetenir: "Équilibrer les jumeaux" }, "Brann", CS0, soir);
  assert.equal(b.lire().debriefPar, "Brann");
  assert.deepEqual(Object.keys(lireDebrief(b.lire().debrief).notes).sort(), ["1.1", "1.2"]); // « à retenir » ne touche pas aux notes
});

cas("une séance annulée ou pas encore jouée n'a pas de débrief ; publier : jamais vide, nomme les étapes sans statut, se retire", async () => {
  const avant = await modifierDebrief(baseDebrief().db, MERCREDI, { resultat: "gagne" }, "Maxime", CS0, () => paris("2026-10-21", "20:00").getTime());
  assert.deepEqual(avant, { ok: false, status: 409, message: "Cette séance n'a pas encore eu lieu : on débriefe une séance jouée." });
  const annulee = await modifierDebrief(baseDebrief({ annulee: true }).db, MERCREDI, { resultat: "gagne" }, "Maxime", CS0, soir);
  assert.deepEqual(annulee, { ok: false, status: 409, message: "Cette séance est annulée : pas de débrief." });
  const b = baseDebrief();
  const rien = await marquerDebriefPublie(b.db, MERCREDI, "Maxime", CS0, {}, soir);
  assert.deepEqual(rien, { ok: false, status: 409, message: "Rien à publier : note au moins une étape, ou le résultat." });
  await modifierDebrief(b.db, MERCREDI, { etapes: Object.fromEntries(ETAPES.filter((e) => !["3.2", "4.1"].includes(e.code)).map((e) => [e.code, { statut: "bien" as const }])) }, "Maxime", CS0, soir);
  const pub = await marquerDebriefPublie(b.db, MERCREDI, "Lina", CS0, {}, soir);
  assert.ok(pub.ok);
  assert.deepEqual(pub.manquants, ["3.2", "4.1"]);
  assert.equal(pub.message, "Débrief publié sur le site : tous les membres le lisent dans Bilans. Étapes sans statut : 3.2, 4.1.");
  assert.equal((b.lire().debriefPublieAt as Date).getTime(), soir());
  assert.equal(b.lire().debriefPar, "Lina");
  const brouillon = await marquerDebriefPublie(b.db, MERCREDI, "Lina", CS0, { retirer: true }, soir);
  assert.ok(brouillon.ok);
  assert.equal(b.lire().debriefPublieAt, null);
  assert.equal((await marquerDebriefPublie(b.db, MERCREDI, "Lina", CS0, { retirer: true }, soir)).ok, false);
  // Un geste refusé ne fait pas naître la séance : elle s'afficherait vide dans l'historique.
  let creees = 0;
  const sansLigne = { seanceGuilde: { findUnique: async () => null, upsert: async () => { creees++; throw new Error("séance créée"); } } } as never;
  assert.deepEqual(await modifierDebrief(sansLigne, MERCREDI, { etapes: { "1.1": { chrono: "deux" } } }, "Maxime", CS0, soir),
    { ok: false, status: 400, message: "Chrono illisible : écris par exemple 2:34 ou 45s." });
  assert.equal((await modifierDebrief(sansLigne, MERCREDI, { resultat: "gagne" }, "Maxime", CS0, () => paris("2026-10-21", "20:00").getTime())).ok, false);
  assert.equal((await marquerDebriefPublie(sansLigne, MERCREDI, "Maxime", CS0, {}, soir)).ok, false);
  assert.equal(creees, 0);
});

cas("ce que voit un membre : rien avant la publication ; après, les présents et leurs chiffres FIGÉS à la clôture — jamais un caché", async () => {
  const fige = (texte: string, valeur: number) => ({ role: "dps" as const, valeur, texte, arme: null, mesureLe: jour("2026-09-01"), aRemesurer: true });
  const p = (pseudo: string, userId: string, present: boolean, details: Record<string, unknown>) => ({ id: pseudo, seanceId: "d", pseudo, classe: "Arcaniste", player: pseudo.toLowerCase(), userId, slotId: null, annonceAt: null, present, details, createdAt: new Date(), updatedAt: new Date() });
  const ligne = {
    id: "d", cle: MERCREDI.cle, evenement: "cs", date: MERCREDI.date, creneau: "mer", debut: MERCREDI.debut, annulee: false, version: 3,
    etapes: { etapes: ETAPES, phases: CS0.phases }, chrono: null, debrief: { "2.2": { statut: "mal", chrono: 372, remarque: "Kraavos mort 9 s après" } },
    resultat: "gagne", aRetenir: "Équilibrer", debriefPar: "Maxime", debriefPublieAt: null as Date | null, clotureAt: new Date(soir()),
    participants: [
      p("Kaelis", "u1", true, { poste: "Arcaniste", role: "mag", enLigne: "182 k/s", chiffres: [fige("182 k/s", 182_000)], salles: ["s3", "s4"], jumeau: "rouge_mag" }),
      p("Mira", "u2", false, { poste: "Arcaniste", role: "mag", enLigne: "190 k/s", chiffres: [], salles: [], jumeau: null }),
      p("Cache", "u3", true, { poste: null, role: "mag", enLigne: "1 M/s", chiffres: [], salles: [], jumeau: "vert_mag" }),
    ],
  };
  const db = {
    seanceGuilde: { findMany: async () => [] },
    user: { findMany: async () => [{ id: "u1", role: "VETERAN", isActive: true, cacheLe: null }, { id: "u2", role: "GUARD", isActive: true, cacheLe: null }, { id: "u3", role: "VETERAN", isActive: true, cacheLe: new Date() }] },
  } as never;
  const estMoi = (x: { userId: string | null }) => x.userId === "u1";
  const membreAvant = await vueDebrief(db, ligne as never, CS0, { staff: false, estMoi });
  assert.deepEqual([membreAvant.resume, membreAvant.analyse, membreAvant.saisies, membreAvant.joueurs, membreAvant.par], [null, null, null, [], null]);
  const publie = { ...ligne, debriefPublieAt: new Date(soir()) };
  const membre = await vueDebrief(db, publie as never, CS0, { staff: false, estMoi });
  assert.equal(membre.resume?.lignes.find((l) => l.etape.code === "2.2")?.remarque, "Kraavos mort 9 s après");
  assert.equal(membre.saisies, null); // les saisies brutes : le staff seul
  assert.deepEqual(membre.joueurs.map((j) => [j.pseudo, j.moi, j.enLigne, j.salles, j.jumeau]), [["Kaelis", true, "182 k/s", ["s3", "s4"], "rouge_mag"]]);
  assert.equal(membre.joueurs[0].chiffres[0].aRemesurer, true); // daté, avec son témoin
  assert.deepEqual([membre.nbJoueurs, membre.nbJoueursSource], [1, "cloture"]); // le caché ne compte pas
  const staff = await vueDebrief(db, ligne as never, CS0, { staff: true, estMoi });
  assert.deepEqual(staff.joueurs.map((j) => [j.pseudo, j.present]), [["Kaelis", true], ["Mira", false]]);
  assert.ok(staff.saisies && staff.resume && staff.analyse);
  // Le paramétrage masque les dégâts dans les bilans : plus aucun chiffre.
  const sans = await vueDebrief(db, publie as never, { ...CS0, degats: { ...CS0.degats, bilans: false } }, { staff: false, estMoi });
  assert.deepEqual([sans.joueurs[0].enLigne, sans.joueurs[0].chiffres], ["", []]);
  // Un débrief importé, sans clôture : combien ils étaient, sans dire qui.
  const imp = await vueDebrief(db, { ...publie, clotureAt: null, participants: [], debrief: { ...publie.debrief, _import: { joueurs: 10, source: "image", le: 1 } } } as never, CS0, { staff: false, estMoi });
  assert.deepEqual([imp.nbJoueurs, imp.nbJoueursSource, imp.joueurs, imp.importe], [10, "import", [], { joueurs: 10, source: "image" }]);
});

cas("les routes du débrief : staff seulement ; la commande Discord, côté serveur, seulement après la bascule (lot 7)", () => {
  const r7 = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/debrief/route.ts"), "utf8");
  const r8 = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/debrief/publier/route.ts"), "utf8");
  const r14 = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/debrief/image/route.ts"), "utf8");
  for (const r of [r7, r8, r14]) assert.match(r, /const a = await apiRole\(ADMIN_ROLES\); if \("error" in a\) return a\.error;/);
  // Une seule création, sous la bascule, jamais pour un retrait ; la charge : l'id de la séance, rien d'autre.
  assert.equal((r8.match(/botCommand\.create/g) ?? []).length, 1);
  assert.match(r8, /if \(!retirer && b\?\.discord !== false\) \{\n/);
  // Lot 9 : la condition est `discordOk` — la bascule pour une Chambre, le siège ACTIF pour un
  // Guild Siege (pas de bot Python à remplacer) ; la charge reste l'id de la séance (et l'événement).
  assert.match(r8, /const discordOk = s\.evenement === "cs" \? pcs\.nouveauxMessages : pgs\.actif;/);
  assert.match(r8, /\} else if \(discordOk\) \{\n[^\n]*\n      const payload = s\.evenement === "gs" \? \{ seanceId: res\.seance\.id, evenement: "gs" \} : \{ seanceId: res\.seance\.id \};\n      const cmd = await prisma\.botCommand\.create\(\{ data: \{ type: "seance_debrief", payload, createdBy: a\.user\.username \} \}\);/);
  // Un double clic ne publie pas deux fois : une demande EN FILE pour la séance suffit.
  assert.match(r8, /where: \{ type: "seance_debrief", status: "PENDING", payload: \{ path: \["seanceId"\], equals: res\.seance\.id \} \}/);
  const generique = readFileSync(join(process.cwd(), "src/app/api/admin/bot-command/route.ts"), "utf8");
  assert.doesNotMatch(generique.match(/const ALLOWED = \[[^\]]*\]/)?.[0] ?? "", /seance_debrief/);
  // La route 4 ne montre le débrief que par `vueDebrief` (membre : publié seulement).
  const r4 = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/route.ts"), "utf8");
  // Lot 9 : le paramétrage de l'événement de la séance (`pev` : Chambres ou Guild Siege).
  assert.match(r4, /await vueDebrief\(prisma, ligne, pev, \{ staff, estMoi \}\)/);
  assert.doesNotMatch(r4, /debrief: null/);
});

/* ══ Lot 6 bis — la clôture et le débrief depuis Discord (décision 1 ; §4.8, §4.10) ══════
   Comme ClotureView, DebriefView, EtapeModal et ARetenirModal du modèle : le staff coche qui
   était là, puis note chaque étape, dans un message éphémère — sur la même base que le site,
   par les mêmes fonctions (cloturerSeance, modifierDebrief, marquerDebriefPublie). Discord n'est
   pas joignable en local : on vérifie le JSON exact des messages, des menus et des fenêtres, les
   refus, et l'écriture partagée sur une base en mémoire. */
console.log("\nLot 6 bis — la clôture et le débrief depuis Discord");

/** Une base en mémoire qui se comporte comme Prisma sur ce que `cloturerSeance` appelle : la
 *  composition, les persos et les comptes (participantsSeance), la séance et ses lignes. */
function baseCloture(o: { presences: Record<string, unknown>[]; persos: { name: string; class: string; userId: string }[]; comptes: { id: string; username: string; role: string; isActive?: boolean; cacheLe?: Date | null }[]; seance?: Record<string, unknown> }) {
  let row: Record<string, unknown> & { version: number } = {
    id: "c", cle: MERCREDI.cle, evenement: "cs", date: MERCREDI.date, creneau: "mer", debut: MERCREDI.debut, version: 0,
    annulee: false, clotureAt: null, cloturePar: null, repartition: { salles: { s3: "kaelis" }, jumeaux: { kaelis: "rouge_mag" } }, messages: {}, ...o.seance,
  };
  let lignes: Record<string, unknown>[] = [];
  const compte = (id: string) => { const u = o.comptes.find((x) => x.id === id)!; return { id: u.id, username: u.username, role: u.role, isActive: u.isActive ?? true, cacheLe: u.cacheLe ?? null }; };
  const db = {
    compositionState: { findUnique: async () => ({ id: "main", data: { signups: [], slotMeta: {}, presences: o.presences, instructions: "" } }) },
    character: { findMany: async () => o.persos.map((c) => ({ name: c.name, class: c.class, userId: c.userId, user: compte(c.userId), gearProfiles: [] })) },
    user: { findMany: async () => o.comptes.map((u) => compte(u.id)) },
    seanceGuilde: {
      upsert: async () => structuredClone(row),
      updateMany: async ({ where, data }: { where: { version: number }; data: Record<string, unknown> }) => {
        if (where.version !== row.version) return { count: 0 };
        const propre = Object.fromEntries(Object.entries(data).filter(([k]) => k !== "version"));
        row = { ...row, ...propre, version: row.version + 1 };
        return { count: 1 };
      },
      findUniqueOrThrow: async () => structuredClone(row),
    },
    seanceParticipant: {
      deleteMany: async () => { const n = lignes.length; lignes = []; return { count: n }; },
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => { lignes.push(...data); return { count: data.length }; },
    },
    $transaction: async <T,>(f: (tx: unknown) => Promise<T>) => f(db),
  };
  return { db: db as never, lire: () => row, lignes: () => lignes };
}
const MARDI_MIDI = paris("2026-10-20", "12:00").getTime();
const annonce = (pseudo: string, classe: string, player: string, userId: string, retenu: boolean, dt = 0) => ({ pseudo, classe, player, userId, creneau: "mer", ts: MARDI_MIDI + dt, retenu });
const SOIREE_CLOTURE = () => baseCloture({
  presences: [
    annonce("Kaelis", "Arcaniste", "kaelis", "u1", true), annonce("Mira", "Arcaniste", "mira", "u2", true, 1),
    annonce("Brann", "Primat", "brann", "u3", false, 2), annonce("Fanny", "Sylphide", "fanny", "u4", true, 3), annonce("Cache", "Templier", "cache", "u5", true, 4),
  ],
  persos: [
    { name: "Kaelis", class: "Arcaniste", userId: "u1" }, { name: "Mira", class: "Arcaniste", userId: "u2" }, { name: "Brann", class: "Primat", userId: "u3" },
    { name: "Fanny", class: "Sylphide", userId: "u4" }, { name: "Cache", class: "Templier", userId: "u5" },
  ],
  comptes: [
    { id: "u1", username: "kaelis", role: "VETERAN" }, { id: "u2", username: "mira", role: "GUARD" }, { id: "u3", username: "brann", role: "OFFICIER" },
    // Un ami (rôle Friend : il reste RECRUE) et un membre caché n'apparaissent JAMAIS parmi les joueurs.
    { id: "u4", username: "fanny", role: "RECRUE" }, { id: "u5", username: "cache", role: "VETERAN", cacheLe: new Date() },
  ],
});

cas("la clôture, d'où qu'elle vienne : une ligne par perso, décochés absents, annoncé ajouté, jamais un ami ni un caché ; une seconde clôture remplace", async () => {
  const b = SOIREE_CLOTURE();
  const r = await cloturerSeance(b.db, MERCREDI, { presents: ["Kaelis"], ajoutes: ["Brann"], par: "Lina", p: CS0, maintenant: soir() });
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual([r.presents, r.absents, r.message], [2, 1, "2 présences enregistrées · 1 absent — mercredi 21 octobre · 21 h."]);
  assert.deepEqual(r.lignes, [{ pseudo: "Kaelis", present: true }, { pseudo: "Mira", present: false }, { pseudo: "Brann", present: true }]);
  assert.deepEqual(b.lignes().map((l) => l.pseudo), ["Kaelis", "Mira", "Brann"]); // ni Fanny (amie) ni Cache (caché)
  assert.deepEqual((b.lignes()[0].details as { salles: string[]; jumeau: string }).salles, ["s3"]); // la répartition du soir, figée
  assert.equal((b.lire().clotureAt as Date).getTime(), soir());
  assert.equal(b.lire().cloturePar, "Lina");
  // Une seconde clôture (corrigée, depuis l'autre côté) remplace les lignes, sans les doubler.
  const r2 = await cloturerSeance(b.db, MERCREDI, { presents: ["Kaelis", "Mira"], ajoutes: [], par: "Maxime", p: CS0, maintenant: soir() });
  assert.ok(r2.ok);
  assert.deepEqual(b.lignes().map((l) => [l.pseudo, l.present]), [["Kaelis", true], ["Mira", true]]);
  assert.equal(r2.aFermer, false); // aucun message vivant ouvert
});

cas("la clôture refuse, avec sa raison et sans rien écrire : un inconnu (une amie), une liste qui a bougé, une séance à venir ou annulée", async () => {
  const b = SOIREE_CLOTURE();
  assert.deepEqual(await cloturerSeance(b.db, MERCREDI, { presents: ["Kaelis", "Fanny"], ajoutes: [], par: "Lina", p: CS0, maintenant: soir() }),
    { ok: false, status: 400, message: "Ni participant ni annoncé de cette séance : Fanny." });
  // Discord : le bouton « Valider » porte l'empreinte des listes montrées ; un retenu de plus depuis, et rien n'est écrit.
  const montree = MSG.empreinteCloture(["Kaelis"], ["Brann"]);
  const refus = await cloturerSeance(b.db, MERCREDI, {
    presents: ["Kaelis"], ajoutes: [], par: "Lina", p: CS0, maintenant: soir(),
    verifier: (parts) => (MSG.empreinteCloture(parts.participants.map((x) => x.pseudo), parts.autres.map((x) => x.pseudo)) === montree ? null : MSG.LISTE_CHANGEE),
  });
  assert.deepEqual(refus, { ok: false, status: 409, message: MSG.LISTE_CHANGEE });
  assert.deepEqual([b.lignes().length, b.lire().version], [0, 0]);
  // La même liste, dans un autre ordre (ou une autre casse), passe : l'empreinte trie.
  assert.equal(MSG.empreinteCloture(["Mira", "kaelis"], ["Brann"]), MSG.empreinteCloture(["Kaelis", "Mira"], ["brann"]));
  assert.notEqual(MSG.empreinteCloture(["Kaelis", "Mira"], ["Brann"]), MSG.empreinteCloture(["Kaelis", "Mira", "Brann"], []));
  assert.deepEqual(await cloturerSeance(b.db, MERCREDI, { presents: ["Kaelis"], ajoutes: [], par: "Lina", p: CS0, maintenant: paris("2026-10-21", "20:00").getTime() }),
    { ok: false, status: 409, message: "La séance du mercredi 21 octobre · 21 h n'a pas encore commencé : on clôture une séance jouée." });
  const annulee = baseCloture({ presences: [annonce("Kaelis", "Arcaniste", "kaelis", "u1", true)], persos: [{ name: "Kaelis", class: "Arcaniste", userId: "u1" }], comptes: [{ id: "u1", username: "kaelis", role: "VETERAN" }], seance: { annulee: true } });
  assert.deepEqual(await cloturerSeance(annulee.db, MERCREDI, { presents: ["Kaelis"], ajoutes: [], par: "Lina", p: CS0, maintenant: soir() }),
    { ok: false, status: 409, message: "Cette séance est annulée : rétablis-la avant de la clôturer." });
  // Un message vivant encore ouvert — le chrono compris — reste à fermer.
  const chrono = baseCloture({ presences: [annonce("Kaelis", "Arcaniste", "kaelis", "u1", true)], persos: [{ name: "Kaelis", class: "Arcaniste", userId: "u1" }], comptes: [{ id: "u1", username: "kaelis", role: "VETERAN" }], seance: { messages: { chrono: { canal: "1", id: "2" }, panneau: { canal: "1", id: "3", ferme: "remplace" } } } });
  const rc = await cloturerSeance(chrono.db, MERCREDI, { presents: ["Kaelis"], ajoutes: [], par: "Lina", p: CS0, maintenant: soir() });
  assert.ok(rc.ok && rc.aFermer);
  // Rouvrir : la répartition se modifie de nouveau ; une séance qui n'est pas clôturée ne se rouvre pas.
  assert.ok((await rouvrirSeance(chrono.db, MERCREDI)).ok);
  assert.equal(chrono.lire().clotureAt, null);
  assert.deepEqual(await rouvrirSeance(chrono.db, MERCREDI), { ok: false, status: 409, message: "Cette séance n'est pas clôturée." });
});

/** Toutes les bornes de Discord sur un message : 5 rangées, 5 boutons ou 1 menu par rangée,
 *  identifiants de 100 signes, libellés de 80, options de 100, 25 options. */
function bornesDiscord(m: MSG.MessageSeance) {
  assert.ok(m.components.length <= 5, `${m.components.length} rangées`);
  const ids = new Set<string>();
  for (const r of m.components) {
    const menus = r.components.filter((c) => c.type === 3);
    assert.ok(menus.length ? r.components.length === 1 : r.components.length <= 5);
    for (const c of r.components as unknown as Record<string, unknown>[]) {
      if (typeof c.custom_id === "string") { assert.ok(c.custom_id.length <= 100, c.custom_id); assert.ok(!ids.has(c.custom_id), `doublon ${c.custom_id}`); ids.add(c.custom_id); }
      if (typeof c.label === "string") assert.ok(c.label.length <= 80, c.label);
      if (typeof c.placeholder === "string") assert.ok(c.placeholder.length <= 150);
      for (const o of (c.options ?? []) as { label: string; value: string; description?: string }[]) {
        assert.ok(o.label.length <= 100 && o.value.length <= 100 && (o.description ?? "").length <= 100, JSON.stringify(o));
      }
      assert.ok(((c.options as unknown[]) ?? []).length <= 25);
    }
  }
  for (const e of m.embeds) assert.ok(MSG.poidsEmbed(e) <= 6000 && (e.description ?? "").length <= 4096 && (e.fields ?? []).every((f) => f.value.length <= 1024));
  assert.deepEqual(m.allowedMentions, { parse: [] }); // éphémère : jamais une mention
}

/** UN ÉMOJI = UN SENS (§8.2) : la table, les émojis des étapes et ceux des classes — rien d'autre. */
const TABLE_EMOJIS = "🏰🏯📋⏱📝📅🕘⏰👥✅❌⚠⛔🚫🙋🛡🔮⚔❤💥📏❔🌳👯🟩🟥🗿⬅➡🕷🔁📍🌐▶⏭↩⏹▫🏁🟢🟠🔴⚪⚡🐌🟰⌛🎯📌🏆💀🥇🔎🎬📜📊🔗🧙🧪" + "🧟👹💂🕸🪜👺🐉"
  + ["Primat", "Templier", "Sylphide", "Spadassin", "Arbaletrier", "Chanoine", "Arcaniste", "Envouteur"].map((c) => MSG.emojiClasse(c)).join("");
const emojisDe = (x: unknown) => [...new Set((JSON.stringify(x).match(/\p{Extended_Pictographic}/gu) ?? []))];
const horsTable = (x: unknown) => emojisDe(x).filter((e) => !TABLE_EMOJIS.includes(e));

const JC = (pseudo: string, classe: string, poste: string | null, chiffres: ChiffreFige[] = [], sansCompte = false): MSG.JoueurCloture => ({ pseudo, classe, player: pseudo.toLowerCase(), poste, chiffres, sansCompte });
const CLOT = (o: Partial<MSG.DonneesCloture> = {}): MSG.DonneesCloture => ({
  cle: MERCREDI.cle, label: MERCREDI.label, commencee: true, annulee: false, motif: null, cloturee: false, clotureAt: null, cloturePar: null,
  source: "retenus", participants: [JC("Kaelis", "Arcaniste", "Arcaniste", [fige("dps", 182_000, "182 k/s")]), JC("Mira", "Arcaniste", "Arcaniste", [], true)],
  autres: [JC("Brann", "Primat", null, [fige("offtank", 4_900_000, "4,9 M PV", "sceptre")])], exclus: 2,
  coches: ["Kaelis", "Mira"], ajoutes: [], chiffres: true, texte: CS0.textes.cloture, vars: {}, site: "https://genesis.example", ...o,
});
const optionsDu = (m: MSG.MessageSeance, id: string) =>
  ((m.components.flatMap((r) => r.components).find((c) => "custom_id" in c && c.custom_id === id) as unknown as { options: { value: string; default: boolean; description: string }[] } | undefined)?.options ?? []);
const tousLesBoutons = (m: MSG.MessageSeance) => m.components.flatMap((r) => r.components).filter((c) => c.type === 2) as unknown as { label: string; custom_id?: string; url?: string; disabled?: boolean; style: number }[];

cas("la clôture Discord : tous les participants cochés, les annoncés non retenus à ajouter, le poste et le chiffre DÉCLARÉ de chacun", () => {
  const m = MSG.messageCloture(CLOT());
  bornesDiscord(m);
  assert.deepEqual(horsTable(m), []);
  const e = m.embeds[0];
  assert.equal(e.title, "🏰 Clôture — Chambre du mercredi 21 octobre · 21 h");
  assert.match(e.description!, /^Tous les participants sont cochés : \*\*décoche les absents\*\*/);
  assert.match(e.description!, /👥 \*\*2 présents\*\*\n/);
  assert.match(e.description!, /2 annonces d'un compte hors de la guilde, inactif ou caché n'apparaissent pas\./);
  assert.match(e.description!, /Chiffres déclarés dans l'AirBuilder, non vérifiés/);
  assert.deepEqual(e.fields!.map((f) => f.name), ["Les retenus du staff (2)", "Annoncés non retenus — venus quand même ? (1)"]);
  assert.match(e.fields![0].value, /^✅ .+ \*\*Kaelis\*\* · Arcaniste · 💥 182 k\/s$/m);
  assert.match(e.fields![0].value, /\*\*Mira\*\* · Arcaniste · ❔ · aucun compte ne porte ce perso$/m);
  assert.match(e.fields![1].value, /^▫️ .+ \*\*Brann\*\* · sans poste · ❤️ 4,9 M/m);
  assert.deepEqual(optionsDu(m, "cs:clotp:cs_2026-10-21_mer").map((o) => [o.value, o.default]), [["Kaelis", true], ["Mira", true]]);
  assert.equal(optionsDu(m, "cs:clotp:cs_2026-10-21_mer")[0].description, "Arcaniste · poste Arcaniste · 💥 182 k/s");
  assert.deepEqual(optionsDu(m, "cs:clota:cs_2026-10-21_mer").map((o) => [o.value, o.default]), [["Brann", false]]);
  const menu = m.components[0].components[0] as unknown as { min_values: number; max_values: number };
  assert.deepEqual([menu.min_values, menu.max_values], [0, 2]); // on peut tout décocher
  const b = tousLesBoutons(m);
  assert.deepEqual(b.map((x) => x.label), ["Valider la clôture", "Ouvrir sur le site"]);
  assert.equal(b[0].custom_id, `cs:clotv:${MERCREDI.cle}:${MSG.empreinteCloture(["Kaelis", "Mira"], ["Brann"])}`);
  assert.equal(b[1].url, "https://genesis.example/compositions?onglet=inscription&cloture=cs_2026-10-21_mer");
  assert.equal(e.color, MSG.COULEUR.crimson);
  // Le message éphémère est MODIFIÉ à chaque geste : son texte est toujours posé, sinon le verdict d'avant y resterait.
  assert.equal(m.content, "");
  assert.equal(MSG.messageCloture(CLOT({ note: "⚠️ " + MSG.LISTE_CHANGEE })).content, "⚠️ La liste a changé depuis l'ouverture (un retenu de plus ou de moins) : vérifie les cochés, puis valide de nouveau.");
  assert.equal(MSG.messageClotureFaite({ cle: MERCREDI.cle, label: MERCREDI.label, message: "", lignes: [], site: "" }).content, "");
  // Le paramétrage masque les dégâts dans Discord : plus aucun chiffre, ni la légende.
  const sans = MSG.messageCloture(CLOT({ chiffres: false }));
  assert.doesNotMatch(JSON.stringify(sans), /182 k|4,9 M|Chiffres déclarés|❔/);
});

cas("la clôture garde ses cochés DANS le message : relus au clic, un nouveau retenu entre coché, un nouvel annoncé non", () => {
  const cle = MERCREDI.cle;
  // À l'ouverture : tout le monde ; une séance déjà clôturée repart de son constat.
  assert.deepEqual(MSG.selectionInitiale([{ pseudo: "Kaelis" }, { pseudo: "Mira" }], [{ pseudo: "Brann" }], null), { coches: ["Kaelis", "Mira"], ajoutes: [] });
  assert.deepEqual(MSG.selectionInitiale([{ pseudo: "Kaelis" }, { pseudo: "Mira" }, { pseudo: "Sol" }], [{ pseudo: "Brann" }],
    [{ pseudo: "kaelis", present: true }, { pseudo: "Mira", present: false }, { pseudo: "Brann", present: true }]), { coches: ["Kaelis", "Sol"], ajoutes: ["Brann"] });
  // Le message rendu se relit : ses options, ses cochés, l'empreinte du bouton « Valider ».
  const m = MSG.messageCloture(CLOT({ coches: ["Kaelis"], ajoutes: ["Brann"] }));
  const lue = MSG.lireSelectionCloture(m.components, cle);
  assert.deepEqual(lue, { vus: { participants: ["Kaelis", "Mira"], autres: ["Brann"] }, coches: ["Kaelis"], ajoutes: ["Brann"], empreinte: MSG.empreinteCloture(["Kaelis", "Mira"], ["Brann"]) });
  assert.match(m.embeds[0].fields![0].value, /^❌ .+\*\*Mira\*\*/m);
  assert.match(m.embeds[0].description!, /👥 \*\*2 présents\*\* · ❌ 1 absent/);
  // Un choix dans le premier menu ; entre-temps Sol a été retenu (coché), Pyra s'est annoncée (pas cochée).
  const apres = MSG.selectionApres(lue, { participants: ["Kaelis", "Mira", "Sol"], autres: ["Brann", "Pyra"] }, { menu: "presents", valeurs: ["Mira"] });
  assert.deepEqual(apres, { coches: ["Mira", "Sol"], ajoutes: ["Brann"] });
  // Brann retenu entre-temps : il garde l'état qu'il avait (ajouté, donc coché).
  assert.deepEqual(MSG.selectionApres(lue, { participants: ["Kaelis", "Mira", "Brann"], autres: [] }), { coches: ["Kaelis", "Brann"], ajoutes: [] });
  // Le message d'une autre séance ne se lit pas comme celui-ci.
  assert.deepEqual(MSG.lireSelectionCloture(m.components, "cs_2026-10-25_dim").coches, []);
  assert.deepEqual(MSG.lireSelectionCloture("abîmé", cle), { vus: { participants: [], autres: [] }, coches: [], ajoutes: [], empreinte: null });
});

cas("la clôture Discord ne se valide pas d'une séance annulée, pas encore jouée ou sans personne ; déjà clôturée : de nouveau, rouvrir, débrief", () => {
  for (const o of [{ annulee: true, motif: "serveur en maintenance" }, { commencee: false }, { participants: [], autres: [] }, { participants: Array.from({ length: 26 }, (_, n) => JC(`J${n}`, "Arcaniste", null)) }]) {
    const m = MSG.messageCloture(CLOT(o));
    bornesDiscord(m);
    assert.equal(m.components.some((r) => r.components.some((c) => c.type === 3)), false, JSON.stringify(o).slice(0, 60)); // aucun menu
    assert.equal(tousLesBoutons(m)[0].disabled, true); // « Valider » grisé
  }
  assert.match(MSG.messageCloture(CLOT({ annulee: true, motif: "maintenance" })).embeds[0].description!, /^🚫 Séance annulée — maintenance : rétablis-la sur le site/);
  assert.match(MSG.messageCloture(CLOT({ participants: Array.from({ length: 26 }, (_, n) => JC(`J${n}`, "Arcaniste", null)) })).embeds[0].description!, /Clôture cette séance sur le site\./);
  const deja = MSG.messageCloture(CLOT({ cloturee: true, clotureAt: paris("2026-10-21", "23:10").getTime(), cloturePar: "Maxime" }));
  assert.match(deja.embeds[0].description!, /^✅ Déjà clôturée le 21\/10 à 23:10 par Maxime\. Valider de nouveau \*\*remplace\*\* la clôture/);
  assert.deepEqual(tousLesBoutons(deja).map((b) => [b.label, b.custom_id ?? b.url]), [
    ["Clôturer de nouveau", `cs:clotv:${MERCREDI.cle}:${MSG.empreinteCloture(["Kaelis", "Mira"], ["Brann"])}`],
    ["Rouvrir la séance", "cs:clotr:cs_2026-10-21_mer"], ["Faire le débrief", "cs:debv:cs_2026-10-21_mer:"],
    ["Ouvrir sur le site", "https://genesis.example/compositions?onglet=inscription&cloture=cs_2026-10-21_mer"],
  ]);
  assert.equal(deja.embeds[0].color, MSG.COULEUR.anthracite);
  // Validée : qui était là, qui ne l'était pas, puis « On fait le débrief ? » (ProposerDebriefView).
  const fait = MSG.messageClotureFaite({ cle: MERCREDI.cle, label: MERCREDI.label, message: "2 présences enregistrées · 1 absent — mercredi 21 octobre · 21 h.", lignes: [{ pseudo: "Kaelis", present: true }, { pseudo: "Ki_ra", present: true }, { pseudo: "Mira", present: false }], site: "https://genesis.example" });
  bornesDiscord(fait);
  assert.equal(fait.embeds[0].title, "✅ Chambre du mercredi 21 octobre · 21 h clôturée");
  assert.deepEqual(fait.embeds[0].fields, [{ name: "✅ Présents (2)", value: "Kaelis · Ki\\_ra" }, { name: "❌ Absents (1)", value: "Mira" }]);
  assert.deepEqual(tousLesBoutons(fait).map((b) => b.custom_id ?? b.url), ["cs:debv:cs_2026-10-21_mer:", "cs:cloto:cs_2026-10-21_mer", "https://genesis.example/compositions?onglet=bilans&seance=cs_2026-10-21_mer"]);
});

/** Le parcours du débrief : la soirée du 21/10, chronométrée jusqu'à 2.2, 1.1 bien et 2.2 mal. */
const NOTES_21 = { "1.1": { statut: "bien" as const, chrono: null, remarque: "" }, "2.2": { statut: "mal" as const, chrono: 372, remarque: "Kraavos mort 9 s après" } };
const DEB = (o: Partial<MSG.DonneesDebrief> = {}): MSG.DonneesDebrief => {
  const r = resumeDebrief(ETAPES, NOTES_21, chronoApres(6, 4, 3, 2, 7), "gagne", "Équilibrer les jumeaux");
  const precedent = comparee("cs_2026-10-18_dim", resumeAvec(COMPLET(3), { "2.2": "mal" }));
  return {
    cle: MERCREDI.cle, jour: "mercredi 21 octobre", code: "", lignes: r.lignes, phases: CS0.phases,
    resultat: r.resultat, aRetenir: r.aRetenir, total: r.total, complet: r.complet, manquants: r.manquants,
    analyse: { ...analyseDebrief(r, [precedent]), precedentLabel: "dimanche 18 octobre" },
    publie: false, publieLe: null, par: null, annulee: false, motif: null, commencee: true, figees: true, rienDeNote: false,
    cloturee: true, nbJoueurs: 2, importe: false,
    joueurs: [
      { pseudo: "Kaelis", classe: "Arcaniste", present: true, chiffres: [fige("dps", 182_000, "182 k/s", null, true)], salles: ["s3", "s4"], jumeau: "rouge_mag" },
      { pseudo: "Brann", classe: "Primat", present: true, chiffres: [fige("offtank", 4_900_000, "4,9 M PV", "sceptre")], salles: [], jumeau: "vert_tank" },
      { pseudo: "Mira", classe: "Arcaniste", present: false, chiffres: [], salles: [], jumeau: null },
    ],
    salles: CS0.salles, chiffres: true, texte: CS0.textes.debrief, vars: {}, site: "https://genesis.example", maj: soir(), ...o,
  };
};

cas("le débrief Discord : l'étape montrée (la première pas notée), ses monstres, son chrono, et toutes les étapes phase par phase", () => {
  const m = MSG.messageDebrief(DEB());
  bornesDiscord(m);
  assert.deepEqual(horsTable(m), []);
  const e = m.embeds[0];
  assert.equal(e.title, "📝 Débrief — Chambre du mercredi 21 octobre");
  assert.equal(e.url, "https://genesis.example/compositions?onglet=bilans&seance=cs_2026-10-21_mer");
  const d = e.description!;
  assert.match(d, /^🏆 \*\*GAGNÉ\*\*\n⏱️ Temps total \*\*21:12\*\* \(temps partiel : il manque le chrono d'une étape\)\n▫️ Brouillon : les membres ne le voient pas encore\./);
  // La première étape pas notée : 1.2, avec ses monstres (lien vers leur fiche) et son chrono mesuré.
  assert.match(d, /Étape \*\*2\/13\*\* — 🌳 \*\*1\.2 12 Asuras\*\* · Phase 1 — Chambres\n.*↳ contre : \[.+\]\(https:\/\/genesis\.example\/monstres\/MI_ASURA04_2\)\n⚪ pas encore notée\n⏱️ \*\*4:00\*\* — mesuré par le chrono\nRemarque : aucune\./);
  assert.deepEqual(e.fields!.slice(0, 5).map((f) => f.name), ["Phase 1 — Chambres", "Phase 2 — Couloir", "Phase 3 — Araignée", "Phase 4 — Escalier", "Phase 5 — Boss final"]);
  assert.match(e.fields![0].value, /^🟢 🧟 1\.1 480 monstres — 6:00 🐌 \+3:00\n▶️ ⚪ \*\*🌳 1\.2 12 Asuras\*\* — 4:00 🐌 \+1:00\n/);
  assert.match(e.fields![1].value, /🔴 👯 2\.2 Jumeaux — 6:12\* 🐌 \+3:12 · « Kraavos mort 9 s après »/);
  assert.match(e.fields![2].value, /^⚪ 🕸️ 3\.1 100 araignées$/m); // sans chrono : rien après le nom
  assert.match(JSON.stringify(e.fields), /🔎 Analyse.*⌛ Étape la plus longue : \*\*2\.2 Jumeaux\*\*.*🎯 Mal deux fois de suite : \*\*2\.2 Jumeaux\*\* — à retravailler/);
  assert.deepEqual(e.fields!.find((f) => f.name === "📌 À retenir"), { name: "📌 À retenir", value: "Équilibrer les jumeaux" });
  // Qui jouait à cette étape (les salles), et leurs chiffres DÉCLARÉS figés à la clôture (décision 9).
  assert.match(e.fields!.find((f) => f.name.startsWith("👥 À cette étape"))!.value, /> Kaelis 💥 182 k\/s 📏 · Salles 3 \+ 4$/);
  const la = e.fields!.find((f) => f.name.startsWith("👥 Ils étaient là"))!;
  assert.equal(la.name, "👥 Ils étaient là (2)");
  assert.match(la.value, /Kaelis 💥 182 k\/s 📏 · .+Brann ❤️ 4,9 M\n❌ Absents : Mira\n-# Chiffres déclarés dans l'AirBuilder, non vérifiés, figés à la clôture/);
  assert.match(e.footer!.text, /🟢 bien · 🟠 moyen · 🔴 mal · ⚪ pas noté · ⚡ plus rapide · 🐌 plus lent/);
  // Les équipes des Jumeaux à l'étape 2.2.
  const j = MSG.messageDebrief(DEB({ code: "2.2" })).embeds[0];
  assert.match(j.fields!.find((f) => f.name.startsWith("👥 À cette étape"))!.value, /🟩 \*\*Équipe Verte\*\* — 🛡️ .+Brann ❤️ 4,9 M\n🟥 \*\*Équipe Rouge\*\* — 🔮 .+Kaelis/);
  assert.match(j.description!, /🔴 Mal — recliquer la note la retire\n⏱️ \*\*6:12\*\* — saisi au débrief \(mesuré : 7:00\)\nRemarque : « Kraavos mort 9 s après »/);
  // Sans les dégâts dans Discord : aucun chiffre.
  assert.doesNotMatch(JSON.stringify(MSG.messageDebrief(DEB({ chiffres: false }))), /182 k|4,9 M|Chiffres déclarés/);
});

cas("les boutons du débrief : sans état (la séance et le CODE de l'étape), grisés quand ils n'ont pas de sens, ni ⬅️ ni ➡️ (les golems)", () => {
  const m = MSG.messageDebrief(DEB({ code: "1.1" }));
  const b = tousLesBoutons(m).map((x) => [x.label, x.custom_id ?? x.url, !!x.disabled]);
  assert.deepEqual(b, [
    ["Bien (noté)", "cs:debs:cs_2026-10-21_mer:1.1:bien:bien", false], ["Moyen", "cs:debs:cs_2026-10-21_mer:1.1:moyen:bien", false], ["Mal", "cs:debs:cs_2026-10-21_mer:1.1:mal:bien", false],
    ["‹ Précédente", "cs:debv:cs_2026-10-21_mer:1.1:p", true], ["Chrono · remarque", "cs:debc:cs_2026-10-21_mer:1.1", false], ["Suivante ›", "cs:debv:cs_2026-10-21_mer:1.2", false],
    ["Gagné (noté)", "cs:debi:cs_2026-10-21_mer:1.1:gagne:gagne", false], ["Perdu", "cs:debi:cs_2026-10-21_mer:1.1:perdu:gagne", false],
    ["À retenir", "cs:debr:cs_2026-10-21_mer:1.1", false], ["Publier le débrief", "cs:debp:cs_2026-10-21_mer:1.1", false],
    ["Ouvrir sur le site", "https://genesis.example/compositions?onglet=bilans&seance=cs_2026-10-21_mer", false],
  ]);
  assert.doesNotMatch(JSON.stringify(m.components), /⬅|➡/);
  const aller = m.components[4].components[0] as unknown as { custom_id: string; options: { value: string; default: boolean; description: string; emoji?: { name: string } }[] };
  assert.equal(aller.custom_id, "cs:deba:cs_2026-10-21_mer");
  assert.deepEqual(aller.options.slice(0, 2).map((o) => [o.value, o.default, o.description, o.emoji?.name]), [["1.1", true, "Bien · 6:00", "🧟"], ["1.2", false, "pas notée · 4:00", "🌳"]]);
  assert.equal(aller.options.length, 13);
  // La dernière étape : « Suivante » grisée. Pas encore clôturée : « Clôturer » ; publié : republier, ou repasser en brouillon (confirmé d'abord).
  const der = tousLesBoutons(MSG.messageDebrief(DEB({ code: "5", cloturee: false, publie: true, publieLe: soir(), par: "Lina" })));
  assert.deepEqual(der.find((x) => x.label === "Suivante ›")!.disabled, true);
  assert.deepEqual(der.slice(8).map((x) => x.label), ["À retenir", "Republier", "Repasser en brouillon", "Clôturer", "Ouvrir sur le site"]);
  assert.equal(der.find((x) => x.label === "Clôturer")!.custom_id, "cs:cloto:cs_2026-10-21_mer");
  const conf = MSG.messageDebrief(DEB({ code: "5", publie: true, confirmerBrouillon: true }));
  assert.deepEqual(tousLesBoutons(conf).slice(8).map((x) => [x.label, x.custom_id]), [["Oui, repasser en brouillon", "cs:debb:cs_2026-10-21_mer:5:ok"], ["Non, le garder publié", "cs:debv:cs_2026-10-21_mer:5"]]);
  assert.match(MSG.messageDebrief(DEB({ publie: true, publieLe: soir(), par: "Lina" })).embeds[0].description!, /✅ Publié le 21\/10 à 23:00 · Lina : tous les membres le lisent dans Bilans\./);
  // Rien de noté : « Publier » grisé. Annulée, ou pas encore jouée : aucun geste, le lien seulement.
  assert.equal(tousLesBoutons(MSG.messageDebrief(DEB({ rienDeNote: true }))).find((x) => x.label === "Publier le débrief")!.disabled, true);
  for (const o of [{ annulee: true, motif: "maintenance" }, { commencee: false }]) {
    const x = MSG.messageDebrief(DEB(o));
    bornesDiscord(x);
    assert.deepEqual(tousLesBoutons(x).map((y) => y.label), ["Ouvrir sur le site"]);
  }
  assert.match(MSG.messageDebrief(DEB({ annulee: true, motif: "maintenance" })).embeds[0].description!, /^🚫 Séance annulée — maintenance : pas de débrief\./);
  for (const code of ETAPES.map((x) => x.code)) bornesDiscord(MSG.messageDebrief(DEB({ code, note: "✅ 1.1 480 monstres : bien." })));
  assert.deepEqual([MSG.messageDebrief(DEB()).content, MSG.messageDebrief(DEB({ note: "✅ 2.2 Jumeaux : mal." })).content], ["", "✅ 2.2 Jumeaux : mal."]);
});

cas("le parcours : une note passe à la suivante, recliquer la retire sans bouger ; la dernière reste ; gagné / perdu se retire de même", () => {
  const r = resumeDebrief(ETAPES, NOTES_21, CHRONO_VIDE, null, "");
  assert.deepEqual(MSG.gesteStatut(r.lignes, "1.2", "moyen"), { patch: { etapes: { "1.2": { statut: "moyen" } } }, suivante: "1.3" });
  assert.deepEqual(MSG.gesteStatut(r.lignes, "1.1", "bien"), { patch: { etapes: { "1.1": { statut: null } } }, suivante: "1.1" });
  assert.deepEqual(MSG.gesteStatut(r.lignes, "2.2", "bien"), { patch: { etapes: { "2.2": { statut: "bien" } } }, suivante: "3.1" });
  assert.deepEqual(MSG.gesteStatut(r.lignes, "5", "bien").suivante, "5");
  assert.deepEqual(MSG.gesteIssue(null, "gagne"), { resultat: "gagne" });
  assert.deepEqual(MSG.gesteIssue("gagne", "gagne"), { resultat: null });
  assert.deepEqual(MSG.gesteIssue("gagne", "perdu"), { resultat: "perdu" });
  // L'étape montrée : celle demandée ; sinon (code vide, ou retiré du déroulé) la première pas notée.
  assert.equal(MSG.etapeCourante(r.lignes, "3.4"), 8);
  assert.equal(MSG.etapeCourante(r.lignes, ""), 1);
  assert.equal(MSG.etapeCourante(r.lignes, "9.9"), 1);
  assert.equal(MSG.etapeCourante(r.lignes.map((l) => ({ ...l, statut: "bien" as const })), ""), 0);
});

cas("les fenêtres de saisie : le chrono SAISI (jamais la mesure, en aide), la remarque, « à retenir » ; seuls les champs touchés s'écrivent", () => {
  const r = resumeDebrief(ETAPES, NOTES_21, chronoApres(6, 4, 3, 2, 7), null, "");
  const l22 = r.lignes.find((l) => l.etape.code === "2.2")!, l12 = r.lignes.find((l) => l.etape.code === "1.2")!;
  const f = MSG.fenetreEtape(MERCREDI.cle, l22, NOTES_21["2.2"]);
  assert.equal(f.custom_id, `cs:mdeb:cs_2026-10-21_mer:2.2:${MSG.empreinteNote(NOTES_21["2.2"])}`);
  assert.equal(f.title, "2.2 Jumeaux");
  const champs = f.components as unknown as { type: number; label: string; description: string; component: { custom_id: string; value?: string; placeholder?: string; max_length: number; required: boolean } }[];
  assert.deepEqual(champs.map((c) => [c.type, c.component.custom_id, c.component.value, c.component.max_length, c.component.required]), [[18, "chrono", "6:12", 20, false], [18, "remarque", "Kraavos mort 9 s après", 300, false]]);
  assert.equal(champs[0].description, "Mesuré par le chrono : 7:00. Laisse vide pour garder la mesure.");
  // Une étape mesurée et jamais corrigée : le champ est vide, la mesure n'est qu'en aide (sinon la renvoyer la figerait en saisie).
  const g = MSG.fenetreEtape(MERCREDI.cle, l12, undefined).components as unknown as typeof champs;
  assert.deepEqual([g[0].component.value, g[0].component.placeholder, g[1].component.value], [undefined, "4:00", undefined]);
  for (const x of [f, MSG.fenetreEtape(MERCREDI.cle, { ...l12, etape: { ...l12.etape, label: "Un libellé bien trop long pour le titre d'une fenêtre Discord" } }, undefined), MSG.fenetreARetenir(MERCREDI.cle, "2.2", "x".repeat(1200))]) {
    assert.ok(x.custom_id.length <= 100 && x.title.length <= 45 && x.components.length <= 5);
    for (const c of x.components as unknown as typeof champs) assert.ok(c.label.length <= 45 && c.description.length <= 100 && (c.component.value ?? "").length <= c.component.max_length, c.label);
  }
  // Ce qui part : les champs touchés seulement. Vider le chrono saisi fait revenir la mesure.
  assert.equal(MSG.patchFenetreEtape("2.2", { chrono: "6:12", remarque: "Kraavos mort 9 s après" }, NOTES_21["2.2"]), null);
  assert.deepEqual(MSG.patchFenetreEtape("2.2", { chrono: "6:12", remarque: "Kraavos mort 9 s après Kraavus" }, NOTES_21["2.2"]), { etapes: { "2.2": { remarque: "Kraavos mort 9 s après Kraavus" } } });
  assert.deepEqual(MSG.patchFenetreEtape("2.2", { chrono: "", remarque: "Kraavos mort 9 s après" }, NOTES_21["2.2"]), { etapes: { "2.2": { chrono: "" } } });
  assert.deepEqual(MSG.patchFenetreEtape("1.2", { chrono: " 4:05 ", remarque: "" }, undefined), { etapes: { "1.2": { chrono: "4:05" } } });
  assert.equal(MSG.patchFenetreARetenir("Équilibrer ", "Équilibrer"), null);
  assert.deepEqual(MSG.patchFenetreARetenir("", "Équilibrer"), { aRetenir: "" });
  const ar = MSG.fenetreARetenir(MERCREDI.cle, "2.2", "Équilibrer");
  assert.equal(ar.custom_id, `cs:mret:cs_2026-10-21_mer:2.2:${MSG.empreinte("Équilibrer")}`);
  // L'empreinte change avec la saisie d'un autre : son texte n'est pas écrasé, le tien t'est rendu.
  assert.notEqual(MSG.empreinteNote(NOTES_21["2.2"]), MSG.empreinteNote({ ...NOTES_21["2.2"], remarque: "autre" }));
  assert.equal(MSG.empreinteNote(undefined), MSG.empreinteNote({ chrono: null, remarque: "" }));
  assert.equal(MSG.saisieDepassee("2.2", "6:30 · aggro"), "⚠️ Un autre membre du staff vient de modifier l'étape 2.2 : voici sa version, ta saisie n'est pas enregistrée. Ce que tu avais écrit : « 6:30 · aggro »");
  assert.match(MSG.saisieDepassee("*", ""), /modifier « à retenir » : voici sa version/);
  assert.equal(MSG.noteRefusSaisie("Chrono illisible : écris par exemple 2:34 ou 45s.", "aggro *ratée*"), "⚠️ Chrono illisible : écris par exemple 2:34 ou 45s. Ta remarque n'est pas enregistrée non plus : « aggro \\*ratée\\* »");
});

cas("une saisie faite dans Discord passe par la route du site : mêmes règles (chrono illisible), même verrou, et se lit sur le site", async () => {
  const b = baseDebrief();
  // Le clic 🔴 Mal sur 2.2, puis la fenêtre : un chrono et une remarque — les patchs que le bot envoie.
  const r0 = resumeDeSeance({ etapes: null, chrono: null, debrief: null, resultat: null, aRetenir: null }, CS0).resume;
  const g = MSG.gesteStatut(r0.lignes, "2.2", "mal");
  assert.ok((await modifierDebrief(b.db, MERCREDI, g.patch, "lina", CS0, soir)).ok);
  const fenetre = MSG.patchFenetreEtape("2.2", { chrono: "6:12", remarque: "Kraavos mort 9 s après" }, lireDebrief(b.lire().debrief).notes["2.2"])!;
  assert.ok((await modifierDebrief(b.db, MERCREDI, fenetre, "lina", CS0, soir)).ok);
  assert.deepEqual(lireDebrief(b.lire().debrief).notes["2.2"], { statut: "mal", chrono: 372, remarque: "Kraavos mort 9 s après" });
  assert.equal(b.lire().debriefPar, "lina");
  const illisible = await modifierDebrief(b.db, MERCREDI, MSG.patchFenetreEtape("2.2", { chrono: "deux", remarque: "x" }, lireDebrief(b.lire().debrief).notes["2.2"])!, "lina", CS0, soir);
  assert.deepEqual(illisible, { ok: false, status: 400, message: "Chrono illisible : écris par exemple 2:34 ou 45s." });
  assert.equal(lireDebrief(b.lire().debrief).notes["2.2"].remarque, "Kraavos mort 9 s après"); // rien n'est écrit
  // « À retenir », gagné, puis publier : ce que montre l'onglet Bilans.
  assert.ok((await modifierDebrief(b.db, MERCREDI, MSG.patchFenetreARetenir("Équilibrer les jumeaux", "")!, "lina", CS0, soir)).ok);
  assert.ok((await modifierDebrief(b.db, MERCREDI, MSG.gesteIssue(null, "gagne"), "lina", CS0, soir)).ok);
  const pub = await marquerDebriefPublie(b.db, MERCREDI, "lina", CS0, {}, soir);
  assert.ok(pub.ok && pub.manquants!.length === 12);
  assert.deepEqual([b.lire().aRetenir, b.lire().resultat, (b.lire().debriefPublieAt as Date).getTime()], ["Équilibrer les jumeaux", "gagne", soir()]);
});

cas("Discord : la clôture et le débrief au staff seul, compte relu en base ; la séance de la commande, et son autocomplétion", () => {
  assert.equal(MSG.refusStaffDiscord({ refus: "compte_non_lie", staff: true, site: "https://genesis.example" }), "🔗 Ton Discord n'est pas encore lié au site. Connecte-toi une fois sur https://genesis.example, puis reviens cliquer.");
  assert.equal(MSG.refusStaffDiscord({ refus: "reserve_membres", staff: true, site: "" }), "⛔ La clôture et le débrief des Chambres sont réservés aux membres de la guilde.");
  assert.equal(MSG.refusStaffDiscord({ refus: null, staff: false, site: "" }), "⛔ Réservé au staff (bras droits).");
  assert.equal(MSG.refusStaffDiscord({ refus: null, staff: true, site: "" }), null);
  // Jeudi 9 h : c'est le mercredi qu'on clôture ; une séance à venir, ou un Guild Siege, est refusée.
  const jeudi = paris("2026-10-22", "09:00");
  const d = MSG.seanceDeLaCommande(null, jeudi);
  assert.ok(d.ok && d.seance.cle === "cs_2026-10-21_mer");
  const choisie = MSG.seanceDeLaCommande("cs_2026-10-18_dim", jeudi);
  assert.ok(choisie.ok && choisie.seance.cle === "cs_2026-10-18_dim");
  assert.deepEqual(MSG.seanceDeLaCommande("cs_2026-10-25_dim", jeudi), { ok: false, texte: "⚠️ La séance du dimanche 25 octobre · 21 h n'a pas encore eu lieu : on clôture et on débriefe une séance jouée." });
  assert.equal(MSG.seanceDeLaCommande("n'importe quoi", jeudi).ok, false);
  assert.equal(MSG.seanceDeLaCommande("cs_2026-10-21_dim", jeudi).ok, false); // un mercredi n'est pas un dimanche
  const recentes = seancesRecentesParis(jeudi, 8);
  const choix = MSG.choixSeances(recentes, new Map([["cs_2026-10-21_mer", { cloturee: true, publie: false, annulee: false }], ["cs_2026-10-18_dim", { cloturee: true, publie: true, annulee: false }], ["cs_2026-10-14_mer", { cloturee: false, publie: false, annulee: true }]]), "");
  assert.deepEqual(choix.slice(0, 3), [
    { name: "mercredi 21 octobre · 21 h — la dernière · clôturée", value: "cs_2026-10-21_mer" },
    { name: "dimanche 18 octobre · 21 h · clôturée · débrief publié", value: "cs_2026-10-18_dim" },
    { name: "mercredi 14 octobre · 21 h · annulée", value: "cs_2026-10-14_mer" },
  ]);
  assert.equal(choix.length, 8);
  assert.deepEqual(MSG.choixSeances(recentes, new Map(), "dimanche 1").map((c) => c.value), ["cs_2026-10-18_dim", "cs_2026-10-11_dim"]);
  assert.deepEqual(MSG.choixSeances(recentes, new Map(), "Annulee").length, 0);
  // Avant la bascule (§8.10) : la porte du site, comme au lot 3.
  // Sur la séance CHOISIE dans la commande (`?cloture=<clé>`), pas toujours sur la dernière.
  const avant = MSG.clotureAvantBascule({ cle: "cs_2026-10-18_dim", label: "dimanche 18 octobre · 21 h" }, "https://genesis.example");
  assert.match(avant.content, /^🏰 Clôturer la Chambre du dimanche 18 octobre · 21 h — cocher qui était là :\n-# Dans Discord, la clôture s'ouvre avec les nouveaux messages/);
  assert.equal((avant.components[0].components[0] as { url: string }).url, "https://genesis.example/compositions?onglet=inscription&cloture=cs_2026-10-18_dim");
  assert.equal((MSG.debriefAvantBascule(MERCREDI, "https://genesis.example").components[0].components[0] as { url: string }).url, "https://genesis.example/compositions?onglet=bilans&seance=cs_2026-10-21_mer");
});

cas("le bot route chaque bouton, menu et fenêtre du lot 6 bis ; il écrit par les fonctions des routes 7, 8 et 9 ; aucune commande nouvelle dans la file", () => {
  const seances = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  for (const a of ["clotv", "clotr", "cloto", "debv", "debs", "debi", "debc", "debr", "debp", "debb"]) assert.match(seances, new RegExp(`id\\.action === "${a}"`), a);
  for (const a of ["clotp", "clota", "deba"]) assert.match(seances, new RegExp(`id\\.action === "${a}"\\) return`), a);
  assert.match(seances, /id\.action !== "mdeb" && id\.action !== "mret"/);
  // Les mêmes fonctions que le site, sous le même verrou de version.
  assert.match(seances, /await cloturerSeance\(prisma, s, \{/);
  assert.match(seances, /await modifierDebrief\(prisma, v\.s, patch, v\.par/);
  assert.match(seances, /await marquerDebriefPublie\(prisma, v\.s, v\.par/);
  assert.match(seances, /await vueDebrief\(prisma, ligne, \{ \.\.\.p, degats: \{ \.\.\.p\.degats, bilans: p\.degats\.discord \} \}/);
  // Les gestes lisent la base : deferUpdate d'abord (piège n° 16) ; une fenêtre s'ouvre sous 2,2 s ou pas du tout.
  assert.equal((seances.match(/await i\.deferUpdate\(\);\n  const (g|v) = await (gardeStaff|pretPourDebrief)/g) ?? []).length, 11);
  assert.match(seances, /async function dansLesTemps<T>\(p: Promise<T>, ms = 2200\)/);
  const r9 = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/cloture/route.ts"), "utf8");
  assert.match(r9, /: await cloturerSeance\(prisma, s, \{ presents, ajoutes, par: a\.user\.username/);
  // Lot 9 : le Guild Siege clôture ses annoncés par sa propre fonction, sous le même verrou.
  assert.match(r9, /\? await cloturerGS\(prisma, s, \{ presents: \[\.\.\.presents, \.\.\.ajoutes\], par: a\.user\.username/);
  assert.match(r9, /const res = await rouvrirSeance\(prisma, s\);/);
  assert.match(r9, /const a = await apiRole\(ADMIN_ROLES\); if \("error" in a\) return a\.error;/);
  const index = readFileSync(join(process.cwd(), "bot/index.ts"), "utf8");
  assert.match(index, /if \(interaction\.isModalSubmit\(\)\) \{[\s\S]*?gererFenetreSeance\(interaction\)/);
  assert.match(index, /if \(interaction\.isAutocomplete\(\)\) \{/);
  const cmd = readFileSync(join(process.cwd(), "bot/commands/chambre.ts"), "utf8");
  // La garde de ces deux commandes relit le compte en base : elles passent avant le seul isStaff.
  assert.ok(cmd.indexOf('if (sous === "cloturer") return commandeCloturer(') < cmd.indexOf("if (!isStaff(i.member as GuildMember | null)) {"));
  assert.match(cmd, /setName\("seance"\).*setAutocomplete\(true\)/);
  const generique = readFileSync(join(process.cwd(), "src/app/api/admin/bot-command/route.ts"), "utf8");
  assert.doesNotMatch(generique.match(/const ALLOWED = \[[^\]]*\]/)?.[0] ?? "", /seance_/);
});

/* ── Contre-vérification du lot 6 bis ──────────────────────────────────────────────────────
   Deux bras droits qui écrivent la MÊME étape en même temps — l'un sur le site, l'autre dans un
   message éphémère de Discord qui ne se rafraîchit pas tout seul : le second voit le conflit au
   lieu d'effacer, sans la voir, la saisie du premier. */

cas("la même étape écrite des deux côtés : le second voit le conflit (409), rien n'est écrasé ; deux étapes différentes passent toutes les deux", async () => {
  const b = baseDebrief();
  const r0 = resumeDeSeance({ etapes: null, chrono: null, debrief: null, resultat: null, aRetenir: null }, CS0).resume;
  // Lina (Discord) voit 1.1 « pas notée », comme Maxime (site). Maxime note Mal le premier.
  const site = { etapes: { "1.1": { statut: "mal" as const } } };
  assert.ok((await modifierDebrief(b.db, MERCREDI, { ...site, avant: avantDuPatch(site, { notes: {} }) }, "maxime", CS0, soir)).ok);
  // Lina clique Bien sur son message, qui montrait encore « pas notée » : refusé, le Mal reste.
  const g = MSG.gesteStatut(r0.lignes, "1.1", "bien", null);
  assert.deepEqual(g.patch, { etapes: { "1.1": { statut: "bien" } }, avant: { etapes: { "1.1": { statut: null } } } });
  const refus = await modifierDebrief(b.db, MERCREDI, g.patch, "lina", CS0, soir);
  assert.deepEqual(refus, { ok: false, status: 409, message: `${DEBRIEF_CONFLIT} l'étape 1.1 480 monstres : voici sa version, rien n'est changé.` });
  assert.equal(lireDebrief(b.lire().debrief).notes["1.1"].statut, "mal");
  // Le piège du recliqué : un message qui montrait « Bien (noté) » retire Bien… pas le Mal de l'autre.
  const retire = MSG.gesteStatut(r0.lignes, "1.1", "bien", "bien");
  assert.deepEqual(retire.patch.etapes, { "1.1": { statut: null } });
  assert.equal((await modifierDebrief(b.db, MERCREDI, retire.patch, "lina", CS0, soir)).ok, false);
  assert.equal(lireDebrief(b.lire().debrief).notes["1.1"].statut, "mal");
  // Le message remis à jour montre Mal : le clic suivant passe.
  assert.ok((await modifierDebrief(b.db, MERCREDI, MSG.gesteStatut(r0.lignes, "1.1", "bien", "mal").patch, "lina", CS0, soir)).ok);
  assert.equal(lireDebrief(b.lire().debrief).notes["1.1"].statut, "bien");
  // Deux étapes différentes, depuis le même écran périmé : les deux sont gardées.
  const [x, y] = await Promise.all([
    modifierDebrief(b.db, MERCREDI, MSG.gesteStatut(r0.lignes, "1.2", "moyen", null).patch, "maxime", CS0, soir),
    modifierDebrief(b.db, MERCREDI, MSG.gesteStatut(r0.lignes, "1.3", "mal", null).patch, "lina", CS0, soir),
  ]);
  assert.ok(x.ok && y.ok);
  assert.deepEqual(["1.2", "1.3"].map((c) => lireDebrief(b.lire().debrief).notes[c].statut), ["moyen", "mal"]);
  // Gagné / perdu : le message montrait « rien », l'autre a dit gagné entre-temps.
  assert.ok((await modifierDebrief(b.db, MERCREDI, MSG.gesteIssue(null, "gagne", true), "maxime", CS0, soir)).ok);
  assert.deepEqual(MSG.gesteIssue(null, "perdu", true), { resultat: "perdu", avant: { resultat: null } });
  const issue = await modifierDebrief(b.db, MERCREDI, MSG.gesteIssue(null, "perdu", true), "lina", CS0, soir);
  assert.deepEqual([issue.ok, b.lire().resultat], [false, "gagne"]);
  // Un ancien bouton (sans ce que le message montrait) : pas de contrôle, comme avant.
  assert.deepEqual(MSG.gesteIssue("gagne", "gagne"), { resultat: null });
  assert.deepEqual(MSG.gesteStatut(r0.lignes, "1.4", "bien").patch, { etapes: { "1.4": { statut: "bien" } } });
});

cas("le conflit d'une remarque, d'un chrono et de « à retenir » : sous le verrou, avec ce qui avait été tapé rendu à l'auteur", async () => {
  const b = baseDebrief();
  // Maxime (site) écrit une remarque sur 2.2 ; la fenêtre de Lina (Discord) montrait l'étape vide.
  assert.ok((await modifierDebrief(b.db, MERCREDI, { etapes: { "2.2": { remarque: "aggro ratée" } }, avant: { etapes: { "2.2": { remarque: "" } } } }, "maxime", CS0, soir)).ok);
  const lina = MSG.patchFenetreEtape("2.2", { chrono: "6:30", remarque: "Kraavos mort trop tôt" }, undefined)!;
  const avecAvant = { ...lina, avant: avantDuPatch(lina, { notes: {} }) };
  assert.deepEqual(avecAvant.avant, { etapes: { "2.2": { chrono: null, remarque: "" } } });
  const r = await modifierDebrief(b.db, MERCREDI, avecAvant, "lina", CS0, soir);
  assert.ok(!r.ok && r.status === 409 && r.message.startsWith(DEBRIEF_CONFLIT));
  assert.deepEqual(lireDebrief(b.lire().debrief).notes["2.2"], { statut: null, chrono: null, remarque: "aggro ratée" });
  assert.equal(texteDuPatch(lina), "6:30 · Kraavos mort trop tôt");
  assert.equal(MSG.noteConflit(r.message, texteDuPatch(lina)), `⚠️ ${DEBRIEF_CONFLIT} l'étape 2.2 Jumeaux : voici sa version, rien n'est changé. Ce que tu avais écrit : « 6:30 · Kraavos mort trop tôt »`);
  // « À retenir » : de même.
  assert.ok((await modifierDebrief(b.db, MERCREDI, { aRetenir: "Équilibrer", avant: { aRetenir: "" } }, "maxime", CS0, soir)).ok);
  const ar = await modifierDebrief(b.db, MERCREDI, { aRetenir: "Autre chose", avant: { aRetenir: "" } }, "lina", CS0, soir);
  assert.deepEqual([ar.ok, b.lire().aRetenir], [false, "Équilibrer"]);
  // Le contrôle ne regarde QUE les champs touchés : une remarque changée n'empêche pas de noter le statut.
  assert.equal(conflitDebrief({ notes: { "2.2": { statut: null, chrono: null, remarque: "aggro ratée" } }, resultat: null, aRetenir: "" }, { etapes: { "2.2": { statut: null } } }, ETAPES), null);
  // Le site l'envoie dans le corps de la route 7 ; un « avant » abîmé est refusé, sans rien écrire.
  const lu = lirePatchDebrief({ etapes: { "2.2": { statut: "mal" } }, avant: { etapes: { "2.2": { statut: null } }, resultat: "gagne", aRetenir: "x" } });
  assert.deepEqual(lu, { ok: true, patch: { etapes: { "2.2": { statut: "mal" } }, avant: { etapes: { "2.2": { statut: null } }, resultat: "gagne", aRetenir: "x" } } });
  assert.deepEqual(lirePatchDebrief({ etapes: { "2.2": { statut: "mal" } }, avant: { etapes: { "2.2": { statut: "super" } } } }), { ok: false, message: "Ce que montrait l'écran est illisible : recharge la page." });
  assert.deepEqual(lirePatchDebrief({ avant: {} }), { ok: false, message: "Rien à enregistrer." });
  // appliquerDebrief (pur) : le conflit passe avant toute autre règle.
  assert.deepEqual(appliquerDebrief({ notes: {}, resultat: "perdu", aRetenir: "" }, { resultat: "gagne", avant: { resultat: null } }, ETAPES),
    { ok: false, status: 409, message: `${DEBRIEF_CONFLIT} le résultat : voici sa version, rien n'est changé.` });
});

cas("le site et le bot envoient « avant » ; la page relit le débrief sur un 409 ; les boutons portent ce que le message montrait", () => {
  const page = readFileSync(join(process.cwd(), "src/components/chambres/Debrief.tsx"), "utf8");
  assert.match(page, /\{ \.\.\.patch, avant: avantDuPatch\(patch, vues\.current\) \}/);
  assert.match(page, /if \(r\?\.status === 409\) await charger\(\);/);
  assert.equal((page.match(/vues\.current = /g) ?? []).length, 3); // chargement, saisie, publication
  const seances = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  assert.match(seances, /avant: avantDuPatch\(patch, debrief\)/);
  assert.match(seances, /avant: \{ aRetenir: actuel \}/);
  assert.match(seances, /res\.message\.startsWith\(DEBRIEF_CONFLIT\) \? M\.noteConflit/);
  // Les boutons du parcours : la note et le résultat MONTRÉS (« - » : rien), sous 100 signes.
  const m = MSG.messageDebrief(DEB({ code: "1.2" }));
  const ids = tousLesBoutons(m).map((x) => x.custom_id ?? "");
  assert.ok(ids.includes("cs:debs:cs_2026-10-21_mer:1.2:bien:-") && ids.includes("cs:debi:cs_2026-10-21_mer:1.2:perdu:gagne"));
  assert.equal(MSG.lireId("cs:debs:cs_2026-10-21_mer:1.2:bien:-")!.reste, "1.2:bien:-");
  // « Clôturer » sans 🏰 : le château dit « Chambre Secrète » (le titre), pas « clôturer » (§8.2).
  const cl = tousLesBoutons(MSG.messageDebrief(DEB({ cloturee: false }))).find((x) => x.label === "Clôturer") as unknown as { emoji?: unknown };
  assert.equal(cl.emoji, undefined);
});

cas("décision 5 : les consignes de la clôture et du débrief Discord se règlent dans le paramétrage, avec leur défaut dans le code", () => {
  assert.match(PARAMETRES_CS_DEFAUT.textes.cloture, /^Tous les participants sont cochés : \*\*décoche les absents\*\*/);
  assert.deepEqual([normaliserCS({ textes: { piedRecap: "x" } }).textes.cloture, normaliserCS({}).textes.debrief], [PARAMETRES_CS_DEFAUT.textes.cloture, PARAMETRES_CS_DEFAUT.textes.debrief]);
  assert.equal(normaliserCS({ textes: { cloture: "Coche qui était là @everyone" } }).textes.cloture.includes("@everyone"), false);
  assert.ok(validerParametres("cs", { ...PARAMETRES_CS_DEFAUT, textes: { ...PARAMETRES_CS_DEFAUT.textes, debrief: "x".repeat(401) } }).some((e) => /débrief dans Discord : 401 signes/.test(e)));
  // La clôture : la consigne du staff, ses variables remplies ; vidée, un repli court.
  const m = MSG.messageCloture(CLOT({ texte: "Coche qui était là le {date}.", vars: { date: "mercredi 21 octobre" } }));
  assert.match(m.embeds[0].description!, /^Coche qui était là le mercredi 21 octobre\.\n/);
  assert.match(MSG.messageCloture(CLOT({ texte: "  " })).embeds[0].description!, /^Décoche les absents, puis valide\./);
  // Le débrief : la consigne en petit sous l'étape ; aucune quand le geste n'a pas de sens (annulée).
  const d = MSG.messageDebrief(DEB({ texte: "Note vite, {date}.", vars: { date: "mercredi 21 octobre" } })).embeds[0].description!;
  assert.match(d, /\n\n-# Note vite, mercredi 21 octobre\.$/);
  assert.doesNotMatch(MSG.messageDebrief(DEB({ annulee: true })).embeds[0].description!, /-# Bien, Moyen ou Mal/);
  assert.match(MSG.messageDebrief(DEB({ figees: false })).embeds[0].description!, /\n\n-# Bien, Moyen ou Mal .+\n-# La liste des étapes se fige à la première note/);
  assert.deepEqual(horsTable(MSG.messageDebrief(DEB())), []);
});

cas("l'autocomplétion de la séance ne s'ouvre qu'au staff (compte relu en base) : un visiteur, un candidat ou un ami n'y voit rien", () => {
  const cmd = readFileSync(join(process.cwd(), "bot/commands/chambre.ts"), "utf8");
  const corps = cmd.slice(cmd.indexOf("export async function autocomplete"), cmd.indexOf("export async function execute"));
  assert.ok(corps.indexOf("if (!(await gardeStaff(i)).ok) { await i.respond([]); return; }") > 0);
  assert.ok(corps.indexOf("gardeStaff(i)") < corps.indexOf("prisma.seanceGuilde.findMany"));
  const seances = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  assert.match(seances, /export async function gardeStaff\(i: Auteur\): Promise<StaffPret> \{\n  const \{ user, refus \} = await compteDiscord\(i\.user\.id\);/);
});

/* ══ Lot 7 — l'image du débrief et sa publication sur Discord (§4.11, §8.6 ; M7) ═══════════
   L'image se rend ici pour de vrai (sharp, Pango, les polices de public/fonts) ; l'embed, le fil
   du forum, les droits et le refus se vérifient sur leurs fonctions pures — Discord n'est pas
   joignable en local. ═════════════════════════════════════════════════════════════════════ */

/** Le 18/10/2026, tel que l'import l'écrit (statuts et remarques mot pour mot, aucun chrono). */
const IMAGE_18 = () => {
  const lu = lireDebriefImporte(JSON.parse(readFileSync(join(process.cwd(), FICHIER_18), "utf8")));
  if (!lu.ok) throw new Error(lu.erreurs.join("\n"));
  const r = resumeDebrief(lu.d.etapes, lu.d.notes, CHRONO_VIDE, lu.d.resultat, lu.d.aRetenir);
  return donneesImage({
    date: lu.d.date, phases: lu.d.phases, chiffres: true, site: hoteDuSite("https://vanguardhub.fr"), clotureAt: null,
    vue: { resume: r, analyse: { ...analyseDebrief(r, []), precedentLabel: null }, joueurs: [], nbJoueurs: lu.d.joueurs },
  });
};

cas("l'image : le texte saisi est échappé (« <b> & co » s'affiche tel quel), sans émoji ni caractère de contrôle", () => {
  assert.equal(echapperBalisage(`<b> & co "x" 'y'`), "&lt;b&gt; &amp; co &quot;x&quot; &apos;y&apos;");
  assert.equal(texteImage("Bien joué 🔥🔥 <:Arcaniste:1498696982229811352> !"), "Bien joué !");
  assert.equal(texteImage("1️⃣ rotation · 👍🏽 ok"), "1 rotation · ok");
  assert.equal(texteImage("12\u202F500 PV\u0007\ttab"), "12\u00A0500 PV tab");
  assert.equal(texteImage("  ligne 1  \n\n\n\nligne 2 "), "ligne 1\n\nligne 2");
  assert.equal(hoteDuSite("https://vanguardhub.fr/"), "vanguardhub.fr/compositions");
  assert.equal(hoteDuSite(""), "");
  assert.equal(hoteDuSite("pas une adresse"), "");
  assert.equal(dateCourte("2026-10-18"), "18/10");
});

cas("l'image du 18/10/2026 : 5 phases, 13 étapes, les statuts et les remarques mot pour mot, GAGNÉ, 10 joueurs, aucun chrono", () => {
  const d = IMAGE_18();
  assert.equal(d.titre, TITRE_IMAGE);
  assert.equal(d.sousTitre, "Dimanche 18 octobre 2026 · 10 joueurs");
  assert.deepEqual(d.phases.map((p) => p.nom), Object.values(PHASES_CS_DEFAUT));
  assert.equal(d.phases.flatMap((p) => p.lignes).length, 13);
  const l = Object.fromEntries(d.phases.flatMap((p) => p.lignes).map((x) => [x.code, x]));
  assert.deepEqual([l["2.1"].statut, l["3.2"].statut, l["5"].statut], ["moyen", "mal", "moyen"]);
  assert.equal(l["4.3"].remarque, "Mauvais placement sur la phase d'aggro, veuillez à ne pas dépasser la fin du couleur pour ne pas vous faire aggro");
  assert.deepEqual([d.resultat, d.total, d.complet, d.ecartTotal, d.record, d.joueurs], ["gagne", 0, false, null, false, null]);
  // Décision 8 : les monstres de chaque étape, du déroulé par défaut, sur le code.
  assert.ok(l["2.2"].monstres.length >= 2 && l["3.4"].monstres.length >= 1);
  assert.deepEqual(phrasesAnalyse(d), []);
});

cas("l'image : les joueurs sont les PRÉSENTS de la clôture ; leurs chiffres DÉCLARÉS seulement si le salon les permet", () => {
  const r = resumeDebrief(ETAPES, {}, CHRONO_VIDE, "perdu", "");
  const joueurs = [
    { pseudo: "Kaelis", classe: "Arcaniste", player: "k", moi: false, present: true, poste: null, role: null, enLigne: "", chiffres: [fige("dps", 182_000, "182 k/s")], salles: [], jumeau: null },
    { pseudo: "Mira", classe: "Arcaniste", player: "m", moi: false, present: false, poste: null, role: null, enLigne: "", chiffres: [], salles: [], jumeau: null },
  ];
  const base = { date: "2026-10-21", phases: CS0.phases, site: "", vue: { resume: r, analyse: null, joueurs, nbJoueurs: 1 } };
  const avec = donneesImage({ ...base, chiffres: true, clotureAt: Date.UTC(2026, 9, 21, 21) });
  assert.deepEqual(avec.joueurs!.map((j) => [j.pseudo, j.chiffres.length]), [["Kaelis", 1]]);
  assert.equal(avec.clotureLe, "21/10");
  assert.deepEqual(donneesImage({ ...base, chiffres: false, clotureAt: Date.UTC(2026, 9, 21, 21) }).joueurs!.map((j) => j.chiffres.length), [0]);
  assert.equal(donneesImage({ ...base, chiffres: true, clotureAt: null }).joueurs, null);
  // Le chiffre en mots : pas d'émoji dans l'image.
  assert.deepEqual(chiffreImage([fige("dps", 182_000, "182 k/s")]), { texte: "182 k/s", date: "12/10/26", aRemesurer: false });
  assert.deepEqual(chiffreImage([fige("offtank", 6_100_000, "6,1 M PV", "sceptre"), fige("tank", 5_200_000, "5,2 M PV", "poing", true)]),
    { texte: "6,1 M PV (sceptre) · 5,2 M PV (poing)", date: "12/10/26", aRemesurer: true });
  assert.equal(chiffreImage([]), null);
  // Les couleurs : celles de GENESIS ; Moyen garde un texte sombre sur l'or (tableau_debrief.py:93).
  assert.deepEqual([COULEURS.noir, COULEURS.anthracite, COULEURS.crimson, COULEURS.or, COULEURS.ivoire], ["#08080C", "#15151D", "#A6192E", "#C69A55", "#F2EDE5"]);
  assert.deepEqual([PASTILLES.moyen.fond, PASTILLES.moyen.texte, PASTILLES.mal.fond, PASTILLES.vide.mot], ["#C69A55", "#08080C", "#A6192E", "—"]);
});

cas("l'image se rend : un PNG de 1 080 px, plein (sans alpha), en Cinzel et Athiti ; une remarque « <b> & co » ne casse rien", async () => {
  const png = await imageDebrief(IMAGE_18());
  const m = await sharp(png).metadata();
  assert.deepEqual([m.format, m.width, m.hasAlpha], ["png", LARGEUR, false]);
  assert.ok(m.height! > 1800 && m.height! < 4000, `hauteur ${m.height}`);
  // Sans échappement, Pango refuserait ce balisage et sharp lèverait une erreur.
  const d = IMAGE_18();
  d.phases[0].lignes[0].remarque = "<b> & co </span><span foreground='red'>";
  d.aRetenir = "Ne pas <i>tout</i> taper & attendre ; 🔥";
  const png2 = await imageDebrief(d);
  assert.ok((await sharp(png2).metadata()).height! > m.height!);
  // Les polices sont celles du dépôt : Cinzel (variable) et Athiti, chargées par fichier.
  for (const f of ["Cinzel-VariableFont_wght.ttf", "Athiti-Regular.ttf", "Athiti-SemiBold.ttf", "Athiti-Bold.ttf"]) assert.ok(existsSync(join(process.cwd(), "public/fonts", f)), f);
});

cas("l'image : une remarque de 300 signes (le maximum) tient ENTIÈRE sur sa ligne, sous l'étape, « · 2 vidéos sur le site » compris (§4.11)", async () => {
  // Dans une colonne de 290 px, comme chez le modèle, elle demandait 13 lignes et se coupait aux
  // deux tiers : la remarque a sa propre ligne, sur toute la largeur de la carte.
  const longues = [
    "Mauvais placement sur la phase d'aggro, veuillez à ne pas dépasser la fin du couloir pour ne pas vous faire aggro. Les deux tanks annoncent la vie de leur boss et le pourcentage, on attend le signal avant de lancer les sorts de zone ; Ener garde le sceptre jusqu'au troll de droite et on recommence.",
    "MMMM WWWW Mauvais Mouvement Massif : Wilhelm, Morwen et Maxime ont MAL WAITÉ le MOMENT où MALPHAS MONTAIT, donc WIPE. Mémo : Mettre le Mur, Maintenir la Marque, Mesurer le Mana, et WAIT le signal de Wilhelm avant chaque Mouvement ; Morwen MÈNE, Maxime Maintient, Wilhelm Wipe-check, encore et encore.",
  ].map((t) => t.slice(0, REMARQUE_MAX));
  for (const t of longues) {
    const b = await bloc(`${echapperBalisage(texteImage(t))}<span> · 2 vidéos sur le site</span>`, REMARQUE_IMAGE.police, REMARQUE_IMAGE.largeur);
    assert.ok(b.lignes <= MAX_LIGNES_REMARQUE, `${t.length} signes : ${b.lignes} lignes`);
  }
  assert.ok(REMARQUE_IMAGE.largeur > 900, `largeur ${REMARQUE_IMAGE.largeur}`);
});

/** M7 tiré du débrief type des cas du lot 6 bis (DEB). */
const PUB = (o: Partial<MSG.DonneesPublie> = {}): MSG.DonneesPublie => {
  const d = DEB();
  return {
    cle: d.cle, jour: d.jour, resultat: d.resultat, total: d.total, complet: d.complet, analyse: d.analyse, aRetenir: d.aRetenir,
    nbJoueurs: 10, texte: CS0.textes.debriefPublie, vars: { date: "mercredi 21 octobre" }, site: "https://genesis.example", maj: soir(), ...o,
  };
};

cas("M7 : le débrief publié — résultat, temps, analyse, à retenir, l'image jointe et le lien du site ; aucune mention", () => {
  const m = MSG.messageDebriefPublie(PUB());
  bornesDiscord(m);
  assert.deepEqual(horsTable(m), []);
  const e = m.embeds[0];
  assert.equal(e.title, "📝 Retour de la Chambre — mercredi 21 octobre");
  assert.equal(e.url, "https://genesis.example/compositions?onglet=bilans&seance=cs_2026-10-21_mer");
  assert.deepEqual(e.image, { url: "attachment://debrief.png" });
  assert.equal(MSG.IMAGE_DEBRIEF, "debrief.png");
  assert.equal(e.color, MSG.COULEUR.vert);
  assert.match(e.description!, /^🏆 \*\*GAGNÉ\*\* · ⏱️ Temps total \*\*\d+:\d\d\*\*/);
  assert.match(e.description!, /\n👥 10 joueurs\n\nChaque étape, son statut, son chrono et sa remarque sont sur l'image ; le débrief complet est sur le site\.$/);
  assert.deepEqual(e.fields!.map((f) => f.name), ["🔎 Analyse", "📌 À retenir"]);
  assert.equal(e.footer!.text, "GENESIS · ⚡ plus rapide · 🐌 plus lent que la dernière fois");
  assert.deepEqual(m.allowedMentions, { parse: [] });
  assert.equal(m.content, undefined);
  const b = tousLesBoutons(m);
  assert.deepEqual(b.map((x) => [x.label, x.style, x.url]), [["Lire le débrief sur le site", ButtonStyle.Link, e.url]]);
  // PERDU : 💀 et la barre reste crimson ; sans résultat, crimson aussi.
  const perdu = MSG.messageDebriefPublie(PUB({ resultat: "perdu" })).embeds[0];
  assert.match(perdu.description!, /^💀 \*\*PERDU\*\* · /);
  assert.equal(perdu.color, MSG.COULEUR.crimson);
  assert.equal(MSG.messageDebriefPublie(PUB({ resultat: null })).embeds[0].color, MSG.COULEUR.crimson);
});

cas("M7 : record, écart, temps partiel, aucun chrono ; la phrase du paramétrage, ses variables, vide ou retirée ; « à retenir » échappé", () => {
  const a = analyseDebrief(resumeDebrief(ETAPES, {}, CHRONO_VIDE, null, ""), []);
  const avecEcart = { ...a, ecartTotal: { texte: "−1:23", signe: -1 as const }, record: true, precedentLabel: "dimanche 18 octobre" };
  const d1 = MSG.messageDebriefPublie(PUB({ total: 2537, complet: true, analyse: avecEcart })).embeds[0].description!;
  assert.match(d1, /⏱️ Temps total \*\*42:17\*\* \(⚡ −1:23 par rapport au dimanche 18 octobre\)\n🥇 Nouveau record de temps total !/);
  const d2 = MSG.messageDebriefPublie(PUB({ total: 600, complet: false, analyse: { ...a, precedentLabel: null } })).embeds[0].description!;
  assert.match(d2, /\*\*10:00\*\* \(temps partiel : il manque le chrono d'une étape\)/);
  assert.match(MSG.messageDebriefPublie(PUB({ total: 0, analyse: null, nbJoueurs: null })).embeds[0].description!, /^🏆 \*\*GAGNÉ\*\* · ⏱️ Aucun chrono pris\n\nChaque étape/);
  assert.match(MSG.messageDebriefPublie(PUB({ texte: "Retour du {date}." })).embeds[0].description!, /\n\nRetour du mercredi 21 octobre\.$/);
  assert.doesNotMatch(MSG.messageDebriefPublie(PUB({ texte: "  " })).embeds[0].description!, /\n\n/);
  assert.equal(MSG.messageDebriefPublie(PUB({ aRetenir: "Ki_ra *tank*" })).embeds[0].fields!.find((f) => f.name === "📌 À retenir")!.value, "Ki\\_ra \\*tank\\*");
  assert.equal(MSG.messageDebriefPublie(PUB({ aRetenir: "  " })).embeds[0].fields!.some((f) => f.name === "📌 À retenir"), false);
  // Décision 5 : la phrase se règle dans le paramétrage ; une mention saisie y est retirée.
  assert.equal(normaliserCS({}).textes.debriefPublie, PARAMETRES_CS_DEFAUT.textes.debriefPublie);
  assert.equal(normaliserCS({ textes: { debriefPublie: "Lisez @everyone" } }).textes.debriefPublie.includes("@everyone"), false);
  assert.ok(validerParametres("cs", { ...PARAMETRES_CS_DEFAUT, textes: { ...PARAMETRES_CS_DEFAUT.textes, debriefPublie: "x".repeat(401) } }).some((e) => /débrief publié : 401 signes/.test(e)));
  // Sans adresse du site : pas de lien, pas de bouton (Discord refuse un lien vide).
  const sans = MSG.messageDebriefPublie(PUB({ site: "" }));
  assert.deepEqual([sans.embeds[0].url, sans.components], [undefined, []]);
});

cas("le forum : un fil « Retour Chambre — {date} », étiqueté Donjon ; les droits qui manquent, nommés ; le refus relu au moment de publier", () => {
  assert.equal(MSG.nomDuFil("dimanche 18 octobre"), "Retour Chambre — dimanche 18 octobre");
  assert.ok(MSG.nomDuFil("x".repeat(200)).length <= 100);
  const tags = [{ id: "1", name: "Annonce" }, { id: "2", name: "DONJON " }, { id: "3", name: "Donjón" }];
  assert.deepEqual(MSG.etiquettesDuFil(tags, false), ["2"]);
  assert.deepEqual(MSG.etiquettesDuFil([{ id: "1", name: "Annonce" }], false), []);
  assert.deepEqual(MSG.etiquettesDuFil([{ id: "1", name: "Annonce" }], true), ["1"]);
  assert.deepEqual(MSG.etiquettesDuFil([], true), []);
  const tous = () => true;
  assert.deepEqual(MSG.droitsManquants(tous, false), []);
  const sauf = (...d: bigint[]) => (x: bigint) => !d.includes(x);
  assert.deepEqual(MSG.droitsManquants(sauf(PermissionFlagsBits.AttachFiles), false), ["Joindre des fichiers"]);
  assert.deepEqual(MSG.droitsManquants(sauf(PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks), true), ["Créer des publications", "Intégrer des liens"]);
  const ok = { evenement: "cs", creneau: "mer", annulee: false, publie: true, nouveauxMessages: true };
  assert.equal(MSG.refusPublicationDebrief(ok), null);
  assert.match(MSG.refusPublicationDebrief({ ...ok, nouveauxMessages: false })!, /^La bascule est coupée : le bot Python publie encore ses débriefs/);
  assert.match(MSG.refusPublicationDebrief({ ...ok, publie: false })!, /repassé en brouillon/);
  assert.match(MSG.refusPublicationDebrief({ ...ok, annulee: true })!, /annulée/);
  assert.match(MSG.refusPublicationDebrief({ ...ok, evenement: "gs", creneau: "sam2100" })!, /Guild Siege/);
});

cas("la publication sur Discord, lue dans la file : en file, faite (et son lien), en échec (sa raison, au staff seulement)", () => {
  const t = new Date("2026-10-21T21:00:00Z"), u = new Date("2026-10-21T21:00:12Z");
  assert.deepEqual(etatPublication(null, null, true), { statut: "aucune", lien: null, erreur: null, le: null });
  assert.equal(etatPublication(null, "https://discord.com/channels/1/2/3", false).statut, "faite");
  assert.deepEqual(etatPublication({ status: "PENDING", result: null, createdAt: t, processedAt: null }, null, true), { statut: "en_file", lien: null, erreur: null, le: t.getTime() });
  assert.deepEqual(etatPublication({ status: "DONE", result: "message x", createdAt: t, processedAt: u }, "https://discord.com/channels/1/2/3", true),
    { statut: "faite", lien: "https://discord.com/channels/1/2/3", erreur: null, le: u.getTime() });
  const echec = { status: "FAILED", result: "Il manque au bot, dans #debriefs : Joindre des fichiers.", createdAt: t, processedAt: u };
  assert.equal(etatPublication(echec, null, true).erreur, echec.result);
  assert.deepEqual([etatPublication(echec, null, false).statut, etatPublication(echec, null, false).erreur], ["echec", null]);
});

cas("le bot publie par `publierDebrief` (droits vérifiés AVANT d'envoyer, chiffres selon le salon) ; le parcours Discord met en file comme le site", () => {
  const bc = readFileSync(join(process.cwd(), "bot/lib/botcommands.ts"), "utf8");
  assert.match(bc, /else if \(cmd\.type === "seance_debrief"\) result = await publierDebrief\(client, p\);/);
  const generique = readFileSync(join(process.cwd(), "src/app/api/admin/bot-command/route.ts"), "utf8");
  assert.doesNotMatch(generique.match(/const ALLOWED = \[[^\]]*\]/)?.[0] ?? "", /seance_debrief/);
  const sc = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  const corps = sc.slice(sc.indexOf("export async function publierDebrief"));
  assert.ok(corps.indexOf("M.refusPublicationDebrief(") < corps.indexOf("M.droitsManquants("));
  assert.ok(corps.indexOf("M.droitsManquants(") < corps.indexOf("composerPublication("));
  assert.ok(corps.indexOf("composerPublication(") < corps.indexOf("threads.create("));
  assert.match(corps, /M\.chiffresPermis\(\{ degatsDiscord: p\.degats\.discord, salonFerme: fermeAuxVisiteurs\(ch\) \}\)/);
  assert.match(corps, /name: M\.nomDuFil\(dateLongue\(row\.date\)\)/);
  assert.match(corps, /patch: \{ debriefLien: lien \}/);
  // Le parcours Discord : la commande seulement après la bascule, comme la route 8.
  const pub = sc.slice(sc.indexOf("async function publierDepuisDiscord"), sc.indexOf("async function brouillonDepuisDiscord"));
  assert.match(pub, /if \(p\.nouveauxMessages\) \{\n/);
  assert.match(pub, /if \(!deja\) await prisma\.botCommand\.create\(\{ data: \{ type: "seance_debrief", payload: \{ seanceId: res\.seance\.id \}, createdBy: v\.par \} \}\);/);
  // L'essai (M12) envoie M7 et son image dans le salon des essais, sans mention.
  assert.match(sc, /const e = M\.enEssai\(m7, n\.join\("\\n"\)\);/);
  const r3 = readFileSync(join(process.cwd(), "src/app/api/evenements/parametres/essai/route.ts"), "utf8");
  assert.match(r3, /\["panneau", "annulation", "recap", "repartition", "chrono", "debrief", "echange"\]/);
});

cas("l'image Docker : fontconfig, Cinzel et Athiti installées, fc-cache ; sharp épinglé dans package.json et le verrou (piège n° 8)", () => {
  const df = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");
  assert.match(df, /apt-get install -y --no-install-recommends openssl fontconfig/);
  assert.match(df, /COPY public\/fonts\/Cinzel-VariableFont_wght\.ttf public\/fonts\/Athiti-\*\.ttf \/usr\/local\/share\/fonts\/genesis\//);
  assert.ok(df.indexOf("RUN fc-cache -f") > df.indexOf("/usr/local/share/fonts/genesis/"));
  assert.ok(df.indexOf("/usr/local/share/fonts/genesis/") < df.indexOf("RUN npm ci"));
  const pj = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(join(process.cwd(), "package-lock.json"), "utf8"));
  assert.deepEqual([pj.dependencies.sharp, lock.packages[""].dependencies.sharp, lock.packages["node_modules/sharp"].version, lock.packages["node_modules/sharp"].optional], ["0.34.5", "0.34.5", "0.34.5", undefined]);
});

console.log("\nLot 8 — les vidéos de débrief (§10 ; décision 3 : le staff seul les joint)");

const lienOk = (u: string) => { const l = lireLienVideo(u); assert.ok(l.ok, `${u} : ${"error" in l ? l.error : ""}`); return l as Extract<ReturnType<typeof lireLienVideo>, { ok: true }>; };
const lienRefuse = (u: unknown) => { const l = lireLienVideo(u); assert.ok(!l.ok, `${String(u)} aurait dû être refusé`); return (l as { error: string }).error; };

cas("lireLienVideo : YouTube sous toutes ses formes, normalisé, et son t= devient le moment par défaut", () => {
  const w = lienOk("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m35s&list=PL123");
  assert.deepEqual([w.source, w.url, w.moment, w.lecteur], ["youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 95, { genre: "youtube", id: "dQw4w9WgXcQ" }]);
  assert.equal(lienOk("youtu.be/dQw4w9WgXcQ?t=95").moment, 95);                         // sans schéma
  assert.equal(lienOk("https://youtu.be/dQw4w9WgXcQ").moment, null);
  assert.equal(lienOk("https://m.youtube.com/watch?v=dQw4w9WgXcQ&start=42").moment, 42);
  for (const u of ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://youtube.com/live/dQw4w9WgXcQ?si=x", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "http://www.youtube.com/watch?v=dQw4w9WgXcQ"]) {
    assert.equal(lienOk(u).url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", u);
  }
  assert.equal(lienOk("https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=1h2m3s").moment, 3723);
  assert.match(lienRefuse("https://www.youtube.com/watch?v=court"), /ne mène pas à une vidéo/);
  assert.match(lienRefuse("https://www.youtube.com/@genesis"), /ne mène pas à une vidéo/);
  // Un clip YouTube ne s'intègre pas : il s'ouvre sur YouTube.
  assert.deepEqual(lienOk("https://youtube.com/clip/UgkxAbCdEfGh").lecteur, { genre: "externe" });
});

cas("lireLienVideo : Twitch — une rediffusion (avec t=1h2m3s) ou un clip ; un direct ne se rejoue pas", () => {
  const v = lienOk("https://www.twitch.tv/videos/2276542123?t=1h2m3s");
  assert.deepEqual([v.source, v.url, v.moment, v.lecteur], ["twitch", "https://www.twitch.tv/videos/2276542123", 3723, { genre: "twitch", video: "2276542123" }]);
  assert.equal(lienOk("https://m.twitch.tv/videos/2276542123?t=01h02m03s").moment, 3723);
  const c1 = lienOk("https://clips.twitch.tv/BraveTiredOwlPogChamp-AbC123");
  const c2 = lienOk("https://www.twitch.tv/genesis_flyff/clip/BraveTiredOwlPogChamp-AbC123?filter=clips");
  const c3 = lienOk("https://clips.twitch.tv/embed?clip=BraveTiredOwlPogChamp-AbC123&parent=x");
  for (const c of [c1, c2, c3]) assert.deepEqual([c.url, c.lecteur, c.moment], ["https://clips.twitch.tv/BraveTiredOwlPogChamp-AbC123", { genre: "clip", slug: "BraveTiredOwlPogChamp-AbC123" }, null]);
  assert.match(lienRefuse("https://www.twitch.tv/genesis_flyff"), /un direct ne se rejoue pas/);
});

cas("lireLienVideo : Medal et un message Discord en lien externe ; les fichiers Discord (liens signés) refusés", () => {
  const m = lienOk("https://medal.tv/games/airflyff/clips/jz8kQ7n0Bv/d1337abc?invite=cr-MSx0&theater=true");
  assert.deepEqual([m.source, m.url, m.lecteur], ["medal", "https://medal.tv/games/airflyff/clips/jz8kQ7n0Bv/d1337abc", { genre: "externe" }]);
  assert.match(lienRefuse("https://medal.tv/games/airflyff"), /ne mène pas à un clip/);
  const d = lienOk("https://discord.com/channels/1498696982229811350/1498696982229811352/1529000000000000001");
  assert.deepEqual([d.source, d.url, d.lecteur.genre], ["discord", "https://discord.com/channels/1498696982229811350/1498696982229811352/1529000000000000001", "externe"]);
  assert.equal(lienOk("https://ptb.discordapp.com/channels/1498696982229811350/1498696982229811352/1529000000000000001").url, d.url);
  assert.match(lienRefuse("https://discord.com/channels/@me/1498696982229811352/1529000000000000001"), /conversation privée/);
  assert.match(lienRefuse("https://discord.com/channels/1498696982229811350"), /ne mène pas à un message/);
  for (const u of ["https://cdn.discordapp.com/attachments/1/2/combat.mp4?ex=6711&is=670f&hm=ab12", "https://media.discordapp.net/attachments/1/2/combat.mp4"]) {
    assert.equal(lienRefuse(u), REFUS_FICHIER_DISCORD);
  }
});

cas("lireLienVideo : tout autre lien https en externe ; http, javascript:, identifiants, espaces et liens trop longs refusés", () => {
  const a = lienOk("https://streamable.com/abc123#ancre");
  assert.deepEqual([a.source, a.url, a.lecteur.genre], ["autre", "https://streamable.com/abc123", "externe"]);
  assert.match(lienRefuse("http://exemple.fr/video"), /https:\/\//);
  assert.match(lienRefuse("javascript:alert(1)"), /lien web/);
  assert.match(lienRefuse("https://moi:secret@exemple.fr/v"), /identifiant de connexion/);
  assert.match(lienRefuse("https://youtu.be/dQw4w9WgXcQ ?t=3"), /espaces/);
  assert.match(lienRefuse(`https://exemple.fr/${"a".repeat(LIEN_VIDEO_MAX)}`), /trop long/);
  assert.match(lienRefuse(""), /Colle le lien/);
  assert.match(lienRefuse(42), /Colle le lien/);
  // Le temps d'un lien : illisible ou au-delà de 24 h, rien (le lien reste bon).
  assert.deepEqual(["95", "95s", "1m35s", "1h2m3s", "", "abc", "25h", "100000"].map(lireTempsDuLien), [95, 95, 95, 3723, null, null, null, null]);
});

cas("le type d'un fichier se lit dans ses PREMIERS OCTETS : un .mov renommé en .mp4 (marque qt) est refusé", () => {
  const tete = (marque: string) => new Uint8Array([0, 0, 0, 0x18, ...Buffer.from("ftyp"), ...Buffer.from(marque), 0, 0, 2, 0]);
  for (const m of ["isom", "iso2", "mp42", "avc1", "M4V ", "dash"]) assert.deepEqual(typeDesOctets(tete(m)), { type: "video/mp4" }, m);
  assert.deepEqual(typeDesOctets(tete("qt  ")), { refus: "qt" });
  assert.deepEqual(typeDesOctets(tete("3gp4")), { refus: "inconnu" });
  assert.deepEqual(typeDesOctets(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2])), { type: "video/webm" });
  assert.deepEqual(typeDesOctets(Buffer.from("bonjour, je ne suis pas")), { refus: "inconnu" });
  assert.deepEqual(typeDesOctets(new Uint8Array([0, 0, 0])), { refus: "court" });
  assert.match(refusDesOctets("video/mp4", tete("qt  "))!, /MOV QuickTime/);
  assert.equal(refusDesOctets("video/mp4", tete("isom")), null);
  // Le type lu doit être celui annoncé : un WebM envoyé comme MP4 serait servi sous le mauvais type.
  assert.equal(refusDesOctets("video/mp4", new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])), REFUS_TYPE_VIDEO);
});

cas("Range : une plage donne 206, « bytes=-500 » les 500 derniers, au-delà de la fin 416 ; le reste lit le fichier entier", () => {
  const T = 80 * MO;
  assert.deepEqual(lirePlage("bytes=0-", T), { debut: 0, fin: T - 1 });
  assert.deepEqual(lirePlage("bytes=41943040-42991615", T), { debut: 41943040, fin: 42991615 });
  assert.deepEqual(lirePlage("bytes=100-999999999999", T), { debut: 100, fin: T - 1 });
  assert.deepEqual(lirePlage("bytes=-500", T), { debut: T - 500, fin: T - 1 });
  assert.deepEqual(lirePlage("bytes=-999999999999", T), { debut: 0, fin: T - 1 });
  assert.equal(lirePlage(`bytes=${T}-`, T), "hors");
  assert.equal(lirePlage("bytes=-0", T), "hors");
  for (const h of [null, "", "bytes=0-1,5-9", "octets=0-1", "bytes=9-3", "bytes=-"]) assert.equal(lirePlage(h, T), null, String(h));
});

const ETAPES_V = ETAPES_CS_DEFAUT;

cas("joindre : un lien prend le t= du lien sans moment saisi ; un moment saisi l'emporte ; titre, étape et moment sont relus", () => {
  const d = lireDemandeVideo({ type: "lien", url: "https://youtu.be/dQw4w9WgXcQ?t=95", etape: "2.2", titre: "  Aggro   ratée sur Kraavos " }, ETAPES_V);
  assert.ok(d.ok);
  assert.deepEqual([d.demande.type, d.demande.etape, d.demande.moment, d.demande.titre], ["lien", "2.2", 95, "Aggro ratée sur Kraavos"]);
  const d2 = lireDemandeVideo({ type: "lien", url: "https://youtu.be/dQw4w9WgXcQ?t=95", moment: "0:48", titre: "Vue du tank" }, ETAPES_V);
  assert.ok(d2.ok && d2.demande.moment === 48 && d2.demande.etape === null);
  assert.deepEqual(["1:35", "95", "1m35", "", null].map((m) => { const r = lireMomentVideo(m); return r.ok ? r.moment : "refus"; }), [95, 95, 95, null, null]);
  assert.deepEqual([lireMomentVideo("une minute"), lireMomentVideo("25:00:00")].map((r) => (r.ok ? "ok" : r.status)), [400, 400]);
  assert.deepEqual([lireEtapeVideo("9.9", ETAPES_V), lireTitreVideo(""), lireTitreVideo("x".repeat(121))].map((r) => (r.ok ? "ok" : r.status)), [400, 400, 400]);
  // Le titre part sur Discord : une mention tapée à la main en est retirée (piège n° 15).
  const t = lireTitreVideo("@everyone regardez ça");
  assert.ok(t.ok && !t.titre.includes("@everyone"));
  assert.equal((lireDemandeVideo({ type: "lien", url: "https://cdn.discordapp.com/attachments/1/2/a.mp4", titre: "x" }, ETAPES_V) as { error: string }).error, REFUS_FICHIER_DISCORD);
  assert.equal((lireDemandeVideo({ type: "rien", titre: "x" }, ETAPES_V) as { status: number }).status, 400);
});

cas("joindre un fichier : 101 Mo refusés dès l'annonce (413), un MOV annoncé refusé (415), 100 Mo tout juste acceptés", () => {
  const f = (taille: unknown, mime: unknown) => lireDemandeVideo({ type: "fichier", titre: "Combat", etape: "3.4", moment: "1:35", taille, mime }, ETAPES_V);
  const ok = f(VIDEO_MAX_OCTETS, "video/mp4");
  assert.ok(ok.ok && ok.demande.type === "fichier" && ok.demande.taille === 104_857_600 && ok.demande.moment === 95);
  const gros = f(101 * MO, "video/mp4");
  assert.ok(!gros.ok && gros.status === 413 && /101 Mo : 100 Mo au plus/.test(gros.error));
  const mov = f(MO, "video/quicktime");
  assert.ok(!mov.ok && mov.status === 415 && mov.error === REFUS_TYPE_VIDEO);
  assert.deepEqual([f(0, "video/mp4"), f(1.5, "video/mp4"), f("10", "video/webm")].map((r) => (r.ok ? "ok" : r.status)), [400, 400, 400]);
  assert.equal(VIDEO_MAX_OCTETS, 104_857_600);
});

cas("les bornes d'un envoi : fichiers par séance, quota (les envois en cours comptent), 1 Go libre sur le disque", () => {
  const base = { taille: 64 * MO, fichiersSeance: 2, maxParSeance: 10, utilise: GO, quotaGo: 5, libre: 50 * GO };
  assert.equal(refusEnvoiFichier(base), null);
  const plein = refusEnvoiFichier({ ...base, fichiersSeance: 10 });
  assert.ok(plein && plein.status === 409 && /déjà 10 fichiers vidéo/.test(plein.error));
  const quota = refusEnvoiFichier({ ...base, utilise: 5 * GO - 10 * MO });
  assert.ok(quota && quota.status === 507 && /L'espace vidéo est plein \(5,0 Go sur 5 Go\)/.test(quota.error));
  const disque = refusEnvoiFichier({ ...base, libre: GO + 10 * MO });
  assert.ok(disque && disque.status === 507 && /moins de 1 Go sur le disque/.test(disque.error));
  // L'espace libre qui ne se mesure pas n'arrête pas l'envoi.
  assert.equal(refusEnvoiFichier({ ...base, libre: null }), null);
  assert.deepEqual([refusSeanceVideo({ commencee: true, annulee: false }), refusSeanceVideo({ commencee: false, annulee: false })?.status, refusSeanceVideo({ commencee: true, annulee: true })?.status], [null, 409, 409]);
  assert.deepEqual(["64 Mo", "1,2 Go", "4,5 Mo", "12 Ko", "0 Mo"], [64 * MO, 1.2 * GO, 4.5 * MO, 12 * 1024, 0].map(tailleDite));
  // Contre-vérification : une ligne ouverte il y a plus de 2 h ne compte plus dans les bornes ;
  // son fichier n'est plus accepté (route 16), sinon des envois laissés en attente passeraient
  // ensuite tous ensemble, au-delà du quota et des fichiers par séance.
  const t0 = Date.UTC(2026, 9, 21, 20, 0);
  assert.equal(refusEnvoiExpire(new Date(t0), t0 + 2 * 3_600_000), null);
  const expire = refusEnvoiExpire(t0, t0 + 2 * 3_600_000 + 1);
  assert.ok(expire && expire.status === 409 && /expiré/.test(expire.error));
});

cas("qui voit : le staff et l'auteur tout de suite, un membre une fois le débrief publié (§10.3)", () => {
  assert.deepEqual([
    peutVoirVideo({ staff: true, auteur: false, publie: false }), peutVoirVideo({ staff: false, auteur: true, publie: false }),
    peutVoirVideo({ staff: false, auteur: false, publie: false }), peutVoirVideo({ staff: false, auteur: false, publie: true }),
  ], [true, true, false, true]);
});

cas("le lecteur saute au bon moment : YouTube start=, Twitch parent= (l'hôte de la page) et time=, un fichier #t= ; Medal en externe", () => {
  const ligne = (o: Partial<Parameters<typeof vueVideo>[0]>) => vueVideo({ id: "cmvid000000000000000000001", etape: "2.2", moment: 95, titre: "Aggro", type: "lien", source: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mime: null, taille: null, auteur: "Lina", createdAt: new Date(0), ...o }, false);
  const yt = ligne({});
  assert.deepEqual(yt.lecteur, { genre: "youtube", id: "dQw4w9WgXcQ" });
  assert.deepEqual(lecteurDe(yt, "vanguardhub.fr"), { genre: "iframe", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&autoplay=1&start=95" });
  const tw = ligne({ source: "twitch", url: "https://www.twitch.tv/videos/2276542123" });
  assert.equal(lecteurDe(tw, "localhost").genre, "iframe");
  assert.equal((lecteurDe(tw, "localhost") as { src: string }).src, "https://player.twitch.tv/?video=v2276542123&parent=localhost&autoplay=false&time=0h1m35s");
  assert.match((lecteurDe(ligne({ url: "https://clips.twitch.tv/BraveOwl" }), "vanguardhub.fr") as { src: string }).src, /^https:\/\/clips\.twitch\.tv\/embed\?clip=BraveOwl&parent=vanguardhub\.fr/);
  const fi = ligne({ type: "fichier", source: null, url: null, mime: "video/mp4", taille: 64 * MO });
  assert.deepEqual([fi.url, fi.source, fi.gerer], ["/api/videos/cmvid000000000000000000001/fichier", "fichier", false]);
  assert.deepEqual(lecteurDe(fi, "x"), { genre: "video", src: "/api/videos/cmvid000000000000000000001/fichier#t=95" });
  assert.deepEqual(lecteurDe(ligne({ url: "https://medal.tv/games/airflyff/clips/jz8kQ7n0Bv/d1337abc" }), "x"), { genre: "externe", url: "https://medal.tv/games/airflyff/clips/jz8kQ7n0Bv/d1337abc" });
  // Sans moment : pas de start=, pas de #t=.
  assert.doesNotMatch((lecteurDe(ligne({ moment: null }), "x") as { src: string }).src, /start=/);
  // Dans l'ordre du déroulé, celles de toute la séance d'abord, puis par date.
  const ordre = trierVideos([{ etape: "3.4", le: 1 }, { etape: "1.1", le: 5 }, { etape: null, le: 9 }, { etape: "1.1", le: 2 }, { etape: "zz", le: 0 }], ETAPES_V);
  assert.deepEqual(ordre.map((v) => `${v.etape}:${v.le}`), ["null:9", "1.1:2", "1.1:5", "3.4:1", "zz:0"]);
});

cas("la purge : fichiers des séances trop anciennes (avec leur ligne, les liens restent), envois abandonnés, .part oubliés, orphelins d'un jour", () => {
  const now = Date.parse("2026-10-22T04:30:00+02:00");
  const j = 86_400_000, h = 3_600_000;
  const ids = { vieux: "a".repeat(25), recent: "b".repeat(25), lien: "c".repeat(25), abandon: "d".repeat(25), enCours: "e".repeat(25), orphelin: "f".repeat(25), orphelinJeune: "g".repeat(25) };
  const lignes = [
    { id: ids.vieux, type: "fichier", statut: "pret", fichier: `${ids.vieux}.mp4`, createdAt: now - 200 * j, debutSeance: now - 181 * j },
    { id: ids.recent, type: "fichier", statut: "pret", fichier: `${ids.recent}.webm`, createdAt: now - 3 * j, debutSeance: now - 3 * j },
    { id: ids.lien, type: "lien", statut: "pret", fichier: null, createdAt: now - 400 * j, debutSeance: now - 400 * j },
    { id: ids.abandon, type: "fichier", statut: "envoi", fichier: null, createdAt: now - 2 * h - 1, debutSeance: now - j },
    { id: ids.enCours, type: "fichier", statut: "envoi", fichier: null, createdAt: now - 10 * 60_000, debutSeance: now - j },
  ];
  const fichiers = [
    { nom: `${ids.vieux}.mp4`, taille: 300 * MO, modifie: now - 200 * j },
    { nom: `${ids.recent}.webm`, taille: 50 * MO, modifie: now - 3 * j },
    { nom: `${ids.abandon}.part`, taille: 40 * MO, modifie: now - 3 * h },
    { nom: `${ids.enCours}.part`, taille: 20 * MO, modifie: now - 60_000 },
    { nom: `${ids.orphelin}.mp4`, taille: 62 * MO, modifie: now - j - 1 },
    { nom: `${ids.orphelinJeune}.mp4`, taille: 5 * MO, modifie: now - h },
    { nom: "LISEZMOI.txt", taille: 10, modifie: now - 900 * j },
    { nom: "../../etc.mp4", taille: 10, modifie: now - 900 * j },
  ];
  const p = planPurge({ lignes, fichiers, now, conservationJours: 180 });
  assert.deepEqual(p.anciennes, [ids.vieux]);
  assert.deepEqual(p.abandonnees, [ids.abandon]);
  assert.deepEqual(p.fichiers.sort(), [`${ids.abandon}.part`, `${ids.orphelin}.mp4`, `${ids.vieux}.mp4`].sort());
  assert.deepEqual([p.videos, p.orphelins, p.octets], [2, 1, 402 * MO]);
  assert.equal(bilanPurge(p), "Vidéos : 2 fichiers effacés (402 Mo), dont 1 sans ligne, 1 envoi abandonné");
  assert.equal(bilanPurge(planPurge({ lignes: [], fichiers: [], now, conservationJours: 180 })), "Vidéos : rien à nettoyer");
  // Un envoi interrompu à 50 % ne laisse rien, deux heures plus tard : ni ligne, ni .part.
  const p2 = planPurge({ lignes: [{ ...lignes[4], createdAt: now - 2 * h - 60_000 }], fichiers: [{ nom: `${ids.enCours}.part`, taille: 50 * MO, modifie: now - 2 * h }], now, conservationJours: 180 });
  assert.deepEqual([p2.abandonnees, p2.fichiers], [[ids.enCours], [`${ids.enCours}.part`]]);
  // Un nom qui n'est pas celui d'une vidéo ne sort jamais du dossier.
  assert.throws(() => cheminVideo("../../etc/passwd"));
  assert.throws(() => cheminVideo("/etc/passwd.mp4"));
});

cas("l'envoi sur le disque : 101 Mo coupés par le COMPTEUR même avec un Content-Length menteur, un .mov refusé, un envoi interrompu ne laisse rien", async () => {
  const dossier = await mkdtemp(join(tmpdir(), "videos-"));
  const avant = process.env.VIDEOS_DIR;
  process.env.VIDEOS_DIR = dossier;
  try {
    const tete = (marque: string) => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from(`ftyp${marque}`), Buffer.alloc(12)]);
    /** Un flux web de `total` octets, par morceaux de 1 Mo, la tête en premier. */
    const flux = (premier: Buffer, total: number) => {
      let envoye = 0;
      return new ReadableStream<Uint8Array>({
        pull(c) {
          if (envoye >= total) { c.close(); return; }
          const n = Math.min(MO, total - envoye);
          c.enqueue(envoye === 0 ? Buffer.concat([premier, Buffer.alloc(n - premier.length)]) : new Uint8Array(n));
          envoye += n;
        },
      });
    };
    const id = (c: string) => c.repeat(25);
    // Le client annonce 50 Mo (en-tête menteur) et en pousse 101 : le compteur coupe à 50 Mo + 1.
    const menteur = await ecrireFichierVideo({ id: id("m"), corps: flux(tete("isom"), 101 * MO), attendu: 50 * MO, max: 50 * MO, mime: "video/mp4" });
    assert.ok(!menteur.ok && menteur.status === 413);
    // Un .mov renommé en .mp4 : refusé sur ses 12 premiers octets.
    const mov = await ecrireFichierVideo({ id: id("q"), corps: flux(tete("qt  "), 3 * MO), attendu: 3 * MO, max: 3 * MO, mime: "video/mp4" });
    assert.ok(!mov.ok && mov.status === 415 && /MOV/.test(mov.error));
    // Un envoi qui s'arrête à 50 % (le navigateur fermé) : refusé, rien ne reste.
    const coupe = await ecrireFichierVideo({ id: id("i"), corps: flux(tete("isom"), 40 * MO), attendu: 80 * MO, max: 80 * MO, mime: "video/mp4" });
    assert.ok(!coupe.ok && coupe.status === 400 && /s'est arrêté à 40 Mo sur 80 Mo/.test(coupe.error));
    // Un envoi complet : renommé en <id>.webm, sa taille exacte.
    const bon = await ecrireFichierVideo({ id: id("w"), corps: flux(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), 3 * MO + 17), attendu: 3 * MO + 17, max: 3 * MO + 17, mime: "video/webm" });
    assert.deepEqual(bon, { ok: true, fichier: `${id("w")}.webm`, taille: 3 * MO + 17 });
    // Deux envois de la même ligne ne s'écrivent pas l'un sur l'autre (création exclusive du .part).
    await writeFile(join(dossier, `${id("x")}.part`), "en cours");
    const double = await ecrireFichierVideo({ id: id("x"), corps: flux(tete("isom"), MO), attendu: MO, max: MO, mime: "video/mp4" });
    assert.ok(!double.ok && double.status === 409);
    assert.deepEqual((await readdir(dossier)).sort(), [`${id("w")}.webm`, `${id("x")}.part`].sort());
  } finally {
    if (avant === undefined) delete process.env.VIDEOS_DIR; else process.env.VIDEOS_DIR = avant;
    await rm(dossier, { recursive: true, force: true });
  }
});

cas("M7 : le bloc 🎬 liste les vidéos, chacune menant à la PAGE (lecteur ouvert au bon moment), jamais au fichier", () => {
  const videos: MSG.VideoPubliee[] = [
    { id: "cmv1aaaaaaaaaaaaaaaaaaaaa", etape: "2.2", etapeLabel: "Jumeaux", titre: "Aggro ratée sur Kraavos", auteur: "Lina", moment: 95 },
    { id: "cmv2aaaaaaaaaaaaaaaaaaaaa", etape: "2.2", etapeLabel: "Jumeaux", titre: "Vue du tank [caméra 2]", auteur: "Brann_", moment: 48 },
    { id: "cmv3aaaaaaaaaaaaaaaaaaaaa", etape: null, etapeLabel: null, titre: "Toute la soirée", auteur: "Maxime", moment: null },
  ];
  const m = MSG.messageDebriefPublie(PUB({ videos }));
  bornesDiscord(m);
  assert.deepEqual(horsTable(m), []);
  const e = m.embeds[0];
  const noms = e.fields!.map((f) => f.name);
  assert.deepEqual(noms.slice(-2), ["📌 À retenir", "🎬 Vidéos (3)"]);
  const v = e.fields!.at(-1)!.value.split("\n");
  assert.equal(v[0], "[2.2 Jumeaux — Aggro ratée sur Kraavos](https://genesis.example/compositions?onglet=bilans&seance=" + PUB().cle + "&video=cmv1aaaaaaaaaaaaaaaaaaaaa) (Lina, à 1:35)");
  // Les crochets d'un titre fermeraient le lien ; le Markdown du pseudo est échappé.
  assert.match(v[1], /^\[2\.2 Jumeaux — Vue du tank \(caméra 2\)\]\(.*&video=cmv2a+\) \(Brann\\_, à 0:48\)$/);
  assert.match(v[2], /^\[Toute la séance — Toute la soirée\]\(.*\) \(Maxime\)$/);
  assert.doesNotMatch(e.fields!.at(-1)!.value, /\/api\/videos/);
  // Sans vidéo, pas de bloc ; sans adresse du site, le texte seul.
  assert.ok(!MSG.messageDebriefPublie(PUB()).embeds[0].fields!.some((f) => f.name.startsWith("🎬")));
  assert.equal(MSG.ligneVideo(videos[0], "", "cs_x"), "2.2 Jumeaux — Aggro ratée sur Kraavos (Lina, à 1:35)");
  // Vingt vidéos aux longs titres : le bloc tient dans 1 024 signes, et renvoie au site.
  const beaucoup = Array.from({ length: 20 }, (_, i) => ({ ...videos[0], id: `cmv${String(i).padStart(22, "0")}`, titre: `${"Erreur de placement ".repeat(5)}${i}` }));
  const champ = MSG.messageDebriefPublie(PUB({ videos: beaucoup })).embeds[0].fields!.at(-1)!;
  assert.ok(champ.value.length <= 1024 && champ.value.endsWith("… (voir le site)") && champ.name === "🎬 Vidéos (20)");
});

cas("le lot 8 en place : volume vidéos sur web ET bot, /data/ avec la barre, data au .dockerignore, aucune route /api au middleware, la purge à 4 h 30", () => {
  const lire = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
  const compose = lire("docker-compose.prod.yml");
  assert.equal(compose.match(/- vanguard_videos:\/app\/data\/videos/g)?.length, 2);
  assert.match(compose, /\nvolumes:\n {2}vanguard_db:\n(?: {2}#.*\n)? {2}vanguard_videos:\n/);
  const gi = lire(".gitignore").split("\n").map((l) => l.trim());
  assert.ok(gi.includes("/data/") && !gi.includes("data/") && !gi.includes("data"));
  assert.ok(lire(".dockerignore").split("\n").map((l) => l.trim()).includes("data"));
  // Le middleware ne couvre aucune route /api : il couperait l'envoi d'un fichier à 10 Mo (piège n° 13).
  const mw = lire("src/middleware.ts");
  assert.doesNotMatch(mw.slice(mw.indexOf("export const config")), /\/api/);
  const r16 = lire("src/app/api/videos/[id]/fichier/route.ts");
  assert.match(r16, /export const runtime = "nodejs";/);
  assert.match(r16, /export const dynamic = "force-dynamic";/);
  assert.ok(r16.indexOf("refusEnvoiExpire(v.createdAt") > 0 && r16.indexOf("refusEnvoiExpire(v.createdAt") < r16.indexOf("ecrireFichierVideo({"), "route 16 : l'envoi expiré refusé avant d'écrire");
  // Rien n'est gardé en mémoire : le corps n'est jamais lu d'un coup.
  assert.doesNotMatch(r16, /await req\.(formData|arrayBuffer|blob|text|json)\(/);
  // Le staff seul joint, envoie, modifie et supprime (décision 3) : la garde vient AVANT tout le reste.
  for (const f of ["src/app/api/seances/[cle]/videos/route.ts", "src/app/api/videos/[id]/route.ts", "src/app/api/videos/[id]/fichier/route.ts"]) {
    const t = lire(f);
    for (const verbe of ["POST", "PUT", "PATCH", "DELETE"]) {
      const i = t.indexOf(`export async function ${verbe}(`);
      if (i < 0) continue;
      const corps = t.slice(i, i + 400);
      assert.match(corps, /const a = await apiGuild\(\); if \("error" in a\) return a\.error;\n {2}if \(!canAccessAdmin\(a\.user\.role\)\) return/, `${f} ${verbe}`);
    }
  }
  assert.match(lire("bot/scheduler.ts"), /cron\.schedule\("30 4 \* \* \*", \(\) => \{ purgerLesVideos\(\)\.catch\(console\.error\); \}, CRON_TZ\);/);
  assert.match(lire("bot/lib/seances.ts"), /videos: await videosPubliees\(ligne, p\),/);
  // Le fichier ne passe jamais par public/ (servi à tous sans garde).
  const vs = lire("src/lib/videos-serveur.ts");
  assert.match(vs, /return process\.env\.VIDEOS_DIR\?\.trim\(\) \|\| join\(process\.cwd\(\), "data", "videos"\);/);
  assert.doesNotMatch(vs, /join\([^)]*["']public["']/);
});


/* ══ Lot 9 — le Guild Siege (§11, §9.2 ; décision 2 : codé, réglable, INACTIF par défaut) ════
   Pas de postes : « Je viens » libre, UN PERSO PAR COMPTE ET PAR SÉANCE, écrit dans
   `SeanceParticipant` ; une clôture parmi les annoncés ; un débrief simplifié en embed. Discord
   n'est pas joignable en local : on vérifie les règles, le JSON des messages, et l'écriture
   partagée (site et bot) sur une base en mémoire. */
console.log("\nLot 9 — le Guild Siege");

const SAMEDI_GS = seanceGS("2026-10-24", GS_SAMEDI.creneaux[0]);
const VENDREDI_MIDI = paris("2026-10-23", "12:00");
const annonceGS = (pseudo: string, userId: string | null, dt = 0, classe = "Arcaniste"): AnnonceGS =>
  ({ pseudo, classe, player: pseudo.toLowerCase(), userId, annonceAt: VENDREDI_MIDI.getTime() + dt, present: null });

cas("décision 2 : le Guild Siege est codé mais ÉTEINT par défaut — aucun rappel, et il ne s'allume qu'avec un créneau", () => {
  assert.equal(PARAMETRES_GS_DEFAUT.actif, false);
  assert.deepEqual(rappelsEnService("gs", PARAMETRES_GS_DEFAUT), []);
  assert.deepEqual(rappelsEnService("gs", { ...GS_SAMEDI, actif: false }), []);
  assert.deepEqual(rappelsEnService("gs", GS_SAMEDI).map((r) => r.id), ["veille", "jour", "gs_staff"]);
  // Les défauts du lot 9 : l'annonce d'annulation, la règle du siège, la phrase du débrief, les dégâts.
  assert.equal(PARAMETRES_GS_DEFAUT.annoncerAnnulation, true);
  assert.equal(PARAMETRES_GS_DEFAUT.textes.panneau, "C'est libre : ramène ton meilleur perso, peu importe la classe.");
  assert.equal(PARAMETRES_GS_DEFAUT.textes.debriefPublie, "");
  assert.deepEqual(PARAMETRES_GS_DEFAUT.degats, { composition: true, discord: true, bilans: true });
  // Un `textes` d'avant le lot 9 (sans debriefPublie) garde sa règle et prend le défaut du reste.
  const ancien = normaliserGS({ textes: { panneau: "Libre !" } });
  assert.deepEqual(ancien.textes, { panneau: "Libre !", debriefPublie: "" });
  // Allumer sans créneau : refusé, avec sa raison ; Maxime donnera les jours et horaires.
  assert.ok(validerParametres("gs", { ...PARAMETRES_GS_DEFAUT, actif: true }).includes("Le Guild Siege ne s'active qu'avec au moins un créneau (jour et heure)."));
  assert.deepEqual(validerParametres("gs", { ...GS_SAMEDI }), []);
  // Une fin d'inscription après le début du créneau n'a pas de sens.
  const tard = validerParametres("gs", { ...GS_SAMEDI, creneaux: [{ jour: "sam", heure: "21:00", finInscription: "22:00" }] });
  assert.ok(tard.some((e) => /fin d'inscription \(22:00\) tombe après le début \(21:00\)/.test(e)), tard.join(" | "));
  // Les textes sont bornés, comme ceux des Chambres.
  assert.ok(validerParametres("gs", { ...GS_SAMEDI, textes: { panneau: "x".repeat(401), debriefPublie: "" } }).some((e) => /La règle du siège.*401 signes/.test(e)));
});

cas("« Je viens » au siège : refusé éteint, créneau retiré, clôturé, annulé, commencé, ou pour une autre séance que la prochaine", () => {
  const base = { actif: true, seance: SAMEDI_GS, creneaux: GS_SAMEDI.creneaux, now: VENDREDI_MIDI, annulee: false, cloturee: false };
  assert.equal(refusInscriptionGS(base), null);
  assert.deepEqual(refusInscriptionGS({ ...base, actif: false }), { status: 409, message: "Le Guild Siege n'est pas actif : le PvP n'est pas encore installé." });
  assert.equal(refusInscriptionGS({ ...base, creneaux: [] })?.status, 404);
  assert.deepEqual(refusInscriptionGS({ ...base, cloturee: true }), { status: 409, message: "Ce Guild Siege est clôturé : l'inscription est fermée." });
  assert.equal(refusInscriptionGS({ ...base, annulee: true })?.message, "Ce Guild Siege est annulé.");
  assert.equal(refusInscriptionGS({ ...base, now: paris("2026-10-24", "21:05") })?.message, "Ce Guild Siege a commencé : l'inscription est fermée.");
  // La semaine suivante n'est pas encore ouverte : on s'annonce pour la prochaine seulement.
  const suivant = seanceGS("2026-10-31", GS_SAMEDI.creneaux[0]);
  assert.match(refusInscriptionGS({ ...base, seance: suivant })!.message, /prochain Guild Siege seulement \(samedi 24 octobre · 21 h\)/);
  assert.equal(prochaineSeanceGS(VENDREDI_MIDI, GS_SAMEDI.creneaux)?.cle, "gs_2026-10-24_sam2100");
  assert.equal(creneauDe(SAMEDI_GS, GS_SAMEDI.creneaux)?.finInscription, "19:00");
  // Annulé : la réponse de Discord le dit avec 🚫 (le drapeau `annulee`).
  assert.equal(refusInscriptionGS({ ...base, annulee: true })?.annulee, true);
});

cas("contre-examen lot 9 : deux créneaux à la suite — le panneau du dimanche part le samedi à 20 h, et ses boutons répondent", () => {
  // Samedi et dimanche 21 h : la veille du dimanche (samedi 20 h), le siège du samedi n'a pas
  // encore commencé. « Je viens » doit valoir pour le dimanche, dont le panneau vient de partir.
  const deux = normaliserGS({ actif: true, creneaux: [{ jour: "sam", heure: "21:00", finInscription: "19:00" }, { jour: "dim", heure: "21:00", finInscription: "19:00" }] });
  const dim = seanceGS("2026-10-25", deux.creneaux[1]);
  const sam20 = paris("2026-10-24", "20:05");
  assert.equal(prochaineSeanceGS(sam20, deux.creneaux)?.cle, "gs_2026-10-24_sam2100");
  assert.deepEqual(rappelsDus("gs", deux, sam20).dus.map((d) => `${d.seance.cle}|${d.rappel.id}`), ["gs_2026-10-24_sam2100|jour", "gs_2026-10-25_dim2100|veille"]);
  const base = { actif: true, creneaux: deux.creneaux, now: sam20, annulee: false, cloturee: false };
  assert.equal(refusInscriptionGS({ ...base, seance: dim }), null);
  assert.equal(refusInscriptionGS({ ...base, seance: SAMEDI_GS }), null);
  // Plus loin que la veille : toujours refusé, la règle « la prochaine seulement » tient.
  assert.match(refusInscriptionGS({ ...base, now: paris("2026-10-23", "20:05"), seance: dim })!.message, /prochain Guild Siege seulement \(samedi 24 octobre · 21 h\)/);
  assert.match(refusInscriptionGS({ ...base, seance: seanceGS("2026-10-31", deux.creneaux[0]) })!.message, /prochain Guild Siege seulement/);
});

cas("à vérifier (lot 9) : un compte n'annonce qu'UN perso par séance — un autre perso REMPLACE le premier", () => {
  const moi = { id: "u1", username: "maxime" };
  const o = { compte: moi, viens: true, places: null, label: SAMEDI_GS.label };
  const a = gesteGS([], { ...o, perso: { name: "Kaelis", class: "ARCANISTE" } });
  assert.deepEqual(a, { ok: true, quoi: "annonce", ajout: { pseudo: "Kaelis", classe: "Arcaniste" }, retires: [], message: "Kaelis est annoncé pour le Guild Siege du samedi 24 octobre · 21 h." });
  const deja = [annonceGS("Kaelis", "u1")];
  const b = gesteGS(deja, { ...o, perso: { name: "Brann", class: "PRIMAT" } });
  assert.ok(b.ok && b.quoi === "change");
  assert.deepEqual(b.ok && [b.ajout, b.retires], [{ pseudo: "Brann", classe: "Primat" }, ["Kaelis"]]);
  assert.match(b.ok ? b.message : "", /avec Brann \(à la place de Kaelis\) : un perso par séance/);
  // Le même perso recoché : rien ne change ; sans casse.
  assert.equal((gesteGS(deja, { ...o, perso: { name: "kaelis", class: "ARCANISTE" } }) as { quoi: string }).quoi, "deja");
  // Deux persos du compte déjà là (une ligne d'avant la règle) : on en garde un seul.
  const deux = gesteGS([annonceGS("Kaelis", "u1"), annonceGS("Brann", "u1", 1)], { ...o, perso: { name: "Kaelis", class: "ARCANISTE" } });
  assert.deepEqual(deux.ok && [deux.quoi, deux.ajout, deux.retires], ["change", null, ["Brann"]]);
  // « Pas cette fois » retire l'annonce du compte, quel que soit le perso.
  const pas = gesteGS(deja, { ...o, viens: false, perso: null });
  assert.deepEqual(pas.ok && [pas.quoi, pas.retires], ["retire", ["Kaelis"]]);
  assert.equal((gesteGS([], { ...o, viens: false, perso: null }) as { quoi: string }).quoi, "rien");
  // Un homonyme annoncé par un autre compte : refusé (le nom est unique en jeu, pas en base).
  const homo = gesteGS([annonceGS("Kaelis", "u2")], { ...o, perso: { name: "Kaelis", class: "ARCANISTE" } });
  assert.deepEqual(homo, { ok: false, status: 409, message: "Un autre compte a déjà annoncé un perso nommé Kaelis : vois avec le staff." });
});

cas("le plafond compte les COMPTES visibles ; changer de perso ne demande pas de place en plus", () => {
  const o = { viens: true, places: 2, label: SAMEDI_GS.label, perso: { name: "Nox", class: "ARCANISTE" } };
  const pleins = [annonceGS("Kaelis", "u1"), annonceGS("Brann", "u2", 1)];
  assert.deepEqual(gesteGS(pleins, { ...o, compte: { id: "u3", username: "nox" } }), { ok: false, status: 409, message: "Le Guild Siege est complet : 2 places, toutes prises." });
  // u1 change de perso : il garde sa place.
  assert.ok(gesteGS(pleins, { ...o, compte: { id: "u1", username: "kaelis" } }).ok);
  // Un membre caché depuis son annonce ne prend la place de personne.
  assert.ok(gesteGS(pleins, { ...o, compte: { id: "u3", username: "nox" }, visible: (a) => a.userId !== "u2" }).ok);
  assert.equal(manqueGS(1, 2), "1 place");
  assert.equal(manqueGS(0, 5), "5 places");
  assert.equal(manqueGS(2, 2), null);
  assert.equal(manqueGS(0, null), "du monde");
  assert.equal(manqueGS(3, null), null);
  assert.equal(effectifGS(9, null), "9 annoncés");
  assert.equal(effectifGS(1, 20), "1 / 20 annoncé");
});

cas("la clôture du siège : parmi les annoncés, les cochés présents, les autres absents ; un non-annoncé est rendu", () => {
  const l = clotureGS([annonceGS("Kaelis", "u1"), annonceGS("Brann", "u2")], ["kaelis", "Orin"]);
  assert.deepEqual(l, { lignes: [{ pseudo: "Kaelis", present: true }, { pseudo: "Brann", present: false }], inconnus: ["Orin"] });
  // Le sélecteur de la clôture : les séances commencées, la plus récente d'abord.
  const r = seancesRecentesGS(paris("2026-10-25", "10:00"), GS_SAMEDI.creneaux, 3);
  assert.deepEqual(r.map((x) => x.cle), ["gs_2026-10-24_sam2100", "gs_2026-10-17_sam2100", "gs_2026-10-10_sam2100"]);
  assert.deepEqual(seancesRecentesGS(VENDREDI_MIDI, [], 3), []);
});

cas("le panneau du siège se publie pour la séance qui vient ou qui se joue — jamais une passée ni une lointaine", () => {
  assert.equal(publicationPermiseGS(SAMEDI_GS, VENDREDI_MIDI, GS_SAMEDI.creneaux), null);
  assert.equal(publicationPermiseGS(SAMEDI_GS, paris("2026-10-24", "22:00"), GS_SAMEDI.creneaux), null); // il se joue
  assert.match(publicationPermiseGS(SAMEDI_GS, paris("2026-10-25", "08:00"), GS_SAMEDI.creneaux)!, /passé/);
  assert.match(publicationPermiseGS(seanceGS("2026-10-31", GS_SAMEDI.creneaux[0]), VENDREDI_MIDI, GS_SAMEDI.creneaux)!, /prochain Guild Siege/);
});

cas("le chiffre du siège : le stuff DPS, à défaut Tank, à défaut Off tank — déclaré, figé, avec son arme pour des PV", () => {
  assert.deepEqual(ROLES_GS, ["dps", "tank", "offtank"]);
  const le20 = jour("2026-10-20");
  const dps = chiffreGS([stuff("dps", { dps: 190_000, bulle: 45_000 }, le20)], "ARCANISTE", le20);
  assert.deepEqual([dps.role, dps.enLigne, dps.chiffres[0].valeur], ["dps", "190 k/s", 190_000]);
  const tank = chiffreGS([stuff("tank", { pv: 9_400_000, pvSceptre: 6_100_000 }, le20)], "PRIMAT", le20);
  assert.deepEqual([tank.role, tank.enLigne], ["tank", "9,4 M PV poing"]);
  // Un Primat qui a ses deux stuffs : le DPS l'emporte (des PV et des DPS ne se comparent pas).
  const deux = chiffreGS([stuff("tank", { pv: 9_400_000 }, le20), stuff("dps", { dps: 120_000 }, le20)], "PRIMAT", le20);
  assert.equal(deux.role, "dps");
  assert.deepEqual(chiffreGS([], "ARCANISTE", le20), { role: null, chiffres: [], enLigne: "" });
  assert.deepEqual(rolesAffichageGS("tank").mesure, ["tank"]);
});

/** Une base en mémoire qui se comporte comme Prisma sur ce que `inscrireGS`, `cloturerGS` et
 *  `joueursGS` appellent : la séance (et sa version), ses lignes, les comptes et leurs persos. */
function baseGS(o: { comptes?: { id: string; role: string; cacheLe?: Date | null; isActive?: boolean }[]; persos?: { name: string; class: string; userId: string; gearProfiles: unknown[] }[]; seance?: Record<string, unknown> } = {}) {
  let row: (Record<string, unknown> & { id: string; version: number }) | null = o.seance ? { id: "g", cle: SAMEDI_GS.cle, evenement: "gs", date: SAMEDI_GS.date, creneau: "sam2100", debut: SAMEDI_GS.debut, version: 0, annulee: false, clotureAt: null, cloturePar: null, messages: {}, ...o.seance } : null;
  let lignes: Record<string, unknown>[] = [];
  let n = 0;
  const pause = () => new Promise((r) => setTimeout(r, 1));
  const comptes = o.comptes ?? [{ id: "u1", role: "VETERAN" }, { id: "u2", role: "GUARD" }, { id: "u3", role: "VETERAN" }];
  const db = {
    seanceGuilde: {
      findUnique: async ({ include }: { include?: unknown }) => { await pause(); return row ? { ...structuredClone(row), ...(include ? { participants: structuredClone(lignes) } : {}) } : null; },
      upsert: async ({ create }: { create: Record<string, unknown> }) => { await pause(); if (!row) row = { id: "g", version: 0, annulee: false, clotureAt: null, cloturePar: null, messages: {}, ...create } as never; return structuredClone(row); },
      updateMany: async ({ where, data }: { where: { version: number }; data: Record<string, unknown> }) => {
        await pause();
        if (!row || where.version !== row.version) return { count: 0 };
        const propre = Object.fromEntries(Object.entries(data).filter(([k]) => k !== "version"));
        row = { ...row, ...propre, version: row.version + 1 };
        return { count: 1 };
      },
      findUniqueOrThrow: async () => structuredClone(row),
    },
    seanceParticipant: {
      deleteMany: async ({ where }: { where: { pseudo: { in: string[] } } }) => { lignes = lignes.filter((l) => !where.pseudo.in.includes(l.pseudo as string)); return { count: 1 }; },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (lignes.some((l) => l.pseudo === data.pseudo)) throw Object.assign(new Error("unique"), { code: "P2002" });
        lignes.push({ id: `l${++n}`, createdAt: new Date(), updatedAt: new Date(), slotId: null, ...data });
        return data;
      },
      updateMany: async ({ where, data }: { where: { pseudo: string }; data: Record<string, unknown> }) => { lignes = lignes.map((l) => (l.pseudo === where.pseudo ? { ...l, ...data } : l)); return { count: 1 }; },
    },
    user: { findMany: async ({ where }: { where: { id: { in: string[] } } }) => comptes.filter((u) => where.id.in.includes(u.id)).map((u) => ({ id: u.id, role: u.role, isActive: u.isActive ?? true, cacheLe: u.cacheLe ?? null })) },
    character: { findMany: async () => o.persos ?? [] },
    $transaction: async <T,>(f: (tx: unknown) => Promise<T>) => f(db),
  };
  return { db: db as never, lire: () => row, lignes: () => lignes };
}
const GS_ON = GS_SAMEDI;
const KAELIS = { name: "Kaelis", class: "ARCANISTE", gearProfiles: [stuff("dps", { dps: 190_000 }, jour("2026-10-20"))] };
const BRANN = { name: "Brann", class: "PRIMAT", gearProfiles: [stuff("tank", { pv: 9_400_000 }, jour("2026-10-20"))] };

cas("le site et Discord au même instant, deux persos d'un même compte : une seule annonce reste (verrou de version)", async () => {
  const b = baseGS();
  const moi = { id: "u1", username: "maxime" };
  const t = VENDREDI_MIDI.getTime();
  const [x, y] = await Promise.all([
    inscrireGS(b.db, SAMEDI_GS, { compte: moi, perso: KAELIS, viens: true, p: GS_ON, maintenant: t }),
    inscrireGS(b.db, SAMEDI_GS, { compte: moi, perso: BRANN, viens: true, p: GS_ON, maintenant: t }),
  ]);
  assert.ok(x.ok && y.ok, JSON.stringify([x, y]));
  assert.equal(b.lignes().length, 1, JSON.stringify(b.lignes()));
  assert.equal(b.lignes()[0].userId, "u1");
  assert.equal(b.lignes()[0].present, null); // présent : la clôture le dira
  assert.ok(b.lignes()[0].annonceAt instanceof Date);
  // Le chiffre du moment est gardé sur la ligne, comme un détail de clôture.
  const d = b.lignes()[0].details as { enLigne: string };
  assert.ok(d.enLigne === "190 k/s" || d.enLigne === "9,4 M PV poing");
  // « Pas cette fois » vide la ligne du compte ; un autre compte s'annonce à côté.
  await inscrireGS(b.db, SAMEDI_GS, { compte: { id: "u2", username: "lina" }, perso: { name: "Lina", class: "SYLPHIDE", gearProfiles: [] }, viens: true, p: GS_ON, maintenant: t });
  const pas = await inscrireGS(b.db, SAMEDI_GS, { compte: moi, perso: null, viens: false, p: GS_ON, maintenant: t });
  assert.ok(pas.ok && pas.geste.quoi === "retire" && pas.annonces === 1);
  assert.deepEqual(b.lignes().map((l) => l.pseudo), ["Lina"]);
});

cas("un refus (siège éteint, clôturé) n'écrit rien et ne fait pas naître la séance ; complet : refusé", async () => {
  const vide = baseGS();
  const t = VENDREDI_MIDI.getTime();
  const eteint = await inscrireGS(vide.db, SAMEDI_GS, { compte: { id: "u1", username: "m" }, perso: KAELIS, viens: true, p: { ...GS_ON, actif: false }, maintenant: t });
  assert.deepEqual(eteint, { ok: false, status: 409, message: "Le Guild Siege n'est pas actif : le PvP n'est pas encore installé." });
  assert.equal(vide.lire(), null);
  const close = baseGS({ seance: { clotureAt: new Date(t) } });
  assert.equal((await inscrireGS(close.db, SAMEDI_GS, { compte: { id: "u1", username: "m" }, perso: KAELIS, viens: true, p: GS_ON, maintenant: t })).ok, false);
  assert.equal(close.lignes().length, 0);
  const plein = baseGS();
  await inscrireGS(plein.db, SAMEDI_GS, { compte: { id: "u1", username: "m" }, perso: KAELIS, viens: true, p: { ...GS_ON, places: 1 }, maintenant: t });
  const r = await inscrireGS(plein.db, SAMEDI_GS, { compte: { id: "u2", username: "b" }, perso: BRANN, viens: true, p: { ...GS_ON, places: 1 }, maintenant: t });
  assert.deepEqual(r, { ok: false, status: 409, message: "Le Guild Siege est complet : 1 place, toutes prises." });
});

cas("qui vient : jamais un ami ni un membre caché ; dans l'ordre d'annonce ; le chiffre du jour, puis celui figé à la clôture", async () => {
  const b = baseGS({
    comptes: [{ id: "u1", role: "VETERAN" }, { id: "u2", role: "RECRUE" }, { id: "u3", role: "GUARD", cacheLe: new Date() }],
    persos: [{ ...KAELIS, userId: "u1" }],
    seance: {},
  });
  const t = VENDREDI_MIDI.getTime();
  const l = (pseudo: string, userId: string, dt: number) => ({ id: pseudo, seanceId: "g", pseudo, classe: "Arcaniste", player: pseudo, userId, slotId: null, annonceAt: new Date(t + dt), present: null, details: null, createdAt: new Date(t), updatedAt: new Date(t) });
  const lignes = [l("Kaelis", "u1", 5), l("Amie", "u2", 1), l("Cache", "u3", 2)];
  const j = await joueursGS(b.db, lignes as never, { cloturee: false, maintenant: t });
  assert.deepEqual(j.map((x) => [x.pseudo, x.enLigne]), [["Kaelis", "190 k/s"]]);
  // Clôturé : le chiffre figé sur la ligne, plus celui d'aujourd'hui.
  const figee = [{ ...lignes[0], present: true, details: { roleMesure: "dps", enLigne: "150 k/s", chiffres: [{ role: "dps", valeur: 150_000, texte: "150 k/s", arme: null, mesureLe: t, aRemesurer: false }] } }];
  const k = await joueursGS(b.db, figee as never, { cloturee: true, maintenant: t });
  assert.deepEqual([k[0].enLigne, k[0].present, k[0].role], ["150 k/s", true, "dps"]);
});

cas("cloturerGS : présents et absents parmi les annoncés, leur chiffre figé ; à venir, sans annoncé ou nom inconnu : refusé", async () => {
  const t = VENDREDI_MIDI.getTime();
  const b = baseGS({ persos: [{ ...KAELIS, userId: "u1" }, { ...BRANN, userId: "u2" }] });
  await inscrireGS(b.db, SAMEDI_GS, { compte: { id: "u1", username: "kaelis" }, perso: KAELIS, viens: true, p: GS_ON, maintenant: t });
  await inscrireGS(b.db, SAMEDI_GS, { compte: { id: "u2", username: "brann" }, perso: BRANN, viens: true, p: GS_ON, maintenant: t + 1 });
  const avant = await cloturerGS(b.db, SAMEDI_GS, { presents: ["Kaelis"], par: "Maxime", maintenant: t });
  assert.equal(avant.ok ? "" : avant.message, "Le Guild Siege du samedi 24 octobre · 21 h n'a pas encore commencé : on clôture une séance jouée.");
  const apres = paris("2026-10-24", "23:30").getTime();
  const inconnu = await cloturerGS(b.db, SAMEDI_GS, { presents: ["Orin"], par: "Maxime", maintenant: apres });
  assert.deepEqual(inconnu, { ok: false, status: 400, message: "Pas annoncé pour ce Guild Siege : Orin." });
  const r = await cloturerGS(b.db, SAMEDI_GS, { presents: ["kaelis"], par: "Maxime", maintenant: apres });
  assert.ok(r.ok);
  assert.deepEqual(r.ok && [r.presents, r.absents], [1, 1]);
  assert.match(r.ok ? r.message : "", /^1 présence enregistrée · 1 absent — Guild Siege du samedi 24 octobre · 21 h\.$/);
  assert.deepEqual(b.lignes().map((l) => [l.pseudo, l.present]), [["Kaelis", true], ["Brann", false]]);
  assert.equal((b.lignes()[1].details as { enLigne: string }).enLigne, "9,4 M PV poing");
  assert.equal(b.lire()!.cloturePar, "Maxime");
  // Une fois clôturé, plus personne ne s'annonce (409, §6 route 12).
  const tard = await inscrireGS(b.db, SAMEDI_GS, { compte: { id: "u3", username: "nox" }, perso: KAELIS, viens: true, p: GS_ON, maintenant: t });
  assert.deepEqual(tard, { ok: false, status: 409, message: "Ce Guild Siege est clôturé : l'inscription est fermée." });
  const vide = await cloturerGS(baseGS().db, SAMEDI_GS, { presents: [], par: "Maxime", maintenant: apres });
  assert.equal(vide.ok ? 0 : vide.status, 409);
});

const PANNEAU_GS = (o: Partial<MSG.DonneesPanneauGS> = {}): MSG.DonneesPanneauGS => ({
  cle: SAMEDI_GS.cle, label: SAMEDI_GS.label, etat: "ouvert", jourJ: false,
  texte: GS_ON.rappels[0].texte, regle: GS_ON.textes.panneau, vars: { heure: "21 h", date: "samedi 24 octobre" },
  joueurs: [
    { pseudo: "Brann", classe: "Primat", role: "tank", chiffres: [{ role: "tank", valeur: 9_400_000, texte: "9,4 M PV", arme: "poing", mesureLe: 1, aRemesurer: false }] },
    { pseudo: "Mi_ra", classe: "Arcaniste", role: "dps", chiffres: [{ role: "dps", valeur: 190_000, texte: "190 k/s", arme: null, mesureLe: 1, aRemesurer: true }] },
    { pseudo: "Orin", classe: "Spadassin", role: null, chiffres: [] },
  ],
  places: null, finInscription: "19:00", chiffres: true, site: "https://genesis.example", maj: Date.parse("2026-10-23T18:00:00Z"), ...o,
});

cas("le panneau du siège (§11.3) : or clair, 🏯, la phrase et la règle, qui vient avec son chiffre DÉCLARÉ, ✅ Je viens / ❌ Pas cette fois / 🌐", () => {
  const m = MSG.messagePanneauGS(PANNEAU_GS());
  const e = m.embeds[0];
  assert.equal(e.title, "🏯 Guild Siege — samedi 24 octobre · 21 h");
  assert.equal(e.color, MSG.COULEUR.orClair);
  assert.equal(e.url, "https://genesis.example/compositions?onglet=gvg");
  const l = e.description!.split("\n");
  assert.equal(l[0], "⏰ Demain à 21 h. Annonce-toi dès maintenant : un clic suffit.");
  assert.equal(l[1], "C'est libre : ramène ton meilleur perso, peu importe la classe.");
  assert.equal(l[2], "👥 3 annoncés");
  assert.equal(l[3], "-# Inscription de la guilde au siège avant 19 h (le staff s'en charge).");
  assert.equal(l[4], MSG.LEGENDE_CHIFFRES);
  assert.equal(e.fields![0].name, "✅ Ils viennent");
  assert.equal(e.fields![0].value, `${MSG.emojiClasse("Primat")} Brann ❤️ 9,4 M poing · ${MSG.emojiClasse("Arcaniste")} Mi\\_ra 💥 190 k/s 📏 · ${MSG.emojiClasse("Spadassin")} Orin ❔`);
  assert.equal(e.footer?.text, "GENESIS · Guild Siege · mis à jour");
  const ids = m.components[0].components.map((c) => ("custom_id" in c ? c.custom_id : "url" in c ? c.url : ""));
  assert.deepEqual(ids, ["gs:viens:gs_2026-10-24_sam2100", "gs:absent:gs_2026-10-24_sam2100", "https://genesis.example/compositions?onglet=gvg"]);
  assert.deepEqual(m.allowedMentions, { parse: [] });
  // Sans chiffres (salon ouvert aux visiteurs, ou paramétrage) : ni ❤️, ni 💥, ni légende.
  const sans = MSG.messagePanneauGS(PANNEAU_GS({ chiffres: false })).embeds[0];
  assert.doesNotMatch(JSON.stringify(sans), /❤️|💥|❔|déclarés/);
  // Le jour J : « Ce soir » ; un plafond : « 3 / 3 annoncés · ✅ Au complet ».
  const j = MSG.messagePanneauGS(PANNEAU_GS({ jourJ: true, places: 3 })).embeds[0].description!.split("\n");
  assert.equal(j[0], "⏰ Ce soir à 21 h. Annonce-toi dès maintenant : un clic suffit.");
  // Contre-examen : publié plus tôt que la veille (« Publier » le mercredi pour le samedi), la
  // ligne ne dit pas « Demain » — elle dit le jour, puis « Demain » la veille (panneau vivant).
  assert.equal(MSG.messagePanneauGS(PANNEAU_GS({ jourDit: "samedi" })).embeds[0].description!.split("\n")[0], "⏰ Samedi à 21 h. Annonce-toi dès maintenant : un clic suffit.");
  assert.equal(MSG.auJourDit("Rendez-vous demain à 21 h.", "samedi"), "Rendez-vous samedi à 21 h.");
  assert.equal(j[2], "👥 3 / 3 annoncés · ✅ Au complet");
  // Fermé (clôture, annulation) : anthracite, sans boutons.
  const f = MSG.messagePanneauGS(PANNEAU_GS({ etat: "annulee" }));
  assert.deepEqual([f.embeds[0].title, f.embeds[0].color, f.components], ["🏯 Guild Siege — samedi 24 octobre · 21 h · annulée", MSG.COULEUR.anthracite, []]);
  // Personne encore.
  assert.equal(MSG.messagePanneauGS(PANNEAU_GS({ joueurs: [] })).embeds[0].fields![0].value, "▫️ Personne ne s'est encore annoncé.");
});

cas("les rappels du siège : « dans 1 h » liste qui vient ; le staff, sans bouton ni mention ; une annulation au masculin", () => {
  const jr = MSG.messageJourGS({ cle: SAMEDI_GS.cle, dans: "dans 1 h", texte: "Le Guild Siege commence dans 1 h. Rendez-vous en vocal.", vars: {}, joueurs: PANNEAU_GS().joueurs, places: null, chiffres: false, site: "https://genesis.example", maj: 0, ouverte: true });
  assert.equal(jr.embeds[0].title, "⏰ Le Guild Siege commence dans 1 h");
  assert.equal(jr.embeds[0].fields![0].value.split("\n").length, 3);
  assert.equal(jr.components[0].components[0].type === 2 && "custom_id" in jr.components[0].components[0] ? jr.components[0].components[0].custom_id : "", "gs:viens:gs_2026-10-24_sam2100");
  const ferme = MSG.messageJourGS({ cle: SAMEDI_GS.cle, dans: "dans 1 h", texte: "", vars: {}, joueurs: [], places: null, chiffres: false, site: "", maj: 0, ouverte: false });
  assert.deepEqual(ferme.components, []);
  const st = MSG.messageStaffGS({ label: SAMEDI_GS.label, texte: GS_ON.rappels[2].texte, vars: { fin: "19 h" }, annonces: 4, places: 20, maj: 0 });
  assert.equal(st.embeds[0].description, "🏯 Pensez à inscrire la guilde au Guild Siege avant 19 h.\n👥 4 / 20 annoncés");
  // Contre-examen : un rappel se titre par ⏰ (M2 à M4) ; le 🏯 de la phrase n'est pas répété.
  assert.equal(st.embeds[0].title, "⏰ Guild Siege du samedi 24 octobre · 21 h — inscription de la guilde");
  assert.equal(JSON.stringify(st.embeds[0]).split("🏯").length - 1, 1);
  // Le rappel « dans 1 h » par défaut : 🕘 porte l'heure du rendez-vous, sans redire le titre.
  const jd = MSG.messageJourGS({ cle: SAMEDI_GS.cle, dans: "dans 1 h", texte: GS_ON.rappels[1].texte, vars: { heure: "21 h" }, joueurs: [], places: null, chiffres: false, site: "", maj: 0, ouverte: true });
  assert.equal(jd.embeds[0].description!.split("\n")[0], "🕘 Rendez-vous à 21 h en vocal, avec ton meilleur perso.");
  assert.doesNotMatch(jd.embeds[0].description!, /commence/);
  assert.deepEqual([st.components, st.allowedMentions], [[], { parse: [] }]);
  const an = MSG.messageAnnulation({ evenement: "gs", label: SAMEDI_GS.label, dateLongue: "samedi 24 octobre", jourMeme: true, motif: "serveur _fermé_", prochaine: null, maj: 0 });
  assert.equal(an.embeds[0].title, "🚫 Guild Siege de ce soir annulé");
  assert.equal(an.embeds[0].description, "📅 samedi 24 octobre · 21 h — serveur \\_fermé\\_");
  assert.equal(an.embeds[0].footer?.text, MSG.PIED_GS);
  // Les Chambres n'ont pas changé : « annulée », la prochaine dite.
  assert.equal(MSG.messageAnnulation({ label: "x", dateLongue: "mercredi 21 octobre", jourMeme: false, motif: null, prochaine: "dimanche 25 octobre · 21 h", maj: 0 }).embeds[0].description, "📅 x\nLa prochaine : dimanche 25 octobre · 21 h.");
});

cas("Discord, un perso par séance : le menu « Je viens avec… » n'en prend qu'un ; les réponses du siège ; ses boutons sans état", () => {
  const menu = MSG.menuPersoGS(SAMEDI_GS.cle, [{ name: "Kaelis", class: "ARCANISTE" }, { name: "Brann", class: "PRIMAT" }], "brann")[0].components[0] as unknown as { custom_id: string; min_values: number; max_values: number; options: { value: string; default: boolean }[] };
  assert.deepEqual([menu.custom_id, menu.min_values, menu.max_values], ["gs:choix:gs_2026-10-24_sam2100", 1, 1]);
  assert.deepEqual(menu.options.map((o) => [o.value, o.default]), [["Kaelis", false], ["Brann", true]]);
  assert.deepEqual(MSG.lireId("gs:viens:gs_2026-10-24_sam2100"), { evenement: "gs", action: "viens", cle: "gs_2026-10-24_sam2100", reste: "" });
  assert.equal(MSG.reponseGS("annonce", { pseudo: "Kaelis", classe: "Arcaniste", label: SAMEDI_GS.label }), `✅ **Kaelis** (${MSG.emojiClasse("Arcaniste")} Arcaniste) vient au Guild Siege du samedi 24 octobre · 21 h. Tu changes d'avis ? ❌ Pas cette fois.`);
  assert.equal(MSG.reponseGS("change", { pseudo: "Brann", label: SAMEDI_GS.label, retires: ["Kaelis"] }), "✅ Tu viens avec **Brann** au Guild Siege du samedi 24 octobre · 21 h, à la place de **Kaelis** : un perso par séance.");
  // Contre-examen : 🏯 ne sert qu'aux titres du siège ; un refus dit ⚠️, une séance annulée 🚫 (§8.2, M9).
  assert.equal(MSG.reponseGS("inactif"), "⚠️ Le Guild Siege n'est pas actif pour l'instant : le PvP n'est pas encore installé.");
  assert.equal(MSG.reponseGS("annule"), "🚫 Ce Guild Siege est annulé.");
  assert.equal(MSG.reponse("reserve_membres", { quoi: "Le Guild Siege est réservé" }), "⛔ Le Guild Siege est réservé aux membres de la guilde.");
});

cas("le débrief du siège publié : un embed sans image — GAGNÉ en vert, PERDU en crimson, présents, à retenir, vidéos, et le lien", () => {
  const d: MSG.DonneesDebriefGS = { cle: SAMEDI_GS.cle, jour: "samedi 24 octobre", resultat: "gagne", presents: 11, aRetenir: "Tenir le fort *nord*", lignes: [], texte: "", vars: {}, site: "https://genesis.example", maj: 0,
    videos: [{ id: "v1", etape: null, etapeLabel: null, titre: "Prise du fort nord", auteur: "Thorn", moment: 190 }] };
  const m = MSG.messageDebriefGS(d);
  const e = m.embeds[0];
  assert.equal(e.title, "📝 Retour du Guild Siege — samedi 24 octobre");
  assert.equal(e.description, "🏆 **GAGNÉ** · 👥 11 présents");
  assert.equal(e.color, MSG.COULEUR.vert);
  assert.equal(e.image, undefined);
  assert.deepEqual(e.fields!.map((f) => f.name), ["📌 À retenir", "🎬 Vidéos (1)"]);
  assert.equal(e.fields![0].value, "Tenir le fort \\*nord\\*");
  assert.match(e.fields![1].value, /\[Toute la séance — Prise du fort nord\]\(https:\/\/genesis\.example\/compositions\?onglet=bilans&seance=gs_2026-10-24_sam2100&video=v1\) \(Thorn, à 3:10\)/);
  assert.equal(e.footer?.text, MSG.PIED_GS);
  assert.deepEqual(m.allowedMentions, { parse: [] });
  assert.equal(MSG.messageDebriefGS({ ...d, resultat: "perdu" }).embeds[0].color, MSG.COULEUR.crimson);
  // Des manches posées par le staff : chacune avec son statut, son chrono et sa remarque.
  const avec = MSG.messageDebriefGS({ ...d, lignes: [{ etape: { code: "1", label: "Fort nord", phase: "1", emoji: "▫️", monstres: [] }, statut: "bien", chrono: 154, remarque: "propre" }] });
  assert.equal(avec.embeds[0].fields![0].value, "🟢 ▫️ **1 Fort nord** — ⏱️ 2:34 · propre");
  // 📝 dit « débrief » (le titre) : le champ des manches n'en reprend pas (contre-examen).
  assert.equal(avec.embeds[0].fields![0].name, "Manches");
  // Le salon : celui des débriefs du siège, sinon le salon du siège ; un forum : « Retour Guild Siege — ».
  const env = { cs: "", csDebrief: "", gs: "777777777777777777", staff: "", defaut: "1498696982229811352" };
  assert.equal(MSG.resoudreSalons(CS0, GS_ON, env).debriefsGS, "777777777777777777");
  assert.equal(MSG.resoudreSalons(CS0, { salons: { siege: "", debriefs: "888888888888888888" } }, env).debriefsGS, "888888888888888888");
  assert.equal(MSG.nomDuFil("samedi 24 octobre", "gs"), "Retour Guild Siege — samedi 24 octobre");
  assert.equal(MSG.nomDuFil("dimanche 18 octobre"), "Retour Chambre — dimanche 18 octobre");
  // Publier : le siège ALLUMÉ, sans bascule à attendre (le bot Python ne fait pas le siège).
  const ok = { evenement: "gs", creneau: "sam2100", annulee: false, publie: true, nouveauxMessages: false };
  assert.equal(MSG.refusPublicationDebrief({ ...ok, actifGS: true }), null);
  assert.match(MSG.refusPublicationDebrief({ ...ok, actifGS: false })!, /Guild Siege est éteint/);
});

cas("le lot 9 en place : route 12 gardée (membre, pas caché, perso à soi) ; le bot route gs: ; rien dans ALLOWED ; l'onglet en standby éteint", () => {
  const lire = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
  const r12 = lire("src/app/api/seances/[cle]/inscription/route.ts");
  assert.match(r12, /export async function POST\(req: Request, \{ params \}: \{ params: Promise<\{ cle: string \}> \}\) \{\n {2}const a = await apiGuild\(\); if \("error" in a\) return a\.error;/);
  assert.match(r12, /if \(a\.user\.cacheLe\) return NextResponse\.json\(\{ error: [^}]*\}, \{ status: 403 \}\);/);
  assert.match(r12, /where: \{ userId: a\.user\.id, name: \{ equals: pseudo, mode: "insensitive" \} \}/);
  assert.match(r12, /if \(b\.viens && !perso\) return NextResponse\.json\(\{ error: "Ce perso n'est pas à toi\." \}, \{ status: 403 \}\);/);
  assert.match(r12, /await inscrireGS\(prisma, s, \{/);
  const seances = lire("bot/lib/seances.ts");
  assert.match(seances, /if \(id\.evenement === "gs"\) \{\n {4}if \(id\.action === "viens"\) return cliquerViensGS\(i, id\.cle\);\n {4}if \(id\.action === "absent"\) return cliquerAbsentGS\(i, id\.cle\);/);
  // Le menu du siège passe AVANT celui des Chambres : les deux s'appellent « choix ».
  assert.ok(seances.indexOf('if (id.action === "choix") return choisirPersoGS(i, id.cle);') < seances.indexOf('if (id.action === "choix") return choisirPersos(i, id.cle);'));
  // La garde : le compte relu EN BASE par discordId, puis le siège relu frais (éteint : rien).
  assert.match(seances, /async function preparerGS\(discordId: string, cle: string\)[\s\S]*?prisma\.user\.findUnique\(\{ where: \{ discordId \}[\s\S]*?refusMembre\(user\)[\s\S]*?parametres\("gs", true\)[\s\S]*?if \(!p\.actif\)/);
  assert.match(seances, /const res = await inscrireGS\(prisma, v\.s, \{ compte: v\.compte, perso, viens, p: v\.p \}\);/);
  assert.match(seances, /if \(row\.evenement === "gs"\) return publierDebriefGS\(client, row\);/);
  const generique = lire("src/app/api/admin/bot-command/route.ts");
  assert.doesNotMatch(generique.match(/const ALLOWED = \[[^\]]*\]/)?.[0] ?? "", /seance_|evenement_/);
  const onglet = lire("src/components/chambres/GuildSiege.tsx");
  assert.match(onglet, /if \(!actif\) \{[\s\S]*?En standby/);
  assert.match(onglet, /const actif = !!lecture\?\.actif && lecture\.creneaux\.length > 0;/);
  // Les commandes du siège portent leur événement : la page /discord les nomme « … GS ».
  assert.match(lire("src/app/api/seances/[cle]/discord/route.ts"), /payload: \{ seanceId: res\.seance\.id, quoi: "panneau", evenement: "gs" \}/);
});


/* ══ Lot 10 — les échanges, l'équilibrage, la reprise de l'historique (§4.4, §4.5, §8.10) ══
   Les échanges entre joueurs (sur le site ET dans Discord, décision 1), « équilibrer » les
   jumeaux, et l'import du fichier du bot Python. Discord n'est pas joignable en local : on
   vérifie les règles, le JSON des messages, et l'écriture partagée sur une base en mémoire. */
console.log("\nLot 10 — les échanges, l'équilibrage, la reprise de l'historique");

const T10 = paris("2026-10-21", "18:00").getTime();
const MIN = 60_000;
const ctxE = (staff: boolean, miens: string[], maintenant = T10, joueurs = COMPO_TYPE) => ({ joueurs, salles: SALLES, staff, miens, maintenant });
/** Une demande, faite par `de` (son compte), et la demande écrite. */
const demander = (r: Repartition, de: string, quoi: "jumeau" | `salle:${string}`, avec: string, t = T10) => {
  const res = appliquerAction(r, { action: "demander", quoi, avec }, ctxE(false, [de], t));
  assert.ok(res.ok, JSON.stringify(res));
  return r.demandes.at(-1)!;
};

cas("ce qu'on peut demander (`options_echange`) : les salles des autres ; chez les jumeaux, un rôle qu'on tient, hors de sa propre équipe, et si l'autre tient le nôtre", () => {
  const r = REP_SOIREE();
  const k = optionsEchange(r, ctxR(), "kaelis");
  assert.deepEqual(k.filter((o) => o.quoi !== "jumeau").map((o) => [o.quoi, o.avec]), [["salle:s1", "brann"], ["salle:s2", "thorn"], ["salle:s5", "mira"], ["salle:a11", "sol"], ["salle:a12", "sol"]]);
  // Kaelis (Rouge — DPS magique) : la place magique de Mira, en Verte ; pas celle de Sel, dans SA
  // propre équipe ; aucune place physique ni de tank.
  assert.deepEqual(k.filter((o) => o.quoi === "jumeau"), [{ quoi: "jumeau", avec: "mira", libelle: "Verte — DPS magique — Mira", detail: "contre ta place Rouge — DPS magique" }]);
  assert.deepEqual(optionsEchange(r, ctxR(), "thorn").filter((o) => o.quoi === "jumeau").map((o) => o.avec), ["orin", "sol"]);
  // Sans place : toutes les places physiques tenues par d'autres, dans les deux équipes (une reprise).
  delete r.jumeaux.lina;
  const lina = optionsEchange(r, ctxR(), "lina").filter((o) => o.quoi === "jumeau");
  assert.deepEqual(lina.map((o) => o.avec), ["thorn", "orin", "sol", "pyra"]);
  assert.equal(lina[0].detail, "tu prends sa place");
  assert.deepEqual(optionsEchange(r, ctxR(), "zed"), []); // pas un participant
});

cas("une demande de salle : écrite avec son heure, dite au joueur visé, au demandeur et au staff ; seul le visé (ou le staff) accepte ; la salle passe au demandeur", () => {
  const r = REP_SOIREE();
  const res = appliquerAction(r, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"]));
  assert.deepEqual([res.ok, res.message, res.echange?.quoi], [true, "Demande envoyée à Thorn. Sans réponse dans l'heure, elle tombe d'elle-même.", "demande"]);
  const d = r.demandes[0];
  assert.deepEqual({ ...d, id: "x" }, { id: "x", de: "mira", a: "thorn", quoi: "salle:s2", ts: T10 });
  assert.match(d.id, /^[a-z0-9-]{4,40}$/);
  assert.equal(texteDemande(d, ctxR(), "cible"), "Mira voudrait reprendre ta Salle 2.");
  assert.equal(texteDemande(d, ctxR(), "demandeur"), "Tu demandes à Thorn de te laisser sa Salle 2.");
  assert.equal(texteDemande(d, ctxR(), "tiers"), "Mira voudrait reprendre la Salle 2 de Thorn.");
  assert.equal(texteDemande({ ...d, quoi: "salle:a11", a: "sol" }, ctxR(), "cible"), "Mira voudrait reprendre ton Asura 11 (arbre).");
  // La même demande, deux fois : refusée ; un tiers ne répond pas ; le demandeur n'accepte pas pour l'autre.
  assert.match(appliquerAction(r, { action: "demander", quoi: "salle:s2", avec: "thorn" }, ctxE(false, ["mira"])).message, /^Tu as déjà fait cette demande à Thorn/);
  assert.deepEqual(appliquerAction(r, { action: "repondre", demande: d.id, accepter: true }, ctxE(false, ["kaelis"])), { ok: false, status: 403, message: "Cette demande ne t'est pas adressée." });
  assert.deepEqual(appliquerAction(r, { action: "repondre", demande: d.id, accepter: true }, ctxE(false, ["mira"])), { ok: false, status: 403, message: "Seul Thorn, ou le staff, accepte cette demande." });
  const ok = appliquerAction(r, { action: "repondre", demande: d.id, accepter: true }, ctxE(false, ["thorn"], T10 + 10 * MIN));
  assert.deepEqual([ok.ok, ok.message], [true, "Échange accepté : Mira ⇄ Thorn."]);
  assert.equal(r.salles.s2, "mira");
  assert.deepEqual(d.reponse, { accepte: true, par: "cible", ts: T10 + 10 * MIN });
  assert.deepEqual(appliquerAction(r, { action: "repondre", demande: d.id, accepter: false }, ctxE(false, ["thorn"])), { ok: false, status: 409, message: "Cette demande a déjà sa réponse." });
});

cas("une demande expire au bout d'1 h : le nettoyage l'efface, la vue ne la montre plus, et une réponse tardive est refusée ; une réponse reste lisible 1 h", () => {
  const r = REP_SOIREE();
  const d = demander(r, "mira", "salle:s2", "Thorn");
  assert.equal(DUREE_DEMANDE_MS, 3_600_000);
  assert.equal(nettoyer(r, COMPO_TYPE, SALLES, T10 + DUREE_DEMANDE_MS - 1).demandes.length, 1);
  assert.equal(nettoyer(r, COMPO_TYPE, SALLES, T10 + DUREE_DEMANDE_MS).demandes.length, 0);
  assert.equal(nettoyer(r, COMPO_TYPE, SALLES).demandes.length, 1); // sans heure, rien n'expire (le récap, l'aperçu)
  assert.deepEqual([demandeEnAttente(d, T10 + 59 * MIN), demandeEnAttente(d, T10 + 60 * MIN)], [true, false]);
  assert.deepEqual(repondreEchange(r, ctxE(false, ["thorn"]), d.id, true, T10 + 60 * MIN), { ok: false, status: 409, message: "Cette demande a expiré : 1 h sans réponse." });
  assert.equal(r.salles.s2, "thorn");
  // La vue : le joueur visé la voit, avec ce qui lui reste ; une heure après, plus rien.
  const v = vueRepartition(r, ctxR(), { miens: ["thorn"], staff: false, now: T10 + 5 * MIN });
  assert.deepEqual(v.demandes.map((x) => [x.texte, x.pourMoi, x.deMoi, x.expire, x.valable]), [["Mira voudrait reprendre ta Salle 2.", true, false, T10 + DUREE_DEMANDE_MS, true]]);
  assert.deepEqual(vueRepartition(r, ctxR(), { miens: ["thorn"], staff: false, now: T10 + 61 * MIN }).demandes, []);
  // Un membre qu'elle ne regarde pas ne la voit pas ; le staff, si (« Mira voudrait… de Thorn »).
  assert.deepEqual(vueRepartition(r, ctxR(), { miens: ["kaelis"], staff: false, now: T10 }).demandes, []);
  assert.equal(vueRepartition(r, ctxR(), { miens: [], staff: true, now: T10 }).demandes[0].texte, "Mira voudrait reprendre la Salle 2 de Thorn.");
  // Répondue à T10 + 10 min : le demandeur la lit jusqu'à T10 + 70 min, puis elle disparaît.
  repondreEchange(r, ctxE(false, ["thorn"]), d.id, false, T10 + 10 * MIN);
  const lue = vueRepartition(r, ctxR(), { miens: ["mira"], staff: false, now: T10 + 69 * MIN }).demandes[0];
  assert.deepEqual([lue.texte, lue.reponse], ["Tu demandes à Thorn de te laisser sa Salle 2.", { accepte: false, par: "cible", motif: null }]);
  assert.deepEqual(vueRepartition(r, ctxR(), { miens: ["thorn"], staff: false, now: T10 + 20 * MIN }).demandes, []); // il a répondu lui-même
  assert.equal(nettoyer(r, COMPO_TYPE, SALLES, T10 + 70 * MIN).demandes.length, 0);
  // Le staff ne garde sous les yeux que ce qui attend encore.
  assert.deepEqual(vueRepartition(r, ctxR(), { miens: [], staff: true, now: T10 + 20 * MIN }).demandes, []);
});

cas("une acceptation après qu'une place a changé est refusée, avec le message du modèle, et la demande se clôt", () => {
  // Le troc des jumeaux : Kaelis (Rouge — DPS magique) demande la place de Mira (Verte — DPS magique).
  const r = REP_SOIREE();
  const d = demander(r, "kaelis", "jumeau", "Mira");
  assert.deepEqual([d.placeA, d.placeDe], ["vert_mag", "rouge_mag"]);
  assert.equal(texteDemande(d, ctxR(), "cible"), "Kaelis voudrait ta place Verte — DPS magique, et te donne la sienne : Rouge — DPS magique.");
  // Le staff échange Mira et Sel entre-temps : la place de Mira n'est plus celle qu'on lui demandait.
  assert.ok(placerJumeauStaff(r, ctxR(), COMPO_TYPE[7], "ech:Sel").ok);
  const v = vueRepartition(r, ctxR(), { miens: ["mira"], staff: false, now: T10 + MIN });
  assert.deepEqual([v.demandes[0].valable, v.demandes[0].raison], [false, "La place de jumeau a changé entre-temps."]);
  const avant = structuredClone(r.jumeaux);
  const res = repondreEchange(r, ctxE(false, ["mira"]), d.id, true, T10 + 2 * MIN);
  assert.deepEqual({ ...res, echange: undefined }, { ok: false, status: 409, message: "Échange impossible : La place de jumeau a changé entre-temps.", ecrire: true, echange: undefined });
  assert.deepEqual(r.jumeaux, avant); // rien n'a bougé
  assert.deepEqual(d.reponse, { accepte: false, par: "cible", ts: T10 + 2 * MIN, motif: "La place de jumeau a changé entre-temps." });
  // La place du DEMANDEUR a changé : « Les positions ont changé entre-temps. »
  const r2 = REP_SOIREE();
  const d2 = demander(r2, "kaelis", "jumeau", "Mira");
  delete r2.jumeaux.kaelis;
  assert.equal(repondreEchange(r2, ctxE(false, ["mira"]), d2.id, true, T10 + MIN).message, "Échange impossible : Les positions ont changé entre-temps.");
  // Une salle passée à un autre : « Salle 2 n'est plus à Thorn. »
  const r3 = REP_SOIREE();
  const d3 = demander(r3, "mira", "salle:s2", "Thorn");
  basculerSalle(r3, ctxR(), "s2", "orin", true);
  assert.equal(repondreEchange(r3, ctxE(false, ["thorn"]), d3.id, true, T10 + MIN).message, "Échange impossible : Salle 2 n'est plus à Thorn.");
  assert.equal(r3.salles.s2, "orin");
  // Le troc intact, lui, se fait : chacun prend la place de l'autre.
  const r4 = REP_SOIREE();
  const d4 = demander(r4, "kaelis", "jumeau", "Mira");
  assert.equal(repondreEchange(r4, ctxE(false, ["mira"]), d4.id, true, T10 + MIN).message, "Échange accepté : Kaelis ⇄ Mira.");
  assert.deepEqual([r4.jumeaux.kaelis, r4.jumeaux.mira], ["vert_mag", "rouge_mag"]);
});

cas("retirer, refuser, trancher (staff) ; 3 demandes en attente au plus ; une demande ne se fait que pour son perso, et sur une place encore tenue", () => {
  const r = REP_SOIREE();
  const d = demander(r, "mira", "salle:s2", "Thorn");
  assert.deepEqual(appliquerAction(structuredClone(r), { action: "repondre", demande: d.id, accepter: false }, ctxE(false, ["mira"])).message, "Tu retires ta demande à Thorn.");
  assert.deepEqual(appliquerAction(structuredClone(r), { action: "repondre", demande: d.id, accepter: false }, ctxE(false, ["thorn"])).message, "Tu refuses la demande de Mira.");
  assert.deepEqual(appliquerAction(structuredClone(r), { action: "repondre", demande: d.id, accepter: false }, ctxE(true, [])).message, "Demande de Mira à Thorn refusée.");
  const staff = structuredClone(r);
  const tranche = appliquerAction(staff, { action: "repondre", demande: d.id, accepter: true }, ctxE(true, []));
  assert.deepEqual([tranche.ok, staff.salles.s2, staff.demandes[0].reponse?.par], [true, "mira", "staff"]);
  // Le staff a tranché pour Thorn : Thorn le lit aussi (sa salle a changé sans qu'il clique).
  assert.deepEqual(vueRepartition(staff, ctxR(), { miens: ["thorn"], staff: false, now: T10 + MIN }).demandes.map((x) => [x.texte, x.reponse?.par]), [["Mira voudrait reprendre ta Salle 2.", "staff"]]);
  // Trois demandes en attente : la quatrième attend leurs réponses.
  demander(r, "mira", "salle:s1", "Brann");
  demander(r, "mira", "salle:a11", "Sol");
  assert.equal(MAX_DEMANDES_PAR_JOUEUR, 3);
  assert.equal(appliquerAction(r, { action: "demander", quoi: "salle:a12", avec: "Sol" }, ctxE(false, ["mira"])).message, "Tu as déjà 3 demandes en attente : attends leurs réponses, ou retires-en une.");
  // Pour le perso d'un autre (même le staff) : 403 ; le staff place directement.
  assert.equal((appliquerAction(r, { action: "demander", quoi: "salle:s1", avec: "Brann", pseudo: "Thorn" }, ctxE(false, ["mira"])) as { status: number }).status, 403);
  assert.equal((appliquerAction(r, { action: "demander", quoi: "salle:s1", avec: "Brann", pseudo: "Thorn" }, ctxE(true, [])) as { status: number }).status, 403);
  assert.equal(appliquerAction(r, { action: "demander", quoi: "salle:s1", avec: "Zed" }, ctxE(false, ["kaelis"])).message, "Zed n'est pas parmi les participants de la séance.");
  assert.equal(appliquerAction(r, { action: "demander", quoi: "salle:s2", avec: "Brann" }, ctxE(false, ["kaelis"])).message, "Salle 2 n'est plus à Brann : rouvre la liste.");
  assert.equal(appliquerAction(r, { action: "demander", quoi: "jumeau", avec: "Sel" }, ctxE(false, ["kaelis"])).message, "La place de Sel chez les jumeaux a changé, ou ton poste ne la tient pas : rouvre la liste.");
  // 50 demandes au plus en base : les réponses les plus anciennes font place ; jamais une attente.
  const plein = REP_SOIREE();
  const fausse = (i: number, reponse?: DemandeEchange["reponse"]): DemandeEchange => ({ id: `e${i}-zz`, de: "brann", a: "ysolde", quoi: "salle:s1", ts: T10, ...(reponse ? { reponse } : {}) });
  plein.demandes = Array.from({ length: 50 }, (_, i) => fausse(i, { accepte: false, par: "cible", ts: T10 }));
  assert.ok(appliquerAction(plein, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"])).ok);
  assert.deepEqual([plein.demandes.length, plein.demandes[0].id, plein.demandes.at(-1)!.de], [50, "e1-zz", "mira"]);
  plein.demandes = Array.from({ length: 50 }, (_, i) => fausse(i));
  assert.equal(appliquerAction(plein, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"])).message, "Trop de demandes attendent leur réponse pour cette séance : réessaie dans un moment.");
  assert.equal(plein.demandes.length, 50);
  // Le corps de la route : relu sans confiance.
  assert.deepEqual(lireAction({ action: "demander", quoi: "salle:s3", avec: "Kaelis" }), { ok: true, action: { action: "demander", quoi: "salle:s3", avec: "Kaelis", pseudo: undefined } });
  assert.equal(lireAction({ action: "demander", quoi: "salle:../x", avec: "Kaelis" }).ok, false);
  assert.equal(lireAction({ action: "demander", quoi: "jumeau" }).ok, false);
  assert.deepEqual(lireAction({ action: "repondre", demande: d.id, accepter: false }), { ok: true, action: { action: "repondre", demande: d.id, accepter: false } });
  assert.equal(lireAction({ action: "repondre", demande: d.id }).ok, false);
  assert.equal(lireAction({ action: "repondre", demande: "<script>", accepter: true }).ok, false);
  // Une demande abîmée en base disparaît à la lecture, sans casser la répartition.
  assert.equal(lireDemande({ id: "e1-a", de: "mira", a: "mira", quoi: "salle:s2", ts: T10 }), null); // à soi-même
  assert.equal(lireDemande({ id: "e1-a", de: "kaelis", a: "mira", quoi: "jumeau", ts: T10 }), null); // jumeau sans place
  assert.deepEqual(lireRepartition({ demandes: [{ ...d }, { ...d }, { pas: "une demande" }] }).demandes.length, 1); // doublon d'id
});

/* La compo type, chaque DPS avec ses dégâts DÉCLARÉS (Sel compris). */
const COMPO_MESUREE = COMPO_TYPE.map((j) => (j.pseudo === "Sel" ? { ...j, chiffres: [fige("dps", 160_000, "160 k/s")] } : j));
/** « Équilibrer » tel que la spec le décrivait : glouton, du plus fort au plus faible, dans l'équipe
 *  la plus faible qui a encore de la place ; les DPS sans chiffre en dernier. Pour comparer. */
function glouton(joueurs: typeof COMPO_TYPE) {
  const dps = joueurs.filter((j) => j.roles.jumeaux === "dps");
  const v = (j: (typeof joueurs)[number]) => j.chiffres.find((c) => c.role === "dps")?.valeur ?? 0;
  const tri = [...dps.filter((j) => v(j) > 0).sort((a, b) => v(b) - v(a)), ...dps.filter((j) => !v(j))];
  const t = { vert: [0, 0], rouge: [0, 0] };
  for (const j of tri) {
    const libres = (["vert", "rouge"] as const).filter((e) => t[e][1] < 4);
    const e = libres.reduce((m, x) => (t[x][0] < t[m][0] ? x : m));
    t[e][0] += v(j); t[e][1]++;
  }
  return ecartJumeaux(t.vert[0], t.rouge[0]);
}

cas("l'équilibrage donne un écart de DPS inférieur à 10 % sur la compo type — un tank par équipe, 4 DPS chacune, les deux Arcanistes séparés", () => {
  const r = REP_SOIREE(); // des places existent déjà : elles sont REMPLACÉES ; les salles, elles, restent
  const res = equilibrerJumeaux(r, ctxR(COMPO_MESUREE));
  assert.ok(res.ok);
  const v = vueRepartition(r, ctxR(COMPO_MESUREE));
  assert.ok(v.ecartJumeaux !== null && v.ecartJumeaux < 10, `écart ${v.ecartJumeaux} %`);
  assert.equal(v.ecartJumeaux, 0); // 682 k contre 680 k : le meilleur partage possible
  assert.deepEqual([v.jumeaux.vert.tank, v.jumeaux.rouge.tank], [["Ysolde"], ["Brann"]]); // le plus de PV déclarés en Verte
  for (const eq of [v.jumeaux.vert, v.jumeaux.rouge]) assert.equal(eq.mag.length + eq.phy.length, 4);
  const equipeDeX = (p: string) => (v.jumeaux.vert.mag.includes(p) ? "vert" : "rouge");
  assert.notEqual(equipeDeX("Mira"), equipeDeX("Kaelis")); // à écart égal, les classes se partagent
  assert.deepEqual(v.jumeaux.vert.manque.concat(v.jumeaux.rouge.manque), []);
  assert.equal(r.salles.s3, "kaelis");
  assert.equal(res.message, `Équipes équilibrées : Verte ${chiffreCourt(v.jumeaux.vert.totalDps)}/s, Rouge ${chiffreCourt(v.jumeaux.rouge.totalDps)}/s de dégâts déclarés — écart 0 %.`);
  assert.ok((glouton(COMPO_MESUREE) ?? 0) >= (v.ecartJumeaux ?? 0));
  // La compo type telle quelle : Sel n'a pas de chiffre (il compte pour 0) — 15 % est le mieux
  // qu'on puisse faire ; le glouton de la spec laissait 21 %.
  const r2 = vide();
  const res2 = equilibrerJumeaux(r2, ctxR());
  const v2 = vueRepartition(r2, ctxR());
  assert.deepEqual([v2.ecartJumeaux, glouton(COMPO_TYPE)], [15, 21]);
  assert.match(res2.message, /Sel n'a pas de dégâts déclarés : il compte pour 0, l'écart réel peut différer\./);
  // Relancé, le même résultat (rien d'aléatoire).
  const r3 = vide();
  equilibrerJumeaux(r3, ctxR());
  assert.deepEqual(r3.jumeaux, r2.jumeaux);
});

cas("équilibrer : au staff seul ; 8 DPS et 2 tanks au plus (les autres restent dehors, et c'est dit) ; sans tank, c'est dit aussi", () => {
  assert.deepEqual(appliquerAction(vide(), { action: "equilibrer" }, ctxE(false, ["kaelis"])), { ok: false, status: 403, message: "Équilibrer les jumeaux est un geste du staff." });
  const plus = [...COMPO_MESUREE, jr("Nox", "Arcaniste", "m3", [fige("dps", 100_000, "100 k/s")]), jr("Tor", "Primat", "p1", [fige("offtank", 3_000_000, "3 M PV", "sceptre")])];
  const r = vide();
  const res = equilibrerJumeaux(r, ctxR(plus));
  assert.match(res.message, /Nox reste hors des équipes : 4 DPS par équipe au plus\./);
  assert.match(res.message, /Tor reste hors des équipes : un tank par équipe\./);
  assert.equal(r.jumeaux.nox, undefined);
  const sansTank = vide();
  assert.match(equilibrerJumeaux(sansTank, ctxR(COMPO_MESUREE.filter((j) => j.roles.jumeaux === "dps"))).message, /Il manque les deux tanks : aucun participant ne tanke les jumeaux\./);
  assert.deepEqual(equilibrerJumeaux(vide(), ctxR([])), { ok: false, status: 409, message: "Personne à placer chez les jumeaux : aucun participant." });
});

/** Une base en mémoire pour `modifierRepartition` : la séance, et les notifications écrites. */
function baseEchange() {
  let row = { id: "x", cle: MERCREDI.cle, date: MERCREDI.date, version: 0, repartition: REP_SOIREE() as unknown, annulee: false, clotureAt: null as Date | null };
  const notifs: { userId: string; type: string; title: string; body: string; link: string }[] = [];
  const db = {
    seanceGuilde: {
      upsert: async () => structuredClone(row),
      updateMany: async ({ where, data }: { where: { version: number }; data: { repartition?: unknown } }) => {
        if (where.version !== row.version) return { count: 0 };
        row = { ...row, repartition: data.repartition ?? row.repartition, version: row.version + 1 };
        return { count: 1 };
      },
      findUniqueOrThrow: async () => structuredClone(row),
    },
    notification: { createMany: async ({ data }: { data: typeof notifs }) => { notifs.push(...data); return { count: data.length }; } },
    $transaction: async <T,>(f: (tx: unknown) => Promise<T>) => f(db),
  };
  return { db: db as never, lire: () => row, notifs };
}
const COMPTES: Record<string, string> = { mira: "u-mira", thorn: "u-thorn", kaelis: "u-kaelis" };
const comptes = { comptes: (k: string) => COMPTES[k] ?? null };

cas("l'échange en base (site et bot, `modifierRepartition`) : la demande prévient le joueur visé, la réponse le demandeur ; une acceptation impossible s'ÉCRIT et répond 409", async () => {
  const b = baseEchange();
  const dem = await modifierRepartition(b.db, MERCREDI, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"]), comptes);
  assert.ok(dem.ok && dem.echange?.quoi === "demande");
  assert.deepEqual(b.notifs, [{
    userId: "u-thorn", type: "chambre", link: "/compositions?onglet=repartition", title: "Demande d'échange — Chambre du mercredi 21 octobre",
    body: "Mira voudrait reprendre ta Salle 2. Accepte ou refuse dans l'heure, dans l'onglet Répartition ou sur Discord.",
  }]);
  const id = lireRepartition(b.lire().repartition).demandes[0].id;
  const acc = await modifierRepartition(b.db, MERCREDI, { action: "repondre", demande: id, accepter: true }, ctxE(false, ["thorn"], T10 + MIN), comptes);
  assert.ok(acc.ok);
  assert.equal(lireRepartition(b.lire().repartition).salles.s2, "mira");
  assert.deepEqual(b.notifs.slice(1).map((n) => [n.userId, n.title, n.body]), [["u-mira", "Échange accepté — Chambre du mercredi 21 octobre", "Mira voudrait reprendre la Salle 2 de Thorn. Thorn a accepté."]]);
  // Le staff tranche pour Thorn : les DEUX sont prévenus ; un retrait ne prévient personne.
  const b2 = baseEchange();
  await modifierRepartition(b2.db, MERCREDI, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"]), comptes);
  const id2 = lireRepartition(b2.lire().repartition).demandes[0].id;
  await modifierRepartition(b2.db, MERCREDI, { action: "repondre", demande: id2, accepter: false }, ctxE(true, [], T10 + MIN), comptes);
  assert.deepEqual(b2.notifs.slice(1).map((n) => [n.userId, n.title]), [["u-mira", "Échange refusé — Chambre du mercredi 21 octobre"], ["u-thorn", "Échange refusé — Chambre du mercredi 21 octobre"]]);
  const b3 = baseEchange();
  await modifierRepartition(b3.db, MERCREDI, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"]), comptes);
  await modifierRepartition(b3.db, MERCREDI, { action: "repondre", demande: lireRepartition(b3.lire().repartition).demandes[0].id, accepter: false }, ctxE(false, ["mira"]), comptes);
  assert.equal(b3.notifs.length, 1);
  // Une acceptation devenue impossible : la demande se clôt EN BASE, l'appelant reçoit 409.
  const b4 = baseEchange();
  await modifierRepartition(b4.db, MERCREDI, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"]), comptes);
  const id4 = lireRepartition(b4.lire().repartition).demandes[0].id;
  await modifierRepartition(b4.db, MERCREDI, { action: "salle", salle: "s2", pseudo: "Orin", force: true }, ctxE(true, []));
  const v0 = b4.lire().version;
  const imp = await modifierRepartition(b4.db, MERCREDI, { action: "repondre", demande: id4, accepter: true }, ctxE(false, ["thorn"], T10 + 2 * MIN), comptes);
  assert.deepEqual([imp.ok, (imp as { status: number }).status, imp.message], [false, 409, "Échange impossible : Salle 2 n'est plus à Thorn."]);
  assert.equal(b4.lire().version, v0 + 1);
  assert.equal(lireRepartition(b4.lire().repartition).demandes[0].reponse?.motif, "Salle 2 n'est plus à Thorn.");
  assert.equal(b4.notifs.at(-1)?.body, "Mira voudrait reprendre la Salle 2 de Thorn. L'échange n'a pas pu se faire : Salle 2 n'est plus à Thorn.");
  // Sans comptes (le bot qui ne les connaît pas) : aucune notification, l'échange se fait quand même.
  assert.equal(await notifierEchange({ notification: { createMany: async () => { throw new Error("base tombée"); } } } as never, MERCREDI, { quoi: "demande", demande: lireRepartition(b.lire().repartition).demandes[0] }, ctxE(false, []), (k) => COMPTES[k] ?? null), 0);
  // Équilibrer passe par la même écriture.
  const b5 = baseEchange();
  const eq = await modifierRepartition(b5.db, MERCREDI, { action: "equilibrer" }, ctxE(true, [], T10, COMPO_MESUREE));
  assert.ok(eq.ok);
  assert.equal(ecartJumeaux(...(["vert", "rouge"] as const).map((e) => equipesJumeaux(lireRepartition(b5.lire().repartition), COMPO_MESUREE)[e].totalDps) as [number, number]), 0);
});

cas("Discord — la demande en message privé (🔄, ✅ Accepter, ❌ Refuser, aucun @), fermée sur son verdict ; la réponse au demandeur", () => {
  const cle = MERCREDI.cle, id = "e1abc-xyz";
  const m = MSG.messageDemandeEchange({
    cle, id, jour: "mercredi 21 octobre", texte: "Mira voudrait reprendre ta Salle 2.", consigne: CS0.textes.echange, vars: {},
    expire: T10 + DUREE_DEMANDE_MS, site: "https://genesis.example", maj: T10,
  });
  const e = m.embeds[0];
  assert.equal(e.title, "🔄 Demande d'échange — Chambre du mercredi 21 octobre");
  assert.equal(e.color, MSG.COULEUR.crimson);
  assert.equal(e.description, `Mira voudrait reprendre ta Salle 2.\n\n${CS0.textes.echange}\n-# Sans réponse, elle tombe <t:${Math.floor((T10 + DUREE_DEMANDE_MS) / 1000)}:R>.`);
  assert.deepEqual(m.allowedMentions, { parse: [] });
  const btn = m.components[0].components as { custom_id?: string; label?: string; url?: string; style: number }[];
  assert.deepEqual(btn.map((b) => b.custom_id ?? b.url), [`cs:echr:${cle}:${id}:o`, `cs:echr:${cle}:${id}:n`, "https://genesis.example/compositions?onglet=repartition"]);
  assert.deepEqual(btn.map((b) => b.label), ["Accepter", "Refuser", "Voir la répartition"]);
  assert.deepEqual(MSG.lireId(`cs:echr:${cle}:${id}:o`), { evenement: "cs", action: "echr", cle, reste: `${id}:o` });
  assert.ok(MSG.ID.repondre(cle, "e" + "x".repeat(39), true).length <= 100);
  const fermee = MSG.messageDemandeEchange({ cle, id, jour: "mercredi 21 octobre", texte: "Mira voudrait reprendre ta Salle 2.", consigne: "", vars: {}, expire: T10, site: "", maj: T10, fermee: "✅ Échange accepté : Mira ⇄ Thorn." });
  assert.equal(fermee.embeds[0].title, "🔄 Demande d'échange — Chambre du mercredi 21 octobre · répondue");
  assert.equal(fermee.embeds[0].color, MSG.COULEUR.anthracite);
  assert.deepEqual(fermee.components, []); // plus de boutons (et pas de lien sans adresse)
  assert.match(fermee.embeds[0].description!, /✅ Échange accepté : Mira ⇄ Thorn\.$/);
  // Le verdict d'un clic : ✅ accepté, ❌ refusé ou retiré, ⛔ pas pour toi, ⚠️ impossible.
  assert.equal(MSG.verdictEchange({ ok: true, message: "Tu refuses la demande de Mira." }, false), "❌ Tu refuses la demande de Mira.");
  assert.equal(MSG.verdictEchange({ ok: false, status: 403, message: "Cette demande ne t'est pas adressée." }, true), "⛔ Cette demande ne t'est pas adressée.");
  assert.equal(MSG.verdictEchange({ ok: false, status: 409, message: "Échange impossible : …" }, true), "⚠️ Échange impossible : …");
  // La réponse, en privé au demandeur.
  const base = { jour: "mercredi 21 octobre", texte: "Mira voudrait reprendre la Salle 2 de Thorn.", qui: "Thorn", site: "https://genesis.example", maj: T10 };
  const oui = MSG.messageReponseEchange({ ...base, accepte: true, motif: null });
  assert.deepEqual([oui.embeds[0].title, oui.embeds[0].color], ["✅ Échange accepté — Chambre du mercredi 21 octobre", MSG.COULEUR.vert]);
  assert.equal(oui.embeds[0].description, "Mira voudrait reprendre la Salle 2 de Thorn.\nThorn a accepté.\n📍 Les positions sont à jour, ici et sur le site.");
  const non = MSG.messageReponseEchange({ ...base, accepte: false, motif: null, qui: "Le staff" });
  assert.deepEqual([non.embeds[0].title, non.embeds[0].color], ["❌ Échange refusé — Chambre du mercredi 21 octobre", MSG.COULEUR.anthracite]);
  assert.match(non.embeds[0].description!, /Le staff a refusé\.$/);
  const imp = MSG.messageReponseEchange({ ...base, accepte: false, motif: "La place de jumeau a changé entre-temps." });
  assert.deepEqual([imp.embeds[0].title, imp.embeds[0].color], ["⚠️ Échange impossible — Chambre du mercredi 21 octobre", MSG.COULEUR.or]);
  assert.match(imp.embeds[0].description!, /L'échange n'a pas pu se faire : La place de jumeau a changé entre-temps\.$/);
  assert.deepEqual(imp.allowedMentions, { parse: [] });
});

cas("Discord — 🔄 Échanges : reçues, à trancher, envoyées, numérotées ; les boutons portent le numéro ; 5 rangées au plus ; le menu « Demander une place »", () => {
  const l = (id: string, texte: string, o: Partial<MSG.LigneEchange> = {}): MSG.LigneEchange => ({ id, texte, expire: T10 + DUREE_DEMANDE_MS, valable: true, raison: null, reponse: null, ...o });
  const opts = optionsEchange(REP_SOIREE(), ctxR(), "kaelis").map((o) => ({ ...o, avec: o.avec === "mira" ? "Mira" : o.avec }));
  const menu = MSG.menuDemanderEchange(MERCREDI.cle, "Kaelis", opts)!;
  const sel = menu.components[0] as { custom_id: string; options: { value: string; label: string; emoji?: { name: string } }[] };
  assert.equal(sel.custom_id, `cs:dem:${MERCREDI.cle}:Kaelis`);
  assert.deepEqual(sel.options.at(-1), { label: "Verte — DPS magique — Mira", value: "jumeau>Mira", description: "contre ta place Rouge — DPS magique", emoji: { name: "👯" } });
  assert.equal(sel.options[0].emoji?.name, "🌳");
  assert.deepEqual(MSG.lireValeurDemande("salle:s3>Thorn"), { quoi: "salle:s3", avec: "Thorn" });
  assert.equal(MSG.lireValeurDemande("salle:../x>Thorn"), null);
  assert.equal(MSG.menuDemanderEchange(MERCREDI.cle, "Kaelis", []), null);
  const m = MSG.messageEchanges({
    cle: MERCREDI.cle, label: "mercredi 21 octobre · 21 h",
    recues: [l("e1-a", "Mira voudrait reprendre ta Salle 3."), l("e2-a", "Orin voudrait ta place Rouge — DPS physique.", { valable: false, raison: "La place de jumeau a changé entre-temps." })],
    aTrancher: [l("e3-a", "Sol voudrait reprendre la Salle 1 de Brann.")],
    envoyees: [l("e4-a", "Tu demandes à Thorn de te laisser sa Salle 2."), l("e5-a", "Tu demandes à Lina sa place Verte — DPS physique.", { reponse: { accepte: true, par: "cible", motif: null } })],
    menus: [menu], consigne: "Accepte ou refuse ici.", note: "✅ Demande envoyée à Thorn.", site: "https://genesis.example",
  });
  assert.match(m.content, /^✅ Demande envoyée à Thorn\.\n🔄 Échanges — mercredi 21 octobre · 21 h\n\*\*Pour toi\*\*\n\*\*1\.\*\* Mira voudrait reprendre ta Salle 3\./);
  assert.match(m.content, /\*\*2\.\*\* Orin voudrait ta place Rouge — DPS physique\.\n-# ⚠️ La place de jumeau a changé entre-temps\. Tu ne peux plus que la refuser\./);
  assert.match(m.content, /\*\*À trancher \(staff\)\*\*\n\*\*3\.\*\* Sol voudrait/);
  assert.match(m.content, /\*\*Tes demandes\*\*\n\*\*4\.\*\* Tu demandes à Thorn de te laisser sa Salle 2\.\n-# En attente de sa réponse/);
  assert.match(m.content, /\*\*5\.\*\* Tu demandes à Lina sa place Verte — DPS physique\.\n-# ✅ Acceptée\./);
  assert.ok(m.components.length <= 5);
  const ids = m.components.flatMap((r) => r.components.map((c) => ("custom_id" in c ? c.custom_id : null) ?? ("url" in c ? c.url : null)));
  assert.deepEqual(ids, [
    `cs:echr:${MERCREDI.cle}:e1-a:o`, `cs:echr:${MERCREDI.cle}:e1-a:n`, `cs:echr:${MERCREDI.cle}:e2-a:n`, // la 2 ne s'accepte plus
    `cs:echr:${MERCREDI.cle}:e3-a:o`, `cs:echr:${MERCREDI.cle}:e3-a:n`,
    `cs:dem:${MERCREDI.cle}:Kaelis`,
    `cs:echr:${MERCREDI.cle}:e4-a:n`, "https://genesis.example/compositions?onglet=repartition",
  ]);
  const labels = m.components.flatMap((r) => r.components.map((c) => ("label" in c ? c.label : null))).filter(Boolean);
  assert.deepEqual(labels, ["Accepter 1", "Refuser 1", "Refuser 2", "Accepter 3", "Refuser 3", "Retirer 4", "Voir sur le site"]);
  assert.deepEqual(m.allowedMentions, { parse: [] });
  assert.match(MSG.messageEchanges({ cle: MERCREDI.cle, label: "x", recues: [], aTrancher: [], envoyees: [], menus: [], consigne: "", site: "" }).content, /Aucune demande en cours\./);
});

cas("Discord — « Équilibrer (staff) » sur le message des jumeaux, sa confirmation ; 📍 Mes positions mène à 🔄 Échanges et compte les demandes reçues", () => {
  const eqs = equipesJumeaux(vide(), COMPO_TYPE);
  const m2 = MSG.messagePhase2({ cle: MERCREDI.cle, jour: "mercredi 21 octobre", etat: "ouvert", equipes: eqs, ecart: null, texte: CS0.textes.phase2, vars: {}, chiffres: false, site: "https://genesis.example", maj: T10 });
  const dernier = m2.components.at(-1)!.components as { custom_id?: string; label?: string }[];
  assert.deepEqual(dernier.map((b) => b.label), ["Placer · échanger (staff)", "Équilibrer (staff)", "Mes positions", "Voir la répartition"]);
  assert.equal(dernier[1].custom_id, `cs:equil:${MERCREDI.cle}`);
  const c = MSG.confirmationEquilibrer({ cle: MERCREDI.cle, site: "https://genesis.example", apercu: "Équipes équilibrées : … — écart 0 %.", equipes: { vert: [{ place: "vert_tank", pseudo: "Ysolde" }, { place: "vert_mag", pseudo: "Kaelis" }], rouge: [{ place: "rouge_tank", pseudo: "Brann" }] } });
  assert.match(c.content, /^👯 \*\*Équilibrer les jumeaux\*\* remplace toutes les places des deux équipes/);
  assert.match(c.content, /🟩 \*\*Verte\*\* : 🛡️ Ysolde · 🔮 Kaelis\n🟥 \*\*Rouge\*\* : 🛡️ Brann\n/);
  assert.equal((c.components[0].components[0] as { custom_id: string }).custom_id, `cs:equilok:${MERCREDI.cle}`);
  const rc = recap(COMPO_TYPE, REP_SOIREE(), CS0, 10);
  const pos = MSG.messagePositions({ cle: MERCREDI.cle, label: "mercredi 21 octobre · 21 h", positions: [{ ...positionsDe(rc, "Kaelis")!, poste: "Arcaniste", retenu: true }], nomGolems: "Golems", source: "retenus", menus: [], site: "https://genesis.example", echanges: true, demandesRecues: 1 });
  assert.match(pos.content, /\n🔄 1 demande d'échange t'attend : ouvre 🔄 Échanges\.$/);
  assert.deepEqual((pos.components.at(-1)!.components[0] as { custom_id: string; label: string }), { type: 2, style: 2, label: "Échanges", emoji: { name: "🔄" }, custom_id: `cs:echs:${MERCREDI.cle}` });
  // Sans la bascule (`echanges` absent), rien ne change par rapport au lot 4.
  const avant = MSG.messagePositions({ cle: MERCREDI.cle, label: "x", positions: [{ ...positionsDe(rc, "Kaelis")!, poste: null, retenu: true }], nomGolems: "Golems", source: "retenus", menus: [], site: "https://genesis.example" });
  assert.ok(!JSON.stringify(avant.components).includes("cs:echs:"));
});

cas("le paramétrage : la consigne d'une demande d'échange se règle (décision 5), avec son défaut ; la notification « chambre » a sa famille, sans orange", () => {
  assert.equal(CS0.textes.echange, "Accepte ou refuse ici, ou dans l'onglet Répartition du site. Sans réponse dans l'heure, la demande tombe d'elle-même.");
  assert.equal(normaliserCS({ textes: { piedRecap: "Bonne chance" } }).textes.echange, CS0.textes.echange); // enregistré avant le lot 10
  assert.equal(normaliserCS({ textes: { echange: "Réponds vite @everyone" } }).textes.echange, "Réponds vite"); // les mentions saisies sont retirées
  assert.ok(validerParametres("cs", { ...CS0, textes: { ...CS0.textes, echange: "x".repeat(401) } }).some((e) => /La consigne d'une demande d'échange : 401 signes/.test(e)));
  assert.deepEqual(familleNotif("chambre"), { label: "Chambres", icone: "castle", couleur: "#E35D6F" });
});

cas("le lot 10 en place : la route 5 met en file `seance_echange` côté serveur (après la bascule), jamais dans ALLOWED ; le bot route ses boutons, son menu et la commande ; l'onglet confirme avant d'équilibrer", () => {
  const lire = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
  const r5 = lire("src/app/api/seances/[cle]/repartition/route.ts");
  assert.match(r5, /const a = await apiGuild\(\); if \("error" in a\) return a\.error;/);
  assert.match(r5, /if \(!pcs\.nouveauxMessages\) return;/);
  assert.match(r5, /type: "seance_echange", payload: \{ seanceId, demande: e\.demande\.id, quoi: e\.quoi \}/);
  assert.match(r5, /modifierRepartition\(prisma, s, lu\.action, ctx, \{ comptes: \(k\) => comptes\.get\(k\) \?\? null, discord: pcs\.nouveauxMessages \}\)/);
  const generique = lire("src/app/api/admin/bot-command/route.ts");
  assert.doesNotMatch(generique.match(/const ALLOWED = \[[^\]]*\]/)?.[0] ?? "", /seance_echange/);
  assert.match(lire("bot/lib/botcommands.ts"), /else if \(cmd\.type === "seance_echange"\) result = await commandeEchange\(client, p\);/);
  const seances = lire("bot/lib/seances.ts");
  for (const l of [
    'if (id.action === "echs") return cliquerEchanges(i, id.cle);', 'if (id.action === "echr" && id.reste) return cliquerReponse(i, id.cle, id.reste);',
    'if (id.action === "equil") return cliquerEquilibrer(i, id.cle);', 'if (id.action === "equilok") return confirmerEquilibrer(i, id.cle);',
    'if (id.action === "dem" && id.reste) return choisirDemande(i, id.cle, id.reste);',
  ]) assert.ok(seances.includes(l), l);
  // Le message privé : après la bascule seulement, relu en base ; la garde de chaque clic est celle des membres.
  assert.match(seances, /export async function avertirEchange\([\s\S]*?if \(!p\.nouveauxMessages\) return "bascule coupée : pas de message privé";/);
  assert.match(seances, /async function cliquerReponse\([\s\S]*?await i\.deferUpdate\(\);[\s\S]*?const v = await preparerRepartition\(i, cle\);/);
  assert.match(seances, /async function cliquerEquilibrer\([\s\S]*?preparerRepartition\(i, cle, \{ staff: true \}\)/);
  assert.match(lire("src/app/(admin)/discord/page.tsx"), /seance_echange: "Échange CS"/);
  assert.match(lire("src/components/chambres/Repartition.tsx"), /const oui = await vgConfirm\("Équilibrer les jumeaux \?/);
  assert.match(lire("src/app/(admin)/discord/evenements/page.tsx"), /onClick=\{\(\) => onEssai\("echange"\)\}/);
});

/* Contre-vérification du lot 10 (2026-10-21) : ce que les cas ci-dessus ne couvraient pas. */
cas("équilibrer : le CALCUL lit toujours les dégâts déclarés (mêmes équipes sur le site et dans Discord) ; leur affichage masqué, la réponse les tait", () => {
  const montre = REP_SOIREE(), tait = REP_SOIREE();
  const a = equilibrerJumeaux(montre, ctxR(COMPO_MESUREE));
  const b = equilibrerJumeaux(tait, ctxR(COMPO_MESUREE), { chiffres: false });
  assert.deepEqual(tait.jumeaux, montre.jumeaux); // le paramétrage d'affichage ne change pas les équipes
  assert.match(a.message, /k\/s/);
  assert.equal(b.message, "Équipes équilibrées d'après les dégâts déclarés (leur affichage est masqué par le paramétrage).");
  assert.doesNotMatch(b.message, /\d+ ?k|écart \d/);
  // Par la route (site : `degats.composition` ; bot : `degats.discord`) : la même règle.
  const r = REP_SOIREE();
  const g = appliquerAction(r, { action: "equilibrer" }, { ...ctxE(true, [], T10, COMPO_MESUREE), chiffresVisibles: false });
  assert.deepEqual([g.ok, g.message, r.jumeaux], [true, b.message, montre.jumeaux]);
  const r5 = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/repartition/route.ts"), "utf8");
  assert.match(r5, /const ctx = \{ joueurs: parts\.participants, [^}]*chiffresVisibles: pcs\.degats\.composition \}/);
  assert.match(r5, /vue: vueRepartition\(res\.repartition, ctxVue, qui\)/);
  const bot = readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8");
  assert.match(bot, /maintenant: now, chiffresVisibles: v\.p\.degats\.discord \}/);
  assert.match(bot, /equilibrerJumeaux\(copie, \{ joueurs: v\.joueurs, salles: v\.p\.salles \}, \{ chiffres: v\.p\.degats\.discord \}\)/);
});

cas("deux persos du même compte : pas de demande de l'un à l'autre (personne d'autre n'y répondrait) ; la liste ne les propose pas", () => {
  const r = REP_SOIREE();
  const k = optionsEchange(r, ctxR(), "kaelis");
  assert.ok(k.some((o) => o.avec === "mira")); // les règles pures ne connaissent pas les comptes
  const v = vueRepartition(r, ctxR(), { miens: ["kaelis", "mira"], staff: false, now: T10 });
  for (const e of v.echanges) assert.ok(!e.options.some((o) => ["Kaelis", "Mira"].includes(o.avec)), JSON.stringify(e));
  assert.ok(v.echanges.find((e) => e.pseudo === "Kaelis")!.options.some((o) => o.avec === "Thorn"));
  assert.deepEqual(appliquerAction(r, { action: "demander", quoi: "salle:s5", avec: "Mira", pseudo: "Kaelis" }, ctxE(false, ["kaelis", "mira"])),
    { ok: false, status: 400, message: "Mira est aussi ton perso : déplace-le directement, sans demande." });
  assert.equal(r.demandes.length, 0);
  // Sa propre place : le message d'avant reste.
  assert.equal(appliquerAction(r, { action: "demander", quoi: "salle:s3", avec: "Kaelis" }, ctxE(false, ["kaelis"])).message, "C'est déjà ta place.");
});

cas("la notification d'une demande ne renvoie à Discord qu'après la bascule ; la route 4 lit « les miens » par le compte, comme la route 5", async () => {
  const b = baseEchange();
  await modifierRepartition(b.db, MERCREDI, { action: "demander", quoi: "salle:s2", avec: "Thorn" }, ctxE(false, ["mira"]), { ...comptes, discord: false });
  assert.equal(b.notifs[0].body, "Mira voudrait reprendre ta Salle 2. Accepte ou refuse dans l'heure, dans l'onglet Répartition.");
  const r4 = readFileSync(join(process.cwd(), "src/app/api/seances/[cle]/route.ts"), "utf8");
  assert.match(r4, /const miens = parts\.participants\.filter\(\(p\) => p\.userId === a\.user\.id\)/);
  assert.match(readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8"), /discord: v\.p\.nouveauxMessages \}\);/);
});

cas("🔄 Échanges dans Discord : pas de « Demander une place » pour le staff, qui place directement — comme sur le site", () => {
  assert.match(readFileSync(join(process.cwd(), "bot/lib/seances.ts"), "utf8"), /const menus = v\.staff \? \[\] : vue\.echanges/);
  assert.match(readFileSync(join(process.cwd(), "src/components/chambres/Repartition.tsx"), "utf8"), /\{!isAdmin && !fige && moi && /);
});

/* La reprise de l'historique du bot Python (§8.10). */
const sf = (ms: number) => String((BigInt(ms) - 1420070400000n) << 22n);
const U1 = "111111111111111111", U2 = "222222222222222222", U3 = "333333333333333333";
const MID18 = sf(Date.UTC(2026, 9, 16, 18)), MID21 = sf(Date.UTC(2026, 9, 17, 12)), MID24 = sf(Date.UTC(2026, 9, 22, 9)), MIDX = sf(Date.UTC(2026, 9, 1, 9));
const DRACARYS = {
  recensement: {
    [U1]: { persos: { kaelis: { pseudo: "Kaelis", classe: "Arcaniste" } } },
    [U2]: { persos: { thorn: { pseudo: "Thorn", classe: "Chevalier" } } },
    [U3]: { persos: { zed: { pseudo: "Zed", classe: "Sorcier" } } },
  },
  chambres: {
    [MID18]: {
      date: "18/10/2026 21h", terminee: true,
      inscrits: { [U1]: [{ poste: "arca", perso: "Kaelis" }], [U2]: [{ poste: "cheva_dps", perso: "Thorn" }], [U3]: "soso" }, // U3 : l'ancien format
      repartition: { phase1: { c3: U1, a11: U1, c4: U2 }, jumeaux: { [U1]: "rouge_mag", [U2]: "vert_dps" }, messages: {} },
    },
    [MID21]: { date: "21/10 21h", inscrits: {}, terminee: true },
    [MID24]: { date: "24/10/2026", inscrits: { [U1]: [{ poste: "arca", perso: "Kaelis" }] }, terminee: true },
  },
  historique: [
    { chambre: MID18, date: "18/10/2026 21h", le: "2026-10-18T21:55:00+00:00", par: U1, participants: [U1, U2], absents: [U3], lignes: [] },
    { chambre: MID24, date: "24/10/2026", le: "2026-10-24T22:00:00+00:00", par: U1, participants: [U1], absents: [], lignes: [] },
    { chambre: MIDX, date: "bientôt", le: "2026-10-02T22:00:00+00:00", par: U1, participants: [U1], absents: [], lignes: [] },
  ],
  debriefs: [
    { chambre: MID18, date: "18/10/2026 21h", total: 154, a_retenir: "Rester groupés", resultat: "gagne",
      etapes: { "1.1": { statut: "bien", chrono: 154.4, remarque: "" }, "2.2": { statut: "bien", chrono: null, remarque: "2 personnes vont call ( les tank) Ils vont dire à quel vie est leurs boss et le % Exemple: Vert 2eme vie 50%" }, "9.9": { statut: "mal" } } },
    { chambre: MID21, date: "21/10 21h", total: 0, a_retenir: "", resultat: "perdu", etapes: {} },
  ],
};

cas("l'import du bot Python : dates en texte libre (année déduite), seuls mercredis et dimanches, salles c → s, l'ancien format relu, débrief mot pour mot", () => {
  assert.equal(lireDateDracarys("18/10/2026 21h", null), "2026-10-18");
  assert.equal(lireDateDracarys("21/10 21h", Date.UTC(2026, 9, 17)), "2026-10-21");
  assert.equal(lireDateDracarys("3/1", Date.UTC(2026, 11, 28)), "2027-01-03"); // ouverte fin décembre pour janvier
  assert.equal(lireDateDracarys("28/12", Date.UTC(2027, 0, 2)), "2026-12-28");
  assert.equal(lireDateDracarys("Mercredi 22/10/26", null), "2026-10-22");
  assert.equal(lireDateDracarys("31/02/2026", null), null);
  assert.equal(lireDateDracarys("demain soir", Date.UTC(2026, 9, 17)), null);
  assert.equal(instantSnowflake(sf(Date.UTC(2026, 9, 16, 18))), Date.UTC(2026, 9, 16, 18));
  assert.equal(instantSnowflake("pas un id"), null);
  assert.deepEqual(["c3", "c10", "a11", "a12", "c11", "x"].map(salleDracarys), ["s3", "s10", "a11", "a12", null, null]);
  assert.deepEqual(lireDracarys({}), { ok: false, erreurs: ["Ce n'est pas un data_chambre.json du bot Python : ni chambres, ni historique, ni débriefs."] });

  const lu = lireDracarys(DRACARYS);
  assert.ok(lu.ok);
  const l = lu.l;
  assert.deepEqual(l.seances.map((s) => s.cle), ["cs_2026-10-18_dim", "cs_2026-10-21_mer"]);
  assert.deepEqual(l.ecartees, [
    "Clôture du 2026-10-24 (« 24/10/2026 ») : ni un mercredi, ni un dimanche — pas une séance de Chambre chez nous.",
    "Clôture « bientôt » : date illisible (JJ/MM attendu).",
  ]);
  assert.deepEqual(l.avertissements, ["2026-10-18 : étape inconnue 9.9 — non importée."]);
  assert.deepEqual(l.uids.sort(), [U1, U2, U3]);
  const s18 = l.seances[0];
  assert.deepEqual(s18.cloture!.lignes.map((x) => [x.pseudo, x.classe, x.present, x.details.salles, x.details.jumeau, x.details.role, x.details.poste]), [
    ["Kaelis", "Arcaniste", true, ["s3", "a11"], "rouge_mag", "mag", "Arcaniste"],
    ["Thorn", "Templier", true, ["s4"], "vert_phy", "phy", "Templier"], // « vert_dps » : physique, d'après la classe
    ["Zed", "Envouteur", false, [], null, "mag", "Envoûteur"],
  ]);
  assert.equal(s18.cloture!.le, Date.parse("2026-10-18T21:55:00+00:00"));
  const d = s18.debrief!;
  assert.deepEqual(d.notes["1.1"], { statut: "bien", chrono: 154, remarque: "" });
  assert.equal(d.notes["2.2"].remarque, DRACARYS.debriefs[0].etapes["2.2"]?.remarque); // mot pour mot
  assert.deepEqual([d.resultat, d.aRetenir, d.joueurs, d.etapes.length], ["gagne", "Rester groupés", 2, 13]);
  assert.ok(d.source.startsWith(SOURCE_DRACARYS));
  assert.deepEqual(d.etapes.map((e) => e.label), ETAPES_CS_DEFAUT.map((e) => e.label)); // décision 7 : les mêmes étapes
  assert.equal(l.seances[1].debrief!.resultat, "perdu");
  assert.equal(l.seances[1].cloture, null);
  // L'uid devient le compte ; un uid sans compte garde sa ligne, au nom du perso.
  const lignes = lignesAEcrire(s18.cloture!, new Map([[U1, { id: "u1", username: "kaelis" }], [U2, { id: "u2", username: "thorn" }]]));
  assert.deepEqual(lignes.map((x) => [x.pseudo, x.userId, x.player]), [["Kaelis", "u1", "kaelis"], ["Thorn", "u2", "thorn"], ["Zed", null, "Zed"]]);
});

cas("l'import ne double rien et n'écrase rien : relancé, « rien » ; une clôture ou un débrief faits sur le site sont refusés ; la retranscription n'écrase pas le fichier", () => {
  const l = lectureDracarys();
  const s18 = l.seances[0];
  const lignes = lignesAEcrire(s18.cloture!, new Map([[U1, { id: "u1", username: "kaelis" }]]));
  assert.equal(planParticipants(null, lignes, s18.cloture!.le, s18.date).quoi, "ecrire");
  const ecrites = lignes.map((x) => ({ pseudo: x.pseudo, present: x.present, userId: x.userId }));
  assert.equal(planParticipants({ annulee: false, clotureAt: new Date(), cloturePar: "Import", participants: ecrites }, lignes, 0, s18.date).quoi, "rien");
  assert.deepEqual(planParticipants({ annulee: false, clotureAt: new Date(), cloturePar: "Lina", participants: [] }, lignes, 0, s18.date),
    { quoi: "refus", message: "La séance du 2026-10-18 a été clôturée sur le site par Lina : l'import n'y touche pas." });
  assert.equal(planParticipants({ annulee: true, clotureAt: null, cloturePar: null, participants: [] }, lignes, 0, s18.date).quoi, "refus");
  // Le débrief : la retranscription du 18/10 au même contenu → rien ; au contenu différent, le
  // fichier (la donnée d'origine) l'emporte ; et la retranscription ne l'écrase plus ensuite.
  const d = s18.debrief!;
  const commeTranscrit = {
    annulee: false, etapes: { etapes: d.etapes, phases: d.phases }, resultat: d.resultat, aRetenir: d.aRetenir || null,
    debrief: ecrireDebrief({ notes: d.notes, importe: { joueurs: 10, source: "Image « Retour Chambre — 18/10/2026 » du bot Python, retranscrite mot pour mot", le: 1 } }),
    debriefPublieAt: new Date(1), debriefPar: "Import",
  };
  assert.equal(planDebriefDracarys(commeTranscrit, d, T10).quoi, "rien");
  assert.equal(planDebriefDracarys({ ...commeTranscrit, aRetenir: null }, d, T10).quoi, "ecrire");
  const transcrit = lireDebriefImporte(JSON.parse(readFileSync(join(process.cwd(), FICHIER_18), "utf8")));
  assert.ok(transcrit.ok);
  const depuisFichier = { ...commeTranscrit, debrief: ecrireDebrief({ notes: d.notes, importe: { joueurs: 2, source: d.source, le: 1 } }) };
  assert.deepEqual(planImportDebrief(depuisFichier, transcrit.d, T10), { quoi: "refus", message: "Le débrief du dimanche 18 octobre vient du fichier du bot Python (données d'origine) : la retranscription ne l'écrase pas." });
  // Un débrief fait sur le site n'est jamais écrasé (la règle de `planImport`, reprise).
  assert.equal(planDebriefDracarys({ ...commeTranscrit, debrief: ecrireDebrief({ notes: { "1.1": { statut: "mal", chrono: null, remarque: "" } }, importe: null }), debriefPar: "Lina" }, d, T10).quoi, "refus");
});

/** Le fichier d'exemple, lu (il l'est sans refus : le cas précédent le vérifie). */
function lectureDracarys() {
  const lu = lireDracarys(DRACARYS);
  if (!lu.ok) throw new Error(lu.erreurs.join(" "));
  return lu.l;
}
const s18Lignes = (l: ReturnType<typeof lectureDracarys>) => l.seances.find((s) => s.cle === "cs_2026-10-18_dim")!.cloture!.lignes;

/** Une base en mémoire pour l'import : plusieurs séances, et leurs lignes de participation. */
function baseImport() {
  type Ligne = Record<string, unknown> & { id: string; cle: string; version: number };
  const rows = new Map<string, Ligne>();
  const lignes = new Map<string, Record<string, unknown>[]>();
  let n = 0;
  const parId = (id: string) => [...rows.values()].find((x) => x.id === id);
  const db = {
    seanceGuilde: {
      findUnique: async ({ where, include }: { where: { cle: string }; include?: unknown }) => {
        const r = rows.get(where.cle);
        if (!r) return null;
        return include ? { ...structuredClone(r), participants: (lignes.get(r.id) ?? []).map((l) => ({ pseudo: l.pseudo, present: l.present, userId: l.userId })) } : structuredClone(r);
      },
      upsert: async ({ where, create }: { where: { cle: string }; create: Record<string, unknown> }) => {
        if (!rows.has(where.cle)) {
          rows.set(where.cle, { id: `s${++n}`, version: 0, annulee: false, clotureAt: null, cloturePar: null, etapes: null, debrief: null, resultat: null, aRetenir: null, debriefPar: null, debriefPublieAt: null, ...create, cle: where.cle });
        }
        return structuredClone(rows.get(where.cle)!);
      },
      updateMany: async ({ where, data }: { where: { id: string; version: number }; data: Record<string, unknown> }) => {
        const r = parId(where.id);
        if (!r || r.version !== where.version) return { count: 0 };
        const { version: _v, ...propre } = data;
        Object.assign(r, structuredClone(propre), { version: r.version + 1 });
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => structuredClone(parId(where.id)!),
    },
    seanceParticipant: {
      deleteMany: async ({ where }: { where: { seanceId: string } }) => { const k = lignes.get(where.seanceId) ?? []; lignes.set(where.seanceId, []); return { count: k.length }; },
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => { for (const x of data) lignes.set(String(x.seanceId), [...(lignes.get(String(x.seanceId)) ?? []), x]); return { count: data.length }; },
    },
    $transaction: async <T,>(f: (tx: unknown) => Promise<T>) => f(db),
  };
  return { db: db as never, rows, lignes };
}

cas("l'import, lancé deux fois, ne double rien (clé `cle` de la séance) ; l'essai n'écrit rien ; une séance clôturée sur le site garde sa clôture", async () => {
  const l = lectureDracarys();
  const comptesD = new Map([[U1, { id: "u1", username: "kaelis" }], [U2, { id: "u2", username: "thorn" }]]);
  const b = baseImport();
  const essai = await importerDracarys(b.db, l, comptesD, { essai: true, maintenant: () => T10 });
  assert.deepEqual(essai.map((r) => [r.debrief.quoi, r.cloture.quoi]), [["ecrire", "ecrire"], ["ecrire", "absent"]]);
  assert.equal(b.rows.size, 0); // l'essai ne crée même pas la séance
  const un = await importerDracarys(b.db, l, comptesD, { essai: false, maintenant: () => T10 });
  assert.deepEqual(un.map((r) => [r.cle, r.debrief.quoi, r.cloture.quoi]), [["cs_2026-10-18_dim", "ecrire", "ecrire"], ["cs_2026-10-21_mer", "ecrire", "absent"]]);
  assert.deepEqual(un[0].sansCompte, ["Zed"]);
  const s18 = b.rows.get("cs_2026-10-18_dim")!;
  assert.deepEqual([s18.resultat, s18.debriefPar, s18.cloturePar, (s18.clotureAt as Date).toISOString()], ["gagne", "Import", "Import", "2026-10-18T21:55:00.000Z"]);
  assert.equal(b.lignes.get(String(s18.id))!.length, 3);
  const deux = await importerDracarys(b.db, l, comptesD, { essai: false, maintenant: () => T10 + 86_400_000 });
  assert.deepEqual(deux.map((r) => [r.debrief.quoi, r.cloture.quoi]), [["rien", "rien"], ["rien", "absent"]]);
  assert.equal(b.rows.size, 2);
  assert.equal(b.lignes.get(String(s18.id))!.length, 3); // rien de doublé
  assert.equal((b.rows.get("cs_2026-10-18_dim")!.debriefPublieAt as Date).getTime(), T10); // la date du premier passage reste
  // Le staff a clôturé le 21/10 sur le site entre-temps : l'import n'y touche pas.
  b.rows.get("cs_2026-10-21_mer")!.clotureAt = new Date(T10);
  b.rows.get("cs_2026-10-21_mer")!.cloturePar = "Lina";
  const l2 = { ...l, seances: l.seances.map((s) => (s.cle === "cs_2026-10-21_mer" ? { ...s, cloture: { le: T10, lignes: s18Lignes(l) } } : s)) };
  const trois = await importerDracarys(b.db, l2, comptesD, { essai: false, maintenant: () => T10 });
  assert.equal(trois[1].cloture.quoi, "refus");
  assert.equal(b.rows.get("cs_2026-10-21_mer")!.cloturePar, "Lina");
});

Promise.all(enAttente).then(() => console.log(process.exitCode ? "\nDes cas ont échoué." : `\n${ok} cas vérifiés.`));
