# GENESIS · piste « Obsidienne »

La retenue esports. Des surfaces anthracite mates et nettes, empilées en six crans de luminance plutôt qu'avec des ombres. Un filet or d'un pixel sur ce qui est actif, du crimson sur l'action principale, et rien d'autre. Le luxe vient de la précision : alignements, chiffres tabulaires, capitales Cinzel. L'identité GENESIS tient en quatre signes repris des références : le mot-symbole or, le losange crimson, l'étoile à quatre branches et la salle du trône voilée dans l'en-tête.

## Or et crimson : qui fait quoi
- **Crimson `#A6192E` = agir.** Il sert de fond au bouton principal (un seul par zone) et marque l'état actif : soulignement d'onglet, barre de ligne survolée, losange, case cochée, compteur qui attend une action. **Il ne porte jamais de texte** : il fait 2,67:1 sur noir. Le texte posé dessus est ivoire (6,44:1).
- **Or `#C69A55` = ce qui compte.** Il dessine le filet de 1 px sous l'espace de nav actif, l'arête de la carte qui porte une échéance, le trait sous le titre de page, l'étoile des sections, l'étiquette Direction et le mot-symbole. **L'or clair `#E6C48A` est réservé au focus clavier.**
- **Répartition mesurée** (pixels de `bureau-long.png`) : environ 89 % de noir, d'anthracite et d'ivoire, 11 % de rouge et de pourpre (gouttières, art, actions) et 0,2 % d'or. C'est un écart assumé par rapport à la cible 70 / 20 / 10 : l'or reste très loin de son plafond, et le rouge passe par la profondeur, jamais par les surfaces qu'on lit.
- **Pourpre `#60152D` = profondeur.** Il colore les gouttières entre les cartes (les cartes, elles, restent neutres et opaques), le voile bas de l'en-tête, à la ligne de table survolée (24 %), à l'avatar et à l'étiquette « Nouveau ». Il ne signale jamais un état.
- Pourquoi ce partage : sur un outil qu'on lit pendant des heures, une seule couleur doit vouloir dire « clique ». Si l'or et le crimson signalaient tous deux l'action, plus rien ne ressortirait.

## Échelle typographique
| Rôle | Police | Taille / graisse |
|---|---|---|
| Mot-symbole | Cinzel | 19 px 700, +0,24 em, dégradé métal (17 px mobile) |
| Titre de page | Cinzel | 34 px 600 (26 px mobile) |
| Section · carte · modale | Cinzel | 19 · 16 · 18 px 600 |
| Nav, sous-onglets, boutons | Cinzel | **14 px minimum**, 600–700. Cinzel ne descend jamais plus bas |
| Texte courant · description | Athiti | 15 px 500 / 1,55 · 13,5 px 500 |
| Chiffres, micro-libellés, étiquettes | Rubik | 32 px 400 tabulaire (tuiles) · 11 px 600 capitales +0,12 em |

**Rubik garde un rôle** : les chiffres (`tabular-nums`, pour que les colonnes s'alignent) et les petits libellés denses (en-têtes de table, étiquettes, paliers). En petit corps, Athiti est trop fine et Cinzel trop ornée pour ce travail.

## Composants
Barre du haut (actif = filet or + losange, menu mega à icônes et à une ligne de description, avec la section « Réservé au staff »). En-tête de page (art voilé à droite, titre à gauche). Tuile de chiffre (jauge de 2 px dégradée pourpre → crimson, la même teinte pour toutes : c'est la longueur qui compare). Carte d'outil. Sous-onglets (soulignement crimson de 2 px). Table dense (lignes de 42 px, survol pourpre et barre crimson ; repliée en lignes à deux étages sous 1060 px). Boutons : principal, secondaire, fantôme, danger, désactivé. Champs (bord ≥ 3:1, focus or). Liste déroulante. Cases, radio, bascules. Statuts qui ne dépendent pas de la couleur (rond, anneau, carré, plus un mot). Cadres d'icône : neutre, or, alerte, objet. Notification. Modale (filet or + losange en tête).

## Contrastes calculés (WCAG 2.x)
| Paire | Rapport | Usage |
|---|---|---|
| Ivoire `#F2EDE5` / noir `#08080C` | 17,16 | titres |
| Texte `#DAD4CA` / carte `#111118` | 12,76 | paragraphes |
| Secondaire `#ADA79D` / carte | 7,87 | descriptions |
| Atténué `#938E86` / carte · / `#23232E` · / survol de ligne | 5,78 · 4,78 · 5,47 | méta, en-têtes de table |
| Or `#C69A55` / barre `#0B0B10` | 7,62 | « Direction », étoile |
| Focus `#E6C48A` / noir | 12,02 | anneau de focus |
| Ivoire / crimson · survol `#BC2238` · pressé `#8A1426` | 6,44 · 5,26 · 8,16 | bouton principal |
| Danger `#EB7C8B` / anthracite · `#F6C3CA` / `#2A0D15` | 6,73 · 11,64 | texte d'erreur · bouton danger |
| Bord de champ `#625E6C` / `#0E0E14` | 3,06 | WCAG 1.4.11 |
| **Crimson / noir** | **2,67** | **interdit en texte** |
| **Mythique `#C92A2A` / noir** | **3,66** | titre ≥ 18,7 px gras seulement ; ivoire dessus : 4,68 |
| Éternel · Ygg · Ancestral · Lusaka · Dryades · Shaïtan · Cape / carte | 8,07 · 6,99 · 6,40 · 10,12 · 7,49 · 7,40 · 13,04 | noms d'objets |
| Lignes bonus · éveil · diamant · holo · perçage / noir | 11,47 · 7,53 · 11,78 · 7,20 · 8,12 | infobulle |

## Cohabitation avec les couleurs du jeu
- **L'Éternel n'est plus la marque.** L'orange `#FF8C1A` n'apparaît plus qu'en nom d'objet. Aucun bouton, aucun filet, aucune icône d'interface n'est orange. L'or, plus pâle et plus brun, n'est jamais posé sur un objet.
- **Mythique contre crimson.** Les deux rouges sont voisins, on les sépare donc par le rôle et la forme, pas par la teinte. Le crimson est un fond plein derrière un texte ivoire. Mythique est un titre d'infobulle de 19 px gras ou une étiquette pleine qui porte le mot « Mythique ». Le crimson ne touche jamais un objet ; Mythique ne touche jamais l'interface. L'infobulle passe à 19 px et se pose sur le noir : c'est ce qui rend Mythique lisible sans changer sa couleur.
- Les couleurs d'état (succès `#5CC98A`, attention `#E0B25A`) ne servent qu'en pastille, toujours suivies d'un mot, jamais en filet.

## Traduction des anciens usages de l'orange
| Ancien usage | Devient |
|---|---|
| Texte d'accent, icône (`color: var(--orange)`, 285 fois) | `--text` si c'est un libellé actif, `--accent-ornement` (or) si c'est un ornement, `--danger-text` si c'est un compte en attente |
| Fond de bouton (dégradé `#FFC061→#FF8C1A`, texte brun) | `--accent-action` plein, texte ivoire, arête `--accent-action-edge` |
| Bordure de survol (`rgba(255,140,26,.32)`, `color-mix … 45 %`) | `--border-strong` puis `--border-control-hover` : un survol éclaircit, il ne colore pas |
| Lueur (`--glow-*`, `text-shadow` orange, `logopulse`) | supprimée ; au plus `--glow-1` crimson à 10 % |
| Focus (`outline: var(--orange)`) | `--focus` (or clair), 2 px, décalé de 2 px |

L'échange de `:root` (section COMPATIBILITÉ de `tokens.css`) bascule les variables. En revanche, `--orange` y devient de l'or : c'est un état de transition, qui met trop d'or tant que les 285 usages n'ont pas reçu leur rôle exact. Il ne touche pas non plus les 221 `rgba(255,140,26,…)` ni les 53 hexadécimaux orange écrits en dur, ni le `:root` propre à `airbuilder.css` : il faut une passe de remplacement.

## Ce qu'on ne fait jamais
Du texte en crimson. De l'or en aplat, en fond de bouton ou sur plus d'un filet par zone. Une lueur, un dégradé brillant ou une texture derrière une table. Cinzel sous 14 px, ou dans une table. Un objet du jeu encadré d'or ou de crimson. Une couleur qui remplace un mot. Plus de deux crans de survol (−1 px touche, −3 px levée). Le logo d'éditeur ou la barre de progression des écrans de chargement dans un cadre.

*Rendu mobile : `rendu-mobile.html` place la maquette dans une iframe de 390 px. Chrome sans interface refuse les fenêtres de moins de 500 px, et une capture « à 390 » montrerait sinon une mise en page de 500 px coupée.*
