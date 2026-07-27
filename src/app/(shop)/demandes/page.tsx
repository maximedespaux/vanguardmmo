import { redirect } from "next/navigation";

/**
 * « Mes demandes » et « Messages » étaient deux écrans pour une seule chose :
 * une demande EST une conversation. On garde l'adresse — elle a pu être
 * partagée — mais elle mène désormais à la page unique.
 */
export default function DemandesPage() {
  redirect("/messages");
}
