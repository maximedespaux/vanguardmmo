// ════════════════════════════════════════════════════════════════════════════
//  L'ÉQUILIBRAGE DU SERVEUR — propBalance.xml et defineBalance.h
//  node scripts/extraire-balance.mjs  →  public/wiki/balance.json
// ════════════════════════════════════════════════════════════════════════════
//
// CE QUE CE FICHIER OUVRE. Deux fichiers du client n'avaient JAMAIS été lus par
// ce dépôt — vérifié par recherche sur `scripts/`, `src/` et `public/` avant
// d'écrire une ligne :
//
//   Client/data-00.air ▸ defineBalance.h    (505 octets)
//   Client/data-05.air ▸ propBalance.xml    (19 861 octets)
//
// Ils portent la couche d'équilibrage du serveur : par métier et par situation
// (PvE ou PvP), les coefficients d'arme, de blocage, de critique, de défense et
// de vitesse, plus un facteur par COMPÉTENCE nommée.
//
// ─────────────── CE QUE CE RELEVÉ A CORRIGÉ ───────────────
//
// LE MOTEUR DE DÉGÂTS N'EXISTE PLUS — `src/lib/degats/**`, `src/lib/statistiques/**`
// et `/api/statistiques` ont été retirés : vingt-deux de leurs quarante-neuf termes
// reposaient sur des constantes du Flyff officiel qu'aucun fichier d'Airborn
// n'écrit. CE SCRIPT, LUI, RESTE : il ne calcule aucun dégât, il relève ce que le
// client écrit. Son relevé est lu par `src/components/mecaniques/releves.ts`
// (`chiffresDEquilibrage`) et montré sur /builder/mecaniques.
//
// Le dépôt affirmait, dans `src/lib/degats/armes.ts` et dans la réponse de
// `/api/statistiques`, que l'attaque ordinaire d'un ARC n'était pas calculable :
// « propJob.inc a dix-huit colonnes, aucune ne nomme l'arc ». C'était exact pour
// propJob.inc, et faux pour le client : `defineBalance.h` numérote
// `JOB_PROP_BOW 9`, et `propBalance.xml` écrit `Bow="11.8"` sur un Rôdeur.
//
// Il affirmait aussi que les sept colonnes d'arme de propJob.inc portent la même
// valeur sur les quarante classes, donc qu'on ne les indexe pas par classe. Vrai
// pour propJob.inc — et c'est précisément ce que propBalance.xml corrige : les
// facteurs y varient d'un métier à l'autre, jusqu'à un facteur trois.
//
// ─────────────── LA QUESTION QUI FÂCHE : LAQUELLE FAIT FOI ? ───────────────
//
// Les deux tables se contredisent (Vagabond : propJob SWD 4,5 · propBalance
// Sword 3,5). Ce script ne tranche pas d'autorité : il MESURE, et écrit la
// mesure dans `arbitrage`. Cinq constats, TOUS recalculés à chaque exécution —
// y compris la lecture de l'exécutable, qui est le constat le plus lourd et
// qu'il aurait été malhonnête de recopier à la main :
//
//   1. Neuz.exe porte la chaîne `propBalance.xml`, le nom de la racine
//      `PropBalance`, le nom du chargeur `CProject::loadPropBalance`, les noms
//      d'attribut À LA SUITE (AtkSpeed, HP, MP, FP, Def, les trois récupérations,
//      Sword, Axe, Staff, Stick, Knuckle, Wand, Yoyo, Bow, Faux, Block, Critical)
//      puis `Skill` et `Factor`, et le message d'erreur
//      « %s - SkillID not found [Job %d - PvP %d] ». Le client lit donc ce
//      fichier, attribut par attribut, indexé par métier ET par drapeau PvP.
//      Le compte des occurrences et la contiguïté de la table d'attributs sont
//      dans `arbitrage.preuveDansLExecutable`, recomptés sur le disque.
//   2. propBalance est propJob RECOPIÉ PUIS RETOUCHÉ : sur les métiers de départ,
//      une partie des facteurs d'arme est identique au chiffre de propJob, le
//      reste a été déplacé. Le compte est dans `arbitrage.copieEtRetouche`.
//   3. propJob ne nomme NI l'arc NI la faux ; propBalance nomme l'arc, et le
//      chargeur du client connaît la faux. Une table qui ignore l'arme de deux
//      métiers entiers ne peut pas être la table vivante de ces métiers.
//   4. propJob ne varie pas par classe sur les colonnes d'arme (compté ici) ;
//      propBalance varie (compté ici aussi).
//   5. Le client embarque une fenêtre d'administration `APP_ADMIN_BALANCE`
//      (resdata.inc) : l'équipe du serveur retouche cet équilibrage en jeu.
//
// ET LE CONSTAT QUI INTERDIT DE JETER propJob.inc — c'est le plus important, et
// il est structurel, pas d'opinion :
//
//   · UNE LIGNE D'ÉQUILIBRAGE NE NOMME QUE LES ARMES DE SON PROPRE MÉTIER.
//     `JOB_VAGRANT` porte Sword et Axe, rien d'autre. Un Vagabond qui tient une
//     baguette n'a AUCUN facteur Wand dans propBalance. Le repli sur propJob.inc
//     n'est donc pas un confort : il est OBLIGATOIRE.
//   · Les lignes PvP des paliers Maître, Héros et Légende ne portent ni HP, ni
//     MP, ni FP, ni les trois récupérations. Un remplacement pur laisserait ces
//     métiers sans facteur de points de vie.
//   · Trois métiers de propJob.inc n'ont aucune ligne d'équilibrage, et huit
//     lignes d'équilibrage ne correspondent à aucun métier de `definejob.h`.
//
// VERDICT PORTÉ PAR LE RELEVÉ : propBalance.xml fait foi POUR CE QU'IL ÉCRIT ;
// propJob.inc reste la table de repli, attribut par attribut. Le relevé porte
// LES DEUX valeurs côte à côte pour chaque divergence — un écran qui affiche un
// facteur d'arme peut donc montrer les deux et n'en cache aucun.
//
// ─────────────── CE QUE LE RELEVÉ NE DIT TOUJOURS PAS ───────────────
//
// · CE QUE `Factor` MULTIPLIE. Le fichier écrit `Factor="2.0"` sur une
//   compétence, jamais l'opérande. Deux lectures restent ouvertes (multiplier
//   les dégâts de la compétence, ou remplacer son coefficient de statistique) et
//   rien dans le client ne choisit. Le relevé recopie le facteur et l'annonce
//   `operande: "non dit par le client"`.
// · LE GAIN PAR PALIER D'AMÉLIORATION. `propEnchant.inc` fait toujours
//   167 octets et ne donne que NORMAL_SCAL / ALL_SCAL. Rien de neuf ici.
// · LES SEUILS DE LA FORMULE (retirer 12 à la Force pour une épée, 14 à la
//   Dextérité pour un arc) et les facteurs de niveau. Ils viennent du Flyff
//   officiel, le client ne les écrit nulle part, et ce fichier n'y change RIEN.
//   Une réserve tombée n'en fait pas tomber une autre.

import fs from "node:fs";
import path from "node:path";
import { archive, fichier, signatureClient, CLIENT } from "./lib-air.mjs";

const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lireJson = (...b) => JSON.parse(fs.readFileSync(path.join(racine, ...b), "utf-8"));

// ── 1. defineBalance.h : les onze propriétés et les deux situations ────────

const d00 = archive("data-00.air");
const defBalance = fichier(d00, "definebalance.h");
const defJob = fichier(d00, "definejob.h");

const constantes = new Map();
for (const m of defBalance.matchAll(/^#define\s+([A-Z0-9_]+)\s+(\d+)\s*$/gm)) constantes.set(m[1], Number(m[2]));

const MAX_JOB_PROP = constantes.get("MAX_JOB_PROP");
const proprietes = [...constantes]
  .filter(([n]) => n.startsWith("JOB_PROP_") && n !== "MAX_JOB_PROP")
  .map(([nom, rang]) => ({ nom, rang, cle: nom.replace("JOB_PROP_", "") }))
  .sort((a, b) => a.rang - b.rang);

const situations = [...constantes].filter(([n]) => n.endsWith("_BALANCE")).map(([nom, rang]) => ({ nom, rang }));
const typesDeLigne = [...constantes].filter(([n]) => n.endsWith("_TYPE")).map(([nom, rang]) => ({ nom, rang }));

/** Le nom d'attribut employé dans le XML pour chaque propriété de defineBalance.h. */
const ATTRIBUT_DE_PROPRIETE = {
  SWD: "Sword", AXE: "Axe", STAFF: "Staff", STICK: "Stick", KNUCKLE: "Knuckle",
  WAND: "Wand", BLOCKING: "Block", YOYO: "Yoyo", CRITICAL: "Critical", BOW: "Bow", FAUX: "Faux",
};
/** La colonne de propJob.inc qui porte la même grandeur. `null` : propJob l'ignore. */
const COLONNE_PROPJOB = {
  SWD: "SWD", AXE: "AXE", STAFF: "STAFF", STICK: "STICK", KNUCKLE: "KNUCKLE",
  WAND: "WAND", BLOCKING: "BLOCKING", YOYO: "YOYO", CRITICAL: "CRITICAL", BOW: null, FAUX: null,
};

// ── 2. definejob.h : le numéro de chaque métier ────────────────────────────
//
// DEUX PIÈGES, les deux payés une fois :
//   · beaucoup de lignes portent un commentaire coréen mutilé en fin de ligne —
//     un motif ancré sur `$` ne les voit pas, et JOB_MERCENARY disparaît ;
//   · le fichier REDÉFINIT les mêmes noms plus bas, dans un autre espace de
//     numérotation (JOB_MERCENARY vaut 1 en haut, 0 en bas). On s'arrête donc
//     à `#define JOB_ALL`, qui ferme la table des métiers.
// Et la liste des métiers RÉELS ne se déduit pas de definejob.h : ses numéros
// se recoupent avec ceux des troupes. Elle se lit dans propJob.inc, qui porte
// une ligne par métier, dans l'ordre des numéros.

const finDeTable = defJob.indexOf("#define JOB_ALL");
const tableDesMetiers = finDeTable > 0 ? defJob.slice(0, finDeTable) : defJob;
const metiersDeclares = new Map();
for (const m of tableDesMetiers.matchAll(/^[ \t]*#define[ \t]+(JOB_[A-Z0-9_]+)[ \t]+(\d+)/gm)) {
  if (!metiersDeclares.has(m[1])) metiersDeclares.set(m[1], Number(m[2]));
}
const MAX_JOB = Number((defJob.match(/^#define\s+MAX_JOB\s+(\d+)/m) ?? [])[1] ?? 0);

/** Les métiers réels : une ligne de propJob.inc chacun, dans l'ordre des numéros. */
const propJob = new Map(lireJson("public", "wiki", "bonus-sources.json").facteursDeClasse.classes.map((c) => [c.classe, c]));
const metiersReels = new Set([...propJob.keys()].map((c) => "JOB_" + c));
/** Vérification : chaque métier de propJob.inc porte-t-il le numéro que definejob.h lui donne ? */
const concordanceDesNumeros = (() => {
  let rang = 0, accordes = 0;
  const ecarts = [];
  for (const c of propJob.keys()) {
    const attendu = rang++;
    const lu = metiersDeclares.get("JOB_" + c);
    if (lu === attendu) accordes++;
    else ecarts.push({ metier: c, rangDansPropJob: attendu, numeroDansDefineJob: lu ?? null });
  }
  return { lignesDePropJob: propJob.size, maxJob: MAX_JOB, accordes, ecarts };
})();

// ── 3. propBalance.xml ─────────────────────────────────────────────────────

const d05 = archive("data-05.air");
const xml = fichier(d05, "propBalance.xml");

/** Les attributs d'une balise, `Nom = "valeur"` — l'espace avant `=` existe dans le fichier. */
function attributs(brut) {
  const out = {};
  for (const m of brut.matchAll(/([A-Za-z_][\w]*)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

const equilibrages = {};
const ordreDesSituations = [];
for (const t of xml.matchAll(/<Type\s+ID="([^"]+)">([\s\S]*?)<\/Type>/g)) {
  const situation = t[1];
  ordreDesSituations.push(situation);
  const metiers = [];
  for (const j of t[2].matchAll(/<Job\s+([\s\S]*?)>([\s\S]*?)<\/Job>/g)) {
    const a = attributs(j[1]);
    const id = a.ID;
    delete a.ID;
    const valeurs = {};
    for (const [k, v] of Object.entries(a)) valeurs[k] = Number(v);
    const competences = [];
    for (const s of j[2].matchAll(/<Skill\s+([^>]*?)\/>/g)) {
      const sa = attributs(s[1]);
      competences.push({ id: sa.ID, facteur: Number(sa.Factor) });
    }
    metiers.push({ id, attributs: valeurs, competences });
  }
  equilibrages[situation] = metiers;
}

if (ordreDesSituations.length !== situations.length) {
  throw new Error(`defineBalance.h annonce ${situations.length} situations, propBalance.xml en porte ${ordreDesSituations.length}`);
}

// ── 4. Ce que chaque situation emploie réellement ──────────────────────────

/** Les huit attributs de corps : ils ne nomment aucune arme. */
const ATTRIBUTS_HORS_ARME = ["AtkSpeed", "HP", "MP", "FP", "Def", "HPRecovery", "MPRecovery", "FPRecovery"];
/** Les NEUF familles d'arme de defineBalance.h. Blocage et critique n'en sont pas :
 *  ce sont des propriétés de métier rangées dans la même énumération. */
const FAMILLES_DARME = ["SWD", "AXE", "STAFF", "STICK", "KNUCKLE", "WAND", "YOYO", "BOW", "FAUX"];
const ATTRIBUTS_ARME = proprietes.filter((p) => FAMILLES_DARME.includes(p.cle)).map((p) => ATTRIBUT_DE_PROPRIETE[p.cle]);
const ATTRIBUTS_DE_COMBAT = proprietes.filter((p) => !FAMILLES_DARME.includes(p.cle)).map((p) => ATTRIBUT_DE_PROPRIETE[p.cle]);
const TOUS_LES_ATTRIBUTS = [...ATTRIBUTS_HORS_ARME, ...ATTRIBUTS_ARME, ...ATTRIBUTS_DE_COMBAT];

function profil(metiers) {
  const presence = {};
  const distinctes = {};
  for (const m of metiers) {
    for (const [k, v] of Object.entries(m.attributs)) {
      presence[k] = (presence[k] ?? 0) + 1;
      (distinctes[k] ??= new Set()).add(v);
    }
  }
  const colonnes = TOUS_LES_ATTRIBUTS
    .filter((k) => presence[k])
    .map((k) => ({
      attribut: k,
      lignes: presence[k],
      surCombien: metiers.length,
      valeursDistinctes: distinctes[k].size,
      varieSelonLeMetier: distinctes[k].size > 1,
      min: Math.min(...distinctes[k]),
      max: Math.max(...distinctes[k]),
    }));
  const jamais = TOUS_LES_ATTRIBUTS.filter((k) => !presence[k]);
  return { colonnes, jamaisEcrits: jamais, lignes: metiers.length };
}

// ── 5. Les facteurs de compétence, rangés à part ───────────────────────────

const competencesDuSite = new Map(lireJson("public", "wiki", "competences.json").competences.map((c) => [c.id, c]));

/** Le nom français d'une compétence, quand le site la connaît. */
const nomFr = (id) => competencesDuSite.get(id)?.nom ?? null;

const facteursParSituation = {};
for (const [situation, metiers] of Object.entries(equilibrages)) {
  const lignes = [];
  for (const m of metiers) for (const c of m.competences) lignes.push({ metier: m.id, ...c });
  facteursParSituation[situation] = lignes;
}
const totalFacteurs = Object.values(facteursParSituation).reduce((n, l) => n + l.length, 0);

/** Un identifiant SI_* → ce que chaque situation en dit. */
const parCompetence = new Map();
for (const [situation, lignes] of Object.entries(facteursParSituation)) {
  for (const l of lignes) {
    const e = parCompetence.get(l.id) ?? { id: l.id, nom: nomFr(l.id), connueDuSite: competencesDuSite.has(l.id), situations: {} };
    (e.situations[situation] ??= []).push({ metier: l.metier, facteur: l.facteur });
    parCompetence.set(l.id, e);
  }
}
for (const e of parCompetence.values()) {
  const c = competencesDuSite.get(e.id);
  if (c) { e.classe = c.classe; e.nivMax = c.nivMax; }
  const vals = new Set();
  for (const s of Object.values(e.situations)) for (const x of s) vals.add(x.facteur);
  e.valeursDistinctes = vals.size;
  e.min = Math.min(...vals);
  e.max = Math.max(...vals);
  const pve = e.situations.PVE_BALANCE ?? [];
  const pvp = e.situations.PVP_BALANCE ?? [];
  e.dansLesDeuxSituations = pve.length > 0 && pvp.length > 0;
}
const competences = [...parCompetence.values()].sort((a, b) => a.id.localeCompare(b.id));

const identifiantsBalance = new Set(competences.map((c) => c.id));
const orphelinesCoteBalance = competences.filter((c) => !c.connueDuSite).map((c) => c.id);
const competencesDuSiteSansFacteur = [...competencesDuSite.keys()].filter((id) => !identifiantsBalance.has(id));

// ── 6. La confrontation à propJob.inc ──────────────────────────────────────

/** propBalance nomme `JOB_VAGRANT`, propJob nomme `VAGRANT`. */
const sansPrefixe = (id) => id.replace(/^JOB_/, "");

/** Les huit colonnes hors arme de propJob, avec le nom d'attribut du XML en face. */
const CORRESPONDANCE_HORS_ARME = {
  AtkSpeed: "colonne1", HP: "MaxHP", MP: "MaxMP", FP: "MaxFP", Def: "colonne5",
  HPRecovery: "hp", MPRecovery: "mp", FPRecovery: "fp",
};
const CORRESPONDANCE_ARME = Object.fromEntries(
  proprietes.filter((p) => COLONNE_PROPJOB[p.cle]).map((p) => [ATTRIBUT_DE_PROPRIETE[p.cle], COLONNE_PROPJOB[p.cle]]),
);
const CORRESPONDANCE = { ...CORRESPONDANCE_HORS_ARME, ...CORRESPONDANCE_ARME };

/** À quel sac appartient un attribut : arme, corps, ou propriété de combat. */
const sacDe = (attr) => (ATTRIBUTS_ARME.includes(attr) ? "arme" : ATTRIBUTS_DE_COMBAT.includes(attr) ? "combat" : "corps");

function confronter(metiers) {
  const sacs = { arme: { comparees: 0, identiques: 0 }, combat: { comparees: 0, identiques: 0 }, corps: { comparees: 0, identiques: 0 } };
  const divergences = [];
  const sansLigneDansPropJob = [];
  const sansColonneDansPropJob = new Set();
  for (const m of metiers) {
    const j = propJob.get(sansPrefixe(m.id));
    if (!j) { sansLigneDansPropJob.push(m.id); continue; }
    for (const [attr, v] of Object.entries(m.attributs)) {
      const col = CORRESPONDANCE[attr];
      if (!col) { sansColonneDansPropJob.add(attr); continue; }
      const ref = j[col];
      if (typeof ref !== "number") { sansColonneDansPropJob.add(attr); continue; }
      const sac = sacDe(attr);
      sacs[sac].comparees++;
      if (ref === v) sacs[sac].identiques++;
      else divergences.push({ metier: m.id, sac, attribut: attr, colonnePropJob: col, propJob: ref, propBalance: v, ecart: Number((v - ref).toFixed(4)) });
    }
  }
  const comparees = sacs.arme.comparees + sacs.combat.comparees + sacs.corps.comparees;
  const identiques = sacs.arme.identiques + sacs.combat.identiques + sacs.corps.identiques;
  /** Par attribut : combien de métiers d'accord, combien divergent. C'est CE tableau
   *  qui dit à un écran s'il doit afficher deux valeurs ou une seule. */
  const parAttribut = TOUS_LES_ATTRIBUTS.map((attr) => {
    const col = CORRESPONDANCE[attr];
    if (!col) return null;
    let comp = 0, ident = 0;
    for (const m of metiers) {
      const j = propJob.get(sansPrefixe(m.id));
      if (!j || !(attr in m.attributs) || typeof j[col] !== "number") continue;
      comp++;
      if (j[col] === m.attributs[attr]) ident++;
    }
    return comp ? { attribut: attr, colonnePropJob: col, comparees: comp, identiques: ident, divergentes: comp - ident, lesDeuxTablesSAccordent: comp === ident } : null;
  }).filter(Boolean);
  return {
    comparees, identiques, divergentes: divergences.length,
    parSac: sacs,
    parAttribut,
    sansLigneDansPropJob,
    sansColonneDansPropJob: [...sansColonneDansPropJob],
    divergences,
  };
}

const confrontation = Object.fromEntries(Object.entries(equilibrages).map(([s, m]) => [s, confronter(m)]));

/** propJob varie-t-il par classe sur ses colonnes d'arme ? Mesuré, pas supposé. */
const varianceDePropJob = Object.values(CORRESPONDANCE_ARME).map((col) => {
  const vals = new Set([...propJob.values()].map((c) => c[col]).filter((v) => typeof v === "number"));
  return { colonne: col, valeursDistinctes: vals.size, lignes: propJob.size, varie: vals.size > 1 };
});

/** L'inverse : propBalance varie-t-il ? (armes, blocage et critique, situation PvE.) */
const varianceDeBalance = [...ATTRIBUTS_ARME, ...ATTRIBUTS_DE_COMBAT].map((attr) => {
  const vals = new Set();
  for (const m of equilibrages.PVE_BALANCE) if (attr in m.attributs) vals.add(m.attributs[attr]);
  return { attribut: attr, valeursDistinctes: vals.size, lignesQuiLePortent: [...equilibrages.PVE_BALANCE].filter((m) => attr in m.attributs).length, varie: vals.size > 1 };
});

/** « propBalance est propJob recopié puis retouché » : combien de valeurs sont restées ? */
const METIERS_DE_DEPART = ["JOB_VAGRANT", "JOB_MERCENARY", "JOB_ACROBAT", "JOB_ASSIST", "JOB_MAGICIAN"];
const copieEtRetouche = (() => {
  let egales = 0, deplacees = 0;
  const detail = [];
  for (const m of equilibrages.PVE_BALANCE) {
    if (!METIERS_DE_DEPART.includes(m.id)) continue;
    const j = propJob.get(sansPrefixe(m.id));
    for (const attr of ATTRIBUTS_ARME) {
      if (!(attr in m.attributs)) continue;
      const col = CORRESPONDANCE_ARME[attr];
      const ref = col ? j?.[col] : undefined;
      if (typeof ref !== "number") continue;
      if (ref === m.attributs[attr]) { egales++; detail.push({ metier: m.id, attribut: attr, valeur: ref, retouchee: false }); }
      else { deplacees++; detail.push({ metier: m.id, attribut: attr, propJob: ref, propBalance: m.attributs[attr], retouchee: true }); }
    }
  }
  return { metiers: METIERS_DE_DEPART, comparees: egales + deplacees, identiques: egales, retouchees: deplacees, detail };
})();

// ── 6 bis. LA PREUVE DANS L'EXÉCUTABLE — lue, pas racontée ─────────────────
//
// L'argument le plus fort de l'arbitrage est que Neuz.exe PARSE propBalance.xml.
// Un argument de ce poids ne se recopie pas à la main : il se vérifie à chaque
// exécution. On cherche les chaînes dans l'exécutable et on écrit ce qu'on a
// trouvé — y compris les absences.
const preuveDansLExecutable = (() => {
  const exe = path.join(CLIENT, "Neuz.exe");
  if (!fs.existsSync(exe)) return { lu: false, pourquoi: "Neuz.exe absent du dossier du client : la vérification n'a pas pu être faite." };
  const octets = fs.readFileSync(exe);
  const compte = (s) => {
    let n = 0, i = 0;
    const b = Buffer.from(s, "latin1");
    for (;;) { const j = octets.indexOf(b, i); if (j < 0) break; n++; i = j + 1; }
    return n;
  };
  const cherchees = [
    "propBalance.xml", "PropBalance", "CProject::loadPropBalance",
    "%s - SkillID not found [Job %d - PvP %d]",
    "propJob", "propEnchant.inc",
    ...ATTRIBUTS_HORS_ARME, ...ATTRIBUTS_ARME, ...ATTRIBUTS_DE_COMBAT, "Skill", "Factor",
  ];
  const trouvees = {};
  for (const c of cherchees) trouvees[c] = compte(c);
  return {
    lu: true,
    fichier: "Neuz.exe",
    octets: octets.length,
    occurrences: trouvees,
    /** Les 19 noms d'attribut se suivent-ils dans l'exécutable, dans l'ordre du chargeur ? */
    tableDAttributsContigue: octets.includes(
      Buffer.from("AtkSpeed\0\0\0\0HP\0\0MP\0\0FP\0\0Def", "latin1"),
    ),
    absentes: cherchees.filter((c) => trouvees[c] === 0),
  };
})();

// ── 6 ter. CE QUE LE MOTEUR N'APPLIQUE PAS DE L'ÉQUILIBRAGE, ET POURQUOI ───
//
// Dire « propBalance fait foi » sans regarder chaque attribut serait exactement
// l'erreur qu'on vient de corriger, en sens inverse. Deux attributs ne passent
// PAS dans le moteur du site, et la raison se mesure ici plutôt qu'elle ne
// s'affirme :
//
//   · HP — la promotion FAIT BAISSER le facteur dans l'équilibrage. Un métier de
//     deuxième palier y porte parfois un facteur de points de vie plusieurs fois
//     supérieur à celui de sa propre version Maître ou Héros, ce qui voudrait
//     dire qu'une promotion divise les points de vie. Aucune mécanique de jeu ne
//     fonctionne comme ça : la lecture « facteur de PV max » ne tient pas sur ces
//     lignes, et on garde propJob.inc.
//   · AtkSpeed — la valeur dépasse le plafond de la formule de vitesse, qui est
//     lui-même une constante du Flyff officiel. Compté dans `plafondDepasse`.
const attributsNonAppliques = (() => {
  const equilibres = new Set(Object.values(equilibrages).flatMap((ms) => ms.map((m) => m.id)));
  /** Les lignées : deuxième palier → Maître → Héros. Déduites des noms, pas écrites. */
  const lignees = equilibrages.PVE_BALANCE
    .map((m) => m.id)
    .filter((id) => metiersReels.has(id) && !id.endsWith("_MASTER") && !id.endsWith("_HERO"))
    .map((base) => [base, base + "_MASTER", base + "_HERO"].filter((id) => equilibres.has(id)))
    .filter((l) => l.length > 1);

  const valeur = (id, attr, table) => {
    if (table === "balance") {
      const v = equilibrages.PVE_BALANCE.find((m) => m.id === id)?.attributs[attr];
      return typeof v === "number" ? v : null;
    }
    const v = propJob.get(sansPrefixe(id))?.[CORRESPONDANCE[attr]];
    return typeof v === "number" ? v : null;
  };

  const baisses = { balance: [], propJob: [] };
  for (const lignee of lignees) {
    for (const table of ["balance", "propJob"]) {
      const suite = lignee.map((id) => ({ id, hp: valeur(id, "HP", table) })).filter((x) => x.hp != null);
      for (let i = 1; i < suite.length; i++) {
        if (suite[i].hp < suite[i - 1].hp) {
          baisses[table].push({ de: suite[i - 1].id, a: suite[i].id, avant: suite[i - 1].hp, apres: suite[i].hp, rapport: Number((suite[i - 1].hp / suite[i].hp).toFixed(2)) });
        }
      }
    }
  }

  /** Le plafond de base employé par la formule de vitesse d'attaque du Flyff officiel. */
  const PLAFOND_VITESSE = 200 - (200 * 0.125) / 2;
  const plafondDepasse = [];
  for (const situation of Object.keys(equilibrages)) {
    for (const m of equilibrages[situation]) {
      if (typeof m.attributs.AtkSpeed === "number" && m.attributs.AtkSpeed > PLAFOND_VITESSE) {
        plafondDepasse.push({ situation, metier: m.id, atkSpeed: m.attributs.AtkSpeed, plafond: PLAFOND_VITESSE, dansPropJob: valeur(m.id, "AtkSpeed", "propJob") });
      }
    }
  }

  return {
    regle: "Le moteur du site applique l'équilibrage aux COEFFICIENTS DE COMBAT — les neuf familles d'arme, le blocage, le critique — et garde propJob.inc pour les points de vie et la vitesse de base. Ce n'est pas une préférence : les deux mesures ci-dessous montrent que la lecture naïve de ces deux attributs produit un personnage impossible.",
    lignees: lignees.length,
    pointsDeVie: {
      baissesDansLEquilibrage: baisses.balance.length,
      baissesDansPropJob: baisses.propJob.length,
      /** Une baisse de deux pour cent est un réglage ; une baisse d'un facteur six n'en
       *  est pas un. On sépare donc les deux au lieu de les compter ensemble. */
      baissesFortes: baisses.balance.filter((b) => b.rapport >= 1.5),
      detail: baisses.balance,
      lecture: "Une promotion peut faire baisser un facteur de quelques pour cent — c'est du réglage. Elle ne peut pas le diviser par six : à ce compte-là, la promotion retirerait cinq sixièmes des points de vie. Là où l'équilibrage le fait et propJob non, c'est que ces lignes ne se lisent pas comme un facteur de PV max. Le moteur garde propJob.inc pour les points de vie.",
    },
    vitesseDAttaque: {
      plafondDeLaFormule: PLAFOND_VITESSE,
      sourceDuPlafond: "constante du Flyff officiel — le client ne l'écrit pas",
      lignesAuDessus: plafondDepasse.length,
      detail: plafondDepasse,
      lecture: "Une base au-dessus du plafond sature la formule d'emblée : soit Airborn a relevé le plafond et la formule est fausse pour ces métiers, soit ils sont saturés en permanence. Le client ne tranche pas ; le moteur garde propJob.inc et AFFICHE les deux.",
    },
  };
})();

// ── 7. Les métiers : qui est dans quoi ─────────────────────────────────────

const idsBalance = new Set(Object.values(equilibrages).flatMap((m) => m.map((x) => x.id)));
const sansMetierDeclare = [...idsBalance].filter((id) => !metiersReels.has(id)).sort();
const metiersSansEquilibrage = [...metiersReels].filter((id) => !idsBalance.has(id)).sort();
const metiersSansLignePropJob = [...idsBalance].filter((id) => !propJob.has(sansPrefixe(id))).sort();

/** Le repli est-il obligatoire ? Compte des armes qu'une ligne d'équilibrage ne nomme pas. */
const armesNonNommees = (() => {
  const parMetier = equilibrages.PVE_BALANCE.map((m) => ({
    metier: m.id,
    nommees: ATTRIBUTS_ARME.filter((a) => a in m.attributs),
    absentes: ATTRIBUTS_ARME.filter((a) => !(a in m.attributs)),
  }));
  return {
    famillesDArme: ATTRIBUTS_ARME.length,
    parMetier: parMetier.map((x) => ({ metier: x.metier, nommees: x.nommees.length, absentes: x.absentes.length })),
    maximumNomme: Math.max(...parMetier.map((x) => x.nommees.length)),
    minimumNomme: Math.min(...parMetier.map((x) => x.nommees.length)),
    exemple: parMetier.find((x) => x.metier === "JOB_VAGRANT"),
  };
})();

// ── 8. Le relevé ───────────────────────────────────────────────────────────

const parSituation = {};
for (const [situation, metiers] of Object.entries(equilibrages)) {
  parSituation[situation] = {
    rang: situations.find((s) => s.nom === situation)?.rang ?? null,
    quand: situation === "PVE_BALANCE" ? "contre un monstre" : "contre un autre joueur",
    profil: profil(metiers),
    facteursDeCompetence: facteursParSituation[situation].length,
    confrontationAPropJob: confrontation[situation],
    metiers: metiers.map((m) => ({
      id: m.id,
      metier: sansPrefixe(m.id),
      numeroDeMetier: metiersDeclares.get(m.id) ?? null,
      declareDansDefineJob: metiersReels.has(m.id),
      aUneLignePropJob: propJob.has(sansPrefixe(m.id)),
      attributs: m.attributs,
      competences: m.competences.map((c) => ({ ...c, nom: nomFr(c.id), connueDuSite: competencesDuSite.has(c.id) })),
    })),
  };
}

const sortie = {
  genere: new Date().toISOString().slice(0, 10),
  quoi: "La couche d'ÉQUILIBRAGE du serveur Airborn : Winds of Rhisis — coefficients d'arme, de blocage, de critique, de défense et de vitesse, par métier et par situation, plus un facteur par compétence nommée. PvE et PvP sont rangés SÉPARÉMENT : ce ne sont pas les mêmes chiffres et le jeu ne les applique pas dans les mêmes combats.",
  client: signatureClient(),
  source: {
    fichiers: [
      { chemin: "Client/data-00.air ▸ defineBalance.h", octets: Buffer.byteLength(defBalance, "utf8"), donne: "les 11 propriétés de métier, les 2 situations, les 2 types de ligne" },
      { chemin: "Client/data-05.air ▸ propBalance.xml", octets: Buffer.byteLength(xml, "utf8"), donne: "les valeurs, métier par métier et situation par situation" },
      { chemin: "Client/data-00.air ▸ defineJob.h", octets: Buffer.byteLength(defJob, "utf8"), donne: "les métiers qui existent vraiment (MAX_JOB)" },
    ],
    confronteA: ["public/wiki/bonus-sources.json ▸ facteursDeClasse (propJob.inc)", "public/wiki/competences.json"],
    dossierDuClient: path.basename(CLIENT),
  },
  proprietes: {
    declarees: proprietes.map((p) => ({
      ...p,
      attributXml: ATTRIBUT_DE_PROPRIETE[p.cle] ?? null,
      colonnePropJob: COLONNE_PROPJOB[p.cle],
      familleDArme: FAMILLES_DARME.includes(p.cle),
      employeeDansLeXml: Object.values(equilibrages).some((ms) => ms.some((m) => ATTRIBUT_DE_PROPRIETE[p.cle] in m.attributs)),
    })),
    maxJobProp: MAX_JOB_PROP,
    situations,
    typesDeLigne,
    inconnuesDePropJob: proprietes.filter((p) => !COLONNE_PROPJOB[p.cle]).map((p) => p.nom),
  },
  equilibrages: parSituation,
  competences: {
    facteurs: totalFacteurs,
    parSituation: Object.fromEntries(Object.entries(facteursParSituation).map(([s, l]) => [s, l.length])),
    identifiants: competences.length,
    dansLesDeuxSituations: competences.filter((c) => c.dansLesDeuxSituations).length,
    operande: "non dit par le client — propBalance.xml écrit le facteur, jamais ce qu'il multiplie. Aucun écran ne doit en tirer un dégât tant que l'opérande n'est pas établi.",
    croisementAvecLeSite: {
      competencesDuSite: competencesDuSite.size,
      identifiantsDeLEquilibrage: competences.length,
      rattaches: competences.filter((c) => c.connueDuSite).length,
      orphelinesCoteEquilibrage: orphelinesCoteBalance,
      competencesDuSiteSansFacteur: competencesDuSiteSansFacteur.length,
      partDuSiteTouchee: Number(((competences.filter((c) => c.connueDuSite).length / competencesDuSite.size) * 100).toFixed(1)),
    },
    liste: competences,
  },
  metiers: {
    dansLEquilibrage: idsBalance.size,
    declaresDansDefineJob: metiersReels.size,
    maxJob: MAX_JOB,
    lignesDePropJob: propJob.size,
    concordanceDesNumeros,
    sansMetierDeclare: { combien: sansMetierDeclare.length, liste: sansMetierDeclare, ceQueCaVeutDire: "Ces lignes d'équilibrage ne correspondent à AUCUN numéro de métier de defineJob.h (MAX_JOB vaut " + MAX_JOB + "). Le client ne peut pas les rattacher : ce sont des lignes préparées pour un palier qui n'est pas déclaré." },
    sansEquilibrage: { combien: metiersSansEquilibrage.length, liste: metiersSansEquilibrage, ceQueCaVeutDire: "Ces métiers existent dans defineJob.h et dans propJob.inc, mais aucune ligne d'équilibrage ne les nomme : pour eux, propJob.inc est la SEULE table." },
    sansLignePropJob: { combien: metiersSansLignePropJob.length, liste: metiersSansLignePropJob },
  },
  arbitrage: {
    question: "propJob.inc et propBalance.xml donnent des valeurs différentes pour le même métier. Laquelle fait foi ?",
    verdict: "propBalance.xml fait foi POUR CE QU'IL ÉCRIT ; propJob.inc est la table de repli, attribut par attribut. Ni remplacement total, ni ignorance : une superposition.",
    tranche: false,
    pourquoiPasTranche: "Aucune source ne le PROUVE. Le wiki officiel (106 pages, table des matières lue) ne porte pas une seule page de formule, ni un seul de ces coefficients — il ne peut donc rien arbitrer. Le verdict ci-dessus s'appuie sur des constats structurels mesurés, pas sur une lecture du code du serveur, qui n'est pas dans le client.",
    preuveDansLExecutable,
    pourPropBalance: [
      "Neuz.exe porte `propBalance.xml`, `PropBalance`, `CProject::loadPropBalance`, les noms d'attribut à la suite, `Skill`, `Factor`, et le message « %s - SkillID not found [Job %d - PvP %d] ». Le client lit ce fichier et l'indexe par métier ET par drapeau PvP. Les occurrences sont RECOMPTÉES à chaque exécution : voir `preuveDansLExecutable`.",
      "propBalance nomme l'arc ; propJob ne le nomme pas. Le chargeur du client connaît en plus la faux, que même propBalance n'emploie pas encore.",
      "Sur ses colonnes d'arme, propJob NE VARIE PAS d'une classe à l'autre (mesuré ici) ; propBalance varie (mesuré ici).",
      "propBalance est propJob recopié puis retouché sur les métiers de départ (compté dans `copieEtRetouche`) : c'est la signature d'une couche posée par-dessus, pas d'une table indépendante.",
      "Le client embarque une fenêtre d'administration APP_ADMIN_BALANCE (resdata.inc) : l'équilibrage se retouche en jeu.",
    ],
    pourGarderPropJob: [
      "Une ligne d'équilibrage ne nomme QUE les armes de son propre métier — le repli est obligatoire dès qu'un personnage tient une arme hors de sa voie.",
      "Les lignes PvP des paliers Maître, Héros et Légende ne portent ni HP, ni MP, ni FP, ni les trois récupérations.",
      metiersSansEquilibrage.length + " métier(s) de propJob.inc n'ont aucune ligne d'équilibrage.",
      sansMetierDeclare.length + " ligne(s) d'équilibrage ne correspondent à aucun métier déclaré.",
    ],
    attributsNonAppliques,
    copieEtRetouche,
    varianceDePropJob,
    varianceDeBalance,
    armesNonNommees,
    consigne: "Un écran qui affiche un facteur d'arme DOIT montrer les deux valeurs quand elles divergent. Le relevé les porte toutes les deux, métier par métier, dans equilibrages.<situation>.confrontationAPropJob.divergences.",
  },
  trous: [
    "CE QUE `Factor` MULTIPLIE n'est écrit nulle part. Le facteur d'une compétence est recopié, jamais appliqué.",
    "LE GAIN PAR PALIER D'AMÉLIORATION reste hors des données : propEnchant.inc ne donne que NORMAL_SCAL et ALL_SCAL, sans le multiplicande. Ce relevé n'y change rien.",
    "LES SEUILS DE LA FORMULE (12 pour une épée, 14 pour un arc) et les facteurs de niveau viennent du Flyff officiel. propBalance.xml donne le COEFFICIENT, pas le seuil : la réserve tient entièrement.",
    "L'attribut `Faux` est connu du chargeur du client et numéroté JOB_PROP_FAUX, mais AUCUNE ligne de propBalance.xml ne l'écrit : aucune valeur de faux n'existe dans les données.",
  ],
};

const dest = path.join(racine, "public/wiki/balance.json");
fs.writeFileSync(dest, JSON.stringify(sortie, null, 0));
const ko = (fs.statSync(dest).size / 1024).toFixed(1);

console.log(`balance.json — ${ko} Ko`);
for (const [s, v] of Object.entries(parSituation)) {
  console.log(`  ${s} : ${v.metiers.length} métiers · ${v.profil.colonnes.length} attributs employés · ${v.facteursDeCompetence} facteurs de compétence`);
  const c = v.confrontationAPropJob;
  console.log(`      contre propJob : ${c.identiques}/${c.comparees} identiques, ${c.divergentes} divergences`);
  console.log(`      dont armes ${c.parSac.arme.identiques}/${c.parSac.arme.comparees} · blocage+critique ${c.parSac.combat.identiques}/${c.parSac.combat.comparees} · corps ${c.parSac.corps.identiques}/${c.parSac.corps.comparees}`);
}
console.log(`  compétences : ${totalFacteurs} facteurs · ${competences.length} identifiants distincts · ${competences.filter((c) => c.connueDuSite).length} rattachés au site sur ${competencesDuSite.size}`);
if (orphelinesCoteBalance.length) console.log(`      orphelines côté équilibrage : ${orphelinesCoteBalance.join(", ")}`);
console.log(`  métiers : ${idsBalance.size} équilibrés · ${sansMetierDeclare.length} sans numéro dans defineJob.h · ${metiersSansEquilibrage.length} sans équilibrage`);
console.log(`  propriétés : ${proprietes.length} déclarées (MAX_JOB_PROP ${MAX_JOB_PROP}) · ${proprietes.filter((p) => !COLONNE_PROPJOB[p.cle]).map((p) => p.nom).join(", ")} inconnues de propJob.inc`);
console.log(`  armes nommées par ligne : de ${armesNonNommees.minimumNomme} à ${armesNonNommees.maximumNomme} sur ${armesNonNommees.famillesDArme} — le repli sur propJob.inc est obligatoire`);
console.log(`  numéros de métier : ${concordanceDesNumeros.accordes}/${concordanceDesNumeros.lignesDePropJob} d'accord avec defineJob.h (MAX_JOB ${MAX_JOB})${concordanceDesNumeros.ecarts.length ? " — écarts : " + concordanceDesNumeros.ecarts.map((e) => e.metier).join(", ") : ""}`);
