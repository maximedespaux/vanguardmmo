import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// GET /api/worldboss — bosses + événements à venir, avec participants
export async function GET() {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;

  const events = await prisma.worldBossEvent.findMany({
    where: { status: { in: ["PLANNED", "ONGOING"] } },
    include: { boss: true, participants: true },
    orderBy: { startAt: "asc" },
  });

  const me = auth.user.discordId;
  const data = events.map((e) => ({
    id: e.id,
    boss: e.boss,
    startAt: e.startAt,
    status: e.status,
    note: e.note,
    confirmed: e.participants.filter((p) => p.status === "CONFIRMED").length,
    declined: e.participants.filter((p) => p.status === "DECLINED").length,
    participants: e.participants.filter((p) => p.status === "CONFIRMED").map((p) => p.username),
    myStatus: e.participants.find((p) => p.discordId === me)?.status ?? null,
  }));
  return NextResponse.json(data);
}
