import { Shell } from "@/components/Shell";
import { requireEspace } from "@/lib/access";

/**
 * LES PAGES D'ASTUCES QUI NE SONT PAS PUBLIQUES — ouvertes à la guilde ET aux amis.
 *
 * /objets vivait dans (guild), dont la garde est `requireGuild()` : un ami (rôle Discord
 * Friend, SPEC-INFORMATION-GUILDE §9) en aurait été refusé alors que son réglage lui ouvre
 * tout l'espace Astuces. Elle a donc son groupe, gardé par l'ESPACE plutôt que par le rang
 * — la même décision que le middleware et la barre (`peutOuvrir`, config/nav.ts). Un
 * visiteur, un candidat ou un compte sans le rôle y est refusé comme avant.
 *
 * Les autres pages d'Astuces sont publiques et vivent dans (public) ou (vitrine) ; leurs
 * routes réservées (/api/crafts, /api/ou-trouver) se gardent par `apiEspace("astuces")`.
 */
export default async function EspaceAstucesLayout({ children }: { children: React.ReactNode }) {
  await requireEspace("astuces");
  return <Shell>{children}</Shell>;
}
