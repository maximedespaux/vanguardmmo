import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ecrireSysteme } from "@/lib/fil";

/** Un engagement au-delà de ce délai n'est plus un engagement. */
const JOURS_MAX = 180;

/**
 * POST /api/debts/[id]/engagement — le DÉBITEUR s'engage sur une date.  { dueDate }
 *
 * Règle décidée avec la guilde : quand l'objet est remis, c'est le client qui
 * donne la date à laquelle il aura remboursé le détenteur, approximativement.
 * D'où trois choix qui ne sont pas des détails :
 *
 *  - c'est le débiteur qui écrit, pas le staff : un engagement imposé n'engage
 *    personne ;
 *  - uniquement sur une dette ACCEPTÉE (rien à rembourser avant l'accord) ;
 *  - une seule fois. Laisser repousser librement sa propre échéance viderait
 *    l'engagement de son sens et rendrait tout suivi de retard inutile. Un
 *    report se négocie avec le staff, qui peut modifier la dette.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;

  const debt = await prisma.debt.findUnique({
    where: { id: params.id },
    select: {
      id: true, userId: true, amount: true, item: true, status: true,
      dueDate: true, creditor: true, channelId: true,
      user: { select: { username: true } },
    },
  });
  if (!debt) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  if (debt.userId !== auth.user.id) {
    return NextResponse.json({ error: "Seul le débiteur s'engage sur une date." }, { status: 403 });
  }
  if (debt.status !== "ACCEPTED") {
    return NextResponse.json({ error: "Cette dette n'est pas acceptée." }, { status: 409 });
  }
  if (debt.dueDate) {
    return NextResponse.json(
      { error: "Tu t'es déjà engagé sur une date. Pour la décaler, passe par le staff." },
      { status: 409 }
    );
  }

  const b = await req.json().catch(() => ({}));
  const date = new Date(String(b.dueDate ?? ""));
  if (isNaN(date.getTime())) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  // On compare en fin de journée : s'engager pour aujourd'hui reste valable.
  const finDuJour = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  if (finDuJour.getTime() < Date.now()) {
    return NextResponse.json({ error: "La date doit être aujourd'hui ou plus tard." }, { status: 400 });
  }
  const maxi = Date.now() + JOURS_MAX * 24 * 3600_000;
  if (finDuJour.getTime() > maxi) {
    return NextResponse.json({ error: `Choisis une date dans les ${JOURS_MAX} prochains jours.` }, { status: 400 });
  }

  await prisma.debt.update({ where: { id: debt.id }, data: { dueDate: finDuJour } });

  const quand = finDuJour.toLocaleDateString("fr-FR");
  const objet = debt.item ?? "un objet";
  const detenteur = debt.creditor ?? "le détenteur";
  const montant = Number(debt.amount).toLocaleString("fr-FR");

  // Discord est coupé : l'engagement s'inscrit dans le fil de la dette, où le
  // détenteur et le staff le retrouvent. C'est ce fil qui remplace le post de
  // décision — sans lui, l'engagement ne laisserait aucune trace consultable.
  await ecrireSysteme(
    debt.id,
    `${debt.user?.username ?? "Le membre"} s'engage à rembourser ${detenteur} pour « ${objet} » ` +
      `(${montant} périns) au plus tard le ${quand}.`
  );

  // Trace sur le site, visible par le débiteur dans ses notifications.
  await prisma.notification
    .create({
      data: {
        userId: debt.userId,
        type: "DEBT_DUEDATE",
        title: "Engagement enregistré",
        body: `Tu t'es engagé à rembourser ${detenteur} pour « ${objet} » avant le ${quand}.`,
        link: "/dettes",
      },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true, dueDate: finDuJour.toISOString() });
}
