// ════════════════════════════════════════════════════════════
//  CONFIG DU BOT VANGUARD
//  Lis les variables d'environnement (.env) et centralise les
//  réglages : salons Discord, rôles, et la LISTE DES ÉVÉNEMENTS.
//  👉 C'est ici que tu modifieras les rappels d'événements du jeu.
// ════════════════════════════════════════════════════════════
import "dotenv/config";

// ─── Identifiants Discord (depuis .env) ─────────────────────
export const TOKEN     = process.env.DISCORD_BOT_TOKEN ?? "";
export const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
export const GUILD_ID  = process.env.DISCORD_GUILD_ID ?? "";

// ─── Salons où le bot poste (clic droit salon → Copier l'identifiant) ─
export const CHANNELS = {
  candidatures: process.env.CHANNEL_CANDIDATURES ?? "", // relances de candidatures
  events:       process.env.CHANNEL_EVENTS ?? "",       // rappels d'événements
  staff:        process.env.CHANNEL_STAFF ?? "",        // salon officiers (optionnel)
  decision:     process.env.CHANNEL_DECISION ?? "",     // salon « Décision » (embeds à boutons)
  // Catégorie où créer les salons d'échange temporaires (acheteur ↔ détenteur).
  // ⚠️ Laisse vide pour DÉSACTIVER la création de salons (sécurité : rien n'est créé tant que ce n'est pas configuré).
  exchangeCategory: process.env.CHANNEL_EXCHANGE_CATEGORY ?? "",
};

// Rôle staff qui voit tous les salons d'échange (repli : ROLE_OFFICIER).
export const ROLE_STAFF_VIEW = process.env.ROLE_STAFF_VIEW ?? process.env.ROLE_OFFICIER ?? "";

// ─── Rôles Discord à pinguer dans les relances staff ────────
export const ROLE_OFFICIER = process.env.ROLE_OFFICIER ?? "";

// ─── Mapping RANG (rôle applicatif) → rôle Discord ──────────
//     Sert à resynchroniser le rang des membres en base (pour que le
//     GuildViewer reste à jour même si le membre ne se reconnecte pas).
export const RANK_ROLES: Record<string, string> = {
  DIRECTION: process.env.ROLE_DIRECTION ?? "",
  VANGUARD:  process.env.ROLE_VANGUARD  ?? "",
  GENERAL:   process.env.ROLE_GENERAL   ?? "",
  OFFICIER:  process.env.ROLE_OFFICIER  ?? "",
  VETERAN:   process.env.ROLE_VETERAN   ?? "",
  GUARD:     process.env.ROLE_GUARD     ?? "",
};
const RANK_ORDER = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"];
/** Plus haut rang applicatif à partir des IDs de rôles Discord d'un membre. */
export function highestRankFromRoles(roleIds: string[]): string {
  for (const rank of RANK_ORDER) {
    const id = RANK_ROLES[rank];
    if (id && roleIds.includes(id)) return rank;
  }
  return "RECRUE";
}

// ─── Mapping classe (enum CharacterClass) → rôle Discord ────
//     Utilisé par la synchro et le panneau d'auto-attribution des classes.
export const CLASS_ROLES: Record<string, string> = {
  SPADASSIN:   process.env.ROLE_CLASSE_SPADASSIN   ?? "",
  TEMPLIER:    process.env.ROLE_CLASSE_TEMPLIER    ?? "",
  ARCANISTE:   process.env.ROLE_CLASSE_ARCANISTE   ?? "",
  ENVOUTEUR:   process.env.ROLE_CLASSE_ENVOUTEUR   ?? "",
  ARBALETRIER: process.env.ROLE_CLASSE_ARBALETRIER ?? "",
  SYLPHIDE:    process.env.ROLE_CLASSE_SYLPHIDE    ?? "",
  PRIMAT:      process.env.ROLE_CLASSE_PRIMAT      ?? "",
  CHANOINE:    process.env.ROLE_CLASSE_CHANOINE    ?? "",
};

// Emojis CUSTOM du serveur (tags <:nom:id>), pour les boutons de classe.
// IDs récupérés en live depuis le serveur (⚠️ pas les IDs de rôle).
export const CLASS_EMOJIS: Record<string, string> = {
  SPADASSIN:   "<:Spadassin:1498321781721661571>",
  TEMPLIER:    "<:Templier:1498321840018559056>",
  ARCANISTE:   "<:Arcaniste:1498321420889886806>",
  ENVOUTEUR:   "<:Envouteur:1498321489433464933>",
  ARBALETRIER: "<:Arbaletrier:1498321910398718054>",
  SYLPHIDE:    "<:Sylphide:1498321963188486214>",
  PRIMAT:      "<:Primat:1498321553006399620>",
  CHANOINE:    "<:Chanoine:1498321703053561936>",
};

// Libellés FR + emoji unicode (repli si l'emoji custom est indisponible).
export const CLASS_LABELS: Record<string, { fr: string; emoji: string }> = {
  SPADASSIN:   { fr: "Spadassin",   emoji: "🗡️" },
  TEMPLIER:    { fr: "Templier",    emoji: "🛡️" },
  ARCANISTE:   { fr: "Arcaniste",   emoji: "🌀" },
  ENVOUTEUR:   { fr: "Envoûteur",   emoji: "🪄" },
  ARBALETRIER: { fr: "Arbalétrier", emoji: "🏹" },
  SYLPHIDE:    { fr: "Sylphide",    emoji: "🪀" },
  PRIMAT:      { fr: "Primat",      emoji: "✝️" },
  CHANOINE:    { fr: "Chanoine",    emoji: "👊" },
};

// ─── Réglages des rappels ───────────────────────────────────
export const TIMEZONE = "Europe/Paris";
// Relancer une candidature en attente après X heures, puis toutes les 24h.
export const CANDIDATURE_REMIND_AFTER_HOURS = 24;

// ════════════════════════════════════════════════════════════
//  📅 ÉVÉNEMENTS DU JEU À RAPPELER
//  Remplis ce tableau avec le vrai calendrier AirFlyff.
//  - day  : "lundi" | "mardi" | … | "dimanche" | "tous" (quotidien)
//  - time : heure de l'événement, format "HH:MM" (heure de Paris)
//  - remindBefore : minutes de rappel AVANT (0 = pas de rappel avancé)
//  - channelId : laisse vide pour utiliser CHANNEL_EVENTS, ou précise un salon
//  - mention   : "@here", "@everyone", "<@&ROLE_ID>" ou "" (rien)
//
//  Exemples (décommente et adapte) :
// ════════════════════════════════════════════════════════════
export type GameEvent = {
  name: string;
  day: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche" | "tous";
  time: string;          // "HH:MM"
  remindBefore: number;  // minutes
  channelId?: string;
  mention?: string;
};

export const EVENTS: GameEvent[] = [
  { name: "Chambres Secrètes", day: "mercredi", time: "21:00", remindBefore: 15, mention: "@everyone" },
  { name: "Chambres Secrètes", day: "dimanche", time: "21:00", remindBefore: 15, mention: "@everyone" },
  // World Boss : horaires à venir (iBeats les fournit via le GitBook).
];
