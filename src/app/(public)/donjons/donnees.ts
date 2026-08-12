import fs from "node:fs";
import path from "node:path";
import type { Vague } from "@/components/oasis/modele";

/**
 * LES 52 VAGUES DE LA PROTECTION DE L'OASIS, LUES ICI ET NULLE PART AILLEURS.
 *
 * Ce fichier vivait sous src/app/(public)/oasis/. La page /oasis a été absorbée
 * par /donjons — les deux répondaient à la même question, « dans quoi est-ce que
 * j'entre ? » — donc la lecture suit la page qui reste. L'adresse /oasis, elle,
 * redirige : elle a pu circuler.
 *
 * Le fichier fait 12 Ko. On le lit ici, côté serveur, une seule fois, et on garde
 * le résultat en mémoire — même approche que src/lib/ouFarmer.ts et
 * src/app/api/ou-trouver. Un `import` statique aurait compilé les 12 Ko dans un
 * module JS, donc dans un paquet téléchargé et mis en cache à part ; ici ils
 * voyagent une seule fois, dans la charge de la page elle-même.
 *
 * Une phrase de l'ancien fichier disait que « le tableau part déjà rendu dans le
 * HTML pour qu'un moteur de recherche le lise ». C'est faux, et vérifié en lisant
 * le HTML servi : le rail n'affiche que sa section active, donc le tableau des 52
 * vagues n'y a jamais été. Ce qui part rendu, c'est le bloc et ses quatre entrées
 * avec leurs comptes.
 *
 * C'est aussi ce qui décide de la forme de la page : /donjons est désormais un
 * composant SERVEUR qui lit les vagues et les passe à un composant client. Un
 * « use client » ne peut pas ouvrir un fichier, et bundler ces 12 Ko dans le
 * paquet du navigateur aurait annulé tout ce qui précède.
 *
 * À savoir quand même : le tableau se filtre, donc les vagues descendent bien au
 * navigateur. Ce qu'on évite, c'est un second aller-retour et un fichier de plus
 * dans le paquet, pas le poids lui-même.
 *
 * DEUX SOURCES, ET IL FAUT SAVOIR LAQUELLE PARLE :
 *   · la structure du tour — les 52 vagues, les quantités, le multiplicateur, la
 *     prime — vient d'un RELEVÉ MAISON fait sur captures d'écran. Le client ne la
 *     porte pas : sa carte est une arène vide, le serveur pilote tout ;
 *   · les caractéristiques de chaque monstre — nom français, niveau, PV, dégâts —
 *     viennent de la table des monstres du client.
 * D'où les réserves affichées dans le bloc : ce qui vient du relevé n'est pas
 * vérifiable dans les fichiers.
 */
let CACHE: Vague[] | null = null;

export function vagues(): Vague[] {
  if (CACHE) return CACHE;
  const f = path.join(process.cwd(), "public", "wiki", "oasis-vagues.json");
  try {
    const d = JSON.parse(fs.readFileSync(f, "utf8")) as { vagues: Vague[] };
    CACHE = d.vagues.sort((a, b) => a.n - b.n);
  } catch {
    // Un fichier absent ne doit pas rendre la page inaccessible : le reste — les
    // 23 donjons, la Tour Oubliée, la mécanique, les emblèmes, les réserves —
    // vaut d'être lu sans le tableau.
    CACHE = [];
  }
  return CACHE;
}
