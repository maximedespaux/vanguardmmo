import { prisma } from "@/lib/prisma";

// Journalise une action importante (best-effort, n'échoue jamais l'appelant).
export async function audit(actor: string, action: string, target?: string, detail?: string) {
  try {
    await prisma.auditLog.create({ data: { actor, action, target: target ?? null, detail: detail ?? null } });
  } catch (e) {
    console.error("audit failed", e);
  }
}
