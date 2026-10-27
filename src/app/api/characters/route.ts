import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

// GET /api/characters → uniquement MES personnages (+ stuffs + spés)
//
// L'ORDRE EST CELUI DE L'AIRBUILDER. La synchro (/api/characters/sync) recrée les persos
// puis leurs stuffs dans l'ordre du builder, le premier perso en principal : trier par
// date de création, l'identifiant en départage (deux créations dans la même
// milliseconde), rend donc le rang de chaque stuff dans le builder. C'est ce rang que
// visent les liens « Ouvrir dans l'AirBuilder » (lib/mesPersos, `lienBuilder`).
//
// IL N'Y A PLUS D'ÉCRITURE ICI. POST /api/characters, PATCH et DELETE
// /api/characters/[id] et /api/characters/[id]/gear ont été retirées le 2026-10-21 :
// l'AirBuilder est la seule source (demande de Maxime), et tout ce qu'elles écrivaient
// était effacé par la synchro suivante du builder. Créer, renommer, rendre principal et
// supprimer un perso se font dans l'AirBuilder.
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const characters = await prisma.character.findMany({
    where: { userId: a.user.id },
    include: { gearProfiles: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, specializations: true },
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(characters);
}
