import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { highestRoleFromDiscord, ROLE_VERIFIE_ID } from "@/config/roles";
import { attribuerRole } from "@/lib/discord";
import type { Role } from "@prisma/client";

const GUILD_ID = process.env.DISCORD_GUILD_ID;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
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
            role,
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
      };
      return session;
    },
  },
};
