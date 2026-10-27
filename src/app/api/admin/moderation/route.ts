import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES, DISCORD_ROLE_IDS } from "@/config/roles";
import { GESTES, RANG_LIBELLE, droitsSur, type Geste } from "@/lib/gestes";

/**
 * AGIR SUR UN MEMBRE — depuis son dossier (le tableau de bord des bras droits).
 *
 * Huit gestes. Les quatre d'avant : retirer un rôle, retirer de la guilde, exclure du
 * Discord, bannir. (Le cinquième, ouvrir un coffre de l'AirGuild, est parti avec le coffre
 * le 2026-10-21 ; ses décisions passées restent au dossier.) Et quatre venus le même jour
 * (SPEC-INFORMATION-GUILDE §4) : promouvoir, rétrograder, cacher, montrer de nouveau.
 *
 * Trois règles, et aucune n'est négociable :
 *
 *  1. QUI PEUT QUOI se décide dans lib/gestes.ts, et nulle part ailleurs : promouvoir,
 *     rétrograder, cacher et retirer de la guilde sont ouverts aux QUATRE rangs bras
 *     droits (réponse de Maxime du 2026-10-21) ; retirer un rôle, exclure et bannir
 *     restent au rang Vanguard et au-dessus. Toujours sur un rang STRICTEMENT inférieur
 *     au sien, et on ne promeut pas au-delà du rang juste sous le sien. Le dossier montre
 *     ces mêmes réponses ; la route les refait, parce qu'un bouton n'est pas une garde.
 *
 *  2. LE MOTIF EST OBLIGATOIRE. Pas un champ facultatif qu'on remplira « si on a le
 *     temps » : la requête est refusée sans lui. Il part avec le geste dans le journal
 *     d'audit de Discord, et il reste dans le dossier du membre.
 *
 *  3. LE RANG SE CHANGE SUR DISCORD, pas en base. Le rang du site vient des rôles Discord,
 *     et le bot le recalcule toutes les 10 minutes (`syncMemberRanks`) : un rang écrit ici
 *     seul serait défait au tour suivant. Promouvoir et rétrograder passent donc par la
 *     file `BotCommand` de modération, posée ICI, côté serveur — jamais par le formulaire
 *     générique /api/admin/bot-command, qui n'accepte d'ailleurs pas ce type.
 *
 * Seuls « cacher » et « montrer » se font sur-le-champ : ils ne touchent pas à Discord, ce
 * n'est qu'une colonne (`User.cacheLe`). Ils laissent la même trace que les autres.
 *
 * Le reste n'est pas exécuté ici : le site n'a pas de connexion Discord. On écrit la
 * décision, on dépose une commande, et le bot la joue au tick suivant (12 s) puis réécrit
 * le verdict dans la décision.
 */
/** Ce que la réponse annonce, en français : « sortie de la guilde pour Lina ». */
const ANNONCE: Record<Exclude<Geste, "cacher" | "montrer">, (qui: string, detail: string | null) => string> = {
  role: (qui, d) => `retrait du rôle « ${d} » pour ${qui}`,
  guilde: (qui) => `sortie de la guilde pour ${qui}`,
  kick: (qui) => `exclusion de ${qui} du Discord`,
  ban: (qui) => `bannissement de ${qui}`,
  promouvoir: (qui, d) => `promotion de ${qui} (${d})`,
  retrograder: (qui, d) => `rétrogradation de ${qui} (${d})`,
};

/** Les gestes qui changent le rang d'un membre sur Discord (rangs posés ou retirés, ou
 *  le membre sorti du serveur) — un seul à la fois par personne. */
const GESTES_DE_RANG = ["promouvoir", "retrograder", "guilde", "kick", "ban"] as const;
const ACTION_EN_VOL: Record<string, string> = {
  promouvoir: "Une promotion", retrograder: "Une rétrogradation", guilde: "Une sortie de la guilde", kick: "Une exclusion", ban: "Un bannissement",
};

export async function GET(req: Request) {
  const a = await apiRole(ADMIN_ROLES);
  if ("error" in a) return a.error;
  const discordId = new URL(req.url).searchParams.get("discordId");
  const decisions = await prisma.actionMembre.findMany({
    where: discordId ? { discordId } : undefined,
    orderBy: { createdAt: "desc" }, take: discordId ? 30 : 60,
  });
  return NextResponse.json(decisions.map((d) => ({
    id: d.id, discordId: d.discordId, pseudo: d.pseudo, action: d.action, detail: d.detail,
    motif: d.motif, auteur: d.auteur, statut: d.statut, resultat: d.resultat, date: d.createdAt.toISOString(),
  })));
}

export async function POST(req: Request) {
  const a = await apiRole(ADMIN_ROLES);
  if ("error" in a) return a.error;

  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "") as Geste;
  if (!GESTES.includes(action)) return NextResponse.json({ error: "Geste inconnu." }, { status: 400 });

  const motif = String(b?.motif ?? "").trim();
  if (motif.length < 5)
    return NextResponse.json({ error: "Le motif est obligatoire — écris en une phrase ce qui a été décidé et pourquoi." }, { status: 400 });
  if (motif.length > 400)
    return NextResponse.json({ error: "Motif trop long (400 caractères)." }, { status: 400 });

  const cible = await prisma.user.findUnique({
    where: { id: String(b?.userId ?? "") },
    select: { id: true, discordId: true, username: true, role: true, cacheLe: true },
  });
  if (!cible) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const droits = droitsSur(a.user, cible);
  const refus = droits.gestes[action];
  if (refus) return NextResponse.json({ error: cible.id === a.user.id ? refus : `${cible.username} : ${refus}` }, { status: 403 });

  let detail: string | null = null;
  let rang: Role | null = null;

  /* ── Retirer un rôle : on vérifie qu'il l'a, et qu'il est retirable ──── */
  if (action === "role") {
    const roleId = String(b?.roleId ?? "");
    const role = roleId ? await prisma.guildRole.findUnique({ where: { id: roleId } }) : null;
    if (!role) return NextResponse.json({ error: "Rôle inconnu. Le bot doit d'abord synchroniser les rôles du serveur." }, { status: 400 });
    if (role.managed) return NextResponse.json({ error: `« ${role.name} » est géré par une intégration : Discord interdit de le retirer.` }, { status: 400 });
    detail = role.name;
  }

  /* ── Promouvoir, rétrograder : un rang de la liste du dossier, et un rôle Discord
        pour le porter ──────────────────────────────────────────────────────────── */
  if (action === "promouvoir" || action === "retrograder") {
    rang = String(b?.rang ?? "") as Role;
    const permis = action === "promouvoir" ? droits.promotions : droits.retrogradations;
    if (!permis.includes(rang))
      return NextResponse.json({ error: `Ce rang n'est pas dans tes choix pour ${cible.username}.` }, { status: 400 });
    /* Le bot pose le rôle Discord du rang (ROLE_<RANG>, le même .env que le site, qui
       en lit les rangs à la connexion). Sans lui, il ne saurait pas quoi poser : autant
       le dire ici qu'en verdict d'échec un quart de minute plus tard. */
    if (!DISCORD_ROLE_IDS[rang as Exclude<Role, "RECRUE">])
      return NextResponse.json({ error: `Le rôle Discord du rang ${RANG_LIBELLE[rang]} n'est pas renseigné (ROLE_${rang}) : le bot ne saurait pas quoi poser.` }, { status: 400 });
    detail = `${RANG_LIBELLE[cible.role]} → ${RANG_LIBELLE[rang]}`;
  }

  /* UN SEUL GESTE QUI TOUCHE AU RANG EN VOL par personne. Deux changements de rang, et le
     second partirait d'un rang qui n'est déjà plus le sien ; une sortie de la guilde en
     attente puis une promotion, et le bot la jouait dans l'ordre — rangs retirés, puis
     rang reposé : le membre « sorti » revenait dans la guilde sans que personne l'ait
     décidé. Le bot joue la file en 12 s ; on attend son verdict. */
  if (action === "promouvoir" || action === "retrograder" || action === "guilde") {
    const enVol = await prisma.actionMembre.findFirst({
      where: { discordId: cible.discordId, action: { in: [...GESTES_DE_RANG] }, statut: "EN_ATTENTE" },
      select: { action: true },
    });
    if (enVol)
      return NextResponse.json({ error: `${ACTION_EN_VOL[enVol.action] ?? "Un geste"} attend déjà le bot pour ${cible.username} : attends son verdict (une quinzaine de secondes).` }, { status: 409 });
  }

  /* ── Cacher, montrer : sur-le-champ, rien sur Discord ─────────────────────── */
  if (action === "cacher" || action === "montrer") {
    const cacher = action === "cacher";
    const resultat = cacher
      ? `${cible.username} n'apparaît plus dans Information Guilde ni dans le recensement. Rien n'a changé sur Discord.`
      : `${cible.username} apparaît de nouveau dans Information Guilde et le recensement.`;
    const [decision] = await prisma.$transaction([
      prisma.actionMembre.create({
        data: {
          discordId: cible.discordId, pseudo: cible.username, action, motif,
          auteur: a.user.username, auteurId: a.user.id, statut: "FAITE", resultat, faiteAt: new Date(),
        },
      }),
      prisma.user.update({ where: { id: cible.id }, data: { cacheLe: cacher ? new Date() : null } }),
    ]);
    await prisma.auditLog.create({
      data: { actor: a.user.username, action: `moderation.${action}`, target: cible.discordId, detail: `${cible.username} — ${motif}` },
    }).catch(() => {});
    return NextResponse.json({ id: decision.id, statut: decision.statut, message: `C'est fait : ${resultat}` }, { status: 201 });
  }

  const decision = await prisma.actionMembre.create({
    data: {
      discordId: cible.discordId, pseudo: cible.username, action, detail, motif,
      auteur: a.user.username, auteurId: a.user.id,
      statut: "EN_ATTENTE",
    },
  });

  /* La commande du bot : `rang` pour les deux sens (retirer l'ancien rôle de rang, poser
     le nouveau, bot/lib/moderation.ts) ; les autres gardent leur nom. */
  await prisma.botCommand.create({
    data: {
      type: "moderation",
      payload: {
        action: rang ? "rang" : action, discordId: cible.discordId, roleId: action === "role" ? String(b.roleId) : null,
        rang, motif, auteur: a.user.username, actionId: decision.id,
      },
      createdBy: a.user.username,
    },
  });

  await prisma.auditLog.create({
    data: { actor: a.user.username, action: `moderation.${action}`, target: cible.discordId, detail: `${cible.username}${detail ? ` (${detail})` : ""} — ${motif}` },
  }).catch(() => {});

  return NextResponse.json({
    id: decision.id,
    statut: decision.statut,
    message: `C'est enregistré : ${ANNONCE[action](cible.username, detail)}. Le bot l'applique sur Discord d'ici une quinzaine de secondes.`,
  }, { status: 201 });
}
