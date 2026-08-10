import { Shell } from "@/components/Shell";
import { requireGuild } from "@/lib/access";
/**
 * L'ÉCONOMIE EST RÉSERVÉE À LA GUILDE.
 *
 * Elle a été ouverte un temps à tout membre du serveur Discord, prix public
 * affiché pour les non-membres. Ce n'est plus le choix : un Recrue est un
 * visiteur, pas un membre. Le stock commun, les commandes et les conversations
 * qui vont avec sont la vie interne de la guilde — il n'y a rien à y faire tant
 * qu'on n'en est pas.
 *
 * Ce garde ne protège que les PAGES. Les routes /api de la boutique portent le
 * leur (apiGuild) : sans cela, la porte se ferme et la fenêtre reste ouverte.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireGuild();
  return <Shell>{children}</Shell>;
}
