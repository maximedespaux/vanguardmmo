// ════════════════════════════════════════════════════════════
//  /dette-supprimer — Supprimer définitivement une dette de guilde.
//  Réservé au rôle Vanguard (owner). Liste les dettes dans un menu,
//  supprime la dette choisie (base + embed public) + journal d'audit.
// ════════════════════════════════════════════════════════════
import {
  SlashCommandBuilder, ChatInputCommandInteraction, GuildMember,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType, PermissionFlagsBits,
} from "discord.js";
import { prisma } from "../lib/prisma.js";
import { isVanguard } from "../lib/permissions.js";
import { STATUS_FR } from "../lib/debts.js";

export const data = new SlashCommandBuilder()
  .setName("dette-supprimer")
  .setDescription("[Vanguard] Supprimer une dette de guilde")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((o) => o.setName("joueur").setDescription("Filtrer sur un débiteur (optionnel)"));

export async function execute(i: ChatInputCommandInteraction) {
  const member = i.member as GuildMember | null;
  if (!isVanguard(member)) {
    await i.reply({ content: "⛔ Réservé au rôle **Vanguard** (ou à un administrateur du serveur).", ephemeral: true });
    return;
  }

  const joueur = i.options.getUser("joueur");
  const debts = await prisma.guildDebt.findMany({
    where: { ...(joueur ? { debtorId: joueur.id } : {}), status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  if (!debts.length) {
    await i.reply({ content: joueur ? `Aucune dette en cours pour <@${joueur.id}>.` : "Aucune dette à supprimer.", ephemeral: true });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("delsel")
    .setPlaceholder("Quelle dette supprimer ?")
    .addOptions(debts.map((d) => ({
      label: `${d.itemName || d.itemRef} ×${d.quantity}`.slice(0, 100),
      description: `${d.debtorName} → ${d.creditorName} · ${STATUS_FR[d.status] ?? d.status}`.slice(0, 100),
      value: d.id,
    })));

  const msg = await i.reply({
    content: "⚠️ Sélectionne la dette à **supprimer définitivement** :",
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    ephemeral: true, fetchReply: true,
  });

  try {
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000, filter: (c) => c.user.id === i.user.id });
    const d = await prisma.guildDebt.findUnique({ where: { id: sel.values[0] } });
    if (!d) { await sel.update({ content: "Dette introuvable (déjà supprimée ?).", components: [] }); return; }

    // supprimer l'embed public s'il existe
    if (d.channelId && d.messageId) {
      try { const ch: any = await i.client.channels.fetch(d.channelId); const m = await ch.messages.fetch(d.messageId); await m.delete(); }
      catch { /* message déjà supprimé */ }
    }
    await prisma.guildDebt.delete({ where: { id: d.id } });
    await prisma.auditLog.create({ data: { actor: i.user.username, action: "dette.SUPPRIMEE", target: d.id, detail: `${d.itemName || d.itemRef} ×${d.quantity} (${d.debtorName})` } }).catch(() => {});

    await sel.update({ content: `🗑️ Dette **${d.itemName || d.itemRef} ×${d.quantity}** (${d.debtorName}) supprimée.`, components: [] });
  } catch {
    await i.editReply({ content: "⏳ Temps écoulé, rien supprimé.", components: [] }).catch(() => {});
  }
}
