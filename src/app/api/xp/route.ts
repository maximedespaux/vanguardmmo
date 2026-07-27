import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { classement, resumeXp } from "@/lib/xp";
import { resumeCredits, verserDotation } from "@/lib/credits";

/** Ma progression : niveau, XP, crédits d'entraide, et le classement de la guilde. */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  // On encaisse la semaine due en arrivant : le membre voit son solde à jour
  // sans avoir à faire quoi que ce soit.
  await verserDotation(a.user);
  const [moi, credits, top] = await Promise.all([resumeXp(a.user.id), resumeCredits(a.user.id), classement(10)]);
  return NextResponse.json({ moi, credits, classement: top });
}
