import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../lib/prisma.js";
// Module partagé avec la page /absences : le staff apprend une absence de la
// même façon, et avec la même phrase, qu'elle vienne du site ou d'ici.
import { prevenirAbsence } from "@/lib/absences";

export const data = new SlashCommandBuilder()
  .setName("absence")
  .setDescription("Déclarer une absence")
  .addStringOption((o) =>
    o.setName("debut").setDescription("Date de début (AAAA-MM-JJ)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("fin").setDescription("Date de fin (AAAA-MM-JJ)").setRequired(true)
  )
  .addStringOption((o) => o.setName("raison").setDescription("Raison (optionnel)"));

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function execute(i: ChatInputCommandInteraction) {
  const start = parseDate(i.options.getString("debut", true));
  const end = parseDate(i.options.getString("fin", true));
  const reason = i.options.getString("raison");

  if (!start || !end) {
    await i.reply({ content: "Format de date invalide. Utilise **AAAA-MM-JJ** (ex : 2026-06-12).", ephemeral: true });
    return;
  }
  if (end < start) {
    await i.reply({ content: "La date de fin doit être après la date de début.", ephemeral: true });
    return;
  }

  // On rattache l'absence au User (créé si besoin, sans toucher à son rôle).
  const user = await prisma.user.upsert({
    where: { discordId: i.user.id },
    update: { username: i.user.username },
    create: { discordId: i.user.id, username: i.user.username, role: "RECRUE" },
  });

  const abs = await prisma.absence.create({
    data: { userId: user.id, startDate: start, endDate: end, reason: reason ?? null },
  });
  await prevenirAbsence(prisma, abs, user.username);

  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  /* « En attente de validation par un officier » promettait un geste que rien ne
     permet : aucune page ni commande ne valide une absence. On dit ce qui est
     vrai — elle est notée, et le staff le sait. */
  await i.reply({
    content: `✅ Absence enregistrée du **${fmt(start)}** au **${fmt(end)}**${reason ? ` — _${reason}_` : ""}. Le staff est prévenu sur le site.`,
    ephemeral: true,
  });
}
