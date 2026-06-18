// ════════════════════════════════════════════════════════════
//  /candidature — Ouvrir une candidature à la guilde.
//  Crée une Application (PENDING) en base et poste un embed à
//  boutons dans le salon « Décision » pour que le staff tranche.
//  (Le site postera aussi des candidatures : le scheduler relaie
//   automatiquement celles qui n'ont pas encore d'embed.)
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { postApplicationDecision } from "../lib/decisions.js";

const CLASSES = [
  { name: "Spadassin", value: "SPADASSIN" },
  { name: "Templier", value: "TEMPLIER" },
  { name: "Arcaniste", value: "ARCANISTE" },
  { name: "Envoûteur", value: "ENVOUTEUR" },
  { name: "Arbalétrier", value: "ARBALETRIER" },
  { name: "Sylphide", value: "SYLPHIDE" },
  { name: "Primat", value: "PRIMAT" },
  { name: "Chanoine", value: "CHANOINE" },
];

export const data = new SlashCommandBuilder()
  .setName("candidature")
  .setDescription("Postuler pour rejoindre la guilde Vanguard")
  .addStringOption((o) => o.setName("classe").setDescription("Ta classe principale").setRequired(true).addChoices(...CLASSES))
  .addStringOption((o) => o.setName("motivation").setDescription("Pourquoi tu veux rejoindre Vanguard").setRequired(true))
  .addStringOption((o) => o.setName("pseudo").setDescription("Ton pseudo en jeu (si différent de Discord)"))
  .addStringOption((o) => o.setName("experience").setDescription("Ton expérience / ancienne guilde"))
  .addIntegerOption((o) => o.setName("persos_cs").setDescription("Nb de persos jouables en Chambres Secrètes").setMinValue(0));

export async function execute(i: ChatInputCommandInteraction) {
  // Une seule candidature en attente à la fois.
  const existing = await prisma.application.findFirst({
    where: { discordId: i.user.id, status: { in: ["PENDING", "WAITING", "INTERVIEW"] } },
  });
  if (existing) {
    await i.reply({ content: "📋 Tu as déjà une candidature en cours de traitement. Patiente le temps que le staff la traite. 🙏", ephemeral: true });
    return;
  }

  const classe = i.options.getString("classe", true);
  const motivation = i.options.getString("motivation", true);
  const igName = i.options.getString("pseudo");
  const experience = i.options.getString("experience") ?? null;
  const csChars = i.options.getInteger("persos_cs");

  const app = await prisma.application.create({
    data: {
      discordId: i.user.id,
      username: igName || i.user.username,
      avatar: i.user.avatar ?? null,
      favClasses: [classe],
      motivation,
      experience,
      csChars: csChars ?? null,
      status: "PENDING",
    },
  });

  const res = await postApplicationDecision(i.client, app);
  if (res) {
    await i.reply({ content: "✅ Ta candidature est envoyée ! Le staff va l'examiner. Tu seras prévenu de la décision. 🦉", ephemeral: true });
  } else {
    await i.reply({ content: "✅ Candidature enregistrée, mais le salon Décision n'est pas configuré — préviens un admin.", ephemeral: true });
  }
}
