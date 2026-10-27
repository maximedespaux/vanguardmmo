// ════════════════════════════════════════════════════════════
//  /recensement — les chiffres déclarés, EN LECTURE (SPEC-CHAMBRES §8.4, M11 ; lot 3)
//
//  La saisie se fait dans l'AirBuilder du site ; ici, on la lit. Sans option : ses propres
//  chiffres, perso par perso et rôle par rôle. Avec `classe` : le classement d'une classe, 15
//  lignes au plus, et le lien vers la section filtrée du site.
//
//  Réservé aux MEMBRES, relus en base (canAccessGuild et actif) : le serveur Discord compte
//  aussi des visiteurs et des candidats, et sans ce contrôle `/recensement classe:Arcaniste`
//  leur montrerait les chiffres de la guilde (contre-examen n° 4). Réponses éphémères : seul
//  l'auteur les voit.
// ════════════════════════════════════════════════════════════
import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import type { CharacterClass } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { SITE_URL } from "../config.js";
import { GUILD_ROLES } from "@/config/roles";
import { classeAffichee } from "@/lib/compositions";
import { CLASSES_CLES, NOMS_CLASSES } from "@/lib/evenements";
import { chiffresParRole, ORDRE_ROLES } from "@/lib/recensement";
import { compteDiscord } from "../lib/seances.js";
import * as M from "../lib/seances-messages.js";

const EPH = MessageFlags.Ephemeral;

export const data = new SlashCommandBuilder()
  .setName("recensement")
  .setDescription("Tes chiffres déclarés (DPS, PV), ou le classement d'une classe")
  .addStringOption((o) => o.setName("classe").setDescription("Le classement d'une classe")
    .addChoices(...CLASSES_CLES.map((c) => ({ name: NOMS_CLASSES[c], value: c }))));

export async function execute(i: ChatInputCommandInteraction) {
  await i.deferReply({ flags: EPH });
  const { user, refus } = await compteDiscord(i.user.id);
  if (refus || !user) {
    await i.editReply({ content: M.reponse(refus ?? "compte_non_lie", { site: SITE_URL, quoi: "Le recensement est réservé" }), allowedMentions: { parse: [] } });
    return;
  }
  const maintenant = Date.now();
  const choisie = i.options.getString("classe");
  // La liste fermée des choix le garantit déjà ; on ne passe pas pour autant une chaîne libre à la base.
  const classe = CLASSES_CLES.find((c) => c === choisie) ?? null;

  if (!classe) {
    const persos = await prisma.character.findMany({
      where: { userId: user.id },
      select: { name: true, class: true, isMain: true, gearProfiles: { select: { mesures: true } } },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
    });
    await i.editReply(M.messageMesChiffres(persos.map((c) => {
      const cl = classeAffichee(c.class);
      return { name: c.name, classe: cl, par: chiffresParRole(c.gearProfiles, cl, maintenant) };
    }), SITE_URL));
    return;
  }

  // Les persos de la classe chez les comptes de la guilde, actifs et visibles — RIEN d'autre du
  // stuff que ses mesures (spec §12.2).
  const persos = await prisma.character.findMany({
    where: { class: classe.toUpperCase() as CharacterClass, user: { isActive: true, cacheLe: null, role: { in: GUILD_ROLES } } },
    select: { name: true, class: true, user: { select: { username: true } }, gearProfiles: { select: { mesures: true } } },
  });
  const lignes: M.LigneClasse[] = persos.flatMap((c): M.LigneClasse[] => {
    const par = chiffresParRole(c.gearProfiles, classe, maintenant);
    const roles = ORDRE_ROLES.filter((r) => par[r]);
    return roles.length
      ? roles.map((r) => ({ perso: c.name, joueur: c.user.username, role: r, chiffre: par[r]! }))
      : [{ perso: c.name, joueur: c.user.username, role: null, chiffre: null }];
  });
  await i.editReply(M.messageClasse(classe, lignes, SITE_URL));
}
