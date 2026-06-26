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

// ════════════════════════════════════════════════════════════
//  DETTES (demande membre ↔ guilde) — même salon « Décision »
// ════════════════════════════════════════════════════════════
export const DEBT_STATUS: Record<string, { fr: string; color: number }> = {
  REQUESTED:          { fr: "🟠 Demandée", color: ORANGE },
  PENDING_VALIDATION: { fr: "🟠 À valider", color: ORANGE },
  ACCEPTED:           { fr: "🟢 Acceptée", color: GREEN },
  REFUSED:            { fr: "⚫ Refusée", color: RED },
  REPAID:             { fr: "🔵 Remboursée", color: BLUE },
  CANCELLED:          { fr: "⚫ Annulée", color: GREY },
};
const DEBT_TYPE_FR: Record<string, string> = { PENYA: "Penya", ITEM: "Objet", RESSOURCE: "Ressource", SERVICE: "Service" };
const DEBT_ACTIONS: Record<string, string> = { accept: "ACCEPTED", refuse: "REFUSED", repaid: "REPAID" };

export function debtDecisionEmbed(d: any): EmbedBuilder {
  const st = DEBT_STATUS[d.status] ?? { fr: d.status, color: GREY };
  const amount = Number(d.amount || 0);
  const e = new EmbedBuilder()
    .setColor(st.color)
    .setTitle(`💰 Demande de dette — ${d.user?.username ?? d.characterName ?? "membre"}`)
    .addFields(
      { name: "Type", value: DEBT_TYPE_FR[d.type] ?? d.type, inline: true },
      { name: "Statut", value: st.fr, inline: true },
    );
  if (amount > 0) e.addFields({ name: "Montant", value: `${amount.toLocaleString("fr-FR")} penya`, inline: true });
  if (d.item) e.addFields({ name: "Objet", value: String(d.item), inline: true });
  if (d.characterName) e.addFields({ name: "Personnage", value: String(d.characterName), inline: true });
  if (d.reason) e.addFields({ name: "Raison", value: String(d.reason).slice(0, 1024) });
  if (d.dueDate) e.addFields({ name: "Échéance", value: new Date(d.dueDate).toLocaleDateString("fr-FR"), inline: true });
  if (d.decidedBy) e.addFields({ name: "Décision", value: `par **${d.decidedBy}**${d.adminNote ? ` — ${d.adminNote}` : ""}` });
  e.setFooter({ text: `réf. ${String(d.id).slice(-6)}` }).setTimestamp(new Date(d.updatedAt || d.createdAt));
  return e;
}

export function debtDecisionButtons(d: any): ActionRowBuilder<ButtonBuilder>[] {
  if (d.status === "PENDING_VALIDATION" || d.status === "REQUESTED") {
    return [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`dbt:accept:${d.id}`).setLabel("Accepter").setEmoji("✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`dbt:refuse:${d.id}`).setLabel("Refuser").setEmoji("❌").setStyle(ButtonStyle.Danger),
    )];
  }
  if (d.status === "ACCEPTED") {
    return [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`dbt:repaid:${d.id}`).setLabel("Marquer remboursée").setEmoji("💰").setStyle(ButtonStyle.Primary),
    )];
  }
  return [];
}

/** Poste une demande de dette dans le salon Décision (tag « Dettes »). */
export async function postDebtDecision(client: Client, debt: any) {
  const res = await postToDecision(client, `Dette — ${debt.user?.username ?? debt.characterName ?? "membre"}`, debtDecisionEmbed(debt), debtDecisionButtons(debt), "dette");
  if (res) await prisma.debt.update({ where: { id: debt.id }, data: { channelId: res.channelId, messageId: res.messageId } });
  return res;
}

/** Applique une décision staff sur une dette (accept/refuse/repaid). Renvoie la dette (avec user). */
export async function applyDebtDecision(client: Client, debtId: string, action: string, actor: string) {
  const status = DEBT_ACTIONS[action];
  if (!status) return null;
  const debt = await prisma.debt.update({ where: { id: debtId }, data: { status: status as any, decidedBy: actor }, include: { user: true } });
  await prisma.auditLog.create({ data: { actor, action: `dette.${status}`, target: debt.id, detail: `${DEBT_TYPE_FR[debt.type] ?? debt.type} ${Number(debt.amount).toLocaleString("fr-FR")}` } }).catch(() => {});
  await editDecision(client, debt.channelId, debt.messageId, debtDecisionEmbed(debt), debtDecisionButtons(debt));
  return debt;
}

// ════════════════════════════════════════════════════════════
//  BANQUE — requête d'objet (achat −20 % ou dette), même salon « Décision »
//  Le prix se fixe sur le SITE (achat/dette). Discord = notification + refus rapide.
// ════════════════════════════════════════════════════════════
export const BANK_STATUS: Record<string, { fr: string; color: number }> = {
  PENDING:       { fr: "🟠 En attente", color: ORANGE },
  ACCEPTE_ACHAT: { fr: "🟢 Achat −20 %", color: GREEN },
  ACCEPTE_DETTE: { fr: "🔵 Dette accordée", color: BLUE },
  REFUSE:        { fr: "⚫ Refusée", color: RED },
  ANNULE:        { fr: "⚫ Annulée", color: GREY },
};
const BANK_KIND_FR: Record<string, string> = { OBJET_IG: "Objet en jeu", ITEM: "Items", PERINS: "Périns" };

export function bankRequestEmbed(r: any): EmbedBuilder {
  const st = BANK_STATUS[r.status] ?? { fr: r.status, color: GREY };
  const e = new EmbedBuilder()
    .setColor(st.color)
    .setTitle(`🏦 Requête Banque — ${r.username}`)
    .addFields(
      { name: "Type", value: BANK_KIND_FR[r.kind] ?? r.kind, inline: true },
      { name: "Quantité", value: String(r.quantity), inline: true },
      { name: "Statut", value: st.fr, inline: true },
    );
  if (r.item) e.addFields({ name: "Objet / items", value: String(r.item), inline: true });
  if (r.reason) e.addFields({ name: "Raison", value: String(r.reason).slice(0, 1024) });
  if (r.prixPublic) e.addFields({ name: "Prix public", value: `${Number(r.prixPublic).toLocaleString("fr-FR")} penya`, inline: true });
  if (r.prixFinal && r.status === "ACCEPTE_ACHAT") e.addFields({ name: "Prix achat (−20 %)", value: `${Number(r.prixFinal).toLocaleString("fr-FR")} penya`, inline: true });
  if (r.decidedBy) e.addFields({ name: "Décision", value: `par **${r.decidedBy}**${r.adminNote ? ` — ${r.adminNote}` : ""}` });
  e.setFooter({ text: `Acceptation (prix) sur le site → Banque (gestion) · réf. ${String(r.id).slice(-6)}` }).setTimestamp(new Date(r.updatedAt || r.createdAt));
  return e;
}

export function bankRequestButtons(r: any): ActionRowBuilder<ButtonBuilder>[] {
  if (r.status !== "PENDING") return [];
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bank:refuse:${r.id}`).setLabel("Refuser").setEmoji("❌").setStyle(ButtonStyle.Danger),
  )];
}

/** Poste une requête Banque dans le salon Décision (tag « Dettes »). */
// ════ #Phase D — ping des vendeurs (membres dont le coffre perso contient l'item demandé) ════
async function findSellers(itemNames: string[]): Promise<Map<string, { items: Set<string>; qty: number }>> {
  const out = new Map<string, { items: Set<string>; qty: number }>();
  const needles = itemNames.map((n) => (n || "").toLowerCase().trim()).filter(Boolean);
  if (!needles.length) return out;
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } }).catch(() => null);
  const S = (row?.data ?? {}) as { inv?: Record<string, Record<string, number>>; members?: string[] };
  const inv = S.inv ?? {};
  const members = (Array.isArray(S.members) ? S.members : Object.keys(inv)).filter((m) => m && m !== "Commun");
  for (const m of members) {
    const minv = inv[m] || {};
    for (const id of Object.keys(minv)) {
      const qty = Number(minv[id]) || 0;
      if (qty <= 0) continue;
      const nom = (id.split("|").pop() || "").toLowerCase().trim();
      if (nom && needles.some((nd) => nd.includes(nom) || nom.includes(nd))) {
        if (!out.has(m)) out.set(m, { items: new Set<string>(), qty: 0 });
        const e = out.get(m)!;
        e.items.add((id.split("|").pop() || "").trim());
        e.qty += qty;
      }
    }
  }
  return out;
}
async function sellerMention(memberName: string): Promise<string> {
  const u = await prisma.user.findFirst({ where: { username: { equals: memberName, mode: "insensitive" } }, select: { discordId: true } }).catch(() => null);
  return u?.discordId ? `<@${u.discordId}>` : `**${memberName}**`;
}
/** Poste, sous la requête banque, la mention des membres détenteurs (vendeurs à contacter pour la transaction). */
export async function postSellerPing(client: Client, channelId: string | null, reqs: any[]) {
  if (!channelId) return;
  const itemNames = [...new Set(reqs.map((r) => String(r?.item || "")).filter(Boolean))];
  const sellers = await findSellers(itemNames);
  if (!sellers.size) return;
  const lines: string[] = [];
  for (const [member, info] of sellers) lines.push(`• ${await sellerMention(member)} — possède : ${[...info.items].join(", ")} (${info.qty} en coffre)`);
  const content = `🛒 **Vendeurs qui ont les ressources demandées** (à contacter pour la transaction) :\n${lines.join("\n")}`.slice(0, 1900);
  try {
    const ch: any = await client.channels.fetch(channelId);
    if (ch && ch.isTextBased?.() && ch.send) await ch.send({ content });
  } catch { /* salon supprimé : on ignore */ }
}

export async function postBankRequestDecision(client: Client, r: any) {
  const res = await postToDecision(client, `Requête Banque — ${r.username}`, bankRequestEmbed(r), bankRequestButtons(r), "dette");
  if (res) {
    await prisma.bankRequest.update({ where: { id: r.id }, data: { channelId: res.channelId, messageId: res.messageId } });
    await postSellerPing(client, res.channelId, [r]).catch(() => {});
  }
  return res;
}

/** Embed consolidé d'un panier (plusieurs articles d'une même transaction). */
export function bankBatchEmbed(reqs: any[]): EmbedBuilder {
  const first = reqs[0] || {};
  const st = BANK_STATUS[first.status] ?? { fr: first.status, color: GREY };
  const allRefused = reqs.length > 0 && reqs.every((r) => r.status === "REFUSE");
  const total = reqs.reduce((s, r) => s + (Number(r.priceEach) || 0) * (r.quantity || 1), 0);
  const lines = reqs.map((r) => `• **${r.item ?? "?"}** ×${r.quantity}${r.cat ? ` · _${r.cat}_` : ""}${r.priceEach ? ` · ~${(Number(r.priceEach) * (r.quantity || 1)).toLocaleString("fr-FR")} périns` : ""}`).join("\n").slice(0, 1024);
  const e = new EmbedBuilder()
    .setColor(allRefused ? RED : st.color)
    .setTitle(`🏦 Requête Banque — ${first.username}`)
    .setDescription(lines || "_(vide)_")
    .addFields(
      { name: "Articles", value: String(reqs.length), inline: true },
      { name: "Total estimé", value: `~${total.toLocaleString("fr-FR")} périns`, inline: true },
      { name: "Statut", value: allRefused ? "⚫ Refusée" : st.fr, inline: true },
    );
  if (first.decidedBy) e.addFields({ name: "Décision", value: `par **${first.decidedBy}**` });
  e.setFooter({ text: `Acceptation (prix) sur le site → Banque (gestion) · réf. ${String(first.batchId || first.id).slice(-6)}` }).setTimestamp(new Date(first.updatedAt || first.createdAt));
  return e;
}

/** Poste UNE requête Banque consolidée (panier entier) dans le salon Décision. */
export async function postBankBatchDecision(client: Client, reqs: any[]) {
  if (!reqs.length) return null;
  const first = reqs[0];
  const refuseId = first.batchId || first.id;
  const buttons = first.status === "PENDING"
    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`bank:refuse:${refuseId}`).setLabel("Refuser la requête").setEmoji("❌").setStyle(ButtonStyle.Danger))]
    : [];
  const res = await postToDecision(client, `Requête Banque — ${first.username}`, bankBatchEmbed(reqs), buttons, "dette");
  if (res) {
    await prisma.bankRequest.updateMany({ where: { id: { in: reqs.map((r) => r.id) } }, data: { channelId: res.channelId, messageId: res.messageId } });
    await postSellerPing(client, res.channelId, reqs).catch(() => {});
  }
  return res;
}

/** Refus rapide d'une requête Banque depuis Discord. `idOrBatch` = id d'une requête simple OU batchId d'un panier (on refuse alors tout le lot). */
export async function applyBankRefuse(client: Client, idOrBatch: string, actor: string) {
  const reqs = await prisma.bankRequest.findMany({ where: { OR: [{ id: idOrBatch }, { batchId: idOrBatch }], status: "PENDING" } });
  if (!reqs.length) return prisma.bankRequest.findFirst({ where: { OR: [{ id: idOrBatch }, { batchId: idOrBatch }] } });
  await prisma.bankRequest.updateMany({ where: { id: { in: reqs.map((r) => r.id) } }, data: { status: "REFUSE", decidedBy: actor } });
  await prisma.auditLog.create({ data: { actor, action: "banque.REFUSE", target: idOrBatch, detail: `${reqs.length} article(s)` } }).catch(() => {});
  const refreshed = await prisma.bankRequest.findMany({ where: { id: { in: reqs.map((r) => r.id) } } });
  const first = refreshed[0];
  if (first?.batchId || refreshed.length > 1) await editDecision(client, first.channelId, first.messageId, bankBatchEmbed(refreshed), []);
  else await editDecision(client, first.channelId, first.messageId, bankRequestEmbed(first), bankRequestButtons(first));
  return first;
}
