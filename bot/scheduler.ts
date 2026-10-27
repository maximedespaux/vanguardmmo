// ════════════════════════════════════════════════════════════
//  PLANIFICATEUR (rappels automatiques)
//  - Candidatures en attente → relance dans #candidatures
//  - Événements du jeu → annonce selon EVENTS (config.ts)
//  - Chambres Secrètes et Guild Siege → tick à la minute + panneau
//    vivant (bot/lib/seances.ts)
//  - Vidéos de débrief → purge du volume chaque nuit à 4 h 30
// ════════════════════════════════════════════════════════════
import cron from "node-cron";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import type { Role } from "@prisma/client";
import { prisma } from "./lib/prisma.js";
import { CHANNELS, ROLE_OFFICIER, CANDIDATURE_REMIND_AFTER_HOURS, GUILD_ID, RANK_ROLES, highestRankFromRoles } from "./config.js";
import { ORANGE, CRON_TZ } from "./lib/helpers.js";
import { rangRelu } from "@/lib/gestes";
import { memesRoles } from "@/config/amis";
import { postApplicationDecision } from "./lib/decisions.js";
import { endDueGiveaways } from "./lib/giveaways.js";
import { syncGuildChannels, processBotCommands } from "./lib/botcommands.js";
import { syncGuildRoles } from "./lib/moderation.js";
import { purgerLesVideos, synchroniserChrono, synchroniserMessages, tickSeances } from "./lib/seances.js";

async function sendTo(client: Client, channelId: string, payload: any) {
  if (!channelId) return;
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch && ch.isTextBased()) await (ch as TextChannel).send(payload);
  } catch (e) {
    console.error("Envoi impossible vers le salon", channelId, e);
  }
}
// ── Chambres Secrètes et Guild Siege ──────────────────────────────────────────
// Les quatre cron fixes des Chambres (la veille et le jour à 20 h) et les deux du Guild Siege
// sont partis au lot 3 (SPEC-CHAMBRES §8.5) : un tick par minute (bot/lib/seances.ts) lit les
// horaires, les textes et les interrupteurs dans le paramétrage des bras droits, en base. Il
// compte l'effectif sur les annonces DE LA SÉANCE (bornées à sa fenêtre de préparation) — le
// rappel d'avant comptait toutes les annonces du créneau depuis toujours (piège n° 3).

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

// ─── Synchro périodique des RANGS (GuildViewer à jour) ──────
//  Lit les rôles Discord en live et met à jour User.role en base, sans
//  attendre que le membre se reconnecte. Prudent : n'écrase JAMAIS tout
//  le monde en RECRUE si le fetch échoue ou si le mapping n'est pas configuré.
//  Les rôles bruts (User.discordRoles) suivent aussi quand ils bougent seuls :
//  c'est par eux que le site reconnaît un ami (rôle Friend).
async function syncMemberRanks(client: Client) {
  if (!GUILD_ID || !Object.values(RANK_ROLES).some(Boolean)) return;
  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  if (!guild) return;
  const members = await guild.members.fetch().catch(() => null);
  if (!members || members.size === 0) return; // fetch KO → on ne rétrograde personne
  const users = await prisma.user.findMany({ select: { id: true, discordId: true, role: true, discordRoles: true } });
  let changed = 0;
  let relus = 0;
  for (const u of users) {
    const m = members.get(u.discordId);
    if (!m) continue; // parti du serveur / introuvable → inchangé
    /* Sans @everyone (l'identifiant du serveur), que discord.js glisse dans tout
       `roles.cache` : la connexion (src/lib/auth.ts) écrit la liste de l'API Discord, qui ne
       le porte pas. Gardé, il faisait différer les deux listes à chaque passage après une
       connexion — une écriture pour rien par compte —, et un réglage des amis qui
       nommerait l'identifiant du serveur reconnaîtrait les comptes vus par le bot, pas les
       autres. */
    const roleIds = [...m.roles.cache.keys()].filter((id) => id !== guild.id);
    const newRole = highestRankFromRoles(roleIds);
    if (newRole !== u.role) {
      /* Un rang de guilde retrouvé sur Discord, c'est un RETOUR : la sortie de la guilde,
         l'exclusion et le bannissement l'avaient marqué inactif (lib/gestes, `rangRelu`). */
      await prisma.user.update({ where: { id: u.id }, data: { ...rangRelu(newRole as Role), discordRoles: roleIds } }).catch(() => {});
      changed++;
    } else if (!memesRoles(u.discordRoles, roleIds)) {
      /* LES RÔLES SEULS, rang inchangé. Ils n'étaient réécrits qu'avec un changement de
         rang : le rôle Discord « Friend », posé ou retiré à un ami (hors guilde, donc
         toujours RECRUE), n'atteignait le site qu'à sa prochaine connexion — or le site ne
         lit pas Discord, il lit cette colonne (src/lib/auth.ts, src/config/amis.ts,
         SPEC-INFORMATION-GUILDE §9). Seuls les comptes dont un rôle a bougé sont écrits. */
      await prisma.user.update({ where: { id: u.id }, data: { discordRoles: roleIds } }).catch(() => {});
      relus++;
    }
  }
  if (changed) console.log(`🔄 Rangs resynchronisés : ${changed} membre(s).`);
  if (relus) console.log(`🔄 Rôles Discord relus : ${relus} compte(s).`);
}

export function startScheduler(client: Client) {
  // Candidatures : relance staff toutes les 2 heures.
  cron.schedule("0 */2 * * *", () => remindApplications(client).catch(console.error), CRON_TZ);
  // Relais des nouvelles candidatures (site → salon Décision) toutes les 2 minutes.
  cron.schedule("*/2 * * * *", () => relayNewApplications(client).catch(console.error), CRON_TZ);
  // La Boutique, les dettes et leurs salons d'échange ont quitté le site le
  // 2026-10-21 : leurs relais (requêtes, salons, clôtures) sont partis avec eux.
  // Clôture des giveaways arrivés à échéance, chaque minute.
  cron.schedule("* * * * *", () => endDueGiveaways(client).catch(console.error), CRON_TZ);
  // Pilotage depuis le site : cache des salons et des rôles + consommation de la file de commandes.
  syncGuildChannels(client).catch(console.error);
  setInterval(() => syncGuildChannels(client).catch(console.error), 10 * 60_000);
  syncGuildRoles(client).catch(console.error);
  setInterval(() => syncGuildRoles(client).catch(console.error), 10 * 60_000);
  setInterval(() => processBotCommands(client).catch(console.error), 12_000);
  // Synchro des rangs (GuildViewer à jour) : au démarrage + toutes les 10 min.
  syncMemberRanks(client).catch(console.error);
  setInterval(() => syncMemberRanks(client).catch(console.error), 10 * 60_000);
  // Événements du jeu : tick chaque minute (lus en base, éditables sur le site).
  cron.schedule("* * * * *", () => tickEvents(client).catch(console.error), CRON_TZ);
  // Chambres Secrètes et Guild Siege : un tick par minute à la place des tâches fixes — les
  // horaires se règlent sur /discord/evenements, sans redémarrer le bot. Coupés par défaut
  // (interrupteurs de /discord), et le Guild Siege reste inactif tant que le staff ne l'active
  // pas (décision du 2026-10-21).
  cron.schedule("* * * * *", () => tickSeances(client).catch(console.error), CRON_TZ);
  // Le panneau d'inscription vivant : recalculé toutes les 15 s, modifié s'il a changé.
  setInterval(() => synchroniserMessages(client).catch(console.error), 15_000);
  // Le chrono en direct (lot 5) : toutes les 10 s, et seulement pendant qu'il tourne — un clic
  // fait sur le site se voit dans Discord en 10 s au plus.
  setInterval(() => synchroniserChrono(client).catch(console.error), 10_000);
  // Les vidéos de débrief (lot 8) : chaque nuit à 4 h 30, les fichiers des séances plus anciennes
  // que la conservation du paramétrage, les envois abandonnés et les fichiers oubliés quittent le
  // volume `vanguard_videos` (monté aussi dans ce service). Les liens restent.
  cron.schedule("30 4 * * *", () => { purgerLesVideos().catch(console.error); }, CRON_TZ);
  console.log("🕒 Planificateur démarré.");
}
