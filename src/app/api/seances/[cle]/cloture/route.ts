import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { audit } from "@/lib/audit";
import { resoudreCle, type ParametresCS } from "@/lib/evenements";
import { cloturerGS, cloturerSeance, lireParametres, rouvrirSeance } from "@/lib/seances-serveur";

/**
 * LA CLÔTURE — « Ils étaient là » (spec §4.8 ; §6, route 9).
 *
 * Après la séance, le staff coche qui était vraiment là : tous les participants le sont par
 * défaut, il décoche les absents, et peut AJOUTER un annoncé non retenu venu quand même. Une
 * ligne `SeanceParticipant` par personnage : `present: true` pour les cochés, `false` pour les
 * participants décochés. Une nouvelle clôture REMPLACE les lignes (effacement puis création,
 * dans la transaction de `majSeance`) : elle ne les double jamais.
 *
 * La page l'appelle sur `cs_derniere` — la dernière séance COMMENCÉE —, jamais sur la
 * prochaine : le jeudi à 9 h, c'est le mercredi qu'on clôture. Une séance pas encore commencée
 * répond 409.
 *
 * Le geste lui-même est `cloturerSeance` (lib/seances-serveur) : /chambre cloturer dans Discord
 * (décision 1) passe par la même fonction, les mêmes règles et le même verrou de version. Cette
 * route ne fait que lire le corps, appeler, et noter le geste au journal.
 *
 * L'ancienne route POST /api/compositions/presences reste en place mais plus rien ne
 * l'appelle (piège n° 6) : elle comptait sans rien écrire. Celle-ci écrit, et dit ce qu'elle a
 * écrit. Puis elle met en file `seance_fermer` (lot 3) si la séance a un message Discord vivant
 * ouvert (panneau, récap, répartition, chrono) : il passe en « · terminée », boutons retirés. La
 * commande naît ICI, côté serveur, et ne porte que l'id de la séance.
 *
 * LE GUILD SIEGE (lot 9) : la même clôture, sur ses ANNONCÉS (`cloturerGS`) — les cochés sont
 * présents, les autres absents, et leur chiffre DÉCLARÉ du moment se fige sur leur ligne. Pas
 * d'« ajoutés » : sans « retenu », tout annoncé est déjà dans la liste.
 */

const NOMS_MAX = 60;
const lireNoms = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length <= NOMS_MAX && v.every((x) => typeof x === "string" && x.length <= 80) ? (v as string[]) : null;

export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const { cle } = await params;
  const maintenant = new Date();
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), maintenant, gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  if (s.debut.getTime() > maintenant.getTime()) {
    return NextResponse.json({ error: `La séance du ${s.label} n'a pas encore commencé : on clôture une séance jouée.` }, { status: 409 });
  }

  const b = await req.json().catch(() => null) as { presents?: unknown; ajoutes?: unknown; rouvrir?: unknown } | null;
  if (b?.rouvrir === true) {
    const res = await rouvrirSeance(prisma, s);
    if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
    await audit(a.user.username, "seance.rouvrir", s.cle);
    return NextResponse.json({ cle: s.cle, rouverte: true, message: res.message });
  }

  const presents = lireNoms(b?.presents);
  const ajoutes = b?.ajoutes === undefined ? [] : lireNoms(b.ajoutes);
  if (!presents || !ajoutes) return NextResponse.json({ error: "La liste des présents est illisible." }, { status: 400 });

  const res = s.evenement === "gs"
    ? await cloturerGS(prisma, s, { presents: [...presents, ...ajoutes], par: a.user.username, maintenant: maintenant.getTime() })
    : await cloturerSeance(prisma, s, { presents, ajoutes, par: a.user.username, p: cs.data as ParametresCS, maintenant: maintenant.getTime() });
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
  await audit(a.user.username, "seance.cloturer", s.cle, `${res.presents} présent(s), ${res.absents} absent(s)`);
  if (res.aFermer) {
    await prisma.botCommand.create({ data: { type: "seance_fermer", payload: { seanceId: res.seance.id, evenement: s.evenement }, createdBy: a.user.username } }).catch(() => null);
  }
  return NextResponse.json({ cle: s.cle, presents: res.presents, absents: res.absents, message: res.message });
}
