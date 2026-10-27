import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { audit } from "@/lib/audit";
import { derouleDe, resoudreCle } from "@/lib/evenements";
import { lireParametres } from "@/lib/seances-serveur";
import {
  ENVOI_ABANDONNE_MS, REFUS_VIDEO_MEMBRE, VIDEO_MAX_OCTETS, adresseFichier, lireDemandeVideo, refusEnvoiFichier, refusSeanceVideo, vueVideo,
} from "@/lib/videos";
import { espaceLibre, filtreOccupation, seanceEnBase, verrouillerVideos } from "@/lib/videos-serveur";

/**
 * JOINDRE UNE VIDÉO AU DÉBRIEF D'UNE SÉANCE (spec §6, route 15 ; §10 ; lot 8).
 *
 * LE STAFF SEULEMENT (décision 3 de Maxime, 2026-10-21 : « le staff envoie des fichiers ET des
 * liens, les membres regardent ») : `apiGuild`, puis `canAccessAdmin` — un membre reçoit 403 avec
 * de quoi faire (envoyer sa vidéo à un bras droit). Un visiteur ou un candidat n'y arrive jamais.
 *
 * `{ type: "lien" | "fichier", url?, etape?, moment?: "1:35", titre, taille?, mime? }`, lu par
 * `lireDemandeVideo` (lib/videos.ts) contre le déroulé de la séance (figé, sinon le paramétrage).
 * - Un LIEN est normalisé (`lireLienVideo`) et rangé tout de suite : 201 `{ video }`.
 * - Un FICHIER : la ligne naît en `statut: "envoi"`, après les bornes (fichiers par séance,
 *   quota, disque) relues SOUS VERROU — deux envois lancés ensemble ne passent pas tous les deux.
 *   201 `{ id, envoi, max }` : le navigateur envoie ensuite le fichier BRUT à `envoi` (route 16).
 * La séance doit avoir commencé, et ne pas être annulée ; elle naît ici si rien n'y a été fait.
 */
export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: REFUS_VIDEO_MEMBRE }, { status: 403 });
  const { cle } = await params;
  const maintenant = new Date();
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), maintenant, gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;

  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { id: true, etapes: true, annulee: true } });
  const rs = refusSeanceVideo({ commencee: s.debut.getTime() <= maintenant.getTime(), annulee: ligne?.annulee ?? false });
  if (rs) return NextResponse.json({ error: rs.error }, { status: rs.status });

  const etapes = derouleDe(ligne?.etapes, s.evenement === "cs" ? cs.data : gs.data).etapes;
  const d = lireDemandeVideo(await req.json().catch(() => null), etapes);
  if (!d.ok) return NextResponse.json({ error: d.error }, { status: d.status });
  const demande = d.demande;

  const seanceId = ligne?.id ?? (await seanceEnBase(prisma, s)).id;
  const commun = { seanceId, etape: demande.etape, moment: demande.moment, titre: demande.titre, auteurId: a.user.id, auteur: a.user.username };

  if (demande.type === "lien") {
    const v = await prisma.seanceVideo.create({
      data: { ...commun, type: "lien", source: demande.lien.source, url: demande.lien.url, statut: "pret" },
    });
    await audit(a.user.username, "seance.video", s.cle, `lien ${demande.lien.source} — ${demande.titre}`);
    return NextResponse.json({ video: vueVideo(v, true), message: "Vidéo jointe." }, { status: 201 });
  }

  // L'espace libre se mesure hors du verrou : `statfs` ne doit pas faire attendre les autres.
  const libre = await espaceLibre();
  const plafonds = cs.data.videos;
  const res = await prisma.$transaction(async (tx) => {
    await verrouillerVideos(tx);
    const occupe = filtreOccupation(maintenant.getTime());
    const [n, somme] = await Promise.all([
      tx.seanceVideo.count({ where: { ...occupe, seanceId } }),
      tx.seanceVideo.aggregate({ _sum: { taille: true }, where: occupe }),
    ]);
    const refus = refusEnvoiFichier({
      taille: demande.taille, fichiersSeance: n, maxParSeance: plafonds.maxParSeance,
      utilise: somme._sum.taille ?? 0, quotaGo: plafonds.quotaGo, libre,
    });
    if (refus) return refus;
    const v = await tx.seanceVideo.create({
      data: { ...commun, type: "fichier", mime: demande.mime, taille: demande.taille, statut: "envoi" },
    });
    return { ok: true as const, id: v.id };
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({
    id: res.id, envoi: adresseFichier(res.id), max: VIDEO_MAX_OCTETS,
    // Le délai après lequel un envoi non terminé est abandonné (la purge l'efface).
    abandonApres: ENVOI_ABANDONNE_MS,
  }, { status: 201 });
}
