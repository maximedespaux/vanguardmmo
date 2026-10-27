// ════════════════════════════════════════════════════════════
//  LES MESSAGES DES CHAMBRES SECRÈTES — construits, jamais envoyés ici
//  (SPEC-CHAMBRES-RECENSEMENT §8.2 et §8.3 ; lot 3 : M1 à M4, M8, M9, M12 ; lot 4 : M5 le récap,
//  M10 📍 Mes positions, et les messages à boutons des salles et des jumeaux — décision 1 de
//  Maxime : tout se fait aussi dans Discord, comme chez Dracarys ; lot 5 : M6 le chrono ;
//  lot 6 bis : la clôture et le débrief étape par étape, éphémères, pour le staff ; lot 7 : M7,
//  le débrief publié dans le salon des débriefs, avec son image ; lot 9 : le Guild Siege — son
//  panneau « Je viens » libre, ses rappels, son annulation et son débrief en embed).
//
//  Module PUR : il ne parle pas à Discord et ne lit pas la base. Il rend le JSON exact de
//  chaque message (embed, boutons, menus, mentions permises), à partir de données déjà lues.
//  C'est ce qui permet de le VÉRIFIER sans Discord (scripts/verifier-seances.ts) : le token
//  est vide en local, aucun message n'y part jamais.
//
//  UN ÉMOJI = UN SENS, partout (table du §8.2). On n'en met que devant une information qui en
//  a un, jamais par décoration ; les classes s'écrivent avec l'émoji personnalisé du serveur.
//  Toute phrase que le staff peut réécrire vient du paramétrage (lib/evenements), avec sa
//  valeur par défaut dans le code ; tout le reste se calcule.
// ════════════════════════════════════════════════════════════
import {
  ButtonStyle, ComponentType, PermissionFlagsBits, TextInputStyle,
  type APIActionRowComponent, type APIComponentInMessageActionRow, type APIEmbed, type APIEmbedField,
  type APIMessageComponentEmoji, type APIModalInteractionResponseCallbackData, type APISelectMenuOption,
} from "discord.js";
import { CLASS_EMOJIS, CLASS_LABELS } from "../config.js";
import { GROUPS, type RolesCS } from "@/app/(guild)/compositions/slots";
import { chiffreCourt, type Chiffre } from "@/lib/recensement";
import {
  EQUIPES, NOM_EQUIPE, PLACES, ROLE_JUMEAU_LABEL, cleJoueur, enSuite, equipeDe, estPlace, etatChrono, fmtDuree, libellePlace, lireClicChrono, niveauEcart, phraseConsignes,
  placesPermises, regrouperSalles, roleDe, singulier,
  type ActionChrono, type ActionRepartition, type Chrono, type EquipeJumeaux, type Equipe, type JoueurCS, type Place, type Positions, type Recap, type Repartition,
  type Resultat, type RoleJumeau, type Salle,
} from "@/lib/chambres";
import {
  A_RETENIR_MAX, LIBELLE_STATUT, REMARQUE_MAX, ROLES_JUMEAU, etapeSuivante, momentDe,
  type AnalyseDebrief, type Ecart, type IssueSeance, type LigneDebrief, type NoteEtape, type PatchDebrief, type StatutEtape,
} from "@/lib/chambres";
import type { OptionEchange, QuoiEchange, VueDemande } from "@/lib/chambres";
import { rolesDeClasse, type RoleMesure } from "@/lib/mesures";
import {
  NOMS_CLASSES, TYPE_DPS, heureDite, libellePoste, remplirTexte, resoudreCle, type ChiffreFige, type Etape, type MentionCalculee, type ParametresCS, type ParametresGS, type Poste,
  type SeanceParis,
} from "@/lib/evenements";

/* ── Les couleurs de la barre (§8.2) ── */
export const COULEUR = {
  crimson: 0xa6192e,   // Chambre Secrète, état normal ; débrief perdu
  or: 0xc69a55,        // il manque du monde ; chrono en cours
  vert: 0x2f8f5b,      // au complet ; chrono terminé
  anthracite: 0x2a2a33, // séance terminée ou annulée
  orClair: 0xe6c48a,   // Guild Siege
} as const;

export const PIED_CS = "GENESIS · Chambres Secrètes";
export const PIED_GS = "GENESIS · Guild Siege";

/* ── Les émojis de classe (§2.1) ── */

const sansAccent = (v: string) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** L'émoji PERSONNALISÉ du serveur, qui reprend le logo de la classe ; en repli, celui de
 *  `CLASS_LABELS` — sauf le Templier, dont le 🛡️ se confondrait avec « tank » : 🐎. */
export function emojiClasse(cle: string): string {
  const k = sansAccent(cle).toUpperCase();
  return CLASS_EMOJIS[k] || (k === "TEMPLIER" ? "🐎" : CLASS_LABELS[k]?.emoji) || "▫️";
}

/** « <:Arcaniste:1498…> » ou « ✅ » → l'objet émoji d'un bouton ou d'une option de menu. */
export function emojiObjet(e: string): APIMessageComponentEmoji {
  const m = /^<(a?):([A-Za-z0-9_]{2,32}):(\d{17,20})>$/.exec(e);
  return m ? { name: m[2], id: m[3], animated: m[1] === "a" } : { name: e };
}

/** Un nom de perso entre dans du Markdown : « Ki_ra » ne doit pas passer en italique. */
export const echapper = (t: string) => String(t ?? "").replace(/([\\*_~`|>])/g, "\\$1");

/* ── Les identifiants des boutons : SANS ÉTAT (§8.1) ──
   Chaque bouton porte tout ce qu'il faut ; le clic relit tout en base. Un redémarrage du bot
   ne casse donc aucun bouton (le problème des menus expirés du modèle n'existe pas ici). */

export const ID = {
  viens: (cle: string) => `cs:viens:${cle}`,
  absent: (cle: string) => `cs:absent:${cle}`,
  choix: (cle: string) => `cs:choix:${cle}`,
  poste: (cle: string, pseudo: string) => `cs:poste:${cle}:${pseudo}`,
  // Lot 4 — 📍 Mes positions, et ses deux menus (les salles d'un perso, son équipe).
  pos: (cle: string) => `cs:pos:${cle}`,
  mesSalles: (cle: string, pseudo: string) => `cs:msal:${cle}:${pseudo}`,
  monEquipe: (cle: string, pseudo: string) => `cs:mjum:${cle}:${pseudo}`,
  // Les boutons des messages de répartition (Phase 1, Phase 2).
  salle: (cle: string, salle: string) => `cs:salle:${cle}:${salle}`,
  jumeau: (cle: string, place: Place) => `cs:jum:${cle}:${place}`,
  // Les gestes du staff : compléter, puis les menus en deux temps (quoi, puis qui).
  auto: (cle: string) => `cs:auto:${cle}`,
  placer: (cle: string) => `cs:placer:${cle}`,
  echanger: (cle: string) => `cs:echanger:${cle}`,
  choixSalle: (cle: string) => `cs:psal:${cle}`,
  joueurSalle: (cle: string, salle: string) => `cs:pjou:${cle}:${salle}`,
  choixJoueur: (cle: string) => `cs:sjou:${cle}`,
  actionJumeau: (cle: string, pseudo: string) => `cs:sact:${cle}:${pseudo}`,
  // Lot 5 — le chrono : le geste et le repère de l'état affiché (`repere`). La spec écrivait
  // `cs:chrono:<action>:<clé>:<vu>` (§8.1) ; la clé reste ici à sa place, en troisième, comme
  // pour tous les autres boutons (`lireId`).
  chrono: (cle: string, action: ActionChrono, vu: number) => `cs:chrono:${cle}:${action}:${vu}`,
  // Lot 9 — le Guild Siege : « Je viens » libre, « Pas cette fois », et le menu « avec quel
  // perso » (un seul : un perso par compte et par séance).
  gsViens: (cle: string) => `gs:viens:${cle}`,
  gsAbsent: (cle: string) => `gs:absent:${cle}`,
  gsChoix: (cle: string) => `gs:choix:${cle}`,
  // Lot 10 — les échanges : 🔄 Échanges (le bouton de 📍 Mes positions), le menu « demander une
  // place » d'un perso, la réponse à une demande (o : accepter ; n : refuser, ou retirer la
  // sienne) ; « équilibrer les jumeaux » (staff) et sa confirmation.
  echanges: (cle: string) => `cs:echs:${cle}`,
  demander: (cle: string, pseudo: string) => `cs:dem:${cle}:${pseudo}`,
  repondre: (cle: string, id: string, accepter: boolean) => `cs:echr:${cle}:${id}:${accepter ? "o" : "n"}`,
  equilibrer: (cle: string) => `cs:equil:${cle}`,
  equilibrerOk: (cle: string) => `cs:equilok:${cle}`,
};

export type IdLu = { evenement: "cs" | "gs"; action: string; cle: string; reste: string };
export function lireId(id: string): IdLu | null {
  const m = /^(cs|gs):([a-z]+):([^:]*)(?::(.*))?$/.exec(id);
  if (!m) return null;
  return { evenement: m[1] as "cs" | "gs", action: m[2], cle: m[3], reste: m[4] ?? "" };
}

/* ── Les briques ── */

export type Bouton = APIComponentInMessageActionRow;
export type Rangee = APIActionRowComponent<APIComponentInMessageActionRow>;
export type Mentions = { parse: ("everyone" | "users" | "roles")[]; users?: string[] };
export type MessageSeance = { content?: string; embeds: APIEmbed[]; components: Rangee[]; allowedMentions: Mentions };

const AUCUNE: Mentions = { parse: [] };

/** Un bouton à identifiant. Sans émoji (`""`) : on ne met d'émoji que devant une information qui
 *  en a un (§8.2) — « Salle 3 » ou « Compléter (staff) » n'en ont pas, et Discord refuse un
 *  émoji vide. */
export const bouton = (custom_id: string, label: string, emoji: string, style: ButtonStyle.Primary | ButtonStyle.Secondary | ButtonStyle.Success | ButtonStyle.Danger = ButtonStyle.Secondary): Bouton =>
  ({ type: ComponentType.Button, style, label, ...(emoji ? { emoji: emojiObjet(emoji) } : {}), custom_id });

/** 🌐 « Ouvrir sur le site » : un bouton LIEN, qui ne demande aucun traitement de clic. Sans
 *  adresse connue du site, il n'existe pas (Discord refuse un lien vide). */
export const lien = (url: string | null | undefined, label: string): Bouton | null =>
  url && /^https?:\/\//.test(url) ? { type: ComponentType.Button, style: ButtonStyle.Link, label, emoji: { name: "🌐" }, url } : null;

export const rangee = (...b: (Bouton | null)[]): Rangee[] => {
  const c = b.filter((x): x is Bouton => !!x);
  return c.length ? [{ type: ComponentType.ActionRow, components: c }] : [];
};

const SUITE = "… (voir le site)";

/**
 * Coupe un texte à `max` signes (1 024 par champ, 4 096 par description) : ligne par ligne,
 * et la ligne coupée se termine par « … (voir le site) ». Une première ligne trop longue se
 * coupe hors d'un mot (piège n° 9).
 */
export function couper(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const out: string[] = [];
  let n = 0;
  for (const l of texte.split("\n")) {
    const cout = (out.length ? 1 : 0) + l.length;
    if (n + cout + 1 + SUITE.length > max) {
      if (!out.length) {
        const place = max - SUITE.length - 1;
        const bout = l.slice(0, place);
        const espace = bout.lastIndexOf(" ");
        out.push((espace > place * 0.6 ? bout.slice(0, espace) : bout).trimEnd());
      }
      out.push(SUITE);
      break;
    }
    out.push(l);
    n += cout;
  }
  return out.join("\n");
}

/** Le poids d'un embed tel que Discord le compte (6 000 signes au plus). */
export function poidsEmbed(e: APIEmbed): number {
  return (e.title?.length ?? 0) + (e.description?.length ?? 0) + (e.footer?.text.length ?? 0) + (e.author?.name.length ?? 0)
    + (e.fields ?? []).reduce((s, f) => s + f.name.length + f.value.length, 0);
}

/** Les bornes de Discord : 256 au titre, 4 096 à la description, 25 champs de 1 024, 6 000 au
 *  total — au-delà, le plus gros champ est raccourci, avec « … (voir le site) ». */
export function borner(e: APIEmbed): APIEmbed {
  const out: APIEmbed = { ...e, title: e.title?.slice(0, 256), description: e.description ? couper(e.description, 4096) : undefined };
  out.fields = (e.fields ?? []).slice(0, 25).map((f) => ({ ...f, name: f.name.slice(0, 256), value: couper(f.value || "▫️", 1024) }));
  for (let tour = 0; tour < 30 && poidsEmbed(out) > 6000; tour++) {
    const champs = out.fields!;
    if (!champs.length) { out.description = couper(out.description ?? "", Math.max(200, (out.description?.length ?? 0) - (poidsEmbed(out) - 6000))); break; }
    const gros = champs.reduce((a, b) => (b.value.length > a.value.length ? b : a));
    gros.value = couper(gros.value, Math.max(60, gros.value.length - (poidsEmbed(out) - 6000) - 10));
  }
  return out;
}

/* ── Les chiffres DÉCLARÉS (décision 9 ; §4.2) ── */

/**
 * Le chiffre posé à côté d'un nom : ❤️ des PV (tank), 💥 des dégâts par seconde (DPS), 📏 une
 * mesure de plus de 30 jours, ❔ aucune. Les deux PV de p1 (sceptre puis poing) s'écrivent
 * côte à côte ; l'arme est dite aussi quand le chiffre montré n'est qu'un repli.
 */
export function ligneChiffre(chiffres: ChiffreFige[], cs: Pick<RolesCS, "mesure" | "toutes">): string {
  if (!chiffres.length) return "❔";
  const vieux = chiffres.some((c) => c.aRemesurer) ? " 📏" : "";
  const c0 = chiffres[0];
  if (c0.role === "dps") return `💥 ${c0.texte}${vieux}`;
  if (chiffres.length > 1) return `❤️ ${chiffres.map((c) => `${chiffreCourt(c.valeur)}${c.arme ? ` ${c.arme}` : ""}`).join(" · ")}${vieux}`;
  const arme = c0.arme && (cs.toutes || c0.role !== cs.mesure[0]) ? ` ${c0.arme}` : "";
  return `❤️ ${chiffreCourt(c0.valeur)}${arme}${vieux}`;
}

/** Les chiffres sont des valeurs DÉCLARÉES : la légende le dit, en petit, sous la liste. */
export const LEGENDE_CHIFFRES = "-# Chiffres déclarés dans l'AirBuilder, non vérifiés · ❤️ PV · 💥 dégâts/s · 📏 plus de 30 jours : à remesurer · ❔ sans mesure";

/**
 * Montrer les chiffres ? Seulement si le paramétrage les affiche dans Discord ET si le salon
 * est FERMÉ à @everyone : le serveur compte aussi des visiteurs et des candidats, et le
 * recensement est réservé aux membres (§8.3 M1, piège n° 22).
 */
export const chiffresPermis = (o: { degatsDiscord: boolean; salonFerme: boolean }) => o.degatsDiscord && o.salonFerme;

/* ── Les joueurs d'une séance, tels que les messages les lisent ── */

export type JoueurMsg = {
  pseudo: string;
  classe: string;
  slotId: string | null;
  retenu: boolean;
  chiffres: ChiffreFige[];
  /** Les rôles de son poste (sans poste : le premier poste de sa classe) — l'arme des PV en dépend. */
  cs: RolesCS;
};

/** Un joueur tel que le récap et la répartition le lisent : ses rôles par phase en plus. */
export type JoueurRecap = JoueurMsg & Pick<JoueurCS, "roles">;

const entree = (j: JoueurMsg, chiffres: boolean) => `${j.retenu ? "✅ " : ""}${echapper(j.pseudo)}${chiffres ? ` ${ligneChiffre(j.chiffres, j.cs)}` : ""}`;

/** « <Arcaniste> Kaelis », suivi de son chiffre DÉCLARÉ quand le salon le permet. */
const nomJ = (j: JoueurMsg, chiffres = false) => `${emojiClasse(j.classe)} ${echapper(j.pseudo)}${chiffres ? ` ${ligneChiffre(j.chiffres, j.cs)}` : ""}`;
const liste = (l: string[]) => (l.length ? l.join("\n") : "▫️ personne");

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M1 — LE PANNEAU D'INSCRIPTION (la veille à 20 h, puis mis à jour en continu)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type EtatPanneau = "ouvert" | "terminee" | "annulee" | "remplace";

export type DonneesPanneau = {
  cle: string;
  /** « mercredi 22 octobre · 21 h ». */
  label: string;
  etat: EtatPanneau;
  /** Le jour J, « Demain à 21 h » devient « Ce soir à 21 h ». */
  jourJ: boolean;
  /** La phrase d'ouverture du rappel « veille », variables non remplies. */
  texte: string;
  vars: Record<string, string>;
  postes: Poste[];
  slotMeta: Record<string, { label?: string }>;
  /** Tous les annoncés VISIBLES de la séance (ni ami, ni membre caché), dans l'ordre d'annonce. */
  joueurs: JoueurMsg[];
  places: number;
  manque: string | null;
  chiffres: boolean;
  site: string;
  maj: number;
};

const NOM_GROUPE: Record<string, string> = { "Tanks (Primats)": "🛡️ Tanks", "DPS physique": "⚔️ DPS physiques", "DPS magique": "🔮 DPS magiques" };
const SUFFIXE: Record<EtatPanneau, string> = { ouvert: "", terminee: " · terminée", annulee: " · annulée", remplace: " · remplacé" };

/** « Demain à 21 h. … » le jour J : « Ce soir à 21 h. … ». */
export const auJourJ = (t: string) => t.replace(/\bdemain\b/i, (m) => (m[0] === "D" ? "Ce soir" : "ce soir"));

export function messagePanneau(d: DonneesPanneau): MessageSeance {
  const ouvert = d.etat === "ouvert";
  const texte = remplirTexte(d.jourJ ? auJourJ(d.texte) : d.texte, d.vars);
  const retenus = d.joueurs.filter((j) => j.retenu).length;
  const lignes = [
    texte ? `⏰ ${texte}` : "",
    `👥 ${d.joueurs.length} / ${d.places} annoncés · ✅ ${retenus} retenu${retenus > 1 ? "s" : ""}`,
    d.manque ? `⚠️ Il manque : ${d.manque}` : "✅ Au complet",
  ].filter(Boolean);

  const parPoste = new Map<string, JoueurMsg[]>();
  const sansPoste: JoueurMsg[] = [];
  for (const j of d.joueurs) {
    if (j.slotId && d.postes.some((p) => p.id === j.slotId)) parPoste.set(j.slotId, [...(parPoste.get(j.slotId) ?? []), j]);
    else sansPoste.push(j);
  }
  const fields: APIEmbedField[] = [];
  for (const g of GROUPS) {
    const postes = d.postes.filter((p) => p.group === g);
    const l = postes.flatMap((p) => {
      const ici = parPoste.get(p.id) ?? [];
      if (!ici.length && p.optionnel) return []; // un poste optionnel vide n'est pas affiché
      return [`${emojiClasse(p.classe)} ${echapper(libellePoste(p, d.slotMeta))} — ${ici.length ? ici.map((j) => entree(j, d.chiffres)).join(" · ") : "▫️ personne"}`];
    });
    if (l.length) fields.push({ name: NOM_GROUPE[g] ?? g, value: l.join("\n") });
  }
  if (sansPoste.length) fields.push({ name: "🙋 Annoncés sans poste", value: sansPoste.map((j) => `${emojiClasse(j.classe)} ${entree(j, d.chiffres)}`).join(" · ") });

  const description = [...lignes, ...(d.chiffres && d.joueurs.length ? ["", LEGENDE_CHIFFRES] : [])].join("\n");
  const embed = borner({
    title: `🏰 Chambre Secrète — ${d.label}${SUFFIXE[d.etat]}`,
    url: d.site ? `${d.site}/compositions?onglet=inscription` : undefined,
    description,
    color: !ouvert ? COULEUR.anthracite : d.manque ? COULEUR.or : COULEUR.vert,
    fields,
    footer: { text: `${PIED_CS} · mis à jour` },
    timestamp: new Date(d.maj).toISOString(),
  });
  return {
    embeds: [embed],
    // Fermé (clôture, annulation, remplacé) : les boutons partent, comme chez le modèle.
    components: ouvert ? rangee(
      bouton(ID.viens(d.cle), "Je viens", "✅", ButtonStyle.Success),
      bouton(ID.absent(d.cle), "Pas cette fois", "❌"),
      bouton(ID.pos(d.cle), "Mes positions", "📍"),
      lien(d.site && `${d.site}/compositions?onglet=inscription`, "Choisir mon poste sur le site"),
    ) : [],
    allowedMentions: AUCUNE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M2 — « IL MANQUE DU MONDE » (13 h 30 et 18 h 30, s'il manque une classe)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type DonneesPlaces = {
  cle: string; heure: string; texte: string; vars: Record<string, string>;
  annonces: number; places: number; manque: string;
  /** Le lien du panneau (sa jump URL) ; sans panneau, la page des Chambres. */
  lienPanneau: string | null; site: string; maj: number;
};

export function messagePlaces(d: DonneesPlaces): MessageSeance {
  const texte = remplirTexte(d.texte, d.vars);
  return {
    embeds: [borner({
      title: `⏰ Chambre Secrète ce soir à ${d.heure} — il manque du monde`,
      description: [`👥 ${d.annonces} / ${d.places} annoncés`, `⚠️ Il manque : ${d.manque}`, texte].filter(Boolean).join("\n"),
      color: COULEUR.or,
      footer: { text: PIED_CS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: rangee(
      bouton(ID.viens(d.cle), "Je viens", "✅", ButtonStyle.Success),
      lien(d.lienPanneau ?? (d.site && `${d.site}/compositions?onglet=inscription`), d.lienPanneau ? "Voir le panneau" : "Voir la composition"),
    ),
    allowedMentions: AUCUNE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M3 — « ÇA COMMENCE DANS 1 H » (20 h le jour J) : l'ancien rappel du jour et la mention des
   inscrits du modèle, en UN message (une notification au lieu de deux, au même moment)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type DonneesJour = {
  dans: string; texte: string; vars: Record<string, string>;
  source: "retenus" | "annonces";
  /** Les participants (les retenus ; tant que personne ne l'est, les annoncés). */
  joueurs: JoueurMsg[]; places: number; manque: string | null;
  chiffres: boolean; site: string; maj: number;
  /** La séance (pour le bouton 📍) ; le bouton ne part qu'avec la bascule (`positions`). */
  cle?: string; positions?: boolean;
};

export function messageJour(d: DonneesJour): MessageSeance {
  const texte = remplirTexte(d.texte, d.vars);
  const n = d.joueurs.length;
  const qui = d.source === "retenus" ? `retenu${n > 1 ? "s" : ""}` : `annoncé${n > 1 ? "s" : ""}`;
  const lignes = [
    texte ? `🕘 ${texte}` : "",
    `👥 ${n} / ${d.places} ${qui}${!d.manque && n ? " — au complet, merci à tous !" : ""}`,
    d.manque ? `⚠️ Il manque : ${d.manque}` : "",
    d.source === "annonces" && n ? "-# Personne n'est encore retenu : ce sont les annoncés." : "",
    d.chiffres && n ? LEGENDE_CHIFFRES : "",
  ].filter(Boolean);
  return {
    embeds: [borner({
      title: `⏰ La Chambre Secrète commence ${d.dans}`,
      description: lignes.join("\n"),
      color: d.manque || !n ? COULEUR.or : COULEUR.vert,
      fields: [{ name: "✅ Ce soir", value: n ? d.joueurs.map((j) => `${emojiClasse(j.classe)} ${echapper(j.pseudo)}${d.chiffres ? ` ${ligneChiffre(j.chiffres, j.cs)}` : ""}`).join("\n") : "▫️ Personne ne s'est encore annoncé." }],
      footer: { text: PIED_CS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    // 📍 Mes positions n'est proposé qu'avec la bascule : tant que le bot Python tourne, c'est
    // sa répartition qui fait foi dans Discord, et deux réponses différentes perdraient tout le
    // monde. Le lien vers la répartition du site, lui, est toujours juste.
    components: rangee(
      d.positions && d.cle ? bouton(ID.pos(d.cle), "Mes positions", "📍") : null,
      lien(d.site && `${d.site}/compositions?onglet=repartition`, "Voir la répartition"),
    ),
    allowedMentions: AUCUNE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M4 — LE RAPPEL DE LA VEILLE SANS PANNEAU (panneau coupé, ou bascule pas encore faite)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type DonneesVeille = {
  cle: string; heure: string; jourJ: boolean; texte: string; vars: Record<string, string>;
  annonces: number; places: number; manque: string | null; site: string; maj: number;
};

export function messageVeille(d: DonneesVeille): MessageSeance {
  return {
    embeds: [borner({
      title: `⏰ Chambre Secrète ${d.jourJ ? "ce soir" : "demain"} à ${d.heure}`,
      description: [remplirTexte(d.texte, d.vars), `👥 ${d.annonces} / ${d.places} annoncés · ${d.manque ? `⚠️ Il manque : ${d.manque}` : "✅ Au complet"}`].filter(Boolean).join("\n"),
      color: d.manque ? COULEUR.or : COULEUR.vert,
      footer: { text: PIED_CS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: rangee(
      bouton(ID.viens(d.cle), "Je viens", "✅", ButtonStyle.Success),
      lien(d.site && `${d.site}/compositions?onglet=inscription`, "S'annoncer sur le site"),
    ),
    allowedMentions: AUCUNE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M8 — SÉANCE ANNULÉE
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type DonneesAnnulation = {
  label: string; dateLongue: string; jourMeme: boolean; motif: string | null;
  /** La séance suivante (« dimanche 26 octobre · 21 h ») ; null : aucune de prévue (le Guild
   *  Siege sans autre créneau). */
  prochaine: string | null; maj: number;
  /** Le Guild Siege (lot 9) : « 🚫 Guild Siege de ce soir annulé », au masculin. */
  evenement?: "cs" | "gs";
};

export function messageAnnulation(d: DonneesAnnulation): MessageSeance {
  const gs = d.evenement === "gs";
  const titre = gs
    ? d.jourMeme ? "🚫 Guild Siege de ce soir annulé" : `🚫 Guild Siege du ${d.dateLongue} annulé`
    : d.jourMeme ? "🚫 Chambre Secrète de ce soir annulée" : `🚫 Chambre Secrète du ${d.dateLongue} annulée`;
  return {
    embeds: [borner({
      title: titre,
      description: [`📅 ${d.label}${d.motif ? ` — ${echapper(d.motif)}` : ""}`, d.prochaine ? `${gs ? "Le prochain" : "La prochaine"} : ${d.prochaine}.` : ""].filter(Boolean).join("\n"),
      color: COULEUR.anthracite,
      footer: { text: gs ? PIED_GS : PIED_CS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: [],
    allowedMentions: AUCUNE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LE GUILD SIEGE (§11.3 ; lot 9) — codé, réglable, mais INACTIF tant que le staff ne l'allume
   pas (décision 2). Pas de postes : « Je viens » est LIBRE, un perso par compte et par séance.
   Son panneau est vivant comme celui des Chambres (modifié en place à chaque annonce, du site ou
   de Discord), en or clair ; le rappel « dans 1 h » liste qui vient ; le rappel au staff ne
   mentionne personne ; le débrief part en embed, sans image.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Un annoncé du siège, tel que les messages le lisent. */
export type JoueurGSMsg = { pseudo: string; classe: string; chiffres: ChiffreFige[]; role: RoleMesure | null };

const lienGS = (site: string) => (site ? `${site}/compositions?onglet=gvg` : "");

/** « <Primat> Brann ❤️ 9,4 M poing » : le chiffre DÉCLARÉ de son stuff DPS, à défaut Tank, à
 *  défaut Off tank — dit avec son arme quand c'est un PV (ce n'est pas un poste). */
const nomGS = (j: JoueurGSMsg, chiffres: boolean) =>
  `${emojiClasse(j.classe)} ${echapper(j.pseudo)}${chiffres ? ` ${ligneChiffre(j.chiffres, { mesure: [j.role ?? "dps"], toutes: true })}` : ""}`;

export type DonneesPanneauGS = {
  cle: string; label: string; etat: EtatPanneau; jourJ: boolean;
  /** Le jour de la séance (« vendredi ») quand elle n'est ni ce soir ni demain : un siège par
   *  semaine se prépare toute la semaine, et « Publier » part le lundi pour le vendredi. */
  jourDit?: string | null;
  /** La phrase d'ouverture du rappel « veille » (variables non remplies), puis la règle du
   *  siège (`textes.panneau`). */
  texte: string; regle: string; vars: Record<string, string>;
  joueurs: JoueurGSMsg[]; places: number | null;
  /** « 19:00 » : l'inscription de la GUILDE au siège, côté jeu (un geste du staff). */
  finInscription: string | null;
  chiffres: boolean; site: string; maj: number;
};

/** « Demain à 21 h 30 » dit trop tôt devient « Vendredi à 21 h 30 » (contre-examen lot 9) : le
 *  panneau est vivant, la même ligne dit « Demain » la veille, puis « Ce soir » le jour J. */
export const auJourDit = (t: string, jour: string) => t.replace(/\bdemain\b/i, (m) => (m[0] === "D" ? jour.charAt(0).toUpperCase() + jour.slice(1) : jour));

export function messagePanneauGS(d: DonneesPanneauGS): MessageSeance {
  const ouvert = d.etat === "ouvert";
  const n = d.joueurs.length;
  const complet = d.places !== null && n >= d.places;
  const texte = remplirTexte(d.jourJ ? auJourJ(d.texte) : d.jourDit ? auJourDit(d.texte, d.jourDit) : d.texte, d.vars).trim();
  const regle = remplirTexte(d.regle, d.vars).trim();
  const lignes = [
    texte ? `⏰ ${texte}` : "",
    regle,
    `👥 ${n}${d.places !== null ? ` / ${d.places}` : ""} annoncé${n > 1 ? "s" : ""}${complet ? " · ✅ Au complet" : ""}`,
    d.finInscription ? `-# Inscription de la guilde au siège avant ${heureDite(d.finInscription)} (le staff s'en charge).` : "",
    d.chiffres && n ? LEGENDE_CHIFFRES : "",
  ].filter(Boolean);
  return {
    embeds: [borner({
      title: `🏯 Guild Siege — ${d.label}${SUFFIXE[d.etat]}`,
      url: lienGS(d.site) || undefined,
      description: lignes.join("\n"),
      color: ouvert ? COULEUR.orClair : COULEUR.anthracite,
      fields: [{ name: "✅ Ils viennent", value: n ? d.joueurs.map((j) => nomGS(j, d.chiffres)).join(" · ") : "▫️ Personne ne s'est encore annoncé." }],
      footer: { text: `${PIED_GS} · mis à jour` },
      timestamp: new Date(d.maj).toISOString(),
    })],
    // Fermé (clôture, annulation, remplacé) : les boutons partent, comme le panneau des Chambres.
    components: ouvert ? rangee(
      bouton(ID.gsViens(d.cle), "Je viens", "✅", ButtonStyle.Success),
      bouton(ID.gsAbsent(d.cle), "Pas cette fois", "❌"),
      lien(lienGS(d.site), "Ouvrir le site"),
    ) : [],
    allowedMentions: AUCUNE,
  };
}

export type DonneesJourGS = {
  cle: string; dans: string; texte: string; vars: Record<string, string>;
  joueurs: JoueurGSMsg[]; places: number | null; chiffres: boolean; site: string; maj: number;
  /** L'inscription est-elle encore ouverte (le bouton « Je viens ») ? */
  ouverte: boolean;
};

/** « ⏰ Le Guild Siege commence dans 1 h », avec qui vient : sans postes ni phases, il tient lieu
 *  de récap (§11.2). */
export function messageJourGS(d: DonneesJourGS): MessageSeance {
  const n = d.joueurs.length;
  const texte = remplirTexte(d.texte, d.vars).trim();
  return {
    embeds: [borner({
      title: `⏰ Le Guild Siege commence ${d.dans}`,
      description: [texte ? `🕘 ${texte}` : "", `👥 ${n}${d.places !== null ? ` / ${d.places}` : ""} annoncé${n > 1 ? "s" : ""}`, d.chiffres && n ? LEGENDE_CHIFFRES : ""].filter(Boolean).join("\n"),
      color: COULEUR.orClair,
      fields: [{ name: "✅ Ce soir", value: n ? d.joueurs.map((j) => nomGS(j, d.chiffres)).join("\n") : "▫️ Personne ne s'est encore annoncé." }],
      footer: { text: PIED_GS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: rangee(
      d.ouverte ? bouton(ID.gsViens(d.cle), "Je viens", "✅", ButtonStyle.Success) : null,
      lien(lienGS(d.site), "Ouvrir le site"),
    ),
    allowedMentions: AUCUNE,
  };
}

/** Le rappel au staff (« 🏯 Pensez à inscrire la guilde… »), dans le salon du staff, sans
 *  mention ni bouton. L'effectif l'accompagne : c'est ce qu'on inscrit. Un rappel se titre par
 *  ⏰ (§8.2), comme M2 à M4 : la phrase garde son 🏯, qui n'apparaît ainsi qu'une fois. */
export function messageStaffGS(d: { label: string; texte: string; vars: Record<string, string>; annonces: number; places: number | null; maj: number }): MessageSeance {
  const texte = remplirTexte(d.texte, d.vars).trim();
  return {
    embeds: [borner({
      title: `⏰ Guild Siege du ${d.label} — inscription de la guilde`,
      description: [texte, `👥 ${d.annonces}${d.places !== null ? ` / ${d.places}` : ""} annoncé${d.annonces > 1 ? "s" : ""}`].filter(Boolean).join("\n"),
      color: COULEUR.orClair,
      footer: { text: PIED_GS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: [],
    allowedMentions: AUCUNE,
  };
}

/** Le menu « Je viens avec… » du siège : UN perso (un par compte et par séance), celui déjà
 *  annoncé coché. */
export function menuPersoGS(cle: string, persos: { name: string; class: string }[], actuel: string | null): Rangee[] {
  const options: APISelectMenuOption[] = persos.slice(0, 25).map((c) => {
    const k = sansAccent(c.class).toUpperCase();
    const cl = Object.keys(NOMS_CLASSES).find((x) => x.toUpperCase() === k) ?? c.class;
    return { label: c.name.slice(0, 100), value: c.name.slice(0, 100), description: NOMS_CLASSES[cl] ?? c.class, emoji: emojiObjet(emojiClasse(cl)), default: !!actuel && actuel.toLowerCase() === c.name.toLowerCase() };
  });
  if (!options.length) return [];
  return [{ type: ComponentType.ActionRow, components: [{ type: ComponentType.StringSelect, custom_id: ID.gsChoix(cle), placeholder: "Je viens avec…", min_values: 1, max_values: 1, options }] }];
}

/** Les réponses éphémères du siège (M9) : la phrase de la règle (`gesteGS`), mise en forme. */
export type CodeReponseGS = "annonce" | "change" | "deja" | "retire" | "rien" | "plusieurs" | "aucun_perso" | "inactif" | "annule" | "refus";
export function reponseGS(code: CodeReponseGS, v: { pseudo?: string; classe?: string; label?: string; retires?: string[]; message?: string; site?: string } = {}): string {
  const nom = `**${echapper(v.pseudo ?? "")}**`;
  const classe = v.classe ? ` (${emojiClasse(v.classe)} ${NOMS_CLASSES[v.classe] ?? v.classe})` : "";
  const retires = (v.retires ?? []).map((x) => `**${echapper(x)}**`).join(", ");
  switch (code) {
    case "annonce": return `✅ ${nom}${classe} vient au Guild Siege du ${v.label}. Tu changes d'avis ? ❌ Pas cette fois.`;
    case "change": return `✅ Tu viens avec ${nom}${classe} au Guild Siege du ${v.label}, à la place de ${retires} : un perso par séance.`;
    case "deja": return `✅ ${nom} est déjà annoncé pour le Guild Siege du ${v.label}.`;
    case "retire": return `❌ C'est noté : ${retires} ne vient pas au Guild Siege du ${v.label}. Merci d'avoir prévenu.`;
    case "rien": return `❌ C'est noté : tu n'étais pas annoncé pour le Guild Siege du ${v.label}.`;
    case "plusieurs": return `Avec quel perso viens-tu au Guild Siege du ${v.label} ? Un seul par séance : c'est libre, peu importe la classe.`;
    case "aucun_perso": return `🧙 Tu n'as aucun personnage sur le site. Crée-le dans l'AirBuilder (bouton « Mes personnages ») : ${v.site ? `${v.site}/builder` : "le site"}`;
    // ⚠️ comme « Cette séance est terminée » (M9) : 🏯 ne sert qu'aux titres du siège (§8.2).
    case "inactif": return "⚠️ Le Guild Siege n'est pas actif pour l'instant : le PvP n'est pas encore installé.";
    // 🚫 : séance annulée, comme la réponse des Chambres.
    case "annule": return "🚫 Ce Guild Siege est annulé.";
    case "refus": return `⚠️ ${v.message ?? "Je n'ai pas pu enregistrer, réessaie dans un instant."}`;
  }
}

export type DonneesDebriefGS = {
  cle: string; jour: string;
  resultat: IssueSeance | null; presents: number | null; aRetenir: string;
  /** Les étapes, quand le staff en a posé (vide par défaut : le débrief simplifié). */
  lignes: Pick<LigneDebrief, "etape" | "statut" | "chrono" | "remarque">[];
  texte: string; vars: Record<string, string>; site: string; maj: number;
  videos?: VideoPubliee[];
};

/** M7 du Guild Siege (§11.3) : le résultat, les présents, « à retenir », les vidéos, et le lien
 *  du débrief — en embed, sans image. GAGNÉ en vert, PERDU en crimson, comme aux Chambres. */
export function messageDebriefGS(d: DonneesDebriefGS): MessageSeance {
  const url = lienDebrief(d.site, d.cle);
  const issue = d.resultat === "gagne" ? "🏆 **GAGNÉ**" : d.resultat === "perdu" ? "💀 **PERDU**" : "";
  const presents = d.presents !== null ? `👥 ${d.presents} présent${d.presents > 1 ? "s" : ""}` : "";
  const phrase = remplirTexte(d.texte, d.vars).trim();
  const description = [[issue, presents].filter(Boolean).join(" · "), ...(phrase ? ["", phrase] : [])].filter((x, i) => x || i > 0).join("\n");
  const fields: APIEmbedField[] = [];
  if (d.lignes.length) {
    fields.push({
      // Sans émoji : 📝 dit « débrief » (le titre), et une manche n'a pas d'émoji à elle (§8.2).
      name: "Manches",
      value: d.lignes.map((l) => `${pastille(l.statut)} ${l.etape.emoji} **${echapper(l.etape.code)} ${echapper(l.etape.label)}**${l.chrono !== null ? ` — ⏱️ ${fmtDuree(l.chrono)}` : ""}${l.remarque ? ` · ${echapper(l.remarque)}` : ""}`).join("\n"),
    });
  }
  if (d.aRetenir.trim()) fields.push({ name: "📌 À retenir", value: echapper(d.aRetenir.trim()) });
  const cv = champVideos(d.videos ?? [], d.site, d.cle);
  if (cv) fields.push(cv);
  return {
    embeds: [borner({
      title: `📝 Retour du Guild Siege — ${d.jour}`,
      url: url || undefined,
      description: description || undefined,
      fields,
      color: d.resultat === "gagne" ? COULEUR.vert : d.resultat === "perdu" ? COULEUR.crimson : COULEUR.orClair,
      footer: { text: PIED_GS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: rangee(lien(url, "Lire le débrief sur le site")),
    allowedMentions: AUCUNE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES MENTIONS — toujours un `allowedMentions` explicite (piège n° 15)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Pose les mentions calculées (`mentionsDuRappel`) sur un message. Les participants sans compte
 * retrouvé restent dans la liste, en gras, sans mention (§12.5). Un message qui mentionne
 * @everyone ET un membre ne lui envoie qu'une notification.
 */
export function avecMentions(m: MessageSeance, calc: MentionCalculee, o: { liste?: boolean; gras?: string[]; tete?: string } = {}): MessageSeance {
  // Les noms en gras ne viennent qu'avec la liste des participants mentionnés : tant que la
  // bascule est coupée, le rappel de 20 h reste « @everyone » seul, comme l'ancien.
  const avecListe = o.liste || !!o.tete;
  const noms = [...calc.users.map((u) => `<@${u}>`), ...(avecListe && calc.users.length ? (o.gras ?? []).map((g) => `**${echapper(g)}**`) : [])];
  const bouts: string[] = [];
  if (calc.everyone) bouts.push("@everyone");
  // Le récap (M5) : « 📋 Récap de ce soir — @Maxime @Lina … ». Sans personne à mentionner
  // (republication), pas de ligne du tout : le titre de l'embed dit déjà ce que c'est.
  if (o.tete && noms.length) bouts.push(`${o.tete} — ${noms.join(" ")}`);
  else if (o.liste && noms.length) bouts.push(`${calc.everyone ? "— c" : "C"}e soir : ${noms.join(" ")}`);
  else if (!avecListe && calc.users.length) bouts.push(noms.join(" "));
  const content = bouts.join(" ").slice(0, 2000) || undefined;
  return { ...m, content, allowedMentions: { parse: calc.everyone ? ["everyone"] : [], ...(calc.users.length ? { users: calc.users } : {}) } };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M12 — LE MESSAGE D'ESSAI : le message rendu, tel qu'il partirait, dans le salon des essais,
   SANS AUCUNE MENTION et sans boutons actifs (ils répondent « 🧪 Ceci est un essai. »)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export function enEssai(m: MessageSeance, note?: string): MessageSeance {
  // La mention prévue est DITE, jamais faite : un « @ » suivi d'une espace sans chasse ne
  // notifie personne, même si `allowedMentions` venait à manquer.
  const prevue = m.allowedMentions.parse.includes("everyone") || m.allowedMentions.users?.length
    ? `Mention prévue : ${[m.allowedMentions.parse.includes("everyone") ? "@\u200beveryone" : "", m.allowedMentions.users?.length ? `${m.allowedMentions.users.length} participant${m.allowedMentions.users.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" et ")}.`
    : "Mention prévue : aucune.";
  return {
    content: [`🧪 Message d'essai — rien n'est envoyé à la guilde. ${prevue}`, note ?? ""].filter(Boolean).join("\n"),
    embeds: m.embeds.map((e, i) => (i === 0 ? { ...e, title: `🧪 ESSAI — ${e.title ?? ""}`.slice(0, 256) } : e)),
    components: m.components.map((r, ri) => ({
      ...r,
      components: r.components.map((c, ci) => {
        if (c.type === ComponentType.Button && c.style === ButtonStyle.Link) return c;
        if ("custom_id" in c) return { ...c, custom_id: `cs:essai:${ri}.${ci}` } as Bouton;
        return c;
      }),
    })),
    allowedMentions: AUCUNE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M9 — LES RÉPONSES ÉPHÉMÈRES (seul l'auteur du clic les voit)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type CodeReponse =
  | "annonce" | "plusieurs" | "pas_cette_fois" | "pas_annonce" | "retire_retenu" | "retenu_decoche" | "poste_choisi" | "poste_deja"
  | "compte_non_lie" | "reserve_membres" | "compte_cache" | "aucun_perso" | "panneau_perime" | "seance_cloturee"
  | "seance_annulee" | "erreur" | "essai" | "perso_inconnu" | "poste_inconnu";

export type VarsReponse = {
  noms?: string[]; classe?: string; label?: string; jour?: string; quand?: string; site?: string; lien?: string | null;
  poste?: string; sansPoste?: string[]; quoi?: string;
};

const gras = (noms: string[]) => {
  const g = noms.map((n) => `**${echapper(n)}**`);
  return g.length > 1 ? `${g.slice(0, -1).join(", ")} et ${g.at(-1)}` : g[0] ?? "";
};

export function reponse(code: CodeReponse, v: VarsReponse = {}): string {
  const site = v.site || "le site";
  const noms = v.noms ?? [];
  switch (code) {
    case "annonce": {
      const tete = noms.length > 1
        ? `✅ ${gras(noms)} sont annoncés pour ${v.label}. Le staff choisira.`
        : `✅ ${gras(noms)}${v.classe ? ` (${emojiClasse(v.classe)} ${NOMS_CLASSES[v.classe] ?? v.classe})` : ""} est annoncé pour ${v.label}.`;
      const sp = v.sansPoste ?? [];
      const poste = sp.length
        ? `\n${sp.length > 1 ? `${gras(sp)} n'ont` : noms.length > 1 ? `${gras(sp)} n'a` : "Il n'a"} pas encore de poste : choisis-en un ci-dessous (facultatif).`
        : "";
      return `${tete} Tu changes d'avis ? ❌ Pas cette fois.${poste}`;
    }
    case "plusieurs": return `Quels persos peux-tu amener ${v.quand ?? "à cette séance"} ? Le staff choisira.`;
    case "pas_cette_fois": return `❌ C'est noté : ${gras(noms)} ne ${noms.length > 1 ? "viennent" : "vient"} pas ${v.jour ?? ""}. Merci d'avoir prévenu.`.replace(/ {2,}/g, " ").replace(" .", ".");
    case "pas_annonce": return `❌ C'est noté : tu n'étais pas annoncé pour ${v.jour ?? "cette séance"}.`;
    case "retire_retenu": return "❌ C'est noté. ⚠️ Tu étais retenu : préviens le staff pour qu'on te remplace.";
    case "retenu_decoche": return `⚠️ ${gras(noms)} ${noms.length > 1 ? "étaient retenus" : "était retenu"} : préviens le staff pour qu'on ${noms.length > 1 ? "les" : "le"} remplace.`;
    case "poste_choisi": return `✅ ${gras(noms)} est inscrit au poste **${echapper(v.poste ?? "")}**.`;
    case "poste_deja": return `✅ ${gras(noms)} est déjà inscrit au poste **${echapper(v.poste ?? "")}**.`;
    case "compte_non_lie": return `🔗 Ton Discord n'est pas encore lié au site. Connecte-toi une fois sur ${site}, puis reviens cliquer.`;
    case "reserve_membres": return `⛔ ${v.quoi ?? "Les Chambres sont réservées"} aux membres de la guilde.`;
    case "compte_cache": return "⛔ Ton compte n'apparaît pas dans la liste de la guilde : vois avec le staff.";
    case "aucun_perso": return `🧙 Tu n'as aucun personnage de Chambre sur le site. Crée-le dans l'AirBuilder (bouton « Mes personnages ») : ${v.site ? `${v.site}/builder` : "le site"}`;
    case "panneau_perime": return v.lien
      ? `⚠️ Ce panneau est celui d'une séance passée. Le bon est ici : ${v.lien}`
      : `⚠️ Ce panneau est celui d'une séance passée. Annonce-toi pour la prochaine sur ${v.site ? `${v.site}/compositions` : "le site"}.`;
    case "seance_cloturee": return "⚠️ Cette séance est terminée.";
    case "seance_annulee": return "🚫 Cette séance est annulée.";
    case "erreur": return "⚠️ Je n'ai pas pu enregistrer, réessaie dans un instant.";
    case "essai": return "🧪 Ceci est un essai.";
    case "perso_inconnu": return "⚠️ Ce perso n'est pas (ou plus) à toi.";
    case "poste_inconnu": return "⚠️ Ce poste n'existe plus, ou ne va pas à la classe de ce perso.";
  }
}

/* ── Les menus éphémères : « quels persos » et « quel poste » ── */

/** Plusieurs persos jouables : un menu à choix multiple (25 au plus), annonces actuelles
 *  cochées — on peut en amener plusieurs, et le staff choisira, comme sur le site. */
export function menuPersos(cle: string, persos: { name: string; class: string }[], annonces: Set<string>): Rangee[] {
  const options: APISelectMenuOption[] = persos.slice(0, 25).map((c) => {
    const k = sansAccent(c.class).toUpperCase();
    const cl = Object.keys(NOMS_CLASSES).find((x) => x.toUpperCase() === k) ?? c.class;
    return { label: c.name.slice(0, 100), value: c.name.slice(0, 100), description: NOMS_CLASSES[cl] ?? c.class, emoji: emojiObjet(emojiClasse(cl)), default: annonces.has(c.name.toLowerCase()) };
  });
  if (!options.length) return [];
  return [{ type: ComponentType.ActionRow, components: [{ type: ComponentType.StringSelect, custom_id: ID.choix(cle), placeholder: "Je viens avec…", min_values: 1, max_values: options.length, options }] }];
}

/**
 * Sous la réponse « ✅ … est annoncé » : les menus des postes, puis le bouton « ❌ Pas cette
 * fois ». La réponse dit « Tu changes d'avis ? ❌ Pas cette fois. » (M9) ; or « Je viens » se
 * clique aussi sur le rappel de 13 h 30 et sur celui de la veille sans panneau (M2, M4), qui
 * n'ont pas ce bouton — sans lui, on ne pourrait pas se désannoncer depuis Discord. 4 menus au
 * plus : Discord n'accepte que 5 rangées.
 */
export function composantsAnnonce(cle: string, menus: Rangee[]): Rangee[] {
  return [...menus.slice(0, 4), ...rangee(bouton(ID.absent(cle), "Pas cette fois", "❌"))];
}

/** Les rangées d'une réponse qui portent encore un menu (un choix de poste fait, les autres restent). */
export const avecMenu = (rangees: Rangee[]) => rangees.filter((r) => r.components.some((c) => c.type === ComponentType.StringSelect));

/** Le menu des postes de la classe d'un perso (« 2 déjà inscrits »). Null si l'identifiant
 *  dépasserait les 100 signes de Discord. */
export function menuPoste(cle: string, pseudo: string, classe: string, postes: { id: string; label: string; inscrits: number }[]): Rangee | null {
  const custom_id = ID.poste(cle, pseudo);
  if (custom_id.length > 100 || !postes.length) return null;
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.StringSelect, custom_id, placeholder: `Poste de ${pseudo}…`.slice(0, 150), min_values: 1, max_values: 1,
      options: postes.slice(0, 25).map((p) => ({
        label: p.label.slice(0, 100), value: p.id, emoji: emojiObjet(emojiClasse(classe)),
        description: p.inscrits ? `${p.inscrits} déjà inscrit${p.inscrits > 1 ? "s" : ""}` : "personne encore",
      })),
    }],
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LES SALONS (§8.8) : la valeur du paramétrage, puis la variable d'environnement, puis le défaut
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type EnvSalons = { cs: string; csDebrief: string; gs: string; staff: string; defaut: string };

export function resoudreSalons(cs: Pick<ParametresCS, "salons">, gs: Pick<ParametresGS, "salons">, env: EnvSalons) {
  const chambres = cs.salons.chambres || env.cs || env.defaut;
  return {
    chambres,
    debriefs: cs.salons.debriefs || env.csDebrief || chambres,
    // Les essais ne partent JAMAIS dans le salon de la guilde : sans salon des essais ni salon
    // du staff, l'essai échoue et le dit.
    essais: cs.salons.essais || env.staff || "",
    siege: gs.salons.siege || env.gs || chambres,
    // Lot 9 : les débriefs du Guild Siege, par défaut dans son propre salon.
    debriefsGS: gs.salons.debriefs || gs.salons.siege || env.gs || chambres,
    staff: env.staff || "",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M11 — LES COMMANDES SLASH EN LECTURE : /recensement et /chambre historique (éphémères)
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const jjmm = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" });

/** « 🛡️ Tank (poing) », « 🛡️ Off tank (sceptre) », « 🔮 DPS » — l'émoji du DPS suit la classe
 *  (`TYPE_DPS`) : un Primat DPS est rangé en magique (contre-examen n° 13). */
export function nomRole(role: RoleMesure, classe: string): string {
  if (role === "tank") return `🛡️ Tank (${classe === "Templier" ? "doloire" : "poing"})`;
  if (role === "offtank") return "🛡️ Off tank (sceptre)";
  return `${TYPE_DPS[classe] === "phy" ? "⚔️" : "🔮"} DPS`;
}

/** Le chiffre d'un rôle, DÉCLARÉ et daté : « ❤️ 9,4 M · mesuré le 12/10 », « 💥 182 k/s · 📏
 *  mesuré le 02/09, à remesurer », « ❔ sans mesure ». */
export function chiffreDate(c: Pick<Chiffre, "role" | "valeur" | "texte" | "mesureLe" | "aRemesurer"> | null | undefined): string {
  if (!c || !c.valeur) return "❔ sans mesure";
  const v = c.role === "dps" ? `💥 ${c.texte}` : `❤️ ${chiffreCourt(c.valeur)}`;
  if (!c.mesureLe) return `${v} · sans date`;
  return c.aRemesurer ? `${v} · 📏 mesuré le ${jjmm(c.mesureLe)}, à remesurer` : `${v} · mesuré le ${jjmm(c.mesureLe)}`;
}

/** /recensement : les chiffres de chacun de MES persos, rôle par rôle, tels que je les ai
 *  déclarés dans l'AirBuilder. */
export function messageMesChiffres(persos: { name: string; classe: string; par: Partial<Record<RoleMesure, Chiffre>> }[], site: string): MessageSeance {
  const ordre: RoleMesure[] = ["tank", "offtank", "dps"];
  const fields: APIEmbedField[] = persos.slice(0, 25).map((p) => ({
    name: `${emojiClasse(p.classe)} ${p.name}`.slice(0, 256),
    value: ordre.filter((r) => rolesDeClasse(p.classe).includes(r)).map((r) => `${nomRole(r, p.classe)} ${chiffreDate(p.par[r])}`).join("\n") || "❔ sans mesure",
  }));
  return {
    embeds: [borner({
      title: "📊 Tes chiffres — déclarés dans l'AirBuilder, mesurés sur le totem de l'Oasis",
      description: persos.length ? "-# Des valeurs DÉCLARÉES, jamais vérifiées · 📏 plus de 30 jours : à remesurer" : "🧙 Tu n'as aucun personnage sur le site : crée-le dans l'AirBuilder (bouton « Mes personnages »).",
      color: COULEUR.crimson, fields, footer: { text: "GENESIS · Recensement" },
    })],
    components: rangee(lien(site && `${site}/builder`, "Mettre à jour dans l'AirBuilder"), lien(site && `${site}/guilde#recensement`, "Voir le recensement")),
    allowedMentions: AUCUNE,
  };
}

export type LigneClasse = { perso: string; joueur: string; role: RoleMesure | null; chiffre: Chiffre | null };

/** /recensement classe:… : le classement d'une classe, 15 lignes au plus — les tanks d'abord,
 *  et jamais des PV et des DPS dans un même tri. */
export function messageClasse(classe: string, lignes: LigneClasse[], site: string): MessageSeance {
  const nom = NOMS_CLASSES[classe] ?? classe;
  const ordre: (RoleMesure | null)[] = ["tank", "offtank", "dps", null];
  const triees = [...lignes].sort((a, b) => ordre.indexOf(a.role) - ordre.indexOf(b.role) || (b.chiffre?.valeur ?? 0) - (a.chiffre?.valeur ?? 0) || a.perso.localeCompare(b.perso, "fr"));
  const montrees = triees.slice(0, 15);
  const texte = montrees.map((l, i) => `${i + 1}. **${echapper(l.perso)}** · ${echapper(l.joueur)} — ${l.role ? `${nomRole(l.role, classe)} ` : ""}${chiffreDate(l.chiffre)}`);
  if (triees.length > montrees.length) texte.push(`… et ${triees.length - montrees.length} de plus sur le site.`);
  return {
    embeds: [borner({
      title: `📊 Recensement — ${nom}`,
      description: (texte.length ? [...texte, "", "-# Des valeurs DÉCLARÉES dans l'AirBuilder, jamais vérifiées."] : [`Aucun ${nom} dans la guilde.`]).join("\n"),
      color: COULEUR.crimson, footer: { text: "GENESIS · Recensement" },
    })],
    components: rangee(lien(site && `${site}/guilde?classe=${encodeURIComponent(classe)}#recensement`, "Voir le recensement")),
    allowedMentions: AUCUNE,
  };
}

export type DonneesHistorique = {
  /** « Tes » ou « Les … de Kaelis ». */
  qui: string | null;
  joues: number; total: number; depuis: string | null;
  presents: { date: string; resultat: string | null }[];
  absents: string[];
};

/** /chambre historique : ses Chambres, présent ou absent (§4.8, M11). 🏆 / 💀 seulement
 *  quand le débrief est publié. */
export function messageHistorique(d: DonneesHistorique, site: string): MessageSeance {
  const jj = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  const tete = d.qui ? `📜 Les Chambres de ${echapper(d.qui)}` : "📜 Tes Chambres";
  const lignes = d.total
    ? [
      `${d.joues} sur ${d.total}${d.depuis ? ` depuis le ${dateCourte(d.depuis)}` : ""}`,
      d.presents.length ? `✅ ${d.presents.slice(0, 20).map((p) => `${jj(p.date)}${p.resultat === "gagne" ? " 🏆" : p.resultat === "perdu" ? " 💀" : ""}`).join(" · ")}${d.presents.length > 20 ? " · …" : ""}` : "",
      d.absents.length ? `❌ Annoncé mais absent : ${d.absents.slice(0, 20).map(jj).join(" · ")}${d.absents.length > 20 ? " · …" : ""}` : "",
    ].filter(Boolean)
    : ["Aucune Chambre clôturée pour l'instant : les présences s'enregistrent à la clôture (« Ils étaient là »)."];
  return {
    embeds: [borner({ title: tete, description: lignes.join("\n"), color: COULEUR.crimson, footer: { text: PIED_CS } })],
    components: rangee(lien(site && `${site}/compositions?onglet=bilans`, "Voir les bilans")),
    allowedMentions: AUCUNE,
  };
}

/** « 1er septembre », « 18 octobre ». */
function dateCourte(date: string): string {
  const [y, m, j] = date.split("-").map(Number);
  const mois = new Date(Date.UTC(y, m - 1, j, 12)).toLocaleDateString("fr-FR", { timeZone: "UTC", month: "long" });
  return `${j === 1 ? "1er" : j} ${mois}`;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 4 — LA RÉPARTITION DES PHASES DANS DISCORD (§4.3, §4.4, §4.6 ; M5, M10)
   Le contenu vient tout entier de lib/chambres (`recap`, `positionsDe`, `equipesJumeaux`) :
   le site et le bot affichent la même chose, calculée de la même façon.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export const EMOJI_EQUIPE: Record<Equipe, string> = { vert: "🟩", rouge: "🟥" };
export const EMOJI_ROLE: Record<RoleJumeau, string> = { tank: "🛡️", mag: "🔮", phy: "⚔️" };

/** « 🟥 Équipe Rouge — 🔮 DPS magique ». */
export const placeDite = (p: Place) => `${EMOJI_EQUIPE[equipeDe(p)]} Équipe ${NOM_EQUIPE[equipeDe(p)]} — ${EMOJI_ROLE[roleDe(p)]} ${ROLE_JUMEAU_LABEL[roleDe(p)]}`;

/* ── M5 — LE RÉCAP (20 h 40, puis mis à jour jusqu'à la clôture) ── */

export type DonneesRecap = {
  cle: string;
  /** « mercredi 22 octobre ». */
  jour: string;
  etat: EtatPanneau;
  recap: Recap<JoueurRecap>;
  source: "retenus" | "annonces";
  /** La phrase du rappel « recap » du paramétrage (« Lis bien ton rôle à chaque phase. »). */
  texte: string; vars: Record<string, string>;
  chiffres: boolean;
  /** Le bouton 📍 Mes positions (la bascule est faite). */
  positions: boolean;
  site: string; maj: number;
};

export function messageRecap(d: DonneesRecap): MessageSeance {
  const rc = d.recap;
  const ouvert = d.etat === "ouvert";
  const texte = remplirTexte(d.texte, d.vars).trim();
  const n = rc.joueurs.length;
  const description = [
    `👥 ${n} / ${rc.places} joueurs${texte ? ` · ${enSuite(texte)}` : ""}`,
    d.source === "annonces" && n ? "-# Personne n'est encore retenu : ce sont les annoncés." : "",
    d.chiffres && n ? LEGENDE_CHIFFRES : "",
  ].filter(Boolean).join("\n");

  const membres = (l: { j: JoueurRecap; tank: boolean }[]) => l.map((m) => `${nomJ(m.j)}${m.tank ? " — tank" : ""}`);
  const golem = (cote: "gauche" | "droite") => {
    const l = rc.golems[cote];
    const resume = cote === "gauche" ? rc.golems.resumeGauche : rc.golems.resumeDroite;
    return l.length ? [...membres(l), `*${resume}*`].join("\n") : "▫️ personne";
  };
  const reserve = rc.araignee.reserve;
  const fields: (APIEmbedField | null)[] = [
    { name: "🛡️ Tanks", value: liste(rc.tanks.map((j) => nomJ(j, d.chiffres))), inline: true },
    { name: "🔮 DPS magiques", value: liste(rc.mag.map((j) => nomJ(j, d.chiffres))), inline: true },
    { name: "⚔️ DPS physiques", value: liste(rc.phy.map((j) => nomJ(j, d.chiffres))), inline: true },
    {
      name: "🌳 Phase 1 — Asuras (salles)",
      value: [
        ...rc.phase1.map((x) => `**${echapper(x.libelle)}** → ${nomJ(x.j)}`),
        rc.sansJoueur.length ? `⚠️ Sans joueur : ${rc.sansJoueur.map(echapper).join(", ")}` : "",
      ].filter(Boolean).join("\n") || "▫️ personne",
    },
    ...EQUIPES.map((eq) => ({ name: `👯 Phase 2 — ${EMOJI_EQUIPE[eq]} Équipe ${NOM_EQUIPE[eq]}`, value: liste(membres(rc.jumeaux[eq])), inline: true })),
    // Une ligne vide entre deux paires de colonnes : sans elle, Discord collerait le golem de
    // gauche à droite des jumeaux (trois colonnes par rangée).
    { name: "​", value: "​" },
    { name: `🗿 Phase 3 — ${singulier(rc.golems.nom)} ⬅️ gauche`, value: golem("gauche"), inline: true },
    { name: `🗿 Phase 3 — ${singulier(rc.golems.nom)} ➡️ droite`, value: golem("droite"), inline: true },
    // La consigne des golems sépare aussi les golems des rotations ; vidée par le staff, une
    // ligne vide prend sa place — sans elle, Discord rangerait la Rotation 1 à droite des golems.
    { name: "​", value: rc.golems.consigne ? `⚠️ ${rc.golems.consigne}` : "​" },
    { name: "🕷️ Araignée — 1️⃣ Rotation 1", value: liste(rc.araignee.r1.map((j) => nomJ(j))), inline: true },
    { name: "🕷️ Araignée — 2️⃣ Rotation 2", value: liste(rc.araignee.r2.map((j) => nomJ(j))), inline: true },
    reserve.length ? {
      name: `🔁 Remplaçant${reserve.length > 1 ? "s" : ""} debuff`,
      value: `${reserve.map((j) => nomJ(j)).join(" · ")} — debuff seulement si celui de sa classe est raté.`,
    } : null,
    rc.araignee.consignes.length ? { name: "​", value: `⚠️ Araignée : ${phraseConsignes(rc.araignee.consignes)}` } : null,
  ];
  return {
    embeds: [borner({
      title: `📋 Chambre Secrète — ${d.jour} · récap${SUFFIXE[d.etat]}`,
      url: d.site ? `${d.site}/compositions?onglet=repartition` : undefined,
      description,
      color: ouvert ? COULEUR.crimson : COULEUR.anthracite,
      fields: fields.filter((f): f is APIEmbedField => !!f),
      footer: { text: `${PIED_CS}${rc.pied ? ` · ${rc.pied}` : ""}` },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: ouvert ? rangee(
      d.positions ? bouton(ID.pos(d.cle), "Mes positions", "📍") : null,
      lien(d.site && `${d.site}/compositions?onglet=repartition`, "Voir la répartition"),
    ) : [],
    allowedMentions: AUCUNE,
  };
}

/* ── M10 — 📍 MES POSITIONS (éphémère) ── */

export type PositionsMsg = Positions & { poste: string | null; retenu: boolean };

/** Les lignes d'un perso (`texte_positions`, bot.py:1119-1125), sous l'en-tête. */
export function lignesPositions(p: PositionsMsg, nomGolems: string, source: "retenus" | "annonces"): string[] {
  const golem = singulier(nomGolems);
  return [
    `${emojiClasse(p.classe)} **${echapper(p.pseudo)}** · ${p.poste ? `poste ${echapper(p.poste)}` : "sans poste"} · ${p.retenu ? "✅ retenu" : source === "annonces" ? "annoncé (personne n'est encore retenu)" : "annoncé"}`,
    p.salles.length ? `🌳 ${echapper(regrouperSalles(p.salles))}` : "🌳 Salles : pas encore choisies — prends-les ci-dessous ou sur le site.",
    p.jumeau ? `👯 Jumeaux : ${placeDite(p.jumeau)}` : "👯 Jumeaux : pas encore d'équipe — choisis-la ci-dessous ou sur le site.",
    p.golem ? `🗿 ${golem} : ${p.golem === "gauche" ? "⬅️ gauche" : "➡️ droite"}${p.golemTank ? " — 🛡️ tank" : ""}` : "",
    p.araignee === 1 ? "🕷️ Araignée : 1️⃣ Rotation 1"
      : p.araignee === 2 ? "🕷️ Araignée : 2️⃣ Rotation 2"
        : p.araignee === "reserve" ? "🕷️ Araignée : 🔁 remplaçant debuff — seulement si celui de ta classe est raté"
          : p.araignee === "tank" ? "🕷️ Araignée : 🛡️ tank, hors des rotations de debuff" : "",
  ].filter(Boolean);
}

export type DonneesPositions = {
  cle: string; label: string;
  positions: PositionsMsg[];
  nomGolems: string;
  source: "retenus" | "annonces";
  /** Les menus de ses persos (salles, équipe) : 4 au plus, Discord n'accepte que 5 rangées. */
  menus: Rangee[];
  /** Une ligne en tête : le verdict du dernier geste (« ✅ Tes salles : Salles 3 + 4. »). */
  note?: string;
  site: string;
  /** Ses persos annoncés mais PAS retenus (le staff en a retenu d'autres) : « ni annoncé » serait faux. */
  nonRetenus?: string[];
  /** Lot 10 : le bouton 🔄 Échanges (demander une place, répondre), et combien de demandes
   *  attendent sa réponse. */
  echanges?: boolean;
  demandesRecues?: number;
};

/** La réponse éphémère : en clair (pas d'embed), comme les autres réponses de M9. */
export function messagePositions(d: DonneesPositions): { content: string; components: Rangee[]; allowedMentions: Mentions } {
  const site = lien(d.site && `${d.site}/compositions?onglet=repartition`, "Modifier sur le site");
  if (!d.positions.length && d.nonRetenus?.length) {
    const n = d.nonRetenus.length;
    return {
      content: [d.note ?? "", `📍 ${gras(d.nonRetenus)} ${n > 1 ? "sont annoncés, mais le staff ne les a pas retenus" : "est annoncé, mais le staff ne l'a pas retenu"} pour la Chambre du ${d.label} : pas de position ce soir.`].filter(Boolean).join("\n"),
      // Le staff garde 🔄 Échanges sans perso parmi les joueurs : il tranche les demandes des autres.
      components: rangee(d.echanges ? bouton(ID.echanges(d.cle), "Échanges", "🔄") : null, site),
      allowedMentions: AUCUNE,
    };
  }
  if (!d.positions.length) {
    return {
      content: [d.note ?? "", `📍 Tu n'es pas parmi les joueurs de la Chambre du ${d.label} : ni retenu, ni annoncé. Annonce-toi avec ✅ Je viens, ou sur le site.`].filter(Boolean).join("\n"),
      components: rangee(d.echanges ? bouton(ID.echanges(d.cle), "Échanges", "🔄") : null, lien(d.site && `${d.site}/compositions?onglet=inscription`, "S'annoncer sur le site")),
      allowedMentions: AUCUNE,
    };
  }
  const blocs = d.positions.map((p) => lignesPositions(p, d.nomGolems, d.source).join("\n"));
  const n = d.demandesRecues ?? 0;
  const attente = d.echanges && n ? `🔄 ${n} demande${n > 1 ? "s" : ""} d'échange ${n > 1 ? "t'attendent" : "t'attend"} : ouvre 🔄 Échanges.` : "";
  return {
    content: [d.note ?? "", `📍 Tes positions — ${d.label}`, blocs.join("\n\n"), attente].filter(Boolean).join("\n").slice(0, 2000),
    components: [...d.menus.slice(0, 4), ...rangee(d.echanges ? bouton(ID.echanges(d.cle), "Échanges", "🔄") : null, site)],
    allowedMentions: AUCUNE,
  };
}

/** `/chambre positions` AVANT la bascule (§8.10) : comme le bouton 📍 du rappel de 20 h, la
 *  réponse attend `nouveauxMessages` — tant que le bot Python tourne, c'est sa répartition qui
 *  fait foi dans Discord, et deux réponses différentes perdraient tout le monde. Le site, lui,
 *  dit toujours la nôtre. */
export function positionsAvantBascule(site: string): { content: string; components: Rangee[]; allowedMentions: Mentions } {
  return {
    content: "📍 Tes positions se donneront ici quand notre bot aura pris le relais de l'ancien. D'ici là, elles sont sur le site, onglet Répartition.",
    components: rangee(lien(site && `${site}/compositions?onglet=repartition`, "Voir la répartition")),
    allowedMentions: AUCUNE,
  };
}

/** « 🌳 Salles de Kaelis » : les salles libres et les siennes (on ne vole pas une salle prise,
 *  bot.py:1154), cochées quand il les tient ; plusieurs possibles, et aucune pour tout rendre. */
export function menuMesSalles(cle: string, pseudo: string, salles: Salle[], r: Repartition): Rangee | null {
  const k = cleJoueur(pseudo);
  const custom_id = ID.mesSalles(cle, pseudo);
  const libres = salles.filter((s) => !r.salles[s.cle] || r.salles[s.cle] === k).slice(0, 25);
  if (custom_id.length > 100 || !libres.length) return null;
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.StringSelect, custom_id, placeholder: `Salles de ${pseudo} (plusieurs possibles)`.slice(0, 150),
      min_values: 0, max_values: libres.length,
      options: libres.map((s) => ({ label: s.label.slice(0, 100), value: s.cle, default: r.salles[s.cle] === k })),
    }],
  };
}

/** « 👯 Équipe de Kaelis » : les deux places que son poste tient, ou aucune. */
export function menuMonEquipe(cle: string, j: Pick<JoueurCS, "pseudo" | "classe" | "roles">, actuelle: Place | null): Rangee | null {
  const custom_id = ID.monEquipe(cle, j.pseudo);
  const permises = placesPermises(j);
  if (custom_id.length > 100 || !permises.length) return null;
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.StringSelect, custom_id, placeholder: `Équipe des jumeaux de ${j.pseudo}`.slice(0, 150), min_values: 1, max_values: 1,
      options: [
        { label: "Aucune équipe", value: "aucune", default: !actuelle },
        ...permises.map((p) => ({ label: libellePlace(p), value: p, emoji: { name: EMOJI_EQUIPE[equipeDe(p)] }, default: p === actuelle })),
      ],
    }],
  };
}

/** Le verdict d'un geste de répartition, dit à son auteur : ✅ fait, ⛔ pas autorisé, ⚠️ refusé. */
export type ResultatGeste = Resultat;
export const reponseGeste = (r: Resultat) => (r.ok ? `✅ ${r.message}` : `${r.status === 403 ? "⛔" : "⚠️"} ${r.message}`);

/* ── LA GARDE DES GESTES DE RÉPARTITION DEPUIS DISCORD, ET CE QUE DIT CHAQUE MENU ──
   Pures, pour être vérifiées sans Discord : `bot/lib/seances.ts` lit la base, puis leur demande
   quoi répondre. Un bouton se voit de tous ceux qui voient le salon (visiteurs, candidats, amis
   compris) : rien ne se décide sur le seul fait d'avoir pu cliquer. */

export type GardeRepartition = {
  /** Le compte relu EN BASE par `discordId` (`compteDiscord`) : pas lié, ou pas de la guilde. */
  refus: "compte_non_lie" | "reserve_membres" | null;
  /** Un membre caché n'est jamais parmi les joueurs (seances-serveur.ts) — le staff, si. */
  cache: boolean;
  /** `isStaff` (rôle Discord) ou un rang staff en base. */
  staff: boolean;
  /** Le geste est du staff (compléter, les menus de placement). */
  exigeStaff: boolean;
  /** La séance du bouton est celle qui se joue, ou qu'on prépare (`seanceDuBouton`). */
  seanceValable: boolean;
  annulee: boolean;
  cloturee: boolean;
  site: string;
};

export const REFUS_STAFF = "⛔ Réservé au staff (bras droits).";

/** Pourquoi ce clic n'a pas le droit de passer, dit à son auteur seul (null : il passe). Dans
 *  l'ordre : le compte (un visiteur n'apprend rien d'autre), le rang, puis la séance. */
export function refusRepartition(g: GardeRepartition): string | null {
  if (g.refus) return reponse(g.refus, { site: g.site });
  if (g.cache && !g.staff) return reponse("compte_cache");
  if (g.exigeStaff && !g.staff) return REFUS_STAFF;
  if (!g.seanceValable) return "⚠️ Cette répartition est celle d'une séance passée.";
  if (g.annulee) return reponse("seance_annulee");
  if (g.cloturee) return reponse("seance_cloturee");
  return null;
}

/** Un bouton public (une salle, une équipe) agit pour LE perso de l'auteur. S'il en a plusieurs
 *  parmi les joueurs, le bouton ne devine pas lequel : 📍 Mes positions a un menu par perso. */
export function refusPlusieurs(miens: number, quoi: "salle" | "equipe"): string | null {
  return miens > 1
    ? `⚠️ Tu as plusieurs persos parmi les joueurs : choisis ${quoi === "salle" ? "les salles" : "l'équipe"} de chacun avec 📍 Mes positions.`
    : null;
}

/** Le menu « 👯 Équipe de … » de 📍 Mes positions. Il montre la place actuelle cochée : la
 *  re-choisir ne la quitte pas (le bouton public, lui, bascule — c'est le geste du modèle). */
export function gesteMonEquipe(valeur: string, actuelle: Place | null | undefined, pseudo: string): { action: ActionRepartition } | { deja: Resultat } {
  if (valeur === "aucune") return actuelle ? { action: { action: "jumeau_retirer", pseudo } } : { deja: { ok: true, message: "Tu n'es dans aucune équipe." } };
  if (!estPlace(valeur)) return { deja: { ok: false, status: 400, message: "Place inconnue." } };
  if (valeur === actuelle) return { deja: { ok: true, message: `Tu es déjà en ${libellePlace(valeur)}.` } };
  return { action: { action: "jumeau", place: valeur, pseudo } };
}

/** Le second menu du staff, Phase 1 : « Libérer la salle » (`0`), ou le joueur qu'on y place —
 *  qui écrase l'occupant (`force`), comme `AssignationView` (bot.py:986-1009). */
export const gesteJoueurSalle = (valeur: string, salle: string): ActionRepartition =>
  valeur === "0" ? { action: "liberer", salle } : { action: "salle", salle, pseudo: valeur, force: true };

/** Le second menu du staff, Phase 2 : une place, un retrait, ou « ech:<pseudo> » — les trois
 *  actions de `placer_jumeau_staff` (bot.py:1026-1060). Null : une valeur qu'on ne connaît pas. */
export function gesteActionStaff(valeur: string, pseudo: string): ActionRepartition | null {
  if (valeur === "retirer") return { action: "jumeau_retirer", pseudo };
  if (valeur.startsWith("ech:") && valeur.length > 4) return { action: "jumeau_echanger", pseudo, avec: valeur.slice(4) };
  return estPlace(valeur) ? { action: "jumeau", place: valeur, pseudo, force: true } : null;
}

/* ── LES MESSAGES À BOUTONS DE LA RÉPARTITION (décision 1 : comme chez Dracarys) ──
   Deux messages vivants dans le salon des Chambres, publiés par le staff (/chambre repartition,
   ou « Publier la répartition » sur le site), modifiés en place à chaque geste, fermés à la
   clôture. Chacun clique ses salles et son équipe ; le staff complète et place. */

export type DonneesPhase1 = {
  cle: string; jour: string; etat: EtatPanneau;
  salles: (Salle & { j: JoueurMsg | null })[];
  /** La consigne en tête (`textes.phase1` du paramétrage, décision 5), variables non remplies. */
  texte: string; vars: Record<string, string>;
  site: string; maj: number;
};

/** `embed_phase1` et `Phase1View` (bot.py:844-853, 944-984). */
export function messagePhase1(d: DonneesPhase1): MessageSeance {
  const ouvert = d.etat === "ouvert";
  const total = d.salles.length, couvertes = d.salles.filter((s) => s.j).length;
  const complet = total > 0 && couvertes === total;
  const texte = remplirTexte(d.texte, d.vars).trim();
  const description = [
    ...(texte ? [texte, ""] : []),
    ...d.salles.map((s) => `**${echapper(s.label)}** → ${s.j ? nomJ(s.j) : "▫️ personne"}`),
    "",
    complet ? `✅ ${couvertes} / ${total} couvertes` : `⚠️ ${couvertes} / ${total} couvertes`,
  ].join("\n");
  // Les salles, cinq par rangée ; une salle prise passe au vert. 20 salles au plus (paramétrage) :
  // quatre rangées, et la cinquième pour les gestes — la limite de Discord.
  const boutons = d.salles.slice(0, 20).map((s) => bouton(ID.salle(d.cle, s.cle), s.label.slice(0, 80), "", s.j ? ButtonStyle.Success : ButtonStyle.Secondary));
  const rangees: Rangee[] = [];
  for (let i = 0; i < boutons.length; i += 5) rangees.push({ type: ComponentType.ActionRow, components: boutons.slice(i, i + 5) });
  rangees.push(...rangee(
    bouton(ID.auto(d.cle), "Compléter (staff)", "", ButtonStyle.Primary),
    bouton(ID.placer(d.cle), "Placer (staff)", "", ButtonStyle.Primary),
    bouton(ID.pos(d.cle), "Mes positions", "📍"),
    lien(d.site && `${d.site}/compositions?onglet=repartition`, "Voir la répartition"),
  ));
  return {
    embeds: [borner({
      title: `🌳 Phase 1 — Asuras (salles) · ${d.jour}${SUFFIXE[d.etat]}`,
      url: d.site ? `${d.site}/compositions?onglet=repartition` : undefined,
      description,
      color: !ouvert ? COULEUR.anthracite : complet ? COULEUR.vert : COULEUR.or,
      footer: { text: `${PIED_CS} · le staff complète et place` },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: ouvert ? rangees : [],
    allowedMentions: AUCUNE,
  };
}

export type DonneesPhase2 = {
  cle: string; jour: string; etat: EtatPanneau;
  equipes: { vert: EquipeJumeaux<JoueurMsg>; rouge: EquipeJumeaux<JoueurMsg>; nonPlaces: JoueurMsg[] };
  ecart: number | null;
  /** La consigne en tête (`textes.phase2` du paramétrage, décision 5), variables non remplies. */
  texte: string; vars: Record<string, string>;
  chiffres: boolean; site: string; maj: number;
};

/** `embed_phase2` et `Phase2View` (bot.py:872-908, 1012-1023), avec l'écart entre les équipes. */
export function messagePhase2(d: DonneesPhase2): MessageSeance {
  const ouvert = d.etat === "ouvert";
  const equipe = (eq: Equipe) => {
    const e = d.equipes[eq];
    const lignes = [
      ...e.tank.map((j) => `🛡️ ${nomJ(j, d.chiffres)}`),
      ...e.mag.map((j) => `🔮 ${nomJ(j, d.chiffres)}`),
      ...e.phy.map((j) => `⚔️ ${nomJ(j, d.chiffres)}`),
    ];
    const totaux = d.chiffres ? [e.totalDps ? `💥 ${chiffreCourt(e.totalDps)}/s` : "", e.pvTank ? `❤️ ${chiffreCourt(e.pvTank)}` : ""].filter(Boolean).join(" · ") : "";
    return [...(lignes.length ? lignes : ["▫️ personne"]), e.manque.length ? `⚠️ Il manque : ${e.manque.join(", ")}` : "", totaux].filter(Boolean).join("\n");
  };
  const niveau = niveauEcart(d.ecart);
  const fields: (APIEmbedField | null)[] = [
    ...EQUIPES.map((eq) => ({ name: `${EMOJI_EQUIPE[eq]} Équipe ${NOM_EQUIPE[eq]}`, value: equipe(eq), inline: true })),
    d.chiffres && d.ecart !== null ? { name: "​", value: `${niveau === "ok" ? "" : "⚠️ "}Écart de dégâts déclarés entre les équipes : ${d.ecart} %` } : null,
    // Leur chiffre DÉCLARÉ aussi (décision 9), comme sur le site : c'est en les plaçant qu'on
    // équilibre les deux équipes.
    d.equipes.nonPlaces.length ? { name: "▫️ Pas encore placés", value: d.equipes.nonPlaces.map((j) => nomJ(j, d.chiffres)).join(" · ") } : null,
  ];
  const complet = !d.equipes.vert.manque.length && !d.equipes.rouge.manque.length;
  const boutonsEquipe = (eq: Equipe): Rangee => ({
    type: ComponentType.ActionRow,
    components: PLACES.filter((p) => equipeDe(p) === eq).map((p) =>
      bouton(ID.jumeau(d.cle, p), libellePlace(p), EMOJI_ROLE[roleDe(p)], eq === "vert" ? ButtonStyle.Success : ButtonStyle.Danger)),
  });
  return {
    embeds: [borner({
      title: `👯 Phase 2 — Jumeaux · ${d.jour}${SUFFIXE[d.etat]}`,
      url: d.site ? `${d.site}/compositions?onglet=repartition` : undefined,
      description: [
        remplirTexte(d.texte, d.vars).trim(),
        d.chiffres ? LEGENDE_CHIFFRES : "",
      ].filter(Boolean).join("\n") || undefined,
      color: !ouvert ? COULEUR.anthracite : complet && niveau !== "fort" ? COULEUR.vert : COULEUR.or,
      fields: fields.filter((f): f is APIEmbedField => !!f),
      footer: { text: `${PIED_CS} · ces équipes servent aussi pour les golems` },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: ouvert ? [
      boutonsEquipe("vert"), boutonsEquipe("rouge"),
      ...rangee(
        bouton(ID.echanger(d.cle), "Placer · échanger (staff)", "", ButtonStyle.Primary),
        // Lot 10 : un tank par équipe, puis les DPS au plus près de dégâts déclarés égaux —
        // après une confirmation éphémère qui montre le résultat.
        bouton(ID.equilibrer(d.cle), "Équilibrer (staff)", "", ButtonStyle.Primary),
        bouton(ID.pos(d.cle), "Mes positions", "📍"),
        lien(d.site && `${d.site}/compositions?onglet=repartition`, "Voir la répartition"),
      ),
    ] : [],
    allowedMentions: AUCUNE,
  };
}

/* ── LES MENUS DU STAFF, EN DEUX TEMPS (`AssignationView`, `StaffJumeauView`, bot.py:986-1116) ──
   Sans état : le premier choix (la salle, le joueur) part dans l'identifiant du second menu. */

/** 1. La salle (avec son occupant). */
export function menuChoixSalle(cle: string, salles: (Salle & { occupant: string | null })[], choisie?: string): Rangee {
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.StringSelect, custom_id: ID.choixSalle(cle), placeholder: "1. La salle…", min_values: 1, max_values: 1,
      options: salles.slice(0, 25).map((s) => ({
        label: s.label.slice(0, 100), value: s.cle, description: (s.occupant ? `tenue par ${s.occupant}` : "libre").slice(0, 100), default: s.cle === choisie,
      })),
    }],
  };
}

/** 2. Le joueur (ou « Libérer »). */
export function menuJoueurSalle(cle: string, salle: string, joueurs: Pick<JoueurMsg, "pseudo" | "classe">[], occupant: string | null): Rangee | null {
  const custom_id = ID.joueurSalle(cle, salle);
  if (custom_id.length > 100) return null;
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.StringSelect, custom_id, placeholder: "2. …à qui ?", min_values: 1, max_values: 1,
      options: [
        { label: "Libérer la salle", value: "0", description: "personne ne la tient plus" },
        ...joueurs.slice(0, 24).map((j) => ({
          label: j.pseudo.slice(0, 100), value: j.pseudo.slice(0, 100), emoji: emojiObjet(emojiClasse(j.classe)),
          description: NOMS_CLASSES[j.classe] ?? j.classe, default: cleJoueur(j.pseudo) === occupant,
        })),
      ],
    }],
  };
}

/** 1. Le joueur (avec sa place). */
export function menuChoixJoueur(cle: string, joueurs: Pick<JoueurMsg, "pseudo" | "classe">[], r: Repartition, choisi?: string): Rangee {
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.StringSelect, custom_id: ID.choixJoueur(cle), placeholder: "1. Le joueur…", min_values: 1, max_values: 1,
      options: joueurs.slice(0, 25).map((j) => {
        const p = r.jumeaux[cleJoueur(j.pseudo)];
        return {
          label: j.pseudo.slice(0, 100), value: j.pseudo.slice(0, 100), emoji: emojiObjet(emojiClasse(j.classe)),
          description: p ? libellePlace(p) : "pas encore placé", default: !!choisi && cleJoueur(j.pseudo) === cleJoueur(choisi),
        };
      }),
    }],
  };
}

/** 2. Sa place, un retrait, ou un échange avec un joueur déjà placé. */
export function menuActionJumeau(cle: string, j: Pick<JoueurCS, "pseudo" | "classe" | "roles">, joueurs: Pick<JoueurMsg, "pseudo">[], r: Repartition): Rangee | null {
  const custom_id = ID.actionJumeau(cle, j.pseudo);
  if (custom_id.length > 100) return null;
  const k = cleJoueur(j.pseudo);
  const actuelle = r.jumeaux[k];
  const options: APISelectMenuOption[] = [
    ...placesPermises(j).map((p) => ({ label: libellePlace(p), value: p, emoji: { name: EMOJI_EQUIPE[equipeDe(p)] }, default: p === actuelle })),
    ...(actuelle ? [{ label: "Retirer de son équipe", value: "retirer" }] : []),
    ...joueurs.filter((x) => cleJoueur(x.pseudo) !== k && r.jumeaux[cleJoueur(x.pseudo)]).map((x) => ({
      label: `Échanger avec ${x.pseudo} (${libellePlace(r.jumeaux[cleJoueur(x.pseudo)])})`.slice(0, 100), value: `ech:${x.pseudo}`.slice(0, 100),
    })),
  ].slice(0, 25);
  return {
    type: ComponentType.ActionRow,
    components: [{ type: ComponentType.StringSelect, custom_id, placeholder: "2. …va où ?", min_values: 1, max_values: 1, options }],
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 5 — M6 LE CHRONO (message vivant, boutons réservés au staff ; §4.9, §8.3)
   Il remplace `embed_chrono` et `ChronoView` (bot.py:1800-1845). Le contenu vient de
   `etatChrono` (lib/chambres) : l'onglet Chrono du site montre la même chose, calculée de la
   même façon. Le message ne change qu'à un clic (ici ou sur le site) : « en cours depuis »
   s'écrit `<t:…:R>`, que Discord fait défiler tout seul, sans modifier le message.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export type DonneesChrono = {
  cle: string;
  /** « mercredi 22 octobre ». */
  jour: string;
  etat: EtatPanneau;
  chrono: Chrono;
  /** Les étapes FIGÉES de la séance (au premier « Démarrer »), sinon celles du paramétrage. */
  etapes: Etape[];
  /** La phrase d'attente : le texte du rappel « chrono » du paramétrage (décision 5). */
  texte: string; vars: Record<string, string>;
  /** Les joueurs de la séance, avec leurs chiffres DÉCLARÉS quand le salon le permet (décision 9). */
  joueurs: JoueurMsg[];
  chiffres: boolean;
  site: string;
  /** L'heure de l'envoi (ms) : elle ne sert qu'à l'horodatage de l'embed. */
  maj: number;
};

const unix = (ms: number) => Math.floor(ms / 1000);
/** Un nom de monstre dans un lien Markdown : ni crochet ni parenthèse qui casserait le lien. */
const nomMonstre = (n: string) => echapper(n.replace(/[[\]()]/g, ""));

/** « ↳ contre : Kraavus, titan putréfié · Kraavos, titan maudit » — les adversaires de l'étape
 *  (décision 8), chacun menant à sa fiche publique /monstres/{id} quand il en a une. « ↳ » n'est
 *  pas un émoji : il rattache la ligne à l'étape au-dessus, sans rien dire de plus. */
export function ligneMonstres(e: Pick<Etape, "monstres">, site: string): string {
  if (!e.monstres.length) return "";
  const noms = e.monstres.map((m) => (m.id && site ? `[${nomMonstre(m.nom)}](${site}/monstres/${encodeURIComponent(m.id)})` : nomMonstre(m.nom)));
  return `\u3000↳ contre : ${noms.join(" · ")}`;
}

export function messageChrono(d: DonneesChrono): MessageSeance {
  const v = etatChrono(d.chrono, d.etapes, d.maj);
  const ouvert = d.etat === "ouvert";
  const c = d.chrono;
  const texte = remplirTexte(d.texte, d.vars).trim();
  const tete = !d.etapes.length ? "⚠️ Aucune étape : règle-les dans le paramétrage des événements."
    : v.statut === "attente" ? `▶️ ${texte || "Un membre du staff clique sur Démarrer au lancement de l'instance."}`
      : v.statut === "en_cours" ? `Départ à <t:${unix(c.debut!)}:T> · chronométreur : ${echapper(c.par || "le staff")}`
        : !c.fins.length ? "🏁 Arrêté avant la fin de la première étape."
          : `🏁 Terminé en ${fmtDuree(v.total)}${v.arreteAvantFin ? " (arrêté avant la fin)" : ""}`;
  const lignes: string[] = [];
  v.lignes.forEach((l, i) => {
    const nom = `${l.etape.emoji} ${l.etape.code} ${echapper(l.etape.label)}`;
    lignes.push(l.statut === "fait" ? `✅ ${nom} — **${fmtDuree(l.duree)}**`
      : l.statut === "en_cours" ? `▶️ **${nom}** — en cours depuis <t:${unix(v.depuis!)}:R>`
        : `▫️ ${nom}`);
    // Les monstres de l'étape EN COURS — avant le départ, ceux de la première.
    if (i === v.courante) { const m = ligneMonstres(l.etape, d.site); if (m) lignes.push(m); }
  });
  const description = [tete, "", ...lignes, ...(d.chiffres && d.joueurs.length ? ["", LEGENDE_CHIFFRES] : [])].join("\n");
  const fields: APIEmbedField[] = d.joueurs.length
    ? [{ name: `👥 Ce soir (${d.joueurs.length})`, value: d.joueurs.map((j) => nomJ(j, d.chiffres)).join(" · ") }]
    : [];
  const site = d.site ? `${d.site}/compositions?onglet=chrono` : "";
  const e = v.lignes[v.courante ?? -1]?.etape;
  return {
    embeds: [borner({
      title: `⏱️ Chrono — Chambre du ${d.jour}${SUFFIXE[d.etat]}`,
      url: site || undefined,
      description,
      color: !ouvert ? COULEUR.anthracite : v.statut === "en_cours" ? COULEUR.or : v.statut === "termine" ? COULEUR.vert : COULEUR.crimson,
      fields,
      footer: { text: `${PIED_CS} · seul le staff fait avancer le chrono` },
      timestamp: new Date(d.maj).toISOString(),
    })],
    // Les boutons qui ont un sens, et eux seuls (les trois états du §8.3) ; « Effacer » n'est
    // que sur le site, après une confirmation.
    components: ouvert ? rangee(
      v.statut === "attente" && v.principal.actif ? bouton(ID.chrono(d.cle, "suivante", v.repere), "Démarrer", "▶️", ButtonStyle.Success) : null,
      v.statut === "en_cours" && e ? bouton(ID.chrono(d.cle, "suivante", v.repere), `Fin : ${e.code} ${e.label}`.slice(0, 80), "⏭️", ButtonStyle.Success) : null,
      v.annuler ? bouton(ID.chrono(d.cle, "annuler", v.repere), "Annuler le dernier clic", "↩️") : null,
      v.arreter ? bouton(ID.chrono(d.cle, "arreter", v.repere), "Arrêter", "⏹️", ButtonStyle.Danger) : null,
      lien(site, "Suivre sur le site"),
    ) : [],
    allowedMentions: AUCUNE,
  };
}

/** Le clic d'un bouton du chrono (`cs:chrono:<clé>:<geste>:<repère>`), relu sans confiance. */
export function clicChronoDuBouton(reste: string): { ok: true; action: ActionChrono; vu: number } | { ok: false } {
  const [action, vu] = reste.split(":");
  const lu = lireClicChrono({ action, vu });
  return lu.ok ? lu : { ok: false };
}

/** Le refus d'un clic sur le chrono, dit à son auteur seul (null : il passe). Le staff seul fait
 *  avancer le chrono (`bot.py:1857-1859` : chez nous, seul le staff le lance) ; « Effacer » n'est
 *  pas un bouton de Discord. */
export function refusChrono(g: { staff: boolean; refusSeance: string | null; action: ActionChrono; site: string }): string | null {
  if (!g.staff) return `⛔ Seul le staff fait avancer le chrono.${g.site ? ` Suis-le sur le site : ${g.site}/compositions?onglet=chrono` : ""}`;
  if (g.refusSeance) return `⚠️ ${g.refusSeance}`;
  if (g.action === "reinitialiser") return "⚠️ Effacer tout le chrono se fait sur le site (onglet Chrono), après une confirmation.";
  return null;
}

/** Un clic en retard : l'état avait bougé (un autre membre du staff, ici ou sur le site). */
export const CHRONO_EN_RETARD = "⚠️ Le chrono a déjà avancé. Le message est à jour.";

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 6 bis — LA CLÔTURE ET LE DÉBRIEF DEPUIS DISCORD (décision 1 de Maxime ; §4.8, §4.10)
   Comme `ClotureView`, `DebriefView`, `EtapeModal` et `ARetenirModal` du modèle
   (bot.py:1389-1445, :1910-2062) : le staff coche qui était là, puis note chaque étape (statut,
   chrono, remarque), dit gagné ou perdu, écrit « à retenir » et publie — dans un message
   ÉPHÉMÈRE que lui seul voit. Le site fait la même chose (onglets Inscription et Bilans), sur la
   même base : les écritures passent par `cloturerSeance`, `modifierDebrief` et
   `marquerDebriefPublie` (lib/seances-serveur), sous le même verrou de version.

   SANS ÉTAT, comme tout le reste (§8.1) : le parcours ne garde rien en mémoire. L'étape montrée
   voyage dans l'identifiant de chaque bouton (son CODE, pas son rang : une liste pas encore figée
   peut changer entre deux clics), les cochés de la clôture dans les menus du message lui-même,
   et une EMPREINTE de ce qui était affiché dans le bouton « Valider » et dans chaque fenêtre de
   saisie : si la liste des participants, ou la saisie d'un autre membre du staff, a bougé entre-
   temps, rien n'est écrit, le message se remet à jour et le dit. Un redémarrage du bot ne casse
   donc aucun parcours ouvert.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Une empreinte courte (FNV-1a, 32 bits, en base 36) de ce qu'un message montrait : elle part
 *  dans un identifiant (100 signes au plus) et se recalcule au clic. */
export function empreinte(...parts: string[]): string {
  let h = 0x811c9dc5;
  for (const c of parts.join("\u0001")) { h ^= c.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

export const ID_BILAN = {
  // La clôture : qui était là (participants), qui est venu quand même (annoncés non retenus).
  presents: (cle: string) => `cs:clotp:${cle}`,
  ajoutes: (cle: string) => `cs:clota:${cle}`,
  valider: (cle: string, h: string) => `cs:clotv:${cle}:${h}`,
  rouvrir: (cle: string) => `cs:clotr:${cle}`,
  cloture: (cle: string) => `cs:cloto:${cle}`,
  // Le débrief : l'étape montrée, puis le geste. Un code d'étape vide : la première pas notée.
  voir: (cle: string, code: string) => `cs:debv:${cle}:${code}`,
  // Bien, Moyen, Mal et Gagné, Perdu portent aussi ce que le message MONTRAIT (« - » : rien) :
  // si un autre membre du staff l'a changé depuis, ici ou sur le site, le clic est refusé et le
  // message se remet à jour (`AvantDebrief`) — recliquer « Bien » pour le retirer n'efface pas
  // le « Mal » posé entre-temps par un autre.
  statut: (cle: string, code: string, s: StatutEtape, vu: StatutEtape | null) => `cs:debs:${cle}:${code}:${s}:${vu ?? "-"}`,
  chrono: (cle: string, code: string) => `cs:debc:${cle}:${code}`,
  retenir: (cle: string, code: string) => `cs:debr:${cle}:${code}`,
  issue: (cle: string, code: string, x: IssueSeance, vu: IssueSeance | null) => `cs:debi:${cle}:${code}:${x}:${vu ?? "-"}`,
  publier: (cle: string, code: string) => `cs:debp:${cle}:${code}`,
  brouillon: (cle: string, code: string, confirme = false) => `cs:debb:${cle}:${code}${confirme ? ":ok" : ""}`,
  aller: (cle: string) => `cs:deba:${cle}`,
  // Les fenêtres de saisie (`EtapeModal`, `ARetenirModal`), avec l'empreinte de ce qu'elles montraient.
  modalEtape: (cle: string, code: string, h: string) => `cs:mdeb:${cle}:${code}:${h}`,
  modalRetenir: (cle: string, code: string, h: string) => `cs:mret:${cle}:${code}:${h}`,
};

/** Un bouton grisé : il dit qu'il existe, et pourquoi il ne sert pas maintenant (le texte). */
const grise = (b: Bouton): Bouton => ({ ...b, disabled: true } as Bouton);

/** Le chiffre FIGÉ d'un joueur (clôture, débrief) : ❤️ des PV, 💥 des dégâts/s, 📏 à remesurer,
 *  ❔ sans mesure — les chiffres retenus sont déjà ceux de son poste ce soir-là. */
export function ligneFigee(chiffres: ChiffreFige[]): string {
  return ligneChiffre(chiffres, { mesure: chiffres.map((c) => c.role) });
}

/** « Arcaniste », pour une option de menu (le nom de la classe, sans émoji). */
const nomClasse = (cle: string) => {
  const k = sansAccent(cle).toUpperCase();
  const cl = Object.keys(NOMS_CLASSES).find((x) => x.toUpperCase() === k) ?? cle;
  return NOMS_CLASSES[cl] ?? cle;
};

/** « 22/10 à 23:10 », à l'heure de Paris. */
const leA = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" })} à ${d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}`;
};

/* ── La garde : le staff, relu EN BASE (le serveur compte aussi des visiteurs, des candidats et
      des amis : la clôture et le débrief montrent les joueurs et leurs chiffres) ── */

/** Pourquoi ce geste de clôture ou de débrief n'a pas le droit de passer (null : il passe). Le
 *  compte d'abord — un visiteur n'apprend rien d'autre —, puis le rang. */
export function refusStaffDiscord(g: { refus: "compte_non_lie" | "reserve_membres" | null; staff: boolean; site: string }): string | null {
  if (g.refus === "compte_non_lie") return reponse("compte_non_lie", { site: g.site });
  if (g.refus) return reponse("reserve_membres", { quoi: "La clôture et le débrief des Chambres sont réservés" });
  if (!g.staff) return REFUS_STAFF;
  return null;
}

/** La séance que vise `/chambre cloturer seance:…` ou `/chambre debrief seance:…` : une Chambre
 *  déjà commencée (on clôture et on débriefe une séance jouée). Sans choix : la dernière
 *  commencée (`cs_derniere`, §2.5) — le jeudi à 9 h, c'est encore le mercredi. */
export function seanceDeLaCommande(valeur: string | null | undefined, now: Date): { ok: true; seance: SeanceParis } | { ok: false; texte: string } {
  const r = resoudreCle(valeur?.trim() || "cs_derniere", now);
  if (!r.ok || r.seance.evenement !== "cs") return { ok: false, texte: "⚠️ Séance inconnue : choisis-la dans la liste qui s'ouvre sous la commande." };
  if (r.seance.debut.getTime() > now.getTime()) return { ok: false, texte: `⚠️ La séance du ${r.seance.label} n'a pas encore eu lieu : on clôture et on débriefe une séance jouée.` };
  return { ok: true, seance: r.seance };
}

/** Les choix de l'option `seance` (autocomplétion, 25 au plus) : les dernières séances
 *  commencées, la plus récente d'abord, avec ce qu'on en sait (clôturée, débrief publié…). */
export function choixSeances(
  recentes: Pick<SeanceParis, "cle" | "label">[], etats: Map<string, { cloturee: boolean; publie: boolean; annulee: boolean }>, saisie: string,
): { name: string; value: string }[] {
  const q = sansAccent(saisie).toLowerCase().trim();
  return recentes.map((s, i) => {
    const e = etats.get(s.cle);
    const etat = e?.annulee ? " · annulée" : [e?.cloturee ? "clôturée" : "", e?.publie ? "débrief publié" : ""].filter(Boolean).map((x) => ` · ${x}`).join("");
    return { name: `${s.label}${i === 0 ? " — la dernière" : ""}${etat}`.slice(0, 100), value: s.cle };
  }).filter((c) => !q || sansAccent(c.name).toLowerCase().includes(q)).slice(0, 25);
}

/** Avant la bascule (§8.10), le bot Python tient encore la clôture et le débrief dans Discord :
 *  notre commande garde la porte du site, comme au lot 3 — sur la séance choisie dans la
 *  commande (`?cloture=<clé>`), pas toujours sur la dernière. */
export function clotureAvantBascule(s: Pick<SeanceParis, "cle" | "label">, site: string): { content: string; components: Rangee[]; allowedMentions: Mentions } {
  return {
    content: `🏰 Clôturer la Chambre du ${s.label} — cocher qui était là :\n-# Dans Discord, la clôture s'ouvre avec les nouveaux messages : arrête d'abord le bot Python, puis allume « Messages de notre bot » dans le paramétrage des événements.`,
    components: rangee(lien(site && `${site}/compositions?onglet=inscription&cloture=${s.cle}`, "Ouvrir la clôture")),
    allowedMentions: AUCUNE,
  };
}
export function debriefAvantBascule(s: Pick<SeanceParis, "cle" | "label">, site: string): { content: string; components: Rangee[]; allowedMentions: Mentions } {
  return {
    content: `📝 Le débrief de la Chambre du ${s.label} :\n-# Dans Discord, le débrief s'ouvre avec les nouveaux messages : arrête d'abord le bot Python, puis allume « Messages de notre bot » dans le paramétrage des événements.`,
    components: rangee(lien(site && `${site}/compositions?onglet=bilans&seance=${s.cle}`, "Ouvrir le débrief")),
    allowedMentions: AUCUNE,
  };
}

/* ── LA CLÔTURE (`ClotureView`, bot.py:1389-1445) ── */

export type JoueurCloture = { pseudo: string; classe: string; player: string; poste: string | null; chiffres: ChiffreFige[]; sansCompte: boolean };

export type DonneesCloture = {
  cle: string; label: string;
  commencee: boolean; annulee: boolean; motif: string | null;
  cloturee: boolean; clotureAt: number | null; cloturePar: string | null;
  /** « retenus » dès que le staff en a retenu un ; « annonces » sinon (Q3). */
  source: "retenus" | "annonces";
  /** Les participants (cochés par défaut) et les annoncés non retenus (qu'on peut ajouter). Jamais
   *  un ami ni un membre caché : `participantsSeance` les a écartés. */
  participants: JoueurCloture[]; autres: JoueurCloture[]; exclus: number;
  /** Les cochés : des pseudos. */
  coches: string[]; ajoutes: string[];
  /** Les dégâts DÉCLARÉS (décision 9) : le paramétrage `degats.discord`. */
  chiffres: boolean;
  /** La consigne (`textes.cloture` du paramétrage, décision 5), variables non remplies. */
  texte: string; vars: Record<string, string>;
  site: string;
  /** Le verdict du dernier geste, au-dessus du message. */
  note?: string;
};

/** Discord n'accepte que 25 options par menu. Au-delà, la clôture se fait sur le site. */
export const MAX_MENU = 25;

/** Ce qui était affiché : la liste des participants et celle des annoncés non retenus. Le bouton
 *  « Valider » la porte ; si elle a changé au clic (un retenu de plus, un annoncé de moins), on
 *  n'écrit rien — sinon un nouveau participant, absent du menu, serait noté absent sans que
 *  personne l'ait décoché. */
export const empreinteCloture = (participants: string[], autres: string[]) =>
  empreinte([...participants].map(cleJoueur).sort().join(","), [...autres].map(cleJoueur).sort().join(","));

/** Le refus de « Valider » quand la liste a bougé depuis l'ouverture : rien n'est écrit, le
 *  message se remet à jour et garde les cochés de chacun. */
export const LISTE_CHANGEE = "La liste a changé depuis l'ouverture (un retenu de plus ou de moins) : vérifie les cochés, puis valide de nouveau.";

/** Les cochés à l'ouverture : tout le monde, ou — séance déjà clôturée — ce que la clôture a
 *  constaté (comme l'onglet Inscription du site). */
export function selectionInitiale(
  participants: { pseudo: string }[], autres: { pseudo: string }[], constat: { pseudo: string; present: boolean | null }[] | null,
): { coches: string[]; ajoutes: string[] } {
  const c = new Map((constat ?? []).map((l) => [cleJoueur(l.pseudo), l.present]));
  return {
    coches: participants.filter((p) => !constat || c.get(cleJoueur(p.pseudo)) !== false).map((p) => p.pseudo),
    ajoutes: constat ? autres.filter((p) => c.get(cleJoueur(p.pseudo)) === true).map((p) => p.pseudo) : [],
  };
}

/** Ce que le message de clôture portait au clic : ses deux menus (les options montrées, et
 *  celles qui étaient cochées) et l'empreinte de son bouton « Valider ». */
export type SelectionLue = { vus: { participants: string[]; autres: string[] }; coches: string[]; ajoutes: string[]; empreinte: string | null };

/** Relit la clôture dans les rangées du message (leur JSON). Les cochés sont l'état du message
 *  lui-même : chaque choix dans un menu le remet à jour. */
export function lireSelectionCloture(rangees: unknown, cle: string): SelectionLue {
  const out: SelectionLue = { vus: { participants: [], autres: [] }, coches: [], ajoutes: [], empreinte: null };
  for (const r of Array.isArray(rangees) ? rangees : []) {
    for (const c of ((r as { components?: unknown[] })?.components ?? []) as Record<string, unknown>[]) {
      const id = typeof c.custom_id === "string" ? c.custom_id : "";
      const options = Array.isArray(c.options) ? (c.options as { value?: unknown; default?: unknown }[]) : [];
      const valeurs = options.map((o) => String(o.value ?? "")).filter(Boolean);
      const coches = options.filter((o) => o.default === true).map((o) => String(o.value ?? "")).filter(Boolean);
      if (id === ID_BILAN.presents(cle)) { out.vus.participants = valeurs; out.coches = coches; }
      else if (id === ID_BILAN.ajoutes(cle)) { out.vus.autres = valeurs; out.ajoutes = coches; }
      else if (id.startsWith(`cs:clotv:${cle}:`)) out.empreinte = id.slice(`cs:clotv:${cle}:`.length) || null;
    }
  }
  return out;
}

/**
 * Les cochés après un choix dans un menu (`menu`, `valeurs`), sur les listes ACTUELLES. Un joueur
 * déjà montré garde son état ; un participant apparu depuis est coché (comme à l'ouverture), un
 * annoncé apparu depuis ne l'est pas. Un joueur passé d'une liste à l'autre (retenu entre-temps)
 * garde l'état qu'il avait.
 */
export function selectionApres(
  lue: SelectionLue, actuels: { participants: string[]; autres: string[] }, choix?: { menu: "presents" | "ajoutes"; valeurs: string[] },
): { coches: string[]; ajoutes: string[] } {
  const coches = choix?.menu === "presents" ? choix.valeurs : lue.coches;
  const ajoutes = choix?.menu === "ajoutes" ? choix.valeurs : lue.ajoutes;
  const avant = new Set([...coches, ...ajoutes].map(cleJoueur));
  const vus = new Set([...lue.vus.participants, ...lue.vus.autres].map(cleJoueur));
  return {
    coches: actuels.participants.filter((p) => (vus.has(cleJoueur(p)) ? avant.has(cleJoueur(p)) : true)),
    ajoutes: actuels.autres.filter((p) => vus.has(cleJoueur(p)) && avant.has(cleJoueur(p))),
  };
}

const optionJoueur = (j: JoueurCloture, coche: boolean, chiffres: boolean): APISelectMenuOption => ({
  label: j.pseudo.slice(0, 100), value: j.pseudo.slice(0, 100), emoji: emojiObjet(emojiClasse(j.classe)), default: coche,
  description: [nomClasse(j.classe), j.poste ? `poste ${j.poste}` : "sans poste", chiffres ? ligneFigee(j.chiffres) : ""].filter(Boolean).join(" · ").slice(0, 100),
});

const ligneJoueurCloture = (j: JoueurCloture, marque: string, chiffres: boolean) =>
  `${marque} ${emojiClasse(j.classe)} **${echapper(j.pseudo)}** · ${j.poste ? echapper(j.poste) : "sans poste"}${chiffres ? ` · ${ligneFigee(j.chiffres)}` : ""}${j.sansCompte ? " · aucun compte ne porte ce perso" : ""}`;

/** La clôture d'une séance (éphémère, staff) : deux menus — les participants, tous cochés ; les
 *  annoncés non retenus, venus quand même —, puis « Valider ». La liste dans l'embed dit qui est
 *  coché, avec le poste et le chiffre DÉCLARÉ de chacun (décision 9). */
export function messageCloture(d: DonneesCloture): MessageSeance {
  const k = (l: string[]) => new Set(l.map(cleJoueur));
  const coches = k(d.coches), ajoutes = k(d.ajoutes);
  const nPresents = d.participants.filter((p) => coches.has(cleJoueur(p.pseudo))).length + d.autres.filter((p) => ajoutes.has(cleJoueur(p.pseudo))).length;
  const nAbsents = d.participants.length - d.participants.filter((p) => coches.has(cleJoueur(p.pseudo))).length;
  const trop = d.participants.length > MAX_MENU;
  const personne = !d.participants.length && !d.autres.length;
  const bloque = d.annulee || !d.commencee || personne || trop;

  const tete = d.annulee ? `🚫 Séance annulée${d.motif ? ` — ${echapper(d.motif)}` : ""} : rétablis-la sur le site avant de la clôturer.`
    : !d.commencee ? "⚠️ Cette séance n'a pas encore commencé : on clôture une séance jouée."
      : personne ? "▫️ Personne ne s'est annoncé pour cette séance : il n'y a rien à clôturer."
        : trop ? `⚠️ ${d.participants.length} participants : un menu Discord n'en montre que ${MAX_MENU}. Clôture cette séance sur le site.`
          : d.cloturee ? `✅ Déjà clôturée${d.clotureAt ? ` le ${leA(d.clotureAt)}` : ""}${d.cloturePar ? ` par ${echapper(d.cloturePar)}` : ""}. Valider de nouveau **remplace** la clôture ; « Rouvrir » rend la répartition modifiable.`
            : remplirTexte(d.texte, d.vars).trim() || "Décoche les absents, puis valide.";
  const description = [
    tete,
    ...(personne ? [] : ["", `👥 **${nPresents} présent${nPresents > 1 ? "s" : ""}**${nAbsents ? ` · ❌ ${nAbsents} absent${nAbsents > 1 ? "s" : ""}` : ""}`]),
    ...(d.exclus ? [`-# ${d.exclus} annonce${d.exclus > 1 ? "s" : ""} d'un compte hors de la guilde, inactif ou caché n'apparai${d.exclus > 1 ? "ssent" : "t"} pas.`] : []),
    ...(d.chiffres && !personne ? [LEGENDE_CHIFFRES] : []),
  ].join("\n");
  const fields: APIEmbedField[] = [];
  if (d.participants.length) {
    fields.push({
      name: `${d.source === "retenus" ? "Les retenus du staff" : "Personne n'a été retenu : les annoncés"} (${d.participants.length})`,
      value: d.participants.map((p) => ligneJoueurCloture(p, coches.has(cleJoueur(p.pseudo)) ? "✅" : "❌", d.chiffres)).join("\n"),
    });
  }
  if (d.autres.length) {
    fields.push({
      name: `Annoncés non retenus — venus quand même ? (${d.autres.length})`,
      value: d.autres.map((p) => ligneJoueurCloture(p, ajoutes.has(cleJoueur(p.pseudo)) ? "✅" : "▫️", d.chiffres)).join("\n")
        + (d.autres.length > MAX_MENU ? `\n-# Le menu n'en montre que ${MAX_MENU} : ajoute les autres sur le site.` : ""),
    });
  }

  const components: Rangee[] = [];
  if (!bloque && d.participants.length) {
    components.push({ type: ComponentType.ActionRow, components: [{
      type: ComponentType.StringSelect, custom_id: ID_BILAN.presents(d.cle), placeholder: "Qui était là ? Décoche les absents",
      min_values: 0, max_values: d.participants.length, options: d.participants.map((p) => optionJoueur(p, coches.has(cleJoueur(p.pseudo)), d.chiffres)),
    }] });
  }
  if (!bloque && d.autres.length) {
    const montres = d.autres.slice(0, MAX_MENU);
    components.push({ type: ComponentType.ActionRow, components: [{
      type: ComponentType.StringSelect, custom_id: ID_BILAN.ajoutes(d.cle), placeholder: "Venus quand même ? (annoncés non retenus)",
      min_values: 0, max_values: montres.length, options: montres.map((p) => optionJoueur(p, ajoutes.has(cleJoueur(p.pseudo)), d.chiffres)),
    }] });
  }
  const valider = bouton(ID_BILAN.valider(d.cle, empreinteCloture(d.participants.map((p) => p.pseudo), d.autres.map((p) => p.pseudo))),
    d.cloturee ? "Clôturer de nouveau" : "Valider la clôture", "✅", ButtonStyle.Success);
  components.push(...rangee(
    bloque ? grise(valider) : valider,
    d.cloturee && d.commencee ? bouton(ID_BILAN.rouvrir(d.cle), "Rouvrir la séance", "") : null,
    d.cloturee ? bouton(ID_BILAN.voir(d.cle, ""), "Faire le débrief", "📝", ButtonStyle.Primary) : null,
    lien(d.site && `${d.site}/compositions?onglet=inscription&cloture=${d.cle}`, "Ouvrir sur le site"),
  ));
  return {
    // Toujours posé, même vide : modifier le message éphémère sans `content` y laisserait le
    // verdict du geste d'avant.
    content: d.note ?? "",
    embeds: [borner({
      title: `🏰 Clôture — Chambre du ${d.label}`,
      description, fields,
      color: d.annulee || d.cloturee ? COULEUR.anthracite : COULEUR.crimson,
      footer: { text: `${PIED_CS} · seul le staff voit ce message` },
    })],
    components,
    allowedMentions: AUCUNE,
  };
}

/** Après la validation : qui était là, qui ne l'était pas — puis « On fait le débrief ? »
 *  (`ProposerDebriefView`, bot.py:1421-1423, :2174-2181). */
export function messageClotureFaite(d: { cle: string; label: string; message: string; lignes: { pseudo: string; present: boolean }[]; site: string }): MessageSeance {
  const presents = d.lignes.filter((l) => l.present).map((l) => echapper(l.pseudo));
  const absents = d.lignes.filter((l) => !l.present).map((l) => echapper(l.pseudo));
  return {
    content: "",
    embeds: [borner({
      title: `✅ Chambre du ${d.label} clôturée`,
      description: `${d.message}\nChacun retrouve ses participations dans l'onglet Bilans.\n\n**On fait le débrief ?** Tu peux aussi le reprendre plus tard avec \`/chambre debrief\`.`,
      fields: [
        { name: `✅ Présents (${presents.length})`, value: presents.join(" · ") || "▫️ personne" },
        ...(absents.length ? [{ name: `❌ Absents (${absents.length})`, value: absents.join(" · ") }] : []),
      ],
      color: COULEUR.anthracite,
      footer: { text: `${PIED_CS} · seul le staff voit ce message` },
    })],
    components: rangee(
      bouton(ID_BILAN.voir(d.cle, ""), "Faire le débrief maintenant", "📝", ButtonStyle.Primary),
      bouton(ID_BILAN.cloture(d.cle), "Corriger la clôture", ""),
      lien(d.site && `${d.site}/compositions?onglet=bilans&seance=${d.cle}`, "Voir les bilans"),
    ),
    allowedMentions: AUCUNE,
  };
}

/* ── LE DÉBRIEF, ÉTAPE PAR ÉTAPE (`texte_wizard`, `DebriefView`, bot.py:1910-2017) ── */

/** 🟢 bien · 🟠 moyen · 🔴 mal · ⚪ pas noté (§8.2). */
export const EMOJI_STATUT: Record<StatutEtape, string> = { bien: "🟢", moyen: "🟠", mal: "🔴" };
const pastille = (s: StatutEtape | null) => (s ? EMOJI_STATUT[s] : "⚪");
/** ⚡ plus rapide · 🐌 plus lent · 🟰 même temps que la séance publiée juste avant (§8.2). */
const emojiEcart = (e: Ecart) => (e.signe < 0 ? "⚡" : e.signe > 0 ? "🐌" : "🟰");

export type JoueurBilan = { pseudo: string; classe: string; present: boolean | null; chiffres: ChiffreFige[]; salles: string[]; jumeau: Place | null };

export type DonneesDebrief = {
  cle: string;
  /** « mercredi 22 octobre ». */
  jour: string;
  /** Le code de l'étape montrée (`etapeCourante`). */
  code: string;
  lignes: LigneDebrief[]; phases: Record<string, string>;
  resultat: IssueSeance | null; aRetenir: string; total: number; complet: boolean; manquants: string[];
  analyse: (AnalyseDebrief & { precedentLabel: string | null }) | null;
  publie: boolean; publieLe: number | null; par: string | null;
  annulee: boolean; motif: string | null; commencee: boolean;
  /** La liste des étapes est figée dans la séance (à la première note, ou au départ du chrono). */
  figees: boolean;
  /** Ni note, ni résultat, ni « à retenir » : rien à publier. */
  rienDeNote: boolean;
  cloturee: boolean;
  /** Combien ils étaient : les présents de la clôture, sinon le nombre d'un débrief importé. */
  nbJoueurs: number | null; importe: boolean;
  /** Les joueurs que la clôture a figés, avec leurs chiffres DÉCLARÉS ce soir-là (décision 9). */
  joueurs: JoueurBilan[];
  salles: { cle: string; label: string }[];
  chiffres: boolean;
  site: string;
  /** La consigne du parcours (`textes.debrief` du paramétrage, décision 5), variables non remplies. */
  texte: string; vars: Record<string, string>;
  /** « Repasser en brouillon ? » attend sa confirmation. */
  confirmerBrouillon?: boolean;
  note?: string;
  maj: number;
};

/** L'étape à montrer : celle dont le code est demandé ; sans code (ou un code que la séance ne
 *  compte plus), la première pas encore notée — comme « Faire le débrief » sur le site. */
export function etapeCourante(lignes: Pick<LigneDebrief, "etape" | "statut">[], code: string): number {
  const i = code ? lignes.findIndex((l) => l.etape.code === code) : -1;
  if (i >= 0) return i;
  return Math.max(0, lignes.findIndex((l) => !l.statut));
}

/** Un clic sur Bien, Moyen ou Mal (`noter`, bot.py:1961-1966) : la note s'enregistre et l'on
 *  passe à l'étape suivante (on s'arrête à la dernière). Recliquer la note déjà posée la RETIRE,
 *  sans changer d'étape — comme sur le site. `vu` : la note que le message MONTRAIT (portée par
 *  le bouton) ; c'est elle que le geste bascule, et le patch l'emporte (`avant`) pour être
 *  refusé si elle a changé depuis. Sans `vu` (un bouton d'avant ce contrôle) : la note en base. */
export function gesteStatut(lignes: Pick<LigneDebrief, "etape" | "statut">[], code: string, s: StatutEtape, vu?: StatutEtape | null): { patch: PatchDebrief; suivante: string } {
  const i = lignes.findIndex((l) => l.etape.code === code);
  const avant = vu !== undefined ? { avant: { etapes: { [code]: { statut: vu } } } } : {};
  const pose = vu !== undefined ? vu : i >= 0 ? lignes[i].statut : null;
  if (i < 0) return { patch: { etapes: { [code]: { statut: s } }, ...avant }, suivante: code };
  if (pose === s) return { patch: { etapes: { [code]: { statut: null } }, ...avant }, suivante: code };
  return { patch: { etapes: { [code]: { statut: s } }, ...avant }, suivante: lignes[etapeSuivante(i, lignes.length)].etape.code };
}

/** 🏆 Gagné ou 💀 Perdu : recliquer le résultat posé le retire. `controle` : `actuel` est ce que
 *  le message montrait, et le patch l'emporte (`avant`) pour être refusé s'il a changé depuis. */
export const gesteIssue = (actuel: IssueSeance | null, clique: IssueSeance, controle = false): PatchDebrief =>
  ({ resultat: actuel === clique ? null : clique, ...(controle ? { avant: { resultat: actuel } } : {}) });

/** Qui jouait à cette étape (décision 9) — lu dans ce que la clôture a figé : les salles des
 *  Asuras et les équipes des Jumeaux. Les golems et l'araignée se calculaient sur les rôles du
 *  soir, que la clôture ne garde pas : pas de liste inventée (comme le site). */
function aCetteEtape(d: DonneesDebrief, e: Etape): APIEmbedField | null {
  const m = momentDe(e);
  const presents = d.joueurs.filter((j) => j.present === true);
  if (!m || !presents.length) return null;
  const nom = (j: JoueurBilan) => `${emojiClasse(j.classe)} ${echapper(j.pseudo)}${d.chiffres ? ` ${ligneFigee(j.chiffres)}` : ""}`;
  const salle = (k: string) => d.salles.find((x) => x.cle === k)?.label ?? k;
  if (m.quoi === "salles") {
    const avec = presents.filter((j) => j.salles.length);
    return avec.length ? { name: "👥 À cette étape : les salles", value: avec.map((j) => `${nom(j)} · ${echapper(regrouperSalles(j.salles.map(salle)))}`).join("\n") } : null;
  }
  if (m.quoi === "jumeaux") {
    const places = presents.filter((j) => j.jumeau);
    if (!places.length) return null;
    const lignes = EQUIPES.map((eq) => {
      const l = ROLES_JUMEAU.flatMap((r) => places.filter((j) => equipeDe(j.jumeau!) === eq && roleDe(j.jumeau!) === r).map((j) => `${EMOJI_ROLE[r]} ${nom(j)}`));
      return l.length ? `${EMOJI_EQUIPE[eq]} **Équipe ${NOM_EQUIPE[eq]}** — ${l.join(" · ")}` : "";
    }).filter(Boolean);
    return { name: "👥 À cette étape : les équipes des Jumeaux", value: lignes.join("\n") };
  }
  return null;
}

/** Le parcours du débrief (éphémère, staff) : l'étape montrée, ses boutons, et toutes les étapes
 *  d'un coup d'œil, phase par phase — le même écran que l'onglet Bilans du site. */
export function messageDebrief(d: DonneesDebrief): MessageSeance {
  const n = d.lignes.length;
  const i = Math.min(etapeCourante(d.lignes, d.code), Math.max(0, n - 1));
  const l = d.lignes[i] ?? null;
  const code = l?.etape.code ?? "";
  const a = d.analyse;
  const quand = a?.precedentLabel ?? null;
  const peut = d.commencee && !d.annulee && n > 0;
  // En petit sous l'étape : la consigne du parcours (paramétrable), puis l'avis du déroulé à figer.
  const consigne = remplirTexte(d.texte, d.vars).trim();
  const pied2 = peut ? [
    ...consigne.split("\n").map((x) => x.trim()).filter(Boolean).map((x) => `-# ${x}`),
    ...(d.figees ? [] : ["-# La liste des étapes se fige à la première note : un changement du paramétrage ne la touchera plus."]),
  ] : [];

  const tete: string[] = [];
  if (d.annulee) tete.push(`🚫 Séance annulée${d.motif ? ` — ${echapper(d.motif)}` : ""} : pas de débrief.`);
  else if (!d.commencee) tete.push("⚠️ Cette séance n'a pas encore eu lieu : on débriefe une séance jouée.");
  else if (!n) tete.push("⚠️ Aucune étape : règle-les dans le paramétrage des événements.");
  tete.push(d.resultat === "gagne" ? "🏆 **GAGNÉ**" : d.resultat === "perdu" ? "💀 **PERDU**" : "Résultat : pas encore dit — 🏆 Gagné ou 💀 Perdu, en bas.");
  if (d.total > 0) {
    const ec = a?.ecartTotal ? ` (${emojiEcart(a.ecartTotal)} ${a.ecartTotal.texte}${quand ? ` par rapport au ${quand}` : ""})`
      : !d.complet ? " (temps partiel : il manque le chrono d'une étape)"
        : a?.sansEcart === "precedent_partiel" && quand ? ` (pas d'écart : pas de temps complet le ${quand})` : "";
    tete.push(`⏱️ Temps total **${fmtDuree(d.total)}**${ec}`);
  } else tete.push("⏱️ Aucun chrono pris pour l'instant.");
  if (a?.record) tete.push("🥇 Nouveau record de temps total !");
  tete.push(d.publie
    ? `✅ Publié${d.publieLe ? ` le ${leA(d.publieLe)}` : ""}${d.par ? ` · ${echapper(d.par)}` : ""} : tous les membres le lisent dans Bilans.`
    : d.rienDeNote ? "▫️ Pas encore de débrief." : "▫️ Brouillon : les membres ne le voient pas encore.");

  const etape: string[] = [];
  if (l && peut) {
    const ph = d.phases[l.etape.phase] ?? `Phase ${l.etape.phase}`;
    etape.push(`Étape **${i + 1}/${n}** — ${l.etape.emoji} **${l.etape.code} ${echapper(l.etape.label)}** · ${echapper(ph)}`);
    const m = ligneMonstres(l.etape, d.site);
    if (m) etape.push(m);
    etape.push(`${pastille(l.statut)} ${l.statut ? LIBELLE_STATUT[l.statut] : "pas encore notée"}${l.statut ? " — recliquer la note la retire" : ""}`);
    etape.push(l.chrono === null ? "⏱️ Pas de chrono : saisis-le avec ⏱️ Chrono · remarque."
      : `⏱️ **${fmtDuree(l.chrono)}** — ${l.saisi ? `saisi au débrief${l.mesure !== null ? ` (mesuré : ${fmtDuree(l.mesure)})` : ""}` : "mesuré par le chrono"}`);
    etape.push(l.remarque ? `Remarque : « ${echapper(l.remarque)} »` : "Remarque : aucune.");
  }

  const fields: APIEmbedField[] = [];
  // Toutes les étapes, phase par phase : statut, chrono (* : corrigé au débrief), écart à la
  // séance publiée juste avant ; ▶️ celle qu'on note.
  for (const k of Object.keys(d.phases).sort()) {
    const ls = d.lignes.filter((x) => x.etape.phase === k);
    if (!ls.length) continue;
    fields.push({
      name: d.phases[k],
      value: ls.map((x) => {
        const e = a?.ecarts[x.etape.code] ?? null;
        const courante = x.etape.code === code && peut;
        const nom = `${x.etape.emoji} ${x.etape.code} ${echapper(x.etape.label)}`;
        const rem = x.remarque ? ` · « ${echapper(x.remarque.length > 70 ? `${x.remarque.slice(0, 69).trimEnd()}…` : x.remarque)} »` : "";
        // Sans chrono, rien après le nom : « — — » ne dirait rien de plus.
        const temps = x.chrono !== null ? ` — ${fmtDuree(x.chrono)}${x.saisi ? "*" : ""}${e ? ` ${emojiEcart(e)} ${e.texte}` : ""}` : "";
        return `${courante ? "▶️ " : ""}${pastille(x.statut)} ${courante ? `**${nom}**` : nom}${temps}${rem}`;
      }).join("\n"),
    });
  }
  // Les étapes d'une phase que le paramétrage ne nomme plus.
  const orphelines = d.lignes.filter((x) => !(x.etape.phase in d.phases));
  if (orphelines.length) fields.push({ name: "Autres étapes", value: orphelines.map((x) => `${pastille(x.statut)} ${x.etape.emoji} ${x.etape.code} ${echapper(x.etape.label)}${x.chrono !== null ? ` — ${fmtDuree(x.chrono)}` : ""}`).join("\n") });
  if (a && (a.plusLongue || a.malDeuxFois.length)) {
    fields.push({
      name: "🔎 Analyse",
      value: [
        a.plusLongue ? `⌛ Étape la plus longue : **${a.plusLongue.code} ${echapper(a.plusLongue.label)}** — ${fmtDuree(a.plusLongue.duree)} (${a.plusLongue.part} % du temps)` : "",
        a.malDeuxFois.length ? `🎯 Mal deux fois de suite : **${a.malDeuxFois.map((x) => `${x.code} ${echapper(x.label)}`).join(", ")}** — à retravailler` : "",
      ].filter(Boolean).join("\n"),
    });
  }
  fields.push({ name: "📌 À retenir", value: d.aRetenir ? echapper(d.aRetenir) : "▫️ Rien pour l'instant : 📌 À retenir, en bas." });
  const ici = l && peut ? aCetteEtape(d, l.etape) : null;
  if (ici) fields.push(ici);
  const presents = d.joueurs.filter((j) => j.present === true);
  const absents = d.joueurs.filter((j) => j.present === false);
  fields.push({
    name: `👥 Ils étaient là${d.nbJoueurs !== null ? ` (${d.nbJoueurs})` : ""}`,
    value: !d.cloturee
      ? (d.importe && d.nbJoueurs !== null ? `${d.nbJoueurs} joueurs, selon le débrief importé : la liste, elle, n'a pas été gardée.` : "▫️ Pas encore clôturée : « Clôturer » fige qui était là, et les chiffres déclarés de chacun ce soir-là.")
      : [
        presents.map((j) => `${emojiClasse(j.classe)} ${echapper(j.pseudo)}${d.chiffres ? ` ${ligneFigee(j.chiffres)}` : ""}`).join(" · ") || "▫️ personne",
        absents.length ? `❌ Absents : ${absents.map((j) => echapper(j.pseudo)).join(" · ")}` : "",
        d.chiffres && presents.length ? LEGENDE_CHIFFRES.replace("non vérifiés", "non vérifiés, figés à la clôture") : "",
      ].filter(Boolean).join("\n"),
  });

  const pied = `${PIED_CS} · 🟢 bien · 🟠 moyen · 🔴 mal · ⚪ pas noté · ⚡ plus rapide · 🐌 plus lent · * chrono corrigé`;
  const site = d.site ? `${d.site}/compositions?onglet=bilans&seance=${d.cle}` : "";
  const components: Rangee[] = [];
  if (peut && l) {
    const lib = (s: StatutEtape) => (l.statut === s ? `${LIBELLE_STATUT[s]} (noté)` : LIBELLE_STATUT[s]);
    components.push(...rangee(
      bouton(ID_BILAN.statut(d.cle, code, "bien", l.statut), lib("bien"), EMOJI_STATUT.bien, ButtonStyle.Success),
      bouton(ID_BILAN.statut(d.cle, code, "moyen", l.statut), lib("moyen"), EMOJI_STATUT.moyen),
      bouton(ID_BILAN.statut(d.cle, code, "mal", l.statut), lib("mal"), EMOJI_STATUT.mal, ButtonStyle.Danger),
    ));
    const prec = d.lignes[i - 1]?.etape.code, suiv = d.lignes[i + 1]?.etape.code;
    components.push(...rangee(
      prec ? bouton(ID_BILAN.voir(d.cle, prec), "‹ Précédente", "") : grise(bouton(`${ID_BILAN.voir(d.cle, code)}:p`, "‹ Précédente", "")),
      bouton(ID_BILAN.chrono(d.cle, code), "Chrono · remarque", "⏱️", ButtonStyle.Primary),
      suiv ? bouton(ID_BILAN.voir(d.cle, suiv), "Suivante ›", "") : grise(bouton(`${ID_BILAN.voir(d.cle, code)}:s`, "Suivante ›", "")),
    ));
    components.push(...rangee(
      bouton(ID_BILAN.issue(d.cle, code, "gagne", d.resultat), d.resultat === "gagne" ? "Gagné (noté)" : "Gagné", "🏆", ButtonStyle.Success),
      bouton(ID_BILAN.issue(d.cle, code, "perdu", d.resultat), d.resultat === "perdu" ? "Perdu (noté)" : "Perdu", "💀", ButtonStyle.Danger),
    ));
    if (d.confirmerBrouillon && d.publie) {
      components.push(...rangee(
        bouton(ID_BILAN.brouillon(d.cle, code, true), "Oui, repasser en brouillon", "", ButtonStyle.Danger),
        bouton(ID_BILAN.voir(d.cle, code), "Non, le garder publié", ""),
      ));
    } else {
      const publier = bouton(ID_BILAN.publier(d.cle, code), d.publie ? "Republier" : "Publier le débrief", "📝", ButtonStyle.Primary);
      components.push(...rangee(
        bouton(ID_BILAN.retenir(d.cle, code), "À retenir", "📌"),
        d.rienDeNote ? grise(publier) : publier,
        d.publie ? bouton(ID_BILAN.brouillon(d.cle, code), "Repasser en brouillon", "") : null,
        // Sans émoji : 🏰 dit « Chambre Secrète » (le titre), pas « clôturer » (§8.2).
        !d.cloturee ? bouton(ID_BILAN.cloture(d.cle), "Clôturer", "") : null,
        lien(site, "Ouvrir sur le site"),
      ));
    }
    components.push({ type: ComponentType.ActionRow, components: [{
      type: ComponentType.StringSelect, custom_id: ID_BILAN.aller(d.cle), placeholder: "Aller à l'étape…", min_values: 1, max_values: 1,
      options: d.lignes.slice(0, MAX_MENU).map((x) => ({
        label: `${x.etape.code} ${x.etape.label}`.slice(0, 100), value: x.etape.code, default: x.etape.code === code,
        ...(x.etape.emoji ? { emoji: emojiObjet(x.etape.emoji) } : {}),
        description: `${x.statut ? LIBELLE_STATUT[x.statut] : "pas notée"} · ${x.chrono !== null ? fmtDuree(x.chrono) : "pas de chrono"}${x.remarque ? " · une remarque" : ""}`.slice(0, 100),
      })),
    }] });
  } else components.push(...rangee(lien(site, "Ouvrir sur le site")));

  return {
    // Toujours posé, même vide : modifier le message éphémère sans `content` y laisserait le
    // verdict du geste d'avant.
    content: d.note ?? "",
    embeds: [borner({
      title: `📝 Débrief — Chambre du ${d.jour}${d.publie ? " · publié" : ""}`,
      url: site || undefined,
      description: [...tete, ...(etape.length ? ["", ...etape] : []), ...(pied2.length ? ["", ...pied2] : [])].join("\n"),
      fields,
      color: d.annulee ? COULEUR.anthracite : d.resultat === "gagne" ? COULEUR.vert : COULEUR.crimson,
      footer: { text: pied },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components,
    allowedMentions: AUCUNE,
  };
}

/* ── LES FENÊTRES DE SAISIE (`EtapeModal`, `ARetenirModal`, bot.py:2020-2062) ── */

export type FenetreSaisie = APIModalInteractionResponseCallbackData;

/** L'empreinte de la saisie d'une étape telle que la fenêtre la montre : au retour, si un autre
 *  membre du staff l'a changée entre-temps, on n'écrase pas son texte. */
export const empreinteNote = (n: Pick<NoteEtape, "chrono" | "remarque"> | undefined) => empreinte(n?.chrono == null ? "" : String(n.chrono), n?.remarque ?? "");

/** La fenêtre « chrono et remarque » d'une étape. Le chrono montré est la SAISIE du staff, jamais
 *  la mesure (elle est dans l'aide) : renvoyer la fenêtre sans y toucher ne fige pas la mesure en
 *  saisie, et un champ vidé la fait revenir — comme sur le site. */
export function fenetreEtape(cle: string, l: Pick<LigneDebrief, "etape" | "mesure">, saisie: Pick<NoteEtape, "chrono" | "remarque"> | undefined): FenetreSaisie {
  const chrono = saisie && saisie.chrono !== null ? fmtDuree(saisie.chrono) : "";
  return {
    custom_id: ID_BILAN.modalEtape(cle, l.etape.code, empreinteNote(saisie)),
    title: `${l.etape.code} ${l.etape.label}`.slice(0, 45),
    components: [
      { type: ComponentType.Label, label: "Chrono de l'étape (ex. 2:34, 45s, 1h02)",
        description: (l.mesure !== null ? `Mesuré par le chrono : ${fmtDuree(l.mesure)}. Laisse vide pour garder la mesure.` : "Pas de mesure du chrono : écris le temps de l'étape.").slice(0, 100),
        component: { type: ComponentType.TextInput, custom_id: "chrono", style: TextInputStyle.Short, required: false, max_length: 20,
          placeholder: l.mesure !== null ? fmtDuree(l.mesure) : "2:34", ...(chrono ? { value: chrono } : {}) } },
      { type: ComponentType.Label, label: `Remarque (${REMARQUE_MAX} signes au plus)`, description: "Ce qui s'est passé à cette étape. Facultatif.",
        component: { type: ComponentType.TextInput, custom_id: "remarque", style: TextInputStyle.Paragraph, required: false, max_length: REMARQUE_MAX,
          ...(saisie?.remarque ? { value: saisie.remarque } : {}) } },
    ],
  };
}

/** La fenêtre « à retenir pour la prochaine fois ». */
export function fenetreARetenir(cle: string, code: string, aRetenir: string): FenetreSaisie {
  return {
    custom_id: ID_BILAN.modalRetenir(cle, code, empreinte(aRetenir)),
    title: "À retenir pour la prochaine fois",
    components: [
      { type: ComponentType.Label, label: `Points à retenir (${A_RETENIR_MAX} signes au plus)`, description: "Lu par tous les membres une fois le débrief publié.",
        component: { type: ComponentType.TextInput, custom_id: "texte", style: TextInputStyle.Paragraph, required: false, max_length: A_RETENIR_MAX,
          ...(aRetenir ? { value: aRetenir.slice(0, A_RETENIR_MAX) } : {}) } },
    ],
  };
}

/** Ce que la fenêtre d'une étape change : seulement les champs touchés (comparés à ce qu'elle
 *  montrait, c'est-à-dire à la saisie en base quand l'empreinte concorde). Null : rien n'a changé. */
export function patchFenetreEtape(code: string, champs: { chrono: string; remarque: string }, saisie: Pick<NoteEtape, "chrono" | "remarque"> | undefined): PatchDebrief | null {
  const avantChrono = saisie && saisie.chrono !== null ? fmtDuree(saisie.chrono) : "";
  const p: NonNullable<PatchDebrief["etapes"]>[string] = {};
  if (champs.chrono.trim() !== avantChrono) p.chrono = champs.chrono.trim();
  if (champs.remarque.trim() !== (saisie?.remarque ?? "")) p.remarque = champs.remarque;
  return Object.keys(p).length ? { etapes: { [code]: p } } : null;
}
export const patchFenetreARetenir = (texte: string, actuel: string): PatchDebrief | null => (texte.trim() === actuel.trim() ? null : { aRetenir: texte });

/** Une saisie refusée (un chrono illisible) : sa raison, et la remarque tapée, rendue à son
 *  auteur — la fenêtre s'est fermée, il la perdrait. */
export function noteRefusSaisie(message: string, remarque: string): string {
  const t = remarque.trim();
  return `⚠️ ${message}${t ? ` Ta remarque n'est pas enregistrée non plus : « ${echapper(t.length > 300 ? `${t.slice(0, 299)}…` : t)} »` : ""}`;
}

/** Un geste que le serveur refuse parce qu'un autre membre du staff a changé le même champ
 *  entre-temps (`DEBRIEF_CONFLIT`, sous le verrou de la séance) : sa raison, et ce que l'auteur
 *  avait tapé, rendu. */
export function noteConflit(message: string, tape: string): string {
  const t = tape.trim();
  return `⚠️ ${message}${t ? ` Ce que tu avais écrit : « ${echapper(t.length > 300 ? `${t.slice(0, 299)}…` : t)} »` : ""}`;
}

/** Une saisie que l'empreinte refuse : la fenêtre montrait une version qu'un autre membre du
 *  staff a changée depuis. On le dit, et on rend sa saisie à l'auteur pour qu'il ne la perde pas. */
export function saisieDepassee(code: string, texte: string): string {
  const t = texte.trim();
  return `⚠️ Un autre membre du staff vient de modifier ${code === "*" ? "« à retenir »" : `l'étape ${code}`} : voici sa version, ta saisie n'est pas enregistrée.${t ? ` Ce que tu avais écrit : « ${echapper(t.length > 300 ? `${t.slice(0, 299)}…` : t)} »` : ""}`;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   M7 — LE DÉBRIEF PUBLIÉ (embed, image et lien ; lot 7). Il remplace `embed_debrief`
   (bot.py:2074-2111) : l'embed dit le résultat, le temps, l'analyse et « à retenir » ; l'image
   (src/lib/seance-image.ts) porte chaque étape. Mention : aucune.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Le nom du fichier joint : l'embed le désigne par `attachment://debrief.png`. */
export const IMAGE_DEBRIEF = "debrief.png";

export type DonneesPublie = {
  cle: string;
  /** « mercredi 22 octobre ». */
  jour: string;
  resultat: IssueSeance | null; total: number; complet: boolean;
  analyse: (AnalyseDebrief & { precedentLabel: string | null }) | null;
  aRetenir: string;
  nbJoueurs: number | null;
  /** La phrase du paramétrage (`textes.debriefPublie`, décision 5), variables non remplies. */
  texte: string; vars: Record<string, string>;
  site: string;
  maj: number;
  /** Les vidéos PRÊTES de la séance (lot 8), dans l'ordre du déroulé : le bloc 🎬. */
  videos?: VideoPubliee[];
};

/** Le lien du débrief sur le site : l'onglet Bilans, la séance ouverte. */
export const lienDebrief = (site: string, cle: string) => (site ? `${site}/compositions?onglet=bilans&seance=${cle}` : "");

/* ── 🎬 Les vidéos du débrief (§10, lot 8) ──
   Chacune mène à la PAGE du débrief, qui ouvre son lecteur au bon moment (`&video={id}`) :
   jamais l'adresse du fichier, qui exige d'être connecté, ni celle d'un lien externe, que la
   page présente avec son étape et son moment. */

export type VideoPubliee = { id: string; etape: string | null; etapeLabel: string | null; titre: string; auteur: string; moment: number | null };

/** Le lien d'une vidéo sur le site : le débrief, et son lecteur ouvert. */
export const lienVideo = (site: string, cle: string, id: string) => (site ? `${lienDebrief(site, cle)}&video=${id}` : "");

/** Le texte d'un lien masqué : sans crochets (ils fermeraient le lien), le Markdown échappé. */
const texteDeLien = (t: string) => echapper(t).replace(/[[\]]/g, (c) => (c === "[" ? "(" : ")"));

/** « [2.2 Jumeaux — Aggro ratée sur Kraavos](…&video=id) (Lina, à 1:35) » ; une vidéo de toute
 *  la séance : « Toute la séance — … ». Sans adresse du site, le texte seul. */
export function ligneVideo(v: VideoPubliee, site: string, cle: string): string {
  const ou = v.etape ? `${v.etape}${v.etapeLabel ? ` ${v.etapeLabel}` : ""}` : "Toute la séance";
  const texte = `${ou} — ${v.titre}`;
  const url = lienVideo(site, cle, v.id);
  const qui = `(${echapper(v.auteur)}${v.moment !== null && v.moment > 0 ? `, à ${fmtDuree(v.moment)}` : ""})`;
  return `${url ? `[${texteDeLien(texte)}](${url})` : echapper(texte)} ${qui}`;
}

/** Le bloc « 🎬 Vidéos (n) » de M7 ; null sans vidéo. Trop long, il se coupe ligne par ligne
 *  avec « … (voir le site) » (`borner`). */
export function champVideos(videos: VideoPubliee[], site: string, cle: string): APIEmbedField | null {
  if (!videos.length) return null;
  return { name: `🎬 Vidéos (${videos.length})`, value: videos.map((v) => ligneVideo(v, site, cle)).join("\n") };
}

export function messageDebriefPublie(d: DonneesPublie): MessageSeance {
  const a = d.analyse;
  const quand = a?.precedentLabel ?? null;
  const url = lienDebrief(d.site, d.cle);
  const issue = d.resultat === "gagne" ? "🏆 **GAGNÉ**" : d.resultat === "perdu" ? "💀 **PERDU**" : "";
  let temps: string;
  if (d.total > 0) {
    const ec = a?.ecartTotal ? ` (${emojiEcart(a.ecartTotal)} ${a.ecartTotal.texte}${quand ? ` par rapport au ${quand}` : ""})`
      : !d.complet ? " (temps partiel : il manque le chrono d'une étape)"
        : a?.sansEcart === "precedent_partiel" && quand ? ` (pas d'écart : pas de temps complet le ${quand})` : "";
    temps = `⏱️ Temps total **${fmtDuree(d.total)}**${ec}`;
  } else temps = "⏱️ Aucun chrono pris";
  const phrase = remplirTexte(d.texte, d.vars).trim();
  const lignes = [
    [issue, temps].filter(Boolean).join(" · "),
    a?.record ? "🥇 Nouveau record de temps total !" : "",
    d.nbJoueurs ? `👥 ${d.nbJoueurs} joueur${d.nbJoueurs > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  // La phrase du staff, sous le bilan : elle introduit l'image, juste en dessous.
  const description = [...lignes, ...(phrase ? ["", phrase] : [])].join("\n");
  const fields: APIEmbedField[] = [];
  if (a && (a.plusLongue || a.malDeuxFois.length)) {
    fields.push({
      name: "🔎 Analyse",
      value: [
        a.plusLongue ? `⌛ Étape la plus longue : **${a.plusLongue.code} ${echapper(a.plusLongue.label)}** — ${fmtDuree(a.plusLongue.duree)} (${a.plusLongue.part} % du temps)` : "",
        a.malDeuxFois.length ? `🎯 Mal deux fois de suite : **${a.malDeuxFois.map((x) => `${x.code} ${echapper(x.label)}`).join(", ")}** — à retravailler` : "",
      ].filter(Boolean).join("\n"),
    });
  }
  if (d.aRetenir.trim()) fields.push({ name: "📌 À retenir", value: echapper(d.aRetenir.trim()) });
  const cv = champVideos(d.videos ?? [], d.site, d.cle);
  if (cv) fields.push(cv);
  return {
    embeds: [borner({
      title: `📝 Retour de la Chambre — ${d.jour}`,
      url: url || undefined,
      description: description || undefined,
      fields,
      image: { url: `attachment://${IMAGE_DEBRIEF}` },
      // PERDU : la barre reste crimson ; GAGNÉ : vert (§8.3, M7).
      color: d.resultat === "gagne" ? COULEUR.vert : COULEUR.crimson,
      footer: { text: "GENESIS · ⚡ plus rapide · 🐌 plus lent que la dernière fois" },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: rangee(lien(url, "Lire le débrief sur le site")),
    allowedMentions: AUCUNE,
  };
}

/** Le nom du fil, quand le salon des débriefs est un forum (`bot.py:2001-2006`) :
 *  « Retour Chambre — dimanche 18 octobre » (100 signes au plus). */
export const nomDuFil = (jour: string, evenement: "cs" | "gs" = "cs") => `Retour ${evenement === "gs" ? "Guild Siege" : "Chambre"} — ${jour}`.slice(0, 100);

/** Les étiquettes du fil : « Donjon » si le forum en a une (`bot.py:2002`) ; à défaut, la
 *  première, mais seulement si le forum EXIGE une étiquette — sinon Discord refuserait le fil. */
export function etiquettesDuFil(tags: { id: string; name: string }[], exigee: boolean): string[] {
  const donjon = tags.find((t) => sansAccent(t.name).trim().toLowerCase() === "donjon");
  if (donjon) return [donjon.id];
  return exigee && tags.length ? [tags[0].id] : [];
}

/** Les droits du bot qui manquent dans le salon des débriefs (§8.6, point 4) — leur nom tel que
 *  Discord l'affiche dans les permissions du salon. Vide : il peut publier. */
export function droitsManquants(a: (droit: bigint) => boolean, forum: boolean): string[] {
  const requis: [bigint, string][] = [
    [PermissionFlagsBits.ViewChannel, "Voir le salon"],
    [PermissionFlagsBits.SendMessages, forum ? "Créer des publications" : "Envoyer des messages"],
    [PermissionFlagsBits.EmbedLinks, "Intégrer des liens"],
    [PermissionFlagsBits.AttachFiles, "Joindre des fichiers"],
  ];
  return requis.filter(([d]) => !a(d)).map(([, n]) => n);
}

/** Pourquoi le débrief d'une séance ne part pas sur Discord (null : il part). Relu au moment de
 *  publier, pas de la demande : une demande restée en file pendant qu'on repassait le débrief en
 *  brouillon ne publie rien. */
export function refusPublicationDebrief(s: {
  evenement: string; creneau: string; annulee: boolean; publie: boolean; nouveauxMessages: boolean;
  /** Le Guild Siege (lot 9) : il publie s'il est ACTIF — pas de bot Python à remplacer. */
  actifGS?: boolean;
}): string | null {
  if (s.evenement === "gs") {
    if (!s.actifGS) return "Le Guild Siege est éteint (paramétrage des événements) : son débrief ne part pas sur Discord.";
  } else if (s.evenement !== "cs" || (s.creneau !== "mer" && s.creneau !== "dim")) return "Séance inconnue : ni Chambre, ni Guild Siege.";
  else if (!s.nouveauxMessages) return "La bascule est coupée : le bot Python publie encore ses débriefs. Le nôtre part avec les nouveaux messages (paramétrage des événements).";
  if (s.annulee) return "Cette séance est annulée : pas de débrief.";
  if (!s.publie) return "Ce débrief n'est plus publié sur le site (repassé en brouillon) : rien ne part sur Discord.";
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   LOT 10 — LES ÉCHANGES ENTRE JOUEURS ET L'ÉQUILIBRAGE DES JUMEAUX (§4.4, §4.5 ; décision 1)
   Comme `options_echange`, `DemandeEchangeView` et `demander_echange` du modèle
   (bot.py:1183-1308), mais sans rien publier dans le salon : une demande regarde deux personnes.
   Le joueur visé la reçoit en MESSAGE PRIVÉ (✅ Accepter, ❌ Refuser), et la retrouve dans
   🔄 Échanges (le bouton de 📍 Mes positions) et dans l'onglet Répartition du site ; le
   demandeur reçoit la réponse en message privé. 🔄 veut dire « demande d'échange de place »,
   partout (ajouté à la table du §8.2 ; le modèle l'employait déjà, bot.py:1302).
   Le texte d'une demande vient de lib/chambres (`texteDemande`) : le site dit la même chose.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

export const EMOJI_ECHANGE = "🔄";

/** La valeur d'une option du menu « Demander une place » : « salle:s3>Thorn », « jumeau>Orin ». */
export const valeurDemande = (quoi: QuoiEchange, avec: string) => `${quoi}>${avec}`.slice(0, 100);
export function lireValeurDemande(v: string): { quoi: QuoiEchange; avec: string } | null {
  const m = /^(salle:[a-z0-9]{1,8}|jumeau)>(.{1,80})$/.exec(v ?? "");
  return m ? { quoi: m[1] as QuoiEchange, avec: m[2] } : null;
}

/** « 🔄 Demander une place pour Kaelis… » : les salles et les places de jumeau qu'il peut
 *  demander (`optionsEchange`) — 🌳 une salle, 👯 une place chez les jumeaux. */
export function menuDemanderEchange(cle: string, pseudo: string, options: Pick<OptionEchange, "quoi" | "avec" | "libelle" | "detail">[]): Rangee | null {
  const custom_id = ID.demander(cle, pseudo);
  if (custom_id.length > 100 || !options.length) return null;
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.StringSelect, custom_id, placeholder: `Demander une place pour ${pseudo}…`.slice(0, 150), min_values: 1, max_values: 1,
      options: options.slice(0, 25).map((o) => ({
        label: o.libelle.slice(0, 100), value: valeurDemande(o.quoi, o.avec), description: o.detail.slice(0, 100), emoji: { name: o.quoi === "jumeau" ? "👯" : "🌳" },
      })),
    }],
  };
}

/** Le verdict d'une réponse, dit à celui qui a cliqué : ✅ accepté, ❌ refusé ou retiré, ⛔ pas
 *  autorisé, ⚠️ impossible. */
export function verdictEchange(r: Resultat, accepter: boolean): string {
  if (!r.ok) return `${r.status === 403 ? "⛔" : "⚠️"} ${r.message}`;
  return `${accepter ? "✅" : "❌"} ${r.message}`;
}

export type DonneesDemandeEchange = {
  cle: string; id: string;
  /** « mercredi 22 octobre ». */
  jour: string;
  /** La demande, dite au joueur visé (`texteDemande(…, "cible")`). */
  texte: string;
  /** La consigne du paramétrage (`textes.echange`), variables non remplies. */
  consigne: string; vars: Record<string, string>;
  /** Fin de l'attente (ms). */
  expire: number;
  site: string; maj: number;
  /** Après la réponse (ou si elle n'attend plus) : le verdict, et plus de boutons. */
  fermee?: string;
};

/** LE MESSAGE PRIVÉ AU JOUEUR VISÉ — la `DemandeEchangeView` du modèle, sans le salon public. */
export function messageDemandeEchange(d: DonneesDemandeEchange): MessageSeance {
  const url = d.site ? `${d.site}/compositions?onglet=repartition` : "";
  const consigne = remplirTexte(d.consigne, d.vars).trim();
  const description = [
    echapper(d.texte),
    consigne && !d.fermee ? `\n${consigne}` : "",
    d.fermee ? `\n${d.fermee}` : `-# Sans réponse, elle tombe <t:${Math.floor(d.expire / 1000)}:R>.`,
  ].filter(Boolean).join("\n");
  return {
    embeds: [borner({
      title: `${EMOJI_ECHANGE} Demande d'échange — Chambre du ${d.jour}${d.fermee ? " · répondue" : ""}`,
      url: url || undefined,
      description,
      color: d.fermee ? COULEUR.anthracite : COULEUR.crimson,
      footer: { text: PIED_CS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: d.fermee ? rangee(lien(url, "Voir la répartition")) : rangee(
      bouton(ID.repondre(d.cle, d.id, true), "Accepter", "✅", ButtonStyle.Success),
      bouton(ID.repondre(d.cle, d.id, false), "Refuser", "❌"),
      lien(url, "Voir la répartition"),
    ),
    allowedMentions: AUCUNE,
  };
}

export type DonneesReponseEchange = {
  jour: string;
  /** La demande, dite par un tiers (`texteDemande(…, "tiers")`). */
  texte: string;
  accepte: boolean;
  /** Une acceptation devenue impossible : sa raison (« La place de jumeau a changé entre-temps. »). */
  motif: string | null;
  /** Qui a répondu : le pseudo du joueur visé, ou « Le staff ». */
  qui: string;
  site: string; maj: number;
};

/** LE MESSAGE PRIVÉ DE LA RÉPONSE — au demandeur ; au joueur visé aussi quand le staff a répondu
 *  pour lui (sa place a pu changer sans qu'il clique). */
export function messageReponseEchange(d: DonneesReponseEchange): MessageSeance {
  const url = d.site ? `${d.site}/compositions?onglet=repartition` : "";
  const etat = d.motif ? "impossible" : d.accepte ? "accepte" : "refuse";
  const titre = { accepte: "✅ Échange accepté", refuse: "❌ Échange refusé", impossible: "⚠️ Échange impossible" }[etat];
  const description = [
    echapper(d.texte),
    d.motif ? `L'échange n'a pas pu se faire : ${echapper(d.motif)}` : `${echapper(d.qui)} a ${d.accepte ? "accepté" : "refusé"}.`,
    etat === "accepte" ? "📍 Les positions sont à jour, ici et sur le site." : "",
  ].filter(Boolean).join("\n");
  return {
    embeds: [borner({
      title: `${titre} — Chambre du ${d.jour}`,
      url: url || undefined,
      description,
      color: etat === "accepte" ? COULEUR.vert : etat === "impossible" ? COULEUR.or : COULEUR.anthracite,
      footer: { text: PIED_CS },
      timestamp: new Date(d.maj).toISOString(),
    })],
    components: rangee(lien(url, "Voir la répartition")),
    allowedMentions: AUCUNE,
  };
}

/** Une demande telle que 🔄 Échanges la liste (la `VueDemande` de lib/chambres). */
export type LigneEchange = Pick<VueDemande, "id" | "texte" | "expire" | "valable" | "raison" | "reponse">;

export type DonneesEchanges = {
  cle: string; label: string;
  /** Les demandes qui visent ses persos, en attente. */
  recues: LigneEchange[];
  /** Staff : celles des autres, en attente — il peut trancher. */
  aTrancher: LigneEchange[];
  /** Les siennes : en attente (il peut les retirer), ou répondues depuis moins d'1 h. */
  envoyees: LigneEchange[];
  /** « Demander une place » de ses persos (deux au plus). */
  menus: Rangee[];
  /** La consigne du paramétrage (`textes.echange`), variables remplies. */
  consigne: string;
  note?: string;
  site: string;
};

/** La réponse éphémère 🔄 ÉCHANGES : les demandes reçues (✅ Accepter, ❌ Refuser), celles à
 *  trancher (staff), les siennes (❌ Retirer), et le menu pour en faire une. Les boutons portent
 *  le NUMÉRO de la ligne ; ce qui ne tient pas dans les cinq rangées de Discord reste sur le site. */
export function messageEchanges(d: DonneesEchanges): { content: string; components: Rangee[]; allowedMentions: Mentions } {
  const url = d.site ? `${d.site}/compositions?onglet=repartition` : "";
  const t = (ms: number) => `<t:${Math.floor(ms / 1000)}:R>`;
  let n = 0;
  const numeros = new Map<string, number>();
  const ligne = (l: LigneEchange) => { numeros.set(l.id, ++n); return `**${n}.** ${echapper(l.texte)}`; };
  const attente = (l: LigneEchange) => [ligne(l), l.valable ? `-# Elle tombe ${t(l.expire)} sans réponse.` : `-# ⚠️ ${echapper(l.raison ?? "Elle n'est plus faisable.")} Tu ne peux plus que la refuser.`];
  const etat = (l: LigneEchange) => {
    if (!l.reponse) return `-# En attente de sa réponse — elle tombe ${t(l.expire)}.`;
    if (l.reponse.motif) return `-# ⚠️ Impossible : ${echapper(l.reponse.motif)}`;
    if (l.reponse.par === "demandeur") return "-# ❌ Tu l'as retirée.";
    return `-# ${l.reponse.accepte ? "✅ Acceptée" : "❌ Refusée"}${l.reponse.par === "staff" ? " par le staff" : ""}.`;
  };
  const blocs = [
    d.recues.length ? ["**Pour toi**", ...d.recues.flatMap(attente)].join("\n") : "",
    d.aTrancher.length ? ["**À trancher (staff)**", ...d.aTrancher.flatMap(attente)].join("\n") : "",
    d.envoyees.length ? ["**Tes demandes**", ...d.envoyees.flatMap((l) => [ligne(l), etat(l)])].join("\n") : "",
  ].filter(Boolean);
  const vide = !blocs.length ? "Aucune demande en cours." : "";
  const aide = d.menus.length ? "Pour demander la place d'un autre, choisis-la dans le menu : il l'accepte ou la refuse dans l'heure." : "";
  const content = [
    d.note ?? "", `${EMOJI_ECHANGE} Échanges — ${d.label}`, ...blocs, vide,
    d.recues.length || d.aTrancher.length ? d.consigne : "", aide,
  ].filter(Boolean).join("\n").slice(0, 2000);

  // Les rangées : les réponses (deux demandes par rangée), les menus, puis les retraits et le lien.
  const menus = d.menus.slice(0, 2);
  const aRepondre = [...d.recues, ...d.aTrancher];
  const place = 5 - menus.length - 1;
  const reponses: Rangee[] = [];
  for (let i = 0; i < aRepondre.length && reponses.length < place; i += 2) {
    const boutons = aRepondre.slice(i, i + 2).flatMap((l) => {
      const k = numeros.get(l.id)!;
      return [
        ...(l.valable ? [bouton(ID.repondre(d.cle, l.id, true), `Accepter ${k}`, "✅", ButtonStyle.Success)] : []),
        bouton(ID.repondre(d.cle, l.id, false), `Refuser ${k}`, "❌"),
      ];
    });
    reponses.push({ type: ComponentType.ActionRow, components: boutons });
  }
  const retraits = d.envoyees.filter((l) => !l.reponse).slice(0, 4).map((l) => bouton(ID.repondre(d.cle, l.id, false), `Retirer ${numeros.get(l.id)}`, "❌"));
  return { content, components: [...reponses, ...menus, ...rangee(...retraits, lien(url, "Voir sur le site"))], allowedMentions: AUCUNE };
}

/** La confirmation de « Équilibrer (staff) » : ce que l'équilibrage donnerait, et le bouton qui
 *  l'applique. Il REMPLACE toutes les places des deux équipes : on le montre avant. */
export function confirmationEquilibrer(d: {
  cle: string; site: string;
  /** Le verdict de l'essai sur une copie (`equilibrerJumeaux`) : écart, sans chiffre, hors équipe. */
  apercu: string;
  equipes: Record<Equipe, { place: Place; pseudo: string }[]>;
}): { content: string; components: Rangee[]; allowedMentions: Mentions } {
  const equipe = (eq: Equipe) => `${EMOJI_EQUIPE[eq]} **${NOM_EQUIPE[eq]}** : ${d.equipes[eq].map((x) => `${EMOJI_ROLE[roleDe(x.place)]} ${echapper(x.pseudo)}`).join(" · ") || "▫️ personne"}`;
  return {
    content: [
      "👯 **Équilibrer les jumeaux** remplace toutes les places des deux équipes : un tank par équipe, puis les DPS répartis pour que les dégâts déclarés soient les plus proches.",
      equipe("vert"), equipe("rouge"), d.apercu, "Confirmer ?",
    ].join("\n").slice(0, 2000),
    components: rangee(
      bouton(ID.equilibrerOk(d.cle), "Équilibrer", "", ButtonStyle.Primary),
      lien(d.site && `${d.site}/compositions?onglet=repartition`, "Voir la répartition"),
    ),
    allowedMentions: AUCUNE,
  };
}
