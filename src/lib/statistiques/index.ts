/**
 * LE CALCUL DES STATISTIQUES FINALES — la porte d'entrée.
 *
 * Trois modules, trois responsabilités :
 *   · `vocabulaire.ts`  ce qu'EST un code DST_ : absolu ou pourcentage, ce qu'il
 *                       multiplie, à quel moment il agit. Aucun fichier lu.
 *   · `tables.ts`       les cinq relevés, lus avec `fs`, indexés, gardés en
 *                       mémoire. Côté serveur uniquement.
 *   · `moteur.ts`       le calcul, pur : il reçoit les tables et rend un résultat
 *                       où CHAQUE nombre porte sa source.
 *
 * Usage courant, côté serveur :
 *
 *   import { calculer, chargerTables } from "@/lib/statistiques";
 *   const resultat = calculer(personnage, chargerTables());
 *
 * Ce que le résultat contient toujours, et pourquoi :
 *   `termes`        une ligne par nombre, avec son fichier d'origine.
 *   `absolus`       les valeurs à sommer.
 *   `pourcentages`  les taux, dans un sac SÉPARÉ — les mélanger est l'erreur
 *                   classique de ce genre de moteur.
 *   `derivees`      PV, PM, PC, défense, attaque, parade : le calcul écrit.
 *   `intervalles`   ce qui est tiré au sort ne devient pas un nombre.
 *   `trous`         ce qui n'est PAS calculé, et la raison.
 *   `hypotheses`    les décisions de lecture, pour qu'elles soient contestables.
 *   `bruts`         les codes sans libellé — comptés, pas traduits.
 */

export { calculer } from "./moteur";
export type {
  Personnage, PieceEquipee, GemmePosee, Emplacement, Rarete,
  Resultat, Terme, Cumul, Derivee, Intervalle,
} from "./moteur";
export { chargerTables, codeDe, libelleDe, clefLibelle } from "./tables";
export type { Tables, ObjetClient, FacteurClasse } from "./tables";
export {
  classer, couplesAbsoluPourcent, ATTRIBUTS, CODE_ATTRIBUT,
  ATTRIBUTS_POURCENT, ETEND, CODES_RECOMPENSE,
} from "./vocabulaire";
export type { Nature, Moment, Classement, Attribut } from "./vocabulaire";
