import "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;            // User.id (base)
      discordId: string;
      name?: string | null;
      image?: string | null;
      role: Role;            // plus haut rôle (synchronisé Discord)
      discordRoles: string[];
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    discordId?: string;
    role?: Role;
    discordRoles?: string[];
  }
}
