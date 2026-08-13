import fs from "node:fs";
import path from "node:path";
import { clefRecherche, type Famille, type ObjetFiche } from "./vocabulaire";
import { idsAvecStat } from "./stats";
// « D'où vient cet objet » — le même relevé que /wiki lit, à la même source, avec la
// même formulation. Voir le cadre en tête de `provenance.ts`.
import { provenanceDe } from "./provenance";
// Les deux catalogues se parlent, et c'est tout l'objet de cette passe : « quels
// objets tombent sur un monstre » n'a de réponse que du côté des monstres. Les deux
// modules lisent le disque côté serveur, aucun des deux fichiers ne descend au
// navigateur.
import { objetsLaches } from "@/components/monstres/catalogue";

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
  /* LE « ½ » DU CLIENT REDEVIENT UN « œ », UNE FOIS, ICI.
     Le relevé porte un accident d'encodage venu du client : 25 noms d'objet et 35
     descriptions écrivent « C½ur », « B½uf », « S½ur ». On ne touche pas au relevé —
     c'est une lecture brute du jeu — mais on ne montre pas non plus un mot cassé :
     « Fragment de C½ur » s'affichait dans le titre de l'onglet, dans la fiche, dans
     les résultats de recherche et sur 265 fiches de monstre. La clé de recherche ne
     bouge pas d'un iota : `clefRecherche` réduit « ½ » et « œ » au même espace, donc
     tous les rapprochements par nom (les lâcheurs, les étals, « où le trouver »)
     continuent de tomber juste. */
  for (const o of d.objets) {
    if (o.n?.includes("½")) o.n = o.n.replace(/½/g, "œ");
    if (o.d?.includes("½")) o.d = o.d.replace(/½/g, "œ");
  }
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
  const laches = objetsLaches();
  let maison = 0, bonus = 0, unique = 0, ultime = 0, lache = 0;
  /* `e.k` EST DÉJÀ la clé de recherche du nom : la recalculer ici refaisait une
     normalisation Unicode et deux expressions régulières sur 12 134 lignes à chaque
     appel de /api/objets, soit toutes les 220 ms pendant qu'on tape. */
  for (const e of tout) {
    const o = e.o;
    if (o.af === 1) maison++;
    if (o.b?.length) bonus++;
    if (o.g === "Unique") unique++;
    else if (o.g === "Ultime") ultime++;
    if (laches.has(e.k)) lache++;
  }
  return { maison, bonus, unique, ultime, lache };
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
  /**
   * UNE STATISTIQUE PRÉCISE, par son code `DST_*`.
   *
   * « Qu'est-ce qui donne du taux critique ? » n'avait aucune réponse sur ce site :
   * on pouvait filtrer « qui portent des bonus », pas dire lequel. Le code vient de
   * `stats.ts`, qui le lit dans le client — un libellé français ne se filtre pas de
   * façon sûre, les libellés du relevé se décalent.
   */
  stat?: string;
  /** Seuls les objets qu'un monstre lâche. C'est « retrouver les drops » pris dans
   *  l'autre sens que la fiche du monstre. */
  lache?: boolean;
};

/**
 * Le classement des résultats, et pourquoi il compte plus que le filtrage :
 * « epee » sort 200 lignes, et celle qu'on cherchait doit être dans les cinq
 * premières. On note donc la QUALITÉ de la correspondance avant tout — nom
 * exact, puis début du nom, puis début d'un mot, puis n'importe où — et on ne
 * range par niveau qu'à égalité.
 */
function note(k: string, q: string, jetons: string[] = []): number {
  if (!q) return 0;
  const p = k.indexOf(q);
  if (p >= 0) {
    if (k === q) return 100;
    if (p === 0) return 70;
    if (k[p - 1] === " ") return 50;
    return 20;
  }
  /**
   * ┌──────── LES MOTS DANS N'IMPORTE QUEL ORDRE — le même défaut que sur /wiki, et il
   * │ se mesurait ici aussi en trois essais :
   * │
   * │   « epee luzaka »      → 1 réponse
   * │   « luzaka epee »      → 0
   * │   « ancestrale hache » → 0     alors que « hache ancestrale » → 1
   * │   « yggdrasil epee »   → 0     alors que 7 objets portent les deux mots
   * │
   * │ Tout ce qui précède cherche une SUITE de caractères. Le champ promet dans son
   * │ propre texte que « les accents n'ont pas d'importance » — le joueur en déduit que
   * │ la saisie est tolérante, et l'ordre des mots, lui, était impitoyable. Il obtient
   * │ « Rien sous ce nom. Essaie un mot plus court », et il conclut que le catalogue ne
   * │ connaît pas la pièce.
   * │
   * │ La règle : TOUS les mots tapés doivent être là, l'ordre est libre — et cela ne vaut
   * │ qu'en DERNIER RECOURS, sous les vingt points de la plus faible correspondance
   * │ contiguë, pour qu'une suite exacte reste toujours devant.
   * │
   * │ Pas de clé compacte ici, contrairement à /wiki : le catalogue n'en a pas. Les noms
   * │ d'objet du client ne cachent pas de mot derrière une apostrophe comme les noms de
   * │ monstre (Bàäl'tru) — c'est justement pourquoi seule /wiki en porte une.
   * └────────────────────────────────────────────────────────────────────────────────────
   */
  if (jetons.length < 2) return -1;
  return jetons.every((t) => k.includes(t)) ? 10 : -1;
}

/** Les mots tapés, découpés une fois pour toute la recherche : `clefRecherche` a déjà
 *  réduit la ponctuation à des espaces. Les lettres seules sortent — « d », « l », « a »
 *  sont dans presque tous les noms et ne filtrent rien. */
const decouper = (q: string) => q.split(" ").filter((m) => m.length > 1);

export function chercher(c: Critere, limite = 50) {
  const { TOUT: tout } = charger();
  const q = clefRecherche(c.q ?? "");
  const jetons = decouper(q);
  const ids = c.stat ? idsAvecStat(c.stat) : null;
  const laches = c.lache ? objetsLaches() : null;

  const gardes: { e: Entree; s: number }[] = [];
  for (const e of tout) {
    const o = e.o;
    if (c.famille && o.f !== c.famille) continue;
    if (c.grade && o.g !== c.grade) continue;
    if (c.avecBonus && !o.b?.length) continue;
    if (c.maison && o.af !== 1) continue;
    if (ids && !ids.has(o.i)) continue;
    // `e.k` est la clé du nom, déjà calculée au chargement (cf. `comptesGlobaux`).
    if (laches && !laches.has(e.k)) continue;
    // Un objet sans niveau requis se porte à tout niveau : on ne l'écarte pas.
    if (c.niveau != null && (o.nr ?? 0) > c.niveau) continue;
    const s = note(e.k, q, jetons);
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

  /**
   * LA PROVENANCE EST AGRAFÉE ICI, sur les cinquante lignes rendues.
   *
   * Deux raisons de ne pas la mettre dans l'index chargé : elle vit dans un autre
   * relevé (8 459 sources), et surtout — ON NE MUTE PAS `x.e.o`. Ces objets sont les
   * OBJETS DU CACHE, partagés par `objetParId`, `voisins` et la fiche : leur poser un
   * champ au passage d'une recherche le laisserait là pour toutes les suivantes, et la
   * fiche afficherait une provenance calculée pour l'écran d'à côté. D'où la copie de
   * surface — cinquante copies d'objets plats, le prix est nul.
   */
  return {
    total: gardes.length,
    objets: gardes.slice(0, limite).map(({ e }) => {
      const pv = provenanceDe(e.o.n);
      return pv ? { ...e.o, pv } : e.o;
    }),
  };
}

/** Combien d'objets par famille, pour le jeu de critères courant : les onglets
 *  portent leur compte, donc on sait ce qu'il y a dedans sans cliquer. */
export function comptesParFamille(c: Critere): Record<string, number> {
  const { TOUT: tout } = charger();
  const q = clefRecherche(c.q ?? "");
  /* LE MÊME DÉCOUPAGE QUE `chercher`, et ce n'est pas cosmétique : les comptes des
     onglets de famille doivent porter sur le MÊME ensemble que la liste. Sans les
     jetons ici, « luzaka epee » afficherait six cartes sous des onglets tous à zéro. */
  const jetons = decouper(q);
  const ids = c.stat ? idsAvecStat(c.stat) : null;
  const laches = c.lache ? objetsLaches() : null;
  const n: Record<string, number> = {};
  for (const e of tout) {
    const o = e.o;
    if (c.grade && o.g !== c.grade) continue;
    if (c.avecBonus && !o.b?.length) continue;
    if (c.maison && o.af !== 1) continue;
    if (ids && !ids.has(o.i)) continue;
    // `e.k` est la clé du nom, déjà calculée au chargement (cf. `comptesGlobaux`).
    if (laches && !laches.has(e.k)) continue;
    if (c.niveau != null && (o.nr ?? 0) > c.niveau) continue;
    if (note(e.k, q, jetons) < 0) continue;
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
