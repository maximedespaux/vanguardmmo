/**
 * LA REPRISE DE L'HISTORIQUE DU BOT PYTHON, EN BASE (SPEC-CHAMBRES-RECENSEMENT §8.10 ; lot 10) —
 * ce que `scripts/importer-dracarys.ts` écrit, séance par séance, d'après ce que
 * lib/import-dracarys.ts a lu et décidé. Séparé du script pour être VÉRIFIÉ sur une base en
 * mémoire (scripts/verifier-seances.ts : « lancé deux fois, il ne double rien »).
 *
 * Le client Prisma est passé en paramètre, comme partout dans seances-serveur ; pas de
 * `server-only` (piège n° 7) : le script tourne sous tsx.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { seanceCS } from "@/lib/evenements";
import type { PlanImport } from "@/lib/chambres";
import { lignesAEcrire, planDebriefDracarys, planParticipants, PAR_IMPORT_CLOTURE, type LectureDracarys, type PlanParticipants } from "@/lib/import-dracarys";
import { majSeance } from "@/lib/seances-serveur";

export type VerdictImport = { quoi: "ecrire" | "rien" | "refus" | "absent"; message: string };
export type RapportSeance = { cle: string; label: string; origine: string; debrief: VerdictImport; cloture: VerdictImport; sansCompte: string[] };

/**
 * Chaque séance du fichier : son débrief publié, puis sa clôture. `essai` : on dit ce qu'on
 * ferait, rien n'est écrit (la séance n'est même pas créée). Chaque écriture passe par
 * `majSeance`, sous le verrou de version de la séance ; la clôture n'écrit que si la séance n'a
 * pas bougé depuis la lecture qui l'a décidée (une clôture faite sur le site entre-temps gagne).
 */
export async function importerDracarys(
  db: PrismaClient, l: LectureDracarys, comptes: Map<string, { id: string; username: string }>,
  o: { essai: boolean; maintenant?: () => number },
): Promise<RapportSeance[]> {
  const now = o.maintenant ?? Date.now;
  const rapport: RapportSeance[] = [];
  const lire = (cle: string) => db.seanceGuilde.findUnique({ where: { cle }, include: { participants: { select: { pseudo: true, present: true, userId: true } } } });
  for (const sd of l.seances) {
    const s = seanceCS(sd.date, sd.creneau);
    const r: RapportSeance = {
      cle: s.cle, label: s.label, origine: sd.origine, sansCompte: [],
      debrief: { quoi: "absent", message: "aucun débrief publié dans le fichier." },
      cloture: { quoi: "absent", message: "pas de clôture dans le fichier." },
    };

    /* Le débrief publié. */
    if (sd.debrief) {
      const d = sd.debrief;
      if (o.essai) {
        const plan = planDebriefDracarys(await lire(s.cle), d, now());
        r.debrief = { quoi: plan.quoi, message: plan.message };
      } else {
        let plan: PlanImport | null = null;
        const res = await majSeance(db, s, (x) => {
          plan = planDebriefDracarys(x, d, now());
          if (plan.quoi !== "ecrire") return { ok: false, status: plan.quoi === "rien" ? 200 : 409, message: plan.message };
          const w = plan.data;
          return {
            ok: true, message: plan.message,
            patch: {
              etapes: w.etapes as unknown as Prisma.InputJsonValue, debrief: w.debrief as Prisma.InputJsonValue,
              resultat: w.resultat, aRetenir: w.aRetenir, debriefPar: w.debriefPar, debriefPublieAt: w.debriefPublieAt,
            },
          };
        });
        r.debrief = { quoi: res.ok ? "ecrire" : res.status === 200 ? "rien" : "refus", message: res.message ?? "" };
      }
    }

    /* La clôture : qui était là. */
    if (sd.cloture) {
      const lignes = lignesAEcrire(sd.cloture, comptes);
      r.sansCompte = lignes.filter((x) => !x.userId).map((x) => x.pseudo);
      const avant = await lire(s.cle);
      const plan: PlanParticipants = planParticipants(avant, lignes, sd.cloture.le, sd.date);
      if (o.essai || plan.quoi !== "ecrire") r.cloture = { quoi: plan.quoi, message: plan.message };
      else {
        const res = await majSeance(
          db, s,
          (x) => (avant && x.version !== avant.version
            ? { ok: false, status: 409, message: "La séance vient d'être modifiée sur le site : relance l'import." }
            : { ok: true, patch: { clotureAt: plan.clotureAt, cloturePar: PAR_IMPORT_CLOTURE }, message: plan.message }),
          async (tx, x) => {
            await tx.seanceParticipant.deleteMany({ where: { seanceId: x.id } });
            await tx.seanceParticipant.createMany({
              data: lignes.map((li) => ({
                seanceId: x.id, pseudo: li.pseudo, classe: li.classe, player: li.player, userId: li.userId, slotId: null,
                present: li.present, details: li.details as unknown as Prisma.InputJsonValue,
              })),
              skipDuplicates: true,
            });
          },
        );
        r.cloture = { quoi: res.ok ? "ecrire" : "refus", message: res.message ?? "" };
      }
    }
    rapport.push(r);
  }
  return rapport;
}
