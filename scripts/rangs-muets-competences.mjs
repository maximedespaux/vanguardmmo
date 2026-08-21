// ════════════════════════════════════════════════════════════════════════
//  LES RANGS QUI RECOPIENT LE PRÉCÉDENT — vérifiés sur le client, pas déduits
// ════════════════════════════════════════════════════════════════════════
//
// Lancer :  node scripts/rangs-muets-competences.mjs
//
// CE QU'IL RÈGLE, ET POURQUOI CE N'EST PAS UN DÉTAIL. La page annonce, sur
// certaines compétences, que tel rang « ne change aucune valeur » et que le
// franchir coûte quand même des milliers de points. C'est un conseil de
// dépense : s'il est faux, il coûte plus cher que pas de conseil du tout.
//
// Ce constat était d'abord tiré du RELEVÉ (`public/wiki/competences.json`), qui
// ne garde qu'une partie des colonnes du client. Sur « Second souffle »
// (SI_ASS_HEAL_PREVENTION), le relevé ne conserve que le coût en PM — lequel
// monte un rang sur deux — et range le soin dans les effets FIXES à la valeur
// 10. Or le client fait monter `dwChgParamVal1` de 15 à 120, un cran à CHAQUE
// rang : la compétence s'améliore vingt fois, et la page annonçait dix rangs
// muets à 31 632 points. Une colonne absente du relevé suffit donc à retourner
// le conseil.
//
// LA MÉTHODE. On relit `propSkillAdd.csv` dans le client — la table par rang,
// une ligne par rang — et on compare CHAQUE colonne d'un rang au rang
// précédent. Un rang n'est déclaré muet que si RIEN n'y bouge, colonnes de coût
// comprises. C'est volontairement plus strict que ce que la page montre : on
// aime mieux taire un rang muet que d'en inventer un.
//
// LE « = » DU CLIENT. Dans ce fichier, `=` veut dire « comme la ligne
// précédente ». Il peut donc hériter d'une ligne qui appartient à une AUTRE
// compétence — c'est le piège de ce format. Ça n'ébrèche pas la comparaison
// menée ici : elle est RELATIVE (le rang n contre le rang n-1), et une suite de
// `=` est constante quelle que soit la valeur dont elle hérite. Un `=` mal
// résolu ne peut que faire apparaître un changement là où il n'y en a pas,
// jamais l'inverse — encore le côté prudent.
//
// LA SORTIE : le champ `rangsMuets` (les rangs, à partir du 2) sur chaque
// compétence de `public/wiki/competences.json`. La route ne calcule plus rien :
// elle lit ce champ et lui applique la table de coût du client. Absent, il ne
// se dit rien — un renseignement qu'on ne peut pas étayer disparaît.
// ════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { archive, fichier, signatureClient } from "./lib-air.mjs";

const RACINE = process.cwd();
const JSON_RELEVE = path.join(RACINE, "public/wiki/competences.json");

/** Les trois premières colonnes ne décrivent pas la compétence : identifiant de
 *  ligne, identifiant de compétence, numéro de rang. Tout le reste compte. */
const IDENTITE = 3;

/**
 * `propSkillAdd.csv`, une ligne par rang, les `=` résolus par héritage de la
 * ligne précédente — la règle du format.
 * @returns Map identifiant de compétence → lignes, dans l'ordre du fichier.
 */
function rangsDuClient() {
  const brut = fichier(archive("data-05.air"), "propSkillAdd.csv");
  const lignes = brut.split(/\r?\n/).filter((l) => l.trim());
  const entete = lignes[0].split(",").map((s) => s.trim());
  if (!entete.includes("dwSkillLvl")) {
    throw new Error(`propSkillAdd.csv : colonne dwSkillLvl introuvable (${entete.length} colonnes lues)`);
  }

  const par = new Map();
  let precedente = null;
  for (const l of lignes.slice(1)) {
    const f = l.split(",").map((s) => s.trim());
    if (!f[0] || f[0].startsWith("//")) continue;
    const r = f.map((v, i) => (v === "=" && precedente ? precedente[i] : v));
    precedente = r;
    const id = r[1];
    if (!id) continue;
    if (!par.has(id)) par.set(id, []);
    par.get(id).push(r);
  }
  return { par, colonnes: entete.length };
}

/** Les rangs où AUCUNE colonne ne diffère du rang précédent. */
function muets(rangs, colonnes) {
  const out = [];
  for (let i = 1; i < rangs.length; i++) {
    let bouge = false;
    for (let k = IDENTITE; k < colonnes; k++) {
      if ((rangs[i][k] ?? "") !== (rangs[i - 1][k] ?? "")) { bouge = true; break; }
    }
    if (!bouge) out.push(i + 1);
  }
  return out;
}

function principal() {
  const releve = JSON.parse(fs.readFileSync(JSON_RELEVE, "utf8"));
  const { par, colonnes } = rangsDuClient();

  let avecMuets = 0;
  let totalRangs = 0;
  const absentes = [];
  const desaccords = [];

  for (const c of releve.competences) {
    const rangs = par.get(c.id);
    // Pas de table par rang, ou un nombre de lignes qui ne correspond pas au
    // nombre de rangs du relevé : on ne sait pas aligner, donc on ne dit rien.
    if (!rangs) { absentes.push(c.id); c.rangsMuets = []; continue; }
    if (rangs.length !== c.nivMax) { desaccords.push(`${c.id} (${rangs.length} lignes / ${c.nivMax} rangs)`); c.rangsMuets = []; continue; }
    c.rangsMuets = muets(rangs, colonnes);
    if (c.rangsMuets.length) { avecMuets++; totalRangs += c.rangsMuets.length; }
  }

  const prix = new Map(releve.xpCompetence.map((x) => [x.niveau, x.xp]));
  const cout = (c) => c.rangsMuets.reduce((s, r) => s + (prix.get(r) ?? 0), 0);
  const pire = [...releve.competences].filter((c) => c.rangsMuets.length).sort((a, b) => cout(b) - cout(a)).slice(0, 5);

  fs.writeFileSync(JSON_RELEVE, JSON.stringify(releve));

  console.log(`client : ${JSON.stringify(signatureClient().dossier)}`);
  console.log(`propSkillAdd.csv : ${colonnes} colonnes, ${par.size} compétences`);
  console.log(`compétences avec au moins un rang muet : ${avecMuets} / ${releve.competences.length} · ${totalRangs} rangs en tout`);
  for (const c of pire) console.log(`  ${c.nom} (${c.classe}) : rangs ${c.rangsMuets.join(", ")} — ${cout(c)} points`);
  if (absentes.length) console.log(`sans table par rang (${absentes.length}) : ${absentes.join(", ")}`);
  if (desaccords.length) console.log(`nombre de rangs en désaccord (${desaccords.length}) : ${desaccords.join(", ")}`);
}

principal();
