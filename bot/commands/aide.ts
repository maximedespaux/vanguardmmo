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
          "`/absence` — déclarer une absence",
          "`/recensement [classe]` — tes chiffres déclarés, ou le classement d'une classe",
          "`/chambre historique` — tes Chambres : présences et absences",
          "`/chambre positions` — tes salles, ton équipe des jumeaux, ton golem et ta rotation ; **🔄 Échanges** pour demander la place d'un autre",
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
          "`/chambre panneau` — republier le panneau d'inscription de la prochaine Chambre",
          "`/chambre repartition` — publier les boutons des salles et des équipes des jumeaux (dont **Équilibrer (staff)**)",
          "`/chambre recap` — envoyer le récap de la soirée maintenant, sans mention",
          "`/chambre chrono` — publier le chrono en direct (Démarrer, puis la fin de chaque étape)",
          "`/chambre cloturer [seance]` — cocher qui était là (tous cochés : décoche les absents)",
          "`/chambre debrief [seance]` — le débrief étape par étape : statut, chrono, remarque, gagné / perdu, à retenir, publier",
          "`/chambre historique joueur:…` — l'historique d'un membre",
        ].join("\n"),
      },
      {
        name: "🏰 Chambres Secrètes",
        value: "La veille à 20 h, le panneau d'inscription : **✅ Je viens** ou **❌ Pas cette fois**, puis le choix du perso et du poste. Le staff publie ensuite les boutons des salles (🌳) et des équipes des jumeaux (👯) : clique les tiens. À 20 h 40, le récap : ton rôle à chaque phase. **📍 Mes positions** dit (et change) tes salles et ton équipe ; une place tenue par un autre se demande avec **🔄 Échanges** : il reçoit la demande en message privé et l'accepte ou la refuse dans l'heure. Pendant la séance, le **⏱️ chrono** en direct suit chaque étape, et les monstres de celle en cours. Après, le staff clôture (qui était là) et publie le **📝 débrief**, lisible dans les bilans. Tout se voit aussi sur le site.",
      },
      {
        name: "📋 Candidatures",
        value: "Les candidatures arrivent dans le salon **Décision** avec des boutons **Accepter / Refuser / En attente / Entretien**.",
      },
    )
    .setFooter({ text: "Vanguard Control Center" });
  await i.reply({ embeds: [embed], ephemeral: true });
}
