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
 * journaux (demandes, crédits, XP, décisions), on les met dans le même ordre.
 */
export type LigneJournal = {
  id: string;
  quand: string;
  type: "demande" | "credit" | "xp" | "decision";
  qui: string;
  quoi: string;
  /** Chiffre marquant de la ligne (coût, delta de crédits, points). */
  valeur: number | null;
};

export async function GET(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const membre = new URL(req.url).searchParams.get("membre")?.trim() ?? "";

  const [demandes, credits, xp, audits, comptes] = await Promise.all([
    prisma.bankRequest.findMany({
      where: membre ? { username: { contains: membre, mode: "insensitive" } } : {},
      select: { id: true, username: true, item: true, quantity: true, status: true, cout: true, soldeAvant: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 150,
    }),
    prisma.creditEvent.findMany({
      orderBy: { createdAt: "desc" }, take: 150,
      select: { id: true, userId: true, delta: true, motif: true, createdAt: true },
    }),
    prisma.xpEvent.findMany({
      orderBy: { createdAt: "desc" }, take: 150,
      select: { id: true, userId: true, points: true, detail: true, source: true, createdAt: true },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
    prisma.user.findMany({ select: { id: true, username: true } }),
  ]);

  const nom = (id: string) => comptes.find((c) => c.id === id)?.username ?? "?";
  const gardeMembre = (n: string) => !membre || n.toLowerCase().includes(membre.toLowerCase());

  const lignes: LigneJournal[] = [
    ...demandes.map((d) => ({
      id: `req:${d.id}`, quand: d.createdAt.toISOString(), type: "demande" as const, qui: d.username,
      quoi: `demande ${d.quantity} × ${d.item ?? "?"} — ${d.status.toLowerCase()} (solde avant : ${d.soldeAvant})`,
      valeur: -d.cout,
    })),
    ...credits.filter((c) => gardeMembre(nom(c.userId))).map((c) => ({
      id: `cred:${c.id}`, quand: c.createdAt.toISOString(), type: "credit" as const, qui: nom(c.userId),
      quoi: c.motif, valeur: c.delta,
    })),
    ...xp.filter((x) => gardeMembre(nom(x.userId))).map((x) => ({
      id: `xp:${x.id}`, quand: x.createdAt.toISOString(), type: "xp" as const, qui: nom(x.userId),
      quoi: x.detail ?? x.source, valeur: x.points,
    })),
    ...audits.filter((l) => gardeMembre(l.actor ?? "")).map((l) => ({
      id: `aud:${l.id}`, quand: l.createdAt.toISOString(), type: "decision" as const, qui: l.actor ?? "staff",
      quoi: `${l.action}${l.detail ? ` — ${l.detail}` : ""}`, valeur: null,
    })),
  ].sort((x, y) => y.quand.localeCompare(x.quand)).slice(0, 300);

  // Le tableau qui répond à la question posée : qui prend plus qu'il ne donne.
  const parMembre = comptes
    .map((c) => {
      const g = credits.filter((x) => x.userId === c.id);
      return {
        nom: c.username,
        gagnes: g.filter((x) => x.delta > 0).reduce((s, x) => s + x.delta, 0),
        depenses: g.filter((x) => x.delta < 0).reduce((s, x) => s - x.delta, 0),
        demandes: demandes.filter((d) => d.username === c.username).length,
      };
    })
    .filter((m) => m.gagnes || m.depenses || m.demandes)
    .sort((m, n) => (m.gagnes - m.depenses) - (n.gagnes - n.depenses));

  return NextResponse.json({ lignes, parMembre });
}
