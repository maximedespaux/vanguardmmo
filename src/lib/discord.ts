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

/**
 * Ce joueur est-il membre du serveur ? null = on ne sait pas (Discord
 * injoignable, pas de token) — a distinguer de false, qui est un vrai « non ».
 * Sans cette distinction on refuserait l'acces sur une simple panne reseau.
 */
export async function estMembreDuServeur(discordId: string): Promise<boolean | null> {
  const h = entete();
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!h || !guildId || !discordId) return null;
  try {
    const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}`, { headers: h });
    if (res.status === 404) return false;
    if (!res.ok) return null;
    return true;
  } catch {
    return null;
  }
}

/* ─── Invitation au serveur ───────────────────────────────────────────────
   Affichee sur /login a un visiteur connecte mais pas encore sur le serveur.
   C'est le bot qui la produit : rien a coller a la main dans un .env, et le
   lien ne peut pas devenir obsolete.

   On REUTILISE une invitation permanente existante avant d'en creer une. Sans
   ca, chaque affichage de la page de connexion en fabriquerait une nouvelle et
   la liste d'invitations du serveur deviendrait illisible. */

let _invit: { url: string | null; ts: number } = { url: null, ts: 0 };
const INVIT_TTL = 60 * 60 * 1000; // 1 h : un lien permanent n'a pas besoin de mieux

/** Salon d'accueil ou poser l'invitation : reglement, sinon salon systeme, sinon 1er salon texte. */
async function salonAccueil(h: Record<string, string>, guildId: string): Promise<string | null> {
  try {
    const g = await fetch(`${API}/guilds/${guildId}`, { headers: h });
    if (g.ok) {
      const j = await g.json();
      const s = j.rules_channel_id ?? j.system_channel_id;
      if (s) return String(s);
    }
    const c = await fetch(`${API}/guilds/${guildId}/channels`, { headers: h });
    if (c.ok) {
      const list = await c.json();
      const txt = Array.isArray(list) ? list.find((x: { type?: number }) => x?.type === 0) : null;
      if (txt?.id) return String(txt.id);
    }
  } catch { /* silencieux */ }
  return null;
}

/**
 * Lien d'invitation au serveur, ou null si indisponible (aucun bouton ne sera
 * alors affiche — jamais de lien mort).
 *
 * NEXT_PUBLIC_DISCORD_INVITE reste prioritaire : c'est le seul moyen d'imposer
 * une URL personnalisee (vanity) que l'API ne renvoie pas.
 */
export async function obtenirInvitation(): Promise<string | null> {
  const fixe = process.env.NEXT_PUBLIC_DISCORD_INVITE;
  if (fixe) return fixe;

  const maintenant = Date.now();
  if (_invit.url && maintenant - _invit.ts < INVIT_TTL) return _invit.url;

  const h = entete();
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!h || !guildId) return null;

  try {
    // 1) Une invitation permanente existe-t-elle deja ?
    const ex = await fetch(`${API}/guilds/${guildId}/invites`, { headers: h });
    if (ex.ok) {
      const list = await ex.json();
      const perm = Array.isArray(list)
        ? list.find((i: { code?: string; max_age?: number; max_uses?: number }) =>
            i?.code && i.max_age === 0 && !i.max_uses)
        : null;
      if (perm?.code) {
        _invit = { url: `https://discord.gg/${perm.code}`, ts: maintenant };
        return _invit.url;
      }
    }

    // 2) Sinon on en cree une. unique:false → Discord renvoie une invitation
    //    equivalente existante plutot que d'en empiler une nouvelle.
    const salon = await salonAccueil(h, guildId);
    if (!salon) return null;
    const res = await fetch(`${API}/channels/${salon}/invites`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ max_age: 0, max_uses: 0, temporary: false, unique: false }),
    });
    if (!res.ok) return null;
    const inv = await res.json();
    if (!inv?.code) return null;
    _invit = { url: `https://discord.gg/${inv.code}`, ts: maintenant };
    return _invit.url;
  } catch {
    return null;
  }
}

export const COULEURS = { orange: 0xff8c1a, vert: 0x4ade80, rouge: 0xf87171 } as const;
