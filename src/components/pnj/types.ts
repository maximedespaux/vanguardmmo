/**
 * CE QUE L'ANNUAIRE DES PNJ REND À UN AUTRE ÉCRAN.
 *
 * Séparé de `annuaire.ts` exprès : ce dernier lit le disque avec `fs` et ne peut
 * donc jamais être importé par un composant client — pas même pour un type. Ce
 * découpage est celui de `components/objets/` et de `components/monstres/`.
 */

/** Comment le PNJ met l'objet à disposition. Trois natures, dans l'ordre où elles
 *  servent : ce qu'on fabrique, ce qu'on échange, ce qu'on achète. */
export type Comment = "fabrique" | "contre un jeton" | "vend";

/**
 * UN PORTEUR D'OBJET : qui l'a, à quel titre, et dans quelle ville.
 *
 * PAS DE COORDONNÉES, jamais — la fonction qui les rendait a été supprimée du site
 * exprès. Ce qui situe un PNJ, c'est la VILLE et la carte de sa région, pas un
 * couple de nombres qu'on ne peut pas saisir dans le jeu.
 */
export type Marchand = {
  cle: string;
  nom: string;
  metier: string | null;
  ville: string | null;
  comment: Comment;
  /** L'objet-monnaie exigé, quand c'est un troc. C'est la mécanique maison
   *  d'AirFlyff : on paie avec un jeton, un nucléus, une médaille. */
  monnaie?: string;
};
