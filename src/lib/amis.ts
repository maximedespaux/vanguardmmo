import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CLE_REGLAGE_AMIS, REGLAGE_AMIS_FERME, espacesAmisDe, estAmi, lireReglageAmis,
  type EspaceOuvrable, type ReglageAmis,
} from "@/config/amis";

/**
 * LE RÉGLAGE DES AMIS, LU EN BASE — côté serveur seulement (la règle est dans config/amis.ts).
 *
 * Il est lu à chaque relecture du rang d'une session (lib/auth.ts), à chaque garde d'une
 * page ou d'une route des espaces ouverts aux amis (lib/access.ts) et par la liste des
 * bras droits : une ligne de `Setting` par requête serait une lecture pour rien, la valeur
 * changeant quelques fois par an. On la garde donc une minute ; la route qui l'écrit
 * (/api/admin/acces-amis) oublie la copie, et ce processus voit le changement aussitôt.
 */
const DUREE = 60_000;
let memoire: { v: ReglageAmis; a: number } | null = null;

export async function reglageAmis(): Promise<ReglageAmis> {
  if (memoire && Date.now() - memoire.a < DUREE) return memoire.v;
  try {
    const r = await prisma.setting.findUnique({ where: { key: CLE_REGLAGE_AMIS } });
    memoire = { v: lireReglageAmis(r?.value), a: Date.now() };
    return memoire.v;
  } catch {
    /* Base injoignable : la dernière valeur lue, sinon RIEN d'ouvert. Le défaut ouvrirait
       peut-être ce qu'un bras droit a fermé — et sans base, le reste du site tombe de
       toute façon. */
    return memoire?.v ?? REGLAGE_AMIS_FERME;
  }
}

/** Après une écriture du réglage : la prochaine lecture repasse par la base. */
export function oublierReglageAmis() {
  memoire = null;
}

/** Les espaces que le rôle Friend ouvre à ce compte, sur ses rôles Discord en base. */
export async function espacesAmisDuCompte(u: { role: Role; discordRoles: string[] }): Promise<EspaceOuvrable[]> {
  return espacesAmisDe(u.role, u.discordRoles ?? [], await reglageAmis());
}

/** Ce compte est-il un ami (hors guilde, rôle Friend) ? Pour les listes des bras droits. */
export async function estAmiDuCompte(u: { role: Role; discordRoles: string[] }): Promise<boolean> {
  return estAmi(u.role, u.discordRoles ?? [], await reglageAmis());
}
