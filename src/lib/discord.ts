/**
 * Accès Discord depuis le SITE, via l'API REST et le token du bot.
 *
 * Pourquoi pas un webhook : un webhook ne sait pas envoyer de message privé, et
 * ne peut pas répondre dans un fil précis sans bricolage. Le suivi des dettes a
 * besoin des deux — confirmation dans le post de décision, et MP au débiteur.
 *
 * Toutes les fonctions sont volontairement « silencieuses » : Discord
 * indisponible ne doit JAMAIS faire échouer l'enregistrement d'un remboursement.
 * Elles renvoient un booléen pour que l'appelant puisse le signaler à l'écran.
 */

const API = "https://discord.com/api/v10";

function entete(): Record<string, string> | null {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  return { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
}

/** Poste un message dans un salon (ou un fil : l'identifiant d'un fil est un salon). */
export async function posterDansSalon(salonId: string, payload: unknown): Promise<boolean> {
  const h = entete();
  if (!h || !salonId) return false;
  try {
    const r = await fetch(`${API}/channels/${salonId}/messages`, {
      method: "POST", headers: h, body: JSON.stringify(payload),
    });
    return r.ok;
  } catch { return false; }
}

/**
 * Envoie un message privé à un membre.
 * Deux étapes imposées par Discord : ouvrir le salon privé, puis y écrire.
 * Échoue silencieusement si le membre a fermé ses MP — ce n'est pas une erreur
 * de notre côté, et le suivi reste visible sur le site de toute façon.
 */
export async function envoyerMP(discordId: string, payload: unknown): Promise<boolean> {
  const h = entete();
  if (!h || !discordId) return false;
  try {
    const c = await fetch(`${API}/users/@me/channels`, {
      method: "POST", headers: h, body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!c.ok) return false;
    const salon = (await c.json()) as { id?: string };
    if (!salon.id) return false;
    return await posterDansSalon(salon.id, payload);
  } catch { return false; }
}

/** Couleurs d'embed alignées sur la charte (orange, vert de réussite, rouge). */
/**
 * Ajoute un rôle à un membre. Échoue silencieusement (false) : le bot peut
 * manquer de MANAGE_ROLES, ou le rôle peut être au-dessus du sien dans la
 * hiérarchie Discord. Ce n'est jamais bloquant pour la connexion.
 */
export async function attribuerRole(discordId: string, roleId: string): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId || !discordId || !roleId) return false;
  try {
    const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${token}`, "Content-Length": "0" },
    });
    return res.ok; // 204 si ajouté, 204 aussi s'il l'avait déjà
  } catch {
    return false;
  }
}

export const COULEURS = { orange: 0xff8c1a, vert: 0x4ade80, rouge: 0xf87171 } as const;
