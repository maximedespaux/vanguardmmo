import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { DEV_ALL } from "@/lib/devAccess";

// Routes par niveau d'accès (doivent rester alignées avec la nav de Shell.tsx).
// Niveau d'entrée : être membre du serveur Discord — ce qui est vrai de toute
// session depuis que la connexion d'un non-membre est refusée (lib/auth.ts).
// N'y reste que ce dont un CANDIDAT a besoin : son build. Rien de la vie
// interne de la guilde.
/* `/builder` n'y est plus : l'AirBuilder est ouvert a tous, connecte ou non.
   On compose librement — c'est un outil de fan-site — mais tout ce qui engage un
   compte (enregistrer, publier, partager, commander) exige la connexion, et
   c'est verifie cote serveur par les routes concernees. `/builder/<membre>`, qui
   montre le build d'un AUTRE, reste protege par le layout de son groupe. */
const VERIFIED_PREFIXES = ["/build"];
/* `/personnages` n'y est plus : declarer ses persos ne demande pas d'etre DE la
   guilde — un candidat doit pouvoir le faire, sa candidature l'exige. La page
   invite a se connecter quand personne ne l'est, et l'API refuse d'elle-meme.

   L'ECONOMIE EST MONTEE ICI. La boutique etait ouverte hors guilde ; un Recrue
   est un visiteur, pas un membre — il n'a rien a voir du stock commun ni des
   conversations de commande. `/dettes` et `/requetes` suivent : ce sont des
   adresses de la meme boutique, laissees vivantes parce qu'elles ont circule
   dans des notifications. */
/* `/boutique` N'Y EST PLUS, et c'est le mode vitrine : demande de Maxime, « avoir
   l'espace boutique en visualisation publique pour attirer et donner envie [...] mais
   inutilisable sans connexion ». Un visiteur voit donc le vrai stock et les vrais prix,
   et ne peut RIEN commander — c'est /api/bank-request qui refuse, gardee par apiGuild.

   CE QUI RESTE FERME, et doit le rester : /messages, /demandes, /dettes et /requetes
   sont les conversations et les affaires personnelles de chacun. La boutique a demenage
   dans son propre groupe de routes pour cette raison precise — ouvrir le groupe (shop)
   entier les aurait exposees avec elle. */
const GUILD_PREFIXES = ["/dashboard", "/compositions", "/worldboss", "/quetes", "/absences",
                        "/messages", "/sommaire", "/demandes", "/dettes", "/requetes"];
const ADMIN_PREFIXES = ["/guildviewer", "/discord", "/annonce", "/candidatures", "/journal", "/statistiques", "/gestion-worldboss", "/coffre", "/events", "/plan-farm", "/mes-ventes"];
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
    return NextResponse.redirect(new URL("/login?error=join", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Protège les pages des espaces Guilde et Admin.
  matcher: [
    "/dashboard/:path*",
    "/compositions/:path*", "/worldboss/:path*",
    "/quetes/:path*", "/absences/:path*", "/build/:path*",
    "/messages/:path*", "/sommaire/:path*", "/demandes/:path*", "/dettes/:path*", "/requetes/:path*",
    "/guildviewer/:path*", "/discord/:path*", "/annonce/:path*", "/candidatures/:path*", "/journal/:path*", "/statistiques/:path*", "/gestion-worldboss/:path*", "/coffre/:path*", "/events/:path*", "/plan-farm/:path*", "/mes-ventes/:path*",
  ],
};
