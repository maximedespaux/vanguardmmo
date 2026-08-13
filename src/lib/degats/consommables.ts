// ════════════════════════════════════════════════════════════════════════════
//  LES CONSOMMABLES ET LES BUFFS — un terme SÉPARÉ, pour qu'on voie l'écart.
//
//  Un consommable fondu dans le total ne se voit pas. Or c'est justement ce
//  qu'on veut savoir : combien rapporte le parchemin, est-ce qu'il vaut son prix.
//  Ce fichier ne calcule donc pas de dégâts — il fabrique un SECOND combattant,
//  identique au premier plus les bonus des fioles et parchemins retenus, et rend
//  la liste de ce qui a été ajouté. Le moteur calcule alors deux fois et l'écran
//  montre la différence.
//
//  CE QUE LE RELEVÉ NE DIT PAS : la durée. Elle vit dans `dwCircleTime` et
//  `dwSkillTime` de `propItem`, colonnes que l'extraction n'a pas gardées. Un
//  consommable est donc « actif » ou « inactif », jamais accompagné d'un compte
//  à rebours qu'on aurait deviné.
//
//  ET LE BUFF DE GUILDE : `guildbuff.csv` ne donne que onze clés `II_*`, un camp
//  et un prix. L'effet se lit dans le relevé d'objets. QUATRE des onze pèsent sur
//  un dégât — l'Enchantement de Shade (+10 % sur les monstres, +10 % sur les
//  boss), l'Ego de Shade (+5 en dégâts JcJ), et les deux distinctions des
//  Chambres Secrètes (+5 et +10 % sur les monstres), qui sont dans le CSV sous le
//  camp SERVER et qu'on avait d'abord écartées à tort. Les sept autres portent des
//  PV, du blocage, de la vitesse, du butin, de l'expérience ou des penyas : les
//  codes correspondants ne sont pas dans `CODES_OFFENSIFS`, donc rien ne remonte.
// ════════════════════════════════════════════════════════════════════════════

import type { Combattant, Terme } from "./contrat";
import { buffsDeGuilde, consommablesOffensifs, libelleStat, type Consommable } from "./donnees";

/**
 * LES CODES DONT LE MOTEUR SE SERT VRAIMENT.
 *
 * La liste sert deux fois : à trier les 766 consommables du relevé (ne garder que
 * ceux qui changent un coup) et à n'afficher que les lignes qui pèsent. Un
 * consommable qui ne rend que des PV n'a rien à faire dans un calcul de dégâts.
 */
export const CODES_OFFENSIFS = [
  "DST_ATKPOWER",
  "DST_ATKPOWER_RATE",
  "DST_ADDMAGIC",
  "DST_ADDMAGIC_RATE",
  "DST_MONSTER_DMG",
  "DST_MONSTER_DMG_BOSS",
  "DST_PVP_DMG",
  "DST_PVP_DMG_RATE",
  "DST_CRITICAL_BONUS",
  "DST_CHR_CHANCECRITICAL",
  "DST_ATTACKSPEED",
  "DST_ATTACKSPEED_RATE",
  "DST_ADJ_HITRATE",
  "DST_STR",
  "DST_DEX",
  "DST_INT",
  "DST_STA",
  "DST_STR_PERCENT",
  "DST_DEX_PERCENT",
  "DST_INT_PERCENT",
  "DST_STA_PERCENT",
  "DST_STAT_ALLUP",
  "DST_MASTRY_FIRE",
  "DST_MASTRY_WATER",
  "DST_MASTRY_ELECTRICITY",
  "DST_MASTRY_WIND",
  "DST_MASTRY_EARTH",
  "DST_MASTRY_ALL",
] as const;

/** Le catalogue des consommables qui changent un coup. */
export function catalogueOffensif(): Consommable[] {
  return consommablesOffensifs(CODES_OFFENSIFS);
}

/** Le catalogue des buffs de guilde qui changent un coup. */
export function catalogueDeGuilde(): Consommable[] {
  return buffsDeGuilde(CODES_OFFENSIFS);
}

export type Appoint = { combattant: Combattant; termes: Terme[] };

/**
 * Ajoute les bonus d'une liste de consommables à un combattant, sans le modifier.
 *
 * Les quatre statistiques sont touchées à part : le contrat veut qu'elles
 * arrivent déjà totalisées, donc un consommable qui donne « +50 Force » doit
 * entrer dans `force`, pas dans `bonus`, sinon personne ne le compte. Les
 * variantes en pourcentage s'appliquent APRÈS le plat, sur le total — l'ordre
 * n'est pas écrit dans le client et c'est signalé sur le terme.
 */
export function avecAppoints(base: Combattant, choix: Consommable[]): Appoint {
  const c: Combattant = { ...base, bonus: { ...base.bonus } };
  const termes: Terme[] = [];
  const PLAT: Record<string, keyof Pick<Combattant, "force" | "endurance" | "dexterite" | "intelligence">> = {
    DST_STR: "force",
    DST_STA: "endurance",
    DST_DEX: "dexterite",
    DST_INT: "intelligence",
  };
  const POURCENT: Record<string, keyof Pick<Combattant, "force" | "endurance" | "dexterite" | "intelligence">> = {
    DST_STR_PERCENT: "force",
    DST_STA_PERCENT: "endurance",
    DST_DEX_PERCENT: "dexterite",
    DST_INT_PERCENT: "intelligence",
  };

  const enPourcent: { champ: keyof Pick<Combattant, "force" | "endurance" | "dexterite" | "intelligence">; v: number; source: string }[] = [];

  for (const item of choix) {
    for (const [code, v] of Object.entries(item.bonus)) {
      if (!(CODES_OFFENSIFS as readonly string[]).includes(code)) continue;
      const quoi = item.famille === "GUILDE" ? "Buff de guilde" : "Consommable";

      if (code === "DST_STAT_ALLUP") {
        c.force += v;
        c.endurance += v;
        c.dexterite += v;
        c.intelligence += v;
        termes.push({
          cle: `appoint.${item.cle}.${code}`,
          libelle: `${quoi} — ${item.nom} : ${libelleStat(code)}`,
          valeur: v,
          unite: "points",
          source: `${item.cle} ▸ ${code}, relevé objets-stats.json`,
          certitude: "client",
        });
        continue;
      }
      if (PLAT[code]) {
        c[PLAT[code]] += v;
      } else if (POURCENT[code]) {
        enPourcent.push({ champ: POURCENT[code], v, source: item.cle });
      } else {
        c.bonus[code] = (c.bonus[code] ?? 0) + v;
      }
      termes.push({
        cle: `appoint.${item.cle}.${code}`,
        libelle: `${quoi} — ${item.nom} : ${libelleStat(code)}`,
        valeur: v,
        unite: code.endsWith("_RATE") || code.endsWith("_PERCENT") || code === "DST_MONSTER_DMG" || code === "DST_MONSTER_DMG_BOSS" ? "pourcent" : "points",
        source: `${item.cle} ▸ ${code}, relevé objets-stats.json`,
        certitude: "client",
        note: item.famille === "GUILDE" ? "Buff de guilde : la clé vient de guildbuff.csv, l'effet du relevé d'objets." : undefined,
      });
    }
  }

  for (const p of enPourcent) {
    const avant = c[p.champ];
    c[p.champ] = Math.floor(avant * (1 + p.v / 100));
    termes.push({
      cle: `appoint.${p.source}.pourcent.${p.champ}`,
      libelle: `Application du pourcentage sur la statistique (${avant} → ${c[p.champ]})`,
      valeur: p.v,
      unite: "pourcent",
      source: `${p.source}, relevé objets-stats.json`,
      certitude: "flyff-officiel",
      note: "Le client ne dit pas si un pourcentage de statistique s'applique avant ou après les bonus plats. Il est appliqué après, sur le total.",
    });
  }

  return { combattant: c, termes };
}

/** Retrouve un consommable par sa clé `II_*`, dans les deux catalogues. */
export function appointParCle(cle: string): Consommable | null {
  return catalogueOffensif().find((x) => x.cle === cle) ?? catalogueDeGuilde().find((x) => x.cle === cle) ?? null;
}
