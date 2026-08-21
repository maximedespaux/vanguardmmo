// ════════════════════════════════════════════════════════════════════════
//  LES ICÔNES DE COMPÉTENCE — celles du jeu, posées par la donnée
// ════════════════════════════════════════════════════════════════════════
//
// Lancer :  node scripts/extraire-icones-competences.mjs
//
// CE QU'IL RÈGLE. Le relevé des 197 compétences n'avait aucune image : le
// catalogue montrait, ligne après ligne, le MÊME emblème de classe — huit
// boucliers de Chevalier identiques les uns sous les autres. Le client, lui,
// dessine chaque compétence.
//
// COMMENT LA CORRESPONDANCE EST FAITE — et pourquoi elle n'est pas devinée.
// `propSkill.txt` porte une colonne `szIcon` (la 121ᵉ) qui NOMME le fichier de
// l'icône, exactement comme `character.inc` nomme le portrait d'un PNJ. On lit
// donc ce champ ; on ne rapproche jamais deux noms qui se ressemblent. Une
// icône posée sur la mauvaise compétence serait pire que pas d'icône : le
// joueur reconnaît ses compétences À L'IMAGE, dans sa barre de raccourcis.
//
//   SI_VAG_ONE_CLEANHIT → szIcon "skill_VagOneCleanh.dds" → Data/Icon/data.air
//
// La casse du champ et celle de l'archive ne concordent pas toujours
// (« skill_MagSpekestone.DDS » contre `skill_magspekestone.dds`) : la
// résolution se fait donc sur le nom en minuscules.
//
// PLUSIEURS COMPÉTENCES PARTAGENT UNE ICÔNE, et c'est le client qui le dit :
// onze compétences de Magicien pointent sur `skill_MagSpekestone.DDS`. On ne
// corrige pas — c'est ce que le joueur voit en jeu. La planche ne stocke donc
// qu'une case par FICHIER, et deux compétences peuvent viser la même.
//
// LA SORTIE :
//   · public/jeu/competences/planche.png   une planche, une case par fichier
//   · public/wiki/competences.json         le champ `icone` (n° de case) sur
//     chaque compétence, et le bloc `planche` (grille, taille, source).
//
// Rien n'est écrit en dur côté page : la grille se lit dans le JSON.
// ════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { archive, fichier, signatureClient } from "./lib-air.mjs";

const RACINE = process.cwd();
const JSON_RELEVE = path.join(RACINE, "public/wiki/competences.json");
const PLANCHE = path.join(RACINE, "public/jeu/competences/planche.png");
const TAILLE = 32; // la taille NATIVE des icônes du client : on ne la choisit pas.

/** Un nom comparable : sans accents, sans casse, sans espaces en trop. Le
 *  client écrit « Benediction du Souverain », le relevé « Bénédiction du
 *  Souverain » — c'est le même libellé, et il n'y a rien à deviner là-dedans. */
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Lit un fichier tabulé du client, en-tête compris, colonnes détourées. */
function tableau(brut) {
  const lignes = brut.split(/\r?\n/).filter((l) => l.trim());
  return lignes.map((l) => l.split("\t").map((s) => s.replace(/"/g, "").trim()));
}

/** La table de textes du client : IDS_… → libellé traduit. */
function textes(brut) {
  const m = new Map();
  for (const l of brut.split(/\r?\n/)) {
    const i = l.indexOf("\t");
    if (i > 0 && l.startsWith("IDS_")) m.set(l.slice(0, i).trim(), l.slice(i + 1).trim());
  }
  return m;
}

/**
 * LES COMPÉTENCES HORS CLASSE — le groupe et le Souverain.
 *
 * Elles ne sont pas dans `propSkill.txt` : le groupe vit dans
 * `propTroupeSkill.txt`, le Souverain dans `lordskill.txt`. Les deux portent la
 * même paire de champs — un identifiant de TEXTE et un nom de fichier d'icône —
 * et le texte traduit se lit dans le `.txt.txt` jumeau. On remonte donc du nom
 * français AFFICHÉ sur le site jusqu'à l'icône par la chaîne du client, sans
 * jamais rapprocher deux libellés qui se ressemblent : la comparaison est
 * l'égalité stricte des noms, accents mis à plat.
 *
 * LES TROIS COMPÉTENCES DE COUPLE N'Y SONT PAS, et c'est délibéré. Leurs icônes
 * existent (`skill_Couple01..03.dds`) mais le client ne les attache pas à un nom
 * de compétence : il les pose sur des OBJETS de buff dont le libellé est
 * « Puissance d'attaque +2 % ». Relier ça à « Pouvoir de l'Amour » demanderait
 * de deviner, donc on ne le fait pas.
 */
function iconesHorsClasse(a01, a05) {
  const out = new Map(); // nom normalisé → fichier d'icône

  const brancher = (tab, txt, colTexte, colIcone) => {
    for (const f of tab.slice(1)) {
      if (f.length <= Math.max(colTexte, colIcone)) continue;
      const nom = txt.get(f[colTexte]);
      const ico = f[colIcone];
      if (nom && ico && /\.dds$/i.test(ico)) out.set(norm(nom), ico);
    }
  };

  // propTroupeSkill.txt a la même forme que propSkill.txt : on retrouve ses
  // colonnes par leur nom d'en-tête plutôt que par leur rang.
  const tro = tableau(fichier(a05, "propTroupeSkill.txt"));
  const eTro = tro[1] ?? tro[0];
  brancher(tro, textes(fichier(a01, "proptroupeskill.txt.txt")), eTro.indexOf("szName"), eTro.indexOf("szIcon"));

  // lordskill.txt n'a pas d'en-tête nommée : une seule ligne de commentaire en
  // coréen. Ses colonnes sont donc repérées par leur CONTENU — l'identifiant de
  // texte commence par IDS_, l'icône finit par .dds. C'est plus solide qu'un
  // rang figé, et ça se voit tout de suite si le format change.
  for (const f of tableau(fichier(a05, "lordskill.txt"))) {
    const ids = f.find((x) => x.startsWith("IDS_"));
    const ico = f.find((x) => /^skill_.*\.dds$/i.test(x));
    if (ids && ico) {
      const nom = textes(fichier(a01, "lordskill.txt.txt")).get(ids);
      if (nom) out.set(norm(nom), ico);
    }
  }
  return out;
}

/** La colonne `szIcon` de propSkill.txt, par identifiant de compétence. */
function iconesDuClient() {
  const brut = fichier(archive("data-05.air"), "propSkill.txt");
  const lignes = brut.split(/\r?\n/).filter((l) => l.trim());
  const entete = lignes[0].split("\t").map((s) => s.trim());
  // On CHERCHE la colonne au lieu de compter jusqu'à 120 : le client ajoute des
  // colonnes d'une livraison à l'autre, et un indice figé décalerait tout.
  const cId = entete.findIndex((h) => h.endsWith("dwID"));
  const cIcon = entete.indexOf("szIcon");
  if (cId < 0 || cIcon < 0) throw new Error(`propSkill.txt : colonnes dwID/szIcon introuvables (${entete.length} colonnes lues)`);

  const par = new Map();
  for (const l of lignes.slice(1)) {
    const f = l.split("\t").map((s) => s.trim());
    if (f.length <= cIcon) continue;
    const id = f[cId];
    if (!id || id.startsWith("//")) continue;
    // Le champ est écrit `"""skill_X.dds"""` dans le fichier du client.
    const nom = f[cIcon].replace(/"/g, "").trim();
    if (nom && nom !== "=" && nom !== "0") par.set(id, nom);
  }
  return par;
}

function principal() {
  const releve = JSON.parse(fs.readFileSync(JSON_RELEVE, "utf8"));
  const competences = releve.competences;
  const szIcon = iconesDuClient();
  const horsClasse = iconesHorsClasse(archive("data-01.air"), archive("data-05.air"));

  const icones = archive("Data/Icon/data.air");
  // L'archive est indexée en minuscules pour absorber la casse du champ.
  const parNom = new Map([...icones.keys()].map((n) => [n.toLowerCase(), n]));
  const nbSkillEnArchive = [...parNom.keys()].filter((n) => n.startsWith("skill")).length;

  /** nom de fichier (minuscules) → n° de case sur la planche. */
  const cases = new Map();
  const sansChamp = [];
  const sansFichier = [];

  for (const c of competences) {
    const nom = szIcon.get(c.id);
    if (!nom) { sansChamp.push(c.id); c.icone = null; continue; }
    const clef = nom.toLowerCase();
    if (!parNom.has(clef)) { sansFichier.push(`${c.id} → ${nom}`); c.icone = null; continue; }
    if (!cases.has(clef)) cases.set(clef, cases.size);
    c.icone = cases.get(clef);
  }

  // Le groupe et le Souverain rejoignent la même planche : une seconde image
  // pour dix-sept dessins aurait doublé les requêtes pour rien.
  const horsSansIcone = [];
  for (const groupe of [releve.horsClasse.groupe, releve.horsClasse.souverain, releve.horsClasse.couple]) {
    for (const s of groupe) {
      const nom = horsClasse.get(norm(s.nom));
      const clef = nom?.toLowerCase();
      if (!clef || !parNom.has(clef)) { horsSansIcone.push(s.nom); s.icone = null; continue; }
      if (!cases.has(clef)) cases.set(clef, cases.size);
      s.icone = cases.get(clef);
    }
  }

  const ordre = [...cases.keys()];
  const colonnes = Math.ceil(Math.sqrt(ordre.length));

  // Les .dds partent dans un dossier de travail : Pillow lit le DDS, sharp non,
  // et rien dans le dépôt ne sait décoder ce format en mémoire.
  const travail = fs.mkdtempSync(path.join(os.tmpdir(), "vg-icones-comp-"));
  for (const clef of ordre) fs.writeFileSync(path.join(travail, clef), icones.get(parNom.get(clef)));

  const manifeste = path.join(travail, "manifeste.json");
  fs.writeFileSync(manifeste, JSON.stringify({ dossier: travail, sortie: PLANCHE, taille: TAILLE, colonnes, cases: ordre }));
  const sortie = execFileSync("python3", [path.join(RACINE, "scripts/planche-icones-competences.py"), manifeste], { encoding: "utf8" });
  fs.rmSync(travail, { recursive: true, force: true });

  releve.planche = {
    fichier: "/jeu/competences/planche.png",
    taille: TAILLE,
    colonnes,
    lignes: Math.ceil(ordre.length / colonnes),
    cases: ordre.length,
    source: "propSkill.txt, colonne szIcon · Data/Icon/data.air",
  };
  fs.writeFileSync(JSON_RELEVE, JSON.stringify(releve));

  const rattachees = competences.filter((c) => c.icone != null).length;
  const utilises = new Set(ordre);
  const orphelines = [...parNom.keys()].filter((n) => n.startsWith("skill") && !utilises.has(n));

  process.stdout.write(sortie);
  console.log(`client : ${JSON.stringify(signatureClient().dossier)}`);
  console.log(`compétences rattachées à une icône : ${rattachees} / ${competences.length}`);
  console.log(`fichiers skill* dans l'archive : ${nbSkillEnArchive} · utilisés : ${utilises.size} · orphelins : ${orphelines.length}`);
  if (sansChamp.length) console.log(`sans champ szIcon (${sansChamp.length}) : ${sansChamp.join(", ")}`);
  if (sansFichier.length) console.log(`szIcon sans fichier (${sansFichier.length}) : ${sansFichier.join(", ")}`);
  const hors = [releve.horsClasse.groupe, releve.horsClasse.souverain, releve.horsClasse.couple].flat();
  console.log(`hors classe rattachées : ${hors.filter((s) => s.icone != null).length} / ${hors.length}`);
  if (horsSansIcone.length) console.log(`hors classe sans icône : ${horsSansIcone.join(", ")}`);
  console.log(`orphelines : ${orphelines.join(" ")}`);
}

principal();
