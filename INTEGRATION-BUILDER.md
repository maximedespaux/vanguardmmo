# Stuff Builder complet (refonte native) — Vanguard

Remplace l'ancien builder iframe par une vraie page React conforme à ton cahier des charges.

## 1. Copier dans `vanguard/`
| Package                                   | Destination (`vanguard/`)                  |
|-------------------------------------------|--------------------------------------------|
| `src/data/builder-data.json`              | `src/data/builder-data.json`               |
| `src/app/(guild)/builder/page.tsx`        | `src/app/(guild)/builder/page.tsx` (écrase) |
| `public/assets/items/builder/*.png`       | `public/assets/items/builder/`             |

> ⚠️ La nouvelle page `/builder` est autonome (sélection sexe/classe/niveau/prestige manuelle).
> Elle remplace la version iframe + suivi personnages. Si tu veux garder le suivi des
> persos enregistrés, dis-le moi : je rebrancherai l'API `/api/characters` au-dessus du builder.

## 2. Redémarrer : `cd vanguard && pnpm dev` → http://localhost:3000/builder

## Contenu (cahier des charges)
- **Personnage** : sexe, classe (8), niveau, prestige.
- **Arme** : Ancestral / Yggdrasil / Éternel · « Sans Artefact (+10) » ou « Artefact (+20) » · **perçage 10 cartes** · rareté.
- **Armure** : Shaïtan / Dryade / Yggdrasil / Éternel · **+10** · **perçage 4 cartes** (armure uniquement).
- **Fashion** (3 choix) + **Cape** (7 choix) : emplacement **Rune** (force/endu/int/dex, stats réelles) + **sertissage costume** (valeurs réelles du jeu).
- **Fée** (5, niv. max 50), **Bijoux** Anneau Ailé / Ailé Pur (stats réelles), **Familier** + rune, **Ramasseur** (stats réelles) + rune.
- **Stats totales** en direct (objets + set + cartes/runes + sertissage + bijoux + ramasseur).

## Données encore à renseigner (signalées « à renseigner » dans l'UI)
- Bonus des **fées** (ANGEL_BUFF) par niveau — absents des fichiers du jeu.
- Stats des **familiers** (œufs/EGG) — absentes des fichiers.
- Échelle par niveau des **bijoux Ailé** et des **fées** (1→50).
- Effets chiffrés : **rareté**, **+N / Artefact**, **prestige** (le moteur `stats.ts` les attend).

## Système PNJ (échange ressources → items)
Trouvé dans tes archives : **`Exchange_Script.txt`** (+ `TreasureCombine.txt`, `collecting.inc`).
Je peux le déchiffrer/parser pour en faire une page dédiée — dis-moi si on l'enchaîne.
