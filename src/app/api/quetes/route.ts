import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { QUETE_AVEC, serialiserQuete } from "@/lib/quetes";

/**
 * Quêtes : ce dont la guilde a besoin, et qui s'en charge.
 *
 * Réservé aux membres de guilde : une quête engage quelqu'un à farmer pour un
 * autre, ça n'a pas de sens hors de la guilde.
 */
async function membre() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error };
  if (!canAccessGuild(a.user.role)) return { error: NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 }) };
  return { user: a.user };
}

export async function GET() {
  const m = await membre();
  if ("error" in m) return m.error;
  // Les quêtes closes restent visibles un temps : on veut voir que ça a bougé,
  // pas ouvrir une page vide dès que tout est livré.
  const quetes = await prisma.quete.findMany({
    where: { OR: [{ statut: { in: ["ouverte", "prise"] } }, { livreeAt: { gte: new Date(Date.now() - 14 * 864e5) } }] },
    include: QUETE_AVEC,
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
    take: 120,
  });
  return NextResponse.json(quetes.map(serialiserQuete));
}

export async function POST(req: Request) {
  const m = await membre();
  if ("error" in m) return m.error;
  const b = await req.json().catch(() => ({}));
  const titre = String(b?.titre ?? "").trim().slice(0, 120);
  if (!titre) return NextResponse.json({ error: "Dis ce dont tu as besoin." }, { status: 400 });

  const quete = await prisma.quete.create({
    data: {
      auteurId: m.user.id,
      titre,
      quantite: Math.max(1, Math.min(9999, Math.floor(Number(b?.quantite) || 1))),
      note: b?.note ? String(b.note).slice(0, 300) : null,
      itemId: Number.isFinite(Number(b?.itemId)) ? Number(b.itemId) : null,
      manque: Number.isFinite(Number(b?.manque)) ? Math.max(0, Number(b.manque)) : null,
    },
    include: QUETE_AVEC,
  });

  // Sans Discord, une quête que personne ne voit n'existe pas : on prévient la
  // guilde. Le demandeur, lui, sait déjà.
  const autres = await prisma.user.findMany({
    where: { id: { not: m.user.id }, role: { in: ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"] } },
    select: { id: true },
  });
  await prisma.notification
    .createMany({
      data: autres.map((u) => ({
        userId: u.id,
        type: "QUETE",
        title: "Nouvelle quête",
        body: `${m.user.username} cherche ${quete.quantite} × ${titre}.`,
        link: "/quetes",
      })),
    })
    .catch(() => null);

  return NextResponse.json(serialiserQuete(quete), { status: 201 });
}
