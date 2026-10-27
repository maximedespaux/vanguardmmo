import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";

// Le builder envoie les classes en clair ("Arcaniste") → on normalise vers l'enum.
const CLASSES = ["TEMPLIER", "SPADASSIN", "ARCANISTE", "ENVOUTEUR", "ARBALETRIER", "SYLPHIDE", "PRIMAT", "CHANOINE"];
function normCls(c: string) {
  const u = (c || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return CLASSES.includes(u) ? u : "ARCANISTE";
}
function mode(n: string, role?: unknown) {
  // Le rôle déclaré dans les mesures l'emporte sur le nom du stuff. L'enum n'a
  // pas d'« Off tank » : c'est un stuff hybride (Primat en sceptre), on le range là.
  if (role === "tank") return "TANK";
  if (role === "offtank") return "HYBRIDE";
  if (role === "dps") return "DPS";
  const u = (n || "").toUpperCase();
  return u.includes("TANK") ? "TANK" : u.includes("HYBRID") ? "HYBRIDE" : "DPS";
}
/** Les mesures telles que le builder les envoie, bornées : un objet, pas plus
 *  de 4 Ko — c'est une poignée de nombres et de cases, rien d'autre ne doit
 *  passer par là. */
function mesures(m: unknown) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return undefined;
  const json = JSON.stringify(m);
  return json.length <= 4096 ? (JSON.parse(json) as object) : undefined;
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
  // Anti-écrasement : ne JAMAIS vider tous les persos d'un compte via une sync vide
  // (ex. consultation du build d'un autre membre / état transitoire du builder).
  if (chars.length === 0) return NextResponse.json({ ok: true, count: 0, skipped: "vide" });

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
          /* Le prestige 0 est un début normal dans le builder (0 à 10) : `|| 1` le
             changeait en 1, et « Mes personnages » affichait P1 à qui n'en avait aucun. */
          prestige: Number.isFinite(Number(c.prestige)) && c.prestige !== null && c.prestige !== ""
            ? Math.max(0, Math.round(Number(c.prestige))) : 1,
          /* Le sexe choisit l'illustration du perso. Le builder l'envoyait et la synchro
             le jetait : chaque perso republié revenait en Garçon sur le site. */
          sex: c.sex === "F" || c.sex === "G" ? c.sex : null,
          // L'ORDRE FAIT LE PRINCIPAL : « Rendre principal », dans l'AirBuilder, met le
          // perso en tête de liste.
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
            mode: mode(s && s.name, s && s.mesures && s.mesures.role) as any,
            mesures: mesures(s && s.mesures) as any,
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

