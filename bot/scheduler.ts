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
// Module partage avec le site : c'est lui qui garantit la forme du blob des
// Chambres Secretes, donc la fiabilite de l'effectif annonce ici.
import { normaliserCompo, presencesDu, resumeManques, type Creneau } from "@/lib/compositions";
import { postApplicationDecision, postBankRequestDecision, postBankBatchDecision, syncDecidedBankRequests } from "./lib/decisions.js";
import { openDiscussion } from "./lib/exchange.js";
import { endDueGiveaways } from "./lib/giveaways.js";
import { syncGuildChannels, processBotCommands } from "./lib/botcommands.js";

async function sendTo(client: Client, channelId: string, payload: any) {
  if (!channelId) return;
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch && ch.isTextBased()) await (ch as TextChannel).send(payload);
  } catch (e) {
    console.error("Envoi impossible vers le salon", channelId, e);
  }
}
// ── Rappels Chambres Secretes (mercredi et dimanche, 21h) ────────────────────
// Deux rappels : la veille a 20h pour se preparer (stuff, presences), puis a 20h
// le jour meme pour se connecter. Mention @everyone, mais UNIQUEMENT dans le salon
// de la guilde — et seulement si l'interrupteur du site est actif : le jeu peut
// etre indisponible, et un @everyone deux fois par semaine dans le vide apprend
// surtout aux membres a ignorer le salon.
const SALON_CS = "1498696982229811352";

async function rappelsActifs(cle: string): Promise<boolean> {
  try {
    const r = await prisma.setting.findUnique({ where: { key: cle } });
    return r?.value === "1"; // coupes par defaut : on n'annonce jamais sans decision explicite
  } catch {
    return false; // base injoignable : on se tait plutot que de risquer un envoi non voulu
  }
}

/**
 * Rappel d'un creneau recurrent. `cle` est le reglage qui l'autorise ; il est
 * COUPE par defaut et se pilote depuis la page « Bot Discord » du site.
 */
async function rappelCreneau(
  client: Client,
  opts: { cle: string; titre: string; heure: string; quand: "veille" | "jour"; creneau?: Creneau }
) {
  if (!(await rappelsActifs(opts.cle))) return;
  const { titre, heure, quand, creneau } = opts;
  const veille = quand === "veille";

  // Effectif manquant. La forme des donnees est desormais garantie par
  // normaliserCompo (module partage avec le site), ce qui rend ce compte fiable
  // — c'etait le seul blocage a l'annoncer ici.
  let effectif = "";
  if (creneau) {
    try {
      const row = await prisma.compositionState.findUnique({ where: { id: "main" } });
      const etat = normaliserCompo(row?.data);
      const presents = presencesDu(etat, creneau).length;
      const manque = resumeManques(etat, creneau);
      effectif = manque
        ? `\n\n**Effectif : ${presents} annonce${presents > 1 ? "s" : ""}.** Il manque ${manque}.`
        : `\n\n**Effectif au complet** (${presents} annonces). Merci a tout le monde.`;
    } catch {
      /* Blob illisible ou base indisponible : on envoie le rappel sans effectif
         plutot que d'annoncer un chiffre faux. */
    }
  }
  await sendTo(client, SALON_CS, {
    content: "@everyone",
    allowedMentions: { parse: ["everyone"] },
    embeds: [{
      title: veille ? `${titre} demain a ${heure}` : `${titre} ce soir a ${heure}`,
      color: ORANGE,
      description: (veille
        ? "Prepare ton stuff et annonce ta presence des maintenant, pour qu'on puisse composer les equipes a l'avance."
        : `Rendez-vous a **${heure}** en vocal. Verifie ton stuff et ta composition avant de te connecter.`) + effectif,
      footer: { text: `Vanguard · ${titre}` },
      timestamp: new Date().toISOString(),
    }],
  });
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

// ─── Ouverture du salon de discussion DÈS la requête (statut PENDING) ────
//  Désactivé tant que CHANNEL_EXCHANGE_CATEGORY n'est pas configuré (openDiscussion no-op).
async function openDiscussions(client: Client) {
  if (!CHANNELS.exchangeCategory) return;
  const fresh = await prisma.bankRequest.findMany({
    where: { status: "PENDING", exchangeChannelId: null },
    orderBy: { createdAt: "asc" }, take: 30,
  });
  if (!fresh.length) return;
  const batches = new Map<string, typeof fresh>();
  for (const r of fresh) {
    const key = r.batchId || `single:${r.id}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key)!.push(r);
  }
  for (const reqs of batches.values()) await openDiscussion(client, reqs).catch((e) => console.error("openDiscussion:", e));
}

// ─── Suppression des salons d'échange terminés (Remis / Refusé) ─
//  Robuste aux redémarrages du bot (pas de setTimeout perdu). ~90 s de battement
//  pour laisser lire le message final, puis le salon est supprimé.
async function closeFinishedExchanges(client: Client) {
  if (!CHANNELS.exchangeCategory) return;
  const grace = new Date(Date.now() - 90_000);
  const done = await prisma.bankRequest.findMany({
    where: { status: { in: ["REMIS", "REFUSE"] }, exchangeChannelId: { not: null }, updatedAt: { lt: grace } },
    take: 40,
  });
  if (!done.length) return;
  const channelIds = [...new Set(done.map((r) => r.exchangeChannelId!).filter(Boolean))];
  for (const cid of channelIds) {
    // Ne supprime QUE si toute la transaction de ce salon est conclue (aucun objet encore en attente ou en cours).
    const open = await prisma.bankRequest.count({ where: { exchangeChannelId: cid, status: { in: ["PENDING", "ACCEPTE_ACHAT", "ACCEPTE_DETTE", "EN_ECHANGE"] } } });
    if (open > 0) continue;
    try {
      const ch: any = await client.channels.fetch(cid).catch(() => null);
      if (ch?.delete) await ch.delete("Échange terminé").catch(() => {});
    } catch { /* déjà supprimé : on ignore */ }
    await prisma.bankRequest.updateMany({ where: { exchangeChannelId: cid }, data: { exchangeChannelId: null } });
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
  // ─── Boutique & dettes : Discord est COUPE ────────────────────────────
  // Decision de Maxime : tout se passe sur le site, pour ne plus jongler entre
  // deux outils. Les crons qui relayaient les demandes, ouvraient un salon
  // relayBankRequests, syncDecidedBankRequests, openDiscussions,
  // closeFinishedExchanges). Leur remplacant est le fil de discussion du site
  // (RequestMessage + /api/*/[id]/fil), qui porte la conversation ET le journal.
  //
  // remindDebts est CONSERVE mais n'envoie plus de message prive : il pose une
  // notification sur le site. Une echeance qui approche doit encore alerter —
  // la supprimer avec le reste aurait fait disparaitre le seul rappel
  // automatique du suivi des dettes.
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
  // Chambres Secretes : mercredi (3) et dimanche (0) a 21h.
  // Veille a 20h -> mardi (2) et samedi (6) ; jour meme a 20h -> mercredi et dimanche.
  const CS = { cle: "cs_rappels_actifs", titre: "Chambres Secretes", heure: "21h" };
  // Mardi -> mercredi, samedi -> dimanche : chaque rappel parle du creneau qu'il annonce.
  cron.schedule("0 20 * * 2", () => rappelCreneau(client, { ...CS, quand: "veille", creneau: "mer" }).catch(console.error), CRON_TZ);
  cron.schedule("0 20 * * 6", () => rappelCreneau(client, { ...CS, quand: "veille", creneau: "dim" }).catch(console.error), CRON_TZ);
  cron.schedule("0 20 * * 3", () => rappelCreneau(client, { ...CS, quand: "jour", creneau: "mer" }).catch(console.error), CRON_TZ);
  cron.schedule("0 20 * * 0", () => rappelCreneau(client, { ...CS, quand: "jour", creneau: "dim" }).catch(console.error), CRON_TZ);
  // Guild Siege : meme mecanique, mais l'HORAIRE RESTE A CONFIRMER. En attendant il
  // est cale sur samedi 21h ; l'interrupteur est coupe par defaut, donc rien ne part
  // tant que le creneau n'a pas ete valide.
  const GS = { cle: "gs_rappels_actifs", titre: "Guild Siege", heure: "21h" };
  cron.schedule("0 20 * * 5", () => rappelCreneau(client, { ...GS, quand: "veille" }).catch(console.error), CRON_TZ);
  cron.schedule("0 20 * * 6", () => rappelCreneau(client, { ...GS, quand: "jour" }).catch(console.error), CRON_TZ);
  console.log("🕒 Planificateur démarré.");
}
