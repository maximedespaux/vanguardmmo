// ════════════════════════════════════════════════════════════
//  Rôle-réaction : ajoute/retire le rôle quand un membre réagit.
//  Branché sur messageReactionAdd / messageReactionRemove.
// ════════════════════════════════════════════════════════════
import { Client, Events, MessageReaction, User, PartialMessageReaction, PartialUser } from "discord.js";
import { prisma } from "./prisma.js";

function emojiKey(reaction: MessageReaction | PartialMessageReaction): string {
  const e = reaction.emoji;
  return e.id ? `${e.name}:${e.id}` : (e.name ?? "");
}

async function findRule(messageId: string, reaction: MessageReaction | PartialMessageReaction) {
  const e = reaction.emoji;
  const keys = [e.name ?? "", e.id ? `${e.name}:${e.id}` : "", e.id ? `<:${e.name}:${e.id}>` : ""].filter(Boolean);
  return prisma.reactionRole.findFirst({ where: { messageId, emoji: { in: keys } } });
}

export function registerReactionRoles(client: Client) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    await apply(reaction, user, true);
  });
  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    await apply(reaction, user, false);
  });
}

async function apply(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, add: boolean) {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    const rule = await findRule(reaction.message.id, reaction);
    if (!rule) return;
    const guild = reaction.message.guild;
    if (!guild) return;
    const member = await guild.members.fetch(user.id);
    if (add) await member.roles.add(rule.roleId).catch(() => {});
    else await member.roles.remove(rule.roleId).catch(() => {});
  } catch { /* silencieux */ }
}
