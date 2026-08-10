// ════════════════════════════════════════════════════════════
//  Pilotage du bot depuis le site (page « Discord »).
//  - syncGuildChannels : met à jour le cache des salons (pour les
//    menus déroulants du site).
//  - processBotCommands : consomme la file BotCommand (outbox) et
//    exécute chaque commande (post embed / giveaway / panneau classes).
// ════════════════════════════════════════════════════════════
import { Client, EmbedBuilder, ChannelType } from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";
import { createGiveaway } from "./giveaways.js";
import { postClassPanel } from "./classpanel.js";
import { executeModeration, repercuteEnBase } from "./moderation.js";

const CHAN_TYPE: Record<number, string> = {
  [ChannelType.GuildText]: "text",
  [ChannelType.GuildAnnouncement]: "announcement",
  [ChannelType.GuildForum]: "forum",
  [ChannelType.GuildVoice]: "voice",
  [ChannelType.GuildCategory]: "category",
};

/** Met à jour le cache GuildChannel (lu par le site pour ses menus de salons). */
export async function syncGuildChannels(client: Client) {
  for (const [, guild] of client.guilds.cache) {
    try {
      const chans = await guild.channels.fetch();
      const seen: string[] = [];
      for (const [, ch] of chans) {
        if (!ch) continue;
        const type = CHAN_TYPE[ch.type];
        if (!type) continue;
        seen.push(ch.id);
        await prisma.guildChannel.upsert({
          where: { id: ch.id },
          create: { id: ch.id, guildId: guild.id, name: ch.name, type, position: (ch as any).rawPosition ?? 0 },
          update: { name: ch.name, type, position: (ch as any).rawPosition ?? 0 },
        });
      }
      // purge des salons supprimés (le fetch a réussi → la liste fait foi)
      await prisma.guildChannel.deleteMany({ where: { guildId: guild.id, id: { notIn: seen } } });
    } catch (e) { console.error("[botcommands] syncGuildChannels:", e); }
  }
}

function buildEmbed(p: any): EmbedBuilder {
  const e = new EmbedBuilder().setColor(typeof p.color === "number" ? p.color : ORANGE);
  if (p.title) e.setTitle(String(p.title).slice(0, 256));
  if (p.description) e.setDescription(String(p.description).replace(/\\n/g, "\n").slice(0, 4000));
  if (p.image && /^https?:\/\//i.test(p.image)) e.setImage(p.image);
  if (p.thumbnail && /^https?:\/\//i.test(p.thumbnail)) e.setThumbnail(p.thumbnail);
  if (p.footer) e.setFooter({ text: String(p.footer).slice(0, 2048) });
  return e;
}

async function doPostEmbed(client: Client, p: any): Promise<string> {
  const ch: any = await client.channels.fetch(p.channelId);
  if (!ch || !ch.isTextBased?.() || ch.type === ChannelType.GuildForum) throw new Error("Salon texte requis");
  if (!p.title && !p.description && !p.image) throw new Error("Embed vide (titre/description/image requis)");
  const sent = await ch.send({ embeds: [buildEmbed(p)] });
  return sent.id;
}

let processing = false; // garde anti-réentrance (un seul tick à la fois → pas de double-exécution)

/** Consomme la file d'attente des commandes du site. */
export async function processBotCommands(client: Client) {
  if (processing) return;
  processing = true;
  try {
  const cmds = await prisma.botCommand.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 5 });
  for (const cmd of cmds) {
    try {
      const p: any = cmd.payload ?? {};
      let result = "";
      if (cmd.type === "post_embed") result = "message " + (await doPostEmbed(client, p));
      else if (cmd.type === "create_giveaway") result = "giveaway " + (await createGiveaway(client, { channelId: p.channelId, prize: p.prize, prizes: p.prizes, description: p.description, winnersCount: p.winnersCount ?? 1, durationMs: p.durationMs, hostId: p.hostId || cmd.createdBy, embedTitle: p.embedTitle, embedColor: p.embedColor, embedImage: p.embedImage }));
      else if (cmd.type === "post_class_panel") result = "panneau " + (await postClassPanel(client, p.channelId));
      else if (cmd.type === "moderation") {
        result = await executeModeration(client, p);
        await repercuteEnBase(p.action, p.discordId);
        // Le dossier du membre lit la décision, pas la file : c'est elle qui
        // doit porter le verdict, sinon le site affiche « en attente » à vie.
        if (p.actionId) await prisma.actionMembre.update({ where: { id: p.actionId }, data: { statut: "FAITE", resultat: result.slice(0, 500), faiteAt: new Date() } }).catch(() => {});
      }
      else throw new Error("type de commande inconnu: " + cmd.type);
      await prisma.botCommand.update({ where: { id: cmd.id }, data: { status: "DONE", result, processedAt: new Date() } });
    } catch (e: any) {
      const pourquoi = String(e?.message ?? e).slice(0, 500);
      const p: any = cmd.payload ?? {};
      if (cmd.type === "moderation" && p.actionId)
        await prisma.actionMembre.update({ where: { id: p.actionId }, data: { statut: "ECHOUEE", resultat: pourquoi, faiteAt: new Date() } }).catch(() => {});
      await prisma.botCommand.update({ where: { id: cmd.id }, data: { status: "FAILED", result: pourquoi, processedAt: new Date() } });
    }
  }
  } finally { processing = false; }
}
