import { redirect } from "next/navigation";

/**
 * « Astuces de guilde » disait la même chose que /builder/mecaniques, en plus
 * long et à un seul endroit : ce que les fichiers du jeu disent d'une pièce
 * d'équipement. Un nom de gemme qui ment, un plafond de sertissage que personne
 * n'annonce, une seconde table d'équilibrage — c'est de la mécanique, pas de
 * l'actualité de guilde. Les deux pages n'en font plus qu'une.
 *
 * TOUS les faits ont été repris, rangés dans la facette qu'ils concernent, et les
 * pastilles « À confirmer en jeu » avec : rien n'a été perdu au passage.
 *
 * L'adresse reste vivante parce qu'elle a circulé — le sommaire, la page /crafts,
 * le guide public /astuces y renvoyaient, et une page morte se lit comme un site
 * cassé.
 *
 * Un changement à connaître : la page d'arrivée est PUBLIQUE là où celle-ci était
 * réservée à la guilde. C'est une décision assumée — ces faits sont extractibles
 * du client par n'importe qui, et c'est de l'avoir lu qui a de la valeur, pas de
 * l'avoir caché. Le bandeau « ne pas diffuser » n'a donc pas suivi.
 */
export default function AstucesGuildePage() {
  redirect("/builder/mecaniques");
}
