import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin } from "@/config/roles";
import { ecrireMessage, lireFil } from "@/lib/fil";

/**
 * Fil d'une dette : GET pour lire, POST pour écrire.
 *
 * Qui y a accès : le débiteur, le détenteur (comparé au pseudo, comme partout
 * ailleurs sur les dettes) et le staff. Une dette est une affaire entre deux
 * personnes — l'ouvrir à toute la guilde reviendrait à afficher publiquement qui
 * doit de l'argent à qui.
 */
async function acces(id: string) {
  const auth = await apiAuth();
  if ("error" in auth) return { error: auth.error };
  const debt = await prisma.debt.findUnique({
    where: { id },
    select: { id: true, userId: true, creditor: true },
  });
  if (!debt) return { error: NextResponse.json({ error: "introuvable" }, { status: 404 }) };

  const moi = (auth.user.username ?? "").trim().toLowerCase();
  const creancier = (debt.creditor ?? "").trim().toLowerCase();
  const autorise =
    debt.userId === auth.user.id ||
    (!!creancier && creancier === moi) ||
    canAccessAdmin(auth.user.role);
  if (!autorise) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { auth, debt };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await acces(id);
  if ("error" in a) return a.error;
  return NextResponse.json(await lireFil(id));
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await acces(id);
  if ("error" in a) return a.error;

  const b = await req.json().catch(() => ({}));
  const ok = await ecrireMessage(id, a.auth.user.id, a.auth.user.username ?? "?", String(b?.body ?? ""));
  if (!ok) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  // On prévient l'AUTRE partie : sans Discord, la notification du site est le
  // seul signal qu'un message attend une réponse.
  const destinataire =
    a.debt.userId === a.auth.user.id
      ? await prisma.user.findFirst({
          where: { username: { equals: a.debt.creditor ?? "", mode: "insensitive" } },
          select: { id: true },
        })
      : { id: a.debt.userId };
  if (destinataire?.id && destinataire.id !== a.auth.user.id) {
    await prisma.notification
      .create({
        data: {
          userId: destinataire.id,
          type: "DEBT_MESSAGE",
          title: "Nouveau message sur une dette",
          body: `${a.auth.user.username ?? "Quelqu'un"} t'a écrit.`,
          link: "/dettes",
        },
      })
      .catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
