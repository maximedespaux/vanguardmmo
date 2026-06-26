// ════════════════════════════════════════════════════════════
//  Rôles par bouton — bascule (toggle) du rôle au clic.
//  customId : "role:<roleId>". Appelé depuis le routeur (bot/index.ts).
// ════════════════════════════════════════════════════════════
import { ButtonInteraction, GuildMember } from "discord.js";

export async function toggleRole(i: ButtonInteraction, roleId: string) {
  const guild = i.guild;
  if (!guild) { await i.reply({ content: "Action possible uniquement sur le serveur.", ephemeral: true }); return; }

  const role = guild.roles.cache.get(roleId) ?? await guild.roles.fetch(roleId).catch(() => null);
  if (!role) { await i.reply({ content: "Ce rôle n'existe plus.", ephemeral: true }); return; }

  const me = await guild.members.fetchMe();
  if (me.roles.highest.comparePositionTo(role) <= 0) {
    await i.reply({ content: `⚠️ Je ne peux pas gérer le rôle **${role.name}** : il est au-dessus du mien dans la liste des rôles (place mon rôle plus haut dans Paramètres du serveur → Rôles).`, ephemeral: true });
    return;
  }
  if (!me.permissions.has("ManageRoles")) {
    await i.reply({ content: "⚠️ Il me manque la permission **« Gérer les rôles »**.\n→ Paramètres du serveur → Rôles → mon rôle → active **« Gérer les rôles »**.", ephemeral: true });
    return;
  }

  const member = (i.member as GuildMember | null) ?? await guild.members.fetch(i.user.id).catch(() => null);
  if (!member) { await i.reply({ content: "Impossible de te retrouver sur le serveur 😬", ephemeral: true }); return; }

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await i.reply({ content: `➖ Rôle **${role.name}** retiré.`, ephemeral: true });
    } else {
      await member.roles.add(roleId);
      await i.reply({ content: `➕ Rôle **${role.name}** ajouté !`, ephemeral: true });
    }
  } catch (e) {
    console.error("[toggleRole] échec add/remove du rôle", role.name, e);
    await i.reply({ content: `Impossible de modifier le rôle **${role.name}** 😬\n\n→ Dans **Paramètres du serveur → Rôles**, vérifie que mon rôle a la permission **« Gérer les rôles »** et qu'il est placé **au-dessus** des rôles de classe.`, ephemeral: true });
  }
}
