import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import { highestRoleFromDiscord } from "@/config/roles";
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
    // À la connexion : on lit les rôles Discord EN LIVE, on calcule le rôle, et on UPSERT le User en base.
    async jwt({ token, account, profile }) {
      if (account?.access_token && profile) {
        const p = profile as any;
        let memberRoleIds: string[] = [];
        if (GUILD_ID) {
          try {
            const res = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
              headers: { Authorization: `Bearer ${account.access_token}` },
            });
            if (res.ok) { const m = await res.json(); memberRoleIds = m.roles ?? []; }
          } catch { /* membre non trouvé → RECRUE */ }
        }
        const role: Role = highestRoleFromDiscord(memberRoleIds);

        // Création / mise à jour automatique du User (source de vérité = Discord)
        const user = await prisma.user.upsert({
          where: { discordId: p.id },
          update: { username: p.username ?? p.global_name ?? "Inconnu", avatar: p.avatar ?? null, role, discordRoles: memberRoleIds },
          create: { discordId: p.id, username: p.username ?? p.global_name ?? "Inconnu", avatar: p.avatar ?? null, role, discordRoles: memberRoleIds },
        });

        token.userId = user.id;
        token.discordId = user.discordId;
        token.role = role;
        token.discordRoles = memberRoleIds;
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
      };
      return session;
    },
  },
};
