import { redirect } from "next/navigation";

/**
 * « Classes » et « Compétences » étaient deux écrans pour un seul sujet : une
 * compétence n'existe que dans la lignée qui l'apprend, et la chaîne de
 * promotion ne veut rien dire sans ce qu'elle apprend. Les deux pages sont
 * désormais /classes, avec un seul rail.
 *
 * On garde l'adresse — elle était indexée et elle a pu circuler — mais elle mène
 * à la page unique. Ses métadonnées ont suivi dans `../classes/layout.tsx`.
 */
export default function CompetencesPage() {
  redirect("/classes");
}
