/**
 * LES VIDÉOS DE DÉBRIEF SUR LE DISQUE ET EN BASE (SPEC-CHAMBRES-RECENSEMENT §10.2, §10.5 ; lot 8).
 *
 * Les fichiers vivent sur un VOLUME DOCKER nommé (`vanguard_videos`, monté sur /app/data/videos
 * dans le service `web` ET dans le service `bot`, qui les purge), JAMAIS dans `public/` : tout ce
 * qui s'y trouve est servi à n'importe qui, sans garde. Ils ne sortent que par la route 17, qui
 * vérifie qui regarde. Le dossier se règle par `VIDEOS_DIR` (facultative ; par défaut
 * `data/videos` sous le dossier de lancement : /app/data/videos dans l'image, ./data/videos en
 * local, ignoré par git grâce à `/data/`).
 *
 * Le client Prisma est PASSÉ EN PARAMÈTRE (le site donne `@/lib/prisma`, le bot le sien), et ce
 * module n'importe pas `server-only` (piège n° 7) : le bot le lit sous tsx pour la purge.
 */
import { createReadStream, promises as fsp } from "node:fs";
import { join } from "node:path";
import { Readable, Transform, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as FluxWeb } from "node:stream/web";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ENVOI_ABANDONNE_MS, EXTENSION_VIDEO, OCTETS_DE_TETE, RE_FICHIER_VIDEO, bilanPurge, peutVoirVideo, planPurge, refusDesOctets, tailleDite, vueVideo,
  type FichierDisque, type MimeVideo, type PlanPurge, type Refus, type VueVideo,
} from "@/lib/videos";

type Db = PrismaClient | Prisma.TransactionClient;

/** Le dossier des vidéos : `VIDEOS_DIR`, sinon `data/videos` sous le dossier de lancement. */
export function dossierVideos(): string {
  return process.env.VIDEOS_DIR?.trim() || join(process.cwd(), "data", "videos");
}

/** Le chemin d'un fichier vidéo. Un nom qui n'est pas `<id>.mp4|webm|part` est refusé : rien ne
 *  sort du dossier, ni par `..` ni par un chemin absolu. */
export function cheminVideo(nom: string): string {
  if (!RE_FICHIER_VIDEO.test(nom)) throw new Error(`Nom de fichier vidéo refusé : ${nom}`);
  return join(dossierVideos(), nom);
}

async function assurerDossier() {
  await fsp.mkdir(dossierVideos(), { recursive: true });
}

/** L'espace libre du disque qui porte le volume (`fs.statfs`) ; null s'il ne se mesure pas. */
export async function espaceLibre(): Promise<number | null> {
  try {
    await assurerDossier();
    const s = await fsp.statfs(dossierVideos());
    return Number(s.bavail) * Number(s.bsize);
  } catch {
    return null;
  }
}

/** Ce qui compte dans les bornes : les fichiers prêts, et les envois de moins de 2 h (leur
 *  taille annoncée) — sinon dix envois lancés ensemble passeraient tous le contrôle (§10.5). */
export const filtreOccupation = (now: number): Prisma.SeanceVideoWhereInput => ({
  type: "fichier",
  OR: [{ statut: "pret" }, { statut: "envoi", createdAt: { gte: new Date(now - ENVOI_ABANDONNE_MS) } }],
});

/** L'espace occupé par les vidéos, et leur nombre (l'écran du paramétrage l'affiche, §9.4). */
export async function occupationVideos(db: Db, now = Date.now()): Promise<{ octets: number; fichiers: number }> {
  const a = await db.seanceVideo.aggregate({ _sum: { taille: true }, _count: { _all: true }, where: filtreOccupation(now) });
  return { octets: a._sum.taille ?? 0, fichiers: a._count._all };
}

/** Le verrou des envois : toutes les créations de fichier passent l'une après l'autre (route 15),
 *  le temps de compter et d'écrire la ligne. Un nombre fixe, propre à ce verrou (« VIDE »). */
export const VERROU_VIDEOS = BigInt(0x56494445);
export async function verrouillerVideos(tx: Prisma.TransactionClient) {
  // pg_advisory_xact_lock rend `void`, que Prisma ne sait pas lire : on le prend dans une sous-requête.
  await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(${VERROU_VIDEOS})) AS v`;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   L'ENVOI : le flux brut, écrit sans rien garder en mémoire (route 16)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

class TropGros extends Error {}
class MauvaisType extends Error {}

/**
 * Le COMPTEUR posé entre la requête et le disque : il coupe dès `max + 1` octets (le client peut
 * mentir sur `Content-Length`, le compteur non) et juge le type sur les 12 premiers octets, avant
 * d'en écrire davantage. `recus()` : combien sont passés.
 */
export function compteurVideo(max: number, mime: MimeVideo): Transform & { recus: () => number } {
  let recus = 0;
  let tete: Buffer | null = Buffer.alloc(0);
  const t = new Transform({
    transform(morceau: Buffer, _enc: BufferEncoding, fini: TransformCallback) {
      recus += morceau.length;
      if (recus > max) { fini(new TropGros()); return; }
      if (tete) {
        tete = Buffer.concat([tete, morceau]);
        if (tete.length < OCTETS_DE_TETE) { fini(); return; } // on attend d'en savoir assez
        const refus = refusDesOctets(mime, tete);
        if (refus) { fini(new MauvaisType(refus)); return; }
        const tout = tete;
        tete = null;
        fini(null, tout);
        return;
      }
      fini(null, morceau);
    },
    flush(fini: TransformCallback) {
      // Un fichier plus court que 12 octets n'a pas pu être jugé : ce n'est pas une vidéo.
      if (tete) { fini(new MauvaisType(refusDesOctets(mime, tete) ?? "Ce fichier est vide.")); return; }
      fini();
    },
  });
  return Object.assign(t, { recus: () => recus });
}

/**
 * ÉCRIT LE FICHIER D'UNE VIDÉO : le flux de la requête → le compteur → `<id>.part` (ouvert en
 * création exclusive : deux envois de la même ligne ne s'écrivent pas l'un sur l'autre), puis
 * renommé en `<id>.mp4` (ou `.webm`) s'il est complet. Tout échec efface le fichier partiel.
 * `attendu` : le `Content-Length` — un flux qui s'arrête avant (envoi interrompu) est refusé.
 */
export async function ecrireFichierVideo(o: { id: string; corps: unknown; attendu: number; max: number; mime: MimeVideo }):
  Promise<{ ok: true; fichier: string; taille: number } | Refus> {
  await assurerDossier();
  const part = cheminVideo(`${o.id}.part`);
  const fichier = `${o.id}.${EXTENSION_VIDEO[o.mime]}`;
  let fh: Awaited<ReturnType<typeof fsp.open>>;
  try {
    fh = await fsp.open(part, "wx");
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "EEXIST") return { ok: false, status: 409, error: "Un envoi de ce fichier est déjà en cours : attends-le, ou supprime la vidéo et recommence." };
    throw e;
  }
  const compteur = compteurVideo(o.max, o.mime);
  try {
    await pipeline(Readable.fromWeb(o.corps as FluxWeb<Uint8Array>), compteur, fh.createWriteStream());
  } catch (e) {
    await fsp.rm(part, { force: true }).catch(() => {});
    if (e instanceof TropGros) return { ok: false, status: 413, error: "Ce fichier dépasse 100 Mo : il a été refusé." };
    if (e instanceof MauvaisType) return { ok: false, status: 415, error: e.message };
    return { ok: false, status: 400, error: "L'envoi a été interrompu : recommence." };
  } finally {
    await fh.close().catch(() => {});
  }
  const recus = compteur.recus();
  if (recus !== o.attendu) {
    await fsp.rm(part, { force: true }).catch(() => {});
    return { ok: false, status: 400, error: `L'envoi s'est arrêté à ${tailleDite(recus)} sur ${tailleDite(o.attendu)} : recommence.` };
  }
  try {
    await fsp.rename(part, cheminVideo(fichier));
  } catch {
    // Le `.part` a disparu pendant l'envoi : la vidéo a été supprimée entre-temps (route 19).
    await fsp.rm(part, { force: true }).catch(() => {});
    return { ok: false, status: 409, error: "Cette vidéo a été supprimée pendant l'envoi." };
  }
  return { ok: true, fichier, taille: recus };
}

/** Efface les fichiers d'une vidéo (le fichier prêt, et un `.part` en cours) ; rend ce qu'ils pesaient. */
export async function effacerFichiersVideo(id: string): Promise<number> {
  let octets = 0;
  for (const ext of ["mp4", "webm", "part"]) {
    const p = cheminVideo(`${id}.${ext}`);
    const s = await fsp.stat(p).catch(() => null);
    if (!s) continue;
    await fsp.rm(p, { force: true }).catch(() => {});
    octets += s.size;
  }
  return octets;
}

/** La taille d'un fichier vidéo sur le volume ; null s'il n'y est pas. */
export async function tailleFichierVideo(nom: string): Promise<number | null> {
  const s = await fsp.stat(cheminVideo(nom)).catch(() => null);
  return s?.isFile() ? s.size : null;
}

/** Le flux d'un fichier vidéo, entier ou d'un octet à un autre (fin comprise), pour la réponse :
 *  si le navigateur coupe (il saute ailleurs dans la vidéo), la lecture du disque s'arrête. */
export function fluxFichierVideo(nom: string, plage?: { debut: number; fin: number }): ReadableStream<Uint8Array> {
  const flux = createReadStream(cheminVideo(nom), plage ? { start: plage.debut, end: plage.fin } : undefined);
  return Readable.toWeb(flux) as unknown as ReadableStream<Uint8Array>;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES VIDÉOS D'UNE SÉANCE, TELLES QU'UN COMPTE LES VOIT (route 4)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Les vidéos PRÊTES d'une séance qu'un compte peut voir (§10.3) : toutes pour le staff, les
 *  siennes pour un auteur, toutes pour un membre une fois le débrief publié. */
export async function videosDeLaSeance(
  db: Db, ligne: { id: string; debriefPublieAt: Date | null } | null, o: { staff: boolean; moi: string },
): Promise<VueVideo[]> {
  if (!ligne) return [];
  const rows = await db.seanceVideo.findMany({ where: { seanceId: ligne.id, statut: "pret" }, orderBy: { createdAt: "asc" } });
  const publie = !!ligne.debriefPublieAt;
  return rows.filter((r) => peutVoirVideo({ staff: o.staff, auteur: r.auteurId === o.moi, publie })).map((r) => vueVideo(r, o.staff));
}

/** La séance en base, créée au besoin (la séance naît au premier geste, jamais à la lecture) —
 *  sans toucher à sa version : joindre une vidéo ne doit pas faire recommencer une écriture du
 *  chrono ou du débrief qui se fait au même moment. */
export async function seanceEnBase(db: PrismaClient, ref: { cle: string; evenement: string; date: string; creneau: string; debut: Date }) {
  for (let essai = 0; essai < 3; essai++) {
    const s = await db.seanceGuilde
      .upsert({ where: { cle: ref.cle }, create: { cle: ref.cle, evenement: ref.evenement, date: ref.date, creneau: ref.creneau, debut: ref.debut }, update: {}, select: { id: true, debriefPublieAt: true } })
      .catch((e) => { if ((e as { code?: string })?.code === "P2002") return null; throw e; });
    if (s) return s;
  }
  throw new Error(`La séance ${ref.cle} n'a pas pu être créée.`);
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LA PURGE (§10.5) — la tâche du bot, chaque jour à 4 h 30, sur le volume monté chez lui
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Les fichiers du volume dont le nom est celui d'une vidéo, avec leur taille et leur âge. */
async function fichiersDuVolume(): Promise<FichierDisque[]> {
  const noms = await fsp.readdir(dossierVideos()).catch(() => [] as string[]);
  const out: FichierDisque[] = [];
  for (const nom of noms) {
    if (!RE_FICHIER_VIDEO.test(nom)) continue;
    const s = await fsp.stat(join(dossierVideos(), nom)).catch(() => null);
    if (s?.isFile()) out.push({ nom, taille: s.size, modifie: s.mtimeMs });
  }
  return out;
}

/**
 * NETTOIE LE VOLUME ET LA BASE (`planPurge`, lib/videos.ts) : les fichiers des séances plus
 * anciennes que `conservationJours`, les envois abandonnés depuis plus de 2 h, les `.part`
 * oubliés, les fichiers sans ligne de plus d'un jour. Les LIENS restent. Les lignes partent avant
 * les fichiers : un fichier dont la ligne survit à une panne serait servi en 404 ; l'inverse,
 * un fichier sans ligne, la purge suivante l'efface.
 */
export async function purgerVideos(db: PrismaClient, conservationJours: number, now = Date.now()): Promise<PlanPurge & { texte: string }> {
  const lignes = await db.seanceVideo.findMany({
    where: { type: "fichier" },
    select: { id: true, type: true, statut: true, fichier: true, createdAt: true, seance: { select: { debut: true } } },
  });
  const plan = planPurge({
    lignes: lignes.map((l) => ({ id: l.id, type: l.type, statut: l.statut, fichier: l.fichier, createdAt: l.createdAt.getTime(), debutSeance: l.seance.debut.getTime() })),
    fichiers: await fichiersDuVolume(), now, conservationJours,
  });
  if (plan.anciennes.length) await db.seanceVideo.deleteMany({ where: { id: { in: plan.anciennes }, type: "fichier" } });
  // Un envoi qui s'est terminé depuis la lecture n'est plus « envoi » : il reste.
  if (plan.abandonnees.length) await db.seanceVideo.deleteMany({ where: { id: { in: plan.abandonnees }, statut: "envoi" } });
  for (const nom of plan.fichiers) await fsp.rm(cheminVideo(nom), { force: true }).catch(() => {});
  return { ...plan, texte: bilanPurge(plan) };
}

