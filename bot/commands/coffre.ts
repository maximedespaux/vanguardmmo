import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { ORANGE, stockEmoji } from "../lib/helpers.js";

export const data = new SlashCommandBuilder()
  .setName("coffre")
  .setDescription("État du coffre de guilde")
  .addStringOption((opt) =>
    opt.setName("categorie").setDescription("Filtrer sur une catégorie (ex : Arme, Casque…)")
  );

export async function execute(i: ChatInputCommandInteraction) {
  const cat = i.options.getString("categorie");

  // Vue détaillée d'une catégorie
  if (cat) {
    const items = await prisma.coffreItem.findMany({
      where: { category: { equals: cat, mode: "insensitive" } },
      orderBy: { item: "asc" },
    });
    if (items.length === 0) {
      await i.reply({ content: `Aucun item dans **${cat}**.`, ephemeral: true });
      return;
    }
    const lines = items.map(
      (it) => `${stockEmoji(it.stockTotal, it.target)} **${it.item}** — ${it.stockTotal}/${it.target}`
    );
    const embed = new EmbedBuilder()
      .setColor(ORANGE)
      .setTitle(`🏦 Coffre — ${cat}`)
      .setDescription(lines.slice(0, 40).join("\n"))
      .setFooter({ text: "🟢 ok · 🟡 à compléter · 🔴 à farmer" });
    await i.reply({ embeds: [embed] });
    return;
  }

  // Vue résumé : par catégorie, combien d'items sous la cible
  const items = await prisma.coffreItem.findMany();
  if (items.length === 0) {
    await i.reply({ content: "Le coffre est vide pour l'instant.", ephemeral: true });
    return;
  }
  const summary: Record<string, { total: number; low: number }> = {};
  for (const it of items) {
    const key = it.category ?? "Divers";
    const s = (summary[key] ??= { total: 0, low: 0 });
    s.total++;
    if (it.stockTotal < it.target) s.low++;
  }
  const lines = Object.entries(summary)
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(([c, s]) => {
      const emoji = s.low === 0 ? "🟢" : s.low <= 2 ? "🟡" : "🔴";
      return `${emoji} **${c}** — ${s.low}/${s.total} à compléter`;
    });
  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle("🏦 Coffre de guilde — résumé")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Détail : /coffre catégorie:…" });
  await i.reply({ embeds: [embed] });
}
