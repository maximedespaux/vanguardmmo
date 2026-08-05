import { Shell } from "@/components/Shell";
import { requireVerified } from "@/lib/access";
// Boutique : ouverte à tout membre du SERVEUR Discord, y compris hors guilde —
// les non-membres de guilde voient le prix public. Depuis que la connexion d'un
// non-membre est refusée (lib/auth.ts), « connecté » et « vérifié » désignent
// la même chose : on garde requireVerified, qui dit l'exigence réelle.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  await requireVerified(); // redirige vers /login si non connecté
  return <Shell>{children}</Shell>;
}
