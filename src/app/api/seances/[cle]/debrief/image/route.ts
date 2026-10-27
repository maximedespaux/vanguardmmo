import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { resoudreCle, type ParametresCS } from "@/lib/evenements";
import { lireParametres } from "@/lib/seances-serveur";
import { hoteDuSite, imageDeLaSeance } from "@/lib/seance-image";

/* sharp : le moteur Node, jamais l'edge. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * L'APERÇU DE L'IMAGE DU DÉBRIEF (spec §6, route 14 ; §4.11 ; lot 7) — l'image exacte que le bot
 * publiera dans le salon des débriefs, rendue par le même code (`imageDeLaSeance`), brouillon
 * compris : le staff la regarde avant de publier. Staff seulement : l'image d'un brouillon et les
 * chiffres déclarés de chacun ne regardent pas un membre avant la publication.
 *
 * Les chiffres : ceux que le salon des débriefs recevrait — le paramétrage (`degats.discord`), et
 * le salon fermé à @everyone d'après le dernier relevé du bot (`Setting("salons_publics")`). Le
 * bot, lui, relit les permissions au moment de publier. `X-Chiffres` dit lequel a été rendu.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const { cle } = await params;
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), new Date(), gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  // Le débrief du Guild Siege part en embed, sans image (§11.2, lot 9).
  if (s.evenement !== "cs") return NextResponse.json({ error: "Le débrief du Guild Siege part sans image : un embed seulement." }, { status: 400 });
  const ligne = await prisma.seanceGuilde.findUnique({ where: { cle: s.cle }, include: { participants: true } });
  if (!ligne) return NextResponse.json({ error: "Cette séance n'a encore rien de noté : il n'y a pas d'image à montrer." }, { status: 404 });

  const pcs = cs.data as ParametresCS;
  // Le salon des débriefs, résolu comme le bot (§8.8, `resoudreSalons`) : le paramétrage, puis la
  // variable, puis le salon des Chambres — et en dernier le salon par défaut du bot
  // (`SALON_CS_DEFAUT`, bot/config.ts). Sans ce défaut, l'aperçu montrait les chiffres quand rien
  // n'est réglé, alors que le bot les masque si ce salon est visible des visiteurs.
  const salon = pcs.salons.debriefs || process.env.CHANNEL_CS_DEBRIEF || pcs.salons.chambres || process.env.CHANNEL_CS || "1498696982229811352";
  const publics = await prisma.setting.findUnique({ where: { key: "salons_publics" } });
  let ouvert = false;
  try { const v = publics ? JSON.parse(publics.value) : null; ouvert = !!salon && Array.isArray(v) && v.map(String).includes(salon); } catch { /* illisible : inconnu */ }
  const chiffres = pcs.degats.discord && !ouvert;

  const { png } = await imageDeLaSeance(prisma, ligne, pcs, { chiffres, site: hoteDuSite(process.env.NEXTAUTH_URL) });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png", "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="debrief-${s.cle}.png"`,
      "X-Chiffres": !pcs.degats.discord ? "masques-parametrage" : ouvert ? "masques-salon-public" : "montres",
    },
  });
}
