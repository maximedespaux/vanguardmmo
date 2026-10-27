import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES, canAccessGuild } from "@/config/roles";
import { etatStuff, lireMesures, roleDuStuff } from "@/lib/mesures";
import { droitsSur } from "@/lib/gestes";

/**
 * LE DOSSIER D'UN MEMBRE — tout ce qu'on sait de lui, sur une page.
 *
 * Le GuildViewer listait des personnages et des builds. C'est ce qu'on regarde
 * quand on prépare une soirée. Ce n'est pas ce qu'on regarde quand on se
 * demande s'il faut sortir quelqu'un de la guilde : là, il faut ses absences,
 * depuis quand il ne s'est plus connecté, et ce qui a déjà été décidé à son
 * sujet. (Ses ventes, ses commandes et son coffre y figuraient aussi ; ils sont
 * partis avec la Boutique et l'AirGuild, le 2026-10-21 — et ce qu'il avait apporté
 * aux quêtes, avec Quête Guilde, le même jour. Leurs lignes restent en base.) Ces
 * réponses étaient éparpillées sur cinq pages, ou nulle part.
 *
 * Tout est en LECTURE ici : c'est un dossier, pas un formulaire. Agir passe par
 * /api/admin/moderation, qui exige un motif ; écrire une note, par ./notes.
 *
 * LES NOTES INTERNES (onglet « Notes », SPEC-INFORMATION-GUILDE §4) ne partent que si le
 * demandeur a le droit de les lire — la règle des gestes, un rang strictement inférieur
 * au sien (lib/gestes.ts) : sinon la liste n'est pas même lue en base. Un bras droit qui
 * ouvre son propre dossier, ou celui d'un égal, n'en reçoit donc aucune.
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
      _count: { select: { absences: true, snapshots: true } },
    },
  });
  if (!u) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const droits = droitsSur(a.user, u);
  const [roles, decisions, notes] = await Promise.all([
    // Ses rôles Discord, PAR LEUR NOM. Sans ce cache le site n'a que des
    // identifiants bruts, et « retirer 1498321781721661571 » ne se propose pas.
    u.discordRoles.length
      ? prisma.guildRole.findMany({ where: { id: { in: u.discordRoles } }, orderBy: { position: "desc" } })
      : Promise.resolve([]),
    prisma.actionMembre.findMany({ where: { discordId: u.discordId }, orderBy: { createdAt: "desc" }, take: 30 }),
    droits.notes
      ? prisma.noteMembre.findMany({ where: { discordId: u.discordId }, orderBy: { createdAt: "desc" }, take: 100 })
      : Promise.resolve(null),
  ]);

  const jours = (d: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null);
  const now = new Date();
  /* Une absence est un JOUR stocké à minuit UTC, bornes comprises — la règle de /staff
     (lib/recap.ts). Comparée à l'instant, elle n'était plus « en cours » dès 1 h du
     matin de son dernier jour, alors que la file la comptait encore. */
  const auj = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const jourDe = (d: Date) => d.toISOString().slice(0, 10);

  return NextResponse.json({
    identite: {
      id: u.id, discordId: u.discordId, username: u.username, avatar: u.avatar,
      role: u.role, isActive: u.isActive,
      // Caché par un bras droit (geste « Cacher ») : depuis quand. Null s'il est visible.
      cacheLe: u.cacheLe?.toISOString() ?? null,
      pseudoJeu: u.characters.find((c) => c.isMain)?.name ?? u.characters[0]?.name ?? null,
      verifiedAt: u.verifiedAt?.toISOString() ?? null,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      inactifDepuis: jours(u.lastSeenAt),
      inscritDepuis: jours(u.createdAt),
      createdAt: u.createdAt.toISOString(),
    },
    // On dit ce que le demandeur a le droit de faire, geste par geste, et POURQUOI pas :
    // le dossier grise le bouton avec la raison, la route refait le même calcul.
    droits,
    // Le geste « retirer de la guilde » se grise sur quelqu'un qui n'en est déjà pas.
    deLaGuilde: canAccessGuild(u.role),
    rolesDiscord: roles.map((r) => ({ id: r.id, name: r.name, color: r.color, managed: r.managed, position: r.position })),
    personnages: u.characters.map((c) => ({
      id: c.id, name: c.name, class: c.class, level: c.level, prestige: c.prestige, isMain: c.isMain, sex: c.sex,
      // Les mesures de l'AirBuilder, avec leur état : c'est ce que le staff compare
      // pour composer, et le dossier doit dire aussi ce qui MANQUE.
      stuffs: c.gearProfiles.map((g) => {
        const m = lireMesures(g.mesures);
        return {
          id: g.id, name: g.name, mode: g.mode, weaponRarity: g.weaponRarity, hp: g.hp, attack: g.attack, defense: g.defense,
          etat: etatStuff(g, now.getTime()), role: roleDuStuff(g.name, c.class, m), mesures: m,
        };
      }),
      specialisations: c.specializations.map((s) => ({ type: s.type, score: s.score })),
    })),
    absences: u.absences.map((x) => ({
      id: x.id, debut: x.startDate.toISOString(), fin: x.endDate.toISOString(), motif: x.reason,
      statut: x.status, enCours: jourDe(x.startDate) <= auj && jourDe(x.endDate) >= auj,
      jours: Math.max(1, Math.round((x.endDate.getTime() - x.startDate.getTime()) / 86_400_000) + 1),
    })),
    decisions: decisions.map((d) => ({
      id: d.id, action: d.action, detail: d.detail, motif: d.motif, auteur: d.auteur,
      statut: d.statut, resultat: d.resultat, date: d.createdAt.toISOString(),
    })),
    // `null` : pas le droit de les lire (et non « aucune note »).
    notes: notes?.map((n) => ({ id: n.id, ton: n.ton, texte: n.texte, auteur: n.auteur, date: n.createdAt.toISOString() })) ?? null,
    compteurs: { absences: u._count.absences, versions: u._count.snapshots },
  });
}
