// ════════════════════════════════════════════════════════════
//  Channel « Décision » — cœur du bot.
//  Une demande (candidature, …) est postée en embed à boutons dans
//  le salon Décision. Le staff clique Accepter / Refuser / En attente
//  / Entretien → met à jour la base + journal d'audit + édite l'embed.
//
//  Gère les salons TEXTE comme les salons FORUM (post = nouveau fil).
//  Réutilisable : pour l'instant branché sur les candidatures (Application).
// ════════════════════════════════════════════════════════════
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, Client, Message,
} from "discord.js";
import { prisma } from "./prisma.js";
import { ORANGE } from "./helpers.js";
import { CHANNELS, CLASS_LABELS } from "../config.js";

const GREEN = 0x4ade80, RED = 0xf87171, BLUE = 0x4ea8ff, GOLD = 0xffd24a, GREY = 0x8a8a95;

// Statut applicatif → libellé + couleur.
export const APP_STATUS: Record<string, { fr: string; color: number }> = {
  PENDING:   { fr: "🟠 En attente",  color: ORANGE },
  WAITING:   { fr: "🔵 En suivi",    color: BLUE },
  INTERVIEW: { fr: "🟡 Entretien",   color: GOLD },
  ACCEPTED:  { fr: "🟢 Acceptée",    color: GREEN },
  REJECTED:  { fr: "⚫ Refusée",     color: RED },
};

// action de bouton → statut cible
export const APP_ACTIONS: Record<string, string> = {
  accept: "ACCEPTED",
  reject: "REJECTED",
  wait: "WAITING",
  interview: "INTERVIEW",
};

function classLabel(c: string): string {
  const k = (c || "").toUpperCase();
  const m = CLASS_LABELS[k];
  return m ? `${m.emoji} ${m.fr}` : c;
}

/** Embed d'une candidature pour le salon Décision. */
export function applicationEmbed(a: any): EmbedBuilder {
  const st = APP_STATUS[a.status] ?? { fr: a.status, color: GREY };
  const e = new EmbedBuilder()
    .setColor(st.color)
    .setTitle(`📋 Candidature — ${a.username}`)
    .setDescription(a.motivation ? `*${String(a.motivation).slice(0, 500)}*` : "_(pas de motivation renseignée)_")
    .addFields({ name: "Statut", value: st.fr, inline: true });

  const chars = Array.isArray(a.chars) ? a.chars : [];
  // « Classe(s) » = les classes réelles des personnages (cohérent avec « Personnages »),
  // et non plus un champ « favClasses » séparé qui pouvait diverger.
  const charClasses = [...new Set(chars.map((c: any) => c.cls).filter(Boolean))] as string[];
  if (charClasses.length)
    e.addFields({ name: "Classe(s)", value: charClasses.join(", "), inline: true });
  if (Array.isArray(a.specs) && a.specs.length)
    e.addFields({ name: "Spécialités", value: a.specs.join(", "), inline: true });
  if (a.csChars != null)
    e.addFields({ name: "Persos CS", value: String(a.csChars), inline: true });

  if (chars.length)
    e.addFields({ name: "Personnages", value: chars.map((c: any) => `• ${c.name ?? "?"}${c.cls ? ` (${c.cls})` : ""}${c.prestige ? ` P${c.prestige}` : ""}`).join("\n").slice(0, 1024) });
  if (a.experience)
    e.addFields({ name: "Expérience", value: String(a.experience).slice(0, 1024) });
  if (a.quizScore != null && a.quizTotal != null)
    e.addFields({ name: "Quiz", value: `${a.quizScore}/${a.quizTotal}`, inline: true });
  if (a.decidedBy)
    e.addFields({ name: "Décision", value: `par **${a.decidedBy}**${a.adminNote ? ` — ${a.adminNote}` : ""}` });

  e.setFooter({ text: `Candidat ${a.discordId} · réf. ${a.id.slice(-6)}` })
    .setTimestamp(new Date(a.updatedAt || a.createdAt));
  if (a.avatar)
    e.setThumbnail(`https://cdn.discordapp.com/avatars/${a.discordId}/${a.avatar}.png`);
  return e;
}

/** Boutons de décision (masqués une fois la candidature tranchée). */
export function decisionButtons(a: any): ActionRowBuilder<ButtonBuilder>[] {
  if (a.status === "ACCEPTED" || a.status === "REJECTED") return [];
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`app:accept:${a.id}`).setLabel("Accepter").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`app:reject:${a.id}`).setLabel("Refuser").setEmoji("❌").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`app:wait:${a.id}`).setLabel("En attente").setEmoji("⏳").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`app:interview:${a.id}`).setLabel("Entretien").setEmoji("🗓️").setStyle(ButtonStyle.Primary),
  );
  return [row];
}

/** Poste un embed (+ boutons) dans le salon Décision. Gère TEXTE et FORUM.
 *  tagHint : nom (partiel) du tag de forum à appliquer en priorité (forums « tag requis »). */
async function postToDecision(client: Client, title: string, embed: EmbedBuilder, components: any[], tagHint?: string): Promise<{ channelId: string; messageId: string } | null> {
  if (!CHANNELS.decision) { console.warn("[decision] CHANNEL_DECISION non configuré"); return null; }
  try {
    const ch: any = await client.channels.fetch(CHANNELS.decision);
    if (!ch) return null;
    if (ch.type === ChannelType.GuildForum) {
      // Certains forums imposent un tag : on en applique un (celui qui matche tagHint, sinon le premier).
      const tags: { id: string; name: string }[] = ch.availableTags ?? [];
      let appliedTags: string[] | undefined;
      if (tags.length) {
        const match = tagHint ? tags.find((t) => t.name.toLowerCase().includes(tagHint.toLowerCase())) : undefined;
        appliedTags = [(match ?? tags[0]).id];
      }
      const thread = await ch.threads.create({ name: title.slice(0, 100), message: { embeds: [embed], components }, appliedTags });
      const starter: Message | null = await thread.fetchStarterMessage().catch(() => null);
      return { channelId: thread.id, messageId: starter?.id ?? thread.id };
    }
    if (ch.isTextBased()) {
      const msg = await ch.send({ embeds: [embed], components });
      return { channelId: ch.id, messageId: msg.id };
    }
    console.warn("[decision] type de salon non supporté:", ch.type);
    return null;
  } catch (e) {
    console.error("[decision] post échoué:", e);
    return null;
  }
}

/** Édite l'embed d'une décision déjà postée (channelId = salon ou fil). */
async function editDecision(client: Client, channelId: string | null, messageId: string | null, embed: EmbedBuilder, components: any[]) {
  if (!channelId || !messageId) return;
  try {
    const ch: any = await client.channels.fetch(channelId);
    if (ch && ch.isTextBased()) {
      const msg = await ch.messages.fetch(messageId);
      await msg.edit({ embeds: [embed], components });
    }
  } catch { /* message supprimé : on ignore */ }
}

/** Poste une candidature dans le salon Décision et stocke channelId/messageId. */
export async function postApplicationDecision(client: Client, app: any) {
  const res = await postToDecision(client, `Candidature — ${app.username}`, applicationEmbed(app), decisionButtons(app), "candidat");
  if (res) await prisma.application.update({ where: { id: app.id }, data: { channelId: res.channelId, messageId: res.messageId } });
  return res;
}

/** Applique une décision staff sur une candidature, met à jour l'embed + l'audit. */
export async function applyApplicationDecision(client: Client, appId: string, action: string, actor: string) {
  const status = APP_ACTIONS[action];
  if (!status) return null;
  const app = await prisma.application.update({
    where: { id: appId },
    data: { status: status as any, decidedBy: actor, decidedAt: new Date() },
  });
  await prisma.auditLog.create({ data: { actor, action: `candidature.${status}`, target: app.id, detail: app.username } }).catch(() => {});
  await editDecision(client, app.channelId, app.messageId, applicationEmbed(app), decisionButtons(app));
  return app;
}

// Les dettes et les requêtes de la Boutique passaient aussi par ce salon. Elles ont
// quitté le site le 2026-10-21 ; leurs embeds, boutons et débits de coffre avec elles.
