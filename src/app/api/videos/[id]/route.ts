import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { audit } from "@/lib/audit";
import { derouleDe } from "@/lib/evenements";
import { lireParametres } from "@/lib/seances-serveur";
import { REFUS_VIDEO_MEMBRE, RE_ID_VIDEO, lireEtapeVideo, lireMomentVideo, lireTitreVideo, vueVideo } from "@/lib/videos";
import { effacerFichiersVideo } from "@/lib/videos-serveur";

/**
 * UNE VIDÉO DE DÉBRIEF : la modifier (route 18), la supprimer (route 19) — spec §6, §10.3, lot 8.
 *
 * Le staff seulement (décision 3 de Maxime : seul le staff joint des vidéos, donc seul le staff
 * y touche) : `apiGuild`, puis `canAccessAdmin`.
 */

type Ctx = { params: Promise<{ id: string }> };
const erreur = (status: number, error: string) => NextResponse.json({ error }, { status });

/** PATCH `{ titre?, etape?, moment? }` — l'étape se lit contre le déroulé de SA séance ;
 *  `etape: null` la range sous « toute la séance », `moment: ""` la fait partir du début. */
export async function PATCH(req: Request, { params }: Ctx) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return erreur(403, REFUS_VIDEO_MEMBRE);
  const { id } = await params;
  if (!RE_ID_VIDEO.test(id)) return erreur(404, "Vidéo introuvable.");
  const v = await prisma.seanceVideo.findUnique({ where: { id }, include: { seance: { select: { cle: true, evenement: true, etapes: true } } } });
  if (!v) return erreur(404, "Vidéo introuvable.");
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b || typeof b !== "object" || Array.isArray(b)) return erreur(400, "Demande illisible.");

  const data: { titre?: string; etape?: string | null; moment?: number | null } = {};
  if ("titre" in b) { const t = lireTitreVideo(b.titre); if (!t.ok) return erreur(t.status, t.error); data.titre = t.titre; }
  if ("etape" in b) {
    const p = await lireParametres(prisma, v.seance.evenement === "gs" ? "gs" : "cs");
    const e = lireEtapeVideo(b.etape, derouleDe(v.seance.etapes, p.data).etapes);
    if (!e.ok) return erreur(e.status, e.error);
    data.etape = e.etape;
  }
  if ("moment" in b) { const m = lireMomentVideo(b.moment); if (!m.ok) return erreur(m.status, m.error); data.moment = m.moment; }
  if (!Object.keys(data).length) return erreur(400, "Rien à modifier.");

  const apres = await prisma.seanceVideo.update({ where: { id }, data });
  return NextResponse.json({ video: vueVideo(apres, true), message: "Vidéo modifiée." });
}

/** DELETE — la ligne ET le fichier (et un envoi en cours : son `.part`). 204. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return erreur(403, REFUS_VIDEO_MEMBRE);
  const { id } = await params;
  if (!RE_ID_VIDEO.test(id)) return erreur(404, "Vidéo introuvable.");
  const v = await prisma.seanceVideo.findUnique({ where: { id }, include: { seance: { select: { cle: true } } } });
  if (!v) return erreur(404, "Vidéo introuvable.");
  // La ligne d'abord : un envoi qui se termine maintenant ne trouve plus de ligne à passer en
  // « prêt », et efface lui-même son fichier (route 16).
  await prisma.seanceVideo.deleteMany({ where: { id } });
  if (v.type === "fichier") await effacerFichiersVideo(id);
  // Un envoi abandonné que le navigateur nettoie n'est pas une suppression à retenir.
  if (v.statut === "pret") await audit(a.user.username, "seance.video_supprimee", v.seance.cle, v.titre);
  return new Response(null, { status: 204 });
}
