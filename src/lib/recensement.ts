import { findClass } from "@/data/classes";
import { CS_DEFAUT, CS_SLOTS, type RolesCS, type Slot } from "@/app/(guild)/compositions/slots";
import { BUFFS, CONDITIONS, MESURE_VIEILLE_MS, POUDRES, lireMesures, rolesDeClasse, type Mesures, type RoleMesure } from "@/lib/mesures";
import type { CompoState } from "@/lib/compositions";

/**
 * LE RECENSEMENT — les chiffres de chacun, stuff par stuff : le DPS mesuré sur le totem
 * de l'Oasis, ou les PV. La saisie existe déjà, dans l'AirBuilder (bloc « LES MESURES DU
 * STUFF » de public/airbuilder/airbuilder.js) ; ce module les LIT et dit lequel montrer.
 * Il remplace le salon `📋・recensement` du bot de Dracarys (spec §1, §12).
 *
 * DES VALEURS DÉCLARÉES, JAMAIS VÉRIFIÉES (Maxime, 2026-10-21 : « même si sur le site les
 * dégâts ne sont pas justes »). Chaque chiffre voyage donc avec sa date de mesure et son
 * témoin « à remesurer » — c'est ce qui permet de le lire pour ce qu'il est.
 *
 * Module PUR, comme lib/compositions.ts : ni React, ni next/*, ni Prisma, ni server-only.
 * La section #recensement d'Information Guilde (/api/guilde), la route /api/recensement,
 * le comparatif de /compositions et, demain, le panneau Discord du bot (tsx résout `@/*`)
 * l'emploient tous : un même perso dit le même chiffre partout.
 */

/* ── Les nombres, comme on les tape sur Discord ────────────────────────────────
   Ports À L'IDENTIQUE de `mesLire` et `mesCourt` (airbuilder.js), qui reprennent
   eux-mêmes `lire_nombre` et `fmt_nombre` du bot de Dracarys. Le joueur saisit dans le
   builder ; le site et le bot affichent : si les deux formes divergeaient, « 9,4 M » dans
   le builder deviendrait « 9,40 M » sur la compo, et on croirait à deux mesures. */

/** « 9,4M », « 1.2 m », « 850k », « 9 400 000 » → entier. Sans suffixe, `.` et `,`
 *  séparent les milliers ; avec un suffixe, la virgule est décimale. 0 ou illisible → 0. */
export function lireNombre(t: unknown): number {
  let x = String(t ?? "").toLowerCase().replace(/[\s  ]/g, "");
  let mult = 1;
  if (/m$/.test(x)) { x = x.slice(0, -1); mult = 1e6; } else if (/k$/.test(x)) { x = x.slice(0, -1); mult = 1e3; }
  x = mult === 1 ? x.replace(/[.,]/g, "") : x.replace(",", ".");
  const n = Math.round(parseFloat(x) * mult);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** « 9,4 M », « 850 k », « 640 » — et « — » pour 0. La forme des tableaux. */
export function chiffreCourt(n: unknown): string {
  const x = Number(n) || 0;
  if (!x) return "—";
  if (x >= 1e6) return `${(x / 1e6).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} M`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1).replace(/\.?0+$/, "").replace(".", ",")} k`;
  return String(x);
}

/* ── L'âge d'une mesure ─────────────────────────────────────────────────────── */

/** `MES_VIEILLE` du builder : au-delà, une pièce, un +N ou un prestige ont bougé. */
export const VIEILLE_MS = MESURE_VIEILLE_MS;

/** `mesVieille` du builder : seule une mesure COMPLÈTE vieillit — une mesure incomplète
 *  est déjà « à renseigner », lui coller « à remesurer » en plus brouillerait le geste. */
export const aRemesurer = (m: Pick<Mesures, "complet" | "mesureLe">, maintenant: number) =>
  m.complet === true && !!m.mesureLe && maintenant - m.mesureLe > VIEILLE_MS;

/* ── Le chiffre d'un stuff ──────────────────────────────────────────────────── */

/** L'arme avec laquelle les PV ont été relevés : un Primat n'a pas les mêmes PV en
 *  sceptre (les boss) et en poing (le boss final). */
export type Arme = "sceptre" | "poing" | "doloire";

export type Chiffre = {
  role: RoleMesure;
  /** La clé de tri : DPS/s, ou PV. Jamais une Bulle ni une Boulette, qui ne
   *  s'additionnent pas avec un DPS par seconde. */
  valeur: number;
  /** « 182 k/s », « 150 k – 210 k/s », « 9,4 M PV ». */
  texte: string;
  arme: Arme | null;
  /** Ce qui précise le chiffre : « Bulle 45 k », « Boulette 45 k », « sceptre 6,1 M ». */
  detail: string | null;
  mesureLe: number | null;
  aRemesurer: boolean;
  /** Le verdict du builder : `false` = des chiffres obligatoires manquent. */
  complet: boolean | null;
  /** Les cases cochées, en clair : ce sans quoi deux chiffres ne se comparent pas. */
  poudres: string[];
  buffs: string[];
  avec: string[];
};

const cleClasse = (c: string) => findClass(c)?.key ?? c;
const MILIEU = (a: number, b: number) => Math.round((a + b) / 2);

/** La base commune d'un chiffre : date, verdict et cases cochées. */
function socle(m: Mesures, maintenant: number) {
  return {
    mesureLe: m.mesureLe,
    aRemesurer: aRemesurer(m, maintenant),
    complet: m.complet,
    poudres: m.poudres.map((k) => (POUDRES[k] ?? k).replace(/^Poudre /, "")),
    buffs: m.buffs.map((k) => BUFFS[k] ?? k),
    avec: m.cond.map((k) => (CONDITIONS[k] ?? k).toLowerCase()),
  };
}

/**
 * Ce qu'un stuff mesuré donne, rôle par rôle (spec §4.2, avec la règle du Primat du
 * 2026-10-21). Un stuff donne un chiffre pour son rôle ; un stuff Tank de Primat en donne
 * un second, en Off tank, avec ses PV en sceptre : il fait office d'Off tank PUIS de
 * Tank, et c'est ce chiffre-là qui tient les boss. La valeur peut être 0 — le stuff est
 * monté mais ses chiffres manquent — : c'est l'appelant qui l'écarte ou le dit.
 */
export function chiffresDuStuff(m: Mesures, classe: string, maintenant: number): Chiffre[] {
  const k = cleClasse(classe);
  const role: RoleMesure = m.role && rolesDeClasse(k).includes(m.role) ? m.role : "dps";
  const v = m.v;
  const base = socle(m, maintenant);
  const c = (x: Omit<Chiffre, keyof ReturnType<typeof socle>>): Chiffre => ({ ...x, ...base });

  if (role === "dps") {
    if (k === "Arcaniste" || k === "Envouteur" || k === "Primat") {
      const coup = k === "Arcaniste" ? v.bulle : v.boulette;
      return [c({ role, valeur: v.dps ?? 0, texte: `${chiffreCourt(v.dps)}/s`, arme: null,
        detail: coup ? `${k === "Arcaniste" ? "Bulle" : "Boulette"} ${chiffreCourt(coup)}` : null })];
    }
    const min = v.dpsMin ?? 0, max = v.dpsMax ?? 0;
    if (min && max) return [c({ role, valeur: MILIEU(min, max), texte: `${chiffreCourt(min)} – ${chiffreCourt(max)}/s`, arme: null, detail: null })];
    // Un seul des deux bornes : le chiffre existe, mais il ne dit pas la fourchette.
    const seul = min || max;
    return [c({ role, valeur: seul, texte: `${chiffreCourt(seul)}/s`, arme: null, detail: seul ? (min ? "minimum seul" : "maximum seul") : null })];
  }

  if (role === "offtank") {
    // Les dégâts d'un Off tank sont facultatifs : déclarés, on les montre en détail.
    const frappe = [v.dps ? `${chiffreCourt(v.dps)}/s` : "", v.boulette ? `Boulette ${chiffreCourt(v.boulette)}` : ""].filter(Boolean).join(" · ");
    return [c({ role, valeur: v.pv ?? 0, texte: `${chiffreCourt(v.pv)} PV`, arme: "sceptre", detail: frappe || null })];
  }

  const tank = c({ role, valeur: v.pv ?? 0, texte: `${chiffreCourt(v.pv)} PV`, arme: k === "Templier" ? "doloire" : "poing",
    detail: k === "Primat" && v.pvSceptre ? `sceptre ${chiffreCourt(v.pvSceptre)}` : null });
  // Sans sceptre déclaré, pas de second chiffre : le manque se lit déjà sur la ligne
  // Tank (le builder exige les deux, `complet` est donc faux).
  if (k !== "Primat" || !v.pvSceptre) return [tank];
  return [tank, c({ role: "offtank", valeur: v.pvSceptre ?? 0, texte: `${chiffreCourt(v.pvSceptre)} PV`, arme: "sceptre", detail: "relevé sur le stuff Tank" })];
}

/** Tous les chiffres d'un perso, ses stuffs VIDES écartés (`complet: null` : chaque
 *  perso naît avec trois stuffs, un stuff jamais monté n'a rien à dire). */
export function chiffresDuPerso(stuffs: { mesures: unknown }[], classe: string, maintenant: number): Chiffre[] {
  return stuffs.flatMap((s) => {
    const m = lireMesures(s.mesures);
    return m && m.complet !== null ? chiffresDuStuff(m, classe, maintenant) : [];
  });
}

/** Préférences entre deux chiffres d'un même rôle : complet avant incomplet, puis la
 *  mesure la plus récente, puis le chiffre le plus haut. */
function meilleur(a: Chiffre, b: Chiffre): number {
  const ca = a.complet === true ? 1 : 0, cb = b.complet === true ? 1 : 0;
  if (ca !== cb) return cb - ca;
  if ((a.mesureLe ?? 0) !== (b.mesureLe ?? 0)) return (b.mesureLe ?? 0) - (a.mesureLe ?? 0);
  return b.valeur - a.valeur;
}

/**
 * Le meilleur chiffre de chaque rôle. Un rôle dont aucun stuff n'a de chiffre n'y est
 * pas : « sans mesure » se décide là où on l'affiche.
 */
export function chiffresParRole(stuffs: { mesures: unknown }[], classe: string, maintenant: number): Partial<Record<RoleMesure, Chiffre>> {
  const out: Partial<Record<RoleMesure, Chiffre>> = {};
  for (const ch of chiffresDuPerso(stuffs, classe, maintenant).filter((x) => x.valeur > 0).sort(meilleur)) {
    if (!out[ch.role]) out[ch.role] = ch;
  }
  return out;
}

/**
 * Le stuff à montrer pour un poste (spec §4.2) : le premier rôle de `roles` qui a un
 * chiffre, puis les préférences de `meilleur`. Un stuff vide ne compte jamais.
 */
export function choisirStuff(stuffs: { mesures: unknown }[], roles: RoleMesure[], classe: string, maintenant: number): Chiffre | null {
  const par = chiffresParRole(stuffs, classe, maintenant);
  for (const r of roles) if (par[r]) return par[r]!;
  return null;
}

/* ── Le chiffre d'un poste de la Chambre ────────────────────────────────────── */

/** Les rôles d'un poste ; un annoncé sans poste prend ceux du premier poste de sa
 *  classe, et une classe sans poste, dps partout (spec §2.3). */
export function rolesDuPoste(slot: Slot | null | undefined, classe?: string): RolesCS {
  if (slot) return slot.cs ?? CS_DEFAUT;
  const k = classe ? cleClasse(classe) : "";
  return CS_SLOTS.find((s) => cleClasse(s.classe) === k)?.cs ?? CS_DEFAUT;
}

/** Les chiffres à poser à côté d'un nom, pour ce poste : tous ceux de `mesure` quand le
 *  poste l'exige (p1 : sceptre puis poing), sinon le premier trouvé. */
export function chiffresDuPoste(par: Partial<Record<RoleMesure, Chiffre>>, cs: RolesCS): Chiffre[] {
  const dispo = cs.mesure.map((r) => par[r]).filter((x): x is Chiffre => !!x);
  return cs.toutes ? dispo : dispo.slice(0, 1);
}

/** « 9,4 M PV » ; « 4,9 M sceptre · 7,9 M poing » quand un poste montre les deux PV ;
 *  l'arme est dite aussi quand le chiffre montré n'est qu'un repli (p2 sans sceptre), et
 *  quand un poste qui attend les deux n'en a qu'un : sur p1, « 4,9 M PV » seul ne disait
 *  pas que c'est le sceptre, ni donc que le poing manque. */
export function enLigne(chiffres: Chiffre[], cs: RolesCS): string {
  if (chiffres.length > 1) return chiffres.map((c) => `${chiffreCourt(c.valeur)}${c.arme ? ` ${c.arme}` : ""}`).join(" · ");
  const c = chiffres[0];
  if (!c) return "";
  return c.arme && (cs.toutes || c.role !== cs.mesure[0]) ? `${c.texte} ${c.arme}` : c.texte;
}

/** Le survol : « Bulle 45 k · 182 k/s · mesuré le 12/10 · poudres : Orange, Rose · avec
 *  perles, consommables » (spec §7.2). Toujours « déclaré » : rien n'est vérifié. */
export function survol(c: Chiffre): string {
  const date = c.mesureLe ? new Date(c.mesureLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : null;
  return [
    `${c.texte}${c.arme ? ` en ${c.arme}` : ""}${c.detail ? ` · ${c.detail}` : ""}`,
    date ? `déclaré le ${date}${c.aRemesurer ? " (plus de 30 jours : à remesurer)" : ""}` : "déclaré, sans date",
    c.complet === false ? "mesures incomplètes" : "",
    c.poudres.length ? `poudres : ${c.poudres.join(", ")}` : "",
    c.buffs.length ? `buffs : ${c.buffs.join(", ")}` : "",
    c.avec.length ? `avec ${c.avec.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
}

/* ── Les homonymes ──────────────────────────────────────────────────────────── */

/**
 * LE BON PERSONNAGE QUAND UN NOM EN DÉSIGNE PLUSIEURS (spec §12.3). Le nom est unique en
 * jeu, pas en base : `Character.name` n'a aucune contrainte, et un candidat peut déclarer
 * un perso du même nom qu'un membre. On prend un compte de la guilde, celui de
 * l'inscription ou de l'annonce d'abord (`player` est le `User.username` du jour de la
 * connexion) — et jamais un compte RECRUE : ses chiffres n'ont rien à faire dans la compo.
 */
export function departager<T extends { user: { username: string; role: string; isActive: boolean } }>(
  persos: T[], player: string | null | undefined, rolesGuilde: readonly string[],
): T | null {
  const membres = persos.filter((p) => p.user.isActive && rolesGuilde.includes(p.user.role));
  const j = (player ?? "").toLowerCase();
  return membres.find((p) => j && p.user.username.toLowerCase() === j) ?? membres[0] ?? null;
}

/* ── Les lignes de la page /recensement ─────────────────────────────────────── */

/** L'ordre des groupes de la page : les tanks d'abord, c'est eux qui manquent. Jamais
 *  de PV et de DPS dans un même tri. */
export const ORDRE_ROLES: RoleMesure[] = ["tank", "offtank", "dps"];

/** Ce que la route lit en base — et RIEN d'autre du stuff que ses mesures. */
export type PersoRecense = {
  name: string; class: string; level: number; prestige: number;
  user: { id: string; username: string; sharePublic: boolean; shareId: string | null };
  gearProfiles: { mesures: unknown }[];
};

/** Une ligne par personnage et par rôle mesuré ; une ligne sans rôle pour un perso sans
 *  aucun stuff mesuré. Uniquement ce qui s'affiche (spec §12.2). */
export type LigneRecensement = {
  perso: string; classe: string; joueur: string; niveau: number; prestige: number;
  role: RoleMesure | null;
  chiffre: number | null;
  texte: string | null;
  arme: Arme | null;
  detail: string | null;
  poudres: string[]; buffs: string[]; avec: string[];
  mesureLe: number | null; aRemesurer: boolean; complet: boolean | null;
  posteCS: string | null;
  /** Calculé côté serveur selon l'appelant : le staff, soi-même, ou un build partagé. */
  lienBuild: string | null;
  /** Staff seulement : le dossier du membre (section Membres du tableau de bord, /staff). */
  lienDossier: string | null;
  moi: boolean;
};

/** Le libellé du poste où chaque pseudo est inscrit, titulaire d'abord — le libellé
 *  renommé par le staff s'il existe. Clé : le pseudo en minuscules. */
export function postesDesInscriptions(etat: Pick<CompoState, "signups" | "slotMeta">): Map<string, string> {
  const out = new Map<string, string>();
  const ordre = [...etat.signups].sort((a, b) => Number(!!b.selected) - Number(!!a.selected));
  for (const s of ordre) {
    const slot = CS_SLOTS.find((x) => x.id === s.slotId);
    const cle = s.pseudo.toLowerCase();
    if (!slot || out.has(cle)) continue;
    out.set(cle, etat.slotMeta[slot.id]?.label || slot.label);
  }
  return out;
}

/**
 * Où mène « Build » (spec §12.1), d'après les droits RÉELS de /api/builder-state : le
 * staff ouvre le build de n'importe qui ; un membre, le sien ; un autre membre n'est
 * ouvert que s'il a partagé son build. Un lien /builder/{id} montré à un membre le
 * mènerait à un refus (piège n° 5 de la spec).
 */
function lienBuild(p: PersoRecense, appelant: { id: string; staff: boolean }): string | null {
  if (p.user.id === appelant.id) return "/builder";
  if (appelant.staff) return `/builder/${p.user.id}`;
  return p.user.sharePublic && p.user.shareId ? `/build/${p.user.shareId}` : null;
}

export function lignesRecensement(
  persos: PersoRecense[],
  opts: {
    maintenant: number; appelant: { id: string; staff: boolean }; postes: Map<string, string>;
    /** Qui décide du lien « Build », quand ce n'est pas la règle de /api/builder-state :
     *  Information Guilde passe `lienBuildPartage` (lib/guilde.ts), pour que la colonne
     *  Build du recensement et « Voir le build » de « Qui est qui » ne se contredisent
     *  jamais — le jour où le partage devient une case par perso, un seul endroit change. */
    lien?: (p: PersoRecense) => string | null;
  },
): LigneRecensement[] {
  const { maintenant, appelant, postes } = opts;
  return persos.flatMap((p): LigneRecensement[] => {
    const tete = {
      perso: p.name, classe: findClass(p.class)?.label ?? p.class, joueur: p.user.username,
      niveau: p.level, prestige: p.prestige,
      posteCS: postes.get(p.name.toLowerCase()) ?? null,
      lienBuild: opts.lien ? opts.lien(p) : lienBuild(p, appelant),
      lienDossier: appelant.staff ? `/staff?section=membres&dossier=${encodeURIComponent(p.user.id)}` : null,
      moi: p.user.id === appelant.id,
    };
    const tous = chiffresDuPerso(p.gearProfiles, p.class, maintenant);
    const roles = ORDRE_ROLES.filter((r) => tous.some((c) => c.role === r));
    if (!roles.length) {
      return [{ ...tete, role: null, chiffre: null, texte: null, arme: null, detail: null, poudres: [], buffs: [], avec: [],
        mesureLe: null, aRemesurer: false, complet: null }];
    }
    return roles.map((role) => {
      const duRole = tous.filter((c) => c.role === role).sort((a, b) => (Number(b.valeur > 0) - Number(a.valeur > 0)) || meilleur(a, b));
      const c = duRole[0];
      const vu = c.valeur > 0;
      return {
        ...tete, role,
        chiffre: vu ? c.valeur : null, texte: vu ? c.texte : null, arme: c.arme, detail: vu ? c.detail : null,
        poudres: c.poudres, buffs: c.buffs, avec: c.avec,
        mesureLe: c.mesureLe, aRemesurer: c.aRemesurer,
        // Un rôle sans aucun chiffre est incomplet, quel que soit le verdict d'un autre stuff.
        complet: vu ? c.complet : false,
      };
    });
  });
}

/* ── La vue résumée, pour la rubrique Suivi des bras droits ─────────────────── */

export type ResumeClasse = {
  classe: string; persos: number; mesures: number; aRemesurer: number; incomplets: number;
  /** Le DPS/s médian des lignes DPS ; les PV médians en Tank (poing, doloire) et en
   *  sceptre (Off tank) — jamais mélangés : un Primat n'a pas les mêmes PV des deux. */
  dpsMedian: number | null; pvMedian: number | null; pvSceptreMedian: number | null;
};
export type ResumeRole = { lignes: number; mesures: number; aRemesurer: number; median: number | null };
export type Relance = { joueur: string; perso: string; raison: "incomplet" | "a_remesurer" | "sans_mesure" };
export type ResumeRecensement = {
  parClasse: ResumeClasse[];
  parRole: Record<RoleMesure, ResumeRole>;
  /** Staff seulement : qui relancer, et pourquoi. */
  aRelancer?: Relance[];
};

export function mediane(xs: number[]): number | null {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : Math.round((t[m - 1] + t[m]) / 2);
}

export function resumer(lignes: LigneRecensement[], staff: boolean): ResumeRecensement {
  const chiffres = (l: LigneRecensement[], role: RoleMesure) => l.filter((x) => x.role === role && x.chiffre !== null).map((x) => x.chiffre as number);
  const classes = [...new Set(lignes.map((l) => l.classe))].sort((a, b) => a.localeCompare(b, "fr"));
  const parClasse = classes.map((classe): ResumeClasse => {
    const l = lignes.filter((x) => x.classe === classe);
    return {
      classe,
      persos: new Set(l.map((x) => `${x.joueur}|${x.perso}`)).size,
      mesures: l.filter((x) => x.chiffre !== null).length,
      aRemesurer: l.filter((x) => x.aRemesurer).length,
      incomplets: l.filter((x) => x.complet === false).length,
      dpsMedian: mediane(chiffres(l, "dps")), pvMedian: mediane(chiffres(l, "tank")), pvSceptreMedian: mediane(chiffres(l, "offtank")),
    };
  });
  const role = (r: RoleMesure): ResumeRole => {
    const l = lignes.filter((x) => x.role === r);
    return { lignes: l.length, mesures: l.filter((x) => x.chiffre !== null).length, aRemesurer: l.filter((x) => x.aRemesurer).length, median: mediane(chiffres(l, r)) };
  };
  const out: ResumeRecensement = { parClasse, parRole: { dps: role("dps"), offtank: role("offtank"), tank: role("tank") } };
  if (staff) {
    // Une relance par perso, la raison la plus forte d'abord : rien de mesuré, puis
    // des chiffres qui manquent, puis une mesure qui a vieilli.
    const parPerso = new Map<string, LigneRecensement[]>();
    for (const l of lignes) parPerso.set(`${l.joueur}|${l.perso}`, [...(parPerso.get(`${l.joueur}|${l.perso}`) ?? []), l]);
    out.aRelancer = [...parPerso.values()].flatMap((l): Relance[] => {
      const raison = l.every((x) => x.role === null) ? "sans_mesure"
        : l.some((x) => x.complet === false) ? "incomplet"
          : l.some((x) => x.aRemesurer) ? "a_remesurer" : null;
      return raison ? [{ joueur: l[0].joueur, perso: l[0].perso, raison }] : [];
    });
  }
  return out;
}
