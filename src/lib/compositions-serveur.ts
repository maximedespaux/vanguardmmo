/**
 * LA COMPOSITION EN BASE — écrire sans écraser l'autre (spec §5.4 ; lot 3).
 *
 * `CompositionState("main")` est un blob remplacé EN BLOC. La page le renvoie entier à chaque
 * clic ; le bot y écrit désormais lui aussi (« Je viens » et le choix du poste, depuis Discord).
 * Deux écritures qui se croisent : la seconde efface la première sans bruit. `modifierCompo`
 * relit, applique une fonction PURE (lib/evenements : `annoncer`, `retirerAnnonces`,
 * `inscrireAuPoste`), puis n'écrit que si la ligne n'a pas bougé depuis la lecture — sinon il
 * recommence sur l'état relu. La page, elle, est protégée par le correctif `lu` du PUT
 * (`fusionnerLu`, lib/compositions).
 *
 * Le client Prisma est PASSÉ EN PARAMÈTRE (le site donne `@/lib/prisma`, le bot
 * `bot/lib/prisma`) et ce module n'importe pas `server-only` (piège n° 7) : le bot le charge
 * sous tsx.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { normaliserCompo, type CompoState } from "@/lib/compositions";

type Db = PrismaClient | Prisma.TransactionClient;

/** La copie de l'état précédent, gardée à chaque écriture (même table, autre clé) : même un
 *  effacement légitime mais regretté reste rattrapable. Celle du PUT de /api/compositions. */
export const CLE_PRECEDENT = "main:precedent";

export async function sauverPrecedent(db: Db, data: unknown): Promise<void> {
  if (data === null || data === undefined) return;
  await db.compositionState
    .upsert({ where: { id: CLE_PRECEDENT }, create: { id: CLE_PRECEDENT, data: data as Prisma.InputJsonValue }, update: { data: data as Prisma.InputJsonValue } })
    .catch(() => null); // une sauvegarde ratée ne doit pas bloquer l'écriture
}

export type ResultatCompo<T> = { ok: true; valeur: T } | { ok: false; status: number; message: string };

/**
 * Applique `fn` à la composition, sous verrou optimiste sur `updatedAt`. `fn` reçoit un état
 * normalisé qu'elle MODIFIE, et rend sa valeur (ce que la réponse au joueur dira) — ou un refus
 * métier, et rien n'est écrit. Trois conflits de suite : quelqu'un écrit en rafale, 409.
 */
export async function modifierCompo<T>(
  db: PrismaClient, fn: (e: CompoState) => ResultatCompo<T>,
): Promise<ResultatCompo<T>> {
  for (let essai = 0; essai < 3; essai++) {
    const row = await db.compositionState.findUnique({ where: { id: "main" } });
    const etat = normaliserCompo(row?.data);
    const res = fn(etat);
    if (!res.ok) return res;
    const propre = normaliserCompo(etat) as unknown as Prisma.InputJsonValue; // mêmes bornes que le PUT
    if (!row) {
      try { await db.compositionState.create({ data: { id: "main", data: propre } }); return res; } catch { continue; }
    }
    // `updatedAt` est posé à la main : c'est lui que lit le verrou du prochain écrivain, et le
    // correctif `lu` de la page.
    const n = await db.compositionState.updateMany({ where: { id: "main", updatedAt: row.updatedAt }, data: { data: propre, updatedAt: new Date() } });
    if (n.count === 1) { await sauverPrecedent(db, row.data); return res; }
  }
  return { ok: false, status: 409, message: "La composition vient d'être modifiée. Réessaie." };
}
