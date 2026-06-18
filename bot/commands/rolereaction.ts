// ════════════════════════════════════════════════════════════
//  /rolereaction — Créer un message de rôle-réaction (façon MEE6)
//  Construit un embed (titre, description, image, couleur) et y
//  attache UNE paire emoji → rôle. Relance la commande pour ajouter
//  d'autres paires sur le même message (option message_id).
//  Réservé au staff (gère les rôles).
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, TextChannel } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { ORANGE } from "../lib/helpers.js";

export const data = new SlashCommandBuilder()
  .setName("rolereaction")
  .setDescription("[Staff] Créer/compléter un message de rôle-réaction")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption((o) => o.setName("emoji").setDescription("L'emoji de la réaction").setRequired(true))
  .addRoleOption((o) => o.setName("role").setDescription("Le rôle à donner").setRequired(true))
  .addStringOption((o) => o.setName("titre").setDescription("Titre de l'embed (nouveau message)"))
  .addStringOption((o) => o.setName("description").setDescription("Texte de l'embed"))
  .addStringOption((o) => o.setName("image").setDescription("URL d'une image (bannière)"))
  .addStringOption((o) => o.setName("message_id").setDescription("Ajouter à un message existant (son ID)"));

export async function execute(i: ChatInputCommandInteraction) {
  const emoji = i.options.getString("emoji", true).trim();
  const role = i.options.getRole("role", true);
  const existingId = i.options.getString("message_id");
  const channel = i.channel as TextChannel;

  // Vérif hiérarchie : le rôle du bot doit être au-dessus du rôle donné
  const me = await i.guild!.members.fetchMe();
  if (me.roles.highest.comparePositionTo(role as any) <= 0) {
    await i.reply({ content: `⚠️ Mon rôle doit être **au-dessus** de « ${role.name} » dans la liste des rôles (Paramètres du serveur → Rôles), sinon je ne peux pas l'attribuer.`, ephemeral: true });
    return;
  }

  let messageId = existingId;
  if (!messageId) {
    const embed = new EmbedBuilder()
      .setColor(ORANGE)
      .setTitle(i.options.getString("titre") ?? "✨ Choisis ton rôle")
      .setDescription(i.options.getString("description") ?? "Réagis à ce message pour obtenir ton rôle !");
    const img = i.options.getString("image");
    if (img) embed.setImage(img);
    const sent = await channel.send({ embeds: [embed] });
    messageId = sent.id;
    await sent.react(emoji).catch(() => {});
  } else {
    try { const msg = await channel.messages.fetch(messageId); await msg.react(emoji); }
    catch { await i.reply({ content: "Message introuvable dans ce salon (vérifie l'ID).", ephemeral: true }); return; }
  }

  await prisma.reactionRole.upsert({
    where: { messageId_emoji: { messageId: messageId!, emoji } },
    create: { guildId: i.guildId!, channelId: channel.id, messageId: messageId!, emoji, roleId: role.id },
    update: { roleId: role.id },
  });

  await i.reply({ content: `✅ Réaction ${emoji} → **${role.name}** active sur le message \`${messageId}\`. Relance \`/rolereaction\` avec \`message_id:${messageId}\` pour ajouter d'autres rôles.`, ephemeral: true });
}
