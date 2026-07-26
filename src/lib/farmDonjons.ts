/**
 * Rapproche les objets du plan de farm des donjons qui les lâchent.
 *
 * Pourquoi ce n'est pas une simple jointure : les deux vocabulaires ne sont pas
 * les mêmes. Le plan de farm nomme des objets précis (« Marteau Yggdrasil »),
 * les donjons décrivent des familles de butin (« Marteau Runique Yggdrasil »,
 * « Armures Yggdrasil par classe (toutes pièces) »). Il n'existe aucun
 * identifiant commun.
 *
 * Règle retenue : deux mots distinctifs partagés, ou un butin d'un seul mot
 * présent tel quel. Un seul mot commun suffisait à produire des rapprochements
 * FAUX et coûteux — « Pierre Jupiter » vers « Pierre Lunaire », « Aile
 * Enchantée » vers « Anneau Ailé Pur ». Envoyer quelqu'un farmer le mauvais
 * donjon est pire que ne rien annoncer.
 *
 * Le rapprochement reste une déduction : l'appelant DOIT afficher le libellé du
 * butin qui l'a justifié (`drop`), pour qu'on puisse juger sur pièce.
 */

import donjonsBruts from "@/data/dungeons.json";

export type Donjon = {
  id: number;
  name: string;
  type: string;
  lvl: string;
  prestige: number | null;
  elem: string | null;
  cat: string;
  icon: string;
  drops: string[];
};

export const DONJONS = donjonsBruts as Donjon[];

/** Mots trop courants pour distinguer quoi que ce soit. */
const VIDES = new Set([
  "de", "du", "des", "la", "le", "les", "par", "toutes", "toute", "tous", "et",
  "niv", "versions", "normales", "piece", "classe", "trash", "trashs", "pur",
  "pure", "oubliee", "ancien", "donnees", "completer", "boss",
]);

/**
 * Mots significatifs d'un libellé : sans accents, sans ponctuation, pluriel
 * grossièrement retiré (« Ailes enchantées » et « Aile Enchantée » doivent se
 * rejoindre, sinon la moitié des rapprochements évidents échouent).
 */
export function motsCles(libelle: string): Set<string> {
  const brut = String(libelle || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ");
  const out = new Set<string>();
  for (const w of brut.split(/\s+/)) {
    if (w.length < 3) continue;
    const sing = w.endsWith("s") && w.length > 4 ? w.slice(0, -1) : w;
    if (!VIDES.has(sing)) out.add(sing);
  }
  return out;
}

/** Le butin `drop` correspond-il à l'objet `nomObjet` ? */
export function correspond(nomObjet: string, drop: string): boolean {
  const a = motsCles(nomObjet);
  const b = motsCles(drop);
  if (!a.size || !b.size) return false;
  let communs = 0;
  for (const m of b) if (a.has(m)) communs++;
  if (communs >= 2) return true;
  // Butin nommé d'un seul mot : il doit apparaître tel quel dans l'objet.
  return b.size === 1 && communs === 1;
}

export type ObjetFarm = { id: string; item: string; cat: string; classe: string; icon: string | null; stock: number; target: number; manque: number; unit: string };

/** Un objet manquant rattaché à un donjon, avec le butin qui le justifie. */
export type Ligne = { objet: ObjetFarm; drop: string };

export type GroupeDonjon = { donjon: Donjon; lignes: Ligne[]; manqueTotal: number };

/**
 * Regroupe les objets par donjon. Un objet peut apparaître dans plusieurs
 * donjons (plusieurs sources légitimes) — on ne choisit pas à la place du
 * joueur. `orphelins` liste ce dont on ignore la provenance : c'est une
 * information utile, pas un échec à cacher.
 */
export function grouperParDonjon(objets: ObjetFarm[]): { groupes: GroupeDonjon[]; orphelins: ObjetFarm[] } {
  const parDonjon = new Map<number, Ligne[]>();
  const rattaches = new Set<string>();

  for (const o of objets) {
    for (const d of DONJONS) {
      const drop = d.drops.find((dr) => correspond(o.item, dr));
      if (!drop) continue;
      const l = parDonjon.get(d.id) ?? [];
      l.push({ objet: o, drop });
      parDonjon.set(d.id, l);
      rattaches.add(o.id);
    }
  }

  const groupes: GroupeDonjon[] = [...parDonjon.entries()]
    .map(([id, lignes]) => ({
      donjon: DONJONS.find((d) => d.id === id)!,
      lignes: lignes.sort((a, b) => b.objet.manque - a.objet.manque),
      manqueTotal: lignes.reduce((s, l) => s + l.objet.manque, 0),
    }))
    // Le plus utile d'abord : d'abord le nombre d'objets couverts, puis le
    // volume manquant. Trier sur le seul volume mettrait en tete un donjon qui
    // ne rend qu'un objet demande en tres grande quantite.
    .sort((a, b) => b.lignes.length - a.lignes.length || b.manqueTotal - a.manqueTotal);

  return { groupes, orphelins: objets.filter((o) => !rattaches.has(o.id)) };
}

/** Les donjons qui lâchent un objet donné — pour la vue « par objet ». */
export function donjonsPour(nomObjet: string): { donjon: Donjon; drop: string }[] {
  const out: { donjon: Donjon; drop: string }[] = [];
  for (const d of DONJONS) {
    const drop = d.drops.find((dr) => correspond(nomObjet, dr));
    if (drop) out.push({ donjon: d, drop });
  }
  return out;
}
