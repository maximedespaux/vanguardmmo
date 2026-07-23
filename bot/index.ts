// ════════════════════════════════════════════════════════════
//  POINT D'ENTRÉE DU BOT VANGUARD
//  Commandes slash + boutons (dettes, décisions, rôles, giveaways)
//  + rôle-réaction + planificateur.
//  Commande : npm run bot
// ════════════════════════════════════════════════════════════
import { Client, GatewayIntentBits, Partials, Collection, ChatInputCommandInteraction, GuildMember, Events, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { TOKEN } from "./config.js";
import { commands } from "./commands/index.js";
import { startScheduler } from "./scheduler.js";
import { registerReactionRoles } from "./lib/reactionroles.js";
import { prisma } from "./lib/prisma.js";
import { debtEmbed, debtButtons, dm, refreshDebtMessage } from "./lib/debts.js";
import { applyApplicationDecision, applyDebtDecision, applyBankRefuse, applyBankAccept } from "./lib/decisions.js";
import { applyExchangeDecision } from "./lib/exchange.js";
import { toggleRole } from "./lib/buttonroles.js";
import { refreshGiveaway } from "./lib/giveaways.js";
import { isStaff } from "./lib/permissions.js";

if (!TOKEN) { console.error("❌ DISCORD_BOT_TOKEN manquant dans .env"); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,        // attribuer des rôles
    GatewayIntentBits.GuildMessageReactions, // rôle-réaction
    GatewayIntentBits.DirectMessages,      // MP dettes
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

const registry = new Collection<string, (typeof commands)[number]>();
for (const c of commands) registry.set(c.data.name, c);

client.once(Events.ClientReady, () => {
  console.log(`🦉 Bot connecté : ${client.user?.tag}`);
  startScheduler(client);
  registerReactionRoles(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // ─── Commandes slash ───
  if (interaction.isChatInputCommand()) {
    const cmd = registry.get(interaction.commandName);
    if (!cmd) return;
    try { await cmd.execute(interaction as ChatInputCommandInteraction); }
    catch (e) {
      console.error(`Erreur /${interaction.commandName} :`, e);
      const msg = { content: "Une erreur est survenue 😬", ephemeral: true } as const;
      try { if (interaction.deferred || interaction.replied) await interaction.followUp(msg); else await interaction.reply(msg); } catch { /* ignore */ }
    }
    return;
  }

  // ─── Boutons ───
  if (interaction.isButton()) {
    const id = interaction.customId;
    try {
      if (id.startsWith("debt:")) await handleDebtButton(interaction);
      else if (id.startsWith("dbt:")) await handleDebtDecision(interaction);
      else if (id.startsWith("app:")) await handleAppDecision(interaction);
      else if (id.startsWith("bank:")) await handleBankDecision(interaction);
      else if (id.startsWith("exch:")) await handleExchangeDecision(interaction);
      else if (id.startsWith("role:")) await toggleRole(interaction, id.slice("role:".length));
      else if (id.startsWith("gw:join:")) await handleGiveawayJoin(interaction);
    } catch (e) {
      console.error("Erreur bouton", id, e);
      try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: "Une erreur est survenue 😬", ephemeral: true }); } catch { /* ignore */ }
    }
    return;
  }

  // ─── Soumission de modal (horaire d'échange proposé) ───
  if (interaction.isModalSubmit()) {
    try {
      if (interaction.customId.startsWith("exchtime:")) {
        const time = interaction.fields.getTextInputValue("time").slice(0, 100);
        await interaction.reply({ content: `🗓️ **${interaction.user.username}** propose un horaire : **${time}**` });
      }
    } catch (e) {
      console.error("Erreur modal", interaction.customId, e);
      try { if (!interaction.replied) await interaction.reply({ content: "Une erreur est survenue 😬", ephemeral: true }); } catch { /* ignore */ }
    }
    return;
  }
});

// ─── Boutons des dettes (pair-à-pair) ───
async function handleDebtButton(interaction: any) {
  const [, action, debtId] = interaction.customId.split(":");
  const d = await prisma.guildDebt.findUnique({ where: { id: debtId } });
  if (!d) { await interaction.reply({ content: "Cette dette n'existe plus.", ephemeral: true }); return; }
  const uid = interaction.user.id;

  if ((action === "paid" || action === "cancel") && uid !== d.debtorId) {
    await interaction.reply({ content: "Seul le débiteur peut faire ça.", ephemeral: true }); return;
  }
  if ((action === "confirm" || action === "reject") && uid !== d.creditorId) {
    await interaction.reply({ content: "Seul le créancier peut confirmer ou refuser.", ephemeral: true }); return;
  }

  let updated = d;
  if (action === "paid") {
    updated = await prisma.guildDebt.update({ where: { id: d.id }, data: { status: "PENDING_CONFIRM" } });
    await dm(interaction.client, d.creditorId, { content: `📩 **${d.debtorName}** déclare avoir réglé : **${d.itemName || d.itemRef} ×${d.quantity}**. Confirme ci-dessous.`, embeds: [debtEmbed(updated)], components: debtButtons(updated) as any });
  } else if (action === "cancel") {
    updated = await prisma.guildDebt.update({ where: { id: d.id }, data: { status: "CANCELLED" } });
  } else if (action === "confirm") {
    updated = await prisma.guildDebt.update({ where: { id: d.id }, data: { status: "SETTLED", settledAt: new Date() } });
    await dm(interaction.client, d.debtorId, { content: `✅ **${d.creditorName}** a confirmé le remboursement de **${d.itemName || d.itemRef} ×${d.quantity}**. Dette soldée !` });
  } else if (action === "reject") {
    updated = await prisma.guildDebt.update({ where: { id: d.id }, data: { status: "OPEN" } });
    await dm(interaction.client, d.debtorId, { content: `👎 **${d.creditorName}** indique que la dette **${d.itemName || d.itemRef} ×${d.quantity}** n'est pas encore réglée.` });
  }
  await refreshDebtMessage(interaction.client, updated);
  await interaction.reply({ content: "✅ C'est noté.", ephemeral: true });
}

// ─── Boutons de décision (candidatures) — staff uniquement ───
async function handleAppDecision(interaction: any) {
  const [, action, appId] = interaction.customId.split(":");
  const member = interaction.member as GuildMember | null;
  if (!isStaff(member)) { await interaction.reply({ content: "⛔ Réservé au staff (bras droits / owners).", ephemeral: true }); return; }

  const app = await prisma.application.findUnique({ where: { id: appId } });
  if (!app) { await interaction.reply({ content: "Cette candidature n'existe plus.", ephemeral: true }); return; }

  const updated = await applyApplicationDecision(interaction.client, appId, action, interaction.user.username);
  if (!updated) { await interaction.reply({ content: "Action inconnue.", ephemeral: true }); return; }

  const NOTE: Record<string, string> = {
    ACCEPTED: "✅ Ta candidature à **Vanguard** a été **acceptée** ! Bienvenue 🦉",
    REJECTED: "❌ Ta candidature à **Vanguard** n'a pas été retenue cette fois-ci. Merci d'avoir postulé.",
    WAITING: "⏳ Ta candidature à **Vanguard** est mise en attente / en suivi.",
    INTERVIEW: "🗓️ Le staff de **Vanguard** souhaite un petit entretien pour ta candidature — on revient vers toi !",
  };
  await dm(interaction.client, app.discordId, { content: NOTE[updated.status] ?? "Le statut de ta candidature a été mis à jour." });
  await interaction.reply({ content: `✅ Candidature de **${app.username}** → **${updated.status}**.`, ephemeral: true });
}

// ─── Boutons de décision (dettes membre↔guilde) — staff uniquement ───
async function handleDebtDecision(interaction: any) {
  const [, action, debtId] = interaction.customId.split(":");
  const member = interaction.member as GuildMember | null;
  if (!isStaff(member)) { await interaction.reply({ content: "⛔ Réservé au staff (bras droits / owners).", ephemeral: true }); return; }
  const debt = await prisma.debt.findUnique({ where: { id: debtId } });
  if (!debt) { await interaction.reply({ content: "Cette dette n'existe plus.", ephemeral: true }); return; }
  const updated = await applyDebtDecision(interaction.client, debtId, action, interaction.user.username);
  if (!updated) { await interaction.reply({ content: "Action inconnue.", ephemeral: true }); return; }
  const NOTE: Record<string, string> = {
    ACCEPTED: "✅ Ta demande de dette à **Vanguard** a été **acceptée**.",
    REFUSED: "❌ Ta demande de dette à **Vanguard** n'a pas été retenue.",
    REPAID: "🔵 Ta dette à **Vanguard** est marquée **remboursée**. Merci !",
  };
  await dm(interaction.client, updated.user.discordId, { content: NOTE[updated.status] ?? "Le statut de ta dette a été mis à jour." });
  await interaction.reply({ content: `✅ Dette de **${updated.user.username}** → **${updated.status}**.`, ephemeral: true });
}

// ─── Bouton « Refuser » d'une requête Banque — staff uniquement ───
async function handleBankDecision(interaction: any) {
  const [, action, id] = interaction.customId.split(":");
  const member = interaction.member as GuildMember | null;
  if (!isStaff(member)) { await interaction.reply({ content: "⛔ Réservé au staff (bras droits / owners).", ephemeral: true }); return; }
  const r = await prisma.bankRequest.findFirst({ where: { OR: [{ id }, { batchId: id }] } });
  if (!r) { await interaction.reply({ content: "Cette requête n'existe plus.", ephemeral: true }); return; }
  if (r.status !== "PENDING") { await interaction.reply({ content: "Requête déjà traitée.", ephemeral: true }); return; }
  if (action === "refuse") {
    const updated = await applyBankRefuse(interaction.client, id, interaction.user.username);
    if (updated) await dm(interaction.client, updated.discordId, { content: `❌ Ta requête boutique à **Vanguard** a été refusée.` });
    await interaction.reply({ content: `✅ Requête de **${updated?.username ?? "membre"}** refusée.`, ephemeral: true });
    return;
  }
  if (action === "achat" || action === "dette") {
    const updated = await applyBankAccept(interaction.client, id, action, interaction.user.username);
    if (updated) await dm(interaction.client, updated.discordId, { content: action === "dette" ? "📝 Ta requête boutique a été **acceptée en dette**. Un salon d'échange va s'ouvrir." : "🛒 Ta requête boutique a été **acceptée (achat)**. Un salon d'échange va s'ouvrir." });
    await interaction.reply({ content: `✅ Requête de **${updated?.username ?? "membre"}** acceptée (${action}, prix auto). L'embed et le salon d'échange se mettent à jour sous peu.`, ephemeral: true });
    return;
  }
  await interaction.reply({ content: "Action inconnue.", ephemeral: true });
}

// ─── Boutons du salon d'échange (Remis / Refusé) — participants du salon privé ───
async function handleExchangeDecision(interaction: any) {
  const [, action, key] = interaction.customId.split(":");
  if (action === "time") { // proposer un horaire in-game → modal
    const modal = new ModalBuilder().setCustomId(`exchtime:${key}`).setTitle("Proposer un horaire d'échange");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("time").setLabel("Quand es-tu dispo in-game ?").setStyle(TextInputStyle.Short).setPlaceholder("ex. ce soir 21h · maintenant · demain midi").setRequired(true).setMaxLength(100)));
    await interaction.showModal(modal);
    return;
  }
  if (action === "ready") { // signale être connecté in-game (visible par tous dans le salon)
    await interaction.reply({ content: `🟢 **${interaction.user.username}** est connecté·e in-game et prêt·e pour l'échange.` });
    return;
  }
  if (action !== "remis" && action !== "refuse") { await interaction.reply({ content: "Action inconnue.", ephemeral: true }); return; }
  await applyExchangeDecision(interaction.client, key, action as "remis" | "refuse", interaction.user.username);
  await interaction.reply({ content: action === "remis" ? "✅ Échange marqué **remis**." : "❌ Échange **refusé / annulé**.", ephemeral: true });
}

// ─── Bouton « Participer » d'un giveaway (toggle) ───
async function handleGiveawayJoin(interaction: any) {
  const giveawayId = interaction.customId.split(":")[2];
  const g = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!g || g.status !== "RUNNING" || g.endsAt <= new Date()) { await interaction.reply({ content: "Ce giveaway n'est plus actif.", ephemeral: true }); return; }

  const existing = await prisma.giveawayEntry.findUnique({ where: { giveawayId_discordId: { giveawayId, discordId: interaction.user.id } } });
  if (existing) {
    await prisma.giveawayEntry.delete({ where: { id: existing.id } });
    await interaction.reply({ content: "Tu t'es retiré du giveaway. 👋", ephemeral: true });
  } else {
    try {
      await prisma.giveawayEntry.create({ data: { giveawayId, discordId: interaction.user.id, username: interaction.user.username } });
      await interaction.reply({ content: "🎉 C'est noté, tu participes ! Bonne chance !", ephemeral: true });
    } catch (e: any) {
      if (e?.code === "P2002") await interaction.reply({ content: "Tu participes déjà ! 🎉", ephemeral: true }); // double-clic
      else throw e;
    }
  }
  const fresh = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (fresh) await refreshGiveaway(interaction.client, fresh);
}

client.login(TOKEN);
