import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard — chiffres de la guilde + priorités intelligentes.
// Lit uniquement les modèles existants (aucune migration requise).
export async function GET() {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;

  // Requêtes en parallèle
  const [
    users,
    characters,
    buildsCount,
    classGroups,
    roleGroups,
    debts,
    absences,
    coffre,
    applications,
    wbEvents,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, username: true, isActive: true, role: true,
        characters: { select: { id: true, isMain: true, _count: { select: { gearProfiles: true } } } },
      },
    }),
    prisma.character.findMany({ select: { id: true, name: true, isMain: true, userId: true, _count: { select: { gearProfiles: true } } } }),
    prisma.gearProfile.count(),
    prisma.character.groupBy({ by: ["class"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.debt.findMany({ select: { id: true, amount: true, status: true } }),
    prisma.absence.findMany({ select: { id: true, status: true, startDate: true, endDate: true } }),
    prisma.coffreItem.findMany({ select: { item: true, stockTotal: true, target: true } }),
    prisma.application.findMany({ select: { id: true, status: true, createdAt: true } }),
    prisma.worldBossEvent.findMany({ where: { status: { in: ["PLANNED", "ONGOING"] } }, select: { id: true, startAt: true }, orderBy: { startAt: "asc" } }),
  ]);

  const now = new Date();

  // ── Membres ──
  const membersTotal = users.length;
  const membersActive = users.filter((u) => u.isActive).length;
  const membersInactive = membersTotal - membersActive;

  // ── Personnages ──
  const charsTotal = characters.length;
  const mains = characters.filter((c) => c.isMain).length;
  const secondaries = charsTotal - mains;
  const charsWithoutBuild = characters.filter((c) => c._count.gearProfiles === 0);

  // ── Joueurs sans personnage principal (qui ont au moins un perso) ──
  const usersNoMain = users.filter((u) => u.characters.length > 0 && !u.characters.some((c) => c.isMain));

  // ── Classes ──
  const classes = classGroups
    .map((g) => ({ classe: g.class, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  // ── Rôles ──
  const roles = roleGroups.map((g) => ({ role: g.role, count: g._count._all }));

  // ── Dettes (Debt v2) ──
  const debtsOngoing = debts.filter((t) => ["REQUESTED", "PENDING_VALIDATION", "ACCEPTED"].includes(t.status));
  const debtsRepaid = debts.filter((t) => t.status === "REPAID");
  const debtsToValidate = debts.filter((t) => t.status === "PENDING_VALIDATION");
  const debtsOngoingAmount = debtsOngoing.reduce((s, t) => s + Number(t.amount), 0);

  // ── Absences en cours ──
  const absencesActive = absences.filter(
    (a) => a.status === "APPROVED" && a.startDate <= now && a.endDate >= now
  ).length;
  const absencesPending = absences.filter((a) => a.status === "PENDING").length;

  // ── Coffre sous le seuil ──
  const coffreUnder = coffre.filter((i) => i.stockTotal < i.target);
  const coffreTop = coffreUnder
    .map((i) => ({ item: i.item, stock: i.stockTotal, target: i.target, manque: i.target - i.stockTotal }))
    .sort((a, b) => b.manque - a.manque)
    .slice(0, 5);

  // ── Candidatures en attente ──
  const appsPending = applications.filter((a) => a.status === "PENDING").length;
  const appsWaiting = applications.filter((a) => ["WAITING", "INTERVIEW"].includes(a.status)).length;

  // ── World Boss à venir ──
  const wbUpcoming = wbEvents.filter((e) => e.startAt >= now);
  const wbNext = wbUpcoming[0]?.startAt ?? null;
  const wbSoon = wbNext ? (wbNext.getTime() - now.getTime()) < 3600_000 : false; // < 1h

  // ── Moteur de priorités ──
  type Prio = { level: "haute" | "moyenne" | "basse"; label: string; count: number; href: string };
  const priorities: Prio[] = [];
  if (appsPending)
    priorities.push({ level: "haute", label: "candidature(s) en attente", count: appsPending, href: "/candidatures" });
  if (debtsToValidate.length)
    priorities.push({ level: "haute", label: "dette(s) en attente de validation", count: debtsToValidate.length, href: "/gestion-dettes" });
  if (wbSoon)
    priorities.push({ level: "haute", label: "World Boss imminent (< 1h)", count: 1, href: "/worldboss" });
  if (charsWithoutBuild.length)
    priorities.push({ level: "moyenne", label: "personnage(s) sans build", count: charsWithoutBuild.length, href: "/personnages" });
  if (usersNoMain.length)
    priorities.push({ level: "moyenne", label: "membre(s) sans personnage principal", count: usersNoMain.length, href: "/personnages" });
  if (absencesPending)
    priorities.push({ level: "moyenne", label: "absence(s) à valider", count: absencesPending, href: "/personnages" });
  if (coffreUnder.length)
    priorities.push({ level: "basse", label: "objet(s) du coffre à compléter", count: coffreUnder.length, href: "/coffre" });
  const order = { haute: 0, moyenne: 1, basse: 2 };
  priorities.sort((a, b) => order[a.level] - order[b.level]);

  return NextResponse.json({
    members: { total: membersTotal, active: membersActive, inactive: membersInactive, roles },
    characters: { total: charsTotal, mains, secondaries, withoutBuild: charsWithoutBuild.length, classes },
    builds: { total: buildsCount, withoutBuild: charsWithoutBuild.length },
    debts: { ongoing: debtsOngoing.length, repaid: debtsRepaid.length, toValidate: debtsToValidate.length, ongoingAmount: debtsOngoingAmount },
    absences: { active: absencesActive, pending: absencesPending },
    coffre: { under: coffreUnder.length, total: coffre.length, topDeficits: coffreTop },
    candidatures: { pending: appsPending, waiting: appsWaiting, total: applications.length },
    worldboss: { upcoming: wbUpcoming.length, next: wbNext },
    priorities,
  });
}
