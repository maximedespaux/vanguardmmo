import fs from "node:fs";
import path from "node:path";
import { CLASS_NAMES } from "@/data/classes";
import dungeons from "@/data/dungeons.json";
import { nombreDObjets } from "@/components/objets/catalogue";

/**
 * LES QUATRE CHIFFRES DE L'ACCUEIL — comptés, jamais écrits.
 *
 * Ils étaient en dur dans `PageAccueil.tsx` : « 8 », « 23 », « 4 970 », « 52 ».
 * Les quatre étaient justes le jour où on les a tapés, et c'est exactement le
 * problème : le premier versement de données qui ajoute une instance ou un objet
 * les rend faux, sans que rien ne le signale. Le site a déjà payé ça deux fois —
 * un total de prestige recopié pour 69 au lieu de 75, et un « Trente-sept
 * classes » qui comptait les paliers comme des classes.
 *
 * Pourquoi ce fichier est à part, et pourquoi il lit avec `fs` : deux des quatre
 * comptes vivent dans `public/wiki/` (3 Mo et 60 Ko). Les importer dans
 * `PageAccueil` — un composant CLIENT — enverrait tout dans le paquet JS de la
 * page d'accueil. On les lit donc côté serveur, une fois, et on ne fait passer
 * que les quatre nombres. Même modèle que `components/objets/catalogue.ts`.
 *
 * Ce module ne doit JAMAIS être importé par un composant client.
 */

function compteur(fichier: string, lire: (d: unknown) => number | null): number | null {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "wiki", fichier), "utf8"));
    const n = lire(d);
    return typeof n === "number" && n > 0 ? n : null;
  } catch {
    // Un relevé absent n'est pas une raison de faire tomber l'accueil : le chiffre
    // manquant ne s'affiche pas, et c'est tout (cf. `chiffresAccueil`).
    return null;
  }
}

export type ChiffreAccueil = { n: number; libelle: string };

/**
 * Les quatre comptes, dans l'ordre d'affichage. Un compte qui ne se lit pas est
 * ABSENT de la liste plutôt qu'affiché à zéro : « 0 objet dont on sait la
 * provenance » serait un mensonge sur nos données, pas une information.
 */
export function chiffresAccueil(): ChiffreAccueil[] {
  const objets = compteur("ou-trouver.json", (d) => (d as { compteurs?: { objets?: number } }).compteurs?.objets ?? null);
  const vagues = compteur("oasis-vagues.json", (d) => (d as { vagues?: unknown[] }).vagues?.length ?? null);

  return [
    { n: CLASS_NAMES.length, libelle: "spécialisations de fin de partie" },
    { n: (dungeons as unknown[]).length, libelle: "instances documentées" },
    ...(objets ? [{ n: objets, libelle: "objets dont on sait la provenance" }] : []),
    // Le mode s'appelle « Protection de l'Oasis » ; « Tour Infernale » est la CARTE
    // sur laquelle il se joue, et ses paliers sont des VAGUES dans le relevé. On
    // écrit donc « vagues », le mot du jeu — pas « paliers », qui est celui du
    // prestige et prêtait à confusion à deux lignes d'écart.
    ...(vagues ? [{ n: vagues, libelle: "vagues de la Protection de l'Oasis" }] : []),
  ];
}

/**
 * CE QUE CHAQUE PORTE PÈSE — la mesure qui remplace une phrase de vantardise.
 *
 * Les portes de l'accueil portent une ligne facultative sous leur description
 * (`Porte.chiffre`). Trois d'entre elles mènent au WIKI — les monstres, le
 * catalogue d'objets, les marchands — et c'est justement la demande de fond :
 * qu'un visiteur voie que le site sait retrouver un monstre, un objet, sa
 * provenance. Un adjectif ne le prouve pas ; un compte oui.
 *
 * Les quatre relevés sont lus ICI, côté serveur, et il ne descend que des
 * chaînes déjà mises en forme : `PortesSite` est un composant CLIENT, et
 * monstres.json (612 Ko), pnj.json (296 Ko) et objets-fiches.json (2,8 Mo) ne
 * doivent jamais entrer dans le paquet du navigateur. Le catalogue passe par
 * `nombreDObjets()`, l'index que /objets garde déjà en mémoire : deux lecteurs
 * pour un même fichier finiraient par ne plus dire le même nombre.
 *
 * La clé est le `href` de la porte. Un relevé illisible n'ajoute simplement pas
 * sa ligne — la porte s'affiche sans mesure, ce qui est prévu.
 *
 * ET CES MESURES NE CHASSENT JAMAIS UNE LIGNE DÉJÀ ÉCRITE : /boutique et /crafts
 * emploient la leur pour dire ce qu'on peut en faire sans compte, et pour un
 * visiteur ce renseignement vaut plus qu'un total. Le remplissage est donc fait
 * « seulement si c'est vide », côté accueil.
 */
export function comptesPortes(): Record<string, string> {
  const fr = (n: number) => n.toLocaleString("fr-FR");
  const out: Record<string, string> = {};

  const monstres = compteur("monstres.json", (d) => (d as { total?: number }).total ?? null);
  if (monstres) out["/monstres"] = `${fr(monstres)} monstres`;

  const pnj = compteur("pnj.json", (d) => (Array.isArray(d) ? d.length : null));
  // « PNJ » et non « marchands et artisans » : c'est le titre de la porte, et une
  // mesure qui recopie son propre titre ne mesure rien. PNJ est aussi le mot du jeu.
  if (pnj) out["/pnj"] = `${fr(pnj)} PNJ`;

  try {
    const objets = nombreDObjets();
    if (objets > 0) out["/objets"] = `${fr(objets)} objets`;
  } catch {
    // Même règle que `compteur` : pas de relevé, pas de ligne. L'accueil ne tombe
    // pas parce qu'un fichier du wiki manque.
  }

  return out;
}

/** La même chose en une phrase, pour la description que voit un moteur de recherche. */
export function phraseAccueil(): string {
  const c = chiffresAccueil();
  const n = (libelle: string) => c.find((x) => x.libelle.startsWith(libelle))?.n;
  const instances = n("instances");
  const objets = n("objets");
  return (
    "La guilde Vanguard sur le serveur privé Flyff AirFlyff : " +
    (instances ? `les ${instances} instances et leurs butins, ` : "les instances et leurs butins, ") +
    (objets ? `la provenance de ${objets.toLocaleString("fr-FR")} objets, ` : "la provenance des objets, ") +
    "les paliers de prestige et l'AirBuilder. Consultable sans compte."
  );
}
