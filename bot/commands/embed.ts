// ════════════════════════════════════════════════════════════
//  /embed — Embed Builder (créer des messages embed sans coder).
//    /embed creer   : construit et poste un embed (option : le sauver)
//    /embed poster  : poste un modèle sauvegardé
//    /embed editer  : remplace un embed déjà posté (par son message_id)
//    /embed modeles : liste les modèles sauvegardés
//  Réservé au staff (gère les messages).
// ════════════════════════════════════════════════════════════
import {
  SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder,
  PermissionFlagsBits, TextChannel, ChannelType,
} from "discord.js";
import { prisma } from "../lib/prisma.js";
import { ORANGE } from "../lib/helpers.js";
import { botCanPost, NO_ACCESS_MSG } from "../lib/permissions.js";

function parseColor(s: string | null): number {
  if (!s) return ORANGE;
  const n = parseInt(s.replace(/^#/, ""), 16);
  return Number.isNaN(n) ? ORANGE : n;
}

type EmbedData = {
  title?: string; description?: string; color?: number;
  image?: string; thumbnail?: string; footer?: string; author?: string; url?: string;
};

function buildEmbed(d: EmbedData): EmbedBuilder {
  const e = new EmbedBuilder().setColor(typeof d.color === "number" ? d.color : ORANGE);
  if (d.title) e.setTitle(d.title.slice(0, 256));
  if (d.description) e.setDescription(d.description.replace(/\\n/g, "\n").slice(0, 4000));
  if (d.image) e.setImage(d.image);
  if (d.thumbnail) e.setThumbnail(d.thumbnail);
  if (d.footer) e.setFooter({ text: d.footer.slice(0, 2048) });
  if (d.author) e.setAuthor({ name: d.author.slice(0, 256) });
  if (d.url) e.setURL(d.url);
  return e;
}

// Lit les options communes de contenu d'embed.
function readData(i: ChatInputCommandInteraction): EmbedData {
  return {
    title: i.options.getString("titre") ?? undefined,
    description: i.options.getString("description") ?? undefined,
    color: parseColor(i.options.getString("couleur")),
    image: i.options.getString("image") ?? undefined,
    thumbnail: i.options.getString("vignette") ?? undefined,
    footer: i.options.getString("footer") ?? undefined,
    author: i.options.getString("auteur") ?? undefined,
    url: i.options.getString("url") ?? undefined,
  };
}

function contentOptions(sub: any) {
  return sub
    .addStringOption((o: any) => o.setName("titre").setDescription("Titre de l'embed"))
    .addStringOption((o: any) => o.setName("description").setDescription("Texte (utilise \\n pour un saut de ligne)"))
    .addStringOption((o: any) => o.setName("couleur").setDescription("Couleur hex, ex #FF8C1A"))
    .addStringOption((o: any) => o.setName("image").setDescription("URL d'une grande image"))
    .addStringOption((o: any) => o.setName("vignette").setDescription("URL d'une vignette (coin)"))
    .addStringOption((o: any) => o.setName("footer").setDescription("Texte de pied de page"))
    .addStringOption((o: any) => o.setName("auteur").setDescription("Ligne auteur (en haut)"))
    .addStringOption((o: any) => o.setName("url").setDescription("Lien sur le titre"));
}

export const data = new SlashCommandBuilder()
  .setName("embed")
  .setDescription("[Staff] Créer et gérer des messages embed")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addSubcommand((s) => contentOptions(
    s.setName("creer").setDescription("Construire et poster un embed")
      .addChannelOption((o) => o.setName("salon").setDescription("Salon de destination (défaut : ici)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption((o) => o.setName("sauver_nom").setDescription("Sauver comme modèle sous ce nom")),
  ))
  .addSubcommand((s) => s.setName("poster").setDescription("Poster un modèle sauvegardé")
    .addStringOption((o) => o.setName("nom").setDescription("Nom du modèle").setRequired(true))
    .addChannelOption((o) => o.setName("salon").setDescription("Salon de destination (défaut : ici)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
  .addSubcommand((s) => contentOptions(
    s.setName("editer").setDescription("Remplacer un embed déjà posté")
      .addStringOption((o) => o.setName("message_id").setDescription("ID du message à modifier").setRequired(true)),
  ))
  .addSubcommand((s) => s.setName("modeles").setDescription("Lister les modèles sauvegardés"));

export async function execute(i: ChatInputCommandInteraction) {
  const sub = i.options.getSubcommand();
  const here = i.channel as TextChannel;
  await i.deferReply({ ephemeral: true });

  if (sub === "creer") {
    const d = readData(i);
    if (!d.title && !d.description && !d.image) {
      await i.editReply({ content: "Donne au moins un **titre**, une **description** ou une **image**." }); return;
    }
    const target = (i.options.getChannel("salon") as TextChannel) ?? here;
    const me = await i.guild!.members.fetchMe();
    if (!botCanPost(target, me)) { await i.editReply({ content: NO_ACCESS_MSG }); return; }
    try { await target.send({ embeds: [buildEmbed(d)] }); }
    catch { await i.editReply({ content: "Impossible de poster (URL d'image invalide ? permissions ?)." }); return; }

    const saveName = i.options.getString("sauver_nom");
    if (saveName) {
      await prisma.embedTemplate.upsert({
        where: { guildId_name: { guildId: i.guildId!, name: saveName } },
        create: { guildId: i.guildId!, name: saveName, data: d as any, createdBy: i.user.id },
        update: { data: d as any },
      });
    }
    await i.editReply({ content: `✅ Embed posté dans ${target}.${saveName ? ` Modèle **${saveName}** sauvegardé.` : ""}` });
    return;
  }

  if (sub === "poster") {
    const name = i.options.getString("nom", true);
    const tpl = await prisma.embedTemplate.findUnique({ where: { guildId_name: { guildId: i.guildId!, name } } });
    if (!tpl) { await i.editReply({ content: `Aucun modèle nommé **${name}**.` }); return; }
    const target = (i.options.getChannel("salon") as TextChannel) ?? here;
    const me = await i.guild!.members.fetchMe();
    if (!botCanPost(target, me)) { await i.editReply({ content: NO_ACCESS_MSG }); return; }
    await target.send({ embeds: [buildEmbed(tpl.data as EmbedData)] });
    await i.editReply({ content: `✅ Modèle **${name}** posté dans ${target}.` });
    return;
  }

  if (sub === "editer") {
    const messageId = i.options.getString("message_id", true);
    let msg;
    try { msg = await here.messages.fetch(messageId); }
    catch { await i.editReply({ content: "Message introuvable dans ce salon." }); return; }
    if (msg.author.id !== i.client.user!.id) { await i.editReply({ content: "Je ne peux modifier que MES propres messages." }); return; }
    const d = readData(i);
    await msg.edit({ embeds: [buildEmbed(d)] });
    await i.editReply({ content: "✅ Embed mis à jour." });
    return;
  }

  if (sub === "modeles") {
    const tpls = await prisma.embedTemplate.findMany({ where: { guildId: i.guildId! }, orderBy: { name: "asc" } });
    if (!tpls.length) { await i.editReply({ content: "Aucun modèle sauvegardé. Crée-en un avec `/embed creer … sauver_nom:`." }); return; }
    await i.editReply({ content: `📑 Modèles : ${tpls.map((t) => `\`${t.name}\``).join(", ")}` });
    return;
  }
}
