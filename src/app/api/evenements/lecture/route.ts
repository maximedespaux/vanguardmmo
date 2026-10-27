import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuild } from "@/lib/access";
import { postesEffectifs, type ParametresCS, type ParametresGS } from "@/lib/evenements";
import { lireParametres } from "@/lib/seances-serveur";

/**
 * CE QUE LES MEMBRES LISENT DU PARAMÉTRAGE — la page des Chambres en a besoin pour s'afficher
 * comme le staff l'a réglée : les postes (titre, classe, rôle, chiffre montré), le déroulé
 * (phases, étapes et leurs monstres) et l'affichage des dégâts.
 *
 * Gardée par `apiGuild`, comme la page. Rien de ce que l'écran des bras droits règle d'autre
 * ne part : ni salons, ni rappels, ni textes des messages, ni qui a modifié quoi.
 *
 * Le Guild Siege (lot 9) : s'il est actif (sinon l'onglet reste « En standby »), ses créneaux,
 * son plafond, sa règle (« C'est libre… ») et l'affichage des dégâts.
 */
export async function GET(req: Request) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  const ev = new URL(req.url).searchParams.get("evenement") ?? "cs";
  if (ev === "gs") {
    const { data } = await lireParametres(prisma, "gs");
    const d = data as ParametresGS;
    return NextResponse.json({
      evenement: "gs", actif: d.actif, creneaux: d.creneaux, etapes: d.etapes, phases: d.phases,
      places: d.places, regle: d.textes.panneau, degats: d.degats,
    });
  }
  if (ev !== "cs") return NextResponse.json({ error: "Événement inconnu : cs ou gs." }, { status: 400 });
  const { data, version } = await lireParametres(prisma, "cs");
  const d = data as ParametresCS;
  return NextResponse.json({
    evenement: "cs", version,
    etapes: d.etapes, phases: d.phases, noms: d.noms, degats: d.degats,
    // Le build conseillé voyage avec le poste : la page l'ouvre déjà dans sa bulle « œil ».
    postes: postesEffectifs(d),
  });
}
