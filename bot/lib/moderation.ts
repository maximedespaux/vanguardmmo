// ════════════════════════════════════════════════════════════
//  MODÉRATION — les gestes décidés depuis le GuildViewer.
//
//  Le site ne parle pas à Discord : il dépose une SanctionMembre (avec son
//  motif) et une BotCommand, et c'est ici que ça se produit vraiment. Le
//  retour repart dans la sanction — statut FAITE ou ÉCHOUÉE, et pourquoi.
//
//  Cinq gestes, du plus doux au plus définitif :
//    rang   — promouvoir ou rétrograder (2026-10-21) : retirer l'ancien rôle
//             de rang, poser le nouveau. C'est ICI que le rang change, pas en
//             base : syncMemberRanks relit les rôles toutes les 10 minutes et
//             déferait un rang écrit seulement sur le site.
//    role   — retirer UN rôle. Le membre reste, il perd une casquette.
//    guilde — retirer tous les rôles de rang. Il reste sur le Discord mais
//             n'est plus de la guilde : c'est le départ à l'amiable.
//    kick   — sortir du serveur. Il peut revenir avec une invitation.
//    ban    — sortir et interdire le retour.
//
//  (« Cacher » et « montrer » ne passent pas par ici : ils ne touchent pas à
//  Discord, le site les fait lui-même.)
//
//  Deux garde-fous que Discord n'impose pas et qu'on s'impose :
//   · on ne touche jamais un membre dont le plus haut rôle est au-dessus (ou
//     à hauteur) du plus haut rôle du BOT — Discord refuserait, autant le dire
//     clairement plutôt que de lâcher un « Missing Permissions » opaque ;
//   · le motif part AVEC le geste dans le journal d'audit Discord. Celui qui
//     ouvrira les logs du serveur dans six mois y trouvera la raison écrite.
// ════════════════════════════════════════════════════════════
import { Client, Guild, GuildMember } from "discord.js";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma.js";
import { GUILD_ID, RANK_ROLES, highestRankFromRoles } from "../config.js";
import { modifierCompo } from "@/lib/compositions-serveur";
import { rangRelu, retirerDeLaCompo } from "@/lib/gestes";

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

/** Ce que le site dépose dans la file (`BotCommand.payload`, /api/admin/moderation). */
export type GesteModeration = { action: string; discordId: string; roleId?: string | null; rang?: string | null; motif: string; auteur: string; actionId?: string };

const NOM_RANG: Record<string, string> = {
  DIRECTION: "Direction", VANGUARD: "Vanguard", GENERAL: "Général", OFFICIER: "Officier", VETERAN: "Vétéran", GUARD: "Guard",
};

/** Exécute un geste de modération. Renvoie la phrase à afficher dans le dossier. */
export async function executeModeration(client: Client, p: GesteModeration): Promise<string> {
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

  if (p.action === "rang") {
    // Le site a déjà vérifié qui peut nommer qui (lib/gestes.ts) ; ici, c'est Discord
    // qu'il faut convaincre : le rôle à POSER doit être sous celui du bot, comme pour
    // /boutonrole. (Les rôles à retirer le sont forcément : verifieHierarchie vient de
    // vérifier que le plus haut rôle du membre est sous celui du bot.)
    const rang = String(p.rang ?? "");
    const roleId = RANK_ROLES[rang];
    if (!roleId) throw new Error(`Aucun rôle Discord n'est associé au rang ${NOM_RANG[rang] ?? rang} (ROLE_${rang} dans .env).`);
    const role = guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null));
    if (!role) throw new Error(`Le rôle du rang ${NOM_RANG[rang] ?? rang} n'existe plus sur le serveur (ROLE_${rang}).`);
    if (role.managed) throw new Error(`« ${role.name} » est géré par une intégration : Discord interdit de le poser à la main.`);
    const moi = await guild.members.fetchMe();
    if (moi.roles.highest.comparePositionTo(role) <= 0)
      throw new Error(`Le rôle du bot (${moi.roles.highest.name}) doit être au-dessus de « ${role.name} » pour le poser. Remonte-le dans Paramètres du serveur → Rôles.`);

    const rangs = Object.values(RANK_ROLES).filter(Boolean);
    const anciens = membre.roles.cache.filter((r) => rangs.includes(r.id) && r.id !== role.id && !r.managed);
    // Le nouveau d'abord : retiré puis posé, le membre passerait un instant hors de la
    // guilde, et un tour de syncMemberRanks tombant entre les deux le noterait Recrue.
    if (!membre.roles.cache.has(role.id)) await membre.roles.add(role, raison);
    if (anciens.size) await membre.roles.remove([...anciens.keys()], raison);
    const avant = anciens.size ? anciens.map((r) => r.name).join(", ") : "aucun rang";
    return `${membre.user.username} : ${avant} → ${role.name}.`;
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

/**
 * Applique côté BASE ce que le geste implique, une fois Discord d'accord.
 *
 * Pour un changement de rang, le rang se recalcule des rôles RÉELS du membre, relus chez
 * Discord après le geste — la règle de syncMemberRanks, appliquée tout de suite plutôt
 * qu'au tour suivant, pour que le dossier et les listes le disent dans la minute.
 */
export async function repercuteEnBase(client: Client, p: GesteModeration) {
  const u = await prisma.user.findUnique({ where: { discordId: p.discordId }, include: { characters: { select: { name: true } } } }).catch(() => null);
  if (!u) return;
  if (p.action === "kick" || p.action === "ban") {
    // On ne supprime pas la ligne : ses anciennes ventes, quêtes et dettes y pendent
    // (gardées en base après le départ de la Boutique et de Quête Guilde). On la sort
    // des vivants, elle cesse d'apparaître comme membre.
    await prisma.user.update({ where: { id: u.id }, data: { role: "RECRUE", discordRoles: [], isActive: false, verifiedAt: null } });
  } else if (p.action === "guilde") {
    await prisma.user.update({ where: { id: u.id }, data: { role: "RECRUE", isActive: false } });
  } else if (p.action === "rang") {
    const guild = await laGuilde(client).catch(() => null);
    const m = guild ? await guild.members.fetch({ user: p.discordId, force: true }).catch(() => null) : null;
    if (m) {
      const roleIds = [...m.roles.cache.keys()];
      // Promu depuis Recrue (un ancien membre qui revient) : il redevient actif — la règle
      // de syncMemberRanks (lib/gestes, `rangRelu`).
      await prisma.user.update({ where: { id: u.id }, data: { ...rangRelu(highestRankFromRoles(roleIds) as Role), discordRoles: roleIds } });
    }
  }

  /* SORTI DE LA GUILDE, il n'y figure plus nulle part (SPEC-INFORMATION-GUILDE §4) : ses
     inscriptions et ses « je serai là » des Chambres Secrètes partent avec lui. Les
     pages lisent le rang pour tout le reste. L'écriture passe par `modifierCompo` (lot 3 des
     Chambres) : sous verrou, elle n'efface pas un « Je viens » cliqué au même moment sur
     Discord, et l'état d'avant est gardé sous « main:precedent », comme à chaque écriture. */
  if (p.action === "guilde" || p.action === "kick" || p.action === "ban") {
    const res = await modifierCompo(prisma, (e) => {
      const { etat, retires } = retirerDeLaCompo(e, { pseudo: u.username, persos: u.characters.map((c) => c.name) });
      if (!retires) return { ok: false, status: 204, message: "rien à retirer" };
      Object.assign(e, etat);
      return { ok: true, valeur: retires };
    }).catch((e) => { console.error("[moderation] composition :", e); return null; });
    if (res && !res.ok && res.status === 409) console.error("[moderation] composition :", res.message);
  }
}
