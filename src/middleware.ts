import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@prisma/client";
import { DEV_ALL } from "@/lib/devAccess";
// Les listes de rôles viennent de la config, plus d'une copie tenue à la main.
import { GUILD_ROLES } from "@/config/roles";
/* LA décision du site (config/nav.ts) : la même que la barre et les gardes des pages et des
   routes. Le middleware n'en est qu'un lecteur — il ne lit pas la base, et le jeton lui
   apporte le rang ET les espaces que le rôle Friend ouvre (`token.amis`, lib/auth.ts). */
import { espaceDe, peutOuvrir, type Qui } from "@/config/nav";

// Routes par niveau d'accès (doivent rester alignées avec les `acces` de config/nav.ts).
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

   /profil reste ferme par le layout de (shop), qui appelle requireGuild().

   LA BOUTIQUE ET LES PAGES STAFF RETIREES le 2026-10-21 (/boutique, /requetes,
   /journal, /statistiques, /coffre, /plan-farm, /mes-ventes) n'y sont plus, pas plus
   que /messages, /demandes, /dettes et /sommaire : ce ne sont plus des pages mais
   des redirections de next.config.js, qui passent AVANT ce middleware. Leur
   destination garde sa propre garde. */
/* /dashboard n'y est plus : elle redirige vers l'accueil unique (next.config.js), qui
   choisit lui-même le visage du visiteur. */
/* /guilde : Information Guilde, la page des membres (2026-10-21) — rien pour un visiteur,
   un candidat ni un Friend. Son gabarit (guild) appelle déjà requireGuild ; on l'aligne
   ici sur ses voisines. /quetes (Quête Guilde, retirée) et /recensement (devenu la
   section #recensement de /guilde) n'y sont plus : ce sont des redirections de
   next.config.js, qui passent AVANT ce middleware, vers /guilde et sa garde. */
/* /objets y entre le 2026-10-21 : elle n'était gardée que par le layout de son groupe.
   C'est une page d'Astuces, que le rôle Friend peut ouvrir (SPEC-INFORMATION-GUILDE §9) —
   la décision le lit dans l'espace de l'adresse (`espaceDe`) ; les quatre autres sont de
   l'espace Guilde, qu'aucun ami n'ouvre. */
const GUILD_PREFIXES = ["/guilde", "/compositions", "/worldboss", "/absences", "/objets"];
/* /annonce n'y est plus : elle redirige vers /discord (next.config.js), dont l'onglet
   Embed envoyait déjà la même commande. /suivi, /guildviewer et /candidatures non plus :
   ce sont des sections de /staff depuis le 2026-10-21 (le tableau de bord tout-en-un), et
   leurs adresses des redirections de next.config.js, qui passent AVANT ce middleware. */
/* /acces-amis : le réglage du rôle Friend, rubrique Outils des bras droits (2026-10-21). */
const ADMIN_PREFIXES = ["/staff", "/discord", "/gestion-worldboss", "/events", "/acces-amis"];

export async function middleware(req: NextRequest) {
  if (DEV_ALL) return NextResponse.next(); // dev local uniquement (jamais en prod)
  const { pathname } = req.nextUrl;
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const needsGuild = GUILD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const needsVerified = VERIFIED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsGuild && !needsAdmin && !needsVerified) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  const role = (token.role as Role | undefined) ?? "RECRUE";
  // Un jeton d'avant le rôle Friend n'a pas `amis` : rien d'ouvert jusqu'à sa relecture.
  const qui: Qui = { role, amis: Array.isArray(token.amis) ? token.amis : [] };
  if (needsAdmin && !peutOuvrir("admin", qui)) return NextResponse.redirect(new URL("/?error=admin", req.url));
  if (needsGuild && !peutOuvrir("guild", qui, espaceDe(pathname))) return NextResponse.redirect(new URL("/?error=guild", req.url));
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
    "/guilde/:path*", "/compositions/:path*", "/worldboss/:path*",
    "/absences/:path*", "/objets/:path*", "/build/:path*",
    "/staff/:path*",
    "/discord/:path*", "/gestion-worldboss/:path*", "/events/:path*", "/acces-amis/:path*",
  ],
};
