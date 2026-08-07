import { redirect } from "next/navigation";

/**
 * L'ancienne page d'une requête, seule au milieu de l'écran.
 *
 * Elle montrait la même conversation que « Mes demandes & messages », mais sans
 * la liste à gauche : en arrivant par une notification, on perdait tout le
 * contexte — les autres demandes, leur état, ce qui reste à faire. On garde
 * l'adresse (elle circule dans les notifications et les messages Discord) et on
 * l'envoie sur la boîte, conversation déjà ouverte.
 */
export default async function RequetePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/messages?fil=req:${id}`);
}
