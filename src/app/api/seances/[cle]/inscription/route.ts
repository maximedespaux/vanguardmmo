import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { resoudreCle } from "@/lib/evenements";
import { inscrireGS, lireParametres } from "@/lib/seances-serveur";

/**
 * « JE VIENS » AU GUILD SIEGE (spec §6, route 12 ; §11.2 ; lot 9) — l'onglet Guild Siege de
 * /compositions. Le bouton « ✅ Je viens » du panneau Discord fait le même geste, par la même
 * fonction (`inscrireGS`) et les mêmes règles (lib/evenements).
 *
 * Corps : { pseudo: string, viens: boolean }. LIBRE : ni poste ni « retenu », un perso par
 * compte et par séance — venir avec un autre perso REMPLACE le premier. `viens: false` retire
 * l'annonce du compte, quel que soit le perso nommé.
 *
 * Réponse : { annonces: n, quoi, message }. 403 si le perso n'est pas à l'appelant, ou pour un
 * membre caché (il n'apparaît jamais parmi les joueurs d'une séance) ; 409 après la clôture,
 * pour une séance annulée, commencée, qui n'est pas la prochaine, complète, ou quand le Guild
 * Siege est éteint (décision 2 : codé mais INACTIF tant que le staff ne l'allume pas) ; 400 pour
 * une Chambre — elle s'annonce depuis l'onglet Inscription, sur la composition.
 */
export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  // Un membre caché par un bras droit n'apparaît jamais parmi les joueurs : son annonce serait
  // invisible partout, sans qu'il le sache. On le lui dit, comme le ⛔ du bot.
  if (a.user.cacheLe) return NextResponse.json({ error: "Ton compte n'apparaît pas dans la liste de la guilde : vois avec le staff." }, { status: 403 });
  const { cle } = await params;
  const maintenant = new Date();
  const gs = await lireParametres(prisma, "gs");
  const r = resoudreCle(decodeURIComponent(cle), maintenant, gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  if (s.evenement !== "gs") return NextResponse.json({ error: "Une Chambre s'annonce depuis l'onglet Inscription, sur la composition." }, { status: 400 });

  const b = await req.json().catch(() => null) as { pseudo?: unknown; viens?: unknown } | null;
  if (typeof b?.viens !== "boolean") return NextResponse.json({ error: "Je viens, ou pas cette fois : précise-le." }, { status: 400 });
  const pseudo = typeof b.pseudo === "string" ? b.pseudo.trim().slice(0, 80) : "";
  if (b.viens && !pseudo) return NextResponse.json({ error: "Choisis le perso avec lequel tu viens." }, { status: 400 });

  // Le perso doit être AU compte qui appelle, relu en base (par son nom : `charId` change à
  // chaque synchro de l'AirBuilder, piège n° 1).
  const perso = b.viens
    ? await prisma.character.findFirst({
      where: { userId: a.user.id, name: { equals: pseudo, mode: "insensitive" } },
      select: { name: true, class: true, gearProfiles: { select: { mesures: true } } },
    })
    : null;
  if (b.viens && !perso) return NextResponse.json({ error: "Ce perso n'est pas à toi." }, { status: 403 });

  const res = await inscrireGS(prisma, s, {
    compte: { id: a.user.id, username: a.user.username }, perso, viens: b.viens, p: gs.data, maintenant: maintenant.getTime(),
  });
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
  return NextResponse.json({ cle: s.cle, annonces: res.annonces, quoi: res.geste.quoi, message: res.geste.message });
}
