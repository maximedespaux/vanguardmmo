// ════════════════════════════════════════════════════════════
//  Panneau d'auto-attribution des classes — logique réutilisable
//  (slash /panneau-classes ET pilotage depuis le site).
// ════════════════════════════════════════════════════════════
import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";
import { CLASS_ROLES, CLASS_LABELS, CLASS_EMOJIS } from "../config.js";

/** Poste le panneau des classes dans un salon TEXTE et enregistre les bouton-rôles. Renvoie l'ID du message. */
export async function postClassPanel(client: Client, channelId: string): Promise<string> {
  const ch: any = await client.channels.fetch(channelId);
  if (!ch || !ch.isTextBased?.() || ch.type === ChannelType.GuildForum) throw new Error("Salon texte requis pour le panneau de classes");
  const entries = Object.entries(CLASS_ROLES).filter(([, id]) => id);
  if (!entries.length) throw new Error("Aucun rôle de classe configuré (ROLE_CLASSE_*)");

  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle("🎭 Choisis ta classe")
    .setDescription("Clique sur ta (ou tes) classe(s) pour obtenir le rôle correspondant.\nRe-clique pour l'enlever.")
    .setFooter({ text: "Vanguard" });

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let row = new ActionRowBuilder<ButtonBuilder>();
  entries.forEach(([cls, roleId], idx) => {
    const lab = CLASS_LABELS[cls] ?? { fr: cls, emoji: "•" };
    row.addComponents(new ButtonBuilder().setCustomId(`role:${roleId}`).setLabel(lab.fr).setEmoji(CLASS_EMOJIS[cls] ?? lab.emoji).setStyle(ButtonStyle.Secondary));
    if ((idx + 1) % 4 === 0) { rows.push(row); row = new ActionRowBuilder<ButtonBuilder>(); }
  });
  if (row.components.length) rows.push(row);

  const sent = await ch.send({ embeds: [embed], components: rows });
  for (const [cls, roleId] of entries) {
    await prisma.buttonRole.upsert({
      where: { messageId_customId: { messageId: sent.id, customId: `role:${roleId}` } },
      create: { guildId: ch.guildId ?? "", channelId: ch.id, messageId: sent.id, customId: `role:${roleId}`, roleId, label: CLASS_LABELS[cls]?.fr ?? cls },
      update: { roleId },
    });
  }
  return sent.id;
}
