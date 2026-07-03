// ════════════════════════════════════════════════════════════
//  Logique des Giveaways (concours) : embed, bouton Participer,
//  tirage au sort, reroll. customId : "gw:join:<id>".
// ════════════════════════════════════════════════════════════
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";

const RED = 0xf87171, GREEN = 0x4ade80;

function prizeList(g: any): string[] {
  const p = Array.isArray(g.prizes) && g.prizes.length ? g.prizes : [g.prize];
  return p.map((x: string) => String(x)).filter(Boolean);
}
export function prizeText(g: any): string {
  const p = prizeList(g);
  return p.length ? p.join(" · ") : String(g.prize);
}
export function giveawayEmbed(g: any, entryCount: number): EmbedBuilder {
  const ts = Math.floor(new Date(g.endsAt).getTime() / 1000);
  const prizes = prizeList(g);
  const runColor = typeof g.embedColor === "number" ? g.embedColor : ORANGE;
  const e = new EmbedBuilder()
    .setColor(g.status === "CANCELLED" ? RED : g.status === "ENDED" ? GREEN : runColor)
    .setTitle((g.embedTitle && String(g.embedTitle).trim()) || `🎉 GIVEAWAY — ${prizes[0] ?? "?"}`)
    .setDescription(g.description ? String(g.description).replace(/\\n/g, "\n") : "Clique sur **🎉 Participer** pour tenter ta chance !");
  if (prizes.length > 1)
    e.addFields({ name: "🎁 Lots à gagner", value: prizes.map((p) => `• ${p}`).join("\n") });
  e.addFields(
    { name: "🏅 Gagnant(s)", value: String(g.winnersCount), inline: true },
    { name: "👥 Participants", value: String(entryCount), inline: true },
    { name: g.status === "RUNNING" ? "⏳ Fin" : "⏳ Terminé", value: `<t:${ts}:R>`, inline: true },
    { name: "Organisateur", value: `<@${g.hostId}>`, inline: true },
  );
  if (g.embedImage && /^https?:\/\//.test(String(g.embedImage))) e.setImage(String(g.embedImage));
  if (g.status === "ENDED")
    e.addFields({ name: "🏆 Résultat", value: g.winners?.length ? g.winners.map((id: string) => `<@${id}>`).join(", ") : "Aucun participant 😢" });
  if (g.status === "CANCELLED")
    e.addFields({ name: "Statut", value: "❌ Annulé" });
  e.setFooter({ text: `réf. ${g.id.slice(-6)}` }).setTimestamp(new Date(g.endsAt));
  return e;
}

export function giveawayButtons(g: any): ActionRowBuilder<ButtonBuilder>[] {
  if (g.status !== "RUNNING") return [];
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`gw:join:${g.id}`).setLabel("Participer").setEmoji("🎉").setStyle(ButtonStyle.Success),
  )];
}

export async function refreshGiveaway(client: Client, g: any) {
  if (!g.messageId) return;
  const count = await prisma.giveawayEntry.count({ where: { giveawayId: g.id } });
  try {
    const ch: any = await client.channels.fetch(g.channelId);
    const msg = await ch.messages.fetch(g.messageId);
    await msg.edit({ embeds: [giveawayEmbed(g, count)], components: giveawayButtons(g) });
  } catch { /* message supprimé */ }
}

function pickWinners(ids: string[], n: number): string[] {
  const pool = [...ids];
  const winners: string[] = [];
  for (let k = 0; k < n && pool.length > 0; k++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

/** Termine un giveaway : tire les gagnants, met à jour l'embed, annonce. */
export async function endGiveaway(client: Client, giveawayId: string) {
  // claim atomique : un seul appelant fait passer RUNNING → ENDED (évite le double-tirage).
  const claim = await prisma.giveaway.updateMany({ where: { id: giveawayId, status: "RUNNING" }, data: { status: "ENDED" } });
  if (claim.count !== 1) return null;
  const g = await prisma.giveaway.findUnique({ where: { id: giveawayId }, include: { entries: true } });
  if (!g) return null;
  const winners = pickWinners(g.entries.map((e) => e.discordId), g.winnersCount);
  const updated = await prisma.giveaway.update({ where: { id: g.id }, data: { winners } });
  await refreshGiveaway(client, updated);
  try {
    const ch: any = await client.channels.fetch(g.channelId);
    if (winners.length) await ch.send(`🎉 Bravo ${winners.map((id) => `<@${id}>`).join(", ")} ! Vous remportez **${prizeText(g)}** !`);
    else await ch.send(`😢 Le giveaway **${prizeText(g)}** se termine sans participant.`);
  } catch { /* ignore */ }
  return updated;
}

/** Re-tire des gagnants pour un giveaway déjà terminé. */
export async function rerollGiveaway(client: Client, giveawayId: string) {
  const g = await prisma.giveaway.findUnique({ where: { id: giveawayId }, include: { entries: true } });
  if (!g || g.status !== "ENDED") return null; // reroll seulement APRÈS clôture
  const all = g.entries.map((e) => e.discordId);
  const pool = all.filter((id) => !g.winners.includes(id)); // exclure les gagnants précédents
  const winners = pickWinners(pool.length ? pool : all, g.winnersCount);
  const updated = await prisma.giveaway.update({ where: { id: g.id }, data: { status: "ENDED", winners } });
  await refreshGiveaway(client, updated);
  try {
    const ch: any = await client.channels.fetch(g.channelId);
    if (winners.length) await ch.send(`🔄 Reroll du giveaway **${prizeText(g)}** — nouveau(x) gagnant(s) : ${winners.map((id) => `<@${id}>`).join(", ")} 🎉`);
    else await ch.send(`Aucun participant à retirer pour **${prizeText(g)}**.`);
  } catch { /* ignore */ }
  return updated;
}

/** Crée + poste un giveaway dans un salon texte. Renvoie l'ID du giveaway. */
export async function createGiveaway(client: Client, opts: { channelId: string; prize: string; prizes?: string[]; description?: string | null; winnersCount: number; durationMs: number; hostId: string; embedTitle?: string | null; embedColor?: number | null; embedImage?: string | null }): Promise<string> {
  const ch: any = await client.channels.fetch(opts.channelId);
  if (!ch || !ch.isTextBased?.() || !ch.guildId) throw new Error("Salon de serveur requis pour un giveaway");
  const prizes = (opts.prizes ?? []).map((p) => String(p).trim()).filter(Boolean);
  const g = await prisma.giveaway.create({
    data: {
      guildId: ch.guildId ?? "", channelId: opts.channelId, prize: opts.prize,
      prizes: prizes.length ? prizes : [opts.prize],
      description: opts.description ?? null, winnersCount: Math.max(1, opts.winnersCount || 1),
      embedTitle: opts.embedTitle ?? null,
      embedColor: typeof opts.embedColor === "number" ? opts.embedColor : null,
      embedImage: opts.embedImage ?? null,
      endsAt: new Date(Date.now() + opts.durationMs), hostId: opts.hostId,
    },
  });
  const sent = await ch.send({ embeds: [giveawayEmbed(g, 0)], components: giveawayButtons(g) });
  await prisma.giveaway.update({ where: { id: g.id }, data: { messageId: sent.id } });
  return g.id;
}

/** Termine tous les giveaways arrivés à échéance (appelé par le scheduler). */
export async function endDueGiveaways(client: Client) {
  const due = await prisma.giveaway.findMany({ where: { status: "RUNNING", endsAt: { lte: new Date() } } });
  for (const g of due) await endGiveaway(client, g.id);
}
