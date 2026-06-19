// ════════════════════════════════════════════════════════════
//  /giveaway — Concours (giveaway).
//    /giveaway creer        : lance un giveaway (lot, durée, gagnants)
//    /giveaway terminer     : termine maintenant et tire les gagnants
//    /giveaway reroll       : re-tire des gagnants
//    /giveaway participants : nombre de participants
//  Réservé au staff (gère les messages).
// ════════════════════════════════════════════════════════════
import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  PermissionFlagsBits, TextChannel, ChannelType,
} from "discord.js";
import { prisma } from "../lib/prisma.js";
import { createGiveaway, endGiveaway, rerollGiveaway } from "../lib/giveaways.js";
import { botCanPost, NO_ACCESS_MSG } from "../lib/permissions.js";

function parseDuration(s: string): number | null {
  const m = s.trim().match(/^(\d+)\s*(m|min|mins|h|hr|d|j)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  const mult = u.startsWith("m") ? 60_000 : u.startsWith("h") ? 3_600_000 : 86_400_000;
  return n * mult;
}

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("[Staff] Organiser un concours")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addSubcommand((s) => s.setName("creer").setDescription("Lancer un giveaway")
    .addStringOption((o) => o.setName("lot").setDescription("Ce qu'on gagne").setRequired(true))
    .addStringOption((o) => o.setName("duree").setDescription("Durée : 30m, 2h, 1d…").setRequired(true))
    .addIntegerOption((o) => o.setName("gagnants").setDescription("Nombre de gagnants (défaut 1)").setMinValue(1))
    .addStringOption((o) => o.setName("description").setDescription("Texte additionnel"))
    .addChannelOption((o) => o.setName("salon").setDescription("Salon (défaut : ici)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
  .addSubcommand((s) => s.setName("terminer").setDescription("Terminer un giveaway maintenant")
    .addStringOption((o) => o.setName("message_id").setDescription("ID du message du giveaway").setRequired(true)))
  .addSubcommand((s) => s.setName("reroll").setDescription("Re-tirer des gagnants")
    .addStringOption((o) => o.setName("message_id").setDescription("ID du message du giveaway").setRequired(true)))
  .addSubcommand((s) => s.setName("participants").setDescription("Voir le nombre de participants")
    .addStringOption((o) => o.setName("message_id").setDescription("ID du message du giveaway").setRequired(true)));

export async function execute(i: ChatInputCommandInteraction) {
  const sub = i.options.getSubcommand();
  await i.deferReply({ ephemeral: true });

  if (sub === "creer") {
    const prize = i.options.getString("lot", true);
    const durStr = i.options.getString("duree", true);
    const ms = parseDuration(durStr);
    if (!ms) { await i.editReply({ content: "Durée invalide. Exemples : `30m`, `2h`, `1d`." }); return; }
    const winnersCount = i.options.getInteger("gagnants") ?? 1;
    const description = i.options.getString("description") ?? null;
    const channel = (i.options.getChannel("salon") as TextChannel) ?? (i.channel as TextChannel);
    const me = await i.guild!.members.fetchMe();
    if (!botCanPost(channel, me)) { await i.editReply({ content: NO_ACCESS_MSG }); return; }

    await createGiveaway(i.client, { channelId: channel.id, prize, description, winnersCount, durationMs: ms, hostId: i.user.id });
    await i.editReply({ content: `✅ Giveaway lancé dans ${channel} !` });
    return;
  }

  // les autres sous-commandes ciblent un giveaway par l'ID de son message
  const messageId = i.options.getString("message_id", true);
  const g = await prisma.giveaway.findFirst({ where: { messageId } });
  if (!g) { await i.editReply({ content: "Aucun giveaway lié à ce message." }); return; }

  if (sub === "terminer") {
    if (g.status !== "RUNNING") { await i.editReply({ content: "Ce giveaway est déjà terminé ou annulé." }); return; }
    await endGiveaway(i.client, g.id);
    await i.editReply({ content: "✅ Giveaway terminé, gagnant(s) tiré(s)." });
    return;
  }
  if (sub === "reroll") {
    if (g.status !== "ENDED") { await i.editReply({ content: "Le giveaway doit d'abord être **terminé** (`/giveaway terminer`) avant de pouvoir relancer un tirage." }); return; }
    const r = await rerollGiveaway(i.client, g.id);
    await i.editReply({ content: r ? "🔄 Reroll effectué, nouveau(x) gagnant(s) tiré(s)." : "Reroll impossible." });
    return;
  }
  if (sub === "participants") {
    const count = await prisma.giveawayEntry.count({ where: { giveawayId: g.id } });
    await i.editReply({ content: `👥 **${count}** participant(s) pour **${g.prize}**.` });
    return;
  }
}
