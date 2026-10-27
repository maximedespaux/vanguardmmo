# GENESIS — piste « Héraldique »

**L'idée.** La salle du trône parle par ses étendards : étoffe crimson, filet d'or, étoile à quatre branches, pointe en bas. On reprend cette grammaire pour ce qui *structure* le site (barre du haut, en-têtes, onglets, séparateurs, puces) et on laisse les cartes sobres. Ce qu'on lit d'abord, ce sont les bannières ; les données passent devant.

## Ce qui est crimson, ce qui est or
- **Crimson = ce qui est choisi ou ce qu'on déclenche.** L'espace actif (oriflamme qui pend de la tringle), l'onglet actif, le bouton principal, la case cochée, la bascule allumée, la jauge, les puces losange. Toujours un *fond* : il ne porte jamais de texte sur du noir (2,7:1).
- **Pourpre = la profondeur.** Voile de l'en-tête, ligne survolée, entrée choisie du menu, ombre du bouton principal, halos d'ambiance. Il réchauffe le noir sans se voir comme une couleur.
- **Or = l'arête.** Filets des bannières, tringle de la barre et des onglets, étoiles, anneau de focus. Jamais un aplat, jamais du texte courant. Mesuré sur les rendus : < 1 % des pixels.
- **Répartition mesurée** (pixels classés sur les rendus) : noir/anthracite 88-91 %, rouge/pourpre 7-10 %, or < 1 %. Le rouge est sous les 20 % visés : le levier, si on en veut plus, est le fond (salle du trône) et le voile des en-têtes, pas les cartes.

## Échelle typographique
| Rôle | Police | Taille / graisse | Interlettrage |
|---|---|---|---|
| Marque « GENESIS » | Cinzel | 22 px / 700 | .20 em |
| Titre de page (h1) | Cinzel | 34 px (25 mobile) / 700 | .045 em |
| Titre de section (h2) | Cinzel capitales | 19 px (17 mobile) / 600 | .09 em |
| Titre de carte, modale | Cinzel | 16-20 px / 600-700 | .05 em |
| Boutons, oriflammes | Cinzel | 14 px / 600-700 — **plancher** | .05-.07 em |
| Texte courant, cellules, menus | Athiti | 15 px / 400-600, interligne 1,55 | — |
| Descriptions, aides | Athiti | 13,5-14,5 px | — |
| Chiffres de table, badges, en-têtes de colonnes, surtitres | **Rubik** | 11,5-17 px / 500-600, chiffres tabulaires | .12-.18 em en capitales |
| Grands chiffres des tuiles | Cinzel | 30 px / 700 | .02 em |

Rubik garde un rôle : tout ce qui est dense et chiffré. Cinzel n'entre jamais dans une cellule, un paragraphe ou sous 14 px.

## Composants (tous dans maquette.html)
- **Barre du haut** : tringle d'or éteint ; l'espace actif est une oriflamme crimson qui la dépasse de 16 px, étoile à la pointe. Menu « mega » pleine largeur, icônes en losange, ligne de description sous chaque entrée.
- **En-tête de page** : une bannière (filet d'or, pointe en V de 18 px, étoile au sommet du V) ; l'oriflamme de gauche porte l'icône de la page ; art du jeu voilé de pourpre.
- **Sous-onglets** : oriflammes pendues à une tringle à fleurons ; l'active est crimson et plus longue.
- **Cartes** : anthracite, filet neutre, angle 4 px. Au survol : filet pourpre éclairci et levée de 3 px. Aucun or.
- **Boutons** : principal (crimson, filet d'or), secondaire (anthracite), fantôme, danger (contour crimson-300 + icône « alert »), désactivé. Survol −1 px, rien d'autre.
- **Cadres d'icônes** (.vgi-frame) : carré chanfreiné, trois tons (neutre / or pour ce qui compte / crimson pour l'actif) ; losange pour la navigation.
- **Statuts** : un mot + un point ou une icône, jamais la couleur seule (vert actif, lavande absent, ambre en attente, gris inactif, bleu à l'essai).

## Contrastes calculés (WCAG 2.1)
| Texte / élément | Fond | Ratio | Usage |
|---|---|---|---|
| Ivoire #F2EDE5 | carte #15151D | 15,6 | texte courant |
| Atténué #ABA59B | surface élevée #1A1A23 | 7,1 | descriptions |
| Faible #8E887F | survol #20202A | 4,6 | placeholder, le pire cas |
| Ivoire | crimson #A6192E / survol #C42A40 | 6,4 / 4,8 | bouton principal, oriflamme |
| **Crimson #A6192E** | **noir / carte** | **2,7 / 2,4** | **jamais du texte** |
| Crimson-300 #E8697B | carte / pourpre #3A0D1C | 5,8 / 5,4 | lien, bouton danger |
| Or clair #E6C48A | carte | 10,9 | anneau de focus (2 px, décalé de 2) |
| Ambre #F0B43C · vert #5FCB8A · lavande #A99BE0 | carte | 9,8 · 9,0 · 7,3 | statuts |
| Mythique #C92A2A | carte | 3,3 | **pas en texte fin** → pastille pleine |
| Ivoire | Mythique #C92A2A | 4,7 | texte de la pastille |
| Éternel #FF8C1A · Ancestral #FF5C8A | carte | 7,8 · 6,2 | noms d'objets |
| Éveil · holo · perçage | infobulle #1A1A23 | 6,5 · 6,2 · 7,0 | lignes de bonus |

## Ce que devient chaque usage de l'orange
- **Texte d'accent** (lien actif, icône teintée) → l'état actif passe en *forme* (oriflamme, losange crimson) et le texte reste ivoire ; un lien dans une phrase prend `--accent-texte` #E8697B.
- **Fond de bouton** (`.vg-btn`, `.dash-hub-cta`, `.vg-subtab.active`, texte #2a1400) → dégradé crimson 500→600, texte ivoire, filet or-600. Ces fonds sont codés en dur : à réécrire, le `:root` ne suffit pas.
- **Bordure** (rgba orange .3 au survol) → `--bordure-survol` #5A3442 ; or-600 pour ce qui est choisi.
- **Lueur** (halo orange) → supprimée au survol ; ombre noire + ombre pourpre sous le bouton principal. `--glow-3` devient dorée, réservée aux étoiles.
- **Focus** (contour orange) → `--focus` #E6C48A.
- La section COMPATIBILITÉ de tokens.css redirige `--orange` vers #E8697B : après l'échange de `:root`, rien ne devient illisible. Restent 259 orange codés en dur (`#FF8C1A`, `255,140,26`) à traiter un par un, car certains sont le palier Éternel et doivent rester.

## Ce qu'on ne fait jamais
- Du texte crimson #A6192E sur fond sombre ; de l'or en aplat ou en texte courant ; une carte décorée d'or.
- Le rouge Mythique comme couleur de marque, ou le crimson de marque sur une donnée du jeu. Le crimson est une étoffe bordée d'or ; le Mythique est une pastille ronde, pleine, nommée.
- Un bouton, un lien ou un liseré orange : #FF8C1A n'est plus qu'un palier et une rareté.
- Cinzel sous 14 px, dans une table ou un paragraphe.
- Un troisième cran de survol, un halo coloré, un arrondi de plus de 6 px.
- Un statut dit par la seule couleur.

Rendu mobile : `tools/render.sh` ne descend pas sous 500 px de fenêtre (minimum de Chrome sans interface) ; mobile.png est rendu à 390 px par le protocole DevTools.
