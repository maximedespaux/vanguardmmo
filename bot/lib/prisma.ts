// Client Prisma du bot — pointe sur la MÊME base que le site (DATABASE_URL).
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient({ log: ["error", "warn"] });
