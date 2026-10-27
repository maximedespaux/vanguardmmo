import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { audit } from "@/lib/audit";
import { REFUS_TYPE_VIDEO, REFUS_VIDEO_MEMBRE, RE_ID_VIDEO, VIDEO_MAX_OCTETS, estMimeVideo, lirePlage, peutVoirVideo, refusEnvoiExpire, tailleDite, vueVideo } from "@/lib/videos";
import { ecrireFichierVideo, effacerFichiersVideo, fluxFichierVideo, tailleFichierVideo } from "@/lib/videos-serveur";

/**
 * LE FICHIER D'UNE VIDÉO DE DÉBRIEF (spec §6, routes 16 et 17 ; §10.2 ; lot 8).
 *
 * Le flux est écrit et lu SANS ÊTRE GARDÉ EN MÉMOIRE : ni `req.formData()` (il chargerait les
 * 100 Mo d'un coup), ni `arrayBuffer()`. D'où le moteur Node (le disque) et le rendu à chaque
 * requête. Le middleware ne couvre aucune route /api, et ne doit jamais couvrir celle-ci : il
 * couperait tout corps à 10 Mo (piège n° 13).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const erreur = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * PUT — L'ENVOI (route 16). Le corps est le fichier BRUT (`XMLHttpRequest`, pour la barre de
 * progression), `Content-Type: video/mp4 | video/webm`, `Content-Length` obligatoire. Seul celui
 * qui a créé la ligne (route 15) l'envoie, et la ligne doit être encore en envoi. Les contrôles,
 * dans l'ordre : 411 sans `Content-Length`, 413 au-delà de 100 Mo AVANT de lire un octet, puis le
 * compteur pendant l'écriture (le client peut mentir sur l'en-tête, le compteur non), le type lu
 * dans les premiers octets (415 : un `.mov` renommé en `.mp4` ne passe pas), et un envoi
 * interrompu ne laisse rien (400). 200 `{ video }` : la ligne passe en `pret`.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return erreur(403, REFUS_VIDEO_MEMBRE);
  const { id } = await params;
  if (!RE_ID_VIDEO.test(id)) return erreur(404, "Vidéo introuvable.");
  const v = await prisma.seanceVideo.findUnique({ where: { id }, include: { seance: { select: { cle: true } } } });
  if (!v || v.type !== "fichier") return erreur(404, "Vidéo introuvable.");
  if (v.auteurId !== a.user.id) return erreur(403, "Seul celui qui a commencé l'envoi peut envoyer ce fichier.");
  if (v.statut !== "envoi") return erreur(409, "Ce fichier est déjà envoyé.");
  // Plus de 2 h après la création de la ligne, l'envoi ne compte plus dans les bornes : il expire.
  const expire = refusEnvoiExpire(v.createdAt, Date.now());
  if (expire) return erreur(expire.status, expire.error);

  const brut = req.headers.get("content-length");
  if (!brut || !/^\d{1,12}$/.test(brut)) return erreur(411, "Taille de l'envoi inconnue (en-tête Content-Length) : renvoie le fichier depuis la page.");
  const longueur = Number(brut);
  if (longueur > VIDEO_MAX_OCTETS) return erreur(413, `Ce fichier fait ${tailleDite(longueur)} : 100 Mo au plus.`);
  if (longueur !== v.taille) return erreur(400, "La taille envoyée n'est pas celle annoncée : recommence l'envoi depuis la page.");
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!estMimeVideo(type) || type !== v.mime) return erreur(415, REFUS_TYPE_VIDEO);
  if (!req.body) return erreur(400, "Aucun fichier reçu.");

  const r = await ecrireFichierVideo({ id, corps: req.body, attendu: longueur, max: longueur, mime: type });
  if (!r.ok) return erreur(r.status, r.error);
  // La ligne a pu être supprimée pendant l'envoi (route 19) : le fichier ne doit pas lui survivre.
  const n = await prisma.seanceVideo.updateMany({ where: { id, statut: "envoi" }, data: { statut: "pret", fichier: r.fichier, taille: r.taille } });
  if (n.count !== 1) {
    await effacerFichiersVideo(id);
    return erreur(409, "Cette vidéo a été supprimée pendant l'envoi.");
  }
  await audit(a.user.username, "seance.video", v.seance.cle, `fichier ${tailleDite(r.taille)} — ${v.titre}`);
  const pret = await prisma.seanceVideo.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ video: vueVideo(pret, true), message: "Vidéo envoyée." });
}

/**
 * GET — LA LECTURE (route 17), par morceaux : `Range` donne 206 avec `Content-Range` et le seul
 * morceau demandé (`createReadStream` d'un octet à un autre) — sans cela, le navigateur ne pourrait
 * pas sauter à 1:35 sans tout télécharger. La règle de visibilité est celle du débrief (§10.3) :
 * le staff et l'auteur tout de suite, les membres une fois le débrief publié.
 */
export async function GET(req: Request, ctx: Ctx) {
  return lire(req, ctx, false);
}
export async function HEAD(req: Request, ctx: Ctx) {
  return lire(req, ctx, true);
}

async function lire(req: Request, { params }: Ctx, tete: boolean) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  const { id } = await params;
  if (!RE_ID_VIDEO.test(id)) return erreur(404, "Vidéo introuvable.");
  const v = await prisma.seanceVideo.findUnique({ where: { id }, include: { seance: { select: { debriefPublieAt: true } } } });
  if (!v || v.type !== "fichier" || v.statut !== "pret" || !v.fichier || !estMimeVideo(v.mime)) return erreur(404, "Vidéo introuvable.");
  if (!peutVoirVideo({ staff: canAccessAdmin(a.user.role), auteur: v.auteurId === a.user.id, publie: !!v.seance.debriefPublieAt })) {
    return erreur(403, "Cette vidéo se regarde une fois le débrief publié.");
  }
  const taille = await tailleFichierVideo(v.fichier);
  if (taille === null) return erreur(404, "Le fichier de cette vidéo n'est plus sur le serveur.");

  const entetes: Record<string, string> = {
    "Content-Type": v.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  };
  const plage = lirePlage(req.headers.get("range"), taille);
  if (plage === "hors") return new Response(null, { status: 416, headers: { ...entetes, "Content-Range": `bytes */${taille}` } });
  if (plage) {
    const corps = tete ? null : fluxFichierVideo(v.fichier, plage);
    return new Response(corps, {
      status: 206,
      headers: { ...entetes, "Content-Range": `bytes ${plage.debut}-${plage.fin}/${taille}`, "Content-Length": String(plage.fin - plage.debut + 1) },
    });
  }
  return new Response(tete ? null : fluxFichierVideo(v.fichier), { status: 200, headers: { ...entetes, "Content-Length": String(taille) } });
}
