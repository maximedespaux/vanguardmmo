import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { apiGuild } from "@/lib/access";

/**
 * LES CRAFTS ET LES PNJ D'ÉCHANGE — la donnée derrière /crafts.
 *
 * `public/wiki/crafts.json` fait 280 Ko : trop pour un `import` statique (il
 * partirait dans le paquet JS de la page) et trop pour un fetch direct (le
 * navigateur téléchargerait tout pour afficher une recette). On le lit donc ici,
 * une seule fois, et on garde l'index en mémoire — même approche que
 * /api/ou-trouver et src/lib/ouFarmer.ts.
 *
 * Le fichier est dans `public/`, donc lisible sans passer par ce garde si on
 * connaît l'adresse. Ce n'est pas grave : ce sont les données du client du jeu,
 * les mêmes que /api/objets sert déjà. Le garde reste, il évite d'ouvrir une
 * page de guilde à un visiteur.
 *
 * D'OÙ VIENT crafts.json. C'est un extrait RÉDUIT — noms, icônes, quantités,
 * statuts, rien de plus — de deux relevés de la fouille du client d'octobre 2025 :
 *   · `crafts.json` (1,6 Mo, tiré de Exchange_Script.txt + character.inc) pour
 *     les 856 recettes, leurs quantités et leur statut chez le PNJ ;
 *   · `00-marqueur-airflyff.json` (tiré des descriptions françaises de
 *     propitem.txt.txt) pour les 39 arbres maison et où farmer chaque morceau.
 * Les icônes sont vérifiées présentes dans public/jeu/icones à la génération :
 * une image cassée est un défaut visible, pire que pas d'image.
 */

type Piece = { n: string | null; ic: string | null; q: number; c?: number | null };
type Recette = {
  id: number;
  g: string;
  st: "on" | "off" | "orphelin";
  pnj: string[];
  off: string[];
  e: Piece[];
  s: Piece[];
  alea: boolean;
  mec: "fonte" | "transfert" | null;
};
type Ingredient = { n: string; ic: string | null; ou: string; maison: boolean; vers: string | null; q: number | null };
type Arbre = {
  cle: string; nom: string; pnj: string | null; st: string | null; recette: number | null;
  ing: Ingredient[]; utilisePar: string[];
};
type Fichier = {
  genere: string;
  recettes: Recette[];
  arbres: Arbre[];
  ateliers: { titre: string; texte: string; pct: number[]; penya: number[] }[];
  metiers: { metier: string; pnj: string[] }[];
};

let CACHE: Fichier | null = null;
/** Le texte cherchable d'une recette, calculé une fois : sans ça, chaque
 *  recherche reconstruirait 834 chaînes de caractères. */
let MOTS: string[] = [];

const clef = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function charger(): Fichier {
  if (CACHE) return CACHE;
  const f = path.join(process.cwd(), "public", "wiki", "crafts.json");
  CACHE = JSON.parse(fs.readFileSync(f, "utf8")) as Fichier;
  MOTS = CACHE.recettes.map((r) =>
    clef([...r.e, ...r.s].map((x) => x.n ?? "").join(" ") + " " + r.pnj.join(" ") + " " + r.off.join(" ")));
  return CACHE;
}

/** Les groupes qu'on présente comme « fait maison AirFlyff ». */
const MAISON = new Set(["masques", "mantras", "buffs", "couturier", "materiaux"]);
/** Les comptoirs où l'on paie en jetons plutôt qu'en matériaux. */
const COMPTOIRS = new Set(["gvg", "jetons-guilde", "colisee", "flyshop", "fragments", "coupang", "yggdrasil"]);

export async function GET(req: Request) {
  const a = await apiGuild();
  if ("error" in a) return a.error;

  const d = charger();
  const p = new URL(req.url).searchParams;
  const vue = p.get("vue") ?? "depart";

  // Ce que la page charge à l'arrivée : le fait maison, l'arbre, les ateliers, les
  // métiers. Tout ce qui reste (les comptoirs, la recherche) se demande au clic —
  // envoyer les 834 recettes d'un coup ferait 280 Ko pour trois écrans jamais ouverts.
  if (vue === "depart") {
    return NextResponse.json({
      genere: d.genere,
      maison: d.recettes.filter((r) => MAISON.has(r.g)),
      arbres: d.arbres,
      ateliers: d.ateliers,
      metiers: d.metiers,
      total: d.recettes.length,
      actives: d.recettes.filter((r) => r.st === "on").length,
      eteintes: d.recettes.filter((r) => r.st === "off").length,
      orphelines: d.recettes.filter((r) => r.st === "orphelin").length,
      pnjDistincts: new Set(d.recettes.flatMap((r) => r.pnj)).size,
    });
  }

  if (vue === "comptoirs") {
    const g = p.get("g");
    const dedans = g && COMPTOIRS.has(g) ? (r: Recette) => r.g === g : (r: Recette) => COMPTOIRS.has(r.g);
    return NextResponse.json({ recettes: d.recettes.filter(dedans) });
  }

  // La recherche porte sur les noms d'objets ET sur les noms de PNJ : on cherche
  // aussi bien « qui vend ça » que « que vend celui-là ».
  if (vue === "recherche") {
    const q = clef(p.get("q") ?? "");
    if (q.length < 2) return NextResponse.json({ recettes: [], total: 0 });
    const trouve: Recette[] = [];
    for (let i = 0; i < d.recettes.length; i++) {
      if (MOTS[i].includes(q)) trouve.push(d.recettes[i]);
    }
    // Les actives d'abord : une recette éteinte intéresse moins que celle qu'on
    // peut faire ce soir.
    const rang = { on: 0, off: 1, orphelin: 2 } as const;
    trouve.sort((x, y) => rang[x.st] - rang[y.st]);
    return NextResponse.json({ recettes: trouve.slice(0, 60), total: trouve.length });
  }

  return NextResponse.json({ error: "vue inconnue" }, { status: 400 });
}
