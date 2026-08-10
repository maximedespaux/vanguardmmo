import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES, rankValue, canAccessAdmin, canAccessGuild } from "@/config/roles";
import { partager } from "@/lib/quetes";

/**
 * LE DOSSIER D'UN MEMBRE — tout ce qu'on sait de lui, sur une page.
 *
 * Le GuildViewer listait des personnages et des builds. C'est ce qu'on regarde
 * quand on prépare une soirée. Ce n'est pas ce qu'on regarde quand on se
 * demande s'il faut sortir quelqu'un de la guilde : là, il faut ses absences,
 * ce qu'il a fourni, depuis quand il ne s'est plus connecté, et ce qui a déjà
 * été décidé à son sujet. Ces réponses étaient éparpillées sur cinq pages, ou
 * nulle part.
 *
 * Tout est en LECTURE ici : c'est un dossier, pas un formulaire. Agir passe par
 * /api/admin/moderation, qui exige un motif.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiRole(ADMIN_ROLES);
  if ("error" in a) return a.error;
  const { id } = await params;

  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      characters: { include: { gearProfiles: true, specializations: true }, orderBy: [{ isMain: "desc" }, { createdAt: "asc" }] },
      absences: { orderBy: { startDate: "desc" }, take: 40 },
      _count: { select: { absences: true, snapshots: true, contributions: true } },
    },
  });
  if (!u) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const [roles, decisions, ventes, demandes, contributions, coffreRow] = await Promise.all([
    // Ses rôles Discord, PAR LEUR NOM. Sans ce cache le site n'a que des
    // identifiants bruts, et « retirer 1498321781721661571 » ne se propose pas.
    u.discordRoles.length
      ? prisma.guildRole.findMany({ where: { id: { in: u.discordRoles } }, orderBy: { position: "desc" } })
      : Promise.resolve([]),
    prisma.actionMembre.findMany({ where: { discordId: u.discordId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.offreVente.findMany({
      where: { userId: u.id, statut: "retenue" },
      select: { id: true, prix: true, prixAp: true, createdAt: true, request: { select: { item: true, quantity: true, status: true, username: true } } },
      orderBy: { createdAt: "desc" }, take: 30,
    }),
    prisma.bankRequest.findMany({
      where: { userId: u.id },
      select: { id: true, item: true, quantity: true, status: true, kind: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 30,
    }),
    prisma.queteContribution.findMany({
      where: { userId: u.id },
      select: { id: true, quantite: true, statut: true, createdAt: true, quete: { select: { id: true, titre: true, quantite: true, contributions: { select: { id: true, quantite: true, statut: true } } } } },
      orderBy: { createdAt: "desc" }, take: 30,
    }),
    prisma.airGuildState.findUnique({ where: { id: "main" } }),
  ]);

  /* Le coffre qui lui est attribué. L'AirGuild garde ça dans son blob, sous
     `owners` : nom du coffre → identifiant Discord. On le lit à l'envers. */
  const blob = (coffreRow?.data ?? {}) as { owners?: Record<string, string>; inv?: Record<string, Record<string, number>>; members?: string[] };
  const monCoffre = Object.entries(blob.owners ?? {}).find(([, did]) => did === u.discordId)?.[0] ?? null;
  const objetsAuCoffre = monCoffre ? Object.values(blob.inv?.[monCoffre] ?? {}).reduce((s, n) => s + (Number(n) || 0), 0) : 0;
  // Les coffres existants, avec qui les tient : on ne propose d'en ouvrir un
  // que parmi ceux qui existent, et on montre lesquels sont déjà pris.
  const coffres = (blob.members ?? []).map((nom) => ({ nom, tenuPar: (blob.owners ?? {})[nom] ?? null }));

  /* Ce que la guilde lui doit sur les commandes farmées à plusieurs — même
     calcul que « Mes ventes », pour que les deux pages ne se contredisent pas. */
  const idsQuetes = [...new Set(contributions.map((c) => c.quete?.id).filter(Boolean) as string[])];
  const tarifs = idsQuetes.length
    ? await prisma.bankRequest.findMany({ where: { queteId: { in: idsQuetes } }, select: { queteId: true, priceEach: true, prixFinal: true, quantity: true } })
    : [];
  const cagnotteDe = (queteId: string) => {
    const d = tarifs.find((t) => t.queteId === queteId);
    if (!d) return 0;
    if (d.prixFinal != null) return Number(d.prixFinal);
    return d.priceEach ? d.priceEach * Math.max(1, d.quantity || 1) : 0;
  };
  let partsAcquises = 0;
  for (const qid of idsQuetes) {
    const q = contributions.find((c) => c.quete?.id === qid)?.quete;
    const cagnotte = cagnotteDe(qid);
    if (!q || !cagnotte) continue;
    const confirmes = q.contributions.filter((c) => c.statut === "confirme");
    const repartition = partager(cagnotte, confirmes.map((c) => ({ id: c.id, quantite: c.quantite })));
    for (const c of contributions.filter((x) => x.quete?.id === qid && x.statut === "confirme")) partsAcquises += repartition[c.id] ?? 0;
  }

  const jours = (d: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null);
  const now = new Date();

  return NextResponse.json({
    identite: {
      id: u.id, discordId: u.discordId, username: u.username, avatar: u.avatar,
      role: u.role, isActive: u.isActive,
      pseudoJeu: u.characters.find((c) => c.isMain)?.name ?? u.characters[0]?.name ?? null,
      verifiedAt: u.verifiedAt?.toISOString() ?? null,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      inactifDepuis: jours(u.lastSeenAt),
      inscritDepuis: jours(u.createdAt),
      createdAt: u.createdAt.toISOString(),
    },
    // On dit ce que le demandeur a le droit de faire : masquer les gestes
    // interdits vaut mieux que les afficher pour les refuser au clic.
    peutModerer: rankValue(a.user.role) >= rankValue("VANGUARD") && a.user.id !== u.id && rankValue(a.user.role) > rankValue(u.role),
    rolesDiscord: roles.map((r) => ({ id: r.id, name: r.name, color: r.color, managed: r.managed, position: r.position })),
    personnages: u.characters.map((c) => ({
      id: c.id, name: c.name, class: c.class, level: c.level, prestige: c.prestige, isMain: c.isMain, sex: c.sex,
      stuffs: c.gearProfiles.map((g) => ({ id: g.id, name: g.name, mode: g.mode, weaponRarity: g.weaponRarity, hp: g.hp, attack: g.attack, defense: g.defense })),
      specialisations: c.specializations.map((s) => ({ type: s.type, score: s.score })),
    })),
    absences: u.absences.map((x) => ({
      id: x.id, debut: x.startDate.toISOString(), fin: x.endDate.toISOString(), motif: x.reason,
      statut: x.status, enCours: x.startDate <= now && x.endDate >= now,
      jours: Math.max(1, Math.round((x.endDate.getTime() - x.startDate.getTime()) / 86_400_000) + 1),
    })),
    economie: {
      ventes: ventes.map((v) => ({ id: v.id, item: v.request?.item ?? "objet", quantite: v.request?.quantity ?? 1, pour: v.request?.username ?? "", perins: Number(v.prix ?? 0), airpoints: Number(v.prixAp ?? 0), remis: v.request?.status === "REMIS", date: v.createdAt.toISOString() })),
      demandes: demandes.map((d) => ({ id: d.id, item: d.item, quantite: d.quantity, statut: d.status, genre: d.kind, date: d.createdAt.toISOString() })),
      contributions: contributions.map((c) => ({ id: c.id, quete: c.quete?.titre ?? "", quantite: c.quantite, statut: c.statut, date: c.createdAt.toISOString() })),
      partsAcquises,
    },
    // `peutOuvrir` : le coffre est une page du staff. Sur un membre qui n'y a
    // pas accès, le geste s'affiche grisé avec sa raison — plutôt que d'ouvrir
    // un coffre dont il ne verra jamais la porte.
    coffre: { nom: monCoffre, objets: objetsAuCoffre, tous: coffres, peutOuvrir: canAccessAdmin(u.role), deLaGuilde: canAccessGuild(u.role) },
    decisions: decisions.map((d) => ({
      id: d.id, action: d.action, detail: d.detail, motif: d.motif, auteur: d.auteur,
      statut: d.statut, resultat: d.resultat, date: d.createdAt.toISOString(),
    })),
    compteurs: { absences: u._count.absences, versions: u._count.snapshots, contributions: u._count.contributions },
  });
}
