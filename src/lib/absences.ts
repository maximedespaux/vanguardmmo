import type { PrismaClient } from "@prisma/client";
import { ADMIN_ROLES } from "@/config/roles";

/**
 * « LE STAFF EST PRÉVENU » — la page l'affirmait, et personne ne l'était.
 *
 * Deux chemins créent une absence : la page /absences et la commande /absence
 * du bot. Les deux appellent cette fonction, pour que le staff l'apprenne de la
 * même façon quelle que soit la porte, avec la même phrase.
 *
 * UNE NOTIFICATION SUR LE SITE, PAS DE MP. `prevenirStaff` (l'ancien lib/ventes.ts,
 * parti avec la Boutique) doublait chaque notification d'un MP Discord : ce serait
 * un MP par absence et par bras droit, pour un fait qui n'appelle aucun geste
 * immédiat. La cloche suffit.
 *
 * LE CLIENT PRISMA EST PASSÉ EN PARAMÈTRE : le bot importe ce fichier sous tsx,
 * hors de Next, et a déjà le sien (bot/lib/prisma.ts). D'où aussi l'absence de
 * tout import de next/*, de next-auth ou de @/lib/access ici.
 *
 * Le statut de l'absence n'est pas touché : savoir si elle se valide ou se
 * déclare seulement est une question encore ouverte pour Maxime.
 */
export async function prevenirAbsence(
  db: PrismaClient,
  absence: { userId: string; startDate: Date; endDate: Date; reason: string | null },
  nom: string,
): Promise<void> {
  // UTC : une date du formulaire (« 2026-06-12 ») est minuit UTC ; formatée à
  // l'heure de Paris un serveur décalé la ferait reculer d'un jour.
  const jour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const raison = absence.reason?.trim();
  try {
    const staff = await db.user.findMany({
      where: { role: { in: ADMIN_ROLES }, id: { not: absence.userId } },
      select: { id: true },
    });
    if (!staff.length) return;
    await db.notification.createMany({
      data: staff.map((s) => ({
        userId: s.id,
        type: "absence",
        title: "Absence déclarée",
        body: `${nom} sera absent(e) du ${jour(absence.startDate)} au ${jour(absence.endDate)}${raison ? ` — ${raison}` : ""}.`,
        // Son dossier, ouvert sur l'onglet Absences : le tableau de bord des bras droits
        // lit ?dossier= et ?onglet= (les anciennes alertes /guildviewer?dossier= y
        // redirigent avec leur requête, next.config.js).
        link: `/staff?section=absences&dossier=${absence.userId}&onglet=absences`,
      })),
    });
  } catch {
    /* L'absence est enregistrée ; une alerte manquée ne doit pas la faire échouer. */
  }
}
