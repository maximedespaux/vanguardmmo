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

export async function GET(req: Request) {
  let tout: Fiche[];
  try {
    tout = charger();
  } catch {
    return NextResponse.json({ error: "Annuaire indisponible" }, { status: 503 });
  }

  const cle = new URL(req.url).searchParams.get("cle");
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
