import { Shell } from "@/components/Shell";
import { requireAuth } from "@/lib/access";
// Boutique : accessible à TOUT membre connecté (Discord), y compris hors guilde.
// Le catalogue exige donc une connexion (requireAuth redirige les visiteurs anonymes),
// mais pas un rôle de guilde — les non-membres voient le prix public.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(); // redirige vers /login si non connecté
  return <Shell>{children}</Shell>;
}
