import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { audit } from "@/lib/audit";
import { resoudreCle, type ParametresCS } from "@/lib/evenements";
import { lireClicChrono } from "@/lib/chambres";
import { lireParametres, modifierChrono } from "@/lib/seances-serveur";

/**
 * UN CLIC DU CHRONO (spec §6, route 6 ; §4.9, §7.4 ; lot 5) — l'onglet Chrono de /compositions.
 * Le bot fait le même geste depuis les boutons du message Discord (M6), par la même fonction
 * (`modifierChrono`) et les mêmes règles (lib/chambres) : le staff valide une étape d'un côté
 * ou de l'autre, et les deux se lisent.
 *
 * Corps : { action: "suivante" | "annuler" | "arreter" | "reinitialiser", vu } — `vu`, le repère
 * de l'état que l'auteur voyait (`repere`). L'heure de chaque borne est celle du SERVEUR.
 *
 * Réponse : { ok, message, chrono, etapes, phases, maintenant } — l'état relu, pour que l'écran
 * se mette à jour sans attendre son rafraîchissement. 409 si l'état a bougé depuis `vu` (un autre
 * membre du staff vient de cliquer, ici ou dans Discord), pour une séance qui n'est pas celle
 * qui se joue, annulée ou clôturée : la réponse porte alors l'état tel qu'il est, à réafficher.
 * Le message Discord suit tout seul (synchro du bot toutes les 10 s pendant le chrono).
 */
export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const { cle } = await params;
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), new Date(), gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  if (s.evenement !== "cs") return NextResponse.json({ error: "Le Guild Siege n'a pas de chrono." }, { status: 400 });

  const lu = lireClicChrono(await req.json().catch(() => null));
  if (!lu.ok) return NextResponse.json({ error: lu.message }, { status: 400 });

  const res = await modifierChrono(prisma, s, lu.action, lu.vu, a.user.username, cs.data as ParametresCS);
  const etat = { chrono: res.chrono, etapes: res.deroule.etapes, phases: res.deroule.phases, maintenant: Date.now() };
  if (!res.ok) return NextResponse.json({ ok: false, error: res.message, conflit: res.conflit, ...etat }, { status: res.status });
  // Effacer tout le chrono est le seul geste qui détruit une mesure : le journal le garde.
  if (lu.action === "reinitialiser" && res.change) await audit(a.user.username, "seance.chrono", s.cle, "chrono effacé");
  return NextResponse.json({ ok: true, message: res.message, ...etat });
}
