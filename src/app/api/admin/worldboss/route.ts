import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

async function guard() {
  const auth = await apiAuth();
  if ("error" in auth) return { err: auth.error };
  if (!canAccessAdmin(auth.user.role)) return { err: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { user: auth.user };
}

// GET /api/admin/worldboss — bosses + tous les événements
export async function GET() {
  const g = await guard();
  if ("err" in g) return g.err;
  const [bosses, events] = await Promise.all([
    prisma.worldBoss.findMany({ orderBy: { name: "asc" } }),
    prisma.worldBossEvent.findMany({ include: { boss: true, participants: true }, orderBy: { startAt: "asc" } }),
  ]);
  return NextResponse.json({ bosses, events });
}

// POST /api/admin/worldboss — actions  { action, ... }
export async function POST(req: Request) {
  const g = await guard();
  if ("err" in g) return g.err;
  const b = await req.json();

  switch (b.action) {
    case "createBoss": {
      const boss = await prisma.worldBoss.create({
        data: { name: b.name, zone: b.zone ?? null, recommendedLevel: b.recommendedLevel ?? null,
          spawnInfo: b.spawnInfo ?? null, rewards: b.rewards ?? null, strategy: b.strategy ?? null, icon: b.icon ?? null },
      });
      await audit(g.user.username, "worldboss.createBoss", boss.id, b.name);
      return NextResponse.json(boss);
    }
    case "createEvent": {
      if (!b.bossId || !b.startAt) return NextResponse.json({ error: "bossId et startAt requis" }, { status: 400 });
      const ev = await prisma.worldBossEvent.create({
        data: { bossId: b.bossId, startAt: new Date(b.startAt), channelId: b.channelId ?? null, note: b.note ?? null },
      });
      await audit(g.user.username, "worldboss.createEvent", ev.id);
      return NextResponse.json(ev);
    }
    case "setStatus": {
      if (!b.id || !["PLANNED", "ONGOING", "DONE", "CANCELLED"].includes(b.status))
        return NextResponse.json({ error: "id/statut invalide" }, { status: 400 });
      const ev = await prisma.worldBossEvent.update({ where: { id: b.id }, data: { status: b.status } });
      await audit(g.user.username, `worldboss.${b.status}`, b.id);
      return NextResponse.json(ev);
    }
    case "deleteEvent": {
      await prisma.worldBossEvent.delete({ where: { id: b.id } });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  }
}
