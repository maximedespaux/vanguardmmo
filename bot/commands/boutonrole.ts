// ════════════════════════════════════════════════════════════
//  /boutonrole — Créer un bouton-rôle (façon MEE6, version boutons).
//  Crée un message avec un bouton, ou ajoute un bouton à un message
//  existant (message_id). Clic = obtenir/retirer le rôle.
//  Réservé au staff (gère les rôles).
// ════════════════════════════════════════════════════════════
import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, TextChannel, ComponentType,
} from "discord.js";
import { prisma } from "../lib/prisma.js";
import { ORANGE } from "../lib/helpers.js";
import { botCanPost, NO_ACCESS_MSG } from "../lib/permissions.js";

const STYLES: Record<string, ButtonStyle> = {
  gris: ButtonStyle.Secondary, bleu: ButtonStyle.Primary,
  vert: ButtonStyle.Success, rouge: ButtonStyle.Danger,
};

export const data = new SlashCommandBuilder()
  .setName("boutonrole")
  .setDescription("[Staff] Créer/compléter un message à bouton-rôle")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addRoleOption((o) => o.setName("role").setDescription("Le rôle à donner/retirer").setRequired(true))
  .addStringOption((o) => o.setName("label").setDescription("Texte du bouton (défaut : nom du rôle)"))
  .addStringOption((o) => o.setName("couleur").setDescription("Couleur du bouton").addChoices(
    { name: "Gris", value: "gris" }, { name: "Bleu", value: "bleu" }, { name: "Vert", value: "vert" }, { name: "Rouge", value: "rouge" },
  ))
  .addStringOption((o) => o.setName("titre").setDescription("Titre de l'embed (nouveau message)"))
  .addStringOption((o) => o.setName("description").setDescription("Texte de l'embed (nouveau message)"))
  .addStringOption((o) => o.setName("message_id").setDescription("Ajouter le bouton à un message existant (son ID)"));

export async function execute(i: ChatInputCommandInteraction) {
  const role = i.options.getRole("role", true);
  const label = i.options.getString("label") ?? role.name;
  const style = STYLES[i.options.getString("couleur") ?? "gris"] ?? ButtonStyle.Secondary;
  const existingId = i.options.getString("message_id");
  const channel = i.channel as TextChannel;
  const customId = `role:${role.id}`;

  // hiérarchie : le rôle du bot doit être au-dessus
  const me = await i.guild!.members.fetchMe();
  if (!botCanPost(channel, me)) { await i.reply({ content: NO_ACCESS_MSG, ephemeral: true }); return; }
  if (me.roles.highest.comparePositionTo(role as any) <= 0) {
    await i.reply({ content: `⚠️ Mon rôle doit être **au-dessus** de « ${role.name} » dans la liste des rôles, sinon je ne peux pas l'attribuer.`, ephemeral: true });
    return;
  }

  const newButton = new ButtonBuilder().setCustomId(customId).setLabel(label.slice(0, 80)).setStyle(style);
  let messageId: string;

  if (!existingId) {
    // nouveau message
    const embed = new EmbedBuilder()
      .setColor(ORANGE)
      .setTitle(i.options.getString("titre") ?? "✨ Choisis ton rôle")
      .setDescription(i.options.getString("description") ?? "Clique sur le bouton pour obtenir le rôle. Re-clique pour l'enlever.");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(newButton);
    const sent = await channel.send({ embeds: [embed], components: [row] });
    messageId = sent.id;
  } else {
    // ajout à un message existant : on reconstruit les boutons puis on ajoute le nouveau
    let msg;
    try { msg = await channel.messages.fetch(existingId); }
    catch { await i.reply({ content: "Message introuvable dans ce salon (vérifie l'ID).", ephemeral: true }); return; }

    // on ne sait reconstruire que des messages 100% boutons
    const hasNonButton = msg.components.some((r: any) => r.components.some((c: any) => c.type !== ComponentType.Button));
    if (hasNonButton) { await i.reply({ content: "Ce message contient un composant non-bouton (menu déroulant…) : je ne peux pas y ajouter de bouton-rôle automatiquement. Crée un nouveau message à la place.", ephemeral: true }); return; }

    const rows: ActionRowBuilder<ButtonBuilder>[] = msg.components.map((r: any) => {
      const ar = new ActionRowBuilder<ButtonBuilder>();
      r.components.forEach((c: any) => ar.addComponents(ButtonBuilder.from(c)));
      return ar;
    });

    // doublon ? (ignore les boutons-lien sans custom_id)
    const already = rows.some((r) => r.components.some((b: any) => b.data.custom_id === customId));
    if (already) { await i.reply({ content: "Ce rôle a déjà un bouton sur ce message.", ephemeral: true }); return; }

    const last = rows[rows.length - 1];
    if (last && last.components.length < 5) last.addComponents(newButton);
    else if (rows.length < 5) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(newButton));
    else { await i.reply({ content: "Ce message a déjà le maximum de boutons (25).", ephemeral: true }); return; }

    await msg.edit({ components: rows });
    messageId = msg.id;
  }

  await prisma.buttonRole.upsert({
    where: { messageId_customId: { messageId, customId } },
    create: { guildId: i.guildId!, channelId: channel.id, messageId, customId, roleId: role.id, label },
    update: { roleId: role.id, label },
  });

  await i.reply({ content: `✅ Bouton **${label}** → **${role.name}** actif sur le message \`${messageId}\`.`, ephemeral: true });
}
