import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { DEV_ALL } from "@/lib/devAccess";

// Routes par niveau d'accès (doivent rester alignées avec la nav de Shell.tsx).
const GUILD_PREFIXES = ["/dashboard", "/personnages", "/builder", "/prestige", "/donjons", "/astuces", "/compositions", "/worldboss", "/dettes", "/echanges", "/parametres"];
const ADMIN_PREFIXES = ["/guildviewer", "/discord", "/annonce", "/candidatures", "/gestion-dettes", "/gestion-worldboss", "/coffre"];
const GUILD_ROLES = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"];
const ADMIN_ROLES = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER"];

export async function middleware(req: NextRequest) {
  if (DEV_ALL) return NextResponse.next(); // dev local uniquement (jamais en prod)
  const { pathname } = req.nextUrl;
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const needsGuild = GUILD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsGuild && !needsAdmin) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  const role = (token.role as string) ?? "RECRUE";
  if (needsAdmin && !ADMIN_ROLES.includes(role)) return NextResponse.redirect(new URL("/?error=admin", req.url));
  if (needsGuild && !GUILD_ROLES.includes(role)) return NextResponse.redirect(new URL("/?error=guild", req.url));
  return NextResponse.next();
}

export const config = {
  // Protège les pages des espaces Guilde et Admin.
  matcher: [
    "/dashboard/:path*", "/personnages/:path*", "/builder/:path*", "/prestige/:path*",
    "/donjons/:path*", "/astuces/:path*", "/compositions/:path*", "/worldboss/:path*",
    "/dettes/:path*", "/echanges/:path*", "/parametres/:path*",
    "/guildviewer/:path*", "/discord/:path*", "/annonce/:path*", "/candidatures/:path*", "/gestion-dettes/:path*", "/gestion-worldboss/:path*", "/coffre/:path*",
  ],
};
