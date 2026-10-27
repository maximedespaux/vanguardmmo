// Registre central : ajoute ici chaque nouvelle commande.
import * as aide from "./aide.js";
import * as mesperso from "./mesperso.js";
import * as absence from "./absence.js";
import * as rolereaction from "./rolereaction.js";
import * as candidature from "./candidature.js";
import * as panneauClasses from "./panneau-classes.js";
import * as boutonrole from "./boutonrole.js";
import * as embed from "./embed.js";
import * as giveaway from "./giveaway.js";
// Les Chambres Secrètes (lot 3). Enregistrées par `npm run bot:deploy` : à lancer le jour de
// la bascule depuis le bot Python, pour ne pas montrer deux /chambre et deux /recensement
// aux membres (SPEC-CHAMBRES §8.10).
import * as chambre from "./chambre.js";
import * as recensement from "./recensement.js";

export const commands = [
  aide, mesperso, absence,
  rolereaction, boutonrole, panneauClasses,
  candidature, embed, giveaway,
  chambre, recensement,
];
