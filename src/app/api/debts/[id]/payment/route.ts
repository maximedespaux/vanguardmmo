import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin } from "@/config/roles";
import { posterDansSalon, envoyerMP, COULEURS } from "@/lib/discord";

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
        link: "/dettes",
      },
    })
    .catch(() => null);

  // ── Trace 2 : le post de décision Discord de la requête ───────────────────
  const embed = {
    title: soldee ? "Dette soldée" : "Remboursement enregistré",
    color: soldee ? COULEURS.vert : COULEURS.orange,
    description:
      `**${debt.user?.username ?? "Le membre"}** → **${detenteur}**\n` + `Objet : **${objet}**`,
    fields: [
      { name: "Reçu", value: `${fmt(montant)} périns`, inline: true },
      { name: "Total remboursé", value: `${fmt(paye)} / ${fmt(debt.amount)}`, inline: true },
      { name: "Restant", value: soldee ? "— soldée —" : `${fmt(reste)} périns`, inline: true },
      ...(b.note ? [{ name: "Note", value: String(b.note).slice(0, 300) }] : []),
    ],
    footer: { text: `Saisi par ${auth.user.username ?? "?"}` },
    timestamp: new Date().toISOString(),
  };
  if (debt.channelId) await posterDansSalon(debt.channelId, { embeds: [embed] });

  // ── Trace 3 : message privé au débiteur ──────────────────────────────────
  if (debt.user?.discordId) {
    await envoyerMP(debt.user.discordId, {
      embeds: [
        {
          title: soldee ? "Ta dette est soldée" : "Ton remboursement a été enregistré",
          color: soldee ? COULEURS.vert : COULEURS.orange,
          description: soldee
            ? `**${detenteur}** a enregistré ton dernier remboursement pour « ${objet} ». Tout est réglé, merci !`
            : `**${detenteur}** a enregistré **${fmt(montant)} périns** pour « ${objet} ».\n` +
              `Il te reste **${fmt(reste)} périns** à rembourser.`,
          footer: { text: "Vanguard · suivi des dettes" },
        },
      ],
    });
  }

  return NextResponse.json({ ok: true, paye: Number(paye), reste: Number(reste), soldee });
}
