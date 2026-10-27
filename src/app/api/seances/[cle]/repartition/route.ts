import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { audit } from "@/lib/audit";
import { resoudreCle, type ParametresCS } from "@/lib/evenements";
import { cleJoueur, lireAction, lireRepartition, vueRepartition, type EchangeFait } from "@/lib/chambres";
import { lireCompo, lireParametres, modifierRepartition, participantsSeance } from "@/lib/seances-serveur";

/**
 * UN GESTE DE RÉPARTITION (spec §6, route 5 ; §4.3, §4.4, §4.5 ; lots 4 et 10) — l'onglet
 * Répartition de /compositions. Le bot fait les mêmes gestes depuis Discord (boutons des salles
 * et des jumeaux, menus du staff, 📍 Mes positions, 🔄 Échanges), par la même fonction
 * (`modifierRepartition`) et les mêmes règles (lib/chambres).
 *
 * Corps (`ActionRepartition`) : `salle` (prendre ou libérer, `pseudo?`, `force?` pour le menu
 * « Placer… » du staff), `liberer`, `auto` (staff), `jumeau` (`place`, `pseudo?`, `force?`),
 * `jumeau_retirer`, `jumeau_echanger` (staff), `salles` (ses salles d'un coup) ; au lot 10,
 * `equilibrer` (staff), `demander` (`quoi` : `salle:s3` ou `jumeau`, `avec`, `pseudo?`) et
 * `repondre` (`demande`, `accepter`).
 *
 * Qui peut quoi : `pseudo` absent désigne LE participant de l'appelant ; un perso qui n'est pas à
 * l'appelant (`Character.userId`, résolu par le nom du perso) exige le staff — 403 sinon. Une
 * demande d'échange ne se fait que pour son propre perso ; y répondre est au joueur visé, ou au
 * staff ; le demandeur peut la retirer. Les participants sont ceux du §2.4 : aucun ami ni membre
 * caché n'en fait partie (seances-serveur.ts), on ne peut donc ni le placer, ni le voir placé.
 *
 * LES ÉCHANGES PRÉVIENNENT (lot 10) : le joueur visé, puis le demandeur, reçoivent une
 * notification du site (`notifierEchange`) ; après la bascule (`nouveauxMessages`), un message
 * privé Discord aussi — par une commande `seance_echange` mise en file ICI, côté serveur, jamais
 * par /api/admin/bot-command (sa liste ALLOWED ne la contient pas). Sa charge ne porte que l'id
 * de la séance, celui de la demande et un mot d'une liste fermée : le bot relit tout en base.
 *
 * Réponse : `{ ok, message, vue }` — la répartition relue, pour que l'écran se mette à jour sans
 * attendre son rafraîchissement de 15 s. 400 pour une séance du Guild Siege ; 409 pour une
 * séance clôturée, annulée, passée (pour un membre), un conflit, une place déjà prise, ou un
 * échange devenu impossible.
 */
export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  const staff = canAccessAdmin(a.user.role);
  const { cle } = await params;
  const maintenant = new Date();
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), maintenant, gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  if (s.evenement !== "cs") return NextResponse.json({ error: "Le Guild Siege n'a pas de répartition des phases." }, { status: 400 });

  const lu = lireAction(await req.json().catch(() => null));
  if (!lu.ok) return NextResponse.json({ error: lu.message }, { status: lu.status });
  // Une séance commencée depuis plus de 6 h est jouée : un membre n'y touche plus. Le staff,
  // lui, peut encore rectifier avant de clôturer — la clôture fige ce qu'elle lit.
  if (!staff && maintenant.getTime() - s.debut.getTime() > 6 * 3_600_000) {
    return NextResponse.json({ error: "Cette séance est passée : sa répartition ne bouge plus." }, { status: 409 });
  }

  const pcs = cs.data as ParametresCS;
  const parts = await participantsSeance(prisma, s, await lireCompo(prisma), pcs, maintenant.getTime());
  // Les chiffres DÉCLARÉS : le geste les lit toujours (« Équilibrer » forme les mêmes équipes que
  // dans Discord) ; leur AFFICHAGE suit le paramétrage (`degats.composition`) — la vue rendue et
  // la réponse d'« Équilibrer » les taisent quand il les masque.
  const joueurs = parts.participants.map((p) => ({ ...p, chiffres: pcs.degats.composition ? p.chiffres : [] }));
  const miens = parts.participants.filter((p) => p.userId === a.user.id).map((p) => cleJoueur(p.pseudo));
  const nonRetenus = parts.autres.filter((p) => p.userId === a.user.id).map((p) => cleJoueur(p.pseudo));
  const ctx = { joueurs: parts.participants, salles: pcs.salles, staff, miens, nonRetenus, maintenant: maintenant.getTime(), chiffresVisibles: pcs.degats.composition };
  const ctxVue = { joueurs, salles: pcs.salles };
  const comptes = new Map(parts.participants.map((p) => [cleJoueur(p.pseudo), p.userId]));
  const qui = { miens, staff, now: maintenant.getTime() };

  const res = await modifierRepartition(prisma, s, lu.action, ctx, { comptes: (k) => comptes.get(k) ?? null, discord: pcs.nouveauxMessages });
  if (res.echange && res.seance) await avertirSurDiscord(res.seance.id, res.echange, pcs, a.user.username);
  if (!res.ok) {
    // La vue relue accompagne le refus : « déjà prise par Kaelis » se voit tout de suite à l'écran.
    const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, select: { repartition: true } });
    return NextResponse.json({ ok: false, error: res.message, message: res.message, vue: vueRepartition(lireRepartition(ligne?.repartition), ctxVue, qui) }, { status: res.status });
  }
  // Le journal garde les gestes du staff sur les autres ; ceux d'un joueur sur lui-même n'y
  // ajouteraient que du bruit.
  // « Libérer » : le menu « Placer… » du staff (un membre ne libère que la sienne, et passe par
  // « salle »). Le même relevé que les gestes du staff faits dans Discord (bot/lib/seances.ts).
  // Lot 10 : « équilibrer » écrase les places de tous ; une réponse du staff à une demande qui
  // ne le vise pas décide pour un autre.
  const surAutrui = lu.action.action === "auto" || lu.action.action === "jumeau_echanger" || lu.action.action === "liberer" || lu.action.action === "equilibrer"
    || (lu.action.action === "repondre" && res.echange?.demande.reponse?.par === "staff")
    || ("pseudo" in lu.action && !!lu.action.pseudo && !miens.includes(cleJoueur(lu.action.pseudo)))
    || ("force" in lu.action && !!lu.action.force);
  if (staff && surAutrui) await audit(a.user.username, "seance.repartition", s.cle, res.message);
  return NextResponse.json({ ok: true, message: res.message, vue: vueRepartition(res.repartition, ctxVue, qui) });
}

/**
 * Le message privé Discord d'un échange (lot 10) : mis en file pour le bot, APRÈS la bascule
 * seulement (§8.10 — tant que le bot Python tourne, notre bot n'écrit pas aux joueurs pour les
 * Chambres). Un retrait par le demandeur ne prévient personne. La notification du site, elle,
 * est déjà partie (`notifierEchange`).
 */
async function avertirSurDiscord(seanceId: string, e: EchangeFait, pcs: ParametresCS, par: string) {
  if (!pcs.nouveauxMessages) return;
  if (e.quoi === "reponse" && e.demande.reponse?.par === "demandeur") return;
  await prisma.botCommand.create({ data: { type: "seance_echange", payload: { seanceId, demande: e.demande.id, quoi: e.quoi }, createdBy: par } })
    .catch((err) => console.error("[repartition] message privé de l'échange :", err));
}
