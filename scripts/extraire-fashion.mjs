// ════════════════════════════════════════════════════════════════════════
//  EXTRAIRE LES BONUS DE FASHION ET LES GEMMES DE COSTUME
//  node scripts/extraire-fashion.mjs  →  src/data/fashion-bonus.json
// ════════════════════════════════════════════════════════════════════════
//
// Pourquoi un extrait et pas une lecture directe : le catalogue
// `public/wiki/objets-fiches.json` pèse 3 Mo. La page qui affiche ces chiffres
// est un composant CLIENT — un import statique enverrait les 3 Mo dans son
// paquet JS pour afficher trente lignes. Même raison que `catalogue.ts`, qui lit
// le fichier avec `fs` côté serveur. Ici on précalcule : 6 Ko au lieu de 3 Mo.
//
// Ce fichier ne fabrique AUCUN chiffre. Tout ce qu'il écrit est un compte ou un
// maximum relevé dans les données ; s'il n'y a rien à compter, la clé est
// absente et l'écran n'affiche rien.

import fs from "node:fs";
import path from "node:path";

const racine = process.cwd();
const fiches = JSON.parse(fs.readFileSync(path.join(racine, "public", "wiki", "objets-fiches.json"), "utf8"));
const builder = JSON.parse(fs.readFileSync(path.join(racine, "src", "data", "builder-data.json"), "utf8"));

// Le client range les six emplacements de fashion sous ces libellés. Le suffixe
// « (mode) » ne sert qu'à les distinguer des pièces d'armure du même nom : il
// n'a rien à faire à l'écran.
const EMPLACEMENTS = [
  ["Cape", "Cape"],
  ["Masque", "Masque"],
  ["Coiffe (mode)", "Coiffe"],
  ["Tenue (mode)", "Tenue"],
  ["Gants (mode)", "Gants"],
  ["Chaussures (mode)", "Chaussures"],
];

const mode = fiches.objets.filter((o) => o.f === "mode");

const emplacements = EMPLACEMENTS.map(([brut, nom]) => {
  const pieces = mode.filter((o) => o.t === brut);
  return { nom, pieces: pieces.length, avecBonus: pieces.filter((o) => o.b?.length).length };
});

// Pour chaque bonus : sur combien de pièces il apparaît, et la plus haute valeur
// relevée à chaque emplacement. « Le plus haut relevé » n'est pas « ce qu'on peut
// viser » — d'où les singletons ci-dessous, qui nomment les pièces d'événement
// dont la valeur écrase tout le reste.
const parBonus = new Map();
for (const [brut, nom] of EMPLACEMENTS) {
  for (const o of mode) {
    if (o.t !== brut) continue;
    for (const [b, v] of o.b ?? []) {
      if (!parBonus.has(b)) parBonus.set(b, { nom: b, pieces: 0, ou: {} });
      const e = parBonus.get(b);
      e.pieces += 1;
      e.ou[nom] = Math.max(e.ou[nom] ?? 0, v);
    }
  }
}
const bonus = [...parBonus.values()].sort((a, b) => b.pieces - a.pieces);

// Une valeur atteinte par UNE SEULE pièce dans tout le catalogue n'est pas un
// plafond, c'est une exception. On les nomme : sans ça, « PV max 9999 sur une
// coiffe » se lit comme une règle du jeu alors que c'est une couronne d'événement.
const sommets = [];
for (const [brut, nom] of EMPLACEMENTS) {
  for (const o of mode) {
    if (o.t !== brut) continue;
    for (const [b, v] of o.b ?? []) {
      const autres = mode.filter((x) => x.t === brut && x.i !== o.i && (x.b ?? []).some(([bb, vv]) => bb === b && vv >= v));
      if (autres.length === 0 && parBonus.get(b).ou[nom] === v) sommets.push({ objet: o.n, emplacement: nom, bonus: b, valeur: v });
    }
  }
}

// Les gemmes de costume du builder. La liste en compte DOUZE pour onze bonus :
// « Soin % » y figure deux fois, aux mêmes valeurs. On dédoublonne, et on garde
// la trace du doublon — c'est une information sur la donnée, pas un détail.
const vues = new Map();
let doublons = 0;
for (const g of builder.costumeGems) {
  const clef = `${g.stat}|${g.levels.join(",")}`;
  if (vues.has(clef)) { doublons += 1; continue; }
  vues.set(clef, { stat: g.stat, paliers: g.levels });
}

const sortie = {
  genere: new Date().toISOString().slice(0, 10),
  source: "public/wiki/objets-fiches.json + src/data/builder-data.json (costumeGems)",
  releve: fiches.genere ?? null,
  total: mode.length,
  avecBonus: mode.filter((o) => o.b?.length).length,
  emplacements,
  bonus,
  sommets: sommets.sort((a, b) => b.valeur - a.valeur),
  gemmes: [...vues.values()],
  gemmesBrutes: builder.costumeGems.length,
  gemmesDoublons: doublons,
};

const cible = path.join(racine, "src", "data", "fashion-bonus.json");
fs.writeFileSync(cible, JSON.stringify(sortie, null, 1) + "\n");
console.log(
  `${cible}\n  ${sortie.total} pièces de fashion · ${sortie.avecBonus} avec bonus · ` +
  `${bonus.length} bonus distincts · ${sortie.gemmes.length} gemmes (${doublons} doublon(s) écarté(s)) · ` +
  `${sommets.length} sommet(s) tenu(s) par une seule pièce`
);
