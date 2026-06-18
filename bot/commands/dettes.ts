// ════════════════════════════════════════════════════════════
//  /dettes [membre] — Voir toutes les dettes en cours
//  Sans option : toutes les dettes ouvertes de la guilde.
//  Avec un membre : ce qu'il doit ET ce qu'on lui doit.
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { ORANGE } from "../lib/helpers.js";
import { STATUS_FR } from "../lib/debts.js";

export const data = new SlashCommandBuilder()
  .setName("dettes")
  .setDescription("Voir les dettes de la guilde")
  .addUserOption((o) => o.setName("membre").setDescription("Filtrer sur un membre"));

export async function execute(i: ChatInputCommandInteraction) {
  const u = i.options.getUser("membre");
  const active = { in: ["OPEN", "PENDING_CONFIRM"] as any };

  if (u) {
    const owes = await prisma.guildDebt.findMany({ where: { debtorId: u.id, status: active }, orderBy: { createdAt: "asc" } });
    const owed = await prisma.guildDebt.findMany({ where: { creditorId: u.id, status: active }, orderBy: { createdAt: "asc" } });
    const fmt = (arr: any[]) => arr.length ? arr.map((d) => `• **${d.itemName || d.itemRef} ×${d.quantity}** ${STATUS_FR[d.status]} — ${d.debtorId === u.id ? "à <@" + d.creditorId + ">" : "de <@" + d.debtorId + ">"}`).join("\n") : "_aucune_";
    const e = new EmbedBuilder().setColor(ORANGE).setTitle(`💰 Dettes de ${u.username}`)
      .addFields({ name: `Doit (${owes.length})`, value: fmt(owes) }, { name: `On lui doit (${owed.length})`, value: fmt(owed) });
    await i.reply({ embeds: [e], ephemeral: true });
    return;
  }

  const all = await prisma.guildDebt.findMany({ where: { status: active }, orderBy: { createdAt: "asc" } });
  if (all.length === 0) { await i.reply({ content: "✅ Aucune dette en cours dans la guilde.", ephemeral: true }); return; }
  const lines = all.slice(0, 40).map((d) => `• <@${d.debtorId}> → <@${d.creditorId}> : **${d.itemName || d.itemRef} ×${d.quantity}** ${STATUS_FR[d.status]}`);
  const e = new EmbedBuilder().setColor(ORANGE).setTitle(`💰 Dettes en cours — ${all.length}`).setDescription(lines.join("\n"))
    .setFooter({ text: "Détail d'un membre : /dettes membre:@pseudo" });
  await i.reply({ embeds: [e], ephemeral: true });
}
