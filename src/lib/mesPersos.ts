import { etatStuff, lireMesures, roleDuStuff, stuffVide, type EtatStuff, type RoleMesure, type StuffBrut } from "@/lib/mesures";

/**
 * MES PERSONNAGES, TELS QUE L'AIRBUILDER LES A PUBLIÉS — la lecture commune de
 * l'accueil (« Mes personnages », en tête pour qui en a) et de la page /personnages.
 *
 * L'AirBuilder est la SEULE source (demande de Maxime du 2026-10-21) : il publie ses
 * persos par /api/characters/sync, qui efface et recrée tout le compte à chaque
 * changement. La page « Mes personnages » écrivait à côté, dans la même table, et ce
 * qu'elle faisait était défait au changement suivant du builder. Ce module ne fait donc
 * que LIRE ce que GET /api/characters renvoie, et dire où rouvrir chaque chose dans le
 * builder.
 *
 * Module pur, sans Prisma ni Next : il tourne dans le navigateur, comme lib/mesures dont
 * il reprend les verdicts (« Mesures manquantes », « À remesurer », « Complet »).
 */

/** La ligne telle que GET /api/characters la rend — seulement ce qu'on lit ici. */
export type PersoBrut = {
  id: string; name: string; class: string; level: number; prestige: number; isMain: boolean;
  sex?: string | null;
  gearProfiles: (StuffBrut & { id: string; name: string })[];
};

export type StuffVue = {
  id: string;
  /** Sa place dans le builder : la synchro crée les stuffs dans l'ordre du builder, et
   *  la route les rend dans l'ordre de création. C'est ce rang que vise le lien. */
  index: number;
  nom: string;
  role: RoleMesure;
  etat: EtatStuff;
  /** Les chiffres déclarés, pour les nommer (MesuresStuff.chiffresEnClair). */
  v: Record<string, number>;
  mesureLe: number | null;
};

export type PersoVue = {
  id: string; nom: string; classe: string; niveau: number; prestige: number;
  principal: boolean; sexe: "G" | "F";
  /** TOUS les stuffs, vides compris : c'est le reflet du builder, rien d'autre. */
  stuffs: StuffVue[];
};

export function versVue(brut: PersoBrut[], maintenant = Date.now()): PersoVue[] {
  return brut.map((c) => ({
    id: c.id, nom: c.name, classe: c.class, niveau: c.level, prestige: c.prestige, principal: c.isMain,
    sexe: c.sex === "F" ? "F" : "G",
    stuffs: c.gearProfiles.map((g, index) => {
      const m = lireMesures(g.mesures);
      return {
        id: g.id, index, nom: g.name, role: roleDuStuff(g.name, c.class, m),
        etat: stuffVide(g) ? "vide" : etatStuff(g, maintenant), v: m?.v ?? {}, mesureLe: m?.mesureLe ?? null,
      };
    }),
  }));
}

/** Les stuffs montés : un stuff vide n'en est pas un (chaque perso naît avec trois). */
export const stuffsMontes = (p: PersoVue) => p.stuffs.filter((s) => s.etat !== "vide");

/** Ce qui attend le joueur : les mesures manquantes et celles à refaire. */
export const aMesurer = (persos: PersoVue[]) =>
  persos.reduce((n, p) => n + p.stuffs.filter((s) => s.etat === "a-renseigner" || s.etat === "a-remesurer").length, 0);

/**
 * ATTENDRE LA PUBLICATION EN VOL DE L'AIRBUILDER, avant de lire /api/characters.
 *
 * Le builder publie 1,5 s après le dernier geste, et tout de suite quand on le quitte
 * (vgPublierMaintenant, public/airbuilder/airbuilder.js) ; il laisse la promesse de cet
 * envoi sur `window.__vgPublication`. Le moteur reste chargé d'une page à l'autre :
 * arriver ici depuis le builder lisait donc les persos AVANT la synchro, et un perso
 * rendu principal ou supprimé à l'instant n'apparaissait pas — « Mes personnages »
 * n'était plus le reflet du builder. Plafonnée à 5 s : un réseau qui traîne ne
 * bloque pas la page, il la laisse lire ce qu'il y a.
 */
export function apresPublication(): Promise<void> {
  const p = typeof window === "undefined"
    ? undefined
    : (window as unknown as { __vgPublication?: Promise<unknown> }).__vgPublication;
  if (!p) return Promise.resolve();
  return Promise.race([
    Promise.resolve(p).then(() => undefined, () => undefined),
    new Promise<void>((r) => setTimeout(r, 5000)),
  ]);
}

/**
 * LE LIEN PROFOND DE L'AIRBUILDER — `/builder?perso=<nom>&stuff=<rang>`. Il ouvre ce
 * perso et ce stuff, sans rien créer ni modifier (vgOuvrirDepuisURL, dans
 * public/airbuilder/airbuilder.js). Le perso se désigne par son NOM, comme dans le
 * builder ; le stuff par son RANG, parce que deux stuffs peuvent porter le même nom
 * (« Dupliquer » en fabrique).
 */
export function lienBuilder(perso: string, stuff?: number): string {
  const q = `/builder?perso=${encodeURIComponent(perso)}`;
  return stuff === undefined ? q : `${q}&stuff=${stuff}`;
}
