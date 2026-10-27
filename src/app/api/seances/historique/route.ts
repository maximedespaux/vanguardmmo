import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { bilanParticipations, dateLongue, heureDite, partiesParis, type ParametresCS, type ParametresGS, type Participation } from "@/lib/evenements";
import { lignesVisibles, lireParametres } from "@/lib/seances-serveur";
import { analyseDebrief, lireChrono, precedentsDe, resumeDeSeance, tempsDuBilan } from "@/lib/chambres";

/**
 * L'HISTORIQUE — l'onglet Bilans de /compositions (spec §4.8 ; §6, route 13).
 *
 * La liste des séances avec leur résultat et leur temps (publics sur Discord de toute façon),
 * et les participations. Le STAFF voit tout : le classement des 40 premiers et, séance par
 * séance, qui était là. Un MEMBRE voit sa propre ligne, et rien des autres que des nombres.
 *
 * Seules les séances CLÔTURÉES comptent dans les participations : une séance rouverte attend sa
 * nouvelle clôture. Aucun ami ni membre caché n'apparaît (relu à la lecture : un membre caché
 * depuis la clôture disparaît aussi des anciennes séances).
 *
 * Lot 6 : le temps d'une séance est la somme des chronos RETENUS par son débrief (la mesure, ou
 * la correction du staff) ; son écart à la séance publiée juste avant, et le record, suivent
 * l'analyse du débrief (§4.10). Un membre ne voit ces corrections, l'écart et le résultat
 * qu'une fois le débrief publié — avant, le temps du chrono pris en direct, public de toute façon.
 * Un débrief importé (le 18/10/2026) dit combien ils étaient, sans dire qui.
 *
 * Lot 9 : `?evenement=gs` — le filtre « Guild Siege » de Bilans. Participations et victoires
 * comptées à part (§11.2), sur son propre déroulé (sans étapes par défaut). Ses lignes non
 * clôturées sont des ANNONCES : elles ne comptent pas, mais leur nombre se dit.
 */
export async function GET(req: Request) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  const staff = canAccessAdmin(a.user.role);
  const q = new URL(req.url).searchParams;
  const ev = q.get("evenement") ?? "cs";
  if (ev !== "cs" && ev !== "gs") return NextResponse.json({ error: "Événement inconnu : cs ou gs." }, { status: 400 });
  const limite = Math.min(100, Math.max(1, Number.parseInt(q.get("limite") ?? "30", 10) || 30));

  const maintenant = Date.now();
  const [seances, cs, gs, publiees] = await Promise.all([
    prisma.seanceGuilde.findMany({
      where: { evenement: ev, debut: { lte: new Date(maintenant + 8 * 86_400_000) } },
      orderBy: { debut: "desc" }, take: limite,
      // Les vidéos PRÊTES (lot 8) : un envoi en cours ne compte pas.
      include: { participants: true, _count: { select: { videos: { where: { statut: "pret" } } } } },
    }),
    lireParametres(prisma, "cs"),
    lireParametres(prisma, "gs"),
    // Toutes les séances PUBLIÉES : l'écart de chaque ligne se mesure à celle d'avant, même hors
    // de la page de résultats.
    prisma.seanceGuilde.findMany({
      where: { evenement: ev, debriefPublieAt: { not: null }, annulee: false },
      orderBy: { debut: "asc" },
      select: { cle: true, date: true, debut: true, etapes: true, chrono: true, debrief: true, resultat: true, aRetenir: true },
    }),
  ]);
  // Le déroulé de l'événement filtré : celui des Chambres, ou celui du Guild Siege.
  const pcs = ev === "cs" ? cs.data as ParametresCS : gs.data as ParametresGS;
  const comparees = publiees.map((r) => ({ cle: r.cle, date: r.date, debut: r.debut.getTime(), publie: true, resume: resumeDeSeance(r, pcs).resume }));
  const moiNom = a.user.username.toLowerCase();
  const estMoi = (x: { userId: string | null; player: string }) => (x.userId ? x.userId === a.user.id : x.player.toLowerCase() === moiNom);

  const visibles = await lignesVisibles(prisma, seances.flatMap((s) => s.participants));
  const garde = new Set(visibles.map((l) => l.id));
  const noms = new Map((await prisma.user.findMany({
    where: { id: { in: [...new Set(visibles.map((l) => l.userId).filter((x): x is string => !!x))] } },
    select: { id: true, username: true },
  })).map((u) => [u.id, u.username]));

  const participations: Participation[] = [];
  const lignes = seances.map((s) => {
    const rows = s.participants.filter((l) => garde.has(l.id));
    const cloturee = !!s.clotureAt;
    if (cloturee) for (const l of rows) participations.push({ seance: s.cle, date: s.date, pseudo: l.pseudo, player: l.player, userId: l.userId, present: l.present === true });
    const miennes = rows.filter(estMoi);
    const publie = !!s.debriefPublieAt;
    // Le brouillon d'un débrief ne regarde que le staff : un membre lit la mesure seule.
    const voit = staff || publie;
    const { resume, debrief } = resumeDeSeance(s, pcs, voit);
    const note = Object.keys(debrief.notes).length > 0 || !!s.resultat || !!s.aRetenir;
    const analyse = voit && (note || resume.total > 0) ? analyseDebrief(resume, precedentsDe(comparees, { cle: s.cle, debut: s.debut.getTime() })) : null;
    return {
      cle: s.cle, date: s.date, creneau: s.creneau, label: `${dateLongue(s.date)} · ${heureDite(partiesParis(s.debut).hhmm)}`,
      annulee: s.annulee, motif: s.motifAnnulation,
      cloturee, clotureAt: s.clotureAt?.getTime() ?? null,
      resultat: voit ? s.resultat : null,
      // Le temps retenu (mesure ou correction) ; « en cours » pour un chrono qui tourne encore,
      // « partiel » quand une étape n'a pas de chrono (tempsDuBilan).
      ...tempsDuBilan(resume, lireChrono(s.chrono)),
      // L'écart à la séance publiée juste avant : entre deux temps COMPLETS seulement (§4.10).
      ecart: analyse?.ecartTotal ?? null, record: analyse?.record ?? false,
      presents: cloturee ? rows.filter((l) => l.present).length : null,
      absents: cloturee ? rows.filter((l) => l.present === false).length : null,
      // Combien ils étaient sans clôture : le nombre d'un débrief importé (qui, on ne le sait pas).
      joueursImport: !cloturee ? debrief.importe?.joueurs ?? null : null,
      // Le Guild Siege avant sa clôture : combien se sont annoncés (des comptes visibles).
      annonces: ev === "gs" && !cloturee ? rows.length : null,
      importe: !!debrief.importe,
      // Un membre voit les vidéos d'un débrief publié seulement (§10.3) : avant, pas même leur nombre.
      publie, videos: voit ? s._count.videos : 0,
      // L'état du débrief : publié pour tous ; le brouillon et « à faire » pour le staff seul.
      debrief: publie ? "publie" : !staff ? null : note ? "brouillon" : !s.annulee && s.debut.getTime() <= maintenant ? "a_faire" : null,
      moi: cloturee && miennes.length ? { present: miennes.some((l) => l.present), pseudos: miennes.map((l) => l.pseudo) } : null,
      // Qui était là, et ses chiffres figés : dans le débrief de la séance (route 4,
      // `?partie=debrief`), qui l'ouvre — plus ici.
    };
  });

  const publies = seances.filter((s) => s.debriefPublieAt);
  const bilan = { victoires: publies.filter((s) => s.resultat === "gagne").length, defaites: publies.filter((s) => s.resultat === "perdu").length };
  const tous = bilanParticipations(participations, (id) => noms.get(id) ?? null);
  const miennes = bilanParticipations(participations.filter(estMoi), (id) => noms.get(id) ?? null);
  return NextResponse.json({
    evenement: ev,
    seances: lignes,
    cloturees: lignes.filter((l) => l.cloturee).length,
    bilan,
    // Le staff : le classement des participations, 40 premiers (modèle : `/historique`).
    participations: staff ? tous.slice(0, 40) : undefined,
    // Chacun : sa propre ligne (tous ses persos réunis).
    moi: miennes[0] ?? null,
  });
}
