import type { Client, User } from "discord.js";

/**
 * Message privé à un membre.
 *
 * Vivait dans `lib/debts.ts`, parti avec le système de dettes — alors que les
 * candidatures et les décisions de boutique s'en servent toujours. Une brique
 * d'un mot, mais qui n'a rien à faire dans un module métier.
 *
 * Ne jette jamais : un MP refusé (DM fermés) ne doit pas faire échouer la
 * décision qui vient d'être prise.
 */
export async function dm(client: Client, userId: string, payload: unknown): Promise<boolean> {
  try {
    const u: User = await client.users.fetch(userId);
    await u.send(payload as never);
    return true;
  } catch {
    return false;
  }
}
