// ════════════════════════════════════════════════════════════
//  LES CHAMBRES SECRÈTES SUR DISCORD — notre bot reprend l'inscription et les rappels
//  (SPEC-CHAMBRES-RECENSEMENT §8.1, §8.5, §4.12 ; lot 3).
//
//  - UN TICK PAR MINUTE (`tickSeances`) remplace les tâches cron fixes des Chambres et du
//    Guild Siege : il lit l'heure de Paris, les interrupteurs et le paramétrage des bras
//    droits (en base, cache de 30 s), et envoie ce qui est dû — une fois, grâce au marqueur
//    réclamé sous verrou (`majSeance`).
//  - DES MESSAGES VIVANTS : le panneau d'inscription est modifié en place quand l'état change,
//    que le geste vienne du site ou de Discord (`synchroniserMessages`, toutes les 15 s, et
//    tout de suite après un clic). Il n'est modifié que si son contenu a changé.
//  - DES BOUTONS SANS ÉTAT : `cs:viens:<clé>`, `cs:absent:<clé>`, `cs:choix:<clé>`,
//    `cs:poste:<clé>:<perso>`. Le clic relit TOUT en base : un redémarrage ne casse rien.
//  - LA GARDE DE CHAQUE GESTE : le compte retrouvé EN BASE par `discordId`, membre de la
//    guilde et actif (le serveur Discord compte aussi des visiteurs, des candidats et des
//    amis) ; `isStaff` pour les gestes du staff. Rien ne se décide sur le seul fait d'avoir pu
//    cliquer : un bouton est visible de tous ceux qui voient le salon.
//
//  LOT 4 — LA RÉPARTITION DES PHASES (§4.3, §4.4, §4.6 ; M5, M10 ; décision 1 de Maxime) :
//  - le RÉCAP part à 20 h 40 (rappel « recap ») et reste VIVANT jusqu'à la clôture : une salle
//    changée sur le site se voit dans Discord à la synchro suivante (15 s) ;
//  - 📍 MES POSITIONS répond en éphémère, avec deux menus par perso (ses salles, son équipe) ;
//  - deux messages à BOUTONS, publiés par le staff (/chambre repartition, ou le site) : les
//    salles des Asuras et les équipes des Jumeaux, comme chez Dracarys, plus les menus du staff
//    (compléter, placer, échanger). Tout geste passe par `modifierRepartition` — la même
//    fonction, les mêmes règles (lib/chambres) que la route 5 du site.
//
//  LOT 5 — LE CHRONO EN DIRECT (§4.9 ; M6) : un message vivant de plus, publié par le staff
//  (/chambre chrono, « Publier dans Discord » sur le site, ou le rappel « chrono »). Ses boutons
//  (Démarrer, Fin : …, Annuler le dernier clic, Arrêter) écrivent par `modifierChrono`, la même
//  fonction que la route 6 du site : un clic sur le site et un clic ici au même instant ne
//  font qu'une seule fin. Pendant que le chrono tourne, son message suit le site toutes les 10 s.
//
//  LOT 6 bis — LA CLÔTURE ET LE DÉBRIEF DEPUIS DISCORD (décision 1 ; §4.8, §4.10) : comme
//  `ClotureView`, `DebriefView`, `EtapeModal` et `ARetenirModal` du modèle, le staff coche qui
//  était là (/chambre cloturer), puis note le débrief étape par étape (/chambre debrief) : statut,
//  chrono et remarque, gagné ou perdu, « à retenir », publier — dans un message ÉPHÉMÈRE. Les
//  écritures sont celles du site (`cloturerSeance`, `modifierDebrief`, `marquerDebriefPublie`),
//  sous le même verrou de version : ce qui est noté ici se lit dans l'onglet Bilans, et inversement.
//
//  LOT 7 — LE DÉBRIEF PUBLIÉ SUR DISCORD (§4.11, §8.6 ; M7) : « Publier » (le site, ou le
//  parcours Discord) met en file `seance_debrief` ; `publierDebrief` relit tout en base, rend
//  l'image (src/lib/seance-image.ts) et l'envoie avec l'embed M7 dans le salon des débriefs — un
//  fil si c'est un forum. Après la bascule seulement : avant, le bot Python publie les siens.
//
//  LOT 8 — LES VIDÉOS DE DÉBRIEF (§10) : le bloc 🎬 de M7 liste les vidéos de la séance, chacune
//  menant à la page du débrief, lecteur ouvert au bon moment ; `purgerLesVideos` nettoie le
//  volume chaque nuit (fichiers trop anciens, envois abandonnés, fichiers oubliés).
//
//  LOT 9 — LE GUILD SIEGE (§11 ; décision 2 : codé, réglable, INACTIF tant que le staff ne
//  l'allume pas). Son panneau est vivant (`gs:viens`, `gs:absent`, `gs:choix` : un perso par
//  compte et par séance, par `inscrireGS` — la route 12 du site) ; ses rappels « dans 1 h » et
//  au staff partent du même tick ; sa clôture ferme le panneau ; son débrief part en embed, sans
//  image. Rien ne part tant qu'il est éteint : `actif` et l'interrupteur `gs_rappels_actifs`.
//
//  LOT 10 — LES ÉCHANGES ET L'ÉQUILIBRAGE (§4.4, §4.5 ; décision 1) : 🔄 Échanges (le bouton de
//  📍 Mes positions) pour demander la place d'un autre ou répondre ; la demande part au joueur
//  visé en MESSAGE PRIVÉ (✅ Accepter, ❌ Refuser — jamais dans le salon), la réponse au
//  demandeur, après la bascule seulement ; une demande faite sur le site arrive par la commande
//  `seance_echange`. « Équilibrer (staff) » sur le message des jumeaux, après un aperçu.
//
//  Les règles sont dans les modules purs (lib/evenements, lib/compositions, lib/chambres,
//  ./seances-messages) : ce fichier lit, appelle, et parle à Discord.
// ════════════════════════════════════════════════════════════
import {
  ChannelFlags, ChannelType, MessageFlags, PermissionFlagsBits,
  type ButtonInteraction, type ChatInputCommandInteraction, type Client, type ForumChannel, type GuildBasedChannel, type GuildMember, type GuildTextBasedChannel,
  type ModalSubmitInteraction, type StringSelectMenuInteraction,
} from "discord.js";
import { Prisma, type SeanceGuilde, type SeanceParticipant } from "@prisma/client";
import { prisma } from "./prisma.js";
import { isStaff } from "./permissions.js";
import { CHANNELS, SALON_CS_DEFAUT, SITE_URL } from "../config.js";
import { canAccessAdmin } from "@/config/roles";
import { classeAffichee, nbPlaces, phraseManques, type CompoState } from "@/lib/compositions";
import { modifierCompo } from "@/lib/compositions-serveur";
import { lireCompo, lireParametres, majSeance, modifierChrono, modifierRepartition, participantsSeance, type ParticipantsSeance } from "@/lib/seances-serveur";
import { cloturerSeance, lignesVisibles, marquerDebriefPublie, modifierDebrief, rouvrirSeance, vueDebrief } from "@/lib/seances-serveur";
import { inscrireGS, joueursGS, type JoueurGS } from "@/lib/seances-serveur";
import {
  JOURS_LONGS, RAPPELS_CS_DEFAUT, annonceAnnulation, annoncer, remplirTexte, annoncesDeLaSeance, conditionRemplie, dateLongue, delaiDit, derouleDe, everyoneRecent, heureDite,
  inscrireAuPoste, instantRappel, jourDeDate, libellePoste, liberer, marquerFait, mentionsDuRappel, partiesParis, persosJouables, planDuTick,
  posteDuPseudo, postesDeLaClasse, postesEffectifs, prochaineSeanceGS, prochaineSeanceParis, publicationPermise, reclamer, refusEnvoi, refusMembre, retirerAnnonces,
  resoudreCle, rolesDuParticipant, seanceCS, seanceCouranteParis, seanceDuBouton, seanceGS,
  type Compte, type Etape, type Evenement, type MentionCalculee, type ParametresCS, type ParametresGS, type Participant, type Poste, type RappelDef,
  type RappelDu, type SeanceParis,
} from "@/lib/evenements";
import {
  cleJoueur, ecartJumeaux, equipesJumeaux, estPlace, lireChrono, lireRepartition, nettoyer, positionsDe, recap, refusChronoSeance,
  type ActionRepartition, type Chrono, type Repartition,
} from "@/lib/chambres";
import { DUREE_DEMANDE_MS, enAttente, equilibrerJumeaux, texteDemande, vueRepartition, type EchangeFait, type VueDemande } from "@/lib/chambres";
import { dm } from "./mp.js";
import { DEBRIEF_CONFLIT, avantDuPatch, estStatut, lireIssue, resumeDeSeance, texteDuPatch, type IssueSeance, type PatchDebrief, type SeanceBrute } from "@/lib/chambres";
import { lireDeroule } from "@/lib/evenements";
import { RAPPELS_GS_DEFAUT, ajouterJours, creneauDe, manqueGS, publicationPermiseGS, type CreneauGS } from "@/lib/evenements";
import { hoteDuSite, imageDeLaSeance } from "@/lib/seance-image";
import { trierVideos } from "@/lib/videos";
import { purgerVideos } from "@/lib/videos-serveur";
import * as M from "./seances-messages.js";

const EPH = MessageFlags.Ephemeral;
const SIX_HEURES = 6 * 3_600_000;
const SANS_MENTION = { parse: [] as [] };

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE PARAMÉTRAGE, LES INTERRUPTEURS ET LES SALONS
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Le paramétrage lu en base, gardé 30 s : le tick le lit chaque minute, la synchro toutes
 *  les 15 s. Un enregistrement sur /discord/evenements s'applique donc en moins d'une minute,
 *  sans redémarrer le bot. Une commande du site (essai, publication) le relit frais. */
const CACHE_MS = 30_000;
const cache: Partial<Record<Evenement, { t: number; data: ParametresCS | ParametresGS }>> = {};
export async function parametres(ev: "cs", frais?: boolean): Promise<ParametresCS>;
export async function parametres(ev: "gs", frais?: boolean): Promise<ParametresGS>;
export async function parametres(ev: Evenement, frais = false): Promise<ParametresCS | ParametresGS> {
  const c = cache[ev];
  if (!frais && c && Date.now() - c.t < CACHE_MS) return c.data;
  const { data } = await lireParametres(prisma, ev);
  cache[ev] = { t: Date.now(), data };
  return data;
}

/** L'interrupteur général d'un événement (Setting `cs_rappels_actifs`, piloté depuis /discord) :
 *  coupé par défaut, et coupé si la base ne répond pas — on se tait plutôt que de risquer un
 *  @everyone non voulu. */
export async function interrupteur(cle: string): Promise<boolean> {
  try {
    const r = await prisma.setting.findUnique({ where: { key: cle } });
    return r?.value === "1";
  } catch {
    return false;
  }
}

const ENV_SALONS: M.EnvSalons = { cs: CHANNELS.cs, csDebrief: CHANNELS.csDebrief, gs: CHANNELS.gs, staff: CHANNELS.staff, defaut: SALON_CS_DEFAUT };
export async function salons() {
  const [cs, gs] = await Promise.all([parametres("cs"), parametres("gs")]);
  return M.resoudreSalons(cs, gs, ENV_SALONS);
}

async function salonTexte(client: Client, id: string): Promise<GuildTextBasedChannel | null> {
  if (!id) return null;
  const ch = await client.channels.fetch(id).catch(() => null);
  if (!ch || ch.isDMBased() || !ch.isTextBased()) return null;
  return ch as GuildTextBasedChannel;
}

/** Un salon du serveur, quel que soit son type (texte, annonces, forum) ; null : introuvable, ou
 *  fermé au bot. */
async function salonGuilde(client: Client, id: string): Promise<GuildBasedChannel | null> {
  if (!id) return null;
  const ch = await client.channels.fetch(id).catch(() => null);
  return ch && !ch.isDMBased() ? (ch as GuildBasedChannel) : null;
}

/** Fermé à @everyone ? C'est la condition pour y publier des chiffres (§8.3, M1). */
function fermeAuxVisiteurs(ch: GuildBasedChannel): boolean {
  const perms = ch.permissionsFor(ch.guild.roles.everyone);
  return !!perms && !perms.has(PermissionFlagsBits.ViewChannel);
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES MESSAGES VIVANTS D'UNE SÉANCE (`SeanceGuilde.messages`)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

type RefMessage = { canal: string; id: string; lien: string; at: number; ferme?: "terminee" | "annulee" | "remplace" | "supprime" };
type Messages = {
  panneau?: RefMessage; places?: RefMessage; jour?: RefMessage; veille?: RefMessage; annulation?: RefMessage;
  /** Lot 9 : le rappel du Guild Siege au staff (« pensez à inscrire la guilde »). */
  staff?: RefMessage;
  /** Lot 4 : le récap de 20 h 40, et les deux messages à boutons de la répartition. */
  recap?: RefMessage; phase1?: RefMessage; phase2?: RefMessage;
  /** Lot 5 : le chrono en direct (M6). */
  chrono?: RefMessage;
  anciens?: RefMessage[];
};
/** Les messages VIVANTS d'une séance : modifiés en place à chaque changement, fermés à la
 *  clôture ou 6 h après le début. Les rappels (places, jour…) ne bougent plus une fois partis. */
const VIVANTS = ["panneau", "recap", "phase1", "phase2", "chrono"] as const;
type Vivant = (typeof VIVANTS)[number];

const lireRef = (v: unknown): RefMessage | undefined => {
  const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  if (!o || typeof o.canal !== "string" || typeof o.id !== "string") return undefined;
  return { canal: o.canal, id: o.id, lien: typeof o.lien === "string" ? o.lien : "", at: typeof o.at === "number" ? o.at : 0, ...(typeof o.ferme === "string" ? { ferme: o.ferme as RefMessage["ferme"] } : {}) };
};
export function lireMessages(json: unknown): Messages {
  const o = json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
  const out: Messages = {};
  for (const k of ["panneau", "places", "jour", "veille", "annulation", "staff", "recap", "phase1", "phase2", "chrono"] as const) { const r = lireRef(o[k]); if (r) out[k] = r; }
  if (Array.isArray(o.anciens)) out.anciens = o.anciens.map(lireRef).filter((x): x is RefMessage => !!x).slice(-10);
  return out;
}
const enJson = (m: Messages) => m as unknown as Prisma.InputJsonValue;

/** Le dernier rendu envoyé, par message : on ne modifie un message que si son contenu a changé
 *  (`editer_si_change` du modèle) — les limites de débit de Discord (piège n° 19). L'heure de
 *  mise à jour n'entre pas dans la comparaison. */
const dernierRendu = new Map<string, string>();
const empreinte = (m: M.MessageSeance) => JSON.stringify({ e: m.embeds.map(({ timestamp: _t, ...x }) => x), c: m.components });

async function envoyer(ch: GuildTextBasedChannel, m: M.MessageSeance): Promise<RefMessage> {
  const sent = await ch.send({ content: m.content, embeds: m.embeds, components: m.components, allowedMentions: m.allowedMentions });
  dernierRendu.set(sent.id, empreinte(m));
  return { canal: ch.id, id: sent.id, lien: sent.url, at: Date.now() };
}

const MESSAGE_INCONNU = 10008;
const codeDiscord = (e: unknown) => (e as { code?: number })?.code;

async function editerSiChange(client: Client, ref: RefMessage, m: M.MessageSeance): Promise<"ok" | "inchange" | "disparu" | "inaccessible"> {
  const e = empreinte(m);
  if (dernierRendu.get(ref.id) === e) return "inchange";
  const ch = await salonTexte(client, ref.canal);
  if (!ch) return "inaccessible";
  try {
    // Une modification ne notifie personne ; `allowedMentions` vide le garantit.
    await ch.messages.edit(ref.id, { embeds: m.embeds, components: m.components, allowedMentions: SANS_MENTION });
    dernierRendu.set(ref.id, e);
    return "ok";
  } catch (err) {
    if (codeDiscord(err) === MESSAGE_INCONNU) return "disparu";
    throw err;
  }
}

/** Ferme un message : titre suivi de « · terminée » (ou annulée, remplacé), barre anthracite,
 *  boutons retirés — comme le modèle (`bot.py:1429-1445`). */
async function fermerMessage(client: Client, ref: RefMessage, raison: "terminee" | "annulee" | "remplace"): Promise<"ok" | "disparu" | "inaccessible"> {
  const ch = await salonTexte(client, ref.canal);
  if (!ch) return "inaccessible";
  try {
    const msg = await ch.messages.fetch(ref.id);
    const e = msg.embeds[0]?.toJSON();
    const suffixe = { terminee: " · terminée", annulee: " · annulée", remplace: " · remplacé" }[raison];
    const titre = (e?.title ?? "").replace(/ · (terminée|annulée|remplacé)$/, "");
    await msg.edit({ embeds: e ? [{ ...e, title: `${titre}${suffixe}`.slice(0, 256), color: M.COULEUR.anthracite }] : [], components: [], allowedMentions: SANS_MENTION });
    dernierRendu.delete(ref.id);
    return "ok";
  } catch (err) {
    if (codeDiscord(err) === MESSAGE_INCONNU) return "disparu";
    throw err;
  }
}

/** Range un message dans la séance, sous le verrou de version. */
async function ranger(s: SeanceParis, fn: (m: Messages) => void) {
  return majSeance(prisma, s, (x) => {
    const m = lireMessages(x.messages);
    fn(m);
    return { ok: true, patch: { messages: enJson(m) } };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   CE QUE LES MESSAGES DISENT D'UNE SÉANCE
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

type Contexte = {
  s: SeanceParis;
  etat: CompoState;
  parts: ParticipantsSeance;
  /** Tous les annoncés VISIBLES (ni ami, ni membre caché), dans l'ordre d'annonce. */
  tous: Participant[];
  postes: Poste[];
  places: number;
  /** Ce qui manque aux annonces (panneau, 13 h 30, 18 h 30) ; aux participants (20 h). */
  manqueAnnonces: string | null;
  manqueParticipants: string | null;
  joueur: (x: Participant) => M.JoueurRecap;
  /** userId → discordId, pour mentionner les participants. */
  discord: Map<string, string>;
};

async function contexte(s: SeanceParis, p: ParametresCS): Promise<Contexte> {
  const etat = await lireCompo(prisma);
  const parts = await participantsSeance(prisma, s, etat, p);
  const tous = [...parts.participants, ...parts.autres].sort((a, b) => a.ts - b.ts);
  const postes = postesEffectifs(p);
  const ids = [...new Set(parts.participants.map((x) => x.userId).filter((x): x is string => !!x))];
  const comptes = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, discordId: true } }) : [];
  return {
    s, etat, parts, tous, postes,
    places: nbPlaces(postes),
    manqueAnnonces: phraseManques(tous, postes),
    manqueParticipants: phraseManques(parts.participants, postes),
    joueur: (x) => ({ pseudo: x.pseudo, classe: x.classe, slotId: x.slotId, retenu: x.retenu, chiffres: x.chiffres, cs: rolesDuParticipant(postes, x.slotId, x.classe), roles: x.roles }),
    discord: new Map(comptes.map((u) => [u.id, u.discordId])),
  };
}

const lienCompo = () => (SITE_URL ? `${SITE_URL}/compositions?onglet=inscription` : "");

function variables(c: Contexte): Record<string, string> {
  return {
    date: dateLongue(c.s.date), heure: heureDite(partiesParis(c.s.debut).hhmm),
    annonces: String(c.tous.length), retenus: String(c.tous.filter((x) => x.retenu).length), places: String(c.places),
    manque: c.manqueAnnonces ?? "personne", lien: lienCompo(),
  };
}

const jourJ = (s: SeanceParis) => partiesParis(new Date()).date === s.date;

/** Le panneau M1 de la séance, dans l'état demandé. */
function composerPanneau(c: Contexte, p: ParametresCS, etat: M.EtatPanneau, chiffres: boolean): M.MessageSeance {
  const veille = p.rappels.find((r) => r.id === "veille") ?? p.rappels.find((r) => r.type === "panneau");
  return M.messagePanneau({
    cle: c.s.cle, label: c.s.label, etat, jourJ: jourJ(c.s),
    texte: veille?.texte ?? RAPPELS_CS_DEFAUT[0].texte, vars: variables(c),
    postes: c.postes, slotMeta: c.etat.slotMeta, joueurs: c.tous.map(c.joueur),
    places: c.places, manque: c.manqueAnnonces, chiffres, site: SITE_URL, maj: Date.now(),
  });
}
async function rendrePanneau(s: SeanceParis, p: ParametresCS, etat: M.EtatPanneau, chiffres: boolean): Promise<M.MessageSeance> {
  return composerPanneau(await contexte(s, p), p, etat, chiffres);
}

/** Le récap (§4.6) des participants de la séance, avec la répartition donnée. */
function recapDe(c: Contexte, p: ParametresCS, rep: Repartition) {
  return recap(c.parts.participants.map(c.joueur), rep, p, c.places);
}

/** M5 — le récap, dans l'état demandé. Sa phrase est celle du rappel « recap » du paramétrage. */
function composerRecap(c: Contexte, p: ParametresCS, rep: Repartition, etat: M.EtatPanneau, chiffres: boolean): M.MessageSeance {
  const r = p.rappels.find((x) => x.type === "recap") ?? RAPPELS_CS_DEFAUT.find((x) => x.type === "recap")!;
  return M.messageRecap({
    cle: c.s.cle, jour: dateLongue(c.s.date), etat, recap: recapDe(c, p, rep), source: c.parts.source,
    texte: r.texte, vars: variables(c), chiffres, positions: p.nouveauxMessages, site: SITE_URL, maj: Date.now(),
  });
}

/** Les deux messages à boutons de la répartition (Phase 1 : les salles ; Phase 2 : les jumeaux). */
function composerPhase(quoi: "phase1" | "phase2", c: Contexte, p: ParametresCS, brut: Repartition, etat: M.EtatPanneau, chiffres: boolean): M.MessageSeance {
  const joueurs = c.parts.participants.map(c.joueur);
  const rep = nettoyer(brut, joueurs, p.salles);
  const jour = dateLongue(c.s.date);
  // La consigne en tête de chaque message vient du paramétrage (décision 5), avec les variables
  // des autres textes ({date}, {heure}…).
  const vars = variables(c);
  if (quoi === "phase1") {
    return M.messagePhase1({
      cle: c.s.cle, jour, etat, texte: p.textes.phase1, vars, site: SITE_URL, maj: Date.now(),
      salles: p.salles.map((x) => ({ ...x, j: joueurs.find((j) => cleJoueur(j.pseudo) === rep.salles[x.cle]) ?? null })),
    });
  }
  const equipes = equipesJumeaux(rep, joueurs);
  return M.messagePhase2({
    cle: c.s.cle, jour, etat, equipes, ecart: ecartJumeaux(equipes.vert.totalDps, equipes.rouge.totalDps), texte: p.textes.phase2, vars, chiffres, site: SITE_URL, maj: Date.now(),
  });
}

/** M6 — le chrono, dans l'état demandé. Sa phrase d'attente est celle du rappel « chrono » du
 *  paramétrage ; ses étapes, celles que la séance a figées au premier « Démarrer ». */
function composerChrono(c: Contexte, p: ParametresCS, chrono: Chrono, etapes: Etape[], etat: M.EtatPanneau, chiffres: boolean): M.MessageSeance {
  const r = p.rappels.find((x) => x.type === "chrono") ?? RAPPELS_CS_DEFAUT.find((x) => x.type === "chrono")!;
  return M.messageChrono({
    cle: c.s.cle, jour: dateLongue(c.s.date), etat, chrono, etapes, texte: r.texte, vars: variables(c),
    joueurs: c.parts.participants.map(c.joueur), chiffres, site: SITE_URL, maj: Date.now(),
  });
}

/** Ce que la base dit d'une séance, et dont les messages vivants ont besoin. */
type Sources = { repartition?: unknown; chrono?: unknown; etapes?: unknown };

/** Un message vivant, rendu d'après la base. */
function composerVivant(quoi: Vivant, c: Contexte, p: ParametresCS, src: Sources, etat: M.EtatPanneau, chiffres: boolean): M.MessageSeance {
  if (quoi === "panneau") return composerPanneau(c, p, etat, chiffres);
  if (quoi === "chrono") return composerChrono(c, p, lireChrono(src.chrono), derouleDe(src.etapes, p).etapes, etat, chiffres);
  const rep = lireRepartition(src.repartition);
  if (quoi === "recap") return composerRecap(c, p, rep, etat, chiffres);
  return composerPhase(quoi, c, p, rep, etat, chiffres);
}

/** Le message d'un rappel des Chambres (hors panneau vivant), prêt à partir. */
function composerRappel(r: RappelDef, c: Contexte, p: ParametresCS, o: { chiffres: boolean; lienPanneau: string | null }): M.MessageSeance {
  const vars = variables(c);
  const heure = vars.heure;
  if (r.type === "places") {
    return M.messagePlaces({ cle: c.s.cle, heure, texte: r.texte, vars, annonces: c.tous.length, places: c.places, manque: c.manqueAnnonces ?? "personne", lienPanneau: o.lienPanneau, site: SITE_URL, maj: Date.now() });
  }
  if (r.type === "jour") {
    // « dans 1 h » se compte depuis l'HEURE DU RAPPEL, pas depuis l'envoi : un rappel rattrapé à
    // 20 h 04 dit la même chose que celui de 20 h, et l'essai d'un mardi montre le vrai titre.
    const prevu = instantRappel(r, c.s)?.getTime() ?? Date.now();
    return M.messageJour({
      dans: delaiDit(c.s.debut.getTime() - prevu), texte: r.texte, vars, source: c.parts.source,
      joueurs: c.parts.participants.map(c.joueur), places: c.places, manque: c.manqueParticipants, chiffres: o.chiffres, site: SITE_URL, maj: Date.now(),
      // 📍 Mes positions : seulement après la bascule (avant, la répartition du bot Python fait foi).
      cle: c.s.cle, positions: p.nouveauxMessages,
    });
  }
  // « veille » sans panneau (M4) : la bascule n'est pas faite, ou le staff a coupé le panneau.
  return M.messageVeille({ cle: c.s.cle, heure, jourJ: jourJ(c.s), texte: p.textes.sansPanneau, vars, annonces: c.tous.length, places: c.places, manque: c.manqueAnnonces, site: SITE_URL, maj: Date.now() });
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES MESSAGES VIVANTS : LE PANNEAU (M1), LE RÉCAP (M5), LA RÉPARTITION (Phase 1, Phase 2)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Publie un message vivant d'une séance et FERME l'ancien du même genre : deux panneaux (ou deux
 * récaps, deux répartitions) vivants pour la même séance ne doivent jamais coexister. La
 * mention seulement quand `calc` la demande (le rappel de la veille, celui de 20 h 40) ; une
 * republication (`/chambre panneau`, « Republier », `/chambre recap`) ne mentionne personne.
 */
async function publierVivant(
  client: Client, s: SeanceParis, quoi: Vivant, calc: MentionCalculee | null, o: { tete?: string; gras?: string[] } = {},
): Promise<RefMessage> {
  const p = await parametres("cs", true);
  const sal = await salons();
  const ch = await salonTexte(client, sal.chambres);
  if (!ch) throw new Error(`Salon des Chambres introuvable, ou fermé au bot (${sal.chambres}).`);
  const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { annulee: true, clotureAt: true, repartition: true, chrono: true, etapes: true } });
  const nom = quoi === "panneau" ? "pas de panneau" : quoi === "recap" ? "pas de récap" : quoi === "chrono" ? "pas de chrono" : "pas de répartition";
  if (row?.annulee) throw new Error(`Cette séance est annulée : ${nom}.`);
  if (row?.clotureAt) throw new Error(`Cette séance est clôturée : ${nom}.`);
  const c = await contexte(s, p);
  let m = composerVivant(quoi, c, p, row ?? {}, "ouvert", M.chiffresPermis({ degatsDiscord: p.degats.discord, salonFerme: fermeAuxVisiteurs(ch) }));
  if (calc) m = M.avecMentions(m, calc, o);
  const ref = await envoyer(ch, m);
  // Parti : à partir d'ici, plus rien ne doit lever d'exception — l'appelant (un rappel)
  // libérerait son marqueur et le message repartirait une seconde fois.
  const avant: { ref: RefMessage | null } = { ref: null };
  const res = await ranger(s, (msgs) => {
    avant.ref = msgs[quoi] ?? null;
    msgs[quoi] = ref;
    if (avant.ref) msgs.anciens = [...(msgs.anciens ?? []), { ...avant.ref, ferme: avant.ref.ferme ?? "remplace" }].slice(-10);
  }).catch((e) => ({ ok: false as const, status: 500, message: String((e as Error)?.message ?? e) }));
  if (!res.ok) console.error(`[seances] ${quoi} de ${s.cle} publié (${ref.lien}) mais pas enregistré : ${res.message}`);
  if (avant.ref && !avant.ref.ferme) await fermerMessage(client, avant.ref, "remplace").catch((e) => console.error(`[seances] fermeture de l'ancien ${quoi} :`, e));
  return ref;
}

export async function publierPanneau(client: Client, s: SeanceParis, calc: MentionCalculee | null): Promise<RefMessage> {
  return publierVivant(client, s, "panneau", calc);
}

/** M5 — le récap. `calc` : la mention des participants (le rappel de 20 h 40) ; null : sans mention. */
export async function publierRecap(client: Client, s: SeanceParis, calc: MentionCalculee | null, gras: string[] = []): Promise<RefMessage> {
  return publierVivant(client, s, "recap", calc, { tete: "📋 Récap de ce soir", gras });
}

/** Les deux messages à boutons de la répartition, Phase 1 puis Phase 2, sans mention. */
export async function publierRepartition(client: Client, s: SeanceParis): Promise<RefMessage[]> {
  const p1 = await publierVivant(client, s, "phase1", null);
  const p2 = await publierVivant(client, s, "phase2", null);
  return [p1, p2];
}

/** M6 — le chrono en direct. `calc` : la mention du rappel « chrono » (aucune par défaut ; la
 *  validation refuse @everyone) ; null : une publication à la main, sans mention. */
export async function publierChrono(client: Client, s: SeanceParis, calc: MentionCalculee | null): Promise<RefMessage> {
  return publierVivant(client, s, "chrono", calc, { tete: "⏱️ Le chrono de ce soir" });
}

async function marquer(s: SeanceParis, quoi: Vivant, id: string, ferme: NonNullable<RefMessage["ferme"]>) {
  await ranger(s, (m) => { const r = m[quoi]; if (r?.id === id) m[quoi] = { ...r, ferme }; }).catch(() => {});
}

type RowVivante = Pick<SeanceGuilde, "date" | "creneau" | "messages" | "annulee" | "clotureAt" | "repartition" | "chrono" | "etapes">;
const SELECT_VIVANTE = { date: true, creneau: true, messages: true, annulee: true, clotureAt: true, repartition: true, chrono: true, etapes: true } as const;

/**
 * Remet à jour (ou ferme) les messages vivants d'une séance, d'après la base : le panneau, le
 * récap, la répartition. Chacun n'est modifié que si son contenu a changé (piège n° 19).
 * Clôturée, ou commencée depuis plus de 6 h : fermés pour de bon (« · terminée », sans boutons).
 * Annulée : « · annulée » tant qu'elle l'est — rétablie, ils rouvrent d'eux-mêmes.
 */
async function synchroniserSeance(client: Client, row: RowVivante, p: ParametresCS, now: number, seuls?: Vivant[]) {
  const msgs = lireMessages(row.messages);
  const ouverts = VIVANTS.filter((q) => msgs[q] && !msgs[q]!.ferme && (!seuls || seuls.includes(q)));
  if (!ouverts.length || (row.creneau !== "mer" && row.creneau !== "dim")) return;
  const s = seanceCS(row.date, row.creneau);
  if (row.clotureAt || now - s.debut.getTime() > SIX_HEURES) {
    for (const q of ouverts) {
      const r = await fermerMessage(client, msgs[q]!, "terminee").catch((e) => { console.error(`[seances] fermeture du ${q} ${row.date} :`, e); return "inaccessible" as const; });
      if (r !== "inaccessible") await marquer(s, q, msgs[q]!.id, r === "disparu" ? "supprime" : "terminee");
    }
    return;
  }
  const c = await contexte(s, p);
  for (const q of ouverts) {
    const ref = msgs[q]!;
    const ch = await salonTexte(client, ref.canal);
    if (!ch) continue;
    const m = composerVivant(q, c, p, row, row.annulee ? "annulee" : "ouvert", M.chiffresPermis({ degatsDiscord: p.degats.discord, salonFerme: fermeAuxVisiteurs(ch) }));
    const r = await editerSiChange(client, ref, m).catch((e) => { console.error(`[seances] synchro du ${q} ${row.date} :`, e); return "inaccessible" as const; });
    if (r === "disparu") await marquer(s, q, ref.id, "supprime");
  }
}

/** Après un clic : les messages suivent tout de suite, sans attendre la synchro de 15 s. */
async function rafraichirSeance(client: Client, s: SeanceParis, seuls?: Vivant[]) {
  const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: SELECT_VIVANTE });
  if (row) await synchroniserSeance(client, row, await parametres("cs"), Date.now(), seuls);
}
const rafraichirPanneau = (client: Client, s: SeanceParis) => rafraichirSeance(client, s, ["panneau", "recap"]);

let enSynchro = false;
/** Toutes les 15 s : chaque message vivant ouvert est recalculé, et modifié s'il a changé. Un
 *  geste fait sur le site (une salle, une équipe, une annonce) se voit donc dans Discord en
 *  moins de 30 s (lot 4, à vérifier). */
export async function synchroniserMessages(client: Client) {
  if (enSynchro) return;
  enSynchro = true;
  try {
    const now = Date.now();
    const rows = await prisma.seanceGuilde.findMany({
      where: { evenement: "cs", debut: { gte: new Date(now - 14 * 86_400_000), lte: new Date(now + 8 * 86_400_000) } },
      select: SELECT_VIVANTE,
    });
    const ouverts = rows.filter((r) => { const m = lireMessages(r.messages); return VIVANTS.some((q) => m[q] && !m[q]!.ferme); });
    if (ouverts.length) {
      const p = await parametres("cs");
      for (const row of ouverts) await synchroniserSeance(client, row, p, now).catch((e) => console.error(`[seances] synchro de ${row.date} :`, e));
    }
    // Le panneau du Guild Siege (lot 9) suit de même ce qui s'annonce sur le site.
    await synchroniserGS(client, now).catch((e) => console.error("[seances] synchro du Guild Siege :", e));
  } finally {
    enSynchro = false;
  }
}

let enSynchroChrono = false;
/**
 * Toutes les 10 s, le seul message du chrono, et seulement pendant qu'il TOURNE (§8.1) : un clic
 * fait sur le site se voit dans Discord en 10 s au plus. Hors chrono, la synchro de 15 s suffit.
 * Le message ne change qu'à un clic : `editerSiChange` ne le modifie pas pour rien (piège n° 19).
 */
export async function synchroniserChrono(client: Client) {
  if (enSynchroChrono) return;
  enSynchroChrono = true;
  try {
    const now = Date.now();
    const rows = await prisma.seanceGuilde.findMany({
      where: { evenement: "cs", debut: { gte: new Date(now - SIX_HEURES - 3_600_000), lte: new Date(now + 86_400_000) } },
      select: SELECT_VIVANTE,
    });
    const enCours = rows.filter((r) => {
      const m = lireMessages(r.messages).chrono;
      const c = lireChrono(r.chrono);
      return m && !m.ferme && c.debut !== null && !c.fini;
    });
    if (!enCours.length) return;
    const p = await parametres("cs");
    for (const row of enCours) await synchroniserSeance(client, row, p, now, ["chrono"]).catch((e) => console.error(`[seances] chrono de ${row.date} :`, e));
  } finally {
    enSynchroChrono = false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE GUILD SIEGE (§11 ; lot 9) — son panneau vivant, ses rappels, sa fermeture
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

type ContexteGS = {
  s: SeanceParis; p: ParametresGS; creneau: CreneauGS | null;
  ligne: (SeanceGuilde & { participants: SeanceParticipant[] }) | null;
  /** Les annoncés VISIBLES (ni ami, ni membre caché), dans l'ordre d'annonce, avec leur chiffre. */
  joueurs: JoueurGS[];
  /** userId → discordId, pour mentionner les annoncés. */
  discord: Map<string, string>;
};

async function contexteGS(s: SeanceParis, p: ParametresGS): Promise<ContexteGS> {
  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, include: { participants: true } });
  const joueurs = ligne ? await joueursGS(prisma, ligne.participants, { cloturee: !!ligne.clotureAt }) : [];
  const ids = [...new Set(joueurs.map((x) => x.userId).filter((x): x is string => !!x))];
  const comptes = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, discordId: true } }) : [];
  return { s, p, creneau: creneauDe(s, p.creneaux), ligne, joueurs, discord: new Map(comptes.map((u) => [u.id, u.discordId])) };
}

const lienGS = () => (SITE_URL ? `${SITE_URL}/compositions?onglet=gvg` : "");

function variablesGS(c: ContexteGS): Record<string, string> {
  const fin = c.creneau?.finInscription;
  return {
    date: dateLongue(c.s.date), heure: heureDite(partiesParis(c.s.debut).hhmm),
    annonces: String(c.joueurs.length), places: c.p.places === null ? "sans plafond" : String(c.p.places),
    manque: manqueGS(c.joueurs.length, c.p.places) ?? "personne", lien: lienGS(), ...(fin ? { fin: heureDite(fin) } : {}),
  };
}

const joueurGSMsg = (j: JoueurGS): M.JoueurGSMsg => ({ pseudo: j.pseudo, classe: j.classe, chiffres: j.chiffres, role: j.role });

/** Le panneau du siège, dans l'état demandé. Sa phrase est celle du rappel « veille » (le
 *  panneau), sa règle celle du paramétrage (`textes.panneau`). */
function composerPanneauGS(c: ContexteGS, etat: M.EtatPanneau, chiffres: boolean): M.MessageSeance {
  const r = c.p.rappels.find((x) => x.type === "panneau") ?? RAPPELS_GS_DEFAUT[0];
  // Ni ce soir ni demain : « Demain » se dit par le jour de la séance (« Vendredi à 21 h 30 »).
  const auj = partiesParis(new Date()).date;
  const loin = c.s.date > ajouterJours(auj, 1);
  return M.messagePanneauGS({
    cle: c.s.cle, label: c.s.label, etat, jourJ: jourJ(c.s), jourDit: loin ? JOURS_LONGS[jourDeDate(c.s.date)] : null,
    texte: r.texte, regle: c.p.textes.panneau, vars: variablesGS(c),
    joueurs: c.joueurs.map(joueurGSMsg), places: c.p.places, finInscription: c.creneau?.finInscription ?? null,
    chiffres, site: SITE_URL, maj: Date.now(),
  });
}

/** Le rappel « dans 1 h » (jour) ou celui du staff, prêt à partir. */
function composerRappelGS(r: RappelDef, c: ContexteGS, o: { chiffres: boolean; now: number }): M.MessageSeance {
  const vars = variablesGS(c);
  if (r.type === "gs_staff") return M.messageStaffGS({ label: c.s.label, texte: r.texte, vars, annonces: c.joueurs.length, places: c.p.places, maj: o.now });
  // « dans 1 h » depuis l'heure du rappel, même rattrapé quelques minutes après (comme aux Chambres).
  const prevu = instantRappel(r, c.s, c.creneau)?.getTime() ?? o.now;
  return M.messageJourGS({
    cle: c.s.cle, dans: delaiDit(c.s.debut.getTime() - prevu), texte: r.texte, vars, joueurs: c.joueurs.map(joueurGSMsg),
    places: c.p.places, chiffres: o.chiffres, site: SITE_URL, maj: o.now,
    ouverte: c.s.debut.getTime() > o.now && !c.ligne?.annulee && !c.ligne?.clotureAt,
  });
}

/** Publie le panneau du siège et FERME l'ancien : deux panneaux vivants pour la même séance ne
 *  coexistent jamais. La mention seulement quand `calc` la demande (le rappel de la veille) ;
 *  une republication ne mentionne personne. */
export async function publierPanneauGS(client: Client, s: SeanceParis, calc: MentionCalculee | null): Promise<RefMessage> {
  const p = await parametres("gs", true);
  if (!p.actif) throw new Error("Le Guild Siege n'est pas actif (paramétrage des événements) : pas de panneau.");
  const sal = await salons();
  const ch = await salonTexte(client, sal.siege);
  if (!ch) throw new Error(`Salon du Guild Siege introuvable, ou fermé au bot (${sal.siege}).`);
  const c = await contexteGS(s, p);
  if (c.ligne?.annulee) throw new Error("Ce Guild Siege est annulé : pas de panneau.");
  if (c.ligne?.clotureAt) throw new Error("Ce Guild Siege est clôturé : pas de panneau.");
  let m = composerPanneauGS(c, "ouvert", M.chiffresPermis({ degatsDiscord: p.degats.discord, salonFerme: fermeAuxVisiteurs(ch) }));
  if (calc) m = M.avecMentions(m, calc);
  const ref = await envoyer(ch, m);
  // Parti : plus rien ne doit lever d'exception (le rappel libérerait son marqueur, et le
  // panneau repartirait une seconde fois).
  const avant: { ref: RefMessage | null } = { ref: null };
  const res = await ranger(s, (msgs) => {
    avant.ref = msgs.panneau ?? null;
    msgs.panneau = ref;
    if (avant.ref) msgs.anciens = [...(msgs.anciens ?? []), { ...avant.ref, ferme: avant.ref.ferme ?? "remplace" }].slice(-10);
  }).catch((e) => ({ ok: false as const, status: 500, message: String((e as Error)?.message ?? e) }));
  if (!res.ok) console.error(`[seances] panneau du siège ${s.cle} publié (${ref.lien}) mais pas enregistré : ${res.message}`);
  if (avant.ref && !avant.ref.ferme) await fermerMessage(client, avant.ref, "remplace").catch((e) => console.error("[seances] fermeture de l'ancien panneau du siège :", e));
  return ref;
}

type RowGS = Pick<SeanceGuilde, "cle" | "messages" | "annulee" | "clotureAt">;

/** Remet à jour (ou ferme) le panneau d'une séance du siège, d'après la base : clôturée, ou
 *  commencée depuis plus de 6 h, il est fermé pour de bon ; annulée, « · annulée » tant qu'elle
 *  l'est. Il n'est modifié que si son contenu a changé (piège n° 19). Un créneau RETIRÉ du
 *  paramétrage ferme aussi son panneau : ses boutons ne répondraient plus (« ce bouton ne sert
 *  plus »), et il resterait affiché comme ouvert. */
async function synchroniserSeanceGS(client: Client, row: RowGS, p: ParametresGS, now: number) {
  const ref = lireMessages(row.messages).panneau;
  if (!ref || ref.ferme) return;
  const r = resoudreCle(row.cle, new Date(now), p);
  if (!r.ok || r.seance.evenement !== "gs") return;
  const s = r.seance;
  // Son créneau retiré du paramétrage (un horaire déplacé) : la séance n'existe plus, ses
  // boutons répondraient « ce créneau n'existe plus » sous un panneau resté ouvert.
  if (!creneauDe(s, p.creneaux) || row.clotureAt || now - s.debut.getTime() > SIX_HEURES) {
    const f = await fermerMessage(client, ref, "terminee").catch((e) => { console.error(`[seances] fermeture du panneau du siège ${row.cle} :`, e); return "inaccessible" as const; });
    if (f !== "inaccessible") await marquer(s, "panneau", ref.id, f === "disparu" ? "supprime" : "terminee");
    return;
  }
  const ch = await salonTexte(client, ref.canal);
  if (!ch) return;
  const c = await contexteGS(s, p);
  const m = composerPanneauGS(c, row.annulee ? "annulee" : "ouvert", M.chiffresPermis({ degatsDiscord: p.degats.discord, salonFerme: fermeAuxVisiteurs(ch) }));
  const e = await editerSiChange(client, ref, m).catch((err) => { console.error(`[seances] synchro du panneau du siège ${row.cle} :`, err); return "inaccessible" as const; });
  if (e === "disparu") await marquer(s, "panneau", ref.id, "supprime");
}

/** Les panneaux du siège encore ouverts, recalculés (toutes les 15 s, et juste après un clic).
 *  Éteint, le siège n'a plus de panneau ouvert à suivre : ils se ferment à leur échéance. */
async function synchroniserGS(client: Client, now: number, cle?: string) {
  const rows = await prisma.seanceGuilde.findMany({
    where: { evenement: "gs", ...(cle ? { cle } : { debut: { gte: new Date(now - 14 * 86_400_000), lte: new Date(now + 8 * 86_400_000) } }) },
    select: { cle: true, messages: true, annulee: true, clotureAt: true },
  });
  const ouverts = rows.filter((r) => { const m = lireMessages(r.messages).panneau; return m && !m.ferme; });
  if (!ouverts.length) return;
  const p = await parametres("gs");
  for (const row of ouverts) await synchroniserSeanceGS(client, row, p, now).catch((e) => console.error(`[seances] synchro du siège ${row.cle} :`, e));
}
const rafraichirPanneauGS = (client: Client, s: SeanceParis) => synchroniserGS(client, Date.now(), s.cle);

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES RAPPELS DU JOUR J (§8.5)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Les rappels déjà partis (ou réclamés par un autre bot) : inutile de relire la base chaque
 *  minute de la fenêtre. La base reste l'arbitre : ce n'est qu'un raccourci. */
const faits = new Set<string>();
/** Pourquoi un rappel dû n'est pas parti à la dernière minute de sa fenêtre : le journal de
 *  13 h 41 dit « effectif complet » ou « séance annulée » au lieu d'« abandonné », qui ferait
 *  croire à une panne. */
const nonEnvoyes = new Map<string, string>();
const signales = new Set<string>();
const signalerUneFois = (cle: string, texte: string) => { if (!signales.has(cle)) { signales.add(cle); console.log(texte); } };

let enTick = false;
export async function tickSeances(client: Client) {
  if (enTick) return;
  enTick = true;
  try {
    const now = new Date();
    const [csActif, gsActif] = await Promise.all([interrupteur("cs_rappels_actifs"), interrupteur("gs_rappels_actifs")]);
    if (!csActif && !gsActif) return; // interrupteurs coupés : rien ne part
    const [pcs, pgs] = await Promise.all([parametres("cs"), parametres("gs")]);
    const plan = planDuTick({ actifs: { cs: csActif, gs: gsActif }, cs: pcs, gs: pgs, now });
    for (const d of plan.manques) {
      const row = await prisma.seanceGuilde.findUnique({ where: { cle: d.seance.cle }, select: { rappels: true } });
      const m = (row?.rappels ?? {}) as Record<string, unknown>;
      if (m[d.rappel.id]) continue;
      const pourquoi = nonEnvoyes.get(`${d.seance.cle}|${d.rappel.id}`);
      if (pourquoi) console.log(`[seances] rappel « ${d.rappel.id} » de ${d.seance.cle} (prévu à ${partiesParis(new Date(d.prevu)).hhmm}) : pas envoyé — ${pourquoi}.`);
      else console.warn(`[seances] rappel « ${d.rappel.id} » de ${d.seance.cle} : prévu à ${partiesParis(new Date(d.prevu)).hhmm}, fenêtre de 10 min dépassée — abandonné plutôt qu'envoyé en retard.`);
    }
    const sal = await salons();
    for (const d of plan.dus) {
      await envoyerRappel(client, d, pcs, pgs, sal).catch((e) => console.error(`[seances] rappel « ${d.rappel.id} » de ${d.seance.cle} :`, e));
    }
  } finally {
    enTick = false;
  }
}

type Salons = Awaited<ReturnType<typeof salons>>;

async function envoyerRappel(client: Client, du: RappelDu, pcs: ParametresCS, pgs: ParametresGS, sal: Salons) {
  const { rappel: r, seance: s, evenement: ev } = du;
  const cleFait = `${s.cle}|${r.id}`;
  if (faits.has(cleFait)) return;
  if ((ev === "cs" && r.type === "gs_staff") || (ev === "gs" && !["panneau", "jour", "gs_staff"].includes(r.type))) return;

  const canal = r.type === "gs_staff" ? sal.staff : ev === "cs" ? sal.chambres : sal.siege;
  const ch = await salonTexte(client, canal);
  if (!ch) { signalerUneFois(`${cleFait}|salon`, `[seances] rappel « ${r.id} » : salon ${canal || "(aucun)"} introuvable ou fermé au bot.`); return; }

  // Ce que la séance dit à cette minute : la composition (Chambres) ou les annonces (Guild Siege).
  const c = ev === "cs" ? await contexte(s, pcs) : null;
  const cg = ev === "gs" ? await contexteGS(s, pgs) : null;
  const etat = c
    ? { manque: r.type === "jour" ? c.manqueParticipants : c.manqueAnnonces, participants: c.parts.participants.length }
    : { manque: manqueGS(cg!.joueurs.length, pgs.places), participants: cg!.joueurs.length };
  if (!conditionRemplie(r, etat)) {
    nonEnvoyes.set(cleFait, r.condition === "si_manque" ? "effectif complet, rien à annoncer" : "aucun participant");
    return;
  }

  // Un seul @everyone par salon et par demi-heure : les marqueurs des séances proches le disent.
  const now = Date.now();
  const veutEveryone = r.mention === "everyone" || r.mention === "everyone_participants";
  const voisines = veutEveryone
    ? await prisma.seanceGuilde.findMany({ where: { debut: { gte: new Date(now - 36 * 3_600_000), lte: new Date(now + 60 * 3_600_000) } }, select: { rappels: true } })
    : [];
  const bloque = veutEveryone && everyoneRecent(voisines.map((v) => v.rappels), ch.id, now);
  const comptes = c ? c.parts.participants.map((x) => (x.userId ? c.discord.get(x.userId) : undefined)).filter((x): x is string => !!x)
    : cg!.joueurs.map((x) => (x.userId ? cg!.discord.get(x.userId) : undefined)).filter((x): x is string => !!x);
  // Le Guild Siege n'a pas de bot Python à remplacer : ses mentions ne suivent pas la bascule.
  const calc = mentionsDuRappel(r.mention, { nouveauxMessages: ev === "cs" ? pcs.nouveauxMessages : true, comptes, bloque });

  // RÉCLAMER le rappel : un seul envoi, même avec deux bots ou un redémarrage dans la minute.
  const reclame = await majSeance(prisma, s, (x) => {
    const refus = refusEnvoi(x); // annulée ou clôturée : rien ne part
    if (refus) return { ok: false, status: 409, message: refus };
    const m = reclamer(x.rappels, r.id, { t: now, etat: "envoi", canal: ch.id, everyone: calc.everyone });
    return m ? { ok: true, patch: { rappels: m as unknown as Prisma.InputJsonValue } } : { ok: false, status: 409, message: "deja" };
  });
  if (!reclame.ok) {
    // Seul « déjà parti » est définitif. Une séance annulée peut être RÉTABLIE dans la fenêtre
    // de 10 minutes : le tick suivant doit alors pouvoir envoyer.
    if (reclame.message === "deja") faits.add(cleFait);
    else nonEnvoyes.set(cleFait, reclame.message === "annulee" ? "séance annulée" : reclame.message === "cloturee" ? "séance clôturée" : reclame.message);
    return;
  }
  nonEnvoyes.delete(cleFait);
  if (bloque) console.log(`[seances] « ${r.id} » de ${s.cle} : un @everyone est parti dans ce salon il y a moins de 30 min — envoyé sans mention.`);

  const msgs = lireMessages(reclame.seance.messages);
  let ref: RefMessage | null = null;
  let cle: keyof Messages | null = null;
  try {
    if (cg) {
      // LE GUILD SIEGE (lot 9) : la veille, son panneau vivant (il se range lui-même) ; « dans
      // 1 h », qui vient ; au staff, l'inscription de la guilde à faire.
      if (r.type === "panneau") await publierPanneauGS(client, s, calc);
      else {
        const chiffres = r.type === "jour" && M.chiffresPermis({ degatsDiscord: pgs.degats.discord, salonFerme: fermeAuxVisiteurs(ch) });
        const sansCompte = cg.joueurs.filter((x) => !x.userId || !cg.discord.get(x.userId)).map((x) => x.pseudo);
        ref = await envoyer(ch, M.avecMentions(composerRappelGS(r, cg, { chiffres, now }), calc, { liste: r.type === "jour", gras: sansCompte }));
        cle = r.type === "gs_staff" ? "staff" : "jour";
      }
    } else if (r.type === "panneau" && pcs.panneau && pcs.nouveauxMessages) {
      await publierPanneau(client, s, calc); // il se range lui-même
    } else if (r.type === "chrono") {
      // M6 (lot 5) : le chrono en direct, vivant jusqu'à la clôture. Il se range lui-même, et ferme
      // un chrono publié plus tôt à la main (/chambre chrono).
      await publierChrono(client, s, calc);
    } else if (r.type === "recap") {
      // M5 : « 📋 Récap de ce soir — @… », puis vivant jusqu'à la clôture. Il se range lui-même,
      // et ferme un récap publié plus tôt à la main (/chambre recap).
      const sansCompte = c!.parts.participants.filter((x) => !x.userId || !c!.discord.get(x.userId)).map((x) => x.pseudo);
      await publierRecap(client, s, calc, sansCompte);
    } else {
      const cleType = r.type === "panneau" ? "veille" : (r.type as "places" | "jour");
      // Le rappel de 18 h 30 supprime celui de 13 h 30 avant de partir (`bot.py:1735-1740`).
      if (r.remplacePrecedent && msgs[cleType]) {
        const vieux = msgs[cleType]!;
        const vch = await salonTexte(client, vieux.canal);
        await vch?.messages.delete(vieux.id).catch(() => {});
      }
      const pan = msgs.panneau && !msgs.panneau.ferme ? msgs.panneau.lien : null;
      const chiffres = M.chiffresPermis({ degatsDiscord: pcs.degats.discord, salonFerme: fermeAuxVisiteurs(ch) });
      const m = composerRappel(r, c!, pcs, { chiffres, lienPanneau: pan });
      const sansCompte = c!.parts.participants.filter((x) => !x.userId || !c!.discord.get(x.userId)).map((x) => x.pseudo);
      ref = await envoyer(ch, M.avecMentions(m, calc, { liste: r.type === "jour", gras: sansCompte }));
      cle = cleType;
    }
  } catch (e) {
    // L'ENVOI a échoué : on LIBÈRE le marqueur, le tick suivant réessaie tant que la fenêtre court.
    await majSeance(prisma, s, (x) => ({ ok: true, patch: { rappels: liberer(x.rappels, r.id) as unknown as Prisma.InputJsonValue } })).catch(() => {});
    throw e;
  }
  // Parti : le marqueur reste, quoi qu'il arrive ensuite — un rangement raté ne doit jamais
  // le libérer, sinon le message repartirait à la minute suivante.
  faits.add(cleFait);
  console.log(`[seances] rappel « ${r.id} » envoyé pour ${s.cle}${calc.everyone ? " (@everyone)" : ""}.`);
  await majSeance(prisma, s, (x) => {
    const m = lireMessages(x.messages);
    if (ref && cle) (m as Record<string, RefMessage>)[cle] = ref;
    return { ok: true, patch: { rappels: marquerFait(x.rappels, r.id) as unknown as Prisma.InputJsonValue, messages: enJson(m) } };
  }).catch((e) => console.error(`[seances] rappel « ${r.id} » de ${s.cle} envoyé, mais pas rangé :`, e));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES COMMANDES DU SITE (file BotCommand) — chacune relit tout en base : la charge ne porte
   qu'un identifiant de séance et un mot d'une liste fermée (§6, contre-examen n° 22)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

async function seanceParId(seanceId: unknown) {
  const row = typeof seanceId === "string" && seanceId ? await prisma.seanceGuilde.findUnique({ where: { id: seanceId } }) : null;
  if (!row) throw new Error("Séance introuvable.");
  return row;
}

/** `seance_publier` { seanceId, quoi } — « Republier » le panneau (lot 3), « Publier le récap »
 *  et « Publier la répartition » (lot 4), « Publier dans Discord » le chrono (lot 5), depuis la
 *  page des Chambres. */
export async function commandePublier(client: Client, payload: Record<string, unknown>): Promise<string> {
  const row = await seanceParId(payload.seanceId);
  if (row.evenement === "gs") {
    // Le Guild Siege (lot 9) : son panneau seul, relu au moment d'exécuter — siège allumé, séance
    // qui vient (ou qui se joue).
    if (payload.quoi !== "panneau") throw new Error("Le Guild Siege ne publie que son panneau.");
    const p = await parametres("gs", true);
    if (!p.actif) throw new Error("Le Guild Siege n'est pas actif (paramétrage des événements) : son panneau ne part pas.");
    const r = resoudreCle(row.cle, new Date(), p);
    if (!r.ok) throw new Error(r.error);
    const refus = publicationPermiseGS(r.seance, new Date(), p.creneaux);
    if (refus) throw new Error(refus);
    const ref = await publierPanneauGS(client, r.seance, null);
    return `message ${ref.lien}`;
  }
  if (row.evenement !== "cs" || (row.creneau !== "mer" && row.creneau !== "dim")) throw new Error("Séance inconnue : ni Chambre, ni Guild Siege.");
  const quoi = payload.quoi;
  if (quoi !== "panneau" && quoi !== "recap" && quoi !== "repartition" && quoi !== "chrono") throw new Error(`« ${String(quoi)} » : seuls le panneau, le récap, la répartition et le chrono se publient.`);
  const p = await parametres("cs", true);
  if (!p.nouveauxMessages) throw new Error("La bascule est coupée : ce message part avec les nouveaux messages (paramétrage des événements).");
  // Relu au moment de l'exécution, pas de la demande : une demande restée en file pendant que le
  // bot était arrêté ne publie pas le message d'une séance passée.
  const s = seanceCS(row.date, row.creneau);
  const refus = publicationPermise(s, new Date(), quoi);
  if (refus) throw new Error(refus);
  if (quoi === "repartition") {
    const refs = await publierRepartition(client, s);
    return `messages ${refs.map((r) => r.lien).join(" ")}`;
  }
  const ref = quoi === "recap" ? await publierRecap(client, s, null) : quoi === "chrono" ? await publierChrono(client, s, null) : await publierPanneau(client, s, null);
  return `message ${ref.lien}`;
}

/** `seance_fermer` { seanceId } — la clôture : le panneau, le récap, la répartition et le chrono
 *  passent en « · terminée », boutons retirés. */
export async function commandeFermer(client: Client, payload: Record<string, unknown>): Promise<string> {
  const row = await seanceParId(payload.seanceId);
  const msgs = lireMessages(row.messages);
  const ouverts = VIVANTS.filter((q) => msgs[q] && !msgs[q]!.ferme);
  if (!ouverts.length) return "aucun message ouvert";
  // La séance de la ligne, Chambre ou Guild Siege (lot 9 : son panneau se ferme à la clôture).
  const lue = resoudreCle(row.cle, new Date(), await parametres("gs"));
  if (!lue.ok) return "aucun message ouvert";
  const s = lue.seance;
  const faits: string[] = [];
  let inaccessible = false;
  for (const q of ouverts) {
    const r = await fermerMessage(client, msgs[q]!, "terminee");
    if (r === "inaccessible") { inaccessible = true; continue; }
    await marquer(s, q, msgs[q]!.id, r === "disparu" ? "supprime" : "terminee");
    faits.push(`${q} ${r === "disparu" ? "déjà supprimé" : "fermé"}`);
  }
  if (inaccessible && !faits.length) throw new Error("Le salon des messages est fermé au bot.");
  return faits.join(", ") || "aucun message ouvert";
}

/**
 * `seance_annulation` { seanceId } — M8, si le paramétrage le prévoit. @everyone seulement si
 * l'annulation tombe le jour même (et pas d'@everyone dans ce salon depuis 30 min). Le panneau,
 * lui, passe en « · annulée » quoi qu'il arrive : il suit l'état de la séance.
 */
export async function commandeAnnulation(client: Client, payload: Record<string, unknown>): Promise<string> {
  const row = await seanceParId(payload.seanceId);
  if (row.evenement === "gs") return annulationGS(client, row);
  if (row.evenement !== "cs" || (row.creneau !== "mer" && row.creneau !== "dim")) throw new Error("Séance inconnue : ni Chambre, ni Guild Siege.");
  const s = seanceCS(row.date, row.creneau);
  const p = await parametres("cs", true);
  await synchroniserSeance(client, row, p, Date.now()).catch((e) => console.error("[seances] messages d'une séance annulée :", e));
  const now = Date.now();
  const verdict = annonceAnnulation({
    annulee: row.annulee, annoncerAnnulation: p.annoncerAnnulation, nouveauxMessages: p.nouveauxMessages,
    rappelsActifs: await interrupteur("cs_rappels_actifs"), seance: s, now: new Date(now),
  });
  if (!verdict.envoyer) return verdict.raison;
  const sal = await salons();
  const ch = await salonTexte(client, sal.chambres);
  if (!ch) throw new Error(`Salon des Chambres introuvable, ou fermé au bot (${sal.chambres}).`);
  const jourMeme = verdict.jourMeme;
  const voisines = jourMeme ? await prisma.seanceGuilde.findMany({ where: { debut: { gte: new Date(now - 36 * 3_600_000), lte: new Date(now + 60 * 3_600_000) } }, select: { rappels: true } }) : [];
  const calc = mentionsDuRappel(jourMeme ? "everyone" : "aucune", { nouveauxMessages: true, comptes: [], bloque: everyoneRecent(voisines.map((v) => v.rappels), ch.id, now) });
  // Réclamé comme un rappel : une commande rejouée n'annonce pas deux fois.
  const reclame = await majSeance(prisma, s, (x) => {
    const m = reclamer(x.rappels, "annulation", { t: now, etat: "envoi", canal: ch.id, everyone: calc.everyone });
    return m ? { ok: true, patch: { rappels: m as unknown as Prisma.InputJsonValue } } : { ok: false, status: 409, message: "déjà annoncée" };
  });
  if (!reclame.ok) return "annulation déjà annoncée";
  const suivante = prochaineSeanceParis(new Date(s.debut.getTime() + 60 * 60_000));
  let ref: RefMessage;
  try {
    ref = await envoyer(ch, M.avecMentions(M.messageAnnulation({
      label: s.label, dateLongue: dateLongue(s.date), jourMeme, motif: row.motifAnnulation, prochaine: suivante.label, maj: now,
    }), calc));
  } catch (e) {
    await majSeance(prisma, s, (x) => ({ ok: true, patch: { rappels: liberer(x.rappels, "annulation") as unknown as Prisma.InputJsonValue } })).catch(() => {});
    throw e;
  }
  await majSeance(prisma, s, (x) => {
    const m = lireMessages(x.messages);
    m.annulation = ref;
    return { ok: true, patch: { rappels: marquerFait(x.rappels, "annulation") as unknown as Prisma.InputJsonValue, messages: enJson(m) } };
  }).catch((e) => console.error(`[seances] annulation de ${s.cle} envoyée, mais pas rangée :`, e));
  return `message ${ref.lien}`;
}


/**
 * M8 du Guild Siege (lot 9) : la même règle que les Chambres — l'annonce part si la séance l'est
 * encore, si le paramétrage du siège l'annonce, s'il est actif et ses rappels allumés, pour une
 * séance qui n'est pas passée ; @everyone le jour même seulement (et pas d'@everyone dans ce salon
 * depuis 30 min). Le panneau passe en « · annulée » dans tous les cas.
 */
async function annulationGS(client: Client, row: SeanceGuilde): Promise<string> {
  const p = await parametres("gs", true);
  const r = resoudreCle(row.cle, new Date(), p);
  if (!r.ok) throw new Error(r.error);
  const s = r.seance;
  await synchroniserGS(client, Date.now(), s.cle).catch((e) => console.error("[seances] panneau d'un siège annulé :", e));
  if (!p.actif) return "Guild Siege éteint : aucun message";
  const now = Date.now();
  const verdict = annonceAnnulation({
    annulee: row.annulee, annoncerAnnulation: p.annoncerAnnulation, nouveauxMessages: true,
    rappelsActifs: await interrupteur("gs_rappels_actifs"), seance: s, now: new Date(now),
  });
  if (!verdict.envoyer) return verdict.raison.replace("rappels des Chambres", "rappels du Guild Siege");
  const sal = await salons();
  const ch = await salonTexte(client, sal.siege);
  if (!ch) throw new Error(`Salon du Guild Siege introuvable, ou fermé au bot (${sal.siege}).`);
  const voisines = verdict.jourMeme ? await prisma.seanceGuilde.findMany({ where: { debut: { gte: new Date(now - 36 * 3_600_000), lte: new Date(now + 60 * 3_600_000) } }, select: { rappels: true } }) : [];
  const calc = mentionsDuRappel(verdict.jourMeme ? "everyone" : "aucune", { nouveauxMessages: true, comptes: [], bloque: everyoneRecent(voisines.map((v) => v.rappels), ch.id, now) });
  const reclame = await majSeance(prisma, s, (x) => {
    const m = reclamer(x.rappels, "annulation", { t: now, etat: "envoi", canal: ch.id, everyone: calc.everyone });
    return m ? { ok: true, patch: { rappels: m as unknown as Prisma.InputJsonValue } } : { ok: false, status: 409, message: "déjà annoncée" };
  });
  if (!reclame.ok) return "annulation déjà annoncée";
  const suivante = prochaineSeanceGS(new Date(s.debut.getTime() + 60 * 60_000), p.creneaux);
  let ref: RefMessage;
  try {
    ref = await envoyer(ch, M.avecMentions(M.messageAnnulation({
      evenement: "gs", label: s.label, dateLongue: dateLongue(s.date), jourMeme: verdict.jourMeme, motif: row.motifAnnulation, prochaine: suivante?.label ?? null, maj: now,
    }), calc));
  } catch (e) {
    await majSeance(prisma, s, (x) => ({ ok: true, patch: { rappels: liberer(x.rappels, "annulation") as unknown as Prisma.InputJsonValue } })).catch(() => {});
    throw e;
  }
  await majSeance(prisma, s, (x) => {
    const m = lireMessages(x.messages);
    m.annulation = ref;
    return { ok: true, patch: { rappels: marquerFait(x.rappels, "annulation") as unknown as Prisma.InputJsonValue, messages: enJson(m) } };
  }).catch((e) => console.error(`[seances] annulation du siège ${s.cle} envoyée, mais pas rangée :`, e));
  return `message ${ref.lien}`;
}

/**
 * `evenement_essai` { evenement, message } — M12 : le message rendu avec le paramétrage
 * ENREGISTRÉ et la prochaine séance, dans le salon des essais, sans aucune mention et sans
 * boutons actifs. C'est l'outil qui permet de régler un texte sans attendre mercredi 13 h 30.
 */
export async function commandeEssai(client: Client, payload: Record<string, unknown>): Promise<string> {
  const ev = payload.evenement === "gs" ? "gs" : "cs";
  const message = typeof payload.message === "string" ? payload.message : "";
  const [pcs, pgs] = await Promise.all([parametres("cs", true), parametres("gs", true)]);
  const sal = await salons();
  const ch = await salonTexte(client, sal.essais);
  if (!ch) throw new Error("Aucun salon des essais : choisis-en un dans le paramétrage (Salons → Essais), ou renseigne CHANNEL_STAFF.");
  const now = Date.now();
  // Les chiffres d'un essai : ceux que le VRAI salon montrerait, et jamais dans un salon des
  // essais ouvert aux visiteurs.
  const vrai = await salonTexte(client, ev === "cs" ? sal.chambres : sal.siege);
  const vraiFerme = vrai ? fermeAuxVisiteurs(vrai) : false;
  const notes: string[] = [];
  if (vrai && !vraiFerme) notes.push("⚠️ Le salon de destination est visible des visiteurs : les chiffres n'y seront pas publiés.");
  if (!vrai) notes.push("⚠️ Le salon de destination est introuvable ou fermé au bot : ce message n'y partirait pas.");
  const chiffres = M.chiffresPermis({ degatsDiscord: pcs.degats.discord, salonFerme: vraiFerme && fermeAuxVisiteurs(ch) });

  let m: M.MessageSeance;
  if (ev === "gs") {
    // LE GUILD SIEGE (lot 9) : le message tel qu'il partirait — même éteint, c'est l'outil pour
    // le régler avant de l'allumer. La prochaine séance, ou une séance de démonstration.
    if (!pgs.actif) notes.push("Le Guild Siege est éteint : rien ne part tant que le staff ne l'allume pas (paramétrage).");
    const prochaine = prochaineSeanceGS(new Date(now), pgs.creneaux) ?? seanceGS(partiesParis(new Date(now + 86_400_000)).date, { id: "demo", jour: "sam", heure: "21:00", finInscription: "19:00" });
    if (!pgs.creneaux.length) notes.push("Aucun créneau réglé : séance de démonstration.");
    const chiffresGS = M.chiffresPermis({ degatsDiscord: pgs.degats.discord, salonFerme: vraiFerme && fermeAuxVisiteurs(ch) });
    if (message === "debrief") {
      const row = await prisma.seanceGuilde.findFirst({ where: { evenement: "gs", annulee: false, debriefPublieAt: { not: null } }, orderBy: { debut: "desc" } })
        ?? await prisma.seanceGuilde.findFirst({ where: { evenement: "gs", annulee: false, OR: [{ resultat: { not: null } }, { aRetenir: { not: null } }] }, orderBy: { debut: "desc" } });
      if (!row) throw new Error("Aucun débrief du Guild Siege à essayer : note d'abord une séance (onglet Bilans, filtre Guild Siege).");
      notes.push(`Débrief du Guild Siege du ${dateLongue(row.date)}${row.debriefPublieAt ? "" : " (brouillon : pas encore publié)"}.`);
      m = await composerDebriefGS(row, pgs);
    } else if (message === "annulation") {
      const suivante = prochaineSeanceGS(new Date(prochaine.debut.getTime() + 3_600_000), pgs.creneaux);
      m = M.avecMentions(M.messageAnnulation({ evenement: "gs", label: prochaine.label, dateLongue: dateLongue(prochaine.date), jourMeme: jourJ(prochaine), motif: "motif d'exemple", prochaine: suivante?.label ?? null, maj: now }), { everyone: jourJ(prochaine), users: [] });
    } else {
      const r = pgs.rappels.find((x) => x.id === message) ?? (message === "panneau" ? pgs.rappels.find((x) => x.type === "panneau") ?? RAPPELS_GS_DEFAUT[0] : undefined);
      if (!r) throw new Error("Rappel du Guild Siege inconnu : enregistre le paramétrage d'abord.");
      const cg = await contexteGS(prochaine, pgs);
      const calc = mentionsDuRappel(message === "panneau" ? "everyone" : r.mention, { nouveauxMessages: true, comptes: [], bloque: false });
      if (r.type === "gs_staff") notes.push(sal.staff ? "Il part dans le salon du staff (CHANNEL_STAFF)." : "⚠️ Aucun salon du staff (CHANNEL_STAFF) : ce rappel ne partirait pas.");
      if (r.type === "panneau") m = M.avecMentions(composerPanneauGS(cg, "ouvert", chiffresGS), calc);
      else m = M.avecMentions(composerRappelGS(r, cg, { chiffres: r.type === "jour" && chiffresGS, now }), calc, { liste: r.type === "jour" });
    }
  } else {
    if (message === "debrief") {
      // M7 et son image, rendus avec le DERNIER débrief noté (publié de préférence) : c'est le
      // message que « Publier » enverrait, dans le salon des essais.
      const row = await prisma.seanceGuilde.findFirst({ where: { evenement: "cs", annulee: false, debriefPublieAt: { not: null } }, orderBy: { debut: "desc" }, include: { participants: true } })
        ?? await prisma.seanceGuilde.findFirst({ where: { evenement: "cs", annulee: false, debrief: { not: Prisma.DbNull } }, orderBy: { debut: "desc" }, include: { participants: true } });
      if (!row) throw new Error("Aucun débrief à essayer : note d'abord une séance (onglet Bilans, ou /chambre debrief), ou importe celle du 18/10.");
      const deb = await salonGuilde(client, sal.debriefs);
      const debFerme = deb ? fermeAuxVisiteurs(deb) : false;
      const n: string[] = [`Débrief de la séance du ${dateLongue(row.date)}${row.debriefPublieAt ? "" : " (brouillon : pas encore publié)"}.`];
      if (!deb) n.push("⚠️ Le salon des débriefs est introuvable ou fermé au bot : le débrief n'y partirait pas.");
      else if (!debFerme) n.push("⚠️ Le salon des débriefs est visible des visiteurs : les chiffres n'y seront pas publiés.");
      if (!pcs.nouveauxMessages) n.push("Bascule coupée : le débrief ne part pas encore dans le salon des débriefs (le bot Python publie encore les siens).");
      const { message: m7, png } = await composerPublication(row, pcs, M.chiffresPermis({ degatsDiscord: pcs.degats.discord, salonFerme: debFerme && fermeAuxVisiteurs(ch) }));
      const e = M.enEssai(m7, n.join("\n"));
      const sent = await ch.send({ content: e.content, embeds: e.embeds, components: e.components, allowedMentions: e.allowedMentions, files: [{ attachment: png, name: M.IMAGE_DEBRIEF }] });
      return `message ${sent.url}`;
    }
    if (message === "echange") {
      // Lot 10 : la demande d'échange, telle que le joueur visé la reçoit en MESSAGE PRIVÉ — avec
      // des noms d'exemple : une vraie demande ne se fabrique pas pour un essai.
      const s = seanceCouranteParis(new Date(now));
      const roles = { jumeaux: "dps", golems: "dps", araignee: "dps" } as const;
      const ctx = { joueurs: [{ pseudo: "Kaelis", classe: "Arcaniste", roles }, { pseudo: "Thorn", classe: "Templier", roles }], salles: pcs.salles };
      const salle = pcs.salles[2] ?? pcs.salles[0];
      const exemple = { id: "essai", de: "kaelis", a: "thorn", quoi: `salle:${salle?.cle ?? "s3"}` as const, ts: now };
      notes.push("En vrai, ce message part en privé au joueur visé — jamais dans un salon. Noms d'exemple.");
      if (!pcs.nouveauxMessages) notes.push("Bascule coupée : les demandes d'échange ne partent pas encore en message privé ; le site les montre déjà (notification et onglet Répartition).");
      const m = M.messageDemandeEchange({
        cle: s.cle, id: "essai", jour: dateLongue(s.date), texte: texteDemande(exemple, ctx, "cible"), consigne: pcs.textes.echange,
        vars: { date: dateLongue(s.date), heure: heureDite(partiesParis(s.debut).hhmm), lien: lienRepartition() }, expire: now + DUREE_DEMANDE_MS, site: SITE_URL, maj: now,
      });
      const sent = await envoyer(ch, M.enEssai(m, notes.join("\n")));
      return `message ${sent.lien}`;
    }
    const r0 = pcs.rappels.find((x) => x.id === message);
    // Le récap, la répartition et le chrono visent la séance qui se joue (ou qu'on prépare) :
    // celle dont la répartition se fait, et qu'on chronomètre.
    const courante = message === "recap" || message === "repartition" || message === "chrono" || r0?.type === "recap" || r0?.type === "chrono";
    const s = courante ? seanceCouranteParis(new Date(now)) : prochaineSeanceParis(new Date(now));
    const c = await contexte(s, pcs);
    if (message === "chrono" || r0?.type === "chrono") {
      // M6 dans l'état du moment (le plus souvent « Démarrer ») : sa phrase, ses étapes, les
      // monstres de l'étape en cours, les joueurs et leurs chiffres DÉCLARÉS, ses boutons inactifs.
      const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { chrono: true, etapes: true } });
      const comptes = c.parts.participants.map((x) => (x.userId ? c.discord.get(x.userId) : undefined)).filter((x): x is string => !!x);
      const calc = mentionsDuRappel(r0?.mention ?? "aucune", { nouveauxMessages: pcs.nouveauxMessages, comptes, bloque: false });
      if (!pcs.nouveauxMessages) notes.push("Bascule coupée : le chrono ne part pas encore dans Discord (sur le site, l'onglet Chrono le tient déjà).");
      else if (r0 && !r0.actif) notes.push("Ce rappel est coupé : le chrono se publie à la main (/chambre chrono, ou « Publier dans Discord » sur le site).");
      const sent = await envoyer(ch, M.enEssai(M.avecMentions(composerChrono(c, pcs, lireChrono(row?.chrono), derouleDe(row?.etapes, pcs).etapes, "ouvert", chiffres), calc, { tete: "⏱️ Le chrono de ce soir" }), notes.join("\n")));
      return `message ${sent.lien}`;
    }
    if (message === "repartition") {
      // Les DEUX messages à boutons (Phase 1, Phase 2), tels que /chambre repartition les
      // publierait : leur consigne (paramétrage), les salles et les équipes du moment, aucune
      // mention, boutons inactifs (« 🧪 Ceci est un essai. »).
      const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { repartition: true } });
      const rep = lireRepartition(row?.repartition);
      if (!pcs.nouveauxMessages) notes.push("Bascule coupée : la répartition à boutons ne se publie pas encore.");
      const liens: string[] = [];
      for (const q of ["phase1", "phase2"] as const) {
        const sent = await envoyer(ch, M.enEssai(composerPhase(q, c, pcs, rep, "ouvert", chiffres), notes.join("\n")));
        liens.push(sent.lien);
      }
      return `messages ${liens.join(" ")}`;
    }
    if (message === "recap" || r0?.type === "recap") {
      const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { repartition: true } });
      const comptes = c.parts.participants.map((x) => (x.userId ? c.discord.get(x.userId) : undefined)).filter((x): x is string => !!x);
      const calc = mentionsDuRappel(r0?.mention ?? "participants", { nouveauxMessages: pcs.nouveauxMessages, comptes, bloque: false });
      const sansCompte = c.parts.participants.filter((x) => !x.userId || !c.discord.get(x.userId)).map((x) => x.pseudo);
      if (r0 && !conditionRemplie(r0, { manque: c.manqueParticipants, participants: c.parts.participants.length })) notes.push("Ce soir, ce rappel ne partirait pas : personne ne s'est encore annoncé.");
      if (!pcs.nouveauxMessages) notes.push("Bascule coupée : le récap ne part pas encore à 20 h 40.");
      m = M.avecMentions(composerRecap(c, pcs, lireRepartition(row?.repartition), "ouvert", chiffres), calc, { tete: "📋 Récap de ce soir", gras: sansCompte });
    } else if (message === "panneau") {
      m = M.avecMentions(await rendrePanneau(s, pcs, "ouvert", chiffres), { everyone: true, users: [] });
    } else if (message === "annulation") {
      m = M.avecMentions(M.messageAnnulation({ label: s.label, dateLongue: dateLongue(s.date), jourMeme: jourJ(s), motif: "motif d'exemple", prochaine: prochaineSeanceParis(new Date(s.debut.getTime() + 3_600_000)).label, maj: now }), { everyone: jourJ(s), users: [] });
    } else {
      const r = pcs.rappels.find((x) => x.id === message);
      if (!r) throw new Error("Rappel inconnu : enregistre le paramétrage d'abord.");
      const comptes = c.parts.participants.map((x) => (x.userId ? c.discord.get(x.userId) : undefined)).filter((x): x is string => !!x);
      const calc = mentionsDuRappel(r.mention, { nouveauxMessages: pcs.nouveauxMessages, comptes, bloque: false });
      if (r.type === "panneau" && pcs.panneau && pcs.nouveauxMessages) m = M.avecMentions(await rendrePanneau(s, pcs, "ouvert", chiffres), calc);
      else {
        if (r.type === "panneau") notes.push(pcs.nouveauxMessages ? "Panneau coupé : la veille, c'est ce message simple qui part." : "Bascule coupée : la veille, c'est ce message simple qui part, pas encore le panneau.");
        if (!conditionRemplie(r, { manque: r.type === "jour" ? c.manqueParticipants : c.manqueAnnonces, participants: c.parts.participants.length })) notes.push("Ce soir, ce rappel ne partirait pas : sa condition n'est pas remplie (effectif complet, ou personne).");
        const sansCompte = c.parts.participants.filter((x) => !x.userId || !c.discord.get(x.userId)).map((x) => x.pseudo);
        m = M.avecMentions(composerRappel(r, c, pcs, { chiffres, lienPanneau: null }), calc, { liste: r.type === "jour", gras: sansCompte });
      }
    }
  }
  const sent = await envoyer(ch, M.enEssai(m, notes.join("\n")));
  return `message ${sent.lien}`;
}

/** Le compte d'un auteur de commande, relu EN BASE par `discordId`, et pourquoi il ne peut
 *  pas lire les données de la guilde (null : il peut). Un membre caché garde l'accès à SES
 *  chiffres et à SON historique : seule l'annonce le ferait apparaître parmi les joueurs. */
export async function compteDiscord(discordId: string) {
  const user = await prisma.user.findUnique({ where: { discordId }, select: { id: true, username: true, role: true, isActive: true, cacheLe: true } });
  const refus = refusMembre(user);
  return { user, refus: refus === "compte_cache" ? null : refus };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES CLICS (§4.12 ; M9) — `deferReply` AVANT de lire la base : Discord abandonne une
   interaction sans réponse au bout de 3 s (piège n° 16)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

type Perso = { id: string; name: string; class: string; isMain: boolean };
type Prepare =
  | { ok: true; compte: Compte; s: SeanceParis; p: ParametresCS; postes: Poste[]; etat: CompoState; tous: Perso[]; jouables: Perso[] }
  | { ok: false; texte: string };

/**
 * La garde commune des gestes de membre : le compte EN BASE (par `discordId`), membre de la
 * guilde, actif et visible ; puis la séance du panneau, qui doit être celle qu'on prépare,
 * ni annulée ni clôturée.
 */
async function preparer(discordId: string, cle: string, o: { seance: boolean }): Promise<Prepare> {
  const user = await prisma.user.findUnique({ where: { discordId }, select: { id: true, username: true, role: true, isActive: true, cacheLe: true } });
  const refus = refusMembre(user);
  if (refus) return { ok: false, texte: M.reponse(refus, { site: SITE_URL }) };
  const s = prochaineSeanceParis(new Date());
  if (o.seance) {
    if (cle !== s.cle) {
      const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { messages: true } });
      const pan = lireMessages(row?.messages).panneau;
      return { ok: false, texte: M.reponse("panneau_perime", { lien: pan && !pan.ferme ? pan.lien : null, site: SITE_URL }) };
    }
    const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { annulee: true, clotureAt: true } });
    if (row?.annulee) return { ok: false, texte: M.reponse("seance_annulee") };
    if (row?.clotureAt) return { ok: false, texte: M.reponse("seance_cloturee") };
  }
  const p = await parametres("cs");
  const postes = postesEffectifs(p);
  const [etat, tous] = await Promise.all([
    lireCompo(prisma),
    prisma.character.findMany({ where: { userId: user!.id }, select: { id: true, name: true, class: true, isMain: true } }),
  ]);
  return { ok: true, compte: { id: user!.id, username: user!.username }, s, p, postes, etat, tous, jouables: persosJouables(tous, postes, etat.signups) };
}

const quand = (s: SeanceParis) => (jourJ(s) ? "ce soir" : JOURS_LONGS[jourDeDate(s.date)]);

/** Le menu des postes de chaque perso annoncé qui n'en a pas encore (4 au plus : une rangée
 *  par menu, et le message garde de la place). */
function menusPostes(v: Extract<Prepare, { ok: true }>, persos: Perso[]): { menus: M.Rangee[]; sansPoste: string[] } {
  const sans = persos.filter((c) => !posteDuPseudo(v.etat.signups, c.name));
  const menus = sans.slice(0, 4).map((c) => M.menuPoste(v.s.cle, c.name, classeAffichee(c.class), postesDeLaClasse(v.postes, c.class).map((p) => ({
    id: p.id, label: libellePoste(p, v.etat.slotMeta), inscrits: v.etat.signups.filter((x) => x.slotId === p.id).length,
  })))).filter((x): x is M.Rangee => !!x);
  return { menus, sansPoste: sans.map((c) => c.name) };
}

async function annoncerEtRepondre(i: ButtonInteraction | StringSelectMenuInteraction, v: Extract<Prepare, { ok: true }>, choisis: Perso[]) {
  const res = await modifierCompo(prisma, (e) => ({ ok: true, valeur: annoncer(e, v.s, choisis, v.tous, v.compte, Date.now()) }));
  if (!res.ok) { await i.editReply({ content: M.reponse("erreur"), components: [], allowedMentions: SANS_MENTION }); console.error("[seances] « Je viens » :", res.message); return; }
  const { menus, sansPoste } = menusPostes(v, choisis);
  const retires = res.valeur.retires.length ? `\n❌ ${res.valeur.retires.map((n) => `**${M.echapper(n)}**`).join(", ")} ${res.valeur.retires.length > 1 ? "ne sont plus annoncés" : "n'est plus annoncé"}.` : "";
  const retenus = res.valeur.retenusRetires.length ? `\n${M.reponse("retenu_decoche", { noms: res.valeur.retenusRetires })}` : "";
  const texte = M.reponse("annonce", { noms: choisis.map((c) => c.name), classe: classeAffichee(choisis[0].class), label: v.s.label, sansPoste: menus.length ? sansPoste : [] }) + retires + retenus;
  await i.editReply({ content: texte, components: M.composantsAnnonce(v.s.cle, menus), allowedMentions: SANS_MENTION });
  rafraichirPanneau(i.client, v.s).catch((e) => console.error("[seances] panneau après un clic :", e));
}

async function cliquerJeViens(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparer(i.user.id, cle, { seance: true });
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  if (!v.jouables.length) { await i.editReply({ content: M.reponse("aucun_perso", { site: SITE_URL }), allowedMentions: SANS_MENTION }); return; }
  if (v.jouables.length > 1) {
    const annonces = new Set(annoncesDeLaSeance(v.etat, v.s).map((p) => p.pseudo.toLowerCase()));
    await i.editReply({ content: M.reponse("plusieurs", { quand: quand(v.s) }), components: M.menuPersos(cle, v.jouables, annonces), allowedMentions: SANS_MENTION });
    return;
  }
  await annoncerEtRepondre(i, v, [v.jouables[0]]);
}

async function cliquerPasCetteFois(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparer(i.user.id, cle, { seance: true });
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  const res = await modifierCompo(prisma, (e) => ({ ok: true, valeur: retirerAnnonces(e, v.s, v.tous) }));
  if (!res.ok) { await i.editReply({ content: M.reponse("erreur"), allowedMentions: SANS_MENTION }); return; }
  const retirees = res.valeur;
  const texte = !retirees.length ? M.reponse("pas_annonce", { jour: quand(v.s) })
    : retirees.some((p) => p.retenu) ? M.reponse("retire_retenu")
      : M.reponse("pas_cette_fois", { noms: retirees.map((p) => p.pseudo), jour: quand(v.s) });
  await i.editReply({ content: texte, allowedMentions: SANS_MENTION });
  if (retirees.length) rafraichirPanneau(i.client, v.s).catch((e) => console.error("[seances] panneau après un clic :", e));
}

async function choisirPersos(i: StringSelectMenuInteraction, cle: string) {
  await i.deferUpdate();
  const v = await preparer(i.user.id, cle, { seance: true });
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  // Jamais confiance au menu : seuls les persos jouables DU COMPTE, relus en base, comptent.
  const voulus = new Set(i.values.map((x) => x.toLowerCase()));
  const choisis = v.jouables.filter((c) => voulus.has(c.name.toLowerCase()));
  if (!choisis.length) { await i.editReply({ content: M.reponse("perso_inconnu"), components: [], allowedMentions: SANS_MENTION }); return; }
  await annoncerEtRepondre(i, v, choisis);
}

async function choisirPoste(i: StringSelectMenuInteraction, cle: string, pseudo: string) {
  await i.deferUpdate();
  // Un poste est une inscription DURABLE, qui ne dépend d'aucune date : le menu reste valable
  // même si la séance a basculé entre-temps.
  const v = await preparer(i.user.id, cle, { seance: false });
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const perso = v.tous.find((c) => c.name.toLowerCase() === pseudo.toLowerCase());
  if (!perso) { await i.editReply({ content: M.reponse("perso_inconnu"), components: [], allowedMentions: SANS_MENTION }); return; }
  const poste = postesDeLaClasse(v.postes, perso.class).find((p) => p.id === i.values[0]);
  if (!poste) { await i.editReply({ content: M.reponse("poste_inconnu"), components: [], allowedMentions: SANS_MENTION }); return; }
  const res = await modifierCompo(prisma, (e) => ({ ok: true, valeur: inscrireAuPoste(e, perso, poste, v.compte, Date.now()) }));
  if (!res.ok) { await i.editReply({ content: M.reponse("erreur"), allowedMentions: SANS_MENTION }); return; }
  // Les autres menus du message (plusieurs persos annoncés) restent : un choix ne les efface pas.
  // Le bouton « ❌ Pas cette fois » de la réponse reste aussi : il n'est pas un menu.
  const restants = i.message.components.map((r) => r.toJSON() as M.Rangee).filter((r) => !r.components.some((c) => "custom_id" in c && c.custom_id === i.customId));
  const ligne = M.reponse(res.valeur === "deja" ? "poste_deja" : "poste_choisi", { noms: [perso.name], poste: libellePoste(poste, v.etat.slotMeta) });
  await i.editReply({ content: M.avecMenu(restants).length ? `${ligne}\nTu peux choisir le poste des autres ci-dessous.` : ligne, components: restants, allowedMentions: SANS_MENTION });
  rafraichirPanneau(i.client, v.s).catch((e) => console.error("[seances] panneau après un clic :", e));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 4 — LA RÉPARTITION DEPUIS DISCORD (décision 1 de Maxime : « tout se fait aussi dans
   Discord ») : 📍 Mes positions et ses menus, les boutons des salles et des jumeaux, les menus
   du staff. La même garde, la même écriture (`modifierRepartition`), les mêmes règles
   (lib/chambres) que la route 5 du site : un geste fait ici se lit là-bas, et inversement.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

type Auteur = { user: { id: string }; member: unknown };
type PrepRep =
  | { ok: true; s: SeanceParis; p: ParametresCS; c: Contexte; joueurs: M.JoueurRecap[]; rep: Repartition; staff: boolean; miens: string[]; nonRetenus: string[]; auteur: string }
  | { ok: false; texte: string };

/**
 * La garde d'un geste de répartition. Le compte est relu EN BASE par `discordId` : de la guilde
 * et actif, sinon ⛔ (le serveur compte aussi des visiteurs, des candidats et des amis, qui ne
 * doivent rien voir des joueurs). Le staff : `isStaff`, ou un rang staff en base. La séance est
 * celle du bouton — qui se joue, ou qu'on prépare —, ni annulée ni clôturée.
 */
async function preparerRepartition(i: Auteur, cle: string, o: { staff?: boolean } = {}): Promise<PrepRep> {
  const { user, refus } = await compteDiscord(i.user.id);
  const staff = !!user && (isStaff(i.member as GuildMember | null) || canAccessAdmin(user.role));
  // Le compte d'abord : un visiteur, un candidat ou un ami n'apprend rien d'autre (pas même
  // que la séance est passée). Un membre CACHÉ n'est jamais parmi les joueurs : il reçoit le ⛔
  // du compte caché, comme sous « ✅ Je viens » (M9). La règle est pure (refusRepartition).
  const garde = { refus: user ? refus : ("compte_non_lie" as const), cache: !!user?.cacheLe, staff, exigeStaff: !!o.staff, site: SITE_URL };
  const avant = M.refusRepartition({ ...garde, seanceValable: true, annulee: false, cloturee: false });
  if (avant || !user) return { ok: false, texte: avant ?? M.reponse("compte_non_lie", { site: SITE_URL }) };
  const s = seanceDuBouton(cle, new Date());
  const row = s ? await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { annulee: true, clotureAt: true, repartition: true } }) : null;
  const apres = M.refusRepartition({ ...garde, seanceValable: !!s, annulee: !!row?.annulee, cloturee: !!row?.clotureAt });
  if (apres || !s) return { ok: false, texte: apres ?? "⚠️ Cette répartition est celle d'une séance passée." };
  // Relu FRAIS, comme la route 5 du site : un geste écrit la répartition NETTOYÉE avec ces
  // salles — avec un cache de 30 s, une salle ajoutée sur le site juste avant serait effacée.
  const p = await parametres("cs", true);
  const c = await contexte(s, p);
  const joueurs = c.parts.participants.map(c.joueur);
  return {
    ok: true, s, p, c, joueurs, staff,
    rep: nettoyer(lireRepartition(row?.repartition), joueurs, p.salles),
    miens: c.parts.participants.filter((x) => x.userId === user.id).map((x) => cleJoueur(x.pseudo)),
    // Annoncé, mais le staff en a retenu d'autres : la réponse le dit, au lieu de « annonce-toi ».
    nonRetenus: c.parts.autres.filter((x) => x.userId === user.id).map((x) => x.pseudo),
    auteur: user.username,
  };
}
type Prete = Extract<PrepRep, { ok: true }>;

/** Écrit un geste (sous le verrou de la séance), garde la répartition relue pour la réponse, et
 *  remet à jour le récap et les messages de répartition tout de suite. Lot 10 : un geste
 *  d'échange prévient le joueur concerné — la notification du site part de
 *  `modifierRepartition`, le message privé d'ici (`avertirEchange`). */
async function geste(client: Client, v: Prete, a: ActionRepartition): Promise<M.ResultatGeste & { echange?: EchangeFait }> {
  const now = Date.now();
  const comptes = new Map(v.c.parts.participants.map((x) => [cleJoueur(x.pseudo), x.userId]));
  // Les chiffres DÉCLARÉS : le calcul les lit toujours (les mêmes équipes que sur le site) ; la
  // réponse d'« Équilibrer » ne les DIT que si le paramétrage les montre dans Discord.
  const res = await modifierRepartition(prisma, v.s, a, { joueurs: v.joueurs, salles: v.p.salles, staff: v.staff, miens: v.miens, nonRetenus: v.nonRetenus.map(cleJoueur), maintenant: now, chiffresVisibles: v.p.degats.discord },
    { comptes: (k) => comptes.get(k) ?? null, discord: v.p.nouveauxMessages });
  if (res.echange) avertirEchange(client, v.s, res.echange.demande.id, res.echange.quoi).catch((e) => console.error("[seances] message privé de l'échange :", e));
  if (!res.ok) {
    // Une acceptation devenue impossible est ÉCRITE (la demande se clôt) : la répartition relue suit.
    if (res.seance) v.rep = nettoyer(lireRepartition(res.seance.repartition), v.joueurs, v.p.salles, now);
    return { ok: false, status: res.status === 403 ? 403 : res.status === 400 ? 400 : 409, message: res.message, echange: res.echange };
  }
  v.rep = nettoyer(res.repartition, v.joueurs, v.p.salles, now);
  // Le journal garde les gestes du staff sur les AUTRES, comme la route 5 du site : qu'un placement
  // vienne de Discord ou du site, la page Journal dit qui l'a fait. Lot 10 : « équilibrer », et
  // une réponse du staff à une demande qui ne le vise pas.
  const surAutrui = a.action === "auto" || a.action === "jumeau_echanger" || a.action === "liberer" || a.action === "equilibrer"
    || (a.action === "repondre" && res.echange?.demande.reponse?.par === "staff")
    || ("pseudo" in a && !!a.pseudo && !v.miens.includes(cleJoueur(a.pseudo))) || ("force" in a && !!a.force);
  if (v.staff && surAutrui) {
    await prisma.auditLog.create({ data: { actor: v.auteur, action: "seance.repartition", target: v.s.cle, detail: `${res.message} (Discord)` } }).catch(() => {});
  }
  rafraichirSeance(client, v.s, ["recap", "phase1", "phase2"]).catch((e) => console.error("[seances] répartition après un clic :", e));
  return { ok: true, message: res.message, echange: res.echange };
}

/** M10 — la réponse 📍 Mes positions, avec les menus de ses persos (deux au plus : quatre menus). */
function vuePositions(v: Prete, note?: string) {
  const rc = recap(v.joueurs, v.rep, v.p, v.c.places);
  const miens = v.c.parts.participants.filter((x) => v.miens.includes(cleJoueur(x.pseudo)));
  const positions = miens.flatMap((x) => {
    const pos = positionsDe(rc, x.pseudo);
    return pos ? [{ ...pos, poste: x.poste, retenu: x.retenu }] : [];
  });
  const menus = miens.slice(0, 2).flatMap((x) => {
    const j = v.joueurs.find((y) => cleJoueur(y.pseudo) === cleJoueur(x.pseudo))!;
    return [M.menuMesSalles(v.s.cle, x.pseudo, v.p.salles, rc.repartition), M.menuMonEquipe(v.s.cle, j, rc.repartition.jumeaux[cleJoueur(x.pseudo)] ?? null)];
  }).filter((x): x is M.Rangee => !!x);
  // Lot 10 : 🔄 Échanges, et les demandes qui attendent sa réponse.
  const now = Date.now();
  const recues = v.rep.demandes.filter((d) => v.miens.includes(d.a) && enAttente(d, now)).length;
  return M.messagePositions({
    cle: v.s.cle, label: v.s.label, positions, nomGolems: v.p.noms.golems, source: v.c.parts.source, menus, note, site: SITE_URL, nonRetenus: v.nonRetenus,
    echanges: positions.length > 0 || v.staff, demandesRecues: recues,
  });
}

const nomDe = (v: Prete, k: string) => v.joueurs.find((j) => cleJoueur(j.pseudo) === k)?.pseudo ?? k;
const sallesStaff = (v: Prete) => v.p.salles.map((x) => ({ ...x, occupant: v.rep.salles[x.cle] ? nomDe(v, v.rep.salles[x.cle]) : null }));

/** `/chambre positions` : la même réponse que le bouton, pour la séance qui se joue (ou qu'on prépare). */
export async function repondrePositions(i: Auteur & { editReply: ButtonInteraction["editReply"] }) {
  const v = await preparerRepartition(i, seanceCouranteParis(new Date()).cle);
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  await i.editReply(vuePositions(v));
}

async function cliquerPositions(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  await i.editReply(vuePositions(v));
}

async function choisirMesSalles(i: StringSelectMenuInteraction, cle: string, pseudo: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const r = await geste(i.client, v, { action: "salles", salles: i.values, pseudo });
  await i.editReply(vuePositions(v, M.reponseGeste(r)));
}

async function choisirMonEquipe(i: StringSelectMenuInteraction, cle: string, pseudo: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  // La place actuelle re-choisie ne la quitte pas : `gesteMonEquipe` le dit sans rien écrire.
  const g = M.gesteMonEquipe(i.values[0], v.rep.jumeaux[cleJoueur(pseudo)], pseudo);
  const r: M.ResultatGeste = "deja" in g ? g.deja : await geste(i.client, v, g.action);
  await i.editReply(vuePositions(v, M.reponseGeste(r)));
}

/** Un bouton de salle (Phase 1) : prendre ou libérer, pour SON perso. Plusieurs persos parmi les
 *  joueurs : 📍 Mes positions choisit pour chacun. */
async function cliquerSalle(i: ButtonInteraction, cle: string, salle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  const plusieurs = M.refusPlusieurs(v.miens.length, "salle");
  if (plusieurs) { await i.editReply({ content: plusieurs, allowedMentions: SANS_MENTION }); return; }
  const r = await geste(i.client, v, { action: "salle", salle });
  await i.editReply({ content: M.reponseGeste(r), allowedMentions: SANS_MENTION });
}

/** Un bouton d'équipe (Phase 2) : rejoindre, ou quitter d'un second clic. */
async function cliquerJumeau(i: ButtonInteraction, cle: string, place: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  if (!estPlace(place)) { await i.editReply({ content: "Ce bouton ne sert plus.", allowedMentions: SANS_MENTION }); return; }
  const plusieurs = M.refusPlusieurs(v.miens.length, "equipe");
  if (plusieurs) { await i.editReply({ content: plusieurs, allowedMentions: SANS_MENTION }); return; }
  const r = await geste(i.client, v, { action: "jumeau", place });
  await i.editReply({ content: M.reponseGeste(r), allowedMentions: SANS_MENTION });
}

/** « Compléter (staff) » : chaque salle vide au participant qui en tient le moins. */
async function cliquerAuto(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  const r = await geste(i.client, v, { action: "auto" });
  await i.editReply({ content: M.reponseGeste(r), allowedMentions: SANS_MENTION });
}

/** « Placer (staff) » : la salle, puis le joueur (ou « Libérer »). */
async function cliquerPlacer(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  await i.editReply({ content: "🌳 Phase 1 — placement du staff : choisis la salle, puis le joueur.", components: [M.menuChoixSalle(v.s.cle, sallesStaff(v))], allowedMentions: SANS_MENTION });
}

async function choisirSalleStaff(i: StringSelectMenuInteraction, cle: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const salle = v.p.salles.find((x) => x.cle === i.values[0]);
  if (!salle) { await i.editReply({ content: "⚠️ Cette salle n'existe plus.", components: [M.menuChoixSalle(v.s.cle, sallesStaff(v))], allowedMentions: SANS_MENTION }); return; }
  const occ = v.rep.salles[salle.cle] ?? null;
  await i.editReply({
    content: `🌳 **${M.echapper(salle.label)}** ${occ ? `(tenue par ${M.echapper(nomDe(v, occ))})` : "(libre)"} : choisis le joueur, ou libère-la.`,
    components: [M.menuChoixSalle(v.s.cle, sallesStaff(v), salle.cle), M.menuJoueurSalle(v.s.cle, salle.cle, v.joueurs, occ)].filter((x): x is M.Rangee => !!x),
    allowedMentions: SANS_MENTION,
  });
}

async function choisirJoueurSalle(i: StringSelectMenuInteraction, cle: string, salle: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const r = await geste(i.client, v, M.gesteJoueurSalle(i.values[0], salle));
  await i.editReply({ content: `${M.reponseGeste(r)}
Tu peux en placer une autre.`, components: [M.menuChoixSalle(v.s.cle, sallesStaff(v))], allowedMentions: SANS_MENTION });
}

/** « Placer · échanger (staff) » : le joueur, puis sa place, un retrait ou un échange. */
async function cliquerEchanger(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  if (!v.joueurs.length) { await i.editReply({ content: "Personne ne joue encore cette séance.", allowedMentions: SANS_MENTION }); return; }
  await i.editReply({ content: "👯 Phase 2 — placement du staff : choisis le joueur, puis sa place, un retrait ou un échange.", components: [M.menuChoixJoueur(v.s.cle, v.joueurs, v.rep)], allowedMentions: SANS_MENTION });
}

async function choisirJoueurStaff(i: StringSelectMenuInteraction, cle: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const j = v.joueurs.find((x) => cleJoueur(x.pseudo) === cleJoueur(i.values[0]));
  if (!j) { await i.editReply({ content: "⚠️ Ce joueur n'est plus parmi les participants.", components: [M.menuChoixJoueur(v.s.cle, v.joueurs, v.rep)], allowedMentions: SANS_MENTION }); return; }
  const place = v.rep.jumeaux[cleJoueur(j.pseudo)];
  await i.editReply({
    content: `👯 **${M.echapper(j.pseudo)}** — ${place ? M.placeDite(place) : "pas encore placé"} : choisis sa place, un retrait ou un échange.`,
    components: [M.menuChoixJoueur(v.s.cle, v.joueurs, v.rep, j.pseudo), M.menuActionJumeau(v.s.cle, j, v.joueurs, v.rep)].filter((x): x is M.Rangee => !!x),
    allowedMentions: SANS_MENTION,
  });
}

async function choisirActionStaff(i: StringSelectMenuInteraction, cle: string, pseudo: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const a = M.gesteActionStaff(i.values[0], pseudo);
  const r: M.ResultatGeste = a ? await geste(i.client, v, a) : { ok: false, status: 400, message: "Geste inconnu." };
  await i.editReply({ content: `${M.reponseGeste(r)}
Tu peux continuer.`, components: [M.menuChoixJoueur(v.s.cle, v.joueurs, v.rep)], allowedMentions: SANS_MENTION });
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 10 — LES ÉCHANGES ET L'ÉQUILIBRAGE DEPUIS DISCORD (§4.4, §4.5 ; décision 1 de Maxime :
   « tout se fait aussi dans Discord »). La même garde (`preparerRepartition` : le compte relu EN
   BASE, de la guilde), la même écriture (`modifierRepartition`) et les mêmes règles
   (lib/chambres) que la route 5 du site.
   - 🔄 Échanges (le bouton de 📍 Mes positions) : les demandes reçues, à trancher (staff) et
     envoyées, et le menu « Demander une place » de ses persos ;
   - la demande part au joueur visé en MESSAGE PRIVÉ (✅ Accepter, ❌ Refuser) — jamais dans le
     salon : le modèle l'y publiait (bot.py:1302-1305), ce qui encombrait le salon pour une
     affaire entre deux personnes (§4.5) ; la réponse part au demandeur de même ;
   - « Équilibrer (staff) » sur le message des jumeaux : un aperçu éphémère, puis la confirmation.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** 🔄 Échanges : la vue éphémère, d'après la répartition relue (`v.rep`). */
function vueEchanges(v: Prete, note?: string) {
  const now = Date.now();
  const vue = vueRepartition(v.rep, { joueurs: v.joueurs, salles: v.p.salles }, { miens: v.miens, staff: v.staff, now });
  const ligne = (d: VueDemande): M.LigneEchange => ({ id: d.id, texte: d.texte, expire: d.expire, valable: d.valable, raison: d.raison, reponse: d.reponse });
  // « Demander une place » : pas pour le staff, qui place directement (« Placer · échanger ») —
  // comme sur le site (onglet Répartition).
  const menus = v.staff ? [] : vue.echanges.slice(0, 2).map((e) => M.menuDemanderEchange(v.s.cle, e.pseudo, e.options)).filter((x): x is M.Rangee => !!x);
  return M.messageEchanges({
    cle: v.s.cle, label: v.s.label,
    recues: vue.demandes.filter((d) => d.pourMoi && !d.reponse).map(ligne),
    aTrancher: vue.demandes.filter((d) => !d.pourMoi && !d.deMoi && !d.reponse).map(ligne),
    envoyees: vue.demandes.filter((d) => d.deMoi && !d.pourMoi).map(ligne),
    menus, consigne: remplirTexte(v.p.textes.echange, { date: dateLongue(v.s.date), heure: heureDite(partiesParis(v.s.debut).hhmm), lien: lienRepartition() }).trim(),
    note, site: SITE_URL,
  });
}

const lienRepartition = () => (SITE_URL ? `${SITE_URL}/compositions?onglet=repartition` : "");

async function cliquerEchanges(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  await i.editReply(vueEchanges(v));
}

/** Le menu « Demander une place… » d'un perso : la demande s'écrit, le joueur visé est prévenu
 *  (notification du site, message privé), et la vue se remet à jour avec le verdict. */
async function choisirDemande(i: StringSelectMenuInteraction, cle: string, pseudo: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const choix = M.lireValeurDemande(i.values[0] ?? "");
  const r: M.ResultatGeste = choix ? await geste(i.client, v, { action: "demander", quoi: choix.quoi, avec: choix.avec, pseudo }) : { ok: false, status: 400, message: "Ce choix ne sert plus : rouvre 🔄 Échanges." };
  await i.editReply(vueEchanges(v, M.reponseGeste(r)));
}

/**
 * ✅ Accepter / ❌ Refuser (ou retirer la sienne) : `cs:echr:<clé>:<id>:o|n`. Le bouton vit dans
 * le message privé du joueur visé, ou dans 🔄 Échanges. Le compte est relu en base à chaque clic :
 * un message privé transféré ne donne aucun droit (« Cette demande ne t'est pas adressée. »).
 */
async function cliquerReponse(i: ButtonInteraction, cle: string, reste: string) {
  await i.deferUpdate();
  const m = /^([a-z0-9-]{4,40}):([on])$/.exec(reste);
  if (!m) { await i.followUp({ content: "Ce bouton ne sert plus.", flags: EPH, allowedMentions: SANS_MENTION }); return; }
  const [, id, oui] = m;
  const accepter = oui === "o";
  // Un message privé n'a pas de serveur ; `i.channel` peut manquer du cache en privé.
  const prive = !i.inGuild();
  const v = await preparerRepartition(i, cle);
  if (!v.ok) {
    if (prive) await i.editReply(M.messageDemandeEchange(await donneesDemande(cle, id, v.texte)));
    else await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION });
    return;
  }
  const r = await geste(i.client, v, { action: "repondre", demande: id, accepter });
  const verdict = M.verdictEchange(r, accepter);
  if (!prive) { await i.editReply(vueEchanges(v, verdict)); return; }
  // Le message privé se ferme sur le verdict, sauf un refus de droit (⛔) : la demande attend
  // toujours celui à qui elle s'adresse.
  if (!r.ok && r.status === 403) { await i.followUp({ content: verdict, flags: EPH, allowedMentions: SANS_MENTION }); return; }
  await i.editReply(M.messageDemandeEchange(await donneesDemande(cle, id, verdict)));
}

/** Le contenu d'une demande pour son message privé, relu en base : le texte que le joueur visé
 *  a reçu, et le verdict qui la ferme. Une demande disparue garde un texte neutre. */
async function donneesDemande(cle: string, id: string, fermee?: string): Promise<M.DonneesDemandeEchange> {
  const s = seanceDeCle(cle);
  const p = await parametres("cs");
  const row = s ? await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { repartition: true } }) : null;
  const d = lireRepartition(row?.repartition).demandes.find((x) => x.id === id);
  const c = s && d ? await contexte(s, p) : null;
  const ctx = c ? { joueurs: c.parts.participants.map(c.joueur), salles: p.salles } : null;
  return {
    cle, id, jour: s ? dateLongue(s.date) : "", texte: d && ctx ? texteDemande(d, ctx, "cible") : "Demande d'échange de place.",
    consigne: p.textes.echange, vars: s ? { date: dateLongue(s.date), heure: heureDite(partiesParis(s.debut).hhmm), lien: lienRepartition() } : {},
    expire: (d?.ts ?? Date.now()) + DUREE_DEMANDE_MS, site: SITE_URL, maj: Date.now(), fermee,
  };
}

/**
 * LE MESSAGE PRIVÉ D'UN ÉCHANGE — d'où que vienne le geste : un clic ici (appel direct), ou le
 * site (commande `seance_echange`, mise en file par la route 5). Tout est relu en base : la
 * demande, ses joueurs, leur compte Discord. Après la bascule seulement (§8.10) ; jamais pour une
 * séance annulée ou clôturée, ni pour une demande qui n'attend plus (« demande » : elle doit être
 * en attente ; « reponse » : elle doit avoir sa réponse). Un message privé refusé (MP fermés) ne
 * fait rien échouer : la notification du site et le bandeau de l'onglet restent.
 */
export async function avertirEchange(client: Client, s: SeanceParis, id: string, quoi: "demande" | "reponse"): Promise<string> {
  const p = await parametres("cs");
  if (!p.nouveauxMessages) return "bascule coupée : pas de message privé";
  const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { repartition: true, annulee: true, clotureAt: true } });
  if (!row || row.annulee || row.clotureAt) return "séance annulée ou clôturée : pas de message privé";
  const d = lireRepartition(row.repartition).demandes.find((x) => x.id === id);
  if (!d) return "demande introuvable";
  const now = Date.now();
  const c = await contexte(s, p);
  const ctx = { joueurs: c.parts.participants.map(c.joueur), salles: p.salles };
  const discordDe = (k: string) => {
    const u = c.parts.participants.find((x) => cleJoueur(x.pseudo) === k)?.userId;
    return u ? c.discord.get(u) ?? null : null;
  };
  const vars = { date: dateLongue(s.date), heure: heureDite(partiesParis(s.debut).hhmm), lien: lienRepartition() };
  const ecrireA = async (k: string, m: M.MessageSeance) => {
    const discordId = discordDe(k);
    if (!discordId) return `${k} : pas de compte Discord lié`;
    const fait = await dm(client, discordId, { embeds: m.embeds, components: m.components, allowedMentions: m.allowedMentions });
    return `${k} : ${fait ? "message privé envoyé" : "messages privés fermés"}`;
  };
  if (quoi === "demande") {
    if (!enAttente(d, now)) return "la demande n'attend plus : pas de message privé";
    return ecrireA(d.a, M.messageDemandeEchange({
      cle: s.cle, id: d.id, jour: dateLongue(s.date), texte: texteDemande(d, ctx, "cible"), consigne: p.textes.echange, vars,
      expire: d.ts + DUREE_DEMANDE_MS, site: SITE_URL, maj: now,
    }));
  }
  if (!d.reponse || d.reponse.par === "demandeur") return "pas de réponse à transmettre";
  const nom = (k: string) => ctx.joueurs.find((j) => cleJoueur(j.pseudo) === k)?.pseudo ?? k;
  const m = M.messageReponseEchange({
    jour: dateLongue(s.date), texte: texteDemande(d, ctx, "tiers"), accepte: d.reponse.accepte, motif: d.reponse.motif ?? null,
    qui: d.reponse.par === "staff" ? "Le staff" : nom(d.a), site: SITE_URL, maj: now,
  });
  const faits = [await ecrireA(d.de, m)];
  if (d.reponse.par === "staff" && discordDe(d.a) !== discordDe(d.de)) faits.push(await ecrireA(d.a, m));
  return faits.join(" · ");
}

/** `seance_echange` { seanceId, demande, quoi } — le message privé d'un échange fait sur le site. */
export async function commandeEchange(client: Client, payload: Record<string, unknown>): Promise<string> {
  const row = await seanceParId(payload.seanceId);
  if (row.evenement !== "cs" || (row.creneau !== "mer" && row.creneau !== "dim")) throw new Error("Seules les Chambres ont des échanges de place.");
  const quoi = payload.quoi === "demande" || payload.quoi === "reponse" ? payload.quoi : null;
  const id = typeof payload.demande === "string" && /^[a-z0-9-]{4,40}$/.test(payload.demande) ? payload.demande : null;
  if (!quoi || !id) throw new Error("Commande d'échange illisible.");
  return avertirEchange(client, seanceCS(row.date, row.creneau), id, quoi);
}

/** « Équilibrer (staff) » : l'aperçu sur une COPIE de la répartition, puis la confirmation. */
async function cliquerEquilibrer(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  const copie = nettoyer(v.rep, v.joueurs, v.p.salles);
  const r = equilibrerJumeaux(copie, { joueurs: v.joueurs, salles: v.p.salles }, { chiffres: v.p.degats.discord });
  if (!r.ok) { await i.editReply({ content: M.reponseGeste(r), allowedMentions: SANS_MENTION }); return; }
  const equipes = Object.fromEntries((["vert", "rouge"] as const).map((eq) => [eq, v.joueurs.flatMap((j) => {
    const place = copie.jumeaux[cleJoueur(j.pseudo)];
    return place && place.startsWith(`${eq}_`) ? [{ place, pseudo: j.pseudo }] : [];
  }).sort((a, b) => (a.place.endsWith("_tank") ? 0 : 1) - (b.place.endsWith("_tank") ? 0 : 1))])) as Parameters<typeof M.confirmationEquilibrer>[0]["equipes"];
  await i.editReply(M.confirmationEquilibrer({ cle: v.s.cle, site: SITE_URL, apercu: r.message, equipes }));
}

async function confirmerEquilibrer(i: ButtonInteraction, cle: string) {
  await i.deferUpdate();
  const v = await preparerRepartition(i, cle, { staff: true });
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  const r = await geste(i.client, v, { action: "equilibrer" });
  await i.editReply({ content: M.reponseGeste(r), components: [], allowedMentions: SANS_MENTION });
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 5 — LE CHRONO DEPUIS DISCORD (§4.9 ; M6) : les boutons du message, réservés au staff.
   La même écriture (`modifierChrono`) que la route 6 du site, sous le verrou de la séance.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Un bouton du chrono : `cs:chrono:<clé>:<geste>:<repère>`. Le clic modifie le message DANS LA
 * RÉPONSE (bot.py:1878-1879) ; `deferUpdate` d'abord, la base peut mettre plus de 3 s à répondre
 * (piège n° 16). Le staff seul : `isStaff`, ou un rang staff relu en base — rien ne se décide sur
 * le seul fait d'avoir pu cliquer. Un clic en retard (le repère a changé : un autre membre du
 * staff, ici ou sur le site) n'applique rien : le message se remet à jour, et l'auteur le lit.
 */
async function cliquerChrono(i: ButtonInteraction, cle: string, reste: string) {
  await i.deferUpdate();
  const dire = (content: string) => i.followUp({ content, flags: EPH, allowedMentions: SANS_MENTION });
  const clic = M.clicChronoDuBouton(reste);
  const now = new Date();
  const r = resoudreCle(cle, now);
  if (!clic.ok || !r.ok || r.seance.evenement !== "cs") { await dire("Ce bouton ne sert plus."); return; }
  const s = r.seance;
  const { user } = await compteDiscord(i.user.id);
  // Un rang staff EN BASE ne vaut que pour un compte actif : un bras droit écarté du site (compte
  // désactivé) garde son rôle en base jusqu'à la synchro, il ne fait plus avancer le chrono.
  const staff = isStaff(i.member as GuildMember | null) || (!!user && user.isActive && canAccessAdmin(user.role));
  const row = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { annulee: true, clotureAt: true } });
  const refus = M.refusChrono({
    staff, action: clic.action, site: SITE_URL,
    refusSeance: refusChronoSeance({ cle: s.cle, annulee: !!row?.annulee, cloturee: !!row?.clotureAt }, now),
  });
  if (refus) { await dire(refus); return; }
  // Relu FRAIS : au premier « Démarrer », ce sont ces étapes-là qui se figent dans la séance.
  const p = await parametres("cs", true);
  const par = user?.username ?? (i.member as GuildMember | null)?.displayName ?? i.user.username;
  const res = await modifierChrono(prisma, s, clic.action, clic.vu, par, p);
  // Le message cliqué, à l'état relu — le bon, que le clic soit passé ou non.
  const ch = i.channel && !i.channel.isDMBased() && i.channel.isTextBased() ? (i.channel as GuildTextBasedChannel) : null;
  const chiffres = M.chiffresPermis({ degatsDiscord: p.degats.discord, salonFerme: !!ch && fermeAuxVisiteurs(ch) });
  // Le clic est ÉCRIT : un échec de la mise à jour du message ne doit pas remonter jusqu'au
  // « ⚠️ Je n'ai pas pu enregistrer » de bot/index.ts — le staff recliquerait une étape déjà
  // validée. La synchro des 10 s remet le message d'aplomb.
  try {
    const m = composerChrono(await contexte(s, p), p, res.chrono, res.deroule.etapes, "ouvert", chiffres);
    await i.editReply({ embeds: m.embeds, components: m.components, allowedMentions: SANS_MENTION });
    dernierRendu.set(i.message.id, empreinte(m));
  } catch (e) {
    console.error("[seances] chrono : le message cliqué n'a pas pu être mis à jour :", e);
    if (res.ok) await dire(`✅ ${res.message} Le message se met à jour dans quelques secondes.`).catch(() => {});
  }
  if (!res.ok) await dire(res.conflit ? M.CHRONO_EN_RETARD : `⚠️ ${res.message}`);
  // Le message rangé dans la séance, s'il n'est pas celui qu'on vient de cliquer.
  rafraichirSeance(i.client, s, ["chrono"]).catch((e) => console.error("[seances] chrono après un clic :", e));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 9 — « JE VIENS » AU GUILD SIEGE DEPUIS DISCORD : `gs:viens`, `gs:absent`, `gs:choix`.
   La même garde que les Chambres (le compte relu EN BASE par `discordId` : de la guilde, actif,
   pas caché), la même écriture que la route 12 du site (`inscrireGS`) : un perso par compte et
   par séance, et un geste fait ici se lit sur le site, et inversement.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

type PrepGS =
  | { ok: true; compte: Compte; s: SeanceParis; p: ParametresGS; persos: { name: string; class: string; gearProfiles: { mesures: unknown }[] }[]; actuel: string | null }
  | { ok: false; texte: string };

async function preparerGS(discordId: string, cle: string): Promise<PrepGS> {
  const user = await prisma.user.findUnique({ where: { discordId }, select: { id: true, username: true, role: true, isActive: true, cacheLe: true } });
  const refus = refusMembre(user);
  if (refus) return { ok: false, texte: M.reponse(refus, { site: SITE_URL, quoi: "Le Guild Siege est réservé" }) };
  // Relu FRAIS : un siège éteint sur le site ne doit plus rien accepter, même à la seconde.
  const p = await parametres("gs", true);
  if (!p.actif) return { ok: false, texte: M.reponseGS("inactif") };
  const r = resoudreCle(cle, new Date(), p);
  if (!r.ok || r.seance.evenement !== "gs") return { ok: false, texte: "Ce bouton ne sert plus." };
  const [persos, ligne] = await Promise.all([
    prisma.character.findMany({ where: { userId: user!.id }, select: { name: true, class: true, isMain: true, gearProfiles: { select: { mesures: true } } }, orderBy: [{ isMain: "desc" }, { name: "asc" }] }),
    prisma.seanceGuilde.findUnique({ where: { cle: r.seance.cle }, select: { participants: { where: { userId: user!.id }, select: { pseudo: true } } } }),
  ]);
  return { ok: true, compte: { id: user!.id, username: user!.username }, s: r.seance, p, persos, actuel: ligne?.participants[0]?.pseudo ?? null };
}

/** Le geste, puis la réponse (M9) et le panneau remis à jour tout de suite. */
async function gesteDuSiege(i: ButtonInteraction | StringSelectMenuInteraction, v: Extract<PrepGS, { ok: true }>, perso: Extract<PrepGS, { ok: true }>["persos"][number] | null, viens: boolean) {
  const res = await inscrireGS(prisma, v.s, { compte: v.compte, perso, viens, p: v.p });
  if (!res.ok) { await i.editReply({ content: res.annulee ? M.reponseGS("annule") : M.reponseGS("refus", { message: res.message }), components: [], allowedMentions: SANS_MENTION }); return; }
  const g = res.geste;
  const pseudo = g.ajout?.pseudo ?? perso?.name ?? "";
  const classe = perso ? classeAffichee(perso.class) : undefined;
  const texte = M.reponseGS(g.quoi, { pseudo, classe, label: v.s.label, retires: g.retires });
  // « Je viens » : le bouton « ❌ Pas cette fois » sous la réponse — le rappel de 1 h n'en a pas.
  const components = viens && g.quoi !== "deja" ? M.rangee(M.bouton(M.ID.gsAbsent(v.s.cle), "Pas cette fois", "❌")) : [];
  await i.editReply({ content: texte, components, allowedMentions: SANS_MENTION });
  if (g.quoi !== "deja" && g.quoi !== "rien") rafraichirPanneauGS(i.client, v.s).catch((e) => console.error("[seances] panneau du siège après un clic :", e));
}

async function cliquerViensGS(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerGS(i.user.id, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  if (!v.persos.length) { await i.editReply({ content: M.reponseGS("aucun_perso", { site: SITE_URL }), allowedMentions: SANS_MENTION }); return; }
  // Plusieurs persos : avec lequel ? Un seul par séance (c'est libre, peu importe la classe).
  if (v.persos.length > 1) {
    await i.editReply({ content: M.reponseGS("plusieurs", { label: v.s.label }), components: M.menuPersoGS(v.s.cle, v.persos, v.actuel), allowedMentions: SANS_MENTION });
    return;
  }
  await gesteDuSiege(i, v, v.persos[0], true);
}

async function cliquerAbsentGS(i: ButtonInteraction, cle: string) {
  await i.deferReply({ flags: EPH });
  const v = await preparerGS(i.user.id, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, allowedMentions: SANS_MENTION }); return; }
  await gesteDuSiege(i, v, null, false);
}

async function choisirPersoGS(i: StringSelectMenuInteraction, cle: string) {
  await i.deferUpdate();
  const v = await preparerGS(i.user.id, cle);
  if (!v.ok) { await i.editReply({ content: v.texte, components: [], allowedMentions: SANS_MENTION }); return; }
  // Jamais confiance au menu : seul un perso DU COMPTE, relu en base, compte.
  const perso = v.persos.find((c) => c.name.toLowerCase() === (i.values[0] ?? "").toLowerCase());
  if (!perso) { await i.editReply({ content: M.reponse("perso_inconnu"), components: [], allowedMentions: SANS_MENTION }); return; }
  await gesteDuSiege(i, v, perso, true);
}

/** Les boutons `cs:` et `gs:` (bot/index.ts). */
export async function gererBoutonSeance(i: ButtonInteraction) {
  const id = M.lireId(i.customId);
  if (!id) return;
  if (id.action === "essai") { await i.reply({ content: M.reponse("essai"), flags: EPH }); return; }
  if (id.evenement === "gs") {
    if (id.action === "viens") return cliquerViensGS(i, id.cle);
    if (id.action === "absent") return cliquerAbsentGS(i, id.cle);
    await i.reply({ content: "Ce bouton ne sert plus.", flags: EPH });
    return;
  }
  if (id.action === "viens") return cliquerJeViens(i, id.cle);
  if (id.action === "absent") return cliquerPasCetteFois(i, id.cle);
  if (id.action === "pos") return cliquerPositions(i, id.cle);
  if (id.action === "salle" && id.reste) return cliquerSalle(i, id.cle, id.reste);
  if (id.action === "jum" && id.reste) return cliquerJumeau(i, id.cle, id.reste);
  if (id.action === "auto") return cliquerAuto(i, id.cle);
  if (id.action === "placer") return cliquerPlacer(i, id.cle);
  if (id.action === "echanger") return cliquerEchanger(i, id.cle);
  // Lot 10 — les échanges (🔄 Échanges, ✅ / ❌ d'une demande, en privé ou non) et l'équilibrage.
  if (id.action === "echs") return cliquerEchanges(i, id.cle);
  if (id.action === "echr" && id.reste) return cliquerReponse(i, id.cle, id.reste);
  if (id.action === "equil") return cliquerEquilibrer(i, id.cle);
  if (id.action === "equilok") return confirmerEquilibrer(i, id.cle);
  if (id.action === "chrono" && id.reste) return cliquerChrono(i, id.cle, id.reste);
  // Lot 6 bis — la clôture et le débrief (éphémères, staff).
  if (id.action === "clotv" && id.reste) return validerCloture(i, id.cle, id.reste);
  if (id.action === "clotr") return rouvrirDepuisDiscord(i, id.cle);
  if (id.action === "cloto") return reouvrirCloture(i, id.cle);
  if (id.action === "debv") return voirEtape(i, id.cle, id.reste);
  if (id.action === "debs" && id.reste) return noterEtape(i, id.cle, id.reste);
  if (id.action === "debi" && id.reste) return noterIssue(i, id.cle, id.reste);
  if (id.action === "debc" && id.reste) return ouvrirFenetreEtape(i, id.cle, id.reste);
  if (id.action === "debr") return ouvrirFenetreARetenir(i, id.cle, id.reste);
  if (id.action === "debp") return publierDepuisDiscord(i, id.cle, id.reste);
  if (id.action === "debb") return brouillonDepuisDiscord(i, id.cle, id.reste);
  await i.reply({ content: "Ce bouton ne sert plus.", flags: EPH });
}

/** Les menus `cs:` (bot/index.ts) : « quels persos » et « quel poste » (lot 3) ; les salles et
 *  l'équipe de 📍 Mes positions, et les menus du staff (lot 4). */
export async function gererMenuSeance(i: StringSelectMenuInteraction) {
  const id = M.lireId(i.customId);
  if (!id) return;
  if (id.action === "essai") { await i.reply({ content: M.reponse("essai"), flags: EPH }); return; }
  // Le Guild Siege (lot 9) d'abord : son « choix » est celui d'UN perso, pas des persos d'une Chambre.
  if (id.evenement === "gs") {
    if (id.action === "choix") return choisirPersoGS(i, id.cle);
    await i.reply({ content: "Ce menu ne sert plus.", flags: EPH });
    return;
  }
  if (id.action === "choix") return choisirPersos(i, id.cle);
  if (id.action === "poste" && id.reste) return choisirPoste(i, id.cle, id.reste);
  if (id.action === "msal" && id.reste) return choisirMesSalles(i, id.cle, id.reste);
  if (id.action === "mjum" && id.reste) return choisirMonEquipe(i, id.cle, id.reste);
  if (id.action === "psal") return choisirSalleStaff(i, id.cle);
  if (id.action === "pjou" && id.reste) return choisirJoueurSalle(i, id.cle, id.reste);
  if (id.action === "sjou") return choisirJoueurStaff(i, id.cle);
  if (id.action === "sact" && id.reste) return choisirActionStaff(i, id.cle, id.reste);
  if (id.action === "dem" && id.reste) return choisirDemande(i, id.cle, id.reste);
  if (id.action === "clotp") return choisirCloture(i, id.cle, "presents");
  if (id.action === "clota") return choisirCloture(i, id.cle, "ajoutes");
  if (id.action === "deba") return allerAEtape(i, id.cle);
  await i.reply({ content: "Ce menu ne sert plus.", flags: EPH });
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 6 bis — LA CLÔTURE ET LE DÉBRIEF DEPUIS DISCORD (décision 1 ; §4.8, §4.10)
   Un message ÉPHÉMÈRE, que seul le membre du staff qui l'a ouvert voit, et que chaque geste
   met à jour en place (`deferUpdate` d'abord, piège n° 16). Rien n'est gardé en mémoire : la
   séance et l'étape voyagent dans les identifiants, les cochés dans les menus du message.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

type StaffPret = { ok: true; par: string } | { ok: false; texte: string };

/**
 * La garde de la clôture et du débrief : le compte relu EN BASE par `discordId`, de la guilde et
 * actif — ces messages montrent les joueurs et leurs chiffres, et le serveur compte aussi des
 * visiteurs, des candidats et des amis (piège n° 22) —, puis le rang : `isStaff`, ou un rang
 * staff en base. Le nom du compte signe la clôture et le débrief (`cloturePar`, `debriefPar`).
 */
export async function gardeStaff(i: Auteur): Promise<StaffPret> {
  const { user, refus } = await compteDiscord(i.user.id);
  const staff = !!user && (isStaff(i.member as GuildMember | null) || canAccessAdmin(user.role));
  const texte = M.refusStaffDiscord({ refus: user ? refus : "compte_non_lie", staff, site: SITE_URL });
  if (texte || !user) return { ok: false, texte: texte ?? M.reponse("compte_non_lie", { site: SITE_URL }) };
  return { ok: true, par: user.username };
}

/** La séance d'un bouton de clôture ou de débrief : une Chambre, par sa clé — passée ou non (on
 *  clôture et on débriefe aussi une séance d'il y a deux semaines). */
function seanceDeCle(cle: string): SeanceParis | null {
  const r = resoudreCle(cle, new Date());
  return r.ok && r.seance.evenement === "cs" ? r.seance : null;
}

/** Le journal, comme les routes du site : qu'une clôture vienne de Discord ou du site, la page
 *  Journal dit qui l'a faite. */
const journal = (actor: string, action: string, target: string, detail?: string) =>
  prisma.auditLog.create({ data: { actor, action, target, detail: detail ? `${detail} (Discord)` : "(Discord)" } }).catch(() => {});

/** Les variables des consignes de la clôture et du débrief (`textes.cloture`, `textes.debrief`). */
const varsBilan = (s: SeanceParis): Record<string, string> => ({ date: dateLongue(s.date), heure: heureDite(partiesParis(s.debut).hhmm), lien: lienCompo() });

/** Un message éphémère remplacé par un refus : ni embed, ni bouton. */
const seul = (content: string) => ({ content, embeds: [], components: [], allowedMentions: SANS_MENTION });

const SEANCE_INCONNUE = "⚠️ Ce message vise une séance que je ne retrouve pas : relance la commande.";

/** Un bouton qui ouvre une fenêtre de saisie ne peut pas attendre (`showModal` doit être la
 *  PREMIÈRE réponse, sous 3 s) : on lit la base, mais on y renonce passé 2,2 s, plutôt que de
 *  laisser Discord dire « Échec de l'interaction ». */
async function dansLesTemps<T>(p: Promise<T>, ms = 2200): Promise<T | null> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<null>((r) => { t = setTimeout(() => r(null), ms); });
  try { return await Promise.race([p, delai]); } finally { clearTimeout(t); }
}

/* ── La clôture ── */

type EtatCloture = { s: SeanceParis; p: ParametresCS; parts: ParticipantsSeance; noms: { participants: string[]; autres: string[] }; ligne: (SeanceGuilde & { participants: { pseudo: string; present: boolean | null; userId: string | null }[] }) | null };

async function lireEtatCloture(s: SeanceParis): Promise<EtatCloture> {
  // Relu FRAIS : la clôture écrit avec les salles du paramétrage (`detailsRepartition`).
  const p = await parametres("cs", true);
  const [etat, ligne] = await Promise.all([lireCompo(prisma), prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, include: { participants: true } })]);
  const parts = await participantsSeance(prisma, s, etat, p);
  return { s, p, parts, ligne, noms: { participants: parts.participants.map((x) => x.pseudo), autres: parts.autres.map((x) => x.pseudo) } };
}

async function composerCloture(e: EtatCloture, o: { lue?: M.SelectionLue; choix?: { menu: "presents" | "ajoutes"; valeurs: string[] }; note?: string } = {}): Promise<M.MessageSeance> {
  // Un membre caché ou parti depuis la clôture ne revient pas dans son constat.
  const constat = e.ligne?.clotureAt ? (await lignesVisibles(prisma, e.ligne.participants)).map((l) => ({ pseudo: l.pseudo, present: l.present })) : null;
  const sel = o.lue ? M.selectionApres(o.lue, e.noms, o.choix) : M.selectionInitiale(e.parts.participants, e.parts.autres, constat);
  const vers = (x: Participant): M.JoueurCloture => ({ pseudo: x.pseudo, classe: x.classe, player: x.player, poste: x.poste, chiffres: x.chiffres, sansCompte: x.userId === null });
  return M.messageCloture({
    cle: e.s.cle, label: e.s.label, commencee: e.s.debut.getTime() <= Date.now(),
    annulee: !!e.ligne?.annulee, motif: e.ligne?.motifAnnulation ?? null,
    cloturee: !!e.ligne?.clotureAt, clotureAt: e.ligne?.clotureAt?.getTime() ?? null, cloturePar: e.ligne?.cloturePar ?? null,
    source: e.parts.source, participants: e.parts.participants.map(vers), autres: e.parts.autres.map(vers), exclus: e.parts.exclus,
    coches: sel.coches, ajoutes: sel.ajoutes,
    chiffres: e.p.degats.discord, texte: e.p.textes.cloture, vars: varsBilan(e.s), site: SITE_URL, note: o.note,
  });
}

/** Les rangées du message cliqué, en JSON : c'est là que sont les cochés. */
const rangeesDu = (i: ButtonInteraction | StringSelectMenuInteraction) => i.message.components.map((r) => r.toJSON());

/** `/chambre cloturer [seance]` : la clôture de la dernière séance commencée, ou de celle choisie. */
export async function commandeCloturer(i: ChatInputCommandInteraction, valeur: string | null) {
  await i.deferReply({ flags: EPH });
  const g = await gardeStaff(i);
  if (!g.ok) { await i.editReply(seul(g.texte)); return; }
  const choix = M.seanceDeLaCommande(valeur, new Date());
  if (!choix.ok) { await i.editReply(seul(choix.texte)); return; }
  // Avant la bascule (§8.10), le bot Python tient encore la clôture dans Discord.
  if (!(await parametres("cs", true)).nouveauxMessages) { await i.editReply(M.clotureAvantBascule(choix.seance, SITE_URL)); return; }
  await i.editReply(await composerCloture(await lireEtatCloture(choix.seance)));
}

/** Un choix dans l'un des deux menus : le message se redessine avec les cochés, sur les listes
 *  relues (un retenu apparu depuis y entre, coché). */
async function choisirCloture(i: StringSelectMenuInteraction, cle: string, menu: "presents" | "ajoutes") {
  await i.deferUpdate();
  const g = await gardeStaff(i);
  if (!g.ok) { await i.editReply(seul(g.texte)); return; }
  const s = seanceDeCle(cle);
  if (!s) { await i.editReply(seul(SEANCE_INCONNUE)); return; }
  await i.editReply(await composerCloture(await lireEtatCloture(s), { lue: M.lireSelectionCloture(rangeesDu(i), cle), choix: { menu, valeurs: i.values } }));
}

/** « Valider la clôture » : les cochés du message, écrits par `cloturerSeance` — la route 9 du
 *  site, ses règles et son verrou. Si la liste a bougé depuis l'ouverture, rien n'est écrit. */
async function validerCloture(i: ButtonInteraction, cle: string, h: string) {
  await i.deferUpdate();
  const g = await gardeStaff(i);
  if (!g.ok) { await i.editReply(seul(g.texte)); return; }
  const s = seanceDeCle(cle);
  if (!s) { await i.editReply(seul(SEANCE_INCONNUE)); return; }
  const lue = M.lireSelectionCloture(rangeesDu(i), cle);
  const p = await parametres("cs", true);
  const res = await cloturerSeance(prisma, s, {
    presents: lue.coches, ajoutes: lue.ajoutes, par: g.par, p,
    verifier: (parts) => (M.empreinteCloture(parts.participants.map((x) => x.pseudo), parts.autres.map((x) => x.pseudo)) === h ? null : M.LISTE_CHANGEE),
  });
  if (!res.ok) {
    await i.editReply(await composerCloture(await lireEtatCloture(s), { lue, note: `⚠️ ${res.message}` }));
    return;
  }
  await journal(g.par, "seance.cloturer", s.cle, `${res.presents} présent(s), ${res.absents} absent(s)`);
  // Le panneau, le récap, la répartition et le chrono passent en « · terminée » : c'est le bot
  // qui le fait, il n'a pas à passer par la file.
  if (res.aFermer) commandeFermer(i.client, { seanceId: res.seance.id }).catch((e) => console.error("[seances] messages d'une séance clôturée depuis Discord :", e));
  await i.editReply(M.messageClotureFaite({ cle: s.cle, label: s.label, message: res.message, lignes: res.lignes, site: SITE_URL }));
}

async function rouvrirDepuisDiscord(i: ButtonInteraction, cle: string) {
  await i.deferUpdate();
  const g = await gardeStaff(i);
  if (!g.ok) { await i.editReply(seul(g.texte)); return; }
  const s = seanceDeCle(cle);
  if (!s) { await i.editReply(seul(SEANCE_INCONNUE)); return; }
  const r = s.debut.getTime() > Date.now() ? { ok: false as const, message: "Cette séance n'a pas encore commencé." } : await rouvrirSeance(prisma, s);
  if (r.ok) await journal(g.par, "seance.rouvrir", s.cle);
  await i.editReply(await composerCloture(await lireEtatCloture(s), { note: r.ok ? `✅ ${r.message}` : `⚠️ ${r.message}` }));
}

/** « Corriger la clôture », « Clôturer » depuis le débrief : la clôture de cette séance. */
async function reouvrirCloture(i: ButtonInteraction, cle: string) {
  await i.deferUpdate();
  const g = await gardeStaff(i);
  if (!g.ok) { await i.editReply(seul(g.texte)); return; }
  const s = seanceDeCle(cle);
  if (!s) { await i.editReply(seul(SEANCE_INCONNUE)); return; }
  await i.editReply(await composerCloture(await lireEtatCloture(s)));
}

/* ── Le débrief ── */

const SEANCE_VIERGE: SeanceBrute = { etapes: null, chrono: null, debrief: null, resultat: null, aRetenir: null };
const SELECT_DEBRIEF = { etapes: true, chrono: true, debrief: true, resultat: true, aRetenir: true } as const;

/** Le parcours du débrief, à l'étape `code` : ce que montre l'onglet Bilans au staff — résumé,
 *  analyse comparée à la séance publiée juste avant, joueurs figés à la clôture. Les chiffres
 *  DÉCLARÉS suivent le paramétrage `degats.discord` (décision 9), comme tout message Discord. */
async function composerDebrief(s: SeanceParis, code: string, o: { note?: string; confirmerBrouillon?: boolean } = {}): Promise<M.MessageSeance> {
  const p = await parametres("cs", true);
  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, include: { participants: true } });
  const v = await vueDebrief(prisma, ligne, { ...p, degats: { ...p.degats, bilans: p.degats.discord } }, { staff: true, estMoi: () => false });
  const { deroule, resume: brut } = resumeDeSeance(ligne ?? SEANCE_VIERGE, p);
  const resume = v.resume ?? brut;
  return M.messageDebrief({
    cle: s.cle, jour: dateLongue(s.date), code,
    lignes: resume.lignes, phases: deroule.phases,
    resultat: resume.resultat, aRetenir: resume.aRetenir, total: resume.total, complet: resume.complet, manquants: resume.manquants,
    analyse: v.analyse, publie: v.publie, publieLe: v.publieLe, par: v.par,
    annulee: !!ligne?.annulee, motif: ligne?.motifAnnulation ?? null, commencee: s.debut.getTime() <= Date.now(),
    figees: !!lireDeroule(ligne?.etapes),
    rienDeNote: !Object.keys(v.saisies?.notes ?? {}).length && !v.saisies?.resultat && !v.saisies?.aRetenir,
    cloturee: !!ligne?.clotureAt, nbJoueurs: v.nbJoueurs, importe: v.nbJoueursSource === "import",
    joueurs: v.joueurs.map((j) => ({ pseudo: j.pseudo, classe: j.classe, present: j.present, chiffres: j.chiffres, salles: j.salles, jumeau: j.jumeau })),
    salles: p.salles, chiffres: p.degats.discord, texte: p.textes.debrief, vars: varsBilan(s), site: SITE_URL,
    note: o.note, confirmerBrouillon: o.confirmerBrouillon, maj: Date.now(),
  });
}

/** `/chambre debrief [seance]` : le parcours, à la première étape pas encore notée. */
export async function commandeDebrief(i: ChatInputCommandInteraction, valeur: string | null) {
  await i.deferReply({ flags: EPH });
  const g = await gardeStaff(i);
  if (!g.ok) { await i.editReply(seul(g.texte)); return; }
  const choix = M.seanceDeLaCommande(valeur, new Date());
  if (!choix.ok) { await i.editReply(seul(choix.texte)); return; }
  if (!(await parametres("cs", true)).nouveauxMessages) { await i.editReply(M.debriefAvantBascule(choix.seance, SITE_URL)); return; }
  await i.editReply(await composerDebrief(choix.seance, ""));
}

/** La garde commune d'un geste du parcours, après `deferUpdate`. */
async function pretPourDebrief(i: Auteur & { editReply: ButtonInteraction["editReply"] }, cle: string): Promise<{ s: SeanceParis; par: string } | null> {
  const g = await gardeStaff(i);
  if (!g.ok) { await i.editReply(seul(g.texte)); return null; }
  const s = seanceDeCle(cle);
  if (!s) { await i.editReply(seul(SEANCE_INCONNUE)); return null; }
  return { s, par: g.par };
}

/** Une saisie du parcours, écrite par `modifierDebrief` — la route 7 du site, ses règles et son
 *  verrou —, puis le parcours redessiné à l'étape voulue, avec le verdict au-dessus. Un patch qui
 *  porte `avant` est refusé si un autre membre du staff a changé le même champ entre-temps
 *  (`DEBRIEF_CONFLIT`) : le parcours montre alors SA version, et rend ce qui avait été tapé. */
async function saisir(i: Auteur & { editReply: ButtonInteraction["editReply"] }, v: { s: SeanceParis; par: string }, patch: PatchDebrief, apres: string, siRefus = apres, remarque = "") {
  const res = await modifierDebrief(prisma, v.s, patch, v.par, await parametres("cs", true));
  const note = res.ok ? `✅ ${res.message}`
    : res.status === 409 && res.message.startsWith(DEBRIEF_CONFLIT) ? M.noteConflit(res.message, texteDuPatch(patch))
      : M.noteRefusSaisie(res.message, remarque);
  await i.editReply(await composerDebrief(v.s, res.ok ? apres : siRefus, { note }));
}

/** Ce que le bouton dit que le message montrait (« - » : rien) ; undefined : un bouton d'avant ce
 *  contrôle, sans rien à comparer. */
const vuDuBouton = <T extends string>(x: string | undefined, lire: (v: string) => T | null): T | null | undefined =>
  (x === undefined ? undefined : x === "-" ? null : lire(x) ?? undefined);

/** « ‹ Précédente », « Suivante › », « Faire le débrief » : montrer une étape, sans rien noter. */
async function voirEtape(i: ButtonInteraction, cle: string, reste: string) {
  await i.deferUpdate();
  const v = await pretPourDebrief(i, cle);
  if (v) await i.editReply(await composerDebrief(v.s, reste.split(":")[0] ?? ""));
}

async function allerAEtape(i: StringSelectMenuInteraction, cle: string) {
  await i.deferUpdate();
  const v = await pretPourDebrief(i, cle);
  if (v) await i.editReply(await composerDebrief(v.s, i.values[0] ?? ""));
}

/** 🟢 Bien, 🟠 Moyen, 🔴 Mal : la note s'enregistre et l'on passe à la suivante ; recliquer la
 *  note posée la retire. */
async function noterEtape(i: ButtonInteraction, cle: string, reste: string) {
  await i.deferUpdate();
  const v = await pretPourDebrief(i, cle);
  if (!v) return;
  const [code, statut, vuBrut] = reste.split(":");
  if (!estStatut(statut)) { await i.editReply(await composerDebrief(v.s, code, { note: "⚠️ Statut inconnu : bien, moyen ou mal." })); return; }
  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: v.s.cle }, select: SELECT_DEBRIEF });
  const { resume } = resumeDeSeance(ligne ?? SEANCE_VIERGE, await parametres("cs", true));
  // La note que le message montrait : c'est elle que le clic bascule, et elle doit être encore
  // celle de la base au moment d'écrire (sinon : le conflit, pas un écrasement).
  const g = M.gesteStatut(resume.lignes, code, statut, vuDuBouton(vuBrut, (x) => (estStatut(x) ? x : null)));
  await saisir(i, v, g.patch, g.suivante, code);
}

/** 🏆 Gagné, 💀 Perdu : recliquer le résultat posé le retire. */
async function noterIssue(i: ButtonInteraction, cle: string, reste: string) {
  await i.deferUpdate();
  const v = await pretPourDebrief(i, cle);
  if (!v) return;
  const [code, x, vuBrut] = reste.split(":");
  const issue = lireIssue(x);
  if (!issue) { await i.editReply(await composerDebrief(v.s, code, { note: "⚠️ Le résultat est gagné ou perdu." })); return; }
  const vu = vuDuBouton(vuBrut, lireIssue);
  if (vu !== undefined) { await saisir(i, v, M.gesteIssue(vu, issue as IssueSeance, true), code); return; }
  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: v.s.cle }, select: { resultat: true } });
  await saisir(i, v, M.gesteIssue(lireIssue(ligne?.resultat), issue as IssueSeance), code);
}

/** ⏱️ Chrono · remarque : la fenêtre de saisie de l'étape, avec ce qui est enregistré. */
async function ouvrirFenetreEtape(i: ButtonInteraction, cle: string, reste: string) {
  const s = seanceDeCle(cle);
  const code = reste.split(":")[0];
  if (!s) { await i.reply({ content: SEANCE_INCONNUE, flags: EPH }); return; }
  const lu = await dansLesTemps(Promise.all([gardeStaff(i), parametres("cs"), prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: SELECT_DEBRIEF })]));
  if (!lu) { await i.reply({ content: "⚠️ La base tarde à répondre : réessaie dans un instant.", flags: EPH }); return; }
  const [g, p, ligne] = lu;
  if (!g.ok) { await i.reply({ content: g.texte, flags: EPH, allowedMentions: SANS_MENTION }); return; }
  const { resume, debrief } = resumeDeSeance(ligne ?? SEANCE_VIERGE, p);
  const l = resume.lignes.find((x) => x.etape.code === code);
  if (!l) { await i.reply({ content: `⚠️ L'étape ${code} n'est plus dans le déroulé de cette séance.`, flags: EPH }); return; }
  await i.showModal(M.fenetreEtape(s.cle, l, debrief.notes[code]));
}

/** 📌 À retenir : la fenêtre, avec le texte enregistré. */
async function ouvrirFenetreARetenir(i: ButtonInteraction, cle: string, reste: string) {
  const s = seanceDeCle(cle);
  if (!s) { await i.reply({ content: SEANCE_INCONNUE, flags: EPH }); return; }
  const lu = await dansLesTemps(Promise.all([gardeStaff(i), prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { aRetenir: true } })]));
  if (!lu) { await i.reply({ content: "⚠️ La base tarde à répondre : réessaie dans un instant.", flags: EPH }); return; }
  const [g, ligne] = lu;
  if (!g.ok) { await i.reply({ content: g.texte, flags: EPH, allowedMentions: SANS_MENTION }); return; }
  await i.showModal(M.fenetreARetenir(s.cle, reste.split(":")[0] ?? "", ligne?.aRetenir ?? ""));
}

/** Le retour d'une fenêtre de saisie (bot/index.ts). Elle vient du message du parcours : on le
 *  met à jour en place. L'empreinte de ce qu'elle montrait est relue : si un autre membre du
 *  staff a changé la saisie entre-temps, on n'écrase pas son texte, on le dit. */
export async function gererFenetreSeance(i: ModalSubmitInteraction) {
  const id = M.lireId(i.customId);
  if (!id || (id.action !== "mdeb" && id.action !== "mret")) return;
  if (!i.isFromMessage()) { await i.reply({ content: "Cette fenêtre ne sert plus : relance /chambre debrief.", flags: EPH }); return; }
  await i.deferUpdate();
  const v = await pretPourDebrief(i, id.cle);
  if (!v) return;
  const [code = "", h = ""] = id.reste.split(":");
  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: v.s.cle }, select: SELECT_DEBRIEF });
  const { debrief } = resumeDeSeance(ligne ?? SEANCE_VIERGE, await parametres("cs", true));
  const champ = (k: string) => { try { return i.fields.getTextInputValue(k) ?? ""; } catch { return ""; } };
  if (id.action === "mdeb") {
    const saisie = debrief.notes[code];
    const champs = { chrono: champ("chrono"), remarque: champ("remarque") };
    if (M.empreinteNote(saisie) !== h) {
      await i.editReply(await composerDebrief(v.s, code, { note: M.saisieDepassee(code, [champs.chrono.trim(), champs.remarque.trim()].filter(Boolean).join(" · ")) }));
      return;
    }
    const patch = M.patchFenetreEtape(code, champs, saisie);
    if (!patch) { await i.editReply(await composerDebrief(v.s, code, { note: "Rien n'a changé." })); return; }
    // `avant` : ce que la fenêtre montrait (l'empreinte vient de le confirmer) ; relu sous le
    // verrou de la séance, il refuse une saisie de l'autre arrivée depuis cette lecture.
    await saisir(i, v, { ...patch, avant: avantDuPatch(patch, debrief) }, code, code, patch.etapes?.[code]?.remarque ?? "");
    return;
  }
  const texte = champ("texte");
  const actuel = ligne?.aRetenir ?? "";
  if (M.empreinte(actuel) !== h) { await i.editReply(await composerDebrief(v.s, code, { note: M.saisieDepassee("*", texte) })); return; }
  const patch = M.patchFenetreARetenir(texte, actuel);
  if (!patch) { await i.editReply(await composerDebrief(v.s, code, { note: "Rien n'a changé." })); return; }
  await saisir(i, v, { ...patch, avant: { aRetenir: actuel } }, code);
}

/** 📝 Publier le débrief : la route 8 du site — tous les membres le lisent dans Bilans, puis
 *  la commande `seance_debrief` le publie en image dans le salon des débriefs (lot 7 ; le
 *  parcours n'existe qu'après la bascule). Publier reste possible quand il manque des statuts :
 *  le verdict les nomme. Republier envoie un NOUVEAU message dans le salon des débriefs. */
async function publierDepuisDiscord(i: ButtonInteraction, cle: string, reste: string) {
  await i.deferUpdate();
  const v = await pretPourDebrief(i, cle);
  if (!v) return;
  const code = reste.split(":")[0] ?? "";
  const p = await parametres("cs", true);
  const res = await marquerDebriefPublie(prisma, v.s, v.par, p);
  let suite = "";
  if (res.ok) {
    await journal(v.par, "seance.debrief_publie", v.s.cle, p.nouveauxMessages ? "site et Discord" : "site");
    // Mise en file comme le site : la page Discord et l'onglet Bilans suivent la même commande.
    if (p.nouveauxMessages) {
      // Une demande déjà en file (un double clic) ne publie pas deux fois.
      const deja = await prisma.botCommand.findFirst({ where: { type: "seance_debrief", status: "PENDING", payload: { path: ["seanceId"], equals: res.seance.id } }, select: { id: true } });
      if (!deja) await prisma.botCommand.create({ data: { type: "seance_debrief", payload: { seanceId: res.seance.id }, createdBy: v.par } });
      suite = "\n📝 L'image part dans le salon des débriefs d'ici quelques secondes.";
    }
  }
  await i.editReply(await composerDebrief(v.s, code, { note: res.ok ? `✅ ${res.message}${suite}` : `⚠️ ${res.message}` }));
}

/** « Repasser en brouillon » : une confirmation d'abord (les membres ne le verront plus). */
async function brouillonDepuisDiscord(i: ButtonInteraction, cle: string, reste: string) {
  await i.deferUpdate();
  const v = await pretPourDebrief(i, cle);
  if (!v) return;
  const [code = "", ok] = reste.split(":");
  if (ok !== "ok") {
    await i.editReply(await composerDebrief(v.s, code, { confirmerBrouillon: true, note: "⚠️ Repasser ce débrief en brouillon ? Les membres ne le verront plus tant qu'il n'est pas republié." }));
    return;
  }
  const res = await marquerDebriefPublie(prisma, v.s, v.par, await parametres("cs", true), { retirer: true });
  if (res.ok) await journal(v.par, "seance.debrief_brouillon", v.s.cle);
  await i.editReply(await composerDebrief(v.s, code, { note: res.ok ? `✅ ${res.message}` : `⚠️ ${res.message}` }));
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE DÉBRIEF PUBLIÉ (M7 ; lot 7) — l'embed, l'image et le lien, dans le salon des débriefs
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** M7 et son image, relus en base : la séance, son débrief, ses joueurs figés à la clôture, ses
 *  vidéos, et la séance publiée juste avant (l'analyse). Les chiffres DÉCLARÉS suivent `chiffres`. */
async function composerPublication(row: SeanceGuilde, p: ParametresCS, chiffres: boolean): Promise<{ message: M.MessageSeance; png: Buffer }> {
  const ligne = await prisma.seanceGuilde.findUnique({ where: { id: row.id }, include: { participants: true } });
  if (!ligne) throw new Error("Séance introuvable.");
  const { png, vue } = await imageDeLaSeance(prisma, ligne, p, { chiffres, site: hoteDuSite(SITE_URL) });
  const r = vue.resume;
  const s = seanceCS(ligne.date, ligne.creneau === "mer" ? "mer" : "dim");
  const message = M.messageDebriefPublie({
    cle: ligne.cle, jour: dateLongue(ligne.date),
    resultat: r?.resultat ?? null, total: r?.total ?? 0, complet: r?.complet ?? false, analyse: vue.analyse, aRetenir: r?.aRetenir ?? "",
    nbJoueurs: vue.nbJoueurs, texte: p.textes.debriefPublie, vars: varsBilan(s), site: SITE_URL, maj: Date.now(),
    videos: await videosPubliees(ligne, p),
  });
  return { message, png };
}

/** Les vidéos PRÊTES de la séance (lot 8), pour le bloc 🎬 de M7 : dans l'ordre du déroulé de la
 *  séance (figé, sinon le paramétrage), celles de toute la séance d'abord. */
async function videosPubliees(ligne: SeanceGuilde, p: Pick<ParametresCS, "etapes" | "phases">): Promise<M.VideoPubliee[]> {
  const rows = await prisma.seanceVideo.findMany({ where: { seanceId: ligne.id, statut: "pret" }, orderBy: { createdAt: "asc" } });
  const etapes = derouleDe(ligne.etapes, p).etapes;
  const label = new Map(etapes.map((e) => [e.code, e.label]));
  return trierVideos(rows.map((v) => ({ ...v, le: v.createdAt.getTime() })), etapes).map((v) => ({
    id: v.id, etape: v.etape, etapeLabel: v.etape ? label.get(v.etape) ?? null : null, titre: v.titre, auteur: v.auteur, moment: v.moment,
  }));
}

/**
 * LA PURGE DES VIDÉOS (§10.5), chaque jour à 4 h 30 (heure de Paris), sur le volume monté dans le
 * service `bot` : les fichiers des séances plus anciennes que la conservation du paramétrage
 * (180 jours par défaut), les envois abandonnés, les fichiers oubliés. Les liens restent. Le
 * bilan part dans le journal du bot.
 */
export async function purgerLesVideos(): Promise<string> {
  const p = await parametres("cs", true);
  const r = await purgerVideos(prisma, p.videos.conservationJours);
  console.log(`[seances] ${r.texte}`);
  return r.texte;
}

/**
 * `seance_debrief` { seanceId } — publie le débrief d'une séance dans le salon des débriefs
 * (§8.6). Tout est relu en base au moment de publier, rien n'est pris dans la charge. Un FORUM
 * reçoit un fil « Retour Chambre — {date} », étiqueté « Donjon » s'il en a une ; un salon texte,
 * un simple message. Le lien du message s'écrit sur la séance (`debriefLien`) : republier en crée
 * un nouveau, et le lien passe sur lui ; l'ancien n'est pas supprimé.
 *
 * Un salon introuvable, un droit qui manque, la bascule coupée : la commande échoue (FAILED), avec
 * sa raison en clair, et l'onglet Bilans l'affiche.
 */
export async function publierDebrief(client: Client, payload: Record<string, unknown>): Promise<string> {
  const row = await seanceParId(payload.seanceId);
  if (row.evenement === "gs") return publierDebriefGS(client, row);
  const p = await parametres("cs", true);
  const refus = M.refusPublicationDebrief({ evenement: row.evenement, creneau: row.creneau, annulee: row.annulee, publie: !!row.debriefPublieAt, nouveauxMessages: p.nouveauxMessages });
  if (refus) throw new Error(refus);
  const sal = await salons();
  const ch = await salonGuilde(client, sal.debriefs);
  if (!ch) throw new Error(`Salon des débriefs introuvable, ou fermé au bot (${sal.debriefs || "aucun"}).`);
  const forum = ch.type === ChannelType.GuildForum;
  if (!forum && !ch.isTextBased()) throw new Error(`#${ch.name} n'est ni un salon texte, ni un salon d'annonces, ni un forum : choisis le salon des débriefs dans le paramétrage.`);
  const moi = ch.guild.members.me;
  const droits = moi ? ch.permissionsFor(moi) : null;
  const manque = M.droitsManquants((d) => !!droits?.has(d), forum);
  if (manque.length) throw new Error(`Il manque au bot, dans #${ch.name} : ${manque.join(", ")}.`);

  const chiffres = M.chiffresPermis({ degatsDiscord: p.degats.discord, salonFerme: fermeAuxVisiteurs(ch) });
  const { message, png } = await composerPublication(row, p, chiffres);
  const envoi = { content: message.content, embeds: message.embeds, components: message.components, allowedMentions: message.allowedMentions, files: [{ attachment: png, name: M.IMAGE_DEBRIEF }] };
  let lien: string;
  if (forum) {
    const f = ch as ForumChannel;
    const fil = await f.threads.create({
      name: M.nomDuFil(dateLongue(row.date)),
      appliedTags: M.etiquettesDuFil(f.availableTags.map((t) => ({ id: t.id, name: t.name })), f.flags.has(ChannelFlags.RequireTag)),
      message: envoi,
    });
    const premier = await fil.fetchStarterMessage().catch(() => null);
    lien = premier?.url ?? fil.url;
  } else {
    const sent = await (ch as GuildTextBasedChannel).send(envoi);
    lien = sent.url;
  }
  // Parti : le lien se range sur la séance ; un rangement raté ne doit pas faire passer la
  // publication pour un échec (elle serait refaite, en double).
  await majSeance(prisma, seanceCS(row.date, row.creneau === "mer" ? "mer" : "dim"), () => ({ ok: true, patch: { debriefLien: lien } }))
    .catch((e) => console.error(`[seances] débrief de ${row.cle} publié, mais son lien n'est pas rangé :`, e));
  console.log(`[seances] débrief de ${row.cle} publié${chiffres ? "" : " (sans chiffres)"} : ${lien}`);
  return `message ${lien}`;
}

/* ── Le débrief du Guild Siege (lot 9, §11.3) : un embed, sans image ── */

/** M7 du siège, relu en base : le résultat, les présents de la clôture, « à retenir », ses
 *  manches s'il en a, ses vidéos. */
async function composerDebriefGS(row: SeanceGuilde, p: ParametresGS): Promise<M.MessageSeance> {
  const ligne = await prisma.seanceGuilde.findUnique({ where: { id: row.id }, include: { participants: true } });
  if (!ligne) throw new Error("Séance introuvable.");
  const v = await vueDebrief(prisma, ligne, p, { staff: true, estMoi: () => false });
  const { resume } = resumeDeSeance(ligne, p);
  const r = resoudreCle(ligne.cle, new Date(), p);
  return M.messageDebriefGS({
    cle: ligne.cle, jour: dateLongue(ligne.date),
    resultat: resume.resultat, presents: ligne.clotureAt ? v.nbJoueurs : null, aRetenir: resume.aRetenir,
    lignes: resume.lignes, texte: p.textes.debriefPublie, vars: r.ok ? varsBilan(r.seance) : {}, site: SITE_URL, maj: Date.now(),
    videos: await videosPubliees(ligne, p),
  });
}

/** `seance_debrief` d'un Guild Siege : relu en base au moment de publier, le siège allumé, dans
 *  le salon de ses débriefs (un fil « Retour Guild Siege — {date} » si c'est un forum). */
async function publierDebriefGS(client: Client, row: SeanceGuilde): Promise<string> {
  const p = await parametres("gs", true);
  const refus = M.refusPublicationDebrief({ evenement: "gs", creneau: row.creneau, annulee: row.annulee, publie: !!row.debriefPublieAt, nouveauxMessages: true, actifGS: p.actif });
  if (refus) throw new Error(refus);
  const r = resoudreCle(row.cle, new Date(), p);
  if (!r.ok) throw new Error(r.error);
  const sal = await salons();
  const ch = await salonGuilde(client, sal.debriefsGS);
  if (!ch) throw new Error(`Salon des débriefs du Guild Siege introuvable, ou fermé au bot (${sal.debriefsGS || "aucun"}).`);
  const forum = ch.type === ChannelType.GuildForum;
  if (!forum && !ch.isTextBased()) throw new Error(`#${ch.name} n'est ni un salon texte, ni un salon d'annonces, ni un forum : choisis le salon des débriefs du Guild Siege dans le paramétrage.`);
  const moi = ch.guild.members.me;
  const droits = moi ? ch.permissionsFor(moi) : null;
  // Pas d'image : joindre des fichiers n'est pas demandé.
  const manque = M.droitsManquants((d) => d === PermissionFlagsBits.AttachFiles || !!droits?.has(d), forum);
  if (manque.length) throw new Error(`Il manque au bot, dans #${ch.name} : ${manque.join(", ")}.`);
  const m = await composerDebriefGS(row, p);
  const envoi = { content: m.content, embeds: m.embeds, components: m.components, allowedMentions: m.allowedMentions };
  let lien: string;
  if (forum) {
    const f = ch as ForumChannel;
    const fil = await f.threads.create({
      name: M.nomDuFil(dateLongue(row.date), "gs"),
      appliedTags: M.etiquettesDuFil(f.availableTags.map((t) => ({ id: t.id, name: t.name })), f.flags.has(ChannelFlags.RequireTag)),
      message: envoi,
    });
    const premier = await fil.fetchStarterMessage().catch(() => null);
    lien = premier?.url ?? fil.url;
  } else {
    const sent = await (ch as GuildTextBasedChannel).send(envoi);
    lien = sent.url;
  }
  await majSeance(prisma, r.seance, () => ({ ok: true, patch: { debriefLien: lien } }))
    .catch((e) => console.error(`[seances] débrief du siège ${row.cle} publié, mais son lien n'est pas rangé :`, e));
  console.log(`[seances] débrief du siège ${row.cle} publié : ${lien}`);
  return `message ${lien}`;
}
