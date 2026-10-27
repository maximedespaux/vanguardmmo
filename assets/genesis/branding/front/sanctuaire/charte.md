# GENESIS · piste « Sanctuaire »

L'idée : on entre dans la salle du trône. L'art (l'arbre rouge, les flèches, les îles) vit **derrière** des panneaux de verre sombre. Le crimson est une matière (plaques, cristaux) et l'or un sertissage (arêtes, étoiles, filigranes). Les zones de données, elles, restent neutres pour que les couleurs du jeu y soient lues sans confusion.

## Or et crimson : qui fait quoi
- **Crimson #A6192E : la matière.** Il sert à la plaque du bouton principal, à l'onglet actif, au remplissage des jauges, aux bascules et cases cochées, au cristal en losange (nav active, bout de jauge, séparateurs) et au liseré de survol. Il ne porte jamais de texte (2,67:1 sur noir). Un seul bouton principal par écran.
- **Pourpre #60152D : la profondeur.** On le trouve dans le fond des tags de rang, dans le dégradé de la ligne survolée, dans les ombres teintées et dans le bain des images.
- **Or #C69A55 : le sertissage.** Il sert à l'arête des plaques, au filigrane du haut des panneaux, aux étoiles à 4 branches aux angles, au cercle rituel et au tag Direction. Il ne fait jamais d'aplat. La version éteinte #8C6A36 sert au repos, la vive #C69A55 au survol.
- **Or clair #E6C48A : le reflet.** Il sert au focus clavier, au texte d'accent rare (le petit titre au-dessus du h1, le statut « en attente ») et au liseré de la jauge.
- **Mesure.** Sur les rendus, l'or couvre 0,4 à 0,8 % des pixels et le rouge-pourpre 7 à 11 %, art compris. Le reste est noir-anthracite à plus de 81 %. L'or pèse visuellement vers 10 % parce qu'il dessine des lignes, et il reste de la marge pour un monogramme doré.
- **Étoiles d'angle** : seulement sur les panneaux « scène » (en-tête, cartes d'outils, modale). Les tuiles et les tables n'en ont pas.

## Typographie
| Rôle | Police | Taille / graisse |
|---|---|---|
| Marque | Cinzel 800, dégradé or | 23 px, interlettrage .16em |
| h1 (en-tête de page) | Cinzel 700 | 32 px (24 px sur mobile) |
| h2 de section, h3 de carte | Cinzel 700 | 21 / 19 px |
| Navigation, boutons | Cinzel 600-700 | 14 px minimum, jamais en dessous |
| Grands chiffres des tuiles | Cinzel 700 | 36 px |
| Texte courant, libellés, cellules | Athiti 500-600 | 15 / 14,5 px (13 px minimum) |
| Chiffres de table, petits libellés en capitales, infobulle | **Rubik** 600 | 10,5-13,5 px, `tabular-nums` |
Rubik garde le rôle dense : capitales espacées, colonnes de chiffres, infobulle de l'AirBuilder (son jeu est déjà calé sur Rubik).

## Composants (maquette.html, préfixe `sx-`)
Plaque hexagonale `sx-btn` (principal, secondaire, fantôme, danger, désactivé). L'arête est un `::before`, le bouton n'est pas découpé, donc l'outline du focus reste entière. Cadre d'icône octogonal `sx-ic` (neutre, or, crimson, ou une teinte du jeu quand l'icône est une donnée). Panneau `sx-panel` (verre à 80 % sur l'art, 90 % ailleurs) avec étoiles d'angle `sx-orne`. Tag de rang à losanges `sx-tag`. Statut `sx-status` : la forme d'abord (point, croissant, cercle vide, losange), la couleur ensuite. Survol limité à deux crans : −1 px pour la touche (boutons, nav) et −3 px pour la levée (cartes). `prefers-reduced-motion` coupe les braises, les transitions et les déplacements.

## Contrastes calculés (WCAG 2.1)
| Paire | Ratio | Usage |
|---|---|---|
| Ivoire #F2EDE5 / anthracite #15151D | 15,58 | texte courant |
| Ivoire-300 #CFC8BE / anthracite | 10,94 | libellés forts |
| Ivoire-500 #A8A199 / anthracite · / verre sur art (pire cas #371E24) | 7,11 · 5,99 | texte atténué |
| Ivoire-700 #958F88 / anthracite · / verre sur art | 5,67 · 4,78 | texte faible (plancher) |
| Ivoire / crimson #A6192E · / haut de plaque #C42A40 | 6,44 · 4,80 | texte des plaques |
| Or #C69A55 / noir · Or clair #E6C48A / anthracite | 7,76 · 10,92 | accents |
| Focus #E6C48A / noir · / crimson | 12,02 · 4,51 | anneau (seuil 3:1) |
| Rose d'erreur #E89AA3 / anthracite | 8,28 | message d'erreur |
| **Crimson / noir · / anthracite** | **2,67 · 2,42** | **interdit en texte** |
| Mythique #C92A2A / noir · / puits #0D0D12 · / anthracite | 3,66 · 3,55 · 3,33 | grand texte uniquement |
| Éternel 8,32 · Dryades 7,23 · Shaïtan 7,15 · Cape 12,59 · Éveil 7,30 · Diamant 11,42 · Holo 6,98 · Perçage 7,88 | — | données du jeu, toutes ≥ 4,5 |

## Cohabitation avec les couleurs du jeu
- **Zone de données = neutre.** Dans les cases, les noms d'objets, l'infobulle et les légendes, on n'utilise ni crimson de marque ni ornement, et l'infobulle est sur le noir le plus profond. Tout rouge lu à l'intérieur est donc une donnée.
- **Mythique ≠ crimson.** Le Mythique est un *texte* ou une *pastille*, jamais serti d'or. Le crimson est une *plaque sertie*, jamais un texte. Leur teinte diffère aussi : le Mythique est un rouge chaud (0°), le crimson un rouge froid (351°).
- **Éternel ≠ marque.** Le site n'a plus aucun orange. L'or est désaturé et métallique, et il trace des lignes. L'orange et le jaune saturés nomment des objets.

## Ce que devient chaque ancien orange
| Ancien usage | Devient |
|---|---|
| Texte d'accent (`color: var(--orange)`) | or `--orange → --or-500` (7,05:1), ou ivoire si c'est un titre |
| Fond de bouton (`.vg-btn`, `.vg-subtab.active`) | plaque crimson sertie, texte ivoire (à réécrire dans globals.css) |
| Fond plein + texte sombre (`.tierbtn.on`) | l'or, via la compatibilité : reste lisible (7,55:1) |
| Bordure (`rgba(var(--orange-rgb),.32)`) | or éteint au repos, or vif au survol |
| Lueur (`--glow-*`, `--el-glow`) | **crimson** : une lueur rouge fait cristal, une lueur dorée fait toc |
| Focus (`outline: var(--orange)`) | or clair 2 px, décalé de 3 px |
| `--gold` #FFD24A (avertissements) | or clair #E6C48A ; le #FFD24A redevient la couleur des Capes |

## Jamais
Pas de texte crimson. Pas d'aplat d'or. Pas d'orange de marque. Pas de crimson ni d'ornement dans une zone de données. Pas de Cinzel sous 14 px, ni en paragraphe. Pas de deuxième plaque principale sur un même écran. Pas de bouton danger en plaque rouge pleine. Pas de tiers bas des écrans de chargement (logo d'éditeur, barre) : on n'en garde que la tranche haute, passée au bain pourpre (`mix-blend-mode: color`). Pas de survol au-delà de −3 px.

## Limites connues
Le Mythique #C92A2A plafonne à 3,66:1, et c'est une donnée qu'on ne change pas. Il n'est donc lisible qu'en grand texte (≥ 18,7 px gras, le cas du titre d'infobulle). Dans la liste des cases (16 px gras), il est toujours doublé d'une pastille à texte ivoire. L'art derrière les panneaux en verre impose de garder le texte faible au plancher #958F88. Le parvis (128 px d'art entre la barre et l'en-tête) est réservé aux pages-portails ; les outils démarrent à 24 px. Rendu mobile : Chrome sans interface impose 500 px minimum, d'où `_cadre-mobile.html`, qui rend la page dans un cadre de 390 px.
