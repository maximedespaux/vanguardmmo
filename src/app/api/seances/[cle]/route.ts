import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { Prisma, type SeanceGuilde, type SeanceParticipant } from "@prisma/client";
import {
  RAPPELS_CS_DEFAUT, dateLongue, derouleDe, heureDite, lireDeroule, partiesParis, postesEffectifs, remplirTexte, resoudreCle,
  type DetailsParticipant, type ParametresCS, type ParametresGS, type Participant, type SeanceParis,
} from "@/lib/evenements";
import { creneauDe, instantRappel, refusInscriptionGS } from "@/lib/evenements";
import { nbPlaces, phraseManques } from "@/lib/compositions";
import {
  cleJoueur, lireChrono, lireRepartition, positionsDe, recap, recapEnNoms, refusChronoSeance, totalChrono, vueRepartition,
  type Positions, type RecapNoms, type VueRepartition,
} from "@/lib/chambres";
import { joueursGS, lignesVisibles, lireCompo, lireParametres, participantsSeance, publicationDebrief, vueDebrief, type ParticipantsSeance } from "@/lib/seances-serveur";
import { videosDeLaSeance } from "@/lib/videos-serveur";

/**
 * UNE SÉANCE, CE QUE VOIENT LES MEMBRES (spec §6, route 4 ; `VueSeance`).
 *
 * `[cle]` : `cs_2026-10-21_mer`, ou `cs_courante` / `cs_derniere` (et leurs pendants GS).
 * La lecture ne crée JAMAIS la séance : elle naît au premier geste (clôture, annulation…).
 *
 * Au lot 2, la vue porte la séance, ses participants (avec leurs chiffres DÉCLARÉS), le
 * déroulé et le constat de la clôture ; au lot 3, pour le staff, l'état du panneau Discord ; au
 * lot 4, la répartition des phases (salles, jumeaux et leurs totaux DÉCLARÉS), le récap tel
 * qu'il partira sur Discord, et « Mes positions » de l'appelant ; au lot 5, le chrono (et, pour
 * le staff, son message Discord) ; au lot 6, le débrief (`debrief` : résumé, analyse comparée à
 * la séance publiée juste avant, joueurs de la clôture et leurs chiffres DÉCLARÉS figés ce
 * soir-là) — pour un membre, seulement une fois publié ; au lot 7, `publication` : où en est sa
 * publication en image sur Discord ; au lot 8, `videos` : les vidéos jointes au débrief que
 * l'appelant peut voir (§10.3 — le staff tout de suite, les membres une fois le débrief publié).
 *
 * `?partie=chrono` : la réponse ALLÉGÉE de l'onglet Chrono, relue toutes les 5 s pendant que le
 * chrono tourne (§7.4) — ni participants, ni répartition, ni récap : une seule lecture de la
 * séance. `&liste=1` y ajoute les séances récentes qui ont un chrono (le sélecteur de l'onglet).
 *
 * `?partie=debrief` : la réponse de l'onglet Bilans, quand on ouvre une séance (§7.5) — l'en-tête
 * de la séance et son débrief, sans recalculer les participants de la composition.
 *
 * LE GUILD SIEGE (lot 9, §11) : ses participants sont les ANNONCÉS (lignes `SeanceParticipant`,
 * un perso par compte), avec le chiffre DÉCLARÉ de chacun (DPS, à défaut Tank, à défaut Off
 * tank) ; `inscription` dit si « Je viens » est ouvert, et pourquoi pas ; `gs` porte le créneau
 * (fin d'inscription), le plafond et la règle du siège. Son débrief est le même, simplifié : sans
 * étapes par défaut. Pas de répartition, de récap ni de chrono.
 *
 * Jamais de `discordId` ni de blob de build ; l'id d'un compte ne sort pas non plus — `moi`
 * le remplace. Aucun ami ni membre caché parmi les participants (seances-serveur.ts).
 */
export async function GET(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  const staff = canAccessAdmin(a.user.role);
  const { cle } = await params;
  const maintenant = new Date();
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), maintenant, gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  const pcs = cs.data as ParametresCS;
  const pgs = gs.data as ParametresGS;
  // Le paramétrage de l'événement de la séance : son déroulé, et l'affichage de ses dégâts.
  const pev = s.evenement === "cs" ? pcs : pgs;
  const q = new URL(req.url).searchParams;
  if (q.get("partie") === "chrono") return vueChrono(s, pcs, staff, maintenant, q.get("liste") === "1");

  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, include: { participants: true } });
  const moiNom = a.user.username.toLowerCase();
  const estMoi = (x: { userId: string | null; player: string }) => (x.userId ? x.userId === a.user.id : x.player.toLowerCase() === moiNom);
  // LE DÉBRIEF (lot 6 ; le Guild Siege au lot 9) : un membre ne lit qu'un débrief publié, le staff
  // aussi le brouillon.
  const debrief = await vueDebrief(prisma, ligne, pev, { staff, estMoi });
  // La publication du débrief sur Discord (lot 7) : la dernière commande `seance_debrief` de la
  // séance. La raison d'un échec (le texte brut de Discord) et l'état de la bascule : le staff seul.
  // Le Guild Siege n'a pas de bot Python à remplacer : son débrief part dès qu'il est actif.
  const publication = { ...(await publicationDebrief(prisma, ligne, staff)), bascule: staff ? (s.evenement === "cs" ? pcs.nouveauxMessages : pgs.actif) : null };
  // Les vidéos (lot 8) : celles que l'appelant peut voir ; `gerer` (modifier, supprimer) au staff.
  const videos = await videosDeLaSeance(prisma, ligne, { staff, moi: a.user.id });
  if (q.get("partie") === "debrief") {
    const d = derouleDe(ligne?.etapes, pev);
    return NextResponse.json({
      cle: s.cle, evenement: s.evenement, date: s.date, creneau: s.creneau, label: s.label,
      debut: s.debut.getTime(), commencee: s.debut.getTime() <= maintenant.getTime(), existe: !!ligne,
      annulee: ligne?.annulee ?? false, motif: ligne?.motifAnnulation ?? null,
      cloturee: !!ligne?.clotureAt, clotureAt: ligne?.clotureAt?.getTime() ?? null, cloturePar: staff ? ligne?.cloturePar ?? null : null,
      maintenant: maintenant.getTime(),
      etapes: d.etapes, phases: d.phases, figees: !!lireDeroule(ligne?.etapes),
      // Les salles du paramétrage : les clés figées à la clôture (« s3 ») s'affichent sous leur nom.
      salles: pcs.salles, degats: pev.degats.bilans,
      debrief, publication, videos,
      // Joindre une vidéo : le staff seulement (décision 3), sur une séance commencée et maintenue.
      joindre: staff && !(ligne?.annulee ?? false) && s.debut.getTime() <= maintenant.getTime(),
    });
  }
  if (s.evenement === "gs") {
    return vueGS({ s, ligne, pgs, staff, estMoi, maintenant, moiCache: !!a.user.cacheLe, debrief, publication, videos });
  }
  let parts: ParticipantsSeance = { source: "annonces", participants: [], autres: [], exclus: 0 };
  if (s.evenement === "cs") parts = await participantsSeance(prisma, s, await lireCompo(prisma), pcs, maintenant.getTime());

  const chiffres = pcs.degats.composition;
  const montrer = (p: Participant) => ({
    pseudo: p.pseudo, classe: p.classe, player: p.player, moi: estMoi(p),
    slotId: p.slotId, poste: p.poste, retenu: p.retenu, roles: p.roles, type: p.type, role: p.role,
    sansCompte: p.userId === null,
    chiffres: chiffres ? p.chiffres : [], enLigne: chiffres ? p.enLigne : "",
  });

  // Le constat de la clôture : tout pour le staff, sa propre ligne pour un membre (§4.8).
  const constat = ligne ? (await lignesVisibles(prisma, ligne.participants))
    .filter((l) => staff || estMoi(l))
    .map((l) => {
      const d = (l.details ?? {}) as Partial<DetailsParticipant>;
      return {
        pseudo: l.pseudo, classe: l.classe, player: l.player, present: l.present, poste: d.poste ?? null, role: d.role ?? null,
        enLigne: pcs.degats.bilans ? d.enLigne ?? "" : "", chiffres: pcs.degats.bilans ? d.chiffres ?? [] : [], moi: estMoi(l),
      };
    }) : [];

  /* LA RÉPARTITION ET LE RÉCAP (§4.3, §4.4, §4.6 ; lot 4) — des PSEUDOS, jamais un compte. Les
     totaux d'équipe suivent les chiffres DÉCLARÉS, et disparaissent avec eux quand le
     paramétrage masque les dégâts. « Mes positions » : celles des persos de l'appelant. */
  let repartition: VueRepartition | null = null;
  /** Le récap, plus ce que l'aperçu en dit : sa phrase d'ouverture (le rappel « recap » du
   *  paramétrage, variables remplies) et l'heure où il partira — null s'il ne part pas tout seul
   *  (rappel coupé, ou bascule pas encore faite). */
  let recapVue: (RecapNoms & { phrase: string; heure: string | null }) | null = null;
  let positions: Positions[] = [];
  /** Ses persos annoncés mais PAS retenus (le staff en a retenu d'autres) : l'onglet le lui dit,
   *  au lieu de l'inviter à s'annoncer — il l'est déjà. Ses propres persos seulement. */
  let nonRetenus: string[] = [];
  let places: number | null = null;
  if (s.evenement === "cs") {
    const joueurs = parts.participants.map((p) => ({ ...p, chiffres: chiffres ? p.chiffres : [] }));
    const brut = lireRepartition(ligne?.repartition);
    places = nbPlaces(postesEffectifs(pcs));
    // Lot 10 : les demandes d'échange qui regardent l'appelant (toutes celles qui attendent, pour
    // le staff), et les places que ses persos peuvent demander.
    // Par le COMPTE seulement, comme la route 5 qui fait le geste : un perso sans compte dont le
    // joueur porte mon nom ne m'ouvre pas ses demandes (Accepter y serait refusé, 403).
    const miens = parts.participants.filter((p) => p.userId === a.user.id).map((p) => cleJoueur(p.pseudo));
    repartition = vueRepartition(brut, { joueurs, salles: pcs.salles }, { miens, staff, now: maintenant.getTime() });
    const rc = recap(joueurs, brut, pcs, places);
    const rr = pcs.rappels.find((x) => x.type === "recap") ?? RAPPELS_CS_DEFAUT.find((x) => x.type === "recap")!;
    // Les mêmes variables que le bot (`variables`, bot/lib/seances.ts) : l'aperçu dit ce que le
    // récap dira, même si le staff y a glissé {manque} ou {lien}.
    const tous = [...parts.participants, ...parts.autres];
    const site = (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
    const phrase = remplirTexte(rr.texte, {
      date: dateLongue(s.date), heure: heureDite(partiesParis(s.debut).hhmm), places: String(places),
      annonces: String(tous.length), retenus: String(tous.filter((p) => p.retenu).length),
      manque: phraseManques(tous, postesEffectifs(pcs)) ?? "personne", lien: site ? `${site}/compositions?onglet=inscription` : "",
    });
    recapVue = { ...recapEnNoms(rc), phrase, heure: rr.actif && pcs.nouveauxMessages ? rr.heure : null };
    positions = parts.participants.filter(estMoi).map((p) => positionsDe(rc, p.pseudo)).filter((x): x is Positions => !!x);
    nonRetenus = parts.autres.filter(estMoi).map((p) => p.pseudo);
  }

  /* LES MESSAGES DISCORD, pour le staff (§7.2) : où en est le panneau, et la dernière demande de
     publication (« Republier ») avec son verdict ; depuis le lot 4, le récap et la répartition.
     Jamais pour un membre : les liens de message et les erreurs brutes de Discord ne le
     regardent pas. */
  let discord: null | {
    panneau: { lien: string; at: number; ferme: string | null } | null;
    recap: { lien: string; at: number; ferme: string | null } | null;
    repartition: { lien: string; at: number; ferme: string | null } | null;
    chrono: { lien: string; at: number; ferme: string | null } | null;
    bascule: boolean; rappels: boolean;
    /** Le rappel qui publiera le panneau tout seul (« la veille à 20:00 »), ou null : panneau
     *  coupé, ou aucun rappel de type panneau actif — la ligne ne promet alors rien. */
    auto: { quand: "veille" | "jour"; heure: string } | null;
    /** La dernière demande de publication du PANNEAU (« Republier »). */
    demande: { statut: string; resultat: string | null; at: number } | null;
    /** La dernière demande de chaque message (« panneau », « recap », « repartition »). */
    demandes: Record<string, { statut: string; resultat: string | null; at: number }>;
  } = null;
  if (staff && s.evenement === "cs") {
    const msgs = (ligne?.messages ?? {}) as Record<string, RefBrute | undefined>;
    const [cmds, inter] = await Promise.all([
      ligne ? prisma.botCommand.findMany({ where: { type: "seance_publier", payload: { path: ["seanceId"], equals: ligne.id } }, orderBy: { createdAt: "desc" }, take: 12 }) : [],
      prisma.setting.findUnique({ where: { key: "cs_rappels_actifs" } }),
    ]);
    // La plus récente de chaque message : une demande de récap ne doit pas passer pour celle du panneau.
    const demandes: Record<string, { statut: string; resultat: string | null; at: number }> = {};
    for (const c of cmds) {
      const quoi = String((c.payload as { quoi?: unknown } | null)?.quoi ?? "panneau");
      if (!demandes[quoi]) demandes[quoi] = { statut: c.status, resultat: c.result, at: c.createdAt.getTime() };
    }
    discord = {
      panneau: ref(msgs.panneau), recap: ref(msgs.recap), repartition: ref(msgs.phase1), chrono: ref(msgs.chrono),
      bascule: pcs.nouveauxMessages, rappels: inter?.value === "1",
      auto: (() => {
        const r = pcs.panneau ? pcs.rappels.find((x) => x.type === "panneau" && x.actif) : undefined;
        return r ? { quand: r.quand, heure: r.heure } : null;
      })(),
      demande: demandes.panneau ?? null, demandes,
    };
  }

  return NextResponse.json({
    cle: s.cle, evenement: s.evenement, date: s.date, creneau: s.creneau, label: s.label,
    debut: s.debut.getTime(), commencee: s.debut.getTime() <= maintenant.getTime(),
    existe: !!ligne,
    annulee: ligne?.annulee ?? false, motif: ligne?.motifAnnulation ?? null, annuleePar: staff ? ligne?.annuleePar ?? null : null,
    cloturee: !!ligne?.clotureAt, clotureAt: ligne?.clotureAt?.getTime() ?? null, cloturePar: staff ? ligne?.cloturePar ?? null : null,
    maintenant: maintenant.getTime(),
    source: parts.source,
    // Les dégâts déclarés s'affichent-ils (paramétrage) : sans eux, « sans mesure » ne veut rien dire.
    degats: chiffres,
    participants: parts.participants.map(montrer),
    // Les annoncés non retenus, que la clôture peut ajouter : le staff seulement.
    autres: staff ? parts.autres.map(montrer) : [],
    exclus: staff ? parts.exclus : 0,
    constat,
    // Le déroulé de la séance : figé au premier « Démarrer » du chrono, sinon le paramétrage.
    ...(() => { const d = derouleDe(ligne?.etapes, s.evenement === "cs" ? pcs : gs.data); return { etapes: d.etapes, phases: d.phases }; })(),
    places, repartition, recap: recapVue, positions, nonRetenus,
    // L'appelant est un membre CACHÉ : il n'est jamais parmi les joueurs (seances-serveur.ts), et
    // l'onglet le lui dit — comme le ⛔ du bot — au lieu de l'inviter à s'annoncer. Lui seul.
    moiCache: !!a.user.cacheLe,
    chrono: ligne?.chrono ? lireChrono(ligne.chrono) : null, debrief, analyse: debrief?.analyse ?? null, videos,
    publication,
    discord,
  });
}

/** Un message Discord rangé dans `SeanceGuilde.messages` (bot/lib/seances.ts), tel qu'on le lit. */
type RefBrute = { lien?: unknown; at?: unknown; ferme?: unknown };
const ref = (m: RefBrute | undefined) =>
  m && typeof m.lien === "string" ? { lien: m.lien, at: typeof m.at === "number" ? m.at : 0, ferme: typeof m.ferme === "string" ? m.ferme : null } : null;

/**
 * L'ONGLET CHRONO (§7.4) — la réponse allégée : la séance, son déroulé (figé au premier
 * « Démarrer », sinon le paramétrage), le chrono, l'heure du serveur (le navigateur en déduit
 * son décalage : une horloge de téléphone en avance ne fausse pas le temps qui défile), et si
 * le staff peut encore y toucher. Pour le staff : le message Discord du chrono et la dernière
 * demande de publication. Une seule lecture de la séance, sauf `liste`.
 */
async function vueChrono(s: SeanceParis, pcs: ParametresCS, staff: boolean, maintenant: Date, liste: boolean) {
  if (s.evenement !== "cs") return NextResponse.json({ error: "Le Guild Siege n'a pas de chrono." }, { status: 400 });
  const ligne = await prisma.seanceGuilde.findUnique({
    where: { cle: s.cle },
    select: { id: true, annulee: true, motifAnnulation: true, clotureAt: true, chrono: true, etapes: true, messages: true },
  });
  const d = derouleDe(ligne?.etapes, pcs);
  const chrono = lireChrono(ligne?.chrono);
  const annulee = ligne?.annulee ?? false, cloturee = !!ligne?.clotureAt;

  let discord: null | { chrono: ReturnType<typeof ref>; bascule: boolean; demande: { statut: string; resultat: string | null; at: number } | null } = null;
  if (staff) {
    const msgs = (ligne?.messages ?? {}) as Record<string, RefBrute | undefined>;
    const cmd = ligne ? await prisma.botCommand.findFirst({
      where: { type: "seance_publier", AND: [{ payload: { path: ["seanceId"], equals: ligne.id } }, { payload: { path: ["quoi"], equals: "chrono" } }] },
      orderBy: { createdAt: "desc" },
    }) : null;
    discord = { chrono: ref(msgs.chrono), bascule: pcs.nouveauxMessages, demande: cmd ? { statut: cmd.status, resultat: cmd.result, at: cmd.createdAt.getTime() } : null };
  }

  // Le sélecteur : les séances récentes qui ont un chrono, la plus récente d'abord.
  let seances: { cle: string; label: string; date: string; total: number; fini: boolean; arrete: boolean; enCours: boolean }[] | undefined;
  if (liste) {
    const rows = await prisma.seanceGuilde.findMany({
      where: { evenement: "cs", chrono: { not: Prisma.DbNull }, debut: { lte: new Date(maintenant.getTime() + 8 * 86_400_000) } },
      orderBy: { debut: "desc" }, take: 12,
      select: { cle: true, date: true, debut: true, chrono: true, etapes: true },
    });
    seances = rows.flatMap((x) => {
      const c = lireChrono(x.chrono);
      if (c.debut === null) return [];
      const n = derouleDe(x.etapes, pcs).etapes.length;
      const enCours = !c.fini && c.fins.length < n;
      return [{
        cle: x.cle, date: x.date, label: `${dateLongue(x.date)} · ${heureDite(partiesParis(x.debut).hhmm)}`,
        total: totalChrono(c), fini: !enCours, arrete: !enCours && c.fins.length < n, enCours,
      }];
    });
  }

  return NextResponse.json({
    cle: s.cle, date: s.date, label: s.label, debut: s.debut.getTime(), commencee: s.debut.getTime() <= maintenant.getTime(),
    annulee, motif: ligne?.motifAnnulation ?? null, cloturee,
    maintenant: maintenant.getTime(),
    etapes: d.etapes, phases: d.phases, figees: !!lireDeroule(ligne?.etapes),
    chrono,
    // Le staff peut-il encore y toucher ? La séance qui se joue seulement, ni annulée ni clôturée.
    refus: refusChronoSeance({ cle: s.cle, annulee, cloturee }, maintenant),
    discord,
    ...(seances ? { seances } : {}),
  });
}

/**
 * L'ONGLET GUILD SIEGE (§11.3 ; lot 9) — la séance du siège, ses annoncés et ce qu'on peut y
 * faire. La forme reprend celle d'une Chambre là où la clôture la lit (`participants`, `autres`,
 * `source`, `constat`, `degats`) : la même fenêtre « Ils étaient là » sert les deux.
 */
async function vueGS(o: {
  s: SeanceParis; ligne: (SeanceGuilde & { participants: SeanceParticipant[] }) | null;
  pgs: ParametresGS; staff: boolean; estMoi: (x: { userId: string | null; player: string }) => boolean; maintenant: Date; moiCache: boolean;
  debrief: unknown; publication: unknown; videos: unknown;
}) {
  const { s, ligne, pgs, staff, estMoi, maintenant } = o;
  const cloturee = !!ligne?.clotureAt;
  const joueurs = ligne ? await joueursGS(prisma, ligne.participants, { cloturee, maintenant: maintenant.getTime() }) : [];
  const chiffres = pgs.degats.composition;
  const participants = joueurs.map((j) => ({
    pseudo: j.pseudo, classe: j.classe, player: j.player, moi: estMoi(j), annonceAt: j.annonceAt,
    slotId: null, poste: null, retenu: false, sansCompte: j.userId === null, role: j.role,
    chiffres: chiffres ? j.chiffres : [], enLigne: chiffres ? j.enLigne : "",
  }));
  const constat = cloturee ? joueurs.filter((j) => staff || estMoi(j)).map((j) => ({ pseudo: j.pseudo, classe: j.classe, player: j.player, present: j.present, moi: estMoi(j) })) : [];
  const creneau = creneauDe(s, pgs.creneaux);
  const refus = refusInscriptionGS({ actif: pgs.actif, seance: s, creneaux: pgs.creneaux, now: maintenant, annulee: !!ligne?.annulee, cloturee });

  // Le panneau Discord, pour le staff : où il en est, et la dernière demande de publication. Pas
  // de bascule ici : le bot Python ne fait pas le Guild Siege ; c'est son interrupteur `actif`
  // et ses rappels (Setting `gs_rappels_actifs`) qui le gardent éteint.
  let discord: null | {
    panneau: { lien: string; at: number; ferme: string | null } | null; bascule: boolean; rappels: boolean;
    auto: { quand: "veille" | "jour"; heure: string } | null; demande: { statut: string; resultat: string | null; at: number } | null;
  } = null;
  if (staff) {
    const msgs = (ligne?.messages ?? {}) as Record<string, RefBrute | undefined>;
    const [cmd, inter] = await Promise.all([
      ligne ? prisma.botCommand.findFirst({ where: { type: "seance_publier", payload: { path: ["seanceId"], equals: ligne.id } }, orderBy: { createdAt: "desc" } }) : null,
      prisma.setting.findUnique({ where: { key: "gs_rappels_actifs" } }),
    ]);
    const r = pgs.rappels.find((x) => x.type === "panneau" && x.actif);
    const t = r ? instantRappel(r, s, creneau) : null;
    discord = {
      panneau: ref(msgs.panneau), bascule: pgs.actif, rappels: inter?.value === "1",
      auto: t ? { quand: partiesParis(t).date === s.date ? "jour" : "veille", heure: partiesParis(t).hhmm } : null,
      demande: cmd ? { statut: cmd.status, resultat: cmd.result, at: cmd.createdAt.getTime() } : null,
    };
  }

  return NextResponse.json({
    cle: s.cle, evenement: "gs", date: s.date, creneau: s.creneau, label: s.label,
    debut: s.debut.getTime(), commencee: s.debut.getTime() <= maintenant.getTime(), existe: !!ligne,
    annulee: ligne?.annulee ?? false, motif: ligne?.motifAnnulation ?? null, annuleePar: staff ? ligne?.annuleePar ?? null : null,
    cloturee, clotureAt: ligne?.clotureAt?.getTime() ?? null, cloturePar: staff ? ligne?.cloturePar ?? null : null,
    maintenant: maintenant.getTime(),
    source: "annonces", degats: chiffres,
    participants, autres: [], exclus: 0, constat,
    etapes: derouleDe(ligne?.etapes, pgs).etapes, phases: derouleDe(ligne?.etapes, pgs).phases,
    places: pgs.places, repartition: null, recap: null, positions: [], nonRetenus: [],
    moiCache: o.moiCache,
    // « Je viens » : ouvert, ou la raison qui le ferme (éteint, clôturé, annulé, commencé…).
    inscription: refus ? { ouverte: false, raison: refus.message } : { ouverte: true, raison: null },
    gs: { finInscription: creneau?.finInscription ?? null, regle: pgs.textes.panneau, actif: pgs.actif },
    chrono: null, debrief: o.debrief, videos: o.videos, publication: o.publication,
    discord,
  });
}
