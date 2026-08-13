import { NextResponse } from "next/server";
import { chercher, faitsWiki, type Critere } from "@/lib/wiki";
import { TYPES_VALIDES, type TypeEntree } from "@/components/wiki/vocabulaire";

/**
 * LA RECHERCHE UNIQUE. On renvoie 40 lignes, jamais l'index.
 *
 * Les relevés lus derrière totalisent ~6 Mo : c'est précisément pour ne pas les
 * envoyer au navigateur qu'il y a une route ici. Elle rend aussi les comptes par
 * nature, parce qu'ils se calculent sur le même passage — les demander séparément
 * relirait 14 000 lignes pour rien.
 *
 * ┌───────────────── PAS DE VERROU D'ACCÈS, ET C'EST À SIGNALER ─────────────────┐
 * │ Cette route est OUVERTE, comme `/api/monstres`, `/api/pnj` et                │
 * │ `/api/competences` qui portent la même nature de contenu : les données du    │
 * │ client du jeu, que n'importe qui peut extraire lui-même. Rien de la vie de   │
 * │ la guilde ne passe ici — aucun nom de membre, aucune dette, aucune           │
 * │ commande, aucune conversation, aucun prix de boutique.                       │
 * │                                                                             │
 * │ CE QUE ÇA CHANGE MALGRÉ TOUT, ET IL FAUT LE DIRE EN ENTIER : deux routes     │
 * │ portant CETTE MÊME MATIÈRE sont, elles, FERMÉES —                           │
 * │   · `/api/objets`     (`apiAuth` + `canAccessGuild`) : les noms d'objets ;   │
 * │   · `/api/ou-trouver` (`apiAuth` + `canAccessGuild`) : la PROVENANCE, lue    │
 * │     dans le même `public/wiki/ou-trouver.json` que celui d'ici.              │
 * │ Autrement dit cette route ne fait pas que suivre `/api/monstres` : elle      │
 * │ contourne le verrou de `/api/ou-trouver`. Ce n'est pas une fuite de données  │
 * │ de guilde — c'est du contenu du client du jeu — mais c'est une INCOHÉRENCE   │
 * │ d'accès à trancher, pas un effet de bord à laisser dormir. Pour refermer :   │
 * │ les deux lignes d'en-tête de `/api/objets`, et sortir /wiki de `(public)`.   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * AUCUN TAUX NE SORT D'ICI : ni pourcentage de butin, ni chance de coffre, ni prix.
 * Ce qui sort, c'est qui lâche quoi — voir `src/lib/wiki.ts`.
 */

/** Le plafond du champ compact (6) et celui de la page (40) passent par le même
 *  paramètre. On borne : une demande de 5 000 lignes n'est pas une recherche. */
function combien(v: string | null): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 3 && n <= 60 ? Math.round(n) : 40;
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const type = p.get("type") ?? "";

  const c: Critere = {
    q: p.get("q") ?? "",
    type: (TYPES_VALIDES.includes(type) ? type : "") as TypeEntree | "",
    // Le filtre qui compte sur un serveur privé : ce qu'AirFlyff a AJOUTÉ. Trois
    // marqueurs le donnent — les deux espaces de noms d'objets propres au serveur,
    // et le drapeau `NEWSERV` des monstres.
    maison: p.get("maison") === "1",
  };

  const r = chercher(c, combien(p.get("n")));
  const f = faitsWiki();

  return NextResponse.json({
    ...r,
    // L'index tout entier, pour que l'écran puisse dire « sur 14 582 » sans le
    // deviner. Compté sur les relevés, jamais écrit à la main.
    // `butins` et `situes` portent la MISE EN GARDE de l'écran : combien de monstres et
    // combien d'objets ont vraiment un bloc de provenance. Le butin ordinaire n'est pas
    // dans le client, et un bloc absent ne veut pas dire « ne lâche rien ».
    index: {
      total: f.total, parType: f.parType, maison: f.maison, provenances: f.provenances,
      butins: f.butins, situes: f.situes, genere: f.genere,
    },
  });
}
