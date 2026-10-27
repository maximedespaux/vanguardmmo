/**
 * LES SÉANCES EN BASE — écrire sans écraser l'autre, et retrouver les participants (spec §5.4,
 * §12.5 ; lot 2).
 *
 * Le client Prisma est PASSÉ EN PARAMÈTRE : le site donne `@/lib/prisma`, le bot
 * `bot/lib/prisma`. On ne crée ainsi jamais de second client. Ce module n'importe pas
 * `server-only` (piège n° 7) : sous tsx, sans la condition `react-server`, ce paquet lève une
 * exception à l'import, et le bot ne démarrerait plus.
 */
import { Prisma, type PrismaClient, type SeanceGuilde, type SeanceParticipant } from "@prisma/client";
import { GUILD_ROLES } from "@/config/roles";
import { normaliserCompo, type CompoState, type Presence } from "@/lib/compositions";
import { chiffresDuPoste, chiffresParRole, choisirStuff, departager, enLigne, type Chiffre } from "@/lib/recensement";
import type { RoleMesure } from "@/lib/mesures";
import {
  TYPE_DPS, aEnregistrer, annoncesDeLaSeance, dateLongue, derouleDe, libellePoste, lignesCloture, lireDeroule, normaliserParametres, postesEffectifs, rolesDuParticipant,
  type ChiffreFige, type DetailsParticipant, type Etape, type Evenement, type ParametresCS, type ParametresGS, type Participant, type SeanceParis,
} from "@/lib/evenements";
import { ROLES_GS, clotureGS, gesteGS, refusInscriptionGS, rolesAffichageGS, type AnnonceGS, type Compte, type GesteGS } from "@/lib/evenements";
import {
  CHRONO_DEJA_AVANCE, appliquerAction, appliquerChrono, cleJoueur, detailsRepartition, lireChrono, lireRepartition, nettoyer, refusChronoSeance, repere, texteDemande,
  type ActionChrono, type ActionRepartition, type Chrono, type ContexteAction, type EchangeFait, type Repartition,
} from "@/lib/chambres";
import {
  analyseDebrief, appliquerDebrief, ecrireDebrief, estPlace, lireDebrief, lireIssue, refusDebrief, resumeDeSeance,
  type AnalyseDebrief, type ImportDebrief, type IssueSeance, type NoteEtape, type PatchDebrief, type Place, type ResumeDebrief, type SeanceComparee,
} from "@/lib/chambres";

type Db = PrismaClient | Prisma.TransactionClient;

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE PARAMÉTRAGE (§9.1) — versionné : deux enregistrements sur la même version, le second
   reçoit 409 et l'écran propose de recharger sans rien perdre de la saisie.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type ParametresLus<T> = { data: T; version: number; parQui: string | null; modifieLe: Date | null; modifies: string[] };

export async function lireParametres(db: Db, ev: "cs"): Promise<ParametresLus<ParametresCS>>;
export async function lireParametres(db: Db, ev: "gs"): Promise<ParametresLus<ParametresGS>>;
export async function lireParametres(db: Db, ev: Evenement): Promise<ParametresLus<ParametresCS | ParametresGS>>;
export async function lireParametres(db: Db, ev: Evenement): Promise<ParametresLus<ParametresCS | ParametresGS>> {
  const row = await db.parametresEvenement.findUnique({ where: { id: ev } });
  const stocke = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {};
  return {
    // Les clés absentes reprennent le défaut du code : c'est TOUT l'intérêt de n'écrire que les
    // différences.
    data: normaliserParametres(ev, stocke),
    version: row?.version ?? 0,
    parQui: row?.parQui ?? null,
    modifieLe: row?.updatedAt ?? null,
    modifies: Object.keys(stocke),
  };
}

export type ResultatEnregistrement = { ok: true; version: number; stocke: Record<string, unknown> } | { ok: false; status: 409 };

/**
 * Écrit un paramétrage DÉJÀ normalisé et validé, à condition que personne n'ait enregistré
 * depuis la `version` lue. Seules les clés qui diffèrent du défaut partent en base.
 */
export async function enregistrerParametres(
  db: Db, ev: Evenement, propre: ParametresCS | ParametresGS, version: number, parQui: string,
): Promise<ResultatEnregistrement> {
  const stocke = aEnregistrer(ev, propre) as Prisma.InputJsonValue;
  if (version === 0) {
    // Personne n'a jamais enregistré : la ligne naît ici. Deux premiers enregistrements en même
    // temps : le second se heurte à la clé (P2002) — c'est le même conflit qu'une version vieillie.
    const existe = await db.parametresEvenement.findUnique({ where: { id: ev }, select: { version: true } });
    if (existe) return { ok: false, status: 409 };
    try {
      await db.parametresEvenement.create({ data: { id: ev, data: stocke, version: 1, parQui } });
      return { ok: true, version: 1, stocke: stocke as Record<string, unknown> };
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") return { ok: false, status: 409 };
      throw e;
    }
  }
  const n = await db.parametresEvenement.updateMany({
    where: { id: ev, version },
    data: { data: stocke, version: { increment: 1 }, parQui },
  });
  return n.count === 1 ? { ok: true, version: version + 1, stocke: stocke as Record<string, unknown> } : { ok: false, status: 409 };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   UNE SÉANCE : `majSeance` (§5.4)
   Verrou optimiste sur `version`. La séance naît au premier geste, jamais à la lecture.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type RefSeance = Pick<SeanceParis, "cle" | "evenement" | "date" | "creneau" | "debut">;
export type Modif = { ok: true; patch: Prisma.SeanceGuildeUpdateManyMutationInput; message?: string } | { ok: false; status: number; message: string };
export type ResultatSeance = { ok: true; seance: SeanceGuilde; message?: string } | { ok: false; status: number; message: string };

const CONFLIT = Symbol("conflit");

/**
 * Applique `modifier` (une fonction PURE qui lit la séance et rend le patch) à la séance `ref`,
 * en la créant au besoin. `ecrireAussi` écrit dans la MÊME transaction ce qui accompagne le
 * patch (les lignes de la clôture) : si la version a bougé entre-temps, rien n'est écrit, et on
 * recommence sur la séance relue. Trois échecs de suite : quelqu'un écrit en rafale, 409.
 */
export async function majSeance(
  db: PrismaClient, ref: RefSeance,
  modifier: (s: SeanceGuilde) => Modif,
  ecrireAussi?: (tx: Prisma.TransactionClient, s: SeanceGuilde) => Promise<void>,
): Promise<ResultatSeance> {
  for (let essai = 0; essai < 3; essai++) {
    // Deux créations simultanées de la même séance (deux bots, un clic site et un clic Discord) :
    // Prisma lève P2002 sur la clé unique au lieu de fusionner. On relit : l'autre l'a créée.
    const s = await db.seanceGuilde
      .upsert({ where: { cle: ref.cle }, create: { cle: ref.cle, evenement: ref.evenement, date: ref.date, creneau: ref.creneau, debut: ref.debut }, update: {} })
      .catch((e) => { if ((e as { code?: string })?.code === "P2002") return null; throw e; });
    if (!s) continue;
    const res = modifier(structuredClone(s));
    if (!res.ok) return res; // refus métier : rien n'est écrit
    try {
      const apres = await db.$transaction(async (tx) => {
        const n = await tx.seanceGuilde.updateMany({ where: { id: s.id, version: s.version }, data: { ...res.patch, version: { increment: 1 } } });
        if (n.count !== 1) throw CONFLIT;
        if (ecrireAussi) await ecrireAussi(tx, s);
        return tx.seanceGuilde.findUniqueOrThrow({ where: { id: s.id } });
      });
      return { ok: true, seance: apres, message: res.message };
    } catch (e) {
      if (e === CONFLIT) continue;
      throw e;
    }
  }
  return { ok: false, status: 409, message: "La séance vient d'être modifiée. Recharge et réessaie." };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LA RÉPARTITION (§4.3, §4.4 ; lot 4) — un geste, d'où qu'il vienne
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type ResultatRepartition =
  | { ok: true; message: string; repartition: Repartition; seance: SeanceGuilde; echange?: EchangeFait }
  | { ok: false; status: number; message: string; echange?: EchangeFait; seance?: SeanceGuilde };

/**
 * UN GESTE DE RÉPARTITION, écrit sous le verrou de la séance (§5.4). Le site (route 5) et le bot
 * (boutons des salles et des jumeaux, menus du staff, 📍 Mes positions) passent tous les deux
 * ici, avec les règles pures de lib/chambres. Deux clics simultanés sur la même salle : le
 * second échoue sur la version, relit la séance, et la trouve prise — un seul l'obtient.
 *
 * Une séance annulée ou clôturée ne bouge plus (la clôture fige qui tenait quoi, §4.8). La
 * répartition relue est NETTOYÉE avant le geste : un annoncé que le staff n'a pas retenu perd
 * ses places, un poste changé perd la place qu'il ne tient plus, une demande d'échange expirée
 * (1 h) disparaît.
 *
 * LES ÉCHANGES (lot 10, §4.5) : une demande, ou sa réponse, prévient le joueur concerné par une
 * notification du site (`notifierEchange`) — que le geste vienne du site ou de Discord. Le
 * message privé Discord, lui, part du bot (bot/lib/seances.ts) ; `echange` dit à l'appelant ce
 * qui vient de se faire. Une acceptation devenue impossible clôt la demande avec sa raison : la
 * clôture s'ÉCRIT, et l'appelant reçoit le refus.
 *
 * `comptes` : le compte (User.id) du perso de chaque clé de joueur, pour les notifications.
 * `discord` : la bascule est faite (`nouveauxMessages`) — la notification peut renvoyer à
 * Discord ; avant, aucun bouton n'y mène (📍 Mes positions attend la bascule).
 */
export async function modifierRepartition(
  db: PrismaClient, s: RefSeance, a: ActionRepartition, ctx: ContexteAction,
  o: { comptes?: (cle: string) => string | null; discord?: boolean } = {},
): Promise<ResultatRepartition> {
  const now = ctx.maintenant ?? Date.now();
  let refusEcrit: { status: number; message: string } | null = null;
  let echange: EchangeFait | undefined;
  const res = await majSeance(db, s, (x) => {
    refusEcrit = null; echange = undefined;
    if (x.annulee) return { ok: false, status: 409, message: "Cette séance est annulée : sa répartition ne bouge plus." };
    if (x.clotureAt) return { ok: false, status: 409, message: "Cette séance est clôturée : sa répartition ne bouge plus." };
    const r = nettoyer(lireRepartition(x.repartition), ctx.joueurs, ctx.salles, now);
    const g = appliquerAction(r, a, { ...ctx, maintenant: now });
    echange = g.echange;
    if (!g.ok && !g.ecrire) return { ok: false, status: g.status, message: g.message };
    if (!g.ok) refusEcrit = { status: g.status, message: g.message };
    return { ok: true, patch: { repartition: r as unknown as Prisma.InputJsonValue }, message: g.message };
  });
  if (!res.ok) return res;
  const fait = echange as EchangeFait | undefined;
  if (fait && o.comptes) await notifierEchange(db, s, fait, ctx, o.comptes, { discord: o.discord });
  const refus = refusEcrit as { status: number; message: string } | null;
  if (refus) return { ok: false, status: refus.status, message: refus.message, echange: fait, seance: res.seance };
  return { ok: true, message: res.message ?? "", repartition: lireRepartition(res.seance.repartition), seance: res.seance, echange: fait };
}

/** Le lien des notifications et des messages d'une demande : l'onglet Répartition. */
export const LIEN_REPARTITION = "/compositions?onglet=repartition";

/**
 * LA NOTIFICATION D'UN ÉCHANGE (lot 10, §4.5 ; type « chambre », lib/typesNotif.ts) : la demande
 * au joueur visé ; la réponse au demandeur — et au joueur visé quand c'est le staff qui a
 * répondu pour lui (sa place a pu changer sans qu'il clique). Un retrait par le demandeur ne
 * prévient personne. Jamais d'échec : la demande est écrite, une notification manquée ne doit
 * pas la défaire.
 */
export async function notifierEchange(
  db: Pick<PrismaClient, "notification">, s: Pick<RefSeance, "date">, e: EchangeFait, ctx: ContexteAction, comptes: (cle: string) => string | null,
  o: { discord?: boolean } = {},
): Promise<number> {
  const d = e.demande;
  const quand = `Chambre du ${dateLongue(s.date)}`;
  const lignes: { userId: string; title: string; body: string }[] = [];
  const pour = (cle: string, title: string, body: string) => { const u = comptes(cle); if (u) lignes.push({ userId: u, title, body }); };
  // « ou sur Discord » : seulement après la bascule — avant, aucun bouton n'y mène.
  if (e.quoi === "demande") pour(d.a, `Demande d'échange — ${quand}`, `${texteDemande(d, ctx, "cible")} Accepte ou refuse dans l'heure, dans l'onglet Répartition${o.discord === false ? "" : " ou sur Discord"}.`);
  else if (d.reponse && d.reponse.par !== "demandeur") {
    const qui = d.reponse.par === "staff" ? "Le staff" : nomJoueur(ctx, d.a);
    const quoi = texteDemande(d, ctx, "tiers");
    const verdict = d.reponse.motif ? `L'échange n'a pas pu se faire : ${d.reponse.motif}` : d.reponse.accepte ? `${qui} a accepté.` : `${qui} a refusé.`;
    const titre = `${d.reponse.motif ? "Échange impossible" : d.reponse.accepte ? "Échange accepté" : "Échange refusé"} — ${quand}`;
    pour(d.de, titre, `${quoi} ${verdict}`);
    if (d.reponse.par === "staff" && comptes(d.a) !== comptes(d.de)) pour(d.a, titre, `${quoi} ${verdict}`);
  }
  if (!lignes.length) return 0;
  try {
    const n = await db.notification.createMany({ data: lignes.map((l) => ({ ...l, type: "chambre", link: LIEN_REPARTITION })) });
    return n.count;
  } catch {
    return 0;
  }
}

const nomJoueur = (ctx: ContexteAction, cle: string) => ctx.joueurs.find((j) => cleJoueur(j.pseudo) === cle)?.pseudo ?? cle;

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE CHRONO (§4.9 ; lot 5) — un clic, d'où qu'il vienne
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type Deroule = { etapes: Etape[]; phases: Record<string, string> };
export type ResultatChronoSeance =
  | { ok: true; message: string; change: boolean; chrono: Chrono; deroule: Deroule }
  /** `conflit` : l'état avait bougé depuis ce que l'auteur voyait (`vu`) — l'écran se remet à
   *  jour. `chrono` et `deroule` : l'état tel qu'il est, pour le réafficher sans relire. */
  | { ok: false; status: number; message: string; conflit: boolean; chrono: Chrono; deroule: Deroule };

/**
 * UN CLIC DU CHRONO, écrit sous le verrou de la séance (§5.4). La route 6 du site et les
 * boutons du message Discord (M6) passent tous les deux ici, avec les règles pures de
 * lib/chambres. Le clic porte `vu`, le repère de l'état que son auteur voyait : un clic sur le
 * site et un clic sur Discord au même instant lisent la même version, le premier écrit, le
 * second relit la séance, n'y retrouve plus son repère, et reçoit 409 — une seule fin.
 *
 * Au premier « Démarrer », la liste des étapes du paramétrage se FIGE dans la séance (§3.2).
 * « Effacer » la libère tant qu'aucun débrief n'y est noté : le prochain départ prendra la liste
 * du moment (le staff a pu corriger une étape entre-temps).
 *
 * `maintenant` : l'heure du serveur (ou du bot), injectable pour les vérifications.
 */
export async function modifierChrono(
  db: PrismaClient, s: RefSeance, action: ActionChrono, vu: number, par: string,
  p: Pick<ParametresCS, "etapes" | "phases">, maintenant: () => number = Date.now,
): Promise<ResultatChronoSeance> {
  let change = true;
  const res = await majSeance(db, s, (x) => {
    const refus = refusChronoSeance({ cle: x.cle, annulee: x.annulee, cloturee: !!x.clotureAt }, new Date(maintenant()));
    if (refus) return { ok: false, status: 409, message: refus };
    const c = lireChrono(x.chrono);
    if (vu !== repere(c)) return { ok: false, status: 409, message: CHRONO_DEJA_AVANCE };
    const fige = lireDeroule(x.etapes);
    const d = fige ?? { etapes: p.etapes, phases: p.phases };
    const r = appliquerChrono(c, action, maintenant(), par, d.etapes);
    if (!r.ok) return r;
    change = r.change;
    const patch: Prisma.SeanceGuildeUpdateManyMutationInput = { chrono: r.chrono as unknown as Prisma.InputJsonValue };
    if (!fige && r.chrono.debut !== null) patch.etapes = d as unknown as Prisma.InputJsonValue;
    const notes = !!x.debrief && typeof x.debrief === "object" && Object.keys(x.debrief).length > 0;
    if (fige && r.chrono.debut === null && action === "reinitialiser" && !notes) patch.etapes = Prisma.DbNull;
    return { ok: true, patch, message: r.message };
  });
  if (res.ok) return { ok: true, message: res.message ?? "", change, chrono: lireChrono(res.seance.chrono), deroule: derouleDe(res.seance.etapes, p) };
  const row = await db.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { chrono: true, etapes: true } });
  return {
    ok: false, status: res.status, message: res.message,
    // Trois écritures perdues de suite (majSeance) : quelqu'un clique en rafale — c'est aussi un
    // état qui a bougé sous les yeux de l'auteur.
    conflit: res.message === CHRONO_DEJA_AVANCE || res.message.startsWith("La séance vient d'être modifiée"),
    chrono: lireChrono(row?.chrono), deroule: derouleDe(row?.etapes, p),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES PARTICIPANTS D'UNE SÉANCE (§2.4, §12.5)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Un compte qu'on peut montrer parmi les participants : de la guilde, actif, et pas caché par
 *  un bras droit. Un ami (rôle Friend) reste RECRUE, il n'en est donc jamais. */
export const compteVisible = (u: { role: string; isActive: boolean; cacheLe: Date | null }) =>
  GUILD_ROLES.includes(u.role as (typeof GUILD_ROLES)[number]) && u.isActive && !u.cacheLe;

export const figer = (c: Chiffre): ChiffreFige =>
  ({ role: c.role, valeur: c.valeur, texte: c.texte, arme: c.arme, mesureLe: c.mesureLe, aRemesurer: c.aRemesurer });

export type ParticipantsSeance = {
  /** « retenus » dès que le staff en a retenu un ; « annonces » tant que personne ne l'est (Q3). */
  source: "retenus" | "annonces";
  participants: Participant[];
  /** Les annoncés NON retenus : la clôture peut les ajouter, venus quand même. */
  autres: Participant[];
  /** Annonces écartées : un compte hors de la guilde (un ami, un candidat), inactif ou caché. */
  exclus: number;
};

/**
 * Les participants d'une Chambre : les RETENUS, et tant que personne ne l'est, les ANNONCÉS.
 * Chacun est un PERSONNAGE, relié à son compte par son NOM (unique en jeu, pas en base :
 * homonymes départagés), jamais par `charId`, qui change à chaque synchro de l'AirBuilder
 * (piège n° 1). `Presence.player` n'est qu'un départage : c'est le `User.username` du jour de la
 * connexion, qui a pu vieillir (piège n° 2) ; `Presence.userId`, quand il existe, l'emporte.
 *
 * Aucun ami ni membre caché n'en sort : la séance et ses bilans sont des listes de la guilde.
 * Un perso qu'aucun compte ne porte reste dans la liste (spec §12.5), sans chiffre.
 */
export async function participantsSeance(
  db: Db, seance: SeanceParis, etat: CompoState, params: ParametresCS, maintenant = Date.now(),
): Promise<ParticipantsSeance> {
  // Bornée des deux côtés : une séance passée ne reprend pas les annonces faites depuis pour
  // la suivante du même créneau (annoncesDeLaSeance).
  const annonces = annoncesDeLaSeance(etat, seance);
  const retenus = annonces.filter((p) => p.retenu);
  const base = retenus.length ? retenus : annonces;
  const autres = retenus.length ? annonces.filter((p) => !p.retenu) : [];
  if (!annonces.length) return { source: "annonces", participants: [], autres: [], exclus: 0 };

  const noms = [...new Set(annonces.map((p) => p.pseudo.toLowerCase()))];
  const ids = [...new Set(annonces.map((p) => p.userId).filter((x): x is string => !!x))];
  const joueurs = [...new Set(annonces.map((p) => p.player).filter(Boolean))];
  const [persos, comptes] = await Promise.all([
    db.character.findMany({
      where: { OR: noms.map((n) => ({ name: { equals: n, mode: "insensitive" as const } })) },
      select: {
        name: true, class: true, userId: true,
        user: { select: { id: true, username: true, role: true, isActive: true, cacheLe: true } },
        gearProfiles: { select: { mesures: true } },
      },
    }),
    db.user.findMany({
      where: { OR: [{ id: { in: ids } }, ...joueurs.map((j) => ({ username: { equals: j, mode: "insensitive" as const } }))] },
      select: { id: true, username: true, role: true, isActive: true, cacheLe: true },
    }),
  ]);

  const postes = postesEffectifs(params);
  // Le poste d'un pseudo : son inscription, titulaire d'abord.
  const posteDe = new Map<string, string>();
  for (const s of [...etat.signups].sort((a, b) => Number(!!b.selected) - Number(!!a.selected))) {
    const k = s.pseudo.toLowerCase();
    if (s.slotId && !posteDe.has(k)) posteDe.set(k, s.slotId);
  }

  let exclus = 0;
  const resoudre = (p: Presence): Participant | null => {
    const cands = persos.filter((c) => c.name.toLowerCase() === p.pseudo.toLowerCase());
    const vis = cands.filter((c) => compteVisible(c.user));
    const perso = vis.find((c) => p.userId && c.userId === p.userId) ?? departager(vis, p.player, GUILD_ROLES);
    let userId: string | null = perso?.userId ?? null;
    if (!perso) {
      const compte = (p.userId && comptes.find((u) => u.id === p.userId))
        || comptes.find((u) => u.username.toLowerCase() === p.player.toLowerCase());
      if (compte && compteVisible(compte)) userId = compte.id;          // perso renommé, compte connu
      else if (compte || cands.length) { exclus++; return null; }          // hors guilde, inactif ou caché
    }
    const slotId = posteDe.get(p.pseudo.toLowerCase()) ?? null;
    const poste = slotId ? postes.find((x) => x.id === slotId) ?? null : null;
    const cs = rolesDuParticipant(postes, poste?.id ?? null, p.classe);
    const chiffres = perso ? chiffresDuPoste(chiffresParRole(perso.gearProfiles, perso.class, maintenant), cs) : [];
    const type = TYPE_DPS[p.classe] ?? null;
    return {
      pseudo: p.pseudo, classe: p.classe, player: p.player, userId, slotId: poste?.id ?? null,
      poste: poste ? libellePoste(poste, etat.slotMeta) : null,
      retenu: !!p.retenu, ts: p.ts,
      roles: { jumeaux: cs.jumeaux, golems: cs.golems, araignee: cs.araignee },
      type, role: cs.jumeaux === "tank" ? "tank" : (type ?? "phy"),
      chiffres: chiffres.map(figer), enLigne: enLigne(chiffres, cs),
    };
  };

  const participants = base.map(resoudre).filter((x): x is Participant => !!x);
  const restes = autres.map(resoudre).filter((x): x is Participant => !!x);
  return { source: retenus.length ? "retenus" : "annonces", participants, autres: restes, exclus };
}

/** L'état de la composition, tel que le site et le bot le lisent. */
export async function lireCompo(db: Db): Promise<CompoState> {
  const row = await db.compositionState.findUnique({ where: { id: "main" } });
  return normaliserCompo(row?.data);
}

/**
 * Les lignes de participation qu'on peut MONTRER : celles d'un compte de la guilde, actif et
 * pas caché — relu au moment de la lecture, puisqu'un membre a pu être caché ou partir depuis
 * la clôture. Une ligne sans compte (perso qu'aucun compte ne portait) reste.
 */
export async function lignesVisibles<T extends { userId: string | null }>(db: Db, lignes: T[]): Promise<T[]> {
  const ids = [...new Set(lignes.map((l) => l.userId).filter((x): x is string => !!x))];
  if (!ids.length) return lignes;
  const comptes = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true, isActive: true, cacheLe: true } });
  const ok = new Set(comptes.filter(compteVisible).map((u) => u.id));
  return lignes.filter((l) => !l.userId || ok.has(l.userId));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LA CLÔTURE (§4.8) — « Ils étaient là », d'où qu'elle vienne : la route 9 du site et
   /chambre cloturer dans Discord (décision 1) passent ici, avec les mêmes règles
   (`lignesCloture`) et le même verrou de version (`majSeance`).
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Les messages vivants qu'une clôture ferme (« · terminée », boutons retirés). */
const FERMES_A_LA_CLOTURE = ["panneau", "recap", "phase1", "phase2", "chrono"] as const;

export type ResultatCloture =
  | {
    ok: true; seance: SeanceGuilde; presents: number; absents: number; message: string;
    /** Les lignes écrites, pour la réponse de Discord (qui était là, qui ne l'était pas). */
    lignes: { pseudo: string; present: boolean }[];
    /** La séance a un message Discord vivant encore ouvert : il reste à le fermer. */
    aFermer: boolean;
  }
  | { ok: false; status: number; message: string };

/**
 * CLÔTURER UNE SÉANCE : `presents` (les participants cochés, et les annoncés non retenus cochés
 * avec eux) et `ajoutes` (les annoncés non retenus venus quand même). Une ligne
 * `SeanceParticipant` par personnage : `present: true` pour les cochés, `false` pour les
 * participants décochés. Une nouvelle clôture REMPLACE les lignes (effacement puis création, dans
 * la transaction de `majSeance`) : elle ne les double jamais.
 *
 * Refusé, avec sa raison : une séance pas encore commencée (409 — on clôture une séance jouée),
 * annulée (409), sans personne d'annoncé (409), ou un nom qui n'est ni participant ni annoncé
 * (400 — on n'écrit pas un présent que personne n'a annoncé).
 *
 * Chaque ligne retient aussi ce que la répartition donnait à ce perso — ses salles, sa place chez
 * les jumeaux et le rôle tenu ce soir —, lu sous le verrou de la séance, au moment même de la
 * clôture, et ses chiffres DÉCLARÉS de ce soir-là (décision 9).
 */
export async function cloturerSeance(
  db: PrismaClient, s: SeanceParis,
  o: {
    presents: string[]; ajoutes: string[]; par: string; p: ParametresCS; maintenant?: number;
    /** Discord : la liste des participants est-elle bien celle que le message montrait ? Un refus
     *  (sa raison) n'écrit rien — sinon un retenu apparu entre-temps, absent du menu, serait
     *  noté absent sans que personne l'ait décoché. */
    verifier?: (parts: ParticipantsSeance) => string | null;
  },
): Promise<ResultatCloture> {
  const maintenant = o.maintenant ?? Date.now();
  if (s.debut.getTime() > maintenant) {
    return { ok: false, status: 409, message: `La séance du ${s.label} n'a pas encore commencé : on clôture une séance jouée.` };
  }
  const parts = await participantsSeance(db, s, await lireCompo(db), o.p, maintenant);
  const refus = o.verifier?.(parts);
  if (refus) return { ok: false, status: 409, message: refus };
  const { lignes, inconnus } = lignesCloture(parts.participants, parts.autres, o.presents, o.ajoutes);
  if (inconnus.length) return { ok: false, status: 400, message: `Ni participant ni annoncé de cette séance : ${inconnus.join(", ")}.` };
  if (!lignes.length) return { ok: false, status: 409, message: "Personne ne s'est annoncé pour cette séance : il n'y a rien à clôturer." };
  const nPresents = lignes.filter((l) => l.present).length;
  const nAbsents = lignes.length - nPresents;

  const res = await majSeance(
    db, s,
    (x) => (x.annulee
      ? { ok: false, status: 409, message: "Cette séance est annulée : rétablis-la avant de la clôturer." }
      : { ok: true, patch: { clotureAt: new Date(maintenant), cloturePar: o.par.slice(0, 80) } }),
    async (tx, x) => {
      // La répartition de CETTE version de la séance, NETTOYÉE PAR LES PARTICIPANTS — celle que
      // le récap et l'onglet montraient ce soir-là. Un annoncé non retenu, ajouté parce qu'il est
      // venu quand même, n'y tenait aucune place : des salles prises avant que le staff retienne
      // les autres sont restées en base, mais nul ne les voyait, et l'historique ne doit pas les
      // lui attribuer.
      const tous = [...parts.participants, ...parts.autres];
      const rep = nettoyer(lireRepartition(x.repartition), parts.participants, o.p.salles);
      const parPseudo = new Map(tous.map((p) => [cleJoueur(p.pseudo), p]));
      await tx.seanceParticipant.deleteMany({ where: { seanceId: x.id } });
      await tx.seanceParticipant.createMany({
        data: lignes.map((l) => {
          const p = parPseudo.get(cleJoueur(l.pseudo));
          const details = p ? { ...l.details, ...detailsRepartition(rep, p) } : l.details;
          return {
            seanceId: x.id, pseudo: l.pseudo, classe: l.classe, player: l.player, userId: l.userId, slotId: l.slotId,
            present: l.present, details: details as unknown as Prisma.InputJsonValue,
          };
        }),
      });
    },
  );
  if (!res.ok) return res;
  const msgs = (res.seance.messages ?? {}) as Record<string, { ferme?: string } | undefined>;
  return {
    ok: true, seance: res.seance, presents: nPresents, absents: nAbsents,
    lignes: lignes.map((l) => ({ pseudo: l.pseudo, present: l.present })),
    aFermer: FERMES_A_LA_CLOTURE.some((q) => msgs[q] && !msgs[q]!.ferme),
    message: `${nPresents} présence${nPresents > 1 ? "s" : ""} enregistrée${nPresents > 1 ? "s" : ""}${nAbsents ? ` · ${nAbsents} absent${nAbsents > 1 ? "s" : ""}` : ""} — ${s.label}.`,
  };
}

/** ROUVRIR une séance clôturée (`clotureAt = null`) : la répartition se modifie de nouveau, et
 *  une nouvelle clôture remplacera les lignes. */
export async function rouvrirSeance(db: PrismaClient, s: RefSeance): Promise<ResultatSeance> {
  return majSeance(db, s, (x) => (x.clotureAt
    ? { ok: true, patch: { clotureAt: null, cloturePar: null }, message: "Séance rouverte : clôture-la de nouveau pour compter les présences." }
    : { ok: false, status: 409, message: "Cette séance n'est pas clôturée." }));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE DÉBRIEF (§4.10 ; lot 6) — une saisie, d'où qu'elle vienne, et ce qu'on en montre
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type ResultatDebrief = { ok: true; message: string; seance: SeanceGuilde } | { ok: false; status: number; message: string };

/**
 * UNE SAISIE DU DÉBRIEF, écrite sous le verrou de la séance (§5.4). La route 7 du site et le
 * parcours dans Discord (`/chambre debrief`, décision 1) passent ici, avec les règles pures de
 * lib/chambres. Le patch est PARTIEL : deux membres du staff qui notent deux étapes au même
 * moment gardent chacun la sienne (le second relit la séance et y applique son patch).
 *
 * À la première saisie, la liste des étapes du paramétrage se FIGE dans la séance (§3.2), si le
 * chrono ne l'a pas déjà fait : la séance se comparera ensuite étape par étape, sur le code.
 * `debriefPar` : le dernier qui a écrit.
 */
export async function modifierDebrief(
  db: PrismaClient, s: RefSeance, patch: PatchDebrief, par: string,
  p: Pick<ParametresCS, "etapes" | "phases">, maintenant: () => number = Date.now,
): Promise<ResultatDebrief> {
  const calcul = (x: SeanceVierge): Modif => {
    const refus = refusDebrief({ annulee: x.annulee, debut: s.debut }, maintenant());
    if (refus) return { ok: false, status: 409, message: refus };
    const fige = lireDeroule(x.etapes);
    const d = fige ?? { etapes: p.etapes, phases: p.phases };
    const lu = lireDebrief(x.debrief);
    const r = appliquerDebrief({ notes: lu.notes, resultat: lireIssue(x.resultat), aRetenir: x.aRetenir ?? "" }, patch, d.etapes);
    if (!r.ok) return r;
    const data: Prisma.SeanceGuildeUpdateManyMutationInput = {
      debrief: ecrireDebrief({ notes: r.etat.notes, importe: lu.importe }) as Prisma.InputJsonValue,
      resultat: r.etat.resultat, aRetenir: r.etat.aRetenir || null, debriefPar: par.slice(0, 80),
    };
    if (!fige) data.etapes = d as unknown as Prisma.InputJsonValue;
    return { ok: true, patch: data, message: r.message };
  };
  const refus = await refusSansCreer(db, s, calcul);
  if (refus) return refus;
  const res = await majSeance(db, s, calcul);
  return res.ok ? { ok: true, message: res.message ?? "", seance: res.seance } : res;
}

/** Ce que les règles du débrief lisent d'une séance. */
type SeanceVierge = Pick<SeanceGuilde, "annulee" | "etapes" | "debrief" | "resultat" | "aRetenir" | "debriefPublieAt">;
const VIERGE: SeanceVierge = { annulee: false, etapes: null, debrief: null, resultat: null, aRetenir: null, debriefPublieAt: null };

/** Un geste REFUSÉ ne crée pas la séance : `majSeance` la ferait naître avant d'appliquer la
 *  règle, et une séance vide (un chrono illisible, une date à venir) s'afficherait ensuite dans
 *  l'historique. Sans ligne en base, la règle est d'abord jouée sur une séance vierge. */
async function refusSansCreer(db: PrismaClient, s: RefSeance, calcul: (x: SeanceVierge) => Modif): Promise<{ ok: false; status: number; message: string } | null> {
  const existe = await db.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { id: true } });
  if (existe) return null;
  const r = calcul(VIERGE);
  return r.ok ? null : r;
}

/**
 * PUBLIER LE DÉBRIEF SUR LE SITE — la route 8, et « Publier » du parcours Discord : tous les
 * membres le lisent alors dans l'onglet Bilans. L'appelant met ensuite en file la commande
 * `seance_debrief` (lot 7), qui le publie en image dans le salon des débriefs — si la bascule est
 * faite. Publier reste possible quand il manque des statuts : la réponse les nomme (bot.py:1992,
 * :2016). Un débrief VIDE (ni note, ni résultat, ni « à retenir ») ne se publie pas. `retirer` :
 * le débrief repasse en brouillon, les membres ne le voient plus (le message Discord, lui, reste).
 */
export async function marquerDebriefPublie(
  db: PrismaClient, s: RefSeance, par: string, p: Pick<ParametresCS, "etapes" | "phases">,
  o: { retirer?: boolean } = {}, maintenant: () => number = Date.now,
): Promise<ResultatDebrief & { manquants?: string[] }> {
  let manquants: string[] = [];
  const calcul = (x: SeanceVierge): Modif => {
    if (o.retirer) {
      return x.debriefPublieAt
        ? { ok: true, patch: { debriefPublieAt: null }, message: "Le débrief repasse en brouillon : les membres ne le voient plus." }
        : { ok: false, status: 409, message: "Ce débrief n'est pas publié." };
    }
    const refus = refusDebrief({ annulee: x.annulee, debut: s.debut }, maintenant());
    if (refus) return { ok: false, status: 409, message: refus };
    const lu = lireDebrief(x.debrief);
    if (!Object.keys(lu.notes).length && !lireIssue(x.resultat) && !x.aRetenir) {
      return { ok: false, status: 409, message: "Rien à publier : note au moins une étape, ou le résultat." };
    }
    const fige = lireDeroule(x.etapes);
    const d = fige ?? { etapes: p.etapes, phases: p.phases };
    manquants = d.etapes.filter((e) => !lu.notes[e.code]?.statut).map((e) => e.code);
    const data: Prisma.SeanceGuildeUpdateManyMutationInput = { debriefPublieAt: new Date(maintenant()), debriefPar: par.slice(0, 80) };
    if (!fige) data.etapes = d as unknown as Prisma.InputJsonValue;
    return {
      ok: true, patch: data,
      message: `Débrief publié sur le site : tous les membres le lisent dans Bilans.${manquants.length ? ` Étapes sans statut : ${manquants.join(", ")}.` : ""}`,
    };
  };
  const refus = await refusSansCreer(db, s, calcul);
  if (refus) return refus;
  const res = await majSeance(db, s, calcul);
  return res.ok ? { ok: true, message: res.message ?? "", seance: res.seance, manquants } : res;
}

/* ── La publication sur Discord (lot 7 ; §6 `VueSeance.publication`, §8.6) ── */

export type PublicationDiscord = {
  statut: "aucune" | "en_file" | "faite" | "echec";
  /** Le message Discord du débrief (sa jump URL), le dernier publié. */
  lien: string | null;
  /** Le texte brut renvoyé par Discord : le staff seulement. */
  erreur: string | null;
  le: number | null;
};

/** Ce que dit la DERNIÈRE commande `seance_debrief` de la séance (pure). Sans commande, un lien
 *  écrit sur la séance suffit à dire « faite ». */
export function etatPublication(
  cmd: { status: string; result: string | null; createdAt: Date; processedAt: Date | null } | null,
  lien: string | null, staff: boolean,
): PublicationDiscord {
  if (!cmd) return { statut: lien ? "faite" : "aucune", lien, erreur: null, le: null };
  const statut = cmd.status === "PENDING" ? "en_file" : cmd.status === "DONE" ? "faite" : cmd.status === "FAILED" ? "echec" : "en_file";
  return { statut, lien, erreur: staff && statut === "echec" ? cmd.result ?? "raison inconnue" : null, le: (cmd.processedAt ?? cmd.createdAt).getTime() };
}

/** La publication du débrief d'une séance sur Discord, lue dans la file (§6) :
 *  `payload.seanceId === seance.id`, la plus récente. */
export async function publicationDebrief(db: Db, ligne: Pick<SeanceGuilde, "id" | "debriefLien"> | null, staff: boolean): Promise<PublicationDiscord> {
  const cmd = ligne ? await db.botCommand.findFirst({
    where: { type: "seance_debrief", payload: { path: ["seanceId"], equals: ligne.id } }, orderBy: { createdAt: "desc" },
    select: { status: true, result: true, createdAt: true, processedAt: true },
  }) : null;
  return etatPublication(cmd, ligne?.debriefLien ?? null, staff);
}

/** Les séances PUBLIÉES commencées avant celle-ci, de la plus ancienne à la plus récente, avec
 *  leur résumé (corrections du débrief comprises) : ce à quoi l'analyse la compare. */
export async function seancesPrecedentes(db: Db, s: { evenement: string; debut: Date }, p: Pick<ParametresCS, "etapes" | "phases">): Promise<SeanceComparee[]> {
  const rows = await db.seanceGuilde.findMany({
    where: { evenement: s.evenement, debriefPublieAt: { not: null }, annulee: false, debut: { lt: s.debut } },
    orderBy: { debut: "asc" },
    select: { cle: true, date: true, etapes: true, chrono: true, debrief: true, resultat: true, aRetenir: true },
  });
  return rows.map((r) => ({ cle: r.cle, date: r.date, resume: resumeDeSeance(r, p).resume }));
}

/** Un joueur de la séance tel que le débrief le montre : ce que la CLÔTURE a figé — son poste,
 *  son rôle, ses salles, sa place chez les jumeaux, et ses chiffres DÉCLARÉS ce soir-là, datés
 *  (décision 9 : jamais comme des valeurs vérifiées). */
export type JoueurDebrief = {
  pseudo: string; classe: string; player: string; moi: boolean;
  present: boolean | null; poste: string | null; role: "tank" | "mag" | "phy" | null;
  enLigne: string; chiffres: ChiffreFige[];
  salles: string[]; jumeau: Place | null;
};

export type VueDebrief = {
  publie: boolean;
  publieLe: number | null;
  /** Qui a écrit ou publié le débrief (un pseudo du site) ; « Import » pour un débrief repris. */
  par: string | null;
  importe: Pick<ImportDebrief, "joueurs" | "source"> | null;
  /** Les saisies brutes, pour le parcours du staff ; null pour un membre. */
  saisies: { notes: Record<string, NoteEtape>; resultat: IssueSeance | null; aRetenir: string } | null;
  /** Staff : toujours ; membre : une fois publié. */
  resume: ResumeDebrief | null;
  analyse: (AnalyseDebrief & { precedentLabel: string | null }) | null;
  /** Les joueurs de la clôture : les présents pour un membre (débrief publié), tous pour le staff. */
  joueurs: JoueurDebrief[];
  /** Combien ils étaient : les présents de la clôture, sinon le nombre d'un débrief importé. */
  nbJoueurs: number | null;
  nbJoueursSource: "cloture" | "import" | null;
};

/**
 * LE DÉBRIEF D'UNE SÉANCE, TEL QU'ON LE MONTRE (route 4, et la réponse des routes 7 et 8). Un
 * membre ne voit qu'un débrief PUBLIÉ ; le staff voit aussi le brouillon. Les joueurs viennent
 * des lignes de la clôture (`SeanceParticipant`), relues à la lecture : un membre caché ou parti
 * depuis disparaît, un ami n'y a jamais été (seul le paramétrage `degats.bilans` montre leurs
 * chiffres). Pas de séance en base : le déroulé du paramétrage, sans rien de noté.
 */
export async function vueDebrief(
  db: Db, ligne: (SeanceGuilde & { participants?: SeanceParticipant[] }) | null,
  // Le Guild Siege passe son propre paramétrage (lot 9) : ses étapes (vides par défaut) et
  // l'affichage de ses dégâts.
  p: Pick<ParametresCS, "etapes" | "phases" | "degats">,
  o: { staff: boolean; estMoi: (x: { userId: string | null; player: string }) => boolean },
): Promise<VueDebrief> {
  const publie = !!ligne?.debriefPublieAt;
  const voit = o.staff || publie;
  const brut = ligne ?? { etapes: null, chrono: null, debrief: null, resultat: null, aRetenir: null };
  const { debrief, resume } = resumeDeSeance(brut, p, voit);
  let analyse: VueDebrief["analyse"] = null;
  if (voit && ligne) {
    const a = analyseDebrief(resume, await seancesPrecedentes(db, ligne, p));
    analyse = { ...a, precedentLabel: a.precedent ? dateLongue(a.precedent.date) : null };
  }
  const rows = ligne?.participants?.length ? await lignesVisibles(db, ligne.participants) : [];
  const degats = p.degats.bilans;
  const joueurs: JoueurDebrief[] = !voit ? [] : rows.filter((l) => o.staff || l.present === true).map((l) => {
    const d = (l.details ?? {}) as Partial<DetailsParticipant>;
    return {
      pseudo: l.pseudo, classe: l.classe, player: l.player, moi: o.estMoi(l), present: l.present,
      poste: d.poste ?? null, role: d.role === "tank" || d.role === "mag" || d.role === "phy" ? d.role : null,
      enLigne: degats ? d.enLigne ?? "" : "", chiffres: degats && Array.isArray(d.chiffres) ? d.chiffres : [],
      salles: Array.isArray(d.salles) ? d.salles.filter((x): x is string => typeof x === "string") : [],
      jumeau: estPlace(d.jumeau) ? d.jumeau : null,
    };
  }).sort((a, b) => Number(b.present === true) - Number(a.present === true) || a.pseudo.localeCompare(b.pseudo, "fr"));
  const presents = ligne?.clotureAt ? rows.filter((l) => l.present === true).length : null;
  const nbJoueurs = presents ?? debrief.importe?.joueurs ?? null;
  return {
    publie, publieLe: ligne?.debriefPublieAt?.getTime() ?? null,
    par: voit ? ligne?.debriefPar ?? null : null,
    importe: debrief.importe ? { joueurs: debrief.importe.joueurs, source: debrief.importe.source } : null,
    saisies: o.staff ? { notes: debrief.notes, resultat: lireIssue(ligne?.resultat), aRetenir: ligne?.aRetenir ?? "" } : null,
    resume: voit ? resume : null,
    analyse,
    joueurs,
    nbJoueurs,
    nbJoueursSource: presents !== null ? "cloture" : debrief.importe?.joueurs ? "import" : null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE GUILD SIEGE (§11 ; lot 9) — les annonces vivent dans `SeanceParticipant`, une ligne par
   annonce « Je viens » (`annonceAt`, `present: null`), complétée à la clôture. La route 12 du
   site et les boutons du panneau Discord passent par `inscrireGS` ; la route 9 et Discord par
   `cloturerGS` : les mêmes règles (lib/evenements), le même verrou de version.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Un joueur du siège, tel qu'on le montre — jamais son compte : `moi` le remplace côté route. */
export type JoueurGS = {
  pseudo: string; classe: string; player: string; userId: string | null;
  annonceAt: number; present: boolean | null;
  /** Le rôle du chiffre montré (dps, à défaut tank, à défaut off tank), null : sans mesure. */
  role: RoleMesure | null;
  chiffres: ChiffreFige[]; enLigne: string;
};

const versAnnonce = (l: Pick<SeanceParticipant, "pseudo" | "classe" | "player" | "userId" | "annonceAt" | "present" | "createdAt">): AnnonceGS => ({
  pseudo: l.pseudo, classe: l.classe, player: l.player, userId: l.userId,
  annonceAt: (l.annonceAt ?? l.createdAt).getTime(), present: l.present,
});

/** Le chiffre DÉCLARÉ d'un perso pour le siège, figé (§11.2 : DPS, à défaut Tank, à défaut Off
 *  tank) ; rien s'il n'a rien mesuré. */
export function chiffreGS(stuffs: { mesures: unknown }[], classe: string, maintenant: number): Pick<JoueurGS, "role" | "chiffres" | "enLigne"> {
  const c = choisirStuff(stuffs, ROLES_GS, classe, maintenant);
  return c ? { role: c.role, chiffres: [figer(c)], enLigne: enLigne([c], rolesAffichageGS(c.role)) } : { role: null, chiffres: [], enLigne: "" };
}

/**
 * Les annoncés du siège qu'on peut MONTRER : les lignes d'un compte de la guilde, actif et pas
 * caché — relu maintenant, un membre a pu être caché depuis son annonce (un ami n'a jamais pu
 * s'annoncer : la route et le bot relisent son rang). Dans l'ordre d'annonce. Le chiffre est
 * celui d'aujourd'hui tant que la séance n'est pas clôturée ; ensuite, celui que la clôture a
 * figé (décision 9 : ce que chacun déclarait CE SOIR-LÀ).
 */
export async function joueursGS(db: Db, lignes: SeanceParticipant[], o: { cloturee: boolean; maintenant?: number }): Promise<JoueurGS[]> {
  const maintenant = o.maintenant ?? Date.now();
  const visibles = (await lignesVisibles(db, lignes)).sort((a, b) => (a.annonceAt ?? a.createdAt).getTime() - (b.annonceAt ?? b.createdAt).getTime());
  const ids = [...new Set(visibles.map((l) => l.userId).filter((x): x is string => !!x))];
  const persos = !o.cloturee && ids.length
    ? await db.character.findMany({ where: { userId: { in: ids } }, select: { name: true, class: true, userId: true, gearProfiles: { select: { mesures: true } } } })
    : [];
  return visibles.map((l) => {
    const a = versAnnonce(l);
    if (o.cloturee) {
      const d = (l.details ?? {}) as Partial<DetailsParticipant> & { roleMesure?: RoleMesure | null };
      return { ...a, role: d.roleMesure ?? null, chiffres: Array.isArray(d.chiffres) ? d.chiffres : [], enLigne: d.enLigne ?? "" };
    }
    const perso = persos.find((c) => c.userId === l.userId && c.name.toLowerCase() === l.pseudo.toLowerCase());
    return { ...a, ...(perso ? chiffreGS(perso.gearProfiles, perso.class, maintenant) : { role: null, chiffres: [], enLigne: "" }) };
  });
}

/** Ce que la ligne d'un annoncé du siège garde : son chiffre de ce moment-là (l'historique le
 *  relit une fois la séance clôturée). `role` est celui des listes (tank ou type de DPS). */
const detailsGS = (classe: string, c: Pick<JoueurGS, "role" | "chiffres" | "enLigne">) => ({
  poste: null, role: c.role === "dps" || !c.role ? (TYPE_DPS[classe] ?? "phy") : "tank",
  roleMesure: c.role, chiffres: c.chiffres, enLigne: c.enLigne, salles: [], jumeau: null,
});

export type ResultatGS =
  | { ok: true; geste: Extract<GesteGS, { ok: true }>; annonces: number; seance: SeanceGuilde | null }
  | { ok: false; status: number; message: string; annulee?: true };

/**
 * « JE VIENS » OU « PAS CETTE FOIS » AU GUILD SIEGE (§6 route 12 ; boutons du panneau GS). Le
 * perso a déjà été vérifié par l'appelant : il est AU compte (`Character.userId`). Les refus
 * passent AVANT de créer la séance (une séance vide s'afficherait dans les bilans). L'écriture se
 * fait sous le verrou de version de la séance : deux clics simultanés (le site et Discord, ou un
 * double clic) relisent les annonces, et un compte n'a jamais deux persos annoncés.
 */
export async function inscrireGS(
  db: PrismaClient, s: SeanceParis,
  o: { compte: Compte; perso: { name: string; class: string; gearProfiles?: { mesures: unknown }[] } | null; viens: boolean; p: ParametresGS; maintenant?: number },
): Promise<ResultatGS> {
  const now = o.maintenant ?? Date.now();
  for (let essai = 0; essai < 4; essai++) {
    const ligne = await db.seanceGuilde.findUnique({ where: { cle: s.cle }, include: { participants: true } });
    const refus = refusInscriptionGS({ actif: o.p.actif, seance: s, creneaux: o.p.creneaux, now: new Date(now), annulee: !!ligne?.annulee, cloturee: !!ligne?.clotureAt });
    if (refus) return { ok: false, ...refus };
    const rows = ligne?.participants ?? [];
    const visibles = new Set((await lignesVisibles(db, rows)).map((l) => l.pseudo.toLowerCase()));
    const g = gesteGS(rows.map(versAnnonce), {
      compte: o.compte, perso: o.perso, viens: o.viens, places: o.p.places, label: s.label,
      visible: (a) => visibles.has(a.pseudo.toLowerCase()),
    });
    if (!g.ok) return g;
    if (g.quoi === "deja" || g.quoi === "rien") return { ok: true, geste: g, annonces: visibles.size, seance: ligne };
    if (!ligne) {
      // La séance naît au premier geste ; on relit ensuite ses annonces, pour décider sur elles
      // (une annonce posée entre-temps par un autre clic ne passe pas inaperçue).
      await db.seanceGuilde.upsert({ where: { cle: s.cle }, create: { cle: s.cle, evenement: s.evenement, date: s.date, creneau: s.creneau, debut: s.debut }, update: {} })
        .catch((e) => { if ((e as { code?: string })?.code !== "P2002") throw e; });
      continue;
    }
    const chiffre = g.ajout && o.perso?.gearProfiles ? chiffreGS(o.perso.gearProfiles, o.perso.class, now) : { role: null, chiffres: [], enLigne: "" };
    try {
      await db.$transaction(async (tx) => {
        const n = await tx.seanceGuilde.updateMany({ where: { id: ligne.id, version: ligne.version }, data: { version: { increment: 1 } } });
        if (n.count !== 1) throw CONFLIT;
        if (g.retires.length) await tx.seanceParticipant.deleteMany({ where: { seanceId: ligne.id, pseudo: { in: g.retires } } });
        if (g.ajout) {
          await tx.seanceParticipant.create({
            data: {
              seanceId: ligne.id, pseudo: g.ajout.pseudo, classe: g.ajout.classe, player: o.compte.username, userId: o.compte.id,
              annonceAt: new Date(now), present: null, details: detailsGS(g.ajout.classe, chiffre) as unknown as Prisma.InputJsonValue,
            },
          });
        }
      });
    } catch (e) {
      // Le verrou a bougé, ou le même perso vient d'être posé par un autre clic : on relit.
      if (e === CONFLIT || (e as { code?: string })?.code === "P2002") continue;
      throw e;
    }
    const apres = await db.seanceGuilde.findUnique({ where: { id: ligne.id }, include: { participants: true } });
    const n = apres ? (await lignesVisibles(db, apres.participants)).length : 0;
    return { ok: true, geste: g, annonces: n, seance: apres };
  }
  return { ok: false, status: 409, message: "Le Guild Siege vient d'être modifié. Recharge et réessaie." };
}

/**
 * LA CLÔTURE DU SIÈGE (§4.8, §11.2) : parmi les annoncés visibles, les cochés sont présents, les
 * autres absents ; leur chiffre DÉCLARÉ du moment est figé sur leur ligne. Une nouvelle clôture
 * réécrit `present` (les lignes ne se doublent jamais : ce sont les annonces). Refusée : une
 * séance pas encore commencée, annulée, sans annoncé, ou un nom qui n'est pas annoncé (400).
 */
export async function cloturerGS(
  db: PrismaClient, s: SeanceParis, o: { presents: string[]; par: string; maintenant?: number },
): Promise<ResultatCloture> {
  const maintenant = o.maintenant ?? Date.now();
  if (s.debut.getTime() > maintenant) {
    return { ok: false, status: 409, message: `Le Guild Siege du ${s.label} n'a pas encore commencé : on clôture une séance jouée.` };
  }
  const ligne = await db.seanceGuilde.findUnique({ where: { cle: s.cle }, include: { participants: true } });
  if (ligne?.annulee) return { ok: false, status: 409, message: "Ce Guild Siege est annulé : rétablis-le avant de le clôturer." };
  const joueurs = ligne ? await joueursGS(db, ligne.participants, { cloturee: false, maintenant }) : [];
  if (!joueurs.length) return { ok: false, status: 409, message: "Personne ne s'est annoncé pour ce Guild Siege : il n'y a rien à clôturer." };
  const { lignes, inconnus } = clotureGS(joueurs, o.presents);
  if (inconnus.length) return { ok: false, status: 400, message: `Pas annoncé pour ce Guild Siege : ${inconnus.join(", ")}.` };
  const nPresents = lignes.filter((l) => l.present).length;
  const nAbsents = lignes.length - nPresents;
  const res = await majSeance(
    db, s,
    (x) => (x.annulee
      ? { ok: false, status: 409, message: "Ce Guild Siege est annulé : rétablis-le avant de le clôturer." }
      : { ok: true, patch: { clotureAt: new Date(maintenant), cloturePar: o.par.slice(0, 80) } }),
    async (tx, x) => {
      for (const l of lignes) {
        const j = joueurs.find((y) => y.pseudo === l.pseudo)!;
        await tx.seanceParticipant.updateMany({
          where: { seanceId: x.id, pseudo: l.pseudo },
          data: { present: l.present, details: detailsGS(j.classe, j) as unknown as Prisma.InputJsonValue },
        });
      }
    },
  );
  if (!res.ok) return res;
  const msgs = (res.seance.messages ?? {}) as Record<string, { ferme?: string } | undefined>;
  return {
    ok: true, seance: res.seance, presents: nPresents, absents: nAbsents, lignes,
    aFermer: !!msgs.panneau && !msgs.panneau.ferme,
    message: `${nPresents} présence${nPresents > 1 ? "s" : ""} enregistrée${nPresents > 1 ? "s" : ""}${nAbsents ? ` · ${nAbsents} absent${nAbsents > 1 ? "s" : ""}` : ""} — Guild Siege du ${s.label}.`,
  };
}
