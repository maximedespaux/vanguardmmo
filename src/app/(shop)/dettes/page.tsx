import { redirect } from "next/navigation";

/**
 * Le système de dettes a été retiré (trop lourd pour ce qu'il rendait).
 * L'adresse reste vivante : elle a circulé dans des notifications et des
 * messages, et une page morte se lit comme un site cassé.
 */
export default function DettesPage() {
  redirect("/boutique");
}
