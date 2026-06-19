import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

// Le builder envoie les classes en clair ("Arcaniste") → on normalise vers l'enum.
const CLASSES = ["TEMPLIER", "SPADASSIN", "ARCANISTE", "ENVOUTEUR", "ARBALETRIER", "SYLPHIDE", "PRIMAT", "CHANOINE"];
function normCls(c: string) {
  const u = (c || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return CLASSES.includes(u) ? u : "ARCANISTE";
}
function mode(n: string) {
  const u = (n || "").toUpperCase();
  return u.includes("TANK") ? "TANK" : u.includes("HYBRID") ? "HYBRIDE" : "DPS";
}
function pick(eq: any, slots: string[]) {
  if (!eq) return undefined;
  const o: Record<string, any> = {};
  for (const s of slots) if (eq[s]) o[s] = eq[s];
  return Object.keys(o).length ? o : undefined;
}

// POST /api/characters/sync — remplace TOUS mes persos par ceux du builder (écrase).
export async function POST(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  const chars = Array.isArray(body?.chars) ? body.chars : null;
  if (!chars) return NextResponse.json({ error: "chars requis" }, { status: 400 });
  if (chars.length > 30) return NextResponse.json({ error: "trop de persos" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // écrasement total : on repart des persos du builder (source de vérité côté joueur)
    await tx.character.deleteMany({ where: { userId: a.user.id } });
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i] || {};
      const created = await tx.character.create({
        data: {
          userId: a.user.id,
          name: String(c.name || `Perso ${i + 1}`).slice(0, 40),
          class: normCls(c.cls) as any,
          level: Number(c.lvl) || 200,
          prestige: Number(c.prestige) || 1,
          isMain: i === 0,
        },
      });
      const stuffs = Array.isArray(c.stuffs) ? c.stuffs.slice(0, 12) : [];
      for (const s of stuffs) {
        const st = (s && s.stats) || {};
        const n = (k: string) => Math.round(Number(st[k]) || 0);
        await tx.gearProfile.create({
          data: {
            characterId: created.id,
            name: String((s && s.name) || "Stuff").slice(0, 40),
            mode: mode(s && s.name) as any,
            weapon: pick(s && s.equipped, ["weapon", "weapon2"]) as any,
            armor: pick(s && s.equipped, ["helmet", "suit", "gauntlet", "boots"]) as any,
            jewelry: pick(s && s.equipped, ["ring1", "ring2", "earring1", "earring2", "necklace"]) as any,
            pets: pick(s && s.equipped, ["ramasseur", "familier", "fairy"]) as any,
            cards: pick(s && s.equipped, ["mantra", "cape", "masque", "fhead", "ftop", "fhand", "ffoot"]) as any,
            stats: st as any,
            // mapping best-effort des stats du builder vers les colonnes (affichage GuildViewer)
            hp: n("PV max %") || n("PV max"),
            attack: n("Attaque %") || n("Attaque"),
            defense: n("Endurance %") || n("Endurance"),
            critRate: n("Taux critique"),
            critDamage: n("Dégâts critiques"),
            damageReduction: n("Réduction de dégâts"),
          },
        });
      }
    }
  });
  return NextResponse.json({ ok: true, count: chars.length });
}
