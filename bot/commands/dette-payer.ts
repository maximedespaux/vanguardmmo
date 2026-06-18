// ════════════════════════════════════════════════════════════
//  /dette-payer — Le débiteur déclare avoir réglé une de ses dettes
//  Utilisable en message privé avec le bot. Liste ses dettes en cours
//  et passe la dette choisie en « en attente de confirmation »,
//  puis prévient le créancier (MP + boutons).
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { debtEmbed, debtButtons, dm, refreshDebtMessage } from "../lib/debts.js";

export const data = new SlashCommandBuilder()
  .setName("dette-payer")
  .setDescription("Déclarer que tu as réglé une de tes dettes");

export async function execute(i: ChatInputCommandInteraction) {
  const debts = await prisma.guildDebt.findMany({ where: { debtorId: i.user.id, status: "OPEN" }, orderBy: { createdAt: "asc" } });
  if (debts.length === 0) { await i.reply({ content: "✅ Tu n'as aucune dette en cours.", ephemeral: true }); return; }

  const menu = new StringSelectMenuBuilder().setCustomId("paysel").setPlaceholder("Quelle dette as-tu réglée ?")
    .addOptions(debts.slice(0, 25).map((d) => ({ label: `${d.itemName || d.itemRef} ×${d.quantity}`.slice(0, 100), description: `Pour ${d.creditorName}`.slice(0, 100), value: d.id })));
  const msg = await i.reply({ content: "Sélectionne la dette que tu as réglée :", components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)], ephemeral: true, fetchReply: true });

  try {
    const sel = await msg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60_000, filter: (c) => c.user.id === i.user.id });
    const d = await prisma.guildDebt.update({ where: { id: sel.values[0] }, data: { status: "PENDING_CONFIRM" } });
    await refreshDebtMessage(i.client, d);
    await dm(i.client, d.creditorId, {
      content: `📩 **${d.debtorName}** déclare avoir réglé sa dette (**${d.itemName || d.itemRef} ×${d.quantity}**). Confirme si c'est bien le cas — toi seul peux valider.`,
      embeds: [debtEmbed(d)], components: debtButtons(d) as any,
    });
    await sel.update({ content: "👍 Le créancier a été prévenu. Il doit confirmer pour clôturer la dette.", components: [] });
  } catch { await i.editReply({ content: "⏳ Temps écoulé.", components: [] }); }
}
