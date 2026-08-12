import fs from "node:fs";
import path from "node:path";
import { clefRecherche, type Famille, type ObjetFiche } from "./vocabulaire";

/**
 * LE CATALOGUE DES 12 134 OBJETS — chargé une fois, gardé en mémoire.
 *
 * `public/wiki/objets-fiches.json` pèse 3 Mo. Un import statique le mettrait
 * dans le paquet JS de la page (3 Mo à télécharger pour afficher dix lignes) et
 * un fetch depuis le navigateur ferait la même bêtise en différé. On le lit donc
 * ici avec `fs`, au premier appel, et on garde l'index : c'est exactement le
 * modèle de `src/app/api/ou-trouver/route.ts` et de `src/lib/ouFarmer.ts`.
 *
 * Ce fichier touche au disque : il ne doit JAMAIS être importé par un composant
 * client. Les libellés partagés avec l'écran vivent dans `vocabulaire.ts`.
 */

type Entree = { o: ObjetFiche; k: string };

let TOUT: Entree[] | null = null;
let PAR_ID: Map<number, ObjetFiche> | null = null;
let GENERE = "";

function charger() {
  if (TOUT && PAR_ID) return { TOUT, PAR_ID };
  const f = path.join(process.cwd(), "public", "wiki", "objets-fiches.json");
  const d = JSON.parse(fs.readFileSync(f, "utf8")) as { genere?: string; objets: ObjetFiche[] };
  GENERE = d.genere ?? "";
  // La clé de recherche est calculée une fois pour toutes : la recalculer à
  // chaque frappe sur 12 134 lignes se sentirait dans le champ de saisie.
  TOUT = d.objets.map((o) => ({ o, k: clefRecherche(o.n) }));
  PAR_ID = new Map(d.objets.map((o) => [o.i, o]));
  return { TOUT, PAR_ID };
}

export const dateDuCatalogue = () => { charger(); return GENERE; };
export const nombreDObjets = () => charger().TOUT.length;

/**
 * Les quatre comptes que les pastilles de filtre portent. COMPTÉS sur le
 * catalogue, jamais écrits : un chiffre en dur dans une étiquette survit au
 * relevé qui le rend faux, et c'est déjà arrivé sur ce site.
 *
 * Ils sont GLOBAUX et pas relatifs au filtre courant, exprès : une pastille dit
 * « voilà ce qu'il y a derrière », donc son compte ne doit pas bouger au fil de
 * la frappe. Les comptes par famille, eux, suivent les critères — ce sont des
 * onglets, pas des interrupteurs.
 */
export function comptesGlobaux() {
  const { TOUT: tout } = charger();
  let maison = 0, bonus = 0, unique = 0, ultime = 0;
  for (const { o } of tout) {
    if (o.af === 1) maison++;
    if (o.b?.length) bonus++;
    if (o.g === "Unique") unique++;
    else if (o.g === "Ultime") ultime++;
  }
  return { maison, bonus, unique, ultime };
}
export const objetParId = (id: number) => charger().PAR_ID.get(id) ?? null;

export type Critere = {
  q?: string;
  famille?: Famille | "";
  /** Ne garder que ce qu'on peut porter à ce niveau — la question du joueur qui
   *  monte, pas « niveau exactement égal à ». */
  niveau?: number | null;
  grade?: "Unique" | "Ultime" | "" ;
  /** Seuls les objets qui portent au moins un bonus. */
  avecBonus?: boolean;
  /** Seuls les objets AJOUTÉS par AirFlyff — le champ `af`, qui vient des deux
   *  espaces de noms propres au serveur. C'est le tri qui sépare le serveur du
   *  jeu de base, et c'est celui qui a le plus de valeur ici. */
  maison?: boolean;
};

/**
 * Le classement des résultats, et pourquoi il compte plus que le filtrage :
 * « epee » sort 200 lignes, et celle qu'on cherchait doit être dans les cinq
 * premières. On note donc la QUALITÉ de la correspondance avant tout — nom
 * exact, puis début du nom, puis début d'un mot, puis n'importe où — et on ne
 * range par niveau qu'à égalité.
 */
function note(k: string, q: string): number {
  if (!q) return 0;
  const p = k.indexOf(q);
  if (p < 0) return -1;
  if (k === q) return 100;
  if (p === 0) return 70;
  if (k[p - 1] === " ") return 50;
  return 20;
}

export function chercher(c: Critere, limite = 50) {
  const { TOUT: tout } = charger();
  const q = clefRecherche(c.q ?? "");

  const gardes: { e: Entree; s: number }[] = [];
  for (const e of tout) {
    const o = e.o;
    if (c.famille && o.f !== c.famille) continue;
    if (c.grade && o.g !== c.grade) continue;
    if (c.avecBonus && !o.b?.length) continue;
    if (c.maison && o.af !== 1) continue;
    // Un objet sans niveau requis se porte à tout niveau : on ne l'écarte pas.
    if (c.niveau != null && (o.nr ?? 0) > c.niveau) continue;
    const s = note(e.k, q);
    if (s < 0) continue;
    gardes.push({ e, s });
  }

  gardes.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    // Sans mot-clé, on montre le haut du panier : c'est la réponse utile à
    // « montre-moi les armes » posée sans autre précision.
    const ga = a.e.o.g ? (a.e.o.g === "Ultime" ? 2 : 1) : 0;
    const gb = b.e.o.g ? (b.e.o.g === "Ultime" ? 2 : 1) : 0;
    if (gb !== ga) return gb - ga;
    if ((b.e.o.nr ?? 0) !== (a.e.o.nr ?? 0)) return (b.e.o.nr ?? 0) - (a.e.o.nr ?? 0);
    return a.e.o.n.localeCompare(b.e.o.n, "fr");
  });

  return { total: gardes.length, objets: gardes.slice(0, limite).map((x) => x.e.o) };
}

/** Combien d'objets par famille, pour le jeu de critères courant : les onglets
 *  portent leur compte, donc on sait ce qu'il y a dedans sans cliquer. */
export function comptesParFamille(c: Critere): Record<string, number> {
  const { TOUT: tout } = charger();
  const q = clefRecherche(c.q ?? "");
  const n: Record<string, number> = {};
  for (const e of tout) {
    const o = e.o;
    if (c.grade && o.g !== c.grade) continue;
    if (c.avecBonus && !o.b?.length) continue;
    if (c.maison && o.af !== 1) continue;
    if (c.niveau != null && (o.nr ?? 0) > c.niveau) continue;
    if (note(e.k, q) < 0) continue;
    n[o.f] = (n[o.f] ?? 0) + 1;
  }
  return n;
}

/**
 * « Et à part ça, qu'est-ce que je peux mettre là ? » — même type d'objet, aux
 * niveaux les plus proches. C'est ce qu'on veut savoir en regardant une pièce :
 * s'il existe mieux, ou moins cher, pour le même emplacement.
 *
 * Réservé à ce qu'on ÉQUIPE. Pour un matériau de craft, le « même type » est
 * « Divers / boîte » — un fourre-tout de 3 952 lignes : la fiche d'une Âme de
 * démon proposait une armure au motif qu'elles partagent ce type. Mieux vaut
 * ne rien proposer que de proposer n'importe quoi.
 */
const EQUIPEMENT = new Set(["arme", "armure", "bijou", "mode"]);

export function voisins(o: ObjetFiche, combien = 6): ObjetFiche[] {
  if (!o.t || !EQUIPEMENT.has(o.f)) return [];
  const { TOUT: tout } = charger();
  const n = o.nr ?? 0;
  return tout
    .filter((e) => e.o.t === o.t && e.o.i !== o.i && (e.o.cl ? !o.cl || e.o.cl === o.cl : true))
    .sort((a, b) => Math.abs((a.o.nr ?? 0) - n) - Math.abs((b.o.nr ?? 0) - n))
    .slice(0, combien)
    .map((e) => e.o);
}
