// @ts-nocheck
/**
 * LE PONT ENTRE UN MONSTRE ET CE QU'IL LÂCHE.
 *
 * `public/wiki/monstres.json` nomme les objets de butin de deux façons selon la
 * source de la fouille : `butin[].o` porte un NOM FRANÇAIS, `butinClient[].o`
 * porte une CLÉ `II_*`. Ni l'un ni l'autre ne donne l'identifiant numérique — et
 * sans lui un nom d'objet ne peut pas mener à sa fiche `/objets/<id>`.
 *
 * Ce script résout les 106 références sur `objets-fiches.json` et écrit un pont de
 * 10 Ko, importable par un composant client (le catalogue, lui, pèse 3 Mo et ne
 * descend jamais au navigateur).
 *
 * DEUX PIÈGES PAYÉS ICI :
 *  · UN nom de butin porte un « ½ » à la place du « œ » — « Fragment de C½ur », et
 *    il est lâché par 265 monstres, soit la majorité des fiches qui montrent du
 *    butin. C'est un accident d'encodage du client (le « œ » d'une page de code
 *    latine relu en cp437), pas un autre objet. MESURÉ : le catalogue d'objets porte
 *    le MÊME accident sur les mêmes noms (25 objets, 62 occurrences avec les
 *    descriptions), donc la normalisation ne change RIEN à la résolution — 106/106
 *    avec ou sans elle. Ce qu'elle change est le nom AFFICHÉ : sans réparation, la
 *    vignette de butin écrit « Fragment de C½ur » à l'écran. Le pont répare donc le
 *    nom qu'il rend, et garde la clé telle que `monstres.json` l'écrit ;
 *  · une icône annoncée par le catalogue peut manquer du disque. On vérifie
 *    fichier par fichier : pointer une image absente est pire que ne pas la
 *    montrer. Huit des 106 sont dans ce cas — c'est ce chiffre-là qui vaut huit,
 *    pas le nombre de noms mal encodés.
 *
 *   node scripts/extraire-monstres-butin.mjs
 */
import fs from "node:fs";
import path from "node:path";

const racine = process.cwd();
const lire = (p) => JSON.parse(fs.readFileSync(path.join(racine, p), "utf8"));

const fiches = lire("public/wiki/objets-fiches.json").objets;
const monstres = lire("public/wiki/monstres.json").monstres;
const dossierIcones = path.join(racine, "public", "jeu", "icones");

const norm = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/½/g, "oe").replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ").trim();

/** LE NOM TEL QU'ON L'AFFICHE. La normalisation ci-dessus sert à RAPPROCHER deux
 *  écritures ; elle ne répare rien de ce qu'on montre. Le « ½ » du client doit
 *  redevenir un « œ » AVANT d'entrer dans le pont, sinon 265 fiches de monstre
 *  écrivent « Fragment de C½ur » sous une icône. */
const lisible = (s) => (s || "").replace(/½/g, "œ");

const parNom = new Map();
const parCle = new Map();
for (const o of fiches) {
  const k = norm(o.n);
  // Le premier gagne : deux objets peuvent porter le même nom (versions garçon et
  // fille), et le butin ne dit pas lequel.
  if (!parNom.has(k)) parNom.set(k, o);
  parCle.set(o.cle, o);
}

/** Ce que monstres.json écrit, tel quel, → l'objet du catalogue. */
const refs = new Map();
for (const m of monstres) {
  for (const b of m.butin ?? []) refs.set(b.o, parNom.get(norm(b.o)));
  for (const b of m.butinClient ?? []) refs.set(b.o, parCle.get(b.o) ?? parNom.get(norm(b.o)));
}

const objets = {};
let sansIcone = 0, introuvables = 0;
for (const [ref, o] of [...refs.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"))) {
  if (!o) { introuvables++; continue; }
  const ic = o.ic && fs.existsSync(path.join(dossierIcones, o.ic)) ? o.ic : null;
  if (!ic) sansIcone++;
  objets[ref] = { n: lisible(o.n), i: o.i, ...(ic ? { ic } : {}) };
}

const sortie = {
  genere: new Date().toISOString().slice(0, 10),
  source: "public/wiki/objets-fiches.json (nom francais, identifiant, cle client) + public/jeu/icones/",
  note: "Cle = ce que monstres.json ecrit dans butin[].o (nom francais) ou butinClient[].o (cle client). Valeur = nom affiche, identifiant de fiche, et fichier d'icone verifie present sur le disque.",
  references: refs.size,
  resolus: Object.keys(objets).length,
  objets,
};

fs.writeFileSync(
  path.join(racine, "src", "data", "monstres-butin.json"),
  JSON.stringify(sortie, null, 1) + "\n"
);
console.log(
  `${sortie.resolus}/${refs.size} references resolues · ${sansIcone} sans icone sur le disque · ${introuvables} introuvables`
);
