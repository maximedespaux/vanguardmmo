import { Shell } from "@/components/Shell";
import { requireVerified } from "@/lib/access";

/**
 * Niveau intermédiaire : membre du serveur Discord, pas forcément de la guilde.
 * Sert au builder — la candidature demande un build, un candidat doit donc
 * pouvoir en créer un. Les groupes de routes n'apparaissent pas dans l'URL :
 * /builder reste /builder.
 */
export default async function VerifiedLayout({ children }: { children: React.ReactNode }) {
  await requireVerified();
  return <Shell>{children}</Shell>;
}
