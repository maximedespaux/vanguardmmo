import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { DEV_ALL } from "@/lib/devAccess";

// Routes par niveau d'accès (doivent rester alignées avec la nav de Shell.tsx).
// Niveau intermédiaire : membre du serveur Discord suffit. /builder en fait
// partie car la candidature exige un build — un candidat doit pouvoir le créer.
const VERIFIED_PREFIXES = ["/builder"];
const GUILD_PREFIXES = ["/dashboard", "/personnages", "/prestige", "/donjons", "/astuces", "/compositions", "/worldboss", "/dettes", "/echanges", "/parametres"];
const ADMIN_PREFIXES = ["/guildviewer", "/discord", "/annonce", "/candidatures", "/gestion-dettes", "/gestion-worldboss", "/coffre", "/events", "/plan-farm"];
const GUILD_ROLES = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"];
const ADMIN_ROLES = ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER"];

export async function middleware(req: NextRequest) {
  if (DEV_ALL) return NextResponse.next(); // dev local uniquement (jamais en prod)
  const { pathname } = req.nextUrl;
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const needsGuild = GUILD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const needsVerified = VERIFIED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsGuild && !needsAdmin && !needsVerified) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  const role = (token.role as string) ?? "RECRUE";
  if (needsAdmin && !ADMIN_ROLES.includes(role)) return NextResponse.redirect(new URL("/?error=admin", req.url));
  if (needsGuild && !GUILD_ROLES.includes(role)) return NextResponse.redirect(new URL("/?error=guild", req.url));
  // Le flag vient du callback JWT : il vaut true si l'API Discord a confirmé
  // l'appartenance au serveur lors d'une connexion (voir lib/auth.ts).
  // undefined = jeton emis avant l'arrivee de ce verrou : on laisse passer et
  // c'est requireVerified (cote serveur, qui peut interroger la base et Discord)
  // qui tranche. Sans ca, tout candidat deja connecte serait ejecte le jour du
  // deploiement jusqu'a ce qu'il se reconnecte.
  if (needsVerified && token.verifie === false && !GUILD_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/login?error=discord", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Protège les pages des espaces Guilde et Admin.
  matcher: [
    "/dashboard/:path*", "/personnages/:path*", "/builder/:path*", "/prestige/:path*",
    "/donjons/:path*", "/astuces/:path*", "/compositions/:path*", "/worldboss/:path*",
    "/dettes/:path*", "/echanges/:path*", "/parametres/:path*",
    "/guildviewer/:path*", "/discord/:path*", "/annonce/:path*", "/candidatures/:path*", "/gestion-dettes/:path*", "/gestion-worldboss/:path*", "/coffre/:path*", "/events/:path*", "/plan-farm/:path*",
  ],
};
