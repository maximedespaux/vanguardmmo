import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { effetTexte, fmt, type Catalogue, type Effet, type Entree, type Fiche, type Lignee, type Niveau, type Palier } from "@/components/competences/donnees";

/**
 * LES 202 COMPÉTENCES — index d'un côté, fiche complète de l'autre.
 *
 * Le fichier réduit fait 200 Ko : au-dessus du seuil où on se contente d'un
 * fetch depuis le navigateur, donc il est lu ici une seule fois et gardé en
 * mémoire — même approche que src/app/api/ou-trouver/route.ts.
 *
 * Deux réponses, parce qu'il y a deux moments :
 *   · sans paramètre  → l'index (202 lignes légères) + les tables de la page.
 *     C'est ce qu'il faut pour chercher, filtrer et reconnaître. ~45 Ko.
 *   · `?id=SI_…`      → la fiche, avec sa progression niveau par niveau.
 *     On ne la demande qu'au clic, et la page la garde ensuite.
 *
 * Pas de vérification d'accès : /competences est une page publique, c'est de la
 * connaissance du JEU. Le fichier lu est de toute façon dans `public/`.
 *
 * LA FORME SUR DISQUE N'EST PAS LA FORME ENVOYÉE. Le fichier compresse en
 * hissant dans `fixe` tout champ qui vaut la même chose sur les 20 niveaux —
 * l'incantation, la portée et la durée ne bougent presque jamais. La route
 * rend un vrai tableau de niveaux : le navigateur n'a pas à recomposer.
 */

type EffetBrut = Effet;
type CompetenceBrute = {
  id: string; nom: string; desc?: string; palier: Palier; classe: string; famille?: string;
  nivPerso: number; nivMax: number; type?: string; zone?: string; porteeTexte?: string;
  arme?: string; mains?: string; stat?: string; coef?: number;
  fixe: Record<string, number | null>;
  niveaux: Record<string, (number | null)[] | EffetBrut[][]>;
  effetsFixes?: EffetBrut[];
  prerequis?: { id: string; nom: string; niveau: number }[];
  debloque?: { id: string; nom: string; niveau: number }[];
};
type Fichier = {
  competences: CompetenceBrute[];
  lignees: Lignee[];
  xpCompetence: { niveau: number; xp: number }[];
  horsClasse: Catalogue["horsClasse"];
  doublons: Catalogue["doublons"];
};

let DONNEES: Fichier | null = null;
let PAR_ID: Map<string, CompetenceBrute> | null = null;
let INDEX: Entree[] | null = null;

/** Les champs de niveau, dans l'ordre où on veut les lire en colonnes. */
const CHAMPS = ["dmin", "dmax", "pm", "pf", "inc", "duree", "recharge", "portee", "coups", "proba", "provoc", "dureeDouleur", "vitAtq"] as const;

function charger(): Fichier {
  if (DONNEES) return DONNEES;
  const f = path.join(process.cwd(), "public", "wiki", "competences.json");
  DONNEES = JSON.parse(fs.readFileSync(f, "utf8")) as Fichier;
  PAR_ID = new Map(DONNEES.competences.map((c) => [c.id, c]));
  INDEX = DONNEES.competences.map(entree);
  return DONNEES;
}

/**
 * Ce que fait la compétence, en une ligne — au niveau MAXIMUM, pas au niveau 1.
 *
 * C'est le chiffre qui décide si ça vaut la peine de monter la compétence, et
 * c'est aussi celui qui rend visibles les deux réécritures du jeu : la
 * compétence de Maître qui change complètement d'effet au niveau 5 ne se lit
 * que comme ça.
 */
function resume(c: CompetenceBrute): string | null {
  const dernier = (champ: string): number | null => {
    const v = c.niveaux[champ] as (number | null)[] | undefined;
    if (v?.length) return v[v.length - 1];
    const fixe = c.fixe[champ];
    return fixe ?? null;
  };
  const dmax = dernier("dmax"), dmin = dernier("dmin");
  if (dmax != null) {
    const plage = dmin != null && dmin !== dmax ? `${fmt(dmin)}–${fmt(dmax)}` : fmt(dmax);
    const coups = dernier("coups");
    return `${plage} dégâts${coups && coups > 1 ? ` × ${coups} coups` : ""}`;
  }
  const effets = (c.niveaux.effets as EffetBrut[][] | undefined)?.slice(-1)[0] ?? c.effetsFixes;
  if (effets?.length) return effets.slice(0, 2).map(effetTexte).join(" · ");
  return null;
}

function entree(c: CompetenceBrute): Entree {
  return {
    id: c.id, nom: c.nom, palier: c.palier, classe: c.classe, famille: c.famille ?? null,
    nivPerso: c.nivPerso, nivMax: c.nivMax, type: c.type ?? null, arme: c.arme ?? null,
    resume: resume(c), aPrerequis: !!c.prerequis?.length,
  };
}

/** La forme compacte du disque, dépliée en un vrai tableau de niveaux. */
function fiche(c: CompetenceBrute): Fiche {
  const varie = Object.keys(c.niveaux);
  const colonnes = CHAMPS.filter((k) => varie.includes(k));

  const niveaux: Niveau[] = Array.from({ length: c.nivMax }, (_, i) => {
    const n: Niveau = { niveau: i + 1 };
    for (const k of colonnes) {
      const col = c.niveaux[k] as (number | null)[];
      (n as Record<string, unknown>)[k] = col[i] ?? null;
    }
    const eff = c.niveaux.effets as EffetBrut[][] | undefined;
    if (eff) n.effets = eff[i] ?? [];
    return n;
  });

  const constant: Omit<Niveau, "niveau"> = {};
  for (const k of CHAMPS) if (c.fixe[k] != null) (constant as Record<string, unknown>)[k] = c.fixe[k];
  if (c.effetsFixes) constant.effets = c.effetsFixes;

  return {
    id: c.id, nom: c.nom, desc: c.desc ?? null, palier: c.palier, classe: c.classe,
    famille: c.famille ?? null, nivPerso: c.nivPerso, nivMax: c.nivMax,
    type: c.type ?? null, zone: c.zone ?? null, porteeTexte: c.porteeTexte ?? null,
    arme: c.arme ?? null, mains: c.mains ?? null, stat: c.stat ?? null, coef: c.coef ?? null,
    constant,
    // `effets` n'est pas une colonne de chiffres : elle a sa propre ligne dans le
    // tableau, d'où l'exclusion ici.
    colonnes,
    niveaux,
    prerequis: c.prerequis ?? [],
    debloque: c.debloque ?? [],
  };
}

export async function GET(req: Request) {
  charger();
  const id = new URL(req.url).searchParams.get("id");

  if (id) {
    const c = PAR_ID!.get(id);
    if (!c) return NextResponse.json({ error: "Compétence inconnue" }, { status: 404 });
    return NextResponse.json({ fiche: fiche(c) });
  }

  const d = DONNEES!;
  const catalogue: Catalogue = {
    entrees: INDEX!,
    lignees: d.lignees,
    xpCompetence: d.xpCompetence,
    horsClasse: d.horsClasse,
    doublons: d.doublons,
  };
  return NextResponse.json(catalogue);
}
