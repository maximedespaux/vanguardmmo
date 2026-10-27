/**
 * LES RÈGLES DES CHAMBRES — la répartition des phases et le récap (SPEC-CHAMBRES-RECENSEMENT
 * §4.3, §4.4 sans « équilibrer », §4.6 ; lot 4), puis le chrono en direct (§4.9 ; lot 5).
 *
 * Module PUR, comme lib/evenements.ts et lib/compositions.ts : ni React, ni next/*, ni Prisma, ni
 * server-only. Le site (route 5, onglet Répartition) et le bot (récap de 20 h 40, 📍 Mes
 * positions, boutons des salles et des jumeaux — décision 1 de Maxime : « tout se fait aussi
 * dans Discord ») appellent les MÊMES fonctions sur la MÊME base : un geste fait d'un côté se lit
 * de l'autre, et aucun des deux ne réimplémente une règle.
 *
 * La répartition d'une séance vit dans `SeanceGuilde.repartition` :
 *   { salles: { s3: "kaelis" }, jumeaux: { kaelis: "rouge_mag" }, demandes: [] }
 * La clé d'un joueur est le pseudo de son PERSONNAGE en minuscules (on ne joue qu'un perso à la
 * fois, et le nom est unique en jeu) — jamais un compte ni un `charId`, qui change à chaque
 * synchro de l'AirBuilder (piège n° 1).
 *
 * Les rôles d'un joueur viennent de son POSTE, phase par phase (`roles`, slots.ts et le
 * paramétrage des bras droits) : p2 tanke les jumeaux puis frappe l'araignée. Le type de DPS
 * suit la CLASSE (`TYPE_DPS`), jamais le groupe du poste.
 *
 * Lot 6 : le débrief et son analyse (§4.1 pour les durées, §4.10), et la lecture d'un débrief
 * importé (le 18/10/2026, décision 11), en fin de fichier.
 *
 * Lot 10 : les ÉCHANGES entre joueurs (§4.5 — `options_echange`, `appliquer_echange`,
 * `decrire_echange` et `DemandeEchangeView`, bot.py:1183-1308) et « équilibrer » les jumeaux
 * (§4.4), dans la section des gestes. Une demande se fait et se répond sur le site ET dans
 * Discord (décision 1), par les mêmes fonctions.
 */
import {
  ETAPES_CS_DEFAUT, NOMS_CLASSES, RE_CODE_ETAPE, TYPE_DPS, dateLongue, dateValide, derouleDe, jourDeDate, lireDeroule, memeValeur, seanceCouranteParis,
  type Etape, type ParametresCS,
} from "@/lib/evenements";
import { chiffreCourt } from "@/lib/recensement";

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES JOUEURS ET LA RÉPARTITION
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Ce que les règles lisent d'un participant : sa classe, ses rôles par phase, et ses chiffres
 *  DÉCLARÉS (vides : sans mesure, ou masqués par le paramétrage) — pour les totaux d'équipe. */
export type JoueurCS = {
  pseudo: string;
  classe: string;
  roles: { jumeaux: "tank" | "dps"; golems: "tank" | "dps"; araignee: "tank" | "dps" };
  chiffres?: { role: "dps" | "offtank" | "tank"; valeur: number }[];
};

export type Equipe = "vert" | "rouge";
export type RoleJumeau = "tank" | "mag" | "phy";
export type Place = `${Equipe}_${RoleJumeau}`;

/** Les six places des jumeaux (`JUMEAUX`, bot.py:755-758) : chaque équipe a 1 tank et 4 DPS,
 *  magiques ou physiques confondus (`bot.py:759`). */
export const PLACES: Place[] = ["vert_tank", "vert_mag", "vert_phy", "rouge_tank", "rouge_mag", "rouge_phy"];
export const EQUIPES: Equipe[] = ["vert", "rouge"];
export const ROLES_JUMEAU: RoleJumeau[] = ["tank", "mag", "phy"];
export const DPS_PAR_EQUIPE = 4;

export const NOM_EQUIPE: Record<Equipe, string> = { vert: "Verte", rouge: "Rouge" };
export const ROLE_JUMEAU_LABEL: Record<RoleJumeau, string> = { tank: "Tank", mag: "DPS magique", phy: "DPS physique" };

export const equipeDe = (p: Place): Equipe => p.split("_")[0] as Equipe;
export const roleDe = (p: Place): RoleJumeau => p.split("_")[1] as RoleJumeau;
/** « Verte — DPS magique » (`ROLES_JUMEAU`, bot.py:753). */
export const libellePlace = (p: Place) => `${NOM_EQUIPE[equipeDe(p)]} — ${ROLE_JUMEAU_LABEL[roleDe(p)]}`;
export const estPlace = (v: unknown): v is Place => typeof v === "string" && (PLACES as string[]).includes(v);

export const cleJoueur = (pseudo: string) => String(pseudo ?? "").trim().toLowerCase();

/** Le type de DPS d'une classe : magique ou physique (§2.3). Une classe inconnue frappe en physique. */
export const typeDps = (classe: string): "mag" | "phy" => TYPE_DPS[classe] ?? "phy";

/** `peut_jouer` (bot.py:779-786), adapté : chez nous un participant n'a qu'un poste, et c'est
 *  son rôle chez les jumeaux qui décide. */
export const peutJouer = (j: Pick<JoueurCS, "classe" | "roles">, role: RoleJumeau) =>
  role === "tank" ? j.roles.jumeaux === "tank" : j.roles.jumeaux === "dps" && typeDps(j.classe) === role;

/** Les places qu'un joueur peut tenir (deux : une par équipe). */
export const placesPermises = (j: Pick<JoueurCS, "classe" | "roles">) => PLACES.filter((p) => peutJouer(j, roleDe(p)));

export type Salle = { cle: string; label: string };

/** Ce qu'on demande à un autre joueur (§4.5) : sa salle (`salle:s3`), ou sa place chez les jumeaux. */
export type QuoiEchange = `salle:${string}` | "jumeau";
export const estQuoiEchange = (v: unknown): v is QuoiEchange => v === "jumeau" || (typeof v === "string" && /^salle:[a-z0-9]{1,8}$/.test(v));

/**
 * UNE DEMANDE D'ÉCHANGE (§4.5 ; lot 10) : `de` demande à `a` sa salle — une REPRISE : il la prend,
 * l'autre la perd sans rien recevoir — ou sa place chez les jumeaux — un TROC (chacun prend la
 * place de l'autre), ou une reprise si `de` n'en avait pas. `de` et `a` sont des clés de joueur.
 *
 * Les places des deux joueurs AU MOMENT DE LA DEMANDE sont gardées (`placeA`, `placeDe`) : si
 * l'une a bougé avant l'acceptation, l'échange est refusé (« La place de jumeau a changé
 * entre-temps. », bot.py:1215-1218) — on n'accepte pas, sans le savoir, autre chose que ce qu'on
 * vous a demandé. Le modèle ne vérifiait que la compatibilité des rôles.
 *
 * `reponse` : la demande a reçu sa réponse. Elle reste une heure, le temps que le demandeur la
 * lise (bandeau, message privé), puis le nettoyage l'efface.
 */
export type DemandeEchange = {
  id: string;
  de: string;
  a: string;
  quoi: QuoiEchange;
  ts: number;
  placeA?: Place;
  placeDe?: Place | null;
  reponse?: { accepte: boolean; par: "cible" | "staff" | "demandeur"; ts: number; motif?: string };
};

/** Une demande sans réponse tombe au bout d'une heure (`timeout=3600`, bot.py:1243). */
export const DUREE_DEMANDE_MS = 3_600_000;
/** Les demandes EN ATTENTE d'un même joueur : au-delà, il attend les réponses (un clic par place
 *  prise ne doit pas devenir dix notifications). */
export const MAX_DEMANDES_PAR_JOUEUR = 3;

export type Repartition = {
  /** salle → clé du joueur qui la tient. Un joueur peut en tenir plusieurs (bot.py:849-850). */
  salles: Record<string, string>;
  /** clé du joueur → sa place chez les jumeaux. */
  jumeaux: Record<string, Place>;
  /** Les demandes d'échange entre joueurs (lot 10), en attente ou répondues depuis moins d'1 h. */
  demandes: DemandeEchange[];
};

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const instant = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

/** Une demande relue sans confiance ; null si elle est illisible (elle disparaît, sans casser). */
export function lireDemande(v: unknown): DemandeEchange | null {
  const o = obj(v);
  const id = typeof o.id === "string" && /^[a-z0-9-]{4,40}$/.test(o.id) ? o.id : null;
  const de = typeof o.de === "string" && o.de.trim() ? cleJoueur(o.de).slice(0, 80) : null;
  const a = typeof o.a === "string" && o.a.trim() ? cleJoueur(o.a).slice(0, 80) : null;
  const ts = instant(o.ts);
  if (!id || !de || !a || de === a || !estQuoiEchange(o.quoi) || ts === null) return null;
  const d: DemandeEchange = { id, de, a, quoi: o.quoi, ts };
  if (o.quoi === "jumeau") {
    if (!estPlace(o.placeA)) return null;
    d.placeA = o.placeA;
    d.placeDe = estPlace(o.placeDe) ? o.placeDe : null;
  }
  const r = obj(o.reponse);
  const rts = instant(r.ts);
  if (o.reponse !== undefined && typeof r.accepte === "boolean" && (r.par === "cible" || r.par === "staff" || r.par === "demandeur") && rts !== null) {
    d.reponse = { accepte: r.accepte, par: r.par, ts: rts, ...(typeof r.motif === "string" && r.motif ? { motif: r.motif.slice(0, 200) } : {}) };
  }
  return d;
}

/** `SeanceGuilde.repartition` (Json) → Repartition. Jamais d'exception : un blob abîmé donne
 *  une répartition vide, pas une page cassée. */
export function lireRepartition(json: unknown): Repartition {
  const o = obj(json);
  const salles: Record<string, string> = {};
  for (const [s, j] of Object.entries(obj(o.salles))) {
    if (/^[a-z0-9]{1,8}$/.test(s) && typeof j === "string" && j.trim()) salles[s] = cleJoueur(j).slice(0, 80);
  }
  const jumeaux: Record<string, Place> = {};
  for (const [j, p] of Object.entries(obj(o.jumeaux))) {
    if (j.trim() && estPlace(p)) jumeaux[cleJoueur(j).slice(0, 80)] = p;
  }
  const vus = new Set<string>();
  const demandes = (Array.isArray(o.demandes) ? o.demandes : []).slice(0, 80).map(lireDemande)
    .filter((d): d is DemandeEchange => !!d && !vus.has(d.id) && !!vus.add(d.id)).slice(0, 50);
  return { salles, jumeaux, demandes };
}

/** Une demande qui n'a pas encore sa réponse, et pas encore expiré. */
export const enAttente = (d: DemandeEchange, now: number) => !d.reponse && now - d.ts < DUREE_DEMANDE_MS;

/** La répartition vide, telle qu'on l'écrit. */
export const REPARTITION_VIDE: Repartition = { salles: {}, jumeaux: {}, demandes: [] };

/**
 * LE NETTOYAGE (`repart`, bot.py:767-776) : à chaque lecture, on retire toute clé qui n'est plus
 * un participant (un annoncé que le staff n'a pas retenu, un perso retiré), toute salle que le
 * paramétrage ne compte plus, et chez les jumeaux toute place que le joueur ne peut plus tenir
 * (son poste a changé). Rend une COPIE.
 *
 * Les demandes d'échange (lot 10) suivent : celle d'un joueur qui n'est plus là, ou d'une salle
 * qui n'existe plus, disparaît. Avec `now`, aussi celle qui a EXPIRÉ (1 h sans réponse), et celle
 * dont la réponse date de plus d'1 h — à chaque lecture, comme le modèle (`timeout=3600`).
 */
export function nettoyer(r: Repartition, joueurs: Pick<JoueurCS, "pseudo" | "classe" | "roles">[], salles: Pick<Salle, "cle">[], now?: number): Repartition {
  const par = new Map(joueurs.map((j) => [cleJoueur(j.pseudo), j]));
  const cles = new Set(salles.map((s) => s.cle));
  const vivante = (d: DemandeEchange) => now === undefined || (d.reponse ? now - d.reponse.ts < DUREE_DEMANDE_MS : now - d.ts < DUREE_DEMANDE_MS);
  return {
    salles: Object.fromEntries(Object.entries(r.salles).filter(([s, j]) => cles.has(s) && par.has(j))),
    jumeaux: Object.fromEntries(Object.entries(r.jumeaux).filter(([j, p]) => par.has(j) && peutJouer(par.get(j)!, roleDe(p)))) as Record<string, Place>,
    demandes: r.demandes
      .filter((d) => par.has(d.de) && par.has(d.a) && (d.quoi === "jumeau" || cles.has(d.quoi.slice(6))) && vivante(d))
      .map((d) => ({ ...d, ...(d.reponse ? { reponse: { ...d.reponse } } : {}) })),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES GESTES — chacun MODIFIE la répartition qu'on lui donne (déjà nettoyée), et rend ce que
   la réponse dira, ou un refus. Le texte est le même sur le site et dans Discord : sans
   Markdown, à la deuxième personne quand on parle à l'auteur du geste.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type Resultat = { ok: true; message: string } | { ok: false; status: 400 | 403 | 409; message: string };
const ok = (message: string): Resultat => ({ ok: true, message });
const refus = (message: string, status: 400 | 403 | 409 = 409): Resultat => ({ ok: false, status, message });

export type Contexte = { joueurs: JoueurCS[]; salles: Salle[] };

const joueurDe = (ctx: Contexte, k: string) => ctx.joueurs.find((j) => cleJoueur(j.pseudo) === k);
const nomDe = (ctx: Contexte, k: string) => joueurDe(ctx, k)?.pseudo ?? k;
const labelDe = (ctx: Contexte, s: string) => ctx.salles.find((x) => x.cle === s)?.label ?? s;

/* ── Phase 1 : les salles des Asuras (§4.3) ── */

/**
 * Prendre ou libérer une salle (`basculer_chambre`, bot.py:789-803). On ne vole pas une salle
 * prise : on demande un échange (lot 10) ou on passe par le staff. Le staff, lui (`parStaff`),
 * écrase l'occupant. Un second clic de l'occupant la libère.
 */
export function basculerSalle(r: Repartition, ctx: Contexte, salle: string, cible: string, parStaff: boolean): Resultat {
  if (!ctx.salles.some((s) => s.cle === salle)) return refus("Cette salle n'existe plus : recharge la page.", 400);
  if (!joueurDe(ctx, cible)) return refus("Seuls les participants de la séance prennent une place.");
  const label = labelDe(ctx, salle);
  const occupant = r.salles[salle];
  if (occupant === cible) {
    if (parStaff) return ok(`${label} est déjà à ${nomDe(ctx, cible)}.`);
    delete r.salles[salle];
    return ok(`Tu libères ${label}.`);
  }
  if (occupant && !parStaff) return refus(`${label} est déjà prise par ${nomDe(ctx, occupant)}.`);
  r.salles[salle] = cible;
  return ok(parStaff ? `${label} → ${nomDe(ctx, cible)}.` : `Tu prends ${label}.`);
}

/** Libérer une salle : son occupant, ou le staff (bot.py:998-1000). */
export function libererSalle(r: Repartition, ctx: Contexte, salle: string, o: { staff: boolean; miens: string[] }): Resultat {
  if (!ctx.salles.some((s) => s.cle === salle)) return refus("Cette salle n'existe plus : recharge la page.", 400);
  const label = labelDe(ctx, salle);
  const occupant = r.salles[salle];
  if (!occupant) return refus(`${label} est déjà libre.`);
  if (!o.staff && !o.miens.includes(occupant)) return refus(`Seul son occupant, ou le staff, libère ${label}.`, 403);
  delete r.salles[salle];
  return ok(`${label} libérée.`);
}

/**
 * COMPLÉTER AUTOMATIQUEMENT (`remplir_auto`, bot.py:806-818) : chaque salle vide, dans l'ordre
 * des salles, va au participant qui en tient le moins ; à égalité, le premier dans l'ordre
 * d'ANNONCE (l'ordre des participants), qui remplace l'ordre d'inscription du modèle.
 */
export function remplirAuto(r: Repartition, ctx: Contexte): number {
  const js = ctx.joueurs.map((j) => cleJoueur(j.pseudo));
  if (!js.length) return 0;
  const charge: Record<string, number> = Object.fromEntries(js.map((j) => [j, Object.values(r.salles).filter((x) => x === j).length]));
  const vides = ctx.salles.filter((s) => !r.salles[s.cle]);
  for (const s of vides) {
    const j = js.reduce((m, x) => (charge[x] < charge[m] ? x : m)); // égalité : le premier
    r.salles[s.cle] = j;
    charge[j]++;
  }
  return vides.length;
}

/**
 * MES SALLES, D'UN COUP — le menu « 🌳 Tes salles » de 📍 Mes positions (le `PositionsView` du
 * modèle, bot.py:1146-1180) : les salles cochées sont prises si elles sont libres, celles
 * décochées sont rendues. Une salle prise par un autre entre-temps n'est pas volée, et la
 * réponse le dit.
 */
export function mesSalles(r: Repartition, ctx: Contexte, k: string, voulues: string[]): Resultat {
  const valides = [...new Set(voulues)].filter((s) => ctx.salles.some((x) => x.cle === s));
  for (const [s, j] of Object.entries(r.salles)) if (j === k && !valides.includes(s)) delete r.salles[s];
  const prises: string[] = [], volees: string[] = [];
  for (const s of ctx.salles.map((x) => x.cle).filter((x) => valides.includes(x))) {
    const occ = r.salles[s];
    if (!occ || occ === k) { r.salles[s] = k; prises.push(s); } else volees.push(s);
  }
  const tete = prises.length
    ? `Tes salles : ${regrouperSalles(prises.map((s) => labelDe(ctx, s)))}.`
    : "Tu ne tiens plus aucune salle.";
  const notes = volees.map((s) => `${labelDe(ctx, s)} vient d'être prise par ${nomDe(ctx, r.salles[s])}.`);
  return ok([tete, ...notes].join(" "));
}

/* ── Phase 2 : les équipes des Jumeaux (§4.4) ── */

/** Les autres membres d'une équipe, par rôle. */
function rolesDansEquipe(r: Repartition, equipe: Equipe, sauf: string): RoleJumeau[] {
  return Object.entries(r.jumeaux).filter(([k, p]) => k !== sauf && equipeDe(p) === equipe).map(([, p]) => roleDe(p));
}

/** Le plafond d'une équipe : 1 tank, 4 DPS. Null : la place est libre. */
function plafond(r: Repartition, place: Place, sauf: string): string | null {
  const eq = equipeDe(place), role = roleDe(place);
  const autres = rolesDansEquipe(r, eq, sauf);
  if (role === "tank" && autres.filter((x) => x === "tank").length >= 1) return `L'équipe ${NOM_EQUIPE[eq]} a déjà son tank.`;
  if (role !== "tank" && autres.filter((x) => x !== "tank").length >= DPS_PAR_EQUIPE) return `L'équipe ${NOM_EQUIPE[eq]} a déjà ses ${DPS_PAR_EQUIPE} DPS.`;
  return null;
}

/** Choisir son équipe (`choisir_jumeau`, bot.py:821-837). Un second clic sur sa place la quitte. */
export function choisirJumeau(r: Repartition, j: JoueurCS, place: Place): Resultat {
  const k = cleJoueur(j.pseudo);
  if (r.jumeaux[k] === place) { delete r.jumeaux[k]; return ok(`Tu quittes l'équipe ${libellePlace(place)}.`); }
  if (!peutJouer(j, roleDe(place))) return refus(`Le poste de ${j.pseudo} ne tient pas « ${ROLE_JUMEAU_LABEL[roleDe(place)]} » chez les jumeaux.`, 400);
  const plein = plafond(r, place, k);
  if (plein) return refus(plein);
  r.jumeaux[k] = place;
  return ok(`Tu es dans l'équipe ${libellePlace(place)}.`);
}

/**
 * LE PLACEMENT PAR LE STAFF (`placer_jumeau_staff`, bot.py:1026-1060) : une place, « retirer »,
 * ou « ech:<clé> » — échanger deux joueurs. Le refus d'un plafond propose l'échange.
 */
export function placerJumeauStaff(r: Repartition, ctx: Contexte, j: JoueurCS, action: Place | "retirer" | `ech:${string}`): Resultat {
  const k = cleJoueur(j.pseudo);
  const actuel = r.jumeaux[k];
  if (action === "retirer") {
    if (!actuel) return refus(`${j.pseudo} n'est dans aucune équipe.`);
    delete r.jumeaux[k];
    return ok(`${j.pseudo} sort de son équipe.`);
  }
  if (action.startsWith("ech:")) {
    const ka = cleJoueur(action.slice(4));
    const autre = joueurDe(ctx, ka);
    const sienne = r.jumeaux[ka];
    if (ka === k || !autre || !sienne) return refus("Échange impossible : l'autre joueur n'est pas placé.");
    if (!peutJouer(j, roleDe(sienne))) return refus(`Échange impossible : le poste de ${j.pseudo} ne tient pas « ${ROLE_JUMEAU_LABEL[roleDe(sienne)]} ».`, 400);
    if (actuel && !peutJouer(autre, roleDe(actuel))) return refus(`Échange impossible : le poste de ${autre.pseudo} ne tient pas « ${ROLE_JUMEAU_LABEL[roleDe(actuel)]} ».`, 400);
    r.jumeaux[k] = sienne;
    if (actuel) r.jumeaux[ka] = actuel; else delete r.jumeaux[ka];
    return ok(`${j.pseudo} et ${autre.pseudo} échangent leurs places.`);
  }
  const place = action as Place;
  if (!estPlace(place)) return refus("Place inconnue.", 400);
  if (actuel === place) return ok(`${j.pseudo} est déjà en ${libellePlace(place)}.`);
  if (!peutJouer(j, roleDe(place))) return refus(`Le poste de ${j.pseudo} ne tient pas « ${ROLE_JUMEAU_LABEL[roleDe(place)]} » chez les jumeaux.`, 400);
  const plein = plafond(r, place, k);
  if (plein) return refus(`${plein.replace(/\.$/, "")} : utilise plutôt « Échanger avec… ».`);
  r.jumeaux[k] = place;
  return ok(`${j.pseudo} → ${libellePlace(place)}.`);
}

/* ── Lot 10 : les échanges entre joueurs (§4.5) ──
   On ne vole pas la place d'un autre : on la lui DEMANDE, et lui seul (ou le staff) accepte. La
   demande se fait et se répond sur le site (bandeau de l'onglet Répartition) ET dans Discord
   (🔄 Échanges de 📍 Mes positions, message privé au joueur visé — décision 1 de Maxime) ; le
   joueur visé l'apprend aussi par une notification du site. */

/** Ce qu'un joueur peut demander, et à qui (`options_echange`, bot.py:1183-1202) :
 *  - toute salle tenue par un autre : une REPRISE — il la prend, l'autre la perd ;
 *  - toute place de jumeau tenue par un autre, si son poste tient ce rôle, si l'autre n'est pas
 *    dans SA propre équipe et, s'il a déjà une place, si l'autre peut tenir la sienne : un TROC
 *    (ou une reprise s'il n'en avait pas). */
export type OptionEchange = { quoi: QuoiEchange; avec: string; libelle: string; detail: string };

export function optionsEchange(r: Repartition, ctx: Contexte, k: string): OptionEchange[] {
  const j = joueurDe(ctx, k);
  if (!j) return [];
  const out: OptionEchange[] = [];
  for (const s of ctx.salles) {
    const occ = r.salles[s.cle];
    if (occ && occ !== k && joueurDe(ctx, occ)) out.push({ quoi: `salle:${s.cle}`, avec: occ, libelle: `${s.label} — ${nomDe(ctx, occ)}`, detail: "tu la reprends, il la perd" });
  }
  const mienne = r.jumeaux[k];
  for (const autre of ctx.joueurs.map((x) => cleJoueur(x.pseudo))) {
    const sienne = r.jumeaux[autre];
    if (!sienne || autre === k) continue;
    const ja = joueurDe(ctx, autre)!;
    if (!peutJouer(j, roleDe(sienne))) continue;
    if (mienne && (equipeDe(mienne) === equipeDe(sienne) || !peutJouer(ja, roleDe(mienne)))) continue;
    out.push({ quoi: "jumeau", avec: autre, libelle: `${libellePlace(sienne)} — ${ja.pseudo}`, detail: mienne ? `contre ta place ${libellePlace(mienne)}` : "tu prends sa place" });
  }
  return out.slice(0, 25);
}

/** L'article d'une salle : « ta Salle 3 », « ton Asura 11 (arbre) » ; un libellé du paramétrage
 *  qu'on ne sait pas accorder s'écrit « ta salle « Toit » ». */
function article(label: string, p: "ta" | "sa" | "la"): string {
  if (/^salle\b/i.test(label)) return `${p} ${label}`;
  if (/^asura\b/i.test(label)) return p === "la" ? `l'${label}` : `${p === "ta" ? "ton" : "son"} ${label}`;
  return `${p} salle « ${label} »`;
}

/**
 * La phrase d'une demande (`decrire_echange`, bot.py:1227-1236), selon qui la lit : le joueur
 * visé (« Kaelis voudrait reprendre ta Salle 3. »), le demandeur (« Tu demandes à Thorn… ») ou
 * un tiers, le staff (« Kaelis voudrait reprendre la Salle 3 de Thorn. »). Les places sont celles
 * de la demande : la phrase ne change pas si l'une bouge entre-temps. Sans Markdown : le site et
 * Discord écrivent la même.
 */
export function texteDemande(d: DemandeEchange, ctx: Contexte, pour: "cible" | "demandeur" | "tiers"): string {
  const de = nomDe(ctx, d.de), a = nomDe(ctx, d.a);
  if (d.quoi !== "jumeau") {
    const s = labelDe(ctx, d.quoi.slice(6));
    return pour === "cible" ? `${de} voudrait reprendre ${article(s, "ta")}.`
      : pour === "demandeur" ? `Tu demandes à ${a} de te laisser ${article(s, "sa")}.`
        : `${de} voudrait reprendre ${article(s, "la")} de ${a}.`;
  }
  const pa = d.placeA ? libellePlace(d.placeA) : "";
  const pd = d.placeDe ? libellePlace(d.placeDe) : null;
  if (pour === "cible") return `${de} voudrait ta place ${pa}${pd ? `, et te donne la sienne : ${pd}` : ""}.`;
  if (pour === "demandeur") return `Tu demandes à ${a} sa place ${pa}${pd ? `, contre la tienne : ${pd}` : ""}.`;
  return `${de} voudrait la place ${pa} de ${a}${pd ? `, et lui donne la sienne : ${pd}` : ""}.`;
}

/**
 * L'ÉCHANGE, REVÉRIFIÉ AU MOMENT D'ACCEPTER (`appliquer_echange`, bot.py:1205-1224) : null s'il
 * est fait, sinon pourquoi pas — le texte du modèle. En plus du modèle, les places doivent être
 * CELLES DE LA DEMANDE : un joueur passé de « DPS magique » à « DPS physique » entre-temps ne
 * troque pas, sans le savoir, une autre place que celle qu'on lui a demandée.
 */
export function appliquerEchange(r: Repartition, ctx: Contexte, d: DemandeEchange): string | null {
  const de = joueurDe(ctx, d.de), a = joueurDe(ctx, d.a);
  if (!de || !a) return "Un des deux joueurs n'est plus parmi les participants.";
  if (d.quoi !== "jumeau") {
    const s = d.quoi.slice(6);
    if (r.salles[s] !== d.a) return `${labelDe(ctx, s)} n'est plus à ${a.pseudo}.`;
    r.salles[s] = d.de;
    return null;
  }
  const pa = r.jumeaux[d.a], pd = r.jumeaux[d.de] ?? null;
  if (!pa || pa !== d.placeA || !peutJouer(de, roleDe(pa))) return "La place de jumeau a changé entre-temps.";
  if (pd !== (d.placeDe ?? null) || (pd && (equipeDe(pd) === equipeDe(pa) || !peutJouer(a, roleDe(pd))))) return "Les positions ont changé entre-temps.";
  r.jumeaux[d.de] = pa;
  if (pd) r.jumeaux[d.a] = pd; else delete r.jumeaux[d.a];
  return null;
}

/** Ce qu'un geste d'échange vient de faire : la demande telle qu'elle est écrite. Le site s'en
 *  sert pour la notification du joueur concerné, le bot pour son message privé. */
export type EchangeFait = { quoi: "demande" | "reponse"; demande: DemandeEchange };
/** `ecrire` : un refus qu'il faut ÉCRIRE quand même — une acceptation devenue impossible
 *  (« La place de jumeau a changé entre-temps. ») clôt la demande, comme chez le modèle. */
export type ResultatEchange = ({ ok: true; message: string } | { ok: false; status: 400 | 403 | 409; message: string; ecrire?: true }) & { echange?: EchangeFait };

/** Un identifiant court, lisible dans un bouton Discord (`cs:echr:<clé>:<id>:o`). */
function idDemande(de: string, quoi: string, a: string, now: number): string {
  let h = 2166136261;
  for (const c of `${de}|${quoi}|${a}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return `e${now.toString(36)}-${h.toString(36)}`;
}

/** DEMANDER une place (`demander_echange`, bot.py:1292-1308). Refusé si la place n'est plus à
 *  prendre (« rouvre la liste »), si la même demande attend déjà sa réponse, ou au-delà de
 *  `MAX_DEMANDES_PAR_JOUEUR` demandes en attente. */
export function demanderEchange(r: Repartition, ctx: Contexte, k: string, o: { quoi: QuoiEchange; avec: string; now: number }): ResultatEchange {
  const ka = cleJoueur(o.avec);
  const cible = joueurDe(ctx, ka);
  if (!cible) return refus(`${o.avec} n'est pas parmi les participants de la séance.`);
  if (ka === k) return refus("C'est déjà ta place.", 400);
  if (!optionsEchange(r, ctx, k).some((x) => x.quoi === o.quoi && x.avec === ka)) {
    return refus(o.quoi === "jumeau"
      ? `La place de ${cible.pseudo} chez les jumeaux a changé, ou ton poste ne la tient pas : rouvre la liste.`
      : `${labelDe(ctx, o.quoi.slice(6))} n'est plus à ${cible.pseudo} : rouvre la liste.`);
  }
  const miennes = r.demandes.filter((d) => d.de === k && enAttente(d, o.now));
  if (miennes.some((d) => d.a === ka && d.quoi === o.quoi)) return refus(`Tu as déjà fait cette demande à ${cible.pseudo} : elle attend sa réponse.`);
  if (miennes.length >= MAX_DEMANDES_PAR_JOUEUR) return refus(`Tu as déjà ${MAX_DEMANDES_PAR_JOUEUR} demandes en attente : attends leurs réponses, ou retires-en une.`);
  // 50 au plus en base : les réponses les plus anciennes partent d'abord, jamais une attente.
  for (let i = r.demandes.findIndex((x) => !!x.reponse); r.demandes.length >= 50 && i >= 0; i = r.demandes.findIndex((x) => !!x.reponse)) r.demandes.splice(i, 1);
  if (r.demandes.length >= 50) return refus("Trop de demandes attendent leur réponse pour cette séance : réessaie dans un moment.");
  const d: DemandeEchange = {
    id: idDemande(k, o.quoi, ka, o.now), de: k, a: ka, quoi: o.quoi, ts: o.now,
    ...(o.quoi === "jumeau" ? { placeA: r.jumeaux[ka], placeDe: r.jumeaux[k] ?? null } : {}),
  };
  r.demandes.push(d);
  return { ok: true, message: `Demande envoyée à ${cible.pseudo}. Sans réponse dans l'heure, elle tombe d'elle-même.`, echange: { quoi: "demande", demande: d } };
}

/**
 * RÉPONDRE à une demande (`DemandeEchangeView`, bot.py:1239-1289) : seul le joueur visé, ou le
 * staff, accepte ou refuse ; le demandeur peut la RETIRER (refuser la sienne). Accepter revérifie
 * tout (`appliquerEchange`) : devenue impossible, la demande se clôt avec sa raison. La réponse
 * reste écrite une heure, pour que le demandeur la lise.
 */
export function repondreEchange(r: Repartition, ctx: ContexteAction, id: string, accepter: boolean, now: number): ResultatEchange {
  const d = r.demandes.find((x) => x.id === id);
  if (!d) return refus("Cette demande n'existe plus : elle a expiré (1 h sans réponse), ou l'un des deux joueurs n'est plus de la séance.");
  if (d.reponse) return refus("Cette demande a déjà sa réponse.");
  if (!enAttente(d, now)) return refus("Cette demande a expiré : 1 h sans réponse.");
  const estCible = ctx.miens.includes(d.a), estDemandeur = ctx.miens.includes(d.de);
  if (!estCible && !estDemandeur && !ctx.staff) return refus("Cette demande ne t'est pas adressée.", 403);
  if (accepter && !estCible && !ctx.staff) return refus(`Seul ${nomDe(ctx, d.a)}, ou le staff, accepte cette demande.`, 403);
  const par = estCible ? "cible" : estDemandeur && !accepter ? "demandeur" : "staff";
  const de = nomDe(ctx, d.de), a = nomDe(ctx, d.a);
  if (!accepter) {
    d.reponse = { accepte: false, par, ts: now };
    const message = par === "demandeur" ? `Tu retires ta demande à ${a}.` : par === "cible" ? `Tu refuses la demande de ${de}.` : `Demande de ${de} à ${a} refusée.`;
    return { ok: true, message, echange: { quoi: "reponse", demande: d } };
  }
  const err = appliquerEchange(r, ctx, d);
  if (err) {
    d.reponse = { accepte: false, par, ts: now, motif: err };
    return { ok: false, status: 409, message: `Échange impossible : ${err}`, ecrire: true, echange: { quoi: "reponse", demande: d } };
  }
  d.reponse = { accepte: true, par, ts: now };
  return { ok: true, message: `Échange accepté : ${de} ⇄ ${a}.`, echange: { quoi: "reponse", demande: d } };
}

/* ── Lot 10 : équilibrer les jumeaux (§4.4 ; staff) ── */

/**
 * « ÉQUILIBRER LES JUMEAUX » — en plus du modèle. Kraavus et Kraavos doivent mourir à 4 s
 * d'écart au plus, sinon chacun régénère 50 % de ses PV : deux équipes de même force.
 * 1. Un tank par équipe : les deux qui ont le plus de PV DÉCLARÉS (à égalité, l'ordre
 *    d'annonce), le premier en Verte ; un troisième reste hors des équipes.
 * 2. Les DPS : ceux qui ont des dégâts déclarés, du plus fort au plus faible, puis ceux qui n'en
 *    ont pas, dans l'ordre d'annonce ; huit au plus (4 par équipe) — les derniers restent dehors.
 * 3. De tous les partages de ces DPS en deux équipes de même effectif (à un près, la Verte prend
 *    le joueur de plus), les DPS sans chiffre répartis à un près, on garde celui dont l'ÉCART de
 *    dégâts déclarés est le plus faible ; à égalité, celui qui sépare le mieux les classes (deux
 *    Arcanistes, un de chaque côté) ; puis le premier trouvé.
 * La spec décrivait un placement glouton (chaque DPS, du plus fort au plus faible, dans l'équipe
 * la plus faible) : avec le plafond de 4 DPS, il laisse un écart de 21 % sur la compo type quand
 * 15 % étaient possibles. Huit DPS ne font que 70 partages : on les essaie tous.
 * Le résultat REMPLACE les places existantes ; la page et Discord demandent confirmation avant.
 *
 * Le CALCUL lit toujours les dégâts déclarés : le site et Discord forment les mêmes équipes. Leur
 * AFFICHAGE suit le paramétrage (décision 10 : `degats.composition` sur le site, `degats.discord`
 * dans Discord) — `chiffres: false` tait les totaux et l'écart dans la réponse.
 */
export function equilibrerJumeaux(r: Repartition, ctx: Contexte, o: { chiffres?: boolean } = {}): Resultat {
  const k = (j: JoueurCS) => cleJoueur(j.pseudo);
  const rang = new Map(ctx.joueurs.map((j, i) => [k(j), i]));
  const ordre = (a: JoueurCS, b: JoueurCS) => rang.get(k(a))! - rang.get(k(b))!;
  const tanks = ctx.joueurs.filter((j) => j.roles.jumeaux === "tank").sort((a, b) => pvDe(b) - pvDe(a) || ordre(a, b));
  const dps = ctx.joueurs.filter((j) => j.roles.jumeaux === "dps");
  if (!tanks.length && !dps.length) return refus("Personne à placer chez les jumeaux : aucun participant.");
  const mesures = dps.filter((j) => dpsDe(j) > 0).sort((a, b) => dpsDe(b) - dpsDe(a) || ordre(a, b));
  const sans = dps.filter((j) => !(dpsDe(j) > 0));
  const tous = [...mesures, ...sans];
  const places = tous.slice(0, 2 * DPS_PAR_EQUIPE), dehors = tous.slice(2 * DPS_PAR_EQUIPE);

  const n = places.length;
  let meilleur = -1, cout: [number, number] = [Infinity, Infinity];
  for (let masque = 0; masque < 1 << n; masque++) {
    const dansVerte = (i: number) => ((masque >> i) & 1) === 1;
    const nv = places.filter((_, i) => dansVerte(i)).length;
    if (nv > DPS_PAR_EQUIPE || n - nv > DPS_PAR_EQUIPE || nv < n - nv || nv - (n - nv) > 1) continue;
    let sv = 0, sr = 0, uv = 0, ur = 0;
    const classes = new Map<string, number>();
    places.forEach((j, i) => {
      const v = dpsDe(j), vert = dansVerte(i);
      if (vert) { sv += v; if (!v) uv++; } else { sr += v; if (!v) ur++; }
      classes.set(j.classe, (classes.get(j.classe) ?? 0) + (vert ? 1 : -1));
    });
    if (Math.abs(uv - ur) > 1) continue;
    const c: [number, number] = [Math.abs(sv - sr), [...classes.values()].reduce((s, x) => s + Math.abs(x), 0)];
    if (c[0] < cout[0] || (c[0] === cout[0] && c[1] < cout[1])) { cout = c; meilleur = masque; }
  }

  r.jumeaux = {};
  if (tanks[0]) r.jumeaux[k(tanks[0])] = "vert_tank";
  if (tanks[1]) r.jumeaux[k(tanks[1])] = "rouge_tank";
  places.forEach((j, i) => { r.jumeaux[k(j)] = `${((meilleur >> i) & 1) === 1 ? "vert" : "rouge"}_${typeDps(j.classe)}`; });

  const eq = equipesJumeaux(r, ctx.joueurs);
  const e = ecartJumeaux(eq.vert.totalDps, eq.rouge.totalDps);
  const noms = (l: JoueurCS[]) => l.map((j) => j.pseudo).join(", ");
  const sansPlaces = places.filter((j) => !(dpsDe(j) > 0));
  const notes = [
    e === null
      ? (mesures.length ? "Équipes formées : une seule a des dégâts déclarés, l'écart ne se calcule pas." : "Équipes formées, sans aucun dégât déclaré : l'écart ne se calcule pas.")
      : o.chiffres === false
        ? "Équipes équilibrées d'après les dégâts déclarés (leur affichage est masqué par le paramétrage)."
        : `Équipes équilibrées : Verte ${chiffreCourt(eq.vert.totalDps)}/s, Rouge ${chiffreCourt(eq.rouge.totalDps)}/s de dégâts déclarés — écart ${e} %.`,
    sansPlaces.length && mesures.length
      ? `${noms(sansPlaces)} ${sansPlaces.length > 1 ? "n'ont pas de dégâts déclarés : ils comptent" : "n'a pas de dégâts déclarés : il compte"} pour 0, l'écart réel peut différer.` : "",
    dehors.length ? `${noms(dehors)} ${dehors.length > 1 ? "restent" : "reste"} hors des équipes : ${DPS_PAR_EQUIPE} DPS par équipe au plus.` : "",
    tanks.length > 2 ? `${noms(tanks.slice(2))} ${tanks.length > 3 ? "restent" : "reste"} hors des équipes : un tank par équipe.` : "",
    tanks.length === 1 ? "Il manque un tank : l'équipe Rouge n'en a pas." : !tanks.length ? "Il manque les deux tanks : aucun participant ne tanke les jumeaux." : "",
  ];
  return ok(notes.filter(Boolean).join(" "));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   UN GESTE, D'OÙ QU'IL VIENNE (route 5 du site, boutons et menus de Discord)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * `force` : le geste vient d'un menu de PLACEMENT du staff (« Placer… » sur une salle, la place
 * d'un joueur chez les jumeaux). Il écrase l'occupant et passe par la règle du staff même quand
 * le perso visé est le sien ; sans lui, un clic du staff sur SON perso reste un clic de joueur
 * (prendre, libérer, rejoindre).
 */
export type ActionRepartition =
  | { action: "salle"; salle: string; pseudo?: string; force?: boolean }
  | { action: "liberer"; salle: string }
  | { action: "auto" }
  | { action: "jumeau"; place: Place; pseudo?: string; force?: boolean }
  | { action: "jumeau_retirer"; pseudo?: string }
  | { action: "jumeau_echanger"; pseudo: string; avec: string }
  /** Ses salles d'un coup (le menu à choix multiple de 📍 Mes positions). */
  | { action: "salles"; salles: string[]; pseudo?: string }
  /** Lot 10 — le staff équilibre les deux équipes des jumeaux d'un clic (§4.4). */
  | { action: "equilibrer" }
  /** Lot 10 — demander sa place à un autre joueur (§4.5) : `pseudo` est le perso qui demande. */
  | { action: "demander"; quoi: QuoiEchange; avec: string; pseudo?: string }
  /** Lot 10 — accepter ou refuser une demande (le joueur visé, le staff), ou retirer la sienne. */
  | { action: "repondre"; demande: string; accepter: boolean };

const texteCourt = (v: unknown) => (typeof v === "string" && v.trim() && v.length <= 80 ? v.trim() : undefined);
const cleSalle = (v: unknown) => (typeof v === "string" && /^[a-z0-9]{1,8}$/.test(v) ? v : null);

/** Le corps de la route 5 (ou d'un clic Discord), relu sans confiance. */
export function lireAction(b: unknown): { ok: true; action: ActionRepartition } | { ok: false; status: 400; message: string } {
  const o = obj(b);
  const non = (message: string) => ({ ok: false as const, status: 400 as const, message });
  const a = o.action;
  const pseudo = texteCourt(o.pseudo);
  if (o.pseudo !== undefined && o.pseudo !== null && !pseudo) return non("Perso illisible.");
  switch (a) {
    case "salle": case "liberer": {
      const salle = cleSalle(o.salle);
      if (!salle) return non("Salle illisible.");
      return { ok: true, action: a === "salle" ? { action: "salle", salle, pseudo, ...(o.force === true ? { force: true } : {}) } : { action: "liberer", salle } };
    }
    case "auto": return { ok: true, action: { action: "auto" } };
    case "jumeau": return estPlace(o.place) ? { ok: true, action: { action: "jumeau", place: o.place, pseudo, ...(o.force === true ? { force: true } : {}) } } : non("Place illisible : vert_tank, rouge_mag…");
    case "jumeau_retirer": return { ok: true, action: { action: "jumeau_retirer", pseudo } };
    case "jumeau_echanger": {
      const avec = texteCourt(o.avec);
      return pseudo && avec ? { ok: true, action: { action: "jumeau_echanger", pseudo, avec } } : non("Échanger qui avec qui ?");
    }
    case "salles": {
      if (!Array.isArray(o.salles) || o.salles.length > 40) return non("Liste de salles illisible.");
      const salles = o.salles.map(cleSalle);
      if (salles.some((s) => !s)) return non("Liste de salles illisible.");
      return { ok: true, action: { action: "salles", salles: salles as string[], pseudo } };
    }
    case "equilibrer": return { ok: true, action: { action: "equilibrer" } };
    case "demander": {
      const avec = texteCourt(o.avec);
      if (!estQuoiEchange(o.quoi)) return non("Demande illisible : salle:s3 ou jumeau.");
      return avec ? { ok: true, action: { action: "demander", quoi: o.quoi, avec, pseudo } } : non("À qui demandes-tu sa place ?");
    }
    case "repondre": {
      const demande = typeof o.demande === "string" && /^[a-z0-9-]{4,40}$/.test(o.demande) ? o.demande : null;
      if (!demande || typeof o.accepter !== "boolean") return non("Réponse illisible : la demande, puis accepter (oui ou non).");
      return { ok: true, action: { action: "repondre", demande, accepter: o.accepter } };
    }
    default: return non("Geste inconnu.");
  }
}

export type ContexteAction = Contexte & {
  staff: boolean;
  /** Les clés des persos de l'appelant parmi les participants (Character.userId = l'appelant). */
  miens: string[];
  /** Ses persos ANNONCÉS mais pas retenus (le staff en a retenu d'autres) : ils n'ont pas de
   *  place, et le refus doit le dire — « annonce-toi d'abord » serait faux pour eux. */
  nonRetenus?: string[];
  /** L'heure du geste (ms) : la date d'une demande d'échange, et son expiration (lot 10). Le
   *  serveur la pose ; les vérifications l'injectent. */
  maintenant?: number;
  /** Lot 10 : la réponse d'un geste peut-elle DIRE des dégâts déclarés (« Équilibrer ») ? Le
   *  paramétrage en décide (`degats.composition` sur le site, `degats.discord` dans Discord). Les
   *  joueurs, eux, portent toujours leurs chiffres : le calcul est le même des deux côtés. */
  chiffresVisibles?: boolean;
};

/** Le joueur visé par un geste : `pseudo`, ou à défaut LE participant de l'appelant. */
function viser(ctx: ContexteAction, pseudo?: string): { ok: true; k: string; j: JoueurCS; autrui: boolean } | { ok: false; res: Resultat } {
  if (pseudo) {
    const k = cleJoueur(pseudo);
    const j = joueurDe(ctx, k);
    if (!j) return { ok: false, res: refus(`${pseudo} n'est pas parmi les participants de la séance.`) };
    return { ok: true, k, j, autrui: !ctx.miens.includes(k) };
  }
  if (!ctx.miens.length) {
    return { ok: false, res: refus(ctx.nonRetenus?.length
      ? "Le staff ne t'a pas retenu pour cette séance : tu n'as pas de place à prendre."
      : "Tu n'es pas parmi les participants de cette séance : annonce-toi d'abord (onglet Inscription).") };
  }
  if (ctx.miens.length > 1) return { ok: false, res: refus("Tu as plusieurs persos parmi les participants : précise lequel.", 400) };
  const k = ctx.miens[0];
  const j = joueurDe(ctx, k);
  return j ? { ok: true, k, j, autrui: false } : { ok: false, res: refus("Ton perso n'est plus parmi les participants.") };
}

const AUTRUI = "Tu ne places que ton propre perso : pour un autre, passe par le staff.";

/**
 * Applique un geste à une répartition DÉJÀ nettoyée (`nettoyer`), qu'il modifie. Qui peut quoi
 * (§6, `ActionRepartition`) : soi pour son perso ; le staff pour tout le monde ; « compléter »,
 * « échanger » et « équilibrer » au staff seul. Un perso qui n'est pas au compte appelant exige
 * le staff (403). Une DEMANDE d'échange ne se fait que pour son propre perso : le staff, lui,
 * place directement ; y RÉPONDRE est au joueur visé ou au staff (§4.5).
 */
export function appliquerAction(r: Repartition, a: ActionRepartition, ctx: ContexteAction): ResultatEchange {
  const now = ctx.maintenant ?? Date.now();
  switch (a.action) {
    case "equilibrer": {
      if (!ctx.staff) return refus("Équilibrer les jumeaux est un geste du staff.", 403);
      return equilibrerJumeaux(r, ctx, { chiffres: ctx.chiffresVisibles !== false });
    }
    case "demander": {
      const v = viser(ctx, a.pseudo);
      if (!v.ok) return v.res;
      if (v.autrui) return refus("Une demande d'échange se fait pour son propre perso : le staff, lui, place directement (« Placer… »).", 403);
      // Deux persos du même compte : personne d'autre ne répond, la demande resterait en
      // suspens une heure. On déplace son propre perso soi-même.
      if (cleJoueur(a.avec) !== v.k && ctx.miens.includes(cleJoueur(a.avec))) return refus(`${nomDe(ctx, cleJoueur(a.avec))} est aussi ton perso : déplace-le directement, sans demande.`, 400);
      return demanderEchange(r, ctx, v.k, { quoi: a.quoi, avec: a.avec, now });
    }
    case "repondre": return repondreEchange(r, ctx, a.demande, a.accepter, now);
    case "auto": {
      if (!ctx.staff) return refus("Compléter les salles est un geste du staff.", 403);
      if (!ctx.joueurs.length) return refus("Personne à placer : aucun participant.");
      const n = remplirAuto(r, ctx);
      return ok(n ? `${n} salle${n > 1 ? "s" : ""} vide${n > 1 ? "s" : ""} attribuée${n > 1 ? "s" : ""}.` : "Toutes les salles sont déjà prises.");
    }
    case "liberer": return libererSalle(r, ctx, a.salle, { staff: ctx.staff, miens: ctx.miens });
    case "salle": {
      const v = viser(ctx, a.pseudo);
      if (!v.ok) return v.res;
      if (v.autrui && !ctx.staff) return refus(AUTRUI, 403);
      if (a.force && !ctx.staff) return refus("Placer un joueur sur une salle prise est un geste du staff.", 403);
      return basculerSalle(r, ctx, a.salle, v.k, v.autrui || !!a.force);
    }
    case "salles": {
      const v = viser(ctx, a.pseudo);
      if (!v.ok) return v.res;
      if (v.autrui && !ctx.staff) return refus(AUTRUI, 403);
      return mesSalles(r, ctx, v.k, a.salles);
    }
    case "jumeau": {
      const v = viser(ctx, a.pseudo);
      if (!v.ok) return v.res;
      if (v.autrui && !ctx.staff) return refus(AUTRUI, 403);
      if (a.force && !ctx.staff) return refus("Le placement des jumeaux est un geste du staff.", 403);
      return v.autrui || a.force ? placerJumeauStaff(r, ctx, v.j, a.place) : choisirJumeau(r, v.j, a.place);
    }
    case "jumeau_retirer": {
      const v = viser(ctx, a.pseudo);
      if (!v.ok) return v.res;
      if (v.autrui && !ctx.staff) return refus(AUTRUI, 403);
      if (v.autrui) return placerJumeauStaff(r, ctx, v.j, "retirer");
      if (!r.jumeaux[v.k]) return refus("Tu n'es dans aucune équipe.");
      delete r.jumeaux[v.k];
      return ok("Tu quittes ton équipe des jumeaux.");
    }
    case "jumeau_echanger": {
      if (!ctx.staff) return refus("Échanger deux joueurs est un geste du staff.", 403);
      const v = viser(ctx, a.pseudo);
      if (!v.ok) return v.res;
      const w = viser(ctx, a.avec);
      if (!w.ok) return w.res;
      return placerJumeauStaff(r, ctx, v.j, `ech:${w.k}`);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   CE QUE L'ÉCRAN MONTRE (§4.4, `embed_phase2`, bot.py:872-908)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Le DPS déclaré d'un joueur ; les PV de son stuff qui tanke les boss (le sceptre d'abord). */
export const dpsDe = (j: Pick<JoueurCS, "chiffres">) => j.chiffres?.find((c) => c.role === "dps")?.valeur ?? 0;
export const pvDe = (j: Pick<JoueurCS, "chiffres">) =>
  (j.chiffres?.find((c) => c.role === "offtank") ?? j.chiffres?.find((c) => c.role === "tank"))?.valeur ?? 0;

export type EquipeJumeaux<T> = {
  tank: T[]; mag: T[]; phy: T[];
  /** La somme des DPS DÉCLARÉS ; les PV de son tank. 0 : rien de déclaré. */
  totalDps: number; pvTank: number;
  /** « 1 tank », « 2 DPS » (bot.py:893-899). */
  manque: string[];
};

/** Les deux équipes, membres groupés par rôle dans l'ordre des participants, et qui n'est pas
 *  encore placé. La répartition doit être nettoyée. */
export function equipesJumeaux<T extends JoueurCS>(r: Repartition, joueurs: T[]): { vert: EquipeJumeaux<T>; rouge: EquipeJumeaux<T>; nonPlaces: T[] } {
  const faire = (eq: Equipe): EquipeJumeaux<T> => {
    const de = (role: RoleJumeau) => joueurs.filter((j) => r.jumeaux[cleJoueur(j.pseudo)] === `${eq}_${role}`);
    const tank = de("tank"), mag = de("mag"), phy = de("phy");
    const dps = mag.length + phy.length;
    return {
      tank, mag, phy,
      totalDps: [...mag, ...phy].reduce((s, j) => s + dpsDe(j), 0),
      pvTank: tank.reduce((s, j) => s + pvDe(j), 0),
      manque: [...(tank.length < 1 ? ["1 tank"] : []), ...(dps < DPS_PAR_EQUIPE ? [`${DPS_PAR_EQUIPE - dps} DPS`] : [])],
    };
  };
  return { vert: faire("vert"), rouge: faire("rouge"), nonPlaces: joueurs.filter((j) => !r.jumeaux[cleJoueur(j.pseudo)]) };
}

/**
 * L'ÉCART DE DPS ENTRE LES DEUX ÉQUIPES, en % de la plus forte — en plus du modèle : Kraavus et
 * Kraavos doivent mourir à 4 s d'écart au plus, sinon chacun régénère 50 % de ses PV (wiki
 * officiel). Null tant qu'une des deux n'a aucun DPS déclaré : un écart de 100 % avec une équipe
 * vide ne dirait rien.
 */
export function ecartJumeaux(vert: number, rouge: number): number | null {
  if (!(vert > 0) || !(rouge > 0)) return null;
  return Math.round((Math.abs(vert - rouge) / Math.max(vert, rouge)) * 100);
}
/** Or au-delà de 10 %, crimson au-delà de 20 % : un point de départ à ajuster à l'usage, pas
 *  une règle du jeu (§4.4). */
export const niveauEcart = (e: number | null): "ok" | "moyen" | "fort" | null =>
  e === null ? null : e > 20 ? "fort" : e > 10 ? "moyen" : "ok";

/** La répartition telle que la route 4 la rend (`VueSeance.repartition`) : des PSEUDOS, jamais un
 *  compte. Les totaux suivent les chiffres qu'on lui donne (vides si le paramétrage les masque). */
export type VueEquipe = { tank: string[]; mag: string[]; phy: string[]; totalDps: number; pvTank: number; manque: string[] };

/** Une demande d'échange telle que le bandeau de l'onglet la montre (lot 10). `texte` est dit
 *  pour celui qui la lit (« ta Salle 3 », « Tu demandes… », « la Salle 3 de Thorn »). */
export type VueDemande = {
  id: string; de: string; a: string; quoi: QuoiEchange; texte: string;
  /** Elle vise l'un de mes persos (accepter, refuser) ; je l'ai faite (la retirer). */
  pourMoi: boolean; deMoi: boolean;
  /** Fin de l'attente (ms) : `ts` + 1 h. */
  expire: number;
  /** Encore faisable ? Sinon `raison` (« La place de jumeau a changé entre-temps. ») : on ne
   *  propose plus que de la refuser ou de la retirer. */
  valable: boolean; raison: string | null;
  /** Répondue (le demandeur la voit encore une heure) : acceptée, refusée, retirée, impossible. */
  reponse: { accepte: boolean; par: "cible" | "staff" | "demandeur"; motif: string | null } | null;
};
/** Ce que l'un de mes persos peut demander (lot 10) : le menu « Demander une place… ». */
export type VueEchanges = { pseudo: string; options: { quoi: QuoiEchange; avec: string; libelle: string; detail: string }[] };

export type VueRepartition = {
  salles: { cle: string; label: string; pseudo: string | null }[];
  couvertes: number;
  jumeaux: Record<Equipe, VueEquipe>;
  ecartJumeaux: number | null;
  nonPlaces: string[];
  /** Lot 10 : les demandes d'échange que l'appelant peut lire — les siennes (faites ou reçues),
   *  et pour le staff toutes celles qui attendent une réponse. */
  demandes: VueDemande[];
  /** Lot 10 : les places que ses persos peuvent demander. */
  echanges: VueEchanges[];
};

/**
 * `qui` (lot 10) : l'appelant — ses persos parmi les participants, s'il est du staff — et l'heure,
 * pour ne montrer que les demandes qui le regardent et qui n'ont pas expiré. Sans lui (le bot,
 * l'aperçu), aucune demande n'est montrée.
 */
export function vueRepartition(brut: Repartition, ctx: Contexte, qui?: { miens: string[]; staff: boolean; now: number }): VueRepartition {
  const r = nettoyer(brut, ctx.joueurs, ctx.salles, qui?.now);
  const eq = equipesJumeaux(r, ctx.joueurs);
  const noms = (l: JoueurCS[]) => l.map((j) => j.pseudo);
  const vue = (e: EquipeJumeaux<JoueurCS>): VueEquipe => ({ tank: noms(e.tank), mag: noms(e.mag), phy: noms(e.phy), totalDps: e.totalDps, pvTank: e.pvTank, manque: e.manque });
  const salles = ctx.salles.map((s) => ({ cle: s.cle, label: s.label, pseudo: r.salles[s.cle] ? nomDe(ctx, r.salles[s.cle]) : null }));
  const miens = qui?.miens ?? [];
  const demandes: VueDemande[] = !qui ? [] : r.demandes.flatMap((d) => {
    const pourMoi = miens.includes(d.a), deMoi = miens.includes(d.de);
    // Une réponse se lit par le demandeur, et par le joueur visé quand c'est le staff qui a
    // tranché pour lui (sa place a pu changer sans qu'il clique) — celui qui a répondu le sait
    // déjà. Le staff ne garde sous les yeux que ce qui attend encore quelqu'un.
    const lue = d.reponse ? deMoi || (pourMoi && d.reponse.par === "staff") : deMoi || pourMoi || qui.staff;
    if (!lue) return [];
    const essai = nettoyer(r, ctx.joueurs, ctx.salles);
    const raison = d.reponse ? null : appliquerEchange(essai, ctx, d);
    return [{
      id: d.id, de: nomDe(ctx, d.de), a: nomDe(ctx, d.a), quoi: d.quoi,
      texte: texteDemande(d, ctx, pourMoi ? "cible" : deMoi ? "demandeur" : "tiers"),
      pourMoi, deMoi, expire: d.ts + DUREE_DEMANDE_MS, valable: !raison, raison,
      reponse: d.reponse ? { accepte: d.reponse.accepte, par: d.reponse.par, motif: d.reponse.motif ?? null } : null,
    }];
  });
  return {
    salles, couvertes: salles.filter((s) => s.pseudo).length,
    jumeaux: { vert: vue(eq.vert), rouge: vue(eq.rouge) },
    ecartJumeaux: ecartJumeaux(eq.vert.totalDps, eq.rouge.totalDps),
    nonPlaces: noms(eq.nonPlaces),
    demandes,
    echanges: miens.flatMap((m) => {
      const j = joueurDe(ctx, m);
      // Jamais la place d'un autre de SES persos : elle se prend sans demande (appliquerAction).
      return j ? [{ pseudo: j.pseudo, options: optionsEchange(r, ctx, m).filter((o) => !miens.includes(o.avec)).map((o) => ({ ...o, avec: nomDe(ctx, o.avec) })) }] : [];
    }),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE RÉCAP : RÔLES, GOLEMS, ARAIGNÉE (§4.6, `message_recap`, bot.py:1648-1702)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Le rôle tenu ce soir dans les LISTES du récap (`role_final`, bot.py:1557-1563) : la place
 * chez les jumeaux si le joueur y est placé ; sinon tank si son poste tanke les jumeaux ; sinon
 * le type de DPS de sa classe.
 */
export function roleTenu(j: JoueurCS, r: Repartition): RoleJumeau {
  const p = r.jumeaux[cleJoueur(j.pseudo)];
  if (p) return roleDe(p);
  return j.roles.jumeaux === "tank" ? "tank" : typeDps(j.classe);
}

/** Un groupe qui garde l'ordre d'insertion (le `dict` du modèle). */
function grouper<T>(l: T[], cle: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of l) m.set(cle(x), [...(m.get(cle(x)) ?? []), x]);
  return m;
}

/**
 * LES DEUX ÉQUIPES DES GOLEMS — les deux Dra'Zhul (`equipes_golems`, bot.py:1582-1619). On garde
 * les équipes des jumeaux (Verte à gauche, Rouge à droite) si tout le monde y est placé et
 * qu'elles sont déjà équilibrées : même effectif à un près, chaque groupe (tank ?, classe)
 * partagé à un près, un tank au plus par côté. Sinon, groupe par groupe — les tanks d'abord,
 * puis les groupes les plus nombreux, à égalité dans l'ordre d'apparition —, chacun du côté le
 * moins fourni. Le rôle qui compte ici est celui des GOLEMS (`roles.golems`).
 */
export function equipesGolems<T extends JoueurCS>(ps: T[], r: Repartition): { gauche: T[]; droite: T[]; depuis: "jumeaux" | "calcul" } {
  const k = (p: T) => `${p.roles.golems === "tank" ? "T" : "D"}|${p.classe}`;
  const equilibre = (g: T[], d: T[]) => {
    if (Math.abs(g.length - d.length) > 1) return false;
    for (const c of new Set(ps.map(k))) if (Math.abs(g.filter((p) => k(p) === c).length - d.filter((p) => k(p) === c).length) > 1) return false;
    return g.filter((p) => p.roles.golems === "tank").length <= 1 && d.filter((p) => p.roles.golems === "tank").length <= 1;
  };
  const cote = (p: T) => r.jumeaux[cleJoueur(p.pseudo)];
  const g0 = ps.filter((p) => cote(p)?.startsWith("vert"));
  const d0 = ps.filter((p) => cote(p)?.startsWith("rouge"));
  if (ps.length && g0.length + d0.length === ps.length && equilibre(g0, d0)) return { gauche: g0, droite: d0, depuis: "jumeaux" };
  const ordre = [...grouper(ps, k)].sort(([ka, a], [kb, b]) => (ka[0] === "T" ? 0 : 1) - (kb[0] === "T" ? 0 : 1) || b.length - a.length);
  const G: T[] = [], D: T[] = [];
  for (const [, membres] of ordre) for (const p of membres) {
    const c = cote(p)?.startsWith("vert") ? "G" : cote(p) ? "D" : null;
    const ng = G.filter((x) => membres.includes(x)).length, nd = D.filter((x) => membres.includes(x)).length;
    const cible = ng !== nd ? (ng < nd ? "G" : "D") : G.length !== D.length ? (G.length < D.length ? "G" : "D") : (c ?? "G");
    (cible === "G" ? G : D).push(p);
  }
  return { gauche: G, droite: D, depuis: "calcul" };
}

/**
 * LES ROTATIONS DE DEBUFF DE L'ARAIGNÉE (`rotations_araignee`, bot.py:1622-1636) : les tanks de
 * l'araignée en sont exclus ; deux joueurs de la même classe ne sont jamais dans la même
 * rotation ; le troisième d'une classe (et au-delà) passe en réserve. Le rôle qui compte ici est
 * celui de l'ARAIGNÉE : p2 tanke les jumeaux, puis frappe l'araignée.
 */
export function rotationsAraignee<T extends JoueurCS>(ps: T[]): { r1: T[]; r2: T[]; reserve: T[] } {
  const dps = ps.filter((p) => p.roles.araignee !== "tank");
  const tri = [...grouper(dps, (p) => p.classe)].sort((a, b) => b[1].length - a[1].length); // stable
  const r1: T[] = [], r2: T[] = [], reserve: T[] = [];
  for (const [, m] of tri) {
    if (m.length >= 2) { r1.push(m[0]); r2.push(m[1]); reserve.push(...m.slice(2)); }
    else (r1.length <= r2.length ? r1 : r2).push(m[0]);
  }
  return { r1, r2, reserve };
}

const pluriel = (mot: string, n: number) => (n > 1 && !/[sxz]$/i.test(mot) ? `${mot}s` : mot);

/** « 1 Primat tank · 2 Arcanistes · 1 Templier » (`resume_classes`, bot.py:1639-1645), dans
 *  l'ordre où les membres sont rangés (tank en tête). */
export function resumeClasses(membres: { j: JoueurCS; tank: boolean }[]): string {
  const compte = new Map<string, number>();
  for (const m of membres) {
    const c = `${m.j.classe}${m.tank ? "|tank" : ""}`;
    compte.set(c, (compte.get(c) ?? 0) + 1);
  }
  return [...compte].map(([c, n]) => {
    const [classe, tank] = c.split("|");
    return `${n} ${pluriel(NOMS_CLASSES[classe] ?? classe, n)}${tank ? " tank" : ""}`;
  }).join(" · ");
}

/**
 * LES SALLES D'UN JOUEUR, EN UNE ÉTIQUETTE : « Salles 3 + 4 », « Asuras 11 + 12 » ; une seule :
 * « Salle 3 » ; des noms qui ne se regroupent pas : « Salle 10 + Asura 11 (arbre) ». Le modèle
 * écrivait « Salle 3 + Salle 4 » (bot.py:1666) ; le §8.3 (M5) resserre. Un joueur qui tient des
 * salles des deux sortes garde chaque sorte groupée, dans l'ordre : « Salles 6 + 10 + Asuras
 * 11 + 12 » — et non quatre libellés complets, qui débordent la ligne du récap.
 */
export function regrouperSalles(labels: string[]): string {
  if (labels.length < 2) return labels[0] ?? "";
  const groupes: { nom: string | null; labels: string[]; nums: string[] }[] = [];
  for (const l of labels) {
    const m = /^(\D+?)\s+(\d+)(?:\s*\([^)]*\))?$/.exec(l.trim());
    const g = m ? groupes.find((x) => x.nom === m[1]) : undefined;
    if (g && m) { g.labels.push(l); g.nums.push(m[2]); } else groupes.push({ nom: m?.[1] ?? null, labels: [l], nums: m ? [m[2]] : [] });
  }
  return groupes.map((g) => (g.nom && g.labels.length > 1 ? `${pluriel(g.nom, 2)} ${g.nums.join(" + ")}` : g.labels.join(" + "))).join(" + ");
}

/** Une phrase posée après « : » ou « · » prend une minuscule (« · lis bien… ») ; un sigle ou un
 *  mot en capitales (« DANGER ») garde les siennes. */
export const enSuite = (t: string) => (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

/** La ligne des consignes de l'araignée, telle que le récap l'écrit après « Araignée : » (M5) :
 *  « jamais deux debuffs… en même temps · tout le monde collé… · cercle DANGER… (elle renvoie les
 *  dégâts). ». Le staff les saisit comme des phrases (paramétrage) ; c'est ici qu'elles deviennent
 *  une ligne : minuscule en tête, le point de chacune remplacé par « · », un seul à la fin. */
export function phraseConsignes(consignes: string[]): string {
  const l = consignes.map((c) => enSuite(c.trim()).replace(/\s*\.$/, "")).filter(Boolean);
  if (!l.length) return "";
  const t = l.join(" · ");
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

/** « Golems » → « Golem » : le nom de la Phase 3 (paramétrage, `noms.golems`) au singulier, pour
 *  « 🗿 Golem : ➡️ droite ». */
export const singulier = (nom: string) => (nom.length > 2 && /s$/i.test(nom) ? nom.slice(0, -1) : nom);

export type Membre<T> = { j: T; tank: boolean };

export type Recap<T extends JoueurCS> = {
  /** Les participants (les retenus ; tant que personne ne l'est, les annoncés), dans l'ordre d'annonce. */
  joueurs: T[];
  /** La répartition, NETTOYÉE. */
  repartition: Repartition;
  salles: Salle[];
  places: number;
  /** Les trois colonnes : Tanks, DPS magiques, DPS physiques. */
  tanks: T[]; mag: T[]; phy: T[];
  /** Phase 1 : les salles regroupées par joueur, dans l'ordre des salles. */
  phase1: { libelle: string; j: T }[];
  sansJoueur: string[];
  couvertes: number;
  /** Phase 2 : les membres, tank en tête. */
  jumeaux: Record<Equipe, Membre<T>[]>;
  /** Phase 3 : les deux Dra'Zhul. */
  golems: { nom: string; depuis: "jumeaux" | "calcul"; gauche: Membre<T>[]; droite: Membre<T>[]; resumeGauche: string; resumeDroite: string; consigne: string };
  araignee: { r1: T[]; r2: T[]; reserve: T[]; consignes: string[] };
  pied: string;
};

/**
 * LE CONTENU DU RÉCAP (§4.6), une seule fonction pure : le site l'affiche (aperçu de l'onglet
 * Répartition), le bot en fait l'embed de 20 h 40 (M5) et la réponse 📍 Mes positions (M10).
 * Les consignes et le pied viennent du paramétrage des bras droits.
 */
export function recap<T extends JoueurCS>(
  joueurs: T[], brut: Repartition, p: Pick<ParametresCS, "salles" | "noms" | "consignes" | "textes">, places: number,
): Recap<T> {
  const r = nettoyer(brut, joueurs, p.salles);
  const k = (j: T) => cleJoueur(j.pseudo);
  const par = (role: RoleJumeau) => joueurs.filter((j) => roleTenu(j, r) === role);

  const groupes = new Map<string, string[]>();
  for (const s of p.salles) { const j = r.salles[s.cle]; if (j) groupes.set(j, [...(groupes.get(j) ?? []), s.label]); }
  const phase1 = [...groupes].map(([cj, labels]) => ({ libelle: regrouperSalles(labels), j: joueurs.find((x) => k(x) === cj)! })).filter((x) => x.j);

  const tankEnTete = (l: Membre<T>[]) => [...l.filter((m) => m.tank), ...l.filter((m) => !m.tank)];
  const jumeaux = Object.fromEntries(EQUIPES.map((eq) => [eq, tankEnTete(joueurs
    .filter((j) => r.jumeaux[k(j)]?.startsWith(`${eq}_`))
    .map((j) => ({ j, tank: roleDe(r.jumeaux[k(j)]) === "tank" })))])) as Record<Equipe, Membre<T>[]>;

  const g = equipesGolems(joueurs, r);
  const golem = (l: T[]) => tankEnTete(l.map((j) => ({ j, tank: j.roles.golems === "tank" })));
  const gauche = golem(g.gauche), droite = golem(g.droite);

  return {
    joueurs, repartition: r, salles: p.salles, places,
    tanks: par("tank"), mag: par("mag"), phy: par("phy"),
    phase1, sansJoueur: p.salles.filter((s) => !r.salles[s.cle]).map((s) => s.label), couvertes: p.salles.filter((s) => r.salles[s.cle]).length,
    jumeaux,
    golems: { nom: p.noms.golems, depuis: g.depuis, gauche, droite, resumeGauche: resumeClasses(gauche), resumeDroite: resumeClasses(droite), consigne: p.consignes.golems },
    araignee: { ...rotationsAraignee(joueurs), consignes: p.consignes.araignee },
    pied: p.textes.piedRecap,
  };
}

/** Le récap en NOMS — ce que la route 4 envoie au navigateur (la page retrouve la classe et
 *  les chiffres de chacun dans la liste des participants). */
export type RecapNoms = Omit<Recap<JoueurCS>, "joueurs" | "repartition" | "tanks" | "mag" | "phy" | "phase1" | "jumeaux" | "golems" | "araignee"> & {
  tanks: string[]; mag: string[]; phy: string[];
  phase1: { libelle: string; pseudo: string }[];
  jumeaux: Record<Equipe, { pseudo: string; tank: boolean }[]>;
  golems: Omit<Recap<JoueurCS>["golems"], "gauche" | "droite"> & { gauche: { pseudo: string; tank: boolean }[]; droite: { pseudo: string; tank: boolean }[] };
  araignee: { r1: string[]; r2: string[]; reserve: string[]; consignes: string[] };
};
export function recapEnNoms<T extends JoueurCS>(rc: Recap<T>): RecapNoms {
  const n = (l: T[]) => l.map((j) => j.pseudo);
  const m = (l: Membre<T>[]) => l.map((x) => ({ pseudo: x.j.pseudo, tank: x.tank }));
  return {
    salles: rc.salles, places: rc.places, sansJoueur: rc.sansJoueur, couvertes: rc.couvertes, pied: rc.pied,
    tanks: n(rc.tanks), mag: n(rc.mag), phy: n(rc.phy),
    phase1: rc.phase1.map((x) => ({ libelle: x.libelle, pseudo: x.j.pseudo })),
    jumeaux: { vert: m(rc.jumeaux.vert), rouge: m(rc.jumeaux.rouge) },
    golems: { ...rc.golems, gauche: m(rc.golems.gauche), droite: m(rc.golems.droite) },
    araignee: { r1: n(rc.araignee.r1), r2: n(rc.araignee.r2), reserve: n(rc.araignee.reserve), consignes: rc.araignee.consignes },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   📍 MES POSITIONS (`texte_positions`, bot.py:1119-1125 ; M10) — et le bandeau du site
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type Positions = {
  pseudo: string;
  classe: string;
  /** Les libellés de ses salles, dans l'ordre. */
  salles: string[];
  jumeau: Place | null;
  golem: "gauche" | "droite" | null;
  golemTank: boolean;
  /** 1, 2, la réserve (remplaçant debuff), ou tank (hors rotations). */
  araignee: 1 | 2 | "reserve" | "tank" | null;
};

export function positionsDe<T extends JoueurCS>(rc: Recap<T>, pseudo: string): Positions | null {
  const k = cleJoueur(pseudo);
  const j = rc.joueurs.find((x) => cleJoueur(x.pseudo) === k);
  if (!j) return null;
  const dans = (l: { j: T }[]) => l.some((m) => cleJoueur(m.j.pseudo) === k);
  const parmi = (l: T[]) => l.some((x) => cleJoueur(x.pseudo) === k);
  return {
    pseudo: j.pseudo, classe: j.classe,
    salles: rc.salles.filter((s) => rc.repartition.salles[s.cle] === k).map((s) => s.label),
    jumeau: rc.repartition.jumeaux[k] ?? null,
    golem: dans(rc.golems.gauche) ? "gauche" : dans(rc.golems.droite) ? "droite" : null,
    golemTank: j.roles.golems === "tank",
    araignee: j.roles.araignee === "tank" ? "tank" : parmi(rc.araignee.r1) ? 1 : parmi(rc.araignee.r2) ? 2 : parmi(rc.araignee.reserve) ? "reserve" : null,
  };
}

/**
 * CE QUE LA CLÔTURE RETIENT DE LA RÉPARTITION (§4.8 : `details` reprend « le poste, les salles et
 * la place chez les jumeaux », `ligne_participant` du modèle, bot.py:1359-1369) : les clés de
 * ses salles, sa place, et le rôle tenu ce soir. Figé à la clôture, pour que l'historique dise
 * qui tenait quoi CE SOIR-LÀ.
 */
export function detailsRepartition(r: Repartition, j: JoueurCS): { salles: string[]; jumeau: Place | null; role: RoleJumeau } {
  const k = cleJoueur(j.pseudo);
  return { salles: Object.entries(r.salles).filter(([, x]) => x === k).map(([s]) => s), jumeau: r.jumeaux[k] ?? null, role: roleTenu(j, r) };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE CHRONO EN DIRECT (§4.9, `cliquer_chrono` et `embed_chrono`, bot.py:1792-1879 ; lot 5)
   Un membre du staff clique « Démarrer » au lancement de l'instance, puis « Fin : 1.1 480
   monstres », « Fin : 1.2 12 Asuras »… — sur le site OU dans Discord : les deux écrivent au même
   endroit (`SeanceGuilde.chrono`), sous le verrou de version de la séance, par ces fonctions.
   Les instants sont des millisecondes epoch posées par le serveur (ou par le bot), jamais par
   le navigateur : une horloge de téléphone en avance ne fausse rien.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** `SeanceGuilde.chrono` (la forme de bot.py:1863, :1895). `par` : qui l'a démarré, pour
 *  « chronométreur : Maxime » — un pseudo du site, jamais un identifiant Discord. */
export type Chrono = { debut: number | null; fins: number[]; par: string; fini: boolean };
export const CHRONO_VIDE: Chrono = { debut: null, fins: [], par: "", fini: false };

export type ActionChrono = "suivante" | "annuler" | "arreter" | "reinitialiser";
export const ACTIONS_CHRONO: ActionChrono[] = ["suivante", "annuler", "arreter", "reinitialiser"];
export const estActionChrono = (v: unknown): v is ActionChrono => typeof v === "string" && (ACTIONS_CHRONO as string[]).includes(v);

/** Relu sans confiance : un blob abîmé donne un chrono vide, jamais une page cassée. Les fins
 *  doivent suivre le départ dans l'ordre — une fin qui remonte le temps coupe la liste là. */
export function lireChrono(json: unknown): Chrono {
  const o = obj(json);
  const debut = typeof o.debut === "number" && Number.isFinite(o.debut) && o.debut > 0 ? o.debut : null;
  if (debut === null) return { ...CHRONO_VIDE, fins: [] };
  const fins: number[] = [];
  let avant = debut;
  for (const t of Array.isArray(o.fins) ? o.fins.slice(0, 60) : []) {
    if (typeof t !== "number" || !Number.isFinite(t) || t < avant) break;
    fins.push(t);
    avant = t;
  }
  return { debut, fins, par: typeof o.par === "string" ? o.par.slice(0, 80) : "", fini: o.fini === true };
}

/**
 * LE REPÈRE DE L'ÉTAT AFFICHÉ — ce que le client renvoie avec chaque clic (`vu`), et que le
 * bouton Discord porte dans son identifiant. Si l'état a bougé entre-temps, le clic est refusé
 * (409) et l'écran se remet à jour, sans rien appliquer.
 *
 * La spec (§4.9) proposait `vu = fins.length`. Le contre-examen du lot 5 l'a trouvé trop court :
 * deux « Démarrer » simultanés portent tous deux 0, et le second, accepté, posait aussitôt la fin
 * de l'étape 1.1 ; un « Arrêter » et un « Annuler le dernier clic » croisés se trompaient de
 * cible. Le repère compte donc le départ ET les fins, et dit si le chrono est arrêté.
 */
export const repere = (c: Chrono) => (c.debut === null ? 0 : (1 + c.fins.length) * 2 + (c.fini ? 1 : 0));

export type ResultatChrono = { ok: true; chrono: Chrono; change: boolean; message: string } | { ok: false; status: 400 | 409; message: string };

const nomEtape = (e: Etape | undefined) => (e ? `${e.code} ${e.label}` : "l'étape");

/**
 * UN CLIC (`cliquer_chrono`, bot.py:1861-1876), appliqué à une COPIE. `etapes` : la liste FIGÉE
 * de la séance (au premier « Démarrer », c'est celle du paramétrage qui se fige).
 * - « suivante » : Démarrer, puis la fin de l'étape en cours ; la dernière fin termine ;
 * - « annuler » : défait un « Arrêter », sinon la dernière fin, sinon le départ ;
 * - « arreter » : termine avant la fin (« arrêté avant la fin ») ;
 * - « reinitialiser » : efface tout le chrono — absent du modèle, cité par la route 6 ; le site
 *   le demande après une confirmation, Discord ne l'offre pas.
 * Le staff seul clique : c'est la garde de la route (et du bot), pas celle de cette fonction.
 */
export function appliquerChrono(c0: Chrono, action: ActionChrono, now: number, par: string, etapes: Etape[]): ResultatChrono {
  const c: Chrono = { ...c0, fins: [...c0.fins] };
  const n = etapes.length;
  const fait = (message: string): ResultatChrono => ({ ok: true, chrono: c, change: true, message });
  const rien = (message: string): ResultatChrono => ({ ok: true, chrono: c0, change: false, message });
  const non = (message: string, status: 400 | 409 = 409): ResultatChrono => ({ ok: false, status, message });
  // Le temps ne recule jamais : un clic traité une milliseconde « avant » la borne précédente
  // (deux horloges, site et bot) prend la même.
  const t = Math.max(now, c.fins.at(-1) ?? c.debut ?? 0);
  switch (action) {
    case "suivante": {
      if (!n) return non("Aucune étape : règle-les dans le paramétrage des événements.", 400);
      if (c.debut === null) {
        Object.assign(c, { debut: now, fins: [], par: par.slice(0, 80), fini: false });
        return fait("Chrono démarré.");
      }
      if (c.fins.length >= n) return non("Le chrono est terminé.");
      if (c.fini) return non("Le chrono est arrêté : « Annuler le dernier clic » le relance.");
      const e = etapes[c.fins.length];
      c.fins.push(t);
      c.fini = c.fins.length === n;
      return fait(`${nomEtape(e)} : ${fmtDuree((t - (c0.fins.at(-1) ?? c0.debut!)) / 1000)}.${c.fini ? ` Terminé en ${fmtDuree(totalChrono(c))}.` : ""}`);
    }
    case "annuler": {
      if (c.debut === null) return non("Rien à annuler : le chrono n'a pas démarré.");
      if (c.fini && c.fins.length < n) { c.fini = false; return fait("L'arrêt est annulé : le chrono reprend."); }
      if (c.fins.length) {
        const e = etapes[c.fins.length - 1];
        c.fins.pop();
        c.fini = false;
        return fait(`${nomEtape(e)} reprend : sa fin est annulée.`);
      }
      Object.assign(c, { ...CHRONO_VIDE, fins: [] });
      return fait("Départ annulé : le chrono attend « Démarrer ».");
    }
    case "arreter": {
      if (c.debut === null) return non("Le chrono n'a pas démarré.");
      if (c.fini) return rien("Le chrono est déjà arrêté.");
      c.fini = true;
      return fait(c.fins.length ? `Chrono arrêté avant la fin, après ${nomEtape(etapes[c.fins.length - 1])}.` : "Chrono arrêté avant la fin de la première étape.");
    }
    case "reinitialiser": {
      if (c.debut === null) return rien("Le chrono est déjà vide.");
      Object.assign(c, { ...CHRONO_VIDE, fins: [] });
      return fait("Chrono effacé.");
    }
  }
}

/** Les durées des étapes faites, en secondes, par code (`durees_chrono`, bot.py:1792-1797) :
 *  `bornes = [debut, ...fins]`, la durée de l'étape i va de la borne i à la borne i + 1. */
export function dureesChrono(c: Chrono, etapes: Pick<Etape, "code">[]): Record<string, number> {
  if (c.debut === null) return {};
  const bornes = [c.debut, ...c.fins];
  const out: Record<string, number> = {};
  for (let i = 0; i < bornes.length - 1 && i < etapes.length; i++) out[etapes[i].code] = (bornes[i + 1] - bornes[i]) / 1000;
  return out;
}

/** Le total : la somme des durées faites (`bot.py:1816`), en secondes — du départ à la
 *  dernière fin. 0 tant qu'aucune étape n'est finie. */
export const totalChrono = (c: Chrono) => (c.debut !== null && c.fins.length ? (c.fins.at(-1)! - c.debut) / 1000 : 0);

/** LE TEMPS D'UNE SÉANCE DANS L'HISTORIQUE (route 13, onglet Bilans) : le chrono pris en direct.
 *  Un chrono qui TOURNE encore n'a pas de temps — du départ à sa dernière fin, ce serait un temps
 *  partiel, et « arrêté » serait faux : la ligne dit « en cours ». `n` : le nombre d'étapes
 *  (figées, sinon celles du paramétrage). */
export function tempsDeSeance(c: Chrono, n: number): { total: number | null; arrete: boolean; chronoEnCours: boolean } {
  const chronoEnCours = c.debut !== null && !c.fini && c.fins.length < n;
  const t = chronoEnCours ? 0 : totalChrono(c);
  return { total: t > 0 ? t : null, arrete: t > 0 && c.fins.length < n, chronoEnCours };
}

/** `fmt_duree` (bot.py:1766-1770, §4.1) : null donne « — » ; une heure et plus, h:mm:ss ;
 *  sinon m:ss. Les secondes sont arrondies. */
export function fmtDuree(s: number | null | undefined): string {
  if (s === null || s === undefined || !Number.isFinite(s)) return "—";
  const t = Math.max(0, Math.round(s));
  const deux = (n: number) => String(n).padStart(2, "0");
  return t >= 3600 ? `${Math.floor(t / 3600)}:${deux(Math.floor((t % 3600) / 60))}:${deux(t % 60)}` : `${Math.floor(t / 60)}:${deux(t % 60)}`;
}

export type LigneChrono = {
  etape: Etape;
  statut: "fait" | "en_cours" | "a_venir";
  /** Secondes, pour une étape faite. */
  duree: number | null;
};

export type VueChrono = {
  statut: "attente" | "en_cours" | "termine";
  lignes: LigneChrono[];
  /** L'étape en cours ; en attente, la première (celle qu'on affrontera) ; null une fois terminé. */
  courante: number | null;
  /** Le début de l'étape en cours (ms) : « en cours depuis » se compte de là. */
  depuis: number | null;
  /** Secondes depuis le départ (chrono en cours) ; sinon le total. */
  ecoule: number;
  /** Secondes dans l'étape en cours. */
  dansEtape: number | null;
  total: number;
  arreteAvantFin: boolean;
  /** Le bouton principal du staff : « Démarrer », « Fin : 2.2 Jumeaux », puis « Terminé » grisé
   *  (`ChronoView`, bot.py:1825-1845). */
  principal: { label: string; actif: boolean };
  /** « Annuler le dernier clic » et « Arrêter » sont grisés quand ils n'ont pas de sens. */
  annuler: boolean;
  arreter: boolean;
  repere: number;
};

/**
 * CE QUE MONTRE LE CHRONO À CET INSTANT (`embed_chrono`, bot.py:1800-1822) — une seule fonction
 * pour l'onglet du site et le message Discord. `now` : l'heure du SERVEUR (le navigateur corrige
 * la sienne du décalage mesuré à chaque réponse, §7.4).
 */
export function etatChrono(c: Chrono, etapes: Etape[], now: number): VueChrono {
  const n = etapes.length;
  const durees = dureesChrono(c, etapes);
  const enCours = c.debut !== null && !c.fini && c.fins.length < n;
  const courante = c.debut === null ? (n ? 0 : null) : enCours ? c.fins.length : null;
  const lignes: LigneChrono[] = etapes.map((etape, i) => ({
    etape,
    statut: i < c.fins.length ? "fait" : enCours && i === c.fins.length ? "en_cours" : "a_venir",
    duree: i < c.fins.length ? durees[etape.code] ?? null : null,
  }));
  const total = totalChrono(c);
  const depuis = enCours ? (c.fins.at(-1) ?? c.debut) : null;
  const e = courante !== null ? etapes[courante] : undefined;
  return {
    statut: c.debut === null ? "attente" : enCours ? "en_cours" : "termine",
    lignes, courante, depuis,
    ecoule: enCours ? Math.max(0, (now - c.debut!) / 1000) : total,
    dansEtape: depuis !== null ? Math.max(0, (now - depuis) / 1000) : null,
    total,
    arreteAvantFin: c.debut !== null && !enCours && c.fins.length < n,
    principal: c.debut === null ? { label: "Démarrer", actif: n > 0 }
      : enCours && e ? { label: `Fin : ${e.code} ${e.label}`, actif: true }
        : { label: "Terminé", actif: false },
    annuler: c.debut !== null,
    arreter: enCours,
    repere: repere(c),
  };
}

/** Le corps de la route 6 (ou un clic Discord), relu sans confiance. */
export function lireClicChrono(b: unknown): { ok: true; action: ActionChrono; vu: number } | { ok: false; message: string } {
  const o = obj(b);
  if (!estActionChrono(o.action)) return { ok: false, message: "Geste inconnu : suivante, annuler, arreter ou reinitialiser." };
  const vu = typeof o.vu === "number" ? o.vu : typeof o.vu === "string" && /^\d{1,4}$/.test(o.vu) ? Number(o.vu) : NaN;
  if (!Number.isInteger(vu) || vu < 0 || vu > 9999) return { ok: false, message: "L'état affiché manque (vu) : recharge la page." };
  return { ok: true, action: o.action, vu };
}

/** Le refus d'un clic en retard : l'état a bougé depuis ce que l'auteur voyait. */
export const CHRONO_DEJA_AVANCE = "Un autre membre du staff vient de valider cette étape.";

/** Seule la séance qui se JOUE (commencée depuis moins de 6 h, sinon la prochaine) se
 *  chronomètre : un vieux message resté dans le salon, ou un onglet ouvert depuis mercredi, ne
 *  touche pas au chrono d'une séance passée. Null : permis. */
export function refusChronoSeance(s: { cle: string; annulee: boolean; cloturee: boolean }, now: Date): string | null {
  if (s.cle !== seanceCouranteParis(now).cle) return "Ce chrono est celui d'une autre séance que celle qui se joue : il ne bouge plus.";
  if (s.annulee) return "Cette séance est annulée : pas de chrono.";
  if (s.cloturee) return "Cette séance est clôturée : son chrono ne bouge plus.";
  return null;
}

/**
 * LE CHRONO QUE L'ONGLET MONTRE D'ABORD (§7.4) : celui de la séance qui se joue s'il a démarré,
 * ou si c'est le jour J ; « hors séance », le dernier chrono terminé. Le sélecteur de séance
 * permet toujours de revenir à celle qui se joue.
 */
export function chronoParDefaut(
  courante: { cle: string; date: string; chrono: Chrono | null }, recents: { cle: string; fini: boolean }[], aujourdhui: string,
): string {
  if (courante.chrono?.debut != null || courante.date === aujourdhui) return courante.cle;
  return recents.find((x) => x.fini && x.cle !== courante.cle)?.cle ?? courante.cle;
}

/**
 * CE QUI SE JOUE À CETTE ÉTAPE, pour montrer qui y fait quoi (et ses dégâts DÉCLARÉS, décision
 * 9) : les salles, les équipes des jumeaux, les golems ou les rotations de l'araignée. Lu sur
 * l'ÉMOJI de l'étape : 🌳, 👯, 🗿 et 🕷️ désignent le même adversaire comme étape et comme phase
 * (§8.2) — le libellé et le code, eux, se renomment. Un golem dit son côté par son libellé
 * (« Troll 1 (Dra'Zhul gauche) »).
 */
export type Moment = { quoi: "salles" | "jumeaux" | "araignee" } | { quoi: "golems"; cote: "gauche" | "droite" | null };
export function momentDe(e: Pick<Etape, "emoji" | "label">): Moment | null {
  const em = e.emoji.replace(/️/g, "");
  if (em === "🌳") return { quoi: "salles" };
  if (em === "👯") return { quoi: "jumeaux" };
  if (em === "🕷") return { quoi: "araignee" };
  if (em === "🗿") return { quoi: "golems", cote: /gauche/i.test(e.label) ? "gauche" : /droite/i.test(e.label) ? "droite" : null };
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE DÉBRIEF ET SON ANALYSE (§4.1 pour les durées, §4.10 ; lot 6)
   Après la séance, le staff note chaque étape (bien, moyen, mal), corrige un chrono si besoin,
   ajoute une remarque, dit gagné ou perdu, et écrit ce qu'il faut retenir. Le site compare la
   séance à la précédente. Une seule écriture de ces règles, pour le site (routes 7 et 8, onglet
   Bilans), l'import du 18/10/2026, et le bot (débrief dans Discord et image, lot 7).
   `SeanceGuilde.debrief` : { "2.2": { statut, chrono, remarque }, … } (la forme de bot.py:1911,
   :1964) — plus `_import` pour un débrief repris d'ailleurs. Le `_` ne passe pas `RE_CODE_ETAPE` :
   cette clé ne peut jamais être prise pour une étape.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type StatutEtape = "bien" | "moyen" | "mal";
export const STATUTS_ETAPE: StatutEtape[] = ["bien", "moyen", "mal"];
export const LIBELLE_STATUT: Record<StatutEtape, string> = { bien: "Bien", moyen: "Moyen", mal: "Mal" };
export const estStatut = (v: unknown): v is StatutEtape => v === "bien" || v === "moyen" || v === "mal";

/** L'issue de la séance (`SeanceGuilde.resultat`). */
export type IssueSeance = "gagne" | "perdu";
export const lireIssue = (v: unknown): IssueSeance | null => (v === "gagne" || v === "perdu" ? v : null);

/** Les bornes du modèle : la remarque d'une étape (bot.py:2028), « à retenir » (:2052). */
export const REMARQUE_MAX = 300;
export const A_RETENIR_MAX = 1000;
/** Au-delà, une étape n'est pas plausible : c'est une faute de frappe (« 6122 » pour 6:12). */
export const CHRONO_ETAPE_MAX = 6 * 3600;

/**
 * `lire_duree` (bot.py:1773-1788, §4.1) : une saisie libre → des secondes. Vide → null, ce qui
 * veut dire « reprendre le chrono mesuré » ; illisible → undefined. On met en minuscules et on
 * retire les espaces (normales, insécables, fines), puis, dans l'ordre :
 *  1. « 45 » : des secondes ;
 *  2. « 1h02 » : des heures puis des MINUTES (3 720) — l'écart voulu au modèle, chez qui le nombre
 *     nu après « h » tombait dans les secondes (3 602) ;
 *  3. « 2m34 », « 2min34 », « 1h2m3s », « 45s » : au moins un groupe ;
 *  4. « 1:02:03 », « 2:34 » ;
 *  5. sinon, illisible.
 */
export function lireDuree(saisie: unknown): number | null | undefined {
  if (saisie === null || saisie === undefined) return null;
  if (typeof saisie !== "string" && typeof saisie !== "number") return undefined;
  const t = String(saisie).toLowerCase().replace(/[\s  ]/g, "");
  if (!t) return null;
  if (t.length > 20) return undefined;
  if (/^\d+$/.test(t)) return Number(t);
  let m = /^(\d+)h(\d+)?$/.exec(t);
  if (m) return Number(m[1]) * 3600 + Number(m[2] ?? 0) * 60;
  m = /^(?:(\d+)h)?(?:(\d+)(?:m|mn|min))?(?:(\d+)s?)?$/.exec(t);
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  if (/^\d+(:\d+){1,2}$/.test(t)) return t.split(":").reduce((s, p) => s * 60 + Number(p), 0);
  return undefined;
}

/** Un écart de temps (bot.py:2078-2082, §4.1) : « −1:23 » plus rapide (signe −1), « +0:51 » plus
 *  lent (1), « = » le même (0) ; null si l'un des deux temps manque. Le signe porte la couleur
 *  et l'émoji (⚡ 🐌 🟰, §8.2). */
export type Ecart = { texte: string; signe: -1 | 0 | 1 };
export function ecart(nouveau: number | null | undefined, ancien: number | null | undefined): Ecart | null {
  if (nouveau === null || nouveau === undefined || ancien === null || ancien === undefined || !Number.isFinite(nouveau) || !Number.isFinite(ancien)) return null;
  const d = Math.round(nouveau - ancien);
  if (d === 0) return { texte: "=", signe: 0 };
  return { texte: `${d < 0 ? "−" : "+"}${fmtDuree(Math.abs(d))}`, signe: d < 0 ? -1 : 1 };
}

/** La note d'une étape. `chrono` : la SAISIE du staff en secondes, null = la mesure du chrono. */
export type NoteEtape = { statut: StatutEtape | null; chrono: number | null; remarque: string };
export const NOTE_VIDE: NoteEtape = { statut: null, chrono: null, remarque: "" };
const noteVide = (n: NoteEtape) => !n.statut && n.chrono === null && !n.remarque;

/** Un débrief repris d'ailleurs (le 18/10/2026, image du bot Python) : d'où il vient, et le
 *  nombre de joueurs quand la liste, elle, est inconnue. */
export type ImportDebrief = { joueurs: number | null; source: string; le: number };
export type DebriefLu = { notes: Record<string, NoteEtape>; importe: ImportDebrief | null };
const CLE_IMPORT = "_import";

/** Une note relue sans confiance. */
export function lireNote(v: unknown): NoteEtape {
  const o = obj(v);
  const c = o.chrono;
  return {
    statut: estStatut(o.statut) ? o.statut : null,
    chrono: typeof c === "number" && Number.isFinite(c) && c >= 0 && c <= CHRONO_ETAPE_MAX ? c : null,
    remarque: typeof o.remarque === "string" ? o.remarque.slice(0, REMARQUE_MAX) : "",
  };
}

/** `SeanceGuilde.debrief` → les notes par code, et l'import s'il y en a un. Jamais d'exception :
 *  un blob abîmé donne un débrief vide, pas une page cassée. */
export function lireDebrief(json: unknown): DebriefLu {
  const o = obj(json);
  const notes: Record<string, NoteEtape> = {};
  for (const [code, v] of Object.entries(o)) {
    if (!RE_CODE_ETAPE.test(code)) continue;
    const n = lireNote(v);
    if (!noteVide(n)) notes[code] = n;
  }
  const i = obj(o[CLE_IMPORT]);
  const j = i.joueurs;
  const importe = typeof i.source === "string" && i.source.trim()
    ? { joueurs: typeof j === "number" && Number.isInteger(j) && j >= 1 && j <= 100 ? j : null, source: i.source.slice(0, 200), le: typeof i.le === "number" && Number.isFinite(i.le) ? i.le : 0 }
    : null;
  return { notes, importe };
}

/** Ce qui s'écrit en base : les notes non vides, et l'import tel quel. */
export function ecrireDebrief(d: DebriefLu): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [code, n] of Object.entries(d.notes)) if (!noteVide(n)) out[code] = { statut: n.statut, chrono: n.chrono, remarque: n.remarque };
  if (d.importe) out[CLE_IMPORT] = { joueurs: d.importe.joueurs, source: d.importe.source, le: d.importe.le };
  return out;
}

/** `chrono_etape` (bot.py:1905-1907) : la saisie si elle existe, SINON la durée mesurée par le
 *  chrono. Une saisie vidée fait donc revenir la mesure. */
export const chronoEtape = (note: NoteEtape | undefined, mesure: number | null | undefined): number | null =>
  note && note.chrono !== null ? note.chrono : (mesure ?? null);

/* ── Une saisie du staff (route 7, et le parcours dans Discord) ── */

/** Le patch partiel de la route 7 : seules les clés présentes changent. `chrono` est la saisie
 *  brute (« 2:34 »), lue par `lireDuree` ; vide, la mesure revient. */
export type PatchDebrief = {
  etapes?: Record<string, { statut?: StatutEtape | null; chrono?: string | null; remarque?: string }>;
  resultat?: IssueSeance | null;
  aRetenir?: string;
  /** Ce que l'écran montrait de ces champs avant le geste (`AvantDebrief`). Absent : pas de
   *  contrôle (un ancien bouton Discord, d'avant ce contrôle). */
  avant?: AvantDebrief;
};

/**
 * CE QUE L'ÉCRAN MONTRAIT, avant le geste, des seuls champs que le geste change. Décision 1 : le
 * site et Discord écrivent le même débrief, et un message éphémère de Discord ou un onglet resté
 * ouvert ne se rafraîchit pas tout seul. Sans ce contrôle, le second de deux membres du staff qui
 * notent la même étape effacerait la saisie du premier sans l'avoir jamais vue — un « Bien »
 * recliqué pour le retirer retirerait le « Mal » posé entre-temps de l'autre côté. Avec lui, le
 * geste est REFUSÉ (409, `DEBRIEF_CONFLIT`) et l'écran se remet à jour : le second voit le
 * conflit. Deux saisies sur deux étapes différentes passent toutes les deux.
 */
export type AvantDebrief = {
  etapes?: Record<string, { statut?: StatutEtape | null; chrono?: number | null; remarque?: string }>;
  resultat?: IssueSeance | null;
  aRetenir?: string;
};

/** Le début du refus d'un geste dépassé : le site et le bot le reconnaissent à ces mots. */
export const DEBRIEF_CONFLIT = "Un autre membre du staff vient de modifier";

/** L'`avant` d'un patch : pour chaque champ qu'il touche, sa valeur dans `vu` (ce que l'écran
 *  montrait — le chrono SAISI, pas la mesure ; la remarque telle qu'enregistrée). */
export function avantDuPatch(patch: PatchDebrief, vu: { notes: Record<string, NoteEtape>; resultat?: IssueSeance | null; aRetenir?: string }): AvantDebrief {
  const a: AvantDebrief = {};
  for (const [code, p] of Object.entries(patch.etapes ?? {})) {
    const n = vu.notes[code] ?? NOTE_VIDE;
    const x: NonNullable<AvantDebrief["etapes"]>[string] = {};
    if (p.statut !== undefined) x.statut = n.statut;
    if (p.chrono !== undefined) x.chrono = n.chrono;
    if (p.remarque !== undefined) x.remarque = n.remarque;
    (a.etapes ??= {})[code] = x;
  }
  if (patch.resultat !== undefined) a.resultat = vu.resultat ?? null;
  if (patch.aRetenir !== undefined) a.aRetenir = vu.aRetenir ?? "";
  return a;
}

/** Le conflit d'un geste : un champ qu'il touche a changé depuis ce que l'écran montrait (sa
 *  raison, lisible), ou null. Joué SOUS LE VERROU de la séance (`appliquerDebrief`, dans
 *  `majSeance`) : entre la lecture et l'écriture, rien ne passe. */
export function conflitDebrief(e: EtatDebrief, avant: AvantDebrief | undefined, etapes: Pick<Etape, "code" | "label">[]): string | null {
  if (!avant) return null;
  for (const [code, a] of Object.entries(avant.etapes ?? {})) {
    const n = e.notes[code] ?? NOTE_VIDE;
    const bouge = (a.statut !== undefined && (n.statut ?? null) !== (a.statut ?? null))
      || (a.chrono !== undefined && (n.chrono ?? null) !== (a.chrono ?? null))
      || (a.remarque !== undefined && (n.remarque ?? "").trim() !== (a.remarque ?? "").trim());
    if (bouge) {
      const et = etapes.find((x) => x.code === code);
      return `${DEBRIEF_CONFLIT} l'étape ${code}${et ? ` ${et.label}` : ""} : voici sa version, rien n'est changé.`;
    }
  }
  if (avant.resultat !== undefined && (e.resultat ?? null) !== (avant.resultat ?? null)) return `${DEBRIEF_CONFLIT} le résultat : voici sa version, rien n'est changé.`;
  if (avant.aRetenir !== undefined && (e.aRetenir ?? "").trim() !== (avant.aRetenir ?? "").trim()) return `${DEBRIEF_CONFLIT} « à retenir » : voici sa version, rien n'est changé.`;
  return null;
}

/** Ce que le geste refusé avait TAPÉ (chrono, remarque, « à retenir ») : on le rend à son auteur,
 *  qui le perdrait sinon — la fenêtre s'est fermée, le champ du site reprend la version de l'autre. */
export function texteDuPatch(patch: PatchDebrief): string {
  const morceaux = Object.values(patch.etapes ?? {}).flatMap((p) => [p.chrono ?? "", p.remarque ?? ""]);
  return [...morceaux, patch.aRetenir ?? ""].map((t) => t.trim()).filter(Boolean).join(" · ");
}

/** L'`avant` envoyé par le site, relu sans confiance ; null : illisible. */
function lireAvantDebrief(v: unknown): AvantDebrief | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const a: AvantDebrief = {};
  if (o.etapes !== undefined) {
    if (!o.etapes || typeof o.etapes !== "object" || Array.isArray(o.etapes) || Object.keys(o.etapes).length > 60) return null;
    a.etapes = {};
    for (const [code, x0] of Object.entries(o.etapes as Record<string, unknown>)) {
      const x = obj(x0);
      const n: NonNullable<AvantDebrief["etapes"]>[string] = {};
      if ("statut" in x) { if (x.statut !== null && !estStatut(x.statut)) return null; n.statut = (x.statut as StatutEtape | null) ?? null; }
      if ("chrono" in x) { if (x.chrono !== null && !(typeof x.chrono === "number" && Number.isFinite(x.chrono))) return null; n.chrono = (x.chrono as number | null) ?? null; }
      if ("remarque" in x) { if (typeof x.remarque !== "string" || x.remarque.length > 2000) return null; n.remarque = x.remarque; }
      a.etapes[code] = n;
    }
  }
  if ("resultat" in o) { if (o.resultat !== null && o.resultat !== "gagne" && o.resultat !== "perdu") return null; a.resultat = (o.resultat as IssueSeance | null) ?? null; }
  if ("aRetenir" in o) { if (typeof o.aRetenir !== "string" || o.aRetenir.length > 5000) return null; a.aRetenir = o.aRetenir; }
  return a;
}

/** Le corps de la route 7, relu sans confiance : la forme seulement — les règles (étape connue,
 *  chrono lisible, longueurs, conflit) sont celles d'`appliquerDebrief`. */
export function lirePatchDebrief(b: unknown): { ok: true; patch: PatchDebrief } | { ok: false; message: string } {
  const o = obj(b);
  const patch: PatchDebrief = {};
  const non = (message: string) => ({ ok: false as const, message });
  if (o.avant !== undefined) {
    const av = lireAvantDebrief(o.avant);
    if (!av) return non("Ce que montrait l'écran est illisible : recharge la page.");
    patch.avant = av;
  }
  if (o.etapes !== undefined) {
    if (!o.etapes || typeof o.etapes !== "object" || Array.isArray(o.etapes)) return non("Les étapes sont illisibles.");
    const e = o.etapes as Record<string, unknown>;
    if (Object.keys(e).length > 60) return non("Trop d'étapes d'un coup.");
    patch.etapes = {};
    for (const [code, v] of Object.entries(e)) {
      const x = obj(v);
      const p: NonNullable<PatchDebrief["etapes"]>[string] = {};
      if ("statut" in x) {
        if (x.statut !== null && !estStatut(x.statut)) return non("Statut inconnu : bien, moyen ou mal.");
        p.statut = (x.statut as StatutEtape | null) ?? null;
      }
      if ("chrono" in x) {
        if (x.chrono !== null && typeof x.chrono !== "string" && typeof x.chrono !== "number") return non("Chrono illisible : écris par exemple 2:34 ou 45s.");
        p.chrono = x.chrono === null ? null : String(x.chrono);
      }
      if ("remarque" in x) {
        if (typeof x.remarque !== "string") return non("La remarque est un texte.");
        p.remarque = x.remarque;
      }
      patch.etapes[code] = p;
    }
  }
  if ("resultat" in o) {
    if (o.resultat !== null && o.resultat !== "gagne" && o.resultat !== "perdu") return non("Le résultat est « gagne » ou « perdu ».");
    patch.resultat = (o.resultat as IssueSeance | null) ?? null;
  }
  if ("aRetenir" in o) {
    if (typeof o.aRetenir !== "string") return non("« À retenir » est un texte.");
    patch.aRetenir = o.aRetenir;
  }
  if (!patch.etapes && !("resultat" in patch) && patch.aRetenir === undefined) return non("Rien à enregistrer.");
  return { ok: true, patch };
}

export type EtatDebrief = { notes: Record<string, NoteEtape>; resultat: IssueSeance | null; aRetenir: string };

/**
 * UNE SAISIE (`noter`, EtapeModal, ARetenirModal — bot.py:1945-2059), appliquée à une COPIE.
 * `etapes` : la liste FIGÉE de la séance (à la première note, c'est celle du paramétrage qui se
 * fige). Refusé, avec sa raison : une étape que le déroulé ne compte pas, un chrono illisible
 * (le message du modèle, :2035-2037) ou de plus de 6 h, une remarque de plus de 300 signes,
 * « à retenir » de plus de 1 000 ; et 409 quand un champ touché a changé depuis ce que l'écran
 * montrait (`patch.avant`, `conflitDebrief`). Le staff seul saisit : c'est la garde de la route.
 */
export function appliquerDebrief(
  e0: EtatDebrief, patch: PatchDebrief, etapes: Etape[],
): { ok: true; etat: EtatDebrief; message: string } | { ok: false; status: 400 | 409; message: string } {
  const non = (message: string) => ({ ok: false as const, status: 400 as const, message });
  const conflit = conflitDebrief(e0, patch.avant, etapes);
  if (conflit) return { ok: false, status: 409, message: conflit };
  const notes: Record<string, NoteEtape> = Object.fromEntries(Object.entries(e0.notes).map(([k, v]) => [k, { ...v }]));
  const dits: string[] = [];
  for (const [code, p] of Object.entries(patch.etapes ?? {})) {
    const etape = etapes.find((x) => x.code === code);
    if (!etape) return non(`Étape inconnue : ${code}. Le déroulé de cette séance ne la compte pas.`);
    const n: NoteEtape = { ...(notes[code] ?? NOTE_VIDE) };
    const quoi: string[] = [];
    if (p.statut !== undefined) {
      n.statut = p.statut;
      quoi.push(p.statut ? LIBELLE_STATUT[p.statut].toLowerCase() : "statut retiré");
    }
    if (p.chrono !== undefined) {
      const d = lireDuree(p.chrono);
      if (d === undefined) return non("Chrono illisible : écris par exemple 2:34 ou 45s.");
      if (d !== null && d > CHRONO_ETAPE_MAX) return non(`Chrono de ${code} trop long (${fmtDuree(d)}) : 6 h au plus pour une étape.`);
      n.chrono = d;
      quoi.push(d === null ? "chrono repris de la mesure" : `chrono ${fmtDuree(d)}`);
    }
    if (p.remarque !== undefined) {
      const r = p.remarque.trim();
      if (r.length > REMARQUE_MAX) return non(`La remarque de ${code} fait ${r.length} signes : ${REMARQUE_MAX} au plus.`);
      n.remarque = r;
      quoi.push(r ? "remarque enregistrée" : "remarque retirée");
    }
    if (noteVide(n)) delete notes[code]; else notes[code] = n;
    if (quoi.length) dits.push(`${code} ${etape.label} : ${quoi.join(", ")}`);
  }
  let { resultat, aRetenir } = e0;
  if (patch.resultat !== undefined) {
    resultat = patch.resultat;
    dits.push(resultat ? `Résultat : ${resultat === "gagne" ? "gagné" : "perdu"}` : "Résultat retiré");
  }
  if (patch.aRetenir !== undefined) {
    const t = patch.aRetenir.trim();
    if (t.length > A_RETENIR_MAX) return non(`« À retenir » fait ${t.length} signes : ${A_RETENIR_MAX} au plus.`);
    aRetenir = t;
    dits.push(t ? "« À retenir » enregistré" : "« À retenir » vidé");
  }
  return { ok: true, etat: { notes, resultat, aRetenir }, message: dits.length ? `${dits.join(" · ")}.` : "Rien n'a changé." };
}

/** Le parcours étape par étape (`noter`, bot.py:1945-1950) : une note passe à l'étape suivante,
 *  et on s'arrête à la dernière. */
export const etapeSuivante = (i: number, n: number) => Math.max(0, Math.min(i + 1, n - 1));

/** Une séance d'où l'on ne fait pas de débrief : annulée, ou pas encore jouée. Null : permis. */
export function refusDebrief(s: { annulee: boolean; debut: Date | number }, now: number): string | null {
  if (s.annulee) return "Cette séance est annulée : pas de débrief.";
  if (+s.debut > now) return "Cette séance n'a pas encore eu lieu : on débriefe une séance jouée.";
  return null;
}

/* ── Le résumé et l'analyse (`resume_debrief`, `embed_debrief`, bot.py:2065-2111) ── */

export type LigneDebrief = {
  etape: Etape;
  statut: StatutEtape | null;
  /** Le chrono retenu : la saisie, sinon la mesure (`chronoEtape`). */
  chrono: number | null;
  /** La durée mesurée par le chrono en direct, s'il l'a prise. */
  mesure: number | null;
  /** Vrai : le chrono retenu est une saisie du staff. */
  saisi: boolean;
  remarque: string;
};
export type ResumeDebrief = {
  lignes: LigneDebrief[];
  /** La somme des chronos connus (bot.py:2069), en secondes. */
  total: number;
  /** Chaque étape figée a un chrono, mesuré ou saisi (§4.10, point 3) : le seul total qui se
   *  compare et qui peut faire un record. */
  complet: boolean;
  resultat: IssueSeance | null;
  aRetenir: string;
  /** « Étapes sans statut : 3.2, 4.1 » (bot.py:1992, :2016) : publier reste possible. */
  manquants: string[];
};

export function resumeDebrief(etapes: Etape[], notes: Record<string, NoteEtape>, chrono: Chrono, resultat: IssueSeance | null, aRetenir: string): ResumeDebrief {
  const mesures = dureesChrono(chrono, etapes);
  const lignes = etapes.map((etape): LigneDebrief => {
    const n = notes[etape.code];
    const mesure = mesures[etape.code] ?? null;
    return { etape, statut: n?.statut ?? null, chrono: chronoEtape(n, mesure), mesure, saisi: !!n && n.chrono !== null, remarque: n?.remarque ?? "" };
  });
  return {
    lignes,
    total: lignes.reduce((s, l) => s + (l.chrono ?? 0), 0),
    complet: lignes.length > 0 && lignes.every((l) => l.chrono !== null),
    resultat, aRetenir,
    manquants: lignes.filter((l) => !l.statut).map((l) => l.etape.code),
  };
}

/** Une séance telle qu'elle est en base (ses colonnes brutes), et le paramétrage pour une séance
 *  dont rien n'a encore figé la liste. `avecNotes: false` : la mesure seule — ce qu'un membre voit
 *  d'un débrief pas encore publié. */
export type SeanceBrute = { etapes: unknown; chrono: unknown; debrief: unknown; resultat: string | null; aRetenir: string | null };
export function resumeDeSeance(row: SeanceBrute, p: Pick<ParametresCS, "etapes" | "phases">, avecNotes = true) {
  const deroule = derouleDe(row.etapes, p);
  const debrief = lireDebrief(row.debrief);
  const resume = resumeDebrief(deroule.etapes, avecNotes ? debrief.notes : {}, lireChrono(row.chrono),
    avecNotes ? lireIssue(row.resultat) : null, avecNotes ? row.aRetenir ?? "" : "");
  return { deroule, debrief, resume };
}

/** Une séance PUBLIÉE avant celle qu'on analyse. */
export type SeanceComparee = { cle: string; date: string; resume: ResumeDebrief };

/** Les séances auxquelles on compare (§4.10, premier écart au modèle) : PUBLIÉES, autres que
 *  celle-ci, commencées AVANT elle, de la plus ancienne à la plus récente. Le modèle prenait le
 *  dernier publié quelle que soit sa date : republier un vieux débrief le comparait à un plus récent. */
export function precedentsDe<T extends { cle: string; debut: number; publie: boolean }>(toutes: T[], courante: { cle: string; debut: number }): T[] {
  return toutes.filter((s) => s.publie && s.cle !== courante.cle && s.debut < courante.debut).sort((a, b) => a.debut - b.debut);
}

export type AnalyseDebrief = {
  resultat: IssueSeance | null;
  total: number;
  complet: boolean;
  /** La séance publiée juste avant, celle des écarts et de « mal deux fois de suite ». */
  precedent: { cle: string; date: string } | null;
  /** « −1:23 » : seulement entre deux séances COMPLÈTES (§4.10, point 3). */
  ecartTotal: Ecart | null;
  /** Pourquoi pas d'écart total malgré un précédent : ce temps-ci est partiel, ou celui d'avant. */
  sansEcart: "partiel" | "precedent_partiel" | null;
  /** Nouveau record : une séance complète, plus rapide que TOUTES les complètes d'avant — et il
   *  en faut au moins une (le modèle le proclamait dès le premier débrief, §4.10, point 2). */
  record: boolean;
  plusLongue: { code: string; label: string; duree: number; part: number } | null;
  /** « Mal deux fois de suite » : comparé à la seule séance publiée juste avant. */
  malDeuxFois: { code: string; label: string }[];
  /** L'écart de chaque étape à la précédente, sur le CODE (une étape absente de l'une n'en a pas).
   *  Calculé même quand le total est partiel. */
  ecarts: Record<string, Ecart | null>;
};

/** `analyseDebrief` (§4.10) : une seule fonction pour le site, l'embed et l'image (lot 7). */
export function analyseDebrief(courant: ResumeDebrief, precedents: SeanceComparee[]): AnalyseDebrief {
  const dernier = precedents.at(-1) ?? null;
  const ecartTotal = dernier && courant.complet && dernier.resume.complet ? ecart(courant.total, dernier.resume.total) : null;
  const complets = precedents.filter((p) => p.resume.complet && p.resume.total > 0).map((p) => p.resume.total);
  let plusLongue: AnalyseDebrief["plusLongue"] = null;
  if (courant.total > 0) {
    for (const l of courant.lignes) {
      if (l.chrono && (!plusLongue || l.chrono > plusLongue.duree)) {
        plusLongue = { code: l.etape.code, label: l.etape.label, duree: l.chrono, part: Math.round((100 * l.chrono) / courant.total) };
      }
    }
  }
  const avant = new Map((dernier?.resume.lignes ?? []).map((l) => [l.etape.code, l]));
  return {
    resultat: courant.resultat, total: courant.total, complet: courant.complet,
    precedent: dernier ? { cle: dernier.cle, date: dernier.date } : null,
    ecartTotal,
    sansEcart: dernier && !ecartTotal && courant.total > 0 ? (courant.complet ? "precedent_partiel" : "partiel") : null,
    record: courant.complet && courant.total > 0 && complets.length > 0 && courant.total < Math.min(...complets),
    plusLongue,
    malDeuxFois: dernier ? courant.lignes.filter((l) => l.statut === "mal" && avant.get(l.etape.code)?.statut === "mal").map((l) => ({ code: l.etape.code, label: l.etape.label })) : [],
    ecarts: Object.fromEntries(courant.lignes.map((l) => [l.etape.code, dernier ? ecart(l.chrono, avant.get(l.etape.code)?.chrono) : null])),
  };
}

/** Le temps d'une séance dans l'historique (route 13), une fois le débrief connu : la somme des
 *  chronos retenus (mesurés, ou corrigés par le débrief). Un chrono qui TOURNE encore n'a pas de
 *  temps — ce serait un temps partiel — et la ligne dit « en cours ». `partiel` : il manque le
 *  chrono d'au moins une étape. */
export function tempsDuBilan(resume: ResumeDebrief, c: Chrono): { total: number | null; partiel: boolean; chronoEnCours: boolean } {
  const chronoEnCours = c.debut !== null && !c.fini && c.fins.length < resume.lignes.length;
  if (chronoEnCours) return { total: null, partiel: false, chronoEnCours };
  return { total: resume.total > 0 ? resume.total : null, partiel: resume.total > 0 && !resume.complet, chronoEnCours };
}

/* ── L'import d'un débrief tenu ailleurs (décision 11 : le 18/10/2026) ── */

export type DebriefImporte = {
  cle: string; date: string; creneau: "mer" | "dim"; titre: string;
  etapes: Etape[]; phases: Record<string, string>;
  notes: Record<string, NoteEtape>;
  resultat: IssueSeance | null; aRetenir: string;
  joueurs: number | null; source: string;
};

/**
 * Un débrief retranscrit (assets/genesis/refonte/debrief-2026-10-18.json) → ce que la séance
 * recevra. Rien n'est réécrit : les libellés, les statuts et les remarques passent MOT POUR MOT
 * (pas même un espace retiré) ; un chrono absent reste absent. L'émoji et les monstres d'une
 * étape, que l'image ne montrait pas, viennent du déroulé par défaut, sur le code. Refusé, avec
 * la liste des raisons, au moindre doute : mieux vaut ne rien importer qu'importer faux.
 */
export function lireDebriefImporte(json: unknown, defauts: Etape[] = ETAPES_CS_DEFAUT): { ok: true; d: DebriefImporte } | { ok: false; erreurs: string[] } {
  const o = obj(json);
  const err: string[] = [];
  if (o.evenement !== "cs") err.push("Seules les Chambres Secrètes s'importent (evenement « cs »).");
  const date = typeof o.date === "string" ? o.date : "";
  const creneau = o.creneau === "mer" || o.creneau === "dim" ? o.creneau : null;
  if (!dateValide(date)) err.push(`Date illisible : « ${date} » (AAAA-MM-JJ).`);
  if (!creneau) err.push("Le créneau est « mer » ou « dim ».");
  else if (dateValide(date) && jourDeDate(date) !== (creneau === "mer" ? 3 : 0)) err.push(`Le ${date} n'est pas un ${creneau === "mer" ? "mercredi" : "dimanche"}.`);
  const phasesBrutes = obj(o.phases);
  const phases: Record<string, string> = {};
  for (const [k, v] of Object.entries(phasesBrutes)) {
    if (!/^[1-9]$/.test(k) || typeof v !== "string" || !v.trim() || v.length > 60) { err.push(`Phase « ${k} » illisible.`); continue; }
    phases[k] = v;
  }
  if (!Object.keys(phases).length) err.push("Aucune phase.");
  const brutes = Array.isArray(o.etapes) ? o.etapes : [];
  if (!brutes.length || brutes.length > 30) err.push("De 1 à 30 étapes.");
  const etapes: Etape[] = [];
  const notes: Record<string, NoteEtape> = {};
  const vus = new Set<string>();
  for (const b of brutes) {
    const e = obj(b);
    const code = typeof e.code === "string" ? e.code : "";
    const nom = `Étape « ${code || "sans code"} »`;
    if (!RE_CODE_ETAPE.test(code)) { err.push(`${nom} : code illisible.`); continue; }
    if (vus.has(code)) { err.push(`${nom} : en double.`); continue; }
    vus.add(code);
    if (typeof e.label !== "string" || !e.label.trim() || e.label.length > 60) err.push(`${nom} : un libellé de 1 à 60 signes.`);
    if (typeof e.phase !== "string" || !(e.phase in phases)) err.push(`${nom} : sa phase n'existe pas.`);
    if (e.statut !== null && e.statut !== undefined && e.statut !== "" && !estStatut(e.statut)) err.push(`${nom} : statut « ${String(e.statut)} » inconnu.`);
    if (e.chrono !== null && e.chrono !== undefined && !(typeof e.chrono === "number" && Number.isFinite(e.chrono) && e.chrono >= 0 && e.chrono <= CHRONO_ETAPE_MAX)) err.push(`${nom} : chrono illisible (des secondes, ou null).`);
    if (e.remarque !== undefined && typeof e.remarque !== "string") err.push(`${nom} : la remarque est un texte.`);
    else if (typeof e.remarque === "string" && e.remarque.length > REMARQUE_MAX) err.push(`${nom} : remarque de ${e.remarque.length} signes, ${REMARQUE_MAX} au plus.`);
    const d = defauts.find((x) => x.code === code);
    etapes.push({ code, label: String(e.label ?? code), phase: String(e.phase ?? "1"), emoji: d?.emoji ?? "▫️", monstres: d?.monstres.map((m) => ({ ...m })) ?? [] });
    const n: NoteEtape = {
      statut: estStatut(e.statut) ? e.statut : null,
      chrono: typeof e.chrono === "number" ? e.chrono : null,
      remarque: typeof e.remarque === "string" ? e.remarque : "",
    };
    if (!noteVide(n)) notes[code] = n;
  }
  const resultat = o.resultat === null || o.resultat === undefined ? null : lireIssue(o.resultat);
  if (o.resultat !== null && o.resultat !== undefined && !resultat) err.push("Le résultat est « gagne », « perdu » ou null.");
  const aRetenir = o.aRetenir === undefined || o.aRetenir === null ? "" : o.aRetenir;
  if (typeof aRetenir !== "string" || aRetenir.length > A_RETENIR_MAX) err.push(`« À retenir » : un texte de ${A_RETENIR_MAX} signes au plus.`);
  const j = o.joueurs;
  if (j !== null && j !== undefined && !(typeof j === "number" && Number.isInteger(j) && j >= 1 && j <= 100)) err.push("Le nombre de joueurs va de 1 à 100, ou reste null.");
  if (err.length) return { ok: false, erreurs: err };
  const titre = typeof o.titre === "string" && o.titre.trim() ? o.titre.slice(0, 80) : `Retour Chambre — ${date}`;
  return {
    ok: true,
    d: {
      cle: `cs_${date}_${creneau}`, date, creneau: creneau!, titre, etapes, phases, notes, resultat, aRetenir: aRetenir as string,
      joueurs: typeof j === "number" ? j : null,
      source: `Image « ${titre} » du bot Python, retranscrite mot pour mot`.slice(0, 200),
    },
  };
}

/** Ce que l'import écrit sur la séance (les colonnes de `SeanceGuilde`). */
export type EcritureImport = {
  etapes: { etapes: Etape[]; phases: Record<string, string> };
  debrief: Record<string, unknown>;
  resultat: IssueSeance | null; aRetenir: string | null;
  debriefPar: string; debriefPublieAt: Date;
};
export type PlanImport = { quoi: "ecrire"; data: EcritureImport; message: string } | { quoi: "rien" | "refus"; message: string };

/** Le nom qui signe un débrief importé (`debriefPar`). */
export const PAR_IMPORT = "Import";
/** Ce qui signe un débrief repris du FICHIER du bot Python (`_import.source` ; lot 10,
 *  lib/import-dracarys.ts) — la donnée d'origine, chronos compris. */
export const SOURCE_DRACARYS = "Fichier data_chambre.json du bot Python";

/**
 * L'IMPORT, IDEMPOTENT : ce qu'il faut écrire sur la séance telle qu'elle est en base (null : elle
 * n'existe pas encore). Relancé, il ne double rien et ne réécrit rien d'identique (« rien ») ; il
 * ne remplace JAMAIS un débrief fait sur le site — ni celui d'une séance débriefée ici, ni un
 * débrief importé puis retouché ou repassé en brouillon par le staff —, ni une séance déjà
 * chronométrée ici ou annulée (« refus ») — c'est la clé `cle` de la séance qui le garantit,
 * comme au lot 10 (§14). Seul un fichier corrigé, sur un import que personne n'a touché, réécrit.
 *
 * Le débrief importé est PUBLIÉ (il l'a été sur Discord, le soir même) ; sa date de publication et
 * celle de l'import (`_import.le`) restent celles du premier passage.
 */
export function planImport(
  x: { annulee: boolean; etapes: unknown; debrief: unknown; resultat: string | null; aRetenir: string | null; debriefPublieAt: Date | null; debriefPar?: string | null } | null,
  d: DebriefImporte, now: number,
): PlanImport {
  const quand = dateLongue(d.date);
  const lu = lireDebrief(x?.debrief);
  if (x?.annulee) return { quoi: "refus", message: `La séance du ${quand} est annulée sur le site : rien n'est importé.` };
  if (x && !lu.importe && (Object.keys(lu.notes).length || x.resultat || x.aRetenir)) {
    return { quoi: "refus", message: `La séance du ${quand} a déjà un débrief fait sur le site : l'import ne l'écrase pas.` };
  }
  if (x && !lu.importe && lireDeroule(x.etapes)) {
    return { quoi: "refus", message: `La séance du ${quand} a déjà été chronométrée sur le site : l'import ne touche pas à sa liste d'étapes.` };
  }
  // Lot 10 : un débrief repris du FICHIER du bot Python est la donnée d'origine ; la
  // retranscription d'une image ne l'écrase pas (relancées tour à tour, les deux se
  // contrediraient).
  if (x && lu.importe?.source.startsWith(SOURCE_DRACARYS) && !d.source.startsWith(SOURCE_DRACARYS)) {
    return { quoi: "refus", message: `Le débrief du ${quand} vient du fichier du bot Python (données d'origine) : la retranscription ne l'écrase pas.` };
  }
  const importe: ImportDebrief = { joueurs: d.joueurs, source: d.source, le: lu.importe?.le || now };
  const data: EcritureImport = {
    etapes: { etapes: d.etapes, phases: d.phases },
    debrief: ecrireDebrief({ notes: d.notes, importe }),
    resultat: d.resultat, aRetenir: d.aRetenir || null,
    debriefPar: PAR_IMPORT, debriefPublieAt: x?.debriefPublieAt ?? new Date(now),
  };
  const deja = x && lu.importe && memeValeur(lireDeroule(x.etapes), data.etapes) && memeValeur(x.debrief, data.debrief)
    && (x.resultat ?? null) === data.resultat && (x.aRetenir ?? null) === data.aRetenir && !!x.debriefPublieAt;
  if (deja) return { quoi: "rien", message: `Le débrief du ${quand} est déjà importé, à l'identique : rien n'a changé.` };
  // Un débrief IMPORTÉ, puis retouché sur le site : une note, une correction ou une publication
  // signent `debriefPar` du nom du staff (modifierDebrief, marquerDebriefPublie) ; « Repasser en
  // brouillon » efface la date de publication. Le réimporter effacerait ce travail en silence,
  // ou republierait ce que le staff a retiré : refusé, comme pour un débrief fait sur le site.
  if (x && lu.importe && ((x.debriefPar && x.debriefPar !== PAR_IMPORT) || !x.debriefPublieAt)) {
    return {
      quoi: "refus",
      message: `Le débrief du ${quand} a été repris sur le site depuis l'import (${x.debriefPublieAt ? `par ${x.debriefPar}` : "repassé en brouillon"}) : l'import ne l'écrase pas.`,
    };
  }
  return { quoi: "ecrire", data, message: x && lu.importe ? `Le débrief du ${quand} est réimporté (le fichier a changé).` : `Le débrief du ${quand} est importé.` };
}
