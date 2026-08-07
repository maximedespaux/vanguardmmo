import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
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

  // Une par une plutôt qu'en groupBy : l'origine manque sur les demandes d'avant
  // la distinction, et c'est en JS qu'on retombe dessus (une spec = sur mesure,
  // un batchId = panier). Quelques dizaines de lignes par membre, pas plus.
  const [lignes, quetes, apports, xp] = await Promise.all([
    prisma.bankRequest.findMany({
      where: { userId: membre.id },
      select: { origine: true, status: true, spec: true, batchId: true, queteId: true },
      take: 500,
    }),
    prisma.quete.findMany({ where: { auteurId: membre.id }, select: { statut: true }, take: 500 }),
    prisma.queteContribution.aggregate({
      where: { userId: membre.id, statut: "confirme" },
      _count: true, _sum: { quantite: true },
    }),
    prisma.xpEvent.aggregate({ where: { userId: membre.id }, _sum: { points: true } }).catch(() => null),
  ]);

  const categorie = (r: { origine: string | null; spec: unknown; batchId: string | null }) =>
    r.origine === "achat" || r.origine === "requete" ? r.origine : r.spec ? "requete" : r.batchId ? "achat" : "requete";
  const EN_COURS = ["PENDING", "ACCEPTE_ACHAT", "ACCEPTE_DETTE", "EN_ECHANGE"];
  const compter = (quoi: "achat" | "requete") => {
    const l = lignes.filter((r) => categorie(r) === quoi);
    return {
      total: l.length,
      remis: l.filter((r) => r.status === "REMIS").length,
      enCours: l.filter((r) => EN_COURS.includes(r.status)).length,
      clos: l.filter((r) => r.status === "ANNULE" || r.status === "REFUSE").length,
      // Une requête que personne n'avait au coffre et qui est partie en quête :
      // c'est le moment où elle cesse d'être une commande.
      enQuete: l.filter((r) => !!r.queteId).length,
    };
  };

  // Les objets qu'il a fournis à quelqu'un : offres retenues sur une demande remise.
  const fournitures = await prisma.offreVente.count({
    where: { userId: membre.id, statut: "retenue", request: { status: "REMIS" } },
  }).catch(() => 0);

  /**
   * Le volet marchand, pour le staff seul.
   *
   * Ce qu'un membre a encaissé et ce qu'il doit ne regarde pas toute la guilde :
   * c'est ce qu'on consulte avant d'arbitrer un litige ou d'accorder un crédit,
   * pas de quoi alimenter les conversations.
   */
  const estStaff = canAccessAdmin(a.user.role);
  let staff: Record<string, number> | null = null;
  if (estStaff) {
    const [vendues, enCours, credits] = await Promise.all([
      prisma.offreVente.findMany({
        where: { userId: membre.id, statut: "retenue", request: { status: "REMIS" } },
        select: { prix: true, prixAp: true },
      }),
      prisma.offreVente.count({ where: { userId: membre.id, statut: "retenue", request: { status: { not: "REMIS" } } } }),
      // Ses achats réglés à crédit : l'ardoise, telle que les offres la disent.
      prisma.offreVente.count({ where: { request: { userId: membre.id }, statut: "retenue", reglement: "dette" } }),
    ]);
    staff = {
      ventes: vendues.length,
      perinsEncaisses: vendues.reduce((t, o) => t + Number(o.prix ?? 0), 0),
      airpointsEncaisses: vendues.reduce((t, o) => t + Number(o.prixAp ?? 0), 0),
      ventesEnCours: enCours,
      achatsACredit: credits,
    };
  }

  const total = Number(xp?._sum.points ?? 0);
  return NextResponse.json({
    staff,
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
      achats: compter("achat"),
      requetes: compter("requete"),
      quetesOuvertes: quetes.length,
      quetesLivrees: quetes.filter((q) => q.statut === "livree").length,
      apports: apports._count ?? 0,
      quantiteApportee: Number(apports._sum.quantite ?? 0),
      fournitures,
    },
  });
}
