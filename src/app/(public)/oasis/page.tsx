import { redirect } from "next/navigation";

/**
 * « Protection de l'Oasis » et « Donjons » étaient deux pages pour une seule
 * question : dans quoi est-ce que j'entre, et qu'est-ce qui m'y attend ? Le mode
 * est désormais le troisième bloc de /donjons, après les 23 donjons du téléporteur
 * et les 5 étages de la Tour Oubliée — entier, ses 52 vagues comprises.
 *
 * On garde l'adresse : elle a pu être partagée, et elle était indexée. L'ancre
 * `#oasis` mène directement au bloc et l'ouvre — sans elle, on atterrirait en haut
 * d'une page de donjons en ayant demandé l'Oasis, ce qui se lit comme un lien
 * cassé.
 */
export default function OasisPage() {
  redirect("/donjons#oasis");
}
