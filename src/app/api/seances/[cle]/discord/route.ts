import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { audit } from "@/lib/audit";
import { publicationPermise, publicationPermiseGS, resoudreCle, type MessageVivant, type ParametresCS, type ParametresGS } from "@/lib/evenements";
import { lireParametres, majSeance } from "@/lib/seances-serveur";
import type { SeanceParis } from "@/lib/evenements";

/**
 * PUBLIER OU REPUBLIER UN MESSAGE DISCORD DE LA SÉANCE, TOUT DE SUITE (spec §6, route 11) — le
 * bouton « Republier » de l'onglet Inscription (§7.2).
 *
 * Corps : { quoi: "panneau" | "recap" | "repartition" | "chrono" }.
 * Le bot publie un NOUVEAU message, SANS MENTION (une republication ne réveille personne), et
 * ferme l'ancien : deux panneaux, deux récaps, deux répartitions ou deux chronos vivants pour la
 * même séance ne coexistent jamais. « repartition » publie les deux messages à boutons de la
 * Phase 1 (les salles des Asuras) et de la Phase 2 (les équipes des Jumeaux) — décision 1 de
 * Maxime : tout se fait aussi dans Discord, comme chez Dracarys. « chrono » (lot 5, M6) publie
 * le chrono en direct de la séance qui se joue, avec ses boutons réservés au staff.
 *
 * La commande `seance_publier` est créée ICI, côté serveur, jamais par
 * /api/admin/bot-command ; sa charge ne porte que l'id de la séance, le mot `quoi` et
 * l'événement.
 *
 * LE GUILD SIEGE (lot 9) : seul son panneau se publie (« Je viens », libre). Pas de bascule (le
 * bot Python ne fait pas le Guild Siege) : il faut seulement qu'il soit ACTIF (décision 2).
 */
export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const { cle } = await params;
  const maintenant = new Date();
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), maintenant, gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  const b = await req.json().catch(() => null) as { quoi?: unknown } | null;
  if (s.evenement === "gs") return publierGS(s, b?.quoi, gs.data as ParametresGS, maintenant, a.user.username);
  if (b?.quoi !== "panneau" && b?.quoi !== "recap" && b?.quoi !== "repartition" && b?.quoi !== "chrono") {
    return NextResponse.json({ error: "Quoi publier ? « panneau », « recap », « repartition » ou « chrono »." }, { status: 400 });
  }
  const quoi = b.quoi as MessageVivant;
  const nom = quoi === "panneau" ? "le panneau" : quoi === "recap" ? "le récap" : quoi === "chrono" ? "le chrono" : "la répartition";

  // Tant que le bot Python tourne, nos messages feraient doublon avec les siens (§8.10).
  if (!(cs.data as ParametresCS).nouveauxMessages) {
    return NextResponse.json({ error: `La bascule est coupée : ${nom} part avec « Messages de notre bot » (paramétrage des événements). Arrête d'abord le bot Python.` }, { status: 409 });
  }
  // La séance qu'on prépare, ou celle qui se joue : un message d'une séance passée, ou lointaine,
  // aurait des boutons qui répondraient tous « séance passée ». Le bot relit la même règle au
  // moment d'exécuter la demande.
  const refus = publicationPermise(s, maintenant, quoi);
  if (refus) return NextResponse.json({ error: refus }, { status: 409 });

  // La séance naît ici si besoin (premier geste) : le bot la retrouve par son id.
  const res = await majSeance(prisma, s, (x) => {
    if (x.annulee) return { ok: false, status: 409, message: `Cette séance est annulée : pas de ${nom.replace(/^(le |la )/, "")}.` };
    if (x.clotureAt) return { ok: false, status: 409, message: `Cette séance est clôturée : pas de ${nom.replace(/^(le |la )/, "")}.` };
    return { ok: true, patch: {} };
  });
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });

  const cmd = await prisma.botCommand.create({ data: { type: "seance_publier", payload: { seanceId: res.seance.id, quoi }, createdBy: a.user.username } });
  await audit(a.user.username, "seance.publier", s.cle, quoi);
  return NextResponse.json({ commande: cmd.id }, { status: 202 });
}

/** Le panneau du Guild Siege : la séance qui vient (ou qui se joue), le siège allumé, ni annulée
 *  ni clôturée. La séance naît ici si besoin : le bot la retrouve par son id. */
async function publierGS(s: SeanceParis, quoi: unknown, pgs: ParametresGS, maintenant: Date, par: string) {
  if (quoi !== "panneau") return NextResponse.json({ error: "Le Guild Siege ne publie que son panneau." }, { status: 400 });
  if (!pgs.actif) return NextResponse.json({ error: "Le Guild Siege n'est pas actif (paramétrage des événements) : son panneau ne part pas." }, { status: 409 });
  const refus = publicationPermiseGS(s, maintenant, pgs.creneaux);
  if (refus) return NextResponse.json({ error: refus }, { status: 409 });
  const res = await majSeance(prisma, s, (x) => {
    if (x.annulee) return { ok: false, status: 409, message: "Ce Guild Siege est annulé : pas de panneau." };
    if (x.clotureAt) return { ok: false, status: 409, message: "Ce Guild Siege est clôturé : pas de panneau." };
    return { ok: true, patch: {} };
  });
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
  const cmd = await prisma.botCommand.create({ data: { type: "seance_publier", payload: { seanceId: res.seance.id, quoi: "panneau", evenement: "gs" }, createdBy: par } });
  await audit(par, "seance.publier", s.cle, "panneau");
  return NextResponse.json({ commande: cmd.id }, { status: 202 });
}
