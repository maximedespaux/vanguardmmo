import fs from "node:fs";
import path from "node:path";
import { clefRecherche, type Compteurs, type Monstre } from "./vocabulaire";

/**
 * LES 1 124 MONSTRES DU CLIENT — lus une fois, gardés en mémoire.
 *
 * `public/wiki/monstres.json` pèse 612 Ko. Un import statique le poserait dans le
 * paquet JS de la page : 612 Ko à télécharger pour afficher une fiche. Un fetch
 * depuis le navigateur ferait la même bêtise en différé. On le lit donc ici avec
 * `fs`, au premier appel — même modèle que `components/objets/catalogue.ts`,
 * `api/ou-trouver/route.ts` et `lib/ouFarmer.ts`.
 *
 * Ce fichier touche au disque : il ne doit JAMAIS être importé par un composant
 * client. Les libellés partagés avec l'écran vivent dans `vocabulaire.ts`.
 */

type Paquet = {
  genere?: string;
  source?: string;
  total: number;
  compteurs: Compteurs;
  groupes: { nom: string; n: number }[];
  monstres: Monstre[];
};

/**
 * Chaque monstre est indexé sur DEUX clés.
 *
 * `k` garde les séparateurs (« baal tru »), `kc` les supprime (« baaltru »).
 * Sans la seconde, un joueur qui tape « baaltru » — sans l'apostrophe, comme on
 * le fait naturellement au clavier — ne trouvait rien alors que le monstre
 * s'appelle Bàäl'tru. Les noms d'AirFlyff sont pleins d'apostrophes et de
 * crochets (« [Âme de la mort] Obnis », « Gor'Thar », « Shen'long ») : une seule
 * clé rendait la moitié du haut niveau inatteignable.
 */
type Entree = { m: Monstre; kc: string };

let TOUT: Entree[] | null = null;
let PAR_ID: Map<string, Monstre> | null = null;
let META: Omit<Paquet, "monstres"> | null = null;

const compacter = (k: string) => k.replace(/ /g, "");

function charger() {
  if (TOUT && PAR_ID && META) return { TOUT, PAR_ID, META };
  const f = path.join(process.cwd(), "public", "wiki", "monstres.json");
  const d = JSON.parse(fs.readFileSync(f, "utf8")) as Paquet;
  TOUT = d.monstres.map((m) => ({ m, kc: compacter(m.k) }));
  PAR_ID = new Map(d.monstres.map((m) => [m.id, m]));
  const { monstres: _ignore, ...reste } = d;
  void _ignore;
  META = reste;
  return { TOUT, PAR_ID, META };
}

export const metaCatalogue = () => charger().META;
export const monstreParId = (id: string) => charger().PAR_ID.get(id) ?? null;

export type Critere = {
  q?: string;
  rang?: string;
  element?: string;
  /** Niveau plancher : « à partir de quel niveau ça me concerne ». */
  niveauMin?: number | null;
  niveauMax?: number | null;
  /** Ne garder que le contenu ajouté par AirFlyff. */
  maison?: boolean;
  /** Ne garder que ceux qui se relèvent (plusieurs vies). */
  plusieursVies?: boolean;
  tri?: "pertinence" | "pvEff" | "niveau" | "degats" | "exp";
};

/**
 * Le classement des réponses compte plus que le filtrage : « dragon » sort
 * trente lignes et celle qu'on cherchait doit être dans les cinq premières. On
 * note donc la QUALITÉ de la correspondance — nom exact, début du nom, début
 * d'un mot, n'importe où — avant de trier sur autre chose.
 */
function noteSur(k: string, q: string): number {
  if (!q) return 0;
  const p = k.indexOf(q);
  if (p < 0) return -1;
  if (k === q) return 100;
  if (p === 0) return 70;
  if (k[p - 1] === " ") return 50;
  return 20;
}

/** La meilleure des deux clés. La version compacte est notée un cran plus bas :
 *  une correspondance « avec les espaces au bon endroit » est plus sûre. */
function note(e: Entree, q: string, qc: string): number {
  if (!q) return 0;
  const a = noteSur(e.m.k, q);
  const b = noteSur(e.kc, qc);
  return Math.max(a, b > 0 ? b - 5 : b);
}

const nombre = (n: number | null | undefined) => n ?? 0;

export function chercher(c: Critere, limite = 48) {
  const { TOUT: tout } = charger();
  const q = clefRecherche(c.q ?? "");
  const qc = compacter(q);
  const tri = c.tri ?? "pertinence";

  const gardes: { m: Monstre; s: number }[] = [];
  for (const e of tout) {
    const m = e.m;
    if (c.rang && m.rang !== c.rang) continue;
    if (c.element && m.elem !== c.element) continue;
    if (c.maison && !m.maison) continue;
    if (c.plusieursVies && !(m.vies && m.vies > 1)) continue;
    if (c.niveauMin != null && nombre(m.niv) < c.niveauMin) continue;
    if (c.niveauMax != null && nombre(m.niv) > c.niveauMax) continue;
    const s = note(e, q, qc);
    if (s < 0) continue;
    gardes.push({ m, s });
  }

  gardes.sort((a, b) => {
    // Le tri demandé passe devant la pertinence — sauf en « pertinence », où
    // c'est l'inverse. Sinon un tri par PV renverrait d'abord la correspondance
    // exacte, ce qui n'est pas ce qu'on a demandé.
    if (tri === "pvEff" && b.m.pvEff !== a.m.pvEff) return b.m.pvEff - a.m.pvEff;
    if (tri === "niveau" && nombre(b.m.niv) !== nombre(a.m.niv)) return nombre(b.m.niv) - nombre(a.m.niv);
    if (tri === "degats" && nombre(b.m.atkMax) !== nombre(a.m.atkMax)) return nombre(b.m.atkMax) - nombre(a.m.atkMax);
    if (tri === "exp" && nombre(b.m.exp) !== nombre(a.m.exp)) return nombre(b.m.exp) - nombre(a.m.exp);
    if (b.s !== a.s) return b.s - a.s;
    // Sans mot-clé ni tri, on montre le haut du panier : c'est la réponse utile
    // à « montre-moi les boss » posée sans autre précision.
    if (b.m.pvEff !== a.m.pvEff) return b.m.pvEff - a.m.pvEff;
    return a.m.nom.localeCompare(b.m.nom, "fr");
  });

  return { total: gardes.length, monstres: gardes.slice(0, limite).map((x) => x.m) };
}

/** Les comptes par rang et par élément, pour le jeu de critères courant : chaque
 *  pastille porte son compte, donc on sait ce qu'il y a derrière sans cliquer. */
export function comptes(c: Critere) {
  const { TOUT: tout } = charger();
  const q = clefRecherche(c.q ?? "");
  const qc = compacter(q);
  const rangs: Record<string, number> = {};
  const elements: Record<string, number> = {};
  for (const e of tout) {
    const m = e.m;
    if (c.maison && !m.maison) continue;
    if (c.plusieursVies && !(m.vies && m.vies > 1)) continue;
    if (c.niveauMin != null && nombre(m.niv) < c.niveauMin) continue;
    if (c.niveauMax != null && nombre(m.niv) > c.niveauMax) continue;
    if (note(e, q, qc) < 0) continue;
    if (!c.element || m.elem === c.element) {
      if (m.rang) rangs[m.rang] = (rangs[m.rang] ?? 0) + 1;
    }
    if (!c.rang || m.rang === c.rang) {
      if (m.elem) elements[m.elem] = (elements[m.elem] ?? 0) + 1;
    }
  }
  return { rangs, elements };
}

/**
 * LE CLASSEMENT DES BOSS PAR PV EFFECTIFS — la raison d'être de la page.
 *
 * On ne classe pas sur les PV affichés mais sur `PV × vies` : Azharyon annonce
 * 2 milliards et il en faut 30. Un joueur qui lit la barre de vie du jeu ne peut
 * pas le savoir, et c'est exactement ce qui fait croire à un bug quand le boss
 * se relève.
 */
/* `combien` est FACULTATIF, et par défaut on ne coupe pas. Le classement était
   plafonné à 60 alors que le filtre `vies > 1` désigne exactement les 94 boss
   annoncés par le compteur posé juste au-dessus du tableau : on lisait « 94 boss
   qui se relèvent », on déroulait, et on en trouvait 60 sans que rien ne dise
   que 34 manquaient. Un plafond qui ne s'annonce pas se lit comme un inventaire
   complet. 94 lignes d'un objet réduit ne pèsent rien — il n'y avait aucune
   raison de couper. */
export function classementBoss(combien?: number) {
  const { TOUT: tout } = charger();
  const rangs = tout
    .map((e) => e.m)
    .filter((m) => (m.vies ?? 0) > 1)
    .sort((a, b) => b.pvEff - a.pvEff || nombre(b.atkMax) - nombre(a.atkMax));
  return combien ? rangs.slice(0, combien) : rangs;
}

/** Les frappeurs : dégâts par coup les plus élevés. Le tank n'a pas le même
 *  problème selon l'instance, et cette colonne-là ne se devine pas des PV. */
export function classementFrappeurs(combien = 20) {
  const { TOUT: tout } = charger();
  return tout
    .map((e) => e.m)
    .filter((m) => nombre(m.atkMax) > 0)
    .sort((a, b) => nombre(b.atkMax) - nombre(a.atkMax))
    .slice(0, combien);
}

/**
 * « Et à côté de celui-là ? » — la famille de paliers, ou à défaut le même
 * contenu, aux niveaux les plus proches.
 *
 * 104 familles suivent le schéma Jeune / normal / Capitaine / Géant, et c'est la
 * première question devant un « Capitaine Aibatt » : le Géant saute d'un facteur
 * 75 en PV, ce qui n'est pas du tout le même combat.
 *
 * Le radical est le premier mot significatif — les mots de palier et de grade
 * sont ôtés d'abord, sinon « Géant Aibatt » se rattacherait aux 133 autres
 * Géants au lieu des trois autres Aibatt.
 */
const MOTS_DE_PALIER = new Set([
  "jeune", "geant", "capitaine", "grand", "petit", "elite", "mutant",
  "prestigieux", "contamine", "contaminee", "maudit", "maudite", "alpha",
]);

export function voisins(m: Monstre, combien = 6): Monstre[] {
  const { TOUT: tout } = charger();
  const mots = m.k.split(" ").filter((w) => w.length > 3 && !MOTS_DE_PALIER.has(w));
  const radical = mots[0] ?? "";
  let pool = radical ? tout.filter((e) => e.m.id !== m.id && e.m.k.split(" ").includes(radical)).map((e) => e.m) : [];
  // Un radical trop courant (« ame », « dragon ») ramasse trente monstres sans
  // rapport : ce n'est plus une famille, c'est du bruit. On retombe alors sur le
  // contenu, qui est une vraie réponse à « qui d'autre y a-t-il là-dedans ? ».
  if (pool.length === 0 || pool.length > 24) {
    pool = m.groupe ? tout.filter((e) => e.m.id !== m.id && e.m.groupe === m.groupe).map((e) => e.m) : pool.slice(0, combien);
  }
  return pool
    .sort((a, b) => Math.abs(nombre(a.niv) - nombre(m.niv)) - Math.abs(nombre(b.niv) - nombre(m.niv)) || a.nom.localeCompare(b.nom, "fr"))
    .slice(0, combien);
}
