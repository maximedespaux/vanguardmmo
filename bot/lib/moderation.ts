// ════════════════════════════════════════════════════════════
//  MODÉRATION — les gestes décidés depuis le GuildViewer.
//
//  Le site ne parle pas à Discord : il dépose une SanctionMembre (avec son
//  motif) et une BotCommand, et c'est ici que ça se produit vraiment. Le
//  retour repart dans la sanction — statut FAITE ou ÉCHOUÉE, et pourquoi.
//
//  Quatre gestes, du plus doux au plus définitif :
//    role   — retirer UN rôle. Le membre reste, il perd une casquette.
//    guilde — retirer tous les rôles de rang. Il reste sur le Discord mais
//             n'est plus de la guilde : c'est le départ à l'amiable.
//    kick   — sortir du serveur. Il peut revenir avec une invitation.
//    ban    — sortir et interdire le retour.
//
//  Deux garde-fous que Discord n'impose pas et qu'on s'impose :
//   · on ne touche jamais un membre dont le plus haut rôle est au-dessus (ou
//     à hauteur) du plus haut rôle du BOT — Discord refuserait, autant le dire
//     clairement plutôt que de lâcher un « Missing Permissions » opaque ;
//   · le motif part AVEC le geste dans le journal d'audit Discord. Celui qui
//     ouvrira les logs du serveur dans six mois y trouvera la raison écrite.
// ════════════════════════════════════════════════════════════
import { Client, Guild, GuildMember } from "discord.js";
import { prisma } from "./prisma.js";
import { GUILD_ID, RANK_ROLES } from "../config.js";

/** Met à jour le cache GuildRole (lu par le site pour proposer les rôles par leur nom). */
export async function syncGuildRoles(client: Client) {
  for (const [, guild] of client.guilds.cache) {
    try {
      const roles = await guild.roles.fetch();
      const seen: string[] = [];
      for (const [, r] of roles) {
        if (!r || r.id === guild.id) continue; // @everyone n'est pas un rôle qu'on donne ou retire
        seen.push(r.id);
        await prisma.guildRole.upsert({
          where: { id: r.id },
          create: { id: r.id, guildId: guild.id, name: r.name, color: r.color, position: r.position, managed: r.managed },
          update: { name: r.name, color: r.color, position: r.position, managed: r.managed },
        });
      }
      await prisma.guildRole.deleteMany({ where: { guildId: guild.id, id: { notIn: seen } } });
    } catch (e) { console.error("[moderation] syncGuildRoles:", e); }
  }
}

async function laGuilde(client: Client): Promise<Guild> {
  const g = GUILD_ID ? await client.guilds.fetch(GUILD_ID).catch(() => null) : client.guilds.cache.first();
  if (!g) throw new Error("Serveur Discord introuvable (DISCORD_GUILD_ID)");
  return g;
}

/** Le bot est-il assez haut dans la hiérarchie pour agir sur ce membre ? */
async function verifieHierarchie(guild: Guild, cible: GuildMember) {
  const moi = await guild.members.fetchMe();
  if (cible.id === guild.ownerId) throw new Error("C'est le propriétaire du serveur — Discord l'interdit à tout le monde, bot compris.");
  if (moi.roles.highest.position <= cible.roles.highest.position)
    throw new Error(`Le rôle du bot (${moi.roles.highest.name}) est sous celui de ${cible.user.username} (${cible.roles.highest.name}). Remonte le rôle du bot au-dessus dans Paramètres du serveur → Rôles.`);
}

/** Le membre visé, ou une erreur qui dit lequel des deux cas on est. */
async function trouveMembre(guild: Guild, discordId: string): Promise<GuildMember> {
  const m = await guild.members.fetch(discordId).catch(() => null);
  if (!m) throw new Error("Ce membre n'est plus sur le serveur Discord.");
  return m;
}

const motifPour = (auteur: string, motif: string) => `${motif} — décidé par ${auteur} depuis le GuildViewer`.slice(0, 500);

/** Exécute un geste de modération. Renvoie la phrase à afficher dans le dossier. */
export async function executeModeration(
  client: Client,
  p: { action: string; discordId: string; roleId?: string; motif: string; auteur: string },
): Promise<string> {
  const guild = await laGuilde(client);
  const raison = motifPour(p.auteur, p.motif);

  if (p.action === "ban") {
    // Le bannissement est le seul geste qui n'exige PAS que la personne soit
    // encore là : on bannit aussi quelqu'un qui vient de claquer la porte.
    const m = await guild.members.fetch(p.discordId).catch(() => null);
    if (m) await verifieHierarchie(guild, m);
    await guild.bans.create(p.discordId, { reason: raison });
    return m ? `${m.user.username} banni du serveur.` : "Identifiant banni (la personne n'était plus sur le serveur).";
  }

  const membre = await trouveMembre(guild, p.discordId);
  await verifieHierarchie(guild, membre);

  if (p.action === "kick") {
    const nom = membre.user.username;
    await membre.kick(raison);
    return `${nom} exclu du serveur — il peut revenir avec une invitation.`;
  }

  if (p.action === "role") {
    if (!p.roleId) throw new Error("Aucun rôle indiqué.");
    const role = guild.roles.cache.get(p.roleId) ?? (await guild.roles.fetch(p.roleId).catch(() => null));
    if (!role) throw new Error("Ce rôle n'existe plus sur le serveur.");
    if (role.managed) throw new Error(`« ${role.name} » est géré par une intégration : Discord interdit de le retirer à la main.`);
    if (!membre.roles.cache.has(role.id)) return `${membre.user.username} n'avait déjà plus le rôle « ${role.name} ».`;
    await membre.roles.remove(role, raison);
    return `Rôle « ${role.name} » retiré à ${membre.user.username}.`;
  }

  if (p.action === "guilde") {
    // Tous les rangs d'un coup : garder un seul rang au passage laisserait la
    // personne « à moitié dans la guilde », ce qui rouvre des pages entières.
    const rangs = Object.values(RANK_ROLES).filter(Boolean);
    const aRetirer = membre.roles.cache.filter((r) => rangs.includes(r.id) && !r.managed);
    if (aRetirer.size === 0) return `${membre.user.username} n'avait aucun rang de guilde.`;
    const noms = aRetirer.map((r) => r.name).join(", ");
    await membre.roles.remove([...aRetirer.keys()], raison);
    return `${membre.user.username} n'est plus de la guilde (rangs retirés : ${noms}). Il reste sur le Discord.`;
  }

  throw new Error("Geste de modération inconnu : " + p.action);
}

/** Applique côté BASE ce que le geste implique, une fois Discord d'accord. */
export async function repercuteEnBase(action: string, discordId: string) {
  const u = await prisma.user.findUnique({ where: { discordId } }).catch(() => null);
  if (!u) return;
  if (action === "kick" || action === "ban") {
    // On ne supprime pas la ligne : ses ventes, ses quêtes et ses dettes y
    // pendent. On la sort des vivants, elle cesse d'apparaître comme membre.
    await prisma.user.update({ where: { id: u.id }, data: { role: "RECRUE", discordRoles: [], isActive: false, verifiedAt: null } });
  } else if (action === "guilde") {
    await prisma.user.update({ where: { id: u.id }, data: { role: "RECRUE", isActive: false } });
  }
}
