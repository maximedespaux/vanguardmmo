// Registre central : ajoute ici chaque nouvelle commande.
import * as aide from "./aide.js";
import * as mesperso from "./mesperso.js";
import * as coffre from "./coffre.js";
import * as absence from "./absence.js";
import * as dette from "./dette.js";
import * as dettePayer from "./dette-payer.js";
import * as detteSupprimer from "./dette-supprimer.js";
import * as dettes from "./dettes.js";
import * as rolereaction from "./rolereaction.js";
import * as candidature from "./candidature.js";
import * as panneauClasses from "./panneau-classes.js";
import * as boutonrole from "./boutonrole.js";
import * as embed from "./embed.js";
import * as giveaway from "./giveaway.js";

export const commands = [
  aide, mesperso, coffre, absence,
  dette, dettePayer, dettes, detteSupprimer,
  rolereaction, boutonrole, panneauClasses,
  candidature, embed, giveaway,
];
