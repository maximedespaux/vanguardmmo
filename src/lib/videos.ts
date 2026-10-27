/**
 * LES VIDÉOS DE DÉBRIEF — les règles (SPEC-CHAMBRES-RECENSEMENT §10 ; lot 8).
 *
 * Sur la page d'un débrief, le STAFF (les quatre rangs des bras droits — décision 3 de Maxime
 * du 2026-10-21) joint une vidéo qui montre une erreur : un LIEN (YouTube non répertorié, Twitch,
 * Medal, le message Discord où elle a été postée — lu par `lireLienVideo`, lib/evenements.ts) ou
 * un FICHIER MP4 ou WebM de 100 Mo au plus, rangé sur le volume vidéos du serveur. Elle se range
 * sous une ÉTAPE, avec le MOMENT où regarder (« 1:35 ») : « Lire » ouvre la vidéo à ce moment-là.
 * Les membres la regardent une fois le débrief publié, comme le débrief lui-même.
 *
 * Module PUR, comme lib/evenements.ts : ni React, ni next/*, ni Prisma, ni fs. Le site (routes 15 à
 * 19, onglet Bilans) et le bot (le bloc 🎬 du débrief publié, la purge de 4 h 30) le lisent tous
 * les deux ; ce qui touche au disque est dans lib/videos-serveur.ts.
 */
import { fmtDuree, lireDuree } from "@/lib/chambres";
import {
  LIBELLE_SOURCE, MOMENT_VIDEO_MAX, lireLienVideo, retirerMentions,
  type Etape, type LecteurLien, type LienVideo, type SourceVideo,
} from "@/lib/evenements";

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES BORNES (§10.2)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export const MO = 1024 * 1024;
export const GO = 1024 * MO;
/** 100 Mo au plus par fichier : contrôlés côté serveur à la création de la ligne (taille
 *  annoncée), sur `Content-Length` avant de lire un octet, puis en comptant les octets reçus. */
export const VIDEO_MAX_OCTETS = 100 * MO; // 104 857 600
export const TITRE_VIDEO_MAX = 120;
export const MIMES_VIDEO = ["video/mp4", "video/webm"] as const;
export type MimeVideo = (typeof MIMES_VIDEO)[number];
export const EXTENSION_VIDEO: Record<MimeVideo, "mp4" | "webm"> = { "video/mp4": "mp4", "video/webm": "webm" };
export const estMimeVideo = (v: unknown): v is MimeVideo => typeof v === "string" && (MIMES_VIDEO as readonly string[]).includes(v);
/** Un envoi commencé il y a plus de 2 h est abandonné : sa ligne et son `.part` s'effacent, et
 *  sa taille annoncée cesse de compter dans le quota. */
export const ENVOI_ABANDONNE_MS = 2 * 3_600_000;
/** Un fichier sans ligne (un arrêt entre l'écriture et la base) est effacé au bout d'un jour. */
export const ORPHELIN_MS = 86_400_000;
/** Sous 1 Go libre sur le disque du serveur, plus aucun envoi : la base et le site en ont besoin. */
export const DISQUE_LIBRE_MIN = GO;

/** L'identifiant d'une vidéo (un cuid) et ses fichiers sur le volume : `<id>.mp4`, `<id>.webm`,
 *  et `<id>.part` pendant l'envoi. Tout autre nom est ignoré — jamais effacé, jamais servi. */
export const RE_ID_VIDEO = /^[a-z0-9]{20,40}$/;
export const RE_FICHIER_VIDEO = /^([a-z0-9]{20,40})\.(mp4|webm|part)$/;

export type Refus = { ok: false; status: number; error: string };
const refus = (status: number, error: string): Refus => ({ ok: false, status, error });

export const REFUS_VIDEO_MEMBRE = "Seul le staff joint des vidéos (décision du 21/10) : envoie la tienne à un bras droit, avec l'étape et le moment.";
export const REFUS_TYPE_VIDEO = "Ce fichier n'est ni un MP4 ni un WebM. Exporte-le en MP4 (Medal, OBS ou l'appareil photo le font).";

/** « 64 Mo », « 1,2 Go », « 4,5 Mo », « 12 Ko ». */
export function tailleDite(octets: number): string {
  const o = Math.max(0, octets || 0);
  if (o >= GO) return `${(o / GO).toFixed(1).replace(".", ",")} Go`;
  if (o === 0) return "0 Mo";
  if (o < MO) return `${Math.max(1, Math.round(o / 1024))} Ko`;
  const mo = o / MO;
  return mo >= 10 ? `${Math.round(mo)} Mo` : `${mo.toFixed(1).replace(".", ",")} Mo`;
}

/** « 1:35 » ; null : rien. */
export const momentDit = (s: number | null | undefined) => (s === null || s === undefined ? null : fmtDuree(s));

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE TYPE DU FICHIER : ses premiers octets, pas son nom (§10.2)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Les marques MP4 que les navigateurs lisent. `qt  ` (le MOV de l'iPhone) n'en est pas : il ne
 *  se lit pas partout, et un `.mov` renommé en `.mp4` doit être refusé. */
export const MARQUES_MP4 = ["isom", "iso2", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "dash"];
/** Combien d'octets il faut pour juger : `ftyp` aux octets 4 à 7, la marque aux octets 8 à 11. */
export const OCTETS_DE_TETE = 12;

/**
 * Le type d'un fichier, lu dans ses premiers octets : `video/mp4` (`ftyp` et une marque reconnue),
 * `video/webm` (l'en-tête EBML `1A 45 DF A3`), ou ce qui le fait refuser — un MOV QuickTime
 * (`qt`), autre chose (`inconnu`), ou trop court pour juger.
 */
export function typeDesOctets(o: Uint8Array): { type: MimeVideo } | { refus: "qt" | "inconnu" | "court" } {
  if (o.length >= 4 && o[0] === 0x1a && o[1] === 0x45 && o[2] === 0xdf && o[3] === 0xa3) return { type: "video/webm" };
  if (o.length < OCTETS_DE_TETE) return { refus: "court" };
  const ascii = (a: number, b: number) => String.fromCharCode(...o.subarray(a, b));
  if (ascii(4, 8) !== "ftyp") return { refus: "inconnu" };
  const marque = ascii(8, 12);
  if (marque === "qt  ") return { refus: "qt" };
  return MARQUES_MP4.includes(marque) ? { type: "video/mp4" } : { refus: "inconnu" };
}

/** Pourquoi refuser ces premiers octets pour un fichier annoncé `mime` (null : il passe). Le type
 *  lu doit être celui annoncé : un WebM envoyé comme MP4 serait servi sous le mauvais type. */
export function refusDesOctets(mime: MimeVideo, o: Uint8Array): string | null {
  const t = typeDesOctets(o);
  if ("refus" in t) return t.refus === "qt" ? `${REFUS_TYPE_VIDEO} (C'est un MOV QuickTime, que les navigateurs ne lisent pas partout.)` : REFUS_TYPE_VIDEO;
  return t.type === mime ? null : REFUS_TYPE_VIDEO;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LA LECTURE PAR MORCEAUX : l'en-tête Range (§10.2)
   Sans elle, le navigateur ne peut pas sauter à 1:35 dans un MP4 sans tout télécharger.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type Plage = { debut: number; fin: number }; // fin comprise

/**
 * Lit `Range: bytes=…` pour un fichier de `taille` octets : une plage (206), null (le fichier
 * entier, 200 : pas d'en-tête, ou une forme qu'on ignore — plusieurs plages, une plage à
 * l'envers ; la RFC 9110 permet de les ignorer), ou "hors" (416 : la plage commence après la fin).
 */
export function lirePlage(entete: string | null | undefined, taille: number): Plage | null | "hors" {
  if (!entete) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(entete.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (taille <= 0) return "hors";
  if (m[1] === "") {
    // « bytes=-500 » : les 500 derniers octets.
    const n = Number(m[2]);
    return n === 0 ? "hors" : { debut: Math.max(0, taille - n), fin: taille - 1 };
  }
  const debut = Number(m[1]);
  if (debut >= taille) return "hors";
  const fin = m[2] === "" ? taille - 1 : Math.min(Number(m[2]), taille - 1);
  return fin < debut ? null : { debut, fin };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LA DEMANDE : joindre une vidéo (route 15), la modifier (route 18)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** L'étape d'une vidéo : un code du déroulé de la séance, ou null (« toute la séance »). */
export function lireEtapeVideo(v: unknown, etapes: Pick<Etape, "code">[]): { ok: true; etape: string | null } | Refus {
  if (v === null || v === undefined || v === "") return { ok: true, etape: null };
  if (typeof v === "string" && etapes.some((e) => e.code === v)) return { ok: true, etape: v };
  return refus(400, "Cette étape n'existe pas dans le déroulé de la séance.");
}

/** Le moment où sauter, saisi comme un chrono (« 1:35 », « 95 », « 1m35 » — `lireDuree`, §4.1).
 *  Vide : null (le début, ou le `t=` du lien). */
export function lireMomentVideo(v: unknown): { ok: true; moment: number | null } | Refus {
  const s = lireDuree(v);
  if (s === undefined) return refus(400, "Moment illisible : écris par exemple 1:35, 95 ou 1m35.");
  if (s !== null && s > MOMENT_VIDEO_MAX) return refus(400, "Ce moment dépasse 24 h : écris par exemple 1:35.");
  return { ok: true, moment: s };
}

/** Le titre : ce que la vidéo montre, sur une ligne, sans mention (il part sur Discord). */
export function lireTitreVideo(v: unknown): { ok: true; titre: string } | Refus {
  const t = typeof v === "string" ? retirerMentions(v).replace(/\s+/g, " ").trim() : "";
  if (!t) return refus(400, "Donne un titre à la vidéo : ce qu'elle montre (« Aggro ratée sur Kraavos »).");
  if (t.length > TITRE_VIDEO_MAX) return refus(400, `Le titre tient en ${TITRE_VIDEO_MAX} signes au plus.`);
  return { ok: true, titre: t };
}

export type DemandeVideo =
  | { type: "lien"; etape: string | null; moment: number | null; titre: string; lien: Extract<LienVideo, { ok: true }> }
  | { type: "fichier"; etape: string | null; moment: number | null; titre: string; taille: number; mime: MimeVideo };

/** La taille annoncée d'un fichier : un entier d'octets, de 1 à 100 Mo. */
export function refusTaille(taille: unknown): Refus | null {
  if (typeof taille !== "number" || !Number.isInteger(taille) || taille <= 0) return refus(400, "Taille du fichier illisible : choisis-le de nouveau.");
  if (taille > VIDEO_MAX_OCTETS) {
    return refus(413, `Ce fichier fait ${tailleDite(taille)} : 100 Mo au plus. Coupe la vidéo, ou mets-la sur YouTube (non répertoriée) et colle le lien.`);
  }
  return null;
}

/**
 * LE CORPS DE LA ROUTE 15 : `{ type: "lien" | "fichier", url?, etape?, moment?, titre, taille?,
 * mime? }`, lu contre le déroulé de la séance. Pour un lien sans moment, le `t=` du lien sert de
 * défaut. Le fichier lui-même arrive ensuite (route 16) : ici, sa taille et son type annoncés.
 */
export function lireDemandeVideo(corps: unknown, etapes: Pick<Etape, "code">[]): { ok: true; demande: DemandeVideo } | Refus {
  const o = corps && typeof corps === "object" && !Array.isArray(corps) ? (corps as Record<string, unknown>) : null;
  if (!o) return refus(400, "Demande illisible.");
  if (o.type !== "lien" && o.type !== "fichier") return refus(400, "Joins un lien ou un fichier.");
  const e = lireEtapeVideo(o.etape, etapes); if (!e.ok) return e;
  const m = lireMomentVideo(o.moment); if (!m.ok) return m;
  const t = lireTitreVideo(o.titre); if (!t.ok) return t;
  if (o.type === "lien") {
    const l = lireLienVideo(o.url);
    if (!l.ok) return refus(400, l.error);
    return { ok: true, demande: { type: "lien", etape: e.etape, moment: m.moment ?? l.moment, titre: t.titre, lien: l } };
  }
  const rt = refusTaille(o.taille); if (rt) return rt;
  if (!estMimeVideo(o.mime)) return refus(415, REFUS_TYPE_VIDEO);
  return { ok: true, demande: { type: "fichier", etape: e.etape, moment: m.moment, titre: t.titre, taille: o.taille as number, mime: o.mime } };
}

/** Une séance où l'on peut joindre une vidéo : commencée, et pas annulée. */
export function refusSeanceVideo(s: { commencee: boolean; annulee: boolean }): Refus | null {
  if (s.annulee) return refus(409, "Cette séance est annulée : pas de débrief, donc pas de vidéo.");
  if (!s.commencee) return refus(409, "Cette séance n'a pas encore eu lieu.");
  return null;
}

/**
 * LES BORNES D'UN ENVOI DE FICHIER (§10.5), relues SOUS VERROU (route 15) : deux envois lancés
 * en même temps ne passent pas ensemble. `fichiersSeance` et `utilise` comptent les fichiers
 * prêts ET les envois de moins de 2 h (leur taille annoncée) : sinon dix envois simultanés
 * passeraient tous le contrôle. `libre` : l'espace libre du disque (null : inconnu, on n'arrête
 * pas l'envoi sur une panne de mesure).
 */
export function refusEnvoiFichier(o: {
  taille: number; fichiersSeance: number; maxParSeance: number; utilise: number; quotaGo: number; libre: number | null;
}): Refus | null {
  if (o.fichiersSeance >= o.maxParSeance) {
    return refus(409, `Cette séance a déjà ${o.maxParSeance} fichier${o.maxParSeance > 1 ? "s" : ""} vidéo. Supprimes-en un, ou mets celle-ci sur YouTube (non répertoriée) et colle le lien.`);
  }
  if (o.utilise + o.taille > o.quotaGo * GO) {
    return refus(507, `L'espace vidéo est plein (${tailleDite(o.utilise)} sur ${o.quotaGo} Go) : supprime d'anciennes vidéos, ou relève le plafond dans le paramétrage des événements.`);
  }
  if (o.libre !== null && o.libre - o.taille < DISQUE_LIBRE_MIN) {
    return refus(507, "Il reste moins de 1 Go sur le disque du serveur : envoi impossible pour l'instant.");
  }
  return null;
}

/**
 * UN ENVOI EXPIRÉ (route 16) : une ligne ouverte il y a plus de 2 h ne reçoit plus son fichier.
 * Passé ce délai, sa taille annoncée cesse de compter dans le quota et dans les fichiers de la
 * séance (`filtreOccupation`) : sans ce refus, des lignes ouvertes puis laissées en attente
 * recevraient ensuite leurs fichiers tous ensemble, au-delà des bornes vérifiées à leur création.
 * La page envoie le fichier dans la seconde qui suit la création : seul un envoi repris très
 * tard tombe ici, et la purge de 4 h 30 efface la ligne.
 */
export function refusEnvoiExpire(createdAt: Date | number, now: number): Refus | null {
  const t = typeof createdAt === "number" ? createdAt : createdAt.getTime();
  return t < now - ENVOI_ABANDONNE_MS
    ? refus(409, "Cet envoi a été commencé il y a plus de 2 h : il a expiré. Joins la vidéo de nouveau.")
    : null;
}

/** Qui voit une vidéo (§10.3) : le staff et l'auteur tout de suite ; tous les membres une fois
 *  le débrief publié — la même règle que le débrief. */
export const peutVoirVideo = (o: { staff: boolean; auteur: boolean; publie: boolean }) => o.staff || o.auteur || o.publie;

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   CE QUE LA PAGE MONTRE (route 4, `videos`)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type VueVideo = {
  id: string;
  etape: string | null;
  moment: number | null;
  titre: string;
  type: "lien" | "fichier";
  source: SourceVideo | "fichier";
  /** Le lien d'origine (normalisé) ; pour un fichier, son adresse sur le site (route 17). */
  url: string;
  lecteur: LecteurLien | { genre: "fichier" };
  mime: string | null;
  taille: number | null;
  auteur: string;
  le: number;
  /** Modifier, supprimer : le staff (décision 3). */
  gerer: boolean;
};

/** Une ligne `SeanceVideo`, telle que la vue la lit. */
export type LigneVideoVue = {
  id: string; etape: string | null; moment: number | null; titre: string; type: string; source: string | null;
  url: string | null; mime: string | null; taille: number | null; auteur: string; createdAt: Date | number;
};

export const adresseFichier = (id: string) => `/api/videos/${id}/fichier`;

export function vueVideo(r: LigneVideoVue, gerer: boolean): VueVideo {
  const le = typeof r.createdAt === "number" ? r.createdAt : r.createdAt.getTime();
  const base = { id: r.id, etape: r.etape, moment: r.moment, titre: r.titre, mime: r.mime, taille: r.taille, auteur: r.auteur, le, gerer };
  if (r.type === "fichier") return { ...base, type: "fichier", source: "fichier", url: adresseFichier(r.id), lecteur: { genre: "fichier" } };
  // Le lien a été normalisé à l'enregistrement : le relire redonne son lecteur.
  const l = lireLienVideo(r.url);
  return l.ok
    ? { ...base, type: "lien", source: l.source, url: l.url, lecteur: l.lecteur }
    : { ...base, type: "lien", source: "autre", url: r.url ?? "", lecteur: { genre: "externe" } };
}

/** « YouTube », « fichier », « Medal »… : d'où vient la vidéo, en clair. */
export const sourceDite = (v: Pick<VueVideo, "source">) => (v.source === "fichier" ? "fichier" : LIBELLE_SOURCE[v.source]);

/** « 0h1m35s » : le temps d'un lecteur Twitch. */
export function tempsTwitch(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 3600)}h${Math.floor((t % 3600) / 60)}m${t % 60}s`;
}

/**
 * LE LECTEUR D'UNE VIDÉO, au bon moment (§10.1, §10.4) :
 * - YouTube : `youtube-nocookie.com/embed/ID?start=95` ;
 * - Twitch : `player.twitch.tv/?video=vID&parent={hôte}&time=0h1m35s` — `parent` est OBLIGATOIRE,
 *   et c'est l'hôte de la page qui intègre (`window.location.hostname`, lu chez le client) :
 *   celui de NEXTAUTH_URL casserait le lecteur en local et sur toute autre adresse ;
 * - un clip Twitch : pas de moment, un clip est court ;
 * - un fichier : `…/fichier#t=95` (la page pose aussi `currentTime`, pour les navigateurs qui
 *   ignorent `#t=`) ;
 * - Medal, Discord, autre : un lien externe, le moment affiché à côté.
 */
export function lecteurDe(v: Pick<VueVideo, "lecteur" | "url" | "moment">, hote: string):
  { genre: "iframe"; src: string } | { genre: "video"; src: string } | { genre: "externe"; url: string } {
  const t = v.moment && v.moment > 0 ? Math.round(v.moment) : 0;
  const parent = encodeURIComponent(hote || "localhost");
  switch (v.lecteur.genre) {
    case "youtube": return { genre: "iframe", src: `https://www.youtube-nocookie.com/embed/${v.lecteur.id}?rel=0&autoplay=1${t ? `&start=${t}` : ""}` };
    case "twitch": return { genre: "iframe", src: `https://player.twitch.tv/?video=v${v.lecteur.video}&parent=${parent}&autoplay=false${t ? `&time=${tempsTwitch(t)}` : ""}` };
    case "clip": return { genre: "iframe", src: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(v.lecteur.slug)}&parent=${parent}&autoplay=false` };
    case "fichier": return { genre: "video", src: t ? `${v.url}#t=${t}` : v.url };
    default: return { genre: "externe", url: v.url };
  }
}

/** Les vidéos rangées dans l'ordre du déroulé, puis par date ; celles de toute la séance d'abord. */
export function trierVideos<T extends { etape: string | null; le: number }>(videos: T[], etapes: Pick<Etape, "code">[]): T[] {
  const rang = new Map(etapes.map((e, i) => [e.code, i]));
  const r = (v: T) => (v.etape === null ? -1 : rang.get(v.etape) ?? etapes.length);
  return [...videos].sort((a, b) => r(a) - r(b) || a.le - b.le);
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE NETTOYAGE (§10.5) — la tâche du bot, chaque jour à 4 h 30
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type LignePurge = { id: string; type: string; statut: string; fichier: string | null; createdAt: number; debutSeance: number };
export type FichierDisque = { nom: string; taille: number; modifie: number };
export type PlanPurge = {
  /** Les lignes à effacer : les fichiers trop anciens, les envois abandonnés. */
  anciennes: string[]; abandonnees: string[];
  /** Les fichiers du volume à effacer, et ce qu'ils pèsent. */
  fichiers: string[]; octets: number;
  /** Combien de vidéos (pas les `.part`) partent, et combien d'entre elles n'avaient pas de ligne. */
  videos: number; orphelins: number;
};

/**
 * CE QUE LA PURGE EFFACE, sans rien toucher (la tâche du bot l'applique) :
 * 1. les FICHIERS des séances plus anciennes que `conservationJours`, avec leur ligne — les liens,
 *    qui ne coûtent rien, restent ;
 * 2. les lignes restées en envoi depuis plus de 2 h (envoi abandonné), avec leur `.part` ;
 * 3. les `.part` de plus de 2 h, et les fichiers SANS LIGNE de plus d'un jour (un arrêt entre
 *    l'écriture et la base).
 * Un nom qui n'est pas celui d'une vidéo n'est jamais touché.
 */
export function planPurge(o: { lignes: LignePurge[]; fichiers: FichierDisque[]; now: number; conservationJours: number }): PlanPurge {
  const limite = o.now - o.conservationJours * 86_400_000;
  const anciennes = o.lignes.filter((l) => l.type === "fichier" && l.statut === "pret" && l.debutSeance < limite).map((l) => l.id);
  const abandonnees = o.lignes.filter((l) => l.statut === "envoi" && l.createdAt < o.now - ENVOI_ABANDONNE_MS).map((l) => l.id);
  const partent = new Set([...anciennes, ...abandonnees]);
  const connues = new Set(o.lignes.map((l) => l.id));
  const fichiers: string[] = [];
  let octets = 0, videos = 0, orphelins = 0;
  for (const f of o.fichiers) {
    const m = RE_FICHIER_VIDEO.exec(f.nom);
    if (!m) continue;
    const [, id, ext] = m;
    const part = ext === "part";
    let efface = partent.has(id);
    if (!efface && part) efface = f.modifie < o.now - ENVOI_ABANDONNE_MS;
    if (!efface && !part && !connues.has(id)) {
      efface = f.modifie < o.now - ORPHELIN_MS;
      if (efface) orphelins++;
    }
    if (!efface) continue;
    fichiers.push(f.nom);
    octets += f.taille;
    if (!part) videos++;
  }
  return { anciennes, abandonnees, fichiers, octets, videos, orphelins };
}

/** Le bilan de la purge, pour le journal du bot : « Vidéos : 3 fichiers effacés (412 Mo),
 *  1 envoi abandonné ». */
export function bilanPurge(p: Pick<PlanPurge, "videos" | "octets" | "abandonnees" | "orphelins">): string {
  const morceaux: string[] = [];
  if (p.videos) morceaux.push(`${p.videos} fichier${p.videos > 1 ? "s" : ""} effacé${p.videos > 1 ? "s" : ""} (${tailleDite(p.octets)})${p.orphelins ? `, dont ${p.orphelins} sans ligne` : ""}`);
  if (p.abandonnees.length) morceaux.push(`${p.abandonnees.length} envoi${p.abandonnees.length > 1 ? "s" : ""} abandonné${p.abandonnees.length > 1 ? "s" : ""}`);
  return `Vidéos : ${morceaux.length ? morceaux.join(", ") : "rien à nettoyer"}`;
}
