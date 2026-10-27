// ════════════════════════════════════════════════════════════
//  POINT D'ENTRÉE DU BOT VANGUARD
//  Commandes slash (et leur autocomplétion) + boutons (décisions, rôles, giveaways, Chambres)
//  + menus déroulants et fenêtres de saisie (Chambres) + rôle-réaction + planificateur.
//  Commande : npm run bot
// ════════════════════════════════════════════════════════════
import { Client, GatewayIntentBits, Partials, Collection, ChatInputCommandInteraction, GuildMember, Events, MessageFlags, type AutocompleteInteraction } from "discord.js";
import { TOKEN } from "./config.js";
import { commands } from "./commands/index.js";
import { startScheduler } from "./scheduler.js";
import { registerReactionRoles } from "./lib/reactionroles.js";
import { prisma } from "./lib/prisma.js";
import { applyApplicationDecision } from "./lib/decisions.js";
import { dm } from "./lib/mp.js";
import { toggleRole } from "./lib/buttonroles.js";
import { refreshGiveaway } from "./lib/giveaways.js";
import { isStaff } from "./lib/permissions.js";
import { gererBoutonSeance, gererFenetreSeance, gererMenuSeance } from "./lib/seances.js";

if (!TOKEN) { console.error("❌ DISCORD_BOT_TOKEN manquant dans .env"); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,        // attribuer des rôles
    GatewayIntentBits.GuildMessageReactions, // rôle-réaction
    GatewayIntentBits.DirectMessages,      // MP (décisions de candidature)
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

  // ─── Autocomplétion ───
  // Le choix de la séance de /chambre cloturer et /chambre debrief (les dernières séances
  // commencées, comme `autocomplete_chambres_ouvertes` du modèle). Discord n'attend pas : en cas
  // d'erreur, une liste vide plutôt que rien.
  if (interaction.isAutocomplete()) {
    const cmd = registry.get(interaction.commandName) as { autocomplete?: (i: AutocompleteInteraction) => Promise<void> } | undefined;
    try { if (cmd?.autocomplete) await cmd.autocomplete(interaction); else await interaction.respond([]); }
    catch (e) {
      console.error(`Erreur autocomplétion /${interaction.commandName} :`, e);
      try { if (!interaction.responded) await interaction.respond([]); } catch { /* ignore */ }
    }
    return;
  }

  // ─── Boutons ───
  if (interaction.isButton()) {
    const id = interaction.customId;
    try {
      if (id.startsWith("app:")) await handleAppDecision(interaction);
      // Les boutons de la Boutique (requête, détenteur, salon d'échange) restent sur
      // d'anciens messages : une réponse claire plutôt que « l'interaction a échoué ».
      else if (/^(bank|exch|hold):/.test(id)) await interaction.reply({ content: "Ce bouton ne sert plus : la boutique a quitté le site.", ephemeral: true });
      else if (id.startsWith("role:")) await toggleRole(interaction, id.slice("role:".length));
      else if (id.startsWith("gw:join:")) await handleGiveawayJoin(interaction);
      // Chambres Secrètes et Guild Siege : boutons SANS ÉTAT, tout est relu en base
      // (« Je viens », « Pas cette fois » ; SPEC-CHAMBRES §8.1).
      else if (id.startsWith("cs:") || id.startsWith("gs:")) await gererBoutonSeance(interaction);
    } catch (e) {
      console.error("Erreur bouton", id, e);
      await repondreErreur(interaction);
    }
    return;
  }

  // ─── Fenêtres de saisie ───
  // Le débrief des Chambres dans Discord (lot 6 bis) : « chrono et remarque » d'une étape, et
  // « à retenir » — `EtapeModal` et `ARetenirModal` du modèle.
  if (interaction.isModalSubmit()) {
    const id = interaction.customId;
    try {
      if (id.startsWith("cs:")) await gererFenetreSeance(interaction);
    } catch (e) {
      console.error("Erreur fenêtre", id, e);
      await repondreErreur(interaction);
    }
    return;
  }

  // ─── Menus déroulants ───
  // « Quels persos ? » et « Quel poste ? », sous le « Je viens » des Chambres. Le bot n'en
  // traitait aucun jusqu'au lot 3 (piège n° 17 de la spec).
  if (interaction.isStringSelectMenu()) {
    const id = interaction.customId;
    try {
      if (id.startsWith("cs:") || id.startsWith("gs:")) await gererMenuSeance(interaction);
    } catch (e) {
      console.error("Erreur menu", id, e);
      await repondreErreur(interaction);
    }
    return;
  }
});

/** Une erreur, dite à l'auteur du clic seul — que le geste ait déjà répondu « en attente » ou non. */
async function repondreErreur(interaction: any) {
  const msg = { content: "⚠️ Je n'ai pas pu enregistrer, réessaie dans un instant.", flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } } as const;
  try {
    if (interaction.deferred || interaction.replied) await interaction.followUp(msg);
    else await interaction.reply(msg);
  } catch { /* ignore */ }
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
