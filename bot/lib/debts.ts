// ════════════════════════════════════════════════════════════
//  Logique des dettes Discord (pair-à-pair)
//  Embeds + boutons + messages privés. Partagé par les commandes
//  /dette, /dettes et par le gestionnaire de boutons (bot/index.ts).
// ════════════════════════════════════════════════════════════
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, User } from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";

const GREEN = 0x4ade80, RED = 0xf87171, BLUE = 0x4ea8ff;

export const STATUS_FR: Record<string, string> = {
  OPEN: "🟠 En cours",
  PENDING_CONFIRM: "🔵 En attente de confirmation",
  SETTLED: "🟢 Réglée",
  CANCELLED: "⚫ Annulée",
};

/** Construit l'embed d'une dette (vue publique dans le salon). */
export function debtEmbed(d: any): EmbedBuilder {
  const color = d.status === "SETTLED" ? GREEN : d.status === "CANCELLED" ? RED : d.status === "PENDING_CONFIRM" ? BLUE : ORANGE;
  const qty = d.quantity > 1 ? ` ×${d.quantity}` : "";
  return new EmbedBuilder()
    .setColor(color)
    .setTitle("💰 Dette de guilde")
    .setDescription(`<@${d.debtorId}> doit **${d.itemName || d.itemRef}${qty}** à <@${d.creditorId}>`)
    .addFields(
      { name: "Objet", value: `${d.itemName || d.itemRef} (réf. ${d.itemRef})`, inline: true },
      { name: "Quantité", value: String(d.quantity), inline: true },
      { name: "Statut", value: STATUS_FR[d.status] ?? d.status, inline: true },
      ...(d.note ? [{ name: "Note", value: d.note }] : []),
    )
    .setFooter({ text: `Réf. dette ${d.id.slice(-6)}` })
    .setTimestamp(new Date(d.updatedAt || d.createdAt));
}

/** Boutons selon le statut (le débiteur déclare / le créancier confirme). */
export function debtButtons(d: any): ActionRowBuilder<ButtonBuilder>[] {
  if (d.status === "OPEN") {
    return [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`debt:paid:${d.id}`).setLabel("J'ai réglé cette dette").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`debt:cancel:${d.id}`).setLabel("Annuler").setEmoji("🗑️").setStyle(ButtonStyle.Secondary),
    )];
  }
  if (d.status === "PENDING_CONFIRM") {
    return [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`debt:confirm:${d.id}`).setLabel("Confirmer le remboursement").setEmoji("👍").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`debt:reject:${d.id}`).setLabel("Pas encore réglé").setEmoji("👎").setStyle(ButtonStyle.Danger),
    )];
  }
  return [];
}

/** Envoie un message privé (silencieux en cas d'échec : DM fermés). */
export async function dm(client: Client, userId: string, payload: any) {
  try { const u: User = await client.users.fetch(userId); await u.send(payload); return true; }
  catch { return false; }
}

/** Met à jour l'embed public de la dette s'il a été posté. */
export async function refreshDebtMessage(client: Client, d: any) {
  if (!d.channelId || !d.messageId) return;
  try {
    const ch: any = await client.channels.fetch(d.channelId);
    const msg = await ch.messages.fetch(d.messageId);
    await msg.edit({ embeds: [debtEmbed(d)], components: debtButtons(d) as any });
  } catch { /* message supprimé : on ignore */ }
}
