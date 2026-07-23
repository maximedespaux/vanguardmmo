// ════════════════════════════════════════════════════════════
//  PLANIFICATEUR (rappels automatiques)
//  - Candidatures en attente → relance dans #candidatures
//  - Événements du jeu → annonce selon EVENTS (config.ts)
// ════════════════════════════════════════════════════════════
import cron from "node-cron";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import type { Role } from "@prisma/client";
import { prisma } from "./lib/prisma.js";
import { CHANNELS, ROLE_OFFICIER, CANDIDATURE_REMIND_AFTER_HOURS, GUILD_ID, RANK_ROLES, highestRankFromRoles } from "./config.js";
import { ORANGE, CRON_TZ } from "./lib/helpers.js";
import { postApplicationDecision, postDebtDecision, postBankRequestDecision, postBankBatchDecision, syncDecidedBankRequests } from "./lib/decisions.js";
import { openExchange } from "./lib/exchange.js";
import { endDueGiveaways } from "./lib/giveaways.js";
import { syncGuildChannels, processBotCommands } from "./lib/botcommands.js";
import { dm } from "./lib/debts.js";

async function sendTo(client: Client, channelId: string, payload: any) {
  if (!channelId) return;
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch && ch.isTextBased()) await (ch as TextChannel).send(payload);
  } catch (e) {
    console.error("Envoi impossible vers le salon", channelId, e);
  }
}

// ─── Rappel des candidatures en attente ─────────────────────
async function remindApplications(client: Client) {
  const cutoff = new Date(Date.now() - CANDIDATURE_REMIND_AFTER_HOURS * 3600_000);
  const dayAgo = new Date(Date.now() - 24 * 3600_000);

  const pending = await prisma.application.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      OR: [{ remindedAt: null }, { remindedAt: { lt: dayAgo } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (pending.length === 0) return;

  const lines = pending.map((a) => {
    const since = Math.floor((Date.now() - a.createdAt.getTime()) / 3600_000);
    return `• **${a.username}** — en attente depuis ${since}h`;
  });
  const ping = ROLE_OFFICIER ? `<@&${ROLE_OFFICIER}> ` : "";
  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle(`📋 ${pending.length} candidature(s) en attente`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: "À traiter sur le site → Candidatures" });

  const target = CHANNELS.staff || CHANNELS.candidatures;
  await sendTo(client, target, { content: ping, embeds: [embed] });

  await prisma.application.updateMany({
    where: { id: { in: pending.map((a) => a.id) } },
    data: { remindedAt: new Date() },
  });
}

// ─── Événements du jeu (lus EN BASE, éditables sur le site) ──
//  Un tick chaque minute compare l'heure de Paris aux events activés.
//  → modifiables en live depuis la page admin, sans redémarrer le bot.
function subMin(t: string, mins: number): string {
  const [h, m] = t.split(":").map(Number);
  const x = ((((h || 0) * 60 + (m || 0) - mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
}
type EventRow = { name: string; time: string; day: string; remindBefore: number; embedTitle: string | null; embedDesc: string | null; embedColor: string | null; embedImage: string | null };
function eventEmbed(ev: EventRow, kind: "now" | "soon") {
  const e = new EmbedBuilder()
    .setTitle((ev.embedTitle && ev.embedTitle.trim()) || `🔔 ${ev.name}`)
    .setColor(ev.embedColor && /^#[0-9a-fA-F]{6}$/.test(ev.embedColor) ? parseInt(ev.embedColor.slice(1), 16) : ORANGE)
    .setFooter({ text: `${ev.day === "tous" ? "Tous les jours" : ev.day} · ${ev.time}` });
  const lines: string[] = [];
  if (ev.embedDesc && ev.embedDesc.trim()) lines.push(ev.embedDesc.trim());
  lines.push(kind === "now" ? "**C'est parti — ça commence maintenant !** 🔔" : `⏰ Commence dans **${ev.remindBefore} min** !`);
  e.setDescription(lines.join("\n\n"));
  if (ev.embedImage && /^https?:\/\//.test(ev.embedImage)) e.setImage(ev.embedImage);
  return e;
}
async function tickEvents(client: Client) {
  const now = new Date();
  const dayFr = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long" }).format(now).toLowerCase();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const hhmm = `${parts.find((p) => p.type === "hour")?.value ?? "00"}:${parts.find((p) => p.type === "minute")?.value ?? "00"}`;
  let events;
  try { events = await prisma.gameEvent.findMany({ where: { enabled: true } }); } catch { return; }
  for (const ev of events) {
    if (ev.day !== "tous" && ev.day !== dayFr) continue;
    const channelId = ev.channelId || CHANNELS.events;
    const ping = ev.mention ? ev.mention + " " : "";
    if (subMin(ev.time, 0) === hhmm)
      await sendTo(client, channelId, { content: ping || undefined, embeds: [eventEmbed(ev, "now")] });
    if (ev.remindBefore > 0 && subMin(ev.time, ev.remindBefore) === hhmm)
      await sendTo(client, channelId, { content: ping || undefined, embeds: [eventEmbed(ev, "soon")] });
  }
}

// ─── Relais des candidatures créées sur le SITE ─────────────
//  Toute candidature en attente sans embed Décision (messageId null)
//  est postée dans le salon Décision. Ainsi, qu'elle vienne du bot
//  (/candidature) ou du site, le staff la voit avec ses boutons.
async function relayNewApplications(client: Client) {
  if (!CHANNELS.decision) return;
  const fresh = await prisma.application.findMany({
    where: { status: { in: ["PENDING", "WAITING", "INTERVIEW"] }, messageId: null },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  for (const app of fresh) {
    await postApplicationDecision(client, app).catch((e) => console.error("relay candidature:", e));
  }
}

// ─── Relais des demandes de DETTE créées sur le site ────────
async function relayNewDebts(client: Client) {
  if (!CHANNELS.decision) return;
  const fresh = await prisma.debt.findMany({
    where: { status: { in: ["REQUESTED", "PENDING_VALIDATION"] }, messageId: null },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  for (const debt of fresh) await postDebtDecision(client, debt).catch((e) => console.error("relay dette:", e));
}

// ─── Relais des requêtes BANQUE créées sur le site ──────────
async function relayBankRequests(client: Client) {
  if (!CHANNELS.decision) return;
  const fresh = await prisma.bankRequest.findMany({
    where: { status: "PENDING", messageId: null },
    orderBy: { createdAt: "asc" },
    take: 60,
  });
  // Regroupe par panier (batchId) → 1 seul message Discord par transaction (anti-spam)
  const batches = new Map<string, typeof fresh>();
  for (const r of fresh) {
    const key = r.batchId || `single:${r.id}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key)!.push(r);
  }
  for (const reqs of batches.values()) {
    if (reqs[0].batchId) await postBankBatchDecision(client, reqs).catch((e) => console.error("relay banque batch:", e));
    else await postBankRequestDecision(client, reqs[0]).catch((e) => console.error("relay banque:", e));
  }
}

// ─── Ouverture des salons d'échange (requêtes acceptées) ────
//  Désactivé tant que CHANNEL_EXCHANGE_CATEGORY n'est pas configuré (openExchange no-op).
async function openPendingExchanges(client: Client) {
  if (!CHANNELS.exchangeCategory) return;
  const fresh = await prisma.bankRequest.findMany({
    where: { status: { in: ["ACCEPTE_ACHAT", "ACCEPTE_DETTE"] }, exchangeChannelId: null },
    orderBy: { createdAt: "asc" }, take: 30,
  });
  if (!fresh.length) return;
  const batches = new Map<string, typeof fresh>();
  for (const r of fresh) {
    const key = r.batchId || `single:${r.id}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key)!.push(r);
  }
  for (const reqs of batches.values()) await openExchange(client, reqs).catch((e) => console.error("openExchange:", e));
}

// ─── Rappel d'échéance des dettes acceptées ─────────────────
async function remindDebts(client: Client) {
  const now = new Date();
  const soon = new Date(Date.now() + 48 * 3600_000);   // échéance dans <48h ou dépassée
  const dayAgo = new Date(Date.now() - 24 * 3600_000); // un rappel par 24h max
  const debts = await prisma.debt.findMany({
    where: {
      status: "ACCEPTED",
      dueDate: { not: null, lte: soon },
      OR: [{ remindedAt: null }, { remindedAt: { lt: dayAgo } }],
    },
    include: { user: true },
  });
  if (debts.length === 0) return;

  for (const d of debts) {
    const due = d.dueDate as Date;
    const when = due.toLocaleDateString("fr-FR");
    const amount = Number(d.amount).toLocaleString("fr-FR");
    const obj = d.item ? ` / ${d.item}` : "";
    await dm(client, d.user.discordId, {
      content: due < now
        ? `⏰ Rappel : ta dette envers **Vanguard** (**${amount} penya**${obj}) est **arrivée à échéance** (${when}). Pense à la régler. 🙏`
        : `⏳ Rappel : ta dette envers **Vanguard** (**${amount} penya**${obj}) arrive à échéance le **${when}**.`,
    });
  }
  await prisma.debt.updateMany({ where: { id: { in: debts.map((d) => d.id) } }, data: { remindedAt: now } });

  // Récap staff des dettes en retard
  const overdue = debts.filter((d) => (d.dueDate as Date) < now);
  if (overdue.length && CHANNELS.staff) {
    const ping = ROLE_OFFICIER ? `<@&${ROLE_OFFICIER}> ` : "";
    const lines = overdue.map((d) => `• **${d.user.username}** — ${Number(d.amount).toLocaleString("fr-FR")} penya (échéance ${(d.dueDate as Date).toLocaleDateString("fr-FR")})`);
    const embed = new EmbedBuilder().setColor(ORANGE).setTitle(`💰 ${overdue.length} dette(s) en retard`).setDescription(lines.join("\n")).setFooter({ text: "À suivre côté Banque" });
    await sendTo(client, CHANNELS.staff, { content: ping, embeds: [embed] });
  }
}

// ─── Synchro périodique des RANGS (GuildViewer à jour) ──────
//  Lit les rôles Discord en live et met à jour User.role en base, sans
//  attendre que le membre se reconnecte. Prudent : n'écrase JAMAIS tout
//  le monde en RECRUE si le fetch échoue ou si le mapping n'est pas configuré.
async function syncMemberRanks(client: Client) {
  if (!GUILD_ID || !Object.values(RANK_ROLES).some(Boolean)) return;
  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  if (!guild) return;
  const members = await guild.members.fetch().catch(() => null);
  if (!members || members.size === 0) return; // fetch KO → on ne rétrograde personne
  const users = await prisma.user.findMany({ select: { id: true, discordId: true, role: true } });
  let changed = 0;
  for (const u of users) {
    const m = members.get(u.discordId);
    if (!m) continue; // parti du serveur / introuvable → inchangé
    const roleIds = [...m.roles.cache.keys()];
    const newRole = highestRankFromRoles(roleIds);
    if (newRole !== u.role) {
      await prisma.user.update({ where: { id: u.id }, data: { role: newRole as Role, discordRoles: roleIds } }).catch(() => {});
      changed++;
    }
  }
  if (changed) console.log(`🔄 Rangs resynchronisés : ${changed} membre(s).`);
}

export function startScheduler(client: Client) {
  // Candidatures : relance staff toutes les 2 heures.
  cron.schedule("0 */2 * * *", () => remindApplications(client).catch(console.error), CRON_TZ);
  // Relais des nouvelles candidatures (site → salon Décision) toutes les 2 minutes.
  cron.schedule("*/2 * * * *", () => relayNewApplications(client).catch(console.error), CRON_TZ);
  cron.schedule("*/2 * * * *", () => relayNewDebts(client).catch(console.error), CRON_TZ);
  cron.schedule("*/2 * * * *", () => relayBankRequests(client).catch(console.error), CRON_TZ);
  cron.schedule("*/2 * * * *", () => syncDecidedBankRequests(client).catch(console.error), CRON_TZ); // rafraîchit l'embed après décision sur le site
  cron.schedule("*/2 * * * *", () => openPendingExchanges(client).catch(console.error), CRON_TZ);    // ouvre les salons d'échange (si CHANNEL_EXCHANGE_CATEGORY configuré)
  cron.schedule("0 */6 * * *", () => remindDebts(client).catch(console.error), CRON_TZ);
  // Clôture des giveaways arrivés à échéance, chaque minute.
  cron.schedule("* * * * *", () => endDueGiveaways(client).catch(console.error), CRON_TZ);
  // Pilotage depuis le site : cache des salons + consommation de la file de commandes.
  syncGuildChannels(client).catch(console.error);
  setInterval(() => syncGuildChannels(client).catch(console.error), 10 * 60_000);
  setInterval(() => processBotCommands(client).catch(console.error), 12_000);
  // Synchro des rangs (GuildViewer à jour) : au démarrage + toutes les 10 min.
  syncMemberRanks(client).catch(console.error);
  setInterval(() => syncMemberRanks(client).catch(console.error), 10 * 60_000);
  // Événements du jeu : tick chaque minute (lus en base, éditables sur le site).
  cron.schedule("* * * * *", () => tickEvents(client).catch(console.error), CRON_TZ);
  console.log("🕒 Planificateur démarré.");
}
