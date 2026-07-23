// ════════════════════════════════════════════════════════════
//  SALON D'ÉCHANGE TEMPORAIRE (acheteur ↔ détenteur ↔ staff)
//  Créé après acceptation d'une requête boutique. Les 3 étapes :
//  Requête (salon Décision) → Échange (ce salon) → Remis / Refusé.
//  ⚠️ NE FAIT RIEN si CHANNEL_EXCHANGE_CATEGORY n'est pas configuré
//     (sécurité : aucun salon n'est créé tant que ce n'est pas activé).
// ════════════════════════════════════════════════════════════
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits, Client,
} from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";
import { CHANNELS, GUILD_ID, ROLE_STAFF_VIEW } from "../config.js";
import { resolveOwners } from "./decisions.js";

const GREEN = 0x4ade80, RED = 0xf87171;
type Owner = { name: string; discordId: string | null; items: string[]; qty: number };

function exchangeEmbed(reqs: any[], owners: Owner[]): EmbedBuilder {
  const first = reqs[0] || {};
  const mode = first.status === "ACCEPTE_DETTE" ? "Dette" : "Achat";
  const label = first.status === "REMIS" ? "🟢 Remis" : first.status === "REFUSE" ? "⚫ Refusé / annulé" : "🟠 En cours";
  const color = first.status === "REMIS" ? GREEN : first.status === "REFUSE" ? RED : ORANGE;
  const total = reqs.reduce((s, r) => s + (Number(r.prixFinal) || (Number(r.priceEach) || 0) * (r.quantity || 1)), 0);
  const lines = reqs.map((r) => `• **${r.item ?? "?"}** ×${r.quantity}`).join("\n").slice(0, 1024);
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🤝 Échange — ${first.username}`)
    .setDescription(lines || "_(vide)_")
    .addFields(
      { name: "Acheteur", value: first.discordId ? `<@${first.discordId}>` : String(first.username ?? "?"), inline: true },
      { name: "Mode", value: mode, inline: true },
      { name: "Statut", value: label, inline: true },
    );
  if (total > 0) e.addFields({ name: "Montant", value: `${total.toLocaleString("fr-FR")} périns`, inline: true });
  const ownerLine = owners.length
    ? owners.map((o) => `${o.discordId ? `<@${o.discordId}>` : `**${o.name}**`} — ${o.items.join(", ")} (${o.qty} en coffre)`).join("\n")
    : "_Aucun détenteur repéré dans les coffres — voir avec le staff._";
  e.addFields({ name: "Détenteur(s) à contacter", value: ownerLine.slice(0, 1024) });
  e.setFooter({ text: `réf. ${String(first.batchId || first.id).slice(-6)} · « Remis » une fois l'objet donné` }).setTimestamp(new Date());
  return e;
}

function exchangeButtons(status: string, key: string): ActionRowBuilder<ButtonBuilder>[] {
  if (status === "REMIS" || status === "REFUSE") return [];
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`exch:remis:${key}`).setLabel("Remis").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`exch:refuse:${key}`).setLabel("Refusé / annulé").setEmoji("❌").setStyle(ButtonStyle.Danger),
  )];
}

/** Ouvre un salon d'échange privé pour une requête acceptée. No-op si la catégorie n'est pas configurée. */
export async function openExchange(client: Client, reqs: any[]): Promise<void> {
  if (!CHANNELS.exchangeCategory) return; // gate de sécurité
  const first = reqs[0];
  if (!first) return;
  const key = first.batchId || first.id;
  const guild = client.guilds.cache.get(GUILD_ID) ?? (await client.guilds.fetch(GUILD_ID).catch(() => null));
  if (!guild) return;
  const owners = await resolveOwners([...new Set(reqs.map((r) => String(r.item || "")).filter(Boolean))]);
  // ACL : @everyone refusé ; acheteur + détenteurs + rôle staff autorisés.
  const overwrites: any[] = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
  const allow = new Set<string>();
  if (first.discordId) allow.add(first.discordId);
  for (const o of owners) if (o.discordId) allow.add(o.discordId);
  for (const uid of allow) overwrites.push({ id: uid, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  if (ROLE_STAFF_VIEW) overwrites.push({ id: ROLE_STAFF_VIEW, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const name = `echange-${String(first.username || "membre").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}-${String(key).slice(-4)}`.slice(0, 90);
  try {
    const ch: any = await guild.channels.create({
      name, type: ChannelType.GuildText, parent: CHANNELS.exchangeCategory,
      permissionOverwrites: overwrites, topic: `Échange boutique — ${first.username} · réf. ${String(key).slice(-6)}`,
    });
    const ping = [first.discordId ? `<@${first.discordId}>` : "", ...owners.filter((o) => o.discordId).map((o) => `<@${o.discordId}>`)].filter(Boolean).join(" ");
    const msg = await ch.send({ content: ping || undefined, embeds: [exchangeEmbed(reqs, owners)], components: exchangeButtons(first.status, key) });
    await prisma.bankRequest.updateMany({ where: { OR: [{ id: key }, { batchId: key }] }, data: { exchangeChannelId: ch.id, exchangeMessageId: msg.id, status: "EN_ECHANGE", discordSynced: false } });
  } catch (e) {
    console.error("[exchange] création du salon échouée:", e);
  }
}

/** Marque un échange Remis / Refusé, édite l'embed et retire les boutons. */
export async function applyExchangeDecision(client: Client, key: string, action: "remis" | "refuse", actor: string): Promise<void> {
  const status = action === "remis" ? "REMIS" : "REFUSE";
  const reqs = await prisma.bankRequest.findMany({ where: { OR: [{ id: key }, { batchId: key }] } });
  if (!reqs.length) return;
  await prisma.bankRequest.updateMany({ where: { id: { in: reqs.map((r) => r.id) } }, data: { status: status as any, decidedBy: actor, discordSynced: false } });
  await prisma.auditLog.create({ data: { actor, action: `echange.${status}`, target: key, detail: reqs[0]?.item ?? "" } }).catch(() => {});
  const refreshed = await prisma.bankRequest.findMany({ where: { id: { in: reqs.map((r) => r.id) } } });
  const first = refreshed[0];
  if (!first?.exchangeChannelId || !first.exchangeMessageId) return;
  const owners = await resolveOwners([...new Set(refreshed.map((r) => String(r.item || "")).filter(Boolean))]);
  try {
    const ch: any = await client.channels.fetch(first.exchangeChannelId);
    if (ch?.isTextBased()) {
      const m = await ch.messages.fetch(first.exchangeMessageId).catch(() => null);
      if (m) await m.edit({ embeds: [exchangeEmbed(refreshed, owners)], components: [] });
      await ch.send({ content: status === "REMIS" ? `✅ Objet **remis** — échange clôturé par **${actor}**. Ce salon sera **supprimé automatiquement** d'ici une minute.` : `❌ Échange **refusé / annulé** par **${actor}**. Ce salon sera **supprimé automatiquement** d'ici une minute.` }).catch(() => {});
    }
  } catch { /* salon supprimé : on ignore */ }
}
