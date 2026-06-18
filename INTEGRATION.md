# Mise à jour Vanguard — Builder (inventaire) + Échanges PNJ + données à jour

## Copier dans `vanguard/`
| Source (ce zip)                              | Destination (`vanguard/`)                       |
|----------------------------------------------|-------------------------------------------------|
| `public/data/builder-data.json`              | `public/data/builder-data.json`                 |
| `public/data/echanges.json`                  | `public/data/echanges.json`                     |
| `public/assets/items/builder/*.png`          | `public/assets/items/builder/`                  |
| `src/app/(guild)/builder/page.tsx`           | `src/app/(guild)/builder/page.tsx` (écrase)     |
| `src/app/(guild)/echanges/page.tsx`          | `src/app/(guild)/echanges/page.tsx` (nouveau)   |

Puis : `cd vanguard && pnpm dev` → `/builder` et `/echanges`.
Ajoute « Échanges » à ta navigation (Shell) si tu veux le lien direct.

## Stuff Builder (refait en inventaire)
- Panneau d'équipement type inventaire : casque / armure / gants / bottes au centre, arme / cape / fashion / fée, puis 2 anneaux + familier + ramasseur.
- Sélecteurs perso (sexe / classe / niveau / prestige) + tiers arme (Ancestral·Yggdrasil·Éternel, +10 / Artefact +20, rareté) et armure (Shaïtan·Dryade·Yggdrasil·Éternel, +10).
- Perçage repliable (10 cartes arme / 4 cartes armure).
- **Stats totales en direct**, avec les **vrais bonus de fées par palier** (niv 10/20/30/40/50), set, bijoux (Ailé / Ailé Pur), ramasseurs.

## Échanges PNJ
- Onglet **Custom AirFlyff** : les 24 PNJ / 199 recettes réelles (World Boss Prestige, Parure Tank/DPS, Prestige, Rareté, Runes, Essence d'artefact, Poudre féerique, Kaelis, emblèmes, médailles…).
- Onglet **Ressources** : Changori + collecteur de gemmes.
- Rendu simple « demande → donne », recherche par item.

## Données mises à jour (déjà dans `airflyff_gamedata_complet.zip` + `airflyff_systems_custom.zip`)
Items (13 073), sets, gemmes, runes, enchant, équilibrage par classe, + systèmes custom : fées (bonus réels), artefact (+11→+20, étoiles), rareté, prestige, cartes, éveil. À brancher sur tes autres pages au besoin.

## Model viewer fashions — honnête
Un vrai viewer 3D n'est pas réalisable : les modèles Flyff sont au format propriétaire `.o3d`
(dans les gros archives FSDATA), sans loader web existant. Le builder utilise donc l'**aperçu
2D** (icônes). Si un jour tu veux le 3D, il faut reverse-engineerer `.o3d` (projet à part).
