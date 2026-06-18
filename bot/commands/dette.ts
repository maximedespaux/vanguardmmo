// ════════════════════════════════════════════════════════════
//  /dette — Enregistrer une dette entre deux membres
//  /dette debiteur:@x objet:<ID/nom> quantite:<n> [crediteur:@y] [note]
//  Par défaut, le créancier est l'auteur de la commande.
//  Poste un embed public (avec boutons) et prévient le débiteur en MP.
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { debtEmbed, debtButtons, dm } from "../lib/debts.js";
import { resolveItemName } from "../lib/items.js";

export const data = new SlashCommandBuilder()
  .setName("dette")
  .setDescription("Enregistrer une dette : qui doit quoi à qui")
  .addUserOption((o) => o.setName("debiteur").setDescription("Le membre qui DOIT (débiteur)").setRequired(true))
  .addStringOption((o) => o.setName("objet").setDescription("ID ou nom de l'objet dû").setRequired(true))
  .addIntegerOption((o) => o.setName("quantite").setDescription("Quantité (défaut 1)").setMinValue(1))
  .addUserOption((o) => o.setName("crediteur").setDescription("À qui c'est dû (défaut : toi)"))
  .addStringOption((o) => o.setName("note").setDescription("Précision optionnelle"));

export async function execute(i: ChatInputCommandInteraction) {
  const debtor = i.options.getUser("debiteur", true);
  const creditor = i.options.getUser("crediteur") ?? i.user;
  const itemRef = i.options.getString("objet", true);
  const quantity = i.options.getInteger("quantite") ?? 1;
  const note = i.options.getString("note") ?? null;

  if (debtor.id === creditor.id) { await i.reply({ content: "Le débiteur et le créancier ne peuvent pas être la même personne.", ephemeral: true }); return; }
  if (debtor.bot) { await i.reply({ content: "Impossible d'enregistrer une dette sur un bot.", ephemeral: true }); return; }

  const itemName = await resolveItemName(itemRef);

  const debt = await prisma.guildDebt.create({
    data: {
      guildId: i.guildId ?? "",
      debtorId: debtor.id, debtorName: debtor.username,
      creditorId: creditor.id, creditorName: creditor.username,
      itemRef, itemName, quantity, note, status: "OPEN",
      channelId: i.channelId,
    },
  });

  const reply = await i.reply({ embeds: [debtEmbed(debt)], components: debtButtons(debt) as any, fetchReply: true });
  await prisma.guildDebt.update({ where: { id: debt.id }, data: { messageId: reply.id } });

  // Prévenir le débiteur en MP
  await dm(i.client, debtor.id, {
    content: `📩 Une dette a été enregistrée à ton nom par **${creditor.username}**. Quand tu l'auras réglée, clique sur **« J'ai réglé cette dette »** sur le message, ou utilise \`/dette-payer\`.`,
    embeds: [debtEmbed({ ...debt, messageId: reply.id })],
  });
}
