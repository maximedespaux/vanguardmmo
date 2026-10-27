import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { NOTE_MAX, NOTE_MIN, TONS, droitsSur, estTon } from "@/lib/gestes";

/**
 * POST /api/admin/membre/[id]/notes — écrire une note interne au dossier d'un membre
 * (onglet « Notes », SPEC-INFORMATION-GUILDE §4). Corps : { ton, texte }.
 *
 * Les quatre rangs bras droits (`apiRole(ADMIN_ROLES)`), et seulement sur un rang
 * STRICTEMENT inférieur au sien (lib/gestes.ts) — la même règle que la lecture, dans
 * GET /api/admin/membre/[id]. Signée par le compte de la session, datée par la base : ni
 * l'auteur ni la date ne viennent du corps.
 *
 * Rien d'autre ne lit ces notes : ni Information Guilde, ni /api/admin/users, ni le bot.
 * Pas de modification ni de suppression — c'est un journal ; une erreur se corrige d'une
 * note de plus.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiRole(ADMIN_ROLES);
  if ("error" in a) return a.error;
  const { id } = await params;

  const cible = await prisma.user.findUnique({ where: { id }, select: { id: true, discordId: true, username: true, role: true, cacheLe: true } });
  if (!cible) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  if (!droitsSur(a.user, cible).notes)
    return NextResponse.json({ error: "Les notes ne s'écrivent que sur un rang strictement inférieur au tien." }, { status: 403 });

  const b = await req.json().catch(() => null);
  const ton = b?.ton;
  if (!estTon(ton)) return NextResponse.json({ error: `Choisis un ton : ${TONS.map((t) => t.libelle.toLowerCase()).join(", ")}.` }, { status: 400 });
  const texte = String(b?.texte ?? "").trim();
  if (texte.length < NOTE_MIN) return NextResponse.json({ error: "La note est vide." }, { status: 400 });
  if (texte.length > NOTE_MAX) return NextResponse.json({ error: `Note trop longue (${NOTE_MAX} caractères).` }, { status: 400 });

  const n = await prisma.noteMembre.create({
    data: { discordId: cible.discordId, pseudo: cible.username, ton, texte, auteur: a.user.username, auteurId: a.user.id },
  });
  return NextResponse.json({ id: n.id, ton: n.ton, texte: n.texte, auteur: n.auteur, date: n.createdAt.toISOString() }, { status: 201 });
}
