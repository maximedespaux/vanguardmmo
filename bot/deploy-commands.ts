// ════════════════════════════════════════════════════════════
//  Enregistre les slash commands auprès de Discord (à lancer
//  une fois, puis à chaque ajout/modif de commande).
//  Commande : pnpm bot:deploy
// ════════════════════════════════════════════════════════════
import { REST, Routes } from "discord.js";
import { TOKEN, CLIENT_ID, GUILD_ID } from "./config.js";
import { commands } from "./commands/index.js";

async function main() {
  if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("❌ DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID et DISCORD_GUILD_ID sont requis dans .env");
    process.exit(1);
  }
  const body = commands.map((c) => c.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  console.log(`⏳ Enregistrement de ${body.length} commande(s)…`);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
  console.log("✅ Commandes enregistrées sur la guilde. Elles sont dispo immédiatement.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
