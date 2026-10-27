import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { highestRoleFromDiscord, ROLE_VERIFIE_ID } from "@/config/roles";
import { attribuerRole } from "@/lib/discord";
import { rangRelu } from "@/lib/gestes";
import { reglageAmis } from "@/lib/amis";
import { espacesAmisDe } from "@/config/amis";
import type { Role } from "@prisma/client";

const GUILD_ID = process.env.DISCORD_GUILD_ID;

/**
 * LE RÔLE DE LA SESSION SE RELIT EN BASE, au plus toutes les cinq minutes.
 *
 * Il n'était écrit qu'à la connexion. Or la barre (useSession) et le middleware
 * (getToken) lisent CE rôle-là, quand les pages relisent la base : une recrue
 * acceptée ou un officier promu sur Discord restait refusé par le middleware, et
 * voyait la barre de son ancien rang, jusqu'à sa reconnexion — trente jours plus
 * tard au pire, la durée par défaut d'une session next-auth.
 *
 * La relecture se fait ICI, côté Node : le middleware tourne sur le runtime edge,
 * sans Prisma, et ne fait que LIRE le jeton. Le cookie est réécrit à chaque appel
 * de /api/auth/session, que useSession fait au chargement et au retour sur
 * l'onglet ; c'est ce qui porte le nouveau rang jusqu'au middleware. Cinq minutes
 * plutôt qu'à chaque appel : ce callback est traversé par chaque getServerSession.
 */
const RELECTURE_ROLE = 5 * 60_000;
/* L'horodatage du jeton ne suffit pas à tenir les cinq minutes. Un getServerSession
   de page ou de route relit le cookie sans pouvoir le réécrire (next-auth n'y pose
   aucun cookie) : seul /api/auth/session le fait. Une fois le jeton périmé, chaque
   requête relisait donc la base jusqu'au prochain passage du navigateur par
   /api/auth/session, et une navigation par Link n'en déclenche aucun. La lecture
   est gardée ici, par compte, pour la même durée. */
const rolesRelus = new Map<string, { role: Role; discordRoles: string[]; a: number }>();

/**
 * LES ESPACES DU RÔLE FRIEND, mis dans le jeton avec le rang (SPEC-INFORMATION-GUILDE §9).
 *
 * Le middleware tourne sur le runtime edge, sans Prisma : il ne peut ni relire les rôles
 * Discord du compte ni le réglage des amis (`Setting`). On les croise donc ICI, à la
 * connexion puis à chaque relecture du rang (toutes les cinq minutes), et le jeton porte
 * le résultat — une liste d'espaces (`astuces`, `airbuilder`), que la barre lit aussi.
 * Le rang lui-même n'est pas touché : un ami reste RECRUE, il n'est pas de la guilde.
 */
async function amisDuJeton(role: Role, discordRoles: string[]): Promise<string[]> {
  return espacesAmisDe(role, discordRoles, await reglageAmis());
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // Discord renvoie désormais `iss=https://discord.com` au retour de la
      // connexion (RFC 9207, annoncé par son /.well-known/openid-configuration).
      // openid-client compare ce paramètre à l'émetteur déclaré, et le provider
      // Discord de next-auth v4 n'en déclare aucun : chaque connexion échouait
      // sur « issuer must be configured on the issuer ». Constaté en prod le
      // 2026-10-18, sans qu'aucune ligne de notre code ait changé.
      issuer: "https://discord.com",
      authorization: { params: { scope: "identify guilds guilds.members.read" } },
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    /**
     * Le serveur Discord est la porte d'entrée, pas une option.
     *
     * Avant, un compte Discord quelconque ouvrait une session : le joueur
     * atterrissait sur un site à moitié vide sans comprendre qu'il lui manquait
     * une étape. On refuse donc la connexion tant qu'il n'a pas rejoint le
     * serveur, et /login l'invite AVANT de proposer de se connecter.
     *
     * Le seul appel qui prouve l'appartenance est celui-ci : il n'aboutit que
     * si le joueur est membre. Une panne de l'API (autre chose qu'un 404) ne
     * bloque personne — getCurrentUser retranchera plus tard s'il le faut.
     */
    async signIn({ account }) {
      if (!GUILD_ID || !account?.access_token) return true;
      try {
        const res = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
          headers: { Authorization: `Bearer ${account.access_token}` },
        });
        if (res.ok) return true;
        if (res.status === 404) return "/login?error=join";
        return true; // 401/429/5xx : problème de notre côté, pas du joueur
      } catch {
        return true;
      }
    },
    // À la connexion : on lit les rôles Discord EN LIVE, on calcule le rôle, et on UPSERT le User en base.
    // Ensuite : le rôle est relu en base toutes les RELECTURE_ROLE (voir plus haut).
    async jwt({ token, account, profile }) {
      if (account?.access_token && profile) {
        const p = profile as any;
        let memberRoleIds: string[] = [];
        // La requête ne réussit QUE si le joueur est membre du serveur : c'est
        // notre seule preuve fiable d'appartenance, on la garde.
        let estMembre = false;
        if (GUILD_ID) {
          try {
            const res = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
              headers: { Authorization: `Bearer ${account.access_token}` },
            });
            if (res.ok) { const m = await res.json(); memberRoleIds = m.roles ?? []; estMembre = true; }
          } catch { /* membre non trouvé → RECRUE */ }
        }
        const role: Role = highestRoleFromDiscord(memberRoleIds);

        // Création / mise à jour automatique du User (source de vérité = Discord)
        const user = await prisma.user.upsert({
          where: { discordId: p.id },
          update: {
            username: p.username ?? p.global_name ?? "Inconnu",
            avatar: p.avatar ?? null,
            // Le rang, et, si c'est un rang de guilde, le retour parmi les actifs : une
            // sortie de la guilde ou une exclusion l'avait marqué inactif — la règle de
            // syncMemberRanks (lib/gestes, `rangRelu`). Ce drapeau n'ouvre aucun droit.
            ...rangRelu(role),
            discordRoles: memberRoleIds,
            // On ne remet jamais à null : perdre l'accès ne doit pas dépendre
            // d'un hoquet de l'API Discord au moment d'une connexion.
            ...(estMembre ? { verifiedAt: new Date() } : {}),
          },
          create: {
            discordId: p.id,
            username: p.username ?? p.global_name ?? "Inconnu",
            avatar: p.avatar ?? null,
            role,
            discordRoles: memberRoleIds,
            ...(estMembre ? { verifiedAt: new Date() } : {}),
          },
        });

        // Marqueur visible sur Discord. Non bloquant : si le bot n'a pas
        // MANAGE_ROLES, l'accès au site reste assuré par verifiedAt.
        if (estMembre && !memberRoleIds.includes(ROLE_VERIFIE_ID)) {
          void attribuerRole(p.id, ROLE_VERIFIE_ID).then((ok) => {
            if (ok) console.log(`[auth] rôle Vérifié(e) attribué à ${p.username ?? p.id}`);
          });
          memberRoleIds = [...memberRoleIds, ROLE_VERIFIE_ID];
        }

        token.userId = user.id;
        token.discordId = user.discordId;
        token.role = role;
        token.discordRoles = memberRoleIds;
        token.verifie = estMembre || Boolean(user.verifiedAt);
        token.roleLuA = Date.now();
        token.amis = await amisDuJeton(role, memberRoleIds);
      } else if (token.userId && Date.now() - (token.roleLuA ?? 0) >= RELECTURE_ROLE) {
        // Toujours plus récente que la lecture du jeton : celle-ci date d'au moins
        // RELECTURE_ROLE, la mémoire n'est reprise que si elle en a moins.
        let lu = rolesRelus.get(token.userId);
        if (!lu || Date.now() - lu.a >= RELECTURE_ROLE) {
          try {
            const u = await prisma.user.findUnique({
              where: { id: token.userId },
              select: { role: true, discordRoles: true },
            });
            // Un compte disparu de la base ne garde pas le rang de son jeton : les
            // pages le refusent déjà, le middleware doit dire la même chose.
            lu = { role: u?.role ?? "RECRUE", discordRoles: u?.discordRoles ?? [], a: Date.now() };
            rolesRelus.set(token.userId, lu);
          } catch {
            /* Base injoignable : le jeton garde le rang qu'il avait, et sans
               horodatage neuf la relecture sera retentée au prochain passage. */
            lu = undefined;
          }
        }
        if (lu) {
          token.role = lu.role;
          token.discordRoles = lu.discordRoles;
          token.roleLuA = lu.a;
          /* Recalculés à chaque relecture, et pas gardés avec le rang dans `rolesRelus` :
             le réglage des amis peut changer entre deux, et sa propre mémoire est plus
             courte (lib/amis.ts). Un rôle Friend posé ou retiré sur Discord arrive en
             base par la synchro du bot (bot/scheduler.ts, `syncMemberRanks`). */
          token.amis = await amisDuJeton(lu.role, lu.discordRoles);
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: (token.userId as string) ?? "",
        discordId: (token.discordId as string) ?? "",
        name: session.user?.name,
        image: session.user?.image,
        role: (token.role as Role) ?? "RECRUE",
        discordRoles: (token.discordRoles as string[]) ?? [],
        verifie: Boolean(token.verifie),
        // Un jeton d'avant le rôle Friend n'en porte pas : rien d'ouvert jusqu'à sa relecture.
        amis: Array.isArray(token.amis) ? (token.amis as string[]) : [],
      };
      return session;
    },
  },
};
