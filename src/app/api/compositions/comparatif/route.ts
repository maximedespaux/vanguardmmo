import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { normaliserCompo } from "@/lib/compositions";
import { CS_SLOTS } from "@/app/(guild)/compositions/slots";
import { comparer, completude, stuffsParMode, statsDuStuff, equipementDuStuff, aDesStats, modeDuStuff, progression, type Stats } from "@/lib/comparatif";

// Écart entre le build de référence d'un poste et le build de chaque inscrit.
//
// Le calcul est fait ICI et pas dans la page : la page Compositions ne doit lire
// qu'un entier par inscription. Elle sert déjà 12 postes, leurs inscrits, les
// présences et les instructions — lui faire charger en plus deux blobs de build
// par inscrit l'alourdirait pour rien.
//
// La comparaison se fait mode par mode (DPS / TANK / HYBRIDE) : un poste de
// Primat tank croix attend un stuff Tank, et noter son stuff DPS contre une
// référence Tank donnerait un mauvais score qui ne veut rien dire.

const SPEC = "CHAMBRES_SECRETES" as const; // cette page ne couvre que les Chambres

export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const [etatRow, refs] = await Promise.all([
    prisma.compositionState.findUnique({ where: { id: "main" } }),
    prisma.compositionRefBuild.findMany(),
  ]);
  const etat = normaliserCompo(etatRow?.data);
  const signups = Array.isArray(etat.signups) ? etat.signups : [];

  // Les personnages réellement inscrits, avec leurs stuffs. Un seul aller-retour,
  // et on ne remonte que les inscrits : pas tous les builds de la guilde.
  const charIds = [...new Set(signups.map((s) => (s as { charId?: string }).charId).filter((x): x is string => !!x))];
  const persos = charIds.length
    ? await prisma.character.findMany({ where: { id: { in: charIds } }, include: { gearProfiles: true } })
    : [];
  const parChar = new Map(persos.map((c) => [c.id, c]));

  const refParSlot = new Map(refs.map((r) => [r.id, r.blob as unknown]));

  /** Référence d'un poste : ses stuffs par mode, ou null si elle n'existe pas encore. */
  const modesDeReference = (slotId: string) => {
    const blob = refParSlot.get(slotId);
    if (!blob) return null;
    const parMode = stuffsParMode(blob as Parameters<typeof stuffsParMode>[0]);
    // Un stuff de référence sans statistiques n'est pas comparable : le moteur ne
    // les calcule qu'à l'ouverture du builder. On le signale au lieu de noter 0.
    const utiles = Object.entries(parMode).filter(([, s]) => aDesStats(s));
    return utiles.length ? Object.fromEntries(utiles) : null;
  };

  const resultats: Record<string, unknown> = {};
  const etatDesReferences: Record<string, { dispo: boolean; sansStats: boolean; modes: string[] }> = {};

  for (const slot of CS_SLOTS) {
    const blob = refParSlot.get(slot.id);
    const modes = modesDeReference(slot.id);
    etatDesReferences[slot.id] = {
      dispo: !!modes,
      sansStats: !!blob && !modes, // la référence existe mais n'a jamais été calculée
      modes: modes ? Object.keys(modes) : [],
    };
    if (!modes) continue;

    for (const su of signups) {
      const s = su as { id?: string; slotId?: string; charId?: string };
      if (s.slotId !== slot.id || !s.charId || !s.id) continue;
      const perso = parChar.get(s.charId);
      if (!perso) continue;

      // Un score par mode attendu par la référence, puis la moyenne : un poste qui
      // demande DPS *et* Tank n'est pas tenu par un personnage bon dans un seul.
      const parMode: Record<string, { score: number; couverture: number; completude: number; manques: string[] }> = {};
      for (const [mode, refStuff] of Object.entries(modes)) {
        const gp = perso.gearProfiles.find((g) => modeDuStuff(g.name) === mode) ?? perso.gearProfiles.find((g) => g.mode === mode);
        const stats = (gp?.stats ?? {}) as Stats;
        const c = comparer(statsDuStuff(refStuff), stats, SPEC);
        const eq = { ...(gp?.weapon as object ?? {}), ...(gp?.armor as object ?? {}), ...(gp?.jewelry as object ?? {}), ...(gp?.cards as object ?? {}) };
        const comp = completude(eq as Record<string, unknown>);
        parMode[mode] = {
          score: c.score,
          couverture: c.couverture,
          completude: comp.pct,
          manques: progression(c).map((x) => x.cle),
        };
      }
      const scores = Object.values(parMode).map((x) => x.score);
      resultats[s.id] = {
        charId: s.charId,
        slotId: slot.id,
        score: scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0,
        parMode,
        // Un personnage sans aucun stuff enregistré n'est pas « mauvais », il est absent
        // du builder : à distinguer d'un build réellement en retard.
        sansBuild: perso.gearProfiles.length === 0,
      };
    }
  }

  return NextResponse.json({ spec: SPEC, references: etatDesReferences, scores: resultats });
}
