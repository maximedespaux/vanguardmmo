import { findClass } from "@/data/classes";

/**
 * LES MESURES D'UN STUFF, lues côté site — le pendant du bloc « LES MESURES DU
 * STUFF » de public/airbuilder/airbuilder.js, qui les saisit.
 *
 * Le builder les envoie telles quelles dans `GearProfile.mesures` (voir
 * /api/characters/sync) : rôle, chiffres, poudres, buffs, conditions, date de la
 * mesure et VERDICT `complet`. Le verdict est repris tel quel, sans être recalculé :
 * c'est le builder qui connaît la règle classe × rôle, et deux calculs finiraient par
 * diverger. Ce fichier ne fait que la LIRE et la NOMMER.
 *
 * Module pur, sans Prisma ni Next : la page du suivi l'emploie dans le navigateur,
 * `lib/recap.ts` sur le serveur, et le bot l'emploiera par recap.ts.
 */

export type RoleMesure = "dps" | "offtank" | "tank";
/** Les quatre états du builder, avec ses mots : « Stuff vide », « À renseigner »,
 *  « À remesurer », « Complet ». Le staff lit ici ce que le joueur a lu là-bas. */
export type EtatStuff = "vide" | "a-renseigner" | "a-remesurer" | "complet";

export const ROLE_LIBELLE: Record<RoleMesure, string> = { dps: "DPS", offtank: "Off tank", tank: "Tank" };
export const ETAT_LIBELLE: Record<EtatStuff, string> = {
  vide: "Stuff vide", "a-renseigner": "À renseigner", "a-remesurer": "À remesurer", complet: "Complet",
};
export const POUDRES: Record<string, string> = { orange: "Poudre Orange", bleue: "Poudre Bleue", rose: "Poudre Rose", verte: "Poudre Verte" };
export const BUFFS: Record<string, string> = { ipuli: "Ipuli", wb: "World Boss" };
export const CONDITIONS: Record<string, string> = { perles: "Perles", conso: "Consommables", meubles: "Meubles" };

/** Même seuil que `MES_VIEILLE` du builder : au-delà, la pièce, le +N ou le prestige
 *  ont bougé, et le chiffre ne dit plus ce que le stuff fait. */
export const MESURE_VIEILLE_MS = 30 * 86_400_000;

export type Mesures = {
  role: RoleMesure | null;
  v: Record<string, number>;
  poudres: string[];
  buffs: string[];
  cond: string[];
  /** Date des CHIFFRES (ms), pas d'une case cochée. */
  mesureLe: number | null;
  /** Verdict du builder : `null` = stuff vide, rien à exiger. */
  complet: boolean | null;
};

const objet = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
const cochees = (x: unknown) => Object.entries(objet(x)).filter(([, v]) => v === true).map(([k]) => k);

/** Ce que la colonne JSON contient, borné à ce qu'on sait afficher. Rien de lisible → null. */
export function lireMesures(json: unknown): Mesures | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const m = json as Record<string, unknown>;
  const v: Record<string, number> = {};
  for (const [k, n] of Object.entries(objet(m.v))) if (typeof n === "number" && Number.isFinite(n) && n > 0) v[k] = n;
  const role = m.role === "dps" || m.role === "offtank" || m.role === "tank" ? m.role : null;
  return {
    role, v,
    poudres: cochees(m.poudres), buffs: cochees(m.buffs), cond: cochees(m.cond),
    mesureLe: typeof m.mesureLe === "number" && m.mesureLe > 0 ? m.mesureLe : null,
    complet: typeof m.complet === "boolean" ? m.complet : null,
  };
}

/** Les colonnes d'équipement que /api/characters/sync remplit — vides quand rien n'est porté. */
export type StuffBrut = { mesures?: unknown; weapon?: unknown; armor?: unknown; jewelry?: unknown; pets?: unknown; cards?: unknown };

/**
 * UN STUFF VIDE N'EST PAS UN BUILD. Chaque perso naît dans le builder avec trois
 * stuffs (DPS, Tank, Hybride), et la synchro les envoie tous : compter les lignes
 * de GearProfile faisait passer pour « équipé » un perso qui n'a jamais porté une
 * pièce. Le verdict du builder fait foi quand il existe (`complet: null` = vide) ;
 * sans lui (stuff synchronisé avant les mesures), on regarde les pièces.
 */
export function stuffVide(g: StuffBrut): boolean {
  const m = lireMesures(g.mesures);
  if (m) return m.complet === null;
  return [g.weapon, g.armor, g.jewelry, g.pets, g.cards].every((x) => !x || Object.keys(objet(x)).length === 0);
}

export function etatStuff(g: StuffBrut, maintenant = Date.now()): EtatStuff {
  if (stuffVide(g)) return "vide";
  const m = lireMesures(g.mesures);
  // Pas de mesures du tout = synchronisé avant qu'elles existent : à renseigner.
  if (!m || m.complet !== true) return "a-renseigner";
  if (m.mesureLe && maintenant - m.mesureLe > MESURE_VIEILLE_MS) return "a-remesurer";
  return "complet";
}

/** « Arcaniste », « Envoûteur » — depuis l'enum de la base comme depuis le nom du builder. */
export const nomClasse = (c: string) => findClass(c)?.label ?? c.charAt(0) + c.slice(1).toLowerCase();
const cleClasse = (c: string) => findClass(c)?.key ?? c;

/** Les rôles qu'une classe peut tenir — `mesRoles` du builder. */
export function rolesDeClasse(classe: string): RoleMesure[] {
  const k = cleClasse(classe);
  const r: RoleMesure[] = ["dps"];
  if (k === "Primat") r.push("offtank");
  if (k === "Primat" || k === "Templier" || k === "Chanoine") r.push("tank");
  return r;
}

/**
 * Le rôle d'un stuff : celui des mesures, sinon celui que le builder DÉDUIT du nom
 * (`mesRole`). Les stuffs synchronisés avant les mesures n'en portent aucun, et
 * s'appellent déjà « DPS », « Tank » ou « Off Tank ».
 */
export function roleDuStuff(nom: string, classe: string, m: Mesures | null): RoleMesure {
  const ok = rolesDeClasse(classe);
  if (m?.role && ok.includes(m.role)) return m.role;
  const n = nom.toLowerCase();
  if ((n.includes("off") || n.includes("hybrid")) && ok.includes("offtank")) return "offtank";
  if (n.includes("tank") && ok.includes("tank")) return "tank";
  return "dps";
}

/**
 * Les chiffres que la classe et le rôle exigent — recopie de `mesChamps` du builder,
 * pour les NOMMER à l'écran. Si la règle change là-bas, elle change ici.
 *
 * LE PRIMAT, CAS À PART (Maxime, 2026-10-21) : l'Off tank déclare ses PV en sceptre,
 * et ses dégâts S'IL frappe aussi (facultatif) ; le Tank fait office d'Off tank PUIS de
 * Tank, il déclare ses PV en poing ET en sceptre (`pvSceptre`). La recopie n'avait pas
 * suivi : le staff ne voyait pas les PV en sceptre d'un Primat Tank.
 */
export function champsMesures(classe: string, role: RoleMesure): { clef: string; libelle: string; facultatif?: true }[] {
  const k = cleClasse(classe);
  if (k === "Primat" && role === "offtank") {
    return [{ clef: "pv", libelle: "PV en sceptre" }, { clef: "boulette", libelle: "Dégâts par Boulette", facultatif: true }, { clef: "dps", libelle: "DPS/s", facultatif: true }];
  }
  if (k === "Primat" && role === "tank") return [{ clef: "pv", libelle: "PV en poing" }, { clef: "pvSceptre", libelle: "PV en sceptre" }];
  if (role === "dps") {
    if (k === "Arcaniste") return [{ clef: "bulle", libelle: "Dégâts par Bulle" }, { clef: "dps", libelle: "DPS/s" }];
    if (k === "Envouteur" || k === "Primat") return [{ clef: "boulette", libelle: "Dégâts par Boulette" }, { clef: "dps", libelle: "DPS/s" }];
    return [{ clef: "dpsMin", libelle: "DPS/s min." }, { clef: "dpsMax", libelle: "DPS/s max." }];
  }
  if (role === "offtank") return [{ clef: "pv", libelle: "PV en sceptre" }];
  return [{ clef: "pv", libelle: k === "Templier" ? "PV en doloire" : "PV en poing" }];
}

/**
 * LE CHIFFRE QUI CLASSE, dans une même classe et un même rôle — jamais d'une classe
 * à l'autre : une Bulle d'Arcaniste et un DPS de Spadassin ne se comparent pas.
 * DPS/s quand la classe en mesure un seul ; le MAXIMUM quand elle mesure un minimum et
 * un maximum ; les PV pour un tank. C'est cette règle que dit la page.
 */
export function chiffreDeTri(classe: string, role: RoleMesure, v: Record<string, number>): number {
  if (role !== "dps") return v.pv ?? 0;
  const champs = champsMesures(classe, role).map((c) => c.clef);
  return champs.includes("dpsMax") ? v.dpsMax ?? 0 : v.dps ?? 0;
}

/* La forme courte (« 9,4 M », « 850 k ») n'est plus ici : elle vit dans lib/recensement.ts
   (`chiffreCourt`), port à l'identique de `mesCourt` du builder. Ce fichier en portait une
   seconde, écrite avec toLocaleString, qui ne disait pas toujours la même chose que le
   builder (« 1 234,5 M » contre « 1234,5 M ») : un même chiffre se lisait de deux façons
   selon la page. Une seule fonction, et le recensement ne peut pas l'importer d'ici sans
   faire une boucle d'imports (il lit lui-même ce module). */
