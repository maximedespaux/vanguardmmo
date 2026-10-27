import { Shell } from "@/components/Shell";
import { requireGuild } from "@/lib/access";
/**
 * LES AFFAIRES DU MEMBRE SONT RÉSERVÉES À LA GUILDE.
 *
 * Le groupe portait la Boutique, ses commandes et ses conversations ; elles ont
 * quitté le site le 2026-10-21. Il ne reste que /profil : un Recrue est un visiteur,
 * pas un membre, et il n'a pas de profil de guilde à consulter.
 *
 * Ce garde ne protège que les PAGES. /api/profil porte le sien : sans cela, la
 * porte se ferme et la fenêtre reste ouverte.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireGuild();
  return <Shell>{children}</Shell>;
}
