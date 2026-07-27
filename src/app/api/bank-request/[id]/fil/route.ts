import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin } from "@/config/roles";

/**
 * Fil d'une requête boutique : GET pour lire, POST pour écrire.
 *
 * Remplace le salon d'échange que le bot ouvrait pour chaque demande. Même
 * principe que le fil des dettes : la discussion et les faits enregistrés
 * cohabitent, et un message système n'a pas d'auteur.
 *
 * Accès : le demandeur et le staff. Une requête peut porter sur un objet
 * convoité — l'ouvrir à toute la guilde inviterait aux frictions.
 */
async function acces(id: string) {
  const auth = await apiAuth();
  if ("error" in auth) return { error: auth.error };
  const req = await prisma.bankRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, username: true, item: true },
  });
  if (!req) return { error: NextResponse.json({ error: "introuvable" }, { status: 404 }) };
  if (req.userId !== auth.user.id && !canAccessAdmin(auth.user.role)) {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }
  return { auth, req };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await acces(id);
  if ("error" in a) return a.error;
  return NextResponse.json(
    await prisma.requestMessage.findMany({
      where: { bankRequestId: id },
      orderBy: { createdAt: "asc" },
      take: 300,
    })
  );
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await acces(id);
  if ("error" in a) return a.error;

  const b = await req.json().catch(() => ({}));
  const texte = String(b?.body ?? "").trim().slice(0, 2000);
  if (!texte) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  await prisma.requestMessage.create({
    data: {
      bankRequestId: id,
      userId: a.auth.user.id,
      author: a.auth.user.username ?? "?",
      kind: "chat",
      body: texte,
    },
  });

  // Sans Discord, la notification du site est le seul signal. Le staff écrit au
  // demandeur ; le demandeur écrit au staff, qu'on prévient en bloc — on ne sait
  // pas qui traitera la demande, la prévenir nominativement serait un pari.
  if (a.req.userId !== a.auth.user.id) {
    await prisma.notification
      .create({
        data: {
          userId: a.req.userId,
          type: "REQ_MESSAGE",
          title: "Réponse sur ta demande",
          body: `${a.auth.user.username ?? "Le staff"} t'a répondu à propos de « ${a.req.item ?? "ta demande"} ».`,
          link: "/dettes",
        },
      })
      .catch(() => null);
  } else {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER"] } },
      select: { id: true },
    });
    await prisma.notification
      .createMany({
        data: staff.map((s) => ({
          userId: s.id,
          type: "REQ_MESSAGE",
          title: "Message sur une demande",
          body: `${a.req.username} a écrit à propos de « ${a.req.item ?? "sa demande"} ».`,
          link: "/gestion-dettes",
        })),
      })
      .catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
