import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";

// GET → salons du serveur (cache rempli par le bot) pour les menus de la page Discord
export async function GET() {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const channels = await prisma.guildChannel.findMany({
    where: { type: { in: ["text", "announcement", "forum"] } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(channels);
}
