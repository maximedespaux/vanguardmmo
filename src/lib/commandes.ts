/**
 * UNE COMMANDE À LA FOIS — la règle, et les étapes qu'elle traverse.
 *
 * Ce fichier existe pour que le serveur et l'écran disent la même chose. La
 * règle vivait dans la route : l'écran ne la connaissait pas, proposait donc
 * « Commander », et n'apprenait le refus qu'après l'envoi. Une règle qu'on
 * découvre en la heurtant n'est pas une règle, c'est un piège.
 */

/** Vivante tant qu'elle n'a pas été remise, refusée ou abandonnée. */
export const STATUTS_OUVERTS = ["PENDING", "ACCEPTE_ACHAT", "ACCEPTE_DETTE", "EN_ECHANGE"];

export const estOuverte = (statut: string) => STATUTS_OUVERTS.includes(statut);

/** Après un ABANDON, le temps d'attente avant d'en rouvrir une. */
export const DELAI_APRES_ABANDON = 5 * 60_000;

/**
 * Le chemin d'une commande, du clic à la remise.
 *
 * Il existait déjà en base — détenteurs qui se proposent, celui qu'on retient,
 * le prix, le rendez-vous, la remise — mais nulle part on ne voyait OÙ on en
 * était. On lisait un statut technique (« EN_ECHANGE ») sans savoir s'il
 * restait une étape ou quatre.
 */
export const ETAPES = [
  { clef: "demande", titre: "Demande envoyée", quoi: "Le staff et les détenteurs sont prévenus." },
  { clef: "detenteur", titre: "Qui fournit", quoi: "Un détenteur se propose et prend la commande." },
  { clef: "prix", titre: "Prix convenu", quoi: "Le tarif se discute dans le fil, puis se confirme." },
  { clef: "rdv", titre: "Rendez-vous", quoi: "Une date, une heure — ou « je suis en ligne »." },
  { clef: "remis", titre: "Objet remis", quoi: "La transaction est close." },
] as const;

export type Etape = (typeof ETAPES)[number]["clef"];

/** Où en est cette commande, d'après ce que la base sait d'elle. */
export function etapeDe(d: {
  status: string;
  detenteurId?: string | null;
  prixFinal?: unknown;
  rendezVous?: unknown;
  rendezVousOk?: boolean | null;
}): Etape {
  if (d.status === "REMIS") return "remis";
  if (d.rendezVousOk || d.rendezVous) return "rdv";
  if (d.prixFinal != null) return "prix";
  if (d.detenteurId) return "detenteur";
  return "demande";
}

export const indexEtape = (e: Etape) => ETAPES.findIndex((x) => x.clef === e);
