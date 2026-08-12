import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/**
 * L'ANNUAIRE DES PNJ — « qui vend quoi, et où le trouver ».
 *
 * Le fichier fait 205 Ko : trop pour un `import` statique (il partirait dans le
 * paquet JS de la page) et surtout inutile en entier, parce que 90 % du poids
 * ce sont les inventaires de vente et les recettes — qu'on ne lit QUE sur la
 * fiche ouverte. On le lit donc ici une seule fois, on garde l'index en
 * mémoire, et on renvoie :
 *   · sans paramètre  → l'annuaire allégé (un PNJ = deux lignes de texte)
 *   · avec `?cle=…`   → la fiche complète d'un seul PNJ
 * Même approche que src/app/api/ou-trouver/route.ts.
 *
 * Page publique : aucun contrôle d'accès ici. Ce sont des données de jeu,
 * lisibles par n'importe qui dans le client — rien qui appartienne à la guilde.
 */

type Objet = { n: string; p?: number; i: string | null };
/** Un troc : l'objet vendu, et l'objet-monnaie qui le paie (jeton, nucléus…). */
type Troc = { n: string; i: string | null; m: string; mi: string | null };
type Recette = { l: string; s: string | null; i: string | null; e: { n: string; q: number }[] };

export type Fiche = {
  cle: string;
  nom: string;
  /** Portrait de dialogue, apparié par la chaîne SetImage → IDS_* → char_*.tga. */
  img: string | null;
  metier: string | null;
  quoi: string | null;
  famille: string;
  srt: string | null;
  ville: string | null;
  role: string | null;
  /** Les objets-monnaies acceptés, pour répondre à « qui prend ça ? ». */
  monnaies: string[];
  vend: Objet[];
  troc: Troc[];
  craft: Recette[];
  nbCraftTotal: number;
  craftEteints: number;
  quetes: number;
};

/** Ce que l'annuaire renvoie : de quoi dessiner une vignette, pas la fiche. */
export type Vignette = Omit<Fiche, "vend" | "troc" | "craft"> &
  { nbVend: number; nbTroc: number; nbCraft: number };

let TOUT: Fiche[] | null = null;

function charger(): Fiche[] {
  if (TOUT) return TOUT;
  const f = path.join(process.cwd(), "public", "wiki", "pnj.json");
  TOUT = JSON.parse(fs.readFileSync(f, "utf8")) as Fiche[];
  return TOUT;
}

/** Accents ignorés : le client écrit « Ame de démon », le joueur tape « Âme ».
 *  Même normalisation que /api/objets et /api/ou-trouver. */
const clef = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * « QUI VEND ÇA ? » — la question que l'annuaire ne savait pas traiter.
 *
 * On pouvait chercher un PNJ par son nom, son métier ou sa ville, mais pas par ce
 * qu'il propose : pour trouver où s'achète une potion, il fallait ouvrir les fiches
 * une par une. La recherche vit ici et pas dans le navigateur parce que les
 * inventaires sont l'essentiel des 205 Ko du fichier — les envoyer pour les filtrer
 * ensuite reviendrait à télécharger tout ce qu'on voulait éviter.
 *
 * Trois natures de résultat, dans l'ordre où elles servent : ce qu'il fabrique, ce
 * qu'il échange contre un jeton, ce qu'il vend. Chacune renvoie les libellés qui ont
 * répondu, pour qu'on voie POURQUOI ce PNJ est dans la liste.
 */
type Trouve = { cle: string; nom: string; img: string | null; metier: string | null; ville: string | null; comment: string; articles: { n: string; i: string | null }[] };

function chercherObjet(tout: Fiche[], terme: string): Trouve[] {
  const k = clef(terme);
  if (k.length < 3) return [];
  const out: Trouve[] = [];
  for (const p of tout) {
    const groupes: [string, { n: string; i: string | null }[]][] = [
      ["fabrique", p.craft.filter((r) => clef(r.s ?? r.l).includes(k)).map((r) => ({ n: r.s ?? r.l, i: r.i }))],
      ["contre un jeton", p.troc.filter((t) => clef(t.n).includes(k)).map((t) => ({ n: t.n, i: t.i }))],
      ["vend", p.vend.filter((o) => clef(o.n).includes(k)).map((o) => ({ n: o.n, i: o.i }))],
    ];
    for (const [comment, articles] of groupes) {
      if (!articles.length) continue;
      out.push({ cle: p.cle, nom: p.nom, img: p.img, metier: p.metier, ville: p.ville, comment, articles: articles.slice(0, 6) });
    }
  }
  return out.slice(0, 40);
}

export async function GET(req: Request) {
  let tout: Fiche[];
  try {
    tout = charger();
  } catch {
    return NextResponse.json({ error: "Annuaire indisponible" }, { status: 503 });
  }

  const p = new URL(req.url).searchParams;

  const objet = p.get("objet");
  if (objet) return NextResponse.json({ objet, resultats: chercherObjet(tout, objet) });

  const cle = p.get("cle");
  if (cle) {
    const f = tout.find((x) => x.cle === cle);
    if (!f) return NextResponse.json({ error: "PNJ inconnu" }, { status: 404 });
    return NextResponse.json(f);
  }

  const annuaire: Vignette[] = tout.map(({ vend, troc, craft, ...reste }) => ({
    ...reste,
    nbVend: vend.length,
    nbTroc: troc.length,
    // `nbCraftTotal` compte TOUTES les recettes actives du PNJ ; `craft` est
    // plafonné à 30 pour ne pas gonfler le fichier. On affiche le vrai compte.
    nbCraft: reste.nbCraftTotal || craft.length,
  }));

  return NextResponse.json({
    pnj: annuaire,
    total: annuaire.length,
    // Les deux chiffres qu'on assume publiquement, et qu'on ne veut pas voir
    // dériver dans un texte codé en dur quelque part dans la page.
    portraits: new Set(annuaire.map((p) => p.img).filter(Boolean)).size,
  });
}
