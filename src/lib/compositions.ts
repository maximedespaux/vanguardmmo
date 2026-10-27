/**
 * Forme des données des Chambres Secrètes — module PARTAGÉ entre le site et le
 * bot Discord (le bot tourne sous tsx et résout `@/*` via le tsconfig racine).
 *
 * Pourquoi ce fichier existe : l'état vit dans un unique blob JSON
 * (`CompositionState.data`) dont rien ne garantissait la forme. C'est
 * exactement pour ça que le compte des présences n'avait pas pu être mis dans
 * les rappels Discord : impossible de s'appuyer sur des données qu'on ne peut
 * pas décrire. Tout passe désormais par normaliserCompo().
 *
 * Ce module doit rester SANS dépendance (ni React, ni next/*, ni Prisma) :
 * le bot l'importe, et il ne doit pas tirer Next avec lui.
 */

import { CS_SLOTS, type Slot } from "@/app/(guild)/compositions/slots";

/** Les deux créneaux hebdomadaires, décidés avec Maxime : mercredi et dimanche 21h. */
export type Creneau = "mer" | "dim";

/** `jour` suit getDay() : 0 = dimanche, 3 = mercredi. */
export const CRENEAUX: { id: Creneau; label: string; court: string; jour: number }[] = [
  { id: "mer", label: "Mercredi 21h", court: "Mer.", jour: 3 },
  { id: "dim", label: "Dimanche 21h", court: "Dim.", jour: 0 },
];

const IDS_CRENEAUX = new Set<string>(CRENEAUX.map((c) => c.id));

/** Inscription d'un personnage sur un poste. */
export type Signup = {
  id: string;
  player: string;
  pseudo: string;
  classe: string;
  slotId: string | null;
  charId?: string;
  selected?: boolean;
  /** Le compte qui l'a posée, écrit PAR LE SERVEUR (PUT /api/compositions) — jamais lu du
   *  client, jamais renvoyé aux membres. Facultatif : les inscriptions d'avant le 2026-10-21
   *  se résolvent par le nom du personnage (spec §5.3). */
  userId?: string;
  /** Le moment où elle a été posée (ms) — page (`registerToSlot`) et bot (menu « quel poste »).
   *  C'est lui qui permet au PUT de reconnaître une inscription posée APRÈS la lecture d'un
   *  client (`fusionnerLu`) : sans lui, un poste choisi sur Discord était effacé par le
   *  prochain clic d'un autre membre sur le site (spec §5.3, contre-examen n° 7). Les
   *  inscriptions d'avant le 2026-10-21 valent 0. */
  ts?: number;
};

/** « Je serai là » : un personnage annoncé présent sur un créneau. */
export type Presence = {
  player: string;
  pseudo: string;
  classe: string;
  creneau: Creneau;
  ts: number;
  /** Retenu par le staff pour jouer ce soir-là. La composition n'est pas un
   *  plafond : tout le monde s'annonce, même si sa classe est déjà servie, et
   *  c'est ce tri qui dit ensuite qui entre. */
  retenu?: boolean;
  /** Le compte qui l'a posée — même règle que `Signup.userId` (spec §5.3) : un nom Discord
   *  vieillit (piège n° 2), un identifiant de compte non. */
  userId?: string;
};

export type CompoState = {
  signups: Signup[];
  slotMeta: Record<string, { label?: string; note?: string }>;
  presences: Presence[];
  /** Consignes rédigées par le staff, affichées à tous. Texte simple. */
  instructions: string;
};

export const COMPO_VIDE: CompoState = { signups: [], slotMeta: {}, presences: [], instructions: "" };

const texte = (v: unknown, max = 80): string => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Ramène n'importe quelle valeur à un CompoState valide. Jamais d'exception :
 * un blob abîmé doit dégrader l'affichage, pas casser la page ni le bot.
 */
export function normaliserCompo(raw: unknown): CompoState {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const signups: Signup[] = (Array.isArray(o.signups) ? o.signups : [])
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      id: texte(s.id, 40) || Math.random().toString(36).slice(2),
      player: texte(s.player),
      pseudo: texte(s.pseudo),
      classe: texte(s.classe, 30),
      slotId: typeof s.slotId === "string" ? s.slotId.slice(0, 20) : null,
      charId: typeof s.charId === "string" ? s.charId.slice(0, 40) : undefined,
      selected: s.selected === true,
      userId: typeof s.userId === "string" ? s.userId.slice(0, 40) : undefined,
      ts: typeof s.ts === "number" && Number.isFinite(s.ts) ? s.ts : 0,
    }))
    .filter((s) => s.player && s.pseudo)
    .slice(0, 400);

  const slotMeta: CompoState["slotMeta"] = {};
  if (o.slotMeta && typeof o.slotMeta === "object") {
    for (const [k, v] of Object.entries(o.slotMeta as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const m = v as Record<string, unknown>;
      slotMeta[k.slice(0, 20)] = { label: texte(m.label, 60), note: texte(m.note, 200) };
    }
  }

  // Un seul « je serai là » par personnage et par créneau : sans ce dédoublonnage
  // un double clic gonflerait le compte et le rappel annoncerait un effectif faux.
  const vus = new Set<string>();
  const presences: Presence[] = (Array.isArray(o.presences) ? o.presences : [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({
      player: texte(p.player),
      pseudo: texte(p.pseudo),
      classe: texte(p.classe, 30),
      creneau: (IDS_CRENEAUX.has(String(p.creneau)) ? String(p.creneau) : "mer") as Creneau,
      ts: typeof p.ts === "number" && isFinite(p.ts) ? p.ts : 0,
      retenu: p.retenu === true,
      userId: typeof p.userId === "string" ? p.userId.slice(0, 40) : undefined,
    }))
    .filter((p) => {
      if (!p.player || !p.pseudo) return false;
      const cle = `${p.creneau}|${p.pseudo.toLowerCase()}`;
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .slice(0, 400);

  return { signups, slotMeta, presences, instructions: texte(o.instructions, 4000) };
}

/** Les classes réellement utilisées par la composition CS. */
export const CLASSES_CS: string[] = [...new Set(CS_SLOTS.map((s) => s.classe))];

const sansAccent = (v: string) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Valeur de l'enum Prisma (ARBALETRIER) → libellé de la composition (Arbaletrier).
 * La classe s'écrit de trois façons dans le projet (clé, libellé accentué, enum) :
 * on aligne tout sur celle des postes, sinon le compte des présences par classe
 * ne retomberait jamais sur l'effectif requis.
 */
export function classeAffichee(v: string): string {
  const t = sansAccent(v);
  return CLASSES_CS.find((c) => sansAccent(c) === t) ?? String(v || "");
}

/** Un poste marqué « (option) » n'est pas compté comme manquant — ou, depuis le paramétrage
 *  des bras droits (lib/evenements.ts, `postesEffectifs`), celui qu'on y dit optionnel. */
const estOptionnel = (s: Slot & { optionnel?: boolean }) => (typeof s.optionnel === "boolean" ? s.optionnel : /option/i.test(s.label));

/** Effectif attendu par classe, déduit des postes non optionnels. */
export function effectifRequis(slots: Slot[] = CS_SLOTS): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of slots) if (!estOptionnel(s)) out[s.classe] = (out[s.classe] ?? 0) + 1;
  return out;
}

export function presencesDu(state: CompoState, creneau: Creneau): Presence[] {
  return state.presences.filter((p) => p.creneau === creneau);
}

/* ── La séance qu'on prépare ─────────────────────────────────────────────────
   Les deux créneaux s'affichaient côte à côte, en permanence : on organisait
   dimanche en même temps que mercredi, et une annonce de la semaine passée
   comptait encore. On ne prépare qu'une séance à la fois — la prochaine — et
   les fenêtres, décidées avec Maxime, s'enchaînent sans trou :
     · de dimanche 21h00 à mercredi 21h30 → on prépare le MERCREDI ;
     · de mercredi 21h30 à dimanche 21h00 → on prépare le DIMANCHE.
   La demi-heure qui suit 21h le mercredi appartient encore à la séance en
   cours : on ne bascule pas sur la suivante pendant qu'elle se joue. */
export type Seance = {
  creneau: Creneau;
  /** Le début de la séance visée. */
  debut: Date;
  /** Le moment où sa préparation a commencé — ce qui date les annonces valides. */
  ouverture: Date;
  label: string;
};

const minutesSemaine = (d: Date) => d.getDay() * 1440 + d.getHours() * 60 + d.getMinutes();
const DIM_21H = 0 * 1440 + 21 * 60;
const MER_FIN = 3 * 1440 + 21 * 60 + 30;

/** La prochaine occurrence de ce jour à cette heure, à partir de `ref`. */
function versLAvant(ref: Date, jour: number, h: number, m: number): Date {
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  while (d.getDay() !== jour || d.getTime() < ref.getTime()) d.setDate(d.getDate() + 1);
  return d;
}
/** La dernière occurrence de ce jour à cette heure, avant `ref`. */
function versLArriere(ref: Date, jour: number, h: number, m: number): Date {
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  while (d.getDay() !== jour || d.getTime() > ref.getTime()) d.setDate(d.getDate() - 1);
  return d;
}

export function prochaineSeance(maintenant: Date = new Date()): Seance {
  const t = minutesSemaine(maintenant);
  if (t >= DIM_21H && t < MER_FIN) {
    // −30 min : pendant la séance du mercredi, c'est encore elle la prochaine.
    const debut = versLAvant(new Date(maintenant.getTime() - 30 * 60_000), 3, 21, 0);
    return { creneau: "mer", debut, ouverture: versLArriere(debut, 0, 21, 0), label: "Mercredi 21h" };
  }
  const debut = versLAvant(maintenant, 0, 21, 0);
  return { creneau: "dim", debut, ouverture: versLArriere(debut, 3, 21, 30), label: "Dimanche 21h" };
}

/**
 * Les annonces qui valent pour CETTE séance : celles faites depuis l'ouverture
 * de sa préparation. Sans cette borne, un « je serai là » d'il y a trois
 * semaines gonflait encore l'effectif et le rappel Discord annonçait du monde
 * qui n'avait rien promis pour ce soir-là.
 */
export function presencesSeance(state: CompoState, seance: Seance): Presence[] {
  return state.presences.filter((p) => p.creneau === seance.creneau && p.ts >= seance.ouverture.getTime());
}

/** Ceux que le staff a retenus pour jouer — la composition arrêtée du soir. */
export function retenusDu(state: CompoState, creneau: Creneau): Presence[] {
  return presencesDu(state, creneau).filter((p) => p.retenu);
}

/** Le nombre de places de la composition visée (postes non optionnels). */
export function nbPlaces(slots: Slot[] = CS_SLOTS): number {
  return Object.values(effectifRequis(slots)).reduce((a, b) => a + b, 0);
}

/**
 * L'écart à la composition visée, classe par classe : ce qui manque, et ce qui
 * est en plus.
 *
 * La composition est une CIBLE, pas un plafond. Personne n'est empêché de
 * s'annoncer parce que sa classe est déjà servie — mais on ne voyait alors que
 * le manque, et un cinquième Primat disparaissait du décompte comme s'il
 * n'existait pas. Les deux se lisent maintenant : le manque dit ce qu'il faut
 * recruter, le surplus dit qu'il y aura des suppléants à départager.
 */
export function ecartsClasse(liste: Pick<Presence, "classe">[], slots: Slot[] = CS_SLOTS): { classe: string; manque: number; enPlus: number }[] {
  const requis = effectifRequis(slots);
  const present: Record<string, number> = {};
  for (const p of liste) present[p.classe] = (present[p.classe] ?? 0) + 1;
  return [...new Set([...Object.keys(requis), ...Object.keys(present)])]
    .map((classe) => {
      const ecart = (present[classe] ?? 0) - (requis[classe] ?? 0);
      return { classe, manque: ecart < 0 ? -ecart : 0, enPlus: ecart > 0 ? ecart : 0 };
    })
    .filter((x) => x.manque > 0 || x.enPlus > 0)
    .sort((a, b) => b.manque - a.manque || b.enPlus - a.enPlus);
}

/** Ce qui manque sur un créneau, classe par classe. Vide = effectif au complet. */
export function classesManquantes(
  state: CompoState,
  creneau: Creneau,
  slots: Slot[] = CS_SLOTS,
): { classe: string; manque: number }[] {
  return ecartsClasse(presencesDu(state, creneau), slots)
    .filter((x) => x.manque > 0)
    .map(({ classe, manque }) => ({ classe, manque }));
}

/** Les classes telles qu'on les écrit dans une phrase (« 1 Envoûteur », pas « 1 Envouteur »). */
const NOM_CLASSE_PHRASE: Record<string, string> = { Envouteur: "Envoûteur", Arbaletrier: "Arbalétrier" };

/**
 * Ce qui manque à une LISTE d'annonces, en une phrase (« 1 Envoûteur et 2 Arcanistes »), ou
 * null au complet — un rappel au complet ne doit rien annoncer plutôt qu'une liste vide.
 *
 * Elle prend la liste en entrée (spec §8.5) : le rappel de l'ancien planificateur comptait
 * TOUTES les annonces du créneau depuis toujours (`presencesDu`, piège n° 3). Le bot lui donne
 * maintenant les annonces de la séance, bornées à sa fenêtre de préparation.
 */
export function phraseManques(liste: Pick<Presence, "classe">[], slots: Slot[] = CS_SLOTS): string | null {
  const m = ecartsClasse(liste, slots).filter((x) => x.manque > 0);
  if (!m.length) return null;
  const bouts = m.map((x) => {
    const nom = NOM_CLASSE_PHRASE[x.classe] ?? x.classe;
    return x.manque > 1 ? `${x.manque} ${nom}s` : `1 ${nom}`;
  });
  const dernier = bouts.pop()!;
  return bouts.length ? `${bouts.join(", ")} et ${dernier}` : dernier;
}

/**
 * Phrase prête pour un rappel Discord, ou null si l'effectif est au complet. Toutes les
 * annonces du créneau, sans fenêtre de dates : gardée pour ce qui l'appelle encore, le bot
 * passe par `phraseManques` sur les annonces de la séance.
 */
export function resumeManques(state: CompoState, creneau: Creneau, slots: Slot[] = CS_SLOTS): string | null {
  return phraseManques(presencesDu(state, creneau), slots);
}

/**
 * LE CORRECTIF `lu` DU PUT (spec §5.4, lot 3). La page renvoie l'état qu'elle a lu, jusqu'à
 * 15 s plus tôt : une annonce posée entre-temps — par le bot depuis Discord, ou par un autre
 * membre — disparaissait sans bruit au prochain clic. `lu` est l'instant de la lecture du
 * client (`updatedAt` de la ligne, rendu par le GET). Si la ligne a bougé depuis, on RÉ-AJOUTE
 * ce que le client ne pouvait pas connaître : les annonces et les inscriptions de l'état
 * précédent, absentes de son envoi, posées APRÈS sa lecture (`ts > lu`).
 *
 * Une annonce revient si son perso n'est pas déjà annoncé sur ce créneau ; une inscription, si
 * le même pseudo n'est pas déjà sur un poste dans l'envoi (le client l'a déplacé entre-temps).
 * Ce que l'APPELANT a posé lui-même ne revient jamais : il le connaît, et s'il l'a retiré c'est
 * voulu — sinon « je m'annonce » puis « finalement non » dans les 15 s ne se défaisait pas.
 * Un RETRAIT fait par un autre pendant ces 15 s peut, lui, réapparaître : c'est le moindre mal,
 * et ce cas existait déjà entre deux membres.
 *
 * Sans `lu` (un client d'avant le correctif), rien ne change : on ne devine pas.
 */
export function fusionnerLu(
  data: CompoState, precedent: CompoState, lu: number | null, majAvant: number | null, appelant?: { id: string; username: string },
): CompoState {
  if (lu === null || !Number.isFinite(lu) || majAvant === null || majAvant <= lu) return data;
  const sienne = (x: { userId?: string; player: string }) =>
    !!appelant && (x.userId ? x.userId === appelant.id : x.player.toLowerCase() === appelant.username.toLowerCase());
  const annonces = new Set(data.presences.map((p) => `${p.creneau}|${p.pseudo.toLowerCase()}`));
  const revenues = precedent.presences.filter((p) => p.ts > lu && !sienne(p) && !annonces.has(`${p.creneau}|${p.pseudo.toLowerCase()}`));
  const ids = new Set(data.signups.map((x) => x.id));
  const surUnPoste = new Set(data.signups.filter((x) => x.slotId).map((x) => x.pseudo.toLowerCase()));
  const inscriptions = precedent.signups.filter((x) => (x.ts ?? 0) > lu && !sienne(x) && !ids.has(x.id) && !(x.slotId && surUnPoste.has(x.pseudo.toLowerCase())));
  if (!revenues.length && !inscriptions.length) return data;
  return { ...data, presences: [...data.presences, ...revenues], signups: [...data.signups, ...inscriptions] };
}
