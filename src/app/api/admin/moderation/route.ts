import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES, rankValue, canAccessAdmin } from "@/config/roles";

/**
 * AGIR SUR UN MEMBRE — retirer un rôle, le sortir de la guilde, l'exclure du
 * Discord, le bannir, ou lui ouvrir un coffre.
 *
 * Trois règles, et aucune n'est négociable :
 *
 *  1. RÉSERVÉ AU RANG VANGUARD (et à la Direction, qui est au-dessus). Ce sont
 *     des gestes qui coûtent un membre ; l'accès « staff » qui ouvre déjà la
 *     boutique et le coffre est trop large pour ça.
 *
 *  2. LE MOTIF EST OBLIGATOIRE. Pas un champ facultatif qu'on remplira « si on
 *     a le temps » : la requête est refusée sans lui. Il part avec le geste
 *     dans le journal d'audit de Discord, et il reste dans le dossier du
 *     membre. C'est ce qu'on relira quand quelqu'un demandera pourquoi.
 *
 *  3. ON NE TOUCHE PAS PLUS HAUT QUE SOI, ni soi-même. Discord refuserait de
 *     toute façon la moitié de ces cas ; les refuser ici donne une phrase
 *     compréhensible au lieu d'un « Missing Permissions ».
 *
 * Rien n'est exécuté ici : le site n'a pas de connexion Discord. On écrit la
 * décision, on dépose une commande, et le bot la joue au tick suivant (12 s)
 * puis réécrit le verdict dans la décision. Le seul geste appliqué sur place
 * est l'ouverture d'un coffre, qui ne concerne que nos propres données.
 */
const GESTES: Record<string, { libelle: string; parLeBot: boolean }> = {
  role: { libelle: "retirer un rôle", parLeBot: true },
  guilde: { libelle: "retirer de la guilde", parLeBot: true },
  kick: { libelle: "exclure du Discord", parLeBot: true },
  ban: { libelle: "bannir du Discord", parLeBot: true },
  coffre: { libelle: "donner l'accès à un coffre", parLeBot: false },
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
  if (rankValue(a.user.role) < rankValue("VANGUARD"))
    return NextResponse.json({ error: "Réservé au rang Vanguard." }, { status: 403 });

  const b = await req.json().catch(() => null);
  const geste = GESTES[String(b?.action ?? "")];
  if (!geste) return NextResponse.json({ error: "Geste inconnu." }, { status: 400 });

  const motif = String(b?.motif ?? "").trim();
  if (motif.length < 5)
    return NextResponse.json({ error: "Le motif est obligatoire — écris en une phrase ce qui a été décidé et pourquoi." }, { status: 400 });
  if (motif.length > 400)
    return NextResponse.json({ error: "Motif trop long (400 caractères)." }, { status: 400 });

  const cible = await prisma.user.findUnique({ where: { id: String(b?.userId ?? "") }, select: { id: true, discordId: true, username: true, role: true } });
  if (!cible) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  if (cible.id === a.user.id) return NextResponse.json({ error: "On ne s'applique pas ça à soi-même." }, { status: 400 });
  if (rankValue(cible.role) >= rankValue(a.user.role))
    return NextResponse.json({ error: `${cible.username} est de rang égal ou supérieur au tien — ça ne se règle pas depuis le site.` }, { status: 403 });

  let detail: string | null = null;

  /* ── Ouvrir un coffre : notre donnée, appliquée tout de suite ────────── */
  if (b.action === "coffre") {
    // Le coffre est une page du STAFF. Attribuer un coffre à quelqu'un qui ne
    // peut pas ouvrir /coffre ne lui donne rien : il n'y accédera jamais. Le
    // refuser ici évite une attribution muette dont personne ne verrait l'effet.
    if (!canAccessAdmin(cible.role))
      return NextResponse.json({ error: `Le coffre est réservé au staff. ${cible.username} est ${cible.role.toLowerCase()} — il n'y aurait pas accès de toute façon.` }, { status: 400 });
    const nom = String(b?.coffre ?? "").trim();
    if (!nom) return NextResponse.json({ error: "Indique le coffre à ouvrir." }, { status: 400 });
    const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
    const data = (row?.data ?? {}) as { owners?: Record<string, string>; members?: string[]; inv?: Record<string, unknown> };
    if (!Array.isArray(data.members) || !data.members.includes(nom))
      return NextResponse.json({ error: `Le coffre « ${nom} » n'existe pas dans l'AirGuild.` }, { status: 400 });
    const dejaA = Object.entries(data.owners ?? {}).find(([, did]) => did === cible.discordId)?.[0];
    if (dejaA && dejaA !== nom)
      return NextResponse.json({ error: `${cible.username} tient déjà le coffre « ${dejaA} » — un membre n'écrit que dans un seul coffre.` }, { status: 400 });
    data.owners = { ...(data.owners ?? {}), [nom]: cible.discordId };
    await prisma.airGuildState.upsert({ where: { id: "main" }, create: { id: "main", data: data as object }, update: { data: data as object } });
    detail = nom;
  }

  /* ── Retirer un rôle : on vérifie qu'il l'a, et qu'il est retirable ──── */
  if (b.action === "role") {
    const roleId = String(b?.roleId ?? "");
    const role = roleId ? await prisma.guildRole.findUnique({ where: { id: roleId } }) : null;
    if (!role) return NextResponse.json({ error: "Rôle inconnu. Le bot doit d'abord synchroniser les rôles du serveur." }, { status: 400 });
    if (role.managed) return NextResponse.json({ error: `« ${role.name} » est géré par une intégration : Discord interdit de le retirer.` }, { status: 400 });
    detail = role.name;
  }

  const decision = await prisma.actionMembre.create({
    data: {
      discordId: cible.discordId, pseudo: cible.username, action: String(b.action), detail, motif,
      auteur: a.user.username, auteurId: a.user.id,
      statut: geste.parLeBot ? "EN_ATTENTE" : "FAITE",
      resultat: geste.parLeBot ? null : `Coffre « ${detail} » ouvert à ${cible.username}.`,
      faiteAt: geste.parLeBot ? null : new Date(),
    },
  });

  if (geste.parLeBot) {
    await prisma.botCommand.create({
      data: {
        type: "moderation",
        payload: { action: b.action, discordId: cible.discordId, roleId: b.roleId ?? null, motif, auteur: a.user.username, actionId: decision.id },
        createdBy: a.user.username,
      },
    });
  }

  await prisma.auditLog.create({
    data: { actor: a.user.username, action: `moderation.${b.action}`, target: cible.discordId, detail: `${cible.username} — ${motif}` },
  }).catch(() => {});

  return NextResponse.json({
    id: decision.id,
    statut: decision.statut,
    message: geste.parLeBot
      ? `C'est enregistré : ${geste.libelle} pour ${cible.username}. Le bot l'applique sur Discord d'ici une quinzaine de secondes.`
      : `Coffre « ${detail} » ouvert à ${cible.username}.`,
  }, { status: 201 });
}
