import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { ORANGE } from "../lib/helpers.js";

export const data = new SlashCommandBuilder()
  .setName("aide")
  .setDescription("Liste les commandes du bot Vanguard");

export async function execute(i: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle("🦉 Bot Vanguard — commandes")
    .addFields(
      {
        name: "👤 Membres",
        value: [
          "`/candidature` — postuler pour rejoindre la guilde",
          "`/mesperso` — tes personnages enregistrés sur le site",
          "`/coffre [catégorie]` — état du coffre de guilde",
          "`/absence` — déclarer une absence",
          "`/dette` · `/dette-payer` · `/dettes` — entraide & dettes entre membres",
          "`/aide` — ce message",
        ].join("\n"),
      },
      {
        name: "🛠️ Staff (bras droits / owners)",
        value: [
          "`/panneau-classes` — poster le panneau d'auto-attribution des classes",
          "`/boutonrole` — créer un bouton qui donne un rôle",
          "`/rolereaction` — rôle par réaction (emoji)",
          "`/embed` — créer / poster / éditer des embeds (+ modèles)",
          "`/giveaway` — organiser un concours (tirage, reroll)",
          "`/dette-supprimer` — supprimer une dette *(Vanguard)*",
        ].join("\n"),
      },
      {
        name: "📋 Candidatures",
        value: "Les candidatures arrivent dans le salon **Décision** avec des boutons **Accepter / Refuser / En attente / Entretien**.",
      },
    )
    .setFooter({ text: "Vanguard Control Center" });
  await i.reply({ embeds: [embed], ephemeral: true });
}
