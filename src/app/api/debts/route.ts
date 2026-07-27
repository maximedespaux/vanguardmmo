import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { sansBigInt } from "@/lib/json";

// Sérialise les BigInt (amount, caution, versements) en nombres pour le JSON.
// Champ par champ, `caution` avait été oubliée : la route répondait 500 dès
// qu'une dette existait, et la page affichait « Aucune dette » sans un mot.
const ser = <T>(d: T) => sansBigInt(d);

// GET /api/debts — les dettes de l'utilisateur courant
export async function GET() {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  // On renvoie DEUX ensembles : mes dettes (je suis débiteur) ET celles dont je
  // suis le détenteur/créancier. Sans le second, un détenteur ne verrait jamais
  // les dettes qu'il est censé suivre, et ne pourrait donc rien enregistrer.
  const pseudo = (auth.user.username ?? "").trim();
  const debts = await prisma.debt.findMany({
    where: pseudo
      ? { OR: [{ userId: auth.user.id }, { creditor: { equals: pseudo, mode: "insensitive" } }] }
      : { userId: auth.user.id },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      user: { select: { username: true } }, // qui doit l'argent, pour la vue détenteur
    },
    orderBy: { createdAt: "desc" },
  });
  // `role` distingue les deux vues côté interface sans qu'elle ait à comparer les pseudos.
  return NextResponse.json(
    debts.map((d) => ({
      ...ser(d),
      debtorName: d.user?.username ?? null,
      role: d.userId === auth.user.id ? "debiteur" : "detenteur",
    }))
  );
}

// POST /api/debts — créer une demande de dette/prêt  { type, amount, item, reason, dueDate, characterName, creditor }
export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const b = await req.json();
  const debt = await prisma.debt.create({
    data: {
      userId: auth.user.id,
      type: b.type ?? "PENYA",
      amount: BigInt(Math.max(0, Math.floor(Number(b.amount) || 0))),
      item: b.item ?? null,
      reason: b.reason ?? null,
      creditor: b.creditor ?? null,
      characterName: b.characterName ?? null,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      status: "PENDING_VALIDATION",
    },
  });
  return NextResponse.json(ser(debt));
}
