import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { audit } from "@/lib/audit";
import { resoudreCle, retirerMentions, type ParametresCS, type ParametresGS } from "@/lib/evenements";
import { lireParametres, majSeance } from "@/lib/seances-serveur";

/**
 * ANNULER UNE SÉANCE, OU LA RÉTABLIR (spec §6, route 10) — le jeu indisponible ce soir-là.
 *
 * Corps : { annulee: boolean, motif?: string (200 signes) }. La page des Chambres l'affiche ;
 * le bot la lit (lot 3) : plus aucun rappel pour une séance annulée, son panneau passe en
 * « · annulée » (et rouvre si on la rétablit), et le message M8 part si le paramétrage le
 * prévoit — mis en file ICI (`seance_annulation`, l'id de la séance seul), le bot relisant tout
 * en base avant d'envoyer quoi que ce soit.
 *
 * LE GUILD SIEGE (lot 9) : le même geste. Son annonce (M8, « Guild Siege annulé ») part si son
 * paramétrage la prévoit (`annoncerAnnulation`) et qu'il est actif — il n'a pas de bot Python à
 * remplacer, donc pas de bascule à attendre.
 */
export async function POST(req: Request, { params }: { params: Promise<{ cle: string }> }) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const { cle } = await params;
  const maintenant = new Date();
  const [cs, gs] = await Promise.all([lireParametres(prisma, "cs"), lireParametres(prisma, "gs")]);
  const r = resoudreCle(decodeURIComponent(cle), maintenant, gs.data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const s = r.seance;
  // Le Guild Siege est codé mais éteint (décision 2) : une séance qui n'existe pour personne ne
  // s'annule pas — elle laisserait une ligne vide dans ses bilans.
  if (s.evenement === "gs" && !gs.data.actif) return NextResponse.json({ error: "Le Guild Siege n'est pas actif : il n'a aucune séance à annuler." }, { status: 400 });

  const b = await req.json().catch(() => null) as { annulee?: unknown; motif?: unknown } | null;
  if (typeof b?.annulee !== "boolean") return NextResponse.json({ error: "Annuler ou rétablir : précise-le." }, { status: 400 });
  const motif = typeof b.motif === "string" ? retirerMentions(b.motif) : "";
  if (motif.length > 200) return NextResponse.json({ error: `Le motif fait ${motif.length} signes, 200 au plus.` }, { status: 400 });
  if (b.annulee && maintenant.getTime() - s.debut.getTime() > 6 * 3_600_000) {
    return NextResponse.json({ error: "Cette séance est passée : il n'y a plus rien à annuler." }, { status: 409 });
  }

  const res = await majSeance(prisma, s, (x) => {
    if (b.annulee && x.clotureAt) return { ok: false, status: 409, message: "Cette séance est clôturée : on n'annule pas une séance jouée." };
    if (x.annulee === b.annulee) return { ok: false, status: 409, message: b.annulee ? "Cette séance est déjà annulée." : "Cette séance n'est pas annulée." };
    return { ok: true, patch: { annulee: b.annulee as boolean, annuleePar: b.annulee ? a.user.username : null, motifAnnulation: b.annulee ? motif || null : null } };
  });
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: res.status });
  await audit(a.user.username, b.annulee ? "seance.annuler" : "seance.retablir", s.cle, motif || undefined);
  // M8 (« 🚫 Chambre Secrète de ce soir annulée ») : seulement si le paramétrage l'annonce, et
  // après la bascule — tant que le bot Python tourne, notre bot ne dit que ses deux rappels.
  const pcs = cs.data as ParametresCS, pgs = gs.data as ParametresGS;
  const annoncer = s.evenement === "cs" ? pcs.annoncerAnnulation && pcs.nouveauxMessages : pgs.annoncerAnnulation && pgs.actif;
  if (b.annulee && annoncer) {
    await prisma.botCommand.create({ data: { type: "seance_annulation", payload: { seanceId: res.seance.id, evenement: s.evenement }, createdBy: a.user.username } }).catch(() => null);
  }
  return NextResponse.json({ cle: s.cle, annulee: res.seance.annulee, motif: res.seance.motifAnnulation });
}
