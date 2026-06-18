import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

// POST /api/application — enregistre la candidature en base PUIS la poste dans #candidatures.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "non connecté" }, { status: 401 });
  const body = await req.json();

  // 1) Enregistrement en base (pour le suivi, l'admin et les rappels du bot)
  try {
    await prisma.application.create({
      data: {
        discordId: user.discordId,
        username: user.username,
        avatar: user.avatar ?? null,
        chars: body.chars ?? [],
        specs: body.specs ?? [],
        csChars: body.csChars ?? null,
        favClasses: body.favClasses ?? [],
        interests: body.interests ?? null,
        motivation: body.motivation ?? null,
        experience: body.experience ?? null,
        quizScore: body.quizScore ?? null,
        quizTotal: body.quizTotal ?? null,
      },
    });
  } catch (e) {
    console.error("application save failed", e);
  }

  // 2) Message public dans #candidatures (webhook)
  const webhook = process.env.DISCORD_CANDIDATURES_WEBHOOK;
  if (!webhook) return NextResponse.json({ ok: true, note: "candidature enregistrée (webhook non configuré)" });

  const specLabels: Record<string, string> = { PVE: "🌾 PvE", PVP: "🏆 PvP & Boss", CS: "🗝️ Chambres Secrètes" };
  const chars = (body.chars ?? []).map((c: any) => `• **${c.name}** — ${c.cls} (P${c.prestige})`).join("\n") || "—";
  const embed = {
    title: `📋 Nouvelle candidature — ${user.username}`,
    description: `<@${user.discordId}> souhaite rejoindre Vanguard.`,
    color: 0xff8c1a,
    fields: [
      { name: "👥 Personnages", value: chars },
      { name: "⚡ Spécialisations", value: (body.specs ?? []).map((s: string) => specLabels[s] ?? s).join(" · ") || "—" },
      { name: "🧠 Quiz", value: `${body.quizScore ?? "?"}/${body.quizTotal ?? "?"}`, inline: true },
      ...(body.build ? [{ name: "🛠️ Build", value: `**${body.build.name || "Perso"}** — ${body.build.className} (P${body.build.prestige})` + (body.build.stats ? "\n" + Object.entries(body.build.stats).slice(0, 5).map(([k, v]) => `${k} +${v}`).join(" · ") : "") }] : []),
      { name: "🎯 Intérêts", value: (body.interests ?? "—").slice(0, 1000) },
      { name: "🔥 Motivation", value: (body.motivation ?? "—").slice(0, 1000) },
      { name: "📜 Expérience", value: (body.experience ?? "—").slice(0, 1000) },
    ],
    footer: { text: "Vanguard Control Center" }, timestamp: new Date().toISOString(),
  };
  try { await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [embed] }) }); }
  catch (e) { console.error("webhook failed", e); }
  return NextResponse.json({ ok: true });
}
