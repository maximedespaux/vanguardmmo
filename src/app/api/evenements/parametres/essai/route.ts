import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { audit } from "@/lib/audit";
import type { ParametresCS, ParametresGS } from "@/lib/evenements";
import { lireParametres } from "@/lib/seances-serveur";

/**
 * LE MESSAGE D'ESSAI (spec §6, route 3 ; §8.7 ; M12) — « Essai » sur /discord/evenements.
 *
 * Corps : { evenement: "cs" | "gs", message: <id d'un rappel> | "panneau" | "annulation" | "recap" | "repartition" | "chrono" | "debrief" | "echange" }.
 * « debrief » (lot 7) envoie M7 et son image, rendus avec le dernier débrief noté.
 * Le Guild Siege (lot 9) : ses rappels, « panneau » (le panneau vivant à boutons), « annulation »
 * et « debrief » (l'embed du débrief simplifié) s'essaient de même — même éteint : c'est
 * l'outil pour le régler avant de l'allumer.
 * « repartition » envoie les deux messages à boutons (Phase 1, Phase 2) : la bascule (§8.10)
 * demande un essai de CHAQUE message avant d'allumer `nouveauxMessages`.
 * « echange » (lot 10) : une demande d'échange de place d'exemple, telle que le joueur visé la
 * reçoit en message privé — dans le salon des essais, comme les autres.
 * Le bot rend le message avec le paramétrage ENREGISTRÉ et la prochaine séance, et l'envoie dans
 * le salon des essais, SANS AUCUNE MENTION, boutons inactifs. C'est l'outil qui permet de régler
 * un texte sans attendre mercredi 13 h 30 — et de vérifier chaque message avant la bascule depuis
 * le bot Python (§8.10).
 *
 * La commande `evenement_essai` est créée ICI, côté serveur : elle n'est pas dans la liste
 * ALLOWED de /api/admin/bot-command, et sa charge ne porte qu'un événement et un mot d'une liste
 * fermée — jamais un salon ni un texte (contre-examen n° 22).
 */
export async function POST(req: Request) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const b = await req.json().catch(() => null) as { evenement?: unknown; message?: unknown } | null;
  const evenement = b?.evenement === "gs" ? "gs" : b?.evenement === "cs" ? "cs" : null;
  if (!evenement) return NextResponse.json({ error: "Événement inconnu : cs ou gs." }, { status: 400 });
  const message = typeof b?.message === "string" ? b.message : "";

  const { data } = await lireParametres(prisma, evenement);
  const rappel = data.rappels.find((r) => r.id === message);
  // Le récap (lot 4) s'essaie aussi sans rappel : un staff qui a coupé le rappel de 20 h 40 peut
  // encore le publier à la main (/chambre recap), et doit pouvoir le regarder avant.
  // Le chrono (lot 5) aussi : son rappel de 20 h 55 est coupé par défaut, et `/chambre chrono`
  // le publie à la main.
  // Le débrief publié (lot 7) : il ne dépend d'aucun rappel, il part quand le staff publie.
  const permis = evenement === "cs" ? ["panneau", "annulation", "recap", "repartition", "chrono", "debrief", "echange"] : ["panneau", "annulation", "debrief"];
  if (!rappel && !permis.includes(message)) {
    return NextResponse.json({ error: "Ce message n'existe pas dans le paramétrage enregistré : enregistre d'abord, puis réessaie." }, { status: 400 });
  }
  if (message === "annulation" && !(data as ParametresCS | ParametresGS).annoncerAnnulation) {
    return NextResponse.json({ error: "L'annonce d'annulation est coupée (Interrupteurs) : il n'y a rien à essayer." }, { status: 400 });
  }

  const cmd = await prisma.botCommand.create({ data: { type: "evenement_essai", payload: { evenement, message }, createdBy: a.user.username } });
  await audit(a.user.username, "evenements.essai", evenement, message);
  return NextResponse.json({ commande: cmd.id }, { status: 202 });
}
