// ════════════════════════════════════════════════════════════
//  SALON DE DISCUSSION / ÉCHANGE (acheteur ↔ détenteur(s) ↔ Vanguard)
//  Ouvert DÈS la requête. Chaque détenteur y accepte/refuse SES objets,
//  puis on coordonne l'échange (horaire) et on conclut (Remis / Refusé).
//  #decision reste un simple journal (voir decisions.ts).
//  ⚠️ NE FAIT RIEN si CHANNEL_EXCHANGE_CATEGORY n'est pas configuré.
// ════════════════════════════════════════════════════════════
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits, Client,
} from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";
import { CHANNELS, GUILD_ID, ROLE_STAFF_VIEW } from "../config.js";
import { resolveOwners, applyBankAccept, applyBankRefuse } from "./decisions.js";

const GREEN = 0x4ade80, RED = 0xf87171;
type Owner = { name: string; discordId: string | null; items: string[]; qty: number };

const baseName = (n: string) => String(n || "").replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().trim();
const reqValue = (r: any) => Number(r.prixFinal) || (Number(r.priceEach) || 0) * (r.quantity || 1);
const fmtP = (n: number) => n.toLocaleString("fr-FR");
const reqMode = (r: any): "achat" | "dette" => (/dette/i.test(String(r?.reason || "")) ? "dette" : "achat");
const ACCEPTED = ["ACCEPTE_ACHAT", "ACCEPTE_DETTE", "EN_ECHANGE"];
const itemState = (r: any) => r.status === "PENDING" ? "🟠" : (r.status === "REMIS" || ACCEPTED.includes(r.status)) ? "✅" : "⚫";

async function isMemberBuyer(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }).catch(() => null);
  return !!(u && u.role && u.role !== "RECRUE");
}

function exchangeEmbed(reqs: any[], owners: Owner[], member: boolean): EmbedBuilder {
  const first = reqs[0] || {};
  const anyPending = reqs.some((r) => r.status === "PENDING");
  const anyAccepted = reqs.some((r) => ACCEPTED.includes(r.status) || r.status === "REMIS");
  const allRefused = reqs.length > 0 && reqs.every((r) => r.status === "REFUSE");
  const remis = reqs.some((r) => r.status === "REMIS");
  const kind = member ? "Négociation (membre)" : "Achat direct (public)";
  const phase = anyPending ? "🟠 En attente des détenteurs" : remis ? "🟢 Remis" : allRefused ? "⚫ Refusé" : anyAccepted ? "🤝 En cours d'échange" : "⚫ Clôturé";
  const color = allRefused ? RED : (!anyPending && anyAccepted) ? GREEN : ORANGE;
  const total = reqs.filter((r) => r.status !== "REFUSE").reduce((s, r) => s + reqValue(r), 0);
  const lines = reqs.map((r) => `${itemState(r)} **${r.item ?? "?"}** ×${r.quantity}${reqValue(r) ? ` · ${fmtP(reqValue(r))} périns` : ""}`).join("\n").slice(0, 1024);
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🤝 Échange — ${first.username}`)
    .setDescription(lines || "_(vide)_")
    .addFields(
      { name: "Acheteur", value: first.discordId ? `<@${first.discordId}>` : String(first.username ?? "?"), inline: true },
      { name: "Type", value: kind, inline: true },
      { name: "Statut", value: phase, inline: true },
    );
  if (total > 0) e.addFields({ name: "💰 Montant total (à régler par l'acheteur)", value: `**${fmtP(total)}** périns`, inline: false });
  // Détail par vendeur : chaque objet attribué à son détenteur principal + statut + valeur.
  const byHolder = new Map<string, { discordId: string | null; lines: string[]; value: number }>();
  for (const r of reqs) {
    const base = baseName(r.item);
    const owner = owners.find((o) => o.items.some((it) => { const b = baseName(it); return !!b && (b === base || base.includes(b) || b.includes(base)); }));
    const key = owner?.name ?? "— (à voir avec le staff)";
    if (!byHolder.has(key)) byHolder.set(key, { discordId: owner?.discordId ?? null, lines: [], value: 0 });
    const h = byHolder.get(key)!;
    h.lines.push(`${itemState(r)} ${r.item} ×${r.quantity}`);
    if (r.status !== "REFUSE") h.value += reqValue(r);
  }
  const ownerLine = byHolder.size
    ? [...byHolder.entries()].map(([name, h]) => `${h.discordId ? `<@${h.discordId}>` : `**${name}**`} — ${h.lines.join(", ")} · **${fmtP(h.value)}** périns`).join("\n")
    : "_Aucun détenteur repéré — voir avec le staff._";
  e.addFields({ name: "📦 Détenteur(s) — chacun accepte / refuse ses objets", value: ownerLine.slice(0, 1024) });
  e.setFooter({ text: `réf. ${String(first.batchId || first.id).slice(-6)} · ${anyPending ? "détenteurs : acceptez ou refusez vos objets" : "coordonnez l'échange, puis « Remis »"}` }).setTimestamp(new Date());
  return e;
}

function discussionButtons(reqs: any[], key: string): ActionRowBuilder<ButtonBuilder>[] {
  const anyPending = reqs.some((r) => r.status === "PENDING");
  const anyAccepted = reqs.some((r) => ACCEPTED.includes(r.status));
  const done = reqs.length > 0 && reqs.every((r) => r.status === "REMIS" || r.status === "REFUSE");
  if (done) return [];
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  if (anyPending) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`hold:accept:${key}`).setLabel("J'accepte mes objets").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`hold:refuse:${key}`).setLabel("Je refuse mes objets").setEmoji("❌").setStyle(ButtonStyle.Danger),
  ));
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`exch:time:${key}`).setLabel("Proposer un horaire").setEmoji("📅").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`exch:ready:${key}`).setLabel("Je suis connecté in-game").setEmoji("🟢").setStyle(ButtonStyle.Secondary),
  ));
  if (anyAccepted && !anyPending) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`exch:remis:${key}`).setLabel("Remis").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`exch:refuse:${key}`).setLabel("Annuler l'échange").setEmoji("❌").setStyle(ButtonStyle.Danger),
  ));
  return rows;
}

/** Rafraîchit l'embed + les boutons du salon de discussion. */
async function refreshDiscussion(client: Client, key: string): Promise<void> {
  const reqs = await prisma.bankRequest.findMany({ where: { OR: [{ id: key }, { batchId: key }] } });
  const first = reqs[0];
  if (!first?.exchangeChannelId || !first.exchangeMessageId) return;
  const owners = await resolveOwners([...new Set(reqs.map((r) => String(r.item || "")).filter(Boolean))]);
  const member = await isMemberBuyer(first.userId);
  try {
    const ch: any = await client.channels.fetch(first.exchangeChannelId);
    if (ch?.isTextBased()) {
      const m = await ch.messages.fetch(first.exchangeMessageId).catch(() => null);
      if (m) await m.edit({ embeds: [exchangeEmbed(reqs, owners, member)], components: discussionButtons(reqs, key) });
    }
  } catch { /* salon supprimé : on ignore */ }
}

/** Ouvre le salon de discussion DÈS la requête (statut PENDING). No-op si pas de catégorie. */
export async function openDiscussion(client: Client, reqs: any[]): Promise<void> {
  if (!CHANNELS.exchangeCategory) return; // gate de sécurité
  const first = reqs[0];
  if (!first) return;
  const key = first.batchId || first.id;
  const guild = client.guilds.cache.get(GUILD_ID) ?? (await client.guilds.fetch(GUILD_ID).catch(() => null));
  if (!guild) return;
  const owners = await resolveOwners([...new Set(reqs.map((r) => String(r.item || "")).filter(Boolean))]);
  const member = await isMemberBuyer(first.userId);
  const overwrites: any[] = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
  const allow = new Set<string>();
  if (first.discordId) allow.add(first.discordId);
  for (const o of owners) if (o.discordId) allow.add(o.discordId);
  for (const uid of allow) overwrites.push({ id: uid, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  if (ROLE_STAFF_VIEW) overwrites.push({ id: ROLE_STAFF_VIEW, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const name = `echange-${String(first.username || "membre").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20)}-${String(key).slice(-4)}`.slice(0, 90);
  let parentId: string | undefined = undefined;
  try {
    const cat: any = await guild.channels.fetch(CHANNELS.exchangeCategory).catch(() => null);
    if (cat && cat.type === ChannelType.GuildCategory) parentId = cat.id;
    else console.warn("[exchange] CHANNEL_EXCHANGE_CATEGORY n'est pas une catégorie — salon créé à la racine du serveur.");
  } catch { /* ignore */ }
  try {
    const ch: any = await guild.channels.create({
      name, type: ChannelType.GuildText, parent: parentId,
      permissionOverwrites: overwrites, topic: `Échange boutique — ${first.username} · réf. ${String(key).slice(-6)}`,
    });
    const ping = [first.discordId ? `<@${first.discordId}>` : "", ...owners.filter((o) => o.discordId).map((o) => `<@${o.discordId}>`)].filter(Boolean).join(" ");
    const intro = member
      ? "Discutez librement — **chaque détenteur accepte ou refuse ses objets** ci-dessous, puis coordonnez l'échange in-game."
      : "**Achat direct** — les détenteurs acceptent ou refusent, puis on coordonne l'échange in-game.";
    const msg = await ch.send({ content: `${ping}\n${intro}`.trim(), embeds: [exchangeEmbed(reqs, owners, member)], components: discussionButtons(reqs, key) });
    await prisma.bankRequest.updateMany({ where: { OR: [{ id: key }, { batchId: key }] }, data: { exchangeChannelId: ch.id, exchangeMessageId: msg.id } });
  } catch (e) {
    console.error("[exchange] création du salon échouée:", e);
  }
}

/** Un détenteur (ou un Vanguard, en secours) accepte/refuse SES objets. Applique le prix auto du dépôt. */
export async function applyHolderDecision(client: Client, key: string, action: "accept" | "refuse", clickerId: string, clickerName: string, staff: boolean): Promise<{ mine: number; done: boolean }> {
  const pend = await prisma.bankRequest.findMany({ where: { OR: [{ id: key }, { batchId: key }], status: "PENDING" } });
  if (!pend.length) return { mine: 0, done: true };
  const mine: any[] = [];
  for (const r of pend) {
    const owners = await resolveOwners([r.item || ""]);
    const primary = owners.slice().sort((a, b) => b.qty - a.qty)[0];
    if (staff || (primary?.discordId && primary.discordId === clickerId)) mine.push(r);
  }
  if (!mine.length) return { mine: 0, done: false };
  for (const r of mine) {
    if (action === "accept") await applyBankAccept(client, r.id, reqMode(r), clickerName);
    else await applyBankRefuse(client, r.id, clickerName);
  }
  await refreshDiscussion(client, key);
  const still = await prisma.bankRequest.count({ where: { OR: [{ id: key }, { batchId: key }], status: "PENDING" } });
  return { mine: mine.length, done: still === 0 };
}

/** Conclusion de l'échange : Remis / Refusé (ne touche que les objets déjà acceptés). */
export async function applyExchangeDecision(client: Client, key: string, action: "remis" | "refuse", actor: string): Promise<void> {
  const targets = await prisma.bankRequest.findMany({ where: { OR: [{ id: key }, { batchId: key }], status: { in: ACCEPTED as any } } });
  if (!targets.length) return;
  const status = action === "remis" ? "REMIS" : "REFUSE";
  await prisma.bankRequest.updateMany({ where: { id: { in: targets.map((r) => r.id) } }, data: { status: status as any, decidedBy: actor, discordSynced: false } });
  await prisma.auditLog.create({ data: { actor, action: `echange.${status}`, target: key, detail: targets[0]?.item ?? "" } }).catch(() => {});
  await refreshDiscussion(client, key);
  const first = await prisma.bankRequest.findFirst({ where: { OR: [{ id: key }, { batchId: key }] } });
  if (!first?.exchangeChannelId) return;
  try {
    const ch: any = await client.channels.fetch(first.exchangeChannelId);
    if (ch?.isTextBased()) await ch.send({ content: status === "REMIS" ? `✅ Objet(s) **remis** — échange clôturé par **${actor}**. Ce salon sera **supprimé** d'ici une minute.` : `❌ Échange **annulé** par **${actor}**. Ce salon sera **supprimé** d'ici une minute.` }).catch(() => {});
  } catch { /* ignore */ }
}
