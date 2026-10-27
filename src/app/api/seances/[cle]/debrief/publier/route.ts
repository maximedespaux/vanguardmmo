import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { audit } from "@/lib/audit";
import { resoudreCle, type ParametresCS, type ParametresGS } from "@/lib/evenements";
import { lireParametres, marquerDebriefPublie, publicationDebrief, vueDebrief } from "@/lib/seances-serveur";

/**
 * PUBLIER LE DÉBRIEF (spec §6, route 8 ; §8.6 ; lots 6 et 7) — sur le site d'abord : tous les
 * membres le lisent alors dans l'onglet Bilans. Puis, si la bascule depuis le bot Python est faite
 * (`nouveauxMessages`, §8.10), sur Discord : la commande `seance_debrief` est créée ICI, côté
 * serveur — jamais par /api/admin/bot-command, dont la liste ALLOWED ne la contient pas — et le
 * bot publie l'embed M7 et l'image dans le salon des débriefs (un fil, si c'est un forum). Sa
 * charge ne porte que l'id de la séance : le bot relit tout en base au moment de publier.
 * Tant que la bascule est coupée, c'est le bot Python qui publie ses débriefs : rien ne part.
 *
 * Corps : rien, ou { discord: false } — republier sur le site seulement ; ou { retirer: true } —
 * le débrief repasse en brouillon (le message Discord, lui, reste : il se supprime à la main).
 * Publier reste possible quand il manque des statuts : `manquants` les nomme (bot.py:1992,
 * :2016). REPUBLIER sur Discord crée un NOUVEAU message, et le lien passe sur lui (§8.6, point 5).
 *
 * Réponse : 202 quand une commande part (`commande`), 200 sinon ; `publication` dit où en est
 * Discord (la page la relit jusqu'à « faite » ou « échec »).
 *
 * LE GUILD SIEGE (lot 9) : son débrief part en EMBED, sans image (§11.2), dans le salon de ses
 * débriefs — dès qu'il est actif : le bot Python ne fait pas le Guild Siege, il n'y a pas de
 * bascule à attendre. `bascule` dit alors s'il est actif.
 */
export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const { cle } = await params;
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), new Date(), gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  const b = (await req.json().catch(() => null)) as { retirer?: unknown; discord?: unknown } | null;
  const retirer = b?.retirer === true;
  const pcs = cs.data as ParametresCS, pgs = gs.data as ParametresGS;
  const pev = s.evenement === "cs" ? pcs : pgs;
  // Discord part-il ? Les Chambres après la bascule ; le Guild Siege, s'il est actif.
  const discordOk = s.evenement === "cs" ? pcs.nouveauxMessages : pgs.actif;
  const res = await marquerDebriefPublie(prisma, s, a.user.username, pev, { retirer });
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });

  // Discord : seulement après la bascule, et jamais pour un retrait.
  let commande: string | null = null;
  let message = res.message;
  if (!retirer && b?.discord !== false) {
    // Une demande déjà en file (un double clic, deux membres du staff) ne publie pas deux fois.
    const deja = discordOk ? await prisma.botCommand.findFirst({
      where: { type: "seance_debrief", status: "PENDING", payload: { path: ["seanceId"], equals: res.seance.id } }, select: { id: true },
    }) : null;
    if (deja) {
      commande = deja.id;
      message += " L'image est déjà en route vers Discord : le bot la publie d'ici quelques secondes.";
    } else if (discordOk) {
      // La charge : l'id de la séance (et l'événement, pour le suivi de /discord) — rien d'autre.
      const payload = s.evenement === "gs" ? { seanceId: res.seance.id, evenement: "gs" } : { seanceId: res.seance.id };
      const cmd = await prisma.botCommand.create({ data: { type: "seance_debrief", payload, createdBy: a.user.username } });
      commande = cmd.id;
      message += s.evenement === "gs"
        ? " Il part sur Discord, dans le salon des débriefs du Guild Siege, d'ici quelques secondes."
        : " L'image part sur Discord, dans le salon des débriefs, d'ici quelques secondes.";
    } else {
      message += s.evenement === "cs"
        ? " Discord : rien ne part avant la bascule (le bot Python publie encore ses débriefs)."
        : " Discord : rien ne part tant que le Guild Siege est éteint.";
    }
  } else if (retirer && res.seance.debriefLien) {
    message += " Le message Discord, lui, reste : supprime-le à la main si besoin.";
  }
  await audit(a.user.username, retirer ? "seance.debrief_brouillon" : "seance.debrief_publie", s.cle, commande ? "site et Discord" : "site");

  const ligne = await prisma.seanceGuilde.findUnique({ where: { id: res.seance.id }, include: { participants: true } });
  const moi = a.user.username.toLowerCase();
  const debrief = await vueDebrief(prisma, ligne, pev, { staff: true, estMoi: (x) => (x.userId ? x.userId === a.user.id : x.player.toLowerCase() === moi) });
  const publication = await publicationDebrief(prisma, ligne, true);
  return NextResponse.json(
    { ok: true, message, publie: !retirer, manquants: res.manquants ?? [], commande, bascule: discordOk, debrief, publication },
    { status: commande ? 202 : 200 },
  );
}
