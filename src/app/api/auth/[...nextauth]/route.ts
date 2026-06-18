// Connecteur NextAuth (Discord OAuth). Gère /api/auth/* (login, callback, session…).
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
