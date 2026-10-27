// ════════════════════════════════════════════════════════════
//  Pilotage du bot depuis le site (page « Discord »).
//  - syncGuildChannels : met à jour le cache des salons (pour les
//    menus déroulants du site), et la liste des salons visibles de
//    @everyone (Setting « salons_publics »).
//  - processBotCommands : consomme la file BotCommand (outbox) et
//    exécute chaque commande (post embed / giveaway / panneau classes,
//    et celles des Chambres Secrètes).
// ════════════════════════════════════════════════════════════
import { Client, EmbedBuilder, ChannelType, PermissionFlagsBits, type GuildBasedChannel } from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";
import { createGiveaway } from "./giveaways.js";
import { postClassPanel } from "./classpanel.js";
import { executeModeration, repercuteEnBase } from "./moderation.js";
import { commandeAnnulation, commandeEchange, commandeEssai, commandeFermer, commandePublier, publierDebrief } from "./seances.js";

const CHAN_TYPE: Record<number, string> = {
  [ChannelType.GuildText]: "text",
  [ChannelType.GuildAnnouncement]: "announcement",
  [ChannelType.GuildForum]: "forum",
  [ChannelType.GuildVoice]: "voice",
  [ChannelType.GuildCategory]: "category",
};

/** Un salon que @everyone peut lire : les visiteurs et les candidats du serveur le voient. */
function visibleDeTous(ch: GuildBasedChannel): boolean {
  const perms = ch.permissionsFor(ch.guild.roles.everyone);
  return !!perms?.has(PermissionFlagsBits.ViewChannel);
}

/**
 * Met à jour le cache GuildChannel (lu par le site pour ses menus de salons) — et la liste des
 * salons VISIBLES DE @everyone, dans `Setting("salons_publics")` (un tableau JSON d'ids). Seul le
 * bot connaît les permissions : le paramétrage des événements la lit pour prévenir que les
 * chiffres des membres ne seront pas publiés dans un tel salon (SPEC-CHAMBRES §9.3, piège
 * n° 22). Le modèle `GuildChannel` n'est pas touché (aucune colonne existante modifiée).
 */
export async function syncGuildChannels(client: Client) {
  const publics: string[] = [];
  let lus = 0;
  for (const [, guild] of client.guilds.cache) {
    try {
      const chans = await guild.channels.fetch();
      const seen: string[] = [];
      for (const [, ch] of chans) {
        if (!ch) continue;
        const type = CHAN_TYPE[ch.type];
        if (!type) continue;
        seen.push(ch.id);
        if ((type === "text" || type === "announcement" || type === "forum") && visibleDeTous(ch)) publics.push(ch.id);
        await prisma.guildChannel.upsert({
          where: { id: ch.id },
          create: { id: ch.id, guildId: guild.id, name: ch.name, type, position: (ch as any).rawPosition ?? 0 },
          update: { name: ch.name, type, position: (ch as any).rawPosition ?? 0 },
        });
      }
      // purge des salons supprimés (le fetch a réussi → la liste fait foi)
      await prisma.guildChannel.deleteMany({ where: { guildId: guild.id, id: { notIn: seen } } });
      lus++;
    } catch (e) { console.error("[botcommands] syncGuildChannels:", e); }
  }
  // Un serveur illisible ne réécrit pas la liste : un salon public ne doit pas passer pour fermé.
  if (lus && lus === client.guilds.cache.size) {
    const value = JSON.stringify([...new Set(publics)]);
    await prisma.setting.upsert({ where: { key: "salons_publics" }, create: { key: "salons_publics", value }, update: { value } })
      .catch((e) => console.error("[botcommands] salons_publics:", e));
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
      // Les Chambres Secrètes (SPEC-CHAMBRES §6). Ces types sont mis en file PAR LES ROUTES
      // ELLES-MÊMES, côté serveur — jamais par /api/admin/bot-command, dont la liste ALLOWED
      // ne les contient pas. Leur charge ne porte qu'un id de séance et un mot d'une liste
      // fermée : le salon et le contenu sont relus en base, jamais pris dans la charge.
      else if (cmd.type === "seance_publier") result = await commandePublier(client, p);
      else if (cmd.type === "seance_fermer") result = await commandeFermer(client, p);
      else if (cmd.type === "seance_annulation") result = await commandeAnnulation(client, p);
      else if (cmd.type === "evenement_essai") result = await commandeEssai(client, p);
      // Lot 7 : le débrief publié (M7, l'embed et son image) dans le salon des débriefs.
      else if (cmd.type === "seance_debrief") result = await publierDebrief(client, p);
      // Lot 10 : le message privé d'un échange de place fait sur le site (la demande au joueur
      // visé, la réponse au demandeur) ; la charge : la séance, la demande, « demande » ou « reponse ».
      else if (cmd.type === "seance_echange") result = await commandeEchange(client, p);
      else if (cmd.type === "moderation") {
        result = await executeModeration(client, p);
        // Discord a obéi : le geste est FAIT. Une base qui hoquette ensuite ne doit pas le
        // faire passer pour un échec — le rang se rattrape au syncMemberRanks suivant.
        await repercuteEnBase(client, p).catch((e) => console.error("[moderation] répercussion en base :", e));
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
