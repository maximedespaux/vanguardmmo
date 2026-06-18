// ════════════════════════════════════════════════════════════
//  /panneau-classes — Poste le panneau d'auto-attribution des
//  rôles de classe. Réservé au staff (gère les rôles).
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from "discord.js";
import { botCanPost, NO_ACCESS_MSG } from "../lib/permissions.js";
import { postClassPanel } from "../lib/classpanel.js";
import { CLASS_ROLES } from "../config.js";

export const data = new SlashCommandBuilder()
  .setName("panneau-classes")
  .setDescription("[Staff] Poster le panneau d'auto-attribution des rôles de classe")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(i: ChatInputCommandInteraction) {
  const channel = i.channel as TextChannel;
  if (!Object.values(CLASS_ROLES).some(Boolean)) {
    await i.reply({ content: "Aucun rôle de classe configuré (`ROLE_CLASSE_*` dans `.env`).", ephemeral: true });
    return;
  }
  const me = await i.guild!.members.fetchMe();
  if (!botCanPost(channel, me)) { await i.reply({ content: NO_ACCESS_MSG, ephemeral: true }); return; }
  try {
    await postClassPanel(i.client, channel.id);
    await i.reply({ content: "✅ Panneau de classes posté.", ephemeral: true });
  } catch (e: any) {
    await i.reply({ content: `Erreur : ${e?.message ?? e}`, ephemeral: true });
  }
}
