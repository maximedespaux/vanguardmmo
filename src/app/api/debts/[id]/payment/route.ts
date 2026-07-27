import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin } from "@/config/roles";
import { ecrireSysteme } from "@/lib/fil";

/**
 * POST /api/debts/[id]/payment — enregistre un remboursement REÇU.  { amount, note }
 *
 * Règles décidées avec la guilde :
 *  - c'est le DÉTENTEUR de l'objet (le créancier) qui saisit ce qu'il a reçu.
 *    Auparavant c'était le débiteur qui déclarait lui-même ses remboursements,
 *    ce qui n'avait aucune valeur : il attestait de son propre paiement.
 *  - le staff peut saisir à sa place (dépannage, litige, détenteur absent) ;
 *  - uniquement sur une dette ACCEPTÉE : il n'y a rien à rembourser avant l'accord.
 *
 * Chaque remboursement laisse trace en TROIS endroits, pour que le suivi se
 * retrouve partout : le site, le post de décision Discord de la requête, et un
 * message privé au débiteur.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;

  const debt = await prisma.debt.findUnique({
    where: { id: params.id },
    include: { payments: true, user: { select: { discordId: true, username: true } } },
  });
  if (!debt) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  // Qui a le droit : le créancier (détenteur — comparé au pseudo) ou le staff.
  const moi = (auth.user.username ?? "").trim().toLowerCase();
  const creancier = (debt.creditor ?? "").trim().toLowerCase();
  const estCreancier = !!creancier && creancier === moi;
  const estStaff = canAccessAdmin(auth.user.role);
  if (!estCreancier && !estStaff) {
    return NextResponse.json(
      { error: "Seul le détenteur de l'objet (ou le staff) enregistre un remboursement reçu." },
      { status: 403 }
    );
  }
  if (debt.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Cette dette n'est pas acceptée : il n'y a rien à rembourser." },
      { status: 409 }
    );
  }

  const b = await req.json().catch(() => ({}));
  const montant = BigInt(Math.max(0, Math.floor(Number(b.amount) || 0)));
  if (montant <= 0n) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });

  const dejaPaye = debt.payments.reduce((s, p) => s + p.amount, 0n);

  await prisma.debtPayment.create({
    data: { debtId: debt.id, amount: montant, note: b.note ?? null, recordedBy: auth.user.username ?? null },
  });

  // Solde : si le total couvre la dette, elle passe en remboursée.
  const paye = dejaPaye + montant;
  const soldee = debt.amount > 0n && paye >= debt.amount;
  if (soldee) await prisma.debt.update({ where: { id: debt.id }, data: { status: "REPAID" } });

  const reste = debt.amount > paye ? debt.amount - paye : 0n;
  const fmt = (n: bigint) => Number(n).toLocaleString("fr-FR");
  const objet = debt.item ?? "un objet";
  const detenteur = debt.creditor ?? "Le détenteur";

  // ── Trace 1 : notification sur le site, pour le débiteur ──────────────────
  // Un échec ici ne doit jamais annuler le remboursement déjà enregistré.
  await prisma.notification
    .create({
      data: {
        userId: debt.userId,
        type: "DEBT_PAYMENT",
        title: soldee ? "Dette soldée" : "Remboursement enregistré",
        body: soldee
          ? `${detenteur} a enregistré ton dernier remboursement pour « ${objet} ». Ta dette est soldée.`
          : `${detenteur} a enregistré ${fmt(montant)} périns pour « ${objet} ». Reste ${fmt(reste)} périns.`,
        link: `/messages?fil=debt:${debt.id}`,
      },
    })
    .catch(() => null);

  // ── Trace 2 : le fil de la dette ────────────────────────────────────────
  // Discord est coupé. Le fil devient l'historique consultable : qui a saisi
  // quoi, quand, et ce qu'il reste. Le détail chiffré compte — « remboursement
  // enregistré » sans montant obligerait à recouper avec la liste.
  await ecrireSysteme(
    debt.id,
    soldee
      ? `${detenteur} a enregistré ${fmt(montant)} périns reçus de ${debt.user?.username ?? "le membre"} ` +
        `pour « ${objet} ». Total ${fmt(paye)} / ${fmt(debt.amount)} — dette soldée.` +
        (b.note ? ` Note : ${String(b.note).slice(0, 300)}` : "")
      : `${detenteur} a enregistré ${fmt(montant)} périns reçus de ${debt.user?.username ?? "le membre"} ` +
        `pour « ${objet} ». Total ${fmt(paye)} / ${fmt(debt.amount)}, reste ${fmt(reste)}.` +
        (b.note ? ` Note : ${String(b.note).slice(0, 300)}` : "")
  );

  return NextResponse.json({ ok: true, paye: Number(paye), reste: Number(reste), soldee });
}
