import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";

const ALLOWED = ["post_embed", "create_giveaway", "post_class_panel"];

// GET → 20 dernières commandes (suivi de statut)
export async function GET() {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const cmds = await prisma.botCommand.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json(cmds);
}

const validUrl = (u: any): boolean => typeof u === "string" && /^https?:\/\//i.test(u);

// POST → enfile une commande pour le bot (après validation stricte)
export async function POST(req: Request) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const b = await req.json();
  if (!ALLOWED.includes(b?.type)) return NextResponse.json({ error: "type invalide" }, { status: 400 });
  const payload = b.payload ?? {};

  // Salon : doit exister dans le cache du serveur ET être postable (anti-IDOR : pas de salon forgé)
  const chan = payload.channelId ? await prisma.guildChannel.findUnique({ where: { id: String(payload.channelId) } }) : null;
  if (!chan || !["text", "announcement"].includes(chan.type))
    return NextResponse.json({ error: "Salon invalide ou non postable." }, { status: 400 });

  if (b.type === "post_embed") {
    if (!payload.title && !payload.description && !payload.image)
      return NextResponse.json({ error: "Donne au moins un titre, une description ou une image." }, { status: 400 });
    if (payload.image && !validUrl(payload.image)) return NextResponse.json({ error: "URL d'image invalide (http/https)." }, { status: 400 });
    if (payload.thumbnail && !validUrl(payload.thumbnail)) return NextResponse.json({ error: "URL de vignette invalide." }, { status: 400 });
  }
  if (b.type === "create_giveaway") {
    if (!payload.prize) return NextResponse.json({ error: "Lot requis." }, { status: 400 });
    const d = Number(payload.durationMs);
    if (!Number.isFinite(d) || d < 60_000 || d > 30 * 86_400_000) return NextResponse.json({ error: "Durée invalide (1 min à 30 jours)." }, { status: 400 });
    const w = Math.floor(Number(payload.winnersCount ?? 1));
    if (!Number.isInteger(w) || w < 1 || w > 50) return NextResponse.json({ error: "Nombre de gagnants invalide (1 à 50)." }, { status: 400 });
    payload.durationMs = d; payload.winnersCount = w;
  }

  const cmd = await prisma.botCommand.create({ data: { type: b.type, payload, createdBy: a.user.username } });
  return NextResponse.json(cmd, { status: 201 });
}
