/**
 * LES ÉVÉNEMENTS DE GUILDE — séances, heures de Paris et paramétrage (SPEC-CHAMBRES-RECENSEMENT
 * §2.5, §3, §9 ; lot 2).
 *
 * Module PUR, comme lib/compositions.ts et lib/recensement.ts : ni React, ni next/*, ni Prisma,
 * ni server-only. Le site (routes, pages) et le bot (tsx résout `@/*`) le lisent tous les deux :
 * une séance a la même clé, la même date et les mêmes étapes partout.
 *
 * TOUT CE QUI SERT DE VALEUR PAR DÉFAUT EST ICI, dans le code. Le paramétrage des bras droits
 * (`ParametresEvenement`, écran /discord/evenements) ne fait que le SURCHARGER, clé de premier
 * niveau par clé de premier niveau — et « Rétablir le défaut » retire la clé (`aEnregistrer`).
 * Une phrase par défaut corrigée ici s'applique donc partout où personne ne l'a réécrite.
 */
import { CS_DEFAUT, CS_SLOTS, type RolesCS, type Slot } from "@/app/(guild)/compositions/slots";
import { classeAffichee, type CompoState, type Presence, type Seance, type Signup } from "@/lib/compositions";
import { GUILD_ROLES } from "@/config/roles";
import { rolesDeClasse, type RoleMesure } from "@/lib/mesures";
import TABLE from "@/data/chambres-adversaires.json";

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES HEURES DE PARIS (piège n° 4 de la spec)
   Le serveur et le bot tournent en UTC : ni le Dockerfile ni docker-compose ne posent `TZ`, et
   `prochaineSeance()` de lib/compositions calcule à l'heure LOCALE — juste dans le navigateur
   d'un membre, fausse de deux heures sur le serveur en été. Tout calcul de séance côté serveur
   ou bot passe donc par ces fonctions, qui lisent le calendrier de Paris quel que soit l'hôte.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type JourFr = "dim" | "lun" | "mar" | "mer" | "jeu" | "ven" | "sam";
/** L'ordre de `getDay()` : 0 = dimanche. */
export const JOURS: JourFr[] = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
export const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/* Un seul formateur, créé une fois : `Intl.DateTimeFormat` coûte cher à construire, et le bot
   l'appelle à chaque minute. `hourCycle: h23` : sans lui, certains moteurs écrivent « 24 » à
   minuit. */
const FMT_PARIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

const deux = (n: number) => String(n).padStart(2, "0");

/** Le jour de la semaine d'une date du calendrier (« 2026-10-21 » → 3) — indépendant du fuseau. */
export function jourDeDate(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** « 2026-10-21 » + 4 → « 2026-10-25 », sans passer par une heure locale. */
export function ajouterJours(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Une vraie date du calendrier (le 31 février n'en est pas une). */
export function dateValide(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return ajouterJours(date, 0) === date;
}

/** Ce qu'une horloge accrochée à Paris dit de cet instant. */
export function partiesParis(d: Date): { date: string; jour: number; hhmm: string; minutes: number } {
  const p: Record<string, string> = {};
  for (const x of FMT_PARIS.formatToParts(d)) p[x.type] = x.value;
  const date = `${p.year}-${p.month}-${p.day}`;
  const h = Number(p.hour) % 24, m = Number(p.minute);
  return { date, jour: jourDeDate(date), hhmm: `${deux(h)}:${deux(m)}`, minutes: h * 60 + m };
}

/** « HH:MM » valide (00:00 à 23:59) → minutes depuis minuit ; sinon null. */
export function minutesDe(hhmm: unknown): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm ?? ""));
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

/**
 * L'instant où Paris lit `date` à `hhmm`. On part de la même heure en UTC, puis on corrige de
 * l'écart que Paris affiche : deux tours suffisent, y compris les nuits de changement d'heure.
 */
export function instantParis(date: string, hhmm: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const min = minutesDe(hhmm) ?? 0;
  const voulu = Date.UTC(y, mo - 1, d, Math.floor(min / 60), min % 60);
  let t = voulu;
  for (let i = 0; i < 2; i++) {
    const p = partiesParis(new Date(t));
    const [py, pm, pd] = p.date.split("-").map(Number);
    t += voulu - Date.UTC(py, pm - 1, pd, Math.floor(p.minutes / 60), p.minutes % 60);
  }
  return new Date(t);
}

/** « mercredi 21 octobre » — lu sur la date du calendrier, pas sur une heure. */
export function dateLongue(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}
/** « 21 h », « 20 h 40 ». */
export const heureDite = (hhmm: string) => {
  const m = minutesDe(hhmm) ?? 0;
  return m % 60 ? `${Math.floor(m / 60)} h ${deux(m % 60)}` : `${Math.floor(m / 60)} h`;
};

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES SÉANCES (§2.5) — une séance = un événement + une date de Paris + un créneau.
   Les Chambres sont fixes (mercredi et dimanche, 21 h) : une séance n'a rien à « ouvrir », elle
   est implicite, et la ligne `SeanceGuilde` naît au premier geste (clôture, annulation…).
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type Evenement = "cs" | "gs";

export type SeanceParis = {
  evenement: Evenement;
  /** « cs_2026-10-21_mer », « gs_2026-10-24_sam2100 ». */
  cle: string;
  /** Le jour de Paris. */
  date: string;
  /** « mer » | « dim » pour une Chambre ; l'id du créneau (« sam2100 ») pour un Guild Siege. */
  creneau: string;
  debut: Date;
  /** Le début de sa préparation : ce qui date les annonces valides (presencesSeance). */
  ouverture: Date;
  /** « mercredi 21 octobre · 21 h ». */
  label: string;
};

const HEURE_CS = "21:00";
const SIX_HEURES = 6 * 3_600_000;

/** Une Chambre : mercredi ou dimanche, 21 h à Paris. Les fenêtres de préparation sont celles de
 *  `prochaineSeance` (compositions.ts) : du dimanche 21 h au mercredi, puis du mercredi 21 h 30
 *  au dimanche. */
export function seanceCS(date: string, creneau: "mer" | "dim"): SeanceParis {
  const ouverture = creneau === "mer" ? instantParis(ajouterJours(date, -3), "21:00") : instantParis(ajouterJours(date, -4), "21:30");
  return {
    evenement: "cs", cle: `cs_${date}_${creneau}`, date, creneau,
    debut: instantParis(date, HEURE_CS), ouverture, label: `${dateLongue(date)} · ${heureDite(HEURE_CS)}`,
  };
}

/**
 * La séance que l'on PRÉPARE — `prochaineSeance` de lib/compositions, sur l'heure de Paris. La
 * demi-heure qui suit 21 h le mercredi appartient encore au mercredi.
 */
export function prochaineSeanceParis(now: Date = new Date()): SeanceParis {
  const p = partiesParis(now);
  const t = p.jour * 1440 + p.minutes;
  const DIM_21H = 21 * 60, MER_FIN = 3 * 1440 + 21 * 60 + 30;
  if (t >= DIM_21H && t < MER_FIN) return seanceCS(ajouterJours(p.date, (3 - p.jour + 7) % 7), "mer");
  return seanceCS(ajouterJours(p.date, (7 - p.jour) % 7), "dim");
}

/** La DERNIÈRE séance commencée (début ≤ maintenant), quel que soit l'écart. C'est elle que
 *  visent la clôture, « Ils étaient là » et les bilans : le jeudi à 9 h, c'est encore le
 *  mercredi qu'on clôture, pas le dimanche qui n'est pas joué (contre-examen n° 3). */
export function derniereSeanceParis(now: Date = new Date()): SeanceParis {
  const p = partiesParis(now);
  for (let k = 0; k <= 7; k++) {
    const jour = (p.jour - k + 7) % 7;
    if (jour !== 3 && jour !== 0) continue;
    const s = seanceCS(ajouterJours(p.date, -k), jour === 3 ? "mer" : "dim");
    if (s.debut.getTime() <= now.getTime()) return s;
  }
  return seanceCS(ajouterJours(p.date, -7), "dim"); // inatteignable : une semaine a toujours un mercredi
}

/** La séance commencée depuis moins de 6 h, sinon la prochaine : celle que visent la
 *  répartition, le chrono et la synchro des messages (le mercredi à 21 h 30, la prochaine
 *  bascule sur le dimanche alors que le chrono du mercredi tourne encore). */
export function seanceCouranteParis(now: Date = new Date()): SeanceParis {
  const d = derniereSeanceParis(now);
  return now.getTime() - d.debut.getTime() < SIX_HEURES ? d : prochaineSeanceParis(now);
}

/** Les `n` dernières séances commencées, de la plus récente à la plus ancienne : le sélecteur
 *  de la clôture (le staff peut viser une autre séance que la dernière). */
export function seancesRecentesParis(now: Date = new Date(), n = 6): SeanceParis[] {
  const out: SeanceParis[] = [];
  let s = derniereSeanceParis(now);
  while (out.length < n) {
    out.push(s);
    s = derniereSeanceParis(new Date(s.debut.getTime() - 60_000));
  }
  return out;
}

/** La clé de la séance qu'une page a calculée À L'HEURE DU NAVIGATEUR (`prochaineSeance`) : sa
 *  date est relue à Paris, pour tomber sur la même ligne que le serveur. */
export function cleDeSeance(s: { creneau: string; debut: Date }): string {
  return `cs_${partiesParis(s.debut).date}_${s.creneau}`;
}

/** Une SeanceParis lue comme une `Seance` de lib/compositions (presencesSeance n'en lit que le
 *  créneau et l'ouverture). */
export const commeSeance = (s: SeanceParis): Seance =>
  ({ creneau: s.creneau as Seance["creneau"], debut: s.debut, ouverture: s.ouverture, label: s.label });

/* ── Le Guild Siege : des créneaux RÉGLABLES (§11), aucun par défaut ── */

export type CreneauGS = { id: string; jour: JourFr; heure: string; finInscription: string | null };

export function seanceGS(date: string, c: CreneauGS, precedente?: Date): SeanceParis {
  const debut = instantParis(date, c.heure);
  return {
    evenement: "gs", cle: `gs_${date}_${c.id}`, date, creneau: c.id, debut,
    ouverture: precedente ?? new Date(debut.getTime() - 7 * 86_400_000),
    label: `${dateLongue(date)} · ${heureDite(c.heure)}`,
  };
}

/** Toutes les séances GS des `jours` jours autour de `now`, triées par début. */
function seancesGSAutour(now: Date, creneaux: CreneauGS[], avant = 8, apres = 8): SeanceParis[] {
  const p = partiesParis(now);
  const out: SeanceParis[] = [];
  for (let k = -avant; k <= apres; k++) {
    const date = ajouterJours(p.date, k);
    const jour = JOURS[jourDeDate(date)];
    for (const c of creneaux) if (c.jour === jour) out.push(seanceGS(date, c));
  }
  out.sort((a, b) => a.debut.getTime() - b.debut.getTime());
  for (let i = 1; i < out.length; i++) out[i].ouverture = out[i - 1].debut;
  return out;
}
export function derniereSeanceGS(now: Date, creneaux: CreneauGS[]): SeanceParis | null {
  return seancesGSAutour(now, creneaux).filter((s) => s.debut.getTime() <= now.getTime()).at(-1) ?? null;
}
export function prochaineSeanceGS(now: Date, creneaux: CreneauGS[]): SeanceParis | null {
  return seancesGSAutour(now, creneaux).find((s) => s.debut.getTime() > now.getTime()) ?? null;
}
export function seanceCouranteGS(now: Date, creneaux: CreneauGS[]): SeanceParis | null {
  const d = derniereSeanceGS(now, creneaux);
  return d && now.getTime() - d.debut.getTime() < SIX_HEURES ? d : prochaineSeanceGS(now, creneaux);
}

/* ── La clé d'une séance, dans une adresse (§6) ── */

export const RE_CLE = /^(cs_\d{4}-\d{2}-\d{2}_(mer|dim)|gs_\d{4}-\d{2}-\d{2}_[a-z]{3}\d{4})$/;
/** `gs_prochaine` (lot 9) : la séance du siège qu'on PRÉPARE — l'onglet Guild Siege l'ouvre à
 *  l'inscription, même pendant qu'une autre se joue (le mercredi à 21 h 30, on s'annonce pour
 *  vendredi). */
export const ALIAS_CLE = ["cs_courante", "cs_derniere", "gs_courante", "gs_derniere", "gs_prochaine"] as const;

export type ResolutionCle = { ok: true; seance: SeanceParis } | { ok: false; status: number; error: string };

/**
 * `cs_2026-10-21_mer`, ou l'un des alias `cs_courante` / `cs_derniere` (et leurs pendants GS).
 * Le jour doit correspondre au créneau : « cs_2026-10-21_dim » n'existe pas.
 */
export function resoudreCle(cle: string, now: Date = new Date(), gs?: Pick<ParametresGS, "creneaux"> | null): ResolutionCle {
  const creneaux = gs?.creneaux ?? [];
  if (cle === "cs_courante") return { ok: true, seance: seanceCouranteParis(now) };
  if (cle === "cs_derniere") return { ok: true, seance: derniereSeanceParis(now) };
  if (cle === "gs_courante" || cle === "gs_derniere" || cle === "gs_prochaine") {
    const s = cle === "gs_courante" ? seanceCouranteGS(now, creneaux) : cle === "gs_prochaine" ? prochaineSeanceGS(now, creneaux) : derniereSeanceGS(now, creneaux);
    return s ? { ok: true, seance: s } : { ok: false, status: 404, error: "Le Guild Siege n'a aucun créneau réglé." };
  }
  if (!RE_CLE.test(cle)) return { ok: false, status: 400, error: "Séance inconnue : la clé s'écrit cs_AAAA-MM-JJ_mer (ou _dim)." };
  const [ev, date, creneau] = cle.split("_");
  if (!dateValide(date)) return { ok: false, status: 400, error: "Cette date n'existe pas." };
  const jour = jourDeDate(date);
  if (ev === "cs") {
    const attendu = creneau === "mer" ? 3 : 0;
    if (jour !== attendu) return { ok: false, status: 400, error: `Ce jour n'est pas un ${creneau === "mer" ? "mercredi" : "dimanche"}.` };
    return { ok: true, seance: seanceCS(date, creneau as "mer" | "dim") };
  }
  const prefixe = creneau.slice(0, 3) as JourFr, hhmm = `${creneau.slice(3, 5)}:${creneau.slice(5, 7)}`;
  if (JOURS[jour] !== prefixe) return { ok: false, status: 400, error: `Ce jour n'est pas un ${JOURS_LONGS[JOURS.indexOf(prefixe)] ?? prefixe}.` };
  if (minutesDe(hhmm) === null) return { ok: false, status: 400, error: "Heure de créneau illisible." };
  const c = creneaux.find((x) => x.id === creneau) ?? { id: creneau, jour: prefixe, heure: hhmm, finInscription: null };
  return { ok: true, seance: seanceGS(date, c) };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE DÉROULÉ : PHASES, ÉTAPES ET MONSTRES (§3, décisions 7 et 8 de Maxime)
   Les phases et les étapes par défaut sont EXACTEMENT celles du vrai débrief du 18/10/2026
   (assets/genesis/refonte/debrief-2026-10-18.json) — elles remplacent la liste du §3.2. Les
   émojis sont ceux du §3.2 (2.1 passe de ⚔️ à 💂 : ⚔️ veut dire « DPS physique »).
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Un adversaire d'une étape. `id` : l'identifiant du client (`MI_…`), qui mène à sa fiche
 *  /monstres/{id} ; null quand le relevé ne le connaît pas (les Malphas des Chambres). */
export type MonstreEtape = { id: string | null; nom: string };
export type Etape = { code: string; label: string; phase: string; emoji: string; monstres: MonstreEtape[] };

/** Les 37 adversaires relevés dans le client (src/data/chambres-adversaires.json). */
export const ADVERSAIRES_CS: { id: string; nom: string; vies: number }[] =
  (TABLE as { adversaires: { id: string; nom: string; vies?: number | null }[] }).adversaires.map((a) => ({ id: a.id, nom: a.nom, vies: a.vies ?? 1 }));
const adv = (id: string): MonstreEtape => ({ id, nom: ADVERSAIRES_CS.find((a) => a.id === id)?.nom ?? id });

export const PHASES_CS_DEFAUT: Record<string, string> = {
  "1": "Phase 1 — Chambres", "2": "Phase 2 — Couloir", "3": "Phase 3 — Araignée",
  "4": "Phase 4 — Escalier", "5": "Phase 5 — Boss final",
};

/**
 * Les monstres viennent du relevé du client, et seulement quand le §3.1 de la spec les rattache
 * à l'étape : 1.1 (« 480 mobs ») et 2.1 (« 100 soldats ») n'en ont aucun, faute de donnée qui
 * dise lesquels — les neuf autres « Mutant Secret » peuplent VRAISEMBLABLEMENT les salles, et
 * une vraisemblance ne s'affiche pas comme un fait. Les Malphas des Chambres n'ont pas
 * d'identifiant dans le relevé : leur nom seul, sans fiche (le « Malphas » du catalogue est
 * celui du monde ouvert). Le staff complète dans le paramétrage.
 */
export const ETAPES_CS_DEFAUT: Etape[] = [
  { code: "1.1", label: "480 monstres", phase: "1", emoji: "🧟", monstres: [] },
  { code: "1.2", label: "12 Asuras", phase: "1", emoji: "🌳", monstres: [adv("MI_ASURA04_2")] },
  { code: "1.3", label: "3 Malphas", phase: "1", emoji: "👹", monstres: [{ id: null, nom: "Malphas" }] },
  { code: "2.1", label: "100 soldats", phase: "2", emoji: "💂", monstres: [] },
  { code: "2.2", label: "Jumeaux", phase: "2", emoji: "👯", monstres: [adv("MI_CHAMBRE_BOSS_4"), adv("MI_CHAMBRE_BOSS_6")] },
  { code: "3.1", label: "100 araignées", phase: "3", emoji: "🕸️", monstres: [adv("MI_CHAMBRE_TRASH_4"), adv("MI_CHAMBRE_TRASH_8")] },
  { code: "3.2", label: "Troll 1 (Dra'Zhul gauche)", phase: "3", emoji: "🗿", monstres: [adv("MI_CHAMBRE_BOSS_5")] },
  { code: "3.3", label: "Troll 2 (Dra'Zhul droite)", phase: "3", emoji: "🗿", monstres: [adv("MI_CHAMBRE_BOSS_5")] },
  { code: "3.4", label: "Araignée (Nyzarra)", phase: "3", emoji: "🕷️", monstres: [adv("MI_CHAMBRE_BOSS_2")] },
  { code: "4.1", label: "100 araignées", phase: "4", emoji: "🕸️", monstres: [adv("MI_CHAMBRE_TRASH_4"), adv("MI_CHAMBRE_TRASH_8")] },
  { code: "4.2", label: "Mini-soldats (escalier)", phase: "4", emoji: "🪜",
    monstres: ["MI_CHAMBRE_TRASH_1", "MI_CHAMBRE_TRASH_2", "MI_CHAMBRE_TRASH_3", "MI_CHAMBRE_TRASH_5", "MI_CHAMBRE_TRASH_6", "MI_CHAMBRE_TRASH_7"].map(adv) },
  { code: "4.3", label: "Double boss Gor'Thar", phase: "4", emoji: "👺", monstres: [adv("MI_CHAMBRE_BOSS_3")] },
  { code: "5", label: "Boss final : Aatrox", phase: "5", emoji: "🐉", monstres: [adv("MI_CHAMBRE_BOSS_1")] },
];

/** Les places de la Phase 1 (§4.3) : celles du modèle, « Chambre » devenu « Salle ». */
export const SALLES_DEFAUT: { cle: string; label: string }[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ cle: `s${i + 1}`, label: `Salle ${i + 1}` })),
  { cle: "a11", label: "Asura 11 (arbre)" }, { cle: "a12", label: "Asura 12 (arbre)" },
];

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES POSTES (décisions 4, 5 et 10) — libellé, classe, rôle par phase, chiffre affiché.
   Les douze postes de slots.ts restent la source ; le paramétrage les surcharge. Leur NOMBRE
   ne change pas ici : un poste neuf n'aurait ni build de référence (/compositions/build/[id])
   ni inscriptions — « optionnel » règle ce qui compte dans les 10 places.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export const CLASSES_CLES = ["Primat", "Templier", "Sylphide", "Spadassin", "Arbaletrier", "Chanoine", "Arcaniste", "Envouteur"] as const;
export const NOMS_CLASSES: Record<string, string> = {
  Primat: "Primat", Templier: "Templier", Sylphide: "Sylphide", Spadassin: "Spadassin",
  Arbaletrier: "Arbalétrier", Chanoine: "Chanoine", Arcaniste: "Arcaniste", Envouteur: "Envoûteur",
};

/** Le type de DPS suit la CLASSE, jamais le groupe du poste (§2.3) : le Primat se mesure « à la
 *  Boulette », comme l'Envoûteur — il est rangé en magique. */
export const TYPE_DPS: Record<string, "mag" | "phy"> = {
  Arcaniste: "mag", Envouteur: "mag", Primat: "mag",
  Templier: "phy", Sylphide: "phy", Spadassin: "phy", Arbaletrier: "phy", Chanoine: "phy",
};

export type PosteParam = {
  /** L'id de slots.ts (p1…m4) — fixe. */
  id: string;
  /** Le titre du poste. Égal à celui du code : pas de surcharge, le titre renommé sur la page
   *  (`slotMeta`) s'applique. Différent : c'est lui qui s'affiche. */
  label: string;
  classe: string;
  /** Hors des 10 places : il ne manque jamais. */
  optionnel: boolean;
  cs: RolesCS;
};

const estOptionnelCode = (s: Slot) => /option/i.test(s.label);
export const POSTES_DEFAUT: PosteParam[] = CS_SLOTS.map((s) => ({
  id: s.id, label: s.label, classe: s.classe, optionnel: estOptionnelCode(s), cs: { ...(s.cs ?? CS_DEFAUT) },
}));

/** Un poste tel que les pages l'affichent : le Slot du code, surchargé. `labelFixe` : le titre
 *  vient du paramétrage, et le renommage de la page ne le recouvre pas. */
export type Poste = Slot & { optionnel: boolean; labelFixe: boolean; cs: RolesCS };

export function postesEffectifs(p: Pick<ParametresCS, "postes">): Poste[] {
  return CS_SLOTS.map((s) => {
    const q = p.postes.find((x) => x.id === s.id);
    const code = POSTES_DEFAUT.find((x) => x.id === s.id)!;
    if (!q) return { ...s, optionnel: code.optionnel, labelFixe: false, cs: code.cs };
    const labelFixe = !!q.label && q.label !== s.label;
    return { ...s, label: labelFixe ? q.label : s.label, classe: q.classe, optionnel: q.optionnel, labelFixe, cs: q.cs };
  });
}

/** Le titre affiché d'un poste : celui du paramétrage s'il en fixe un, sinon celui renommé sur
 *  la page, sinon celui du code. */
export function libellePoste(p: Poste, slotMeta?: Record<string, { label?: string }>): string {
  return p.labelFixe ? p.label : (slotMeta?.[p.id]?.label || p.label);
}

/** Les rôles d'un participant : ceux de son poste ; sans poste, ceux du premier poste de sa
 *  classe ; une classe sans poste, dps partout (§2.3). */
export function rolesDuParticipant(postes: Poste[], slotId: string | null, classe: string): RolesCS {
  const p = slotId ? postes.find((x) => x.id === slotId) : null;
  if (p) return p.cs;
  const k = sansAccent(classe);
  return postes.find((x) => sansAccent(x.classe) === k)?.cs ?? CS_DEFAUT;
}

/** Les « chiffres » qu'un poste peut montrer, prêts à choisir dans une liste : la règle des
 *  trois Primats (décision 4) — DPS ; Off tank en sceptre ; Tank en sceptre ET en poing. */
export const CHOIX_MESURE: { cle: string; label: string; mesure: RoleMesure[]; toutes?: true }[] = [
  { cle: "dps", label: "DPS (dégâts déclarés)", mesure: ["dps"] },
  { cle: "offtank", label: "Off tank — PV en sceptre (repli : poing)", mesure: ["offtank", "tank"] },
  { cle: "tank2", label: "Tank — PV en sceptre ET en poing", mesure: ["offtank", "tank"], toutes: true },
  { cle: "tank", label: "Tank — PV (poing, doloire)", mesure: ["tank"] },
  { cle: "offseul", label: "Off tank seul — PV en sceptre", mesure: ["offtank"] },
];
export const choixDeMesure = (cs: RolesCS) =>
  CHOIX_MESURE.find((c) => c.mesure.join() === cs.mesure.join() && !!c.toutes === !!cs.toutes)?.cle ?? null;

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES RAPPELS ET LES TEXTES (§8.3, §8.5, §9.2)
   Ils s'AFFICHENT et s'enregistrent dès le lot 2 ; le bot ne les lit qu'au lot 3. Jusque-là, il
   garde ses deux rappels de 20 h (scheduler.ts), sous l'interrupteur `cs_rappels_actifs`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type TypeRappel = "panneau" | "places" | "jour" | "recap" | "chrono" | "gs_staff";
export type RappelDef = {
  id: string;
  type: TypeRappel;
  actif: boolean;
  /** Rappels d'avant la bascule : partent même si `nouveauxMessages` est coupé. */
  existant?: true;
  quand: "veille" | "jour";
  /** « HH:MM », heure de Paris. */
  heure: string;
  /** Guild Siege : l'heure se compte DEPUIS le créneau ; présent, `heure` est recalculée. */
  avant?: { base: "debut" | "finInscription"; minutes: number };
  condition: "toujours" | "si_manque" | "si_participants";
  mention: "everyone" | "participants" | "everyone_participants" | "aucune";
  /** Supprime le message précédent du même type (M2 de 18 h 30 remplace celui de 13 h 30). */
  remplacePrecedent: boolean;
  /** Phrase d'ouverture, 400 signes au plus, avec des {variables}. */
  texte: string;
};

export const LIBELLE_TYPE_RAPPEL: Record<TypeRappel, string> = {
  panneau: "Panneau d'inscription", places: "Il manque du monde", jour: "Ça commence dans 1 h",
  recap: "Récap de la soirée", chrono: "Chrono", gs_staff: "Rappel au staff",
};
export const LIBELLE_CONDITION: Record<RappelDef["condition"], string> = {
  toujours: "toujours", si_manque: "s'il manque une classe", si_participants: "s'il y a des participants",
};
export const LIBELLE_MENTION: Record<RappelDef["mention"], string> = {
  everyone: "@everyone", participants: "les participants", everyone_participants: "@everyone + participants", aucune: "aucune",
};

/** Les variables des textes modifiables (§8.3). Une variable inconnue reste telle quelle. */
export const VARIABLES_TEXTE: Record<string, string> = {
  date: "la date (« mercredi 21 octobre »)", heure: "l'heure (« 21 h »)", annonces: "le nombre d'annoncés",
  retenus: "le nombre de retenus", places: "le nombre de places", manque: "ce qui manque (« 1 Envoûteur et 2 Arcanistes »)",
  lien: "l'adresse de la page", fin: "la fin d'inscription (Guild Siege)",
};

export const RAPPELS_CS_DEFAUT: RappelDef[] = [
  { id: "veille", type: "panneau", actif: true, existant: true, quand: "veille", heure: "20:00", condition: "toujours", mention: "everyone", remplacePrecedent: false,
    texte: "Demain à {heure}. Annonce-toi dès maintenant : on compose les équipes à l'avance." },
  { id: "places_1", type: "places", actif: true, quand: "jour", heure: "13:30", condition: "si_manque", mention: "everyone", remplacePrecedent: false,
    texte: "Tu peux venir ? Un clic sur ✅ Je viens suffit, ici ou sur le panneau." },
  { id: "places_2", type: "places", actif: true, quand: "jour", heure: "18:30", condition: "si_manque", mention: "everyone", remplacePrecedent: true,
    texte: "Tu peux venir ? Un clic sur ✅ Je viens suffit, ici ou sur le panneau." },
  { id: "jour", type: "jour", actif: true, existant: true, quand: "jour", heure: "20:00", condition: "toujours", mention: "everyone_participants", remplacePrecedent: false,
    texte: "Rendez-vous à {heure} en vocal. Vérifie ton stuff, tes salles et ton équipe de jumeaux avant de te connecter." },
  { id: "recap", type: "recap", actif: true, quand: "jour", heure: "20:40", condition: "si_participants", mention: "participants", remplacePrecedent: false,
    texte: "Lis bien ton rôle à chaque phase." },
  { id: "chrono", type: "chrono", actif: false, quand: "jour", heure: "20:55", condition: "toujours", mention: "aucune", remplacePrecedent: false,
    texte: "Un membre du staff clique sur Démarrer au lancement de l'instance." },
];

/** Guild Siege (§11.2) : la mécanique est prête, les horaires sont À CONFIRMER PAR MAXIME. Le
 *  rappel « veille » publie le panneau vivant (lot 9) : sa phrase ouvre le panneau, la règle du
 *  siège (`textes.panneau`) vient dessous. */
export const RAPPELS_GS_DEFAUT: RappelDef[] = [
  { id: "veille", type: "panneau", actif: true, quand: "veille", heure: "20:00", condition: "toujours", mention: "everyone", remplacePrecedent: false,
    texte: "Demain à {heure}. Annonce-toi dès maintenant : un clic suffit." },
  { id: "jour", type: "jour", actif: true, quand: "jour", heure: "20:00", avant: { base: "debut", minutes: 60 }, condition: "toujours", mention: "everyone", remplacePrecedent: false,
    // Le titre dit déjà « commence dans 1 h » ; 🕘 porte l'heure du rendez-vous (§8.2), comme M3.
    texte: "Rendez-vous à {heure} en vocal, avec ton meilleur perso." },
  { id: "gs_staff", type: "gs_staff", actif: true, quand: "jour", heure: "18:30", avant: { base: "finInscription", minutes: 30 }, condition: "toujours", mention: "aucune", remplacePrecedent: false,
    texte: "🏯 Pensez à inscrire la guilde au Guild Siege avant {fin}." },
];

/** Les mentions écrites à la main sont retirées (piège n° 15) : la mention se règle par le champ
 *  « Mention » du rappel, jamais dans un texte. Un « @everyone » saisi notifierait la guilde. */
export function retirerMentions(t: string): string {
  return t.replace(/@(everyone|here)\b/gi, "").replace(/<@[!&]?\d+>/g, "").replace(/ {2,}/g, " ").trim();
}

/** Les {variables} d'un texte, remplies ; une variable inconnue reste telle quelle (§8.3). */
export function remplirTexte(t: string, vars: Partial<Record<string, string>>): string {
  return t.replace(/\{([a-z]+)\}/g, (tout, k: string) => vars[k] ?? tout);
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE PARAMÉTRAGE (§9.2)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Où l'on montre les dégâts DÉCLARÉS de chacun (décisions 9 et 10). « Discord » s'appliquera
 *  avec les messages du bot (lot 3 et suivants). */
export type Degats = { composition: boolean; discord: boolean; bilans: boolean };

export type ParametresCS = {
  /** La bascule depuis le bot Python (§8.10) : coupée tant que l'autre bot tourne. */
  nouveauxMessages: boolean;
  /** Le rappel « veille » publie le panneau (M1), sinon le message simple (M4). */
  panneau: boolean;
  /** "" = la variable d'environnement du bot, puis son défaut. */
  salons: { chambres: string; debriefs: string; essais: string };
  rappels: RappelDef[];
  annoncerAnnulation: boolean;
  /** `phase1`, `phase2` : la consigne en tête des deux messages à boutons de la répartition
   *  (décision 5 : le texte de CHAQUE message se règle ici, avec son défaut dans le code).
   *  `cloture`, `debrief` : la consigne de la clôture et du débrief étape par étape dans Discord
   *  (`/chambre cloturer`, `/chambre debrief`, lot 6 bis). `debriefPublie` : la phrase en tête du
   *  débrief publié dans le salon des débriefs, au-dessus de l'image (M7, lot 7) ; vide, aucune.
   *  `echange` : la consigne sous une demande d'échange de place, dans le message privé au joueur
   *  visé et dans 🔄 Échanges (lot 10). */
  textes: { piedRecap: string; sansPanneau: string; phase1: string; phase2: string; cloture: string; debrief: string; debriefPublie: string; echange: string };
  etapes: Etape[];
  phases: Record<string, string>;
  salles: { cle: string; label: string }[];
  noms: { golems: string };
  consignes: { golems: string; araignee: string[] };
  postes: PosteParam[];
  degats: Degats;
  /** Lot 8 — seul le staff envoie (décision 3) ; ces bornes s'appliqueront alors. */
  videos: { maxParSeance: number; conservationJours: number; quotaGo: number };
};

export type ParametresGS = {
  /** Faux : le Guild Siege est codé mais INACTIF (décision 2 : le PvP n'est pas installé). */
  actif: boolean;
  creneaux: CreneauGS[];
  /** "" = la variable d'environnement du bot (CHANNEL_GS), puis le salon des Chambres ; les
   *  débriefs : "" = le salon du Guild Siege. */
  salons: { siege: string; debriefs: string };
  rappels: RappelDef[];
  /** null = sans plafond (À CONFIRMER). Un plafond compte les COMPTES annoncés. */
  places: number | null;
  /** M8 du Guild Siege : un message quand le staff annule une séance (@everyone le jour même). */
  annoncerAnnulation: boolean;
  /** Vide par défaut : débrief simplifié. */
  etapes: Etape[];
  phases: Record<string, string>;
  /** `panneau` : la règle du siège, sous la phrase d'ouverture du panneau Discord et en tête de
   *  l'onglet du site (« C'est libre… ») ; `debriefPublie` : la phrase en tête du débrief publié
   *  sur Discord (vide : aucune). Décision 5 : chaque texte se règle, avec son défaut ici. */
  textes: { panneau: string; debriefPublie: string };
  /** Les dégâts DÉCLARÉS de chacun (décision 9) : dans l'onglet (`composition`), dans Discord,
   *  dans les bilans. */
  degats: Degats;
};

export const PARAMETRES_CS_DEFAUT: ParametresCS = {
  nouveauxMessages: false,
  panneau: true,
  salons: { chambres: "", debriefs: "", essais: "" },
  rappels: RAPPELS_CS_DEFAUT,
  annoncerAnnulation: true,
  textes: {
    piedRecap: "bonne Chambre à tous !",
    sansPanneau: "Prépare ton stuff et annonce-toi dès maintenant : on compose les équipes à l'avance.",
    phase1: "Clique les salles que tu prends : plusieurs possibles, un joueur par salle. Reclique pour en libérer une.",
    phase2: "Chaque équipe : 1 tank et 4 DPS, 🔮 magiques ou ⚔️ physiques. Clique ton équipe et ton rôle ; reclique pour la quitter.\nKraavus et Kraavos doivent mourir à 4 s d'écart au plus : deux équipes de même force.",
    cloture: "Tous les participants sont cochés : **décoche les absents** dans le premier menu, ajoute au besoin un annoncé non retenu venu quand même, puis valide. Chacun retrouve ses participations dans l'onglet Bilans.",
    debrief: "Bien, Moyen ou Mal enregistre l'étape et passe à la suivante ; reclique une note pour la retirer. Corrige un chrono ou ajoute une remarque, dis gagné ou perdu, écris ce qu'il faut retenir, puis publie.",
    debriefPublie: "Chaque étape, son statut, son chrono et sa remarque sont sur l'image ; le débrief complet est sur le site.",
    echange: "Accepte ou refuse ici, ou dans l'onglet Répartition du site. Sans réponse dans l'heure, la demande tombe d'elle-même.",
  },
  etapes: ETAPES_CS_DEFAUT,
  phases: PHASES_CS_DEFAUT,
  salles: SALLES_DEFAUT,
  noms: { golems: "Golems" },
  // Les consignes du modèle, À RELIRE PAR MAXIME (§4.6) : ce ne sont pas des faits vérifiés.
  consignes: {
    golems: "Ne debuff pas les golems. Longez les murs, n'attirez pas l'araignée.",
    araignee: [
      "Jamais deux debuffs de la même classe en même temps.",
      "Tout le monde collé à l'araignée, même à distance.",
      "Cercle DANGER : Échap tout de suite (elle renvoie les dégâts).",
    ],
  },
  postes: POSTES_DEFAUT,
  degats: { composition: true, discord: true, bilans: true },
  videos: { maxParSeance: 10, conservationJours: 180, quotaGo: 5 },
};

export const PARAMETRES_GS_DEFAUT: ParametresGS = {
  actif: false,
  creneaux: [],
  salons: { siege: "", debriefs: "" },
  rappels: RAPPELS_GS_DEFAUT,
  places: null,
  annoncerAnnulation: true,
  etapes: [],
  phases: { "1": "Manches" },
  textes: {
    panneau: "C'est libre : ramène ton meilleur perso, peu importe la classe.",
    debriefPublie: "",
  },
  degats: { composition: true, discord: true, bilans: true },
};

export const defautsDe = (ev: Evenement) => (ev === "cs" ? PARAMETRES_CS_DEFAUT : PARAMETRES_GS_DEFAUT);

/* ── La normalisation : JAMAIS d'exception, une valeur abîmée reprend son défaut ──
   Comme `fusionner` (lib/reglages.ts) : un document illisible en base doit dégrader l'écran, pas
   casser la page ni le bot. Les bornes de taille sont larges ici — c'est `validerParametres` qui
   REFUSE ce qui dépasse, avec sa raison, au moment d'enregistrer. */

const sansAccent = (v: string) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const chaine = (v: unknown, d: string, max = 2000) => (typeof v === "string" ? v.slice(0, max) : d);
const texteLibre = (v: unknown, d: string) => (typeof v === "string" ? retirerMentions(v.slice(0, 2000)) : d);
const nombre = (v: unknown, d: number, min: number, max: number) =>
  (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d);
const idSalon = (v: unknown) => (typeof v === "string" && /^\d{17,20}$/.test(v) ? v : "");
const heureOk = (v: unknown, d: string) => (minutesDe(v) !== null ? String(v) : d);
const RE_EMOJI = /^\p{Extended_Pictographic}️?$/u;
export const RE_CODE_ETAPE = /^[0-9A-Za-z.]{1,8}$/;
export const RE_ID_MONSTRE = /^MI_[A-Z0-9_]{1,60}$/;
const TYPES_RAPPEL: TypeRappel[] = ["panneau", "places", "jour", "recap", "chrono", "gs_staff"];
const CONDITIONS: RappelDef["condition"][] = ["toujours", "si_manque", "si_participants"];
const MENTIONS: RappelDef["mention"][] = ["everyone", "participants", "everyone_participants", "aucune"];

function normaliserMonstre(v: unknown): MonstreEtape | null {
  const o = obj(v);
  const nom = chaine(o.nom, "", 60).trim();
  const id = typeof o.id === "string" && RE_ID_MONSTRE.test(o.id) ? o.id : null;
  return nom ? { id, nom } : id ? { id, nom: id } : null;
}

function normaliserEtapes(v: unknown, defaut: Etape[], videPermis: boolean): Etape[] {
  if (!Array.isArray(v)) return defaut;
  const vus = new Set<string>();
  const out: Etape[] = [];
  for (const brut of v.slice(0, 60)) {
    const o = obj(brut);
    const code = typeof o.code === "string" ? o.code.trim() : "";
    if (!RE_CODE_ETAPE.test(code) || vus.has(code)) continue;
    vus.add(code);
    const emoji = typeof o.emoji === "string" && RE_EMOJI.test(o.emoji) ? o.emoji : "▫️";
    out.push({
      code, label: chaine(o.label, code, 60).trim() || code,
      phase: typeof o.phase === "string" && /^[1-9]$/.test(o.phase) ? o.phase : "1",
      emoji,
      monstres: (Array.isArray(o.monstres) ? o.monstres : []).slice(0, 12).map(normaliserMonstre).filter((x): x is MonstreEtape => !!x),
    });
  }
  return out.length || videPermis ? out : defaut;
}

function normaliserPhases(v: unknown, defaut: Record<string, string>, etapes: Etape[]): Record<string, string> {
  const o = obj(v);
  const out: Record<string, string> = {};
  for (const k of Object.keys(o).filter((x) => /^[1-9]$/.test(x)).sort()) {
    const l = chaine(o[k], "", 60).trim();
    if (l) out[k] = l;
  }
  const base = Object.keys(out).length ? out : { ...defaut };
  // Une étape dont la phase n'existe plus garde un titre lisible plutôt qu'un trou.
  for (const e of etapes) if (!base[e.phase]) base[e.phase] = `Phase ${e.phase}`;
  return Object.fromEntries(Object.entries(base).sort(([a], [b]) => a.localeCompare(b)));
}

function normaliserRappel(v: unknown, defauts: RappelDef[]): RappelDef | null {
  const o = obj(v);
  const id = typeof o.id === "string" && /^[a-z0-9_]{1,20}$/.test(o.id) ? o.id : null;
  if (!id) return null;
  const d = defauts.find((x) => x.id === id);
  const type = TYPES_RAPPEL.includes(o.type as TypeRappel) ? (o.type as TypeRappel) : (d?.type ?? "jour");
  const av = obj(o.avant);
  const avant = o.avant && (av.base === "debut" || av.base === "finInscription")
    ? { base: av.base as "debut" | "finInscription", minutes: nombre(av.minutes, 60, 0, 1440) } : undefined;
  const r: RappelDef = {
    id, type, actif: bool(o.actif, d?.actif ?? false),
    quand: o.quand === "veille" ? "veille" : o.quand === "jour" ? "jour" : (d?.quand ?? "jour"),
    heure: heureOk(o.heure, d?.heure ?? "20:00"),
    condition: CONDITIONS.includes(o.condition as RappelDef["condition"]) ? (o.condition as RappelDef["condition"]) : (d?.condition ?? "toujours"),
    mention: MENTIONS.includes(o.mention as RappelDef["mention"]) ? (o.mention as RappelDef["mention"]) : (d?.mention ?? "aucune"),
    remplacePrecedent: bool(o.remplacePrecedent, d?.remplacePrecedent ?? false),
    texte: texteLibre(o.texte, d?.texte ?? ""),
  };
  if (avant) r.avant = avant;
  // « existant » n'appartient qu'aux deux rappels qui partaient avant la bascule (veille, jour) :
  // un rappel ajouté par le staff ne peut pas passer outre `nouveauxMessages`.
  if (d?.existant) r.existant = true;
  return r;
}

function normaliserRappels(v: unknown, defauts: RappelDef[]): RappelDef[] {
  if (!Array.isArray(v)) return defauts;
  const vus = new Set<string>();
  return v.slice(0, 24).map((x) => normaliserRappel(x, defauts))
    .filter((r): r is RappelDef => !!r && !vus.has(r.id) && !!vus.add(r.id)).slice(0, 12);
}

function normaliserPostes(v: unknown): PosteParam[] {
  const liste = Array.isArray(v) ? v.map(obj) : [];
  return POSTES_DEFAUT.map((d) => {
    const o = liste.find((x) => x.id === d.id);
    if (!o) return d;
    const classe = CLASSES_CLES.find((c) => c === o.classe) ?? d.classe;
    const cs = obj(o.cs);
    const role = (x: unknown, def: "tank" | "dps") => (x === "tank" || x === "dps" ? x : def);
    const permis = rolesDeClasse(classe);
    const mesure = (Array.isArray(cs.mesure) ? cs.mesure : []).filter((r): r is RoleMesure => r === "dps" || r === "offtank" || r === "tank");
    const propre = [...new Set(mesure)].filter((r) => permis.includes(r));
    // Rien de lisible pour cette classe : le chiffre du code si la classe n'a pas bougé, le DPS
    // sinon (toute classe en a un).
    const repli = d.classe === classe ? d.cs : { ...d.cs, mesure: ["dps"] as RoleMesure[], toutes: undefined };
    const rolesCS: RolesCS = {
      jumeaux: role(cs.jumeaux, d.cs.jumeaux), golems: role(cs.golems, d.cs.golems), araignee: role(cs.araignee, d.cs.araignee),
      mesure: propre.length ? propre : repli.mesure,
    };
    if ((propre.length ? cs.toutes === true : repli.toutes) && rolesCS.mesure.length > 1) rolesCS.toutes = true;
    return { id: d.id, label: chaine(o.label, d.label, 60).trim() || d.label, classe, optionnel: bool(o.optionnel, d.optionnel), cs: rolesCS };
  });
}

export function normaliserCS(raw: unknown): ParametresCS {
  const o = obj(raw);
  const D = PARAMETRES_CS_DEFAUT;
  const salons = obj(o.salons), textes = obj(o.textes), noms = obj(o.noms), consignes = obj(o.consignes), degats = obj(o.degats), videos = obj(o.videos);
  const etapes = normaliserEtapes(o.etapes, D.etapes, false);
  const salles = (() => {
    if (!Array.isArray(o.salles)) return D.salles;
    const vus = new Set<string>();
    const s = o.salles.slice(0, 40).map(obj)
      .map((x) => ({ cle: typeof x.cle === "string" ? x.cle : "", label: chaine(x.label, "", 40).trim() }))
      .filter((x) => /^[a-z0-9]{1,8}$/.test(x.cle) && x.label && !vus.has(x.cle) && !!vus.add(x.cle));
    return s.length ? s : D.salles;
  })();
  return {
    nouveauxMessages: bool(o.nouveauxMessages, D.nouveauxMessages),
    panneau: bool(o.panneau, D.panneau),
    salons: { chambres: idSalon(salons.chambres), debriefs: idSalon(salons.debriefs), essais: idSalon(salons.essais) },
    rappels: normaliserRappels(o.rappels, D.rappels),
    annoncerAnnulation: bool(o.annoncerAnnulation, D.annoncerAnnulation),
    textes: {
      piedRecap: texteLibre(textes.piedRecap, D.textes.piedRecap), sansPanneau: texteLibre(textes.sansPanneau, D.textes.sansPanneau),
      // Un `textes` enregistré avant leur arrivée n'a pas ces deux clés : elles prennent leur défaut.
      phase1: texteLibre(textes.phase1, D.textes.phase1), phase2: texteLibre(textes.phase2, D.textes.phase2),
      cloture: texteLibre(textes.cloture, D.textes.cloture), debrief: texteLibre(textes.debrief, D.textes.debrief),
      debriefPublie: texteLibre(textes.debriefPublie, D.textes.debriefPublie),
      // Lot 10 : absent d'un `textes` enregistré avant, il prend son défaut.
      echange: texteLibre(textes.echange, D.textes.echange),
    },
    etapes,
    phases: normaliserPhases(o.phases, D.phases, etapes),
    salles,
    noms: { golems: chaine(noms.golems, D.noms.golems, 30).trim() || D.noms.golems },
    consignes: {
      golems: texteLibre(consignes.golems, D.consignes.golems),
      araignee: Array.isArray(consignes.araignee)
        ? consignes.araignee.filter((x): x is string => typeof x === "string").map((x) => retirerMentions(x.slice(0, 2000))).filter(Boolean).slice(0, 16)
        : D.consignes.araignee,
    },
    postes: normaliserPostes(o.postes),
    degats: { composition: bool(degats.composition, D.degats.composition), discord: bool(degats.discord, D.degats.discord), bilans: bool(degats.bilans, D.degats.bilans) },
    videos: {
      maxParSeance: nombre(videos.maxParSeance, D.videos.maxParSeance, 1, 50),
      conservationJours: nombre(videos.conservationJours, D.videos.conservationJours, 7, 3650),
      quotaGo: nombre(videos.quotaGo, D.videos.quotaGo, 1, 100),
    },
  };
}

export function normaliserGS(raw: unknown): ParametresGS {
  const o = obj(raw);
  const D = PARAMETRES_GS_DEFAUT;
  const salons = obj(o.salons), textes = obj(o.textes), degats = obj(o.degats);
  const vus = new Set<string>();
  const creneaux = (Array.isArray(o.creneaux) ? o.creneaux : []).slice(0, 14).map(obj).flatMap((c): CreneauGS[] => {
    const jour = JOURS.find((j) => j === c.jour);
    const heure = minutesDe(c.heure) !== null ? String(c.heure) : null;
    if (!jour || !heure) return [];
    const id = `${jour}${heure.replace(":", "")}`;
    if (vus.has(id)) return [];
    vus.add(id);
    return [{ id, jour, heure, finInscription: minutesDe(c.finInscription) !== null ? String(c.finInscription) : null }];
  }).slice(0, 7);
  const etapes = normaliserEtapes(o.etapes, D.etapes, true);
  return {
    actif: bool(o.actif, D.actif),
    creneaux,
    salons: { siege: idSalon(salons.siege), debriefs: idSalon(salons.debriefs) },
    rappels: normaliserRappels(o.rappels, D.rappels),
    places: o.places === null ? null : typeof o.places === "number" ? nombre(o.places, 10, 1, 100) : D.places,
    annoncerAnnulation: bool(o.annoncerAnnulation, D.annoncerAnnulation),
    etapes,
    phases: normaliserPhases(o.phases, D.phases, etapes),
    // Un `textes` enregistré avant le lot 9 n'a pas `debriefPublie` : il prend son défaut.
    textes: { panneau: texteLibre(textes.panneau, D.textes.panneau), debriefPublie: texteLibre(textes.debriefPublie, D.textes.debriefPublie) },
    degats: { composition: bool(degats.composition, D.degats.composition), discord: bool(degats.discord, D.degats.discord), bilans: bool(degats.bilans, D.degats.bilans) },
  };
}

/**
 * LE DÉROULÉ FIGÉ D'UNE SÉANCE (`SeanceGuilde.etapes`, §3.2) : les étapes et les phases telles
 * qu'elles étaient au premier « Démarrer » du chrono (ou, au lot 6, à la première note du
 * débrief). Modifier le paramétrage ensuite ne touche plus cette séance : deux séances se
 * comparent sur le `code` de chaque étape. Relu sans confiance, avec les règles du paramétrage ;
 * null tant que rien ne l'a figé (ou une liste vide, illisible) — on lit alors le paramétrage.
 */
export function lireDeroule(json: unknown): { etapes: Etape[]; phases: Record<string, string> } | null {
  const o = obj(json);
  if (!Array.isArray(o.etapes)) return null;
  const etapes = normaliserEtapes(o.etapes, [], true);
  if (!etapes.length) return null;
  return { etapes, phases: normaliserPhases(o.phases, {}, etapes) };
}

/** Le déroulé que suit une séance : le sien s'il est figé, sinon celui du paramétrage. */
export const derouleDe = (json: unknown, p: Pick<ParametresCS, "etapes" | "phases">) =>
  lireDeroule(json) ?? { etapes: p.etapes, phases: p.phases };

export function normaliserParametres(ev: "cs", raw: unknown): ParametresCS;
export function normaliserParametres(ev: "gs", raw: unknown): ParametresGS;
export function normaliserParametres(ev: Evenement, raw: unknown): ParametresCS | ParametresGS;
export function normaliserParametres(ev: Evenement, raw: unknown): ParametresCS | ParametresGS {
  return ev === "cs" ? normaliserCS(raw) : normaliserGS(raw);
}

/**
 * CE QUI S'ÉCRIT EN BASE : seulement les clés de premier niveau qui diffèrent du défaut
 * (contre-examen n° 24). Une liste modifiée est gardée entière. « Rétablir le défaut » remet la
 * valeur du code, et la clé disparaît d'elle-même.
 */
export function aEnregistrer(ev: Evenement, propre: ParametresCS | ParametresGS): Record<string, unknown> {
  const defaut = normaliserParametres(ev, {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(propre)) if (!memeValeur(v, defaut[k])) out[k] = v;
  return out;
}

/** Deux valeurs égales quel que soit l'ordre de leurs clés : un rappel relu par la
 *  normalisation n'écrit pas ses champs dans l'ordre du défaut, et ne doit pas passer pour
 *  modifié. Les undefined sont ignorés, comme JSON les ignore. */
export function memeValeur(a: unknown, b: unknown): boolean {
  const stable = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(stable)
      : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => [k, stable((v as Record<string, unknown>)[k])]))
      : v;
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

/* ── La validation : appelée AVANT d'écrire, elle refuse et dit pourquoi (§9.3) ── */

export type ContexteValidation = {
  /** Le cache `GuildChannel` du bot : un salon choisi doit y être, et du bon type. */
  salons?: { id: string; type: string }[];
  /** Le paramétrage de l'AUTRE événement : un seul @everyone par demi-heure (§8.5). */
  autre?: ParametresCS | ParametresGS | null;
  /** Un identifiant de monstre doit mener à une fiche (/monstres/{id}). */
  monstreConnu?: (id: string) => boolean;
};

const MAX_TEXTE = 400;
const SEMAINE = 7 * 1440;
const estEveryone = (m: RappelDef["mention"]) => m === "everyone" || m === "everyone_participants";
const ecritHeure = (t: number) => {
  const n = ((t % SEMAINE) + SEMAINE) % SEMAINE;
  return `${JOURS_LONGS[Math.floor(n / 1440)]} ${deux(Math.floor((n % 1440) / 60))}:${deux(n % 60)}`;
};

/** Les moments de la semaine (en minutes depuis dimanche 0 h) où part un @everyone actif. */
function momentsEveryone(ev: Evenement, p: ParametresCS | ParametresGS): { id: string; t: number }[] {
  const out: { id: string; t: number }[] = [];
  const rappels = p.rappels.filter((r) => r.actif && estEveryone(r.mention));
  if (ev === "cs") {
    for (const r of rappels) for (const j of [3, 0]) {
      const h = minutesDe(r.heure) ?? 0;
      out.push({ id: r.id, t: (((r.quand === "veille" ? j - 1 : j) + 7) % 7) * 1440 + h });
    }
    return out;
  }
  // Un Guild Siege INACTIF n'envoie rien (décision 2 : codé, réglable, éteint) : ses créneaux
  // peuvent se préparer sans bloquer l'enregistrement des Chambres. Le conflit est vu au moment
  // où on l'ALLUME — c'est cet enregistrement-là qui est refusé.
  if (!(p as ParametresGS).actif) return out;
  for (const c of (p as ParametresGS).creneaux) {
    const j = JOURS.indexOf(c.jour);
    for (const r of rappels) {
      if (r.avant) {
        const base = minutesDe(r.avant.base === "debut" ? c.heure : c.finInscription);
        if (base === null) continue;
        out.push({ id: r.id, t: (((j * 1440 + base - r.avant.minutes) % SEMAINE) + SEMAINE) % SEMAINE });
      } else {
        out.push({ id: r.id, t: (((r.quand === "veille" ? j - 1 : j) + 7) % 7) * 1440 + (minutesDe(r.heure) ?? 0) });
      }
    }
  }
  return out;
}

/** Deux @everyone, l'un des Chambres et l'autre du Guild Siege, à moins de 30 min d'écart. */
export function conflitsEveryone(cs: ParametresCS, gs: ParametresGS): string[] {
  const a = momentsEveryone("cs", cs), b = momentsEveryone("gs", gs);
  const out: string[] = [];
  for (const g of b) for (const c of a) {
    const ecart = Math.abs(g.t - c.t), cyc = Math.min(ecart, SEMAINE - ecart);
    if (cyc < 30) {
      const m = `Le rappel « ${g.id} » du Guild Siege (${ecritHeure(g.t)}) tombe à moins de 30 min du rappel @everyone des Chambres « ${c.id} » (${ecritHeure(c.t)}) : décale-le ou retire sa mention.`;
      if (!out.includes(m)) out.push(m);
    }
  }
  return out;
}

const lst = (v: unknown) => (Array.isArray(v) ? v : null);

function validerRappels(ev: Evenement, raw: unknown, err: string[]) {
  const l = lst(raw);
  if (!l) { err.push("La liste des rappels est illisible."); return; }
  if (l.length > 12) err.push("12 rappels au plus.");
  const vus = new Set<string>();
  for (const x of l) {
    const o = obj(x);
    const id = String(o.id ?? "");
    const nom = `Le rappel « ${id || "sans nom"} »`;
    if (!/^[a-z0-9_]{1,20}$/.test(id)) err.push(`${nom} : son nom s'écrit en minuscules, chiffres et _ (20 signes au plus).`);
    if (vus.has(id)) err.push(`Deux rappels portent le nom « ${id} ».`);
    vus.add(id);
    if (!TYPES_RAPPEL.includes(o.type as TypeRappel)) err.push(`${nom} : message inconnu.`);
    if (!o.avant && minutesDe(o.heure) === null) err.push(`${nom} : l'heure s'écrit HH:MM, entre 00:00 et 23:59.`);
    if (o.avant) {
      const av = obj(o.avant);
      if (av.base !== "debut" && av.base !== "finInscription") err.push(`${nom} : « avant » se compte depuis le début ou la fin d'inscription.`);
      if (typeof av.minutes !== "number" || av.minutes < 0 || av.minutes > 1440) err.push(`${nom} : de 0 à 1 440 minutes avant.`);
    }
    if (!MENTIONS.includes(o.mention as RappelDef["mention"])) err.push(`${nom} : mention inconnue.`);
    if (!CONDITIONS.includes(o.condition as RappelDef["condition"])) err.push(`${nom} : condition inconnue.`);
    if (typeof o.texte === "string" && o.texte.length > MAX_TEXTE) err.push(`${nom} : le texte fait ${o.texte.length} signes, ${MAX_TEXTE} au plus.`);
    if (ev === "cs" && o.quand === "jour" && !o.avant && (minutesDe(o.heure) ?? 0) >= 21 * 60)
      err.push(`${nom} : à ${o.heure} le jour J, il partirait pendant la Chambre (21 h). Avance-le.`);
    if ((o.type === "recap" || o.type === "chrono") && estEveryone(o.mention as RappelDef["mention"]))
      err.push(`${nom} : on ne mentionne pas toute la guilde pour un ${o.type === "recap" ? "récap" : "chrono"}. Choisis « les participants » ou « aucune ».`);
  }
}

function validerSalon(nom: string, id: unknown, types: string[], ctx: ContexteValidation, err: string[]) {
  if (id === "" || id === undefined || id === null) return;
  if (typeof id !== "string" || !/^\d{17,20}$/.test(id)) { err.push(`Salon « ${nom} » : identifiant illisible.`); return; }
  const c = (ctx.salons ?? []).find((x) => x.id === id);
  if (!c) err.push(`Salon « ${nom} » : le bot ne connaît pas ce salon (il synchronise la liste toutes les 10 min).`);
  else if (!types.includes(c.type)) err.push(`Salon « ${nom} » : un salon ${types.includes("forum") ? "texte, d'annonces ou forum" : "texte ou d'annonces"} est attendu.`);
}

function validerEtapes(raw: unknown, phasesRaw: unknown, min: number, err: string[], ctx: ContexteValidation) {
  const l = lst(raw);
  if (!l) { err.push("La liste des étapes est illisible."); return; }
  if (l.length < min) err.push("Il faut au moins une étape : le chrono et le débrief les suivent.");
  if (l.length > 30) err.push("30 étapes au plus.");
  const phases = obj(phasesRaw);
  const cles = Object.keys(phases);
  if (l.length && !cles.length) err.push("Il faut au moins une phase.");
  if (cles.length > 9) err.push("9 phases au plus.");
  for (const k of cles) {
    if (!/^[1-9]$/.test(k)) err.push(`Phase « ${k} » : une phase se numérote de 1 à 9.`);
    const t = phases[k];
    if (typeof t !== "string" || !t.trim() || t.length > 60) err.push(`Phase ${k} : un titre de 1 à 60 signes.`);
  }
  const vus = new Set<string>();
  for (const x of l) {
    const e = obj(x);
    const code = typeof e.code === "string" ? e.code : "";
    const nom = `Étape « ${code || "sans code"} »`;
    if (!RE_CODE_ETAPE.test(code)) err.push(`${nom} : le code fait 1 à 8 signes, chiffres, lettres et points (« 2.2 »).`);
    if (vus.has(code)) err.push(`Deux étapes portent le code « ${code} » : c'est lui qui compare les séances, il doit être unique.`);
    vus.add(code);
    if (typeof e.label !== "string" || !e.label.trim() || e.label.length > 60) err.push(`${nom} : un libellé de 1 à 60 signes.`);
    if (typeof e.phase !== "string" || !(e.phase in phases)) err.push(`${nom} : sa phase n'existe pas.`);
    const ms = lst(e.monstres) ?? [];
    if (ms.length > 12) err.push(`${nom} : 12 monstres au plus.`);
    for (const m of ms) {
      const mo = obj(m);
      if (typeof mo.nom !== "string" || !mo.nom.trim() || mo.nom.length > 60) err.push(`${nom} : un monstre sans nom (60 signes au plus).`);
      if (mo.id !== null && mo.id !== undefined && mo.id !== "") {
        if (typeof mo.id !== "string" || !RE_ID_MONSTRE.test(mo.id)) err.push(`${nom} : « ${String(mo.id)} » n'est pas un identifiant de monstre (MI_…).`);
        else if (ctx.monstreConnu && !ctx.monstreConnu(mo.id)) err.push(`${nom} : aucune fiche /monstres ne porte l'identifiant ${mo.id}.`);
      }
    }
  }
}

const texteTropLong = (nom: string, v: unknown, err: string[]) => {
  if (typeof v === "string" && v.length > MAX_TEXTE) err.push(`${nom} : ${v.length} signes, ${MAX_TEXTE} au plus.`);
};

/** Les erreurs, lisibles, d'un paramétrage SAISI ; vide = il peut s'enregistrer. */
export function validerParametres(ev: Evenement, raw: unknown, ctx: ContexteValidation = {}): string[] {
  const o = obj(raw);
  const err: string[] = [];
  validerRappels(ev, o.rappels, err);
  const salons = obj(o.salons);
  if (ev === "cs") {
    validerSalon("Chambres", salons.chambres, ["text", "announcement"], ctx, err);
    validerSalon("Débriefs", salons.debriefs, ["text", "announcement", "forum"], ctx, err);
    validerSalon("Essais", salons.essais, ["text", "announcement"], ctx, err);
    validerEtapes(o.etapes, o.phases, 1, err, ctx);
    const salles = lst(o.salles);
    if (!salles || salles.length < 1 || salles.length > 20) err.push("La Phase 1 compte de 1 à 20 salles.");
    const vus = new Set<string>();
    for (const s of salles ?? []) {
      const x = obj(s);
      if (typeof x.cle !== "string" || !/^[a-z0-9]{1,8}$/.test(x.cle) || vus.has(x.cle)) err.push(`Salle « ${String(x.label ?? x.cle ?? "")} » : une clé unique en minuscules et chiffres (« s3 »).`);
      vus.add(String(x.cle));
      if (typeof x.label !== "string" || !x.label.trim() || x.label.length > 40) err.push(`Salle « ${String(x.cle ?? "")} » : un nom de 1 à 40 signes.`);
    }
    const noms = obj(o.noms);
    if (typeof noms.golems !== "string" || !noms.golems.trim() || noms.golems.length > 30) err.push("Le nom de la Phase 3 (« Golems ») fait 1 à 30 signes.");
    const consignes = obj(o.consignes);
    texteTropLong("La consigne des golems", consignes.golems, err);
    const ar = lst(consignes.araignee) ?? [];
    if (ar.length > 8) err.push("8 consignes de l'araignée au plus.");
    ar.forEach((t, i) => texteTropLong(`La consigne ${i + 1} de l'araignée`, t, err));
    const textes = obj(o.textes);
    texteTropLong("Le pied du récap", textes.piedRecap, err);
    texteTropLong("Le rappel de la veille sans panneau", textes.sansPanneau, err);
    texteTropLong("La consigne des boutons des salles (Phase 1)", textes.phase1, err);
    texteTropLong("La consigne des boutons des jumeaux (Phase 2)", textes.phase2, err);
    texteTropLong("La consigne de la clôture dans Discord", textes.cloture, err);
    texteTropLong("La consigne du débrief dans Discord", textes.debrief, err);
    texteTropLong("La phrase du débrief publié", textes.debriefPublie, err);
    texteTropLong("La consigne d'une demande d'échange", textes.echange, err);
    for (const x of lst(o.postes) ?? []) {
      const p = obj(x);
      const d = POSTES_DEFAUT.find((q) => q.id === p.id);
      if (!d) { err.push(`Poste « ${String(p.id)} » inconnu.`); continue; }
      const titre = `Poste ${d.label} (${d.id})`;
      if (!CLASSES_CLES.includes(p.classe as (typeof CLASSES_CLES)[number])) err.push(`${titre} : classe inconnue.`);
      if (typeof p.label === "string" && p.label.length > 60) err.push(`${titre} : un titre de 60 signes au plus.`);
      const cs = obj(p.cs);
      const mesure = lst(cs.mesure) ?? [];
      if (!mesure.length) err.push(`${titre} : choisis le chiffre à montrer.`);
      const permis = rolesDeClasse(String(p.classe ?? ""));
      for (const r of mesure) if (!permis.includes(r as RoleMesure)) {
        err.push(`${titre} : un ${NOMS_CLASSES[String(p.classe)] ?? String(p.classe)} ne se mesure pas en ${r === "offtank" ? "Off tank (seul le Primat)" : r === "tank" ? "Tank (Primat, Templier, Chanoine)" : r}.`);
      }
      for (const ph of ["jumeaux", "golems", "araignee"]) if (cs[ph] !== "tank" && cs[ph] !== "dps") err.push(`${titre} : le rôle « ${ph} » est tank ou dps.`);
    }
    if (ctx.autre) err.push(...conflitsEveryone(normaliserCS(raw), ctx.autre as ParametresGS));
  } else {
    validerSalon("Guild Siege", salons.siege, ["text", "announcement"], ctx, err);
    validerSalon("Débriefs", salons.debriefs, ["text", "announcement", "forum"], ctx, err);
    validerEtapes(o.etapes, o.phases, 0, err, ctx);
    const vus = new Set<string>();
    const creneaux = lst(o.creneaux) ?? [];
    if (creneaux.length > 7) err.push("7 créneaux au plus.");
    for (const c of creneaux) {
      const x = obj(c);
      if (!JOURS.includes(x.jour as JourFr)) err.push("Un créneau sans jour.");
      if (minutesDe(x.heure) === null) err.push(`Le créneau du ${JOURS_LONGS[JOURS.indexOf(x.jour as JourFr)] ?? "?"} : l'heure s'écrit HH:MM.`);
      if (x.finInscription !== null && x.finInscription !== undefined && x.finInscription !== "" && minutesDe(x.finInscription) === null)
        err.push("La fin d'inscription s'écrit HH:MM, ou reste vide.");
      const debut = minutesDe(x.heure), fin = minutesDe(x.finInscription);
      if (debut !== null && fin !== null && fin > debut)
        err.push(`Le créneau du ${JOURS_LONGS[JOURS.indexOf(x.jour as JourFr)] ?? "?"} : la fin d'inscription (${String(x.finInscription)}) tombe après le début (${String(x.heure)}).`);
      const id = `${String(x.jour)}${String(x.heure).replace(":", "")}`;
      if (vus.has(id)) err.push(`Deux créneaux identiques (${JOURS_LONGS[JOURS.indexOf(x.jour as JourFr)] ?? x.jour} ${String(x.heure)}).`);
      vus.add(id);
    }
    if (o.places !== null && o.places !== undefined && (typeof o.places !== "number" || o.places < 1 || o.places > 100)) err.push("Le plafond va de 1 à 100 joueurs, ou reste vide (sans plafond).");
    texteTropLong("La règle du siège (panneau et onglet)", obj(o.textes).panneau, err);
    texteTropLong("La phrase du débrief publié", obj(o.textes).debriefPublie, err);
    // Allumer le Guild Siege sans créneau : rien ne partirait, et l'onglet promettrait une séance
    // qui n'existe pas. On le dit plutôt que de l'allumer pour rien.
    if (o.actif === true && !creneaux.length) err.push("Le Guild Siege ne s'active qu'avec au moins un créneau (jour et heure).");
    if (ctx.autre) err.push(...conflitsEveryone(ctx.autre as ParametresCS, normaliserGS(raw)));
  }
  return err;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES PARTICIPANTS, LA CLÔTURE ET LES BILANS (§2.4, §4.8)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Un chiffre déclaré, figé au moment où on le montre : la clôture le range dans `details`,
 *  pour que l'historique dise ce que le joueur déclarait CE SOIR-LÀ. */
export type ChiffreFige = { role: RoleMesure; valeur: number; texte: string; arme: string | null; mesureLe: number | null; aRemesurer: boolean };

/**
 * Ce que dit le survol d'un chiffre FIGÉ (clôture, bilans) : la valeur, sa date de mesure et le
 * témoin « à remesurer » de ce soir-là. Décision 9 de Maxime : partout où l'on voit les joueurs
 * d'une séance, un chiffre se montre comme DÉCLARÉ, daté — jamais comme vérifié.
 */
export function survolFige(c: Pick<ChiffreFige, "texte" | "arme" | "mesureLe" | "aRemesurer">): string {
  const date = c.mesureLe ? new Date(c.mesureLe).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }) : null;
  return `${c.texte}${c.arme ? ` en ${c.arme}` : ""} · ${date ? `déclaré le ${date}` : "déclaré, sans date"}${c.aRemesurer ? " · plus de 30 jours : à remesurer" : ""}`;
}

export type Participant = {
  pseudo: string;
  classe: string;
  player: string;
  /** Le compte retrouvé (jamais montré aux membres) ; null : aucun compte ne porte ce perso. */
  userId: string | null;
  slotId: string | null;
  poste: string | null;
  retenu: boolean;
  ts: number;
  roles: { jumeaux: "tank" | "dps"; golems: "tank" | "dps"; araignee: "tank" | "dps" };
  type: "mag" | "phy" | null;
  /** Le rôle tenu ce soir dans les listes (§4.6) : tank, ou le type de DPS. */
  role: "tank" | "mag" | "phy";
  chiffres: ChiffreFige[];
  /** Le texte prêt à poser à côté du nom (« 4,9 M sceptre · 7,9 M poing »). */
  enLigne: string;
};

export type DetailsParticipant = {
  poste: string | null;
  role: "tank" | "mag" | "phy";
  chiffres: ChiffreFige[];
  enLigne: string;
  salles: string[];
  jumeau: string | null;
};

export type LigneCloture = {
  pseudo: string; classe: string; player: string; userId: string | null; slotId: string | null;
  present: boolean; details: DetailsParticipant;
};

/**
 * Les lignes d'une clôture (§4.8) : chaque participant, coché ou non (`present: false` pour un
 * décoché) ; puis les annoncés non retenus que le staff AJOUTE, venus quand même. Un nom qui
 * n'est ni l'un ni l'autre est rendu dans `inconnus` : la route refuse plutôt que d'écrire un
 * présent que personne n'a annoncé.
 */
export function lignesCloture(
  participants: Participant[], autres: Participant[], presents: string[], ajoutes: string[] = [],
): { lignes: LigneCloture[]; inconnus: string[] } {
  const k = (s: string) => s.toLowerCase();
  const cochés = new Set(presents.map(k));
  const enPlus = new Set(ajoutes.map(k));
  const connus = new Set([...participants, ...autres].map((p) => k(p.pseudo)));
  const inconnus = [...new Set([...presents, ...ajoutes])].filter((n) => !connus.has(k(n)));
  const ligne = (p: Participant, present: boolean): LigneCloture => ({
    pseudo: p.pseudo, classe: p.classe, player: p.player, userId: p.userId, slotId: p.slotId, present,
    details: { poste: p.poste, role: p.role, chiffres: p.chiffres, enLigne: p.enLigne, salles: [], jumeau: null },
  });
  const vus = new Set<string>();
  const lignes: LigneCloture[] = [];
  for (const p of participants) { if (vus.has(k(p.pseudo))) continue; vus.add(k(p.pseudo)); lignes.push(ligne(p, cochés.has(k(p.pseudo)))); }
  for (const p of autres) {
    if (vus.has(k(p.pseudo)) || !(enPlus.has(k(p.pseudo)) || cochés.has(k(p.pseudo)))) continue;
    vus.add(k(p.pseudo));
    lignes.push(ligne(p, true));
  }
  return { lignes, inconnus };
}

/** Une ligne de participation telle que l'historique la lit. */
export type Participation = { seance: string; date: string; pseudo: string; player: string; userId: string | null; present: boolean };

export type BilanJoueur = { joueur: string; persos: string[]; joues: number; absences: number; dates: string[]; absentLe: string[] };

/**
 * L'historique (§4.8, `/historique` du modèle) : par joueur, les séances jouées, et « inscrit
 * mais absent ». Un joueur, c'est un COMPTE (userId) quand on le connaît, sinon le `player` de
 * l'annonce — jamais un perso : on ne joue qu'un perso à la fois, et deux persos d'un même compte
 * ne font pas deux participations.
 */
export function bilanParticipations(lignes: Participation[], nomDe: (userId: string) => string | null = () => null): BilanJoueur[] {
  const par = new Map<string, BilanJoueur & { _jouees: Set<string>; _absences: Set<string> }>();
  for (const l of lignes) {
    const cle = l.userId ? `u:${l.userId}` : `p:${l.player.toLowerCase()}`;
    const j = par.get(cle) ?? { joueur: (l.userId && nomDe(l.userId)) || l.player, persos: [], joues: 0, absences: 0, dates: [], absentLe: [], _jouees: new Set<string>(), _absences: new Set<string>() };
    if (!j.persos.includes(l.pseudo)) j.persos.push(l.pseudo);
    if (l.present) j._jouees.add(l.seance + "|" + l.date);
    else j._absences.add(l.seance + "|" + l.date);
    par.set(cle, j);
  }
  return [...par.values()].map(({ _jouees, _absences, ...j }) => {
    // Absent avec un perso mais présent avec un autre le même soir : il était là.
    const absences = [..._absences].filter((x) => !_jouees.has(x));
    return {
      ...j,
      joues: _jouees.size, absences: absences.length,
      dates: [..._jouees].map((x) => x.split("|")[1]).sort().reverse(),
      absentLe: absences.map((x) => x.split("|")[1]).sort().reverse(),
    };
  }).sort((a, b) => b.joues - a.joues || a.absences - b.absences || a.joueur.localeCompare(b.joueur));
}

/** Les annonces d'une séance, dans l'ordre où elles sont arrivées (§4.3 : l'ordre d'annonce
 *  remplace l'ordre d'inscription du modèle). */
export const parOrdreDAnnonce = (ps: Presence[]) => [...ps].sort((a, b) => a.ts - b.ts);

/**
 * LES ANNONCES QUI VALENT POUR CETTE CHAMBRE-LÀ, et pour elle seule. `presencesSeance` ne borne
 * que le début (l'ouverture de sa préparation) : c'est juste pour la séance qu'on PRÉPARE, faux
 * pour une séance passée. La clôture en vise une autre que la dernière (son sélecteur remonte
 * de quatre semaines) : sans borne de fin, le mercredi 14 comptait les annonces faites depuis
 * pour le mercredi 21, même créneau, plus récentes — et la clôture les écrivait au 14. La
 * fenêtre s'arrête donc à l'ouverture de la même séance une semaine plus tard.
 */
export function annoncesDeLaSeance(etat: { presences: Presence[] }, s: SeanceParis): Presence[] {
  const debut = s.ouverture.getTime();
  const fin = s.evenement === "cs" && (s.creneau === "mer" || s.creneau === "dim")
    ? seanceCS(ajouterJours(s.date, 7), s.creneau).ouverture.getTime()
    : Infinity;
  return parOrdreDAnnonce(etat.presences.filter((p) => p.creneau === s.creneau && p.ts >= debut && p.ts < fin));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE BOT, LOT 3 : LES RAPPELS DU JOUR J (§8.5) ET S'ANNONCER DEPUIS DISCORD (§4.12)
   Tout ce qui se DÉCIDE est ici, pur et vérifié par scripts/verifier-seances.ts ; le bot
   (bot/lib/seances.ts) ne fait que lire la base, appeler ces fonctions et parler à Discord.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Un bot redémarré à 13 h 34 envoie encore le rappel de 13 h 30 ; à 13 h 41, il y renonce
 *  plutôt que d'annoncer « il manque du monde » en retard (§8.5). */
export const FENETRE_RATTRAPAGE_MIN = 10;
/** Un seul @everyone par salon et par demi-heure (§8.5, contre-examen n° 9). */
export const ECART_EVERYONE_MS = 30 * 60_000;

/**
 * Les rappels qui ont le droit de partir. Chambres : les actifs, et tant que la bascule depuis
 * le bot Python est coupée (`nouveauxMessages`, §8.10), les deux seuls « existants » (veille et
 * jour) — sinon deux bots annonceraient la même Chambre. Guild Siege : aucun bot à remplacer,
 * mais il est codé ET ÉTEINT (décision 2) — rien ne part tant qu'il n'est pas actif.
 */
export function rappelsEnService(ev: Evenement, params: ParametresCS | ParametresGS): RappelDef[] {
  if (ev === "gs") return (params as ParametresGS).actif ? params.rappels.filter((r) => r.actif) : [];
  const p = params as ParametresCS;
  return p.rappels.filter((r) => r.actif && (r.existant || p.nouveauxMessages));
}

/**
 * L'instant où part un rappel pour une séance. Une heure fixe se lit la veille ou le jour J, à
 * Paris ; `avant` se compte depuis le début de la séance ou la fin d'inscription de son créneau
 * (Guild Siege) — une heure fixe ne suivrait pas un créneau déplacé (contre-examen n° 8).
 */
export function instantRappel(r: RappelDef, s: SeanceParis, c?: CreneauGS | null): Date | null {
  if (r.avant) {
    const base = r.avant.base === "debut" ? s.debut : c?.finInscription ? instantParis(s.date, c.finInscription) : null;
    return base ? new Date(base.getTime() - r.avant.minutes * 60_000) : null;
  }
  if (minutesDe(r.heure) === null) return null;
  return instantParis(r.quand === "veille" ? ajouterJours(s.date, -1) : s.date, r.heure);
}

/** Les séances dont un rappel peut tomber autour de `now` : d'avant-hier à après-demain. */
export function seancesAutour(ev: Evenement, now: Date, gs?: Pick<ParametresGS, "creneaux"> | null): SeanceParis[] {
  const p = partiesParis(now);
  const out: SeanceParis[] = [];
  for (let k = -1; k <= 2; k++) {
    const date = ajouterJours(p.date, k);
    const j = jourDeDate(date);
    if (ev === "cs") { if (j === 3 || j === 0) out.push(seanceCS(date, j === 3 ? "mer" : "dim")); }
    else for (const c of gs?.creneaux ?? []) if (c.jour === JOURS[j]) out.push(seanceGS(date, c));
  }
  return out;
}

export type RappelDu = { evenement: Evenement; rappel: RappelDef; seance: SeanceParis; prevu: number; retard: number };

/**
 * CE QUI EST DÛ À CETTE MINUTE (§8.5) : chaque rappel en service, pour chaque séance proche,
 * dont l'heure est passée depuis 0 à 10 minutes (`dus`) — et ceux qui viennent de sortir de la
 * fenêtre (`manques`, pour le journal du bot). Un rappel qui tomberait avant l'ouverture de la
 * préparation de sa séance ne part pas : les annonces n'y sont pas encore ouvertes.
 *
 * Le marqueur d'envoi (`reclamer`) fait le reste : dû dix minutes de suite, il ne part qu'une fois.
 */
export function rappelsDus(ev: Evenement, params: ParametresCS | ParametresGS, now: Date): { dus: RappelDu[]; manques: RappelDu[] } {
  const dus: RappelDu[] = [], manques: RappelDu[] = [];
  const enService = rappelsEnService(ev, params);
  if (!enService.length) return { dus, manques };
  const creneaux = ev === "gs" ? (params as ParametresGS).creneaux : [];
  for (const s of seancesAutour(ev, now, { creneaux })) {
    for (const r of enService) {
      const t = instantRappel(r, s, creneaux.find((c) => c.id === s.creneau) ?? null);
      if (!t || t.getTime() < s.ouverture.getTime() || t.getTime() > s.debut.getTime()) continue;
      const retard = Math.floor((now.getTime() - t.getTime()) / 60_000);
      const du = { evenement: ev, rappel: r, seance: s, prevu: t.getTime(), retard };
      if (retard >= 0 && retard <= FENETRE_RATTRAPAGE_MIN) dus.push(du);
      else if (retard === FENETRE_RATTRAPAGE_MIN + 1) manques.push(du);
    }
  }
  return { dus, manques };
}

/** Le plan d'une minute : l'interrupteur général de chaque événement (`cs_rappels_actifs`,
 *  `gs_rappels_actifs`, les Setting de /discord) passe avant tout le reste — coupé, rien ne part,
 *  quoi que règle le paramétrage. Les Chambres d'abord : leur @everyone a la priorité. */
export function planDuTick(o: { actifs: { cs: boolean; gs: boolean }; cs: ParametresCS; gs: ParametresGS; now: Date }): { dus: RappelDu[]; manques: RappelDu[] } {
  const a = o.actifs.cs ? rappelsDus("cs", o.cs, o.now) : { dus: [], manques: [] };
  const b = o.actifs.gs ? rappelsDus("gs", o.gs, o.now) : { dus: [], manques: [] };
  return { dus: [...a.dus, ...b.dus], manques: [...a.manques, ...b.manques] };
}

/** La condition d'un rappel : « s'il manque une classe » (13 h 30, 18 h 30), « s'il y a des
 *  participants » (récap). Au complet, le rappel de 13 h 30 ne dit rien. */
export function conditionRemplie(r: Pick<RappelDef, "condition">, etat: { manque: string | null; participants: number }): boolean {
  if (r.condition === "si_manque") return !!etat.manque;
  if (r.condition === "si_participants") return etat.participants > 0;
  return true;
}

/** Pourquoi AUCUN rappel ne part pour cette séance, quoi que dise l'horaire : annulée (le jeu
 *  indisponible ce soir-là), ou déjà clôturée. Lu sous le verrou de la séance, au moment de
 *  réclamer le rappel — un clic « Annuler » d'une seconde plus tôt gagne. */
export function refusEnvoi(s: { annulee: boolean; clotureAt: Date | string | null }): "annulee" | "cloturee" | null {
  if (s.annulee) return "annulee";
  if (s.clotureAt) return "cloturee";
  return null;
}

/**
 * M8 — L'ANNONCE D'UNE ANNULATION PART-ELLE ? (§8.3, §8.10) Seulement si la séance l'est encore
 * (rétablie entre la demande et son traitement : rien), si le paramétrage l'annonce, après la
 * bascule (avant, notre bot ne dit que ses deux rappels de 20 h), sous l'interrupteur général,
 * et pour une séance qui n'est pas passée. @everyone le jour même seulement.
 */
export function annonceAnnulation(o: {
  annulee: boolean; annoncerAnnulation: boolean; nouveauxMessages: boolean; rappelsActifs: boolean; seance: Pick<SeanceParis, "date" | "debut">; now: Date;
}): { envoyer: true; jourMeme: boolean } | { envoyer: false; raison: string } {
  if (!o.annulee) return { envoyer: false, raison: "séance rétablie entre-temps : aucun message" };
  if (!o.annoncerAnnulation) return { envoyer: false, raison: "annonce coupée dans le paramétrage : panneau fermé, aucun message" };
  if (!o.nouveauxMessages) return { envoyer: false, raison: "bascule coupée : panneau fermé, aucun message" };
  if (!o.rappelsActifs) return { envoyer: false, raison: "rappels des Chambres coupés : aucun message" };
  if (o.now.getTime() - o.seance.debut.getTime() > SIX_HEURES) return { envoyer: false, raison: "séance passée : aucun message" };
  return { envoyer: true, jourMeme: partiesParis(o.now).date === o.seance.date };
}

/** Le panneau d'une séance peut-il être (re)publié ? Celle qu'on prépare, ou celle qui se joue
 *  (commencée depuis moins de 6 h) — jamais une séance passée (une demande restée en file
 *  pendant que le bot était arrêté), ni une séance lointaine dont personne ne pourrait
 *  cliquer « Je viens » : le bouton ne vaut que pour la séance qu'on prépare. */
export function panneauPublie(s: Pick<SeanceParis, "cle" | "debut">, now: Date): string | null {
  return publicationPermise(s, now, "panneau");
}

/** Les messages vivants qu'une séance publie dans le salon des Chambres (lots 3, 4 et 5). */
export type MessageVivant = "panneau" | "recap" | "repartition" | "chrono";
const NOM_VIVANT: Record<MessageVivant, [string, string]> = {
  panneau: ["son panneau est fermé", "Seul le panneau de la prochaine séance (ou de celle qui se joue) se publie : « Je viens » ne vaut que pour elle."],
  recap: ["son récap est fermé", "Seul le récap de la prochaine séance (ou de celle qui se joue) se publie."],
  repartition: ["sa répartition est fermée", "Seule la répartition de la prochaine séance (ou de celle qui se joue) se publie : ses boutons ne valent que pour elle."],
  chrono: ["son chrono est fermé", "Seul le chrono de la séance qui se joue (ou de la prochaine) se publie : ses boutons ne valent que pour elle."],
};

/** La même règle pour le récap et la répartition (lot 4) : la séance qu'on prépare, ou celle
 *  qui se joue. Leurs boutons (📍, salles, jumeaux) ne valent que pour elle. */
export function publicationPermise(s: Pick<SeanceParis, "cle" | "debut">, now: Date, quoi: MessageVivant): string | null {
  if (now.getTime() - s.debut.getTime() > SIX_HEURES) return `Cette séance est passée : ${NOM_VIVANT[quoi][0]}.`;
  if (s.cle !== prochaineSeanceParis(now).cle && s.cle !== seanceCouranteParis(now).cle) return NOM_VIVANT[quoi][1];
  return null;
}

/** La séance que vise un bouton de répartition ou de 📍 Mes positions : celle qui se joue, ou
 *  celle qu'on prépare — jamais une passée (un vieux message resté dans le salon). */
export function seanceDuBouton(cle: string, now: Date): SeanceParis | null {
  const c = seanceCouranteParis(now), p = prochaineSeanceParis(now);
  return cle === c.cle ? c : cle === p.cle ? p : null;
}

/* ── Les marqueurs d'envoi (`SeanceGuilde.rappels`) ──
   Un rappel est RÉCLAMÉ avant d'être envoyé : le marqueur s'écrit sous le verrou de version de
   la séance (`majSeance`), à condition que la clé soit absente. Deux bots lancés par erreur, ou
   un redémarrage dans la minute, n'envoient donc qu'un message. Un envoi raté LIBÈRE le
   marqueur : le tick suivant réessaie, tant que la fenêtre de 10 minutes court.
   Le marqueur garde aussi le salon et s'il portait un @everyone : c'est ce que lit la règle
   « un seul @everyone par salon et par demi-heure ». */

export type Marqueur = { t: number; etat: "envoi" | "fait"; canal: string | null; everyone: boolean };

export function lireMarqueurs(json: unknown): Record<string, Marqueur> {
  const out: Record<string, Marqueur> = {};
  for (const [k, v] of Object.entries(obj(json))) {
    // La forme courte de la spec (`{ veille: ms }`) reste lisible : un envoi fait, sans salon connu.
    if (typeof v === "number" && Number.isFinite(v)) { out[k] = { t: v, etat: "fait", canal: null, everyone: false }; continue; }
    const o = obj(v);
    if (typeof o.t !== "number" || !Number.isFinite(o.t)) continue;
    out[k] = { t: o.t, etat: o.etat === "envoi" ? "envoi" : "fait", canal: typeof o.canal === "string" ? o.canal : null, everyone: o.everyone === true };
  }
  return out;
}

/** Le marqueur posé, ou null : déjà réclamé (par un autre tick, un autre bot, ou déjà envoyé). */
export function reclamer(json: unknown, id: string, m: Marqueur): Record<string, Marqueur> | null {
  const l = lireMarqueurs(json);
  if (l[id]) return null;
  return { ...l, [id]: m };
}
export function liberer(json: unknown, id: string): Record<string, Marqueur> {
  const l = lireMarqueurs(json);
  delete l[id];
  return l;
}
export function marquerFait(json: unknown, id: string): Record<string, Marqueur> {
  const l = lireMarqueurs(json);
  if (l[id]) l[id] = { ...l[id], etat: "fait" };
  return l;
}

/** Un @everyone est-il parti (ou en train de partir) dans ce salon depuis moins de 30 min ?
 *  Les marqueurs de TOUTES les séances proches comptent : un Guild Siege le samedi à 21 h a son
 *  rappel de 20 h à la minute du panneau de la veille du dimanche (§8.5). */
export function everyoneRecent(listes: unknown[], canal: string, now: number): boolean {
  return listes.some((json) => Object.values(lireMarqueurs(json)).some((m) => m.everyone && m.canal === canal && now - m.t >= 0 && now - m.t < ECART_EVERYONE_MS));
}

export type MentionCalculee = { everyone: boolean; users: string[] };

/**
 * À qui parle un rappel. `everyone_participants` (le rappel de 20 h, contre-examen n° 2) :
 * @everyone et les participants — un seul message, une seule notification chacun ; mais
 * @everyone SEUL tant que la bascule est coupée, puisque le bot Python mentionne encore les
 * inscrits de son côté (§8.3, M3). Un @everyone parti dans ce salon depuis moins de 30 min
 * (`bloque`) : le rappel part sans mention du tout (§8.5). 100 comptes au plus : la limite de
 * `allowedMentions.users` de Discord.
 */
export function mentionsDuRappel(
  mention: RappelDef["mention"], o: { nouveauxMessages: boolean; comptes: string[]; bloque: boolean },
): MentionCalculee {
  if (o.bloque || mention === "aucune") return { everyone: false, users: [] };
  const m = mention === "everyone_participants" && !o.nouveauxMessages ? "everyone" : mention;
  const users = m === "participants" || m === "everyone_participants" ? [...new Set(o.comptes.filter((x) => /^\d{17,20}$/.test(x)))].slice(0, 100) : [];
  return { everyone: m === "everyone" || m === "everyone_participants", users };
}

/** « dans 1 h », « dans 30 min », « dans 1 h 30 » — le titre du rappel du jour J suit son heure. */
export function delaiDit(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `dans ${h} h ${deux(r)}` : `dans ${h} h`;
}

/* ── S'annoncer depuis Discord (§4.12) ──
   Le geste du panneau : « ✅ Je viens », « ❌ Pas cette fois », le choix du perso puis du poste.
   Ces fonctions modifient un CompoState (celui que `modifierCompo` relit sous verrou) et ne
   touchent à rien d'autre : la page et le bot écrivent ainsi la même chose, de la même façon. */

/** Pourquoi un compte Discord ne peut pas faire ce geste : le serveur compte aussi des
 *  visiteurs, des candidats et des amis (§2.6, piège n° 22). Le rôle Discord ne prouve rien :
 *  on relit le compte EN BASE, par `discordId`. */
export type RefusMembre = "compte_non_lie" | "reserve_membres" | "compte_cache" | null;
export function refusMembre(u: { role: string; isActive: boolean; cacheLe?: Date | string | null } | null): RefusMembre {
  if (!u) return "compte_non_lie";
  if (!GUILD_ROLES.includes(u.role as (typeof GUILD_ROLES)[number]) || !u.isActive) return "reserve_membres";
  // Un membre caché par un bras droit n'apparaît jamais parmi les joueurs d'une séance : son
  // annonce serait invisible partout, sans qu'il le sache.
  if (u.cacheLe) return "compte_cache";
  return null;
}

/** Les persos qui peuvent jouer une Chambre : ceux d'une classe qui a un poste (paramétrage
 *  compris), dans l'ordre du modèle — un perso déjà inscrit sur un poste, puis le principal,
 *  puis le nom. */
export function persosJouables<T extends { name: string; class: string; isMain?: boolean }>(persos: T[], postes: { classe: string }[], signups: Signup[]): T[] {
  const classes = new Set(postes.map((p) => sansAccent(p.classe)));
  const surPoste = new Set(signups.filter((s) => s.slotId).map((s) => s.pseudo.toLowerCase()));
  return persos
    .filter((c) => classes.has(sansAccent(classeAffichee(c.class))))
    .sort((a, b) => Number(surPoste.has(b.name.toLowerCase())) - Number(surPoste.has(a.name.toLowerCase()))
      || Number(!!b.isMain) - Number(!!a.isMain) || a.name.localeCompare(b.name, "fr"));
}

export type Compte = { id: string; username: string };

/**
 * « Je viens » avec ces persos-là (§4.12, `annoncer`). Les annonces de CETTE séance pour les
 * persos du compte sont retirées, puis celles choisies posées — l'annonce périmée d'un même perso
 * part aussi, comme sur la page (`basculerPresence`). Une annonce déjà là pour la séance est
 * GARDÉE telle quelle : son heure (l'ordre d'annonce départage les salles, §4.3) et son
 * « retenu » (un retenu le reste s'il est recoché).
 *
 * `player` est le `User.username` lu en base (contre-examen n° 1) : c'est ce que la page compare
 * pour dire « Je suis annoncé·e » (`jySuis`). `userId` ne dépend d'aucun nom (§5.3).
 */
export function annoncer(
  etat: CompoState, s: SeanceParis, choisis: { name: string; class: string }[], tousMesPersos: { name: string }[], compte: Compte, now: number,
): { nouveaux: string[]; gardes: string[]; retires: string[]; retenusRetires: string[] } {
  const miens = new Set(tousMesPersos.map((c) => c.name.toLowerCase()));
  const actuelles = new Map(annoncesDeLaSeance(etat, s).map((p) => [p.pseudo.toLowerCase(), p]));
  const voulus = new Set(choisis.map((c) => c.name.toLowerCase()));
  const partis = [...actuelles.values()].filter((p) => miens.has(p.pseudo.toLowerCase()) && !voulus.has(p.pseudo.toLowerCase()));
  const retires = partis.map((p) => p.pseudo);
  // Un perso RETENU décoché dans le menu laisse un trou que le staff doit voir venir : la
  // réponse le dit, comme pour « Pas cette fois ».
  const retenusRetires = partis.filter((p) => p.retenu).map((p) => p.pseudo);
  etat.presences = etat.presences.filter((p) => !(p.creneau === s.creneau && miens.has(p.pseudo.toLowerCase())));
  const nouveaux: string[] = [], gardes: string[] = [];
  for (const c of choisis) {
    const deja = actuelles.get(c.name.toLowerCase());
    if (deja) { etat.presences.push(deja); gardes.push(c.name); continue; }
    etat.presences.push({ player: compte.username, pseudo: c.name, classe: classeAffichee(c.class), creneau: s.creneau as Presence["creneau"], ts: now, retenu: false, userId: compte.id });
    nouveaux.push(c.name);
  }
  return { nouveaux, gardes, retires, retenusRetires };
}

/** « Pas cette fois » : toutes les annonces de la séance pour les persos du compte. Rend celles
 *  retirées — un retenu parmi elles, la réponse le dit (« préviens le staff »). */
export function retirerAnnonces(etat: CompoState, s: SeanceParis, tousMesPersos: { name: string }[]): Presence[] {
  const miens = new Set(tousMesPersos.map((c) => c.name.toLowerCase()));
  const retirees = annoncesDeLaSeance(etat, s).filter((p) => miens.has(p.pseudo.toLowerCase()));
  etat.presences = etat.presences.filter((p) => !(p.creneau === s.creneau && miens.has(p.pseudo.toLowerCase())));
  return retirees;
}

/**
 * Le poste choisi dans le menu Discord (§4.12) : la règle de `registerToSlot` — un perso n'est
 * que sur UN poste, son inscription ailleurs est retirée. La page la retire par `charId` ; le bot
 * par PSEUDO, sans casse, puisque `charId` est orphelin après chaque synchro (piège n° 1). On
 * renseigne quand même `charId` pour que la page reconnaisse le perso, `ts` pour le correctif
 * `lu` du PUT (contre-examen n° 7) et `userId`. Le même poste recoché ne change rien : il garde
 * son étoile de titulaire.
 */
export function inscrireAuPoste(
  etat: CompoState, perso: { id: string; name: string }, poste: { id: string; classe: string }, compte: Compte, now: number,
  nouvelId: () => string = () => Math.random().toString(36).slice(2, 12),
): "inscrit" | "deja" {
  const nom = perso.name.toLowerCase();
  if (etat.signups.some((x) => x.pseudo.toLowerCase() === nom && x.slotId === poste.id)) return "deja";
  etat.signups = etat.signups.filter((x) => x.pseudo.toLowerCase() !== nom);
  etat.signups.push({ id: nouvelId(), player: compte.username, pseudo: perso.name, classe: poste.classe, slotId: poste.id, charId: perso.id, selected: false, ts: now, userId: compte.id });
  return "inscrit";
}

/** Les postes qu'un perso peut tenir : ceux de sa classe (§4.12 ; `perso_peut` du modèle). */
export function postesDeLaClasse(postes: Poste[], classe: string): Poste[] {
  const k = sansAccent(classeAffichee(classe));
  return postes.filter((p) => sansAccent(p.classe) === k);
}

/** Le poste d'un pseudo : son inscription, titulaire d'abord. */
export function posteDuPseudo(signups: Signup[], pseudo: string): string | null {
  const k = pseudo.toLowerCase();
  return [...signups].sort((a, b) => Number(!!b.selected) - Number(!!a.selected)).find((x) => x.pseudo.toLowerCase() === k && x.slotId)?.slotId ?? null;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE GUILD SIEGE (§11 ; lot 9) — codé, réglable, et ÉTEINT tant que le staff ne l'allume pas
   (décision 2 de Maxime : « le PvP n'est pas encore installé »). Pas de postes ni de
   « retenu » : « Je viens » est LIBRE, un perso par compte et par séance, écrit dans
   `SeanceParticipant` (`annonceAt`, `present: null`) — c'est la clôture qui pose `present`.
   Les mêmes règles servent la route 12 du site et les boutons du panneau Discord : une annonce
   faite d'un côté se lit de l'autre, sur la même ligne.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Le chiffre d'un joueur du siège : son stuff DPS, à défaut Tank, à défaut Off tank (§11.2).
 *  Ce n'est pas « le meilleur » : des PV et des DPS ne se comparent pas. */
export const ROLES_GS: RoleMesure[] = ["dps", "tank", "offtank"];

/** Les rôles d'affichage d'un chiffre du siège : celui du chiffre trouvé, seul — l'arme d'un PV
 *  se dit alors toujours (« 9,4 M PV poing »), comme un repli sur un poste de la Chambre. */
export const rolesAffichageGS = (role: RoleMesure | null | undefined): RolesCS => ({ ...CS_DEFAUT, mesure: [role ?? "dps"], toutes: true });

/** Le créneau d'une séance du siège (son id « sam2100 »), tel que le paramétrage le règle. */
export const creneauDe = (s: Pick<SeanceParis, "creneau">, creneaux: CreneauGS[]) => creneaux.find((c) => c.id === s.creneau) ?? null;

/** Les `n` dernières séances du siège commencées, de la plus récente à la plus ancienne : le
 *  sélecteur de sa clôture. Neuf semaines en arrière au plus. */
export function seancesRecentesGS(now: Date, creneaux: CreneauGS[], n = 6): SeanceParis[] {
  const out: SeanceParis[] = [];
  const p = partiesParis(now);
  for (let k = 0; k <= 63 && out.length < n; k++) {
    const date = ajouterJours(p.date, -k);
    const jour = JOURS[jourDeDate(date)];
    const du = creneaux.filter((c) => c.jour === jour).map((c) => seanceGS(date, c))
      .filter((s) => s.debut.getTime() <= now.getTime()).sort((a, b) => b.debut.getTime() - a.debut.getTime());
    out.push(...du);
  }
  return out.slice(0, n);
}

/** Le panneau (ou le débrief) du siège peut-il être publié ? La séance qui vient, ou celle qui se
 *  joue — jamais une passée (une demande restée en file), ni une lointaine : « Je viens » ne vaut
 *  que pour la prochaine. */
export function publicationPermiseGS(s: Pick<SeanceParis, "cle" | "debut">, now: Date, creneaux: CreneauGS[]): string | null {
  if (now.getTime() - s.debut.getTime() > SIX_HEURES) return "Ce Guild Siege est passé : son panneau est fermé.";
  const p = prochaineSeanceGS(now, creneaux), c = seanceCouranteGS(now, creneaux);
  if (s.cle !== p?.cle && s.cle !== c?.cle) return "Seul le panneau du prochain Guild Siege (ou de celui qui se joue) se publie : « Je viens » ne vaut que pour lui.";
  return null;
}

/** Une annonce du siège, telle que la ligne `SeanceParticipant` la garde. */
export type AnnonceGS = { pseudo: string; classe: string; player: string; userId: string | null; annonceAt: number; present: boolean | null };

/**
 * Pourquoi on ne peut PAS s'annoncer (ni se désannoncer) pour cette séance du siège — null : on
 * peut. Le siège éteint d'abord (décision 2), puis un créneau retiré du paramétrage, une séance
 * clôturée (409, §6 route 12), annulée, commencée, ou lointaine : « Je viens » vaut pour celle
 * qu'on prépare, et pour celle dont la VEILLE est arrivée. Deux créneaux à la suite (samedi et
 * dimanche 21 h) : le panneau du dimanche part le samedi à 20 h, une heure avant que le siège du
 * samedi ne commence — ses boutons doivent répondre, pas renvoyer au samedi (contre-examen lot 9).
 * `annulee` : la réponse de Discord le dit avec 🚫, comme aux Chambres (§8.2).
 */
export function refusInscriptionGS(o: {
  actif: boolean; seance: Pick<SeanceParis, "cle" | "creneau" | "debut" | "date">; creneaux: CreneauGS[]; now: Date;
  annulee: boolean; cloturee: boolean;
}): { status: 404 | 409; message: string; annulee?: true } | null {
  if (!o.actif) return { status: 409, message: "Le Guild Siege n'est pas actif : le PvP n'est pas encore installé." };
  if (!creneauDe(o.seance, o.creneaux)) return { status: 404, message: "Ce créneau du Guild Siege n'existe plus : recharge la page." };
  if (o.cloturee) return { status: 409, message: "Ce Guild Siege est clôturé : l'inscription est fermée." };
  if (o.annulee) return { status: 409, message: "Ce Guild Siege est annulé.", annulee: true };
  if (o.seance.debut.getTime() <= o.now.getTime()) return { status: 409, message: "Ce Guild Siege a commencé : l'inscription est fermée." };
  const p = prochaineSeanceGS(o.now, o.creneaux);
  const veilleArrivee = partiesParis(o.now).date >= ajouterJours(o.seance.date, -1);
  if (p && p.cle !== o.seance.cle && !veilleArrivee) return { status: 409, message: `On s'annonce pour le prochain Guild Siege seulement (${p.label}).` };
  return null;
}

export type GesteGS =
  | {
    ok: true;
    /** « annonce » (nouveau), « change » (un autre perso du compte remplacé), « deja » (rien ne
     *  change), « retire » (Pas cette fois), « rien » (pas annoncé). */
    quoi: "annonce" | "change" | "deja" | "retire" | "rien";
    ajout: { pseudo: string; classe: string } | null;
    retires: string[];
    /** Phrase claire, sans Markdown : le site l'affiche telle quelle, le bot la met en forme. */
    message: string;
  }
  | { ok: false; status: 409; message: string };

/**
 * UN GESTE DU SIÈGE — « Je viens avec ce perso » ou « Pas cette fois », sur les annonces de la
 * séance relues sous son verrou. UN PERSO PAR COMPTE ET PAR SÉANCE (§11.2, à vérifier au lot 9) :
 * venir avec un autre perso REMPLACE le premier, plutôt que de l'ajouter. Le plafond (`places`,
 * À CONFIRMER) compte les comptes annoncés VISIBLES (`visible`) : un membre caché depuis son
 * annonce ne prend la place de personne. Changer de perso ne demande pas de place en plus.
 */
export function gesteGS(
  annonces: AnnonceGS[],
  o: { compte: Compte; perso: { name: string; class: string } | null; viens: boolean; places: number | null; label: string; visible?: (a: AnnonceGS) => boolean },
): GesteGS {
  const k = (s: string) => s.trim().toLowerCase();
  const miennes = annonces.filter((a) => a.userId === o.compte.id);
  const noms = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} et ${l.at(-1)}` : l[0] ?? "");
  if (!o.viens) {
    if (!miennes.length) return { ok: true, quoi: "rien", ajout: null, retires: [], message: `C'est noté : tu n'étais pas annoncé pour le Guild Siege du ${o.label}.` };
    const r = miennes.map((a) => a.pseudo);
    return { ok: true, quoi: "retire", ajout: null, retires: r, message: `C'est noté : ${noms(r)} ne vient pas au Guild Siege du ${o.label}. Merci d'avoir prévenu.` };
  }
  const p = o.perso;
  if (!p || !p.name.trim()) return { ok: false, status: 409, message: "Choisis le perso avec lequel tu viens." };
  const deja = miennes.find((a) => k(a.pseudo) === k(p.name));
  const autres = miennes.filter((a) => a !== deja);
  if (deja && !autres.length) return { ok: true, quoi: "deja", ajout: null, retires: [], message: `${deja.pseudo} est déjà annoncé pour le Guild Siege du ${o.label}.` };
  // Le même nom annoncé par un AUTRE compte (un homonyme : le nom est unique en jeu, pas en base).
  if (!deja && annonces.some((a) => a.userId !== o.compte.id && k(a.pseudo) === k(p.name))) {
    return { ok: false, status: 409, message: `Un autre compte a déjà annoncé un perso nommé ${p.name} : vois avec le staff.` };
  }
  if (!miennes.length && o.places !== null) {
    const visible = o.visible ?? (() => true);
    const comptes = new Set(annonces.filter(visible).map((a) => a.userId ?? `p:${a.player.toLowerCase()}`));
    if (comptes.size >= o.places) return { ok: false, status: 409, message: `Le Guild Siege est complet : ${o.places} place${o.places > 1 ? "s" : ""}, toutes prises.` };
  }
  const ajout = deja ? null : { pseudo: p.name, classe: classeAffichee(p.class) };
  const retires = autres.map((a) => a.pseudo);
  return autres.length
    ? { ok: true, quoi: "change", ajout, retires, message: `Tu viens au Guild Siege du ${o.label} avec ${deja?.pseudo ?? p.name} (à la place de ${noms(retires)}) : un perso par séance.` }
    : { ok: true, quoi: "annonce", ajout, retires, message: `${p.name} est annoncé pour le Guild Siege du ${o.label}.` };
}

/** La clôture du siège (§4.8) : parmi les ANNONCÉS, les cochés sont présents, les autres absents.
 *  Un nom qui n'est pas annoncé revient dans `inconnus` : la route refuse plutôt que d'écrire un
 *  présent que personne n'a annoncé. */
export function clotureGS(annonces: Pick<AnnonceGS, "pseudo">[], presents: string[]): { lignes: { pseudo: string; present: boolean }[]; inconnus: string[] } {
  const k = (s: string) => s.trim().toLowerCase();
  const coches = new Set(presents.map(k));
  const connus = new Set(annonces.map((a) => k(a.pseudo)));
  return {
    lignes: annonces.map((a) => ({ pseudo: a.pseudo, present: coches.has(k(a.pseudo)) })),
    inconnus: [...new Set(presents)].filter((n) => !connus.has(k(n))),
  };
}

/** Ce qui « manque » au siège, pour la condition « s'il manque du monde » d'un rappel : les
 *  places libres sous le plafond ; sans plafond, seulement quand personne ne s'est annoncé. */
export function manqueGS(annonces: number, places: number | null): string | null {
  if (places === null) return annonces ? null : "du monde";
  const reste = places - annonces;
  return reste > 0 ? `${reste} place${reste > 1 ? "s" : ""}` : null;
}

/** « 9 annoncés », « 9 / 20 annoncés » : l'effectif du siège, plafond compris. */
export const effectifGS = (n: number, places: number | null) => `${n}${places !== null ? ` / ${places}` : ""} annoncé${n > 1 ? "s" : ""}`;

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES LIENS DES VIDÉOS DE DÉBRIEF (§10.1 ; lot 8)
   Le staff seul joint des vidéos (décision 3 de Maxime) : un lien, ou un fichier court
   (lib/videos.ts). Un lien se NORMALISE ici, une fois, à l'enregistrement : la page relit la
   forme rangée en base pour choisir son lecteur, et Discord la montre telle quelle.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type SourceVideo = "youtube" | "twitch" | "medal" | "discord" | "autre";

/** Comment la page lit un lien : un lecteur intégré (YouTube, une vidéo ou un clip Twitch), ou
 *  un lien externe — Medal et Discord ne s'intègrent pas, et un lien inconnu non plus. */
export type LecteurLien =
  | { genre: "youtube"; id: string }
  | { genre: "twitch"; video: string }
  | { genre: "clip"; slug: string }
  | { genre: "externe" };

export type LienVideo =
  | { ok: true; source: SourceVideo; url: string; moment: number | null; lecteur: LecteurLien }
  | { ok: false; error: string };

export const LIEN_VIDEO_MAX = 500;
/** Le moment où sauter, en secondes : moins de 24 h. */
export const MOMENT_VIDEO_MAX = 86_399;

export const LIBELLE_SOURCE: Record<SourceVideo, string> = {
  youtube: "YouTube", twitch: "Twitch", medal: "Medal", discord: "Discord", autre: "lien externe",
};
export const OUVRIR_SOURCE: Record<SourceVideo, string> = {
  youtube: "Ouvrir sur YouTube", twitch: "Ouvrir sur Twitch", medal: "Ouvrir sur Medal", discord: "Ouvrir dans Discord", autre: "Ouvrir le lien",
};

/** Le paramètre `t=` (ou `start=`) d'un lien YouTube ou Twitch : « 95 », « 95s », « 1m35s »,
 *  « 1h2m3s », « 01h02m03s ». Illisible ou au-delà de 24 h : null (le lien reste bon). */
export function lireTempsDuLien(t: string | null | undefined): number | null {
  const v = (t ?? "").trim().toLowerCase();
  if (!v) return null;
  let s: number;
  if (/^\d{1,6}$/.test(v)) s = Number(v);
  else {
    const m = /^(?:(\d{1,3})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s)?$/.exec(v);
    if (!m || (!m[1] && !m[2] && !m[3])) return null;
    s = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  }
  return s <= MOMENT_VIDEO_MAX ? s : null;
}

const RE_ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;
const RE_SLUG_CLIP = /^[A-Za-z0-9_-]{3,100}$/;
const RE_SNOWFLAKE = /^\d{17,20}$/;
/** Les fichiers joints à un message Discord : des liens SIGNÉS (`ex=`, `is=`, `hm=`) qui
 *  expirent au bout d'un jour environ (piège n° 14). */
const HOTES_FICHIERS_DISCORD = new Set(["cdn.discordapp.com", "media.discordapp.net", "cdn.discord.com", "media.discord.com"]);
export const REFUS_FICHIER_DISCORD = "Les liens de fichiers Discord expirent au bout d'un jour environ : envoie plutôt le fichier ici.";

/**
 * LIT UN LIEN DE VIDÉO (§10.1) et le range sous sa forme NORMALISÉE :
 * - YouTube (`watch?v=`, `youtu.be/`, `shorts/`, `live/`, `embed/`) → `https://www.youtube.com/watch?v=ID` ;
 * - Twitch : une vidéo (`twitch.tv/videos/ID`) ou un clip (`clips.twitch.tv/SLUG`,
 *   `twitch.tv/<chaîne>/clip/SLUG`) ; un direct ne se rejoue pas : refusé ;
 * - Medal (un clip) et le lien d'un message Discord : des liens externes ;
 * - les fichiers Discord (liens signés qui expirent) : refusés ;
 * - tout autre lien `https://` : externe.
 * Le `t=` d'un lien YouTube ou Twitch donne le moment par défaut (`moment`). Sans schéma
 * (« youtu.be/… »), le lien est lu comme `https://`. Jamais d'exception : un refus dit pourquoi.
 */
export function lireLienVideo(brut: unknown): LienVideo {
  const texte = typeof brut === "string" ? brut.trim() : "";
  if (!texte) return { ok: false, error: "Colle le lien de la vidéo." };
  if (texte.length > LIEN_VIDEO_MAX) return { ok: false, error: `Ce lien est trop long (${LIEN_VIDEO_MAX} signes au plus).` };
  if (/\s/.test(texte)) return { ok: false, error: "Ce lien contient des espaces : colle-le d'un seul tenant." };
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(texte) ? texte : `https://${texte}`);
  } catch {
    return { ok: false, error: "Ce lien est illisible : colle l'adresse complète, qui commence par https://." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, error: "Colle un lien web, qui commence par https://." };
  if (u.username || u.password) return { ok: false, error: "Ce lien contient un identifiant de connexion : colle le lien public de la vidéo." };
  const brutHote = u.hostname.toLowerCase();
  if (HOTES_FICHIERS_DISCORD.has(brutHote)) return { ok: false, error: REFUS_FICHIER_DISCORD };
  const hote = brutHote.replace(/^(www|m|music|ptb|canary)\./, "");
  const segments = u.pathname.split("/").filter(Boolean);
  const temps = () => lireTempsDuLien(u.searchParams.get("t") ?? u.searchParams.get("start") ?? new URLSearchParams(u.hash.replace(/^#/, "")).get("t"));

  /* ── YouTube ── */
  if (hote === "youtube.com" || hote === "youtube-nocookie.com" || hote === "youtu.be") {
    let id: string | null = null;
    if (hote === "youtu.be") id = segments[0] ?? null;
    else if (segments[0] === "watch") id = u.searchParams.get("v");
    else if (["shorts", "live", "embed", "v"].includes(segments[0] ?? "")) id = segments[1] ?? null;
    else if (segments[0] === "clip" && RE_SLUG_CLIP.test(segments[1] ?? "")) {
      // Un clip YouTube ne s'intègre pas par son identifiant : il s'ouvre sur YouTube.
      return { ok: true, source: "youtube", url: `https://www.youtube.com/clip/${segments[1]}`, moment: null, lecteur: { genre: "externe" } };
    }
    if (!id || !RE_ID_YOUTUBE.test(id)) return { ok: false, error: "Ce lien YouTube ne mène pas à une vidéo : copie le lien de la vidéo (bouton Partager)." };
    return { ok: true, source: "youtube", url: `https://www.youtube.com/watch?v=${id}`, moment: temps(), lecteur: { genre: "youtube", id } };
  }

  /* ── Twitch ── */
  if (hote === "clips.twitch.tv") {
    const slug = segments[0] === "embed" ? u.searchParams.get("clip") : segments[0];
    if (!slug || !RE_SLUG_CLIP.test(slug)) return { ok: false, error: "Ce lien de clip Twitch est incomplet : copie le lien du clip (bouton Partager)." };
    return { ok: true, source: "twitch", url: `https://clips.twitch.tv/${slug}`, moment: null, lecteur: { genre: "clip", slug } };
  }
  if (hote === "twitch.tv") {
    if (segments[0] === "videos" && /^\d{1,15}$/.test(segments[1] ?? "")) {
      const video = segments[1]!;
      return { ok: true, source: "twitch", url: `https://www.twitch.tv/videos/${video}`, moment: temps(), lecteur: { genre: "twitch", video } };
    }
    if (segments[1] === "clip" && RE_SLUG_CLIP.test(segments[2] ?? "")) {
      const slug = segments[2]!;
      return { ok: true, source: "twitch", url: `https://clips.twitch.tv/${slug}`, moment: null, lecteur: { genre: "clip", slug } };
    }
    return { ok: false, error: "Ce lien Twitch ne mène ni à une vidéo ni à un clip (un direct ne se rejoue pas) : copie le lien de la rediffusion (twitch.tv/videos/…) ou d'un clip." };
  }

  /* ── Medal : un clip, en lien externe (À VÉRIFIER : un lecteur intégrable existe peut-être) ── */
  if (hote === "medal.tv") {
    if (!segments.includes("clips") || segments.indexOf("clips") === segments.length - 1) {
      return { ok: false, error: "Ce lien Medal ne mène pas à un clip : copie le lien du clip (bouton Partager)." };
    }
    // Les paramètres d'invitation et de suivi (`?invite=…`) ne servent pas à lire le clip.
    // Les segments sont déjà encodés par `URL` : on les recolle tels quels.
    return { ok: true, source: "medal", url: `https://medal.tv/${segments.join("/")}`, moment: null, lecteur: { genre: "externe" } };
  }

  /* ── Discord : le lien d'un MESSAGE du serveur (tous les membres y sont) ── */
  if (hote === "discord.com" || hote === "discordapp.com") {
    if (segments[0] === "channels" && segments[1] === "@me") {
      return { ok: false, error: "Ce message est dans une conversation privée : les autres ne pourront pas l'ouvrir. Envoie plutôt le fichier ici." };
    }
    if (segments[0] === "channels" && segments.length === 4 && segments.slice(1).every((x) => RE_SNOWFLAKE.test(x))) {
      return { ok: true, source: "discord", url: `https://discord.com/channels/${segments[1]}/${segments[2]}/${segments[3]}`, moment: null, lecteur: { genre: "externe" } };
    }
    return { ok: false, error: "Ce lien Discord ne mène pas à un message : clic droit sur le message, puis « Copier le lien du message »." };
  }

  /* ── Tout autre lien : https seulement, ouvert dans un nouvel onglet ── */
  if (u.protocol !== "https:") return { ok: false, error: "Ce lien n'est pas sécurisé (http://) : colle sa version https://." };
  u.hash = "";
  return { ok: true, source: "autre", url: u.toString(), moment: null, lecteur: { genre: "externe" } };
}
