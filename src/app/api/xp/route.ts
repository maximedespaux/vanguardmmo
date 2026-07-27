import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { classement, resumeXp } from "@/lib/xp";

/** Ma progression, et le classement de la guilde. */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const [moi, top] = await Promise.all([resumeXp(a.user.id), classement(10)]);
  return NextResponse.json({ moi, classement: top });
}
