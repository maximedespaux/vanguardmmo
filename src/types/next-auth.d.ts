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
      verifie: boolean;
      /** Les espaces que le rôle Discord Friend ouvre à ce compte (config/amis.ts) ; vide
       *  pour un membre de la guilde, dont le rang ouvre déjà tout. */
      amis: string[];
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    discordId?: string;
    role?: Role;
    discordRoles?: string[];
    verifie?: boolean;
    /** Quand `role` a été lu en base pour la dernière fois (ms) — cf. lib/auth.ts. */
    roleLuA?: number;
    /** Les espaces ouverts par le rôle Friend, recalculés avec `role` (lib/auth.ts) : le
     *  middleware, qui ne lit pas la base, n'a que ça pour décider. */
    amis?: string[];
  }
}
