import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";

/**
 * Le journal du staff : qui demande, qui aide, et dans quel ordre.
 *
 * Ce qu'il sert à voir : quelqu'un qui demande beaucoup et ne rend jamais. Ça
 * ne se lit pas sur une page de demandes — il faut mettre côte à côte ce qui
 * est PRIS et ce qui est DONNÉ, par personne, dans le temps. Sans ça, un abus
 * se remarque au feeling, six mois trop tard.
 *
 * Rien n'est calculé ici qui ne soit déjà écrit ailleurs : on relit les mêmes
 * journaux (demandes, apports, décisions), on les met dans le même ordre.
 */
export type LigneJournal = {
  id: string;
  quand: string;
  type: "demande" | "apport" | "decision";
  qui: string;
  quoi: string;
  /** Chiffre marquant de la ligne (quantité apportée). */
  valeur: number | null;
};

export async function GET(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const membre = new URL(req.url).searchParams.get("membre")?.trim() ?? "";

  const [demandes, apports, audits, comptes] = await Promise.all([
    prisma.bankRequest.findMany({
      where: membre ? { username: { contains: membre, mode: "insensitive" } } : {},
      select: { id: true, username: true, item: true, quantity: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 150,
    }),
    /* L'XP tenait ce rôle : elle a été retirée. Ce qui reste — et qui mesurait
       la même chose en plus concret — ce sont les apports confirmés : untel a
       ramené tant, et quelqu'un a constaté l'avoir reçu. */
    prisma.queteContribution.findMany({
      where: { statut: "confirme" },
      orderBy: { confirmeAt: "desc" }, take: 150,
      select: { id: true, userId: true, quantite: true, confirmeAt: true, createdAt: true, quete: { select: { titre: true } } },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
    prisma.user.findMany({ select: { id: true, username: true } }),
  ]);

  const nom = (id: string) => comptes.find((c) => c.id === id)?.username ?? "?";
  const gardeMembre = (n: string) => !membre || n.toLowerCase().includes(membre.toLowerCase());

  const lignes: LigneJournal[] = [
    ...demandes.map((d) => ({
      id: `req:${d.id}`, quand: d.createdAt.toISOString(), type: "demande" as const, qui: d.username,
      quoi: `demande ${d.quantity} × ${d.item ?? "?"} — ${d.status.toLowerCase()}`,
      valeur: null,
    })),
    ...apports.filter((x) => gardeMembre(nom(x.userId))).map((x) => ({
      id: `app:${x.id}`, quand: (x.confirmeAt ?? x.createdAt).toISOString(), type: "apport" as const, qui: nom(x.userId),
      quoi: `a livré ${x.quantite} × ${x.quete.titre}`, valeur: x.quantite,
    })),
    ...audits.filter((l) => gardeMembre(l.actor ?? "")).map((l) => ({
      id: `aud:${l.id}`, quand: l.createdAt.toISOString(), type: "decision" as const, qui: l.actor ?? "staff",
      quoi: `${l.action}${l.detail ? ` — ${l.detail}` : ""}`, valeur: null,
    })),
  ].sort((x, y) => y.quand.localeCompare(x.quand)).slice(0, 300);

  // Le tableau qui répond à la question posée : qui prend plus qu'il ne donne.
  // Les apports mesurent ce qui est DONNÉ, le nombre de demandes ce qui est
  // PRIS. Les deux côte à côte suffisent à repérer un déséquilibre — c'est ce
  // qu'on regardait, pas un solde à la virgule près.
  const parMembre = comptes
    .map((c) => ({
      nom: c.username,
      donne: apports.filter((x) => x.userId === c.id).reduce((s, x) => s + x.quantite, 0),
      demandes: demandes.filter((d) => d.username === c.username).length,
    }))
    .filter((m) => m.donne || m.demandes)
    .sort((m, n) => m.donne - m.demandes * 100 - (n.donne - n.demandes * 100));

  return NextResponse.json({ lignes, parMembre });
}
