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

/** Un poste marqué « (option) » n'est pas compté comme manquant. */
const estOptionnel = (s: Slot) => /option/i.test(s.label);

/** Effectif attendu par classe, déduit des postes non optionnels. */
export function effectifRequis(slots: Slot[] = CS_SLOTS): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of slots) if (!estOptionnel(s)) out[s.classe] = (out[s.classe] ?? 0) + 1;
  return out;
}

export function presencesDu(state: CompoState, creneau: Creneau): Presence[] {
  return state.presences.filter((p) => p.creneau === creneau);
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
export function ecartsClasse(liste: Presence[], slots: Slot[] = CS_SLOTS): { classe: string; manque: number; enPlus: number }[] {
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

/**
 * Phrase prête pour un rappel Discord, ou null si l'effectif est au complet
 * (dans ce cas le rappel ne doit rien annoncer plutôt qu'une liste vide).
 */
export function resumeManques(state: CompoState, creneau: Creneau, slots: Slot[] = CS_SLOTS): string | null {
  const m = classesManquantes(state, creneau, slots);
  if (!m.length) return null;
  const bouts = m.map((x) => (x.manque > 1 ? `${x.manque} ${x.classe}s` : `1 ${x.classe}`));
  const dernier = bouts.pop()!;
  return bouts.length ? `${bouts.join(", ")} et ${dernier}` : dernier;
}
