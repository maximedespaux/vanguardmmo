import type { Role } from "@prisma/client";
import { GUILD_ROLES, ROLE_RANK } from "@/config/roles";
import { nbPlaces, normaliserCompo, type Creneau } from "@/lib/compositions";
import { etatStuff, stuffVide, type StuffBrut } from "@/lib/mesures";
import { lienBuilder } from "@/lib/mesPersos";
import { lignesRecensement, postesDesInscriptions, type LigneRecensement, type PersoRecense } from "@/lib/recensement";

/**
 * INFORMATION GUILDE — ce que la page /guilde montre à TOUS les membres, en une lecture
 * (SPEC-INFORMATION-GUILDE §2, demande de Maxime du 2026-10-21 : « avoir un œil pour tous
 * les membres de la guilde et connaître les personnes (DiscordID et personnages de la
 * personne) pour apprendre à se connaître ou savoir qui est qui »).
 *
 * LA RÈGLE QUI TIENT TOUT : rien d'interne. Ce module reçoit des lignes de la base et n'en
 * rend que ce qui s'affiche — pas d'identifiant de compte, pas de dernière visite, pas de
 * motif d'absence, pas de build qui n'a pas été partagé, aucune note, aucun dossier. Le
 * staff a tout cela dans son tableau de bord ; ici, chacun voit des autres ce qu'ils
 * montreraient eux-mêmes en jeu ou sur Discord.
 *
 * QUI FIGURE : les rangs de guilde seulement (un candidat ou un Friend n'en sont pas),
 * les comptes actifs (un exclu ou un banni ne l'est plus) et pas les membres CACHÉS par
 * un bras droit (`User.cacheLe`). La route filtre déjà en base ; `figure()` refait le tri
 * ici pour que la règle se vérifie sans base (scripts/verifier-seances.ts).
 *
 * Module PUR : ni Prisma, ni Next, ni lib/recap (qui tire Prisma). Les jours d'absence
 * arrivent donc déjà en « AAAA-MM-JJ », calculés par la route avec les fonctions de
 * lib/recap — « absent aujourd'hui » vaut ainsi la même chose ici et sur /staff. La page
 * importe aussi `etatSuivi` d'ici : rien de ce fichier ne doit tirer le serveur.
 */

/* ── Ce que la route lit en base ──────────────────────────────────────────────── */

export type MembreBrut = {
  id: string; username: string; discordId: string; avatar: string | null; role: Role;
  isActive: boolean; cacheLe: Date | string | null;
  /** Le partage du build : le lien (/build/[shareId]) et les persos que le membre a
   *  cochés « Visible dans Information Guilde » dans l'AirBuilder — voir `lienBuildPartage`. */
  sharePublic: boolean; shareId: string | null; persosPartages: string[];
  characters: {
    name: string; class: string; level: number; prestige: number; isMain: boolean;
    /** Dans l'ordre de l'AirBuilder ; seules les mesures et la présence des pièces sont lues. */
    gearProfiles: StuffBrut[];
  }[];
};
/** Une absence réduite à ses deux JOURS (bornes comprises) : jamais son motif. */
export type AbsenceJours = { userId: string; debut: string; fin: string };

/* ── Ce que la page reçoit ───────────────────────────────────────────────────── */

export type PersoGuilde = {
  nom: string;
  /** L'enum de la base (ARCANISTE…) : ClassLogo et findClass le lisent tels quels. */
  classe: string;
  niveau: number; prestige: number; principal: boolean;
  /**
   * « Voir le build » — SEULEMENT si le membre l'a partagé (§5), ou « Ouvrir dans
   * l'AirBuilder » quand c'est le sien. `null` : le build reste aux bras droits.
   */
  build: string | null;
};

/** Ses stuffs MONTÉS, par état : « qui a mesuré, qui doit remesurer » (§2.5). */
export type MesuresMembre = { montes: number; aJour: number; aRemesurer: number; manquantes: number };

export type MembreGuilde = {
  /** Le pseudo EN JEU — le perso principal —, à défaut le nom Discord. */
  pseudo: string;
  rang: Role;
  /** Le nom d'utilisateur Discord, son identifiant (à copier pour un MP ou une mention)
   *  et son avatar : ce que n'importe quel membre du serveur voit déjà sur Discord. */
  discord: { nom: string; id: string; avatar: string | null };
  /** Ma propre carte : la page la souligne, et ses liens rouvrent mon AirBuilder. */
  moi: boolean;
  persos: PersoGuilde[];
  mesures: MesuresMembre;
};

export type AnnonceCS = { creneau: Creneau; ts: number };

export type InformationGuilde = {
  genereLe: string;
  /** L'instant du calcul : la page juge « à remesurer » et les dates à la même heure. */
  maintenant: number;
  membres: MembreGuilde[];
  /** Les pseudos des absents AUJOURD'HUI (jour de Paris) — les noms, jamais le motif. */
  absents: string[];
  /**
   * La prochaine Chambre Secrète se CHOISIT DANS LE NAVIGATEUR (`prochaineSeance` lit
   * l'heure locale, et le serveur ne tourne pas à l'heure de Paris : calculée ici, la
   * fenêtre glisserait d'une ou deux heures). La route ne rend que les horodatages des
   * annonces, sans aucun nom, et celles du membre lui-même.
   */
  cs: { places: number; annonces: AnnonceCS[]; miennes: AnnonceCS[] };
  /** Les lignes du recensement, comme pour un membre qui n'est pas du staff : ni lien de
   *  dossier, ni build qui n'a pas été partagé. */
  recensement: LigneRecensement[];
};

/* ── Les règles ──────────────────────────────────────────────────────────────── */

/** Figure dans Information Guilde : un rang de guilde, un compte actif, pas caché. */
export const figure = (u: Pick<MembreBrut, "role" | "isActive" | "cacheLe">) =>
  GUILD_ROLES.includes(u.role) && u.isActive && !u.cacheLe;

/** Avatar Discord : déjà connu à la connexion, rien à héberger ni à modérer. */
export const avatarDiscord = (discordId: string, avatar: string | null) =>
  avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=64` : null;

/**
 * LE NOM D'UN PERSO PARTAGÉ, rangé comme la synchro le range (/api/characters/sync : 40
 * signes) — sans quoi un nom long, coché dans l'AirBuilder, ne retrouvait jamais son
 * perso du site.
 */
export const nomPartage = (nom: string) => nom.trim().slice(0, 40).trim();
/** Comparés sans casse ni accent, comme le lien profond de l'AirBuilder (`vgOuvrirDepuisURL`). */
const clePerso = (nom: string) => nomPartage(nom).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const estPartage = (persosPartages: string[], perso: string) =>
  persosPartages.some((n) => clePerso(n) === clePerso(perso));

/**
 * OÙ MÈNE « VOIR LE BUILD » — et le seul endroit où cela se décide.
 *
 * Le sien : l'AirBuilder, sur ce perso (lien profond, lib/mesPersos). Celui d'un autre :
 * SEULEMENT si ce perso est coché « Visible dans Information Guilde » dans son AirBuilder
 * (`persosPartages`, une case par perso de la fenêtre « Partager » — §5), et alors son
 * partage, ouvert sur ce perso. Sinon RIEN : les builds sont l'affaire des bras droits, et
 * un lien /builder/{id} montré à un membre le mènerait à un refus.
 *
 * Le lien ouvert à la main (`sharePublic`) ne suffit plus depuis le 2026-10-21 : c'est un
 * lien qu'on donne à quelqu'un, pas une vitrine pour toute la guilde. Les deux sont
 * indépendants, et c'est la case qui décide ici.
 */
export function lienBuildPartage(
  u: Pick<MembreBrut, "id" | "shareId" | "persosPartages">, perso: string, moi: { id: string },
): string | null {
  if (u.id === moi.id) return lienBuilder(perso);
  if (u.shareId && estPartage(u.persosPartages, perso)) return `/build/${encodeURIComponent(u.shareId)}?perso=${encodeURIComponent(perso)}`;
  return null;
}

/**
 * LE BUILD QUE MONTRE « VOIR LE BUILD » quand le lien n'est pas ouvert : les seuls persos
 * cochés, rien d'autre de l'état de l'AirBuilder (ni les autres persos, ni ses modèles).
 * `null` si aucun ne reste — un perso renommé depuis n'est plus partagé.
 */
export function blobDesPersosPartages(blob: unknown, persosPartages: string[]): { chars: unknown[]; cur: number } | null {
  const chars = (blob && typeof blob === "object" && Array.isArray((blob as { chars?: unknown }).chars))
    ? ((blob as { chars: unknown[] }).chars) : [];
  const gardes = chars.filter((c) => !!c && typeof c === "object" && estPartage(persosPartages, String((c as { name?: unknown }).name ?? "")));
  return gardes.length ? { chars: gardes, cur: 0 } : null;
}

/** Les stuffs montés d'un membre, comptés par état — un stuff vide n'en est pas un. */
export function mesuresDuMembre(u: Pick<MembreBrut, "characters">, maintenant: number): MesuresMembre {
  const etats = u.characters.flatMap((c) => c.gearProfiles.filter((g) => !stuffVide(g)).map((g) => etatStuff(g, maintenant)));
  return {
    montes: etats.length,
    aJour: etats.filter((e) => e === "complet").length,
    aRemesurer: etats.filter((e) => e === "a-remesurer").length,
    manquantes: etats.filter((e) => e === "a-renseigner").length,
  };
}

/** Où se range un membre dans « Le suivi des mesures » : la raison la plus forte d'abord. */
export type EtatSuivi = "manquantes" | "a-remesurer" | "a-jour" | "aucun";
export function etatSuivi(m: MesuresMembre): EtatSuivi {
  if (m.montes === 0) return "aucun";
  if (m.manquantes > 0) return "manquantes";
  if (m.aRemesurer > 0) return "a-remesurer";
  return "a-jour";
}

const rang = (r: Role) => ROLE_RANK.indexOf(r);
const minuscule = (s: string) => s.trim().toLowerCase();

/* ── Le calcul ───────────────────────────────────────────────────────────────── */

export function versInformationGuilde(
  brut: { membres: MembreBrut[]; absences: AbsenceJours[]; compo: unknown },
  opts: { moi: { id: string; username: string }; maintenant: number; aujourdhui: string },
): InformationGuilde {
  const { moi, maintenant, aujourdhui } = opts;
  const vus = brut.membres.filter(figure);

  const pseudoDe = (u: MembreBrut) =>
    (u.characters.find((c) => c.isMain) ?? u.characters[0])?.name ?? u.username;

  const membres: MembreGuilde[] = vus
    .map((u) => ({
      pseudo: pseudoDe(u),
      rang: u.role,
      discord: { nom: u.username, id: u.discordId, avatar: avatarDiscord(u.discordId, u.avatar) },
      moi: u.id === moi.id,
      persos: u.characters.map((c) => ({
        nom: c.name, classe: c.class, niveau: c.level, prestige: c.prestige, principal: c.isMain,
        build: lienBuildPartage(u, c.name, moi),
      })),
      mesures: mesuresDuMembre(u, maintenant),
    }))
    .sort((a, b) => rang(a.rang) - rang(b.rang) || a.pseudo.localeCompare(b.pseudo, "fr"));

  /* Les absents du jour : une absence est un JOUR stocké à minuit UTC, bornes comprises
     (lib/recap). Un membre caché ou parti n'y figure pas plus qu'ailleurs. */
  const parId = new Map(vus.map((u) => [u.id, u]));
  const absentsIds = new Set(
    brut.absences.filter((a) => a.debut <= aujourdhui && a.fin >= aujourdhui && parId.has(a.userId)).map((a) => a.userId),
  );
  const absents = [...absentsIds].map((id) => pseudoDe(parId.get(id)!)).sort((a, b) => a.localeCompare(b, "fr"));

  /* Les annonces de Chambre Secrète portent le pseudo d'un PERSONNAGE et le nom du joueur
     tel que la session le donnait : on reconnaît les siennes par ses persos, plus sûr que
     le nom (la règle de l'ancien accueil du membre). */
  const etat = normaliserCompo(brut.compo);
  const mesNoms = new Set((parId.get(moi.id)?.characters ?? []).map((c) => minuscule(c.name)));
  const miennes = etat.presences.filter((p) => mesNoms.has(minuscule(p.pseudo)) || minuscule(p.player) === minuscule(moi.username));

  /* Le recensement, sur les MÊMES membres, et vu par un membre qui n'est pas du staff —
     même pour un bras droit : la page ne montre jamais de dossier ni de build privé.
     Son lien « Build » vient de `lienBuildPartage`, comme « Voir le build » : la règle
     de lib/recensement (`/build/{id}` sans perso, `/builder` sans lien profond) aurait
     fait une SECONDE décision, que le partage par perso n'aurait pas suivie. */
  const persosRecenses: PersoRecense[] = vus
    .flatMap((u) => u.characters.map((c) => ({
      name: c.name, class: c.class, level: c.level, prestige: c.prestige,
      user: { id: u.id, username: u.username, sharePublic: u.sharePublic, shareId: u.shareId },
      gearProfiles: c.gearProfiles.map((g) => ({ mesures: g.mesures })),
    })))
    .sort((a, b) => a.name.localeCompare(b.name));
  const recensement = lignesRecensement(persosRecenses, {
    maintenant, appelant: { id: moi.id, staff: false }, postes: postesDesInscriptions(etat),
    lien: (p) => lienBuildPartage(parId.get(p.user.id)!, p.name, moi),
  });

  return {
    genereLe: new Date(maintenant).toISOString(),
    maintenant,
    membres,
    absents,
    cs: {
      places: nbPlaces(),
      annonces: etat.presences.map((p) => ({ creneau: p.creneau, ts: p.ts })),
      miennes: miennes.map((p) => ({ creneau: p.creneau, ts: p.ts })),
    },
    recensement,
  };
}
