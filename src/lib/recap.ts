import type { PrismaClient, Role } from "@prisma/client";
import { prisma as prismaSite } from "@/lib/prisma";
import { GUILD_ROLES, ROLE_RANK } from "@/config/roles";
import { etatStuff, lireMesures, roleDuStuff, stuffVide, type EtatStuff, type RoleMesure } from "@/lib/mesures";

/**
 * CE QUI ATTEND UN BRAS DROIT — la file « à traiter » et les compteurs du tableau de
 * bord (/staff), calculés en une seule lecture.
 *
 * Le suivi du staff était éclaté sur sept pages, et trois sujets n'avaient aucune vue
 * d'ensemble : les absences, les gestes de modération échoués, le bot muet. Chaque
 * ligne ici répond à « qu'est-ce qui attend un geste, et où le fait-on ».
 *
 * CE MODULE TOURNERA AUSSI DANS LE BOT (récap du lundi), sous tsx et hors de Next :
 * ni next/*, ni next-auth, ni @/lib/access. Le client Prisma est un paramètre — le bot
 * passera le sien — et celui du site n'est qu'un défaut. Discord et /staff diront ainsi
 * les mêmes chiffres.
 *
 * Plus de ligne coffre, vente, commande ni « objet sous le seuil » : la Boutique et
 * l'AirGuild ont quitté le site le 2026-10-21 (décision de Maxime).
 */

export type Urgence = "haute" | "moyenne" | "basse";

export type LigneATraiter = {
  clef: string;
  urgence: Urgence;
  nombre: number;
  /** Ce qui suit le nombre : « candidatures sans réponse ». */
  phrase: string;
  detail?: string;
  /** La page où se fait le geste. */
  href: string;
  /** Le libellé du bouton qui y mène. */
  geste: string;
};

export type CompteursStaff = {
  membres: number;
  /** Venus sur le site dans les 30 derniers jours — `lastSeenAt`, et non `isActive`, qui
   *  ne bouge qu'au kick ou au ban. Ce sont des visites du SITE, pas du jeu. */
  actifs30j: number;
  absentsAujourdhui: number;
  deRetourAujourdhui: number;
  stuffsMontes: number;
  /** Complets, à remesurer compris : la mesure existe, elle a seulement vieilli. */
  stuffsMesures: number;
  stuffsARemesurer: number;
  stuffsARenseigner: number;
  persos: number;
  persosSansBuild: number;
  membresSansPerso: number;
};

export type Recap = { genereLe: string; lignes: LigneATraiter[]; compteurs: CompteursStaff };

export type StuffSuivi = {
  id: string; nom: string; etat: EtatStuff; role: RoleMesure;
  v: Record<string, number>; poudres: string[]; buffs: string[]; cond: string[]; mesureLe: number | null;
};
export type PersoSuivi = {
  id: string; nom: string; classe: string; niveau: number; prestige: number; principal: boolean;
  /** Les stuffs MONTÉS seulement : un stuff vide n'a rien à montrer ni à mesurer. */
  stuffs: StuffSuivi[];
};
export type MembreSuivi = { id: string; pseudo: string; role: Role; lastSeenAt: string | null; persos: PersoSuivi[] };
export type Suivi = { genereLe: string; membres: MembreSuivi[]; compteurs: CompteursStaff };

const JOUR = 86_400_000;
export const INACTIF_APRES_MS = 30 * JOUR;

/* ── Les jours ─────────────────────────────────────────────────────────────
   Une absence est saisie au jour (« 2026-06-12 ») et stockée à minuit UTC, par la page
   comme par la commande /absence ; ses deux bornes sont COMPRISES (le dossier compte
   « fin − début + 1 » jours). On compare donc des dates, pas des instants : comparée à
   l'heure qu'il est, une absence qui finit aujourd'hui serait déjà finie à 1 h du matin. */
// Exportés pour Information Guilde (api/guilde) : « absent aujourd'hui » doit y valoir la même chose qu'ici.
export const jourUTC = (d: Date) => d.toISOString().slice(0, 10);
export const jourParis = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const decaleJour = (jour: string, n: number) => jourUTC(new Date(Date.parse(`${jour}T00:00:00Z`) + n * JOUR));
const heureParis = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** « 12 min », « 5 h », « 3 j » : assez précis pour dire depuis quand ça attend. */
export function depuis(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h} h` : `${Math.floor(h / 24)} j`;
}
const pl = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un);

const GESTE_MODERATION: Record<string, string> = {
  role: "retrait de rôle", guilde: "sortie de la guilde", kick: "exclusion", ban: "bannissement", coffre: "ouverture de coffre",
  promouvoir: "promotion", retrograder: "rétrogradation",
};
const rang = (r: Role) => ROLE_RANK.indexOf(r);

/** La guilde — rangs de guilde seulement : un candidat qui déclare ses persos pour sa
 *  candidature n'en fait pas partie. */
async function lireGuilde(db: PrismaClient, maintenant: Date) {
  const auj = jourParis(maintenant);
  const hier = decaleJour(auj, -1);
  const [users, absences] = await Promise.all([
    db.user.findMany({
      where: { role: { in: GUILD_ROLES } },
      select: {
        id: true, username: true, role: true, lastSeenAt: true,
        characters: {
          orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
          select: {
            id: true, name: true, class: true, level: true, prestige: true, isMain: true,
            gearProfiles: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, mesures: true, weapon: true, armor: true, jewelry: true, pets: true, cards: true },
            },
          },
        },
      },
    }),
    /* Le statut n'entre pas dans le compte, sauf un refus : valider une absence ou
       seulement la déclarer est une question encore ouverte, et rien ici n'en dépend. */
    db.absence.findMany({
      where: {
        user: { role: { in: GUILD_ROLES } }, status: { not: "REJECTED" },
        endDate: { gte: new Date(`${hier}T00:00:00Z`) }, startDate: { lt: new Date(`${decaleJour(auj, 1)}T00:00:00Z`) },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
  ]);

  const absents = new Set<string>();
  for (const a of absences) if (jourUTC(a.startDate) <= auj && jourUTC(a.endDate) >= auj) absents.add(a.userId);
  const deRetour = new Set<string>();
  for (const a of absences) if (jourUTC(a.endDate) === hier && !absents.has(a.userId)) deRetour.add(a.userId);

  const t = maintenant.getTime();
  const membres: MembreSuivi[] = users
    .map((u) => ({
      id: u.id, pseudo: u.username, role: u.role, lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      persos: u.characters.map((c) => ({
        id: c.id, nom: c.name, classe: c.class, niveau: c.level, prestige: c.prestige, principal: c.isMain,
        stuffs: c.gearProfiles.filter((g) => !stuffVide(g)).map((g) => {
          const m = lireMesures(g.mesures);
          return {
            id: g.id, nom: g.name, etat: etatStuff(g, t), role: roleDuStuff(g.name, c.class, m),
            v: m?.v ?? {}, poudres: m?.poudres ?? [], buffs: m?.buffs ?? [], cond: m?.cond ?? [], mesureLe: m?.mesureLe ?? null,
          };
        }),
      })),
    }))
    .sort((a, b) => rang(a.role) - rang(b.role) || a.pseudo.localeCompare(b.pseudo, "fr"));

  const inactif = (m: MembreSuivi) => !m.lastSeenAt || t - Date.parse(m.lastSeenAt) > INACTIF_APRES_MS;
  const persos = membres.flatMap((m) => m.persos);
  const stuffs = persos.flatMap((p) => p.stuffs);
  const compteurs: CompteursStaff = {
    membres: membres.length,
    actifs30j: membres.filter((m) => !inactif(m)).length,
    absentsAujourdhui: absents.size,
    deRetourAujourdhui: deRetour.size,
    stuffsMontes: stuffs.length,
    stuffsMesures: stuffs.filter((s) => s.etat === "complet" || s.etat === "a-remesurer").length,
    stuffsARemesurer: stuffs.filter((s) => s.etat === "a-remesurer").length,
    stuffsARenseigner: stuffs.filter((s) => s.etat === "a-renseigner").length,
    persos: persos.length,
    persosSansBuild: persos.filter((p) => p.stuffs.length === 0).length,
    membresSansPerso: membres.filter((m) => m.persos.length === 0).length,
  };
  return { membres, compteurs, inactifs: membres.filter(inactif) };
}

/** Pour la page du suivi : la guilde entière, persos et stuffs montés, avec leurs mesures. */
export async function lireSuivi(db: PrismaClient = prismaSite, maintenant = new Date()): Promise<Suivi> {
  const { membres, compteurs } = await lireGuilde(db, maintenant);
  return { genereLe: maintenant.toISOString(), membres, compteurs };
}

export async function calculerRecap(db: PrismaClient = prismaSite, maintenant = new Date()): Promise<Recap> {
  const t = maintenant.getTime();
  const [guilde, candidatures, worldboss, gestesEchoues, commandesBot] = await Promise.all([
    lireGuilde(db, maintenant),
    db.application.findMany({
      where: { status: { in: ["PENDING", "WAITING", "INTERVIEW"] } },
      select: { status: true, createdAt: true }, orderBy: { createdAt: "asc" },
    }),
    db.worldBossEvent.findMany({
      where: { status: { in: ["PLANNED", "ONGOING"] }, startAt: { gte: maintenant, lte: new Date(t + 3_600_000) } },
      select: { startAt: true, boss: { select: { name: true } } }, orderBy: { startAt: "asc" },
    }),
    /* Quatorze jours : un geste échoué reste « échoué » pour toujours en base, et une
       ligne qui ne s'éteint jamais finit par ne plus être lue. */
    db.actionMembre.findMany({
      where: { statut: "ECHOUEE", createdAt: { gte: new Date(t - 14 * JOUR) } },
      select: { discordId: true, pseudo: true, action: true }, orderBy: { createdAt: "desc" },
    }),
    db.botCommand.findMany({
      where: { OR: [
        { status: "PENDING", createdAt: { lte: new Date(t - 60_000) } },
        { status: "FAILED", createdAt: { gte: new Date(t - 2 * JOUR) } },
      ] },
      select: { status: true, type: true, createdAt: true }, orderBy: { createdAt: "asc" },
    }),
  ]);
  const { compteurs: c, inactifs } = guilde;
  const lignes: LigneATraiter[] = [];

  /* ── haute : quelqu'un attend une réponse, ou quelque chose est en panne ── */
  const sansReponse = candidatures.filter((a) => a.status === "PENDING");
  if (sansReponse.length) {
    lignes.push({
      clef: "candidatures", urgence: "haute", nombre: sansReponse.length,
      phrase: pl(sansReponse.length, "candidature sans réponse", "candidatures sans réponse"),
      detail: `${sansReponse.length > 1 ? "la plus ancienne " : ""}depuis ${depuis(t - sansReponse[0].createdAt.getTime())}`,
      href: "/staff?section=candidatures", geste: "Examiner",
    });
  }
  if (worldboss.length) {
    const p = worldboss[0];
    lignes.push({
      clef: "worldboss", urgence: "haute", nombre: worldboss.length,
      phrase: pl(worldboss.length, "passage de World Boss dans moins d'une heure", "passages de World Boss dans moins d'une heure"),
      detail: `${p.boss.name} à ${heureParis(p.startAt)}`,
      href: "/worldboss", geste: "Voir qui vient",
    });
  }
  if (gestesEchoues.length) {
    /* Le dossier se cherche par userId, une décision est rangée par discordId — et un
       banni peut ne plus avoir de compte : sans compte, on mène à la liste des membres. */
    const cible = await db.user.findUnique({ where: { discordId: gestesEchoues[0].discordId }, select: { id: true } });
    lignes.push({
      clef: "moderation", urgence: "haute", nombre: gestesEchoues.length,
      phrase: pl(gestesEchoues.length, "geste de modération a échoué", "gestes de modération ont échoué"),
      detail: gestesEchoues.slice(0, 3).map((g) => `${GESTE_MODERATION[g.action] ?? g.action} de ${g.pseudo}`).join(", "),
      href: cible ? `/staff?section=membres&dossier=${cible.id}&onglet=decisions` : "/staff?section=membres",
      geste: cible ? "Ouvrir le dossier" : "Voir les membres",
    });
  }
  /* Le bot n'a pas encore de battement de cœur : une commande qui attend depuis plus
     d'une minute, alors qu'il relève la file toutes les 12 s, est le seul signe qu'il
     s'est arrêté. */
  const enAttente = commandesBot.filter((x) => x.status === "PENDING");
  if (enAttente.length) {
    lignes.push({
      clef: "bot-muet", urgence: "haute", nombre: enAttente.length,
      phrase: pl(enAttente.length, "commande attend le bot depuis plus d'une minute", "commandes attendent le bot depuis plus d'une minute"),
      detail: `${enAttente.length > 1 ? "la plus ancienne " : ""}depuis ${depuis(t - enAttente[0].createdAt.getTime())} — le bot est peut-être arrêté`,
      href: "/discord", geste: "Voir le bot",
    });
  }

  /* ── moyenne : à regarder dans la journée ── */
  const echecs = commandesBot.filter((x) => x.status === "FAILED");
  if (echecs.length) {
    lignes.push({
      clef: "bot-echecs", urgence: "moyenne", nombre: echecs.length,
      phrase: pl(echecs.length, "commande du bot a échoué", "commandes du bot ont échoué"),
      detail: "ces deux derniers jours — la raison est dans l'historique",
      href: "/discord", geste: "Voir l'historique",
    });
  }
  const enSuivi = candidatures.length - sansReponse.length;
  if (enSuivi) {
    /* Les candidatures s'ouvrent sur « En attente », où celles-ci ne sont pas : le bouton
       menait à une liste vide. Il vise l'onglet qui les montre (?statut=). */
    const misesEnAttente = candidatures.filter((a) => a.status === "WAITING").length;
    const entretiens = enSuivi - misesEnAttente;
    lignes.push({
      clef: "candidatures-suivi", urgence: "moyenne", nombre: enSuivi,
      phrase: pl(enSuivi, "candidature en suivi", "candidatures en suivi"),
      detail: [misesEnAttente ? `${misesEnAttente} mise${misesEnAttente > 1 ? "s" : ""} en attente` : "", entretiens ? `${entretiens} en entretien` : ""].filter(Boolean).join(" · "),
      href: `/staff?section=candidatures&statut=${misesEnAttente ? "WAITING" : "INTERVIEW"}`, geste: "Reprendre",
    });
  }
  if (c.absentsAujourdhui || c.deRetourAujourdhui) {
    const absents = c.absentsAujourdhui;
    lignes.push({
      clef: "absences", urgence: "moyenne", nombre: absents || c.deRetourAujourdhui,
      phrase: absents
        ? pl(absents, "membre absent aujourd'hui", "membres absents aujourd'hui")
        : pl(c.deRetourAujourdhui, "membre de retour aujourd'hui", "membres de retour aujourd'hui"),
      detail: absents && c.deRetourAujourdhui ? `et ${c.deRetourAujourdhui} de retour aujourd'hui` : undefined,
      href: "/staff?section=absences", geste: "Voir les absences",
    });
  }

  /* ── basse : le suivi de fond ── */
  if (inactifs.length) {
    const jamais = inactifs.filter((m) => !m.lastSeenAt).length;
    lignes.push({
      clef: "inactifs", urgence: "basse", nombre: inactifs.length,
      phrase: pl(inactifs.length, "membre sans visite depuis 30 jours", "membres sans visite depuis 30 jours"),
      detail: jamais ? `dont ${jamais} jamais venu${jamais > 1 ? "s" : ""} sur le site` : undefined,
      href: "/staff?section=membres&filtre=inactifs", geste: "Voir la liste",
    });
  }
  if (c.persosSansBuild) {
    lignes.push({
      clef: "sans-build", urgence: "basse", nombre: c.persosSansBuild,
      phrase: pl(c.persosSansBuild, "perso sans build", "persos sans build"),
      detail: "aucune pièce portée dans l'AirBuilder",
      href: "/staff?section=suivi&filtre=sans-build", geste: "Voir",
    });
  }
  if (c.membresSansPerso) {
    lignes.push({
      clef: "sans-perso", urgence: "basse", nombre: c.membresSansPerso,
      phrase: pl(c.membresSansPerso, "membre sans aucun perso déclaré", "membres sans aucun perso déclaré"),
      href: "/staff?section=suivi&filtre=sans-perso", geste: "Voir",
    });
  }
  if (c.stuffsARenseigner) {
    lignes.push({
      clef: "sans-mesures", urgence: "basse", nombre: c.stuffsARenseigner,
      phrase: pl(c.stuffsARenseigner, "stuff sans mesures", "stuffs sans mesures"),
      detail: "dégâts ou PV à renseigner dans l'AirBuilder",
      href: "/staff?section=suivi&filtre=a-renseigner", geste: "Voir",
    });
  }
  if (c.stuffsARemesurer) {
    lignes.push({
      clef: "a-remesurer", urgence: "basse", nombre: c.stuffsARemesurer,
      phrase: pl(c.stuffsARemesurer, "stuff à remesurer", "stuffs à remesurer"),
      detail: "mesurés il y a plus de 30 jours",
      href: "/staff?section=suivi&filtre=a-remesurer", geste: "Voir",
    });
  }

  return { genereLe: maintenant.toISOString(), lignes, compteurs: c };
}
