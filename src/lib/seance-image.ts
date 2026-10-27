/**
 * L'IMAGE DU DÉBRIEF (SPEC-CHAMBRES-RECENSEMENT §4.11, §8.6 ; lot 7) — le tableau que le bot
 * publie dans le salon des débriefs, sous l'embed M7, et que la route 14 montre au staff avant
 * de publier. C'est la reprise de `image_debrief` (tableau_debrief.py:45-113), aux couleurs de
 * GENESIS et lisible sur un téléphone.
 *
 * LA MISE EN PAGE reprend celle du modèle — et de l'image que Maxime a fournie (le débrief du
 * 18/10/2026) : la pastille GAGNÉ / PERDU en haut à droite, une carte par étape, le statut en
 * pastille, le chrono et son écart. Ce qui change, et pourquoi :
 *  - le texte est presque deux fois plus grand (26 à 30 px au lieu de 19 à 22 px, pour 1 080 px
 *    de large au lieu de 1 200) : sur un téléphone, celui du modèle tombe autour de 6 px ;
 *  - le TEMPS TOTAL est en haut, dans un bandeau : c'est le chiffre qu'on cherche ;
 *  - la REMARQUE a sa propre ligne, sous l'étape, sur toute la largeur de la carte (§4.11),
 *    5 lignes au plus, puis « … ». Dans une colonne de 290 px, comme chez le modèle, une remarque
 *    de 300 signes (le maximum permis) demandait 13 lignes et se coupait aux deux tiers ; sur
 *    toute la largeur, elle tient entière, « · 2 vidéos sur le site » compris ;
 *  - les monstres de chaque étape sont écrits sous son nom (décision 8) ;
 *  - l'analyse, « à retenir », puis les JOUEURS de la séance et leurs chiffres DÉCLARÉS, datés,
 *    avec « à remesurer » (décision 9 : jamais comme des valeurs vérifiées) — seulement si le
 *    paramétrage les montre dans Discord et que le salon est fermé à @everyone.
 * Aucun émoji : l'image Docker n'a pas de police d'émojis, Pango les remplacerait par des carrés.
 * Ils restent dans l'embed.
 *
 * LE RENDU : sharp. Les formes (fond, cartes, pastilles, filets) sont un SVG ; le texte est rendu
 * morceau par morceau par Pango (l'entrée `text` de sharp) — lui seul sait couper un paragraphe à
 * une largeur donnée — puis posé par `composite()`. Tout texte saisi est ÉCHAPPÉ avant d'entrer
 * dans le balisage : une remarque « <b> & co » s'affiche telle quelle, et n'injecte rien.
 *
 * LES POLICES (piège n° 8) : Cinzel et Athiti, de `public/fonts`, chargées par `fontfile` — et
 * installées dans l'image Docker (Dockerfile : fontconfig, puis /usr/local/share/fonts/genesis).
 * Sur macOS, Pango passe par CoreText et ignore les deux : tout sortait en Helvetica, sans erreur.
 * `PANGOCAIRO_BACKEND=fc` le fait passer par fontconfig, comme sous Linux (vérifié le
 * 2026-10-21 avec sharp 0.34.5) : posé ici avant le premier texte, l'aperçu local est donc fidèle.
 *
 * Ce module n'importe pas `server-only` (piège n° 7) : le bot l'importe sous tsx.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { PrismaClient, SeanceGuilde, SeanceParticipant } from "@prisma/client";
import { fmtDuree, type AnalyseDebrief, type Ecart, type IssueSeance, type StatutEtape } from "@/lib/chambres";
import { NOMS_CLASSES, dateLongue, derouleDe, type ChiffreFige, type ParametresCS } from "@/lib/evenements";
import { chiffreCourt } from "@/lib/recensement";
import { vueDebrief, type VueDebrief } from "@/lib/seances-serveur";

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES COULEURS ET LES MESURES (§4.11)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** La charte GENESIS : noir, anthracite, crimson, or, ivoire — plus le texte doux et l'or clair
 *  du site (`--gn-texte-doux`, `--gn-or-clair`). Le vert dit « bien » et « gagné » comme sur le
 *  site (l'onglet Bilans) et dans la barre des embeds (0x2F8F5B) : sans lui, Bien et Mal ne se
 *  distingueraient plus que par le mot. */
export const COULEURS = {
  noir: "#08080C", anthracite: "#15151D", crimson: "#A6192E", or: "#C69A55", ivoire: "#F2EDE5",
  orClair: "#E6C48A", texte: "#E6DFD4", doux: "#A39C93", vide: "#2A2A33",
  vert: "#2F8F5B", plusRapide: "#4ADE80", plusLent: "#E35D6F",
} as const;
const C = COULEURS;

/** Les pastilles de statut : Moyen garde un texte sombre sur l'or, comme le modèle sur son
 *  orange (tableau_debrief.py:93). */
export const PASTILLES: Record<StatutEtape | "vide", { fond: string; texte: string; mot: string }> = {
  bien: { fond: C.vert, texte: C.ivoire, mot: "Bien" },
  moyen: { fond: C.or, texte: C.noir, mot: "Moyen" },
  mal: { fond: C.crimson, texte: C.ivoire, mot: "Mal" },
  vide: { fond: C.vide, texte: C.doux, mot: "—" },
};
export const RESULTATS: Record<IssueSeance, { fond: string; mot: string }> = {
  gagne: { fond: C.vert, mot: "GAGNÉ" },
  perdu: { fond: C.crimson, mot: "PERDU" },
};
/** La couleur d'un écart : plus rapide en vert, plus lent en crimson, le même temps en doux. */
export const couleurEcart = (e: Pick<Ecart, "signe">) => (e.signe < 0 ? C.plusRapide : e.signe > 0 ? C.plusLent : C.doux);

export const LARGEUR = 1080;
const ACCENT = 8;
const X0 = ACCENT + 48;
const X1 = LARGEUR - 48;
const CW = X1 - X0;
/** Les colonnes d'une carte d'étape (20 px de côté) : ligne 1, le code sur 64 px, le libellé (et
 *  ses monstres dessous), puis à droite un bloc de 300 px — la pastille du statut, le chrono
 *  aligné à droite et son écart dessous ; ligne 2, la remarque sur toute la largeur (§4.11). */
const BLOC_DROIT = X1 - 20 - 300;
const COL = {
  code: X0 + 20,
  label: X0 + 86, labelL: BLOC_DROIT - 20 - (X0 + 86),
  statut: BLOC_DROIT, statutL: 104,
  chronoD: X1 - 20,
  remarque: X0 + 20, remarqueL: X1 - 20 - (X0 + 20),
};
/** Au-delà, une remarque se termine par « … » : le texte entier est sur le site. Sur toute la
 *  largeur de la carte, une remarque ordinaire de 300 signes (le maximum) tient en 4 lignes ;
 *  5 et non les 4 du §4.11 pour qu'elle tienne ENTIÈRE même chargée de capitales et suivie de
 *  « · 2 vidéos sur le site » (vérifié dans scripts/verifier-seances.ts). */
export const MAX_LIGNES_REMARQUE = 5;
export const MAX_LIGNES_A_RETENIR = 8;

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE TEXTE SAISI, TEL QU'IL ENTRE DANS L'IMAGE
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Les cinq signes du balisage Pango (et du SVG). Un « < » non échappé casse l'image, ou y
 *  injecte du balisage (piège n° 9). */
export const echapperBalisage = (t: string) =>
  String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * Un texte SAISI (remarque, « à retenir », pseudo, libellé du paramétrage) tel qu'il entre dans
 * l'image, AVANT l'échappement : sans émoji (ni Unicode, ni émoji personnalisé `<:nom:id>` du
 * serveur), sans caractère de contrôle, l'espace fine insécable (absente d'Athiti et de Cinzel)
 * remplacée par l'insécable ordinaire, les espaces en trop ramassées.
 */
export function texteImage(t: string): string {
  return String(t ?? "")
    .replace(/<a?:[A-Za-z0-9_]{2,32}:\d{17,20}>/g, "")
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}︎️‍⃣]/gu, "")
    .replace(/ /g, " ")
    .replace(/\t/g, " ")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/[  ]{2,}/g, " ")
    .split("\n").map((l) => l.trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** « vanguardhub.fr/compositions » : l'adresse du site (NEXTAUTH_URL), sans le protocole. */
export function hoteDuSite(url: string | null | undefined): string {
  try { return url ? `${new URL(url).host}/compositions` : ""; } catch { return ""; }
}

/** « 18/10 », à partir d'une date « 2026-10-18 ». */
export const dateCourte = (date: string) => { const [, m, d] = date.split("-"); return d && m ? `${d}/${m}` : date; };
const majuscule = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES DONNÉES DE L'IMAGE — pures, tirées de la vue du débrief (`vueDebrief`)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type LigneImage = {
  code: string; label: string; monstres: string[];
  statut: StatutEtape | null;
  /** Le chrono retenu (la saisie du staff, sinon la mesure du chrono en direct), en secondes. */
  chrono: number | null; saisi: boolean;
  /** L'écart à la séance publiée juste avant, sur le code de l'étape. */
  ecart: Ecart | null;
  remarque: string;
  /** Les vidéos jointes à l'étape (lot 8) : « · 2 vidéos sur le site ». */
  videos: number;
};
export type PhaseImage = { nom: string; lignes: LigneImage[] };
export type JoueurImage = { pseudo: string; classe: string; chiffres: ChiffreFige[] };
export type DonneesImage = {
  titre: string;
  /** « Dimanche 18 octobre 2026 · 10 joueurs · comparé au dimanche 11 octobre » (bot.py:2135). */
  sousTitre: string;
  resultat: IssueSeance | null;
  total: number;
  complet: boolean;
  ecartTotal: Ecart | null;
  /** « 11/10 » : la séance publiée juste avant, celle des écarts. */
  precedent: string | null;
  sansEcart: AnalyseDebrief["sansEcart"];
  record: boolean;
  phases: PhaseImage[];
  plusLongue: AnalyseDebrief["plusLongue"];
  malDeuxFois: AnalyseDebrief["malDeuxFois"];
  aRetenir: string;
  /** Les PRÉSENTS de la clôture ; null : la séance n'est pas clôturée, la liste est inconnue. */
  joueurs: JoueurImage[] | null;
  /** Les chiffres DÉCLARÉS sont montrés : le paramétrage les affiche dans Discord, et le salon est
   *  fermé à @everyone (§8.3, piège n° 22). */
  chiffres: boolean;
  /** « 18/10 » : le jour de la clôture, qui a figé les chiffres. */
  clotureLe: string | null;
  /** « vanguardhub.fr/compositions ». */
  site: string;
};

export const TITRE_IMAGE = "RETOUR CHAMBRE SECRÈTE";

/**
 * Ce que l'image montre d'une séance, tiré de la vue du débrief : son résumé, l'analyse comparée à
 * la séance publiée juste avant, et les joueurs que la clôture a figés. Pure : le bot (M7), la
 * route d'aperçu et le script d'essai passent tous les trois ici.
 *
 * `vue.joueurs` porte déjà les chiffres du paramétrage (`vueDebrief`, `degats`) : l'appelant la
 * calcule avec les chiffres permis dans CE salon. `chiffres` le redit, pour la légende.
 */
export function donneesImage(o: {
  date: string;
  vue: Pick<VueDebrief, "resume" | "analyse" | "joueurs" | "nbJoueurs">;
  phases: Record<string, string>;
  chiffres: boolean;
  site: string;
  clotureAt: number | null;
  /** Les vidéos prêtes, par code d'étape (lot 8). */
  videos?: Record<string, number>;
}): DonneesImage {
  const r = o.vue.resume;
  const a = o.vue.analyse;
  const annee = o.date.slice(0, 4);
  const n = o.vue.nbJoueurs;
  const sousTitre = [
    `${majuscule(dateLongue(o.date))} ${annee}`,
    n ? `${n} joueur${n > 1 ? "s" : ""}` : "",
    a?.precedentLabel ? `comparé au ${a.precedentLabel}` : "",
  ].filter(Boolean).join(" · ");
  const ligne = (l: NonNullable<typeof r>["lignes"][number]): LigneImage => ({
    code: l.etape.code, label: l.etape.label, monstres: l.etape.monstres.map((m) => m.nom).filter(Boolean),
    statut: l.statut, chrono: l.chrono, saisi: l.saisi, ecart: a?.ecarts[l.etape.code] ?? null,
    remarque: l.remarque, videos: o.videos?.[l.etape.code] ?? 0,
  });
  const lignes = r?.lignes ?? [];
  const phases: PhaseImage[] = Object.keys(o.phases).sort()
    .map((k) => ({ nom: o.phases[k], lignes: lignes.filter((l) => l.etape.phase === k).map(ligne) }))
    .filter((p) => p.lignes.length);
  // Les étapes d'une phase que le paramétrage ne nomme plus : elles restent, à la fin.
  const orphelines = lignes.filter((l) => !(l.etape.phase in o.phases));
  if (orphelines.length) phases.push({ nom: "Autres étapes", lignes: orphelines.map(ligne) });
  const cloture = o.clotureAt ? new Date(o.clotureAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }) : null;
  return {
    titre: TITRE_IMAGE, sousTitre,
    resultat: r?.resultat ?? null, total: r?.total ?? 0, complet: r?.complet ?? false,
    ecartTotal: a?.ecartTotal ?? null, precedent: a?.precedent ? dateCourte(a.precedent.date) : null,
    sansEcart: a?.sansEcart ?? null, record: !!a?.record,
    phases,
    plusLongue: a?.plusLongue ?? null, malDeuxFois: a?.malDeuxFois ?? [],
    aRetenir: r?.aRetenir ?? "",
    joueurs: o.clotureAt
      ? o.vue.joueurs.filter((j) => j.present === true).map((j) => ({ pseudo: j.pseudo, classe: j.classe, chiffres: o.chiffres ? j.chiffres : [] }))
      : null,
    chiffres: o.chiffres, clotureLe: cloture,
    site: o.site,
  };
}

/** Le chiffre d'un joueur, en mots (pas d'émoji dans l'image) : « 182 k/s », « 9,4 M PV (poing) »,
 *  les deux PV d'un Primat côte à côte ; la date de la mesure et le témoin « à remesurer ». */
export function chiffreImage(cs: ChiffreFige[]): { texte: string; date: string | null; aRemesurer: boolean } | null {
  if (!cs.length) return null;
  const c0 = cs[0];
  const texte = cs.length > 1
    ? cs.map((c) => `${chiffreCourt(c.valeur)} PV${c.arme ? ` (${c.arme})` : ""}`).join(" · ")
    : `${c0.texte}${c0.role !== "dps" && c0.arme ? ` (${c0.arme})` : ""}`;
  const quand = cs.map((c) => c.mesureLe).filter((x): x is number => typeof x === "number").sort((a, b) => a - b)[0] ?? null;
  return {
    texte,
    date: quand ? new Date(quand).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit" }) : null,
    aRemesurer: cs.some((c) => c.aRemesurer),
  };
}

/** « Étape la plus longue : 2.2 Jumeaux — 6:12 (15 % du temps) » ; « Mal deux fois de suite :
 *  3.4 Nyzarra — à retravailler » — les mêmes phrases que l'embed et le site, sans émoji. */
export function phrasesAnalyse(d: Pick<DonneesImage, "plusLongue" | "malDeuxFois">): { avant: string; gras: string; apres: string }[] {
  const out: { avant: string; gras: string; apres: string }[] = [];
  if (d.plusLongue) out.push({ avant: "Étape la plus longue : ", gras: `${d.plusLongue.code} ${d.plusLongue.label}`, apres: ` — ${fmtDuree(d.plusLongue.duree)} (${d.plusLongue.part} % du temps)` });
  if (d.malDeuxFois.length) out.push({ avant: "Mal deux fois de suite : ", gras: d.malDeuxFois.map((x) => `${x.code} ${x.label}`).join(", "), apres: " — à retravailler" });
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES POLICES ET LE TEXTE (Pango)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const DOSSIER_POLICES = join(process.cwd(), "public", "fonts");
type Famille = "Cinzel" | "Athiti";
type Poids = 400 | 500 | 600 | 700;
const FICHIERS_ATHITI: Record<Poids, string> = { 400: "Athiti-Regular.ttf", 500: "Athiti-Medium.ttf", 600: "Athiti-SemiBold.ttf", 700: "Athiti-Bold.ttf" };
/** Cinzel est une police VARIABLE : un seul fichier, toutes les graisses (700 vérifiée). */
const FICHIER_CINZEL = "Cinzel-VariableFont_wght.ttf";
const fichierDe = (f: Famille, p: Poids) => join(DOSSIER_POLICES, f === "Cinzel" ? FICHIER_CINZEL : FICHIERS_ATHITI[p]);

let pret: Promise<void> | null = null;
/**
 * À faire une fois, avant le premier texte : sur macOS, passer Pango par fontconfig (sinon
 * CoreText ignore `fontfile`) avec une configuration qui connaît `public/fonts` ; puis charger
 * chaque fichier de police une fois, pour que les graisses se trouvent par leur nom dans le
 * balisage (`weight="600"`). Sous Linux, l'image Docker a fontconfig et les polices installées.
 */
function preparer(): Promise<void> {
  if (pret) return pret;
  pret = (async () => {
    if (process.platform === "darwin") {
      process.env.PANGOCAIRO_BACKEND ??= "fc";
      if (!process.env.FONTCONFIG_FILE) {
        const d = join(tmpdir(), "genesis-polices");
        mkdirSync(d, { recursive: true });
        const f = join(d, "fonts.conf");
        writeFileSync(f, `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <dir>${echapperBalisage(DOSSIER_POLICES)}</dir>\n  <cachedir>${echapperBalisage(join(d, "cache"))}</cachedir>\n</fontconfig>\n`);
        process.env.FONTCONFIG_FILE = f;
      }
    }
    const fichiers = [FICHIER_CINZEL, ...Object.values(FICHIERS_ATHITI)].map((x) => join(DOSSIER_POLICES, x)).filter((x) => existsSync(x));
    for (const fontfile of fichiers) await sharp({ text: { text: "a", font: "Athiti 10", fontfile, rgba: true, dpi: 72 } }).raw().toBuffer();
  })();
  return pret;
}

export type Police = { famille: Famille; poids: Poids; taille: number; interligne: number; couleur: string; espacement?: number };

/** Le « tuteur » : une première ligne INVISIBLE, haute comme la plus haute capitale accentuée et
 *  basse comme le plus bas jambage. Pango rogne son image à l'encre du texte ; sans tuteur, un
 *  « É » et un « a » ne tomberaient pas à la même hauteur. Avec lui, la première ligne réelle a sa
 *  ligne de base à une distance FIXE du haut de l'image (`base`), qu'on mesure une fois. */
const TUTEUR = '<span alpha="1">|Ég</span>';

export type Bloc = {
  data: Buffer; l: number; h: number;
  /** Du haut de l'image à la ligne de base de la première ligne. */
  base: number;
  pas: number; lignes: number;
  /** L'encre visible, de gauche à droite, dans l'image. */
  g: number; d: number;
};

const ouvrir = (p: Police) =>
  `<span line_height="${Math.round(p.interligne * 1024)}" foreground="${p.couleur}" weight="${p.poids}"${p.espacement ? ` letter_spacing="${Math.round(p.espacement * 1024)}"` : ""}>`;

async function rendre(balisage: string, p: Police, largeur?: number) {
  await preparer();
  const fontfile = fichierDe(p.famille, p.poids);
  const { data, info } = await sharp({
    text: {
      text: `${ouvrir(p)}${TUTEUR}\n${balisage}</span>`, font: `${p.famille} ${p.taille}`,
      ...(existsSync(fontfile) ? { fontfile } : {}),
      rgba: true, dpi: 72, ...(largeur ? { width: Math.round(largeur), wrap: "word-char" as const } : {}),
    },
  }).raw().toBuffer({ resolveWithObject: true });
  return { data, l: info.width, h: info.height, canaux: info.channels };
}

const bases = new Map<string, number>();
async function baseDe(p: Police): Promise<number> {
  const k = `${p.famille}|${p.poids}|${p.taille}|${p.interligne}`;
  const deja = bases.get(k);
  if (deja !== undefined) return deja;
  // Un point repose sur la ligne de base : le bas de son image, c'est elle.
  const r = await rendre(".", p);
  bases.set(k, r.h);
  return r.h;
}

/** Un bloc de texte : `balisage` est DÉJÀ échappé (seuls nos propres <span> y entrent). */
export async function bloc(balisage: string, p: Police, largeur?: number): Promise<Bloc> {
  const [r, base] = await Promise.all([rendre(balisage, p, largeur), baseDe(p)]);
  let g = r.l, d = 0;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.l; x++) {
      if (r.data[(y * r.l + x) * r.canaux + 3] > 0) { if (x < g) g = x; if (x > d) d = x; }
    }
  }
  if (g > d) { g = 0; d = 0; }
  const lignes = Math.max(1, Math.floor((r.h - base) / p.interligne + 0.5) + 1);
  return { data: r.data, l: r.l, h: r.h, base, pas: p.interligne, lignes, g, d: d + 1 };
}

/** Un paragraphe SAISI, échappé ici, coupé à `max` lignes (puis « … ») ; `suite` (déjà balisé)
 *  le termine — « · 2 vidéos sur le site ». */
export async function paragraphe(texte: string, p: Police, largeur: number, max: number, suite = ""): Promise<Bloc> {
  const propre = texteImage(texte);
  const b0 = await bloc(echapperBalisage(propre) + suite, p, largeur);
  if (b0.lignes <= max) return b0;
  // Le plus long début, mot entier, qui tient avec « … » : par dichotomie (6 essais pour 60 mots).
  const mots = propre.split(/(?<=\s)/);
  let bas = 0, haut = mots.length, meilleur: Bloc | null = null;
  while (bas < haut) {
    const m = Math.ceil((bas + haut) / 2);
    const essai = await bloc(`${echapperBalisage(mots.slice(0, m).join("").trimEnd())}…${suite}`, p, largeur);
    if (essai.lignes <= max) { bas = m; meilleur = essai; } else haut = m - 1;
  }
  return meilleur ?? bloc(`…${suite}`, p, largeur);
}

/** Le bas visuel d'un bloc posé avec sa première ligne de base en `y` : la dernière ligne de
 *  base, plus le jambage (0,28 em). */
const basDe = (b: Bloc, y: number, taille: number) => y + (b.lignes - 1) * b.pas + Math.round(taille * 0.28);

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LA MISE EN PAGE
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Un morceau posé sur l'image : un bloc de texte (pixels bruts) ou le G (PNG). */
type Pose = { input: Buffer; raw?: { width: number; height: number; channels: 4 }; left: number; top: number };
type Toile = { formes: string[]; textes: Pose[] };

/** Pose un bloc : sa première ligne de base en `y` ; son encre commence en `x` (gauche), finit
 *  en `x` (droite), ou s'y centre. */
function poser(t: Toile, b: Bloc, x: number, y: number, align: "gauche" | "droite" | "centre" = "gauche") {
  const gauche = align === "gauche" ? x - b.g : align === "droite" ? x - b.d : x - (b.g + b.d) / 2;
  t.textes.push({ input: b.data, raw: { width: b.l, height: b.h, channels: 4 }, left: Math.max(0, Math.round(gauche)), top: Math.max(0, Math.round(y - b.base)) });
}
const rect = (t: Toile, x: number, y: number, l: number, h: number, fond: string, r = 0, extra = "") =>
  t.formes.push(`<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(l)}" height="${Math.round(h)}" rx="${r}" ry="${r}" fill="${fond}"${extra}/>`);
/** Un filet or à 42 % (`--gn-filet-fort`). */
const filet = (t: Toile, x: number, y: number, l: number, h = 2) => rect(t, x, y, l, h, C.or, 0, ' fill-opacity="0.42"');
/** La puce des listes : un petit losange or, centré sur la hauteur d'x. */
const puce = (t: Toile, x: number, y: number) =>
  t.formes.push(`<path d="M${x} ${y - 7} L${x + 7} ${y} L${x} ${y + 7} L${x - 7} ${y} Z" fill="${C.or}"/>`);

const P = {
  titre: { famille: "Cinzel", poids: 600, taille: 44, interligne: 52, couleur: C.or, espacement: 1 } as Police,
  sousTitre: { famille: "Athiti", poids: 400, taille: 28, interligne: 36, couleur: C.doux } as Police,
  resultat: { famille: "Cinzel", poids: 700, taille: 28, interligne: 34, couleur: C.ivoire, espacement: 1.5 } as Police,
  etiquette: { famille: "Athiti", poids: 600, taille: 24, interligne: 30, couleur: C.doux, espacement: 2 } as Police,
  total: { famille: "Cinzel", poids: 700, taille: 64, interligne: 70, couleur: C.ivoire } as Police,
  ecartTotal: { famille: "Athiti", poids: 600, taille: 32, interligne: 38, couleur: C.doux } as Police,
  note: { famille: "Athiti", poids: 400, taille: 25, interligne: 32, couleur: C.doux } as Police,
  record: { famille: "Cinzel", poids: 600, taille: 22, interligne: 28, couleur: C.or, espacement: 1.5 } as Police,
  colonne: { famille: "Athiti", poids: 600, taille: 19, interligne: 24, couleur: C.doux, espacement: 2 } as Police,
  phase: { famille: "Cinzel", poids: 600, taille: 30, interligne: 38, couleur: C.orClair } as Police,
  code: { famille: "Athiti", poids: 700, taille: 26, interligne: 34, couleur: C.doux } as Police,
  label: { famille: "Athiti", poids: 600, taille: 30, interligne: 36, couleur: C.ivoire } as Police,
  monstres: { famille: "Athiti", poids: 400, taille: 21, interligne: 26, couleur: C.doux } as Police,
  pastille: { famille: "Athiti", poids: 700, taille: 24, interligne: 30, couleur: C.ivoire } as Police,
  chrono: { famille: "Athiti", poids: 700, taille: 30, interligne: 36, couleur: C.ivoire } as Police,
  ecart: { famille: "Athiti", poids: 600, taille: 24, interligne: 30, couleur: C.doux } as Police,
  remarque: { famille: "Athiti", poids: 400, taille: 26, interligne: 33, couleur: C.texte } as Police,
  section: { famille: "Cinzel", poids: 600, taille: 28, interligne: 36, couleur: C.orClair, espacement: 1 } as Police,
  puce: { famille: "Athiti", poids: 400, taille: 26, interligne: 34, couleur: C.ivoire } as Police,
  aRetenir: { famille: "Athiti", poids: 400, taille: 28, interligne: 37, couleur: C.ivoire } as Police,
  pseudo: { famille: "Athiti", poids: 600, taille: 26, interligne: 32, couleur: C.ivoire } as Police,
  classe: { famille: "Athiti", poids: 400, taille: 21, interligne: 26, couleur: C.doux } as Police,
  chiffre: { famille: "Athiti", poids: 700, taille: 24, interligne: 30, couleur: C.ivoire } as Police,
  pied: { famille: "Athiti", poids: 400, taille: 22, interligne: 28, couleur: C.doux } as Police,
  marque: { famille: "Cinzel", poids: 600, taille: 22, interligne: 28, couleur: C.or, espacement: 1.5 } as Police,
};
const avec = (p: Police, couleur: string): Police => ({ ...p, couleur });
/** La police et la largeur de la remarque d'une étape : de quoi vérifier qu'une remarque de 300
 *  signes tient entière dans ses `MAX_LIGNES_REMARQUE` lignes (scripts/verifier-seances.ts). */
export const REMARQUE_IMAGE = { police: P.remarque, largeur: COL.remarqueL } as const;
const span = (t: string, o: { couleur?: string; poids?: Poids; taille?: number } = {}) =>
  `<span${o.couleur ? ` foreground="${o.couleur}"` : ""}${o.poids ? ` weight="${o.poids}"` : ""}${o.taille ? ` size="${Math.round(o.taille * 1024)}"` : ""}>${t}</span>`;

let logo: Promise<Buffer | null> | null = null;
/** Le monogramme G de GENESIS (public/assets/genesis/logo-mark.svg), 76 px. Absent : rien. */
function logoG(): Promise<Buffer | null> {
  logo ??= (async () => {
    const f = join(process.cwd(), "public", "assets", "genesis", "logo-mark.svg");
    if (!existsSync(f)) return null;
    return sharp(readFileSync(f)).resize(76, 76).png().toBuffer().catch(() => null);
  })();
  return logo;
}

/**
 * L'IMAGE : un PNG de 1 080 px de large, haut de ce qu'il contient (autour de 2 500 px pour les
 * 13 étapes du 18/10). `compressionLevel: 9` ; sans canal alpha (le fond est plein).
 */
export async function imageDebrief(d: DonneesImage): Promise<Buffer> {
  const t: Toile = { formes: [], textes: [] };
  let y = 48;

  /* ── L'en-tête : le G, le titre, le sous-titre, la pastille du résultat ── */
  const g = await logoG();
  const xTitre = g ? X0 + 96 : X0;
  let lPastille = 0;
  if (d.resultat) {
    const r = RESULTATS[d.resultat];
    const b = await bloc(r.mot, P.resultat);
    lPastille = (b.d - b.g) + 56;
    rect(t, X1 - lPastille, y + 4, lPastille, 56, r.fond, 28);
    poser(t, b, X1 - lPastille / 2, y + 4 + 28 + 10, "centre");
  }
  const titre = await bloc(echapperBalisage(texteImage(d.titre)), P.titre, X1 - xTitre - (lPastille ? lPastille + 24 : 0));
  poser(t, titre, xTitre, y + 40);
  let bas = basDe(titre, y + 40, P.titre.taille);
  const sous = await bloc(echapperBalisage(texteImage(d.sousTitre)), P.sousTitre, X1 - xTitre);
  poser(t, sous, xTitre, bas + 36);
  bas = Math.max(basDe(sous, bas + 36, P.sousTitre.taille), g ? y + 80 : 0);
  if (g) t.textes.push({ input: g, left: X0, top: y + Math.max(0, Math.round((bas - y - 76) / 2)) });
  y = bas + 30;

  /* ── Le bandeau du temps total (en haut : c'est le chiffre qu'on cherche) ── */
  {
    const haut = y;
    const etiquette = await bloc("TEMPS TOTAL", P.etiquette);
    const chiffre = await bloc(d.total > 0 ? fmtDuree(d.total) : "—", d.total > 0 ? P.total : avec(P.total, C.doux));
    const yEtiquette = haut + 24 + 22;
    const yChiffre = yEtiquette + 26 + 56;
    // À droite : l'écart à la séance d'avant, ou pourquoi il n'y en a pas ; le record au-dessus.
    let ecart: Bloc | null = null;
    if (d.ecartTotal) ecart = await bloc(echapperBalisage(`${d.ecartTotal.texte}${d.precedent ? ` vs ${d.precedent}` : ""}`), avec(P.ecartTotal, couleurEcart(d.ecartTotal)));
    else if (d.total <= 0) ecart = await bloc("aucun chrono pris", P.note, 440);
    else if (d.sansEcart === "partiel") ecart = await bloc("temps partiel : il manque le chrono d'une étape", P.note, 440);
    else if (d.sansEcart === "precedent_partiel") ecart = await bloc(echapperBalisage(`pas d'écart : pas de temps complet le ${d.precedent ?? "précédent"}`), P.note, 440);
    const hauteur = yChiffre + 22 - haut;
    rect(t, X0, haut, CW, hauteur, C.anthracite, 16);
    if (d.record) {
      const b = await bloc("NOUVEAU RECORD", P.record);
      const l = (b.d - b.g) + 40;
      rect(t, X1 - 24 - l, haut + 22, l, 42, "none", 21, ` stroke="${C.or}" stroke-opacity="0.42" stroke-width="2" fill-opacity="0"`);
      poser(t, b, X1 - 24 - l / 2, haut + 22 + 21 + 8, "centre");
    }
    poser(t, etiquette, X0 + 28, yEtiquette);
    poser(t, chiffre, X0 + 28, yChiffre);
    // Sa DERNIÈRE ligne sur la ligne de base du chiffre, son encre alignée à droite.
    if (ecart) poser(t, ecart, X1 - 28, yChiffre - 4 - (ecart.lignes - 1) * ecart.pas, "droite");
    y = haut + hauteur + 34;
  }

  /* ── Les titres des colonnes (comme le modèle ; la remarque, elle, est sous chaque étape) ── */
  {
    const yc = y + 18;
    poser(t, await bloc("ÉTAPE", P.colonne), COL.code, yc);
    poser(t, await bloc("STATUT", P.colonne), COL.statut + COL.statutL / 2, yc, "centre");
    poser(t, await bloc("CHRONO", P.colonne), COL.chronoD, yc, "droite");
    y = yc + 16;
  }

  /* ── Les phases et leurs étapes ── */
  for (const ph of d.phases) {
    const nom = await bloc(echapperBalisage(texteImage(ph.nom)), P.phase, CW);
    y += 22;
    poser(t, nom, X0, y + 30);
    y = basDe(nom, y + 30, P.phase.taille) + 6;
    filet(t, X0, y, CW);
    y += 14;
    for (const l of ph.lignes) {
      const haut = y;
      const yb = haut + 20 + 26;            // la ligne de base de la ligne 1
      const [code, label, remarque, monstres] = await Promise.all([
        bloc(echapperBalisage(texteImage(l.code)), P.code),
        bloc(echapperBalisage(texteImage(l.label)), P.label, COL.labelL),
        l.remarque || l.videos
          ? paragraphe(l.remarque, P.remarque, COL.remarqueL, MAX_LIGNES_REMARQUE,
            l.videos ? span(echapperBalisage(`${l.remarque.trim() ? " · " : ""}${l.videos} vidéo${l.videos > 1 ? "s" : ""} sur le site`), { couleur: C.doux }) : "")
          : Promise.resolve(null),
        // Les monstres de l'étape (décision 8) : deux lignes au plus, le reste est sur le site.
        l.monstres.length ? paragraphe(l.monstres.join(" · "), P.monstres, COL.labelL, 2) : Promise.resolve(null),
      ]);
      const ps = PASTILLES[l.statut ?? "vide"];
      const mot = await bloc(ps.mot, avec(P.pastille, ps.texte));
      const chrono = await bloc(l.chrono !== null ? `${fmtDuree(l.chrono)}${l.saisi ? span("*", { couleur: C.doux }) : ""}` : "—", l.chrono !== null ? P.chrono : avec(P.chrono, C.doux));
      const ecart = l.ecart ? await bloc(echapperBalisage(l.ecart.texte), avec(P.ecart, couleurEcart(l.ecart))) : null;

      let basG = basDe(label, yb, P.label.taille);
      let yMonstres = 0;
      if (monstres) { yMonstres = yb + (label.lignes - 1) * label.pas + 30; basG = basDe(monstres, yMonstres, P.monstres.taille); }
      const basC = ecart ? yb + 32 + 7 : yb + 8;
      // La ligne 2 : la remarque, sous tout ce que la ligne 1 occupe (libellé, monstres, écart).
      const basL1 = Math.max(basG, basC, yb + 14);
      const yRemarque = basL1 + 34;
      const basR = remarque ? basDe(remarque, yRemarque, P.remarque.taille) : 0;
      const hauteur = Math.max(basL1, basR) + 18 - haut;
      rect(t, X0, haut, CW, hauteur, C.anthracite, 14);
      poser(t, code, COL.code, yb);
      poser(t, label, COL.label, yb);
      if (monstres) poser(t, monstres, COL.label, yMonstres);
      // La pastille : 40 px de haut, centrée sur le milieu de la ligne 1 (entre la hauteur d'x et
      // celle des capitales).
      const yp = yb - 8 - 20;
      rect(t, COL.statut + (COL.statutL - 104) / 2, yp, 104, 40, ps.fond, 20);
      poser(t, mot, COL.statut + COL.statutL / 2, yp + 20 + 8, "centre");
      poser(t, chrono, COL.chronoD, yb, "droite");
      if (ecart) poser(t, ecart, COL.chronoD, yb + 32, "droite");
      if (remarque) poser(t, remarque, COL.remarque, yRemarque);
      y = haut + hauteur + 10;
    }
  }

  /* ── L'analyse (`embed_debrief`, bot.py:2074-2111) ── */
  const phrases = phrasesAnalyse(d);
  if (phrases.length) {
    y = await section(t, "ANALYSE", y + 26);
    for (const p of phrases) {
      // `avant` et `apres` sont nos phrases (leurs espaces comptent) ; `gras`, des libellés saisis.
      const b = await bloc(`${echapperBalisage(p.avant)}${span(echapperBalisage(texteImage(p.gras)), { poids: 600 })}${echapperBalisage(p.apres)}`, P.puce, CW - 30);
      puce(t, X0 + 7, y + 34 - 9);
      poser(t, b, X0 + 30, y + 34);
      y = basDe(b, y + 34, P.puce.taille) + 6;
    }
  }

  /* ── À retenir ── */
  if (d.aRetenir.trim()) {
    y = await section(t, "À RETENIR", y + 26);
    const b = await paragraphe(d.aRetenir, P.aRetenir, CW, MAX_LIGNES_A_RETENIR);
    poser(t, b, X0, y + 36);
    y = basDe(b, y + 36, P.aRetenir.taille) + 4;
  }

  /* ── Les joueurs et leurs chiffres DÉCLARÉS (décision 9) ── */
  if (d.joueurs && d.joueurs.length) {
    y = await section(t, "LES JOUEURS", y + 26);
    if (d.chiffres) {
      const b = await bloc(echapperBalisage(`Chiffres DÉCLARÉS dans l'AirBuilder, jamais vérifiés${d.clotureLe ? `, figés à la clôture du ${d.clotureLe}` : ""} : PV des tanks, dégâts par seconde (k/s) des DPS.`), P.pied, CW);
      poser(t, b, X0, y + 30);
      y = basDe(b, y + 30, P.pied.taille) + 8;
    }
    const lc = (CW - 16) / 2;
    for (let i = 0; i < d.joueurs.length; i += 2) {
      const paire = d.joueurs.slice(i, i + 2);
      const cartes = await Promise.all(paire.map(async (j) => {
        const nom = await bloc(`${echapperBalisage(texteImage(j.pseudo))}  ${span(echapperBalisage(NOMS_CLASSES[j.classe] ?? texteImage(j.classe)), { couleur: C.doux, poids: 400, taille: 21 })}`, P.pseudo, lc - 36);
        const c = d.chiffres ? chiffreImage(j.chiffres) : null;
        const ligne2 = !d.chiffres ? null : await bloc(c
          // Des insécables : « · déclaré le 12/10/26 · à remesurer » ne se coupe jamais, ni ne laisse un « · » en fin de ligne.
          ? `${echapperBalisage(c.texte)}${span(echapperBalisage(c.date ? `  ·\u00A0déclaré\u00A0le\u00A0${c.date}` : "  ·\u00A0déclaré,\u00A0sans\u00A0date"), { couleur: C.doux, poids: 400, taille: 20 })}${c.aRemesurer ? span(echapperBalisage("\u00A0·\u00A0à\u00A0remesurer"), { couleur: C.or, poids: 600, taille: 20 }) : ""}`
          : span("sans mesure", { couleur: C.doux, poids: 400 }), P.chiffre, lc - 36);
        return { nom, ligne2 };
      }));
      const hauteurDe = (c: (typeof cartes)[number]) => {
        const b1 = basDe(c.nom, 16 + 26, P.pseudo.taille);
        return (c.ligne2 ? basDe(c.ligne2, b1 + 30, P.chiffre.taille) : b1) + 16;
      };
      const h = Math.max(...cartes.map(hauteurDe));
      cartes.forEach((c, k) => {
        const x = X0 + k * (lc + 16);
        rect(t, x, y, lc, h, C.anthracite, 12);
        const yb = y + 16 + 26;
        poser(t, c.nom, x + 18, yb);
        if (c.ligne2) poser(t, c.ligne2, x + 18, basDe(c.nom, yb, P.pseudo.taille) + 30);
      });
      y += h + 12;
    }
  }

  /* ── Le pied : la légende (seulement s'il y a un écart ou une correction à lire), l'adresse du
     site, la signature ── */
  y += 18;
  filet(t, X0, y, CW, 1);
  const lignes = d.phases.flatMap((p) => p.lignes);
  const morceaux = [
    lignes.some((l) => l.ecart) || d.ecartTotal ? "Écart : vert, plus rapide que la séance publiée juste avant · crimson, plus lent" : "",
    lignes.some((l) => l.saisi) ? "* chrono corrigé au débrief" : "",
  ].filter(Boolean);
  if (morceaux.length) {
    const legende = await bloc(echapperBalisage(morceaux.join(" · ")), P.pied, CW);
    poser(t, legende, X0, y + 36);
    y = basDe(legende, y + 36, P.pied.taille);
  } else y += 4;
  const marque = await bloc("GENESIS · CHAMBRES SECRÈTES", P.marque);
  const site = d.site ? await bloc(echapperBalisage(d.site), avec(P.pied, C.or)) : null;
  const yp = y + 34;
  if (site) poser(t, site, X0, yp);
  poser(t, marque, X1, yp, "droite");
  const hauteur = yp + 48;

  /* ── Le fond, la barre crimson, puis tout le reste par-dessus ── */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${hauteur}" viewBox="0 0 ${LARGEUR} ${hauteur}">`
    + `<rect width="${LARGEUR}" height="${hauteur}" fill="${C.noir}"/><rect width="${ACCENT}" height="${hauteur}" fill="${C.crimson}"/>`
    + t.formes.join("") + "</svg>";
  return sharp(Buffer.from(svg))
    .composite(t.textes)
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Le titre d'une section (Cinzel, or clair) et son filet ; rend le haut de son contenu. */
async function section(t: Toile, titre: string, y: number): Promise<number> {
  const b = await bloc(echapperBalisage(titre), P.section);
  poser(t, b, X0, y + 30);
  filet(t, X0, y + 46, CW);
  return y + 52;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   L'IMAGE D'UNE SÉANCE EN BASE — le bot (M7, l'essai) et la route d'aperçu (route 14)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Les vidéos PRÊTES de la séance, par code d'étape (lot 8) : l'image dit « · 2 vidéos sur le
 *  site » ; une vidéo sans étape n'y figure pas. */
async function videosParEtape(db: PrismaClient, seanceId: string): Promise<Record<string, number>> {
  const rows = await db.seanceVideo.groupBy({ by: ["etape"], where: { seanceId, statut: "pret" }, _count: { _all: true } }).catch(() => []);
  return Object.fromEntries(rows.filter((r) => r.etape).map((r) => [r.etape as string, r._count._all]));
}

/**
 * L'image du débrief d'une séance, telle que le bot la publiera : le débrief relu en base, comparé
 * à la séance publiée juste avant (`vueDebrief`), ses joueurs figés à la clôture, ses vidéos.
 * `chiffres` : les chiffres DÉCLARÉS sont-ils permis dans le salon de destination (paramétrage
 * `degats.discord` ET salon fermé à @everyone) — sinon les joueurs restent, sans chiffre.
 * Rend aussi la vue, pour l'embed M7.
 */
export async function imageDeLaSeance(
  db: PrismaClient, ligne: SeanceGuilde & { participants: SeanceParticipant[] }, p: ParametresCS,
  o: { chiffres: boolean; site: string },
): Promise<{ png: Buffer; vue: VueDebrief; donnees: DonneesImage }> {
  // Le staff voit le brouillon : l'aperçu montre un débrief avant sa publication.
  const vue = await vueDebrief(db, ligne, { ...p, degats: { ...p.degats, bilans: o.chiffres } }, { staff: true, estMoi: () => false });
  const donnees = donneesImage({
    date: ligne.date, vue, phases: derouleDe(ligne.etapes, p).phases, chiffres: o.chiffres, site: o.site,
    clotureAt: ligne.clotureAt?.getTime() ?? null, videos: await videosParEtape(db, ligne.id),
  });
  return { png: await imageDebrief(donnees), vue, donnees };
}
