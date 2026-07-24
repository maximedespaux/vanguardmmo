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

const baseName = (n: string) => String(n || "").replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().trim();
const reqValue = (r: any) => Number(r.prixFinal) || (Number(r.priceEach) || 0) * (r.quantity || 1);
const fmtP = (n: number) => n.toLocaleString("fr-FR");

function exchangeEmbed(reqs: any[], owners: Owner[]): EmbedBuilder {
  const first = reqs[0] || {};
  const mode = first.debtId ? "Dette" : "Achat"; // fiable quel que soit le statut (les dettes ont un debtId)
  const label = first.status === "REMIS" ? "🟢 Remis" : first.status === "REFUSE" ? "⚫ Refusé / annulé" : "🟠 En cours";
  const color = first.status === "REMIS" ? GREEN : first.status === "REFUSE" ? RED : ORANGE;
  const total = reqs.reduce((s, r) => s + reqValue(r), 0);
  // Articles : le nom (r.item) contient déjà la rareté choisie « (Épique) » + le prix de la ligne.
  const lines = reqs.map((r) => `• **${r.item ?? "?"}** ×${r.quantity}${reqValue(r) ? ` · ${fmtP(reqValue(r))} périns` : ""}`).join("\n").slice(0, 1024);
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🤝 Échange — ${first.username}`)
    .setDescription(lines || "_(vide)_")
    .addFields(
      { name: "Acheteur", value: first.discordId ? `<@${first.discordId}>` : String(first.username ?? "?"), inline: true },
      { name: "Mode", value: mode, inline: true },
      { name: "Statut", value: label, inline: true },
    );
  if (total > 0) e.addFields({ name: "💰 Montant total (à régler par l'acheteur)", value: `**${fmtP(total)}** périns`, inline: false });
  // Détail PAR VENDEUR : chaque article est attribué à son détenteur principal + la valeur qui lui revient.
  const byHolder = new Map<string, { discordId: string | null; lines: string[]; value: number }>();
  for (const r of reqs) {
    const base = baseName(r.item);
    const owner = owners.find((o) => o.items.some((it) => { const b = baseName(it); return !!b && (b === base || base.includes(b) || b.includes(base)); }));
    const key = owner?.name ?? "— (à voir avec le staff)";
    if (!byHolder.has(key)) byHolder.set(key, { discordId: owner?.discordId ?? null, lines: [], value: 0 });
    const h = byHolder.get(key)!;
    h.lines.push(`${r.item} ×${r.quantity}`);
    h.value += reqValue(r);
  }
  const ownerLine = byHolder.size
    ? [...byHolder.entries()].map(([name, h]) => `${h.discordId ? `<@${h.discordId}>` : `**${name}**`} — ${h.lines.join(", ")} · **${fmtP(h.value)}** périns`).join("\n")
    : "_Aucun détenteur repéré — voir avec le staff._";
  e.addFields({ name: "📦 Détail par vendeur (à contacter + valeur due)", value: ownerLine.slice(0, 1024) });
  e.setFooter({ text: `réf. ${String(first.batchId || first.id).slice(-6)} · « Remis » une fois l'objet donné` }).setTimestamp(new Date());
  return e;
}

function exchangeButtons(status: string, key: string): ActionRowBuilder<ButtonBuilder>[] {
  if (status === "REMIS" || status === "REFUSE") return [];
  return [
    // Étape « Échange » : se mettre d'accord sur un horaire in-game.
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`exch:time:${key}`).setLabel("Proposer un horaire").setEmoji("📅").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`exch:ready:${key}`).setLabel("Je suis connecté in-game").setEmoji("🟢").setStyle(ButtonStyle.Secondary),
    ),
    // Étape « Remis / Refusé » : conclusion.
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`exch:remis:${key}`).setLabel("Remis").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`exch:refuse:${key}`).setLabel("Refusé / annulé").setEmoji("❌").setStyle(ButtonStyle.Danger),
    ),
  ];
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
  // La valeur configurée doit être une CATÉGORIE. Si c'en est une, on range le salon dedans ;
  // sinon (un salon texte, un ID erroné…) on le crée quand même à la racine plutôt que d'échouer.
  let parentId: string | undefined = undefined;
  try {
    const cat: any = await guild.channels.fetch(CHANNELS.exchangeCategory).catch(() => null);
    if (cat && cat.type === ChannelType.GuildCategory) parentId = cat.id;
    else console.warn("[exchange] CHANNEL_EXCHANGE_CATEGORY n'est pas une catégorie — salon d'échange créé à la racine du serveur.");
  } catch { /* ignore */ }
  try {
    const ch: any = await guild.channels.create({
      name, type: ChannelType.GuildText, parent: parentId,
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
