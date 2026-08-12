import { redirect } from "next/navigation";

/**
 * /collections a fusionné dans /crafts.
 *
 * Les deux pages répondaient à la même question — « qu'est-ce que je peux viser,
 * et qu'est-ce que ça demande » : ce qu'on fabrique et ce qu'on collectionne sont
 * les deux faces du jeu de longue haleine. Les six volets des collections sont
 * devenus une famille du rail de /crafts, aucun n'a été perdu.
 *
 * On garde l'adresse — elle a pu circuler sur le Discord — mais elle mène
 * désormais à la page unique. Une URL morte se lit comme un site cassé.
 *
 * Les métadonnées suivent la page qui survit : elles sont dans
 * src/app/(vitrine)/crafts/page.tsx.
 *
 * POURQUOI CE FICHIER A CHANGÉ DE GROUPE. Il vivait dans (guild), dont le layout
 * appelle requireGuild() — et un layout s'exécute AVANT le redirect de la page.
 * L'ancienne adresse envoyait donc un visiteur sur /login au lieu de /crafts, qui
 * l'accueille désormais. Une redirection qui redirige ailleurs que sa destination
 * est pire qu'une adresse morte : elle fait croire à un refus. Elle suit donc sa
 * destination dans (vitrine), qui n'appelle aucun garde.
 */
export default function CollectionsPage() {
  redirect("/crafts");
}
