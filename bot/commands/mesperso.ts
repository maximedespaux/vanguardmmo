import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { ORANGE } from "../lib/helpers.js";

export const data = new SlashCommandBuilder()
  .setName("mesperso")
  .setDescription("Affiche tes personnages enregistrés sur le site Vanguard");

export async function execute(i: ChatInputCommandInteraction) {
  const user = await prisma.user.findUnique({
    where: { discordId: i.user.id },
    include: { characters: { include: { _count: { select: { gearProfiles: true } } } } },
  });

  if (!user || user.characters.length === 0) {
    /* Depuis le 2026-10-21, la page « Mes personnages » du site ne fait que REFLÉTER
       l'AirBuilder : un perso se crée dans le builder (bouton « Mes personnages »), qui
       le publie au compte. Renvoyer vers la page envoyait chercher un bouton parti. */
    await i.reply({
      content:
        "Tu n'as pas encore de personnage enregistré. Crée-les dans l'**AirBuilder** du site (bouton « Mes personnages ») : ils apparaissent ici dès qu'ils sont publiés 🧙",
      ephemeral: true,
    });
    return;
  }

  const lines = user.characters.map((c) => {
    const main = c.isMain ? "⭐ " : "• ";
    return `${main}**${c.name}** — ${c.class} · P${c.prestige} · niv. ${c.level} _(${c._count.gearProfiles} stuff)_`;
  });

  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle(`🧙 Personnages de ${user.username}`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Vanguard Control Center" });

  await i.reply({ embeds: [embed], ephemeral: true });
}
