import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { niveau as niveauDepuisXp } from "@/lib/xp";

/**
 * La fiche d'un membre, telle qu'on la lit avant de traiter avec lui.
 *
 * Un pseudo ne dit rien : est-ce une recrue arrivée hier ou un vétéran qui a
 * livré trente quêtes ? On acceptait ou on refusait une demande sans le savoir,
 * et il fallait fouiller trois pages pour se faire une idée. Tout ce qui aide à
 * décider est ici, et rien d'autre — pas de contact, pas d'adresse, rien qui ne
 * regarde que l'intéressé.
 *
 * Lecture réservée à la guilde : c'est l'annuaire interne, pas une page
 * publique.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ nom: string }> }) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const nom = decodeURIComponent((await ctx.params).nom ?? "").trim();
  if (!nom) return NextResponse.json({ error: "Membre inconnu." }, { status: 400 });

  // Le pseudo s'écrit comme on veut selon les écrans : on cherche sans la casse.
  const membre = await prisma.user.findFirst({
    where: { username: { equals: nom, mode: "insensitive" } },
    select: {
      id: true, username: true, avatar: true, discordId: true, role: true,
      createdAt: true, verifiedAt: true, lastSeenAt: true, isActive: true,
      characters: {
        orderBy: [{ isMain: "desc" }, { level: "desc" }],
        select: { id: true, name: true, class: true, level: true, prestige: true, isMain: true },
      },
    },
  });
  if (!membre) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const [demandes, remises, abandons, quetes, apports, xp] = await Promise.all([
    prisma.bankRequest.count({ where: { userId: membre.id } }),
    prisma.bankRequest.count({ where: { userId: membre.id, status: "REMIS" } }),
    prisma.bankRequest.count({ where: { userId: membre.id, status: { in: ["ANNULE", "REFUSE"] } } }),
    prisma.quete.count({ where: { auteurId: membre.id } }),
    // Ce qu'il a APPORTÉ aux autres : la seule ligne qui dit s'il rend ce qu'on
    // lui donne. Les promesses non tenues ne comptent pas — d'où « confirme ».
    prisma.queteContribution.aggregate({
      where: { userId: membre.id, statut: "confirme" },
      _count: true, _sum: { quantite: true },
    }),
    prisma.xpEvent.aggregate({ where: { userId: membre.id }, _sum: { points: true } }).catch(() => null),
  ]);

  // Les objets qu'il a fournis à quelqu'un : offres retenues sur une demande remise.
  const fournitures = await prisma.offreVente.count({
    where: { userId: membre.id, statut: "retenue", request: { status: "REMIS" } },
  }).catch(() => 0);

  const total = Number(xp?._sum.points ?? 0);
  return NextResponse.json({
    nom: membre.username,
    avatar: membre.avatar ? `https://cdn.discordapp.com/avatars/${membre.discordId}/${membre.avatar}.png?size=128` : null,
    role: membre.role,
    actif: membre.isActive,
    // « Depuis quand il est là » : la première connexion constatée, à défaut la
    // création du compte sur le site.
    rejointLe: (membre.verifiedAt ?? membre.createdAt).toISOString(),
    vuLe: membre.lastSeenAt ? membre.lastSeenAt.toISOString() : null,
    niveau: niveauDepuisXp(total).niveau,
    xp: total,
    personnages: membre.characters.map((c) => ({
      nom: c.name, classe: c.class, niveau: c.level, prestige: c.prestige, principal: c.isMain,
    })),
    bilan: {
      demandes, remises, abandons,
      quetes,
      apports: apports._count ?? 0,
      quantiteApportee: Number(apports._sum.quantite ?? 0),
      fournitures,
    },
  });
}
