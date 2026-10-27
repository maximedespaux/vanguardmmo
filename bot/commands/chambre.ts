// ════════════════════════════════════════════════════════════
//  /chambre — les Chambres Secrètes depuis Discord (SPEC-CHAMBRES §8.4 ; lot 3)
//
//  Chaque commande du bot de Dracarys garde une porte chez nous, même quand le geste se fait
//  sur le site : `panneau` (re)publie le panneau, `historique` dit ses Chambres, `cloturer` et
//  `debrief` mènent tout droit à la bonne page. Lot 4 : `recap` envoie le récap tout de suite,
//  sans mention ; `positions` répond 📍 Mes positions (ses salles, son équipe, son golem, sa
//  rotation, avec les menus pour les changer) ; `repartition` publie les deux messages à
//  boutons des salles et des jumeaux (le `/repartition` du modèle). Lot 5 : `chrono` publie le
//  chrono en direct de la séance qui se joue (le `/chrono` du modèle), boutons réservés au staff.
//  Lot 6 bis (décision 1) : `cloturer` et `debrief` ne mènent plus seulement au site — comme le
//  `/cloturer` et le `/debrief` du modèle, ils ouvrent dans Discord, en éphémère, la clôture
//  (cocher qui était là) et le débrief étape par étape, sur la même base que le site. Leur option
//  `seance` choisit une autre séance que la dernière commencée (autocomplétion).
//
//  « Membre » veut dire le compte relu EN BASE (canAccessGuild et actif), pas un rôle Discord :
//  le serveur compte aussi des visiteurs, des candidats et des amis (§2.6). « Staff » : isStaff.
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, MessageFlags, type AutocompleteInteraction, type ChatInputCommandInteraction, type GuildMember } from "discord.js";
import { prisma } from "../lib/prisma.js";
import { isStaff } from "../lib/permissions.js";
import { SITE_URL } from "../config.js";
import { canAccessAdmin } from "@/config/roles";
import { bilanParticipations, prochaineSeanceParis, publicationPermise, seanceCouranteParis, seancesRecentesParis } from "@/lib/evenements";
import {
  commandeCloturer, commandeDebrief, compteDiscord, gardeStaff, parametres, publierChrono, publierPanneau, publierRecap, publierRepartition, repondrePositions,
} from "../lib/seances.js";
import * as M from "../lib/seances-messages.js";

const EPH = MessageFlags.Ephemeral;
const RIEN = { parse: [] as [] };

export const data = new SlashCommandBuilder()
  .setName("chambre")
  .setDescription("Les Chambres Secrètes")
  .addSubcommand((s) => s.setName("panneau").setDescription("(Staff) Republier le panneau d'inscription de la prochaine Chambre"))
  .addSubcommand((s) => s.setName("positions").setDescription("Tes positions : salles, équipe des jumeaux, golem, rotation de l'araignée"))
  .addSubcommand((s) => s.setName("recap").setDescription("(Staff) Envoyer le récap de la Chambre maintenant, sans mention"))
  .addSubcommand((s) => s.setName("repartition").setDescription("(Staff) Publier les boutons des salles et des équipes des jumeaux"))
  .addSubcommand((s) => s.setName("chrono").setDescription("(Staff) Publier le chrono en direct de la Chambre qui se joue"))
  .addSubcommand((s) => s.setName("historique").setDescription("Tes Chambres : présences et absences")
    .addStringOption((o) => o.setName("joueur").setDescription("(Staff) Le compte ou le perso d'un autre membre")))
  .addSubcommand((s) => s.setName("cloturer").setDescription("(Staff) Clôturer une Chambre : cocher qui était là")
    .addStringOption((o) => o.setName("seance").setDescription("La séance (par défaut : la dernière commencée)").setAutocomplete(true)))
  .addSubcommand((s) => s.setName("debrief").setDescription("(Staff) Faire ou reprendre le débrief d'une Chambre, étape par étape")
    .addStringOption((o) => o.setName("seance").setDescription("La séance (par défaut : la dernière commencée)").setAutocomplete(true)));

/** L'option `seance` : les dernières séances commencées, avec ce qu'on en sait (clôturée, débrief
 *  publié — un brouillon que les membres ne voient pas encore se devine à son absence). Les deux
 *  commandes sont celles du staff : la liste ne s'ouvre qu'à lui, compte relu en base comme leur
 *  garde (un visiteur, un candidat ou un ami n'y voit rien de plus qu'avant). */
export async function autocomplete(i: AutocompleteInteraction) {
  const f = i.options.getFocused(true);
  if (f.name !== "seance") { await i.respond([]); return; }
  if (!(await gardeStaff(i)).ok) { await i.respond([]); return; }
  const recentes = seancesRecentesParis(new Date(), 8);
  const rows = await prisma.seanceGuilde.findMany({
    where: { cle: { in: recentes.map((s) => s.cle) } }, select: { cle: true, clotureAt: true, debriefPublieAt: true, annulee: true },
  }).catch(() => []);
  const etats = new Map(rows.map((r) => [r.cle, { cloturee: !!r.clotureAt, publie: !!r.debriefPublieAt, annulee: r.annulee }]));
  await i.respond(M.choixSeances(recentes, etats, String(f.value ?? "")));
}

export async function execute(i: ChatInputCommandInteraction) {
  const sous = i.options.getSubcommand();
  if (sous === "historique") return historique(i);
  // M10 : la garde (membre relu en base) est dans repondrePositions, comme pour le bouton 📍.
  // Avant la bascule (§8.10), comme ce bouton, elle attend : la répartition du bot Python fait
  // encore foi dans Discord.
  if (sous === "positions") {
    await i.deferReply({ flags: EPH });
    if (!(await parametres("cs")).nouveauxMessages) { await i.editReply(M.positionsAvantBascule(SITE_URL)); return; }
    return repondrePositions(i);
  }

  // La clôture et le débrief montrent les joueurs et leurs chiffres : leur garde relit le compte
  // EN BASE (de la guilde, actif, et staff), dans bot/lib/seances.ts.
  if (sous === "cloturer") return commandeCloturer(i, i.options.getString("seance"));
  if (sous === "debrief") return commandeDebrief(i, i.options.getString("seance"));

  // Les autres gestes du staff ne montrent aucune donnée de membre : isStaff suffit.
  if (!isStaff(i.member as GuildMember | null)) {
    await i.reply({ content: "⛔ Réservé au staff (bras droits).", flags: EPH });
    return;
  }
  if (sous === "panneau") {
    await i.deferReply({ flags: EPH });
    const p = await parametres("cs", true);
    if (!p.nouveauxMessages) {
      await i.editReply("⚠️ La bascule est coupée : le panneau part avec les nouveaux messages. Arrête d'abord le bot Python, puis allume « Messages de notre bot » dans le paramétrage des événements.");
      return;
    }
    try {
      const ref = await publierPanneau(i.client, prochaineSeanceParis(new Date()), null);
      await i.editReply(`✅ Panneau publié, sans mention : ${ref.lien}`);
    } catch (e) {
      await i.editReply(`⚠️ Le panneau n'est pas parti : ${String((e as Error)?.message ?? e).slice(0, 300)}`);
    }
    return;
  }
  if (sous === "recap" || sous === "repartition" || sous === "chrono") {
    await i.deferReply({ flags: EPH });
    const p = await parametres("cs", true);
    if (!p.nouveauxMessages) {
      await i.editReply(`⚠️ La bascule est coupée : ${sous === "chrono" ? "le chrono part" : "le récap et la répartition partent"} avec les nouveaux messages. Arrête d'abord le bot Python, puis allume « Messages de notre bot » dans le paramétrage des événements.${sous === "chrono" ? " D'ici là, le chrono se tient sur le site (onglet Chrono)." : ""}`);
      return;
    }
    // La séance qui se joue, ou qu'on prépare : celle dont on fait la répartition.
    const s = seanceCouranteParis(new Date());
    const refus = publicationPermise(s, new Date(), sous);
    if (refus) { await i.editReply(`⚠️ ${refus}`); return; }
    try {
      if (sous === "recap") {
        const ref = await publierRecap(i.client, s, null);
        await i.editReply(`✅ Récap publié, sans mention : ${ref.lien}`);
      } else if (sous === "chrono") {
        // Le chronométreur sera celui qui clique « Démarrer » (staff), pas celui qui publie.
        const ref = await publierChrono(i.client, s, null);
        await i.editReply(`⏱️ Chrono publié : ${ref.lien} — seul le staff le fait avancer ; il suit aussi les clics faits sur le site.`);
      } else {
        const refs = await publierRepartition(i.client, s);
        await i.editReply(`✅ Répartition publiée : ${refs.map((r) => r.lien).join(" · ")}`);
      }
    } catch (e) {
      await i.editReply(`⚠️ Le message n'est pas parti : ${String((e as Error)?.message ?? e).slice(0, 300)}`);
    }
    return;
  }
}

/** M11 — « 📜 Tes Chambres : 9 sur 12 depuis le 1er septembre ». Seules les séances CLÔTURÉES
 *  comptent : c'est la clôture qui dit qui était là. */
async function historique(i: ChatInputCommandInteraction) {
  await i.deferReply({ flags: EPH });
  const { user, refus } = await compteDiscord(i.user.id);
  if (refus || !user) { await i.editReply({ content: M.reponse(refus ?? "compte_non_lie", { site: SITE_URL }), allowedMentions: RIEN }); return; }

  let cible = { id: user.id, username: user.username };
  let qui: string | null = null;
  const demande = i.options.getString("joueur")?.trim();
  if (demande) {
    if (!isStaff(i.member as GuildMember | null) && !canAccessAdmin(user.role)) {
      await i.editReply({ content: "⛔ Seul le staff consulte l'historique d'un autre membre.", allowedMentions: RIEN });
      return;
    }
    const compte = await prisma.user.findFirst({ where: { username: { equals: demande, mode: "insensitive" } }, select: { id: true, username: true } })
      ?? (await prisma.character.findFirst({ where: { name: { equals: demande, mode: "insensitive" } }, select: { user: { select: { id: true, username: true } } } }))?.user;
    if (!compte) { await i.editReply({ content: `⚠️ Aucun compte ni perso ne s'appelle « ${M.echapper(demande)} ».`, allowedMentions: RIEN }); return; }
    cible = compte;
    qui = compte.username;
  }

  const [lignes, seances] = await Promise.all([
    prisma.seanceParticipant.findMany({
      where: {
        seance: { evenement: "cs", clotureAt: { not: null } },
        OR: [{ userId: cible.id }, { userId: null, player: { equals: cible.username, mode: "insensitive" } }],
      },
      select: { pseudo: true, player: true, userId: true, present: true, seance: { select: { cle: true, date: true, resultat: true, debriefPublieAt: true } } },
    }),
    prisma.seanceGuilde.findMany({ where: { evenement: "cs", clotureAt: { not: null }, annulee: false }, select: { date: true }, orderBy: { date: "asc" } }),
  ]);
  // Toutes ces lignes sont celles d'un même compte (par son id, ou par son nom pour les plus
  // anciennes) : un seul joueur, tous ses persos réunis.
  const bilan = bilanParticipations(lignes.map((l) => ({ seance: l.seance.cle, date: l.seance.date, pseudo: l.pseudo, player: cible.username, userId: cible.id, present: l.present === true })))[0];
  const resultat = new Map(lignes.map((l) => [l.seance.date, l.seance.debriefPublieAt ? l.seance.resultat : null]));
  await i.editReply({
    ...M.messageHistorique({
      qui, joues: bilan?.joues ?? 0, total: seances.length, depuis: seances[0]?.date ?? null,
      presents: (bilan?.dates ?? []).map((date) => ({ date, resultat: resultat.get(date) ?? null })),
      absents: bilan?.absentLe ?? [],
    }, SITE_URL),
  });
}
