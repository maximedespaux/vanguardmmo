import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// POST /api/worldboss/[eventId]/participate  { status: "CONFIRMED" | "DECLINED" }
export async function POST(req: Request, context: { params: Promise<{ eventId: string }> }) {
  const params = await context.params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;

  const { status } = await req.json();
  if (!["CONFIRMED", "DECLINED"].includes(status))
    return NextResponse.json({ error: "statut invalide" }, { status: 400 });

  await prisma.eventParticipant.upsert({
    where: { eventId_discordId: { eventId: params.eventId, discordId: auth.user.discordId } },
    update: { status },
    create: { eventId: params.eventId, discordId: auth.user.discordId, username: auth.user.username, status },
  });
  return NextResponse.json({ ok: true });
}
