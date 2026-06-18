// Importe les items du coffre. Lance: pnpm db:push puis pnpm db:seed
import { PrismaClient } from "@prisma/client";
import items from "./coffre-items.json";
const prisma = new PrismaClient();
const CAT: Record<string, string> = { "Stuff - Yggdrasil": "STUFF_YGGDRASIL", "Armes - Yggdrasil": "ARMES_YGGDRASIL", "Stuff - Éternel": "STUFF_ETERNEL", "Armes - Éternel": "ARMES_ETERNEL", "Bijoux": "BIJOUX", "R1": "EVEIL_R1", "R2": "EVEIL_R2", "Ressource": "RESSOURCE" };
async function main() {
  for (const i of items as any[]) {
    await prisma.coffreItem.create({ data: {
      categorie: (CAT[i.categorie] ?? "RESSOURCE") as any,
      classe: i.classe ?? null, item: i.item,
      stockTotal: Math.round(i.stockTotal || 0), target: 10,
      prixBoutique: BigInt(Math.round(i.prixBoutique || 0)), prixRemise: BigInt(Math.round(i.prixRemise || 0)),
    }});
  }
  console.log(`✅ ${(items as any[]).length} items importés`);
}
main().finally(() => prisma.$disconnect());
