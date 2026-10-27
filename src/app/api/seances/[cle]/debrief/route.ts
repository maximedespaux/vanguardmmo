import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { derouleDe, resoudreCle, type ParametresCS, type ParametresGS } from "@/lib/evenements";
import { lirePatchDebrief } from "@/lib/chambres";
import { lireParametres, modifierDebrief, vueDebrief } from "@/lib/seances-serveur";

/**
 * UNE SAISIE DU DÉBRIEF (spec §6, route 7 ; §4.10, §7.5 ; lot 6) — le parcours du staff dans
 * l'onglet Bilans de /compositions. Le parcours dans Discord (`/chambre debrief`, décision 1) fait
 * le même geste par la même fonction (`modifierDebrief`) et les mêmes règles (lib/chambres).
 *
 * Corps : un patch PARTIEL — { etapes?: { "2.2": { statut?, chrono?: "6:12" | "", remarque? } },
 * resultat?: "gagne" | "perdu" | null, aRetenir? }. Seules les clés présentes changent : une note
 * s'enregistre au clic, une remarque à la sortie du champ (§7.5), sans bouton « Enregistrer ». Un
 * chrono vidé fait revenir la mesure du chrono en direct.
 *
 * Réponse : { ok, message, debrief, etapes, phases } — le débrief relu (résumé, analyse comparée
 * à la séance publiée juste avant, joueurs et leurs chiffres DÉCLARÉS figés à la clôture), pour
 * que l'écran se mette à jour sans attendre. 400 avec la raison (« Chrono illisible : écris par
 * exemple 2:34 ou 45s. », bot.py:2035-2037) ; 409 pour une séance annulée, pas encore jouée, ou
 * modifiée trois fois de suite pendant l'écriture.
 *
 * `avant` (facultatif) : ce que l'écran montrait des champs touchés. La page l'envoie, le bot
 * aussi (décision 1 : Discord écrit le même débrief) : si un autre membre du staff a changé l'un
 * de ces champs entre-temps, 409 « Un autre membre du staff vient de modifier… » et rien n'est
 * écrit — le second voit le conflit au lieu d'effacer la saisie du premier sans la voir.
 *
 * LE GUILD SIEGE (lot 9, §11.2) : le même débrief, SIMPLIFIÉ — le résultat, « à retenir » et les
 * vidéos ; des étapes seulement si le staff en a posé dans son paramétrage.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const { cle } = await params;
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), new Date(), gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  const lu = lirePatchDebrief(await req.json().catch(() => null));
  if (!lu.ok) return NextResponse.json({ error: lu.message }, { status: 400 });

  const pev = s.evenement === "cs" ? cs.data as ParametresCS : gs.data as ParametresGS;
  const res = await modifierDebrief(prisma, s, lu.patch, a.user.username, pev);
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
  const ligne = await prisma.seanceGuilde.findUnique({ where: { id: res.seance.id }, include: { participants: true } });
  const moi = a.user.username.toLowerCase();
  const debrief = await vueDebrief(prisma, ligne, pev, { staff: true, estMoi: (x) => (x.userId ? x.userId === a.user.id : x.player.toLowerCase() === moi) });
  const d = derouleDe(ligne?.etapes, pev);
  return NextResponse.json({ ok: true, message: res.message, debrief, etapes: d.etapes, phases: d.phases });
}
