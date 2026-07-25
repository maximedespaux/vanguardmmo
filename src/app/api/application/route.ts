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

  // 1bis) Reprise du build : le build complet realise pendant la candidature devient le build du compte,
  //   pour que le candidat n'ait pas a tout refaire une fois accepte.
  if (body.fullBuild && Array.isArray(body.fullBuild.chars) && body.fullBuild.chars.length) {
    try { await prisma.user.update({ where: { discordId: user.discordId }, data: { builderBlob: body.fullBuild } }); }
    catch (e) { console.error("carryover build failed", e); }
  }

  // 2) Message public dans #candidatures (webhook)
  const webhook = process.env.DISCORD_CANDIDATURES_WEBHOOK;
  if (!webhook) return NextResponse.json({ ok: true, note: "candidature enregistrée (webhook non configuré)" });

  const specLabels: Record<string, string> = { PVE: "🌾 PvE", PVP: "🏆 PvP & Boss", CS: "🗝️ Chambres Secrètes" };
  const chars = (body.chars ?? []).map((c: any) => `• **${c.name}** — ${c.cls} (P${c.prestige})`).join("\n") || "—";
  // Base publique du site : sans elle on n'affiche simplement pas le lien.
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
  const buildUrl = base && body.fullBuild && user.username
    ? `${base}/builder/${encodeURIComponent(user.username)}`
    : null;
  const embed = {
    title: `📋 Nouvelle candidature — ${user.username}`,
    description: `<@${user.discordId}> souhaite rejoindre Vanguard.`,
    color: 0xff8c1a,
    fields: [
      { name: "👥 Personnages", value: chars },
      { name: "⚡ Spécialisations", value: (body.specs ?? []).map((s: string) => specLabels[s] ?? s).join(" · ") || "—" },
      ...(body.build ? [{ name: "🛠️ Build", value: `**${body.build.name || "Perso"}** — ${body.build.className} (P${body.build.prestige})` + (body.build.stats ? "\n" + Object.entries(body.build.stats).slice(0, 5).map(([k, v]) => `${k} +${v}`).join(" · ") : "") }] : []),
      // Lien vers le build, pour que le staff l'ouvre sans le redemander.
      // On pointe la vue STAFF (/builder/<pseudo>) et non un lien public : activer
      // le partage public à la place du candidat serait une décision qui ne nous
      // appartient pas.
      ...(buildUrl ? [{ name: "🔗 Voir le build", value: `[Ouvrir le build de ${user.username}](${buildUrl})` }] : []),
      // Classes visées en Chambre Secrète sans personnage correspondant : ce n'est
      // pas un refus, mais le staff doit le savoir avant de composer une équipe.
      ...((body.classesAConstruire ?? []).length
        ? [{ name: "🚧 Classes à construire", value: `Visé en CS sans personnage existant : **${(body.classesAConstruire as string[]).join(", ")}**` }]
        : []),
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
