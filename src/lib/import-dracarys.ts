/**
 * LA REPRISE DE L'HISTORIQUE DU BOT PYTHON (SPEC-CHAMBRES-RECENSEMENT §8.10 ; lot 10) — ce que
 * `scripts/importer-dracarys.ts` tire du fichier `data/data_chambre.json` du bot de l'ami (le
 * modèle Dracarys), quand Maxime l'a : les débriefs PUBLIÉS (`debriefs`) et les participations
 * des Chambres clôturées (`historique`). Sans ce fichier, on démarre à vide.
 *
 * Module PUR, comme lib/chambres : ni Prisma, ni fichier. Le script lit le fichier et la base,
 * puis lui demande quoi écrire ; les vérifications (scripts/verifier-seances.ts) l'appellent sur
 * des objets écrits à la main. Le modèle n'est jamais exécuté : sa forme de données est relue
 * dans bot.py (`load_data`, `migrer`, `ClotureView.valider`, `resume_debrief`).
 *
 * La forme du fichier (bot.py:333-367, 1410-1418, 2012-2013, 2202) :
 *   { recensement: { <uid>: { persos: { <clé>: { pseudo, classe, … } } } },
 *     chambres:    { <id du message d'inscription>: { date: "18/10/2026 21h", inscrits: { <uid>: [{ poste, perso }] },
 *                    repartition: { phase1: { c3: <uid> }, jumeaux: { <uid>: "rouge_mag" } }, terminee } },
 *     historique:  [{ chambre, date, le: ISO, par, participants: [uid], absents: [uid], lignes: [texte] }],
 *     debriefs:    [{ chambre, date, etapes: { "1.1": { statut, chrono, remarque } }, total, a_retenir, resultat }] }
 *
 * Trois précisions de la spec (contre-examen du §8.10) :
 * - la date est un texte libre : on la lit comme `chambres_du_jour` (bot.py:1528-1535) ; l'année
 *   absente se déduit de l'instant de la Chambre (l'id du message, un « snowflake » Discord, ou
 *   la date de clôture) ; seuls les mercredis et dimanches sont gardés (la clé `cs_…_mer|dim`),
 *   le reste est LISTÉ, jamais avalé en silence ;
 * - les salles `c1`…`c10` deviennent `s1`…`s10` ; `a11` et `a12` ne changent pas ;
 * - le fichier doit venir du serveur GENESIS : le script refuse celui dont AUCUN uid ne
 *   correspond à un compte (le même bot a d'abord servi Dracarys).
 */
import { NOMS_CLASSES, TYPE_DPS, dateValide, jourDeDate, memeValeur, partiesParis, type DetailsParticipant } from "@/lib/evenements";
import { SOURCE_DRACARYS, estPlace, lireDebrief, lireDebriefImporte, planImport, roleDe, type DebriefImporte, type PlanImport, type Place } from "@/lib/chambres";

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const texte = (v: unknown) => (typeof v === "string" ? v : "");

/** Les étapes et les phases du débrief du modèle (bot.py:1753-1760) : ce sont aussi les nôtres
 *  par défaut (décision 7 de Maxime). Recopiées ici : une séance importée garde la liste sur
 *  laquelle elle a été débriefée, même si le paramétrage change un jour. */
export const ETAPES_DRACARYS: [code: string, label: string, phase: string][] = [
  ["1.1", "480 monstres", "1"], ["1.2", "12 Asuras", "1"], ["1.3", "3 Malphas", "1"],
  ["2.1", "100 soldats", "2"], ["2.2", "Jumeaux", "2"],
  ["3.1", "100 araignées", "3"], ["3.2", "Troll 1 (Dra'Zhul gauche)", "3"], ["3.3", "Troll 2 (Dra'Zhul droite)", "3"], ["3.4", "Araignée (Nyzarra)", "3"],
  ["4.1", "100 araignées", "4"], ["4.2", "Mini-soldats (escalier)", "4"], ["4.3", "Double boss Gor'Thar", "4"], ["5", "Boss final : Aatrox", "5"],
];
export const PHASES_DRACARYS: Record<string, string> = {
  "1": "Phase 1 — Chambres", "2": "Phase 2 — Couloir", "3": "Phase 3 — Araignée", "4": "Phase 4 — Escalier", "5": "Phase 5 — Boss final",
};

/** Les classes du modèle → nos clés (§2.1). */
export const CLASSES_DRACARYS: Record<string, string> = {
  Arcaniste: "Arcaniste", Sorcier: "Envouteur", Chevalier: "Templier", Spadassin: "Spadassin",
  "Yoyo Jester": "Sylphide", "Arbalétrier": "Arbaletrier", Primat: "Primat",
};
/** Les postes du modèle (bot.py:313-323) : leur libellé (pour relire une ligne d'historique), leur
 *  classe, et s'ils tankent. */
export const POSTES_DRACARYS: Record<string, { label: string; classe: string; tank: boolean }> = {
  arca: { label: "Arcaniste", classe: "Arcaniste", tank: false },
  soso: { label: "Sorcier", classe: "Sorcier", tank: false },
  cheva_dps: { label: "Chevalier DPS", classe: "Chevalier", tank: false },
  cheva_tank: { label: "Chevalier Tank", classe: "Chevalier", tank: true },
  spada: { label: "Spadassin", classe: "Spadassin", tank: false },
  yj: { label: "Yoyo Jester", classe: "Yoyo Jester", tank: false },
  arba: { label: "Arbalétrier", classe: "Arbalétrier", tank: false },
  prima_dps: { label: "Primat DPS", classe: "Primat", tank: false },
  prima_tank: { label: "Primat Tank", classe: "Primat", tank: true },
};

export { SOURCE_DRACARYS };

/** L'instant d'un id Discord (« snowflake ») : ses 42 premiers bits, depuis le 1er janvier 2015. */
export function instantSnowflake(id: unknown): number | null {
  if (typeof id !== "string" || !/^\d{15,20}$/.test(id)) return null;
  return Number((BigInt(id) >> 22n) + 1420070400000n);
}

/**
 * « 18/10/2026 21h », « 22/10 », « Mercredi 22/10/26 » → « 2026-10-22 » (`chambres_du_jour`,
 * bot.py:1528-1535). Sans année, celle de `repli` (l'instant de la Chambre), à six mois près :
 * une Chambre ouverte fin décembre pour le 3 janvier tombe l'année suivante. Null : illisible.
 */
export function lireDateDracarys(t: string, repli: number | null): string | null {
  const m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(t ?? "");
  if (!m) return null;
  const j = Number(m[1]), mo = Number(m[2]);
  let annee = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : null;
  if (annee === null) {
    if (repli === null) return null;
    const base = Number(partiesParis(new Date(repli)).date.slice(0, 4));
    const ecart = (a: number) => Date.UTC(a, mo - 1, j) - repli;
    annee = base;
    if (ecart(base) > 183 * 864e5) annee = base - 1;
    else if (ecart(base) < -183 * 864e5) annee = base + 1;
  }
  const date = `${annee}-${String(mo).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
  return dateValide(date) ? date : null;
}

/** Les salles du modèle : `c3` → `s3` ; `a11`, `a12` inchangées ; le reste n'est pas une salle. */
export const salleDracarys = (s: string) => (/^c([1-9]|10)$/.test(s) ? `s${s.slice(1)}` : /^a1[12]$/.test(s) ? s : null);

/** Une ligne de participation tirée du fichier, avant de retrouver le compte de son uid. */
export type LigneImport = { uid: string; pseudo: string; classe: string; present: boolean; details: DetailsParticipant };
export type ClotureImport = { le: number; lignes: LigneImport[] };
export type SeanceDracarys = {
  cle: string; date: string; creneau: "mer" | "dim";
  /** La date telle que le modèle l'avait écrite (« 18/10/2026 21h »). */
  origine: string;
  debrief: DebriefImporte | null;
  cloture: ClotureImport | null;
};
export type LectureDracarys = {
  seances: SeanceDracarys[];
  /** Ce qui n'est pas importé, et pourquoi (pas un mercredi ni un dimanche, date illisible…). */
  ecartees: string[];
  /** Ce qui est importé avec une réserve (un joueur sans perso connu, une étape inconnue…). */
  avertissements: string[];
  /** Tous les uid Discord du fichier : le script vérifie qu'au moins un est un compte GENESIS. */
  uids: string[];
};

type Inscription = { poste: string; perso: string };

/** `migrer` (bot.py:340-355) : une inscription en ancien format (une clé de poste, ou un objet
 *  seul) devient une liste de { poste, perso }. */
function inscriptionsDe(v: unknown, persos: Record<string, unknown>[]): Inscription[] {
  const une = (x: unknown): Inscription | null => {
    if (typeof x === "string") {
      const classe = POSTES_DRACARYS[x]?.classe;
      const p = persos.find((q) => q.classe === classe);
      return { poste: x, perso: texte(p?.pseudo) || "?" };
    }
    const o = obj(x);
    return typeof o.poste === "string" && typeof o.perso === "string" ? { poste: o.poste, perso: o.perso } : null;
  };
  const liste = Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
  return liste.map(une).filter((x): x is Inscription => !!x && x.perso !== "?" && !!x.perso.trim());
}

/** Une ligne d'historique du modèle (`ligne_participant`, bot.py:1359-1369) :
 *  « <@123> — Kaelis (Arcaniste), Mira (Arcaniste) · 🌳 Ch.3 · … » → le premier perso et son poste. */
function lireLigne(l: string): { uid: string; perso: string; poste: string | null } | null {
  const m = /^<@!?(\d{15,20})>\s+—\s+([^(·,]+?)\s*\(([^)]+)\)/.exec(l);
  if (!m) return null;
  const poste = Object.entries(POSTES_DRACARYS).find(([, p]) => p.label === m[3].trim())?.[0] ?? null;
  return { uid: m[1], perso: m[2].trim(), poste };
}

/**
 * LE FICHIER LU : une séance par clé (mercredi ou dimanche), avec son débrief publié et sa
 * clôture. Deux Chambres du modèle sur la même date (rouverte à la main) : le débrief et la
 * clôture les plus récents l'emportent, et c'est dit. Jamais d'exception : un fichier qui n'a ni
 * chambres, ni historique, ni débriefs est refusé avec sa raison.
 */
export function lireDracarys(json: unknown): { ok: true; l: LectureDracarys } | { ok: false; erreurs: string[] } {
  const o = obj(json);
  const chambres = obj(o.chambres), recensement = obj(o.recensement);
  const historique = Array.isArray(o.historique) ? o.historique.map(obj) : [];
  const debriefs = Array.isArray(o.debriefs) ? o.debriefs.map(obj) : [];
  if (!Object.keys(chambres).length && !historique.length && !debriefs.length) {
    return { ok: false, erreurs: ["Ce n'est pas un data_chambre.json du bot Python : ni chambres, ni historique, ni débriefs."] };
  }
  const ecartees: string[] = [], avertissements: string[] = [];
  const uids = new Set<string>();
  for (const u of Object.keys(recensement)) if (/^\d{15,20}$/.test(u)) uids.add(u);
  const persosDe = (uid: string) => Object.values(obj(obj(recensement[uid]).persos)).map(obj);

  const seances = new Map<string, SeanceDracarys & { _debriefLe: number; _clotureLe: number }>();
  /** La séance d'une entrée : sa clé, ou null (écartée, et dit pourquoi). */
  const seanceDe = (quoi: string, dateTexte: string, repli: number | null) => {
    const date = lireDateDracarys(dateTexte, repli);
    if (!date) { ecartees.push(`${quoi} « ${dateTexte || "sans date"} » : date illisible (JJ/MM attendu).`); return null; }
    const jour = jourDeDate(date);
    if (jour !== 3 && jour !== 0) { ecartees.push(`${quoi} du ${date} (« ${dateTexte} ») : ni un mercredi, ni un dimanche — pas une séance de Chambre chez nous.`); return null; }
    const creneau = jour === 3 ? "mer" : "dim";
    const cle = `cs_${date}_${creneau}`;
    if (!seances.has(cle)) seances.set(cle, { cle, date, creneau, origine: dateTexte, debrief: null, cloture: null, _debriefLe: 0, _clotureLe: 0 });
    return seances.get(cle)!;
  };

  /* Les clôtures : `historique` (ClotureView.valider, bot.py:1410-1418). */
  for (const h of historique) {
    const mid = texte(h.chambre), ch = obj(chambres[mid]);
    const dateTexte = texte(h.date) || texte(ch.date);
    const le = Date.parse(texte(h.le));
    const s = seanceDe("Clôture", dateTexte, Number.isFinite(le) ? le : instantSnowflake(mid));
    if (!s) continue;
    const quand = Number.isFinite(le) ? le : (instantSnowflake(mid) ?? 0);
    if (s.cloture && s._clotureLe > quand) { avertissements.push(`${s.date} : deux clôtures dans le fichier, la plus récente est gardée.`); continue; }
    if (s.cloture) avertissements.push(`${s.date} : deux clôtures dans le fichier, la plus récente est gardée.`);
    const rep = obj(ch.repartition), inscrits = obj(ch.inscrits);
    const parLigne = new Map((Array.isArray(h.lignes) ? h.lignes : []).map((l) => lireLigne(texte(l))).filter((x): x is NonNullable<ReturnType<typeof lireLigne>> => !!x).map((x) => [x.uid, x]));
    const lignes: LigneImport[] = [];
    const vus = new Set<string>();
    const ajouter = (uid: unknown, present: boolean) => {
      if (typeof uid !== "string" || !/^\d{15,20}$/.test(uid)) return;
      uids.add(uid);
      const persos = persosDe(uid);
      const ins = inscriptionsDe(inscrits[uid], persos)[0];
      const ligne = parLigne.get(uid);
      const unSeul = persos.length === 1 ? persos[0] : null;
      const perso = ins?.perso ?? ligne?.perso ?? texte(unSeul?.pseudo);
      const poste = ins?.poste ?? ligne?.poste ?? null;
      const brute = (poste && POSTES_DRACARYS[poste]?.classe) || texte(persos.find((p) => texte(p.pseudo).toLowerCase() === perso.toLowerCase())?.classe) || texte(unSeul?.classe);
      const classe = CLASSES_DRACARYS[brute];
      if (!perso || !classe) { avertissements.push(`${s.date} : le joueur <@${uid}> n'a ni perso ni classe lisibles — sa ligne n'est pas importée.`); return; }
      if (vus.has(perso.toLowerCase())) return;
      vus.add(perso.toLowerCase());
      const salles = Object.entries(obj(rep.phase1)).filter(([, u]) => u === uid).map(([c]) => salleDracarys(c)).filter((x): x is string => !!x);
      // L'ancien format `vert_dps` (bot.py:771-773) : magique ou physique selon la classe.
      const brutJ = texte(obj(rep.jumeaux)[uid]);
      const jumeau = (estPlace(brutJ) ? brutJ : /^(vert|rouge)_dps$/.test(brutJ) ? `${brutJ.split("_")[0]}_${TYPE_DPS[classe] ?? "phy"}` : null) as Place | null;
      const tank = !!(poste && POSTES_DRACARYS[poste]?.tank);
      lignes.push({
        uid, pseudo: perso.trim().slice(0, 40), classe, present,
        details: {
          poste: `${NOMS_CLASSES[classe] ?? classe}${tank ? " tank" : ""}`,
          role: jumeau ? roleDe(jumeau) : tank ? "tank" : (TYPE_DPS[classe] ?? "phy"),
          chiffres: [], enLigne: "", salles, jumeau,
        },
      });
    };
    for (const u of Array.isArray(h.participants) ? h.participants : []) ajouter(u, true);
    for (const u of Array.isArray(h.absents) ? h.absents : []) ajouter(u, false);
    s.cloture = { le: quand, lignes };
    s._clotureLe = quand;
  }

  /* Les débriefs PUBLIÉS : `debriefs` (`resume_debrief`, bot.py:2066-2071). Le résumé passe par
     la même lecture que la retranscription du 18/10 (`lireDebriefImporte`) : mêmes refus, mot pour
     mot ; seule la source change. */
  for (const d of debriefs) {
    const mid = texte(d.chambre), ch = obj(chambres[mid]);
    const dateTexte = texte(d.date) || texte(ch.date);
    const s = seanceDe("Débrief", dateTexte, instantSnowflake(mid));
    if (!s) continue;
    const etapes = obj(d.etapes);
    const inconnues = Object.keys(etapes).filter((c) => !ETAPES_DRACARYS.some(([x]) => x === c));
    if (inconnues.length) avertissements.push(`${s.date} : étape${inconnues.length > 1 ? "s" : ""} inconnue${inconnues.length > 1 ? "s" : ""} ${inconnues.join(", ")} — non importée${inconnues.length > 1 ? "s" : ""}.`);
    const presents = s.cloture?.lignes.filter((l) => l.present).length ?? null;
    const lu = lireDebriefImporte({
      evenement: "cs", date: s.date, creneau: s.creneau, titre: `Retour Chambre — ${dateTexte}`.slice(0, 80),
      phases: PHASES_DRACARYS,
      etapes: ETAPES_DRACARYS.map(([code, label, phase]) => {
        const e = obj(etapes[code]);
        const chrono = typeof e.chrono === "number" && Number.isFinite(e.chrono) ? Math.round(e.chrono) : null;
        return { code, label, phase, statut: e.statut ?? null, chrono, remarque: typeof e.remarque === "string" ? e.remarque : "" };
      }),
      resultat: d.resultat ?? null, aRetenir: typeof d.a_retenir === "string" ? d.a_retenir : "",
      joueurs: presents && presents >= 1 ? presents : null,
    });
    if (!lu.ok) { ecartees.push(`Débrief du ${s.date} : ${lu.erreurs.join(" ")}`); continue; }
    const quand = instantSnowflake(mid) ?? 0;
    if (s.debrief) {
      avertissements.push(`${s.date} : deux débriefs dans le fichier, le dernier publié est gardé.`);
      if (s._debriefLe > quand) continue;
    }
    s.debrief = { ...lu.d, source: `${SOURCE_DRACARYS} (« ${dateTexte} »)`.slice(0, 200) };
    s._debriefLe = quand;
  }

  return {
    ok: true,
    l: {
      seances: [...seances.values()].sort((a, b) => a.date.localeCompare(b.date)).map(({ _debriefLe: _d, _clotureLe: _c, ...x }) => x),
      ecartees, avertissements, uids: [...uids],
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   CE QU'IL FAUT ÉCRIRE — IDEMPOTENT par la clé de la séance : relancé, l'import ne double rien
   et ne réécrit rien d'identique ; il ne touche jamais une séance débriefée, clôturée ou
   annulée sur le site.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Le débrief : `planImport` (lib/chambres, celui du 18/10), avec une règle de plus. Une séance
 * déjà importée d'une AUTRE source (la retranscription de l'image du 18/10) au contenu identique
 * — mêmes étapes, statuts, chronos, remarques, résultat, à retenir — n'est pas réécrite : seule
 * la mention de la source changerait, et deux imports relancés tour à tour se contrediraient.
 * Au contenu différent, le fichier du bot (la donnée d'origine, chronos compris) l'emporte sur la
 * retranscription d'une image.
 */
export function planDebriefDracarys(
  x: Parameters<typeof planImport>[0], d: DebriefImporte, now: number,
): PlanImport {
  const lu = lireDebrief(x?.debrief);
  if (x && lu.importe && lu.importe.source !== d.source && !x.annulee
    && memeValeur(lu.notes, d.notes) && (x.resultat ?? null) === d.resultat && (x.aRetenir ?? null) === (d.aRetenir || null)) {
    return { quoi: "rien", message: `Le débrief du ${d.date} est déjà importé (${lu.importe.source.slice(0, 60)}…), à l'identique : rien n'a changé.` };
  }
  return planImport(x, d, now);
}

/** Une ligne prête à écrire : le compte de l'uid retrouvé (ou non). */
export type LigneEcrite = { pseudo: string; classe: string; player: string; userId: string | null; present: boolean; details: DetailsParticipant };

/** L'uid Discord devient `User.discordId`, puis `userId` (§8.10). Un uid sans compte garde sa
 *  ligne (le nom du perso reste lisible dans l'historique), sans compte. */
export function lignesAEcrire(c: ClotureImport, comptes: Map<string, { id: string; username: string }>): LigneEcrite[] {
  return c.lignes.map((l) => {
    const u = comptes.get(l.uid);
    return { pseudo: l.pseudo, classe: l.classe, player: u?.username ?? l.pseudo, userId: u?.id ?? null, present: l.present, details: l.details };
  });
}

export const PAR_IMPORT_CLOTURE = "Import";

export type PlanParticipants = { quoi: "ecrire"; clotureAt: Date; message: string } | { quoi: "rien" | "refus"; message: string };

/**
 * La clôture : les lignes de participation REMPLACENT celles d'un import précédent ; jamais celles
 * d'une clôture faite sur le site (`cloturePar` ≠ « Import »), ni sur une séance annulée.
 * Identiques (même perso, même présence, même compte) : rien.
 */
export function planParticipants(
  x: { annulee: boolean; clotureAt: Date | null; cloturePar: string | null; participants: { pseudo: string; present: boolean | null; userId: string | null }[] } | null,
  lignes: LigneEcrite[], le: number, date: string,
): PlanParticipants {
  if (!lignes.length) return { quoi: "rien", message: `Clôture du ${date} : personne à importer.` };
  if (x?.annulee) return { quoi: "refus", message: `La séance du ${date} est annulée sur le site : ses participations ne sont pas importées.` };
  if (x?.clotureAt && x.cloturePar !== PAR_IMPORT_CLOTURE) {
    return { quoi: "refus", message: `La séance du ${date} a été clôturée sur le site${x.cloturePar ? ` par ${x.cloturePar}` : ""} : l'import n'y touche pas.` };
  }
  const cle = (l: { pseudo: string; present: boolean | null; userId: string | null }) => `${l.pseudo.toLowerCase()}|${l.present}|${l.userId ?? ""}`;
  const avant = (x?.participants ?? []).map(cle).sort(), apres = lignes.map(cle).sort();
  if (x?.clotureAt && memeValeur(avant, apres)) return { quoi: "rien", message: `Clôture du ${date} déjà importée, à l'identique.` };
  const n = lignes.filter((l) => l.present).length;
  return {
    quoi: "ecrire", clotureAt: new Date(le),
    message: `Clôture du ${date} ${x?.clotureAt ? "réimportée" : "importée"} : ${n} présent${n > 1 ? "s" : ""}, ${lignes.length - n} absent${lignes.length - n > 1 ? "s" : ""}.`,
  };
}
